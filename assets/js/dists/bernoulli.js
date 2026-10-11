// Bernoulli distribution: a single trial with outcomes 1 (success, probability p) and 0 (failure).
// Follows the structure of the reference module dists/normal.js (see ARCHITECTURE.md).

import { catalogParams } from '../catalog.js';

function pdf(k, { p }) {
  if (k === 1) return p;
  if (k === 0) return 1 - p;
  return 0;
}

function cdf(x, { p }) {
  if (x < 0) return 0;
  if (x < 1) return 1 - p;
  return 1;
}

const xlogx = v => (v > 0 ? v * Math.log(v) : 0);

function stats({ p }) {
  const q = 1 - p, pq = p * q;
  return {
    mean: p,
    variance: pq,
    sd: Math.sqrt(pq),
    median: p <= 0.5 ? 0 : 1,
    mode: p >= 0.5 ? 1 : 0,           // at p = 1/2 both values tie; the larger (1) is reported
    skewness: pq > 0 ? (q - p) / Math.sqrt(pq) : NaN,
    exKurtosis: pq > 0 ? (1 - 6 * pq) / pq : NaN,
    entropy: -xlogx(p) - xlogx(q),
  };
}

export default {
  id: 'bernoulli',
  name: 'Bernoulli',
  kind: 'discrete',

  params: catalogParams('bernoulli', { p: { step: 0.01, dragStep: 0.005 } }),

  pdf,
  cdf,
  sf: (x, { p }) => (x < 0 ? 1 : x < 1 ? p : 0),
  quantile: (u, { p }) => (u <= 1 - p ? 0 : 1),
  sample: (rng, { p }) => rng.bernoulli(p),

  testParams: [{ p: 0.5 }, { p: 0.02 }, { p: 0.97 }, { p: 0 }, { p: 1 }],

  range: () => [0, 1],
  // a little room on each side so that the two bars sit well inside the plot
  support: () => [-1, 2],

  stats,

  // Two vertical arrows, one on each bar. The arrow on the bar at 1 has length p; the arrow on the bar
  // at 0 has length 1 - p. Dragging either tip up or down changes p, and the other bar follows.
  handles: [
    {
      type: 'vArrow', param: 'p', id: 'vArrow-p', label: 'p',
      from: () => ({ x: 1, y: 0 }),
      to: ({ p }) => ({ x: 1, y: p }),
      set: pt => ({ p: pt.y }),
      ariaLabel: 'Success probability p, the height of the bar at 1. Drag up or down, or use the arrow keys.',
    },
    {
      type: 'vArrow', param: 'p', id: 'vArrow-q', label: '1 − p',
      from: () => ({ x: 0, y: 0 }),
      to: ({ p }) => ({ x: 0, y: 1 - p }),
      set: pt => ({ p: 1 - pt.y }),
      key: 'drag',
      ariaLabel: 'Failure probability 1 − p, the height of the bar at 0. Drag up or down, or use the arrow keys.',
    },
  ],

  explorer: {
    // the y axis always shows probabilities from 0 to 1, so the bars can be dragged anywhere in that range
    yMax: () => 1,
    areaDefault: () => 0,
    readouts: [
      { label: 'P(X = 1) = p', value: p => p.p },
      { label: 'P(X = 0) = 1 − p', value: p => 1 - p.p },
      { key: 'variance', label: 'Variance p(1 − p)' },
      { label: 'Odds p/(1 − p)', value: p => (p.p >= 1 ? Infinity : p.p / (1 - p.p)) },
    ],
  },

  content: {
    summary: 'The Bernoulli distribution describes a single yes/no trial: it gives 1 (a success) with probability $p$ and 0 (a failure) otherwise. It is the building block of the binomial, geometric and negative binomial distributions.',
    description: [
      'The Bernoulli distribution describes a single trial with two possible outcomes, such as a coin flip, a correct or incorrect answer, or whether a patient recovers. One outcome is called a success and coded 1; the other is called a failure and coded 0. The variable therefore takes only the values 0 and 1.',
      'It has one parameter, the success probability $p$, which is the probability of a 1. The probability of a 0 is $1 - p$. Coding the outcomes as 0 and 1 is useful because the mean of the variable is then simply $p$, and the sum of many such variables counts the successes.',
      'The Bernoulli distribution is the building block of the counting distributions: the binomial counts successes in a fixed number of independent trials, and the geometric and negative binomial count failures while waiting for successes.',
    ],
    explorerIntro: 'The left plot shows the two probabilities as stems: $1 - p$ at 0 and $p$ at 1. The right plot shows the cumulative probability $F(k)$, which jumps by $1 - p$ at 0 and by $p$ at 1. Drag the tip of the amber arrow on the bar at 1 to set $p$, or the tip of the arrow on the bar at 0 to set $1 - p$; the other bar adjusts so that the two always add up to 1.',

    pdfTex: 'P(X = k) = p^{k} (1 - p)^{1 - k}, \\qquad k \\in \\{0, 1\\}',
    glossary: [
      { sym: 'X', meaning: 'The outcome of the trial: 1 for a success, 0 for a failure.' },
      { sym: 'k', meaning: 'A possible value of $X$, either 0 or 1.' },
      { sym: 'P(X = k)', meaning: 'The probability that the outcome equals $k$.' },
      { sym: 'p', meaning: 'The success probability, between 0 and 1. It is the probability that $X = 1$.' },
      { sym: '1 - p', meaning: 'The failure probability, sometimes written $q$. It is the probability that $X = 0$.' },
      { sym: 'p^{k} (1 - p)^{1 - k}', meaning: 'A compact way of writing both cases in one formula: for $k = 1$ it equals $p$, and for $k = 0$ it equals $1 - p$. This form is convenient for writing likelihoods.' },
    ],

    cdfTex: 'F(x) = P(X \\le x) = \\begin{cases} 0, & x < 0 \\\\ 1 - p, & 0 \\le x < 1 \\\\ 1, & x \\ge 1 \\end{cases}',
    cdfGlossary: [
      { sym: 'F(x)', meaning: 'The cumulative distribution function: the probability that $X$ is at most $x$. It is a staircase with a step of height $1 - p$ at 0 and a step of height $p$ at 1.' },
      { sym: 'P(X \\le x)', meaning: 'The probability that $X$ takes a value less than or equal to $x$.' },
      { sym: 'x', meaning: 'Any real number at which the CDF is evaluated.' },
      { sym: 'p', meaning: 'The success probability.' },
    ],
    extraFormulas: [
      {
        title: 'Likelihood of a sequence of trials',
        intro: 'For $n$ independent trials with outcomes $x_1, \\dots, x_n$, the probability of the whole sequence depends on the data only through the number of successes $s$. Its maximum is at the sample proportion $\\hat p = s/n$.',
        tex: 'L(p) = \\prod_{i=1}^{n} p^{x_i} (1 - p)^{1 - x_i} = p^{s} (1 - p)^{n - s}, \\qquad s = \\sum_{i=1}^{n} x_i',
        glossary: [
          { sym: 'L(p)', meaning: 'The likelihood: the probability of the observed outcomes, viewed as a function of $p$.' },
          { sym: 'x_i', meaning: 'The outcome (0 or 1) of trial $i$.' },
          { sym: 'n', meaning: 'The number of trials.' },
          { sym: 's', meaning: 'The number of successes, the sum of the outcomes.' },
          { sym: '\\prod', meaning: 'The product over all trials.' },
        ],
      },
    ],

    properties: [
      { name: 'Support', tex: 'k \\in \\{0, 1\\}', value: () => '0, 1', explain: 'Only two values are possible: 0 (failure) and 1 (success).' },
      { name: 'Mean', tex: '\\mathrm{E}[X] = p', value: p => p.p, explain: 'The long-run proportion of successes. Because $X$ is 0 or 1, its average is the fraction of trials that are successes.' },
      { name: 'Median', tex: '\\begin{cases} 0, & p \\le 1/2 \\\\ 1, & p > 1/2 \\end{cases}', value: p => stats(p).median, explain: 'The outcome that has at least half the probability at or below it. At $p = 1/2$ every value between 0 and 1 is a median; the value shown is 0, the smallest one.' },
      { name: 'Mode', tex: '\\begin{cases} 0, & p < 1/2 \\\\ 1, & p > 1/2 \\end{cases}', value: p => stats(p).mode, explain: 'The more likely outcome. At $p = 1/2$ both outcomes are equally likely; the value shown is then 1, because this site reports the larger value when two tie.' },
      { name: 'Variance', tex: '\\mathrm{Var}(X) = p(1 - p)', value: p => stats(p).variance, explain: 'Largest ($1/4$) at $p = 1/2$, when the outcome is hardest to predict, and 0 when $p$ is 0 or 1, when the outcome is certain.' },
      { name: 'Standard deviation', tex: '\\sqrt{p(1 - p)}', value: p => stats(p).sd, explain: 'At most $1/2$, reached at $p = 1/2$.' },
      { name: 'Skewness', tex: '\\frac{1 - 2p}{\\sqrt{p(1 - p)}}', value: p => stats(p).skewness, explain: 'Positive when $p < 1/2$ (the rare outcome 1 forms a long right tail), negative when $p > 1/2$, and 0 at $p = 1/2$. Undefined when $p$ is 0 or 1.' },
      { name: 'Excess kurtosis', tex: '\\frac{1 - 6p(1 - p)}{p(1 - p)}', value: p => stats(p).exKurtosis, explain: 'Equal to $-2$ at $p = 1/2$, the smallest value any distribution can have: all the probability sits at two points one standard deviation from the mean. It becomes very large when one outcome is rare. Undefined when $p$ is 0 or 1.' },
      { name: 'Entropy', tex: '-p \\ln p - (1 - p) \\ln(1 - p)', value: p => stats(p).entropy, explain: 'In nats, with $0 \\ln 0 = 0$. It is largest, $\\ln 2 \\approx 0.6931$ nats (1 bit), at $p = 1/2$, and 0 when the outcome is certain.' },
      { name: 'Probability-generating function', tex: 'G(z) = \\mathrm{E}[z^X] = 1 - p + p z', explain: 'Multiplying $n$ of these gives $(1 - p + pz)^n$, the generating function of the binomial distribution.' },
      { name: 'Moment-generating function', tex: 'M(t) = 1 - p + p e^{t}', explain: '$\\mathrm{E}[e^{tX}]$. Every moment is the same: $\\mathrm{E}[X^m] = p$ for $m \\ge 1$, because $X^m = X$ when $X$ is 0 or 1.' },
      { name: 'Characteristic function', tex: '\\varphi(t) = 1 - p + p e^{it}', explain: '$\\mathrm{E}[e^{itX}]$, where $i = \\sqrt{-1}$.' },
      { name: 'Odds and log-odds', tex: '\\frac{p}{1 - p}, \\qquad \\operatorname{logit}(p) = \\ln\\frac{p}{1 - p}', value: p => (p.p <= 0 ? 'odds 0, log-odds −∞' : p.p >= 1 ? 'odds ∞, log-odds ∞' : `odds ${fmtN(p.p / (1 - p.p))}, log-odds ${fmtN(Math.log(p.p / (1 - p.p)))}`), explain: 'The odds compare the chance of a success with the chance of a failure. The log-odds (logit) can be any real number and is the natural parameter of the Bernoulli distribution; logistic regression models it as a linear function of predictors.' },
      { name: 'Fisher information', tex: 'I(p) = \\frac{1}{p(1 - p)}', value: p => (p.p > 0 && p.p < 1 ? 1 / (p.p * (1 - p.p)) : Infinity), explain: 'The information one trial carries about $p$. The variance of the estimate $\\hat p$ from $n$ trials is $p(1 - p)/n = 1/(n I(p))$.' },
    ],

    limits: [
      { text: '<b>Binomial with one trial.</b> $\\mathrm{Binomial}(1, p)$ is the Bernoulli distribution, and the sum of $n$ independent $\\mathrm{Bernoulli}(p)$ variables is $\\mathrm{Binomial}(n, p)$.', relation: 'bernoulli--binomial', to: 'binomial' },
      { text: '<b>Fair coin: $p = 1/2$.</b> $\\mathrm{Bernoulli}(1/2)$ is the discrete uniform distribution on $\\{0, 1\\}$.', relation: 'discrete-uniform--bernoulli', to: 'discrete-uniform' },
      { text: '<b>Categorical with two categories.</b> A categorical distribution with $K = 2$ categories is a Bernoulli trial, with the second category coded as the success 1.', relation: 'categorical--bernoulli', to: 'categorical' },
      { text: '<b>Certain outcomes.</b> With $p = 0$ the outcome is always 0 and with $p = 1$ it is always 1 (degenerate distributions with variance 0).' },
      { text: '<b>Thresholding a continuous variable.</b> Any event defines a Bernoulli variable, its indicator. For example, $\\mathbb 1[\\eta + \\varepsilon > 0]$ with logistic noise $\\varepsilon$ is Bernoulli with $p = 1/(1 + e^{-\\eta})$, the latent-variable form of logistic regression.', relation: 'logistic--bernoulli', to: 'logistic' },
    ],

    uses: {
      frequentist: [
        '<b>Estimating a proportion.</b> The maximum-likelihood estimate of $p$ from $n$ trials is the sample proportion $\\hat p = s/n$, with standard error $\\sqrt{\\hat p(1 - \\hat p)/n}$. Confidence intervals for $p$ include the Wald interval, the Wilson score interval and the exact Clopper–Pearson interval.',
        '<b>Logistic and probit regression.</b> Binary outcomes are modeled as Bernoulli with a probability that depends on predictors through a link function, $\\operatorname{logit}(p_i) = \\mathbf x_i^\\top \\boldsymbol\\beta$ (logistic regression) or $\\Phi^{-1}(p_i) = \\mathbf x_i^\\top \\boldsymbol\\beta$ (probit regression). These are generalized linear models with a Bernoulli likelihood.',
        '<b>Sign test and McNemar’s test.</b> Under the null hypothesis, each nonzero difference in the sign test, and each discordant pair in McNemar’s test, is a $\\mathrm{Bernoulli}(1/2)$ trial.',
        '<b>Comparing two proportions.</b> A/B tests, clinical trials with a binary endpoint, and the chi-squared and Fisher exact tests on 2×2 tables all compare Bernoulli success probabilities between groups.',
      ],
      bayesian: [
        '<b>Beta prior, Beta posterior.</b> The Beta distribution is the conjugate prior for $p$. With a $\\mathrm{Beta}(\\alpha, \\beta)$ prior and $s$ successes in $n$ trials, the posterior is $\\mathrm{Beta}(\\alpha + s,\\ \\beta + n - s)$, so $\\alpha$ and $\\beta$ act like prior counts of successes and failures.',
        '<b>Posterior predictive probability.</b> The probability that the next trial is a success is the posterior mean $(\\alpha + s)/(\\alpha + \\beta + n)$. With the flat prior $\\alpha = \\beta = 1$ this is Laplace’s rule of succession, $(s + 1)/(n + 2)$. The Jeffreys prior is $\\mathrm{Beta}(1/2, 1/2)$.',
        '<b>Bayesian logistic regression and hierarchical models.</b> Binary data in multilevel models (participants, items, schools) use a Bernoulli likelihood with group-level effects on the log-odds.',
        '<b>Indicator variables.</b> Latent Bernoulli variables mark which mixture component produced an observation, whether a predictor is included in a model (spike-and-slab priors), or whether a participant is guessing.',
      ],
      modeling: [
        '<b>Choices in two-alternative tasks.</b> Each response in a two-alternative forced-choice experiment is modeled as Bernoulli with a probability given by a psychometric function of the stimulus, or by a softmax (logistic) function of the difference in values in reinforcement-learning and decision models.',
        '<b>Signal detection.</b> On each signal trial a "yes" response is a Bernoulli trial with the hit rate as $p$; on each noise trial, with the false-alarm rate.',
        '<b>Random networks and dropout.</b> In an Erdős–Rényi random graph each possible edge is present independently with probability $p$. Dropout in neural networks multiplies each unit by an independent Bernoulli variable during training.',
        '<b>Simulation.</b> A Bernoulli draw is $\\mathbb 1[U < p]$ for a uniform random number $U$; sequences of such draws simulate Bernoulli processes, random walks and binary noise.',
      ],
    },

    references: [
      { text: 'Wikipedia: Bernoulli distribution.', url: 'https://en.wikipedia.org/wiki/Bernoulli_distribution' },
      { text: 'Casella, G., & Berger, R. L. (2002). <i>Statistical Inference</i> (2nd ed.), Section 3.2. Duxbury.' },
      { text: 'Gelman, A., Carlin, J. B., Stern, H. S., Dunson, D. B., Vehtari, A., & Rubin, D. B. (2013). <i>Bayesian Data Analysis</i> (3rd ed.), Sections 2.1–2.4 (binomial and Bernoulli data with a Beta prior). CRC Press.', url: 'http://www.stat.columbia.edu/~gelman/book/' },
      { text: 'Johnson, N. L., Kemp, A. W., & Kotz, S. (2005). <i>Univariate Discrete Distributions</i> (3rd ed.), Chapter 3. Wiley.' },
      { text: 'Lee, M. D., & Wagenmakers, E.-J. (2013). <i>Bayesian Cognitive Modeling: A Practical Course</i>, Chapter 3 (inferences with binomials). Cambridge University Press.' },
      { text: 'Leemis, L. M., & McQueston, J. T. (2008). Univariate distribution relationships. <i>The American Statistician</i>, 62(1), 45–53.', url: 'https://doi.org/10.1198/000313008X270448' },
    ],
  },
};

function fmtN(v) { return String(Number(Number(v).toPrecision(4))).replace(/^-/, '−'); }
