// Weibull distribution with shape k and SCALE lambda (not a rate).
// Follows the structure of the reference module dists/normal.js.

import { catalogParams } from '../catalog.js';
import { gamma, EULER_GAMMA } from '../core/math.js';

function pdf(x, { k, lambda }) {
  if (x < 0) return 0;
  if (x === 0) return k < 1 ? Infinity : k === 1 ? 1 / lambda : 0;
  const z = x / lambda;
  return (k / lambda) * Math.exp((k - 1) * Math.log(z) - Math.pow(z, k));
}
const cdf = (x, { k, lambda }) => (x <= 0 ? 0 : -Math.expm1(-Math.pow(x / lambda, k)));
const sf = (x, { k, lambda }) => (x <= 0 ? 1 : Math.exp(-Math.pow(x / lambda, k)));
const quantile = (u, { k, lambda }) => lambda * Math.pow(-Math.log1p(-u), 1 / k);

/** Plotting window. Shapes below 1 have a very long tail: stop the window at a lower percentile (99th for k
 *  near 1, 80th for k = 0.1) and at most 6 lambda, so that the shape near 0 and the lambda handle stay visible. */
function windowOf(p) {
  const hi = p.k >= 1 ? quantile(0.9995, p) : Math.min(quantile(0.8 + 0.19 * Math.max(0, (p.k - 0.1) / 0.9), p), 6 * p.lambda);
  const lo = quantile(0.0001, p);
  return lo > 0.3 * hi ? [lo - 0.08 * (hi - lo), hi] : [-0.03 * hi, hi];
}

/** Gamma(1 + i/k), the raw moments of (X/lambda). */
const G = (i, k) => gamma(1 + i / k);

function stats({ k, lambda }) {
  const g1 = G(1, k), g2 = G(2, k), g3 = G(3, k), g4 = G(4, k);
  const v1 = g2 - g1 * g1;
  return {
    mean: lambda * g1,
    variance: lambda * lambda * v1,
    sd: lambda * Math.sqrt(v1),
    median: lambda * Math.pow(Math.LN2, 1 / k),
    mode: k > 1 ? lambda * Math.pow((k - 1) / k, 1 / k) : 0,
    skewness: (g3 - 3 * g1 * g2 + 2 * g1 ** 3) / v1 ** 1.5,
    exKurtosis: (g4 - 4 * g1 * g3 + 6 * g1 * g1 * g2 - 3 * g1 ** 4) / (v1 * v1) - 3,
    entropy: EULER_GAMMA * (1 - 1 / k) + Math.log(lambda / k) + 1,
  };
}

export default {
  id: 'weibull',
  name: 'Weibull',
  kind: 'continuous',

  params: catalogParams('weibull', { k: { step: 0.05, dragStep: 0.01 }, lambda: { step: 0.05 } }),

  pdf,
  cdf,
  sf,
  quantile,
  sample: (rng, { k, lambda }) => rng.weibull(k, lambda),

  testParams: [{ k: 0.5, lambda: 2 }, { k: 1, lambda: 0.5 }, { k: 2, lambda: 1 }, { k: 3.6, lambda: 1 }, { k: 5, lambda: 4 }, { k: 0.8, lambda: 0.3 }],

  range: () => [0, Infinity],
  support: windowOf,

  stats,

  // Handles:
  //  - a dashed line at the scale lambda (the 63.2nd percentile): drag it to stretch or shrink the
  //    distribution (sets lambda);
  //  - an arrow from the axis up to the density at x = lambda. That height is f(lambda) = k / (e lambda), so it
  //    is proportional to the shape: drag the tip up or down to change k (k = e lambda y). It is defined for
  //    every k, including k < 1 where the density is infinite at 0.
  handles: [
    {
      type: 'vline', param: 'lambda', id: 'scale', label: 'λ',
      ariaLabel: 'Scale λ, the 63rd percentile. Drag left or right to shrink or stretch the distribution, or use the arrow keys.',
    },
    {
      type: 'vArrow', param: 'k', id: 'shape', label: 'k',
      ariaLabel: 'Shape k, shown as the height of the density at x = λ. Drag up or down, or use the arrow keys.',
      from: p => ({ x: p.lambda, y: 0 }),
      to: p => ({ x: p.lambda, y: pdf(p.lambda, p) }),
      set: (pt, p) => ({ k: Math.E * p.lambda * Math.max(pt.y, 0) }),
    },
  ],

  explorer: {
    readouts: [
      { key: 'mean', label: 'Mean λΓ(1 + 1/k)' },
      { key: 'sd', label: 'Standard deviation' },
      { key: 'median', label: 'Median λ(ln 2)^(1/k)' },
      { key: 'mode', label: 'Mode' },
      { label: 'Hazard over time', value: p => (Math.abs(p.k - 1) < 1e-9 ? 'constant' : p.k < 1 ? 'decreasing' : 'increasing') },
    ],
    // with a shape below 1 the density is infinite at 0; cap the y axis so the rest of the curve stays visible
    yMax: p => (p.k < 1 ? Math.max(1.6 * pdf(0.06 * windowOf(p)[1], p), 1.15 * pdf(p.lambda, p)) : undefined),
  },

  content: {
    summary: 'The Weibull distribution describes lifetimes, with shape $k$ and scale $\\lambda$. The shape sets whether the failure rate falls over time ($k < 1$), stays constant ($k = 1$, the exponential) or rises ($k > 1$), making it a standard model in reliability.',
    description: [
      'The Weibull distribution describes lifetimes and other positive waiting times: how long a machine part lasts before it fails, how long a patient survives after treatment, or how long until a light bulb burns out. Its defining feature is its hazard, the chance of failing in the next instant among the items still working. For a Weibull lifetime the hazard is a power of time, so it can fall over time (early failures), stay constant (purely random failures) or rise over time (wear-out).',
      'It takes values $x \\ge 0$ and has two parameters. The shape $k$ sets how the hazard changes: below 1 it falls, at 1 it is constant and the Weibull is the exponential distribution, above 1 it rises. The shape also sets the form of the curve: for $k < 1$ the density shoots up at 0, for $k = 1$ it is highest at 0 and decays, and for $k > 1$ it is a hump that becomes narrower and more symmetric as $k$ grows. The scale $\\lambda$ stretches the distribution: about 63.2% of values lie below $\\lambda$, whatever the shape.',
      'Note the symbol clash: on this site $\\lambda$ is a <b>scale</b> for the Weibull (in the same units as $x$) but a <b>rate</b> for the exponential and a mean for the Poisson. So the Weibull with $k = 1$ and scale $\\lambda$ is the exponential with rate $1/\\lambda$. Some books write the shape as $\\beta$ or $c$ and the scale as $\\eta$, $\\alpha$ or $\\theta$.',
    ],
    explorerIntro: 'The left plot shows the density $f(x)$ and the right plot the cumulative distribution $F(x)$. Drag the dashed amber line (by its knob at the top) to move the scale $\\lambda$, the point below which 63.2% of the values lie; the whole curve stretches or shrinks with it. Drag the tip of the amber arrow up or down to change the shape $k$. The arrow stands at $x = \\lambda$ and reaches up to the density there, which equals $k/(e\\lambda)$, so a taller arrow means a larger shape. Try $k = 1$ (the exponential), $k = 2$ (the Rayleigh distribution) and $k$ near 3.6, where the curve looks almost normal. For $k < 1$ the density is infinite at 0 and the tail is very long, so the plot cuts off the top of the spike and stops at $6\\lambda$ or earlier.',

    pdfTex: 'f(x \\mid k, \\lambda) = \\frac{k}{\\lambda}\\left(\\frac{x}{\\lambda}\\right)^{k-1} e^{-(x/\\lambda)^{k}} \\quad \\text{for } x \\ge 0',
    glossary: [
      { sym: 'x', meaning: 'A possible value of the random variable $X$, such as a lifetime. It is zero or positive.' },
      { sym: 'f(x \\mid k, \\lambda)', meaning: 'The probability density at $x$ given the shape and scale.' },
      { sym: 'k', meaning: 'The shape, a positive number. It controls whether the hazard falls ($k < 1$), stays constant ($k = 1$) or rises ($k > 1$) over time.' },
      { sym: '\\lambda', meaning: 'The scale, a positive number in the same units as $x$. Doubling $\\lambda$ doubles every quantile. It is not a rate.' },
      { sym: 'x/\\lambda', meaning: 'The value measured in units of the scale.' },
      { sym: '\\left(\\dfrac{x}{\\lambda}\\right)^{k-1}', meaning: 'The power term that sets the behavior near 0: it is infinite at 0 when $k < 1$, equal to 1 when $k = 1$ and starts at 0 when $k > 1$.' },
      { sym: 'e^{-(x/\\lambda)^{k}}', meaning: 'The survival function $P(X > x)$. It decays faster than exponentially when $k > 1$ and more slowly when $k < 1$. Here $e \\approx 2.718$ is the base of natural logarithms.' },
    ],

    cdfTex: 'F(x \\mid k, \\lambda) = P(X \\le x) = 1 - e^{-(x/\\lambda)^{k}} \\quad \\text{for } x \\ge 0',
    cdfGlossary: [
      { sym: 'F(x \\mid k, \\lambda)', meaning: 'The cumulative distribution function: the probability that $X$ is at most $x$. It is 0 for $x < 0$.' },
      { sym: 'P(X \\le x)', meaning: 'The probability that the random variable $X$ takes a value at most $x$.' },
      { sym: 'e^{-(x/\\lambda)^{k}}', meaning: 'The probability of surviving past $x$. At $x = \\lambda$ it equals $e^{-1} \\approx 0.3679$ for every $k$, which is why $F(\\lambda) \\approx 0.6321$.' },
      { sym: 'k,\\ \\lambda', meaning: 'The shape and the scale.' },
    ],
    extraFormulas: [
      {
        title: 'Hazard function',
        intro: 'The hazard is the density divided by the probability of surviving so far. For the Weibull it is a power of time:',
        tex: 'h(x) = \\frac{f(x)}{1 - F(x)} = \\frac{k}{\\lambda}\\left(\\frac{x}{\\lambda}\\right)^{k-1}, \\qquad H(x) = \\int_0^x h(t)\\,dt = \\left(\\frac{x}{\\lambda}\\right)^{k}',
        glossary: [
          { sym: 'h(x)', meaning: 'The hazard: the rate of failure at time $x$ among the items still working at $x$.' },
          { sym: 'H(x)', meaning: 'The cumulative hazard, the area under the hazard up to $x$. The survival function is $e^{-H(x)}$.' },
          { sym: 't', meaning: 'A variable of integration running from 0 to $x$.' },
        ],
      },
      {
        title: 'Quantile function and the Weibull plot',
        intro: 'Solving $F(x) = u$ gives the quantile function. Taking logarithms twice turns the CDF into a straight line, which is the basis of the Weibull probability plot used in reliability engineering:',
        tex: 'Q(u) = \\lambda\\,\\big(-\\ln(1-u)\\big)^{1/k}, \\qquad \\ln\\!\\big(-\\ln(1 - F(x))\\big) = k \\ln x - k \\ln \\lambda',
        glossary: [
          { sym: 'Q(u)', meaning: 'The value below which a fraction $u$ of the distribution lies.' },
          { sym: 'u', meaning: 'A probability between 0 and 1.' },
          { sym: '\\ln', meaning: 'The natural logarithm.' },
          { sym: 'k \\ln x - k\\ln\\lambda', meaning: 'A straight line in $\\ln x$ with slope $k$: plotting $\\ln(-\\ln(1 - \\hat F))$ against $\\ln x$ for data gives a line whose slope estimates the shape.' },
        ],
      },
    ],

    properties: [
      { name: 'Support', tex: 'x \\in [0, \\infty)', explain: 'Zero or positive values. The density at 0 is infinite for $k < 1$, equal to $1/\\lambda$ for $k = 1$ and 0 for $k > 1$.' },
      { name: 'Mean', tex: '\\mathrm{E}[X] = \\lambda\\,\\Gamma\\!\\left(1 + \\tfrac1k\\right)', value: p => stats(p).mean, explain: 'Here $\\Gamma$ is the gamma function, which extends the factorial ($\\Gamma(n) = (n-1)!$). For $k = 1$ the mean is $\\lambda$; for large $k$ it approaches $\\lambda$ from below; for small $k$ it is much larger than $\\lambda$ because of the long tail.' },
      { name: 'Median', tex: '\\lambda\\,(\\ln 2)^{1/k}', value: p => stats(p).median, explain: 'Found by solving $F(x) = 1/2$. Because $\\ln 2 \\approx 0.6931 < 1$, the median is below $\\lambda$ for every shape.' },
      { name: 'Mode', tex: '\\lambda\\left(\\frac{k-1}{k}\\right)^{1/k}', value: p => stats(p).mode, explain: 'The peak of the density, for $k > 1$. For $k \\le 1$ the mode is 0: the density is highest (or infinite) there.' },
      { name: 'Variance', tex: '\\mathrm{Var}(X) = \\lambda^2\\left[\\Gamma\\!\\left(1 + \\tfrac2k\\right) - \\Gamma\\!\\left(1 + \\tfrac1k\\right)^2\\right]', value: p => stats(p).variance, explain: 'It grows with the square of the scale. The coefficient of variation (standard deviation divided by the mean) depends on $k$ only: it is 1 for $k = 1$ and shrinks as $k$ grows.' },
      { name: 'Standard deviation', tex: '\\lambda\\sqrt{\\Gamma\\!\\left(1 + \\tfrac2k\\right) - \\Gamma\\!\\left(1 + \\tfrac1k\\right)^2}', value: p => stats(p).sd, explain: 'The square root of the variance, in the same units as $x$.' },
      { name: 'Skewness', tex: '\\frac{\\Gamma_3 - 3\\Gamma_1\\Gamma_2 + 2\\Gamma_1^3}{(\\Gamma_2 - \\Gamma_1^2)^{3/2}}, \\quad \\Gamma_i = \\Gamma\\!\\left(1 + \\tfrac{i}{k}\\right)', value: p => stats(p).skewness, explain: 'Here $\\Gamma_i$ is shorthand for $\\Gamma(1 + i/k)$. The skewness depends on $k$ only. It is large and positive for small $k$, equals 2 at $k = 1$, crosses 0 near $k \\approx 3.602$ and becomes slightly negative for larger shapes.' },
      { name: 'Excess kurtosis', tex: '\\frac{\\Gamma_4 - 4\\Gamma_1\\Gamma_3 + 6\\Gamma_1^2\\Gamma_2 - 3\\Gamma_1^4}{(\\Gamma_2 - \\Gamma_1^2)^2} - 3', value: p => stats(p).exKurtosis, explain: 'With $\\Gamma_i = \\Gamma(1 + i/k)$ as above. It equals 6 at $k = 1$ (the exponential value), is very large for small $k$, and is slightly negative (about $-0.28$) near $k = 3.6$.' },
      { name: 'Entropy', tex: '\\gamma\\left(1 - \\tfrac1k\\right) + \\ln\\frac{\\lambda}{k} + 1', value: p => stats(p).entropy, explain: 'Differential entropy in nats. Here $\\gamma \\approx 0.5772$ is the Euler–Mascheroni constant (not a parameter).' },
      { name: 'Moment-generating function', tex: 'M(t) = \\sum_{n=0}^{\\infty} \\frac{(\\lambda t)^n}{n!}\\,\\Gamma\\!\\left(1 + \\tfrac{n}{k}\\right)', explain: '$\\mathrm{E}[e^{tX}]$, written as a power series in $t$ because there is no closed form. It converges for every $t$ when $k > 1$ and for $t < 1/\\lambda$ when $k = 1$; for $k < 1$ the tail is too heavy and $M(t)$ is infinite for every $t > 0$.' },
      { name: 'Characteristic function', tex: '\\varphi(t) = \\sum_{n=0}^{\\infty} \\frac{(i\\lambda t)^n}{n!}\\,\\Gamma\\!\\left(1 + \\tfrac{n}{k}\\right) \\ \\ (k > 1)', explain: '$\\mathrm{E}[e^{itX}]$, where $i = \\sqrt{-1}$. It exists for every $k$, but it has no closed form: for $k > 1$ it is the series shown, for $k = 1$ it is the exponential characteristic function $1/(1 - i\\lambda t)$, and for $k < 1$ it is computed by numerical integration.' },
      { name: 'Raw moments', tex: '\\mathrm{E}[X^n] = \\lambda^n\\,\\Gamma\\!\\left(1 + \\tfrac{n}{k}\\right)', explain: 'All moments are finite for every $k > 0$; the mean, variance, skewness and kurtosis above are built from these.' },
      { name: 'Hazard function', tex: 'h(x) = \\frac{k}{\\lambda}\\left(\\frac{x}{\\lambda}\\right)^{k-1}', value: p => (Math.abs(p.k - 1) < 1e-9 ? 'constant' : p.k < 1 ? 'decreasing' : 'increasing'), explain: 'The failure rate among survivors. Decreasing for $k < 1$ (infant mortality, early failures), constant $1/\\lambda$ for $k = 1$ (random failures), increasing for $k > 1$ (wear-out). For $k = 2$ it grows linearly.' },
      { name: '63.2% rule', tex: 'F(\\lambda) = 1 - e^{-1} \\approx 0.6321', value: p => cdf(p.lambda, p), explain: 'Whatever the shape, 63.2% of values fall below the scale $\\lambda$. This is why $\\lambda$ is also called the characteristic life.' },
      { name: 'Quantiles', tex: 'Q(u) = \\lambda\\,\\big(-\\ln(1-u)\\big)^{1/k}', value: p => `${fmtN(quantile(0.1, p))} (u = 0.1)`, explain: 'Closed form, so random numbers are easy to generate: $\\lambda(-\\ln U)^{1/k}$ with $U$ uniform on (0, 1). The value column shows the 10th percentile, often reported in engineering as the B10 life.' },
    ],

    limits: [
      { text: '<b>Exponential as a special case.</b> With $k = 1$, $\\mathrm{Weibull}(1, \\lambda) = \\mathrm{Exp}(\\text{rate } 1/\\lambda)$. More generally, if $E \\sim \\mathrm{Exp}(1)$ then $\\lambda E^{1/k} \\sim \\mathrm{Weibull}(k, \\lambda)$, and $(X/\\lambda)^k \\sim \\mathrm{Exp}(1)$ for a Weibull variable $X$.', relation: 'exponential--weibull', to: 'exponential' },
      { text: '<b>Rayleigh distribution.</b> With $k = 2$ the Weibull is the Rayleigh distribution with parameter $\\sigma = \\lambda/\\sqrt2$: the distance from the origin of a point whose two coordinates are independent $\\mathcal N(0, \\sigma^2)$. Its hazard rises in a straight line.', to: 'normal' },
      { text: '<b>Nearly normal shape.</b> Near $k \\approx 3.602$ the skewness is 0 and the Weibull density looks very much like a normal curve, although it is still bounded below by 0.' },
      { text: '<b>Large shape.</b> As $k \\to \\infty$ the distribution concentrates at the single value $\\lambda$, because $(x/\\lambda)^k$ jumps from 0 to $\\infty$ as $x$ passes $\\lambda$.' },
      { text: '<b>Logarithm is Gumbel.</b> If $X \\sim \\mathrm{Weibull}(k, \\lambda)$ then $-\\ln X$ has a Gumbel (maximum) distribution with location $-\\ln\\lambda$ and scale $1/k$. Equivalently, $\\ln X$ has the minimum-type Gumbel distribution, which is why log-lifetimes are analyzed with extreme-value methods.', to: 'gumbel' },
      { text: '<b>Smallest values (weakest link).</b> The minimum of $n$ independent $\\mathrm{Weibull}(k, \\lambda)$ variables is $\\mathrm{Weibull}(k,\\ \\lambda n^{-1/k})$. More generally, by the Fisher–Tippett–Gnedenko theorem, the suitably rescaled minimum of many independent positive variables whose density near 0 behaves like $c\\,x^{k-1}$ approaches a Weibull distribution. A chain fails at its weakest link, which is why material strength is often Weibull distributed.' },
      { text: '<b>Wider families.</b> The Weibull is a special case of the generalized gamma distribution, and the reversed (negated) Weibull is one of the three types of the generalized extreme value distribution.' },
    ],

    uses: {
      frequentist: [
        '<b>Reliability and life testing.</b> Weibull analysis is the standard method for failure-time data in engineering. The Weibull probability plot of $\\ln(-\\ln(1 - \\hat F))$ against $\\ln x$ checks the fit (a straight line) and gives quick estimates of $k$ (the slope) and $\\lambda$.',
        '<b>Maximum-likelihood estimation with censoring.</b> Lifetimes are often censored (some items have not failed when the study ends). The likelihood uses $f(x)$ for observed failures and the survival function $e^{-(x/\\lambda)^k}$ for censored ones. With $k$ known, $\\hat\\lambda = \\big(\\sum_i x_i^k / d\\big)^{1/k}$, where the sum runs over all items and $d$ is the number of failures; $k$ itself is found numerically.',
        '<b>Parametric survival regression.</b> Weibull regression models covariate effects on survival time. The Weibull is the only family that is both a proportional-hazards model (covariates multiply the hazard) and an accelerated-failure-time model (covariates stretch time), so its coefficients can be read either way.',
        '<b>Testing for a constant hazard.</b> Because $k = 1$ gives the exponential, a likelihood-ratio or Wald test of $k = 1$ checks whether the failure rate changes over time.',
      ],
      bayesian: [
        '<b>Conjugate prior when the shape is known.</b> With $k$ fixed, write $\\theta = \\lambda^k$. Then $x_i^k$ is exponential with mean $\\theta$, and an inverse-gamma prior $\\theta \\sim \\mathrm{InvGamma}(a, b)$ updates to $\\mathrm{InvGamma}\\big(a + d,\\ b + \\sum_i x_i^k\\big)$, with $d$ the number of observed failures and the sum over all items, censored ones included. Equivalently, the rate $1/\\theta$ has a gamma prior and posterior.',
        '<b>Both parameters unknown.</b> There is no conjugate prior for $(k, \\lambda)$ jointly. Bayesian Weibull survival models are fitted by MCMC, for example in Stan, with weakly informative priors such as a log-normal or gamma prior on $k$ centered near 1 and a prior on $\\ln\\lambda$ (or on regression coefficients for $\\ln\\lambda$).',
        '<b>Posterior predictive lifetimes.</b> Given posterior draws of $(k, \\lambda)$, drawing a new lifetime from each gives the posterior predictive distribution, from which one can read predicted reliability $P(X > t)$ with uncertainty.',
      ],
      modeling: [
        '<b>Material strength and fatigue.</b> Weibull (1939, 1951) introduced the distribution for the breaking strength of materials. Under the weakest-link argument, the strength of a large piece is the minimum over many small flaws, which leads to a Weibull distribution; its shape is called the Weibull modulus.',
        '<b>Psychometric functions.</b> In psychophysics the Weibull CDF $1 - e^{-(x/\\lambda)^k}$, rescaled for guessing and lapses, is a common psychometric function linking stimulus intensity to the probability of detection. The QUEST adaptive procedure (Watson & Pelli, 1983) assumes this form.',
        '<b>Wind speed and renewable energy.</b> Wind speeds at a site are usually summarized by a Weibull distribution, often with $k$ near 2 (the Rayleigh case), to estimate the energy a turbine will produce.',
        '<b>Particle sizes, hydrology and survival.</b> The Rosin–Rammler distribution of particle sizes is a Weibull distribution; Weibull distributions are also used for rainfall extremes, earthquake inter-event times, and the time to an event in medical and biological survival studies.',
        '<b>Response times and simulation.</b> The Weibull is sometimes used as a descriptive model for response-time distributions, and the closed-form quantile makes it easy to simulate in discrete-event and reliability simulations.',
      ],
    },

    references: [
      { text: 'Wikipedia: Weibull distribution.', url: 'https://en.wikipedia.org/wiki/Weibull_distribution' },
      { text: 'Wikipedia: Rayleigh distribution.', url: 'https://en.wikipedia.org/wiki/Rayleigh_distribution' },
      { text: 'Johnson, N. L., Kotz, S., & Balakrishnan, N. (1994). <i>Continuous Univariate Distributions</i>, Vol. 1 (2nd ed.), Chapter 21. Wiley.' },
      { text: 'Casella, G., & Berger, R. L. (2002). <i>Statistical Inference</i> (2nd ed.), Section 3.3 and Exercise 3.26 (hazard functions). Duxbury.' },
      { text: 'Leemis, L. M., & McQueston, J. T. (2008). Univariate distribution relationships. <i>The American Statistician</i>, 62(1), 45–53.', url: 'https://doi.org/10.1198/000313008X270448' },
      { text: 'Weibull, W. (1951). A statistical distribution function of wide applicability. <i>Journal of Applied Mechanics</i>, 18(3), 293–297.' },
      { text: 'Lawless, J. F. (2003). <i>Statistical Models and Methods for Lifetime Data</i> (2nd ed.), Chapters 1, 5 and 6. Wiley.' },
      { text: 'Watson, A. B., & Pelli, D. G. (1983). QUEST: A Bayesian adaptive psychometric method. <i>Perception & Psychophysics</i>, 33(2), 113–120.', url: 'https://doi.org/10.3758/BF03202828' },
    ],
  },
};

function fmtN(v) { return String(Number(v.toPrecision(4))).replace(/^-/, '−'); }
