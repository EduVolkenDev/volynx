INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('icons-originals', 'icons-originals', false, 52428800)
ON CONFLICT (id) DO UPDATE
SET public = false,
    file_size_limit = EXCLUDED.file_size_limit;
