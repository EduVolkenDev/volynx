-- World subscriptions need a dedicated plan field separate from global
-- platform access. Keep it explicit and reproducible in migrations so
-- local db push and fresh environments match production.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS world_plan text DEFAULT 'free';

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS chk_world_plan;

ALTER TABLE public.profiles
  ADD CONSTRAINT chk_world_plan
  CHECK (world_plan IN ('free', 'member', 'pro'));

UPDATE public.profiles
SET world_plan = 'free'
WHERE world_plan IS NULL;

ALTER TABLE public.profiles
  ALTER COLUMN world_plan SET DEFAULT 'free';

CREATE INDEX IF NOT EXISTS idx_profiles_world_plan
  ON public.profiles(world_plan);

COMMENT ON COLUMN public.profiles.world_plan IS
  'Volynx World plan entitlement: free, member, or pro.';
