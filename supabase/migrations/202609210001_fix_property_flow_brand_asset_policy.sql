-- The original brand-upload policy accidentally evaluated storage.foldername
-- against sites.name inside its nested EXISTS query. That always fails the
-- site match, so legitimate workspace owners cannot upload their own logo.

begin;

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
      where s.organization_id = (storage.foldername(objects.name))[1]::uuid
        and s.id = (storage.foldername(objects.name))[2]::uuid
        and s.template_key = 'property-flow'
    )
  );

commit;
