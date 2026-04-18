// ---------------------------------------------------------------------------
// Unit tests for the sector-vocabulary helpers.
// ---------------------------------------------------------------------------

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  SECTORS,
  SECTORS_BY_ID,
  sectorsByGroup,
  expandSelection,
} from '../src/lib/sectors/vocabulary';

describe('sector vocabulary', () => {
  it('every sector has a unique id', () => {
    const ids = SECTORS.map((s) => s.id);
    assert.equal(new Set(ids).size, ids.length);
  });

  it('every sector has at least one CPV prefix and one keyword', () => {
    for (const s of SECTORS) {
      assert.ok(s.cpvPrefixes.length > 0, `${s.id} has no CPV prefixes`);
      assert.ok(s.keywords.length > 0, `${s.id} has no keywords`);
    }
  });

  it('SECTORS_BY_ID is populated for every sector', () => {
    for (const s of SECTORS) {
      assert.equal(SECTORS_BY_ID[s.id], s);
    }
  });

  describe('sectorsByGroup', () => {
    it('groups without losing any sector', () => {
      const grouped = sectorsByGroup();
      const total = Object.values(grouped).reduce(
        (n, list) => n + list.length,
        0,
      );
      assert.equal(total, SECTORS.length);
    });

    it('preserves the natural group order (no empty groups)', () => {
      for (const [group, list] of Object.entries(sectorsByGroup())) {
        assert.ok(list.length > 0, `Empty group ${group}`);
      }
    });
  });

  describe('expandSelection', () => {
    it('returns empty arrays when no ids given', () => {
      const r = expandSelection([]);
      assert.deepEqual(r.sectors, []);
      assert.deepEqual(r.keywords, []);
    });

    it('includes the human label AND numeric CPV tokens in `sectors`', () => {
      const r = expandSelection(['hvac']);
      // Label
      assert.ok(r.sectors.some((s) => s.includes('HVAC')));
      // At least one CPV token (all digits, 5 chars)
      assert.ok(
        r.sectors.some((s) => /^\d{5}$/.test(s)),
        'Expected a 5-digit CPV token in expanded sectors',
      );
    });

    it('deduplicates keywords across multiple selections', () => {
      // Same keyword might exist in two related sectors; verify no dupes.
      const r = expandSelection(['hvac', 'plomberie']);
      assert.equal(
        r.keywords.length,
        new Set(r.keywords).size,
        'Keywords contain duplicates',
      );
    });

    it('silently drops unknown ids', () => {
      const r = expandSelection(['hvac', 'not-a-real-sector']);
      // Should be exactly equal to just "hvac"
      const solo = expandSelection(['hvac']);
      assert.deepEqual(r, solo);
    });
  });
});
