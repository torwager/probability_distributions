// Uniform -> Logistic: mu + s ln(U/(1-U)) ~ Logistic(mu, s) (the logit of a uniform number), and conversely the
// logistic CDF (the sigmoid) of a logistic variable is uniform.
// Demo: two views (a segmented switch), each built on ctx.demos.simulationDemo; the forward view adds a plot of
// the logit transformation with the images of the uniform deciles.

import { getRelation } from '../catalog.js';

const REL = getRelation('uniform--logistic');

// density written as 1 / (4 s cosh^2(z/2)), which is stable for large |z|
const logisticPdf = (x, mu, s) => { const c = Math.cosh((x - mu) / (2 * s)); return 1 / (4 * s * c * c); };
const logisticCdf = (x, mu, s) => 1 / (1 + Math.exp(-(x - mu) / s));
const PARAMS = [
  { key: 'mu', sym: '\\mu', name: 'location', meaning: 'The center of the logistic distribution (its mean, median and mode).', min: -5, max: 5, default: 0, step: 0.1 },
  { key: 's', sym: 's', name: 'scale', meaning: 'The scale of the logistic distribution; its standard deviation is $s\\pi/\\sqrt3 \\approx 1.814\\,s$.', min: 0.2, max: 3, default: 1, step: 0.05 },
];

export default {
  id: 'uniform--logistic',
  from: 'uniform',
  to: 'logistic',
  title: 'The log-odds of a uniform random number has a logistic distribution',

  summary: 'The log-odds $\\ln(U/(1 - U))$ of a uniform random number $U$ between 0 and 1 has the standard logistic distribution, because the log-odds function is the inverse of the logistic CDF. The same pair of functions forms the link in logistic regression.',

  plain: [
    'Take a uniform random number $U$ between 0 and 1 and treat it as a probability. Its odds are $U/(1 - U)$ and its log-odds, or logit, is $\\ln\\frac{U}{1-U}$. The logit of a uniform number has the standard logistic distribution: a symmetric bell-shaped curve centered at 0, a little heavier in the tails than the normal. Shifting by $\\mu$ and stretching by $s$ gives $\\mathrm{Logistic}(\\mu, s)$.',
    'The reason is that the logit is the inverse of the logistic CDF, the S-shaped sigmoid $1/(1 + e^{-z})$. Plugging a uniform number into the inverse of a CDF always produces a draw from that distribution (inverse-CDF sampling). In the other direction, applying the logistic CDF to a logistic variable gives back a uniform number.',
    'The same pair of functions is at the heart of logistic regression: the model says that the log-odds of a success is a linear function of the predictors, and the sigmoid turns that linear predictor back into a probability. Equivalently, a success happens when the linear predictor plus a standard logistic error is positive.',
  ],

  statementTex: REL.statement,
  glossary: [
    { sym: 'U \\sim \\mathrm U(0,1)', meaning: '$U$ is a standard uniform random number: equally likely to be anywhere between 0 and 1.' },
    { sym: '\\ln\\frac{U}{1-U}', meaning: 'The logit, or log-odds, of $U$: the natural logarithm of the odds $U/(1 - U)$. It is negative for $U < 1/2$ and positive for $U > 1/2$.' },
    { sym: '\\mu', meaning: 'The location of the logistic distribution: its center, which is also its mean, median and mode.' },
    { sym: 's', meaning: 'The scale of the logistic distribution. Its standard deviation is $s\\pi/\\sqrt3$.' },
    { sym: '\\mathrm{Logistic}(\\mu, s)', meaning: 'The logistic distribution with location $\\mu$ and scale $s$, whose CDF is $1/(1 + e^{-(x-\\mu)/s})$.' },
    { sym: 'X', meaning: 'A logistic random variable, used in the converse statement.' },
    { sym: '\\frac{1}{1+e^{-(X-\\mu)/s}}', meaning: 'The logistic CDF (the sigmoid) evaluated at $X$: the fraction of the logistic distribution below $X$. Here $e \\approx 2.718$.' },
    { sym: '\\Rightarrow', meaning: 'Implies: if the left side holds, the right side follows.' },
  ],

  why: [
    'The logit $u \\mapsto \\ln\\frac{u}{1-u}$ is increasing, so for any real $z$ the transformed number is at most $z$ exactly when $U$ is at most the value that the logit sends to $z$. Solving $\\ln\\frac{u}{1-u} = z$ gives $u = \\frac{1}{1 + e^{-z}}$, so',
    { tex: 'P\\!\\left(\\ln\\frac{U}{1-U} \\le z\\right) = P\\!\\left(U \\le \\frac{1}{1 + e^{-z}}\\right) = \\frac{1}{1 + e^{-z}},' },
    'which is the CDF of the standard logistic distribution. Applying $x = \\mu + s z$ shifts and rescales it to $\\mathrm{Logistic}(\\mu, s)$. The converse is the same calculation read backward: $P(\\sigma(Z) \\le u) = P(Z \\le \\operatorname{logit} u) = u$, where $\\sigma(z) = 1/(1 + e^{-z})$ is the sigmoid.',
    'The plot of the transformation shows the shape of the result. The logit is nearly straight around $u = 1/2$, so the middle deciles of $U$ map to evenly spaced values near $\\mu$ (where the density is highest), and it becomes very steep near 0 and 1, which stretches the outer deciles into long tails on both sides.',
    '<b>Connection to logistic regression.</b> Suppose a latent quantity $Y^* = \\eta + \\varepsilon$ with $\\varepsilon$ standard logistic and a linear predictor $\\eta = \\beta_0 + \\beta_1 x_1 + \\dots$, and a success is recorded when $Y^* > 0$. Then $P(\\text{success}) = P(\\varepsilon > -\\eta) = \\sigma(\\eta)$, so $\\operatorname{logit} P(\\text{success}) = \\eta$. Replacing the logistic error with a standard normal error gives probit regression instead.',
  ],

  references: [
    { text: 'Wikipedia: Logistic distribution.', url: 'https://en.wikipedia.org/wiki/Logistic_distribution' },
    { text: 'Wikipedia: Logit.', url: 'https://en.wikipedia.org/wiki/Logit' },
    { text: 'Johnson, N. L., Kotz, S., & Balakrishnan, N. (1995). <i>Continuous Univariate Distributions</i>, Vol. 2 (2nd ed.), Chapter 23. Wiley.' },
    { text: 'Agresti, A. (2013). <i>Categorical Data Analysis</i> (3rd ed.), Chapter 7 (probit models and the latent-variable form of binary regression). Wiley.' },
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
      { value: 'fwd', label: 'Uniform → logistic: μ + s·logit(U)' },
      { value: 'back', label: 'Logistic → uniform: sigmoid' },
    ], 'fwd', show, 'Which direction of the relationship to show');
    container.append(h('div', { style: 'margin-bottom:.6rem' }, seg.el), fwdBox, backBox);
    show('fwd');
  },
};

function forwardDemo(box, ctx) {
  const { demos, ui } = ctx;
  const sim = demos.simulationDemo(box, null, {
    intro: 'Each simulated value is $\\mu + s\\ln\\frac{U}{1-U}$ for a fresh uniform random number $U$. The histogram of many such values is compared with the $\\mathrm{Logistic}(\\mu, s)$ density. The plot at the bottom shows the logit transformation itself.',
    params: PARAMS,
    sample: (rng, { mu, s }) => { let u = rng.random(); while (u === 0) u = rng.random(); return mu + s * Math.log(u / (1 - u)); },
    sampleName: 'values of μ + s·ln(U/(1−U))',
    target: {
      name: ({ mu, s }) => `Logistic(μ = ${ui.fmt(mu, 3)}, s = ${ui.fmt(s, 3)}) density`,
      pdf: (x, { mu, s }) => logisticPdf(x, mu, s),
      cdf: (x, { mu, s }) => logisticCdf(x, mu, s),
    },
    range: ({ mu, s }) => [mu - 7 * s, mu + 7 * s],
    xLabel: 'x = μ + s·ln(U/(1−U))',
    readout: ({ s }) => `The logistic mean is $\\mu$ and its standard deviation is $s\\pi/\\sqrt3$ = <b>${ui.fmt(s * Math.PI / Math.sqrt(3), 4)}</b>.`,
  });
  mappingFigure(box, ctx, sim.store, {
    caption: 'The transformation $x = \\mu + s\\ln\\frac{u}{1-u}$. The nine dots on the vertical axis are the images of $u = 0.1, 0.2, \\dots, 0.9$; they cut the logistic distribution into ten equally likely intervals, short in the middle and long in the tails. Drag the amber marker along the $u$ axis.',
    xLabel: 'u (uniform number)', yLabel: 'x = μ + s·logit(u)',
    xRange: () => [0, 1], yRange: ({ mu, s }) => [mu - 5 * s, mu + 5 * s],
    g: (u, { mu, s }) => mu + s * Math.log(u / (1 - u)),
    srcQ: q => q,
    u0: 0.8, uMin: 0.001, uMax: 0.999, handleLabel: 'u',
    readout: (p, u, x) => `For $u$ = <b>${ui.fmt(u, 3)}</b> the odds are $u/(1-u)$ = ${ui.fmt(u / (1 - u), 3)} and the transformed value is <b>${ui.fmt(x, 4)}</b>. The logistic CDF at this value is $1/(1 + e^{-(x-\\mu)/s})$ = ${ui.fmt(logisticCdf(x, p.mu, p.s), 3)}, the same as $u$.`,
  });
}

function backwardDemo(box, { demos, ui }) {
  demos.simulationDemo(box, null, {
    intro: 'Each simulated value is $1/(1 + e^{-(X-\\mu)/s})$, the logistic CDF evaluated at a fresh logistic random number $X$. Whatever $\\mu$ and $s$ are, the histogram is flat: the values are uniform on $(0, 1)$.',
    params: PARAMS,
    sample: (rng, { mu, s }) => logisticCdf(rng.logistic(mu, s), mu, s),
    sampleName: 'values of the sigmoid of (X − μ)/s',
    target: { name: () => 'Uniform(0, 1) density', pdf: x => (x >= 0 && x <= 1 ? 1 : 0), cdf: x => Math.min(1, Math.max(0, x)) },
    range: () => [0, 1],
    xLabel: 'u = 1/(1 + e^(−(X−μ)/s))',
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
