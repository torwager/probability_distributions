// Layout test for the top of the distribution and relationship pages (Playwright).
//
// Distribution pages, at 1280x720 and 1440x900 (page scrolled to the top):
//   (a) the summary (p[data-role="summary"]) is at most 3 lines at 1280 px;
//   (b) the main plots are fully visible: the PDF/PMF and CDF plots of the standard explorer
//       ([data-role="pdf-plot"], [data-role="cdf-plot"]) or, for a custom explorer, every element marked
//       [data-role="main-plot"]; the bottom of the plot's SVG must be inside the viewport;
//       at 1440x900 the parameter number boxes of the explorer must be inside the viewport too;
//   (c) the "More about this distribution" toggle works (aria-expanded flips, its region is shown and hidden,
//       and the summary is hidden while the region is shown);
//   (d) the "What the symbols mean" toggle works (and shows a glossary);
// and at 390x844 (e) there is no horizontal page scroll.
//
// Relationship pages: the summary is at most 3 lines at 1280 px, the formal statement is inside the
// viewport at both laptop sizes, the "More about this relationship" and symbols toggles work, there is
// no horizontal scroll at 390 px, and (a warning, not a failure) whether the top of the demo's first plot
// is inside the viewport at 1440x900.
//
// Prints a table with the measured numbers; exits with status 1 if anything fails.
// Usage: node tests/layout.mjs [--only=<substring>] [--dists] [--relations] [--port=<n>] [--shots]
//   --shots saves a screenshot of each page at each size in screenshots/layout/test/.
import fs from 'node:fs';
import path from 'node:path';
import { startServer, ROOT } from './server.mjs';
import { loadPlaywright, chromiumPath } from './pw.mjs';
import { DISTRIBUTIONS, RELATIONS } from '../assets/js/catalog.js';

const args = process.argv.slice(2);
const arg = name => { const a = args.find(x => x.startsWith(`--${name}=`)); return a ? a.slice(name.length + 3) : null; };
const only = arg('only') || '';
const port = Number(arg('port') || 0);
const shots = args.includes('--shots');
const wantD = !args.includes('--relations') || args.includes('--dists');
const wantR = !args.includes('--dists') || args.includes('--relations');
const shotDir = path.join(ROOT, 'screenshots', 'layout', 'test');
if (shots) fs.mkdirSync(shotDir, { recursive: true });

const distIds = DISTRIBUTIONS.map(d => d.id).filter(id => fs.existsSync(path.join(ROOT, 'assets/js/dists', id + '.js')));
const dists = wantD ? distIds.filter(id => !only || id.includes(only)) : [];
const rels = wantR ? RELATIONS.map(r => r.id).filter(id => !only || id.includes(only)) : [];

const LAPTOPS = [[1280, 720], [1440, 900]];
const IGNORE = [/fonts\.googleapis\.com/, /fonts\.gstatic\.com/];
const { chromium } = loadPlaywright();
const { server, url } = await startServer(port);
const browser = await chromium.launch({ executablePath: chromiumPath() });

async function open(ctx, rel, errors) {
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !IGNORE.some(r => r.test(m.text()))) errors.push('console: ' + m.text()); });
  await page.goto(url + rel, { waitUntil: 'load' });
  await page.waitForSelector('main .page-head', { timeout: 8000 }).catch(() => {});
  await page.evaluate(() => document.fonts && document.fonts.ready);
  await page.waitForTimeout(450);
  await page.evaluate(() => window.scrollTo(0, 0));
  return page;
}

/** Lines of the summary, from its height and line height. */
const summaryLines = page => page.evaluate(() => {
  const el = document.querySelector('[data-role="summary"]');
  if (!el) return NaN;
  const lh = parseFloat(getComputedStyle(el).lineHeight);
  return Math.round(el.getBoundingClientRect().height / lh);
});

/** Toggle a disclosure twice; returns null when it works, else a message. */
async function checkToggle(page, controls, mustContain) {
  const btn = page.locator(`button[aria-controls="${controls}"]`);
  if (!(await btn.count())) return `no toggle for #${controls}`;
  const st = () => page.evaluate(id => {
    const b = document.querySelector(`button[aria-controls="${id}"]`), r = document.getElementById(id);
    const sum = document.querySelector('[data-role="summary"]');
    return { exp: b.getAttribute('aria-expanded'), shown: !!r && !r.hidden && r.getBoundingClientRect().height > 0,
      summary: !!sum && sum.getClientRects().length > 0 };
  }, controls);
  // "More about ..." expands the summary in place: the summary is hidden while the full text is shown
  const head = controls === 'about-more';
  const s0 = await st();
  if (s0.exp !== 'false' || s0.shown) return `#${controls} should start collapsed (aria-expanded=${s0.exp}, shown=${s0.shown})`;
  await btn.click();
  const s1 = await st();
  if (s1.exp !== 'true' || !s1.shown) return `#${controls} did not open (aria-expanded=${s1.exp}, shown=${s1.shown})`;
  if (head && s1.summary) return 'the summary is still shown while #about-more is open';
  if (mustContain && !(await page.locator(`#${controls} ${mustContain}`).count())) return `#${controls} has no ${mustContain}`;
  await btn.click();
  const s2 = await st();
  if (s2.exp !== 'false' || s2.shown) return `#${controls} did not close`;
  if (head && !s2.summary) return 'the summary did not come back when #about-more was closed';
  await page.evaluate(() => window.scrollTo(0, 0));
  return null;
}

async function distLaptop(ctx, id, w, hgt) {
  const errors = [], fails = [], m = {};
  const page = await open(ctx, `distribution.html?d=${id}`, errors);
  await page.waitForSelector('#explorer .plot-svg', { timeout: 8000 }).catch(() => fails.push('no plot in the explorer'));
  await page.waitForTimeout(150);
  m.lines = await summaryLines(page);
  if (!(m.lines >= 1)) fails.push('no summary paragraph [data-role="summary"]');
  else if (w === 1280 && m.lines > 3) fails.push(`summary is ${m.lines} lines (max 3)`);
  const geo = await page.evaluate(() => {
    const ex = document.getElementById('explorer');
    if (!ex) return null;
    let els = [...ex.querySelectorAll('[data-role="pdf-plot"], [data-role="cdf-plot"]')];
    const custom = [...ex.querySelectorAll('[data-role="main-plot"]')];
    if (custom.length) els = custom;
    const bottomOf = el => { const svg = el.matches('svg') ? el : el.querySelector('svg.plot-svg') || el; return svg.getBoundingClientRect().bottom; };
    const vis = el => el.getClientRects().length > 0;
    const inputs = [...ex.querySelectorAll('.explorer-params .param-input')].filter(vis);
    return {
      plots: els.filter(vis).map(el => ({ role: el.dataset.role, bottom: Math.round(bottomOf(el)) })),
      params: inputs.length ? Math.round(Math.max(...inputs.map(i => i.getBoundingClientRect().bottom))) : null,
      vh: innerHeight,
      formulas: Math.round((document.getElementById('formulas') || ex).getBoundingClientRect().height),
      head: Math.round((document.querySelector('.page-head') || ex).getBoundingClientRect().bottom),
    };
  });
  if (!geo) fails.push('no #explorer section');
  else {
    m.head = geo.head; m.formulas = geo.formulas;
    m.plot = geo.plots.length ? Math.max(...geo.plots.map(p => p.bottom)) : NaN;
    m.params = geo.params;
    if (!geo.plots.length) fails.push('no main plot marked (data-role pdf-plot/cdf-plot or main-plot)');
    for (const p of geo.plots) if (p.bottom > geo.vh) fails.push(`${p.role} bottom at ${p.bottom}px > ${geo.vh}px`);
    if (w === 1440) {
      if (geo.params === null) fails.push('no parameter boxes in the explorer');
      else if (geo.params > geo.vh) fails.push(`parameter boxes end at ${geo.params}px > ${geo.vh}px`);
    }
  }
  if (shots) await page.screenshot({ path: path.join(shotDir, `dist-${id}-${w}x${hgt}.png`) });
  if (w === 1280) {
    const t1 = await checkToggle(page, 'about-more', 'p'); if (t1) fails.push(t1);
    const t2 = await checkToggle(page, 'formula-symbols', '.glossary dt'); if (t2) fails.push(t2);
  }
  await page.close();
  return { m, fails: fails.concat(errors) };
}

async function relLaptop(ctx, id, w, hgt) {
  const errors = [], fails = [], warns = [], m = {};
  const page = await open(ctx, `relation.html?r=${id}`, errors);
  await page.waitForSelector('#demo .plot-svg', { timeout: 6000 }).catch(() => {});
  await page.waitForTimeout(150);
  m.lines = await summaryLines(page);
  if (!(m.lines >= 1)) fails.push('no summary paragraph [data-role="summary"]');
  else if (w === 1280 && m.lines > 3) fails.push(`summary is ${m.lines} lines (max 3)`);
  const geo = await page.evaluate(() => {
    const st = document.querySelector('#statement .formula');
    const plot = document.querySelector('#demo .plot-svg');
    return {
      vh: innerHeight,
      stTop: st ? Math.round(st.getBoundingClientRect().top) : null,
      stBottom: st ? Math.round(st.getBoundingClientRect().bottom) : null,
      demoTop: plot ? Math.round(plot.getBoundingClientRect().top) : null,
      demoBottom: plot ? Math.round(plot.getBoundingClientRect().bottom) : null,
    };
  });
  m.statement = geo.stBottom; m.demoTop = geo.demoTop; m.demoBottom = geo.demoBottom;
  if (geo.stTop === null) fails.push('no formal statement (#statement .formula)');
  else if (geo.stBottom > geo.vh) fails.push(`statement ends at ${geo.stBottom}px > ${geo.vh}px`);
  if (w === 1440) {
    if (geo.demoTop === null) warns.push('no plot in the demo');
    else if (geo.demoTop > geo.vh) warns.push(`demo plot starts at ${geo.demoTop}px, below the ${geo.vh}px viewport`);
  }
  if (shots) await page.screenshot({ path: path.join(shotDir, `rel-${id}-${w}x${hgt}.png`) });
  if (w === 1280) {
    const t1 = await checkToggle(page, 'about-more', 'p'); if (t1) fails.push(t1);
    if (await page.locator('button[aria-controls="statement-symbols"]').count()) {
      const t2 = await checkToggle(page, 'statement-symbols', '.glossary dt'); if (t2) fails.push(t2);
    }
  }
  await page.close();
  return { m, fails: fails.concat(errors), warns };
}

async function phone(ctx, rel) {
  const errors = [];
  const page = await open(ctx, rel, errors);
  const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (shots) await page.screenshot({ path: path.join(shotDir, rel.replace(/\W+/g, '_') + '-390.png') });
  await page.close();
  return { over, fails: (over > 1 ? [`horizontal scroll of ${over}px at 390px`] : []).concat(errors) };
}

/** Run `fn` over `items` with a few pages at a time. */
async function pool(items, n, fn) {
  const out = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    while (next < items.length) { const i = next++; out[i] = await fn(items[i], i); }
  }));
  return out;
}

const ctxs = {};
for (const [w, hgt] of LAPTOPS) ctxs[w] = await browser.newContext({ viewport: { width: w, height: hgt }, colorScheme: 'light' });
ctxs.phone = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: 'light' });

let failures = 0, warnings = 0;
const pad = (s, n) => String(s).padEnd(n);
const num = v => (v === null || v === undefined || Number.isNaN(v) ? '—' : String(v));

if (dists.length) {
  console.log('\nDistribution pages (px from the top of the viewport; plot = lowest main-plot bottom, params = lowest parameter box bottom)');
  console.log(pad('page', 22) + pad('lines', 7) + pad('720: plot', 11) + pad('900: plot', 11) + pad('900: params', 13) + pad('390 scroll', 12) + 'result');
  const rows = await pool(dists, 4, async id => {
    const a = await distLaptop(ctxs[1280], id, 1280, 720);
    const b = await distLaptop(ctxs[1440], id, 1440, 900);
    const c = await phone(ctxs.phone, `distribution.html?d=${id}`);
    return { id, a, b, c };
  });
  for (const { id, a, b, c } of rows) {
    const fails = [...a.fails.map(f => '1280x720: ' + f), ...b.fails.map(f => '1440x900: ' + f), ...c.fails.map(f => '390x844: ' + f)];
    if (fails.length) failures++;
    console.log(pad(id, 22) + pad(num(a.m.lines), 7) + pad(num(a.m.plot), 11) + pad(num(b.m.plot), 11) + pad(num(b.m.params), 13) + pad(num(c.over), 12) + (fails.length ? 'FAIL' : 'ok'));
    for (const f of fails) console.log('    ' + f);
  }
}

if (rels.length) {
  console.log('\nRelationship pages (statement = bottom of the formal statement; demo = top of the first demo plot)');
  console.log(pad('page', 34) + pad('lines', 7) + pad('720: stmt', 11) + pad('900: stmt', 11) + pad('900: demo', 11) + pad('390 scroll', 12) + 'result');
  const rows = await pool(rels, 4, async id => {
    const a = await relLaptop(ctxs[1280], id, 1280, 720);
    const b = await relLaptop(ctxs[1440], id, 1440, 900);
    const c = await phone(ctxs.phone, `relation.html?r=${id}`);
    return { id, a, b, c };
  });
  for (const { id, a, b, c } of rows) {
    const fails = [...a.fails.map(f => '1280x720: ' + f), ...b.fails.map(f => '1440x900: ' + f), ...c.fails.map(f => '390x844: ' + f)];
    const warns = [...a.warns, ...b.warns.map(x => '1440x900: ' + x)];
    if (fails.length) failures++;
    if (warns.length) warnings++;
    console.log(pad(id, 34) + pad(num(a.m.lines), 7) + pad(num(a.m.statement), 11) + pad(num(b.m.statement), 11) + pad(num(b.m.demoTop), 11) + pad(num(c.over), 12) + (fails.length ? 'FAIL' : warns.length ? 'ok (warn)' : 'ok'));
    for (const f of fails) console.log('    ' + f);
    for (const x of warns) console.log('    warning: ' + x);
  }
}

await browser.close();
server.close();
console.log(failures ? `\n${failures} page(s) failed the layout checks${warnings ? `, ${warnings} with warnings` : ''}` : `\nAll pages pass the layout checks${warnings ? ` (${warnings} with warnings)` : ''}`);
process.exit(failures ? 1 : 0);
