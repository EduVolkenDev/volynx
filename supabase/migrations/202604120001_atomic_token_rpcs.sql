-- ============================================================
-- VOLYNX — Atomic Token RPCs + Security Hardening
-- Wrapped in one DO block because Supabase CLI can treat large
-- PL/pgSQL migration files as a single prepared statement.
-- ============================================================

DO $migration$
BEGIN
  EXECUTE $sql$
    CREATE OR REPLACE FUNCTION public.deduct_tokens_atomic(
      p_user_id UUID,
      p_amount NUMERIC,
      p_tool_name TEXT,
      p_description TEXT DEFAULT NULL,
      p_action_class TEXT DEFAULT 'light',
      p_metadata JSONB DEFAULT '{}'::JSONB
    )
    RETURNS JSONB
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $body$
    DECLARE
      v_current NUMERIC;
      v_new NUMERIC;
      v_desc TEXT;
    BEGIN
      SELECT token_balance INTO v_current
      FROM public.profiles
      WHERE id = p_user_id
      FOR UPDATE;

      IF NOT FOUND THEN
        RETURN jsonb_build_object('ok', false, 'error', 'profile_not_found');
      END IF;

      v_current := COALESCE(v_current, 0);

      IF v_current < p_amount THEN
        RETURN jsonb_build_object(
          'ok', false,
          'error', 'insufficient_balance',
          'balance', v_current,
          'required', p_amount
        );
      END IF;

      v_new := v_current - p_amount;
      v_desc := COALESCE(p_description, p_tool_name || ' - ' || p_action_class || ' action');

      UPDATE public.profiles
      SET token_balance = v_new
      WHERE id = p_user_id;

      INSERT INTO public.token_transactions (
        user_id, amount, type, tool_name, description, balance_after, metadata
      ) VALUES (
        p_user_id,
        -p_amount,
        'spend',
        p_tool_name,
        v_desc,
        v_new,
        p_metadata || jsonb_build_object('action_class', p_action_class, 'tokens_spent', p_amount)
      );

      RETURN jsonb_build_object('ok', true, 'balance', v_new, 'spent', p_amount);
    END;
    $body$;
  $sql$;

  EXECUTE 'REVOKE ALL ON FUNCTION public.deduct_tokens_atomic(UUID, NUMERIC, TEXT, TEXT, TEXT, JSONB) FROM PUBLIC';
  EXECUTE 'REVOKE ALL ON FUNCTION public.deduct_tokens_atomic(UUID, NUMERIC, TEXT, TEXT, TEXT, JSONB) FROM anon';
  EXECUTE 'REVOKE ALL ON FUNCTION public.deduct_tokens_atomic(UUID, NUMERIC, TEXT, TEXT, TEXT, JSONB) FROM authenticated';

  EXECUTE $sql$
    CREATE OR REPLACE FUNCTION public.credit_tokens_atomic(
      p_user_id UUID,
      p_amount NUMERIC,
      p_type TEXT DEFAULT 'purchase',
      p_description TEXT DEFAULT NULL,
      p_tool_name TEXT DEFAULT NULL,
      p_metadata JSONB DEFAULT '{}'::JSONB
    )
    RETURNS JSONB
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $body$
    DECLARE
      v_current NUMERIC;
      v_new NUMERIC;
    BEGIN
      SELECT token_balance INTO v_current
      FROM public.profiles
      WHERE id = p_user_id
      FOR UPDATE;

      IF NOT FOUND THEN
        RETURN jsonb_build_object('ok', false, 'error', 'profile_not_found');
      END IF;

      IF p_amount <= 0 THEN
        RETURN jsonb_build_object('ok', false, 'error', 'invalid_amount');
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
        p_type,
        p_tool_name,
        COALESCE(p_description, p_type || ': ' || p_amount || ' tokens'),
        v_new,
        p_metadata
      );

      RETURN jsonb_build_object('ok', true, 'balance', v_new, 'credited', p_amount);
    END;
    $body$;
  $sql$;

  EXECUTE 'REVOKE ALL ON FUNCTION public.credit_tokens_atomic(UUID, NUMERIC, TEXT, TEXT, TEXT, JSONB) FROM PUBLIC';
  EXECUTE 'REVOKE ALL ON FUNCTION public.credit_tokens_atomic(UUID, NUMERIC, TEXT, TEXT, TEXT, JSONB) FROM anon';
  EXECUTE 'REVOKE ALL ON FUNCTION public.credit_tokens_atomic(UUID, NUMERIC, TEXT, TEXT, TEXT, JSONB) FROM authenticated';

  EXECUTE $sql$
    CREATE OR REPLACE FUNCTION public.increment_voucher_usage(p_voucher_id UUID)
    RETURNS VOID
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $body$
    BEGIN
      UPDATE public.vouchers
      SET times_used = times_used + 1
      WHERE id = p_voucher_id;
    END;
    $body$;
  $sql$;

  EXECUTE 'REVOKE ALL ON FUNCTION public.increment_voucher_usage(UUID) FROM PUBLIC';
  EXECUTE 'REVOKE ALL ON FUNCTION public.increment_voucher_usage(UUID) FROM anon';
  EXECUTE 'REVOKE ALL ON FUNCTION public.increment_voucher_usage(UUID) FROM authenticated';

  EXECUTE $sql$
    CREATE OR REPLACE FUNCTION public.increment_usage(
      p_user_id UUID,
      p_user_email TEXT,
      p_tool_name TEXT,
      p_usage_date DATE,
      p_table TEXT,
      p_increment INT DEFAULT 1
    )
    RETURNS INT
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $body$
    DECLARE
      v_count INT;
    BEGIN
      IF p_table = 'daily_usage_logs' THEN
        INSERT INTO public.daily_usage_logs (user_id, tool_name, usage_date, usage_count)
        VALUES (p_user_id, p_tool_name, p_usage_date, p_increment)
        ON CONFLICT (user_id, tool_name, usage_date)
        DO UPDATE SET usage_count = daily_usage_logs.usage_count + p_increment
        RETURNING usage_count INTO v_count;
      ELSE
        INSERT INTO public.usage_logs (user_id, user_email, tool_name, usage_date, usage_count)
        VALUES (p_user_id, p_user_email, p_tool_name, p_usage_date, p_increment)
        ON CONFLICT (user_id, tool_name, usage_date)
        DO UPDATE SET usage_count = usage_logs.usage_count + p_increment
        RETURNING usage_count INTO v_count;
      END IF;

      RETURN v_count;
    END;
    $body$;
  $sql$;

  EXECUTE 'REVOKE ALL ON FUNCTION public.increment_usage(UUID, TEXT, TEXT, DATE, TEXT, INT) FROM PUBLIC';
  EXECUTE 'REVOKE ALL ON FUNCTION public.increment_usage(UUID, TEXT, TEXT, DATE, TEXT, INT) FROM anon';
  EXECUTE 'REVOKE ALL ON FUNCTION public.increment_usage(UUID, TEXT, TEXT, DATE, TEXT, INT) FROM authenticated';

  BEGIN
    EXECUTE 'ALTER TABLE public.profiles ADD CONSTRAINT chk_token_balance_non_negative CHECK (token_balance >= 0)';
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;

  EXECUTE 'DROP POLICY IF EXISTS "users_own_token_transactions" ON public.token_transactions';
  EXECUTE 'DROP POLICY IF EXISTS "Users can view own token transactions" ON public.token_transactions';

  BEGIN
    EXECUTE 'CREATE POLICY "token_transactions_select_own" ON public.token_transactions FOR SELECT USING (auth.uid() = user_id)';
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;

  EXECUTE $sql$
    CREATE OR REPLACE FUNCTION public.guard_token_balance()
    RETURNS TRIGGER
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $body$
    BEGIN
      IF NEW.token_balance IS DISTINCT FROM OLD.token_balance THEN
        IF current_setting('request.jwt.claim.role', true) = 'authenticated' THEN
          RAISE EXCEPTION 'Direct token_balance modification is not allowed. Use the token API.';
        END IF;
      END IF;
      RETURN NEW;
    END;
    $body$;
  $sql$;

  EXECUTE 'DROP TRIGGER IF EXISTS guard_token_balance_trigger ON public.profiles';
  EXECUTE 'CREATE TRIGGER guard_token_balance_trigger BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.guard_token_balance()';

  EXECUTE 'CREATE INDEX IF NOT EXISTS idx_token_transactions_type ON public.token_transactions(user_id, type)';
  EXECUTE 'CREATE INDEX IF NOT EXISTS idx_token_transactions_tool ON public.token_transactions(tool_name) WHERE tool_name IS NOT NULL';
END;
$migration$;
