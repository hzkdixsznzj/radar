// ---------------------------------------------------------------------------
// Backfill themes column for existing tenders.
// ---------------------------------------------------------------------------
//
// Run once after migration 008 to populate tenders.themes for all
// already-scraped rows. Subsequent scrapes will fill it in inline.
// Cost guard: skip rows that already have themes; cap concurrent calls.
// ---------------------------------------------------------------------------

import { config } from 'dotenv';
// override:true is necessary because something in the toolchain (dotenvx?
// nextjs?) preloads an empty ANTHROPIC_API_KEY before this script runs,
// and the default dotenv behaviour preserves existing values.
config({ path: '.env.local', override: true });

import { createClient } from '@supabase/supabase-js';
import { extractThemes } from '../src/lib/scrapers/extract-themes';

const BATCH_SIZE = 100;
const CONCURRENCY = 1;
// Anthropic Tier-1 cap is 50 RPM on Haiku. Pace at ~40 RPM (1.5s/call)
// to leave room for retries and not hit 429. For 2500 tenders that's
// ~62 min of wall time — fine for a one-shot backfill.
const PACE_MS = 1500;

async function main() {
  const supa = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // Find all tenders missing themes (or with empty array).
  const { count } = await supa
    .from('tenders')
    .select('*', { count: 'exact', head: true })
    .or('themes.is.null,themes.eq.{}');

  console.log(`Tenders without themes: ${count}`);

  let processed = 0;
  let withThemes = 0;
  let offset = 0;

  while (true) {
    const { data: rows, error } = await supa
      .from('tenders')
      .select('id, full_text')
      .or('themes.is.null,themes.eq.{}')
      .order('publication_date', { ascending: false })
      .range(offset, offset + BATCH_SIZE - 1);

    if (error) {
      console.error(error.message);
      break;
    }
    if (!rows || rows.length === 0) break;

    // Sequential processing with a fixed-pace sleep between calls so
    // we don't trip the 50 RPM rate limit.
    for (const row of rows) {
      const t0 = Date.now();
      const themes = await extractThemes(
        (row as { full_text: string }).full_text ?? '',
      );
      if (themes.length > 0) {
        await supa
          .from('tenders')
          .update({ themes })
          .eq('id', (row as { id: string }).id);
        withThemes++;
      }
      processed++;
      if (processed % 25 === 0) {
        console.log(`  ${processed} processed (${withThemes} got themes) …`);
      }
      const elapsed = Date.now() - t0;
      if (elapsed < PACE_MS) {
        await new Promise((r) => setTimeout(r, PACE_MS - elapsed));
      }
    }

    offset += BATCH_SIZE;
    if (rows.length < BATCH_SIZE) break;
  }

  console.log(`✅ Done. ${processed} tenders processed, ${withThemes} now tagged.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
