import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const id = request.nextUrl.searchParams.get("id");

    if (id) {
      const { data, error } = await supabase
        .from("tenders")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
      return NextResponse.json(data);
    }

    // Fetch tenders, sort by analysis score if available
    const { data, error } = await supabase
      .from("tenders")
      .select("*")
      .order("publication_date", { ascending: false })
      .limit(100);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Sort by relevance score (from raw_data.analysis) descending
    const sorted = (data ?? []).sort((a, b) => {
      const scoreA = (a.raw_data as Record<string, unknown>)?.analysis
        ? ((a.raw_data as Record<string, { relevance_score?: number }>).analysis?.relevance_score ?? 0)
        : 0;
      const scoreB = (b.raw_data as Record<string, unknown>)?.analysis
        ? ((b.raw_data as Record<string, { relevance_score?: number }>).analysis?.relevance_score ?? 0)
        : 0;
      return scoreB - scoreA;
    });

    return NextResponse.json(sorted);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur serveur";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
