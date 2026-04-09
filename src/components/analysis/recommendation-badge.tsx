'use client';

import { motion } from 'framer-motion';
import { CheckCircle, Eye, XCircle } from 'lucide-react';
import clsx from 'clsx';
import type { AIAnalysis } from '@/types/database';

type Recommendation = AIAnalysis['recommendation'];

const config: Record<
  Recommendation,
  {
    label: string;
    icon: typeof CheckCircle;
    bg: string;
    text: string;
    softBg: string;
  }
> = {
  apply: {
    label: 'POSTULER',
    icon: CheckCircle,
    bg: 'bg-accent-green',
    text: 'text-accent-green',
    softBg: 'bg-accent-green-soft',
  },
  watch: {
    label: 'SURVEILLER',
    icon: Eye,
    bg: 'bg-accent-orange',
    text: 'text-accent-orange',
    softBg: 'bg-accent-orange-soft',
  },
  skip: {
    label: 'PASSER',
    icon: XCircle,
    bg: 'bg-accent-red',
    text: 'text-accent-red',
    softBg: 'bg-accent-red-soft',
  },
};

export interface RecommendationBadgeProps {
  recommendation: Recommendation;
  reason: string;
  className?: string;
}

export function RecommendationBadge({
  recommendation,
  reason,
  className,
}: RecommendationBadgeProps) {
  const cfg = config[recommendation];
  const Icon = cfg.icon;

  return (
    <motion.div
      initial={{ scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.4 }}
      className={clsx('flex flex-col items-center gap-3', className)}
    >
      <div
        className={clsx(
          'inline-flex items-center gap-2.5 rounded-full px-6 py-2.5',
          cfg.bg,
          'text-white font-display font-bold text-lg tracking-wide',
        )}
      >
        <Icon className="size-5" />
        {cfg.label}
      </div>
      <p className={clsx('text-sm text-center max-w-sm', cfg.text)}>{reason}</p>
    </motion.div>
  );
}
