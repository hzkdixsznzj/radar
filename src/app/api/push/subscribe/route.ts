// ---------------------------------------------------------------------------
// POST /api/push/subscribe — upsert the current user's push subscription
// ---------------------------------------------------------------------------
//
// Called by the client after `navigator.serviceWorker.pushManager.subscribe()`
// succeeds. Stores the JSON subscription on the user's profile so the
// nightly `scripts/notify.ts` pipeline can send daily digest notifications.
//
// DELETE /api/push/subscribe — user opts out of push notifications
// (nulls the column on the current user's profile).
// ---------------------------------------------------------------------------

import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const subscription = await request.json();
    if (!subscription || typeof subscription !== 'object' || !subscription.endpoint) {
      return NextResponse.json(
        { error: 'Payload invalide (attendu: objet PushSubscription JSON)' },
        { status: 400 },
      );
    }

    const { error } = await supabase
      .from('profiles')
      .update({ push_subscription: subscription })
      .eq('user_id', user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { error } = await supabase
      .from('profiles')
      .update({ push_subscription: null })
      .eq('user_id', user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
