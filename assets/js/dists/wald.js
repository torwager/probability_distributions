// Wald (inverse Gaussian) distribution: mean mu, shape lambda.
// It is the distribution of the first time a Brownian motion with positive drift v and noise sd sigma,
// started at 0, reaches a threshold a > 0: mu = a / v, lambda = a^2 / sigma^2.
//
// Numerics: the CDF F = Phi(A) + e^{2 lambda/mu} Phi(-B), A = sqrt(lambda/x)(x/mu - 1), B = sqrt(lambda/x)(x/mu + 1),
// is written with the normal Mills ratio R(t) = Phi(-t)/phi(t) = sqrt(pi/2) erfcx(t/sqrt 2), using
// e^{2 lambda/mu} phi(B) = phi(A). This avoids overflow of e^{2 lambda/mu} and cancellation in the upper tail.
//
// Named exports waldPdf / waldCdf are reused by the relation page normal--wald.

import { catalogParams } from '../catalog.js';
import { erfcx, normalPdf, normalCdf, quantileContinuous, PI, EULER_GAMMA, SQRT2 } from '../core/math.js';

const SQRT_HALF_PI = Math.sqrt(PI / 2);
/** Mills ratio of the standard normal, Phi(-t) / phi(t), for t >= 0 (and moderate negative t). */
const mills = t => SQRT_HALF_PI * erfcx(t / SQRT2);

/** Wald density at x. */
export function waldPdf(x, mu, lambda) {
  if (!(x > 0)) return 0;
  return Math.exp(0.5 * Math.log(lambda / (2 * PI * x * x * x)) - lambda * (x - mu) ** 2 / (2 * mu * mu * x));
}
/** P(X > x), accurate far into the upper tail. */
export function waldSf(x, mu, lambda) {
  if (!(x > 0)) return 1;
  if (x === Infinity) return 0;
  const s = Math.sqrt(lambda / x), A = s * (x / mu - 1), B = s * (x / mu + 1);
  if (A <= 0) return 1 - normalPdf(A) * (mills(-A) + mills(B));
  return Math.max(0, normalPdf(A) * (mills(A) - mills(B)));
}
/** P(X <= x). */
export function waldCdf(x, mu, lambda) {
  if (!(x > 0)) return 0;
  if (x === Infinity) return 1;
  const s = Math.sqrt(lambda / x), A = s * (x / mu - 1), B = s * (x / mu + 1);
  if (A <= 0) return Math.min(1, normalPdf(A) * (mills(-A) + mills(B)));
  return 1 - Math.max(0, normalPdf(A) * (mills(A) - mills(B)));
}

/** e^z E1(z) for z > 0 (E1 = exponential integral), used in the entropy. */
function expE1Scaled(z) {
  if (z < 1) {
    // E1(z) = -gamma - ln z - sum_{k>=1} (-z)^k / (k k!)
    let sum = 0, term = 1;
    for (let k = 1; k < 60; k++) { term *= -z / k; sum += term / k; if (Math.abs(term) < 1e-18) break; }
    return Math.exp(z) * (-EULER_GAMMA - Math.log(z) - sum);
  }
  // continued fraction (modified Lentz), Numerical Recipes expint with n = 1
  let b = z + 1, c = 1e300, d = 1 / b, h = d;
  for (let i = 1; i < 500; i++) {
    const an = -i * i;
    b += 2;
    d = 1 / (an * d + b); c = b + an / c;
    const del = c * d; h *= del;
    if (Math.abs(del - 1) < 1e-16) break;
  }
  return h;
}

const pdf = (x, { mu, lambda }) => waldPdf(x, mu, lambda);
const cdf = (x, { mu, lambda }) => waldCdf(x, mu, lambda);
const sf = (x, { mu, lambda }) => waldSf(x, mu, lambda);
const sdOf = ({ mu, lambda }) => Math.sqrt(mu ** 3 / lambda);
const quantile = (u, p) => quantileContinuous(x => cdf(x, p), u, 0, Infinity, p.mu, sdOf(p));
const modeOf = ({ mu, lambda }) => { const k = 1.5 * mu / lambda; return mu * (Math.sqrt(1 + k * k) - k); };
const entropyOf = ({ mu, lambda }) => 0.5 * Math.log(2 * PI * Math.E * mu ** 3 / lambda) - 1.5 * expE1Scaled(2 * lambda / mu);

const statCache = new Map();
function stats(p) {
  const key = `${p.mu}|${p.lambda}`;
  if (statCache.has(key)) return statCache.get(key);
  const { mu, lambda } = p;
  const st = {
    mean: mu, variance: mu ** 3 / lambda, sd: sdOf(p), median: quantile(0.5, p), mode: modeOf(p),
    skewness: 3 * Math.sqrt(mu / lambda), exKurtosis: 15 * mu / lambda, entropy: entropyOf(p),
  };
  if (statCache.size > 200) statCache.clear();
  statCache.set(key, st);
  return st;
}

export default {
  id: 'wald',
  name: 'Wald (inverse Gaussian)',
  kind: 'continuous',
  params: catalogParams('wald', { mu: { step: 0.05 } }),

  pdf, cdf, sf, quantile,
  sample: (rng, { mu, lambda }) => rng.wald(mu, lambda),

  testParams: [{ mu: 0.3, lambda: 20 }, { mu: 2, lambda: 1 }, { mu: 0.1, lambda: 0.1 }, { mu: 5, lambda: 0.5 }, { mu: 4, lambda: 18 }],

  range: () => [0, Infinity],
  support(p) {
    const sd = sdOf(p);
    const lo = p.mu - 4.5 * sd > 0.25 * p.mu ? p.mu - 4.5 * sd : 0;
    // for strongly skewed shapes a very high quantile would squeeze the early peak against the axis,
    // so the window then ends at a lower quantile (the tail beyond it is still in the CDF and the area tool)
    const skew = 3 * Math.sqrt(p.mu / p.lambda);
    const u = skew > 6 ? 0.95 : skew > 3 ? 0.98 : 0.995;
    // the window always contains the tip of the standard-deviation arrow (mu + sd), so that the
    // lambda handle can be grabbed; this matters only for extremely skewed shapes (lambda/mu < 0.1)
    return [lo, Math.max(quantile(u, p), 1.5 * p.mu, p.mu + 2 * Math.min(sd, p.mu), p.mu + 1.08 * sd)];
  },
  stats,

  // Handles:
  //  - a vertical line at the mean mu; dragging it keeps the shape lambda;
  //  - an arrow from the mean to mean + standard deviation, sqrt(mu^3/lambda), ending on the curve;
  //    dragging its tip keeps the mean and sets lambda = mu^3 / sd^2.
  handles: [
    { type: 'vline', param: 'mu' },
    {
      type: 'hArrow', param: 'lambda', label: 'λ',
      ariaLabel: 'Shape λ: the arrow is one standard deviation long. Drag the tip, or use the arrow keys.',
      from: p => ({ x: p.mu, y: pdf(p.mu + sdOf(p), p) }),
      to: p => ({ x: p.mu + sdOf(p), y: pdf(p.mu + sdOf(p), p) }),
      set: (pt, p) => ({ lambda: p.mu ** 3 / Math.max(pt.x - p.mu, 1e-6) ** 2 }),
    },
  ],

  explorer: {
    xLabel: 't',
    pdfCaption: 'Probability density  f(t)  of the time t',
    overlays: p => {
      const sd = sdOf(p);
      return [{
        id: 'normal', label: 'Normal with the same mean and variance', cls: 'curve-ref',
        pdf: x => normalPdf((x - p.mu) / sd) / sd, cdf: x => normalCdf((x - p.mu) / sd),
      }];
    },
    readouts: [
      { key: 'mean', label: 'Mean μ' },
      { key: 'sd', label: 'Standard deviation √(μ³/λ)' },
      { key: 'mode', label: 'Mode' },
      { key: 'median', label: 'Median' },
      { key: 'skewness', label: 'Skewness 3√(μ/λ)' },
      { label: 'Threshold a = √λ (noise σ = 1)', value: ({ lambda }) => Math.sqrt(lambda) },
      { label: 'Drift rate v = a/μ (noise σ = 1)', value: ({ mu, lambda }) => Math.sqrt(lambda) / mu },
    ],
  },

  content: {
    summary: 'The Wald (inverse Gaussian) distribution describes how long a quantity that drifts upward with random fluctuations takes to first reach a fixed threshold, with mean $\\mu$ and shape $\\lambda$. It models response times in evidence-accumulation models.',
    description: [
      'The Wald distribution, also called the inverse Gaussian distribution, describes how long it takes for a quantity that drifts upward with random fluctuations to reach a fixed level for the first time. A typical example is evidence accumulating toward a decision: the evidence total moves up on average at a constant rate (the drift) but jitters randomly, and the decision is made the first time the total reaches a threshold. The time at which that happens is Wald distributed. Its values are positive times.',
      'It has two parameters. The mean $\\mu$ is the average first-passage time, equal to the threshold divided by the drift rate. The shape $\\lambda$ controls the skew: small values give a sharp early peak and a long right tail, large values a nearly symmetric, nearly normal curve. In terms of the accumulation process, a threshold $a$, drift rate $v$ and noise standard deviation $\\sigma$ give $\\mu = a/v$ and $\\lambda = a^2/\\sigma^2$.',
      'The name “inverse Gaussian” was given by Tweedie because its cumulant generating function is the inverse of the normal’s, not because $1/X$ is normal. The normal distribution describes where a drifting random walk is at a fixed time; the inverse Gaussian describes when it first reaches a fixed place. It was first derived as a first-passage time by Schrödinger and by Smoluchowski in 1915; Abraham Wald derived it again in 1944 as the limiting distribution of the number of observations needed by a sequential test, which is why it carries his name.',
    ],
    explorerIntro: 'The left plot shows the density $f(t)$ of the first-passage time (solid) and, for comparison, a normal density with the same mean and variance (dashed); the right plot shows the two CDFs. Drag the dashed amber line to move the mean $\\mu$; the shape $\\lambda$ stays fixed, so the curve also widens as it moves right, because the standard deviation is $\\sqrt{\\mu^3/\\lambda}$. The amber arrow runs from the mean to one standard deviation above it. Drag its tip to change $\\lambda$ with the mean held fixed: a shorter arrow means a larger $\\lambda$ and a more symmetric, more normal-looking curve. The summary lists the threshold $a$ and drift $v$ of an accumulation process with noise standard deviation $\\sigma = 1$ that has this first-passage time distribution.',
    parameterization: 'Mean $\\mu$ and shape $\\lambda$ (as on Wikipedia). For an evidence-accumulation process with threshold $a$, drift rate $v$ and noise standard deviation $\\sigma$ per unit time, $\\mu = a/v$ and $\\lambda = a^2/\\sigma^2$; only the ratios $a/\\sigma$ and $v/\\sigma$ can be identified from response times, so $\\sigma$ is usually fixed (at 1, or at 0.1 in some diffusion-model software). The drift is written $v$ on this site because $\\nu$ is reserved for degrees of freedom. SciPy’s <code>invgauss</code> uses the shape $\\mu/\\lambda$ with scale $\\lambda$. Note that $\\lambda$ here is a shape, not the rate of an exponential.',

    pdfTex: 'f(t \\mid \\mu, \\lambda) = \\sqrt{\\frac{\\lambda}{2\\pi t^3}}\\; \\exp\\!\\left( -\\frac{\\lambda (t - \\mu)^2}{2\\mu^2 t} \\right), \\qquad t > 0',
    glossary: [
      { sym: 't', meaning: 'A possible value of the first-passage time $T$; any positive number.' },
      { sym: 'f(t \\mid \\mu, \\lambda)', meaning: 'The probability density at $t$. Probabilities are areas under this curve.' },
      { sym: '\\mu', meaning: 'The mean first-passage time ($\\mu > 0$); threshold divided by drift rate.' },
      { sym: '\\lambda', meaning: 'The shape ($\\lambda > 0$). For a fixed mean, larger $\\lambda$ means less variability and less skew; the variance is $\\mu^3/\\lambda$. In accumulation terms it is the threshold squared divided by the noise variance, $a^2/\\sigma^2$.' },
      { sym: '\\sqrt{\\frac{\\lambda}{2\\pi t^3}}', meaning: 'A factor that makes the total area 1. The power $t^{-3/2}$ governs the shape near $t = 0$ and, when $\\lambda/\\mu$ is small, over a long range of the right tail.' },
      { sym: '\\frac{\\lambda (t - \\mu)^2}{2\\mu^2 t}', meaning: 'A squared distance between $t$ and the mean, scaled by $t$. It is large both for very short times (dividing by a small $t$) and for very long ones, so the density is small at both ends.' },
      { sym: '\\pi', meaning: 'The constant 3.14159….' },
      { sym: '\\exp(\\cdot)', meaning: 'The exponential function $e^{(\\cdot)}$, with $e \\approx 2.71828$.' },
    ],

    cdfTex: 'F(t \\mid \\mu, \\lambda) = \\Phi\\!\\left( \\sqrt{\\frac{\\lambda}{t}} \\left( \\frac{t}{\\mu} - 1 \\right) \\right) + e^{2\\lambda/\\mu}\\, \\Phi\\!\\left( -\\sqrt{\\frac{\\lambda}{t}} \\left( \\frac{t}{\\mu} + 1 \\right) \\right)',
    cdfIntro: 'The CDF is written with the standard normal CDF. The factor $e^{2\\lambda/\\mu}$ can be astronomically large while the $\\Phi$ term next to it is tiny, so the site evaluates the product through the normal Mills ratio $\\Phi(-x)/\\varphi(x)$, which stays well behaved.',
    cdfGlossary: [
      { sym: 'F(t \\mid \\mu, \\lambda)', meaning: 'The probability that the first passage happens at or before time $t$, $P(T \\le t)$.' },
      { sym: '\\Phi(\\cdot)', meaning: 'The CDF of the standard normal distribution.' },
      { sym: '\\sqrt{\\frac{\\lambda}{t}}\\left(\\frac{t}{\\mu} - 1\\right)', meaning: 'A z-score-like quantity: negative before the mean time, positive after it.' },
      { sym: 'e^{2\\lambda/\\mu}', meaning: 'An exponential factor from the method of images used to derive the first-passage distribution. In accumulation terms $2\\lambda/\\mu = 2av/\\sigma^2$.' },
      { sym: '\\mu,\\ \\lambda', meaning: 'The mean and the shape, as in the density.' },
    ],

    extraFormulas: [
      {
        title: 'As a first-passage time',
        intro: 'Let evidence accumulate as $W(t) = vt + \\sigma B(t)$, starting at 0, where $B(t)$ is standard Brownian motion (a continuous random walk). The first time it reaches the threshold $a > 0$ has a Wald distribution. Its density is $a/t$ times the normal density of the position $W(t) \\sim \\mathcal N(vt, \\sigma^2 t)$, evaluated at the threshold:',
        tex: 'T = \\inf\\{t : W(t) = a\\} \\sim \\mathrm{IG}\\!\\left(\\mu = \\frac{a}{v},\\ \\lambda = \\frac{a^2}{\\sigma^2}\\right), \\qquad f_T(t) = \\frac{a}{t}\\cdot\\frac{1}{\\sigma\\sqrt{2\\pi t}} \\exp\\!\\left(-\\frac{(a - vt)^2}{2\\sigma^2 t}\\right)',
        glossary: [
          { sym: 'W(t)', meaning: 'The accumulated evidence at time $t$.' },
          { sym: 'v', meaning: 'The drift rate: the average gain in evidence per unit time ($v > 0$ so that the threshold is always reached).' },
          { sym: '\\sigma', meaning: 'The standard deviation of the noise per unit time (the diffusion coefficient).' },
          { sym: 'B(t)', meaning: 'Standard Brownian motion: its change over any time step $h$ is $\\mathcal N(0, h)$, independent of the past.' },
          { sym: 'a', meaning: 'The threshold (boundary) that ends the accumulation.' },
          { sym: '\\inf\\{t : W(t) = a\\}', meaning: 'The first time at which the evidence equals $a$.' },
          { sym: '\\mathrm{IG}(\\mu, \\lambda)', meaning: 'The inverse Gaussian (Wald) distribution with mean $\\mu$ and shape $\\lambda$.' },
        ],
      },
      {
        title: 'Maximum-likelihood estimates',
        intro: 'For observed times $t_1, \\dots, t_n$ the estimates have closed forms, and $n\\lambda/\\hat\\lambda$ has a chi-squared distribution with $n - 1$ degrees of freedom, which gives exact confidence intervals for $\\lambda$:',
        tex: '\\hat\\mu = \\bar t = \\frac1n\\sum_i t_i, \\qquad \\frac{1}{\\hat\\lambda} = \\frac1n \\sum_i \\left(\\frac{1}{t_i} - \\frac{1}{\\bar t}\\right)',
        glossary: [
          { sym: '\\bar t', meaning: 'The sample mean of the observed times.' },
          { sym: '\\hat\\mu,\\ \\hat\\lambda', meaning: 'The maximum-likelihood estimates of the mean and the shape.' },
          { sym: 'n', meaning: 'The number of observations.' },
        ],
      },
    ],

    properties: [
      { name: 'Support', tex: 't \\in (0, \\infty)', explain: 'Only positive times are possible.' },
      { name: 'Mean', tex: '\\mathrm{E}[T] = \\mu', value: p => p.mu, explain: 'The average first-passage time, threshold divided by drift: $a/v$.' },
      { name: 'Median', tex: '\\text{no closed form}', value: p => stats(p).median, explain: 'Computed numerically by solving $F(t) = 1/2$. It lies between the mode and the mean.' },
      { name: 'Mode', tex: '\\mu\\left[\\sqrt{1 + \\frac{9\\mu^2}{4\\lambda^2}} - \\frac{3\\mu}{2\\lambda}\\right]', value: p => modeOf(p), explain: 'Always below the mean. As $\\lambda/\\mu$ grows the mode moves up to the mean; when $\\lambda/\\mu$ is small the mode is close to $\\lambda/3$, an early peak followed by a long tail.' },
      { name: 'Variance', tex: '\\mathrm{Var}(T) = \\frac{\\mu^3}{\\lambda}', value: p => p.mu ** 3 / p.lambda, explain: 'In accumulation terms, $a\\sigma^2/v^3$: weaker drift makes the times much more variable.' },
      { name: 'Standard deviation', tex: '\\sqrt{\\mu^3/\\lambda}', value: p => sdOf(p), explain: 'The length of the amber arrow in the explorer.' },
      { name: 'Skewness', tex: '3\\sqrt{\\mu/\\lambda}', value: p => 3 * Math.sqrt(p.mu / p.lambda), explain: 'Always positive (a long right tail). It depends only on the ratio $\\lambda/\\mu$, and shrinks toward 0 as that ratio grows. Note that the coefficient of variation is $\\sqrt{\\mu/\\lambda}$, so the skewness is exactly three times it.' },
      { name: 'Excess kurtosis', tex: '15\\mu/\\lambda', value: p => 15 * p.mu / p.lambda, explain: 'Heavier tails than the normal; it approaches 0 as $\\lambda/\\mu$ grows.' },
      { name: 'Entropy', tex: '\\tfrac12\\ln\\!\\frac{2\\pi e\\mu^3}{\\lambda} - \\tfrac32\\, e^{2\\lambda/\\mu}\\, E_1\\!\\left(\\tfrac{2\\lambda}{\\mu}\\right)', value: p => entropyOf(p), explain: 'Differential entropy in nats. Here $E_1(z) = \\int_z^\\infty e^{-s}/s\\,ds$ is the exponential integral. The first term is the entropy of a normal with the same variance; the second is a correction that shrinks to $3\\mu/(4\\lambda)$ as $\\lambda/\\mu$ grows. It follows from $\\mathrm{E}[\\ln T] = \\ln\\mu - e^{2\\lambda/\\mu}E_1(2\\lambda/\\mu)$.' },
      { name: 'Moment-generating function', tex: 'M(s) = \\exp\\!\\left[\\frac{\\lambda}{\\mu}\\left(1 - \\sqrt{1 - \\frac{2\\mu^2 s}{\\lambda}}\\right)\\right], \\quad s < \\frac{\\lambda}{2\\mu^2}', explain: '$\\mathrm{E}[e^{sT}]$. Its logarithm, the cumulant generating function, is the inverse function of the normal’s cumulant generating function, which is where the name “inverse Gaussian” comes from.' },
      { name: 'Characteristic function', tex: '\\varphi(s) = \\exp\\!\\left[\\frac{\\lambda}{\\mu}\\left(1 - \\sqrt{1 - \\frac{2i\\mu^2 s}{\\lambda}}\\right)\\right]', explain: '$\\mathrm{E}[e^{isT}]$, where $i = \\sqrt{-1}$.' },
      { name: 'Sums and scaling', tex: '\\textstyle\\sum_{i=1}^n T_i \\sim \\mathrm{IG}(n\\mu, n^2\\lambda), \\quad cT \\sim \\mathrm{IG}(c\\mu, c\\lambda)', explain: 'A sum of $n$ independent copies is again inverse Gaussian: reaching a threshold $na$ means reaching $a$, then $2a$, and so on. The sample mean $\\bar T$ is $\\mathrm{IG}(\\mu, n\\lambda)$. Here $c > 0$ is any constant.' },
      { name: 'A chi-squared pivot', tex: '\\frac{\\lambda (T - \\mu)^2}{\\mu^2 T} \\sim \\chi^2_1', value: p => `P(T > 2μ) = ${fmtN(sf(2 * p.mu, p))}`, explain: 'The squared standardized distance in the exponent of the density has a chi-squared distribution with 1 degree of freedom (Shuster, 1968); it underlies the exact tests for inverse Gaussian data. The value column shows the probability of a time more than twice the mean.' },
    ],

    limits: [
      { text: '<b>Large shape: approximately normal.</b> As $\\lambda/\\mu \\to \\infty$ (a high threshold relative to the noise), $(T - \\mu)/\\sqrt{\\mu^3/\\lambda}$ approaches the standard normal. The relationship page also shows how the Wald arises from normally distributed increments of evidence.', relation: 'normal--wald', to: 'normal' },
      { text: '<b>Zero drift: the Lévy distribution.</b> As $\\mu \\to \\infty$ with $\\lambda$ fixed (drift $v \\to 0$), the density becomes $\\sqrt{\\lambda/(2\\pi t^3)}\\, e^{-\\lambda/(2t)}$, the Lévy distribution. It is the inverse-gamma distribution with shape $1/2$ and scale $\\lambda/2$; it has no mean, because without drift the threshold is still reached with probability 1 but the waiting time is often enormous.', to: 'inverse-gamma' },
      { text: '<b>No noise: a fixed time.</b> As $\\lambda \\to \\infty$ with $\\mu$ fixed (noise $\\sigma \\to 0$), the distribution concentrates at the single value $\\mu = a/v$, the time a noiseless accumulator takes.' },
      { text: '<b>Shifted Wald.</b> Adding a constant non-decision time $t_0$ (for encoding the stimulus and executing the response) gives the shifted Wald, $t_0 + T$, the usual three-parameter response-time model.' },
      { text: '<b>Two boundaries.</b> The full drift-diffusion model has a second, lower boundary for the other response; its first-passage times are not Wald distributed and are computed from infinite series (Navarro &amp; Fuss, 2009). When the lower boundary is far away the upper-boundary times approach the Wald distribution.' },
      { text: '<b>Generalized inverse Gaussian.</b> The Wald is the case $p = -1/2$ of the generalized inverse Gaussian family, whose density is proportional to $t^{p-1}e^{-(\\alpha t + \\beta/t)/2}$, which also contains the gamma and inverse-gamma distributions as limits.' },
    ],

    uses: {
      frequentist: [
        '<b>Generalized linear models.</b> The inverse Gaussian family is a standard GLM family for positive, right-skewed outcomes whose variance grows like the cube of the mean, $\\mathrm{Var}(Y) \\propto \\mu^3$ (canonical link $1/\\mu^2$, often used with a log link); examples are insurance claim sizes, durations and costs.',
        '<b>Exact inference.</b> The maximum-likelihood estimates have closed forms, $n\\lambda/\\hat\\lambda \\sim \\chi^2_{n-1}$ independently of $\\hat\\mu$, and an “analysis of reciprocals” for comparing groups parallels the analysis of variance for normal data (Tweedie, 1957).',
        '<b>Reliability and survival.</b> When a component fails once a degradation process with drift crosses a critical level, its lifetime is inverse Gaussian. Unlike the Weibull, its hazard rises and then falls toward a constant, $\\lambda/(2\\mu^2)$.',
        '<b>Sequential testing.</b> Wald (1944, 1947) derived it as the approximate distribution of the number of observations needed by the sequential probability ratio test: the log-likelihood ratio drifts toward one of two boundaries like the accumulation process above.',
      ],
      bayesian: [
        '<b>Conjugate prior for the shape.</b> With $\\mu$ known, a $\\mathrm{Gamma}(\\alpha, \\beta)$ prior on $\\lambda$ (shape $\\alpha$, rate $\\beta$) gives the posterior $\\mathrm{Gamma}\\big(\\alpha + n/2,\\ \\beta + \\sum_i (t_i - \\mu)^2/(2\\mu^2 t_i)\\big)$.',
        '<b>Conjugate prior for the mean.</b> With $\\lambda$ known, the likelihood is a normal curve in $\\psi = 1/\\mu$ (precision $\\lambda\\sum_i t_i$, centered at $1/\\bar t$), so a normal prior on $1/\\mu$, truncated to positive values, is conjugate.',
        '<b>Bayesian lasso.</b> In the Gibbs sampler of the Bayesian lasso (Park &amp; Casella, 2008), the reciprocal of each coefficient’s local variance has an inverse Gaussian full conditional distribution.',
        '<b>Hierarchical response-time models.</b> Shifted Wald models with participant-level drift, threshold and non-decision time, and group-level priors, are fitted by MCMC (for example with brms’s <code>inverse.gaussian</code> family or custom Stan code).',
      ],
      modeling: [
        '<b>Single-boundary evidence accumulation.</b> The shifted Wald describes response times in tasks with one response, or with very few errors: drift $v$ is the speed of evidence accumulation, threshold $a$ is caution and the shift $t_0$ is non-decision time (Heathcote, 2004; Anders, Alario &amp; Van Maanen, 2016). Unlike the ex-Gaussian, its parameters have a process interpretation (Matzke &amp; Wagenmakers, 2009).',
        '<b>Racing accumulators.</b> In the racing diffusion model each response has its own Wald accumulator and the first to finish determines the choice and the response time (Logan et al., 2014; Tillman, Van Zandt &amp; Logan, 2020), as in models of the stop-signal task.',
        '<b>Neural spike timing.</b> A perfect integrate-and-fire neuron driven by a constant input plus noise fires when its membrane potential reaches a threshold, so its interspike intervals are inverse Gaussian (Gerstein &amp; Mandelbrot, 1964).',
        '<b>Physics and finance.</b> First-passage times of diffusing particles with drift (Schrödinger, 1915), and the normal-inverse Gaussian distribution of asset returns, a normal variance-mean mixture with an inverse Gaussian mixing distribution.',
      ],
    },

    references: [
      { text: 'Wikipedia: Inverse Gaussian distribution.', url: 'https://en.wikipedia.org/wiki/Inverse_Gaussian_distribution' },
      { text: 'Chhikara, R. S., &amp; Folks, J. L. (1989). <i>The Inverse Gaussian Distribution: Theory, Methodology, and Applications</i>. Marcel Dekker.' },
      { text: 'Johnson, N. L., Kotz, S., &amp; Balakrishnan, N. (1994). <i>Continuous Univariate Distributions</i>, Vol. 1 (2nd ed.), Chapter 15. Wiley.' },
      { text: 'Tweedie, M. C. K. (1957). Statistical properties of inverse Gaussian distributions I. <i>Annals of Mathematical Statistics</i>, 28(2), 362–377.', url: 'https://doi.org/10.1214/aoms/1177706964' },
      { text: 'Matzke, D., &amp; Wagenmakers, E.-J. (2009). Psychological interpretation of the ex-Gaussian and shifted Wald parameters: A diffusion model analysis. <i>Psychonomic Bulletin &amp; Review</i>, 16(5), 798–817.', url: 'https://doi.org/10.3758/PBR.16.5.798' },
      { text: 'Anders, R., Alario, F.-X., &amp; Van Maanen, L. (2016). The shifted Wald distribution for response time data analysis. <i>Psychological Methods</i>, 21(3), 309–327.', url: 'https://doi.org/10.1037/met0000066' },
      { text: 'Tillman, G., Van Zandt, T., &amp; Logan, G. D. (2020). Sequential sampling models without random between-trial variability: The racing diffusion model of speeded decision making. <i>Psychonomic Bulletin &amp; Review</i>, 27, 911–936.', url: 'https://doi.org/10.3758/s13423-020-01719-6' },
      { text: 'Park, T., &amp; Casella, G. (2008). The Bayesian lasso. <i>Journal of the American Statistical Association</i>, 103(482), 681–686.', url: 'https://doi.org/10.1198/016214508000000337' },
      { text: 'Wald, A. (1944). On cumulative sums of random variables. <i>Annals of Mathematical Statistics</i>, 15(3), 283–296.', url: 'https://doi.org/10.1214/aoms/1177731235' },
      { text: 'Shuster, J. (1968). On the inverse Gaussian distribution function. <i>Journal of the American Statistical Association</i>, 63(324), 1514–1516.', url: 'https://doi.org/10.1080/01621459.1968.10480942' },
      { text: 'Heathcote, A. (2004). Fitting Wald and ex-Wald distributions to response time data: An example using functions for the S-PLUS package. <i>Behavior Research Methods, Instruments, &amp; Computers</i>, 36(4), 678–694.', url: 'https://doi.org/10.3758/BF03206550' },
      { text: 'Logan, G. D., Van Zandt, T., Verbruggen, F., &amp; Wagenmakers, E.-J. (2014). On the ability to inhibit thought and action: General and special theories of an act of control. <i>Psychological Review</i>, 121(1), 66–95.', url: 'https://doi.org/10.1037/a0035230' },
      { text: 'Gerstein, G. L., &amp; Mandelbrot, B. (1964). Random walk models for the spike activity of a single neuron. <i>Biophysical Journal</i>, 4(1), 41–68.', url: 'https://doi.org/10.1016/S0006-3495(64)86768-0' },
      { text: 'Navarro, D. J., &amp; Fuss, I. G. (2009). Fast and accurate calculations for first-passage times in Wiener diffusion models. <i>Journal of Mathematical Psychology</i>, 53(4), 222–230.', url: 'https://doi.org/10.1016/j.jmp.2009.02.003' },
      { text: 'Leemis, L. M., &amp; McQueston, J. T. (2008). Univariate distribution relationships. <i>The American Statistician</i>, 62(1), 45–53.', url: 'https://doi.org/10.1198/000313008X270448' },
    ],
  },
};

function fmtN(v) { return String(Number(Number(v).toPrecision(4))).replace(/^-/, '−'); }
