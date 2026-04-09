import { createServiceClient } from "../lib/supabase";
import { analyzeTender } from "../lib/claude";
import type { Profile, Tender } from "../lib/types";

async function main() {
  const supabase = createServiceClient();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data: tenders, error: tendersErr } = await supabase
    .from("tenders")
    .select("*")
    .gte("created_at", today.toISOString())
    .order("publication_date", { ascending: false });

  if (tendersErr) throw new Error(`Failed to fetch tenders: ${tendersErr.message}`);
  if (!tenders?.length) {
    console.log("[analyze] No new tenders to analyze today.");
    return;
  }

  console.log(`[analyze] Found ${tenders.length} tenders to analyze`);

  const { data: profiles, error: profilesErr } = await supabase
    .from("profiles")
    .select("*")
    .not("specialties", "is", null);

  if (profilesErr) throw new Error(`Failed to fetch profiles: ${profilesErr.message}`);
  if (!profiles?.length) {
    console.log("[analyze] No active profiles found.");
    return;
  }

  console.log(`[analyze] Analyzing for ${profiles.length} profiles`);

  let created = 0;
  let skipped = 0;

  for (const tender of tenders as Tender[]) {
    for (const profile of profiles as Profile[]) {
      const { data: existing } = await supabase
        .from("analyses")
        .select("id")
        .eq("tender_id", tender.id)
        .eq("profile_id", profile.id)
        .single();

      if (existing) {
        skipped++;
        continue;
      }

      console.log(
        `[analyze] Analyzing tender "${tender.title.slice(0, 50)}..." for ${profile.company_name ?? profile.id}`
      );

      const result = await analyzeTender(profile, tender);

      const { error: insertErr } = await supabase.from("analyses").insert({
        tender_id: tender.id,
        profile_id: profile.id,
        relevance_score: result.relevance_score,
        summary: result.summary,
        why_relevant: result.why_relevant,
        recommended_action: result.recommended_action,
        estimated_margin: result.estimated_margin,
        competition_level: result.competition_level,
        status: "new",
      });

      if (insertErr) {
        console.error(`[analyze] Insert error:`, insertErr.message);
      } else {
        created++;
      }

      await new Promise((r) => setTimeout(r, 200));
    }
  }

  console.log(
    `[analyze] Done. Created: ${created}, Skipped (existing): ${skipped}`
  );
}

main().catch((err) => {
  console.error("[analyze] Fatal error:", err);
  process.exit(1);
});
