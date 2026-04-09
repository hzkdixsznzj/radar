'use client';

import { useState, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Loader2, Radar } from 'lucide-react';
import { TenderCard } from './tender-card';
import type { TenderWithScore } from '@/types/database';

export interface CardStackProps {
  tenders: TenderWithScore[];
  loading: boolean;
  onSave: (tender: TenderWithScore) => void;
  onDismiss: (tender: TenderWithScore) => void;
  onAnalyze?: (tender: TenderWithScore) => void;
  onLoadMore: () => void;
}

export function CardStack({
  tenders,
  loading,
  onSave,
  onDismiss,
  onAnalyze,
  onLoadMore,
}: CardStackProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const visibleTenders = tenders.slice(currentIndex, currentIndex + 2);

  const handleAction = useCallback(
    (action: 'save' | 'dismiss', tender: TenderWithScore) => {
      if (action === 'save') {
        onSave(tender);
      } else {
        onDismiss(tender);
      }

      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);

      // Load more when running low
      if (tenders.length - nextIndex < 3) {
        onLoadMore();
      }
    },
    [currentIndex, tenders.length, onSave, onDismiss, onLoadMore],
  );

  // Loading state
  if (loading && tenders.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-16">
        <div className="relative">
          <Radar className="size-12 animate-spin text-accent-blue" style={{ animationDuration: '3s' }} />
          <div className="absolute inset-0 animate-ping rounded-full bg-accent-blue/20" style={{ animationDuration: '2s' }} />
        </div>
        <p className="text-sm text-text-secondary">
          Recherche de marchés en cours...
        </p>
      </div>
    );
  }

  // Empty state
  if (!loading && visibleTenders.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
        <div className="flex size-16 items-center justify-center rounded-full bg-bg-card">
          <Radar className="size-8 text-text-muted" />
        </div>
        <div>
          <p className="mb-1 font-medium text-text-primary font-[family-name:var(--font-display)]">
            Pas de nouveaux marchés
          </p>
          <p className="text-sm text-text-muted">
            Pas de nouveaux marchés pour le moment. Revenez plus tard!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative mx-auto w-full max-w-md flex-1 px-4" style={{ minHeight: 420 }}>
      <AnimatePresence mode="popLayout">
        {visibleTenders.map((tender, i) => (
          <TenderCard
            key={tender.id}
            tender={tender}
            isTop={i === 0}
            onSave={(t) => handleAction('save', t)}
            onDismiss={(t) => handleAction('dismiss', t)}
            onAnalyze={onAnalyze}
          />
        ))}
      </AnimatePresence>

      {/* Loading indicator when fetching more */}
      {loading && tenders.length > 0 && (
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-center py-4">
          <Loader2 className="size-5 animate-spin text-text-muted" />
        </div>
      )}
    </div>
  );
}
