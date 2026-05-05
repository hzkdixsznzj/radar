// ---------------------------------------------------------------------------
// PDF spec extraction via Claude
// ---------------------------------------------------------------------------
//
// When a tender's `documents` list resolves to a real PDF URL (cahier
// des charges), we can pull it down and ask Claude to extract the
// structured bits buyers love but BDA leaves out:
//   - Exact estimated value (when stated in the PDF body)
//   - Required certifications (VCA, BS OHSAS, ISO 9001, …)
//   - Key intermediate dates (visite, Q&A, submission)
//   - Free-text scope summary in 2-3 sentences
//
// Cost: typical PDF is 10-50 pages → ~30-150K input tokens. At
// Sonnet 4.7 prices that's ~$0.10-0.50 per PDF. Caching is mandatory
// (we never re-process the same URL).
//
// Auth scope: only logged-in users can trigger this via the API route.
// ---------------------------------------------------------------------------

import Anthropic from '@anthropic-ai/sdk';

const MODEL = 'claude-sonnet-4-5-20250929'; // current production Sonnet
const MAX_PDF_BYTES = 12 * 1024 * 1024; // 12 MB ceiling

export interface ParsedSpec {
  estimated_value_eur: number | null;
  required_certifications: string[];
  key_dates: { label: string; date: string }[];
  scope_summary: string;
  buyer_obligations: string[];
  parsed_at: string;
  source_url: string;
  /** Token cost so we can monitor and cap. */
  usage?: { input_tokens: number; output_tokens: number };
}

const SYSTEM_PROMPT = `Tu es un expert des marchés publics belges. Tu vas analyser un cahier des charges et en extraire les informations structurées clés. Réponds STRICTEMENT en JSON valide, sans préambule ni texte hors-objet.

Schéma de réponse :
{
  "estimated_value_eur": number | null,
  "required_certifications": string[],
  "key_dates": [{"label": string, "date": "YYYY-MM-DD"}],
  "scope_summary": string,
  "buyer_obligations": string[]
}

Règles :
- estimated_value_eur : montant en euros (sans TVA, hors options). Null si non chiffré.
- required_certifications : agréations belges (D, D1, P1...), VCA, ISO, BS OHSAS, etc. Vide si rien d'exigé.
- key_dates : visite obligatoire, séance d'information, date limite des questions, date de remise. Pas la date de publication.
- scope_summary : 2-3 phrases en français, jargon métier autorisé.
- buyer_obligations : 3-5 obligations marquantes pour le soumissionnaire (caution, garantie, références, ...).`;

/**
 * Download a PDF and ask Claude to extract structured spec data.
 *
 * Returns null if:
 *   - The fetch fails (404, timeout, oversized, non-PDF MIME).
 *   - Claude returns malformed JSON.
 */
export async function parsePdfSpec(
  url: string,
  apiKey: string = process.env.ANTHROPIC_API_KEY ?? '',
): Promise<ParsedSpec | null> {
  if (!apiKey) {
    console.warn('[parse-pdf] No ANTHROPIC_API_KEY — skipping.');
    return null;
  }

  // ---- Download ----
  let pdfBytes: ArrayBuffer;
  try {
    const res = await fetch(url, {
      headers: {
        'user-agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36',
      },
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) {
      console.warn(`[parse-pdf] ${url}: HTTP ${res.status}`);
      return null;
    }
    const ct = res.headers.get('content-type') ?? '';
    if (!ct.toLowerCase().includes('pdf')) {
      console.warn(`[parse-pdf] ${url}: not a PDF (content-type=${ct})`);
      return null;
    }
    pdfBytes = await res.arrayBuffer();
    if (pdfBytes.byteLength > MAX_PDF_BYTES) {
      console.warn(
        `[parse-pdf] ${url}: too large (${pdfBytes.byteLength} bytes)`,
      );
      return null;
    }
  } catch (err) {
    console.warn(`[parse-pdf] ${url}: fetch failed —`, err);
    return null;
  }

  // ---- Ask Claude ----
  const anthropic = new Anthropic({ apiKey });
  const base64 = Buffer.from(pdfBytes).toString('base64');

  let response;
  try {
    response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1500,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: base64,
              },
            },
            {
              type: 'text',
              text: 'Extrais les informations structurées de ce cahier des charges et renvoie le JSON.',
            },
          ],
        },
      ],
    });
  } catch (err) {
    console.error(`[parse-pdf] ${url}: Claude call failed —`, err);
    return null;
  }

  // ---- Parse response ----
  const text =
    response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .trim();

  // Claude sometimes wraps the JSON in ```json fences. Strip them.
  const jsonStr = text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/, '')
    .trim();

  try {
    const parsed = JSON.parse(jsonStr) as Omit<
      ParsedSpec,
      'parsed_at' | 'source_url' | 'usage'
    >;
    return {
      estimated_value_eur: parsed.estimated_value_eur ?? null,
      required_certifications: parsed.required_certifications ?? [],
      key_dates: parsed.key_dates ?? [],
      scope_summary: parsed.scope_summary ?? '',
      buyer_obligations: parsed.buyer_obligations ?? [],
      parsed_at: new Date().toISOString(),
      source_url: url,
      usage: {
        input_tokens: response.usage?.input_tokens ?? 0,
        output_tokens: response.usage?.output_tokens ?? 0,
      },
    };
  } catch (err) {
    console.error(`[parse-pdf] ${url}: JSON parse failed —`, err);
    console.error('Raw response:', text.slice(0, 500));
    return null;
  }
}
