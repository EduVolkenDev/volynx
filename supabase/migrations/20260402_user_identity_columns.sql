-- ============================================================
-- Add user_email to all transactional tables
-- So every row is instantly identifiable without joining profiles
-- Safe to re-run: all operations are idempotent
-- ============================================================

-- ── subscriptions ─────────────────────────────────────────────
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS user_email text;

-- ── purchase_events ───────────────────────────────────────────
ALTER TABLE public.purchase_events ADD COLUMN IF NOT EXISTS user_email text;

-- ── token_transactions ────────────────────────────────────────
ALTER TABLE public.token_transactions ADD COLUMN IF NOT EXISTS user_email text;

-- ── addons_purchased ──────────────────────────────────────────
ALTER TABLE public.addons_purchased ADD COLUMN IF NOT EXISTS user_email text;

-- ── active_bundles ────────────────────────────────────────────
ALTER TABLE public.active_bundles ADD COLUMN IF NOT EXISTS user_email text;

-- ── daily_usage_logs ──────────────────────────────────────────
ALTER TABLE public.daily_usage_logs ADD COLUMN IF NOT EXISTS user_email text;

-- ── usage_logs (if exists) ────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE public.usage_logs ADD COLUMN IF NOT EXISTS user_email text;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ── Backfill existing rows from profiles ──────────────────────
UPDATE public.subscriptions s
SET user_email = p.email
FROM public.profiles p
WHERE s.user_id = p.id AND s.user_email IS NULL;

UPDATE public.purchase_events pe
SET user_email = p.email
FROM public.profiles p
WHERE pe.user_id = p.id AND pe.user_email IS NULL;

UPDATE public.token_transactions tt
SET user_email = p.email
FROM public.profiles p
WHERE tt.user_id = p.id AND tt.user_email IS NULL;

UPDATE public.addons_purchased ap
SET user_email = p.email
FROM public.profiles p
WHERE ap.user_id = p.id AND ap.user_email IS NULL;

UPDATE public.active_bundles ab
SET user_email = p.email
FROM public.profiles p
WHERE ab.user_id = p.id AND ab.user_email IS NULL;
