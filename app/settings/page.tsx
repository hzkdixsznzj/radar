import { SettingsForm } from "@/components/SettingsForm";
import { Navigation } from "@/components/Navigation";

export default function SettingsPage() {
  return (
    <main className="min-h-screen pb-20">
      <div className="px-4 pt-6 pb-4">
        <h1 className="text-xl font-bold">Paramètres</h1>
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
