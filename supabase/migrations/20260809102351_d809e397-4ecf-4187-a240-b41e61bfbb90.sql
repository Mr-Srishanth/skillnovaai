CREATE TABLE public.career_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  company text,
  source_url text,
  description text,
  requirements jsonb NOT NULL DEFAULT '{}'::jsonb,
  analysis jsonb NOT NULL DEFAULT '{}'::jsonb,
  match_score integer,
  job_readiness integer,
  status text NOT NULL DEFAULT 'saved',
  applied_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.career_jobs TO authenticated;
GRANT ALL ON public.career_jobs TO service_role;
ALTER TABLE public.career_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own jobs" ON public.career_jobs FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_career_jobs_updated_at BEFORE UPDATE ON public.career_jobs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.skill_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  skill text NOT NULL,
  claimed_level text,
  assessment jsonb NOT NULL DEFAULT '{}'::jsonb,
  answers jsonb NOT NULL DEFAULT '[]'::jsonb,
  result jsonb NOT NULL DEFAULT '{}'::jsonb,
  verified_level text,
  score integer,
  status text NOT NULL DEFAULT 'in_progress',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.skill_verifications TO authenticated;
GRANT ALL ON public.skill_verifications TO service_role;
ALTER TABLE public.skill_verifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own verifications" ON public.skill_verifications FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_skill_verifications_updated_at BEFORE UPDATE ON public.skill_verifications FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.career_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL,
  label text NOT NULL,
  value numeric,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.career_events TO authenticated;
GRANT ALL ON public.career_events TO service_role;
ALTER TABLE public.career_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own career events" ON public.career_events FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX career_events_user_created_idx ON public.career_events (user_id, created_at DESC);

CREATE TABLE public.execution_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  task_type text NOT NULL DEFAULT 'learn',
  why text,
  horizon text NOT NULL DEFAULT 'today',
  effort_minutes integer NOT NULL DEFAULT 45,
  status text NOT NULL DEFAULT 'pending',
  source text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.execution_tasks TO authenticated;
GRANT ALL ON public.execution_tasks TO service_role;
ALTER TABLE public.execution_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own tasks" ON public.execution_tasks FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_execution_tasks_updated_at BEFORE UPDATE ON public.execution_tasks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  organization text,
  kind text NOT NULL DEFAULT 'job',
  match_score integer,
  match_reason text,
  required_skills jsonb NOT NULL DEFAULT '[]'::jsonb,
  missing_skills jsonb NOT NULL DEFAULT '[]'::jsonb,
  preparation jsonb NOT NULL DEFAULT '[]'::jsonb,
  eligibility text,
  timing text,
  link text,
  saved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.opportunities TO authenticated;
GRANT ALL ON public.opportunities TO service_role;
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own opportunities" ON public.opportunities FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_opportunities_updated_at BEFORE UPDATE ON public.opportunities FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.career_simulations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  base_role text,
  scenario text,
  roles jsonb NOT NULL DEFAULT '[]'::jsonb,
  result jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.career_simulations TO authenticated;
GRANT ALL ON public.career_simulations TO service_role;
ALTER TABLE public.career_simulations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own simulations" ON public.career_simulations FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);