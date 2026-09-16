-- Property Flow fulfillment pipeline:
-- purchase -> entitlement -> workspace -> VOLYNX subdomain -> onboarding -> published shell.
-- The Stripe webhook calls the same idempotent function that the dashboard uses
-- as a recovery path. No payment row or tenant is duplicated on retries.

begin;

create table if not exists public.property_flow_workspaces (
  id                  uuid primary key default gen_random_uuid(),
  purchase_id         uuid references public.addons_purchased(id) on delete set null,
  user_id             uuid not null references auth.users(id) on delete cascade,
  organization_id     uuid not null references public.organizations(id) on delete cascade,
  site_id             uuid not null references public.sites(id) on delete cascade,
  tier                text not null,
  template_count      integer not null default 3,
  status              text not null default 'provisioning',
  onboarding_status   text not null default 'pending',
  onboarding_step     text not null default 'brand',
  publication_mode    text not null default 'volynx-subdomain',
  subdomain           text not null,
  custom_domain       text,
  public_url          text not null,
  stripe_session_id   text,
  metadata            jsonb not null default '{}'::jsonb,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  published_at        timestamptz,
  constraint property_flow_workspaces_tier_check
    check (tier in ('starter', 'professional', 'white-label')),
  constraint property_flow_workspaces_status_check
    check (status in ('provisioning', 'onboarding', 'published', 'paused', 'archived')),
  constraint property_flow_workspaces_onboarding_check
    check (onboarding_status in ('pending', 'in_progress', 'complete')),
  constraint property_flow_workspaces_publication_check
    check (publication_mode in ('volynx-subdomain', 'custom-domain', 'existing-site')),
  unique (site_id),
  unique (purchase_id)
);

alter table public.property_flow_workspaces
  add column if not exists purchase_id uuid references public.addons_purchased(id) on delete set null;
alter table public.property_flow_workspaces
  add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.property_flow_workspaces
  add column if not exists organization_id uuid references public.organizations(id) on delete cascade;
alter table public.property_flow_workspaces
  add column if not exists site_id uuid references public.sites(id) on delete cascade;
alter table public.property_flow_workspaces
  add column if not exists tier text;
alter table public.property_flow_workspaces
  add column if not exists template_count integer not null default 3;
alter table public.property_flow_workspaces
  add column if not exists status text not null default 'provisioning';
alter table public.property_flow_workspaces
  add column if not exists onboarding_status text not null default 'pending';
alter table public.property_flow_workspaces
  add column if not exists onboarding_step text not null default 'brand';
alter table public.property_flow_workspaces
  add column if not exists publication_mode text not null default 'volynx-subdomain';
alter table public.property_flow_workspaces
  add column if not exists subdomain text;
alter table public.property_flow_workspaces
  add column if not exists custom_domain text;
alter table public.property_flow_workspaces
  add column if not exists public_url text;
alter table public.property_flow_workspaces
  add column if not exists stripe_session_id text;
alter table public.property_flow_workspaces
  add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.property_flow_workspaces
  add column if not exists created_at timestamptz not null default now();
alter table public.property_flow_workspaces
  add column if not exists updated_at timestamptz not null default now();
alter table public.property_flow_workspaces
  add column if not exists published_at timestamptz;

create unique index if not exists property_flow_workspaces_purchase_unique
  on public.property_flow_workspaces(purchase_id)
  where purchase_id is not null;
create unique index if not exists property_flow_workspaces_site_unique
  on public.property_flow_workspaces(site_id);
create index if not exists property_flow_workspaces_user_idx
  on public.property_flow_workspaces(user_id, updated_at desc);

drop trigger if exists property_flow_workspaces_set_updated_at on public.property_flow_workspaces;
create trigger property_flow_workspaces_set_updated_at
  before update on public.property_flow_workspaces
  for each row execute function public.set_updated_at();

alter table public.property_flow_workspaces enable row level security;

drop policy if exists "Property Flow owners can view workspaces" on public.property_flow_workspaces;
create policy "Property Flow owners can view workspaces"
  on public.property_flow_workspaces for select
  to authenticated
  using (user_id = auth.uid() or public.is_org_member(organization_id));

drop policy if exists "Property Flow editors can update workspaces" on public.property_flow_workspaces;
create policy "Property Flow editors can update workspaces"
  on public.property_flow_workspaces for update
  to authenticated
  using (public.has_org_role(organization_id, array['owner', 'admin', 'editor']::text[]))
  with check (public.has_org_role(organization_id, array['owner', 'admin', 'editor']::text[]));

grant select, update on table public.property_flow_workspaces to authenticated;

create or replace function public.provision_property_flow_workspace(
  p_user_id uuid,
  p_purchase_id uuid default null,
  p_tier text default null,
  p_tier_label text default null,
  p_stripe_session_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_id uuid := auth.uid();
  v_tier text := lower(replace(coalesce(p_tier, ''), '_', '-'));
  v_entitled_tier text;
  v_template_count integer;
  v_purchase_exists boolean := false;
  v_workspace public.property_flow_workspaces%rowtype;
  v_site public.sites%rowtype;
  v_organization public.organizations%rowtype;
  v_suffix text := substr(replace(p_user_id::text, '-', ''), 1, 10);
  v_base_slug text := 'propertyflow-' || v_suffix;
  v_slug text;
  v_attempt integer := 0;
  v_site_settings jsonb;
begin
  if p_user_id is null then
    raise exception 'Property Flow provisioning requires a user id';
  end if;

  -- Browser callers may provision only their own workspace. The service role
  -- webhook has no auth.uid() and is allowed to provision the purchaser.
  if coalesce(current_setting('request.jwt.claim.role', true), '') = 'authenticated'
     and (v_caller_id is null or v_caller_id <> p_user_id) then
    raise exception 'Property Flow provisioning user mismatch';
  end if;

  if p_purchase_id is not null then
    select exists (
      select 1
      from public.addons_purchased ap
      where ap.id = p_purchase_id
        and ap.user_id = p_user_id
        and ap.status = 'active'
        and ap.addon_id like 'pf_%'
    ) into v_purchase_exists;

    if not v_purchase_exists then
      raise exception 'Property Flow purchase is not active for this user';
    end if;
  end if;

  -- Authenticated users can only be provisioned from their real entitlement.
  -- The service role may pass a tier while fulfilling a verified webhook.
  if coalesce(current_setting('request.jwt.claim.role', true), '') = 'authenticated' then
    select lower(replace(coalesce(pf_access.tier, ''), '_', '-'))
      into v_entitled_tier
      from public.get_property_flow_access() pf_access;
    v_tier := v_entitled_tier;
  elsif v_tier not in ('starter', 'professional', 'white-label') then
    select lower(replace(coalesce(pf_access.tier, ''), '_', '-'))
      into v_tier
      from public.get_property_flow_access() pf_access;
  end if;

  if v_tier not in ('starter', 'professional', 'white-label') then
    raise exception 'Property Flow entitlement is not active';
  end if;

  v_template_count := case v_tier
    when 'starter' then 3
    when 'professional' then 6
    when 'white-label' then 15
  end;

  -- Stripe retries return the exact workspace already attached to the purchase.
  if p_purchase_id is not null then
    select * into v_workspace
      from public.property_flow_workspaces
     where purchase_id = p_purchase_id
     limit 1;
    if found then
      return jsonb_build_object(
        'workspace_id', v_workspace.id,
        'organization_id', v_workspace.organization_id,
        'site_id', v_workspace.site_id,
        'tier', v_workspace.tier,
        'template_count', v_workspace.template_count,
        'status', v_workspace.status,
        'onboarding_status', v_workspace.onboarding_status,
        'onboarding_step', v_workspace.onboarding_step,
        'subdomain', v_workspace.subdomain,
        'public_url', v_workspace.public_url,
        'idempotent', true
      );
    end if;
  end if;

  -- A second purchase for the same account upgrades the existing Property Flow
  -- workspace instead of creating a second public site.
  select pw.* into v_workspace
    from public.property_flow_workspaces pw
   where pw.user_id = p_user_id
     and pw.status <> 'archived'
   order by pw.updated_at asc
   limit 1;

  if found then
    update public.property_flow_workspaces
       set tier = case when v_template_count > template_count then v_tier else tier end,
           template_count = greatest(template_count, v_template_count),
           purchase_id = coalesce(purchase_id, p_purchase_id),
           stripe_session_id = coalesce(p_stripe_session_id, stripe_session_id),
           metadata = metadata || jsonb_build_object('last_tier_label', coalesce(p_tier_label, v_tier)),
           updated_at = now()
     where id = v_workspace.id
     returning * into v_workspace;

    return jsonb_build_object(
      'workspace_id', v_workspace.id,
      'organization_id', v_workspace.organization_id,
      'site_id', v_workspace.site_id,
      'tier', v_workspace.tier,
      'template_count', v_workspace.template_count,
      'status', v_workspace.status,
      'onboarding_status', v_workspace.onboarding_status,
      'onboarding_step', v_workspace.onboarding_step,
      'subdomain', v_workspace.subdomain,
      'public_url', v_workspace.public_url,
      'idempotent', false,
      'upgraded', true
    );
  end if;

  -- Reuse an existing Property Flow site owned by this account when one exists.
  select s.* into v_site
    from public.sites s
    join public.organizations o on o.id = s.organization_id
   where o.owner_id = p_user_id
     and s.template_key = 'property-flow'
     and s.status <> 'archived'
   order by s.created_at asc
   limit 1;

  if not found then
    loop
      v_attempt := v_attempt + 1;
      v_slug := case when v_attempt = 1 then v_base_slug else v_base_slug || '-' || v_attempt::text end;
      begin
        insert into public.organizations (name, slug, owner_id, plan, status, metadata)
        values (
          coalesce(nullif(p_tier_label, ''), 'PropertyFlow') || ' workspace',
          v_slug,
          p_user_id,
          'property-flow',
          'active',
          jsonb_build_object('product', 'property-flow', 'tier', v_tier, 'source', 'stripe_fulfillment')
        )
        returning * into v_organization;
        exit;
      exception when unique_violation then
        if v_attempt >= 20 then raise; end if;
      end;
    end loop;

    insert into public.organization_members (organization_id, user_id, role)
    values (v_organization.id, p_user_id, 'owner')
    on conflict (organization_id, user_id) do update set role = 'owner';

    insert into public.sites (
      organization_id, name, slug, subdomain, template_key, language_default,
      languages, status, theme, settings, seo, published_at
    )
    values (
      v_organization.id,
      'Meu Property Flow',
      v_slug,
      v_slug,
      'property-flow',
      'pt',
      array['pt', 'en']::text[],
      'published',
      '{}'::jsonb,
      jsonb_build_object(
        'catalog_source', 'supabase',
        'image_bucket', 'property-flow-images',
        'property_flow', jsonb_build_object(
          'tier', v_tier,
          'template_key', 'classic-grid',
          'template_version', 1,
          'onboarding', jsonb_build_object('status', 'pending', 'step', 'brand', 'completed_steps', '[]'::jsonb),
          'publication', jsonb_build_object(
            'mode', 'volynx-subdomain',
            'domain_status', 'published',
            'subdomain', v_slug,
            'custom_domain', '',
            'integration_path', 'separate-site'
          )
        )
      ),
      jsonb_build_object('title', 'Property Flow', 'description', 'Catálogo imobiliário publicado com Property Flow.'),
      now()
    )
    returning * into v_site;
  else
    v_site_settings := coalesce(v_site.settings, '{}'::jsonb);
    update public.sites
       set subdomain = coalesce(nullif(subdomain, ''), v_base_slug),
           status = case when status = 'draft' then 'published' else status end,
           published_at = coalesce(published_at, now()),
           settings = jsonb_set(
             v_site_settings,
             '{property_flow}',
             coalesce(v_site_settings -> 'property_flow', '{}'::jsonb) || jsonb_build_object('tier', v_tier),
             true
           )
     where id = v_site.id
     returning * into v_site;
  end if;

  insert into public.property_flow_workspaces (
    purchase_id, user_id, organization_id, site_id, tier, template_count,
    status, onboarding_status, onboarding_step, publication_mode, subdomain,
    public_url, stripe_session_id, metadata, published_at
  )
  values (
    p_purchase_id,
    p_user_id,
    v_site.organization_id,
    v_site.id,
    v_tier,
    v_template_count,
    'published',
    'pending',
    'brand',
    'volynx-subdomain',
    coalesce(nullif(v_site.subdomain, ''), v_base_slug),
    'https://' || coalesce(nullif(v_site.subdomain, ''), v_base_slug) || '.volynx.world/',
    p_stripe_session_id,
    jsonb_build_object('tier_label', coalesce(p_tier_label, v_tier), 'source', 'property_flow_fulfillment'),
    coalesce(v_site.published_at, now())
  )
  returning * into v_workspace;

  return jsonb_build_object(
    'workspace_id', v_workspace.id,
    'organization_id', v_workspace.organization_id,
    'site_id', v_workspace.site_id,
    'tier', v_workspace.tier,
    'template_count', v_workspace.template_count,
    'status', v_workspace.status,
    'onboarding_status', v_workspace.onboarding_status,
    'onboarding_step', v_workspace.onboarding_step,
    'subdomain', v_workspace.subdomain,
    'public_url', v_workspace.public_url,
    'idempotent', false
  );
end;
$$;

revoke all on function public.provision_property_flow_workspace(uuid, uuid, text, text, text) from public;
grant execute on function public.provision_property_flow_workspace(uuid, uuid, text, text, text) to authenticated, service_role;

commit;
