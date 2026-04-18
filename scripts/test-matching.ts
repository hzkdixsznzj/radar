/**
 * Personalization test harness.
 *
 * Feeds a shared pool of realistic Belgian public-procurement tenders through
 * the REAL scoring function (src/lib/scrapers/scoring.ts), for three
 * deliberately different client personas. Prints each persona's top-ranked
 * tenders to demonstrate that the same pool produces very different results.
 *
 * Run:  npx tsx scripts/test-matching.ts
 */

import { scoreTender } from '../src/lib/scrapers/scoring';
import type { Tender, Profile } from '../src/types/database';

// ---------------------------------------------------------------------------
// Realistic tender pool — 12 Belgian markets across sectors/regions/budgets
// CPV source: EU Common Procurement Vocabulary
// NUTS codes: BE10 Brussels, BE2x Flanders, BE3x Wallonia
// ---------------------------------------------------------------------------

const NOW = new Date().toISOString();

function makeTender(
  id: string,
  title: string,
  description: string,
  type: Tender['tender_type'],
  cpv: string[],
  nuts: string[],
  region: string,
  value: number | null,
  authority: string,
): Tender {
  return {
    id,
    source: 'be_bulletin',
    external_id: id,
    title,
    description,
    contracting_authority: authority,
    tender_type: type,
    cpv_codes: cpv,
    nuts_codes: nuts,
    region,
    publication_date: NOW,
    deadline: NOW,
    estimated_value: value,
    currency: 'EUR',
    status: 'open',
    full_text: `${title}. ${description}`,
    documents_url: null,
    created_at: NOW,
    updated_at: NOW,
  };
}

const TENDERS: Tender[] = [
  // --- Construction / works ---
  makeTender(
    'T01',
    'Rénovation de la toiture de l\'école communale de Namur',
    'Travaux de couverture, isolation thermique et zinguerie sur bâtiment scolaire. Surface ~1200m². Marché de travaux soumis aux règles de la construction. Agrément D1 classe 3 requis.',
    'works',
    ['45261000', '45321000'],
    ['BE35'],
    'Wallonie',
    380000,
    'Ville de Namur',
  ),
  makeTender(
    'T02',
    'Construction d\'une crèche à Molenbeek',
    'Construction d\'un bâtiment neuf de 600m² destiné à accueillir 48 enfants. Gros œuvre, menuiseries, techniques spéciales. Agrément D classe 5.',
    'works',
    ['45214100', '45000000'],
    ['BE10'],
    'Bruxelles',
    1_750_000,
    'Commune de Molenbeek-Saint-Jean',
  ),
  makeTender(
    'T03',
    'Aménagement voirie et égouttage rue de la Station à Liège',
    'Travaux de voirie, pose d\'asphalte, renouvellement réseau d\'égouttage. 850m linéaires. Marché de travaux publics.',
    'works',
    ['45233140', '45232411'],
    ['BE33'],
    'Wallonie',
    520000,
    'Ville de Liège',
  ),

  // --- IT / services numériques ---
  makeTender(
    'T04',
    'Développement d\'un portail citoyen pour la Région de Bruxelles-Capitale',
    'Conception et développement d\'une plateforme web pour démarches administratives en ligne. Stack moderne (React, Node.js), hébergement cloud, accessibilité WCAG.',
    'services',
    ['72000000', '72212000'],
    ['BE10'],
    'Bruxelles',
    420000,
    'Bruxelles Environnement',
  ),
  makeTender(
    'T05',
    'Migration cloud et modernisation du SI de la Ville de Gand',
    'Audit, migration Azure, refonte des workflows internes. Durée 18 mois. Équipe pluridisciplinaire DevOps / Data requise.',
    'services',
    ['72000000', '72222300'],
    ['BE23'],
    'Flandre',
    1_200_000,
    'Stad Gent',
  ),
  makeTender(
    'T06',
    'Maintenance applicative ERP du CPAS d\'Anvers',
    'Support et évolution d\'un ERP métier Oracle. Tickets + évolutifs. 3 ans reconductibles.',
    'services',
    ['72267000', '72260000'],
    ['BE21'],
    'Flandre',
    280000,
    'OCMW Antwerpen',
  ),

  // --- Nettoyage / facility ---
  makeTender(
    'T07',
    'Nettoyage des bureaux du SPF Finances (site Bruxelles)',
    'Nettoyage quotidien de 8500m² de bureaux, entretien vitres, fournitures hygiéniques. Contrat 4 ans. Certification ISO 9001 appréciée.',
    'services',
    ['90919200', '90910000'],
    ['BE10'],
    'Bruxelles',
    890000,
    'SPF Finances',
  ),
  makeTender(
    'T08',
    'Nettoyage des écoles de la Ville de Charleroi',
    'Entretien de 22 bâtiments scolaires. Personnel qualifié, produits écologiques (label).',
    'services',
    ['90919300', '90911200'],
    ['BE32'],
    'Wallonie',
    640000,
    'Ville de Charleroi',
  ),

  // --- Fournitures ---
  makeTender(
    'T09',
    'Fourniture de mobilier de bureau ergonomique pour la Communauté française',
    'Livraison de 420 postes complets (bureau réglable, siège ergonomique, caisson). Marché de fournitures.',
    'supplies',
    ['39130000', '39110000'],
    ['BE10'],
    'Bruxelles',
    310000,
    'Fédération Wallonie-Bruxelles',
  ),
  makeTender(
    'T10',
    'Fourniture de véhicules utilitaires électriques pour la Province de Hainaut',
    'Livraison de 12 fourgons électriques + bornes de recharge. Marché de fournitures.',
    'supplies',
    ['34144700', '34100000'],
    ['BE32'],
    'Wallonie',
    760000,
    'Province de Hainaut',
  ),

  // --- Gros marché (budget élevé) ---
  makeTender(
    'T11',
    'Construction d\'une station d\'épuration à Leuven',
    'Conception-construction d\'une station d\'épuration des eaux usées. Capacité 35000 EH. Travaux de génie civil et équipements hydromécaniques.',
    'works',
    ['45252100', '45232420'],
    ['BE24'],
    'Flandre',
    8_500_000,
    'Aquafin NV',
  ),

  // --- Petit marché local ---
  makeTender(
    'T12',
    'Entretien des espaces verts du parc communal de Wavre',
    'Tonte, taille, ramassage des feuilles. Marché annuel reconductible. Matériel fourni par l\'entrepreneur.',
    'services',
    ['77310000', '77314000'],
    ['BE31'],
    'Wallonie',
    85000,
    'Ville de Wavre',
  ),
];

// ---------------------------------------------------------------------------
// Three deliberately different personas
// ---------------------------------------------------------------------------

function makeProfile(partial: Partial<Profile> & { company_name: string }): Profile {
  return {
    id: `profile-${partial.company_name}`,
    user_id: `user-${partial.company_name}`,
    company_name: partial.company_name,
    sectors: partial.sectors ?? [],
    certifications: partial.certifications ?? [],
    regions: partial.regions ?? [],
    budget_ranges: partial.budget_ranges ?? [],
    keywords: partial.keywords ?? [],
    company_description: partial.company_description ?? '',
    onboarding_completed: true,
    created_at: NOW,
    updated_at: NOW,
  };
}

const PERSONAS: Profile[] = [
  makeProfile({
    company_name: 'BatiWal SPRL',
    company_description: 'PME de construction wallonne, 18 employés, spécialisée en rénovation scolaire et petits chantiers communaux',
    sectors: ['construction', 'rénovation', 'toiture', 'travaux', 'bâtiment', '45000000', '45261000', '45214100'],
    regions: ['BE3', 'BE35', 'BE32', 'BE33'],
    budget_ranges: ['100000-800000'],
    keywords: ['rénovation', 'école', 'toiture', 'agrément D'],
    certifications: ['Agrément D classe 3'],
  }),
  makeProfile({
    company_name: 'Pixel & Cloud',
    company_description: 'Agence digitale bruxelloise, 12 développeurs, stack JavaScript/cloud, focus administration publique',
    sectors: ['développement', 'web', 'cloud', 'digital', 'informatique', '72000000', '72212000', '72267000'],
    regions: ['BE10', 'BE2'],
    budget_ranges: ['200000-1500000'],
    keywords: ['développement', 'plateforme', 'React', 'cloud', 'portail'],
    certifications: ['ISO 27001'],
  }),
  makeProfile({
    company_name: 'CleanPro Services',
    company_description: 'Entreprise de nettoyage industriel active en Flandre et Bruxelles, 85 agents, certifiée ISO',
    sectors: ['nettoyage', 'entretien', 'propreté', 'facility', '90910000', '90919200'],
    regions: ['BE10', 'BE2', 'BE21', 'BE23'],
    budget_ranges: ['300000-1500000'],
    keywords: ['nettoyage', 'entretien', 'ISO 9001'],
    certifications: ['ISO 9001', 'ISO 14001'],
  }),
];

// ---------------------------------------------------------------------------
// Run + format
// ---------------------------------------------------------------------------

function fmtEuro(v: number | null): string {
  if (v === null) return '—';
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M€`;
  if (v >= 1_000) return `${Math.round(v / 1_000)}k€`;
  return `${v}€`;
}

function bar(score: number): string {
  const blocks = Math.round(score / 5);
  return '█'.repeat(blocks) + '░'.repeat(20 - blocks);
}

console.log('\n╔══════════════════════════════════════════════════════════════════════════╗');
console.log('║   RADAR — Test de personnalisation du matching                           ║');
console.log('║   Pool partagé : 12 marchés belges  ·  Algo : src/lib/scrapers/scoring   ║');
console.log('╚══════════════════════════════════════════════════════════════════════════╝\n');

for (const persona of PERSONAS) {
  console.log(`\n────────────────────────────────────────────────────────────────────────────`);
  console.log(`👤 ${persona.company_name}`);
  console.log(`   ${persona.company_description}`);
  console.log(`   Secteurs: ${persona.sectors.filter(s => !/^\d/.test(s)).join(', ')}`);
  console.log(`   Régions : ${persona.regions.join(', ')}  ·  Budget : ${persona.budget_ranges.join(', ')}`);
  console.log(`────────────────────────────────────────────────────────────────────────────`);

  const scored = TENDERS.map(t => ({ tender: t, score: scoreTender(t, persona) }))
    .sort((a, b) => b.score - a.score);

  console.log(`\n  Score │ Bar                  │ Marché`);
  console.log(`  ──────┼──────────────────────┼────────────────────────────────────────`);
  for (const { tender, score } of scored) {
    const emoji = score >= 60 ? '🟢' : score >= 30 ? '🟡' : '⚪';
    const line = `${tender.id} ${tender.title.slice(0, 55)}${tender.title.length > 55 ? '…' : ''}`;
    console.log(
      `  ${String(score).padStart(3)}   │ ${bar(score)} │ ${emoji} ${line}`,
    );
    console.log(
      `        │                      │    ${tender.region} · ${fmtEuro(tender.estimated_value)} · ${tender.tender_type}`,
    );
  }

  const top3 = scored.slice(0, 3);
  console.log(`\n  → Top 3 pour ${persona.company_name}: ${top3.map(s => s.tender.id).join(', ')}`);
}

console.log('\n\n════════════════════════════════════════════════════════════════════════════');
console.log('  VÉRIFICATION : les top 3 doivent être différents pour chaque persona');
console.log('════════════════════════════════════════════════════════════════════════════\n');

const top3PerPersona = PERSONAS.map(p => {
  const ranked = TENDERS.map(t => ({ id: t.id, score: scoreTender(t, p) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(s => s.id);
  return { name: p.company_name, top3: ranked };
});

console.log('  Persona          │ Top 3 marchés');
console.log('  ─────────────────┼─────────────────────');
for (const p of top3PerPersona) {
  console.log(`  ${p.name.padEnd(16)} │ ${p.top3.join('  ·  ')}`);
}

const allTop3 = top3PerPersona.flatMap(p => p.top3);
const uniqueTop3 = new Set(allTop3);
console.log(`\n  Total positions top 3 : ${allTop3.length}`);
console.log(`  Marchés uniques       : ${uniqueTop3.size}`);
console.log(
  `  → Personnalisation : ${uniqueTop3.size >= 7 ? '✅ FORTE (cibles très différentes)' : uniqueTop3.size >= 5 ? '🟡 MOYENNE' : '❌ FAIBLE'}`,
);
console.log('');
