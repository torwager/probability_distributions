// Exponential distribution with rate lambda. Follows the structure of the reference module dists/normal.js.

import { catalogParams } from '../catalog.js';

function pdf(x, { lambda }) {
  return x < 0 ? 0 : lambda * Math.exp(-lambda * x);
}
const cdf = (x, { lambda }) => (x <= 0 ? 0 : -Math.expm1(-lambda * x));
const sf = (x, { lambda }) => (x <= 0 ? 1 : Math.exp(-lambda * x));

export default {
  id: 'exponential',
  name: 'Exponential',
  kind: 'continuous',

  params: catalogParams('exponential', { lambda: { step: 0.05 } }),

  pdf,
  cdf,
  sf,
  quantile: (u, { lambda }) => -Math.log1p(-u) / lambda,
  sample: (rng, { lambda }) => rng.exponential(lambda),

  testParams: [{ lambda: 0.1 }, { lambda: 5 }, { lambda: 0.37 }],

  range: () => [0, Infinity],
  // from slightly left of 0 (so that the jump of the density at 0 is visible) to the 0.999 quantile
  support: ({ lambda }) => { const hi = -Math.log(0.001) / lambda; return [-0.04 * hi, hi]; },

  stats({ lambda }) {
    return {
      mean: 1 / lambda, variance: 1 / (lambda * lambda), sd: 1 / lambda, median: Math.LN2 / lambda, mode: 0,
      skewness: 2, exKurtosis: 6, entropy: 1 - Math.log(lambda),
    };
  },

  // Handles:
  //  - a horizontal arrow from 0 to the mean 1/lambda, drawn at the height of the density at the mean:
  //    drag its tip to change the mean waiting time (lambda = 1/x);
  //  - a vertical arrow along the jump at x = 0, from 0 up to the density at 0, which equals lambda:
  //    drag its tip up or down to set the rate directly.
  handles: [
    {
      type: 'hArrow', param: 'lambda', id: 'mean', label: '1/λ',
      ariaLabel: 'Mean waiting time 1/λ. Drag the tip left or right to change the rate λ, or use the arrow keys.',
      from: p => ({ x: 0, y: pdf(1 / p.lambda, p) }),
      to: p => ({ x: 1 / p.lambda, y: pdf(1 / p.lambda, p) }),
      set: pt => ({ lambda: 1 / Math.max(pt.x, 1e-6) }),
    },
    {
      // no text label: at half height it would collide with the label of the mean arrow; the knob sits at y = lambda
      // on the y axis, and the explorer text explains it
      type: 'vArrow', param: 'lambda', id: 'height', label: '',
      ariaLabel: 'Rate λ, the height of the density at 0. Drag up or down, or use the arrow keys.',
      // runs along the jump of the density at 0, from 0 up to the density there
      from: () => ({ x: 0, y: 0 }),
      to: p => ({ x: 0, y: p.lambda }),
      set: pt => ({ lambda: pt.y }),
    },
  ],

  explorer: {
    // start the area tool at twice the mean, away from the two arrows
    areaDefault: p => 2 / p.lambda,
    readouts: [
      { key: 'mean', label: 'Mean 1/λ' },
      { key: 'median', label: 'Median ln 2/λ' },
      { key: 'sd', label: 'Standard deviation 1/λ' },
      { label: 'P(X > mean) = 1/e', value: () => '0.3679' },
    ],
  },

  content: {
    summary: 'The exponential distribution describes the waiting time until an event that occurs at random at a constant rate $\\lambda$; the mean wait is $1/\\lambda$. It is the only memoryless continuous distribution and gives the times between events in a Poisson process.',
    description: [
      'The exponential distribution describes the waiting time until an event that happens at random at a constant average rate, such as the time until the next radioactive decay, the next phone call to a help line, or the next spike of a neuron that fires irregularly. It takes non-negative real values. Short waits are the most likely, and long waits become less likely at a steady proportional rate.',
      'It has one parameter, the rate $\\lambda$: the average number of events per unit of time. The mean waiting time is $1/\\lambda$, so a rate of 4 events per hour means an average wait of a quarter of an hour. Some software (SciPy, NumPy) uses the scale $\\theta = 1/\\lambda$ instead; this site uses the rate.',
      'The exponential is the only continuous distribution that is memoryless: having already waited some time does not change how much longer you can expect to wait. It is the continuous-time counterpart of the geometric distribution, the waiting time between events of a Poisson process, and the gamma distribution with shape 1.',
    ],
    explorerIntro: 'The left plot shows the density $f(x)$ and the right plot the cumulative distribution $F(x)$, the probability that the wait is at most $x$. The horizontal amber arrow runs from 0 to the mean waiting time $1/\\lambda$; drag its tip right for a longer average wait (a smaller rate). The vertical amber arrow at $x = 0$ runs from 0 up to the height of the density at zero, which equals $\\lambda$; drag its knob up or down to set the rate directly (the height of the knob, read on the vertical axis, is $\\lambda$). The density is 0 for negative $x$, so it jumps at 0.',

    pdfTex: 'f(x \\mid \\lambda) = \\lambda\\, e^{-\\lambda x} \\quad \\text{for } x \\ge 0 \\quad (\\text{and } 0 \\text{ for } x < 0)',
    glossary: [
      { sym: 'x', meaning: 'A possible waiting time. It cannot be negative.' },
      { sym: 'f(x \\mid \\lambda)', meaning: 'The probability density at $x$ given the rate. Probabilities are areas under this curve.' },
      { sym: '\\lambda', meaning: 'The rate: the average number of events per unit of time. It must be positive. The density at $x = 0$ equals $\\lambda$.' },
      { sym: 'e', meaning: 'The base of natural logarithms, $e \\approx 2.718$.' },
      { sym: 'e^{-\\lambda x}', meaning: 'The probability that no event has happened by time $x$. The density is this survival probability times the rate.' },
    ],

    cdfTex: 'F(x \\mid \\lambda) = P(X \\le x) = 1 - e^{-\\lambda x} \\quad \\text{for } x \\ge 0',
    cdfGlossary: [
      { sym: 'F(x \\mid \\lambda)', meaning: 'The cumulative distribution function: the probability that the wait is at most $x$.' },
      { sym: 'P(X \\le x)', meaning: 'The probability that the random waiting time $X$ is at most $x$.' },
      { sym: '\\lambda', meaning: 'The rate of events per unit of time.' },
      { sym: 'e^{-\\lambda x}', meaning: 'The survival function $S(x) = P(X > x)$: the probability that the wait is longer than $x$. Here $e \\approx 2.718$.' },
    ],
    extraFormulas: [
      {
        title: 'Survival and hazard functions',
        intro: 'In survival analysis a waiting time is described by the probability of surviving past $x$ and by the hazard, the instantaneous rate of the event among those still waiting. For the exponential the hazard is constant:',
        tex: 'S(x) = P(X > x) = e^{-\\lambda x}, \\qquad h(x) = \\frac{f(x)}{S(x)} = \\lambda',
        glossary: [
          { sym: 'S(x)', meaning: 'The survival function: the probability that the event has not happened by time $x$.' },
          { sym: 'h(x)', meaning: 'The hazard function: the rate of the event at time $x$ among those who have not yet had it.' },
        ],
      },
      {
        title: 'Memorylessness',
        intro: 'Having waited $s$ units of time does not change the distribution of the remaining wait:',
        tex: 'P(X > s + t \\mid X > s) = \\frac{e^{-\\lambda (s+t)}}{e^{-\\lambda s}} = e^{-\\lambda t} = P(X > t)',
        glossary: [{ sym: 's,\\ t', meaning: 'Two non-negative lengths of time: the time already waited and the additional time.' }, { sym: 'P(A \\mid B)', meaning: 'The probability of $A$ given that $B$ has happened.' }],
      },
      {
        title: 'Likelihood and maximum-likelihood estimate',
        intro: 'For independent waiting times $x_1, \\dots, x_n$ the likelihood depends on the data only through their number and their sum, and it is largest at one over the sample mean:',
        tex: 'L(\\lambda) = \\lambda^{n} e^{-\\lambda \\sum_i x_i}, \\qquad \\hat\\lambda = \\frac{n}{\\sum_i x_i} = \\frac{1}{\\bar x}',
        glossary: [
          { sym: 'L(\\lambda)', meaning: 'The likelihood: the joint density of the data, seen as a function of $\\lambda$.' },
          { sym: '\\hat\\lambda', meaning: 'The maximum-likelihood estimate of the rate.' },
          { sym: '\\bar x', meaning: 'The sample mean of the waiting times.' },
        ],
      },
    ],

    properties: [
      { name: 'Support', tex: 'x \\in [0, \\infty)', explain: 'Any non-negative waiting time is possible.' },
      { name: 'Mean', tex: '\\mathrm{E}[X] = \\frac{1}{\\lambda}', value: p => 1 / p.lambda, explain: 'The average waiting time is one over the rate.' },
      { name: 'Median', tex: '\\frac{\\ln 2}{\\lambda} \\approx \\frac{0.6931}{\\lambda}', value: p => Math.LN2 / p.lambda, explain: 'Half of all waits are shorter than this. It is below the mean because a few very long waits pull the mean up. In radioactive decay it is the half-life.' },
      { name: 'Mode', tex: '0', value: () => 0, explain: 'The density is highest at 0: very short waits are the most likely, even though the average wait is $1/\\lambda$.' },
      { name: 'Variance', tex: '\\mathrm{Var}(X) = \\frac{1}{\\lambda^2}', value: p => 1 / (p.lambda * p.lambda), explain: 'The square of the mean.' },
      { name: 'Standard deviation', tex: '\\frac{1}{\\lambda}', value: p => 1 / p.lambda, explain: 'Equal to the mean, so the coefficient of variation (standard deviation divided by mean) is exactly 1. Data with a coefficient of variation well below 1 are not exponential.' },
      { name: 'Skewness', tex: '2', value: () => 2, explain: 'Strongly skewed to the right, with a long tail of long waits. It does not depend on $\\lambda$, which only changes the time scale.' },
      { name: 'Excess kurtosis', tex: '6', value: () => 6, explain: 'Heavier tails than the normal distribution, whose excess kurtosis is 0.' },
      { name: 'Entropy', tex: '1 - \\ln \\lambda', value: p => 1 - Math.log(p.lambda), explain: 'Differential entropy in nats. Among all distributions on $[0, \\infty)$ with a given mean, the exponential has the largest entropy, so it is the least informative choice when only the mean of a positive quantity is known.' },
      { name: 'Moment-generating function', tex: 'M(t) = \\frac{\\lambda}{\\lambda - t}, \\quad t < \\lambda', explain: '$\\mathrm{E}[e^{tX}]$, defined for $t < \\lambda$. The $k$-th moment is $\\mathrm{E}[X^k] = k!/\\lambda^k$. Multiplying moment-generating functions shows that a sum of $n$ independent exponentials with the same rate is $\\mathrm{Gamma}(n, \\lambda)$.' },
      { name: 'Characteristic function', tex: '\\varphi(t) = \\frac{\\lambda}{\\lambda - it}', explain: '$\\mathrm{E}[e^{itX}]$, where $i = \\sqrt{-1}$.' },
      { name: 'Hazard function', tex: 'h(x) = \\lambda', value: p => p.lambda, explain: 'The rate of the event among those still waiting is the same at every time: the process does not age or wear out. The Weibull distribution generalizes this to increasing or decreasing hazards.' },
      { name: 'Memorylessness', tex: 'P(X > s + t \\mid X > s) = P(X > t)', explain: 'The remaining wait after waiting $s$ has the same distribution as the original wait. The exponential is the only continuous distribution with this property.' },
      { name: 'Quantile function', tex: 'Q(u) = -\\frac{\\ln(1 - u)}{\\lambda}', value: p => fmtN(-Math.log(0.05) / p.lambda) + ' (u = 0.95)', explain: 'The value below which a fraction $u$ of waits fall. Plugging a uniform random number in for $u$ produces an exponential random number (inverse-CDF sampling).' },
      { name: 'Minimum of exponentials', tex: '\\min(X_1, \\dots, X_m) \\sim \\mathrm{Exp}(\\lambda_1 + \\dots + \\lambda_m)', explain: 'If independent events compete, each with its own rate $\\lambda_j$, the time until the first of them is exponential with the summed rate, and event $j$ comes first with probability $\\lambda_j / \\sum_i \\lambda_i$.' },
    ],

    limits: [
      { text: '<b>Geometric to exponential.</b> Divide time into steps of length $1/n$ with event probability $\\lambda/n$ per step. The number of empty steps before the first event, divided by $n$, approaches $\\mathrm{Exp}(\\lambda)$ as $n \\to \\infty$. Exactly, $\\lfloor X \\rfloor \\sim \\mathrm{Geom}(1 - e^{-\\lambda})$ for $X \\sim \\mathrm{Exp}(\\lambda)$.', relation: 'geometric--exponential', to: 'geometric' },
      { text: '<b>Gamma with shape 1.</b> $\\mathrm{Gamma}(1, \\lambda) = \\mathrm{Exp}(\\lambda)$; a sum of $n$ independent exponentials with rate $\\lambda$ is $\\mathrm{Gamma}(n, \\lambda)$ (the Erlang distribution).', relation: 'exponential--gamma', to: 'gamma' },
      { text: '<b>Weibull with shape 1.</b> $\\mathrm{Weibull}(k = 1, \\text{scale } 1/\\lambda) = \\mathrm{Exp}(\\lambda)$. Note that the Weibull $\\lambda$ is a scale, not a rate.', relation: 'exponential--weibull', to: 'weibull' },
      { text: '<b>Chi-squared with 2 degrees of freedom.</b> $\\chi^2_2 = \\mathrm{Exp}(1/2)$, an exponential with mean 2. For example, the squared distance from the origin of a point whose two coordinates are independent standard normal numbers is exponential with mean 2.', to: 'chi-squared' },
      { text: '<b>Ex-Gaussian without the normal part.</b> As the normal standard deviation $\\sigma \\to 0$, the ex-Gaussian distribution becomes an exponential shifted to start at $\\mu$.', relation: 'exponential--ex-gaussian', to: 'ex-gaussian' },
    ],

    uses: {
      frequentist: [
        '<b>Estimating a rate.</b> The maximum-likelihood estimate of the rate is $\\hat\\lambda = 1/\\bar x$. Because $2\\lambda \\sum_i X_i \\sim \\chi^2_{2n}$, exact confidence intervals for $\\lambda$ and for the mean $1/\\lambda$ come from chi-squared quantiles.',
        '<b>Survival and reliability analysis.</b> The exponential is the simplest parametric survival model (constant hazard). Exponential regression models the log hazard as a linear function of covariates; it is a proportional-hazards model with a constant baseline hazard, and it extends to censored data (the likelihood uses $f$ for observed times and $S$ for censored ones).',
        '<b>Testing a constant hazard.</b> Likelihood-ratio tests of the exponential against the Weibull or gamma ($k = 1$ or $\\alpha = 1$ against the alternative), and Q–Q plots of waiting times against exponential quantiles, check whether events really occur at a constant rate.',
        '<b>Poisson processes.</b> Inter-arrival times of a homogeneous Poisson process are independent exponentials, so tests about event rates can be based either on counts (Poisson) or on waiting times (exponential).',
      ],
      bayesian: [
        '<b>Conjugate gamma prior for the rate.</b> With prior $\\lambda \\sim \\mathrm{Gamma}(\\alpha, \\beta)$ (shape, rate) and $n$ observed waiting times, the posterior is $\\lambda \\mid x \\sim \\mathrm{Gamma}(\\alpha + n,\\ \\beta + \\sum_i x_i)$. The prior acts like $\\alpha$ earlier events observed over a total time $\\beta$.',
        '<b>Posterior predictive.</b> The next waiting time then has a Lomax (Pareto type II) distribution: $p(\\tilde x \\mid x) = \\dfrac{(\\alpha + n)(\\beta + \\sum_i x_i)^{\\alpha + n}}{(\\beta + \\sum_i x_i + \\tilde x)^{\\alpha + n + 1}}$, which has a heavier tail than any single exponential because the rate is uncertain.',
        '<b>Prior for a scale parameter.</b> The exponential is a common weakly informative prior for standard deviations and other positive scale parameters, for example $\\sigma \\sim \\mathrm{Exp}(1)$ in Stan and brms models. Penalized-complexity priors for the standard deviation of a random effect are exponential (Simpson et al., 2017).',
        '<b>Jeffreys prior.</b> The Jeffreys prior for the rate is $p(\\lambda) \\propto 1/\\lambda$, the limit of $\\mathrm{Gamma}(\\alpha, \\beta)$ as $\\alpha, \\beta \\to 0$.',
      ],
      modeling: [
        '<b>Event timing.</b> Radioactive decay (half-life $\\ln 2/\\lambda$), the time between customer arrivals or calls in queueing models (the M/M/1 queue), and the lifetime of components that fail at a constant rate.',
        '<b>Neural spike trains.</b> Under a Poisson model of neural firing, interspike intervals are exponential; a refractory period is often added by shifting the distribution or replacing it with a gamma.',
        '<b>Response-time models.</b> The ex-Gaussian model adds an exponential component to a normal one to capture the long right tail of response times; race models with exponential finishing times give simple closed-form choice probabilities.',
        '<b>Continuous-time Markov chains and stochastic simulation.</b> A system stays in each state for an exponential time. The Gillespie algorithm for chemical and ecological systems draws the time to the next reaction from an exponential with the total reaction rate, and chooses which reaction happens with probabilities proportional to the individual rates.',
        '<b>Random-number generation.</b> $-\\ln(U)/\\lambda$ with $U$ uniform gives exponential numbers, which are the building blocks for gamma, Laplace, Weibull, Gumbel and Pareto random numbers.',
      ],
    },

    references: [
      { text: 'Wikipedia: Exponential distribution.', url: 'https://en.wikipedia.org/wiki/Exponential_distribution' },
      { text: 'Casella, G., & Berger, R. L. (2002). <i>Statistical Inference</i> (2nd ed.), Section 3.3. Duxbury.' },
      { text: 'Gelman, A., Carlin, J. B., Stern, H. S., Dunson, D. B., Vehtari, A., & Rubin, D. B. (2013). <i>Bayesian Data Analysis</i> (3rd ed.), Section 2.7 and Appendix A. CRC Press.', url: 'http://www.stat.columbia.edu/~gelman/book/' },
      { text: 'Johnson, N. L., Kotz, S., & Balakrishnan, N. (1994). <i>Continuous Univariate Distributions</i>, Vol. 1 (2nd ed.), Chapter 19. Wiley.' },
      { text: 'Leemis, L. M., & McQueston, J. T. (2008). Univariate distribution relationships. <i>The American Statistician</i>, 62(1), 45–53.', url: 'https://doi.org/10.1198/000313008X270448' },
      { text: 'Simpson, D., Rue, H., Riebler, A., Martins, T. G., & Sørbye, S. H. (2017). Penalising model component complexity: A principled, practical approach to constructing priors. <i>Statistical Science</i>, 32(1), 1–28.', url: 'https://doi.org/10.1214/16-STS576' },
      { text: 'Gillespie, D. T. (1977). Exact stochastic simulation of coupled chemical reactions. <i>The Journal of Physical Chemistry</i>, 81(25), 2340–2361.', url: 'https://doi.org/10.1021/j100540a008' },
    ],
  },
};

function fmtN(v) { return String(Number(v.toPrecision(4))).replace(/^-/, '−'); }
