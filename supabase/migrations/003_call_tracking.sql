-- ─────────────────────────────────────────────────────────────────────────────
-- 003_call_tracking.sql
-- Persistent server-side storage for:
--   • call_sessions  – every call attempt with duration + result
--   • call_attempts  – attempt counter per contact (smart queue)
--   • callbacks      – scheduled callbacks (cross-device, replaces localStorage)
--   • user_scores    – daily scores per user (leaderboard, cross-device)
--   • dnc_list       – do-not-call numbers
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── CALL SESSIONS ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.call_sessions (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id        text        NOT NULL,
  company_id        text        NOT NULL DEFAULT '',
  company_name      text        NOT NULL DEFAULT '',
  contact_name      text        NOT NULL DEFAULT '',
  phone             text        NOT NULL DEFAULT '',
  caller_id         uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  caller_name       text        NOT NULL DEFAULT '',
  started_at        timestamptz NOT NULL DEFAULT now(),
  ended_at          timestamptz,
  duration_seconds  integer,
  result            text,          -- 'geenGehoor' | 'afspraak' | 'enquete' | 'afgevallen' | 'verstuurd' | 'callback' | 'anderMoment'
  notes             text,
  voys_call_id      text,
  ghl_synced        boolean     NOT NULL DEFAULT false,
  created_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.call_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "call_sessions_auth" ON public.call_sessions
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Index for contact lookups
CREATE INDEX IF NOT EXISTS idx_call_sessions_contact ON public.call_sessions(contact_id);
CREATE INDEX IF NOT EXISTS idx_call_sessions_caller  ON public.call_sessions(caller_id);
CREATE INDEX IF NOT EXISTS idx_call_sessions_date    ON public.call_sessions(started_at);

-- ─── CALL ATTEMPTS (Smart Queue) ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.call_attempts (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id   text        NOT NULL,
  company_id   text        NOT NULL DEFAULT '',
  result       text        NOT NULL DEFAULT '',
  caller_id    uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  attempted_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.call_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "call_attempts_auth" ON public.call_attempts
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_call_attempts_contact ON public.call_attempts(contact_id);

-- ─── CALLBACKS ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.callbacks (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id      text        NOT NULL,
  contact_name    text        NOT NULL DEFAULT '',
  company_name    text        NOT NULL DEFAULT '',
  scheduled_date  date        NOT NULL,
  scheduled_time  text        NOT NULL DEFAULT '09:00',
  note            text        NOT NULL DEFAULT '',
  status          text        NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'done', 'dismissed')),
  created_by      uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_to     uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.callbacks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "callbacks_auth" ON public.callbacks
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_callbacks_contact ON public.callbacks(contact_id);
CREATE INDEX IF NOT EXISTS idx_callbacks_date    ON public.callbacks(scheduled_date) WHERE status = 'scheduled';

-- Enable realtime for cross-device popup notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.callbacks;

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_callbacks_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER callbacks_updated_at
  BEFORE UPDATE ON public.callbacks
  FOR EACH ROW EXECUTE FUNCTION public.update_callbacks_updated_at();

-- ─── USER SCORES (Persistent leaderboard) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_scores (
  id           uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  score_date   date    NOT NULL DEFAULT CURRENT_DATE,
  gebeld       integer NOT NULL DEFAULT 0,
  enquetes     integer NOT NULL DEFAULT 0,
  afspraken    integer NOT NULL DEFAULT 0,
  verstuurd    integer NOT NULL DEFAULT 0,
  afgevallen   integer NOT NULL DEFAULT 0,
  geen_gehoor  integer NOT NULL DEFAULT 0,
  callbacks    integer NOT NULL DEFAULT 0,
  best_reeks   integer NOT NULL DEFAULT 0,
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, score_date)
);

ALTER TABLE public.user_scores ENABLE ROW LEVEL SECURITY;

-- Everyone can read scores (leaderboard)
CREATE POLICY "user_scores_read" ON public.user_scores
  FOR SELECT TO authenticated USING (true);

-- Users can only write their own scores
CREATE POLICY "user_scores_write" ON public.user_scores
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_user_scores_user ON public.user_scores(user_id, score_date DESC);

-- ─── DO-NOT-CALL LIST ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.dnc_list (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  phone       text        NOT NULL,
  phone_norm  text        NOT NULL UNIQUE,   -- normalized E.164 for reliable lookup
  reason      text        NOT NULL DEFAULT '',
  added_by    uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.dnc_list ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dnc_read"  ON public.dnc_list FOR SELECT  TO authenticated USING (true);
CREATE POLICY "dnc_write" ON public.dnc_list FOR ALL     TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_dnc_phone ON public.dnc_list(phone_norm);
