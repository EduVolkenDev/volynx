-- ============================================================
-- VOLYNX — CVitae launch alignment
-- Adds the missing CVitae plan model, plan limits and atomic
-- template unlock so the product can launch without local-only
-- entitlements or schema drift.
-- ============================================================

-- ── 1. Profiles: CVitae plan column ─────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS cvitae_plan text DEFAULT 'free';

CREATE INDEX IF NOT EXISTS idx_profiles_cvitae_plan
  ON public.profiles(cvitae_plan);

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS chk_cvitae_plan;
ALTER TABLE public.profiles
  ADD CONSTRAINT chk_cvitae_plan
  CHECK (cvitae_plan IN ('free', 'business'));

-- ── 2. CVitae plan limits ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.cvitae_plan_limits (
  plan        text PRIMARY KEY,
  max_cvs     integer NOT NULL DEFAULT 1,
  cloud_sync  boolean NOT NULL DEFAULT true,
  templates   boolean NOT NULL DEFAULT false,
  pdf_export  boolean NOT NULL DEFAULT false
);

ALTER TABLE public.cvitae_plan_limits ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Anyone can read CVitae plan limits"
    ON public.cvitae_plan_limits FOR SELECT
    USING (true);
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

DELETE FROM public.cvitae_plan_limits
WHERE plan NOT IN ('free', 'business');

INSERT INTO public.cvitae_plan_limits (plan, max_cvs, cloud_sync, templates, pdf_export)
VALUES
  ('free', 1, true, false, false),
  ('business', -1, true, true, true)
ON CONFLICT (plan) DO UPDATE
SET
  max_cvs = EXCLUDED.max_cvs,
  cloud_sync = EXCLUDED.cloud_sync,
  templates = EXCLUDED.templates,
  pdf_export = EXCLUDED.pdf_export;

-- ── 3. JWT app_metadata sync now includes cvitae_plan ──────
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
  v_cvitae_plan  TEXT;
  v_tokens       NUMERIC;
  v_meta         JSONB;
BEGIN
  SELECT plan, builder_plan, daily_plan, cvitae_plan, token_balance
  INTO v_plan, v_builder_plan, v_daily_plan, v_cvitae_plan, v_tokens
  FROM public.profiles
  WHERE id = p_user_id;

  IF NOT FOUND THEN RETURN; END IF;

  v_meta := jsonb_build_object(
    'plan',         COALESCE(v_plan, 'free'),
    'builder_plan', COALESCE(v_builder_plan, 'free'),
    'daily_plan',   COALESCE(v_daily_plan, 'free'),
    'cvitae_plan',  COALESCE(v_cvitae_plan, 'free'),
    'has_tokens',   COALESCE(v_tokens, 0) > 0
  );

  UPDATE auth.users
  SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::JSONB) || v_meta
  WHERE id = p_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_plan_to_app_metadata(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sync_plan_to_app_metadata(UUID) FROM anon;
REVOKE ALL ON FUNCTION public.sync_plan_to_app_metadata(UUID) FROM authenticated;

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
     OR NEW.cvitae_plan IS DISTINCT FROM OLD.cvitae_plan
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

-- ── 4. Atomic template unlock via VX ────────────────────────
DO $migration$
BEGIN
  EXECUTE $sql$
    CREATE OR REPLACE FUNCTION public.unlock_cvitae_template_atomic(
      p_user_id UUID,
      p_addon_id TEXT,
      p_template_id TEXT DEFAULT NULL,
      p_tokens NUMERIC DEFAULT 2
    )
    RETURNS JSONB
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $body$
    DECLARE
      v_balance     NUMERIC;
      v_new_balance NUMERIC;
      v_plan        TEXT;
      v_already     BOOLEAN;
      v_description TEXT;
    BEGIN
      IF p_addon_id IS NULL OR btrim(p_addon_id) = '' THEN
        RETURN jsonb_build_object('ok', false, 'error', 'missing_addon_id');
      END IF;

      IF p_tokens <= 0 THEN
        RETURN jsonb_build_object('ok', false, 'error', 'invalid_token_amount');
      END IF;

      SELECT COALESCE(token_balance, 0), COALESCE(cvitae_plan, 'free')
      INTO v_balance, v_plan
      FROM public.profiles
      WHERE id = p_user_id
      FOR UPDATE;

      IF NOT FOUND THEN
        RETURN jsonb_build_object('ok', false, 'error', 'profile_not_found');
      END IF;

      IF v_plan = 'business' THEN
        RETURN jsonb_build_object('ok', true, 'already_owned', true, 'balance', v_balance, 'plan', v_plan);
      END IF;

      SELECT EXISTS (
        SELECT 1
        FROM public.addons_purchased
        WHERE user_id = p_user_id
          AND status = 'active'
          AND (
            addon_id = p_addon_id
            OR addon_id = 'cvitae_templates_bundle'
          )
      ) INTO v_already;

      IF v_already THEN
        RETURN jsonb_build_object('ok', true, 'already_owned', true, 'balance', v_balance, 'plan', v_plan);
      END IF;

      IF v_balance < p_tokens THEN
        RETURN jsonb_build_object(
          'ok', false,
          'error', 'insufficient_balance',
          'balance', v_balance,
          'required', p_tokens
        );
      END IF;

      v_new_balance := v_balance - p_tokens;
      v_description := CASE
        WHEN p_addon_id = 'cvitae_templates_bundle' THEN 'CVitae premium templates bundle'
        ELSE 'CVitae premium template unlock'
      END;

      UPDATE public.profiles
      SET token_balance = v_new_balance
      WHERE id = p_user_id;

      INSERT INTO public.token_transactions (
        user_id, amount, type, tool_name, description, balance_after, metadata
      ) VALUES (
        p_user_id,
        -p_tokens,
        'spend',
        'cvitae_template_unlock',
        v_description,
        v_new_balance,
        jsonb_build_object(
          'addon_id', p_addon_id,
          'template_id', p_template_id,
          'tokens_spent', p_tokens,
          'product_key', 'cvitae'
        )
      );

      INSERT INTO public.addons_purchased (
        user_id, addon_id, price_paid, currency, status, metadata
      ) VALUES (
        p_user_id,
        p_addon_id,
        p_tokens,
        'VX',
        'active',
        jsonb_build_object(
          'source', 'vx_unlock',
          'template_id', p_template_id,
          'tokens_spent', p_tokens,
          'product_key', 'cvitae'
        )
      );

      RETURN jsonb_build_object(
        'ok', true,
        'balance', v_new_balance,
        'spent', p_tokens,
        'unlocked', p_addon_id,
        'plan', v_plan
      );
    END;
    $body$;
  $sql$;

  EXECUTE 'REVOKE ALL ON FUNCTION public.unlock_cvitae_template_atomic(UUID, TEXT, TEXT, NUMERIC) FROM PUBLIC';
  EXECUTE 'REVOKE ALL ON FUNCTION public.unlock_cvitae_template_atomic(UUID, TEXT, TEXT, NUMERIC) FROM anon';
  EXECUTE 'REVOKE ALL ON FUNCTION public.unlock_cvitae_template_atomic(UUID, TEXT, TEXT, NUMERIC) FROM authenticated';
END;
$migration$;
