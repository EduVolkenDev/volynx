-- 2026-05-07 — Add avatar_id to profiles for avatar picker (PT-2a)
-- User-selected avatar key from src/data/avatars.ts catalog.
-- NULL = use plan default. Server-side validation in update-avatar edge fn.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_id text DEFAULT NULL;

COMMENT ON COLUMN public.profiles.avatar_id IS
  'Selected avatar catalog key (e.g. "diamond-1", "bd-main"). NULL = use plan default. Validated by update-avatar edge fn.';
