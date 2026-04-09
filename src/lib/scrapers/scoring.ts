import type { Tender, Profile } from '@/types/database';

// ---------------------------------------------------------------------------
// Score weights (must total 100)
// ---------------------------------------------------------------------------

const WEIGHT_SECTOR = 30;
const WEIGHT_REGION = 20;
const WEIGHT_CPV = 20;
const WEIGHT_BUDGET = 15;
const WEIGHT_KEYWORD = 15;

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
 * Compare two sets of NUTS codes. Returns 1.0 for exact match,
 * partial credit for prefix overlap (e.g. BE2 matches BE21).
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
      } else if (tcNorm.startsWith(prNorm) || prNorm.startsWith(tcNorm)) {
        // Partial: the shorter is a prefix of the longer
        const overlap = Math.min(tcNorm.length, prNorm.length);
        const longer = Math.max(tcNorm.length, prNorm.length);
        bestScore = Math.max(bestScore, overlap / longer);
      }
    }
  }

  return bestScore;
}

/**
 * Compare CPV codes. Returns a 0-1 ratio based on matching depth.
 * CPV codes are 8-digit (e.g. 45000000). More shared leading digits = higher match.
 */
function cpvOverlap(tenderCpv: string[], profileSectors: string[]): number {
  if (tenderCpv.length === 0 || profileSectors.length === 0) return 0;

  // Extract any CPV-like patterns from profile sectors (digits, 8+ chars)
  const profileCpvPatterns: string[] = [];
  for (const s of profileSectors) {
    const matches = s.match(/\d{2,8}/g);
    if (matches) profileCpvPatterns.push(...matches);
  }

  if (profileCpvPatterns.length === 0) return 0;

  let bestScore = 0;

  for (const tc of tenderCpv) {
    const tcDigits = tc.replace(/\D/g, '');
    for (const pp of profileCpvPatterns) {
      // Find length of shared prefix
      let shared = 0;
      for (let i = 0; i < Math.min(tcDigits.length, pp.length); i++) {
        if (tcDigits[i] === pp[i]) shared++;
        else break;
      }
      if (shared >= 2) {
        bestScore = Math.max(bestScore, shared / 8); // 8 = full CPV length
      }
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
// Main scoring function
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
 */
export function scoreTender(tender: Tender, profile: Profile): number {
  const searchableText = `${tender.title} ${tender.description} ${tender.full_text}`;

  // --- Sector match (30 pts) ---
  const sectorHits = containsAny(searchableText, profile.sectors);
  const sectorRatio = profile.sectors.length > 0
    ? Math.min(sectorHits / profile.sectors.length, 1.0)
    : 0;
  const sectorScore = sectorRatio * WEIGHT_SECTOR;

  // --- Region match (20 pts) ---
  // Check NUTS codes first, fall back to region text matching
  let regionScore = 0;
  const nutsMatch = nutsOverlap(tender.nuts_codes, profile.regions);
  if (nutsMatch > 0) {
    regionScore = nutsMatch * WEIGHT_REGION;
  } else {
    // Fall back to text-based region matching
    const regionText = `${tender.region} ${tender.nuts_codes.join(' ')}`;
    const regionHits = containsAny(regionText, profile.regions);
    const regionRatio = profile.regions.length > 0
      ? Math.min(regionHits / profile.regions.length, 1.0)
      : 0;
    regionScore = regionRatio * WEIGHT_REGION;
  }

  // --- CPV code relevance (20 pts) ---
  const cpvMatch = cpvOverlap(tender.cpv_codes, profile.sectors);
  const cpvScore = cpvMatch * WEIGHT_CPV;

  // --- Budget match (15 pts) ---
  const budgetMatch = budgetFit(tender.estimated_value, profile.budget_ranges);
  const budgetScore = budgetMatch * WEIGHT_BUDGET;

  // --- Keyword match (15 pts) ---
  const keywordHits = containsAny(searchableText, profile.keywords);
  const keywordRatio = profile.keywords.length > 0
    ? Math.min(keywordHits / profile.keywords.length, 1.0)
    : 0;
  const keywordScore = keywordRatio * WEIGHT_KEYWORD;

  const total = sectorScore + regionScore + cpvScore + budgetScore + keywordScore;
  return Math.round(Math.min(Math.max(total, 0), 100));
}
