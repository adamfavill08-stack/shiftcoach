-- activity_logs: authenticated users may read/write only their own rows.
-- Without SELECT policies, PostgREST returns empty lists after successful INSERT under RLS.

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS activity_logs_all_own ON public.activity_logs;

CREATE POLICY activity_logs_all_own
  ON public.activity_logs
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
