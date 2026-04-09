import { TenderDetail } from "@/components/TenderDetail";
import { Navigation } from "@/components/Navigation";

interface TenderPageProps {
  params: Promise<{ id: string }>;
}

export default async function TenderPage({ params }: TenderPageProps) {
  const { id } = await params;
  return (
    <main className="min-h-screen">
      <TenderDetail tenderId={id} />
      <Navigation />
    </main>
  );
}
