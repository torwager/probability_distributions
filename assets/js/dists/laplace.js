// Laplace (double exponential) distribution with location mu and scale b.
// Follows the structure of the reference module dists/normal.js (see ARCHITECTURE.md).

import { catalogParams } from '../catalog.js';
import { normalCdf, LN_SQRT_2PI, SQRT2 } from '../core/math.js';

function pdf(x, { mu, b }) {
  return Math.exp(-Math.abs(x - mu) / b) / (2 * b);
}
function cdf(x, { mu, b }) {
  const z = (x - mu) / b;
  if (Number.isNaN(z)) return NaN;
  return z < 0 ? 0.5 * Math.exp(z) : 1 - 0.5 * Math.exp(-z);
}
function sf(x, { mu, b }) { return cdf(mu - (x - mu), { mu, b }); }
function quantile(u, { mu, b }) {
  if (u <= 0) return -Infinity;
  if (u >= 1) return Infinity;
  return u < 0.5 ? mu + b * Math.log(2 * u) : mu - b * Math.log(2 * (1 - u));
}

export default {
  id: 'laplace',
  name: 'Laplace (double exponential)',
  kind: 'continuous',
  params: catalogParams('laplace'),

  pdf,
  cdf,
  sf,
  quantile,
  sample: (rng, { mu, b }) => rng.laplace(mu, b),

  testParams: [{ mu: -3, b: 0.1 }, { mu: 7, b: 5 }, { mu: 9.5, b: 0.4 }],

  range: () => [-Infinity, Infinity],
  /** μ ± 7b holds all but about 0.1% of the probability. */
  support: ({ mu, b }) => [mu - 7 * b, mu + 7 * b],

  stats({ mu, b }) {
    return {
      mean: mu, variance: 2 * b * b, sd: SQRT2 * b, median: mu, mode: mu,
      skewness: 0, exKurtosis: 3, entropy: 1 + Math.log(2 * b),
    };
  },

  //  - a vertical line at the center μ: drag it to move the curve;
  //  - a horizontal arrow from μ to μ + b at the height f(μ + b) (37% of the peak):
  //    drag its tip to change the scale b, the mean absolute distance from the center.
  handles: [
    { type: 'vline', param: 'mu' },
    {
      type: 'hArrow', param: 'b',
      from: p => ({ x: p.mu, y: pdf(p.mu + p.b, p) }),
      to: p => ({ x: p.mu + p.b, y: pdf(p.mu + p.b, p) }),
      set: (pt, p) => ({ b: pt.x - p.mu }),
      ariaLabel: 'Scale b (mean absolute distance from the center). Drag the arrow tip, or use the arrow keys.',
    },
  ],

  explorer: {
    readouts: [
      { key: 'mean', label: 'Mean, median and mode μ' },
      { label: 'Scale b (mean |X − μ|)', value: p => p.b },
      { key: 'sd', label: 'Standard deviation √2·b' },
      { label: 'Middle 95% range', value: p => `${fmtN(quantile(0.025, p))} to ${fmtN(quantile(0.975, p))}` },
    ],
    overlays: p => {
      const s = SQRT2 * p.b;
      return [{
        id: 'normal', label: 'Normal with the same mean and variance', cls: 'curve-ref',
        pdf: x => Math.exp(-0.5 * ((x - p.mu) / s) ** 2 - LN_SQRT_2PI) / s,
        cdf: x => normalCdf((x - p.mu) / s),
      }];
    },
  },

  content: {
    summary: 'The Laplace, or double exponential, distribution is symmetric about $\\mu$, with a sharp peak there and exponential tails on both sides; the scale $b$ is the average distance from $\\mu$. A Laplace prior on regression coefficients gives the LASSO estimate as its posterior mode.',
    description: [
      'The Laplace distribution, also called the double exponential distribution, describes a continuous quantity that can take any real value and is symmetric about a center. Its density has a sharp peak at the center and falls off exponentially on both sides, like two exponential densities placed back to back. Compared with a normal distribution of the same variance, it puts more probability very close to the center and more in the tails, and less in between. Day-to-day changes in many financial and physical quantities, and the errors of measurements with occasional large mistakes, have roughly this shape.',
      'It has two parameters. The location $\\mu$ is the center, which is the mean, the median and the mode. The scale $b$ sets the spread: it is the average absolute distance of a value from $\\mu$, and the standard deviation is $\\sqrt2\\,b$. Some texts use the rate $\\lambda = 1/b$ instead.',
      'The Laplace distribution is closely tied to absolute values. Fitting a model with Laplace errors by maximum likelihood minimizes the sum of absolute errors, which makes the sample median the estimate of the center; and a Laplace prior on regression coefficients corresponds to the LASSO penalty.',
    ],
    explorerIntro: 'The left plot shows the density $f(x)$ and the right plot the cumulative distribution $F(x)$. Drag the dashed amber line to move the center $\\mu$, and drag the tip of the amber arrow to change the scale $b$. The arrow runs from $\\mu$ to $\\mu + b$ at the height of the density there, which is $1/e \\approx 37\\%$ of the peak. The dashed grey curve is a normal distribution with the same mean and variance: the Laplace curve is taller and sharper in the middle and has heavier tails.',

    pdfTex: 'f(x \\mid \\mu, b) = \\frac{1}{2b} \\exp\\!\\left( -\\frac{|x - \\mu|}{b} \\right)',
    glossary: [
      { sym: 'x', meaning: 'A possible value of the random variable $X$. It can be any real number.' },
      { sym: 'f(x \\mid \\mu, b)', meaning: 'The probability density at $x$ given the parameters. Probabilities are areas under this curve.' },
      { sym: '\\mu', meaning: 'The location: the center of the curve, which is the mean, the median and the mode.' },
      { sym: 'b', meaning: 'The scale, a positive number: the average absolute distance $\\mathrm{E}|X - \\mu|$. The standard deviation is $\\sqrt2\\,b$. (The rate $\\lambda = 1/b$ is sometimes used instead.)' },
      { sym: '|x - \\mu|', meaning: 'The absolute distance of $x$ from the center. Because the exponent uses the absolute value instead of a square, the density has a sharp point at $\\mu$.' },
      { sym: '\\exp(\\cdot)', meaning: 'The exponential function $e^{(\\cdot)}$, where $e \\approx 2.71828$ is the base of natural logarithms.' },
      { sym: '\\frac{1}{2b}', meaning: 'The normalizing constant that makes the total area 1. It is also the height of the peak.' },
    ],

    cdfTex: 'F(x \\mid \\mu, b) = P(X \\le x) = \\begin{cases} \\tfrac12 \\exp\\!\\left(\\dfrac{x - \\mu}{b}\\right) & x < \\mu \\\\[6pt] 1 - \\tfrac12 \\exp\\!\\left(-\\dfrac{x - \\mu}{b}\\right) & x \\ge \\mu \\end{cases}',
    cdfGlossary: [
      { sym: 'F(x \\mid \\mu, b)', meaning: 'The cumulative distribution function: the probability that $X$ is at most $x$, the area under the density to the left of $x$.' },
      { sym: 'P(X \\le x)', meaning: 'The probability that the random variable $X$ takes a value at most $x$.' },
      { sym: '\\mu,\\ b', meaning: 'The location and the scale, as in the density.' },
      { sym: '\\exp(\\cdot)', meaning: 'The exponential function. Below the center the CDF rises exponentially from 0 to $\\tfrac12$; above it, the remaining probability $1 - F$ shrinks exponentially.' },
    ],

    extraFormulas: [
      {
        title: 'Likelihood and least absolute deviations',
        intro: 'For independent observations $x_1, \\dots, x_n$ the log-likelihood is a constant minus the sum of absolute deviations divided by $b$. Maximizing it over $\\mu$ minimizes $\\sum |x_i - \\mu|$, so the maximum-likelihood estimate of $\\mu$ is the sample median; the estimate of $b$ is then the mean absolute deviation from the median.',
        tex: '\\ln L(\\mu, b) = -n \\ln(2b) - \\frac{1}{b} \\sum_{i=1}^{n} |x_i - \\mu|, \\qquad \\hat\\mu = \\operatorname{median}(x_i), \\quad \\hat b = \\frac1n \\sum_{i=1}^n |x_i - \\hat\\mu|',
        glossary: [
          { sym: 'L(\\mu, b)', meaning: 'The likelihood: the joint density of the observed data, viewed as a function of the parameters.' },
          { sym: 'x_i,\\ n', meaning: 'The $i$-th observation and the number of observations.' },
          { sym: '\\hat\\mu,\\ \\hat b', meaning: 'The maximum-likelihood estimates of the location and the scale.' },
        ],
      },
      {
        title: 'Normal scale mixture',
        intro: 'A Laplace variable is a normal variable whose variance is itself random, with an exponential distribution. This representation is used to fit the Bayesian lasso by Gibbs sampling.',
        tex: 'X \\mid V \\sim \\mathcal N(\\mu, V), \\quad V \\sim \\mathrm{Exp}\\!\\left(\\text{rate } \\tfrac{1}{2b^2}\\right) \\ \\Rightarrow\\ X \\sim \\mathrm{Laplace}(\\mu, b)',
        glossary: [
          { sym: 'V', meaning: 'A random variance, exponentially distributed with mean $2b^2$.' },
          { sym: '\\mathcal N(\\mu, V)', meaning: 'A normal distribution with mean $\\mu$ and variance $V$.' },
        ],
      },
    ],

    properties: [
      { name: 'Support', tex: 'x \\in (-\\infty, \\infty)', explain: 'Every real number has positive density.' },
      { name: 'Mean', tex: '\\mathrm{E}[X] = \\mu', value: p => p.mu, explain: 'The long-run average value; the curve is symmetric about $\\mu$.' },
      { name: 'Median', tex: '\\mu', value: p => p.mu, explain: 'Half of the probability lies on each side of $\\mu$.' },
      { name: 'Mode', tex: '\\mu', value: p => p.mu, explain: 'The sharp peak of the curve. The density is not differentiable there.' },
      { name: 'Variance', tex: '\\mathrm{Var}(X) = 2b^2', value: p => 2 * p.b * p.b, explain: 'Each half of the distribution is an exponential with mean $b$, whose second moment is $2b^2$.' },
      { name: 'Standard deviation', tex: '\\sqrt{2}\\,b', value: p => SQRT2 * p.b, explain: 'About $1.414\\,b$. The mean absolute deviation is $b$, so the ratio of the standard deviation to the mean absolute deviation is $\\sqrt 2$ (for a normal it is $\\sqrt{\\pi/2} \\approx 1.253$).' },
      { name: 'Skewness', tex: '0', value: () => 0, explain: 'The curve is symmetric.' },
      { name: 'Excess kurtosis', tex: '3', value: () => 3, explain: 'Positive, because the tails are heavier than those of a normal distribution with the same variance (and the peak is sharper). The kurtosis itself is 6.' },
      { name: 'Entropy', tex: '1 + \\ln(2b)', value: p => 1 + Math.log(2 * p.b), explain: 'Differential entropy in nats. Among all distributions on the real line with a given mean absolute deviation $\\mathrm{E}|X - \\mu| = b$, the Laplace has the largest entropy.' },
      { name: 'Moment-generating function', tex: 'M(t) = \\frac{e^{\\mu t}}{1 - b^2 t^2}, \\quad |t| < 1/b', explain: '$\\mathrm{E}[e^{tX}]$. It is finite only for $|t| < 1/b$ because the tails decay exponentially, not faster.' },
      { name: 'Characteristic function', tex: '\\varphi(t) = \\frac{e^{i\\mu t}}{1 + b^2 t^2}', explain: '$\\mathrm{E}[e^{itX}]$, where $i = \\sqrt{-1}$. It has the shape of a Cauchy density, and the Cauchy characteristic function has the shape of a Laplace density.' },
      { name: 'Mean absolute deviation', tex: '\\mathrm{E}|X - \\mu| = b', value: p => p.b, explain: 'The scale parameter is the average distance from the center. $|X - \\mu|$ is exponential with mean $b$.' },
      { name: 'Peak height', tex: 'f(\\mu) = \\frac{1}{2b}', value: p => 1 / (2 * p.b), explain: 'Halving $b$ doubles the height of the peak. At $\\mu \\pm b$ the density is $1/e \\approx 0.37$ of the peak height.' },
      { name: 'Quantile function', tex: 'Q(u) = \\mu - b\\,\\operatorname{sgn}(u - \\tfrac12)\\ln(1 - 2|u - \\tfrac12|)', value: p => `${fmtN(quantile(0.975, p))} (u = 0.975)`, explain: 'Here $\\operatorname{sgn}$ is the sign ($+1$ or $-1$). For $u = 0.975$ the value is $\\mu + b\\ln 20 \\approx \\mu + 3.00\\,b$, which is $2.12$ standard deviations above the mean (1.96 for a normal).' },
    ],

    limits: [
      { text: '<b>Absolute value is exponential.</b> If $X \\sim \\mathrm{Laplace}(\\mu, b)$, then $|X - \\mu|$ is exponential with rate $1/b$ (mean $b$). The Laplace distribution is an exponential distribution with a random sign, and the difference of two independent exponential variables with rate $1/b$ is $\\mathrm{Laplace}(0, b)$.', relation: 'exponential--laplace', to: 'exponential' },
      { text: '<b>Normal scale mixture.</b> A normal variable whose variance is exponentially distributed is Laplace (formula above). Allowing the mixing distribution to vary gives the wider family of normal scale mixtures, which includes Student’s $t$.', to: 'normal' },
      { text: '<b>Standard Laplace.</b> With $\\mu = 0$ and $b = 1$ the density is $\\tfrac12 e^{-|x|}$. Any Laplace variable can be standardized as $(X - \\mu)/b$.' },
      { text: '<b>Asymmetric Laplace.</b> Using different scales on the two sides gives the asymmetric Laplace distribution, whose likelihood corresponds to the check loss of quantile regression.' },
    ],

    uses: {
      frequentist: [
        '<b>Least absolute deviations (median) regression.</b> Assuming independent Laplace errors makes the maximum-likelihood fit the one that minimizes the sum of absolute residuals. The fit is less affected by outliers than least squares, and with only an intercept it gives the sample median.',
        '<b>Quantile regression.</b> Regression for the median and other quantiles (Koenker & Bassett, 1978) minimizes an asymmetric absolute loss, which is the negative log-likelihood of an asymmetric Laplace distribution.',
        '<b>Sign test.</b> For Laplace data the sign test is the locally most powerful rank test for a shift in location, and the sample median is the efficient estimator of the center; the asymptotic relative efficiency of the sign test against the t-test is 2 here, compared with $2/\\pi \\approx 0.64$ for normal data.',
        '<b>Robustness checks.</b> The Laplace is a standard heavy-tailed alternative in simulation studies of tests and estimators, because it has finite variance but more extreme values than the normal.',
      ],
      bayesian: [
        '<b>Laplace prior and the LASSO.</b> Independent Laplace priors with scale $b$ on regression coefficients add the penalty $\\sum_j |\\beta_j|/b$ to the negative log-posterior. The posterior mode is therefore the LASSO estimate (Tibshirani, 1996), which sets small coefficients exactly to zero.',
        '<b>Bayesian lasso.</b> Park and Casella (2008) write the Laplace prior as a normal scale mixture with exponential mixing variances, which gives a simple Gibbs sampler. The posterior mean is not sparse; for strong shrinkage of noise coefficients with little shrinkage of large ones, the horseshoe prior is usually preferred.',
        '<b>Conjugate prior for the scale.</b> With known $\\mu$, the likelihood for $b$ is proportional to $b^{-n}\\exp(-S/b)$ with $S = \\sum|x_i - \\mu|$. An inverse-gamma prior $b \\sim \\mathrm{InvGamma}(\\alpha, \\beta)$ (shape $\\alpha$, scale $\\beta$) is therefore conjugate, with posterior $\\mathrm{InvGamma}(\\alpha + n,\\ \\beta + S)$. There is no conjugate prior for $\\mu$.',
        '<b>Bayesian quantile regression.</b> An asymmetric Laplace likelihood gives a working posterior for regression quantiles (Yu & Moyeed, 2001).',
      ],
      modeling: [
        '<b>Differential privacy.</b> The Laplace mechanism adds $\\mathrm{Laplace}(0, \\Delta/\\varepsilon)$ noise to a published statistic, where $\\Delta$ is how much one person’s data can change the statistic and $\\varepsilon$ is the privacy budget (Dwork et al., 2006).',
        '<b>Sparse coding and signal processing.</b> Wavelet coefficients of natural images, speech and other signals have sharp-peaked, heavy-tailed distributions that are often modeled as Laplace. Sparse coding models of visual cortex use Laplace-like priors on neural activity.',
        '<b>Finance and growth rates.</b> Daily changes in log prices and growth rates of firms often have a Laplace-like (tent-shaped on a log scale) distribution.',
        '<b>Error models.</b> A Laplace error term makes a model penalize large prediction errors linearly instead of quadratically, which is useful when a few observations are badly off.',
      ],
    },

    references: [
      { text: 'Wikipedia: Laplace distribution.', url: 'https://en.wikipedia.org/wiki/Laplace_distribution' },
      { text: 'Kotz, S., Kozubowski, T. J., & Podgórski, K. (2001). <i>The Laplace Distribution and Generalizations</i>. Birkhäuser.', url: 'https://doi.org/10.1007/978-1-4612-0173-1' },
      { text: 'Johnson, N. L., Kotz, S., & Balakrishnan, N. (1995). <i>Continuous Univariate Distributions</i>, Vol. 2 (2nd ed.), Chapter 24. Wiley.' },
      { text: 'Park, T., & Casella, G. (2008). The Bayesian lasso. <i>Journal of the American Statistical Association</i>, 103(482), 681–686.', url: 'https://doi.org/10.1198/016214508000000337' },
      { text: 'Tibshirani, R. (1996). Regression shrinkage and selection via the lasso. <i>Journal of the Royal Statistical Society B</i>, 58(1), 267–288.' },
      { text: 'Gelman, A., Carlin, J. B., Stern, H. S., Dunson, D. B., Vehtari, A., & Rubin, D. B. (2013). <i>Bayesian Data Analysis</i> (3rd ed.), Appendix A. CRC Press.', url: 'http://www.stat.columbia.edu/~gelman/book/' },
      { text: 'Leemis, L. M., & McQueston, J. T. (2008). Univariate distribution relationships. <i>The American Statistician</i>, 62(1), 45–53.', url: 'https://doi.org/10.1198/000313008X270448' },
    ],
  },
};

function fmtN(v) { return String(Number(v.toPrecision(4))).replace(/^-/, '−'); }
