-- ─── VOLYNX — Voucher & Redemption System ────────────────────────────────────
-- Supports: Black Diamond, Founder, VIP, Beta, token packs, discount codes,
-- Daily-specific vouchers, and any future voucher type.

-- ── Vouchers (the codes themselves) ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.vouchers (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code           TEXT UNIQUE NOT NULL,
  type           TEXT NOT NULL DEFAULT 'generic',
  -- type examples: black_diamond, founder, vip_access, beta_access,
  --               launch_credit, token_pack, discount_code, daily_access, builder_bonus

  -- Usage limits
  max_uses       INT NOT NULL DEFAULT 1,     -- -1 = unlimited
  times_used     INT NOT NULL DEFAULT 0,

  -- Targeting
  target_email   TEXT,                        -- NULL = anyone can redeem; set = personalized
  transferable   BOOLEAN NOT NULL DEFAULT true,

  -- Expiration
  expires_at     TIMESTAMPTZ,                -- NULL = never expires

  -- What this voucher grants (flexible JSONB)
  -- Examples:
  --   { "tokens": 60 }
  --   { "builder_plan": "pro", "tokens": 25 }
  --   { "daily_plan": "diamond" }
  --   { "badge": "black_diamond", "tokens": 60 }
  --   { "builder_plan": "studio", "daily_plan": "pro", "tokens": 100 }
  --   { "discount_percent": 20, "discount_months": 3 }
  grants         JSONB NOT NULL DEFAULT '{}',

  -- Metadata
  label          TEXT,                        -- Human-readable name: "Black Diamond Founding Invite"
  description    TEXT,                        -- Internal notes
  created_by     TEXT,                        -- admin email or "system"
  active         BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vouchers_code ON public.vouchers(code);
CREATE INDEX IF NOT EXISTS idx_vouchers_type ON public.vouchers(type);
CREATE INDEX IF NOT EXISTS idx_vouchers_active ON public.vouchers(active) WHERE active = true;

-- ── Redemption log ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.voucher_redemptions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voucher_id      UUID NOT NULL REFERENCES public.vouchers(id) ON DELETE RESTRICT,
  user_id         UUID NOT NULL,
  user_email      TEXT NOT NULL,
  grants_applied  JSONB NOT NULL DEFAULT '{}',   -- snapshot of what was granted
  redeemed_at     TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(voucher_id, user_id)                    -- one redemption per user per voucher
);

CREATE INDEX IF NOT EXISTS idx_redemptions_user ON public.voucher_redemptions(user_id);
CREATE INDEX IF NOT EXISTS idx_redemptions_voucher ON public.voucher_redemptions(voucher_id);

-- ── RLS ────────────────────────────────────────────────────────────────────────
ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voucher_redemptions ENABLE ROW LEVEL SECURITY;

-- Service role can do everything (webhook/edge functions use service role)
CREATE POLICY "service_role_vouchers" ON public.vouchers FOR ALL USING (true);
CREATE POLICY "service_role_redemptions" ON public.voucher_redemptions FOR ALL USING (true);

-- Users can see their own redemptions
CREATE POLICY "users_own_redemptions" ON public.voucher_redemptions
  FOR SELECT USING (auth.uid() = user_id);

-- ── Auto-update updated_at ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.vouchers_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS vouchers_set_updated_at ON public.vouchers;
CREATE TRIGGER vouchers_set_updated_at
  BEFORE UPDATE ON public.vouchers
  FOR EACH ROW EXECUTE FUNCTION public.vouchers_updated_at();
