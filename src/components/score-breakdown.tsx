'use client';

// ---------------------------------------------------------------------------
// ScoreBreakdown — explainability for the relevance score
// ---------------------------------------------------------------------------
//
// Users complain about feed ranking they don't understand ("score 73 mais
// c'est pas vraiment HVAC?"). The breakdown shows exactly where the points
// came from — sector, CPV, region, keyword, budget. Builds trust.
// ---------------------------------------------------------------------------

import { useState } from 'react';
import { Info } from 'lucide-react';
import clsx from 'clsx';

export interface ScoreBreakdownProps {
  total: number;
  sector: number;
  cpv: number;
  region: number;
  keyword: number;
  budget: number;
}

const SLOTS: Array<{
  key: keyof Omit<ScoreBreakdownProps, 'total'>;
  label: string;
  max: number;
  hint: string;
}> = [
  {
    key: 'sector',
    label: 'Secteur',
    max: 35,
    hint: 'Concordance entre votre secteur et le contenu du marché',
  },
  {
    key: 'cpv',
    label: 'Code CPV',
    max: 25,
    hint: 'Codes du marché qui correspondent à vos secteurs (préfixe partagé)',
  },
  {
    key: 'region',
    label: 'Région',
    max: 15,
    hint: 'Zone géographique vs régions ciblées dans votre profil',
  },
  {
    key: 'keyword',
    label: 'Mots-clés',
    max: 15,
    hint: 'Présence de vos mots-clés dans la description du marché',
  },
  {
    key: 'budget',
    label: 'Budget',
    max: 10,
    hint: 'Adéquation entre la valeur estimée et vos fourchettes',
  },
];

export function ScoreBreakdown(props: ScoreBreakdownProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 text-xs text-text-muted hover:text-text-primary transition-colors"
        aria-expanded={open}
        aria-label="Détails du score"
      >
        <Info className="size-3.5" />
        <span>Pourquoi ce score ?</span>
      </button>

      {open && (
        <>
          {/* Backdrop to close on outside click */}
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-0 top-full z-20 mt-2 w-72 rounded-xl border border-border bg-bg-card p-4 shadow-lg">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-muted">
              Score {props.total} / 100
            </p>
            <div className="space-y-2">
              {SLOTS.map((s) => {
                const value = props[s.key];
                const ratio = Math.max(0, Math.min(value / s.max, 1));
                return (
                  <div key={s.key} className="space-y-1">
                    <div className="flex items-baseline justify-between text-xs">
                      <span className="font-medium text-text-primary">
                        {s.label}
                      </span>
                      <span className="text-text-muted">
                        {value} / {s.max}
                      </span>
                    </div>
                    <div className="h-1 overflow-hidden rounded-full bg-bg-input">
                      <div
                        className={clsx(
                          'h-full transition-all',
                          ratio > 0.7
                            ? 'bg-accent-green'
                            : ratio > 0.4
                              ? 'bg-accent-orange'
                              : 'bg-accent-red',
                        )}
                        style={{ width: `${ratio * 100}%` }}
                      />
                    </div>
                    <p className="text-[10px] leading-tight text-text-muted">
                      {s.hint}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
