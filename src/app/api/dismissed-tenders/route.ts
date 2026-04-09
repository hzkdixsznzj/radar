import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { tender_id } = await request.json();

    if (!tender_id) {
      return NextResponse.json({ error: 'tender_id is required' }, { status: 400 });
    }

    // Check if already dismissed
    const { data: existing } = await supabase
      .from('dismissed_tenders')
      .select('id')
      .eq('user_id', user.id)
      .eq('tender_id', tender_id)
      .single();

    if (existing) {
      return NextResponse.json({ success: true });
    }

    const { error } = await supabase
      .from('dismissed_tenders')
      .insert({
        user_id: user.id,
        tender_id,
      });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err) {
    console.error('Error dismissing tender:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
