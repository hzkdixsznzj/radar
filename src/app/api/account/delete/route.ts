// ---------------------------------------------------------------------------
// POST /api/account/delete — GDPR right-to-erasure
// ---------------------------------------------------------------------------
//
// Wipes a user's profile, saved searches, saved tenders, dismissed
// tenders, push subscriptions, submissions, subscriptions, and finally
// the auth.users row itself.
//
// Order matters:
//   1. Cascade child tables explicitly (safer than relying on RLS).
//   2. Delete from auth.users last via the admin client.
//
// Tenders (the public catalog) are untouched — they're not "user data".
// ---------------------------------------------------------------------------

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function POST() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = user.id;

  // Service-role admin client — needed to delete from auth.users.
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  const tables = [
    'submissions',
    'saved_tenders',
    'saved_searches',
    'dismissed_tenders',
    'push_subscriptions',
    'subscriptions',
    'profiles',
  ];

  for (const table of tables) {
    // Best-effort: ignore "table does not exist" / RLS rejections.
    const { error } = await admin
      .from(table)
      .delete()
      .eq('user_id', userId);
    if (error) {
      console.warn(`[account/delete] ${table}: ${error.message}`);
    }
  }

  // Delete the auth user. After this the session cookies are stale —
  // the client should redirect to /login.
  const { error: authErr } = await admin.auth.admin.deleteUser(userId);
  if (authErr) {
    console.error('[account/delete] auth user delete:', authErr.message);
    return NextResponse.json(
      { error: 'partial_delete', message: authErr.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
