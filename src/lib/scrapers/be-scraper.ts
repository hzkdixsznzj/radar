import type { Tender } from '@/types/database';

// ---------------------------------------------------------------------------
// STATUS: STUBBED — no working public API found.
// ---------------------------------------------------------------------------
//
// The Belgian Bulletin des Adjudications (e-Notification / e-Tendering at
// `www.publicprocurement.be` and `enot.publicprocurement.be`) does not
// currently expose a documented, stable JSON endpoint for third parties.
//
// Things that were tried / investigated:
//   1. `https://www.publicprocurement.be/api/v1/publications`
//      → returns HTML (a SPA shell), not JSON. Not an API.
//   2. `https://enot.publicprocurement.be/enot-war/` (and sub-paths like
//      `enot.publicprocurement.be/enot-war/preViewNotice.do`)
//      → this is a server-rendered JSP app. Notice detail pages exist but
//      there is no list/search JSON endpoint. Scraping would require HTML
//      parsing + session cookies + CAPTCHA risk.
//   3. RSS feeds at publicprocurement.be
//      → historically available but have been removed / replaced by the
//      SPA. No stable feed URL returns Atom/RSS today.
//   4. Relying on TED for coverage
//      → TED only publishes tenders ABOVE the EU thresholds (works
//      ≥ €5.538M, services/supplies ≥ €221k or €143k depending on sector).
//      Belgian sub-threshold notices (the majority by count for SMEs)
//      never appear on TED.
//
// Until Belgium exposes a real JSON API (or we pay for a commercial
// aggregator like Doffin / TenderNed / BIP-Belgium), this scraper is a
// no-op. It MUST NOT throw — the nightly cron relies on it returning
// gracefully so the TED side still runs.
//
// When a working endpoint becomes available, re-implement `scrapeBE()`
// using a Supabase upsert pattern mirroring `ted-scraper.ts`:
//   - dedupe by (source='be_bulletin', external_id)
//   - multilingual title picker (fra > nld > eng)
//   - infer tender_type from title keywords
//   - return the number of rows upserted
// ---------------------------------------------------------------------------

// Re-export for parity with ted-scraper when a future implementation lands.
export type BETender = Omit<Tender, 'id' | 'created_at' | 'updated_at'>;

/**
 * Scrape the Belgian Bulletin des Adjudications.
 *
 * Currently stubbed — see top-of-file comment for the status of known
 * endpoints. Returns 0 without throwing so the cron pipeline keeps running.
 */
export async function scrapeBE(): Promise<number> {
  console.warn(
    '[BE] scrapeBE() is stubbed. No working public API for publicprocurement.be ' +
      'was found. Returning 0 upserts. TODO: integrate a real source (enot HTML ' +
      'parser, a commercial feed, or a future official API) to cover Belgian ' +
      'sub-threshold tenders.',
  );
  return 0;
}

// ---------------------------------------------------------------------------
// Standalone entry point (used by `npm run scrape:be`)
// ---------------------------------------------------------------------------

async function main() {
  try {
    const count = await scrapeBE();
    console.log(`[BE] Done. ${count} tenders upserted (stub).`);
    process.exit(0);
  } catch (err) {
    // Defensive: scrapeBE() currently never throws, but guard anyway.
    console.error('[BE] Fatal error:', err);
    process.exit(1);
  }
}

const isMain = typeof require !== 'undefined' && require.main === module;

if (isMain) {
  main();
}
