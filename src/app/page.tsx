import Link from 'next/link';
import {
  Search,
  Sparkles,
  FileText,
  UserCog,
  SwatchBook,
  ShieldCheck,
  Check,
  Radar,
  ArrowRight,
} from 'lucide-react';
import { Header } from '@/components/landing/header';
import { RadarAnimation } from '@/components/landing/radar-animation';

/* -------------------------------------------------------------------------- */
/*  Landing page — Server Component                                           */
/* -------------------------------------------------------------------------- */

export default function Home() {
  return (
    <>
      <Header />

      <main>
        {/* ---------------------------------------------------------------- */}
        {/*  HERO                                                            */}
        {/* ---------------------------------------------------------------- */}
        <section className="relative overflow-hidden">
          <RadarAnimation />

          <div className="relative z-10 mx-auto max-w-3xl px-6 pb-20 pt-32 text-center sm:pb-28 sm:pt-40 lg:pt-48 lg:pb-36">
            <h1 className="font-[family-name:var(--font-display)] text-3xl font-extrabold leading-[1.15] tracking-tight text-text-primary sm:text-4xl md:text-5xl lg:text-6xl">
              {'Trouvez le marché le matin, '}
              <span className="bg-gradient-to-r from-accent-blue to-accent-green bg-clip-text text-transparent">
                soumettez le soir.
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-text-secondary sm:text-lg">
              Radar scanne les marchés publics belges, analyse leur pertinence
              pour votre PME avec l&apos;IA, et vous aide à rédiger des
              soumissions gagnantes.
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 rounded-xl bg-accent-blue px-7 py-3 text-sm font-semibold text-white shadow-lg shadow-accent-blue/25 transition-all hover:bg-accent-blue/90 hover:shadow-accent-blue/40 sm:text-base sm:px-8 sm:py-3.5"
              >
                Commencer gratuitement
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#tarifs"
                className="inline-flex items-center gap-2 rounded-xl border border-border px-7 py-3 text-sm font-semibold text-text-secondary transition-colors hover:border-text-muted hover:text-text-primary sm:text-base sm:px-8 sm:py-3.5"
              >
                Voir les plans
              </a>
            </div>
          </div>

          {/* Bottom fade */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-bg-primary to-transparent" />
        </section>

        {/* ---------------------------------------------------------------- */}
        {/*  FEATURES                                                        */}
        {/* ---------------------------------------------------------------- */}
        <section id="fonctionnalites" className="py-20 sm:py-28">
          <div className="mx-auto max-w-5xl px-6">
            <div className="mx-auto max-w-xl text-center">
              <span className="inline-flex rounded-full bg-accent-blue/10 px-4 py-1.5 text-xs font-semibold tracking-wide text-accent-blue">
                Fonctionnalités
              </span>
              <h2 className="mt-4 font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight text-text-primary sm:text-3xl">
                Tout ce qu&apos;il faut pour gagner des marchés
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-text-secondary sm:text-base">
                De la veille automatisée à la rédaction assistée,
                Radar couvre chaque étape du processus.
              </p>
            </div>

            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 sm:mt-16">
              <FeatureCard
                icon={<Search className="h-5 w-5" />}
                title="Veille automatique"
                description="Nos scrapers parcourent TED et le Bulletin des Adjudications toutes les 4h pour trouver les marchés pertinents."
                accent="blue"
              />
              <FeatureCard
                icon={<Sparkles className="h-5 w-5" />}
                title="Analyse IA"
                description="Claude analyse chaque marché selon votre profil : pertinence, risques, concurrence, recommandation."
                accent="green"
              />
              <FeatureCard
                icon={<FileText className="h-5 w-5" />}
                title="Rédaction assistée"
                description="Générez un mémoire technique complet en quelques clics. L&apos;IA connaît votre entreprise."
                accent="orange"
              />
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/*  HOW IT WORKS                                                    */}
        {/* ---------------------------------------------------------------- */}
        <section className="border-y border-border/30 bg-bg-card/30 py-20 sm:py-28">
          <div className="mx-auto max-w-5xl px-6">
            <div className="mx-auto max-w-xl text-center">
              <span className="inline-flex rounded-full bg-accent-green/10 px-4 py-1.5 text-xs font-semibold tracking-wide text-accent-green">
                Comment ça marche
              </span>
              <h2 className="mt-4 font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight text-text-primary sm:text-3xl">
                Trois étapes, zéro friction
              </h2>
            </div>

            <div className="mt-12 grid gap-8 sm:mt-16 lg:grid-cols-3">
              <StepCard
                step={1}
                icon={<UserCog className="h-5 w-5" />}
                title="Configurez votre profil"
                description="Définissez vos secteurs, régions et certifications. Radar saura exactement quoi chercher."
              />
              <StepCard
                step={2}
                icon={<SwatchBook className="h-5 w-5" />}
                title="Swipez les opportunités"
                description="Comme Tinder, mais pour les marchés publics. Acceptez, rejetez ou mettez en favoris en un geste."
              />
              <StepCard
                step={3}
                icon={<ShieldCheck className="h-5 w-5" />}
                title="Soumettez avec confiance"
                description="Générez un mémoire technique complet par l&apos;IA et soumettez en toute sérénité."
              />
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/*  STATS BANNER                                                    */}
        {/* ---------------------------------------------------------------- */}
        <section className="py-16 sm:py-20">
          <div className="mx-auto max-w-3xl px-6">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="font-[family-name:var(--font-display)] text-3xl font-extrabold text-text-primary sm:text-4xl">
                  500+
                </p>
                <p className="mt-1 text-xs text-text-muted sm:text-sm">
                  Marchés analysés / jour
                </p>
              </div>
              <div>
                <p className="font-[family-name:var(--font-display)] text-3xl font-extrabold text-text-primary sm:text-4xl">
                  3
                </p>
                <p className="mt-1 text-xs text-text-muted sm:text-sm">
                  Sources de données
                </p>
              </div>
              <div>
                <p className="font-[family-name:var(--font-display)] text-3xl font-extrabold text-text-primary sm:text-4xl">
                  30s
                </p>
                <p className="mt-1 text-xs text-text-muted sm:text-sm">
                  Analyse par marché
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/*  PRICING                                                         */}
        {/* ---------------------------------------------------------------- */}
        <section
          id="tarifs"
          className="border-y border-border/30 bg-bg-card/30 py-20 sm:py-28"
        >
          <div className="mx-auto max-w-5xl px-6">
            <div className="mx-auto max-w-xl text-center">
              <span className="inline-flex rounded-full bg-accent-orange/10 px-4 py-1.5 text-xs font-semibold tracking-wide text-accent-orange">
                Tarifs
              </span>
              <h2 className="mt-4 font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight text-text-primary sm:text-3xl">
                Un plan pour chaque PME
              </h2>
              <p className="mt-3 text-sm text-text-secondary sm:text-base">
                Commencez gratuitement, passez à Pro quand vous êtes prêt.
              </p>
            </div>

            <div className="mt-12 grid gap-5 sm:mt-16 lg:grid-cols-3">
              <PricingCard
                name="Gratuit"
                price="0"
                period=""
                description="Pour découvrir la plateforme"
                features={[
                  '5 marchés / jour',
                  'Analyse IA basique',
                  '1 profil entreprise',
                ]}
                cta="Commencer"
                ctaHref="/signup"
                highlighted={false}
              />
              <PricingCard
                name="Pro"
                price="29"
                period="/mois"
                badge="Essai gratuit 14 jours"
                description="Pour les PME actives"
                features={[
                  'Marchés illimités',
                  'Analyse IA avancée',
                  'Rédaction assistée',
                  'Alertes e-mail',
                  'Export PDF',
                ]}
                cta="Essayer gratuitement"
                ctaHref="/signup?plan=pro"
                highlighted
              />
              <PricingCard
                name="Business"
                price="79"
                period="/mois"
                description="Pour les équipes"
                features={[
                  'Tout de Pro',
                  'Multi-utilisateurs',
                  'API accès',
                  'Support prioritaire',
                  'Tableau de bord équipe',
                ]}
                cta="Contacter"
                ctaHref="/signup?plan=business"
                highlighted={false}
              />
            </div>

            <p className="mt-8 text-center text-xs text-text-muted sm:text-sm">
              Tous les prix sont hors TVA. Annulation possible à tout moment.
            </p>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/*  FINAL CTA                                                       */}
        {/* ---------------------------------------------------------------- */}
        <section className="py-20 sm:py-28">
          <div className="mx-auto max-w-2xl px-6 text-center">
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight text-text-primary sm:text-3xl">
              Prêt à ne plus rater un marché ?
            </h2>
            <p className="mt-3 text-sm text-text-secondary sm:text-base">
              Rejoignez les PME belges qui utilisent Radar pour décrocher plus de marchés publics.
            </p>
            <Link
              href="/signup"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-accent-blue px-7 py-3 text-sm font-semibold text-white shadow-lg shadow-accent-blue/25 transition-all hover:bg-accent-blue/90 hover:shadow-accent-blue/40 sm:text-base sm:px-8 sm:py-3.5"
            >
              Commencer gratuitement
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>

      {/* ------------------------------------------------------------------ */}
      {/*  FOOTER                                                            */}
      {/* ------------------------------------------------------------------ */}
      <footer className="border-t border-border/30">
        <div className="mx-auto max-w-5xl px-6 py-10 sm:py-12">
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
            <Link
              href="/"
              className="inline-flex items-center gap-2 font-[family-name:var(--font-display)] text-base font-bold text-text-primary"
            >
              <Radar className="h-5 w-5 text-accent-blue" />
              Radar
            </Link>

            <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-text-muted sm:text-sm">
              <a href="#fonctionnalites" className="transition-colors hover:text-text-primary">
                Fonctionnalités
              </a>
              <a href="#tarifs" className="transition-colors hover:text-text-primary">
                Tarifs
              </a>
              <Link href="/mentions-legales" className="transition-colors hover:text-text-primary">
                Mentions légales
              </Link>
              <Link href="/confidentialite" className="transition-colors hover:text-text-primary">
                Confidentialité
              </Link>
              <Link href="/cgu" className="transition-colors hover:text-text-primary">
                CGU
              </Link>
            </nav>
          </div>

          <div className="mt-6 border-t border-border/20 pt-6 text-center text-xs text-text-muted">
            © {new Date().getFullYear()} Radar. Made in Belgium.
          </div>
        </div>
      </footer>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*  Sub-components (server, co-located)                                       */
/* -------------------------------------------------------------------------- */

function FeatureCard({
  icon,
  title,
  description,
  accent,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  accent: 'blue' | 'green' | 'orange';
}) {
  const accentMap = {
    blue: 'bg-accent-blue-soft text-accent-blue',
    green: 'bg-accent-green-soft text-accent-green',
    orange: 'bg-accent-orange-soft text-accent-orange',
  };

  return (
    <div className="rounded-2xl border border-border/40 bg-bg-card/60 p-6 transition-colors hover:border-border/70 hover:bg-bg-card">
      <div
        className={`mb-4 inline-flex rounded-lg p-2.5 ${accentMap[accent]}`}
      >
        {icon}
      </div>
      <h3 className="font-[family-name:var(--font-display)] text-base font-semibold text-text-primary">
        {title}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-text-secondary">
        {description}
      </p>
    </div>
  );
}

function StepCard({
  step,
  icon,
  title,
  description,
}: {
  step: number;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
      <div className="relative">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent-blue-soft text-accent-blue">
          {icon}
        </div>
        <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-accent-blue text-[11px] font-bold text-white">
          {step}
        </span>
      </div>
      <h3 className="mt-4 font-[family-name:var(--font-display)] text-base font-semibold text-text-primary">
        {title}
      </h3>
      <p className="mt-1.5 text-sm leading-relaxed text-text-secondary">
        {description}
      </p>
    </div>
  );
}

function PricingCard({
  name,
  price,
  period,
  badge,
  description,
  features,
  cta,
  ctaHref,
  highlighted,
}: {
  name: string;
  price: string;
  period: string;
  badge?: string;
  description: string;
  features: string[];
  cta: string;
  ctaHref: string;
  highlighted: boolean;
}) {
  return (
    <div
      className={`flex flex-col rounded-2xl border p-6 transition-colors ${
        highlighted
          ? 'border-accent-blue bg-bg-card shadow-lg shadow-accent-blue/10'
          : 'border-border/40 bg-bg-card/60 hover:border-border/70 hover:bg-bg-card'
      }`}
    >
      {badge && (
        <span className="mb-3 inline-flex self-start rounded-full bg-accent-blue/10 px-3 py-1 text-xs font-semibold text-accent-blue">
          {badge}
        </span>
      )}

      <h3 className="font-[family-name:var(--font-display)] text-lg font-semibold text-text-primary">
        {name}
      </h3>
      <p className="mt-1 text-sm text-text-muted">{description}</p>

      <p className="mt-4 flex items-baseline gap-1">
        <span className="font-[family-name:var(--font-display)] text-3xl font-extrabold text-text-primary">
          {price}&euro;
        </span>
        {period && (
          <span className="text-sm text-text-muted">{period}</span>
        )}
      </p>

      <ul className="mt-5 flex flex-1 flex-col gap-2.5">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm text-text-secondary">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent-green" />
            <span>{f}</span>
          </li>
        ))}
      </ul>

      <Link
        href={ctaHref}
        className={`mt-5 block rounded-xl py-2.5 text-center text-sm font-semibold transition-colors ${
          highlighted
            ? 'bg-accent-blue text-white hover:bg-accent-blue/90'
            : 'border border-border text-text-secondary hover:border-text-muted hover:text-text-primary'
        }`}
      >
        {cta}
      </Link>
    </div>
  );
}
