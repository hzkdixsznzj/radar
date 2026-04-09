export interface Profile {
  id: string;
  company_name: string | null;
  specialties: string[];
  regions: string[];
  provinces: string[];
  min_amount: number;
  max_amount: number;
  push_subscription: PushSubscriptionJSON | null;
  plan: "free" | "pro";
  created_at: string;
}

export interface Tender {
  id: string;
  source: "ted" | "e-procurement";
  source_id: string;
  title: string;
  description: string | null;
  buyer_name: string | null;
  buyer_location: string | null;
  province: string | null;
  region: string | null;
  cpv_codes: string[];
  estimated_value_min: number | null;
  estimated_value_max: number | null;
  currency: string;
  deadline: string | null;
  publication_date: string | null;
  procedure_type: string | null;
  documents_url: string | null;
  source_url: string | null;
  raw_data: {
    analysis?: ClaudeAnalysisResult;
    [key: string]: unknown;
  } | null;
  created_at: string;
}

export interface Analysis {
  id: string;
  tender_id: string;
  profile_id: string;
  relevance_score: number;
  summary: string | null;
  why_relevant: string | null;
  recommended_action: string | null;
  estimated_margin: string | null;
  competition_level: "low" | "medium" | "high" | null;
  status: "new" | "saved" | "dismissed" | "applied";
  created_at: string;
}

export interface TenderWithAnalysis extends Tender {
  analysis: Analysis;
}

export interface ClaudeAnalysisResult {
  relevance_score: number;
  summary: string;
  why_relevant: string;
  recommended_action: string;
  estimated_margin: string;
  competition_level: "low" | "medium" | "high";
}

export const SPECIALTIES = [
  { value: "hvac", label: "HVAC" },
  { value: "renovation", label: "Rénovation énergétique" },
  { value: "plomberie", label: "Plomberie" },
  { value: "electricite", label: "Électricité" },
  { value: "gros-oeuvre", label: "Gros œuvre" },
  { value: "toiture", label: "Toiture" },
  { value: "isolation", label: "Isolation" },
  { value: "menuiserie", label: "Menuiserie" },
  { value: "peinture", label: "Peinture" },
  { value: "maintenance", label: "Maintenance bâtiment" },
] as const;

export const REGIONS = [
  { value: "wallonie", label: "Wallonie" },
  { value: "bruxelles", label: "Bruxelles" },
  { value: "flandre", label: "Flandre" },
] as const;

export const PROVINCES = [
  { value: "namur", label: "Namur", region: "wallonie" },
  { value: "liege", label: "Liège", region: "wallonie" },
  { value: "hainaut", label: "Hainaut", region: "wallonie" },
  { value: "brabant-wallon", label: "Brabant wallon", region: "wallonie" },
  { value: "luxembourg", label: "Luxembourg", region: "wallonie" },
  { value: "bruxelles", label: "Bruxelles-Capitale", region: "bruxelles" },
  { value: "anvers", label: "Anvers", region: "flandre" },
  { value: "flandre-orientale", label: "Flandre orientale", region: "flandre" },
  { value: "flandre-occidentale", label: "Flandre occidentale", region: "flandre" },
  { value: "limbourg", label: "Limbourg", region: "flandre" },
  { value: "brabant-flamand", label: "Brabant flamand", region: "flandre" },
] as const;
