import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { analyzeTender } from '@/lib/ai/claude';

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { tender_id } = await request.json();

    if (!tender_id) {
      return NextResponse.json({ error: 'tender_id is required' }, { status: 400 });
    }

    // Check subscription - free users can't analyze
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single();

    const plan = subscription?.plan || 'free';

    if (plan === 'free') {
      return NextResponse.json(
        { error: 'AI analysis requires a Pro or Business subscription.' },
        { status: 403 }
      );
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

    // Run AI analysis
    const analysis = await analyzeTender(tender, profile);

    // Save analysis to saved_tenders
    const { data: savedTender } = await supabase
      .from('saved_tenders')
      .select('id')
      .eq('user_id', user.id)
      .eq('tender_id', tender_id)
      .single();

    if (savedTender) {
      await supabase
        .from('saved_tenders')
        .update({
          ai_analysis: analysis as unknown as Record<string, unknown>,
          status: 'analyzing',
          updated_at: new Date().toISOString(),
        })
        .eq('id', savedTender.id);
    }

    // Increment analyses_used in subscription
    if (subscription) {
      await supabase
        .from('subscriptions')
        .update({
          analyses_used: subscription.analyses_used + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', subscription.id);
    }

    return NextResponse.json({ analysis });
  } catch (err) {
    console.error('Error analyzing tender:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
