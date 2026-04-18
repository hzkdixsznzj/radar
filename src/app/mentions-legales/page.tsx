import type { Metadata } from 'next';
import Link from 'next/link';
import { LEGAL_INFO } from '@/lib/legal-info';

export const metadata: Metadata = {
  title: 'Mentions légales',
  description:
    'Mentions légales de Radar — plateforme de veille des marchés publics belges.',
};

export default function MentionsLegales() {
  return (
    <main className="min-h-dvh bg-bg-primary text-text-primary">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <Link
          href="/"
          className="mb-8 inline-block text-sm text-accent-blue hover:underline"
        >
          &larr; Retour à l&apos;accueil
        </Link>

        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight sm:text-4xl">
          Mentions légales
        </h1>

        <p className="mt-2 text-sm text-text-muted">
          Dernière mise à jour : avril 2026
        </p>

        <div className="mt-10 space-y-10 font-[family-name:var(--font-body)] leading-relaxed text-text-secondary">
          <section>
            <h2 className="mb-3 font-[family-name:var(--font-display)] text-xl font-semibold text-text-primary">
              Éditeur du site
            </h2>
            <p>
              La plateforme Radar, accessible à l&apos;adresse radar.be, est
              éditée par :
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                <strong className="text-text-primary">Dénomination :</strong>{' '}
                {LEGAL_INFO.companyName}
              </li>
              <li>
                <strong className="text-text-primary">Siège social :</strong>{' '}
                {LEGAL_INFO.companyAddress}
              </li>
              <li>
                <strong className="text-text-primary">
                  Numéro d&apos;entreprise (BCE) :
                </strong>{' '}
                {LEGAL_INFO.bceNumber}
              </li>
              <li>
                <strong className="text-text-primary">Numéro de TVA :</strong>{' '}
                {LEGAL_INFO.vatNumber}
              </li>
              <li>
                <strong className="text-text-primary">Email :</strong>{' '}
                <a
                  href={`mailto:${LEGAL_INFO.contactEmail}`}
                  className="text-accent-blue hover:underline"
                >
                  {LEGAL_INFO.contactEmail}
                </a>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 font-[family-name:var(--font-display)] text-xl font-semibold text-text-primary">
              Directeur de la publication
            </h2>
            <p>
              Le directeur de la publication est le représentant légal de{' '}
              {LEGAL_INFO.companyName}, joignable à l&apos;adresse{' '}
              <a
                href={`mailto:${LEGAL_INFO.contactEmail}`}
                className="text-accent-blue hover:underline"
              >
                {LEGAL_INFO.contactEmail}
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="mb-3 font-[family-name:var(--font-display)] text-xl font-semibold text-text-primary">
              Hébergeur
            </h2>
            <p>
              L&apos;application Radar est hébergée par :
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Vercel Inc.</li>
              <li>440 N Barranca Ave #4133, Covina, CA 91723, États-Unis</li>
              <li>
                <a
                  href="https://vercel.com"
                  target="_blank"
                  rel="noreferrer"
                  className="text-accent-blue hover:underline"
                >
                  https://vercel.com
                </a>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 font-[family-name:var(--font-display)] text-xl font-semibold text-text-primary">
              Base de données
            </h2>
            <p>
              La base de données et le service d&apos;authentification sont
              fournis par Supabase Inc., avec une infrastructure hébergée dans
              l&apos;Union européenne. L&apos;ensemble des données personnelles
              des utilisateurs est stocké sur des serveurs situés au sein de
              l&apos;Espace économique européen.
            </p>
          </section>

          <section>
            <h2 className="mb-3 font-[family-name:var(--font-display)] text-xl font-semibold text-text-primary">
              Propriété intellectuelle
            </h2>
            <p>
              L&apos;ensemble des éléments composant la plateforme Radar —
              design, code source, interfaces, textes, illustrations, logos,
              marque « Radar », algorithmes de matching et bases de données —
              est la propriété exclusive de {LEGAL_INFO.companyName} ou fait
              l&apos;objet d&apos;une licence. Toute reproduction,
              représentation, modification ou exploitation, totale ou
              partielle, est interdite sans autorisation écrite préalable.
            </p>
            <p className="mt-3">
              Les données des avis de marchés publics diffusées par Radar sont
              par nature des informations publiques, issues de sources
              officielles (TED, Bulletin des Adjudications, e-Procurement
              Belgique). Leur utilisation par l&apos;Utilisateur reste soumise
              aux conditions définies par les éditeurs de ces sources.
            </p>
          </section>

          <section>
            <h2 className="mb-3 font-[family-name:var(--font-display)] text-xl font-semibold text-text-primary">
              Liens hypertextes
            </h2>
            <p>
              La plateforme Radar peut contenir des liens vers des sites tiers,
              notamment vers les sources officielles des avis de marché.{' '}
              {LEGAL_INFO.companyName} n&apos;exerce aucun contrôle sur le
              contenu, la disponibilité ou les pratiques de ces sites et ne
              saurait être tenue responsable des dommages de quelque nature que
              ce soit résultant de leur utilisation.
            </p>
          </section>

          <section>
            <h2 className="mb-3 font-[family-name:var(--font-display)] text-xl font-semibold text-text-primary">
              Conditions d&apos;utilisation
            </h2>
            <p>
              L&apos;utilisation de la plateforme est régie par les{' '}
              <Link
                href="/cgu"
                className="text-accent-blue hover:underline"
              >
                Conditions générales d&apos;utilisation
              </Link>
              . Le traitement des données personnelles est décrit dans la{' '}
              <Link
                href="/confidentialite"
                className="text-accent-blue hover:underline"
              >
                Politique de confidentialité
              </Link>
              .
            </p>
          </section>

          <section>
            <h2 className="mb-3 font-[family-name:var(--font-display)] text-xl font-semibold text-text-primary">
              Droit applicable et juridiction
            </h2>
            <p>
              Les présentes mentions légales et l&apos;utilisation de la
              plateforme Radar sont soumises au droit belge. Tout litige
              relatif à leur interprétation ou à leur exécution relève, à
              défaut de résolution amiable, de la compétence exclusive des
              cours et tribunaux de l&apos;arrondissement judiciaire dans
              lequel est établi le siège social de {LEGAL_INFO.companyName}.
            </p>
          </section>

          <section>
            <h2 className="mb-3 font-[family-name:var(--font-display)] text-xl font-semibold text-text-primary">
              Crédits
            </h2>
            <p>
              Radar est conçu et développé par {LEGAL_INFO.companyName}.
            </p>
            <p className="mt-3">Made in Belgium.</p>
          </section>
        </div>
      </div>
    </main>
  );
}
