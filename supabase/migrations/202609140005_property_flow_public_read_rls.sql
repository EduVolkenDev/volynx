-- Public catalogue reads must not depend on anon visibility of the private
-- sites table. Resolve publication state inside a tightly scoped definer
-- function instead of exposing tenant/workspace metadata.

begin;

create or replace function public.is_published_property_site(
  p_site_id uuid,
  p_organization_id uuid
)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.sites s
    where s.id = p_site_id
      and s.organization_id = p_organization_id
      and s.status = 'published'
  );
$$;

create or replace function public.is_published_property_listing(
  p_property_id uuid,
  p_site_id uuid,
  p_organization_id uuid
)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.property_listings p
    where p.id = p_property_id
      and p.site_id = p_site_id
      and p.organization_id = p_organization_id
      and p.status = 'published'
  )
  and public.is_published_property_site(p_site_id, p_organization_id);
$$;

revoke all on function public.is_published_property_site(uuid, uuid) from public;
revoke all on function public.is_published_property_listing(uuid, uuid, uuid) from public;
grant execute on function public.is_published_property_site(uuid, uuid) to anon, authenticated;
grant execute on function public.is_published_property_listing(uuid, uuid, uuid) to anon, authenticated;

drop policy if exists "Public can view published property listings" on public.property_listings;
create policy "Public can view published property listings"
  on public.property_listings for select
  to anon, authenticated
  using (public.is_published_property_site(site_id, organization_id));

drop policy if exists "Public can view published property listing images" on public.property_listing_images;
create policy "Public can view published property listing images"
  on public.property_listing_images for select
  to anon, authenticated
  using (public.is_published_property_listing(property_id, site_id, organization_id));

commit;
