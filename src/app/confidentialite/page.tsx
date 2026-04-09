import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Politique de confidentialité',
  description: 'Politique de confidentialité et protection des données personnelles — Radar.',
};

export default function Confidentialite() {
  return (
    <main className="min-h-dvh bg-bg-primary text-text-primary">
      <div className="mx-auto max-w-3xl px-4 py-12">
        <Link href="/" className="text-accent-blue text-sm mb-8 inline-block hover:underline">
          &larr; Retour à l&apos;accueil
        </Link>

        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold mb-8">
          Politique de confidentialité
        </h1>

        <p className="text-text-secondary mb-8">Dernière mise à jour : avril 2026</p>

        <div className="space-y-8 text-text-secondary leading-relaxed">
          <section>
            <h2 className="text-text-primary font-semibold text-xl mb-3">1. Responsable du traitement</h2>
            <p>
              Le responsable du traitement des données personnelles est [Nom de la société],
              [adresse], Belgique. Contact : privacy@radar.be
            </p>
          </section>

          <section>
            <h2 className="text-text-primary font-semibold text-xl mb-3">2. Données collectées</h2>
            <p>Nous collectons les données suivantes :</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Données d&apos;identification : adresse email, nom de l&apos;entreprise</li>
              <li>Données professionnelles : secteur d&apos;activité, certifications, régions d&apos;intervention</li>
              <li>Données d&apos;utilisation : marchés consultés, sauvegardés, soumissions générées</li>
              <li>Données de paiement : traitées par Stripe, nous ne stockons pas les données bancaires</li>
            </ul>
          </section>

          <section>
            <h2 className="text-text-primary font-semibold text-xl mb-3">3. Finalités du traitement</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>Fournir le service de veille et d&apos;aide à la soumission</li>
              <li>Personnaliser les recommandations de marchés publics</li>
              <li>Générer des analyses et documents via intelligence artificielle</li>
              <li>Gérer les abonnements et la facturation</li>
              <li>Améliorer nos services et notre algorithme de matching</li>
            </ul>
          </section>

          <section>
            <h2 className="text-text-primary font-semibold text-xl mb-3">4. Base légale</h2>
            <p>
              Le traitement de vos données est fondé sur l&apos;exécution du contrat (fourniture du
              service), votre consentement (notifications, cookies non essentiels), et notre intérêt
              légitime (amélioration du service, sécurité).
            </p>
          </section>

          <section>
            <h2 className="text-text-primary font-semibold text-xl mb-3">5. Intelligence artificielle</h2>
            <p>
              Radar utilise l&apos;API Claude d&apos;Anthropic pour l&apos;analyse des marchés et la génération
              de documents. Les données transmises à l&apos;IA comprennent votre profil entreprise et
              le contenu des marchés publics (données publiques). Anthropic ne conserve pas ces
              données pour entraîner ses modèles (API usage policy).
            </p>
          </section>

          <section>
            <h2 className="text-text-primary font-semibold text-xl mb-3">6. Sous-traitants</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>Supabase (hébergement données, EU-West) — base de données et authentification</li>
              <li>Vercel (hébergement application) — CDN et serveurs edge</li>
              <li>Stripe (paiements) — traitement des transactions</li>
              <li>Anthropic (IA) — analyse et génération de contenu</li>
            </ul>
          </section>

          <section>
            <h2 className="text-text-primary font-semibold text-xl mb-3">7. Durée de conservation</h2>
            <p>
              Vos données sont conservées pendant la durée de votre compte actif, puis supprimées
              dans les 30 jours suivant la suppression de votre compte. Les données de facturation
              sont conservées 10 ans conformément à la législation belge.
            </p>
          </section>

          <section>
            <h2 className="text-text-primary font-semibold text-xl mb-3">8. Vos droits (RGPD)</h2>
            <p>Conformément au RGPD, vous disposez des droits suivants :</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Droit d&apos;accès à vos données personnelles</li>
              <li>Droit de rectification</li>
              <li>Droit à l&apos;effacement (&quot;droit à l&apos;oubli&quot;)</li>
              <li>Droit à la portabilité des données</li>
              <li>Droit d&apos;opposition et de limitation du traitement</li>
              <li>Droit de retirer votre consentement à tout moment</li>
            </ul>
            <p className="mt-2">
              Pour exercer ces droits : privacy@radar.be. Vous pouvez également introduire une
              réclamation auprès de l&apos;Autorité de protection des données (APD) belge.
            </p>
          </section>

          <section>
            <h2 className="text-text-primary font-semibold text-xl mb-3">9. Cookies</h2>
            <p>
              Nous utilisons uniquement des cookies essentiels au fonctionnement du service
              (authentification, session). Aucun cookie publicitaire ou de tracking n&apos;est utilisé.
            </p>
          </section>

          <section>
            <h2 className="text-text-primary font-semibold text-xl mb-3">10. Sécurité</h2>
            <p>
              Nous mettons en œuvre des mesures techniques et organisationnelles appropriées :
              chiffrement en transit (TLS) et au repos, authentification sécurisée, contrôle d&apos;accès,
              journalisation des accès.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
