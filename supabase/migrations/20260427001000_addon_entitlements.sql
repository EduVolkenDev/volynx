-- Add-on entitlements — single source of truth for what each addon_id grants.
--
-- The audit found 6 add-ons whose webhook only inserted a row into
-- addons_purchased and stopped there: no feature toggle, no ZIP, no email.
-- This migration introduces a thin lookup table (addon_id → features +
-- delivery hints) and a per-user view that joins it to addons_purchased so
-- the Builder UI / delivery page can render entitlements with one read.
--
-- Why a table + view (not a const map and not profiles.addons jsonb):
--   - addons_purchased is already the system of record for "user X owns Y";
--     duplicating into profiles.addons would force RMW on every webhook
--     event and lose us the one-row-per-purchase audit trail.
--   - A const map in src/data/products.ts (Astro client) would mean the
--     Edge runtime (Deno webhook) can't read the same source — DB is the
--     only place both sides reach.

CREATE TABLE IF NOT EXISTS public.addon_entitlements (
  addon_id      text PRIMARY KEY,
  features      text[] NOT NULL DEFAULT '{}',
  billing       text   NOT NULL CHECK (billing IN ('one_time', 'subscription')),
  slot_delta    integer NOT NULL DEFAULT 0,
  download_zip  text,
  display_name  text   NOT NULL,
  description   text,
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- RLS: the catalog is public (all 6 add-ons are public products). Same posture
-- as product_entitlements at 202604020001_multi_product.sql.
ALTER TABLE public.addon_entitlements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "addon_entitlements_read" ON public.addon_entitlements;
CREATE POLICY "addon_entitlements_read"
  ON public.addon_entitlements
  FOR SELECT
  USING (true);

GRANT SELECT ON public.addon_entitlements TO anon, authenticated;

-- Seed the 6 catalog rows. Use ON CONFLICT so re-running the migration in
-- preview branches doesn't blow up.
INSERT INTO public.addon_entitlements (addon_id, features, billing, slot_delta, download_zip, display_name, description) VALUES
  ('domain_setup',  ARRAY['custom_domain_setup'],   'one_time',     0, NULL,
    'Domain Setup', 'Guided custom-domain provisioning in Builder publish wizard.'),
  ('template_pack', ARRAY['premium_template_pack'], 'one_time',     0, 'addons/template-pack-v1.zip',
    'Premium Template Pack', 'Curated Builder presets unlocked across all kits.'),
  ('html_export',   ARRAY['html_export'],           'one_time',     0, NULL,
    'HTML Export', 'One-click static HTML export from Builder Studio.'),
  ('extra_slot',    ARRAY['site_slot_bonus'],       'subscription', 1, NULL,
    'Extra Site Slot', 'One additional published site, on top of your plan limit.'),
  ('bilingual',     ARRAY['bilingual_publish'],     'one_time',     0, NULL,
    'Bilingual Publish', 'Publish a single Builder site in EN + PT with proper hreflang.'),
  ('icons',         ARRAY['icons_addon_pack'],      'one_time',     0, 'addons/icons-pack-5collections.zip',
    'Icons Add-on Pack', 'Five premium icon collections delivered as one ZIP.')
ON CONFLICT (addon_id) DO UPDATE
  SET features      = EXCLUDED.features,
      billing       = EXCLUDED.billing,
      slot_delta    = EXCLUDED.slot_delta,
      download_zip  = EXCLUDED.download_zip,
      display_name  = EXCLUDED.display_name,
      description   = EXCLUDED.description;

-- v_user_entitlements: the single read every UI uses to ask "what does this
-- user have?". Joins purchases (addons_purchased) to the catalog to surface
-- features + slot_delta + download path. security_invoker makes the view
-- inherit the underlying table policies — addons_purchased already has a
-- "select your own rows" policy, so calls authenticated as the buyer
-- automatically scope to their own data.
CREATE OR REPLACE VIEW public.v_user_entitlements
WITH (security_invoker = true)
AS
SELECT
  ap.id              AS purchase_id,
  ap.user_id,
  ap.addon_id,
  ap.status,
  ap.created_at,
  ae.features,
  ae.slot_delta,
  ae.download_zip,
  ae.display_name,
  ae.billing,
  ap.metadata->>'stripe_session_id'      AS session_id,
  ap.metadata->>'stripe_subscription_id' AS subscription_id
FROM public.addons_purchased ap
JOIN public.addon_entitlements ae ON ae.addon_id = ap.addon_id
WHERE ap.status = 'active'
  AND ae.is_active = true;

GRANT SELECT ON public.v_user_entitlements TO anon, authenticated;

COMMENT ON TABLE public.addon_entitlements IS
  'Catalog of what each addon_id grants. Webhook reads this on purchase to know the delivery shape; Builder UI reads v_user_entitlements to gate features.';
COMMENT ON VIEW public.v_user_entitlements IS
  'Per-user active entitlements joined with the catalog. Use this for any "does user X have feature Y?" check.';
