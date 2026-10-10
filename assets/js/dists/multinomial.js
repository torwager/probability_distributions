// Multinomial distribution: the counts (X_1, ..., X_K) in K categories after n independent trials.
// Follows the structure of the reference module dists/normal.js (see ARCHITECTURE.md).
//
// The probability vector is not a catalog parameter. It is kept in the params object as `p.probs`
// (created and resized by normalize, equal probabilities by default). pdf takes a count vector.
// stats() reports the moments of the first count X_1 (which is Bin(n, p_1)) and the entropy of the
// whole vector; the vector-valued properties are described in content.properties.
//
// The page uses a custom explorer:
//   * a bar chart of the category probabilities p_j, each bar with a vertical-arrow handle (renormalized);
//   * the K marginal distributions Bin(n, p_j) as rows of bars ("count in each category"), with an
//     x-axis marker for n, an optional event threshold and a random sample;
//   * for K = 3, the joint PMF on a triangular grid of count vectors, with a draggable point at n p / n.

import { catalogParams } from '../catalog.js';
import { lgamma, quantileDiscrete, clamp } from '../core/math.js';

const K_MAX = 6;
const N_MAX = 30;
const SQ3 = Math.sqrt(3) / 2;
const uniform = K => new Array(K).fill(1 / K);
const SUB = d => String(d).split('').map(c => '₀₁₂₃₄₅₆₇₈₉'[+c]).join('');
const f3 = v => (Number.isFinite(+v) ? String(Number(Number(v).toPrecision(3))).replace(/^-/, '−') : 'undefined');
const vec = arr => '(' + arr.map(f3).join(', ') + ')';

/** The probability vector, falling back to equal probabilities if it is missing or has the wrong length. */
function probsOf(p) {
  return Array.isArray(p.probs) && p.probs.length === p.K ? p.probs : uniform(p.K);
}

const LF = []; // log factorials 0..N_MAX (and beyond on demand)
const lfact = k => (k <= 200 ? (LF[k] ??= lgamma(k + 1)) : lgamma(k + 1));

/** log P(X = x) for a count vector x. */
function logPmf(x, n, probs) {
  if (!Array.isArray(x) || x.length !== probs.length) return -Infinity;
  let s = 0, lp = lfact(n);
  for (let j = 0; j < x.length; j++) {
    const xj = x[j];
    if (!Number.isInteger(xj) || xj < 0) return -Infinity;
    s += xj;
    lp -= lfact(xj);
    if (xj > 0) {
      if (!(probs[j] > 0)) return -Infinity;
      lp += xj * Math.log(probs[j]);
    }
  }
  return s === n ? lp : -Infinity;
}

function pdf(x, p) { return Math.exp(logPmf(x, p.n, probsOf(p))); }

/** Binomial PMF values P(Y = k), k = 0..n, for Y ~ Bin(n, q). */
function binomRow(n, q) {
  const out = new Array(n + 1);
  for (let k = 0; k <= n; k++) {
    if (q <= 0) out[k] = k === 0 ? 1 : 0;
    else if (q >= 1) out[k] = k === n ? 1 : 0;
    else out[k] = Math.exp(lfact(n) - lfact(k) - lfact(n - k) + k * Math.log(q) + (n - k) * Math.log1p(-q));
  }
  return out;
}
const binomCdf = (k, n, q) => { const r = binomRow(n, q); let s = 0; for (let i = 0; i <= Math.min(n, Math.floor(k)); i++) s += r[i]; return Math.min(1, s); };
const binomMedian = (n, q) => quantileDiscrete(x => (x < 0 ? 0 : binomCdf(x, n, q)), 0.5, 0, n, Math.round(n * q));
const binomMode = (n, q) => (q >= 1 ? n : Math.min(n, Math.floor((n + 1) * q)));

/** Visit every count vector of length K that adds up to n. */
function forEachVector(n, K, fn) {
  const x = new Array(K).fill(0);
  (function rec(j, left) {
    if (j === K - 1) { x[j] = left; fn(x); return; }
    for (let v = 0; v <= left; v++) { x[j] = v; rec(j + 1, left - v); }
  })(0, n);
}

/** Number of possible count vectors, C(n + K - 1, K - 1). */
const nOutcomes = (n, K) => Math.round(Math.exp(lgamma(n + K) - lgamma(K) - lgamma(n + 1)));

/** Entropy in nats: -ln n! - n sum p ln p + sum_j E[ln X_j!], with X_j ~ Bin(n, p_j). */
function entropy(n, probs) {
  let H = -lfact(n);
  for (const q of probs) {
    if (q > 0) H -= n * q * Math.log(q);
    const r = binomRow(n, q);
    for (let k = 2; k <= n; k++) H += r[k] * lfact(k);
  }
  return H;
}

/**
 * The most likely count vector. The log-PMF is a sum of concave functions of the separate counts with a fixed
 * total, so adding the n trials one at a time, each to the category with the largest gain p_j / (x_j + 1),
 * finds a maximum (ties go to the lower category). checks() compares it with a search over all outcomes.
 */
function jointMode(n, probs) {
  const x = new Array(probs.length).fill(0);
  for (let t = 0; t < n; t++) {
    let best = -1, arg = 0;
    for (let j = 0; j < probs.length; j++) { const g = probs[j] / (x[j] + 1); if (g > best + 1e-15) { best = g; arg = j; } }
    x[arg]++;
  }
  return x;
}

function stats(p) {
  const { n } = p;
  const probs = probsOf(p);
  const q = probs[0];
  const v = n * q * (1 - q);
  return {
    mean: n * q, variance: v, sd: Math.sqrt(v), median: binomMedian(n, q), mode: binomMode(n, q),
    skewness: v > 0 ? (1 - 2 * q) / Math.sqrt(v) : NaN, exKurtosis: v > 0 ? (1 - 6 * q * (1 - q)) / v : NaN,
    entropy: entropy(n, probs),
  };
}

/** Resize or create the probability vector (equal probabilities when K changes) and rescale it to a total of 1. */
function normalize(p, changed) {
  const K = Math.round(clamp(p.K, 2, K_MAX));
  const n = Math.round(clamp(p.n, 1, N_MAX));
  let probs = Array.isArray(p.probs) && p.probs.length === K && changed !== 'K' ? p.probs.map(v => Math.max(0, +v || 0)) : uniform(K);
  const s = probs.reduce((a, b) => a + b, 0);
  probs = s > 0 ? probs.map(v => v / s) : uniform(K);
  return { ...p, n, K, probs };
}

/** Set category i to v and rescale the others so that the total stays 1. */
function setOne(probs, i, v) {
  v = clamp(v, 0, 1);
  const rest = probs.reduce((s, q, j) => s + (j === i ? 0 : q), 0);
  return probs.map((q, j) => (j === i ? v : rest > 0 ? q * (1 - v) / rest : (1 - v) / (probs.length - 1)));
}

// ------------------------------------------------------------------ scoped styles for the custom explorer
const STYLE = `
@media (max-width: 760px) { .pd-mn .plot-fig + .plot-fig, .pd-mn .pd-row { margin-top: 1.2rem; } }
.pd-mn .layer.mn-dot .dot { fill: var(--steel); fill-opacity: .72; stroke: var(--steel-deep); stroke-width: 1; }
.pd-mn .layer.mn-dot-on .dot { fill: var(--amber); fill-opacity: .9; stroke: var(--amber-deep); stroke-width: 1.2; }
.pd-mn .layer.mn-faint .dot { fill: var(--axis); fill-opacity: .7; }
.pd-mn .layer.mn-ring .dot { fill: none; stroke: var(--ink); stroke-width: 2; }
.pd-mn .layer.mn-sample .dot { fill: var(--surface); stroke: var(--ink); stroke-width: 2; }
.pd-mn .layer.mn-row .poly { fill: rgba(111,143,176,.32); stroke: var(--steel-deep); stroke-width: 1.1; }
.pd-mn .layer.mn-row-on .poly { fill: var(--area-fill); stroke: var(--amber-deep); stroke-width: 1.1; }
.pd-mn .layer.mn-val .label { font-family: var(--mono); font-size: 11px; fill: var(--muted); }
.pd-mn .layer.mn-cat .label { font-family: var(--sans); font-size: 12px; fill: var(--ink-2); }
.pd-mn .layer.mn-corner .label { font-family: var(--serif); font-style: italic; font-size: 13px; fill: var(--ink-2); }
.pd-mn .layer.mn-tri .poly { fill: none; stroke: var(--axis); stroke-width: 1.2; }
.pd-mn .layer.mn-grid .rule { stroke: var(--grid); stroke-width: 1; }
.plot.pd-simplex .gridline, .plot.pd-simplex .axis-line, .plot.pd-simplex .tick, .plot.pd-simplex .tick-label { display: none; }
.plot.pd-rows .gridline { display: none; }
.pd-mn .pd-row { display: grid; grid-template-columns: minmax(0, 1.05fr) minmax(0, .95fr); gap: clamp(12px, 2vw, 24px); margin-top: 1rem; align-items: start; }
.pd-mn .pd-side { font-size: .92rem; color: var(--ink-2); }
.pd-mn .pd-side p { margin: .2rem 0 .7rem; }
.pd-mn .pd-buttons { display: flex; flex-wrap: wrap; gap: .5rem; margin-top: .4rem; }
.pd-mn .readouts { grid-template-columns: 1fr; gap: 0; }
.pd-mn .readouts dd { margin: 0 0 .45rem; color: var(--ink); }
.pd-mn .pd-sample { font-family: var(--mono); font-size: .9rem; }
.pd-mn .explorer-area .segmented { margin-top: .6rem; }
@media (max-width: 760px) { .pd-mn .pd-row { grid-template-columns: 1fr; } }
`;
function injectStyle(id, css) {
  if (typeof document === 'undefined' || document.getElementById(id)) return;
  const s = document.createElement('style');
  s.id = id; s.textContent = css;
  document.head.appendChild(s);
}

const mod = {
  id: 'multinomial',
  name: 'Multinomial',
  kind: 'multivariate-discrete',

  params: catalogParams('multinomial'),

  pdf,
  logPmf: (x, p) => logPmf(x, p.n, probsOf(p)),
  sample: (rng, p) => rng.multinomial(p.n, probsOf(p)),

  testParams: [
    { K: 3, probs: [0.2, 0.3, 0.5] },
    { n: 30, K: 6, probs: [0.05, 0.1, 0.15, 0.2, 0.2, 0.3] },
    { n: 1, K: 2, probs: [0.3, 0.7] },
    { n: 25, K: 4, probs: [0.5, 0.5, 0, 0] },
    { n: 17, K: 5, probs: [0.9, 0.025, 0.025, 0.025, 0.025] },
  ],

  /** Plotting window for any single count. */
  support: p => [0, p.n],
  range: p => [0, p.n],
  normalize,
  stats,

  checks(p, M) {
    const probs = probsOf(p);
    const { n, K } = p;
    let total = 0, m1 = 0, m2 = 0, m11 = 0, m12 = 0, H = 0, count = 0, best = -Infinity;
    forEachVector(n, K, x => {
      const f = pdf(x, p);
      count++;
      total += f; m1 += f * x[0]; m2 += f * x[1]; m11 += f * x[0] * x[0]; m12 += f * x[0] * x[1];
      if (f > 0) H -= f * Math.log(f);
      if (f > best) best = f;
    });
    const e1 = n * probs[0];
    return [
      { name: 'probabilities add up to 1', got: total, expected: 1, tol: 1e-10 },
      { name: 'E[X1] = n p1', got: m1, expected: e1, tol: 1e-9 * Math.max(1, e1) },
      { name: 'Var(X1) = n p1 (1 - p1)', got: m11 - m1 * m1, expected: n * probs[0] * (1 - probs[0]), tol: 1e-8 * Math.max(1, n) },
      { name: 'Cov(X1, X2) = -n p1 p2', got: m12 - m1 * m2, expected: -n * probs[0] * probs[1], tol: 1e-8 * Math.max(1, n) },
      { name: 'the mode has the largest probability', got: pdf(jointMode(n, probs), p), expected: best, tol: 1e-12 },
      { name: 'number of count vectors = C(n + K - 1, K - 1)', got: count, expected: nOutcomes(n, K), tol: 0 },
      { name: 'entropy formula matches the sum over all count vectors', got: entropy(n, probs), expected: H, tol: 1e-9 * Math.max(1, H) },
      { name: 'stats().median is the median of Bin(n, p1)', got: binomCdf(stats(p).median, n, probs[0]) >= 0.5 - 1e-9 && (stats(p).median === 0 || binomCdf(stats(p).median - 1, n, probs[0]) < 0.5 + 1e-9) ? 1 : 0, expected: 1, tol: 0 },
    ];
  },

  // ---------------------------------------------------------------- custom explorer
  customExplorer(container, ctx) {
    const { plot, ui, store, math } = ctx;
    const { h } = ui;
    injectStyle('pd-style-multinomial', STYLE);
    store.set({ p: normalize(store.get().p, null) });

    // ---------- DOM
    const barsBox = h('div', { class: 'plot-box' });
    const rowsBox = h('div', { class: 'plot-box' });
    const triBox = h('div', { class: 'plot-box' });
    const eventReadout = h('p', { class: 'area-readout', 'aria-live': 'polite', hidden: true });
    const triSide = h('div', { class: 'pd-side' });
    const triRow = h('div', { class: 'pd-row' },
      h('figure', { class: 'plot-fig' }, ui.rich('figcaption', 'Joint probabilities of all count vectors (K = 3)'), triBox),
      triSide);
    const panelBox = h('div', { class: 'explorer-params' }, h('h3', { class: 'mini-title' }, 'Parameters'));
    const areaBox = h('div', { class: 'explorer-area' }, h('h3', { class: 'mini-title' }, 'Probability of an event'));
    const readBox = h('div', { class: 'explorer-readouts' }, h('h3', { class: 'mini-title' }, 'Summary at these parameters'));
    const root = h('div', { class: 'explorer pd-mn is-discrete' },
      h('div', { class: 'explorer-plots' },
        h('figure', { class: 'plot-fig' }, h('figcaption', {}, 'Category probabilities  pⱼ'), barsBox),
        h('figure', { class: 'plot-fig' }, h('figcaption', {}, 'Count in each category  P(Xⱼ = k), with Xⱼ ~ Bin(n, pⱼ)'), rowsBox, eventReadout)),
      triRow,
      h('div', { class: 'explorer-controls' }, panelBox, areaBox, readBox),
      h('p', { class: 'explorer-hint' }, 'Drag the amber handles, or type values in the boxes. A focused handle also moves with the arrow keys (hold Shift for larger steps).'));
    container.appendChild(root);

    // ---------- state helpers
    const cur = () => store.get().p;
    const apply = (patch, changed) => store.set({ p: normalize({ ...cur(), ...patch }, changed ?? Object.keys(patch)[0]) });
    let sample = null;          // the last random draw (a count vector) or null
    let sampleKey = '';         // n|K the sample belongs to
    const ev = { on: false, j: 1, mode: 'le', t: 3 };   // event: X_j <= t (le) or X_j > t (gt)
    let rng = math.makeRng(20240611);

    // ---------- parameter panel + buttons
    const panel = ui.paramPanel(panelBox, mod.params, {
      get: cur,
      apply: (key, v) => apply({ [key]: v }, key),
      onReset: () => { sample = null; store.set({ p: ctx.defaultParams(mod) }); },
    });
    const eqBtn = h('button', { type: 'button', class: 'btn small-btn' }, 'Equal probabilities');
    eqBtn.addEventListener('click', () => apply({ probs: uniform(cur().K) }, null));
    const sampleBtn = h('button', { type: 'button', class: 'btn small-btn' }, 'Draw a random sample');
    sampleBtn.addEventListener('click', () => { const p = cur(); sample = rng.multinomial(p.n, probsOf(p)); sampleKey = p.n + '|' + p.K; request(); });
    const clearBtn = h('button', { type: 'button', class: 'btn small-btn' }, 'Clear sample');
    clearBtn.addEventListener('click', () => { sample = null; request(); });
    const actions = panel.el.querySelector('.param-actions');
    if (actions) { actions.classList.add('pd-buttons'); actions.append(eqBtn, sampleBtn, clearBtn); } else panelBox.append(h('div', { class: 'pd-buttons' }, eqBtn, sampleBtn, clearBtn));

    // ---------- event tool
    const evToggle = ui.toggleSwitch('Show the probability of an event', false, on => { ev.on = on; syncEventCtl(); request(); });
    let catSeg = null;
    const catHolder = h('div');
    const modeSeg = ui.segmented([{ value: 'le', label: 'At most k' }, { value: 'gt', label: 'More than k' }], ev.mode,
      v => { ev.mode = v; request(); }, 'Which event');
    const evHelp = ui.rich('p', 'Chooses one category $j$ and a count $k$, and adds up the probabilities of all outcomes with $X_j \\le k$ (or $X_j > k$). Drag the amber line on the count plot to change $k$. The matching bars, and for $K = 3$ the matching count vectors in the triangle, are highlighted.', { class: 'small muted area-help' });
    areaBox.append(evToggle.el, catHolder, modeSeg.el, evHelp);
    function buildCatSeg(K) {
      catHolder.textContent = '';
      ev.j = Math.min(ev.j, K);
      catSeg = ui.segmented(Array.from({ length: K }, (_, i) => ({ value: i + 1, label: 'j = ' + (i + 1) })), ev.j,
        v => { ev.j = v; request(); }, 'Category for the event');
      catHolder.append(catSeg.el);
      syncEventCtl();
    }
    function syncEventCtl() {
      if (catSeg) catSeg.el.hidden = !ev.on;
      modeSeg.el.hidden = !ev.on;
      eventReadout.hidden = !ev.on;
    }

    // ---------- readouts
    const readDl = h('dl', { class: 'readouts' });
    const readItems = [
      ['Expected counts n p', p => vec(probsOf(p).map(q => p.n * q))],
      ['Standard deviations', p => vec(probsOf(p).map(q => Math.sqrt(p.n * q * (1 - q))))],
      ['Most likely count vector', p => '(' + jointMode(p.n, probsOf(p)).join(', ') + ')'],
      ['Its probability', p => ui.fmt(pdf(jointMode(p.n, probsOf(p)), p), 3)],
      ['Number of possible count vectors', p => nOutcomes(p.n, p.K).toLocaleString('en-US')],
      ['Random sample', () => (sample ? '(' + sample.join(', ') + ')' : 'none yet')],
      ['Probability of this sample', p => (sample ? ui.fmt(pdf(sample, p), 3) : '—')],
    ];
    const readEls = readItems.map(([label]) => { const dd = h('dd', { class: 'mono tnum' }); readDl.append(h('dt', {}, label), dd); return dd; });
    readBox.append(readDl);

    // ---------- plots
    const barsPlot = new plot.Plot(barsBox, { xLabel: 'category j', yLabel: 'probability pⱼ', ariaLabel: 'Category probabilities', height: w => clamp(w * 0.62, 230, 330) });
    const rowsPlot = new plot.Plot(rowsBox, {
      xLabel: 'count k', yTicks: false, className: 'pd-rows', ariaLabel: 'Marginal distribution of each count',
      margin: { l: 14 }, height: w => clamp(w * 0.62, 230, 330),
    });
    const triPlot = new plot.Plot(triBox, { equalAspect: true, className: 'pd-simplex', ariaLabel: 'Joint probabilities of the count vectors on a triangle', margin: { t: 26, b: 26, l: 16, r: 16 }, height: w => clamp(w * 0.8, 260, 420) });

    // rows plot: x domain animated so that n can be dragged beyond the current view in two steps
    const xTarget = n => [-0.7, Math.max(7, Math.ceil(n * 1.22 + 3)) + 0.7];
    const anim = new plot.DomainAnimator({ x: xTarget(cur().n), y: [0, 1] });
    let frozen = false, dragN = false, dragT = false, dragTri = false;

    let raf = 0;
    const request = () => { if (!raf) raf = requestAnimationFrame(frame); };
    function frame() {
      raf = 0;
      if (!frozen) anim.setTarget({ x: xTarget(cur().n) });
      const moving = anim.step();
      draw();
      if (moving) request();
    }
    let lastK = cur().K;
    store.subscribe(() => {
      const p = cur();
      panel.update(p);
      if (p.K !== lastK) { lastK = p.K; buildCatSeg(p.K); }
      if (sample && sampleKey !== p.n + '|' + p.K) sample = null;
      request();
    });
    buildCatSeg(cur().K);

    function inEvent(xj) { return ev.mode === 'le' ? xj <= ev.t : xj > ev.t; }

    function draw() {
      const p = cur();
      const { n, K } = p;
      const probs = probsOf(p);
      ev.t = clamp(Math.round(ev.t), 0, Math.max(0, n - 1));

      // ---- probability bars with one vertical arrow per bar
      const bars = probs.map((q, i) => [i + 1, q]);
      barsPlot.render({
        x: [0.3, K + 0.7], y: [0, 1.12], discreteX: true,
        layers: [
          { id: 'bars', type: 'bars', points: bars, width: 0.56, cls: 'bars-strong' },
          ...bars.map(([k, q]) => ({ id: 'v' + k, type: 'text', x: k, y: q, dy: -14, anchor: 'middle', text: f3(q), cls: 'mn-val' })),
        ],
        handles: bars.map(([k, q]) => ({
          id: 'p' + k, type: 'vArrow', from: { x: k, y: 0 }, to: { x: k, y: q }, label: 'p' + SUB(k),
          ariaLabel: `Probability of category ${k}. Drag up or down, or use the arrow keys; the other probabilities are rescaled so that the total stays 1.`,
          valueText: f3(q), valueNow: q, valueMin: 0, valueMax: 1,
          onDrag: pt => { if (pt) apply({ probs: setOne(cur().probs, k - 1, math.roundTo(pt.y, 0.005)) }, null); },
          onKey: steps => { const c = cur().probs; apply({ probs: setOne(c, k - 1, math.roundTo(c[k - 1] + 0.01 * steps, 0.001)) }, null); },
        })),
      });

      // ---- marginal rows: row j has its base at y = K - j
      const rows = probs.map(q => binomRow(n, q));
      let gmax = 0;
      for (const r of rows) for (const v of r) gmax = Math.max(gmax, v);
      const xd = anim.cur.x;
      const layers = [];
      const W = n > 20 ? 0.42 : 0.36;
      for (let j = 0; j < K; j++) {
        const base = K - 1 - j;
        layers.push({ id: 'base' + j, type: 'hline', y: base, x0: -0.5, x1: n + 0.5, cls: 'ref-line' });
        const polyAll = [], polyOn = [];
        for (let k = 0; k <= n; k++) {
          const hgt = 0.84 * rows[j][k] / gmax;
          const target = ev.on && ev.j === j + 1 && inEvent(k) ? polyOn : polyAll;
          if (hgt < 1e-4) continue;
          target.push([k - W, base], [k - W, base + hgt], [k + W, base + hgt], [k + W, base]);
        }
        const close = pts => (pts.length ? [[pts[0][0], base], ...pts] : pts);
        layers.push({ id: 'row' + j, type: 'polygon', points: close(polyAll), cls: 'mn-row' });
        layers.push({ id: 'rowon' + j, type: 'polygon', points: close(polyOn), cls: 'mn-row-on' });
        layers.push({ id: 'mean' + j, type: 'segment', x1: n * probs[j], y1: base, x2: n * probs[j], y2: base + 0.95, cls: 'mean-line' });
        layers.push({ id: 'cat' + j, type: 'text', x: xd[1], y: base + 0.3, dx: -6, anchor: 'end', text: 'j = ' + (j + 1), cls: 'mn-cat' });
        if (sample) layers.push({ id: 'smp' + j, type: 'dot', x: sample[j], y: base + 0.84 * rows[j][sample[j]] / gmax + 0.07, r: 5, cls: 'mn-sample' });
      }
      layers.push({ id: 'nline', type: 'vline', x: n + 0.5, cls: 'ref-line' });
      const handles = [{
        id: 'n', type: 'xPoint', x: n, lineTo: -0.12, label: 'n',
        ariaLabel: 'Number of trials n. Drag left or right, or use the arrow keys.', valueText: String(n), valueNow: n, valueMin: 1, valueMax: N_MAX,
        onDrag: (pt, phase) => {
          if (phase === 'start') { frozen = true; dragN = true; }
          if (pt && dragN) apply({ n: clamp(Math.round(pt.x), 1, N_MAX) }, 'n');
          if (phase === 'end') { frozen = false; dragN = false; request(); }
        },
        onKey: steps => apply({ n: clamp(cur().n + Math.sign(steps), 1, N_MAX) }, 'n'),
      }];
      if (ev.on && n >= 1) {
        handles.push({
          id: 'k', type: 'vline', x: ev.t + 0.5, label: 'k',
          ariaLabel: 'Event threshold k. Drag left or right, or use the arrow keys.', valueText: String(ev.t), valueNow: ev.t, valueMin: 0, valueMax: n - 1,
          onDrag: (pt, phase) => {
            if (phase === 'start') { frozen = true; dragT = true; }
            if (pt && dragT) { ev.t = clamp(Math.round(pt.x - 0.5), 0, Math.max(0, cur().n - 1)); request(); }
            if (phase === 'end') { frozen = false; dragT = false; request(); }
          },
          onKey: steps => { ev.t = clamp(ev.t + Math.sign(steps), 0, Math.max(0, cur().n - 1)); request(); },
        });
      }
      rowsPlot.render({ x: xd, y: [-0.12, K - 0.05], discreteX: true, layers, handles });

      // ---- event readout
      if (ev.on) {
        const j = ev.j, q = probs[j - 1];
        const Fk = binomCdf(ev.t, n, q);
        const pr = ev.mode === 'le' ? Fk : 1 - Fk;
        ui.renderRich(eventReadout, `$P(X_{${j}} ${ev.mode === 'le' ? '\\le' : '>'} ${ev.t})$ = <b>${ui.fmt(pr, 4)}</b>, from $X_{${j}} \\sim \\mathrm{Bin}(${n}, ${f3(q)})$.`);
      }

      // ---- triangle (K = 3 only)
      triRow.style.display = K === 3 ? '' : 'none';
      if (K === 3) drawTriangle(p, probs);

      // ---- readouts
      readItems.forEach(([, fn], i) => { readEls[i].textContent = fn(p); });
    }

    function drawTriangle(p, probs) {
      const { n } = p;
      const xy = (a, b, c) => [(b + c / 2) / n, SQ3 * c / n];
      const layers = [
        { id: 'tri', type: 'polygon', points: [[0, 0], [1, 0], [0.5, SQ3]], cls: 'mn-tri' },
      ];
      // faint lattice lines x_j = const every few counts
      const step = n <= 10 ? 1 : n <= 20 ? 2 : 5;
      for (let c = step; c < n; c += step) {
        const t = c / n;
        layers.push({ id: 'g3-' + c, type: 'segment', x1: t / 2, y1: SQ3 * t, x2: 1 - t / 2, y2: SQ3 * t, cls: 'mn-grid' });
        layers.push({ id: 'g2-' + c, type: 'segment', x1: t, y1: 0, x2: t / 2, y2: SQ3 * t, cls: 'mn-grid' });
        layers.push({ id: 'g1-' + c, type: 'segment', x1: 1 - t, y1: 0, x2: 1 - t / 2, y2: SQ3 * (t), cls: 'mn-grid' });
      }
      const pxPerUnit = triPlot.xd ? Math.abs(triPlot.sx(1) - triPlot.sx(0)) || 300 : 300;
      const rMax = clamp(0.5 * pxPerUnit / n, 2.5, 16);
      let pmax = 0;
      const pts = [];
      forEachVector(n, 3, x => { const f = pdf(x, p); pts.push([x[0], x[1], x[2], f]); if (f > pmax) pmax = f; });
      for (const [a, b, c, f] of pts) {
        const [X, Y] = xy(a, b, c);
        const on = ev.on && inEvent([a, b, c][ev.j - 1]);
        const r = f > 0 ? Math.max(1.2, rMax * Math.sqrt(f / pmax)) : 1;
        layers.push({ id: `d${a}-${b}`, type: 'dot', x: X, y: Y, r, cls: f / pmax < 1e-3 ? 'mn-faint' : on ? 'mn-dot-on' : 'mn-dot' });
      }
      if (sample && sample.length === 3) {
        const [X, Y] = xy(...sample);
        layers.push({ id: 'smp', type: 'dot', x: X, y: Y, r: rMax + 3, cls: 'mn-ring' });
      }
      layers.push(
        { id: 'c1', type: 'text', x: 0, y: 0, dy: 18, text: `(${n}, 0, 0)`, cls: 'mn-corner', keepInside: false },
        { id: 'c2', type: 'text', x: 1, y: 0, dy: 18, text: `(0, ${n}, 0)`, cls: 'mn-corner', keepInside: false },
        { id: 'c3', type: 'text', x: 0.5, y: SQ3, dy: -10, text: `(0, 0, ${n})`, cls: 'mn-corner', keepInside: false },
      );
      const [mx, my] = xy(n * probs[0], n * probs[1], n * probs[2]);
      triPlot.render({
        x: [-0.08, 1.08], y: [-0.1, SQ3 + 0.08], layers,
        handles: [{
          id: 'pt', type: 'point', at: { x: mx, y: my }, label: 'n p',
          ariaLabel: 'Expected counts n p. Drag inside the triangle to set the three probabilities, or use the arrow keys.',
          valueText: vec(probs), valueNow: probs[0],
          onDrag: (pt, phase) => {
            if (phase === 'start') dragTri = true;
            if (pt && dragTri) apply({ probs: fromSimplex(pt.x, pt.y) }, null);
            if (phase === 'end') dragTri = false;
          },
          onKey: (steps, axis) => {
            const c = cur().probs;
            const d = 0.01 * steps;
            const x0 = c[1] + c[2] / 2, y0 = SQ3 * c[2];
            apply({ probs: fromSimplex(x0 + (axis === 'y' ? 0 : d), y0 + (axis === 'y' ? d : 0)) }, null);
          },
        }],
      });
      ui.renderRich(triSide, '<p>Each dot is one possible outcome $(x_1, x_2, x_3)$ with $x_1 + x_2 + x_3 = n$. Its position shows the three proportions $x_j / n$: the corners are the outcomes in which all $n$ trials fall in one category, and the dot’s distance from the edge opposite corner $j$ is proportional to $x_j$. The area of each dot is proportional to its probability.</p>'
        + `<p>The amber point marks the expected counts $n\\mathbf p$ = ${vec(probs.map(q => n * q))}. Drag it to change all three probabilities at once. The dots cluster around it, and the cluster becomes relatively tighter as $n$ grows, since the standard deviation of each proportion $X_j/n$ is $\\sqrt{p_j(1-p_j)/n}$.</p>`
        + (sample ? `<p>The ring marks the random sample ${'(' + sample.join(', ') + ')'}.</p>` : ''));
    }

    /** Convert a point of the triangle (corners (0, 0), (1, 0), (1/2, √3/2)) to the nearest probability vector. */
    function fromSimplex(x, y) {
      const p3 = y / SQ3, p2 = x - p3 / 2, p1 = 1 - p2 - p3;
      const v = [p1, p2, p3].map(t => Math.max(0, t));
      const s = v[0] + v[1] + v[2];
      return v.map(t => math.roundTo(t / s, 0.001));
    }

    draw();
  },

  // ---------------------------------------------------------------- content
  content: {
    description: [
      'The multinomial distribution describes the counts in each of $K$ categories after $n$ independent trials, when every trial lands in category $j$ with the same probability $p_j$. Rolling a die 60 times and counting the ones, twos, …, sixes is an example; so are the numbers of participants who choose each of three options, the numbers of responses of each type in an experiment, and the numbers of words of each kind in a document.',
      'The outcome is a vector of whole-number counts $\\mathbf X = (X_1, \\dots, X_K)$, with each $X_j \\ge 0$ and $X_1 + \\dots + X_K = n$. The parameters are the number of trials $n$, the number of categories $K$ and the probability vector $\\mathbf p = (p_1, \\dots, p_K)$, whose entries add up to 1. With $K = 2$ the multinomial is the binomial distribution, and with $n = 1$ it is a single categorical trial written as a one-hot vector. Each count on its own is binomial, $X_j \\sim \\mathrm{Bin}(n, p_j)$, but the counts are not independent: they must add up to $n$, so a large count in one category leaves less room for the others.',
    ],
    explorerIntro: 'The top-left plot shows the category probabilities $p_1, \\dots, p_K$. Drag the top of any amber arrow to change that probability; the others are rescaled in proportion so that the total stays 1. The top-right plot shows, for each category $j$ in its own row, the distribution of its count $X_j$, which is $\\mathrm{Bin}(n, p_j)$; the dotted line in each row marks the expected count $np_j$. Drag the amber triangle under the axis to change the number of trials $n$. With $K = 3$ a third plot shows the whole joint distribution: every possible count vector as a dot on a triangle, with area proportional to its probability, and an amber point at the expected counts that you can drag to set all three probabilities. Change $K$ with its box (this resets the probabilities to $1/K$). The buttons draw a random count vector, which is marked in every plot. The event tool replaces the area-under-the-curve tool of the one-dimensional pages: it shows the probability that one count is at most, or more than, a value $k$.',
    parameterization: 'Number of trials $n$, number of categories $K$ and the probability vector $\\mathbf p = (p_1, \\dots, p_K)$, with every $p_j \\ge 0$ and $p_1 + \\dots + p_K = 1$. The vector is set by dragging the bars (equal probabilities by default). The outcome is the count vector $\\mathbf X = (X_1, \\dots, X_K)$. On this page $K$ is the number of categories; on the hypergeometric page the same letter is a number of successes in the population.',

    pdfTex: 'P(X_1 = x_1, \\dots, X_K = x_K) = \\frac{n!}{x_1!\\, x_2! \\cdots x_K!}\\; p_1^{x_1} p_2^{x_2} \\cdots p_K^{x_K}, \\qquad x_1 + \\dots + x_K = n',
    glossary: [
      { sym: 'X_j', meaning: 'The random count of trials that land in category $j$.' },
      { sym: 'x_j', meaning: 'A possible value of that count: a whole number from 0 to $n$. The probability is 0 unless the $x_j$ add up to $n$.' },
      { sym: 'n', meaning: 'The number of independent trials.' },
      { sym: 'K', meaning: 'The number of categories.' },
      { sym: 'p_j', meaning: 'The probability that a single trial lands in category $j$. The $p_j$ are between 0 and 1 and add up to 1.' },
      { sym: 'n!', meaning: 'The factorial $n \\times (n-1) \\times \\dots \\times 1$, with $0! = 1$.' },
      { sym: '\\dfrac{n!}{x_1! \\cdots x_K!}', meaning: 'The multinomial coefficient: the number of different orders of the $n$ trials that give these counts. With $K = 2$ it is the binomial coefficient $\\binom{n}{x_1}$.' },
      { sym: 'p_1^{x_1} \\cdots p_K^{x_K}', meaning: 'The probability of any one particular sequence of trial outcomes with these counts.' },
    ],

    cdfTex: 'F(\\mathbf x) = P(X_1 \\le x_1, \\dots, X_K \\le x_K) = \\sum_{\\mathbf y \\le \\mathbf x,\\ \\sum_j y_j = n} P(\\mathbf X = \\mathbf y), \\qquad P(X_j \\le k) = \\sum_{i=0}^{k} \\binom{n}{i} p_j^{\\,i} (1-p_j)^{n-i}',
    cdfIntro: 'A vector of counts has no single natural ordering, so the joint CDF is rarely used. It is a sum of the PMF over all count vectors below $\\mathbf x$ in every coordinate. The CDF of one count $X_j$ is the binomial CDF; the event tool in the explorer uses it.',
    cdfGlossary: [
      { sym: 'F(\\mathbf x)', meaning: 'The joint cumulative distribution function at the vector $\\mathbf x = (x_1, \\dots, x_K)$.' },
      { sym: 'P(X_1 \\le x_1, \\dots, X_K \\le x_K)', meaning: 'The probability that every count is at most the matching entry of $\\mathbf x$.' },
      { sym: '\\mathbf y \\le \\mathbf x', meaning: 'The sum runs over count vectors $\\mathbf y$ with $y_j \\le x_j$ for every $j$ and with entries adding up to $n$.' },
      { sym: 'P(X_j \\le k)', meaning: 'The probability that the count in category $j$ is at most $k$.' },
      { sym: '\\binom{n}{i}', meaning: 'The binomial coefficient: the number of ways to choose which $i$ of the $n$ trials land in category $j$.' },
      { sym: 'i, k', meaning: 'Whole numbers: $i$ runs over the possible counts from 0 to $k$.' },
      { sym: 'p_j', meaning: 'The probability of category $j$ on one trial.' },
    ],
    extraFormulas: [
      {
        title: 'Mean vector and covariance matrix',
        intro: 'Each count is binomial, and two different counts are negatively correlated because they share the same $n$ trials.',
        tex: '\\mathrm{E}[\\mathbf X] = n\\mathbf p, \\qquad \\mathrm{Cov}(X_i, X_j) = \\begin{cases} n p_j (1 - p_j) & i = j \\\\ -n p_i p_j & i \\ne j \\end{cases}, \\qquad \\mathrm{Cov}(\\mathbf X) = n\\left[\\mathrm{diag}(\\mathbf p) - \\mathbf p\\mathbf p^{\\top}\\right]',
        glossary: [
          { sym: '\\mathrm{E}[\\mathbf X]', meaning: 'The mean vector, the expected count in each category.' },
          { sym: '\\mathrm{Cov}(X_i, X_j)', meaning: 'The covariance of the counts in categories $i$ and $j$; on the diagonal ($i = j$) it is the variance.' },
          { sym: '\\mathrm{diag}(\\mathbf p)', meaning: 'The $K \\times K$ matrix with $p_1, \\dots, p_K$ on the diagonal and zeros elsewhere.' },
          { sym: '\\mathbf p\\mathbf p^{\\top}', meaning: 'The $K \\times K$ matrix with entries $p_i p_j$.' },
        ],
      },
      {
        title: 'Likelihood and the Dirichlet posterior',
        intro: 'Seen as a function of $\\mathbf p$ for observed counts, the PMF is proportional to $\\prod_j p_j^{x_j}$. A Dirichlet prior has the same form, so the posterior is Dirichlet with the counts added to the prior pseudo-counts.',
        tex: '\\mathbf p \\sim \\mathrm{Dir}(\\alpha_1, \\dots, \\alpha_K),\\ \\mathbf X \\mid \\mathbf p \\sim \\mathrm{Multinomial}(n, \\mathbf p) \\;\\Rightarrow\\; \\mathbf p \\mid \\mathbf x \\sim \\mathrm{Dir}(\\alpha_1 + x_1, \\dots, \\alpha_K + x_K)',
        glossary: [
          { sym: '\\mathrm{Dir}(\\alpha_1, \\dots, \\alpha_K)', meaning: 'The Dirichlet distribution over probability vectors; each $\\alpha_j > 0$ acts like a prior count for category $j$.' },
          { sym: '\\mathbf p \\mid \\mathbf x', meaning: 'The posterior distribution of the probabilities after observing the counts $\\mathbf x$.' },
          { sym: '\\Rightarrow', meaning: 'Implies.' },
        ],
      },
    ],

    properties: [
      { name: 'Support', tex: 'x_j \\in \\{0, \\dots, n\\},\\ \\textstyle\\sum_j x_j = n', value: p => `${nOutcomes(p.n, p.K).toLocaleString('en-US')} count vectors`, explain: 'All vectors of $K$ non-negative whole numbers that add up to $n$. There are $\\binom{n + K - 1}{K - 1}$ of them (the value column shows how many).' },
      { name: 'Mean', tex: '\\mathrm{E}[X_j] = n p_j', value: p => vec(probsOf(p).map(q => p.n * q)), explain: 'The expected count in each category: the number of trials times the category probability. The value column lists $n p_1, \\dots, n p_K$.' },
      { name: 'Median', tex: '\\lfloor np_j \\rfloor \\text{ or } \\lceil np_j \\rceil', value: p => '(' + probsOf(p).map(q => binomMedian(p.n, q)).join(', ') + ')', explain: 'A vector has no single median. Each count $X_j$ is $\\mathrm{Bin}(n, p_j)$, whose median is $np_j$ rounded down or up; the value column lists the median of each count. These medians need not add up to $n$.' },
      { name: 'Mode', tex: '\\arg\\max_{\\mathbf x} P(\\mathbf X = \\mathbf x)', value: p => '(' + jointMode(p.n, probsOf(p)).join(', ') + ')', explain: 'The most likely count vector (computed exactly: adding the trials one at a time, each to the category where it raises the probability most, finds it). Each of its entries lies between $np_j - 1$ and $(n + K - 1)p_j$ (Finucan, 1964), so the mode is the expected count vector rounded in a way that keeps the total at $n$.' },
      { name: 'Variance', tex: '\\mathrm{Var}(X_j) = n p_j (1 - p_j)', value: p => vec(probsOf(p).map(q => p.n * q * (1 - q))), explain: 'The variance of each count, the same as for $\\mathrm{Bin}(n, p_j)$. It is largest for a category with $p_j = 1/2$.' },
      { name: 'Standard deviation', tex: '\\sqrt{n p_j (1 - p_j)}', value: p => vec(probsOf(p).map(q => Math.sqrt(p.n * q * (1 - q)))), explain: 'The typical distance of each count from its expected value. Proportions $X_j/n$ have standard deviation $\\sqrt{p_j(1-p_j)/n}$, which shrinks as $n$ grows.' },
      { name: 'Covariance', tex: '\\mathrm{Cov}(X_i, X_j) = -n p_i p_j,\\ i \\ne j', value: p => { const q = probsOf(p); return `${f3(-p.n * q[0] * q[1])} (categories 1 and 2)`; }, explain: 'Always negative or zero: the counts share a fixed total, so more trials in category $i$ means fewer elsewhere. The correlation is $-\\sqrt{p_i p_j / [(1 - p_i)(1 - p_j)]}$; with $K = 2$ it is $-1$, because $X_2 = n - X_1$.' },
      { name: 'Skewness', tex: '\\dfrac{1 - 2p_j}{\\sqrt{n p_j (1 - p_j)}}', value: p => vec(probsOf(p).map(q => { const v = p.n * q * (1 - q); return v > 0 ? (1 - 2 * q) / Math.sqrt(v) : NaN; })), explain: 'The skewness of each count. A rare category ($p_j < 1/2$) has a count skewed to the right; it shrinks like $1/\\sqrt n$. Undefined for a category with $p_j = 0$ or $1$.' },
      { name: 'Excess kurtosis', tex: '\\dfrac{1 - 6 p_j (1 - p_j)}{n p_j (1 - p_j)}', value: p => vec(probsOf(p).map(q => { const v = p.n * q * (1 - q); return v > 0 ? (1 - 6 * q * (1 - q)) / v : NaN; })), explain: 'The excess kurtosis of each count, as for the binomial. It goes to 0 as $n$ grows, as each count becomes approximately normal.' },
      { name: 'Entropy', tex: 'H = -\\ln n! - n\\sum_j p_j \\ln p_j + \\sum_j \\sum_{k=0}^{n} \\binom{n}{k} p_j^k (1-p_j)^{n-k} \\ln k!', value: p => entropy(p.n, probsOf(p)), explain: 'The entropy of the whole count vector, in nats. The last term is $\\sum_j \\mathrm{E}[\\ln X_j!]$ with $X_j \\sim \\mathrm{Bin}(n, p_j)$. It is less than $n$ times the entropy $-\\sum_j p_j \\ln p_j$ of one trial, because the counts do not record the order of the trials.' },
      { name: 'Probability-generating function', tex: 'G(z_1, \\dots, z_K) = \\mathrm{E}\\Big[\\prod_j z_j^{X_j}\\Big] = \\Big(\\sum_{j=1}^{K} p_j z_j\\Big)^{n}', explain: 'The $n$-th power of the generating function of one trial, because the count vector is a sum of $n$ independent one-hot vectors. Setting all $z_i = 1$ except $z_j$ gives the binomial generating function of $X_j$.' },
      { name: 'Characteristic function', tex: '\\varphi(t_1, \\dots, t_K) = \\Big(\\sum_{j=1}^{K} p_j e^{i t_j}\\Big)^{n}', explain: '$\\mathrm{E}[e^{i(t_1 X_1 + \\dots + t_K X_K)}]$, where $i = \\sqrt{-1}$.' },
      { name: 'Lumping categories', tex: '(X_1 + X_2, X_3, \\dots, X_K) \\sim \\mathrm{Multinomial}(n, (p_1 + p_2, p_3, \\dots, p_K))', explain: 'Merging categories adds their counts and their probabilities, and the result is again multinomial. Merging everything except category $j$ gives the binomial count $X_j$.' },
      { name: 'Conditional distribution', tex: '(X_2, \\dots, X_K) \\mid X_1 = x_1 \\sim \\mathrm{Multinomial}\\Big(n - x_1, \\tfrac{(p_2, \\dots, p_K)}{1 - p_1}\\Big)', explain: 'Given how many trials landed in category 1, the remaining $n - x_1$ trials are spread over the other categories with the renormalized probabilities.' },
    ],

    limits: [
      { text: '<b>Two categories: the binomial distribution.</b> With $K = 2$ the vector is $(X_1, n - X_1)$, and $X_1 \\sim \\mathrm{Bin}(n, p_1)$. In the other direction, every single count $X_j$ of a multinomial is $\\mathrm{Bin}(n, p_j)$.', relation: 'binomial--multinomial', to: 'binomial' },
      { text: '<b>Pearson’s chi-squared statistic.</b> As $n \\to \\infty$ with all $p_j > 0$, $\\sum_j (X_j - np_j)^2/(np_j)$ approaches a chi-squared distribution with $K - 1$ degrees of freedom. This is the basis of the chi-squared goodness-of-fit test.', relation: 'multinomial--chi-squared', to: 'chi-squared' },
      { text: '<b>One trial: the categorical distribution.</b> With $n = 1$ the count vector has a single 1 in the position of the outcome, the one-hot coding of a categorical outcome. A multinomial vector is the sum of $n$ such independent one-hot vectors.', relation: 'categorical--multinomial', to: 'categorical' },
      { text: '<b>Independent Poisson counts given their total.</b> If $Y_j \\sim \\mathrm{Poisson}(\\lambda_j)$ independently, then given $\\sum_j Y_j = n$ the vector $(Y_1, \\dots, Y_K)$ is multinomial with $p_j = \\lambda_j / \\sum_i \\lambda_i$. This is why Poisson log-linear models and multinomial models of contingency tables give the same inferences.', relation: 'poisson--multinomial', to: 'poisson' },
      { text: '<b>Normal approximation.</b> As $n \\to \\infty$, $(\\mathbf X - n\\mathbf p)/\\sqrt n$ approaches a multivariate normal distribution with mean $\\mathbf 0$ and covariance $\\mathrm{diag}(\\mathbf p) - \\mathbf p\\mathbf p^{\\top}$. This covariance matrix is singular (its rows add up to 0) because the counts add up to $n$.', to: 'multivariate-normal' },
      { text: '<b>Dirichlet–multinomial.</b> If the probability vector is itself drawn from a Dirichlet distribution, $\\mathbf p \\sim \\mathrm{Dir}(\\boldsymbol\\alpha)$, the counts have the Dirichlet–multinomial (multivariate Pólya) distribution, which is more spread out than the multinomial (overdispersed). With $K = 2$ it is the beta-binomial distribution.', to: 'beta-binomial' },
    ],

    uses: {
      frequentist: [
        '<b>Estimating category probabilities.</b> The maximum-likelihood estimate is the vector of sample proportions $\\hat p_j = x_j/n$, with standard errors $\\sqrt{\\hat p_j(1-\\hat p_j)/n}$ and estimated covariances $-\\hat p_i \\hat p_j / n$.',
        '<b>Goodness-of-fit tests.</b> Pearson’s chi-squared test, $\\sum_j (O_j - E_j)^2/E_j$, and the likelihood-ratio G-test, $2\\sum_j O_j \\ln(O_j/E_j)$, compare observed counts $O_j$ with expected counts $E_j = np_j$ under a hypothesis; both are approximately $\\chi^2_{K-1}$ in large samples. With small expected counts an exact multinomial test sums the probabilities of all outcomes no more likely than the one observed.',
        '<b>Contingency tables.</b> The cell counts of an $r \\times c$ table with a fixed total are multinomial. The chi-squared test of independence and log-linear models are built on this (or on the equivalent product of independent Poisson counts).',
        '<b>Multinomial logistic regression.</b> Grouped categorical outcomes are modeled as multinomial counts whose probabilities depend on predictors through the softmax function.',
        '<b>Bootstrap.</b> In a nonparametric bootstrap resample of size $n$, the numbers of times each original observation is drawn are $\\mathrm{Multinomial}(n, (1/n, \\dots, 1/n))$.',
      ],
      bayesian: [
        '<b>Dirichlet–multinomial conjugacy.</b> With prior $\\mathbf p \\sim \\mathrm{Dir}(\\alpha_1, \\dots, \\alpha_K)$ and observed counts $\\mathbf x$, the posterior is $\\mathrm{Dir}(\\alpha_1 + x_1, \\dots, \\alpha_K + x_K)$. The posterior mean of $p_j$ is $(\\alpha_j + x_j)/(\\alpha_0 + n)$ with $\\alpha_0 = \\sum_j \\alpha_j$, a compromise between the prior mean and the observed proportion.',
        '<b>Posterior predictive counts.</b> The counts in $m$ future trials, averaged over the Dirichlet posterior, follow a Dirichlet–multinomial distribution with parameters $\\boldsymbol\\alpha + \\mathbf x$.',
        '<b>Topic models and mixtures.</b> Latent Dirichlet allocation treats the word counts of each document as multinomial given its topic proportions, with Dirichlet priors on the proportions and on each topic’s word probabilities. Finite mixture models have multinomial counts of component memberships.',
        '<b>Hierarchical models for category counts.</b> When several groups each have their own probability vector, a common Dirichlet (or a logistic-normal) prior shares information between groups.',
      ],
      modeling: [
        '<b>Multinomial processing tree models.</b> In cognitive psychology, these models explain the response-category counts in memory and perception experiments as the result of a tree of latent processes (for example detecting, guessing, or confusing a source); the category probabilities are products of the process parameters and the counts are multinomial (Batchelder & Riefer, 1999).',
        '<b>Choice counts.</b> The numbers of times a participant or a group chooses each option in a repeated choice task are multinomial, with probabilities given by a choice rule such as the softmax (Luce) rule.',
        '<b>Population genetics.</b> In the Wright–Fisher model, the numbers of each allele in the next generation are a multinomial draw from the current allele frequencies; genotype counts are compared with Hardy–Weinberg proportions with multinomial tests.',
        '<b>Text and ecology.</b> Bag-of-words models treat word counts in a document as multinomial, and species counts in an ecological sample are often modeled the same way.',
        '<b>Particle filters.</b> Multinomial resampling draws how many copies of each particle survive to the next step, in proportion to the particle weights.',
      ],
    },

    references: [
      { text: 'Wikipedia: Multinomial distribution.', url: 'https://en.wikipedia.org/wiki/Multinomial_distribution' },
      { text: 'Casella, G., & Berger, R. L. (2002). <i>Statistical Inference</i> (2nd ed.), Section 4.6 (the multinomial distribution and its marginals). Duxbury.' },
      { text: 'Johnson, N. L., Kotz, S., & Balakrishnan, N. (1997). <i>Discrete Multivariate Distributions</i>, Chapter 35. Wiley.' },
      { text: 'Gelman, A., Carlin, J. B., Stern, H. S., Dunson, D. B., Vehtari, A., & Rubin, D. B. (2013). <i>Bayesian Data Analysis</i> (3rd ed.), Section 3.4 and Appendix A. CRC Press.', url: 'http://www.stat.columbia.edu/~gelman/book/' },
      { text: 'Agresti, A. (2013). <i>Categorical Data Analysis</i> (3rd ed.), Chapters 1–3. Wiley.' },
      { text: 'Batchelder, W. H., & Riefer, D. M. (1999). Theoretical and empirical review of multinomial process tree modeling. <i>Psychonomic Bulletin & Review</i>, 6(1), 57–86.', url: 'https://doi.org/10.3758/BF03210812' },
      { text: 'Finucan, H. M. (1964). The mode of a multinomial distribution. <i>Biometrika</i>, 51(3/4), 513–517.' },
    ],
  },
};

export default mod;
