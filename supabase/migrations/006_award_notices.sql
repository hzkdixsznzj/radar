-- ---------------------------------------------------------------------------
-- Migration 006 — Award notices (marchés attribués)
-- ---------------------------------------------------------------------------
--
-- Public buyers publish two kinds of notices:
--   1. The opportunity itself (call for offers) — what we already capture.
--   2. The award notice once a contract is awarded, with the winner name
--      and final price. Massive competitive intel: a Hainaut HVAC SME can
--      see who won the last 20 HVAC tenders in their area, at what price,
--      who they're up against on bid-day.
--
-- Schema choice: extend the `tenders` table rather than create an `awards`
-- table. Rationale: the BDA returns award notices in the same search
-- response, just with a different `noticeSubType` (E5/E6 = award). They
-- share 90% of the columns (title, buyer, region, CPV, dates) and we
-- want them to appear in the same feed surface, just with a different
-- visual treatment.
--
-- Linkage: `awards_for` (uuid, FK to tenders.id) lets us connect an
-- award notice to its original opportunity when both are scraped. NULL
-- when we couldn't find the original (it was published before we started
-- scraping, or under a different reference).
-- ---------------------------------------------------------------------------

alter table public.tenders
  add column if not exists notice_kind text not null default 'opportunity'
    check (notice_kind in ('opportunity', 'award', 'prior_info', 'modification'));

alter table public.tenders
  add column if not exists awards_for uuid references public.tenders(id) on delete set null;

alter table public.tenders
  add column if not exists awarded_to text;

alter table public.tenders
  add column if not exists awarded_value numeric;

alter table public.tenders
  add column if not exists awarded_at date;

create index if not exists idx_tenders_notice_kind
  on public.tenders (notice_kind, status);

create index if not exists idx_tenders_awards_for
  on public.tenders (awards_for)
  where awards_for is not null;

-- The default feed should NOT show award notices alongside live
-- opportunities. Callers that want awards (the per-tender detail page,
-- the "competitive intel" tab) should query notice_kind='award' explicitly.
comment on column public.tenders.notice_kind is
  $$BDA / TED publish multiple notice types per procedure. We tag them
  here so the feed can default to opportunities only while letting
  detail pages surface the award follow-up$$;
