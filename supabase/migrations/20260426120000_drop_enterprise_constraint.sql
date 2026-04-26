-- ============================================================
-- VOLYNX — Drop orphan 'enterprise' tier from chk_builder_plan
-- ============================================================
-- 'enterprise' lives in chk_builder_plan (CHECK constraint) and in the
-- builder_plan_limits seed, but no Stripe product, no entry in
-- src/data/products.ts PLAN_TIERS, no UI in src/data/pricing.ts. The
-- top tier offered today is 'teams'. PropertyFlow's pf_enterprise is a
-- separate lookup_key (canonicalised to pf_white_label) and is unrelated
-- to profiles.builder_plan.
--
-- This migration drops the orphan tier so the constraint matches the
-- catalog. It is safe under the assumption that no row currently sets
-- builder_plan = 'enterprise'. The pre-flight assertion below blocks
-- the migration if any such row exists, so it never silently corrupts
-- data — fix the rows first, then re-run.
-- ============================================================

DO $$
DECLARE
  v_count integer;
BEGIN
  SELECT count(*) INTO v_count
  FROM public.profiles
  WHERE builder_plan = 'enterprise';

  IF v_count > 0 THEN
    RAISE EXCEPTION 'Refusing to drop enterprise tier: % profile(s) still set builder_plan = ''enterprise''. Migrate them first.', v_count;
  END IF;
END $$;

-- Drop & recreate the constraint without 'enterprise'
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS chk_builder_plan;
ALTER TABLE public.profiles
  ADD CONSTRAINT chk_builder_plan
  CHECK (builder_plan IN ('free', 'launch', 'pro', 'studio', 'teams'));

-- Remove the orphan seed row from builder_plan_limits (idempotent)
DELETE FROM public.builder_plan_limits WHERE plan = 'enterprise';
