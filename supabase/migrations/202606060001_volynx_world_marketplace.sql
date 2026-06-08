-- Volynx World marketplace v1
-- Public professional identities, service listings, and private hiring briefs.

CREATE TABLE IF NOT EXISTS public.world_profiles (
  user_id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  handle           text NOT NULL,
  display_name     text NOT NULL,
  headline         text NOT NULL,
  bio              text NOT NULL,
  location         text,
  languages        text[] NOT NULL DEFAULT '{}'::text[],
  specialties      text[] NOT NULL DEFAULT '{}'::text[],
  portfolio_url    text,
  avatar_url       text,
  availability     text NOT NULL DEFAULT 'available'
                     CHECK (availability IN ('available', 'limited', 'unavailable')),
  is_published     boolean NOT NULL DEFAULT false,
  is_verified      boolean NOT NULL DEFAULT false,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT world_profiles_handle_format CHECK (handle ~ '^[a-z0-9][a-z0-9_-]{2,29}$'),
  CONSTRAINT world_profiles_handle_not_reserved CHECK (handle NOT IN ('admin', 'api', 'billing', 'help', 'official', 'security', 'support', 'volynx', 'world')),
  CONSTRAINT world_profiles_display_name_length CHECK (length(trim(display_name)) BETWEEN 2 AND 80),
  CONSTRAINT world_profiles_headline_length CHECK (length(trim(headline)) BETWEEN 8 AND 120),
  CONSTRAINT world_profiles_bio_length CHECK (length(trim(bio)) BETWEEN 40 AND 1200),
  CONSTRAINT world_profiles_portfolio_url_http CHECK (portfolio_url IS NULL OR portfolio_url ~* '^https?://'),
  CONSTRAINT world_profiles_avatar_url_http CHECK (avatar_url IS NULL OR avatar_url ~* '^https?://')
);

CREATE INDEX IF NOT EXISTS world_profiles_published_idx
  ON public.world_profiles(is_published, availability, updated_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS world_profiles_handle_unique
  ON public.world_profiles(lower(handle));

CREATE INDEX IF NOT EXISTS world_profiles_specialties_idx
  ON public.world_profiles USING gin(specialties);

CREATE TABLE IF NOT EXISTS public.world_services (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id       uuid NOT NULL REFERENCES public.world_profiles(user_id) ON DELETE CASCADE,
  title             text NOT NULL,
  description       text NOT NULL,
  category          text NOT NULL,
  pricing_type      text NOT NULL DEFAULT 'quote'
                      CHECK (pricing_type IN ('fixed', 'starting_at', 'hourly', 'quote')),
  price_amount      integer,
  currency          text NOT NULL DEFAULT 'GBP'
                      CHECK (currency IN ('GBP', 'EUR', 'BRL', 'USD')),
  delivery_days     integer,
  vx_discount_pct   integer NOT NULL DEFAULT 0
                      CHECK (vx_discount_pct BETWEEN 0 AND 15),
  status            text NOT NULL DEFAULT 'draft'
                      CHECK (status IN ('draft', 'published', 'paused')),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT world_services_title_length CHECK (length(trim(title)) BETWEEN 5 AND 100),
  CONSTRAINT world_services_description_length CHECK (length(trim(description)) BETWEEN 30 AND 1200),
  CONSTRAINT world_services_category_length CHECK (length(trim(category)) BETWEEN 2 AND 60),
  CONSTRAINT world_services_price_valid CHECK (
    (pricing_type = 'quote' AND price_amount IS NULL)
    OR (pricing_type <> 'quote' AND price_amount IS NOT NULL AND price_amount > 0)
  ),
  CONSTRAINT world_services_delivery_days_valid CHECK (delivery_days IS NULL OR delivery_days BETWEEN 1 AND 365)
);

CREATE INDEX IF NOT EXISTS world_services_provider_idx
  ON public.world_services(provider_id, status, updated_at DESC);

CREATE INDEX IF NOT EXISTS world_services_discovery_idx
  ON public.world_services(status, category, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.world_inquiries (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_id     uuid NOT NULL REFERENCES public.world_profiles(user_id) ON DELETE CASCADE,
  service_id      uuid REFERENCES public.world_services(id) ON DELETE SET NULL,
  subject         text NOT NULL,
  brief           text NOT NULL,
  reply_email     text NOT NULL,
  budget          text,
  timeline        text,
  status          text NOT NULL DEFAULT 'new'
                    CHECK (status IN ('new', 'reviewing', 'accepted', 'declined', 'closed')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT world_inquiries_not_self CHECK (client_id <> provider_id),
  CONSTRAINT world_inquiries_reply_email_valid CHECK (reply_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  CONSTRAINT world_inquiries_subject_length CHECK (length(trim(subject)) BETWEEN 5 AND 120),
  CONSTRAINT world_inquiries_brief_length CHECK (length(trim(brief)) BETWEEN 40 AND 3000)
);

CREATE INDEX IF NOT EXISTS world_inquiries_provider_idx
  ON public.world_inquiries(provider_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS world_inquiries_client_idx
  ON public.world_inquiries(client_id, created_at DESC);

DROP TRIGGER IF EXISTS world_profiles_set_updated_at ON public.world_profiles;
CREATE TRIGGER world_profiles_set_updated_at
  BEFORE UPDATE ON public.world_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS world_services_set_updated_at ON public.world_services;
CREATE TRIGGER world_services_set_updated_at
  BEFORE UPDATE ON public.world_services
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS world_inquiries_set_updated_at ON public.world_inquiries;
CREATE TRIGGER world_inquiries_set_updated_at
  BEFORE UPDATE ON public.world_inquiries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.guard_world_profile_trust_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.role() <> 'service_role' THEN
    NEW.is_verified := OLD.is_verified;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS world_profiles_guard_trust_fields ON public.world_profiles;
CREATE TRIGGER world_profiles_guard_trust_fields
  BEFORE UPDATE ON public.world_profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_world_profile_trust_fields();

CREATE OR REPLACE FUNCTION public.guard_world_inquiry_participants()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.role() <> 'service_role' THEN
    NEW.client_id := OLD.client_id;
    NEW.provider_id := OLD.provider_id;
    NEW.service_id := OLD.service_id;
    NEW.reply_email := OLD.reply_email;
    NEW.subject := OLD.subject;
    NEW.brief := OLD.brief;
    NEW.budget := OLD.budget;
    NEW.timeline := OLD.timeline;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS world_inquiries_guard_participants ON public.world_inquiries;
CREATE TRIGGER world_inquiries_guard_participants
  BEFORE UPDATE ON public.world_inquiries
  FOR EACH ROW EXECUTE FUNCTION public.guard_world_inquiry_participants();

ALTER TABLE public.world_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.world_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.world_inquiries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS world_profiles_public_select ON public.world_profiles;
CREATE POLICY world_profiles_public_select
  ON public.world_profiles FOR SELECT TO anon, authenticated
  USING (is_published OR user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS world_profiles_owner_insert ON public.world_profiles;
CREATE POLICY world_profiles_owner_insert
  ON public.world_profiles FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()) AND is_verified = false);

DROP POLICY IF EXISTS world_profiles_owner_update ON public.world_profiles;
CREATE POLICY world_profiles_owner_update
  ON public.world_profiles FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS world_profiles_owner_delete ON public.world_profiles;
CREATE POLICY world_profiles_owner_delete
  ON public.world_profiles FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS world_services_public_select ON public.world_services;
CREATE POLICY world_services_public_select
  ON public.world_services FOR SELECT TO anon, authenticated
  USING (
    provider_id = (SELECT auth.uid())
    OR (
      status = 'published'
      AND EXISTS (
        SELECT 1 FROM public.world_profiles
        WHERE world_profiles.user_id = world_services.provider_id
          AND world_profiles.is_published = true
      )
    )
  );

DROP POLICY IF EXISTS world_services_owner_insert ON public.world_services;
CREATE POLICY world_services_owner_insert
  ON public.world_services FOR INSERT TO authenticated
  WITH CHECK (provider_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS world_services_owner_update ON public.world_services;
CREATE POLICY world_services_owner_update
  ON public.world_services FOR UPDATE TO authenticated
  USING (provider_id = (SELECT auth.uid()))
  WITH CHECK (provider_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS world_services_owner_delete ON public.world_services;
CREATE POLICY world_services_owner_delete
  ON public.world_services FOR DELETE TO authenticated
  USING (provider_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS world_inquiries_participant_select ON public.world_inquiries;
CREATE POLICY world_inquiries_participant_select
  ON public.world_inquiries FOR SELECT TO authenticated
  USING (client_id = (SELECT auth.uid()) OR provider_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS world_inquiries_client_insert ON public.world_inquiries;
CREATE POLICY world_inquiries_client_insert
  ON public.world_inquiries FOR INSERT TO authenticated
  WITH CHECK (
    client_id = (SELECT auth.uid())
    AND provider_id <> (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.world_profiles
      WHERE world_profiles.user_id = world_inquiries.provider_id
        AND world_profiles.is_published = true
    )
    AND (
      service_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.world_services
        WHERE world_services.id = world_inquiries.service_id
          AND world_services.provider_id = world_inquiries.provider_id
          AND world_services.status = 'published'
      )
    )
  );

DROP POLICY IF EXISTS world_inquiries_provider_update ON public.world_inquiries;
CREATE POLICY world_inquiries_provider_update
  ON public.world_inquiries FOR UPDATE TO authenticated
  USING (provider_id = (SELECT auth.uid()))
  WITH CHECK (provider_id = (SELECT auth.uid()));

COMMENT ON TABLE public.world_profiles IS 'Public professional identities for Volynx World, separate from private account profiles.';
COMMENT ON COLUMN public.world_services.vx_discount_pct IS 'Maximum future VX benefit advertised for this service. No VX settlement occurs in marketplace v1.';
