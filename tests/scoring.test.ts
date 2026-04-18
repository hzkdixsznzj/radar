// ---------------------------------------------------------------------------
// Unit tests for the tender-scoring library.
// ---------------------------------------------------------------------------
//
// Covers the weighted score formula, NUTS overlap, CPV overlap, budget
// fit, and the keyword-leak guard. Keeps tests flat — one assertion per
// concept so a regression points at exactly what broke.
// ---------------------------------------------------------------------------

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  scoreTender,
  scoreTenderBreakdown,
  compareTenders,
} from '../src/lib/scrapers/scoring';
import type { Tender, Profile } from '../src/types/database';

function tender(partial: Partial<Tender> = {}): Tender {
  return {
    id: 't1',
    source: 'be_bulletin',
    external_id: 'e1',
    title: 'Tender title',
    description: 'Description',
    contracting_authority: 'City of Mons',
    tender_type: 'works',
    cpv_codes: [],
    nuts_codes: [],
    region: '',
    publication_date: '2026-04-01T00:00:00Z',
    deadline: '2026-05-01T00:00:00Z',
    estimated_value: null,
    currency: 'EUR',
    status: 'open',
    full_text: '',
    documents_url: null,
    created_at: '2026-04-01T00:00:00Z',
    updated_at: '2026-04-01T00:00:00Z',
    ...partial,
  };
}

function profile(partial: Partial<Profile> = {}): Profile {
  return {
    id: 'p1',
    user_id: 'u1',
    company_name: 'Acme',
    sectors: [],
    certifications: [],
    regions: [],
    budget_ranges: [],
    keywords: [],
    company_description: '',
    onboarding_completed: true,
    created_at: '2026-04-01T00:00:00Z',
    updated_at: '2026-04-01T00:00:00Z',
    ...partial,
  };
}

describe('scoreTender', () => {
  it('empty profile + empty tender returns only the unknown-budget partial credit', () => {
    // unknown budget → 0.5 * 15 = 7.5 → rounded 8. Nothing else contributes.
    assert.equal(scoreTender(tender(), profile()), 8);
  });

  it('awards full sector weight (30) on a direct keyword hit in title', () => {
    const s = scoreTender(
      tender({ title: 'Rénovation HVAC à Mons', cpv_codes: ['45331100'] }),
      profile({ sectors: ['HVAC'] }),
    );
    // Sector (30) + CPV (small — shared digit "4" is 1/8 ≈ 2.5, rounded) ≈ 30+
    assert.ok(s >= 30, `Expected >=30 with HVAC sector hit, got ${s}`);
  });

  it('awards region weight for a direct NUTS match', () => {
    const breakdown = scoreTenderBreakdown(
      tender({ nuts_codes: ['BE32'] }),
      profile({ regions: ['BE32'] }),
    );
    assert.equal(breakdown.region, 20);
  });

  it('awards partial region weight for a NUTS prefix overlap', () => {
    const breakdown = scoreTenderBreakdown(
      tender({ nuts_codes: ['BE323'] }),
      profile({ regions: ['BE32'] }),
    );
    // Prefix overlap 4/5 of 20 pts = 16
    assert.ok(
      breakdown.region > 0 && breakdown.region < 20,
      `Expected partial region score, got ${breakdown.region}`,
    );
  });

  it('caps keyword contribution when sector AND cpv both miss', () => {
    const breakdown = scoreTenderBreakdown(
      tender({
        title: 'Grand chantier école primaire',
        full_text: 'école école école école',
        cpv_codes: ['79000000'], // Services — won't match construction
      }),
      profile({
        // 4 keywords all present → ratio 1.0 → 15 pts normally, but guard caps at 7.5
        keywords: ['école', 'école', 'école', 'école'],
      }),
    );
    assert.equal(
      breakdown.sector,
      0,
      'Precondition: sector score must be 0',
    );
    assert.equal(breakdown.cpv, 0, 'Precondition: cpv score must be 0');
    // Guard cap = WEIGHT_KEYWORD (15) * 0.5 = 7.5 → rounded 8 max
    assert.ok(
      breakdown.keyword <= 8,
      `Expected keyword ≤8 under guard, got ${breakdown.keyword}`,
    );
  });

  it('does not cap keyword contribution when sector also hits', () => {
    const breakdown = scoreTenderBreakdown(
      tender({
        title: 'HVAC à Mons',
        full_text: 'école', // keyword hit
      }),
      profile({
        sectors: ['HVAC'],
        keywords: ['école'],
      }),
    );
    // Full keyword weight 15 applies since sector hit
    assert.equal(breakdown.keyword, 15);
  });

  it('gives partial budget credit when value is unknown', () => {
    const breakdown = scoreTenderBreakdown(
      tender({ estimated_value: null }),
      profile({ budget_ranges: ['0-100000'] }),
    );
    // unknown ⇒ 0.5 * 15 = 7.5 → rounded 8
    assert.ok(breakdown.budget >= 7 && breakdown.budget <= 8);
  });

  it('awards full budget weight on in-range value', () => {
    const breakdown = scoreTenderBreakdown(
      tender({ estimated_value: 50_000 }),
      profile({ budget_ranges: ['0-100000'] }),
    );
    assert.equal(breakdown.budget, 15);
  });

  it('clamps final score into [0, 100]', () => {
    const s = scoreTender(
      tender({
        title: 'HVAC — Mons — Hainaut HVAC',
        description: 'HVAC',
        full_text: 'HVAC HVAC HVAC',
        nuts_codes: ['BE32'],
        cpv_codes: ['45331100'],
        estimated_value: 50_000,
      }),
      profile({
        sectors: ['HVAC', '45331'],
        regions: ['BE32'],
        keywords: ['HVAC'],
        budget_ranges: ['0-100000'],
      }),
    );
    assert.ok(s >= 0 && s <= 100, `Expected 0..100, got ${s}`);
    assert.ok(s >= 75, `Expected strong match ≥75, got ${s}`);
  });
});

describe('compareTenders', () => {
  it('sorts higher score first', () => {
    const a = tender({ id: 'a' });
    const b = tender({ id: 'b' });
    // scoreB > scoreA should return positive (a after b)
    assert.ok(compareTenders(a, b, 40, 80) > 0);
    assert.ok(compareTenders(b, a, 80, 40) < 0);
  });

  it('uses publication_date as tiebreaker (newer first)', () => {
    const a = tender({ id: 'a', publication_date: '2026-01-01T00:00:00Z' });
    const b = tender({ id: 'b', publication_date: '2026-06-01T00:00:00Z' });
    // equal scores → newer (b) first
    assert.ok(compareTenders(a, b, 50, 50) > 0);
  });

  it('returns 0 when both scores and dates are equal', () => {
    const a = tender({ publication_date: '2026-01-01T00:00:00Z' });
    const b = tender({ publication_date: '2026-01-01T00:00:00Z' });
    assert.equal(compareTenders(a, b, 50, 50), 0);
  });
});
