import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  Compass,
  BookmarkCheck,
  FileEdit,
  Trophy,
  ArrowRight,
  Sparkles,
  Radar as RadarIcon,
  UserCog,
  Download,
} from 'lucide-react';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { BottomNav } from '@/components/layout/bottom-nav';
import { Badge } from '@/components/ui/badge';
import { BelgiumMap } from '@/components/dashboard/belgium-map';
import { nutsToFriendly } from '@/lib/geo/be-regions';
import type {
  Profile,
  SavedTender,
  SavedTenderStatus,
  Tender,
} from '@/types/database';

/* -------------------------------------------------------------------------- */
/*  Dashboard — Server Component                                              */
/*                                                                            */
/*  - Auth: redirects to /login when no user                                  */
/*  - Onboarding: redirects to /onboarding when profile.onboarding_completed  */
/*    is false                                                                */
/*  - Renders 4 KPI cards + quick actions + recent activity                   */
/* -------------------------------------------------------------------------- */

type SavedTenderRow = SavedTender & { tender: Tender | null };

type StatusBadgeConfig = {
  label: string;
  color: 'blue' | 'green' | 'orange' | 'red' | 'gray';
};

const STATUS_CONFIG: Record<SavedTenderStatus, StatusBadgeConfig> = {
  new: { label: 'Nouveau', color: 'blue' },
  analyzing: { label: 'Analyse', color: 'orange' },
  drafting: { label: 'Rédaction', color: 'orange' },
  submitted: { label: 'Soumis', color: 'green' },
  won: { label: 'Gagné', color: 'green' },
  lost: { label: 'Perdu', color: 'red' },
};

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient();

  // ---- Auth check ----
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // ---- Profile / onboarding check ----
  const profileRes = (await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()) as unknown as { data: Profile | null };

  const profile = profileRes.data;

  if (!profile || profile.onboarding_completed === false) {
    redirect('/onboarding');
  }

  // ---- Fetch KPIs in parallel ----
  const [
    feedCountRes,
    favoritesCountRes,
    draftingCountRes,
    wonCountRes,
    lostCountRes,
    recentRes,
    regionsRes,
  ] = await Promise.all([
    supabase
      .from('tenders')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'open'),
    supabase
      .from('saved_tenders')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .in('status', ['new', 'analyzing', 'drafting']),
    supabase
      .from('saved_tenders')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'drafting'),
    supabase
      .from('saved_tenders')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'won'),
    supabase
      .from('saved_tenders')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'lost'),
    supabase
      .from('saved_tenders')
      .select('*, tender:tenders(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5),
    // Fetch region + nuts_codes for all open tenders. One column per row,
    // <10k rows max — cheap enough to aggregate in JS for the map tiles.
    supabase
      .from('tenders')
      .select('region, nuts_codes')
      .eq('status', 'open')
      .limit(10000),
  ]);

  const feedCount = feedCountRes.count ?? 0;
  const favoritesCount = favoritesCountRes.count ?? 0;
  const draftingCount = draftingCountRes.count ?? 0;
  const wonCount = wonCountRes.count ?? 0;
  const lostCount = lostCountRes.count ?? 0;
  const finishedTotal = wonCount + lostCount;
  const winRate = finishedTotal > 0 ? Math.round((wonCount / finishedTotal) * 100) : 0;

  const recentTenders = (recentRes.data ?? []) as unknown as SavedTenderRow[];
  const hasAnyActivity =
    feedCount > 0 || favoritesCount > 0 || draftingCount > 0 || finishedTotal > 0;

  // ---- Aggregate open tenders per friendly province ----
  // Primary signal: `region` (NUTS prefix). Fallback: first entry in
  // `nuts_codes[]`. Anything we can't resolve is silently dropped so the
  // counts reflect what's actually placeable on the map.
  const regionRows = (regionsRes.data ?? []) as unknown as {
    region: string | null;
    nuts_codes: string[] | null;
  }[];
  const tendersByRegion: Record<string, number> = {};
  for (const row of regionRows) {
    const raw = row.region?.trim() || row.nuts_codes?.[0];
    if (!raw) continue;
    const friendly = nutsToFriendly(raw);
    // `nutsToFriendly` returns the raw code when unresolved — skip those.
    if (!friendly || friendly === raw) {
      // If the raw value already matches a friendly name (e.g. stored
      // pre-NUTS), keep it.
      if (raw === friendly && !/^BE/i.test(raw)) {
        tendersByRegion[raw] = (tendersByRegion[raw] ?? 0) + 1;
      }
      continue;
    }
    tendersByRegion[friendly] = (tendersByRegion[friendly] ?? 0) + 1;
  }

  return (
    <div className="min-h-dvh bg-bg-primary pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border bg-bg-primary/80 backdrop-blur-xl safe-top">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <RadarIcon className="size-5 text-accent-blue" />
            <h1 className="font-display text-lg font-bold text-text-primary">
              Tableau de bord
            </h1>
          </div>
          <Link
            href="/profil"
            aria-label="Ouvrir le profil"
            className="flex size-9 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-bg-card hover:text-text-primary"
          >
            <UserCog className="size-5" />
          </Link>
        </div>
      </header>

      <main className="px-4 pt-5 space-y-6">
        {/* Greeting */}
        <section className="animate-slide-up">
          <p className="text-sm text-text-muted">Bonjour,</p>
          <h2 className="mt-0.5 font-display text-xl font-bold text-text-primary">
            {profile.company_name || 'bienvenue'}
          </h2>
        </section>

        {/* KPI cards */}
        <section
          aria-label="Indicateurs clés"
          className="grid grid-cols-2 gap-3 sm:grid-cols-4"
        >
          <KpiCard
            icon={<Compass className="size-4" />}
            label="Marchés dans le feed"
            value={feedCount}
            accent="blue"
          />
          <KpiCard
            icon={<BookmarkCheck className="size-4" />}
            label="Favoris"
            value={favoritesCount}
            accent="green"
          />
          <KpiCard
            icon={<FileEdit className="size-4" />}
            label="Soumissions en cours"
            value={draftingCount}
            accent="orange"
          />
          <KpiCard
            icon={<Trophy className="size-4" />}
            label="Taux de victoire"
            value={winRate}
            suffix="%"
            accent="green"
            muted={finishedTotal === 0}
            hint={finishedTotal === 0 ? 'Aucun résultat' : `${wonCount}/${finishedTotal}`}
          />
        </section>

        {/* Belgian province heatmap — click a tile to pre-filter the feed. */}
        <section aria-label="Carte des marchés ouverts" className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-text-primary">
              Activité par province
            </h3>
            <Link
              href="/feed"
              className="inline-flex items-center gap-1 text-xs font-medium text-accent-blue hover:underline"
            >
              Voir le feed
              <ArrowRight className="size-3" />
            </Link>
          </div>
          <div className="rounded-xl border border-border bg-bg-card p-4">
            <BelgiumMap counts={tendersByRegion} />
          </div>
        </section>

        {/* Quick actions */}
        <section aria-label="Actions rapides" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <QuickActionLink
            href="/feed"
            icon={<Compass className="size-5" />}
            title="Voir le feed"
            description="Parcourez les nouveaux marchés publics"
            accent="blue"
          />
          <QuickActionLink
            href="/profil"
            icon={<UserCog className="size-5" />}
            title="Mon profil"
            description="Affinez vos critères pour mieux cibler"
            accent="green"
          />
          <QuickActionLink
            href="/api/saved-tenders/export"
            icon={<Download className="size-5" />}
            title="Exporter en CSV"
            description="Téléchargez vos marchés sauvés"
            accent="orange"
          />
        </section>

        {/* Recent activity */}
        <section aria-label="Activité récente" className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-text-primary">
              Activité récente
            </h3>
            {recentTenders.length > 0 && (
              <Link
                href="/feed"
                className="inline-flex items-center gap-1 text-xs font-medium text-accent-blue hover:underline"
              >
                Voir tout
                <ArrowRight className="size-3" />
              </Link>
            )}
          </div>

          {recentTenders.length === 0 ? (
            <EmptyState hasAnyActivity={hasAnyActivity} />
          ) : (
            <ul className="space-y-2">
              {recentTenders.map((st) => {
                const cfg = STATUS_CONFIG[st.status];
                const title = st.tender?.title ?? 'Marché sans titre';
                const authority = st.tender?.contracting_authority ?? '';
                return (
                  <li key={st.id}>
                    <Link
                      href={
                        st.status === 'drafting' || st.status === 'submitted'
                          ? `/redaction/${st.id}`
                          : st.tender?.id
                            ? `/tender/${st.tender.id}`
                            : `/feed`
                      }
                      className="group flex items-center gap-3 rounded-xl border border-border bg-bg-card p-4 transition-colors hover:bg-bg-card-hover"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-text-primary">
                          {title}
                        </p>
                        {authority && (
                          <p className="mt-0.5 truncate text-xs text-text-muted">
                            {authority}
                          </p>
                        )}
                      </div>
                      <Badge color={cfg.color} size="sm">
                        {cfg.label}
                      </Badge>
                      <ArrowRight className="size-4 shrink-0 text-text-muted transition-colors group-hover:text-text-primary" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>

      <BottomNav />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Sub-components                                                            */
/* -------------------------------------------------------------------------- */

type Accent = 'blue' | 'green' | 'orange' | 'red';

const ACCENT_BG: Record<Accent, string> = {
  blue: 'bg-accent-blue-soft text-accent-blue',
  green: 'bg-accent-green-soft text-accent-green',
  orange: 'bg-accent-orange-soft text-accent-orange',
  red: 'bg-accent-red-soft text-accent-red',
};

function KpiCard({
  icon,
  label,
  value,
  suffix,
  accent,
  muted,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  suffix?: string;
  accent: Accent;
  muted?: boolean;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-bg-card p-4">
      <div className={`inline-flex rounded-lg p-1.5 ${ACCENT_BG[accent]}`}>
        {icon}
      </div>
      <p className="mt-3 font-display text-2xl font-bold tabular-nums text-text-primary">
        {muted ? '—' : value}
        {!muted && suffix ? (
          <span className="ml-0.5 text-sm font-medium text-text-secondary">
            {suffix}
          </span>
        ) : null}
      </p>
      <p className="mt-0.5 text-xs text-text-muted">{label}</p>
      {hint && !muted && (
        <p className="mt-0.5 text-[11px] text-text-muted">{hint}</p>
      )}
    </div>
  );
}

function QuickActionLink({
  href,
  icon,
  title,
  description,
  accent,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  accent: Accent;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-4 rounded-xl border border-border bg-bg-card p-4 transition-colors hover:bg-bg-card-hover"
    >
      <div className={`flex size-11 items-center justify-center rounded-xl ${ACCENT_BG[accent]}`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-display text-sm font-semibold text-text-primary">
          {title}
        </p>
        <p className="mt-0.5 truncate text-xs text-text-muted">{description}</p>
      </div>
      <ArrowRight className="size-4 shrink-0 text-text-muted transition-colors group-hover:text-text-primary" />
    </Link>
  );
}

function EmptyState({ hasAnyActivity }: { hasAnyActivity: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-bg-card/40 py-10 text-center">
      <div className="flex size-12 items-center justify-center rounded-2xl bg-accent-blue-soft text-accent-blue">
        <Sparkles className="size-5" />
      </div>
      <p className="mt-4 font-display text-sm font-semibold text-text-primary">
        {hasAnyActivity
          ? 'Pas encore d’activité récente'
          : 'Commencez par découvrir des marchés dans le feed'}
      </p>
      <p className="mt-1 max-w-[260px] text-xs text-text-muted">
        Parcourez les marchés pertinents pour votre entreprise et sauvegardez
        les plus prometteurs.
      </p>
      <Link
        href="/feed"
        className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-accent-blue px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-accent-blue/90"
      >
        Ouvrir le feed
        <ArrowRight className="size-3.5" />
      </Link>
    </div>
  );
}
