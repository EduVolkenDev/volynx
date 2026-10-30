-- Web Push subscriptions and server-owned reminder queue for VOLYNX Daily.
-- Push endpoints and encryption keys are treated as secrets and are only
-- accessed by the daily-push Edge Function using the service-role key.

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE TABLE IF NOT EXISTS public.daily_push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE CHECK (length(endpoint) <= 4096),
  p256dh TEXT NOT NULL CHECK (length(p256dh) <= 256),
  auth_secret TEXT NOT NULL CHECK (length(auth_secret) <= 256),
  locale TEXT NOT NULL DEFAULT 'pt' CHECK (locale IN ('pt', 'en')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS daily_push_subscriptions_user_idx
  ON public.daily_push_subscriptions(user_id);

ALTER TABLE public.daily_push_subscriptions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.daily_push_subscriptions FROM anon, authenticated;
GRANT ALL ON public.daily_push_subscriptions TO service_role;

CREATE TABLE IF NOT EXISTS public.daily_push_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id TEXT NOT NULL CHECK (length(task_id) BETWEEN 1 AND 128),
  scheduled_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'no_subscribers')),
  attempts SMALLINT NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processing_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  last_error TEXT CHECK (last_error IS NULL OR length(last_error) <= 80),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, task_id, scheduled_at)
);

CREATE INDEX IF NOT EXISTS daily_push_reminders_due_idx
  ON public.daily_push_reminders(status, scheduled_at, next_attempt_at)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS daily_push_reminders_user_idx
  ON public.daily_push_reminders(user_id, scheduled_at DESC);

ALTER TABLE public.daily_push_reminders ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.daily_push_reminders FROM anon, authenticated;
GRANT ALL ON public.daily_push_reminders TO service_role;

COMMENT ON TABLE public.daily_push_subscriptions IS
  'Private Web Push endpoints and browser encryption material; service function only.';
COMMENT ON TABLE public.daily_push_reminders IS
  'Server-side queue for user-selected Daily task reminders; task content is intentionally not stored.';

-- Keep the cron credential inside Vault and let only the service-role function
-- ask whether a presented value matches. No cron secret is duplicated into
-- Edge Function configuration or exposed to clients.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM vault.decrypted_secrets WHERE name = 'daily_push_project_url'
  ) THEN
    PERFORM vault.create_secret(
      'https://zdmpzrderifgqmqivjoy.supabase.co',
      'daily_push_project_url',
      'Daily push function URL'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM vault.decrypted_secrets WHERE name = 'daily_push_publishable_key'
  ) THEN
    PERFORM vault.create_secret(
      'sb_publishable_AT7seLhO8QMXP8iDlTyROA_DeUb8tFA',
      'daily_push_publishable_key',
      'Daily push Cron API key'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM vault.decrypted_secrets WHERE name = 'daily_push_cron_secret'
  ) THEN
    PERFORM vault.create_secret(
      encode(extensions.gen_random_bytes(32), 'hex'),
      'daily_push_cron_secret',
      'Daily push Cron authentication'
    );
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.daily_push_validate_cron_secret(provided_secret TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  expected_secret TEXT;
BEGIN
  IF (auth.jwt() ->> 'role') IS DISTINCT FROM 'service_role' THEN
    RETURN FALSE;
  END IF;

  SELECT decrypted_secret INTO expected_secret
  FROM vault.decrypted_secrets
  WHERE name = 'daily_push_cron_secret'
  LIMIT 1;

  RETURN expected_secret IS NOT NULL AND expected_secret = provided_secret;
END;
$$;

REVOKE ALL ON FUNCTION public.daily_push_validate_cron_secret(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.daily_push_validate_cron_secret(TEXT) TO service_role;

-- The job is installed after the function is deployed. Its credential is only
-- readable by the database cron command; the function validates it through a
-- service-role-only RPC.
DO $$
DECLARE
  existing_job_id BIGINT;
BEGIN
  SELECT jobid INTO existing_job_id
  FROM cron.job
  WHERE jobname = 'daily-push-reminders-every-minute'
  LIMIT 1;

  IF existing_job_id IS NOT NULL THEN
    PERFORM cron.unschedule(existing_job_id);
  END IF;

  PERFORM cron.schedule(
    'daily-push-reminders-every-minute',
    '* * * * *',
    $job$
      SELECT CASE
        WHEN EXISTS (SELECT 1 FROM vault.decrypted_secrets WHERE name = 'daily_push_project_url')
         AND EXISTS (SELECT 1 FROM vault.decrypted_secrets WHERE name = 'daily_push_publishable_key')
         AND EXISTS (SELECT 1 FROM vault.decrypted_secrets WHERE name = 'daily_push_cron_secret')
        THEN net.http_post(
          url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'daily_push_project_url' LIMIT 1)
            || '/functions/v1/daily-push',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'apikey', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'daily_push_publishable_key' LIMIT 1),
            'x-daily-push-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'daily_push_cron_secret' LIMIT 1)
          ),
          body := jsonb_build_object('triggered_at', now())
        )
        ELSE NULL
      END;
    $job$
  );
END;
$$;
