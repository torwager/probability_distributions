// Exponential -> Gamma: a sum of n independent exponential waiting times is Gamma(n, rate λ).
// REFERENCE module for simulation demos: it uses ctx.demos.simulationDemo (see ARCHITECTURE.md).

import { getRelation } from '../catalog.js';
import { gammaP, lgamma } from '../core/math.js';

const REL = getRelation('exponential--gamma');

const gammaPdf = (x, a, b) => (x <= 0 ? 0 : Math.exp(a * Math.log(b) + (a - 1) * Math.log(x) - b * x - lgamma(a)));

export default {
  id: 'exponential--gamma',
  from: 'exponential',
  to: 'gamma',
  title: 'The sum of independent exponential waiting times is gamma distributed',

  summary: 'The sum of $n$ independent exponential waiting times with the same rate $\\lambda$, such as the total wait for $n$ events in a Poisson process, has a gamma distribution with shape $n$ and rate $\\lambda$. With shape 1 the gamma is the exponential itself.',

  plain: [
    'Suppose events happen at random at a constant average rate $\\lambda$ per unit time (a Poisson process). The waiting time until the next event is exponential with rate $\\lambda$, and successive waiting times are independent. The total time until the $n$-th event is the sum of $n$ such waiting times, and it has a gamma distribution with shape $n$ and rate $\\lambda$.',
    'With a whole-number shape, the gamma distribution is also called the Erlang distribution. The gamma family allows any positive shape, and shape 1 gives back the exponential itself.',
  ],

  statementTex: REL.statement,
  glossary: [
    { sym: 'X_1, \\dots, X_n', meaning: 'The $n$ separate waiting times, one for each event.' },
    { sym: '\\overset{iid}{\\sim}', meaning: 'Independent and identically distributed: every $X_i$ has the same distribution and none affects the others.' },
    { sym: '\\mathrm{Exp}(\\lambda)', meaning: 'The exponential distribution with rate $\\lambda$ (mean waiting time $1/\\lambda$).' },
    { sym: '\\lambda', meaning: 'The rate: the average number of events per unit time.' },
    { sym: '\\sum_{i=1}^n X_i', meaning: 'The total waiting time $X_1 + X_2 + \\dots + X_n$.' },
    { sym: '\\mathrm{Gamma}(\\alpha, \\beta)', meaning: 'The gamma distribution with shape $\\alpha$ and rate $\\beta$ (mean $\\alpha/\\beta$).' },
    { sym: '\\text{Erlang}', meaning: 'The name for the gamma distribution when the shape is a whole number.' },
  ],

  why: [
    'The quickest argument uses moment generating functions. The exponential with rate $\\lambda$ has $M(t) = \\lambda/(\\lambda - t)$ for $t < \\lambda$. The moment generating function of a sum of independent variables is the product of their moment generating functions, so the sum of $n$ of them has',
    { tex: 'M_{X_1 + \\dots + X_n}(t) = \\left(\\frac{\\lambda}{\\lambda - t}\\right)^{n},' },
    'which is the moment generating function of $\\mathrm{Gamma}(n, \\lambda)$. A distribution is determined by its moment generating function, so the sum is gamma distributed.',
    'A more direct argument counts events. The total waiting time $S_n$ is larger than $t$ exactly when fewer than $n$ events have happened by time $t$, and that count is $\\mathrm{Poisson}(\\lambda t)$. So $P(S_n > t) = \\sum_{k=0}^{n-1} e^{-\\lambda t} (\\lambda t)^k / k!$, which is the upper tail of the $\\mathrm{Gamma}(n, \\lambda)$ distribution.',
    'The mean and variance add up as expected: each waiting time has mean $1/\\lambda$ and variance $1/\\lambda^2$, so the sum has mean $n/\\lambda$ and variance $n/\\lambda^2$, the gamma mean $\\alpha/\\beta$ and variance $\\alpha/\\beta^2$ with $\\alpha = n$ and $\\beta = \\lambda$.',
  ],

  references: [
    { text: 'Wikipedia: Erlang distribution.', url: 'https://en.wikipedia.org/wiki/Erlang_distribution' },
    { text: 'Wikipedia: Gamma distribution, related distributions.', url: 'https://en.wikipedia.org/wiki/Gamma_distribution#Related_distributions' },
    { text: 'Casella, G., & Berger, R. L. (2002). <i>Statistical Inference</i> (2nd ed.), Example 4.6.8. Duxbury.' },
    { text: 'Leemis, L. M., & McQueston, J. T. (2008). Univariate distribution relationships. <i>The American Statistician</i>, 62(1), 45–53.', url: 'https://doi.org/10.1198/000313008X270448' },
  ],

  demo(container, { demos }) {
    demos.simulationDemo(container, null, {
      intro: 'Each simulated value is the sum of $n$ independent exponential waiting times with rate $\\lambda$. The histogram of many such sums is compared with the $\\mathrm{Gamma}(n, \\lambda)$ density. Change $n$ and $\\lambda$, or draw new samples.',
      params: [
        { key: 'n', sym: 'n', name: 'number of waiting times', meaning: 'How many independent exponential waiting times are added.', min: 1, max: 30, default: 3, integer: true },
        { key: 'lambda', sym: '\\lambda', name: 'rate', meaning: 'Average number of events per unit time; each waiting time has mean $1/\\lambda$.', min: 0.2, max: 5, default: 1 },
      ],
      sample: (rng, { n, lambda }) => { let s = 0; for (let i = 0; i < n; i++) s += rng.exponential(lambda); return s; },
      sampleName: 'sums of n exponentials',
      target: {
        name: ({ n, lambda }) => `Gamma(α = ${n}, β = ${lambda}) density`,
        pdf: (x, { n, lambda }) => gammaPdf(x, n, lambda),
        cdf: (x, { n, lambda }) => (x <= 0 ? 0 : gammaP(n, lambda * x)),
      },
      range: ({ n, lambda }) => [0, (n + 5 * Math.sqrt(n) + 2) / lambda],
      xLabel: 'total waiting time',
      readout: ({ n, lambda }) => `Gamma mean $n/\\lambda$ = <b>${(n / lambda).toPrecision(4).replace(/\.?0+$/, '')}</b>, standard deviation $\\sqrt n/\\lambda$ = <b>${(Math.sqrt(n) / lambda).toPrecision(4).replace(/\.?0+$/, '')}</b>.`,
    });
  },
};
