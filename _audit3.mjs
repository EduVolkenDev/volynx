import { chromium } from 'playwright';

const browser = await chromium.launch();

// Pricing PT mobile — capture addons section specifically
async function shotElement(url, lang, vp, selector, outPath) {
  const ctx = await browser.newContext({ viewport: vp });
  await ctx.addInitScript((l) => { try{localStorage.setItem('volynx_lang',l);}catch(e){} }, lang);
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
  const el = await page.$(selector);
  if (!el) { console.log('NOT FOUND', selector, url); await ctx.close(); return; }
  await el.scrollIntoViewIfNeeded();
  await page.waitForTimeout(200);
  await el.screenshot({ path: outPath });
  console.log('OK', outPath);
  await ctx.close();
}

const BASE = 'http://localhost:4321';
const VP_DESK = { width: 1440, height: 900 };
const VP_TAB  = { width: 768, height: 1024 };
const VP_MOB  = { width: 375, height: 812 };

// Addons section on pricing
await shotElement(BASE + '/pricing/', 'pt', VP_MOB,
  'section:has(.addon-card)', '/tmp/vx-audit-2026-05-03/CROP-pricing-addons-pt-mobile.png');
await shotElement(BASE + '/pricing/', 'en', VP_MOB,
  'section:has(.addon-card)', '/tmp/vx-audit-2026-05-03/CROP-pricing-addons-en-mobile.png');
await shotElement(BASE + '/pricing/', 'pt', VP_DESK,
  'section:has(.addon-card)', '/tmp/vx-audit-2026-05-03/CROP-pricing-addons-pt-desktop.png');

// Pricing card price block on tablet
await shotElement(BASE + '/pricing/', 'en', VP_TAB,
  '#builder', '/tmp/vx-audit-2026-05-03/CROP-pricing-builder-en-tablet.png');
await shotElement(BASE + '/pricing/', 'pt', VP_TAB,
  '#builder', '/tmp/vx-audit-2026-05-03/CROP-pricing-builder-pt-tablet.png');

// Recarregar EN — should be fully EN but isn't
await shotElement(BASE + '/recarregar/', 'en', VP_DESK,
  'main', '/tmp/vx-audit-2026-05-03/CROP-recarregar-en-desktop.png');
await shotElement(BASE + '/recarregar/?lang=en', 'en', VP_DESK,
  'main', '/tmp/vx-audit-2026-05-03/CROP-recarregar-en-querystring-desktop.png');

// Services tablet PT - overflow
await shotElement(BASE + '/services/', 'pt', VP_TAB,
  'main', '/tmp/vx-audit-2026-05-03/CROP-services-pt-tablet.png');

// Signup PT mobile — show the "Sign in" CTA in header
await shotElement(BASE + '/signup/', 'pt', VP_MOB,
  'header', '/tmp/vx-audit-2026-05-03/CROP-signup-pt-mobile-header.png');

// Lab image-suite plan-sim banners
const planContexts = [
  ['studio', 'CROP-imagesuite-studio.png'],
  ['launch', 'CROP-imagesuite-launch.png'],
  ['free',   'CROP-imagesuite-free.png'],
];
for (const [plan, out] of planContexts) {
  const ctx = await browser.newContext({ viewport: VP_DESK });
  await ctx.addInitScript((p) => {
    try{
      localStorage.setItem('volynx_lang','en');
      localStorage.setItem('volynx_plan_cache', JSON.stringify({plan:p, ts:Date.now()}));
    }catch(e){}
  }, plan);
  const page = await ctx.newPage();
  await page.goto(BASE + '/volynx-lab/image-suite/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  await page.screenshot({ path: '/tmp/vx-audit-2026-05-03/' + out, fullPage: false });
  console.log('OK plansim', plan);
  await ctx.close();
}

await browser.close();
