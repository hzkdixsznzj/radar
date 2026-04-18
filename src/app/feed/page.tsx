'use client';

import { Suspense, useState, useCallback, useEffect } from 'react';
import { AlertTriangle, BellPlus, CheckCircle2, Radar as RadarIcon, RotateCw, SlidersHorizontal } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { CardStack } from '@/components/feed/card-stack';
import {
  FeedFilters,
  type FeedFiltersState,
} from '@/components/feed/feed-filters';
import { BottomNav } from '@/components/layout/bottom-nav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { CardSkeleton } from '@/components/ui/loading';
import type { TenderWithScore } from '@/types/database';

const DEFAULT_FILTERS: FeedFiltersState = {
  type: 'all',
  region: 'Toutes',
  budget: 'all',
  deadline: 'all',
};

const FREE_TIER_LIMIT = 5;

type TendersApiResponse = {
  tenders: TenderWithScore[];
  total?: number;
  page?: number;
  limit?: number;
};

export default function FeedPage() {
  // `useSearchParams` requires a Suspense boundary during prerender.
  // Wrapping the whole body is cheapest; we show a skeleton while the
  // URL params are read on the client.
  return (
    <Suspense fallback={<FeedSkeleton />}>
      <FeedInner />
    </Suspense>
  );
}

function FeedInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Seed the initial filter state from the URL so deep-links from the
  // dashboard map (e.g. `/feed?region=Hainaut`) land pre-filtered.
  const initialFilters: FeedFiltersState = {
    ...DEFAULT_FILTERS,
    type:
      (searchParams.get('type') as FeedFiltersState['type']) ??
      DEFAULT_FILTERS.type,
    region: searchParams.get('region') ?? DEFAULT_FILTERS.region,
    budget: searchParams.get('budget') ?? DEFAULT_FILTERS.budget,
    deadline: searchParams.get('deadline') ?? DEFAULT_FILTERS.deadline,
  };

  const [tenders, setTenders] = useState<TenderWithScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FeedFiltersState>(initialFilters);
  const [viewCount, setViewCount] = useState(0);
  const [page, setPage] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [plan, setPlan] = useState<'free' | 'pro' | 'business'>('free');
  // Total matching tenders in DB for current filters (count from API).
  const [totalMatching, setTotalMatching] = useState<number | null>(null);

  // ---- Saved-search modal state ----
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saveBusy, setSaveBusy] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveToast, setSaveToast] = useState(false);

  // Fetch the user's current subscription plan (drives the free-tier counter).
  useEffect(() => {
    let cancelled = false;
    fetch('/api/profile')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        const p = data?.subscription?.plan as 'free' | 'pro' | 'business' | undefined;
        if (p) setPlan(p);
      })
      .catch(() => {
        /* silently ignore — default is free */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const remainingViews = Math.max(0, FREE_TIER_LIMIT - viewCount);

  const fetchTenders = useCallback(
    async (pageNum: number, currentFilters: FeedFiltersState) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          page: String(pageNum),
          limit: '10',
        });

        if (currentFilters.type !== 'all') {
          params.set('type', currentFilters.type);
        }
        if (currentFilters.region !== 'Toutes') {
          params.set('region', currentFilters.region);
        }
        if (currentFilters.budget !== 'all') {
          params.set('budget', currentFilters.budget);
        }
        if (currentFilters.deadline !== 'all') {
          params.set('deadline', currentFilters.deadline);
        }

        const res = await fetch(`/api/tenders?${params.toString()}`);
        if (!res.ok) throw new Error('Failed to fetch tenders');

        const json = (await res.json()) as
          | TendersApiResponse
          | TenderWithScore[];
        const data: TenderWithScore[] = Array.isArray(json)
          ? json
          : json.tenders ?? [];
        const total =
          Array.isArray(json) ? null : typeof json.total === 'number' ? json.total : null;

        setTenders((prev) => (pageNum === 0 ? data : [...prev, ...data]));
        if (pageNum === 0) setTotalMatching(total);
      } catch (err) {
        console.error('Error fetching tenders:', err);
        setError('Impossible de charger les marchés.');
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  // Initial fetch and refetch on filter change
  useEffect(() => {
    setPage(0);
    fetchTenders(0, filters);
  }, [filters, fetchTenders]);

  function handleLoadMore() {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchTenders(nextPage, filters);
  }

  async function handleRefresh() {
    setRefreshing(true);
    setPage(0);
    await fetchTenders(0, filters);
    setRefreshing(false);
  }

  async function handleSave(tender: TenderWithScore) {
    setViewCount((c) => c + 1);
    try {
      await fetch('/api/saved-tenders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tender_id: tender.id }),
      });
    } catch (err) {
      console.error('Error saving tender:', err);
    }
  }

  async function handleDismiss(tender: TenderWithScore) {
    setViewCount((c) => c + 1);
    try {
      await fetch('/api/dismissed-tenders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tender_id: tender.id }),
      });
    } catch (err) {
      console.error('Error dismissing tender:', err);
    }
  }

  function handleAnalyze(tender: TenderWithScore) {
    // Land on the read-only detail page first. From there, the user can
    // launch the AI analysis deliberately — avoids burning credits on
    // accidental taps.
    router.push(`/tender/${tender.id}`);
  }

  function handleFiltersChange(newFilters: FeedFiltersState) {
    setFilters(newFilters);
  }

  // ---- Save-search handlers ----

  function handleOpenSaveDialog() {
    // Seed a sensible default name from the filter chips so the user
    // usually only has to click "Enregistrer" once.
    const parts: string[] = [];
    if (filters.type !== 'all') parts.push(filters.type);
    if (filters.region !== 'Toutes') parts.push(filters.region);
    if (filters.budget !== 'all') parts.push(filters.budget);
    if (filters.deadline !== 'all') parts.push(filters.deadline);
    setSaveName(parts.join(' · ').slice(0, 80));
    setSaveError(null);
    setSaveOpen(true);
  }

  async function handleSaveSearch() {
    const name = saveName.trim();
    if (!name) {
      setSaveError('Donnez un nom à votre alerte.');
      return;
    }
    setSaveBusy(true);
    setSaveError(null);
    try {
      const res = await fetch('/api/saved-searches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, filters }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setSaveError(body.error ?? 'Erreur lors de l’enregistrement.');
        return;
      }
      setSaveOpen(false);
      setSaveToast(true);
      setTimeout(() => setSaveToast(false), 2800);
    } catch {
      setSaveError('Erreur réseau. Veuillez réessayer.');
    } finally {
      setSaveBusy(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-bg-primary pb-20">
      {/* Header */}
      <header className="safe-top border-b border-border bg-bg-primary/80 backdrop-blur-xl">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-baseline gap-3">
            <h1 className="text-lg font-bold font-[family-name:var(--font-display)]">
              Radar
            </h1>
            {totalMatching !== null && tenders.length > 0 && (
              <span className="text-xs text-text-muted">
                {Math.min(viewCount, tenders.length)} / {totalMatching} marchés
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {plan === 'free' && (
              <span className="rounded-full bg-bg-card px-3 py-1 text-xs font-medium text-text-secondary">
                {remainingViews}/{FREE_TIER_LIMIT} ce mois
              </span>
            )}
            <button
              onClick={handleRefresh}
              disabled={refreshing || loading}
              aria-label="Rafraîchir le feed"
              className="flex size-9 items-center justify-center rounded-full bg-bg-card text-text-secondary transition-colors hover:bg-bg-card-hover hover:text-text-primary disabled:opacity-50"
            >
              <RotateCw
                className={`size-4 ${refreshing ? 'animate-spin' : ''}`}
              />
            </button>
          </div>
        </div>

        {/* Filters */}
        <FeedFilters
          filters={filters}
          onChange={handleFiltersChange}
          onSaveSearch={handleOpenSaveDialog}
        />
      </header>

      {/* Card stack / states */}
      <main className="flex flex-1 flex-col pt-4">
        {error ? (
          <ErrorState
            onRetry={() => {
              setPage(0);
              fetchTenders(0, filters);
            }}
          />
        ) : loading && tenders.length === 0 ? (
          <FeedSkeleton />
        ) : !loading && tenders.length === 0 ? (
          <EmptyState />
        ) : (
          <CardStack
            tenders={tenders}
            loading={loading}
            onSave={handleSave}
            onDismiss={handleDismiss}
            onAnalyze={handleAnalyze}
            onLoadMore={handleLoadMore}
          />
        )}
      </main>

      {/* Save-search modal */}
      <Modal
        open={saveOpen}
        onClose={() => setSaveOpen(false)}
        title="Enregistrer cette recherche"
      >
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            Vous recevrez une notification push quand de nouveaux marchés
            correspondant à ces filtres seront publiés.
          </p>
          <Input
            label="Nom de l'alerte"
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            placeholder="HVAC en Hainaut sous 200k"
            icon={<BellPlus className="size-4" />}
            maxLength={80}
            autoFocus
          />
          {saveError && (
            <p
              className="rounded-lg bg-accent-red-soft p-3 text-sm text-accent-red"
              role="alert"
            >
              {saveError}
            </p>
          )}
          <div className="flex gap-3">
            <Button
              variant="secondary"
              size="md"
              fullWidth
              onClick={() => setSaveOpen(false)}
            >
              Annuler
            </Button>
            <Button
              variant="primary"
              size="md"
              fullWidth
              loading={saveBusy}
              onClick={handleSaveSearch}
            >
              Enregistrer
            </Button>
          </div>
        </div>
      </Modal>

      {/* Save-success toast */}
      <AnimatePresence>
        {saveToast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            role="status"
            aria-live="polite"
            className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 flex items-center gap-2 rounded-full border border-accent-green/30 bg-accent-green-soft px-4 py-2.5 text-sm font-medium text-accent-green shadow-lg"
          >
            <CheckCircle2 className="size-4" />
            Alerte enregistrée
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom navigation */}
      <BottomNav />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  State components                                                          */
/* -------------------------------------------------------------------------- */

function FeedSkeleton() {
  return (
    <div
      className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 pb-6"
      aria-busy="true"
      aria-label="Chargement des marchés"
    >
      {Array.from({ length: 2 }).map((_, i) => (
        <CardSkeleton key={i} lines={4} />
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <div className="relative">
        <div className="flex size-20 items-center justify-center rounded-3xl bg-bg-card">
          <RadarIcon className="size-9 text-accent-blue" />
        </div>
        <span
          aria-hidden="true"
          className="absolute inset-0 -z-10 animate-pulse rounded-3xl bg-accent-blue/10"
        />
      </div>
      <div>
        <h2 className="font-[family-name:var(--font-display)] text-base font-semibold text-text-primary">
          Aucun marché ne correspond encore
        </h2>
        <p className="mt-1.5 max-w-xs text-sm text-text-muted">
          Affinez votre profil pour nous aider à trouver les marchés les plus
          pertinents pour votre entreprise.
        </p>
      </div>
      <Link
        href="/profil"
        className="inline-flex items-center gap-2 rounded-xl bg-accent-blue px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-blue/90"
      >
        <SlidersHorizontal className="size-4" />
        Affiner mon profil
      </Link>
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-accent-red-soft text-accent-red">
        <AlertTriangle className="size-7" />
      </div>
      <div>
        <h2 className="font-[family-name:var(--font-display)] text-base font-semibold text-text-primary">
          Impossible de charger les marchés.
        </h2>
        <p className="mt-1 text-sm text-text-muted">
          Vérifiez votre connexion, puis réessayez.
        </p>
      </div>
      <Button
        variant="secondary"
        size="md"
        icon={<RotateCw className="size-4" />}
        onClick={onRetry}
      >
        Réessayer
      </Button>
    </div>
  );
}
