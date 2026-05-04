// ---------------------------------------------------------------------------
// Unit tests for the tender-scoring library.
// ---------------------------------------------------------------------------
//
// Recalibrated 2026-05-04 for the boost-style scoring:
//   weights: sector 35 / cpv 25 / region 15 / keyword 15 / budget 10
//   sector text now scans profile.keywords (not labels)
//   1 hit ≈ 70% of slot, 2+ adds 10% each, capped at 100%
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
  it('empty profile + empty tender: only the unknown-budget partial credit + region default', () => {
    // No regions in profile = treated as national → 15 pts.
    // Unknown budget → 0.5 * 10 = 5.
    // Total: 20.
    assert.equal(scoreTender(tender(), profile()), 20);
  });

  it('awards near-full sector weight on a single keyword hit', () => {
    const breakdown = scoreTenderBreakdown(
      tender({ title: 'Rénovation HVAC à Mons', cpv_codes: ['45331100'] }),
      profile({ sectors: ['45331'], keywords: ['HVAC'] }),
    );
    // 1 hit on "HVAC" → 0.7 * 35 = 24.5 → 25
    assert.ok(breakdown.sector >= 24, `expected sector ≥24, got ${breakdown.sector}`);
    // 5+ shared CPV digits = full weight 25
    assert.equal(breakdown.cpv, 25);
  });

  it('boosts sector score with multiple keyword hits', () => {
    const oneHit = scoreTenderBreakdown(
      tender({ title: 'HVAC à Mons' }),
      profile({ keywords: ['HVAC', 'chauffage', 'ventilation'] }),
    );
    const threeHits = scoreTenderBreakdown(
      tender({ title: 'HVAC chauffage ventilation à Mons' }),
      profile({ keywords: ['HVAC', 'chauffage', 'ventilation'] }),
    );
    assert.ok(threeHits.sector > oneHit.sector);
    // 3 hits → 0.9 * 35 = 31.5 → 32
    assert.ok(threeHits.sector >= 31, `expected ≥31, got ${threeHits.sector}`);
  });

  it('awards full region weight (15) on a direct NUTS match', () => {
    const breakdown = scoreTenderBreakdown(
      tender({ nuts_codes: ['BE32'] }),
      profile({ regions: ['BE32'] }),
    );
    assert.equal(breakdown.region, 15);
  });

  it('awards partial region weight for a province-level prefix match', () => {
    // BE323 (Mons) ⊂ BE32 (Hainaut) — shared 4 chars → 0.85 * 15 ≈ 13
    const breakdown = scoreTenderBreakdown(
      tender({ nuts_codes: ['BE323'] }),
      profile({ regions: ['BE32'] }),
    );
    assert.ok(
      breakdown.region >= 12 && breakdown.region < 15,
      `expected partial province match, got ${breakdown.region}`,
    );
  });

  it('still gives some credit for country-only NUTS overlap', () => {
    // BE211 (Antwerp) and BE32 (Hainaut) share only "BE" → 0.4 * 15 = 6
    const breakdown = scoreTenderBreakdown(
      tender({ nuts_codes: ['BE211'] }),
      profile({ regions: ['BE32'] }),
    );
    assert.ok(
      breakdown.region >= 5 && breakdown.region <= 7,
      `expected ~6 from country-only overlap, got ${breakdown.region}`,
    );
  });

  it('treats no-regions profile as national (full region weight)', () => {
    const breakdown = scoreTenderBreakdown(
      tender({ nuts_codes: ['BE211'] }),
      profile({ regions: [] }),
    );
    assert.equal(breakdown.region, 15);
  });

  it('CPV: full weight (25) when 5+ digit prefix overlaps', () => {
    const breakdown = scoreTenderBreakdown(
      tender({ cpv_codes: ['45331100'] }),
      profile({ sectors: ['45331'] }),
    );
    assert.equal(breakdown.cpv, 25);
  });

  it('CPV: smaller credit on shorter prefix overlap', () => {
    // 45000000 vs 45331 → shared 2 digits ("45") → 0.3 * 25 ≈ 8
    const breakdown = scoreTenderBreakdown(
      tender({ cpv_codes: ['45000000'] }),
      profile({ sectors: ['45331'] }),
    );
    assert.ok(
      breakdown.cpv >= 7 && breakdown.cpv <= 9,
      `expected division-level CPV credit ~8, got ${breakdown.cpv}`,
    );
  });

  it('gives partial budget credit when value is unknown', () => {
    const breakdown = scoreTenderBreakdown(
      tender({ estimated_value: null }),
      profile({ budget_ranges: ['0-100000'] }),
    );
    // 0.5 * 10 = 5
    assert.equal(breakdown.budget, 5);
  });

  it('awards full budget weight on in-range value', () => {
    const breakdown = scoreTenderBreakdown(
      tender({ estimated_value: 50_000 }),
      profile({ budget_ranges: ['0-100000'] }),
    );
    assert.equal(breakdown.budget, 10);
  });

  it('strong overall match scores ≥85', () => {
    const s = scoreTender(
      tender({
        title: 'Rénovation HVAC à Mons',
        description: 'chauffage et ventilation',
        full_text: 'HVAC chauffage ventilation climatisation',
        nuts_codes: ['BE32'],
        cpv_codes: ['45331100'],
        estimated_value: 50_000,
      }),
      profile({
        sectors: ['45331'],
        regions: ['BE32'],
        keywords: ['HVAC', 'chauffage', 'ventilation', 'climatisation'],
        budget_ranges: ['0-100000'],
      }),
    );
    assert.ok(s >= 85, `expected strong match ≥85, got ${s}`);
    assert.ok(s <= 100);
  });

  it('clamps final score into [0, 100]', () => {
    const s = scoreTender(
      tender({
        title: 'HVAC HVAC HVAC HVAC HVAC',
        description: 'HVAC HVAC',
        full_text: 'HVAC '.repeat(50),
        nuts_codes: ['BE32'],
        cpv_codes: ['45331100'],
        estimated_value: 50_000,
      }),
      profile({
        sectors: ['45331'],
        regions: ['BE32'],
        keywords: ['HVAC'],
        budget_ranges: ['0-100000'],
      }),
    );
    assert.ok(s >= 0 && s <= 100, `expected 0..100, got ${s}`);
  });

  it('low-relevance tender out-of-region, no CPV match scores low', () => {
    // School-supplies tender that happens to mention "chauffage" once,
    // but is in a different region with no CPV overlap.
    const s = scoreTender(
      tender({
        title: 'Fourniture de mobilier scolaire',
        full_text: 'le chauffage est inclus',
        nuts_codes: ['BE211'], // Antwerp
        cpv_codes: ['39160000'], // Furniture
        estimated_value: 200_000,
      }),
      profile({
        sectors: ['45331'],
        regions: ['BE32'],
        keywords: ['HVAC', 'chauffage'],
        budget_ranges: ['0-100000'],
      }),
    );
    // 1 keyword hit boosts a bit, region is country-only, no CPV → modest score
    assert.ok(s < 50, `expected weak match <50, got ${s}`);
  });
});

describe('compareTenders', () => {
  it('sorts higher score first', () => {
    const a = tender({ id: 'a' });
    const b = tender({ id: 'b' });
    assert.ok(compareTenders(a, b, 40, 80) > 0);
    assert.ok(compareTenders(b, a, 80, 40) < 0);
  });

  it('uses publication_date as tiebreaker (newer first)', () => {
    const a = tender({ id: 'a', publication_date: '2026-01-01T00:00:00Z' });
    const b = tender({ id: 'b', publication_date: '2026-06-01T00:00:00Z' });
    assert.ok(compareTenders(a, b, 50, 50) > 0);
  });

  it('returns 0 when both scores and dates are equal', () => {
    const a = tender({ publication_date: '2026-01-01T00:00:00Z' });
    const b = tender({ publication_date: '2026-01-01T00:00:00Z' });
    assert.equal(compareTenders(a, b, 50, 50), 0);
  });
});
