import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { extractBudget } from '../src/lib/scrapers/extract-budget';

describe('extractBudget', () => {
  it('returns null on empty / nullish input', () => {
    assert.equal(extractBudget(null), null);
    assert.equal(extractBudget(''), null);
    assert.equal(extractBudget('Pas de chiffre ici.'), null);
  });

  it('extracts a FR budget with cue keyword', () => {
    const txt =
      "Le marché est estimé à 250 000 EUR HTVA pour la durée totale du contrat.";
    assert.equal(extractBudget(txt), 250_000);
  });

  it('extracts a NL budget with cue keyword', () => {
    const txt = 'De waarde van de opdracht wordt geraamd op € 1.200.000.';
    assert.equal(extractBudget(txt), 1_200_000);
  });

  it('extracts a million-style EN budget', () => {
    const txt =
      'The estimated value of the contract is approximately EUR 4.5 million.';
    const v = extractBudget(txt);
    assert.equal(v, 4_500_000);
  });

  it('extracts a "k" suffix budget', () => {
    const txt = 'Budget annuel estimé : 850k EUR.';
    assert.equal(extractBudget(txt), 850_000);
  });

  it('rejects surface measurements that look like money', () => {
    const txt = 'Surface totale: 12 000 m² à rénover. Pas de prix.';
    assert.equal(extractBudget(txt), null);
  });

  it('prefers the high-confidence candidate over a stray number', () => {
    const txt =
      'La parcelle fait 1 200 m². Budget estimé : 450 000 EUR HTVA.';
    assert.equal(extractBudget(txt), 450_000);
  });

  it('ignores out-of-band amounts', () => {
    // 50 EUR is plausible (ticket, not a tender) → below 1000 threshold.
    assert.equal(extractBudget('Frais de candidature 50 EUR.'), null);
  });

  it('handles € symbol after the number', () => {
    const txt = 'Le montant total ne peut excéder 75 000 €.';
    assert.equal(extractBudget(txt), 75_000);
  });
});
