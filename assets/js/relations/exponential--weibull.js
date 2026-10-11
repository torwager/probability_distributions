// Exponential -> Weibull: lambda X^{1/k} ~ Weibull(k, lambda) for X ~ Exp(1), and conversely (W/lambda)^k ~ Exp(1).
// Demo: two views (a segmented switch) built on ctx.demos.simulationDemo. The forward view adds a plot of the two
// hazard functions, because the hazard is what the power transformation changes.

import { getRelation } from '../catalog.js';

const REL = getRelation('exponential--weibull');

function weibullPdf(x, k, lam) {
  if (x < 0) return 0;
  if (x === 0) return k < 1 ? Infinity : k === 1 ? 1 / lam : 0;
  const z = x / lam;
  return (k / lam) * Math.exp((k - 1) * Math.log(z) - Math.pow(z, k));
}
const weibullCdf = (x, k, lam) => (x <= 0 ? 0 : -Math.expm1(-Math.pow(x / lam, k)));
const weibullQ = (u, k, lam) => lam * Math.pow(-Math.log1p(-u), 1 / k);
const PARAMS = [
  { key: 'k', sym: 'k', name: 'Weibull shape', meaning: 'The power: the simulated value is $\\lambda X^{1/k}$. Below 1 the hazard falls over time, above 1 it rises; $k = 1$ gives back an exponential.', min: 0.5, max: 5, default: 2, step: 0.05 },
  { key: 'lambda', sym: '\\lambda', name: 'Weibull scale', meaning: 'The scale of the Weibull distribution, about its 63rd percentile. It is a scale, not a rate.', min: 0.2, max: 5, default: 1, step: 0.05 },
];

export default {
  id: 'exponential--weibull',
  from: 'exponential',
  to: 'weibull',
  title: 'A power of a standard exponential variable, rescaled, is Weibull distributed',

  summary: 'Raising a standard exponential variable to the power $1/k$ and multiplying by $\\lambda$ gives a Weibull variable with shape $k$ and scale $\\lambda$. The exponential has a constant hazard; the Weibull hazard rises over time when $k > 1$ and falls when $k < 1$.',

  plain: [
    'Start with a standard exponential waiting time $X$ (rate 1, mean 1). Raising it to the power $1/k$ and multiplying by $\\lambda$ gives a Weibull variable with shape $k$ and scale $\\lambda$. Going back, $(W/\\lambda)^k$ turns a Weibull variable into a standard exponential one.',
    'The exponential has a constant hazard: the chance of the event in the next instant, among those still waiting, never changes. The power transformation bends the time axis. With $k > 1$ it compresses long times, so the hazard rises with time, as for parts that wear out; with $k < 1$ it stretches them, so the hazard falls, as for early failures or infant mortality. With $k = 1$ nothing changes, and the Weibull is the exponential with rate $1/\\lambda$.',
    'Note the symbol clash: on this site $\\lambda$ is the <b>rate</b> of the exponential but the <b>scale</b> of the Weibull. So $\\mathrm{Weibull}(1, \\lambda)$ is the exponential with mean $\\lambda$, that is, rate $1/\\lambda$.',
  ],

  statementTex: REL.statement,
  glossary: [
    { sym: 'X \\sim \\mathrm{Exp}(1)', meaning: '$X$ is a standard exponential waiting time, with rate 1 and mean 1.' },
    { sym: 'k', meaning: 'The Weibull shape, a positive number. The transformation raises $X$ to the power $1/k$.' },
    { sym: '\\lambda', meaning: 'The Weibull scale, a positive number. It multiplies the result; about 63.2% of Weibull values lie below $\\lambda$ whatever $k$ is.' },
    { sym: '\\lambda X^{1/k}', meaning: 'The transformed variable: the $k$-th root of $X$, multiplied by $\\lambda$.' },
    { sym: '\\mathrm{Weibull}(k, \\lambda)', meaning: 'The Weibull distribution with shape $k$ and scale $\\lambda$: CDF $1 - e^{-(x/\\lambda)^k}$ for $x \\ge 0$.' },
    { sym: 'W', meaning: 'A Weibull random variable, used in the converse statement.' },
    { sym: '(W/\\lambda)^k', meaning: 'The converse transformation: divide by the scale, then raise to the power $k$.' },
    { sym: '\\mathrm{Exp}(\\text{rate } 1/\\lambda)', meaning: 'The exponential distribution with rate $1/\\lambda$, that is, with mean $\\lambda$.' },
    { sym: '\\Rightarrow', meaning: 'Implies: if the left side holds, the right side follows.' },
  ],

  why: [
    'The exponential survival function is $P(X > t) = e^{-t}$. The map $x \\mapsto \\lambda x^{1/k}$ is increasing, so for any $w > 0$',
    { tex: 'P\\big(\\lambda X^{1/k} > w\\big) = P\\big(X > (w/\\lambda)^k\\big) = e^{-(w/\\lambda)^k},' },
    'which is the Weibull survival function. The converse undoes the transformation: $P((W/\\lambda)^k > t) = P(W > \\lambda t^{1/k}) = e^{-t}$.',
    'The hazard function makes the difference visible. For the Weibull it is',
    { tex: 'h(w) = \\frac{f(w)}{1 - F(w)} = \\frac{k}{\\lambda}\\left(\\frac{w}{\\lambda}\\right)^{k-1},' },
    'a power of time: increasing for $k > 1$, constant ($= 1/\\lambda$) for $k = 1$, and decreasing for $k < 1$. The cumulative hazard $H(w) = (w/\\lambda)^k$ is exactly the transformation that maps $W$ to a standard exponential. More generally, for any continuous lifetime $T$ with cumulative hazard $H$, $H(T)$ is $\\mathrm{Exp}(1)$; the Weibull is the case where $H$ is a power.',
    'Taking logarithms gives another link: $\\ln W = \\ln\\lambda + \\tfrac1k \\ln X$, and $-\\ln X$ is standard Gumbel, so $-\\ln W$ is Gumbel with location $-\\ln\\lambda$ and scale $1/k$. This is why the log of Weibull data is analyzed with extreme-value methods.',
  ],

  references: [
    { text: 'Wikipedia: Weibull distribution, related distributions.', url: 'https://en.wikipedia.org/wiki/Weibull_distribution#Related_distributions' },
    { text: 'Johnson, N. L., Kotz, S., & Balakrishnan, N. (1994). <i>Continuous Univariate Distributions</i>, Vol. 1 (2nd ed.), Chapter 21. Wiley.' },
    { text: 'Casella, G., & Berger, R. L. (2002). <i>Statistical Inference</i> (2nd ed.), Exercises 3.25–3.26 (hazard functions). Duxbury.' },
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
      { value: 'fwd', label: 'Exponential → Weibull: λX^(1/k)' },
      { value: 'back', label: 'Weibull → exponential: (W/λ)^k' },
    ], 'fwd', show, 'Which direction of the relationship to show');
    container.append(h('div', { style: 'margin-bottom:.6rem' }, seg.el), fwdBox, backBox);
    show('fwd');
  },
};

function forwardDemo(box, ctx) {
  const { demos, ui, plot, math } = ctx;
  const { h } = ui;
  const sim = demos.simulationDemo(box, null, {
    intro: 'Each simulated value is $\\lambda X^{1/k}$ for a fresh standard exponential number $X$. The histogram is compared with the $\\mathrm{Weibull}(k, \\lambda)$ density. Set $k = 1$ to see the exponential itself; the plot at the bottom compares the hazard functions.',
    params: PARAMS,
    sample: (rng, { k, lambda }) => lambda * Math.pow(rng.exponential(1), 1 / k),
    sampleName: 'values of λ·X^(1/k)',
    target: {
      name: ({ k, lambda }) => `Weibull(k = ${ui.fmt(k, 3)}, λ = ${ui.fmt(lambda, 3)}) density`,
      pdf: (x, { k, lambda }) => weibullPdf(x, k, lambda),
      cdf: (x, { k, lambda }) => weibullCdf(x, k, lambda),
    },
    range: ({ k, lambda }) => [0, weibullQ(0.995, k, lambda)],
    xLabel: 'w = λ·X^(1/k)',
    readout: ({ k, lambda }) => `The Weibull mean is $\\lambda\\,\\Gamma(1 + 1/k)$ = <b>${ui.fmt(lambda * Math.exp(math.lgamma(1 + 1 / k)), 4)}</b>.`,
  });

  // the two hazard functions
  const hb = h('div');
  const hr = h('p', { class: 'demo-readout', 'aria-live': 'polite' });
  box.append(h('figure', { class: 'plot-fig', style: 'margin-top:1.4rem' },
    ui.rich('figcaption', 'Hazard functions: the Weibull hazard $\\frac{k}{\\lambda}(w/\\lambda)^{k-1}$ (solid) and the constant hazard $1/\\lambda$ of the exponential with the same scale (dashed). They coincide when $k = 1$.'), hb), hr);
  const H = new plot.Plot(hb, { xLabel: 'time w', yLabel: 'hazard h(w)', height: w => math.clamp(w * 0.36, 210, 300) });
  const drawHazard = () => {
    const { k, lambda } = sim.store.get().p;
    const hi = weibullQ(0.995, k, lambda);
    const hz = w => (w <= 0 ? (k < 1 ? NaN : k === 1 ? 1 / lambda : 0) : (k / lambda) * Math.pow(w / lambda, k - 1));
    const pts = plot.sampleFn(hz, 0, hi, 300);
    const fin = pts.map(q => q[1]).filter(Number.isFinite);
    const top = Math.min(Math.max(...fin, 1 / lambda), 4 * Math.max(hz(hi), 1 / lambda)) * 1.15;
    H.render({
      x: [0, hi], y: [0, top],
      layers: [
        { id: 'expc', type: 'line', points: [[0, 1 / lambda], [hi, 1 / lambda]], cls: 'curve-ref' },
        { id: 'wb', type: 'line', points: pts, cls: 'curve-main' },
      ],
      legend: [{ label: `Weibull hazard, k = ${ui.fmt(k, 3)}`, cls: 'curve-main' }, { label: `exponential hazard 1/λ = ${ui.fmt(1 / lambda, 3)}`, cls: 'curve-ref' }],
    });
    ui.renderRich(hr, k > 1.0001 ? `With $k$ = ${ui.fmt(k, 3)} > 1 the hazard rises with time: the longer something has lasted, the more likely it is to fail soon (wear-out).`
      : k < 0.9999 ? `With $k$ = ${ui.fmt(k, 3)} < 1 the hazard falls with time: survivors become less and less likely to fail (early failures, infant mortality).`
      : 'With $k = 1$ the hazard is constant and the Weibull is the exponential with rate $1/\\lambda$: it is memoryless.');
  };
  sim.store.subscribe(drawHazard);
  drawHazard();
}

function backwardDemo(box, { demos, ui }) {
  demos.simulationDemo(box, null, {
    intro: 'Each simulated value is $(W/\\lambda)^k$ for a fresh Weibull number $W$ with shape $k$ and scale $\\lambda$. Whatever the two parameters are, the histogram follows the standard exponential density $e^{-x}$.',
    params: PARAMS,
    sample: (rng, { k, lambda }) => Math.pow(rng.weibull(k, lambda) / lambda, k),
    sampleName: 'values of (W/λ)^k',
    target: { name: () => 'Exponential(1) density', pdf: x => (x < 0 ? 0 : Math.exp(-x)), cdf: x => (x <= 0 ? 0 : -Math.expm1(-x)) },
    range: () => [0, 6.5],
    xLabel: 'x = (W/λ)^k',
    readout: () => 'The standard exponential has mean 1 and standard deviation 1.',
  });
}
