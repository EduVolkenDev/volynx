-- Private storage bucket for paid Icon Vault deliverables.
-- Files are accessed only through short-lived signed URLs minted by Edge
-- Functions after ownership is verified against addons_purchased.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'icons',
  'icons',
  false,
  1073741824,
  ARRAY[
    'application/zip',
    'image/webp',
    'image/png',
    'image/jpeg',
    'image/svg+xml',
    'application/json'
  ]
)
ON CONFLICT (id) DO UPDATE
SET
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;
