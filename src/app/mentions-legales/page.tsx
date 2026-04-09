import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Mentions légales',
  description: 'Mentions légales de Radar — plateforme de veille des marchés publics belges.',
};

export default function MentionsLegales() {
  return (
    <main className="min-h-dvh bg-bg-primary text-text-primary">
      <div className="mx-auto max-w-3xl px-4 py-12">
        <Link href="/" className="text-accent-blue text-sm mb-8 inline-block hover:underline">
          &larr; Retour à l&apos;accueil
        </Link>

        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold mb-8">
          Mentions légales
        </h1>

        <div className="space-y-8 text-text-secondary leading-relaxed">
          <section>
            <h2 className="text-text-primary font-semibold text-xl mb-3">Éditeur du site</h2>
            <p>
              Radar est édité par [Nom de la société], société [forme juridique] au capital de [montant] euros,
              immatriculée au registre du commerce sous le numéro [BCE], dont le siège social est situé
              à [adresse], Belgique.
            </p>
            <p className="mt-2">Email : contact@radar.be</p>
            <p>Numéro de TVA : BE [numéro]</p>
          </section>

          <section>
            <h2 className="text-text-primary font-semibold text-xl mb-3">Directeur de la publication</h2>
            <p>[Nom du directeur de publication]</p>
          </section>

          <section>
            <h2 className="text-text-primary font-semibold text-xl mb-3">Hébergement</h2>
            <p>
              Ce site est hébergé par Vercel Inc., 340 S Lemon Ave #4133, Walnut, CA 91789, États-Unis.
            </p>
            <p className="mt-2">
              Les données sont stockées dans l&apos;Union Européenne via Supabase (région EU-West).
            </p>
          </section>

          <section>
            <h2 className="text-text-primary font-semibold text-xl mb-3">Propriété intellectuelle</h2>
            <p>
              L&apos;ensemble du contenu de ce site (textes, graphismes, logiciels, images, etc.) est la
              propriété exclusive de Radar ou de ses partenaires. Toute reproduction, même partielle,
              est interdite sans autorisation préalable.
            </p>
          </section>

          <section>
            <h2 className="text-text-primary font-semibold text-xl mb-3">Avertissement</h2>
            <p>
              Radar est un outil d&apos;aide à la décision. Les analyses IA sont indicatives et ne
              constituent pas un avis juridique. L&apos;utilisateur reste seul responsable de ses
              décisions de soumission aux marchés publics.
            </p>
          </section>

          <section>
            <h2 className="text-text-primary font-semibold text-xl mb-3">Contact</h2>
            <p>
              Pour toute question relative à ces mentions légales, vous pouvez nous contacter à
              l&apos;adresse : contact@radar.be
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
