// ---------------------------------------------------------------------------
// KBO / BCE — Belgian company-registry lookup by VAT number
// ---------------------------------------------------------------------------
//
// The official BCE (Banque Carrefour des Entreprises) only publishes company
// data as a downloadable ZIP. For an on-demand single-VAT lookup we hit the
// public-facing KBO search page and parse the HTML. The page is stable — it
// has served the same DOM shape for years — but because any scrape is brittle
// by nature, we keep the parser small, defensive, and wrapped in a single
// try/catch.
//
// Endpoint:
//   https://kbopub.economie.fgov.be/kbopub/toonondernemingps.html
//     ?lang=fr&ondernemingsnummer=<10-digit-VAT>
//
// Success response:
//   {
//     ok: true,
//     vat: "0123456789",
//     company_name: "DUPONT CONSTRUCTION SA",
//     address: "Rue de la Meuse 12, 1000 Bruxelles",
//     status: "Actif",
//     activities: ["Construction générale de bâtiments", ...],
//     nace_codes: ["41.201", "43.21"],
//   }
//
// Failure:
//   { ok: false, error: "not-found" | "invalid-vat" | "fetch-failed" }
// ---------------------------------------------------------------------------

/**
 * Normalise a VAT / ondernemingsnummer into the 10-digit form KBO expects.
 * Accepts "BE0123.456.789", "0123.456.789", "0123456789", "BE 0123 456 789".
 * Returns null if we can't reduce the input to exactly 10 digits.
 */
export function normalizeVat(raw: string): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 9) return `0${digits}`; // Legacy pre-2005 9-digit form.
  if (digits.length === 10) return digits;
  return null;
}

export interface KboCompany {
  ok: true;
  vat: string;
  company_name: string;
  address: string;
  status: string;
  activities: string[];
  nace_codes: string[];
}

export interface KboFailure {
  ok: false;
  error: 'invalid-vat' | 'not-found' | 'fetch-failed';
}

export type KboResult = KboCompany | KboFailure;

const KBO_URL =
  'https://kbopub.economie.fgov.be/kbopub/toonondernemingps.html';

/**
 * Fetch and parse the KBO public page for a single VAT number.
 *
 * Designed to be called server-side only — we don't want to leak scraping
 * through the browser (CORS-blocked anyway) and we want one place to
 * centralise retries / timeouts.
 */
export async function lookupKbo(rawVat: string): Promise<KboResult> {
  const vat = normalizeVat(rawVat);
  if (!vat) return { ok: false, error: 'invalid-vat' };

  const url = `${KBO_URL}?lang=fr&ondernemingsnummer=${vat}`;
  let html: string;
  try {
    const res = await fetch(url, {
      headers: {
        // KBO blocks obvious bots; a vanilla browser UA keeps us clear.
        'user-agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36',
        accept: 'text/html',
        'accept-language': 'fr-BE,fr;q=0.9',
      },
      // 8-second budget — KBO's page normally responds in <1s.
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return { ok: false, error: 'fetch-failed' };
    html = await res.text();
  } catch {
    return { ok: false, error: 'fetch-failed' };
  }

  // "onderneming niet gevonden" / "entreprise inconnue" — KBO serves the
  // same chrome, so we detect the absence of the main record section.
  if (/Numéro d.entreprise inconnu|onbekend ondernemingsnummer/i.test(html)) {
    return { ok: false, error: 'not-found' };
  }

  try {
    const company_name = extractAfterLabel(html, [
      'Dénomination',
      'Denominatie',
      'Name',
    ]);
    const status = extractAfterLabel(html, ['Statut', 'Status', 'État']);
    const address = extractAfterLabel(html, [
      'Adresse du siège',
      'Adresse',
      'Adres',
    ]);

    // Activities block — each activity line tends to look like
    // "NACEBEL 2008 41.201 - Construction générale de bâtiments résidentiels"
    // Grab every 3–6-digit NACE code and its trailing label.
    const activities: string[] = [];
    const naceCodes: string[] = [];
    const naceRegex =
      /NACEBEL[^0-9A-Z]*(\d{2,3}(?:\.\d{1,3})?)[^A-Za-z<]*([^<\n]{3,160})/g;
    let m: RegExpExecArray | null;
    while ((m = naceRegex.exec(html)) !== null) {
      const code = m[1].trim();
      const label = decodeEntities(m[2].trim()).replace(/\s+/g, ' ');
      if (!naceCodes.includes(code)) naceCodes.push(code);
      if (label && !activities.includes(label)) activities.push(label);
    }

    return {
      ok: true,
      vat,
      company_name: company_name || '',
      address: address || '',
      status: status || '',
      activities,
      nace_codes: naceCodes,
    };
  } catch {
    return { ok: false, error: 'fetch-failed' };
  }
}

// ---- HTML helpers ----------------------------------------------------------

/**
 * KBO's HTML is table-row-ish: `<td>Label</td><td>Value ...</td>`. Rather
 * than bringing in a full HTML parser, we match on each known French/Dutch
 * label and grab the text up to the next tag.
 */
function extractAfterLabel(html: string, labels: string[]): string {
  for (const label of labels) {
    const esc = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(
      `${esc}\\s*(?:<[^>]+>\\s*)*([^<]{2,200})`,
      'i',
    );
    const m = html.match(re);
    if (m && m[1].trim()) {
      return decodeEntities(m[1].trim().replace(/\s+/g, ' '));
    }
  }
  return '';
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&eacute;/g, 'é')
    .replace(/&egrave;/g, 'è')
    .replace(/&agrave;/g, 'à')
    .replace(/&ccedil;/g, 'ç');
}

// ---- NACE → sector mapping -------------------------------------------------

/**
 * Best-effort guess of our internal sector IDs from a list of NACE codes.
 * Used to pre-seed onboarding's sector picker when the user types their
 * VAT. We err on the side of over-suggesting: the user still confirms.
 *
 * The prefix list is small and curated — it covers the NACE sections we
 * see most often in BE public procurement bids, not the full ~700-code
 * NACEBEL tree.
 */
const NACE_TO_SECTOR: { prefix: string; sector: string }[] = [
  // 41-43: construction (matches src/lib/sectors/vocabulary.ts)
  { prefix: '41', sector: 'gros-oeuvre' },
  { prefix: '42', sector: 'voirie' },
  { prefix: '43.11', sector: 'demolition' },
  { prefix: '43.12', sector: 'voirie' },
  { prefix: '43.2', sector: 'electricite' },
  { prefix: '43.22', sector: 'plomberie' },
  { prefix: '43.3', sector: 'menuiserie' },
  { prefix: '43', sector: 'gros-oeuvre' },
  // 62-63: IT
  { prefix: '62.01', sector: 'dev-logiciel' },
  { prefix: '62.02', sector: 'infra-cloud' },
  { prefix: '62.03', sector: 'infra-cloud' },
  { prefix: '62.09', sector: 'dev-logiciel' },
  { prefix: '62', sector: 'dev-logiciel' },
  { prefix: '63', sector: 'data-ia' },
  // 70, 73-74: conseil / com
  { prefix: '70', sector: 'audit-conseil' },
  { prefix: '73', sector: 'communication' },
  { prefix: '74.3', sector: 'traduction' },
  { prefix: '74', sector: 'audit-conseil' },
  // 81: nettoyage & espaces verts
  { prefix: '81.2', sector: 'nettoyage' },
  { prefix: '81.3', sector: 'espaces-verts' },
  { prefix: '81', sector: 'nettoyage' },
  // 80: sécurité
  { prefix: '80', sector: 'securite' },
  // 49-53: transport
  { prefix: '49', sector: 'transport' },
  { prefix: '52', sector: 'transport' },
  { prefix: '53', sector: 'transport' },
  // 86-87: médical
  { prefix: '86', sector: 'medical' },
  { prefix: '87', sector: 'medical' },
  // 38-39: déchets
  { prefix: '38', sector: 'dechets' },
  { prefix: '39', sector: 'dechets' },
  // 85: formation
  { prefix: '85', sector: 'formation' },
  // 69: juridique / comptable
  { prefix: '69.1', sector: 'juridique' },
  { prefix: '69.2', sector: 'comptabilite' },
  { prefix: '69', sector: 'juridique' },
  // 28-33: matériel informatique
  { prefix: '26.20', sector: 'materiel-info' },
  { prefix: '46.5', sector: 'materiel-info' },
  // 14: textile
  { prefix: '13', sector: 'textile' },
  { prefix: '14', sector: 'textile' },
];

/**
 * Suggest internal sector IDs from an array of NACE codes.
 * Deduplicated, ordered by first-match.
 */
export function suggestSectorsFromNace(naceCodes: string[]): string[] {
  const out: string[] = [];
  for (const code of naceCodes) {
    for (const { prefix, sector } of NACE_TO_SECTOR) {
      if (code.startsWith(prefix) && !out.includes(sector)) {
        out.push(sector);
        break;
      }
    }
  }
  return out;
}
