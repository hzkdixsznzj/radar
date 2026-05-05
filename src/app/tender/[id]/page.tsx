'use client';

// ---------------------------------------------------------------------------
// /tender/[id] — read-only tender detail page
// ---------------------------------------------------------------------------
//
// Shown when the user taps "Analyser" from the feed or clicks into a saved
// tender from the dashboard. Purely informational — does NOT trigger an AI
// analysis, so no credits are consumed. From here the user can:
//   – Save the tender (bookmark)
//   – Launch the AI analysis (routes to /analyse/[id], Pro/Business only)
//   – Open the official source via documents_url
//
// The previous flow jumped straight to /analyse/[id], which immediately
// burned a credit. This page gives users a chance to skim the tender first.
// ---------------------------------------------------------------------------

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Bookmark,
  Building2,
  Calendar,
  Download,
  Euro,
  ExternalLink,
  FileText,
  MapPin,
  Paperclip,
  Sparkles,
  Tag,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Countdown } from '@/components/ui/countdown';
import { ScoreBadge } from '@/components/ui/score-badge';
import type { TenderWithScore } from '@/types/database';

interface TenderDocument {
  label: string;
  url: string;
  type: string;
}

interface AwardEntry {
  id: string;
  title: string;
  contracting_authority: string | null;
  region: string | null;
  awarded_to: string | null;
  awarded_value: number | null;
  awarded_at: string | null;
  publication_date: string | null;
}

interface ParsedSpec {
  estimated_value_eur: number | null;
  required_certifications: string[];
  key_dates: { label: string; date: string }[];
  scope_summary: string;
  buyer_obligations: string[];
}

const typeLabels: Record<string, { label: string; color: 'blue' | 'green' | 'orange' }> = {
  works: { label: 'Travaux', color: 'blue' },
  services: { label: 'Services', color: 'green' },
  supplies: { label: 'Fournitures', color: 'orange' },
};

function formatValue(value: number | null, currency: string): string {
  if (value === null) return 'Non spécifié';
  return `${value.toLocaleString('fr-BE')} ${currency}`;
}

function formatDate(iso: string | null | undefined): string {
  // BDA notices in particular often omit a hard deadline (open-ended call,
  // ongoing framework agreement). Don't fall through to `new Date(null)`
  // which silently renders "1 janvier 1970".
  if (!iso) return 'Non spécifiée';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return 'Non spécifiée';
  return d.toLocaleDateString('fr-BE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function TenderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [tender, setTender] = useState<TenderWithScore | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [plan, setPlan] = useState<'free' | 'pro' | 'business'>('free');
  const [hasCachedAnalysis, setHasCachedAnalysis] = useState(false);
  const [documents, setDocuments] = useState<TenderDocument[] | null>(null);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  // Award notices for similar tenders — competitive intel
  const [awards, setAwards] = useState<AwardEntry[] | null>(null);
  // PDF spec extraction (cached on tenders.parsed_spec)
  const [parsedSpec, setParsedSpec] = useState<ParsedSpec | null>(null);
  const [parsingSpec, setParsingSpec] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [tenderRes, profileRes, savedRes] = await Promise.all([
          fetch(`/api/tenders/${id}`),
          fetch('/api/profile'),
          fetch('/api/saved-tenders'),
        ]);

        if (!tenderRes.ok) throw new Error('Tender not found');

        const tenderData: TenderWithScore = await tenderRes.json();
        if (cancelled) return;
        setTender(tenderData);

        if (profileRes.ok) {
          const profileData = await profileRes.json();
          const p = profileData?.subscription?.plan as
            | 'free'
            | 'pro'
            | 'business'
            | undefined;
          if (p) setPlan(p);
        }

        if (savedRes.ok) {
          const savedData = await savedRes.json();
          const list = savedData?.saved_tenders as
            | Array<{ tender_id: string; ai_analysis: unknown }>
            | undefined;
          const hit = list?.find((r) => r.tender_id === id);
          if (hit) {
            setSaved(true);
            if (hit.ai_analysis) setHasCachedAnalysis(true);
          }
        }
      } catch {
        // swallowed — UI shows "Impossible de charger"
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  // Lazy: resolve attached documents once the tender loads. We defer to
  // the server-side cache in `tenders.documents` so repeat visits are
  // instant, and absorb failures silently — documents are nice-to-have.
  useEffect(() => {
    if (!tender) return;
    let cancelled = false;
    setDocumentsLoading(true);
    fetch(`/api/tenders/${id}/documents`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        setDocuments((data.documents as TenderDocument[]) ?? []);
      })
      .catch(() => setDocuments([]))
      .finally(() => {
        if (!cancelled) setDocumentsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tender, id]);

  // Pull recently-awarded similar tenders for competitive intel.
  // Always fires once we have the tender; surface only renders if
  // we actually got results.
  useEffect(() => {
    if (!tender) return;
    let cancelled = false;
    fetch(`/api/awards?tender_id=${id}&limit=8`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        setAwards((data.awards as AwardEntry[]) ?? []);
      })
      .catch(() => setAwards([]));
    return () => {
      cancelled = true;
    };
  }, [tender, id]);

  // Pre-load any cached parsed spec so the user doesn't have to click
  // "Analyser" if it's already been done for this tender.
  useEffect(() => {
    if (!tender) return;
    const existing = (tender as TenderWithScore & { parsed_spec?: ParsedSpec | null })
      .parsed_spec;
    if (existing) setParsedSpec(existing);
  }, [tender]);

  async function handleParseSpec() {
    if (parsingSpec) return;
    setParsingSpec(true);
    setParseError(null);
    try {
      const res = await fetch(`/api/tenders/${id}/parse-spec`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) {
        setParseError(data?.error ?? 'Erreur inconnue');
        return;
      }
      setParsedSpec(data.spec as ParsedSpec);
    } catch (err) {
      setParseError(String(err));
    } finally {
      setParsingSpec(false);
    }
  }

  async function handleSave() {
    if (saved || saving) return;
    setSaving(true);
    try {
      const res = await fetch('/api/saved-tenders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tender_id: id }),
      });
      if (res.ok || res.status === 409) {
        setSaved(true);
      }
    } finally {
      setSaving(false);
    }
  }

  function handleAnalyze() {
    router.push(`/analyse/${id}`);
  }

  if (loading) {
    return (
      <div className="min-h-dvh bg-bg-primary">
        <header className="sticky top-0 z-30 border-b border-border bg-bg-primary/80 backdrop-blur-lg safe-top">
          <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
            <button
              onClick={() => router.back()}
              className="size-9 flex items-center justify-center rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-card-hover transition-colors cursor-pointer"
              aria-label="Retour"
            >
              <ArrowLeft className="size-5" />
            </button>
            <div className="h-4 w-32 rounded bg-bg-card animate-pulse" />
          </div>
        </header>
        <main className="mx-auto max-w-2xl px-4 py-6 space-y-4">
          <div className="h-40 rounded-2xl bg-bg-card animate-pulse" />
          <div className="h-24 rounded-2xl bg-bg-card animate-pulse" />
          <div className="h-64 rounded-2xl bg-bg-card animate-pulse" />
        </main>
      </div>
    );
  }

  if (!tender) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-bg-primary px-4">
        <div className="max-w-sm text-center">
          <p className="mb-4 text-text-muted">
            Impossible de charger ce marché.
          </p>
          <Button variant="secondary" onClick={() => router.back()}>
            Retour
          </Button>
        </div>
      </div>
    );
  }

  const typeConfig =
    typeLabels[tender.tender_type] ?? { label: tender.tender_type, color: 'blue' as const };

  return (
    <div className="min-h-dvh bg-bg-primary">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border bg-bg-primary/80 backdrop-blur-lg safe-top">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="shrink-0 size-9 flex items-center justify-center rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-card-hover transition-colors cursor-pointer"
            aria-label="Retour"
          >
            <ArrowLeft className="size-5" />
          </button>

          <div className="flex-1 min-w-0">
            <h1 className="truncate text-sm font-semibold text-text-primary font-display">
              {tender.title}
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-text-muted truncate">
                {tender.contracting_authority}
              </span>
              <Countdown deadline={tender.deadline} />
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 pb-40 pt-6 space-y-5">
        {/* Hero: score + type + title */}
        <Card padding="lg">
          <div className="flex items-start justify-between gap-4 mb-4">
            <ScoreBadge score={tender.relevance_score} size="lg" />
            <Badge color={typeConfig.color} size="md">
              {typeConfig.label}
            </Badge>
          </div>
          <h2 className="text-xl font-bold font-display text-text-primary leading-snug mb-2">
            {tender.title}
          </h2>
          <p className="text-sm text-text-secondary">
            {tender.contracting_authority}
          </p>
        </Card>

        {/* Key metadata grid */}
        <Card padding="lg">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <MetaRow
              icon={<Euro className="size-4" />}
              label="Budget estimé"
              value={formatValue(tender.estimated_value, tender.currency)}
            />
            <MetaRow
              icon={<MapPin className="size-4" />}
              label="Région"
              value={tender.region || 'Non spécifiée'}
            />
            <MetaRow
              icon={<Calendar className="size-4" />}
              label="Publication"
              value={formatDate(tender.publication_date)}
            />
            <MetaRow
              icon={<Calendar className="size-4" />}
              label="Date limite"
              value={formatDate(tender.deadline)}
            />
            {tender.cpv_codes?.length > 0 && (
              <MetaRow
                icon={<Tag className="size-4" />}
                label="Codes CPV"
                value={tender.cpv_codes.slice(0, 4).join(', ')}
              />
            )}
            <MetaRow
              icon={<Building2 className="size-4" />}
              label="Source"
              value={tender.source === 'ted' ? 'TED (européen)' : 'Bulletin Adjudications (BE)'}
            />
          </div>
        </Card>

        {/* Description */}
        {tender.description && (
          <Card padding="lg">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="size-8 rounded-lg bg-accent-blue-soft flex items-center justify-center">
                <FileText className="size-4 text-accent-blue" />
              </div>
              <h2 className="font-semibold text-text-primary font-display">
                Description
              </h2>
            </div>
            <p className="text-sm leading-relaxed text-text-secondary whitespace-pre-wrap">
              {tender.description}
            </p>
          </Card>
        )}

        {/* Full text (if differs from description) */}
        {tender.full_text && tender.full_text !== tender.description && (
          <Card padding="lg">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-text-muted">
              Détails complémentaires
            </h3>
            <p className="text-sm leading-relaxed text-text-secondary whitespace-pre-wrap">
              {tender.full_text}
            </p>
          </Card>
        )}

        {/* AI spec extraction card — shows the extracted budget /
            certifications / key dates / scope summary from the cahier
            des charges PDF, when one is reachable. The first call
            triggers a Claude PDF parse (~$0.10-0.50, cached forever
            on the tender row). */}
        {(parsedSpec || (documents && documents.some((d) => d.type === 'pdf'))) && (
          <Card padding="lg">
            <div className="mb-3 flex items-start justify-between gap-3">
              <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-text-muted">
                <Sparkles className="size-4 text-accent-blue" />
                Synthèse IA du cahier des charges
              </h3>
              {!parsedSpec && (
                <Button
                  size="sm"
                  variant="secondary"
                  loading={parsingSpec}
                  onClick={handleParseSpec}
                  icon={<Sparkles className="size-4 text-accent-blue" />}
                >
                  Analyser le PDF
                </Button>
              )}
            </div>

            {parseError && (
              <p className="mb-3 rounded-lg bg-accent-red-soft p-3 text-sm text-accent-red">
                {parseError}
              </p>
            )}

            {!parsedSpec && !parsingSpec && !parseError && (
              <p className="text-sm text-text-secondary">
                Lance une analyse IA pour extraire le budget exact, les
                certifications exigées, les dates clés et un résumé de la
                mission directement depuis le cahier des charges.
              </p>
            )}

            {parsedSpec && (
              <div className="space-y-4">
                {parsedSpec.estimated_value_eur != null && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                      Budget estimé
                    </p>
                    <p className="font-display text-xl font-bold text-text-primary">
                      {parsedSpec.estimated_value_eur.toLocaleString('fr-BE')} EUR
                    </p>
                  </div>
                )}

                {parsedSpec.scope_summary && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                      Mission
                    </p>
                    <p className="text-sm leading-relaxed text-text-secondary">
                      {parsedSpec.scope_summary}
                    </p>
                  </div>
                )}

                {parsedSpec.required_certifications.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                      Certifications exigées
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {parsedSpec.required_certifications.map((c) => (
                        <span
                          key={c}
                          className="rounded-full border border-border bg-bg-input px-2.5 py-0.5 text-xs text-text-secondary"
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {parsedSpec.key_dates.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                      Dates clés
                    </p>
                    <ul className="mt-1.5 space-y-1">
                      {parsedSpec.key_dates.map((d, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm text-text-secondary">
                          <Calendar className="size-3.5 text-text-muted" />
                          <span className="font-medium">{d.date}</span>
                          <span className="text-text-muted">— {d.label}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {parsedSpec.buyer_obligations.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                      Obligations du soumissionnaire
                    </p>
                    <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm text-text-secondary">
                      {parsedSpec.buyer_obligations.map((o, i) => (
                        <li key={i}>{o}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </Card>
        )}

        {/* Competitive intelligence — recently-awarded similar tenders.
            Surfaced only when we have at least one match. Massively
            valuable: the user sees who beat them on similar contracts
            and at what price. */}
        {awards && awards.length > 0 && (
          <Card padding="lg">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-text-muted">
              <Tag className="size-4 text-accent-blue" />
              Marchés similaires attribués récemment
            </h3>
            <ul className="space-y-3">
              {awards.map((a) => (
                <li
                  key={a.id}
                  className="rounded-lg border border-border bg-bg-input p-3 text-sm"
                >
                  <p className="font-medium text-text-primary line-clamp-2">
                    {a.title}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-muted">
                    {a.contracting_authority && (
                      <span className="flex items-center gap-1">
                        <Building2 className="size-3" />
                        {a.contracting_authority}
                      </span>
                    )}
                    {a.region && (
                      <span className="flex items-center gap-1">
                        <MapPin className="size-3" />
                        {a.region}
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                    {a.awarded_to && (
                      <span className="rounded-full bg-accent-green-soft px-2 py-0.5 font-medium text-accent-green">
                        Gagné par : {a.awarded_to}
                      </span>
                    )}
                    {a.awarded_value != null && (
                      <span className="font-medium text-text-primary">
                        {a.awarded_value.toLocaleString('fr-BE')} EUR
                      </span>
                    )}
                    {a.awarded_at && (
                      <span className="text-text-muted">{a.awarded_at}</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs italic text-text-muted">
              Source : avis d&apos;attribution publiés par les pouvoirs adjudicateurs.
            </p>
          </Card>
        )}

        {/* Attached documents — resolved lazily via /api/tenders/[id]/documents */}
        {(documentsLoading || (documents && documents.length > 0)) && (
          <Card padding="lg">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-text-muted">
              <Paperclip className="size-4" />
              Documents du marché
            </h3>
            {documentsLoading && !documents ? (
              <div className="space-y-2">
                <div className="h-10 animate-pulse rounded-lg bg-bg-input" />
                <div className="h-10 animate-pulse rounded-lg bg-bg-input" />
              </div>
            ) : (
              <ul className="space-y-2">
                {(documents ?? []).map((doc) => {
                  const isLink = doc.type === 'link';
                  return (
                    <li key={doc.url}>
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between gap-3 rounded-lg border border-border bg-bg-input px-3 py-2.5 text-sm text-text-secondary transition-colors hover:border-accent-blue hover:text-accent-blue"
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <FileText className="size-4 shrink-0" />
                          <span className="truncate">{doc.label}</span>
                        </span>
                        <span className="flex shrink-0 items-center gap-1.5 text-xs text-text-muted">
                          {!isLink && <span className="uppercase">{doc.type}</span>}
                          {isLink ? (
                            <ExternalLink className="size-3.5" />
                          ) : (
                            <Download className="size-3.5" />
                          )}
                        </span>
                      </a>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        )}

        {/* Link to source. We have two options:
         *  - For TED, the documents_url already points at the public notice
         *    page on ted.europa.eu (works once JS loads).
         *  - For BDA, the saved URL points at the publicationWorkspace, which
         *    is BDA's editor view and renders an empty shell for outside
         *    visitors. A Google search on the title + reference number
         *    surfaces the buyer's own announcement page with the actual
         *    cahier des charges. The previous attempt scoped the search to
         *    `site:publicprocurement.be OR site:belgium.be` which was too
         *    narrow — many buyers publish on their own .be domains, so we
         *    drop the scope and let Google rank the most useful page.
         */}
        {(() => {
          const isBda = tender.source !== 'ted';
          const queryParts: string[] = [];
          if (tender.title) queryParts.push(`"${tender.title}"`);
          if (tender.external_id) queryParts.push(tender.external_id);
          const fallbackQuery = encodeURIComponent(queryParts.join(' '));
          const href = isBda
            ? `https://www.google.com/search?q=${fallbackQuery}`
            : tender.documents_url;
          if (!href) return null;
          return (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between rounded-xl border border-border bg-bg-card p-4 text-sm text-text-secondary transition-colors hover:border-accent-blue hover:text-accent-blue"
            >
              <span className="flex items-center gap-2">
                <ExternalLink className="size-4" />
                {isBda ? "Rechercher l'annonce (Google)" : "Voir l'annonce sur TED"}
              </span>
              <span className="text-xs text-text-muted">
                {isBda ? 'google.com' : 'ted.europa.eu'}
              </span>
            </a>
          );
        })()}

        {/* Free-tier upgrade CTA */}
        {plan === 'free' && !hasCachedAnalysis && (
          <Card padding="lg">
            <div className="flex items-start gap-3">
              <div className="size-10 shrink-0 rounded-lg bg-accent-blue-soft flex items-center justify-center">
                <Sparkles className="size-5 text-accent-blue" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-text-primary font-display mb-1">
                  Débloquer l&apos;analyse IA
                </h3>
                <p className="text-sm text-text-secondary mb-3">
                  Obtenez un score de pertinence détaillé, les risques identifiés,
                  le niveau de concurrence et une suggestion de prix — en quelques
                  secondes.
                </p>
                <Link href="/pricing">
                  <Button variant="primary" size="sm">
                    Voir les offres
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        )}
      </main>

      {/* Bottom action bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-bg-primary/90 backdrop-blur-lg safe-bottom">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <Button
            variant="secondary"
            size="md"
            icon={<Bookmark className={saved ? 'size-4 fill-current' : 'size-4'} />}
            loading={saving}
            onClick={handleSave}
            disabled={saved}
            className="shrink-0"
          >
            {saved ? 'Sauvegardé' : 'Sauvegarder'}
          </Button>

          <Button
            variant="primary"
            size="lg"
            fullWidth
            icon={<Sparkles className="size-4" />}
            onClick={handleAnalyze}
          >
            {hasCachedAnalysis ? 'Voir l\u2019analyse IA' : 'Lancer l\u2019analyse IA'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function MetaRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-xs font-medium text-text-muted mb-1">
        {icon}
        {label}
      </div>
      <p className="text-sm text-text-primary">{value}</p>
    </div>
  );
}
