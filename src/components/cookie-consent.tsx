'use client';

// ---------------------------------------------------------------------------
// Cookie consent banner — GDPR / Belgian "loi cookies" compliance
// ---------------------------------------------------------------------------
//
// We set Supabase auth cookies (HTTP-only, security-essential) and PWA
// service-worker storage. Both fall under the "strictly necessary"
// exemption — no consent required by GDPR / 2002/58/CE. But Belgian
// case law expects an informational banner anyway, with a clear "Refuser
// analytics" option once we add Plausible/Posthog.
//
// Implementation:
//   - localStorage flag once user closes the banner. Re-shown if they
//     clear browsing data.
//   - Renders client-side only (we don't want SSR flicker on every page).
//   - Sticky bottom bar that doesn't block the UI.
// ---------------------------------------------------------------------------

import { useEffect, useState } from 'react';
import Link from 'next/link';

const STORAGE_KEY = 'radar.cookie-consent.v1';

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (!stored) setVisible(true);
    } catch {
      // Private mode / SSR — don't surface the banner if we can't persist.
    }
  }, []);

  const accept = () => {
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ accepted: true, ts: Date.now() }),
      );
    } catch {}
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookies & confidentialité"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-bg-card/95 px-4 py-3 backdrop-blur-md sm:px-6"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center">
        <p className="flex-1 text-xs leading-relaxed text-text-secondary sm:text-sm">
          Radar utilise uniquement des cookies <strong>techniques</strong> nécessaires
          au fonctionnement de l&apos;authentification et de l&apos;app PWA. Aucun
          tracker tiers, aucune publicité.{' '}
          <Link
            href="/confidentialite"
            className="text-accent-blue hover:underline"
          >
            En savoir plus
          </Link>
          .
        </p>
        <button
          onClick={accept}
          className="shrink-0 rounded-lg bg-accent-blue px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-blue/90"
        >
          J&apos;ai compris
        </button>
      </div>
    </div>
  );
}
