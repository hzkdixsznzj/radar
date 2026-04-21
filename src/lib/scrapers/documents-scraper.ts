// ---------------------------------------------------------------------------
// Tender-document discovery scraper
// ---------------------------------------------------------------------------
//
// The main tender scrapers (TED, BDA) pull headline metadata only — the
// actual spec PDFs and annexes live behind one extra click on the source
// publication page. This module resolves those attachment links on
// demand, caching the result in `tenders.documents`.
//
// Why separate from the main scrapers:
// - Document resolution is N+1 and slow; we don't want it blocking the
//   nightly cron that already moves thousands of publication rows.
// - Users typically only open a handful of tenders per session. Lazy
//   resolution on /tender/[id] keeps bandwidth bounded.
//
// Two source patterns are supported:
// - BDA (publicprocurement.be): publication workspace page has
//   `<a href="/bda/download/...">` links pointing at the vault endpoints.
// - TED (ted.europa.eu): notice page has `a[data-testid="document-link"]`
//   pointing at static PDFs on europa.eu.
// ---------------------------------------------------------------------------

import type { Tender } from '@/types/database';

export interface TenderDocument {
  /** Filename or user-visible label. */
  label: string;
  /** Direct download URL. */
  url: string;
  /** Lowercased extension ("pdf", "docx", "zip", "xlsx", ...). */
  type: string;
}

const DOC_EXT = /\.(pdf|docx?|xlsx?|pptx?|zip|odt|ods|txt|csv)(\?[^"'<>\s]*)?$/i;

/**
 * Fetch a URL with a realistic browser UA. Short timeout so a dead source
 * can't hang an API route. Returns null on any failure.
 */
async function fetchHtml(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        'user-agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36',
        accept: 'text/html',
        'accept-language': 'fr-BE,fr;q=0.9,nl;q=0.8,en;q=0.7',
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

/**
 * Extract <a href="..."> links whose target looks like a document. Works
 * by iterating over every `<a>` tag in the HTML, pulling its href + text,
 * and keeping only those whose href matches DOC_EXT or whose anchor text
 * ends with a known extension.
 */
function extractDocumentLinks(
  html: string,
  baseUrl: string,
): TenderDocument[] {
  const out: TenderDocument[] = [];
  const seen = new Set<string>();

  const anchorRe = /<a\s+[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = anchorRe.exec(html)) !== null) {
    const rawHref = m[1].trim();
    const rawLabel = m[2]
      .replace(/<[^>]+>/g, '') // strip inner tags
      .trim();

    if (!rawHref) continue;
    const extMatch = DOC_EXT.exec(rawHref) ?? DOC_EXT.exec(rawLabel);
    if (!extMatch) continue;

    let absolute: string;
    try {
      absolute = new URL(rawHref, baseUrl).toString();
    } catch {
      continue;
    }
    if (seen.has(absolute)) continue;
    seen.add(absolute);

    const label = decodeEntities(rawLabel) || absolute.split('/').pop() || 'Document';
    const type = extMatch[1].toLowerCase().replace(/^doc$/, 'doc').replace(/^xls$/, 'xls');

    out.push({ label, url: absolute, type });
  }
  return out;
}

/**
 * Main entry point. Given a tender, figure out which source's publication
 * page to fetch, scrape the document links, and return them. Empty array
 * if we couldn't resolve any — callers should treat that as a normal
 * "no attachments" state rather than an error.
 *
 * Reality check on what we can / cannot scrape today:
 *   - BDA (publicprocurement.be) switched to a Vue SPA — the landing HTML
 *     contains only `<div id="app"></div>`. Actual publication details
 *     load via REST endpoints under /api/sea that require auth.
 *   - TED v2 portal is a React widget under a Liferay shell — same story,
 *     the document anchors are injected by JS after initial render.
 *
 * For both cases, a server-side fetch gives us an empty shell. Until we
 * wire up either (a) a headless Chrome renderer or (b) authenticated API
 * access, we fall back to a single "Open the publication page" pseudo-
 * document. That's still useful in the UI — the user gets one click to
 * the official source instead of a dead "no documents" state.
 */
export async function resolveTenderDocuments(
  tender: Pick<Tender, 'source' | 'documents_url' | 'external_id'>,
): Promise<TenderDocument[]> {
  const pageUrl = tender.documents_url;
  if (!pageUrl) return [];

  const html = await fetchHtml(pageUrl);

  // Detect SPA-only shells early. Both BDA (Vue) and TED v2 (React widget)
  // ship an otherwise empty landing page; running the anchor regex on
  // those is a waste.
  const isSpaShell =
    !html ||
    html.length < 4000 ||
    /<div[^>]+id=["']app["']/.test(html) ||
    /ted-v2-react-widget/i.test(html);

  if (!isSpaShell && html) {
    const docs = extractDocumentLinks(html, pageUrl);
    if (docs.length > 0) return docs.slice(0, 30);
  }

  // Fallback — link the user straight to the source publication. Labelled
  // and typed as "link" so the UI can render it with an external-link
  // icon instead of a download icon.
  return [
    {
      label:
        tender.source === 'ted'
          ? "Voir l'annonce sur TED"
          : 'Voir la publication sur BDA',
      url: pageUrl,
      type: 'link',
    },
  ];
}
