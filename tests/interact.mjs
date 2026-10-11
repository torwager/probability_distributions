// Interaction test for the reference Normal page: drags the mu line and the sigma arrow,
// checks that the number boxes follow, types values and checks that the plot follows,
// checks validation messages, and exercises the area-under-the-curve tool.
// Usage: node tests/interact.mjs
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import { startServer, ROOT } from './server.mjs';
import { loadPlaywright, chromiumPath } from './pw.mjs';

const { chromium } = loadPlaywright();
const { server, url } = await startServer(0);
const browser = await chromium.launch({ executablePath: chromiumPath() });
const outDir = path.join(ROOT, 'screenshots');
fs.mkdirSync(outDir, { recursive: true });
const errors = [];
let passed = 0;
const check = async (name, fn) => {
  try { await fn(); passed++; console.log('ok  ', name); }
  catch (e) { errors.push(name + ': ' + e.message); console.log('FAIL', name, '\n     ', e.message); }
};

const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type() === 'error' && !/fonts\.g/.test(m.text())) errors.push('console: ' + m.text()); });
await page.goto(url + 'distribution.html?d=normal', { waitUntil: 'load' });
await page.waitForSelector('.explorer .handle');
await page.locator('.explorer').scrollIntoViewIfNeeded();

const mu = page.locator('.param-input[data-param="mu"]');
const sigma = page.locator('.param-input[data-param="sigma"]');
const pdfPath = () => page.locator('.fig-pdf [data-layer="pdf"] path').getAttribute('d');
const box = async loc => { const b = await loc.boundingBox(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; };
// page x coordinate of data value v on the PDF plot, from the x tick labels
const xPixel = async v => {
  const ticks = await page.locator('.fig-pdf .tick-label[text-anchor="middle"]').evaluateAll(els => els.map(e => {
    const r = e.getBoundingClientRect(); return [Number(e.textContent.replace('−', '-')), r.x + r.width / 2];
  }));
  const [a, b] = [ticks[0], ticks[ticks.length - 1]];
  return a[1] + (v - a[0]) / (b[0] - a[0]) * (b[1] - a[1]);
};
const knob = id => page.locator(`.fig-pdf .handle[data-handle="${id}"] .knob`);

await check('initial values', async () => {
  assert.equal(await mu.inputValue(), '0');
  assert.equal(await sigma.inputValue(), '1');
});

await check('drag the mu line to the right updates the mu box', async () => {
  const before = await pdfPath();
  const k = await box(knob('vline-mu'));
  await page.mouse.move(k.x, k.y);
  await page.mouse.down();
  await page.mouse.move(k.x + 40, k.y, { steps: 5 });
  await page.mouse.move(k.x + 80, k.y, { steps: 5 });
  const during = Number(await mu.inputValue());
  assert.ok(during > 0.5, `mu during drag = ${during}`);
  await page.mouse.up();
  await page.waitForTimeout(400);
  const v = Number(await mu.inputValue());
  assert.ok(v > 0.5 && v < 3, `mu after drag = ${v}`);
  assert.notEqual(await pdfPath(), before, 'curve should move');
});

await check('drag the sigma arrow tip outward increases sigma', async () => {
  const s0 = Number(await sigma.inputValue());
  const k = await box(knob('hArrow-sigma'));
  await page.mouse.move(k.x, k.y);
  await page.mouse.down();
  await page.mouse.move(k.x + 30, k.y, { steps: 4 });
  await page.mouse.move(k.x + 60, k.y + 10, { steps: 4 });
  await page.mouse.up();
  await page.waitForTimeout(400);
  const s1 = Number(await sigma.inputValue());
  assert.ok(s1 > s0 + 0.2, `sigma ${s0} -> ${s1}`);
});

await check('drag the sigma arrow tip inward decreases sigma (never below the minimum)', async () => {
  const k = await box(knob('hArrow-sigma'));
  await page.mouse.move(k.x, k.y);
  await page.mouse.down();
  await page.mouse.move(k.x - 400, k.y, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(400);
  const s = Number(await sigma.inputValue());
  assert.ok(s >= 0.1 && s < 0.5, `sigma = ${s}`);
});

await check('typing a value in the mu box moves the mean line', async () => {
  await page.getByRole('button', { name: 'Reset parameters' }).click();
  await page.waitForTimeout(500);
  const x0 = (await box(knob('vline-mu'))).x;
  await mu.fill('-1.5');
  await page.waitForTimeout(500);
  const x1 = (await box(knob('vline-mu'))).x;
  assert.ok(x0 - x1 > 30, `knob should move left: ${x0} -> ${x1}`);
  const d = await page.locator('.fig-pdf .handle[data-handle="vline-mu"]').getAttribute('aria-valuetext');
  assert.equal(d, '-1.5');
});

await check('typing sigma changes the curve', async () => {
  const before = await pdfPath();
  await sigma.fill('2');
  await page.waitForTimeout(500);
  assert.notEqual(await pdfPath(), before);
  await sigma.blur();
  assert.equal(await sigma.inputValue(), '2');
});

await check('invalid input shows a message and is not applied', async () => {
  await sigma.fill('-3');
  await page.waitForTimeout(100);
  const msg = await page.locator('.param-row.invalid .param-msg').textContent();
  assert.match(msg, /from 0\.1 to 5/);
  await sigma.blur();
  assert.equal(await sigma.inputValue(), '2');
  assert.equal(await page.locator('.param-row.invalid').count(), 0);
});

await check('keyboard moves a focused handle', async () => {
  const before = Number(await mu.inputValue());
  await page.locator('.fig-pdf .handle[data-handle="vline-mu"]').focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  const after = Number(await mu.inputValue());
  assert.ok(after > before, `${before} -> ${after}`);
});

await check('area tool: left area equals the CDF value', async () => {
  await page.getByRole('button', { name: 'Reset parameters' }).click();
  await page.waitForTimeout(400);
  await page.getByRole('switch', { name: /area under the curve/i }).click();
  await page.waitForTimeout(300);
  const thr = page.locator('.fig-pdf .handle[data-handle="area-a"] .knob');
  const k = await box(thr);
  // drag the threshold to about x = 1
  const px1 = await xPixel(1);
  await page.mouse.move(k.x, k.y);
  await page.mouse.down();
  await page.mouse.move(px1, k.y, { steps: 6 });
  await page.mouse.up();
  await page.waitForTimeout(300);
  const txt = await page.locator('.area-readout').textContent();
  const m = txt.match(/P\(X ≤ ([−\-\d.]+)\) = F\(([−\-\d.]+)\) = ([\d.]+)/);
  assert.ok(m, txt);
  const x = Number(m[1].replace('−', '-')), area = Number(m[3]);
  // Phi(x) for standard normal
  const erf = z => { const t = 1 / (1 + 0.3275911 * Math.abs(z)); const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-z * z); return z >= 0 ? y : -y; };
  const Phi = 0.5 * (1 + erf(x / Math.SQRT2));
  assert.ok(Math.abs(Phi - area) < 2e-3, `x=${x} area=${area} Phi=${Phi}`);
  assert.ok(Math.abs(x - 1) < 0.15, `threshold near 1: ${x}`);
  assert.equal(await page.locator('.fig-cdf [data-layer="ga-dot"]').count(), 1, 'CDF marker present');
  await page.locator('.explorer').screenshot({ path: path.join(outDir, 'interact-area-left.png') });
});

await check('area tool: right and between modes', async () => {
  await page.getByRole('radio', { name: 'Right of x' }).click();
  await page.waitForTimeout(200);
  let txt = await page.locator('.area-readout').textContent();
  assert.match(txt, /P\(X > .*\) = 1 − F/);
  await page.getByRole('radio', { name: 'Between' }).click();
  await page.waitForTimeout(200);
  txt = await page.locator('.area-readout').textContent();
  assert.match(txt, /P\(.* < X ≤ .*\) = F\(.*\) − F/);
  assert.equal(await page.locator('.fig-pdf .handle[data-handle="area-b"]').count(), 1);
  await page.locator('.explorer').screenshot({ path: path.join(outDir, 'interact-area-between.png') });
});

await check('area tool: arrow keys move a focused threshold by one step per key press', async () => {
  const txt0 = await page.locator('.area-readout').textContent();
  const a0 = Number(txt0.match(/P\(([−\-\d.]+) < X/)[1].replace('−', '-'));
  await page.locator('.fig-pdf .handle[data-handle="area-a"]').focus();
  for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowLeft'); // pressed faster than the screen redraws
  await page.waitForTimeout(150); // the readout is redrawn on the next animation frame
  const txt1 = await page.locator('.area-readout').textContent();
  const a1 = Number(txt1.match(/P\(([−\-\d.]+) < X/)[1].replace('−', '-'));
  assert.ok(a0 - a1 > 0.3, `threshold a moved from ${a0} to ${a1}`);
});

await check('properties table updates live', async () => {
  await mu.fill('2');
  await page.waitForTimeout(200);
  const row = page.locator('table.props tbody tr').filter({ has: page.locator('td.pname', { hasText: /^Mean$/ }) });
  assert.equal((await row.locator('td.pval').textContent()).trim(), '2');
});

// phone: touch-sized layout still draggable with a mouse-like pointer
const phone = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
phone.on('pageerror', e => errors.push('phone pageerror: ' + e.message));
await phone.goto(url + 'distribution.html?d=normal', { waitUntil: 'load' });
await phone.waitForSelector('.explorer .handle');
await check('phone: drag mu works and layout has no horizontal scroll', async () => {
  await phone.locator('.fig-pdf').scrollIntoViewIfNeeded();
  const k = await phone.locator('.fig-pdf .handle[data-handle="vline-mu"] .knob').boundingBox();
  await phone.mouse.move(k.x + k.width / 2, k.y + k.height / 2);
  await phone.mouse.down();
  await phone.mouse.move(k.x - 40, k.y + 5, { steps: 6 });
  await phone.mouse.up();
  const v = Number(await phone.locator('.param-input[data-param="mu"]').inputValue());
  assert.ok(v < -0.3, `mu = ${v}`);
  const over = await phone.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert.ok(over <= 1, `overflow ${over}`);
  await phone.locator('.explorer').screenshot({ path: path.join(outDir, 'interact-phone.png') });
});

// phone with real touch events (CDP): a diagonal drag on a handle must not scroll the page,
// and a vertical swipe on the plot background must still scroll it
const touchCtx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const tp = await touchCtx.newPage();
tp.on('pageerror', e => errors.push('touch pageerror: ' + e.message));
await tp.goto(url + 'distribution.html?d=normal', { waitUntil: 'load' });
await tp.waitForSelector('.explorer .handle');
await check('touch: diagonal drag on the sigma arrow changes sigma and does not scroll the page', async () => {
  const cdp = await touchCtx.newCDPSession(tp);
  await tp.locator('.fig-pdf').scrollIntoViewIfNeeded();
  await tp.waitForTimeout(300);
  const k = await tp.locator('.fig-pdf .handle[data-handle="hArrow-sigma"] .knob').boundingBox();
  const from = { x: k.x + k.width / 2, y: k.y + k.height / 2 }, to = { x: from.x + 40, y: from.y - 40 };
  const y0 = await tp.evaluate(() => scrollY);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [from] });
  for (let i = 1; i <= 8; i++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: from.x + (to.x - from.x) * i / 8, y: from.y + (to.y - from.y) * i / 8 }] });
    await tp.waitForTimeout(16);
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await tp.waitForTimeout(300);
  const sg = Number(await tp.locator('.param-input[data-param="sigma"]').inputValue());
  assert.ok(sg > 1.3, `sigma = ${sg}`);
  assert.equal(await tp.evaluate(() => scrollY), y0, 'page scrolled during a handle drag');
  // a vertical swipe on the empty plot area scrolls the page
  const bg = await tp.locator('.fig-pdf .plot-bg').boundingBox();
  const s0 = { x: bg.x + bg.width * 0.15, y: bg.y + bg.height * 0.8 };
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [s0] });
  for (let i = 1; i <= 8; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: s0.x, y: s0.y - 18 * i }] }); await tp.waitForTimeout(16); }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await tp.waitForTimeout(500);
  assert.ok((await tp.evaluate(() => scrollY)) > y0 + 40, 'a swipe on the plot background should scroll the page');
});
await touchCtx.close();

// relation demo: n handle and boxes
const rp = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
rp.on('pageerror', e => errors.push('relation pageerror: ' + e.message));
await rp.goto(url + 'relation.html?r=binomial--normal', { waitUntil: 'load' });
await rp.waitForSelector('.demo .handle');
await check('relation demo: typing n updates the readout', async () => {
  const before = await rp.locator('.demo-readout').textContent();
  await rp.locator('.demo .param-input[data-param="n"]').fill('200');
  await rp.waitForTimeout(300);
  const after = await rp.locator('.demo-readout').textContent();
  assert.notEqual(after, before);
  assert.match(after, /is met/);
});

// demo helpers: compareDemo (poisson--normal) and simulationDemo (exponential--gamma)
const dp = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
dp.on('pageerror', e => errors.push('demo pageerror: ' + e.message));
dp.on('console', m => { if (m.type() === 'error' && !/fonts\.g/.test(m.text())) errors.push('demo console: ' + m.text()); });
await dp.goto(url + 'relation.html?r=poisson--normal', { waitUntil: 'load' });
await dp.waitForSelector('.demo .handle');
await check('compareDemo: dragging the λ marker raises λ and shrinks the CDF gap', async () => {
  const gap = async () => Number((await dp.locator('.demo-readout b').first().textContent()).replace('−', '-'));
  const g0 = await gap();
  await dp.locator('.demo .handle[data-handle="lambda"] .knob').scrollIntoViewIfNeeded();
  const k = await box(dp.locator('.demo .handle[data-handle="lambda"] .knob'));
  await dp.mouse.move(k.x, k.y); await dp.mouse.down();
  await dp.mouse.move(k.x + 200, k.y, { steps: 8 }); await dp.mouse.up();
  await dp.waitForTimeout(300);
  const lam = Number(await dp.locator('.demo .param-input[data-param="lambda"]').inputValue());
  assert.ok(lam > 6, `lambda = ${lam}`);
  assert.ok(await gap() < g0, 'gap should shrink');
});
await dp.goto(url + 'relation.html?r=exponential--gamma', { waitUntil: 'load' });
await dp.waitForSelector('.demo .plot-svg');
await check('simulationDemo: new samples and sample sizes redraw; the KS gap is within chance', async () => {
  const read = () => dp.locator('.demo-readout').textContent();
  const r0 = await read();
  await dp.getByRole('button', { name: 'Draw new samples' }).click(); await dp.waitForTimeout(200);
  const r1 = await read();
  assert.notEqual(r1, r0);
  await dp.getByRole('radio', { name: /20,000 draws/ }).click(); await dp.waitForTimeout(300);
  const r2 = await read();
  assert.match(r2, /With 20,000 simulated values/);
  assert.match(r2, /agrees with the target distribution/);
  await dp.locator('.demo .param-input[data-param="n"]').fill('12'); await dp.waitForTimeout(300);
  assert.match(await read(), /mean n\/λ|mean/);
});

// page head toggles with the keyboard, and links to a section of a page
const hp = await browser.newPage({ viewport: { width: 1280, height: 720 } });
hp.on('pageerror', e => errors.push('pageerror: ' + e.message));
await hp.goto(url + 'distribution.html?d=gamma', { waitUntil: 'load' });
await hp.waitForSelector('#explorer .plot-svg');
await check('keyboard: Enter and Space open and close "More about this distribution" and the symbols', async () => {
  const state = id => hp.evaluate(id => [document.querySelector(`button[aria-controls="${id}"]`).getAttribute('aria-expanded'), !document.getElementById(id).hidden,
    !document.querySelector('[data-role="summary"]').hidden], id);
  await hp.locator('button[aria-controls="about-more"]').focus();
  await hp.keyboard.press('Enter');
  assert.deepEqual(await state('about-more'), ['true', true, false]);
  await hp.keyboard.press(' ');
  assert.deepEqual(await state('about-more'), ['false', false, true]);
  await hp.locator('button[aria-controls="formula-symbols"]').focus();
  await hp.keyboard.press('Enter');
  assert.equal((await state('formula-symbols'))[1], true);
  assert.ok(await hp.locator('#formula-symbols .glossary dt').count() > 3, 'glossary shown');
});
for (const rel of ['distribution.html?d=dirichlet#references', 'distribution.html?d=normal#uses', 'relation.html?r=binomial--normal#why']) {
  await check(`a link to a section scrolls there and stays (${rel})`, async () => {
    await hp.goto(url + rel, { waitUntil: 'load' });
    await hp.waitForTimeout(1500);
    const top = await hp.evaluate(id => Math.round(document.getElementById(id).getBoundingClientRect().top), rel.split('#')[1]);
    assert.ok(top > 40 && top < 160, `section top at ${top}px`);
  });
}

await browser.close();
server.close();
if (errors.length) { console.log('\nProblems:\n  ' + errors.join('\n  ')); process.exit(1); }
console.log(`\nAll ${passed} interaction checks passed`);
