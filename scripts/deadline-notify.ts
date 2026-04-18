// ---------------------------------------------------------------------------
// scripts/deadline-notify.ts
// ---------------------------------------------------------------------------
//
// Deadline-at-risk push notification job.
//
// For each saved_tenders row where:
//   – tender.deadline is within the next `WARN_DAYS` days
//   – deadline_notified_at is NULL (we haven't warned yet)
//   – the user has an active push_subscription
//   – the saved tender status is still actionable (not submitted/won/lost)
// …send a push notification and stamp deadline_notified_at so we don't
// notify again for this tender.
//
// Runs as part of the daily GitHub Actions workflow, right after the
// main notify.ts job.
// ---------------------------------------------------------------------------

import { readFileSync, existsSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { initVapid, sendPushNotification } from '../src/lib/push';
import type { SavedTender, Tender } from '../src/types/database';

// Load .env.local when running locally (CI provides env directly).
if (existsSync('.env.local')) {
  for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    if (!process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

// Warn this many days before deadline. Default: 3 days.
const WARN_DAYS = Number(process.env.DEADLINE_WARN_DAYS ?? '3');
// Don't re-warn if we already warned within this many hours (safety rail).
const RENOTIFY_COOLDOWN_HOURS = 24 * WARN_DAYS;

// Keep statuses users can still act on. Skip done/lost/won.
const ACTIONABLE_STATUSES = new Set(['new', 'analyzing', 'drafting']);

interface SavedWithTender extends SavedTender {
  deadline_notified_at: string | null;
  tender: Tender;
}

interface ProfileLite {
  user_id: string;
  push_subscription: PushSubscriptionJSON | null;
  company_name: string;
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

  const now = Date.now();
  const cutoffIso = new Date(now + WARN_DAYS * 86_400_000).toISOString();
  const renotifyCutoff = new Date(
    now - RENOTIFY_COOLDOWN_HOURS * 3_600_000,
  ).toISOString();

  // Saved tenders whose tender has a deadline in the danger window.
  const { data: rows, error } = await supabase
    .from('saved_tenders')
    .select('*, tender:tenders(*)')
    .lte('tender.deadline', cutoffIso)
    .gte('tender.deadline', new Date(now).toISOString())
    .in('status', Array.from(ACTIONABLE_STATUSES));

  if (error) {
    throw new Error(`Failed to fetch saved tenders: ${error.message}`);
  }
  if (!rows?.length) {
    console.log('[deadline-notify] No tenders approaching deadline.');
    return;
  }

  // Filter rows where we haven't notified yet (or cooldown elapsed).
  const candidates = (rows as unknown as SavedWithTender[]).filter((r) => {
    if (!r.tender) return false;
    if (!r.deadline_notified_at) return true;
    return r.deadline_notified_at < renotifyCutoff;
  });

  if (candidates.length === 0) {
    console.log('[deadline-notify] All candidates already notified.');
    return;
  }
  console.log(`[deadline-notify] ${candidates.length} candidate(s).`);

  // Fetch push subscriptions for the unique users.
  const userIds = Array.from(new Set(candidates.map((r) => r.user_id)));
  const { data: profiles, error: profileErr } = await supabase
    .from('profiles')
    .select('user_id, push_subscription, company_name')
    .in('user_id', userIds);

  if (profileErr) {
    throw new Error(`Failed to fetch profiles: ${profileErr.message}`);
  }

  const pushByUser = new Map<string, PushSubscriptionJSON | null>();
  for (const p of (profiles ?? []) as ProfileLite[]) {
    pushByUser.set(p.user_id, p.push_subscription);
  }

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of candidates) {
    const sub = pushByUser.get(row.user_id);
    if (!sub) {
      skipped++;
      continue;
    }

    const deadlineDate = new Date(row.tender.deadline);
    const hoursLeft = Math.max(
      0,
      Math.round((deadlineDate.getTime() - now) / 3_600_000),
    );
    const daysLeft = Math.max(1, Math.round(hoursLeft / 24));

    const payload = {
      title: `Échéance dans ${daysLeft} jour${daysLeft > 1 ? 's' : ''}`,
      body: `${row.tender.title.slice(0, 110)}${row.tender.title.length > 110 ? '…' : ''}`,
      url: `/tender/${row.tender.id}`,
    };

    let ok = false;
    try {
      ok = await sendPushNotification(sub, payload);
    } catch (err) {
      console.warn(
        `[deadline-notify] Push error for saved ${row.id}:`,
        err instanceof Error ? err.message : err,
      );
      failed++;
      continue;
    }

    if (ok) {
      sent++;
      await supabase
        .from('saved_tenders')
        .update({ deadline_notified_at: new Date().toISOString() })
        .eq('id', row.id);
    } else {
      // Subscription dead — null it and move on.
      await supabase
        .from('profiles')
        .update({ push_subscription: null })
        .eq('user_id', row.user_id);
      failed++;
    }
  }

  console.log(
    `[deadline-notify] Done. sent=${sent} skipped=${skipped} failed/expired=${failed}`,
  );
}

main().catch((err) => {
  console.error('[deadline-notify] Fatal error:', err);
  process.exit(1);
});
