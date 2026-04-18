import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { scoreTender, compareTenders } from '@/lib/scrapers/scoring';
import {
  BE_REGION_TO_NUTS,
  type BERegion,
  friendlyRegionsToNuts,
} from '@/lib/geo/be-regions';
import type { Tender, Profile, TenderWithScore } from '@/types/database';

// ---------------------------------------------------------------------------
// GET /api/tenders — paginated, filtered, scored tender feed for the user
// ---------------------------------------------------------------------------
//
// Filter query params (all optional):
//   type       = works | services | supplies
//   region     = "Hainaut" | "Bruxelles-Capitale" | …   (friendly name)
//   budget     = "0-50000" | "50000-200000" | "500000+"  (UI chip value)
//   deadline   = "week" | "month" | <ISO-days:int>
//   page       = int (default 1)
//   limit      = int (default 20)
//
// Scoring: we delegate to `src/lib/scrapers/scoring.ts` which applies a
// weighted match (sector / region / CPV / budget / keyword) and has a
// keyword-leak guard. Internally, profile.regions are translated from
// friendly names to NUTS codes so they match tender.nuts_codes.
// ---------------------------------------------------------------------------

interface BudgetRange {
  min?: number;
  max?: number;
}

function parseBudgetParam(raw: string | null): BudgetRange | null {
  if (!raw || raw === 'all') return null;
  // "500000+" → min=500000
  const plus = raw.match(/^(\d+)\+$/);
  if (plus) return { min: parseInt(plus[1], 10) };
  // "0-50000" or "50000-200000"
  const range = raw.match(/^(\d+)-(\d+)$/);
  if (range) return { min: parseInt(range[1], 10), max: parseInt(range[2], 10) };
  // Bare number → treat as max
  const n = parseInt(raw, 10);
  if (!Number.isNaN(n)) return { max: n };
  return null;
}

function parseDeadlineDays(raw: string | null): number | null {
  if (!raw || raw === 'all') return null;
  if (raw === 'week') return 7;
  if (raw === 'month') return 30;
  const n = parseInt(raw, 10);
  return Number.isNaN(n) ? null : n;
}

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const type = searchParams.get('type');
  const regionFilter = searchParams.get('region');
  const budgetRange = parseBudgetParam(
    searchParams.get('budget') ??
      // Legacy: support budget_min/budget_max too
      (searchParams.get('budget_min')
        ? `${searchParams.get('budget_min')}-${searchParams.get('budget_max') ?? '999999999'}`
        : null),
  );
  const deadlineDays = parseDeadlineDays(
    searchParams.get('deadline') ?? searchParams.get('deadline_within'),
  );
  const page = Math.max(parseInt(searchParams.get('page') ?? '1', 10), 1);
  const limit = Math.max(
    1,
    Math.min(parseInt(searchParams.get('limit') ?? '20', 10), 100),
  );
  const offset = (page - 1) * limit;

  try {
    // ---------------------------------------------------------------------
    // Fetch profile + user exclusion lists (dismissed / saved)
    // ---------------------------------------------------------------------
    const [{ data: profileRaw }, { data: dismissed }, { data: saved }] =
      await Promise.all([
        supabase.from('profiles').select('*').eq('user_id', user.id).single(),
        supabase
          .from('dismissed_tenders')
          .select('tender_id')
          .eq('user_id', user.id),
        supabase
          .from('saved_tenders')
          .select('tender_id')
          .eq('user_id', user.id),
      ]);

    const profile = profileRaw as unknown as Profile | null;
    const excludeIds = [
      ...((dismissed as { tender_id: string }[] | null) ?? []),
      ...((saved as { tender_id: string }[] | null) ?? []),
    ].map((r) => r.tender_id);

    // ---------------------------------------------------------------------
    // Build base query
    // ---------------------------------------------------------------------
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

    // Region: translate friendly → NUTS prefix. Use `cs` (array contains) on
    // nuts_codes for exact sub-region match, or `like` on the region column
    // for the legacy "BE" fallback.
    if (regionFilter && regionFilter !== 'Toutes') {
      const nutsPrefix = BE_REGION_TO_NUTS[regionFilter as BERegion];
      if (nutsPrefix) {
        query = query.like('region', `${nutsPrefix}%`);
      } else {
        // Unknown friendly name — try direct match (e.g. already a NUTS code)
        query = query.eq('region', regionFilter);
      }
    }

    if (budgetRange?.min != null) {
      query = query.gte('estimated_value', budgetRange.min);
    }
    if (budgetRange?.max != null) {
      query = query.lte('estimated_value', budgetRange.max);
    }

    if (deadlineDays !== null) {
      const nowIso = new Date().toISOString();
      const future = new Date();
      future.setDate(future.getDate() + deadlineDays);
      query = query.gte('deadline', nowIso).lte('deadline', future.toISOString());
    }

    // We fetch a bit more than `limit` so scoring can re-rank meaningfully.
    // Supabase caps range() at ~1000 so we fetch page-size * 3 ahead.
    const fetchLimit = Math.min(limit * 3, 100);
    query = query.range(offset, offset + fetchLimit - 1);

    const { data: rows, error, count } = await query;
    if (error) {
      console.error('[/api/tenders] supabase error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const tenders = (rows ?? []) as unknown as Tender[];

    // ---------------------------------------------------------------------
    // Score + sort
    // ---------------------------------------------------------------------
    // Translate profile regions to NUTS so scoring.ts can match against
    // tender.nuts_codes correctly.
    const scoringProfile: Profile | null = profile
      ? {
          ...profile,
          regions: friendlyRegionsToNuts(profile.regions ?? []),
        }
      : null;

    const scored: TenderWithScore[] = tenders.map((t) => ({
      ...t,
      relevance_score: scoringProfile ? scoreTender(t, scoringProfile) : 50,
    }));

    if (scoringProfile) {
      scored.sort((a, b) =>
        compareTenders(a, b, a.relevance_score, b.relevance_score),
      );
    }

    // Trim back to requested page size
    const clipped = scored.slice(0, limit);

    return NextResponse.json({
      tenders: clipped,
      total: count ?? 0,
      page,
      limit,
    });
  } catch (err) {
    console.error('[/api/tenders] fatal:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
