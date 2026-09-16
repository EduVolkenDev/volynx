-- Resolve the purchased Property Flow tier without exposing payment rows.
-- The dashboard uses this read-only function to decide which templates are available.
-- This migration is intentionally prepared only; it must be applied through the
-- normal Supabase migration process before tier-aware production access is live.

begin;

create or replace function public.get_property_flow_access()
returns table (tier text, template_count integer, source text)
language sql
security definer
stable
set search_path = public
as $$
with candidates as (
  select
    case
      when lower(coalesce(ap.addon_id, '')) like '%white_label%'
        or lower(coalesce(ap.addon_id, '')) like '%enterprise%' then 'white-label'
      when lower(coalesce(ap.addon_id, '')) like '%professional%' then 'professional'
      when lower(coalesce(ap.addon_id, '')) like '%starter%' then 'starter'
      when lower(coalesce(ap.metadata ->> 'lookup_key', '')) like '%white_label%'
        or lower(coalesce(ap.metadata ->> 'lookup_key', '')) like '%enterprise%' then 'white-label'
      when lower(coalesce(ap.metadata ->> 'lookup_key', '')) like '%professional%' then 'professional'
      when lower(coalesce(ap.metadata ->> 'lookup_key', '')) like '%starter%' then 'starter'
    end as resolved_tier,
    'addons_purchased'::text as resolved_source
  from public.addons_purchased ap
  where ap.user_id = auth.uid()
    and ap.status = 'active'
    and (ap.addon_id like 'pf_%' or coalesce(ap.metadata ->> 'lookup_key', '') like 'pf_%')

  union all

  select
    case
      when lower(coalesce(pe.lookup_key, '')) like '%white_label%'
        or lower(coalesce(pe.lookup_key, '')) like '%enterprise%' then 'white-label'
      when lower(coalesce(pe.lookup_key, '')) like '%professional%' then 'professional'
      when lower(coalesce(pe.lookup_key, '')) like '%starter%' then 'starter'
      when lower(coalesce(pe.metadata ->> 'lookup_key', '')) like '%white_label%'
        or lower(coalesce(pe.metadata ->> 'lookup_key', '')) like '%enterprise%' then 'white-label'
      when lower(coalesce(pe.metadata ->> 'lookup_key', '')) like '%professional%' then 'professional'
      when lower(coalesce(pe.metadata ->> 'lookup_key', '')) like '%starter%' then 'starter'
    end as resolved_tier,
    'purchase_events'::text as resolved_source
  from public.purchase_events pe
  where pe.user_id = auth.uid()
    and pe.status = 'completed'
    and (
      coalesce(pe.lookup_key, '') like 'pf_%'
      or coalesce(pe.metadata ->> 'lookup_key', '') like 'pf_%'
      or coalesce(pe.product_key, '') = 'propertyflow'
    )
)
select
  resolved_tier as tier,
  case resolved_tier
    when 'starter' then 3
    when 'professional' then 6
    when 'white-label' then 15
    else 0
  end as template_count,
  resolved_source as source
from candidates
where resolved_tier is not null
order by case resolved_tier when 'white-label' then 3 when 'professional' then 2 when 'starter' then 1 else 0 end desc
limit 1;
$$;

revoke all on function public.get_property_flow_access() from public;
grant execute on function public.get_property_flow_access() to authenticated;

commit;
