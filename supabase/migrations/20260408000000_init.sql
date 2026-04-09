-- Profiles (extends Supabase Auth)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  company_name TEXT,
  specialties TEXT[],
  regions TEXT[],
  provinces TEXT[],
  min_amount INTEGER DEFAULT 0,
  max_amount INTEGER DEFAULT 500000,
  push_subscription JSONB,
  plan TEXT DEFAULT 'free',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Tenders (public procurement notices)
CREATE TABLE tenders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  source TEXT NOT NULL,
  source_id TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  buyer_name TEXT,
  buyer_location TEXT,
  province TEXT,
  region TEXT,
  cpv_codes TEXT[],
  estimated_value_min NUMERIC,
  estimated_value_max NUMERIC,
  currency TEXT DEFAULT 'EUR',
  deadline TIMESTAMPTZ,
  publication_date TIMESTAMPTZ,
  procedure_type TEXT,
  documents_url TEXT,
  source_url TEXT,
  raw_data JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE tenders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read tenders"
  ON tenders FOR SELECT
  TO authenticated
  USING (true);

CREATE INDEX idx_tenders_date ON tenders(publication_date DESC);
CREATE INDEX idx_tenders_region ON tenders(region);
CREATE INDEX idx_tenders_deadline ON tenders(deadline);

-- Analyses (AI analysis per tender per profile)
CREATE TABLE analyses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tender_id UUID REFERENCES tenders(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  relevance_score INTEGER CHECK (relevance_score BETWEEN 1 AND 10),
  summary TEXT,
  why_relevant TEXT,
  recommended_action TEXT,
  estimated_margin TEXT,
  competition_level TEXT,
  status TEXT DEFAULT 'new',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tender_id, profile_id)
);

ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own analyses"
  ON analyses FOR SELECT
  USING (auth.uid() = profile_id);

CREATE POLICY "Users can update own analyses"
  ON analyses FOR UPDATE
  USING (auth.uid() = profile_id);

CREATE INDEX idx_analyses_profile ON analyses(profile_id, created_at DESC);
CREATE INDEX idx_analyses_score ON analyses(relevance_score DESC);
