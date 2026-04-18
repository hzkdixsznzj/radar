// ---------------------------------------------------------------------------
// GET /api/tenders/[id] — fetch a single tender row
// ---------------------------------------------------------------------------
//
// Auth-gated (any logged-in user can read public tender data). We also enrich
// the response with the user's relevance_score so the detail page can show
// the same score that appeared in the feed — computed on the fly rather than
// persisted, because the score depends on the user's current profile which
// can change between feed view and detail view.
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { scoreTender } from '@/lib/scrapers/scoring';
import { friendlyRegionsToNuts } from '@/lib/geo/be-regions';
import type { Tender, Profile } from '@/types/database';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: tender, error } = await supabase
    .from('tenders')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !tender) {
    return NextResponse.json({ error: 'Tender not found' }, { status: 404 });
  }

  // Enrich with relevance_score using the user's profile.
  const { data: profileRow } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .single();

  const profile = profileRow as unknown as Profile | null;
  const scoringProfile: Profile | null = profile
    ? { ...profile, regions: friendlyRegionsToNuts(profile.regions ?? []) }
    : null;

  const relevance_score = scoringProfile
    ? scoreTender(tender as unknown as Tender, scoringProfile)
    : 50;

  return NextResponse.json({
    ...(tender as unknown as Tender),
    relevance_score,
  });
}
