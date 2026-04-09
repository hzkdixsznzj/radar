'use client';

import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown,
  Bold,
  Italic,
  List,
  RefreshCw,
  Pencil,
  Check,
} from 'lucide-react';
import clsx from 'clsx';
import type { SubmissionSection } from '@/types/database';

export interface SectionEditorProps {
  section: SubmissionSection;
  onUpdate: (section: SubmissionSection) => void;
  onRegenerate: (sectionId: string) => Promise<void>;
}

export function SectionEditor({
  section,
  onUpdate,
  onRegenerate,
}: SectionEditorProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [editing, setEditing] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [saved, setSaved] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  const execCommand = useCallback((command: string) => {
    document.execCommand(command, false);
    contentRef.current?.focus();
  }, []);

  const handleContentChange = useCallback(() => {
    if (!contentRef.current) return;
    const html = contentRef.current.innerHTML;
    onUpdate({ ...section, content: html });
    setSaved(false);
  }, [section, onUpdate]);

  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onUpdate({ ...section, title: e.target.value });
      setSaved(false);
    },
    [section, onUpdate],
  );

  const handleRegenerate = useCallback(async () => {
    setRegenerating(true);
    try {
      await onRegenerate(section.id);
    } finally {
      setRegenerating(false);
    }
  }, [section.id, onRegenerate]);

  const toggleEdit = useCallback(() => {
    if (editing) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
    setEditing((prev) => !prev);
  }, [editing]);

  return (
    <motion.div
      layout
      className="rounded-xl border border-border bg-bg-card overflow-hidden"
    >
      {/* Section header */}
      <div className="flex items-center gap-3 p-4 border-b border-border">
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="shrink-0 text-text-muted hover:text-text-primary transition-colors cursor-pointer"
          aria-label={collapsed ? 'Ouvrir la section' : 'Fermer la section'}
        >
          <ChevronDown
            className={clsx(
              'size-5 transition-transform duration-200',
              collapsed && '-rotate-90',
            )}
          />
        </button>

        {editing ? (
          <input
            ref={titleRef}
            type="text"
            value={section.title}
            onChange={handleTitleChange}
            className="flex-1 bg-bg-input rounded-lg px-3 py-1.5 text-sm font-semibold text-text-primary border border-border focus:border-accent-blue focus:outline-none transition-colors"
          />
        ) : (
          <h3 className="flex-1 font-semibold text-text-primary font-display text-sm">
            {section.title}
          </h3>
        )}

        <div className="flex items-center gap-1.5">
          {saved && (
            <motion.span
              initial={{ opacity: 0, x: 5 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              className="text-xs text-accent-green flex items-center gap-1"
            >
              <Check className="size-3" />
            </motion.span>
          )}
          <button
            type="button"
            onClick={toggleEdit}
            className={clsx(
              'size-8 flex items-center justify-center rounded-lg transition-colors cursor-pointer',
              editing
                ? 'bg-accent-blue text-white'
                : 'text-text-muted hover:text-text-primary hover:bg-bg-card-hover',
            )}
            aria-label={editing ? 'Terminer la modification' : 'Modifier'}
          >
            {editing ? <Check className="size-4" /> : <Pencil className="size-4" />}
          </button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
          >
            {/* Formatting toolbar */}
            {editing && (
              <div className="flex items-center gap-1 px-4 py-2 border-b border-border bg-bg-primary/50">
                <button
                  type="button"
                  onClick={() => execCommand('bold')}
                  className="size-8 flex items-center justify-center rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-card-hover transition-colors cursor-pointer"
                  aria-label="Gras"
                >
                  <Bold className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => execCommand('italic')}
                  className="size-8 flex items-center justify-center rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-card-hover transition-colors cursor-pointer"
                  aria-label="Italique"
                >
                  <Italic className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => execCommand('insertUnorderedList')}
                  className="size-8 flex items-center justify-center rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-card-hover transition-colors cursor-pointer"
                  aria-label="Liste"
                >
                  <List className="size-4" />
                </button>

                <div className="flex-1" />

                <button
                  type="button"
                  onClick={handleRegenerate}
                  disabled={regenerating}
                  className={clsx(
                    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer',
                    'text-accent-blue hover:bg-accent-blue-soft',
                    'disabled:opacity-50 disabled:pointer-events-none',
                  )}
                >
                  <RefreshCw
                    className={clsx('size-3.5', regenerating && 'animate-spin')}
                  />
                  {regenerating ? 'Regene...' : 'Regenerer cette section'}
                </button>
              </div>
            )}

            {/* Content area */}
            <div className="p-4">
              {editing ? (
                <div
                  ref={contentRef}
                  contentEditable
                  suppressContentEditableWarning
                  onInput={handleContentChange}
                  dangerouslySetInnerHTML={{ __html: section.content }}
                  className={clsx(
                    'min-h-[120px] text-sm text-text-secondary leading-relaxed',
                    'prose prose-invert max-w-none',
                    'focus:outline-none',
                    '[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5',
                    '[&_b]:text-text-primary [&_strong]:text-text-primary',
                  )}
                />
              ) : (
                <div
                  dangerouslySetInnerHTML={{ __html: section.content }}
                  className={clsx(
                    'text-sm text-text-secondary leading-relaxed',
                    '[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5',
                    '[&_b]:text-text-primary [&_strong]:text-text-primary',
                  )}
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
