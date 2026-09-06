-- Consent-first, first-party acquisition analytics.
-- This table deliberately holds no email, form input, raw URL query string,
-- payment identifier, IP address or file metadata. Only the service role may
-- write/read it through the two Edge Functions below.

create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null default timezone('utc', now()),
  event_name text not null,
  event_label text,
  page_path text not null,
  session_id uuid not null,
  referrer_host text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  locale text,
  device_type text check (device_type in ('mobile', 'tablet', 'desktop', 'other'))
);

create index if not exists analytics_events_occurred_at_idx
  on public.analytics_events (occurred_at desc);

create index if not exists analytics_events_event_time_idx
  on public.analytics_events (event_name, occurred_at desc);

create index if not exists analytics_events_session_time_idx
  on public.analytics_events (session_id, occurred_at desc);

alter table public.analytics_events enable row level security;

revoke all on table public.analytics_events from anon, authenticated;
grant select, insert, update, delete on table public.analytics_events to service_role;
