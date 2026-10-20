-- Apply a voucher's entitlement and consume its use in one database transaction.
-- The Edge Function runs with service_role; direct client execution is denied.
CREATE OR REPLACE FUNCTION public.redeem_voucher_atomic(
  p_voucher_id uuid,
  p_user_id uuid,
  p_user_email text,
  p_profile_updates jsonb DEFAULT '{}'::jsonb,
  p_token_amount integer DEFAULT 0,
  p_grants_applied jsonb DEFAULT '{}'::jsonb,
  p_token_description text DEFAULT NULL,
  p_token_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_voucher public.vouchers%ROWTYPE;
  v_profile public.profiles%ROWTYPE;
  v_allowed_keys text[] := ARRAY[
    'builder_plan', 'daily_plan', 'daily_plan_expires_at', 'plan',
    'devjourney_tier', 'is_black_diamond', 'black_diamond_claimed_at'
  ];
  v_key text;
  v_balance integer;
BEGIN
  IF p_user_id IS NULL OR COALESCE(trim(p_user_email), '') = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_user');
  END IF;
  IF p_token_amount < 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_grant');
  END IF;
  IF jsonb_typeof(COALESCE(p_profile_updates, '{}'::jsonb)) <> 'object' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_grant');
  END IF;

  FOR v_key IN SELECT jsonb_object_keys(COALESCE(p_profile_updates, '{}'::jsonb)) LOOP
    IF NOT (v_key = ANY(v_allowed_keys)) THEN
      RETURN jsonb_build_object('ok', false, 'error', 'invalid_grant');
    END IF;
  END LOOP;

  SELECT * INTO v_voucher
  FROM public.vouchers
  WHERE id = p_voucher_id
  FOR UPDATE;

  IF NOT FOUND OR NOT v_voucher.active THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_code');
  END IF;
  IF v_voucher.expires_at IS NOT NULL AND v_voucher.expires_at <= now() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'expired');
  END IF;
  IF v_voucher.max_uses <> -1 AND v_voucher.times_used >= v_voucher.max_uses THEN
    RETURN jsonb_build_object('ok', false, 'error', 'max_uses_reached');
  END IF;
  IF v_voucher.target_email IS NOT NULL AND NOT v_voucher.transferable
     AND lower(v_voucher.target_email) <> lower(p_user_email) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'wrong_recipient');
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.voucher_redemptions
    WHERE voucher_id = p_voucher_id AND user_id = p_user_id
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_redeemed');
  END IF;

  SELECT * INTO v_profile
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'profile_not_found');
  END IF;

  IF COALESCE((p_profile_updates->>'is_black_diamond')::boolean, false)
     AND COALESCE(v_profile.is_black_diamond, false) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_black_diamond');
  END IF;

  UPDATE public.profiles
  SET builder_plan = CASE WHEN p_profile_updates ? 'builder_plan' THEN p_profile_updates->>'builder_plan' ELSE builder_plan END,
      daily_plan = CASE WHEN p_profile_updates ? 'daily_plan' THEN p_profile_updates->>'daily_plan' ELSE daily_plan END,
      daily_plan_expires_at = CASE WHEN p_profile_updates ? 'daily_plan_expires_at'
        THEN (p_profile_updates->>'daily_plan_expires_at')::timestamptz ELSE daily_plan_expires_at END,
      plan = CASE WHEN p_profile_updates ? 'plan' THEN p_profile_updates->>'plan' ELSE plan END,
      devjourney_tier = CASE WHEN p_profile_updates ? 'devjourney_tier' THEN p_profile_updates->>'devjourney_tier' ELSE devjourney_tier END,
      is_black_diamond = CASE WHEN p_profile_updates ? 'is_black_diamond' THEN (p_profile_updates->>'is_black_diamond')::boolean ELSE is_black_diamond END,
      black_diamond_claimed_at = CASE WHEN p_profile_updates ? 'black_diamond_claimed_at'
        THEN (p_profile_updates->>'black_diamond_claimed_at')::timestamptz ELSE black_diamond_claimed_at END,
      token_balance = token_balance + p_token_amount
  WHERE id = p_user_id
  RETURNING token_balance INTO v_balance;

  IF p_token_amount > 0 THEN
    INSERT INTO public.token_transactions (
      user_id, amount, type, description, tool_name, balance_after, metadata
    ) VALUES (
      p_user_id,
      p_token_amount,
      'grant',
      COALESCE(p_token_description, 'Voucher redeemed: ' || COALESCE(v_voucher.label, v_voucher.type)),
      NULL,
      v_balance,
      COALESCE(p_token_metadata, '{}'::jsonb)
    );
  END IF;

  INSERT INTO public.voucher_redemptions (
    voucher_id, user_id, user_email, grants_applied
  ) VALUES (
    p_voucher_id, p_user_id, lower(p_user_email), COALESCE(p_grants_applied, '{}'::jsonb)
  );

  UPDATE public.vouchers
  SET times_used = times_used + 1
  WHERE id = p_voucher_id;

  RETURN jsonb_build_object(
    'ok', true,
    'voucher_type', v_voucher.type,
    'label', COALESCE(v_voucher.label, v_voucher.type),
    'tokens_granted', p_token_amount,
    'token_balance', v_balance
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.redeem_voucher_atomic(uuid, uuid, text, jsonb, integer, jsonb, text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.redeem_voucher_atomic(uuid, uuid, text, jsonb, integer, jsonb, text, jsonb) FROM anon;
REVOKE ALL ON FUNCTION public.redeem_voucher_atomic(uuid, uuid, text, jsonb, integer, jsonb, text, jsonb) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_voucher_atomic(uuid, uuid, text, jsonb, integer, jsonb, text, jsonb) TO service_role;
