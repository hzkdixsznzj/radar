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

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? 'https://radar-opal.vercel.app';

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
