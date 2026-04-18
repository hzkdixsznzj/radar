// ---------------------------------------------------------------------------
// DELETE /api/account — permanent account deletion
// ---------------------------------------------------------------------------
//
// The profile page calls this when the user types "SUPPRIMER" in the danger
// zone. We delete the auth.users row server-side with the service-role key;
// Postgres cascades clean up profiles / subscriptions / saved_tenders /
// dismissed_tenders / submissions thanks to `on delete cascade` in the
// initial schema.
//
// Why service-role: the ssr Supabase client inherits the user's JWT and
// does not have permission to call auth.admin.deleteUser. The client sends
// their cookies so we can confirm *who* is deleting, then we hop to a
// service-role client to actually delete.
// ---------------------------------------------------------------------------

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function DELETE() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!serviceKey || !url) {
    console.error('[/api/account] missing service-role config');
    return NextResponse.json(
      { error: 'Server misconfigured' },
      { status: 500 },
    );
  }

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    console.error('[/api/account] deleteUser failed:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
