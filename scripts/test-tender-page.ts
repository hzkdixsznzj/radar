// Repro script: find the École Blandain tender id and probe its tender page
import { config } from 'dotenv';
config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const supa = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

async function main() {
  const { data, error } = await supa
    .from('tenders')
    .select('id, title, source, status, deadline, region, nuts_codes')
    .ilike('title', '%Blandain%')
    .limit(5);

  console.log(JSON.stringify({ data, error }, null, 2));

  const sample = data?.[0];
  if (sample) {
    const probeUrl = `https://radar-opal.vercel.app/tender/${sample.id}`;
    console.log('Probe:', probeUrl);
    const res = await fetch(probeUrl, { redirect: 'manual' });
    console.log('  status:', res.status);
    console.log('  location:', res.headers.get('location'));

    const apiUrl = `https://radar-opal.vercel.app/api/tenders/${sample.id}`;
    const apiRes = await fetch(apiUrl);
    console.log('  api status:', apiRes.status);
    console.log('  api body:', (await apiRes.text()).slice(0, 200));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
