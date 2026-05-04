'use client';

import { use, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  Radar,
  Sparkles,
  Save,
  CheckCircle2,
  Crown,
  Loader2,
  AlertTriangle,
  Download,
} from 'lucide-react';
import clsx from 'clsx';

import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/loading';
import { Modal } from '@/components/ui/modal';
import type {
  SavedTender,
  Submission,
  SubmissionSection,
  Tender,
} from '@/types/database';

/* -------------------------------------------------------------------------- */
/*  AI-assisted submission editor — Client Component                          */
/*                                                                            */
/*  Route param :id is the saved_tender_id. Loads the saved tender + its      */
/*  joined tender, plus the most recent submission for that saved_tender (if  */
/*  any). Exposes a set of simple textarea sections with a per-section        */
/*  "Générer avec IA" button. Free-tier users see a paywall modal.            */
/* -------------------------------------------------------------------------- */

type SectionKey =
  | 'presentation'
  | 'comprehension'
  | 'methodologie'
  | 'planning'
  | 'references';

interface SectionTemplate {
  id: SectionKey;
  title: string;
  description: string;
  order: number;
}

const SECTION_TEMPLATES: SectionTemplate[] = [
  {
    id: 'presentation',
    title: "Présentation de l'entreprise",
    description: "Qui êtes-vous ? Vos forces, votre histoire.",
    order: 1,
  },
  {
    id: 'comprehension',
    title: 'Compréhension du besoin',
    description: "Montrez que vous avez compris l'objet du marché.",
    order: 2,
  },
  {
    id: 'methodologie',
    title: 'Méthodologie',
    description: "Comment comptez-vous mener la mission ?",
    order: 3,
  },
  {
    id: 'planning',
    title: 'Planning',
    description: 'Étapes et jalons de réalisation.',
    order: 4,
  },
  {
    id: 'references',
    title: 'Références',
    description: 'Projets similaires déjà réalisés.',
    order: 5,
  },
];

interface LoadedData {
  savedTender: SavedTender;
  tender: Tender;
  submission: Submission | null;
}

type SectionMap = Record<SectionKey, SubmissionSection>;

function buildInitialSections(existing: Submission | null): SectionMap {
  const existingSections: SubmissionSection[] = Array.isArray(existing?.sections)
    ? (existing?.sections as SubmissionSection[])
    : [];

  const map: Partial<SectionMap> = {};
  for (const tpl of SECTION_TEMPLATES) {
    const match = existingSections.find(
      (s) => s.id === tpl.id || s.title === tpl.title,
    );
    map[tpl.id] = {
      id: tpl.id,
      title: tpl.title,
      order: tpl.order,
      content: match?.content ?? '',
    };
  }
  return map as SectionMap;
}

export default function RedactionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: savedTenderId } = use(params);
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [data, setData] = useState<LoadedData | null>(null);
  const [sections, setSections] = useState<SectionMap | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [generating, setGenerating] = useState<SectionKey | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  // ------------------------------------------------------------------ load
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setLoadError(null);

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.replace('/login');
          return;
        }

        // The route param can legitimately be either a saved_tender.id
        // (legacy) or a tender.id (when the user clicked "Préparer ma
        // soumission" from /analyse/[tenderId] or /tender/[tenderId]).
        // Try saved_tender lookup first; if that misses, treat the param
        // as a tender.id and either find or create the corresponding
        // saved_tender for this user.
        let stRow:
          | (SavedTender & { tender: Tender | null })
          | null = null;

        const bySavedId = (await supabase
          .from('saved_tenders')
          .select('*, tender:tenders(*)')
          .eq('id', savedTenderId)
          .eq('user_id', user.id)
          .maybeSingle()) as unknown as {
          data: (SavedTender & { tender: Tender | null }) | null;
        };
        stRow = bySavedId.data;

        if (!stRow) {
          // Fallback: treat the param as a tender_id. Find or create.
          const byTenderId = (await supabase
            .from('saved_tenders')
            .select('*, tender:tenders(*)')
            .eq('tender_id', savedTenderId)
            .eq('user_id', user.id)
            .maybeSingle()) as unknown as {
            data: (SavedTender & { tender: Tender | null }) | null;
          };
          stRow = byTenderId.data;

          if (!stRow) {
            // Verify the tender exists at all before creating a row.
            const { data: tenderCheck } = (await supabase
              .from('tenders')
              .select('*')
              .eq('id', savedTenderId)
              .maybeSingle()) as unknown as { data: Tender | null };

            if (tenderCheck) {
              const { data: created } = (await supabase
                .from('saved_tenders')
                .insert({
                  user_id: user.id,
                  tender_id: savedTenderId,
                  status: 'new' as const,
                  notes: null,
                  ai_analysis: null,
                })
                .select('*, tender:tenders(*)')
                .single()) as unknown as {
                data: (SavedTender & { tender: Tender | null }) | null;
              };
              stRow = created;
            }
          }
        }

        if (!stRow || !stRow.tender) {
          if (!cancelled) {
            setLoadError('Marché introuvable.');
            setLoading(false);
          }
          return;
        }

        // From here on, use the actual saved_tender id (may differ from
        // the route param when we resolved it from a tender id).
        const resolvedId = stRow.id;

        // Latest submission for this saved tender (may not exist yet).
        const subRes = (await supabase
          .from('submissions')
          .select('*')
          .eq('saved_tender_id', resolvedId)
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle()) as unknown as {
          data: Submission | null;
          error: unknown;
        };

        if (cancelled) return;

        const tender = stRow.tender!;
        const savedTender: SavedTender = { ...stRow, tender };

        setData({
          savedTender,
          tender,
          submission: subRes.data,
        });
        setSections(buildInitialSections(subRes.data));
      } catch (err) {
        console.error('Failed to load saved tender:', err);
        if (!cancelled) setLoadError('Impossible de charger le marché.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [savedTenderId, supabase, router]);

  // ---------------------------------------------------------------- change
  const updateSection = useCallback(
    (key: SectionKey, content: string) => {
      setSections((prev) => {
        if (!prev) return prev;
        return { ...prev, [key]: { ...prev[key], content } };
      });
      setSaved(false);
    },
    [],
  );

  // ----------------------------------------------------------- generate AI
  const handleGenerate = useCallback(
    async (key: SectionKey) => {
      if (!data) return;
      setGenError(null);
      setGenerating(key);

      try {
        // If a submission already exists, regenerate the specific section.
        if (data.submission) {
          const res = await fetch(
            `/api/submissions/${data.submission.id}/regenerate`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ section_id: key }),
            },
          );

          if (res.status === 403) {
            setShowPaywall(true);
            return;
          }

          if (!res.ok) {
            setGenError('La génération IA a échoué. Veuillez réessayer.');
            return;
          }

          const json = (await res.json()) as {
            regenerated_section?: SubmissionSection;
          };
          const content = json.regenerated_section?.content ?? '';
          updateSection(key, content);
          return;
        }

        // Otherwise create a full submission (generates all sections once).
        const createRes = await fetch('/api/submissions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tender_id: data.tender.id,
            saved_tender_id: data.savedTender.id,
          }),
        });

        if (createRes.status === 403) {
          setShowPaywall(true);
          return;
        }

        if (!createRes.ok) {
          setGenError('La génération IA a échoué. Veuillez réessayer.');
          return;
        }

        const { submission } = (await createRes.json()) as {
          submission: Submission;
        };

        setData({ ...data, submission });
        setSections(buildInitialSections(submission));
      } catch (err) {
        console.error('AI generation error:', err);
        setGenError('Une erreur inattendue est survenue.');
      } finally {
        setGenerating(null);
      }
    },
    [data, updateSection],
  );

  // ---------------------------------------------------------------- save
  const handleSave = useCallback(async () => {
    if (!data || !sections) return;
    setSaving(true);
    setSaved(false);

    const payload: SubmissionSection[] = SECTION_TEMPLATES.map((tpl) => ({
      ...sections[tpl.id],
    }));

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/login');
        return;
      }

      if (data.submission) {
        const res = await fetch(`/api/submissions/${data.submission.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sections: payload }),
        });
        if (!res.ok) {
          setGenError('La sauvegarde a échoué.');
          return;
        }
      } else {
        // Insert a minimal submission directly — no AI spend.
        const { data: inserted, error } = await supabase
          .from('submissions')
          .insert({
            user_id: user.id,
            tender_id: data.tender.id,
            saved_tender_id: data.savedTender.id,
            sections: payload as unknown as Record<string, unknown>[],
          })
          .select('*')
          .single();

        if (error || !inserted) {
          setGenError('La sauvegarde a échoué.');
          return;
        }

        setData({ ...data, submission: inserted as unknown as Submission });
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      console.error('Save error:', err);
      setGenError('Une erreur inattendue est survenue.');
    } finally {
      setSaving(false);
    }
  }, [data, sections, supabase, router]);

  // --------------------------------------------------------------- render
  return (
    <div className="min-h-dvh bg-bg-primary pb-32">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border bg-bg-primary/80 backdrop-blur-xl safe-top">
        <div className="flex items-center gap-3 px-4 py-3">
          <Link
            href="/feed"
            aria-label="Retour au feed"
            className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-bg-card text-text-secondary transition-colors hover:bg-bg-card-hover hover:text-text-primary"
          >
            <ArrowLeft className="size-5" />
          </Link>
          <Link
            href="/"
            className="flex items-center gap-2 font-display text-lg font-bold text-text-primary"
            aria-label="Accueil Radar"
          >
            <Radar className="size-5 text-accent-blue" />
            <span className="hidden sm:inline">Radar</span>
          </Link>
          <div className="ml-1 min-w-0 flex-1">
            <p className="truncate font-display text-sm font-semibold text-text-primary">
              {loading
                ? 'Chargement…'
                : data?.tender.title ?? 'Rédaction du mémoire'}
            </p>
            {data?.tender.contracting_authority && (
              <p className="truncate text-xs text-text-muted">
                {data.tender.contracting_authority}
              </p>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 pt-5">
        {/* Print-only header — replaces the on-screen sticky header when the
            user exports to PDF. Keeps the document legible standalone. */}
        {data && (
          <div className="print-only mb-6">
            <h1 className="text-xl font-bold">
              Mémoire technique — {data.tender.title}
            </h1>
            <p className="mt-1 text-sm">
              {data.tender.contracting_authority}
              {data.tender.deadline &&
                ` · Échéance: ${new Date(data.tender.deadline).toLocaleDateString('fr-BE')}`}
            </p>
            <hr className="my-3" />
          </div>
        )}

        {loading ? (
          <LoadingSkeleton />
        ) : loadError ? (
          <ErrorState message={loadError} onRetry={() => router.refresh()} />
        ) : data && sections ? (
          <>
            {/* Section editors */}
            <div className="space-y-5">
              {SECTION_TEMPLATES.map((tpl) => {
                const section = sections[tpl.id];
                const isGenerating = generating === tpl.id;
                return (
                  <article
                    key={tpl.id}
                    id={`section-${tpl.id}`}
                    className="rounded-2xl border border-border bg-bg-card p-5 animate-slide-up"
                  >
                    <header className="mb-3 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="font-display text-base font-semibold text-text-primary">
                          {tpl.title}
                        </h2>
                        <p className="mt-0.5 text-xs text-text-muted">
                          {tpl.description}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleGenerate(tpl.id)}
                        loading={isGenerating}
                        icon={<Sparkles className="size-4 text-accent-blue" />}
                      >
                        <span className="hidden sm:inline">Générer avec IA</span>
                        <span className="sm:hidden">IA</span>
                      </Button>
                    </header>

                    <Textarea
                      value={section.content}
                      onChange={(e) => updateSection(tpl.id, e.target.value)}
                      placeholder={`Rédigez votre ${tpl.title.toLowerCase()}…`}
                      autoResize
                      className="min-h-[8rem]"
                    />
                  </article>
                );
              })}
            </div>

            {genError && (
              <p
                role="alert"
                className="mt-5 rounded-lg bg-accent-red-soft p-3 text-center text-sm text-accent-red"
              >
                {genError}
              </p>
            )}
          </>
        ) : null}
      </main>

      {/* Sticky save bar */}
      {data && sections && !loading && (
        <div className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-border bg-bg-primary/90 backdrop-blur-xl safe-bottom">
          <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
            <AnimatePresence>
              {saved && (
                <motion.div
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  className="flex items-center gap-1.5 text-xs font-medium text-accent-green"
                >
                  <CheckCircle2 className="size-4" />
                  Sauvegardé
                </motion.div>
              )}
            </AnimatePresence>
            <div className="flex-1" />
            <Button
              variant="secondary"
              size="md"
              onClick={() => window.print()}
              icon={<Download className="size-4" />}
            >
              <span className="hidden sm:inline">Exporter en PDF</span>
              <span className="sm:hidden">PDF</span>
            </Button>
            <Button
              variant="primary"
              size="md"
              loading={saving}
              onClick={handleSave}
              icon={<Save className="size-4" />}
            >
              Sauvegarder
            </Button>
          </div>
        </div>
      )}

      {/* Paywall modal */}
      <Modal
        open={showPaywall}
        onClose={() => setShowPaywall(false)}
        title="Fonctionnalité Pro"
      >
        <div className="space-y-4 text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-accent-orange-soft text-accent-orange">
            <Crown className="size-6" />
          </div>
          <p className="text-sm text-text-secondary">
            La rédaction assistée par IA est réservée aux abonnés Pro et
            Business. Passez à Pro pour générer vos mémoires techniques en
            quelques secondes.
          </p>
          <div className="flex flex-col gap-2 pt-2 sm:flex-row">
            <Button
              variant="secondary"
              size="md"
              fullWidth
              onClick={() => setShowPaywall(false)}
            >
              Plus tard
            </Button>
            <Link
              href="/pricing"
              className={clsx(
                'inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-lg',
                'bg-accent-blue px-4 text-sm font-medium text-white',
                'transition-colors hover:bg-accent-blue/90',
              )}
            >
              Voir les plans
            </Link>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

function LoadingSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Chargement">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-border bg-bg-card p-5"
        >
          <div className="mb-3 flex items-center justify-between">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-8 w-24 rounded-lg" />
          </div>
          <Skeleton className="h-3 w-32" />
          <Skeleton className="mt-4 h-28 w-full rounded-lg" />
        </div>
      ))}
      <div className="flex items-center gap-2 text-xs text-text-muted">
        <Loader2 className="size-3.5 animate-spin" />
        Préparation des sections…
      </div>
    </div>
  );
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-bg-card/40 py-16 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-accent-red-soft text-accent-red">
        <AlertTriangle className="size-6" />
      </div>
      <p className="mt-4 font-display text-sm font-semibold text-text-primary">
        {message}
      </p>
      <p className="mt-1 max-w-[280px] text-xs text-text-muted">
        Vérifiez votre connexion, puis réessayez.
      </p>
      <Button variant="secondary" size="sm" className="mt-4" onClick={onRetry}>
        Réessayer
      </Button>
    </div>
  );
}
