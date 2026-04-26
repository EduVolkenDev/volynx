CREATE TABLE IF NOT EXISTS public.tool_usage_log (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tool TEXT NOT NULL,
  input_bytes BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  plan_at_time TEXT,
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_tool_usage_log_user_date
  ON public.tool_usage_log (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tool_usage_log_tool
  ON public.tool_usage_log (tool, created_at DESC);

ALTER TABLE public.tool_usage_log ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'tool_usage_log'
      AND policyname = 'users_see_own_tool_usage'
  ) THEN
    CREATE POLICY "users_see_own_tool_usage"
      ON public.tool_usage_log
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'tool_usage_log'
      AND policyname = 'users_insert_own_tool_usage'
  ) THEN
    CREATE POLICY "users_insert_own_tool_usage"
      ON public.tool_usage_log
      FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
