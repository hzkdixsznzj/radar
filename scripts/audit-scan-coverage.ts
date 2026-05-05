// ---------------------------------------------------------------------------
// Audit du scan : combien on capture, combien on rate, freshness, qualité
// des champs. Donne un état des lieux pour prioriser les améliorations.
// ---------------------------------------------------------------------------
import { config } from 'dotenv';
config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supa = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

async function main() {
  const today = new Date();
  const sevenDaysAgo = new Date(today.getTime() - 7 * 86400_000);
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 86400_000);

  console.log('═══════════════════════════════════════════════════════════');
  console.log('Radar — Audit du scan');
  console.log('═══════════════════════════════════════════════════════════\n');

  // ---- Volume ----
  const { count: total } = await supa
    .from('tenders')
    .select('*', { count: 'exact', head: true });
  const { count: open } = await supa
    .from('tenders')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'open');
  const { count: tedTotal } = await supa
    .from('tenders')
    .select('*', { count: 'exact', head: true })
    .eq('source', 'ted');
  const { count: bdaTotal } = await supa
    .from('tenders')
    .select('*', { count: 'exact', head: true })
    .eq('source', 'be_bulletin');

  console.log('VOLUME');
  console.log(`  Total tenders        : ${total}`);
  console.log(`  Open (statut actif)  : ${open}`);
  console.log(`  Source TED           : ${tedTotal}`);
  console.log(`  Source BDA           : ${bdaTotal}\n`);

  // ---- Freshness ----
  const { count: last7 } = await supa
    .from('tenders')
    .select('*', { count: 'exact', head: true })
    .gte('publication_date', sevenDaysAgo.toISOString().slice(0, 10));
  const { count: last30 } = await supa
    .from('tenders')
    .select('*', { count: 'exact', head: true })
    .gte('publication_date', thirtyDaysAgo.toISOString().slice(0, 10));

  // Latest scrape timestamps per source
  const { data: latestTed } = await supa
    .from('tenders')
    .select('updated_at')
    .eq('source', 'ted')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  const { data: latestBda } = await supa
    .from('tenders')
    .select('updated_at')
    .eq('source', 'be_bulletin')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const hoursSince = (iso: string | null | undefined) =>
    iso ? Math.round((Date.now() - new Date(iso).getTime()) / 3600_000) : null;

  console.log('FRESHNESS');
  console.log(`  Publiés < 7j         : ${last7}`);
  console.log(`  Publiés < 30j        : ${last30}`);
  console.log(
    `  Dernier scrape TED   : ${latestTed?.updated_at ?? '—'} (${hoursSince(latestTed?.updated_at)}h)`,
  );
  console.log(
    `  Dernier scrape BDA   : ${latestBda?.updated_at ?? '—'} (${hoursSince(latestBda?.updated_at)}h)\n`,
  );

  // ---- Field quality ----
  const { count: withDeadline } = await supa
    .from('tenders')
    .select('*', { count: 'exact', head: true })
    .not('deadline', 'is', null);
  const { count: withValue } = await supa
    .from('tenders')
    .select('*', { count: 'exact', head: true })
    .not('estimated_value', 'is', null)
    .gt('estimated_value', 0);
  const { count: withRegion } = await supa
    .from('tenders')
    .select('*', { count: 'exact', head: true })
    .not('region', 'is', null)
    .neq('region', 'BE'); // Region 'BE' = unspecified, generic
  const { count: withCpv } = await supa
    .from('tenders')
    .select('*', { count: 'exact', head: true })
    .not('cpv_codes', 'eq', '{}');
  const { count: withFullText } = await supa
    .from('tenders')
    .select('*', { count: 'exact', head: true })
    .not('full_text', 'is', null);

  const pct = (n: number | null, t: number | null) =>
    n != null && t != null && t > 0 ? `${Math.round((n / t) * 100)}%` : '—';

  console.log('QUALITÉ DES CHAMPS (% sur le total)');
  console.log(
    `  Avec deadline        : ${withDeadline} (${pct(withDeadline ?? 0, total ?? 0)})`,
  );
  console.log(
    `  Avec budget estimé   : ${withValue} (${pct(withValue ?? 0, total ?? 0)})`,
  );
  console.log(
    `  Avec région précise  : ${withRegion} (${pct(withRegion ?? 0, total ?? 0)})`,
  );
  console.log(
    `  Avec codes CPV       : ${withCpv} (${pct(withCpv ?? 0, total ?? 0)})`,
  );
  console.log(
    `  Avec full_text       : ${withFullText} (${pct(withFullText ?? 0, total ?? 0)})\n`,
  );

  // ---- Tender type distribution ----
  const { data: byType } = await supa.from('tenders').select('tender_type');
  const typeCount: Record<string, number> = {};
  for (const t of byType ?? []) {
    const k = (t as { tender_type: string }).tender_type ?? 'unknown';
    typeCount[k] = (typeCount[k] ?? 0) + 1;
  }
  console.log('TYPE DE MARCHÉ');
  for (const [k, v] of Object.entries(typeCount)) {
    console.log(`  ${k.padEnd(20)} ${v} (${pct(v, total ?? 0)})`);
  }
  console.log();

  // ---- Status distribution ----
  const { data: byStatus } = await supa.from('tenders').select('status');
  const statusCount: Record<string, number> = {};
  for (const t of byStatus ?? []) {
    const k = (t as { status: string }).status ?? 'unknown';
    statusCount[k] = (statusCount[k] ?? 0) + 1;
  }
  console.log('STATUT');
  for (const [k, v] of Object.entries(statusCount)) {
    console.log(`  ${k.padEnd(20)} ${v} (${pct(v, total ?? 0)})`);
  }
  console.log();

  // ---- De-dup check (TED ↔ BDA) ----
  // Same tender often published in both. Loose match by external_id substring
  // or by similar title.
  const { data: tedSample } = await supa
    .from('tenders')
    .select('id, title, external_id')
    .eq('source', 'ted')
    .eq('status', 'open')
    .limit(50);
  const { data: bdaSample } = await supa
    .from('tenders')
    .select('id, title, external_id')
    .eq('source', 'be_bulletin')
    .eq('status', 'open')
    .limit(500);

  let duplicates = 0;
  const titleNorm = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 60);
  for (const ted of tedSample ?? []) {
    const t = titleNorm((ted as { title: string }).title);
    if (!t) continue;
    const hit = (bdaSample ?? []).find(
      (b) => titleNorm((b as { title: string }).title) === t,
    );
    if (hit) duplicates++;
  }
  console.log('DE-DUP (échantillon)');
  console.log(
    `  Doublons TED/BDA dans 50 TED random : ${duplicates}/50 (${Math.round((duplicates / 50) * 100)}%)\n`,
  );

  // ---- Reference baseline ----
  console.log('BASELINE DE RÉFÉRENCE');
  console.log(
    '  TED publie environ ~30-50 BE tenders/jour (toutes catégories).',
  );
  console.log(
    "  BDA publie environ ~80-150 BE tenders/jour (national + sub-threshold).",
  );
  console.log(
    "  Soit ~110-200 nouveaux tenders BE par jour ouvré théoriques.",
  );
  console.log(`  En 7 jours, attendu : ~770-1400. Mesuré : ${last7}.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
