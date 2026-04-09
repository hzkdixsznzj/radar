'use client';

import { useMemo } from 'react';
import clsx from 'clsx';

export interface CountdownProps {
  deadline: Date | string;
  className?: string;
}

function getDaysRemaining(deadline: Date | string): number {
  const target = typeof deadline === 'string' ? new Date(deadline) : deadline;
  const now = new Date();
  // Reset time portions for day-level comparison
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const deadlineStart = new Date(
    target.getFullYear(),
    target.getMonth(),
    target.getDate(),
  );
  return Math.ceil(
    (deadlineStart.getTime() - todayStart.getTime()) / (1000 * 60 * 60 * 24),
  );
}

export function Countdown({ deadline, className }: CountdownProps) {
  const days = useMemo(() => getDaysRemaining(deadline), [deadline]);

  const label = days < 0 ? 'Expir\u00e9' : days === 0 ? 'Aujourd\'hui' : `J-${days}`;

  const colorClasses =
    days < 0
      ? 'bg-accent-red-soft text-accent-red'
      : days <= 3
        ? 'bg-accent-red-soft text-accent-red'
        : days <= 7
          ? 'bg-accent-orange-soft text-accent-orange'
          : 'bg-accent-green-soft text-accent-green';

  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap',
        colorClasses,
        className,
      )}
      title={
        typeof deadline === 'string'
          ? deadline
          : deadline.toLocaleDateString('fr-BE')
      }
    >
      {label}
    </span>
  );
}
