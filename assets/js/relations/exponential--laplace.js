// Exponential -> Laplace: X1 - X2 ~ Laplace(0, b = 1/lambda) for independent Exp(lambda) variables; conversely
// |Y - mu|/b ~ Exp(1) for Y ~ Laplace(mu, b).
// Demo: two views (a segmented switch), each built on ctx.demos.simulationDemo.

import { getRelation } from '../catalog.js';

const REL = getRelation('exponential--laplace');

const laplacePdf = (x, mu, b) => Math.exp(-Math.abs(x - mu) / b) / (2 * b);
const laplaceCdf = (x, mu, b) => (x < mu ? 0.5 * Math.exp((x - mu) / b) : 1 - 0.5 * Math.exp(-(x - mu) / b));

export default {
  id: 'exponential--laplace',
  from: 'exponential',
  to: 'laplace',
  title: 'The difference of two independent exponential variables with the same rate is Laplace distributed',

  plain: [
    'Let $X_1$ and $X_2$ be two independent exponential waiting times with the same rate $\\lambda$, for example the waiting times of two people for two unrelated buses that run at the same rate. Their difference $X_1 - X_2$ can be positive or negative. It has a Laplace (double exponential) distribution: an exponential tail on each side of zero, with a sharp peak at zero, and scale $b = 1/\\lambda$.',
    'In the other direction, the distance of a Laplace variable from its center, measured in units of its scale, is a standard exponential variable. So the Laplace distribution is the exponential distribution reflected to both sides, with half of the probability on each side.',
  ],

  statementTex: REL.statement,
  glossary: [
    { sym: 'X_1, X_2', meaning: 'Two exponential random variables.' },
    { sym: '\\overset{iid}{\\sim}', meaning: 'Independent and identically distributed: both have the same distribution and neither affects the other.' },
    { sym: '\\mathrm{Exp}(\\lambda)', meaning: 'The exponential distribution with rate $\\lambda$ (mean $1/\\lambda$).' },
    { sym: '\\lambda', meaning: 'The common rate of the two exponential variables.' },
    { sym: 'X_1 - X_2', meaning: 'The difference of the two waiting times. It is positive when the first wait is longer.' },
    { sym: '\\mathrm{Laplace}(\\mu, b)', meaning: 'The Laplace distribution with center $\\mu$ and scale $b$: density $\\frac{1}{2b} e^{-|x-\\mu|/b}$.' },
    { sym: 'b = 1/\\lambda', meaning: 'The Laplace scale that results: the mean of each exponential.' },
    { sym: 'Y', meaning: 'A Laplace random variable, used in the converse statement.' },
    { sym: '\\mu', meaning: 'The center (location) of the Laplace distribution: its mean, median and mode.' },
    { sym: '|Y-\\mu|/b', meaning: 'The absolute distance of $Y$ from its center, in units of the scale $b$.' },
    { sym: '\\mathrm{Exp}(1)', meaning: 'The standard exponential distribution, with rate 1 and mean 1.' },
    { sym: '\\Rightarrow', meaning: 'Implies: if the left side holds, the right side follows.' },
  ],

  why: [
    'The quickest route is the moment-generating function. An $\\mathrm{Exp}(\\lambda)$ variable has $M(t) = \\lambda/(\\lambda - t)$, and $-X_2$ has $\\lambda/(\\lambda + t)$. For independent variables the moment-generating function of a sum is the product, so',
    { tex: 'M_{X_1 - X_2}(t) = \\frac{\\lambda}{\\lambda - t}\\cdot\\frac{\\lambda}{\\lambda + t} = \\frac{\\lambda^2}{\\lambda^2 - t^2} = \\frac{1}{1 - b^2 t^2}, \\qquad b = 1/\\lambda,' },
    'which is the moment-generating function of $\\mathrm{Laplace}(0, b)$.',
    'A direct argument uses memorylessness. Given that $X_1 > X_2$, the amount by which $X_1$ exceeds $X_2$ is the remaining wait after time $X_2$, which is again $\\mathrm{Exp}(\\lambda)$. By symmetry the same holds for $X_2 - X_1$ given $X_2 > X_1$, and each case has probability $1/2$. So the difference is an exponential with a random sign: half of the probability goes to each side, with an exponential tail on each side. That is the Laplace distribution.',
    'The converse is immediate from the density: $|Y - \\mu|$ has density $2 \\cdot \\frac{1}{2b} e^{-y/b} = \\frac1b e^{-y/b}$ for $y \\ge 0$, an exponential with mean $b$, so $|Y - \\mu|/b \\sim \\mathrm{Exp}(1)$.',
    'The variances add as they should: each exponential has variance $1/\\lambda^2$, and the Laplace variance is $2b^2 = 2/\\lambda^2$.',
  ],

  references: [
    { text: 'Wikipedia: Laplace distribution, related distributions.', url: 'https://en.wikipedia.org/wiki/Laplace_distribution#Related_distributions' },
    { text: 'Kotz, S., Kozubowski, T. J., & Podgórski, K. (2001). <i>The Laplace Distribution and Generalizations</i>, Chapter 2. Birkhäuser.', url: 'https://doi.org/10.1007/978-1-4612-0173-1' },
    { text: 'Johnson, N. L., Kotz, S., & Balakrishnan, N. (1995). <i>Continuous Univariate Distributions</i>, Vol. 2 (2nd ed.), Chapter 24. Wiley.' },
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
      { value: 'fwd', label: 'Difference of exponentials: X₁ − X₂' },
      { value: 'back', label: 'Distance from the center: |Y − μ|/b' },
    ], 'fwd', show, 'Which direction of the relationship to show');
    container.append(h('div', { style: 'margin-bottom:.6rem' }, seg.el), fwdBox, backBox);
    show('fwd');
  },
};

function forwardDemo(box, { demos, ui }) {
  demos.simulationDemo(box, null, {
    intro: 'Each simulated value is $X_1 - X_2$ for two fresh independent exponential numbers with rate $\\lambda$. The histogram is compared with the $\\mathrm{Laplace}(0, 1/\\lambda)$ density: a sharp peak at zero and an exponential tail on each side.',
    params: [{ key: 'lambda', sym: '\\lambda', name: 'rate', meaning: 'The common rate of the two exponential variables; the Laplace scale is $b = 1/\\lambda$.', min: 0.2, max: 5, default: 1, step: 0.05 }],
    sample: (rng, { lambda }) => rng.exponential(lambda) - rng.exponential(lambda),
    sampleName: 'values of X₁ − X₂',
    target: {
      name: ({ lambda }) => `Laplace(μ = 0, b = ${ui.fmt(1 / lambda, 3)}) density`,
      pdf: (x, { lambda }) => laplacePdf(x, 0, 1 / lambda),
      cdf: (x, { lambda }) => laplaceCdf(x, 0, 1 / lambda),
    },
    range: ({ lambda }) => [-6 / lambda, 6 / lambda],
    xLabel: 'x₁ − x₂',
    readout: ({ lambda }) => `The Laplace standard deviation is $\\sqrt2\\,b = \\sqrt2/\\lambda$ = <b>${ui.fmt(Math.SQRT2 / lambda, 4)}</b>, the square root of the summed variances $1/\\lambda^2 + 1/\\lambda^2$.`,
  });
}

function backwardDemo(box, { demos }) {
  demos.simulationDemo(box, null, {
    intro: 'Each simulated value is $|Y - \\mu|/b$ for a fresh Laplace number $Y$ with center $\\mu$ and scale $b$. Folding the two tails onto each other gives the standard exponential density $e^{-x}$, whatever $\\mu$ and $b$ are.',
    params: [
      { key: 'mu', sym: '\\mu', name: 'Laplace center', meaning: 'The location of the Laplace distribution.', min: -5, max: 5, default: 0, step: 0.1 },
      { key: 'b', sym: 'b', name: 'Laplace scale', meaning: 'The scale of the Laplace distribution: the mean distance from the center.', min: 0.2, max: 5, default: 1, step: 0.05 },
    ],
    sample: (rng, { mu, b }) => Math.abs(rng.laplace(mu, b) - mu) / b,
    sampleName: 'values of |Y − μ|/b',
    target: { name: () => 'Exponential(1) density', pdf: x => (x < 0 ? 0 : Math.exp(-x)), cdf: x => (x <= 0 ? 0 : -Math.expm1(-x)) },
    range: () => [0, 6.5],
    xLabel: '|y − μ|/b',
    readout: () => 'The standard exponential has mean 1 and standard deviation 1.',
  });
}
