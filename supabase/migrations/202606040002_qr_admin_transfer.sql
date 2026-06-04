-- Admin QR ownership transfer.
-- Lets a platform admin transfer a managed dynamic QR to a customer account
-- so the customer can manage destination edits from /profile/qr-codes/.

ALTER TABLE public.qr_codes
  ADD COLUMN IF NOT EXISTS founder_controlled boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS qr_codes_founder_controlled_idx
  ON public.qr_codes(owner_id, founder_controlled)
  WHERE founder_controlled = true;

CREATE TABLE IF NOT EXISTS public.qr_code_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  qr_code_id uuid NOT NULL REFERENCES public.qr_codes(id) ON DELETE CASCADE,
  transferred_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  old_owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  new_owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  old_owner_email text,
  new_owner_email text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS qr_code_transfers_qr_idx
  ON public.qr_code_transfers(qr_code_id, created_at DESC);

CREATE INDEX IF NOT EXISTS qr_code_transfers_new_owner_idx
  ON public.qr_code_transfers(new_owner_id, created_at DESC);

ALTER TABLE public.qr_code_transfers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS qr_code_transfers_admin_select ON public.qr_code_transfers;
CREATE POLICY qr_code_transfers_admin_select
  ON public.qr_code_transfers FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid()) AND is_admin = true
    )
  );

DROP POLICY IF EXISTS qr_code_transfers_owner_select ON public.qr_code_transfers;
CREATE POLICY qr_code_transfers_owner_select
  ON public.qr_code_transfers FOR SELECT TO authenticated
  USING (
    old_owner_id = (SELECT auth.uid())
    OR new_owner_id = (SELECT auth.uid())
  );

GRANT SELECT ON public.qr_code_transfers TO authenticated;

DROP FUNCTION IF EXISTS public.admin_list_qr_codes(int, text, text);
CREATE OR REPLACE FUNCTION public.admin_list_qr_codes(
  p_limit  int DEFAULT 100,
  p_status text DEFAULT NULL,
  p_search text DEFAULT NULL
)
RETURNS TABLE (
  id                 uuid,
  owner_id           uuid,
  owner_email        text,
  slug               text,
  target_url         text,
  label              text,
  status             text,
  plan_at_creation   text,
  founder_controlled boolean,
  scan_count         integer,
  last_scan_at       timestamptz,
  created_at         timestamptz,
  updated_at         timestamptz,
  expires_at         timestamptz,
  grace_until        timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_is_admin boolean := false;
  v_limit int := LEAST(GREATEST(COALESCE(p_limit, 100), 1), 500);
  v_search text := NULLIF(trim(COALESCE(p_search, '')), '');
BEGIN
  SELECT COALESCE(is_admin, false)
    INTO v_is_admin
  FROM public.profiles
  WHERE profiles.id = auth.uid();

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'qr_admin_required'
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    q.id,
    q.owner_id,
    p.email AS owner_email,
    q.slug,
    q.target_url,
    q.label,
    q.status,
    q.plan_at_creation,
    q.founder_controlled,
    q.scan_count,
    q.last_scan_at,
    q.created_at,
    q.updated_at,
    q.expires_at,
    q.grace_until
  FROM public.qr_codes q
  LEFT JOIN public.profiles p ON p.id = q.owner_id
  WHERE (p_status IS NULL OR q.status = p_status)
    AND (
      v_search IS NULL
      OR q.slug ILIKE ('%' || v_search || '%')
      OR q.label ILIKE ('%' || v_search || '%')
      OR q.target_url ILIKE ('%' || v_search || '%')
      OR p.email ILIKE ('%' || v_search || '%')
    )
  ORDER BY q.updated_at DESC, q.created_at DESC
  LIMIT v_limit;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_qr_codes(int, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_qr_codes(int, text, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.enforce_qr_owner_update_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_is_admin boolean := false;
BEGIN
  -- Service role is used by edge functions such as qr-resolve and Stripe hooks.
  -- Database-owned jobs such as pg_cron run without a user JWT, so auth.uid()
  -- is NULL and must be allowed through the guard.
  IF auth.role() = 'service_role' OR auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- Ownership transfer is allowed only through admin_transfer_qr_code /
  -- transfer_qr_code, which set this transaction-local flag after doing their
  -- own admin/owner/recipient compatibility checks.
  IF current_setting('app.qr_transfer_allowed', true) = '1' THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(is_admin, false)
    INTO v_is_admin
  FROM public.profiles
  WHERE id = auth.uid();

  IF v_is_admin THEN
    RETURN NEW;
  END IF;

  IF auth.uid() IS NULL OR OLD.owner_id <> auth.uid() THEN
    RAISE EXCEPTION 'qr_update_not_allowed'
      USING ERRCODE = '42501';
  END IF;

  IF OLD.status IN ('expired', 'admin_blocked') THEN
    RAISE EXCEPTION 'qr_locked_status_update_forbidden'
      USING ERRCODE = '42501';
  END IF;

  IF COALESCE(OLD.founder_controlled, false)
    AND NEW.status IS DISTINCT FROM OLD.status
  THEN
    RAISE EXCEPTION 'qr_founder_controlled_validity_locked'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.owner_id IS DISTINCT FROM OLD.owner_id
    OR NEW.slug IS DISTINCT FROM OLD.slug
    OR NEW.plan_at_creation IS DISTINCT FROM OLD.plan_at_creation
    OR NEW.founder_controlled IS DISTINCT FROM OLD.founder_controlled
    OR NEW.scan_count IS DISTINCT FROM OLD.scan_count
    OR NEW.last_scan_at IS DISTINCT FROM OLD.last_scan_at
    OR NEW.created_at IS DISTINCT FROM OLD.created_at
    OR NEW.expires_at IS DISTINCT FROM OLD.expires_at
    OR NEW.grace_until IS DISTINCT FROM OLD.grace_until
  THEN
    RAISE EXCEPTION 'qr_owner_update_forbidden_columns'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF OLD.status IN ('active', 'paused') AND NEW.status IN ('active', 'paused') THEN
      RETURN NEW;
    END IF;

    RAISE EXCEPTION 'qr_status_transition_forbidden'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_qr_owner_update_guard() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enforce_qr_owner_update_guard() TO service_role;

DROP POLICY IF EXISTS qr_codes_owner_delete ON public.qr_codes;
CREATE POLICY qr_codes_owner_delete ON public.qr_codes
  FOR DELETE TO authenticated
  USING (
    owner_id = (SELECT auth.uid())
    AND founder_controlled = false
  );

CREATE OR REPLACE FUNCTION public.admin_transfer_qr_code(
  p_qr_id uuid,
  p_target_email text,
  p_note text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  owner_id uuid,
  owner_email text,
  slug text,
  target_url text,
  label text,
  status text,
  plan_at_creation text,
  scan_count integer,
  last_scan_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  expires_at timestamptz,
  grace_until timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_admin_id uuid := auth.uid();
  v_is_admin boolean := false;
  v_admin_email text;
  v_is_founder boolean := false;
  v_target_email text := lower(trim(COALESCE(p_target_email, '')));
  v_target public.profiles%ROWTYPE;
  v_old_qr public.qr_codes%ROWTYPE;
  v_old_owner_email text;
  v_limit int;
  v_current int;
  v_next_expires_at timestamptz;
  v_next_grace_until timestamptz;
BEGIN
  SELECT COALESCE(is_admin, false), email
    INTO v_is_admin, v_admin_email
  FROM public.profiles
  WHERE profiles.id = v_admin_id;

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'qr_admin_required'
      USING ERRCODE = '42501';
  END IF;

  -- Founder override is operational only. Paid plans/Black Diamond are not
  -- transfer bypasses, otherwise they could be used as resale accounts.
  v_is_founder := lower(COALESCE(v_admin_email, '')) IN ('edupelomundo13@gmail.com');

  IF v_target_email = '' THEN
    RAISE EXCEPTION 'qr_transfer_target_email_required'
      USING ERRCODE = '22023';
  END IF;

  SELECT *
    INTO v_old_qr
  FROM public.qr_codes
  WHERE qr_codes.id = p_qr_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'qr_not_found'
      USING ERRCODE = 'P0002';
  END IF;

  SELECT *
    INTO v_target
  FROM public.profiles
  WHERE lower(email) = v_target_email
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'qr_transfer_target_profile_not_found'
      USING DETAIL = v_target_email,
            ERRCODE = 'P0002';
  END IF;

  IF v_target.id = v_old_qr.owner_id THEN
    RAISE EXCEPTION 'qr_transfer_same_owner'
      USING DETAIL = v_target_email,
            ERRCODE = '22023';
  END IF;

  IF NOT v_is_founder
    AND NOT COALESCE(v_target.is_admin, false)
    AND v_old_qr.status IN ('active', 'paused', 'grace')
  THEN
    v_limit := CASE COALESCE(v_target.plan, 'free')
      WHEN 'free'       THEN 1
      WHEN 'launch'     THEN 5
      WHEN 'pro'        THEN 20
      WHEN 'studio'     THEN 50
      WHEN 'teams'      THEN 200
      WHEN 'enterprise' THEN 100000
      ELSE 1
    END;

    SELECT COUNT(*)
      INTO v_current
    FROM public.qr_codes
    WHERE owner_id = v_target.id
      AND status IN ('active', 'paused', 'grace');

    IF v_current >= v_limit THEN
      RAISE EXCEPTION 'qr_transfer_target_quota_exceeded'
        USING DETAIL = format('email=%s plan=%s limit=%s current=%s', v_target.email, COALESCE(v_target.plan, 'free'), v_limit, v_current),
              ERRCODE = 'check_violation';
    END IF;
  END IF;

  IF NOT v_is_founder
    AND COALESCE(v_target.plan, 'free') = 'free'
    AND v_old_qr.status IN ('active', 'paused', 'grace')
  THEN
    v_next_expires_at := now() + interval '30 days';
    v_next_grace_until := v_next_expires_at + interval '7 days';
  ELSE
    v_next_expires_at := NULL;
    v_next_grace_until := NULL;
  END IF;

  SELECT email
    INTO v_old_owner_email
  FROM public.profiles
  WHERE id = v_old_qr.owner_id;

  PERFORM set_config('app.qr_transfer_allowed', '1', true);

  UPDATE public.qr_codes
  SET owner_id = v_target.id,
      plan_at_creation = COALESCE(v_target.plan, 'free'),
      expires_at = v_next_expires_at,
      grace_until = v_next_grace_until,
      founder_controlled = founder_controlled OR v_is_founder
  WHERE qr_codes.id = p_qr_id;

  INSERT INTO public.qr_code_transfers (
    qr_code_id,
    transferred_by,
    old_owner_id,
    new_owner_id,
    old_owner_email,
    new_owner_email,
    note
  ) VALUES (
    p_qr_id,
    v_admin_id,
    v_old_qr.owner_id,
    v_target.id,
    v_old_owner_email,
    v_target.email,
    NULLIF(trim(COALESCE(p_note, '')), '')
  );

  RETURN QUERY
  SELECT
    q.id,
    q.owner_id,
    p.email AS owner_email,
    q.slug,
    q.target_url,
    q.label,
    q.status,
    q.plan_at_creation,
    q.scan_count,
    q.last_scan_at,
    q.created_at,
    q.updated_at,
    q.expires_at,
    q.grace_until
  FROM public.qr_codes q
  LEFT JOIN public.profiles p ON p.id = q.owner_id
  WHERE q.id = p_qr_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_transfer_qr_code(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_transfer_qr_code(uuid, text, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.transfer_qr_code(
  p_qr_id uuid,
  p_target_email text,
  p_note text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  owner_id uuid,
  owner_email text,
  slug text,
  target_url text,
  label text,
  status text,
  plan_at_creation text,
  scan_count integer,
  last_scan_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  expires_at timestamptz,
  grace_until timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_sender_id uuid := auth.uid();
  v_sender public.profiles%ROWTYPE;
  v_is_founder boolean := false;
  v_target_email text := lower(trim(COALESCE(p_target_email, '')));
  v_target public.profiles%ROWTYPE;
  v_old_qr public.qr_codes%ROWTYPE;
  v_old_owner_email text;
  v_limit int;
  v_current int;
  v_next_expires_at timestamptz;
  v_next_grace_until timestamptz;
BEGIN
  IF v_sender_id IS NULL THEN
    RAISE EXCEPTION 'qr_transfer_login_required'
      USING ERRCODE = '42501';
  END IF;

  SELECT *
    INTO v_sender
  FROM public.profiles
  WHERE id = v_sender_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'qr_sender_profile_missing'
      USING ERRCODE = '42501';
  END IF;

  -- Founder override is operational only. Paid plans/Black Diamond are not
  -- transfer bypasses, otherwise they could be used as resale accounts.
  v_is_founder := COALESCE(v_sender.is_admin, false)
    AND lower(COALESCE(v_sender.email, '')) IN ('edupelomundo13@gmail.com');

  IF v_target_email = '' THEN
    RAISE EXCEPTION 'qr_transfer_target_email_required'
      USING ERRCODE = '22023';
  END IF;

  SELECT *
    INTO v_old_qr
  FROM public.qr_codes
  WHERE qr_codes.id = p_qr_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'qr_not_found'
      USING ERRCODE = 'P0002';
  END IF;

  IF NOT COALESCE(v_sender.is_admin, false)
    AND v_old_qr.owner_id <> v_sender_id
  THEN
    RAISE EXCEPTION 'qr_transfer_owner_required'
      USING ERRCODE = '42501';
  END IF;

  IF NOT v_is_founder
    AND v_old_qr.status IN ('expired', 'admin_blocked')
  THEN
    RAISE EXCEPTION 'qr_transfer_locked_status'
      USING DETAIL = v_old_qr.status,
            ERRCODE = '42501';
  END IF;

  SELECT *
    INTO v_target
  FROM public.profiles
  WHERE lower(email) = v_target_email
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'qr_transfer_target_profile_not_found'
      USING DETAIL = v_target_email,
            ERRCODE = 'P0002';
  END IF;

  IF v_target.id = v_old_qr.owner_id THEN
    RAISE EXCEPTION 'qr_transfer_same_owner'
      USING DETAIL = v_target_email,
            ERRCODE = '22023';
  END IF;

  IF NOT v_is_founder
    AND NOT COALESCE(v_target.is_admin, false)
    AND v_old_qr.status IN ('active', 'paused', 'grace')
  THEN
    v_limit := CASE COALESCE(v_target.plan, 'free')
      WHEN 'free'       THEN 1
      WHEN 'launch'     THEN 5
      WHEN 'pro'        THEN 20
      WHEN 'studio'     THEN 50
      WHEN 'teams'      THEN 200
      WHEN 'enterprise' THEN 100000
      ELSE 1
    END;

    SELECT COUNT(*)
      INTO v_current
    FROM public.qr_codes
    WHERE owner_id = v_target.id
      AND status IN ('active', 'paused', 'grace');

    IF v_current >= v_limit THEN
      RAISE EXCEPTION 'qr_transfer_target_quota_exceeded'
        USING DETAIL = format('email=%s plan=%s limit=%s current=%s', v_target.email, COALESCE(v_target.plan, 'free'), v_limit, v_current),
              ERRCODE = 'check_violation';
    END IF;
  END IF;

  IF NOT v_is_founder
    AND COALESCE(v_target.plan, 'free') = 'free'
    AND v_old_qr.status IN ('active', 'paused', 'grace')
  THEN
    v_next_expires_at := now() + interval '30 days';
    v_next_grace_until := v_next_expires_at + interval '7 days';
  ELSE
    v_next_expires_at := NULL;
    v_next_grace_until := NULL;
  END IF;

  SELECT email
    INTO v_old_owner_email
  FROM public.profiles
  WHERE id = v_old_qr.owner_id;

  PERFORM set_config('app.qr_transfer_allowed', '1', true);

  UPDATE public.qr_codes
  SET owner_id = v_target.id,
      plan_at_creation = COALESCE(v_target.plan, 'free'),
      expires_at = v_next_expires_at,
      grace_until = v_next_grace_until,
      founder_controlled = founder_controlled OR v_is_founder
  WHERE qr_codes.id = p_qr_id;

  INSERT INTO public.qr_code_transfers (
    qr_code_id,
    transferred_by,
    old_owner_id,
    new_owner_id,
    old_owner_email,
    new_owner_email,
    note
  ) VALUES (
    p_qr_id,
    v_sender_id,
    v_old_qr.owner_id,
    v_target.id,
    v_old_owner_email,
    v_target.email,
    NULLIF(trim(COALESCE(p_note, '')), '')
  );

  RETURN QUERY
  SELECT
    q.id,
    q.owner_id,
    p.email AS owner_email,
    q.slug,
    q.target_url,
    q.label,
    q.status,
    q.plan_at_creation,
    q.scan_count,
    q.last_scan_at,
    q.created_at,
    q.updated_at,
    q.expires_at,
    q.grace_until
  FROM public.qr_codes q
  LEFT JOIN public.profiles p ON p.id = q.owner_id
  WHERE q.id = p_qr_id;
END;
$$;

REVOKE ALL ON FUNCTION public.transfer_qr_code(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.transfer_qr_code(uuid, text, text) TO authenticated, service_role;
