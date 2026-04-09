'use client';

import { useEffect, useState, useRef } from 'react';
import { Eye, Bookmark, Send, TrendingUp, TrendingDown } from 'lucide-react';
import clsx from 'clsx';

export interface DashboardStats {
  viewed: number;
  saved: number;
  submissions: number;
  conversionRate: number;
  conversionTrend: 'up' | 'down' | 'flat';
}

interface StatCardConfig {
  key: keyof Pick<DashboardStats, 'viewed' | 'saved' | 'submissions' | 'conversionRate'>;
  label: string;
  icon: typeof Eye;
  gradient: string;
  iconColor: string;
  suffix?: string;
}

const STAT_CARDS: StatCardConfig[] = [
  {
    key: 'viewed',
    label: 'Vus',
    icon: Eye,
    gradient: 'from-accent-blue/10 to-accent-blue/5',
    iconColor: 'text-accent-blue',
  },
  {
    key: 'saved',
    label: 'Sauvegardés',
    icon: Bookmark,
    gradient: 'from-accent-green/10 to-accent-green/5',
    iconColor: 'text-accent-green',
  },
  {
    key: 'submissions',
    label: 'Soumissions',
    icon: Send,
    gradient: 'from-accent-orange/10 to-accent-orange/5',
    iconColor: 'text-accent-orange',
  },
  {
    key: 'conversionRate',
    label: 'Conversion',
    icon: TrendingUp,
    gradient: 'from-accent-blue/10 to-accent-green/5',
    iconColor: 'text-accent-green',
    suffix: '%',
  },
];

function useCountUp(target: number, duration = 600) {
  const [value, setValue] = useState(0);
  const prevTarget = useRef(0);

  useEffect(() => {
    const from = prevTarget.current;
    prevTarget.current = target;

    let frame: number;
    const start = performance.now();

    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(from + (target - from) * eased));

      if (progress < 1) {
        frame = requestAnimationFrame(animate);
      }
    };

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  return value;
}

function StatCard({
  config,
  value,
  trend,
}: {
  config: StatCardConfig;
  value: number;
  trend?: 'up' | 'down' | 'flat';
}) {
  const displayValue = useCountUp(value);
  const Icon = config.icon;

  return (
    <div
      className={clsx(
        'relative flex-shrink-0 w-[140px] rounded-xl border border-border bg-gradient-to-br p-3.5',
        config.gradient,
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <div
          className={clsx(
            'flex size-8 items-center justify-center rounded-lg bg-bg-card/60',
            config.iconColor,
          )}
        >
          <Icon className="size-4" />
        </div>
        {config.key === 'conversionRate' && trend && trend !== 'flat' && (
          <span
            className={clsx(
              'flex items-center gap-0.5 text-xs font-medium',
              trend === 'up' ? 'text-accent-green' : 'text-accent-red',
            )}
          >
            {trend === 'up' ? (
              <TrendingUp className="size-3" />
            ) : (
              <TrendingDown className="size-3" />
            )}
          </span>
        )}
      </div>
      <p className="text-xl font-bold font-display text-text-primary tabular-nums">
        {displayValue}
        {config.suffix && (
          <span className="text-sm font-medium text-text-secondary ml-0.5">
            {config.suffix}
          </span>
        )}
      </p>
      <p className="text-xs text-text-muted mt-0.5">{config.label}</p>
    </div>
  );
}

export interface StatsCardsProps {
  stats: DashboardStats;
}

export function StatsCards({ stats }: StatsCardsProps) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-none">
      {STAT_CARDS.map((config) => (
        <StatCard
          key={config.key}
          config={config}
          value={stats[config.key]}
          trend={config.key === 'conversionRate' ? stats.conversionTrend : undefined}
        />
      ))}
    </div>
  );
}

export function StatsCardsSkeleton() {
  return (
    <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-none">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="flex-shrink-0 w-[140px] rounded-xl border border-border bg-bg-card p-3.5 animate-pulse"
        >
          <div className="size-8 rounded-lg bg-bg-card-hover mb-2" />
          <div className="h-6 w-12 rounded bg-bg-card-hover mb-1" />
          <div className="h-3 w-16 rounded bg-bg-card-hover" />
        </div>
      ))}
    </div>
  );
}
