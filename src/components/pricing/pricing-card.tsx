'use client';

import { Check } from 'lucide-react';
import clsx from 'clsx';

/* -------------------------------------------------------------------------- */
/*  Pricing Card                                                              */
/* -------------------------------------------------------------------------- */

export interface PricingCardProps {
  name: string;
  price: number;
  /** Price shown after discount (annual), null if no discount */
  originalPrice?: number | null;
  period: string;
  features: string[];
  cta: string;
  popular?: boolean;
  tag?: string;
  onSelect?: () => void;
}

export function PricingCard({
  name,
  price,
  originalPrice,
  period,
  features,
  cta,
  popular = false,
  tag,
  onSelect,
}: PricingCardProps) {
  return (
    <div
      className={clsx(
        'relative flex flex-col rounded-2xl border p-6 transition-colors',
        popular
          ? 'border-accent-blue bg-bg-card shadow-lg shadow-accent-blue/10 md:-mt-4 md:pb-10'
          : 'border-border/50 bg-bg-card hover:border-border hover:bg-bg-card-hover',
      )}
    >
      {/* Popular badge */}
      {popular && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-accent-blue px-3 py-1 text-xs font-semibold text-white">
          Populaire
        </span>
      )}

      {/* Plan name */}
      <h3 className="font-[family-name:var(--font-display)] text-lg font-semibold text-text-primary">
        {name}
      </h3>

      {/* Tag (e.g. "Essai gratuit 14 jours") */}
      {tag && (
        <span className="mt-2 inline-block w-fit rounded-full bg-accent-blue-soft px-2.5 py-0.5 text-xs font-medium text-accent-blue">
          {tag}
        </span>
      )}

      {/* Price */}
      <div className="mt-4 flex items-baseline gap-1.5">
        <span className="font-[family-name:var(--font-display)] text-4xl font-extrabold text-text-primary">
          {price}&euro;
        </span>
        {period && (
          <span className="text-sm text-text-muted">{period}</span>
        )}
      </div>

      {/* Original price (struck through when annual) */}
      {originalPrice != null && originalPrice > price && (
        <p className="mt-1 text-sm text-text-muted line-through">
          {originalPrice}&euro;/mois
        </p>
      )}

      {/* Features */}
      <ul className="mt-6 flex flex-1 flex-col gap-3">
        {features.map((feature) => (
          <li
            key={feature}
            className="flex items-start gap-2 text-sm text-text-secondary"
          >
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent-green" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      {/* CTA */}
      <button
        onClick={onSelect}
        className={clsx(
          'mt-6 block w-full rounded-xl py-3 text-center text-sm font-semibold transition-colors cursor-pointer',
          popular
            ? 'bg-accent-blue text-white hover:bg-accent-blue/90'
            : 'border border-border text-text-secondary hover:border-text-muted hover:text-text-primary',
        )}
      >
        {cta}
      </button>
    </div>
  );
}
