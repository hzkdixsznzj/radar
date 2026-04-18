'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Bookmark,
  FileText,
  Target,
  Scale,
  AlertTriangle,
  Coins,
  ListChecks,
} from 'lucide-react';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Countdown } from '@/components/ui/countdown';
import { ScoreDisplay } from '@/components/analysis/score-display';
import { RecommendationBadge } from '@/components/analysis/recommendation-badge';
import { CompetitionGauge } from '@/components/analysis/competition-gauge';
import type { Tender, AIAnalysis } from '@/types/database';

/* ---------- stagger animation helpers ---------- */
const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.3 },
  },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } },
};

/* ---------- loading skeleton ---------- */
function AnalysisSkeleton() {
  return (
    <div className="flex flex-col items-center gap-8 py-12">
      {/* Radar animation */}
      <div className="relative flex size-36 items-center justify-center">
        <div className="absolute inset-0 rounded-full border-2 border-border" />
        <div className="absolute inset-3 rounded-full border border-border/60" />
        <div className="absolute inset-6 rounded-full border border-border/40" />
        <motion.div
          className="absolute inset-0 origin-center"
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        >
          <div
            className="h-1/2 w-0.5 mx-auto bg-gradient-to-t from-accent-blue to-transparent rounded-full"
          />
        </motion.div>
        <motion.div
          className="absolute size-2 rounded-full bg-accent-blue"
          animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      </div>

      <div className="text-center space-y-2">
        <p className="text-lg font-semibold text-text-primary font-display">
          L&apos;IA analyse ce marche...
        </p>
        <p className="text-sm text-text-muted">
          Evaluation de la pertinence, des risques et de la concurrence
        </p>
      </div>

      {/* Skeleton cards */}
      <div className="w-full space-y-3">
        {[1, 2, 3].map((n) => (
          <div
            key={n}
            className="h-24 rounded-xl bg-bg-card border border-border animate-pulse"
          />
        ))}
      </div>
    </div>
  );
}

/* ---------- main page ---------- */
export default function AnalysePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [tender, setTender] = useState<Tender | null>(null);
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        // Fetch tender data
        const tenderRes = await fetch(`/api/tenders/${id}`);
        if (!tenderRes.ok) throw new Error('Tender not found');
        const tenderData: Tender = await tenderRes.json();
        if (!cancelled) setTender(tenderData);

        // Trigger / fetch AI analysis. The API returns `{ analysis }` —
        // `cached: true` indicates we got a previously-stored result
        // (no credit consumed).
        const analysisRes = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tender_id: id }),
        });
        if (!analysisRes.ok) {
          if (analysisRes.status === 403) {
            if (!cancelled) {
              setErrorMsg(
                'L\u2019analyse IA est réservée aux plans Pro et Business.',
              );
              setLoading(false);
            }
            return;
          }
          throw new Error('Analysis failed');
        }
        const payload = (await analysisRes.json()) as {
          analysis: AIAnalysis;
          cached?: boolean;
        };
        if (!cancelled) {
          setAnalysis(payload.analysis);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setErrorMsg(
            'Impossible de charger l\u2019analyse. Veuillez réessayer.',
          );
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function handleSave() {
    setSaving(true);
    try {
      await fetch('/api/saved-tenders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tender_id: id }),
      });
    } finally {
      setSaving(false);
    }
  }

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
              {tender?.title ?? 'Analyse en cours...'}
            </h1>
            {tender && (
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-text-muted truncate">
                  {tender.contracting_authority}
                </span>
                <Countdown deadline={tender.deadline} />
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-2xl px-4 pb-32 pt-6">
        {loading ? (
          <AnalysisSkeleton />
        ) : analysis && tender ? (
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="space-y-5"
          >
            {/* Score + Recommendation */}
            <motion.div variants={item}>
              <Card padding="lg" className="flex flex-col items-center gap-5">
                <ScoreDisplay score={analysis.relevance_score} />
                <RecommendationBadge
                  recommendation={analysis.recommendation}
                  reason={analysis.recommendation_reason}
                />
              </Card>
            </motion.div>

            {/* Summary */}
            <motion.div variants={item}>
              <Card padding="lg">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="size-8 rounded-lg bg-accent-blue-soft flex items-center justify-center">
                    <FileText className="size-4 text-accent-blue" />
                  </div>
                  <h2 className="font-semibold text-text-primary font-display">
                    Resume
                  </h2>
                </div>
                <p className="text-sm leading-relaxed text-text-secondary">
                  {analysis.summary}
                </p>
              </Card>
            </motion.div>

            {/* Pertinence */}
            <motion.div variants={item}>
              <Card padding="lg">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="size-8 rounded-lg bg-accent-green-soft flex items-center justify-center">
                    <Target className="size-4 text-accent-green" />
                  </div>
                  <h2 className="font-semibold text-text-primary font-display">
                    Pertinence pour votre profil
                  </h2>
                </div>
                <p className="text-sm leading-relaxed text-text-secondary">
                  {analysis.relevance_reason}
                </p>
              </Card>
            </motion.div>

            {/* Attribution criteria */}
            <motion.div variants={item}>
              <Card padding="lg">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="size-8 rounded-lg bg-accent-blue-soft flex items-center justify-center">
                    <ListChecks className="size-4 text-accent-blue" />
                  </div>
                  <h2 className="font-semibold text-text-primary font-display">
                    Criteres d&apos;attribution
                  </h2>
                </div>
                <ul className="space-y-2">
                  {analysis.attribution_criteria.map((criterion, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2.5 text-sm text-text-secondary"
                    >
                      <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent-blue" />
                      {criterion}
                    </li>
                  ))}
                </ul>
              </Card>
            </motion.div>

            {/* Competition level */}
            <motion.div variants={item}>
              <Card padding="lg">
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="size-8 rounded-lg bg-accent-orange-soft flex items-center justify-center">
                    <Scale className="size-4 text-accent-orange" />
                  </div>
                  <h2 className="font-semibold text-text-primary font-display">
                    Niveau de concurrence
                  </h2>
                </div>
                <CompetitionGauge level={analysis.competition_level} />
              </Card>
            </motion.div>

            {/* Risks */}
            {analysis.risks.length > 0 && (
              <motion.div variants={item}>
                <Card padding="lg">
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className="size-8 rounded-lg bg-accent-red-soft flex items-center justify-center">
                      <AlertTriangle className="size-4 text-accent-red" />
                    </div>
                    <h2 className="font-semibold text-text-primary font-display">
                      Risques identifies
                    </h2>
                  </div>
                  <ul className="space-y-2">
                    {analysis.risks.map((risk, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2.5 text-sm text-text-secondary"
                      >
                        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-accent-red" />
                        {risk}
                      </li>
                    ))}
                  </ul>
                </Card>
              </motion.div>
            )}

            {/* Suggested price */}
            {analysis.suggested_price && (
              <motion.div variants={item}>
                <Card padding="lg">
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className="size-8 rounded-lg bg-accent-green-soft flex items-center justify-center">
                      <Coins className="size-4 text-accent-green" />
                    </div>
                    <h2 className="font-semibold text-text-primary font-display">
                      Suggestion de prix
                    </h2>
                  </div>
                  <p className="text-sm leading-relaxed text-text-secondary">
                    {analysis.suggested_price}
                  </p>
                </Card>
              </motion.div>
            )}
          </motion.div>
        ) : (
          <div className="py-16 text-center">
            <p className="text-text-muted">
              {errorMsg ?? 'Impossible de charger l\u2019analyse. Veuillez reessayer.'}
            </p>
            <div className="mt-4 flex flex-col items-center gap-2">
              <Button
                variant="secondary"
                size="md"
                onClick={() => window.location.reload()}
              >
                Réessayer
              </Button>
              {errorMsg?.includes('Pro et Business') && (
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => router.push('/pricing')}
                >
                  Voir les offres
                </Button>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Bottom action bar */}
      {analysis && tender && !loading && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1, type: 'spring', stiffness: 200, damping: 24 }}
          className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-bg-primary/90 backdrop-blur-lg safe-bottom"
        >
          <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
            <Button
              variant="ghost"
              size="md"
              onClick={() => router.back()}
              className="shrink-0"
            >
              Passer
            </Button>

            <Button
              variant="secondary"
              size="md"
              icon={<Bookmark className="size-4" />}
              loading={saving}
              onClick={handleSave}
              className="shrink-0"
            >
              Sauvegarder
            </Button>

            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={() => router.push(`/redaction/${id}`)}
            >
              Preparer ma soumission
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
