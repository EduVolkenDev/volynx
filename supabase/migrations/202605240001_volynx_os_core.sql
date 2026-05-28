-- ============================================================
-- VOLYNX OS Core
-- Universal multi-tenant site/content foundation for Builder.
--
-- Model:
--   Organization -> Site -> Page -> Section(content/design/behavior)
--   Site -> Forms -> Submissions
--   Site -> Published Snapshots
--   Site -> Media / Integrations / Navigation / Products / Custom Records
--
-- Public rendering should read published_snapshots. Draft/editable content
-- stays behind membership RLS.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ── 1. Organizations and members ────────────────────────────
CREATE TABLE IF NOT EXISTS public.organizations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  slug        text UNIQUE NOT NULL,
  owner_id    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  plan        text NOT NULL DEFAULT 'free',
  status      text NOT NULL DEFAULT 'active',
  metadata    jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS slug text;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'free';
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE UNIQUE INDEX IF NOT EXISTS idx_organizations_slug_unique
  ON public.organizations(slug);

CREATE TABLE IF NOT EXISTS public.organization_members (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role            text NOT NULL DEFAULT 'member',
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_organization_members_org
  ON public.organization_members(organization_id);

CREATE INDEX IF NOT EXISTS idx_organization_members_user
  ON public.organization_members(user_id);

ALTER TABLE public.organization_members DROP CONSTRAINT IF EXISTS chk_organization_members_role;
ALTER TABLE public.organization_members
  ADD CONSTRAINT chk_organization_members_role
  CHECK (role IN ('owner', 'admin', 'editor', 'viewer', 'member'));

-- ── 2. Membership helpers ───────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_org_member(org_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members om
    WHERE om.organization_id = org_id
      AND om.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.organizations o
    WHERE o.id = org_id
      AND o.owner_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.has_org_role(org_id uuid, allowed_roles text[])
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members om
    WHERE om.organization_id = org_id
      AND om.user_id = auth.uid()
      AND om.role = ANY(allowed_roles)
  )
  OR EXISTS (
    SELECT 1
    FROM public.organizations o
    WHERE o.id = org_id
      AND o.owner_id = auth.uid()
      AND 'owner' = ANY(allowed_roles)
  );
$$;

REVOKE ALL ON FUNCTION public.is_org_member(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_org_role(uuid, text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_org_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_org_role(uuid, text[]) TO authenticated;

-- ── 3. Sites and content model ──────────────────────────────
CREATE TABLE IF NOT EXISTS public.sites (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name             text NOT NULL,
  slug             text NOT NULL,
  domain           text,
  subdomain        text,
  status           text NOT NULL DEFAULT 'draft',
  template_key     text,
  language_default text NOT NULL DEFAULT 'pt',
  languages        text[] NOT NULL DEFAULT ARRAY['pt']::text[],
  theme            jsonb NOT NULL DEFAULT '{}'::jsonb,
  settings         jsonb NOT NULL DEFAULT '{}'::jsonb,
  seo              jsonb NOT NULL DEFAULT '{}'::jsonb,
  tracking         jsonb NOT NULL DEFAULT '{}'::jsonb,
  published_at     timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, slug)
);

ALTER TABLE public.sites ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.sites ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE public.sites ADD COLUMN IF NOT EXISTS slug text;
ALTER TABLE public.sites ADD COLUMN IF NOT EXISTS domain text;
ALTER TABLE public.sites ADD COLUMN IF NOT EXISTS subdomain text;
ALTER TABLE public.sites ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft';
ALTER TABLE public.sites ADD COLUMN IF NOT EXISTS template_key text;
ALTER TABLE public.sites ADD COLUMN IF NOT EXISTS language_default text NOT NULL DEFAULT 'pt';
ALTER TABLE public.sites ADD COLUMN IF NOT EXISTS languages text[] NOT NULL DEFAULT ARRAY['pt']::text[];
ALTER TABLE public.sites ADD COLUMN IF NOT EXISTS theme jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.sites ADD COLUMN IF NOT EXISTS settings jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.sites ADD COLUMN IF NOT EXISTS seo jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.sites ADD COLUMN IF NOT EXISTS tracking jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.sites ADD COLUMN IF NOT EXISTS published_at timestamptz;
ALTER TABLE public.sites ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.sites ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE UNIQUE INDEX IF NOT EXISTS idx_sites_organization_slug_unique
  ON public.sites(organization_id, slug);

CREATE INDEX IF NOT EXISTS idx_sites_org_status
  ON public.sites(organization_id, status);

CREATE INDEX IF NOT EXISTS idx_sites_domain
  ON public.sites(domain)
  WHERE domain IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sites_subdomain
  ON public.sites(subdomain)
  WHERE subdomain IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.pages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id         uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title           text NOT NULL,
  slug            text NOT NULL,
  path            text NOT NULL,
  type            text NOT NULL DEFAULT 'standard',
  status          text NOT NULL DEFAULT 'draft',
  seo             jsonb NOT NULL DEFAULT '{}'::jsonb,
  settings        jsonb NOT NULL DEFAULT '{}'::jsonb,
  sort_order      integer NOT NULL DEFAULT 0,
  published_at    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (site_id, path)
);

CREATE INDEX IF NOT EXISTS idx_pages_site_status_order
  ON public.pages(site_id, status, sort_order);

CREATE INDEX IF NOT EXISTS idx_pages_org
  ON public.pages(organization_id);

CREATE TABLE IF NOT EXISTS public.page_sections (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id         uuid NOT NULL REFERENCES public.pages(id) ON DELETE CASCADE,
  site_id         uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  section_key     text NOT NULL,
  section_type    text NOT NULL,
  variant         text,
  content         jsonb NOT NULL DEFAULT '{}'::jsonb,
  design          jsonb NOT NULL DEFAULT '{}'::jsonb,
  behavior        jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_visible      boolean NOT NULL DEFAULT true,
  sort_order      integer NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_page_sections_page_order
  ON public.page_sections(page_id, is_visible, sort_order);

CREATE INDEX IF NOT EXISTS idx_page_sections_site_type
  ON public.page_sections(site_id, section_type);

CREATE UNIQUE INDEX IF NOT EXISTS idx_page_sections_page_key_unique
  ON public.page_sections(page_id, section_key);

CREATE INDEX IF NOT EXISTS idx_page_sections_content_gin
  ON public.page_sections USING gin(content);

-- ── 4. Navigation, forms and leads ──────────────────────────
CREATE TABLE IF NOT EXISTS public.navigation_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id         uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  label           text NOT NULL,
  href            text NOT NULL,
  location        text NOT NULL DEFAULT 'header',
  parent_id       uuid REFERENCES public.navigation_items(id) ON DELETE CASCADE,
  is_external     boolean NOT NULL DEFAULT false,
  is_visible      boolean NOT NULL DEFAULT true,
  sort_order      integer NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_navigation_items_site_location
  ON public.navigation_items(site_id, location, is_visible, sort_order);

CREATE UNIQUE INDEX IF NOT EXISTS idx_navigation_items_site_location_href_label_unique
  ON public.navigation_items(site_id, location, href, label);

CREATE TABLE IF NOT EXISTS public.forms (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id         uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name            text NOT NULL,
  slug            text NOT NULL,
  fields          jsonb NOT NULL DEFAULT '[]'::jsonb,
  settings        jsonb NOT NULL DEFAULT '{}'::jsonb,
  notifications   jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (site_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_forms_site_active
  ON public.forms(site_id, is_active);

CREATE INDEX IF NOT EXISTS idx_forms_fields_gin
  ON public.forms USING gin(fields);

CREATE TABLE IF NOT EXISTS public.form_submissions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id         uuid REFERENCES public.forms(id) ON DELETE SET NULL,
  site_id         uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  data            jsonb NOT NULL DEFAULT '{}'::jsonb,
  name            text,
  email           text,
  phone           text,
  message         text,
  source          text,
  page_path       text,
  status          text NOT NULL DEFAULT 'new',
  metadata        jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_form_submissions_site_status_created
  ON public.form_submissions(site_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_form_submissions_org_created
  ON public.form_submissions(organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_form_submissions_email
  ON public.form_submissions(email)
  WHERE email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_form_submissions_data_gin
  ON public.form_submissions USING gin(data);

ALTER TABLE public.form_submissions DROP CONSTRAINT IF EXISTS chk_form_submissions_status;
ALTER TABLE public.form_submissions
  ADD CONSTRAINT chk_form_submissions_status
  CHECK (status IN ('new', 'read', 'contacted', 'qualified', 'archived', 'spam'));

-- ── 5. Media, integrations and commercial content ──────────
CREATE TABLE IF NOT EXISTS public.media_assets (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  site_id         uuid REFERENCES public.sites(id) ON DELETE CASCADE,
  bucket          text NOT NULL DEFAULT 'media',
  path            text NOT NULL,
  url             text,
  filename        text,
  mime_type       text,
  size_bytes      bigint,
  alt_text        text,
  title           text,
  tags            text[] NOT NULL DEFAULT ARRAY[]::text[],
  metadata        jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_media_assets_org_site
  ON public.media_assets(organization_id, site_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_media_assets_tags_gin
  ON public.media_assets USING gin(tags);

CREATE TABLE IF NOT EXISTS public.integrations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  site_id         uuid REFERENCES public.sites(id) ON DELETE CASCADE,
  provider        text NOT NULL,
  status          text NOT NULL DEFAULT 'inactive',
  public_config   jsonb NOT NULL DEFAULT '{}'::jsonb,
  secret_ref      text,
  metadata        jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (site_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_integrations_org_provider
  ON public.integrations(organization_id, provider, status);

-- This table may already exist in production as a commerce skeleton.
-- Keep it compatible by creating if absent and then adding missing Core columns.
CREATE TABLE IF NOT EXISTS public.products (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  site_id           uuid REFERENCES public.sites(id) ON DELETE CASCADE,
  name              text NOT NULL,
  slug              text,
  description       text,
  short_description text,
  type              text NOT NULL DEFAULT 'service',
  status            text NOT NULL DEFAULT 'active',
  price_amount      integer,
  currency          text DEFAULT 'GBP',
  billing_interval  text,
  image_url         text,
  features          jsonb NOT NULL DEFAULT '[]'::jsonb,
  metadata          jsonb NOT NULL DEFAULT '{}'::jsonb,
  stripe_product_id text,
  stripe_price_id   text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS site_id uuid REFERENCES public.sites(id) ON DELETE CASCADE;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS slug text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS short_description text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'service';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS price_amount integer;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS currency text DEFAULT 'GBP';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS billing_interval text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS features jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS stripe_product_id text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS stripe_price_id text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE UNIQUE INDEX IF NOT EXISTS idx_products_site_slug_unique
  ON public.products(site_id, slug)
  WHERE site_id IS NOT NULL AND slug IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_products_org_status
  ON public.products(organization_id, status);

CREATE TABLE IF NOT EXISTS public.testimonials (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  site_id           uuid REFERENCES public.sites(id) ON DELETE CASCADE,
  author_name       text NOT NULL,
  author_role       text,
  author_company    text,
  author_avatar_url text,
  content           text NOT NULL,
  rating            integer,
  source            text,
  is_featured       boolean NOT NULL DEFAULT false,
  is_visible        boolean NOT NULL DEFAULT true,
  sort_order        integer NOT NULL DEFAULT 0,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_testimonials_site_visible
  ON public.testimonials(site_id, is_visible, sort_order);

CREATE TABLE IF NOT EXISTS public.faqs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  site_id         uuid REFERENCES public.sites(id) ON DELETE CASCADE,
  question        text NOT NULL,
  answer          text NOT NULL,
  category        text,
  is_visible      boolean NOT NULL DEFAULT true,
  sort_order      integer NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_faqs_site_visible
  ON public.faqs(site_id, is_visible, sort_order);

CREATE TABLE IF NOT EXISTS public.site_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  site_id         uuid REFERENCES public.sites(id) ON DELETE CASCADE,
  title           text NOT NULL,
  slug            text NOT NULL,
  description     text,
  starts_at       timestamptz,
  ends_at         timestamptz,
  location        text,
  is_online       boolean NOT NULL DEFAULT false,
  meeting_url     text,
  status          text NOT NULL DEFAULT 'scheduled',
  metadata        jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (site_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_site_events_site_starts
  ON public.site_events(site_id, starts_at);

CREATE TABLE IF NOT EXISTS public.custom_records (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  site_id         uuid REFERENCES public.sites(id) ON DELETE CASCADE,
  collection_key  text NOT NULL,
  slug            text,
  title           text,
  data            jsonb NOT NULL DEFAULT '{}'::jsonb,
  status          text NOT NULL DEFAULT 'active',
  sort_order      integer NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_custom_records_site_collection
  ON public.custom_records(site_id, collection_key, status, sort_order);

CREATE INDEX IF NOT EXISTS idx_custom_records_data_gin
  ON public.custom_records USING gin(data);

CREATE UNIQUE INDEX IF NOT EXISTS idx_custom_records_site_collection_slug_unique
  ON public.custom_records(site_id, collection_key, slug)
  WHERE site_id IS NOT NULL AND slug IS NOT NULL;

-- ── 6. Published snapshots ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.published_snapshots (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id         uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  version         integer NOT NULL,
  payload         jsonb NOT NULL,
  published_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  published_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (site_id, version)
);

CREATE INDEX IF NOT EXISTS idx_published_snapshots_site_latest
  ON public.published_snapshots(site_id, version DESC);

CREATE INDEX IF NOT EXISTS idx_published_snapshots_payload_gin
  ON public.published_snapshots USING gin(payload);

CREATE OR REPLACE FUNCTION public.is_published_site(p_site_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.sites s
    WHERE s.id = p_site_id
      AND s.status = 'published'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_public_active_form(
  p_form_id uuid,
  p_site_id uuid,
  p_organization_id uuid
)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.forms f
    JOIN public.sites s ON s.id = f.site_id
    WHERE f.id = p_form_id
      AND f.site_id = p_site_id
      AND f.organization_id = p_organization_id
      AND f.is_active = true
      AND s.status = 'published'
  );
$$;

REVOKE ALL ON FUNCTION public.is_published_site(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_public_active_form(uuid, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_published_site(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_public_active_form(uuid, uuid, uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.build_site_snapshot_payload(p_site_id uuid)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'site', jsonb_build_object(
      'id', s.id,
      'organization_id', s.organization_id,
      'name', s.name,
      'slug', s.slug,
      'domain', s.domain,
      'subdomain', s.subdomain,
      'template_key', s.template_key,
      'language_default', s.language_default,
      'languages', s.languages,
      'theme', s.theme,
      'settings', s.settings,
      'seo', s.seo,
      'tracking', s.tracking
    ),
    'navigation', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', n.id,
          'label', n.label,
          'href', n.href,
          'location', n.location,
          'parent_id', n.parent_id,
          'is_external', n.is_external,
          'sort_order', n.sort_order
        )
        ORDER BY n.location, n.sort_order, n.label
      )
      FROM public.navigation_items n
      WHERE n.site_id = s.id
        AND n.is_visible = true
    ), '[]'::jsonb),
    'forms', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', f.id,
          'name', f.name,
          'slug', f.slug,
          'fields', f.fields,
          'settings', f.settings
        )
        ORDER BY f.name
      )
      FROM public.forms f
      WHERE f.site_id = s.id
        AND f.is_active = true
    ), '[]'::jsonb),
    'pages', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', p.id,
          'title', p.title,
          'slug', p.slug,
          'path', p.path,
          'type', p.type,
          'seo', p.seo,
          'settings', p.settings,
          'sections', COALESCE((
            SELECT jsonb_agg(
              jsonb_build_object(
                'id', ps.id,
                'section_key', ps.section_key,
                'section_type', ps.section_type,
                'variant', ps.variant,
                'content', ps.content,
                'design', ps.design,
                'behavior', ps.behavior,
                'sort_order', ps.sort_order
              )
              ORDER BY ps.sort_order, ps.created_at
            )
            FROM public.page_sections ps
            WHERE ps.page_id = p.id
              AND ps.is_visible = true
          ), '[]'::jsonb)
        )
        ORDER BY p.sort_order, p.path
      )
      FROM public.pages p
      WHERE p.site_id = s.id
        AND p.status = 'published'
    ), '[]'::jsonb)
  )
  FROM public.sites s
  WHERE s.id = p_site_id;
$$;

CREATE OR REPLACE FUNCTION public.publish_site_snapshot(p_site_id uuid)
RETURNS public.published_snapshots
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_site public.sites%ROWTYPE;
  v_version integer;
  v_payload jsonb;
  v_snapshot public.published_snapshots%ROWTYPE;
BEGIN
  SELECT * INTO v_site
  FROM public.sites
  WHERE id = p_site_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'site_not_found';
  END IF;

  IF NOT public.has_org_role(v_site.organization_id, ARRAY['owner', 'admin', 'editor']) THEN
    RAISE EXCEPTION 'not_allowed';
  END IF;

  SELECT COALESCE(max(version), 0) + 1
  INTO v_version
  FROM public.published_snapshots
  WHERE site_id = p_site_id;

  v_payload := public.build_site_snapshot_payload(p_site_id);

  IF v_payload IS NULL THEN
    RAISE EXCEPTION 'snapshot_payload_empty';
  END IF;

  INSERT INTO public.published_snapshots (
    site_id,
    organization_id,
    version,
    payload,
    published_by
  )
  VALUES (
    v_site.id,
    v_site.organization_id,
    v_version,
    v_payload,
    auth.uid()
  )
  RETURNING * INTO v_snapshot;

  UPDATE public.sites
  SET status = 'published',
      published_at = now()
  WHERE id = p_site_id;

  RETURN v_snapshot;
END;
$$;

REVOKE ALL ON FUNCTION public.build_site_snapshot_payload(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.publish_site_snapshot(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.publish_site_snapshot(uuid) TO authenticated;

-- ── 7. Triggers ─────────────────────────────────────────────
DROP TRIGGER IF EXISTS organizations_set_updated_at ON public.organizations;
CREATE TRIGGER organizations_set_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS sites_set_updated_at ON public.sites;
CREATE TRIGGER sites_set_updated_at
  BEFORE UPDATE ON public.sites
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS pages_set_updated_at ON public.pages;
CREATE TRIGGER pages_set_updated_at
  BEFORE UPDATE ON public.pages
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS page_sections_set_updated_at ON public.page_sections;
CREATE TRIGGER page_sections_set_updated_at
  BEFORE UPDATE ON public.page_sections
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS navigation_items_set_updated_at ON public.navigation_items;
CREATE TRIGGER navigation_items_set_updated_at
  BEFORE UPDATE ON public.navigation_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS forms_set_updated_at ON public.forms;
CREATE TRIGGER forms_set_updated_at
  BEFORE UPDATE ON public.forms
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS integrations_set_updated_at ON public.integrations;
CREATE TRIGGER integrations_set_updated_at
  BEFORE UPDATE ON public.integrations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS products_set_updated_at ON public.products;
CREATE TRIGGER products_set_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS testimonials_set_updated_at ON public.testimonials;
CREATE TRIGGER testimonials_set_updated_at
  BEFORE UPDATE ON public.testimonials
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS faqs_set_updated_at ON public.faqs;
CREATE TRIGGER faqs_set_updated_at
  BEFORE UPDATE ON public.faqs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS site_events_set_updated_at ON public.site_events;
CREATE TRIGGER site_events_set_updated_at
  BEFORE UPDATE ON public.site_events
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS custom_records_set_updated_at ON public.custom_records;
CREATE TRIGGER custom_records_set_updated_at
  BEFORE UPDATE ON public.custom_records
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── 8. RLS ──────────────────────────────────────────────────
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.navigation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.published_snapshots ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Members can view organizations"
    ON public.organizations FOR SELECT
    USING (public.is_org_member(id));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated users can create owned organizations"
    ON public.organizations FOR INSERT
    TO authenticated
    WITH CHECK (owner_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Owners and admins can update organizations"
    ON public.organizations FOR UPDATE
    TO authenticated
    USING (public.has_org_role(id, ARRAY['owner', 'admin']))
    WITH CHECK (public.has_org_role(id, ARRAY['owner', 'admin']));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Owners can delete organizations"
    ON public.organizations FOR DELETE
    TO authenticated
    USING (public.has_org_role(id, ARRAY['owner']));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Members can view organization members"
    ON public.organization_members FOR SELECT
    TO authenticated
    USING (public.is_org_member(organization_id));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Owners and admins can manage organization members"
    ON public.organization_members FOR ALL
    TO authenticated
    USING (public.has_org_role(organization_id, ARRAY['owner', 'admin']))
    WITH CHECK (public.has_org_role(organization_id, ARRAY['owner', 'admin']));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Owners can bootstrap their own membership"
    ON public.organization_members FOR INSERT
    TO authenticated
    WITH CHECK (
      user_id = auth.uid()
      AND role = 'owner'
      AND EXISTS (
        SELECT 1
        FROM public.organizations o
        WHERE o.id = organization_id
          AND o.owner_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Members can view sites"
    ON public.sites FOR SELECT
    TO authenticated
    USING (public.is_org_member(organization_id));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Editors can insert sites"
    ON public.sites FOR INSERT
    TO authenticated
    WITH CHECK (public.has_org_role(organization_id, ARRAY['owner', 'admin', 'editor']));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Editors can update sites"
    ON public.sites FOR UPDATE
    TO authenticated
    USING (public.has_org_role(organization_id, ARRAY['owner', 'admin', 'editor']))
    WITH CHECK (public.has_org_role(organization_id, ARRAY['owner', 'admin', 'editor']));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can delete sites"
    ON public.sites FOR DELETE
    TO authenticated
    USING (public.has_org_role(organization_id, ARRAY['owner', 'admin']));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Reusable org-scoped policies for content tables.
DO $$ BEGIN
  CREATE POLICY "Members can view pages"
    ON public.pages FOR SELECT TO authenticated
    USING (public.is_org_member(organization_id));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Editors can manage pages"
    ON public.pages FOR ALL TO authenticated
    USING (public.has_org_role(organization_id, ARRAY['owner', 'admin', 'editor']))
    WITH CHECK (public.has_org_role(organization_id, ARRAY['owner', 'admin', 'editor']));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Members can view page sections"
    ON public.page_sections FOR SELECT TO authenticated
    USING (public.is_org_member(organization_id));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Editors can manage page sections"
    ON public.page_sections FOR ALL TO authenticated
    USING (public.has_org_role(organization_id, ARRAY['owner', 'admin', 'editor']))
    WITH CHECK (public.has_org_role(organization_id, ARRAY['owner', 'admin', 'editor']));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Members can view navigation items"
    ON public.navigation_items FOR SELECT TO authenticated
    USING (public.is_org_member(organization_id));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Editors can manage navigation items"
    ON public.navigation_items FOR ALL TO authenticated
    USING (public.has_org_role(organization_id, ARRAY['owner', 'admin', 'editor']))
    WITH CHECK (public.has_org_role(organization_id, ARRAY['owner', 'admin', 'editor']));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Members can view forms"
    ON public.forms FOR SELECT TO authenticated
    USING (public.is_org_member(organization_id));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Editors can manage forms"
    ON public.forms FOR ALL TO authenticated
    USING (public.has_org_role(organization_id, ARRAY['owner', 'admin', 'editor']))
    WITH CHECK (public.has_org_role(organization_id, ARRAY['owner', 'admin', 'editor']));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Members can view form submissions"
    ON public.form_submissions FOR SELECT TO authenticated
    USING (public.is_org_member(organization_id));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Editors can update form submissions"
    ON public.form_submissions FOR UPDATE TO authenticated
    USING (public.has_org_role(organization_id, ARRAY['owner', 'admin', 'editor']))
    WITH CHECK (public.has_org_role(organization_id, ARRAY['owner', 'admin', 'editor']));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Public can submit active published forms"
    ON public.form_submissions FOR INSERT
    TO anon, authenticated
    WITH CHECK (
      status = 'new'
      AND public.is_public_active_form(form_id, site_id, organization_id)
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Members can view media assets"
    ON public.media_assets FOR SELECT TO authenticated
    USING (public.is_org_member(organization_id));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Editors can manage media assets"
    ON public.media_assets FOR ALL TO authenticated
    USING (public.has_org_role(organization_id, ARRAY['owner', 'admin', 'editor']))
    WITH CHECK (public.has_org_role(organization_id, ARRAY['owner', 'admin', 'editor']));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Members can view integrations"
    ON public.integrations FOR SELECT TO authenticated
    USING (public.is_org_member(organization_id));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can manage integrations"
    ON public.integrations FOR ALL TO authenticated
    USING (public.has_org_role(organization_id, ARRAY['owner', 'admin']))
    WITH CHECK (public.has_org_role(organization_id, ARRAY['owner', 'admin']));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Members can view products"
    ON public.products FOR SELECT TO authenticated
    USING (organization_id IS NULL OR public.is_org_member(organization_id));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Public can view global active products"
    ON public.products FOR SELECT
    TO anon, authenticated
    USING (organization_id IS NULL AND status = 'active');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Editors can manage products"
    ON public.products FOR ALL TO authenticated
    USING (organization_id IS NOT NULL AND public.has_org_role(organization_id, ARRAY['owner', 'admin', 'editor']))
    WITH CHECK (organization_id IS NOT NULL AND public.has_org_role(organization_id, ARRAY['owner', 'admin', 'editor']));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Members can view testimonials"
    ON public.testimonials FOR SELECT TO authenticated
    USING (public.is_org_member(organization_id));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Editors can manage testimonials"
    ON public.testimonials FOR ALL TO authenticated
    USING (public.has_org_role(organization_id, ARRAY['owner', 'admin', 'editor']))
    WITH CHECK (public.has_org_role(organization_id, ARRAY['owner', 'admin', 'editor']));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Members can view faqs"
    ON public.faqs FOR SELECT TO authenticated
    USING (public.is_org_member(organization_id));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Editors can manage faqs"
    ON public.faqs FOR ALL TO authenticated
    USING (public.has_org_role(organization_id, ARRAY['owner', 'admin', 'editor']))
    WITH CHECK (public.has_org_role(organization_id, ARRAY['owner', 'admin', 'editor']));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Members can view site events"
    ON public.site_events FOR SELECT TO authenticated
    USING (public.is_org_member(organization_id));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Editors can manage site events"
    ON public.site_events FOR ALL TO authenticated
    USING (public.has_org_role(organization_id, ARRAY['owner', 'admin', 'editor']))
    WITH CHECK (public.has_org_role(organization_id, ARRAY['owner', 'admin', 'editor']));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Members can view custom records"
    ON public.custom_records FOR SELECT TO authenticated
    USING (public.is_org_member(organization_id));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Editors can manage custom records"
    ON public.custom_records FOR ALL TO authenticated
    USING (public.has_org_role(organization_id, ARRAY['owner', 'admin', 'editor']))
    WITH CHECK (public.has_org_role(organization_id, ARRAY['owner', 'admin', 'editor']));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Members can view snapshots"
    ON public.published_snapshots FOR SELECT TO authenticated
    USING (public.is_org_member(organization_id));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Editors can insert snapshots"
    ON public.published_snapshots FOR INSERT TO authenticated
    WITH CHECK (public.has_org_role(organization_id, ARRAY['owner', 'admin', 'editor']));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Published snapshots are public"
    ON public.published_snapshots FOR SELECT
    TO anon, authenticated
    USING (public.is_published_site(site_id));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── 9. Demo seed ────────────────────────────────────────────
WITH org AS (
  INSERT INTO public.organizations (name, slug, plan, status, metadata)
  VALUES (
    'VOLYNX OS Demo',
    'volynx-os-demo',
    'free',
    'active',
    '{"source":"migration_seed","purpose":"volynx_os_core"}'::jsonb
  )
  ON CONFLICT (slug) DO UPDATE
  SET name = EXCLUDED.name,
      plan = EXCLUDED.plan,
      status = EXCLUDED.status
  RETURNING id
),
site AS (
  INSERT INTO public.sites (
    organization_id,
    name,
    slug,
    subdomain,
    status,
    template_key,
    language_default,
    languages,
    theme,
    seo,
    tracking
  )
  SELECT
    org.id,
    'VOLYNX OS Core Demo',
    'core-demo',
    'core-demo',
    'published',
    'volynx_os_core_demo',
    'pt',
    ARRAY['pt', 'en']::text[],
    '{
      "primaryColor":"#101010",
      "accentColor":"#D6B36A",
      "fontHeading":"Sora",
      "fontBody":"Inter",
      "radius":"medium",
      "style":"premium-system"
    }'::jsonb,
    '{
      "title":"VOLYNX OS Core Demo",
      "description":"Base universal para sites, seções, leads, SEO, mídia e publicação por snapshot."
    }'::jsonb,
    '{"analytics":"demo-disabled"}'::jsonb
  FROM org
  ON CONFLICT (organization_id, slug) DO UPDATE
  SET name = EXCLUDED.name,
      status = EXCLUDED.status,
      template_key = EXCLUDED.template_key,
      theme = EXCLUDED.theme,
      seo = EXCLUDED.seo
  RETURNING id, organization_id
),
page AS (
  INSERT INTO public.pages (
    site_id,
    organization_id,
    title,
    slug,
    path,
    type,
    status,
    seo,
    sort_order,
    published_at
  )
  SELECT
    site.id,
    site.organization_id,
    'Home',
    'home',
    '/',
    'landing',
    'published',
    '{"title":"VOLYNX OS Core","description":"Renderer universal com páginas montadas por seções."}'::jsonb,
    0,
    now()
  FROM site
  ON CONFLICT (site_id, path) DO UPDATE
  SET title = EXCLUDED.title,
      status = EXCLUDED.status,
      seo = EXCLUDED.seo,
      published_at = EXCLUDED.published_at
  RETURNING id, site_id, organization_id
),
form_seed AS (
  INSERT INTO public.forms (
    site_id,
    organization_id,
    name,
    slug,
    fields,
    settings,
    notifications,
    is_active
  )
  SELECT
    site.id,
    site.organization_id,
    'Contato principal',
    'contact',
    '[
      {"name":"name","label":"Nome","type":"text","required":true},
      {"name":"email","label":"E-mail","type":"email","required":true},
      {"name":"message","label":"Mensagem","type":"textarea","required":false}
    ]'::jsonb,
    '{"successMessage":"Recebemos sua mensagem."}'::jsonb,
    '{"mode":"manual"}'::jsonb,
    true
  FROM site
  ON CONFLICT (site_id, slug) DO UPDATE
  SET fields = EXCLUDED.fields,
      settings = EXCLUDED.settings,
      is_active = EXCLUDED.is_active
  RETURNING id
),
nav_seed AS (
  INSERT INTO public.navigation_items (site_id, organization_id, label, href, location, sort_order)
  SELECT site.id, site.organization_id, item.label, item.href, item.location, item.sort_order
  FROM site
  CROSS JOIN (
    VALUES
      ('Home', '/', 'header', 0),
      ('Pricing', '#pricing', 'header', 10),
      ('FAQ', '#faq', 'header', 20),
      ('Contact', '#contact', 'header', 30),
      ('Privacy', '/privacy', 'footer', 10)
) AS item(label, href, location, sort_order)
  ON CONFLICT (site_id, location, href, label) DO UPDATE
  SET sort_order = EXCLUDED.sort_order,
      is_visible = true
)
INSERT INTO public.page_sections (
  page_id,
  site_id,
  organization_id,
  section_key,
  section_type,
  variant,
  content,
  design,
  behavior,
  sort_order
)
SELECT
  page.id,
  page.site_id,
  page.organization_id,
  section_key,
  section_type,
  variant,
  content,
  design,
  behavior,
  sort_order
FROM page
CROSS JOIN (
  VALUES
    (
      'hero',
      'hero',
      'split-premium',
      '{
        "eyebrow":"VOLYNX OS Core",
        "title":"Uma base universal para vender sites em escala",
        "subtitle":"Páginas, seções, formulários, leads, mídia, SEO, integrações e publicação estável em um modelo multi-tenant.",
        "primaryCta":{"label":"Ver planos","href":"#pricing"},
        "secondaryCta":{"label":"Falar com VOLYNX","href":"#contact"},
        "image":"/assets/volynx-os-core-demo.webp"
      }'::jsonb,
      '{"layout":"split","background":"system-soft","alignment":"left","visualStyle":"premium","spacing":"large"}'::jsonb,
      '{"trackImpression":true}'::jsonb,
      0
    ),
    (
      'features',
      'features',
      'grid',
      '{
        "title":"Tudo que um site de cliente precisa para nascer organizado",
        "items":[
          {"title":"Multi-tenant","text":"Cada cliente fica isolado por organization_id."},
          {"title":"Seções reutilizáveis","text":"A mesma página pode mudar de template sem mudar de banco."},
          {"title":"Leads universais","text":"Formulários diferentes caem na mesma base operacional."},
          {"title":"Snapshots","text":"O publicado fica congelado, rápido e reversível."}
        ]
      }'::jsonb,
      '{"columns":4,"style":"quiet-cards"}'::jsonb,
      '{}'::jsonb,
      10
    ),
    (
      'pricing',
      'pricing',
      'three-tier',
      '{
        "title":"Planos base para vender sites recorrentes",
        "plans":[
          {"name":"Launch","price":"9","currency":"GBP","features":["1 site","Subdomínio","Leads básicos"]},
          {"name":"Pro","price":"19","currency":"GBP","featured":true,"features":["3 sites","Domínio próprio","Snapshots e mídia"]},
          {"name":"Studio","price":"39","currency":"GBP","features":["10 sites","Clientes múltiplos","Integrações"]}
        ]
      }'::jsonb,
      '{"density":"compact","highlight":"middle"}'::jsonb,
      '{}'::jsonb,
      20
    ),
    (
      'faq',
      'faq',
      'accordion',
      '{
        "title":"Perguntas frequentes",
        "items":[
          {"question":"Isso substitui o Builder?","answer":"Não. Isso é o núcleo de dados que permite o Builder criar e publicar sites."},
          {"question":"O cliente vê o banco?","answer":"Não. O cliente vê uma interface simples: páginas, seções, leads, imagens, aparência e publicar."},
          {"question":"Por que snapshots?","answer":"Para proteger o publicado enquanto o draft continua sendo editado."}
        ]
      }'::jsonb,
      '{"layout":"single-column"}'::jsonb,
      '{}'::jsonb,
      30
    ),
    (
      'contact',
      'contact',
      'lead-form',
      '{
        "title":"Comece por um template, publique como sistema",
        "subtitle":"Esse formulário salva em form_submissions e mantém o cliente isolado.",
        "formSlug":"contact"
      }'::jsonb,
      '{"layout":"form-right"}'::jsonb,
      '{"submitMode":"supabase"}'::jsonb,
  40
    )
) AS sections(section_key, section_type, variant, content, design, behavior, sort_order)
ON CONFLICT (page_id, section_key) DO UPDATE
SET section_type = EXCLUDED.section_type,
    variant = EXCLUDED.variant,
    content = EXCLUDED.content,
    design = EXCLUDED.design,
    behavior = EXCLUDED.behavior,
    is_visible = true,
    sort_order = EXCLUDED.sort_order;

WITH site AS (
  SELECT s.id, s.organization_id
  FROM public.sites s
  JOIN public.organizations o ON o.id = s.organization_id
  WHERE o.slug = 'volynx-os-demo'
    AND s.slug = 'core-demo'
),
next_version AS (
  SELECT site.id AS site_id,
         site.organization_id,
         COALESCE(max(ps.version), 0) + 1 AS version
  FROM site
  LEFT JOIN public.published_snapshots ps ON ps.site_id = site.id
  GROUP BY site.id, site.organization_id
)
INSERT INTO public.published_snapshots (site_id, organization_id, version, payload)
SELECT
  next_version.site_id,
  next_version.organization_id,
  next_version.version,
  public.build_site_snapshot_payload(next_version.site_id)
FROM next_version
WHERE NOT EXISTS (
  SELECT 1
  FROM public.published_snapshots ps
  WHERE ps.site_id = next_version.site_id
);
