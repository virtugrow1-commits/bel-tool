
-- Organizations table
CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  ghl_api_key text,
  ghl_location_id text,
  logo_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read organizations" ON public.organizations FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can insert organizations" ON public.organizations FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can update organizations" ON public.organizations FOR UPDATE TO public USING (true);

-- Add organization_id to profiles
ALTER TABLE public.profiles ADD COLUMN organization_id uuid REFERENCES public.organizations(id);

-- User scores table
CREATE TABLE public.user_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  score_date date NOT NULL DEFAULT CURRENT_DATE,
  organization_id uuid REFERENCES public.organizations(id),
  gebeld integer NOT NULL DEFAULT 0,
  enquetes integer NOT NULL DEFAULT 0,
  afspraken integer NOT NULL DEFAULT 0,
  verstuurd integer NOT NULL DEFAULT 0,
  afgevallen integer NOT NULL DEFAULT 0,
  geen_gehoor integer NOT NULL DEFAULT 0,
  callbacks integer NOT NULL DEFAULT 0,
  best_reeks integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, score_date)
);

ALTER TABLE public.user_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read user_scores" ON public.user_scores FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can insert user_scores" ON public.user_scores FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can update user_scores" ON public.user_scores FOR UPDATE TO public USING (true);
