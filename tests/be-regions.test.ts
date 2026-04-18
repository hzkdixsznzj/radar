// ---------------------------------------------------------------------------
// Unit tests for the Belgian NUTS mapping helpers.
// ---------------------------------------------------------------------------
//
// Run via `pnpm test` (which wraps `node --test --import tsx tests/**/*.test.ts`).
// Using node:test keeps us dep-free — no jest, no vitest.
// ---------------------------------------------------------------------------

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  BE_REGIONS,
  BE_REGION_TO_NUTS,
  NUTS_TO_BE_REGION,
  friendlyRegionsToNuts,
  nutsToFriendly,
} from '../src/lib/geo/be-regions';

describe('be-regions', () => {
  it('BE_REGIONS covers all 11 Belgian provinces + Bruxelles', () => {
    assert.equal(BE_REGIONS.length, 11);
  });

  it('BE_REGION_TO_NUTS maps every region to a non-empty prefix', () => {
    for (const r of BE_REGIONS) {
      assert.ok(
        BE_REGION_TO_NUTS[r] && BE_REGION_TO_NUTS[r].startsWith('BE'),
        `Missing or invalid NUTS for ${r}`,
      );
    }
  });

  it('NUTS_TO_BE_REGION is a perfect inverse', () => {
    for (const r of BE_REGIONS) {
      const nuts = BE_REGION_TO_NUTS[r];
      assert.equal(NUTS_TO_BE_REGION[nuts], r);
    }
  });

  describe('friendlyRegionsToNuts', () => {
    it('translates known names', () => {
      assert.deepEqual(friendlyRegionsToNuts(['Hainaut', 'Liège']), [
        'BE32',
        'BE33',
      ]);
    });

    it('drops unknown names silently', () => {
      assert.deepEqual(friendlyRegionsToNuts(['Hainaut', 'Atlantis']), ['BE32']);
    });

    it('returns [] on empty input', () => {
      assert.deepEqual(friendlyRegionsToNuts([]), []);
    });

    it('is deterministic — preserves input order', () => {
      assert.deepEqual(
        friendlyRegionsToNuts(['Namur', 'Anvers', 'Hainaut']),
        ['BE35', 'BE21', 'BE32'],
      );
    });
  });

  describe('nutsToFriendly', () => {
    it('resolves a full sub-code to its province', () => {
      assert.equal(nutsToFriendly('BE323'), 'Hainaut');
      assert.equal(nutsToFriendly('BE100'), 'Bruxelles-Capitale');
    });

    it('resolves the exact NUTS-2 code', () => {
      assert.equal(nutsToFriendly('BE32'), 'Hainaut');
    });

    it('handles lowercase input', () => {
      assert.equal(nutsToFriendly('be323'), 'Hainaut');
    });

    it('returns the raw code when unknown', () => {
      assert.equal(nutsToFriendly('FR123'), 'FR123');
    });

    it('returns empty string for empty input', () => {
      assert.equal(nutsToFriendly(''), '');
    });
  });
});
