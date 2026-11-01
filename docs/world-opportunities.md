# VOLYNX World · Opportunities v1

World retains its existing professional profiles, services, inquiries, account and plans. Opportunities and My World extend that experience; this release adds no subscription products or paid gates.

## Routes

- `/world/`: existing professionals/services plus work discovery navigation.
- `/world/opportunities/`: public search, specialty, contract and work-mode filters; paginated active catalog.
- `/world/opportunities/detail/?id=<uuid>`: original source, explicit eligibility, compensation, review date, expiry, external application and optional preparation resources.
- `/world/workspace/`: signed-in user's saved opportunities, manually recorded application stages and private notes; paginated. No employer notification is sent.
- `/admin/world-opportunities/`: existing platform administrators create drafts, review, publish, close and archive listings. Authorization is enforced in database policies, not only the UI.

## Data and editorial workflow

`world_opportunities` contains public listing information only. No employer contact email or candidate information belongs here. `world_opportunity_activity` contains private user-owned tracking records. Both have RLS and explicit grants. Public users can read published and closed listings; discovery additionally excludes closed and expired listings. Draft/archived listings remain private to administrators. Existing saved activity remains removable after a listing is archived.

Compensation is stored in minor currency units; the editor accepts major units. Source/application links require HTTPS and are validated again before rendering. Descriptions are plain text. Remote eligibility must be entered explicitly. No fabricated listings are seeded. Publishing and setting `last_checked_at` are editorial attestations, not automated source verification.

Draft → manually review source, eligibility, application link and compensation → publish with a future expiry → recheck or close/archive. Expiry removes a listing from discovery automatically; it does not send alerts.

Migration `20261101234752_world_opportunities.sql` was applied to the existing VolynxCore project. Its filename matches the server migration history to prevent duplicate application by the GitHub integration. No existing table or billing configuration was modified.

## Validation

- `npm run build`
- `node --test --experimental-strip-types src/lib/world/opportunities.test.ts` (Node 22+)
- `supabase/tests/world_opportunities.sql`: transactional SQL assertions for public/draft visibility, activity ownership, spoofing/reassignment denial and listing update denial. Execute against an isolated PostgreSQL/Supabase test database after the migration; all fixtures roll back. Validated locally with PGlite using equivalent auth/admin helpers. Production RLS/grants and migration application were inspected separately.
- Browser smoke checks for public discovery, EN/PT switching and signed-out workspace/admin states.

## Deliberately pending

Personalized email alerts, company self-service submissions, internal applications, recommendations, billing changes and automatic CV/profile data transfer are future work. CVitae and portfolio integration in v1 consists of navigation to the existing tools, with no automatic publication of personal data.
