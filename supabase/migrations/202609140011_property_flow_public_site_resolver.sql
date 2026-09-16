-- Resolve a published Property Flow tenant from a hostname without exposing
-- the private sites table to anonymous clients. The public renderer uses this
-- function before reading only that tenant's published catalogue rows.

begin;

create or replace function public.get_public_property_flow_site(p_host text)
returns table (
  id uuid,
  organization_id uuid,
  name text,
  slug text,
  domain text,
  subdomain text,
  status text,
  template_key text,
  theme jsonb,
  settings jsonb
)
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_host text := lower(trim(coalesce(p_host, '')));
begin
  v_host := regexp_replace(v_host, '^https?://', '');
  v_host := split_part(v_host, '/', 1);
  v_host := split_part(v_host, ':', 1);
  v_host := regexp_replace(v_host, '[.]$', '');

  if v_host = '' then
    return;
  end if;

  return query
  select
    s.id,
    s.organization_id,
    s.name,
    s.slug,
    s.domain,
    s.subdomain,
    s.status,
    s.template_key,
    s.theme,
    jsonb_build_object(
      'property_flow', coalesce(s.settings -> 'property_flow', '{}'::jsonb),
      'property_flow_admin', coalesce(s.settings -> 'property_flow_admin', '{}'::jsonb),
      'image_bucket', coalesce(s.settings -> 'image_bucket', '"property-flow-images"'::jsonb)
    )
  from public.sites s
  where s.template_key = 'property-flow'
    and s.status = 'published'
    and (
      lower(coalesce(s.domain, '')) = v_host
      or lower(coalesce(s.subdomain, '')) || '.volynx.world' = v_host
      or lower(coalesce(s.slug, '')) = v_host
    )
  order by s.updated_at desc
  limit 1;
end;
$$;

revoke all on function public.get_public_property_flow_site(text) from public;
grant execute on function public.get_public_property_flow_site(text) to anon, authenticated;

commit;
