CREATE TABLE public.incoming_calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  caller_number text NOT NULL,
  called_number text,
  caller_name text,
  company_name text,
  contact_id text,
  status text NOT NULL DEFAULT 'ringing',
  call_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.incoming_calls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read incoming calls" ON public.incoming_calls FOR SELECT USING (true);
CREATE POLICY "Anyone can insert incoming calls" ON public.incoming_calls FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update incoming calls" ON public.incoming_calls FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete incoming calls" ON public.incoming_calls FOR DELETE USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.incoming_calls;