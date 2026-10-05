-- Grant Eduardo's confirmed VOLYNX account administrative access to the
-- existing Johnny / Parisnez workspace. This reuses the existing organization
-- and catalog; it does not create a second dashboard or tenant.

begin;

insert into public.organization_members (organization_id, user_id, role)
select o.id, u.id, 'admin'
  from public.organizations o
  join auth.users u on lower(u.email) = 'edupelomundo13@gmail.com'
 where o.slug = 'johnny-parisnez'
on conflict (organization_id, user_id)
do update set role = 'admin';

commit;
