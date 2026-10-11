// Normal <-> Log-normal: X ~ N(mu, sigma^2) if and only if Y = e^X ~ LogNormal(mu, sigma).
// Demo: three views switched with a segmented control.
//  1. "Two scales": the normal density of X and the log-normal density of Y = e^X side by side, with a band
//     a < X <= b on the left and the matching band e^a < Y <= e^b on the right; both bands can be dragged on
//     either plot (both directions of the relationship), and they always hold the same probability.
//  2. simulationDemo: exponentiate normal draws and compare with the log-normal density.
//  3. simulationDemo: products of many independent positive factors are approximately log-normal.
// Self-contained: densities are computed with ctx.math, not with the distribution modules.

import { getRelation } from '../catalog.js';
import { normalCdf, normalPdf, normalQuantile, clamp } from '../core/math.js';

const REL = getRelation('normal--log-normal');

const lnPdf = (y, mu, s) => (y <= 0 ? 0 : normalPdf((Math.log(y) - mu) / s) / (s * y));
const lnCdf = (y, mu, s) => (y <= 0 ? 0 : normalCdf((Math.log(y) - mu) / s));
/** Upper end of a plotting window for the log-normal: a lower percentile for large sigma so the peak stays visible. */
function lnHi(mu, s) {
  const z = s <= 0.6 ? 3.29 : s <= 1.2 ? 3.29 - 1.2 * (s - 0.6) : Math.max(1.6, 2.57 - 1.2 * (s - 1.2));
  return Math.exp(mu + s * z);
}
function lnWindow(mu, s) {
  const hi = lnHi(mu, s), lo = Math.exp(mu - 3.29 * s);
  return lo > 0.25 * hi ? [lo - 0.08 * (hi - lo), hi] : [-0.02 * hi, hi];
}

const PARAMS = [
  { key: 'mu', sym: '\\mu', name: 'mean of X = ln Y', meaning: 'The mean $\\mu$ of the normal variable $X$; $e^{\\mu}$ is the median of $Y = e^X$.', min: -1, max: 2, default: 0, step: 0.05 },
  { key: 'sigma', sym: '\\sigma', name: 'standard deviation', meaning: 'The standard deviation $\\sigma$ of $X$; on the scale of $Y$ it sets the spread and the skewness.', min: 0.1, max: 1.5, default: 0.5, step: 0.05 },
];

export default {
  id: 'normal--log-normal',
  from: 'normal',
  to: 'log-normal',
  title: 'Exponentiating a normal variable gives a log-normal variable, and taking the log of a log-normal variable gives a normal one',

  summary: 'Exponentiating a normal variable gives a log-normal variable, and taking the log of a log-normal variable gives back a normal one. Because sums of many small independent effects tend to be normal, products of many small positive factors tend to be log-normal.',

  plain: [
    'If $X$ has a normal distribution with mean $\\mu$ and standard deviation $\\sigma$, then $Y = e^X$ has a log-normal distribution with the same two parameters. Going the other way, if $Y$ is log-normal then $\\ln Y$ is normal. The parameters $\\mu$ and $\\sigma$ of a log-normal distribution are therefore the mean and standard deviation of its logarithm, not of $Y$ itself.',
    'The exponential function turns sums into products: $e^{a + b} = e^a e^b$. Because sums of many small independent effects tend to be normal (the central limit theorem), products of many small independent positive factors tend to be log-normal. That is why quantities that grow by random percentages, such as incomes, sizes of organisms, concentrations and response times, are often modeled as log-normal.',
    'Probabilities carry over directly: the event $a < X \\le b$ is the same event as $e^a < Y \\le e^b$, so the two have the same probability. Medians and other quantiles carry over too ($e^{\\mu}$ is the median of $Y$), but the mean does not: the mean of $Y$ is $e^{\\mu + \\sigma^2/2}$, larger than $e^{\\mu}$.',
  ],

  statementTex: REL.statement,
  glossary: [
    { sym: 'X \\sim \\mathcal N(\\mu, \\sigma^2)', meaning: '$X$ has a normal distribution with mean $\\mu$ and variance $\\sigma^2$.' },
    { sym: '\\mu', meaning: 'The mean of $X$, which is also the mean of $\\ln Y$. Any real number.' },
    { sym: '\\sigma', meaning: 'The standard deviation of $X$, which is also the standard deviation of $\\ln Y$. A positive number.' },
    { sym: 'Y = e^X', meaning: 'The new variable obtained by applying the exponential function to $X$; $e \\approx 2.71828$ is the base of natural logarithms. $Y$ is always positive.' },
    { sym: '\\mathrm{LogNormal}(\\mu, \\sigma)', meaning: 'The log-normal distribution whose logarithm has mean $\\mu$ and standard deviation $\\sigma$.' },
    { sym: '\\iff', meaning: 'If and only if: each statement implies the other, so $X = \\ln Y$ is normal exactly when $Y$ is log-normal.' },
  ],

  why: [
    'The exponential function is increasing, so $Y = e^X$ is at most $y$ exactly when $X$ is at most $\\ln y$. For $y > 0$ this gives the CDF of $Y$:',
    { tex: 'F_Y(y) = P(e^X \\le y) = P(X \\le \\ln y) = \\Phi\\!\\left(\\frac{\\ln y - \\mu}{\\sigma}\\right),' },
    'where $\\Phi$ is the standard normal CDF. Differentiating with respect to $y$ (the chain rule brings in the derivative of $\\ln y$, which is $1/y$) gives the log-normal density',
    { tex: 'f_Y(y) = \\frac{1}{y}\\,\\frac{1}{\\sigma\\sqrt{2\\pi}} \\exp\\!\\left(-\\frac{(\\ln y - \\mu)^2}{2\\sigma^2}\\right), \\qquad y > 0.' },
    'The factor $1/y$ is the stretching of the axis by the exponential function: an interval of width $dx$ near $x$ becomes an interval of width $e^x\\,dx = y\\,dx$ near $y$, so the same probability is spread over a wider interval when $y$ is large. This is what produces the long right tail. Reading the same steps backward, with $X = \\ln Y$, proves the converse.',
    'Moments of $Y$ are values of the normal moment-generating function $M_X(t) = e^{\\mu t + \\sigma^2 t^2/2}$: $\\mathrm{E}[Y^n] = \\mathrm{E}[e^{nX}] = M_X(n) = e^{n\\mu + n^2\\sigma^2/2}$. With $n = 1$ the mean of $Y$ is $e^{\\mu + \\sigma^2/2}$, while the median is $e^{\\mu}$, because an increasing function keeps quantiles in place but not averages (Jensen’s inequality).',
    'Products explain why log-normal data are common. If $Y = V_1 V_2 \\cdots V_n$ for independent positive factors, then $\\ln Y = \\ln V_1 + \\dots + \\ln V_n$ is a sum, which the central limit theorem makes approximately normal when $n$ is large and the $\\ln V_i$ have finite variance. Then $Y$ is approximately log-normal.',
  ],

  references: [
    { text: 'Wikipedia: Log-normal distribution.', url: 'https://en.wikipedia.org/wiki/Log-normal_distribution' },
    { text: 'Casella, G., & Berger, R. L. (2002). <i>Statistical Inference</i> (2nd ed.), Section 2.1 (transformations) and Example 2.3.10. Duxbury.' },
    { text: 'Johnson, N. L., Kotz, S., & Balakrishnan, N. (1994). <i>Continuous Univariate Distributions</i>, Vol. 1 (2nd ed.), Chapter 14. Wiley.' },
    { text: 'Limpert, E., Stahel, W. A., & Abbt, M. (2001). Log-normal distributions across the sciences: Keys and clues. <i>BioScience</i>, 51(5), 341–352.', url: 'https://doi.org/10.1641/0006-3568(2001)051[0341:LNDATS]2.0.CO;2' },
    { text: 'Leemis, L. M., & McQueston, J. T. (2008). Univariate distribution relationships. <i>The American Statistician</i>, 62(1), 45–53.', url: 'https://doi.org/10.1198/000313008X270448' },
  ],

  demo(container, ctx) {
    const { ui } = ctx;
    const { h } = ui;
    const views = { scales: twoScales, sim: simulateExp, prod: products };
    const boxes = {}, built = {};
    for (const k of Object.keys(views)) boxes[k] = h('div', { hidden: true });
    const show = v => {
      for (const k of Object.keys(views)) boxes[k].hidden = k !== v;
      if (!built[v]) { built[v] = true; views[v](boxes[v], ctx); }
    };
    const seg = ui.segmented([
      { value: 'scales', label: 'Two scales' },
      { value: 'sim', label: 'Simulate e^X' },
      { value: 'prod', label: 'Products' },
    ], 'scales', show, 'Which demonstration to show');
    container.append(h('div', { style: 'margin-bottom:.8rem' }, seg.el), ...Object.values(boxes));
    show('scales');
  },
};

// ------------------------------------------------------------------ view 1: two linked scales
function twoScales(box, { math, plot, ui }) {
  const { h } = ui;
  const defaults = () => ({ mu: 0, sigma: 0.5 });
  // the band is stored in standard units of X (a = mu + za sigma), so it moves with the parameters
  const store = ui.createStore({ p: defaults(), za: -1, zb: 2 });
  const leftBox = h('div'), rightBox = h('div');
  const readout = h('p', { class: 'demo-readout', 'aria-live': 'polite' });
  const controls = h('div', { class: 'demo-controls' });
  box.append(
    h('div', { class: 'demo-grid' },
      h('figure', { class: 'plot-fig' }, ui.rich('figcaption', 'Normal density of $X = \\ln Y$'), leftBox),
      h('figure', { class: 'plot-fig' }, ui.rich('figcaption', 'Log-normal density of $Y = e^X$'), rightBox)),
    readout, controls,
    ui.rich('p', 'The left plot shows the normal density of $X$ and the right plot the log-normal density of $Y = e^X$. The shaded band $a < X \\le b$ on the left and the band $e^a < Y \\le e^b$ on the right are the same event, so they always have the same area. Drag the band ends (amber triangles) on either plot, drag the line at $\\mu$ and the arrow for $\\sigma$ on the left, or type values. Notice that the center $\\mu$ of $X$ becomes the median $e^{\\mu}$ of $Y$, not its mean.', { class: 'small muted demo-intro' }));

  const panel = ui.paramPanel(controls, PARAMS, {
    get: () => store.get().p,
    apply: (k, v) => store.set({ p: { ...store.get().p, [k]: v } }),
    onReset: () => store.set({ p: defaults(), za: -1, zb: 2 }),
  });
  const L = new plot.Plot(leftBox, { xLabel: 'x = ln y', yLabel: 'density', height: (w, H) => plot.fitHeight(w, H) });
  const R = new plot.Plot(rightBox, { xLabel: 'y = eˣ', yLabel: 'density', height: (w, H) => plot.fitHeight(w, H) });

  let frozen = null; // {L, R} x domains kept fixed while something is dragged
  const setP = patch => {
    const cur = store.get().p, next = { ...cur };
    for (const [k, v] of Object.entries(patch)) {
      const prm = PARAMS.find(q => q.key === k);
      next[k] = Math.round(clamp(v, prm.min, prm.max) * 100) / 100;
    }
    store.set({ p: next });
  };
  const setBand = (which, x) => {
    const { p, za, zb } = store.get();
    let z = clamp((x - p.mu) / p.sigma, -6, 6);
    z = Math.round(z * 100) / 100;
    if (which === 'a') store.set({ za: Math.min(z, zb) }); else store.set({ zb: Math.max(z, za) });
  };
  const dragWrap = fn => (pt, phase) => {
    if (phase === 'start') frozen = { L: curL, R: curR };
    if (pt) fn(pt);
    if (phase === 'end') { frozen = null; request(); }
  };

  let curL = null, curR = null, raf = 0;
  const request = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; draw(); }); };
  store.subscribe(() => { panel.update(store.get().p); request(); });

  function draw() {
    const { p, za, zb } = store.get();
    const { mu, sigma: s } = p;
    const a = mu + za * s, b = mu + zb * s;
    const xL = frozen ? frozen.L : [mu - 4 * s, mu + 4 * s];
    const xR = frozen ? frozen.R : lnWindow(mu, s);
    curL = xL; curR = xR;
    const nPdf = x => normalPdf((x - mu) / s) / s;
    const yPdf = y => lnPdf(y, mu, s);
    const prob = normalCdf(zb) - normalCdf(za);
    const topL = 1.18 * nPdf(mu);
    const modeY = Math.exp(mu - s * s);
    const topR = 1.18 * yPdf(modeY); // the mode is the highest point and always lies inside the window
    const inflY = nPdf(mu + s);

    L.render({
      x: xL, y: [0, topL],
      layers: [
        { id: 'fill', type: 'area', points: plot.sampleFn(nPdf, xL[0], xL[1], 300), cls: 'pdf-fill' },
        { id: 'band', type: 'area', points: plot.sampleFn(nPdf, Math.max(a, xL[0]), Math.min(b, xL[1]), 160), cls: 'area-shade' },
        { id: 'pdf', type: 'line', points: plot.sampleFn(nPdf, xL[0], xL[1], 300), cls: 'curve-main' },
      ],
      handles: [
        { id: 'mu', type: 'vline', x: mu, label: 'μ', ariaLabel: 'Mean μ of X. Drag, or use the arrow keys.', valueText: ui.fmt(mu, 3), valueNow: mu, valueMin: -1, valueMax: 2,
          onDrag: dragWrap(pt => setP({ mu: pt.x })), onKey: st => setP({ mu: store.get().p.mu + 0.05 * st }) },
        { id: 'sigma', type: 'hArrow', from: { x: mu, y: inflY }, to: { x: mu + s, y: inflY }, label: 'σ', ariaLabel: 'Standard deviation σ of X. Drag the tip, or use the arrow keys.', valueText: ui.fmt(s, 3), valueNow: s, valueMin: 0.1, valueMax: 1.5,
          onDrag: dragWrap(pt => setP({ sigma: pt.x - store.get().p.mu })), onKey: st => setP({ sigma: store.get().p.sigma + 0.05 * st }) },
        bandHandle('a', a, nPdf(a), x => x, 'a'),
        bandHandle('b', b, nPdf(b), x => x, 'b'),
      ],
    });

    const ea = Math.exp(a), eb = Math.exp(b), meanY = Math.exp(mu + s * s / 2), med = Math.exp(mu);
    const rLayers = [
      { id: 'fill', type: 'area', points: plot.sampleFn(yPdf, xR[0], xR[1], 400), cls: 'pdf-fill' },
      { id: 'band', type: 'area', points: plot.sampleFn(yPdf, Math.max(ea, xR[0]), Math.min(eb, xR[1]), 200), cls: 'area-shade' },
      { id: 'pdf', type: 'line', points: plot.sampleFn(yPdf, xR[0], xR[1], 400), cls: 'curve-main' },
      { id: 'med', type: 'segment', x1: med, y1: 0, x2: med, y2: Math.max(yPdf(med), 0.62 * topR), cls: 'mean-line' },
      { id: 'med-l', type: 'text', x: med, y: 0.62 * topR, text: 'median', dx: 4, anchor: 'start', cls: 'mean-label' },
    ];
    if (meanY < xR[1]) {
      rLayers.push({ id: 'mean', type: 'segment', x1: meanY, y1: 0, x2: meanY, y2: 0.42 * topR, cls: 'mean-line' });
      rLayers.push({ id: 'mean-l', type: 'text', x: meanY, y: 0.42 * topR, text: 'mean', dy: -6, dx: 3, anchor: 'start', cls: 'mean-label' });
    }
    R.render({
      x: xR, y: [0, topR], layers: rLayers,
      handles: [
        bandHandle('ea', ea, yPdf(ea), y => Math.log(Math.max(y, 1e-9)), 'eᵃ', 'a'),
        bandHandle('eb', eb, yPdf(eb), y => Math.log(Math.max(y, 1e-9)), 'eᵇ', 'b'),
      ],
    });

    ui.renderRich(readout,
      `$P(a < X \\le b)$ = $P(e^a < Y \\le e^b)$ = <b>${ui.fmt(prob, 4)}</b>, with $a$ = ${ui.fmt(a, 3)}, $b$ = ${ui.fmt(b, 3)}, $e^a$ = ${ui.fmt(ea, 3)}, $e^b$ = ${ui.fmt(eb, 3)}. `
      + `The right-hand band is stretched, more so at larger values, because $e^x$ grows faster as $x$ increases. `
      + `Median of $Y$: $e^{\\mu}$ = <b>${ui.fmt(med, 4)}</b>; mean of $Y$: $e^{\\mu + \\sigma^2/2}$ = <b>${ui.fmt(meanY, 4)}</b>.`);
  }

  // a band-end triangle; `toX` maps the pointer position on this plot to the x scale
  function bandHandle(id, x, lineTo, toX, label, which = id) {
    return {
      id, type: 'xPoint', x, lineTo, label, cls: 'threshold',
      ariaLabel: `Band end ${label}. Drag, or use the arrow keys.`, valueText: ui.fmt(x, 3), valueNow: x,
      onDrag: dragWrap(pt => setBand(which, toX(pt.x))),
      onKey: st => { const s = store.get(); const z = (which === 'a' ? s.za : s.zb) + 0.05 * st; setBand(which, s.p.mu + z * s.p.sigma); },
    };
  }
  draw();
}

// ------------------------------------------------------------------ view 2: simulate e^X
function simulateExp(box, { demos, ui }) {
  demos.simulationDemo(box, null, {
    intro: 'Each simulated value is $e^X$ for a fresh normal number $X$ with mean $\\mu$ and standard deviation $\\sigma$. The histogram of these values is compared with the $\\mathrm{LogNormal}(\\mu, \\sigma)$ density. Increase $\\sigma$ to see the right tail grow.',
    params: PARAMS,
    sample: (rng, { mu, sigma }) => Math.exp(rng.normal(mu, sigma)),
    sampleName: 'values of e^X',
    target: {
      name: ({ mu, sigma }) => `LogNormal(μ = ${ui.fmt(mu, 3)}, σ = ${ui.fmt(sigma, 3)}) density`,
      pdf: (y, { mu, sigma }) => lnPdf(y, mu, sigma),
      cdf: (y, { mu, sigma }) => lnCdf(y, mu, sigma),
    },
    range: ({ mu, sigma }) => [0, lnHi(mu, sigma)],
    xLabel: 'y = eˣ',
    readout: ({ mu, sigma }) => `The log-normal mean is $e^{\\mu + \\sigma^2/2}$ = <b>${ui.fmt(Math.exp(mu + sigma * sigma / 2), 4)}</b> and its standard deviation is <b>${ui.fmt(Math.exp(mu + sigma * sigma / 2) * Math.sqrt(Math.expm1(sigma * sigma)), 4)}</b>; compare them with the sample values.`,
  });
}

// ------------------------------------------------------------------ view 3: products of random factors
// Each factor is uniform on [1 - h, 1 + h]; the moments of its logarithm are computed exactly.
function logUniformMoments(h) {
  const lo = 1 - h, hi = 1 + h;
  const A1 = u => u * Math.log(u) - u;                                          // antiderivative of ln u
  const A2 = u => u * Math.log(u) ** 2 - 2 * u * Math.log(u) + 2 * u;           // antiderivative of (ln u)^2
  const m1 = (A1(hi) - A1(lo)) / (2 * h), m2 = (A2(hi) - A2(lo)) / (2 * h);
  return { m: m1, v: m2 - m1 * m1 };
}
function products(box, { demos, ui }) {
  const lnParams = ({ m, h }) => { const { m: mean, v } = logUniformMoments(h); return { mu: m * mean, s: Math.sqrt(m * v) }; };
  demos.simulationDemo(box, null, {
    intro: 'Each simulated value is a product $V_1 V_2 \\cdots V_m$ of $m$ independent random factors, each spread evenly between $1 - h$ and $1 + h$ (a random gain or loss of up to $100h$ percent). Its logarithm is a sum of $m$ independent terms, so for large $m$ the product is close to log-normal. The curve is the log-normal density whose $\\mu$ and $\\sigma$ match the mean and standard deviation of $\\ln(V_1 \\cdots V_m)$. Start with $m = 1$ (a flat histogram) and increase $m$.',
    params: [
      { key: 'm', sym: 'm', name: 'number of factors', meaning: 'How many independent random factors are multiplied together.', min: 1, max: 40, default: 1, integer: true },
      { key: 'h', sym: 'h', name: 'size of each factor’s swing', meaning: 'Each factor is uniform between $1 - h$ and $1 + h$.', min: 0.05, max: 0.6, default: 0.3, step: 0.05 },
    ],
    sample: (rng, { m, h }) => { let y = 1; for (let i = 0; i < m; i++) y *= 1 + h * (2 * rng.random() - 1); return y; },
    sampleName: 'products of m factors',
    target: {
      name: q => { const { mu, s } = lnParams(q); return `LogNormal(μ = ${ui.fmt(mu, 3)}, σ = ${ui.fmt(s, 3)}) density`; },
      pdf: (y, q) => { const { mu, s } = lnParams(q); return lnPdf(y, mu, s); },
      cdf: (y, q) => { const { mu, s } = lnParams(q); return lnCdf(y, mu, s); },
    },
    range: q => { const { mu, s } = lnParams(q); return [0, Math.max(Math.exp(mu + s * normalQuantile(0.995)), Math.pow(1 + q.h, Math.min(q.m, 2)))]; },
    xLabel: 'product V₁V₂⋯Vₘ',
    readout: q => { const { mu, s } = lnParams(q); return `Matching log-normal: $\\mu = m\\,\\mathrm{E}[\\ln V]$ = <b>${ui.fmt(mu, 3)}</b>, $\\sigma = \\sqrt{m\\,\\mathrm{Var}(\\ln V)}$ = <b>${ui.fmt(s, 3)}</b>.`; },
  });
}
