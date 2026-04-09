import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  try {
    const { data: submission, error } = await supabase
      .from('submissions')
      .select('*, tender:tenders(*)')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error || !submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    return NextResponse.json({ submission });
  } catch (err) {
    console.error('Error fetching submission:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  try {
    const { sections } = await request.json();

    if (!sections || !Array.isArray(sections)) {
      return NextResponse.json({ error: 'sections array is required' }, { status: 400 });
    }

    const { data: submission, error } = await supabase
      .from('submissions')
      .update({
        sections: sections as unknown as Record<string, unknown>[],
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select('*, tender:tenders(*)')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    return NextResponse.json({ submission });
  } catch (err) {
    console.error('Error updating submission:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
