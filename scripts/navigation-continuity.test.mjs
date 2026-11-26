import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const source = readFileSync(new URL('../public/js/vx-return.js', import.meta.url), 'utf8');
function setup(path = '/login/', search = '', saved = '', hash = '') {
  const values = new Map(saved ? [['volynx_post_login_next', saved]] : []);
  const window = { location: { origin: 'https://volynx.world', pathname: path, search, hash, replace(url) { this.redirected = url; } } };
  const document = { currentScript: { dataset: {} }, readyState: 'loading', addEventListener() {} };
  runInNewContext(source, { window, document, URL, URLSearchParams, localStorage: { getItem: k => values.get(k), setItem: (k,v) => values.set(k,v), removeItem: k => values.delete(k) } });
  return { api: window.VxReturn, window, values };
}
test('return preserves product, query and hash, consuming storage once', () => {
  const target = '/delivery/?payment=success#kits';
  const { api, values } = setup('/login/', '?next=' + encodeURIComponent(target));
  assert.equal(api.consume(), target);
  assert.equal(values.has('volynx_post_login_next'), false);
});
test('rejects authentication destinations, aliases and unsafe paths', () => {
  for (const target of ['/login', '/login/?next=/signup/', '/signup#form', '/logout/', '/recover/', '/auth/recover/', '/%6cogin/', '/editor/../login/', '//evil.test/', '/\\evil.test/', 'https://evil.test/', '/\n/evil.test/']) {
    const { api } = setup('/login/', '?next=' + encodeURIComponent(target), target);
    assert.equal(api.safePath(target), '', target);
    assert.equal(api.consume(), '/volynx-lab/', target);
  }
});
test('login, signup and recovery carry the same destination', () => {
  const target = '/redeem/?code=EXAMPLE#confirm';
  const { api } = setup('/login/', '?next=' + encodeURIComponent(target));
  for (const url of [api.loginUrl(), api.signupUrl(), api.recoverUrl()]) assert.equal(new URL(url, 'https://volynx.world').searchParams.get('next'), target);
});
test('auth links keep unrelated query parameters and protect against auth loops', () => {
  const { api } = setup('/editor/', '?template=executive', '', '#preview');
  const attrs = { href: '/signup/?confirmed=1&next=/login/' };
  api.decorateAuthLinks({ querySelectorAll: () => [{ getAttribute: k => attrs[k], setAttribute: (k,v) => attrs[k] = v }] });
  const url = new URL(attrs.href, 'https://volynx.world');
  assert.equal(url.searchParams.get('confirmed'), '1');
  assert.equal(url.searchParams.get('next'), '/editor/?template=executive#preview');
});
test('legacy recovery email is forwarded without putting credentials into storage', () => {
  const { window, values } = setup('/login/', '?next=%2Fredeem%2F', '', '#type=recovery&access_token=demo&refresh_token=demo');
  assert.match(window.location.redirected, /^\/auth\/recover\/\?next=%2Fredeem%2F#type=recovery/);
  assert.equal([...values.values()].some(v => v.includes('access_token')), false);
});
test('shared flow implementations are identical across product repositories', () => {
  for (const file of ['vx-return.js', 'vx-auth-bridge.js', 'auth-recovery.js', 'auth-confirmation.js']) {
    const canonical = readFileSync(new URL('../public/js/' + file, import.meta.url), 'utf8');
    for (const root of ['volynx-daily-os', 'cvitae']) assert.equal(readFileSync(new URL('../../' + root + '/public/js/' + file, import.meta.url), 'utf8'), canonical, root + '/' + file);
  }
});
