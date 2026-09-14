-- Generic white-label image bucket for Property Flow kit buyers.
-- Johnny keeps its dedicated bucket; new kit workspaces use this one.

begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'property-flow-images',
  'property-flow-images',
  true,
  3145728,
  array['image/webp']::text[]
)
on conflict (id) do update
set public = true,
    file_size_limit = 3145728,
    allowed_mime_types = array['image/webp']::text[];

drop policy if exists "Johnny property images are publicly readable" on storage.objects;
create policy "Property Flow images are publicly readable"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id in ('johnny-property-images', 'property-flow-images'));

drop policy if exists "Johnny editors can upload property images" on storage.objects;
create policy "Property Flow editors can upload property images"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id in ('johnny-property-images', 'property-flow-images')
    and array_length(storage.foldername(name), 1) >= 3
    and public.has_org_role(
      (storage.foldername(name))[1]::uuid,
      array['owner', 'admin', 'editor']::text[]
    )
    and exists (
      select 1
      from public.property_listings p
      where p.organization_id = (storage.foldername(name))[1]::uuid
        and p.site_id = (storage.foldername(name))[2]::uuid
        and p.id = (storage.foldername(name))[3]::uuid
    )
  );

drop policy if exists "Johnny editors can update property images" on storage.objects;
create policy "Property Flow editors can update property images"
  on storage.objects for update
  to authenticated
  using (
    bucket_id in ('johnny-property-images', 'property-flow-images')
    and public.has_org_role(
      (storage.foldername(name))[1]::uuid,
      array['owner', 'admin', 'editor']::text[]
    )
  )
  with check (
    bucket_id in ('johnny-property-images', 'property-flow-images')
    and public.has_org_role(
      (storage.foldername(name))[1]::uuid,
      array['owner', 'admin', 'editor']::text[]
    )
  );

drop policy if exists "Johnny editors can delete property images" on storage.objects;
create policy "Property Flow editors can delete property images"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id in ('johnny-property-images', 'property-flow-images')
    and public.has_org_role(
      (storage.foldername(name))[1]::uuid,
      array['owner', 'admin', 'editor']::text[]
    )
  );

commit;
