// ---------------------------------------------------------------------------
// GET /api/awards — competitive intelligence: who won similar tenders
// ---------------------------------------------------------------------------
//
// Pure competitive surface. Given a current tender (or freeform CPV +
// region filters), return recently-awarded tenders matching the same
// scope. The user sees:
//   - Who won
//   - At what price
//   - When
//   - Where
//
// Most BDA award notices are missing the awarded_value (buyers don't
// have to disclose), so callers should be ready for nulls.
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const tenderId = searchParams.get('tender_id');
  const cpvParam = searchParams.get('cpv'); // comma-separated list
  const regionParam = searchParams.get('region');
  const limit = Math.max(
    1,
    Math.min(parseInt(searchParams.get('limit') ?? '20', 10), 100),
  );

  // Resolve filters: either from a reference tender OR from explicit
  // params. Reference-tender mode is what the tender detail page uses.
  let cpvCodes: string[] = [];
  let nutsCodes: string[] = [];
  let tenderType: string | null = null;

  if (tenderId) {
    const { data: refTender } = await supabase
      .from('tenders')
      .select('cpv_codes, nuts_codes, tender_type')
      .eq('id', tenderId)
      .maybeSingle();
    if (refTender) {
      cpvCodes = (refTender as { cpv_codes?: string[] }).cpv_codes ?? [];
      nutsCodes = (refTender as { nuts_codes?: string[] }).nuts_codes ?? [];
      tenderType =
        (refTender as { tender_type?: string }).tender_type ?? null;
    }
  } else if (cpvParam) {
    cpvCodes = cpvParam.split(',').map((s) => s.trim()).filter(Boolean);
    if (regionParam) nutsCodes = [regionParam];
  }

  if (cpvCodes.length === 0 && nutsCodes.length === 0) {
    return NextResponse.json({ awards: [], total: 0 });
  }

  // Base query: award notices only.
  let query = supabase
    .from('tenders')
    .select(
      'id, title, contracting_authority, region, nuts_codes, cpv_codes, awarded_to, awarded_value, awarded_at, publication_date',
      { count: 'exact' },
    )
    .eq('notice_kind', 'award')
    .order('awarded_at', { ascending: false, nullsFirst: false })
    .limit(limit);

  // CPV: keep tenders that share at least one CPV prefix (4 digits) with
  // the reference. Postgres `cs` (contains) on string arrays does an
  // exact match on full codes, so we widen by querying for any of the
  // 4-digit prefixes via `or`.
  if (cpvCodes.length > 0) {
    const prefixes = Array.from(
      new Set(cpvCodes.map((c) => c.replace(/\D/g, '').slice(0, 4))),
    ).filter((p) => p.length === 4);
    if (prefixes.length > 0) {
      // We can't easily match prefixes in cpv_codes[] from PostgREST.
      // Fall back to an in-array match on full codes.
      query = query.overlaps('cpv_codes', cpvCodes);
    }
  }

  if (nutsCodes.length > 0) {
    query = query.overlaps('nuts_codes', nutsCodes);
  }

  if (tenderType) {
    query = query.eq('tender_type', tenderType);
  }

  const { data: awards, error, count } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    awards: awards ?? [],
    total: count ?? 0,
  });
}
