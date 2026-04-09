import Anthropic from '@anthropic-ai/sdk';
import type { Profile, Tender, AIAnalysis, SubmissionSection } from '@/types/database';

let _anthropic: Anthropic | null = null;

function getAnthropic(): Anthropic {
  if (!_anthropic) {
    _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  }
  return _anthropic;
}

export async function analyzeTender(
  tender: Tender,
  profile: Profile
): Promise<AIAnalysis> {
  const message = await getAnthropic().messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    messages: [
      {
        role: 'user',
        content: `Tu es un expert en marchés publics belges. Analyse ce marché pour cette entreprise.

PROFIL ENTREPRISE:
- Nom: ${profile.company_name}
- Secteurs: ${profile.sectors.join(', ')}
- Certifications: ${profile.certifications.join(', ')}
- Régions: ${profile.regions.join(', ')}
- Budget visé: ${profile.budget_ranges.join(', ')}
- Mots-clés: ${profile.keywords.join(', ')}
- Description: ${profile.company_description}

MARCHÉ PUBLIC:
- Titre: ${tender.title}
- Adjudicateur: ${tender.contracting_authority}
- Type: ${tender.tender_type}
- Région: ${tender.region}
- Codes CPV: ${tender.cpv_codes.join(', ')}
- Deadline: ${tender.deadline}
- Montant estimé: ${tender.estimated_value ? `${tender.estimated_value} ${tender.currency}` : 'Non communiqué'}
- Description complète: ${tender.full_text || tender.description}

Réponds en JSON strict avec cette structure exacte:
{
  "summary": "résumé en 5 lignes maximum, français simple",
  "relevance_reason": "pourquoi ce marché est pertinent pour CE profil",
  "attribution_criteria": ["critère 1", "critère 2"],
  "competition_level": "low" | "medium" | "high",
  "risks": ["risque 1", "risque 2"],
  "recommendation": "apply" | "watch" | "skip",
  "recommendation_reason": "justification de la recommandation",
  "suggested_price": "fourchette de prix conseillée ou null",
  "relevance_score": 0-100
}`,
      },
    ],
  });

  const text = message.content[0].type === 'text' ? message.content[0].text : '';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Failed to parse AI analysis');
  return JSON.parse(jsonMatch[0]) as AIAnalysis;
}

export async function generateSubmission(
  tender: Tender,
  profile: Profile
): Promise<SubmissionSection[]> {
  const message = await getAnthropic().messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4000,
    messages: [
      {
        role: 'user',
        content: `Tu es un expert en rédaction de soumissions de marchés publics belges. Génère un mémoire technique complet.

PROFIL ENTREPRISE:
- Nom: ${profile.company_name}
- Secteurs: ${profile.sectors.join(', ')}
- Certifications: ${profile.certifications.join(', ')}
- Régions: ${profile.regions.join(', ')}
- Description: ${profile.company_description}

MARCHÉ:
- Titre: ${tender.title}
- Adjudicateur: ${tender.contracting_authority}
- Type: ${tender.tender_type}
- Description: ${tender.full_text || tender.description}

Génère un mémoire technique avec ces sections. Réponds en JSON strict:
[
  {"id": "company", "title": "Présentation de l'entreprise", "content": "...", "order": 1},
  {"id": "understanding", "title": "Compréhension du besoin", "content": "...", "order": 2},
  {"id": "methodology", "title": "Méthodologie proposée", "content": "...", "order": 3},
  {"id": "planning", "title": "Planning d'exécution", "content": "...", "order": 4},
  {"id": "resources", "title": "Moyens humains et matériels", "content": "...", "order": 5},
  {"id": "references", "title": "Références similaires", "content": "...", "order": 6}
]

Chaque section doit contenir du texte riche en HTML simple (p, ul, li, strong, em). Utilise les infos du profil entreprise.`,
      },
    ],
  });

  const text = message.content[0].type === 'text' ? message.content[0].text : '';
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error('Failed to parse submission');
  return JSON.parse(jsonMatch[0]) as SubmissionSection[];
}

export async function chatWithAssistant(
  messages: { role: 'user' | 'assistant'; content: string }[],
  context: { profile?: Profile; tender?: Tender }
): Promise<string> {
  const systemPrompt = `Tu es l'assistant IA de Radar, une plateforme de veille des marchés publics belges. Tu aides les PME à comprendre et répondre aux appels d'offres.

${context.profile ? `PROFIL UTILISATEUR:
- Entreprise: ${context.profile.company_name}
- Secteurs: ${context.profile.sectors.join(', ')}
- Certifications: ${context.profile.certifications.join(', ')}
- Régions: ${context.profile.regions.join(', ')}` : ''}

${context.tender ? `MARCHÉ EN COURS:
- Titre: ${context.tender.title}
- Adjudicateur: ${context.tender.contracting_authority}
- Type: ${context.tender.tender_type}
- Deadline: ${context.tender.deadline}` : ''}

Réponds en français, de manière concise et pratique. Tu connais le droit belge des marchés publics (loi du 17 juin 2016).`;

  const message = await getAnthropic().messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1500,
    system: systemPrompt,
    messages,
  });

  return message.content[0].type === 'text' ? message.content[0].text : '';
}

export async function regenerateSection(
  section: SubmissionSection,
  tender: Tender,
  profile: Profile,
  instruction?: string
): Promise<string> {
  const message = await getAnthropic().messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1500,
    messages: [
      {
        role: 'user',
        content: `Réécris cette section de mémoire technique pour un marché public belge.

SECTION: ${section.title}
CONTENU ACTUEL: ${section.content}

MARCHÉ: ${tender.title} — ${tender.description}
ENTREPRISE: ${profile.company_name} — ${profile.company_description}

${instruction ? `INSTRUCTION SPÉCIFIQUE: ${instruction}` : 'Propose une variante différente, plus convaincante.'}

Réponds uniquement avec le nouveau contenu HTML (p, ul, li, strong, em).`,
      },
    ],
  });

  return message.content[0].type === 'text' ? message.content[0].text : '';
}
