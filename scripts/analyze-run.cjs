const { config } = require("dotenv");
config({ path: ".env.local", override: true });

const { createClient } = require("@supabase/supabase-js");
const Anthropic = require("@anthropic-ai/sdk");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const anthropic = new Anthropic();

const PROFILE = {
  specialties: ["hvac"],
  regions: ["wallonie"],
  provinces: ["hainaut"],
  min_amount: 10000,
  max_amount: 500000,
};

const SYSTEM_PROMPT = `Tu es un analyste business spécialisé en marchés publics belges pour les PME de construction et HVAC. Tu réponds UNIQUEMENT en JSON valide, sans markdown, sans backticks.`;

function buildPrompt(tender) {
  return `PROFIL DE L'ENTREPRISE :
- Spécialités : ${PROFILE.specialties.join(", ")}
- Régions : ${PROFILE.regions.join(", ")}
- Provinces : ${PROFILE.provinces.join(", ")}
- Budget marchés : ${PROFILE.min_amount}€ - ${PROFILE.max_amount}€

MARCHÉ PUBLIC À ANALYSER :
- Titre : ${tender.title}
- Adjudicateur : ${tender.buyer_name ?? "Non spécifié"}
- Localisation : ${tender.buyer_location ?? "Non spécifié"}
- Montant estimé : ${tender.estimated_value_min ?? "?"}€ - ${tender.estimated_value_max ?? "?"}€
- Deadline : ${tender.deadline ?? "Non spécifié"}
- Type de procédure : ${tender.procedure_type ?? "Non spécifié"}
- Codes CPV : ${(tender.cpv_codes ?? []).join(", ")}
- Description : ${(tender.description ?? "Non disponible").slice(0, 500)}

Réponds UNIQUEMENT en JSON valide :
{
  "relevance_score": <1-10>,
  "summary": "<résumé en 2 phrases max>",
  "why_relevant": "<pourquoi pertinent pour CE profil, 1-2 phrases>",
  "recommended_action": "<action concrète, 1-2 phrases>",
  "estimated_margin": "<marge en % ou 'non estimable'>",
  "competition_level": "<'low' | 'medium' | 'high'>"
}

Règles :
- Score 8-10 = match parfait spécialités ET zone géographique
- Score 5-7 = partiellement pertinent
- Score 1-4 = peu pertinent
- Si le montant est hors budget du profil, baisse le score`;
}

const DEFAULT_RESULT = {
  relevance_score: 3,
  summary: "Analyse indisponible.",
  why_relevant: "Impossible d'analyser automatiquement.",
  recommended_action: "Vérifier manuellement le cahier des charges.",
  estimated_margin: "non estimable",
  competition_level: "medium",
};

async function analyzeTender(tender) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 300,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: buildPrompt(tender) }],
      });

      const text = response.content[0].type === "text" ? response.content[0].text : "";
      const parsed = JSON.parse(text);
      parsed.relevance_score = Math.max(1, Math.min(10, parsed.relevance_score));
      return parsed;
    } catch (err) {
      if (err.status === 429 && attempt < 2) {
        const wait = (attempt + 1) * 3000;
        console.log(`  [rate-limit] Waiting ${wait / 1000}s...`);
        await new Promise((r) => setTimeout(r, wait));
        continue;
      }
      if (err instanceof SyntaxError) return DEFAULT_RESULT;
      if (attempt === 2) return DEFAULT_RESULT;
    }
  }
  return DEFAULT_RESULT;
}

async function main() {
  // Fetch tenders that don't have analysis yet
  const { data: tenders, error: tendersErr } = await supabase
    .from("tenders")
    .select("*")
    .order("publication_date", { ascending: false });

  if (tendersErr) throw new Error(`Failed to fetch tenders: ${tendersErr.message}`);

  const toAnalyze = tenders.filter(
    (t) => !t.raw_data?.analysis
  );

  console.log(`[analyze] ${toAnalyze.length} tenders to analyze (${tenders.length - toAnalyze.length} already done)`);
  console.log(`[analyze] Profile: HVAC | Wallonie/Hainaut | 10K-500K€\n`);

  let analyzed = 0;
  let errors = 0;

  for (let i = 0; i < toAnalyze.length; i++) {
    const tender = toAnalyze[i];
    const progress = `[${i + 1}/${toAnalyze.length}]`;
    console.log(`${progress} ${tender.title.slice(0, 70)}...`);

    const result = await analyzeTender(tender);
    console.log(`  → Score: ${result.relevance_score}/10 | ${result.competition_level} | ${result.summary.slice(0, 80)}`);

    // Store analysis in raw_data
    const updatedRawData = {
      ...(tender.raw_data ?? {}),
      analysis: result,
    };

    const { error: updateErr } = await supabase
      .from("tenders")
      .update({ raw_data: updatedRawData })
      .eq("id", tender.id);

    if (updateErr) {
      console.error(`  Error:`, updateErr.message);
      errors++;
    } else {
      analyzed++;
    }

    // Delay between API calls to avoid rate limits
    await new Promise((r) => setTimeout(r, 500));
  }

  // Score distribution
  const { data: all } = await supabase
    .from("tenders")
    .select("raw_data")
    .not("raw_data->analysis", "is", null);

  const scores = { "8-10 (pertinent)": 0, "5-7 (partiel)": 0, "1-4 (faible)": 0 };
  for (const t of all ?? []) {
    const s = t.raw_data?.analysis?.relevance_score ?? 0;
    if (s >= 8) scores["8-10 (pertinent)"]++;
    else if (s >= 5) scores["5-7 (partiel)"]++;
    else scores["1-4 (faible)"]++;
  }

  console.log(`\n[analyze] Done. Analyzed: ${analyzed}, Errors: ${errors}`);
  console.log("[analyze] Score distribution:", scores);
}

main().catch((err) => {
  console.error("[analyze] Fatal:", err);
  process.exit(1);
});
