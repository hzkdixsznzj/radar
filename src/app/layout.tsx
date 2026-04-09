import type { Metadata, Viewport } from 'next';
import { Outfit, DM_Sans } from 'next/font/google';
import { PWAProvider } from '@/components/pwa/pwa-provider';
import './globals.css';

const outfit = Outfit({
  variable: '--font-display',
  subsets: ['latin'],
  display: 'swap',
});

const dmSans = DM_Sans({
  variable: '--font-body',
  subsets: ['latin'],
  display: 'swap',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0f1117',
};

export const metadata: Metadata = {
  title: {
    default: 'Radar — Veille Marchés Publics Belgique',
    template: '%s | Radar',
  },
  description:
    'Trouvez les marchés publics pertinents pour votre PME en Belgique. Analyse IA, aide à la soumission. Trouvez le marché le matin, soumettez le soir.',
  keywords: [
    'marchés publics',
    'Belgique',
    'appels d\'offres',
    'PME',
    'soumission',
    'veille',
    'marchés publics Wallonie',
    'marchés publics Bruxelles',
    'marchés publics Flandre',
  ],
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Radar',
  },
  openGraph: {
    type: 'website',
    locale: 'fr_BE',
    siteName: 'Radar',
    title: 'Radar — Veille Marchés Publics Belgique',
    description: 'Trouvez le marché le matin, soumettez le soir.',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${outfit.variable} ${dmSans.variable}`}>
      <body className="min-h-dvh flex flex-col antialiased">
        <PWAProvider>{children}</PWAProvider>
      </body>
    </html>
  );
}
