// Ex-Gaussian distribution: the sum of a normal variable N(mu, sigma^2) and an independent exponential
// variable with MEAN tau (rate 1/tau). The standard descriptive model of response-time distributions.
//
// Numerics: the density is written with the scaled complementary error function erfcx so that it never
// multiplies a huge exponential by a tiny normal tail (see densityParts). The CDF uses the identity
// F(x) = Phi(z) - tau f(x), and the upper tail 1 - F(x) = Phi(-z) + tau f(x) has no cancellation.
// The mode, median and entropy have no closed form and are computed numerically.
//
// Named exports exGaussianPdf / exGaussianCdf are reused by the relation pages normal--ex-gaussian and
// exponential--ex-gaussian.

import { catalogParams } from '../catalog.js';
import { erfcx, normalCdf, normalPdf, quantileContinuous, integrate, brent, SQRT2 } from '../core/math.js';

/** Ex-Gaussian density at x. */
export function exGaussianPdf(x, mu, sigma, tau) {
  const z = (x - mu) / sigma, r = sigma / tau;
  const u = (r - z) / SQRT2;
  // f = (1/tau) exp((mu - x)/tau + r^2/2) Phi(z - r) = (1/(2 tau)) exp(-z^2/2) erfcx((r - z)/sqrt 2)
  if (u >= 0) return Math.exp(-0.5 * z * z) * erfcx(u) / (2 * tau);
  return Math.exp(-z * r + 0.5 * r * r) * normalCdf(z - r) / tau;
}
/** P(X <= x). */
export function exGaussianCdf(x, mu, sigma, tau) {
  const z = (x - mu) / sigma;
  if (z === -Infinity) return 0;
  if (z === Infinity) return 1;
  return Math.min(1, Math.max(0, normalCdf(z) - tau * exGaussianPdf(x, mu, sigma, tau)));
}
/** P(X > x), accurate in the upper tail. */
export function exGaussianSf(x, mu, sigma, tau) {
  const z = (x - mu) / sigma;
  if (z === -Infinity) return 1;
  if (z === Infinity) return 0;
  return Math.min(1, Math.max(0, normalCdf(-z) + tau * exGaussianPdf(x, mu, sigma, tau)));
}

const pdf = (x, { mu, sigma, tau }) => exGaussianPdf(x, mu, sigma, tau);
const cdf = (x, { mu, sigma, tau }) => exGaussianCdf(x, mu, sigma, tau);
const sf = (x, { mu, sigma, tau }) => exGaussianSf(x, mu, sigma, tau);

/**
 * Mode: f'(x) = (phi(z)/sigma - f(x)) / tau, so the mode is where the ex-Gaussian density equals the
 * density of its normal component. It lies to the right of mu.
 */
function modeOf({ mu, sigma, tau }) {
  const h = x => normalPdf((x - mu) / sigma) / sigma - exGaussianPdf(x, mu, sigma, tau);
  let hi = mu + sigma, step = sigma;
  for (let i = 0; i < 200 && h(hi) > 0; i++) { hi += step; step *= 1.5; }
  return brent(h, mu, hi, 1e-13);
}
const quantile = (u, p) => quantileContinuous(x => cdf(x, p), u, -Infinity, Infinity, p.mu + p.tau * Math.log(2), Math.sqrt(p.sigma ** 2 + p.tau ** 2));

const statCache = new Map();
function stats(p) {
  const { mu, sigma, tau } = p;
  const key = `${mu}|${sigma}|${tau}`;
  if (statCache.has(key)) return statCache.get(key);
  const v = sigma * sigma + tau * tau;
  const mode = modeOf(p), median = quantile(0.5, p);
  const lo = mu - 12 * sigma, hi = mu + 12 * sigma + 45 * tau;
  const entropy = integrate(x => { const f = pdf(x, p); return f > 0 ? -f * Math.log(f) : 0; }, lo, hi,
    { tol: 1e-12, points: [mu - 3 * sigma, mode, median, mu + tau, mu + 3 * sigma + 3 * tau, mu + 3 * sigma + 10 * tau] });
  const st = {
    mean: mu + tau, variance: v, sd: Math.sqrt(v), median, mode,
    skewness: 2 * tau ** 3 / v ** 1.5, exKurtosis: 6 * tau ** 4 / (v * v), entropy,
  };
  if (statCache.size > 200) statCache.clear();
  statCache.set(key, st);
  return st;
}

export default {
  id: 'ex-gaussian',
  name: 'Ex-Gaussian',
  kind: 'continuous',
  params: catalogParams('ex-gaussian', { mu: { step: 0.01 }, sigma: { name: 'normal standard deviation' } }),

  pdf, cdf, sf, quantile,
  sample: (rng, { mu, sigma, tau }) => rng.exGaussian(mu, sigma, tau),

  testParams: [
    { mu: 1, sigma: 0.3, tau: 0.02 },     // nearly normal
    { mu: 0.2, sigma: 0.01, tau: 1.5 },   // nearly a shifted exponential
    { mu: 0, sigma: 0.5, tau: 0.5 },
    { mu: 2, sigma: 0.08, tau: 0.6 },
  ],

  range: () => [-Infinity, Infinity],
  support: ({ mu, sigma, tau }) => [mu - 4.5 * sigma, mu + 4 * sigma + 6.5 * tau],
  stats,

  // Handles:
  //  - a vertical line at mu, the mean of the normal component (moves the whole curve);
  //  - an arrow from mu to the LEFT, of length sigma, ending on the rising edge of the curve
  //    (the rising edge is shaped mostly by the normal component);
  //  - an arrow from mu to the RIGHT, of length tau, ending on the curve at mu + tau, the overall mean.
  handles: [
    { type: 'vline', param: 'mu' },
    {
      type: 'hArrow', param: 'sigma',
      from: p => ({ x: p.mu, y: pdf(p.mu - p.sigma, p) }),
      to: p => ({ x: p.mu - p.sigma, y: pdf(p.mu - p.sigma, p) }),
      set: (pt, p) => ({ sigma: p.mu - pt.x }),
    },
    {
      type: 'hArrow', param: 'tau',
      from: p => ({ x: p.mu, y: pdf(p.mu + p.tau, p) }),
      to: p => ({ x: p.mu + p.tau, y: pdf(p.mu + p.tau, p) }),
      set: (pt, p) => ({ tau: pt.x - p.mu }),
    },
  ],

  explorer: {
    xLabel: 'x',
    pdfCaption: 'Probability density  f(x)  (x in seconds)',
    // a normal curve with the same mean and standard deviation, to show the skew
    overlays: ({ mu, sigma, tau }) => {
      const m = mu + tau, sd = Math.sqrt(sigma * sigma + tau * tau);
      return [{
        id: 'normal', label: 'Normal with the same mean and standard deviation', cls: 'curve-ref',
        pdf: x => normalPdf((x - m) / sd) / sd, cdf: x => normalCdf((x - m) / sd),
      }];
    },
    readouts: [
      { key: 'mean', label: 'Mean μ + τ' },
      { key: 'sd', label: 'Standard deviation √(σ² + τ²)' },
      { key: 'median', label: 'Median' },
      { key: 'mode', label: 'Mode' },
      { key: 'skewness', label: 'Skewness' },
      { label: 'Share of the variance from τ', value: ({ sigma, tau }) => `${(100 * tau * tau / (sigma * sigma + tau * tau)).toFixed(1)}%` },
    ],
  },

  content: {
    summary: 'The ex-Gaussian distribution is the sum of a normal variable (mean $\\mu$, standard deviation $\\sigma$) and an independent exponential variable (mean $\\tau$). Its bell shape with a long right tail matches typical response times in psychology experiments.',
    description: [
      'The ex-Gaussian distribution is the distribution of a sum $X = N + E$ of two independent parts: a normal (Gaussian) variable $N$ with mean $\\mu$ and standard deviation $\\sigma$, and an exponential variable $E$ with mean $\\tau$. The name is short for “exponentially modified Gaussian”. Its values can be any real number, but in practice $\\mu$ is several standard deviations above 0, so nearly all of the probability lies on positive values.',
      'Its shape is a bell curve on the left and a long, exponentially decaying tail on the right. This is the typical shape of response times in psychology experiments: most responses are close to a typical time, and a minority are much slower. The three parameters split the distribution into a location and spread of the bell ($\\mu$, $\\sigma$) and a length of the slow tail ($\\tau$). The overall mean is $\\mu + \\tau$ and the variance is $\\sigma^2 + \\tau^2$.',
      'Fitting the ex-Gaussian is a common way to describe whether an experimental effect shifts the whole distribution (a change in $\\mu$) or mainly stretches its tail (a change in $\\tau$). The parameters are a description of shape, though: the normal and exponential parts do not correspond cleanly to separate mental processes.',
    ],
    explorerIntro: 'The left plot shows the density $f(x)$ (solid) and, for comparison, a normal density with the same mean $\\mu + \\tau$ and standard deviation $\\sqrt{\\sigma^2 + \\tau^2}$ (dashed); the right plot shows the two CDFs. The difference between them is the skew: the ex-Gaussian rises more steeply and has a longer right tail. Drag the dashed amber line to move $\\mu$, which shifts the whole curve. The amber arrow pointing left from $\\mu$ has length $\\sigma$ and ends on the rising edge of the curve: drag its tip to make the bell narrower or wider. The arrow pointing right has length $\\tau$ and ends at the overall mean $\\mu + \\tau$: drag its tip to make the slow tail longer or shorter. With a small $\\tau$ the curve is nearly normal; with a small $\\sigma$ it is nearly an exponential curve starting at $\\mu$.',
    parameterization: 'The site uses $\\mu$ and $\\sigma$ for the mean and standard deviation of the normal component and $\\tau$ for the <b>mean</b> of the exponential component (its rate is $\\lambda = 1/\\tau$). Note that $\\mu$ is not the mean of the ex-Gaussian, which is $\\mu + \\tau$. Other software uses other forms: Stan’s <code>exp_mod_normal</code> uses the rate $\\lambda = 1/\\tau$, SciPy’s <code>exponnorm</code> uses $K = \\tau/\\sigma$ with location $\\mu$ and scale $\\sigma$, and the brms <code>exgaussian</code> family uses the overall mean $\\mu + \\tau$, $\\sigma$ and $\\tau$ (called beta).',

    pdfTex: 'f(x \\mid \\mu, \\sigma, \\tau) = \\frac{1}{\\tau} \\exp\\!\\left( \\frac{\\mu - x}{\\tau} + \\frac{\\sigma^2}{2\\tau^2} \\right) \\Phi\\!\\left( \\frac{x - \\mu}{\\sigma} - \\frac{\\sigma}{\\tau} \\right)',
    pdfIntro: 'The density is the convolution of the normal and exponential densities, $f(x) = \\int_0^\\infty \\frac{1}{\\tau}e^{-y/\\tau}\\, \\frac{1}{\\sigma}\\varphi\\!\\left(\\frac{x - \\mu - y}{\\sigma}\\right) dy$: the probability of reaching $x$ by an exponential delay $y$ plus a normal value $x - y$, added up over all delays. Working out the integral gives',
    glossary: [
      { sym: 'x', meaning: 'A possible value of the random variable $X$, for example a response time in seconds. It can be any real number.' },
      { sym: 'f(x \\mid \\mu, \\sigma, \\tau)', meaning: 'The probability density at $x$. Probabilities are areas under this curve.' },
      { sym: '\\mu', meaning: 'The mean of the normal component. It sets the position of the bell-shaped part; it is not the mean of $X$, which is $\\mu + \\tau$.' },
      { sym: '\\sigma', meaning: 'The standard deviation of the normal component, which sets the width of the bell-shaped part ($\\sigma > 0$).' },
      { sym: '\\tau', meaning: 'The mean of the exponential component ($\\tau > 0$). It sets the length of the right tail and is also the standard deviation of the exponential part.' },
      { sym: '\\exp(\\cdot)', meaning: 'The exponential function $e^{(\\cdot)}$, with $e \\approx 2.71828$. The factor $\\frac1\\tau e^{(\\mu - x)/\\tau}$ is the exponential decay of the right tail.' },
      { sym: '\\frac{\\sigma^2}{2\\tau^2}', meaning: 'A constant that comes from completing the square in the convolution integral.' },
      { sym: '\\Phi(\\cdot)', meaning: 'The CDF of the standard normal distribution. Here it acts as a smooth switch: close to 0 well to the left of $\\mu$, where the bell has not started, and close to 1 in the right tail, where only the exponential decay remains.' },
      { sym: '\\frac{x - \\mu}{\\sigma} - \\frac{\\sigma}{\\tau}', meaning: 'The z-score of $x$ under the normal component, shifted left by the ratio $\\sigma/\\tau$.' },
    ],

    cdfTex: 'F(x \\mid \\mu, \\sigma, \\tau) = \\Phi\\!\\left(\\frac{x - \\mu}{\\sigma}\\right) - \\exp\\!\\left( \\frac{\\mu - x}{\\tau} + \\frac{\\sigma^2}{2\\tau^2} \\right) \\Phi\\!\\left( \\frac{x - \\mu}{\\sigma} - \\frac{\\sigma}{\\tau} \\right)',
    cdfIntro: 'The second term is exactly $\\tau f(x)$, so $F(x) = \\Phi\\big((x-\\mu)/\\sigma\\big) - \\tau f(x)$: the CDF of the normal component minus a correction for the probability that the exponential delay has pushed values past $x$.',
    cdfGlossary: [
      { sym: 'F(x \\mid \\mu, \\sigma, \\tau)', meaning: 'The cumulative distribution function: the probability that $X \\le x$.' },
      { sym: '\\Phi\\!\\left(\\frac{x - \\mu}{\\sigma}\\right)', meaning: 'The probability that the normal component alone is at most $x$. Because the exponential delay is never negative, $F(x)$ is always smaller than this.' },
      { sym: '\\Phi(\\cdot)', meaning: 'The CDF of the standard normal distribution, computed numerically from the error function.' },
      { sym: '\\exp(\\cdot)', meaning: 'The exponential function.' },
      { sym: '\\mu,\\ \\sigma,\\ \\tau', meaning: 'The normal mean, the normal standard deviation and the exponential mean, as in the density.' },
    ],

    extraFormulas: [
      {
        title: 'Method-of-moments estimates',
        intro: 'Because the mean, variance and skewness have simple forms, the three parameters can be recovered from a sample mean $m$, standard deviation $s$ and skewness $g$ (valid for $0 < g < 2$). Maximum likelihood is more accurate and is the usual choice, but these values make good starting points:',
        tex: '\\hat\\tau = s\\left(\\tfrac{g}{2}\\right)^{1/3}, \\qquad \\hat\\sigma = s\\sqrt{1 - \\left(\\tfrac{g}{2}\\right)^{2/3}}, \\qquad \\hat\\mu = m - \\hat\\tau',
        glossary: [
          { sym: 'm,\\ s,\\ g', meaning: 'The sample mean, sample standard deviation and sample skewness of the observed values.' },
          { sym: '\\hat\\mu,\\ \\hat\\sigma,\\ \\hat\\tau', meaning: 'The estimates of the three parameters.' },
        ],
      },
    ],

    properties: [
      { name: 'Support', tex: 'x \\in (-\\infty, \\infty)', explain: 'Every real number has positive density. For response times $\\mu$ is many standard deviations above 0, so negative values have negligible probability.' },
      { name: 'Mean', tex: '\\mathrm{E}[X] = \\mu + \\tau', value: p => p.mu + p.tau, explain: 'The mean of the normal part plus the mean of the exponential part.' },
      { name: 'Median', tex: '\\text{no closed form}', value: p => stats(p).median, explain: 'Computed numerically by solving $F(x) = 1/2$. It lies between the mode and the mean (checked numerically over the whole range of the shape ratio $\\tau/\\sigma$); when $\\sigma$ is small it is close to $\\mu + \\tau\\ln 2$, the median of the shifted exponential.' },
      { name: 'Mode', tex: '\\text{solves } f(x) = \\tfrac{1}{\\sigma}\\varphi\\!\\left(\\tfrac{x-\\mu}{\\sigma}\\right)', value: p => stats(p).mode, explain: 'Computed numerically. The slope of the density is $f\'(x) = \\big[\\varphi((x-\\mu)/\\sigma)/\\sigma - f(x)\\big]/\\tau$, so the peak is where the ex-Gaussian density crosses the density of its normal component $\\mathcal N(\\mu, \\sigma^2)$, always to the right of $\\mu$. Here $\\varphi$ is the standard normal density.' },
      { name: 'Variance', tex: '\\mathrm{Var}(X) = \\sigma^2 + \\tau^2', value: p => p.sigma ** 2 + p.tau ** 2, explain: 'Variances of independent parts add.' },
      { name: 'Standard deviation', tex: '\\sqrt{\\sigma^2 + \\tau^2}', value: p => Math.sqrt(p.sigma ** 2 + p.tau ** 2), explain: 'In the same units as $x$.' },
      { name: 'Skewness', tex: '\\frac{2\\tau^3}{(\\sigma^2 + \\tau^2)^{3/2}}', value: p => 2 * p.tau ** 3 / (p.sigma ** 2 + p.tau ** 2) ** 1.5, explain: 'Always positive (a long right tail) and always below 2, the skewness of the exponential, which it approaches as $\\tau/\\sigma$ grows.' },
      { name: 'Excess kurtosis', tex: '\\frac{6\\tau^4}{(\\sigma^2 + \\tau^2)^2}', value: p => 6 * p.tau ** 4 / (p.sigma ** 2 + p.tau ** 2) ** 2, explain: 'Between 0 (the normal) and 6 (the exponential).' },
      { name: 'Entropy', tex: '\\text{no closed form}', value: p => stats(p).entropy, explain: 'Differential entropy in nats, computed by numerical integration of $-f \\ln f$. It lies between the entropy of the normal part, $\\tfrac12\\ln(2\\pi e\\sigma^2)$, and that of the normal with the same variance.' },
      { name: 'Moment-generating function', tex: 'M(t) = \\frac{\\exp\\!\\left(\\mu t + \\tfrac12\\sigma^2 t^2\\right)}{1 - \\tau t}, \\quad t < 1/\\tau', explain: 'The product of the normal and exponential moment-generating functions, because $X$ is a sum of independent parts.' },
      { name: 'Characteristic function', tex: '\\varphi_X(t) = \\frac{\\exp\\!\\left(i\\mu t - \\tfrac12\\sigma^2 t^2\\right)}{1 - i\\tau t}', explain: '$\\mathrm{E}[e^{itX}]$, where $i = \\sqrt{-1}$; again the product of the two component functions.' },
      { name: 'Ratio τ/σ', tex: 'K = \\tau/\\sigma', value: p => p.tau / p.sigma, explain: 'The single shape parameter (SciPy’s <code>exponnorm</code>). Small $K$ means nearly normal; large $K$ means nearly a shifted exponential.' },
      { name: 'Tail', tex: 'P(X > x) \\approx \\tau f(x) \\ \\text{for large } x', value: p => `P(X > μ + 3τ) = ${fmtN(sf(p.mu + 3 * p.tau, p))}`, explain: 'Far to the right the normal part no longer matters and the tail decays like $e^{-x/\\tau}$, exponentially, much more slowly than a normal tail.' },
    ],

    limits: [
      { text: '<b>Small $\\tau$: normal.</b> As $\\tau \\to 0$ the exponential delay vanishes and the ex-Gaussian becomes $\\mathcal N(\\mu, \\sigma^2)$. The relationship page shows the sum of a normal and an exponential variable.', relation: 'normal--ex-gaussian', to: 'normal' },
      { text: '<b>Small $\\sigma$: shifted exponential.</b> As $\\sigma \\to 0$ the ex-Gaussian becomes $\\mu$ plus an exponential variable with mean $\\tau$, with density $\\frac1\\tau e^{-(x-\\mu)/\\tau}$ for $x \\ge \\mu$.', relation: 'exponential--ex-gaussian', to: 'exponential' },
      { text: '<b>Only the ratio matters for the shape.</b> Shifting by $\\mu$ and rescaling both $\\sigma$ and $\\tau$ by the same factor does not change the shape, which depends only on $K = \\tau/\\sigma$.' },
      { text: '<b>Ex-Wald.</b> Replacing the normal part with a Wald (inverse Gaussian) variable gives the ex-Wald distribution, a response-time model in which the non-tail part is a diffusion first-passage time (Schwarz, 2001).', to: 'wald' },
    ],

    uses: {
      frequentist: [
        '<b>Describing response-time distributions.</b> The three parameters are estimated by maximum likelihood (R packages such as <code>retimes</code> and <code>gamlss</code>) or by quantile maximum probability estimation (QMPE, introduced as quantile maximum likelihood by Heathcote, Brown &amp; Mewhort, 2002), which works better than ordinary maximum likelihood when each participant contributes few trials. Effects of a manipulation on $\\mu$, $\\sigma$ and $\\tau$ are then compared with likelihood-ratio tests or with t-tests and ANOVA on the per-participant estimates.',
        '<b>Separating shifts from tails.</b> An effect on mean response time can come from a shift of the whole distribution (larger $\\mu$) or from more slow responses (larger $\\tau$). For example, word-frequency and Stroop effects have been decomposed in this way (Balota &amp; Spieler, 1999; Heathcote, Popiel &amp; Mewhort, 1991).',
        '<b>Group distributions.</b> Vincent averaging of quantiles across participants followed by an ex-Gaussian fit describes the shape of a group’s response-time distribution (Ratcliff, 1979).',
        '<b>Method of moments.</b> Simple estimates from the sample mean, standard deviation and skewness (see Formulas) are used as starting values for numerical fitting.',
      ],
      bayesian: [
        '<b>A likelihood for response times.</b> There is no conjugate prior; the ex-Gaussian is used as a likelihood in models fitted by MCMC, for example with Stan’s <code>exp_mod_normal</code> or the brms <code>exgaussian</code> family, with regression models on $\\mu$, $\\sigma$ and $\\tau$.',
        '<b>Hierarchical models.</b> Participant-level parameters are drawn from group-level distributions, which stabilizes the estimates of $\\tau$ and $\\sigma$ when each participant contributes few trials (Farrell &amp; Ludwig, 2008).',
        '<b>Priors.</b> Typical choices are a normal prior on $\\mu$ near a plausible response time and half-normal, log-normal or gamma priors on $\\sigma$ and $\\tau$, which must be positive.',
        '<b>Posterior predictive checks.</b> Simulated response times (a normal draw plus an exponential draw) are compared with the observed quantiles, especially in the slow tail.',
      ],
      modeling: [
        '<b>Response times in cognitive psychology.</b> The standard descriptive model of response-time distributions since Hohle (1965). Larger $\\tau$, more frequent very slow responses, has been linked to lapses of attention, for example in studies of attention-deficit/hyperactivity disorder and of aging.',
        '<b>Interpretation and its limits.</b> It is tempting to read $\\mu$ as decision time and $\\tau$ as something else, but simulations from the drift-diffusion model show that each ex-Gaussian parameter mixes several underlying processes (Matzke &amp; Wagenmakers, 2009). Process models such as the drift-diffusion model, or the shifted Wald, are used when a mechanistic interpretation is needed.',
        '<b>Chromatography and spectroscopy.</b> Under the name exponentially modified Gaussian, it describes tailing peaks: a Gaussian peak from diffusion, smeared by an exponential delay (Grushka, 1972).',
        '<b>Measurement with a random delay.</b> More generally it fits any quantity that is a normally distributed time or position plus an independent exponential waiting time, such as photon arrival times measured with Gaussian timing jitter.',
      ],
    },

    references: [
      { text: 'Wikipedia: Exponentially modified Gaussian distribution.', url: 'https://en.wikipedia.org/wiki/Exponentially_modified_Gaussian_distribution' },
      { text: 'Hohle, R. H. (1965). Inferred components of reaction times as functions of foreperiod duration. <i>Journal of Experimental Psychology</i>, 69(4), 382–386.', url: 'https://doi.org/10.1037/h0021740' },
      { text: 'Ratcliff, R. (1979). Group reaction time distributions and an analysis of distribution statistics. <i>Psychological Bulletin</i>, 86(3), 446–461.', url: 'https://doi.org/10.1037/0033-2909.86.3.446' },
      { text: 'Heathcote, A., Popiel, S. J., &amp; Mewhort, D. J. K. (1991). Analysis of response time distributions: An example using the Stroop task. <i>Psychological Bulletin</i>, 109(2), 340–347.', url: 'https://doi.org/10.1037/0033-2909.109.2.340' },
      { text: 'Balota, D. A., &amp; Spieler, D. H. (1999). Word frequency, repetition, and lexicality effects in word recognition tasks: Beyond measures of central tendency. <i>Journal of Experimental Psychology: General</i>, 128(1), 32–55.', url: 'https://doi.org/10.1037/0096-3445.128.1.32' },
      { text: 'Heathcote, A., Brown, S., &amp; Mewhort, D. J. K. (2002). Quantile maximum likelihood estimation of response time distributions. <i>Psychonomic Bulletin &amp; Review</i>, 9(2), 394–401.', url: 'https://doi.org/10.3758/BF03196299' },
      { text: 'Schwarz, W. (2001). The ex-Wald distribution as a descriptive model of response times. <i>Behavior Research Methods, Instruments, &amp; Computers</i>, 33(4), 457–469.', url: 'https://doi.org/10.3758/BF03195403' },
      { text: 'Matzke, D., &amp; Wagenmakers, E.-J. (2009). Psychological interpretation of the ex-Gaussian and shifted Wald parameters: A diffusion model analysis. <i>Psychonomic Bulletin &amp; Review</i>, 16(5), 798–817.', url: 'https://doi.org/10.3758/PBR.16.5.798' },
      { text: 'Farrell, S., &amp; Ludwig, C. J. H. (2008). Bayesian and maximum likelihood estimation of hierarchical response time models. <i>Psychonomic Bulletin &amp; Review</i>, 15(6), 1209–1217.', url: 'https://doi.org/10.3758/PBR.15.6.1209' },
      { text: 'Luce, R. D. (1986). <i>Response Times: Their Role in Inferring Elementary Mental Organization</i>. Oxford University Press.' },
      { text: 'Grushka, E. (1972). Characterization of exponentially modified Gaussian peaks in chromatography. <i>Analytical Chemistry</i>, 44(11), 1733–1738.', url: 'https://doi.org/10.1021/ac60319a011' },
      { text: 'Leemis, L. M., &amp; McQueston, J. T. (2008). Univariate distribution relationships. <i>The American Statistician</i>, 62(1), 45–53.', url: 'https://doi.org/10.1198/000313008X270448' },
    ],
  },
};

function fmtN(v) { return String(Number(Number(v).toPrecision(4))).replace(/^-/, '−'); }
