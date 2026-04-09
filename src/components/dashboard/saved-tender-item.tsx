'use client';

import { useState, useRef } from 'react';
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useTransform,
  type PanInfo,
} from 'framer-motion';
import {
  ChevronDown,
  Building2,
  Search,
  FileText,
  RefreshCw,
  Trash2,
  Star,
} from 'lucide-react';
import clsx from 'clsx';
import { Badge, type BadgeColor } from '@/components/ui/badge';
import { Countdown } from '@/components/ui/countdown';
import { ScoreBadge } from '@/components/ui/score-badge';
import type { SavedTender, SavedTenderStatus } from '@/types/database';

const SWIPE_THRESHOLD = 80;

const STATUS_CONFIG: Record<
  SavedTenderStatus,
  { label: string; color: BadgeColor; icon?: typeof Star }
> = {
  new: { label: 'Nouveau', color: 'blue' },
  analyzing: { label: 'En analyse', color: 'orange' },
  drafting: { label: 'Soumission en cours', color: 'orange' },
  submitted: { label: 'Soumis', color: 'green' },
  won: { label: 'Gagné', color: 'green', icon: Star },
  lost: { label: 'Perdu', color: 'red' },
};

const STATUS_OPTIONS: { value: SavedTenderStatus; label: string }[] = [
  { value: 'new', label: 'Nouveau' },
  { value: 'analyzing', label: 'En analyse' },
  { value: 'drafting', label: 'Soumission en cours' },
  { value: 'submitted', label: 'Soumis' },
  { value: 'won', label: 'Gagné' },
  { value: 'lost', label: 'Perdu' },
];

export interface SavedTenderItemProps {
  savedTender: SavedTender;
  onStatusChange: (id: string, status: SavedTenderStatus) => void;
  onDelete: (id: string) => void;
}

export function SavedTenderItem({
  savedTender,
  onStatusChange,
  onDelete,
}: SavedTenderItemProps) {
  const [expanded, setExpanded] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [swiped, setSwiped] = useState(false);
  const statusMenuRef = useRef<HTMLDivElement>(null);

  const x = useMotionValue(0);
  const deleteOpacity = useTransform(x, [-SWIPE_THRESHOLD, 0], [1, 0]);
  const deleteScale = useTransform(x, [-SWIPE_THRESHOLD, 0], [1, 0.8]);

  const tender = savedTender.tender;
  const statusConfig = STATUS_CONFIG[savedTender.status];
  const analysis = savedTender.ai_analysis;

  function handleDragEnd(_: unknown, info: PanInfo) {
    if (info.offset.x < -SWIPE_THRESHOLD) {
      setSwiped(true);
    }
  }

  function handleConfirmDelete() {
    onDelete(savedTender.id);
  }

  function handleCancelSwipe() {
    setSwiped(false);
  }

  function handleStatusSelect(status: SavedTenderStatus) {
    onStatusChange(savedTender.id, status);
    setShowStatusMenu(false);
  }

  if (!tender) return null;

  return (
    <div className="relative overflow-hidden rounded-xl">
      {/* Delete action background */}
      <motion.div
        className="absolute inset-y-0 right-0 flex items-center justify-end pr-4 bg-accent-red rounded-xl"
        style={{ opacity: deleteOpacity, scale: deleteScale }}
      >
        <Trash2 className="size-5 text-white" />
      </motion.div>

      {/* Swiped state: confirm/cancel */}
      <AnimatePresence>
        {swiped && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-10 flex items-center justify-end gap-2 rounded-xl bg-accent-red px-4"
          >
            <span className="text-sm text-white mr-auto font-medium">Supprimer ?</span>
            <button
              onClick={handleCancelSwipe}
              className="h-8 px-3 rounded-lg bg-white/20 text-sm text-white font-medium hover:bg-white/30 transition-colors cursor-pointer"
            >
              Annuler
            </button>
            <button
              onClick={handleConfirmDelete}
              className="h-8 px-3 rounded-lg bg-white text-sm text-accent-red font-medium hover:bg-white/90 transition-colors cursor-pointer"
            >
              Supprimer
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main card */}
      <motion.div
        style={{ x }}
        drag={!swiped ? 'x' : false}
        dragConstraints={{ left: -120, right: 0 }}
        dragElastic={0.3}
        onDragEnd={handleDragEnd}
        className="relative touch-pan-y"
      >
        <div
          className={clsx(
            'rounded-xl border border-border bg-bg-card transition-colors duration-150',
            expanded && 'bg-bg-card-hover',
          )}
        >
          {/* Compact row */}
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            className="flex w-full items-center gap-3 p-3.5 text-left cursor-pointer"
          >
            {/* Score */}
            <ScoreBadge
              score={analysis?.relevance_score ?? 0}
              size="sm"
              animated={false}
            />

            {/* Title and meta */}
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-text-primary line-clamp-1 font-display">
                {tender.title}
              </h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Building2 className="size-3 text-text-muted shrink-0" />
                <span className="text-xs text-text-secondary line-clamp-1">
                  {tender.contracting_authority}
                </span>
              </div>
            </div>

            {/* Right side: status + deadline + chevron */}
            <div className="flex flex-col items-end gap-1.5 shrink-0">
              <Badge color={statusConfig.color} size="sm">
                {statusConfig.icon && (
                  <Star className="size-2.5 mr-0.5 fill-current" />
                )}
                {statusConfig.label}
              </Badge>
              <Countdown deadline={tender.deadline} />
            </div>

            <ChevronDown
              className={clsx(
                'size-4 text-text-muted shrink-0 transition-transform duration-200',
                expanded && 'rotate-180',
              )}
            />
          </button>

          {/* Expanded content */}
          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: 'easeInOut' }}
                className="overflow-hidden"
              >
                <div className="px-3.5 pb-3.5 pt-0 space-y-3">
                  {/* Separator */}
                  <div className="h-px bg-border" />

                  {/* AI Analysis summary */}
                  {analysis ? (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-text-secondary uppercase tracking-wider">
                        Analyse IA
                      </p>
                      <p className="text-sm text-text-secondary leading-relaxed">
                        {analysis.summary}
                      </p>
                      {analysis.recommendation && (
                        <Badge
                          color={
                            analysis.recommendation === 'apply'
                              ? 'green'
                              : analysis.recommendation === 'watch'
                                ? 'orange'
                                : 'red'
                          }
                          size="sm"
                        >
                          {analysis.recommendation === 'apply'
                            ? 'Candidature recommandée'
                            : analysis.recommendation === 'watch'
                              ? 'À surveiller'
                              : 'Non recommandé'}
                        </Badge>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-text-muted italic">
                      Aucune analyse disponible. Lancez une analyse pour en savoir plus.
                    </p>
                  )}

                  {/* Quick actions */}
                  <div className="flex gap-2 flex-wrap">
                    <button
                      type="button"
                      className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border bg-bg-input text-xs font-medium text-text-secondary hover:bg-bg-card-hover hover:text-text-primary transition-colors cursor-pointer"
                    >
                      <Search className="size-3.5" />
                      Analyser
                    </button>
                    <button
                      type="button"
                      className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border bg-bg-input text-xs font-medium text-text-secondary hover:bg-bg-card-hover hover:text-text-primary transition-colors cursor-pointer"
                    >
                      <FileText className="size-3.5" />
                      Rédiger
                    </button>

                    {/* Status change dropdown */}
                    <div className="relative" ref={statusMenuRef}>
                      <button
                        type="button"
                        onClick={() => setShowStatusMenu((prev) => !prev)}
                        className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border bg-bg-input text-xs font-medium text-text-secondary hover:bg-bg-card-hover hover:text-text-primary transition-colors cursor-pointer"
                      >
                        <RefreshCw className="size-3.5" />
                        Statut
                      </button>

                      <AnimatePresence>
                        {showStatusMenu && (
                          <motion.div
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            transition={{ duration: 0.15 }}
                            className="absolute bottom-full left-0 mb-1 z-20 w-44 rounded-lg border border-border bg-bg-card shadow-xl py-1"
                          >
                            {STATUS_OPTIONS.map((option) => (
                              <button
                                key={option.value}
                                type="button"
                                onClick={() => handleStatusSelect(option.value)}
                                className={clsx(
                                  'w-full px-3 py-1.5 text-xs text-left transition-colors cursor-pointer',
                                  savedTender.status === option.value
                                    ? 'text-accent-blue bg-accent-blue-soft'
                                    : 'text-text-primary hover:bg-bg-card-hover',
                                )}
                              >
                                {option.label}
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}

export function SavedTenderItemSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-bg-card p-3.5 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="size-8 rounded-full bg-bg-card-hover" />
        <div className="flex-1 space-y-1.5">
          <div className="h-4 w-3/4 rounded bg-bg-card-hover" />
          <div className="h-3 w-1/2 rounded bg-bg-card-hover" />
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <div className="h-5 w-16 rounded-full bg-bg-card-hover" />
          <div className="h-5 w-10 rounded-full bg-bg-card-hover" />
        </div>
      </div>
    </div>
  );
}
