// ---------------------------------------------------------------------------
// DELETE /api/saved-searches/[id]
// ---------------------------------------------------------------------------
//
// Remove a named alert. RLS on saved_searches enforces ownership, so we
// don't need to re-check user_id in the query — Supabase just returns
// count=0 if the row isn't the caller's.
// ---------------------------------------------------------------------------

import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const { error } = await supabase
    .from('saved_searches')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
