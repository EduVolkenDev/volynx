-- VOLYNX — Atomic Pix payment credit
--
-- Wraps the credit + credited_at update inside a single transaction so the
-- webhook can never end up in a "tokens credited but credited_at NULL"
-- state. Without this, a network blip between the credit RPC and the
-- separate `UPDATE pix_payments SET credited_at` would let the next
-- legacy direct-Pix retry double-credit the same payment.

DO $migration$
BEGIN
  EXECUTE $sql$
    CREATE OR REPLACE FUNCTION public.credit_pix_payment_atomic(
      p_pix_payment_id UUID,
      p_user_id UUID,
      p_amount NUMERIC,
      p_description TEXT,
      p_metadata JSONB DEFAULT '{}'::JSONB
    )
    RETURNS JSONB
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $body$
    DECLARE
      v_already_credited TIMESTAMPTZ;
      v_current NUMERIC;
      v_new NUMERIC;
    BEGIN
      -- Lock the pix_payments row first to serialize concurrent webhook
      -- retries for the same payment.
      SELECT credited_at INTO v_already_credited
      FROM public.pix_payments
      WHERE id = p_pix_payment_id
      FOR UPDATE;

      IF NOT FOUND THEN
        RETURN jsonb_build_object('ok', false, 'error', 'pix_record_not_found');
      END IF;

      IF v_already_credited IS NOT NULL THEN
        RETURN jsonb_build_object('ok', true, 'already_credited', true);
      END IF;

      IF p_amount <= 0 THEN
        RETURN jsonb_build_object('ok', false, 'error', 'invalid_amount');
      END IF;

      -- Credit balance
      SELECT token_balance INTO v_current
      FROM public.profiles
      WHERE id = p_user_id
      FOR UPDATE;

      IF NOT FOUND THEN
        RETURN jsonb_build_object('ok', false, 'error', 'profile_not_found');
      END IF;

      v_current := COALESCE(v_current, 0);
      v_new := v_current + p_amount;

      UPDATE public.profiles
      SET token_balance = v_new
      WHERE id = p_user_id;

      INSERT INTO public.token_transactions (
        user_id, amount, type, tool_name, description, balance_after, metadata
      ) VALUES (
        p_user_id,
        p_amount,
        'purchase',
        NULL,
        p_description,
        v_new,
        p_metadata
      );

      -- Mark pix payment credited inside the same transaction
      UPDATE public.pix_payments
      SET credited_at = NOW()
      WHERE id = p_pix_payment_id;

      RETURN jsonb_build_object('ok', true, 'balance', v_new, 'credited', p_amount);
    END;
    $body$;
  $sql$;

  EXECUTE 'REVOKE ALL ON FUNCTION public.credit_pix_payment_atomic(UUID, UUID, NUMERIC, TEXT, JSONB) FROM PUBLIC';
  EXECUTE 'REVOKE ALL ON FUNCTION public.credit_pix_payment_atomic(UUID, UUID, NUMERIC, TEXT, JSONB) FROM anon';
  EXECUTE 'REVOKE ALL ON FUNCTION public.credit_pix_payment_atomic(UUID, UUID, NUMERIC, TEXT, JSONB) FROM authenticated';
  EXECUTE 'GRANT EXECUTE ON FUNCTION public.credit_pix_payment_atomic(UUID, UUID, NUMERIC, TEXT, JSONB) TO service_role';
END;
$migration$;
