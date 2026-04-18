// ---------------------------------------------------------------------------
// Belgian region ↔ NUTS mapping
// ---------------------------------------------------------------------------
//
// The UI (onboarding, feed filters, profile form) uses friendly French names
// for Belgian provinces — "Hainaut", "Bruxelles-Capitale", etc. Under the
// hood, both TED and BDA scrapers store the NUTS code returned by the source
// (e.g. "BE323" for Mons-Borinage, "BE100" for Brussels).
//
// For matching and filtering to work we need a translation layer. We map each
// friendly name to its NUTS-2 prefix; any tender whose region starts with
// that prefix belongs to the province.
//
//   "Hainaut"             → "BE32"   (covers BE321 … BE32D)
//   "Bruxelles-Capitale"  → "BE1"    (covers BE100)
//
// Reference: https://ec.europa.eu/eurostat/web/nuts/background
// ---------------------------------------------------------------------------

export const BE_REGIONS = [
  'Bruxelles-Capitale',
  'Brabant wallon',
  'Hainaut',
  'Liège',
  'Luxembourg',
  'Namur',
  'Anvers',
  'Brabant flamand',
  'Flandre occidentale',
  'Flandre orientale',
  'Limbourg',
] as const;

export type BERegion = (typeof BE_REGIONS)[number];

/** Friendly name → NUTS-2 prefix (sub-codes are matched via `startsWith`). */
export const BE_REGION_TO_NUTS: Record<BERegion, string> = {
  'Bruxelles-Capitale': 'BE1',
  'Brabant wallon': 'BE31',
  Hainaut: 'BE32',
  Liège: 'BE33',
  Luxembourg: 'BE34',
  Namur: 'BE35',
  Anvers: 'BE21',
  Limbourg: 'BE22',
  'Flandre orientale': 'BE23',
  'Brabant flamand': 'BE24',
  'Flandre occidentale': 'BE25',
};

/** NUTS-2 prefix → friendly name (reverse of BE_REGION_TO_NUTS). */
export const NUTS_TO_BE_REGION: Record<string, BERegion> = Object.fromEntries(
  Object.entries(BE_REGION_TO_NUTS).map(([name, nuts]) => [nuts, name as BERegion]),
) as Record<string, BERegion>;

/**
 * Convert a list of friendly region names to their NUTS-2 prefixes.
 * Unknown names are silently dropped (so stale profile data doesn't crash).
 */
export function friendlyRegionsToNuts(regions: string[]): string[] {
  const out: string[] = [];
  for (const r of regions) {
    const nuts = BE_REGION_TO_NUTS[r as BERegion];
    if (nuts) out.push(nuts);
  }
  return out;
}

/**
 * Best-effort reverse lookup: given a NUTS code from a tender (e.g. "BE323"),
 * return the friendly province name (e.g. "Hainaut") for display. Falls back
 * to the raw code when unknown.
 */
export function nutsToFriendly(nuts: string): string {
  if (!nuts) return '';
  const upper = nuts.toUpperCase();
  // Try exact then progressively shorter prefixes (BE323 → BE32 → BE3).
  for (let len = Math.min(upper.length, 4); len >= 3; len--) {
    const prefix = upper.slice(0, len);
    const friendly = NUTS_TO_BE_REGION[prefix];
    if (friendly) return friendly;
  }
  return nuts;
}
