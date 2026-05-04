import { config } from 'dotenv';
config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

async function main() {
  const supa = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
  const { data } = await supa
    .from('tenders')
    .select('*')
    .ilike('title', '%Blandain%')
    .single();
  console.log(JSON.stringify(data, null, 2));
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
