// ---------------------------------------------------------------------------
// In-memory per-user rate limiting for AI endpoints
// ---------------------------------------------------------------------------
//
// Three different AI surfaces can blow up your Anthropic bill if abused:
//   - /api/analyze         (Sonnet, ~5K tokens/call)
//   - /api/submissions     (Sonnet, ~16K tokens/call)
//   - /api/tenders/[id]/parse-spec (Sonnet on PDF, ~30-150K tokens/call)
//
// We rate-limit each per-user with a fixed-window counter held in memory.
// In a serverless environment instances are short-lived but Vercel reuses
// the same worker for ~5 minutes, so the limiter is enough to stop a
// malicious user hitting "Lancer l'analyse IA" 1000×/min in a tab.
//
// For stricter guarantees (multi-instance, distributed), swap the Map for
// Upstash Redis later — the surface area is small enough that we ship the
// in-memory version now and harden later if abuse becomes real.
// ---------------------------------------------------------------------------

interface Bucket {
  count: number;
  resetAt: number; // ms epoch
}

interface LimitConfig {
  /** Window in seconds. */
  windowSec: number;
  /** Max calls per user per window. */
  maxCalls: number;
}

const BUCKETS: Map<string, Bucket> = new Map();

/** Limits tuned to non-abusive use. A real tendering SME runs maybe
 *  20-40 analyses + 5-10 submissions per day. The caps below leave
 *  3-5× headroom on a busy day while still capping single-tab spam. */
export const LIMITS: Record<string, LimitConfig> = {
  analyze: { windowSec: 60 * 60, maxCalls: 30 }, // 30/h
  submission: { windowSec: 60 * 60, maxCalls: 10 }, // 10/h
  parseSpec: { windowSec: 60 * 60, maxCalls: 5 }, // 5/h — most expensive call
  chat: { windowSec: 60, maxCalls: 20 }, // 20/min — chat is cheap but spammy
};

export interface RateLimitResult {
  ok: boolean;
  retryAfterSec?: number;
  remaining?: number;
}

/**
 * Check whether the user can proceed with this AI call. If they're under
 * the cap, increment the counter and return ok. Otherwise return ok=false
 * with a Retry-After hint.
 *
 * @param userId  Supabase auth user id (any opaque string scopes a bucket)
 * @param kind    Which limit family to apply (see LIMITS above)
 */
export function checkRateLimit(
  userId: string,
  kind: keyof typeof LIMITS,
): RateLimitResult {
  const cfg = LIMITS[kind];
  if (!cfg) return { ok: true };

  const key = `${userId}:${kind}`;
  const now = Date.now();
  const bucket = BUCKETS.get(key);

  if (!bucket || bucket.resetAt < now) {
    BUCKETS.set(key, { count: 1, resetAt: now + cfg.windowSec * 1000 });
    return { ok: true, remaining: cfg.maxCalls - 1 };
  }

  if (bucket.count >= cfg.maxCalls) {
    return {
      ok: false,
      retryAfterSec: Math.ceil((bucket.resetAt - now) / 1000),
    };
  }

  bucket.count++;
  return { ok: true, remaining: cfg.maxCalls - bucket.count };
}

/**
 * Format a 429 NextResponse with consistent headers + body.
 * Use directly from API routes:
 *   const limit = checkRateLimit(user.id, 'analyze');
 *   if (!limit.ok) return rateLimitResponse(limit);
 */
import { NextResponse } from 'next/server';
export function rateLimitResponse(result: RateLimitResult): NextResponse {
  const retry = result.retryAfterSec ?? 60;
  const minutes = Math.max(1, Math.round(retry / 60));
  return NextResponse.json(
    {
      error: 'rate_limit_exceeded',
      message: `Vous avez atteint le quota d'appels IA pour cette heure. Réessayez dans environ ${minutes} minute${minutes > 1 ? 's' : ''}.`,
      retry_after_sec: retry,
    },
    {
      status: 429,
      headers: { 'Retry-After': String(retry) },
    },
  );
}
