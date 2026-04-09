import { SavedList } from "@/components/SavedList";
import { Navigation } from "@/components/Navigation";

export default function SavedPage() {
  return (
    <main className="min-h-screen pb-20">
      <div className="px-4 pt-6 pb-4">
        <h1 className="text-xl font-bold">Favoris</h1>
        <p className="text-xs text-radar-text-muted mt-1">
          Vos marchés sauvegardés et candidatures
        </p>
      </div>
      <div className="px-4">
        <SavedList />
      </div>
      <Navigation />
    </main>
  );
}
