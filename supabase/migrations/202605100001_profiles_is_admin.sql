-- ============================================================
-- VOLYNX platform admin flag
-- Several admin and checkout flows read profiles.is_admin for
-- platform-only bypasses and QR administration.
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_profiles_is_admin
  ON public.profiles(is_admin)
  WHERE is_admin = true;
