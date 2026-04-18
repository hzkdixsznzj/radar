// ---------------------------------------------------------------------------
// tests/kbo.test.ts — pure-function tests for KBO lookup helpers
// ---------------------------------------------------------------------------
//
// We don't exercise the live KBO HTML scraper here — that would mean
// network calls on CI. Instead we pin down the deterministic bits:
// VAT normalisation, and NACE → internal-sector mapping.
// ---------------------------------------------------------------------------

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeVat, suggestSectorsFromNace } from '../src/lib/kbo/lookup';

describe('normalizeVat', () => {
  it('strips formatting from a canonical BE VAT', () => {
    assert.equal(normalizeVat('BE 0123.456.789'), '0123456789');
    assert.equal(normalizeVat('BE0123.456.789'), '0123456789');
    assert.equal(normalizeVat('0123456789'), '0123456789');
  });

  it('pads 9-digit legacy numbers to 10 with a leading zero', () => {
    assert.equal(normalizeVat('123456789'), '0123456789');
  });

  it('rejects input that cannot resolve to exactly 10 digits', () => {
    assert.equal(normalizeVat(''), null);
    assert.equal(normalizeVat('abc'), null);
    assert.equal(normalizeVat('12345'), null);
    assert.equal(normalizeVat('12345678901'), null);
  });
});

describe('suggestSectorsFromNace', () => {
  it('maps construction NACE codes to construction sectors', () => {
    const out = suggestSectorsFromNace(['41.201', '43.21']);
    assert.ok(out.includes('gros-oeuvre'));
    assert.ok(out.includes('electricite'));
  });

  it('maps IT NACE codes to IT sectors', () => {
    const out = suggestSectorsFromNace(['62.01', '62.02']);
    assert.ok(out.includes('dev-logiciel'));
    assert.ok(out.includes('infra-cloud'));
  });

  it('deduplicates sectors when multiple codes fall in the same prefix', () => {
    // Two codes that both resolve to the same sector
    const out = suggestSectorsFromNace(['41.101', '41.202']);
    const grosOeuvreCount = out.filter((s) => s === 'gros-oeuvre').length;
    assert.equal(grosOeuvreCount, 1);
  });

  it('returns an empty array when no codes match', () => {
    assert.deepEqual(suggestSectorsFromNace(['99.99']), []);
    assert.deepEqual(suggestSectorsFromNace([]), []);
  });

  it('prefers the most specific prefix match', () => {
    // 43.2 → electricite; generic 43 → gros-oeuvre. The code "43.21"
    // starts with "43.2" first (more specific), so it should map to
    // electricite rather than falling through to gros-oeuvre.
    const out = suggestSectorsFromNace(['43.21']);
    assert.equal(out[0], 'electricite');
  });
});
