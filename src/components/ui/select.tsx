'use client';

import {
  useState,
  useRef,
  useEffect,
  useId,
  useMemo,
  type ReactNode,
  useCallback,
} from 'react';
import { ChevronDown, Search, Check, X } from 'lucide-react';
import clsx from 'clsx';

export interface SelectOption {
  value: string;
  label: string;
  icon?: ReactNode;
}

export interface SelectProps {
  options: SelectOption[];
  value?: string | string[];
  onChange?: (value: string | string[]) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  multiple?: boolean;
  searchable?: boolean;
  disabled?: boolean;
  className?: string;
}

export function Select({
  options,
  value,
  onChange,
  placeholder = 'Sélectionner...',
  label,
  error,
  multiple = false,
  searchable = false,
  disabled = false,
  className,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const id = useId();

  const selected = useMemo(
    () =>
      multiple
        ? Array.isArray(value)
          ? value
          : []
        : typeof value === 'string'
          ? value
          : '',
    [multiple, value],
  );

  const filtered = search
    ? options.filter((o) =>
        o.label.toLowerCase().includes(search.toLowerCase()),
      )
    : options;

  const handleSelect = useCallback(
    (optionValue: string) => {
      if (multiple) {
        const arr = Array.isArray(selected) ? selected : [];
        const next = arr.includes(optionValue)
          ? arr.filter((v) => v !== optionValue)
          : [...arr, optionValue];
        onChange?.(next);
      } else {
        onChange?.(optionValue);
        setOpen(false);
      }
      setSearch('');
    },
    [multiple, selected, onChange],
  );

  const removeTag = (optionValue: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (Array.isArray(selected)) {
      onChange?.(selected.filter((v) => v !== optionValue));
    }
  };

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Focus search when opening
  useEffect(() => {
    if (open && searchable) {
      searchRef.current?.focus();
    }
  }, [open, searchable]);

  const displayLabel = multiple
    ? null
    : options.find((o) => o.value === selected)?.label;

  return (
    <div className={clsx('flex flex-col gap-1.5', className)} ref={containerRef}>
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-text-secondary">
          {label}
        </label>
      )}
      <div className="relative">
        {/* Trigger */}
        <button
          id={id}
          type="button"
          disabled={disabled}
          onClick={() => setOpen((o) => !o)}
          className={clsx(
            'w-full min-h-10 rounded-lg border bg-bg-input px-3 text-sm text-left',
            'flex items-center gap-2 transition-colors duration-150 cursor-pointer',
            'focus:outline-none focus:border-border-focus focus:ring-1 focus:ring-border-focus',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            error
              ? 'border-accent-red'
              : open
                ? 'border-border-focus ring-1 ring-border-focus'
                : 'border-border',
          )}
          aria-expanded={open}
          aria-haspopup="listbox"
        >
          <span className="flex-1 flex flex-wrap gap-1 py-1">
            {multiple && Array.isArray(selected) && selected.length > 0 ? (
              selected.map((v) => {
                const opt = options.find((o) => o.value === v);
                return (
                  <span
                    key={v}
                    className="inline-flex items-center gap-1 rounded bg-accent-blue-soft text-accent-blue text-xs px-1.5 py-0.5"
                  >
                    {opt?.label ?? v}
                    <X
                      className="size-3 cursor-pointer hover:text-text-primary"
                      onClick={(e) => removeTag(v, e)}
                    />
                  </span>
                );
              })
            ) : displayLabel ? (
              <span className="text-text-primary">{displayLabel}</span>
            ) : (
              <span className="text-text-muted">{placeholder}</span>
            )}
          </span>
          <ChevronDown
            className={clsx(
              'size-4 shrink-0 text-text-muted transition-transform duration-200',
              open && 'rotate-180',
            )}
          />
        </button>

        {/* Dropdown */}
        {open && (
          <div className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-bg-card shadow-xl overflow-hidden">
            {searchable && (
              <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
                <Search className="size-4 text-text-muted shrink-0" />
                <input
                  ref={searchRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher..."
                  className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
                />
              </div>
            )}
            <ul
              role="listbox"
              aria-multiselectable={multiple}
              className="max-h-60 overflow-y-auto py-1"
            >
              {filtered.length === 0 ? (
                <li className="px-3 py-2 text-sm text-text-muted">
                  Aucun résultat
                </li>
              ) : (
                filtered.map((option) => {
                  const isSelected = multiple
                    ? Array.isArray(selected) && selected.includes(option.value)
                    : selected === option.value;
                  return (
                    <li
                      key={option.value}
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => handleSelect(option.value)}
                      className={clsx(
                        'flex items-center gap-2 px-3 py-2 text-sm cursor-pointer transition-colors duration-100',
                        isSelected
                          ? 'text-accent-blue bg-accent-blue-soft'
                          : 'text-text-primary hover:bg-bg-card-hover',
                      )}
                    >
                      {multiple && (
                        <span
                          className={clsx(
                            'size-4 shrink-0 rounded border flex items-center justify-center',
                            isSelected
                              ? 'bg-accent-blue border-accent-blue'
                              : 'border-border',
                          )}
                        >
                          {isSelected && (
                            <Check className="size-3 text-white" />
                          )}
                        </span>
                      )}
                      {option.icon && (
                        <span className="shrink-0">{option.icon}</span>
                      )}
                      <span className="truncate">{option.label}</span>
                      {!multiple && isSelected && (
                        <Check className="size-4 ml-auto text-accent-blue shrink-0" />
                      )}
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        )}
      </div>
      {error && <p className="text-xs text-accent-red">{error}</p>}
    </div>
  );
}
