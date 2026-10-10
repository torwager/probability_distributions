// Exponential -> Gumbel: -ln X ~ Gumbel(0, 1) for X ~ Exp(1); max of n iid Exp(1) minus ln n -> Gumbel(0, 1);
// and -ln W ~ Gumbel(-ln lambda, 1/k) for W ~ Weibull(k, lambda).
// Demo: three views (a segmented switch): the transformation (simulationDemo), the maximum limit (compareDemo with a
// handle at the left end of the support, -ln n) and the Weibull generalization (simulationDemo).

import { getRelation } from '../catalog.js';

const REL = getRelation('exponential--gumbel');

const gumbelPdf = (x, mu, b) => { const z = (x - mu) / b; return Math.exp(-z - Math.exp(-z)) / b; };
const gumbelCdf = (x, mu, b) => Math.exp(-Math.exp(-(x - mu) / b));
// exact distribution of M_n - ln n, where M_n is the maximum of n iid Exp(1) variables
const maxCdf = (x, n) => (x <= -Math.log(n) ? 0 : Math.exp(n * Math.log1p(-Math.exp(-x) / n)));
const maxPdf = (x, n) => (x < -Math.log(n) ? 0 : n === 1 ? Math.exp(-x) : Math.exp(-x + (n - 1) * Math.log1p(-Math.exp(-x) / n)));
const EULER = 0.5772156649015329;

export default {
  id: 'exponential--gumbel',
  from: 'exponential',
  to: 'gumbel',
  title: 'Minus the log of an exponential variable is Gumbel, and so is the largest of many exponential variables',

  plain: [
    'If $X$ is a standard exponential variable (rate 1), then $-\\ln X$ has the standard Gumbel distribution. Small values of $X$, which are common, give large values of $-\\ln X$, so the Gumbel has a long right tail and a short left tail.',
    'The Gumbel distribution also appears as a limit. Take the largest of $n$ independent standard exponential variables. It grows like $\\ln n$, and after subtracting $\\ln n$ its distribution approaches the standard Gumbel as $n$ grows. This is the simplest case of extreme-value theory: the maximum of many independent variables whose tails are lighter than any power law (exponential, gamma, normal, log-normal and others) is approximately Gumbel after suitable centering and scaling.',
    'More generally, minus the log of a Weibull variable is Gumbel. The Gumbel is also the basis of random-utility models of choice: adding independent Gumbel noise to the values of several options and choosing the largest gives the softmax (multinomial logit) choice rule.',
  ],

  statementTex: REL.statement,
  glossary: [
    { sym: 'X \\sim \\mathrm{Exp}(1)', meaning: '$X$ is a standard exponential variable, with rate 1 and mean 1.' },
    { sym: '-\\ln X', meaning: 'Minus the natural logarithm of $X$. It is positive when $X < 1$ and negative when $X > 1$.' },
    { sym: '\\mathrm{Gumbel}(\\mu, \\beta)', meaning: 'The Gumbel (maximum type) distribution with location (mode) $\\mu$ and scale $\\beta$: CDF $\\exp(-e^{-(x-\\mu)/\\beta})$. $\\mathrm{Gumbel}(0, 1)$ is the standard form.' },
    { sym: 'X_1, \\dots, X_n', meaning: '$n$ independent standard exponential variables.' },
    { sym: '\\overset{iid}{\\sim}', meaning: 'Independent and identically distributed.' },
    { sym: '\\max_i X_i', meaning: 'The largest of the $n$ values.' },
    { sym: '\\ln n', meaning: 'The natural logarithm of the number of variables: the typical size of the maximum, which is subtracted to keep it from drifting off.' },
    { sym: '\\xrightarrow{d}', meaning: 'Converges in distribution: as $n$ grows, probabilities computed for the left side approach those of the right side.' },
    { sym: 'W \\sim \\mathrm{Weibull}(k, \\lambda)', meaning: '$W$ is a Weibull variable with shape $k$ and scale $\\lambda$.' },
    { sym: '\\lambda', meaning: 'The Weibull scale. It becomes the Gumbel location $-\\ln\\lambda$.' },
    { sym: 'k', meaning: 'The Weibull shape. It becomes the Gumbel scale $1/k$.' },
    { sym: '\\Rightarrow', meaning: 'Implies: if the left side holds, the right side follows.' },
  ],

  why: [
    '<b>The transformation.</b> For any real $y$, $-\\ln X \\le y$ exactly when $X \\ge e^{-y}$, so',
    { tex: 'P(-\\ln X \\le y) = P(X \\ge e^{-y}) = \\exp\\!\\big(-e^{-y}\\big),' },
    'which is the standard Gumbel CDF. For $X \\sim \\mathrm{Exp}(\\lambda)$ the same steps give $\\exp(-\\lambda e^{-y}) = \\exp(-e^{-(y - \\ln\\lambda)})$, a Gumbel with location $\\ln\\lambda$ and scale 1. For a Weibull variable, $P(W \\ge e^{-y}) = \\exp(-(e^{-y}/\\lambda)^k) = \\exp(-e^{-k(y + \\ln\\lambda)})$, a Gumbel with location $-\\ln\\lambda$ and scale $1/k$.',
    '<b>The maximum.</b> The maximum is at most $x$ only if every one of the $n$ values is, so with $x + \\ln n \\ge 0$',
    { tex: 'P\\Big(\\max_i X_i - \\ln n \\le x\\Big) = \\big(1 - e^{-(x + \\ln n)}\\big)^n = \\Big(1 - \\frac{e^{-x}}{n}\\Big)^{n} \\;\\longrightarrow\\; \\exp\\!\\big(-e^{-x}\\big),' },
    'using the limit $(1 + a/n)^n \\to e^{a}$. The left end of the exact distribution is at $-\\ln n$ and moves off to $-\\infty$, while the shape settles onto the Gumbel curve. The largest CDF gap shrinks roughly like $1/n$, quickly compared with the $1/\\sqrt n$ of the central limit theorem.',
    '<b>Mean and spread.</b> The standard Gumbel has mean $\\gamma \\approx 0.5772$ (the Euler–Mascheroni constant) and variance $\\pi^2/6$. So the expected maximum of $n$ standard exponentials is close to $\\ln n + 0.5772$; exactly, it is the harmonic number $1 + \\tfrac12 + \\dots + \\tfrac1n$.',
    '<b>Why it matters for choice models.</b> If each option $j$ has value $v_j$ plus independent standard Gumbel noise, the probability that option $j$ has the largest total is $e^{v_j}/\\sum_i e^{v_i}$, the softmax rule (McFadden, 1974). Gumbel noise is generated as $-\\ln(-\\ln U)$ from uniform $U$, which is $-\\ln X$ with $X = -\\ln U$ exponential; this is the Gumbel-max trick used in machine learning.',
  ],

  references: [
    { text: 'Wikipedia: Gumbel distribution, related distributions.', url: 'https://en.wikipedia.org/wiki/Gumbel_distribution#Related_distributions' },
    { text: 'Wikipedia: Extreme value theory.', url: 'https://en.wikipedia.org/wiki/Extreme_value_theory' },
    { text: 'Gumbel, E. J. (1958). <i>Statistics of Extremes</i>. Columbia University Press.' },
    { text: 'Coles, S. (2001). <i>An Introduction to Statistical Modeling of Extreme Values</i>, Chapter 3. Springer.', url: 'https://doi.org/10.1007/978-1-4471-3675-0' },
    { text: 'McFadden, D. (1974). Conditional logit analysis of qualitative choice behavior. In P. Zarembka (Ed.), <i>Frontiers in Econometrics</i> (pp. 105–142). Academic Press.' },
    { text: 'Leemis, L. M., & McQueston, J. T. (2008). Univariate distribution relationships. <i>The American Statistician</i>, 62(1), 45–53.', url: 'https://doi.org/10.1198/000313008X270448' },
  ],

  demo(container, ctx) {
    const { ui } = ctx;
    const { h } = ui;
    const boxes = { log: h('div'), max: h('div', { hidden: true }), weib: h('div', { hidden: true }) };
    const builders = { log: logDemo, max: maxDemo, weib: weibullDemo };
    const built = {};
    const show = v => {
      for (const k in boxes) boxes[k].hidden = k !== v;
      if (!built[v]) { built[v] = true; builders[v](boxes[v], ctx); }
    };
    const seg = ui.segmented([
      { value: 'log', label: '−ln X' },
      { value: 'max', label: 'Maximum of n, minus ln n' },
      { value: 'weib', label: 'Weibull: −ln W' },
    ], 'log', show, 'Which part of the relationship to show');
    container.append(h('div', { style: 'margin-bottom:.6rem' }, seg.el), boxes.log, boxes.max, boxes.weib);
    show('log');
  },
};

function logDemo(box, { demos, ui }) {
  demos.simulationDemo(box, null, {
    intro: 'Each simulated value is $-\\ln X$ for a fresh exponential number $X$ with rate $\\lambda$. With $\\lambda = 1$ the target is the standard Gumbel; another rate only shifts it, to $\\mathrm{Gumbel}(\\ln\\lambda, 1)$.',
    params: [{ key: 'lambda', sym: '\\lambda', name: 'exponential rate', meaning: 'The rate of the exponential variable. The statement uses $\\lambda = 1$; other values shift the Gumbel by $\\ln\\lambda$.', min: 0.1, max: 10, default: 1, log: true }],
    sample: (rng, { lambda }) => -Math.log(rng.exponential(lambda)),
    sampleName: 'values of −ln X',
    target: {
      name: ({ lambda }) => `Gumbel(μ = ${ui.fmt(Math.log(lambda), 3)}, β = 1) density`,
      pdf: (x, { lambda }) => gumbelPdf(x, Math.log(lambda), 1),
      cdf: (x, { lambda }) => gumbelCdf(x, Math.log(lambda), 1),
    },
    range: ({ lambda }) => [Math.log(lambda) - 3, Math.log(lambda) + 7],
    xLabel: 'y = −ln X',
    readout: ({ lambda }) => `The Gumbel mean is $\\mu + \\gamma$ = <b>${ui.fmt(Math.log(lambda) + EULER, 4)}</b> (with $\\gamma \\approx 0.5772$) and its standard deviation is $\\pi/\\sqrt6 \\approx$ <b>1.283</b>.`,
  });
}

function maxDemo(box, { demos, ui }) {
  let drag = null;
  demos.compareDemo(box, null, {
    intro: 'The solid curve is the exact density of $\\max_i X_i - \\ln n$ for $n$ independent standard exponential variables; the dashed curve is the standard Gumbel density. The exact distribution starts at $-\\ln n$, marked by the amber triangle under the axis. Drag it to the left (larger $n$) and the exact curve settles onto the Gumbel curve.',
    params: [{ key: 'n', sym: 'n', name: 'number of variables', meaning: 'How many independent standard exponential variables the maximum is taken over.', min: 1, max: 500, default: 2, integer: true, log: true }],
    exact: {
      name: ({ n }) => `max of ${n} Exp(1) values, minus ln ${n}`,
      pdf: (x, { n }) => maxPdf(x, n),
      cdf: (x, { n }) => maxCdf(x, n),
    },
    approx: { name: () => 'Gumbel(0, 1)', pdf: x => gumbelPdf(x, 0, 1), cdf: x => gumbelCdf(x, 0, 1) },
    range: ({ n }) => [-Math.max(Math.log(n) + 0.6, 3), 6.5],
    xLabel: 'x = max − ln n',
    handles: ({ n }, set) => [{
      id: 'n', type: 'xPoint', x: -Math.log(n), label: '−ln n',
      ariaLabel: 'Left end of the support, −ln n. Drag left to increase n, or use the arrow keys.',
      valueText: String(n), valueNow: n, valueMin: 1, valueMax: 500,
      onDrag: (pt, phase) => {
        if (phase === 'start') drag = true;
        if (pt && drag) set({ n: Math.round(Math.exp(-Math.min(0, pt.x))) });
        if (phase === 'end') drag = null;
      },
      // right arrow moves the marker right (smaller n), left arrow moves it left (larger n)
      onKey: steps => set({ n: steps > 0 ? Math.min(n - 1, Math.round(n / Math.pow(1.25, steps))) : Math.max(n + 1, Math.round(n * Math.pow(1.25, -steps))) }),
    }],
    readout: ({ n }) => {
      let H = 0; for (let i = 1; i <= n; i++) H += 1 / i;
      return `The exact mean of the maximum is the harmonic number $1 + \\tfrac12 + \\dots + \\tfrac1n$ = <b>${ui.fmt(H, 4)}</b>, compared with $\\ln n + \\gamma$ = <b>${ui.fmt(Math.log(n) + EULER, 4)}</b>.`;
    },
  });
}

function weibullDemo(box, { demos, ui }) {
  demos.simulationDemo(box, null, {
    intro: 'Each simulated value is $-\\ln W$ for a fresh Weibull number $W$ with shape $k$ and scale $\\lambda$. The histogram is compared with $\\mathrm{Gumbel}(-\\ln\\lambda,\\ 1/k)$. With $k = 1$ and $\\lambda = 1$ this is the first view again.',
    params: [
      { key: 'k', sym: 'k', name: 'Weibull shape', meaning: 'The Weibull shape; the Gumbel scale is $1/k$.', min: 0.3, max: 5, default: 2, step: 0.05 },
      { key: 'lambda', sym: '\\lambda', name: 'Weibull scale', meaning: 'The Weibull scale; the Gumbel location is $-\\ln\\lambda$.', min: 0.2, max: 5, default: 1, step: 0.05 },
    ],
    sample: (rng, { k, lambda }) => -Math.log(rng.weibull(k, lambda)),
    sampleName: 'values of −ln W',
    target: {
      name: ({ k, lambda }) => `Gumbel(μ = ${ui.fmt(-Math.log(lambda), 3)}, β = ${ui.fmt(1 / k, 3)}) density`,
      pdf: (x, { k, lambda }) => gumbelPdf(x, -Math.log(lambda), 1 / k),
      cdf: (x, { k, lambda }) => gumbelCdf(x, -Math.log(lambda), 1 / k),
    },
    range: ({ k, lambda }) => [-Math.log(lambda) - 3 / k, -Math.log(lambda) + 7 / k],
    xLabel: 'y = −ln W',
    readout: ({ k }) => `The Gumbel standard deviation is $\\pi/(k\\sqrt6)$ = <b>${ui.fmt(Math.PI / (k * Math.sqrt(6)), 4)}</b>.`,
  });
}
