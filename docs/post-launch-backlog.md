# VOLYNX post-launch Supabase backlog

Date: 2026-05-03
Project: `zdmpzrderifgqmqivjoy` (`VolynxCore`)

## Current launch status

Verified with:

```bash
env PATH=/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin \
  npx supabase db advisors --linked -o json
```

Current advisor summary:

| Advisor | Count | Launch impact |
| --- | ---: | --- |
| `auth_leaked_password_protection` | 1 | Requires Supabase Pro+ |
| `multiple_permissive_policies` | 62 | Post-launch performance cleanup |

Confirmed cleared by the latest Supabase hardening pass:

- `auth_rls_initplan`: 0 remaining
- `unindexed_foreign_keys`: 0 remaining
- `no_primary_key`: 0 remaining

## Pre-launch manual item

### Enable leaked password protection

Supabase advisor:

```text
auth_leaked_password_protection
Leaked Password Protection Disabled
```

Status:

- Management API token was valid.
- `password_min_length` was raised to `8`.
- `password_hibp_enabled` could not be enabled because Supabase returned `HTTP 402`: leaked password protection via HaveIBeenPwned is available on Pro plans and up.

Action:

1. Upgrade `VolynxCore` to Supabase Pro or accept this as a known plan-limited warning for launch.
2. Open `https://supabase.com/dashboard/project/zdmpzrderifgqmqivjoy/auth/providers`.
3. Go to Auth password/security settings.
4. Enable leaked password protection / HaveIBeenPwned protection.
5. Re-run advisors and confirm `auth_leaked_password_protection` is gone.

Optional Management API equivalent if a fresh Supabase account token is available:

```bash
export SUPABASE_ACCESS_TOKEN="sbp_..."
export PROJECT_REF="zdmpzrderifgqmqivjoy"

curl -fsS -X PATCH "https://api.supabase.com/v1/projects/$PROJECT_REF/config/auth" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"password_hibp_enabled":true}'
```

Then verify:

```bash
env PATH=/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin \
  npx supabase db advisors --linked --type security -o json
```

## Tier 2b: consolidate duplicate permissive policies

Remaining distribution:

| Table | Advisor count |
| --- | ---: |
| `daily_data` | 24 |
| `usage_logs` | 18 |
| `cvitae_plan_limits` | 6 |
| `profiles` | 6 |
| `subscriptions` | 6 |
| `projects` | 2 |

Approach:

- Treat this as a post-launch migration, not a launch blocker.
- For each table, inspect exact policy definitions before dropping anything.
- Keep behavior identical: same roles, same actions, same `USING`/`WITH CHECK` semantics.
- Prefer replacing duplicate policy names with one canonical policy per role/action.
- Run a smoke test after each table group, especially `usage_logs`, `profiles`, and `daily_data`.

Suggested order:

1. `cvitae_plan_limits`: read-only public policy duplication, lowest risk.
2. `subscriptions` and `projects`: small policy surface.
3. `profiles`: auth-critical, verify profile load/update.
4. `daily_data`: broadest action surface, verify Daily flows.
5. `usage_logs`: verify tool usage logging and rate/limit flows.

## Tier 3: unused indexes

Do not drop immediately after adding FK indexes. Supabase may report new FK indexes as unused until real production traffic touches the relevant queries.

Revisit after launch traffic:

```bash
env PATH=/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin \
  npx supabase db advisors --linked --level info --type performance -o json
```

Only remove an index after confirming:

- It was not just created for FK support.
- It is not backing a constraint.
- It has stayed unused after meaningful production traffic.
- The relevant query paths still have coverage.
