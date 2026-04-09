import { AuthForm } from "@/components/AuthForm";

export default function AuthPage() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen px-6">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold">Radar</h1>
        <p className="text-sm text-radar-text-muted mt-2">
          Marchés publics pour PME construction
        </p>
      </div>
      <AuthForm />
    </main>
  );
}
