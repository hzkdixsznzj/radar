'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowDownAZ,
  ArrowUpDown,
  Calendar,
  Flame,
  Clock,
  CheckCircle2,
  ArrowRight,
  Inbox,
} from 'lucide-react';
import clsx from 'clsx';
import { BottomNav } from '@/components/layout/bottom-nav';
import { Badge } from '@/components/ui/badge';
import {
  StatsCards,
  StatsCardsSkeleton,
  type DashboardStats,
} from '@/components/dashboard/stats-cards';
import {
  SavedTenderItem,
  SavedTenderItemSkeleton,
} from '@/components/dashboard/saved-tender-item';
import type { SavedTender, SavedTenderStatus, Submission } from '@/types/database';

type FilterTab = 'all' | SavedTenderStatus;
type SortKey = 'deadline' | 'score' | 'date' | 'status';

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'Tous' },
  { key: 'new', label: 'Nouveau' },
  { key: 'analyzing', label: 'En cours' },
  { key: 'submitted', label: 'Soumis' },
  { key: 'won', label: 'Terminé' },
];

const SORT_OPTIONS: { key: SortKey; label: string; icon: typeof Calendar }[] = [
  { key: 'deadline', label: 'Échéance', icon: Clock },
  { key: 'score', label: 'Score', icon: Flame },
  { key: 'date', label: 'Date ajout', icon: Calendar },
  { key: 'status', label: 'Statut', icon: ArrowDownAZ },
];

const STATUS_ORDER: Record<SavedTenderStatus, number> = {
  new: 0,
  analyzing: 1,
  drafting: 2,
  submitted: 3,
  won: 4,
  lost: 5,
};

const EMPTY_MESSAGES: Record<FilterTab, { title: string; description: string }> = {
  all: {
    title: 'Aucun marché sauvegardé',
    description: 'Parcourez le feed pour trouver des marchés pertinents.',
  },
  new: {
    title: 'Aucun nouveau marché',
    description: 'Les nouveaux marchés sauvegardés apparaîtront ici.',
  },
  analyzing: {
    title: 'Aucune analyse en cours',
    description: 'Lancez une analyse sur un marché sauvegardé.',
  },
  drafting: {
    title: 'Aucune soumission en cours',
    description: 'Commencez à rédiger une soumission.',
  },
  submitted: {
    title: 'Aucune soumission envoyée',
    description: 'Vos soumissions terminées apparaîtront ici.',
  },
  won: {
    title: 'Aucun marché terminé',
    description: 'Les marchés gagnés ou perdus apparaîtront ici.',
  },
  lost: {
    title: 'Aucun marché perdu',
    description: 'Les marchés perdus apparaîtront ici.',
  },
};

export default function DashboardPage() {
  const [savedTenders, setSavedTenders] = useState<SavedTender[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>('all');
  const [sortBy, setSortBy] = useState<SortKey>('deadline');
  const [showSortMenu, setShowSortMenu] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [tendersRes, submissionsRes] = await Promise.all([
        fetch('/api/saved-tenders'),
        fetch('/api/submissions').catch(() => null),
      ]);

      if (tendersRes.ok) {
        const data = await tendersRes.json();
        setSavedTenders(data.saved_tenders ?? []);
      }

      if (submissionsRes?.ok) {
        const data = await submissionsRes.json();
        setSubmissions(data.submissions ?? []);
      }
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filter and sort
  const filteredTenders = useMemo(() => {
    let result = savedTenders;

    if (filter !== 'all') {
      if (filter === 'analyzing') {
        result = result.filter(
          (t) => t.status === 'analyzing' || t.status === 'drafting',
        );
      } else if (filter === 'won') {
        result = result.filter(
          (t) => t.status === 'won' || t.status === 'lost',
        );
      } else {
        result = result.filter((t) => t.status === filter);
      }
    }

    return [...result].sort((a, b) => {
      switch (sortBy) {
        case 'deadline': {
          const da = a.tender?.deadline ?? '';
          const db = b.tender?.deadline ?? '';
          return da.localeCompare(db);
        }
        case 'score': {
          const sa = a.ai_analysis?.relevance_score ?? 0;
          const sb = b.ai_analysis?.relevance_score ?? 0;
          return sb - sa;
        }
        case 'date':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'status':
          return STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
        default:
          return 0;
      }
    });
  }, [savedTenders, filter, sortBy]);

  // Stats
  const stats: DashboardStats = useMemo(() => {
    const saved = savedTenders.length;
    const submissionCount = submissions.length;
    const won = savedTenders.filter((t) => t.status === 'won').length;
    const submitted = savedTenders.filter((t) => t.status === 'submitted').length;
    const total = won + submitted;
    const rate = total > 0 ? Math.round((won / total) * 100) : 0;

    return {
      viewed: saved + Math.round(saved * 2.5),
      saved,
      submissions: submissionCount,
      conversionRate: rate,
      conversionTrend: rate > 0 ? 'up' : 'flat',
    };
  }, [savedTenders, submissions]);

  // Handlers
  const handleStatusChange = useCallback(
    async (id: string, newStatus: SavedTenderStatus) => {
      setSavedTenders((prev) =>
        prev.map((t) => (t.id === id ? { ...t, status: newStatus } : t)),
      );

      try {
        const res = await fetch(`/api/saved-tenders/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus }),
        });

        if (!res.ok) {
          fetchData();
        }
      } catch {
        fetchData();
      }
    },
    [fetchData],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      setSavedTenders((prev) => prev.filter((t) => t.id !== id));

      try {
        const res = await fetch(`/api/saved-tenders/${id}`, {
          method: 'DELETE',
        });

        if (!res.ok) {
          fetchData();
        }
      } catch {
        fetchData();
      }
    },
    [fetchData],
  );

  return (
    <div className="min-h-dvh bg-bg-primary pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-bg-primary/80 backdrop-blur-xl border-b border-border safe-top">
        <div className="px-4 pt-4 pb-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold font-display text-text-primary">
                Mes opportunités
              </h1>
              {!loading && (
                <Badge color="blue" size="sm">
                  {savedTenders.length}
                </Badge>
              )}
            </div>

            {/* Sort toggle */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowSortMenu((prev) => !prev)}
                className="flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-text-secondary hover:bg-bg-card transition-colors cursor-pointer"
              >
                <ArrowUpDown className="size-4" />
                <span className="text-xs font-medium">
                  {SORT_OPTIONS.find((s) => s.key === sortBy)?.label}
                </span>
              </button>

              <AnimatePresence>
                {showSortMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-1 z-50 w-40 rounded-lg border border-border bg-bg-card shadow-xl py-1"
                  >
                    {SORT_OPTIONS.map((option) => {
                      const Icon = option.icon;
                      return (
                        <button
                          key={option.key}
                          type="button"
                          onClick={() => {
                            setSortBy(option.key);
                            setShowSortMenu(false);
                          }}
                          className={clsx(
                            'w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors cursor-pointer',
                            sortBy === option.key
                              ? 'text-accent-blue bg-accent-blue-soft'
                              : 'text-text-primary hover:bg-bg-card-hover',
                          )}
                        >
                          <Icon className="size-3.5" />
                          {option.label}
                        </button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Filter tabs */}
          <div className="flex gap-1.5 overflow-x-auto scrollbar-none -mx-4 px-4">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setFilter(tab.key)}
                className={clsx(
                  'shrink-0 h-8 px-3.5 rounded-full text-xs font-medium transition-colors cursor-pointer',
                  filter === tab.key
                    ? 'bg-accent-blue text-white'
                    : 'bg-bg-card text-text-secondary hover:bg-bg-card-hover',
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="px-4 pt-4 space-y-5">
        {/* Stats cards */}
        {loading ? (
          <StatsCardsSkeleton />
        ) : (
          <StatsCards stats={stats} />
        )}

        {/* Tender list */}
        <section>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <SavedTenderItemSkeleton key={i} />
              ))}
            </div>
          ) : filteredTenders.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-16 text-center"
            >
              <div className="flex size-16 items-center justify-center rounded-2xl bg-bg-card mb-4">
                <Inbox className="size-7 text-text-muted" />
              </div>
              <h3 className="text-base font-semibold text-text-primary font-display mb-1">
                {EMPTY_MESSAGES[filter].title}
              </h3>
              <p className="text-sm text-text-muted max-w-[240px]">
                {EMPTY_MESSAGES[filter].description}
              </p>
            </motion.div>
          ) : (
            <motion.div
              className="space-y-3"
              initial="hidden"
              animate="visible"
              variants={{
                visible: { transition: { staggerChildren: 0.05 } },
              }}
            >
              {filteredTenders.map((st) => (
                <motion.div
                  key={st.id}
                  variants={{
                    hidden: { opacity: 0, y: 12 },
                    visible: { opacity: 1, y: 0 },
                  }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                >
                  <SavedTenderItem
                    savedTender={st}
                    onStatusChange={handleStatusChange}
                    onDelete={handleDelete}
                  />
                </motion.div>
              ))}
            </motion.div>
          )}
        </section>

        {/* Submissions link */}
        {!loading && submissions.length > 0 && (
          <div className="pt-2 pb-4">
            <a
              href="/submissions"
              className="flex items-center justify-between p-4 rounded-xl border border-border bg-bg-card hover:bg-bg-card-hover transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-accent-green-soft">
                  <CheckCircle2 className="size-5 text-accent-green" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-text-primary font-display">
                    Voir les soumissions
                  </p>
                  <p className="text-xs text-text-muted">
                    {submissions.length} soumission{submissions.length > 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <ArrowRight className="size-4 text-text-muted group-hover:text-text-primary transition-colors" />
            </a>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
