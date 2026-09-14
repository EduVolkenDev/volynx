-- Property Flow access gate.
-- Existing tenant members (for example Johnny's team) keep access to their
-- existing site; new workspaces require an active Property Flow purchase.

begin;

create or replace function public.has_property_flow_entitlement()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select auth.uid() is not null
    and (
      exists (
        select 1
        from public.addons_purchased ap
        where ap.user_id = auth.uid()
          and ap.status = 'active'
          and (
            ap.addon_id in ('pf_starter', 'pf_professional', 'pf_white_label', 'pf_enterprise')
            or ap.addon_id like 'pf_%'
            or coalesce(ap.metadata ->> 'lookup_key', '') like 'pf_%'
          )
      )
      or exists (
        select 1
        from public.purchase_events pe
        where pe.user_id = auth.uid()
          and pe.status = 'completed'
          and (
            coalesce(pe.lookup_key, '') like 'pf_%'
            or coalesce(pe.product_key, '') = 'propertyflow'
            or coalesce(pe.metadata ->> 'lookup_key', '') like 'pf_%'
          )
      )
    );
$$;

revoke all on function public.has_property_flow_entitlement() from public;
grant execute on function public.has_property_flow_entitlement() to authenticated;

drop policy if exists "Editors can insert sites" on public.sites;
create policy "Editors can insert sites"
  on public.sites for insert
  to authenticated
  with check (
    public.has_org_role(organization_id, array['owner', 'admin', 'editor'])
    and (
      template_key is distinct from 'property-flow'
      or public.has_property_flow_entitlement()
      or exists (
        select 1
        from public.organizations o
        where o.id = sites.organization_id
          and o.metadata ->> 'product' = 'property-flow'
      )
    )
  );

commit;
