CREATE TABLE public.career_missions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  goal_text text not null,
  role text not null,
  timeline_months integer not null default 6,
  deadline date,
  summary text,
  phases jsonb not null default '[]'::jsonb,
  gaps jsonb not null default '[]'::jsonb,
  projects jsonb not null default '[]'::jsonb,
  learning_topics jsonb not null default '[]'::jsonb,
  interview_focus jsonb not null default '[]'::jsonb,
  resume_focus jsonb not null default '[]'::jsonb,
  opportunity_targets jsonb not null default '[]'::jsonb,
  status text not null default 'active',
  progress integer not null default 0,
  current_phase integer not null default 0,
  last_planned_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.career_missions TO authenticated;
GRANT ALL ON public.career_missions TO service_role;
ALTER TABLE public.career_missions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own missions" ON public.career_missions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX career_missions_user_idx ON public.career_missions(user_id, created_at DESC);

CREATE TABLE public.career_decisions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  mission_id uuid references public.career_missions(id) on delete cascade,
  kind text not null,
  title text not null,
  reason text,
  impact text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.career_decisions TO authenticated;
GRANT ALL ON public.career_decisions TO service_role;
ALTER TABLE public.career_decisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own decisions" ON public.career_decisions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX career_decisions_user_idx ON public.career_decisions(user_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.touch_career_missions()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
REVOKE EXECUTE ON FUNCTION public.touch_career_missions() FROM PUBLIC, anon;
CREATE TRIGGER career_missions_touch BEFORE UPDATE ON public.career_missions FOR EACH ROW EXECUTE FUNCTION public.touch_career_missions();