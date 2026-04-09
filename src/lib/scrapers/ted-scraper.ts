import { createClient } from '@supabase/supabase-js';
import type { Tender, TenderType } from '@/types/database';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const TED_API_BASE = 'https://ted.europa.eu/api/v3.0';
const PAGE_SIZE = 100;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

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

async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
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

      throw new Error(`TED API responded with ${res.status}: ${res.statusText}`);
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

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sevenDaysAgo(): string {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

// ---------------------------------------------------------------------------
// TED type mapping
// ---------------------------------------------------------------------------

interface TEDNotice {
  'notice-id'?: string;
  'publication-number'?: string;
  title?: Record<string, string>;
  description?: Record<string, string>;
  'contracting-body'?: { name?: Record<string, string> };
  'contract-nature'?: string;
  'cpv-codes'?: string[];
  'nuts-codes'?: string[];
  'publication-date'?: string;
  'deadline-receipt-tenders'?: string;
  'estimated-total-value'?: { value?: number; currency?: string };
  'document-url'?: string;
  'full-text'?: Record<string, string>;
  [key: string]: unknown;
}

function mapContractNature(nature?: string): TenderType {
  switch (nature?.toLowerCase()) {
    case 'works':
      return 'works';
    case 'supplies':
      return 'supplies';
    case 'services':
    default:
      return 'services';
  }
}

function pickLang(texts?: Record<string, string>): string {
  if (!texts) return '';
  return texts['EN'] || texts['FR'] || texts['NL'] || texts['DE'] || Object.values(texts)[0] || '';
}

function mapNoticeToTender(notice: TEDNotice): Omit<Tender, 'id' | 'created_at' | 'updated_at'> {
  const externalId =
    notice['publication-number'] || notice['notice-id'] || `ted-${Date.now()}`;

  const nutsRaw = notice['nuts-codes'] ?? [];
  const region = nutsRaw.length > 0 ? nutsRaw[0] : 'BE';

  return {
    source: 'ted',
    external_id: externalId,
    title: pickLang(notice.title) || 'Untitled',
    description: pickLang(notice.description) || '',
    contracting_authority: pickLang(notice['contracting-body']?.name) || 'Unknown',
    tender_type: mapContractNature(notice['contract-nature']),
    cpv_codes: notice['cpv-codes'] ?? [],
    nuts_codes: nutsRaw,
    region,
    publication_date: notice['publication-date'] ?? new Date().toISOString(),
    deadline: notice['deadline-receipt-tenders'] ?? '',
    estimated_value: notice['estimated-total-value']?.value ?? null,
    currency: notice['estimated-total-value']?.currency ?? 'EUR',
    status: 'open',
    full_text: pickLang(notice['full-text']) || pickLang(notice.description) || '',
    documents_url: notice['document-url'] ?? null,
  };
}

// ---------------------------------------------------------------------------
// Fetch pages
// ---------------------------------------------------------------------------

interface TEDSearchResponse {
  results?: TEDNotice[];
  total?: number;
  page?: number;
  pages?: number;
}

async function fetchPage(page: number): Promise<TEDSearchResponse> {
  const since = sevenDaysAgo();

  const params = new URLSearchParams({
    q: 'TD=["CN"] AND CY=[BE]', // Contract notices from Belgium
    scope: '3', // active notices
    'page-size': String(PAGE_SIZE),
    page: String(page),
    'sort-field': 'publication-date',
    'sort-order': 'desc',
    'publication-date': `>=${since}`,
  });

  const url = `${TED_API_BASE}/notices/search?${params}`;
  console.log(`[TED] Fetching page ${page}: ${url}`);

  const res = await fetchWithRetry(url, {
    headers: { Accept: 'application/json' },
  });

  return (await res.json()) as TEDSearchResponse;
}

// ---------------------------------------------------------------------------
// Upsert
// ---------------------------------------------------------------------------

async function upsertTenders(
  tenders: Omit<Tender, 'id' | 'created_at' | 'updated_at'>[],
): Promise<number> {
  if (tenders.length === 0) return 0;

  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('tenders')
    .upsert(tenders, { onConflict: 'source,external_id', ignoreDuplicates: false })
    .select('id');

  if (error) {
    console.error('[TED] Supabase upsert error:', error.message);
    throw error;
  }

  return data?.length ?? 0;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export async function scrapeTED(): Promise<number> {
  console.log('[TED] Starting scrape of Belgian tenders from the last 7 days...');

  let totalUpserted = 0;
  let currentPage = 1;
  let totalPages = 1;

  do {
    const response = await fetchPage(currentPage);
    const notices = response.results ?? [];
    totalPages = response.pages ?? 1;

    console.log(
      `[TED] Page ${currentPage}/${totalPages} — ${notices.length} notices received`,
    );

    if (notices.length === 0) break;

    const mapped = notices.map(mapNoticeToTender);
    const count = await upsertTenders(mapped);
    totalUpserted += count;

    console.log(`[TED] Upserted ${count} tenders from page ${currentPage}`);

    currentPage++;
    // Be polite to the API
    if (currentPage <= totalPages) await sleep(500);
  } while (currentPage <= totalPages);

  console.log(`[TED] Scrape complete. Total upserted: ${totalUpserted}`);
  return totalUpserted;
}

// ---------------------------------------------------------------------------
// Standalone entry point
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
const isMain =
  typeof require !== 'undefined' && require.main === module;

if (isMain) {
  main();
}
