import Anthropic from "@anthropic-ai/sdk";
import type { Profile, Tender, ClaudeAnalysisResult } from "./types";

const client = new Anthropic();

const SYSTEM_PROMPT = `Tu es un analyste business spécialisé en marchés publics belges pour les PME de construction et HVAC. Tu réponds UNIQUEMENT en JSON valide, sans markdown, sans backticks.`;

function buildAnalysisPrompt(profile: Profile, tender: Tender): string {
  return `PROFIL DE L'ENTREPRISE :
- Spécialités : ${profile.specialties.join(", ")}
- Régions : ${profile.regions.join(", ")}
- Provinces : ${profile.provinces.join(", ")}
- Budget marchés : ${profile.min_amount}€ - ${profile.max_amount}€

MARCHÉ PUBLIC À ANALYSER :
- Titre : ${tender.title}
- Adjudicateur : ${tender.buyer_name ?? "Non spécifié"}
- Localisation : ${tender.buyer_location ?? "Non spécifié"}
- Montant estimé : ${tender.estimated_value_min ?? "?"}€ - ${tender.estimated_value_max ?? "?"}€
- Deadline : ${tender.deadline ?? "Non spécifié"}
- Type de procédure : ${tender.procedure_type ?? "Non spécifié"}
- Codes CPV : ${tender.cpv_codes?.join(", ") ?? "Non spécifié"}
- Description : ${tender.description ?? "Non disponible"}

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

const DEFAULT_RESULT: ClaudeAnalysisResult = {
  relevance_score: 5,
  summary: "Analyse indisponible",
  why_relevant: "Impossible d'analyser ce marché automatiquement",
  recommended_action: "Vérifier manuellement le cahier des charges",
  estimated_margin: "non estimable",
  competition_level: "medium",
};

export async function analyzeTender(
  profile: Profile,
  tender: Tender
): Promise<ClaudeAnalysisResult> {
  const maxRetries = 3;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 300,
        system: SYSTEM_PROMPT,
        messages: [
          { role: "user", content: buildAnalysisPrompt(profile, tender) },
        ],
      });

      const text =
        response.content[0].type === "text" ? response.content[0].text : "";
      const parsed: ClaudeAnalysisResult = JSON.parse(text);

      if (parsed.relevance_score < 1 || parsed.relevance_score > 10) {
        parsed.relevance_score = Math.max(1, Math.min(10, parsed.relevance_score));
      }

      return parsed;
    } catch (error) {
      const isRateLimit =
        error instanceof Anthropic.RateLimitError ||
        (error instanceof Anthropic.APIError && error.status === 429);

      if (isRateLimit && attempt < maxRetries - 1) {
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      if (error instanceof SyntaxError) {
        return DEFAULT_RESULT;
      }

      if (attempt === maxRetries - 1) {
        return DEFAULT_RESULT;
      }
    }
  }

  return DEFAULT_RESULT;
}
