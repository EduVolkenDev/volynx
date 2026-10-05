# Lab usage audit

## What counts as real usage

Use `public.lab_usage_audit` as the canonical audit surface. A row is
`confirmed` only when all three conditions are true:

- `event_status = 'completed'`
- `environment = 'production'`
- `actor_class = 'real_user'`

Rows marked `test` are synthetic or local validation. Rows marked
`unclassified`, `legacy_needs_review`, or `unattributed` must not be used as
real-user product usage.

The old `usage_logs` and `daily_usage_logs` tables are preserved, but their
aggregate rows are exposed as legacy records. They do not contain enough
evidence to reconstruct who actually executed a tool.

## Main query

Run this with an admin/service-role database connection only:

```sql
select
  occurred_at,
  tool_key,
  action,
  event_status,
  actor_class,
  environment,
  confidence,
  quantity,
  user_email,
  metadata
from public.lab_usage_audit
where confidence in ('confirmed', 'test')
order by occurred_at desc;
```

## Confirmed real users by tool

```sql
select
  tool_key,
  count(*) filter (where confidence = 'confirmed') as confirmed_events,
  coalesce(sum(quantity) filter (where confidence = 'confirmed'), 0) as confirmed_quantity,
  count(*) filter (where confidence = 'test') as test_events,
  coalesce(sum(quantity) filter (where confidence = 'test'), 0) as test_quantity
from public.lab_usage_audit
where source_table = 'lab_usage_events'
group by tool_key
order by confirmed_quantity desc, test_quantity desc, tool_key;
```

## Classification rule

User identity is resolved server-side from the bearer token. Internal owners
and known test accounts belong in `public.lab_usage_actor_labels`; the browser
cannot write that table. A test run must send a `test_run_id`, which forces
`environment = 'test'` and `actor_class = 'synthetic_test'`.

The current owner profile is labelled `internal_owner`. Existing historic
rollups were intentionally not rewritten.
