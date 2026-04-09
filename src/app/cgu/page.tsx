import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Conditions générales d\'utilisation',
  description: 'Conditions générales d\'utilisation de Radar — plateforme de veille des marchés publics.',
};

export default function CGU() {
  return (
    <main className="min-h-dvh bg-bg-primary text-text-primary">
      <div className="mx-auto max-w-3xl px-4 py-12">
        <Link href="/" className="text-accent-blue text-sm mb-8 inline-block hover:underline">
          &larr; Retour à l&apos;accueil
        </Link>

        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold mb-8">
          Conditions générales d&apos;utilisation
        </h1>

        <p className="text-text-secondary mb-8">Dernière mise à jour : avril 2026</p>

        <div className="space-y-8 text-text-secondary leading-relaxed">
          <section>
            <h2 className="text-text-primary font-semibold text-xl mb-3">1. Objet</h2>
            <p>
              Les présentes conditions générales d&apos;utilisation régissent l&apos;accès et l&apos;utilisation
              de la plateforme Radar, un service en ligne de veille des marchés publics et d&apos;aide
              à la soumission destiné aux PME en Belgique.
            </p>
          </section>

          <section>
            <h2 className="text-text-primary font-semibold text-xl mb-3">2. Description du service</h2>
            <p>Radar propose les services suivants :</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Agrégation et présentation de marchés publics issus de sources officielles (TED, Bulletin des Adjudications)</li>
              <li>Matching personnalisé selon le profil de l&apos;entreprise</li>
              <li>Analyse des marchés par intelligence artificielle</li>
              <li>Aide à la rédaction de soumissions (mémoire technique)</li>
              <li>Assistant conversationnel spécialisé en marchés publics belges</li>
            </ul>
          </section>

          <section>
            <h2 className="text-text-primary font-semibold text-xl mb-3">3. Inscription et compte</h2>
            <p>
              L&apos;inscription est gratuite et ouverte à toute personne physique ou morale. L&apos;utilisateur
              s&apos;engage à fournir des informations exactes et à maintenir la confidentialité de ses
              identifiants de connexion.
            </p>
          </section>

          <section>
            <h2 className="text-text-primary font-semibold text-xl mb-3">4. Abonnements et paiement</h2>
            <p>
              Radar propose des plans gratuit et payants. Les abonnements payants sont facturés
              mensuellement via Stripe. L&apos;utilisateur peut annuler son abonnement à tout moment ;
              l&apos;accès reste actif jusqu&apos;à la fin de la période payée. L&apos;essai gratuit de 14 jours
              se convertit automatiquement en abonnement payant sauf annulation.
            </p>
          </section>

          <section>
            <h2 className="text-text-primary font-semibold text-xl mb-3">5. Limitation de responsabilité</h2>
            <p>
              <strong className="text-text-primary">
                Radar est un outil d&apos;aide à la décision. Les analyses IA sont indicatives et ne
                constituent pas un avis juridique.
              </strong>
            </p>
            <p className="mt-2">
              L&apos;utilisateur reste seul responsable de ses décisions de soumission aux marchés publics,
              du contenu de ses soumissions, et de la vérification de l&apos;exactitude des informations
              fournies par la plateforme. Radar ne garantit ni l&apos;exhaustivité des marchés référencés,
              ni l&apos;exactitude des analyses IA, ni le succès des soumissions.
            </p>
          </section>

          <section>
            <h2 className="text-text-primary font-semibold text-xl mb-3">6. Propriété intellectuelle</h2>
            <p>
              Les contenus générés par l&apos;IA à la demande de l&apos;utilisateur lui appartiennent.
              L&apos;utilisateur accorde à Radar une licence limitée d&apos;utilisation de son profil
              pour le fonctionnement du service (matching, analyses).
            </p>
          </section>

          <section>
            <h2 className="text-text-primary font-semibold text-xl mb-3">7. Données des marchés publics</h2>
            <p>
              Les données des marchés publics affichées sur Radar sont issues de sources officielles
              publiques (TED — Journal officiel de l&apos;UE, e-Procurement Belgique). Radar ne modifie
              pas le contenu original des avis de marché.
            </p>
          </section>

          <section>
            <h2 className="text-text-primary font-semibold text-xl mb-3">8. Résiliation</h2>
            <p>
              L&apos;utilisateur peut supprimer son compte à tout moment depuis les paramètres de
              son profil. Radar se réserve le droit de suspendre ou supprimer un compte en cas
              de violation des présentes conditions.
            </p>
          </section>

          <section>
            <h2 className="text-text-primary font-semibold text-xl mb-3">9. Droit applicable</h2>
            <p>
              Les présentes conditions sont soumises au droit belge. En cas de litige, les
              tribunaux de [ville] seront seuls compétents.
            </p>
          </section>

          <section>
            <h2 className="text-text-primary font-semibold text-xl mb-3">10. Modifications</h2>
            <p>
              Radar se réserve le droit de modifier les présentes conditions. Les utilisateurs
              seront informés par email de toute modification substantielle. L&apos;utilisation
              continue du service après modification vaut acceptation.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
