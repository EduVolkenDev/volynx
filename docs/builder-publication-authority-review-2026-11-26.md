# Builder publication authority — review 26 November 2026

Status: implemented locally; no commit, push, production migration or Worker deployment for this change. Board follow-up is doing.

## Behavior and files

- `supabase/migrations/202611260002_builder_publication_authority.sql`: server-only admission/completion RPCs, owner transaction locks, durable project/slug reservation, plan capacity read from protected profiles and plan limits. Includes legacy published projects and in-flight reservations in the count. Guard trigger prevents client publication-state/identity changes and moving/deleting a published or reserved site. Ordinary draft editing and RLS ownership remain supported. Reservation table has RLS and no browser grants; RPCs are service-role only. The guard is SECURITY DEFINER with an empty search path and checks the PostgREST SET ROLE, independently of user-editable JWT metadata.
- `cloudflare/builder-publisher/publication-authority.mjs`: reserve before R2, finalize only after successful storage; no success response on database or storage failure.
- `docs/patches/20261126-builder-publication-authority.patch`: integration patch against recovered, previously deployed Worker version b3735969-c929-4e9d-96c2-ea90b5deab66. Copy the canonical helper into Worker src/publication-authority.mjs before bundling. Does not alter Stripe, PropertyFlow routes, bindings or secrets.
- `src/pages/builder/index.astro`: shared service error messages and removal of redundant browser status update.
- `scripts/builder-publication-authority.test.mjs`: real isolated PostgreSQL admission/ownership/concurrency tests. Pinned PostgreSQL image, tmpfs, no external network, credentials, host mounts or published ports; container removed.
- `scripts/builder-publication-worker.test.mjs`: storage/database failure ordering plus actual recovered Worker route checks using its real bundle and mocked external services.
- `scripts/builder-generation.test.mjs`: existing renderer regression harness tolerates the new Worker import.

## Important failure semantics

There is no distributed transaction between Postgres and R2. On ambiguous storage or completion failure, the slot and operation remain reserved; overlapping requests return conflict instead of releasing capacity or overwriting another operation. Reservations deliberately have no automatic expiry. Operators must reconcile these incidents after establishing no stale writer can still run. This favors correctness but can require support intervention; it is not automatic recovery. Do not clear a busy flag merely because a request timed out. A completion token cannot finalize another operation.

Unpublish is allowed even when the account is over quota. Re-publication requires capacity for this project after excluding its own slot. There is no admin bypass. Downgrading a plan does not automatically remove existing sites. No changes to draft quotas, premium-kit entitlement, domain entitlement or branding are included.

## Production read-only preflight

projects.status defaults to draft. No duplicate published slugs or published projects without a profile were found. Four soft-deleted published projects still returned HTTP200 on their public URLs. They were preserved and will continue to consume capacity until explicitly unpublished. Do not silently change their status or delete R2 objects as part of this migration.

## Deployment plan requiring approval

1. Verify latest upstream main and active Worker version; preserve concurrent work. Review/capture database grants, triggers and schema before applying this exact migration; no bulk db push.
2. Apply the migration, then deploy the integrated Worker at 100% preserving all secrets/settings, and publish the compatible Builder frontend. Avoid a mixed-version rollout; account for already in-flight requests from the old Worker before testing.
3. Verify real authenticated publish/republish/unpublish using a separate QA project and inspect DB/R2/public URL. Verify Free denial and last-slot concurrency using separate controlled QA data, never by changing an existing customer entitlement. Perform the still-pending new-account production bootstrap test.
4. Mark Done only for completed evidence. If rollback is needed, do not return to the old quota-free publisher while operations are outstanding. Freeze new publication, reconcile reservations, then coordinate code and database rollback. Never drop the reservation table before reconciliation.

## References

https://www.postgresql.org/docs/17/explicit-locking.html
https://developers.cloudflare.com/r2/api/workers/workers-api-reference/
https://supabase.com/docs/guides/database/postgres/column-level-security

## Completed local checks

18 tests passed, zero failures/skips: eight PostgreSQL authority tests, five Worker tests and five existing generation/renderer regressions. Real concurrent database sessions tested the final capacity slot and different owners claiming one slug. Complete Astro build passed105 pages; log /tmp/volynx-builder-quota-build-20261126.log. Worker dry-run compiled with existing SITES binding; no deployment. git diff --check passed. Obsolete unchecked project-status helper functions were removed from the recovered integration patch. This is local/fixture validation, not authenticated production QA.
