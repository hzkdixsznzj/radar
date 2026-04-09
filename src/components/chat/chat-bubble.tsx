'use client';

import { useState, useRef, useEffect, useCallback, type FormEvent } from 'react';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Loader2 } from 'lucide-react';
import clsx from 'clsx';

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

const WELCOME_MESSAGE: Message = {
  id: 'welcome',
  role: 'assistant',
  content:
    'Bonjour ! Je suis votre assistant Radar. Je peux vous aider \u00e0 comprendre les march\u00e9s publics, analyser des opportunit\u00e9s, ou modifier vos filtres. Comment puis-je vous aider ?',
};

const QUICK_SUGGESTIONS = [
  'Expliquer ce march\u00e9',
  'Modifier mes filtres',
  'Aide \u00e0 la r\u00e9daction',
];

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

/* -------------------------------------------------------------------------- */
/*  Chat Bubble + Panel                                                       */
/* -------------------------------------------------------------------------- */

export function ChatBubble() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPulse, setShowPulse] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pathname = usePathname();

  // Extract tender_id from URL if on analysis page
  const tenderId = pathname.startsWith('/tender/')
    ? pathname.split('/tender/')[1]?.split('/')[0] ?? null
    : null;

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Focus input when opening
  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
      setShowPulse(false);
    }
  }, [open]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || loading) return;

      const userMsg: Message = { id: uid(), role: 'user', content: text.trim() };
      setMessages((prev) => [...prev, userMsg]);
      setInput('');
      setLoading(true);

      try {
        const body: Record<string, unknown> = {
          messages: [...messages.filter((m) => m.id !== 'welcome'), userMsg].map(
            ({ role, content }) => ({ role, content }),
          ),
        };
        if (tenderId) body.tender_id = tenderId;

        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        if (!res.ok) throw new Error('Chat request failed');

        const data = (await res.json()) as { reply: string };
        setMessages((prev) => [
          ...prev,
          { id: uid(), role: 'assistant', content: data.reply },
        ]);
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            id: uid(),
            role: 'assistant',
            content:
              'D\u00e9sol\u00e9, une erreur est survenue. Veuillez r\u00e9essayer.',
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [messages, loading, tenderId],
  );

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <>
      {/* ------------------------------------------------------------------ */}
      {/*  Floating bubble                                                   */}
      {/* ------------------------------------------------------------------ */}
      <AnimatePresence>
        {!open && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            onClick={() => setOpen(true)}
            aria-label="Ouvrir le chat assistant"
            className={clsx(
              'fixed right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full',
              'bg-accent-blue text-white shadow-lg shadow-accent-blue/30',
              'cursor-pointer transition-shadow hover:shadow-accent-blue/50',
              // Above bottom nav on mobile
              'bottom-20 md:bottom-6',
            )}
          >
            <MessageCircle className="h-6 w-6" />
            {/* Pulse ring */}
            {showPulse && (
              <span className="absolute inset-0 animate-ping rounded-full bg-accent-blue/40" />
            )}
          </motion.button>
        )}
      </AnimatePresence>

      {/* ------------------------------------------------------------------ */}
      {/*  Chat panel                                                        */}
      {/* ------------------------------------------------------------------ */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className={clsx(
              'fixed z-50 flex flex-col overflow-hidden rounded-2xl border border-border bg-bg-primary shadow-2xl',
              // Mobile: full screen minus status bar
              'inset-x-0 bottom-0 top-[env(safe-area-inset-top)] rounded-b-none',
              // Desktop: anchored bottom-right
              'md:inset-auto md:right-4 md:bottom-6 md:h-[600px] md:w-[400px] md:rounded-2xl',
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-blue">
                  <MessageCircle className="h-4 w-4 text-white" />
                </div>
                <span className="font-[family-name:var(--font-display)] text-sm font-semibold text-text-primary">
                  Assistant Radar
                </span>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Fermer le chat"
                className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-bg-card hover:text-text-primary"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4">
              <div className="flex flex-col gap-3">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={clsx(
                      'max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
                      msg.role === 'user'
                        ? 'ml-auto bg-accent-blue text-white'
                        : 'mr-auto bg-bg-card text-text-secondary',
                    )}
                  >
                    {msg.content}
                  </div>
                ))}

                {/* Typing indicator */}
                {loading && (
                  <div className="mr-auto flex items-center gap-1.5 rounded-2xl bg-bg-card px-4 py-3">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-text-muted [animation-delay:0ms]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-text-muted [animation-delay:150ms]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-text-muted [animation-delay:300ms]" />
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Quick suggestion chips (only show when few messages) */}
            {messages.length <= 1 && !loading && (
              <div className="flex flex-wrap gap-2 border-t border-border/50 px-4 py-3">
                {QUICK_SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => sendMessage(suggestion)}
                    className="rounded-full border border-border bg-bg-card px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:border-accent-blue hover:text-accent-blue"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}

            {/* Input area */}
            <form
              onSubmit={handleSubmit}
              className="flex items-center gap-2 border-t border-border px-4 py-3 safe-bottom"
            >
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Votre message..."
                disabled={loading}
                className={clsx(
                  'flex-1 rounded-xl border border-border bg-bg-input px-4 py-2.5 text-sm text-text-primary',
                  'placeholder:text-text-muted',
                  'focus:border-accent-blue focus:outline-none',
                  'disabled:opacity-50',
                )}
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                aria-label="Envoyer"
                className={clsx(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors',
                  'disabled:opacity-40 disabled:cursor-not-allowed',
                  input.trim() && !loading
                    ? 'bg-accent-blue text-white hover:bg-accent-blue/90'
                    : 'bg-bg-card text-text-muted',
                )}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
