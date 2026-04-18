import type { Metadata } from 'next';
import Link from 'next/link';
import { LEGAL_INFO } from '@/lib/legal-info';

export const metadata: Metadata = {
  title: 'Conditions générales d\'utilisation',
  description:
    'Conditions générales d\'utilisation de Radar — plateforme de veille des marchés publics belges.',
};

export default function CGU() {
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
          Conditions générales d&apos;utilisation
        </h1>

        <p className="mt-2 text-sm text-text-muted">
          Dernière mise à jour : avril 2026
        </p>

        <div className="mt-10 space-y-10 font-[family-name:var(--font-body)] leading-relaxed text-text-secondary">
          <section>
            <h2 className="mb-3 font-[family-name:var(--font-display)] text-xl font-semibold text-text-primary">
              1. Objet et définitions
            </h2>
            <p>
              Les présentes conditions générales d&apos;utilisation (ci-après
              les « CGU ») régissent l&apos;accès et l&apos;utilisation de la
              plateforme Radar, un service en ligne de veille des marchés
              publics belges et européens, de matching par intelligence
              artificielle et d&apos;assistance à la rédaction de soumissions,
              édité par {LEGAL_INFO.companyName}.
            </p>
            <p className="mt-3">Pour les besoins des CGU :</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                « Radar » désigne la plateforme et le service fourni par{' '}
                {LEGAL_INFO.companyName}.
              </li>
              <li>
                « Utilisateur » désigne toute personne physique ou morale
                disposant d&apos;un compte sur la plateforme.
              </li>
              <li>
                « Marché public » désigne toute procédure d&apos;attribution
                publiée sur une source officielle (TED, Bulletin des
                Adjudications, etc.).
              </li>
              <li>
                « Services » désigne l&apos;ensemble des fonctionnalités
                accessibles via la plateforme.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 font-[family-name:var(--font-display)] text-xl font-semibold text-text-primary">
              2. Acceptation des conditions
            </h2>
            <p>
              L&apos;utilisation de Radar implique l&apos;acceptation pleine et
              entière des présentes CGU. En créant un compte, l&apos;Utilisateur
              reconnaît avoir pris connaissance des CGU et s&apos;engage à les
              respecter. Tout Utilisateur qui n&apos;accepterait pas ces
              conditions doit renoncer à l&apos;usage de la plateforme.
            </p>
          </section>

          <section>
            <h2 className="mb-3 font-[family-name:var(--font-display)] text-xl font-semibold text-text-primary">
              3. Description du service
            </h2>
            <p>Radar propose aux PME belges les services suivants :</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                Agrégation automatisée des avis de marché issus du TED (Journal
                officiel de l&apos;Union européenne) et du Bulletin des
                Adjudications (e-Procurement Belgique).
              </li>
              <li>
                Analyse de pertinence par intelligence artificielle en
                fonction du profil de l&apos;entreprise (secteurs, régions,
                certifications).
              </li>
              <li>
                Assistance à la rédaction de mémoires techniques et de
                soumissions.
              </li>
              <li>
                Alertes, export et outils de suivi des opportunités.
              </li>
            </ul>
            <p className="mt-3">
              Radar agit en qualité d&apos;intermédiaire technique et
              n&apos;est pas responsable de l&apos;exactitude, de
              l&apos;exhaustivité ni de la disponibilité des publications
              officielles à l&apos;origine des données. Les sources officielles
              font foi en cas de divergence.
            </p>
          </section>

          <section>
            <h2 className="mb-3 font-[family-name:var(--font-display)] text-xl font-semibold text-text-primary">
              4. Inscription et compte utilisateur
            </h2>
            <p>
              L&apos;inscription est ouverte à toute entreprise légalement
              constituée. L&apos;authentification se fait par lien magique
              (magic link) envoyé à l&apos;adresse email de l&apos;Utilisateur.
              L&apos;Utilisateur s&apos;engage à fournir des informations
              exactes, à jour et complètes, et à maintenir la confidentialité
              de l&apos;accès à sa boîte mail.
            </p>
            <p className="mt-3">
              Le compte est strictement personnel et rattaché à une seule
              entreprise. Le partage des identifiants avec des tiers ou
              l&apos;usage du compte pour le bénéfice d&apos;une autre
              entreprise que celle déclarée est interdit.
            </p>
          </section>

          <section>
            <h2 className="mb-3 font-[family-name:var(--font-display)] text-xl font-semibold text-text-primary">
              5. Abonnements et paiement
            </h2>
            <p>Radar propose trois formules d&apos;abonnement :</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                <strong className="text-text-primary">Gratuit</strong> —
                fonctionnalités limitées, sans engagement.
              </li>
              <li>
                <strong className="text-text-primary">Pro</strong> — 29 € HTVA
                par mois, avec essai gratuit de 14 jours.
              </li>
              <li>
                <strong className="text-text-primary">Business</strong> — 79 €
                HTVA par mois, pour les équipes.
              </li>
            </ul>
            <p className="mt-3">
              Les prix sont indiqués hors TVA. La facturation se fait
              mensuellement ou annuellement selon la formule choisie, et le
              paiement est traité par Stripe Payments Europe Ltd. Aucune
              donnée de carte bancaire n&apos;est stockée sur les serveurs de
              Radar.
            </p>
            <p className="mt-3">
              L&apos;essai gratuit se convertit automatiquement en abonnement
              payant à son terme, sauf annulation préalable. L&apos;Utilisateur
              peut résilier son abonnement à tout moment depuis les paramètres
              de son compte ; l&apos;accès reste actif jusqu&apos;à la fin de
              la période de facturation en cours, sans remboursement au
              prorata.
            </p>
          </section>

          <section>
            <h2 className="mb-3 font-[family-name:var(--font-display)] text-xl font-semibold text-text-primary">
              6. Obligations de l&apos;utilisateur
            </h2>
            <p>L&apos;Utilisateur s&apos;engage à :</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                Fournir des informations exactes lors de l&apos;inscription et
                maintenir son profil entreprise à jour.
              </li>
              <li>
                Respecter la législation belge et européenne, notamment en
                matière de marchés publics et de propriété intellectuelle.
              </li>
              <li>
                Ne pas tenter de contourner les mécanismes techniques de la
                plateforme, ne pas extraire massivement les données (scraping,
                crawling automatisé), ne pas surcharger les serveurs.
              </li>
              <li>
                Ne pas utiliser Radar à des fins illicites, frauduleuses ou
                contraires aux bonnes mœurs.
              </li>
              <li>
                Ne pas revendre, sous-licencier ou mettre à disposition de
                tiers l&apos;accès à la plateforme.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 font-[family-name:var(--font-display)] text-xl font-semibold text-text-primary">
              7. Propriété intellectuelle
            </h2>
            <p>
              La plateforme Radar, son code source, son design, ses marques,
              logos, algorithmes de matching et bases de données sont la
              propriété exclusive de {LEGAL_INFO.companyName}. Toute
              reproduction, représentation ou exploitation non autorisée est
              interdite.
            </p>
            <p className="mt-3">
              Les contenus créés par l&apos;Utilisateur (profil entreprise,
              soumissions générées, notes) restent sa propriété.
              L&apos;Utilisateur accorde à Radar une licence non exclusive,
              mondiale et gratuite, strictement limitée à la durée de son
              abonnement, pour traiter ces contenus dans le cadre de la
              fourniture du service, notamment par l&apos;intermédiaire de
              l&apos;intelligence artificielle.
            </p>
            <p className="mt-3">
              Les données des avis de marché diffusées par les sources
              officielles sont des informations publiques ; leur utilisation
              par l&apos;Utilisateur reste soumise aux conditions définies par
              les éditeurs de ces sources.
            </p>
          </section>

          <section>
            <h2 className="mb-3 font-[family-name:var(--font-display)] text-xl font-semibold text-text-primary">
              8. Utilisation de l&apos;intelligence artificielle
            </h2>
            <p>
              Radar s&apos;appuie sur l&apos;API Claude d&apos;Anthropic pour
              réaliser les analyses de pertinence et la génération de
              documents. L&apos;Utilisateur reconnaît que les sorties de
              l&apos;IA sont par nature probabilistes et peuvent contenir des
              erreurs, des approximations ou des omissions.
            </p>
            <p className="mt-3">
              Il incombe à l&apos;Utilisateur de vérifier, corriger et valider
              l&apos;intégralité des contenus générés avant toute utilisation,
              notamment avant dépôt d&apos;une soumission. Radar ne peut en
              aucun cas être tenu responsable des conséquences de
              l&apos;utilisation directe, sans relecture humaine, d&apos;un
              contenu produit par l&apos;IA.
            </p>
          </section>

          <section>
            <h2 className="mb-3 font-[family-name:var(--font-display)] text-xl font-semibold text-text-primary">
              9. Limitation de responsabilité
            </h2>
            <p>
              Radar est un outil d&apos;aide à la veille et à la décision,
              fourni « en l&apos;état » et « selon disponibilité ». Aucune
              garantie n&apos;est donnée quant à l&apos;exhaustivité des
              marchés référencés, à la pertinence des recommandations, à la
              qualité des contenus générés par l&apos;IA, ni au décrochage
              d&apos;un marché public.
            </p>
            <p className="mt-3">
              Dans les limites autorisées par le droit belge, la responsabilité
              de {LEGAL_INFO.companyName} ne pourra être engagée que pour les
              dommages directs, prouvés, et plafonnée au montant des sommes
              effectivement versées par l&apos;Utilisateur au titre de son
              abonnement au cours des douze mois précédant le fait générateur.
              Les dommages indirects, pertes d&apos;exploitation, pertes de
              chance ou pertes de chiffre d&apos;affaires sont exclus.
            </p>
          </section>

          <section>
            <h2 className="mb-3 font-[family-name:var(--font-display)] text-xl font-semibold text-text-primary">
              10. Protection des données personnelles
            </h2>
            <p>
              Le traitement des données personnelles de l&apos;Utilisateur est
              décrit dans la{' '}
              <Link
                href="/confidentialite"
                className="text-accent-blue hover:underline"
              >
                Politique de confidentialité
              </Link>
              , qui fait partie intégrante des présentes CGU.
            </p>
          </section>

          <section>
            <h2 className="mb-3 font-[family-name:var(--font-display)] text-xl font-semibold text-text-primary">
              11. Modification des CGU
            </h2>
            <p>
              {LEGAL_INFO.companyName} se réserve le droit de modifier les
              présentes CGU à tout moment, notamment pour tenir compte
              d&apos;évolutions légales, techniques ou commerciales. Les
              Utilisateurs seront informés par email au moins trente (30)
              jours avant l&apos;entrée en vigueur d&apos;une modification
              substantielle. L&apos;utilisation continue du service après cette
              échéance vaut acceptation des nouvelles conditions.
            </p>
          </section>

          <section>
            <h2 className="mb-3 font-[family-name:var(--font-display)] text-xl font-semibold text-text-primary">
              12. Droit applicable et juridiction
            </h2>
            <p>
              Les présentes CGU sont soumises au droit belge. Tout litige
              relatif à leur formation, leur interprétation ou leur exécution
              sera, à défaut de résolution amiable, de la compétence exclusive
              des cours et tribunaux de l&apos;arrondissement judiciaire dans
              lequel est établi le siège social de {LEGAL_INFO.companyName}.
            </p>
          </section>

          <section>
            <h2 className="mb-3 font-[family-name:var(--font-display)] text-xl font-semibold text-text-primary">
              13. Contact
            </h2>
            <p>
              Pour toute question relative aux présentes CGU, vous pouvez
              contacter Radar à l&apos;adresse{' '}
              <a
                href={`mailto:${LEGAL_INFO.contactEmail}`}
                className="text-accent-blue hover:underline"
              >
                {LEGAL_INFO.contactEmail}
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
