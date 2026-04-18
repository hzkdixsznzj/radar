/**
 * Demo mode helpers.
 *
 * Radar auth is magic-link only, which makes previews and screenshots painful.
 * When `NEXT_PUBLIC_DEMO_MODE=true`, pages can import the constants below to
 * render something meaningful even without a logged-in user or a populated DB.
 *
 * In production (`NEXT_PUBLIC_DEMO_MODE` unset or "false"), `isDemoMode()`
 * returns `false` and the data exports below are NEVER read by any page —
 * this file is effectively dead code on prod. The constants live here purely
 * so the demo path is a single import away.
 */

import type { Profile, Tender } from '@/types/database';

// ---------------------------------------------------------------------------
// Toggle
// ---------------------------------------------------------------------------

/** True when the app should serve demo data instead of real DB + auth. */
export function isDemoMode(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
}

// ---------------------------------------------------------------------------
// Fixed fake user — used by /api/demo to create a bootstrap auth.users row,
// and by pages in demo mode as a stand-in for the logged-in user.
// ---------------------------------------------------------------------------

export const DEMO_USER = {
  /** Stable UUID — chosen once so demo sessions are reproducible across reloads. */
  id: '00000000-0000-4000-8000-00000000d3e0',
  email: 'demo@radar.be',
} as const;

// ---------------------------------------------------------------------------
// Pre-baked profile — matches a fictional Walloon construction SME, so the
// demo tenders below score well against it.
// ---------------------------------------------------------------------------

const NOW_ISO = '2026-04-01T09:00:00.000Z';

export const DEMO_PROFILE: Profile = {
  id: '00000000-0000-4000-8000-00000000d3e1',
  user_id: DEMO_USER.id,
  company_name: 'BatiWal Démo SPRL',
  sectors: ['construction', '45000000'],
  certifications: ['VCA', 'ISO 9001'],
  regions: ['BE3'],
  budget_ranges: ['100000-800000'],
  keywords: ['rénovation', 'école', 'toiture', 'travaux'],
  company_description:
    'PME construction wallonne (démo) — rénovation scolaire, petits chantiers communaux.',
  onboarding_completed: true,
  created_at: NOW_ISO,
  updated_at: NOW_ISO,
};

// ---------------------------------------------------------------------------
// Pre-populated tenders — enough variety for cards, detail, and matching UI
// to look realistic without hitting the DB. All values are fictional.
// ---------------------------------------------------------------------------

export const DEMO_TENDERS: Tender[] = [
  {
    id: '00000000-0000-4000-8000-00000000t001',
    source: 'ted',
    external_id: 'DEMO-2026-001',
    title: 'Rénovation de la toiture de l\'école communale de Namur-Jambes',
    description:
      'Travaux de rénovation complète de la toiture (env. 1 800 m²), isolation thermique et remplacement des chéneaux. Chantier phasé sur l\'été 2026.',
    contracting_authority: 'Ville de Namur',
    tender_type: 'works',
    cpv_codes: ['45261000', '45260000', '45000000'],
    nuts_codes: ['BE352'],
    region: 'BE3',
    publication_date: '2026-04-08T08:00:00.000Z',
    deadline: '2026-05-20T16:00:00.000Z',
    estimated_value: 420000,
    currency: 'EUR',
    status: 'open',
    full_text:
      'Marché public de travaux — rénovation toiture école communale, isolation, zinguerie. Lots séparés envisageables.',
    documents_url: 'https://example.invalid/demo/tender-001',
    created_at: NOW_ISO,
    updated_at: NOW_ISO,
  },
  {
    id: '00000000-0000-4000-8000-00000000t002',
    source: 'be_bulletin',
    external_id: 'DEMO-2026-002',
    title: 'Travaux de rénovation énergétique — athénée royal de Liège',
    description:
      'Remplacement des châssis, isolation de façade et mise en conformité PEB pour un bâtiment scolaire classé.',
    contracting_authority: 'Fédération Wallonie-Bruxelles',
    tender_type: 'works',
    cpv_codes: ['45421000', '45320000', '45000000'],
    nuts_codes: ['BE332'],
    region: 'BE3',
    publication_date: '2026-04-02T08:00:00.000Z',
    deadline: '2026-05-12T12:00:00.000Z',
    estimated_value: 680000,
    currency: 'EUR',
    status: 'open',
    full_text:
      'Marché de travaux, procédure ouverte. Rénovation énergétique d\'un athénée, critères PEB stricts.',
    documents_url: 'https://example.invalid/demo/tender-002',
    created_at: NOW_ISO,
    updated_at: NOW_ISO,
  },
  {
    id: '00000000-0000-4000-8000-00000000t003',
    source: 'ted',
    external_id: 'DEMO-2026-003',
    title: 'Petits travaux d\'entretien bâtiments communaux — accord-cadre 2026',
    description:
      'Accord-cadre multi-attributaires pour petits travaux d\'entretien (maçonnerie, couverture, menuiserie) sur bâtiments communaux de Charleroi.',
    contracting_authority: 'Ville de Charleroi',
    tender_type: 'works',
    cpv_codes: ['45000000', '45453000'],
    nuts_codes: ['BE322'],
    region: 'BE3',
    publication_date: '2026-03-25T08:00:00.000Z',
    deadline: '2026-05-05T16:00:00.000Z',
    estimated_value: 250000,
    currency: 'EUR',
    status: 'open',
    full_text:
      'Accord-cadre d\'une durée de 4 ans. Bons de commande ponctuels. PME wallonnes bienvenues.',
    documents_url: 'https://example.invalid/demo/tender-003',
    created_at: NOW_ISO,
    updated_at: NOW_ISO,
  },
  {
    id: '00000000-0000-4000-8000-00000000t004',
    source: 'ted',
    external_id: 'DEMO-2026-004',
    title: 'Fourniture de matériaux isolants pour écoles communales',
    description:
      'Marché de fournitures pour la livraison de panneaux isolants (laine de roche, PIR) pour un programme de rénovation scolaire pluriannuel.',
    contracting_authority: 'IPFH — Intercommunale du Hainaut',
    tender_type: 'supplies',
    cpv_codes: ['44111500', '44170000'],
    nuts_codes: ['BE32'],
    region: 'BE3',
    publication_date: '2026-04-10T08:00:00.000Z',
    deadline: '2026-05-30T12:00:00.000Z',
    estimated_value: 180000,
    currency: 'EUR',
    status: 'open',
    full_text:
      'Marché de fournitures, bordereau de prix unitaires. Livraisons échelonnées sur 12 mois.',
    documents_url: 'https://example.invalid/demo/tender-004',
    created_at: NOW_ISO,
    updated_at: NOW_ISO,
  },
];
