'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Mail } from 'lucide-react';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!acceptedTerms) {
      setError('Veuillez accepter les conditions d\'utilisation pour continuer.');
      return;
    }

    setLoading(true);

    try {
      const { error: signUpError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (signUpError) {
        setError(signUpError.message);
      } else {
        setSuccess(true);
      }
    } catch {
      setError('Une erreur inattendue est survenue. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignup() {
    setError(null);

    if (!acceptedTerms) {
      setError('Veuillez accepter les conditions d\'utilisation pour continuer.');
      return;
    }

    setGoogleLoading(true);

    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (oauthError) {
        setError(oauthError.message);
        setGoogleLoading(false);
      }
    } catch {
      setError('Une erreur inattendue est survenue. Veuillez réessayer.');
      setGoogleLoading(false);
    }
  }

  if (success) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-4">
        <div className="w-full max-w-sm rounded-2xl border border-border bg-bg-card p-8 text-center">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-accent-green-soft">
            <Mail className="size-6 text-accent-green" />
          </div>
          <h2 className="font-display text-xl font-semibold text-text-primary">
            Vérifiez votre boîte mail
          </h2>
          <p className="mt-2 text-sm text-text-secondary">
            Nous avons envoyé un lien de connexion à{' '}
            <span className="font-medium text-text-primary">{email}</span>.
            Cliquez sur le lien pour finaliser votre inscription.
          </p>
          <button
            onClick={() => {
              setSuccess(false);
              setEmail('');
            }}
            className="mt-6 text-sm text-accent-blue hover:underline"
          >
            Utiliser une autre adresse
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="rounded-2xl border border-border bg-bg-card p-8">
          <div className="mb-6 text-center">
            <h1 className="font-display text-2xl font-bold text-text-primary">
              Créer votre compte Radar
            </h1>
            <p className="mt-1 text-sm text-text-secondary">
              Commencez à trouver des marchés publics pertinents
            </p>
          </div>

          <form onSubmit={handleMagicLink} className="space-y-4">
            <Input
              type="email"
              label="Adresse email"
              placeholder="vous@entreprise.be"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              icon={<Mail className="size-4" />}
              required
            />

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="mt-0.5 size-4 shrink-0 rounded border-border bg-bg-input accent-accent-blue"
              />
              <span className="text-xs leading-relaxed text-text-secondary">
                J&apos;accepte les{' '}
                <Link href="/terms" className="text-accent-blue hover:underline">
                  conditions d&apos;utilisation
                </Link>{' '}
                et la{' '}
                <Link href="/privacy" className="text-accent-blue hover:underline">
                  politique de confidentialité
                </Link>
              </span>
            </label>

            <Button
              type="submit"
              fullWidth
              size="lg"
              loading={loading}
              disabled={!acceptedTerms}
            >
              Envoyer le lien
            </Button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-text-muted">ou</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <Button
            variant="secondary"
            fullWidth
            size="lg"
            loading={googleLoading}
            disabled={!acceptedTerms}
            onClick={handleGoogleSignup}
            icon={
              <svg className="size-5" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
            }
          >
            Continuer avec Google
          </Button>

          {error && (
            <p className="mt-4 rounded-lg bg-accent-red-soft p-3 text-center text-sm text-accent-red">
              {error}
            </p>
          )}
        </div>

        <p className="mt-6 text-center text-sm text-text-secondary">
          Déjà un compte ?{' '}
          <Link href="/login" className="text-accent-blue hover:underline">
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  );
}
