import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen px-6 py-12">
      <div className="max-w-lg w-full text-center space-y-8">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-radar-border text-sm text-radar-text-muted font-mono">
            <span className="w-2 h-2 rounded-full bg-radar-green animate-pulse" />
            Actif — scan quotidien
          </div>
        </div>

        <h1 className="text-4xl font-bold tracking-tight leading-tight">
          Recevez chaque matin les marchés publics{" "}
          <span className="text-radar-accent">faits pour vous.</span>
        </h1>

        <p className="text-lg text-radar-text-muted leading-relaxed">
          L&apos;IA analyse 20 000+ marchés publics belges et vous envoie
          uniquement ceux qui correspondent à votre entreprise.
        </p>

        <div className="flex flex-col gap-3">
          <Link
            href="/setup"
            className="w-full py-4 px-6 bg-radar-accent text-white font-semibold rounded-lg text-center hover:brightness-110 transition-all"
          >
            Commencer gratuitement
          </Link>
          <Link
            href="/feed"
            className="w-full py-4 px-6 border border-radar-border text-radar-text-muted rounded-lg text-center hover:border-radar-text-muted transition-all"
          >
            Voir le feed démo
          </Link>
        </div>

        <div className="grid grid-cols-3 gap-4 pt-8 border-t border-radar-border">
          <div>
            <div className="text-2xl font-bold font-mono text-radar-green">24h</div>
            <div className="text-xs text-radar-text-muted mt-1">Délai de détection</div>
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-radar-accent">IA</div>
            <div className="text-xs text-radar-text-muted mt-1">Analyse automatique</div>
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-radar-yellow">0€</div>
            <div className="text-xs text-radar-text-muted mt-1">Gratuit pour démarrer</div>
          </div>
        </div>
      </div>
    </main>
  );
}
