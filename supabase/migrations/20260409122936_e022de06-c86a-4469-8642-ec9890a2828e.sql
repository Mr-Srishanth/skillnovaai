
-- Gamification table
CREATE TABLE public.gamification (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  xp integer NOT NULL DEFAULT 0,
  level text NOT NULL DEFAULT 'Beginner',
  streak_days integer NOT NULL DEFAULT 0,
  last_active date DEFAULT CURRENT_DATE,
  badges jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.gamification ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own gamification"
ON public.gamification FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own gamification"
ON public.gamification FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own gamification"
ON public.gamification FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Function to add XP and auto-level
CREATE OR REPLACE FUNCTION public.add_xp(_user_id uuid, _amount integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _new_xp integer;
  _new_level text;
  _streak integer;
  _result jsonb;
BEGIN
  -- Upsert gamification row
  INSERT INTO public.gamification (user_id, xp, last_active)
  VALUES (_user_id, _amount, CURRENT_DATE)
  ON CONFLICT (user_id) DO UPDATE SET
    xp = gamification.xp + _amount,
    streak_days = CASE
      WHEN gamification.last_active = CURRENT_DATE - interval '1 day' THEN gamification.streak_days + 1
      WHEN gamification.last_active = CURRENT_DATE THEN gamification.streak_days
      ELSE 1
    END,
    last_active = CURRENT_DATE,
    updated_at = now();

  SELECT xp, streak_days INTO _new_xp, _streak FROM public.gamification WHERE user_id = _user_id;

  _new_level := CASE
    WHEN _new_xp >= 1000 THEN 'Expert'
    WHEN _new_xp >= 500 THEN 'Pro'
    WHEN _new_xp >= 200 THEN 'Intermediate'
    ELSE 'Beginner'
  END;

  UPDATE public.gamification SET level = _new_level WHERE user_id = _user_id;

  _result := jsonb_build_object('xp', _new_xp, 'level', _new_level, 'streak', _streak, 'added', _amount);
  RETURN _result;
END;
$$;

-- Auto-create gamification row on new profile
CREATE OR REPLACE FUNCTION public.handle_new_profile_gamification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.gamification (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_profile_created_gamification
AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.handle_new_profile_gamification();
