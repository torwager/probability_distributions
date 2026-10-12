// Browser test of the home-page map, in both of its views ("Core distributions", the default, and "Full set
// of distributions"): layout self-check (no overlaps), arrow directions, every arrow label and every arrow
// opens the right dialog with a link to its relation page, focus returns to the label when the dialog
// closes, every tile is clickable and links to its distribution page, the view switch and its URL state,
// the card that describes a tile (on hover and on keyboard focus), the map filling the screen at laptop
// sizes, and the phone layout.
// Usage: node tests/map.mjs [--port=<n>] [--quick]   (--quick: open the dialogs of a sample of the arrows only)
import assert from 'node:assert/strict';
import { startServer } from './server.mjs';
import { loadPlaywright, chromiumPath } from './pw.mjs';
import { RELATIONS, DISTRIBUTIONS, getDist } from '../assets/js/catalog.js';

const arg = name => (process.argv.find(a => a.startsWith(`--${name}=`)) || '').split('=')[1];
const QUICK = process.argv.includes('--quick');
const { chromium } = loadPlaywright();
const { server, url } = await startServer(Number(arg('port') || 0));
const browser = await chromium.launch({ executablePath: chromiumPath() });
let failed = 0, passed = 0;
async function check(name, fn) {
  try { await fn(); passed++; console.log('ok   ' + name); }
  catch (e) { failed++; console.log('FAIL ' + name + '\n  ' + String(e.message || e).split('\n').join('\n  ')); }
}
const titleOf = r => `${getDist(r.from).name} ${r.bidirectional ? '↔' : '→'} ${getDist(r.to).name}`;
const CORE = new Set(DISTRIBUTIONS.filter(d => d.onOriginalMap).map(d => d.id));
const EXPECT = {
  core: { dists: DISTRIBUTIONS.filter(d => CORE.has(d.id)), rels: RELATIONS.filter(r => CORE.has(r.from) && CORE.has(r.to)) },
  full: { dists: DISTRIBUTIONS, rels: RELATIONS },
};
const ACTIVE = '.map-world.is-active';
const ready = p => p.waitForFunction(() => document.documentElement.dataset.mapReady === '1', null, { timeout: 15000 });

const ctx = await browser.newContext({ viewport: { width: 1600, height: 1100 } });
const page = await ctx.newPage();
const errors = [];
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
page.on('pageerror', e => errors.push('pageerror: ' + e.message));

// ------------------------------------------------------------------ both views
for (const view of ['core', 'full']) {
  const E = EXPECT[view];
  await page.goto(url + 'index.html' + (view === 'full' ? '?view=full' : ''), { waitUntil: 'load' });
  await ready(page);
  await page.evaluate(() => window.__map.setFull(true));
  await page.waitForTimeout(500);

  await check(`${view}: the right view is shown, with a tile for each distribution and an arrow and a label for each relation`, async () => {
    const n = await page.evaluate(() => ({ view: window.__map.view, tiles: window.__map.tiles.size, edges: window.__map.edges.size, labels: window.__map.labels.size,
      shown: document.querySelectorAll('.map-world.is-active .map-tile').length, worlds: document.querySelectorAll('.map-world.is-active').length,
      hiddenInert: [...document.querySelectorAll('.map-world:not(.is-active)')].every(w => w.inert && getComputedStyle(w).visibility === 'hidden') }));
    assert.equal(n.view, view);
    assert.equal(n.worlds, 1);
    assert.ok(n.hiddenInert, 'the other view is hidden and inert');
    assert.equal(n.tiles, E.dists.length);
    assert.equal(n.shown, E.dists.length);
    assert.equal(n.edges, E.rels.length);
    assert.equal(n.labels, E.rels.length);
    if (view === 'core') { assert.equal(E.dists.length, 15); assert.equal(E.rels.length, 22); }
  });

  await check(`${view}: layout self-check finds no overlaps`, async () => {
    const res = await page.evaluate(() => window.__map.checkLayout());
    for (const [k, v] of Object.entries(res)) assert.deepEqual(v, [], `${k}: ${JSON.stringify(v)}`);
  });

  await check(`${view}: arrows start at their source tile and end at their target tile, with the right heads`, async () => {
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

  await check(`${view}: each arrow label opens its dialog (title, link, glossary) and focus returns to the label`, async () => {
    const probs = [];
    const rels = QUICK ? E.rels.filter((_, i) => i % 5 === 0) : E.rels;
    for (const r of rels) {
      await page.locator(`${ACTIVE} .edge-label[data-id="${r.id}"]`).click();
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
      // focus goes back to the label once the dialog has closed (allow for a slow machine)
      await page.waitForFunction(id => !document.querySelector('[role=dialog]') && document.activeElement && document.activeElement.dataset.id === id, r.id, { timeout: 1500 }).catch(() => {});
      const back = await page.evaluate(() => document.activeElement && document.activeElement.dataset.id);
      if (back !== r.id) probs.push(`${r.id}: focus returned to ${back}`);
    }
    assert.deepEqual(probs, []);
  });

  await check(`${view}: clicking each arrow opens its dialog`, async () => {
    await page.evaluate(() => { document.activeElement.blur(); window.__map.pz.fit(); });
    await page.waitForTimeout(300);
    const probs = [];
    for (const r of E.rels) {
      // two quick clicks on nearby arrows count as a double click, which zooms the map: show the whole map again
      await page.evaluate(() => window.__map.pz.fit());
      const pt = await page.evaluate(id => {
        const p = document.querySelector(`.map-world.is-active .edge[data-id="${id}"] .e-hit`);
        const L = p.getTotalLength();
        // map path coordinates to the screen from the SVG's own box (getScreenCTM is unreliable here while the
        // map's CSS transform has just changed)
        const svg = p.ownerSVGElement, box = svg.getBoundingClientRect();
        const vb = svg.viewBox && svg.viewBox.baseVal && svg.viewBox.baseVal.width ? svg.viewBox.baseVal : null;
        const sw = vb ? vb.width : svg.width.baseVal.value, sh = vb ? vb.height : svg.height.baseVal.value;
        const ox = vb ? vb.x : 0, oy = vb ? vb.y : 0;
        for (let f = 0.06; f < 0.95; f += 0.02) {
          const q = p.getPointAtLength(L * f);
          const x = box.left + (q.x - ox) * box.width / sw, y = box.top + (q.y - oy) * box.height / sh;
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

  await check(`${view}: every tile is clickable (on top at its center) and links to its distribution page`, async () => {
    await page.evaluate(() => window.__map.pz.fit());
    await page.mouse.move(2, 2);
    await page.waitForTimeout(300);
    const bad = await page.evaluate(() => {
      const out = [];
      for (const [id, t] of window.__map.tiles) {
        const r = t.el.getBoundingClientRect();
        const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height * 0.4);
        const tile = top && top.closest('.map-tile');
        if (!tile || tile.dataset.id !== id) out.push(`${id}: covered by ${top && (top.className.baseVal ?? top.className)}`);
        if (t.el.getAttribute('href') !== `distribution.html?d=${id}`) out.push(`${id}: href ${t.el.getAttribute('href')}`);
      }
      return out;
    });
    assert.deepEqual(bad, []);
  });
}

await check('full: clicking a tile opens its page, and the back button returns to the same view', async () => {
  // start in the full view (switched by the toggle), open a tile, come back
  await page.goto(url + 'index.html', { waitUntil: 'load' });
  await ready(page);
  await page.getByRole('radio', { name: 'Full set of distributions' }).click();
  await page.waitForTimeout(500);
  assert.match(page.url(), /[?&]view=full/);
  const box = await page.locator(`${ACTIVE} .map-tile[data-id="cauchy"]`).boundingBox();
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForURL(/distribution\.html\?d=cauchy/, { timeout: 5000 });
  await page.goBack({ waitUntil: 'load' });
  await ready(page);
  await page.waitForTimeout(300);
  assert.equal(await page.evaluate(() => window.__map.view), 'full');
  assert.equal(await page.getByRole('radio', { name: 'Full set of distributions' }).getAttribute('aria-checked'), 'true');
});

// ------------------------------------------------------------------ view switch and URL
await check('view switch: core is the default; the switch changes the view, the address and the tiles shown', async () => {
  await page.goto(url + 'index.html', { waitUntil: 'load' });
  await ready(page);
  const core = page.getByRole('radio', { name: 'Core distributions' }), full = page.getByRole('radio', { name: 'Full set of distributions' });
  assert.equal(await page.evaluate(() => window.__map.view), 'core');
  assert.equal(await core.getAttribute('aria-checked'), 'true');
  assert.equal(await page.locator(`${ACTIVE} .map-tile`).count(), 15);
  await full.click();
  await page.waitForTimeout(450);
  assert.equal(await page.evaluate(() => window.__map.view), 'full');
  assert.equal(await full.getAttribute('aria-checked'), 'true');
  assert.match(page.url(), /index\.html\?view=full$/);
  assert.equal(await page.locator(`${ACTIVE} .map-tile`).count(), DISTRIBUTIONS.length);
  assert.equal(await page.locator('.map-world.is-active').count(), 1);
  // keyboard: arrow keys move within the radio group
  await full.focus();
  await page.keyboard.press('ArrowLeft');
  await page.waitForTimeout(450);
  assert.equal(await page.evaluate(() => window.__map.view), 'core');
  assert.ok(!page.url().includes('view='), 'core view has a plain address: ' + page.url());
  // the address selects the view
  await page.goto(url + 'index.html?view=full', { waitUntil: 'load' });
  await ready(page);
  assert.equal(await page.evaluate(() => window.__map.view), 'full');
  // the switched-to view is fitted to the frame
  const res = await page.evaluate(() => window.__map.checkLayout('core'));
  for (const [k, v] of Object.entries(res)) assert.deepEqual(v, [], `core while hidden, ${k}: ${JSON.stringify(v)}`);
});

// ------------------------------------------------------------------ the card that describes a tile
await check('tile card: appears on hover over every tile (both views, 1280x720) with the name, the summary and the common uses, inside the frame, never over its tile or the map controls; does not block clicks; hides on leave', async () => {
  const cp = await ctx.newPage();
  await cp.setViewportSize({ width: 1280, height: 720 });
  for (const view of ['core', 'full']) {
    await cp.goto(url + 'index.html' + (view === 'full' ? '?view=full' : ''), { waitUntil: 'load' });
    await ready(cp);
    await cp.waitForTimeout(300);
    for (const d of EXPECT[view].dists) {
      const id = d.id;
      await cp.mouse.move(3, 3);
      await cp.locator(`${ACTIVE} .map-tile[data-id="${id}"]`).hover();
      await cp.waitForTimeout(160);
      const c = await cp.evaluate((id) => {
        const card = document.querySelector('.map-card'), f = document.querySelector('.map-frame').getBoundingClientRect(), r = card.getBoundingClientRect();
        const ov = q => Math.max(0, Math.min(r.right, q.right) - Math.max(r.left, q.left)) * Math.max(0, Math.min(r.bottom, q.bottom) - Math.max(r.top, q.top));
        const tile = document.querySelector(`.map-world.is-active .map-tile[data-id="${id}"]`).getBoundingClientRect();
        return { show: card.classList.contains('show'), text: card.textContent, pe: getComputedStyle(card).pointerEvents,
          inside: r.left >= f.left - 0.5 && r.right <= f.right + 0.5 && r.top >= f.top - 0.5 && r.bottom <= f.bottom + 0.5,
          overTile: ov(tile), overCtl: [...document.querySelectorAll('.map-ctl')].reduce((a, e) => a + ov(e.getBoundingClientRect()), 0) };
      }, id);
      assert.ok(c.show, `${view} ${id}: card shown`);
      assert.ok(c.text.startsWith(d.name), `${view} ${id}: card names the distribution: ` + c.text.slice(0, 40));
      if (d.commonUses) assert.ok(c.text.includes(d.commonUses.replace(/\$[^$]*\$/g, '').slice(0, 20)), `${view} ${id}: card has the common uses`);
      else assert.ok(!/Common uses:|Used (for|to) /.test(c.text), `${view} ${id}: no common-uses line without the field`);
      assert.equal(c.pe, 'none', 'card ignores the pointer');
      assert.ok(c.inside, `${view} ${id}: card inside the map frame`);
      assert.equal(c.overTile, 0, `${view} ${id}: card does not cover its tile`);
      assert.equal(c.overCtl, 0, `${view} ${id}: card does not cover the map controls`);
    }
  }
  // a click on a tile with its card shown opens its page
  await cp.goto(url + 'index.html', { waitUntil: 'load' });
  await ready(cp);
  const t = cp.locator(`${ACTIVE} .map-tile[data-id="poisson"]`);
  await t.hover();
  await cp.waitForTimeout(250);
  await cp.mouse.move(3, 3);
  await cp.waitForTimeout(250);
  assert.equal(await cp.evaluate(() => document.querySelector('.map-card').classList.contains('show')), false, 'hidden after the pointer leaves');
  await t.click();
  await cp.waitForURL(/distribution\.html\?d=poisson/, { timeout: 5000 });
  await cp.close();
});

await check('arrow line: the line that describes the arrow under the pointer stays inside the frame and does not cover the arrow, its two tiles or the controls (core view)', async () => {
  const cp = await ctx.newPage();
  for (const [w, hh] of [[1280, 720], [1440, 900]]) {
    await cp.setViewportSize({ width: w, height: hh });
    await cp.goto(url + 'index.html', { waitUntil: 'load' });
    await ready(cp);
    await cp.waitForTimeout(300);
    for (const r of EXPECT.core.rels) {
      await cp.mouse.move(3, 3);
      await cp.locator(`${ACTIVE} .edge-label[data-id="${r.id}"]`).hover();
      await cp.waitForTimeout(40);
      const o = await cp.evaluate(({ id, from, to }) => {
        const i = document.querySelector('.map-info').getBoundingClientRect(), f = document.querySelector('.map-frame').getBoundingClientRect();
        const ov = q => Math.max(0, Math.min(i.right, q.right) - Math.max(i.left, q.left)) * Math.max(0, Math.min(i.bottom, q.bottom) - Math.max(i.top, q.top));
        const els = [window.__map.tiles.get(from).el, window.__map.tiles.get(to).el, window.__map.labels.get(id), ...document.querySelectorAll('.map-ctl')];
        return { show: document.querySelector('.map-info').classList.contains('show'), ov: els.reduce((a, e) => a + ov(e.getBoundingClientRect()), 0),
          inside: i.left >= f.left - 0.5 && i.right <= f.right + 0.5 && i.top >= f.top - 0.5 && i.bottom <= f.bottom + 0.5 };
      }, { id: r.id, from: r.from, to: r.to });
      assert.ok(o.show && o.inside, `${w}x${hh} ${r.id}: line shown inside the frame`);
      assert.equal(o.ov, 0, `${w}x${hh} ${r.id}: line covers nothing of the arrow`);
    }
  }
  await cp.close();
});

await check('tile card: appears on keyboard focus (with aria-describedby) and Esc hides it', async () => {
  await page.goto(url + 'index.html', { waitUntil: 'load' });
  await ready(page);
  // tab into the map: the viewport first, then the first tile
  await page.locator('.map-viewport').focus();
  await page.keyboard.press('Tab');
  await page.waitForTimeout(350);
  const st = await page.evaluate(() => {
    const a = document.activeElement, card = document.querySelector('.map-card');
    return { id: a.dataset.id, tile: a.classList.contains('map-tile'), show: card.classList.contains('show'), desc: a.getAttribute('aria-describedby'), text: card.textContent };
  });
  assert.ok(st.tile, 'a tile has focus');
  assert.ok(st.show, 'card shown on focus');
  assert.equal(st.desc, 'map-card');
  assert.ok(st.text.startsWith(getDist(st.id).name));
  if (getDist(st.id).commonUses) assert.ok(/Used (for|to) |Common uses:/.test(st.text));
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  const after = await page.evaluate(() => ({ show: document.querySelector('.map-card').classList.contains('show'), still: document.activeElement.classList.contains('map-tile') }));
  assert.equal(after.show, false, 'Esc hides the card');
  assert.ok(after.still, 'focus stays on the tile');
});

await check('catalog: commonUses is present for every distribution (warning only when missing)', async () => {
  const missing = DISTRIBUTIONS.filter(d => !d.commonUses).map(d => d.id);
  if (missing.length) console.log('     note: no commonUses for ' + missing.join(', ') + ' (the card leaves the line out)');
});

await check('no console errors on the desktop map', async () => { assert.deepEqual(errors, []); });

// ------------------------------------------------------------------ the map fills the screen
for (const [w, hh] of [[1280, 720], [1440, 900], [1920, 1080]]) {
  await check(`fill ${w}x${hh}: the frame reaches the bottom and sides of the screen and the map is fitted tightly, in both views`, async () => {
    const c = await browser.newContext({ viewport: { width: w, height: hh } });
    const p = await c.newPage();
    const out = [];
    for (const view of ['core', 'full']) {
      await p.goto(url + 'index.html' + (view === 'full' ? '?view=full' : ''), { waitUntil: 'load' });
      await ready(p);
      await p.waitForTimeout(300);
      const m = await p.evaluate(() => {
        const f = document.querySelector('.map-frame').getBoundingClientRect();
        const world = document.querySelector('.map-world.is-active');
        let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
        for (const el of world.querySelectorAll('.map-tile, .edge-label:not([hidden]), .edge:not(.off) .e-line')) {
          const r = el.getBoundingClientRect();
          if (!r.width && !r.height) continue;
          x0 = Math.min(x0, r.left); y0 = Math.min(y0, r.top); x1 = Math.max(x1, r.right); y1 = Math.max(y1, r.bottom);
        }
        return { f: { l: f.left, r: f.right, t: f.top, b: f.bottom, w: f.width, h: f.height }, c: { x0, y0, x1, y1 }, vw: document.documentElement.clientWidth, vh: innerHeight, scrollY };
      });
      const { f, c: b } = m;
      if (m.vh - f.b > 24 || f.b > m.vh + 0.5) out.push(`${view}: frame bottom ${f.b.toFixed(0)} vs screen ${m.vh}`);
      if (f.l > 24 || m.vw - f.r > 24) out.push(`${view}: side gutters ${f.l.toFixed(0)} / ${(m.vw - f.r).toFixed(0)}`);
      const fw = (b.x1 - b.x0) / f.w, fh = (b.y1 - b.y0) / f.h;
      if (Math.max(fw, fh) < 0.85) out.push(`${view}: content spans ${(fw * 100).toFixed(0)}% x ${(fh * 100).toFixed(0)}% of the frame`);
      if (b.x0 < f.l - 1 || b.x1 > f.r + 1 || b.y0 < f.t - 1 || b.y1 > f.b + 1) out.push(`${view}: content outside the frame`);
      if (m.scrollY) out.push(`${view}: page scrolled on load`);
    }
    await c.close();
    assert.deepEqual(out, []);
  });
}

// ------------------------------------------------------------------ phone
await check('phone: map spans the screen width, no horizontal page scroll, a label opens its dialog, the switch works, no tile card on tap', async () => {
  const pctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const pp = await pctx.newPage();
  const perr = [];
  pp.on('pageerror', e => perr.push(e.message));
  pp.on('console', m => { if (m.type() === 'error') perr.push(m.text()); });
  await pp.goto(url + 'index.html', { waitUntil: 'load' });
  await ready(pp);
  const g = await pp.evaluate(() => {
    const f = document.querySelector('.map-frame').getBoundingClientRect();
    return { overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth, l: f.left, r: f.right, vw: document.documentElement.clientWidth, b: f.bottom, vh: innerHeight, s: window.__map.pz.scale };
  });
  assert.ok(g.overflow <= 1, `horizontal overflow ${g.overflow}px`);
  assert.ok(g.l <= 1 && g.vw - g.r <= 1, `map spans the width: ${g.l}..${g.r} of ${g.vw}`);
  assert.ok(g.b < g.vh, 'some of the page below the map is visible, for scrolling');
  assert.ok(g.s >= 0.45, 'readable first zoom on a phone: ' + g.s);
  const r = EXPECT.core.rels[0];
  await pp.evaluate(id => window.__map.labels.get(id).click(), r.id);
  await pp.locator('[role=dialog]').waitFor({ timeout: 3000 });
  assert.equal(await pp.locator('[role=dialog] h2').first().textContent(), titleOf(r));
  await pp.keyboard.press('Escape');
  await pp.getByRole('radio', { name: 'Full set of distributions' }).tap();
  await pp.waitForTimeout(450);
  assert.equal(await pp.evaluate(() => window.__map.view), 'full');
  const res = await pp.evaluate(() => window.__map.checkLayout());
  for (const [k, v] of Object.entries(res)) assert.deepEqual(v, [], `${k}: ${JSON.stringify(v)}`);
  // a tap on a tile opens the page (no hover needed) and shows no card
  await pp.evaluate(() => window.__map.pz.fit());
  await pp.waitForTimeout(300);
  const box = await pp.locator(`${ACTIVE} .map-tile[data-id="normal"]`).boundingBox();
  await pp.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
  await pp.waitForURL(/distribution\.html\?d=normal/, { timeout: 5000 });
  assert.deepEqual(perr, []);
  await pctx.close();
});

await browser.close();
server.close();
console.log(failed ? `\n${failed} map check(s) failed, ${passed} passed` : `\nAll ${passed} map checks passed`);
process.exit(failed ? 1 : 0);
