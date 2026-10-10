// Normal (Gaussian) distribution — the REFERENCE distribution module.
// Every other module in assets/js/dists/ follows this structure. See ARCHITECTURE.md.

import { catalogParams } from '../catalog.js';
import { normalCdf, normalQuantile, LN_SQRT_2PI, PI } from '../core/math.js';

// density written once so that handles and stats can reuse it
function pdf(x, { mu, sigma }) {
  const z = (x - mu) / sigma;
  return Math.exp(-0.5 * z * z - LN_SQRT_2PI) / sigma;
}

export default {
  id: 'normal',
  name: 'Normal (Gaussian)',
  kind: 'continuous',

  // Parameter specs come from the catalog (sym, key, name, meaning, domain, default, min, max, integer).
  // Here they are used as is; a module may override fields, e.g. catalogParams('normal', { sigma: { step: 0.05 } }).
  params: catalogParams('normal'),

  pdf,
  cdf: (x, { mu, sigma }) => normalCdf((x - mu) / sigma),
  sf: (x, { mu, sigma }) => normalCdf(-(x - mu) / sigma),        // optional: accurate upper tail 1 - F(x)
  quantile: (u, { mu, sigma }) => mu + sigma * normalQuantile(u),
  sample: (rng, { mu, sigma }) => rng.normal(mu, sigma),

  /** Extra parameter sets checked by the node tests (defaults are always checked). */
  testParams: [{ mu: -3, sigma: 0.25 }, { mu: 7, sigma: 4 }],

  /** True support (may be infinite). */
  range: () => [-Infinity, Infinity],
  /** Finite plotting window. */
  support: ({ mu, sigma }) => [mu - 4.5 * sigma, mu + 4.5 * sigma],

  stats({ mu, sigma }) {
    return {
      mean: mu, variance: sigma * sigma, sd: sigma, median: mu, mode: mu,
      skewness: 0, exKurtosis: 0, entropy: 0.5 * Math.log(2 * PI * Math.E * sigma * sigma),
    };
  },

  // Drag handles. Amber = draggable.
  //  - a vertical line at the mean: drag it left or right to move the curve (sets mu);
  //  - a horizontal arrow from mu to mu + sigma at the height of the inflection points:
  //    drag its tip to change the standard deviation (sets sigma).
  handles: [
    { type: 'vline', param: 'mu' },
    {
      type: 'hArrow', param: 'sigma',
      from: p => ({ x: p.mu, y: pdf(p.mu + p.sigma, p) }),
      to: p => ({ x: p.mu + p.sigma, y: pdf(p.mu + p.sigma, p) }),
      // set() receives the pointer position in data units; the default for hArrow is
      // { sigma: pt.x - from(p).x }, written out here for clarity
      set: (pt, p) => ({ sigma: pt.x - p.mu }),
    },
  ],

  explorer: {
    readouts: [
      { key: 'mean', label: 'Mean μ' },
      { key: 'sd', label: 'Standard deviation σ' },
      { key: 'variance', label: 'Variance σ²' },
      { label: 'Middle 95% range', value: p => `${fmtN(p.mu - 1.95996 * p.sigma)} to ${fmtN(p.mu + 1.95996 * p.sigma)}` },
    ],
  },

  content: {
    description: [
      'The normal distribution is the familiar symmetric bell curve. It describes a continuous quantity that can take any real value, with values near the center most likely and values far from it increasingly rare. It has two parameters: the mean $\\mu$, which sets where the center is, and the standard deviation $\\sigma$, which sets how spread out the values are.',
      'It is the most widely used distribution in statistics. One reason is the central limit theorem: a sum or average of many small independent effects is approximately normal, whatever the distribution of the individual effects. Measurement errors, sample means and many estimators therefore behave approximately normally.',
    ],
    explorerIntro: 'The left plot shows the density $f(x)$ and the right plot the cumulative distribution $F(x)$. Drag the dashed amber line to move the mean $\\mu$, and drag the tip of the amber arrow to change the standard deviation $\\sigma$. The arrow runs from $\\mu$ to $\\mu+\\sigma$ at the height where the curve changes from bending down to bending up (the inflection point).',

    pdfTex: 'f(x \\mid \\mu, \\sigma) = \\frac{1}{\\sigma\\sqrt{2\\pi}} \\exp\\!\\left( -\\frac{(x-\\mu)^2}{2\\sigma^2} \\right)',
    glossary: [
      { sym: 'x', meaning: 'A possible value of the random variable $X$. It can be any real number.' },
      { sym: 'f(x \\mid \\mu, \\sigma)', meaning: 'The probability density at $x$ given the parameters. Densities are not probabilities; probabilities are areas under the density curve.' },
      { sym: '\\mu', meaning: 'The mean: the center of the curve. It is also the median and the mode.' },
      { sym: '\\sigma', meaning: 'The standard deviation: the typical distance of values from the mean. It must be positive. Its square $\\sigma^2$ is the variance.' },
      { sym: '\\pi', meaning: 'The constant 3.14159…, the ratio of a circle’s circumference to its diameter.' },
      { sym: '\\exp(\\cdot)', meaning: 'The exponential function $e^{(\\cdot)}$, where $e \\approx 2.71828$ is the base of natural logarithms.' },
      { sym: '\\frac{1}{\\sigma\\sqrt{2\\pi}}', meaning: 'The normalizing constant. It makes the total area under the curve equal to 1, and it is the height of the peak.' },
      { sym: '\\frac{(x-\\mu)^2}{2\\sigma^2}', meaning: 'Half the squared distance of $x$ from the mean, measured in units of $\\sigma$. The density falls off quickly as this grows.' },
    ],

    cdfTex: 'F(x \\mid \\mu, \\sigma) = P(X \\le x) = \\Phi\\!\\left(\\frac{x-\\mu}{\\sigma}\\right) = \\frac12\\left[1 + \\operatorname{erf}\\!\\left(\\frac{x-\\mu}{\\sigma\\sqrt2}\\right)\\right]',
    cdfGlossary: [
      { sym: 'F(x \\mid \\mu, \\sigma)', meaning: 'The cumulative distribution function: the probability that $X$ is less than or equal to $x$. It equals the area under the density to the left of $x$.' },
      { sym: 'P(X \\le x)', meaning: 'The probability that the random variable $X$ takes a value at most $x$.' },
      { sym: 'z = \\frac{x-\\mu}{\\sigma}', meaning: 'The z-score: how many standard deviations $x$ lies above the mean (negative if below).' },
      { sym: '\\Phi(z)', meaning: 'The CDF of the standard normal distribution (mean 0, standard deviation 1). It has no formula in elementary functions and is computed numerically or read from a z-table.' },
      { sym: '\\operatorname{erf}(u)', meaning: 'The error function, $\\operatorname{erf}(u) = \\frac{2}{\\sqrt\\pi}\\int_0^u e^{-t^2}\\,dt$. It is the standard numerical route to $\\Phi$.' },
    ],

    properties: [
      { name: 'Support', tex: 'x \\in (-\\infty, \\infty)', explain: 'Every real number has positive density, although values more than a few standard deviations from the mean are very rare.' },
      { name: 'Mean', tex: '\\mathrm{E}[X] = \\mu', value: p => p.mu, explain: 'The long-run average value.' },
      { name: 'Median', tex: '\\mu', value: p => p.mu, explain: 'Half of the probability lies on each side of the mean, because the curve is symmetric.' },
      { name: 'Mode', tex: '\\mu', value: p => p.mu, explain: 'The most likely value: the peak of the curve.' },
      { name: 'Variance', tex: '\\mathrm{Var}(X) = \\sigma^2', value: p => p.sigma * p.sigma, explain: 'The average squared distance from the mean.' },
      { name: 'Standard deviation', tex: '\\sigma', value: p => p.sigma, explain: 'The square root of the variance, in the same units as $x$.' },
      { name: 'Skewness', tex: '0', value: () => 0, explain: 'The curve is symmetric, so it leans neither left nor right.' },
      { name: 'Excess kurtosis', tex: '0', value: () => 0, explain: 'Kurtosis measures how heavy the tails are. The normal is the reference point, so its excess kurtosis is 0 by definition; heavier-tailed distributions such as Student’s t have positive excess kurtosis.' },
      { name: 'Peak height', tex: 'f(\\mu) = \\frac{1}{\\sigma\\sqrt{2\\pi}}', value: p => 1 / (p.sigma * Math.sqrt(2 * PI)), explain: 'Halving $\\sigma$ doubles the height of the peak, because the total area must stay 1.' },
      { name: 'Inflection points', tex: '\\mu \\pm \\sigma', value: p => `${fmtN(p.mu - p.sigma)}, ${fmtN(p.mu + p.sigma)}`, explain: 'Where the curve changes from bending downward to bending upward. Their height is $e^{-1/2} \\approx 0.61$ times the peak height.' },
      { name: '68–95–99.7 rule', tex: 'P(|X-\\mu| \\le k\\sigma) = 0.683,\\ 0.954,\\ 0.997', value: p => `${fmtN(p.mu - 2 * p.sigma)} to ${fmtN(p.mu + 2 * p.sigma)}`, explain: 'About 68% of values lie within one standard deviation of the mean, 95% within two and 99.7% within three. The value column shows the two-standard-deviation range $\\mu \\pm 2\\sigma$.' },
      { name: 'Quantiles', tex: 'Q(u) = \\mu + \\sigma\\,\\Phi^{-1}(u)', value: p => `${fmtN(p.mu + 1.959964 * p.sigma)} (u = 0.975)`, explain: 'The value below which a fraction $u$ of the distribution lies. For $u = 0.975$, $\\Phi^{-1}(u) \\approx 1.96$, which gives the familiar 95% interval $\\mu \\pm 1.96\\sigma$.' },
      { name: 'Entropy', tex: '\\tfrac12 \\ln(2\\pi e \\sigma^2)', value: p => 0.5 * Math.log(2 * PI * Math.E * p.sigma * p.sigma), explain: 'Differential entropy in nats. Among all distributions with a given variance, the normal has the largest entropy, so it is the least informative (most spread-out) choice when only the mean and variance are known.' },
      { name: 'Moment-generating function', tex: 'M(t) = \\exp\\!\\left(\\mu t + \\tfrac12 \\sigma^2 t^2\\right)', explain: '$\\mathrm{E}[e^{tX}]$. Its derivatives at $t = 0$ give the moments, and multiplying MGFs shows that sums of independent normal variables are normal.' },
      { name: 'Characteristic function', tex: '\\varphi(t) = \\exp\\!\\left(i\\mu t - \\tfrac12 \\sigma^2 t^2\\right)', explain: '$\\mathrm{E}[e^{itX}]$, where $i = \\sqrt{-1}$. It exists for every distribution and is the main tool for proving the central limit theorem.' },
    ],

    limits: [
      { text: '<b>Central limit theorem.</b> If $X_1, \\dots, X_n$ are independent with the same distribution, mean $\\mu$ and finite variance $\\sigma^2$, then $\\sqrt{n}(\\bar X - \\mu)/\\sigma \\xrightarrow{d} \\mathcal N(0,1)$ as $n \\to \\infty$. This is why so many statistics are approximately normal.' },
      { text: '<b>Binomial to normal.</b> For large $n$ and fixed $p$, $\\mathrm{Bin}(n,p)$ is approximately $\\mathcal N(np,\\ np(1-p))$ (de Moivre–Laplace).', relation: 'binomial--normal', to: 'binomial' },
      { text: '<b>Poisson to normal.</b> For large $\\lambda$, $\\mathrm{Poisson}(\\lambda)$ is approximately $\\mathcal N(\\lambda, \\lambda)$.', relation: 'poisson--normal', to: 'poisson' },
      { text: '<b>Hypergeometric to normal.</b> When the population, the number of successes and the sample are all large, the hypergeometric count is approximately normal (with the finite-population correction).', relation: 'hypergeometric--normal', to: 'hypergeometric' },
      { text: '<b>Student’s t to normal.</b> As the degrees of freedom $\\nu \\to \\infty$, $t_\\nu$ approaches the standard normal $\\mathcal N(0,1)$.', relation: 'normal--student-t', to: 'student-t' },
      { text: '<b>Gamma and chi-squared to normal.</b> As the shape $\\alpha \\to \\infty$, a Gamma($\\alpha$, $\\beta$) variable standardized as $(X - \\alpha/\\beta)/(\\sqrt\\alpha/\\beta)$ approaches $\\mathcal N(0,1)$; likewise $(\\chi^2_k - k)/\\sqrt{2k} \\to \\mathcal N(0,1)$ as $k \\to \\infty$.', to: 'gamma' },
      { text: '<b>Von Mises to normal.</b> A highly concentrated von Mises distribution of angles is approximately $\\mathcal N(\\mu, 1/\\kappa)$.', relation: 'von-mises--normal', to: 'von-mises' },
      { text: '<b>Standard normal.</b> With $\\mu = 0$ and $\\sigma = 1$ the distribution is called the standard normal, written $Z$. Any normal variable can be standardized: $Z = (X - \\mu)/\\sigma$.' },
      { text: '<b>Sums stay normal.</b> If $X \\sim \\mathcal N(\\mu_1, \\sigma_1^2)$ and $Y \\sim \\mathcal N(\\mu_2, \\sigma_2^2)$ are independent, then $X + Y \\sim \\mathcal N(\\mu_1 + \\mu_2,\\ \\sigma_1^2 + \\sigma_2^2)$, and $aX + b \\sim \\mathcal N(a\\mu_1 + b,\\ a^2\\sigma_1^2)$.' },
      { text: '<b>One dimension of the multivariate normal.</b> The multivariate normal with $d = 1$ is the normal, and every margin and every weighted sum of a multivariate normal vector is normal.', relation: 'normal--multivariate-normal', to: 'multivariate-normal' },
    ],

    uses: {
      frequentist: [
        '<b>z-tests and confidence intervals.</b> When the standard deviation is known, or the sample is large, the standardized sample mean $(\\bar x - \\mu_0)/(\\sigma/\\sqrt n)$ is compared with the standard normal. The 95% interval $\\bar x \\pm 1.96\\,\\sigma/\\sqrt n$ comes from the normal quantiles.',
        '<b>Large-sample tests for proportions.</b> The z-test for a proportion and for a difference of proportions use the normal approximation to the binomial.',
        '<b>t-tests, ANOVA and regression.</b> These assume normally distributed errors. Under that assumption the t and F statistics have exact Student’s t and F distributions, which is where those distributions come from.',
        '<b>Least squares.</b> Ordinary least squares is the maximum-likelihood estimate when errors are independent and normal with equal variance.',
        '<b>Wald tests and standard errors.</b> Maximum-likelihood estimates are approximately normal in large samples, with variance given by the inverse Fisher information. This justifies the usual estimate $\\pm$ 1.96 standard errors intervals and Wald z-tests in generalized linear models.',
        '<b>Checking normality.</b> Normal Q–Q plots and tests such as Shapiro–Wilk compare data with the normal distribution.',
      ],
      bayesian: [
        '<b>Conjugate prior for a mean.</b> With normal data of known variance $\\sigma^2$ and a prior $\\mu \\sim \\mathcal N(\\mu_0, \\tau_0^2)$, the posterior is normal with precision $1/\\tau_n^2 = 1/\\tau_0^2 + n/\\sigma^2$ and mean $\\mu_n = \\tau_n^2(\\mu_0/\\tau_0^2 + n\\bar x/\\sigma^2)$: a precision-weighted average of the prior mean and the sample mean.',
        '<b>Unknown mean and variance.</b> The normal–inverse-gamma prior is conjugate; the marginal posterior of $\\mu$ is then a Student’s t distribution.',
        '<b>Priors on regression coefficients.</b> Normal priors shrink coefficients toward zero; the posterior mode equals ridge regression. In hierarchical (multilevel) models, group-level effects are usually given a normal distribution.',
        '<b>Normal approximations to posteriors.</b> In large samples the posterior is approximately normal around its mode (the Bernstein–von Mises theorem). The Laplace approximation and Gaussian variational inference use this.',
      ],
      modeling: [
        '<b>Signal detection theory.</b> The equal-variance Gaussian model assumes that internal evidence on noise and signal trials is normal with means $0$ and $d\'$; hit and false-alarm rates are areas under these curves.',
        '<b>Evidence accumulation.</b> Drift-diffusion models add normally distributed increments of evidence over time (Brownian motion); the time to reach a boundary has a Wald distribution.',
        '<b>Perception and cue combination.</b> Bayesian observer models often treat sensory measurements as normal; combining two cues then weights each by its precision $1/\\sigma^2$.',
        '<b>Kalman filters and Gaussian processes.</b> Tracking a hidden state over time (Kalman filter) and modeling unknown smooth functions (Gaussian processes) both rely on normal distributions being closed under linear operations and conditioning.',
        '<b>Psychometric functions and probit models.</b> The normal CDF $\\Phi$ is used as an S-shaped psychometric function and as the probit link for binary responses.',
        '<b>Simulation.</b> Normal random numbers are generated from uniform ones, for example with the Box–Muller transform, and are the building block for simulating many other distributions.',
      ],
    },

    references: [
      { text: 'Wikipedia: Normal distribution.', url: 'https://en.wikipedia.org/wiki/Normal_distribution' },
      { text: 'Wikipedia: 68–95–99.7 rule.', url: 'https://en.wikipedia.org/wiki/68%E2%80%9395%E2%80%9399.7_rule' },
      { text: 'Casella, G., & Berger, R. L. (2002). <i>Statistical Inference</i> (2nd ed.), Section 3.3. Duxbury.' },
      { text: 'Gelman, A., Carlin, J. B., Stern, H. S., Dunson, D. B., Vehtari, A., & Rubin, D. B. (2013). <i>Bayesian Data Analysis</i> (3rd ed.), Chapters 2–3 and Appendix A. CRC Press.', url: 'http://www.stat.columbia.edu/~gelman/book/' },
      { text: 'Johnson, N. L., Kotz, S., & Balakrishnan, N. (1994). <i>Continuous Univariate Distributions</i>, Vol. 1 (2nd ed.), Chapter 13. Wiley.' },
      { text: 'Leemis, L. M., & McQueston, J. T. (2008). Univariate distribution relationships. <i>The American Statistician</i>, 62(1), 45–53.', url: 'https://doi.org/10.1198/000313008X270448' },
      { text: 'NIST Digital Library of Mathematical Functions, Chapter 7 (error functions).', url: 'https://dlmf.nist.gov/7' },
    ],
  },
};

function fmtN(v) { return String(Number(v.toPrecision(4))).replace(/^-/, '−'); }
