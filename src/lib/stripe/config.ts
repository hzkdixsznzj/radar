import Stripe from 'stripe';

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  }
  return _stripe;
}

export const PLANS = {
  free: {
    name: 'Gratuit',
    price: 0,
    tenders_per_month: 5,
    ai_analyses: 0,
    submissions_per_month: 0,
    features: [
      '5 marchés/mois dans le feed',
      'Filtres de base',
    ],
  },
  pro: {
    name: 'Pro',
    price: 29,
    priceId: process.env.STRIPE_PRO_PRICE_ID,
    tenders_per_month: -1, // unlimited
    ai_analyses: -1,
    submissions_per_month: 5,
    features: [
      'Marchés illimités',
      'Analyse IA illimitée',
      '5 rédactions/mois',
      'Assistant IA',
      'Notifications push',
      'Export PDF/Word',
    ],
    popular: true,
  },
  business: {
    name: 'Business',
    price: 79,
    priceId: process.env.STRIPE_BUSINESS_PRICE_ID,
    tenders_per_month: -1,
    ai_analyses: -1,
    submissions_per_month: -1,
    features: [
      'Tout le plan Pro',
      'Rédactions illimitées',
      'Multi-utilisateurs (3 comptes)',
      'Statistiques avancées',
      'Support prioritaire',
    ],
  },
} as const;

export type PlanType = keyof typeof PLANS;
