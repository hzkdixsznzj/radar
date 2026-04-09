-- Enable necessary extensions
create extension if not exists "uuid-ossp";

-- Profiles table
create table public.profiles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  company_name text not null default '',
  sectors text[] not null default '{}',
  certifications text[] not null default '{}',
  regions text[] not null default '{}',
  budget_ranges text[] not null default '{}',
  keywords text[] not null default '{}',
  company_description text not null default '',
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Tenders table
create table public.tenders (
  id uuid primary key default uuid_generate_v4(),
  source text not null check (source in ('ted', 'be_bulletin')),
  external_id text not null,
  title text not null,
  description text not null default '',
  contracting_authority text not null default '',
  tender_type text not null check (tender_type in ('works', 'services', 'supplies')),
  cpv_codes text[] not null default '{}',
  nuts_codes text[] not null default '{}',
  region text not null default '',
  publication_date timestamptz not null default now(),
  deadline timestamptz,
  estimated_value numeric,
  currency text not null default 'EUR',
  status text not null default 'open' check (status in ('open', 'closed', 'awarded', 'cancelled')),
  full_text text not null default '',
  documents_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(source, external_id)
);

-- Indexes for fast queries
create index idx_tenders_cpv_codes on public.tenders using gin (cpv_codes);
create index idx_tenders_nuts_codes on public.tenders using gin (nuts_codes);
create index idx_tenders_deadline on public.tenders (deadline);
create index idx_tenders_publication_date on public.tenders (publication_date desc);
create index idx_tenders_status on public.tenders (status);
create index idx_tenders_source on public.tenders (source);
create index idx_tenders_region on public.tenders (region);

-- Saved tenders table
create table public.saved_tenders (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  tender_id uuid references public.tenders(id) on delete cascade not null,
  status text not null default 'new' check (status in ('new', 'analyzing', 'drafting', 'submitted', 'won', 'lost')),
  notes text,
  ai_analysis jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, tender_id)
);

-- Submissions table
create table public.submissions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  tender_id uuid references public.tenders(id) on delete cascade not null,
  saved_tender_id uuid references public.saved_tenders(id) on delete cascade not null,
  sections jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Subscriptions table
create table public.subscriptions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  stripe_customer_id text not null,
  stripe_subscription_id text,
  plan text not null default 'free' check (plan in ('free', 'pro', 'business')),
  status text not null default 'active' check (status in ('active', 'trialing', 'past_due', 'canceled', 'incomplete')),
  current_period_end timestamptz,
  analyses_used integer not null default 0,
  submissions_used integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Dismissed tenders (swiped left)
create table public.dismissed_tenders (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  tender_id uuid references public.tenders(id) on delete cascade not null,
  created_at timestamptz not null default now(),
  unique(user_id, tender_id)
);

-- Row Level Security
alter table public.profiles enable row level security;
alter table public.tenders enable row level security;
alter table public.saved_tenders enable row level security;
alter table public.submissions enable row level security;
alter table public.subscriptions enable row level security;
alter table public.dismissed_tenders enable row level security;

-- Profiles: users can only access their own
create policy "Users can view own profile"
  on public.profiles for select using (auth.uid() = user_id);
create policy "Users can insert own profile"
  on public.profiles for insert with check (auth.uid() = user_id);
create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = user_id);

-- Tenders: everyone can read
create policy "Anyone can view tenders"
  on public.tenders for select using (true);

-- Saved tenders: users can only access their own
create policy "Users can view own saved tenders"
  on public.saved_tenders for select using (auth.uid() = user_id);
create policy "Users can insert own saved tenders"
  on public.saved_tenders for insert with check (auth.uid() = user_id);
create policy "Users can update own saved tenders"
  on public.saved_tenders for update using (auth.uid() = user_id);
create policy "Users can delete own saved tenders"
  on public.saved_tenders for delete using (auth.uid() = user_id);

-- Submissions: users can only access their own
create policy "Users can view own submissions"
  on public.submissions for select using (auth.uid() = user_id);
create policy "Users can insert own submissions"
  on public.submissions for insert with check (auth.uid() = user_id);
create policy "Users can update own submissions"
  on public.submissions for update using (auth.uid() = user_id);

-- Subscriptions: users can only view their own
create policy "Users can view own subscription"
  on public.subscriptions for select using (auth.uid() = user_id);

-- Dismissed tenders: users can only access their own
create policy "Users can view own dismissed"
  on public.dismissed_tenders for select using (auth.uid() = user_id);
create policy "Users can insert own dismissed"
  on public.dismissed_tenders for insert with check (auth.uid() = user_id);

-- Function to create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (user_id)
  values (new.id);
  insert into public.subscriptions (user_id, stripe_customer_id, plan, status)
  values (new.id, '', 'free', 'active');
  return new;
end;
$$ language plpgsql security definer;

-- Trigger on auth.users insert
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Updated_at trigger function
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_updated_at before update on public.profiles
  for each row execute procedure public.update_updated_at();
create trigger set_updated_at before update on public.tenders
  for each row execute procedure public.update_updated_at();
create trigger set_updated_at before update on public.saved_tenders
  for each row execute procedure public.update_updated_at();
create trigger set_updated_at before update on public.submissions
  for each row execute procedure public.update_updated_at();
create trigger set_updated_at before update on public.subscriptions
  for each row execute procedure public.update_updated_at();
