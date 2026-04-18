'use client';

// ---------------------------------------------------------------------------
// /chat — full-page AI assistant
// ---------------------------------------------------------------------------
//
// The bottom nav links here. Previously this was a 404 because only the
// floating `<ChatBubble />` existed. The floating bubble is still fine for
// quick questions from any page; the full page is a calmer surface for
// longer conversations (and for pro/business users who want the assistant
// as a primary tool rather than a widget).
//
// Free tier: the backend returns 403 for /api/chat; we surface that as a
// soft paywall (upgrade CTA) so the page itself doesn't crash.
// ---------------------------------------------------------------------------

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { Loader2, MessageCircle, Send, Sparkles, Lock } from 'lucide-react';
import clsx from 'clsx';
import { BottomNav } from '@/components/layout/bottom-nav';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

const WELCOME: Message = {
  id: 'welcome',
  role: 'assistant',
  content:
    "Bonjour ! Je suis l'assistant IA de Radar. Pose-moi une question sur un marché, sur la réglementation belge, ou demande-moi de l'aide à la rédaction de ton mémoire technique.",
};

const QUICK_SUGGESTIONS = [
  'Explique-moi la procédure ouverte vs restreinte',
  'Quels sont les critères d\'attribution les plus courants ?',
  'Aide-moi à structurer un mémoire technique',
];

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [blocked, setBlocked] = useState(false); // free-tier 403
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const send = useCallback(
    async (text: string) => {
      if (!text.trim() || loading || blocked) return;

      const userMsg: Message = { id: uid(), role: 'user', content: text.trim() };
      setMessages((prev) => [...prev, userMsg]);
      setInput('');
      setLoading(true);

      try {
        const body = {
          messages: [...messages, userMsg]
            .filter((m) => m.id !== 'welcome')
            .map(({ role, content }) => ({ role, content })),
        };
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        if (res.status === 403) {
          setBlocked(true);
          return;
        }
        if (!res.ok) throw new Error('chat request failed');

        const data = (await res.json()) as { response?: string };
        setMessages((prev) => [
          ...prev,
          {
            id: uid(),
            role: 'assistant',
            content: data.response ?? '(réponse vide)',
          },
        ]);
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            id: uid(),
            role: 'assistant',
            content: 'Désolé, une erreur est survenue. Réessaie dans un instant.',
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [messages, loading, blocked],
  );

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    send(input);
  }

  return (
    <div className="flex min-h-dvh flex-col bg-bg-primary pb-20">
      {/* Header */}
      <header className="safe-top sticky top-0 z-10 border-b border-border bg-bg-primary/80 backdrop-blur-xl">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="flex size-9 items-center justify-center rounded-full bg-accent-blue">
            <MessageCircle className="size-4 text-white" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-text-primary font-[family-name:var(--font-display)]">
              Assistant Radar
            </h1>
            <p className="text-xs text-text-muted">
              Marchés publics belges · propulsé par Claude
            </p>
          </div>
        </div>
      </header>

      {/* Messages */}
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-3 px-4 py-5">
        {messages.map((m) => (
          <div
            key={m.id}
            className={clsx(
              'max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
              m.role === 'user'
                ? 'ml-auto bg-accent-blue text-white'
                : 'mr-auto bg-bg-card text-text-secondary',
            )}
          >
            {m.content}
          </div>
        ))}

        {loading && (
          <div className="mr-auto flex items-center gap-1.5 rounded-2xl bg-bg-card px-4 py-3">
            <span className="size-2 animate-bounce rounded-full bg-text-muted [animation-delay:0ms]" />
            <span className="size-2 animate-bounce rounded-full bg-text-muted [animation-delay:150ms]" />
            <span className="size-2 animate-bounce rounded-full bg-text-muted [animation-delay:300ms]" />
          </div>
        )}

        {/* Free-tier paywall */}
        {blocked && (
          <div className="mr-auto mt-2 flex max-w-[95%] flex-col gap-3 rounded-2xl border border-border bg-bg-card p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
              <Lock className="size-4 text-accent-blue" />
              Assistant IA réservé aux abonnements Pro & Business
            </div>
            <p className="text-sm text-text-muted">
              L&apos;assistant t&apos;aide à comprendre, analyser et rédiger pour
              chaque marché. Il est disponible dès le plan Pro.
            </p>
            <Link
              href="/pricing"
              className="inline-flex w-fit items-center gap-1.5 rounded-xl bg-accent-blue px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-blue/90"
            >
              <Sparkles className="size-4" />
              Voir les plans
            </Link>
          </div>
        )}

        <div ref={endRef} />
      </main>

      {/* Quick suggestions */}
      {messages.length <= 1 && !loading && !blocked && (
        <div className="mx-auto w-full max-w-2xl px-4 pb-3">
          <div className="flex flex-wrap gap-2">
            {QUICK_SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="rounded-full border border-border bg-bg-card px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:border-accent-blue hover:text-accent-blue"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <form
        onSubmit={onSubmit}
        className="sticky bottom-16 mx-auto flex w-full max-w-2xl items-center gap-2 border-t border-border bg-bg-primary/90 px-4 py-3 backdrop-blur-xl"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={blocked ? 'Assistant réservé aux abonnés…' : 'Ta question…'}
          disabled={loading || blocked}
          className={clsx(
            'flex-1 rounded-xl border border-border bg-bg-input px-4 py-2.5 text-sm text-text-primary',
            'placeholder:text-text-muted focus:border-accent-blue focus:outline-none',
            'disabled:opacity-50',
          )}
        />
        <button
          type="submit"
          disabled={!input.trim() || loading || blocked}
          aria-label="Envoyer"
          className={clsx(
            'flex size-10 shrink-0 items-center justify-center rounded-xl transition-colors',
            'disabled:cursor-not-allowed disabled:opacity-40',
            input.trim() && !loading && !blocked
              ? 'bg-accent-blue text-white hover:bg-accent-blue/90'
              : 'bg-bg-card text-text-muted',
          )}
        >
          {loading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Send className="size-4" />
          )}
        </button>
      </form>

      <BottomNav />
    </div>
  );
}
