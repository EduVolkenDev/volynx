import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { test } from "node:test";

const source = readFileSync(new URL("../public/scripts/auth-reset.js", import.meta.url), "utf8")
  .replace(/^import .*;\n/, "");
const tick = () => new Promise(resolve => setImmediate(resolve));

async function setup({ search = "", hash = "", sessionError = null, updateError = null, storageError = false } = {}) {
  const nodes = Object.fromEntries(["resetForm", "resetStatus", "resetSave", "resetPassword", "resetConfirm", "resetRetry", "resetContinue"].map(id => [id, {
    hidden: id !== "resetStatus", disabled: false, value: "", textContent: "", focus() {},
    addEventListener(type, callback) { this[type] = callback; },
  }]));
  let verifications = 0;
  let updates = 0;
  let persisted = 0;
  let scrubbed = false;
  const session = { access_token: "fixture-access", refresh_token: "fixture-refresh" };
  const verify = async () => {
    verifications++;
    return { data: { session }, error: sessionError };
  };
  const root = { lang: "en" };
  const events = {};
  runInNewContext(source, {
    document: { documentElement: root, getElementById: id => nodes[id] },
    location: { search, hash, pathname: "/auth/reset/" },
    history: { replaceState() { scrubbed = true; } },
    URLSearchParams,
    fetch: async () => ({ ok: true, json: async () => ({ supabaseUrl: "https://fixture.supabase.co", supabaseAnonKey: "public-fixture" }) }),
    window: { addEventListener(name, fn) { events[name] = fn; }, supabase: { createClient: () => ({ auth: {
      verifyOtp: verify, setSession: verify,
      async updateUser() { updates++; return { error: updateError }; },
    } }) } },
    persistVolynxSession() { if (storageError) throw new Error("Unavailable"); persisted++; },
  });
  await tick();
  return {
    nodes, language(lang) { root.lang = lang; events["vx:lang-changed"](); }, counts: () => ({ verifications, updates, persisted, scrubbed }),
    async submit(password = "test-password", confirmation = password) {
      nodes.resetPassword.value = password;
      nodes.resetConfirm.value = confirmation;
      await nodes.resetForm.submit({ preventDefault() {} });
    },
  };
}

test("missing or non-recovery links never enable password changes", async () => {
  for (const hash of ["", "#type=signup&access_token=a&refresh_token=b"]) {
    const s = await setup({ hash });
    await s.submit();
    assert.equal(s.nodes.resetForm.hidden, true);
    assert.equal(s.counts().updates, 0);
    assert.equal(s.counts().verifications, 0);
    assert.equal(s.counts().scrubbed, true);
  }
});

test("implicit and token-hash recovery validate before exposing the form", async () => {
  for (const params of [
    { hash: "#type=recovery&access_token=a&refresh_token=b" },
    { search: "?type=recovery&token_hash=fixture" },
  ]) {
    const s = await setup(params);
    assert.equal(s.nodes.resetForm.hidden, false);
    assert.equal(s.counts().verifications, 1);
    assert.equal(s.counts().persisted, 0);
    await s.submit();
    assert.equal(s.counts().updates, 1);
    assert.equal(s.counts().persisted, 1);
    assert.equal(s.nodes.resetContinue.hidden, false);
    assert.equal(s.nodes.resetPassword.value, "");
  }
});

test("expired recovery links remain blocked", async () => {
  const s = await setup({ search: "?type=recovery&token_hash=expired", sessionError: new Error("expired") });
  assert.equal(s.nodes.resetForm.hidden, true);
  assert.equal(s.nodes.resetRetry.hidden, false);
  await s.submit();
  assert.equal(s.counts().updates, 0);
});

test("password validation and server failures allow correction without false success", async () => {
  const s = await setup({ search: "?type=recovery&token_hash=fixture", updateError: new Error("Password rejected") });
  await s.submit("short");
  await s.submit("test-password", "different-password");
  assert.equal(s.counts().updates, 0);
  await s.submit();
  assert.equal(s.nodes.resetStatus.textContent, "Password rejected");
  assert.equal(s.nodes.resetSave.disabled, false);
  assert.equal(s.nodes.resetContinue.hidden, true);
  assert.equal(s.counts().persisted, 0);
});

test("status follows language changes and storage failure preserves successful password update", async () => {
  const s = await setup({ search: "?type=recovery&token_hash=fixture", storageError: true });
  s.language("pt");
  assert.match(s.nodes.resetStatus.textContent, /Escolha uma senha/);
  await s.submit();
  assert.equal(s.counts().updates, 1);
  assert.equal(s.nodes.resetForm.hidden, true);
  assert.equal(s.nodes.resetContinue.hidden, false);
  assert.equal(s.nodes.resetContinue.href, "/login/");
  assert.match(s.nodes.resetStatus.textContent, /Senha atualizada/);
  s.language("en");
  assert.match(s.nodes.resetStatus.textContent, /Password updated/);
});
