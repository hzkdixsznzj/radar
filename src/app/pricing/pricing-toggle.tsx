'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';
import { PricingCard } from '@/components/pricing/pricing-card';

/* -------------------------------------------------------------------------- */
/*  Plan data (duplicated from page for client usage)                         */
/* -------------------------------------------------------------------------- */

const PLANS = [
  {
    id: 'free',
    name: 'Gratuit',
    monthlyPrice: 0,
    features: [
      '5 march\u00e9s/mois dans le feed',
      'Filtres de base',
    ],
    cta: 'Commencer gratuitement',
    popular: false,
    tag: undefined,
    href: '/signup',
  },
  {
    id: 'pro',
    name: 'Pro',
    monthlyPrice: 29,
    features: [
      'March\u00e9s illimit\u00e9s',
      'Analyse IA illimit\u00e9e',
      '5 r\u00e9dactions de soumission/mois',
      'Assistant IA',
      'Notifications push',
      'Export PDF/Word',
    ],
    cta: "Commencer l\u2019essai gratuit",
    popular: true,
    tag: 'Essai gratuit 14 jours',
    href: '/signup?plan=pro',
  },
  {
    id: 'business',
    name: 'Business',
    monthlyPrice: 79,
    features: [
      'Tout le plan Pro',
      'R\u00e9dactions illimit\u00e9es',
      'Multi-utilisateurs (3 comptes)',
      'Statistiques avanc\u00e9es',
      'Support prioritaire',
    ],
    cta: 'Contacter les ventes',
    popular: false,
    tag: undefined,
    href: '/signup?plan=business',
  },
] as const;

const ANNUAL_DISCOUNT = 0.8; // 20% off

/* -------------------------------------------------------------------------- */
/*  Toggle + Cards                                                           */
/* -------------------------------------------------------------------------- */

export function PricingToggle() {
  const [annual, setAnnual] = useState(false);
  const router = useRouter();

  return (
    <section className="pb-16 sm:pb-20">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        {/* Toggle */}
        <div className="flex items-center justify-center gap-3">
          <span
            className={clsx(
              'text-sm font-medium transition-colors',
              !annual ? 'text-text-primary' : 'text-text-muted',
            )}
          >
            Mensuel
          </span>
          <button
            onClick={() => setAnnual((prev) => !prev)}
            role="switch"
            aria-checked={annual}
            aria-label="Basculer entre mensuel et annuel"
            className={clsx(
              'relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full transition-colors',
              annual ? 'bg-accent-blue' : 'bg-border',
            )}
          >
            <span
              className={clsx(
                'inline-block h-5 w-5 rounded-full bg-white transition-transform',
                annual ? 'translate-x-6' : 'translate-x-1',
              )}
            />
          </button>
          <span
            className={clsx(
              'text-sm font-medium transition-colors',
              annual ? 'text-text-primary' : 'text-text-muted',
            )}
          >
            Annuel
          </span>
          {annual && (
            <span className="ml-1 rounded-full bg-accent-green-soft px-2 py-0.5 text-xs font-semibold text-accent-green">
              -20%
            </span>
          )}
        </div>

        {/* Cards */}
        <div className="mt-12 grid items-start gap-6 lg:grid-cols-3">
          {PLANS.map((plan) => {
            const displayPrice =
              plan.monthlyPrice === 0
                ? 0
                : annual
                  ? Math.round(plan.monthlyPrice * ANNUAL_DISCOUNT)
                  : plan.monthlyPrice;

            return (
              <PricingCard
                key={plan.id}
                name={plan.name}
                price={displayPrice}
                originalPrice={annual && plan.monthlyPrice > 0 ? plan.monthlyPrice : null}
                period={plan.monthlyPrice === 0 ? '' : '/mois'}
                features={[...plan.features]}
                cta={plan.cta}
                popular={plan.popular}
                tag={plan.tag}
                onSelect={() => router.push(plan.href)}
              />
            );
          })}
        </div>

        <p className="mt-8 text-center text-sm text-text-muted">
          Tous les prix sont hors TVA. Annulation possible &agrave; tout moment.
        </p>
      </div>
    </section>
  );
}
