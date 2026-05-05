// ---------------------------------------------------------------------------
// Theme extraction — pulls 3-6 conceptual themes from a tender's text
// ---------------------------------------------------------------------------
//
// The keyword-based scoring already does well when the tender uses any
// of the FR/NL/EN terms in our sector vocab. It misses tenders that
// describe the same scope with adjacent vocabulary — a tender about
// "isolation thermique de combles" should match an HVAC profile even
// though "isolation" isn't in the HVAC keyword bank.
//
// Approach: at scrape time, ask Claude to compress each tender's
// full_text into 3-6 short themes (FR). These themes are then fed
// alongside the keyword bank into the scoring text matcher. Cheaper
// than embeddings (no provider switch, no pgvector migration) and the
// output is human-readable for debugging and for the UI ("Thèmes :
// rénovation énergétique · isolation · enveloppe bâtiment").
//
// Cost: ~500-1000 input tokens per tender, ~50 output. At Haiku 4.5
// prices that's ~$0.0001 / tender. ~$0.30 / week at current scrape
// volume. Cached on the tender row, never re-extracted unless full_text
// changes meaningfully.
// ---------------------------------------------------------------------------

import Anthropic from '@anthropic-ai/sdk';

const MODEL = 'claude-haiku-4-5'; // cheapest current Haiku
const SYSTEM = `Tu es un classifieur de marchés publics belges. Pour chaque marché, tu génères 3 à 6 thèmes courts (1-3 mots chacun) qui décrivent l'OBJET et le DOMAINE TECHNIQUE du marché. Pas de date, pas de buyer, pas de localisation, pas de procédure.

Renvoie STRICTEMENT un tableau JSON de chaînes en minuscules, en français, sans préambule ni texte hors-objet :
["thème 1", "thème 2", ...]`;

export async function extractThemes(
  fullText: string,
  apiKey: string = process.env.ANTHROPIC_API_KEY ?? '',
): Promise<string[]> {
  if (!apiKey || !fullText || fullText.length < 20) return [];

  // Cap input at ~3K chars — themes don't need more, and keeps cost
  // predictable on tenders with verbose lots.
  const trimmed = fullText.slice(0, 3000);

  const anthropic = new Anthropic({ apiKey });

  let response;
  try {
    response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 200,
      system: SYSTEM,
      messages: [{ role: 'user', content: trimmed }],
    });
  } catch (err) {
    process.stderr.write(
      `[extract-themes] Claude call failed — ${(err as Error).message ?? err}\n`,
    );
    return [];
  }

  const text =
    response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('')
      .trim();

  // Strip ```json fences if present
  const jsonStr = text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/, '')
    .trim();

  try {
    const arr = JSON.parse(jsonStr) as unknown;
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((s): s is string => typeof s === 'string')
      .map((s) => s.trim().toLowerCase())
      .filter((s) => s.length > 0 && s.length < 60)
      .slice(0, 6);
  } catch {
    console.warn('[extract-themes] JSON parse failed:', text.slice(0, 200));
    return [];
  }
}
