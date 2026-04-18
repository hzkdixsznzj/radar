-- ---------------------------------------------------------------------------
-- Migration 002 — Web push notifications
-- ---------------------------------------------------------------------------
--
-- Adds a `push_subscription` JSONB column on profiles so the nightly
-- `scripts/notify.ts` pipeline can send daily digest push notifications
-- about high-relevance tenders to subscribed users.
--
-- The subscription JSON follows the shape returned by
-- `PushSubscription.toJSON()` in the browser:
--   { endpoint: string, keys: { p256dh: string, auth: string }, ... }
--
-- When a send returns 404/410 (subscription expired / user revoked), the
-- notify script NULLs the column so we stop retrying.
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column if not exists push_subscription jsonb;

-- Tracks when a user last received a daily push so we don't double-notify
-- if the pipeline runs twice in a day (manual trigger + schedule).
alter table public.profiles
  add column if not exists last_push_sent_at timestamptz;

-- Users need to be able to update their own push_subscription from the
-- client. The existing `Users can update own profile` policy already
-- covers this (it checks auth.uid() = user_id), so no new policy needed.
