'use client';

import { useState, useRef } from 'react';
import { ChevronDown, RotateCcw } from 'lucide-react';
import clsx from 'clsx';
import type { TenderType } from '@/types/database';

const TENDER_TYPES: { value: TenderType | 'all'; label: string }[] = [
  { value: 'all', label: 'Tous' },
  { value: 'works', label: 'Travaux' },
  { value: 'services', label: 'Services' },
  { value: 'supplies', label: 'Fournitures' },
];

const REGIONS = [
  'Toutes',
  'Bruxelles-Capitale',
  'Brabant wallon',
  'Brabant flamand',
  'Hainaut',
  'Liège',
  'Luxembourg',
  'Namur',
  'Anvers',
  'Flandre occidentale',
  'Flandre orientale',
  'Limbourg',
];

const BUDGET_RANGES = [
  { value: 'all', label: 'Tout budget' },
  { value: '0-50000', label: '< 50K' },
  { value: '50000-200000', label: '50K - 200K' },
  { value: '200000-500000', label: '200K - 500K' },
  { value: '500000+', label: '> 500K' },
];

const DEADLINE_OPTIONS = [
  { value: 'all', label: 'Tous' },
  { value: 'week', label: 'Cette semaine' },
  { value: 'month', label: 'Ce mois' },
];

export interface FeedFiltersState {
  type: TenderType | 'all';
  region: string;
  budget: string;
  deadline: string;
}

export interface FeedFiltersProps {
  filters: FeedFiltersState;
  onChange: (filters: FeedFiltersState) => void;
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      type="button"
      className={clsx(
        'shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors',
        active
          ? 'bg-accent-blue text-white'
          : 'bg-bg-card text-text-secondary hover:bg-bg-card-hover',
      )}
    >
      {children}
    </button>
  );
}

function DropdownFilter({
  label,
  value,
  options,
  active,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  active: boolean;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        type="button"
        className={clsx(
          'flex items-center gap-1 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors',
          active
            ? 'bg-accent-blue text-white'
            : 'bg-bg-card text-text-secondary hover:bg-bg-card-hover',
        )}
      >
        {label}
        <ChevronDown className="size-3.5" />
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          {/* Dropdown menu */}
          <div className="absolute left-0 top-full z-50 mt-1 min-w-[160px] rounded-xl border border-border bg-bg-card p-1 shadow-xl shadow-black/30">
            {options.map((opt) => (
              <button
                key={opt.value}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                type="button"
                className={clsx(
                  'block w-full rounded-lg px-3 py-2 text-left text-sm transition-colors',
                  value === opt.value
                    ? 'bg-accent-blue-soft text-accent-blue'
                    : 'text-text-secondary hover:bg-bg-card-hover hover:text-text-primary',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function FeedFilters({ filters, onChange }: FeedFiltersProps) {
  const hasActiveFilters =
    filters.type !== 'all' ||
    filters.region !== 'Toutes' ||
    filters.budget !== 'all' ||
    filters.deadline !== 'all';

  function resetFilters() {
    onChange({
      type: 'all',
      region: 'Toutes',
      budget: 'all',
      deadline: 'all',
    });
  }

  const regionOptions = REGIONS.map((r) => ({ value: r, label: r }));

  return (
    <div className="w-full overflow-x-auto px-4 py-3 scrollbar-none">
      <div className="flex items-center gap-2">
        {/* Tender type chips */}
        {TENDER_TYPES.map((t) => (
          <FilterChip
            key={t.value}
            active={filters.type === t.value}
            onClick={() => onChange({ ...filters, type: t.value })}
          >
            {t.label}
          </FilterChip>
        ))}

        {/* Region dropdown */}
        <DropdownFilter
          label={filters.region === 'Toutes' ? 'Région' : filters.region}
          value={filters.region}
          options={regionOptions}
          active={filters.region !== 'Toutes'}
          onChange={(region) => onChange({ ...filters, region })}
        />

        {/* Budget dropdown */}
        <DropdownFilter
          label={
            filters.budget === 'all'
              ? 'Budget'
              : BUDGET_RANGES.find((b) => b.value === filters.budget)?.label ??
                'Budget'
          }
          value={filters.budget}
          options={BUDGET_RANGES}
          active={filters.budget !== 'all'}
          onChange={(budget) => onChange({ ...filters, budget })}
        />

        {/* Deadline dropdown */}
        <DropdownFilter
          label={
            filters.deadline === 'all'
              ? 'Délai'
              : DEADLINE_OPTIONS.find((d) => d.value === filters.deadline)
                  ?.label ?? 'Délai'
          }
          value={filters.deadline}
          options={DEADLINE_OPTIONS}
          active={filters.deadline !== 'all'}
          onChange={(deadline) => onChange({ ...filters, deadline })}
        />

        {/* Reset button */}
        {hasActiveFilters && (
          <button
            onClick={resetFilters}
            type="button"
            className="flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-accent-red transition-colors hover:bg-accent-red-soft"
          >
            <RotateCcw className="size-3.5" />
            Réinitialiser
          </button>
        )}
      </div>
    </div>
  );
}
