import { createServiceClient } from "../lib/supabase";
import { initVapid, sendPushNotification } from "../lib/push";
import type { Profile } from "../lib/types";

async function main() {
  initVapid();
  const supabase = createServiceClient();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data: profiles, error: profilesErr } = await supabase
    .from("profiles")
    .select("*")
    .not("push_subscription", "is", null);

  if (profilesErr) throw new Error(`Failed to fetch profiles: ${profilesErr.message}`);
  if (!profiles?.length) {
    console.log("[notify] No profiles with push subscriptions.");
    return;
  }

  let sent = 0;
  let failed = 0;

  for (const profile of profiles as Profile[]) {
    const { data: analyses, error: analysesErr } = await supabase
      .from("analyses")
      .select("*, tenders(*)")
      .eq("profile_id", profile.id)
      .gte("relevance_score", 7)
      .gte("created_at", today.toISOString())
      .order("relevance_score", { ascending: false });

    if (analysesErr || !analyses?.length) continue;

    const count = analyses.length;
    const best = analyses[0] as { tenders: { title: string } };

    const payload = {
      title: `${count} nouvelle${count > 1 ? "s" : ""} opportunité${count > 1 ? "s" : ""}`,
      body: `Dont 1 à haute pertinence : ${best.tenders.title.slice(0, 80)}`,
      url: "/feed",
    };

    const success = await sendPushNotification(
      profile.push_subscription!,
      payload
    );

    if (success) {
      sent++;
    } else {
      await supabase
        .from("profiles")
        .update({ push_subscription: null })
        .eq("id", profile.id);
      failed++;
    }
  }

  console.log(`[notify] Done. Sent: ${sent}, Failed/expired: ${failed}`);
}

main().catch((err) => {
  console.error("[notify] Fatal error:", err);
  process.exit(1);
});
