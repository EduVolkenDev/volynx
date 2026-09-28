-- ============================================================
-- VOLYNX Cloud Console — operational core
--
-- This is intentionally separate from the Builder/content model in
-- 202605240001_volynx_os_core.sql. It creates no demo tenant and no
-- provider claims. Missing integrations remain not_configured.
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.cloud_console_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  role text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (platform_organization_id, user_id),
  CONSTRAINT cloud_console_members_role_check CHECK (role IN ('volynx_admin', 'volynx_operator'))
);

CREATE TABLE IF NOT EXISTS public.cloud_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  name text NOT NULL,
  slug text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (platform_organization_id, slug),
  CONSTRAINT cloud_clients_status_check CHECK (status IN ('active', 'suspended', 'archived'))
);

CREATE TABLE IF NOT EXISTS public.cloud_client_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.cloud_clients(id) ON DELETE RESTRICT,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  role text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, user_id),
  CONSTRAINT cloud_client_members_role_check CHECK (role IN ('client_admin', 'client_viewer'))
);

CREATE TABLE IF NOT EXISTS public.cloud_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  client_id uuid NOT NULL REFERENCES public.cloud_clients(id) ON DELETE RESTRICT,
  volynx_id text NOT NULL UNIQUE,
  name text NOT NULL,
  slug text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  production_url text,
  repository_url text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, slug),
  CONSTRAINT cloud_products_status_check CHECK (status IN ('active', 'suspended', 'archived')),
  CONSTRAINT cloud_products_volynx_id_check CHECK (volynx_id ~ '^VLX-[A-Z0-9]+-[0-9]{3,}$')
);

CREATE TABLE IF NOT EXISTS public.cloud_environments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  product_id uuid NOT NULL REFERENCES public.cloud_products(id) ON DELETE RESTRICT,
  environment_key text NOT NULL,
  name text NOT NULL,
  kind text NOT NULL DEFAULT 'production',
  status text NOT NULL DEFAULT 'unknown',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, environment_key),
  CONSTRAINT cloud_environments_status_check CHECK (status IN ('operational', 'degraded', 'incident', 'maintenance', 'unknown', 'not_configured'))
);

CREATE TABLE IF NOT EXISTS public.cloud_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  product_id uuid NOT NULL REFERENCES public.cloud_products(id) ON DELETE RESTRICT,
  environment_id uuid REFERENCES public.cloud_environments(id) ON DELETE RESTRICT,
  provider text NOT NULL,
  resource_kind text NOT NULL,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'not_configured',
  external_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_seen_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cloud_resources_status_check CHECK (status IN ('operational', 'degraded', 'incident', 'maintenance', 'unknown', 'not_configured'))
);

CREATE TABLE IF NOT EXISTS public.cloud_deployments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  product_id uuid NOT NULL REFERENCES public.cloud_products(id) ON DELETE RESTRICT,
  environment_id uuid NOT NULL REFERENCES public.cloud_environments(id) ON DELETE RESTRICT,
  provider text NOT NULL,
  source_ref text,
  commit_sha text,
  status text NOT NULL DEFAULT 'unknown',
  started_at timestamptz,
  finished_at timestamptz,
  deployment_url text,
  external_id text,
  failure_code text,
  failure_message text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cloud_deployments_status_check CHECK (status IN ('queued', 'running', 'succeeded', 'failed', 'cancelled', 'unknown'))
);

CREATE TABLE IF NOT EXISTS public.cloud_monitoring_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  product_id uuid NOT NULL REFERENCES public.cloud_products(id) ON DELETE RESTRICT,
  environment_id uuid NOT NULL REFERENCES public.cloud_environments(id) ON DELETE RESTRICT,
  provider text NOT NULL,
  check_kind text NOT NULL,
  target text,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  enabled boolean NOT NULL DEFAULT true,
  interval_seconds integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cloud_monitoring_interval_check CHECK (interval_seconds IS NULL OR interval_seconds >= 15)
);

CREATE TABLE IF NOT EXISTS public.cloud_monitoring_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  product_id uuid NOT NULL REFERENCES public.cloud_products(id) ON DELETE RESTRICT,
  environment_id uuid NOT NULL REFERENCES public.cloud_environments(id) ON DELETE RESTRICT,
  check_id uuid NOT NULL REFERENCES public.cloud_monitoring_checks(id) ON DELETE RESTRICT,
  status text NOT NULL,
  checked_at timestamptz NOT NULL DEFAULT now(),
  latency_ms integer,
  result jsonb NOT NULL DEFAULT '{}'::jsonb,
  failure_code text,
  CONSTRAINT cloud_monitoring_results_status_check CHECK (status IN ('operational', 'degraded', 'incident', 'maintenance', 'unknown', 'not_configured'))
);

CREATE TABLE IF NOT EXISTS public.cloud_backup_capabilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  product_id uuid NOT NULL REFERENCES public.cloud_products(id) ON DELETE RESTRICT,
  environment_id uuid REFERENCES public.cloud_environments(id) ON DELETE RESTRICT,
  resource_id uuid NOT NULL REFERENCES public.cloud_resources(id) ON DELETE RESTRICT,
  provider text NOT NULL,
  capability_status text NOT NULL DEFAULT 'not_configured',
  retention_days integer,
  last_success_at timestamptz,
  restore_supported boolean NOT NULL DEFAULT false,
  verification_status text NOT NULL DEFAULT 'unknown',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cloud_backup_capabilities_status_check CHECK (capability_status IN ('operational', 'degraded', 'incident', 'maintenance', 'unknown', 'not_configured')),
  CONSTRAINT cloud_backup_capabilities_verification_check CHECK (verification_status IN ('verified', 'unverified', 'failed', 'unknown'))
);

CREATE TABLE IF NOT EXISTS public.cloud_backup_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  product_id uuid NOT NULL REFERENCES public.cloud_products(id) ON DELETE RESTRICT,
  environment_id uuid REFERENCES public.cloud_environments(id) ON DELETE RESTRICT,
  capability_id uuid NOT NULL REFERENCES public.cloud_backup_capabilities(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'unknown',
  started_at timestamptz,
  finished_at timestamptz,
  external_id text,
  failure_code text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cloud_backup_runs_status_check CHECK (status IN ('queued', 'running', 'succeeded', 'failed', 'cancelled', 'unknown'))
);

CREATE TABLE IF NOT EXISTS public.cloud_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  product_id uuid NOT NULL REFERENCES public.cloud_products(id) ON DELETE RESTRICT,
  environment_id uuid REFERENCES public.cloud_environments(id) ON DELETE RESTRICT,
  title text NOT NULL,
  severity text NOT NULL DEFAULT 'minor',
  status text NOT NULL DEFAULT 'detected',
  source text,
  summary text,
  detected_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cloud_incidents_severity_check CHECK (severity IN ('minor', 'major', 'critical')),
  CONSTRAINT cloud_incidents_status_check CHECK (status IN ('detected', 'investigating', 'mitigating', 'resolved', 'postmortem'))
);

CREATE TABLE IF NOT EXISTS public.cloud_care_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  client_id uuid NOT NULL REFERENCES public.cloud_clients(id) ON DELETE RESTRICT,
  plan_key text NOT NULL,
  status text NOT NULL DEFAULT 'unknown',
  starts_at timestamptz,
  expires_at timestamptz,
  included_support jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cloud_care_plans_status_check CHECK (status IN ('active', 'paused', 'expired', 'unknown'))
);

CREATE TABLE IF NOT EXISTS public.cloud_support_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  client_id uuid NOT NULL REFERENCES public.cloud_clients(id) ON DELETE RESTRICT,
  product_id uuid REFERENCES public.cloud_products(id) ON DELETE RESTRICT,
  environment_id uuid REFERENCES public.cloud_environments(id) ON DELETE RESTRICT,
  requester_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  subject text NOT NULL,
  description text NOT NULL,
  priority text NOT NULL DEFAULT 'normal',
  status text NOT NULL DEFAULT 'open',
  reference_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cloud_support_requests_priority_check CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  CONSTRAINT cloud_support_requests_status_check CHECK (status IN ('open', 'in_progress', 'waiting_on_client', 'resolved', 'closed'))
);

CREATE TABLE IF NOT EXISTS public.cloud_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  client_id uuid REFERENCES public.cloud_clients(id) ON DELETE RESTRICT,
  provider text NOT NULL,
  status text NOT NULL DEFAULT 'not_configured',
  public_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  secret_ref text,
  last_checked_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (platform_organization_id, client_id, provider),
  CONSTRAINT cloud_integrations_status_check CHECK (status IN ('operational', 'degraded', 'incident', 'maintenance', 'unknown', 'not_configured'))
);

CREATE TABLE IF NOT EXISTS public.cloud_audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  actor_user_id uuid,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  outcome text NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  request_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT cloud_audit_events_outcome_check CHECK (outcome IN ('success', 'failure'))
);


-- Observations are supplied only by trusted ingestion. A successful status requires
-- evidence identity and time; this constraint does not verify a provider by itself.
ALTER TABLE public.cloud_environments ADD COLUMN source text, ADD COLUMN checked_at timestamptz;
ALTER TABLE public.cloud_resources ADD COLUMN source text, ADD COLUMN checked_at timestamptz;
ALTER TABLE public.cloud_deployments ADD COLUMN source text, ADD COLUMN checked_at timestamptz;
ALTER TABLE public.cloud_monitoring_results ADD COLUMN source text;
ALTER TABLE public.cloud_backup_capabilities ADD COLUMN source text, ADD COLUMN checked_at timestamptz;
ALTER TABLE public.cloud_backup_runs ADD COLUMN source text, ADD COLUMN checked_at timestamptz;
ALTER TABLE public.cloud_integrations ADD COLUMN source text;
ALTER TABLE public.cloud_monitoring_checks ALTER COLUMN enabled SET DEFAULT false;
ALTER TABLE public.cloud_backup_capabilities
  ADD CONSTRAINT cloud_backup_retention CHECK (retention_days IS NULL OR retention_days >= 0),
  ADD CONSTRAINT cloud_backup_verification_evidence CHECK (
    verification_status <> 'verified' OR
    (last_success_at IS NOT NULL AND nullif(btrim(source),'') IS NOT NULL AND checked_at IS NOT NULL)
  );
ALTER TABLE public.cloud_monitoring_results
  ADD CONSTRAINT cloud_monitoring_latency CHECK (latency_ms IS NULL OR latency_ms >= 0);
ALTER TABLE public.cloud_support_requests
  ADD CONSTRAINT cloud_support_environment_requires_product CHECK (environment_id IS NULL OR product_id IS NOT NULL),
  ADD CONSTRAINT cloud_support_subject_length CHECK (length(btrim(subject)) BETWEEN 1 AND 200),
  ADD CONSTRAINT cloud_support_description_length CHECK (length(btrim(description)) BETWEEN 1 AND 10000);

DO $$
DECLARE table_name text; status_column text; time_column text;
BEGIN
  FOR table_name, status_column, time_column IN
    SELECT * FROM (VALUES
      ('cloud_environments','status','checked_at'),
      ('cloud_resources','status','checked_at'),
      ('cloud_monitoring_results','status','checked_at'),
      ('cloud_backup_capabilities','capability_status','checked_at'),
      ('cloud_integrations','status','last_checked_at')
    ) AS observation_tables(t,s,c)
  LOOP
    EXECUTE format(
      'ALTER TABLE public.%I ADD CONSTRAINT %I CHECK (%I IN (''unknown'',''not_configured'') OR (nullif(btrim(source),'''') IS NOT NULL AND %I IS NOT NULL))',
      table_name, table_name || '_evidence', status_column, time_column);
  END LOOP;
END $$;
ALTER TABLE public.cloud_deployments ADD CONSTRAINT cloud_deployments_evidence CHECK (
  status = 'unknown' OR (nullif(btrim(source),'') IS NOT NULL AND checked_at IS NOT NULL)
);
ALTER TABLE public.cloud_backup_runs ADD CONSTRAINT cloud_backup_runs_evidence CHECK (
  status = 'unknown' OR (nullif(btrim(source),'') IS NOT NULL AND checked_at IS NOT NULL)
);
ALTER TABLE public.cloud_deployments
  ADD CONSTRAINT cloud_deployments_finished CHECK (status NOT IN ('succeeded','failed','cancelled') OR finished_at IS NOT NULL),
  ADD CONSTRAINT cloud_deployments_failure CHECK (status <> 'failed' OR nullif(btrim(failure_code),'') IS NOT NULL);
ALTER TABLE public.cloud_backup_runs
  ADD CONSTRAINT cloud_backup_runs_finished CHECK (status NOT IN ('succeeded','failed','cancelled') OR finished_at IS NOT NULL),
  ADD CONSTRAINT cloud_backup_runs_failure CHECK (status <> 'failed' OR nullif(btrim(failure_code),'') IS NOT NULL);

-- Composite foreign keys protect the entire tenant path even for service_role.
-- Scope columns are also immutable, so a parent cannot silently move its children.
ALTER TABLE public.cloud_clients ADD UNIQUE (id, platform_organization_id);
ALTER TABLE public.cloud_products ADD UNIQUE (id, platform_organization_id), ADD UNIQUE (id, client_id, platform_organization_id);
ALTER TABLE public.cloud_environments ADD UNIQUE (id, product_id, platform_organization_id);
ALTER TABLE public.cloud_resources ADD UNIQUE (id, product_id, platform_organization_id);
ALTER TABLE public.cloud_monitoring_checks ADD UNIQUE (id, product_id, environment_id, platform_organization_id);
ALTER TABLE public.cloud_backup_capabilities ADD UNIQUE (id, product_id, platform_organization_id);

DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['cloud_products','cloud_care_plans','cloud_support_requests','cloud_integrations'] LOOP
    EXECUTE format('ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (client_id,platform_organization_id) REFERENCES public.cloud_clients(id,platform_organization_id)',
      table_name, table_name || '_client_scope');
  END LOOP;
  FOREACH table_name IN ARRAY ARRAY['cloud_environments','cloud_resources','cloud_deployments','cloud_monitoring_checks','cloud_monitoring_results','cloud_backup_capabilities','cloud_backup_runs','cloud_incidents'] LOOP
    EXECUTE format('ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (product_id,platform_organization_id) REFERENCES public.cloud_products(id,platform_organization_id)',
      table_name, table_name || '_product_scope');
  END LOOP;
  FOREACH table_name IN ARRAY ARRAY['cloud_resources','cloud_deployments','cloud_monitoring_checks','cloud_monitoring_results','cloud_backup_capabilities','cloud_backup_runs','cloud_incidents','cloud_support_requests'] LOOP
    EXECUTE format('ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (environment_id,product_id,platform_organization_id) REFERENCES public.cloud_environments(id,product_id,platform_organization_id)',
      table_name, table_name || '_environment_scope');
  END LOOP;
END $$;
ALTER TABLE public.cloud_support_requests ADD CONSTRAINT cloud_support_product_scope
  FOREIGN KEY (product_id,client_id,platform_organization_id) REFERENCES public.cloud_products(id,client_id,platform_organization_id);
ALTER TABLE public.cloud_monitoring_results ADD CONSTRAINT cloud_result_check_scope
  FOREIGN KEY (check_id,product_id,environment_id,platform_organization_id)
  REFERENCES public.cloud_monitoring_checks(id,product_id,environment_id,platform_organization_id);
ALTER TABLE public.cloud_backup_capabilities ADD CONSTRAINT cloud_backup_resource_scope
  FOREIGN KEY (resource_id,product_id,platform_organization_id)
  REFERENCES public.cloud_resources(id,product_id,platform_organization_id);
ALTER TABLE public.cloud_backup_runs ADD CONSTRAINT cloud_run_capability_scope
  FOREIGN KEY (capability_id,product_id,platform_organization_id)
  REFERENCES public.cloud_backup_capabilities(id,product_id,platform_organization_id);
CREATE UNIQUE INDEX cloud_platform_integration_unique
  ON public.cloud_integrations(platform_organization_id,provider) WHERE client_id IS NULL;

CREATE OR REPLACE FUNCTION public.cloud_validate_backup_environment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE expected_environment uuid;
BEGIN
  IF TG_TABLE_NAME = 'cloud_backup_capabilities' THEN
    SELECT environment_id INTO expected_environment FROM public.cloud_resources WHERE id = NEW.resource_id;
  ELSE
    SELECT environment_id INTO expected_environment FROM public.cloud_backup_capabilities WHERE id = NEW.capability_id;
  END IF;
  IF NEW.environment_id IS DISTINCT FROM expected_environment THEN
    RAISE EXCEPTION 'cloud_backup_environment_mismatch' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER cloud_backup_environment BEFORE INSERT OR UPDATE ON public.cloud_backup_capabilities
  FOR EACH ROW EXECUTE FUNCTION public.cloud_validate_backup_environment();
CREATE TRIGGER cloud_backup_run_environment BEFORE INSERT OR UPDATE ON public.cloud_backup_runs
  FOR EACH ROW EXECUTE FUNCTION public.cloud_validate_backup_environment();

CREATE OR REPLACE FUNCTION public.cloud_is_platform_member(p_org_id uuid, p_roles text[] DEFAULT ARRAY['volynx_admin','volynx_operator']::text[])
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM public.cloud_console_members m
    WHERE m.platform_organization_id = p_org_id AND m.user_id = auth.uid() AND m.role = ANY(p_roles));
$$;
CREATE OR REPLACE FUNCTION public.cloud_has_client_role(p_client_id uuid, p_roles text[])
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM public.cloud_client_members m JOIN public.cloud_clients c ON c.id = m.client_id
    WHERE m.client_id = p_client_id AND m.user_id = auth.uid() AND m.role = ANY(p_roles) AND c.status = 'active');
$$;
CREATE OR REPLACE FUNCTION public.cloud_can_access_client(p_client_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM public.cloud_clients c WHERE c.id = p_client_id AND
    (public.cloud_is_platform_member(c.platform_organization_id)
      OR public.cloud_has_client_role(c.id, ARRAY['client_admin','client_viewer']::text[])));
$$;
CREATE OR REPLACE FUNCTION public.cloud_can_access_product(p_product_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM public.cloud_products p WHERE p.id = p_product_id AND public.cloud_can_access_client(p.client_id));
$$;

-- Database audit is atomic with successful mutations. Failed transactions roll it
-- back; the future API must persist explicit failures separately with reference IDs.
CREATE OR REPLACE FUNCTION public.cloud_record_audit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE row_data jsonb; org_id uuid; changed_keys jsonb;
BEGIN
  IF TG_OP = 'DELETE' THEN row_data := to_jsonb(OLD); ELSE row_data := to_jsonb(NEW); END IF;
  org_id := (row_data->>'platform_organization_id')::uuid;
  IF TG_TABLE_NAME = 'cloud_client_members' THEN
    SELECT platform_organization_id INTO org_id FROM public.cloud_clients WHERE id = (row_data->>'client_id')::uuid;
  END IF;
  IF TG_OP = 'UPDATE' THEN
    SELECT coalesce(jsonb_agg(n.key ORDER BY n.key), '[]'::jsonb) INTO changed_keys
    FROM jsonb_each(to_jsonb(NEW)) n WHERE n.value IS DISTINCT FROM to_jsonb(OLD)->n.key;
  ELSE changed_keys := '[]'::jsonb;
  END IF;
  INSERT INTO public.cloud_audit_events(platform_organization_id,actor_user_id,action,entity_type,entity_id,outcome,metadata)
  VALUES (org_id, auth.uid(), lower(TG_OP), TG_TABLE_NAME, (row_data->>'id')::uuid, 'success',
    jsonb_build_object('changedFields',changed_keys,'databaseRole',current_setting('role',true)));
  RETURN NULL;
END $$;
CREATE OR REPLACE FUNCTION public.cloud_reject_audit_mutation()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  RAISE EXCEPTION 'cloud_audit_is_append_only' USING ERRCODE = '42501';
END $$;
CREATE TRIGGER cloud_audit_append_only BEFORE UPDATE OR DELETE OR TRUNCATE ON public.cloud_audit_events
  FOR EACH STATEMENT EXECUTE FUNCTION public.cloud_reject_audit_mutation();

CREATE OR REPLACE FUNCTION public.cloud_preserve_identity()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE field_name text;
BEGIN
  FOREACH field_name IN ARRAY ARRAY['id','platform_organization_id','client_id','product_id','environment_id',
    'resource_id','check_id','capability_id','user_id','requester_id','volynx_id','created_at'] LOOP
    IF to_jsonb(OLD)->field_name IS DISTINCT FROM to_jsonb(NEW)->field_name THEN
      RAISE EXCEPTION 'cloud_identity_immutable: %',field_name USING ERRCODE = '23514';
    END IF;
  END LOOP;
  RETURN NEW;
END $$;

-- Explicit privileges neutralize broad Supabase defaults. No direct destructive
-- writes or infrastructure actions are exposed until guarded APIs exist.
DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'cloud_console_members','cloud_clients','cloud_client_members','cloud_products','cloud_environments',
    'cloud_resources','cloud_deployments','cloud_monitoring_checks','cloud_monitoring_results',
    'cloud_backup_capabilities','cloud_backup_runs','cloud_incidents','cloud_care_plans',
    'cloud_support_requests','cloud_integrations','cloud_audit_events'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',table_name);
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC,anon,authenticated,service_role',table_name);
    IF table_name = 'cloud_audit_events' THEN
      EXECUTE format('GRANT SELECT,INSERT ON TABLE public.%I TO service_role',table_name);
    ELSE
      EXECUTE format('GRANT SELECT,INSERT,UPDATE,DELETE ON TABLE public.%I TO service_role',table_name);
      EXECUTE format('CREATE TRIGGER cloud_identity_guard BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.cloud_preserve_identity()',table_name);
      EXECUTE format('CREATE TRIGGER cloud_audit_change AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.cloud_record_audit()',table_name);
    END IF;
    IF table_name <> 'cloud_client_members' THEN
      EXECUTE format('CREATE INDEX %I ON public.%I(platform_organization_id)',table_name || '_organization_idx',table_name);
    END IF;
  END LOOP;
END $$;

-- Client-safe columns only. Repository URLs, raw results/config, secret references,
-- internal metadata and provider error messages must be projected by a future API.
GRANT SELECT (id,platform_organization_id,user_id,role,created_at) ON public.cloud_console_members TO authenticated;
GRANT SELECT (id,platform_organization_id,name,slug,status,created_at,updated_at) ON public.cloud_clients TO authenticated;
GRANT SELECT (id,client_id,user_id,role,created_at) ON public.cloud_client_members TO authenticated;
GRANT SELECT (id,platform_organization_id,client_id,volynx_id,name,slug,status,production_url,created_at,updated_at) ON public.cloud_products TO authenticated;
GRANT SELECT (id,platform_organization_id,product_id,environment_key,name,kind,status,source,checked_at,created_at,updated_at) ON public.cloud_environments TO authenticated;
GRANT SELECT (id,platform_organization_id,product_id,environment_id,provider,resource_kind,name,status,source,checked_at,last_seen_at,created_at,updated_at) ON public.cloud_resources TO authenticated;
GRANT SELECT (id,platform_organization_id,product_id,environment_id,provider,commit_sha,status,started_at,finished_at,failure_code,source,checked_at,created_at) ON public.cloud_deployments TO authenticated;
GRANT SELECT ON public.cloud_monitoring_checks TO authenticated;
GRANT SELECT (id,platform_organization_id,product_id,environment_id,check_id,status,checked_at,latency_ms,failure_code,source) ON public.cloud_monitoring_results TO authenticated;
GRANT SELECT (id,platform_organization_id,product_id,environment_id,resource_id,provider,capability_status,retention_days,last_success_at,restore_supported,verification_status,source,checked_at,created_at,updated_at) ON public.cloud_backup_capabilities TO authenticated;
GRANT SELECT (id,platform_organization_id,product_id,environment_id,capability_id,status,started_at,finished_at,failure_code,source,checked_at,created_at) ON public.cloud_backup_runs TO authenticated;
GRANT SELECT (id,platform_organization_id,product_id,environment_id,title,severity,status,source,summary,detected_at,resolved_at,created_at,updated_at) ON public.cloud_incidents TO authenticated;
GRANT SELECT (id,platform_organization_id,client_id,plan_key,status,starts_at,expires_at,created_at,updated_at) ON public.cloud_care_plans TO authenticated;
GRANT SELECT (id,platform_organization_id,client_id,product_id,environment_id,requester_id,subject,description,priority,status,reference_id,created_at,updated_at) ON public.cloud_support_requests TO authenticated;
GRANT SELECT (id,platform_organization_id,client_id,provider,status,last_checked_at,source,created_at,updated_at) ON public.cloud_integrations TO authenticated;
GRANT SELECT ON public.cloud_audit_events TO authenticated;

GRANT INSERT (platform_organization_id,user_id,role), UPDATE(role) ON public.cloud_console_members TO authenticated;
GRANT INSERT (platform_organization_id,name,slug,status), UPDATE(name,slug,status) ON public.cloud_clients TO authenticated;
GRANT INSERT (client_id,user_id,role), UPDATE(role) ON public.cloud_client_members TO authenticated;
GRANT INSERT (platform_organization_id,client_id,volynx_id,name,slug,production_url), UPDATE(name,slug,status,production_url) ON public.cloud_products TO authenticated;
GRANT INSERT (platform_organization_id,product_id,environment_key,name,kind), UPDATE(environment_key,name,kind) ON public.cloud_environments TO authenticated;
GRANT INSERT (platform_organization_id,client_id,product_id,environment_id,requester_id,subject,description,priority) ON public.cloud_support_requests TO authenticated;

CREATE POLICY cloud_members_read ON public.cloud_console_members FOR SELECT TO authenticated
  USING (public.cloud_is_platform_member(platform_organization_id));
CREATE POLICY cloud_client_members_read ON public.cloud_client_members FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.cloud_is_platform_member((SELECT platform_organization_id FROM public.cloud_clients WHERE id = client_id)));
CREATE POLICY cloud_client_members_insert ON public.cloud_client_members FOR INSERT TO authenticated
  WITH CHECK (public.cloud_is_platform_member((SELECT platform_organization_id FROM public.cloud_clients WHERE id = client_id),ARRAY['volynx_admin']::text[]));
CREATE POLICY cloud_client_members_update ON public.cloud_client_members FOR UPDATE TO authenticated
  USING (public.cloud_is_platform_member((SELECT platform_organization_id FROM public.cloud_clients WHERE id = client_id),ARRAY['volynx_admin']::text[]))
  WITH CHECK (public.cloud_is_platform_member((SELECT platform_organization_id FROM public.cloud_clients WHERE id = client_id),ARRAY['volynx_admin']::text[]));
CREATE POLICY cloud_clients_read ON public.cloud_clients FOR SELECT TO authenticated
  USING (public.cloud_is_platform_member(platform_organization_id)
    OR (status = 'active' AND public.cloud_has_client_role(id,ARRAY['client_admin','client_viewer']::text[])));
CREATE POLICY cloud_products_read ON public.cloud_products FOR SELECT TO authenticated
  USING (public.cloud_is_platform_member(platform_organization_id)
    OR public.cloud_has_client_role(client_id,ARRAY['client_admin','client_viewer']::text[]));

DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['cloud_console_members','cloud_clients','cloud_products','cloud_environments'] LOOP
    EXECUTE format('CREATE POLICY cloud_admin_insert ON public.%I FOR INSERT TO authenticated WITH CHECK (public.cloud_is_platform_member(platform_organization_id,ARRAY[''volynx_admin'']::text[]))',table_name);
    EXECUTE format('CREATE POLICY cloud_admin_update ON public.%I FOR UPDATE TO authenticated USING (public.cloud_is_platform_member(platform_organization_id,ARRAY[''volynx_admin'']::text[])) WITH CHECK (public.cloud_is_platform_member(platform_organization_id,ARRAY[''volynx_admin'']::text[]))',table_name);
  END LOOP;
  FOREACH table_name IN ARRAY ARRAY['cloud_environments','cloud_resources','cloud_deployments','cloud_monitoring_results','cloud_backup_capabilities','cloud_backup_runs','cloud_incidents'] LOOP
    EXECUTE format('CREATE POLICY cloud_product_read ON public.%I FOR SELECT TO authenticated USING (public.cloud_can_access_product(product_id))',table_name);
  END LOOP;
  FOREACH table_name IN ARRAY ARRAY['cloud_monitoring_checks','cloud_integrations','cloud_audit_events'] LOOP
    EXECUTE format('CREATE POLICY cloud_operator_read ON public.%I FOR SELECT TO authenticated USING (public.cloud_is_platform_member(platform_organization_id))',table_name);
  END LOOP;
  FOREACH table_name IN ARRAY ARRAY['cloud_clients','cloud_products','cloud_environments','cloud_resources','cloud_monitoring_checks','cloud_backup_capabilities','cloud_incidents','cloud_care_plans','cloud_support_requests','cloud_integrations'] LOOP
    EXECUTE format('CREATE TRIGGER cloud_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()',table_name);
  END LOOP;
END $$;
CREATE POLICY cloud_care_read ON public.cloud_care_plans FOR SELECT TO authenticated
  USING (public.cloud_can_access_client(client_id));
CREATE POLICY cloud_support_read ON public.cloud_support_requests FOR SELECT TO authenticated
  USING (public.cloud_is_platform_member(platform_organization_id)
    OR public.cloud_has_client_role(client_id,ARRAY['client_admin']::text[])
    OR (requester_id = auth.uid() AND public.cloud_can_access_client(client_id)));
CREATE POLICY cloud_support_insert ON public.cloud_support_requests FOR INSERT TO authenticated
  WITH CHECK (requester_id = auth.uid() AND public.cloud_can_access_client(client_id) AND status = 'open');

-- Definer helpers cannot be invoked anonymously or inherited through PUBLIC.
-- Trigger-only functions are not remotely callable by authenticated/service roles.
DO $$
DECLARE function_oid regprocedure;
BEGIN
  FOR function_oid IN SELECT p.oid::regprocedure FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname IN (
      'cloud_validate_backup_environment','cloud_is_platform_member','cloud_has_client_role',
      'cloud_can_access_client','cloud_can_access_product','cloud_record_audit',
      'cloud_reject_audit_mutation','cloud_preserve_identity')
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated,service_role',function_oid);
  END LOOP;
END $$;
GRANT EXECUTE ON FUNCTION public.cloud_is_platform_member(uuid,text[]),
  public.cloud_has_client_role(uuid,text[]),public.cloud_can_access_client(uuid),
  public.cloud_can_access_product(uuid) TO authenticated;

CREATE INDEX cloud_members_user_idx ON public.cloud_console_members(user_id);
CREATE INDEX cloud_client_members_user_idx ON public.cloud_client_members(user_id);
CREATE INDEX cloud_client_members_client_idx ON public.cloud_client_members(client_id);
CREATE INDEX cloud_products_client_idx ON public.cloud_products(client_id);
CREATE INDEX cloud_environments_product_idx ON public.cloud_environments(product_id);
CREATE INDEX cloud_resources_product_idx ON public.cloud_resources(product_id);
CREATE INDEX cloud_deployments_product_created_idx ON public.cloud_deployments(product_id,created_at DESC);
CREATE INDEX cloud_monitoring_results_check_checked_idx ON public.cloud_monitoring_results(check_id,checked_at DESC);
CREATE INDEX cloud_backup_runs_capability_created_idx ON public.cloud_backup_runs(capability_id,created_at DESC);
CREATE INDEX cloud_incidents_product_status_idx ON public.cloud_incidents(product_id,status,detected_at DESC);
CREATE INDEX cloud_audit_events_org_occurred_idx ON public.cloud_audit_events(platform_organization_id,occurred_at DESC);

COMMIT;
