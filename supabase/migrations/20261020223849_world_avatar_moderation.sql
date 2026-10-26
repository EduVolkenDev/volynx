-- User-submitted World photos remain private until a human moderator approves them.
CREATE TABLE IF NOT EXISTS public.world_avatar_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  object_path text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  submitted_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id),
  rejection_reason text
);

CREATE INDEX IF NOT EXISTS world_avatar_submissions_queue_idx
  ON public.world_avatar_submissions(status, submitted_at);

ALTER TABLE public.world_avatar_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY world_avatar_submissions_owner_select
  ON public.world_avatar_submissions FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));
CREATE POLICY world_avatar_submissions_owner_insert
  ON public.world_avatar_submissions FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND object_path LIKE (SELECT auth.uid())::text || '/%'
    AND status = 'pending' AND reviewed_at IS NULL AND reviewed_by IS NULL
  );
REVOKE ALL ON public.world_avatar_submissions FROM anon;
GRANT SELECT, INSERT ON public.world_avatar_submissions TO authenticated;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('world-avatar-pending', 'world-avatar-pending', false, 5242880, ARRAY['image/jpeg','image/png','image/webp']),
  ('world-avatars', 'world-avatars', true, 5242880, ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE POLICY world_avatar_pending_owner_upload
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'world-avatar-pending'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

CREATE POLICY world_avatars_no_client_upload
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'world-avatars' AND false);

CREATE OR REPLACE FUNCTION public.guard_world_profile_avatar_url()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF (SELECT auth.jwt() ->> 'role') <> 'service_role'
     AND NEW.avatar_url IS NOT NULL
     AND (TG_OP = 'INSERT' OR NEW.avatar_url IS DISTINCT FROM OLD.avatar_url)
     AND NEW.avatar_url !~* '^https?://[^/]+/assets/bd-assets/[a-z0-9-]+\.webp$' THEN
    RAISE EXCEPTION 'World profile photos must be approved or selected from the avatar catalog';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS world_profiles_guard_avatar_url ON public.world_profiles;
CREATE TRIGGER world_profiles_guard_avatar_url
  BEFORE INSERT OR UPDATE OF avatar_url ON public.world_profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_world_profile_avatar_url();
