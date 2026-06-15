-- Payment fulfillment must be idempotent at the database layer.
-- Application-level "check then insert" guards cannot prevent concurrent
-- Stripe webhook deliveries from inserting or granting the same session twice.

BEGIN;

-- Production already has this column, but older local migration chains do not.
-- Keep fresh environments capable of applying the idempotency indexes below.
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::JSONB;

-- Preserve the earliest completed event for each Stripe Checkout session and
-- remove duplicates before creating the unique index.
WITH ranked_purchase_events AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY stripe_session_id
      ORDER BY
        CASE WHEN status = 'completed' THEN 0 ELSE 1 END,
        created_at ASC,
        id ASC
    ) AS duplicate_rank
  FROM public.purchase_events
  WHERE stripe_session_id IS NOT NULL
)
DELETE FROM public.purchase_events pe
USING ranked_purchase_events ranked
WHERE pe.id = ranked.id
  AND ranked.duplicate_rank > 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_purchase_events_stripe_session_unique
  ON public.purchase_events(stripe_session_id)
  WHERE stripe_session_id IS NOT NULL;

-- Each checkout session may grant at most one row for a specific add-on/SKU.
-- This covers kits, PropertyFlow, icon products, and regular add-ons.
WITH ranked_addon_purchases AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY user_id, addon_id, (metadata->>'stripe_session_id')
      ORDER BY created_at ASC, id ASC
    ) AS duplicate_rank
  FROM public.addons_purchased
  WHERE metadata->>'stripe_session_id' IS NOT NULL
)
DELETE FROM public.addons_purchased ap
USING ranked_addon_purchases ranked
WHERE ap.id = ranked.id
  AND ranked.duplicate_rank > 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_addons_purchased_stripe_session_addon_unique
  ON public.addons_purchased(user_id, addon_id, (metadata->>'stripe_session_id'))
  WHERE metadata->>'stripe_session_id' IS NOT NULL;

-- Builder project creation is a secondary kit fulfillment path. A concurrent
-- webhook retry must not create two projects for the same checkout session.
WITH ranked_kit_projects AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY user_id, (metadata->>'stripe_session_id')
      ORDER BY created_at ASC, id ASC
    ) AS duplicate_rank
  FROM public.projects
  WHERE metadata->>'stripe_session_id' IS NOT NULL
)
UPDATE public.projects project
SET deleted_at = COALESCE(project.deleted_at, now())
FROM ranked_kit_projects ranked
WHERE project.id = ranked.id
  AND ranked.duplicate_rank > 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_projects_stripe_session_unique
  ON public.projects(user_id, (metadata->>'stripe_session_id'))
  WHERE metadata->>'stripe_session_id' IS NOT NULL
    AND deleted_at IS NULL;

-- Token purchases require an atomic idempotency check before changing balance.
-- Advisory locking serializes concurrent deliveries for the same Stripe
-- session, while token_transactions remains the durable fulfillment ledger.
CREATE OR REPLACE FUNCTION public.credit_token_purchase_atomic(
  p_user_id UUID,
  p_amount INTEGER,
  p_stripe_session_id TEXT,
  p_lookup_key TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $body$
DECLARE
  v_current INTEGER;
  v_new INTEGER;
BEGIN
  IF p_stripe_session_id IS NULL OR length(trim(p_stripe_session_id)) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'missing_stripe_session_id');
  END IF;

  IF p_amount <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_amount');
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_stripe_session_id, 0));

  IF EXISTS (
    SELECT 1
    FROM public.token_transactions
    WHERE type = 'purchase'
      AND metadata->>'stripe_session_id' = p_stripe_session_id
  ) THEN
    SELECT COALESCE(token_balance, 0)
    INTO v_current
    FROM public.profiles
    WHERE id = p_user_id;

    RETURN jsonb_build_object(
      'ok', true,
      'duplicate', true,
      'balance', COALESCE(v_current, 0),
      'credited', 0
    );
  END IF;

  SELECT token_balance
  INTO v_current
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
    user_id,
    amount,
    type,
    description,
    balance_after,
    metadata
  ) VALUES (
    p_user_id,
    p_amount,
    'purchase',
    COALESCE(p_description, 'Token purchase: ' || p_amount),
    v_new,
    jsonb_build_object(
      'stripe_session_id', p_stripe_session_id,
      'lookup_key', p_lookup_key
    )
  );

  RETURN jsonb_build_object(
    'ok', true,
    'duplicate', false,
    'balance', v_new,
    'credited', p_amount
  );
END;
$body$;

REVOKE ALL ON FUNCTION public.credit_token_purchase_atomic(UUID, INTEGER, TEXT, TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;

COMMIT;
