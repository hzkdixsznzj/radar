import Link from 'next/link';
import {
  Search,
  Sparkles,
  FileText,
  UserCog,
  SwatchBook,
  ShieldCheck,
  BarChart3,
  Database,
  Clock,
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

      <main className="flex-1">
        {/* ---------------------------------------------------------------- */}
        {/*  HERO                                                            */}
        {/* ---------------------------------------------------------------- */}
        <section className="relative flex min-h-[90vh] items-center justify-center overflow-hidden pt-16">
          <RadarAnimation />

          <div className="relative z-10 mx-auto max-w-4xl px-4 py-24 text-center sm:px-6 md:py-32">
            <h1 className="font-[family-name:var(--font-display)] text-4xl font-extrabold leading-[1.1] tracking-tight text-text-primary sm:text-5xl md:text-6xl lg:text-7xl">
              Trouvez le march&eacute; le matin,{' '}
              <span className="bg-gradient-to-r from-accent-blue to-accent-green bg-clip-text text-transparent">
                soumettez le soir.
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-text-secondary sm:text-xl">
              Radar scanne les march&eacute;s publics belges, analyse leur pertinence
              pour votre PME avec l&rsquo;IA, et vous aide &agrave; r&eacute;diger des
              soumissions gagnantes.
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 rounded-xl bg-accent-blue px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-accent-blue/25 transition-all hover:bg-accent-blue/90 hover:shadow-accent-blue/40"
              >
                Commencer gratuitement
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#tarifs"
                className="inline-flex items-center gap-2 rounded-xl border border-border px-8 py-3.5 text-base font-semibold text-text-secondary transition-colors hover:border-text-muted hover:text-text-primary"
              >
                Voir les plans
              </a>
            </div>
          </div>

          {/* Bottom fade */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-bg-primary to-transparent" />
        </section>

        {/* ---------------------------------------------------------------- */}
        {/*  FEATURES                                                        */}
        {/* ---------------------------------------------------------------- */}
        <section id="fonctionnalites" className="py-24 sm:py-32">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="text-center">
              <p className="text-sm font-semibold uppercase tracking-widest text-accent-blue">
                Fonctionnalit&eacute;s
              </p>
              <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight text-text-primary sm:text-4xl">
                Tout ce qu&rsquo;il faut pour gagner des march&eacute;s
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-text-secondary">
                De la veille automatis&eacute;e &agrave; la r&eacute;daction assist&eacute;e,
                Radar couvre chaque &eacute;tape du processus de soumission.
              </p>
            </div>

            <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <FeatureCard
                icon={<Search className="h-6 w-6" />}
                title="Veille automatique"
                description="Nos scrapers parcourent TED et le Bulletin des Adjudications toutes les 4h pour trouver les march&eacute;s pertinents."
                accent="blue"
              />
              <FeatureCard
                icon={<Sparkles className="h-6 w-6" />}
                title="Analyse IA"
                description="Claude analyse chaque march&eacute; selon votre profil : pertinence, risques, concurrence, recommandation."
                accent="green"
              />
              <FeatureCard
                icon={<FileText className="h-6 w-6" />}
                title="R&eacute;daction assist&eacute;e"
                description="G&eacute;n&eacute;rez un m&eacute;moire technique complet en quelques clics. L&rsquo;IA conna&icirc;t votre entreprise."
                accent="orange"
              />
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/*  HOW IT WORKS                                                    */}
        {/* ---------------------------------------------------------------- */}
        <section className="border-y border-border/40 bg-bg-card/30 py-24 sm:py-32">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="text-center">
              <p className="text-sm font-semibold uppercase tracking-widest text-accent-green">
                Comment &ccedil;a marche
              </p>
              <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight text-text-primary sm:text-4xl">
                Trois &eacute;tapes, z&eacute;ro friction
              </h2>
            </div>

            <div className="mt-16 grid gap-10 lg:grid-cols-3">
              <StepCard
                step={1}
                icon={<UserCog className="h-6 w-6" />}
                title="Configurez votre profil"
                description="D&eacute;finissez vos secteurs, r&eacute;gions et certifications. Radar saura exactement quoi chercher."
              />
              <StepCard
                step={2}
                icon={<SwatchBook className="h-6 w-6" />}
                title="Swipez les opportunit&eacute;s"
                description="Comme Tinder, mais pour les march&eacute;s publics. Acceptez, rejetez ou mettez en favoris en un geste."
              />
              <StepCard
                step={3}
                icon={<ShieldCheck className="h-6 w-6" />}
                title="Soumettez avec confiance"
                description="G&eacute;n&eacute;rez un m&eacute;moire technique complet par l&rsquo;IA et soumettez en toute s&eacute;r&eacute;nit&eacute;."
              />
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/*  SOCIAL PROOF / STATS                                            */}
        {/* ---------------------------------------------------------------- */}
        <section className="py-24 sm:py-32">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="text-center">
              <h2 className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight text-text-primary sm:text-4xl">
                Con&ccedil;u pour les PME belges
              </h2>
              <p className="mt-4 text-text-secondary">
                Des march&eacute;s publics belges analys&eacute;s en continu, pour que vous ne ratiez jamais une opportunit&eacute;.
              </p>
            </div>

            <div className="mt-14 grid gap-6 sm:grid-cols-3">
              <StatCard
                icon={<BarChart3 className="h-7 w-7 text-accent-blue" />}
                value="500+"
                label="March&eacute;s analys&eacute;s / jour"
              />
              <StatCard
                icon={<Database className="h-7 w-7 text-accent-green" />}
                value="3"
                label="Sources de donn&eacute;es"
              />
              <StatCard
                icon={<Clock className="h-7 w-7 text-accent-orange" />}
                value="30s"
                label="Analyse par march&eacute;"
              />
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/*  PRICING PREVIEW                                                 */}
        {/* ---------------------------------------------------------------- */}
        <section
          id="tarifs"
          className="border-y border-border/40 bg-bg-card/30 py-24 sm:py-32"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="text-center">
              <p className="text-sm font-semibold uppercase tracking-widest text-accent-orange">
                Tarifs
              </p>
              <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight text-text-primary sm:text-4xl">
                Un plan pour chaque PME
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-text-secondary">
                Commencez gratuitement, passez &agrave; Pro quand vous &ecirc;tes pr&ecirc;t.
              </p>
            </div>

            <div className="mt-14 grid gap-6 lg:grid-cols-3">
              {/* Free */}
              <PricingCard
                name="Gratuit"
                price="0"
                period=""
                description="Pour d&eacute;couvrir la plateforme"
                features={[
                  '5 march&eacute;s / jour',
                  'Analyse IA basique',
                  '1 profil entreprise',
                ]}
                cta="Commencer"
                ctaHref="/signup"
                highlighted={false}
              />

              {/* Pro */}
              <PricingCard
                name="Pro"
                price="29"
                period="/mois"
                badge="Essai gratuit 14 jours"
                description="Pour les PME actives"
                features={[
                  'March&eacute;s illimit&eacute;s',
                  'Analyse IA avanc&eacute;e',
                  'R&eacute;daction assist&eacute;e',
                  'Alertes e-mail',
                  'Export PDF',
                ]}
                cta="Essayer gratuitement"
                ctaHref="/signup?plan=pro"
                highlighted
              />

              {/* Business */}
              <PricingCard
                name="Business"
                price="79"
                period="/mois"
                description="Pour les &eacute;quipes"
                features={[
                  'Tout de Pro',
                  'Multi-utilisateurs',
                  'API acc&egrave;s',
                  'Support prioritaire',
                  'Tableau de bord &eacute;quipe',
                ]}
                cta="Contacter"
                ctaHref="/signup?plan=business"
                highlighted={false}
              />
            </div>

            <p className="mt-8 text-center text-sm text-text-muted">
              Tous les prix sont hors TVA. Annulation possible &agrave; tout moment.
            </p>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/*  FINAL CTA                                                       */}
        {/* ---------------------------------------------------------------- */}
        <section className="py-24 sm:py-32">
          <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
            <h2 className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight text-text-primary sm:text-4xl">
              Pr&ecirc;t &agrave; ne plus rater un march&eacute;&nbsp;?
            </h2>
            <p className="mt-4 text-lg text-text-secondary">
              Rejoignez les PME belges qui utilisent Radar pour d&eacute;crocher plus de march&eacute;s publics.
            </p>
            <Link
              href="/signup"
              className="mt-8 inline-flex items-center gap-2 rounded-xl bg-accent-blue px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-accent-blue/25 transition-all hover:bg-accent-blue/90 hover:shadow-accent-blue/40"
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
              <a href="#fonctionnalites" className="transition-colors hover:text-text-primary">
                Fonctionnalit&eacute;s
              </a>
              <a href="#tarifs" className="transition-colors hover:text-text-primary">
                Tarifs
              </a>
              <Link href="/contact" className="transition-colors hover:text-text-primary">
                Contact
              </Link>
              <Link href="/legal" className="transition-colors hover:text-text-primary">
                Mentions l&eacute;gales
              </Link>
              <Link href="/privacy" className="transition-colors hover:text-text-primary">
                Confidentialit&eacute;
              </Link>
              <Link href="/terms" className="transition-colors hover:text-text-primary">
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
    <div className="group rounded-2xl border border-border/50 bg-bg-card p-6 transition-colors hover:border-border hover:bg-bg-card-hover">
      <div
        className={`mb-4 inline-flex rounded-xl p-3 ${accentMap[accent]}`}
      >
        {icon}
      </div>
      <h3 className="font-[family-name:var(--font-display)] text-lg font-semibold text-text-primary">
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
    <div className="relative text-center lg:text-left">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-blue-soft text-accent-blue lg:mx-0">
        {icon}
      </div>
      <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-accent-blue px-2.5 py-0.5 text-xs font-bold text-white lg:left-12">
        {step}
      </span>
      <h3 className="mt-5 font-[family-name:var(--font-display)] text-lg font-semibold text-text-primary">
        {title}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-text-secondary">
        {description}
      </p>
    </div>
  );
}

function StatCard({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-border/50 bg-bg-card p-8 text-center">
      {icon}
      <p className="mt-4 font-[family-name:var(--font-display)] text-4xl font-extrabold text-text-primary">
        {value}
      </p>
      <p className="mt-1 text-sm text-text-secondary">{label}</p>
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
      className={`relative flex flex-col rounded-2xl border p-6 transition-colors ${
        highlighted
          ? 'border-accent-blue bg-bg-card shadow-lg shadow-accent-blue/10'
          : 'border-border/50 bg-bg-card hover:border-border hover:bg-bg-card-hover'
      }`}
    >
      {badge && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-accent-blue px-3 py-1 text-xs font-semibold text-white">
          {badge}
        </span>
      )}

      <h3 className="font-[family-name:var(--font-display)] text-lg font-semibold text-text-primary">
        {name}
      </h3>
      <p className="mt-1 text-sm text-text-muted">{description}</p>

      <p className="mt-4 flex items-baseline gap-1">
        <span className="font-[family-name:var(--font-display)] text-4xl font-extrabold text-text-primary">
          {price}&euro;
        </span>
        {period && (
          <span className="text-sm text-text-muted">{period}</span>
        )}
      </p>

      <ul className="mt-6 flex flex-1 flex-col gap-3">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm text-text-secondary">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent-green" />
            <span>{f}</span>
          </li>
        ))}
      </ul>

      <Link
        href={ctaHref}
        className={`mt-6 block rounded-xl py-2.5 text-center text-sm font-semibold transition-colors ${
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
