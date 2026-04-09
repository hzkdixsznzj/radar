import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import clsx from 'clsx';

const paddingMap = {
  none: 'p-0',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
} as const;

export type CardPadding = keyof typeof paddingMap;

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: CardPadding;
  hover?: boolean;
  clickable?: boolean;
  children: ReactNode;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      padding = 'md',
      hover = false,
      clickable = false,
      children,
      className,
      ...props
    },
    ref,
  ) => {
    return (
      <div
        ref={ref}
        role={clickable ? 'button' : undefined}
        tabIndex={clickable ? 0 : undefined}
        className={clsx(
          'rounded-xl border border-border bg-bg-card',
          paddingMap[padding],
          (hover || clickable) &&
            'transition-colors duration-150 hover:bg-bg-card-hover',
          clickable && [
            'cursor-pointer',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-blue',
          ],
          className,
        )}
        {...props}
      >
        {children}
      </div>
    );
  },
);

Card.displayName = 'Card';
