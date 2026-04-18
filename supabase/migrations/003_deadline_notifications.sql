-- ---------------------------------------------------------------------------
-- Migration 003 — Deadline-at-risk push notifications
-- ---------------------------------------------------------------------------
--
-- Adds a `deadline_notified_at` column on saved_tenders so the nightly
-- `scripts/deadline-notify.ts` pipeline can send a single "deadline
-- approaching" push per saved tender (typically 72h before the deadline).
--
-- Why per saved_tender (not per profile): a user may have 10 saved
-- tenders each approaching a different deadline — we want to notify for
-- each one once, not globally throttle all of them behind a single
-- per-user timestamp.
-- ---------------------------------------------------------------------------

alter table public.saved_tenders
  add column if not exists deadline_notified_at timestamptz;
