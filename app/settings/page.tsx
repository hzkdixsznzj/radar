import { SettingsForm } from "@/components/SettingsForm";
import { Navigation } from "@/components/Navigation";
import Link from "next/link";

export default function SettingsPage() {
  return (
    <main className="min-h-screen pb-20">
      <div className="px-4 pt-6 pb-4">
        <Link
          href="/feed"
          className="text-sm text-radar-text-muted hover:text-radar-text transition-colors"
        >
          ← Retour au feed
        </Link>
        <h1 className="text-xl font-bold mt-3">Paramètres</h1>
        <p className="text-xs text-radar-text-muted mt-1">
          Gérez votre profil et vos préférences
        </p>
      </div>
      <div className="px-4">
        <SettingsForm />
      </div>
      <Navigation />
    </main>
  );
}
