-- Cloud-backed Lab artifacts for exact cross-device continuation.

CREATE TABLE IF NOT EXISTS public.lab_artifacts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id     text NOT NULL,
  kind          text NOT NULL,
  title         text,
  payload       jsonb NOT NULL DEFAULT '{}'::jsonb,
  path          text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lab_artifacts_client_id_not_blank CHECK (length(trim(client_id)) > 0),
  CONSTRAINT lab_artifacts_kind_allowed CHECK (kind IN ('qr-project', 'lumina-response')),
  CONSTRAINT lab_artifacts_path_relative CHECK (path IS NULL OR path ~ '^/')
);

CREATE UNIQUE INDEX IF NOT EXISTS lab_artifacts_user_kind_client_unique
  ON public.lab_artifacts(user_id, kind, client_id);

CREATE INDEX IF NOT EXISTS lab_artifacts_user_updated_idx
  ON public.lab_artifacts(user_id, updated_at DESC);

ALTER TABLE public.lab_artifacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS lab_artifacts_owner_select ON public.lab_artifacts;
CREATE POLICY lab_artifacts_owner_select
  ON public.lab_artifacts FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS lab_artifacts_owner_insert ON public.lab_artifacts;
CREATE POLICY lab_artifacts_owner_insert
  ON public.lab_artifacts FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS lab_artifacts_owner_update ON public.lab_artifacts;
CREATE POLICY lab_artifacts_owner_update
  ON public.lab_artifacts FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS lab_artifacts_owner_delete ON public.lab_artifacts;
CREATE POLICY lab_artifacts_owner_delete
  ON public.lab_artifacts FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP TRIGGER IF EXISTS lab_artifacts_set_updated_at ON public.lab_artifacts;
CREATE TRIGGER lab_artifacts_set_updated_at
  BEFORE UPDATE ON public.lab_artifacts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
