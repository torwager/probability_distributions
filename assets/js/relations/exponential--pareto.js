// Exponential <-> Pareto: X ~ Exp(alpha) iff x_m e^X ~ Pareto(x_m, alpha); ln(Y/x_m) ~ Exp(alpha) for Y ~ Pareto.
// Demo: two views (a segmented switch) built on ctx.demos.simulationDemo. The forward view adds a log-log plot of
// the survival function, where the Pareto power law is a straight line with slope -alpha.

import { getRelation } from '../catalog.js';

const REL = getRelation('exponential--pareto');

const paretoPdf = (x, xm, a) => (x < xm ? 0 : a * Math.pow(xm, a) / Math.pow(x, a + 1));
const paretoCdf = (x, xm, a) => (x <= xm ? 0 : 1 - Math.pow(xm / x, a));
const PARAMS = [
  { key: 'alpha', sym: '\\alpha', name: 'rate / tail index', meaning: 'The rate of the exponential variable, which becomes the tail index (shape) of the Pareto: a smaller $\\alpha$ means a heavier tail.', min: 0.5, max: 6, default: 2, step: 0.05 },
  { key: 'xm', sym: 'x_m', name: 'Pareto minimum', meaning: 'The smallest possible Pareto value (its scale).', min: 0.2, max: 5, default: 1, step: 0.05 },
];
const hiOf = ({ alpha, xm }) => xm * Math.min(Math.pow(0.02, -1 / alpha), 25);

export default {
  id: 'exponential--pareto',
  from: 'exponential',
  to: 'pareto',
  title: 'Exponentiating an exponential variable gives a Pareto variable, and taking logs goes back',

  plain: [
    'If $X$ is exponential with rate $\\alpha$, then $Y = x_m e^{X}$ has a Pareto distribution with minimum $x_m$ and tail index $\\alpha$. Since $X \\ge 0$, $Y$ is never below $x_m$. In the other direction, the logarithm of a Pareto variable divided by its minimum, $\\ln(Y/x_m)$, is exponential with rate $\\alpha$.',
    'So the Pareto is to the exponential what the log-normal is to the normal. On a logarithmic scale, the Pareto has the exponential’s thin tail; on the original scale this becomes a power-law tail, $P(Y > y) = (x_m/y)^{\\alpha}$, which falls off so slowly that the mean is infinite when $\\alpha \\le 1$ and the variance is infinite when $\\alpha \\le 2$.',
  ],

  statementTex: REL.statement,
  glossary: [
    { sym: 'X \\sim \\mathrm{Exp}(\\alpha)', meaning: '$X$ is exponential with rate $\\alpha$ (mean $1/\\alpha$).' },
    { sym: '\\alpha', meaning: 'The rate of the exponential, which is the shape or tail index of the Pareto. A smaller $\\alpha$ gives a heavier tail.' },
    { sym: 'x_m', meaning: 'The Pareto minimum (scale): the smallest possible value of $Y$.' },
    { sym: 'e^{X}', meaning: 'The exponential function applied to $X$; $e \\approx 2.718$. It is at least 1 because $X \\ge 0$.' },
    { sym: '\\mathrm{Pareto}(x_m, \\alpha)', meaning: 'The Pareto distribution with minimum $x_m$ and tail index $\\alpha$: $P(Y > y) = (x_m/y)^{\\alpha}$ for $y \\ge x_m$.' },
    { sym: '\\iff', meaning: 'If and only if: each statement implies the other.' },
    { sym: 'Y', meaning: 'A Pareto random variable.' },
    { sym: '\\ln(Y/x_m)', meaning: 'The natural logarithm of $Y$ divided by its minimum: how many factors of $e$ above the minimum $Y$ lies.' },
  ],

  why: [
    'Both directions follow from the survival functions. The map $x \\mapsto x_m e^x$ is increasing, so for $y \\ge x_m$',
    { tex: 'P\\big(x_m e^{X} > y\\big) = P\\big(X > \\ln(y/x_m)\\big) = e^{-\\alpha \\ln(y/x_m)} = \\left(\\frac{x_m}{y}\\right)^{\\alpha},' },
    'which is the Pareto survival function. Read backward, $P(\\ln(Y/x_m) > t) = P(Y > x_m e^t) = e^{-\\alpha t}$, the survival function of $\\mathrm{Exp}(\\alpha)$.',
    '<b>Why the tail becomes a power law.</b> Taking logs of the Pareto survival function gives $\\ln P(Y > y) = -\\alpha(\\ln y - \\ln x_m)$: a straight line with slope $-\\alpha$ on log–log axes, as in the bottom plot. Plotting the empirical survival function of data on log–log axes and looking for a straight line is the usual first check for a power-law tail.',
    '<b>Consequences.</b> The moments of $Y$ are $\\mathrm{E}[Y^r] = \\mathrm{E}[x_m^r e^{rX}] = x_m^r M_X(r)$, where $M_X(r) = \\alpha/(\\alpha - r)$ is the exponential moment-generating function. It is finite only for $r < \\alpha$, which is why the Pareto mean needs $\\alpha > 1$ and its variance needs $\\alpha > 2$. It also explains maximum-likelihood estimation of the tail index: with $x_m$ known, $\\hat\\alpha = n / \\sum_i \\ln(y_i/x_m)$ is the exponential rate estimate applied to the logged data. The Hill estimator used in extreme-value analysis applies the same formula to the largest observations, with a high threshold in place of $x_m$.',
  ],

  references: [
    { text: 'Wikipedia: Pareto distribution, relation to the exponential distribution.', url: 'https://en.wikipedia.org/wiki/Pareto_distribution#Relation_to_the_exponential_distribution' },
    { text: 'Arnold, B. C. (2015). <i>Pareto Distributions</i> (2nd ed.), Chapter 3. CRC Press.' },
    { text: 'Clauset, A., Shalizi, C. R., & Newman, M. E. J. (2009). Power-law distributions in empirical data. <i>SIAM Review</i>, 51(4), 661–703.', url: 'https://doi.org/10.1137/070710111' },
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
      { value: 'fwd', label: 'Exponential → Pareto: xₘ·e^X' },
      { value: 'back', label: 'Pareto → exponential: ln(Y/xₘ)' },
    ], 'fwd', show, 'Which direction of the relationship to show');
    container.append(h('div', { style: 'margin-bottom:.6rem' }, seg.el), fwdBox, backBox);
    show('fwd');
  },
};

const sampleFwd = (rng, { alpha, xm }) => xm * Math.exp(rng.exponential(alpha));

function forwardDemo(box, ctx) {
  const { demos, ui, plot, math } = ctx;
  const { h } = ui;
  const sim = demos.simulationDemo(box, null, {
    intro: 'Each simulated value is $x_m e^{X}$ for a fresh exponential number $X$ with rate $\\alpha$. The histogram is compared with the $\\mathrm{Pareto}(x_m, \\alpha)$ density. With a small $\\alpha$ many values land far to the right, beyond the plotted window (for $\\alpha = 0.5$, one value in five is above $25x_m$); the histogram is still scaled so that its total area over all values is 1. The plot at the bottom shows the same sample on log–log axes.',
    params: PARAMS,
    sample: sampleFwd,
    sampleName: 'values of xₘ·e^X',
    target: {
      name: ({ alpha, xm }) => `Pareto(xₘ = ${ui.fmt(xm, 3)}, α = ${ui.fmt(alpha, 3)}) density`,
      pdf: (x, { alpha, xm }) => paretoPdf(x, xm, alpha),
      cdf: (x, { alpha, xm }) => paretoCdf(x, xm, alpha),
    },
    // start the window at x_m so that the histogram bins line up with the jump of the density there
    range: p => [p.xm, hiOf(p)],
    xLabel: 'y = xₘ·e^X',
    readout: ({ alpha, xm }) => (alpha > 1
      ? `The Pareto mean $\\alpha x_m/(\\alpha - 1)$ = <b>${ui.fmt(alpha * xm / (alpha - 1), 4)}</b>` + (alpha > 2 ? '.' : '; its variance is infinite because $\\alpha \\le 2$, so the sample standard deviation does not settle down as the sample grows.')
      : 'With $\\alpha \\le 1$ the Pareto mean is infinite, so the sample mean keeps growing as more values are drawn.'),
  });

  // log-log survival plot of the same sample (regenerated with the same seed as simulationDemo uses)
  const lb = h('div');
  const lr = h('p', { class: 'demo-readout', 'aria-live': 'polite' });
  box.append(h('figure', { class: 'plot-fig', style: 'margin-top:1.4rem' },
    ui.rich('figcaption', 'The survival function on log–log axes: $\\ln P(Y > y)$ against $\\ln y$. The dots are the simulated values, the line is the Pareto power law $-\\alpha(\\ln y - \\ln x_m)$, a straight line with slope $-\\alpha$.'), lb), lr);
  const L = new plot.Plot(lb, { xLabel: 'ln y', yLabel: 'ln P(Y > y)', height: w => math.clamp(w * 0.36, 220, 300) });
  let cache = { key: '', pts: [] };
  const drawLog = () => {
    const s = sim.store.get(), { alpha, xm } = s.p;
    const key = JSON.stringify([s.p, s.size, s.seed]);
    if (cache.key !== key) {
      const rng = math.makeRng(1000 + s.seed);
      const ys = new Float64Array(s.size);
      for (let i = 0; i < s.size; i++) ys[i] = sampleFwd(rng, s.p);
      ys.sort();
      const n = ys.length, pts = [];
      // empirical survival (n - i)/n just before each order statistic; thin out to at most about 400 points
      const step = Math.max(1, Math.floor(n / 400));
      for (let i = 0; i < n - 1; i += step) pts.push([Math.log(ys[i]), Math.log((n - i) / n)]);
      for (let i = Math.max(0, n - 30); i < n; i++) pts.push([Math.log(ys[i]), Math.log((n - i) / n)]);
      cache = { key, pts };
    }
    const lx0 = Math.log(xm), lx1 = Math.max(lx0 + 8 / alpha, ...cache.pts.map(q => q[0]));
    const ylo = Math.log(1 / s.size) - 0.6;
    L.render({
      x: [lx0 - 0.1 * (lx1 - lx0), lx1], y: [ylo, 0.4],
      layers: [
        { id: 'law', type: 'line', points: [[lx0, 0], [lx1, -alpha * (lx1 - lx0)]], cls: 'curve-ref' },
        { id: 'pts', type: 'dots', points: cache.pts, r: 2.2 },
      ],
      legend: [{ label: 'simulated values (empirical survival)', cls: '', shape: 'dot' }, { label: `power law, slope −α = −${ui.fmt(alpha, 3)}`, cls: 'curve-ref' }],
    });
    ui.renderRich(lr, `On the log scale, $\\ln(Y/x_m)$ is simply the exponential variable $X$, so the dots follow a straight line, the logarithm of the exponential survival function $e^{-\\alpha t}$. The steeper the line, the lighter the tail.`);
  };
  sim.store.subscribe(drawLog);
  drawLog();
}

function backwardDemo(box, { demos, ui }) {
  demos.simulationDemo(box, null, {
    intro: 'Each simulated value is $\\ln(Y/x_m)$ for a fresh Pareto number $Y$ with minimum $x_m$ and tail index $\\alpha$. The histogram follows the $\\mathrm{Exp}(\\alpha)$ density, whatever $x_m$ is.',
    params: PARAMS,
    sample: (rng, { alpha, xm }) => Math.log(rng.pareto(xm, alpha) / xm),
    sampleName: 'values of ln(Y/xₘ)',
    target: {
      name: ({ alpha }) => `Exponential(rate ${ui.fmt(alpha, 3)}) density`,
      pdf: (x, { alpha }) => (x < 0 ? 0 : alpha * Math.exp(-alpha * x)),
      cdf: (x, { alpha }) => (x <= 0 ? 0 : -Math.expm1(-alpha * x)),
    },
    range: ({ alpha }) => [0, 6.5 / alpha],
    xLabel: 't = ln(Y/xₘ)',
    readout: ({ alpha }) => `The exponential mean $1/\\alpha$ = <b>${ui.fmt(1 / alpha, 4)}</b>. One over the sample mean of the logged values is the maximum-likelihood estimate of the tail index $\\alpha$.`,
  });
}
