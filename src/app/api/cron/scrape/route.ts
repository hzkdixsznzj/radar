import { NextRequest, NextResponse } from 'next/server';
import { scrapeTED } from '@/lib/scrapers/ted-scraper';
import { scrapeBE } from '@/lib/scrapers/be-scraper';

// Cron jobs must always run fresh — never serve a cached response.
export const dynamic = 'force-dynamic';
// Scraping TED + upserting ~350 rows can exceed the default 10s Vercel timeout.
export const maxDuration = 300;

/**
 * Scheduled scan: fetches the latest Belgian tenders from TED (and from the
 * Belgian Bulletin when a working source becomes available) and upserts them
 * into Supabase.
 *
 * Called by the Vercel cron defined in `vercel.json` every 4 hours.
 *
 * Auth:
 *   - Production: `Authorization: Bearer ${CRON_SECRET}` is required. Vercel
 *     automatically sends this header on cron invocations when the env var
 *     is configured in the project.
 *   - Development: if `CRON_SECRET` is unset, requests are allowed (so
 *     `curl localhost:3000/api/cron/scrape` works out of the box).
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const isProd = process.env.NODE_ENV === 'production';

  if (isProd && !secret) {
    console.error('[cron/scrape] CRON_SECRET is not set in production — refusing.');
    return NextResponse.json(
      { ok: false, error: 'Server misconfigured: CRON_SECRET missing.' },
      { status: 500 },
    );
  }

  if (secret) {
    const provided = request.headers.get('authorization');
    if (provided !== `Bearer ${secret}`) {
      return NextResponse.json(
        { ok: false, error: 'Unauthorized' },
        { status: 401 },
      );
    }
  }

  const start = Date.now();
  let tedCount = 0;
  let beCount = 0;
  const errors: Record<string, string> = {};

  try {
    tedCount = await scrapeTED();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[cron/scrape] TED scrape failed:', msg);
    errors.ted = msg;
  }

  try {
    beCount = await scrapeBE();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[cron/scrape] BE scrape failed:', msg);
    errors.be = msg;
  }

  const elapsedMs = Date.now() - start;
  const ok = Object.keys(errors).length === 0;

  const body: {
    ok: boolean;
    ted: number;
    be: number;
    elapsedMs: number;
    errors?: Record<string, string>;
  } = { ok, ted: tedCount, be: beCount, elapsedMs };
  if (!ok) body.errors = errors;

  return NextResponse.json(body, { status: ok ? 200 : 500 });
}
