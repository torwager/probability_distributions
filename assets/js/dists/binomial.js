// Binomial distribution: the number of successes in n independent trials with success probability p.
// Follows the structure of the reference module dists/normal.js (see ARCHITECTURE.md).

import { catalogParams } from '../catalog.js';
import { logBinom, betaI, betaIc, quantileDiscrete } from '../core/math.js';

function pdf(k, { n, p }) {
  if (!Number.isInteger(k) || k < 0 || k > n) return 0;
  if (p <= 0) return k === 0 ? 1 : 0;
  if (p >= 1) return k === n ? 1 : 0;
  return Math.exp(logBinom(n, k) + k * Math.log(p) + (n - k) * Math.log1p(-p));
}

function cdf(x, { n, p }) {
  const k = Math.floor(x);
  if (k < 0) return 0;
  if (k >= n) return 1;
  if (p <= 0) return 1;
  if (p >= 1) return 0;
  // P(X <= k) = 1 - I_p(k + 1, n - k)
  return betaIc(p, k + 1, n - k);
}

function sf(x, { n, p }) {
  const k = Math.floor(x);
  if (k < 0) return 1;
  if (k >= n) return 0;
  if (p <= 0) return 0;
  if (p >= 1) return 1;
  return betaI(p, k + 1, n - k);
}

function quantile(u, prm) {
  // degenerate cases: all mass at 0 (p = 0) or at n (p = 1)
  if (prm.p <= 0) return 0;
  if (prm.p >= 1) return u <= 0 ? 0 : prm.n;
  return quantileDiscrete(x => cdf(x, prm), u, 0, prm.n, Math.floor(prm.n * prm.p));
}

function stats(prm) {
  const { n, p } = prm;
  const q = 1 - p, v = n * p * q;
  let H = 0;
  for (let k = 0; k <= n; k++) { const f = pdf(k, prm); if (f > 0) H -= f * Math.log(f); }
  return {
    mean: n * p,
    variance: v,
    sd: Math.sqrt(v),
    median: quantile(0.5, prm),
    // floor((n + 1)p); when (n + 1)p is a whole number, (n + 1)p and (n + 1)p - 1 tie and the larger is reported
    mode: Math.min(n, Math.floor((n + 1) * p + 1e-9)),
    skewness: v > 0 ? (q - p) / Math.sqrt(v) : NaN,
    exKurtosis: v > 0 ? (1 - 6 * p * q) / v : NaN,
    entropy: H,
  };
}

export default {
  id: 'binomial',
  name: 'Binomial',
  kind: 'discrete',

  params: catalogParams('binomial', { p: { step: 0.01, dragStep: 0.005 } }),

  pdf,
  cdf,
  sf,
  quantile,
  sample: (rng, { n, p }) => rng.binomial(n, p),

  testParams: [{ n: 1, p: 0.3 }, { n: 50, p: 0.02 }, { n: 37, p: 0.9 }, { n: 20, p: 0 }, { n: 7, p: 1 }, { n: 9, p: 0.5 }],

  range: ({ n }) => [0, n],
  // The window always shows the whole support 0..n, plus some room to the right of n so that the
  // marker for n can be dragged further (the view refits after each drag).
  support: ({ n }) => [0, Math.max(n + 1, Math.min(52, n + Math.max(3, Math.ceil(0.4 * n))))],

  stats,

  // - a marker under the axis at x = n, the right end of the support: drag it to change the number of trials;
  // - a dashed line at the mean np: drag it to change p (n stays fixed).
  handles: [
    {
      type: 'xPoint', param: 'n', label: 'n',
      ariaLabel: 'Number of trials n, the right end of the support. Drag left or right, or use the arrow keys.',
    },
    {
      type: 'vline', param: 'p', label: 'np',
      x: ({ n, p }) => n * p,
      set: (pt, { n }) => ({ p: pt.x / n }),
      ariaLabel: 'Mean np. Drag left or right to change the success probability p, or use the arrow keys.',
    },
  ],

  explorer: {
    readouts: [
      { key: 'mean', label: 'Mean np' },
      { key: 'sd', label: 'Standard deviation √(np(1 − p))' },
      { key: 'mode', label: 'Mode' },
      { label: 'P(X = 0) = (1 − p)ⁿ', value: prm => pdf(0, prm) },
    ],
  },

  content: {
    description: [
      'The binomial distribution counts the number of successes in a fixed number of independent trials that all have the same success probability. Examples are the number of heads in 10 coin flips, the number of correct answers when a participant guesses on 20 questions, or the number of patients out of 50 who respond to a treatment.',
      'The count takes the whole-number values $0, 1, \\dots, n$. There are two parameters. The number of trials $n$ sets the largest possible count. The success probability $p$ is the chance that any one trial is a success; it sets where the counts center, at $np$. The trials must be independent and share the same $p$; if $p$ varies between trials or units, the counts are more spread out (see the beta-binomial distribution).',
    ],
    explorerIntro: 'The left plot shows the probability of each count $k$ as a stem, and the right plot the cumulative probability $F(k)$. Drag the amber marker labeled $n$ under the axis to change the number of trials; it sits at $k = n$, the largest possible count, and the view widens after you let go so that a second drag can go further. Drag the dashed amber line labeled $np$ to move the mean, which changes the success probability $p = (\\text{mean})/n$ while $n$ stays fixed.',

    pdfTex: 'P(X = k) = \\binom{n}{k} p^{k} (1 - p)^{n - k}, \\qquad k = 0, 1, \\dots, n',
    glossary: [
      { sym: 'X', meaning: 'The number of successes in the $n$ trials.' },
      { sym: 'k', meaning: 'A possible count, a whole number from 0 to $n$.' },
      { sym: 'P(X = k)', meaning: 'The probability of exactly $k$ successes.' },
      { sym: 'n', meaning: 'The number of independent trials.' },
      { sym: 'p', meaning: 'The success probability of each trial, between 0 and 1.' },
      { sym: '\\dbinom{n}{k}', meaning: 'The binomial coefficient $\\frac{n!}{k!\\,(n-k)!}$, read "$n$ choose $k$": the number of different orders (which trials succeed) that give exactly $k$ successes. Here $m! = 1 \\cdot 2 \\cdots m$ is the factorial, with $0! = 1$.' },
      { sym: 'p^{k} (1 - p)^{n - k}', meaning: 'The probability of one particular sequence with $k$ successes and $n - k$ failures. Every such sequence has the same probability, so multiplying by the number of sequences gives $P(X = k)$.' },
    ],

    cdfTex: 'F(x) = P(X \\le x) = \\sum_{k=0}^{\\lfloor x \\rfloor} \\binom{n}{k} p^{k} (1 - p)^{n - k} = I_{1-p}\\big(n - \\lfloor x \\rfloor,\\ \\lfloor x \\rfloor + 1\\big)',
    cdfGlossary: [
      { sym: 'F(x)', meaning: 'The cumulative distribution function: the probability of at most $x$ successes. It is a staircase that steps up at each count $0, 1, \\dots, n$.' },
      { sym: 'P(X \\le x)', meaning: 'The probability that the count is less than or equal to $x$.' },
      { sym: '\\lfloor x \\rfloor', meaning: 'The floor of $x$: $x$ rounded down to a whole number (for $0 \\le x < n$).' },
      { sym: '\\sum_{k=0}^{\\lfloor x \\rfloor}', meaning: 'Add up the probabilities of the counts $0, 1, \\dots, \\lfloor x \\rfloor$.' },
      { sym: '\\dbinom{n}{k},\\ n,\\ p', meaning: 'The binomial coefficient, the number of trials and the success probability, as above.' },
      { sym: 'I_{x}(a, b)', meaning: 'The regularized incomplete beta function, the CDF of a $\\mathrm{Beta}(a, b)$ distribution at $x$. The identity with the sum lets the CDF be computed accurately for large $n$ without adding many terms; this page uses it.' },
    ],
    extraFormulas: [
      {
        title: 'Likelihood and the Beta posterior',
        intro: 'As a function of $p$, the binomial probability of the observed count $x$ is proportional to $p^x (1 - p)^{n - x}$. Combined with a $\\mathrm{Beta}(\\alpha, \\beta)$ prior, whose density is proportional to $p^{\\alpha - 1}(1 - p)^{\\beta - 1}$, the posterior is again a Beta distribution.',
        tex: 'p \\mid X = x \\ \\sim\\ \\mathrm{Beta}(\\alpha + x,\\ \\beta + n - x)',
        glossary: [
          { sym: 'x', meaning: 'The observed number of successes.' },
          { sym: '\\alpha,\\ \\beta', meaning: 'The parameters of the Beta prior for $p$; they act like prior counts of successes and failures.' },
          { sym: 'p \\mid X = x', meaning: 'The distribution of $p$ after observing $x$ successes (the posterior).' },
        ],
      },
    ],

    properties: [
      { name: 'Support', tex: 'k \\in \\{0, 1, \\dots, n\\}', value: prm => (prm.n === 1 ? '0, 1' : `0, …, ${prm.n}`), explain: 'Any whole number of successes from none to all $n$ trials.' },
      { name: 'Mean', tex: '\\mathrm{E}[X] = np', value: prm => prm.n * prm.p, explain: 'Each trial contributes $p$ successes on average, and there are $n$ trials.' },
      { name: 'Median', tex: '\\lfloor np \\rfloor \\text{ or } \\lceil np \\rceil', value: prm => stats(prm).median, explain: 'There is no single formula, but the median is always $np$ rounded down or rounded up (Kaas and Buhrman, 1980). When $np$ is a whole number, the median equals $np$. The value shown is the smallest $k$ with $F(k) \\ge 1/2$.' },
      { name: 'Mode', tex: '\\lfloor (n + 1)p \\rfloor', value: prm => stats(prm).mode, explain: 'The most likely count. When $(n + 1)p$ is a whole number between 1 and $n$, both $(n + 1)p$ and $(n + 1)p - 1$ are modes; the value shown is then the larger. For $p = 1$ the mode is $n$.' },
      { name: 'Variance', tex: '\\mathrm{Var}(X) = np(1 - p)', value: prm => stats(prm).variance, explain: 'The sum of the $n$ trial variances $p(1 - p)$. It is always smaller than the mean (underdispersion compared with the Poisson), and largest for $p = 1/2$.' },
      { name: 'Standard deviation', tex: '\\sqrt{np(1 - p)}', value: prm => stats(prm).sd, explain: 'Grows like $\\sqrt n$, so the proportion of successes $X/n$ has standard deviation $\\sqrt{p(1 - p)/n}$, which shrinks as $n$ grows.' },
      { name: 'Skewness', tex: '\\frac{1 - 2p}{\\sqrt{np(1 - p)}}', value: prm => stats(prm).skewness, explain: 'Right-skewed for $p < 1/2$, left-skewed for $p > 1/2$, symmetric at $p = 1/2$. The skewness shrinks like $1/\\sqrt n$, which is why the binomial looks more and more normal as $n$ grows. Undefined for $p$ equal to 0 or 1.' },
      { name: 'Excess kurtosis', tex: '\\frac{1 - 6p(1 - p)}{np(1 - p)}', value: prm => stats(prm).exKurtosis, explain: 'Shrinks like $1/n$ toward 0, the normal value. Undefined for $p$ equal to 0 or 1.' },
      { name: 'Entropy', tex: '-\\sum_{k=0}^{n} P(X = k) \\ln P(X = k)', value: prm => stats(prm).entropy, explain: 'In nats. There is no closed form; the value shown is the exact sum. For large $n$ it is close to $\\tfrac12 \\ln\\big(2\\pi e\\, np(1 - p)\\big)$, the entropy of the matching normal distribution (here $\\pi \\approx 3.142$ and $e \\approx 2.718$).' },
      { name: 'Probability-generating function', tex: 'G(z) = \\mathrm{E}[z^X] = (1 - p + p z)^{n}', explain: 'The Bernoulli generating function $1 - p + pz$ raised to the power $n$, because $X$ is a sum of $n$ independent Bernoulli trials. It also shows that independent binomial counts with the same $p$ add: $\\mathrm{Bin}(n_1, p) + \\mathrm{Bin}(n_2, p) = \\mathrm{Bin}(n_1 + n_2, p)$.' },
      { name: 'Moment-generating function', tex: 'M(t) = (1 - p + p e^{t})^{n}', explain: '$\\mathrm{E}[e^{tX}]$. Its derivatives at $t = 0$ give the moments.' },
      { name: 'Characteristic function', tex: '\\varphi(t) = (1 - p + p e^{it})^{n}', explain: '$\\mathrm{E}[e^{itX}]$, where $i = \\sqrt{-1}$.' },
      { name: 'Ratio of successive probabilities', tex: '\\frac{P(X = k + 1)}{P(X = k)} = \\frac{n - k}{k + 1} \\cdot \\frac{p}{1 - p}', explain: 'The probabilities rise while this ratio is above 1 and fall after it, which gives the mode. The recursion is also a quick way to compute all the probabilities.' },
      { name: 'Proportion of successes', tex: '\\sqrt{\\mathrm{Var}(X/n)} = \\sqrt{p(1 - p)/n}', value: prm => (prm.n > 0 ? Math.sqrt(prm.p * (1 - prm.p) / prm.n) : NaN), explain: 'The sample proportion $\\hat p = X/n$ has mean $p$, so it is an unbiased estimate of $p$. Its standard deviation, shown in the value column, is the standard error of a proportion.' },
    ],

    limits: [
      { text: '<b>Sum of Bernoulli trials.</b> $X = B_1 + \\dots + B_n$ with independent $B_i \\sim \\mathrm{Bernoulli}(p)$; with $n = 1$ the binomial is the Bernoulli distribution.', relation: 'bernoulli--binomial', to: 'bernoulli' },
      { text: '<b>Normal approximation (de Moivre–Laplace).</b> For large $n$ and fixed $p$, $\\mathrm{Bin}(n, p)$ is approximately $\\mathcal N(np,\\ np(1 - p))$. A common rule of thumb asks for $np \\ge 10$ and $n(1 - p) \\ge 10$; adding $\\tfrac12$ (the continuity correction) improves it.', relation: 'binomial--normal', to: 'normal' },
      { text: '<b>Poisson approximation (law of rare events).</b> When $n \\to \\infty$ and $p \\to 0$ with $np \\to \\lambda$, $\\mathrm{Bin}(n, p)$ approaches $\\mathrm{Poisson}(\\lambda)$. It is accurate when $n$ is large and $p$ is small, for example $n \\ge 20$ and $p \\le 0.05$.', relation: 'binomial--poisson', to: 'poisson' },
      { text: '<b>Sampling without replacement from a large population.</b> The hypergeometric distribution approaches the binomial as the population size $N \\to \\infty$ with the fraction of successes $K/N \\to p$. Conversely, two independent binomial counts with the same $p$, conditioned on their total, give a hypergeometric count.', relation: 'hypergeometric--binomial', to: 'hypergeometric' },
      { text: '<b>Multinomial with two categories.</b> A binomial count $X$ is the multinomial vector $(X, n - X)$ with probabilities $(p, 1 - p)$, and each component of a multinomial vector is binomial.', relation: 'binomial--multinomial', to: 'multinomial' },
      { text: '<b>Beta-binomial with a very concentrated Beta.</b> If $p$ is drawn from $\\mathrm{Beta}(\\alpha, \\beta)$, the count is beta-binomial; as $\\alpha + \\beta \\to \\infty$ with $\\alpha/(\\alpha + \\beta) \\to p$, it approaches $\\mathrm{Bin}(n, p)$.', relation: 'binomial--beta-binomial', to: 'beta-binomial' },
      { text: '<b>Sums with the same $p$.</b> If $X \\sim \\mathrm{Bin}(n_1, p)$ and $Y \\sim \\mathrm{Bin}(n_2, p)$ are independent, then $X + Y \\sim \\mathrm{Bin}(n_1 + n_2, p)$. With different success probabilities the sum is not binomial (it is a Poisson-binomial distribution).' },
      { text: '<b>Symmetry and degenerate cases.</b> $n - X \\sim \\mathrm{Bin}(n, 1 - p)$ counts the failures. With $p = 1/2$ the distribution is symmetric about $n/2$. With $p = 0$ the count is always 0, and with $p = 1$ it is always $n$.' },
    ],

    uses: {
      frequentist: [
        '<b>Exact binomial test and confidence intervals.</b> To test whether a success probability equals $p_0$, the observed count is compared with $\\mathrm{Bin}(n, p_0)$. The exact Clopper–Pearson interval inverts this test; the Wilson score interval and the Wald interval $\\hat p \\pm 1.96\\sqrt{\\hat p(1 - \\hat p)/n}$ use the normal approximation.',
        '<b>Sign test and McNemar’s test.</b> The number of positive differences among the $m$ nonzero paired differences is $\\mathrm{Bin}(m, 1/2)$ under the null hypothesis of a zero median. McNemar’s test for paired proportions conditions on the $m$ discordant pairs in the same way.',
        '<b>Binomial regression.</b> Logistic and probit regression with grouped data (successes out of $n_i$ trials per row) use a binomial likelihood; overdispersed data call for a quasi-binomial or beta-binomial model instead.',
        '<b>Quality control and acceptance sampling.</b> The number of defective items in a sample of fixed size is binomial; np-charts and acceptance sampling plans are designed with binomial probabilities.',
      ],
      bayesian: [
        '<b>Beta–binomial conjugacy.</b> With a $\\mathrm{Beta}(\\alpha, \\beta)$ prior for $p$ and $x$ successes in $n$ trials, the posterior is $\\mathrm{Beta}(\\alpha + x,\\ \\beta + n - x)$, with posterior mean $(\\alpha + x)/(\\alpha + \\beta + n)$, a compromise between the prior mean and the sample proportion.',
        '<b>Posterior predictive counts.</b> The number of successes in $m$ future trials has a beta-binomial posterior predictive distribution, $\\mathrm{BetaBin}(m,\\ \\alpha + x,\\ \\beta + n - x)$, which is wider than a binomial because $p$ is uncertain.',
        '<b>Hierarchical binomial models.</b> When there are many groups (hospitals, participants, experiments), each with its own success probability, the probabilities are given a common population distribution, for example a Beta (the rat tumor example in Gelman et al., Chapter 5) or a normal distribution on the log-odds. Estimates for small groups are then shrunk toward the population mean.',
        '<b>Bayes factors for proportions.</b> Testing $p = p_0$ against an alternative with a Beta prior compares the binomial likelihood at $p_0$ with the beta-binomial marginal likelihood (Lee and Wagenmakers, Chapters 7 and 9).',
      ],
      modeling: [
        '<b>Accuracy in behavioral experiments.</b> The number of correct responses in $n$ trials of a condition is binomial with the probability of a correct response; in signal detection theory, hits out of signal trials and false alarms out of noise trials are binomial counts.',
        '<b>Synaptic transmission.</b> The quantal model of neurotransmitter release (del Castillo and Katz, 1954) treats the number of vesicles released as $\\mathrm{Bin}(n, p)$, with $n$ release sites and release probability $p$; fitting it to response amplitudes estimates $n$ and $p$.',
        '<b>Population genetics.</b> In the Wright–Fisher model of genetic drift, the number of copies of an allele in the next generation is $\\mathrm{Bin}(2N, x)$, where $x$ is its current frequency and $2N$ the number of gene copies.',
        '<b>Epidemics and reliability.</b> Chain-binomial (Reed–Frost) models count new infections as binomial draws among susceptible people. A $k$-out-of-$n$ system works if at least $k$ of $n$ independent components work, which is a binomial tail probability.',
      ],
    },

    references: [
      { text: 'Wikipedia: Binomial distribution.', url: 'https://en.wikipedia.org/wiki/Binomial_distribution' },
      { text: 'Casella, G., & Berger, R. L. (2002). <i>Statistical Inference</i> (2nd ed.), Section 3.2. Duxbury.' },
      { text: 'Gelman, A., Carlin, J. B., Stern, H. S., Dunson, D. B., Vehtari, A., & Rubin, D. B. (2013). <i>Bayesian Data Analysis</i> (3rd ed.), Sections 2.1–2.4 and 5.1–5.3. CRC Press.', url: 'http://www.stat.columbia.edu/~gelman/book/' },
      { text: 'Johnson, N. L., Kemp, A. W., & Kotz, S. (2005). <i>Univariate Discrete Distributions</i> (3rd ed.), Chapter 3. Wiley.' },
      { text: 'Kaas, R., & Buhrman, J. M. (1980). Mean, median and mode in binomial distributions. <i>Statistica Neerlandica</i>, 34(1), 13–18.', url: 'https://doi.org/10.1111/j.1467-9574.1980.tb00681.x' },
      { text: 'Lee, M. D., & Wagenmakers, E.-J. (2013). <i>Bayesian Cognitive Modeling: A Practical Course</i>, Chapters 3, 7 and 9. Cambridge University Press.' },
      { text: 'Leemis, L. M., & McQueston, J. T. (2008). Univariate distribution relationships. <i>The American Statistician</i>, 62(1), 45–53.', url: 'https://doi.org/10.1198/000313008X270448' },
    ],
  },
};
