-- RPC atômica chamada pela edge function qr-resolve.
-- Retorna JSON com status + target_url (quando permitido) + metadata pra soft-gate UI.
-- service_role only (edge function usa).

CREATE OR REPLACE FUNCTION public.resolve_qr_slug(
  p_slug       text,
  p_ip_hash    text DEFAULT NULL,
  p_user_agent text DEFAULT NULL,
  p_country    text DEFAULT NULL,
  p_referer    text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_qr         public.qr_codes%ROWTYPE;
  v_now        timestamptz := now();
  v_owner_plan text;
BEGIN
  SELECT * INTO v_qr FROM public.qr_codes WHERE slug = p_slug;

  IF NOT FOUND THEN
    RETURN json_build_object('found', false);
  END IF;

  SELECT plan INTO v_owner_plan FROM public.profiles WHERE id = v_qr.owner_id;

  IF v_qr.status = 'admin_blocked' THEN
    RETURN json_build_object('found', true, 'status', 'admin_blocked');
  END IF;

  IF v_qr.status = 'paused' THEN
    RETURN json_build_object('found', true, 'status', 'paused');
  END IF;

  IF v_qr.grace_until IS NOT NULL AND v_now > v_qr.grace_until THEN
    RETURN json_build_object(
      'found', true,
      'status', 'expired',
      'owner_plan', v_owner_plan
    );
  END IF;

  IF v_qr.expires_at IS NOT NULL AND v_now > v_qr.expires_at THEN
    INSERT INTO public.qr_scans (qr_code_id, ip_hash, user_agent, country, referer)
    VALUES (v_qr.id, p_ip_hash, p_user_agent, p_country, p_referer);

    UPDATE public.qr_codes
    SET scan_count = scan_count + 1, last_scan_at = v_now
    WHERE id = v_qr.id;

    RETURN json_build_object(
      'found',       true,
      'status',      'grace',
      'target_url',  v_qr.target_url,
      'expires_at',  v_qr.expires_at,
      'grace_until', v_qr.grace_until,
      'owner_plan',  v_owner_plan
    );
  END IF;

  INSERT INTO public.qr_scans (qr_code_id, ip_hash, user_agent, country, referer)
  VALUES (v_qr.id, p_ip_hash, p_user_agent, p_country, p_referer);

  UPDATE public.qr_codes
  SET scan_count = scan_count + 1, last_scan_at = v_now
  WHERE id = v_qr.id;

  RETURN json_build_object(
    'found',      true,
    'status',     'active',
    'target_url', v_qr.target_url
  );
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_qr_slug(text, text, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_qr_slug(text, text, text, text, text) TO service_role;
