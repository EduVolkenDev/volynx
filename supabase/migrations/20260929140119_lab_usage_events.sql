-- Canonical, append-only Lab execution telemetry.
-- Historical usage_logs/daily_usage_logs remain untouched and are treated as
-- legacy aggregates without retroactive certainty.

CREATE TABLE IF NOT EXISTS public.lab_usage_actor_labels (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  actor_class TEXT NOT NULL CHECK (actor_class IN ('real_user', 'internal_owner', 'synthetic_test', 'unknown')),
  label TEXT,
  note TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.lab_usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_key TEXT NOT NULL CHECK (length(btrim(tool_key)) BETWEEN 1 AND 80),
  action TEXT NOT NULL CHECK (length(btrim(action)) BETWEEN 1 AND 80),
  event_status TEXT NOT NULL CHECK (event_status IN ('started', 'completed', 'failed', 'legacy_aggregate')),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id UUID,
  request_id TEXT,
  environment TEXT NOT NULL DEFAULT 'production' CHECK (environment IN ('production', 'staging', 'local', 'test')),
  actor_class TEXT NOT NULL DEFAULT 'unknown' CHECK (actor_class IN ('real_user', 'internal_owner', 'synthetic_test', 'anonymous', 'unknown')),
  source TEXT NOT NULL DEFAULT 'browser' CHECK (source IN ('browser', 'edge_function', 'local', 'test', 'import')),
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 0),
  input_bytes BIGINT CHECK (input_bytes IS NULL OR input_bytes >= 0),
  output_bytes BIGINT CHECK (output_bytes IS NULL OR output_bytes >= 0),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT lab_usage_events_request_id_unique UNIQUE (request_id)
);

CREATE INDEX IF NOT EXISTS idx_lab_usage_events_occurred
  ON public.lab_usage_events (occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_lab_usage_events_tool_status
  ON public.lab_usage_events (tool_key, event_status, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_lab_usage_events_user
  ON public.lab_usage_events (user_id, occurred_at DESC);

ALTER TABLE public.lab_usage_actor_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_usage_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.lab_usage_actor_labels FROM anon, authenticated;
REVOKE ALL ON TABLE public.lab_usage_events FROM anon, authenticated;
GRANT ALL ON TABLE public.lab_usage_actor_labels TO service_role;
GRANT ALL ON TABLE public.lab_usage_events TO service_role;

CREATE OR REPLACE FUNCTION public.prevent_lab_usage_event_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'lab_usage_events is append-only';
END;
$$;

REVOKE ALL ON FUNCTION public.prevent_lab_usage_event_mutation() FROM PUBLIC;

DROP TRIGGER IF EXISTS lab_usage_events_immutable ON public.lab_usage_events;
CREATE TRIGGER lab_usage_events_immutable
  BEFORE UPDATE OR DELETE ON public.lab_usage_events
  FOR EACH ROW EXECUTE FUNCTION public.prevent_lab_usage_event_mutation();

CREATE OR REPLACE VIEW public.lab_usage_audit
WITH (security_invoker = true)
AS
WITH canonical AS (
  SELECT
    e.id::text AS record_id,
    'lab_usage_events'::text AS source_table,
    e.tool_key,
    e.action,
    e.event_status,
    e.user_id,
    p.email AS user_email,
    e.occurred_at,
    e.quantity,
    COALESCE(l.actor_class, e.actor_class) AS actor_class,
    e.environment,
    CASE
      WHEN e.event_status = 'completed' AND e.environment = 'production'
        AND COALESCE(l.actor_class, e.actor_class) = 'real_user' THEN 'confirmed'
      WHEN e.actor_class = 'synthetic_test' OR e.environment IN ('local', 'test')
        OR COALESCE(l.actor_class, e.actor_class) = 'synthetic_test' THEN 'test'
      ELSE 'unclassified'
    END AS confidence,
    e.metadata
  FROM public.lab_usage_events e
  LEFT JOIN public.profiles p ON p.id = e.user_id
  LEFT JOIN public.lab_usage_actor_labels l ON l.user_id = e.user_id
), legacy_rollups AS (
  SELECT
    u.id::text AS record_id,
    'usage_logs'::text AS source_table,
    u.tool_name AS tool_key,
    'usage_rollup'::text AS action,
    'legacy_aggregate'::text AS event_status,
    u.user_id,
    COALESCE(u.email, p.email) AS user_email,
    u.created_at AS occurred_at,
    u.usage_count AS quantity,
    'unknown'::text AS actor_class,
    'unknown'::text AS environment,
    CASE WHEN u.user_id IS NULL THEN 'unattributed' ELSE 'legacy_needs_review' END AS confidence,
    jsonb_build_object('usage_date', u.usage_date, 'org_id', u.org_id, 'public_key', u.public_key) AS metadata
  FROM public.usage_logs u
  LEFT JOIN public.profiles p ON p.id = u.user_id
  UNION ALL
  SELECT
    d.id::text AS record_id,
    'daily_usage_logs'::text AS source_table,
    d.tool_name AS tool_key,
    'usage_rollup'::text AS action,
    'legacy_aggregate'::text AS event_status,
    d.user_id,
    p.email AS user_email,
    d.usage_date::timestamptz AS occurred_at,
    d.usage_count AS quantity,
    'unknown'::text AS actor_class,
    'unknown'::text AS environment,
    'legacy_needs_review'::text AS confidence,
    jsonb_build_object('usage_date', d.usage_date) AS metadata
  FROM public.daily_usage_logs d
  LEFT JOIN public.profiles p ON p.id = d.user_id
)
SELECT * FROM canonical
UNION ALL
SELECT * FROM legacy_rollups;

REVOKE ALL ON public.lab_usage_audit FROM anon, authenticated;
GRANT SELECT ON public.lab_usage_audit TO service_role;

COMMENT ON TABLE public.lab_usage_events IS
  'Append-only execution events for VOLYNX Lab. Counts real production completions only after explicit actor classification.';

COMMENT ON TABLE public.lab_usage_actor_labels IS
  'Server-managed classification of internal owners, real users and synthetic test accounts. Never writable from the browser.';

COMMENT ON VIEW public.lab_usage_audit IS
  'Canonical Lab events plus legacy rollups. Legacy rows are explicitly marked unclassified, unattributed or needing review.';

-- The owner account is classified explicitly for future events. Historical
-- aggregate rows remain legacy_needs_review and are never rewritten here.
INSERT INTO public.lab_usage_actor_labels (user_id, actor_class, label, note)
SELECT id, 'internal_owner', 'Eduardo Volken', 'VOLYNX owner account; exclude from real-user product usage.'
FROM public.profiles
WHERE lower(email) = 'edupelomundo13@gmail.com'
ON CONFLICT (user_id) DO UPDATE
SET actor_class = EXCLUDED.actor_class,
    label = EXCLUDED.label,
    note = EXCLUDED.note,
    updated_at = now();
