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
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { initVapid, sendPushNotification } from '../src/lib/push';
import { scoreTender } from '../src/lib/scrapers/scoring';
import { BE_REGION_TO_NUTS, type BERegion } from '../src/lib/geo/be-regions';
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

// Saved-search row shape matching public.saved_searches (see migration 004).
interface SavedSearchRow {
  id: string;
  user_id: string;
  name: string;
  filters: {
    type?: string;
    region?: string;
    budget?: string;
    deadline?: string;
    keywords?: string[];
  } | null;
  last_notified_at: string | null;
}

/**
 * Test a single tender against a saved_searches filter payload. Mirrors the
 * logic in /api/tenders (friendly region → NUTS prefix, budget chip parsing,
 * deadline window). Kept intentionally permissive: an empty/null filters
 * object matches everything.
 */
function tenderMatchesSavedFilters(
  tender: Tender,
  filters: SavedSearchRow['filters'],
): boolean {
  if (!filters) return true;

  // Type
  if (filters.type && filters.type !== 'all' && tender.tender_type !== filters.type) {
    return false;
  }

  // Region (friendly name → NUTS prefix, then `startsWith`).
  if (filters.region && filters.region !== 'Toutes') {
    const prefix = BE_REGION_TO_NUTS[filters.region as BERegion];
    const needle = prefix ?? filters.region;
    const hit =
      (tender.region && tender.region.toUpperCase().startsWith(needle.toUpperCase())) ||
      (tender.nuts_codes ?? []).some((c) =>
        c.toUpperCase().startsWith(needle.toUpperCase()),
      );
    if (!hit) return false;
  }

  // Budget chip (mirrors parseBudgetParam in /api/tenders).
  if (filters.budget && filters.budget !== 'all') {
    const value = tender.estimated_value;
    const plus = filters.budget.match(/^(\d+)\+$/);
    const range = filters.budget.match(/^(\d+)-(\d+)$/);
    if (plus) {
      const min = Number(plus[1]);
      if (value == null || value < min) return false;
    } else if (range) {
      const min = Number(range[1]);
      const max = Number(range[2]);
      if (value == null || value < min || value > max) return false;
    }
  }

  // Deadline window ("week"/"month"/<days>).
  if (filters.deadline && filters.deadline !== 'all') {
    const now = Date.now();
    const days =
      filters.deadline === 'week'
        ? 7
        : filters.deadline === 'month'
          ? 30
          : Number(filters.deadline);
    if (!Number.isNaN(days)) {
      if (!tender.deadline) return false;
      const d = new Date(tender.deadline).getTime();
      if (d < now || d > now + days * 86400_000) return false;
    }
  }

  // Free-text keywords (AND semantics — every keyword must appear).
  if (filters.keywords && filters.keywords.length) {
    const haystack = [
      tender.title,
      tender.description,
      tender.full_text,
      tender.contracting_authority,
    ]
      .join(' ')
      .toLowerCase();
    for (const k of filters.keywords) {
      if (!haystack.includes(k.toLowerCase())) return false;
    }
  }

  return true;
}

/**
 * Saved-search notification phase — run after the profile digest.
 * For each saved search we:
 *   1. Skip if already notified within the last 24h.
 *   2. Check the owner has a live push_subscription (JOIN-ish).
 *   3. Filter fresh tenders through the search's filter payload.
 *   4. If at least one matches, push + stamp last_notified_at.
 * Dead subscriptions (410) null the profile row so the main digest
 * doesn't keep hammering them either.
 */
async function processSavedSearches(
  supabase: SupabaseClient,
  freshTenders: Tender[],
): Promise<{ sent: number; skipped: number; failed: number }> {
  let sent = 0;
  let skipped = 0;
  let failed = 0;

  const { data: searches, error } = await supabase
    .from('saved_searches')
    .select('id, user_id, name, filters, last_notified_at');

  if (error) {
    console.warn('[notify] saved_searches query failed:', error.message);
    return { sent, skipped, failed };
  }

  if (!searches?.length) return { sent, skipped, failed };
  console.log(`[notify] Checking ${searches.length} saved searches…`);

  // Cooldown: 22h so a daily cron that drifts by a few minutes still fires.
  const cooldownMs = 22 * 3600_000;
  const nowMs = Date.now();

  // Cache profile push subscriptions by user_id to avoid N roundtrips.
  const userIds = Array.from(new Set((searches as SavedSearchRow[]).map((s) => s.user_id)));
  const { data: profileRows } = await supabase
    .from('profiles')
    .select('user_id, push_subscription')
    .in('user_id', userIds);

  const pushByUser = new Map<string, PushSubscriptionJSON | null>();
  for (const p of (profileRows ?? []) as {
    user_id: string;
    push_subscription: PushSubscriptionJSON | null;
  }[]) {
    pushByUser.set(p.user_id, p.push_subscription);
  }

  for (const search of searches as SavedSearchRow[]) {
    // Cooldown check.
    if (search.last_notified_at) {
      const last = new Date(search.last_notified_at).getTime();
      if (nowMs - last < cooldownMs) {
        skipped++;
        continue;
      }
    }

    const sub = pushByUser.get(search.user_id);
    if (!sub) {
      skipped++;
      continue;
    }

    const matches = freshTenders.filter((t) =>
      tenderMatchesSavedFilters(t, search.filters),
    );
    if (matches.length === 0) {
      skipped++;
      continue;
    }

    const best = matches[0];
    const payload = {
      title: `Alerte "${search.name}" — ${matches.length} nouveau${
        matches.length > 1 ? 'x marchés' : ' marché'
      }`,
      body: `${best.title.slice(0, 120)}${best.title.length > 120 ? '…' : ''}`,
      url: '/feed',
    };

    let ok = false;
    try {
      ok = await sendPushNotification(sub, payload);
    } catch (err) {
      console.warn(
        `[notify] Saved-search push error (${search.id}):`,
        err instanceof Error ? err.message : err,
      );
      failed++;
      continue;
    }

    if (ok) {
      sent++;
      await supabase
        .from('saved_searches')
        .update({ last_notified_at: new Date().toISOString() })
        .eq('id', search.id);
    } else {
      // 404/410 — subscription dead. Null it on the owner so future runs
      // skip every saved search and the daily digest for this user.
      await supabase
        .from('profiles')
        .update({ push_subscription: null })
        .eq('user_id', search.user_id);
      pushByUser.set(search.user_id, null);
      failed++;
    }
  }

  return { sent, skipped, failed };
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

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const profileRaw of (profiles ?? []) as ProfileWithPush[]) {
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
    `[notify] Digest done. sent=${sent} skipped=${skipped} failed/expired=${failed}`,
  );

  // ---- Saved-search phase ----
  // Run after the main digest so dead subscriptions nulled above
  // propagate to `pushByUser` via the fresh profile lookup.
  const ss = await processSavedSearches(supabase, tenders as Tender[]);
  console.log(
    `[notify] Saved-searches done. sent=${ss.sent} skipped=${ss.skipped} failed/expired=${ss.failed}`,
  );
}

main().catch((err) => {
  console.error('[notify] Fatal error:', err);
  process.exit(1);
});
