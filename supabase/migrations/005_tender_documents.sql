-- ---------------------------------------------------------------------------
-- Migration 005 — Tender documents column
-- ---------------------------------------------------------------------------
--
-- The tender-list scrapers (TED, BDA) pull headline metadata — title, CPV,
-- buyer, deadline. The actual cahier des charges (spec PDF) and annexes
-- live one click away on the publication HTML page. Rather than eagerly
-- scraping every detail page on every cron run (expensive and flaky), we
-- resolve documents lazily when a user opens /tender/[id] and cache the
-- result in this column.
--
-- Shape of `documents`:
--   [
--     { "label": "Cahier des charges.pdf", "url": "https://...", "type": "pdf" },
--     { "label": "Annexe technique.docx",  "url": "https://...", "type": "docx" }
--   ]
--
-- Writes come from the service role (API route /api/tenders/[id]/documents).
-- No RLS change needed — tenders are world-readable by design.
-- ---------------------------------------------------------------------------

alter table public.tenders
  add column if not exists documents jsonb not null default '[]'::jsonb;

-- Partial index so we can cheaply skip tenders that already have docs
-- resolved (common case after steady state). Use `jsonb_array_length` so
-- zero-length arrays still count as "pending resolution".
create index if not exists idx_tenders_documents_pending
  on public.tenders ((jsonb_array_length(documents)))
  where jsonb_array_length(documents) = 0;
