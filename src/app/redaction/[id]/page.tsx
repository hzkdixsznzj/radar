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
import { RichEditor } from '@/components/ui/rich-editor';
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
  const [exportingPdf, setExportingPdf] = useState(false);

  // ----------------------------------------------------- PDF export
  // Production-grade memoire technique. Layout designed to feel like a
  // tendering-agency template, not a generated form:
  //   - Cover page (1) — full-bleed brand block, 28pt tender title,
  //     subtitle, buyer block + soumissionnaire block at the bottom.
  //   - Sommaire (2) — TOC built in a second pass with the real page
  //     numbers of each section opener.
  //   - Per-section opener — large light-blue "01", "02"… number and
  //     the section title beneath, on a fresh page so each chapter has
  //     room to breathe.
  //   - Body — 11pt with generous line-height, bold/italic preserved,
  //     list bullets in brand colour, drop-shadow-free.
  //   - Footer on body pages — company name left, "Page X / Y" right.
  const handleExportPdf = useCallback(async () => {
    if (!data || !sections || exportingPdf) return;
    setExportingPdf(true);
    try {
      const { default: jsPDF } = await import('jspdf');
      const pdf = new jsPDF({ unit: 'pt', format: 'a4' });

      // ---- Resolve company name from the profile (fire-and-quick) ----
      // We don't preload the profile in this page's loader since most of
      // the editor doesn't need it; for the PDF we want it on the cover
      // and in the footer.
      let companyName = '';
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          const { data: prof } = await supabase
            .from('profiles')
            .select('company_name')
            .eq('user_id', user.id)
            .maybeSingle();
          companyName = (prof as { company_name?: string } | null)?.company_name ?? '';
        }
      } catch {
        /* non-fatal — fall back to a generic label */
      }

      // ---- Geometry & theme ----
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const M = { top: 96, bottom: 72, left: 64, right: 64 };
      const contentW = pageW - M.left - M.right;

      const C = {
        brand: [37, 99, 235] as [number, number, number],     // blue-600
        brandLight: [191, 219, 254] as [number, number, number],
        brandFaint: [239, 246, 255] as [number, number, number],
        text: [15, 23, 42] as [number, number, number],       // slate-900
        muted: [100, 116, 139] as [number, number, number],   // slate-500
        line: [226, 232, 240] as [number, number, number],    // slate-200
      };

      const tenderTitle = data.tender.title ?? 'Marché';
      const buyer = data.tender.contracting_authority ?? '';
      const reference = data.tender.external_id ?? '';
      const dateStr = new Date().toLocaleDateString('fr-BE', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });

      let y = M.top;

      // ---- Helpers ----
      const setColor = (c: [number, number, number]) =>
        pdf.setTextColor(c[0], c[1], c[2]);
      const setFill = (c: [number, number, number]) =>
        pdf.setFillColor(c[0], c[1], c[2]);
      const setDraw = (c: [number, number, number]) =>
        pdf.setDrawColor(c[0], c[1], c[2]);

      const ensureSpace = (need: number, addPageFn?: () => void) => {
        if (y + need > pageH - M.bottom) {
          pdf.addPage();
          if (addPageFn) addPageFn();
          y = M.top;
        }
      };

      const paintRunningHeader = () => {
        // Thin colored band at the very top.
        setFill(C.brand);
        pdf.rect(0, 0, pageW, 3, 'F');
        // Faint header text under the band — company on the left,
        // tender title abbreviated on the right.
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        setColor(C.muted);
        if (companyName) {
          pdf.text(companyName.toUpperCase(), M.left, 32);
        }
        const ttClipped =
          tenderTitle.length > 60 ? `${tenderTitle.slice(0, 58)}…` : tenderTitle;
        pdf.text(ttClipped, pageW - M.right, 32, { align: 'right' });
      };

      // ---- HTML parser → typed blocks (used by section bodies) ----
      type Run = { text: string; bold?: boolean; italic?: boolean };
      type Block =
        | { kind: 'paragraph'; runs: Run[] }
        | { kind: 'list-item'; runs: Run[]; ordered: boolean; index: number };

      const parseHtmlToBlocks = (html: string): Block[] => {
        const blocks: Block[] = [];
        const wrapper = document.createElement('div');
        wrapper.innerHTML = html;

        const collectRuns = (
          node: Node,
          ctx: { bold: boolean; italic: boolean },
          into: Run[],
        ) => {
          if (node.nodeType === Node.TEXT_NODE) {
            const t = (node.textContent ?? '').replace(/\s+/g, ' ');
            if (t) into.push({ text: t, bold: ctx.bold, italic: ctx.italic });
            return;
          }
          if (node.nodeType !== Node.ELEMENT_NODE) return;
          const el = node as HTMLElement;
          const tag = el.tagName.toLowerCase();
          const next = {
            bold: ctx.bold || tag === 'strong' || tag === 'b',
            italic: ctx.italic || tag === 'em' || tag === 'i',
          };
          el.childNodes.forEach((c) => collectRuns(c, next, into));
        };

        const walk = (root: Node) => {
          root.childNodes.forEach((node) => {
            if (node.nodeType !== Node.ELEMENT_NODE) {
              if (node.nodeType === Node.TEXT_NODE) {
                const t = (node.textContent ?? '').trim();
                if (t) blocks.push({ kind: 'paragraph', runs: [{ text: t }] });
              }
              return;
            }
            const el = node as HTMLElement;
            const tag = el.tagName.toLowerCase();
            if (tag === 'ul' || tag === 'ol') {
              let i = 1;
              el.querySelectorAll(':scope > li').forEach((li) => {
                const runs: Run[] = [];
                li.childNodes.forEach((c) =>
                  collectRuns(c, { bold: false, italic: false }, runs),
                );
                if (runs.length) {
                  blocks.push({
                    kind: 'list-item',
                    runs,
                    ordered: tag === 'ol',
                    index: i,
                  });
                  i++;
                }
              });
            } else if (tag === 'br') {
              blocks.push({ kind: 'paragraph', runs: [{ text: '' }] });
            } else {
              const runs: Run[] = [];
              el.childNodes.forEach((c) =>
                collectRuns(c, { bold: false, italic: false }, runs),
              );
              if (runs.length) blocks.push({ kind: 'paragraph', runs });
            }
          });
        };

        walk(wrapper);
        return blocks;
      };

      // Render runs with word-wrap and per-run bold/italic switching.
      const drawRuns = (
        runs: Run[],
        opts: { size?: number; indent?: number; bullet?: string } = {},
      ) => {
        const size = opts.size ?? 11;
        const indent = opts.indent ?? 0;
        const xStart = M.left + indent;
        const lh = size * 1.6;

        ensureSpace(lh, paintRunningHeader);
        let xCursor = xStart;

        if (opts.bullet) {
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(size);
          setColor(C.brand);
          pdf.text(opts.bullet, xStart - 14, y);
        }

        for (const run of runs) {
          const style =
            run.bold && run.italic
              ? 'bolditalic'
              : run.bold
                ? 'bold'
                : run.italic
                  ? 'italic'
                  : 'normal';
          pdf.setFont('helvetica', style);
          pdf.setFontSize(size);
          setColor(C.text);

          const words = run.text.split(' ');
          for (let i = 0; i < words.length; i++) {
            const word = words[i] + (i < words.length - 1 ? ' ' : '');
            const w = pdf.getTextWidth(word);
            if (xCursor + w > M.left + contentW) {
              y += lh;
              ensureSpace(lh, paintRunningHeader);
              xCursor = xStart;
              if (word.startsWith(' ')) continue;
            }
            pdf.text(word, xCursor, y);
            xCursor += w;
          }
        }
        y += lh;
      };

      // ============================================================
      // PAGE 1 — Cover
      // ============================================================
      // Full-bleed brand block on the upper 60%.
      setFill(C.brand);
      pdf.rect(0, 0, pageW, pageH * 0.6, 'F');

      // Decorative ghost shapes — soft tint corner accents that hint at
      // a designed template rather than a default Word doc.
      setFill(C.brandLight);
      // Faint diagonal stripe top-right
      pdf.rect(pageW - 120, 0, 120, 6, 'F');
      pdf.rect(pageW - 60, 12, 60, 4, 'F');

      // Wordmark / mini-brand top-left.
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11);
      pdf.setTextColor(255, 255, 255);
      pdf.text('RADAR', M.left, 56);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      setColor(C.brandLight);
      pdf.text('Veille marchés publics', M.left + 50, 56);

      // Eyebrow — large light tracking
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11);
      setColor(C.brandLight);
      pdf.text('MÉMOIRE TECHNIQUE', M.left, 180);

      // Tender title — large.
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(28);
      pdf.setTextColor(255, 255, 255);
      const titleLines = pdf.splitTextToSize(tenderTitle, contentW) as string[];
      let coverY = 220;
      for (const line of titleLines.slice(0, 4)) {
        pdf.text(line, M.left, coverY);
        coverY += 34;
      }

      // Subtitle "Réponse à appel d'offres"
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(12);
      setColor(C.brandLight);
      pdf.text("Réponse à appel d'offres", M.left, coverY + 16);

      // Buyer — large but not as much as title.
      if (buyer) {
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(14);
        pdf.setTextColor(255, 255, 255);
        pdf.text(buyer, M.left, coverY + 44);
      }

      // ---- Lower 40% on white ----
      const lowerY = pageH * 0.6;

      // Soumissionnaire block (left half)
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8);
      setColor(C.muted);
      pdf.text('SOUMISSIONNAIRE', M.left, lowerY + 50);
      // Brand accent dot under the label
      setFill(C.brand);
      pdf.circle(M.left + 4, lowerY + 60, 2, 'F');

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(18);
      setColor(C.text);
      pdf.text(companyName || 'Soumissionnaire', M.left, lowerY + 84);

      // Date block (right half)
      const rightX = M.left + contentW / 2 + 20;
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8);
      setColor(C.muted);
      pdf.text('DATE DE REMISE', rightX, lowerY + 50);
      setFill(C.brand);
      pdf.circle(rightX + 4, lowerY + 60, 2, 'F');

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(13);
      setColor(C.text);
      pdf.text(dateStr, rightX, lowerY + 84);

      if (reference) {
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(8);
        setColor(C.muted);
        pdf.text('RÉFÉRENCE', rightX, lowerY + 120);
        setFill(C.brand);
        pdf.circle(rightX + 4, lowerY + 130, 2, 'F');

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(11);
        setColor(C.text);
        const refLines = pdf.splitTextToSize(reference, contentW / 2 - 20) as string[];
        let refY = lowerY + 154;
        for (const line of refLines.slice(0, 2)) {
          pdf.text(line, rightX, refY);
          refY += 14;
        }
      }

      // Cover footer
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      setColor(C.muted);
      pdf.text(
        'Document préparé avec Radar · radar-opal.vercel.app',
        pageW / 2,
        pageH - 36,
        { align: 'center' },
      );

      // ============================================================
      // PAGE 2 — Sommaire (rendered after the body in a second pass)
      // ============================================================
      pdf.addPage();
      // Stash this page index — we'll come back to it.
      const tocPageNumber = pdf.getNumberOfPages();
      // (intentionally blank for now)

      // ============================================================
      // Section openers + body
      // ============================================================
      const orderedSections = SECTION_TEMPLATES.map((tpl) => ({
        ...sections[tpl.id],
        templateOrder: tpl.order,
      }));
      type TocEntry = { number: string; title: string; page: number };
      const tocEntries: TocEntry[] = [];

      // Each section starts on its own page so each chapter feels intentional.
      let sectionIdx = 0;
      for (const section of orderedSections) {
        sectionIdx++;
        pdf.addPage();
        paintRunningHeader();
        const sectionStartPage = pdf.getNumberOfPages();
        const numberStr = String(sectionIdx).padStart(2, '0');
        tocEntries.push({
          number: numberStr,
          title: section.title,
          page: sectionStartPage,
        });

        // Big light-blue section number, bottom-aligned with the title.
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(72);
        setColor(C.brandLight);
        pdf.text(numberStr, M.left, M.top + 60);

        // Section title beneath — large, dark.
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(22);
        setColor(C.text);
        const titleW = pdf.splitTextToSize(section.title, contentW) as string[];
        let openerY = M.top + 100;
        for (const line of titleW) {
          pdf.text(line, M.left, openerY);
          openerY += 26;
        }

        // Brand divider under the heading
        setFill(C.brand);
        pdf.rect(M.left, openerY + 8, 40, 3, 'F');

        // Body starts a comfortable gap below the divider
        y = openerY + 44;

        // Section body — render parsed HTML blocks
        const blocks = parseHtmlToBlocks(section.content || '<p>—</p>');
        for (const block of blocks) {
          if (block.kind === 'paragraph') {
            drawRuns(block.runs, { size: 11 });
            y += 6;
          } else {
            drawRuns(block.runs, {
              size: 11,
              indent: 18,
              bullet: block.ordered ? `${block.index}.` : '•',
            });
          }
        }
      }

      // ============================================================
      // Sommaire — paint into the reserved page now that we know the
      // section start pages.
      // ============================================================
      pdf.setPage(tocPageNumber);
      paintRunningHeader();

      // Eyebrow + big "SOMMAIRE" header
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11);
      setColor(C.brand);
      pdf.text('TABLE DES MATIÈRES', M.left, M.top);

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(28);
      setColor(C.text);
      pdf.text('Sommaire', M.left, M.top + 30);

      // Brand accent bar
      setFill(C.brand);
      pdf.rect(M.left, M.top + 44, 40, 3, 'F');

      // Entries
      let tocY = M.top + 84;
      for (const entry of tocEntries) {
        // Section number (light blue, bold)
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(11);
        setColor(C.brand);
        pdf.text(entry.number, M.left, tocY);

        // Title — measured so we can compute leader-dot width.
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(12);
        setColor(C.text);
        const titleX = M.left + 36;
        pdf.text(entry.title, titleX, tocY);
        const titleWidth = pdf.getTextWidth(entry.title);

        // Leader dots
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(10);
        setColor(C.line);
        const dotsX = titleX + titleWidth + 6;
        const pageNumX = pageW - M.right - 18;
        const pageNumStr = String(entry.page);
        const pageNumW = pdf.getTextWidth(pageNumStr);
        const dotsEndX = pageNumX - pageNumW - 6;
        if (dotsEndX > dotsX) {
          // Print a row of dots between dotsX and dotsEndX
          const dotChar = '·';
          const dotW = pdf.getTextWidth(dotChar);
          const ndots = Math.max(3, Math.floor((dotsEndX - dotsX) / (dotW + 1)));
          let dx = dotsX;
          for (let i = 0; i < ndots; i++) {
            pdf.text(dotChar, dx, tocY);
            dx += dotW + 1;
          }
        }

        // Page number
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(11);
        setColor(C.text);
        pdf.text(pageNumStr, pageW - M.right, tocY, { align: 'right' });

        tocY += 28;
      }

      // ---- Footer + page numbers (skip the cover) ----
      // Page 1 = cover (no footer). Page 2 = TOC. Page 3+ = sections.
      // Body pages number from 1 (page 3 in absolute terms).
      const pageCount = pdf.getNumberOfPages();
      for (let p = 2; p <= pageCount; p++) {
        pdf.setPage(p);

        // Faint divider above the footer.
        setDraw(C.line);
        pdf.setLineWidth(0.5);
        pdf.line(M.left, pageH - 48, pageW - M.right, pageH - 48);

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        setColor(C.muted);
        const footerLeft = companyName
          ? `${companyName} · Mémoire technique`
          : 'Mémoire technique';
        pdf.text(footerLeft, M.left, pageH - 32);
        pdf.text(
          `Page ${p - 1} / ${pageCount - 1}`,
          pageW - M.right,
          pageH - 32,
          { align: 'right' },
        );
      }

      const safeTitle = tenderTitle
        .replace(/[^a-zA-Z0-9À-ſ-_ ]/g, '')
        .trim()
        .slice(0, 60);
      pdf.save(`Mémoire — ${safeTitle || 'soumission'}.pdf`);
    } catch (err) {
      console.error('PDF export failed:', err);
      window.print();
    } finally {
      setExportingPdf(false);
    }
  }, [data, sections, exportingPdf]);

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

                    <RichEditor
                      value={section.content}
                      onChange={(html) => updateSection(tpl.id, html)}
                      placeholder={`Rédigez votre ${tpl.title.toLowerCase()}…`}
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
              loading={exportingPdf}
              onClick={handleExportPdf}
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
