import type { Metadata } from 'next';
import Link from 'next/link';
import { LEGAL_INFO } from '@/lib/legal-info';

export const metadata: Metadata = {
  title: 'Politique de confidentialité',
  description:
    'Politique de confidentialité et protection des données personnelles — Radar.',
};

export default function Confidentialite() {
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
          Politique de confidentialité
        </h1>

        <p className="mt-2 text-sm text-text-muted">
          Dernière mise à jour : avril 2026
        </p>

        <div className="mt-10 space-y-10 font-[family-name:var(--font-body)] leading-relaxed text-text-secondary">
          <section>
            <p>
              La présente politique décrit la manière dont Radar collecte,
              utilise, conserve et protège les données à caractère personnel
              de ses utilisateurs, conformément au Règlement (UE) 2016/679 du
              27 avril 2016 (« RGPD ») et à la loi belge du 30 juillet 2018
              relative à la protection des personnes physiques à l&apos;égard
              des traitements de données à caractère personnel.
            </p>
          </section>

          <section>
            <h2 className="mb-3 font-[family-name:var(--font-display)] text-xl font-semibold text-text-primary">
              1. Responsable du traitement
            </h2>
            <p>Le responsable du traitement est :</p>
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
                <strong className="text-text-primary">BCE :</strong>{' '}
                {LEGAL_INFO.bceNumber}
              </li>
              <li>
                <strong className="text-text-primary">TVA :</strong>{' '}
                {LEGAL_INFO.vatNumber}
              </li>
              <li>
                <strong className="text-text-primary">Contact vie privée :</strong>{' '}
                <a
                  href={`mailto:${LEGAL_INFO.privacyEmail}`}
                  className="text-accent-blue hover:underline"
                >
                  {LEGAL_INFO.privacyEmail}
                </a>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 font-[family-name:var(--font-display)] text-xl font-semibold text-text-primary">
              2. Données collectées
            </h2>
            <p>
              Radar collecte uniquement les données nécessaires à la fourniture
              du service :
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                <strong className="text-text-primary">Données d&apos;identification :</strong>{' '}
                adresse email, nom et prénom du contact, nom de
                l&apos;entreprise.
              </li>
              <li>
                <strong className="text-text-primary">Données professionnelles :</strong>{' '}
                secteurs d&apos;activité, régions d&apos;intervention,
                certifications, taille de l&apos;entreprise.
              </li>
              <li>
                <strong className="text-text-primary">Données d&apos;usage :</strong>{' '}
                marchés consultés, actions de swipe (accepté / rejeté /
                favori), soumissions générées, préférences
                d&apos;utilisation.
              </li>
              <li>
                <strong className="text-text-primary">Données de paiement :</strong>{' '}
                traitées exclusivement par Stripe. Aucune donnée de carte
                bancaire n&apos;est collectée ni stockée côté Radar ; seules
                les informations de facturation (référence de paiement,
                montant, date) sont conservées.
              </li>
              <li>
                <strong className="text-text-primary">Données techniques :</strong>{' '}
                journaux d&apos;authentification, adresse IP, type de
                navigateur, pour des raisons de sécurité et de diagnostic.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 font-[family-name:var(--font-display)] text-xl font-semibold text-text-primary">
              3. Finalités du traitement
            </h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                Fournir, maintenir et sécuriser la plateforme et les services
                associés.
              </li>
              <li>
                Personnaliser le matching des marchés publics en fonction du
                profil entreprise.
              </li>
              <li>
                Gérer la facturation, l&apos;abonnement et la relation client.
              </li>
              <li>
                Communiquer avec l&apos;utilisateur sur l&apos;évolution du
                produit, sous réserve de son consentement préalable
                (opt-in).
              </li>
              <li>
                Améliorer le service via des analyses statistiques agrégées et
                anonymisées.
              </li>
              <li>
                Respecter les obligations légales et fiscales applicables en
                Belgique.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 font-[family-name:var(--font-display)] text-xl font-semibold text-text-primary">
              4. Base légale
            </h2>
            <p>
              Le traitement des données repose sur les bases légales suivantes,
              telles que prévues à l&apos;article 6 du RGPD :
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                <strong className="text-text-primary">Exécution du contrat</strong>{' '}
                — pour l&apos;ensemble des traitements nécessaires à la
                fourniture du service souscrit.
              </li>
              <li>
                <strong className="text-text-primary">Consentement</strong> —
                pour l&apos;envoi de communications marketing et produit,
                révocable à tout moment.
              </li>
              <li>
                <strong className="text-text-primary">Obligation légale</strong>{' '}
                — pour la conservation des pièces comptables et
                l&apos;établissement des factures.
              </li>
              <li>
                <strong className="text-text-primary">Intérêt légitime</strong>{' '}
                — pour la sécurité de la plateforme et la prévention de la
                fraude.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 font-[family-name:var(--font-display)] text-xl font-semibold text-text-primary">
              5. Destinataires et sous-traitants
            </h2>
            <p>
              Les données sont traitées par {LEGAL_INFO.companyName} et par un
              nombre limité de sous-traitants, sélectionnés pour leur
              conformité au RGPD :
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                <strong className="text-text-primary">Supabase</strong> —
                hébergement de la base de données et authentification,
                infrastructure située dans l&apos;Union européenne.
              </li>
              <li>
                <strong className="text-text-primary">Vercel</strong> —
                hébergement de l&apos;application et réseau de diffusion de
                contenu.
              </li>
              <li>
                <strong className="text-text-primary">Stripe</strong> —
                traitement des paiements, agréé en tant qu&apos;établissement
                de monnaie électronique dans l&apos;Union européenne.
              </li>
              <li>
                <strong className="text-text-primary">Anthropic</strong> —
                fourniture du modèle d&apos;intelligence artificielle Claude
                pour l&apos;analyse et la génération de contenu.
              </li>
            </ul>
            <p className="mt-3">
              Chaque sous-traitant est lié par un accord de traitement des
              données (DPA) conforme à l&apos;article 28 du RGPD.
            </p>
          </section>

          <section>
            <h2 className="mb-3 font-[family-name:var(--font-display)] text-xl font-semibold text-text-primary">
              6. Durée de conservation
            </h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                Données de compte : pendant toute la durée de l&apos;abonnement,
                puis supprimées dans un délai maximum de trente (30) jours
                après la clôture du compte.
              </li>
              <li>
                Données de facturation et pièces comptables : dix (10) ans,
                conformément à l&apos;article III.86 du Code de droit
                économique belge.
              </li>
              <li>
                Journaux techniques et logs de sécurité : douze (12) mois.
              </li>
              <li>
                Données de prospection : trois (3) ans à compter du dernier
                contact.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 font-[family-name:var(--font-display)] text-xl font-semibold text-text-primary">
              7. Transferts hors Union européenne
            </h2>
            <p>
              Certains sous-traitants, notamment Anthropic PBC (États-Unis),
              peuvent traiter des données en dehors de l&apos;Espace économique
              européen. Ces transferts sont encadrés par les clauses
              contractuelles types adoptées par la Commission européenne, et
              le cas échéant par le Data Privacy Framework entre
              l&apos;Union européenne et les États-Unis, offrant un niveau de
              protection adéquat.
            </p>
          </section>

          <section>
            <h2 className="mb-3 font-[family-name:var(--font-display)] text-xl font-semibold text-text-primary">
              8. Vos droits
            </h2>
            <p>
              Conformément aux articles 15 à 22 du RGPD, vous disposez des
              droits suivants :
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Droit d&apos;accès à vos données personnelles.</li>
              <li>Droit de rectification des données inexactes ou incomplètes.</li>
              <li>Droit à l&apos;effacement (« droit à l&apos;oubli »).</li>
              <li>
                Droit à la portabilité des données dans un format structuré et
                lisible par machine.
              </li>
              <li>Droit d&apos;opposition au traitement.</li>
              <li>Droit à la limitation du traitement.</li>
              <li>
                Droit de retirer votre consentement à tout moment, sans
                incidence sur la licéité du traitement antérieur.
              </li>
            </ul>
            <p className="mt-3">
              Toute demande peut être adressée à{' '}
              <a
                href={`mailto:${LEGAL_INFO.privacyEmail}`}
                className="text-accent-blue hover:underline"
              >
                {LEGAL_INFO.privacyEmail}
              </a>
              . Une réponse vous sera apportée dans un délai maximum de trente
              (30) jours, éventuellement prolongé de deux mois en cas de
              demande complexe.
            </p>
          </section>

          <section>
            <h2 className="mb-3 font-[family-name:var(--font-display)] text-xl font-semibold text-text-primary">
              9. Cookies
            </h2>
            <p>
              Radar utilise uniquement des cookies strictement nécessaires au
              fonctionnement du service : authentification, session et
              préférences d&apos;affichage. Aucun cookie publicitaire, de
              tracking tiers ou de profilage comportemental n&apos;est déposé.
              Aucun consentement n&apos;est requis pour ces cookies essentiels,
              conformément à l&apos;article 129 de la loi belge relative aux
              communications électroniques.
            </p>
          </section>

          <section>
            <h2 className="mb-3 font-[family-name:var(--font-display)] text-xl font-semibold text-text-primary">
              10. Sécurité
            </h2>
            <p>
              Radar met en œuvre des mesures techniques et organisationnelles
              appropriées pour garantir un niveau de sécurité adapté au risque :
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Chiffrement des communications en transit (TLS 1.2+).</li>
              <li>Chiffrement des données au repos.</li>
              <li>
                Cloisonnement des données via Row-Level Security (RLS) sur
                Supabase, garantissant qu&apos;un utilisateur ne peut accéder
                qu&apos;à ses propres données.
              </li>
              <li>
                Authentification par lien magique, sans stockage de mot de
                passe.
              </li>
              <li>
                Journalisation des accès, sauvegardes régulières et audits
                périodiques.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 font-[family-name:var(--font-display)] text-xl font-semibold text-text-primary">
              11. Réclamation
            </h2>
            <p>
              Vous disposez du droit d&apos;introduire une réclamation auprès
              de l&apos;Autorité de protection des données belge si vous
              estimez que le traitement de vos données n&apos;est pas conforme
              au RGPD :
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Autorité de protection des données (APD)</li>
              <li>Rue de la Presse 35, 1000 Bruxelles</li>
              <li>
                <a
                  href="https://www.autoriteprotectiondonnees.be/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-accent-blue hover:underline"
                >
                  https://www.autoriteprotectiondonnees.be/
                </a>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 font-[family-name:var(--font-display)] text-xl font-semibold text-text-primary">
              12. Modification de la politique
            </h2>
            <p>
              La présente politique peut être mise à jour pour tenir compte
              d&apos;évolutions légales, techniques ou fonctionnelles. Toute
              modification substantielle sera portée à la connaissance des
              utilisateurs par email et prendra effet trente (30) jours après
              notification.
            </p>
          </section>

          <section>
            <h2 className="mb-3 font-[family-name:var(--font-display)] text-xl font-semibold text-text-primary">
              13. Contact du délégué à la protection des données
            </h2>
            <p>
              Pour toute question relative au traitement de vos données
              personnelles, vous pouvez contacter notre délégué à la
              protection des données à l&apos;adresse{' '}
              <a
                href={`mailto:${LEGAL_INFO.dpoEmail}`}
                className="text-accent-blue hover:underline"
              >
                {LEGAL_INFO.dpoEmail}
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
