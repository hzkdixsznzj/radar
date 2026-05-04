'use client';

// ---------------------------------------------------------------------------
// RichEditor — minimal HTML rich-text editor for the redaction page
// ---------------------------------------------------------------------------
//
// Why a custom component (vs. just a <textarea>):
//   The AI section generator (src/lib/ai/claude.ts) is told to produce
//   "texte riche en HTML simple (p, ul, li, strong, em)". With a plain
//   textarea the user saw the raw markup ("<p><strong>VFC MAINTENANCE</strong>
//   est une entreprise…") which looks broken even though it renders fine
//   in the PDF export. We keep the AI output as HTML (best PDF quality)
//   but display it through a contenteditable so the user sees rendered
//   bold/lists like a normal Word-style editor.
//
// Design constraints:
//   - Mount-once `dangerouslySetInnerHTML` to seed the initial content,
//     then never read `value` back into `innerHTML` — that would reset
//     the cursor on every keystroke. After mount, the source of truth is
//     the DOM; we read it via `onInput` and report HTML up via `onChange`.
//   - When the parent updates `value` from outside (AI regen result,
//     reset), we want the editor to pick up the new HTML. Use a `key`
//     prop on the consumer side, OR detect "value changed and we did NOT
//     emit it" by tracking the last emitted value.
// ---------------------------------------------------------------------------

import { useEffect, useRef } from 'react';
import clsx from 'clsx';

export interface RichEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
}

export function RichEditor({
  value,
  onChange,
  placeholder,
  className,
}: RichEditorProps) {
  const ref = useRef<HTMLDivElement>(null);
  const lastEmittedRef = useRef<string>(value);

  // External value change → resync DOM. We compare against the last value
  // *we* emitted so user keystrokes don't trigger a self-overwrite.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (value !== lastEmittedRef.current && value !== el.innerHTML) {
      el.innerHTML = value || '';
      lastEmittedRef.current = value;
    }
  }, [value]);

  // Seed initial content exactly once on mount. Subsequent updates come
  // from the effect above.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!el.innerHTML && value) {
      el.innerHTML = value;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      data-placeholder={placeholder}
      onInput={(e) => {
        const html = (e.currentTarget as HTMLDivElement).innerHTML;
        lastEmittedRef.current = html;
        onChange(html);
      }}
      className={clsx(
        'w-full min-h-[8rem] rounded-lg border border-border bg-bg-input px-3 py-2 text-sm text-text-primary',
        'transition-colors duration-150',
        'focus:outline-none focus:border-border-focus focus:ring-1 focus:ring-border-focus',
        // Render markup in a slightly readable way without bringing in
        // Tailwind Typography. Just enough so <p>/<ul>/<li>/<strong>/<em>
        // produce the expected layout.
        'prose-like',
        '[&_p]:my-1.5 [&_p]:leading-relaxed',
        '[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-1.5',
        '[&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-1.5',
        '[&_li]:my-0.5',
        '[&_strong]:font-semibold [&_strong]:text-text-primary',
        '[&_em]:italic',
        // Show placeholder when empty.
        'empty:before:text-text-muted empty:before:content-[attr(data-placeholder)]',
        className,
      )}
    />
  );
}
