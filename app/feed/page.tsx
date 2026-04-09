import { FeedList } from "@/components/FeedList";
import { Navigation } from "@/components/Navigation";

export default function FeedPage() {
  return (
    <main className="min-h-screen pb-20">
      <div className="px-4 pt-6 pb-4">
        <h1 className="text-xl font-bold">Opportunités</h1>
        <p className="text-xs text-radar-text-muted mt-1">
          Marchés triés par pertinence pour votre profil
        </p>
      </div>
      <div className="px-4">
        <FeedList />
      </div>
      <Navigation />
    </main>
  );
}
