-- ============================================================
-- VOLYNX — Pix Payments (Mercado Pago) tracking table
-- Stores QR code references, payment status, and reconciliation
-- ============================================================

CREATE TABLE IF NOT EXISTS public.pix_payments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email        TEXT,

  -- Mercado Pago identifiers
  mp_payment_id     TEXT UNIQUE,          -- Mercado Pago payment.id (from webhook)
  mp_preference_id  TEXT,                 -- preference ID (from checkout creation)
  external_reference TEXT NOT NULL,       -- our internal ref: "vx_pix_{uuid}"

  -- What was purchased
  product_type      TEXT NOT NULL,        -- 'token_pack' | 'subscription' | 'addon' | 'kit'
  product_key       TEXT NOT NULL,        -- 'tokens_starter' | 'tokens_core' | ...
  tokens_amount     INT DEFAULT 0,        -- tokens to credit on approval

  -- Payment details
  amount            NUMERIC NOT NULL,     -- in BRL (centavos → reais)
  currency          TEXT DEFAULT 'BRL',
  status            TEXT NOT NULL DEFAULT 'pending',
  -- status: pending | approved | rejected | cancelled | refunded | expired

  -- Pix QR data (returned by MP API)
  pix_qr_code       TEXT,                -- base64 QR image
  pix_qr_code_base64 TEXT,               -- raw base64 for rendering
  pix_copy_paste     TEXT,               -- copia-e-cola string
  pix_expiration     TIMESTAMPTZ,        -- when QR expires

  -- Metadata
  mp_raw_webhook    JSONB DEFAULT '{}'::JSONB,   -- full webhook payload for audit
  credited_at       TIMESTAMPTZ,                  -- when tokens were actually credited
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pix_payments ENABLE ROW LEVEL SECURITY;

-- Users can see their own payments
DO $$ BEGIN
  CREATE POLICY "users_own_pix_payments"
    ON public.pix_payments FOR SELECT
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- No direct INSERT/UPDATE from clients — only edge functions (service role)

CREATE INDEX IF NOT EXISTS idx_pix_payments_user
  ON public.pix_payments(user_id);

CREATE INDEX IF NOT EXISTS idx_pix_payments_external_ref
  ON public.pix_payments(external_reference);

CREATE INDEX IF NOT EXISTS idx_pix_payments_mp_payment
  ON public.pix_payments(mp_payment_id)
  WHERE mp_payment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pix_payments_status
  ON public.pix_payments(status)
  WHERE status = 'pending';

-- Auto-update updated_at
DROP TRIGGER IF EXISTS pix_payments_set_updated_at ON public.pix_payments;
CREATE TRIGGER pix_payments_set_updated_at
  BEFORE UPDATE ON public.pix_payments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
