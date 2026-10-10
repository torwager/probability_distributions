// Dirichlet distribution: a distribution over probability vectors (x_1, ..., x_K) with x_j > 0 and sum 1.
// Follows the structure of the reference module dists/normal.js (see ARCHITECTURE.md).
//
// The page shows K = 3 (catalog parameters alpha1, alpha2, alpha3). pdf takes a vector [x1, x2, x3]
// (or [x1, x2], in which case x3 = 1 - x1 - x2); it is the density with respect to area in the
// (x1, x2) coordinates, the usual convention. stats() reports the marginal moments of X_1, which is
// Beta(alpha1, alpha0 - alpha1), the first coordinate of the joint mode, and the entropy of the whole vector.
//
// Custom explorer: the density as a heatmap on the triangle (simplex) with a draggable mean point that keeps
// the total concentration alpha0; the three marginal Beta densities; a bar chart of the concentrations with
// one drag handle per bar (log scale); a region tool (P(X_j > t) as a corner of the triangle and as an area
// under the marginal density); and optional random draws.

import { catalogParams } from '../catalog.js';
import { lgamma, digamma, betaI, betaIinv, clamp } from '../core/math.js';

const SQ3 = Math.sqrt(3) / 2;
const SUB = ['₁', '₂', '₃'];
const f3 = v => (Number.isFinite(v) ? String(Number(Number(v).toPrecision(3))).replace(/^-/, '−') : 'undefined');
const vec = arr => '(' + arr.map(f3).join(', ') + ')';
const alphasOf = p => [p.alpha1, p.alpha2, p.alpha3];

/** log density at a probability vector. */
function logPdfA(x, a) {
  const K = a.length;
  const xs = x.length === K - 1 ? [...x, 1 - x.reduce((s, v) => s + v, 0)] : x;
  if (xs.length !== K) return -Infinity;
  let s = 0, lp = 0, a0 = 0;
  for (let j = 0; j < K; j++) {
    const v = xs[j];
    if (!(v > 0) || v >= 1) return -Infinity;
    s += v;
    a0 += a[j];
    lp += (a[j] - 1) * Math.log(v) - lgamma(a[j]);
  }
  if (Math.abs(s - 1) > 1e-9) return -Infinity;
  return lp + lgamma(a0);
}
const pdf = (x, p) => Math.exp(logPdfA(x, alphasOf(p)));

/** Beta(a, b) density (used for the marginals). */
const betaPdf = (x, a, b) => (x <= 0 || x >= 1 ? 0 : Math.exp((a - 1) * Math.log(x) + (b - 1) * Math.log1p(-x) + lgamma(a + b) - lgamma(a) - lgamma(b)));

function entropyA(a) {
  const a0 = a.reduce((s, v) => s + v, 0), K = a.length;
  let lB = -lgamma(a0), sum = 0;
  for (const v of a) { lB += lgamma(v); sum += (v - 1) * digamma(v); }
  return lB + (a0 - K) * digamma(a0) - sum;
}

/** Moments of the marginal Beta(a, b). */
function betaMoments(a, b) {
  const s = a + b;
  return {
    mean: a / s, variance: a * b / (s * s * (s + 1)),
    skewness: 2 * (b - a) * Math.sqrt(s + 1) / ((s + 2) * Math.sqrt(a * b)),
    exKurtosis: 6 * ((a - b) ** 2 * (s + 1) - a * b * (s + 2)) / (a * b * (s + 2) * (s + 3)),
  };
}

/** Joint mode (alpha_j - 1)/(alpha0 - K), defined when every alpha_j > 1. */
function jointMode(a) {
  const a0 = a.reduce((s, v) => s + v, 0);
  return a.every(v => v > 1) ? a.map(v => (v - 1) / (a0 - a.length)) : null;
}

/** The joint mode as text: the formula also holds on an edge when some alpha_j = 1 and the others are larger. */
function modeText(a) {
  if (a.every(v => v === 1)) return 'none: the density is flat';
  if (a.some(v => v < 1)) return 'none: unbounded near an edge (some αⱼ < 1)';
  const a0 = a.reduce((s, v) => s + v, 0);
  return vec(a.map(v => (v - 1) / (a0 - a.length)));
}

function stats(p) {
  const a = alphasOf(p);
  const a0 = a[0] + a[1] + a[2];
  const m = betaMoments(a[0], a0 - a[0]);
  const mode = jointMode(a);
  return {
    mean: m.mean, variance: m.variance, sd: Math.sqrt(m.variance), median: betaIinv(0.5, a[0], a0 - a[0]),
    mode: mode ? mode[0] : NaN, skewness: m.skewness, exKurtosis: m.exKurtosis, entropy: entropyA(a),
  };
}

// ------------------------------------------------------------------ scoped styles for the custom explorer
const STYLE = `
@media (max-width: 760px) { .pd-dir .plot-fig + .plot-fig, .pd-dir .pd-row { margin-top: 1.2rem; } }
.plot.pd-simplex .gridline, .plot.pd-simplex .axis-line, .plot.pd-simplex .tick, .plot.pd-simplex .tick-label { display: none; }
.plot.pd-alpha .gridline, .plot.pd-alpha .tick-label { display: none; }
.pd-dir .layer.dir-tri .poly { fill: none; stroke: var(--ink-2); stroke-width: 1.3; }
.pd-dir .layer.dir-grid .rule { stroke: var(--surface); stroke-opacity: .55; stroke-width: 1; }
.pd-dir .layer.dir-corner .label { font-family: var(--serif); font-style: italic; font-size: 13px; fill: var(--ink-2); }
.pd-dir .layer.dir-edge .label { font-family: var(--mono); font-size: 10px; fill: var(--muted); }
.pd-dir .layer.dir-draw .dot { fill: var(--ink); fill-opacity: .55; }
.pd-dir .layer.dir-draw-in .dot { fill: var(--amber-deep); fill-opacity: .9; }
.pd-dir .layer.dir-curve-3 .curve { stroke: var(--ink-2); stroke-width: 1.8; stroke-dasharray: 2 3; }
.pd-dir .layer.dir-tag .label { font-family: var(--serif); font-style: italic; font-size: 13px; fill: var(--ink); paint-order: stroke; stroke: var(--surface); stroke-width: 4px; }
.pd-dir .layer.dir-bar .poly { fill: rgba(111,143,176,.35); stroke: var(--steel); stroke-width: 1; }
.pd-dir .layer.dir-ylab .label { font-family: var(--mono); font-size: 10.5px; fill: var(--muted); }
.pd-dir .layer.dir-val .label { font-family: var(--mono); font-size: 11px; fill: var(--ink-2); }
.pd-dir .swatch.dir-curve-3 { border-top: 2px dotted var(--ink-2); }
.pd-dir .readouts { grid-template-columns: 1fr; gap: 0; }
.pd-dir .readouts dd { margin: 0 0 .45rem; color: var(--ink); }
.pd-dir .pd-buttons { display: flex; flex-wrap: wrap; gap: .5rem; margin-top: .4rem; }
.pd-dir .explorer-area .segmented { margin-top: .6rem; }
.pd-dir .alpha-fig { margin: 0 0 .8rem; }
.pd-dir .alpha-fig figcaption { font-size: .8rem; font-weight: 600; color: var(--ink-2); margin: 0 0 .2rem .2rem; }
`;
function injectStyle(id, css) {
  if (typeof document === 'undefined' || document.getElementById(id)) return;
  const s = document.createElement('style');
  s.id = id; s.textContent = css;
  document.head.appendChild(s);
}

const mod = {
  id: 'dirichlet',
  name: 'Dirichlet',
  kind: 'multivariate-continuous',

  params: catalogParams('dirichlet', { alpha1: { log: true, dragStep: 0.01 }, alpha2: { log: true, dragStep: 0.01 }, alpha3: { log: true, dragStep: 0.01 } }),

  pdf,
  logPdf: (x, p) => logPdfA(x, alphasOf(p)),
  sample: (rng, p) => rng.dirichlet(alphasOf(p)),

  testParams: [
    { alpha1: 1, alpha2: 1, alpha3: 1 },
    { alpha1: 0.6, alpha2: 0.8, alpha3: 1.5 },
    { alpha1: 20, alpha2: 15, alpha3: 18 },
    { alpha1: 0.5, alpha2: 5, alpha3: 12 },
  ],

  /** Plotting window for any single coordinate. */
  support: () => [0, 1],
  range: () => [0, 1],
  stats,

  checks(p, M) {
    const a = alphasOf(p);
    const a0 = a[0] + a[1] + a[2];
    // stick-breaking coordinates: x1 = s, x2 = (1 - s) t, x3 = (1 - s)(1 - t); area element (1 - s) ds dt
    const opts = { tol: 1e-10 };
    const I2 = g => M.integrate(s => M.integrate(t => {
      const x = [s, (1 - s) * t, (1 - s) * (1 - t)];
      const f = pdf(x, p);
      return f > 0 ? g(x, f) * (1 - s) : 0;
    }, 0, 1, opts), 0, 1, opts);
    const total = I2((x, f) => f);
    const m1 = I2((x, f) => x[0] * f);
    const m2 = I2((x, f) => x[1] * f);
    const m12 = I2((x, f) => x[0] * x[1] * f);
    // marginal of X1 at one point: integrate the joint density over x2 at fixed x1
    const x1 = Math.min(0.9, Math.max(0.1, a[0] / a0));
    const marg = M.integrate(t => pdf([x1, (1 - x1) * t, (1 - x1) * (1 - t)], p) * (1 - x1), 0, 1, opts);
    const tolA = a.some(v => v < 1) ? 2e-5 : 1e-7;
    return [
      { name: 'density integrates to 1 over the triangle', got: total, expected: 1, tol: tolA },
      { name: 'E[X1] = alpha1 / alpha0', got: m1, expected: a[0] / a0, tol: tolA },
      { name: 'E[X2] = alpha2 / alpha0', got: m2, expected: a[1] / a0, tol: tolA },
      { name: 'Cov(X1, X2) = -alpha1 alpha2 / (alpha0^2 (alpha0 + 1))', got: m12 - m1 * m2, expected: -a[0] * a[1] / (a0 * a0 * (a0 + 1)), tol: tolA },
      { name: 'marginal of X1 is Beta(alpha1, alpha0 - alpha1)', got: marg, expected: betaPdf(x1, a[0], a0 - a[0]), tol: tolA * Math.max(1, marg) },
      { name: 'stats().median is the median of the Beta marginal', got: betaI(stats(p).median, a[0], a0 - a[0]), expected: 0.5, tol: 1e-9 },
    ];
  },

  // ---------------------------------------------------------------- custom explorer
  customExplorer(container, ctx) {
    const { plot, ui, store, math } = ctx;
    const { h } = ui;
    injectStyle('pd-style-dirichlet', STYLE);
    const params = mod.params;

    // ---------- DOM
    const triBox = h('div', { class: 'plot-box' });
    const margBox = h('div', { class: 'plot-box' });
    const alphaBox = h('div');
    const regionReadout = h('p', { class: 'area-readout', 'aria-live': 'polite', hidden: true });
    const panelBox = h('div', { class: 'explorer-params' }, h('h3', { class: 'mini-title' }, 'Parameters'),
      h('figure', { class: 'alpha-fig' }, h('figcaption', {}, 'Concentrations αⱼ (log scale; drag the bars)'), alphaBox));
    const areaBox = h('div', { class: 'explorer-area' }, h('h3', { class: 'mini-title' }, 'Probability of a region'));
    const readBox = h('div', { class: 'explorer-readouts' }, h('h3', { class: 'mini-title' }, 'Summary at these parameters'));
    container.appendChild(h('div', { class: 'explorer pd-dir' },
      h('div', { class: 'explorer-plots' },
        h('figure', { class: 'plot-fig' }, h('figcaption', {}, 'Density f(x₁, x₂, x₃) on the triangle of probability vectors'), triBox, regionReadout),
        h('figure', { class: 'plot-fig' }, h('figcaption', {}, 'Marginal densities: Xⱼ ~ Beta(αⱼ, α₀ − αⱼ)'), margBox)),
      h('div', { class: 'explorer-controls' }, panelBox, areaBox, readBox),
      h('p', { class: 'explorer-hint' }, 'Drag the amber handles, or type values in the boxes. A focused handle also moves with the arrow keys (hold Shift for larger steps).')));

    // ---------- state
    const cur = () => store.get().p;
    const lim = key => params.find(q => q.key === key);
    const setP = patch => {
      const next = { ...cur() };
      for (const [k, v] of Object.entries(patch)) { const q = lim(k); next[k] = math.roundTo(clamp(v, q.min, q.max), 0.001); }
      store.set({ p: next });
    };
    const reg = { on: false, j: 1, mode: 'gt', t: 0.5 };
    const draws = { on: false, seed: 1, key: '', pts: [] };

    const panel = ui.paramPanel(panelBox, params, {
      get: cur, apply: (key, v) => setP({ [key]: v }),
      onReset: () => store.set({ p: ctx.defaultParams(mod) }),
    });
    const drawBtn = h('button', { type: 'button', class: 'btn small-btn' }, 'Show 400 random draws');
    drawBtn.addEventListener('click', () => {
      if (!draws.on) { draws.on = true; drawBtn.textContent = 'New random draws'; } else draws.seed++;
      request();
    });
    const hideBtn = h('button', { type: 'button', class: 'btn small-btn' }, 'Hide draws');
    hideBtn.addEventListener('click', () => { draws.on = false; drawBtn.textContent = 'Show 400 random draws'; request(); });
    const flatBtn = h('button', { type: 'button', class: 'btn small-btn' }, 'Flat: all αⱼ = 1');
    flatBtn.addEventListener('click', () => setP({ alpha1: 1, alpha2: 1, alpha3: 1 }));
    const actions = panel.el.querySelector('.param-actions');
    if (actions) { actions.classList.add('pd-buttons'); actions.append(flatBtn, drawBtn, hideBtn); }

    // ---------- region tool
    const regToggle = ui.toggleSwitch('Show the probability of a region', false, on => { reg.on = on; sync(); request(); });
    const jSeg = ui.segmented([1, 2, 3].map(j => ({ value: j, label: 'x' + SUB[j - 1] })), reg.j, v => { reg.j = v; request(); }, 'Coordinate for the region');
    const mSeg = ui.segmented([{ value: 'gt', label: 'More than t' }, { value: 'le', label: 'At most t' }], reg.mode, v => { reg.mode = v; request(); }, 'Which side');
    const regHelp = ui.rich('p', 'Shades the part of the triangle where one coordinate $x_j$ is more than (or at most) a value $t$. Near corner $j$ this is a smaller triangle. Its probability is the area under the marginal density of $X_j$ beyond $t$; drag the amber line on the marginal plot to change $t$.', { class: 'small muted area-help' });
    areaBox.append(regToggle.el, jSeg.el, mSeg.el, regHelp);
    function sync() { jSeg.el.hidden = !reg.on; mSeg.el.hidden = !reg.on; regionReadout.hidden = !reg.on; }
    sync();

    // ---------- readouts
    const readDl = h('dl', { class: 'readouts' });
    const readItems = [
      ['Mean (α₁, α₂, α₃)/α₀', a => vec(a.map(v => v / (a[0] + a[1] + a[2])))],
      ['Total concentration α₀', a => f3(a[0] + a[1] + a[2])],
      ['Mode (highest density)', a => modeText(a)],
      ['Standard deviations of X₁, X₂, X₃', a => { const s = a[0] + a[1] + a[2]; return vec(a.map(v => Math.sqrt(v * (s - v) / (s * s * (s + 1))))); }],
      ['Correlation of X₁ and X₂', a => { const s = a[0] + a[1] + a[2]; return f3(-Math.sqrt(a[0] * a[1] / ((s - a[0]) * (s - a[1])))); }],
    ];
    const readEls = readItems.map(([label]) => { const dd = h('dd', { class: 'mono tnum' }); readDl.append(h('dt', {}, label), dd); return dd; });
    readBox.append(readDl);

    // ---------- plots
    const triPlot = new plot.Plot(triBox, { equalAspect: true, className: 'pd-simplex', ariaLabel: 'Dirichlet density on the triangle', margin: { t: 26, b: 30, l: 16, r: 16 }, height: w => clamp(w * 0.86, 280, 420) });
    const margPlot = new plot.Plot(margBox, { xLabel: 'x (value of one coordinate)', yLabel: 'density', ariaLabel: 'Marginal Beta densities', height: w => clamp(w * 0.86, 260, 420) });
    const alphaPlot = new plot.Plot(alphaBox, { className: 'pd-alpha', yTicks: false, ariaLabel: 'Concentration parameters', margin: { t: 22, b: 30, l: 8, r: 8 }, height: 200, xLabel: '' });

    // heatmap cache
    const NX = 120, NY = Math.round(NX * SQ3);
    let heat = { key: '', values: null, max: 1 };
    function heatmap(a) {
      const key = a.join(',');
      if (heat.key === key) return heat;
      const values = new Float64Array(NX * NY);
      const finite = [];
      for (let j = 0; j < NY; j++) {
        const y = (j + 0.5) / NY * SQ3;
        const x3 = y / SQ3;
        for (let i = 0; i < NX; i++) {
          const x = (i + 0.5) / NX;
          const x2 = x - x3 / 2, x1 = 1 - x2 - x3;
          if (x1 <= 0 || x2 <= 0 || x3 <= 0) { values[j * NX + i] = NaN; continue; }
          const v = Math.exp(logPdfA([x1, x2, x3], a));
          values[j * NX + i] = v;
          finite.push(v);
        }
      }
      // with some alpha_j < 1 the density is infinite at an edge: scale the colors to a high percentile instead
      finite.sort((u, v) => u - v);
      const max = a.some(v => v < 1) ? finite[Math.floor(finite.length * 0.97)] : finite[finite.length - 1];
      heat = { key, values, max };
      return heat;
    }

    let raf = 0;
    const request = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; draw(); }); };
    store.subscribe(() => { panel.update(cur()); request(); });

    const toXY = v => [v[1] + v[2] / 2, SQ3 * v[2]];
    const fromXY = (x, y) => { const x3 = y / SQ3, x2 = x - x3 / 2; return [1 - x2 - x3, x2, x3]; };
    const inRegion = v => (reg.mode === 'gt' ? v[reg.j - 1] > reg.t : v[reg.j - 1] <= reg.t);

    let dragMean = null, dragT = false;

    function draw() {
      const p = cur();
      const a = alphasOf(p);
      const a0 = a[0] + a[1] + a[2];
      const mean = a.map(v => v / a0);

      // ---- triangle
      const H = heatmap(a);
      const layers = [{ id: 'heat', type: 'heatmap', x: [0, 1], y: [0, SQ3], nx: NX, ny: NY, values: H.values, max: H.max }];
      for (const c of [0.2, 0.4, 0.6, 0.8]) {
        layers.push({ id: 'g3' + c, type: 'segment', x1: c / 2, y1: SQ3 * c, x2: 1 - c / 2, y2: SQ3 * c, cls: 'dir-grid' });
        layers.push({ id: 'g2' + c, type: 'segment', x1: c, y1: 0, x2: c / 2, y2: SQ3 * c, cls: 'dir-grid' });
        layers.push({ id: 'g1' + c, type: 'segment', x1: 1 - c, y1: 0, x2: 1 - c / 2, y2: SQ3 * c, cls: 'dir-grid' });
      }
      if (reg.on) {
        const j = reg.j - 1, t = reg.t;
        // region x_j > t: the corner triangle at vertex j with the opposite side at x_j = t
        const corner = [[1, 0, 0], [0, 1, 0], [0, 0, 1]][j];
        const others = [0, 1, 2].filter(i => i !== j);
        const e = others.map(i => { const v = [0, 0, 0]; v[j] = t; v[i] = 1 - t; return toXY(v); });
        const poly = reg.mode === 'gt' ? [toXY(corner), e[0], e[1]]
          : [e[0], e[1], toXY([0, 1, 2].map(i => (i === others[1] ? 1 : 0))), toXY([0, 1, 2].map(i => (i === others[0] ? 1 : 0)))];
        layers.push({ id: 'region', type: 'polygon', points: poly, cls: 'area-shade' });
      }
      layers.push({ id: 'tri', type: 'polygon', points: [[0, 0], [1, 0], [0.5, SQ3]], cls: 'dir-tri' });
      layers.push(
        { id: 'c1', type: 'text', x: 0, y: 0, dy: 18, text: '(1, 0, 0)', cls: 'dir-corner', keepInside: false },
        { id: 'c2', type: 'text', x: 1, y: 0, dy: 18, text: '(0, 1, 0)', cls: 'dir-corner', keepInside: false },
        { id: 'c3', type: 'text', x: 0.5, y: SQ3, dy: -10, text: '(0, 0, 1)', cls: 'dir-corner', keepInside: false },
      );
      let inCount = 0;
      if (draws.on) {
        const key = a.join(',') + '|' + draws.seed;
        if (draws.key !== key) {
          const rng = math.makeRng(500 + draws.seed);
          draws.pts = Array.from({ length: 400 }, () => rng.dirichlet(a));
          draws.key = key;
        }
        draws.pts.forEach((v, i) => {
          const [x, y] = toXY(v);
          const isIn = reg.on && inRegion(v);
          if (isIn) inCount++;
          layers.push({ id: 's' + i, type: 'dot', x, y, r: 1.9, cls: isIn ? 'dir-draw-in' : 'dir-draw' });
        });
      }
      const [mx, my] = toXY(mean);
      triPlot.render({
        x: [-0.08, 1.08], y: [-0.1, SQ3 + 0.08], layers,
        handles: [{
          id: 'mean', type: 'point', at: { x: mx, y: my }, label: 'mean',
          ariaLabel: 'Mean of the distribution. Drag inside the triangle to move the mean; the total concentration stays the same. Arrow keys also move it.',
          valueText: vec(mean), valueNow: mean[0],
          onDrag: (pt, phase) => {
            if (phase === 'start') dragMean = a0;
            if (pt && dragMean) setMean(fromXY(pt.x, pt.y), dragMean);
            if (phase === 'end') dragMean = null;
          },
          onKey: (steps, axis) => {
            const d = 0.01 * steps;
            setMean(fromXY(mx + (axis === 'y' ? 0 : d), my + (axis === 'y' ? d : 0)), a0);
          },
        }],
      });

      // ---- marginals
      const curves = a.map(v => plot.sampleFn(x => betaPdf(x, v, a0 - v), 0.001, 0.999, 401));
      let ymax = 0;
      for (const c of curves) for (const [x, y] of c) if (x > 0.03 && x < 0.97 && Number.isFinite(y)) ymax = Math.max(ymax, y);
      ymax = Math.max(ymax * 1.15, 0.5);
      const clsOf = ['curve-main', 'curve-2', 'dir-curve-3'];
      const ml = [];
      if (reg.on) {
        const j = reg.j - 1, t = reg.t;
        const lo = reg.mode === 'gt' ? t : 0.001, hi = reg.mode === 'gt' ? 0.999 : t;
        ml.push({ id: 'shade', type: 'area', points: plot.sampleFn(x => Math.min(betaPdf(x, a[j], a0 - a[j]), ymax * 2), lo, hi, 200), cls: 'area-shade' });
      }
      curves.forEach((c, i) => ml.push({ id: 'c' + i, type: 'line', points: c.map(([x, y]) => [x, Math.min(y, ymax * 3)]), cls: clsOf[i] }));
      curves.forEach((c, i) => {
        // tag each curve near its highest visible point
        let best = c[200];
        for (const q of c) if (q[0] > 0.04 && q[0] < 0.96 && q[1] < ymax && q[1] > best[1]) best = q;
        ml.push({ id: 'tag' + i, type: 'text', x: best[0], y: Math.min(best[1], ymax * 0.93), dy: -8, text: 'X' + SUB[i], cls: 'dir-tag' });
      });
      mean.forEach((m, i) => ml.push({ id: 'm' + i, type: 'segment', x1: m, y1: 0, x2: m, y2: Math.min(betaPdf(m, a[i], a0 - a[i]), ymax), cls: 'mean-line' }));
      const mh = [];
      if (reg.on) {
        mh.push({
          id: 't', type: 'vline', x: reg.t, label: 't',
          ariaLabel: 'Region threshold t. Drag left or right, or use the arrow keys.', valueText: f3(reg.t), valueNow: reg.t, valueMin: 0, valueMax: 1,
          onDrag: (pt, phase) => {
            if (phase === 'start') dragT = true;
            if (pt && dragT) { reg.t = math.roundTo(clamp(pt.x, 0.01, 0.99), 0.005); request(); }
            if (phase === 'end') dragT = false;
          },
          onKey: steps => { reg.t = math.roundTo(clamp(reg.t + 0.01 * steps, 0.01, 0.99), 0.005); request(); },
        });
      }
      margPlot.render({
        x: [0, 1], y: [0, ymax], layers: ml, handles: mh,
        legend: a.map((v, i) => ({ label: `X${SUB[i]} ~ Beta(${f3(v)}, ${f3(a0 - v)})`, cls: clsOf[i] })),
      });

      // ---- concentration bars (log10 scale from 0.1 to 20)
      const L = v => Math.log10(v);
      const al = [];
      for (const [v, lab] of [[0.1, '0.1'], [0.3, '0.3'], [1, '1'], [3, '3'], [10, '10']]) {
        al.push({ id: 'h' + lab, type: 'hline', y: L(v), cls: v === 1 ? 'mean-line' : 'ref-line' });
        al.push({ id: 'l' + lab, type: 'text', x: 0.08, y: L(v), dy: 4, anchor: 'start', text: lab, cls: 'dir-ylab' });
      }
      a.forEach((v, i) => {
        const x = i + 1;
        al.push({ id: 'b' + i, type: 'polygon', points: [[x - 0.22, -1], [x - 0.22, L(v)], [x + 0.22, L(v)], [x + 0.22, -1]], cls: 'dir-bar' });
        al.push({ id: 'v' + i, type: 'text', x: x - 0.27, y: L(v), dy: 4, anchor: 'end', text: f3(v), cls: 'dir-val' });
      });
      const keys = ['alpha1', 'alpha2', 'alpha3'];
      alphaPlot.render({
        x: [0.15, 3.75], y: [-1.04, L(20) + 0.06], layers: al,
        handles: a.map((v, i) => ({
          id: 'alpha' + (i + 1), type: 'vArrow', from: { x: i + 1, y: -1 }, to: { x: i + 1, y: L(v) }, label: 'α' + SUB[i],
          ariaLabel: `Concentration α${SUB[i]}. Drag up or down, or use the arrow keys.`, valueText: f3(v), valueNow: v, valueMin: 0.1, valueMax: 20,
          onDrag: pt => { if (pt) setP({ [keys[i]]: Number(Math.pow(10, pt.y).toPrecision(2)) }); },
          onKey: steps => setP({ [keys[i]]: Number((cur()[keys[i]] * Math.pow(1.05, steps)).toPrecision(3)) }),
        })),
      });

      // ---- readouts
      readItems.forEach(([, fn], i) => { readEls[i].textContent = fn(a); });
      if (reg.on) {
        const j = reg.j - 1;
        const F = betaI(reg.t, a[j], a0 - a[j]);
        const pr = reg.mode === 'gt' ? 1 - F : F;
        ui.renderRich(regionReadout, `$P(X_${reg.j} ${reg.mode === 'gt' ? '>' : '\\le'} ${f3(reg.t)})$ = <b>${ui.fmt(pr, 4)}</b>, the shaded part of the triangle`
          + (draws.on ? ` (${inCount} of the 400 draws, ${ui.fmt(inCount / 400, 3)}).` : '.'));
      }
    }

    /** Move the mean to the vector m while keeping the total concentration a0. */
    function setMean(m, a0) {
      // move the mean to m with the total a0 kept; if that would push some alpha_j above its maximum of 20,
      // lower the total just enough (alpha_j below 0.1 are raised to 0.1 by setP)
      let v = m.map(x => Math.max(0.1 / a0, Number.isFinite(x) ? x : 1 / 3));
      const s = v[0] + v[1] + v[2];
      v = v.map(x => x / s);
      const tot = Math.min(a0, 20 / Math.max(...v));
      setP({ alpha1: v[0] * tot, alpha2: v[1] * tot, alpha3: v[2] * tot });
    }

    draw();
  },

  // ---------------------------------------------------------------- content
  content: {
    description: [
      'The Dirichlet distribution is a distribution over probability vectors: lists of $K$ positive numbers $(x_1, \\dots, x_K)$ that add up to 1. It is used when the unknown quantity is itself a set of proportions or category probabilities, such as the probabilities of the six faces of a possibly loaded die, the shares of time a person spends on three activities, or the proportions of three response types in an experiment. It is the multivariate version of the beta distribution, which describes a single probability.',
      'The set of all such vectors is called the simplex. With $K = 3$ it is a triangle: each point of the triangle is one probability vector. The corners are the vectors in which one category has probability 1, the middle of the triangle is $(1/3, 1/3, 1/3)$, and the closer a point is to corner $j$, the larger its $j$-th entry. The parameters are positive concentrations $\\alpha_1, \\dots, \\alpha_K$, which act like prior counts. The mean of $x_j$ is $\\alpha_j/\\alpha_0$, where $\\alpha_0 = \\alpha_1 + \\dots + \\alpha_K$ is the total concentration. A larger $\\alpha_0$ concentrates the vectors more tightly around the mean. When every $\\alpha_j = 1$ all probability vectors are equally likely, and when the $\\alpha_j$ are below 1 most of the probability sits near the corners and edges, so that typical vectors have one or two large entries and the others near zero.',
    ],
    explorerIntro: 'The left plot shows the density on the triangle of probability vectors $(x_1, x_2, x_3)$; stronger blue shading means higher density. Each point of the triangle is one probability vector, with the corners labeled. Drag the amber point at the mean to move the center of the distribution; this changes the $\\alpha_j$ but keeps their total $\\alpha_0$, so the spread stays about the same (the total is lowered only when an $\\alpha_j$ would exceed the maximum of 20). The right plot shows the three marginal densities: each coordinate $X_j$ on its own has a beta distribution, $\\mathrm{Beta}(\\alpha_j, \\alpha_0 - \\alpha_j)$. Under the plots, the bar chart shows the three concentrations on a log scale; drag the top of a bar to change one $\\alpha_j$ (raising all three together makes the distribution tighter). The region tool replaces the area-under-the-curve tool of the one-dimensional pages: it shades the part of the triangle where one coordinate is more than (or at most) $t$, and the same probability as an area under that coordinate’s marginal density. The buttons add random draws to the triangle.',
    parameterization: 'Concentrations $\\alpha_1, \\dots, \\alpha_K > 0$ with total concentration $\\alpha_0 = \\sum_j \\alpha_j$; the explorer uses $K = 3$. An equivalent form uses the mean vector $\\mathbf m = \\boldsymbol\\alpha/\\alpha_0$ and the total $\\alpha_0$ (sometimes called the precision or prior sample size). A symmetric Dirichlet has all $\\alpha_j$ equal to one value $\\alpha$. Here $K$ is the number of categories; the hypergeometric page uses the same letter for something else, and $\\alpha$ is also used for the shape parameters of the beta and gamma distributions.',

    pdfTex: 'f(x_1, \\dots, x_K \\mid \\boldsymbol\\alpha) = \\frac{\\Gamma(\\alpha_0)}{\\prod_{j=1}^{K} \\Gamma(\\alpha_j)} \\prod_{j=1}^{K} x_j^{\\alpha_j - 1}, \\qquad x_j > 0,\\ \\sum_{j=1}^{K} x_j = 1,\\quad \\alpha_0 = \\sum_{j=1}^{K} \\alpha_j',
    pdfIntro: 'The density is defined on the simplex. Because $x_K = 1 - x_1 - \\dots - x_{K-1}$, it is a density in the first $K - 1$ coordinates.',
    glossary: [
      { sym: 'x_j', meaning: 'The $j$-th entry of the probability vector: the probability (or proportion) of category $j$. Each is between 0 and 1.' },
      { sym: 'K', meaning: 'The number of categories, the length of the vector.' },
      { sym: '\\boldsymbol\\alpha = (\\alpha_1, \\dots, \\alpha_K)', meaning: 'The concentration parameters, all positive. $\\alpha_j$ acts like a prior count for category $j$.' },
      { sym: '\\alpha_0', meaning: 'The total concentration $\\alpha_1 + \\dots + \\alpha_K$. Larger values give vectors closer to the mean.' },
      { sym: '\\Gamma(\\cdot)', meaning: 'The gamma function, which extends the factorial: $\\Gamma(m) = (m-1)!$ for whole numbers $m$.' },
      { sym: '\\prod_{j=1}^{K}', meaning: 'The product of the factors for $j = 1, \\dots, K$.' },
      { sym: '\\dfrac{\\Gamma(\\alpha_0)}{\\prod_j \\Gamma(\\alpha_j)}', meaning: 'The normalizing constant, $1/B(\\boldsymbol\\alpha)$, where $B(\\boldsymbol\\alpha)$ is the multivariate beta function. It makes the density integrate to 1 over the simplex.' },
      { sym: 'x_j^{\\alpha_j - 1}', meaning: 'The shape factor for category $j$: it grows toward corner $j$ when $\\alpha_j > 1$ and toward the opposite edge (where $x_j = 0$) when $\\alpha_j < 1$.' },
    ],

    cdfTex: 'F(\\mathbf x) = P(X_1 \\le x_1, \\dots, X_{K-1} \\le x_{K-1}) = \\int_{\\{\\mathbf y \\in \\Delta^{K-1}:\\ y_j \\le x_j\\}} f(\\mathbf y)\\, d\\mathbf y, \\qquad P(X_j \\le t) = I_t(\\alpha_j,\\ \\alpha_0 - \\alpha_j)',
    cdfIntro: 'The joint CDF has no closed form and is rarely used; it is an integral of the density over part of the simplex, computed numerically. Probabilities about one coordinate come from its beta marginal, as in the region tool above.',
    cdfGlossary: [
      { sym: 'F(\\mathbf x)', meaning: 'The joint cumulative distribution function: the probability that each of the first $K - 1$ coordinates is at most the matching entry of $\\mathbf x$.' },
      { sym: '\\Delta^{K-1}', meaning: 'The simplex: all vectors of $K$ non-negative numbers that add up to 1 (a triangle when $K = 3$).' },
      { sym: 'd\\mathbf y', meaning: 'Integration over the first $K - 1$ coordinates of $\\mathbf y$.' },
      { sym: 'P(X_j \\le t)', meaning: 'The probability that coordinate $j$ is at most $t$, a number between 0 and 1.' },
      { sym: 'I_t(a, b)', meaning: 'The regularized incomplete beta function, the CDF of a $\\mathrm{Beta}(a, b)$ distribution at $t$; computed numerically.' },
      { sym: '\\alpha_j,\\ \\alpha_0', meaning: 'The concentration of category $j$ and the total concentration.' },
    ],
    extraFormulas: [
      {
        title: 'Conjugate update for categorical and multinomial data',
        intro: 'A Dirichlet prior on the category probabilities and observed category counts give a Dirichlet posterior: the counts are added to the concentrations.',
        tex: '\\mathbf p \\sim \\mathrm{Dir}(\\boldsymbol\\alpha),\\ \\ \\mathbf X \\mid \\mathbf p \\sim \\mathrm{Multinomial}(n, \\mathbf p) \\;\\Rightarrow\\; \\mathbf p \\mid \\mathbf x \\sim \\mathrm{Dir}(\\alpha_1 + x_1, \\dots, \\alpha_K + x_K), \\qquad P(\\text{next trial} = j \\mid \\mathbf x) = \\frac{\\alpha_j + x_j}{\\alpha_0 + n}',
        glossary: [
          { sym: '\\mathbf p', meaning: 'The unknown vector of category probabilities.' },
          { sym: 'x_j,\\ n', meaning: 'The observed count of category $j$ and the total number of trials.' },
          { sym: 'P(\\text{next trial} = j \\mid \\mathbf x)', meaning: 'The posterior predictive probability that a new trial falls in category $j$.' },
        ],
      },
      {
        title: 'Construction from gamma variables',
        intro: 'Independent gamma variables with a common rate, divided by their total, are Dirichlet. This is how Dirichlet draws are simulated (and how the explorer draws them).',
        tex: 'Y_j \\sim \\mathrm{Gamma}(\\alpha_j, c) \\text{ independent} \\;\\Rightarrow\\; \\Big(\\frac{Y_1}{\\sum_i Y_i}, \\dots, \\frac{Y_K}{\\sum_i Y_i}\\Big) \\sim \\mathrm{Dir}(\\alpha_1, \\dots, \\alpha_K)',
        glossary: [
          { sym: 'Y_j', meaning: 'Independent gamma variables, with shapes $\\alpha_j$ and the same rate $c$ (any positive number).' },
          { sym: '\\sum_i Y_i', meaning: 'Their total, which is $\\mathrm{Gamma}(\\alpha_0, c)$ and independent of the proportions.' },
        ],
      },
    ],

    properties: [
      { name: 'Support', tex: '\\mathbf x \\in \\Delta^{K-1}', value: () => 'the triangle (K = 3)', explain: 'All vectors of $K$ positive numbers that add up to 1: the probability simplex.' },
      { name: 'Mean', tex: '\\mathrm{E}[X_j] = \\dfrac{\\alpha_j}{\\alpha_0}', value: p => { const a = alphasOf(p), s = a[0] + a[1] + a[2]; return vec(a.map(v => v / s)); }, explain: 'Each concentration’s share of the total. Scaling all $\\alpha_j$ by the same factor leaves the mean unchanged.' },
      { name: 'Median', tex: 'I^{-1}_{1/2}(\\alpha_j, \\alpha_0 - \\alpha_j) \\approx \\frac{\\alpha_j - 1/3}{\\alpha_0 - 2/3}', value: p => { const a = alphasOf(p), s = a[0] + a[1] + a[2]; return vec(a.map(v => betaIinv(0.5, v, s - v))); }, explain: 'A vector has no single median; the value column lists the median of each coordinate, from its beta marginal (computed numerically). The approximation is good when $\\alpha_j \\ge 1$ and $\\alpha_0 - \\alpha_j \\ge 1$.' },
      { name: 'Mode', tex: '\\dfrac{\\alpha_j - 1}{\\alpha_0 - K}', value: p => modeText(alphasOf(p)), explain: 'The point of highest density, inside the simplex when every $\\alpha_j > 1$. The formula still holds when some $\\alpha_j = 1$ and the others are larger (the mode is then on the edge where $x_j = 0$). If some $\\alpha_j < 1$ the density is unbounded near the edge where $x_j = 0$ and there is no mode; with all $\\alpha_j = 1$ the density is flat. Each coordinate of the joint mode differs from the mode $(\\alpha_j - 1)/(\\alpha_0 - 2)$ of its beta marginal.' },
      { name: 'Variance', tex: '\\mathrm{Var}(X_j) = \\dfrac{\\alpha_j(\\alpha_0 - \\alpha_j)}{\\alpha_0^2(\\alpha_0 + 1)}', value: p => { const a = alphasOf(p), s = a[0] + a[1] + a[2]; return vec(a.map(v => v * (s - v) / (s * s * (s + 1)))); }, explain: 'Equivalently $m_j(1 - m_j)/(\\alpha_0 + 1)$ with mean $m_j = \\alpha_j/\\alpha_0$: for a fixed mean, the variance shrinks like $1/(\\alpha_0 + 1)$, which is why $\\alpha_0$ acts like a prior sample size.' },
      { name: 'Standard deviation', tex: '\\sqrt{\\frac{m_j(1 - m_j)}{\\alpha_0 + 1}}', value: p => { const a = alphasOf(p), s = a[0] + a[1] + a[2]; return vec(a.map(v => Math.sqrt(v * (s - v) / (s * s * (s + 1))))); }, explain: 'The typical distance of each coordinate from its mean $m_j = \\alpha_j/\\alpha_0$.' },
      { name: 'Covariance', tex: '\\mathrm{Cov}(X_i, X_j) = -\\frac{\\alpha_i \\alpha_j}{\\alpha_0^2(\\alpha_0 + 1)},\\ i \\ne j', value: p => { const a = alphasOf(p), s = a[0] + a[1] + a[2]; return `${f3(-a[0] * a[1] / (s * s * (s + 1)))} (X₁ and X₂)`; }, explain: 'Always negative: the coordinates add up to 1, so if one is large the others must be smaller. Apart from this constraint there is little dependence: after removing $X_1$ and rescaling, the remaining proportions are independent of $X_1$ (the Dirichlet is “completely neutral”; see the conditional distribution below).' },
      { name: 'Skewness', tex: '\\frac{2(\\beta_j - \\alpha_j)\\sqrt{\\alpha_0 + 1}}{(\\alpha_0 + 2)\\sqrt{\\alpha_j \\beta_j}},\\ \\beta_j = \\alpha_0 - \\alpha_j', value: p => { const a = alphasOf(p), s = a[0] + a[1] + a[2]; return vec(a.map(v => betaMoments(v, s - v).skewness)); }, explain: 'The skewness of each coordinate, from its beta marginal. A coordinate with a small mean is skewed to the right.' },
      { name: 'Excess kurtosis', tex: '\\frac{6[(\\alpha_j - \\beta_j)^2(\\alpha_0 + 1) - \\alpha_j\\beta_j(\\alpha_0 + 2)]}{\\alpha_j\\beta_j(\\alpha_0 + 2)(\\alpha_0 + 3)}', value: p => { const a = alphasOf(p), s = a[0] + a[1] + a[2]; return vec(a.map(v => betaMoments(v, s - v).exKurtosis)); }, explain: 'The excess kurtosis of each coordinate, again from its beta marginal with $\\beta_j = \\alpha_0 - \\alpha_j$.' },
      { name: 'Entropy', tex: '\\ln B(\\boldsymbol\\alpha) + (\\alpha_0 - K)\\psi(\\alpha_0) - \\sum_{j}(\\alpha_j - 1)\\psi(\\alpha_j)', value: p => entropyA(alphasOf(p)), explain: 'Differential entropy of the whole vector in nats, where $\\ln B(\\boldsymbol\\alpha) = \\sum_j \\ln\\Gamma(\\alpha_j) - \\ln\\Gamma(\\alpha_0)$ and $\\psi$ is the digamma function (the derivative of $\\ln\\Gamma$). It is largest, $-\\ln (K-1)!$, for the flat Dirichlet with all $\\alpha_j = 1$ (the uniform distribution on the simplex). For $K \\ge 3$ that value is negative because the simplex has area $1/(K-1)!$, less than 1, in the first $K - 1$ coordinates; differential entropies can be negative.' },
      { name: 'Moment-generating function', tex: 'M(\\mathbf t) = \\mathrm{E}\\big[e^{\\mathbf t^{\\top} \\mathbf X}\\big]', explain: 'Here $\\mathbf t = (t_1, \\dots, t_K)$ is a vector of real numbers and $\\mathbf t^{\\top}\\mathbf X = \\sum_j t_j X_j$. It exists for every $\\mathbf t$ because each $X_j$ lies between 0 and 1, but it has no simple closed form (it is a multivariate confluent hypergeometric function) and is rarely used. The mixed moments in the Moments row are what is used in practice.' },
      { name: 'Characteristic function', tex: '\\varphi(\\mathbf t) = \\mathrm{E}\\big[e^{i\\mathbf t^{\\top} \\mathbf X}\\big]', explain: 'The same expectation with $i = \\sqrt{-1}$ in the exponent. Like the moment-generating function, it has no simple closed form.' },
      { name: 'Moments', tex: '\\mathrm{E}\\Big[\\prod_j X_j^{r_j}\\Big] = \\frac{B(\\boldsymbol\\alpha + \\mathbf r)}{B(\\boldsymbol\\alpha)}', explain: 'Mixed moments for any powers $\\mathbf r = (r_1, \\dots, r_K)$ with $\\alpha_j + r_j > 0$, where $B(\\boldsymbol\\alpha) = \\prod_j \\Gamma(\\alpha_j)/\\Gamma(\\alpha_0)$ is the multivariate beta function; for example $\\mathrm{E}[X_1X_2] = \\alpha_1\\alpha_2/(\\alpha_0(\\alpha_0 + 1))$.' },
      { name: 'Aggregation', tex: '(X_1 + X_2, X_3, \\dots, X_K) \\sim \\mathrm{Dir}(\\alpha_1 + \\alpha_2, \\alpha_3, \\dots, \\alpha_K)', explain: 'Merging categories adds their concentrations, and the result is again Dirichlet. Merging all categories except $j$ gives the beta marginal of $X_j$.' },
      { name: 'Conditional distribution', tex: '\\frac{(X_2, \\dots, X_K)}{1 - X_1} \\,\\Big|\\, X_1 \\sim \\mathrm{Dir}(\\alpha_2, \\dots, \\alpha_K)', explain: 'After removing one category and rescaling, the remaining proportions are Dirichlet and independent of the removed one. This is the basis of the stick-breaking construction.' },
    ],

    limits: [
      { text: '<b>Two categories and margins: the beta distribution.</b> With $K = 2$, $(X_1, 1 - X_1) \\sim \\mathrm{Dir}(\\alpha_1, \\alpha_2)$ exactly when $X_1 \\sim \\mathrm{Beta}(\\alpha_1, \\alpha_2)$. For any $K$, each coordinate is $X_j \\sim \\mathrm{Beta}(\\alpha_j, \\alpha_0 - \\alpha_j)$.', relation: 'dirichlet--beta', to: 'beta' },
      { text: '<b>Normalized gamma variables.</b> Dividing independent $\\mathrm{Gamma}(\\alpha_j, c)$ variables by their sum gives $\\mathrm{Dir}(\\alpha_1, \\dots, \\alpha_K)$.', relation: 'gamma--dirichlet', to: 'gamma' },
      { text: '<b>Conjugate prior for the multinomial.</b> A Dirichlet prior on the category probabilities gives a Dirichlet posterior after multinomial or categorical data are observed.', relation: 'dirichlet--multinomial', to: 'multinomial' },
      { text: '<b>Flat Dirichlet.</b> With all $\\alpha_j = 1$ the density is constant, $(K-1)!$, on the simplex: every probability vector is equally likely. The gaps between $K - 1$ sorted uniform random numbers on $[0, 1]$ have this distribution.', to: 'uniform' },
      { text: '<b>Large total concentration.</b> As $\\alpha_0 \\to \\infty$ with the mean $\\mathbf m = \\boldsymbol\\alpha/\\alpha_0$ fixed, the distribution concentrates at $\\mathbf m$, and $\\sqrt{\\alpha_0}(\\mathbf X - \\mathbf m)$ approaches a (singular) multivariate normal with covariance $\\mathrm{diag}(\\mathbf m) - \\mathbf m\\mathbf m^{\\top}$.', to: 'multivariate-normal' },
      { text: '<b>Small concentrations: sparse vectors.</b> As all $\\alpha_j \\to 0$ with fixed proportions, the draws approach the corners of the simplex: one category gets almost all the probability, and it is category $j$ with probability $\\alpha_j/\\alpha_0$.', to: 'categorical' },
      { text: '<b>Dirichlet process.</b> Letting $K \\to \\infty$ with a symmetric Dirichlet $\\mathrm{Dir}(a/K, \\dots, a/K)$ leads to the Dirichlet process, a prior over distributions used in Bayesian nonparametric mixture models; its probabilities of any finite partition are Dirichlet.' },
    ],

    uses: {
      frequentist: [
        '<b>Compositional data.</b> Dirichlet regression models proportions that add up to 1 (budget shares, time-use data, chemical or species compositions) as Dirichlet with means that depend on predictors; the concentrations are estimated by maximum likelihood (for example with Minka’s fixed-point method).',
        '<b>Overdispersed category counts.</b> When category counts vary more between groups than a multinomial allows, the Dirichlet–multinomial model (multinomial counts with Dirichlet-distributed probabilities) is fitted by maximum likelihood; it is the multivariate version of beta-binomial regression.',
        '<b>Uniform spacings.</b> The gaps between sorted uniform random numbers follow a flat Dirichlet distribution, which gives the null distributions of tests based on spacings and of order statistics of uniform samples.',
      ],
      bayesian: [
        '<b>Conjugate prior for categorical and multinomial probabilities.</b> With prior $\\mathrm{Dir}(\\boldsymbol\\alpha)$ and counts $\\mathbf x$, the posterior is $\\mathrm{Dir}(\\boldsymbol\\alpha + \\mathbf x)$, with posterior mean $(\\alpha_j + x_j)/(\\alpha_0 + n)$. Common default priors are the flat $\\mathrm{Dir}(1, \\dots, 1)$, the Jeffreys prior $\\mathrm{Dir}(1/2, \\dots, 1/2)$ and weak priors with $\\alpha_0$ around 1.',
        '<b>Mixture weights.</b> In finite mixture models the component weights get a Dirichlet prior; a symmetric $\\mathrm{Dir}(\\alpha, \\dots, \\alpha)$ with small $\\alpha$ favors using few components.',
        '<b>Topic models.</b> Latent Dirichlet allocation (Blei, Ng & Jordan, 2003) gives each document a Dirichlet-distributed vector of topic proportions and each topic a Dirichlet-distributed vector of word probabilities.',
        '<b>Bayesian bootstrap and nonparametrics.</b> Rubin’s Bayesian bootstrap weights the observations with a flat Dirichlet vector; the Dirichlet process extends the Dirichlet to infinitely many categories.',
        '<b>Hierarchical models.</b> Group-specific probability vectors can share a Dirichlet prior whose mean and total concentration are estimated from all groups.',
      ],
      modeling: [
        '<b>Priors on choice and response probabilities.</b> In cognitive models with several response categories, such as multinomial processing tree models or models of choice among several options, Dirichlet priors describe uncertainty about the category probabilities.',
        '<b>Learning probabilities from experience.</b> Bayesian learner models track Dirichlet pseudo-counts for the probabilities of several outcomes (for example transition probabilities in a Markov environment), updating them by adding observed counts; the mean $\\alpha_j/\\alpha_0$ is the learner’s current belief.',
        '<b>Population genetics.</b> Allele frequencies at a locus with several alleles across subpopulations are often modeled as Dirichlet, and the Dirichlet is the stationary distribution of allele frequencies in the Wright–Fisher model with mutation.',
        '<b>Simulation.</b> Random probability vectors for simulations and for random initial values of mixture and topic models are drawn by normalizing gamma variables.',
      ],
    },

    references: [
      { text: 'Wikipedia: Dirichlet distribution.', url: 'https://en.wikipedia.org/wiki/Dirichlet_distribution' },
      { text: 'Kotz, S., Balakrishnan, N., & Johnson, N. L. (2000). <i>Continuous Multivariate Distributions</i>, Vol. 1 (2nd ed.), Chapter 49. Wiley.' },
      { text: 'Gelman, A., Carlin, J. B., Stern, H. S., Dunson, D. B., Vehtari, A., & Rubin, D. B. (2013). <i>Bayesian Data Analysis</i> (3rd ed.), Section 3.4 and Appendix A. CRC Press.', url: 'http://www.stat.columbia.edu/~gelman/book/' },
      { text: 'Frigyik, B. A., Kapila, A., & Gupta, M. R. (2010). Introduction to the Dirichlet distribution and related processes. Technical report UWEETR-2010-0006, University of Washington.' },
      { text: 'Minka, T. P. (2000). Estimating a Dirichlet distribution. Technical report, MIT.' },
      { text: 'Blei, D. M., Ng, A. Y., & Jordan, M. I. (2003). Latent Dirichlet allocation. <i>Journal of Machine Learning Research</i>, 3, 993–1022.' },
      { text: 'Ferguson, T. S. (1973). A Bayesian analysis of some nonparametric problems. <i>The Annals of Statistics</i>, 1(2), 209–230.', url: 'https://doi.org/10.1214/aos/1176342360' },
    ],
  },
};

export default mod;
