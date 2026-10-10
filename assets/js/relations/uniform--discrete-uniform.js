// Uniform <-> Discrete uniform: a + floor((b - a + 1) U) ~ DUnif{a, ..., b} for U ~ U(0, 1); conversely
// X_n / n -> U(0, 1) in distribution for X_n ~ DUnif{1, ..., n}.
// Demo: two views (a segmented switch): rolling a die from a uniform number (ctx.demos.simulationDemo plus a plot of
// the step function that does the rounding), and the fine-grid limit (hand-written: stems at k/n and the two CDFs).

import { getRelation } from '../catalog.js';

const REL = getRelation('uniform--discrete-uniform');
const N_MAX = 200;

export default {
  id: 'uniform--discrete-uniform',
  from: 'uniform',
  to: 'discrete-uniform',
  title: 'Rounding down a stretched uniform number gives a discrete uniform integer, and a fine discrete uniform looks continuous',

  plain: [
    'A computer rolls a die by stretching a uniform random number $U$ between 0 and 1 to cover six equal bins and rounding down: $1 + \\lfloor 6U \\rfloor$ is equally likely to be any of $1, 2, \\dots, 6$. In general, $a + \\lfloor (b - a + 1)U \\rfloor$ is equally likely to be any whole number from $a$ to $b$, because each of the $b - a + 1$ bins covers the same length of the interval $[0, 1)$.',
    'In the other direction, take a discrete uniform number on $\\{1, \\dots, n\\}$ and divide it by $n$. Its possible values $1/n, 2/n, \\dots, 1$ form an ever finer grid on $(0, 1]$, each with probability $1/n$. As $n$ grows, the staircase CDF of this grid hugs the straight line of the continuous uniform CDF, and the largest gap between them is exactly $1/n$.',
  ],

  statementTex: REL.statement,
  glossary: [
    { sym: 'U \\sim \\mathrm U(0,1)', meaning: '$U$ is a standard uniform random number between 0 and 1.' },
    { sym: 'a,\\ b', meaning: 'Whole numbers with $a \\le b$: the smallest and largest values of the discrete uniform.' },
    { sym: 'b - a + 1', meaning: 'The number of possible values, which is also the number of equal bins that $[0, 1)$ is cut into.' },
    { sym: '\\lfloor\\cdot\\rfloor', meaning: 'The floor function: rounds a number down to the nearest whole number, for example $\\lfloor 3.7 \\rfloor = 3$.' },
    { sym: '\\mathrm{DUnif}\\{a,\\dots,b\\}', meaning: 'The discrete uniform distribution: each whole number from $a$ to $b$ has probability $1/(b - a + 1)$.' },
    { sym: 'X_n \\sim \\mathrm{DUnif}\\{1,\\dots,n\\}', meaning: '$X_n$ is equally likely to be any of $1, 2, \\dots, n$.' },
    { sym: 'n', meaning: 'The number of values of the discrete uniform; the statement describes what happens as $n$ grows without bound.' },
    { sym: 'X_n/n', meaning: 'The discrete uniform rescaled to the grid $1/n, 2/n, \\dots, 1$ inside $(0, 1]$.' },
    { sym: '\\xrightarrow{d}', meaning: 'Converges in distribution: for every $x$, $P(X_n/n \\le x)$ approaches the uniform probability $x$.' },
    { sym: '\\Rightarrow', meaning: 'Implies: if the left side holds, the right side follows.' },
  ],

  why: [
    '<b>Rolling a die.</b> Write $m = b - a + 1$. For a whole number $j$ with $0 \\le j \\le m - 1$, $\\lfloor mU \\rfloor = j$ exactly when $j \\le mU < j + 1$, that is, when $U$ falls in the bin $[j/m,\\ (j+1)/m)$. Each bin has length $1/m$, so',
    { tex: 'P\\big(a + \\lfloor mU \\rfloor = a + j\\big) = P\\Big(\\frac{j}{m} \\le U < \\frac{j+1}{m}\\Big) = \\frac1m \\quad \\text{for } j = 0, 1, \\dots, m - 1.' },
    'Every value from $a$ to $b$ therefore has probability $1/m$. (The value $U = 1$ would give $b + 1$, but it has probability 0, and random-number generators return values in $[0, 1)$.)',
    '<b>The fine-grid limit.</b> For $0 \\le x \\le 1$, the number of grid points $k/n$ at or below $x$ is $\\lfloor nx \\rfloor$, so',
    { tex: 'P\\Big(\\frac{X_n}{n} \\le x\\Big) = \\frac{\\lfloor nx \\rfloor}{n}, \\qquad x - \\frac1n < \\frac{\\lfloor nx \\rfloor}{n} \\le x,' },
    'which differs from the uniform CDF $x$ by less than $1/n$. The gap goes to 0, which is convergence in distribution. Each individual grid point has probability $1/n \\to 0$: the limit is about the CDF, not about the individual probabilities. The mean $(n+1)/(2n)$ and variance $(n^2 - 1)/(12n^2)$ of $X_n/n$ approach the uniform values $1/2$ and $1/12$.',
  ],

  references: [
    { text: 'Wikipedia: Discrete uniform distribution.', url: 'https://en.wikipedia.org/wiki/Discrete_uniform_distribution' },
    { text: 'Knuth, D. E. (1997). <i>The Art of Computer Programming</i>, Vol. 2: Seminumerical Algorithms (3rd ed.), Section 3.4.1. Addison-Wesley.' },
    { text: 'Casella, G., & Berger, R. L. (2002). <i>Statistical Inference</i> (2nd ed.), Section 5.5.3 (convergence in distribution). Duxbury.' },
    { text: 'Leemis, L. M., & McQueston, J. T. (2008). Univariate distribution relationships. <i>The American Statistician</i>, 62(1), 45–53.', url: 'https://doi.org/10.1198/000313008X270448' },
  ],

  demo(container, ctx) {
    const { ui } = ctx;
    const { h } = ui;
    const dieBox = h('div'), gridBox = h('div', { hidden: true });
    const built = { die: false, grid: false };
    const show = v => {
      dieBox.hidden = v !== 'die'; gridBox.hidden = v !== 'grid';
      if (!built[v]) { built[v] = true; (v === 'die' ? dieDemo : gridDemo)(v === 'die' ? dieBox : gridBox, ctx); }
    };
    const seg = ui.segmented([
      { value: 'die', label: 'Continuous → discrete: a + ⌊(b − a + 1)U⌋' },
      { value: 'grid', label: 'Discrete → continuous: Xₙ/n' },
    ], 'die', show, 'Which direction of the relationship to show');
    container.append(h('div', { style: 'margin-bottom:.6rem' }, seg.el), dieBox, gridBox);
    show('die');
  },
};

// ------------------------------------------------------------------ view 1: rolling a die
function dieDemo(box, { demos, ui, plot, math }) {
  const { h } = ui;
  const sim = demos.simulationDemo(box, null, {
    intro: 'Each simulated value is $a + \\lfloor (b - a + 1)U \\rfloor$ for a fresh uniform number $U$. The bars show how often each whole number came up, and the stems show the discrete uniform probability $1/(b - a + 1)$. The plot at the bottom shows the rounding step itself.',
    params: [
      { key: 'a', sym: 'a', name: 'smallest value', meaning: 'The smallest whole number that can come up.', min: -5, max: 10, default: 1, integer: true },
      { key: 'b', sym: 'b', name: 'largest value', meaning: 'The largest whole number that can come up; it must be at least $a$.', min: -5, max: 15, default: 6, integer: true },
    ],
    check: ({ a, b }) => (b < a ? 'The largest value b must be at least the smallest value a.' : null),
    sample: (rng, { a, b }) => a + Math.floor((b - a + 1) * rng.random()),
    sampleName: 'frequency of each value',
    target: {
      name: ({ a, b }) => `DUnif{${a}, …, ${b}} probabilities`, discrete: true,
      pdf: (k, { a, b }) => (Number.isInteger(k) && k >= a && k <= b ? 1 / (b - a + 1) : 0),
      cdf: (x, { a, b }) => Math.min(1, Math.max(0, (Math.floor(x) - a + 1) / (b - a + 1))),
    },
    range: ({ a, b }) => [a - 1, b + 1],
    xLabel: 'k = a + ⌊(b − a + 1)U⌋',
    readout: ({ a, b }) => `Each value has probability $1/(b - a + 1)$ = <b>${ui.fmt(1 / (b - a + 1), 4)}</b>.`,
  });

  // the step function u -> a + floor(m u)
  const pb = h('div');
  const rd = h('p', { class: 'demo-readout', 'aria-live': 'polite' });
  box.append(h('figure', { class: 'plot-fig', style: 'margin-top:1.4rem' },
    ui.rich('figcaption', 'The rounding step $k = a + \\lfloor (b - a + 1)u \\rfloor$. The interval $[0, 1)$ is cut into $b - a + 1$ bins of equal length, and every $u$ in a bin gives the same whole number. Drag the amber marker along the $u$ axis.'), pb), rd);
  const P = new plot.Plot(pb, { xLabel: 'u (uniform number)', yLabel: 'k', height: w => math.clamp(w * 0.38, 220, 320) });
  let u0 = 0.42;
  const draw = () => {
    const { a, b } = sim.store.get().p;
    const m = b - a + 1;
    const layers = [];
    for (let j = 0; j < m; j++) {
      const k = a + j, x0 = j / m, x1 = (j + 1) / m;
      if (j > 0) layers.push({ id: 'bd' + j, type: 'segment', x1: x0, y1: a - 0.6, x2: x0, y2: b + 0.6, cls: 'ref-line' });
      layers.push({ id: 'st' + j, type: 'line', points: [[x0, k], [x1, k]], cls: 'curve-main' });
      layers.push({ id: 'cl' + j, type: 'dot', x: x0, y: k, r: 3.2 });
    }
    const k0 = a + Math.floor(m * u0);
    layers.push({ id: 'now-h', type: 'segment', x1: 0, y1: k0, x2: u0, y2: k0, cls: 'guide' });
    layers.push({ id: 'now-d', type: 'dot', x: u0, y: k0, r: 5, cls: 'marker' });
    P.render({
      x: [0, 1], y: [a - 0.6, b + 0.6], layers,
      handles: [{
        id: 'u0', type: 'xPoint', x: u0, lineTo: k0, label: 'u',
        ariaLabel: 'Uniform number u. Drag along the axis, or use the arrow keys.',
        valueText: ui.fmt(u0, 3), valueNow: u0, valueMin: 0, valueMax: 0.999,
        onDrag: pt => { if (pt) { u0 = math.clamp(pt.x, 0, 0.999); draw(); } },
        onKey: steps => { u0 = math.clamp(u0 + 0.01 * steps, 0, 0.999); draw(); },
      }],
    });
    const j0 = Math.floor(m * u0);
    ui.renderRich(rd, `$u$ = <b>${ui.fmt(u0, 3)}</b> lies in bin ${j0 + 1} of ${m}, from ${ui.fmt(j0 / m, 3)} to ${ui.fmt((j0 + 1) / m, 3)}, so the result is $k$ = <b>${k0}</b>.`);
  };
  sim.store.subscribe(draw);
  draw();
}

// ------------------------------------------------------------------ view 2: the fine-grid limit
function gridDemo(box, { plot, ui, math }) {
  const { h } = ui;
  const params = [{ key: 'n', sym: 'n', name: 'number of grid points', meaning: 'The discrete uniform takes the values $1, \\dots, n$; divided by $n$, they form a grid of spacing $1/n$ on $(0, 1]$.', min: 1, max: N_MAX, default: 5, integer: true, log: true }];
  const store = ui.createStore({ n: 5 });
  const pmfBox = h('div'), cdfBox = h('div');
  const readout = h('p', { class: 'demo-readout', 'aria-live': 'polite' });
  const controls = h('div', { class: 'demo-controls' });
  box.append(
    ui.rich('p', 'The stems show the probabilities of $X_n/n$: each grid point $k/n$ has probability $1/n$, so the stems get shorter as they get denser. The right plot compares the staircase CDF of $X_n/n$ with the straight-line CDF of $\\mathrm U(0, 1)$. Drag the amber marker under the left plot, which sits at the first grid point $1/n$, toward 0 to make the grid finer.', { class: 'small muted demo-intro' }),
    h('div', { class: 'demo-grid' },
      h('figure', { class: 'plot-fig' }, ui.rich('figcaption', 'Probabilities of $X_n/n$'), pmfBox),
      h('figure', { class: 'plot-fig' }, h('figcaption', {}, 'The two CDFs'), cdfBox)),
    readout, controls);
  const panel = ui.paramPanel(controls, params, {
    get: () => store.get(), apply: (k, v) => store.set({ [k]: v }), onReset: () => store.set({ n: 5 }),
  });
  const pmfPlot = new plot.Plot(pmfBox, { xLabel: 'x = k/n', yLabel: 'probability' });
  const cdfPlot = new plot.Plot(cdfBox, { xLabel: 'x', yLabel: 'cumulative probability' });
  let raf = 0;
  const request = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; draw(); }); };
  store.subscribe(() => { panel.update(store.get()); request(); });

  function draw() {
    const { n } = store.get();
    const xd = [-0.06, 1.06];
    const stems = [];
    for (let k = 1; k <= n; k++) stems.push([k / n, 1 / n]);
    pmfPlot.render({
      x: xd, y: [0, Math.min(1.08, 1.25 / n)],
      layers: [{ id: 'pmf', type: 'stems', points: stems, cls: 'pmf', dots: n <= 60 }],
      handles: [{
        id: 'n', type: 'xPoint', x: 1 / n, label: '1/n',
        ariaLabel: 'First grid point 1/n. Drag toward 0 to increase n, or use the arrow keys.',
        valueText: String(n), valueNow: n, valueMin: 1, valueMax: N_MAX,
        onDrag: pt => { if (pt) store.set({ n: math.clamp(Math.round(1 / Math.max(pt.x, 1 / N_MAX)), 1, N_MAX) }); },
        onKey: steps => store.set({ n: math.clamp(steps > 0 ? Math.min(n - 1, Math.round(n / 1.2)) : Math.max(n + 1, Math.round(n * 1.2)), 1, N_MAX) }),
      }],
      legend: [{ label: `DUnif{1, …, ${n}} / ${n}`, cls: 'curve-main' }],
    });
    const steps = [];
    for (let k = 1; k <= n; k++) steps.push([k / n, k / n]);
    cdfPlot.render({
      x: xd, y: [-0.02, 1.06],
      layers: [
        { id: 'one', type: 'hline', y: 1, cls: 'ref-line' },
        { id: 'unif', type: 'line', points: [[xd[0], 0], [0, 0], [1, 1], [xd[1], 1]], cls: 'curve-ref' },
        { id: 'stair', type: 'step', points: steps, x0: xd[0], y0: 0, cls: 'curve-main' },
        { id: 'gap', type: 'segment', x1: 1 / n, y1: 0, x2: 1 / n, y2: 1 / n, cls: 'guide' },
        { id: 'gap-dot', type: 'dot', x: 1 / n, y: 0, r: 4.5, cls: 'marker' },
      ],
      legend: [{ label: 'CDF of Xₙ/n', cls: 'curve-main' }, { label: 'Uniform(0, 1) CDF', cls: 'curve-ref' }],
    });
    ui.renderRich(readout, `Largest gap between the two CDFs: <b>${ui.fmt(1 / n, 3)}</b> $= 1/n$, just before each jump. `
      + `Mean of $X_n/n$: $(n+1)/(2n)$ = <b>${ui.fmt((n + 1) / (2 * n), 4)}</b> (uniform: 0.5); variance $(n^2 - 1)/(12n^2)$ = <b>${ui.fmt((n * n - 1) / (12 * n * n), 4)}</b> (uniform: $1/12 \\approx 0.08333$).`);
  }
  draw();
}
