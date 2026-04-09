'use client';

import { useEffect, useState, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Download,
  FileText,
  FileDown,
  Save,
  Loader2,
  Menu,
  X,
} from 'lucide-react';
import clsx from 'clsx';

import { Button } from '@/components/ui/button';
import { SectionEditor } from '@/components/editor/section-editor';
import type { Submission, SubmissionSection, Tender } from '@/types/database';

/* ---------- loading state ---------- */
function GenerationSkeleton() {
  const steps = [
    'Analyse du cahier des charges...',
    'Structuration du memoire technique...',
    'Redaction des sections...',
    'Finalisation...',
  ];
  const [step, setStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStep((s) => (s < steps.length - 1 ? s + 1 : s));
    }, 3000);
    return () => clearInterval(interval);
  }, [steps.length]);

  return (
    <div className="flex flex-col items-center gap-8 py-16">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
      >
        <Loader2 className="size-12 text-accent-blue" />
      </motion.div>

      <div className="text-center space-y-2">
        <p className="text-lg font-semibold text-text-primary font-display">
          Generation du memoire technique...
        </p>
        <p className="text-sm text-text-muted">{steps[step]}</p>
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-xs">
        <div className="h-1.5 rounded-full bg-border overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-accent-blue"
            initial={{ width: '0%' }}
            animate={{ width: `${((step + 1) / steps.length) * 100}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        </div>
        <p className="mt-2 text-xs text-text-muted text-center">
          Etape {step + 1} / {steps.length}
        </p>
      </div>
    </div>
  );
}

/* ---------- sidebar table of contents ---------- */
function TableOfContents({
  sections,
  activeId,
  onSelect,
  open,
  onClose,
}: {
  sections: SubmissionSection[];
  activeId: string | null;
  onSelect: (id: string) => void;
  open: boolean;
  onClose: () => void;
}) {
  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ x: open ? 0 : '-100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className={clsx(
          'fixed left-0 top-0 bottom-0 z-50 w-72 bg-bg-card border-r border-border p-4 pt-16 overflow-y-auto',
          'lg:sticky lg:top-[57px] lg:z-0 lg:h-[calc(100dvh-57px)] lg:translate-x-0',
        )}
      >
        <div className="flex items-center justify-between mb-4 lg:hidden">
          <h2 className="font-semibold text-text-primary font-display text-sm">
            Table des matieres
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="size-8 flex items-center justify-center rounded-lg text-text-muted hover:text-text-primary cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </div>

        <h2 className="hidden lg:block font-semibold text-text-primary font-display text-sm mb-4">
          Table des matieres
        </h2>

        <nav className="space-y-1">
          {sections.map((section, i) => (
            <button
              key={section.id}
              type="button"
              onClick={() => {
                onSelect(section.id);
                onClose();
              }}
              className={clsx(
                'w-full text-left rounded-lg px-3 py-2 text-sm transition-colors cursor-pointer',
                activeId === section.id
                  ? 'bg-accent-blue-soft text-accent-blue font-medium'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-card-hover',
              )}
            >
              <span className="text-text-muted mr-2">{i + 1}.</span>
              {section.title}
            </button>
          ))}
        </nav>
      </motion.aside>
    </>
  );
}

/* ---------- main page ---------- */
export default function RedactionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [tender, setTender] = useState<Tender | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        // Fetch tender info
        const tenderRes = await fetch(`/api/tenders/${id}`);
        if (tenderRes.ok) {
          const tenderData: Tender = await tenderRes.json();
          if (!cancelled) setTender(tenderData);
        }

        // Fetch or generate submission
        const subRes = await fetch(`/api/submissions?tender_id=${id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tender_id: id }),
        });
        if (!subRes.ok) throw new Error('Submission load failed');
        const subData: Submission = await subRes.json();
        if (!cancelled) {
          setSubmission(subData);
          if (subData.sections.length > 0) {
            setActiveSection(subData.sections[0].id);
          }
          setLoading(false);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleSectionUpdate = useCallback(
    (updated: SubmissionSection) => {
      if (!submission) return;
      setSubmission({
        ...submission,
        sections: submission.sections.map((s) =>
          s.id === updated.id ? updated : s,
        ),
      });
    },
    [submission],
  );

  const handleRegenerate = useCallback(
    async (sectionId: string) => {
      if (!submission) return;
      const res = await fetch(`/api/submissions/${submission.id}/regenerate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section_id: sectionId }),
      });
      if (!res.ok) return;
      const updated: SubmissionSection = await res.json();
      setSubmission({
        ...submission,
        sections: submission.sections.map((s) =>
          s.id === updated.id ? updated : s,
        ),
      });
    },
    [submission],
  );

  async function handleSave() {
    if (!submission) return;
    setSaving(true);
    try {
      await fetch(`/api/submissions/${submission.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sections: submission.sections }),
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleExport(format: 'pdf' | 'word') {
    if (!submission) return;
    const res = await fetch(
      `/api/submissions/${submission.id}/export?format=${format}`,
    );
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `soumission-${id}.${format === 'pdf' ? 'pdf' : 'docx'}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function scrollToSection(sectionId: string) {
    setActiveSection(sectionId);
    const el = document.getElementById(`section-${sectionId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  return (
    <div className="min-h-dvh bg-bg-primary">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border bg-bg-primary/80 backdrop-blur-lg safe-top">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="shrink-0 size-9 flex items-center justify-center rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-card-hover transition-colors cursor-pointer lg:hidden"
            aria-label="Ouvrir le menu"
          >
            <Menu className="size-5" />
          </button>

          <button
            type="button"
            onClick={() => router.back()}
            className="shrink-0 size-9 items-center justify-center rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-card-hover transition-colors cursor-pointer hidden lg:flex"
            aria-label="Retour"
          >
            <ArrowLeft className="size-5" />
          </button>

          <div className="flex-1 min-w-0">
            <h1 className="truncate text-sm font-semibold text-text-primary font-display">
              {tender?.title ?? 'Memoire technique'}
            </h1>
            {tender && (
              <p className="text-xs text-text-muted truncate">
                {tender.contracting_authority}
              </p>
            )}
          </div>

          <Button
            variant="secondary"
            size="sm"
            icon={<Download className="size-4" />}
            onClick={() => handleExport('pdf')}
          >
            <span className="hidden sm:inline">Export</span>
          </Button>
        </div>
      </header>

      {loading ? (
        <main className="mx-auto max-w-2xl px-4">
          <GenerationSkeleton />
        </main>
      ) : submission ? (
        <div className="lg:flex">
          {/* Sidebar */}
          <TableOfContents
            sections={submission.sections}
            activeId={activeSection}
            onSelect={scrollToSection}
            open={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
          />

          {/* Main editor */}
          <main className="flex-1 mx-auto max-w-3xl px-4 pb-28 pt-6">
            <motion.div
              initial="hidden"
              animate="show"
              variants={{
                hidden: { opacity: 0 },
                show: {
                  opacity: 1,
                  transition: { staggerChildren: 0.06 },
                },
              }}
              className="space-y-4"
            >
              {submission.sections
                .sort((a, b) => a.order - b.order)
                .map((section) => (
                  <motion.div
                    key={section.id}
                    id={`section-${section.id}`}
                    variants={{
                      hidden: { opacity: 0, y: 12 },
                      show: { opacity: 1, y: 0 },
                    }}
                  >
                    <SectionEditor
                      section={section}
                      onUpdate={handleSectionUpdate}
                      onRegenerate={handleRegenerate}
                    />
                  </motion.div>
                ))}
            </motion.div>
          </main>
        </div>
      ) : (
        <main className="mx-auto max-w-2xl px-4 py-16 text-center">
          <p className="text-text-muted">
            Impossible de charger la soumission. Veuillez reessayer.
          </p>
          <Button
            variant="secondary"
            size="md"
            className="mt-4"
            onClick={() => window.location.reload()}
          >
            Reessayer
          </Button>
        </main>
      )}

      {/* Bottom action bar */}
      {submission && !loading && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5, type: 'spring', stiffness: 200, damping: 24 }}
          className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-bg-primary/90 backdrop-blur-lg safe-bottom"
        >
          <div className="flex items-center gap-3 px-4 py-3 max-w-3xl mx-auto">
            <Button
              variant="primary"
              size="md"
              fullWidth
              icon={<Save className="size-4" />}
              loading={saving}
              onClick={handleSave}
            >
              Sauvegarder
            </Button>

            <Button
              variant="secondary"
              size="md"
              icon={<FileDown className="size-4" />}
              onClick={() => handleExport('pdf')}
              className="shrink-0"
            >
              <span className="hidden sm:inline">PDF</span>
              <span className="sm:hidden">PDF</span>
            </Button>

            <Button
              variant="secondary"
              size="md"
              icon={<FileText className="size-4" />}
              onClick={() => handleExport('word')}
              className="shrink-0"
            >
              <span className="hidden sm:inline">Word</span>
              <span className="sm:hidden">Word</span>
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
