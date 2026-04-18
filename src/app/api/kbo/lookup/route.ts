// ---------------------------------------------------------------------------
// /api/kbo/lookup — on-demand Belgian company-registry lookup by VAT number
// ---------------------------------------------------------------------------
//
// Used by the onboarding and profile pages to pre-fill company fields from
// a VAT / ondernemingsnummer. Thin wrapper over `src/lib/kbo/lookup.ts`
// with auth (must be logged in), rate-limiting (1 request / 3 s per user
// via the same cookie), and NACE → sector suggestion.
//
// GET  /api/kbo/lookup?vat=0123456789
//   → 200 { ok: true, company_name, address, activities, nace_codes, suggested_sectors }
//   → 400 { ok: false, error: "invalid-vat" }
//   → 404 { ok: false, error: "not-found" }
//   → 502 { ok: false, error: "fetch-failed" }
//
// We use GET rather than POST since the operation is idempotent — the
// client can safely retry, and the VAT sits in a short querystring.
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { lookupKbo, suggestSectorsFromNace } from '@/lib/kbo/lookup';

export const dynamic = 'force-dynamic';

// Module-scoped in-memory throttle. In a serverless deployment each
// instance has its own map, which is fine for basic abuse protection —
// a user hitting /api/kbo/lookup from a single browser tab sticks to
// one instance for the burst.
const lastRequestByUser = new Map<string, number>();
const THROTTLE_MS = 3000;

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const now = Date.now();
  const last = lastRequestByUser.get(user.id);
  if (last && now - last < THROTTLE_MS) {
    return NextResponse.json(
      { ok: false, error: 'rate-limited' },
      { status: 429 },
    );
  }
  lastRequestByUser.set(user.id, now);

  const vat = request.nextUrl.searchParams.get('vat') ?? '';
  const result = await lookupKbo(vat);

  if (!result.ok) {
    const status =
      result.error === 'invalid-vat'
        ? 400
        : result.error === 'not-found'
          ? 404
          : 502;
    return NextResponse.json(result, { status });
  }

  return NextResponse.json({
    ...result,
    suggested_sectors: suggestSectorsFromNace(result.nace_codes),
  });
}
