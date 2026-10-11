// Inverse-gamma distribution with shape alpha and SCALE beta (the convention of the catalog):
// if Y ~ Gamma(alpha, rate beta) then 1/Y ~ InvGamma(alpha, scale beta).
// Follows the structure of the reference module dists/normal.js.

import { catalogParams } from '../catalog.js';
import { lgamma, gammaP, gammaQ, gammaPinv, digamma, solveMonotone, clamp } from '../core/math.js';

const A_MIN = 0.1, A_MAX = 20, B_MIN = 0.1, B_MAX = 10;

function pdf(x, { alpha, beta }) {
  if (x <= 0) return 0;
  return Math.exp(alpha * Math.log(beta) - (alpha + 1) * Math.log(x) - beta / x - lgamma(alpha));
}
const cdf = (x, { alpha, beta }) => (x <= 0 ? 0 : gammaQ(alpha, beta / x));
const sf = (x, { alpha, beta }) => (x <= 0 ? 1 : gammaP(alpha, beta / x));
const quantile = (u, { alpha, beta }) => (u <= 0 ? 0 : u >= 1 ? Infinity : beta / gammaPinv(alpha, 1 - u));
const modeOf = p => p.beta / (p.alpha + 1);

/**
 * Where the density falls to half its peak on the right of the mode, as a multiple t of the mode.
 * With the mode m fixed, f(t m)/f(m) = 1/2 is equivalent to ln t + 1/t - 1 = ln 2 / (alpha + 1), which
 * depends on alpha only; t goes from about 4 (alpha = 0.1) down toward 1 as alpha grows.
 */
const halfRatio = alpha => solveMonotone(t => Math.log(t) + 1 / t - 1, Math.LN2 / (alpha + 1), 1 + 1e-9, 1e3, { log: true });
/** The inverse: the shape alpha for which the right half-maximum point sits at t times the mode. */
const alphaFromRatio = t => (t > 1 ? Math.LN2 / (Math.log(t) + 1 / t - 1) - 1 : Infinity);

function stats(p) {
  const { alpha: a, beta: b } = p;
  const mean = a > 1 ? b / (a - 1) : Infinity;
  const variance = a > 2 ? b * b / ((a - 1) ** 2 * (a - 2)) : a > 1 ? Infinity : NaN;
  return {
    mean, variance, sd: Math.sqrt(variance),
    median: quantile(0.5, p), mode: modeOf(p),
    skewness: a > 3 ? 4 * Math.sqrt(a - 2) / (a - 3) : a > 2 ? Infinity : NaN,
    exKurtosis: a > 4 ? (30 * a - 66) / ((a - 3) * (a - 4)) : a > 2 ? Infinity : NaN,
    entropy: a + Math.log(b) + lgamma(a) - (1 + a) * digamma(a),
  };
}

export default {
  id: 'inverse-gamma',
  name: 'Inverse-gamma',
  kind: 'continuous',

  params: catalogParams('inverse-gamma', { alpha: { step: 0.1 }, beta: { step: 0.1 } }),

  pdf,
  cdf,
  sf,
  quantile,
  sample: (rng, { alpha, beta }) => beta / rng.gamma(alpha, 1),

  testParams: [{ alpha: 1, beta: 1 }, { alpha: 0.6, beta: 0.5 }, { alpha: 2.5, beta: 4 }, { alpha: 5, beta: 1 }, { alpha: 20, beta: 10 }, { alpha: 12, beta: 0.1 }],

  range: () => [0, Infinity],
  support(p) {
    // the right tail is a power law (density ~ x^(-alpha-1)); stop at the 99th percentile or 30 modes
    const m = modeOf(p);
    const hi = Math.min(quantile(0.99, p), 30 * m);
    const lo = quantile(0.0005, p);
    return lo > 0.3 * hi ? [lo - 0.08 * (hi - lo), hi] : [-0.03 * hi, hi];
  },

  stats,

  // Handles:
  //  - a dashed line at the mode beta/(alpha + 1): drag it to move the peak, keeping the shape alpha
  //    (sets beta = x (alpha + 1)); this rescales the whole curve;
  //  - an arrow from the mode to the point on the right where the density is half its peak, drawn at half
  //    the peak height: drag its tip to change alpha with the mode fixed. A longer arrow means a heavier tail
  //    (smaller alpha); the inverse has the closed form alpha = ln 2 / (ln t + 1/t - 1) - 1 with t = x / mode.
  handles: [
    {
      type: 'vline', param: 'beta', id: 'mode', label: 'mode',
      ariaLabel: 'Mode β/(α+1). Drag left or right to move the peak with the shape α fixed; the arrow keys change β.',
      x: p => modeOf(p),
      set: (pt, p) => ({ beta: Math.max(pt.x, 1e-6) * (p.alpha + 1) }),
    },
    {
      type: 'hArrow', param: 'alpha', id: 'halfwidth', label: 'α',
      ariaLabel: 'Shape α. Drag the arrow tip right for a wider curve with a heavier right tail, or left for a narrower one; the mode stays fixed. The arrow keys change α.',
      from: p => ({ x: modeOf(p), y: 0.5 * pdf(modeOf(p), p) }),
      to: p => ({ x: modeOf(p) * halfRatio(p.alpha), y: 0.5 * pdf(modeOf(p), p) }),
      set: (pt, p, p0) => {
        const m = modeOf(p0);
        // keep the mode: beta = m (alpha + 1) must stay inside its range, which bounds alpha
        const aLo = Math.max(A_MIN, B_MIN / m - 1), aHi = Math.min(A_MAX, B_MAX / m - 1);
        const alpha = clamp(alphaFromRatio(pt.x / m), aLo, aHi);
        return { alpha, beta: m * (alpha + 1) };
      },
    },
  ],

  explorer: {
    readouts: [
      { key: 'mode', label: 'Mode β/(α+1)' },
      { key: 'median', label: 'Median' },
      { label: 'Mean β/(α−1)', value: p => (p.alpha > 1 ? fmtN(p.beta / (p.alpha - 1)) : 'infinite (α ≤ 1)') },
      { label: 'Standard deviation', value: p => (p.alpha > 2 ? fmtN(Math.sqrt(stats(p).variance)) : p.alpha > 1 ? 'infinite (1 < α ≤ 2)' : 'undefined (α ≤ 1)') },
      { label: 'Probability beyond the plot', value: p => fmtN(sf(Math.min(quantile(0.99, p), 30 * modeOf(p)), p)) },
    ],
  },

  content: {
    summary: 'The inverse-gamma distribution describes a positive quantity whose reciprocal has a gamma distribution, with shape $\\alpha$ and scale $\\beta$. Its main use is as the conjugate prior for the variance of normally distributed data in Bayesian statistics.',
    description: [
      'The inverse-gamma distribution describes a positive quantity whose reciprocal has a gamma distribution: if $Y$ is gamma distributed, then $X = 1/Y$ is inverse-gamma distributed. Its main use is as a distribution for a variance. In Bayesian statistics it is the conjugate prior for the variance $\\sigma^2$ of normally distributed data, so a prior and a posterior for a variance are often inverse-gamma distributions.',
      'It takes every positive value. The density is very small close to 0, rises to a single peak and then falls off slowly: the right tail decreases like a power of $x$, not exponentially. Large values are therefore much more common than under a gamma distribution with a similar peak, and some moments are infinite. The mean exists only when $\\alpha > 1$ and the variance only when $\\alpha > 2$.',
      'This site uses shape $\\alpha$ and <b>scale</b> $\\beta$. The shape $\\alpha$ controls how heavy the right tail is (larger values give a lighter tail and a narrower peak). The scale $\\beta$ stretches the whole distribution: doubling $\\beta$ doubles every value. The same $\\beta$ is the <b>rate</b> of the gamma distribution of $1/X$, so $1/\\mathrm{Gamma}(\\alpha, \\text{rate } \\beta) = \\mathrm{InvGamma}(\\alpha, \\text{scale } \\beta)$. On the beta page, $\\alpha$ and $\\beta$ are two shapes instead.',
    ],
    explorerIntro: 'The left plot shows the density $f(x)$ and the right plot the cumulative distribution $F(x)$. Drag the dashed amber line to move the mode (the peak) at $\\beta/(\\alpha+1)$; this changes the scale $\\beta$ and keeps the shape $\\alpha$, so the curve is stretched or shrunk without changing its form. The amber arrow runs from the mode to the point on the right where the density has dropped to half the peak height. Drag its tip to change the shape $\\alpha$ with the mode held fixed: a longer arrow means a wider peak and a heavier right tail (smaller $\\alpha$). Because the tail is heavy, the plot stops at the 99th percentile (or 30 times the mode); the summary shows how much probability lies beyond the right edge.',

    pdfTex: 'f(x \\mid \\alpha, \\beta) = \\frac{\\beta^{\\alpha}}{\\Gamma(\\alpha)}\\, x^{-\\alpha - 1} \\exp\\!\\left(-\\frac{\\beta}{x}\\right), \\qquad x > 0',
    glossary: [
      { sym: 'x', meaning: 'A possible value of the random variable $X$, a positive number (for example a variance).' },
      { sym: 'f(x \\mid \\alpha, \\beta)', meaning: 'The probability density at $x$ given the parameters. Probabilities are areas under this curve.' },
      { sym: '\\alpha', meaning: 'The shape parameter, a positive number. It sets how quickly the right tail falls off: the density decreases like $x^{-\\alpha-1}$ for large $x$. As a prior for a variance, $2\\alpha$ acts like a prior number of observations.' },
      { sym: '\\beta', meaning: 'The scale parameter, a positive number in the same units as $x$. As a prior for a variance, $2\\beta$ acts like a prior sum of squared deviations.' },
      { sym: 'x^{-\\alpha-1}', meaning: 'The power-law factor that produces the heavy right tail.' },
      { sym: '\\exp\\!\\left(-\\frac{\\beta}{x}\\right)', meaning: 'The factor that makes the density vanish quickly near 0: as $x$ approaches 0, $\\beta/x$ becomes very large. $\\exp(u) = e^{u}$, with $e \\approx 2.71828$.' },
      { sym: '\\Gamma(\\alpha)', meaning: 'The gamma function, which extends the factorial: $\\Gamma(n) = (n-1)!$ for whole numbers. Together with $\\beta^{\\alpha}$ it makes the total area equal to 1.' },
    ],

    cdfTex: 'F(x \\mid \\alpha, \\beta) = P(X \\le x) = Q\\!\\left(\\alpha, \\frac{\\beta}{x}\\right) = \\frac{\\Gamma(\\alpha, \\beta/x)}{\\Gamma(\\alpha)}',
    cdfGlossary: [
      { sym: 'F(x \\mid \\alpha, \\beta)', meaning: 'The cumulative distribution function: the probability that $X$ is at most $x$.' },
      { sym: 'P(X \\le x)', meaning: 'The probability that the random variable $X$ takes a value of at most $x$.' },
      { sym: 'Q(\\alpha, u)', meaning: 'The regularized upper incomplete gamma function. It equals $P(Y > u)$ for $Y \\sim \\mathrm{Gamma}(\\alpha, 1)$; it is computed numerically. The CDF has this form because $X \\le x$ exactly when $1/X \\ge 1/x$.' },
      { sym: '\\Gamma(\\alpha, u)', meaning: 'The upper incomplete gamma function: the area under $t^{\\alpha-1}e^{-t}$ from $u$ to infinity, $\\Gamma(\\alpha, u) = \\int_u^{\\infty} t^{\\alpha - 1} e^{-t}\\, dt$, where $t$ is the integration variable. Here $u = \\beta/x$.' },
      { sym: '\\Gamma(\\alpha)', meaning: 'The complete gamma function, the same area from 0 to infinity.' },
      { sym: '\\alpha,\\ \\beta', meaning: 'The shape and the scale.' },
    ],

    extraFormulas: [
      {
        title: 'Conjugate update for a normal variance',
        intro: 'With a prior $\\sigma^2 \\sim \\mathrm{InvGamma}(\\alpha, \\beta)$ and observations $x_1, \\dots, x_n$ from $\\mathcal N(\\mu, \\sigma^2)$ with a known mean $\\mu$, the posterior is again inverse-gamma. See the relation page for an interactive version.',
        tex: '\\sigma^2 \\mid \\mathbf x \\sim \\mathrm{InvGamma}\\!\\left(\\alpha + \\frac n2,\\ \\beta + \\frac12 \\sum_{i=1}^n (x_i - \\mu)^2\\right)',
        glossary: [
          { sym: '\\sigma^2', meaning: 'The unknown variance of the normal observations.' },
          { sym: '\\mathbf x = (x_1, \\dots, x_n)', meaning: 'The observed data, $n$ numbers.' },
          { sym: '\\mu', meaning: 'The mean of the normal distribution, assumed known here.' },
          { sym: '\\sum_{i=1}^n (x_i - \\mu)^2', meaning: 'The sum of squared deviations of the observations from $\\mu$.' },
        ],
      },
      {
        title: 'Scaled inverse-chi-squared form',
        intro: 'Gelman et al. (BDA3) often write the same family as a scaled inverse-chi-squared distribution with $\\nu$ degrees of freedom and scale $s^2$, which reads like “a prior worth $\\nu$ observations with variance $s^2$”.',
        tex: '\\text{Scaled-Inv-}\\chi^2(\\nu, s^2) = \\mathrm{InvGamma}\\!\\left(\\frac\\nu2,\\ \\frac{\\nu s^2}{2}\\right)',
        glossary: [
          { sym: '\\nu', meaning: 'The degrees of freedom, a prior sample size; $\\nu = 2\\alpha$.' },
          { sym: 's^2', meaning: 'A prior guess of the variance; $s^2 = \\beta/\\alpha$.' },
          { sym: '\\chi^2', meaning: 'The chi-squared distribution. If $W \\sim \\chi^2_\\nu$, then $\\nu s^2/W$ has the scaled inverse-chi-squared distribution.' },
        ],
      },
    ],

    properties: [
      { name: 'Support', tex: 'x \\in (0, \\infty)', explain: 'Every positive number. The density is extremely small near 0 and falls off slowly (as a power of $x$) for large $x$.' },
      { name: 'Mean', tex: '\\mathrm{E}[X] = \\frac{\\beta}{\\alpha - 1} \\quad (\\alpha > 1)', value: p => stats(p).mean, explain: 'Defined for $\\alpha > 1$; infinite for $\\alpha \\le 1$, because the tail is then too heavy for the average to settle down.' },
      { name: 'Median', tex: '\\frac{\\beta}{Q^{-1}(\\alpha, \\tfrac12)}', value: p => quantile(0.5, p), explain: 'No closed form; it is computed by inverting the incomplete gamma function. Equivalently, it is $\\beta$ divided by the median of a $\\mathrm{Gamma}(\\alpha, 1)$ variable.' },
      { name: 'Mode', tex: '\\frac{\\beta}{\\alpha + 1}', value: p => modeOf(p), explain: 'The peak of the curve. It always exists and lies below the median and the mean, because the distribution is skewed to the right.' },
      { name: 'Variance', tex: '\\mathrm{Var}(X) = \\frac{\\beta^2}{(\\alpha - 1)^2(\\alpha - 2)} \\quad (\\alpha > 2)', value: p => stats(p).variance, explain: 'Defined for $\\alpha > 2$; infinite for $1 < \\alpha \\le 2$; undefined for $\\alpha \\le 1$, where the mean is already infinite.' },
      { name: 'Standard deviation', tex: '\\frac{\\beta}{(\\alpha - 1)\\sqrt{\\alpha - 2}} \\quad (\\alpha > 2)', value: p => stats(p).sd, explain: 'The square root of the variance, under the same conditions.' },
      { name: 'Skewness', tex: '\\frac{4\\sqrt{\\alpha - 2}}{\\alpha - 3} \\quad (\\alpha > 3)', value: p => stats(p).skewness, explain: 'Defined for $\\alpha > 3$; infinite for $2 < \\alpha \\le 3$; undefined for $\\alpha \\le 2$, where the variance is not finite. Always positive: a long tail to the right. It shrinks toward 0 like $4/\\sqrt\\alpha$ for large $\\alpha$.' },
      { name: 'Excess kurtosis', tex: '\\frac{30\\alpha - 66}{(\\alpha - 3)(\\alpha - 4)} \\quad (\\alpha > 4)', value: p => stats(p).exKurtosis, explain: 'Defined for $\\alpha > 4$; infinite for $2 < \\alpha \\le 4$; undefined for $\\alpha \\le 2$. The tails are much heavier than those of a normal distribution unless $\\alpha$ is large.' },
      { name: 'Entropy', tex: '\\alpha + \\ln\\!\\big(\\beta\\,\\Gamma(\\alpha)\\big) - (1 + \\alpha)\\,\\psi(\\alpha)', value: p => stats(p).entropy, explain: 'Differential entropy in nats; $\\psi$ is the digamma function, the derivative of $\\ln\\Gamma$. Increasing $\\beta$ by a factor $c$ adds $\\ln c$, as for any scale parameter.' },
      { name: 'Moment-generating function', tex: 'M(t) = \\mathrm{E}[e^{tX}] = \\infty \\quad (t > 0)', explain: 'Does not exist: the power-law tail makes $\\mathrm{E}[e^{tX}]$ infinite for every $t > 0$. Only the moments $\\mathrm{E}[X^k]$ with $k < \\alpha$ are finite.' },
      { name: 'Characteristic function', tex: '\\varphi(t) = \\frac{2\\,(-i\\beta t)^{\\alpha/2}}{\\Gamma(\\alpha)}\\, K_{\\alpha}\\!\\left(\\sqrt{-4i\\beta t}\\right)', explain: '$\\mathrm{E}[e^{itX}]$, where $i = \\sqrt{-1}$ and $K_\\alpha$ is the modified Bessel function of the second kind. It is rarely used in practice.' },
      { name: 'Raw moments', tex: '\\mathrm{E}[X^k] = \\frac{\\beta^k\\,\\Gamma(\\alpha - k)}{\\Gamma(\\alpha)} \\quad (k < \\alpha)', value: p => (p.alpha > 2 ? `${fmtN(p.beta ** 2 / ((p.alpha - 1) * (p.alpha - 2)))} (k = 2)` : 'infinite for k = 2'), explain: 'The $k$-th moment is finite only when $k < \\alpha$. The value column shows $\\mathrm{E}[X^2]$.' },
      { name: 'Reciprocal', tex: '1/X \\sim \\mathrm{Gamma}(\\alpha, \\beta)', value: p => p.alpha / p.beta, explain: 'If $X$ is a variance, $1/X$ is the precision, which therefore has a gamma distribution with the same $\\alpha$ and rate $\\beta$. Its mean is $\\mathrm{E}[1/X] = \\alpha/\\beta$, shown in the value column.' },
      { name: 'Right half-maximum point', tex: 'x_{1/2} = t\\,\\frac{\\beta}{\\alpha + 1}', value: p => modeOf(p) * halfRatio(p.alpha), explain: 'The point to the right of the mode where the density has fallen to half its peak height; it is the tip of the amber arrow. Its ratio $t$ to the mode solves $\\ln t + 1/t - 1 = \\ln 2/(\\alpha + 1)$, so it depends on $\\alpha$ only, from about 4 at $\\alpha = 0.1$ to close to 1 for large $\\alpha$.' },
    ],

    limits: [
      { text: '<b>Inverse-chi-squared.</b> $\\mathrm{InvGamma}(\\tfrac\\nu2, \\tfrac12)$ is the inverse-chi-squared distribution with $\\nu$ degrees of freedom (the distribution of $1/W$ for $W \\sim \\chi^2_\\nu$), and $\\mathrm{InvGamma}(\\tfrac\\nu2, \\tfrac{\\nu s^2}{2})$ is the scaled inverse-chi-squared distribution used in Gelman et al. (BDA3).', to: 'chi-squared' },
      { text: '<b>Lévy distribution.</b> With $\\alpha = \\tfrac12$ the inverse-gamma is the Lévy distribution with scale $c = 2\\beta$, the distribution of the time at which a Brownian motion without drift first reaches a given level. It has no finite mean.' },
      { text: '<b>Reciprocal of an exponential.</b> With $\\alpha = 1$, $X = 1/Y$ for an exponential $Y$ with rate $\\beta$; the density is $\\beta x^{-2} e^{-\\beta/x}$ and the mean is infinite.', to: 'exponential' },
      { text: '<b>Normal limit.</b> As $\\alpha \\to \\infty$ with the mean $\\beta/(\\alpha-1)$ held fixed, the distribution concentrates around its mean and becomes approximately normal, with standard deviation about the mean divided by $\\sqrt\\alpha$.', to: 'normal' },
      { text: '<b>Mixing distribution for Student’s t.</b> A normal variable whose variance is drawn from $\\mathrm{InvGamma}(\\tfrac\\nu2, \\tfrac\\nu2)$ has a Student’s t distribution with $\\nu$ degrees of freedom.', relation: 'inverse-gamma--student-t', to: 'student-t' },
      { text: '<b>Half-Cauchy as a mixture.</b> If $a \\sim \\mathrm{InvGamma}(\\tfrac12, 1/A^2)$ and $\\sigma^2 \\mid a \\sim \\mathrm{InvGamma}(\\tfrac12, 1/a)$, then $\\sigma$ has a half-Cauchy distribution with scale $A$ (Wand et al., 2011). This lets Gibbs samplers use half-Cauchy priors.', to: 'half-cauchy' },
    ],

    uses: {
      frequentist: [
        '<b>Confidence intervals for a variance.</b> For normal data, $(n-1)s^2/\\sigma^2 \\sim \\chi^2_{n-1}$, so the chi-squared interval $\\big[(n-1)s^2/\\chi^2_{0.975},\\ (n-1)s^2/\\chi^2_{0.025}\\big]$ consists of quantiles of a scaled inverse-chi-squared (inverse-gamma) distribution. This is also the fiducial distribution of $\\sigma^2$, and it matches the Bayesian posterior under the prior $p(\\sigma^2) \\propto 1/\\sigma^2$.',
        '<b>Robust regression with t errors.</b> Maximum-likelihood fitting of regression models with Student’s t errors by the EM algorithm treats each observation’s variance as a latent inverse-gamma (equivalently, its precision as a gamma) variable (Lange, Little and Taylor, 1989).',
        '<b>First-passage times.</b> The special case $\\alpha = \\tfrac12$ (the Lévy distribution) is the exact distribution of the hitting time of a level by Brownian motion without drift; it appears in sequential analysis and in physics.',
      ],
      bayesian: [
        '<b>Conjugate prior for a normal variance.</b> With known mean $\\mu$, $\\mathrm{InvGamma}(\\alpha, \\beta) \\to \\mathrm{InvGamma}\\big(\\alpha + \\tfrac n2,\\ \\beta + \\tfrac12\\sum_i (x_i - \\mu)^2\\big)$: the shape grows by half the number of observations and the scale by half the sum of squared deviations.',
        '<b>Normal–inverse-gamma prior.</b> When both the mean and the variance are unknown, the prior $\\sigma^2 \\sim \\mathrm{InvGamma}(\\alpha, \\beta)$, $\\mu \\mid \\sigma^2 \\sim \\mathcal N(\\mu_0, \\sigma^2/\\kappa_0)$ is conjugate. The marginal posterior of $\\sigma^2$ is inverse-gamma and that of $\\mu$ is Student’s t. The same structure gives conjugate Bayesian linear regression.',
        '<b>Posterior predictive distribution.</b> Averaging a normal distribution over an inverse-gamma posterior for its variance gives a Student’s t predictive distribution with $2\\alpha$ degrees of freedom, which has heavier tails than the normal because the variance is uncertain.',
        '<b>Gibbs sampling.</b> In hierarchical models the variance parameters often have inverse-gamma full conditional distributions, which BUGS and JAGS sample directly. A gamma prior on a precision (as in JAGS’s <code>dgamma(0.001, 0.001)</code>) is the same as an inverse-gamma prior on the variance.',
        '<b>Caution about vague versions.</b> The “noninformative” $\\mathrm{InvGamma}(\\epsilon, \\epsilon)$ prior with small $\\epsilon$ is not vague for group-level variances in hierarchical models: the posterior can depend strongly on $\\epsilon$ when the variance is close to 0. Gelman (2006) recommends a uniform or half-Cauchy prior on the standard deviation instead.',
        '<b>Priors that avoid zero.</b> Because the density is nearly zero near 0 and has a long right tail, the inverse-gamma is a useful prior for parameters that must stay away from 0, such as the length-scale of a Gaussian process (as suggested in the Stan User’s Guide).',
      ],
      modeling: [
        '<b>Heavy-tailed noise.</b> Drawing each observation’s variance from an inverse-gamma distribution and then adding normal noise produces Student’s t noise, a standard way to make models of reaction times, neural signals or prices robust to outliers.',
        '<b>Stochastic volatility.</b> In the diffusion limit of the GARCH(1,1) model, the stationary distribution of the variance is inverse-gamma, which makes the returns approximately Student’s t (Nelson, 1990).',
        '<b>Cognitive models fitted in JAGS or Stan.</b> Noise variances of measurement models (for example, the variance of memory or perceptual noise) are often given inverse-gamma or, equivalently, gamma-on-precision priors.',
        '<b>Simulation.</b> To draw from $\\mathrm{InvGamma}(\\alpha, \\beta)$, draw $Y$ from $\\mathrm{Gamma}(\\alpha, 1)$ and return $\\beta/Y$.',
      ],
    },

    references: [
      { text: 'Wikipedia: Inverse-gamma distribution.', url: 'https://en.wikipedia.org/wiki/Inverse-gamma_distribution' },
      { text: 'Wikipedia: Scaled inverse chi-squared distribution.', url: 'https://en.wikipedia.org/wiki/Scaled_inverse_chi-squared_distribution' },
      { text: 'Gelman, A., Carlin, J. B., Stern, H. S., Dunson, D. B., Vehtari, A., & Rubin, D. B. (2013). <i>Bayesian Data Analysis</i> (3rd ed.), Sections 2.6 and 3.2–3.3, and Appendix A. CRC Press.', url: 'http://www.stat.columbia.edu/~gelman/book/' },
      { text: 'Gelman, A. (2006). Prior distributions for variance parameters in hierarchical models. <i>Bayesian Analysis</i>, 1(3), 515–534.', url: 'https://doi.org/10.1214/06-BA117A' },
      { text: 'Johnson, N. L., Kotz, S., & Balakrishnan, N. (1994). <i>Continuous Univariate Distributions</i>, Vol. 1 (2nd ed.), Chapter 17 (gamma and related distributions). Wiley.' },
      { text: 'Wand, M. P., Ormerod, J. T., Padoan, S. A., & Frühwirth, R. (2011). Mean field variational Bayes for elaborate distributions. <i>Bayesian Analysis</i>, 6(4), 847–900.', url: 'https://doi.org/10.1214/11-BA631' },
      { text: 'Lange, K. L., Little, R. J. A., & Taylor, J. M. G. (1989). Robust statistical modeling using the t distribution. <i>Journal of the American Statistical Association</i>, 84(408), 881–896.', url: 'https://doi.org/10.2307/2290063' },
      { text: 'Nelson, D. B. (1990). ARCH models as diffusion approximations. <i>Journal of Econometrics</i>, 45(1–2), 7–38.', url: 'https://doi.org/10.1016/0304-4076(90)90092-8' },
      { text: 'Leemis, L. M., & McQueston, J. T. (2008). Univariate distribution relationships. <i>The American Statistician</i>, 62(1), 45–53.', url: 'https://doi.org/10.1198/000313008X270448' },
    ],
  },
};

function fmtN(v) { return String(Number(v.toPrecision(4))).replace(/^-/, '−'); }
