/**
 * POST /api/demo
 *
 * Bootstraps the demo user in Supabase so a developer can then request a
 * magic link for `demo@radar.be` and sign in to a pre-populated account.
 *
 * Guard rails:
 *   - Only runs in dev (`NODE_ENV !== 'production'`) OR when
 *     `NEXT_PUBLIC_DEMO_MODE === 'true'`. Rejected with 403 otherwise.
 *   - Idempotent: if the user already exists, returns the existing id.
 *
 * The profile + subscription rows are created by the `on_auth_user_created`
 * trigger in supabase/migrations/001_initial_schema.sql, so we don't touch
 * them here beyond verifying existence.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { DEMO_USER, isDemoMode } from '@/lib/demo-mode';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(): Promise<NextResponse> {
  // --- Guard: production + demo off -> refuse ---------------------------
  const isProd = process.env.NODE_ENV === 'production';
  if (isProd && !isDemoMode()) {
    return NextResponse.json(
      { error: 'Demo endpoint disabled in production. Set NEXT_PUBLIC_DEMO_MODE=true.' },
      { status: 403 }
    );
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json(
      { error: 'Server missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.' },
      { status: 500 }
    );
  }

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    // 1. Try to create the demo user. If it already exists, Supabase returns
    //    an error we can detect and treat as success.
    let userId: string | null = null;

    const createRes = await admin.auth.admin.createUser({
      email: DEMO_USER.email,
      email_confirm: true,
    });

    if (createRes.error) {
      const code = (createRes.error as { code?: string; status?: number }).code;
      const status = (createRes.error as { code?: string; status?: number }).status;
      const alreadyExists =
        code === 'email_exists' ||
        status === 422 ||
        /already registered|already been registered|duplicate/i.test(
          createRes.error.message ?? ''
        );

      if (!alreadyExists) {
        return NextResponse.json(
          { error: `createUser failed: ${createRes.error.message}` },
          { status: 500 }
        );
      }

      // Look up existing user id by listing (admin.getUserByEmail is not
      // in all client versions; listUsers is stable).
      const list = await admin.auth.admin.listUsers();
      if (list.error) {
        return NextResponse.json(
          { error: `listUsers failed: ${list.error.message}` },
          { status: 500 }
        );
      }
      const existing = list.data.users.find(
        (u) => u.email?.toLowerCase() === DEMO_USER.email.toLowerCase()
      );
      if (!existing) {
        return NextResponse.json(
          { error: 'Demo user reported to exist but could not be found.' },
          { status: 500 }
        );
      }
      userId = existing.id;
    } else {
      userId = createRes.data.user?.id ?? null;
    }

    if (!userId) {
      return NextResponse.json({ error: 'No user id returned.' }, { status: 500 });
    }

    // 2. Sanity-check that the trigger produced a profile row. If the
    //    migration hasn't been applied, this will surface the problem early.
    const { data: profile } = await admin
      .from('profiles')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle();

    const { data: subscription } = await admin
      .from('subscriptions')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle();

    return NextResponse.json({
      ok: true,
      userId,
      email: DEMO_USER.email,
      profileExists: Boolean(profile),
      subscriptionExists: Boolean(subscription),
      note:
        'Request a magic link for this email on /login to sign in as the demo user. ' +
        'If profileExists is false, apply the initial migration (supabase/migrations/001_initial_schema.sql).',
    });
  } catch (err) {
    return NextResponse.json(
      { error: `Unhandled error: ${(err as Error).message}` },
      { status: 500 }
    );
  }
}
