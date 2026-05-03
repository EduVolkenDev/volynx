import { chromium } from 'playwright';

const BASE = 'http://localhost:4321';
const browser = await chromium.launch();

async function probe(url) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const fails = [];
  page.on('response', r => {
    if (r.status() >= 400) fails.push({status:r.status(), url:r.url()});
  });
  page.on('requestfailed', r => fails.push({status:'failed', url:r.url(), err: r.failure()?.errorText}));
  await page.goto(url, { waitUntil: 'networkidle' });
  console.log('\n=== ' + url + ' ===');
  for (const f of fails) console.log(f.status, f.url, f.err||'');
  await ctx.close();
}

await probe(BASE + '/pricing/');
await probe(BASE + '/products/portfolio-pro-kit/');
await probe(BASE + '/products/');
await probe(BASE + '/');
await probe(BASE + '/services/');
await browser.close();
