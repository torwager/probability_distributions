// Hypergeometric <-> Binomial.
// Forward: as the population size N grows with K/N -> p and n fixed, the hypergeometric approaches Bin(n, p).
// Backward: two independent binomial counts with the same p, conditioned on their total, give a hypergeometric
// count that does not depend on p (the basis of Fisher's exact test).
// The demo has two views (a segmented switch): a limit view built on ctx.demos.compareDemo plus a plot of the
// distance against N with a draggable marker, and a hand-written conditioning simulation.

import { getRelation } from '../catalog.js';

const REL = getRelation('hypergeometric--binomial');
const N_MIN = 40, N_MAX = 10000;

// ---- exact probabilities, computed here so the demo does not depend on other modules
function hypPmfs(N, K, n, logBinom) {
  const out = new Array(n + 1).fill(0);
  const lo = Math.max(0, n + K - N), hi = Math.min(n, K), c = logBinom(N, n);
  for (let k = lo; k <= hi; k++) out[k] = Math.exp(logBinom(K, k) + logBinom(N - K, n - k) - c);
  return out;
}
function binPmfs(n, p, logBinom) {
  const out = new Array(n + 1);
  for (let k = 0; k <= n; k++) {
    out[k] = p <= 0 ? (k === 0 ? 1 : 0) : p >= 1 ? (k === n ? 1 : 0) : Math.exp(logBinom(n, k) + k * Math.log(p) + (n - k) * Math.log1p(-p));
  }
  return out;
}
const cum = a => { let s = 0; return a.map(v => (s += v)); };
const stepAt = (F, x) => { const k = Math.floor(x); return k < 0 ? 0 : k >= F.length ? 1 : Math.min(1, F[k]); };
const tv = (a, b) => 0.5 * a.reduce((s, v, i) => s + Math.abs(v - (b[i] || 0)), 0);
const lineThrough = (pm, x) => {
  if (x < 0 || x > pm.length - 1) return NaN;   // only between the possible counts
  const k0 = Math.floor(x), t = x - k0, v = k => (k < 0 || k >= pm.length ? 0 : pm[k]);
  return (1 - t) * v(k0) + t * v(k0 + 1);
};

export default {
  id: 'hypergeometric--binomial',
  from: 'hypergeometric',
  to: 'binomial',
  title: 'Sampling without replacement from a large population is almost binomial; conditioning two binomial counts on their total gives a hypergeometric count',

  summary: 'In a large population, drawing without replacement is almost like drawing with replacement, so the hypergeometric approaches the binomial. Conversely, given the total of two independent binomial counts with the same $p$, the first count is hypergeometric.',

  plain: [
    'The hypergeometric distribution counts the successes among $n$ items drawn without replacement from a population of $N$ items, $K$ of which are successes. The binomial distribution counts successes in $n$ independent trials with a fixed success probability $p$, which is what you get when every drawn item is put back before the next draw. When the population is very large compared with the sample, removing a few items hardly changes the proportion of successes $K/N$ that remain, so the two ways of drawing give almost the same probabilities. As $N$ grows with $K/N$ fixed at $p$, the hypergeometric distribution approaches $\\mathrm{Bin}(n, p)$.',
    'The relationship also runs the other way. Suppose a first group of $K$ units and a second group of $N - K$ units each succeed independently with the same probability $p$, giving binomial counts $X$ and $Y$. If you are told only that the total number of successes is $X + Y = n$, then the number of those successes that fall in the first group is hypergeometric: every set of $n$ successful units out of the $N$ is equally likely, whatever $p$ is. Because the unknown $p$ drops out, this conditional distribution gives an exact test of whether two groups have the same success probability. That test is Fisher’s exact test.',
  ],

  statementTex: REL.statement,
  glossary: [
    { sym: 'N', meaning: 'The population size (for the conditioning statement, the total number of units in the two groups).' },
    { sym: 'K', meaning: 'The number of successes in the population (for the conditioning statement, the size of the first group).' },
    { sym: 'n', meaning: 'The number of draws (for the conditioning statement, the total number of successes in both groups).' },
    { sym: 'N \\to \\infty', meaning: 'The population size grows without bound.' },
    { sym: 'K/N \\to p \\in [0, 1]', meaning: 'Meanwhile the proportion of successes in the population settles at a fixed value $p$ between 0 and 1.' },
    { sym: 'n \\text{ fixed}', meaning: 'The number of draws stays the same while the population grows.' },
    { sym: '\\mathrm{Hypergeometric}(N, K, n)', meaning: 'The distribution of the number of successes in $n$ draws without replacement from $N$ items of which $K$ are successes.' },
    { sym: '\\xrightarrow{d}', meaning: 'Converges in distribution: the probability of every count approaches the corresponding binomial probability.' },
    { sym: '\\mathrm{Binomial}(n, p),\\ \\mathrm{Bin}(n, p)', meaning: 'The distribution of the number of successes in $n$ independent trials with success probability $p$.' },
    { sym: 'X \\sim \\mathrm{Bin}(K, p)', meaning: 'The number of successes among the $K$ units of the first group.' },
    { sym: 'Y \\sim \\mathrm{Bin}(N - K, p)', meaning: 'The number of successes among the $N - K$ units of the second group, independent of $X$ and with the same $p$.' },
    { sym: 'X \\mid X + Y = n', meaning: 'The distribution of $X$ once we know that the total number of successes is $n$.' },
    { sym: 'p \\in (0, 1)', meaning: 'The common success probability, strictly between 0 and 1. The conditional distribution is the same for every such $p$.' },
  ],

  why: [
    '<b>The limit.</b> Write the hypergeometric probability by counting ordered draws. The chance that the first $k$ draws are successes and the remaining $n - k$ are failures is a product of fractions, and there are $\\binom{n}{k}$ orders, so',
    { tex: 'P(X = k) = \\binom{n}{k} \\frac{K}{N}\\cdot\\frac{K - 1}{N - 1}\\cdots\\frac{K - k + 1}{N - k + 1}\\cdot\\frac{N - K}{N - k}\\cdots\\frac{N - K - n + k + 1}{N - n + 1}.' },
    'There are $k$ fractions of the first kind and $n - k$ of the second. As $N \\to \\infty$ with $K/N \\to p$ and $n$ fixed, each fraction of the first kind tends to $p$ and each of the second kind tends to $1 - p$, because subtracting a few items from $K$ and $N$ no longer matters. The product therefore tends to $\\binom{n}{k} p^k (1 - p)^{n - k}$, the binomial probability.',
    'The variance shows how fast this happens. The hypergeometric variance is the binomial variance $np(1-p)$ times the finite-population correction $(N - n)/(N - 1)$, which is close to 1 when the sampling fraction $n/N$ is small. A common rule of thumb uses the binomial approximation when $n \\le N/10$.',
    '<b>The converse.</b> For $X \\sim \\mathrm{Bin}(K, p)$ and $Y \\sim \\mathrm{Bin}(N - K, p)$ independent, the total $X + Y$ is $\\mathrm{Bin}(N, p)$. By the definition of conditional probability,',
    { tex: 'P(X = k \\mid X + Y = n) = \\frac{\\binom{K}{k} p^k (1-p)^{K-k}\\,\\binom{N-K}{n-k} p^{n-k}(1-p)^{N-K-n+k}}{\\binom{N}{n} p^n (1-p)^{N-n}} = \\frac{\\binom{K}{k}\\binom{N-K}{n-k}}{\\binom{N}{n}}.' },
    'All the powers of $p$ and $1 - p$ cancel, leaving the hypergeometric probability. In Fisher’s exact test the two groups are the rows of a 2 × 2 table and $n$ is the total number of successes; under the null hypothesis of equal success probabilities, the count in one cell given the margins is hypergeometric, and the p-value can be computed without knowing $p$.',
  ],

  references: [
    { text: 'Wikipedia: Hypergeometric distribution, relationship to the binomial and Fisher’s exact test.', url: 'https://en.wikipedia.org/wiki/Hypergeometric_distribution' },
    { text: 'Wikipedia: Fisher’s exact test.', url: 'https://en.wikipedia.org/wiki/Fisher%27s_exact_test' },
    { text: 'Casella, G., & Berger, R. L. (2002). <i>Statistical Inference</i> (2nd ed.), Section 3.2. Duxbury.' },
    { text: 'Johnson, N. L., Kemp, A. W., & Kotz, S. (2005). <i>Univariate Discrete Distributions</i> (3rd ed.), Chapter 6. Wiley.' },
    { text: 'Agresti, A. (2013). <i>Categorical Data Analysis</i> (3rd ed.), Section 3.5 (exact inference for small samples). Wiley.' },
    { text: 'Leemis, L. M., & McQueston, J. T. (2008). Univariate distribution relationships. <i>The American Statistician</i>, 62(1), 45–53.', url: 'https://doi.org/10.1198/000313008X270448' },
  ],

  demo(container, ctx) {
    const { ui } = ctx;
    const { h } = ui;
    const limitBox = h('div'), condBox = h('div', { hidden: true });
    const built = { limit: false, cond: false };
    const show = v => {
      limitBox.hidden = v !== 'limit'; condBox.hidden = v !== 'cond';
      if (!built[v]) { built[v] = true; (v === 'limit' ? limitDemo : condDemo)(v === 'limit' ? limitBox : condBox, ctx); }
    };
    const seg = ui.segmented([
      { value: 'limit', label: 'Large population: N → ∞' },
      { value: 'cond', label: 'Two binomials given their total' },
    ], 'limit', show, 'Which direction of the relationship to show');
    container.append(h('div', { style: 'margin-bottom:.6rem' }, seg.el), limitBox, condBox);
    show('limit');
  },
};

// ------------------------------------------------------------------ view 1: the limit N -> infinity
function limitDemo(box, { demos, math, plot, ui }) {
  const { h } = ui;
  const Kof = ({ N, q }) => Math.round(q * N);
  const cmp = demos.compareDemo(box, null, {
    intro: 'The stems are the hypergeometric probabilities for $n$ draws without replacement from $N$ items, $K = qN$ of them successes. The grey stems beside them are the binomial probabilities for $n$ draws with replacement, with $p = K/N$. Increase the population size $N$ (with the box, or by dragging the amber marker on the lower plot) and the two sets of stems become the same. A larger sample $n$ needs a larger population.',
    params: [
      { key: 'N', sym: 'N', name: 'population size', meaning: 'Total number of items. The limit in the statement is $N \\to \\infty$.', min: N_MIN, max: N_MAX, default: 60, integer: true, log: true },
      { key: 'q', sym: 'K/N', name: 'success fraction', meaning: 'The fraction of items in the population that are successes; $K$ is $qN$ rounded to a whole number. It plays the role of $p$.', min: 0.02, max: 0.98, default: 0.3, step: 0.01 },
      { key: 'n', sym: 'n', name: 'number of draws', meaning: 'How many items are drawn. It stays fixed in the limit.', min: 1, max: 40, default: 12, integer: true },
    ],
    exact: {
      name: p => `Hypergeometric(N = ${p.N}, K = ${Kof(p)}, n = ${p.n})`, discrete: true,
      pdf: (k, p) => hypPmfs(p.N, Kof(p), p.n, math.logBinom)[k] || 0,
      cdf: (x, p) => stepAt(cum(hypPmfs(p.N, Kof(p), p.n, math.logBinom)), x),
    },
    approx: {
      name: p => `Binomial(n = ${p.n}, p = ${ui.fmt(Kof(p) / p.N, 3)}), with replacement`,
      discrete: true,
      pdf: (x, p) => lineThrough(binPmfs(p.n, Kof(p) / p.N, math.logBinom), x),
      cdf: (x, p) => stepAt(cum(binPmfs(p.n, Kof(p) / p.N, math.logBinom)), x),
    },
    range: p => [0, p.n],
    xLabel: 'k (number of successes drawn)',
    readout: p => {
      const K = Kof(p), d = tv(hypPmfs(p.N, K, p.n, math.logBinom), binPmfs(p.n, K / p.N, math.logBinom));
      const fpc = (p.N - p.n) / (p.N - 1);
      return `Total variation distance (half the summed absolute differences of the probabilities): <b>${ui.fmt(d, 3)}</b>. `
        + `The hypergeometric variance is the binomial variance times $(N - n)/(N - 1)$ = <b>${ui.fmt(fpc, 4)}</b>. `
        + `The sampling fraction $n/N$ is ${ui.fmt(p.n / p.N, 3)}` + (p.n <= p.N / 10 ? ', within the rule of thumb $n \\le N/10$.' : ', above the rule-of-thumb limit of 0.1.');
    },
  });

  // ---- distance against N, with a marker that can be dragged along the (logarithmic) N axis
  const distBox = h('div');
  box.append(h('figure', { class: 'plot-fig', style: 'margin-top:1.2rem' },
    ui.rich('figcaption', 'Total variation distance between the two distributions for every population size $N$ (logarithmic axis), at this $n$ and $K/N$. Drag the amber marker to change the population size.'), distBox));
  const P = new plot.Plot(distBox, { xLabel: 'population size N (logarithmic scale)', yLabel: 'distance', xTicks: false, height: w => Math.max(180, Math.min(250, w * 0.3)) });
  const L0 = Math.log10(N_MIN), L1 = Math.log10(N_MAX);
  let cache = { key: '', pts: [] };
  const curve = (q, n) => {
    const key = q + '|' + n;
    if (cache.key !== key) {
      const pts = [];
      for (let i = 0; i <= 90; i++) {
        const N = Math.round(Math.pow(10, L0 + (L1 - L0) * i / 90));
        const K = Math.round(q * N);
        pts.push([Math.log10(N), tv(hypPmfs(N, K, n, math.logBinom), binPmfs(n, K / N, math.logBinom))]);
      }
      cache = { key, pts };
    }
    return cache.pts;
  };
  let raf = 0;
  const draw = () => {
    const p = cmp.store.get().p;
    const pts = curve(p.q, p.n);
    const K = Kof(p);
    const now = tv(hypPmfs(p.N, K, p.n, math.logBinom), binPmfs(p.n, K / p.N, math.logBinom));
    const top = Math.max(0.02, ...pts.map(v => v[1])) * 1.15;
    const layers = [];
    for (const v of [100, 1000, 10000]) {
      layers.push({ id: 'g' + v, type: 'vline', x: Math.log10(v), cls: 'ref-line' });
      layers.push({ id: 't' + v, type: 'text', x: Math.log10(v), y: top * 0.9, text: `N = ${v.toLocaleString('en-US')}`, anchor: v === 10000 ? 'end' : 'start', dx: v === 10000 ? -4 : 4 });
    }
    layers.push({ id: 'tv', type: 'line', points: pts, cls: 'curve-main' });
    layers.push({ id: 'now', type: 'dot', x: Math.log10(p.N), y: now, r: 5, cls: 'marker' });
    P.render({
      x: [L0 - 0.05, L1 + 0.05], y: [0, top], layers,
      handles: [{
        id: 'N', type: 'xPoint', x: Math.log10(p.N), label: 'N', lineTo: now,
        ariaLabel: 'Population size N. Drag left or right, or use the arrow keys.', valueText: String(p.N), valueNow: p.N, valueMin: N_MIN, valueMax: N_MAX,
        onDrag: pt => { if (pt) cmp.set({ N: Math.round(Math.pow(10, math.clamp(pt.x, L0, L1))) }); },
        onKey: steps => cmp.set({ N: Math.round(math.clamp(cmp.store.get().p.N * Math.pow(1.1, steps), N_MIN, N_MAX)) }),
      }],
    });
  };
  cmp.store.subscribe(() => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; draw(); }); });
  draw();
}

// ------------------------------------------------------------------ view 2: conditioning two binomials on their total
function condDemo(box, { math, plot, ui }) {
  const { h } = ui;
  const params = [
    { key: 'N', sym: 'N', name: 'total number of units', meaning: 'The number of units in both groups together.', min: 4, max: 100, default: 40, integer: true },
    { key: 'K', sym: 'K', name: 'size of group 1', meaning: 'The number of units in the first group; the second group has $N - K$.', min: 1, max: 99, default: 15, integer: true },
    { key: 'n', sym: 'n', name: 'total successes kept', meaning: 'Only simulated pairs with $X + Y = n$ are kept.', min: 0, max: 100, default: 12, integer: true },
    { key: 'p', sym: 'p', name: 'success probability', meaning: 'The common success probability of every unit. It changes how many pairs are kept, but not the distribution of the kept values of $X$.', min: 0.02, max: 0.98, default: 0.25, step: 0.01 },
  ];
  const defaults = { N: 40, K: 15, n: 12, p: 0.25 };
  const fix = (s, changed) => {
    const q = { ...s };
    if (q.K > q.N - 1) { if (changed === 'K') q.N = Math.min(100, q.K + 1); q.K = Math.min(q.K, q.N - 1); }
    if (q.n > q.N) { if (changed === 'n') q.N = q.n; else q.n = q.N; }
    return q;
  };
  const store = ui.createStore({ ...defaults, M: 20000, seed: 1 });
  const leftBox = h('div'), rightBox = h('div');
  const readout = h('p', { class: 'demo-readout', 'aria-live': 'polite' });
  const controls = h('div', { class: 'demo-controls' });
  // the plots come first (visible on a laptop screen); the explanation follows the controls
  box.append(
    h('div', { class: 'demo-grid' },
      h('figure', { class: 'plot-fig' }, ui.rich('figcaption', 'Kept values of $X$ and the hypergeometric probabilities'), leftBox),
      h('figure', { class: 'plot-fig' }, ui.rich('figcaption', 'Total successes $X + Y \\sim \\mathrm{Bin}(N, p)$; pairs with total $n$ are kept'), rightBox)),
    readout, controls,
    ui.rich('p', 'Each simulated pair is a count $X \\sim \\mathrm{Bin}(K, p)$ for the first group and an independent count $Y \\sim \\mathrm{Bin}(N - K, p)$ for the second. The right plot shows the distribution of the total $X + Y$; only the pairs whose total equals $n$ (the amber bar) are kept. The left plot compares the kept values of $X$ with the $\\mathrm{Hypergeometric}(N, K, n)$ probabilities. Drag the dashed line on the right plot to change $p$: fewer or more pairs are kept, but the shape on the left does not change. Drag the marker labeled $n$ to change the total.', { class: 'small muted demo-intro' }));

  const panel = ui.paramPanel(controls, params, {
    get: () => store.get(),
    apply: (k, v) => store.set(fix({ ...store.get(), [k]: v }, k)),
    onReset: () => store.set({ ...defaults }),
  });
  const sizeCtl = ui.segmented([2000, 20000, 200000].map(v => ({ value: v, label: `${v.toLocaleString('en-US')} pairs` })), 20000, v => store.set({ M: v }), 'Number of simulated pairs');
  const again = h('button', { type: 'button', class: 'btn small-btn' }, 'Draw new samples');
  again.addEventListener('click', () => store.set({ seed: store.get().seed + 1 }));
  controls.append(h('div', { class: 'demo-sim-ctl' }, h('h3', { class: 'mini-title' }, 'Simulation'), sizeCtl.el, h('div', {}, again)));

  const left = new plot.Plot(leftBox, { xLabel: 'x (successes in group 1)', yLabel: 'probability', height: (w, H) => plot.fitHeight(w, H, { ratio: 0.62, phoneRatio: 0.7, min: 220, max: 400 }) });
  const right = new plot.Plot(rightBox, { xLabel: 'total successes x + y', yLabel: 'probability', height: (w, H) => plot.fitHeight(w, H, { ratio: 0.62, phoneRatio: 0.7, min: 220, max: 400 }) });

  let sim = { key: '' };
  function simulate(s) {
    const key = [s.N, s.K, s.p, s.M, s.seed].join('|');
    if (sim.key !== key) {
      const rng = math.makeRng(97 + 31 * s.seed);
      // for every total t, a histogram of x among the pairs with X + Y = t
      const byTotal = Array.from({ length: s.N + 1 }, () => new Array(s.K + 1).fill(0));
      const totals = new Array(s.N + 1).fill(0);
      for (let i = 0; i < s.M; i++) {
        const x = rng.binomial(s.K, s.p), y = rng.binomial(s.N - s.K, s.p);
        byTotal[x + y][x]++; totals[x + y]++;
      }
      sim = { key, byTotal, totals };
    }
    return sim;
  }

  let raf = 0, dragView = null;
  const request = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; draw(); }); };
  store.subscribe(() => { panel.update(store.get()); request(); });

  function draw() {
    const s = store.get();
    const { N, K, n, p, M } = s;
    const sm = simulate(s);
    const kept = sm.totals[n], hist = sm.byTotal[n];
    const hyp = hypPmfs(N, K, n, math.logBinom);
    const lo = Math.max(0, n + K - N), hi = Math.min(n, K);
    const freq = hist.map(c => (kept ? c / kept : 0));
    const top = Math.max(...hyp, ...freq) * 1.15 || 1;
    const xs = [Math.max(0, lo - 1), Math.max(lo + 1, Math.min(K, hi + 1))];
    left.render({
      x: [xs[0] - 0.7, xs[1] + 0.7], y: [0, Math.min(1.08, top)], discreteX: true,
      layers: [
        { id: 'freq', type: 'bars', points: freq.map((f, k) => [k, f]).filter(([k]) => k >= xs[0] && k <= xs[1]), width: 0.7, cls: 'bars-strong' },
        { id: 'hyp', type: 'stems', points: hyp.map((v, k) => [k, v]).filter(([k]) => k >= xs[0] && k <= xs[1]), cls: 'pmf' },
      ],
      legend: [{ label: `kept values of X (${kept.toLocaleString('en-US')} pairs)`, cls: 'bars-strong' }, { label: `Hypergeometric(N = ${N}, K = ${K}, n = ${n})`, cls: 'curve-main' }],
    });

    // right: the total, Bin(N, p), with the kept bar highlighted
    const tot = binPmfs(N, p, math.logBinom);
    const mu = N * p, sd = Math.sqrt(N * p * (1 - p));
    let x0 = Math.max(0, Math.floor(mu - 4.5 * sd) - 1), x1 = Math.min(N, Math.ceil(mu + 4.5 * sd) + 1);
    x0 = Math.min(x0, Math.max(0, n - 2)); x1 = Math.max(x1, Math.min(N, n + 2));
    let xd = [x0 - 0.7, x1 + 0.7];
    if (dragView) xd = dragView;
    const pts = []; for (let t = Math.max(0, Math.ceil(xd[0])); t <= Math.min(N, Math.floor(xd[1])); t++) pts.push([t, tot[t]]);
    const rtop = Math.max(...pts.map(v => v[1]), 0.02) * 1.25;
    const freeze = (phase) => { if (phase === 'start') dragView = xd; if (phase === 'end') { dragView = null; request(); } };
    right.render({
      x: xd, y: [0, rtop], discreteX: true,
      layers: [
        { id: 'tot', type: 'bars', points: pts.filter(([t]) => t !== n), width: 0.7, cls: 'bars' },
        { id: 'keep', type: 'polygon', points: [[n - 0.35, 0], [n + 0.35, 0], [n + 0.35, tot[n] || 0], [n - 0.35, tot[n] || 0]], cls: 'area-shade' },
      ],
      handles: [
        {
          id: 'p', type: 'vline', x: mu, label: 'Np',
          ariaLabel: 'Mean number of successes Np. Drag to change p, or use the arrow keys.', valueText: ui.fmt(p, 3), valueNow: p, valueMin: 0.02, valueMax: 0.98,
          onDrag: (pt, phase) => { freeze(phase); if (pt) store.set({ p: math.roundTo(math.clamp(pt.x / N, 0.02, 0.98), 0.005) }); },
          onKey: steps => store.set({ p: math.roundTo(math.clamp(store.get().p + 0.01 * steps, 0.02, 0.98), 0.01) }),
        },
        {
          id: 'n', type: 'xPoint', x: n, label: 'n',
          ariaLabel: 'Total number of successes n that is kept. Drag, or use the arrow keys.', valueText: String(n), valueNow: n, valueMin: 0, valueMax: N,
          onDrag: (pt, phase) => { freeze(phase); if (pt) store.set({ n: Math.round(math.clamp(pt.x, 0, N)) }); },
          onKey: steps => store.set({ n: math.clamp(store.get().n + steps, 0, N) }),
        },
      ],
      legend: [{ label: `Binomial(N = ${N}, p = ${ui.fmt(p, 3)}) for the total`, cls: 'bars' }, { label: `total = n = ${n}: these pairs are kept`, cls: 'area-shade' }],
    });

    // readout: largest CDF gap between kept values and the hypergeometric
    let gap = 0, Fe = 0, Fh = 0;
    for (let k = 0; k <= K; k++) { Fe += freq[k] || 0; Fh += hyp[k] || 0; gap = Math.max(gap, Math.abs(Fe - Fh)); }
    const crit = kept > 0 ? 1.36 / Math.sqrt(kept) : NaN;
    ui.renderRich(readout,
      `Of ${M.toLocaleString('en-US')} simulated pairs, <b>${kept.toLocaleString('en-US')}</b> had total $X + Y = n$ (expected fraction $P(\\mathrm{Bin}(N, p) = n)$ = ${ui.fmt(tot[n], 3)}). `
      + (kept >= 30
        ? `Largest gap between the CDF of the kept values and the hypergeometric CDF: <b>${ui.fmt(gap, 3)}</b>; gaps up to about ${ui.fmt(crit, 2)} are expected from chance with this many kept pairs. `
        : 'Too few pairs were kept for a useful comparison; move $p$ so that $Np$ is closer to $n$, or simulate more pairs. ')
      + `The hypergeometric mean is $nK/N$ = <b>${ui.fmt(n * K / N, 4)}</b>, and it does not involve $p$.`);
  }
  draw();
}
