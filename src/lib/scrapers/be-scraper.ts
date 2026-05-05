// ---------------------------------------------------------------------------
// Belgian Bulletin des Adjudications (BDA) scraper
// ---------------------------------------------------------------------------
//
// Reverse-engineered from the live BOSA e-Procurement Vue.js app
// (https://www.publicprocurement.be/bda) on 2026-04-18.
//
// Auth: Keycloak realm "supplier", client "frontend-public", `client_credentials`
// grant. The client_secret is exposed in the public `env.config.js` file served
// to every browser — it's not a real secret, it's just how the public read API
// is gated. Access tokens expire in ~1 hour; we fetch a fresh one per run.
//
// Search: POST /api/sea/search/publications with a small JSON body. Default
// sort is publicationDate DESC, so we page from newest and stop once we cross
// the `daysBack` cutoff. Covers ALL Belgian public tenders, including sub-EU-
// threshold ones that TED doesn't publish (~27k active publications total).
//
// This REPLACES the previous no-op stub. The DB source column accepts
// 'be_bulletin' (see migration 001 CHECK constraint).
// ---------------------------------------------------------------------------

import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import type { Tender, TenderType } from '@/types/database';
import { extractBudget } from './extract-budget';

// Load .env.local when running locally. CI provides env directly.
if (existsSync('.env.local')) {
  for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    if (!process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const TOKEN_URL =
  'https://www.publicprocurement.be/auth/realms/supplier/protocol/openid-connect/token';
const SEARCH_URL = 'https://www.publicprocurement.be/api/sea/search/publications';
const CLIENT_ID = 'frontend-public';
// Not secret — served to every browser in https://www.publicprocurement.be/env.config.js
const CLIENT_SECRET = 'dOgiVdH2CdB7sfwunDgWQ6FY4hkVAZTPUGGj4gcAtAw';

const PAGE_SIZE = 100;
const MAX_PAGES = 30; // hard cap: 30 * 100 = 3000 publications per run
const DEFAULT_DAYS_BACK = 7;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;
const REQUEST_DELAY_MS = 300;

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }
  return createClient(url, key);
}

// ---------------------------------------------------------------------------
// HTTP helpers (same retry pattern as ted-scraper)
// ---------------------------------------------------------------------------

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

      if ((res.status === 429 || res.status >= 500) && attempt < retries) {
        const delay = RETRY_DELAY_MS * attempt;
        console.warn(
          `[BDA] Request failed (${res.status}), retrying in ${delay}ms (attempt ${attempt}/${retries})`,
        );
        await sleep(delay);
        continue;
      }

      const body = await res.text().catch(() => '');
      throw new Error(
        `BDA API responded with ${res.status}: ${res.statusText}${body ? ` — ${body.slice(0, 300)}` : ''}`,
      );
    } catch (err) {
      if (attempt === retries) throw err;
      const delay = RETRY_DELAY_MS * attempt;
      console.warn(
        `[BDA] Network error, retrying in ${delay}ms (attempt ${attempt}/${retries}):`,
        (err as Error).message,
      );
      await sleep(delay);
    }
  }
  throw new Error('[BDA] All retries exhausted');
}

// ---------------------------------------------------------------------------
// Auth: Keycloak client_credentials grant
// ---------------------------------------------------------------------------

async function getAccessToken(): Promise<string> {
  const res = await fetchWithRetry(TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
    }).toString(),
  });
  const json = (await res.json()) as { access_token?: string };
  if (!json.access_token) {
    throw new Error('[BDA] No access_token in Keycloak response');
  }
  return json.access_token;
}

// ---------------------------------------------------------------------------
// BDA publication shape (subset we care about)
// ---------------------------------------------------------------------------

interface LocalisedText {
  language?: string;
  text?: string;
}

interface CpvItem {
  code?: string;
  descriptions?: LocalisedText[];
}

interface BDAPublicationLot {
  titles?: LocalisedText[];
  descriptions?: LocalisedText[];
}

interface BDAPublication {
  referenceNumber?: string;
  dossier?: {
    titles?: LocalisedText[];
    descriptions?: LocalisedText[];
    number?: string;
    referenceNumber?: string;
    procurementProcedureType?: string;
  };
  organisation?: {
    organisationId?: number;
    organisationNames?: LocalisedText[];
  };
  natures?: string[];
  cpvMainCode?: CpvItem;
  cpvAdditionalCodes?: CpvItem[];
  nutsCodes?: string[];
  publicationDate?: string; // YYYY-MM-DD
  dispatchDate?: string; // YYYY-MM-DD
  vaultSubmissionDeadline?: string | null; // ISO timestamp (no TZ)
  publicationType?: string; // 'ACTIVE' | ...
  publicationWorkspaceId?: string;
  /** Per-lot rich descriptions — usually contain the actual project
   *  scope, budget hints, technical requirements. Source of truth for
   *  budget extraction. */
  lots?: BDAPublicationLot[];
  /** BDA notice subType: F2/E2 = call for offers (opportunity);
   *  F3/E3/E4/E5 = award notices. The exact codes depend on the
   *  underlying eForm version. */
  noticeSubType?: string;
  /** Award-specific fields — only present on award notices. */
  awardedToOrganisationName?: string;
  awardedAmount?: number;
  awardDate?: string;
  /** Reference to the original opportunity, if available. */
  originalReferenceNumber?: string;
}

interface BDASearchResponse {
  publications?: BDAPublication[];
  totalCount?: number;
}

// ---------------------------------------------------------------------------
// Mapping helpers
// ---------------------------------------------------------------------------

/** Multilingual pick: prefer FR > NL > EN > DE > first available. */
function pickLang(items: LocalisedText[] | undefined): string {
  if (!items || items.length === 0) return '';
  const order = ['FR', 'NL', 'EN', 'DE'];
  for (const lang of order) {
    const hit = items.find((i) => i.language?.toUpperCase() === lang);
    if (hit?.text) return hit.text;
  }
  return items[0]?.text ?? '';
}

function mapNature(natures: string[] | undefined): TenderType {
  const n = (natures?.[0] ?? '').toUpperCase();
  if (n === 'WORKS') return 'works';
  if (n === 'SUPPLIES') return 'supplies';
  // 'SERVICES' and anything else → 'services'
  return 'services';
}

/** Classify a BDA notice into our `notice_kind` enum.
 *  E1/E2/F2 = call for offers (opportunity)
 *  E3/E4/E5/F3 = award / contract awarded
 *  E6/F6 = modification / corrigendum
 *  E7/F7 = prior info notice (PIN)  */
function mapNoticeKind(
  subType: string | undefined,
): 'opportunity' | 'award' | 'prior_info' | 'modification' {
  const s = (subType ?? '').toUpperCase();
  if (/^[EF]?[34]$|^[EF]?5$/.test(s)) return 'award';
  if (/^[EF]?6$/.test(s)) return 'modification';
  if (/^[EF]?7$/.test(s)) return 'prior_info';
  return 'opportunity';
}

/** Prefer a Belgian sub-region code (e.g. BE213) over the generic BE/BEL. */
function pickRegion(nuts: string[]): string {
  for (const c of nuts) {
    if (c.startsWith('BE') && c !== 'BEL' && c !== 'BE') return c;
  }
  return 'BE';
}

// Same trick as ted-scraper: DB `deadline` is nullable even though the shared
// Tender type narrows to `string` for the UI. Allow null here. Award-notice
// fields are also optional (most rows are opportunities).
type TenderInsert = Omit<
  Tender,
  'id' | 'created_at' | 'updated_at' | 'deadline'
> & {
  deadline: string | null;
  notice_kind?: 'opportunity' | 'award' | 'prior_info' | 'modification';
  awarded_to?: string | null;
  awarded_value?: number | null;
  awarded_at?: string | null;
};

function mapPublication(p: BDAPublication): TenderInsert | null {
  const externalId =
    p.referenceNumber ?? p.dossier?.referenceNumber ?? p.publicationWorkspaceId;
  if (!externalId) return null;

  const title = pickLang(p.dossier?.titles) || 'Untitled';
  const description = pickLang(p.dossier?.descriptions) || title;
  const buyer = pickLang(p.organisation?.organisationNames) || 'Unknown';

  const cpvCodes: string[] = [];
  const cpvDescriptions: string[] = [];
  if (p.cpvMainCode?.code) {
    cpvCodes.push(p.cpvMainCode.code);
    const d = pickLang(p.cpvMainCode.descriptions);
    if (d) cpvDescriptions.push(d);
  }
  for (const extra of p.cpvAdditionalCodes ?? []) {
    if (extra.code && !cpvCodes.includes(extra.code)) {
      cpvCodes.push(extra.code);
      const d = pickLang(extra.descriptions);
      if (d) cpvDescriptions.push(d);
    }
  }

  const nutsCodes = p.nutsCodes ?? [];
  const publicationDate =
    p.publicationDate ?? p.dispatchDate ?? new Date().toISOString().slice(0, 10);

  // `vaultSubmissionDeadline` is 'YYYY-MM-DDTHH:MM:SS' without TZ.
  // Postgres timestamptz will interpret it as local — we append 'Z' to pin UTC.
  const rawDeadline = p.vaultSubmissionDeadline ?? null;
  const deadline = rawDeadline
    ? /Z|[+-]\d{2}:?\d{2}$/.test(rawDeadline)
      ? rawDeadline
      : `${rawDeadline}Z`
    : null;

  const status: 'open' | 'closed' =
    p.publicationType === 'ACTIVE' ? 'open' : 'closed';

  const docsUrl = p.publicationWorkspaceId
    ? `https://www.publicprocurement.be/bda/publications/${p.publicationWorkspaceId}`
    : null;

  // Build a rich full_text to feed the sector/keyword scoring AND the
  // budget extractor. Titles on the BDA are often terse ("Accord-cadre -
  // Dépannage"); the dossier description is sometimes a one-liner. The
  // meat — full project scope, budget mentions, technical specs — lives
  // in the per-lot descriptions, so we explicitly include those.
  const procedure = p.dossier?.procurementProcedureType ?? '';
  const lotTitles: string[] = [];
  const lotDescriptions: string[] = [];
  for (const lot of p.lots ?? []) {
    const lt = pickLang(lot.titles);
    if (lt) lotTitles.push(lt);
    const ld = pickLang(lot.descriptions);
    if (ld) lotDescriptions.push(ld);
  }
  const fullText = [
    title,
    description,
    lotTitles.length ? `Lots: ${lotTitles.join(' · ')}` : null,
    lotDescriptions.length ? lotDescriptions.join('\n\n') : null,
    cpvDescriptions.length ? `CPV: ${cpvDescriptions.join(' · ')}` : null,
    procedure ? `Procédure: ${procedure}` : null,
    buyer && buyer !== 'Unknown' ? `Adjudicateur: ${buyer}` : null,
  ]
    .filter(Boolean)
    .join('\n\n');

  // Best-effort budget extraction from the body text. BDA's structured
  // payload doesn't expose `estimated_value`; the figure usually shows
  // up in the description in human-readable form ("estimé à 250 000 EUR
  // HTVA"). The extractor only commits a value when it's reasonably
  // confident — see src/lib/scrapers/extract-budget.ts.
  const extractedValue = extractBudget(fullText);

  const noticeKind = mapNoticeKind(p.noticeSubType);

  return {
    source: 'be_bulletin',
    external_id: externalId,
    title,
    description,
    contracting_authority: buyer,
    tender_type: mapNature(p.natures),
    cpv_codes: cpvCodes,
    nuts_codes: nutsCodes,
    region: pickRegion(nutsCodes),
    publication_date: publicationDate,
    deadline,
    estimated_value: extractedValue,
    currency: 'EUR',
    // Award notices are post-contract: there's no submission deadline to
    // chase. Mark them 'closed' so they don't pollute the live feed but
    // remain queryable for the competitive-intel surface.
    status: noticeKind === 'award' ? 'closed' : status,
    full_text: fullText,
    documents_url: docsUrl,
    notice_kind: noticeKind,
    awarded_to: p.awardedToOrganisationName ?? null,
    awarded_value: p.awardedAmount ?? null,
    awarded_at: p.awardDate ?? null,
  };
}

// ---------------------------------------------------------------------------
// Search + pagination
// ---------------------------------------------------------------------------

async function fetchPage(token: string, page: number): Promise<BDASearchResponse> {
  const res = await fetchWithRetry(SEARCH_URL, {
    method: 'POST',
    headers: {
      Accept: 'application/json, text/plain, */*',
      'Accept-Language': 'fr',
      'Account-Type': 'public',
      Authorization: `Bearer ${token}`,
      'BelGov-Trace-Id': randomUUID(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      includeOrganisationChildren: true,
      // ACTIVE = currently-open opportunities (notices users can bid on).
      // ARCHIVED = past notices, including award notices once the contract
      // has been awarded. We pull both to populate competitive-intel
      // (who won, at what price); the mapper tags them via notice_kind
      // so the UI can decide what to show where.
      publicationStatuses: ['ACTIVE', 'ARCHIVED'],
      page, // 1-indexed
      pageSize: PAGE_SIZE,
    }),
  });
  return (await res.json()) as BDASearchResponse;
}

// ---------------------------------------------------------------------------
// Upsert into Supabase
// ---------------------------------------------------------------------------

const UPSERT_BATCH_SIZE = 500;

async function upsertTenders(tenders: TenderInsert[]): Promise<number> {
  if (tenders.length === 0) return 0;

  const supabase = getSupabase();

  // Supabase upserts are capped per-call; chunk to be safe with ~1k-row runs.
  let total = 0;
  for (let i = 0; i < tenders.length; i += UPSERT_BATCH_SIZE) {
    const chunk = tenders.slice(i, i + UPSERT_BATCH_SIZE);
    const { data, error } = await supabase
      .from('tenders')
      .upsert(chunk, {
        onConflict: 'source,external_id',
        ignoreDuplicates: false,
      })
      .select('id');

    if (error) {
      console.error(
        `[BDA] Supabase upsert error (chunk ${i}/${tenders.length}):`,
        error.message,
      );
      throw error;
    }
    total += data?.length ?? 0;
  }

  return total;
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Scrape the Belgian Bulletin des Adjudications (BDA) for the last `daysBack`
 * days. Paginates through BDA results (newest first), stops once the oldest
 * item on the current page is older than the cutoff.
 *
 * Returns the number of rows upserted into the `tenders` table.
 */
export async function scrapeBE(daysBack: number = DEFAULT_DAYS_BACK): Promise<number> {
  console.log(`[BDA] Starting BE scrape, last ${daysBack} days...`);

  const token = await getAccessToken();
  console.log('[BDA] Keycloak token acquired.');

  const cutoff = new Date(Date.now() - daysBack * 86400_000)
    .toISOString()
    .slice(0, 10); // YYYY-MM-DD

  const collected: TenderInsert[] = [];
  const seen = new Set<string>();
  let totalCount: number | undefined;

  for (let page = 1; page <= MAX_PAGES; page++) {
    const resp = await fetchPage(token, page);
    if (totalCount === undefined) totalCount = resp.totalCount;

    const pubs = resp.publications ?? [];
    if (pubs.length === 0) {
      console.log(`[BDA] Page ${page}: empty, stopping.`);
      break;
    }

    let oldestOnPage = '9999-12-31';
    let keptOnPage = 0;
    for (const p of pubs) {
      const pd = p.publicationDate ?? p.dispatchDate ?? '';
      if (pd && pd < oldestOnPage) oldestOnPage = pd;
      if (pd && pd < cutoff) continue; // older than window — skip
      const mapped = mapPublication(p);
      if (!mapped) continue;
      if (seen.has(mapped.external_id)) continue;
      seen.add(mapped.external_id);
      collected.push(mapped);
      keptOnPage++;
    }

    console.log(
      `[BDA] Page ${page}: received=${pubs.length} kept=${keptOnPage} total_collected=${collected.length} oldest_on_page=${oldestOnPage}`,
    );

    // Early termination: results are sorted by date DESC, so if the oldest
    // row on this page is before the cutoff, everything past it is older.
    if (oldestOnPage < cutoff) {
      console.log(`[BDA] Crossed cutoff (${cutoff}), stopping pagination.`);
      break;
    }

    await sleep(REQUEST_DELAY_MS); // be polite to the API
  }

  if (totalCount !== undefined) {
    console.log(`[BDA] BDA reports ${totalCount} total publications in index.`);
  }

  const count = await upsertTenders(collected);
  console.log(
    `[BDA] Scrape complete. Collected=${collected.length}, upserted=${count}.`,
  );
  return count;
}

// ---------------------------------------------------------------------------
// Standalone entry point (used by `pnpm run scrape:be`)
// ---------------------------------------------------------------------------

async function main() {
  try {
    const count = await scrapeBE();
    console.log(`[BDA] Done. ${count} tenders upserted.`);
    process.exit(0);
  } catch (err) {
    console.error('[BDA] Fatal error:', err);
    process.exit(1);
  }
}

const isMain = typeof require !== 'undefined' && require.main === module;

if (isMain) {
  main();
}
