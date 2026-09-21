import test from 'node:test';
import assert from 'node:assert/strict';
import { routePublishedPropertyFlow } from './publisher-route.mjs';

const env = { SUPABASE_URL: 'https://example.supabase.co', SUPABASE_ANON_KEY: 'public-key' };
const published = { id: 'test', status: 'published', subdomain: 'propertyflow-jp', domain: null };
const request = (path = '/', init) => new Request(`https://propertyflow-jp.volynx.world${path}`, init);
const resolver = (rows) => new Response(JSON.stringify(rows));

for (const host of ['api', 'www', 'daily', 'cvitae', 'builder', 'qr']) {
  test(`does not intercept platform ${host}`, async () => {
    assert.equal(await routePublishedPropertyFlow(new Request(`https://${host}.volynx.world/`), env,
      () => assert.fail('platform must not resolve')), null);
  });
}
test('does not intercept non-tenant hosts or writes', async () => {
  for (const req of [new Request('https://example.com/'), request('/', { method: 'POST' })]) {
    assert.equal(await routePublishedPropertyFlow(req, env, () => assert.fail()), null);
  }
});
test('unknown, draft and other tenants never render', async () => {
  for (const rows of [[], [{ ...published, status: 'draft' }], [{ ...published, subdomain: 'other' }]]) {
    assert.equal(await routePublishedPropertyFlow(request(), env, async () => resolver(rows)), null);
  }
});
test('published tenant gets real renderer without forwarding credentials', async () => {
  const calls = [];
  const response = await routePublishedPropertyFlow(request('/', { headers: { cookie: 'private', authorization: 'secret' } }), env, async (url, options) => {
    calls.push([String(url), options]);
    return calls.length === 1 ? resolver([published]) : new Response('<main>catalogue</main>', { headers: { 'content-type': 'text/html', 'set-cookie': 'private' } });
  });
  assert.equal(calls[0][1].headers.apikey, 'public-key');
  assert.deepEqual(JSON.parse(calls[0][1].body), { p_host: 'propertyflow-jp.volynx.world' });
  assert.equal(calls[1][0], 'https://volynx.pages.dev/propertyflow/site/');
  assert.equal(calls[1][1].headers.get('cookie'), null);
  assert.equal(calls[1][1].headers.get('authorization'), null);
  assert.equal(response.headers.get('set-cookie'), null);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(response.headers.get('x-volynx-propertyflow-route'), 'publisher');
  assert.equal(await response.text(), '<main>catalogue</main>');
});
test('scripts, styles and images use their asset paths', async () => {
  for (const path of ['/config.json', '/_astro/site.js', '/js/i18n.js', '/assets/photo.webp', '/favicons/favicon.svg']) {
    let calls = 0;
    await routePublishedPropertyFlow(request(path), env, async (url) => {
      if (++calls === 1) return resolver([published]);
      assert.equal(String(url), `https://volynx.pages.dev${path}`);
      return new Response('asset');
    });
  }
});
test('privacy and product links use the canonical platform domain', async () => {
  const response = await routePublishedPropertyFlow(request('/privacy/'), env, async () => resolver([published]));
  assert.equal(response.status, 302);
  assert.equal(response.headers.get('location'), 'https://volynx.world/privacy/');
});
test('unrelated platform pages are not proxied into tenant sites', async () => {
  const response = await routePublishedPropertyFlow(request('/dashboard/'), env, async () => resolver([published]));
  assert.equal(response.status, 404);
});
test('HEAD has no body', async () => {
  let calls = 0;
  const response = await routePublishedPropertyFlow(request('/', { method: 'HEAD' }), env,
    async () => ++calls === 1 ? resolver([published]) : new Response('ignored'));
  assert.equal(await response.text(), '');
});
test('resolver failures are not mistaken for unpublished sites', async () => {
  for (const fetcher of [async () => new Response('error', { status: 500 }), async () => { throw new Error('offline'); }]) {
    const response = await routePublishedPropertyFlow(request(), env, fetcher);
    assert.equal(response.status, 503);
    assert.equal(response.headers.get('cache-control'), 'no-store');
  }
});
