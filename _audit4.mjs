import { chromium } from 'playwright';
const browser = await chromium.launch();

async function shot(url, lang, vp, sels, prefix) {
  const ctx = await browser.newContext({ viewport: vp });
  await ctx.addInitScript((l) => { try{localStorage.setItem('volynx_lang',l);}catch(e){} }, lang);
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
  for (const sel of sels) {
    const el = await page.$(sel);
    if (!el) { console.log('NF', sel); continue; }
    await el.scrollIntoViewIfNeeded();
    await page.waitForTimeout(150);
    const safe = sel.replace(/[^a-z0-9]/gi,'_').slice(0,40);
    await el.screenshot({ path: `/tmp/vx-audit-2026-05-03/${prefix}_${safe}.png` });
    console.log('OK', prefix, safe);
  }
  await ctx.close();
}

const BASE = 'http://localhost:4321';
const VP_DESK = { width: 1440, height: 900 };
const VP_MOB  = { width: 375, height: 812 };

// Home — sections
await shot(BASE + '/', 'pt', VP_DESK,
  ['.hero-v2', 'section:nth-of-type(2)', 'section:nth-of-type(3)', 'footer'],
  'home_pt_d');
await shot(BASE + '/', 'pt', VP_MOB,
  ['header', '.hero-v2'],
  'home_pt_m');

// Pricing PT desktop — capture pricing cards & addons separately
await shot(BASE + '/pricing/', 'pt', VP_DESK,
  ['.grid-3', '.pricing-card:first-of-type'],
  'pricing_pt_d');

// Login page EN/PT
await shot(BASE + '/login/', 'pt', VP_MOB, ['main'], 'login_pt_m');
await shot(BASE + '/login/', 'pt', VP_DESK, ['main'], 'login_pt_d');

// Products listing
await shot(BASE + '/products/', 'pt', VP_DESK, ['main'], 'products_pt_d');
await shot(BASE + '/products/', 'pt', VP_MOB, ['main'], 'products_pt_m');

// Kit detail
await shot(BASE + '/products/portfolio-pro-kit/', 'pt', VP_DESK, ['main', 'header'], 'kit_pt_d');

// Lab landing
await shot(BASE + '/volynx-lab/', 'pt', VP_DESK, ['main'], 'lab_pt_d');

// Services landing
await shot(BASE + '/services/', 'pt', VP_DESK, ['main'], 'svc_pt_d');
await shot(BASE + '/services/', 'pt', VP_MOB, ['main'], 'svc_pt_m');

await browser.close();
