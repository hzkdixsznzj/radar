// ---------------------------------------------------------------------------
// Sentry-lite — minimal error reporting via the Sentry envelope HTTP API
// ---------------------------------------------------------------------------
//
// We don't pull in the full @sentry/nextjs SDK (~250KB bundle increase,
// auto-instrumentation we don't need yet, breakage with Next 16 turbopack
// builds). Instead, a 30-line wrapper that POSTs an event envelope when
// a SENTRY_DSN env var is configured. Deliberately fire-and-forget — if
// Sentry is unreachable, our route still succeeds.
//
// Use:
//   try { … } catch (err) { reportError(err, { route: 'analyze' }); throw; }
//
// Set SENTRY_DSN in Vercel env vars to enable. Without it, this is a no-op.
// ---------------------------------------------------------------------------

interface DsnParts {
  publicKey: string;
  host: string;
  projectId: string;
}

function parseDsn(dsn: string): DsnParts | null {
  // https://<key>@<host>/<project>
  const m = dsn.match(/^https?:\/\/([^@]+)@([^/]+)\/(.+)$/);
  if (!m) return null;
  return { publicKey: m[1], host: m[2], projectId: m[3] };
}

interface ErrorContext {
  route?: string;
  user_id?: string;
  [k: string]: string | number | undefined;
}

export async function reportError(
  err: unknown,
  context: ErrorContext = {},
): Promise<void> {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return; // not configured → no-op

  const parts = parseDsn(dsn);
  if (!parts) return;

  const e = err as Error;
  const event = {
    event_id: crypto.randomUUID().replace(/-/g, ''),
    timestamp: Date.now() / 1000,
    platform: 'javascript',
    level: 'error',
    environment: process.env.VERCEL_ENV ?? 'development',
    release: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? 'dev',
    server_name: 'vercel',
    exception: {
      values: [
        {
          type: e?.name ?? 'Error',
          value: e?.message ?? String(err),
          stacktrace:
            typeof e?.stack === 'string'
              ? {
                  frames: e.stack
                    .split('\n')
                    .slice(1, 20)
                    .map((line) => ({ filename: line.trim() })),
                }
              : undefined,
        },
      ],
    },
    tags: context as Record<string, string | number>,
  };

  const url = `https://${parts.host}/api/${parts.projectId}/envelope/`;
  const auth = `Sentry sentry_version=7,sentry_client=radar/1,sentry_key=${parts.publicKey}`;
  const envelope =
    `${JSON.stringify({ event_id: event.event_id, sent_at: new Date().toISOString() })}\n` +
    `${JSON.stringify({ type: 'event' })}\n` +
    `${JSON.stringify(event)}\n`;

  // Fire-and-forget: don't block the route response on Sentry latency.
  fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-sentry-envelope',
      'X-Sentry-Auth': auth,
    },
    body: envelope,
  }).catch(() => {
    // Swallow — we're already in the error path; nothing to do.
  });
}
