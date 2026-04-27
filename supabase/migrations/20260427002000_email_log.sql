-- email_log — outbox for transactional emails dispatched after a purchase event.
--
-- Each row is one delivery attempt scope. Webhooks INSERT pending rows
-- synchronously; the send-purchase-email edge function reads them, calls
-- Resend, and updates status to sent | failed | skipped.
--
-- The (event_type, idempotency_key) unique index is the linchpin: it stops
-- Stripe webhook retries from causing duplicate emails (same checkout.session
-- delivered twice = same idempotency_key = ON CONFLICT DO NOTHING).

CREATE TABLE IF NOT EXISTS public.email_log (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type          text        NOT NULL,
  idempotency_key     text        NOT NULL,
  recipient_email     text        NOT NULL,
  locale              text        NOT NULL DEFAULT 'en',
  payload             jsonb       NOT NULL DEFAULT '{}'::jsonb,
  status              text        NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','sent','failed','skipped')),
  attempts            integer     NOT NULL DEFAULT 0,
  last_error          text,
  resend_message_id   text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  sent_at             timestamptz,
  UNIQUE (event_type, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_email_log_status_pending
  ON public.email_log (created_at)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_email_log_user
  ON public.email_log (user_id, created_at DESC);

ALTER TABLE public.email_log ENABLE ROW LEVEL SECURITY;

-- Users can read their own email log (useful for /delivery/ "we sent you a
-- confirmation" badge); service role does everything else.
DROP POLICY IF EXISTS "email_log_self_read" ON public.email_log;
CREATE POLICY "email_log_self_read"
  ON public.email_log
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "email_log_service_all" ON public.email_log;
CREATE POLICY "email_log_service_all"
  ON public.email_log
  AS PERMISSIVE
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

GRANT SELECT ON public.email_log TO authenticated;

COMMENT ON TABLE public.email_log IS
  'Outbox for transactional emails. Webhooks INSERT pending rows; send-purchase-email function processes and updates status.';
