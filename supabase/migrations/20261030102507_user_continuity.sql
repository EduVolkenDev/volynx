-- Cross-device product continuity for authenticated VOLYNX accounts.
-- Anonymous activity remains local until a valid session is available.

CREATE TABLE IF NOT EXISTS public.user_continuity (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  surface         text NOT NULL,
  resource_key    text NOT NULL DEFAULT 'workspace',
  title           text NOT NULL,
  detail          text,
  origin          text NOT NULL DEFAULT 'https://volynx.world',
  path            text NOT NULL,
  action_label    text NOT NULL DEFAULT 'Continue',
  status          text NOT NULL DEFAULT 'active',
  progress        smallint,
  metadata        jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_opened_at  timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_continuity_surface_check
    CHECK (surface ~ '^[a-z0-9][a-z0-9_-]{1,63}$'),
  CONSTRAINT user_continuity_resource_key_check
    CHECK (resource_key ~ '^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$'),
  CONSTRAINT user_continuity_title_check
    CHECK (length(trim(title)) BETWEEN 1 AND 160),
  CONSTRAINT user_continuity_detail_check
    CHECK (detail IS NULL OR length(detail) <= 320),
  CONSTRAINT user_continuity_origin_check
    CHECK (origin IN ('https://volynx.world', 'https://cvitae.volynx.world', 'https://daily.volynx.world')),
  CONSTRAINT user_continuity_path_check
    CHECK (path ~ '^/' AND path !~ '^//'),
  CONSTRAINT user_continuity_action_label_check
    CHECK (length(trim(action_label)) BETWEEN 1 AND 48),
  CONSTRAINT user_continuity_status_check
    CHECK (status IN ('active', 'draft', 'in_progress', 'completed', 'published', 'paused')),
  CONSTRAINT user_continuity_progress_check
    CHECK (progress IS NULL OR progress BETWEEN 0 AND 100),
  UNIQUE (user_id, surface, resource_key)
);

CREATE INDEX IF NOT EXISTS user_continuity_recent_idx
  ON public.user_continuity(user_id, last_opened_at DESC);

ALTER TABLE public.user_continuity ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_continuity_owner_select ON public.user_continuity;
CREATE POLICY user_continuity_owner_select
  ON public.user_continuity FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS user_continuity_owner_insert ON public.user_continuity;
CREATE POLICY user_continuity_owner_insert
  ON public.user_continuity FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS user_continuity_owner_update ON public.user_continuity;
CREATE POLICY user_continuity_owner_update
  ON public.user_continuity FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS user_continuity_owner_delete ON public.user_continuity;
CREATE POLICY user_continuity_owner_delete
  ON public.user_continuity FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

REVOKE ALL ON TABLE public.user_continuity FROM anon;
REVOKE ALL ON TABLE public.user_continuity FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_continuity TO authenticated;

DROP TRIGGER IF EXISTS user_continuity_set_updated_at ON public.user_continuity;
CREATE TRIGGER user_continuity_set_updated_at
  BEFORE UPDATE ON public.user_continuity
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.user_continuity IS
  'Most recent resumable state per user, product surface, and resource.';
