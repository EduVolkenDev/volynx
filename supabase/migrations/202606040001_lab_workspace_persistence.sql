-- VOLYNX Lab workspace persistence
-- Cloud-backed history and presets for the profile/passport experience.

CREATE TABLE IF NOT EXISTS public.lab_activity (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id     text NOT NULL,
  tool          text NOT NULL,
  action        text NOT NULL,
  detail        text,
  path          text,
  plan_at_time  text,
  metadata      jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lab_activity_client_id_not_blank CHECK (length(trim(client_id)) > 0),
  CONSTRAINT lab_activity_tool_not_blank CHECK (length(trim(tool)) > 0),
  CONSTRAINT lab_activity_action_not_blank CHECK (length(trim(action)) > 0),
  CONSTRAINT lab_activity_path_relative CHECK (path IS NULL OR path ~ '^/')
);

CREATE UNIQUE INDEX IF NOT EXISTS lab_activity_user_client_unique
  ON public.lab_activity(user_id, client_id);

CREATE INDEX IF NOT EXISTS lab_activity_user_created_idx
  ON public.lab_activity(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS lab_activity_tool_created_idx
  ON public.lab_activity(tool, created_at DESC);

ALTER TABLE public.lab_activity ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS lab_activity_owner_select ON public.lab_activity;
CREATE POLICY lab_activity_owner_select
  ON public.lab_activity FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS lab_activity_owner_insert ON public.lab_activity;
CREATE POLICY lab_activity_owner_insert
  ON public.lab_activity FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS lab_activity_owner_update ON public.lab_activity;
CREATE POLICY lab_activity_owner_update
  ON public.lab_activity FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS lab_activity_owner_delete ON public.lab_activity;
CREATE POLICY lab_activity_owner_delete
  ON public.lab_activity FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE TABLE IF NOT EXISTS public.lab_presets (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id     text NOT NULL,
  tool          text NOT NULL,
  label         text,
  values        jsonb NOT NULL DEFAULT '{}'::jsonb,
  path          text,
  plan_at_time  text,
  pinned        boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lab_presets_client_id_not_blank CHECK (length(trim(client_id)) > 0),
  CONSTRAINT lab_presets_tool_not_blank CHECK (length(trim(tool)) > 0),
  CONSTRAINT lab_presets_path_relative CHECK (path IS NULL OR path ~ '^/')
);

CREATE UNIQUE INDEX IF NOT EXISTS lab_presets_user_client_unique
  ON public.lab_presets(user_id, client_id);

CREATE INDEX IF NOT EXISTS lab_presets_user_updated_idx
  ON public.lab_presets(user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS lab_presets_tool_updated_idx
  ON public.lab_presets(tool, updated_at DESC);

ALTER TABLE public.lab_presets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS lab_presets_owner_select ON public.lab_presets;
CREATE POLICY lab_presets_owner_select
  ON public.lab_presets FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS lab_presets_owner_insert ON public.lab_presets;
CREATE POLICY lab_presets_owner_insert
  ON public.lab_presets FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS lab_presets_owner_update ON public.lab_presets;
CREATE POLICY lab_presets_owner_update
  ON public.lab_presets FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS lab_presets_owner_delete ON public.lab_presets;
CREATE POLICY lab_presets_owner_delete
  ON public.lab_presets FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP TRIGGER IF EXISTS lab_presets_set_updated_at ON public.lab_presets;
CREATE TRIGGER lab_presets_set_updated_at
  BEFORE UPDATE ON public.lab_presets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
