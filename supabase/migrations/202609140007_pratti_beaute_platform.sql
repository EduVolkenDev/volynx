-- Pratti Beautê tenant in the shared VOLYNX Supabase project.
-- Safe to re-run: all objects and policies are idempotent.

begin;

create table if not exists public.pratti_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.pratti_requests (
  tenant_key text not null default 'pratti-beaute',
  id text not null,
  flow text not null check (flow in ('booking', 'course', 'mentorship')),
  name text not null,
  phone text not null,
  email text,
  subject text not null,
  date date,
  period text,
  notes text,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  primary key (tenant_key, id),
  constraint pratti_requests_tenant_check check (tenant_key = 'pratti-beaute')
);

create table if not exists public.pratti_orders (
  tenant_key text not null default 'pratti-beaute',
  id text not null,
  kind text,
  product_id text,
  product text not null,
  name text not null,
  phone text not null,
  email text,
  notes text,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  primary key (tenant_key, id),
  constraint pratti_orders_tenant_check check (tenant_key = 'pratti-beaute')
);

create index if not exists pratti_requests_created_at_idx
  on public.pratti_requests (tenant_key, created_at desc);
create index if not exists pratti_requests_status_idx
  on public.pratti_requests (tenant_key, status);
create index if not exists pratti_orders_created_at_idx
  on public.pratti_orders (tenant_key, created_at desc);

alter table public.pratti_admins enable row level security;
alter table public.pratti_requests enable row level security;
alter table public.pratti_orders enable row level security;

grant insert on table public.pratti_requests, public.pratti_orders to anon, authenticated;
grant select, update on table public.pratti_requests, public.pratti_orders to authenticated;

create or replace function public.is_pratti_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.pratti_admins
    where user_id = auth.uid()
  ) or exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and coalesce(is_admin, false) = true
  );
$$;

revoke all on function public.is_pratti_admin() from public;
grant execute on function public.is_pratti_admin() to authenticated;

drop policy if exists "public can create pratti requests" on public.pratti_requests;
create policy "public can create pratti requests"
  on public.pratti_requests for insert
  to anon, authenticated
  with check (tenant_key = 'pratti-beaute');

drop policy if exists "pratti admins can read requests" on public.pratti_requests;
create policy "pratti admins can read requests"
  on public.pratti_requests for select
  to authenticated
  using (tenant_key = 'pratti-beaute' and public.is_pratti_admin());

drop policy if exists "pratti admins can update requests" on public.pratti_requests;
create policy "pratti admins can update requests"
  on public.pratti_requests for update
  to authenticated
  using (tenant_key = 'pratti-beaute' and public.is_pratti_admin())
  with check (tenant_key = 'pratti-beaute' and public.is_pratti_admin());

drop policy if exists "public can create pratti orders" on public.pratti_orders;
create policy "public can create pratti orders"
  on public.pratti_orders for insert
  to anon, authenticated
  with check (tenant_key = 'pratti-beaute');

drop policy if exists "pratti admins can read orders" on public.pratti_orders;
create policy "pratti admins can read orders"
  on public.pratti_orders for select
  to authenticated
  using (tenant_key = 'pratti-beaute' and public.is_pratti_admin());

drop policy if exists "pratti admins can update orders" on public.pratti_orders;
create policy "pratti admins can update orders"
  on public.pratti_orders for update
  to authenticated
  using (tenant_key = 'pratti-beaute' and public.is_pratti_admin())
  with check (tenant_key = 'pratti-beaute' and public.is_pratti_admin());

-- After creating Jake's Auth user, register her as a Pratti admin:
-- insert into public.pratti_admins (user_id)
-- values ('AUTH_USER_UUID_HERE');

commit;
