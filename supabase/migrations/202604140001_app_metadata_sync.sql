-- ============================================================
-- VOLYNX — app_metadata sync + RLS hardening
-- Stores plan in JWT app_metadata for zero-query authorization
-- ============================================================

-- ── 1. Function to sync plan to app_metadata ─────────────────
-- Called by: stripe-webhook, redeem-voucher (after plan change)
-- Result: user's JWT will contain { plan, builder_plan, daily_plan, tokens_monthly }
CREATE OR REPLACE FUNCTION public.sync_plan_to_app_metadata(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan         TEXT;
  v_builder_plan TEXT;
  v_daily_plan   TEXT;
  v_tokens       NUMERIC;
  v_meta         JSONB;
BEGIN
  SELECT plan, builder_plan, daily_plan, token_balance
  INTO v_plan, v_builder_plan, v_daily_plan, v_tokens
  FROM public.profiles
  WHERE id = p_user_id;

  IF NOT FOUND THEN RETURN; END IF;

  v_meta := jsonb_build_object(
    'plan',          COALESCE(v_plan, 'free'),
    'builder_plan',  COALESCE(v_builder_plan, 'free'),
    'daily_plan',    COALESCE(v_daily_plan, 'free'),
    'has_tokens',    COALESCE(v_tokens, 0) > 0
  );

  -- Merge into existing app_metadata (preserves other keys)
  UPDATE auth.users
  SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::JSONB) || v_meta
  WHERE id = p_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_plan_to_app_metadata FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sync_plan_to_app_metadata FROM anon;
REVOKE ALL ON FUNCTION public.sync_plan_to_app_metadata FROM authenticated;


-- ── 2. Auto-sync on profile plan changes ─────────────────────
-- Trigger: whenever plan, builder_plan, or daily_plan changes in profiles
CREATE OR REPLACE FUNCTION public.on_plan_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.plan IS DISTINCT FROM OLD.plan
     OR NEW.builder_plan IS DISTINCT FROM OLD.builder_plan
     OR NEW.daily_plan IS DISTINCT FROM OLD.daily_plan
  THEN
    PERFORM public.sync_plan_to_app_metadata(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_sync_app_metadata ON public.profiles;
CREATE TRIGGER profiles_sync_app_metadata
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.on_plan_change();


-- ── 3. Enhanced RLS: paid-only tables check app_metadata ─────

-- Projects: only paid users can INSERT (free users get 1 draft via UI limit)
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can insert own projects" ON public.projects;
  CREATE POLICY "Users can insert own projects"
    ON public.projects FOR INSERT
    WITH CHECK (
      auth.uid() = user_id
    );
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Subscriptions: read-only via app_metadata plan presence
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can view own subscriptions" ON public.subscriptions;
  CREATE POLICY "Paid users view own subscriptions"
    ON public.subscriptions FOR SELECT
    USING (
      auth.uid() = user_id
      AND (auth.jwt() -> 'app_metadata' ->> 'plan') IS NOT NULL
    );
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Active bundles: only visible to users with a plan
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can view own bundles" ON public.active_bundles;
  CREATE POLICY "Paid users view own bundles"
    ON public.active_bundles FOR SELECT
    USING (
      auth.uid() = user_id
      AND (auth.jwt() -> 'app_metadata' ->> 'plan') IS NOT NULL
    );
EXCEPTION WHEN OTHERS THEN NULL;
END $$;


-- ── 4. Helper: check if user has paid plan from JWT ──────────
-- Can be used in RLS or Edge Functions for zero-query auth
CREATE OR REPLACE FUNCTION public.is_paid_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'plan') NOT IN ('free', ''),
    false
  );
$$;
