'use client';

import { useState } from 'react';
import {
  motion,
  useMotionValue,
  useTransform,
  type PanInfo,
} from 'framer-motion';
import {
  X,
  Bookmark,
  Search,
  Clock,
  MapPin,
  Building2,
  Euro,
  Check,
} from 'lucide-react';
import clsx from 'clsx';
import { Badge } from '@/components/ui/badge';
import type { TenderWithScore, TenderType } from '@/types/database';

const SWIPE_THRESHOLD = 100;

const tenderTypeConfig: Record<
  TenderType,
  { label: string; color: 'blue' | 'green' | 'orange' }
> = {
  works: { label: 'Travaux', color: 'blue' },
  services: { label: 'Services', color: 'green' },
  supplies: { label: 'Fournitures', color: 'orange' },
};

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-accent-green';
  if (score >= 60) return 'text-accent-blue';
  if (score >= 40) return 'text-accent-orange';
  return 'text-accent-red';
}

function getScoreRingColor(score: number): string {
  if (score >= 80) return 'stroke-accent-green';
  if (score >= 60) return 'stroke-accent-blue';
  if (score >= 40) return 'stroke-accent-orange';
  return 'stroke-accent-red';
}

function formatDeadline(deadline: string): string {
  const deadlineDate = new Date(deadline);
  const now = new Date();
  const diff = deadlineDate.getTime() - now.getTime();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

  if (days < 0) return 'Expiré';
  if (days === 0) return "Aujourd'hui";
  if (days === 1) return 'Demain';
  if (days < 7) return `${days} jours`;
  if (days < 30) return `${Math.ceil(days / 7)} sem.`;
  return `${Math.ceil(days / 30)} mois`;
}

function formatValue(value: number | null, currency: string): string {
  if (value === null) return 'Non spécifié';
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M ${currency}`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(0)}K ${currency}`;
  }
  return `${value.toLocaleString('fr-BE')} ${currency}`;
}

function ScoreBadge({ score }: { score: number }) {
  const circumference = 2 * Math.PI * 18;
  const filled = (score / 100) * circumference;

  return (
    <div className="relative flex size-12 items-center justify-center">
      <svg className="absolute size-12 -rotate-90" viewBox="0 0 40 40">
        <circle
          cx="20"
          cy="20"
          r="18"
          fill="none"
          className="stroke-border"
          strokeWidth="2.5"
        />
        <circle
          cx="20"
          cy="20"
          r="18"
          fill="none"
          className={getScoreRingColor(score)}
          strokeWidth="2.5"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - filled}
          strokeLinecap="round"
        />
      </svg>
      <span
        className={clsx(
          'text-xs font-bold font-[family-name:var(--font-display)]',
          getScoreColor(score),
        )}
      >
        {score}
      </span>
    </div>
  );
}

export interface TenderCardProps {
  tender: TenderWithScore;
  onSave: (tender: TenderWithScore) => void;
  onDismiss: (tender: TenderWithScore) => void;
  onAnalyze?: (tender: TenderWithScore) => void;
  isTop?: boolean;
}

export function TenderCard({
  tender,
  onSave,
  onDismiss,
  onAnalyze,
  isTop = true,
}: TenderCardProps) {
  const [exitDirection, setExitDirection] = useState<'left' | 'right' | null>(
    null,
  );

  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 0, 200], [-12, 0, 12]);
  const saveOpacity = useTransform(x, [0, SWIPE_THRESHOLD], [0, 1]);
  const dismissOpacity = useTransform(x, [-SWIPE_THRESHOLD, 0], [1, 0]);

  const typeConfig = tenderTypeConfig[tender.tender_type];
  const deadlineText = formatDeadline(tender.deadline);
  const [now] = useState(() => Date.now());
  const deadlineDays = Math.ceil(
    (new Date(tender.deadline).getTime() - now) / (1000 * 60 * 60 * 24),
  );
  const isUrgent = deadlineDays >= 0 && deadlineDays <= 3;

  function handleDragEnd(_: unknown, info: PanInfo) {
    if (info.offset.x > SWIPE_THRESHOLD) {
      setExitDirection('right');
      onSave(tender);
    } else if (info.offset.x < -SWIPE_THRESHOLD) {
      setExitDirection('left');
      onDismiss(tender);
    }
  }

  function handleSaveClick() {
    setExitDirection('right');
    onSave(tender);
  }

  function handleDismissClick() {
    setExitDirection('left');
    onDismiss(tender);
  }

  return (
    <motion.div
      className="absolute inset-x-0 top-0 touch-none"
      style={{ x, rotate, zIndex: isTop ? 10 : 0 }}
      drag={isTop ? 'x' : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.7}
      onDragEnd={handleDragEnd}
      initial={{ y: 40, opacity: 0, scale: 0.95 }}
      animate={
        exitDirection
          ? {
              x: exitDirection === 'right' ? 400 : -400,
              opacity: 0,
              rotate: exitDirection === 'right' ? 20 : -20,
              transition: { type: 'spring', stiffness: 300, damping: 30 },
            }
          : {
              y: 0,
              opacity: 1,
              scale: 1,
              transition: { type: 'spring', stiffness: 300, damping: 25 },
            }
      }
    >
      <div className="relative mx-auto w-full max-w-md">
        {/* Save overlay */}
        <motion.div
          className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center rounded-2xl border-2 border-accent-green bg-accent-green/10"
          style={{ opacity: saveOpacity }}
        >
          <div className="flex size-16 items-center justify-center rounded-full bg-accent-green">
            <Check className="size-8 text-white" strokeWidth={3} />
          </div>
        </motion.div>

        {/* Dismiss overlay */}
        <motion.div
          className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center rounded-2xl border-2 border-accent-red bg-accent-red/10"
          style={{ opacity: dismissOpacity }}
        >
          <div className="flex size-16 items-center justify-center rounded-full bg-accent-red">
            <X className="size-8 text-white" strokeWidth={3} />
          </div>
        </motion.div>

        {/* Card content */}
        <div className="rounded-2xl border border-border bg-bg-card p-5 shadow-lg shadow-black/20">
          {/* Header: score + type badge */}
          <div className="mb-4 flex items-start justify-between">
            <ScoreBadge score={tender.relevance_score} />
            <Badge color={typeConfig.color} size="md">
              {typeConfig.label}
            </Badge>
          </div>

          {/* Title */}
          <h3 className="mb-3 line-clamp-3 text-lg font-bold leading-snug text-text-primary font-[family-name:var(--font-display)]">
            {tender.title}
          </h3>

          {/* Meta info */}
          <div className="mb-4 space-y-2">
            <div className="flex items-center gap-2 text-sm text-text-secondary">
              <Building2 className="size-4 shrink-0 text-text-muted" />
              <span className="line-clamp-1">
                {tender.contracting_authority}
              </span>
            </div>

            <div className="flex items-center gap-2 text-sm text-text-secondary">
              <MapPin className="size-4 shrink-0 text-text-muted" />
              <span>{tender.region}</span>
            </div>

            <div className="flex items-center gap-2 text-sm text-text-secondary">
              <Euro className="size-4 shrink-0 text-text-muted" />
              <span>
                {formatValue(tender.estimated_value, tender.currency)}
              </span>
            </div>

            <div
              className={clsx(
                'flex items-center gap-2 text-sm',
                isUrgent ? 'text-accent-red' : 'text-text-secondary',
              )}
            >
              <Clock
                className={clsx(
                  'size-4 shrink-0',
                  isUrgent ? 'text-accent-red' : 'text-text-muted',
                )}
              />
              <span className={clsx(isUrgent && 'font-semibold')}>
                {deadlineText}
                {isUrgent && ' - Urgent'}
              </span>
            </div>
          </div>

          {/* Description preview */}
          <p className="mb-5 line-clamp-2 text-sm leading-relaxed text-text-muted">
            {tender.description}
          </p>

          {/* Action buttons */}
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={handleDismissClick}
              className="flex size-12 items-center justify-center rounded-full border border-border bg-bg-card-hover text-text-secondary transition-colors hover:border-accent-red hover:text-accent-red active:scale-95"
              aria-label="Passer ce marché"
              type="button"
            >
              <X className="size-5" />
            </button>

            <button
              onClick={() => onAnalyze?.(tender)}
              className="flex h-10 items-center gap-2 rounded-full border border-border bg-bg-card-hover px-4 text-sm font-medium text-text-secondary transition-colors hover:border-accent-blue hover:text-accent-blue active:scale-95"
              type="button"
            >
              <Search className="size-4" />
              Analyser
            </button>

            <button
              onClick={handleSaveClick}
              className="flex size-12 items-center justify-center rounded-full border border-border bg-bg-card-hover text-text-secondary transition-colors hover:border-accent-green hover:text-accent-green active:scale-95"
              aria-label="Sauvegarder ce marché"
              type="button"
            >
              <Bookmark className="size-5" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
