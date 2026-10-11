// Discrete uniform distribution on the integers a, a+1, ..., b.
// Follows the structure of the reference module dists/normal.js (see ARCHITECTURE.md).

import { catalogParams } from '../catalog.js';

const count = ({ a, b }) => b - a + 1;

function pdf(k, p) {
  if (!Number.isInteger(k) || k < p.a || k > p.b) return 0;
  return 1 / count(p);
}

function cdf(x, p) {
  const k = Math.floor(x);
  if (k < p.a) return 0;
  if (k >= p.b) return 1;
  return (k - p.a + 1) / count(p);
}

/** Smallest integer k with F(k) >= u. */
function quantile(u, p) {
  const n = count(p);
  if (u <= 0) return p.a;
  if (u >= 1) return p.b;
  // F(k) = (k - a + 1)/n >= u  <=>  k >= a - 1 + u n; guard against rounding in u n
  let k = p.a - 1 + Math.ceil(u * n - 1e-12);
  k = Math.max(p.a, Math.min(p.b, k));
  while (k > p.a && cdf(k - 1, p) >= u) k--;
  return k;
}

function stats(p) {
  const n = count(p);
  const variance = (n * n - 1) / 12;
  return {
    mean: (p.a + p.b) / 2,
    variance,
    sd: Math.sqrt(variance),
    median: quantile(0.5, p),
    // every value is equally likely; by the site convention the largest tied value is reported
    mode: p.b,
    skewness: n > 1 ? 0 : NaN,
    exKurtosis: n > 1 ? -6 * (n * n + 1) / (5 * (n * n - 1)) : NaN,
    entropy: Math.log(n),
  };
}

export default {
  id: 'discrete-uniform',
  name: 'Discrete uniform',
  kind: 'discrete',

  params: catalogParams('discrete-uniform'),

  pdf,
  cdf,
  sf: (x, p) => 1 - cdf(x, p),
  quantile,
  sample: (rng, { a, b }) => rng.int(a, b),

  testParams: [{ a: 0, b: 1 }, { a: -5, b: 12 }, { a: 3, b: 3 }, { a: -10, b: 20 }],

  /** True support. */
  range: ({ a, b }) => [a, b],
  /** Plotting window: one empty value on each side shows where the support ends. */
  support: ({ a, b }) => [a - 1, b + 1],

  stats,

  // keep a <= b by pushing the other end along, so that a drag never gets stuck
  normalize(p, changedKey) {
    const q = { ...p };
    if (q.a > q.b) {
      if (changedKey === 'b') q.a = q.b;
      else q.b = q.a;
    }
    return q;
  },

  // Two markers under the axis, at the smallest and the largest value. Each draws a dashed line up to
  // the bar height 1/n. Dragging one end past the other pushes the other end along.
  handles: [
    { type: 'xPoint', param: 'a', label: 'a', lineTo: p => 1 / count(p),
      ariaLabel: 'Lower bound a. Drag left or right, or use the arrow keys.' },
    { type: 'xPoint', param: 'b', label: 'b', lineTo: p => 1 / count(p),
      ariaLabel: 'Upper bound b. Drag left or right, or use the arrow keys.' },
  ],

  explorer: {
    readouts: [
      { label: 'Number of values n = b − a + 1', value: p => count(p) },
      { label: 'Probability of each value 1/n', value: p => 1 / count(p) },
      { key: 'mean', label: 'Mean (a + b)/2' },
      { key: 'sd', label: 'Standard deviation' },
    ],
  },

  content: {
    summary: 'The discrete uniform distribution gives the same probability to each whole number from a lower bound $a$ to an upper bound $b$, as in the roll of a fair die. It models fair randomization (dice, lotteries, random assignment) and “no preference” priors.',
    description: [
      'The discrete uniform distribution gives the same probability to each whole number in a range. The roll of a fair six-sided die is the standard example: each of the values 1, 2, 3, 4, 5 and 6 comes up with probability $1/6$. Picking a ticket at random from tickets numbered 1 to 100, or a random position in a list, works the same way.',
      'The variable takes the consecutive integer values $a, a+1, \\dots, b$. The lower bound $a$ and the upper bound $b$ are the two parameters, and they set where the range starts and ends. There are $n = b - a + 1$ possible values, each with probability $1/n$. Nothing else about the shape can change: it is always flat.',
      'It describes complete ignorance among a finite set of possibilities, so it appears both as a model of fair randomization (dice, lotteries, random assignment) and as a "no preference" prior over a finite set of hypotheses.',
    ],
    explorerIntro: 'The left plot shows the probability of each value $k$ as a stem, and the right plot the cumulative probability $F(k)$, which climbs in equal steps of $1/n$. Drag the amber marker labeled $a$ under the axis to move the lower end of the range, and the marker labeled $b$ to move the upper end. If you drag one end past the other, the other end moves along so that $a \\le b$. Every stem is $1/n$ tall, so widening the range makes all of them shorter.',

    pdfTex: 'P(X = k) = \\frac{1}{n} = \\frac{1}{b - a + 1}, \\qquad k \\in \\{a, a+1, \\dots, b\\}',
    glossary: [
      { sym: 'X', meaning: 'The random variable: the value that comes up.' },
      { sym: 'k', meaning: 'A possible value of $X$. It is a whole number from $a$ to $b$; every other value has probability 0.' },
      { sym: 'P(X = k)', meaning: 'The probability that $X$ equals $k$ (the probability mass function).' },
      { sym: 'a', meaning: 'The lower bound: the smallest value $X$ can take (1 for a die).' },
      { sym: 'b', meaning: 'The upper bound: the largest value $X$ can take (6 for a die). It must satisfy $b \\ge a$.' },
      { sym: 'n = b - a + 1', meaning: 'The number of possible values. For a die, $n = 6 - 1 + 1 = 6$.' },
      { sym: '\\{a, a+1, \\dots, b\\}', meaning: 'The set of consecutive integers from $a$ to $b$, which is the support.' },
    ],

    cdfTex: 'F(x) = P(X \\le x) = \\begin{cases} 0, & x < a \\\\ (\\lfloor x \\rfloor - a + 1)/n, & a \\le x < b \\\\ 1, & x \\ge b \\end{cases}',
    cdfGlossary: [
      { sym: 'F(x)', meaning: 'The cumulative distribution function: the probability that $X$ is at most $x$. It is a staircase with $n$ equal steps of height $1/n$, one at each value $a, \\dots, b$.' },
      { sym: 'P(X \\le x)', meaning: 'The probability that $X$ takes a value less than or equal to $x$.' },
      { sym: 'x', meaning: 'Any real number at which the CDF is evaluated; it need not be a whole number.' },
      { sym: '\\lfloor x \\rfloor', meaning: 'The floor of $x$: $x$ rounded down to a whole number. It counts how many values of the support lie at or below $x$.' },
      { sym: 'a,\\ b,\\ n', meaning: 'The lower bound, the upper bound and the number of values $n = b - a + 1$, as above.' },
    ],
    extraFormulas: [
      {
        title: 'Quantile function',
        intro: 'The smallest value $k$ with $F(k) \\ge u$. It is how a computer turns a uniform random number into a die roll.',
        tex: 'Q(u) = a - 1 + \\lceil n u \\rceil, \\qquad 0 < u \\le 1',
        glossary: [
          { sym: 'u', meaning: 'A probability between 0 and 1.' },
          { sym: '\\lceil \\cdot \\rceil', meaning: 'The ceiling: round up to the next whole number.' },
          { sym: 'Q(u)', meaning: 'The value below or at which a fraction $u$ of the probability lies.' },
        ],
      },
    ],

    properties: [
      { name: 'Support', tex: 'k \\in \\{a, a+1, \\dots, b\\}', value: p => (p.a === p.b ? fmtN(p.a) : p.b === p.a + 1 ? `${fmtN(p.a)}, ${fmtN(p.b)}` : `${fmtN(p.a)}, …, ${fmtN(p.b)}`), explain: 'The $n = b - a + 1$ consecutive whole numbers from $a$ to $b$.' },
      { name: 'Mean', tex: '\\mathrm{E}[X] = \\frac{a + b}{2}', value: p => (p.a + p.b) / 2, explain: 'The midpoint of the range. For a die it is 3.5, which is not itself a possible roll.' },
      { name: 'Median', tex: 'a - 1 + \\lceil n/2 \\rceil', value: p => quantile(0.5, p), explain: 'The smallest value with at least half the probability at or below it. When $n$ is odd this is the middle value $(a + b)/2$. When $n$ is even, every number between the two middle values is a median; the value shown is the lower one (3 for a die).' },
      { name: 'Mode', tex: '\\text{every } k \\in \\{a, \\dots, b\\}', value: p => p.b, explain: 'All values are equally likely, so every value is a mode. The value column shows $b$, because this site reports the largest value when several values tie.' },
      { name: 'Variance', tex: '\\mathrm{Var}(X) = \\frac{n^2 - 1}{12}', value: p => stats(p).variance, explain: 'Grows with the square of the number of values. For a die, $(36 - 1)/12 \\approx 2.917$. It does not depend on where the range starts.' },
      { name: 'Standard deviation', tex: '\\sqrt{\\frac{n^2 - 1}{12}}', value: p => stats(p).sd, explain: 'About $n/\\sqrt{12} \\approx 0.2887\\,n$ for large $n$, the same as for the continuous uniform distribution on an interval of length $n$.' },
      { name: 'Skewness', tex: '0', value: p => stats(p).skewness, explain: 'The distribution is symmetric about its mean. (Undefined when $a = b$, because then there is no spread.)' },
      { name: 'Excess kurtosis', tex: '-\\frac{6(n^2 + 1)}{5(n^2 - 1)}', value: p => stats(p).exKurtosis, explain: 'Negative, because the distribution has no tails at all: it stops abruptly at $a$ and $b$. It equals $-2$ for $n = 2$ (the most negative value any distribution can have) and approaches $-6/5$, the value for the continuous uniform, as $n$ grows. Undefined when $n = 1$.' },
      { name: 'Entropy', tex: '\\ln n', value: p => Math.log(count(p)), explain: 'In nats. Among all distributions on $n$ values, the uniform one has the largest entropy: it is the least predictable.' },
      { name: 'Probability-generating function', tex: 'G(z) = \\mathrm{E}[z^X] = \\frac{z^a - z^{b+1}}{n\\,(1 - z)}', explain: 'The polynomial $\\frac1n(z^a + z^{a+1} + \\dots + z^b)$ written in closed form ($z \\ne 1$; $G(1) = 1$). Its derivatives at $z = 1$ give the factorial moments.' },
      { name: 'Moment-generating function', tex: 'M(t) = \\frac{e^{at} - e^{(b+1)t}}{n\\,(1 - e^{t})}', explain: '$\\mathrm{E}[e^{tX}]$ for $t \\ne 0$ (and $M(0) = 1$). It is $G(e^t)$.' },
      { name: 'Characteristic function', tex: '\\varphi(t) = \\frac{e^{iat} - e^{i(b+1)t}}{n\\,(1 - e^{it})}', explain: '$\\mathrm{E}[e^{itX}]$, where $i = \\sqrt{-1}$.' },
      { name: 'Sum of two draws', tex: 'P(X_1 + X_2 = s) = \\frac{n - |s - (a + b)|}{n^2},\\ \\ s = 2a, \\dots, 2b', value: p => `P(sum = ${fmtN(p.a + p.b)}) = ${fmtN(1 / count(p))}`, explain: 'Here $X_1$ and $X_2$ are two independent draws and $s$ is a possible value of their sum. The sum of two independent discrete uniform variables on the same range is not uniform: it has a triangular shape, highest at the middle value $a + b$ (7 for two dice, with probability $6/36$).' },
    ],

    limits: [
      { text: '<b>Bernoulli with $p = 1/2$.</b> The discrete uniform on the two values $\\{0, 1\\}$ is the Bernoulli distribution with $p = 1/2$, a fair coin. This is the only overlap between the two families.', relation: 'discrete-uniform--bernoulli', to: 'bernoulli' },
      { text: '<b>Beta-binomial with $\\alpha = \\beta = 1$.</b> If the success probability of a binomial count is itself drawn from a flat $\\mathrm{Uniform}(0, 1)$ distribution, the count is discrete uniform on $\\{0, 1, \\dots, n\\}$. This is the result behind Bayes’ billiard-table argument.', relation: 'beta-binomial--discrete-uniform', to: 'beta-binomial' },
      { text: '<b>Continuous uniform as a limit.</b> Rescaling a discrete uniform on $\\{1, \\dots, n\\}$ to $X/n$ gives a fine grid of equally likely points in $(0, 1]$; as $n \\to \\infty$ it approaches the continuous $\\mathrm{Uniform}(0, 1)$ distribution. In the other direction, $a + \\lfloor (b - a + 1)U \\rfloor$ with $U \\sim \\mathrm{Uniform}(0, 1)$ is discrete uniform on $\\{a, \\dots, b\\}$.', relation: 'uniform--discrete-uniform', to: 'uniform' },
      { text: '<b>A single point.</b> With $a = b$ the distribution puts all its probability on one value (a degenerate distribution with variance 0).' },
      { text: '<b>Categorical with equal probabilities.</b> A categorical distribution over $K$ categories with every $p_j = 1/K$ is the discrete uniform on the labels $\\{1, \\dots, K\\}$.', to: 'categorical' },
    ],

    uses: {
      frequentist: [
        '<b>Estimating the size of a numbered population (the German tank problem).</b> If serial numbers $1, \\dots, N$ are sampled without replacement, the largest observed number $m$ in a sample of size $s$ gives the minimum-variance unbiased estimator $\\hat N = m + m/s - 1$. It was used in World War II to estimate German tank production from captured serial numbers.',
        '<b>Permutation and rank tests.</b> Under the null hypothesis of a permutation test every rearrangement of the labels is equally likely, so the test statistic is computed over a discrete uniform distribution on the permutations. The null distributions of rank statistics (Wilcoxon rank-sum, Kruskal–Wallis, Spearman’s rank correlation) are derived this way.',
        '<b>Monte Carlo p-values.</b> If the observed statistic and $m$ simulated statistics are exchangeable under the null hypothesis, the rank of the observed one among the $m + 1$ values (with ties broken at random) is discrete uniform on $\\{1, \\dots, m + 1\\}$. This gives exact p-values for Monte Carlo and randomization tests.',
        '<b>Testing whether a die or a random number generator is fair.</b> The chi-squared goodness-of-fit test compares observed counts of each face with the equal expected counts of a discrete uniform distribution.',
      ],
      bayesian: [
        '<b>Prior over a finite set of hypotheses.</b> The principle of indifference assigns equal prior probability $1/n$ to each of $n$ candidate values, for example the location of a change point in a time series, the number of components in a small model comparison, or the population size in the German tank problem. The posterior is then proportional to the likelihood.',
        '<b>Simulation-based calibration.</b> If a Bayesian sampler is correct, the rank of a parameter value drawn from the prior among $L$ posterior draws (from data simulated with that value) is discrete uniform on $\\{0, \\dots, L\\}$. Deviations from a flat rank histogram reveal bias or poorly calibrated uncertainty (Talts et al., 2018).',
        '<b>Prior predictive of a binomial count under a flat prior.</b> With $p \\sim \\mathrm{Beta}(1, 1)$, every number of successes $0, \\dots, n$ has prior predictive probability $1/(n + 1)$ (the beta-binomial with $\\alpha = \\beta = 1$).',
      ],
      modeling: [
        '<b>Random number generation.</b> A random integer from $a$ to $b$ is generated as $a + \\lfloor (b - a + 1)U \\rfloor$ from a uniform random number $U$. Shuffling a list (the Fisher–Yates algorithm), drawing bootstrap resamples (each index uniform on $\\{1, \\dots, n\\}$) and random assignment of participants to conditions all rely on it.',
        '<b>Experimental design.</b> Randomizing trial order, stimulus selection and condition assignment uses discrete uniform draws so that no condition is favored systematically.',
        '<b>Guessing in cognitive models.</b> In models of memory and choice, a participant who guesses among $K$ response options picks each with probability $1/K$; mixture models of recall and multiple-choice accuracy include this guessing component, and $1/K$ is the chance level.',
        '<b>Games, lotteries and cryptography.</b> Dice, roulette and lotteries are designed to be discrete uniform, and cryptographic keys are drawn uniformly from a huge finite set so that every key is equally hard to guess.',
      ],
    },

    references: [
      { text: 'Wikipedia: Discrete uniform distribution.', url: 'https://en.wikipedia.org/wiki/Discrete_uniform_distribution' },
      { text: 'Wikipedia: German tank problem.', url: 'https://en.wikipedia.org/wiki/German_tank_problem' },
      { text: 'Casella, G., & Berger, R. L. (2002). <i>Statistical Inference</i> (2nd ed.), Section 3.2. Duxbury.' },
      { text: 'Johnson, N. L., Kemp, A. W., & Kotz, S. (2005). <i>Univariate Discrete Distributions</i> (3rd ed.), Section 6.10. Wiley.' },
      { text: 'Leemis, L. M., & McQueston, J. T. (2008). Univariate distribution relationships. <i>The American Statistician</i>, 62(1), 45–53.', url: 'https://doi.org/10.1198/000313008X270448' },
      { text: 'Talts, S., Betancourt, M., Simpson, D., Vehtari, A., & Gelman, A. (2018). Validating Bayesian inference algorithms with simulation-based calibration. arXiv:1804.06788.', url: 'https://arxiv.org/abs/1804.06788' },
    ],
  },
};

function fmtN(v) { return String(Number(Number(v).toPrecision(4))).replace(/^-/, '−'); }
