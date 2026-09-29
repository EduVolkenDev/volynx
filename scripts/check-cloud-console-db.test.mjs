import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { before, after, test } from 'node:test'

// No connection string, linked project, host mount or published port is accepted.
// Each run owns exactly one isolated in-memory PostgreSQL container.
const root = fileURLToPath(new URL('../', import.meta.url))
const container = `volynx-cloud-test-${process.pid}-${Date.now()}`
const image = 'postgres:17-alpine@sha256:b0f9560a2de083e2cc7382e75f808c7381a32852a7ec49117deedb300e552b24'
let started = false
function docker(args, input) {
  return spawnSync('docker', args, { input, encoding: 'utf8', timeout: 60000, maxBuffer: 8 * 1024 * 1024 })
}
function sql(statement) {
  const result = docker(['exec', '-i', container, 'psql', '-h', '127.0.0.1', '-X', '-qAt', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-d', 'cloud_test'], statement)
  if (result.error || result.status !== 0) throw new Error(result.stderr || String(result.error))
  return result.stdout.trim()
}
function asUser(user, statement, role = 'authenticated') {
  return sql(`BEGIN; SET LOCAL ROLE ${role}; SELECT set_config('request.jwt.claim.sub', '${user ?? ''}', true); ${statement}; ROLLBACK;`).split('\n').slice(user ? 1 : 0).join('\n').trim()
}
const id = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const orgA = id(100), orgB = id(101), clientA = id(200), clientB = id(201), clientC = id(202)
const productA = id(300), productB = id(301), productC = id(302)
const envA = id(400), envB = id(401), envC = id(402)
const resourceA = id(500), resourceB = id(501), checkA = id(600), checkB = id(601), backupA = id(700), backupB = id(701)
const adminA = id(1), operatorA = id(2), clientAdminA = id(3), viewerA = id(4), viewerB = id(5), adminB = id(6), outsider = id(7), legacyOwner = id(8)

before(async () => {
  const run = docker(['run', '--detach', '--rm', '--name', container, '--label', 'volynx.task=cloud-console-disposable-test', '--network', 'none', '--tmpfs', '/var/lib/postgresql/data:rw', '-e', 'POSTGRES_HOST_AUTH_METHOD=trust', '-e', 'POSTGRES_DB=cloud_test', image])
  assert.equal(run.status, 0, run.stderr)
  started = true
  let ready = false
  for (let i = 0; i < 30; i++) {
    // The entrypoint's temporary socket server may be ready BEFORE creating the DB.
    // Its final TCP server starts only after initdb and database creation finish.
    if (docker(['exec', container, 'psql', '-h', '127.0.0.1', '-X', '-qAt', '-U', 'postgres', '-d', 'cloud_test', '-c', 'SELECT 1']).status === 0) { ready = true; break }
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  assert.ok(ready, 'Disposable PostgreSQL must become ready')
  sql(`CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN BYPASSRLS;
    CREATE SCHEMA auth; CREATE TABLE auth.users (id uuid PRIMARY KEY);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    GRANT USAGE ON SCHEMA auth, public TO anon, authenticated, service_role;
    GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated, service_role;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role;`)
  // Apply the existing Core DDL unchanged. Its unrelated public demo seed is excluded.
  const core = readFileSync(`${root}supabase/migrations/202605240001_volynx_os_core.sql`, 'utf8')
  assert.ok(core.includes('-- ── 9. Demo seed'))
  sql(core.split('-- ── 9. Demo seed')[0])
  sql(readFileSync(`${root}supabase/migrations/20260928235714_cloud_console_core.sql`, 'utf8'))
  sql(`INSERT INTO auth.users(id) VALUES ${[1,2,3,4,5,6,7,8].map(n => `('${id(n)}')`).join(',')};
    INSERT INTO public.organizations(id,name,slug,owner_id) VALUES ('${orgA}','Fixture A','fixture-a','${legacyOwner}'),('${orgB}','Fixture B','fixture-b',null);
    INSERT INTO public.cloud_console_members(platform_organization_id,user_id,role) VALUES ('${orgA}','${adminA}','volynx_admin'),('${orgA}','${operatorA}','volynx_operator'),('${orgB}','${adminB}','volynx_admin');
    INSERT INTO public.cloud_clients(id,platform_organization_id,name,slug) VALUES ('${clientA}','${orgA}','Client A','a'),('${clientB}','${orgA}','Client B','b'),('${clientC}','${orgB}','Client C','c');
    INSERT INTO public.cloud_client_members(client_id,user_id,role) VALUES ('${clientA}','${clientAdminA}','client_admin'),('${clientA}','${viewerA}','client_viewer'),('${clientB}','${viewerB}','client_viewer');
    INSERT INTO public.cloud_products(id,platform_organization_id,client_id,volynx_id,name,slug) VALUES ('${productA}','${orgA}','${clientA}','VLX-TESTA-001','Product A','a'),('${productB}','${orgA}','${clientB}','VLX-TESTB-001','Product B','b'),('${productC}','${orgB}','${clientC}','VLX-TESTC-001','Product C','c');
    INSERT INTO public.cloud_environments(id,platform_organization_id,product_id,environment_key,name) VALUES ('${envA}','${orgA}','${productA}','production','Production'),('${envB}','${orgA}','${productB}','production','Production'),('${envC}','${orgB}','${productC}','production','Production');`)
  for (const [org,client,product,environment,resource,check,backup,requester] of [
    [orgA,clientA,productA,envA,resourceA,checkA,backupA,viewerA],
    [orgA,clientB,productB,envB,resourceB,checkB,backupB,viewerB],
    [orgB,clientC,productC,envC,id(502),id(602),id(702),adminB],
  ]) {
    sql(`INSERT INTO public.cloud_resources(id,platform_organization_id,product_id,environment_id,provider,resource_kind,name,metadata) VALUES ('${resource}','${org}','${product}','${environment}','fixture','database','Fixture DB','{"internal":"PRIVATE_FIXTURE"}');
      INSERT INTO public.cloud_monitoring_checks(id,platform_organization_id,product_id,environment_id,provider,check_kind) VALUES ('${check}','${org}','${product}','${environment}','fixture','http');
      INSERT INTO public.cloud_monitoring_results(platform_organization_id,product_id,environment_id,check_id,status) VALUES ('${org}','${product}','${environment}','${check}','unknown');
      INSERT INTO public.cloud_backup_capabilities(id,platform_organization_id,product_id,environment_id,resource_id,provider) VALUES ('${backup}','${org}','${product}','${environment}','${resource}','fixture');
      INSERT INTO public.cloud_backup_runs(platform_organization_id,product_id,environment_id,capability_id) VALUES ('${org}','${product}','${environment}','${backup}');
      INSERT INTO public.cloud_deployments(platform_organization_id,product_id,environment_id,provider) VALUES ('${org}','${product}','${environment}','fixture');
      INSERT INTO public.cloud_incidents(platform_organization_id,product_id,environment_id,title) VALUES ('${org}','${product}','${environment}','Fixture incident');
      INSERT INTO public.cloud_care_plans(platform_organization_id,client_id,plan_key) VALUES ('${org}','${client}','fixture');
      INSERT INTO public.cloud_support_requests(platform_organization_id,client_id,product_id,environment_id,requester_id,subject,description) VALUES ('${org}','${client}','${product}','${environment}','${requester}','Fixture ticket','Synthetic test only');`)
  }
})

after(() => {
  if (started) {
    const stop = docker(['stop', '--time', '2', container])
    assert.equal(stop.status, 0, `Could not remove disposable container ${container}: ${stop.stderr}`)
  }
})

test('RLS runs as a non-owner role without bypass', () => {
  assert.equal(asUser(viewerA, "SELECT current_user || ':' || rolbypassrls::text FROM pg_roles WHERE rolname = current_user"), 'authenticated:false')
})
for (const [label, user, count] of [['client admin',clientAdminA,1],['client viewer',viewerA,1],['other client',viewerB,1],['operator',operatorA,2],['platform admin',adminA,2],['other organization',adminB,1],['outsider',outsider,0],['legacy owner',legacyOwner,0]]) {
  test(`${label}: only permitted products are visible`, () => assert.equal(asUser(user,'SELECT count(*) FROM public.cloud_products'), String(count)))
}
test('cross-client product and environment lookup is empty', () => {
  assert.equal(asUser(viewerA, `SELECT count(*) FROM public.cloud_products WHERE id='${productB}'`), '0')
  assert.equal(asUser(viewerA, `SELECT count(*) FROM public.cloud_environments WHERE id='${envB}'`), '0')
})
test('VLX ID is immutable even for platform administrator', () => {
  assert.throws(() => asUser(adminA, `UPDATE public.cloud_products SET volynx_id='VLX-CHANGED-002' WHERE id='${productA}'`), /immutable|permission denied/i)
})
test('support cannot reference another client product in the same organization', () => {
  assert.throws(() => asUser(viewerA, `INSERT INTO public.cloud_support_requests(platform_organization_id,client_id,product_id,requester_id,subject,description) VALUES ('${orgA}','${clientA}','${productB}','${viewerA}','Fixture','Cross-client probe')`), /foreign key|context|mismatch|violates/i)
})
test('integration secret references are not visible to clients', () => {
  sql(`INSERT INTO public.cloud_integrations(platform_organization_id,client_id,provider,secret_ref) VALUES ('${orgA}','${clientA}','fixture','fixture-reference-not-a-secret')`)
  assert.equal(asUser(viewerA, 'SELECT count(*) FROM public.cloud_integrations'), '0')
})
test('anonymous users have no table access', () => {
  assert.throws(() => asUser(null, 'SELECT id FROM public.cloud_products', 'anon'), /permission denied/i)
})

const productTables = ['cloud_products','cloud_environments','cloud_resources','cloud_deployments','cloud_monitoring_results','cloud_backup_capabilities','cloud_backup_runs','cloud_incidents']
for (const table of [...productTables,'cloud_clients','cloud_care_plans','cloud_support_requests']) {
  test(`${table}: client rows isolated within organization and across organizations`, () => {
    assert.equal(asUser(viewerA, `SELECT count(*) FROM public.${table}`), '1')
    assert.equal(asUser(adminB, `SELECT count(*) FROM public.${table}`), '1')
    assert.equal(asUser(outsider, `SELECT count(*) FROM public.${table}`), '0')
  })
}
test('missing auth subject has no rows', () => {
  assert.equal(asUser(null,'SELECT count(*) FROM public.cloud_products'), '0')
})
test('internal tables and audit remain operator-only', () => {
  for (const table of ['cloud_monitoring_checks','cloud_integrations','cloud_audit_events','cloud_console_members']) {
    assert.equal(asUser(viewerA, `SELECT count(*) FROM public.${table}`), '0')
    assert.equal(asUser(clientAdminA, `SELECT count(*) FROM public.${table}`), '0')
  }
  assert.equal(asUser(operatorA,'SELECT count(*) FROM public.cloud_monitoring_checks'), '2')
  assert.ok(Number(asUser(operatorA,'SELECT count(*) FROM public.cloud_audit_events')) > 0)
})
test('only own client membership is visible to viewers', () => {
  assert.equal(asUser(viewerA,'SELECT count(*) FROM public.cloud_client_members'), '1')
})
test('catalog creation works for platform admin with a valid tenant path', () => {
  assert.equal(asUser(adminA, `INSERT INTO public.cloud_products(platform_organization_id,client_id,volynx_id,name,slug) VALUES ('${orgA}','${clientA}','VLX-TESTA-002','New fixture','new') RETURNING volynx_id`), 'VLX-TESTA-002')
})
test('platform admin cannot create a product for another organization', () => {
  assert.throws(() => asUser(adminA, `INSERT INTO public.cloud_products(platform_organization_id,client_id,volynx_id,name,slug) VALUES ('${orgB}','${clientC}','VLX-TESTC-002','Denied','denied')`), /row-level security/)
})
test('platform admin cannot forge organization on another organization client', () => {
  assert.throws(() => asUser(adminA, `INSERT INTO public.cloud_products(platform_organization_id,client_id,volynx_id,name,slug) VALUES ('${orgA}','${clientC}','VLX-TESTC-002','Denied','denied')`), /foreign key/)
})
test('operator and client cannot create products or grant themselves platform roles', () => {
  for (const user of [operatorA,clientAdminA,viewerA,outsider,legacyOwner]) {
    assert.throws(() => asUser(user, `INSERT INTO public.cloud_products(platform_organization_id,client_id,volynx_id,name,slug) VALUES ('${orgA}','${clientA}','VLX-TESTA-002','Denied','denied')`), /row-level security/)
    assert.throws(() => asUser(user, `INSERT INTO public.cloud_console_members(platform_organization_id,user_id,role) VALUES ('${orgA}','${outsider}','volynx_admin')`), /row-level security/)
  }
})
test('role change by admin creates an audit event without logging payload values', () => {
  assert.equal(asUser(adminA, `UPDATE public.cloud_console_members SET role='volynx_admin' WHERE user_id='${operatorA}'; SELECT count(*) FROM public.cloud_audit_events WHERE actor_user_id='${adminA}' AND action='update' AND entity_type='cloud_console_members' AND metadata->'changedFields' @> '["role"]'::jsonb`), '1')
  assert.equal(asUser(operatorA, `UPDATE public.cloud_console_members SET role='volynx_admin' WHERE user_id='${operatorA}' RETURNING id`), '')
})
test('support insert works, is audited and cannot impersonate another requester', () => {
  const insert = `INSERT INTO public.cloud_support_requests(platform_organization_id,client_id,product_id,environment_id,requester_id,subject,description) VALUES ('${orgA}','${clientA}','${productA}','${envA}','${viewerA}','New ticket','Synthetic')`
  assert.equal(asUser(viewerA, `${insert}; SELECT count(*) FROM public.cloud_support_requests`), '2')
  assert.throws(() => asUser(viewerA, insert.replace(`'${viewerA}'`,`'${viewerB}'`)), /row-level security/)
  assert.throws(() => asUser(viewerA, insert.replace(`'${clientA}'`,`'${clientB}'`).replace(`'${productA}'`,`'${productB}'`).replace(`'${envA}'`,`'${envB}'`)), /row-level security/)
})
test('support cannot forge a closed status, metadata or post-creation tenant', () => {
  assert.throws(() => asUser(viewerA, `UPDATE public.cloud_support_requests SET client_id='${clientB}' WHERE requester_id='${viewerA}'`), /permission denied/)
  assert.throws(() => asUser(viewerA, `INSERT INTO public.cloud_support_requests(platform_organization_id,client_id,requester_id,subject,description,status) VALUES ('${orgA}','${clientA}','${viewerA}','Fake closed','Fixture','closed')`), /permission denied/)
})
test('support requires matching product and environment', () => {
  assert.throws(() => asUser(viewerA, `INSERT INTO public.cloud_support_requests(platform_organization_id,client_id,product_id,environment_id,requester_id,subject,description) VALUES ('${orgA}','${clientA}','${productA}','${envB}','${viewerA}','Wrong environment','Fixture')`), /foreign key/)
})
test('raw metadata, results, repositories and secret references are denied', () => {
  for (const [table,column] of [['cloud_products','repository_url'],['cloud_resources','metadata'],['cloud_monitoring_results','result'],['cloud_integrations','secret_ref'],['cloud_deployments','failure_message'],['cloud_deployments','commit_sha']]) {
    assert.throws(() => asUser(viewerA,`SELECT ${column} FROM public.${table}`), /permission denied/)
    assert.throws(() => asUser(operatorA,`SELECT ${column} FROM public.${table}`), /permission denied/)
  }
})
test('VLX ID and tenant identity are immutable for trusted ingestion too', () => {
  for (const change of [`volynx_id='VLX-CHANGED-002'`,`client_id='${clientB}'`,`platform_organization_id='${orgB}'`]) {
    assert.throws(() => asUser(null,`UPDATE public.cloud_products SET ${change} WHERE id='${productA}'`,'service_role'), /immutable/)
  }
  assert.throws(() => asUser(null,`UPDATE public.cloud_clients SET platform_organization_id='${orgB}' WHERE id='${clientA}'`,'service_role'), /immutable/)
})
test('service role cannot attach a resource to another product environment', () => {
  assert.throws(() => asUser(null,`INSERT INTO public.cloud_resources(platform_organization_id,product_id,environment_id,provider,resource_kind,name) VALUES ('${orgA}','${productA}','${envB}','fixture','database','Invalid')`,'service_role'), /foreign key/)
})
test('monitoring result cannot reference another client check', () => {
  assert.throws(() => asUser(null,`INSERT INTO public.cloud_monitoring_results(platform_organization_id,product_id,environment_id,check_id,status) VALUES ('${orgA}','${productA}','${envA}','${checkB}','unknown')`,'service_role'), /foreign key/)
})
test('backup capability cannot reference another client resource', () => {
  assert.throws(() => asUser(null,`INSERT INTO public.cloud_backup_capabilities(platform_organization_id,product_id,environment_id,resource_id,provider) VALUES ('${orgA}','${productA}','${envB}','${resourceB}','fixture')`,'service_role'), /foreign key/)
})
test('backup run cannot reference another client capability', () => {
  assert.throws(() => asUser(null,`INSERT INTO public.cloud_backup_runs(platform_organization_id,product_id,environment_id,capability_id) VALUES ('${orgA}','${productA}','${envB}','${backupB}')`,'service_role'), /foreign key/)
})
test('nullable environment does not bypass backup environment integrity', () => {
  assert.throws(() => asUser(null,`INSERT INTO public.cloud_backup_runs(platform_organization_id,product_id,capability_id) VALUES ('${orgA}','${productA}','${backupA}')`,'service_role'), /environment_mismatch/)
})
test('positive health without evidence is rejected', () => {
  for (const [table,column] of [['cloud_environments','status'],['cloud_resources','status'],['cloud_backup_capabilities','capability_status']]) {
    assert.throws(() => asUser(null,`UPDATE public.${table} SET ${column}='operational' WHERE product_id='${productA}'`,'service_role'), /check constraint/)
  }
  assert.throws(() => asUser(null,`UPDATE public.cloud_backup_capabilities SET verification_status='verified' WHERE id='${backupA}'`,'service_role'), /check constraint/)
})
test('provider failure can be persisted explicitly by trusted ingestion', () => {
  assert.equal(asUser(null,`INSERT INTO public.cloud_deployments(platform_organization_id,product_id,environment_id,provider,status,source,checked_at,finished_at,failure_code,failure_message) VALUES ('${orgA}','${productA}','${envA}','fixture','failed','fixture-adapter',now(),now(),'provider_unavailable','Synthetic provider failure') RETURNING status`,'service_role'), 'failed')
  assert.throws(() => asUser(null,`INSERT INTO public.cloud_deployments(platform_organization_id,product_id,environment_id,provider,status,source,checked_at) VALUES ('${orgA}','${productA}','${envA}','fixture','failed','fixture-adapter',now())`,'service_role'), /check constraint/)
})
test('client cannot fabricate monitoring success or issue infrastructure writes', () => {
  for (const user of [viewerA,clientAdminA,operatorA,adminA]) {
    assert.throws(() => asUser(user,`UPDATE public.cloud_resources SET status='operational',source='forged',checked_at=now() WHERE id='${resourceA}'`), /permission denied/)
  }
})
test('no direct destructive action is exposed to authenticated users', () => {
  for (const table of ['cloud_products','cloud_environments','cloud_integrations','cloud_console_members','cloud_client_members']) {
    assert.throws(() => asUser(adminA,`DELETE FROM public.${table}`), /permission denied/)
    assert.throws(() => asUser(adminA,`TRUNCATE public.${table} CASCADE`), /permission denied/)
  }
})
test('audit cannot be forged, changed or erased', () => {
  assert.throws(() => asUser(adminA,`INSERT INTO public.cloud_audit_events(platform_organization_id,action,entity_type,outcome) VALUES ('${orgA}','restore','database','success')`), /permission denied/)
  for (const statement of ['DELETE FROM public.cloud_audit_events','TRUNCATE public.cloud_audit_events',"UPDATE public.cloud_audit_events SET action='forged'"]) {
    assert.throws(() => asUser(null,statement,'service_role'), /permission denied|append_only/)
    assert.throws(() => sql(statement), /append_only/)
  }
  assert.equal(sql("SELECT count(*) FROM public.cloud_audit_events WHERE metadata::text LIKE '%PRIVATE_FIXTURE%'"), '0')
})
test('trigger functions are not exposed as anonymous or authenticated RPCs', () => {
  for (const role of ['anon','authenticated']) {
    assert.equal(sql(`SELECT has_function_privilege('${role}','public.cloud_record_audit()','EXECUTE')`), 'f')
    assert.equal(sql(`SELECT has_function_privilege('${role}','public.cloud_validate_backup_environment()','EXECUTE')`), 'f')
  }
  assert.equal(sql("SELECT has_function_privilege('anon','public.cloud_can_access_product(uuid)','EXECUTE')"), 'f')
})
test('revocation and suspension remove client visibility on the next query', () => {
  sql('BEGIN; DELETE FROM public.cloud_client_members WHERE user_id=\''+viewerA+'\'; COMMIT;')
  assert.equal(asUser(viewerA,'SELECT count(*) FROM public.cloud_products'), '0')
  assert.equal(asUser(viewerA,'SELECT count(*) FROM public.cloud_support_requests'), '0')
  sql(`UPDATE public.cloud_clients SET status='suspended' WHERE id='${clientA}'`)
  assert.equal(asUser(clientAdminA,'SELECT count(*) FROM public.cloud_products'), '0')
  assert.equal(asUser(operatorA,'SELECT count(*) FROM public.cloud_products'), '2')
})
