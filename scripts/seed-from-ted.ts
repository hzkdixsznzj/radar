/**
 * Seed the Supabase `public.tenders` table with real, live data from TED.
 *
 * - Fetches the last 30 days of Belgian notices (up to 100) from api.ted.europa.eu
 * - Upserts into `public.tenders` using the service-role key (bypasses RLS)
 * - Handles duplicates via ON CONFLICT (source, external_id)
 *
 * Run:  npm run seed          (or)   npx tsx scripts/seed-from-ted.ts
 *
 * Requires in .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * No Next.js runtime is required. This is a standalone Node script.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import type { Tender } from '../src/types/database';

// ---------------------------------------------------------------------------
// Tiny .env.local loader (no `dotenv` dependency).
// Only touches `process.env` for keys that are not already defined.
// ---------------------------------------------------------------------------

function loadEnvLocal(): void {
  // If both required vars are already set (e.g. loaded by the harness),
  // skip reading the file entirely.
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return;
  }

  const envPath = resolve(process.cwd(), '.env.local');
  let raw: string;
  try {
    raw = readFileSync(envPath, 'utf8');
  } catch {
    // Silent — if missing we fail later with a clearer error.
    return;
  }

  for (const rawLine of raw.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    // Strip surrounding quotes if present.
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadEnvLocal();

// ---------------------------------------------------------------------------
// TED fetch — identical shape to scripts/test-live-scan.ts
// ---------------------------------------------------------------------------

const TED_ENDPOINT = 'https://api.ted.europa.eu/v3/notices/search';

interface TEDNotice {
  'publication-number'?: string;
  'notice-title'?: Record<string, string | string[]>;
  'classification-cpv'?: string[];
  'place-of-performance'?: string[];
  'publication-date'?: string;
  'buyer-name'?: Record<string, string | string[]> | string;
  'notice-type'?: string;
  'notice-type-eforms'?: string;
  links?: {
    html?: Record<string, string>;
    xml?: Record<string, string>;
  };
}

interface TEDResponse {
  notices?: TEDNotice[];
  totalNoticeCount?: number;
}

function pickLang(obj: Record<string, string | string[]> | string | undefined): string {
  if (!obj) return '';
  if (typeof obj === 'string') return obj;
  const langs = ['fra', 'nld', 'eng', 'deu'];
  for (const lang of langs) {
    const v = obj[lang];
    if (v) return Array.isArray(v) ? v[0] : v;
  }
  const first = Object.values(obj)[0];
  if (!first) return '';
  return Array.isArray(first) ? first[0] : (first as string);
}

/**
 * Row shape for INSERT/UPSERT into `public.tenders`. Differs slightly from the
 * `Tender` type because we let Postgres generate the `id` (uuid default) and
 * we omit `created_at` / `updated_at` which also default server-side. The DB
 * column `deadline` is nullable (no NOT NULL constraint in migration 001),
 * even though the `Tender` TS type narrows it to `string`.
 */
type TenderInsert = Omit<Tender, 'id' | 'created_at' | 'updated_at' | 'deadline'> & {
  deadline: string | null;
};

function mapNoticeToTender(n: TEDNotice): TenderInsert {
  const pubNum = n['publication-number'] ?? 'unknown';
  const title = pickLang(n['notice-title']);
  const buyer = pickLang(n['buyer-name']);
  const nutsCodes = n['place-of-performance'] ?? [];
  const region = nutsCodes.find((c) => c.startsWith('BE') && c !== 'BEL') ?? 'BE';
  const pubDate = (n['publication-date'] ?? new Date().toISOString()).split('+')[0];
  const htmlLink = n.links?.html?.fra ?? n.links?.html?.eng ?? null;

  let tenderType: Tender['tender_type'] = 'services';
  const titleLower = title.toLowerCase();
  if (/travaux|werken|works|construct/i.test(titleLower)) tenderType = 'works';
  else if (/fourniture|leveringen|supplies|achat|aankoop/i.test(titleLower))
    tenderType = 'supplies';

  return {
    source: 'ted',
    external_id: pubNum,
    title: title || '(untitled)',
    description: title,
    contracting_authority: buyer || 'Unknown',
    tender_type: tenderType,
    cpv_codes: n['classification-cpv'] ?? [],
    nuts_codes: nutsCodes,
    region,
    publication_date: pubDate,
    deadline: null,
    estimated_value: null,
    currency: 'EUR',
    status: 'open',
    full_text: title,
    documents_url: htmlLink,
  };
}

async function fetchLiveTenders(daysBack = 30, limit = 100): Promise<TenderInsert[]> {
  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - daysBack);
  const since = sinceDate.toISOString().slice(0, 10).replace(/-/g, '');

  const body = {
    query: `place-of-performance=BEL AND publication-date>=${since}`,
    limit,
    fields: [
      'publication-number',
      'notice-title',
      'classification-cpv',
      'place-of-performance',
      'publication-date',
      'buyer-name',
      'notice-type',
      'links',
    ],
  };

  console.log(`  -> Query: ${body.query}`);
  console.log(`  -> Endpoint: ${TED_ENDPOINT}`);

  const t0 = Date.now();
  const res = await fetch(TED_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  });
  const elapsed = Date.now() - t0;

  if (!res.ok) {
    throw new Error(`TED API ${res.status}: ${await res.text()}`);
  }

  const data = (await res.json()) as TEDResponse;
  const notices = data.notices ?? [];
  console.log(
    `  -> ${notices.length} notices received in ${elapsed}ms (total available: ${
      data.totalNoticeCount ?? '?'
    })`
  );

  return notices.map(mapNoticeToTender);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log('\n=== Radar seed — TED live data -> public.tenders ===\n');

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    console.error(
      '[fatal] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local'
    );
    process.exit(1);
  }

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log('[1/3] Fetching live TED notices (BEL, last 30 days, limit 100)...');
  let rows: TenderInsert[];
  try {
    rows = await fetchLiveTenders(30, 100);
  } catch (err) {
    console.error('[fatal] TED fetch failed:', (err as Error).message);
    process.exit(1);
  }

  if (rows.length === 0) {
    console.log('[warn] TED returned 0 notices. Nothing to upsert. Exiting.');
    process.exit(0);
  }

  console.log(`\n[2/3] Upserting ${rows.length} tenders into public.tenders...`);
  const { error: upsertErr, count } = await supabase
    .from('tenders')
    .upsert(rows, { onConflict: 'source,external_id', count: 'exact', ignoreDuplicates: false });

  if (upsertErr) {
    // Be extra helpful for the "migrations not applied" case.
    const msg = upsertErr.message || String(upsertErr);
    const missingRelation =
      /relation .*tenders.* does not exist/i.test(msg) ||
      /PGRST20[12]/.test((upsertErr as { code?: string }).code ?? '') ||
      /schema cache/i.test(msg);
    if (missingRelation) {
      console.error(
        '\n[fatal] The `public.tenders` table does not exist yet.\n' +
          '        Apply migrations first, then re-run this script:\n' +
          '          supabase db push          # or\n' +
          '          psql $DATABASE_URL -f supabase/migrations/001_initial_schema.sql\n'
      );
    } else {
      console.error('[fatal] Upsert failed:', msg);
    }
    process.exit(1);
  }

  console.log(`  -> upsert ok${count !== null && count !== undefined ? ` (${count} affected)` : ''}`);

  console.log('\n[3/3] Verifying row count in public.tenders...');
  const { count: totalCount, error: countErr } = await supabase
    .from('tenders')
    .select('*', { count: 'exact', head: true });

  if (countErr) {
    console.error('[warn] Count query failed:', countErr.message);
  } else {
    console.log(`  -> public.tenders now contains ${totalCount ?? 0} row(s) total.`);
  }

  console.log('\n=== Done ===\n');
}

main().catch((err) => {
  console.error('[fatal] Unhandled error:', err);
  process.exit(1);
});
