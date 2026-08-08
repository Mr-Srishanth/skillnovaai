CREATE TABLE public.studio_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  summary text,
  project_type text,
  difficulty text NOT NULL DEFAULT 'Intermediate',
  duration text,
  status text NOT NULL DEFAULT 'saved',
  source_mode text NOT NULL DEFAULT 'recommended',
  goal text,
  why text,
  career_relevance text,
  resume_value text,
  tech_stack jsonb NOT NULL DEFAULT '[]'::jsonb,
  skills_developed jsonb NOT NULL DEFAULT '[]'::jsonb,
  skills_addressed jsonb NOT NULL DEFAULT '[]'::jsonb,
  prerequisites jsonb NOT NULL DEFAULT '[]'::jsonb,
  quality jsonb NOT NULL DEFAULT '{}'::jsonb,
  blueprint jsonb NOT NULL DEFAULT '{}'::jsonb,
  milestones jsonb NOT NULL DEFAULT '[]'::jsonb,
  completed_tasks jsonb NOT NULL DEFAULT '[]'::jsonb,
  extra_tasks jsonb NOT NULL DEFAULT '[]'::jsonb,
  resume_entry jsonb,
  interview_questions jsonb,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.studio_projects TO authenticated;
GRANT ALL ON public.studio_projects TO service_role;

ALTER TABLE public.studio_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own studio projects"
ON public.studio_projects FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_studio_projects_updated_at
BEFORE UPDATE ON public.studio_projects
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX studio_projects_user_idx ON public.studio_projects (user_id, updated_at DESC);