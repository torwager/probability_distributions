// Geometric distribution: the number of failures K before the first success in independent
// Bernoulli(p) trials (support 0, 1, 2, ...), so that Geometric(p) = NegBin(1, p).
// Follows the structure of the reference module dists/normal.js (see ARCHITECTURE.md).

import { catalogParams } from '../catalog.js';
import { quantileDiscrete } from '../core/math.js';

// P(K = k) = (1 - p)^k p, computed in log space
function pdf(k, { p }) {
  if (!Number.isInteger(k) || k < 0) return 0;
  if (p >= 1) return k === 0 ? 1 : 0;
  return Math.exp(k * Math.log1p(-p) + Math.log(p));
}

// P(K <= x) = 1 - (1 - p)^(floor(x) + 1); expm1 keeps it accurate when p is small
function cdf(x, { p }) {
  const k = Math.floor(x);
  if (k < 0) return 0;
  if (p >= 1) return 1;
  return -Math.expm1((k + 1) * Math.log1p(-p));
}

function sf(x, { p }) {
  const k = Math.floor(x);
  if (k < 0) return 1;
  if (p >= 1) return 0;
  return Math.exp((k + 1) * Math.log1p(-p));
}

// closed form ceil(ln(1 - u)/ln(1 - p)) - 1 as the starting guess; quantileDiscrete makes it exact
function quantile(u, prm) {
  const { p } = prm;
  if (p >= 1) return 0;
  const g = Math.ceil(Math.log1p(-Math.min(u, 1 - 1e-16)) / Math.log1p(-p)) - 1;
  return quantileDiscrete(x => cdf(x, prm), u, 0, Infinity, Math.max(0, Number.isFinite(g) ? g - 1 : 0));
}

function stats(prm) {
  const { p } = prm;
  const q = 1 - p;
  if (p >= 1) return { mean: 0, variance: 0, sd: 0, median: 0, mode: 0, skewness: NaN, exKurtosis: NaN, entropy: 0 };
  const v = q / (p * p);
  return {
    mean: q / p,
    variance: v,
    sd: Math.sqrt(v),
    median: quantile(0.5, prm),
    mode: 0,
    skewness: (2 - p) / Math.sqrt(q),
    exKurtosis: 6 + p * p / q,
    entropy: (-q * Math.log(q) - p * Math.log(p)) / p,
  };
}

export default {
  id: 'geometric',
  name: 'Geometric',
  kind: 'discrete',

  // p runs from 0.01 to 1, so the slider is logarithmic (the mean (1 - p)/p spans 0 to 99)
  params: catalogParams('geometric', { p: { step: 0.01 } }),

  pdf,
  cdf,
  sf,
  quantile,
  sample: (rng, { p }) => rng.geometric(p),

  testParams: [{ p: 0.01 }, { p: 0.05 }, { p: 0.5 }, { p: 0.9 }, { p: 1 }],

  range: () => [0, Infinity],
  // up to about the 0.9995 quantile, and never fewer than 7 stems
  support: prm => [0, Math.max(6, quantile(0.9995, prm))],

  stats,

  // - a dashed line at the mean (1 - p)/p: drag it to move the mean, which sets p = 1/(1 + mean);
  // - a vertical arrow on the stem at k = 0, whose height is P(K = 0) = p: drag its tip up or down.
  handles: [
    {
      type: 'vline', param: 'p', id: 'vline-mean', label: 'mean',
      x: ({ p }) => (1 - p) / p,
      set: pt => ({ p: 1 / (1 + Math.max(pt.x, 0)) }),
      ariaLabel: 'Mean number of failures (1 − p)/p. Drag left or right to change the success probability p, or use the arrow keys.',
    },
    {
      type: 'vArrow', param: 'p', id: 'varrow-p', label: 'p',
      from: () => ({ x: 0, y: 0 }),
      to: ({ p }) => ({ x: 0, y: p }),
      set: pt => ({ p: pt.y }),
      ariaLabel: 'Success probability p, the height of the stem at k = 0. Drag up or down, or use the arrow keys.',
    },
  ],

  explorer: {
    varName: 'K',
    // leave head room above the tallest stem, P(K = 0) = p, so that the arrow at k = 0 can be dragged upward
    yMax: ({ p }) => Math.min(0.94, 1.45 * p),
    readouts: [
      { key: 'mean', label: 'Mean (1 − p)/p' },
      { key: 'sd', label: 'Standard deviation √(1 − p)/p' },
      { key: 'median', label: 'Median' },
      { label: 'Mean number of trials 1/p', value: ({ p }) => 1 / p },
      { label: 'P(K ≥ 5) = (1 − p)⁵', value: prm => sf(4, prm) },
    ],
  },

  content: {
    description: [
      'The geometric distribution describes how long you wait for the first success in a sequence of independent tries that all have the same chance of success. Examples are the number of failed free throws before the first basket, the number of non-matching trials before a participant first answers correctly when guessing, or the number of rejected proposals before a rejection sampler accepts one.',
      'On this site the geometric variable $K$ counts the <b>failures before the first success</b>, so it takes the whole-number values $0, 1, 2, \\dots$ with no upper limit. Many textbooks instead count the trials up to and including the first success, $Y = K + 1$, which takes the values $1, 2, 3, \\dots$; the two versions differ only by a shift of one. The single parameter $p$ is the probability of success on each trial. The most likely value is always $K = 0$ (success on the first try), and the probabilities then shrink by the same factor $1 - p$ with every further failure, so a small $p$ gives a long, slowly decaying tail.',
      'The geometric distribution is the discrete counterpart of the exponential distribution. Both are memoryless: having already failed many times does not change the chance of succeeding on the next trial.',
    ],
    explorerIntro: 'The left plot shows the probability of each count $k$ of failures as a stem, and the right plot the cumulative probability $F(k)$. There are two amber handles, and both change $p$. The dashed line marks the mean number of failures $(1-p)/p$; drag it to the right for a longer expected wait (smaller $p$) or to the left for a shorter one. The vertical arrow on the stem at $k = 0$ has height $P(K = 0) = p$, the chance that the very first trial succeeds; drag its tip up or down. The view widens after you let go, so a second drag can go further.',

    pdfTex: 'P(K = k) = (1 - p)^{k}\\, p, \\qquad k = 0, 1, 2, \\dots',
    glossary: [
      { sym: 'K', meaning: 'The random number of failures before the first success.' },
      { sym: 'k', meaning: 'A possible number of failures: a whole number $0, 1, 2, \\dots$' },
      { sym: 'P(K = k)', meaning: 'The probability that exactly $k$ failures happen before the first success.' },
      { sym: 'p', meaning: 'The success probability of each trial, with $0 < p \\le 1$.' },
      { sym: '1 - p', meaning: 'The failure probability of each trial.' },
      { sym: '(1 - p)^{k}\\, p', meaning: 'The probability of the one sequence that gives $K = k$: $k$ failures in a row (each with probability $1 - p$, multiplied because the trials are independent) followed by a success (probability $p$).' },
    ],

    cdfTex: 'F(x) = P(K \\le x) = 1 - (1 - p)^{\\lfloor x \\rfloor + 1}, \\qquad x \\ge 0',
    cdfGlossary: [
      { sym: 'F(x)', meaning: 'The cumulative distribution function: the probability of at most $x$ failures before the first success. It is a staircase that steps up at $0, 1, 2, \\dots$ and approaches 1.' },
      { sym: 'P(K \\le x)', meaning: 'The probability that the number of failures is less than or equal to $x$.' },
      { sym: '\\lfloor x \\rfloor', meaning: 'The floor of $x$: $x$ rounded down to a whole number.' },
      { sym: '(1 - p)^{\\lfloor x \\rfloor + 1}', meaning: 'The probability that the first $\\lfloor x \\rfloor + 1$ trials all fail, which is exactly the event $K > x$. Subtracting it from 1 gives $F(x)$, so no sum is needed.' },
      { sym: 'p', meaning: 'The success probability of each trial.' },
    ],

    extraFormulas: [
      {
        title: 'The other convention: counting trials',
        intro: 'Some books, and some software, define the geometric variable as the number of trials $Y$ up to and including the first success. It is the count used here plus one, so every formula shifts by one and the mean grows by 1.',
        tex: 'Y = K + 1, \\qquad P(Y = y) = (1 - p)^{y - 1} p,\\ \\ y = 1, 2, \\dots, \\qquad \\mathrm{E}[Y] = \\frac{1}{p}',
        glossary: [
          { sym: 'Y', meaning: 'The number of trials needed to get the first success, counting the success itself.' },
          { sym: 'y', meaning: 'A possible number of trials: $1, 2, 3, \\dots$' },
          { sym: '\\mathrm{E}[Y]', meaning: 'The expected number of trials. A success with probability $p$ takes $1/p$ trials on average, for example 6 rolls of a die to get a six.' },
        ],
      },
      {
        title: 'Memorylessness and constant hazard',
        intro: 'Knowing that the first $m$ trials have failed does not change the distribution of the remaining wait. Equivalently, the chance that the success comes at trial $k$, given that it has not come before, is $p$ for every $k$. The geometric is the only distribution on $\\{0, 1, 2, \\dots\\}$ with this property.',
        tex: 'P(K \\ge m + n \\mid K \\ge m) = P(K \\ge n) = (1 - p)^{n}, \\qquad P(K = k \\mid K \\ge k) = p',
        glossary: [
          { sym: 'm,\\ n', meaning: 'Whole numbers of failures: $m$ already observed, $n$ more.' },
          { sym: 'P(A \\mid B)', meaning: 'The probability of $A$ once we know that $B$ has happened.' },
          { sym: 'P(K \\ge n) = (1 - p)^{n}', meaning: 'The survival function: the probability that the first $n$ trials all fail.' },
        ],
      },
      {
        title: 'Likelihood and the Beta posterior',
        intro: 'For $n$ independent observed waits $k_1, \\dots, k_n$, the likelihood is $p^{n}(1 - p)^{\\sum k_i}$. The maximum-likelihood estimate is $\\hat p = 1/(1 + \\bar k)$, where $\\bar k$ is the average number of failures. With a $\\mathrm{Beta}(\\alpha, \\beta)$ prior on $p$ the posterior is again a Beta distribution:',
        tex: 'p \\mid k_1, \\dots, k_n \\ \\sim\\ \\mathrm{Beta}\\Big(\\alpha + n,\\ \\beta + \\sum_{i=1}^{n} k_i\\Big)',
        glossary: [
          { sym: 'k_1, \\dots, k_n', meaning: 'The observed numbers of failures in $n$ independent repetitions.' },
          { sym: '\\alpha,\\ \\beta', meaning: 'The parameters of the Beta prior for $p$; they act like prior counts of successes and failures.' },
          { sym: '\\sum_{i=1}^{n} k_i', meaning: 'The total number of failures observed. Each repetition contributes one success, so there are $n$ successes in all.' },
        ],
      },
    ],

    properties: [
      { name: 'Support', tex: 'k \\in \\{0, 1, 2, \\dots\\}', value: () => '0, 1, 2, …', explain: 'Any whole number of failures. There is no upper limit, although long waits are rare unless $p$ is small.' },
      { name: 'Mean', tex: '\\mathrm{E}[K] = \\frac{1 - p}{p}', value: prm => stats(prm).mean, explain: 'The average number of failures before the first success. Adding the success itself gives the familiar $1/p$ trials.' },
      { name: 'Median', tex: '\\left\\lceil \\frac{-1}{\\log_2(1 - p)} \\right\\rceil - 1', value: prm => stats(prm).median, explain: 'The smallest $k$ with $F(k) \\ge 1/2$; here $\\lceil \\cdot \\rceil$ rounds up to a whole number. It is below the mean, because the distribution has a long right tail. When $-1/\\log_2(1 - p)$ is a whole number (for example $p = 1/2$) the median is not unique, and the smaller value is shown. For $p = 1$ the formula does not apply and the median is 0.' },
      { name: 'Mode', tex: '0', value: () => 0, explain: 'The most likely outcome is always immediate success: each extra failure multiplies the probability by $1 - p < 1$.' },
      { name: 'Variance', tex: '\\mathrm{Var}(K) = \\frac{1 - p}{p^2}', value: prm => stats(prm).variance, explain: 'Always larger than the mean (by the factor $1/p$), so the geometric is overdispersed compared with a Poisson count with the same mean.' },
      { name: 'Standard deviation', tex: '\\frac{\\sqrt{1 - p}}{p}', value: prm => stats(prm).sd, explain: 'For small $p$ it is close to the mean, as for the exponential distribution, whose standard deviation equals its mean.' },
      { name: 'Skewness', tex: '\\frac{2 - p}{\\sqrt{1 - p}}', value: prm => stats(prm).skewness, explain: 'Always positive (a long right tail). It is at least 2 and approaches 2, the skewness of the exponential, as $p \\to 0$. Undefined for $p = 1$, where $K = 0$ with certainty.' },
      { name: 'Excess kurtosis', tex: '6 + \\frac{p^2}{1 - p}', value: prm => stats(prm).exKurtosis, explain: 'At least 6 (the exponential value, reached as $p \\to 0$): the tail is much heavier than that of a normal distribution. Undefined for $p = 1$.' },
      { name: 'Entropy', tex: '\\frac{-(1 - p)\\ln(1 - p) - p \\ln p}{p}', value: prm => stats(prm).entropy, explain: 'In nats. It is the entropy of a single trial divided by $p$. Among all distributions on $\\{0, 1, 2, \\dots\\}$ with a given mean, the geometric has the largest entropy, just as the exponential does among continuous distributions on $[0, \\infty)$.' },
      { name: 'Probability-generating function', tex: 'G(z) = \\mathrm{E}[z^K] = \\frac{p}{1 - (1 - p) z}, \\quad |z| < \\frac{1}{1 - p}', explain: 'Raising it to the power $r$ gives the generating function of the negative binomial, which shows that a sum of $r$ independent geometric counts is $\\mathrm{NegBin}(r, p)$.' },
      { name: 'Moment-generating function', tex: 'M(t) = \\frac{p}{1 - (1 - p)e^{t}}, \\quad t < -\\ln(1 - p)', explain: '$\\mathrm{E}[e^{tK}]$; it exists only for $t$ below $-\\ln(1 - p)$, because the tail decays geometrically. Its derivatives at $t = 0$ give the moments.' },
      { name: 'Characteristic function', tex: '\\varphi(t) = \\frac{p}{1 - (1 - p)e^{it}}', explain: '$\\mathrm{E}[e^{itK}]$, where $i = \\sqrt{-1}$. It exists for every real $t$.' },
      { name: 'Survival function', tex: 'P(K \\ge k) = (1 - p)^{k}', value: prm => sf(4, prm), explain: 'The probability that the first $k$ trials all fail. The value shown is for $k = 5$. It falls by the constant factor $1 - p$ per step, which is what makes the distribution memoryless.' },
      { name: 'Hazard', tex: 'P(K = k \\mid K \\ge k) = p', value: prm => prm.p, explain: 'The chance of success on the next trial, given that all earlier trials failed, is the same at every step. A constant hazard is the defining feature of the geometric (discrete time) and the exponential (continuous time).' },
      { name: 'Quantile function', tex: 'Q(u) = \\left\\lceil \\frac{\\ln(1 - u)}{\\ln(1 - p)} \\right\\rceil - 1', value: prm => `${quantile(0.95, prm)} (u = 0.95)`, explain: 'The smallest $k$ with $F(k) \\ge u$. The value shown is the 95th percentile: with probability 0.95 the first success comes after at most this many failures.' },
    ],

    limits: [
      { text: '<b>Continuous limit: the exponential.</b> Split time into steps of length $1/n$ and let each step succeed with probability $p_n = \\lambda/n$. As $n \\to \\infty$, the waiting time $K/n$ (in time units) approaches $\\mathrm{Exp}(\\lambda)$. In the other direction, rounding an exponential waiting time $T \\sim \\mathrm{Exp}(\\lambda)$ down gives exactly $\\lfloor T \\rfloor \\sim \\mathrm{Geom}(1 - e^{-\\lambda})$. Equivalently, for small $p$, $pK$ is approximately $\\mathrm{Exp}(1)$.', relation: 'geometric--exponential', to: 'exponential' },
      { text: '<b>Special case of the negative binomial.</b> $\\mathrm{Geom}(p) = \\mathrm{NegBin}(1, p)$: waiting for one success. The sum of $r$ independent $\\mathrm{Geom}(p)$ counts is $\\mathrm{NegBin}(r, p)$, the number of failures before the $r$-th success.', relation: 'geometric--negative-binomial', to: 'negative-binomial' },
      { text: '<b>Certain success, $p = 1$.</b> The first trial always succeeds, so $K = 0$ with probability 1.' },
      { text: '<b>A Poisson count with an exponentially distributed rate.</b> If $\\lambda \\sim \\mathrm{Exp}(\\beta)$ (rate $\\beta$) and $X \\mid \\lambda \\sim \\mathrm{Poisson}(\\lambda)$, then $X \\sim \\mathrm{Geom}\\big(\\beta/(1 + \\beta)\\big)$. This is the case $r = 1$ of the gamma–Poisson mixture that produces the negative binomial.', to: 'poisson' },
      { text: '<b>Waiting in a Bernoulli sequence.</b> The geometric count is built from $\\mathrm{Bernoulli}(p)$ trials, and it is linked to the binomial count of the same trials: $P(K \\ge k) = P(\\text{no successes in the first } k \\text{ trials}) = (1 - p)^k$.', to: 'bernoulli' },
      { text: '<b>Minimum of geometric counts.</b> If $K_1, \\dots, K_m$ are independent with $K_j \\sim \\mathrm{Geom}(p_j)$, then $\\min_j K_j \\sim \\mathrm{Geom}\\big(1 - \\prod_j (1 - p_j)\\big)$: the first success among several parallel sequences, like the minimum of exponential times.' },
    ],

    uses: {
      frequentist: [
        '<b>Estimating a success probability from waiting times.</b> With observed failure counts $k_1, \\dots, k_n$ the maximum-likelihood estimate is $\\hat p = 1/(1 + \\bar k)$. Sampling until the first success (inverse sampling) is used when successes are rare, for example in screening or quality control.',
        '<b>Discrete-time survival analysis.</b> When an event can happen once per period (per trial, session or year) with a constant probability, the number of periods survived is geometric. Life tables and discrete-time hazard models (logistic regression on person-period data) generalize it by letting the hazard change over time.',
        '<b>Runs tests.</b> In a random sequence of independent trials, the lengths of runs of identical outcomes are geometric. Runs tests for randomness, such as the Wald–Wolfowitz runs test, compare the observed number of runs (and, in other tests, the length of the longest run) with what independent trials would produce.',
        '<b>Count regression.</b> The geometric is the negative binomial with $r = 1$, so geometric regression is negative binomial regression with the dispersion fixed; it is offered as a family in several GLM packages.',
      ],
      bayesian: [
        '<b>Conjugate Beta prior.</b> With a $\\mathrm{Beta}(\\alpha, \\beta)$ prior on $p$ and observed failure counts $k_1, \\dots, k_n$, the posterior is $\\mathrm{Beta}(\\alpha + n,\\ \\beta + \\sum k_i)$. The posterior predictive distribution of the next wait is the beta-geometric distribution, with $P(K = k) = B(\\alpha + n + 1,\\ \\beta + \\sum k_i + k)/B(\\alpha + n,\\ \\beta + \\sum k_i)$, where $B$ is the beta function.',
        '<b>Prior on a count or a model size.</b> A geometric prior puts most weight on small values and decreases steadily, so it is used as a simple prior on the number of change points, mixture components or terms in a model, especially in trans-dimensional samplers such as reversible-jump MCMC.',
        '<b>Stick-breaking weights.</b> If every piece of a stick-breaking construction takes the same fraction $p$ of what is left, the weights are $(1 - p)^k p$, the geometric probabilities. The Dirichlet process replaces the fixed fraction by $\\mathrm{Beta}(1, \\alpha)$ fractions.',
      ],
      modeling: [
        '<b>All-or-none learning.</b> In Bower’s (1961) one-element model of paired-associate learning, an unlearned item becomes learned on each trial with a fixed probability, so the number of trials before learning, and the trial of the last error, follow geometric distributions.',
        '<b>Rejection sampling.</b> Each proposal is accepted with the same overall probability $p = 1/M$, where $M$ is the bound on the ratio of the target density to the proposal density, so the number of rejections before an acceptance is $\\mathrm{Geom}(p)$ and the expected cost per accepted draw is $1/p$ proposals.',
        '<b>Discounting and random stopping.</b> In reinforcement learning, a discount factor $\\gamma$ between 0 and 1 is equivalent to an episode that ends after each step with probability $1 - \\gamma$; the number of steps before it ends is geometric with mean $\\gamma/(1 - \\gamma)$. The random surfer of PageRank follows a geometric number of links before jumping to a random page.',
        '<b>Reliability and queues.</b> The number of cycles a component survives when it fails on each cycle with probability $p$, and the number of customers in an M/M/1 queue in equilibrium, are geometric.',
        '<b>Coding.</b> Golomb and Rice codes, used in lossless audio and image compression, are optimal codes for geometrically distributed integers.',
      ],
    },

    references: [
      { text: 'Wikipedia: Geometric distribution.', url: 'https://en.wikipedia.org/wiki/Geometric_distribution' },
      { text: 'Casella, G., & Berger, R. L. (2002). <i>Statistical Inference</i> (2nd ed.), Section 3.2 (geometric distribution and memorylessness). Duxbury.' },
      { text: 'Johnson, N. L., Kemp, A. W., & Kotz, S. (2005). <i>Univariate Discrete Distributions</i> (3rd ed.), Chapter 5 (negative binomial and geometric distributions). Wiley.', url: 'https://doi.org/10.1002/0471715816' },
      { text: 'Leemis, L. M., & McQueston, J. T. (2008). Univariate distribution relationships. <i>The American Statistician</i>, 62(1), 45–53.', url: 'https://doi.org/10.1198/000313008X270448' },
      { text: 'Gelman, A., Carlin, J. B., Stern, H. S., Dunson, D. B., Vehtari, A., & Rubin, D. B. (2013). <i>Bayesian Data Analysis</i> (3rd ed.), Chapter 2 and Appendix A. CRC Press.', url: 'http://www.stat.columbia.edu/~gelman/book/' },
      { text: 'Bower, G. H. (1961). Application of a model to paired-associate learning. <i>Psychometrika</i>, 26(3), 255–280.', url: 'https://www.cambridge.org/core/journals/psychometrika/article/abs/application-of-a-model-to-pairedassociate-learning/A059F02D3583C0F6368941373F6282AB' },
    ],
  },
};
