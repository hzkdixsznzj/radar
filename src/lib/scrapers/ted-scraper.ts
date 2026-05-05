import { createClient } from '@supabase/supabase-js';
import type { Tender, TenderType } from '@/types/database';

// ---------------------------------------------------------------------------
// Config — proven-working TED v3 search endpoint
// ---------------------------------------------------------------------------
//
// Validated live in `scripts/test-live-scan.ts` on 2026-04-17. The v3 search
// endpoint is POST-only and uses a structured JSON body. A typical Belgium
// 7-day query returns ~350 notices.
//
//   POST https://api.ted.europa.eu/v3/notices/search
//   Content-Type: application/json
//   Body: { "query": "...", "limit": N, "fields": [...] }
//
// Do NOT send sortField / sortOrder — the API rejects them.
// Use `limit`, not `pageSize`.
// ---------------------------------------------------------------------------

const TED_ENDPOINT = 'https://api.ted.europa.eu/v3/notices/search';
// TED v3 search API caps a single response at 250 — verified empirically.
// Combined with 1-day chunks of BE place-of-performance, 250 is plenty
// (busiest day in 2026 was ~110 notices).
const PAGE_SIZE = 250;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;
const DEFAULT_DAYS_BACK = 7;

const TED_FIELDS = [
  'publication-number',
  'notice-title',
  'classification-cpv',
  'place-of-performance',
  'publication-date',
  'buyer-name',
  'notice-type',
  'links',
] as const;

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }
  return createClient(url, key);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** TED query date format: YYYYMMDD (no dashes). */
function daysAgoCompact(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10).replace(/-/g, '');
}

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = MAX_RETRIES,
): Promise<Response> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, options);
      if (res.ok) return res;

      // Retry on 429 / 5xx
      if ((res.status === 429 || res.status >= 500) && attempt < retries) {
        const delay = RETRY_DELAY_MS * attempt;
        console.warn(
          `[TED] Request failed (${res.status}), retrying in ${delay}ms (attempt ${attempt}/${retries})`,
        );
        await sleep(delay);
        continue;
      }

      const bodyText = await res.text().catch(() => '');
      throw new Error(
        `TED API responded with ${res.status}: ${res.statusText}${bodyText ? ` — ${bodyText.slice(0, 300)}` : ''}`,
      );
    } catch (err) {
      if (attempt === retries) throw err;
      const delay = RETRY_DELAY_MS * attempt;
      console.warn(
        `[TED] Network error, retrying in ${delay}ms (attempt ${attempt}/${retries}):`,
        (err as Error).message,
      );
      await sleep(delay);
    }
  }
  throw new Error('[TED] All retries exhausted');
}

// ---------------------------------------------------------------------------
// TED notice shape (v3) and mapping to our `Tender` row
// ---------------------------------------------------------------------------

interface TEDNotice {
  'publication-number'?: string;
  'notice-title'?: Record<string, string | string[]> | string;
  'classification-cpv'?: string[];
  'place-of-performance'?: string[];
  'publication-date'?: string;
  'buyer-name'?: Record<string, string | string[]> | string;
  'notice-type'?: string;
  'notice-type-eforms'?: string;
  links?: {
    html?: Record<string, string>;
    xml?: Record<string, string>;
    pdf?: Record<string, string>;
  };
}

interface TEDSearchResponse {
  notices?: TEDNotice[];
  totalNoticeCount?: number;
}

/**
 * Multilingual picker: prefer French, then Dutch, then English, then any.
 * TED values may be strings, arrays, or nested objects of strings.
 */
function pickLang(
  obj: Record<string, string | string[]> | string | undefined,
): string {
  if (!obj) return '';
  if (typeof obj === 'string') return obj;
  const order = ['fra', 'nld', 'eng', 'deu'];
  for (const lang of order) {
    const v = obj[lang];
    if (v) return Array.isArray(v) ? v[0] : v;
  }
  const first = Object.values(obj)[0];
  if (!first) return '';
  return Array.isArray(first) ? first[0] : (first as string);
}

/**
 * TED doesn't reliably expose "contract-nature" on the v3 search endpoint,
 * so we infer tender type from the title keywords (fr/nl/en).
 */
function inferTenderType(title: string): TenderType {
  const t = title.toLowerCase();
  if (/\b(travaux|werken|works|construction|bouw|chantier)\b/.test(t)) return 'works';
  if (/\b(fourniture|fournitures|leveringen|levering|supplies|supply|achat|aankoop)\b/.test(t)) {
    return 'supplies';
  }
  return 'services';
}

/**
 * `place-of-performance` is a list of NUTS codes like ["BE213", "BEL"].
 * Pick the first Belgian sub-region (e.g. BE213 / BE2) and fall back to "BE".
 */
function pickRegion(nutsCodes: string[]): string {
  for (const code of nutsCodes) {
    if (code.startsWith('BE') && code !== 'BEL' && code !== 'BE') return code;
  }
  return 'BE';
}

// The DB column `deadline` is nullable (migration 001 has no NOT NULL),
// even though `Tender.deadline` narrows to `string` for the UI. Override
// here so we can insert `null` instead of `""` (which postgres rejects
// as an invalid timestamptz).
type TenderInsert = Omit<Tender, 'id' | 'created_at' | 'updated_at' | 'deadline'> & {
  deadline: string | null;
  notice_kind?: 'opportunity' | 'award' | 'prior_info' | 'modification';
};

/** Classify TED notice type into our `notice_kind` enum.
 *  TED uses eForms notice types: 16=PIN, 17=PIN-CompleteScope, 18=Restricted,
 *  29=Open, 25=Restricted, 33=Award (most common), 36=Modification, 38=Cancellation.
 *  Plus the legacy strings "cn-standard"/"cn-social"/"can-standard" etc. */
function mapTedNoticeKind(
  notice: TEDNotice,
): 'opportunity' | 'award' | 'prior_info' | 'modification' {
  const t = (
    notice['notice-type-eforms'] ??
    notice['notice-type'] ??
    ''
  )
    .toString()
    .toLowerCase();
  if (
    t.includes('award') ||
    t.includes('can-') ||
    /(^|\D)(33|34|35)(\D|$)/.test(t)
  )
    return 'award';
  if (t.includes('pin') || /(^|\D)(16|17)(\D|$)/.test(t)) return 'prior_info';
  if (t.includes('modif') || t.includes('correct') || /36|37|38/.test(t))
    return 'modification';
  return 'opportunity';
}

function mapNoticeToTender(notice: TEDNotice): TenderInsert {
  const externalId = notice['publication-number'] ?? `ted-${Date.now()}`;
  const title = pickLang(notice['notice-title']) || 'Untitled';
  const buyer = pickLang(notice['buyer-name']) || 'Unknown';
  const nutsCodes = notice['place-of-performance'] ?? [];
  const htmlLink =
    notice.links?.html?.fra ??
    notice.links?.html?.nld ??
    notice.links?.html?.eng ??
    (notice.links?.html ? Object.values(notice.links.html)[0] : undefined) ??
    null;

  // Normalise publication-date (may come with timezone suffix like "+02:00")
  const rawDate = notice['publication-date'] ?? new Date().toISOString();
  const publicationDate = rawDate.split('+')[0];

  const noticeKind = mapTedNoticeKind(notice);

  return {
    source: 'ted',
    external_id: externalId,
    title,
    description: title, // v3 search fields don't return a description body
    contracting_authority: buyer,
    tender_type: inferTenderType(title),
    cpv_codes: notice['classification-cpv'] ?? [],
    nuts_codes: nutsCodes,
    region: pickRegion(nutsCodes),
    publication_date: publicationDate,
    deadline: null,
    estimated_value: null,
    currency: 'EUR',
    // Award + modification = post-contract → closed.
    // PIN = announcement of an upcoming tender → open (users want to see it).
    status: noticeKind === 'award' || noticeKind === 'modification' ? 'closed' : 'open',
    full_text: title,
    documents_url: htmlLink,
    notice_kind: noticeKind,
  };
}

// ---------------------------------------------------------------------------
// Fetch a single page from TED
// ---------------------------------------------------------------------------

async function fetchPage(
  sinceCompact: string,
  limit: number,
): Promise<TEDSearchResponse> {
  const body = {
    query: `place-of-performance=BEL AND publication-date>=${sinceCompact}`,
    limit,
    fields: [...TED_FIELDS],
  };

  console.log(`[TED] POST ${TED_ENDPOINT} — query: ${body.query} (limit=${limit})`);

  const res = await fetchWithRetry(TED_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  });

  return (await res.json()) as TEDSearchResponse;
}

// ---------------------------------------------------------------------------
// Upsert into Supabase
// ---------------------------------------------------------------------------

async function upsertTenders(tenders: TenderInsert[]): Promise<number> {
  if (tenders.length === 0) return 0;

  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('tenders')
    .upsert(tenders, {
      onConflict: 'source,external_id',
      ignoreDuplicates: false,
    })
    .select('id');

  if (error) {
    console.error('[TED] Supabase upsert error:', error.message);
    throw error;
  }

  return data?.length ?? 0;
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Scrape Belgian tenders from TED for the last {daysBack} days and upsert
 * them into the `tenders` table. Returns the number of rows upserted.
 *
 * TED's v3 search API caps a single request at PAGE_SIZE notices but
 * advertises the full count via `totalNoticeCount`. To capture everything,
 * we split the date window into 2-day chunks: a typical chunk in BE
 * stays well under 100 notices, so each chunk is a single-page fetch.
 * Saves us the trouble of dealing with iterationNextToken pagination
 * which is finicky and undocumented across TED API versions.
 */
export async function scrapeTED(daysBack: number = DEFAULT_DAYS_BACK): Promise<number> {
  console.log(
    `[TED] Starting scrape of Belgian tenders from the last ${daysBack} days (chunked)...`,
  );

  // 1-day chunks: TED publishes ~50-90 BE notices/day so each chunk
  // fits well under the 100/page cap. Cheaper than parsing
  // iterationNextToken pagination which the API barely documents.
  const chunks: { from: string; to: string }[] = [];
  const today = new Date();
  for (let offset = 0; offset <= daysBack; offset++) {
    const day = new Date(today.getTime() - offset * 86400_000);
    const ymd = ymdCompact(day);
    chunks.push({ from: ymd, to: ymd });
  }

  const allNotices: TEDNotice[] = [];
  let totalAdvertised = 0;
  for (const chunk of chunks) {
    const response = await fetchPageRange(chunk.from, chunk.to, PAGE_SIZE);
    const notices = response.notices ?? [];
    totalAdvertised += response.totalNoticeCount ?? 0;
    console.log(
      `[TED] ${chunk.from}..${chunk.to}: received ${notices.length} (advertised ${response.totalNoticeCount ?? '?'})`,
    );
    if (notices.length >= PAGE_SIZE && (response.totalNoticeCount ?? 0) > PAGE_SIZE) {
      console.warn(
        `[TED] Chunk hit page limit — narrow daysBack or use 1-day chunks for full coverage.`,
      );
    }
    allNotices.push(...notices);
  }

  console.log(
    `[TED] Total collected: ${allNotices.length} (sum of advertised across chunks: ${totalAdvertised})`,
  );
  if (allNotices.length === 0) return 0;

  const mapped = allNotices.map(mapNoticeToTender);
  const seen = new Set<string>();
  const unique = mapped.filter((t) => {
    if (seen.has(t.external_id)) return false;
    seen.add(t.external_id);
    return true;
  });
  console.log(`[TED] After de-dup by external_id: ${unique.length} unique notices.`);

  const count = await upsertTenders(unique);
  console.log(`[TED] Scrape complete. Upserted ${count} tenders.`);
  return count;
}

function ymdCompact(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${y}${m}${dd}`;
}

async function fetchPageRange(
  fromCompact: string,
  toCompact: string,
  limit: number,
): Promise<TEDSearchResponse> {
  const body = {
    query: `place-of-performance=BEL AND publication-date>=${fromCompact} AND publication-date<=${toCompact}`,
    limit,
    fields: [...TED_FIELDS],
  };
  console.log(`[TED] POST ${TED_ENDPOINT} — ${body.query} (limit=${limit})`);
  const res = await fetchWithRetry(TED_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  });
  return (await res.json()) as TEDSearchResponse;
}

// ---------------------------------------------------------------------------
// Standalone entry point (used by `npm run scrape:ted`)
// ---------------------------------------------------------------------------

async function main() {
  try {
    const count = await scrapeTED();
    console.log(`[TED] Done. ${count} tenders upserted.`);
    process.exit(0);
  } catch (err) {
    console.error('[TED] Fatal error:', err);
    process.exit(1);
  }
}

// Run when executed directly (tsx / ts-node)
const isMain = typeof require !== 'undefined' && require.main === module;

if (isMain) {
  main();
}
