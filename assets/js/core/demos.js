// Ready-made interactive demonstrations for relation pages (available as ctx.demos).
// Most relationships fall into two patterns, and these helpers draw them in the same style:
//
//  1. simulationDemo — "do something to random draws and compare the result with the target":
//     sums, ratios, transformations, mixtures, conditioning. It simulates the left-hand side of the
//     statement, then shows a histogram (or bar chart of frequencies) against the target density
//     (or PMF), the sample CDF against the target CDF, and the largest CDF gap.
//
//  2. compareDemo — "two exact distributions that coincide or approach each other":
//     limits and special cases. It overlays the two densities/PMFs and the two CDFs and reports the
//     largest CDF gap, which shrinks toward 0 as the limiting parameter is pushed toward its limit.
//
// Both build their own parameter panel (number boxes + sliders) from param specs in the same format as
// the catalog ({key, sym, name, meaning, min, max, default, integer?, log?, step?}). Both return
// { store, redraw } so a module can add extra layers or readouts if needed. See ARCHITECTURE.md.

import { Plot, sampleFn } from './plot.js';
import { h, paramPanel, createStore, segmented, fmt, rich, renderRich } from './ui.js';
import { makeRng, histogram, ecdf, clamp } from './math.js';

const KS95 = 1.358; // 95% point of the Kolmogorov distribution: gaps up to about 1.36/sqrt(n) arise by chance

function defaultsOf(params) {
  const p = {};
  for (const prm of params) p[prm.key] = prm.default;
  return p;
}
const call = (v, ...args) => (typeof v === 'function' ? v(...args) : v);

function frame(container, { intro, leftCaption, rightCaption }) {
  const left = h('div'), right = h('div');
  const readout = h('p', { class: 'demo-readout', 'aria-live': 'polite' });
  const controls = h('div', { class: 'demo-controls' });
  const capL = h('figcaption', {}), capR = h('figcaption', {});
  if (intro) container.append(rich('p', intro, { class: 'small muted demo-intro' }));
  container.append(
    h('div', { class: 'demo-grid' },
      h('figure', { class: 'plot-fig' }, capL, left),
      h('figure', { class: 'plot-fig' }, capR, right)),
    readout, controls);
  renderRich(capL, leftCaption || '');
  renderRich(capR, rightCaption || '');
  return { left, right, readout, controls, capL, capR };
}

/**
 * Simulation demo.
 * @param {HTMLElement} container
 * @param {object} ctx      the demo ctx (only ctx.math is used; may be omitted)
 * @param {object} o
 *   params      param specs for the panel (may be empty)
 *   sample(rng, p)          one simulated value of the left-hand side (e.g. the sum of n exponentials)
 *   target: { name: p => 'text', pdf(x, p), cdf(x, p), discrete?: boolean }
 *   range(p) -> [lo, hi]    plotting window (integers for a discrete target)
 *   intro, xLabel, leftCaption, rightCaption, sampleName (rich text shown in the legend, default 'simulated values')
 *   sizes: [200, 2000, 20000] sample-size choices, size: default (2000)
 *   readout(p, s) -> rich text appended to the standard readout; s = {n, mean, sd, gap, gapAt, crit}
 *   onUpdate(p, s, plots)   optional hook after each redraw
 */
export function simulationDemo(container, ctx, o) {
  const params = o.params || [];
  const sizes = o.sizes || [200, 2000, 20000];
  const store = createStore({ p: defaultsOf(params), size: o.size || 2000, seed: 1 });
  const F = frame(container, {
    intro: o.intro,
    leftCaption: o.leftCaption || (o.target.discrete ? 'Frequencies of the simulated values and the target probabilities' : 'Histogram of the simulated values and the target density'),
    rightCaption: o.rightCaption || 'Sample CDF and the target CDF',
  });
  const xLabel = o.xLabel || (o.target.discrete ? 'k' : 'x');
  const left = new Plot(F.left, { xLabel, yLabel: o.target.discrete ? 'probability' : 'density' });
  const right = new Plot(F.right, { xLabel, yLabel: 'cumulative probability' });

  const panel = params.length ? paramPanel(F.controls, params, {
    get: () => store.get().p,
    apply: (k, v) => store.set({ p: { ...store.get().p, [k]: v } }),
    check: o.check ? (k, v) => o.check({ ...store.get().p, [k]: v }) : undefined,
    onReset: () => store.set({ p: defaultsOf(params) }),
  }) : null;
  const sizeCtl = segmented(sizes.map(n => ({ value: n, label: `${n.toLocaleString('en-US')} draws` })), store.get().size,
    v => store.set({ size: v }), 'Number of simulated draws');
  const again = h('button', { type: 'button', class: 'btn small-btn' }, 'Draw new samples');
  again.addEventListener('click', () => store.set({ seed: store.get().seed + 1 }));
  F.controls.append(h('div', { class: 'demo-sim-ctl' }, h('h3', { class: 'mini-title' }, 'Simulation'), sizeCtl.el, h('div', {}, again)));

  let cache = { key: '', xs: null };
  function draws(s) {
    const key = JSON.stringify([s.p, s.size, s.seed]);
    if (cache.key !== key) {
      const rng = makeRng(1000 + s.seed);
      const xs = new Float64Array(s.size);
      for (let i = 0; i < s.size; i++) xs[i] = o.sample(rng, s.p);
      const sorted = Float64Array.from(xs).sort();
      cache = { key, xs, sorted };
    }
    return cache;
  }

  let raf = 0;
  const request = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; redraw(); }); };
  store.subscribe(() => { if (panel) panel.update(store.get().p); request(); });

  function redraw() {
    const s = store.get(), p = s.p;
    const { xs, sorted } = draws(s);
    const n = xs.length;
    let [lo, hi] = o.range(p);
    const disc = !!o.target.discrete;
    let m = 0; for (const v of xs) m += v; m /= n;
    let v2 = 0; for (const v of xs) v2 += (v - m) * (v - m); const sd = Math.sqrt(v2 / (n - 1));

    const layers = [];
    let ymax = 0;
    if (disc) {
      lo = Math.floor(lo); hi = Math.ceil(hi);
      const counts = new Map();
      for (const v of xs) counts.set(v, (counts.get(v) || 0) + 1);
      const bars = [], stems = [];
      for (let k = lo; k <= hi; k++) {
        const f = (counts.get(k) || 0) / n, q = o.target.pdf(k, p);
        bars.push([k, f]); stems.push([k, q]); ymax = Math.max(ymax, f, q);
      }
      layers.push({ id: 'freq', type: 'bars', points: bars, width: 0.7, cls: 'bars-strong' });
      layers.push({ id: 'pmf', type: 'stems', points: stems, cls: 'pmf' });
    } else {
      const bins = clamp(Math.round(Math.sqrt(n) * 0.9), 12, 70);
      const hst = histogram(xs, lo, hi, bins);
      const bars = hst.density.map((d, i) => [hst.edges[i] + hst.width / 2, d]);
      const curve = sampleFn(x => o.target.pdf(x, p), lo, hi, 300);
      for (const [, d] of bars) ymax = Math.max(ymax, d);
      const peak = Math.max(...curve.map(c => c[1]).filter(Number.isFinite));
      ymax = Math.max(Math.min(ymax, 3 * peak), peak);
      layers.push({ id: 'hist', type: 'bars', points: bars, width: hst.width, cls: 'bars-strong' });
      layers.push({ id: 'pdf', type: 'line', points: curve, cls: 'curve-main' });
    }
    const xd = disc ? [lo - 0.7, hi + 0.7] : [lo, hi];
    const legendL = [{ label: rawText(call(o.sampleName, p)) || 'simulated values', cls: 'bars-strong' }, { label: rawText(call(o.target.name, p)) || 'target', cls: 'curve-main' }];
    left.render({ x: xd, y: [0, (ymax || 1) * 1.12], discreteX: disc, layers, legend: legendL });

    // CDFs and the largest gap (Kolmogorov-Smirnov distance)
    let gap = 0, gapAt = lo, Fs = 0, Ft = 0;
    if (disc) {
      for (let k = lo; k <= hi; k++) {
        const fs = ecdf(sorted, k), ft = o.target.cdf(k, p);
        if (Math.abs(fs - ft) > gap) { gap = Math.abs(fs - ft); gapAt = k; Fs = fs; Ft = ft; }
      }
    } else {
      // exact sup over the sample: check both sides of every jump of the ECDF
      for (let i = 0; i < n; i++) {
        const ft = o.target.cdf(sorted[i], p);
        const a = Math.abs((i + 1) / n - ft), b = Math.abs(i / n - ft);
        if (a > gap) { gap = a; gapAt = sorted[i]; Fs = (i + 1) / n; Ft = ft; }
        if (b > gap) { gap = b; gapAt = sorted[i]; Fs = i / n; Ft = ft; }
      }
    }
    const rl = [{ id: 'one', type: 'hline', y: 1, cls: 'ref-line' }];
    if (disc) {
      const ks = []; for (let k = lo; k <= hi; k++) ks.push([k, ecdf(sorted, k)]);
      const tk = []; for (let k = lo; k <= hi; k++) tk.push([k, o.target.cdf(k, p)]);
      rl.push({ id: 'tcdf', type: 'step', points: tk, x0: xd[0], y0: o.target.cdf(lo - 1, p), cls: 'curve-main' });
      rl.push({ id: 'ecdf', type: 'step', points: ks, x0: xd[0], y0: ecdf(sorted, lo - 1), cls: 'curve-2 curve-thin' });
    } else {
      rl.push({ id: 'ecdf', type: 'line', points: sampleFn(x => ecdf(sorted, x), lo, hi, 400), cls: 'curve-2 curve-thin' });
      rl.push({ id: 'tcdf', type: 'line', points: sampleFn(x => o.target.cdf(x, p), lo, hi, 300), cls: 'curve-main' });
    }
    if (gapAt >= xd[0] && gapAt <= xd[1]) {
      rl.push({ id: 'gap', type: 'segment', x1: gapAt, y1: Fs, x2: gapAt, y2: Ft, cls: 'guide' });
      rl.push({ id: 'gap-dot', type: 'dot', x: gapAt, y: Fs, r: 4.5, cls: 'marker' });
    }
    right.render({ x: xd, y: [-0.02, 1.06], discreteX: disc, layers: rl,
      legend: [{ label: 'sample CDF', cls: 'curve-2' }, { label: 'target CDF', cls: 'curve-main' }] });

    const crit = KS95 / Math.sqrt(n);
    const st = { n, mean: m, sd, gap, gapAt, crit };
    let html = `With ${n.toLocaleString('en-US')} simulated values: sample mean <b>${fmt(m)}</b>, sample standard deviation <b>${fmt(sd)}</b>. `
      + `Largest gap between the sample CDF and the target CDF: <b>${fmt(gap, 3)}</b>. `
      + `For this many draws, gaps up to about ${fmt(crit, 2)} (that is, $1.36/\\sqrt{n}$) are expected from chance alone`
      + (gap <= crit ? ', so the simulation agrees with the target distribution.' : '.');
    if (o.readout) html += ' ' + o.readout(p, st);
    renderRich(F.readout, html);
    if (o.onUpdate) o.onUpdate(p, st, { left, right });
  }
  redraw();
  return { store, redraw, plots: { left, right } };
}

/**
 * Comparison demo for limits and special cases: two distributions overlaid.
 * @param {HTMLElement} container
 * @param {object} ctx
 * @param {object} o
 *   params      param specs for the panel
 *   exact:  { name: p => 'text', pdf(x, p), cdf(x, p), discrete?: boolean }   drawn in steel (solid)
 *   approx: { name: p => 'text', pdf(x, p), cdf(x, p), discrete?: boolean }   drawn dashed
 *   range(p) -> [lo, hi]
 *   intro, xLabel (axis title), xSym (TeX symbol used in the readout, default 'k' or 'x'), leftCaption, rightCaption
 *   handles(p, set) -> raw plot handle descriptors for the left plot (optional); call set(patch) to change params
 *   readout(p, g) -> rich text appended to the standard readout; g = {gap, at}
 */
export function compareDemo(container, ctx, o) {
  const params = o.params || [];
  const store = createStore({ p: defaultsOf(params) });
  const E = o.exact, A = o.approx;
  const anyDisc = !!(E.discrete || A.discrete);
  const F = frame(container, {
    intro: o.intro,
    leftCaption: o.leftCaption || (anyDisc ? 'Probabilities (bars) and the approximating curve' : 'The two densities'),
    rightCaption: o.rightCaption || 'The two CDFs',
  });
  const xLabel = o.xLabel || (anyDisc ? 'k' : 'x');
  const left = new Plot(F.left, { xLabel, yLabel: anyDisc ? 'probability' : 'density' });
  const right = new Plot(F.right, { xLabel, yLabel: 'cumulative probability' });
  const set = patch => {
    const cur = store.get().p, next = { ...cur };
    for (const [k, v0] of Object.entries(patch)) {
      const prm = params.find(q => q.key === k);
      let v = v0;
      if (prm) { v = clamp(v, prm.min, prm.max); if (prm.integer) v = Math.round(v); }
      next[k] = v;
    }
    if (o.check && o.check(next)) return;
    store.set({ p: next });
  };
  const panel = params.length ? paramPanel(F.controls, params, {
    get: () => store.get().p,
    apply: (k, v) => set({ [k]: v }),
    check: o.check ? (k, v) => o.check({ ...store.get().p, [k]: v }) : undefined,
    onReset: () => store.set({ p: defaultsOf(params) }),
  }) : null;

  let raf = 0;
  const request = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; redraw(); }); };
  store.subscribe(() => { if (panel) panel.update(store.get().p); request(); });

  function series(D, p, lo, hi) {
    if (D.discrete) { const pts = []; for (let k = Math.ceil(lo); k <= Math.floor(hi); k++) pts.push([k, D.pdf(k, p)]); return pts; }
    return sampleFn(x => D.pdf(x, p), lo, hi, 400);
  }

  // while a handle is dragged the x axis stays put, so the pointer keeps its meaning; it refits on release
  let frozen = null;
  const wrapHandles = (hs, xd) => hs.map(H => ({ ...H, onDrag: (pt, phase, e) => {
    if (phase === 'start') frozen = xd;
    H.onDrag && H.onDrag(pt, phase, e);
    if (phase === 'end') { frozen = null; request(); }
  } }));

  function redraw() {
    const p = store.get().p;
    let [lo, hi] = o.range(p);
    if (anyDisc) { lo = Math.floor(lo); hi = Math.ceil(hi); }
    let xd = anyDisc ? [lo - 0.7, hi + 0.7] : [lo, hi];
    if (frozen) { xd = frozen; lo = anyDisc ? Math.ceil(xd[0]) : xd[0]; hi = anyDisc ? Math.floor(xd[1]) : xd[1]; }
    const se = series(E, p, xd[0], xd[1]), sa = series(A, p, xd[0], xd[1]);
    const fin = v => (Number.isFinite(v) ? v : 0);
    const ymax = Math.max(1e-12, ...se.map(q => fin(q[1])), ...sa.map(q => fin(q[1]))) * 1.15;
    const layers = [
      E.discrete ? { id: 'e', type: 'stems', points: se, cls: 'pmf' } : { id: 'e', type: 'line', points: se, cls: 'curve-main' },
      A.discrete ? { id: 'a', type: 'stems', points: sa, cls: 'pmf-ref' } : { id: 'a', type: 'line', points: sa, cls: 'curve-ref' },
    ];
    left.render({ x: xd, y: [0, ymax], discreteX: anyDisc, layers, handles: o.handles ? wrapHandles(o.handles(p, set), xd) : [],
      legend: [{ label: rawText(call(E.name, p)), cls: 'curve-main' }, { label: rawText(call(A.name, p)), cls: 'curve-ref' }] });

    // largest CDF gap: at integers when either side is discrete (checking both sides of each jump), else on a grid
    let gap = 0, at = lo, Fe = 0, Fa = 0;
    const test = (x, fe, fa) => { const d = Math.abs(fe - fa); if (d > gap) { gap = d; at = x; Fe = fe; Fa = fa; } };
    if (anyDisc) {
      for (let k = lo; k <= hi; k++) {
        const eL = E.cdf(k - 1e-9, p), aL = A.cdf(k - 1e-9, p);
        test(k, E.cdf(k, p), A.cdf(k, p));
        test(k, eL, aL);
      }
    } else {
      for (let i = 0; i <= 800; i++) { const x = lo + (hi - lo) * i / 800; test(x, E.cdf(x, p), A.cdf(x, p)); }
    }
    const cdfLayer = (D, id, cls) => {
      if (!D.discrete) return { id, type: 'line', points: sampleFn(x => D.cdf(x, p), xd[0], xd[1], 400), cls };
      const ks = []; for (let k = lo; k <= hi; k++) ks.push([k, D.cdf(k, p)]);
      return { id, type: 'step', points: ks, x0: xd[0], y0: D.cdf(lo - 1, p), cls };
    };
    right.render({ x: xd, y: [-0.02, 1.06], discreteX: anyDisc, layers: [
      { id: 'one', type: 'hline', y: 1, cls: 'ref-line' },
      cdfLayer(E, 'e', 'curve-main'), cdfLayer(A, 'a', 'curve-ref'),
      { id: 'gap', type: 'segment', x1: at, y1: Fe, x2: at, y2: Fa, cls: 'guide' },
      { id: 'gap-dot', type: 'dot', x: at, y: Fe, r: 4.5, cls: 'marker' },
    ] });
    const xSym = o.xSym || (anyDisc ? 'k' : 'x');
    let html = `Largest gap between the two CDFs: <b>${fmt(gap, 3)}</b> at $${xSym}$ = ${fmt(at, 4)}.`;
    if (o.readout) html += ' ' + o.readout(p, { gap, at });
    renderRich(F.readout, html);
  }
  redraw();
  return { store, redraw, set, plots: { left, right } };
}

/** Legend labels are plain text; strip $ signs and tags from rich text. */
function rawText(s) {
  if (s === undefined || s === null) return '';
  return String(s).replace(/<[^>]+>/g, '').replace(/\$/g, '');
}
