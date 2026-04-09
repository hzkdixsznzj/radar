import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Radar — Marchés publics pour PME construction",
  description:
    "L'IA analyse les marchés publics belges et vous envoie uniquement ceux qui correspondent à votre entreprise.",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#0F1114",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
