import { OnboardingFlow } from "@/components/OnboardingFlow";

export default function SetupPage() {
  return (
    <main className="min-h-screen flex flex-col">
      <div className="text-center pt-8 pb-4 px-6">
        <h1 className="text-2xl font-bold">Configuration</h1>
        <p className="text-sm text-radar-text-muted mt-1">
          Personnalisez vos alertes en 2 minutes
        </p>
      </div>
      <OnboardingFlow />
    </main>
  );
}
