'use client';

import { useState, useCallback, useEffect } from 'react';
import { AlertTriangle, Radar as RadarIcon, RotateCw, SlidersHorizontal } from 'lucide-react';
import Link from 'next/link';
import { CardStack } from '@/components/feed/card-stack';
import {
  FeedFilters,
  type FeedFiltersState,
} from '@/components/feed/feed-filters';
import { BottomNav } from '@/components/layout/bottom-nav';
import { Button } from '@/components/ui/button';
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
  const [tenders, setTenders] = useState<TenderWithScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FeedFiltersState>(DEFAULT_FILTERS);
  const [viewCount, setViewCount] = useState(0);
  const [page, setPage] = useState(0);
  // TODO: fetch actual plan from user subscription
  const [plan] = useState<'free' | 'pro' | 'business'>('free');

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

        setTenders((prev) => (pageNum === 0 ? data : [...prev, ...data]));
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
    // TODO: navigate to analysis page or open analysis modal
    console.log('Analyze tender:', tender.id);
  }

  function handleFiltersChange(newFilters: FeedFiltersState) {
    setFilters(newFilters);
  }

  return (
    <div className="flex min-h-dvh flex-col bg-bg-primary pb-20">
      {/* Header */}
      <header className="safe-top border-b border-border bg-bg-primary/80 backdrop-blur-xl">
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="text-lg font-bold font-[family-name:var(--font-display)]">
            Radar
          </h1>
          {plan === 'free' && (
            <span className="rounded-full bg-bg-card px-3 py-1 text-xs font-medium text-text-secondary">
              {remainingViews}/{FREE_TIER_LIMIT} marchés restants ce mois
            </span>
          )}
        </div>

        {/* Filters */}
        <FeedFilters filters={filters} onChange={handleFiltersChange} />
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
