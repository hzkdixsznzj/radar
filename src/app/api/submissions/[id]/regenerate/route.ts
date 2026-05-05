import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { regenerateSection } from '@/lib/ai/claude';
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import type { SubmissionSection } from '@/types/database';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const limit = checkRateLimit(user.id, 'submission');
  if (!limit.ok) return rateLimitResponse(limit);

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

    // Find the section to regenerate. Match by EITHER section.id or
    // section.title — older submissions in the DB were saved with the
    // pre-fix AI-generated ids ("methodology", "references similaires"…)
    // while the frontend now uses the canonical template ids ("methodologie",
    // "references"…). Same fallback as buildInitialSections() in the
    // redaction page so the regenerate path stays compatible with both.
    const SECTION_ALIASES: Record<string, { ids: string[]; titles: string[] }> = {
      presentation: { ids: ['presentation', 'company'], titles: ["Présentation de l'entreprise"] },
      comprehension: { ids: ['comprehension', 'understanding'], titles: ['Compréhension du besoin'] },
      methodologie: {
        ids: ['methodologie', 'methodology'],
        titles: ['Méthodologie', 'Méthodologie proposée'],
      },
      planning: {
        ids: ['planning'],
        titles: ['Planning', "Planning d'exécution"],
      },
      references: {
        ids: ['references'],
        titles: ['Références', 'Références similaires'],
      },
    };
    const sections = submission.sections as unknown as SubmissionSection[];
    const aliases = SECTION_ALIASES[section_id];
    let section = sections.find((s) => s.id === section_id);
    if (!section && aliases) {
      section = sections.find(
        (s) => aliases.ids.includes(s.id) || aliases.titles.includes(s.title),
      );
    }

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

    // Update the section in the submission. Use the resolved `section.id`
    // (which may be a legacy id like "methodology") so the existing row
    // stays in place rather than getting duplicated.
    const updatedSections = sections.map((s) =>
      s.id === section.id ? { ...s, content: newContent } : s,
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
