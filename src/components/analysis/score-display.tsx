'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';

export interface ScoreDisplayProps {
  score: number;
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

const RADIUS = 54;
const STROKE_WIDTH = 8;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const VIEW_BOX_SIZE = (RADIUS + STROKE_WIDTH) * 2;
const CENTER = VIEW_BOX_SIZE / 2;

export function ScoreDisplay({ score, className }: ScoreDisplayProps) {
  const [displayScore, setDisplayScore] = useState(0);
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const strokeDashoffset = CIRCUMFERENCE - (displayScore / 100) * CIRCUMFERENCE;

  useEffect(() => {
    let frame: number;
    const duration = 1200;
    const start = performance.now();

    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayScore(Math.round(clamped * eased));

      if (progress < 1) {
        frame = requestAnimationFrame(animate);
      }
    };

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [clamped]);

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.2 }}
      className={clsx('relative flex flex-col items-center gap-3', className)}
    >
      <div
        className="relative flex size-36 items-center justify-center"
        role="meter"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Score: ${clamped}/100`}
      >
        <svg
          viewBox={`0 0 ${VIEW_BOX_SIZE} ${VIEW_BOX_SIZE}`}
          className="absolute inset-0 -rotate-90"
          fill="none"
        >
          {/* Background track */}
          <circle
            cx={CENTER}
            cy={CENTER}
            r={RADIUS}
            stroke="var(--color-border)"
            strokeWidth={STROKE_WIDTH}
          />
          {/* Score arc */}
          <circle
            cx={CENTER}
            cy={CENTER}
            r={RADIUS}
            stroke={getScoreColor(displayScore)}
            strokeWidth={STROKE_WIDTH}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={strokeDashoffset}
            className="transition-[stroke] duration-300"
          />
        </svg>
        <span
          className={clsx(
            'relative text-5xl font-bold font-display tabular-nums',
            getScoreTextClass(displayScore),
          )}
        >
          {displayScore}
        </span>
      </div>
      <span className="text-sm font-medium text-text-muted">
        Score de pertinence
      </span>
    </motion.div>
  );
}
