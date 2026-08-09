ALTER TABLE public.knowledge_items
  ADD COLUMN IF NOT EXISTS notebook jsonb,
  ADD COLUMN IF NOT EXISTS notebook_style jsonb;