-- VOLYNX Dev Journey — persistent submission and certificate contract.
-- The edge function is the only writer for certification state. Students can
-- read their own submissions through the function, while public verification
-- is intentionally served through a narrow, read-only function action.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS devjourney_tier text NOT NULL DEFAULT 'social';

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_devjourney_tier_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_devjourney_tier_check
  CHECK (devjourney_tier IN ('social', 'pro', 'bundle'));

CREATE TABLE IF NOT EXISTS public.devjourney_progress (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id text NOT NULL,
  completed boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, item_id),
  CONSTRAINT devjourney_progress_item_id_check CHECK (item_id ~ '^[A-Za-z0-9_.-]{1,64}$')
);

-- Some production environments already have the original two-column
-- progress table, where the presence of a row represented completion.
-- Upgrade it in place before adding the new index: retain those completions
-- as true rather than silently resetting student progress.
ALTER TABLE public.devjourney_progress
  ADD COLUMN IF NOT EXISTS completed boolean;

UPDATE public.devjourney_progress
  SET completed = true
  WHERE completed IS NULL;

ALTER TABLE public.devjourney_progress
  ALTER COLUMN completed SET DEFAULT false,
  ALTER COLUMN completed SET NOT NULL;

ALTER TABLE public.devjourney_progress
  ADD COLUMN IF NOT EXISTS updated_at timestamptz;

UPDATE public.devjourney_progress
  SET updated_at = now()
  WHERE updated_at IS NULL;

ALTER TABLE public.devjourney_progress
  ALTER COLUMN updated_at SET DEFAULT now(),
  ALTER COLUMN updated_at SET NOT NULL;

ALTER TABLE public.devjourney_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS devjourney_progress_owner_select ON public.devjourney_progress;
CREATE POLICY devjourney_progress_owner_select
  ON public.devjourney_progress FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP INDEX IF EXISTS devjourney_progress_completed_idx;
CREATE INDEX devjourney_progress_completed_idx
  ON public.devjourney_progress(user_id, completed, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.devjourney_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tier text NOT NULL DEFAULT 'social',
  student_name text NOT NULL DEFAULT 'Dev Journey learner',
  repo_url text NOT NULL,
  live_url text NOT NULL,
  notes text,
  status text NOT NULL DEFAULT 'submitted',
  validation jsonb NOT NULL DEFAULT '{}'::jsonb,
  certificate_id text UNIQUE,
  fingerprint text,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT devjourney_submissions_tier_check CHECK (tier IN ('social', 'pro', 'bundle')),
  CONSTRAINT devjourney_submissions_status_check CHECK (status IN ('submitted', 'needs_changes', 'approved', 'rejected')),
  CONSTRAINT devjourney_submissions_repo_https CHECK (repo_url ~* '^https://'),
  CONSTRAINT devjourney_submissions_live_https CHECK (live_url ~* '^https://')
);

-- The original submissions table predates the richer certification record.
-- Add only the missing fields and seed safe defaults so existing submissions
-- remain readable and retain their original submission time.
ALTER TABLE public.devjourney_submissions
  ADD COLUMN IF NOT EXISTS student_name text,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS validation jsonb,
  ADD COLUMN IF NOT EXISTS fingerprint text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz;

UPDATE public.devjourney_submissions
  SET student_name = 'Dev Journey learner'
  WHERE student_name IS NULL;

UPDATE public.devjourney_submissions
  SET validation = '{}'::jsonb
  WHERE validation IS NULL;

UPDATE public.devjourney_submissions
  SET updated_at = COALESCE(submitted_at, now())
  WHERE updated_at IS NULL;

ALTER TABLE public.devjourney_submissions
  ALTER COLUMN student_name SET DEFAULT 'Dev Journey learner',
  ALTER COLUMN student_name SET NOT NULL,
  ALTER COLUMN validation SET DEFAULT '{}'::jsonb,
  ALTER COLUMN validation SET NOT NULL,
  ALTER COLUMN updated_at SET DEFAULT now(),
  ALTER COLUMN updated_at SET NOT NULL;

CREATE INDEX IF NOT EXISTS devjourney_submissions_user_idx
  ON public.devjourney_submissions(user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS devjourney_submissions_certificate_idx
  ON public.devjourney_submissions(certificate_id)
  WHERE certificate_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.devjourney_validation_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES public.devjourney_submissions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL,
  checks jsonb NOT NULL DEFAULT '{}'::jsonb,
  summary text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT devjourney_validation_runs_status_check CHECK (status IN ('submitted', 'needs_changes', 'approved', 'rejected'))
);

CREATE INDEX IF NOT EXISTS devjourney_validation_runs_submission_idx
  ON public.devjourney_validation_runs(submission_id, created_at DESC);

ALTER TABLE public.devjourney_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devjourney_validation_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS devjourney_submissions_owner_select ON public.devjourney_submissions;
CREATE POLICY devjourney_submissions_owner_select
  ON public.devjourney_submissions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS devjourney_validation_runs_owner_select ON public.devjourney_validation_runs;
CREATE POLICY devjourney_validation_runs_owner_select
  ON public.devjourney_validation_runs FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS devjourney_submissions_set_updated_at ON public.devjourney_submissions;
CREATE TRIGGER devjourney_submissions_set_updated_at
  BEFORE UPDATE ON public.devjourney_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.devjourney_submissions IS
  'Student project submissions and certificate state. Written by devjourney-submit only.';

COMMENT ON TABLE public.devjourney_validation_runs IS
  'Append-only audit trail for automated Dev Journey validation checks.';
