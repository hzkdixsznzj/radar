// ---------------------------------------------------------------------------
// POST /api/push/test — send a test push notification to the current user
// ---------------------------------------------------------------------------
//
// Called from the profile settings page so the user can verify their push
// subscription is alive. Reads the saved push_subscription from their
// profile and dispatches a one-off notification via web-push. Returns 404
// if the user has never opted in, or 410 if their subscription is stale
// (we null it in the DB so the UI can re-prompt).
// ---------------------------------------------------------------------------

import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { sendPushNotification } from '@/lib/push';

export const dynamic = 'force-dynamic';

export async function POST() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('push_subscription')
    .eq('user_id', user.id)
    .single();

  const subscription = profile?.push_subscription as
    | PushSubscriptionJSON
    | null
    | undefined;

  if (!subscription) {
    return NextResponse.json(
      { error: 'Aucune inscription push. Activez les notifications d\u2019abord.' },
      { status: 404 },
    );
  }

  try {
    const ok = await sendPushNotification(subscription, {
      title: 'Radar — notifications actives',
      body: 'C\u2019est bon ! Tu recevras les nouveaux marchés pertinents chaque jour.',
      url: '/feed',
    });

    if (!ok) {
      // Subscription is dead — clean it up so the UI can re-prompt.
      await supabase
        .from('profiles')
        .update({ push_subscription: null })
        .eq('user_id', user.id);
      return NextResponse.json(
        { error: 'Inscription expirée, réactivez les notifications.' },
        { status: 410 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[/api/push/test] failed:', err);
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : 'Erreur lors de l\u2019envoi',
      },
      { status: 500 },
    );
  }
}
