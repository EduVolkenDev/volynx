import assert from 'node:assert/strict';
import test from 'node:test';
import { buildConversionPreview, submitConversionPreview, conversionPreviewMailto } from '../src/lib/conversion-preview.js';

const input = {
  name: 'Preview QA', email: 'preview@example.com', siteUrl: 'https://example.com/',
  goal: 'Help visitors request a consultation.', locale: 'en',
};
const response = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

test('the site URL reaches the brief, never the honeypot field', () => {
  const payload = buildConversionPreview(input);
  assert.equal(payload.website, '');
  assert.match(payload.brief, /Website URL: https:\/\/example.com\//);
  assert.match(payload.brief, /Business goal: Help visitors/);
  assert.equal(payload.project_type, 'conversion-fix');
  assert.throws(() => buildConversionPreview({ ...input, siteUrl: 'javascript:alert(1)' }));
});

test('submission uses the existing contact contract and requires confirmation', async () => {
  const requests = [];
  const fetchImpl = async (url, options) => {
    requests.push({ url, options });
    return requests.length === 1 ? response({ functionsUrl: 'https://api.example.com/' }) : response({ ok: true });
  };
  assert.deepEqual(await submitConversionPreview(input, { fetchImpl }), { ok: true });
  assert.equal(requests[1].url, 'https://api.example.com/contact-form');
  assert.equal(requests[1].options.method, 'POST');
  assert.equal(JSON.parse(requests[1].options.body).website, '');
});

test('unconfirmed and failed responses never count as success', async () => {
  for (const result of [response({ ok: false }), response({ error: 'failed' }, 500), new Response('invalid JSON')]) {
    let calls = 0;
    await assert.rejects(submitConversionPreview(input, {
      fetchImpl: async () => ++calls === 1 ? response({ apiBaseUrl: 'https://api.example.com' }) : result,
    }));
  }
});

test('missing configuration makes no submission request', async () => {
  let calls = 0;
  await assert.rejects(submitConversionPreview(input, { fetchImpl: async () => { calls++; return response({}); } }));
  assert.equal(calls, 1);
});

test('request timeout interrupts an unavailable endpoint', async () => {
  await assert.rejects(submitConversionPreview(input, {
    timeoutMs: 10,
    fetchImpl: (_url, { signal }) => new Promise((_resolve, reject) => {
      signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
    }),
  }), /aborted/);
});

test('email fallback keeps the brief and escapes query separators', () => {
  const link = new URL(conversionPreviewMailto({ ...input, goal: 'Bookings & enquiries? Yes.' }));
  assert.equal(link.pathname, 'hello@volynx.world');
  assert.match(link.searchParams.get('body'), /Bookings & enquiries\? Yes\./);
  assert.equal(link.searchParams.size, 2);
});
