export type TenderSource = 'ted' | 'be_bulletin';
export type TenderType = 'works' | 'services' | 'supplies';
export type TenderStatus = 'open' | 'closed' | 'awarded' | 'cancelled';
export type SavedTenderStatus = 'new' | 'analyzing' | 'drafting' | 'submitted' | 'won' | 'lost';
export type SubscriptionPlan = 'free' | 'pro' | 'business';
export type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'canceled' | 'incomplete';

export interface Profile {
  id: string;
  user_id: string;
  company_name: string;
  sectors: string[];
  certifications: string[];
  regions: string[];
  budget_ranges: string[];
  keywords: string[];
  company_description: string;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface Tender {
  id: string;
  source: TenderSource;
  external_id: string;
  title: string;
  description: string;
  contracting_authority: string;
  tender_type: TenderType;
  cpv_codes: string[];
  nuts_codes: string[];
  region: string;
  publication_date: string;
  deadline: string;
  estimated_value: number | null;
  currency: string;
  status: TenderStatus;
  full_text: string;
  documents_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface SavedTender {
  id: string;
  user_id: string;
  tender_id: string;
  status: SavedTenderStatus;
  notes: string | null;
  ai_analysis: AIAnalysis | null;
  created_at: string;
  updated_at: string;
  tender?: Tender;
}

export interface Submission {
  id: string;
  user_id: string;
  tender_id: string;
  saved_tender_id: string;
  sections: SubmissionSection[];
  created_at: string;
  updated_at: string;
  tender?: Tender;
}

export interface SubmissionSection {
  id: string;
  title: string;
  content: string;
  order: number;
}

export interface Subscription {
  id: string;
  user_id: string;
  stripe_customer_id: string;
  stripe_subscription_id: string | null;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  current_period_end: string | null;
  analyses_used: number;
  submissions_used: number;
  created_at: string;
  updated_at: string;
}

export interface AIAnalysis {
  summary: string;
  relevance_reason: string;
  attribution_criteria: string[];
  competition_level: 'low' | 'medium' | 'high';
  risks: string[];
  recommendation: 'apply' | 'watch' | 'skip';
  recommendation_reason: string;
  suggested_price: string | null;
  relevance_score: number;
}

export interface TenderWithScore extends Tender {
  relevance_score: number;
}

// Note: We intentionally omit a Database generic type because the Supabase
// client's complex conditional types require generated types from `supabase
// gen types typescript` to resolve properly. Using a hand-written Database
// interface causes Schema to resolve as `never`, breaking all query builders.
// Instead, the Supabase client is created without a type parameter (defaults
// to `any`) and query results are cast to the proper types where needed.
