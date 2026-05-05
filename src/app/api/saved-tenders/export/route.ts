// ---------------------------------------------------------------------------
// GET /api/saved-tenders/export — CSV download of the user's saved tenders
// ---------------------------------------------------------------------------
//
// Belgian SMEs running tender pipelines often track them in Excel /
// Google Sheets in addition to (or instead of) our app. A one-click
// CSV export removes the friction of "I want this in my own tools".
// ---------------------------------------------------------------------------

import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

interface Tender {
  id: string;
  title: string;
  contracting_authority: string | null;
  region: string | null;
  tender_type: string;
  cpv_codes: string[] | null;
  estimated_value: number | null;
  currency: string | null;
  deadline: string | null;
  publication_date: string | null;
  documents_url: string | null;
}

interface Row {
  status: string;
  notes: string | null;
  created_at: string;
  tender: Tender | null;
}

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return '';
  const s = Array.isArray(v) ? v.join(';') : String(v);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: rows, error } = await supabase
    .from('saved_tenders')
    .select('status, notes, created_at, tender:tenders(*)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const headers = [
    'Date sauvegarde',
    'Statut',
    'Titre',
    'Adjudicateur',
    'Région',
    'Type',
    'CPV',
    'Budget estimé',
    'Devise',
    'Date limite',
    'Date publication',
    'URL annonce',
    'Notes',
  ];

  const lines: string[] = [headers.map(csvEscape).join(',')];
  for (const r of (rows ?? []) as unknown as Row[]) {
    const t = r.tender;
    lines.push(
      [
        r.created_at,
        r.status,
        t?.title ?? '',
        t?.contracting_authority ?? '',
        t?.region ?? '',
        t?.tender_type ?? '',
        t?.cpv_codes ?? [],
        t?.estimated_value ?? '',
        t?.currency ?? '',
        t?.deadline ?? '',
        t?.publication_date ?? '',
        t?.documents_url ?? '',
        r.notes ?? '',
      ]
        .map(csvEscape)
        .join(','),
    );
  }

  // Excel/Numbers prefer UTF-8 BOM for non-ASCII chars.
  const csv = '﻿' + lines.join('\n');
  const filename = `radar-marches-${new Date().toISOString().slice(0, 10)}.csv`;
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
