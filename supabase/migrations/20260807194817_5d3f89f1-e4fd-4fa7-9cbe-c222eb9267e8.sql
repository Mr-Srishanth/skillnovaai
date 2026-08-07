CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$
LANGUAGE plpgsql SET search_path = public;

CREATE TABLE public.knowledge_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  title TEXT NOT NULL,
  topic TEXT,
  source_type TEXT NOT NULL DEFAULT 'topic',
  source_ref TEXT,
  note_style TEXT NOT NULL DEFAULT 'detailed',
  output JSONB NOT NULL DEFAULT '{}'::jsonb,
  search_text TEXT,
  quiz_score INTEGER,
  reading_minutes INTEGER DEFAULT 0,
  mastered BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.knowledge_items TO authenticated;
GRANT ALL ON public.knowledge_items TO service_role;

ALTER TABLE public.knowledge_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own knowledge items"
ON public.knowledge_items FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX knowledge_items_user_created_idx ON public.knowledge_items (user_id, created_at DESC);

CREATE TRIGGER update_knowledge_items_updated_at
BEFORE UPDATE ON public.knowledge_items
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();