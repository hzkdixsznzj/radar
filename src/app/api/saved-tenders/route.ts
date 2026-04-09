import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { PLANS } from '@/lib/stripe/config';
import type { SubscriptionPlan } from '@/types/database';

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { data: savedTenders, error } = await supabase
      .from('saved_tenders')
      .select('*, tender:tenders(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ saved_tenders: savedTenders });
  } catch (err) {
    console.error('Error fetching saved tenders:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { tender_id } = await request.json();

    if (!tender_id) {
      return NextResponse.json({ error: 'tender_id is required' }, { status: 400 });
    }

    // Check subscription limits for free tier
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single();

    const plan = (subscription?.plan || 'free') as SubscriptionPlan;
    const tendersLimit = PLANS[plan].tenders_per_month;

    if (tendersLimit !== -1) {
      // Count saved tenders this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { count } = await supabase
        .from('saved_tenders')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', startOfMonth.toISOString());

      if ((count || 0) >= tendersLimit) {
        return NextResponse.json(
          { error: 'Monthly saved tenders limit reached. Upgrade your plan.' },
          { status: 403 }
        );
      }
    }

    // Check if already saved
    const { data: existing } = await supabase
      .from('saved_tenders')
      .select('id')
      .eq('user_id', user.id)
      .eq('tender_id', tender_id)
      .single();

    if (existing) {
      return NextResponse.json({ error: 'Tender already saved' }, { status: 409 });
    }

    const { data: savedTender, error } = await supabase
      .from('saved_tenders')
      .insert({
        user_id: user.id,
        tender_id,
        status: 'new' as const,
        notes: null,
        ai_analysis: null,
      })
      .select('*, tender:tenders(*)')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ saved_tender: savedTender }, { status: 201 });
  } catch (err) {
    console.error('Error saving tender:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
