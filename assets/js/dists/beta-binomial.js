// Beta-binomial distribution: a binomial count whose success probability is itself drawn from a Beta distribution.
// Follows the structure of the reference module dists/normal.js (see ARCHITECTURE.md).

import { catalogParams } from '../catalog.js';
import { logBinom, lbeta, quantileDiscrete, clamp } from '../core/math.js';

function pdf(k, { n, alpha, beta }) {
  if (!Number.isInteger(k) || k < 0 || k > n) return 0;
  return Math.exp(logBinom(n, k) + lbeta(k + alpha, n - k + beta) - lbeta(alpha, beta));
}

// n is at most 50, so the CDF is an exact running sum
function cdf(x, prm) {
  const k = Math.floor(x);
  if (k < 0) return 0;
  if (k >= prm.n) return 1;
  let s = 0;
  for (let j = 0; j <= k; j++) s += pdf(j, prm);
  return Math.min(1, s);
}

function sf(x, prm) {
  const k = Math.floor(x);
  if (k < 0) return 1;
  if (k >= prm.n) return 0;
  let s = 0;
  for (let j = prm.n; j > k; j--) s += pdf(j, prm);
  return Math.min(1, s);
}

const quantile = (u, prm) => quantileDiscrete(x => cdf(x, prm), u, 0, prm.n, Math.floor(prm.n * prm.alpha / (prm.alpha + prm.beta)));

function stats(prm) {
  const { n, alpha: a, beta: b } = prm;
  const s = a + b, pi = a / s;
  const variance = n * a * b * (s + n) / (s * s * (s + 1));
  let H = 0, mode = 0, best = -1;
  for (let k = 0; k <= n; k++) {
    const f = pdf(k, prm);
    if (f > 0) H -= f * Math.log(f);
    if (f >= best * (1 - 1e-12)) { best = Math.max(best, f); mode = k; }   // ties: the larger k
  }
  const skewness = (s + 2 * n) * (b - a) / (s + 2) * Math.sqrt((1 + s) / (n * a * b * (n + s)));
  const kurt = (s * s * (1 + s)) / (n * a * b * (s + 2) * (s + 3) * (s + n))
    * (s * (s - 1 + 6 * n) + 3 * a * b * (n - 2) + 6 * n * n - 3 * a * b * n * (6 - n) / s - 18 * a * b * n * n / (s * s));
  return {
    mean: n * pi,
    variance,
    sd: Math.sqrt(variance),
    median: quantile(0.5, prm),
    mode,
    skewness,
    exKurtosis: kurt - 3,
    entropy: H,
  };
}

const fmtN = v => String(Number(Number(v).toPrecision(4))).replace(/^-/, '−');

/** Range of alpha + beta that keeps both shapes inside the slider limits for a given mean. */
function concLimits(m, prm) {
  const [lo, hi] = [prm.min, prm.max];
  return [Math.max(lo / m, lo / (1 - m)), Math.min(hi / m, hi / (1 - m))];
}
const ALPHA = { min: 0.1, max: 10 };   // catalog limits for both shapes

// interpolated binomial PMF with the same mean (p = alpha/(alpha + beta)), drawn as a dashed reference line
function binomLine(x, { n, alpha, beta }) {
  const p = alpha / (alpha + beta);
  const b = k => (k < 0 || k > n ? 0 : Math.exp(logBinom(n, k) + k * Math.log(p) + (n - k) * Math.log1p(-p)));
  if (x < 0 || x > n) return NaN;   // only between the possible counts 0 and n
  const k0 = Math.floor(x), t = x - k0;
  return (1 - t) * b(k0) + t * b(k0 + 1);
}

/** Height at which the spread arrow is drawn: a little below the middle of the tallest stem. */
function arrowY(prm) {
  let mx = 0;
  for (let k = 0; k <= prm.n; k++) mx = Math.max(mx, pdf(k, prm));
  return 0.42 * mx;
}

export default {
  id: 'beta-binomial',
  name: 'Beta-binomial',
  kind: 'discrete',

  params: catalogParams('beta-binomial', { alpha: { step: 0.1, log: false }, beta: { step: 0.1, log: false } }),

  pdf,
  cdf,
  sf,
  quantile,
  sample: (rng, { n, alpha, beta }) => rng.binomial(n, rng.beta(alpha, beta)),

  testParams: [
    { n: 1, alpha: 2, beta: 5 },
    { n: 20, alpha: 1, beta: 1 },          // discrete uniform on 0..20
    { n: 30, alpha: 0.3, beta: 0.5 },      // U-shaped
    { n: 50, alpha: 10, beta: 10 },        // close to the binomial
    { n: 12, alpha: 0.1, beta: 7 },
    { n: 7, alpha: 9.5, beta: 0.2 },
  ],

  range: ({ n }) => [0, n],
  // the whole support 0..n plus room to the right of n for dragging the marker for n
  support: ({ n }) => [0, Math.max(n + 1, Math.min(52, n + Math.max(3, Math.ceil(0.4 * n))))],

  stats,

  // - a marker under the axis at k = n: drag it to change the number of trials;
  // - a dashed line at the mean n·alpha/(alpha + beta): drag it to move the mean, keeping alpha + beta fixed;
  // - an arrow from the mean to mean + sd: drag its tip to change the spread (alpha + beta), keeping the mean.
  handles: prm => [
    {
      type: 'xPoint', param: 'n', label: 'n',
      ariaLabel: 'Number of trials n, the right end of the support. Drag left or right, or use the arrow keys.',
    },
    {
      type: 'vline', param: 'alpha', label: 'mean',
      x: ({ n, alpha, beta }) => n * alpha / (alpha + beta),
      set: (pt, p, p0) => {
        const s = p0.alpha + p0.beta;
        const m = clamp(pt.x / p.n, Math.max(0.1 / s, 1 - 10 / s, 0.001), Math.min(1 - 0.1 / s, 10 / s, 0.999));
        return { alpha: m * s, beta: (1 - m) * s };
      },
      key: 'drag',
      ariaLabel: 'Mean nα/(α + β). Drag left or right, or use the arrow keys, to move the mean with α + β fixed.',
    },
    prm.n > 1 ? {
      type: 'hArrow', param: 'beta', id: 'hArrow-spread', label: 'sd',
      from: p => ({ x: p.n * p.alpha / (p.alpha + p.beta), y: arrowY(p) }),
      to: p => {
        const m = p.n * p.alpha / (p.alpha + p.beta);
        const dir = m <= p.n / 2 ? 1 : -1;   // point toward the middle of the support
        return { x: m + dir * stats(p).sd, y: arrowY(p) };
      },
      // sd^2 = n pi (1 - pi) [1 + (n - 1)/(s + 1)]  =>  s = (n - 1)/(sd^2/(n pi (1 - pi)) - 1) - 1
      set: (pt, p, p0) => {
        const s0 = p0.alpha + p0.beta, pi = p0.alpha / s0, n = p.n;
        const m = n * pi, dir = m <= n / 2 ? 1 : -1;
        const d = Math.max(0, dir * (pt.x - m));
        const vb = n * pi * (1 - pi);
        const [smin, smax] = concLimits(pi, ALPHA);
        const ratio = (d * d) / vb;
        const s = ratio <= 1 + 1e-9 ? smax : clamp((n - 1) / (ratio - 1) - 1, smin, smax);
        return { alpha: pi * s, beta: (1 - pi) * s };
      },
      key: 'drag',
      ariaLabel: 'Standard deviation. Drag the tip (or use the arrow keys) outward to spread the counts (smaller α + β) or inward to concentrate them (larger α + β); the mean stays fixed.',
    } : null,
  ],

  explorer: {
    xLabel: 'k',
    // keep the dashed binomial reference in view as well as the stems
    yMax: p => {
      let m = 0;
      for (let k = 0; k <= p.n; k++) m = Math.max(m, pdf(k, p), binomLine(k, p));
      return m;
    },
    readouts: [
      { key: 'mean', label: 'Mean nα/(α + β)' },
      { key: 'sd', label: 'Standard deviation' },
      { label: 'Overdispersion factor 1 + (n − 1)ρ', value: ({ n, alpha, beta }) => 1 + (n - 1) / (alpha + beta + 1) },
      { label: 'Correlation ρ = 1/(α + β + 1)', value: ({ alpha, beta }) => 1 / (alpha + beta + 1) },
    ],
    overlays: p => [{
      id: 'binom', label: `Binomial(n = ${p.n}, p = ${fmtN(p.alpha / (p.alpha + p.beta))}): same mean, fixed p`,
      pdf: x => binomLine(x, p), stems: true, offset: 0.25,
    }],
  },

  content: {
    summary: 'The beta-binomial distribution counts the successes in $n$ trials whose success probability is itself drawn from a beta distribution with shapes $\\alpha$ and $\\beta$. It models counts that vary more than binomial counts, as when each school has its own rate.',
    description: [
      'The beta-binomial distribution describes a count of successes out of $n$ trials when the success probability is not fixed but varies from one unit to the next. Each unit (a participant, a patient, a litter, a batch) first gets its own success probability $p$, drawn from a $\\mathrm{Beta}(\\alpha, \\beta)$ distribution, and then produces a binomial count with that $p$. For example, the number of correct answers out of 20 for a randomly chosen participant, when participants differ in ability, is often modeled as beta-binomial.',
      'The count takes the whole-number values $0, 1, \\dots, n$. The parameters are the number of trials $n$ and the two Beta shape parameters $\\alpha$ and $\\beta$, which act like prior counts of successes and failures. The mean is the same as for a binomial with $p = \\alpha/(\\alpha + \\beta)$, but the variance is larger, because the variation of $p$ between units adds to the binomial variation within a unit. This extra variance is called overdispersion. The sum $\\alpha + \\beta$ controls it: when $\\alpha + \\beta$ is large every unit has nearly the same $p$ and the counts are close to binomial; when it is small the counts spread out, and for $\\alpha$ and $\\beta$ below 1 they pile up at 0 and $n$. In Bayesian statistics the same distribution is the predictive distribution of a binomial count when $p$ has a Beta prior.',
    ],
    explorerIntro: 'The left plot shows the probability of each count $k$ as a stem, and the right plot the cumulative probability $F(k)$. The grey stems, drawn just to the right of the steel ones, are the binomial distribution with the same mean and a fixed success probability $\\alpha/(\\alpha + \\beta)$; the beta-binomial is always at least as spread out. Drag the amber marker labeled $n$ under the axis to change the number of trials. Drag the dashed amber line to move the mean $n\\alpha/(\\alpha + \\beta)$ while $\\alpha + \\beta$ stays fixed. Drag the tip of the amber arrow, which is one standard deviation long, to change the spread while the mean stays fixed: a longer arrow means a smaller $\\alpha + \\beta$ and more variation of $p$ between units. The boxes set $\\alpha$ and $\\beta$ directly; try $\\alpha = \\beta = 1$, which makes every count equally likely.',

    pdfTex: 'P(X = k) = \\binom{n}{k} \\frac{B(k + \\alpha,\\ n - k + \\beta)}{B(\\alpha, \\beta)}, \\qquad k = 0, 1, \\dots, n',
    glossary: [
      { sym: 'X', meaning: 'The number of successes in the $n$ trials of one unit.' },
      { sym: 'k', meaning: 'A possible count, a whole number from 0 to $n$.' },
      { sym: 'P(X = k)', meaning: 'The probability of exactly $k$ successes, averaged over the possible success probabilities.' },
      { sym: 'n', meaning: 'The number of trials.' },
      { sym: '\\alpha', meaning: 'The first shape parameter of the Beta distribution of the success probability. It acts like a number of prior successes; it must be positive.' },
      { sym: '\\beta', meaning: 'The second shape parameter, acting like a number of prior failures; it must be positive.' },
      { sym: '\\dbinom{n}{k}', meaning: 'The binomial coefficient $\\frac{n!}{k!\\,(n-k)!}$: the number of ways to choose which $k$ of the $n$ trials are successes.' },
      { sym: 'B(a, b)', meaning: 'The beta function, $B(a, b) = \\int_0^1 t^{a-1}(1-t)^{b-1}\\,dt = \\frac{\\Gamma(a)\\Gamma(b)}{\\Gamma(a + b)}$, where $\\Gamma$ is the gamma function ($\\Gamma(m) = (m-1)!$ for whole numbers). $B(\\alpha, \\beta)$ is the normalizing constant of the Beta density.' },
      { sym: '\\dfrac{B(k + \\alpha,\\ n - k + \\beta)}{B(\\alpha, \\beta)}', meaning: 'The average, over the Beta distribution of $p$, of the probability $p^k(1-p)^{n-k}$ of one particular sequence with $k$ successes.' },
    ],

    cdfTex: 'F(x) = P(X \\le x) = \\sum_{k=0}^{\\lfloor x \\rfloor} \\binom{n}{k} \\frac{B(k + \\alpha,\\ n - k + \\beta)}{B(\\alpha, \\beta)}',
    cdfGlossary: [
      { sym: 'F(x)', meaning: 'The cumulative distribution function: the probability of at most $x$ successes. It is a staircase that steps up at each count $0, 1, \\dots, n$.' },
      { sym: 'P(X \\le x)', meaning: 'The probability that the count is less than or equal to $x$.' },
      { sym: '\\lfloor x \\rfloor', meaning: 'The floor of $x$: $x$ rounded down to a whole number.' },
      { sym: '\\sum_{k=0}^{\\lfloor x \\rfloor}', meaning: 'Add up the probabilities of the counts $0, 1, \\dots, \\lfloor x \\rfloor$. There is no simpler closed form (it can be written with the generalized hypergeometric function $_3F_2$); this page adds the terms.' },
      { sym: 'n,\\ \\alpha,\\ \\beta,\\ B(a, b)', meaning: 'The number of trials, the two Beta shape parameters and the beta function, as above.' },
    ],
    extraFormulas: [
      {
        title: 'Two-stage (hierarchical) form',
        intro: 'The beta-binomial is a mixture: draw the success probability first, then the count. Averaging the binomial probabilities over the Beta density gives the formula above.',
        tex: 'p \\sim \\mathrm{Beta}(\\alpha, \\beta), \\qquad X \\mid p \\sim \\mathrm{Bin}(n, p) \\quad\\Longrightarrow\\quad P(X = k) = \\int_0^1 \\binom{n}{k} p^k (1 - p)^{n - k}\\, \\frac{p^{\\alpha - 1}(1 - p)^{\\beta - 1}}{B(\\alpha, \\beta)}\\, dp',
        glossary: [
          { sym: 'p', meaning: 'The success probability of one unit, between 0 and 1.' },
          { sym: '\\mathrm{Beta}(\\alpha, \\beta)', meaning: 'The Beta distribution, which describes how the success probability varies between units.' },
          { sym: 'X \\mid p \\sim \\mathrm{Bin}(n, p)', meaning: 'Given $p$, the count is binomial with $n$ trials and success probability $p$.' },
          { sym: '\\int_0^1 \\dots dp', meaning: 'Average over all possible values of $p$, weighted by the Beta density.' },
        ],
      },
      {
        title: 'Mean and overdispersion form',
        intro: 'Many applications use the mean success probability $\\pi$ and the intra-class correlation $\\rho$ instead of $\\alpha$ and $\\beta$.',
        tex: '\\pi = \\frac{\\alpha}{\\alpha + \\beta}, \\qquad \\rho = \\frac{1}{\\alpha + \\beta + 1}, \\qquad \\mathrm{Var}(X) = n\\pi(1 - \\pi)\\,\\big[1 + (n - 1)\\rho\\big]',
        glossary: [
          { sym: '\\pi', meaning: 'The mean success probability (here $\\pi$ is a parameter, not the constant 3.14159…).' },
          { sym: '\\rho', meaning: 'The correlation between two trials of the same unit, between 0 and 1. With $\\rho = 0$ the trials are independent and the count is binomial.' },
          { sym: '1 + (n - 1)\\rho', meaning: 'The overdispersion factor: how many times larger the variance is than the binomial variance $n\\pi(1-\\pi)$. In survey sampling the same factor is called the design effect of cluster sampling.' },
        ],
      },
    ],

    properties: [
      { name: 'Support', tex: 'k \\in \\{0, 1, \\dots, n\\}', value: p => `0, …, ${p.n}`, explain: 'Any whole number of successes from none to all $n$ trials.' },
      { name: 'Mean', tex: '\\mathrm{E}[X] = \\frac{n\\alpha}{\\alpha + \\beta}', value: p => stats(p).mean, explain: 'The mean of the Beta distribution, $\\alpha/(\\alpha + \\beta)$, times the number of trials: the same as a binomial with that success probability.' },
      { name: 'Median', tex: '\\text{smallest } k \\text{ with } F(k) \\ge \\tfrac12', value: p => stats(p).median, explain: 'There is no closed form; the value shown is computed from the CDF. With $\\alpha = \\beta$ the distribution is symmetric about $n/2$.' },
      { name: 'Mode', tex: '\\arg\\max_k P(X = k)', value: p => stats(p).mode, explain: 'The most likely count, found by comparing the probabilities. For $\\alpha > 1$ and $\\beta > 1$ the distribution has a single peak near $n(\\alpha - 1)/(\\alpha + \\beta - 2)$, the mode of the Beta distribution times $n$. For $\\alpha < 1$ and $\\beta < 1$ it is U-shaped with peaks at 0 and $n$. For $\\alpha \\le 1 \\le \\beta$ (not both equal to 1) the probabilities decrease from a peak at 0, and for $\\beta \\le 1 \\le \\alpha$ they increase toward $n$. When two counts tie, the larger is shown.' },
      { name: 'Variance', tex: '\\mathrm{Var}(X) = \\frac{n\\alpha\\beta(\\alpha + \\beta + n)}{(\\alpha + \\beta)^2(\\alpha + \\beta + 1)}', value: p => stats(p).variance, explain: 'Equal to $n\\pi(1 - \\pi)\\,[1 + (n - 1)/(\\alpha + \\beta + 1)]$ with $\\pi = \\alpha/(\\alpha + \\beta)$: the binomial variance times an overdispersion factor that is larger than 1 whenever $n > 1$. With $n = 1$ the factor is 1, because a single trial is always Bernoulli($\\pi$).' },
      { name: 'Standard deviation', tex: '\\sqrt{\\mathrm{Var}(X)}', value: p => stats(p).sd, explain: 'The square root of the variance. It lies between the binomial value $\\sqrt{n\\pi(1-\\pi)}$ (as $\\alpha + \\beta \\to \\infty$) and $n\\sqrt{\\pi(1-\\pi)}$ (as $\\alpha + \\beta \\to 0$, when every unit succeeds on all trials or on none).' },
      { name: 'Skewness', tex: '\\frac{(\\alpha + \\beta + 2n)(\\beta - \\alpha)}{\\alpha + \\beta + 2}\\sqrt{\\frac{1 + \\alpha + \\beta}{n\\alpha\\beta(n + \\alpha + \\beta)}}', value: p => stats(p).skewness, explain: 'Zero when $\\alpha = \\beta$; right-skewed when $\\alpha < \\beta$ (successes are rare on average) and left-skewed when $\\alpha > \\beta$.' },
      { name: 'Excess kurtosis', tex: '{\\frac{s^2(1+s)\\left[s(s-1+6n) + 3\\alpha\\beta(n-2) + 6n^2 - \\frac{3\\alpha\\beta n(6-n)}{s} - \\frac{18\\alpha\\beta n^2}{s^2}\\right]}{n\\alpha\\beta(s+2)(s+3)(s+n)} - 3}', value: p => stats(p).exKurtosis, explain: 'Here $s = \\alpha + \\beta$ (a shorthand used only in this row). The fraction is the kurtosis itself; subtracting 3 gives the excess kurtosis. Negative (light tails) when the distribution is flat or U-shaped, for example $-1.2$ approached by the discrete uniform case $\\alpha = \\beta = 1$ as $n$ grows; it approaches the binomial value as $\\alpha + \\beta \\to \\infty$.' },
      { name: 'Entropy', tex: '-\\sum_{k=0}^{n} P(X = k) \\ln P(X = k)', value: p => stats(p).entropy, explain: 'In nats. There is no closed form; the value shown is the exact sum. It is largest, $\\ln(n + 1)$, for the flat case $\\alpha = \\beta = 1$.' },
      { name: 'Probability-generating function', tex: 'G(z) = {}_2F_1(-n, \\alpha;\\ \\alpha + \\beta;\\ 1 - z)', explain: '$\\mathrm{E}[z^X]$, written with the Gauss hypergeometric function $_2F_1$. It equals the binomial generating function $(1 - p + pz)^n$ averaged over the Beta distribution of $p$.' },
      { name: 'Characteristic function', tex: '\\varphi(t) = {}_2F_1(-n, \\alpha;\\ \\alpha + \\beta;\\ 1 - e^{it})', explain: '$\\mathrm{E}[e^{itX}] = G(e^{it})$, the generating function evaluated at $z = e^{it}$, where $i = \\sqrt{-1}$. The moment-generating function is $G(e^{t})$.' },
      { name: 'Factorial moments', tex: '\\mathrm{E}\\big[X(X-1)\\cdots(X-r+1)\\big] = \\frac{n!}{(n-r)!}\\,\\frac{B(\\alpha + r, \\beta)}{B(\\alpha, \\beta)}', explain: 'The $r$-th factorial moment is the binomial one, $\\frac{n!}{(n-r)!}p^r$, with $p^r$ replaced by its Beta average $\\mathrm{E}[p^r]$. The mean and variance follow from $r = 1, 2$.' },
      { name: 'Overdispersion factor', tex: '\\frac{\\mathrm{Var}(X)}{n\\pi(1 - \\pi)} = 1 + \\frac{n - 1}{\\alpha + \\beta + 1}', value: ({ n, alpha, beta }) => 1 + (n - 1) / (alpha + beta + 1), explain: 'How many times larger the variance is than that of a binomial count with the same mean ($\\pi = \\alpha/(\\alpha + \\beta)$). Overdispersion tests and quasi-binomial models estimate this factor from data.' },
    ],

    limits: [
      { text: '<b>Binomial with a varying success probability.</b> The beta-binomial is the binomial mixed over a Beta distribution of $p$. As $\\alpha + \\beta \\to \\infty$ with $\\alpha/(\\alpha + \\beta) \\to p$, the Beta distribution collapses onto $p$ and the beta-binomial approaches $\\mathrm{Bin}(n, p)$.', relation: 'binomial--beta-binomial', to: 'binomial' },
      { text: '<b>Uniform prior gives uniform counts.</b> With $\\alpha = \\beta = 1$ the success probability is uniform on $(0, 1)$ and every count $0, 1, \\dots, n$ has probability $1/(n + 1)$: the discrete uniform distribution. This is the result behind Bayes’ billiard-table argument.', relation: 'beta-binomial--discrete-uniform', to: 'discrete-uniform' },
      { text: '<b>One trial.</b> With $n = 1$ the count is $\\mathrm{Bernoulli}(\\alpha/(\\alpha + \\beta))$: averaging over $p$ cannot be detected from a single trial.', to: 'bernoulli' },
      { text: '<b>Extreme overdispersion.</b> As $\\alpha + \\beta \\to 0$ with $\\alpha/(\\alpha + \\beta) \\to \\pi$, each unit has $p$ close to 0 or 1, so the count is 0 with probability $1 - \\pi$ and $n$ with probability $\\pi$.' },
      { text: '<b>Negative binomial limit.</b> As $n \\to \\infty$ and $\\beta \\to \\infty$ with $n/\\beta \\to \\lambda$ fixed, the beta-binomial approaches the negative binomial distribution with $r = \\alpha$ and $p = 1/(1 + \\lambda)$ (the Poisson analog of the binomial–Beta mixture is the gamma–Poisson mixture).', to: 'negative-binomial' },
      { text: '<b>More than two categories.</b> With a Dirichlet distribution in place of the Beta and a multinomial in place of the binomial, the same construction gives the Dirichlet-multinomial distribution, used for overdispersed category counts.', to: 'dirichlet' },
    ],

    uses: {
      frequentist: [
        '<b>Overdispersed binomial data.</b> When proportions vary more between units than a binomial model allows (litters in toxicology, clinics in a multi-center study, participants in an experiment), beta-binomial regression models the extra variation; the mean is linked to predictors with a logit link and $\\rho$ is estimated with it. Quasi-binomial models and generalized linear mixed models are the common alternatives.',
        '<b>Testing for overdispersion.</b> Score tests such as Tarone’s test compare the binomial model with the beta-binomial (the binomial is the special case $\\rho = 0$).',
        '<b>Toxicology and teratology.</b> The number of affected fetuses per litter is the classic example (Williams, 1975): pups in the same litter share a mother and are correlated, so the beta-binomial fits much better than the binomial.',
        '<b>Item response and test scores.</b> In psychometrics the beta-binomial (Keats–Lord) model describes the distribution of number-correct scores on a test of $n$ items, with true scores varying between examinees.',
      ],
      bayesian: [
        '<b>Prior and posterior predictive distribution.</b> With a $\\mathrm{Beta}(\\alpha, \\beta)$ prior for a binomial $p$, the prior predictive distribution of a count in $n$ trials is $\\mathrm{BetaBin}(n, \\alpha, \\beta)$. After observing $x$ successes in $m$ trials the posterior is $\\mathrm{Beta}(\\alpha + x,\\ \\beta + m - x)$, and the number of successes in $n$ future trials is $\\mathrm{BetaBin}(n,\\ \\alpha + x,\\ \\beta + m - x)$.',
        '<b>Marginal likelihood and Bayes factors.</b> The beta-binomial probability of the observed count is the marginal likelihood of the Beta–binomial model. Comparing it with the binomial probability at a fixed $p_0$ gives the Bayes factor for testing $p = p_0$ (Lee and Wagenmakers, Chapter 7).',
        '<b>Hierarchical models for proportions.</b> In the rat tumor example of Gelman et al. (Chapter 5), each experiment has its own tumor probability drawn from a common Beta distribution. Integrating out the probabilities leaves a beta-binomial likelihood for the hyperparameters $\\alpha$ and $\\beta$; the posterior for each experiment shrinks its raw proportion toward the population mean.',
        '<b>Empirical Bayes.</b> Estimating $\\alpha$ and $\\beta$ from many units by maximizing the beta-binomial likelihood, and then using the Beta posterior for each unit, is a standard empirical Bayes method (for example for batting averages or click-through rates).',
      ],
      modeling: [
        '<b>Individual differences in accuracy.</b> In cognitive experiments, the number of correct trials out of $n$ per participant is often overdispersed because participants differ in ability; a beta-binomial model, or a hierarchical model with a Beta or logit-normal distribution of abilities, captures this.',
        '<b>Population genetics.</b> Allele counts in samples from several subpopulations follow a beta-binomial distribution under the Balding–Nichols model, with $\\rho$ equal to the fixation index $F_{ST}$.',
        '<b>Sequencing data.</b> Allele-specific expression and methylation counts from sequencing reads are modeled as beta-binomial to account for biological variation between samples beyond binomial sampling of reads.',
        '<b>Bayes’ billiard table and urn models.</b> Bayes (1763) showed that with a uniform prior every count is equally likely. The beta-binomial is also the distribution of the number of red balls drawn in $n$ draws from a Pólya urn that starts with $\\alpha$ red and $\\beta$ black balls (whole numbers here), where each drawn ball is put back together with one more ball of the same color.',
      ],
    },

    references: [
      { text: 'Wikipedia: Beta-binomial distribution.', url: 'https://en.wikipedia.org/wiki/Beta-binomial_distribution' },
      { text: 'Gelman, A., Carlin, J. B., Stern, H. S., Dunson, D. B., Vehtari, A., & Rubin, D. B. (2013). <i>Bayesian Data Analysis</i> (3rd ed.), Sections 2.4 and 5.3 and Appendix A. CRC Press.', url: 'http://www.stat.columbia.edu/~gelman/book/' },
      { text: 'Casella, G., & Berger, R. L. (2002). <i>Statistical Inference</i> (2nd ed.), Section 4.4 (hierarchical models and mixture distributions). Duxbury.' },
      { text: 'Johnson, N. L., Kemp, A. W., & Kotz, S. (2005). <i>Univariate Discrete Distributions</i> (3rd ed.), Section 6.2.2. Wiley.' },
      { text: 'Williams, D. A. (1975). The analysis of binary responses from toxicological experiments involving reproduction and teratogenicity. <i>Biometrics</i>, 31(4), 949–952.', url: 'https://doi.org/10.2307/2529820' },
      { text: 'Lee, M. D., & Wagenmakers, E.-J. (2013). <i>Bayesian Cognitive Modeling: A Practical Course</i>, Chapters 3 and 7. Cambridge University Press.' },
      { text: 'Leemis, L. M., & McQueston, J. T. (2008). Univariate distribution relationships. <i>The American Statistician</i>, 62(1), 45–53.', url: 'https://doi.org/10.1198/000313008X270448' },
    ],
  },
};
