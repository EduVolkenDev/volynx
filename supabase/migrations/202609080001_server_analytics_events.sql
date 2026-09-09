-- Extend the consent-first analytics table with trusted server-side events.
-- The original marketing analytics migration is already applied remotely, so
-- these changes belong in a new migration rather than being replayed.

begin;

alter table public.analytics_events
  alter column session_id drop not null;

alter table public.analytics_events
  add column if not exists event_source text not null default 'browser';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'analytics_events_event_source_check'
      and conrelid = 'public.analytics_events'::regclass
  ) then
    alter table public.analytics_events
      add constraint analytics_events_event_source_check
      check (event_source in ('browser', 'server'));
  end if;
end $$;

create index if not exists analytics_events_source_time_idx
  on public.analytics_events (event_source, occurred_at desc);

commit;
