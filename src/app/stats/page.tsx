import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Compass, Sparkles, Map } from 'lucide-react';

// ---------------------------------------------------------------------------
// /stats — public proof-of-coverage page
// ---------------------------------------------------------------------------
//
// Public, no auth. Shows the live numbers (active tenders, fresh-7d,
// per-source split) so a prospect lands on it from LinkedIn / SEO
// and immediately sees the scan is real and big.
//
// Server component — fetches /api/public/stats which is itself ISR
// cached. End result is a static-ish HTML page that revalidates once
// every 5 min via the upstream cache.
// ---------------------------------------------------------------------------

export const metadata: Metadata = {
  title: 'Couverture en temps réel',
  description:
    'Combien de marchés publics belges actifs, frais ces 7 derniers jours, par source. Données mises à jour en continu.',
};

interface PublicStats {
  total_active: number;
  fresh_7d: number;
  fresh_30d: number;
  sources: { ted: number; bda: number };
  sample_volume_eur: number;
  generated_at: string;
}

async function getStats(): Promise<PublicStats | null> {
  const url = process.env.NEXT_PUBLIC_APP_URL ?? '';
  const fullUrl = url ? `${url}/api/public/stats` : '/api/public/stats';
  try {
    const res = await fetch(fullUrl, { next: { revalidate: 300 } });
    if (!res.ok) return null;
    return (await res.json()) as PublicStats;
  } catch {
    return null;
  }
}

function formatNumber(n: number): string {
  return n.toLocaleString('fr-BE');
}

function formatVolume(eurCents: number): string {
  if (eurCents >= 1_000_000_000) return `${(eurCents / 1_000_000_000).toFixed(1)} Md €`;
  if (eurCents >= 1_000_000) return `${Math.round(eurCents / 1_000_000)} M €`;
  if (eurCents >= 1_000) return `${Math.round(eurCents / 1_000)} k €`;
  return `${eurCents} €`;
}

export default async function StatsPage() {
  const stats = await getStats();

  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary"
      >
        <ArrowLeft className="size-4" />
        Retour à l&apos;accueil
      </Link>

      <header className="mt-8">
        <p className="text-sm font-semibold uppercase tracking-wider text-accent-blue">
          Couverture en temps réel
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold text-text-primary sm:text-4xl">
          Tous les marchés publics belges, scannés pour vous.
        </h1>
        <p className="mt-3 text-sm text-text-secondary">
          Mis à jour 4 fois par jour. Sources officielles uniquement (TED, BDA).
        </p>
      </header>

      {stats ? (
        <>
          <section className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Stat
              label="Marchés actifs"
              value={formatNumber(stats.total_active)}
              hint="Disponibles à la candidature"
            />
            <Stat
              label="Cette semaine"
              value={formatNumber(stats.fresh_7d)}
              hint="Publiés < 7 jours"
              accent
            />
            <Stat
              label="Ce mois"
              value={formatNumber(stats.fresh_30d)}
              hint="Publiés < 30 jours"
            />
            <Stat
              label="Source TED"
              value={formatNumber(stats.sources.ted)}
              hint="Annonces > seuil européen"
            />
            <Stat
              label="Source BDA"
              value={formatNumber(stats.sources.bda)}
              hint="Bulletin Adjudications BE"
            />
            <Stat
              label="Volume (échantillon)"
              value={formatVolume(stats.sample_volume_eur)}
              hint="Marchés avec budget chiffré"
            />
          </section>

          <p className="mt-8 text-xs text-text-muted">
            Données mises à jour le{' '}
            {new Date(stats.generated_at).toLocaleString('fr-BE')}. Cumul du
            volume sous-estimé : la plupart des appels d&apos;offres belges ne
            divulguent pas le budget dans la publication.
          </p>
        </>
      ) : (
        <p className="mt-10 text-sm text-text-muted">
          Statistiques temporairement indisponibles. Réessayez dans quelques minutes.
        </p>
      )}

      {/* Methodology + CTA */}
      <section className="mt-14 grid gap-4 sm:grid-cols-3">
        <Method
          icon={<Compass className="size-5" />}
          title="Sources officielles"
          body="TED (UE) et Bulletin des Adjudications (BE) tirés directement via leurs API publiques. Pas de scraping de sites tiers."
        />
        <Method
          icon={<Map className="size-5" />}
          title="Couverture nationale"
          body="11 provinces couvertes, du Hainaut à la Flandre orientale. Filtrage par NUTS automatique selon votre profil."
        />
        <Method
          icon={<Sparkles className="size-5" />}
          title="Enrichissement IA"
          body="Chaque tender est tagué avec des thèmes Claude pour matcher votre métier au-delà des mots-clés exacts."
        />
      </section>

      <div className="mt-12 rounded-2xl border border-border bg-bg-card p-6 text-center">
        <h2 className="font-display text-xl font-bold text-text-primary">
          Prêt à voir vos marchés ?
        </h2>
        <p className="mt-2 text-sm text-text-secondary">
          Inscription gratuite, 5 marchés filtrés / mois sans carte bancaire.
        </p>
        <Link
          href="/signup"
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-accent-blue px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-blue/90"
        >
          Commencer
        </Link>
      </div>
    </main>
  );
}

function Stat({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-5 ${
        accent
          ? 'border-accent-blue/40 bg-accent-blue-soft'
          : 'border-border bg-bg-card'
      }`}
    >
      <p
        className={`font-display text-3xl font-bold ${
          accent ? 'text-accent-blue' : 'text-text-primary'
        }`}
      >
        {value}
      </p>
      <p className="mt-1 text-sm font-medium text-text-primary">{label}</p>
      {hint && <p className="mt-0.5 text-xs text-text-muted">{hint}</p>}
    </div>
  );
}

function Method({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-bg-card p-5">
      <div className="mb-3 inline-flex size-9 items-center justify-center rounded-lg bg-accent-blue-soft text-accent-blue">
        {icon}
      </div>
      <h3 className="font-display text-base font-semibold text-text-primary">
        {title}
      </h3>
      <p className="mt-1 text-sm leading-relaxed text-text-secondary">{body}</p>
    </div>
  );
}
