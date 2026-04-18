// ---------------------------------------------------------------------------
// /api/saved-searches — list + create named filter alerts
// ---------------------------------------------------------------------------
//
// GET  → returns the user's saved searches, newest first.
// POST → creates a new search { name, filters }.
//
// `filters` mirrors the feed query shape: type, region (friendly), budget
// (UI chip value), deadline, keywords. Stored verbatim so the nightly cron
// can re-apply them without mapping.
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

interface SavedSearchPayload {
  name?: string;
  filters?: Record<string, unknown>;
}

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('saved_searches')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ saved_searches: data ?? [] });
}

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  let body: SavedSearchPayload;
  try {
    body = (await request.json()) as SavedSearchPayload;
  } catch {
    return NextResponse.json({ error: 'JSON invalide' }, { status: 400 });
  }

  const name = (body.name ?? '').trim();
  const filters = body.filters ?? {};

  if (!name) {
    return NextResponse.json({ error: 'Nom requis' }, { status: 400 });
  }
  if (name.length > 80) {
    return NextResponse.json(
      { error: 'Nom trop long (max 80 caractères)' },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from('saved_searches')
    .insert({
      user_id: user.id,
      name,
      filters,
    })
    .select('*')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ saved_search: data }, { status: 201 });
}
