// Log-normal distribution. mu and sigma are the mean and standard deviation of ln X, not of X.
// Follows the structure of the reference module dists/normal.js.

import { catalogParams } from '../catalog.js';
import { normalCdf, normalQuantile, LN_SQRT_2PI, PI } from '../core/math.js';

function pdf(x, { mu, sigma }) {
  if (x <= 0) return 0;
  const lx = Math.log(x), z = (lx - mu) / sigma;
  return Math.exp(-0.5 * z * z - LN_SQRT_2PI - lx) / sigma;
}
const cdf = (x, { mu, sigma }) => (x <= 0 ? 0 : normalCdf((Math.log(x) - mu) / sigma));
const sf = (x, { mu, sigma }) => (x <= 0 ? 1 : normalCdf(-(Math.log(x) - mu) / sigma));
const quantile = (u, { mu, sigma }) => Math.exp(mu + sigma * normalQuantile(u));
const peakOf = p => pdf(Math.exp(p.mu - p.sigma * p.sigma), p);
/** Height of the sigma arrow: the density at e^(mu + sigma), but at least 12% of the peak, so that the arrow
 *  stays clear of the x axis when sigma is large (the density there is then only a few percent of the peak). */
const arrowY = p => Math.max(pdf(Math.exp(p.mu + p.sigma), p), 0.12 * peakOf(p));

function stats({ mu, sigma }) {
  const s2 = sigma * sigma, w = Math.exp(s2);
  const variance = Math.expm1(s2) * Math.exp(2 * mu + s2);
  return {
    mean: Math.exp(mu + s2 / 2),
    variance,
    sd: Math.sqrt(variance),
    median: Math.exp(mu),
    mode: Math.exp(mu - s2),
    skewness: (w + 2) * Math.sqrt(Math.expm1(s2)),
    exKurtosis: Math.exp(4 * s2) + 2 * Math.exp(3 * s2) + 3 * Math.exp(2 * s2) - 6,
    entropy: mu + 0.5 * Math.log(2 * PI * Math.E * s2),
  };
}

export default {
  id: 'log-normal',
  name: 'Log-normal',
  kind: 'continuous',

  params: catalogParams('log-normal', { mu: { step: 0.05 }, sigma: { step: 0.05, dragStep: 0.01 } }),

  pdf,
  cdf,
  sf,
  quantile,
  sample: (rng, { mu, sigma }) => rng.lognormal(mu, sigma),

  testParams: [{ mu: -1, sigma: 0.25 }, { mu: 2, sigma: 0.9 }, { mu: 0.5, sigma: 0.1 }, { mu: -2, sigma: 0.6 }, { mu: 3, sigma: 0.05 }],

  range: () => [0, Infinity],
  support(p) {
    // the right tail gets very long for large sigma: stop the window at a lower percentile then,
    // so that the peak near 0 stays visible
    const s = p.sigma;
    const z = s <= 0.6 ? 3.29 : s <= 1.2 ? 3.29 - 1.2 * (s - 0.6) : Math.max(1.6, 2.57 - 1.2 * (s - 1.2));
    const hi = Math.exp(p.mu + s * z);
    const lo = Math.exp(p.mu - 3.29 * s);
    return lo > 0.25 * hi ? [lo - 0.08 * (hi - lo), hi] : [-0.02 * hi, hi];
  },

  stats,

  // Handles:
  //  - a dashed line at the median e^mu: drag it to move the distribution (sets mu = ln x). Moving it
  //    multiplies every value by the same factor, so the curve is stretched, not shifted;
  //  - an arrow from the median to e^(mu + sigma), the point one log-standard-deviation above the median,
  //    at the height of the density there: drag its tip to change sigma = ln x - mu.
  handles: [
    {
      type: 'vline', param: 'mu', id: 'median', label: 'median',
      ariaLabel: 'Median e^μ. Drag left or right to move it; the arrow keys change μ.',
      x: p => Math.exp(p.mu),
      set: pt => ({ mu: Math.log(Math.max(pt.x, 1e-6)) }),
    },
    {
      type: 'hArrow', param: 'sigma', id: 'spread', label: 'σ',
      ariaLabel: 'Log-standard deviation σ: the arrow runs from the median e^μ to e^(μ+σ). Drag the tip, or use the arrow keys.',
      from: p => ({ x: Math.exp(p.mu), y: arrowY(p) }),
      to: p => ({ x: Math.exp(p.mu + p.sigma), y: arrowY(p) }),
      set: (pt, p) => ({ sigma: Math.log(Math.max(pt.x, Math.exp(p.mu) * 1.0001)) - p.mu }),
    },
  ],

  explorer: {
    readouts: [
      { key: 'median', label: 'Median e^μ' },
      { key: 'mean', label: 'Mean e^(μ + σ²/2)' },
      { key: 'mode', label: 'Mode e^(μ − σ²)' },
      { key: 'sd', label: 'Standard deviation' },
      { label: 'Geometric standard deviation e^σ', value: p => Math.exp(p.sigma) },
    ],
    // mark the mean, which lies to the right of the median because of the long right tail
    extraLayers: (p, view) => {
      const m = Math.exp(p.mu + p.sigma * p.sigma / 2);
      if (!(m > view.x[0] && m < view.x[1])) return [];
      // lift the marker to at least 40% of the peak, so that it stays visible when the mean lies far out in the tail
      const y = Math.max(pdf(m, p), 0.4 * peakOf(p));
      return [
        { id: 'mean-seg', type: 'segment', x1: m, y1: 0, x2: m, y2: y, cls: 'mean-line' },
        { id: 'mean-lbl', type: 'text', x: m, y, text: 'mean', dy: -6, dx: 4, anchor: 'start', cls: 'mean-label' },
      ];
    },
  },

  content: {
    description: [
      'The log-normal distribution describes a positive quantity whose logarithm has a normal distribution. It arises when many small independent effects <i>multiply</i> together, in the same way that the normal distribution arises when many small effects add up. Incomes, city populations, the sizes of particles and organisms, concentrations of chemicals, stock prices and response times are often approximately log-normal.',
      'It takes only positive values and is skewed to the right: most values are moderate, a few are very large. Its two parameters describe the logarithm. The log-mean $\\mu$ is the mean of $\\ln X$; $e^{\\mu}$ is the median of $X$, so changing $\\mu$ multiplies all values by the same factor. The log-standard deviation $\\sigma$ is the standard deviation of $\\ln X$; it controls how spread out and how skewed the distribution is. For small $\\sigma$ the curve is nearly symmetric, and for large $\\sigma$ it has a very long right tail.',
      'Note that $\\mu$ and $\\sigma$ are <b>not</b> the mean and standard deviation of $X$ itself: the mean of $X$ is $e^{\\mu + \\sigma^2/2}$, larger than the median $e^{\\mu}$. A convenient way to think about spread is multiplicative: about 68% of values lie between $e^{\\mu}/e^{\\sigma}$ and $e^{\\mu} \\cdot e^{\\sigma}$.',
    ],
    explorerIntro: 'The left plot shows the density $f(x)$ and the right plot the cumulative distribution $F(x)$. Drag the dashed amber line, which sits at the median $e^{\\mu}$, to change $\\mu$; this stretches or shrinks the whole curve rather than shifting it. Drag the tip of the amber arrow to change $\\sigma$. The arrow runs from the median to $e^{\\mu + \\sigma}$, the value one log-standard-deviation above it (84.1% of values lie below it); it sits at the height of the density there, or a little higher when $\\sigma$ is large, so that it stays clear of the axis. The thin line marks the mean $e^{\\mu + \\sigma^2/2}$, which moves away from the median as $\\sigma$ grows.',

    pdfTex: 'f(x \\mid \\mu, \\sigma) = \\frac{1}{x\\,\\sigma\\sqrt{2\\pi}} \\exp\\!\\left( -\\frac{(\\ln x - \\mu)^2}{2\\sigma^2} \\right) \\quad \\text{for } x > 0',
    glossary: [
      { sym: 'x', meaning: 'A possible value of the random variable $X$. It must be positive.' },
      { sym: 'f(x \\mid \\mu, \\sigma)', meaning: 'The probability density at $x$ given the parameters.' },
      { sym: '\\ln x', meaning: 'The natural logarithm of $x$. If $X$ is log-normal, $\\ln X$ is normal.' },
      { sym: '\\mu', meaning: 'The log-mean: the mean of $\\ln X$. It can be any real number; $e^{\\mu}$ is the median of $X$.' },
      { sym: '\\sigma', meaning: 'The log-standard deviation: the standard deviation of $\\ln X$. It must be positive and controls the spread and skewness.' },
      { sym: '\\pi', meaning: 'The constant 3.14159…' },
      { sym: '\\exp(\\cdot)', meaning: 'The exponential function $e^{(\\cdot)}$, with $e \\approx 2.71828$.' },
      { sym: '\\frac{1}{x}', meaning: 'The extra factor that comes from changing variables from $\\ln x$ to $x$ (the derivative of $\\ln x$). Without it, this would be the normal density of $\\ln x$.' },
    ],

    cdfTex: 'F(x \\mid \\mu, \\sigma) = P(X \\le x) = \\Phi\\!\\left(\\frac{\\ln x - \\mu}{\\sigma}\\right) \\quad \\text{for } x > 0',
    cdfGlossary: [
      { sym: 'F(x \\mid \\mu, \\sigma)', meaning: 'The cumulative distribution function: the probability that $X$ is at most $x$. It is 0 for $x \\le 0$.' },
      { sym: 'P(X \\le x)', meaning: 'The probability that the random variable $X$ takes a value at most $x$.' },
      { sym: '\\frac{\\ln x - \\mu}{\\sigma}', meaning: 'The z-score of $\\ln x$: how many log-standard deviations $\\ln x$ lies above $\\mu$. Because the logarithm is increasing, $X \\le x$ exactly when $\\ln X \\le \\ln x$.' },
      { sym: '\\Phi(z)', meaning: 'The CDF of the standard normal distribution. It has no formula in elementary functions and is computed numerically (from the error function).' },
      { sym: '\\mu,\\ \\sigma', meaning: 'The mean and standard deviation of $\\ln X$.' },
    ],
    extraFormulas: [
      {
        title: 'Quantile function',
        intro: 'Quantiles of $X$ are exponentials of the normal quantiles of $\\ln X$:',
        tex: 'Q(u) = \\exp\\!\\big(\\mu + \\sigma\\,\\Phi^{-1}(u)\\big)',
        glossary: [
          { sym: 'u', meaning: 'A probability between 0 and 1.' },
          { sym: '\\Phi^{-1}(u)', meaning: 'The standard normal quantile, for example $\\Phi^{-1}(0.975) \\approx 1.96$.' },
        ],
      },
      {
        title: 'Converting between the two parameter scales',
        intro: 'Given the mean $m$ and standard deviation $s$ of $X$ itself, the parameters of $\\ln X$ are:',
        tex: '\\sigma^2 = \\ln\\!\\left(1 + \\frac{s^2}{m^2}\\right), \\qquad \\mu = \\ln m - \\frac{\\sigma^2}{2}',
        glossary: [
          { sym: 'm,\\ s', meaning: 'The mean and standard deviation of $X$ (not of $\\ln X$).' },
          { sym: 's/m', meaning: 'The coefficient of variation of $X$. It depends only on $\\sigma$.' },
        ],
      },
    ],

    properties: [
      { name: 'Support', tex: 'x \\in (0, \\infty)', explain: 'Only positive values are possible. The density approaches 0 at both ends.' },
      { name: 'Mean', tex: '\\mathrm{E}[X] = e^{\\mu + \\sigma^2/2}', value: p => stats(p).mean, explain: 'Larger than the median $e^{\\mu}$, because the long right tail pulls the average up. Exponentiating the mean of $\\ln X$ gives the median, not the mean (an example of Jensen’s inequality).' },
      { name: 'Median', tex: 'e^{\\mu}', value: p => Math.exp(p.mu), explain: 'Half of the values lie below $e^{\\mu}$. It is also the geometric mean of $X$.' },
      { name: 'Mode', tex: 'e^{\\mu - \\sigma^2}', value: p => stats(p).mode, explain: 'The peak of the density. The three centers are ordered mode < median < mean.' },
      { name: 'Variance', tex: '\\left(e^{\\sigma^2} - 1\\right) e^{2\\mu + \\sigma^2}', value: p => stats(p).variance, explain: 'Proportional to the squared mean: the variance is (mean)$^2 \\times (e^{\\sigma^2} - 1)$.' },
      { name: 'Standard deviation', tex: 'e^{\\mu + \\sigma^2/2}\\sqrt{e^{\\sigma^2} - 1}', value: p => stats(p).sd, explain: 'The coefficient of variation (standard deviation divided by mean) is $\\sqrt{e^{\\sigma^2} - 1}$, which depends on $\\sigma$ only and is close to $\\sigma$ when $\\sigma$ is small.' },
      { name: 'Skewness', tex: '\\left(e^{\\sigma^2} + 2\\right)\\sqrt{e^{\\sigma^2} - 1}', value: p => stats(p).skewness, explain: 'Always positive (skewed to the right), and it depends on $\\sigma$ only. It is close to $3\\sigma$ for small $\\sigma$ and grows very fast for large $\\sigma$.' },
      { name: 'Excess kurtosis', tex: 'e^{4\\sigma^2} + 2e^{3\\sigma^2} + 3e^{2\\sigma^2} - 6', value: p => stats(p).exKurtosis, explain: 'Always positive: heavier tails than the normal. It is near 0 for small $\\sigma$ and very large when $\\sigma$ is above 1.' },
      { name: 'Entropy', tex: '\\mu + \\tfrac12 \\ln(2\\pi e \\sigma^2)', value: p => stats(p).entropy, explain: 'Differential entropy in nats: the normal entropy of $\\ln X$ plus $\\mu$, which accounts for the stretching by $e^{\\mu}$. Among positive distributions with given mean and variance of $\\ln X$, the log-normal has the largest entropy.' },
      { name: 'Moment-generating function', tex: 'M(t) = \\infty \\ \\ (t > 0)', explain: '$M(t) = \\mathrm{E}[e^{tX}]$ is infinite for every $t > 0$. The right tail is heavier than any exponential, so the moment-generating function does not exist. Although every moment is finite, the moments do not determine the distribution: other distributions have exactly the same moments (Heyde, 1963).' },
      { name: 'Characteristic function', tex: '\\varphi(t) = \\mathrm{E}[e^{itX}]', explain: 'It exists, as for every distribution, but it has no closed form and is computed numerically. Here $i = \\sqrt{-1}$.' },
      { name: 'Moments', tex: '\\mathrm{E}[X^n] = e^{n\\mu + n^2\\sigma^2/2}', explain: 'All moments are finite. They come from the normal moment-generating function of $\\ln X$ evaluated at $t = n$.' },
      { name: 'Geometric mean and standard deviation', tex: 'e^{\\mu}, \\quad e^{\\sigma}', value: p => `${fmtN(Math.exp(p.mu))}, ${fmtN(Math.exp(p.sigma))}`, explain: 'The natural summaries on the multiplicative scale. About 68% of values lie between $e^{\\mu}/e^{\\sigma}$ and $e^{\\mu}e^{\\sigma}$, and about 95% between $e^{\\mu}/e^{2\\sigma}$ and $e^{\\mu}e^{2\\sigma}$.' },
      { name: 'Quantiles', tex: 'Q(u) = e^{\\mu + \\sigma\\,\\Phi^{-1}(u)}', value: p => `${fmtN(quantile(0.025, p))} to ${fmtN(quantile(0.975, p))}`, explain: 'The value column shows the middle 95% range, from $e^{\\mu - 1.96\\sigma}$ to $e^{\\mu + 1.96\\sigma}$. Note that it is not symmetric around the median.' },
    ],

    limits: [
      { text: '<b>Exponential of a normal.</b> $X \\sim \\mathcal N(\\mu, \\sigma^2)$ if and only if $e^X \\sim \\mathrm{LogNormal}(\\mu, \\sigma)$. Every property of the log-normal can be derived from the normal by this change of variables.', relation: 'normal--log-normal', to: 'normal' },
      { text: '<b>Small $\\sigma$: nearly normal.</b> As $\\sigma \\to 0$ the skewness goes to 0 and $\\mathrm{LogNormal}(\\mu, \\sigma)$ is approximately $\\mathcal N(e^{\\mu}, \\sigma^2 e^{2\\mu})$, since $e^{\\mu + \\sigma Z} \\approx e^{\\mu}(1 + \\sigma Z)$ for a standard normal $Z$. In the limit the distribution collapses onto the single value $e^{\\mu}$.', to: 'normal' },
      { text: '<b>Products of many factors.</b> If $Y_1, Y_2, \\dots$ are independent positive variables and $\\ln Y_i$ has a finite variance, the central limit theorem applied to $\\sum_i \\ln Y_i$ shows that the product $Y_1 Y_2 \\cdots Y_n$ is approximately log-normal for large $n$ (the multiplicative central limit theorem, or Gibrat’s law for growth processes).' },
      { text: '<b>Closed under products and powers.</b> If $X_1 \\sim \\mathrm{LogNormal}(\\mu_1, \\sigma_1)$ and $X_2 \\sim \\mathrm{LogNormal}(\\mu_2, \\sigma_2)$ are independent, then $X_1 X_2 \\sim \\mathrm{LogNormal}(\\mu_1 + \\mu_2, \\sqrt{\\sigma_1^2 + \\sigma_2^2})$. Also $cX^a \\sim \\mathrm{LogNormal}(a\\mu + \\ln c,\\ |a|\\sigma)$ for $c > 0$ and $a \\ne 0$; in particular $1/X \\sim \\mathrm{LogNormal}(-\\mu, \\sigma)$.' },
      { text: '<b>Sums are not log-normal.</b> A sum of independent log-normal variables has no closed-form distribution. It is often approximated by another log-normal with the same mean and variance (the Fenton–Wilkinson approximation).' },
    ],

    uses: {
      frequentist: [
        '<b>Analysis on the log scale.</b> When data are log-normal, $t$-tests, ANOVA and linear regression are run on $\\ln x$. Differences on the log scale become ratios on the original scale, so results are reported as ratios of geometric means with confidence intervals obtained by exponentiating the log-scale interval.',
        '<b>Bioequivalence testing.</b> Pharmacokinetic measures such as the area under the concentration curve (AUC) and the peak concentration ($C_{\\max}$) are treated as log-normal. Two formulations are declared bioequivalent when the 90% confidence interval for the ratio of geometric means lies within 80% to 125% (two one-sided tests on the log scale).',
        '<b>Estimation.</b> The maximum-likelihood estimates are the mean and the (divide-by-$n$) standard deviation of $\\ln x_i$: $\\hat\\mu = \\frac1n\\sum_i \\ln x_i$ and $\\hat\\sigma^2 = \\frac1n\\sum_i (\\ln x_i - \\hat\\mu)^2$. The mean of $X$ is then estimated by $e^{\\hat\\mu + \\hat\\sigma^2/2}$; a confidence interval for it needs special methods (for example, Cox’s method), because simply exponentiating the interval for $\\mu$ gives an interval for the median.',
        '<b>Survival and accelerated-failure-time models.</b> Log-normal regression for survival times models $\\ln T$ as a linear function of covariates plus normal error, with censored observations handled through the survival function $1 - \\Phi((\\ln t - \\mu)/\\sigma)$.',
      ],
      bayesian: [
        '<b>Conjugate analysis through the logarithm.</b> Because $\\ln x_i$ is normal, the normal–normal update applies to $\\mu$: with $\\sigma$ known and prior $\\mu \\sim \\mathcal N(\\mu_0, \\tau_0^2)$, the posterior is normal with precision $1/\\tau_0^2 + n/\\sigma^2$ and mean equal to the precision-weighted average of $\\mu_0$ and the mean of $\\ln x_i$. With both unknown, the normal–inverse-gamma prior is conjugate.',
        '<b>Posterior predictive.</b> With the conjugate normal–inverse-gamma prior, the posterior predictive distribution of $\\ln \\tilde x$ for a new observation is a Student $t$, so $\\tilde x$ itself has a “log-$t$” distribution, with heavier tails than a log-normal.',
        '<b>Priors for positive parameters.</b> Log-normal priors are common for scale parameters, rate constants and other positive quantities when prior knowledge is about orders of magnitude, for example “between 0.1 and 10, most likely near 1” corresponds to $\\mu = 0$ and $\\sigma \\approx 1.17$ for a 95% range. They are used, for instance, for pharmacokinetic parameters and for the shape of Weibull models.',
        '<b>Hierarchical models.</b> Unit-level effects that act multiplicatively, such as individual differences in speed or sensitivity, are often given a log-normal population distribution: normal random effects on the log scale.',
      ],
      modeling: [
        '<b>Response times.</b> Response-time distributions are right-skewed and positive, and a log-normal often fits them well. The lognormal model for response times on test items (van der Linden, 2006) and the lognormal race model of choice and latency (Rouder et al., 2015) are built on it.',
        '<b>Neuroscience.</b> Many neural quantities, such as firing rates across neurons, synaptic weights and axon diameters, have skewed distributions that are close to log-normal (Buzsáki & Mizuseki, 2014).',
        '<b>Growth, sizes and abundances.</b> Under Gibrat’s law, firms, cities and organisms that grow by random proportional amounts have log-normal sizes. Species abundances, particle sizes from crushing, and incubation periods of infectious diseases are classical examples.',
        '<b>Finance.</b> In the Black–Scholes model, the stock price follows geometric Brownian motion, so its value at a future time is log-normal; this gives the Black–Scholes option-pricing formula.',
        '<b>Environmental and exposure data.</b> Concentrations of pollutants, rainfall amounts in some regions and exposure measurements are summarized by their geometric mean and geometric standard deviation.',
      ],
    },

    references: [
      { text: 'Wikipedia: Log-normal distribution.', url: 'https://en.wikipedia.org/wiki/Log-normal_distribution' },
      { text: 'Johnson, N. L., Kotz, S., & Balakrishnan, N. (1994). <i>Continuous Univariate Distributions</i>, Vol. 1 (2nd ed.), Chapter 14. Wiley.' },
      { text: 'Casella, G., & Berger, R. L. (2002). <i>Statistical Inference</i> (2nd ed.), Section 3.3 and Example 2.3.10 (moments that do not determine the distribution). Duxbury.' },
      { text: 'Limpert, E., Stahel, W. A., & Abbt, M. (2001). Log-normal distributions across the sciences: Keys and clues. <i>BioScience</i>, 51(5), 341–352.', url: 'https://doi.org/10.1641/0006-3568(2001)051[0341:LNDATS]2.0.CO;2' },
      { text: 'Leemis, L. M., & McQueston, J. T. (2008). Univariate distribution relationships. <i>The American Statistician</i>, 62(1), 45–53.', url: 'https://doi.org/10.1198/000313008X270448' },
      { text: 'van der Linden, W. J. (2006). A lognormal model for response times on test items. <i>Journal of Educational and Behavioral Statistics</i>, 31(2), 181–204.', url: 'https://doi.org/10.3102/10769986031002181' },
      { text: 'Rouder, J. N., Province, J. M., Morey, R. D., Gomez, P., & Heathcote, A. (2015). The lognormal race: A cognitive-process model of choice and latency with desirable psychometric properties. <i>Psychometrika</i>, 80(2), 491–513.', url: 'https://doi.org/10.1007/s11336-013-9396-3' },
      { text: 'Buzsáki, G., & Mizuseki, K. (2014). The log-dynamic brain: How skewed distributions affect network operations. <i>Nature Reviews Neuroscience</i>, 15(4), 264–278.', url: 'https://doi.org/10.1038/nrn3687' },
    ],
  },
};

function fmtN(v) { return String(Number(v.toPrecision(4))).replace(/^-/, '−'); }
