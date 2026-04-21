import { config } from 'dotenv';
config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';
import { resolveTenderDocuments } from '../src/lib/scrapers/documents-scraper';

const supa = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

async function main() {
  // Try a few tenders from different sources to see which have doc links.
  const { data: samples } = await supa
    .from('tenders')
    .select('id, title, source, documents_url, external_id')
    .eq('status', 'open')
    .not('documents_url', 'is', null)
    .limit(10);

  for (const t of samples ?? []) {
    console.log(`── ${t.source} · ${t.id.slice(0, 8)} · ${t.title?.slice(0, 60)}`);
    console.log(`   url: ${t.documents_url}`);
    // Check raw HTML size + look for href=*.pdf presence.
    try {
      const res = await fetch(t.documents_url!, {
        headers: {
          'user-agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36',
          accept: 'text/html',
        },
      });
      const html = await res.text();
      const hrefs = Array.from(
        html.matchAll(/href=["']([^"']+\.(?:pdf|docx?|xlsx?|zip)[^"']*)["']/gi),
      ).map((m) => m[1]);
      console.log(`   raw_html: ${html.length}b · direct pdf/docx hrefs: ${hrefs.length}`);
      if (hrefs.length) {
        console.log(`   sample: ${hrefs[0]}`);
      }
      const docs = await resolveTenderDocuments(t);
      console.log(`   extractor: ${docs.length} doc(s)`);
      if (docs.length) {
        for (const d of docs.slice(0, 3)) console.log(`     · ${d.type} ${d.label}`);
      }
    } catch (e) {
      console.log(`   ERR ${e}`);
    }
    console.log();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
