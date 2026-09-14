-- PayPal is an external processor. Keep its order/payment references separate
-- from Stripe session IDs so the existing Stripe fulfillment remains intact.

CREATE TABLE IF NOT EXISTS public.payment_orders (
  id                  uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id             uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider            text NOT NULL CHECK (provider IN ('paypal')),
  provider_order_id   text,
  provider_payment_id text,
  checkout_attempt_id uuid NOT NULL,
  lookup_key          text NOT NULL,
  amount_minor        bigint NOT NULL CHECK (amount_minor > 0),
  currency            text NOT NULL CHECK (currency = lower(currency)),
  status              text NOT NULL DEFAULT 'created'
                      CHECK (status IN ('created', 'approved', 'completed', 'failed', 'cancelled')),
  metadata            jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_orders ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can view own payment orders"
    ON public.payment_orders FOR SELECT
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_orders_attempt_unique
  ON public.payment_orders(user_id, checkout_attempt_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_orders_provider_order_unique
  ON public.payment_orders(provider, provider_order_id)
  WHERE provider_order_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_orders_provider_payment_unique
  ON public.payment_orders(provider, provider_payment_id)
  WHERE provider_payment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payment_orders_user_status
  ON public.payment_orders(user_id, status, created_at DESC);

ALTER TABLE public.purchase_events
  ADD COLUMN IF NOT EXISTS payment_provider text,
  ADD COLUMN IF NOT EXISTS provider_payment_id text,
  ADD COLUMN IF NOT EXISTS checkout_attempt_id uuid;

CREATE UNIQUE INDEX IF NOT EXISTS idx_purchase_events_provider_payment_unique
  ON public.purchase_events(payment_provider, provider_payment_id)
  WHERE payment_provider IS NOT NULL AND provider_payment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_purchase_events_checkout_attempt
  ON public.purchase_events(checkout_attempt_id)
  WHERE checkout_attempt_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.credit_external_token_purchase_atomic(
  p_user_id UUID,
  p_amount INTEGER,
  p_provider TEXT,
  p_provider_payment_id TEXT,
  p_lookup_key TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current INTEGER;
  v_new INTEGER;
BEGIN
  IF p_amount <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_amount');
  END IF;
  IF length(trim(COALESCE(p_provider, ''))) = 0
     OR length(trim(COALESCE(p_provider_payment_id, ''))) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'missing_provider_reference');
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_provider || ':' || p_provider_payment_id, 0));

  IF EXISTS (
    SELECT 1
    FROM public.token_transactions
    WHERE type = 'purchase'
      AND metadata->>'payment_provider' = p_provider
      AND metadata->>'provider_payment_id' = p_provider_payment_id
  ) THEN
    SELECT COALESCE(token_balance, 0) INTO v_current
    FROM public.profiles WHERE id = p_user_id;
    RETURN jsonb_build_object('ok', true, 'duplicate', true, 'balance', COALESCE(v_current, 0), 'credited', 0);
  END IF;

  SELECT token_balance INTO v_current
  FROM public.profiles WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'profile_not_found');
  END IF;

  v_current := COALESCE(v_current, 0);
  v_new := v_current + p_amount;

  UPDATE public.profiles SET token_balance = v_new WHERE id = p_user_id;

  INSERT INTO public.token_transactions (
    user_id, amount, type, description, balance_after, metadata
  ) VALUES (
    p_user_id,
    p_amount,
    'purchase',
    COALESCE(p_description, 'External token purchase: ' || p_amount),
    v_new,
    jsonb_build_object(
      'payment_provider', p_provider,
      'provider_payment_id', p_provider_payment_id,
      'lookup_key', p_lookup_key
    )
  );

  RETURN jsonb_build_object('ok', true, 'duplicate', false, 'balance', v_new, 'credited', p_amount);
END;
$$;
