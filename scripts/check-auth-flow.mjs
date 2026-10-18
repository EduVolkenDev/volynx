import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { passkeyErrorMessage } from '../public/scripts/auth-passkey-errors.js';

const source = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const stripImport = (code) => code.replace(/^import \{ (?:persistVolynxSession|passkeyErrorMessage) \} from "\.\/(?:auth-session|auth-passkey-errors)\.js";\s*/gm, '');
const tick = () => new Promise((resolve) => setImmediate(resolve));

function storage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
}

function element() {
  const events = new Map();
  return {
    hidden: true,
    disabled: true,
    textContent: '',
    value: '',
    children: [],
    classList: { add() {}, remove() {} },
    addEventListener: (name, fn) => events.set(name, fn),
    dispatch: (name, event = {}) => events.get(name)?.(event),
    replaceChildren(...children) { this.children = children; },
    appendChild(child) { this.children.push(child); },
    append(...children) { this.children.push(...children); },
    setAttribute() {},
    querySelectorAll(selector) {
      return selector === 'button'
        ? this.children.flatMap((item) => item.children || []).filter((item) => item.type === 'button')
        : [];
    },
  };
}

{
  const localStorage = storage();
  const cookies = new Map();
  const document = {
    get cookie() { return [...cookies].map(([key, value]) => `${key}=${value}`).join('; '); },
    set cookie(value) {
      const [pair] = value.split(';');
      const index = pair.indexOf('=');
      const key = pair.slice(0, index);
      const encoded = pair.slice(index + 1);
      if (value.includes('Max-Age=0')) cookies.delete(key);
      else cookies.set(key, encoded);
    },
  };
  const window = { addEventListener() {} };
  runInNewContext(source('public/js/vx-auth-bridge.js'), {
    window, document, localStorage, location: { hostname: 'volynx.world', protocol: 'https:' },
  });
  const session = { access_token: 'access', refresh_token: 'refresh', user: { email: 'person@example.com' } };
  window.VxAuthBridge.persistSession(session);
  assert.equal(localStorage.getItem('volynx_access_token'), 'access');
  assert.equal(decodeURIComponent(cookies.get('volynx_refresh_token')), 'refresh');
  assert.throws(() => window.VxAuthBridge.persistSession({ access_token: 'partial' }), /complete session/);
  assert.equal(localStorage.getItem('volynx_refresh_token'), 'refresh');
  window.VxAuthBridge.clear();
  assert.equal(localStorage.getItem('volynx_access_token'), null);
  assert.equal(cookies.has('volynx_refresh_token'), false);
}

{
  const localStorage = storage();
  localStorage.setItem('volynx_access_token', 'old-access');
  localStorage.setItem('volynx_refresh_token', 'old-refresh');
  let respond;
  const window = { addEventListener() {}, dispatchEvent() {} };
  const document = { readyState: 'loading', addEventListener() {}, documentElement: { classList: { add() {}, remove() {} } } };
  runInNewContext(source('public/js/vx-token-refresh.js'), {
    window, document, localStorage, setInterval() {}, CustomEvent: class {}, atob,
    fetch: async (url) => url === '/config.json'
      ? { ok: true, json: async () => ({ supabaseUrl: 'https://example.supabase.co', supabaseAnonKey: 'public-test-key' }) }
      : new Promise((resolve) => { respond = resolve; }),
  });
  const refresh = window.vxRefreshToken();
  await tick();
  localStorage.setItem('volynx_access_token', 'new-access');
  localStorage.setItem('volynx_refresh_token', 'new-refresh');
  respond({ ok: true, json: async () => ({ access_token: 'stale-access', refresh_token: 'stale-refresh' }) });
  await refresh;
  assert.equal(localStorage.getItem('volynx_access_token'), 'new-access');
  assert.equal(localStorage.getItem('volynx_refresh_token'), 'new-refresh');
}

async function loginWithSettings(settings) {
  const ids = ['loginForm', 'email', 'password', 'submitBtn', 'msg', 'googleSignInBtn', 'appleSignInBtn', 'passkeySignInBtn', 'loginAlternativesStatus', 'loginAlternatives'];
  const nodes = Object.fromEntries(ids.map((id) => [id, element()]));
  const localStorage = storage();
  const window = {
    location: { origin: 'https://volynx.world', href: 'https://volynx.world/login/' },
    PublicKeyCredential: function PublicKeyCredential() {},
    isSecureContext: true,
    supabase: { createClient: () => ({ auth: { signInWithPasskey() {}, signInWithOAuth() {} } }) },
    VxReturn: { paramPath: () => '', storedPath: () => '', consume() {}, remember() {} },
  };
  const fetch = async (url) => ({
    ok: true,
    json: async () => url === '/config.json'
      ? { supabaseUrl: 'https://example.supabase.co', supabaseAnonKey: 'public-test-key' }
      : settings,
  });
  runInNewContext(stripImport(source('public/scripts/auth-login.js')), {
    window, document: { getElementById: (id) => nodes[id] }, localStorage,
    fetch, persistVolynxSession() {}, passkeyErrorMessage,
  });
  await tick();
  await tick();
  return nodes;
}

{
  const nodes = await loginWithSettings({ external: { google: false, apple: false }, passkeys_enabled: false });
  assert.equal(nodes.loginAlternatives.hidden, true);
  assert.equal(nodes.passkeySignInBtn.disabled, true);
  await nodes.loginForm.dispatch('submit', { preventDefault() {} });
  assert.match(nodes.msg.textContent, /fill in email and password/);
}

{
  const nodes = await loginWithSettings({ external: { google: true, apple: false }, passkeys_enabled: true });
  assert.equal(nodes.loginAlternatives.hidden, false);
  assert.equal(nodes.googleSignInBtn.disabled, false);
  assert.equal(nodes.appleSignInBtn.hidden, true);
  assert.equal(nodes.passkeySignInBtn.disabled, false);
}

{
  const status = element();
  const retry = element();
  let cleaned = '';
  const window = { location: { search: '?error=access_denied', hash: '', pathname: '/auth/oauth/' } };
  runInNewContext(stripImport(source('public/scripts/auth-oauth.js')), {
    window, document: { getElementById: (id) => ({ oauthCallbackStatus: status, oauthCallbackRetry: retry })[id] },
    localStorage: storage(), URLSearchParams,
    history: { replaceState: (_state, _title, path) => { cleaned = path; } },
    persistVolynxSession() {},
  });
  await tick();
  assert.match(status.textContent, /cancelled/);
  assert.equal(retry.hidden, false);
  assert.equal(cleaned, '/auth/oauth/');
}

{
  const status = element();
  const retry = element();
  let persisted = null;
  let destination = '';
  let exchanged = '';
  const window = {
    location: {
      search: '?code=sample-auth-code', hash: '', pathname: '/auth/oauth/',
      replace: (value) => { destination = value; },
    },
    VxReturn: { consume: () => '/checkout/?item=sample' },
    supabase: {
      createClient: () => ({ auth: { exchangeCodeForSession: async (code) => {
        exchanged = code;
        return { data: { session: { access_token: 'access', refresh_token: 'refresh' } }, error: null };
      } } }),
    },
  };
  runInNewContext(stripImport(source('public/scripts/auth-oauth.js')), {
    window, document: { getElementById: (id) => ({ oauthCallbackStatus: status, oauthCallbackRetry: retry })[id] },
    localStorage: storage(), URLSearchParams,
    history: { replaceState() {} },
    fetch: async () => ({ ok: true, json: async () => ({ supabaseUrl: 'https://example.supabase.co', supabaseAnonKey: 'public-test-key' }) }),
    persistVolynxSession: (session) => { persisted = session; },
  });
  await tick();
  await tick();
  assert.equal(exchanged, 'sample-auth-code');
  assert.equal(persisted?.access_token, 'access');
  assert.equal(destination, '/checkout/?item=sample');
}

{
  const ids = ['passkeySettings', 'registerPasskeyBtn', 'registerPasskeyStatus', 'passkeyList'];
  const nodes = Object.fromEntries(ids.map((id) => [id, element()]));
  const localStorage = storage();
  localStorage.setItem('volynx_access_token', 'access');
  localStorage.setItem('volynx_refresh_token', 'refresh');
  let saved = [];
  let registrations = 0;
  let removals = 0;
  const session = { access_token: 'access', refresh_token: 'refresh' };
  const client = { auth: {
    setSession: async () => ({ data: { session }, error: null }),
    getUser: async () => ({ data: { user: { id: 'user-1' } }, error: null }),
    getSession: async () => ({ data: { session }, error: null }),
    registerPasskey: async () => {
      registrations++;
      saved = [{ id: 'passkey-1', friendly_name: 'My laptop' }];
      return { data: saved[0], error: null };
    },
    passkey: {
      list: async () => ({ data: saved, error: null }),
      delete: async ({ passkeyId }) => {
        assert.equal(passkeyId, 'passkey-1');
        removals++;
        saved = [];
        return { data: null, error: null };
      },
    },
  } };
  const window = {
    isSecureContext: true,
    PublicKeyCredential: function PublicKeyCredential() {},
    VxProfileAuthClient: client,
    confirm: () => true,
  };
  runInNewContext(stripImport(source('public/scripts/vx-passkey-profile.js')), {
    window, localStorage,
    document: { getElementById: (id) => nodes[id], createElement: () => element() },
    fetch: async (url) => ({ ok: true, json: async () => url === '/config.json'
      ? { supabaseUrl: 'https://example.supabase.co', supabaseAnonKey: 'public-test-key' }
      : { passkeys_enabled: true } }),
    persistVolynxSession() {}, passkeyErrorMessage,
  });
  await tick();
  await tick();
  assert.equal(nodes.passkeySettings.hidden, false);
  assert.equal(nodes.registerPasskeyBtn.disabled, false);
  await nodes.registerPasskeyBtn.dispatch('click');
  assert.equal(registrations, 1);
  assert.equal(nodes.passkeyList.children[0].children[0].textContent, 'My laptop');
  await nodes.passkeyList.children[0].children[1].dispatch('click');
  assert.equal(removals, 1);
  assert.match(nodes.registerPasskeyStatus.textContent, /removed/);
}

assert.match(passkeyErrorMessage({ code: 'ERROR_CEREMONY_ABORTED' }, 'pt-BR'), /cancelada/);
assert.match(passkeyErrorMessage({ code: 'ERROR_INVALID_RP_ID' }, 'en'), /not configured/);

console.log('PASS: session persistence/clear, login gating, form validation, OAuth callback, passkey registration/list/removal.');
