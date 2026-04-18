import type { Metadata } from 'next';
import Link from 'next/link';
import { Radar } from 'lucide-react';
import { PricingToggle } from './pricing-toggle';

/* -------------------------------------------------------------------------- */
/*  Metadata                                                                  */
/* -------------------------------------------------------------------------- */

export const metadata: Metadata = {
  title: 'Tarifs',
  description:
    'Choisissez le plan Radar adapt\u00e9 \u00e0 votre PME. Gratuit, Pro ou Business.',
};

/* -------------------------------------------------------------------------- */
/*  Plans data                                                                */
/* -------------------------------------------------------------------------- */

export const PLANS = {
  free: {
    name: 'Gratuit',
    monthlyPrice: 0,
    features: [
      '5 march\u00e9s/mois dans le feed',
      'Filtres de base',
    ],
    cta: 'Commencer gratuitement',
    popular: false,
    tag: undefined,
  },
  pro: {
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
  },
  business: {
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
  },
} as const;

export const FAQ_ITEMS = [
  {
    question: 'Puis-je changer de plan \u00e0 tout moment ?',
    answer:
      'Oui, vous pouvez upgrade ou downgrade votre plan \u00e0 tout moment. Le changement est instantan\u00e9 et le montant est ajust\u00e9 au prorata.',
  },
  {
    question: "Comment fonctionne l\u2019essai gratuit ?",
    answer:
      'Vous b\u00e9n\u00e9ficiez de 14 jours d\u2019acc\u00e8s complet au plan Pro, sans carte bancaire requise. \u00c0 la fin de la p\u00e9riode, vous repassez automatiquement au plan Gratuit.',
  },
  {
    question: "Qu\u2019est-ce qu\u2019une r\u00e9daction de soumission ?",
    answer:
      "C\u2019est un m\u00e9moire technique complet g\u00e9n\u00e9r\u00e9 par l\u2019IA, adapt\u00e9 \u00e0 votre profil d\u2019entreprise et au march\u00e9 cibl\u00e9. Il comprend la pr\u00e9sentation, la m\u00e9thodologie, le planning et les r\u00e9f\u00e9rences.",
  },
  {
    question: 'Mes donn\u00e9es sont-elles s\u00e9curis\u00e9es ?',
    answer:
      'Absolument. Nos serveurs sont h\u00e9berg\u00e9s dans l\u2019UE, nous sommes conformes au RGPD, et toutes les donn\u00e9es sont chiffr\u00e9es au repos et en transit.',
  },
  {
    question: 'Puis-je annuler \u00e0 tout moment ?',
    answer:
      "Oui, vous pouvez annuler votre abonnement \u00e0 tout moment, sans frais. Vous conservez l\u2019acc\u00e8s \u00e0 votre plan jusqu\u2019\u00e0 la fin de la p\u00e9riode de facturation en cours.",
  },
];

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

export default function PricingPage() {
  return (
    <>
      <main className="flex-1">
        {/* -------------------------------------------------------------- */}
        {/*  Header                                                        */}
        {/* -------------------------------------------------------------- */}
        <section className="pt-24 pb-16 sm:pt-32 sm:pb-20">
          <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
            <h1 className="font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight text-text-primary sm:text-4xl md:text-5xl">
              Choisissez votre plan
            </h1>
            <p className="mt-4 text-lg text-text-secondary">
              Trouvez le march&eacute; le matin, soumettez le soir.
            </p>
          </div>
        </section>

        {/* -------------------------------------------------------------- */}
        {/*  Pricing cards + toggle (client boundary)                      */}
        {/* -------------------------------------------------------------- */}
        <PricingToggle />

        {/* -------------------------------------------------------------- */}
        {/*  FAQ                                                           */}
        {/* -------------------------------------------------------------- */}
        <section className="py-24 sm:py-32">
          <div className="mx-auto max-w-2xl px-4 sm:px-6">
            <h2 className="text-center font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight text-text-primary sm:text-3xl">
              Questions fr&eacute;quentes
            </h2>

            <div className="mt-12">
              {/* FAQ items rendered inside client component via PricingToggle to keep this a server component */}
              <FaqSection />
            </div>
          </div>
        </section>
      </main>

      {/* ---------------------------------------------------------------- */}
      {/*  Footer (same as landing)                                        */}
      {/* ---------------------------------------------------------------- */}
      <footer className="border-t border-border/40 bg-bg-card/20">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <div className="flex flex-col items-center gap-8 md:flex-row md:items-start md:justify-between">
            {/* Brand */}
            <div className="text-center md:text-left">
              <Link
                href="/"
                className="inline-flex items-center gap-2 font-[family-name:var(--font-display)] text-lg font-bold text-text-primary"
              >
                <Radar className="h-5 w-5 text-accent-blue" />
                Radar
              </Link>
              <p className="mt-2 max-w-xs text-sm text-text-muted">
                Trouvez le march&eacute; le matin, soumettez le soir.
              </p>
            </div>

            {/* Links */}
            <nav className="flex flex-wrap justify-center gap-x-8 gap-y-3 text-sm text-text-secondary">
              <Link href="/#fonctionnalites" className="transition-colors hover:text-text-primary">
                Fonctionnalit&eacute;s
              </Link>
              <Link href="/pricing" className="transition-colors hover:text-text-primary">
                Tarifs
              </Link>
              <a
                href="mailto:contact@radar.be"
                className="transition-colors hover:text-text-primary"
              >
                Contact
              </a>
              <Link href="/mentions-legales" className="transition-colors hover:text-text-primary">
                Mentions l&eacute;gales
              </Link>
              <Link href="/confidentialite" className="transition-colors hover:text-text-primary">
                Confidentialit&eacute;
              </Link>
              <Link href="/cgu" className="transition-colors hover:text-text-primary">
                CGU
              </Link>
            </nav>
          </div>

          <div className="mt-8 border-t border-border/30 pt-6 text-center text-xs text-text-muted">
            &copy; {new Date().getFullYear()} Radar. Made in Belgium.
          </div>
        </div>
      </footer>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*  FAQ Section (server sub-component that imports the client FaqItem)        */
/* -------------------------------------------------------------------------- */

import { FaqItem } from '@/components/pricing/faq-item';

function FaqSection() {
  return (
    <div className="divide-y-0">
      {FAQ_ITEMS.map((item) => (
        <FaqItem key={item.question} question={item.question} answer={item.answer} />
      ))}
    </div>
  );
}
