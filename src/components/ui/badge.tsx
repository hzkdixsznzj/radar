import clsx from 'clsx';
import type { ReactNode } from 'react';

const colorMap = {
  blue: 'bg-accent-blue-soft text-accent-blue',
  green: 'bg-accent-green-soft text-accent-green',
  orange: 'bg-accent-orange-soft text-accent-orange',
  red: 'bg-accent-red-soft text-accent-red',
  gray: 'bg-bg-card-hover text-text-secondary',
} as const;

const sizeMap = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-2.5 py-1',
} as const;

export type BadgeColor = keyof typeof colorMap;
export type BadgeSize = keyof typeof sizeMap;

export interface BadgeProps {
  color?: BadgeColor;
  size?: BadgeSize;
  children: ReactNode;
  className?: string;
}

export function Badge({
  color = 'blue',
  size = 'sm',
  children,
  className,
}: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full font-medium whitespace-nowrap',
        colorMap[color],
        sizeMap[size],
        className,
      )}
    >
      {children}
    </span>
  );
}
