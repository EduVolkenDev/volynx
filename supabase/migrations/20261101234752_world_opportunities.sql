-- Additive World opportunities. Existing profiles, plans and inquiries are unchanged.
create table public.world_opportunities (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) between 5 and 160),
  company_name text not null check (length(trim(company_name)) between 2 and 120),
  description text not null check (length(trim(description)) between 40 and 12000),
  category text not null check (category in ('development','design','marketing','content','other')),
  kind text not null check (kind in ('freelance','contract','part_time','full_time')),
  work_mode text not null check (work_mode in ('remote','hybrid','onsite')),
  location text not null check (length(trim(location)) between 2 and 160),
  eligibility text not null check (length(trim(eligibility)) between 5 and 500),
  skills text[] not null default '{}',
  salary_min bigint check (salary_min >= 0),
  salary_max bigint check (salary_max >= 0),
  currency text not null default 'GBP' check (currency in ('GBP','EUR','BRL','USD')),
  salary_period text not null default 'project' check (salary_period in ('hour','month','year','project')),
  source_name text not null check (length(trim(source_name)) between 2 and 160),
  source_url text not null check (source_url ~ '^https://[^[:space:]]+$'),
  application_url text not null check (application_url ~ '^https://[^[:space:]]+$'),
  source_published_at date,
  last_checked_at timestamptz not null default now(),
  expires_at timestamptz not null,
  status text not null default 'draft' check (status in ('draft','published','closed','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search_document tsvector generated always as (to_tsvector('simple', title || ' ' || company_name || ' ' || description || ' ' || location)) stored,
  check (salary_min is null or salary_max is null or salary_max >= salary_min),
  check (expires_at > last_checked_at),
  check (last_checked_at <= now() + interval '5 minutes'),
  check (cardinality(skills) <= 30)
);
create index world_opportunities_discovery_idx on public.world_opportunities(status,created_at desc);
create index world_opportunities_search_idx on public.world_opportunities using gin(search_document);
create trigger world_opportunities_updated_at before update on public.world_opportunities for each row execute function public.set_updated_at();

create table public.world_opportunity_activity (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  opportunity_id uuid not null references public.world_opportunities(id) on delete cascade,
  stage text not null default 'saved' check (stage in ('saved','preparing','applied','interview','offer','closed')),
  notes text not null default '' check (length(notes) <= 3000),
  updated_at timestamptz not null default now(),
  primary key (user_id, opportunity_id)
);
create index world_opportunity_activity_opportunity_idx on public.world_opportunity_activity(opportunity_id);
create trigger world_opportunity_activity_updated_at before update on public.world_opportunity_activity for each row execute function public.set_updated_at();

alter table public.world_opportunities enable row level security;
alter table public.world_opportunity_activity enable row level security;
revoke all on public.world_opportunities, public.world_opportunity_activity from anon, authenticated;
grant select on public.world_opportunities to anon, authenticated;
grant insert, update, delete on public.world_opportunities to authenticated;
grant select, insert, update, delete on public.world_opportunity_activity to authenticated;
grant all on public.world_opportunities, public.world_opportunity_activity to service_role;

create policy world_opportunities_public_read on public.world_opportunities for select to anon,authenticated
using (status in ('published','closed'));
-- Historical public listings remain readable; draft and archived records stay private.
create policy world_opportunities_admin_read on public.world_opportunities for select to authenticated using ((select public.is_platform_admin()));
create policy world_opportunities_admin_insert on public.world_opportunities for insert to authenticated with check ((select public.is_platform_admin()));
create policy world_opportunities_admin_update on public.world_opportunities for update to authenticated using ((select public.is_platform_admin())) with check ((select public.is_platform_admin()));
create policy world_opportunities_admin_delete on public.world_opportunities for delete to authenticated using ((select public.is_platform_admin()));
create policy world_activity_owner_read on public.world_opportunity_activity for select to authenticated using (user_id = (select auth.uid()));
-- Only public opportunities can be added to a user workspace.
create policy world_activity_owner_insert on public.world_opportunity_activity for insert to authenticated with check (user_id = (select auth.uid()) and exists (select 1 from public.world_opportunities o where o.id = opportunity_id and o.status = 'published' and o.expires_at > now()));
create policy world_activity_owner_update on public.world_opportunity_activity for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy world_activity_owner_delete on public.world_opportunity_activity for delete to authenticated using (user_id = (select auth.uid()));
