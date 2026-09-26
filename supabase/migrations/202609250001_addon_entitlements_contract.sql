-- Canonical entitlement metadata for add-ons and downloadable kits.
-- Paid add-ons must resolve this table before being recorded as fulfilled.

create table if not exists public.addon_entitlements (
  addon_id text primary key,
  features jsonb not null default '[]'::jsonb,
  slot_delta integer not null default 0,
  download_zip text,
  billing text not null default 'one_time',
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.addon_entitlements enable row level security;

drop policy if exists "Anyone can read public addon entitlements" on public.addon_entitlements;
create policy "Anyone can read public addon entitlements"
  on public.addon_entitlements for select
  using (true);

grant select on public.addon_entitlements to anon, authenticated;

insert into public.addon_entitlements (addon_id, features, slot_delta, download_zip, billing, description)
values
  ('domain_setup', '["domain_setup_assistance"]'::jsonb, 0, null, 'one_time', 'Assisted domain setup handled through VOLYNX support.'),
  ('template_pack', '["premium_template_pack"]'::jsonb, 0, null, 'one_time', 'Premium template access; public checkout remains disabled until delivery is live.'),
  ('html_export', '["html_export"]'::jsonb, 0, null, 'one_time', 'HTML export entitlement; public checkout remains disabled until delivery is live.'),
  ('extra_slot', '["builder_extra_site_slot"]'::jsonb, 1, null, 'subscription', 'One additional published site slot.'),
  ('bilingual', '["builder_bilingual_publish"]'::jsonb, 0, null, 'one_time', 'Bilingual publishing entitlement.'),
  ('icons', '["premium_icon_collections"]'::jsonb, 0, null, 'one_time', 'Premium icon collection entitlement.'),
  ('kit_portfolio_personal', '["builder_draft","kit_source_zip"]'::jsonb, 0, 'kit_portfolio_personal', 'one_time', 'Portfolio Pro Kit Starter delivery.'),
  ('kit_portfolio_commercial', '["builder_draft","kit_source_zip"]'::jsonb, 0, 'kit_portfolio_commercial', 'one_time', 'Portfolio Pro Kit Commercial delivery.'),
  ('kit_portfolio_studio', '["builder_draft","kit_source_zip"]'::jsonb, 0, 'kit_portfolio_studio', 'one_time', 'Portfolio Pro Kit Studio delivery.'),
  ('kit_agency_personal', '["builder_draft","kit_source_zip"]'::jsonb, 0, 'kit_agency_personal', 'one_time', 'Agency Launch Kit Starter delivery.'),
  ('kit_agency_commercial', '["builder_draft","kit_source_zip"]'::jsonb, 0, 'kit_agency_commercial', 'one_time', 'Agency Launch Kit Commercial delivery.'),
  ('kit_agency_studio', '["builder_draft","kit_source_zip"]'::jsonb, 0, 'kit_agency_studio', 'one_time', 'Agency Launch Kit Studio delivery.'),
  ('kit_saas_personal', '["builder_draft","kit_source_zip"]'::jsonb, 0, 'kit_saas_personal', 'one_time', 'SaaS Landing System Starter delivery.'),
  ('kit_saas_commercial', '["builder_draft","kit_source_zip"]'::jsonb, 0, 'kit_saas_commercial', 'one_time', 'SaaS Landing System Commercial delivery.'),
  ('kit_saas_studio', '["builder_draft","kit_source_zip"]'::jsonb, 0, 'kit_saas_studio', 'one_time', 'SaaS Landing System Studio delivery.')
on conflict (addon_id) do update set
  features = excluded.features,
  slot_delta = excluded.slot_delta,
  download_zip = excluded.download_zip,
  billing = excluded.billing,
  description = excluded.description,
  updated_at = now();
