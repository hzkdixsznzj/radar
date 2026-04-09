'use client';

import { useEffect, useState } from 'react';
import clsx from 'clsx';

const sizeMap = {
  sm: { container: 'size-8', text: 'text-xs', strokeWidth: 3, radius: 12 },
  md: { container: 'size-12', text: 'text-sm', strokeWidth: 3.5, radius: 18 },
  lg: { container: 'size-16', text: 'text-base', strokeWidth: 4, radius: 24 },
} as const;

export type ScoreBadgeSize = keyof typeof sizeMap;

export interface ScoreBadgeProps {
  score: number;
  size?: ScoreBadgeSize;
  animated?: boolean;
  className?: string;
}

function getScoreColor(score: number): string {
  if (score <= 40) return 'var(--color-accent-red)';
  if (score <= 70) return 'var(--color-accent-orange)';
  return 'var(--color-accent-green)';
}

function getScoreTextClass(score: number): string {
  if (score <= 40) return 'text-accent-red';
  if (score <= 70) return 'text-accent-orange';
  return 'text-accent-green';
}

export function ScoreBadge({
  score,
  size = 'md',
  animated = true,
  className,
}: ScoreBadgeProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const [animatedScore, setAnimatedScore] = useState(0);
  const config = sizeMap[size];
  const displayScore = animated ? animatedScore : clamped;
  const circumference = 2 * Math.PI * config.radius;
  const strokeDashoffset = circumference - (displayScore / 100) * circumference;
  const viewBoxSize = (config.radius + config.strokeWidth) * 2;
  const center = viewBoxSize / 2;

  useEffect(() => {
    if (!animated) {
      return;
    }

    let frame: number;
    const duration = 600;
    const start = performance.now();
    const from = 0;

    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedScore(Math.round(from + (clamped - from) * eased));

      if (progress < 1) {
        frame = requestAnimationFrame(animate);
      }
    };

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [clamped, animated]);

  return (
    <div
      className={clsx(
        'relative inline-flex items-center justify-center',
        config.container,
        className,
      )}
      role="meter"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`Score: ${clamped}/100`}
    >
      <svg
        viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
        className="absolute inset-0 -rotate-90"
        fill="none"
      >
        {/* Background track */}
        <circle
          cx={center}
          cy={center}
          r={config.radius}
          stroke="var(--color-border)"
          strokeWidth={config.strokeWidth}
        />
        {/* Score arc */}
        <circle
          cx={center}
          cy={center}
          r={config.radius}
          stroke={getScoreColor(displayScore)}
          strokeWidth={config.strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-[stroke-dashoffset] duration-500 ease-out"
        />
      </svg>
      <span
        className={clsx(
          'relative font-semibold font-display',
          config.text,
          getScoreTextClass(displayScore),
        )}
      >
        {displayScore}
      </span>
    </div>
  );
}
