'use client';

// ---------------------------------------------------------------------------
// /admin/health — at-a-glance scrape pipeline visibility
// ---------------------------------------------------------------------------
//
// Tracks per-source freshness + field-quality + user counts. Page is
// admin-gated by the `/api/admin/health` endpoint (returns 403 for
// non-admin users).
// ---------------------------------------------------------------------------

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, RefreshCw } from 'lucide-react';

interface SourceHealth {
  source: string;
  total: number;
  open: number;
  fresh_7d: number;
  with_deadline: number;
  with_budget: number;
  with_cpv: number;
  with_region: number;
  last_scrape: string | null;
  hours_since_last_scrape: number | null;
}

interface HealthData {
  generated_at: string;
  sources: SourceHealth[];
  users: {
    profiles: number;
    saved_searches: number;
    saved_tenders: number;
    push_subscriptions: number;
  };
  health: 'green' | 'amber' | 'red';
}

function pct(n: number, t: number) {
  if (t === 0) return '—';
  return `${Math.round((n / t) * 100)}%`;
}

function fmtSource(s: string) {
  if (s === 'ted') return 'TED (EU)';
  if (s === 'be_bulletin') return 'BDA (BE)';
  return s;
}

export default function AdminHealthPage() {
  const [data, setData] = useState<HealthData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    setRefreshing(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/health');
      if (res.status === 403) {
        setError('Accès refusé — seuls les admins peuvent voir cette page.');
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: HealthData = await res.json();
      setData(json);
    } catch (e) {
      setError(String(e));
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="min-h-dvh bg-bg-primary px-4 pb-12 pt-6">
      <div className="mx-auto max-w-3xl">
        <header className="mb-6 flex items-center gap-3">
          <Link
            href="/dashboard"
            className="flex size-10 items-center justify-center rounded-xl bg-bg-card text-text-secondary hover:bg-bg-card-hover hover:text-text-primary"
          >
            <ArrowLeft className="size-5" />
          </Link>
          <div>
            <h1 className="font-display text-xl font-bold text-text-primary">
              Pipeline de scan
            </h1>
            <p className="text-xs text-text-muted">
              {data?.generated_at
                ? `Mis à jour ${new Date(data.generated_at).toLocaleString('fr-BE')}`
                : 'Chargement…'}
            </p>
          </div>
          <button
            className="ml-auto flex size-10 items-center justify-center rounded-xl bg-bg-card text-text-secondary hover:bg-bg-card-hover hover:text-text-primary"
            onClick={load}
            disabled={refreshing}
            aria-label="Rafraîchir"
          >
            <RefreshCw className={`size-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </header>

        {error && (
          <div className="mb-4 rounded-lg bg-accent-red-soft p-3 text-sm text-accent-red">
            {error}
          </div>
        )}

        {data && (
          <>
            {/* Health banner */}
            <div
              className={`mb-6 rounded-xl px-4 py-3 text-sm font-medium ${
                data.health === 'green'
                  ? 'bg-accent-green-soft text-accent-green'
                  : data.health === 'amber'
                    ? 'bg-accent-orange-soft text-accent-orange'
                    : 'bg-accent-red-soft text-accent-red'
              }`}
            >
              {data.health === 'green'
                ? '🟢 Pipeline en bonne santé — tous les scrapers ont tourné dans les 12 dernières heures.'
                : data.health === 'amber'
                  ? "🟡 Un scraper a tourné il y a plus de 12h — surveillance recommandée."
                  : '🔴 Au moins un scraper n’a pas tourné depuis 24h — vérifier les logs GitHub Actions.'}
            </div>

            {/* Per-source stats */}
            <h2 className="mb-3 text-sm font-semibold text-text-secondary">
              Sources
            </h2>
            <div className="space-y-3">
              {data.sources.map((s) => (
                <div
                  key={s.source}
                  className="rounded-xl border border-border bg-bg-card p-4"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="font-display text-base font-semibold text-text-primary">
                      {fmtSource(s.source)}
                    </h3>
                    <span className="text-xs text-text-muted">
                      Dernier scrape :{' '}
                      <span className="font-medium text-text-primary">
                        {s.hours_since_last_scrape !== null
                          ? `il y a ${s.hours_since_last_scrape}h`
                          : '—'}
                      </span>
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
                    <Stat label="Total" value={s.total} />
                    <Stat label="Ouverts" value={s.open} />
                    <Stat label="Frais < 7j" value={s.fresh_7d} />
                    <Stat
                      label="Avec deadline"
                      value={`${s.with_deadline} (${pct(s.with_deadline, s.total)})`}
                    />
                    <Stat
                      label="Avec budget"
                      value={`${s.with_budget} (${pct(s.with_budget, s.total)})`}
                    />
                    <Stat
                      label="Avec région"
                      value={`${s.with_region} (${pct(s.with_region, s.total)})`}
                    />
                    <Stat
                      label="Avec CPV"
                      value={`${s.with_cpv} (${pct(s.with_cpv, s.total)})`}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* User stats */}
            <h2 className="mb-3 mt-6 text-sm font-semibold text-text-secondary">
              Utilisateurs
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <KPI label="Profils" value={data.users.profiles} />
              <KPI label="Alertes" value={data.users.saved_searches} />
              <KPI label="Tenders sauvés" value={data.users.saved_tenders} />
              <KPI label="Push abonnés" value={data.users.push_subscriptions} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div>
      <p className="text-xs text-text-muted">{label}</p>
      <p className="font-display text-base font-semibold text-text-primary">
        {value}
      </p>
    </div>
  );
}

function KPI({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-bg-card p-4 text-center">
      <p className="font-display text-2xl font-bold text-text-primary">
        {value}
      </p>
      <p className="mt-1 text-xs text-text-muted">{label}</p>
    </div>
  );
}
