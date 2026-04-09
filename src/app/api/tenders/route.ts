import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { Tender, Profile, TenderWithScore } from '@/types/database';

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = request.nextUrl;
  const type = searchParams.get('type');
  const region = searchParams.get('region');
  const budgetMin = searchParams.get('budget_min');
  const budgetMax = searchParams.get('budget_max');
  const deadlineWithin = searchParams.get('deadline_within');
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '20', 10);
  const offset = (page - 1) * limit;

  try {
    // Fetch user profile for relevance scoring
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // Get dismissed tender IDs
    const { data: dismissed } = await supabase
      .from('dismissed_tenders')
      .select('tender_id')
      .eq('user_id', user.id);

    const dismissedIds = (dismissed as { tender_id: string }[] | null)?.map((d) => d.tender_id) || [];

    // Get already saved tender IDs
    const { data: saved } = await supabase
      .from('saved_tenders')
      .select('tender_id')
      .eq('user_id', user.id);

    const savedIds = (saved as { tender_id: string }[] | null)?.map((s) => s.tender_id) || [];

    const excludeIds = [...dismissedIds, ...savedIds];

    // Build query
    let query = supabase
      .from('tenders')
      .select('*', { count: 'exact' })
      .eq('status', 'open')
      .order('publication_date', { ascending: false });

    if (excludeIds.length > 0) {
      query = query.not('id', 'in', `(${excludeIds.join(',')})`);
    }

    if (type) {
      query = query.eq('tender_type', type);
    }

    if (region) {
      query = query.eq('region', region);
    }

    if (budgetMin) {
      query = query.gte('estimated_value', parseFloat(budgetMin));
    }

    if (budgetMax) {
      query = query.lte('estimated_value', parseFloat(budgetMax));
    }

    if (deadlineWithin) {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + parseInt(deadlineWithin, 10));
      query = query.lte('deadline', futureDate.toISOString());
      query = query.gte('deadline', new Date().toISOString());
    }

    query = query.range(offset, offset + limit - 1);

    const { data: tenders, error, count } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Basic relevance scoring based on profile match
    const typedTenders = (tenders || []) as unknown as Tender[];
    const typedProfile = profile as unknown as Profile | null;
    const scoredTenders: TenderWithScore[] = typedTenders.map((tender) => {
      let score = 50; // base score

      if (typedProfile) {
        // Region match
        if (typedProfile.regions.includes(tender.region)) {
          score += 15;
        }

        // Sector/CPV match
        const hasCpvMatch = tender.cpv_codes.some((cpv: string) =>
          typedProfile.sectors.some((sector: string) =>
            sector.toLowerCase().includes(cpv.slice(0, 2)) ||
            cpv.toLowerCase().includes(sector.slice(0, 3))
          )
        );
        if (hasCpvMatch) {
          score += 20;
        }

        // Keyword match in title or description
        const titleLower = tender.title.toLowerCase();
        const descLower = tender.description.toLowerCase();
        const keywordMatches = typedProfile.keywords.filter(
          (kw: string) => titleLower.includes(kw.toLowerCase()) || descLower.includes(kw.toLowerCase())
        );
        score += Math.min(keywordMatches.length * 5, 15);
      }

      return { ...tender, relevance_score: Math.min(score, 100) };
    });

    // Sort by relevance score descending, then by publication_date
    scoredTenders.sort((a, b) => b.relevance_score - a.relevance_score);

    return NextResponse.json({
      tenders: scoredTenders,
      total: count || 0,
      page,
      limit,
    });
  } catch (err) {
    console.error('Error fetching tenders:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
