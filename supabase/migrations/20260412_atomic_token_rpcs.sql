-- ============================================================
-- VOLYNX — Atomic Token RPCs + Security Hardening
-- Fixes race conditions in deduct-tokens and stripe-webhook
-- Adds missing RPCs referenced by edge functions
-- ============================================================

-- ── 1. Atomic token deduction (replaces optimistic lock) ─────
-- Called by: deduct-tokens edge function
-- Guarantees: no double-spend via SELECT ... FOR UPDATE
CREATE OR REPLACE FUNCTION public.deduct_tokens_atomic(
  p_user_id     UUID,
  p_amount      NUMERIC,
  p_tool_name   TEXT,
  p_description TEXT DEFAULT NULL,
  p_action_class TEXT DEFAULT 'light',
  p_metadata    JSONB DEFAULT '{}'::JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER          -- runs as db owner, bypasses RLS
SET search_path = public  -- prevent search_path injection
AS $$
DECLARE
  v_current  NUMERIC;
  v_new      NUMERIC;
  v_desc     TEXT;
BEGIN
  -- Lock the row to prevent concurrent modifications
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
  v_desc := COALESCE(p_description, p_tool_name || ' — ' || p_action_class || ' action');

  -- Debit
  UPDATE public.profiles
  SET token_balance = v_new
  WHERE id = p_user_id;

  -- Audit trail
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
$$;

-- Restrict: only service_role can call this (edge functions use service role)
REVOKE ALL ON FUNCTION public.deduct_tokens_atomic FROM PUBLIC;
REVOKE ALL ON FUNCTION public.deduct_tokens_atomic FROM anon;
REVOKE ALL ON FUNCTION public.deduct_tokens_atomic FROM authenticated;
-- service_role inherits from postgres owner, so it can still call it


-- ── 2. Atomic token credit (for purchases, vouchers, refunds) ─
-- Called by: stripe-webhook, redeem-voucher edge functions
CREATE OR REPLACE FUNCTION public.credit_tokens_atomic(
  p_user_id     UUID,
  p_amount      NUMERIC,
  p_type        TEXT DEFAULT 'purchase',   -- purchase | grant | refund | bonus
  p_description TEXT DEFAULT NULL,
  p_tool_name   TEXT DEFAULT NULL,
  p_metadata    JSONB DEFAULT '{}'::JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current  NUMERIC;
  v_new      NUMERIC;
BEGIN
  -- Lock row
  SELECT token_balance INTO v_current
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'profile_not_found');
  END IF;

  v_current := COALESCE(v_current, 0);
  v_new := v_current + p_amount;

  -- Prevent negative credits (safety)
  IF p_amount <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_amount');
  END IF;

  -- Credit
  UPDATE public.profiles
  SET token_balance = v_new
  WHERE id = p_user_id;

  -- Audit trail
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
$$;

REVOKE ALL ON FUNCTION public.credit_tokens_atomic FROM PUBLIC;
REVOKE ALL ON FUNCTION public.credit_tokens_atomic FROM anon;
REVOKE ALL ON FUNCTION public.credit_tokens_atomic FROM authenticated;


-- ── 3. increment_voucher_usage — called by redeem-voucher ────
-- Was missing: redeem-voucher fell back to non-atomic UPDATE
CREATE OR REPLACE FUNCTION public.increment_voucher_usage(p_voucher_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.vouchers
  SET times_used = times_used + 1
  WHERE id = p_voucher_id;
END;
$$;

REVOKE ALL ON FUNCTION public.increment_voucher_usage FROM PUBLIC;
REVOKE ALL ON FUNCTION public.increment_voucher_usage FROM anon;
REVOKE ALL ON FUNCTION public.increment_voucher_usage FROM authenticated;


-- ── 4. increment_usage — called by log-usage edge function ───
-- Was missing: log-usage fell back to two-step read+write
CREATE OR REPLACE FUNCTION public.increment_usage(
  p_user_id    UUID,
  p_user_email TEXT,
  p_tool_name  TEXT,
  p_usage_date DATE,
  p_table      TEXT,      -- 'usage_logs' or 'daily_usage_logs'
  p_increment  INT DEFAULT 1
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

REVOKE ALL ON FUNCTION public.increment_usage FROM PUBLIC;
REVOKE ALL ON FUNCTION public.increment_usage FROM anon;
REVOKE ALL ON FUNCTION public.increment_usage FROM authenticated;


-- ── 5. Ensure token_balance cannot go negative ──────────────
DO $$
BEGIN
  ALTER TABLE public.profiles
    ADD CONSTRAINT chk_token_balance_non_negative
    CHECK (token_balance >= 0);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;


-- ── 6. Harden RLS on token_transactions ─────────────────────
-- Users should ONLY read, never insert/update/delete directly.
-- All writes go through SECURITY DEFINER RPCs.

-- Drop overly permissive policies if they exist
DO $$
BEGIN
  DROP POLICY IF EXISTS "users_own_token_transactions" ON public.token_transactions;
  DROP POLICY IF EXISTS "Users can view own token transactions" ON public.token_transactions;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Read-only for authenticated users (own rows only)
CREATE POLICY "token_transactions_select_own"
  ON public.token_transactions FOR SELECT
  USING (auth.uid() = user_id);

-- No INSERT/UPDATE/DELETE for authenticated — only SECURITY DEFINER functions write here


-- ── 7. Harden RLS on profiles token_balance ─────────────────
-- Users can read own profile but should NOT directly UPDATE token_balance.
-- We achieve this by keeping the existing update policy but adding a trigger guard.

CREATE OR REPLACE FUNCTION public.guard_token_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only SECURITY DEFINER functions (running as owner) can change token_balance.
  -- Regular authenticated users' UPDATE statements go through RLS as the JWT role.
  -- If current_setting shows the role is 'authenticated', block balance changes.
  IF NEW.token_balance IS DISTINCT FROM OLD.token_balance THEN
    IF current_setting('request.jwt.claim.role', true) = 'authenticated' THEN
      RAISE EXCEPTION 'Direct token_balance modification is not allowed. Use the token API.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_token_balance_trigger ON public.profiles;
CREATE TRIGGER guard_token_balance_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_token_balance();


-- ── 8. Index for faster transaction history queries ──────────
CREATE INDEX IF NOT EXISTS idx_token_transactions_type
  ON public.token_transactions(user_id, type);

CREATE INDEX IF NOT EXISTS idx_token_transactions_tool
  ON public.token_transactions(tool_name)
  WHERE tool_name IS NOT NULL;
