-- QR validity controls: owner update guard + admin RPCs.
-- Keeps normal users from changing expiry/scan/admin fields directly while
-- allowing platform admins to manage validity from /admin/qr-codes/.

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

  IF NEW.owner_id IS DISTINCT FROM OLD.owner_id
    OR NEW.slug IS DISTINCT FROM OLD.slug
    OR NEW.plan_at_creation IS DISTINCT FROM OLD.plan_at_creation
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

DROP TRIGGER IF EXISTS qr_codes_owner_update_guard_trigger ON public.qr_codes;
CREATE TRIGGER qr_codes_owner_update_guard_trigger
BEFORE UPDATE ON public.qr_codes
FOR EACH ROW
EXECUTE FUNCTION public.enforce_qr_owner_update_guard();

REVOKE ALL ON FUNCTION public.enforce_qr_owner_update_guard() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enforce_qr_owner_update_guard() TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.qr_codes TO authenticated;
GRANT SELECT ON public.qr_scans TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_list_qr_codes(
  p_limit  int DEFAULT 100,
  p_status text DEFAULT NULL,
  p_search text DEFAULT NULL
)
RETURNS TABLE (
  id               uuid,
  owner_id         uuid,
  owner_email      text,
  slug             text,
  target_url       text,
  label            text,
  status           text,
  plan_at_creation text,
  scan_count       integer,
  last_scan_at     timestamptz,
  created_at       timestamptz,
  updated_at       timestamptz,
  expires_at       timestamptz,
  grace_until      timestamptz
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

CREATE OR REPLACE FUNCTION public.admin_update_qr_validity(
  p_qr_id        uuid,
  p_status       text DEFAULT NULL,
  p_expires_at   timestamptz DEFAULT NULL,
  p_grace_until  timestamptz DEFAULT NULL,
  p_clear_expiry boolean DEFAULT false,
  p_clear_grace  boolean DEFAULT false
)
RETURNS public.qr_codes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_is_admin boolean := false;
  v_row public.qr_codes%ROWTYPE;
  v_next_expires_at timestamptz;
  v_next_grace_until timestamptz;
BEGIN
  SELECT COALESCE(is_admin, false)
    INTO v_is_admin
  FROM public.profiles
  WHERE profiles.id = auth.uid();

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'qr_admin_required'
      USING ERRCODE = '42501';
  END IF;

  IF p_status IS NOT NULL
    AND p_status NOT IN ('active', 'paused', 'grace', 'expired', 'admin_blocked')
  THEN
    RAISE EXCEPTION 'qr_invalid_status'
      USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_row
  FROM public.qr_codes
  WHERE qr_codes.id = p_qr_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'qr_not_found'
      USING ERRCODE = 'P0002';
  END IF;

  v_next_expires_at := CASE
    WHEN p_clear_expiry THEN NULL
    WHEN p_expires_at IS NOT NULL THEN p_expires_at
    ELSE v_row.expires_at
  END;

  v_next_grace_until := CASE
    WHEN p_clear_grace THEN NULL
    WHEN p_grace_until IS NOT NULL THEN p_grace_until
    ELSE v_row.grace_until
  END;

  IF v_next_expires_at IS NOT NULL
    AND v_next_grace_until IS NOT NULL
    AND v_next_grace_until < v_next_expires_at
  THEN
    RAISE EXCEPTION 'qr_grace_before_expiry'
      USING ERRCODE = '22023';
  END IF;

  UPDATE public.qr_codes
  SET status = COALESCE(p_status, status),
      expires_at = v_next_expires_at,
      grace_until = v_next_grace_until
  WHERE qr_codes.id = p_qr_id
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_qr_validity(uuid, text, timestamptz, timestamptz, boolean, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_qr_validity(uuid, text, timestamptz, timestamptz, boolean, boolean) TO authenticated, service_role;
