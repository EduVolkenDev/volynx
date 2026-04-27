-- PropertyFlow downloads — private Storage bucket served via signed URLs.
--
-- Why private + signed URL (not public): the ZIP is the deliverable users paid
-- for. We mint short-lived signed URLs inside the Stripe webhook (and via the
-- refresh-pf-url edge function) so the file never sits at a guessable public
-- URL and refunded customers can be cut off by flipping addons_purchased.status.
--
-- Naming: {addon_id}/v{version}.zip — e.g. pf_starter/v1.0.0.zip. This lets us
-- ship pf_starter v1.1.0 alongside the old v1.0.0 without invalidating already-
-- minted signed URLs from the webhook.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'propertyflow',
  'propertyflow',
  false,
  52428800,                                     -- 50 MB ceiling, current files <150 KB
  ARRAY['application/zip', 'application/x-zip-compressed']
)
ON CONFLICT (id) DO UPDATE
  SET public            = EXCLUDED.public,
      file_size_limit   = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Signed URLs bypass RLS by design (storage-api signs the path with the
-- service-role key and the resulting URL is checked by Storage independently
-- of auth). These policies are defensive: they ensure no anon/authenticated
-- request can list or read directly from the bucket — only service_role can
-- write/manage, and even reads only happen via signed URLs.

DROP POLICY IF EXISTS "propertyflow_service_all" ON storage.objects;
CREATE POLICY "propertyflow_service_all"
  ON storage.objects
  AS PERMISSIVE
  FOR ALL
  TO service_role
  USING (bucket_id = 'propertyflow')
  WITH CHECK (bucket_id = 'propertyflow');

DROP POLICY IF EXISTS "propertyflow_no_anon_read" ON storage.objects;
CREATE POLICY "propertyflow_no_anon_read"
  ON storage.objects
  AS RESTRICTIVE
  FOR SELECT
  TO anon, authenticated
  USING (bucket_id <> 'propertyflow');

COMMENT ON POLICY "propertyflow_service_all" ON storage.objects IS
  'PropertyFlow ZIPs: service-role full control. Webhook + refresh-pf-url use this to mint signed URLs.';
COMMENT ON POLICY "propertyflow_no_anon_read" ON storage.objects IS
  'PropertyFlow ZIPs: anon/authenticated cannot read directly. Signed URL is the only delivery path.';
