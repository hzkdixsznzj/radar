// One-shot: bump the project owner's subscription to business (admin/dev access).
import { config } from 'dotenv';
config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const supa = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

async function main() {
  // Find the only profile (we know there's just one user in prod).
  const { data: profiles } = await supa.from('profiles').select('user_id, company_name');
  if (!profiles?.length) {
    console.error('No profile found');
    process.exit(1);
  }
  console.log('Profiles:', profiles);

  for (const p of profiles) {
    const { error } = await supa
      .from('subscriptions')
      .update({
        plan: 'business',
        status: 'active',
        current_period_end: new Date('2099-12-31').toISOString(),
      })
      .eq('user_id', p.user_id);
    if (error) {
      console.error('Failed for', p.user_id, error.message);
    } else {
      console.log('✅ Upgraded', p.user_id, '(' + (p.company_name ?? 'no name') + ') to business');
    }
  }

  // Verify
  const { data: subs } = await supa.from('subscriptions').select('*');
  console.log('Subscriptions now:', subs);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
