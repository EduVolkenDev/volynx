-- Assign the confirmed Johnny account as the owner of the Johnny / Parisnez
-- Property Flow organization.

begin;

do $$
declare
  v_organization_id uuid;
  v_user_id uuid;
begin
  select id
    into v_organization_id
    from public.organizations
   where slug = 'johnny-parisnez';

  select id
    into v_user_id
    from auth.users
   where lower(email) = 'johnnyparisnez@gmail.com'
   limit 1;

  if v_organization_id is null then
    raise exception 'Johnny organization not found';
  end if;

  if v_user_id is null then
    raise exception 'Johnny account not found';
  end if;

  update public.organizations
     set owner_id = v_user_id,
         updated_at = now()
   where id = v_organization_id;

  insert into public.organization_members (organization_id, user_id, role)
  values (v_organization_id, v_user_id, 'owner')
  on conflict (organization_id, user_id)
  do update set role = 'owner';
end;
$$;

commit;
