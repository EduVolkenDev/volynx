import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const OUT = '/tmp/vx-audit-2026-05-03';
const BASE = 'http://localhost:4321';

const PAGES = [
  { slug: 'home',         url: '/' },
  { slug: 'pricing',      url: '/pricing/' },
  { slug: 'products',     url: '/products/' },
  { slug: 'kit-portfolio',url: '/products/portfolio-pro-kit/' },
  { slug: 'services',     url: '/services/' },
  { slug: 'lab',          url: '/volynx-lab/' },
  { slug: 'lab-image-suite',url: '/volynx-lab/image-suite/' },
  { slug: 'login',        url: '/login/' },
  { slug: 'signup',       url: '/signup/' },
  { slug: 'delivery',     url: '/delivery/' },
  { slug: 'recarregar',   url: '/recarregar/' },
];

const VIEWPORTS = [
  { name: 'mobile',  width: 375,  height: 812 },
  { name: 'tablet',  width: 768,  height: 1024 },
  { name: 'desktop', width: 1440, height: 900 },
];

const LANGS = ['en', 'pt'];

const findings = [];

function log(msg) {
  console.log(msg);
}

async function captureConsole(page, slug, viewport, lang) {
  const errs = [];
  page.on('console', m => {
    if (m.type() === 'error') errs.push(m.text());
  });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('requestfailed', r => {
    const u = r.url();
    if (!u.startsWith('http://localhost') && !u.includes('volynx.world')) return;
    if (u.includes('config.json')) return; // not on dev
    errs.push('requestfailed: ' + u + ' [' + r.failure()?.errorText + ']');
  });
  return errs;
}

async function detectLeftoverLang(page, expectLang) {
  // Pick text from main visible regions; check naive heuristics for stray locale words
  const data = await page.evaluate(() => {
    const visibleText = [];
    const els = document.querySelectorAll('h1,h2,h3,h4,p,span,a,button,li,small,strong,em,div[data-i18n]');
    for (const el of els) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.display === 'none' || parseFloat(cs.opacity) === 0) continue;
      const t = (el.innerText || '').trim();
      if (!t || t.length > 250) continue;
      visibleText.push({ tag: el.tagName.toLowerCase(), text: t, hasI18n: el.hasAttribute('data-i18n'), key: el.getAttribute('data-i18n') });
    }
    // Also collect missing keys: any data-i18n element whose textContent equals the key fallback
    const missingKeys = [];
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const t = (el.textContent || '').trim();
      // Heuristic: textContent equals the key itself = i18n didn't translate
      if (t === key && key.includes('.')) missingKeys.push(key);
    });
    return { visibleText, missingKeys };
  });

  // English-only words that should NEVER appear in PT (heuristic - case insensitive whole-word match)
  // Avoid brand names: Volynx, PropertyFlow, Builder, CVitae, Daily
  // Avoid technical: tokens (in "design tokens"), VX, OS, AI, JS, CSS
  const enWordRegex = /(\bGet (started|the)\b|\bSign up\b|\bSign in\b|\bLog in\b|\bLog out\b|\bLearn more\b|\bRead more\b|\bSee all\b|\bView all\b|\bHow it works\b|\bWhy choose\b|\bGet in touch\b|\bComing soon\b|\bAlready (a member|have)\b|\bUpgrade now\b|\bBuy now\b|\bTry now\b|\bExplore (all|the|now)\b|\bTrusted by\b|\bFree trial\b|\bFor everyone\b|\bFor (developers|designers|founders|teams|business)\b|\bDownload\b|\bShop\b|\bStart for free\b|\bWelcome back\b|\bForgot password\b|\bRemember me\b|\bMost popular\b|\bBest value\b)/i;
  // PT words that shouldn't appear in EN
  const ptWordRegex = /(\bComeçar\b|\bEntrar\b|\bSair\b|\bCadastr(o|ar|e-se)\b|\bRecarregar\b|\bSaiba mais\b|\bVeja (mais|todos)\b|\bComo funciona\b|\bPor que\b|\bExplorar\b|\bComprar\b|\bDescobrir\b|\bGratuito\b|\bExperimentar\b|\bAssinar\b|\bConectar\b|\bMais popular\b|\bMelhor valor\b|\bEm breve\b|\bBem-vindo\b|\bEsqueci\b|\bLembrar\b)/i;

  const stray = [];
  for (const {tag,text,hasI18n,key} of data.visibleText) {
    if (expectLang === 'pt') {
      const m = enWordRegex.exec(text);
      if (m) stray.push({tag, key, match: m[0], snippet: text.slice(0,140)});
    } else {
      const m = ptWordRegex.exec(text);
      if (m) stray.push({tag, key, match: m[0], snippet: text.slice(0,140)});
    }
  }
  return { stray, missingKeys: data.missingKeys };
}

async function detectOverflow(page) {
  return page.evaluate(() => {
    const docW = document.documentElement.clientWidth;
    const out = [];
    document.querySelectorAll('*').forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.right > docW + 1) {
        const cs = getComputedStyle(el);
        if (cs.position === 'fixed') return;
        out.push({tag: el.tagName, cls: el.className?.toString().slice(0,80) || '', right: Math.round(r.right), id: el.id || ''});
      }
    });
    const bodyOverflowX = document.documentElement.scrollWidth - document.documentElement.clientWidth;
    return { items: out.slice(0, 10), bodyScrollDelta: bodyOverflowX };
  });
}

async function run() {
  await fs.mkdir(OUT, { recursive: true });
  const browser = await chromium.launch();

  for (const vp of VIEWPORTS) {
    for (const lang of LANGS) {
      const ctx = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        deviceScaleFactor: 1,
      });
      // Set localStorage early
      await ctx.addInitScript((lng) => {
        try { localStorage.setItem('volynx_lang', lng); } catch(e) {}
      }, lang);

      for (const p of PAGES) {
        const page = await ctx.newPage();
        const errs = await captureConsole(page, p.slug, vp.name, lang);
        const url = BASE + p.url;
        try {
          const resp = await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
          const status = resp ? resp.status() : 0;
          // Wait a hair for i18n to apply
          await page.waitForTimeout(500);
          // Verify lang setting actually applied
          const appliedLang = await page.evaluate(() => localStorage.getItem('volynx_lang'));
          // For lab tools we redirect to login, capture that too
          const finalUrl = page.url();
          const screenshot = path.join(OUT, `${p.slug}-${vp.name}-${lang}.png`);
          await page.screenshot({ path: screenshot, fullPage: true });
          const { stray, missingKeys } = await detectLeftoverLang(page, lang);
          const overflow = await detectOverflow(page);
          findings.push({
            page: p.slug, viewport: vp.name, lang,
            status, finalUrl,
            screenshot,
            stray, missingKeys,
            overflow,
            errors: errs.slice()
          });
          log(`[${vp.name}/${lang}] ${p.slug} → ${status} (final: ${finalUrl.replace(BASE,'')}) stray=${stray.length} missingI18n=${missingKeys.length} overflow=${overflow.items.length} consoleErr=${errs.length}`);
        } catch (e) {
          findings.push({ page: p.slug, viewport: vp.name, lang, error: e.message });
          log(`[${vp.name}/${lang}] ${p.slug} ERROR: ${e.message}`);
        }
        await page.close();
      }
      await ctx.close();
    }
  }

  // Plan-gating: simulate Studio cache for image-suite (logged-out + cached studio)
  for (const planSim of ['studio', 'launch', 'free']) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await ctx.addInitScript((plan) => {
      try {
        localStorage.setItem('volynx_lang', 'en');
        localStorage.setItem('volynx_plan_cache', JSON.stringify({plan, ts: Date.now()}));
      } catch(e){}
    }, planSim);
    const page = await ctx.newPage();
    const errs = await captureConsole(page);
    try {
      const resp = await page.goto(BASE + '/volynx-lab/image-suite/', { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(800);
      const ss = path.join(OUT, `lab-image-suite-plansim-${planSim}.png`);
      await page.screenshot({ path: ss, fullPage: true });
      const finalUrl = page.url();
      const banner = await page.evaluate(() => {
        const b = document.getElementById('LabUpgradeBanner') || document.querySelector('[data-lab-banner]') || document.querySelector('.lab-upgrade-banner');
        if (!b) return { found: false };
        const r = b.getBoundingClientRect();
        const cs = getComputedStyle(b);
        return { found: true, visible: r.width>0&&r.height>0&&cs.display!=='none'&&cs.visibility!=='hidden', text: (b.innerText||'').slice(0,120) };
      });
      findings.push({ page: 'image-suite-plansim', lang: 'en', plan: planSim, finalUrl, screenshot: ss, banner, errors: errs });
      log(`[plansim ${planSim}] image-suite → final ${finalUrl.replace(BASE,'')} banner=${JSON.stringify(banner)}`);
    } catch(e){
      log(`[plansim ${planSim}] ERROR: ${e.message}`);
    }
    await ctx.close();
  }

  await browser.close();
  await fs.writeFile(path.join(OUT, 'results.json'), JSON.stringify(findings, null, 2));
  log('\n=== Wrote results.json ===');
}

run().catch(e => { console.error(e); process.exit(1); });
