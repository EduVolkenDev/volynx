-- QR codes dinâmicos: tabela, scans, RLS, quota por plano, expiração mensal pra Free
-- Plano: Free=1, Launch=5, Pro=20, Studio=50, Teams=200, Enterprise=ilimitado
-- Free: expira em 30d + 7d grace. Launch+: nunca expira enquanto plano vigente.

-- =======================================================================
-- 1. EXTENSÃO pg_cron (pra rodar cron diário de expiração)
-- =======================================================================
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- =======================================================================
-- 2. TABELA qr_codes
-- =======================================================================
CREATE TABLE IF NOT EXISTS public.qr_codes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slug            text NOT NULL UNIQUE,
  target_url      text NOT NULL,
  label           text,
  status          text NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active','paused','grace','expired','admin_blocked')),

  plan_at_creation text NOT NULL,

  scan_count      integer NOT NULL DEFAULT 0,
  last_scan_at    timestamptz,

  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  expires_at      timestamptz,
  grace_until     timestamptz,

  CONSTRAINT qr_codes_slug_format CHECK (slug ~ '^[a-zA-Z0-9_-]{4,32}$'),
  CONSTRAINT qr_codes_target_url_http CHECK (target_url ~* '^https?://')
);

CREATE INDEX qr_codes_owner_idx     ON public.qr_codes(owner_id, status);
CREATE INDEX qr_codes_expiry_idx    ON public.qr_codes(status, expires_at)
  WHERE status IN ('active','grace');
CREATE INDEX qr_codes_grace_idx     ON public.qr_codes(status, grace_until)
  WHERE status IN ('active','grace');

-- =======================================================================
-- 3. TABELA qr_scans (analytics)
-- =======================================================================
CREATE TABLE IF NOT EXISTS public.qr_scans (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  qr_code_id    uuid NOT NULL REFERENCES public.qr_codes(id) ON DELETE CASCADE,
  scanned_at    timestamptz NOT NULL DEFAULT now(),
  user_agent    text,
  ip_hash       text,
  country       text,
  referer       text
);

CREATE INDEX qr_scans_code_time_idx ON public.qr_scans(qr_code_id, scanned_at DESC);

-- =======================================================================
-- 4. TRIGGER: updated_at
-- =======================================================================
CREATE OR REPLACE FUNCTION public.qr_codes_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER qr_codes_updated_at_trigger
BEFORE UPDATE ON public.qr_codes
FOR EACH ROW
EXECUTE FUNCTION public.qr_codes_set_updated_at();

-- =======================================================================
-- 5. TRIGGER: enforce quota + snapshot plano + setar expiry no insert
-- =======================================================================
CREATE OR REPLACE FUNCTION public.enforce_qr_quota()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_plan     text;
  v_is_admin boolean;
  v_limit    int;
  v_current  int;
BEGIN
  SELECT plan, COALESCE(is_admin, false)
    INTO v_plan, v_is_admin
  FROM public.profiles
  WHERE id = NEW.owner_id;

  IF v_plan IS NULL THEN
    RAISE EXCEPTION 'qr_owner_profile_missing' USING ERRCODE = 'foreign_key_violation';
  END IF;

  -- Snapshot do plano no momento da criação
  NEW.plan_at_creation := v_plan;

  -- Free expira em 30d + 7d grace; planos pagos nunca expiram (gerenciado por status)
  IF v_plan = 'free' THEN
    NEW.expires_at  := COALESCE(NEW.created_at, now()) + interval '30 days';
    NEW.grace_until := NEW.expires_at + interval '7 days';
  ELSE
    NEW.expires_at  := NULL;
    NEW.grace_until := NULL;
  END IF;

  -- Admin bypass total (Eduardo)
  IF v_is_admin THEN
    RETURN NEW;
  END IF;

  v_limit := CASE v_plan
    WHEN 'free'       THEN 1
    WHEN 'launch'     THEN 5
    WHEN 'pro'        THEN 20
    WHEN 'studio'     THEN 50
    WHEN 'teams'      THEN 200
    WHEN 'enterprise' THEN 100000
    ELSE 1
  END;

  SELECT COUNT(*) INTO v_current
  FROM public.qr_codes
  WHERE owner_id = NEW.owner_id
    AND status IN ('active','paused','grace');

  IF v_current >= v_limit THEN
    RAISE EXCEPTION 'qr_quota_exceeded'
      USING DETAIL = format('plan=%s limit=%s current=%s', v_plan, v_limit, v_current),
            ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER qr_codes_enforce_quota_trigger
BEFORE INSERT ON public.qr_codes
FOR EACH ROW
EXECUTE FUNCTION public.enforce_qr_quota();

-- =======================================================================
-- 6. FUNÇÃO: estender expiry quando user faz upgrade pra plano pago
--    Stripe webhook chama isso depois de mudar profiles.plan
-- =======================================================================
CREATE OR REPLACE FUNCTION public.extend_qr_expiry_for_user(p_user_id uuid)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_plan  text;
  v_count int := 0;
BEGIN
  SELECT plan INTO v_plan FROM public.profiles WHERE id = p_user_id;

  IF v_plan IN ('launch','pro','studio','teams','enterprise') THEN
    UPDATE public.qr_codes
    SET expires_at  = NULL,
        grace_until = NULL,
        status      = CASE
                        WHEN status IN ('grace','expired') THEN 'active'
                        ELSE status
                      END
    WHERE owner_id = p_user_id
      AND status   <> 'admin_blocked';
    GET DIAGNOSTICS v_count = ROW_COUNT;
  END IF;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.extend_qr_expiry_for_user(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.extend_qr_expiry_for_user(uuid) TO service_role;

-- =======================================================================
-- 7. RLS — qr_codes
-- =======================================================================
ALTER TABLE public.qr_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY qr_codes_owner_select ON public.qr_codes
  FOR SELECT TO authenticated
  USING (owner_id = (SELECT auth.uid()));

CREATE POLICY qr_codes_owner_insert ON public.qr_codes
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = (SELECT auth.uid()));

CREATE POLICY qr_codes_owner_update ON public.qr_codes
  FOR UPDATE TO authenticated
  USING (owner_id = (SELECT auth.uid()))
  WITH CHECK (
    owner_id = (SELECT auth.uid())
    AND status <> 'admin_blocked'
  );

CREATE POLICY qr_codes_owner_delete ON public.qr_codes
  FOR DELETE TO authenticated
  USING (owner_id = (SELECT auth.uid()));

CREATE POLICY qr_codes_admin_all ON public.qr_codes
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid()) AND is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid()) AND is_admin = true
    )
  );

-- =======================================================================
-- 8. RLS — qr_scans
-- =======================================================================
ALTER TABLE public.qr_scans ENABLE ROW LEVEL SECURITY;

CREATE POLICY qr_scans_owner_select ON public.qr_scans
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.qr_codes
      WHERE qr_codes.id = qr_scans.qr_code_id
        AND qr_codes.owner_id = (SELECT auth.uid())
    )
  );

CREATE POLICY qr_scans_admin_all ON public.qr_scans
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid()) AND is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid()) AND is_admin = true
    )
  );

-- =======================================================================
-- 9. CRON — flip de status active→grace→expired (UTC)
-- =======================================================================
SELECT cron.schedule(
  'qr_codes_expire_to_grace',
  '0 3 * * *',
  $$UPDATE public.qr_codes
      SET status = 'grace'
      WHERE status     = 'active'
        AND expires_at IS NOT NULL
        AND expires_at < now()$$
);

SELECT cron.schedule(
  'qr_codes_grace_to_expired',
  '5 3 * * *',
  $$UPDATE public.qr_codes
      SET status = 'expired'
      WHERE status      IN ('active','grace')
        AND grace_until IS NOT NULL
        AND grace_until < now()$$
);
