# Profile write authority — review, 26 November 2026

Status: prepared locally; NOT applied to production, committed, or pushed.

## Approved release completed

Builder commit `77a0c347` was pushed and deployed to Pages (`dd996d5b`). Publisher version `b3735969-c929-4e9d-96c2-ea90b5deab66` was deployed at 100%. An authenticated, separate QA project preserved the supplied description and external CTA. Anonymous public inspection confirmed valid section navigation. Normal Unpublish returned the QA project to draft and the public URL to 404. Existing Portfolio projects were preserved. The test account has Studio/admin access; this does not verify ordinary customer quotas.

## Reason for the proposed permission change

Read-only production inspection found authenticated UPDATE privilege on profiles.builder_plan and own-profile RLS that permits that row update. Plan-based publisher authorization cannot rely on this field until browser write authority is narrowed. No production entitlement was modified to demonstrate the issue.

## Proposed files

- `supabase/migrations/202611260001_profile_entitlement_write_authority.sql`: removes table and existing column INSERT/UPDATE privileges from public/anon/authenticated, grants authenticated writes only for explicit ordinary profile fields. Requires existing RLS. Leaves values, RLS policies, service_role grants, and sessions unchanged. Future columns require explicit review.
- `src/pages/profile.astro`: browser profile bootstrap relies on database plan/balance defaults instead of sending protected fields.
- `scripts/profile-entitlement-authority.test.mjs`: disposable PostgreSQL 17 test using a pinned image, no external network, host mounts, published ports, or production credentials; container removed afterward.

## Validation

Five tests passed without skips, including direct protected-field rejection, atomic mixed-write denial, normal profile editing and ownership isolation, free defaults/UPSERT, and trusted service/sample SECURITY DEFINER compatibility. Tests include existing column grants and a future internal column. Complete Astro build passed (105 pages); build log `/tmp/volynx-profile-authority-build-20261126.log`.

These tests exercise PostgreSQL grants/RLS in a fixture. They do not prove every deployed trigger, RPC, browser admin screen, or ecosystem consumer remains compatible. Initial source inspection covered profile bootstrap/text editing and server entitlement writers, with a limited Daily/CVitae search. Browser admin flows that directly write protected fields will be denied and need a trusted server path. Existing JWTs or historical entitlement values are not repaired by this migration.

## Execution proposal requiring approval

First publish the compatible profile bootstrap, then apply only the reviewed SQL transaction (no bulk db push). Verify live column privileges, normal profile editing, bootstrap defaults, and trusted writes using separate QA data. Record exact evidence before marking any board task complete. Capture current ACLs for rollback before applying; never restore broad grants automatically.

Builder plan work remains in progress: publisher quotas still require server enforcement and concurrency-safe coordination; project status is client-writable. This permission change alone does not complete quota enforcement or task initial-017.

## References

- https://supabase.com/docs/guides/database/postgres/column-level-security
- https://www.postgresql.org/docs/17/sql-revoke.html
