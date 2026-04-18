// ---------------------------------------------------------------------------
// GET /api/tenders/[id]/documents
// ---------------------------------------------------------------------------
//
// Lazy resolution + caching of document attachments (spec PDFs, annexes)
// for a tender. The nightly cron intentionally doesn't resolve documents
// because it'd add an N+1 HTTP fan-out on top of the main search. This
// endpoint closes that gap: when a user opens /tender/[id], the client
// calls here and we:
//
//   1. Return whatever's already cached in `tenders.documents` if the
//      array is non-empty.
//   2. Otherwise, scrape the publication HTML page via
//      `resolveTenderDocuments`, persist the result, and return it.
//
// Result shape:
//   { documents: TenderDocument[], resolved_at: string }
// ---------------------------------------------------------------------------

import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { resolveTenderDocuments, type TenderDocument } from '@/lib/scrapers/documents-scraper';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();

  // Auth — only logged-in users can trigger resolution (prevents random
  // crawlers from using us as a free proxy to re-fetch BDA).
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  // 1. Read the tender we need to resolve.
  const { data: tender, error: readErr } = await supabase
    .from('tenders')
    .select('id, source, documents_url, external_id, documents')
    .eq('id', id)
    .maybeSingle();

  if (readErr) {
    return NextResponse.json({ error: readErr.message }, { status: 500 });
  }
  if (!tender) {
    return NextResponse.json({ error: 'Marché introuvable' }, { status: 404 });
  }

  const cached = (tender.documents ?? []) as TenderDocument[];
  if (cached.length > 0) {
    return NextResponse.json({ documents: cached, cached: true });
  }

  // 2. No cache — scrape and persist.
  const docs = await resolveTenderDocuments(tender);

  if (docs.length > 0) {
    await supabase
      .from('tenders')
      .update({ documents: docs, updated_at: new Date().toISOString() })
      .eq('id', id);
  }

  return NextResponse.json({ documents: docs, cached: false });
}
