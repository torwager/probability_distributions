// Hypergeometric distribution: the number of successes in n draws without replacement from a
// population of N items, K of which are successes.
// Follows the structure of the reference module dists/normal.js (see ARCHITECTURE.md).

import { catalogParams } from '../catalog.js';
import { logBinom, quantileDiscrete } from '../core/math.js';

/** Smallest and largest possible counts. */
const kLo = ({ N, K, n }) => Math.max(0, n + K - N);
const kHi = ({ K, n }) => Math.min(n, K);

function pdf(k, prm) {
  const { N, K, n } = prm;
  if (!Number.isInteger(k) || k < kLo(prm) || k > kHi(prm)) return 0;
  return Math.exp(logBinom(K, k) + logBinom(N - K, n - k) - logBinom(N, n));
}

// The support has at most 201 points, so the CDF is an exact running sum.
function cdf(x, prm) {
  const k = Math.floor(x), lo = kLo(prm), hi = kHi(prm);
  if (k < lo) return 0;
  if (k >= hi) return 1;
  let s = 0;
  for (let j = lo; j <= k; j++) s += pdf(j, prm);
  return Math.min(1, s);
}

function sf(x, prm) {
  const k = Math.floor(x), lo = kLo(prm), hi = kHi(prm);
  if (k < lo) return 1;
  if (k >= hi) return 0;
  let s = 0;
  for (let j = hi; j > k; j--) s += pdf(j, prm);
  return Math.min(1, s);
}

const quantile = (u, prm) => quantileDiscrete(x => cdf(x, prm), u, kLo(prm), kHi(prm), Math.floor(prm.n * prm.K / prm.N));

/** Mean nK/N, variance with the finite-population correction, and the other moments by exact summation. */
function stats(prm) {
  const { N, K, n } = prm;
  const q = K / N;
  const mean = n * q;
  const variance = N > 1 ? n * q * (1 - q) * (N - n) / (N - 1) : 0;
  let m3 = 0, m4 = 0, H = 0;
  for (let k = kLo(prm); k <= kHi(prm); k++) {
    const f = pdf(k, prm), d = k - mean;
    m3 += d * d * d * f; m4 += d * d * d * d * f;
    if (f > 0) H -= f * Math.log(f);
  }
  const ok = variance > 1e-12;
  return {
    mean,
    variance,
    sd: Math.sqrt(variance),
    median: quantile(0.5, prm),
    // floor((n + 1)(K + 1)/(N + 2)); when that ratio is a whole number it ties with the value below, and the larger is reported
    mode: Math.floor(((n + 1) * (K + 1)) / (N + 2)),
    skewness: ok ? m3 / variance ** 1.5 : NaN,
    exKurtosis: ok ? m4 / (variance * variance) - 3 : NaN,
    entropy: H,
  };
}

const fmtN = v => String(Number(Number(v).toPrecision(4))).replace(/^-/, '−');

// interpolated binomial PMF with the same n and p = K/N, drawn as a dashed reference line
function binomLine(x, { N, K, n }) {
  const p = K / N;
  const b = k => {
    if (k < 0 || k > n) return 0;
    if (p <= 0) return k === 0 ? 1 : 0;
    if (p >= 1) return k === n ? 1 : 0;
    return Math.exp(logBinom(n, k) + k * Math.log(p) + (n - k) * Math.log1p(-p));
  };
  if (n < 1 || x < 0 || x > n) return NaN;   // only between the possible counts 0 and n
  const k0 = Math.floor(x), t = x - k0;
  return (1 - t) * b(k0) + t * b(k0 + 1);
}

export default {
  id: 'hypergeometric',
  name: 'Hypergeometric',
  kind: 'discrete',

  params: catalogParams('hypergeometric'),

  pdf,
  cdf,
  sf,
  quantile,
  sample: (rng, { N, K, n }) => rng.hypergeometric(N, K, n),

  testParams: [
    { N: 20, K: 7, n: 12 },        // lower end of the support above 0
    { N: 200, K: 30, n: 150 },
    { N: 200, K: 199, n: 3 },
    { N: 10, K: 10, n: 4 },        // every item is a success: X = n always
    { N: 6, K: 3, n: 1 },          // one draw: Bernoulli(K/N)
    { N: 1, K: 1, n: 1 },
    { N: 13, K: 0, n: 5 },
    { N: 7, K: 3, n: 7 },          // the whole population is drawn: X = K always
  ],

  range: prm => [kLo(prm), kHi(prm)],
  // The window always starts at 0 and reaches a little past n, so the marker for n can be dragged to the right.
  support: ({ N, n }) => [0, Math.max(1, Math.min(N, n + Math.min(40, Math.max(3, Math.ceil(0.4 * n)))))],

  // K <= N and n <= N. A value typed above N pushes N up; a smaller N pulls K and n down with it.
  normalize(p, changed) {
    const q = { ...p };
    if (changed === 'K' && q.K > q.N) q.N = q.K;
    if (changed === 'n' && q.n > q.N) q.N = q.n;
    if (q.K > q.N) q.K = q.N;
    if (q.n > q.N) q.n = q.N;
    return q;
  },

  stats,

  // - a marker under the axis at k = n (the number of draws); dragging it cannot go past N;
  // - a dashed line at the mean nK/N: dragging it changes K, the number of successes in the population.
  handles: [
    {
      type: 'xPoint', param: 'n', label: 'n',
      set: (pt, p) => ({ n: Math.min(p.N, Math.max(0, pt.x)) }),
      ariaLabel: 'Number of draws n. Drag left or right, or use the arrow keys.',
    },
    {
      type: 'vline', param: 'K', label: 'nK/N',
      x: ({ N, K, n }) => (n > 0 ? n * K / N : NaN),
      set: (pt, p) => ({ K: Math.min(p.N, Math.max(0, Math.round(pt.x * p.N / p.n))) }),
      ariaLabel: 'Mean nK/N. Drag left or right to change the number of successes K in the population, or use the arrow keys.',
    },
  ],

  explorer: {
    xLabel: 'k',
    readouts: [
      { key: 'mean', label: 'Mean nK/N' },
      { key: 'sd', label: 'Standard deviation' },
      { label: 'Correction (N − n)/(N − 1)', value: ({ N, n }) => (N > 1 ? (N - n) / (N - 1) : '—') },
      { label: 'P(X = 0)', value: p => pdf(0, p) },
    ],
    overlays: p => [{
      id: 'binom', label: `Binomial(n = ${p.n}, p = K/N = ${fmtN(p.K / p.N)}): drawing with replacement`,
      pdf: x => binomLine(x, p), stems: true, offset: 0.25,
    }],
  },

  content: {
    summary: 'The hypergeometric distribution counts the successes in $n$ draws without replacement from $N$ items, of which $K$ are successes, such as the red cards in a 5-card hand. It is the basis of Fisher’s exact test.',
    description: [
      'The hypergeometric distribution counts successes when items are drawn without replacement from a finite population. A deck of $N = 52$ cards has $K = 26$ red cards; if you deal $n = 5$ cards, the number of red cards in your hand is hypergeometric. Other examples are the number of defective items in a sample taken from a batch, the number of tagged fish in a second catch from a lake, and the number of winning numbers on a lottery ticket.',
      'The count $X$ takes whole-number values from $\\max(0,\\, n + K - N)$ to $\\min(n, K)$: you cannot draw more successes than there are draws or than there are successes in the population. There are three parameters: the population size $N$, the number of successes $K$ in the population, and the number of draws $n$. (On this page $K$ is a fixed number of successes in the population, not a random count.) Because each draw changes what is left, the draws are not independent. This makes the count less variable than a binomial count with the same success probability $K/N$: its variance is smaller by the factor $(N - n)/(N - 1)$.',
    ],
    explorerIntro: 'The left plot shows the probability of each count $k$ as a stem, and the right plot the cumulative probability $F(k)$. The grey stems, drawn just to the right of the steel ones, are the binomial distribution with the same $n$ and success probability $K/N$, which is what you would get by drawing with replacement; the gap between the two shows the effect of not putting items back. Drag the amber marker labeled $n$ under the axis to change the number of draws (it cannot pass $N$). Drag the dashed amber line at the mean $nK/N$ to change the number of successes $K$ in the population. Set the population size $N$ with its box ($K$ keeps its value, so the proportion $K/N$ changes with it). When $N$ is much larger than $n$ the stems lie almost on the binomial curve; the relationship page linked under Limits shows this limit with $K/N$ held fixed.',

    pdfTex: 'P(X = k) = \\frac{\\dbinom{K}{k} \\dbinom{N - K}{n - k}}{\\dbinom{N}{n}}, \\qquad \\max(0,\\, n + K - N) \\le k \\le \\min(n, K)',
    glossary: [
      { sym: 'X', meaning: 'The number of successes among the $n$ items drawn.' },
      { sym: 'k', meaning: 'A possible count, a whole number in the range shown on the right of the formula.' },
      { sym: 'P(X = k)', meaning: 'The probability of drawing exactly $k$ successes.' },
      { sym: 'N', meaning: 'The population size: how many items there are to draw from.' },
      { sym: 'K', meaning: 'The number of successes in the population (for example, the number of red cards in the deck).' },
      { sym: 'n', meaning: 'The number of items drawn, without putting any back.' },
      { sym: '\\dbinom{a}{b}', meaning: 'The binomial coefficient $\\frac{a!}{b!\\,(a - b)!}$, read "$a$ choose $b$": the number of ways to choose $b$ items from $a$ when order does not matter. Here $m! = 1 \\cdot 2 \\cdots m$ and $0! = 1$.' },
      { sym: '\\dbinom{K}{k}', meaning: 'The number of ways to choose which $k$ of the $K$ successes are drawn.' },
      { sym: '\\dbinom{N - K}{n - k}', meaning: 'The number of ways to choose which $n - k$ of the $N - K$ failures are drawn.' },
      { sym: '\\dbinom{N}{n}', meaning: 'The number of possible samples of size $n$ from the population. Every sample is equally likely, so the probability is the number of favorable samples divided by this.' },
      { sym: '\\max(\\cdot),\\ \\min(\\cdot)', meaning: 'The larger and the smaller of the two numbers. The count is at least $n + K - N$ when the draws are more than the failures available, and at most the smaller of $n$ and $K$.' },
    ],

    cdfTex: 'F(x) = P(X \\le x) = \\sum_{k = k_{\\min}}^{\\lfloor x \\rfloor} \\frac{\\dbinom{K}{k} \\dbinom{N - K}{n - k}}{\\dbinom{N}{n}}, \\qquad k_{\\min} = \\max(0,\\, n + K - N)',
    cdfGlossary: [
      { sym: 'F(x)', meaning: 'The cumulative distribution function: the probability of at most $x$ successes. It is a staircase that steps up at each possible count.' },
      { sym: 'P(X \\le x)', meaning: 'The probability that the count is less than or equal to $x$.' },
      { sym: '\\lfloor x \\rfloor', meaning: 'The floor of $x$: $x$ rounded down to a whole number.' },
      { sym: 'k_{\\min}', meaning: 'The smallest possible count.' },
      { sym: '\\sum', meaning: 'Add up the probabilities of all counts from $k_{\\min}$ to $\\lfloor x \\rfloor$. There is no simpler closed form (it can be written with the generalized hypergeometric function $_3F_2$); this page adds the terms, at most a few hundred.' },
      { sym: 'N,\\ K,\\ n,\\ \\dbinom{a}{b}', meaning: 'The population size, the number of successes in it, the number of draws and the binomial coefficient, as above.' },
    ],
    extraFormulas: [
      {
        title: 'Fisher’s exact test for a 2 × 2 table',
        intro: 'Arrange $N$ subjects in a table by group (rows) and outcome (columns). If the row totals and the column totals are held fixed and the groups do not differ, the count in the top-left cell is hypergeometric. Fisher’s exact test adds up the probabilities of tables at least as extreme as the one observed.',
        tex: '\\begin{array}{c|cc|c} & \\text{success} & \\text{failure} & \\text{total} \\\\ \\hline \\text{group 1} & k & n - k & n \\\\ \\text{group 2} & K - k & N - K - n + k & N - n \\\\ \\hline \\text{total} & K & N - K & N \\end{array} \\qquad P(k) = \\frac{\\dbinom{K}{k}\\dbinom{N - K}{n - k}}{\\dbinom{N}{n}}',
        glossary: [
          { sym: 'k', meaning: 'The number of successes in group 1 (the top-left cell).' },
          { sym: 'n,\\ N - n', meaning: 'The sizes of the two groups (row totals).' },
          { sym: 'K,\\ N - K', meaning: 'The total numbers of successes and failures (column totals).' },
          { sym: 'P(k)', meaning: 'The probability of the table with top-left cell $k$, given the totals, when the success probability is the same in both groups.' },
        ],
      },
    ],

    properties: [
      { name: 'Support', tex: 'k \\in \\{\\max(0, n + K - N), \\dots, \\min(n, K)\\}', value: p => `${kLo(p)}, …, ${kHi(p)}`, explain: 'You cannot draw more successes than you draw items or than the population contains, and you must draw at least $n - (N - K)$ successes when there are fewer than $n$ failures.' },
      { name: 'Mean', tex: '\\mathrm{E}[X] = n\\frac{K}{N}', value: p => stats(p).mean, explain: 'Each draw is a success with probability $K/N$ (before you know the other draws), so the mean is the same as for a binomial count with $p = K/N$.' },
      { name: 'Median', tex: '\\text{smallest } k \\text{ with } F(k) \\ge \\tfrac12', value: p => stats(p).median, explain: 'There is no simple formula; the median lies close to the mean $nK/N$. The value shown is the smallest count whose cumulative probability reaches 1/2, computed from the CDF.' },
      { name: 'Mode', tex: '\\left\\lfloor \\frac{(n + 1)(K + 1)}{N + 2} \\right\\rfloor', value: p => stats(p).mode, explain: 'The most likely count. When $(n + 1)(K + 1)/(N + 2)$ is a whole number, that number and the one below it are both modes; the value shown is then the larger.' },
      { name: 'Variance', tex: '\\mathrm{Var}(X) = n\\frac{K}{N}\\Big(1 - \\frac{K}{N}\\Big)\\frac{N - n}{N - 1}', value: p => stats(p).variance, explain: 'The binomial variance $np(1-p)$ with $p = K/N$, multiplied by the finite-population correction $(N - n)/(N - 1)$. The correction is below 1 because draws without replacement are negatively correlated: drawing a success makes the next success less likely. When the whole population is drawn ($n = N$) the variance is 0.' },
      { name: 'Standard deviation', tex: '\\sqrt{n\\tfrac{K}{N}\\big(1 - \\tfrac{K}{N}\\big)\\tfrac{N - n}{N - 1}}', value: p => stats(p).sd, explain: 'The binomial standard deviation multiplied by $\\sqrt{(N - n)/(N - 1)}$. This square root is the finite-population correction applied to standard errors in survey sampling.' },
      { name: 'Skewness', tex: '\\frac{(N - 2K)(N - 1)^{1/2}(N - 2n)}{[nK(N - K)(N - n)]^{1/2}(N - 2)}', value: p => stats(p).skewness, explain: 'Zero when $K = N/2$ or $n = N/2$. Positive (a longer right tail) when $K$ and $n$ are both below $N/2$, for example when successes are rare and the sample is small, and also when both are above $N/2$; negative when one is below $N/2$ and the other above. Undefined when the variance is 0, and the formula needs $N \\ge 3$; the value shown is computed by summation.' },
      { name: 'Excess kurtosis', tex: '\\frac{(N-1)N^2\\big[N(N+1) - 6K(N-K) - 6n(N-n)\\big] + 6nK(N-K)(N-n)(5N-6)}{nK(N-K)(N-n)(N-2)(N-3)}', value: p => stats(p).exKurtosis, explain: 'Close to the binomial value when $N$ is large compared with $n$, and close to 0 (the normal value) when $n$, $K$ and $N$ are all large. The value shown is computed by summation, which also covers $N \\le 3$. Undefined when the variance is 0 ($K = 0$, $K = N$, $n = 0$ or $n = N$).' },
      { name: 'Entropy', tex: '-\\sum_k P(X = k) \\ln P(X = k)', value: p => stats(p).entropy, explain: 'In nats. There is no closed form; the value shown is the exact sum over the support.' },
      { name: 'Moment-generating function', tex: 'M(t) = \\frac{\\binom{N - K}{n}}{\\binom{N}{n}}\\; {}_2F_1\\!\\big(-n, -K;\\ N - K - n + 1;\\ e^{t}\\big)', explain: '$\\mathrm{E}[e^{tX}]$, written with the Gauss hypergeometric function $_2F_1$ (valid as written when $n \\le N - K$). It is rarely used in practice; the moments are easier to get from the indicator representation below. The distribution is named after this connection: its probabilities are proportional to the successive terms of the hypergeometric series ${}_2F_1$ above.' },
      { name: 'Characteristic function', tex: '\\varphi(t) = \\frac{\\binom{N - K}{n}}{\\binom{N}{n}}\\; {}_2F_1\\!\\big(-n, -K;\\ N - K - n + 1;\\ e^{it}\\big)', explain: '$\\mathrm{E}[e^{itX}]$, the moment-generating function with $t$ replaced by $it$, where $i = \\sqrt{-1}$.' },
      { name: 'Sum of dependent indicators', tex: 'X = \\sum_{i=1}^{n} B_i,\\quad \\mathrm{Cov}(B_i, B_j) = -\\frac{K(N - K)}{N^2(N - 1)}', explain: 'Each draw $B_i$ is a Bernoulli($K/N$) indicator, but two different draws are negatively correlated. Adding up the $n$ variances and the $n(n-1)$ covariances gives the variance above.' },
      { name: 'Symmetries', tex: '\\mathrm{Hyp}(N, K, n) = \\mathrm{Hyp}(N, n, K)', explain: 'Swapping the roles of the number of successes and the number of draws gives the same distribution. Also, the number of failures drawn, $n - X$, is $\\mathrm{Hyp}(N, N - K, n)$.' },
    ],

    limits: [
      { text: '<b>Binomial limit, and the binomial conditioned on its total.</b> As $N \\to \\infty$ with $K/N \\to p$ and $n$ fixed, removing a few items barely changes the proportion of successes, so drawing without replacement is like drawing with replacement and the count approaches $\\mathrm{Bin}(n, p)$. A rule of thumb is that the binomial approximation is good when $n \\le N/10$. Conversely, if $X \\sim \\mathrm{Bin}(K, p)$ and $Y \\sim \\mathrm{Bin}(N - K, p)$ are independent, then given $X + Y = n$, $X$ is $\\mathrm{Hyp}(N, K, n)$ whatever $p$ is. This is why Fisher’s exact test does not depend on the unknown success probability.', relation: 'hypergeometric--binomial', to: 'binomial' },
      { text: '<b>Normal approximation.</b> When $N$, $K$ and $n$ are all large, with $n/N$ below 1 and $K/N$ strictly between 0 and 1, the count is approximately normal with mean $nK/N$ and the variance above, including the finite-population correction. This is the central limit theorem for sampling without replacement.', relation: 'hypergeometric--normal', to: 'normal' },
      { text: '<b>One draw.</b> With $n = 1$ the count is $\\mathrm{Bernoulli}(K/N)$: the single item drawn is a success with probability $K/N$.', to: 'bernoulli' },
      { text: '<b>Poisson approximation.</b> When $N$ is large, $n$ is large and successes are rare, so that $nK/N$ is moderate, the count is approximately $\\mathrm{Poisson}(nK/N)$ (the binomial limit followed by the law of rare events).', to: 'poisson' },
      { text: '<b>Degenerate cases.</b> If $K = 0$ the count is always 0; if $K = N$ it is always $n$; if the whole population is drawn ($n = N$) it is always $K$.' },
      { text: '<b>More than two kinds of item.</b> When the population contains several kinds of item (for example, the four suits of a deck), the vector of counts of each kind in the sample has the multivariate hypergeometric distribution. It is the without-replacement version of the multinomial distribution, and each of its components is hypergeometric.', to: 'multinomial' },
    ],

    uses: {
      frequentist: [
        '<b>Fisher’s exact test.</b> For a 2 × 2 table with fixed margins, the count in one cell is hypergeometric under the null hypothesis of no association. Summing the hypergeometric probabilities of tables as extreme as the observed one gives an exact p-value, which is preferred over the chi-squared test when expected counts are small. The Freeman–Halton extension to larger tables uses the multivariate hypergeometric distribution.',
        '<b>Over-representation (enrichment) tests.</b> In genomics, if $K$ of $N$ genes belong to a pathway and $k$ of the $n$ genes on a list of hits do, the one-sided hypergeometric tail $P(X \\ge k)$ tests whether the pathway is over-represented (gene ontology enrichment). The same test checks whether the overlap of two lists, for example of neurons or brain regions responding to two conditions, is larger than chance.',
        '<b>Mantel–Haenszel and log-rank tests.</b> The Cochran–Mantel–Haenszel test for stratified 2 × 2 tables and the log-rank test for survival curves both use the hypergeometric mean and variance of one cell in each table (in the log-rank test, one table per event time).',
        '<b>Capture–recapture.</b> If $K$ animals are marked and released, and a second sample of $n$ animals contains $k$ marked ones, $k$ is hypergeometric with unknown population size $N$. Maximizing the likelihood gives the Lincoln–Petersen estimate $\\hat N \\approx nK/k$; the Chapman estimator $(K + 1)(n + 1)/(k + 1) - 1$ reduces its bias.',
        '<b>Acceptance sampling and auditing.</b> When $n$ items are inspected from a lot of $N$ that contains $K$ defectives, the number of defectives found is hypergeometric. Sampling plans and statistical audits (including risk-limiting audits of elections) are designed with hypergeometric tail probabilities.',
        '<b>Finite-population correction.</b> In survey sampling without replacement, standard errors of sample proportions are multiplied by $\\sqrt{(N - n)/(N - 1)}$, the factor that appears in the hypergeometric variance.',
      ],
      bayesian: [
        '<b>Likelihood for an unknown number of successes.</b> When a sample of $n$ items with $k$ successes is drawn from a population of known size $N$, the hypergeometric probability, seen as a function of $K$, is the likelihood for the number of successes in the population. A beta-binomial prior is conjugate: if $K \\sim \\mathrm{BetaBin}(N, \\alpha, \\beta)$, then the number of successes among the items not drawn, $K - k$, has posterior $\\mathrm{BetaBin}(N - n,\\ \\alpha + k,\\ \\beta + n - k)$.',
        '<b>Binomial prior: sampling a binomial population.</b> If $K \\sim \\mathrm{Bin}(N, p)$ (each item is a success independently), the sampled count is $\\mathrm{Bin}(n, p)$ and the unsampled successes $K - k$ are $\\mathrm{Bin}(N - n, p)$ whatever was observed; with $p$ known, the sample tells you nothing new about the rest of the population.',
        '<b>Unknown population size.</b> In capture–recapture, the hypergeometric likelihood is combined with a prior on $N$ (for example a discrete uniform or a $1/N$ prior) to get a posterior for the population size (Lee and Wagenmakers, Chapter 5; Gelman et al. discuss related finite-population models).',
        '<b>Finite-population inference.</b> In Bayesian survey sampling, the posterior predictive distribution of the unsampled part of a population is the natural object; for a binary attribute it leads to the hypergeometric and beta-binomial distributions.',
      ],
      modeling: [
        '<b>Card games and lotteries.</b> The chance of a given number of aces in a poker hand, of a given suit distribution in bridge, or of matching $k$ of the 6 numbers drawn from 49 in a lottery are hypergeometric probabilities.',
        '<b>Ecology.</b> Capture–recapture models for estimating animal populations and rarefaction curves for comparing species richness between samples of different sizes are built on sampling without replacement.',
        '<b>Neuroscience and psychology.</b> Hypergeometric tests assess whether two sets of selected units (neurons, voxels, items remembered in two sessions) overlap more than expected by chance, and urn models without replacement describe card-sorting and sampling tasks in which the composition of the deck changes as cards are drawn.',
        '<b>Quality control and simulation.</b> Inspection of finite lots, and permutation (randomization) tests for binary outcomes, in which the number of successes assigned to one group under random reassignment is hypergeometric.',
      ],
    },

    references: [
      { text: 'Wikipedia: Hypergeometric distribution.', url: 'https://en.wikipedia.org/wiki/Hypergeometric_distribution' },
      { text: 'Wikipedia: Fisher’s exact test.', url: 'https://en.wikipedia.org/wiki/Fisher%27s_exact_test' },
      { text: 'Casella, G., & Berger, R. L. (2002). <i>Statistical Inference</i> (2nd ed.), Section 3.2. Duxbury.' },
      { text: 'Agresti, A. (2013). <i>Categorical Data Analysis</i> (3rd ed.), Chapter 3 (Fisher’s exact test) and Chapter 6 (Cochran–Mantel–Haenszel test). Wiley.' },
      { text: 'Johnson, N. L., Kemp, A. W., & Kotz, S. (2005). <i>Univariate Discrete Distributions</i> (3rd ed.), Chapter 6. Wiley.' },
      { text: 'Gelman, A., Carlin, J. B., Stern, H. S., Dunson, D. B., Vehtari, A., & Rubin, D. B. (2013). <i>Bayesian Data Analysis</i> (3rd ed.), Chapter 8 (finite-population models). CRC Press.', url: 'http://www.stat.columbia.edu/~gelman/book/' },
      { text: 'Lee, M. D., & Wagenmakers, E.-J. (2013). <i>Bayesian Cognitive Modeling: A Practical Course</i>, Chapter 5 (the planes problem: capture–recapture with a hypergeometric likelihood). Cambridge University Press.' },
      { text: 'Leemis, L. M., & McQueston, J. T. (2008). Univariate distribution relationships. <i>The American Statistician</i>, 62(1), 45–53.', url: 'https://doi.org/10.1198/000313008X270448' },
    ],
  },
};
