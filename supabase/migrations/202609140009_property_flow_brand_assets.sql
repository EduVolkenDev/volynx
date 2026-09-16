-- Public, optimized brand assets for Property Flow sites.
-- Brand files are stored outside the property catalog and are referenced by URL
-- in sites.settings, so changing a logo never touches property records.

begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('property-flow-assets', 'property-flow-assets', true, 1048576, array['image/webp']::text[])
on conflict (id) do update
set public = true,
    file_size_limit = 1048576,
    allowed_mime_types = array['image/webp']::text[];

drop policy if exists "Property Flow brand assets are publicly readable" on storage.objects;
create policy "Property Flow brand assets are publicly readable"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'property-flow-assets');

drop policy if exists "Property Flow editors can upload brand assets" on storage.objects;
create policy "Property Flow editors can upload brand assets"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'property-flow-assets'
    and array_length(storage.foldername(name), 1) >= 3
    and public.has_org_role(
      (storage.foldername(name))[1]::uuid,
      array['owner', 'admin', 'editor']::text[]
    )
    and exists (
      select 1
      from public.sites s
      where s.organization_id = (storage.foldername(name))[1]::uuid
        and s.id = (storage.foldername(name))[2]::uuid
        and s.template_key = 'property-flow'
    )
  );

drop policy if exists "Property Flow editors can update brand assets" on storage.objects;
create policy "Property Flow editors can update brand assets"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'property-flow-assets'
    and public.has_org_role((storage.foldername(name))[1]::uuid, array['owner', 'admin', 'editor']::text[])
  )
  with check (
    bucket_id = 'property-flow-assets'
    and public.has_org_role((storage.foldername(name))[1]::uuid, array['owner', 'admin', 'editor']::text[])
  );

drop policy if exists "Property Flow editors can delete brand assets" on storage.objects;
create policy "Property Flow editors can delete brand assets"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'property-flow-assets'
    and public.has_org_role((storage.foldername(name))[1]::uuid, array['owner', 'admin', 'editor']::text[])
  );

commit;
