-- ---------------------------------------------------------------------------
-- Migration 007 — Cached PDF spec extraction
-- ---------------------------------------------------------------------------
--
-- Each tender can have at most one "parsed spec" — Claude's structured
-- read of the cahier des charges PDF. Stored as JSONB for flexibility
-- (the schema may evolve) plus a few denormalised columns for cheap
-- filtering ("show me tenders requiring VCA").
--
-- Why on the tenders row, not a separate table:
--   - 1:1 relationship.
--   - Read alongside the tender on every detail-page load.
--   - We cap at one parsed spec per tender — no history needed.
--
-- Cost: a parse call is $0.10-0.50 in Anthropic credits. Cache forever
-- unless documents_url changes; an explicit force-refresh query param
-- lets admins re-run after we tweak the prompt.
-- ---------------------------------------------------------------------------

alter table public.tenders
  add column if not exists parsed_spec jsonb;

-- Denormalised: pull the most-queryable bits out so we can index them.
alter table public.tenders
  add column if not exists parsed_value numeric;

alter table public.tenders
  add column if not exists parsed_certifications text[]
  default '{}';

create index if not exists idx_tenders_parsed_value
  on public.tenders (parsed_value)
  where parsed_value is not null;

create index if not exists idx_tenders_parsed_certifications
  on public.tenders using gin (parsed_certifications)
  where parsed_certifications is not null;

comment on column public.tenders.parsed_spec is
  'Claude-extracted structured data from the tender PDF (cahier des charges). See src/lib/scrapers/parse-pdf.ts for the schema.';
