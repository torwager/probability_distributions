// Poisson distribution: the number of events in a fixed interval when events occur independently
// at a constant average rate. Parameter: the mean count lambda (also the variance).
// Follows the structure of the reference module dists/normal.js (see ARCHITECTURE.md).

import { catalogParams } from '../catalog.js';
import { lgamma, gammaP, gammaQ, quantileDiscrete } from '../core/math.js';

// P(X = k) = e^-lambda lambda^k / k!, in log space so that large k and lambda do not overflow
function pdf(k, { lambda }) {
  if (!Number.isInteger(k) || k < 0) return 0;
  return Math.exp(k * Math.log(lambda) - lambda - lgamma(k + 1));
}

// P(X <= k) = Q(k + 1, lambda), the regularized upper incomplete gamma function
function cdf(x, { lambda }) {
  const k = Math.floor(x);
  if (k < 0) return 0;
  return gammaQ(k + 1, lambda);
}

function sf(x, { lambda }) {
  const k = Math.floor(x);
  if (k < 0) return 1;
  return gammaP(k + 1, lambda);
}

const quantile = (u, prm) => quantileDiscrete(x => cdf(x, prm), u, 0, Infinity, Math.floor(prm.lambda));

/** Entropy in nats, summed over the support until the remaining tail is negligible. */
function entropy(prm) {
  let H = 0;
  for (let k = 0; k < 1e6; k++) {
    const f = pdf(k, prm);
    if (f > 0) H -= f * Math.log(f);
    if (k > prm.lambda + 1 && f < 1e-20) break;
  }
  return H;
}

function stats(prm) {
  const { lambda } = prm;
  return {
    mean: lambda,
    variance: lambda,
    sd: Math.sqrt(lambda),
    median: quantile(0.5, prm),
    // floor(lambda); when lambda is a whole number, lambda - 1 and lambda tie and the larger is reported
    mode: Math.floor(lambda + 1e-12),
    skewness: 1 / Math.sqrt(lambda),
    exKurtosis: 1 / lambda,
    entropy: entropy(prm),
  };
}

export default {
  id: 'poisson',
  name: 'Poisson',
  kind: 'discrete',

  // lambda runs from 0.1 to 30, so its slider is logarithmic
  params: catalogParams('poisson', { lambda: { step: 0.1 } }),

  pdf,
  cdf,
  sf,
  quantile,
  sample: (rng, { lambda }) => rng.poisson(lambda),

  testParams: [{ lambda: 0.1 }, { lambda: 1 }, { lambda: 2.5 }, { lambda: 7 }, { lambda: 30 }],

  range: () => [0, Infinity],
  // up to about the 0.9995 quantile, with room to the right so that the mean can be dragged further
  support: prm => [0, Math.max(8, quantile(0.9995, prm), Math.ceil(prm.lambda + 4))],

  stats,

  // a dashed line at the mean lambda: drag it left or right to change the mean (and the variance with it)
  handles: [
    {
      type: 'vline', param: 'lambda', label: 'λ',
      ariaLabel: 'Mean count λ. Drag left or right, or use the arrow keys.',
    },
  ],

  explorer: {
    readouts: [
      { key: 'mean', label: 'Mean λ (also the variance)' },
      { key: 'sd', label: 'Standard deviation √λ' },
      { key: 'mode', label: 'Mode' },
      { label: 'P(X = 0) = e^(−λ)', value: prm => pdf(0, prm) },
      { label: 'Middle 95% (2.5th to 97.5th percentile)', value: prm => `${quantile(0.025, prm)} to ${quantile(0.975, prm)}` },
    ],
  },

  content: {
    summary: 'The Poisson distribution counts the events in a fixed interval of time or space when events occur independently at a constant average rate, such as the spikes of a neuron in 100 ms. Its parameter $\\lambda$ is both the mean and the variance of the count.',
    description: [
      'The Poisson distribution describes the number of times an event happens in a fixed stretch of time or space, when the events happen independently of each other and at a constant average rate. Examples are the number of spikes a neuron fires in a 100 ms window, the number of emails arriving in an hour, the number of typing errors on a page, or the number of radioactive decays recorded by a detector in a second.',
      'The count $X$ takes the whole-number values $0, 1, 2, \\dots$ with no upper limit. The single parameter $\\lambda$ is the expected count, and it is also the variance: counts with a larger mean are also more variable, with standard deviation $\\sqrt\\lambda$. For small $\\lambda$ the most likely count is 0 and the distribution is strongly skewed to the right; as $\\lambda$ grows it becomes more symmetric and close to a normal distribution.',
      'If events occur at rate $\\lambda$ per unit time, the count in a window of length $t$ is Poisson with mean $\\lambda t$. On this site $\\lambda$ always denotes the mean count of the interval being counted. The same letter is used for the rate of the exponential distribution; in a Poisson process the two describe the same events, one as a count and one as a waiting time.',
    ],
    explorerIntro: 'The left plot shows the probability of each count $k$ as a stem, and the right plot the cumulative probability $F(k)$. Drag the dashed amber line at the mean $\\lambda$ to the right or left; the whole distribution moves and also spreads out or narrows, because the variance equals the mean. The view widens after you let go, so a second drag can go further. You can also type a value of $\\lambda$ in the box.',

    pdfTex: 'P(X = k) = \\frac{\\lambda^{k} e^{-\\lambda}}{k!}, \\qquad k = 0, 1, 2, \\dots',
    glossary: [
      { sym: 'X', meaning: 'The random number of events in the interval.' },
      { sym: 'k', meaning: 'A possible count: a whole number $0, 1, 2, \\dots$' },
      { sym: 'P(X = k)', meaning: 'The probability of exactly $k$ events.' },
      { sym: '\\lambda', meaning: 'The expected number of events in the interval (the mean count). It must be positive, and it is also the variance.' },
      { sym: 'e', meaning: 'The base of natural logarithms, $e \\approx 2.718$. The factor $e^{-\\lambda}$ is the probability of no events at all, and it makes the probabilities add up to 1.' },
      { sym: 'k!', meaning: 'The factorial $1 \\cdot 2 \\cdots k$, with $0! = 1$. Dividing by it accounts for the fact that the order in which the $k$ events happen does not matter.' },
      { sym: '\\lambda^{k}', meaning: 'The mean raised to the power $k$. Each further count multiplies the probability by $\\lambda/k$, so the probabilities rise while $k < \\lambda$ and fall after that.' },
    ],

    cdfTex: 'F(x) = P(X \\le x) = e^{-\\lambda} \\sum_{k=0}^{\\lfloor x \\rfloor} \\frac{\\lambda^{k}}{k!} = Q\\big(\\lfloor x \\rfloor + 1,\\ \\lambda\\big) = \\frac{\\Gamma\\big(\\lfloor x \\rfloor + 1,\\ \\lambda\\big)}{\\lfloor x \\rfloor !}',
    cdfGlossary: [
      { sym: 'F(x)', meaning: 'The cumulative distribution function: the probability of at most $x$ events. It is a staircase that steps up at $0, 1, 2, \\dots$' },
      { sym: 'P(X \\le x)', meaning: 'The probability that the count is less than or equal to $x$.' },
      { sym: '\\lfloor x \\rfloor', meaning: 'The floor of $x$: $x$ rounded down to a whole number.' },
      { sym: '\\sum_{k=0}^{\\lfloor x \\rfloor}', meaning: 'Add up the terms for the counts $0, 1, \\dots, \\lfloor x \\rfloor$.' },
      { sym: '\\lambda,\\ e,\\ k!', meaning: 'The mean count, the base of natural logarithms and the factorial, as above.' },
      { sym: 'Q(a, \\lambda)', meaning: 'The regularized upper incomplete gamma function, $Q(a, \\lambda) = \\Gamma(a, \\lambda)/\\Gamma(a)$. The identity says that at most $\\lfloor x \\rfloor$ events happen by time 1 exactly when the waiting time for event number $\\lfloor x \\rfloor + 1$, which is gamma distributed, is longer than 1. This page uses it to compute the CDF accurately for large $\\lambda$.' },
      { sym: '\\Gamma(a, \\lambda)', meaning: 'The upper incomplete gamma function $\\int_{\\lambda}^{\\infty} t^{a-1} e^{-t}\\,dt$. Dividing it by $\\Gamma(a) = (a - 1)!$, the complete gamma function, gives $Q$.' },
    ],

    extraFormulas: [
      {
        title: 'Counts over time or space: rate times exposure',
        intro: 'When events happen at a constant rate per unit of time (or area, or person-years), the count in an interval of length $t$ is Poisson with mean equal to the rate times $t$. Counts in non-overlapping intervals are independent. This is the Poisson process, whose waiting times between events are exponential. In Poisson regression, $\\ln t$ enters the model as a fixed “offset”.',
        tex: 'N(t) \\sim \\mathrm{Poisson}(\\rho\\, t), \\qquad \\mathrm{E}[N(t)] = \\mathrm{Var}[N(t)] = \\rho\\, t',
        glossary: [
          { sym: 'N(t)', meaning: 'The number of events in an interval of length $t$.' },
          { sym: '\\rho', meaning: 'The rate: the expected number of events per unit of time. Here it is written $\\rho$ to keep it apart from the mean count $\\lambda = \\rho t$ of the interval.' },
          { sym: 't', meaning: 'The length of the interval (the exposure).' },
        ],
      },
      {
        title: 'Likelihood and the gamma posterior',
        intro: 'For $n$ independent counts $x_1, \\dots, x_n$ from the same Poisson distribution, the likelihood is proportional to $\\lambda^{\\sum x_i} e^{-n\\lambda}$, and the maximum-likelihood estimate is the sample mean $\\bar x$. With a $\\mathrm{Gamma}(\\alpha, \\beta)$ prior (shape $\\alpha$, rate $\\beta$) the posterior is again gamma:',
        tex: '\\lambda \\mid x_1, \\dots, x_n \\ \\sim\\ \\mathrm{Gamma}\\Big(\\alpha + \\sum_{i=1}^{n} x_i,\\ \\beta + n\\Big)',
        glossary: [
          { sym: 'x_1, \\dots, x_n', meaning: 'The observed counts.' },
          { sym: '\\alpha,\\ \\beta', meaning: 'The prior shape and rate. The prior acts like $\\beta$ earlier intervals in which $\\alpha$ events were counted in total.' },
          { sym: '\\sum_{i=1}^{n} x_i', meaning: 'The total number of events observed.' },
        ],
      },
      {
        title: 'Exact confidence interval for the mean',
        intro: 'Because the Poisson CDF is a gamma tail probability, the exact (Garwood) confidence interval for $\\lambda$ after observing a count $x$ uses quantiles of the chi-squared distribution:',
        tex: '\\left[\\ \\tfrac12\\, \\chi^2_{2x,\\ \\alpha/2},\\ \\ \\tfrac12\\, \\chi^2_{2x + 2,\\ 1 - \\alpha/2}\\ \\right]',
        glossary: [
          { sym: 'x', meaning: 'The observed count. For $x = 0$ the lower limit is 0.' },
          { sym: '\\chi^2_{d,\\ q}', meaning: 'The $q$ quantile of the chi-squared distribution with $d$ degrees of freedom.' },
          { sym: '\\alpha', meaning: 'Here the error rate of the interval (0.05 for a 95% interval), not a prior parameter.' },
        ],
      },
    ],

    properties: [
      { name: 'Support', tex: 'k \\in \\{0, 1, 2, \\dots\\}', value: () => '0, 1, 2, …', explain: 'Any whole number of events. There is no upper limit, although counts far above $\\lambda$ are very unlikely.' },
      { name: 'Mean', tex: '\\mathrm{E}[X] = \\lambda', value: prm => prm.lambda, explain: 'The expected number of events in the interval.' },
      { name: 'Median', tex: '\\left\\lfloor \\lambda + \\tfrac13 - \\tfrac{0.02}{\\lambda} \\right\\rfloor \\ \\text{(approximately)}', value: prm => stats(prm).median, explain: 'There is no exact formula. The median always lies between $\\lambda - \\ln 2$ and $\\lambda + \\tfrac13$ (Choi, 1994), and rounding $\\lambda + \\tfrac13 - 0.02/\\lambda$ down gives it for every $\\lambda$ on this page except a narrow band just above $\\ln 2 \\approx 0.6931$ (up to about 0.6955), where the formula gives 0 but the median is 1. The value shown is the smallest $k$ with $F(k) \\ge 1/2$.' },
      { name: 'Mode', tex: '\\lfloor \\lambda \\rfloor', value: prm => stats(prm).mode, explain: 'The most likely count. When $\\lambda$ is a whole number, $\\lambda - 1$ and $\\lambda$ are equally likely, and the larger is shown. For $\\lambda < 1$ the mode is 0.' },
      { name: 'Variance', tex: '\\mathrm{Var}(X) = \\lambda', value: prm => prm.lambda, explain: 'Equal to the mean (equidispersion). Real counts often have a variance larger than the mean (overdispersion); the negative binomial is then a common alternative.' },
      { name: 'Standard deviation', tex: '\\sqrt{\\lambda}', value: prm => Math.sqrt(prm.lambda), explain: 'Grows like the square root of the mean, so the relative spread $1/\\sqrt\\lambda$ shrinks as counts get larger. This is the familiar “$\\sqrt N$” counting error in physics.' },
      { name: 'Skewness', tex: '\\frac{1}{\\sqrt{\\lambda}}', value: prm => 1 / Math.sqrt(prm.lambda), explain: 'Always positive (a right tail), and shrinking as $\\lambda$ grows, which is why large Poisson counts look normal.' },
      { name: 'Excess kurtosis', tex: '\\frac{1}{\\lambda}', value: prm => 1 / prm.lambda, explain: 'Positive, and shrinking toward 0, the normal value, as $\\lambda$ grows.' },
      { name: 'Entropy', tex: '-\\sum_{k=0}^{\\infty} P(X = k) \\ln P(X = k) \\approx \\tfrac12 \\ln(2\\pi e \\lambda) - \\tfrac{1}{12\\lambda}', value: prm => stats(prm).entropy, explain: 'In nats. There is no closed form; the value shown is the exact sum. For large $\\lambda$ it is close to the entropy of a normal distribution with variance $\\lambda$ (here $\\pi \\approx 3.142$).' },
      { name: 'Probability-generating function', tex: 'G(z) = \\mathrm{E}[z^X] = e^{\\lambda(z - 1)}', explain: 'Multiplying generating functions shows that independent Poisson counts add: $\\mathrm{Poisson}(\\lambda_1) + \\mathrm{Poisson}(\\lambda_2) = \\mathrm{Poisson}(\\lambda_1 + \\lambda_2)$.' },
      { name: 'Moment-generating function', tex: 'M(t) = \\exp\\!\\big(\\lambda(e^{t} - 1)\\big)', explain: '$\\mathrm{E}[e^{tX}]$. All cumulants (mean, variance, third central moment, and so on) equal $\\lambda$.' },
      { name: 'Characteristic function', tex: '\\varphi(t) = \\exp\\!\\big(\\lambda(e^{it} - 1)\\big)', explain: '$\\mathrm{E}[e^{itX}]$, where $i = \\sqrt{-1}$.' },
      { name: 'Probability of zero', tex: 'P(X = 0) = e^{-\\lambda}', value: prm => pdf(0, prm), explain: 'The chance that no event happens. For small $\\lambda$, the chance of at least one event is $1 - e^{-\\lambda} \\approx \\lambda$.' },
      { name: 'Ratio of successive probabilities', tex: '\\frac{P(X = k)}{P(X = k - 1)} = \\frac{\\lambda}{k}', explain: 'The probabilities increase while $k < \\lambda$ and decrease afterwards, which gives the mode. This recursion is also a simple way to compute the probabilities.' },
      { name: 'Variance-stabilizing transformation', tex: '2\\sqrt{X + \\tfrac38} \\ \\dot\\sim\\ \\mathcal N\\big(2\\sqrt{\\lambda},\\ 1\\big)', value: prm => 2 * Math.sqrt(prm.lambda), explain: 'Anscombe’s transform: for $\\lambda$ above about 4, the square root of a count has a variance close to a constant, which makes Poisson counts suitable for methods that assume equal variances. Here $\\dot\\sim$ means “is approximately distributed as”; the value shown is $2\\sqrt\\lambda$.' },
    ],

    limits: [
      { text: '<b>Law of rare events.</b> A binomial count with many trials $n$ and a small success probability $p$, with $np = \\lambda$ held fixed, approaches $\\mathrm{Poisson}(\\lambda)$ as $n \\to \\infty$. This is why counts of rare independent events are Poisson.', relation: 'binomial--poisson', to: 'binomial' },
      { text: '<b>Normal limit.</b> As $\\lambda \\to \\infty$, $(X - \\lambda)/\\sqrt\\lambda$ approaches $\\mathcal N(0, 1)$. A common rule of thumb uses the normal approximation for $\\lambda$ above about 10 to 20, with a continuity correction of $\\tfrac12$.', relation: 'poisson--normal', to: 'normal' },
      { text: '<b>Limit of the negative binomial.</b> A negative binomial count with mean $\\mu$ and size $r$ approaches $\\mathrm{Poisson}(\\mu)$ as $r \\to \\infty$. Conversely, a Poisson count whose mean is itself gamma distributed is negative binomial.', relation: 'poisson--negative-binomial', to: 'negative-binomial' },
      { text: '<b>Very small mean.</b> As $\\lambda \\to 0$ the count is almost always 0, and $P(X \\ge 1) \\approx \\lambda$. A Poisson count is then nearly a $\\mathrm{Bernoulli}(\\lambda)$ variable.', to: 'bernoulli' },
      { text: '<b>Zero-inflated Poisson.</b> When some units can never produce an event (for example, people who never visit a doctor), counts have more zeros than a Poisson allows. The zero-inflated Poisson mixes a point mass at 0, with probability $\\pi$, and a $\\mathrm{Poisson}(\\lambda)$ count, with probability $1 - \\pi$: $P(X = 0) = \\pi + (1 - \\pi)e^{-\\lambda}$. It has no tile on the map; the negative binomial is the other common remedy for excess zeros.' },
      { text: '<b>Sums, splitting and thinning.</b> Independent Poisson counts add up to a Poisson count with the summed mean. If each event is kept independently with probability $q$, the kept events are $\\mathrm{Poisson}(q\\lambda)$ and the discarded ones are an independent $\\mathrm{Poisson}((1-q)\\lambda)$. Given their total, independent Poisson counts split according to a multinomial distribution.', to: 'multinomial' },
    ],

    uses: {
      frequentist: [
        '<b>Poisson regression.</b> A generalized linear model with a log link, $\\ln \\mathrm{E}[X_i] = x_i^\\top b + \\ln t_i$, for counts and rates (events per person-year, spikes per second). The coefficients are log rate ratios. When the counts are overdispersed, quasi-Poisson or negative binomial regression is used instead, or robust standard errors.',
        '<b>Log-linear models for contingency tables.</b> Cell counts of a table are modeled as independent Poisson counts. Conditional on the total, this gives the same inferences as the multinomial model, including the chi-squared test of independence.',
        '<b>Exact tests and intervals for rates.</b> The Garwood interval uses the link between the Poisson CDF and chi-squared quantiles. Two rates are compared with the conditional binomial test: given the total of two Poisson counts, each count is binomial.',
        '<b>Checking the Poisson assumption.</b> The index of dispersion test compares $\\sum (x_i - \\bar x)^2 / \\bar x$ with a chi-squared distribution with $n - 1$ degrees of freedom; a large value indicates overdispersion. Goodness-of-fit tests compare observed frequencies of $0, 1, 2, \\dots$ with Poisson probabilities.',
      ],
      bayesian: [
        '<b>Conjugate gamma prior.</b> With a $\\mathrm{Gamma}(\\alpha, \\beta)$ prior on $\\lambda$ and counts $x_1, \\dots, x_n$, the posterior is $\\mathrm{Gamma}(\\alpha + \\sum x_i,\\ \\beta + n)$. The posterior mean $(\\alpha + \\sum x_i)/(\\beta + n)$ is a weighted average of the prior mean $\\alpha/\\beta$ and the sample mean $\\bar x$. The Jeffreys prior $p(\\lambda) \\propto \\lambda^{-1/2}$ gives the posterior $\\mathrm{Gamma}(\\sum x_i + \\tfrac12,\\ n)$.',
        '<b>Posterior predictive.</b> Averaging the Poisson over the gamma posterior gives a negative binomial distribution for a future count, which is wider than any single Poisson because it includes the uncertainty about $\\lambda$.',
        '<b>Hierarchical and spatial models.</b> Poisson likelihoods with a log-normal or gamma random effect per unit (hospitals, regions, neurons) are standard multilevel models; disease mapping (the Besag–York–Mollié model) and log-Gaussian Cox processes add spatial structure to the log rate.',
      ],
      modeling: [
        '<b>Neural spike counts.</b> The Poisson spiking model treats spikes as a Poisson process whose rate follows the stimulus. It predicts a Fano factor (variance divided by mean) of 1, the baseline against which neural variability is compared.',
        '<b>Photon counts and the limits of vision.</b> The number of photons absorbed from a dim flash is Poisson. Hecht, Shlaer and Pirenne (1942) used this to infer that only a few absorbed quanta are needed to see a flash. Photon (shot) noise in cameras and microscopes is Poisson for the same reason.',
        '<b>Queues and arrivals.</b> Arrivals of customers, calls or requests are often modeled as a Poisson process, the “M” (Markovian) arrival assumption in queueing models such as M/M/1.',
        '<b>Physics and biology.</b> Radioactive decay counts, mutations in a stretch of DNA and the number of cells or particles in a counting chamber are classic Poisson counts. The Luria–Delbrück fluctuation test (1943) showed that bacterial mutations arise before selection because the counts of resistant colonies were far more variable than a Poisson.',
        '<b>Simulation.</b> Poisson random numbers are used to simulate point processes: draw the number of events from a Poisson distribution, then place them uniformly at random in the interval.',
      ],
    },

    references: [
      { text: 'Wikipedia: Poisson distribution.', url: 'https://en.wikipedia.org/wiki/Poisson_distribution' },
      { text: 'Casella, G., & Berger, R. L. (2002). <i>Statistical Inference</i> (2nd ed.), Section 3.2. Duxbury.' },
      { text: 'Johnson, N. L., Kemp, A. W., & Kotz, S. (2005). <i>Univariate Discrete Distributions</i> (3rd ed.), Chapter 4 (Poisson distribution). Wiley.', url: 'https://doi.org/10.1002/0471715816' },
      { text: 'Gelman, A., Carlin, J. B., Stern, H. S., Dunson, D. B., Vehtari, A., & Rubin, D. B. (2013). <i>Bayesian Data Analysis</i> (3rd ed.), Section 2.6 and Appendix A. CRC Press.', url: 'http://www.stat.columbia.edu/~gelman/book/' },
      { text: 'Leemis, L. M., & McQueston, J. T. (2008). Univariate distribution relationships. <i>The American Statistician</i>, 62(1), 45–53.', url: 'https://doi.org/10.1198/000313008X270448' },
      { text: 'Choi, K. P. (1994). On the medians of gamma distributions and an equation of Ramanujan. <i>Proceedings of the American Mathematical Society</i>, 121(1), 245–251.', url: 'https://doi.org/10.1090/S0002-9939-1994-1195477-8' },
      { text: 'Hecht, S., Shlaer, S., & Pirenne, M. H. (1942). Energy, quanta, and vision. <i>Journal of General Physiology</i>, 25(6), 819–840.', url: 'https://doi.org/10.1085/jgp.25.6.819' },
    ],
  },
};
