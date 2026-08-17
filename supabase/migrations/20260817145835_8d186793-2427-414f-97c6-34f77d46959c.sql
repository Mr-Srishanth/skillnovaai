-- Lock down trigger-only SECURITY DEFINER functions
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_profile_gamification() FROM PUBLIC, anon, authenticated;

-- add_xp: only signed-in users, only for themselves
REVOKE ALL ON FUNCTION public.add_xp(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.add_xp(uuid, integer) TO authenticated, service_role;

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
  IF auth.uid() IS NULL OR auth.uid() <> _user_id THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  IF _amount IS NULL OR _amount < 0 OR _amount > 500 THEN
    RAISE EXCEPTION 'invalid amount';
  END IF;

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

REVOKE ALL ON FUNCTION public.add_xp(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.add_xp(uuid, integer) TO authenticated, service_role;

-- analysis_history: explicit owner-scoped update policy
DROP POLICY IF EXISTS "Users can update own analysis history" ON public.analysis_history;
CREATE POLICY "Users can update own analysis history"
ON public.analysis_history FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- resumes bucket: owner-folder scoped update policy
DROP POLICY IF EXISTS "Users can update own resumes" ON storage.objects;
CREATE POLICY "Users can update own resumes"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);