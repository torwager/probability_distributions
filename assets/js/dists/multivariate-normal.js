// Multivariate normal distribution, shown in the bivariate case (d = 2).
// Follows the structure of the reference module dists/normal.js (see ARCHITECTURE.md).
//
// pdf takes a vector [x1, x2]. stats() reports the moments of X_1 (which is N(mu1, sigma1^2)) and the
// entropy of the whole vector; the vector-valued properties are described in content.properties.
//
// Custom explorer:
//   * joint density as a heatmap with the 1- and 2-SD ellipses (equal scales on both axes), the marginal
//     densities drawn along the bottom and left edges, the regression line E[X2 | X1] and optional draws;
//   * handles: the mean (a 2-D point); sigma1 (horizontal arrow from mu1 to mu1 + sigma1 on the bottom marginal
//     curve, at its inflection height, as on the normal page); sigma2 (vertical arrow from mu2 to mu2 + sigma2 on
//     the left marginal curve); rho (a vertical arrow at x1 = mu1 + 2 sigma1 whose tip is the rightmost point of
//     the 2-SD ellipse, which lies on the regression line); and a slice x1 = a for the conditional distribution;
//   * a second plot with the conditional density of X2 given X1 = a next to the marginal density of X2;
//   * an "inside an ellipse" tool replacing the area-under-the-curve tool (P = 1 - exp(-k^2/2)).

import { catalogParams } from '../catalog.js';
import { PI, clamp } from '../core/math.js';

const LN2PI = Math.log(2 * Math.PI);

function pdf(x, { mu1, mu2, sigma1, sigma2, rho }) {
  const z1 = (x[0] - mu1) / sigma1, z2 = (x[1] - mu2) / sigma2;
  const r2 = 1 - rho * rho;
  const q = (z1 * z1 - 2 * rho * z1 * z2 + z2 * z2) / r2;
  return Math.exp(-0.5 * q - LN2PI) / (sigma1 * sigma2 * Math.sqrt(r2));
}
/** Squared Mahalanobis distance of x from the mean. */
function maha2(x, { mu1, mu2, sigma1, sigma2, rho }) {
  const z1 = (x[0] - mu1) / sigma1, z2 = (x[1] - mu2) / sigma2;
  return (z1 * z1 - 2 * rho * z1 * z2 + z2 * z2) / (1 - rho * rho);
}
const entropy = p => Math.log(2 * PI * Math.E * p.sigma1 * p.sigma2 * Math.sqrt(1 - p.rho * p.rho));
const npdf = (x, m, s) => Math.exp(-0.5 * ((x - m) / s) ** 2) / (s * Math.sqrt(2 * PI));
/** Point at angle t on the k-SD ellipse: mu + k L (cos t, sin t), with L the Cholesky factor of Sigma. */
const ellPt = (p, k, t) => [p.mu1 + k * p.sigma1 * Math.cos(t), p.mu2 + k * p.sigma2 * (p.rho * Math.cos(t) + Math.sqrt(1 - p.rho * p.rho) * Math.sin(t))];
const ellipse = (p, k, n = 120) => Array.from({ length: n + 1 }, (_, i) => ellPt(p, k, 2 * PI * i / n));

const f3 = v => String(Number(Number(v).toPrecision(3))).replace(/^-/, '−');
const SUB = { 1: '₁', 2: '₂' };

// ------------------------------------------------------------------ scoped styles
const STYLE = `
@media (max-width: 760px) { .pd-mvn .plot-fig + .plot-fig { margin-top: 1.2rem; } }
.pd-mvn .layer.mv-ell .poly { fill: none; stroke: var(--steel-deep); stroke-width: 1.5; }
.pd-mvn .layer.mv-ell2 .poly { fill: none; stroke: var(--steel-deep); stroke-width: 1.2; stroke-dasharray: 5 4; }
.pd-mvn .layer.mv-reg .curve { stroke: var(--ink-2); stroke-width: 1.3; stroke-dasharray: 2 4; }
.pd-mvn .layer.mv-marg .curve { stroke: var(--steel); stroke-width: 1.8; }
.pd-mvn .layer.mv-margfill .fill { fill: rgba(111,143,176,.18); }
.pd-mvn .layer.mv-draw .dot { fill: var(--ink); fill-opacity: .5; }
.pd-mvn .layer.mv-draw-in .dot { fill: var(--amber-deep); fill-opacity: .85; }
.pd-mvn .layer.mv-track .rule { stroke: var(--amber-deep); stroke-width: 1; stroke-dasharray: 1 4; opacity: .7; }
.pd-mvn .layer.mv-tag .label { font-family: var(--serif); font-style: italic; font-size: 12.5px; fill: var(--ink-2); paint-order: stroke; stroke: var(--surface); stroke-width: 4px; }
.pd-mvn .handle.is-steel .handle-line { stroke: var(--steel-deep); }
.pd-mvn .readouts { grid-template-columns: 1fr; gap: 0; }
.pd-mvn .readouts dd { margin: 0 0 .45rem; color: var(--ink); }
.pd-mvn .pd-buttons { display: flex; flex-wrap: wrap; gap: .5rem; margin-top: .4rem; }
`;
function injectStyle(id, css) {
  if (typeof document === 'undefined' || document.getElementById(id)) return;
  const s = document.createElement('style');
  s.id = id; s.textContent = css;
  document.head.appendChild(s);
}

const mod = {
  id: 'multivariate-normal',
  name: 'Multivariate normal',
  kind: 'multivariate-continuous',

  params: catalogParams('multivariate-normal', { rho: { step: 0.01, dragStep: 0.01 } }),

  pdf,
  sample(rng, { mu1, mu2, sigma1, sigma2, rho }) {
    const z1 = rng.normal(), z2 = rng.normal();
    return [mu1 + sigma1 * z1, mu2 + sigma2 * (rho * z1 + Math.sqrt(1 - rho * rho) * z2)];
  },

  testParams: [
    { mu1: 1, mu2: -2, sigma1: 2, sigma2: 0.5, rho: -0.8 },
    { mu1: -4, mu2: 3, sigma1: 0.1, sigma2: 3, rho: 0.99 },
    { mu1: 0, mu2: 0, sigma1: 1, sigma2: 1, rho: 0 },
  ],

  /** Plotting window for X_1. */
  support: p => [p.mu1 - 4.5 * p.sigma1, p.mu1 + 4.5 * p.sigma1],
  range: () => [-Infinity, Infinity],

  stats(p) {
    return { mean: p.mu1, variance: p.sigma1 ** 2, sd: p.sigma1, median: p.mu1, mode: p.mu1, skewness: 0, exKurtosis: 0, entropy: entropy(p) };
  },

  checks(p, M) {
    // integrate over finite windows where the density is: the inner window follows the conditional distribution of X2 given X1
    const [a1, b1] = [p.mu1 - 10 * p.sigma1, p.mu1 + 10 * p.sigma1];
    const sc = p.sigma2 * Math.sqrt(1 - p.rho ** 2);
    const mc = x1 => p.mu2 + p.rho * p.sigma2 / p.sigma1 * (x1 - p.mu1);
    const inner = g => x1 => M.integrate(x2 => g(x1, x2) * pdf([x1, x2], p), mc(x1) - 10 * sc, mc(x1) + 10 * sc);
    const I = g => M.integrate(inner(g), a1, b1);
    const total = I(() => 1);
    const m1 = I(x1 => x1), m2 = I((x1, x2) => x2);
    const c12 = I((x1, x2) => (x1 - p.mu1) * (x2 - p.mu2));
    const v2 = I((x1, x2) => (x2 - p.mu2) ** 2);
    const H = I((x1, x2) => -Math.log(pdf([x1, x2], p)));
    // inside the 1-SD ellipse: for fixed x1 the condition is |x2 - mc(x1)| <= sc sqrt(1 - z1^2)
    const in1 = M.integrate(x1 => {
      const z1 = (x1 - p.mu1) / p.sigma1, w = sc * Math.sqrt(Math.max(0, 1 - z1 * z1));
      return w > 0 ? M.integrate(x2 => pdf([x1, x2], p), mc(x1) - w, mc(x1) + w) : 0;
    }, p.mu1 - p.sigma1, p.mu1 + p.sigma1);
    const s = Math.max(p.sigma1, p.sigma2);
    return [
      { name: 'density integrates to 1', got: total, expected: 1, tol: 1e-6 },
      { name: 'E[X1] = mu1', got: m1, expected: p.mu1, tol: 1e-6 * Math.max(1, s) },
      { name: 'E[X2] = mu2', got: m2, expected: p.mu2, tol: 1e-6 * Math.max(1, s) },
      { name: 'Cov(X1, X2) = rho sigma1 sigma2', got: c12, expected: p.rho * p.sigma1 * p.sigma2, tol: 1e-6 * Math.max(1, s * s) },
      { name: 'Var(X2) = sigma2^2', got: v2, expected: p.sigma2 ** 2, tol: 1e-6 * Math.max(1, s * s) },
      { name: 'entropy = ln(2 pi e sigma1 sigma2 sqrt(1 - rho^2))', got: H, expected: entropy(p), tol: 1e-6 },
      { name: 'the 1-SD ellipse holds 1 - exp(-1/2) of the probability', got: in1, expected: 1 - Math.exp(-0.5), tol: 1e-6 },
    ];
  },

  // ---------------------------------------------------------------- custom explorer
  customExplorer(container, ctx) {
    const { plot, ui, store, math } = ctx;
    const { h } = ui;
    injectStyle('pd-style-mvn', STYLE);
    const params = mod.params;
    const prm = Object.fromEntries(params.map(q => [q.key, q]));

    // ---------- DOM
    const jointBox = h('div', { class: 'plot-box' });
    const condBox = h('div', { class: 'plot-box' });
    const regionReadout = h('p', { class: 'area-readout', 'aria-live': 'polite', hidden: true });
    const condReadout = h('p', { class: 'area-readout', 'aria-live': 'polite' });
    const panelBox = h('div', { class: 'explorer-params' }, h('h3', { class: 'mini-title' }, 'Parameters'));
    const areaBox = h('div', { class: 'explorer-area' }, h('h3', { class: 'mini-title' }, 'Probability inside an ellipse'));
    const readBox = h('div', { class: 'explorer-readouts' }, h('h3', { class: 'mini-title' }, 'Summary at these parameters'));
    container.appendChild(h('div', { class: 'explorer pd-mvn' },
      h('div', { class: 'explorer-plots' },
        h('figure', { class: 'plot-fig' }, h('figcaption', {}, 'Joint density f(x₁, x₂) with its 1- and 2-standard-deviation ellipses'), jointBox, regionReadout),
        h('figure', { class: 'plot-fig' }, h('figcaption', {}, 'Density of X₂: marginal, and conditional on X₁ = a'), condBox, condReadout)),
      h('div', { class: 'explorer-controls' }, panelBox, areaBox, readBox),
      h('p', { class: 'explorer-hint' }, 'Drag the amber handles, or type values in the boxes. A focused handle also moves with the arrow keys (hold Shift for larger steps); the mean point moves up and down with the up and down keys.')));

    // ---------- state
    const cur = () => store.get().p;
    const setP = patch => {
      const next = { ...cur() };
      for (const [k, v] of Object.entries(patch)) {
        const q = prm[k];
        if (!Number.isFinite(v)) return;
        next[k] = math.roundTo(clamp(v, q.min, q.max), k === 'rho' ? 0.005 : 0.01);
      }
      store.set({ p: next });
    };
    const slice = { a: cur().mu1 - 1.6 * cur().sigma1 };
    const reg = { on: false, k: 1.5 };
    const draws = { on: false, seed: 1, key: '', pts: [] };

    const panel = ui.paramPanel(panelBox, params, {
      get: cur, apply: (key, v) => setP({ [key]: v }),
      onReset: () => { store.set({ p: ctx.defaultParams(mod) }); slice.a = cur().mu1 - 1.6 * cur().sigma1; request(); },
    });
    const drawBtn = h('button', { type: 'button', class: 'btn small-btn' }, 'Show 500 random draws');
    drawBtn.addEventListener('click', () => { if (!draws.on) { draws.on = true; drawBtn.textContent = 'New random draws'; } else draws.seed++; request(); });
    const hideBtn = h('button', { type: 'button', class: 'btn small-btn' }, 'Hide draws');
    hideBtn.addEventListener('click', () => { draws.on = false; drawBtn.textContent = 'Show 500 random draws'; request(); });
    const indBtn = h('button', { type: 'button', class: 'btn small-btn' }, 'Independent: ρ = 0');
    indBtn.addEventListener('click', () => setP({ rho: 0 }));
    const actions = panel.el.querySelector('.param-actions');
    if (actions) { actions.classList.add('pd-buttons'); actions.append(indBtn, drawBtn, hideBtn); }

    const regToggle = ui.toggleSwitch('Shade the inside of an ellipse', false, on => { reg.on = on; regionReadout.hidden = !on; request(); });
    areaBox.append(regToggle.el, ui.rich('p', 'Shades the ellipse of points within $k$ standard deviations of the mean (in the sense of the Mahalanobis distance, which takes the correlation into account), and shows the probability inside it, $1 - e^{-k^2/2}$. Drag the amber knob on the ellipse to change $k$. The 1-standard-deviation ellipse holds 39.3% of the probability and the 2-standard-deviation ellipse 86.5%; in two dimensions the 95% ellipse has $k = 2.448$.', { class: 'small muted area-help' }));

    const readDl = h('dl', { class: 'readouts' });
    const readItems = [
      ['Covariance matrix Σ', p => `[[${f3(p.sigma1 ** 2)}, ${f3(p.rho * p.sigma1 * p.sigma2)}], [${f3(p.rho * p.sigma1 * p.sigma2)}, ${f3(p.sigma2 ** 2)}]]`],
      ['Covariance ρσ₁σ₂', p => f3(p.rho * p.sigma1 * p.sigma2)],
      ['Regression slope of X₂ on X₁, ρσ₂/σ₁', p => f3(p.rho * p.sigma2 / p.sigma1)],
      ['Conditional standard deviation σ₂√(1 − ρ²)', p => f3(p.sigma2 * Math.sqrt(1 - p.rho ** 2))],
      ['Share of the variance of X₂ explained by X₁, ρ²', p => f3(p.rho ** 2)],
      ['Peak density 1/(2πσ₁σ₂√(1 − ρ²))', p => f3(pdf([p.mu1, p.mu2], p))],
    ];
    const readEls = readItems.map(([label]) => { const dd = h('dd', { class: 'mono tnum' }); readDl.append(h('dt', {}, label), dd); return dd; });
    readBox.append(readDl);

    // ---------- plots
    const J = new plot.Plot(jointBox, { xLabel: 'x₁', yLabel: 'x₂', equalAspect: true, ariaLabel: 'Bivariate normal density', height: w => clamp(w * 0.86, 280, 440) });
    const C = new plot.Plot(condBox, { xLabel: 'x₂', yLabel: 'density', ariaLabel: 'Marginal and conditional density of X2', height: w => clamp(w * 0.86, 260, 440) });

    const target = p => ({ x: [p.mu1 - 3.6 * p.sigma1, p.mu1 + 3.6 * p.sigma1], y: [p.mu2 - 3.6 * p.sigma2, p.mu2 + 3.6 * p.sigma2] });
    /** Widen the shorter domain so one unit has the same length on both axes (as Plot does with equalAspect). */
    function equalize(v) {
      const I = J.inner, pw = I.x1 - I.x0, ph = I.y1 - I.y0;
      const ux = (v.x[1] - v.x[0]) / pw, uy = (v.y[1] - v.y[0]) / ph;
      if (ux > uy) { const c = (v.y[0] + v.y[1]) / 2, half = ux * ph / 2; return { x: v.x, y: [c - half, c + half] }; }
      const c = (v.x[0] + v.x[1]) / 2, half = uy * pw / 2; return { x: [c - half, c + half], y: v.y };
    }
    J.render({ x: target(cur()).x, y: target(cur()).y, layers: [] });
    const anim = new plot.DomainAnimator(equalize(target(cur())));
    let frozen = 0;
    const drag = { mu: null, s1: false, s2: false, rho: false, a: false, k: false };

    let raf = 0;
    const request = () => { if (!raf) raf = requestAnimationFrame(frame); };
    function frame() {
      raf = 0;
      if (!frozen) anim.setTarget(equalize(target(cur())));
      const moving = anim.step();
      draw();
      if (moving) request();
    }
    store.subscribe(() => { panel.update(cur()); request(); });
    new ResizeObserver(() => request()).observe(jointBox);

    const startDrag = key => { drag[key] = true; frozen++; };
    const endDrag = key => { if (drag[key]) { drag[key] = false; frozen = Math.max(0, frozen - 1); request(); } };

    function draw() {
      const p = cur();
      const { mu1, mu2, sigma1, sigma2, rho } = p;
      const v = anim.cur;
      const [x0, x1] = v.x, [y0, y1] = v.y;
      const sx = x1 - x0, sy = y1 - y0;

      // heatmap of the density over the drawn window
      const NX = 110, NY = clamp(Math.round(NX * sy / sx), 30, 200);
      const values = new Float64Array(NX * NY);
      for (let j = 0; j < NY; j++) {
        const yy = y0 + (j + 0.5) / NY * sy;
        for (let i = 0; i < NX; i++) values[j * NX + i] = pdf([x0 + (i + 0.5) / NX * sx, yy], p);
      }
      const peak = pdf([mu1, mu2], p);
      const layers = [{ id: 'heat', type: 'heatmap', x: [x0, x1], y: [y0, y1], nx: NX, ny: NY, values, max: peak }];

      // marginal densities along the bottom and left edges
      const f1 = plot.sampleFn(x => npdf(x, mu1, sigma1), x0, x1, 240).map(([x, f]) => [x, y0 + 0.13 * sy * f * sigma1 * Math.sqrt(2 * PI)]);
      const f2 = plot.sampleFn(y => npdf(y, mu2, sigma2), y0, y1, 240).map(([y, f]) => [x0 + 0.13 * sx * f * sigma2 * Math.sqrt(2 * PI), y]);
      layers.push({ id: 'm1f', type: 'area', points: f1, base: y0, cls: 'mv-margfill' });
      layers.push({ id: 'm1', type: 'line', points: f1, cls: 'mv-marg' });
      layers.push({ id: 'm2f', type: 'polygon', points: [[x0, y0], ...f2, [x0, y1]], cls: 'mv-margfill fill-steel outline' });
      layers.push({ id: 'm2', type: 'line', points: f2, cls: 'mv-marg' });
      layers.push({ id: 'm1t', type: 'text', x: mu1 + 2.3 * sigma1, y: y0 + 0.07 * sy, text: 'X₁', cls: 'mv-tag', anchor: 'start' });
      layers.push({ id: 'm2t', type: 'text', x: x0 + 0.1 * sx, y: mu2 - 1.45 * sigma2, text: 'X₂', cls: 'mv-tag', anchor: 'start' });

      // regression line E[X2 | X1 = x] and the rho track
      const slope = rho * sigma2 / sigma1;
      layers.push({ id: 'reg', type: 'line', points: [[x0, mu2 + slope * (x0 - mu1)], [x1, mu2 + slope * (x1 - mu1)]], cls: 'mv-reg' });
      layers.push({ id: 'track', type: 'segment', x1: mu1 + 2 * sigma1, y1: mu2 - 2 * sigma2, x2: mu1 + 2 * sigma1, y2: mu2 + 2 * sigma2, cls: 'mv-track' });

      // region
      let inCount = 0;
      if (reg.on) layers.push({ id: 'reg-k', type: 'polygon', points: ellipse(p, reg.k), cls: 'area-shade' });
      layers.push({ id: 'e1', type: 'polygon', points: ellipse(p, 1), cls: 'mv-ell' });
      layers.push({ id: 'e2', type: 'polygon', points: ellipse(p, 2), cls: 'mv-ell2' });

      // draws
      if (draws.on) {
        const key = [mu1, mu2, sigma1, sigma2, rho, draws.seed].join(',');
        if (draws.key !== key) {
          const rng = math.makeRng(900 + draws.seed);
          draws.pts = Array.from({ length: 500 }, () => mod.sample(rng, p));
          draws.key = key;
        }
        draws.pts.forEach((pt, i) => {
          const isIn = reg.on && maha2(pt, p) <= reg.k * reg.k;
          if (isIn) inCount++;
          layers.push({ id: 's' + i, type: 'dot', x: pt[0], y: pt[1], r: 1.8, cls: isIn ? 'mv-draw-in' : 'mv-draw' });
        });
      }

      // conditional slice at x1 = a
      // keep the slice inside the view and within 3.6 standard deviations of mu1, so that the conditional mean
      // stays inside the fixed window of the right plot
      if (!drag.a) slice.a = clamp(slice.a, Math.max(x0 + 0.02 * sx, mu1 - 3.6 * sigma1), Math.min(x1 - 0.02 * sx, mu1 + 3.6 * sigma1));
      else slice.a = clamp(slice.a, mu1 - 3.6 * sigma1, mu1 + 3.6 * sigma1);
      const a = slice.a;
      const cm = mu2 + slope * (a - mu1), cs = sigma2 * Math.sqrt(1 - rho * rho);
      layers.push({ id: 'cm', type: 'bracket', x: a, y1: cm - cs, y2: cm + cs, side: 'left', label: '±1 sd' });
      layers.push({ id: 'cmd', type: 'dot', x: a, y: cm, r: 3.5 });

      const kAt = reg.on ? ellPt(p, reg.k, 0.75 * PI) : null;
      // the sigma arrows sit on the marginal curves at their inflection points (height e^{-1/2} of the peak)
      const yInf = y0 + 0.13 * sy * Math.exp(-0.5), xInf = x0 + 0.13 * sx * Math.exp(-0.5);
      // the mean comes last so that its knob is drawn on top
      const handles = [
        {
          id: 'slice', type: 'vline', x: a, label: 'a', color: 'steel',
          ariaLabel: 'Conditioning value a for X₁. Drag left or right, or use the arrow keys.', valueText: f3(a), valueNow: a,
          onDrag: (pt, phase) => {
            if (phase === 'start') startDrag('a');
            if (pt && drag.a) { slice.a = pt.x; request(); }
            if (phase === 'end') endDrag('a');
          },
          onKey: steps => { slice.a += 0.05 * sigma1 * steps; request(); },
        },
        {
          id: 'sigma1', type: 'hArrow', from: { x: mu1, y: yInf }, to: { x: mu1 + sigma1, y: yInf }, label: 'σ₁',
          ariaLabel: 'Standard deviation σ₁ of X₁. Drag the tip left or right, or use the arrow keys.', valueText: f3(sigma1), valueNow: sigma1,
          onDrag: (pt, phase) => {
            if (phase === 'start') startDrag('s1');
            if (pt && drag.s1) setP({ sigma1: pt.x - cur().mu1 });
            if (phase === 'end') endDrag('s1');
          },
          onKey: steps => setP({ sigma1: cur().sigma1 + 0.02 * steps }),
        },
        {
          id: 'sigma2', type: 'vArrow', from: { x: xInf, y: mu2 }, to: { x: xInf, y: mu2 + sigma2 }, label: 'σ₂',
          ariaLabel: 'Standard deviation σ₂ of X₂. Drag the tip up or down, or use the arrow keys.', valueText: f3(sigma2), valueNow: sigma2,
          onDrag: (pt, phase) => {
            if (phase === 'start') startDrag('s2');
            if (pt && drag.s2) setP({ sigma2: pt.y - cur().mu2 });
            if (phase === 'end') endDrag('s2');
          },
          onKey: steps => setP({ sigma2: cur().sigma2 + 0.02 * steps }),
        },
        {
          id: 'rho', type: 'vArrow', from: { x: mu1 + 2 * sigma1, y: mu2 }, to: { x: mu1 + 2 * sigma1, y: mu2 + 2 * rho * sigma2 }, label: 'ρ',
          ariaLabel: 'Correlation ρ. Drag the knob up or down along the dotted track, or use the arrow keys.', valueText: f3(rho), valueNow: rho, valueMin: -0.99, valueMax: 0.99,
          onDrag: (pt, phase) => {
            if (phase === 'start') startDrag('rho');
            if (pt && drag.rho) { const c = cur(); setP({ rho: (pt.y - c.mu2) / (2 * c.sigma2) }); }
            if (phase === 'end') endDrag('rho');
          },
          onKey: steps => setP({ rho: cur().rho + 0.01 * steps }),
        },
        {
          id: 'mu', type: 'point', at: { x: mu1, y: mu2 }, label: 'μ',
          ariaLabel: 'Mean (μ₁, μ₂). Drag to move the distribution, or use the arrow keys.', valueText: `${f3(mu1)}, ${f3(mu2)}`, valueNow: mu1,
          onDrag: (pt, phase) => {
            if (phase === 'start') { startDrag('mu'); drag.muA = slice.a - mu1; }
            if (pt && drag.mu) { setP({ mu1: pt.x, mu2: pt.y }); slice.a = cur().mu1 + drag.muA; }
            if (phase === 'end') endDrag('mu');
          },
          onKey: (steps, axis) => (axis === 'y' ? setP({ mu2: cur().mu2 + 0.05 * steps }) : setP({ mu1: cur().mu1 + 0.05 * steps })),
        },
      ];
      if (reg.on) {
        handles.push({
          id: 'k', type: 'point', at: { x: kAt[0], y: kAt[1] }, label: 'k',
          ariaLabel: 'Size k of the shaded ellipse, in standard deviations. Drag toward or away from the mean, or use the arrow keys.', valueText: f3(reg.k), valueNow: reg.k, valueMin: 0.1, valueMax: 4,
          onDrag: (pt, phase) => {
            if (phase === 'start') startDrag('k');
            if (pt && drag.k) { reg.k = math.roundTo(clamp(Math.sqrt(maha2([pt.x, pt.y], cur())), 0.1, 4), 0.01); request(); }
            if (phase === 'end') endDrag('k');
          },
          onKey: steps => { reg.k = math.roundTo(clamp(reg.k + 0.05 * steps, 0.1, 4), 0.01); request(); },
        });
      }
      J.render({ x: [x0, x1], y: [y0, y1], layers, handles });

      // ---- conditional plot
      // window for X2: 4.3 standard deviations around mu2 (the conditional density always lies inside it)
      const [c0, c1] = [mu2 - 4.3 * sigma2, mu2 + 4.3 * sigma2];
      const marg = plot.sampleFn(y => npdf(y, mu2, sigma2), c0, c1, 300);
      const cond = plot.sampleFn(y => npdf(y, cm, cs), c0, c1, 600);
      const ymax = Math.max(npdf(0, 0, sigma2), npdf(0, 0, cs)) * 1.12;
      C.render({
        x: [c0, c1], y: [0, ymax],
        layers: [
          { id: 'cf', type: 'area', points: cond, cls: 'pdf-fill' },
          { id: 'c', type: 'line', points: cond, cls: 'curve-main' },
          { id: 'm', type: 'line', points: marg, cls: 'curve-ref' },
          { id: 'cmv', type: 'segment', x1: cm, y1: 0, x2: cm, y2: npdf(cm, cm, cs), cls: 'mean-line' },
          { id: 'mmv', type: 'segment', x1: mu2, y1: 0, x2: mu2, y2: npdf(mu2, mu2, sigma2), cls: 'ref-line' },
        ],
        legend: [
          { label: `X₂ given X₁ = ${f3(a)}: Normal(mean ${f3(cm)}, sd ${f3(cs)})`, cls: 'curve-main' },
          { label: `X₂ alone: Normal(mean ${f3(mu2)}, sd ${f3(sigma2)})`, cls: 'curve-ref' },
        ],
      });
      ui.renderRich(condReadout, `Knowing $X_1 = a$ = ${f3(a)} moves the center of $X_2$ to $\\mu_2 + \\rho\\frac{\\sigma_2}{\\sigma_1}(a - \\mu_1)$ = <b>${f3(cm)}</b> and shrinks its standard deviation from ${f3(sigma2)} to $\\sigma_2\\sqrt{1-\\rho^2}$ = <b>${f3(cs)}</b>. The dashed steel line in the left plot marks $a$; drag its knob.`);

      if (reg.on) {
        const pr = 1 - Math.exp(-0.5 * reg.k * reg.k);
        ui.renderRich(regionReadout, `Probability inside the $k$ = ${f3(reg.k)} ellipse: $1 - e^{-k^2/2}$ = <b>${ui.fmt(pr, 4)}</b>`
          + (draws.on ? ` (${inCount} of the 500 draws, ${ui.fmt(inCount / 500, 3)}).` : '.'));
      }
      readItems.forEach(([, fn], i) => { readEls[i].textContent = fn(p); });
    }

    draw();
  },

  // ---------------------------------------------------------------- content
  content: {
    description: [
      'The multivariate normal distribution describes several continuous variables that are each normally distributed and may be correlated with one another, such as the heights and weights of people, the scores of the same students on two tests, or the reaction time and accuracy of participants. Each observation is a vector $\\mathbf X = (X_1, \\dots, X_d)$ of $d$ real numbers. The density is highest at the mean vector and falls off in elliptical contours around it.',
      'It has two parameters: the mean vector $\\boldsymbol\\mu$, which gives the center of each variable, and the covariance matrix $\\Sigma$, which holds each variable’s variance on its diagonal and the covariance of each pair of variables off the diagonal. With two variables ($d = 2$, the bivariate normal shown here) the covariance matrix is described by the two standard deviations $\\sigma_1$, $\\sigma_2$ and the correlation $\\rho$. Every single variable, every weighted sum of the variables, and every conditional distribution of some variables given the others is again normal.',
    ],
    explorerIntro: 'The left plot shows the joint density of $(X_1, X_2)$ as shading, with the ellipses that lie 1 and 2 standard deviations from the mean (solid and dashed). Both axes use the same scale, so the shapes are true to life. The curves along the bottom and left edges are the marginal densities of $X_1$ and $X_2$. Drag the amber point to move the mean $(\\mu_1, \\mu_2)$. The standard deviations are set on the marginal curves, as on the normal page: drag the tip of the horizontal arrow on the bottom curve (from $\\mu_1$ to $\\mu_1 + \\sigma_1$, at the height of the curve’s inflection point) to change $\\sigma_1$, and the tip of the vertical arrow on the left curve (from $\\mu_2$ to $\\mu_2 + \\sigma_2$) to change $\\sigma_2$. The correlation $\\rho$ is set by the knob on the dotted track at $x_1 = \\mu_1 + 2\\sigma_1$: its height above the mean is $2\\rho\\sigma_2$, and it marks the rightmost point of the 2-standard-deviation ellipse, which always lies on the dotted regression line $\\mathrm{E}[X_2 \\mid X_1]$. The dashed steel line at $x_1 = a$ is a slice: the right plot shows the conditional density of $X_2$ given $X_1 = a$ next to the marginal density of $X_2$. Instead of the area-under-the-curve tool, the tool below shades the inside of an ellipse and gives its probability.',
    parameterization: 'Mean vector $\\boldsymbol\\mu \\in \\mathbb R^d$ and covariance matrix $\\Sigma$ ($d \\times d$, symmetric and positive definite). The explorer uses $d = 2$ with $\\Sigma = \\begin{pmatrix} \\sigma_1^2 & \\rho\\sigma_1\\sigma_2 \\\\ \\rho\\sigma_1\\sigma_2 & \\sigma_2^2 \\end{pmatrix}$. Other common forms use the precision matrix $\\Sigma^{-1}$ (in Gaussian graphical models and in BUGS/JAGS), or a Cholesky factor $L$ with $\\Sigma = LL^{\\top}$ (in Stan, <code>multi_normal_cholesky</code>, usually with an LKJ prior on the correlation matrix).',

    pdfTex: 'f(\\mathbf x \\mid \\boldsymbol\\mu, \\Sigma) = \\frac{1}{(2\\pi)^{d/2} \\, |\\Sigma|^{1/2}} \\exp\\!\\left( -\\tfrac12 (\\mathbf x - \\boldsymbol\\mu)^{\\top} \\Sigma^{-1} (\\mathbf x - \\boldsymbol\\mu) \\right)',
    glossary: [
      { sym: '\\mathbf x', meaning: 'A possible value of the random vector $\\mathbf X$: a column of $d$ real numbers $(x_1, \\dots, x_d)$.' },
      { sym: 'd', meaning: 'The number of variables (the dimension). The explorer shows $d = 2$.' },
      { sym: '\\boldsymbol\\mu', meaning: 'The mean vector $(\\mu_1, \\dots, \\mu_d)$: the center of the distribution. It is also the point of highest density.' },
      { sym: '\\Sigma', meaning: 'The covariance matrix. Its diagonal entries are the variances $\\sigma_j^2$, and its off-diagonal entries are the covariances $\\rho_{ij}\\sigma_i\\sigma_j$. It must be symmetric and positive definite.' },
      { sym: '|\\Sigma|', meaning: 'The determinant of $\\Sigma$, a measure of the overall spread; $|\\Sigma|^{1/2}$ plays the role of $\\sigma$ in the one-dimensional normal. For $d = 2$ it is $\\sigma_1^2\\sigma_2^2(1 - \\rho^2)$.' },
      { sym: '\\Sigma^{-1}', meaning: 'The inverse of the covariance matrix, also called the precision matrix.' },
      { sym: '(\\mathbf x - \\boldsymbol\\mu)^{\\top} \\Sigma^{-1} (\\mathbf x - \\boldsymbol\\mu)', meaning: 'The squared Mahalanobis distance of $\\mathbf x$ from the mean: the squared distance measured in standard deviations, taking the correlations into account. Its contours are the ellipses in the plot. The superscript $\\top$ means transpose (a row vector).' },
      { sym: '\\pi', meaning: 'The constant 3.14159….' },
      { sym: '\\exp(\\cdot)', meaning: 'The exponential function $e^{(\\cdot)}$.' },
    ],

    cdfTex: 'F(\\mathbf x) = P(X_1 \\le x_1, \\dots, X_d \\le x_d) = \\int_{-\\infty}^{x_1} \\!\\!\\cdots\\! \\int_{-\\infty}^{x_d} f(\\mathbf y \\mid \\boldsymbol\\mu, \\Sigma)\\, d\\mathbf y, \\qquad P(X_j \\le x_j) = \\Phi\\!\\left(\\frac{x_j - \\mu_j}{\\sigma_j}\\right)',
    cdfIntro: 'The joint CDF has no closed form. It is computed numerically, for example with Genz’s algorithm for multivariate normal probabilities (in R, <code>mvtnorm::pmvnorm</code>). Probabilities about one variable come from its normal margin, and probabilities of ellipses around the mean have the simple formula in the properties table.',
    cdfGlossary: [
      { sym: 'F(\\mathbf x)', meaning: 'The joint cumulative distribution function: the probability that every coordinate is at most the matching entry of $\\mathbf x$ (the lower-left quadrant below $\\mathbf x$ when $d = 2$).' },
      { sym: 'd\\mathbf y', meaning: 'Integration over all $d$ coordinates of $\\mathbf y$.' },
      { sym: 'f(\\mathbf y \\mid \\boldsymbol\\mu, \\Sigma)', meaning: 'The joint density above.' },
      { sym: '\\Phi(z)', meaning: 'The CDF of the standard normal distribution, computed numerically.' },
      { sym: '\\mu_j,\\ \\sigma_j', meaning: 'The mean and standard deviation of variable $j$; $\\sigma_j^2$ is the $j$-th diagonal entry of $\\Sigma$.' },
    ],
    extraFormulas: [
      {
        title: 'The bivariate case',
        intro: 'With $d = 2$, standard deviations $\\sigma_1, \\sigma_2$ and correlation $\\rho$, the density can be written with the standardized values $z_j = (x_j - \\mu_j)/\\sigma_j$:',
        tex: 'f(x_1, x_2) = \\frac{1}{2\\pi\\sigma_1\\sigma_2\\sqrt{1 - \\rho^2}} \\exp\\!\\left( -\\frac{z_1^2 - 2\\rho z_1 z_2 + z_2^2}{2(1 - \\rho^2)} \\right)',
        glossary: [
          { sym: 'z_1,\\ z_2', meaning: 'The standardized values (z-scores) of $x_1$ and $x_2$.' },
          { sym: '\\rho', meaning: 'The correlation between $X_1$ and $X_2$, strictly between $-1$ and 1.' },
          { sym: '\\sigma_1,\\ \\sigma_2', meaning: 'The standard deviations of $X_1$ and $X_2$.' },
        ],
      },
      {
        title: 'Conditional distribution',
        intro: 'Given the value of $X_1$, the other variable is normal with a mean on the regression line and a smaller standard deviation that does not depend on the value observed:',
        tex: 'X_2 \\mid X_1 = a \\;\\sim\\; \\mathcal N\\!\\left( \\mu_2 + \\rho\\frac{\\sigma_2}{\\sigma_1}(a - \\mu_1),\\ \\ \\sigma_2^2 (1 - \\rho^2) \\right)',
        glossary: [
          { sym: 'a', meaning: 'The observed value of $X_1$.' },
          { sym: '\\rho\\frac{\\sigma_2}{\\sigma_1}', meaning: 'The regression slope of $X_2$ on $X_1$.' },
          { sym: '\\sigma_2^2(1 - \\rho^2)', meaning: 'The conditional (residual) variance; the fraction $\\rho^2$ of the variance of $X_2$ is explained by $X_1$.' },
          { sym: '\\mathcal N(m, v)', meaning: 'A normal distribution with mean $m$ and variance $v$.' },
        ],
      },
    ],

    properties: [
      { name: 'Support', tex: '\\mathbf x \\in \\mathbb R^d', explain: 'Every vector of real numbers has positive density, as long as $\\Sigma$ is positive definite. If $\\Sigma$ is singular (for example $|\\rho| = 1$), all the probability lies on a lower-dimensional line or plane and there is no density.' },
      { name: 'Mean', tex: '\\mathrm{E}[\\mathbf X] = \\boldsymbol\\mu', value: p => `(${f3(p.mu1)}, ${f3(p.mu2)})`, explain: 'The mean vector, one mean for each variable.' },
      { name: 'Median', tex: '\\boldsymbol\\mu', value: p => `(${f3(p.mu1)}, ${f3(p.mu2)})`, explain: 'A vector has no single median. The distribution is symmetric about $\\boldsymbol\\mu$, so the median of each variable $X_j$ is its mean $\\mu_j$, and the median of every weighted sum $\\mathbf a^{\\top}\\mathbf X$ is $\\mathbf a^{\\top}\\boldsymbol\\mu$.' },
      { name: 'Mode', tex: '\\boldsymbol\\mu', value: p => `(${f3(p.mu1)}, ${f3(p.mu2)})`, explain: 'The density is highest at the mean vector.' },
      { name: 'Variance', tex: '\\mathrm{Cov}(\\mathbf X) = \\Sigma', value: p => `σ₁² = ${f3(p.sigma1 ** 2)}, σ₂² = ${f3(p.sigma2 ** 2)}`, explain: 'The covariance matrix plays the role of the variance. Its diagonal holds the variances of the separate variables (shown in the value column).' },
      { name: 'Standard deviation', tex: '\\sigma_j = \\sqrt{\\Sigma_{jj}}', value: p => `(${f3(p.sigma1)}, ${f3(p.sigma2)})`, explain: 'The standard deviation of each variable. The overall spread of the vector is often summarized by $|\\Sigma|^{1/2}$, the generalized standard deviation.' },
      { name: 'Covariance and correlation', tex: '\\mathrm{Cov}(X_1, X_2) = \\rho\\sigma_1\\sigma_2', value: p => f3(p.rho * p.sigma1 * p.sigma2), explain: 'The off-diagonal entry of $\\Sigma$. For a multivariate normal, zero correlation means independence, which is not true for most other distributions.' },
      { name: 'Skewness', tex: '0', value: () => 0, explain: 'Every variable and every weighted sum is a symmetric normal, so there is no skewness; Mardia’s multivariate skewness is also 0.' },
      { name: 'Excess kurtosis', tex: '0', value: () => 0, explain: 'Every margin has excess kurtosis 0. Mardia’s multivariate kurtosis, $\\mathrm{E}[D_M^4]$, equals $d(d + 2)$ (8 for $d = 2$); tests of multivariate normality compare the sample value with this.' },
      { name: 'Entropy', tex: '\\tfrac12 \\ln\\!\\left( (2\\pi e)^d |\\Sigma| \\right)', value: p => entropy(p), explain: 'Differential entropy in nats; for $d = 2$ it is $\\ln(2\\pi e\\,\\sigma_1\\sigma_2\\sqrt{1-\\rho^2})$. Among all distributions with a given covariance matrix, the multivariate normal has the largest entropy. Correlation lowers it, because correlated variables carry overlapping information.' },
      { name: 'Moment-generating function', tex: 'M(\\mathbf t) = \\exp\\!\\left(\\mathbf t^{\\top}\\boldsymbol\\mu + \\tfrac12 \\mathbf t^{\\top}\\Sigma\\,\\mathbf t\\right)', explain: '$\\mathrm{E}[e^{\\mathbf t^{\\top}\\mathbf X}]$ for a vector $\\mathbf t$. It shows at once that $\\mathbf a^{\\top}\\mathbf X$ is normal with mean $\\mathbf a^{\\top}\\boldsymbol\\mu$ and variance $\\mathbf a^{\\top}\\Sigma\\mathbf a$.' },
      { name: 'Characteristic function', tex: '\\varphi(\\mathbf t) = \\exp\\!\\left(i\\,\\mathbf t^{\\top}\\boldsymbol\\mu - \\tfrac12 \\mathbf t^{\\top}\\Sigma\\,\\mathbf t\\right)', explain: '$\\mathrm{E}[e^{i\\mathbf t^{\\top}\\mathbf X}]$, where $i = \\sqrt{-1}$. It also defines the distribution when $\\Sigma$ is singular.' },
      { name: 'Linear transformations', tex: 'A\\mathbf X + \\mathbf b \\sim \\mathrm{MVN}(A\\boldsymbol\\mu + \\mathbf b,\\ A\\Sigma A^{\\top})', explain: 'Any matrix $A$ and vector $\\mathbf b$ give another multivariate normal. In particular every margin $X_j \\sim \\mathcal N(\\mu_j, \\sigma_j^2)$, and $\\mathbf X = \\boldsymbol\\mu + L\\mathbf Z$ with independent standard normals $\\mathbf Z$ and $\\Sigma = LL^{\\top}$.' },
      { name: 'Probability inside an ellipse', tex: 'P\\big((\\mathbf X - \\boldsymbol\\mu)^{\\top}\\Sigma^{-1}(\\mathbf X - \\boldsymbol\\mu) \\le k^2\\big) = P(\\chi^2_d \\le k^2)', value: () => '0.393 (k = 1), 0.865 (k = 2)', explain: 'The squared Mahalanobis distance is chi-squared with $d$ degrees of freedom. For $d = 2$ this probability is $1 - e^{-k^2/2}$, so the 1-standard-deviation ellipse holds 39.3%, the 2-standard-deviation ellipse 86.5%, and the 95% ellipse has $k = 2.448$.' },
      { name: 'Peak height', tex: 'f(\\boldsymbol\\mu) = (2\\pi)^{-d/2} |\\Sigma|^{-1/2}', value: p => pdf([p.mu1, p.mu2], p), explain: 'The density at the mean. A stronger correlation makes the ellipses thinner and the peak higher, since the same probability sits on a smaller area.' },
    ],

    limits: [
      { text: '<b>One dimension: the normal distribution.</b> With $d = 1$ the multivariate normal is $\\mathcal N(\\mu, \\sigma^2)$. Conversely, any linear transformation $\\boldsymbol\\mu + L\\mathbf Z$ of independent standard normals is multivariate normal, and every margin and every weighted sum $\\mathbf a^{\\top}\\mathbf X$ of a multivariate normal is normal.', relation: 'normal--multivariate-normal', to: 'normal' },
      { text: '<b>Squared Mahalanobis distance.</b> $(\\mathbf X - \\boldsymbol\\mu)^{\\top}\\Sigma^{-1}(\\mathbf X - \\boldsymbol\\mu) \\sim \\chi^2_d$. This gives the probability content of the ellipses and the chi-squared distribution of Wald tests.', relation: 'multivariate-normal--chi-squared', to: 'chi-squared' },
      { text: '<b>No correlation: independent normals.</b> With $\\rho = 0$ (a diagonal $\\Sigma$) the density factors into the product of the marginal normal densities, so the variables are independent. With $\\sigma_1 = \\sigma_2$ as well the contours are circles.' },
      { text: '<b>Correlation near ±1: a degenerate distribution.</b> As $|\\rho| \\to 1$ the ellipses collapse onto the line $x_2 = \\mu_2 \\pm (\\sigma_2/\\sigma_1)(x_1 - \\mu_1)$, $|\\Sigma| \\to 0$ and the density no longer exists; $X_2$ becomes an exact linear function of $X_1$.' },
      { text: '<b>Multivariate central limit theorem.</b> The average of $n$ independent random vectors with mean $\\boldsymbol\\mu$ and finite covariance $\\Sigma$ satisfies $\\sqrt n(\\bar{\\mathbf X} - \\boldsymbol\\mu) \\xrightarrow{d} \\mathrm{MVN}(\\mathbf 0, \\Sigma)$. For example, multinomial counts and maximum-likelihood estimates are approximately multivariate normal in large samples.', to: 'multinomial' },
      { text: '<b>Heavier tails: the multivariate t.</b> Dividing a zero-mean multivariate normal vector by $\\sqrt{W/\\nu}$, with $W \\sim \\chi^2_\\nu$ independent of it, and adding $\\boldsymbol\\mu$ gives the multivariate Student t distribution, which approaches the multivariate normal as $\\nu \\to \\infty$.', to: 'student-t' },
      { text: '<b>Distributions for the covariance matrix.</b> The sample covariance matrix of multivariate normal data has a Wishart distribution (a multivariate generalization of the chi-squared and gamma distributions). The inverse-Wishart (a multivariate inverse-gamma) and the LKJ distribution over correlation matrices are common priors for $\\Sigma$. These distributions of matrices are not shown on the map.' },
    ],

    uses: {
      frequentist: [
        '<b>Multiple regression and the general linear model.</b> With normal errors, the least-squares coefficient estimates are multivariate normal, $\\hat{\\boldsymbol\\beta} \\sim \\mathrm{MVN}(\\boldsymbol\\beta, \\sigma^2(X^{\\top}X)^{-1})$, which gives their standard errors, covariances and joint confidence regions.',
        '<b>Multivariate tests.</b> Hotelling’s $T^2$ test compares mean vectors, and MANOVA compares several groups on several outcomes at once; both assume multivariate normal data.',
        '<b>Large-sample inference.</b> Maximum-likelihood estimates are approximately multivariate normal with covariance equal to the inverse Fisher information. Wald tests of several parameters at once use the resulting chi-squared distribution of $(\\hat{\\boldsymbol\\theta} - \\boldsymbol\\theta_0)^{\\top}\\widehat{\\mathrm{Cov}}^{-1}(\\hat{\\boldsymbol\\theta} - \\boldsymbol\\theta_0)$.',
        '<b>Linear mixed models.</b> Random intercepts and slopes for participants or items are modeled as multivariate normal, and the response vector of each participant is then multivariate normal with a structured covariance matrix.',
        '<b>Discriminant analysis, principal components and factor analysis.</b> Linear and quadratic discriminant analysis classify observations under multivariate normal class distributions; PCA and factor analysis describe the covariance matrix, and maximum-likelihood factor analysis assumes multivariate normality.',
        '<b>Outlier detection.</b> Points whose squared Mahalanobis distance exceeds a chi-squared quantile are flagged as multivariate outliers.',
      ],
      bayesian: [
        '<b>Conjugate prior for a mean vector.</b> With data $\\mathbf x_1, \\dots, \\mathbf x_n \\sim \\mathrm{MVN}(\\boldsymbol\\mu, \\Sigma)$ ($\\Sigma$ known) and prior $\\boldsymbol\\mu \\sim \\mathrm{MVN}(\\boldsymbol\\mu_0, \\Lambda_0)$, the posterior is multivariate normal with precision $\\Lambda_n^{-1} = \\Lambda_0^{-1} + n\\Sigma^{-1}$ and mean $\\Lambda_n(\\Lambda_0^{-1}\\boldsymbol\\mu_0 + n\\Sigma^{-1}\\bar{\\mathbf x})$. With unknown $\\Sigma$, the normal–inverse-Wishart prior is conjugate.',
        '<b>Bayesian linear regression.</b> A multivariate normal prior on the coefficients gives a multivariate normal posterior when the error variance is known. When it is unknown, the conjugate normal–inverse-gamma prior (or the usual noninformative prior) gives a multivariate t marginal posterior for the coefficients.',
        '<b>Hierarchical models.</b> Correlated group-level effects get a multivariate normal prior, usually parameterized by standard deviations and a correlation matrix with an LKJ prior (as in Stan and brms).',
        '<b>Approximate posteriors.</b> In large samples the posterior is approximately multivariate normal around its mode (Bernstein–von Mises); the Laplace approximation and Gaussian variational inference use this.',
        '<b>Gaussian processes.</b> A Gaussian process prior on an unknown function makes its values at any finite set of points multivariate normal, so predictions follow from the conditioning formula.',
      ],
      modeling: [
        '<b>General recognition theory.</b> Multidimensional signal detection models represent perceptual effects of stimuli as bivariate normal distributions; correlations and unequal variances describe perceptual dependence and separability (Ashby & Townsend, 1986).',
        '<b>Kalman filters and state-space models.</b> A hidden state that changes over time (a position, a belief, a learning rate) and the noisy measurements of it are jointly multivariate normal, so the state is tracked by repeated conditioning.',
        '<b>Neural population codes.</b> Trial-to-trial variability of many neurons, or of fMRI voxel patterns, is often modeled as multivariate normal; the correlations (noise correlations) affect how much information a population carries.',
        '<b>Gaussian mixture models.</b> Clustering and density estimation with mixtures of multivariate normals, fitted with the EM algorithm.',
        '<b>Simulation of correlated variables.</b> Correlated normal variables are simulated as $\\boldsymbol\\mu + L\\mathbf Z$ with $L$ the Cholesky factor of $\\Sigma$ (as the explorer does); Gaussian copulas use the same idea to correlate non-normal variables.',
      ],
    },

    references: [
      { text: 'Wikipedia: Multivariate normal distribution.', url: 'https://en.wikipedia.org/wiki/Multivariate_normal_distribution' },
      { text: 'Anderson, T. W. (2003). <i>An Introduction to Multivariate Statistical Analysis</i> (3rd ed.), Chapters 2–3. Wiley.' },
      { text: 'Johnson, R. A., & Wichern, D. W. (2007). <i>Applied Multivariate Statistical Analysis</i> (6th ed.), Chapter 4. Pearson.' },
      { text: 'Kotz, S., Balakrishnan, N., & Johnson, N. L. (2000). <i>Continuous Multivariate Distributions</i>, Vol. 1 (2nd ed.), Chapters 45–46. Wiley.' },
      { text: 'Gelman, A., Carlin, J. B., Stern, H. S., Dunson, D. B., Vehtari, A., & Rubin, D. B. (2013). <i>Bayesian Data Analysis</i> (3rd ed.), Sections 3.5–3.6 and Appendix A. CRC Press.', url: 'http://www.stat.columbia.edu/~gelman/book/' },
      { text: 'Casella, G., & Berger, R. L. (2002). <i>Statistical Inference</i> (2nd ed.), Section 4.5 (bivariate normal). Duxbury.' },
      { text: 'Ashby, F. G., & Townsend, J. T. (1986). Varieties of perceptual independence. <i>Psychological Review</i>, 93(2), 154–179.', url: 'https://doi.org/10.1037/0033-295X.93.2.154' },
      { text: 'Rasmussen, C. E., & Williams, C. K. I. (2006). <i>Gaussian Processes for Machine Learning</i>. MIT Press.', url: 'http://gaussianprocess.org/gpml/' },
    ],
  },
};

export default mod;
