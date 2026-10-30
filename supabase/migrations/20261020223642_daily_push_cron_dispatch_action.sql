-- Ensure the scheduled request explicitly selects the protected dispatch path.
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
          body := jsonb_build_object('action', 'dispatch', 'triggered_at', now())
        )
        ELSE NULL
      END;
    $job$
  );
END;
$$;
