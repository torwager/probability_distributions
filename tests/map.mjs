// Browser test of the home-page map: layout self-check (no overlaps), arrow directions, every arrow label and
// every arrow opens the right dialog with a link to its relation page, focus returns to the label when the
// dialog closes, tiles link to their distribution pages, and the phone layout has no horizontal scroll.
// Usage: node tests/map.mjs
import assert from 'node:assert/strict';
import { startServer } from './server.mjs';
import { loadPlaywright, chromiumPath } from './pw.mjs';
import { RELATIONS, DISTRIBUTIONS, getDist } from '../assets/js/catalog.js';

const { chromium } = loadPlaywright();
const { server, url } = await startServer(0);
const browser = await chromium.launch({ executablePath: chromiumPath() });
let failed = 0, passed = 0;
async function check(name, fn) {
  try { await fn(); passed++; console.log('ok   ' + name); }
  catch (e) { failed++; console.log('FAIL ' + name + '\n  ' + String(e.message || e).split('\n').join('\n  ')); }
}
const titleOf = r => `${getDist(r.from).name} ${r.bidirectional ? '↔' : '→'} ${getDist(r.to).name}`;

const ctx = await browser.newContext({ viewport: { width: 1600, height: 1100 } });
const page = await ctx.newPage();
const errors = [];
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
await page.goto(url + 'index.html', { waitUntil: 'load' });
await page.waitForFunction(() => document.documentElement.dataset.mapReady === '1', null, { timeout: 15000 });
await page.locator('.map-frame').scrollIntoViewIfNeeded();
await page.evaluate(() => window.__map.setFull(true));
await page.waitForTimeout(500);

await check('every distribution has a tile and every relation an arrow and a label', async () => {
  const n = await page.evaluate(() => ({ tiles: window.__map.tiles.size, edges: window.__map.edges.size, labels: window.__map.labels.size }));
  assert.equal(n.tiles, DISTRIBUTIONS.length);
  assert.equal(n.edges, RELATIONS.length);
  assert.equal(n.labels, RELATIONS.length);
});

await check('layout self-check finds no overlaps', async () => {
  const res = await page.evaluate(() => window.__map.checkLayout());
  for (const [k, v] of Object.entries(res)) assert.deepEqual(v, [], `${k}: ${JSON.stringify(v)}`);
});

await check('arrows start at their source tile and end at their target tile, with the right heads', async () => {
  const probs = await page.evaluate(() => {
    const m = window.__map, out = [];
    for (const [id, G] of m.geo) {
      const [from, to] = id.split('--');
      const tip = G.smp.pts[G.smp.pts.length - 1], tail = G.smp.pts[0];
      const r = m.tiles.get(to).rect, rf = m.tiles.get(from).rect;
      const d = (p, q) => Math.max(q.x - p[0], 0, p[0] - q.x - q.w) + Math.max(q.y - p[1], 0, p[1] - q.y - q.h);
      if (d(tip, r) > 12 || d(tail, rf) > 12) out.push(id + ' ends away from its tiles');
      const heads = m.edges.get(id).querySelectorAll('.e-head').length;
      if (heads !== (m.edges.get(id).classList.contains('two-way') ? 2 : 1)) out.push(id + ' has ' + heads + ' heads');
    }
    return out;
  });
  assert.deepEqual(probs, []);
});

await check('each arrow label opens its dialog (title, link, glossary) and focus returns to the label', async () => {
  const probs = [];
  for (const r of RELATIONS) {
    await page.locator(`.edge-label[data-id="${r.id}"]`).click();
    const ok = await page.locator('[role=dialog]').waitFor({ timeout: 4000 }).then(() => true).catch(() => false);
    if (!ok) { probs.push('no dialog for ' + r.id); continue; }
    await page.waitForTimeout(60);
    const d = await page.evaluate(() => {
      const el = document.querySelector('[role=dialog]');
      return { title: (el.querySelector('h2') || {}).textContent, links: [...el.querySelectorAll('a')].map(a => a.getAttribute('href')),
        katexErr: el.querySelectorAll('.katex-error').length, gl: el.querySelectorAll('dt').length };
    });
    if (d.title !== titleOf(r)) probs.push(`${r.id}: title "${d.title}"`);
    if (!d.links.includes('relation.html?r=' + r.id)) probs.push(r.id + ': no link to the relation page');
    if (d.katexErr) probs.push(r.id + ': KaTeX error');
    if (!d.gl) probs.push(r.id + ': no glossary');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(60);
    const back = await page.evaluate(() => document.activeElement && document.activeElement.dataset.id);
    if (back !== r.id) probs.push(`${r.id}: focus returned to ${back}`);
  }
  assert.deepEqual(probs, []);
});

await check('clicking each arrow opens its dialog', async () => {
  await page.evaluate(() => { document.activeElement.blur(); window.__map.pz.fit(); });
  await page.waitForTimeout(300);
  const probs = [];
  for (const r of RELATIONS) {
    const pt = await page.evaluate(id => {
      const p = document.querySelector(`.edge[data-id="${id}"] .e-hit`);
      const L = p.getTotalLength();
      for (let f = 0.06; f < 0.95; f += 0.02) {
        const q = p.getPointAtLength(L * f), m = p.getScreenCTM();
        const x = m.a * q.x + m.e, y = m.d * q.y + m.f;
        if (document.elementFromPoint(x, y) === p) return [x, y];
      }
      return null;
    }, r.id);
    if (!pt) { probs.push(r.id + ': no clickable point on the arrow'); continue; }
    await page.mouse.click(pt[0], pt[1]);
    const ok = await page.locator('[role=dialog]').waitFor({ timeout: 3000 }).then(() => true).catch(() => false);
    const title = ok ? await page.locator('[role=dialog] h2').first().textContent() : '';
    if (title !== titleOf(r)) probs.push(`${r.id}: ${ok ? 'title ' + title : 'no dialog'}`);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(240);
  }
  assert.deepEqual(probs, []);
});

await check('tiles link to their distribution pages', async () => {
  const bad = [];
  for (const d of DISTRIBUTIONS) {
    const href = await page.locator(`.map-tile[data-id="${d.id}"]`).getAttribute('href');
    if (href !== `distribution.html?d=${d.id}`) bad.push(`${d.id}: ${href}`);
  }
  assert.deepEqual(bad, []);
});

await check('no console errors on the desktop map', async () => { assert.deepEqual(errors, []); });

await check('phone: map loads, no horizontal page scroll, a label opens its dialog', async () => {
  const pctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const pp = await pctx.newPage();
  const perr = [];
  pp.on('pageerror', e => perr.push(e.message));
  pp.on('console', m => { if (m.type() === 'error') perr.push(m.text()); });
  await pp.goto(url + 'index.html', { waitUntil: 'load' });
  await pp.waitForFunction(() => document.documentElement.dataset.mapReady === '1', null, { timeout: 15000 });
  const overflow = await pp.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert.ok(overflow <= 1, `horizontal overflow ${overflow}px`);
  const r = RELATIONS[0];
  await pp.evaluate(id => window.__map.labels.get(id).click(), r.id);
  await pp.locator('[role=dialog]').waitFor({ timeout: 3000 });
  assert.equal(await pp.locator('[role=dialog] h2').first().textContent(), titleOf(r));
  assert.deepEqual(perr, []);
  await pctx.close();
});

await browser.close();
server.close();
console.log(failed ? `\n${failed} map check(s) failed, ${passed} passed` : `\nAll ${passed} map checks passed`);
process.exit(failed ? 1 : 0);
