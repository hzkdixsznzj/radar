// ---------------------------------------------------------------------------
// POST /api/analyze — run or fetch cached AI analysis of a tender
// ---------------------------------------------------------------------------
//
// Caching behavior:
//   1. If the user already saved this tender AND saved_tenders.ai_analysis
//      is non-null → return the cached analysis (no Claude call, no credit
//      consumed).
//   2. Otherwise run Claude, upsert into saved_tenders (auto-bookmarks so
//      the analysis has a home), then return the fresh analysis.
//
// The response shape is `{ analysis, cached }` — the client renders the
// same way in both cases.
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { analyzeTender } from '@/lib/ai/claude';
import type { AIAnalysis } from '@/types/database';

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { tender_id } = await request.json();
    if (!tender_id) {
      return NextResponse.json(
        { error: 'tender_id is required' },
        { status: 400 },
      );
    }

    // ------------------------------------------------------------------
    // Cache hit: saved_tenders already has ai_analysis for this user
    // ------------------------------------------------------------------
    const { data: existingSaved } = await supabase
      .from('saved_tenders')
      .select('id, ai_analysis')
      .eq('user_id', user.id)
      .eq('tender_id', tender_id)
      .maybeSingle();

    if (existingSaved?.ai_analysis) {
      return NextResponse.json({
        analysis: existingSaved.ai_analysis as unknown as AIAnalysis,
        cached: true,
      });
    }

    // ------------------------------------------------------------------
    // Paywall for free tier
    // ------------------------------------------------------------------
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single();

    const plan = subscription?.plan ?? 'free';
    if (plan === 'free') {
      return NextResponse.json(
        { error: 'AI analysis requires a Pro or Business subscription.' },
        { status: 403 },
      );
    }

    // ------------------------------------------------------------------
    // Fetch tender + profile, run Claude
    // ------------------------------------------------------------------
    const [{ data: tender, error: tenderError }, { data: profile, error: profileError }] =
      await Promise.all([
        supabase.from('tenders').select('*').eq('id', tender_id).single(),
        supabase.from('profiles').select('*').eq('user_id', user.id).single(),
      ]);

    if (tenderError || !tender) {
      return NextResponse.json({ error: 'Tender not found' }, { status: 404 });
    }
    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Profile not found. Complete onboarding first.' },
        { status: 400 },
      );
    }

    const analysis = await analyzeTender(tender, profile);

    // ------------------------------------------------------------------
    // Persist: upsert into saved_tenders so the analysis is cached.
    // If the row doesn't exist yet, create it (auto-bookmark the tender
    // so the dashboard reflects the user's interest). If it exists,
    // update ai_analysis.
    // ------------------------------------------------------------------
    const analysisJson = analysis as unknown as Record<string, unknown>;

    if (existingSaved) {
      await supabase
        .from('saved_tenders')
        .update({
          ai_analysis: analysisJson,
          status: 'analyzing',
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingSaved.id);
    } else {
      await supabase.from('saved_tenders').insert({
        user_id: user.id,
        tender_id,
        status: 'analyzing' as const,
        notes: null,
        ai_analysis: analysisJson,
      });
    }

    // Increment analyses_used counter
    if (subscription) {
      await supabase
        .from('subscriptions')
        .update({
          analyses_used: (subscription.analyses_used ?? 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', subscription.id);
    }

    return NextResponse.json({ analysis, cached: false });
  } catch (err) {
    console.error('[/api/analyze] fatal:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
