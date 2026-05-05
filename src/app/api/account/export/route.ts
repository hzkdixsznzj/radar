// ---------------------------------------------------------------------------
// GET /api/account/export — GDPR right-to-portability
// ---------------------------------------------------------------------------
//
// Returns a JSON dump of every row owned by the requesting user, across
// all tables. The user gets a download attachment they can store
// indefinitely or import elsewhere.
//
// We deliberately don't include linked tender data (the marketplace
// catalog) — only the user's own actions and preferences.
// ---------------------------------------------------------------------------

import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const tables = [
    'profiles',
    'subscriptions',
    'saved_tenders',
    'saved_searches',
    'dismissed_tenders',
    'submissions',
    'push_subscriptions',
  ];

  const dump: Record<string, unknown[]> = {
    _meta: [
      {
        format: 'radar-account-export-v1',
        exported_at: new Date().toISOString(),
        user_id: user.id,
        email: user.email ?? null,
      },
    ],
  };

  for (const table of tables) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .eq('user_id', user.id);
    dump[table] = error ? [{ error: error.message }] : (data ?? []);
  }

  const filename = `radar-export-${new Date().toISOString().slice(0, 10)}.json`;
  return new NextResponse(JSON.stringify(dump, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
