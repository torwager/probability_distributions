// Uniform -> Exponential: -ln(U)/lambda ~ Exp(lambda) (inverse-CDF sampling), and conversely e^{-lambda X} ~ U(0, 1).
// Demo: two views (a segmented switch). Each uses ctx.demos.simulationDemo; the forward view also has a plot of the
// transformation that shows how equally likely slices of U are stretched into the exponential shape.

import { getRelation } from '../catalog.js';

const REL = getRelation('uniform--exponential');

const expPdf = (x, lam) => (x < 0 ? 0 : lam * Math.exp(-lam * x));
const expCdf = (x, lam) => (x <= 0 ? 0 : -Math.expm1(-lam * x));
const LAMBDA = { key: 'lambda', sym: '\\lambda', name: 'rate', meaning: 'The rate of the exponential distribution; its mean is $1/\\lambda$.', min: 0.2, max: 5, default: 1, step: 0.05 };

export default {
  id: 'uniform--exponential',
  from: 'uniform',
  to: 'exponential',
  title: 'Minus the logarithm of a uniform random number, divided by the rate, is exponential',

  summary: 'If $U$ is a uniform random number between 0 and 1, then $-\\ln(U)/\\lambda$ has an exponential distribution with rate $\\lambda$. This is inverse-CDF sampling, the standard way to turn uniform random numbers into draws from another distribution.',

  plain: [
    'Take a random number $U$ that is equally likely to be anywhere between 0 and 1. Its logarithm is negative, so $-\\ln U$ is positive; dividing by a rate $\\lambda$ gives $-\\ln(U)/\\lambda$, which has an exponential distribution with rate $\\lambda$. Values of $U$ close to 1 give waits close to 0, and the rare values of $U$ close to 0 give long waits.',
    'This is an example of inverse-CDF sampling. The exponential CDF $F(x) = 1 - e^{-\\lambda x}$ can be solved for $x$, giving $F^{-1}(u) = -\\ln(1 - u)/\\lambda$. Feeding a uniform number into $F^{-1}$ produces an exponential number, and since $1 - U$ is uniform whenever $U$ is, $-\\ln(U)/\\lambda$ works just as well. The same idea turns uniform numbers into draws from any distribution whose CDF can be inverted.',
    'The converse also holds: if $X$ is exponential with rate $\\lambda$, then $e^{-\\lambda X}$, the probability of waiting longer than $X$, is uniform on $(0, 1)$. This is the probability integral transform.',
  ],

  statementTex: REL.statement,
  glossary: [
    { sym: 'U \\sim \\mathrm U(0,1)', meaning: '$U$ is a standard uniform random number: equally likely to be anywhere between 0 and 1.' },
    { sym: '\\ln', meaning: 'The natural logarithm (base $e \\approx 2.718$). For $0 < U < 1$ it is negative, so $-\\ln U$ is positive.' },
    { sym: '\\lambda', meaning: 'The rate of the exponential distribution (events per unit time); the mean is $1/\\lambda$.' },
    { sym: '-\\ln(U)/\\lambda', meaning: 'The transformed number: minus the log of $U$, divided by the rate.' },
    { sym: '\\mathrm{Exp}(\\lambda)', meaning: 'The exponential distribution with rate $\\lambda$, with density $\\lambda e^{-\\lambda x}$ for $x \\ge 0$.' },
    { sym: 'X \\sim \\mathrm{Exp}(\\lambda)', meaning: 'An exponential random variable, used in the converse statement.' },
    { sym: 'e^{-\\lambda X}', meaning: 'The exponential survival function evaluated at $X$: the probability that a fresh exponential wait would be longer than $X$.' },
    { sym: '\\Rightarrow', meaning: 'Implies: if the left side holds, the right side follows.' },
  ],

  why: [
    'Compute the probability that the transformed number is larger than $x$, for any $x \\ge 0$. Because $-\\ln(u)/\\lambda > x$ exactly when $u < e^{-\\lambda x}$,',
    { tex: 'P\\!\\left(-\\frac{\\ln U}{\\lambda} > x\\right) = P\\!\\left(U < e^{-\\lambda x}\\right) = e^{-\\lambda x},' },
    'since a standard uniform number is below any value $c$ in $[0, 1]$ with probability $c$. The right-hand side is the survival function of $\\mathrm{Exp}(\\lambda)$, so the two distributions are the same.',
    'The converse runs the same steps backward: for $0 < u < 1$, $P(e^{-\\lambda X} \\le u) = P(X \\ge -\\ln(u)/\\lambda) = e^{\\ln u} = u$, which is the CDF of $\\mathrm U(0, 1)$.',
    'The plot of the transformation below the simulation shows why the exponential shape appears. Ten equally likely slices of $U$ (each of width 0.1) are mapped to ten equally likely intervals of $X$. Near $U = 1$ the curve is flat, so the slices are squeezed into short intervals near 0 where the density must be high; near $U = 0$ the curve is steep, so the last slice is stretched over the whole long tail.',
    'In general, if $F$ is a continuous CDF with inverse $F^{-1}$, then $P(F^{-1}(U) \\le x) = P(U \\le F(x)) = F(x)$, so $F^{-1}(U)$ has CDF $F$. This is how most software generates exponential, Weibull, logistic, Gumbel, Pareto and Cauchy random numbers.',
  ],

  references: [
    { text: 'Wikipedia: Inverse transform sampling.', url: 'https://en.wikipedia.org/wiki/Inverse_transform_sampling' },
    { text: 'Wikipedia: Exponential distribution, random variate generation.', url: 'https://en.wikipedia.org/wiki/Exponential_distribution#Random_variate_generation' },
    { text: 'Casella, G., & Berger, R. L. (2002). <i>Statistical Inference</i> (2nd ed.), Theorem 2.1.10 (probability integral transformation). Duxbury.' },
    { text: 'Devroye, L. (1986). <i>Non-Uniform Random Variate Generation</i>, Chapter 2. Springer.', url: 'https://luc.devroye.org/rnbookindex.html' },
    { text: 'Leemis, L. M., & McQueston, J. T. (2008). Univariate distribution relationships. <i>The American Statistician</i>, 62(1), 45–53.', url: 'https://doi.org/10.1198/000313008X270448' },
  ],

  demo(container, ctx) {
    const { ui } = ctx;
    const { h } = ui;
    const fwdBox = h('div'), backBox = h('div', { hidden: true });
    const built = { fwd: false, back: false };
    const show = v => {
      fwdBox.hidden = v !== 'fwd'; backBox.hidden = v !== 'back';
      if (!built[v]) { built[v] = true; (v === 'fwd' ? forwardDemo : backwardDemo)(v === 'fwd' ? fwdBox : backBox, ctx); }
    };
    const seg = ui.segmented([
      { value: 'fwd', label: 'Uniform → exponential: −ln(U)/λ' },
      { value: 'back', label: 'Exponential → uniform: e^(−λX)' },
    ], 'fwd', show, 'Which direction of the relationship to show');
    container.append(h('div', { style: 'margin-bottom:.6rem' }, seg.el), fwdBox, backBox);
    show('fwd');
  },
};

function forwardDemo(box, ctx) {
  const { demos, ui } = ctx;
  const sim = demos.simulationDemo(box, null, {
    intro: 'Each simulated value is $-\\ln(U)/\\lambda$ for a fresh uniform random number $U$. The histogram of many such values is compared with the $\\mathrm{Exp}(\\lambda)$ density. Change $\\lambda$ or draw new samples; the plot at the bottom shows the transformation itself.',
    params: [LAMBDA],
    sample: (rng, { lambda }) => { let u = rng.random(); while (u === 0) u = rng.random(); return -Math.log(u) / lambda; },
    sampleName: 'values of −ln(U)/λ',
    target: {
      name: ({ lambda }) => `Exponential(λ = ${ui.fmt(lambda, 3)}) density`,
      pdf: (x, { lambda }) => expPdf(x, lambda),
      cdf: (x, { lambda }) => expCdf(x, lambda),
    },
    range: ({ lambda }) => [0, -Math.log(0.002) / lambda],
    xLabel: 'x = −ln(U)/λ',
    readout: ({ lambda }) => `The exponential mean $1/\\lambda$ = <b>${ui.fmt(1 / lambda, 4)}</b> and its standard deviation is the same.`,
  });
  mappingFigure(box, ctx, sim.store, {
    caption: 'The transformation $x = -\\ln(u)/\\lambda$. The nine dots on the vertical axis are the images of $u = 0.1, 0.2, \\dots, 0.9$. They cut the exponential into ten equally likely intervals of very different lengths. Drag the amber marker along the $u$ axis.',
    xLabel: 'u (uniform number)', yLabel: 'x = −ln(u)/λ',
    xRange: () => [0, 1], yRange: ({ lambda }) => [0, -Math.log(0.01) / lambda],
    g: (u, { lambda }) => -Math.log(u) / lambda,
    srcQ: q => q,
    u0: 0.3, uMin: 0.001, uMax: 0.999, handleLabel: 'u',
    readout: (p, u, x) => `For $u$ = <b>${ui.fmt(u, 3)}</b> the transformed value is $x = -\\ln(u)/\\lambda$ = <b>${ui.fmt(x, 4)}</b>. A fraction $u$ of all uniform numbers is below this $u$, and exactly the same fraction of exponential values is above $x$: $e^{-\\lambda x}$ = ${ui.fmt(Math.exp(-p.lambda * x), 3)}.`,
  });
}

function backwardDemo(box, { demos, ui }) {
  demos.simulationDemo(box, null, {
    intro: 'Each simulated value is $e^{-\\lambda X}$ for a fresh exponential random number $X$ with rate $\\lambda$. Whatever the rate, the histogram is flat: the transformed values are uniform on $(0, 1)$.',
    params: [LAMBDA],
    sample: (rng, { lambda }) => Math.exp(-lambda * rng.exponential(lambda)),
    sampleName: 'values of e^(−λX)',
    target: { name: () => 'Uniform(0, 1) density', pdf: x => (x >= 0 && x <= 1 ? 1 : 0), cdf: x => Math.min(1, Math.max(0, x)) },
    range: () => [0, 1],
    xLabel: 'u = e^(−λX)',
    readout: () => 'A uniform variable on $(0, 1)$ has mean 0.5 and standard deviation $1/\\sqrt{12} \\approx 0.2887$.',
  });
}

/**
 * A plot of a monotone transformation y = g(u) of a source variable, with the images of the source deciles
 * marked on the vertical axis and a draggable marker on the horizontal axis. Redraws when `store` changes.
 */
function mappingFigure(container, { plot, ui, math }, store, o) {
  const { h } = ui;
  const box = h('div');
  const readout = h('p', { class: 'demo-readout', 'aria-live': 'polite' });
  container.append(h('figure', { class: 'plot-fig', style: 'margin-top:1.4rem' }, ui.rich('figcaption', o.caption), box), readout);
  const P = new plot.Plot(box, { xLabel: o.xLabel, yLabel: o.yLabel, height: w => math.clamp(w * 0.4, 230, 330) });
  let u0 = o.u0;
  const draw = () => {
    const p = store.get().p;
    const [x0, x1] = o.xRange(p), [y0, y1] = o.yRange(p);
    const layers = [];
    for (let i = 1; i <= 9; i++) {
      const u = o.srcQ(i / 10, p), y = o.g(u, p);
      if (!(y >= y0 && y <= y1)) continue;
      layers.push({ id: 'v' + i, type: 'segment', x1: u, y1: y0, x2: u, y2: y, cls: 'ref-line' });
      layers.push({ id: 'h' + i, type: 'segment', x1: x0, y1: y, x2: u, y2: y, cls: 'ref-line' });
      layers.push({ id: 'd' + i, type: 'dot', x: x0, y, r: 3.5, cls: 'curve-main' });
      layers.push({ id: 'e' + i, type: 'dot', x: u, y: y0, r: 2.5, cls: 'curve-main' });
    }
    layers.push({ id: 'g', type: 'line', points: plot.sampleFn(u => o.g(u, p), x0, x1, 500), cls: 'curve-main' });
    const yv = o.g(u0, p);
    layers.push({ id: 'now-h', type: 'segment', x1: x0, y1: yv, x2: u0, y2: yv, cls: 'guide' });
    layers.push({ id: 'now-d', type: 'dot', x: u0, y: yv, r: 5, cls: 'marker' });
    P.render({
      x: [x0, x1], y: [y0, y1], layers,
      handles: [{
        id: 'u0', type: 'xPoint', x: u0, lineTo: yv, label: o.handleLabel || 'u',
        ariaLabel: `Value of ${o.handleLabel || 'u'}. Drag along the axis, or use the arrow keys.`,
        valueText: ui.fmt(u0, 3), valueNow: u0, valueMin: o.uMin, valueMax: o.uMax,
        onDrag: pt => { if (pt) { u0 = math.clamp(pt.x, o.uMin, o.uMax); draw(); } },
        onKey: steps => { u0 = math.clamp(u0 + steps * (o.keyStep || 0.01), o.uMin, o.uMax); draw(); },
      }],
    });
    ui.renderRich(readout, o.readout(p, u0, yv));
  };
  store.subscribe(draw);
  draw();
}
