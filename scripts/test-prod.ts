// ---------------------------------------------------------------------------
// Smoke test — prod backend after the 17-item roadmap push
// ---------------------------------------------------------------------------
//
// Runs against the deployed Supabase + hits real BCE / BDA endpoints to
// confirm that the new libs (kbo/lookup, documents-scraper) actually work
// end-to-end. No local dev server needed.
// ---------------------------------------------------------------------------

import { config } from 'dotenv';
config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';
import { lookupKbo, suggestSectorsFromNace } from '../src/lib/kbo/lookup';
import { resolveTenderDocuments } from '../src/lib/scrapers/documents-scraper';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supa = createClient(url, service);

function line(ch = '─', n = 70) {
  return ch.repeat(n);
}

async function main() {
  const results: Array<{ step: string; status: 'ok' | 'warn' | 'fail'; detail: string }> = [];

  // 1. Migration 003 — saved_tenders.deadline_notified_at
  try {
    const { error } = await supa
      .from('saved_tenders')
      .select('deadline_notified_at')
      .limit(1);
    results.push({
      step: 'Migration 003 (saved_tenders.deadline_notified_at)',
      status: error ? 'fail' : 'ok',
      detail: error ? error.message : 'column accessible',
    });
  } catch (e) {
    results.push({ step: 'Migration 003', status: 'fail', detail: String(e) });
  }

  // 2. Migration 004 — saved_searches table
  try {
    const { error, count } = await supa
      .from('saved_searches')
      .select('*', { count: 'exact', head: true });
    results.push({
      step: 'Migration 004 (saved_searches table)',
      status: error ? 'fail' : 'ok',
      detail: error ? error.message : `table exists, ${count ?? 0} rows`,
    });
  } catch (e) {
    results.push({ step: 'Migration 004', status: 'fail', detail: String(e) });
  }

  // 3. Migration 005 — tenders.documents jsonb
  try {
    const { error } = await supa
      .from('tenders')
      .select('documents')
      .limit(1);
    results.push({
      step: 'Migration 005 (tenders.documents jsonb)',
      status: error ? 'fail' : 'ok',
      detail: error ? error.message : 'column accessible',
    });
  } catch (e) {
    results.push({ step: 'Migration 005', status: 'fail', detail: String(e) });
  }

  // 4. KBO lookup — real call on a well-known VAT (Belfius: 0403.201.185)
  try {
    const res = await lookupKbo('0403201185');
    if (res.ok) {
      const sectors = suggestSectorsFromNace(res.nace_codes);
      results.push({
        step: 'KBO lookup (0403201185 = Belfius)',
        status: 'ok',
        detail: `name="${res.company_name}" · ${res.nace_codes.length} NACE codes → sectors=[${sectors.join(', ')}]`,
      });
    } else {
      results.push({
        step: 'KBO lookup',
        status: 'warn',
        detail: `error=${res.error}`,
      });
    }
  } catch (e) {
    results.push({ step: 'KBO lookup', status: 'fail', detail: String(e) });
  }

  // 5. Real tender data in prod
  try {
    const { count: total } = await supa
      .from('tenders')
      .select('*', { count: 'exact', head: true });
    const { count: open } = await supa
      .from('tenders')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'open');
    const { count: withDocs } = await supa
      .from('tenders')
      .select('*', { count: 'exact', head: true })
      .not('documents', 'eq', '[]');

    results.push({
      step: 'Prod tender data',
      status: (total ?? 0) > 0 ? 'ok' : 'warn',
      detail: `total=${total ?? 0} · open=${open ?? 0} · with_cached_docs=${withDocs ?? 0}`,
    });
  } catch (e) {
    results.push({ step: 'Prod tender data', status: 'fail', detail: String(e) });
  }

  // 6. Documents scraper — pick a real open tender with a documents_url and
  // try to resolve its attachments. Validates end-to-end that BDA/TED HTML
  // is still shaped as the extractor expects.
  try {
    const { data: sample } = await supa
      .from('tenders')
      .select('id, title, source, documents_url, external_id, documents')
      .eq('status', 'open')
      .not('documents_url', 'is', null)
      .limit(1)
      .single();

    if (!sample) {
      results.push({
        step: 'Documents scraper',
        status: 'warn',
        detail: 'no open tender with documents_url to test against',
      });
    } else {
      const docs = await resolveTenderDocuments(sample);
      results.push({
        step: `Documents scraper (${sample.source}, tender ${sample.id.slice(0, 8)})`,
        status: 'ok',
        detail: `resolved ${docs.length} document(s): ${docs.slice(0, 3).map((d) => `${d.type}:${d.label.slice(0, 40)}`).join(' | ')}`,
      });
    }
  } catch (e) {
    results.push({ step: 'Documents scraper', status: 'fail', detail: String(e) });
  }

  // 7. Profiles / saved_tenders sanity
  try {
    const { count: profiles } = await supa
      .from('profiles')
      .select('*', { count: 'exact', head: true });
    const { count: saved } = await supa
      .from('saved_tenders')
      .select('*', { count: 'exact', head: true });
    results.push({
      step: 'User data',
      status: 'ok',
      detail: `profiles=${profiles ?? 0} · saved_tenders=${saved ?? 0}`,
    });
  } catch (e) {
    results.push({ step: 'User data', status: 'fail', detail: String(e) });
  }

  // Print
  console.log(line('═'));
  console.log('Radar — Smoke test prod (' + new Date().toISOString() + ')');
  console.log(line('═'));
  for (const r of results) {
    const emoji = r.status === 'ok' ? '✅' : r.status === 'warn' ? '⚠️ ' : '❌';
    console.log(`${emoji}  ${r.step}`);
    console.log(`    → ${r.detail}`);
  }
  console.log(line('═'));
  const fails = results.filter((r) => r.status === 'fail').length;
  const warns = results.filter((r) => r.status === 'warn').length;
  const oks = results.filter((r) => r.status === 'ok').length;
  console.log(`${oks} ok · ${warns} warn · ${fails} fail`);
  process.exit(fails > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
