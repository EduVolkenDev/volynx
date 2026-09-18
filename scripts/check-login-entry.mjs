import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const page = readFileSync(new URL('../src/pages/login/index.astro', import.meta.url), 'utf8');
const script = page.match(/<script is:inline>([\s\S]*?)<\/script>/)?.[1];
assert.ok(script, 'Login state initializer exists');
for (const [search, shouldShow] of [
  ['', false],
  ['?next=%2Fdashboard%2Fpropertyflow%2F', false],
  ['?return=%2Fdashboard%2Fpropertyflow%2F%3Fsite%3Dexample', false],
  ['?session_expired=0', false],
  ['?session_expired=1&next=%2Fdashboard%2F', true],
]) {
  const banner = { hidden: true };
  runInNewContext(script, {
    URLSearchParams,
    window: { location: { search } },
    document: { getElementById: () => banner },
  });
  assert.equal(!banner.hidden, shouldShow, search || 'ordinary login');
}
assert.match(page, /\.session-expired\[hidden\]\s*\{\s*display:\s*none;/);
console.log('PASS: five login-entry states and hidden-banner CSS; product links do not imply expired sessions.');
