// ---------------------------------------------------------------------------
// scripts/notify.ts
// ---------------------------------------------------------------------------
//
// Daily digest push-notification job.
//
// For each profile with a `push_subscription`:
//   1. Pick tenders published in the last 24h that are still `open`.
//   2. Score them against the profile via `scoreTender()`.
//   3. If at least one tender scores >= NOTIFY_THRESHOLD, send a push
//      notification summarising the top hit and total count.
//   4. If the push fails with 404/410, null the subscription so we stop
//      hammering dead endpoints.
//
// Invoked by `.github/workflows/daily-radar.yml` once per day at 5h UTC.
// Safe to re-run manually: the `last_push_sent_at` column prevents
// double-notification within the same UTC day.
// ---------------------------------------------------------------------------

import { readFileSync, existsSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { initVapid, sendPushNotification } from '../src/lib/push';
import { scoreTender } from '../src/lib/scrapers/scoring';
import type { Profile, Tender } from '../src/types/database';

// Load .env.local when running locally (CI provides env directly).
if (existsSync('.env.local')) {
  for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    if (!process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const NOTIFY_THRESHOLD = Number(process.env.NOTIFY_THRESHOLD ?? '70');
const LOOKBACK_HOURS = 24;

interface ProfileWithPush extends Profile {
  push_subscription: PushSubscriptionJSON | null;
  last_push_sent_at: string | null;
}

async function main(): Promise<void> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY',
    );
  }

  initVapid();
  const supabase = createClient(supabaseUrl, serviceKey);

  // Tenders published in the last LOOKBACK_HOURS, still open.
  const cutoff = new Date(Date.now() - LOOKBACK_HOURS * 3600_000).toISOString();

  const { data: tenders, error: tendersErr } = await supabase
    .from('tenders')
    .select('*')
    .gte('publication_date', cutoff)
    .eq('status', 'open');

  if (tendersErr) throw new Error(`Failed to fetch tenders: ${tendersErr.message}`);
  if (!tenders?.length) {
    console.log('[notify] No new tenders in last 24h. Nothing to send.');
    return;
  }
  console.log(`[notify] ${tenders.length} fresh tenders in last ${LOOKBACK_HOURS}h.`);

  // Profiles with a live push subscription that haven't been notified today.
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  const { data: profiles, error: profilesErr } = await supabase
    .from('profiles')
    .select('*')
    .not('push_subscription', 'is', null);

  if (profilesErr) throw new Error(`Failed to fetch profiles: ${profilesErr.message}`);
  if (!profiles?.length) {
    console.log('[notify] No subscribed profiles.');
    return;
  }

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const profileRaw of profiles as ProfileWithPush[]) {
    // Already notified today? Skip.
    if (
      profileRaw.last_push_sent_at &&
      new Date(profileRaw.last_push_sent_at) >= todayStart
    ) {
      skipped++;
      continue;
    }

    // Score every fresh tender against this profile. Use a local copy of
    // `scoreTender` so we don't re-implement scoring in two places.
    const scored = (tenders as Tender[])
      .map((t) => ({ tender: t, score: scoreTender(t, profileRaw) }))
      .filter((x) => x.score >= NOTIFY_THRESHOLD)
      .sort((a, b) => b.score - a.score);

    if (scored.length === 0) {
      skipped++;
      continue;
    }

    const count = scored.length;
    const best = scored[0];

    const payload = {
      title:
        count > 1
          ? `${count} nouvelles opportunités`
          : 'Nouvelle opportunité pour vous',
      body: `${best.tender.title.slice(0, 120)}${best.tender.title.length > 120 ? '…' : ''}`,
      url: '/feed',
    };

    let ok = false;
    try {
      ok = await sendPushNotification(profileRaw.push_subscription!, payload);
    } catch (err) {
      console.warn(
        `[notify] Push error for profile ${profileRaw.user_id}:`,
        err instanceof Error ? err.message : err,
      );
      failed++;
      continue;
    }

    if (ok) {
      sent++;
      await supabase
        .from('profiles')
        .update({ last_push_sent_at: new Date().toISOString() })
        .eq('user_id', profileRaw.user_id);
    } else {
      // 404/410 — subscription dead, null it.
      await supabase
        .from('profiles')
        .update({ push_subscription: null })
        .eq('user_id', profileRaw.user_id);
      failed++;
    }
  }

  console.log(
    `[notify] Done. sent=${sent} skipped=${skipped} failed/expired=${failed}`,
  );
}

main().catch((err) => {
  console.error('[notify] Fatal error:', err);
  process.exit(1);
});
