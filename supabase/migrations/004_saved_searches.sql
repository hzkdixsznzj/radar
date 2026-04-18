-- ---------------------------------------------------------------------------
-- Migration 004 — Saved searches with push alerts
-- ---------------------------------------------------------------------------
--
-- Lets a user "freeze" a set of feed filters as a named alert. The nightly
-- notify pipeline checks each saved search against fresh tenders and pushes
-- a notification when a new matching tender lands. Example:
--   Name: "HVAC en Hainaut sous 200k"
--   Filters: { type: 'works', region: 'BE32', budget_max: 200000,
--              keywords: ['HVAC', 'chauffage'] }
--
-- Why a dedicated table (vs. array column on profiles): searches are
-- append/delete frequently, and we want per-search notification timestamps
-- so one stale alert doesn't block fresh ones on the same profile.
-- ---------------------------------------------------------------------------

create table if not exists public.saved_searches (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  filters jsonb not null default '{}',
  last_notified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_saved_searches_user on public.saved_searches (user_id);

-- Row-level security: owner-only.
alter table public.saved_searches enable row level security;

drop policy if exists "Users can manage own saved searches" on public.saved_searches;
create policy "Users can manage own saved searches"
  on public.saved_searches
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
