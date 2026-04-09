'use client';

import { motion } from 'framer-motion';
import clsx from 'clsx';
import type { AIAnalysis } from '@/types/database';

type CompetitionLevel = AIAnalysis['competition_level'];

const levels: { key: CompetitionLevel; label: string }[] = [
  { key: 'low', label: 'Faible' },
  { key: 'medium', label: 'Moyen' },
  { key: 'high', label: 'Eleve' },
];

const activeColorMap: Record<CompetitionLevel, string> = {
  low: 'bg-accent-green',
  medium: 'bg-accent-orange',
  high: 'bg-accent-red',
};

const activeLabelMap: Record<CompetitionLevel, string> = {
  low: 'text-accent-green',
  medium: 'text-accent-orange',
  high: 'text-accent-red',
};

export interface CompetitionGaugeProps {
  level: CompetitionLevel;
  className?: string;
}

export function CompetitionGauge({ level, className }: CompetitionGaugeProps) {
  return (
    <div className={clsx('w-full', className)}>
      <div className="flex gap-1.5">
        {levels.map((segment, i) => {
          const isActive =
            levels.findIndex((l) => l.key === level) >= i;

          return (
            <motion.div
              key={segment.key}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.4, delay: 0.1 * i, ease: 'easeOut' }}
              className="flex-1 origin-left"
            >
              <div
                className={clsx(
                  'h-3 rounded-full transition-colors duration-300',
                  isActive ? activeColorMap[level] : 'bg-border',
                )}
              />
            </motion.div>
          );
        })}
      </div>
      <div className="mt-2 flex justify-between">
        {levels.map((segment) => (
          <span
            key={segment.key}
            className={clsx(
              'text-xs font-medium transition-colors duration-300',
              segment.key === level
                ? activeLabelMap[level]
                : 'text-text-muted',
            )}
          >
            {segment.label}
          </span>
        ))}
      </div>
    </div>
  );
}
