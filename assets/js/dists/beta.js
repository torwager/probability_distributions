// Beta distribution with shapes alpha and beta, on [0, 1].
// Follows the structure of the reference module dists/normal.js.

import { catalogParams } from '../catalog.js';
import { lbeta, betaI, betaIc, betaIinv, digamma, clamp } from '../core/math.js';

const S_MIN = 0.1, S_MAX = 20;

function pdf(x, { alpha, beta }) {
  if (x < 0 || x > 1) return 0;
  if (x === 0) return alpha < 1 ? Infinity : alpha === 1 ? Math.exp(-lbeta(1, beta)) : 0;
  if (x === 1) return beta < 1 ? Infinity : beta === 1 ? Math.exp(-lbeta(alpha, 1)) : 0;
  return Math.exp((alpha - 1) * Math.log(x) + (beta - 1) * Math.log1p(-x) - lbeta(alpha, beta));
}
const cdf = (x, { alpha, beta }) => (x <= 0 ? 0 : x >= 1 ? 1 : betaI(x, alpha, beta));
const sf = (x, { alpha, beta }) => (x <= 0 ? 1 : x >= 1 ? 0 : betaIc(x, alpha, beta));
const quantile = (u, { alpha, beta }) => (u <= 0 ? 0 : u >= 1 ? 1 : betaIinv(u, alpha, beta));

const meanOf = p => p.alpha / (p.alpha + p.beta);
const sdOf = ({ alpha: a, beta: b }) => Math.sqrt(a * b / ((a + b) ** 2 * (a + b + 1)));

function modeOf({ alpha: a, beta: b }) {
  if (a > 1 && b > 1) return (a - 1) / (a + b - 2);
  if (a === 1 && b === 1) return 0.5;          // flat: every point is a mode
  if (a < 1 && b < 1) return NaN;              // U-shaped: two modes, at 0 and at 1
  if (a < 1) return 0;                         // infinite at 0 (b >= 1)
  if (b < 1) return 1;                         // infinite at 1 (a >= 1)
  return a === 1 ? 0 : 1;                      // one shape equals 1, the other exceeds 1: J-shaped
}

/** A sensible top for the y axis: the height of an interior peak, or the density away from an infinite end. */
function yTop(p) {
  let m = 0;
  for (let i = 0; i <= 120; i++) {
    const x = 0.02 + 0.96 * i / 120;
    const v = pdf(x, p);
    if (Number.isFinite(v) && v > m) m = v;
  }
  const md = modeOf(p);
  if (Number.isFinite(md)) { const v = pdf(md, p); if (Number.isFinite(v)) m = Math.max(m, v); }
  return m || 1;
}

function stats(p) {
  const { alpha: a, beta: b } = p;
  const s = a + b;
  const variance = a * b / (s * s * (s + 1));
  return {
    mean: a / s, variance, sd: Math.sqrt(variance),
    median: quantile(0.5, p), mode: modeOf(p),
    skewness: 2 * (b - a) * Math.sqrt(s + 1) / ((s + 2) * Math.sqrt(a * b)),
    exKurtosis: 6 * ((a - b) ** 2 * (s + 1) - a * b * (s + 2)) / (a * b * (s + 2) * (s + 3)),
    entropy: lbeta(a, b) - (a - 1) * digamma(a) - (b - 1) * digamma(b) + (s - 2) * digamma(s),
  };
}

// mean-and-spread handle: the arrow points from the mean toward the middle of the interval (right when the mean
// is at most 1/2, left otherwise). Since sd <= sqrt(m(1 - m)) <= 1/2, its tip always stays inside [0, 1], and the
// direction depends on the mean only, so it never flips while the spread is being dragged.
const arrowDir = p => (meanOf(p) <= 0.5 ? 1 : -1);

/** Shapes with mean m and concentration k = alpha + beta, kept inside the slider ranges. */
function fromMeanConc(m, k) {
  const kLo = Math.max(S_MIN / m, S_MIN / (1 - m)), kHi = Math.min(S_MAX / m, S_MAX / (1 - m));
  k = clamp(k, kLo, kHi);
  return { alpha: m * k, beta: (1 - m) * k };
}

export default {
  id: 'beta',
  name: 'Beta',
  kind: 'continuous',

  params: catalogParams('beta', { alpha: { step: 0.1 }, beta: { step: 0.1 } }),

  pdf,
  cdf,
  sf,
  quantile,
  sample: (rng, { alpha, beta }) => rng.beta(alpha, beta),

  testParams: [
    { alpha: 0.5, beta: 0.5 }, { alpha: 1, beta: 1 }, { alpha: 1, beta: 3 }, { alpha: 3, beta: 1 },
    { alpha: 0.7, beta: 4 }, { alpha: 20, beta: 20 }, { alpha: 18, beta: 1.5 }, { alpha: 2.5, beta: 0.6 },
    { alpha: 1, beta: 0.5 }, { alpha: 0.5, beta: 1 },
  ],

  range: () => [0, 1],
  // the whole unit interval, with a little room on both sides so that the ends of the curve are visible
  support: () => [-0.03, 1.03],

  stats,

  // Handles (the plan in ARCHITECTURE.md):
  //  - a dashed line at the mean alpha/(alpha + beta): dragging it moves the mean and keeps the
  //    concentration alpha + beta, so the shape keeps its "amount of information";
  //  - an arrow from the mean to mean + sd at the height of the density there: dragging its tip changes
  //    the standard deviation and keeps the mean (kappa = m(1 - m)/sd^2 - 1). It points toward x = 1/2.
  handles: [
    {
      type: 'vline', param: 'alpha', id: 'mean', label: 'mean',
      key: 'drag',
      ariaLabel: 'Mean α/(α+β). Drag left or right, or use the arrow keys, to move the mean with α+β fixed.',
      x: p => meanOf(p),
      set: (pt, p, p0) => {
        // keep alpha + beta: the mean can go only as far as both shapes stay at least S_MIN
        const k = p0.alpha + p0.beta, e = Math.min(0.5, S_MIN / k);
        return fromMeanConc(clamp(pt.x, e, 1 - e), k);
      },
    },
    {
      type: 'hArrow', param: 'beta', id: 'sd', label: 'sd',
      key: 'drag',
      ariaLabel: 'Standard deviation. Drag the arrow tip, or use the arrow keys, to make the distribution wider or narrower with the mean fixed.',
      from: p => { const x = meanOf(p) + arrowDir(p) * sdOf(p); return { x: meanOf(p), y: Math.min(pdf(x, p), 0.92 * yTop(p)) }; },
      to: p => { const x = meanOf(p) + arrowDir(p) * sdOf(p); return { x, y: Math.min(pdf(x, p), 0.92 * yTop(p)) }; },
      set: (pt, p, p0) => {
        const m = meanOf(p0);
        const sd = clamp(arrowDir(p0) * (pt.x - m), 1e-3, 0.999 * Math.sqrt(m * (1 - m)));
        return fromMeanConc(m, m * (1 - m) / (sd * sd) - 1);
      },
    },
  ],

  explorer: {
    yMax: p => yTop(p),
    readouts: [
      { key: 'mean', label: 'Mean α/(α+β)' },
      { key: 'sd', label: 'Standard deviation' },
      { label: 'Concentration α+β', value: p => fmtN(p.alpha + p.beta) },
      { label: 'Mode', value: p => { const m = modeOf(p); return Number.isFinite(m) ? fmtN(m) : 'at 0 and at 1'; } },
      { label: 'Middle 95% range', value: p => `${fmtN(quantile(0.025, p))} to ${fmtN(quantile(0.975, p))}` },
    ],
  },

  content: {
    summary: 'The beta distribution describes a quantity between 0 and 1, such as a proportion or a probability, with shapes $\\alpha$ and $\\beta$ that act like counts of successes and failures. It is the conjugate prior for a success probability with binomial data.',
    description: [
      'The beta distribution describes a quantity that lies between 0 and 1, such as a proportion, a rate or a probability. Examples are the fraction of trials a participant answers correctly, the share of voters who support a candidate, or our uncertainty about the probability that a coin lands heads. It takes every value in the interval from 0 to 1.',
      'It has two positive shape parameters. The first, $\\alpha$, pulls probability toward 1, and the second, $\\beta$, pulls it toward 0. The mean is $\\alpha/(\\alpha+\\beta)$. Their sum $\\alpha + \\beta$, called the concentration, sets how tightly the distribution is packed around its mean: larger sums give narrower curves. Depending on the two shapes the curve can be a hump, a flat line ($\\alpha = \\beta = 1$, the uniform distribution), a J shape, or a U shape with high density at both ends (both shapes below 1).',
      'The beta distribution is central to Bayesian statistics. It is the conjugate prior for the success probability of binomial and Bernoulli data: after observing $x$ successes in $n$ trials, a $\\mathrm{Beta}(\\alpha, \\beta)$ prior becomes a $\\mathrm{Beta}(\\alpha + x,\\ \\beta + n - x)$ posterior. That is why $\\alpha$ and $\\beta$ are often read as prior counts of successes and failures. Note that the same letters $\\alpha$ and $\\beta$ mean different things on the gamma and inverse-gamma pages (shape and rate, shape and scale).',
    ],
    explorerIntro: 'The left plot shows the density $f(x)$ on the interval from 0 to 1 and the right plot the cumulative distribution $F(x)$. Drag the dashed amber line to move the mean $\\alpha/(\\alpha+\\beta)$; the concentration $\\alpha + \\beta$ stays the same, so the curve slides without getting wider or narrower. Drag the tip of the amber arrow, which runs from the mean to one standard deviation away from it, to change the spread with the mean held fixed (the arrow points toward the middle of the interval, so it points left when the mean is above $1/2$). Both handles change $\\alpha$ and $\\beta$ together; type in the boxes to set them one at a time. When a shape is below 1 the density goes to infinity at that end; the area there is still finite.',

    pdfTex: 'f(x \\mid \\alpha, \\beta) = \\frac{x^{\\alpha - 1} (1 - x)^{\\beta - 1}}{B(\\alpha, \\beta)}, \\qquad B(\\alpha, \\beta) = \\frac{\\Gamma(\\alpha)\\,\\Gamma(\\beta)}{\\Gamma(\\alpha + \\beta)}',
    glossary: [
      { sym: 'x', meaning: 'A possible value of the random variable $X$, a number between 0 and 1 (for example a proportion).' },
      { sym: 'f(x \\mid \\alpha, \\beta)', meaning: 'The probability density at $x$ given the two shapes. It can be larger than 1, because the interval is short; probabilities are areas under the curve.' },
      { sym: '\\alpha', meaning: 'The first shape parameter, a positive number. Larger values push the mass toward 1. In Bayesian updating it acts like a count of prior successes.' },
      { sym: '\\beta', meaning: 'The second shape parameter, a positive number. Larger values push the mass toward 0. It acts like a count of prior failures.' },
      { sym: 'x^{\\alpha - 1}', meaning: 'The factor that controls the behavior near 0: it vanishes at 0 when $\\alpha > 1$, is constant when $\\alpha = 1$, and blows up when $\\alpha < 1$.' },
      { sym: '(1 - x)^{\\beta - 1}', meaning: 'The matching factor for the behavior near 1, controlled by $\\beta$.' },
      { sym: 'B(\\alpha, \\beta)', meaning: 'The beta function. It is the area under $x^{\\alpha-1}(1-x)^{\\beta-1}$ from 0 to 1, so dividing by it makes the total area equal to 1.' },
      { sym: '\\Gamma(\\cdot)', meaning: 'The gamma function, which extends the factorial to non-integers: $\\Gamma(n) = (n-1)!$ for whole numbers $n$. For whole-number shapes, $1/B(\\alpha, \\beta) = (\\alpha+\\beta-1)!/((\\alpha-1)!\\,(\\beta-1)!)$.' },
    ],

    cdfTex: 'F(x \\mid \\alpha, \\beta) = P(X \\le x) = I_x(\\alpha, \\beta) = \\frac{B(x; \\alpha, \\beta)}{B(\\alpha, \\beta)}',
    cdfGlossary: [
      { sym: 'F(x \\mid \\alpha, \\beta)', meaning: 'The cumulative distribution function: the probability that $X$ is at most $x$, the area under the density to the left of $x$.' },
      { sym: 'P(X \\le x)', meaning: 'The probability that the random variable $X$ takes a value of at most $x$.' },
      { sym: 'I_x(\\alpha, \\beta)', meaning: 'The regularized incomplete beta function. It has no formula in elementary functions for general shapes and is computed numerically (here with a continued fraction). For $\\alpha = 1$ it simplifies to $1 - (1-x)^{\\beta}$, and for $\\beta = 1$ to $x^{\\alpha}$.' },
      { sym: 'B(x; \\alpha, \\beta)', meaning: 'The incomplete beta function: the area under $t^{\\alpha-1}(1-t)^{\\beta-1}$ from 0 up to $x$, that is $B(x; \\alpha, \\beta) = \\int_0^x t^{\\alpha-1}(1-t)^{\\beta-1}\\,dt$, where $t$ is the integration variable.' },
      { sym: 'B(\\alpha, \\beta)', meaning: 'The complete beta function, the same area all the way to 1.' },
      { sym: '\\alpha,\\ \\beta', meaning: 'The two shape parameters.' },
    ],

    extraFormulas: [
      {
        title: 'Mean and concentration form',
        intro: 'Many applications describe a beta distribution by its mean $m$ and concentration $\\kappa$ instead of its two shapes. This form is used in beta regression and in hierarchical models for proportions.',
        tex: 'm = \\frac{\\alpha}{\\alpha + \\beta}, \\quad \\kappa = \\alpha + \\beta \\quad\\Longleftrightarrow\\quad \\alpha = m\\kappa, \\quad \\beta = (1 - m)\\kappa, \\qquad \\mathrm{Var}(X) = \\frac{m(1-m)}{\\kappa + 1}',
        glossary: [
          { sym: 'm', meaning: 'The mean of the distribution, between 0 and 1.' },
          { sym: '\\kappa', meaning: 'The concentration (sometimes called the precision or sample size): the larger it is, the smaller the variance around $m$.' },
          { sym: '\\Longleftrightarrow', meaning: 'The two descriptions are equivalent; each can be computed from the other.' },
        ],
      },
      {
        title: 'Conjugate update for binomial data',
        intro: 'With a $\\mathrm{Beta}(\\alpha, \\beta)$ prior for a success probability $p$ and $x$ successes in $n$ independent trials, the posterior is again a beta distribution. See the relation page for an interactive version.',
        tex: 'p \\mid x \\sim \\mathrm{Beta}(\\alpha + x,\\ \\beta + n - x), \\qquad \\mathrm{E}[p \\mid x] = \\frac{\\alpha + x}{\\alpha + \\beta + n}',
        glossary: [
          { sym: 'p', meaning: 'The unknown success probability.' },
          { sym: 'x', meaning: 'The observed number of successes.' },
          { sym: 'n', meaning: 'The number of trials, so $n - x$ is the number of failures.' },
          { sym: 'p \\mid x', meaning: 'The posterior distribution of $p$ after observing $x$.' },
          { sym: '\\mathrm{E}[p \\mid x]', meaning: 'The posterior mean, a compromise between the prior mean $\\alpha/(\\alpha+\\beta)$ and the observed proportion $x/n$.' },
        ],
      },
    ],

    properties: [
      { name: 'Support', tex: 'x \\in [0, 1]', explain: 'Every value between 0 and 1. When a shape is below 1 the density is infinite at that end, and the end point itself is then usually excluded; the area near it is still finite.' },
      { name: 'Mean', tex: '\\mathrm{E}[X] = \\frac{\\alpha}{\\alpha + \\beta}', value: p => meanOf(p), explain: 'The share of the total “count” $\\alpha + \\beta$ that belongs to $\\alpha$.' },
      { name: 'Median', tex: 'I^{-1}_{1/2}(\\alpha, \\beta) \\approx \\frac{\\alpha - 1/3}{\\alpha + \\beta - 2/3}', value: p => quantile(0.5, p), explain: 'There is no closed form in general, so the value is computed numerically by inverting the CDF. The approximation shown (Kerman, 2011) is within 4% of the exact median when both shapes are at least 1, and within 1% when both are at least 2. For $\\alpha = \\beta$ the median is exactly $1/2$.' },
      { name: 'Mode', tex: '\\frac{\\alpha - 1}{\\alpha + \\beta - 2} \\quad (\\alpha, \\beta > 1)', value: p => { const m = modeOf(p); return Number.isFinite(m) ? m : 'at 0 and 1'; }, explain: 'The location of the peak when both shapes exceed 1. If $\\alpha \\le 1 \\le \\beta$ (not both equal to 1) the highest density is at 0, and if $\\beta \\le 1 \\le \\alpha$ it is at 1. If both are below 1 the curve is U-shaped with peaks at both ends; if both equal 1 it is flat (the table then shows $1/2$).' },
      { name: 'Variance', tex: '\\mathrm{Var}(X) = \\frac{\\alpha\\beta}{(\\alpha + \\beta)^2(\\alpha + \\beta + 1)}', value: p => sdOf(p) ** 2, explain: 'Equal to $m(1-m)/(\\kappa + 1)$ with mean $m$ and concentration $\\kappa = \\alpha + \\beta$. It is never larger than $m(1 - m)$, the variance of a coin flip with the same mean.' },
      { name: 'Standard deviation', tex: '\\sqrt{\\frac{\\alpha\\beta}{(\\alpha + \\beta)^2(\\alpha + \\beta + 1)}}', value: p => sdOf(p), explain: 'The square root of the variance. Quadrupling the concentration roughly halves it.' },
      { name: 'Skewness', tex: '\\frac{2(\\beta - \\alpha)\\sqrt{\\alpha + \\beta + 1}}{(\\alpha + \\beta + 2)\\sqrt{\\alpha\\beta}}', value: p => stats(p).skewness, explain: 'Zero when $\\alpha = \\beta$ (symmetric). Positive (a longer tail toward 1) when $\\beta > \\alpha$, so that the mean is below $1/2$; negative when $\\alpha > \\beta$.' },
      { name: 'Excess kurtosis', tex: '\\frac{6\\left[(\\alpha - \\beta)^2(\\alpha + \\beta + 1) - \\alpha\\beta(\\alpha + \\beta + 2)\\right]}{\\alpha\\beta(\\alpha + \\beta + 2)(\\alpha + \\beta + 3)}', value: p => stats(p).exKurtosis, explain: 'Negative for symmetric shapes, with the minimum of $-2$ approached by a U shape with both shapes near 0 (mass piled at the two ends, like a coin flip). It becomes large and positive when one shape is small and the other large, which gives a sharp spike at one end with a long tail.' },
      { name: 'Entropy', tex: '\\ln B(\\alpha, \\beta) - (\\alpha - 1)\\psi(\\alpha) - (\\beta - 1)\\psi(\\beta) + (\\alpha + \\beta - 2)\\psi(\\alpha + \\beta)', value: p => stats(p).entropy, explain: 'Differential entropy in nats; $\\psi$ is the digamma function, the derivative of $\\ln\\Gamma$. It is largest (0) for the uniform case $\\alpha = \\beta = 1$ and is negative otherwise, since a density on an interval of length 1 that is not flat is more concentrated than the uniform.' },
      { name: 'Moment-generating function', tex: 'M(t) = {}_1F_1(\\alpha;\\ \\alpha + \\beta;\\ t) = 1 + \\sum_{k=1}^{\\infty} \\left( \\prod_{r=0}^{k-1} \\frac{\\alpha + r}{\\alpha + \\beta + r} \\right) \\frac{t^k}{k!}', explain: '$\\mathrm{E}[e^{tX}]$, which exists for every $t$ because $X$ is bounded. ${}_1F_1$ is Kummer’s confluent hypergeometric function, defined by the series shown; the product in brackets is the $k$-th raw moment $\\mathrm{E}[X^k]$.' },
      { name: 'Characteristic function', tex: '\\varphi(t) = {}_1F_1(\\alpha;\\ \\alpha + \\beta;\\ it)', explain: '$\\mathrm{E}[e^{itX}]$, the same series evaluated at $it$, where $i = \\sqrt{-1}$.' },
      { name: 'Raw moments', tex: '\\mathrm{E}[X^k] = \\frac{B(\\alpha + k, \\beta)}{B(\\alpha, \\beta)} = \\prod_{r=0}^{k-1} \\frac{\\alpha + r}{\\alpha + \\beta + r}', value: p => `${fmtN(p.alpha * (p.alpha + 1) / ((p.alpha + p.beta) * (p.alpha + p.beta + 1)))} (k = 2)`, explain: 'The average of the $k$-th power of $X$. All moments exist. The value column shows $\\mathrm{E}[X^2]$.' },
      { name: 'Concentration', tex: '\\kappa = \\alpha + \\beta', value: p => p.alpha + p.beta, explain: 'In Bayesian updating, the prior is worth about $\\alpha + \\beta$ observations: after $n$ trials the posterior concentration is $\\alpha + \\beta + n$.' },
      { name: 'Symmetry', tex: '1 - X \\sim \\mathrm{Beta}(\\beta, \\alpha)', explain: 'Swapping the two shapes mirrors the curve around $x = 1/2$; the proportion of failures has the shapes in reverse order.' },
    ],

    limits: [
      { text: '<b>Uniform.</b> With $\\alpha = \\beta = 1$ the density is flat: $\\mathrm{Beta}(1, 1) = \\mathrm U(0, 1)$. Conversely, the $k$-th smallest of $n$ independent uniform numbers has a $\\mathrm{Beta}(k,\\ n - k + 1)$ distribution.', relation: 'beta--uniform', to: 'uniform' },
      { text: '<b>Two-category Dirichlet.</b> The beta is the Dirichlet distribution with $K = 2$ categories: $(X, 1 - X) \\sim \\mathrm{Dir}(\\alpha, \\beta)$ exactly when $X \\sim \\mathrm{Beta}(\\alpha, \\beta)$. More generally, each component of a Dirichlet vector has a beta distribution.', relation: 'dirichlet--beta', to: 'dirichlet' },
      { text: '<b>Arcsine distribution.</b> $\\mathrm{Beta}(\\tfrac12, \\tfrac12)$, with density $1/(\\pi\\sqrt{x(1-x)})$, is the arcsine distribution. It is the Jeffreys prior for a binomial success probability, and it describes the fraction of time a symmetric random walk spends above zero.' },
      { text: '<b>Power-function distributions.</b> $\\mathrm{Beta}(\\alpha, 1)$ has density $\\alpha x^{\\alpha - 1}$ and CDF $x^{\\alpha}$; it is the distribution of the largest of $\\alpha$ uniform numbers when $\\alpha$ is a whole number. $\\mathrm{Beta}(1, \\beta)$ has CDF $1 - (1-x)^{\\beta}$ and is the distribution of the smallest.' },
      { text: '<b>Normal limit.</b> When both $\\alpha$ and $\\beta$ are large, the beta is approximately normal with mean $m = \\alpha/(\\alpha+\\beta)$ and variance $m(1-m)/(\\alpha+\\beta+1)$. This is why a posterior for a proportion based on many trials looks like a bell curve.', to: 'normal' },
      { text: '<b>Gamma limit.</b> If $X \\sim \\mathrm{Beta}(\\alpha, \\beta)$ and $\\beta \\to \\infty$ with $\\alpha$ fixed, then $\\beta X$ approaches a $\\mathrm{Gamma}(\\alpha, 1)$ distribution. A rare-success probability measured on the right scale behaves like a gamma variable.', to: 'gamma' },
      { text: '<b>Point mass.</b> As $\\alpha + \\beta \\to \\infty$ with the mean $m$ fixed, the variance goes to 0 and the distribution concentrates at $m$. As $\\alpha + \\beta \\to 0$ with $m$ fixed, it approaches a Bernoulli distribution that puts probability $m$ at 1 and $1 - m$ at 0.', to: 'bernoulli' },
    ],

    uses: {
      frequentist: [
        '<b>Exact confidence intervals for a proportion.</b> The Clopper–Pearson interval for a binomial probability uses beta quantiles: with $x$ successes in $n$ trials, the 95% interval runs from the 0.025 quantile of $\\mathrm{Beta}(x,\\ n - x + 1)$ to the 0.975 quantile of $\\mathrm{Beta}(x + 1,\\ n - x)$. The same identity, $P(\\mathrm{Bin}(n,p) \\ge x) = I_p(x,\\ n - x + 1)$, links binomial tail probabilities to the beta CDF.',
        '<b>Order statistics and nonparametric intervals.</b> The $k$-th smallest of $n$ uniform values is $\\mathrm{Beta}(k,\\ n-k+1)$. Applied to $F(X)$ for any continuous distribution, this gives distribution-free confidence intervals for quantiles and tolerance intervals.',
        '<b>Beta regression.</b> Proportions and rates that lie strictly between 0 and 1 (for example the share of time spent on a task) are modeled with a beta distribution whose mean depends on predictors through a logit link, with the concentration as a precision parameter (Ferrari and Cribari-Neto, 2004).',
        '<b>Null distribution of $R^2$.</b> In linear regression with $k$ predictors and $n$ observations, when all true slopes are zero and the errors are normal, $R^2 \\sim \\mathrm{Beta}\\big(\\tfrac{k}{2},\\ \\tfrac{n-k-1}{2}\\big)$. This is the same fact as the F test, through the F-to-beta relation.',
        '<b>p-values.</b> Under a true null hypothesis a continuous p-value is $\\mathrm U(0,1) = \\mathrm{Beta}(1,1)$, and the smallest of $m$ independent p-values is $\\mathrm{Beta}(1, m)$, which is the basis of the Šidák correction.',
      ],
      bayesian: [
        '<b>Conjugate prior for a probability.</b> For binomial or Bernoulli data the update is $\\mathrm{Beta}(\\alpha, \\beta) \\to \\mathrm{Beta}(\\alpha + x,\\ \\beta + n - x)$: add the successes to $\\alpha$ and the failures to $\\beta$. For geometric or negative binomial data with $k$ failures before $r$ successes it is $\\mathrm{Beta}(\\alpha + r,\\ \\beta + k)$. The posterior mean $(\\alpha + x)/(\\alpha + \\beta + n)$ shrinks the observed proportion toward the prior mean.',
        '<b>Common default priors.</b> $\\mathrm{Beta}(1, 1)$ is the uniform prior (Bayes and Laplace; it gives Laplace’s rule of succession $(x+1)/(n+2)$). $\\mathrm{Beta}(\\tfrac12, \\tfrac12)$ is the Jeffreys prior. The improper limit $\\mathrm{Beta}(0, 0)$ (Haldane) gives the posterior mean $x/n$.',
        '<b>Posterior predictive distribution.</b> Averaging the binomial over a beta posterior gives the beta-binomial distribution for the number of successes in future trials. It is wider than a binomial with $p$ fixed at its estimate, because it includes the uncertainty about $p$.',
        '<b>Hierarchical models for rates.</b> When many groups each have their own success probability (hospitals, participants, experiments), the probabilities are often given a common $\\mathrm{Beta}(m\\kappa,\\ (1-m)\\kappa)$ population distribution, and $m$ and $\\kappa$ are estimated from all groups together (the rat tumor example in Gelman et al., BDA3, Chapter 5).',
        '<b>Priors for parameters on [0, 1] in cognitive models.</b> Guessing rates, lapse rates, mixture weights and the probability parameters of multinomial processing tree models are commonly given beta priors (Lee and Wagenmakers, 2013).',
      ],
      modeling: [
        '<b>Bandit problems and A/B testing.</b> In Thompson sampling, each option keeps a beta posterior for its success probability; on each round a value is drawn from every posterior and the option with the largest draw is chosen. The same posteriors give the probability that one version of a web page has a higher conversion rate than another.',
        '<b>Learning models.</b> Bayesian observer models of how people learn a probability from a sequence of outcomes keep a beta belief that is updated by counting, often with a forgetting factor that discounts old counts.',
        '<b>Project planning (PERT).</b> Task durations between an optimistic and a pessimistic estimate are modeled with a beta distribution rescaled to that interval.',
        '<b>Population genetics.</b> Allele frequencies across subpopulations follow approximately a beta distribution (the Balding–Nichols model), with the concentration set by the fixation index $F_{ST}$.',
        '<b>Simulation.</b> Beta random numbers can be generated as $G_1/(G_1 + G_2)$ from two independent gamma variables with shapes $\\alpha$ and $\\beta$ (see the gamma-to-beta relation), which is how this site draws them.',
      ],
    },

    references: [
      { text: 'Wikipedia: Beta distribution.', url: 'https://en.wikipedia.org/wiki/Beta_distribution' },
      { text: 'Wikipedia: Binomial proportion confidence interval (Clopper–Pearson interval).', url: 'https://en.wikipedia.org/wiki/Binomial_proportion_confidence_interval#Clopper%E2%80%93Pearson_interval' },
      { text: 'Johnson, N. L., Kotz, S., & Balakrishnan, N. (1995). <i>Continuous Univariate Distributions</i>, Vol. 2 (2nd ed.), Chapter 25. Wiley.' },
      { text: 'Casella, G., & Berger, R. L. (2002). <i>Statistical Inference</i> (2nd ed.), Section 3.3 and Example 7.2.14. Duxbury.' },
      { text: 'Gelman, A., Carlin, J. B., Stern, H. S., Dunson, D. B., Vehtari, A., & Rubin, D. B. (2013). <i>Bayesian Data Analysis</i> (3rd ed.), Sections 2.1–2.4 and 5.1–5.3. CRC Press.', url: 'http://www.stat.columbia.edu/~gelman/book/' },
      { text: 'Lee, M. D., & Wagenmakers, E.-J. (2013). <i>Bayesian Cognitive Modeling: A Practical Course</i>, Chapter 3. Cambridge University Press.' },
      { text: 'Kerman, J. (2011). A closed-form approximation for the median of the beta distribution. arXiv:1111.0433.', url: 'https://arxiv.org/abs/1111.0433' },
    { text: 'Ferrari, S., & Cribari-Neto, F. (2004). Beta regression for modelling rates and proportions. <i>Journal of Applied Statistics</i>, 31(7), 799–815.', url: 'https://doi.org/10.1080/0266476042000214501' },
      { text: 'Leemis, L. M., & McQueston, J. T. (2008). Univariate distribution relationships. <i>The American Statistician</i>, 62(1), 45–53.', url: 'https://doi.org/10.1198/000313008X270448' },
    ],
  },
};

function fmtN(v) { return String(Number(v.toPrecision(4))).replace(/^-/, '−'); }
