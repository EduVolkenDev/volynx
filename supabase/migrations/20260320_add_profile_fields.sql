-- ============================================================
-- VOLYNX profiles — definitive schema migration
-- Safe to re-run: all operations are idempotent
-- ============================================================

-- ── 1. Add canonical columns ─────────────────────────────────
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name   text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username    text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio         text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS website     text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS location    text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url  text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at  timestamptz DEFAULT now();

-- ── 2. Migrate legacy data before dropping columns ───────────
-- Preserve user_name values into full_name (only where full_name is empty)
UPDATE public.profiles
  SET full_name = user_name
  WHERE full_name IS NULL
    AND user_name IS NOT NULL;

-- ── 3. Drop legacy / redundant columns ───────────────────────
-- user_name: replaced by full_name + username (data migrated above)
-- user_plan: loose plan field — plan is derived from Stripe, not stored here
-- plan: added in a prior migration — same problem as user_plan
DO $$ BEGIN
  ALTER TABLE public.profiles DROP COLUMN IF EXISTS user_name;
EXCEPTION WHEN undefined_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.profiles DROP COLUMN IF EXISTS user_plan;
EXCEPTION WHEN undefined_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.profiles DROP COLUMN IF EXISTS plan;
EXCEPTION WHEN undefined_column THEN NULL;
END $$;

-- ── 4. Username normalization + constraints ──────────────────
-- Normalize legacy values before enforcing rules
UPDATE public.profiles
SET username = lower(trim(username))
WHERE username IS NOT NULL;

UPDATE public.profiles
SET username = NULL
WHERE username IS NOT NULL
  AND trim(username) = '';

-- Charset: [a-z0-9_] — no dots, no hyphens
-- Unique index (case-insensitive) — prevents duplicates, allows multiple NULLs
DROP INDEX IF EXISTS profiles_username_unique;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_unique
  ON public.profiles (lower(username))
  WHERE username IS NOT NULL;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_username_format;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_username_format
  CHECK (
    username IS NULL
    OR (
      length(username) BETWEEN 3 AND 30
      AND username ~ '^[a-z0-9][a-z0-9_]*[a-z0-9]$'
    )
  );

-- ── 5. RLS ───────────────────────────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop all known policy variants
DROP POLICY IF EXISTS "Users can view own profile"       ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile"     ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can edit own profile"       ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by owner"   ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for users"     ON public.profiles;
DROP POLICY IF EXISTS "Enable update for users"          ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable"     ON public.profiles;
DROP POLICY IF EXISTS "allow_select_own"                 ON public.profiles;
DROP POLICY IF EXISTS "allow_update_own"                 ON public.profiles;
DROP POLICY IF EXISTS "allow_insert_own"                 ON public.profiles;

-- Exactly two policies: read own, update own
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ── 6. updated_at trigger ────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_set_updated_at ON public.profiles;
CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ── 7. handle_new_user — create profile row on signup ────────
-- Replaces any existing version. Only sets id and email.
-- All other fields start NULL — user fills them in on /profile.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Recreate trigger (idempotent)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
