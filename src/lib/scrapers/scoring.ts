import type { Tender, Profile } from '@/types/database';

// ---------------------------------------------------------------------------
// Score weights (must total 100)
// ---------------------------------------------------------------------------
//
// 2026-05-04 rewrite: the previous version used `hits / profile.list.length`
// ratios. With the post-onboarding vocab, profile.keywords routinely contains
// 20–30 FR/NL/EN variants of the same concept ("chauffage", "verwarming",
// "heating", …). A real HVAC tender that says "chauffage" exactly once
// scored 1/25 = 0.04 → 0.6 / 15 pts. Stacking that across all dimensions
// produced a hard ceiling around 35–40 / 100 even for textbook matches and
// made the feed look broken (only one card at score 38, everything else at
// 8). We now use a boolean-OR + boost model: a single hit on a strong
// signal (sector keyword, CPV prefix) earns most of the slot's points,
// extra hits add a small bonus.
// ---------------------------------------------------------------------------

const WEIGHT_SECTOR = 35; // strongest signal — text match on sector vocab keywords
const WEIGHT_CPV = 25; // structured CPV-prefix match
const WEIGHT_REGION = 15;
const WEIGHT_KEYWORD = 15; // user-added custom keywords (on top of sector vocab)
const WEIGHT_BUDGET = 10;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Normalise a string for comparison: lowercase, collapse whitespace. */
function norm(s: string): string {
  return s.toLowerCase().replace(/\s+/g, ' ').trim();
}

/** Check if any needle appears in the haystack (case-insensitive). */
function containsAny(haystack: string, needles: string[]): number {
  if (needles.length === 0) return 0;
  const h = norm(haystack);
  let hits = 0;
  for (const needle of needles) {
    if (h.includes(norm(needle))) hits++;
  }
  return hits;
}

/**
 * Boost-style scoring: at least one hit earns most of the slot's points,
 * extra hits add a smaller bonus, capped at the full weight. Tuned so a
 * tender that mentions a sector keyword once already feels "matched" to
 * the user, while one with three independent hits still ranks higher.
 *
 * @param hits  number of unique vocab entries found in the tender text
 * @param weight total weight of this slot
 */
function boostScore(hits: number, weight: number): number {
  if (hits <= 0) return 0;
  // 1 hit  → 70%   (strong signal — most of the slot)
  // 2 hits → 88%
  // 3 hits → 96%
  // 4+ hits → 100%
  const base = 0.7;
  const bonus = Math.min(hits - 1, 3) * 0.1;
  return Math.min(base + bonus, 1.0) * weight;
}

/**
 * Compare two sets of NUTS codes.
 *  - Exact match (BE328 == BE328) → 1.0
 *  - Province-level match (BE32 vs BE328 or vice-versa) → 0.85
 *  - Country-level match (BE vs BE211) → 0.4 — still some signal: a
 *    Hainaut-only profile shouldn't be punished into oblivion for a
 *    tender published with no specific NUTS.
 *  - No overlap → 0
 */
function nutsOverlap(tenderCodes: string[], profileRegions: string[]): number {
  if (tenderCodes.length === 0 || profileRegions.length === 0) return 0;

  let bestScore = 0;

  for (const tc of tenderCodes) {
    const tcNorm = tc.toUpperCase();
    for (const pr of profileRegions) {
      const prNorm = pr.toUpperCase();

      if (tcNorm === prNorm) {
        bestScore = Math.max(bestScore, 1.0);
        continue;
      }

      // Compute longest shared prefix. BE32 vs BE323 → 4 ("BE32"); BE32 vs
      // BE211 → 2 ("BE"). We score on the SHARED prefix length, not on
      // whether one is a strict prefix of the other — otherwise BE32 vs
      // BE211 (different provinces but both Belgian) would get 0.
      let shared = 0;
      const maxLen = Math.min(tcNorm.length, prNorm.length);
      while (shared < maxLen && tcNorm[shared] === prNorm[shared]) shared++;

      if (shared <= 1) continue;

      let s = 0;
      if (shared === 2) s = 0.4;       // country-level (BE)
      else if (shared === 3) s = 0.7;  // 1-digit Belgian region
      else if (shared === 4) s = 0.85; // province
      else s = 0.95;                   // arrondissement+
      bestScore = Math.max(bestScore, s);
    }
  }

  return bestScore;
}

/**
 * Compare CPV codes between tender and profile.
 *
 * Profile.sectors stores a mix of human labels ("HVAC — Chauffage…") and
 * digit-only CPV prefixes ("45331", "42500", …) injected by
 * `expandSelection()` from the sector vocab. We only care about the digit
 * tokens; the labels are discarded here (text matching uses
 * profile.keywords instead).
 *
 * CPV is hierarchical: 45331100 ⊂ 4533 ⊂ 45 (Construction). The deeper
 * the shared prefix, the tighter the match. A 5-char shared prefix means
 * we're in the same sub-domain (e.g. 45331xx = "Heating, ventilation and
 * air-conditioning installation work"), which is a near-perfect signal,
 * so we promote it to 1.0 instead of the 5/8 = 0.625 it used to get.
 */
function cpvOverlap(tenderCpv: string[], profileSectors: string[]): number {
  if (tenderCpv.length === 0 || profileSectors.length === 0) return 0;

  const profileCpvPatterns: string[] = [];
  for (const s of profileSectors) {
    // Only treat purely numeric tokens as CPV. Labels with embedded
    // numbers ("Plan 2025 IT") would otherwise leak in as false patterns.
    if (/^\d{2,8}$/.test(s.trim())) profileCpvPatterns.push(s.trim());
  }
  if (profileCpvPatterns.length === 0) return 0;

  let bestScore = 0;
  for (const tc of tenderCpv) {
    const tcDigits = tc.replace(/\D/g, '');
    for (const pp of profileCpvPatterns) {
      let shared = 0;
      for (let i = 0; i < Math.min(tcDigits.length, pp.length); i++) {
        if (tcDigits[i] === pp[i]) shared++;
        else break;
      }
      // Calibrated: anything 5+ shared digits is a near-perfect match
      // (sub-sub-category in CPV). 4 = sub-cat, 3 = category, 2 = division.
      let s = 0;
      if (shared >= 5) s = 1.0;
      else if (shared === 4) s = 0.85;
      else if (shared === 3) s = 0.6;
      else if (shared === 2) s = 0.3;
      bestScore = Math.max(bestScore, s);
    }
  }
  return bestScore;
}

// ---------------------------------------------------------------------------
// Budget parsing
// ---------------------------------------------------------------------------

interface BudgetRange {
  min: number;
  max: number;
}

/**
 * Parse budget range strings like "0-100000", "<500000", "100k-1M", etc.
 */
function parseBudgetRange(raw: string): BudgetRange | null {
  const s = raw.replace(/\s/g, '').replace(/€/g, '').toLowerCase();

  // Multiplier helper
  const parseNum = (v: string): number => {
    const n = v.replace(/,/g, '');
    if (n.endsWith('m')) return parseFloat(n) * 1_000_000;
    if (n.endsWith('k')) return parseFloat(n) * 1_000;
    return parseFloat(n);
  };

  // "min-max"
  const rangeMatch = s.match(/^(\d[\d,.]*[km]?)\s*-\s*(\d[\d,.]*[km]?)$/);
  if (rangeMatch) {
    return { min: parseNum(rangeMatch[1]), max: parseNum(rangeMatch[2]) };
  }

  // "<max"
  const ltMatch = s.match(/^<\s*(\d[\d,.]*[km]?)$/);
  if (ltMatch) {
    return { min: 0, max: parseNum(ltMatch[1]) };
  }

  // ">min"
  const gtMatch = s.match(/^>\s*(\d[\d,.]*[km]?)$/);
  if (gtMatch) {
    return { min: parseNum(gtMatch[1]), max: Infinity };
  }

  return null;
}

function budgetFit(estimatedValue: number | null, budgetRanges: string[]): number {
  if (estimatedValue === null || estimatedValue === 0 || budgetRanges.length === 0) {
    return 0.5; // Unknown budget: give partial credit
  }

  for (const raw of budgetRanges) {
    const range = parseBudgetRange(raw);
    if (!range) continue;
    if (estimatedValue >= range.min && estimatedValue <= range.max) {
      return 1.0;
    }
  }

  // Check how close we are to the nearest range
  let closestDistance = Infinity;
  for (const raw of budgetRanges) {
    const range = parseBudgetRange(raw);
    if (!range) continue;
    const mid = range.max === Infinity ? range.min * 2 : (range.min + range.max) / 2;
    const dist = Math.abs(estimatedValue - mid) / Math.max(mid, 1);
    closestDistance = Math.min(closestDistance, dist);
  }

  // Gradual falloff: within 50% of a range center still gets partial credit
  if (closestDistance < 0.5) return 0.5;
  if (closestDistance < 1.0) return 0.25;
  return 0;
}

// ---------------------------------------------------------------------------
// Score breakdown (internal shared computation)
// ---------------------------------------------------------------------------

export interface ScoreBreakdown {
  total: number;
  sector: number;
  region: number;
  cpv: number;
  budget: number;
  keyword: number;
}

/** Shared computation used by both scoreTender() and scoreTenderBreakdown(). */
function computeBreakdown(tender: Tender, profile: Profile): ScoreBreakdown {
  const searchableText = `${tender.title ?? ''} ${tender.description ?? ''} ${
    tender.full_text ?? ''
  }`;

  // ---------------------------------------------------------------------
  // Sector match (35 pts) — text scan against the FR/NL/EN keyword bank
  // injected by the sector vocab during onboarding (`expandSelection`).
  // We deliberately scan profile.keywords here, NOT profile.sectors:
  //   - profile.sectors holds human labels ("HVAC — Chauffage…") and
  //     CPV digit tokens; labels never appear verbatim in tenders, so
  //     text-matching them is dead weight.
  //   - profile.keywords holds the actual searchable vocab ("chauffage",
  //     "verwarming", "HVAC", …) — that's what fires on real tender
  //     titles like "Remplacement du réseau de chauffage".
  // We ALSO scan tender.themes (3-6 short labels generated by Claude at
  // scrape time) so a profile keyword "rénovation" can match a tender
  // tagged "rénovation énergétique" even when the title doesn't say so.
  // ---------------------------------------------------------------------
  const themeText = (
    (tender as Tender & { themes?: string[] }).themes ?? []
  ).join(' · ');
  const sectorScanText = `${searchableText}\n${themeText}`;
  const sectorHits = containsAny(sectorScanText, profile.keywords ?? []);
  const sectorScore = boostScore(sectorHits, WEIGHT_SECTOR);

  // ---------------------------------------------------------------------
  // CPV match (25 pts) — structured prefix overlap.
  // ---------------------------------------------------------------------
  const cpvMatch = cpvOverlap(tender.cpv_codes ?? [], profile.sectors ?? []);
  const cpvScore = cpvMatch * WEIGHT_CPV;

  // ---------------------------------------------------------------------
  // Region match (15 pts).
  // No regions in the profile = treat as "national" — no penalty.
  // ---------------------------------------------------------------------
  let regionScore = 0;
  const profileRegions = profile.regions ?? [];
  if (profileRegions.length === 0) {
    regionScore = WEIGHT_REGION;
  } else {
    const nutsMatch = nutsOverlap(tender.nuts_codes ?? [], profileRegions);
    if (nutsMatch > 0) {
      regionScore = nutsMatch * WEIGHT_REGION;
    } else {
      // Fall back to text-based region matching for legacy rows that only
      // store a region label without populated nuts_codes.
      const regionText = `${tender.region ?? ''} ${(tender.nuts_codes ?? []).join(' ')}`;
      const regionHits = containsAny(regionText, profileRegions);
      regionScore = regionHits > 0 ? WEIGHT_REGION : 0;
    }
  }

  // ---------------------------------------------------------------------
  // Custom keyword match (15 pts) — user-typed keywords on top of the
  // vocab. Already covered by sectorScore for vocab keywords; this slot
  // rewards extra signal from custom additions.
  // ---------------------------------------------------------------------
  // We use the same profile.keywords list — the boost above already covers
  // the multi-hit bonus, so here we treat extra hits as a confidence
  // modifier rather than counting twice. If the user added words like
  // "client école" in a school-supplier profile, they fire here too.
  const keywordHits = containsAny(searchableText, profile.keywords ?? []);
  const keywordScore = boostScore(keywordHits, WEIGHT_KEYWORD);

  // ---------------------------------------------------------------------
  // Budget match (10 pts).
  // ---------------------------------------------------------------------
  const budgetMatch = budgetFit(
    tender.estimated_value,
    profile.budget_ranges ?? [],
  );
  const budgetScore = budgetMatch * WEIGHT_BUDGET;

  const rawTotal =
    sectorScore + regionScore + cpvScore + budgetScore + keywordScore;
  const total = Math.round(Math.min(Math.max(rawTotal, 0), 100));

  return {
    total,
    sector: Math.round(sectorScore),
    region: Math.round(regionScore),
    cpv: Math.round(cpvScore),
    budget: Math.round(budgetScore),
    keyword: Math.round(keywordScore),
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Score a tender's relevance to a user profile.
 *
 * @returns A score between 0 and 100.
 *
 * Breakdown:
 *  - Sector match (title/description vs profile.sectors):   30 pts
 *  - Region match (NUTS / region vs profile.regions):       20 pts
 *  - CPV code relevance:                                    20 pts
 *  - Budget match (estimated_value vs profile.budget_ranges): 15 pts
 *  - Keyword match (profile.keywords in tender text):       15 pts
 *
 * Keyword leak guard: if both sector and CPV scores are 0, the keyword
 * contribution is capped at 50% of its weight (max 7.5 pts instead of 15)
 * to prevent unrelated tenders from ranking high on a single stray
 * keyword match.
 */
export function scoreTender(tender: Tender, profile: Profile): number {
  return computeBreakdown(tender, profile).total;
}

/**
 * Same scoring as `scoreTender()` but returns the per-dimension breakdown
 * for debugging / explainability. Useful to answer "why did this tender
 * score X?" in the UI or in logs.
 */
export function scoreTenderBreakdown(
  tender: Tender,
  profile: Profile,
): ScoreBreakdown {
  return computeBreakdown(tender, profile);
}

/**
 * Secondary-sort comparator for ranking tenders.
 *
 * Primary key: score (descending — higher first).
 * Secondary key: `publication_date` (descending — more recent first) when
 * scores tie.
 *
 * Use with `Array.prototype.sort`:
 *
 *   tenders.sort((a, b) =>
 *     compareTenders(a, b, scores.get(a.id)!, scores.get(b.id)!)
 *   );
 */
export function compareTenders(
  a: Tender,
  b: Tender,
  scoreA: number,
  scoreB: number,
): number {
  if (scoreB !== scoreA) return scoreB - scoreA;

  // Fall back to publication_date; missing dates sort last.
  const ta = a.publication_date ? Date.parse(a.publication_date) : NaN;
  const tb = b.publication_date ? Date.parse(b.publication_date) : NaN;
  const aValid = !Number.isNaN(ta);
  const bValid = !Number.isNaN(tb);
  if (aValid && bValid) return tb - ta;
  if (aValid) return -1;
  if (bValid) return 1;
  return 0;
}
