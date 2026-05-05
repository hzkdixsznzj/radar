// ---------------------------------------------------------------------------
// GET /api/public/stats — public homepage proof-of-coverage numbers
// ---------------------------------------------------------------------------
//
// Used by /stats (and the landing page) to render trust signals like
// "X marchés actifs · Y publiés cette semaine · Z M€ de volume". No auth
// required — these are aggregate counts, not user data.
//
// Cached at the CDN edge for 5 min (s-maxage=300) so a viral landing
// hit doesn't slam Supabase. Vercel respects this header.
// ---------------------------------------------------------------------------

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const revalidate = 300; // 5 min ISR

export async function GET() {
  const supa = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  const sevenDaysAgo = new Date(Date.now() - 7 * 86400_000)
    .toISOString()
    .slice(0, 10);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400_000)
    .toISOString()
    .slice(0, 10);

  const [
    { count: totalActive },
    { count: fresh7d },
    { count: fresh30d },
    { count: ted },
    { count: bda },
    { data: budgetSample },
  ] = await Promise.all([
    supa
      .from('tenders')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'open')
      .eq('notice_kind', 'opportunity'),
    supa
      .from('tenders')
      .select('*', { count: 'exact', head: true })
      .gte('publication_date', sevenDaysAgo),
    supa
      .from('tenders')
      .select('*', { count: 'exact', head: true })
      .gte('publication_date', thirtyDaysAgo),
    supa
      .from('tenders')
      .select('*', { count: 'exact', head: true })
      .eq('source', 'ted'),
    supa
      .from('tenders')
      .select('*', { count: 'exact', head: true })
      .eq('source', 'be_bulletin'),
    supa
      .from('tenders')
      .select('estimated_value')
      .gt('estimated_value', 0)
      .limit(10000),
  ]);

  const totalVolumeEur = (budgetSample ?? []).reduce(
    (sum, row) =>
      sum + ((row as { estimated_value?: number }).estimated_value ?? 0),
    0,
  );

  return NextResponse.json(
    {
      total_active: totalActive ?? 0,
      fresh_7d: fresh7d ?? 0,
      fresh_30d: fresh30d ?? 0,
      sources: {
        ted: ted ?? 0,
        bda: bda ?? 0,
      },
      // Approximate — only counts tenders where the budget could be
      // extracted. Real cumulative volume is much higher.
      sample_volume_eur: totalVolumeEur,
      generated_at: new Date().toISOString(),
    },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    },
  );
}
