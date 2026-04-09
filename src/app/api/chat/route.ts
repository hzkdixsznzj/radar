import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { chatWithAssistant } from '@/lib/ai/claude';

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { messages, tender_id } = await request.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'messages array is required' }, { status: 400 });
    }

    // Check subscription - requires pro or business
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single();

    const plan = subscription?.plan || 'free';

    if (plan === 'free') {
      return NextResponse.json(
        { error: 'AI assistant requires a Pro or Business subscription.' },
        { status: 403 }
      );
    }

    // Fetch user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // Optionally fetch tender context
    let tender = null;
    if (tender_id) {
      const { data: tenderData } = await supabase
        .from('tenders')
        .select('*')
        .eq('id', tender_id)
        .single();

      tender = tenderData;
    }

    // Call AI assistant
    const response = await chatWithAssistant(messages, {
      profile: profile || undefined,
      tender: tender || undefined,
    });

    return NextResponse.json({ response });
  } catch (err) {
    console.error('Error in chat:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
