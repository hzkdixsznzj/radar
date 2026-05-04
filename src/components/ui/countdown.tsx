'use client';

import { useMemo } from 'react';
import clsx from 'clsx';

export interface CountdownProps {
  /**
   * Deadline as a Date or ISO string. May be null/undefined for tenders that
   * don't publish a hard close date \u2014 we fall back to a neutral "Sans date"
   * pill rather than crashing on `target.getFullYear()`.
   */
  deadline: Date | string | null | undefined;
  className?: string;
}

function getDaysRemaining(deadline: Date | string): number | null {
  const target = typeof deadline === 'string' ? new Date(deadline) : deadline;
  // Guard against a string that didn't parse (e.g. "" or "TBD"). NaN would
  // poison every subsequent computation and render labels like "J-NaN".
  if (isNaN(target.getTime())) return null;
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
  const days = useMemo(
    () => (deadline ? getDaysRemaining(deadline) : null),
    [deadline],
  );

  const label =
    days === null
      ? 'Sans date'
      : days < 0
        ? 'Expir\u00e9'
        : days === 0
          ? 'Aujourd\'hui'
          : `J-${days}`;

  const colorClasses =
    days === null
      ? 'bg-bg-input text-text-muted'
      : days < 0
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
        deadline == null
          ? undefined
          : typeof deadline === 'string'
            ? deadline
            : deadline.toLocaleDateString('fr-BE')
      }
    >
      {label}
    </span>
  );
}
