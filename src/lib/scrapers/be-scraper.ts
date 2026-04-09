import { createClient } from '@supabase/supabase-js';
import type { Tender, TenderType } from '@/types/database';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const BE_PROCUREMENT_BASE = 'https://www.publicprocurement.be';
const RSS_URL = `${BE_PROCUREMENT_BASE}/api/v1/publications`;
const PAGE_SIZE = 50;
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

      if ((res.status === 429 || res.status >= 500) && attempt < retries) {
        const delay = RETRY_DELAY_MS * attempt;
        console.warn(
          `[BE] Request failed (${res.status}), retrying in ${delay}ms (attempt ${attempt}/${retries})`,
        );
        await sleep(delay);
        continue;
      }

      throw new Error(`BE API responded with ${res.status}: ${res.statusText}`);
    } catch (err) {
      if (attempt === retries) throw err;
      const delay = RETRY_DELAY_MS * attempt;
      console.warn(
        `[BE] Network error, retrying in ${delay}ms (attempt ${attempt}/${retries}):`,
        (err as Error).message,
      );
      await sleep(delay);
    }
  }
  throw new Error('[BE] All retries exhausted');
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sevenDaysAgo(): string {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// BE publication types
// ---------------------------------------------------------------------------

interface BEPublication {
  id?: string;
  reference?: string;
  title?: string;
  titleFr?: string;
  titleNl?: string;
  description?: string;
  descriptionFr?: string;
  descriptionNl?: string;
  contractingAuthority?: string;
  contractType?: string;
  cpvCodes?: string[];
  nutsCodes?: string[];
  region?: string;
  publicationDate?: string;
  submissionDeadline?: string;
  estimatedValue?: number;
  currency?: string;
  status?: string;
  documentUrl?: string;
  fullText?: string;
}

interface BESearchResponse {
  publications?: BEPublication[];
  total?: number;
  page?: number;
  totalPages?: number;
}

function mapContractType(type?: string): TenderType {
  switch (type?.toLowerCase()) {
    case 'works':
    case 'travaux':
    case 'werken':
      return 'works';
    case 'supplies':
    case 'fournitures':
    case 'leveringen':
      return 'supplies';
    case 'services':
    case 'diensten':
    default:
      return 'services';
  }
}

function pickTitle(pub: BEPublication): string {
  return pub.title || pub.titleFr || pub.titleNl || 'Untitled';
}

function pickDescription(pub: BEPublication): string {
  return pub.description || pub.descriptionFr || pub.descriptionNl || '';
}

function mapPublicationToTender(
  pub: BEPublication,
): Omit<Tender, 'id' | 'created_at' | 'updated_at'> {
  const externalId = pub.reference || pub.id || `be-${Date.now()}`;
  const nutsRaw = pub.nutsCodes ?? [];

  return {
    source: 'be_bulletin',
    external_id: externalId,
    title: pickTitle(pub),
    description: pickDescription(pub),
    contracting_authority: pub.contractingAuthority ?? 'Unknown',
    tender_type: mapContractType(pub.contractType),
    cpv_codes: pub.cpvCodes ?? [],
    nuts_codes: nutsRaw,
    region: pub.region || (nutsRaw.length > 0 ? nutsRaw[0] : 'BE'),
    publication_date: pub.publicationDate ?? new Date().toISOString(),
    deadline: pub.submissionDeadline ?? '',
    estimated_value: pub.estimatedValue ?? null,
    currency: pub.currency ?? 'EUR',
    status: 'open',
    full_text: pub.fullText || pickDescription(pub),
    documents_url: pub.documentUrl ?? null,
  };
}

// ---------------------------------------------------------------------------
// Fetch pages
// ---------------------------------------------------------------------------

async function fetchPage(page: number): Promise<BESearchResponse> {
  const since = sevenDaysAgo();

  const params = new URLSearchParams({
    status: 'open',
    publishedSince: since,
    page: String(page),
    pageSize: String(PAGE_SIZE),
    sort: 'publicationDate',
    order: 'desc',
  });

  const url = `${RSS_URL}?${params}`;
  console.log(`[BE] Fetching page ${page}: ${url}`);

  const res = await fetchWithRetry(url, {
    headers: { Accept: 'application/json' },
  });

  return (await res.json()) as BESearchResponse;
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
    console.error('[BE] Supabase upsert error:', error.message);
    throw error;
  }

  return data?.length ?? 0;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export async function scrapeBE(): Promise<number> {
  console.log('[BE] Starting scrape of Belgian public procurement publications...');

  let totalUpserted = 0;
  let currentPage = 1;
  let totalPages = 1;

  do {
    const response = await fetchPage(currentPage);
    const publications = response.publications ?? [];
    totalPages = response.totalPages ?? 1;

    console.log(
      `[BE] Page ${currentPage}/${totalPages} — ${publications.length} publications received`,
    );

    if (publications.length === 0) break;

    const mapped = publications.map(mapPublicationToTender);
    const count = await upsertTenders(mapped);
    totalUpserted += count;

    console.log(`[BE] Upserted ${count} tenders from page ${currentPage}`);

    currentPage++;
    if (currentPage <= totalPages) await sleep(500);
  } while (currentPage <= totalPages);

  console.log(`[BE] Scrape complete. Total upserted: ${totalUpserted}`);
  return totalUpserted;
}

// ---------------------------------------------------------------------------
// Standalone entry point
// ---------------------------------------------------------------------------

async function main() {
  try {
    const count = await scrapeBE();
    console.log(`[BE] Done. ${count} tenders upserted.`);
    process.exit(0);
  } catch (err) {
    console.error('[BE] Fatal error:', err);
    process.exit(1);
  }
}

const isMain =
  typeof require !== 'undefined' && require.main === module;

if (isMain) {
  main();
}
