-- Server-authoritative AI billing. A browser may request an AI action, but
-- only this RPC can reserve, complete or refund the associated VX usage.

CREATE TABLE IF NOT EXISTS public.ai_usage_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_id UUID NOT NULL,
  tool_name TEXT NOT NULL,
  action_class TEXT NOT NULL CHECK (action_class IN ('light', 'medium', 'pro')),
  token_cost NUMERIC NOT NULL DEFAULT 0 CHECK (token_cost >= 0),
  access_mode TEXT NOT NULL CHECK (access_mode IN ('token', 'free_quota', 'admin')),
  status TEXT NOT NULL DEFAULT 'reserved' CHECK (status IN ('reserved', 'completed', 'refunded')),
  failure_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (user_id, request_id)
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_requests_user_created
  ON public.ai_usage_requests (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_requests_quota
  ON public.ai_usage_requests (user_id, tool_name, created_at DESC)
  WHERE access_mode = 'free_quota';

ALTER TABLE public.ai_usage_requests ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.reserve_ai_usage(
  p_user_id UUID,
  p_request_id UUID,
  p_tool_name TEXT,
  p_action_class TEXT,
  p_token_cost NUMERIC,
  p_free_limit INTEGER DEFAULT 0,
  p_allow_free_fallback BOOLEAN DEFAULT false,
  p_description TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_status TEXT;
  v_current NUMERIC;
  v_new NUMERIC;
  v_is_admin BOOLEAN;
  v_access_mode TEXT;
  v_free_used INTEGER;
  v_recent_count INTEGER;
BEGIN
  IF p_tool_name !~ '^[a-z0-9_-]{1,64}$' OR p_action_class NOT IN ('light', 'medium', 'pro') OR p_token_cost < 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_request');
  END IF;

  SELECT status INTO v_existing_status
  FROM public.ai_usage_requests
  WHERE user_id = p_user_id AND request_id = p_request_id
  FOR UPDATE;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', CASE v_existing_status
        WHEN 'reserved' THEN 'request_in_progress'
        WHEN 'completed' THEN 'request_already_completed'
        ELSE 'request_already_refunded'
      END
    );
  END IF;

  SELECT token_balance, is_admin
    INTO v_current, v_is_admin
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'profile_not_found');
  END IF;

  v_current := COALESCE(v_current, 0);

  -- Serialise usage decisions for this account before checking quotas. This
  -- prevents concurrent tabs from consuming more than the daily free limit.
  SELECT COUNT(*) INTO v_recent_count
  FROM public.ai_usage_requests
  WHERE user_id = p_user_id
    AND created_at >= now() - INTERVAL '1 minute';

  IF v_recent_count >= 12 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'rate_limited');
  END IF;

  IF v_is_admin THEN
    v_access_mode := 'admin';
  ELSIF v_current >= p_token_cost THEN
    v_access_mode := 'token';
    v_new := v_current - p_token_cost;
    UPDATE public.profiles SET token_balance = v_new WHERE id = p_user_id;
    INSERT INTO public.token_transactions (
      user_id, amount, type, tool_name, description, balance_after, metadata
    ) VALUES (
      p_user_id, -p_token_cost, 'spend', p_tool_name,
      COALESCE(p_description, 'AI ' || p_tool_name), v_new,
      p_metadata || jsonb_build_object('request_id', p_request_id::text, 'action_class', p_action_class, 'tokens_spent', p_token_cost)
    );
  ELSIF p_allow_free_fallback AND p_free_limit > 0 THEN
    SELECT COUNT(*) INTO v_free_used
    FROM public.ai_usage_requests
    WHERE user_id = p_user_id
      AND tool_name = p_tool_name
      AND access_mode = 'free_quota'
      AND status IN ('reserved', 'completed')
      AND created_at >= date_trunc('day', now());

    IF v_free_used >= p_free_limit THEN
      RETURN jsonb_build_object('ok', false, 'error', 'insufficient_balance', 'balance', v_current, 'required', p_token_cost);
    END IF;
    v_access_mode := 'free_quota';
  ELSE
    RETURN jsonb_build_object('ok', false, 'error', 'insufficient_balance', 'balance', v_current, 'required', p_token_cost);
  END IF;

  INSERT INTO public.ai_usage_requests (
    user_id, request_id, tool_name, action_class, token_cost, access_mode, metadata
  ) VALUES (
    p_user_id, p_request_id, p_tool_name, p_action_class, p_token_cost, v_access_mode,
    p_metadata || jsonb_build_object('request_id', p_request_id::text)
  );

  RETURN jsonb_build_object(
    'ok', true,
    'access_mode', v_access_mode,
    'lite', v_access_mode = 'free_quota',
    'spent', CASE WHEN v_access_mode = 'token' THEN p_token_cost ELSE 0 END,
    'balance', CASE WHEN v_access_mode = 'token' THEN v_new ELSE v_current END
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_ai_usage(
  p_user_id UUID,
  p_request_id UUID,
  p_success BOOLEAN,
  p_failure_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request public.ai_usage_requests%ROWTYPE;
  v_current NUMERIC;
  v_new NUMERIC;
BEGIN
  SELECT * INTO v_request
  FROM public.ai_usage_requests
  WHERE user_id = p_user_id AND request_id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'request_not_found');
  END IF;

  IF v_request.status = 'completed' OR v_request.status = 'refunded' THEN
    RETURN jsonb_build_object('ok', true, 'status', v_request.status);
  END IF;

  IF p_success THEN
    UPDATE public.ai_usage_requests
      SET status = 'completed', completed_at = now(), failure_reason = NULL
      WHERE id = v_request.id;
    RETURN jsonb_build_object('ok', true, 'status', 'completed');
  END IF;

  IF v_request.access_mode = 'token' AND v_request.token_cost > 0 THEN
    SELECT token_balance INTO v_current
    FROM public.profiles
    WHERE id = p_user_id
    FOR UPDATE;
    v_new := COALESCE(v_current, 0) + v_request.token_cost;
    UPDATE public.profiles SET token_balance = v_new WHERE id = p_user_id;
    INSERT INTO public.token_transactions (
      user_id, amount, type, tool_name, description, balance_after, metadata
    ) VALUES (
      p_user_id, v_request.token_cost, 'refund', v_request.tool_name,
      'Automatic refund: AI request failed', v_new,
      v_request.metadata || jsonb_build_object('request_id', p_request_id::text, 'reason', COALESCE(p_failure_reason, 'provider_failure'))
    );
  END IF;

  UPDATE public.ai_usage_requests
    SET status = 'refunded', completed_at = now(), failure_reason = left(COALESCE(p_failure_reason, 'provider_failure'), 240)
    WHERE id = v_request.id;
  RETURN jsonb_build_object('ok', true, 'status', 'refunded');
END;
$$;

REVOKE ALL ON TABLE public.ai_usage_requests FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.reserve_ai_usage(UUID, UUID, TEXT, TEXT, NUMERIC, INTEGER, BOOLEAN, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.complete_ai_usage(UUID, UUID, BOOLEAN, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_ai_usage(UUID, UUID, TEXT, TEXT, NUMERIC, INTEGER, BOOLEAN, TEXT, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_ai_usage(UUID, UUID, BOOLEAN, TEXT) TO service_role;
