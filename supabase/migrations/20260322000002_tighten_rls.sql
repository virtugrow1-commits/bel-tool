-- Tighten incoming_calls RLS: require authentication
DROP POLICY IF EXISTS "Anyone can read incoming calls" ON public.incoming_calls;
DROP POLICY IF EXISTS "Anyone can insert incoming calls" ON public.incoming_calls;
DROP POLICY IF EXISTS "Anyone can update incoming calls" ON public.incoming_calls;
DROP POLICY IF EXISTS "Anyone can delete incoming calls" ON public.incoming_calls;

-- Authenticated users can read/update calls (for realtime notifications)
CREATE POLICY "Authenticated users can read incoming calls"
  ON public.incoming_calls FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can update incoming calls"
  ON public.incoming_calls FOR UPDATE
  TO authenticated
  USING (true);

-- Only service role (edge functions) can insert calls (from Voys webhook)
-- anon key can also insert since webhooks don't have auth tokens
CREATE POLICY "Service and anon can insert incoming calls"
  ON public.incoming_calls FOR INSERT
  WITH CHECK (true);

-- Only service role can delete
CREATE POLICY "Authenticated users can delete incoming calls"
  ON public.incoming_calls FOR DELETE
  TO authenticated
  USING (true);
