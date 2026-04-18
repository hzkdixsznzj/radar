// ---------------------------------------------------------------------------
// GET /auth/confirm — verifies the token_hash from email magic/invite links
// ---------------------------------------------------------------------------
//
// Recommended by Supabase for SSR + email-based auth:
//   https://supabase.com/docs/guides/auth/server-side/email-based-auth-with-pkce-flow-for-ssr
//
// The Supabase email templates point here with `?token_hash=XXX&type=email`.
// We validate via `verifyOtp({ token_hash, type })` — this is idempotent and
// doesn't depend on a PKCE `code_verifier` cookie surviving the external
// redirect (unlike the `?code=XXX` PKCE flow in `/auth/callback`).
//
// This is what fixes the "click link → bounces back to login form" loop
// that was happening with Gmail-style link-scanners and missing verifiers.
// ---------------------------------------------------------------------------

import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { EmailOtpType } from '@supabase/supabase-js';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const next = searchParams.get('next') ?? '/feed';

  if (!token_hash || !type) {
    console.warn('[auth/confirm] missing token_hash or type', {
      token_hash: !!token_hash,
      type,
    });
    return NextResponse.redirect(`${origin}/login?error=missing_token`);
  }

  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Component context — ignore
          }
        },
      },
    },
  );

  const { error } = await supabase.auth.verifyOtp({ type, token_hash });

  if (error) {
    console.warn('[auth/confirm] verifyOtp failed:', error.message);
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error.message)}`,
    );
  }

  // Session is now set on the cookie store. Decide where to send the user.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('onboarding_completed')
      .eq('user_id', user.id)
      .single();

    if (!profile || !profile.onboarding_completed) {
      return NextResponse.redirect(`${origin}/onboarding`);
    }
  }

  return NextResponse.redirect(`${origin}${next}`);
}
