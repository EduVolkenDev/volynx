// Local previews only. All Supabase traffic is intercepted; never uses real accounts.
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const apps = [
  { origin: process.env.VOLYNX_TEST_ORIGIN || 'http://127.0.0.1:4340', recover: '/auth/recover/', target: '/delivery/?payment=success#kits', main: true },
  { origin: process.env.DAILY_TEST_ORIGIN || 'http://127.0.0.1:4341', recover: '/recover/', target: '/redeem/?code=EXAMPLE#confirm' },
  { origin: process.env.CVITAE_TEST_ORIGIN || 'http://127.0.0.1:4342', recover: '/recover/', target: '/editor/?template=executive#preview' },
];
const user = { id: '11111111-1111-4111-8111-111111111111', email: 'audit@example.invalid' };
const token = 'test.' + Buffer.from(JSON.stringify({ sub: user.id, exp: Math.floor(Date.now()/1000)+3600 })).toString('base64url') + '.test';
const session = { access_token: token, refresh_token: 'local-fixture', user };
const browser = await chromium.launch({ headless: true });
let passed = 0;
try {
  for (const app of apps) {
    const ctx = await browser.newContext();
    const writes = [];
    let expired = false, rejectPassword = false, rateLimited = false;
    await ctx.route('**/*.supabase.co/**', async route => {
      const req = route.request(); const url = new URL(req.url());
      if (req.method() !== 'GET' && req.method() !== 'OPTIONS') writes.push({ path: url.pathname, url: req.url(), body: req.postDataJSON() });
      let status = 200, data = {};
      if (url.pathname.endsWith('/settings')) data = { external: {} };
      else if (url.pathname.endsWith('/user')) { data = user; if (expired) status = 401; else if (req.method()==='PUT' && rejectPassword) status = 422; }
      else if (url.pathname.endsWith('/verify') || url.pathname.endsWith('/token') || url.pathname.endsWith('/signup')) data = session;
      else if (url.pathname.endsWith('/recover') && rateLimited) status = 429;
      else if (url.pathname.includes('/rest/v1/')) data = [];
      await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) });
    });
    const page = await ctx.newPage();
    const login = '/login/?next=' + encodeURIComponent(app.target);
    await page.goto(app.origin + login);
    await page.waitForLoadState('load');
    for (const selector of ['#vxCookieReject', '#cookieAccept']) {
      const consent = page.locator(selector);
      if (await consent.isVisible()) await consent.click();
    }
    const signup = await page.locator('a[href^="/signup/"]').last().getAttribute('href');
    assert.equal(new URL(signup, app.origin).searchParams.get('next'), app.target);
    const recovery = await page.locator('a[href^="' + app.recover + '"]').first().getAttribute('href');
    assert.equal(new URL(recovery, app.origin).searchParams.get('next'), app.target);
    await page.goto(app.origin + signup);
    assert.equal(new URL(await page.locator('a[href^="/login/"]').last().getAttribute('href'), app.origin).searchParams.get('next'), app.target);
    passed++;
    await page.goto(app.origin + recovery);
    await page.locator('#email').fill(user.email);
    await page.locator('#submitBtn').click();
    await page.locator('#sentState').waitFor({ state: 'visible' });
    const request = writes.find(x => x.path.endsWith('/recover'));
    const callback = new URL(new URL(request.url).searchParams.get('redirect_to'));
    assert.equal(callback.pathname, app.recover);
    assert.equal(callback.searchParams.get('next'), app.target);
    passed++;
    await page.goto(app.origin + app.recover + '?next=' + encodeURIComponent(app.target) + '#type=recovery&access_token=' + token + '&refresh_token=local-fixture');
    await page.locator('#passwordResetForm').waitFor({ state: 'visible' });
    assert.equal(new URL(page.url()).hash, '');
    assert.equal(await page.evaluate(() => localStorage.getItem('volynx_access_token')), null);
    await page.locator('#newPassword').fill('example-password-2026');
    await page.locator('#confirmPassword').fill('different-password-2026');
    await page.locator('#savePasswordBtn').click();
    assert.equal(writes.filter(x => x.path.endsWith('/user')).length, 0);
    await page.locator('#confirmPassword').fill('example-password-2026');
    rejectPassword = true;
    await page.locator('#savePasswordBtn').click();
    await page.locator('#resetStatus[data-error="true"]').waitFor();
    await page.waitForFunction(() => !document.getElementById('savePasswordBtn').disabled);
    assert.equal(await page.locator('#passwordResetForm').isVisible(), true);
    rejectPassword = false;
    await page.locator('#savePasswordBtn').click();
    await page.locator('#resetContinue').waitFor({ state: 'visible' });
    assert.equal(await page.locator('#resetContinue').getAttribute('href'), app.target);
    assert.equal(await page.locator('#newPassword').inputValue(), '');
    assert.equal(await page.evaluate(() => !!localStorage.getItem('volynx_access_token')), true);
    passed++;
    await ctx.clearCookies();
    await page.evaluate(() => localStorage.clear());
    expired = true;
    await page.goto(app.origin + app.recover + '#type=recovery&access_token=expired&refresh_token=expired');
    await page.locator('#resetRetry').waitFor({ state: 'visible' });
    assert.equal(await page.locator('#passwordResetForm').isVisible(), false);
    await page.locator('#resetRetry').click();
    assert.equal(await page.locator('#recoverForm').isVisible(), true);
    passed++;
    expired = false;
    await page.goto(app.origin + app.recover + '?type=recovery&token_hash=fixture&next=' + encodeURIComponent(app.target));
    await page.locator('#passwordResetForm').waitFor({ state: 'visible' });
    assert.equal(new URL(page.url()).searchParams.has('token_hash'), false);
    passed++;
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.screenshot({ path: '/tmp/volynx-reset-' + new URL(app.origin).port + '.png' });
    if (!app.main) {
      await ctx.clearCookies();
      await page.evaluate(() => localStorage.clear());
      await page.goto(app.origin + '/signup/?next=' + encodeURIComponent(app.target));
      await page.locator('#fullname').fill('Audit Fixture');
      await page.locator('#username').fill('audit_fixture');
      await page.locator('#email').fill(user.email);
      await page.locator('#password').fill('fixture-password');
      await page.locator('#submitBtn').click();
      await page.waitForURL(app.origin + app.target);
      passed++;
      await ctx.clearCookies();
      await page.evaluate(() => localStorage.clear());
      await page.goto(app.origin + login + '#type=signup&access_token=' + token + '&refresh_token=local-fixture');
      await page.waitForURL(app.origin + app.target);
      assert.equal(new URL(page.url()).hash, new URL(app.origin + app.target).hash);
      passed++;
      await page.goto(app.origin + login);
      await page.locator('#email').fill(user.email);
      await page.locator('#password').fill('fixture-password');
      await page.locator('#submitBtn').click();
      await page.waitForURL(app.origin + app.target);
      passed++;
    }
    if (app.main) {
      await page.goto(app.origin + '/auth/reset/?next=' + encodeURIComponent(app.target) + '#type=recovery&access_token=' + token + '&refresh_token=local-fixture');
      await page.locator('#passwordResetForm').waitFor({ state: 'visible' });
      assert.equal(new URL(page.url()).pathname, app.recover);
      passed++;
      await ctx.clearCookies();
      await page.evaluate(() => localStorage.clear());
      await page.goto(app.origin + '/auth/confirm/?next=' + encodeURIComponent(app.target) + '#type=signup&access_token=' + token + '&refresh_token=local-fixture');
      await page.waitForURL(app.origin + app.target);
      passed++;
      await ctx.clearCookies();
      await page.evaluate(() => localStorage.clear());
      await page.goto(app.origin + '/recarregar/?product=cvitae&intent=template&template=executive#purchase');
      if (await page.locator('#vxCookieReject').isVisible()) await page.locator('#vxCookieReject').click();
      await page.locator('[data-buy-card]').first().click();
      await page.waitForURL('**/login/**');
      const next = new URL(new URL(page.url()).searchParams.get('next'), app.origin);
      assert.equal(next.searchParams.get('template'), 'executive');
      assert.equal(next.searchParams.get('intent'), 'template');
      assert.equal(next.hash, '#purchase');
      passed++;
      await page.goto(app.origin + '/volynx-lab/image-suite/?tool=compress#workspace');
      await page.waitForLoadState('load');
      const labNext = new URL(await page.locator('[data-lab-signin]').getAttribute('href'), app.origin).searchParams.get('next');
      assert.equal(labNext, '/volynx-lab/image-suite/?tool=compress#workspace');
      passed++;
    }
    await ctx.close();
    console.log('PASS local flow:', app.origin);
  }
  console.log('PASS:', passed, 'browser scenarios; no real authentication writes.');
} finally { await browser.close(); }
