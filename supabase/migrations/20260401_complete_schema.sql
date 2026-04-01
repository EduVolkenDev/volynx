-- ============================================================
-- VOLYNX complete schema — adds all missing columns & tables
-- Safe to re-run: all operations are idempotent
-- ============================================================

-- ── 1. Add missing columns to profiles ──────────────────────
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS plan              text DEFAULT 'free';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS builder_plan      text DEFAULT 'free';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS stripe_customer_id text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS token_balance     numeric DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS org_id            text;

-- ── 2. RLS: allow profile INSERT (needed for upsert fallback) ─
DO $$ BEGIN
  CREATE POLICY "Users can insert own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── 3. Subscriptions table ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id                     uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id                uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id     text,
  stripe_subscription_id text UNIQUE NOT NULL,
  status                 text NOT NULL DEFAULT 'active',
  price_id               text,
  plan_key               text,
  lookup_key             text,
  current_period_end     timestamptz,
  cancel_at_period_end   boolean DEFAULT false,
  created_at             timestamptz DEFAULT now(),
  updated_at             timestamptz DEFAULT now()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can view own subscriptions"
    ON public.subscriptions FOR SELECT
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id
  ON public.subscriptions(user_id);

CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_sub_id
  ON public.subscriptions(stripe_subscription_id);

-- ── 4. Token transactions table ─────────────────────────────
CREATE TABLE IF NOT EXISTS public.token_transactions (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount       numeric NOT NULL,
  type         text NOT NULL,  -- 'purchase', 'spend', 'refund'
  tool_name    text,
  description  text,
  balance_after numeric,
  metadata     jsonb DEFAULT '{}'::jsonb,
  created_at   timestamptz DEFAULT now()
);

ALTER TABLE public.token_transactions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can view own token transactions"
    ON public.token_transactions FOR SELECT
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_token_transactions_user_id
  ON public.token_transactions(user_id);

CREATE INDEX IF NOT EXISTS idx_token_transactions_created
  ON public.token_transactions(user_id, created_at DESC);

-- ── 5. Purchase events table ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.purchase_events (
  id                       uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id                  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_session_id        text,
  stripe_payment_intent_id text,
  product_key              text,
  lookup_key               text,
  amount_paid              numeric,
  currency                 text,
  tokens_credited          numeric DEFAULT 0,
  status                   text DEFAULT 'completed',
  metadata                 jsonb DEFAULT '{}'::jsonb,
  created_at               timestamptz DEFAULT now()
);

ALTER TABLE public.purchase_events ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can view own purchase events"
    ON public.purchase_events FOR SELECT
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_purchase_events_user_id
  ON public.purchase_events(user_id);

-- ── 6. Addons purchased table ───────────────────────────────
CREATE TABLE IF NOT EXISTS public.addons_purchased (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  addon_id   text NOT NULL,
  price_paid numeric,
  currency   text,
  status     text DEFAULT 'active',
  metadata   jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.addons_purchased ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can view own addons"
    ON public.addons_purchased FOR SELECT
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_addons_purchased_user_id
  ON public.addons_purchased(user_id);

-- ── 7. Projects table (Builder) ─────────────────────────────
CREATE TABLE IF NOT EXISTS public.projects (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name         text NOT NULL,
  slug         text,
  domain_type  text DEFAULT 'subdomain',
  builder_data jsonb DEFAULT '{}'::jsonb,
  status       text DEFAULT 'draft',
  deleted_at   timestamptz,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can view own projects"
    ON public.projects FOR SELECT
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can insert own projects"
    ON public.projects FOR INSERT
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update own projects"
    ON public.projects FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete own projects"
    ON public.projects FOR DELETE
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_projects_user_id
  ON public.projects(user_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_projects_slug_unique
  ON public.projects(user_id, slug)
  WHERE deleted_at IS NULL;

-- ── 8. Builder plan limits table ────────────────────────────
CREATE TABLE IF NOT EXISTS public.builder_plan_limits (
  plan             text PRIMARY KEY,
  max_drafts       integer NOT NULL DEFAULT 1,
  max_published    integer NOT NULL DEFAULT 0,
  custom_domain    boolean NOT NULL DEFAULT false,
  remove_branding  boolean NOT NULL DEFAULT false,
  premium_kits     boolean NOT NULL DEFAULT false
);

ALTER TABLE public.builder_plan_limits ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Anyone can read plan limits"
    ON public.builder_plan_limits FOR SELECT
    USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Seed default plan limits (idempotent via ON CONFLICT)
INSERT INTO public.builder_plan_limits (plan, max_drafts, max_published, custom_domain, remove_branding, premium_kits)
VALUES
  ('free',       1,  0, false, false, false),
  ('launch',     3,  1, false, false, false),
  ('pro',        10, 3, true,  true,  true),
  ('studio',     25, 10, true,  true,  true),
  ('teams',      50, 25, true,  true,  true),
  ('enterprise', -1, -1, true,  true,  true)
ON CONFLICT (plan) DO NOTHING;

-- ── 9. Updated_at triggers for new tables ───────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS subscriptions_set_updated_at ON public.subscriptions;
CREATE TRIGGER subscriptions_set_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS projects_set_updated_at ON public.projects;
CREATE TRIGGER projects_set_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
