// ---------------------------------------------------------------------------
// Best-effort estimated_value extraction from a tender's full_text.
// ---------------------------------------------------------------------------
//
// Both BDA and TED leave `estimated_value` empty in their structured payload
// for the vast majority of notices, but the description body almost always
// includes the figure in some form ("estimée à 250 000 EUR HTVA",
// "geraamd op € 1.200.000", "value of approximately EUR 4.5 million", …).
//
// This is a regex extractor — not LLM, not NER — because:
//   - Runs on every upsert (cheap matters)
//   - Easy to debug / tweak when the BDA tweaks their copy templates
//   - LLM-based extraction can come later as a second pass for the cases
//     this misses
//
// The extractor returns the BEST candidate (highest confidence) when the
// text has multiple amounts. We rank by the surrounding context: an
// "estimé"/"raamd"/"approximate" cue near the number is much more likely
// to be the real budget than a stray "10 000 m²" or "5 ans" mention.
// ---------------------------------------------------------------------------

interface BudgetCandidate {
  amount: number;
  confidence: number; // 0..1
}

const NEAR_KEYWORDS = [
  // FR
  'estim',
  'valeur',
  'budget',
  'montant',
  // NL
  'geram',
  'geschat',
  'bedrag',
  'waarde',
  // EN
  'estimat',
  'value',
  'amount',
  'approximat',
];

const NEGATIVE_KEYWORDS = [
  // We want to suppress numbers that are clearly NOT a budget — pure
  // surface measurements, durations, % thresholds, m², m³, kWh, etc.
  'm²',
  'm2',
  'm³',
  'm3',
  'km',
  'tonne',
  'ton',
  'kwh',
  'mwh',
  '%',
  'pour cent',
  'percent',
  'an',
  'ans',
  'année',
  'mois',
  'jour',
  'kg',
  'litre',
];

/** Parse a money-shaped substring like "1 234 567,89", "1.234.567,89",
 *  "1,234,567.89", "4.5 million", "4,5M". Returns the number or null. */
function parseAmount(raw: string): number | null {
  const s = raw.trim();

  // "4.5 million" / "4,5 million" / "1.2 milliards"
  const millionMatch = s.match(
    /^(\d+(?:[.,]\d+)?)\s*(million|millions|mille|k|m|md|milliard|milliards)$/i,
  );
  if (millionMatch) {
    const base = parseFloat(millionMatch[1].replace(',', '.'));
    const unit = millionMatch[2].toLowerCase();
    if (unit.startsWith('mille') || unit === 'k') return base * 1_000;
    if (unit === 'm' || unit.startsWith('million')) return base * 1_000_000;
    if (unit === 'md' || unit.startsWith('milliard')) return base * 1_000_000_000;
  }

  // "1 234 567,89" or "1.234.567,89" (FR / NL convention)
  const frNl = s.match(/^(\d{1,3}(?:[\s. ]\d{3})*)(?:[,](\d{1,2}))?$/);
  if (frNl) {
    const intPart = frNl[1].replace(/[\s. ]/g, '');
    const fracPart = frNl[2] ?? '';
    const num = parseFloat(intPart + (fracPart ? `.${fracPart}` : ''));
    if (!isNaN(num)) return num;
  }

  // "1,234,567.89" (en convention)
  const en = s.match(/^(\d{1,3}(?:,\d{3})*)(?:\.(\d{1,2}))?$/);
  if (en) {
    const intPart = en[1].replace(/,/g, '');
    const fracPart = en[2] ?? '';
    const num = parseFloat(intPart + (fracPart ? `.${fracPart}` : ''));
    if (!isNaN(num)) return num;
  }

  // Fallback: bare digits with optional decimals
  const bare = s.match(/^(\d+(?:[.,]\d+)?)$/);
  if (bare) return parseFloat(bare[1].replace(',', '.'));

  return null;
}

/**
 * Scan `text` for money-like patterns adjacent to € / EUR markers.
 * Returns the highest-confidence candidate, or null.
 */
export function extractBudget(text: string | null | undefined): number | null {
  if (!text) return null;

  // Regex that captures: number with FR/NL/EN punctuation, optional
  // "million"-style multiplier, then a € / EUR / euros marker. Allows the
  // marker before OR after the number (both forms appear in practice).
  // We grab a bit of leading + trailing context to score confidence.
  const regex =
    /(.{0,40})(?:€|EUR|euros?)\s*([\d][\d\s., ]*(?:million|millions|mille|milliard|milliards|md|m|k)?)|([\d][\d\s., ]*(?:million|millions|mille|milliard|milliards|md|m|k)?)\s*(?:€|EUR|euros?)(.{0,40})/gi;

  const candidates: BudgetCandidate[] = [];
  const lower = text.toLowerCase();

  let m: RegExpExecArray | null;
  while ((m = regex.exec(text)) !== null) {
    let numRaw = m[2] ?? m[3];
    if (!numRaw) continue;
    // Trim sentence-final punctuation that the regex's greedy class
    // can swallow ("€ 1.200.000." → drop trailing ".").
    numRaw = numRaw.replace(/[\s.,]+$/, '');

    const amount = parseAmount(numRaw);
    if (amount === null) continue;

    // Reject obviously bogus values: < 1k or > 10 billion is almost
    // certainly noise (a 1.0 tax rate, an article reference, etc.).
    if (amount < 1_000 || amount > 10_000_000_000) continue;

    // Use 80 chars of context around the match to score confidence.
    const matchStart = m.index;
    const ctxStart = Math.max(0, matchStart - 80);
    const ctxEnd = Math.min(text.length, matchStart + (m[0]?.length ?? 0) + 80);
    const ctx = lower.slice(ctxStart, ctxEnd);

    // Confidence starts at 0.4 for a number-with-currency match.
    let confidence = 0.4;
    // Boost when an "estimated/value/budget" cue is in context.
    for (const k of NEAR_KEYWORDS) {
      if (ctx.includes(k)) {
        confidence += 0.35;
        break;
      }
    }
    // Penalty when surrounded by clearly-not-a-budget cues.
    for (const k of NEGATIVE_KEYWORDS) {
      if (ctx.includes(k)) {
        confidence -= 0.3;
        break;
      }
    }
    // Mild boost for amounts in a sane public-procurement range
    // (10k-50M €) where most BE tenders sit.
    if (amount >= 10_000 && amount <= 50_000_000) confidence += 0.1;

    candidates.push({ amount, confidence });
  }

  if (candidates.length === 0) return null;

  // Return the candidate with the highest confidence. Ties → the
  // larger amount (procurement budgets tend to be the largest figure
  // mentioned in a notice anyway).
  candidates.sort((a, b) => {
    if (b.confidence !== a.confidence) return b.confidence - a.confidence;
    return b.amount - a.amount;
  });
  const best = candidates[0];
  return best.confidence >= 0.5 ? best.amount : null;
}
