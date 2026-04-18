// ---------------------------------------------------------------------------
// BelgiumMap — province-level density map
// ---------------------------------------------------------------------------
//
// Schematic rather than geographic: we arrange Belgium's 11 provinces in a
// 4×4 CSS grid that *roughly* mirrors the country's layout (Flanders north,
// Brussels centre, Wallonia south). Each tile is a link to the feed pre-
// filtered on that province, with background intensity proportional to the
// open-tender count. A full geographic SVG would look sharper, but needs
// hand-crafted paths we can't pull down here — and the schematic doubles
// nicely as a province picker on small screens.
//
// Usage:
//   const counts = await getOpenTenderCountsByRegion();
//   <BelgiumMap counts={counts} />
// ---------------------------------------------------------------------------

'use client';

import Link from 'next/link';
import clsx from 'clsx';
import type { BERegion } from '@/lib/geo/be-regions';

export interface BelgiumMapProps {
  /** Map friendly province name → count of open tenders in that region. */
  counts: Record<string, number>;
}

type TilePlacement = {
  name: BERegion;
  short: string;
  col: number;
  row: number;
  colSpan?: number;
  rowSpan?: number;
};

// Geographic approximation in a 4×4 grid. Hainaut spans two rows to reflect
// its SW elongation; Luxembourg spans two cols to reflect its SE depth.
const LAYOUT: TilePlacement[] = [
  { name: 'Flandre occidentale', short: 'Fl. occ.', col: 1, row: 1 },
  { name: 'Flandre orientale', short: 'Fl. or.', col: 2, row: 1 },
  { name: 'Anvers', short: 'Anvers', col: 3, row: 1 },
  { name: 'Limbourg', short: 'Limbourg', col: 4, row: 1 },
  { name: 'Brabant flamand', short: 'Br. fl.', col: 3, row: 2 },
  { name: 'Bruxelles-Capitale', short: 'Bxl', col: 2, row: 2 },
  { name: 'Hainaut', short: 'Hainaut', col: 1, row: 3, rowSpan: 2 },
  { name: 'Brabant wallon', short: 'Br. wal.', col: 2, row: 3 },
  { name: 'Liège', short: 'Liège', col: 4, row: 3 },
  { name: 'Namur', short: 'Namur', col: 2, row: 4 },
  { name: 'Luxembourg', short: 'Luxembourg', col: 3, row: 4, colSpan: 2 },
];

/**
 * Map count → intensity bucket (0..4). We use 5 discrete steps rather than
 * linear interpolation because a handful of outlier provinces would
 * otherwise flatten everything else to near-black.
 */
function intensity(count: number, max: number): 0 | 1 | 2 | 3 | 4 {
  if (max === 0 || count === 0) return 0;
  const ratio = count / max;
  if (ratio > 0.8) return 4;
  if (ratio > 0.55) return 3;
  if (ratio > 0.3) return 2;
  if (ratio > 0.1) return 1;
  return 0;
}

const INTENSITY_CLASSES: Record<0 | 1 | 2 | 3 | 4, string> = {
  0: 'bg-bg-card text-text-muted hover:bg-bg-card-hover',
  1: 'bg-accent-blue/10 text-accent-blue hover:bg-accent-blue/20',
  2: 'bg-accent-blue/25 text-accent-blue hover:bg-accent-blue/40',
  3: 'bg-accent-blue/50 text-white hover:bg-accent-blue/70',
  4: 'bg-accent-blue text-white hover:bg-accent-blue/90',
};

export function BelgiumMap({ counts }: BelgiumMapProps) {
  const max = Math.max(0, ...Object.values(counts));
  const total = Object.values(counts).reduce((sum, n) => sum + n, 0);

  return (
    <div className="space-y-3">
      <div
        className="grid aspect-[5/4] w-full gap-1.5"
        style={{
          gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
          gridTemplateRows: 'repeat(4, minmax(0, 1fr))',
        }}
        role="group"
        aria-label="Carte des provinces de Belgique"
      >
        {LAYOUT.map(({ name, short, col, row, colSpan, rowSpan }) => {
          const n = counts[name] ?? 0;
          const level = intensity(n, max);
          return (
            <Link
              key={name}
              href={`/feed?region=${encodeURIComponent(name)}`}
              aria-label={`${name} — ${n} marché${n > 1 ? 's' : ''} ouvert${
                n > 1 ? 's' : ''
              }`}
              className={clsx(
                'flex flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1.5 text-center transition-colors',
                INTENSITY_CLASSES[level],
              )}
              style={{
                gridColumn: `${col} / span ${colSpan ?? 1}`,
                gridRow: `${row} / span ${rowSpan ?? 1}`,
              }}
            >
              <span className="truncate text-[10px] font-medium sm:text-xs">
                {short}
              </span>
              <span className="font-display text-sm font-bold tabular-nums sm:text-base">
                {n}
              </span>
            </Link>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between text-xs text-text-muted">
        <span>{total} marchés ouverts</span>
        <div className="flex items-center gap-1.5">
          <span>Moins</span>
          <div className="flex gap-0.5">
            {([0, 1, 2, 3, 4] as const).map((lvl) => (
              <span
                key={lvl}
                aria-hidden="true"
                className={clsx(
                  'size-2.5 rounded-sm',
                  INTENSITY_CLASSES[lvl].split(' ')[0],
                )}
              />
            ))}
          </div>
          <span>Plus</span>
        </div>
      </div>
    </div>
  );
}
