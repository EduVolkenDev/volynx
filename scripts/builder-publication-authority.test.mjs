import assert from "node:assert/strict";
import { spawnSync, spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { before, after, beforeEach, test } from "node:test";

// This runner accepts no connection URL, credentials, mount, or published port.
const image = "postgres:17-alpine@sha256:b0f9560a2de083e2cc7382e75f808c7381a32852a7ec49117deedb300e552b24";
const container = `volynx-publication-test-${process.pid}-${Date.now()}`;
let started = false;
const id = "00000000-0000-4000-8000-000000000001";
const other = "00000000-0000-4000-8000-000000000002";
function docker(args, input) {
  return spawnSync("docker", args, { input, encoding: "utf8", timeout: 60000 });
}
function query(statement, fail = false) {
  const r = docker(["exec", "-i", container, "psql", "-h", "127.0.0.1", "-U", "postgres", "-X", "-qAt", "-v", "ON_ERROR_STOP=1", "-v", "VERBOSITY=verbose"], statement);
  if (fail) { assert.notEqual(r.status, 0); assert.match(r.stderr, /42501/); }
  else assert.equal(r.status, 0, r.stderr || String(r.error));
  return r.stdout.trim();
}
function client(statement, fail = false) {
  return query(`BEGIN; SET LOCAL ROLE authenticated; SELECT set_config('qa.user_id','${id}',true); ${statement}; ROLLBACK;`, fail);
}


before(async () => {
  const r = docker(["run", "--detach", "--rm", "--name", container, "--network", "none", "--tmpfs", "/var/lib/postgresql/data:rw", "-e", "POSTGRES_HOST_AUTH_METHOD=trust", image]);
  assert.equal(r.status, 0, r.stderr); started = true;
  for (let i=0;i<30;i++) {
    if (docker(["exec",container,"pg_isready","-h","127.0.0.1","-U","postgres"]).status===0) break;
    await new Promise(r=>setTimeout(r,500));
  }
  query(`CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN BYPASSRLS;
    CREATE TABLE profiles(id uuid PRIMARY KEY,builder_plan text DEFAULT 'launch');
    CREATE TABLE builder_plan_limits(plan text PRIMARY KEY,max_published int NOT NULL);
    INSERT INTO builder_plan_limits VALUES('free',0),('launch',1),('pro',3);
    CREATE TABLE projects(id uuid PRIMARY KEY,user_id uuid NOT NULL REFERENCES profiles(id),slug text,
      status text DEFAULT 'draft',builder_data jsonb DEFAULT '{}',deleted_at timestamptz,updated_at timestamptz DEFAULT now());
    ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
    GRANT ALL ON profiles,projects,builder_plan_limits TO service_role;
    GRANT SELECT,INSERT,UPDATE,DELETE ON projects TO authenticated;
    CREATE POLICY own ON projects TO authenticated USING(user_id=nullif(current_setting('qa.user_id',true),'')::uuid)
      WITH CHECK(user_id=nullif(current_setting('qa.user_id',true),'')::uuid);`);
  query(readFileSync('supabase/migrations/202611260002_builder_publication_authority.sql','utf8'));
});
after(()=>{if(started) assert.equal(docker(['rm','-f',container]).status,0);});
const p1='00000000-0000-4000-8000-000000000011';
const p2='00000000-0000-4000-8000-000000000012';
const op1='00000000-0000-4000-8000-000000000021';
const op2='00000000-0000-4000-8000-000000000022';
beforeEach(()=>query(`TRUNCATE builder_publication_slots,projects,profiles; INSERT INTO profiles(id) VALUES('${id}'),('${other}');
 INSERT INTO projects(id,user_id,slug) VALUES('${p1}','${id}','qa-one'),('${p2}','${id}','qa-two');`));
function begin(project=p1,op=op1,operation='publish',user=id) {
 return `SELECT public.begin_builder_publication('${project}','${user}','${op}','${operation}')`;
}
function finish(project=p1,op=op1) {return `SELECT public.finish_builder_publication('${project}','${id}','${op}')`;}
function service(sql) {return query(`SET ROLE service_role; ${sql};`);}
function asyncQuery(sql) {
 return new Promise((resolve,reject)=>{
  const child=spawn('docker',['exec','-i',container,'psql','-h','127.0.0.1','-U','postgres','-X','-qAt','-v','ON_ERROR_STOP=1']);
  let out='',err=''; child.stdout.on('data',v=>out+=v); child.stderr.on('data',v=>err+=v);
  child.on('error',reject); child.on('close',code=>code===0?resolve(out):reject(new Error(err)));child.stdin.end(sql);
 });
}
test('Free cannot publish; foreign owners and client RPC calls are rejected',()=>{
 query(`UPDATE profiles SET builder_plan='free' WHERE id='${id}'`);
 assert.match(service(begin()),/publish_limit_reached/);
 assert.match(service(begin(p1,op1,'publish',other)),/forbidden/);
 client(begin(),true);
 assert.equal(query('SELECT count(*) FROM builder_publication_slots'),'0');
});
test('two genuinely concurrent admissions never exceed the last slot',async()=>{
 const results=await Promise.all([
  asyncQuery(`BEGIN; SET LOCAL ROLE service_role; ${begin()}; SELECT pg_sleep(0.2); COMMIT;`),
  asyncQuery(`BEGIN; SET LOCAL ROLE service_role; ${begin(p2,op2)}; SELECT pg_sleep(0.2); COMMIT;`),
 ]);
 assert.equal(results.filter(r=>r.includes('"ok": true')).length,1,results.join('\n'));
 assert.equal(results.filter(r=>r.includes('publish_limit_reached')).length,1);
 assert.equal(query('SELECT count(*) FROM builder_publication_slots WHERE held'),'1');
});
test('uncertain storage writes keep a slot and reject overlapping same-project actions',()=>{
 assert.match(service(begin()),/"ok": true/);
 assert.match(service(begin(p1,op2,'unpublish')),/publication_busy/);
 assert.match(service(begin(p2,op2)),/publish_limit_reached/);
 client(`UPDATE projects SET status='published' WHERE id='${p1}'`,true);
 client(`UPDATE projects SET slug='changed' WHERE id='${p1}'`,true);
 client(`UPDATE projects SET deleted_at=now() WHERE id='${p1}'`,true);
 client(`DELETE FROM projects WHERE id='${p1}'`,true);
 assert.match(client(`UPDATE projects SET builder_data='{"safe":true}' WHERE id='${p1}'; SELECT builder_data FROM projects WHERE id='${p1}'`),/safe/);
});
test('successful republish uses the same slot; unpublish releases it only on finish',()=>{
 service(begin()); service(finish());
 assert.equal(query(`SELECT status FROM projects WHERE id='${p1}'`),'published');
 client(`UPDATE projects SET status='draft' WHERE id='${p1}'`,true);
 assert.match(service(begin(p1,op2)),/"ok": true/); service(finish(p1,op2));
 assert.match(service(begin(p1,op1,'unpublish')),/"ok": true/);
 assert.match(service(begin(p2,op2)),/publish_limit_reached/);
 assert.match(service(finish(p1,op2)),/publication_conflict/);
 service(finish());
 assert.equal(query(`SELECT status FROM projects WHERE id='${p1}'`),'draft');
 assert.match(service(begin(p2,op2)),/"ok": true/);
});
test('legacy and soft-deleted published rows consume capacity; draft edits/deletion work',()=>{
 query(`UPDATE projects SET status='published',deleted_at=now() WHERE id='${p1}'`);
 assert.match(service(begin(p2,op2)),/publish_limit_reached/);
 client(`INSERT INTO projects(id,user_id,slug,status) VALUES('${op1}','${id}','fake','published')`,true);
 assert.match(client(`UPDATE projects SET slug='draft-changed' WHERE id='${p2}'; SELECT slug FROM projects WHERE id='${p2}'`),/draft-changed/);
 client(`DELETE FROM projects WHERE id='${p2}'`);
});
test('slug collisions, unavailable plans and deleted projects fail closed',()=>{
 query(`UPDATE profiles SET builder_plan='pro'; UPDATE projects SET slug='qa-one' WHERE id='${p2}'`);
 service(begin());
 assert.match(service(begin(p2,op2)),/slug_in_use/);
 query(`UPDATE projects SET deleted_at=now() WHERE id='${p2}'`);
 assert.match(service(begin(p2,op2)),/project_deleted/);
 query(`UPDATE profiles SET builder_plan='unknown'; DELETE FROM builder_publication_slots; UPDATE projects SET deleted_at=NULL,slug='qa-two' WHERE id='${p2}'`);
 assert.match(service(begin(p2,op2)),/plan_unavailable/);
});
test('different owners racing for one slug cannot overwrite each other',async()=>{
 query(`UPDATE projects SET user_id='${other}',slug='qa-one' WHERE id='${p2}'`);
 const results=await Promise.all([
  asyncQuery(`BEGIN; SET LOCAL ROLE service_role; ${begin()}; SELECT pg_sleep(0.2); COMMIT;`),
  asyncQuery(`BEGIN; SET LOCAL ROLE service_role; ${begin(p2,op2,'publish',other)}; SELECT pg_sleep(0.2); COMMIT;`),
 ]);
 assert.equal(results.filter(r=>r.includes('"ok": true')).length,1);
 assert.equal(results.filter(r=>r.includes('slug_in_use')).length,1);
});
test('client cannot change identity, edit another owner, or read the reservation ledger',()=>{
 client(`UPDATE projects SET user_id='${other}' WHERE id='${p1}'`,true);
 client(`UPDATE projects SET id='${op1}' WHERE id='${p1}'`,true);
 query(`UPDATE projects SET user_id='${other}' WHERE id='${p2}'`);
 client(`UPDATE projects SET slug='stolen' WHERE id='${p2}'`);
 assert.equal(query(`SELECT slug FROM projects WHERE id='${p2}'`),'qa-two');
 client('SELECT * FROM builder_publication_slots',true);
});
