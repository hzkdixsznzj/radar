// Deep audit: pour le profil VFC, combien de tenders DEVRAIENT matcher ?
// On regarde la sample, on simule le scoring, on identifie les pertes.
import { config } from 'dotenv';
config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import { scoreTender } from '../src/lib/scrapers/scoring';
import { friendlyRegionsToNuts } from '../src/lib/geo/be-regions';
import type { Tender, Profile } from '../src/types/database';

const supa = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

async function main() {
  // 1. Récupère le profil VFC
  const { data: profiles } = await supa
    .from('profiles')
    .select('*')
    .ilike('company_name', '%VFC%');

  if (!profiles?.length) {
    console.log('No VFC profile found, listing all profiles:');
    const all = await supa.from('profiles').select('user_id, company_name, sectors, keywords, regions, tender_types, budget_max');
    console.log(JSON.stringify(all.data, null, 2));
    return;
  }

  const profile = profiles[0] as unknown as Profile;
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('Profil VFC');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('company_name:', profile.company_name);
  console.log('sectors (', profile.sectors?.length, '):', profile.sectors);
  console.log('keywords (', profile.keywords?.length, '):', profile.keywords);
  console.log('regions:', profile.regions);
  console.log('budget_ranges:', profile.budget_ranges);

  // 2. Charge tous les tenders open
  const { data: tenders } = await supa
    .from('tenders')
    .select('*')
    .eq('status', 'open');

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(`Total tenders open: ${tenders?.length ?? 0}`);
  console.log('═══════════════════════════════════════════════════════════════');

  if (!tenders) return;

  // 3. Score chacun avec le profil VFC
  const scoringProfile: Profile = {
    ...profile,
    regions: friendlyRegionsToNuts(profile.regions ?? []),
  };

  const scored = tenders.map((t) => ({
    tender: t as unknown as Tender,
    score: scoreTender(t as unknown as Tender, scoringProfile),
  }));

  // 4. Distribution des scores
  const buckets: Record<string, number> = {
    '0-20': 0,
    '20-40': 0,
    '40-60': 0,
    '60-80': 0,
    '80-100': 0,
  };
  for (const s of scored) {
    if (s.score < 20) buckets['0-20']++;
    else if (s.score < 40) buckets['20-40']++;
    else if (s.score < 60) buckets['40-60']++;
    else if (s.score < 80) buckets['60-80']++;
    else buckets['80-100']++;
  }
  console.log('\nDistribution des scores :');
  for (const [k, v] of Object.entries(buckets)) {
    const bar = '█'.repeat(Math.round(v / 10));
    console.log(`  ${k.padEnd(8)} ${String(v).padStart(4)} ${bar}`);
  }

  // 5. Top 20 — qu'est-ce qui matche le mieux ?
  scored.sort((a, b) => b.score - a.score);
  console.log('\nTop 20 matches :');
  for (const s of scored.slice(0, 20)) {
    console.log(
      `  [${String(s.score).padStart(3)}] ${s.tender.tender_type.padEnd(8)} ${s.tender.region?.padEnd(6) ?? '------'} ${s.tender.title?.slice(0, 80)}`,
    );
  }

  // 6. Combien passent le seuil par défaut du feed ?
  // Cherche le seuil dans /api/tenders
  const thresholds = [30, 40, 50, 60];
  console.log('\nNombre de tenders au-dessus de différents seuils :');
  for (const t of thresholds) {
    const n = scored.filter((s) => s.score >= t).length;
    console.log(`  score >= ${t} : ${n}`);
  }

  // 7. Essaye un profil HVAC plus large pour comparer
  const hvacKeywords = [
    'HVAC', 'CVC', 'climatisation', 'ventilation', 'chauffage',
    'frigorifique', 'frigoriste', 'ECS', 'pompe à chaleur', 'PAC',
    'chaudière', 'aérothermie', 'chauffage central', 'climatiseur',
    'réfrigération', 'froid industriel', 'air conditionné',
    'installation thermique', 'sanitaire', 'plomberie',
    'entretien chaudière', 'maintenance HVAC', 'CTA',
  ];
  // Match simple : le full_text contient l'un des mots-clés ?
  const lowerKeywords = hvacKeywords.map((k) => k.toLowerCase());
  const naiveMatches = tenders.filter((t) => {
    const txt = (t.full_text ?? t.title ?? '').toLowerCase();
    return lowerKeywords.some((k) => txt.includes(k));
  });
  console.log(
    `\nMatches naïfs HVAC keyword (full_text contient HVAC/CVC/chauffage/...) : ${naiveMatches.length}`,
  );
  console.log('Top 10 par titre :');
  for (const t of naiveMatches.slice(0, 10)) {
    const tt = t as unknown as Tender;
    console.log(`  · [${tt.region?.padEnd(6)}] ${tt.title?.slice(0, 90)}`);
  }

  // 8. Que dit le scoring sur ces matches ?
  const naiveScored = naiveMatches.map((t) => ({
    tender: t as unknown as Tender,
    score: scoreTender(t as unknown as Tender, scoringProfile),
  }));
  naiveScored.sort((a, b) => a.score - b.score);
  console.log('\n10 tenders HVAC qui DEVRAIENT matcher mais ont un faible score :');
  for (const s of naiveScored.slice(0, 10)) {
    console.log(
      `  [${String(s.score).padStart(3)}] ${s.tender.region?.padEnd(6)} ${s.tender.title?.slice(0, 80)}`,
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
