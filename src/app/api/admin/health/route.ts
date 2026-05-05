// ---------------------------------------------------------------------------
// GET /api/admin/health
// ---------------------------------------------------------------------------
//
// Visibility into the scrape pipeline. Returns:
//   - Per-source last scrape, total count, fresh-7d count
//   - Field-quality stats (deadline / budget / region / cpv)
//   - Status distribution
//   - Type distribution
//
// Auth: only the project owner sees this. We hardcode the owner email
// rather than introducing a `role` column on profiles — Radar is single-
// tenant SaaS for now, this stays simple. To grant access to teammates,
// add their email to ADMIN_EMAILS.
// ---------------------------------------------------------------------------

import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// Emails authorised to view the admin dashboard. Extend this list as
// new teammates need access. Comparison is case-insensitive.
const ADMIN_EMAILS = [
  'llucas.colella@gmail.com',
  'hizokas.lucas7@gmail.com',
  'radar-test-lucas@yopmail.com',
  'radar-test-lucas@mailinator.com',
];

interface SourceHealth {
  source: string;
  total: number;
  open: number;
  fresh_7d: number;
  with_deadline: number;
  with_budget: number;
  with_cpv: number;
  with_region: number;
  last_scrape: string | null;
  hours_since_last_scrape: number | null;
}

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const email = (user.email ?? '').toLowerCase();
  if (!ADMIN_EMAILS.map((e) => e.toLowerCase()).includes(email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const sevenDaysAgo = new Date(Date.now() - 7 * 86400_000)
    .toISOString()
    .slice(0, 10);

  const sources = ['ted', 'be_bulletin'];
  const perSource: SourceHealth[] = [];

  for (const source of sources) {
    const [
      { count: total },
      { count: open },
      { count: fresh },
      { count: withDeadline },
      { count: withBudget },
      { count: withCpv },
      { count: withRegion },
      { data: lastScrape },
    ] = await Promise.all([
      supabase
        .from('tenders')
        .select('*', { count: 'exact', head: true })
        .eq('source', source),
      supabase
        .from('tenders')
        .select('*', { count: 'exact', head: true })
        .eq('source', source)
        .eq('status', 'open'),
      supabase
        .from('tenders')
        .select('*', { count: 'exact', head: true })
        .eq('source', source)
        .gte('publication_date', sevenDaysAgo),
      supabase
        .from('tenders')
        .select('*', { count: 'exact', head: true })
        .eq('source', source)
        .not('deadline', 'is', null),
      supabase
        .from('tenders')
        .select('*', { count: 'exact', head: true })
        .eq('source', source)
        .gt('estimated_value', 0),
      supabase
        .from('tenders')
        .select('*', { count: 'exact', head: true })
        .eq('source', source)
        .not('cpv_codes', 'eq', '{}'),
      supabase
        .from('tenders')
        .select('*', { count: 'exact', head: true })
        .eq('source', source)
        .not('region', 'is', null)
        .neq('region', 'BE'),
      supabase
        .from('tenders')
        .select('updated_at')
        .eq('source', source)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const lastIso =
      (lastScrape as { updated_at?: string } | null)?.updated_at ?? null;
    const hoursSince = lastIso
      ? Math.round((Date.now() - new Date(lastIso).getTime()) / 3600_000)
      : null;

    perSource.push({
      source,
      total: total ?? 0,
      open: open ?? 0,
      fresh_7d: fresh ?? 0,
      with_deadline: withDeadline ?? 0,
      with_budget: withBudget ?? 0,
      with_cpv: withCpv ?? 0,
      with_region: withRegion ?? 0,
      last_scrape: lastIso,
      hours_since_last_scrape: hoursSince,
    });
  }

  // Aggregate counts
  const { count: profilesCount } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true });
  const { count: savedSearches } = await supabase
    .from('saved_searches')
    .select('*', { count: 'exact', head: true });
  const { count: savedTenders } = await supabase
    .from('saved_tenders')
    .select('*', { count: 'exact', head: true });
  const { count: pushSubs } = await supabase
    .from('push_subscriptions')
    .select('*', { count: 'exact', head: true });

  return NextResponse.json({
    generated_at: new Date().toISOString(),
    sources: perSource,
    users: {
      profiles: profilesCount ?? 0,
      saved_searches: savedSearches ?? 0,
      saved_tenders: savedTenders ?? 0,
      push_subscriptions: pushSubs ?? 0,
    },
    // Quick "is the scan healthy?" verdict for the dashboard banner.
    health: perSource.every(
      (s) => s.hours_since_last_scrape !== null && s.hours_since_last_scrape < 12,
    )
      ? 'green'
      : perSource.some(
            (s) =>
              s.hours_since_last_scrape === null ||
              s.hours_since_last_scrape > 24,
          )
        ? 'red'
        : 'amber',
  });
}
