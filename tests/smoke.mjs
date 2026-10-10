// Browser smoke test: visits every page, records console errors and failed requests,
// checks for horizontal overflow, and saves screenshots at desktop and phone widths.
// Usage: node tests/smoke.mjs [--only=normal] [--no-shots]
import fs from 'node:fs';
import path from 'node:path';
import { startServer, ROOT } from './server.mjs';
import { loadPlaywright, chromiumPath } from './pw.mjs';
import { DISTRIBUTIONS, RELATIONS } from '../assets/js/catalog.js';

const args = process.argv.slice(2);
const only = (args.find(a => a.startsWith('--only=')) || '').slice(7);
const shots = !args.includes('--no-shots');
const outDir = path.join(ROOT, 'screenshots');
fs.mkdirSync(outDir, { recursive: true });

const distIds = DISTRIBUTIONS.map(d => d.id).filter(id => fs.existsSync(path.join(ROOT, 'assets/js/dists', id + '.js')));
const pages = [
  ['index', 'index.html'], ['about', 'about.html'], ['relationships', 'relationships.html'], ['distributions', 'distributions.html'],
  ['dist-unknown', 'distribution.html?d=nope'],
  ...distIds.map(id => ['dist-' + id, `distribution.html?d=${id}`]),
  ...RELATIONS.map(r => ['rel-' + r.id, `relation.html?r=${r.id}`]),
].filter(([name]) => !only || name.includes(only));
// a fallback page for a catalog distribution without a module (if any)
const missing = DISTRIBUTIONS.find(d => !distIds.includes(d.id));
if (missing && !only) pages.push(['dist-fallback-' + missing.id, `distribution.html?d=${missing.id}`]);

const IGNORE = [/fonts\.googleapis\.com/, /fonts\.gstatic\.com/];
const { chromium } = loadPlaywright();
const { server, url } = await startServer(0);
const browser = await chromium.launch({ executablePath: chromiumPath() });
let failures = 0;
const fullShots = new Set(['dist-normal', 'rel-binomial--normal', 'index', 'about']);

for (const [w, h, tag] of [[1280, 900, 'desktop'], [390, 844, 'phone']]) {
  const context = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: tag === 'phone' ? 2 : 1, colorScheme: 'light' });
  for (const [name, rel] of pages) {
    const page = await context.newPage();
    const errors = [];
    page.on('console', m => { if (m.type() === 'error' && !IGNORE.some(r => r.test(m.text()))) errors.push('console: ' + m.text()); });
    page.on('pageerror', e => errors.push('pageerror: ' + e.message));
    page.on('requestfailed', r => { if (!IGNORE.some(x => x.test(r.url()))) errors.push('requestfailed: ' + r.url()); });
    page.on('response', r => { if (r.status() >= 400 && !IGNORE.some(x => x.test(r.url()))) errors.push(`HTTP ${r.status()}: ${r.url()}`); });
    await page.goto(url + rel, { waitUntil: 'load' });
    await page.waitForTimeout(400);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (overflow > 1) errors.push(`horizontal overflow of ${overflow}px`);
    const katexErr = await page.locator('.katex-error').count();
    if (katexErr) errors.push(`${katexErr} KaTeX error(s): ` + (await page.locator('.katex-error').first().getAttribute('title')));
    if (shots) await page.screenshot({ path: path.join(outDir, `${name}-${tag}.png`), fullPage: fullShots.has(name) });
    if (errors.length) { failures++; console.log(`FAIL ${tag} ${rel}\n  ${errors.join('\n  ')}`); }
    else console.log(`ok   ${tag} ${rel}`);
    await page.close();
  }
  await context.close();
}
// dark mode screenshot of the reference page
if (!only || 'dist-normal'.includes(only)) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: 'dark' });
  const page = await ctx.newPage();
  await page.goto(url + 'distribution.html?d=normal', { waitUntil: 'load' });
  await page.waitForTimeout(400);
  if (shots) await page.screenshot({ path: path.join(outDir, 'dist-normal-dark.png') });
  await ctx.close();
}
await browser.close();
server.close();
console.log(failures ? `\n${failures} page(s) with problems` : '\nAll pages loaded without errors');
process.exit(failures ? 1 : 0);
