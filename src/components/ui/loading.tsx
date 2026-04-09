'use client';

import clsx from 'clsx';

/* ------------------------------------------------------------------ */
/*  Radar Spinner                                                      */
/* ------------------------------------------------------------------ */

export interface RadarSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const spinnerSizes = {
  sm: 'size-8',
  md: 'size-12',
  lg: 'size-16',
} as const;

export function RadarSpinner({ size = 'md', className }: RadarSpinnerProps) {
  const dim = size === 'sm' ? 32 : size === 'md' ? 48 : 64;
  const cx = dim / 2;

  return (
    <div
      className={clsx(
        'relative inline-flex items-center justify-center',
        spinnerSizes[size],
        className,
      )}
      role="status"
      aria-label="Chargement"
    >
      <svg
        width={dim}
        height={dim}
        viewBox={`0 0 ${dim} ${dim}`}
        fill="none"
        className="animate-spin"
        style={{ animationDuration: '3s' }}
      >
        {/* Outer ring */}
        <circle
          cx={cx}
          cy={cx}
          r={cx - 2}
          stroke="var(--color-border)"
          strokeWidth="1.5"
          opacity="0.4"
        />
        {/* Middle ring */}
        <circle
          cx={cx}
          cy={cx}
          r={cx * 0.65}
          stroke="var(--color-border)"
          strokeWidth="1"
          opacity="0.3"
        />
        {/* Inner ring */}
        <circle
          cx={cx}
          cy={cx}
          r={cx * 0.35}
          stroke="var(--color-border)"
          strokeWidth="1"
          opacity="0.2"
        />
        {/* Sweep line */}
        <line
          x1={cx}
          y1={cx}
          x2={cx}
          y2={2}
          stroke="var(--color-accent-blue)"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.9"
        />
        {/* Sweep glow */}
        <circle cx={cx} cy={2} r={2} fill="var(--color-accent-blue)" />
      </svg>
      {/* Center dot */}
      <span className="absolute size-1.5 rounded-full bg-accent-blue animate-pulse" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Skeleton Loader                                                    */
/* ------------------------------------------------------------------ */

export interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={clsx(
        'rounded-lg bg-bg-card-hover animate-pulse',
        className,
      )}
      aria-hidden="true"
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Card Skeleton                                                      */
/* ------------------------------------------------------------------ */

export interface CardSkeletonProps {
  lines?: number;
  className?: string;
}

export function CardSkeleton({ lines = 3, className }: CardSkeletonProps) {
  return (
    <div
      className={clsx(
        'rounded-xl border border-border bg-bg-card p-4 space-y-3',
        className,
      )}
      aria-hidden="true"
    >
      {/* Title line */}
      <Skeleton className="h-5 w-3/4" />
      {/* Body lines */}
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={clsx('h-3.5', i === lines - 1 ? 'w-1/2' : 'w-full')}
        />
      ))}
      {/* Badge row */}
      <div className="flex gap-2 pt-1">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-12 rounded-full" />
      </div>
    </div>
  );
}
