import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { regenerateSection } from '@/lib/ai/claude';
import type { SubmissionSection } from '@/types/database';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  try {
    const { section_id, instruction } = await request.json();

    if (!section_id) {
      return NextResponse.json({ error: 'section_id is required' }, { status: 400 });
    }

    // Fetch submission
    const { data: submission, error: subError } = await supabase
      .from('submissions')
      .select('*, tender:tenders(*)')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (subError || !submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    // Find the section to regenerate
    const sections = submission.sections as unknown as SubmissionSection[];
    const section = sections.find((s) => s.id === section_id);

    if (!section) {
      return NextResponse.json({ error: 'Section not found' }, { status: 404 });
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

    const tender = submission.tender;
    if (!tender) {
      return NextResponse.json({ error: 'Associated tender not found' }, { status: 404 });
    }

    // Regenerate the section
    const newContent = await regenerateSection(section, tender, profile, instruction);

    // Update the section in the submission
    const updatedSections = sections.map((s) =>
      s.id === section_id ? { ...s, content: newContent } : s
    );

    const { data: updatedSubmission, error: updateError } = await supabase
      .from('submissions')
      .update({
        sections: updatedSections as unknown as Record<string, unknown>[],
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select('*, tender:tenders(*)')
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      submission: updatedSubmission,
      regenerated_section: { ...section, content: newContent },
    });
  } catch (err) {
    console.error('Error regenerating section:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
