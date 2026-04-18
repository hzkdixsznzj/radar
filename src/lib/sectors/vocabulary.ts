// ---------------------------------------------------------------------------
// Sector vocabulary for Belgian public-tender matching
// ---------------------------------------------------------------------------
//
// The onboarding used to let users type arbitrary sector labels like "HVAC"
// or "Plomberie". That sounds flexible but it kills the feed: tender titles
// are in French/Dutch/Belgian-civil-service jargon, and "HVAC" never appears
// literally in a title like "Conduite des installations techniques".
//
// This file defines a curated list of ~30 concrete sectors the user can
// pick from (or suggest custom ones on top). Each sector ships with:
//
//   - `keywords`: FR+NL+EN search terms we auto-inject into profile.keywords
//     so the scoring library's text match actually fires
//   - `cpvPrefixes`: CPV code prefixes (2-5 digits) that we auto-inject into
//     profile.sectors as digits-only tokens, which `cpvOverlap` in
//     `src/lib/scrapers/scoring.ts` can pick up natively
//
// With this, selecting "HVAC / Chauffage-Ventilation-Climatisation" at
// onboarding produces a profile that matches tenders on ALL of:
//   - text: "chauffage", "ventilation", "HVAC", "CVC", "climatisation",
//     "conduite des installations techniques" …
//   - CPV: 45331 (installation), 50720 (maintenance), 42500 (equipment) …
//
// CPV reference: https://simap.ted.europa.eu/cpv (Common Procurement
// Vocabulary, the European standard classification of goods/services).
// ---------------------------------------------------------------------------

export interface Sector {
  /** Stable id (used internally, never shown to user). */
  id: string;
  /** Display label — French, primary UI language. */
  label: string;
  /** Free-text category for grouping in the picker. */
  group: 'Construction & bâtiment' | 'Services techniques' | 'Services aux entreprises' | 'Numérique & IT' | 'Autre';
  /** Auto-injected search terms — FR + NL + EN to match multilingual tenders. */
  keywords: string[];
  /** CPV code prefixes (digits only). 2-5 chars. Scoring does prefix match. */
  cpvPrefixes: string[];
}

export const SECTORS: Sector[] = [
  // --- Construction & bâtiment ---------------------------------------------
  {
    id: 'gros-oeuvre',
    label: 'Gros œuvre & maçonnerie',
    group: 'Construction & bâtiment',
    keywords: [
      'gros œuvre', 'gros oeuvre', 'maçonnerie', 'maconnerie', 'béton', 'beton',
      'fondations', 'ruwbouw', 'metselwerk', 'masonry', 'concrete',
      'construction', 'bâtiment', 'batiment', 'nieuwbouw',
    ],
    cpvPrefixes: ['45200', '45210', '45260', '45262'],
  },
  {
    id: 'toiture',
    label: 'Toiture & couverture',
    group: 'Construction & bâtiment',
    keywords: ['toiture', 'couverture', 'étanchéité', 'zinguerie', 'dakwerken', 'dakbedekking', 'roofing'],
    cpvPrefixes: ['45261'],
  },
  {
    id: 'menuiserie',
    label: 'Menuiserie & châssis',
    group: 'Construction & bâtiment',
    keywords: ['menuiserie', 'châssis', 'chassis', 'fenêtres', 'fenetres', 'portes', 'schrijnwerk', 'ramen', 'deuren', 'joinery'],
    cpvPrefixes: ['45421', '44221'],
  },
  {
    id: 'voirie',
    label: 'Voirie, égouttage & travaux publics',
    group: 'Construction & bâtiment',
    keywords: [
      'voirie', 'voiries', 'égouttage', 'egouttage', 'asphalte', 'tarmac',
      'trottoir', 'wegenwerken', 'riolering', 'road works', 'paving',
    ],
    cpvPrefixes: ['45233', '45232'],
  },
  {
    id: 'demolition',
    label: 'Démolition & désamiantage',
    group: 'Construction & bâtiment',
    keywords: ['démolition', 'demolition', 'désamiantage', 'desamiantage', 'amiante', 'asbest', 'sloop', 'afbraak'],
    cpvPrefixes: ['45111', '45262660'],
  },

  // --- Services techniques --------------------------------------------------
  {
    id: 'hvac',
    label: 'HVAC — Chauffage / Ventilation / Climatisation',
    group: 'Services techniques',
    keywords: [
      'HVAC', 'CVC', 'chauffage', 'ventilation', 'climatisation', 'clim',
      'aéraulique', 'aeraulique', 'chaudière', 'chaudiere', 'verwarming',
      'koeling', 'airco', 'heating', 'cooling',
      'installations techniques', 'conduite des installations',
    ],
    cpvPrefixes: ['45331', '42500', '50720', '50730', '50721'],
  },
  {
    id: 'plomberie',
    label: 'Plomberie & sanitaire',
    group: 'Services techniques',
    keywords: [
      'plomberie', 'sanitaire', 'sanitaires', 'tuyauterie', 'robinetterie',
      'loodgieterij', 'sanitair', 'plumbing',
    ],
    cpvPrefixes: ['45332', '45330'],
  },
  {
    id: 'electricite',
    label: 'Électricité & basse tension',
    group: 'Services techniques',
    keywords: [
      'électricité', 'electricite', 'installations électriques', 'basse tension',
      'courant faible', 'tableau électrique', 'elektriciteit', 'elektrische installatie',
      'electrical', 'câblage', 'cablage',
    ],
    cpvPrefixes: ['45311', '45310', '45315', '31200'],
  },
  {
    id: 'ascenseurs',
    label: 'Ascenseurs & monte-charges',
    group: 'Services techniques',
    keywords: ['ascenseur', 'ascenseurs', 'monte-charge', 'lift', 'liften', 'elevator'],
    cpvPrefixes: ['42416', '45313'],
  },
  {
    id: 'nettoyage',
    label: 'Nettoyage & entretien bâtiment',
    group: 'Services techniques',
    keywords: [
      'nettoyage', 'entretien', 'vitres', 'décontamination', 'decontamination',
      'schoonmaak', 'reiniging', 'cleaning', 'hygiène',
    ],
    cpvPrefixes: ['90910', '90911', '90919'],
  },
  {
    id: 'espaces-verts',
    label: 'Espaces verts & paysagisme',
    group: 'Services techniques',
    keywords: [
      'espaces verts', 'paysagisme', 'élagage', 'elagage', 'tonte', 'plantations',
      'groenonderhoud', 'landschapszorg', 'landscaping', 'horticulture',
    ],
    cpvPrefixes: ['77310', '77311', '77312', '77340'],
  },
  {
    id: 'securite',
    label: 'Sécurité & gardiennage',
    group: 'Services techniques',
    keywords: ['sécurité', 'securite', 'gardiennage', 'surveillance', 'alarme', 'bewaking', 'beveiliging', 'security guard'],
    cpvPrefixes: ['79713', '79714', '79710'],
  },
  {
    id: 'dechets',
    label: 'Gestion des déchets',
    group: 'Services techniques',
    keywords: ['déchets', 'dechets', 'ordures', 'ramassage', 'recyclage', 'afval', 'afvalbeheer', 'waste'],
    cpvPrefixes: ['90500', '90510', '90511', '90512'],
  },

  // --- Services aux entreprises ---------------------------------------------
  {
    id: 'audit-conseil',
    label: 'Audit, conseil & études',
    group: 'Services aux entreprises',
    keywords: ['audit', 'conseil', 'consulting', 'étude', 'etude', 'studie', 'advies'],
    cpvPrefixes: ['79410', '79411', '79412', '79415', '71240'],
  },
  {
    id: 'formation',
    label: 'Formation & enseignement',
    group: 'Services aux entreprises',
    keywords: ['formation', 'enseignement', 'cours', 'opleiding', 'onderwijs', 'training'],
    cpvPrefixes: ['80500', '80510', '80511', '80521'],
  },
  {
    id: 'communication',
    label: 'Communication, événementiel & marketing',
    group: 'Services aux entreprises',
    keywords: ['communication', 'marketing', 'publicité', 'publicite', 'événement', 'evenement', 'communicatie', 'evenement', 'marketing'],
    cpvPrefixes: ['79340', '79341', '79342', '79952'],
  },
  {
    id: 'traduction',
    label: 'Traduction & interprétariat',
    group: 'Services aux entreprises',
    keywords: ['traduction', 'interprétariat', 'interpretariat', 'vertaling', 'tolk', 'translation'],
    cpvPrefixes: ['79530', '79540'],
  },
  {
    id: 'juridique',
    label: 'Services juridiques',
    group: 'Services aux entreprises',
    keywords: ['juridique', 'avocat', 'notaire', 'huissier', 'juridisch', 'advocaat', 'deurwaarder', 'legal services'],
    cpvPrefixes: ['79100', '79110', '79111', '79120'],
  },
  {
    id: 'comptabilite',
    label: 'Comptabilité & finance',
    group: 'Services aux entreprises',
    keywords: ['comptabilité', 'comptabilite', 'expertise comptable', 'boekhouding', 'accountancy', 'audit financier'],
    cpvPrefixes: ['79200', '79210', '79211', '79212'],
  },
  {
    id: 'transport',
    label: 'Transport & logistique',
    group: 'Services aux entreprises',
    keywords: ['transport', 'logistique', 'fret', 'vervoer', 'logistiek', 'freight'],
    cpvPrefixes: ['60100', '60130', '60140', '63100'],
  },

  // --- Numérique & IT -------------------------------------------------------
  {
    id: 'dev-logiciel',
    label: 'Développement logiciel & web',
    group: 'Numérique & IT',
    keywords: [
      'développement', 'developpement', 'logiciel', 'application', 'site web',
      'ontwikkeling', 'software', 'web', 'api', 'intégration', 'integration',
    ],
    cpvPrefixes: ['72200', '72210', '72230', '72240', '72260', '72261'],
  },
  {
    id: 'infra-cloud',
    label: 'Infrastructure IT & cloud',
    group: 'Numérique & IT',
    keywords: ['infrastructure', 'cloud', 'serveur', 'hébergement', 'hebergement', 'réseau', 'reseau', 'hosting', 'servers', 'network'],
    cpvPrefixes: ['72300', '72310', '72311', '72600', '72700'],
  },
  {
    id: 'cybersecurite',
    label: 'Cybersécurité',
    group: 'Numérique & IT',
    keywords: ['cybersécurité', 'cybersecurite', 'sécurité informatique', 'pentest', 'audit sécurité', 'cyberveiligheid', 'cybersecurity'],
    cpvPrefixes: ['72500', '72510', '72513', '79417'],
  },
  {
    id: 'data-ia',
    label: 'Data, BI & intelligence artificielle',
    group: 'Numérique & IT',
    keywords: ['data', 'business intelligence', 'BI', 'analytics', 'intelligence artificielle', 'IA', 'machine learning', 'AI', 'big data'],
    cpvPrefixes: ['72300', '72320', '72330'],
  },
  {
    id: 'materiel-info',
    label: 'Matériel informatique',
    group: 'Numérique & IT',
    keywords: ['matériel informatique', 'ordinateur', 'laptop', 'PC', 'imprimante', 'computerapparatuur', 'hardware'],
    cpvPrefixes: ['30200', '30210', '30230', '30232'],
  },

  // --- Autre ----------------------------------------------------------------
  {
    id: 'fournitures-bureau',
    label: 'Fournitures de bureau',
    group: 'Autre',
    keywords: ['fournitures', 'papeterie', 'bureau', 'kantoorbenodigdheden', 'office supplies'],
    cpvPrefixes: ['30190', '30192'],
  },
  {
    id: 'vehicules',
    label: 'Véhicules & flotte',
    group: 'Autre',
    keywords: ['véhicule', 'vehicule', 'voiture', 'camion', 'utilitaire', 'voertuig', 'vrachtwagen', 'vehicle'],
    cpvPrefixes: ['34100', '34110', '34130', '34140'],
  },
  {
    id: 'medical',
    label: 'Matériel médical & santé',
    group: 'Autre',
    keywords: ['médical', 'medical', 'hôpital', 'hopital', 'santé', 'echographe', 'medisch', 'gezondheid', 'ziekenhuis'],
    cpvPrefixes: ['33100', '33140', '33150', '33160', '33190'],
  },
  {
    id: 'textile',
    label: 'Textile & vêtements professionnels',
    group: 'Autre',
    keywords: ['textile', 'vêtement', 'vetement', 'uniforme', 'EPI', 'kleding', 'uniform', 'clothing'],
    cpvPrefixes: ['18100', '18110', '18200', '18800'],
  },
];

/** Map of sector id → Sector for quick lookup. */
export const SECTORS_BY_ID: Record<string, Sector> = Object.fromEntries(
  SECTORS.map((s) => [s.id, s]),
);

/** Sectors grouped by display group, preserving declaration order. */
export function sectorsByGroup(): Record<string, Sector[]> {
  const out: Record<string, Sector[]> = {};
  for (const s of SECTORS) {
    (out[s.group] ??= []).push(s);
  }
  return out;
}

/**
 * Given a list of sector ids (from onboarding), produce the derived
 * `profile.sectors` and `profile.keywords` values that should be persisted.
 *
 * `profile.sectors` contains human-readable labels AND the CPV prefix tokens
 * — the scoring lib picks out digit runs from sector strings for CPV match.
 *
 * `profile.keywords` contains all auto-generated FR/NL/EN keywords from the
 * selected sectors, deduplicated, so the text matcher has good coverage.
 */
export function expandSelection(sectorIds: string[]): {
  sectors: string[];
  keywords: string[];
} {
  const sectorLabels: string[] = [];
  const cpvTokens = new Set<string>();
  const keywords = new Set<string>();

  for (const id of sectorIds) {
    const s = SECTORS_BY_ID[id];
    if (!s) continue;
    sectorLabels.push(s.label);
    for (const prefix of s.cpvPrefixes) cpvTokens.add(prefix);
    for (const kw of s.keywords) keywords.add(kw);
  }

  // Include CPV prefix tokens in `sectors` so scoring.cpvOverlap picks them up.
  const sectors = [...sectorLabels, ...Array.from(cpvTokens)];
  return { sectors, keywords: Array.from(keywords) };
}
