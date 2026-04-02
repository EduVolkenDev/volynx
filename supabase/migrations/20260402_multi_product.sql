-- ============================================================
-- VOLYNX multi-product schema — adds Daily OS support
-- Safe to re-run: all operations are idempotent
-- ============================================================

-- ── 1. Add daily_plan to profiles ─────────────────────────────
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS daily_plan text DEFAULT 'free';

-- ── 2. Product entitlements reference table ───────────────────
-- Stores what each product+tier grants. Used by check-permission.
CREATE TABLE IF NOT EXISTS public.product_entitlements (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  product_key   text NOT NULL,                   -- volynx | daily | volynxlab
  plan_tier     text NOT NULL,                   -- free | pro | diamond | launch | studio | teams
  plan_key      text NOT NULL,                   -- volynx_pro | daily_diamond
  rank          integer NOT NULL DEFAULT 0,      -- 0=free, higher=more access
  entitlements  text[] NOT NULL DEFAULT '{}',    -- feature flags
  quotas        jsonb DEFAULT '{}'::jsonb,       -- per-tool daily/monthly limits (-1 = unlimited)
  created_at    timestamptz DEFAULT now(),

  UNIQUE(product_key, plan_tier)
);

ALTER TABLE public.product_entitlements ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Anyone can read product entitlements"
    ON public.product_entitlements FOR SELECT
    USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── 3. Seed Volynx entitlements ──────────────────────────────
INSERT INTO public.product_entitlements (product_key, plan_tier, plan_key, rank, entitlements, quotas)
VALUES
  ('volynx', 'free',   'volynx_free',   0, ARRAY['builder_editor','builder_preview','1_draft'], '{}'),
  ('volynx', 'launch', 'volynx_launch', 1, ARRAY['builder_editor','builder_preview','builder_publish','1_site','subdomain','basic_kits','basic_analytics'], '{}'),
  ('volynx', 'pro',    'volynx_pro',    2, ARRAY['builder_editor','builder_preview','builder_publish','3_sites','custom_domain','remove_branding','premium_kits','icons_bonus','publish_priority'], '{}'),
  ('volynx', 'studio', 'volynx_studio', 3, ARRAY['builder_editor','builder_preview','builder_publish','10_sites','multi_domain','premium_kits_full','export_discount','advanced_analytics','icons_perks'], '{}'),
  ('volynx', 'teams',  'volynx_teams',  4, ARRAY['builder_editor','builder_preview','builder_publish','25_sites','workspace','shared_assets','central_billing','icons_pool','priority_support'], '{}')
ON CONFLICT (product_key, plan_tier) DO NOTHING;

-- ── 4. Seed Daily entitlements ───────────────────────────────
INSERT INTO public.product_entitlements (product_key, plan_tier, plan_key, rank, entitlements, quotas)
VALUES
  ('daily', 'free',    'daily_free',    0,
   ARRAY['daily_myday','daily_scanner_basic','daily_summary_basic','daily_vault_basic','daily_writing_basic','daily_decision_basic'],
   '{"scanner":5,"summary":5,"vault":20,"writing":5,"decision":3}'::jsonb),

  ('daily', 'pro',     'daily_pro',     1,
   ARRAY['daily_myday','daily_scanner_full','daily_summary_full','daily_vault_full','daily_writing_full','daily_decision_full','daily_sync','daily_export','daily_cloud'],
   '{"scanner":-1,"summary":-1,"vault":-1,"writing":-1,"decision":-1}'::jsonb),

  ('daily', 'diamond', 'daily_diamond', 2,
   ARRAY['daily_myday','daily_scanner_full','daily_summary_full','daily_vault_full','daily_writing_full','daily_decision_full','daily_sync','daily_export','daily_cloud','daily_api','daily_priority','daily_shared_vaults','daily_team_notes','daily_analytics'],
   '{"scanner":-1,"summary":-1,"vault":-1,"writing":-1,"decision":-1}'::jsonb)
ON CONFLICT (product_key, plan_tier) DO NOTHING;

-- ── 5. Seed VolynxLab entitlements ───────────────────────────
INSERT INTO public.product_entitlements (product_key, plan_tier, plan_key, rank, entitlements, quotas)
VALUES
  ('volynxlab', 'free', 'volynxlab_free', 0,
   ARRAY['lab_converter','lab_scaler','lab_qr'],
   '{"converter":5,"image-scaler":5,"image-suite":0,"qr-gen":5}'::jsonb),

  ('volynxlab', 'pro',  'volynxlab_pro',  1,
   ARRAY['lab_converter','lab_scaler','lab_qr','lab_suite','lab_batch','lab_zip','lab_commercial'],
   '{"converter":-1,"image-scaler":-1,"image-suite":-1,"qr-gen":-1}'::jsonb)
ON CONFLICT (product_key, plan_tier) DO NOTHING;

-- ── 6. Bundle tracking table ─────────────────────────────────
-- Records active bundles so we know which products to downgrade together
CREATE TABLE IF NOT EXISTS public.active_bundles (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bundle_key      text NOT NULL,          -- bundle_volynx_daily_pro
  subscription_id text,                   -- stripe_subscription_id
  status          text DEFAULT 'active',  -- active | canceled
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now(),

  UNIQUE(user_id, bundle_key)
);

ALTER TABLE public.active_bundles ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can view own bundles"
    ON public.active_bundles FOR SELECT
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_active_bundles_user_id
  ON public.active_bundles(user_id);

-- ── 7. Add product_key column to subscriptions ───────────────
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS product_key text;

-- Backfill existing subscriptions
UPDATE public.subscriptions
SET product_key = 'volynx'
WHERE product_key IS NULL
  AND (plan_key LIKE 'builder_%' OR plan_key = 'studio_pro');

-- ── 8. Add product_key to purchase_events ────────────────────
-- Already exists but may contain old naming. No schema change needed.

-- ── 9. Daily usage tracking table ────────────────────────────
-- Separate from volynxlab usage_logs — daily tools have their own quotas
CREATE TABLE IF NOT EXISTS public.daily_usage_logs (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tool_name   text NOT NULL,       -- scanner | summary | vault | writing | decision
  usage_date  date NOT NULL DEFAULT CURRENT_DATE,
  usage_count integer NOT NULL DEFAULT 1,

  UNIQUE(user_id, tool_name, usage_date)
);

ALTER TABLE public.daily_usage_logs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can view own daily usage"
    ON public.daily_usage_logs FOR SELECT
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can insert own daily usage"
    ON public.daily_usage_logs FOR INSERT
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update own daily usage"
    ON public.daily_usage_logs FOR UPDATE
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_daily_usage_user_date
  ON public.daily_usage_logs(user_id, usage_date);

-- ── 10. Trigger for active_bundles.updated_at ────────────────
DROP TRIGGER IF EXISTS active_bundles_set_updated_at ON public.active_bundles;
CREATE TRIGGER active_bundles_set_updated_at
  BEFORE UPDATE ON public.active_bundles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
