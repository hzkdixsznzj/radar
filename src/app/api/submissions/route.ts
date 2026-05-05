import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { generateSubmission } from '@/lib/ai/claude';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { reportError } from '@/lib/sentry-lite';
import { PLANS } from '@/lib/stripe/config';
import type { SubscriptionPlan } from '@/types/database';

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { data: submissions, error } = await supabase
      .from('submissions')
      .select('*, tender:tenders(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ submissions });
  } catch (err) {
    console.error('Error fetching submissions:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const limit = checkRateLimit(user.id, 'submission');
  if (!limit.ok) return rateLimitResponse(limit);

  try {
    const { tender_id, saved_tender_id } = await request.json();

    if (!tender_id || !saved_tender_id) {
      return NextResponse.json(
        { error: 'tender_id and saved_tender_id are required' },
        { status: 400 }
      );
    }

    // Check subscription - requires pro or business
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single();

    const plan = (subscription?.plan || 'free') as SubscriptionPlan;

    if (plan === 'free') {
      return NextResponse.json(
        { error: 'Generating submissions requires a Pro or Business subscription.' },
        { status: 403 }
      );
    }

    // Check monthly submission limit
    const submissionsLimit = PLANS[plan].submissions_per_month;

    if (submissionsLimit !== -1 && subscription) {
      if (subscription.submissions_used >= submissionsLimit) {
        return NextResponse.json(
          { error: 'Monthly submissions limit reached. Upgrade your plan.' },
          { status: 403 }
        );
      }
    }

    // Fetch tender
    const { data: tender, error: tenderError } = await supabase
      .from('tenders')
      .select('*')
      .eq('id', tender_id)
      .single();

    if (tenderError || !tender) {
      return NextResponse.json({ error: 'Tender not found' }, { status: 404 });
    }

    // Fetch user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Profile not found. Complete onboarding first.' },
        { status: 400 }
      );
    }

    // Generate submission via AI
    const sections = await generateSubmission(tender, profile);

    // Save to database
    const { data: submission, error: insertError } = await supabase
      .from('submissions')
      .insert({
        user_id: user.id,
        tender_id,
        saved_tender_id,
        sections: sections as unknown as Record<string, unknown>[],
      })
      .select('*, tender:tenders(*)')
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // Update saved tender status
    await supabase
      .from('saved_tenders')
      .update({
        status: 'drafting',
        updated_at: new Date().toISOString(),
      })
      .eq('id', saved_tender_id)
      .eq('user_id', user.id);

    // Increment submissions_used
    if (subscription) {
      await supabase
        .from('subscriptions')
        .update({
          submissions_used: subscription.submissions_used + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', subscription.id);
    }

    return NextResponse.json({ submission }, { status: 201 });
  } catch (err) {
    console.error('Error generating submission:', err);
    reportError(err, { route: 'api/submissions' });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
