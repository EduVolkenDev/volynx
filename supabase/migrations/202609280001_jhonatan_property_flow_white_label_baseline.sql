-- Bring the existing Jhonatan Peterson production catalogue into the
-- Property Flow White Label contract without touching its listings or images.
-- The site is already live and managed by its existing organization owner;
-- this records that fact for the current Studio and onboarding model.

begin;

do $$
declare
  v_site public.sites%rowtype;
  v_workspace public.property_flow_workspaces%rowtype;
  v_owner_id uuid;
  v_tier text := 'white-label';
  v_publication jsonb := jsonb_build_object(
    'mode', 'custom-domain',
    'domain_status', 'published',
    'subdomain', '',
    'custom_domain', 'www.jhonatanpetersonimoveis.com.br',
    'integration_path', 'separate-site'
  );
  v_admin jsonb := jsonb_build_object(
    'version', 1,
    'brand', jsonb_build_object(
      'name', 'Jhonatan Peterson',
      'tagline', 'Imóveis com curadoria, estratégia e atendimento premium.',
      'logoUrl', '',
      'mark', 'JP',
      'colors', jsonb_build_object('primary', '#d8b36a', 'accent', '#a9a0ff', 'ink', '#f7f8fc', 'surface', '#0c111d'),
      'radius', 'rounded'
    ),
    'labels', jsonb_build_object('overview', 'Visão geral', 'properties', 'Imóveis', 'appearance', 'Identidade', 'modules', 'Preferências', 'newProperty', 'Novo imóvel', 'publish', 'Publicar', 'archive', 'Arquivar'),
    'modules', jsonb_build_object('overview', true, 'properties', true, 'appearance', true, 'modules', true),
    'propertyFields', jsonb_build_object(
      'category', jsonb_build_object('visible', true, 'required', false),
      'price', jsonb_build_object('visible', true, 'required', false),
      'location', jsonb_build_object('visible', true, 'required', false),
      'summary', jsonb_build_object('visible', true, 'required', false),
      'description', jsonb_build_object('visible', true, 'required', false),
      'whatsapp', jsonb_build_object('visible', true, 'required', false)
    )
  );
begin
  select * into v_site
    from public.sites
   where lower(coalesce(domain, '')) = 'www.jhonatanpetersonimoveis.com.br'
     and template_key = 'property-flow'
   limit 1;

  if not found then
    return;
  end if;

  select owner_id into v_owner_id
    from public.organizations
   where id = v_site.organization_id;

  if v_owner_id is null then
    return;
  end if;

  update public.sites
     set settings = coalesce(settings, '{}'::jsonb) || jsonb_build_object(
       'property_flow', coalesce(settings -> 'property_flow', '{}'::jsonb) || jsonb_build_object(
         'tier', v_tier,
         'template_key', coalesce(settings -> 'property_flow' ->> 'template_key', 'classic-grid'),
         'template_version', 1,
         'onboarding', jsonb_build_object('status', 'complete', 'step', 'complete', 'completed_steps', jsonb_build_array('brand', 'template', 'publish')),
         'publication', v_publication
       ),
       'property_flow_admin', coalesce(settings -> 'property_flow_admin', v_admin)
     )
   where id = v_site.id;

  select * into v_workspace
    from public.property_flow_workspaces
   where site_id = v_site.id
   limit 1;

  if found then
    update public.property_flow_workspaces
       set tier = v_tier,
           template_count = greatest(template_count, 15),
           status = 'published',
           onboarding_status = 'complete',
           onboarding_step = 'complete',
           publication_mode = 'custom-domain',
           subdomain = coalesce(nullif(subdomain, ''), 'jhonatan-peterson'),
           custom_domain = 'www.jhonatanpetersonimoveis.com.br',
           public_url = 'https://www.jhonatanpetersonimoveis.com.br/',
           published_at = coalesce(published_at, now()),
           metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('source', 'existing_jhonatan_production_catalogue'),
           updated_at = now()
     where id = v_workspace.id;
  else
    insert into public.property_flow_workspaces (
      user_id, organization_id, site_id, tier, template_count, status,
      onboarding_status, onboarding_step, publication_mode, subdomain,
      custom_domain, public_url, metadata, published_at
    ) values (
      v_owner_id,
      v_site.organization_id,
      v_site.id,
      v_tier,
      15,
      'published',
      'complete',
      'complete',
      'custom-domain',
      'jhonatan-peterson',
      'www.jhonatanpetersonimoveis.com.br',
      'https://www.jhonatanpetersonimoveis.com.br/',
      jsonb_build_object('source', 'existing_jhonatan_production_catalogue'),
      coalesce(v_site.published_at, now())
    );
  end if;
end $$;

commit;
