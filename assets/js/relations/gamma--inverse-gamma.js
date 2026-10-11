// Gamma <-> Inverse-gamma: X ~ Gamma(alpha, rate beta) if and only if 1/X ~ InvGamma(alpha, scale beta).
// Demo: three views switched with a segmented control.
//  1. "Two scales": the gamma density of X (for example a precision) and the inverse-gamma density of 1/X
//     (a variance) side by side, with a band a < X <= b and the matching band 1/b <= 1/X < 1/a. The band ends
//     and the rate/scale beta can be dragged on either plot (both directions of the relationship).
//  2. simulationDemo: reciprocals of gamma draws against the inverse-gamma density.
//  3. simulationDemo: reciprocals of inverse-gamma draws (made by inverting the inverse-gamma CDF) against the
//     gamma density.
// Self-contained: densities are computed with ctx.math, not with the distribution modules.

import { getRelation } from '../catalog.js';
import { lgamma, gammaP, gammaQ, gammaPinv, clamp } from '../core/math.js';

const REL = getRelation('gamma--inverse-gamma');

const gPdf = (x, a, b) => (x < 0 ? 0 : x === 0 ? (a < 1 ? Infinity : a === 1 ? b : 0) : Math.exp(a * Math.log(b) + (a - 1) * Math.log(x) - b * x - lgamma(a)));
const gCdf = (x, a, b) => (x <= 0 ? 0 : gammaP(a, b * x));
const gQ = (u, a, b) => gammaPinv(a, u) / b;
const igPdf = (y, a, b) => (y <= 0 ? 0 : Math.exp(a * Math.log(b) - (a + 1) * Math.log(y) - b / y - lgamma(a)));
const igCdf = (y, a, b) => (y <= 0 ? 0 : gammaQ(a, b / y));
const igQ = (u, a, b) => b / gammaPinv(a, 1 - u);

function gWindow(a, b) {
  const hi = gQ(0.9995, a, b), lo = gQ(0.0001, a, b);
  return lo > 0.3 * hi ? [lo - 0.08 * (hi - lo), hi] : [-0.03 * hi, hi];
}
function igWindow(a, b) {
  // the inverse-gamma has a power-law right tail; stop at the 98th percentile or 20 modes, whichever is smaller
  const mode = b / (a + 1);
  const hi = Math.min(igQ(0.98, a, b), 20 * mode);
  const lo = igQ(0.0005, a, b);
  return lo > 0.3 * hi ? [lo - 0.08 * (hi - lo), hi] : [-0.03 * hi, hi];
}

const PARAMS = [
  { key: 'alpha', sym: '\\alpha', name: 'shape (both sides)', meaning: 'The shape $\\alpha$, the same for the gamma and the inverse-gamma distribution.', min: 0.6, max: 15, default: 3, step: 0.1 },
  { key: 'beta', sym: '\\beta', name: 'rate / scale', meaning: 'The rate $\\beta$ of the gamma distribution of $X$, which becomes the scale $\\beta$ of the inverse-gamma distribution of $1/X$.', min: 0.2, max: 10, default: 2, step: 0.1 },
];

export default {
  id: 'gamma--inverse-gamma',
  from: 'gamma',
  to: 'inverse-gamma',
  title: 'The reciprocal of a gamma variable has an inverse-gamma distribution, and the reciprocal of an inverse-gamma variable is gamma',

  summary: 'The reciprocal of a gamma variable with shape $\\alpha$ and rate $\\beta$ has an inverse-gamma distribution with shape $\\alpha$ and scale $\\beta$, and the reverse holds too. So a gamma prior on a precision (one over a variance) is an inverse-gamma prior on the variance.',

  plain: [
    'If $X$ has a gamma distribution with shape $\\alpha$ and rate $\\beta$, then its reciprocal $1/X$ has an inverse-gamma distribution with the same shape $\\alpha$ and scale $\\beta$. Going back, the reciprocal of an inverse-gamma variable is gamma. Large values of $X$ become small values of $1/X$ and the other way around, so the thin exponential right tail of the gamma becomes the left side of the inverse-gamma, and the gamma’s behavior near 0 becomes a heavy power-law right tail.',
    'The relationship matters most in Bayesian statistics. The precision of a normal distribution is one over its variance, $\\tau = 1/\\sigma^2$. Putting a $\\mathrm{Gamma}(\\alpha, \\beta)$ prior on the precision is exactly the same as putting an $\\mathrm{InvGamma}(\\alpha, \\beta)$ prior on the variance; the two are one prior written on two scales, and the conjugate updates match.',
    'Note the parameter names: $\\beta$ is a <b>rate</b> for the gamma (an inverse scale, mean $\\alpha/\\beta$) but a <b>scale</b> for the inverse-gamma (in the same units as $1/X$). The value of $\\beta$ is the same on both sides.',
  ],

  statementTex: REL.statement,
  glossary: [
    { sym: 'X \\sim \\mathrm{Gamma}(\\alpha, \\text{rate } \\beta)', meaning: '$X$ has a gamma distribution with shape $\\alpha$ and rate $\\beta$: density proportional to $x^{\\alpha-1}e^{-\\beta x}$, mean $\\alpha/\\beta$.' },
    { sym: '\\alpha', meaning: 'The shape, a positive number, the same on both sides of the statement.' },
    { sym: '\\beta', meaning: 'A positive number that is the rate of the gamma distribution and the scale of the inverse-gamma distribution.' },
    { sym: '\\text{rate},\\ \\text{scale}', meaning: 'A rate is an inverse scale: multiplying a gamma variable by $k$ divides its rate by $k$, while multiplying an inverse-gamma variable by $k$ multiplies its scale by $k$.' },
    { sym: '1/X', meaning: 'The reciprocal of $X$. It is positive, because $X$ is.' },
    { sym: '\\mathrm{InvGamma}(\\alpha, \\text{scale } \\beta)', meaning: 'The inverse-gamma distribution with shape $\\alpha$ and scale $\\beta$: density proportional to $y^{-\\alpha-1}e^{-\\beta/y}$.' },
    { sym: '\\iff', meaning: 'If and only if: each statement implies the other.' },
  ],

  why: [
    'The map $x \\mapsto 1/x$ is decreasing on the positive numbers, so $1/X \\le y$ exactly when $X \\ge 1/y$. For $y > 0$,',
    { tex: 'P(1/X \\le y) = P(X \\ge 1/y) = Q\\!\\left(\\alpha, \\frac{\\beta}{y}\\right),' },
    'where $Q(\\alpha, \\cdot)$ is the regularized upper incomplete gamma function, the upper tail of the gamma distribution. This is the inverse-gamma CDF. Differentiating with respect to $y$, or using the change-of-variables formula with $x = 1/y$ and $|dx/dy| = 1/y^2$, gives the density',
    { tex: 'f_{1/X}(y) = f_X(1/y)\\,\\frac{1}{y^2} = \\frac{\\beta^{\\alpha}}{\\Gamma(\\alpha)}\\, y^{-\\alpha-1} e^{-\\beta/y}, \\qquad y > 0,' },
    'which is the $\\mathrm{InvGamma}(\\alpha, \\beta)$ density. Applying the same steps to $1/Y$ for an inverse-gamma $Y$ proves the converse.',
    'Probabilities and quantiles carry over (with the order reversed): the median of $1/X$ is one over the median of $X$, and the band $a < X \\le b$ has the same probability as $1/b \\le 1/X < 1/a$. Means do not: $\\mathrm{E}[1/X] = \\beta/(\\alpha - 1)$ for $\\alpha > 1$, which is larger than $1/\\mathrm{E}[X] = \\beta/\\alpha$ (Jensen’s inequality), and it is infinite for $\\alpha \\le 1$. Modes do not carry over either, because the factor $1/y^2$ changes where the density peaks: the gamma mode is $(\\alpha-1)/\\beta$, the inverse-gamma mode is $\\beta/(\\alpha+1)$.',
    'In a normal model with known mean, the likelihood of the precision $\\tau$ from $n$ observations is proportional to $\\tau^{n/2} e^{-\\tau S/2}$, where $S$ is the sum of squared deviations. Multiplying by a $\\mathrm{Gamma}(\\alpha, \\beta)$ prior gives a $\\mathrm{Gamma}(\\alpha + n/2,\\ \\beta + S/2)$ posterior for $\\tau$; by this relationship the variance $\\sigma^2 = 1/\\tau$ then has an $\\mathrm{InvGamma}(\\alpha + n/2,\\ \\beta + S/2)$ posterior, the update shown on the inverse-gamma page.',
  ],

  references: [
    { text: 'Wikipedia: Inverse-gamma distribution.', url: 'https://en.wikipedia.org/wiki/Inverse-gamma_distribution' },
    { text: 'Gelman, A., Carlin, J. B., Stern, H. S., Dunson, D. B., Vehtari, A., & Rubin, D. B. (2013). <i>Bayesian Data Analysis</i> (3rd ed.), Sections 2.6–2.7 and Appendix A. CRC Press.', url: 'http://www.stat.columbia.edu/~gelman/book/' },
    { text: 'Casella, G., & Berger, R. L. (2002). <i>Statistical Inference</i> (2nd ed.), Section 2.1 (transformations). Duxbury.' },
    { text: 'Leemis, L. M., & McQueston, J. T. (2008). Univariate distribution relationships. <i>The American Statistician</i>, 62(1), 45–53.', url: 'https://doi.org/10.1198/000313008X270448' },
    { text: 'Gelman, A. (2006). Prior distributions for variance parameters in hierarchical models. <i>Bayesian Analysis</i>, 1(3), 515–534.', url: 'https://doi.org/10.1214/06-BA117A' },
  ],

  demo(container, ctx) {
    const { ui } = ctx;
    const { h } = ui;
    const views = { scales: twoScales, fwd: forwardSim, back: backwardSim };
    const boxes = {}, built = {};
    for (const k of Object.keys(views)) boxes[k] = h('div', { hidden: true });
    const show = v => {
      for (const k of Object.keys(views)) boxes[k].hidden = k !== v;
      if (!built[v]) { built[v] = true; views[v](boxes[v], ctx); }
    };
    const seg = ui.segmented([
      { value: 'scales', label: 'Two scales' },
      { value: 'fwd', label: 'Simulate 1/X' },
      { value: 'back', label: 'Simulate 1/Y' },
    ], 'scales', show, 'Which demonstration to show');
    container.append(h('div', { style: 'margin-bottom:.8rem' }, seg.el), ...Object.values(boxes));
    show('scales');
  },
};

// ------------------------------------------------------------------ view 1: two linked scales
function twoScales(box, { plot, ui }) {
  const { h } = ui;
  const defaults = () => ({ alpha: 3, beta: 2 });
  // the band is stored as two CDF levels of X, so it keeps its probability when the parameters change
  const store = ui.createStore({ p: defaults(), ua: 0.25, ub: 0.75 });
  const leftBox = h('div'), rightBox = h('div');
  const readout = h('p', { class: 'demo-readout', 'aria-live': 'polite' });
  const controls = h('div', { class: 'demo-controls' });
  box.append(
    h('div', { class: 'demo-grid' },
      h('figure', { class: 'plot-fig' }, ui.rich('figcaption', 'Gamma density of $X$'), leftBox),
      h('figure', { class: 'plot-fig' }, ui.rich('figcaption', 'Inverse-gamma density of $1/X$'), rightBox)),
    readout, controls,
    ui.rich('p', 'The left plot shows the gamma density of $X$ (shape $\\alpha$, rate $\\beta$), for example the precision $\\tau$ of a normal model; the right plot shows the inverse-gamma density of $1/X$ (shape $\\alpha$, scale $\\beta$), for example the variance $\\sigma^2 = 1/\\tau$. The band $a < X \\le b$ and the band $1/b \\le 1/X < 1/a$ are the same event, so they have the same area; note that the left end of one is the right end of the other. Drag the band ends on either plot. The dashed line on the left (at the gamma mean $\\alpha/\\beta$) and the one on the right (at the inverse-gamma mode $\\beta/(\\alpha+1)$) both change $\\beta$ with $\\alpha$ fixed; set $\\alpha$ in its box.', { class: 'small muted demo-intro' }));

  const panel = ui.paramPanel(controls, PARAMS, {
    get: () => store.get().p,
    apply: (k, v) => store.set({ p: { ...store.get().p, [k]: v } }),
    onReset: () => store.set({ p: defaults(), ua: 0.25, ub: 0.75 }),
  });
  const L = new plot.Plot(leftBox, { xLabel: 'x (e.g. precision τ)', yLabel: 'density', height: (w, H) => plot.fitHeight(w, H) });
  const R = new plot.Plot(rightBox, { xLabel: 'y = 1/x (e.g. variance σ²)', yLabel: 'density', height: (w, H) => plot.fitHeight(w, H) });

  let frozen = null, curL = null, curR = null, raf = 0;
  const request = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; draw(); }); };
  store.subscribe(() => { panel.update(store.get().p); request(); });
  const dragWrap = fn => (pt, phase) => {
    if (phase === 'start') frozen = { L: curL, R: curR };
    if (pt) fn(pt);
    if (phase === 'end') { frozen = null; request(); }
  };
  const setBeta = v => { const prm = PARAMS[1]; store.set({ p: { ...store.get().p, beta: Math.round(clamp(v, prm.min, prm.max) * 100) / 100 } }); };
  // set a band end from a value x of X (u = F_X(x)), keeping a below b
  const setBand = (which, x) => {
    const { p, ua, ub } = store.get();
    let u = clamp(gCdf(Math.max(x, 0), p.alpha, p.beta), 0.0005, 0.9995);
    u = Math.round(u * 1000) / 1000;
    if (which === 'a') store.set({ ua: Math.min(u, ub - 0.001) }); else store.set({ ub: Math.max(u, ua + 0.001) });
  };

  function topOf(f, xd, finitePeak) {
    if (finitePeak !== undefined) return 1.18 * finitePeak;
    // a density that is infinite at 0 (shape below 1): ignore the first 6% of the window
    const pts = plot.sampleFn(f, xd[0] + 0.06 * (xd[1] - xd[0]), xd[1], 300).map(q => q[1]).filter(Number.isFinite);
    return 1.25 * Math.max(...pts);
  }

  function draw() {
    const { p, ua, ub } = store.get();
    const { alpha: A, beta: B } = p;
    const xL = frozen ? frozen.L : gWindow(A, B);
    const xR = frozen ? frozen.R : igWindow(A, B);
    curL = xL; curR = xR;
    const fL = x => gPdf(x, A, B), fR = y => igPdf(y, A, B);
    const a = gQ(ua, A, B), b = gQ(ub, A, B);
    const gMean = A / B, igMode = B / (A + 1), gMode = A >= 1 ? (A - 1) / B : 0;
    const topL = topOf(fL, xL, A >= 1 ? fL(gMode) : undefined);
    const topR = topOf(fR, xR, fR(igMode));

    L.render({
      x: xL, y: [0, topL],
      layers: [
        { id: 'fill', type: 'area', points: plot.sampleFn(fL, xL[0], xL[1], 400), cls: 'pdf-fill' },
        { id: 'band', type: 'area', points: plot.sampleFn(fL, Math.max(a, xL[0]), Math.min(b, xL[1]), 200), cls: 'area-shade' },
        { id: 'pdf', type: 'line', points: plot.sampleFn(fL, xL[0], xL[1], 400), cls: 'curve-main' },
      ],
      handles: [
        { id: 'gmean', type: 'vline', x: gMean, label: 'mean', ariaLabel: 'Gamma mean α/β. Drag to change β with α fixed, or use the arrow keys.', valueText: ui.fmt(gMean, 3), valueNow: gMean,
          onDrag: dragWrap(pt => setBeta(A / Math.max(pt.x, 1e-3))), onKey: st => setBeta(store.get().p.beta * Math.pow(1.03, -st)) },
        bandHandle('a', a, fL(a), x => x, 'a'),
        bandHandle('b', b, fL(b), x => x, 'b'),
      ],
    });

    const ra = 1 / b, rb = 1 / a; // the right band runs from 1/b to 1/a
    R.render({
      x: xR, y: [0, topR],
      layers: [
        { id: 'fill', type: 'area', points: plot.sampleFn(fR, xR[0], xR[1], 400), cls: 'pdf-fill' },
        { id: 'band', type: 'area', points: plot.sampleFn(fR, Math.max(ra, xR[0]), Math.min(rb, xR[1]), 200), cls: 'area-shade' },
        { id: 'pdf', type: 'line', points: plot.sampleFn(fR, xR[0], xR[1], 400), cls: 'curve-main' },
      ],
      handles: [
        { id: 'igmode', type: 'vline', x: igMode, label: 'mode', ariaLabel: 'Inverse-gamma mode β/(α + 1). Drag to change β with α fixed, or use the arrow keys.', valueText: ui.fmt(igMode, 3), valueNow: igMode,
          onDrag: dragWrap(pt => setBeta(Math.max(pt.x, 1e-3) * (A + 1))), onKey: st => setBeta(store.get().p.beta * Math.pow(1.03, st)) },
        bandHandle('rb', ra, fR(ra), y => 1 / Math.max(y, 1e-9), '1/b', 'b'),
        bandHandle('ra', rb, fR(rb), y => 1 / Math.max(y, 1e-9), '1/a', 'a'),
      ],
    });

    const gMed = gQ(0.5, A, B);
    ui.renderRich(readout,
      `$P(a < X \\le b)$ = $P(1/b \\le 1/X < 1/a)$ = <b>${ui.fmt(ub - ua, 3)}</b>, with $a$ = ${ui.fmt(a, 3)}, $b$ = ${ui.fmt(b, 3)}, $1/b$ = ${ui.fmt(1 / b, 3)}, $1/a$ = ${ui.fmt(1 / a, 3)}. `
      + `Medians correspond: median of $X$ = ${ui.fmt(gMed, 4)}, median of $1/X$ = ${ui.fmt(1 / gMed, 4)}. `
      + `Means do not: $1/\\mathrm{E}[X] = \\beta/\\alpha$ = <b>${ui.fmt(B / A, 4)}</b>, but $\\mathrm{E}[1/X] = \\beta/(\\alpha-1)$ = <b>${A > 1 ? ui.fmt(B / (A - 1), 4) : '∞'}</b>${A > 1 ? '' : ' (infinite because $\\alpha \\le 1$)'}.`);
  }

  // a band-end triangle; `toX` maps the pointer position on this plot to a value of X
  function bandHandle(id, x, lineTo, toX, label, which) {
    return {
      id, type: 'xPoint', x, lineTo, label, cls: 'threshold',
      ariaLabel: `Band end ${label}. Drag, or use the arrow keys.`, valueText: ui.fmt(x, 3), valueNow: x,
      onDrag: dragWrap(pt => setBand(which, toX(pt.x))),
      onKey: st => {
        const s = store.get();
        // the right plot runs in the opposite direction, so the arrow keys move its band ends the other way
        const dir = id.startsWith('r') ? -1 : 1;
        const u = clamp((which === 'a' ? s.ua : s.ub) + 0.01 * st * dir, 0.0005, 0.9995);
        setBand(which, gQ(u, s.p.alpha, s.p.beta));
      },
    };
  }
  draw();
}

// ------------------------------------------------------------------ views 2 and 3: simulations
function forwardSim(box, { demos, ui }) {
  demos.simulationDemo(box, null, {
    intro: 'Each simulated value is $1/X$ for a fresh gamma number $X$ with shape $\\alpha$ and rate $\\beta$. The histogram of the reciprocals is compared with the $\\mathrm{InvGamma}(\\alpha, \\beta)$ density. With a small shape, a few draws of $X$ near 0 produce very large reciprocals: the heavy right tail of the inverse-gamma.',
    params: PARAMS,
    sample: (rng, { alpha, beta }) => 1 / rng.gamma(alpha, beta),
    sampleName: 'values of 1/X',
    target: {
      name: ({ alpha, beta }) => `InvGamma(α = ${ui.fmt(alpha, 3)}, β = ${ui.fmt(beta, 3)}) density`,
      pdf: (y, { alpha, beta }) => igPdf(y, alpha, beta),
      cdf: (y, { alpha, beta }) => igCdf(y, alpha, beta),
    },
    range: ({ alpha, beta }) => [0, igWindow(alpha, beta)[1]],
    xLabel: 'y = 1/x',
    readout: ({ alpha, beta }) => `The inverse-gamma mean is $\\beta/(\\alpha - 1)$ = <b>${alpha > 1 ? ui.fmt(beta / (alpha - 1), 4) : '∞'}</b>${alpha > 1 ? '' : ' (infinite for $\\alpha \\le 1$, so the sample mean is unstable)'}; its median is <b>${ui.fmt(igQ(0.5, alpha, beta), 4)}</b>.`,
  });
}

function backwardSim(box, { demos, ui }) {
  demos.simulationDemo(box, null, {
    intro: 'Each simulated value is $1/Y$ for a fresh inverse-gamma number $Y$ with shape $\\alpha$ and scale $\\beta$. The inverse-gamma numbers are generated by inverting the inverse-gamma CDF at a uniform random number. The histogram of the reciprocals is compared with the $\\mathrm{Gamma}(\\alpha, \\text{rate } \\beta)$ density.',
    params: PARAMS,
    sample: (rng, { alpha, beta }) => 1 / igQ(rng.random(), alpha, beta),
    sampleName: 'values of 1/Y',
    target: {
      name: ({ alpha, beta }) => `Gamma(α = ${ui.fmt(alpha, 3)}, rate β = ${ui.fmt(beta, 3)}) density`,
      pdf: (x, { alpha, beta }) => gPdf(x, alpha, beta),
      cdf: (x, { alpha, beta }) => gCdf(x, alpha, beta),
    },
    range: ({ alpha, beta }) => [0, gQ(0.9995, alpha, beta)],
    xLabel: 'x = 1/y',
    readout: ({ alpha, beta }) => `The gamma mean is $\\alpha/\\beta$ = <b>${ui.fmt(alpha / beta, 4)}</b> and its standard deviation is $\\sqrt\\alpha/\\beta$ = <b>${ui.fmt(Math.sqrt(alpha) / beta, 4)}</b>.`,
  });
}
