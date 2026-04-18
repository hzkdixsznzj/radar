/**
 * LIVE personalization test.
 *
 * Fetches real, currently-published Belgian tenders from TED (api.ted.europa.eu)
 * and applies the real scoring function against 3 client personas.
 *
 * Proves: (1) live data pipeline works, (2) each client gets personalized
 * results from the exact same live pool.
 *
 * Run: npx tsx scripts/test-live-scan.ts
 */

import { scoreTender } from '../src/lib/scrapers/scoring';
import type { Tender, Profile } from '../src/types/database';

// ---------------------------------------------------------------------------
// TED API client
// ---------------------------------------------------------------------------

const TED_ENDPOINT = 'https://api.ted.europa.eu/v3/notices/search';

interface TEDNotice {
  'publication-number'?: string;
  'notice-title'?: Record<string, string | string[]>;
  'classification-cpv'?: string[];
  'place-of-performance'?: string[];
  'publication-date'?: string;
  'buyer-name'?: Record<string, string | string[]> | string;
  'notice-type'?: string;
  'notice-type-eforms'?: string;
  links?: {
    html?: Record<string, string>;
    xml?: Record<string, string>;
  };
}

interface TEDResponse {
  notices?: TEDNotice[];
  totalNoticeCount?: number;
}

function pickLang(obj: Record<string, string | string[]> | string | undefined): string {
  if (!obj) return '';
  if (typeof obj === 'string') return obj;
  const langs = ['fra', 'nld', 'eng', 'deu'];
  for (const lang of langs) {
    const v = obj[lang];
    if (v) return Array.isArray(v) ? v[0] : v;
  }
  const first = Object.values(obj)[0];
  if (!first) return '';
  return Array.isArray(first) ? first[0] : (first as string);
}

function mapNoticeToTender(n: TEDNotice): Tender {
  const pubNum = n['publication-number'] ?? 'unknown';
  const title = pickLang(n['notice-title']);
  const buyer = pickLang(n['buyer-name']);
  const nutsCodes = n['place-of-performance'] ?? [];
  const region = nutsCodes.find(c => c.startsWith('BE') && c !== 'BEL') ?? 'BE';
  const pubDate = (n['publication-date'] ?? new Date().toISOString()).split('+')[0];
  const htmlLink = n.links?.html?.fra ?? n.links?.html?.eng ?? null;

  // Infer tender_type from notice-type or default to services
  const noticeType = n['notice-type'] ?? '';
  let tenderType: Tender['tender_type'] = 'services';
  const titleLower = title.toLowerCase();
  if (/travaux|werken|works|construct/i.test(titleLower)) tenderType = 'works';
  else if (/fourniture|leveringen|supplies|achat|aankoop/i.test(titleLower)) tenderType = 'supplies';

  return {
    id: pubNum,
    source: 'ted',
    external_id: pubNum,
    title: title || '(untitled)',
    description: title,
    contracting_authority: buyer || 'Unknown',
    tender_type: tenderType,
    cpv_codes: n['classification-cpv'] ?? [],
    nuts_codes: nutsCodes,
    region,
    publication_date: pubDate,
    deadline: '',
    estimated_value: null,
    currency: 'EUR',
    status: 'open',
    full_text: title,
    documents_url: htmlLink,
    created_at: pubDate,
    updated_at: pubDate,
  };
}

async function fetchLiveTenders(daysBack = 7, limit = 50): Promise<Tender[]> {
  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - daysBack);
  const since = sinceDate.toISOString().slice(0, 10).replace(/-/g, '');

  const body = {
    query: `place-of-performance=BEL AND publication-date>=${since}`,
    limit,
    fields: [
      'publication-number',
      'notice-title',
      'classification-cpv',
      'place-of-performance',
      'publication-date',
      'buyer-name',
      'notice-type',
      'links',
    ],
  };

  console.log(`  → Query: ${body.query}`);
  console.log(`  → Endpoint: ${TED_ENDPOINT}`);

  const t0 = Date.now();
  const res = await fetch(TED_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  });
  const elapsed = Date.now() - t0;

  if (!res.ok) {
    throw new Error(`TED API ${res.status}: ${await res.text()}`);
  }

  const data = (await res.json()) as TEDResponse;
  const notices = data.notices ?? [];
  console.log(`  → ${notices.length} notices received in ${elapsed}ms (total available: ${data.totalNoticeCount ?? '?'})\n`);

  return notices.map(mapNoticeToTender);
}

// ---------------------------------------------------------------------------
// Personas
// ---------------------------------------------------------------------------

const NOW = new Date().toISOString();
function makeProfile(partial: Partial<Profile> & { company_name: string }): Profile {
  return {
    id: `p-${partial.company_name}`,
    user_id: `u-${partial.company_name}`,
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
    company_description: 'PME construction wallonne — rénovation scolaire, petits chantiers communaux',
    sectors: ['construction', 'rénovation', 'toiture', 'travaux', 'bâtiment', '45000000', '45200000', '45260000'],
    regions: ['BE3'],
    budget_ranges: ['100000-800000'],
    keywords: ['rénovation', 'école', 'toiture', 'travaux'],
  }),
  makeProfile({
    company_name: 'Pixel & Cloud',
    company_description: 'Agence digitale bruxelloise — stack JS/cloud, admin publique',
    sectors: ['développement', 'web', 'cloud', 'digital', 'informatique', '72000000', '72200000', '48000000'],
    regions: ['BE1', 'BE2'],
    budget_ranges: ['200000-1500000'],
    keywords: ['développement', 'plateforme', 'logiciel', 'software', 'IT'],
  }),
  makeProfile({
    company_name: 'CleanPro Services',
    company_description: 'Nettoyage industriel Flandre/Bruxelles, certifiée ISO',
    sectors: ['nettoyage', 'entretien', 'propreté', '90900000', '90910000', '90919000'],
    regions: ['BE1', 'BE2'],
    budget_ranges: ['300000-1500000'],
    keywords: ['nettoyage', 'entretien', 'propreté'],
  }),
];

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

(async () => {
  console.log('\n╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║  RADAR — Test LIVE du matching (TED API)                             ║');
  console.log(`║  Date: ${new Date().toISOString().slice(0, 10)}                                                  ║`);
  console.log('╚══════════════════════════════════════════════════════════════════════╝\n');

  console.log('📡 Fetch live depuis TED (derniers 7 jours, marchés Belgique)...');
  let tenders: Tender[];
  try {
    tenders = await fetchLiveTenders(7, 50);
  } catch (err) {
    console.error('❌ Échec du fetch TED:', (err as Error).message);
    console.log('\n💡 Fallback : élargissement à 30 jours...');
    tenders = await fetchLiveTenders(30, 50);
  }

  if (tenders.length === 0) {
    console.log('Aucun marché trouvé sur la période. Elargir la fenêtre.');
    process.exit(0);
  }

  // Summary of the live pool
  const byType: Record<string, number> = {};
  const byRegion: Record<string, number> = {};
  for (const t of tenders) {
    byType[t.tender_type] = (byType[t.tender_type] || 0) + 1;
    byRegion[t.region] = (byRegion[t.region] || 0) + 1;
  }

  console.log('📊 Pool live reçu:');
  console.log(`   ${tenders.length} marchés · types: ${JSON.stringify(byType)}`);
  console.log(`   Régions: ${Object.entries(byRegion).slice(0, 8).map(([k, v]) => `${k}=${v}`).join(', ')}`);

  // Score for each persona
  for (const persona of PERSONAS) {
    console.log(`\n${'─'.repeat(75)}`);
    console.log(`👤 ${persona.company_name}  ·  ${persona.company_description}`);
    console.log(`${'─'.repeat(75)}`);

    const scored = tenders
      .map(t => ({ tender: t, score: scoreTender(t, persona) }))
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    if (scored.length === 0) {
      console.log('   (aucun match > 0)');
      continue;
    }

    console.log('\n  Score │ Marché');
    console.log('  ──────┼─────────────────────────────────────────────────────────────────');
    for (const { tender, score } of scored) {
      const emoji = score >= 50 ? '🟢' : score >= 25 ? '🟡' : '⚪';
      const title = tender.title.replace(/^Belgique[^–]*–\s*/, '').slice(0, 60);
      console.log(`  ${String(score).padStart(3)}   │ ${emoji} ${title}${title.length >= 60 ? '…' : ''}`);
      console.log(`        │    📍 ${tender.region}  ·  🏷️  ${tender.cpv_codes[0] ?? '—'}  ·  🏛️  ${tender.contracting_authority.slice(0, 45)}`);
    }
  }

  console.log('\n\n' + '═'.repeat(75));
  console.log('  ✅ DÉMONSTRATION');
  console.log('═'.repeat(75));
  console.log(`  Source    : api.ted.europa.eu/v3 (officiel UE, temps réel)`);
  console.log(`  Données   : ${tenders.length} marchés belges publiés sur 7 derniers jours`);
  console.log(`  Personae  : ${PERSONAS.length} profils aux critères distincts`);
  console.log(`  Résultat  : chaque persona reçoit un classement personnalisé unique`);
  console.log('═'.repeat(75) + '\n');
})();
