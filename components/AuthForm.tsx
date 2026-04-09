"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

interface AuthFormProps {
  redirectTo?: string;
}

export function AuthForm({ redirectTo = "/setup" }: AuthFormProps) {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (mode === "signup") {
        const { error: signUpErr } = await supabase.auth.signUp({
          email,
          password,
        });
        if (signUpErr) throw signUpErr;
      } else {
        const { error: signInErr } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInErr) throw signInErr;
      }
      router.push(redirectTo);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur d'authentification");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 w-full max-w-sm">
      {error && (
        <div className="p-3 rounded-lg bg-radar-red/10 border border-radar-red/20 text-radar-red text-sm">
          {error}
        </div>
      )}

      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        required
        className="w-full px-4 py-3 rounded-lg bg-radar-surface border border-radar-border text-radar-text placeholder:text-radar-text-muted focus:outline-none focus:border-radar-accent"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Mot de passe"
        required
        minLength={6}
        className="w-full px-4 py-3 rounded-lg bg-radar-surface border border-radar-border text-radar-text placeholder:text-radar-text-muted focus:outline-none focus:border-radar-accent"
      />

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 rounded-lg bg-radar-accent text-white font-semibold disabled:opacity-40 hover:brightness-110 transition-all"
      >
        {loading
          ? "Chargement..."
          : mode === "signup"
            ? "Créer un compte"
            : "Se connecter"}
      </button>

      <button
        type="button"
        onClick={() => setMode(mode === "signup" ? "login" : "signup")}
        className="w-full text-sm text-radar-text-muted hover:text-radar-text transition-colors"
      >
        {mode === "signup"
          ? "Déjà un compte ? Se connecter"
          : "Pas de compte ? S'inscrire"}
      </button>
    </form>
  );
}
