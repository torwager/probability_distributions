// Negative binomial distribution: the number of failures K before the r-th success in independent
// Bernoulli(p) trials, with r allowed to be any positive real number (gamma-Poisson mixture).
// Follows the structure of the reference module dists/normal.js (see ARCHITECTURE.md).

import { catalogParams } from '../catalog.js';
import { lgamma, betaI, betaIc, quantileDiscrete } from '../core/math.js';

// log of Gamma(k + r) / (k! Gamma(r)), the generalized binomial coefficient C(k + r - 1, k)
const logCoef = (k, r) => lgamma(k + r) - lgamma(r) - lgamma(k + 1);

function pdf(k, { r, p }) {
  if (!Number.isInteger(k) || k < 0) return 0;
  if (p >= 1) return k === 0 ? 1 : 0;
  return Math.exp(logCoef(k, r) + r * Math.log(p) + k * Math.log1p(-p));
}

// P(K <= k) = I_p(r, k + 1), the regularized incomplete beta function
function cdf(x, { r, p }) {
  const k = Math.floor(x);
  if (k < 0) return 0;
  if (p >= 1) return 1;
  return betaI(p, r, k + 1);
}

function sf(x, { r, p }) {
  const k = Math.floor(x);
  if (k < 0) return 1;
  if (p >= 1) return 0;
  return betaIc(p, r, k + 1);
}

const meanOf = ({ r, p }) => r * (1 - p) / p;
const quantile = (u, prm) => (prm.p >= 1 ? 0 : quantileDiscrete(x => cdf(x, prm), u, 0, Infinity, Math.floor(meanOf(prm))));

/** Mode: floor((r - 1)(1 - p)/p) for r > 1, else 0. When that value is a whole number m, m - 1 and m tie; m is reported. */
function modeOf({ r, p }) {
  if (r <= 1 || p >= 1) return 0;
  const m = (r - 1) * (1 - p) / p;
  return Math.floor(m * (1 + 1e-12) + 1e-9);
}

/** Entropy in nats, summed over the support until the remaining tail is negligible. */
function entropy(prm) {
  if (prm.p >= 1) return 0;
  const mean = meanOf(prm);
  let H = 0;
  for (let k = 0; k < 2e6; k++) {
    const f = pdf(k, prm);
    if (f > 0) H -= f * Math.log(f);
    // beyond the mean the probabilities fall at least as fast as (1 - p)^k, so the tail is below f / p
    if (k > mean + 1 && f < 1e-18 * prm.p) break;
  }
  return H;
}

function stats(prm) {
  const { r, p } = prm;
  const q = 1 - p;
  if (p >= 1) return { mean: 0, variance: 0, sd: 0, median: 0, mode: 0, skewness: NaN, exKurtosis: NaN, entropy: 0 };
  const v = r * q / (p * p);
  return {
    mean: r * q / p,
    variance: v,
    sd: Math.sqrt(v),
    median: quantile(0.5, prm),
    mode: modeOf(prm),
    skewness: (2 - p) / Math.sqrt(r * q),
    exKurtosis: 6 / r + p * p / (r * q),
    entropy: entropy(prm),
  };
}

// Poisson probabilities joined by a smooth curve (lgamma interpolates k!), for the overlay
const poissonCurve = (x, mu) => (x < 0 || !(mu > 0) ? NaN : Math.exp(x * Math.log(mu) - mu - lgamma(x + 1)));

const R_MIN = 0.2, R_MAX = 30, P_MIN = 0.01;

export default {
  id: 'negative-binomial',
  name: 'Negative binomial',
  kind: 'discrete',

  // r gets a logarithmic slider automatically (max/min >= 50)
  // p gets a linear slider and a fine drag resolution, so that dragging the standard-deviation arrow
  // (which sets r and p together) keeps the mean where it was
  params: catalogParams('negative-binomial', { r: { step: 0.1 }, p: { step: 0.01, log: false, dragStep: 0.00001 } }),

  pdf,
  cdf,
  sf,
  quantile,
  sample: (rng, { r, p }) => rng.negativeBinomial(r, p),

  testParams: [{ r: 1, p: 0.3 }, { r: 0.2, p: 0.1 }, { r: 0.5, p: 0.8 }, { r: 30, p: 0.9 }, { r: 2.5, p: 0.05 }, { r: 3, p: 0.5 }, { r: 4, p: 1 }],

  range: () => [0, Infinity],
  support: prm => [0, Math.max(6, quantile(0.9995, prm))],

  stats,

  // - a dashed line at the mean r(1 - p)/p: drag it to move the mean; r stays fixed and p = r/(r + mean);
  // - a horizontal arrow from the mean to mean + standard deviation, at half the peak height: drag its tip to
  //   change the spread with the mean held fixed. The variance is mean + mean^2/r, so a wider arrow means a
  //   smaller r (more overdispersion); the arrow cannot be shorter than about sqrt(mean), the Poisson spread.
  handles: [
    {
      type: 'vline', param: 'p', id: 'vline-mean', label: 'mean',
      x: meanOf,
      set: (pt, { r }) => ({ p: r / (r + Math.max(pt.x, 0)) }),
      ariaLabel: 'Mean number of failures r(1 − p)/p. Drag left or right to change p with r fixed, or use the arrow keys.',
    },
    {
      type: 'hArrow', param: 'r', id: 'harrow-sd', label: 'sd',
      from: prm => ({ x: meanOf(prm), y: 0.5 * pdf(modeOf(prm), prm) }),
      to: prm => ({ x: meanOf(prm) + stats(prm).sd, y: 0.5 * pdf(modeOf(prm), prm) }),
      set: (pt, prm, p0) => {
        const mu = meanOf(p0);
        if (!(mu > 0)) return null;
        const s = Math.max(pt.x - mu, 0);
        const excess = s * s - mu;                       // mean^2 / r
        let r = excess > 0 ? mu * mu / excess : R_MAX;
        // keep p = r/(r + mean) at or above its minimum 0.01, so that the mean does not move
        r = Math.min(R_MAX, Math.max(R_MIN, P_MIN * mu / (1 - P_MIN) * (1 + 1e-6), r));
        return { r, p: r / (r + mu) };                  // keep the mean where the drag started
      },
      key: 'drag',
      ariaLabel: 'Standard deviation, drawn from the mean. Drag the tip, or use the arrow keys, to change the spread with the mean fixed (this sets r).',
    },
  ],

  explorer: {
    // fit the y axis to the taller of the negative binomial and the Poisson overlay
    // fit the y axis to the negative binomial, with room for the Poisson overlay unless it is far taller
    // (then the overlay is cut off at the top rather than squashing the negative binomial)
    yMax: prm => {
      const mu = meanOf(prm);
      const nb = pdf(modeOf(prm), prm);
      if (!(mu > 0)) return nb;
      let pois = 0;
      for (let x = Math.max(0, mu - 1.5); x <= mu + 0.5; x += 0.05) pois = Math.max(pois, poissonCurve(x, mu));
      return Math.max(nb, Math.min(pois, 2.5 * nb));
    },
    varName: 'K',
    readouts: [
      { key: 'mean', label: 'Mean r(1 − p)/p' },
      { key: 'sd', label: 'Standard deviation' },
      { label: 'Variance ÷ mean = 1/p', value: ({ p }) => 1 / p },
      { key: 'mode', label: 'Mode' },
      { label: 'P(K = 0) = pʳ', value: prm => pdf(0, prm) },
    ],
    overlays: prm => {
      const mu = meanOf(prm);
      return mu > 0 ? [{ id: 'poisson', label: 'Poisson with the same mean', pdf: x => poissonCurve(x, mu), stems: true, offset: 0.25 }] : [];
    },
  },

  content: {
    description: [
      'The negative binomial distribution has two common readings. In the first, it counts the failures before the $r$-th success in a sequence of independent trials that each succeed with probability $p$: for example, the number of rejected applications before a third acceptance, or the number of non-target items a participant searches before finding $r$ targets. With $r = 1$ it is the geometric distribution.',
      'In the second reading, it is a model for counts that vary more than a Poisson count would. If each unit (a person, a neuron, a gene, a stretch of road) has its own Poisson rate, and those rates follow a gamma distribution, the pooled counts are negative binomial. The variance is then larger than the mean, a pattern called overdispersion, which is common in real count data. In this reading $r$ need not be a whole number; it measures how much the rates vary, with small $r$ meaning a lot of variation.',
      'The variable $K$ takes the whole-number values $0, 1, 2, \\dots$ with no upper limit. The success probability $p$ mostly sets the location: the mean is $r(1-p)/p$. The size $r$ sets the shape: for $r \\le 1$ the most likely value is 0 and the distribution decays from there, while for larger $r$ it has a hump that becomes more symmetric and bell-shaped as $r$ grows.',
    ],
    explorerIntro: 'The left plot shows the probability of each count $k$ as a stem, and the right plot the cumulative probability $F(k)$. The grey stems, drawn just to the right of the steel ones, are the probabilities of a Poisson distribution with the same mean, for comparison. When that Poisson is much narrower and taller, its stems are cut off at the top so that the negative binomial stays readable. Drag the dashed amber line to move the mean $r(1-p)/p$; this changes $p$ while $r$ stays fixed. Drag the tip of the horizontal arrow to change the standard deviation while the mean stays where it is; this changes $r$ (and $p$ with it). Because the variance is $\\mu + \\mu^2/r$, where $\\mu$ is the mean, the spread can never be smaller than the Poisson spread $\\sqrt\\mu$, and the arrow stops near that length when $r$ reaches its largest value. You can also type $r$ and $p$ in the boxes.',

    pdfTex: 'P(K = k) = \\binom{k + r - 1}{k}\\, p^{r} (1 - p)^{k} = \\frac{\\Gamma(k + r)}{k!\\;\\Gamma(r)}\\, p^{r} (1 - p)^{k}, \\qquad k = 0, 1, 2, \\dots',
    glossary: [
      { sym: 'K', meaning: 'The random number of failures before the $r$-th success (or, in the overdispersed-count reading, the count).' },
      { sym: 'k', meaning: 'A possible count: a whole number $0, 1, 2, \\dots$' },
      { sym: 'P(K = k)', meaning: 'The probability that the count equals $k$.' },
      { sym: 'r', meaning: 'The number of successes waited for (the size). It must be positive; the formula works for any positive real $r$, not only whole numbers.' },
      { sym: 'p', meaning: 'The success probability of each trial, with $0 < p \\le 1$.' },
      { sym: '\\dbinom{k + r - 1}{k}', meaning: 'The number of ways to place the $k$ failures among the first $k + r - 1$ trials. The last trial must be the $r$-th success, so only the trials before it can be arranged.' },
      { sym: '\\Gamma(\\cdot)', meaning: 'The gamma function, which extends the factorial to real numbers: $\\Gamma(m) = (m-1)!$ for whole numbers $m$. Writing the coefficient with gamma functions defines it for non-integer $r$.' },
      { sym: 'k!', meaning: 'The factorial $1 \\cdot 2 \\cdots k$, with $0! = 1$.' },
      { sym: 'p^{r} (1 - p)^{k}', meaning: 'The probability of one particular arrangement with $r$ successes and $k$ failures.' },
    ],

    cdfTex: 'F(x) = P(K \\le x) = \\sum_{k=0}^{\\lfloor x \\rfloor} P(K = k) = I_{p}\\big(r,\\ \\lfloor x \\rfloor + 1\\big)',
    cdfGlossary: [
      { sym: 'F(x)', meaning: 'The cumulative distribution function: the probability that the count is at most $x$. It is a staircase that steps up at $0, 1, 2, \\dots$' },
      { sym: 'P(K \\le x)', meaning: 'The probability that the count is less than or equal to $x$.' },
      { sym: '\\lfloor x \\rfloor', meaning: 'The floor of $x$: $x$ rounded down to a whole number.' },
      { sym: '\\sum_{k=0}^{\\lfloor x \\rfloor}', meaning: 'Add up the probabilities of the counts $0, 1, \\dots, \\lfloor x \\rfloor$.' },
      { sym: 'I_{p}(a, b)', meaning: 'The regularized incomplete beta function, which is the CDF of a $\\mathrm{Beta}(a, b)$ distribution evaluated at $p$. The identity says that at most $x$ failures happen before the $r$-th success exactly when the $r$-th success arrives within the first $r + \\lfloor x \\rfloor$ trials. This page uses it to compute the CDF accurately without adding many terms.' },
      { sym: 'r,\\ p', meaning: 'The size and the success probability, as above.' },
    ],

    extraFormulas: [
      {
        title: 'Mean and dispersion form (used in regression software)',
        intro: 'Regression models describe the mean directly. Writing $\\mu$ for the mean and keeping $r$ as a dispersion parameter, the probabilities and the variance become the following. This is the form used by R’s <code>glm.nb</code> (where $r$ is called <code>theta</code>), by Stan’s <code>neg_binomial_2</code> (where $r$ is called <code>phi</code>) and, with $\\alpha = 1/r$, by many other programs.',
        tex: 'P(K = k) = \\frac{\\Gamma(k + r)}{k!\\;\\Gamma(r)} \\left(\\frac{r}{r + \\mu}\\right)^{r} \\left(\\frac{\\mu}{r + \\mu}\\right)^{k}, \\qquad \\mu = \\frac{r(1 - p)}{p}, \\qquad \\mathrm{Var}(K) = \\mu + \\frac{\\mu^2}{r}',
        glossary: [
          { sym: '\\mu', meaning: 'The mean count. Then $p = r/(r + \\mu)$.' },
          { sym: 'r', meaning: 'The dispersion (size) parameter. A smaller $r$ means more extra variation; as $r \\to \\infty$ the variance falls to $\\mu$ and the distribution becomes Poisson.' },
          { sym: '\\mu^2 / r', meaning: 'The extra variance beyond the Poisson variance $\\mu$. It grows with the square of the mean, which is the quadratic mean–variance relation of “NB2” regression.' },
          { sym: '\\mathrm{Var}(K)', meaning: 'The variance of the count.' },
        ],
      },
      {
        title: 'Gamma–Poisson mixture',
        intro: 'If the Poisson rate $\\lambda$ is itself random with a gamma distribution, the count, averaged over the possible rates, is negative binomial. This is how non-integer $r$ arises.',
        tex: '\\lambda \\sim \\mathrm{Gamma}(r, \\beta),\\quad K \\mid \\lambda \\sim \\mathrm{Poisson}(\\lambda) \\ \\Rightarrow\\ K \\sim \\mathrm{NegBin}\\Big(r,\\ p = \\frac{\\beta}{1 + \\beta}\\Big)',
        glossary: [
          { sym: '\\lambda', meaning: 'The Poisson rate of one unit, which varies from unit to unit.' },
          { sym: '\\mathrm{Gamma}(r, \\beta)', meaning: 'The gamma distribution with shape $r$ and rate $\\beta$, which describes how the rates vary. Its mean is $r/\\beta$, which is also the mean count.' },
          { sym: 'K \\mid \\lambda', meaning: 'The count of a unit whose rate is $\\lambda$.' },
          { sym: '\\Rightarrow', meaning: 'Implies.' },
        ],
      },
      {
        title: 'Likelihood and the Beta posterior (known r)',
        intro: 'With $r$ known and observed counts $k_1, \\dots, k_n$, the likelihood is proportional to $p^{nr} (1 - p)^{\\sum k_i}$, so a $\\mathrm{Beta}(\\alpha, \\beta)$ prior on $p$ gives a Beta posterior. When $r$ is unknown there is no conjugate prior, and $r$ is estimated numerically (by maximum likelihood or MCMC).',
        tex: 'p \\mid k_1, \\dots, k_n \\ \\sim\\ \\mathrm{Beta}\\Big(\\alpha + n r,\\ \\beta + \\sum_{i=1}^{n} k_i\\Big)',
        glossary: [
          { sym: 'k_1, \\dots, k_n', meaning: 'The observed counts.' },
          { sym: '\\alpha,\\ \\beta', meaning: 'The parameters of the Beta prior for $p$; they act like prior counts of successes and failures.' },
          { sym: 'n r', meaning: 'The total number of successes in the $n$ repetitions, each of which waits for $r$ successes.' },
        ],
      },
    ],

    properties: [
      { name: 'Support', tex: 'k \\in \\{0, 1, 2, \\dots\\}', value: () => '0, 1, 2, …', explain: 'Any whole number. There is no upper limit.' },
      { name: 'Mean', tex: '\\mathrm{E}[K] = \\frac{r(1 - p)}{p}', value: prm => stats(prm).mean, explain: 'Each of the $r$ successes is preceded on average by $(1-p)/p$ failures, the geometric mean.' },
      { name: 'Median', tex: '\\text{no closed form}', value: prm => stats(prm).median, explain: 'The value shown is the smallest $k$ with $F(k) \\ge 1/2$, found from the CDF. Because of the right skew it is usually a little below the mean.' },
      { name: 'Mode', tex: '\\left\\lfloor \\frac{(r - 1)(1 - p)}{p} \\right\\rfloor \\ (r > 1); \\quad 0 \\ (r \\le 1)', value: prm => stats(prm).mode, explain: 'The most likely count. For $r \\le 1$ the probabilities decrease from $k = 0$ onward. When $(r-1)(1-p)/p$ is a whole number $m \\ge 1$, the counts $m - 1$ and $m$ are equally likely and the larger is shown.' },
      { name: 'Variance', tex: '\\mathrm{Var}(K) = \\frac{r(1 - p)}{p^2} = \\mu + \\frac{\\mu^2}{r}', value: prm => stats(prm).variance, explain: 'Always larger than the mean $\\mu$, by the factor $1/p$. The excess $\\mu^2/r$ is the variance that comes from the unit-to-unit variation in rates.' },
      { name: 'Standard deviation', tex: '\\frac{\\sqrt{r(1 - p)}}{p}', value: prm => stats(prm).sd, explain: 'The square root of the variance, in the same units as the count.' },
      { name: 'Skewness', tex: '\\frac{2 - p}{\\sqrt{r(1 - p)}}', value: prm => stats(prm).skewness, explain: 'Always positive (a long right tail), and shrinking like $1/\\sqrt r$, which is why the distribution looks more and more normal as $r$ grows. Undefined for $p = 1$, where $K = 0$ with certainty.' },
      { name: 'Excess kurtosis', tex: '\\frac{6}{r} + \\frac{p^2}{r(1 - p)}', value: prm => stats(prm).exKurtosis, explain: 'Positive and shrinking like $1/r$ toward 0, the normal value. Undefined for $p = 1$.' },
      { name: 'Entropy', tex: '-\\sum_{k=0}^{\\infty} P(K = k) \\ln P(K = k)', value: prm => stats(prm).entropy, explain: 'In nats. There is no closed form; the value shown is the sum computed over the support.' },
      { name: 'Probability-generating function', tex: 'G(z) = \\mathrm{E}[z^K] = \\left(\\frac{p}{1 - (1 - p) z}\\right)^{r}, \\quad |z| < \\frac{1}{1 - p}', explain: 'The geometric generating function raised to the power $r$. It shows that independent negative binomial counts with the same $p$ add: $\\mathrm{NegBin}(r_1, p) + \\mathrm{NegBin}(r_2, p) = \\mathrm{NegBin}(r_1 + r_2, p)$.' },
      { name: 'Moment-generating function', tex: 'M(t) = \\left(\\frac{p}{1 - (1 - p)e^{t}}\\right)^{r}, \\quad t < -\\ln(1 - p)', explain: '$\\mathrm{E}[e^{tK}]$. Its derivatives at $t = 0$ give the moments.' },
      { name: 'Characteristic function', tex: '\\varphi(t) = \\left(\\frac{p}{1 - (1 - p)e^{it}}\\right)^{r}', explain: '$\\mathrm{E}[e^{itK}]$, where $i = \\sqrt{-1}$. It exists for every real $t$.' },
      { name: 'Variance-to-mean ratio', tex: '\\frac{\\mathrm{Var}(K)}{\\mathrm{E}[K]} = \\frac{1}{p} = 1 + \\frac{\\mu}{r}', value: prm => 1 / prm.p, explain: 'Also called the index of dispersion or, for spike counts, the Fano factor. It equals 1 for a Poisson count; values above 1 indicate overdispersion.' },
      { name: 'Probability of zero', tex: 'P(K = 0) = p^{r} = \\left(\\frac{r}{r + \\mu}\\right)^{r}', value: prm => pdf(0, prm), explain: 'For the same mean, a negative binomial puts more probability on zero than a Poisson ($e^{-\\mu}$), which is one reason it fits data with many zeros.' },
    ],

    limits: [
      { text: '<b>Geometric as the case $r = 1$.</b> $\\mathrm{NegBin}(1, p) = \\mathrm{Geom}(p)$. For a whole number $r$, a $\\mathrm{NegBin}(r, p)$ count is the sum of $r$ independent $\\mathrm{Geom}(p)$ counts, one wait for each success.', relation: 'geometric--negative-binomial', to: 'geometric' },
      { text: '<b>Poisson limit.</b> As $r \\to \\infty$ with the mean $\\mu = r(1-p)/p$ held fixed, $\\mathrm{NegBin}(r, p)$ approaches $\\mathrm{Poisson}(\\mu)$: the extra variance $\\mu^2/r$ disappears. In the mixture reading, the gamma distribution of rates shrinks to a single value. Conversely, a Poisson count whose rate is gamma distributed is negative binomial.', relation: 'poisson--negative-binomial', to: 'poisson' },
      { text: '<b>Normal limit.</b> As $r \\to \\infty$ with $p$ fixed, the count is a sum of many independent pieces, and $(K - \\mu)/\\sigma$ approaches $\\mathcal N(0, 1)$, where $\\sigma$ is the standard deviation (central limit theorem).', to: 'normal' },
      { text: '<b>Gamma limit for rare successes.</b> As $p \\to 0$ with $r$ fixed, the rescaled count $pK$ approaches $\\mathrm{Gamma}(r, 1)$ (shape $r$, rate 1), just as the geometric approaches the exponential. This is the discrete-to-continuous limit of waiting for $r$ events.', to: 'gamma' },
      { text: '<b>Certain success, $p = 1$.</b> No failures can happen, so $K = 0$ with probability 1.' },
      { text: '<b>Beta-negative-binomial.</b> If $p$ itself varies according to a Beta distribution, the count is beta-negative-binomial, which has even heavier tails (it has no tile on the map).', to: 'beta' },
    ],

    uses: {
      frequentist: [
        '<b>Negative binomial regression.</b> The standard model for overdispersed counts: a log-linear model for the mean, $\\log \\mu_i = x_i^\\top b$, with variance $\\mu_i + \\mu_i^2/r$ (the “NB2” model). It is fitted with R’s <code>MASS::glm.nb</code>, statsmodels and Stata’s <code>nbreg</code>. Using Poisson regression on overdispersed counts gives standard errors that are too small.',
        '<b>Testing for overdispersion.</b> The likelihood-ratio test of negative binomial against Poisson regression, and the regression-based tests of Cameron and Trivedi (1990), ask whether $1/r$ is greater than 0. Because $1/r = 0$ lies on the boundary of the allowed values, the likelihood-ratio statistic is compared with a 50:50 mixture of 0 and $\\chi^2_1$, which halves the usual p-value.',
        '<b>RNA-seq differential expression.</b> DESeq2 and edgeR model read counts per gene with negative binomial GLMs, with gene-wise dispersions shrunk toward a common trend.',
        '<b>Inverse (negative binomial) sampling.</b> Sampling until a fixed number $r$ of successes is observed, for example when a condition is rare. The unbiased estimate of $p$ is then $(r - 1)/(r + K - 1)$ (Haldane, 1945).',
      ],
      bayesian: [
        '<b>Posterior predictive of the gamma–Poisson model.</b> With a $\\mathrm{Gamma}(\\alpha, \\beta)$ prior for a Poisson rate, the prior predictive count is $\\mathrm{NegBin}(\\alpha, \\beta/(1 + \\beta))$. After observing $n$ counts with total $s$, the predictive distribution of a new count is $\\mathrm{NegBin}\\big(\\alpha + s,\\ (\\beta + n)/(\\beta + n + 1)\\big)$.',
        '<b>Conjugate Beta prior for $p$.</b> With $r$ known, a $\\mathrm{Beta}(\\alpha, \\beta)$ prior on $p$ gives the posterior $\\mathrm{Beta}(\\alpha + nr,\\ \\beta + \\sum k_i)$.',
        '<b>Hierarchical count models.</b> In Stan, brms and similar tools, <code>neg_binomial_2</code> likelihoods with a prior on the dispersion are the default upgrade from Poisson models when counts vary more than expected. The negative binomial is the gamma-distributed random-effect version of a Poisson model, with the random effect integrated out.',
      ],
      modeling: [
        '<b>Neural spike counts.</b> Spike counts in repeated trials usually have a variance larger than the mean (a Fano factor above 1). Modeling the firing rate as varying from trial to trial by a gamma-distributed gain gives negative binomial counts (Goris, Movshon and Simoncelli, 2014).',
        '<b>Epidemiology and superspreading.</b> The number of secondary cases caused by one infected person is often modeled as negative binomial with a small dispersion $r$ (written $k$ in that literature): most people infect nobody while a few infect many (Lloyd-Smith et al., 2005).',
        '<b>Ecology.</b> Counts of organisms per sample plot, or parasites per host, are usually clumped. The negative binomial dispersion parameter is a standard measure of aggregation.',
        '<b>Accident proneness and insurance.</b> Greenwood and Yule (1920) derived the distribution by letting individual accident rates vary according to a gamma distribution; insurers use the same model for claim counts.',
        '<b>Word frequencies.</b> Words occur in bursts, so counts of a word per document are overdispersed and better described by negative binomial or other Poisson mixtures than by a Poisson.',
      ],
    },

    references: [
      { text: 'Wikipedia: Negative binomial distribution.', url: 'https://en.wikipedia.org/wiki/Negative_binomial_distribution' },
      { text: 'Casella, G., & Berger, R. L. (2002). <i>Statistical Inference</i> (2nd ed.), Sections 3.2 and 4.4 (hierarchical models and mixtures). Duxbury.' },
      { text: 'Johnson, N. L., Kemp, A. W., & Kotz, S. (2005). <i>Univariate Discrete Distributions</i> (3rd ed.), Chapter 5. Wiley.', url: 'https://doi.org/10.1002/0471715816' },
      { text: 'Gelman, A., Carlin, J. B., Stern, H. S., Dunson, D. B., Vehtari, A., & Rubin, D. B. (2013). <i>Bayesian Data Analysis</i> (3rd ed.), Section 2.6 and Appendix A. CRC Press.', url: 'http://www.stat.columbia.edu/~gelman/book/' },
      { text: 'Cameron, A. C., & Trivedi, P. K. (1990). Regression-based tests for overdispersion in the Poisson model. <i>Journal of Econometrics</i>, 46(3), 347–364.', url: 'https://doi.org/10.1016/0304-4076(90)90014-K' },
      { text: 'Haldane, J. B. S. (1945). On a method of estimating frequencies. <i>Biometrika</i>, 33(3), 222–225.', url: 'https://doi.org/10.2307/2332299' },
      { text: 'Hilbe, J. M. (2011). <i>Negative Binomial Regression</i> (2nd ed.). Cambridge University Press.' },
      { text: 'Leemis, L. M., & McQueston, J. T. (2008). Univariate distribution relationships. <i>The American Statistician</i>, 62(1), 45–53.', url: 'https://doi.org/10.1198/000313008X270448' },
      { text: 'Greenwood, M., & Yule, G. U. (1920). An inquiry into the nature of frequency distributions representative of multiple happenings. <i>Journal of the Royal Statistical Society</i>, 83(2), 255–279.' },
      { text: 'Lloyd-Smith, J. O., Schreiber, S. J., Kopp, P. E., & Getz, W. M. (2005). Superspreading and the effect of individual variation on disease emergence. <i>Nature</i>, 438, 355–359.', url: 'https://doi.org/10.1038/nature04153' },
      { text: 'Goris, R. L. T., Movshon, J. A., & Simoncelli, E. P. (2014). Partitioning neuronal variability. <i>Nature Neuroscience</i>, 17, 858–865.', url: 'https://doi.org/10.1038/nn.3711' },
    ],
  },
};
