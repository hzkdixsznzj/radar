// ---------------------------------------------------------------------------
// POST /api/tenders/[id]/parse-spec
// ---------------------------------------------------------------------------
//
// Trigger a Claude-based PDF extraction for the tender's cahier des
// charges. Lazy on-demand: only fires when a user opens the detail
// page and clicks "Analyser le cahier des charges".
//
// Auth: any logged-in user can trigger (we charge against their plan
// like a regular AI analysis would). Caches forever in
// `tenders.parsed_spec` so the next visitor sees the same result for
// free.
// ---------------------------------------------------------------------------

import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { parsePdfSpec } from '@/lib/scrapers/parse-pdf';
import type { TenderDocument } from '@/lib/scrapers/documents-scraper';
import { resolveTenderDocuments } from '@/lib/scrapers/documents-scraper';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // PDF extraction can be slow

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  // Load the tender + its already-cached parsed_spec, if any.
  const { data: tender, error: readErr } = await supabase
    .from('tenders')
    .select(
      'id, source, documents, documents_url, external_id, parsed_spec',
    )
    .eq('id', id)
    .maybeSingle();

  if (readErr) {
    return NextResponse.json({ error: readErr.message }, { status: 500 });
  }
  if (!tender) {
    return NextResponse.json(
      { error: 'Marché introuvable' },
      { status: 404 },
    );
  }

  // Cached? Return immediately — no AI call.
  if (tender.parsed_spec) {
    return NextResponse.json({ spec: tender.parsed_spec, cached: true });
  }

  // Find a PDF in the tender's documents. Prefer .pdf over other types.
  let pdfUrl: string | null = null;
  const cachedDocs = (tender.documents ?? []) as TenderDocument[];
  let docs = cachedDocs;
  if (docs.length === 0) {
    docs = await resolveTenderDocuments(tender);
    if (docs.length > 0) {
      await supabase
        .from('tenders')
        .update({ documents: docs, updated_at: new Date().toISOString() })
        .eq('id', id);
    }
  }
  for (const d of docs) {
    if (d.type === 'pdf') {
      pdfUrl = d.url;
      break;
    }
  }

  if (!pdfUrl) {
    return NextResponse.json(
      {
        error:
          "Pas de PDF trouvé dans les documents du marché. Le cahier des charges est peut-être derrière une page authentifiée.",
      },
      { status: 404 },
    );
  }

  const spec = await parsePdfSpec(pdfUrl);
  if (!spec) {
    return NextResponse.json(
      {
        error:
          "Impossible d'extraire le PDF. Format non supporté ou contenu indéchiffrable.",
      },
      { status: 502 },
    );
  }

  // Persist result + denormalised columns.
  await supabase
    .from('tenders')
    .update({
      parsed_spec: spec,
      parsed_value: spec.estimated_value_eur ?? null,
      parsed_certifications: spec.required_certifications ?? [],
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  return NextResponse.json({ spec, cached: false });
}
