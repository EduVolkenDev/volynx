import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { before, after, test } from "node:test";

// This runner accepts no connection URL, credentials, mount, or published port.
const image = "postgres:17-alpine@sha256:b0f9560a2de083e2cc7382e75f808c7381a32852a7ec49117deedb300e552b24";
const container = `volynx-profile-test-${process.pid}-${Date.now()}`;
let started = false;
const id = "00000000-0000-4000-8000-000000000001";
const other = "00000000-0000-4000-8000-000000000002";
function docker(args, input) {
  return spawnSync("docker", args, { input, encoding: "utf8", timeout: 60000 });
}
function query(statement, fail = false) {
  const r = docker(["exec", "-i", container, "psql", "-h", "127.0.0.1", "-U", "postgres", "-X", "-qAt", "-v", "ON_ERROR_STOP=1"], statement);
  if (fail) { assert.notEqual(r.status, 0); assert.match(r.stderr, /permission denied/); }
  else assert.equal(r.status, 0, r.stderr || String(r.error));
  return r.stdout.trim();
}
function client(statement, fail = false) {
  return query(`BEGIN; SET LOCAL ROLE authenticated; SELECT set_config('qa.user_id','${id}',true); ${statement}; ROLLBACK;`, fail);
}

before(async () => {
  const r = docker(["run", "--detach", "--rm", "--name", container, "--label", "volynx.task=profile-authority-disposable-test", "--network", "none", "--tmpfs", "/var/lib/postgresql/data:rw", "-e", "POSTGRES_HOST_AUTH_METHOD=trust", image]);
  assert.equal(r.status, 0, r.stderr);
  started = true;
  let ready = false;
  for (let i = 0; i < 30; i++) {
    if (docker(["exec", container, "pg_isready", "-h", "127.0.0.1", "-U", "postgres"]).status === 0) { ready = true; break; }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  assert.ok(ready);
  query(`CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN BYPASSRLS;
    CREATE TABLE profiles(id uuid PRIMARY KEY, email text, full_name text, username text, bio text, website text,
      location text, avatar_id text, avatar_url text, role text DEFAULT 'user', org_id uuid,
      plan text DEFAULT 'free', builder_plan text DEFAULT 'free', daily_plan text DEFAULT 'free',
      cvitae_plan text DEFAULT 'free', world_plan text DEFAULT 'free', token_balance int DEFAULT 0,
      is_admin boolean DEFAULT false, is_black_diamond boolean DEFAULT false, icon_pack_grants jsonb DEFAULT '[]',
      user_plan uuid, stripe_customer_id text, black_diamond_claimed_at timestamptz, daily_plan_expires_at timestamptz,
      devjourney_tier text DEFAULT 'social', future_internal_flag boolean DEFAULT false);
    ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
    GRANT ALL ON profiles TO anon, authenticated, service_role;
    GRANT UPDATE(builder_plan) ON profiles TO authenticated;
    CREATE POLICY own_profile ON profiles TO authenticated USING (id = nullif(current_setting('qa.user_id',true),'')::uuid)
      WITH CHECK (id = nullif(current_setting('qa.user_id',true),'')::uuid);
    INSERT INTO profiles(id,email,full_name) VALUES ('${id}','qa@example.invalid','QA'),('${other}','other@example.invalid','Other');
    CREATE FUNCTION public.qa_credit_one() RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = '' AS
      $$ UPDATE public.profiles SET token_balance=token_balance+1 WHERE id=nullif(current_setting('qa.user_id',true),'')::uuid $$;
    REVOKE ALL ON FUNCTION qa_credit_one() FROM PUBLIC; GRANT EXECUTE ON FUNCTION qa_credit_one() TO authenticated;`);
  query(readFileSync("supabase/migrations/202611260001_profile_entitlement_write_authority.sql", "utf8"));
});

after(() => { if (started) assert.equal(docker(["rm", "-f", container]).status, 0); });

test("every entitlement/admin column rejects direct client changes", () => {
  for (const [column, value] of Object.entries({ builder_plan: "'studio'", plan: "'pro'", daily_plan: "'diamond'", cvitae_plan: "'business'", world_plan: "'pro'", token_balance: "999", is_admin: "true", is_black_diamond: "true", role: "'admin'", org_id: "'00000000-0000-4000-8000-000000000099'", icon_pack_grants: "'[\"all\"]'::jsonb", user_plan: "'00000000-0000-4000-8000-000000000099'", stripe_customer_id: "'cus_fake'", black_diamond_claimed_at: "now()", daily_plan_expires_at: "now()", devjourney_tier: "'premium'", future_internal_flag: "true" })) {
    client(`UPDATE profiles SET ${column}=${value} WHERE id='${id}'`, true);
  }
  assert.equal(query(`SELECT builder_plan||':'||token_balance||':'||is_admin FROM profiles WHERE id='${id}'`), "free:0:false");
});

test("safe profile edits and RLS ownership remain functional", () => {
  assert.match(client(`UPDATE profiles SET full_name='Edited',bio='Safe edit' WHERE id='${id}'; SELECT full_name FROM profiles WHERE id='${id}'`), /Edited/);
  client(`UPDATE profiles SET full_name='Mixed',builder_plan='studio' WHERE id='${id}'`, true);
  assert.equal(query(`SELECT full_name FROM profiles WHERE id='${id}'`), "QA");
  client(`UPDATE profiles SET full_name='Changed' WHERE id='${other}'`);
  assert.equal(query(`SELECT full_name FROM profiles WHERE id='${other}'`), "Other");
});

test("bootstrap uses database defaults and cannot insert paid entitlements", () => {
  const fresh = "00000000-0000-4000-8000-000000000003";
  const prefix = `BEGIN; SET LOCAL ROLE authenticated; SELECT set_config('qa.user_id','${fresh}',true);`;
  assert.match(query(`${prefix} INSERT INTO profiles(id,email,full_name) VALUES ('${fresh}','new@example.invalid','New'); SELECT plan||':'||builder_plan||':'||token_balance FROM profiles WHERE id='${fresh}'; ROLLBACK;`), /free:free:0/);
  query(`${prefix} INSERT INTO profiles(id,email,builder_plan) VALUES ('${fresh}','new@example.invalid','studio'); ROLLBACK;`, true);
  assert.match(client(`INSERT INTO profiles(id,email,full_name) VALUES ('${id}','qa@example.invalid','Upsert') ON CONFLICT(id) DO UPDATE SET id=excluded.id,email=excluded.email,full_name=excluded.full_name; SELECT full_name FROM profiles WHERE id='${id}'`), /Upsert/);
});

test("trusted services and narrowly authorized RPCs retain existing write authority", () => {
  assert.match(query(`BEGIN; SET LOCAL ROLE service_role; UPDATE profiles SET builder_plan='pro' WHERE id='${id}'; SELECT builder_plan FROM profiles WHERE id='${id}'; ROLLBACK;`), /pro/);
  assert.match(client(`SELECT qa_credit_one(); SELECT token_balance FROM profiles WHERE id='${id}'`), /1/);
  assert.equal(query(`SELECT token_balance FROM profiles WHERE id='${id}'`), "0");
});

test("the browser bootstrap no longer sends server-owned fields", () => {
  const source = readFileSync("src/pages/profile.astro", "utf8");
  const start = source.indexOf("const newProfile =");
  assert.ok(start > 0);
  const bootstrap = source.slice(start, source.indexOf("};", start));
  assert.doesNotMatch(bootstrap, /\b(?:plan|builder_plan|token_balance)\s*:/);
});
