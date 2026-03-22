
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'caller',
  avatar text,
  device_id text DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read profiles"
  ON public.profiles FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Anyone can insert profiles"
  ON public.profiles FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Anyone can update profiles"
  ON public.profiles FOR UPDATE
  TO public
  USING (true);
