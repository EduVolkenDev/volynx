import { test } from 'playwright/test';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const base = 'https://volynx.world';
const outDir = '/Users/eduardovolken_1/VOLYNX/ui-audit';

const pages = [
  ['home', '/'],
  ['pricing', '/pricing/'],
  ['recarregar', '/recarregar/'],
  ['login', '/login/'],
  ['signup', '/signup/'],
  ['account', '/account/'],
  ['profile', '/profile/'],
  ['builder', '/builder/'],
  ['lab', '/volynx-lab/'],
  ['image-suite', '/volynx-lab/image-suite/'],
  ['products', '/products/'],
  ['propertyflow', '/products/propertyflow/'],
  ['icons-store', '/products/volynx-icons-store/'],
  ['services', '/services/'],
  ['contact', '/contact/'],
];

const viewports = [
  ['mobile', { width: 390, height: 844, isMobile: true }],
  ['tablet', { width: 768, height: 1024, isMobile: true }],
  ['desktop', { width: 1440, height: 900 }],
];

const report = [];

function clean(value) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, 140);
}

for (const [pageName, path] of pages) {
  for (const [viewportName, viewport] of viewports) {
    test(`${pageName} ${viewportName}`, async ({ browser }) => {
      const context = await browser.newContext({ viewport, deviceScaleFactor: 1, isMobile: !!viewport.isMobile });
      const page = await context.newPage();
      const consoleMessages = [];
      const pageErrors = [];

      page.on('console', (msg) => {
        if (['error', 'warning'].includes(msg.type())) {
          consoleMessages.push({ type: msg.type(), text: clean(msg.text()) });
        }
      });
      page.on('pageerror', (err) => pageErrors.push(clean(err.message)));

      let status = null;
      let navError = '';
      try {
        const response = await page.goto(base + path, { waitUntil: 'networkidle', timeout: 25000 });
        status = response?.status() || null;
        await page.waitForTimeout(600);
      } catch (error) {
        navError = clean(error.message);
      }

      const metrics = await page.evaluate(() => {
        const vw = window.innerWidth;
        const doc = document.documentElement;
        const body = document.body;

        const visible = (el) => {
          const cs = getComputedStyle(el);
          const rect = el.getBoundingClientRect();
          return cs.display !== 'none' && cs.visibility !== 'hidden' && Number(cs.opacity) !== 0 && rect.width > 0 && rect.height > 0;
        };

        const selectorFor = (el) => {
          if (el.id) return `#${el.id}`;
          const cls = [...el.classList].slice(0, 3).join('.');
          return el.tagName.toLowerCase() + (cls ? `.${cls}` : '');
        };

        const all = [...document.querySelectorAll('body *')].filter(visible);
        const overflow = all.map((el) => {
          const rect = el.getBoundingClientRect();
          return {
            selector: selectorFor(el),
            text: (el.innerText || el.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim().slice(0, 90),
            left: Math.round(rect.left),
            right: Math.round(rect.right),
            top: Math.round(rect.top),
            width: Math.round(rect.width),
          };
        }).filter((item) => item.right > vw + 2 || item.left < -2).slice(0, 30);

        const clippedText = all.map((el) => {
          const cs = getComputedStyle(el);
          if (!/^(A|BUTTON|SPAN|P|H1|H2|H3|H4|DIV|SUMMARY)$/.test(el.tagName)) return null;
          if (el.scrollWidth <= el.clientWidth + 2 && el.scrollHeight <= el.clientHeight + 2) return null;
          if (cs.overflow === 'visible' && cs.whiteSpace !== 'nowrap') return null;
          const rect = el.getBoundingClientRect();
          return {
            selector: selectorFor(el),
            text: (el.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 100),
            client: `${el.clientWidth}x${el.clientHeight}`,
            scroll: `${el.scrollWidth}x${el.scrollHeight}`,
            top: Math.round(rect.top),
          };
        }).filter(Boolean).slice(0, 30);

        const smallTargets = [...document.querySelectorAll('a,button,input,select,textarea,[role="button"]')]
          .filter(visible)
          .map((el) => {
            const rect = el.getBoundingClientRect();
            return {
              selector: selectorFor(el),
              text: (el.innerText || el.getAttribute('aria-label') || el.getAttribute('placeholder') || '').replace(/\s+/g, ' ').trim().slice(0, 90),
              w: Math.round(rect.width),
              h: Math.round(rect.height),
              top: Math.round(rect.top),
            };
          })
          .filter((item) => item.w < 40 || item.h < 40)
          .slice(0, 40);

        const brokenImages = [...document.images]
          .map((img) => ({ src: img.currentSrc || img.src, alt: img.alt || '', w: img.naturalWidth, h: img.naturalHeight }))
          .filter((img) => !img.w || !img.h)
          .slice(0, 20);

        const fixedEls = all.map((el) => {
          const cs = getComputedStyle(el);
          if (!['fixed', 'sticky'].includes(cs.position)) return null;
          const rect = el.getBoundingClientRect();
          return {
            selector: selectorFor(el),
            position: cs.position,
            text: (el.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 90),
            rect: `${Math.round(rect.left)},${Math.round(rect.top)} ${Math.round(rect.width)}x${Math.round(rect.height)}`,
          };
        }).filter(Boolean).slice(0, 20);

        return {
          url: location.href,
          title: document.title,
          viewport: `${window.innerWidth}x${window.innerHeight}`,
          scrollWidth: Math.max(doc.scrollWidth, body?.scrollWidth || 0),
          scrollHeight: Math.max(doc.scrollHeight, body?.scrollHeight || 0),
          overflowX: Math.max(doc.scrollWidth, body?.scrollWidth || 0) - vw,
          overflow,
          clippedText,
          smallTargets,
          brokenImages,
          fixedEls,
        };
      });

      const screenshot = join(outDir, `${pageName}-${viewportName}.png`);
      await page.screenshot({ path: screenshot, fullPage: false });
      report.push({ pageName, path, viewport: viewportName, status, navError, consoleMessages, pageErrors, screenshot, metrics });
      await context.close();
    });
  }
}

test.afterAll(() => {
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'ui-audit-report.json'), JSON.stringify(report, null, 2));
  const summary = report.map((entry) => ({
    page: entry.pageName,
    viewport: entry.viewport,
    status: entry.status,
    overflowX: entry.metrics?.overflowX,
    overflowCount: entry.metrics?.overflow?.length || 0,
    clippedText: entry.metrics?.clippedText?.length || 0,
    smallTargets: entry.metrics?.smallTargets?.length || 0,
    brokenImages: entry.metrics?.brokenImages?.length || 0,
    console: entry.consoleMessages?.length || 0,
    navError: entry.navError,
  }));
  console.log(JSON.stringify(summary, null, 2));
});
