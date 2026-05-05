import type { MetadataRoute } from 'next';

// ---------------------------------------------------------------------------
// /sitemap.xml — generated automatically by Next.js
// ---------------------------------------------------------------------------
//
// Lists the public-facing routes only. App pages (/feed, /dashboard,
// /profil, /tender/[id], /redaction/[id], /onboarding, /admin/*) are
// auth-gated, so they're excluded — no point asking Google to index a
// login wall.
// ---------------------------------------------------------------------------

// Resolution order:
//   1. Explicit NEXT_PUBLIC_APP_URL — set this in Vercel env once you
//      have a custom domain (e.g. https://radarmarche.be).
//   2. VERCEL_URL — Vercel auto-injects the per-deployment URL on
//      every build (e.g. radar-abc123.vercel.app). Useful for previews.
//   3. The current production fallback for the radar-opal.vercel.app
//      Vercel project.
const BASE =
  process.env.NEXT_PUBLIC_APP_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ??
  'https://radar-opal.vercel.app';

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return [
    { url: `${BASE}/`, lastModified, changeFrequency: 'weekly', priority: 1.0 },
    { url: `${BASE}/pricing`, lastModified, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE}/stats`, lastModified, changeFrequency: 'daily', priority: 0.7 },
    { url: `${BASE}/signup`, lastModified, changeFrequency: 'yearly', priority: 0.6 },
    { url: `${BASE}/login`, lastModified, changeFrequency: 'yearly', priority: 0.4 },
    { url: `${BASE}/cgu`, lastModified, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE}/confidentialite`, lastModified, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE}/mentions-legales`, lastModified, changeFrequency: 'yearly', priority: 0.3 },
  ];
}
