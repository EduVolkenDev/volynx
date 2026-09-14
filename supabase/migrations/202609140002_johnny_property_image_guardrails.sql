-- Enforce the optimized image contract before the Johnny dashboard uploads files.
-- The production bucket contains derivatives only; originals stay outside Storage.

begin;

alter table public.property_listing_images
  add column if not exists content_hash text,
  add column if not exists source_bytes bigint,
  add column if not exists optimized_at timestamptz;

alter table public.property_listing_images
  drop constraint if exists property_listing_images_optimized_format_check;
alter table public.property_listing_images
  add constraint property_listing_images_optimized_format_check
  check (
    mime_type is not null
    and mime_type = 'image/webp'
    and storage_path ~* '\.webp$'
  );

alter table public.property_listing_images
  drop constraint if exists property_listing_images_optimized_size_check;
alter table public.property_listing_images
  add constraint property_listing_images_optimized_size_check
  check (
    size_bytes is not null
    and size_bytes > 0
    and size_bytes <= 3145728
  );

alter table public.property_listing_images
  drop constraint if exists property_listing_images_optimized_dimensions_check;
alter table public.property_listing_images
  add constraint property_listing_images_optimized_dimensions_check
  check (
    width is not null
    and height is not null
    and width > 0
    and height > 0
    and width <= 2400
    and height <= 2400
  );

alter table public.property_listing_images
  drop constraint if exists property_listing_images_content_hash_check;
alter table public.property_listing_images
  add constraint property_listing_images_content_hash_check
  check (content_hash is null or content_hash ~* '^[a-f0-9]{64}$');

create index if not exists property_listing_images_site_hash_idx
  on public.property_listing_images(site_id, content_hash)
  where content_hash is not null;

create unique index if not exists property_listing_images_property_hash_unique
  on public.property_listing_images(property_id, content_hash)
  where content_hash is not null;

comment on column public.property_listing_images.content_hash is
  'SHA-256 of the optimized WebP derivative; used to avoid duplicate uploads.';
comment on column public.property_listing_images.source_bytes is
  'Original browser-selected size for compression reporting; original bytes are not stored.';
comment on column public.property_listing_images.optimized_at is
  'Time the browser-side derivative was generated before upload.';

update storage.buckets
set file_size_limit = 3145728,
    allowed_mime_types = array['image/webp']::text[]
where id = 'johnny-property-images';

commit;
