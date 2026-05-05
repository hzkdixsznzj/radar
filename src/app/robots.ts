import type { MetadataRoute } from 'next';

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? 'https://radar-opal.vercel.app';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Block private app surfaces from indexing — they require auth
        // anyway, but explicit rules avoid bot-load noise in our logs.
        disallow: [
          '/admin/',
          '/api/',
          '/auth/',
          '/feed',
          '/dashboard',
          '/profil',
          '/onboarding',
          '/tender/',
          '/redaction/',
          '/analyse/',
        ],
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
  };
}
