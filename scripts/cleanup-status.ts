// One-shot cleanup pass: mark tenders past their deadline as 'closed'.
// Should ideally run as part of the daily pipeline, not just one-shot.
import { config } from 'dotenv';
config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supa = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

async function main() {
  const now = new Date().toISOString();

  // Tenders with a known deadline that's already past → close.
  const { data: expired, error: selErr } = await supa
    .from('tenders')
    .select('id')
    .eq('status', 'open')
    .lt('deadline', now);

  if (selErr) {
    console.error('Select failed:', selErr.message);
    process.exit(1);
  }

  console.log(`Found ${expired?.length ?? 0} tenders past their deadline.`);

  if (!expired?.length) return;

  // Update in batches of 500 to stay under Supabase URL length limits.
  const ids = expired.map((r) => (r as { id: string }).id);
  const BATCH = 500;
  for (let i = 0; i < ids.length; i += BATCH) {
    const chunk = ids.slice(i, i + BATCH);
    const { error } = await supa
      .from('tenders')
      .update({ status: 'closed', updated_at: now })
      .in('id', chunk);
    if (error) {
      console.error(`Batch ${i / BATCH} failed:`, error.message);
      process.exit(1);
    }
    console.log(`Closed ${chunk.length} (${i + chunk.length}/${ids.length})`);
  }

  console.log('✅ Cleanup done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
