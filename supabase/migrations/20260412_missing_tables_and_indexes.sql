-- Create missing usage_logs table (referenced by check-permission and log-usage edge functions)
CREATE TABLE IF NOT EXISTS public.usage_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL,
  user_email  TEXT,
  tool_name   TEXT NOT NULL,
  usage_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  usage_count INT NOT NULL DEFAULT 1,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, tool_name, usage_date)
);

CREATE INDEX IF NOT EXISTS idx_usage_logs_user_date ON public.usage_logs(user_id, tool_name, usage_date);

ALTER TABLE public.usage_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_usage_logs" ON public.usage_logs FOR ALL USING (auth.uid() = user_id);

-- Create missing daily_data table (referenced by vx-os.js sync module)
CREATE TABLE IF NOT EXISTS public.daily_data (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL,
  tool_name   TEXT NOT NULL,
  data        JSONB NOT NULL DEFAULT '{}',
  updated_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, tool_name)
);

CREATE INDEX IF NOT EXISTS idx_daily_data_user ON public.daily_data(user_id);

ALTER TABLE public.daily_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_daily_data" ON public.daily_data FOR ALL USING (auth.uid() = user_id);

-- Add missing indexes on frequently queried columns
CREATE INDEX IF NOT EXISTS idx_profiles_plan ON public.profiles(plan);
CREATE INDEX IF NOT EXISTS idx_profiles_builder_plan ON public.profiles(builder_plan);
CREATE INDEX IF NOT EXISTS idx_profiles_daily_plan ON public.profiles(daily_plan);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status) WHERE status = 'active';
