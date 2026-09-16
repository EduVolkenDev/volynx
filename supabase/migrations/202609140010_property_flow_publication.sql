-- Property Flow publication choices reuse the existing sites.subdomain/domain
-- columns. The mode and onboarding state live in sites.settings.property_flow.
-- This migration adds collision protection only; it does not claim DNS or
-- deploy a public host automatically.

begin;

create unique index if not exists property_flow_sites_subdomain_unique
  on public.sites (lower(subdomain))
  where template_key = 'property-flow' and subdomain is not null;

create unique index if not exists property_flow_sites_domain_unique
  on public.sites (lower(domain))
  where template_key = 'property-flow' and domain is not null;

comment on column public.sites.subdomain is
  'Property Flow tenant label under the VOLYNX host, e.g. studio.volynx.world.';

comment on column public.sites.domain is
  'Verified custom hostname for a published Property Flow site; never trusted before DNS verification.';

commit;
