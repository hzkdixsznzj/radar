'use client';

import { useState, useCallback, useEffect } from 'react';
import { CardStack } from '@/components/feed/card-stack';
import {
  FeedFilters,
  type FeedFiltersState,
} from '@/components/feed/feed-filters';
import { BottomNav } from '@/components/layout/bottom-nav';
import type { TenderWithScore } from '@/types/database';

const DEFAULT_FILTERS: FeedFiltersState = {
  type: 'all',
  region: 'Toutes',
  budget: 'all',
  deadline: 'all',
};

const FREE_TIER_LIMIT = 5;

export default function FeedPage() {
  const [tenders, setTenders] = useState<TenderWithScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FeedFiltersState>(DEFAULT_FILTERS);
  const [viewCount, setViewCount] = useState(0);
  const [page, setPage] = useState(0);
  // TODO: fetch actual plan from user subscription
  const [plan] = useState<'free' | 'pro' | 'business'>('free');

  const remainingViews = Math.max(0, FREE_TIER_LIMIT - viewCount);

  const fetchTenders = useCallback(
    async (pageNum: number, currentFilters: FeedFiltersState) => {
      setLoading(true);
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

        const data: TenderWithScore[] = await res.json();

        setTenders((prev) =>
          pageNum === 0 ? data : [...prev, ...data],
        );
      } catch (err) {
        console.error('Error fetching tenders:', err);
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

      {/* Card stack */}
      <main className="flex flex-1 flex-col pt-4">
        <CardStack
          tenders={tenders}
          loading={loading}
          onSave={handleSave}
          onDismiss={handleDismiss}
          onAnalyze={handleAnalyze}
          onLoadMore={handleLoadMore}
        />
      </main>

      {/* Bottom navigation */}
      <BottomNav />
    </div>
  );
}
