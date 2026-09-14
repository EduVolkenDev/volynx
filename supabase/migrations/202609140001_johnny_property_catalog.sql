-- Johnny / Parisnez property catalog foundation.
--
-- This is intentionally site-scoped inside the existing VOLYNX multi-tenant
-- model (organization -> site). It does not touch checkout, products,
-- entitlements, or existing customer data.

begin;

create table if not exists public.property_listings (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references public.organizations(id) on delete cascade,
  site_id           uuid not null references public.sites(id) on delete cascade,
  slug              text not null,
  title             text not null,
  category          text not null default 'Casa',
  listing_type      text not null default 'sale',
  status            text not null default 'draft',
  summary           text,
  description       text,
  price_amount      numeric(14, 2),
  price_currency    text not null default 'BRL',
  price_label       text,
  location          jsonb not null default '{}'::jsonb,
  features          jsonb not null default '[]'::jsonb,
  whatsapp_message  text,
  is_featured       boolean not null default false,
  sort_order        integer not null default 0,
  published_at      timestamptz,
  archived_at       timestamptz,
  created_by        uuid references auth.users(id) on delete set null,
  updated_by        uuid references auth.users(id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (site_id, slug)
);

alter table public.property_listings
  add column if not exists organization_id uuid references public.organizations(id) on delete cascade;
alter table public.property_listings
  add column if not exists site_id uuid references public.sites(id) on delete cascade;
alter table public.property_listings add column if not exists slug text;
alter table public.property_listings add column if not exists title text;
alter table public.property_listings add column if not exists category text default 'Casa';
alter table public.property_listings add column if not exists listing_type text default 'sale';
alter table public.property_listings add column if not exists status text default 'draft';
alter table public.property_listings add column if not exists summary text;
alter table public.property_listings add column if not exists description text;
alter table public.property_listings add column if not exists price_amount numeric(14, 2);
alter table public.property_listings add column if not exists price_currency text default 'BRL';
alter table public.property_listings add column if not exists price_label text;
alter table public.property_listings add column if not exists location jsonb default '{}'::jsonb;
alter table public.property_listings add column if not exists features jsonb default '[]'::jsonb;
alter table public.property_listings add column if not exists whatsapp_message text;
alter table public.property_listings add column if not exists is_featured boolean default false;
alter table public.property_listings add column if not exists sort_order integer default 0;
alter table public.property_listings add column if not exists published_at timestamptz;
alter table public.property_listings add column if not exists archived_at timestamptz;
alter table public.property_listings add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.property_listings add column if not exists updated_by uuid references auth.users(id) on delete set null;
alter table public.property_listings add column if not exists created_at timestamptz default now();
alter table public.property_listings add column if not exists updated_at timestamptz default now();

alter table public.property_listings drop constraint if exists property_listings_listing_type_check;
alter table public.property_listings
  add constraint property_listings_listing_type_check
  check (listing_type in ('sale', 'rent', 'sale_and_rent'));

alter table public.property_listings drop constraint if exists property_listings_status_check;
alter table public.property_listings
  add constraint property_listings_status_check
  check (status in ('draft', 'published', 'archived'));

alter table public.property_listings drop constraint if exists property_listings_currency_check;
alter table public.property_listings
  add constraint property_listings_currency_check
  check (price_currency in ('BRL', 'GBP', 'EUR', 'USD'));

create unique index if not exists property_listings_site_slug_unique
  on public.property_listings(site_id, slug);
create index if not exists property_listings_site_status_order_idx
  on public.property_listings(site_id, status, is_featured desc, sort_order, created_at desc);
create index if not exists property_listings_organization_status_idx
  on public.property_listings(organization_id, status);
create index if not exists property_listings_location_gin_idx
  on public.property_listings using gin(location);

create table if not exists public.property_listing_images (
  id             uuid primary key default gen_random_uuid(),
  property_id    uuid not null references public.property_listings(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  site_id        uuid not null references public.sites(id) on delete cascade,
  storage_path   text not null,
  filename       text,
  alt_text       text,
  mime_type      text,
  size_bytes     bigint,
  width          integer,
  height         integer,
  sort_order     integer not null default 0,
  is_cover       boolean not null default false,
  created_by     uuid references auth.users(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (property_id, storage_path)
);

create unique index if not exists property_listing_images_one_cover_idx
  on public.property_listing_images(property_id)
  where is_cover = true;
create index if not exists property_listing_images_property_order_idx
  on public.property_listing_images(property_id, sort_order, created_at);
create index if not exists property_listing_images_site_idx
  on public.property_listing_images(site_id, property_id);

comment on table public.property_listings is
  'Site-scoped property inventory for the Johnny / Parisnez real-estate experience.';
comment on table public.property_listing_images is
  'Ordered public gallery assets for property_listings; storage_path points to the dedicated public bucket.';
comment on column public.property_listings.features is
  'Structured highlights for the dashboard and public cards, not presentation HTML.';
comment on column public.property_listings.location is
  'Structured location data such as city, region, and display label; do not store exact private addresses.';

drop trigger if exists property_listings_set_updated_at on public.property_listings;
create trigger property_listings_set_updated_at
  before update on public.property_listings
  for each row execute function public.set_updated_at();

drop trigger if exists property_listing_images_set_updated_at on public.property_listing_images;
create trigger property_listing_images_set_updated_at
  before update on public.property_listing_images
  for each row execute function public.set_updated_at();

alter table public.property_listings enable row level security;
alter table public.property_listing_images enable row level security;

grant select on table public.property_listings, public.property_listing_images to anon, authenticated;
grant insert, update on table public.property_listings to authenticated;
grant insert, update, delete on table public.property_listing_images to authenticated;
grant delete on table public.property_listings to authenticated;

drop policy if exists "Public can view published property listings" on public.property_listings;
create policy "Public can view published property listings"
  on public.property_listings for select
  to anon, authenticated
  using (
    status = 'published'
    and exists (
      select 1
      from public.sites s
      where s.id = property_listings.site_id
        and s.organization_id = property_listings.organization_id
        and s.status = 'published'
    )
  );

drop policy if exists "Johnny editors can view property listings" on public.property_listings;
create policy "Johnny editors can view property listings"
  on public.property_listings for select
  to authenticated
  using (
    public.has_org_role(
      organization_id,
      array['owner', 'admin', 'editor']::text[]
    )
  );

drop policy if exists "Johnny editors can create property listings" on public.property_listings;
create policy "Johnny editors can create property listings"
  on public.property_listings for insert
  to authenticated
  with check (
    public.has_org_role(
      organization_id,
      array['owner', 'admin', 'editor']::text[]
    )
    and exists (
      select 1
      from public.sites s
      where s.id = property_listings.site_id
        and s.organization_id = property_listings.organization_id
    )
  );

drop policy if exists "Johnny editors can update property listings" on public.property_listings;
create policy "Johnny editors can update property listings"
  on public.property_listings for update
  to authenticated
  using (
    public.has_org_role(
      organization_id,
      array['owner', 'admin', 'editor']::text[]
    )
  )
  with check (
    public.has_org_role(
      organization_id,
      array['owner', 'admin', 'editor']::text[]
    )
    and exists (
      select 1
      from public.sites s
      where s.id = property_listings.site_id
        and s.organization_id = property_listings.organization_id
    )
  );

drop policy if exists "Johnny admins can delete property listings" on public.property_listings;
create policy "Johnny admins can delete property listings"
  on public.property_listings for delete
  to authenticated
  using (
    public.has_org_role(
      organization_id,
      array['owner', 'admin']::text[]
    )
  );

drop policy if exists "Public can view published property listing images" on public.property_listing_images;
create policy "Public can view published property listing images"
  on public.property_listing_images for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.property_listings p
      join public.sites s on s.id = p.site_id
      where p.id = property_listing_images.property_id
        and p.organization_id = property_listing_images.organization_id
        and p.site_id = property_listing_images.site_id
        and p.status = 'published'
        and s.status = 'published'
    )
  );

drop policy if exists "Johnny editors can view all property listing images" on public.property_listing_images;
create policy "Johnny editors can view all property listing images"
  on public.property_listing_images for select
  to authenticated
  using (
    public.has_org_role(
      organization_id,
      array['owner', 'admin', 'editor']::text[]
    )
  );

drop policy if exists "Johnny editors can manage property listing images" on public.property_listing_images;
create policy "Johnny editors can manage property listing images"
  on public.property_listing_images for all
  to authenticated
  using (
    public.has_org_role(
      organization_id,
      array['owner', 'admin', 'editor']::text[]
    )
  )
  with check (
    public.has_org_role(
      organization_id,
      array['owner', 'admin', 'editor']::text[]
    )
    and exists (
      select 1
      from public.property_listings p
      where p.id = property_listing_images.property_id
        and p.organization_id = property_listing_images.organization_id
        and p.site_id = property_listing_images.site_id
    )
  );

-- Dedicated public-read bucket. Writes remain protected by storage RLS below.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'johnny-property-images',
  'johnny-property-images',
  true,
  20971520,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']::text[]
)
on conflict (id) do update
set public = true;

drop policy if exists "Johnny property images are publicly readable" on storage.objects;
create policy "Johnny property images are publicly readable"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'johnny-property-images');

drop policy if exists "Johnny editors can upload property images" on storage.objects;
create policy "Johnny editors can upload property images"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'johnny-property-images'
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
create policy "Johnny editors can update property images"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'johnny-property-images'
    and public.has_org_role(
      (storage.foldername(name))[1]::uuid,
      array['owner', 'admin', 'editor']::text[]
    )
  )
  with check (
    bucket_id = 'johnny-property-images'
    and public.has_org_role(
      (storage.foldername(name))[1]::uuid,
      array['owner', 'admin', 'editor']::text[]
    )
  );

drop policy if exists "Johnny editors can delete property images" on storage.objects;
create policy "Johnny editors can delete property images"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'johnny-property-images'
    and public.has_org_role(
      (storage.foldername(name))[1]::uuid,
      array['owner', 'admin', 'editor']::text[]
    )
  );

-- Register the tenant/site shell without assigning an owner or staff member.
-- Membership is intentionally a separate explicit operation after the team
-- accounts are known.
insert into public.organizations (name, slug, plan, status, metadata)
values (
  'Johnny / Parisnez',
  'johnny-parisnez',
  'free',
  'active',
  jsonb_build_object(
    'tenant_key', 'johnny-parisnez',
    'source_repo', 'EduVolkenDev/parisnez',
    'brand_name', 'Jhonatan Peterson'
  )
)
on conflict (slug) do nothing;

insert into public.sites (
  organization_id,
  name,
  slug,
  template_key,
  language_default,
  languages,
  status,
  settings,
  seo
)
select
  o.id,
  'Johnny / Parisnez',
  'johnny-parisnez',
  'property-flow',
  'pt',
  array['pt']::text[],
  'draft',
  jsonb_build_object(
    'catalog_source', 'supabase',
    'image_bucket', 'johnny-property-images'
  ),
  jsonb_build_object(
    'title', 'Jhonatan Peterson — Imobiliária de Alto Padrão',
    'description', 'Imóveis com curadoria, estratégia e atendimento premium.'
  )
from public.organizations o
where o.slug = 'johnny-parisnez'
on conflict (organization_id, slug) do nothing;

commit;
