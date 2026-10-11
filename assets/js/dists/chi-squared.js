// Chi-squared distribution with k degrees of freedom (= Gamma(k/2, rate 1/2)).
// Follows the structure of the reference module dists/normal.js (see ARCHITECTURE.md).
// The explorer adds a "Hypothesis test" box (testExplorer, shared with the t and F pages).

import { catalogParams } from '../catalog.js';
import { lgamma, digamma, gammaP, gammaQ, gammaPinv, normalCdf, normalPdf, LN2 } from '../core/math.js';
import { testExplorer } from './student-t.js';

function pdf(x, { k }) {
  if (x < 0) return 0;
  if (x === 0) return k < 2 ? Infinity : k === 2 ? 0.5 : 0;
  return Math.exp((k / 2 - 1) * Math.log(x) - x / 2 - (k / 2) * LN2 - lgamma(k / 2));
}
const cdf = (x, { k }) => (x <= 0 ? 0 : gammaP(k / 2, x / 2));
const sf = (x, { k }) => (x <= 0 ? 1 : gammaQ(k / 2, x / 2));
const quantile = (u, { k }) => 2 * gammaPinv(k / 2, u);

function stats({ k }) {
  return {
    mean: k, variance: 2 * k, sd: Math.sqrt(2 * k),
    median: quantile(0.5, { k }),
    mode: Math.max(k - 2, 0),
    skewness: Math.sqrt(8 / k),
    exKurtosis: 12 / k,
    entropy: k / 2 + LN2 + lgamma(k / 2) + (1 - k / 2) * digamma(k / 2),
  };
}

export default {
  id: 'chi-squared',
  name: 'Chi-squared',
  kind: 'continuous',

  params: catalogParams('chi-squared', { k: { log: true } }),

  pdf,
  cdf,
  sf,
  quantile,
  sample: (rng, { k }) => rng.chiSquared(k),

  testParams: [{ k: 1 }, { k: 2 }, { k: 4 }, { k: 10 }, { k: 50 }],

  range: () => [0, Infinity],
  // from 0 (or a little below the 0.05th percentile for large k) to the 99.95th percentile
  support: p => {
    const a = quantile(0.0005, p), b = quantile(0.9995, p);
    return [Math.max(0, a - 0.15 * (b - a)), b];
  },

  stats,

  // a dashed line at the mean, which equals k: drag it to change the degrees of freedom
  handles: [
    { type: 'vline', param: 'k', x: p => p.k, set: pt => ({ k: pt.x }), label: 'k',
      ariaLabel: 'Degrees of freedom k, which is also the mean. Drag left or right, or use the arrow keys.' },
  ],

  explorer: {
    overlays: p => {
      const m = p.k, s = Math.sqrt(2 * p.k);
      return [{ id: 'normal', label: 'Normal approximation N(k, 2k)', pdf: x => normalPdf((x - m) / s) / s, cdf: x => normalCdf((x - m) / s), cls: 'curve-ref' }];
    },
    areaDefault: p => quantile(0.9, p),
    // k = 1 has an infinite (but integrable) spike at 0; cap the y axis
    yMax: p => (p.k === 1 ? 1.1 : undefined),
    readouts: [
      { key: 'mean', label: 'Mean k' },
      { key: 'sd', label: 'Standard deviation √(2k)' },
      { key: 'mode', label: 'Mode' },
      { label: 'Upper 5% critical value', value: p => quantile(0.95, p) },
    ],
  },

  customExplorer(container, ctx) {
    return testExplorer(container, ctx, {
      stat: 'χ²',
      sides: [{ value: 'upper', label: 'Upper tail' }, { value: 'two', label: 'Two-sided' }, { value: 'lower', label: 'Lower tail' }],
      defaultSide: 'upper',
      sideText: { upper: 'Upper-tail test', two: 'Equal-tailed two-sided test', lower: 'Lower-tail test' },
    });
  },

  content: {
    summary: 'The chi-squared distribution with $k$ degrees of freedom is the distribution of a sum of $k$ squared independent standard normal variables. It is the reference distribution for the sample variance of normal data, Pearson’s chi-squared tests and likelihood-ratio tests.',
    description: [
      'The chi-squared distribution with $k$ degrees of freedom is the distribution of a sum of squares of $k$ independent standard normal variables, $Z_1^2 + \\dots + Z_k^2$. For example, if a dart lands at a point whose horizontal and vertical errors are independent standard normal variables, its squared distance from the target has a chi-squared distribution with $k = 2$. A chi-squared variable takes non-negative values.',
      'Its one parameter, the degrees of freedom $k$, is the number of independent squared normal terms. The mean is $k$ and the variance is $2k$. With small $k$ the distribution is strongly skewed to the right; as $k$ grows it becomes more symmetric and approaches a normal distribution.',
      'Sums of squared deviations behave like sums of squared normals, so the chi-squared distribution is the reference distribution for the sample variance of normal data, for Pearson’s goodness-of-fit and independence tests, and for likelihood-ratio tests. It is the gamma distribution with shape $k/2$ and rate $1/2$.',
    ],
    explorerIntro: 'The left plot shows the density $f(x)$ (solid) together with the normal distribution that has the same mean $k$ and variance $2k$ (dashed); the right plot shows the two CDFs. Drag the dashed amber line, which sits at the mean, to change the degrees of freedom $k$ (a whole number). Most chi-squared tests reject the null hypothesis for large values, so under <b>Hypothesis test</b> the upper-tail critical value and rejection region are shown first; the two-sided and lower-tail options are used for tests about a normal variance. Turn on the area tool and drag its marker to an observed statistic to read off its p-value.',

    pdfTex: 'f(x \\mid k) = \\frac{1}{2^{k/2}\\,\\Gamma(k/2)}\\; x^{k/2 - 1}\\, e^{-x/2}, \\qquad x \\ge 0',
    glossary: [
      { sym: 'x', meaning: 'A possible value of the chi-squared variable, a non-negative number (positive when $k = 1$).' },
      { sym: 'f(x \\mid k)', meaning: 'The probability density at $x$ for $k$ degrees of freedom.' },
      { sym: 'k', meaning: 'The degrees of freedom: the number of independent squared standard normal variables that are added. On this page a whole number from 1 to 50.' },
      { sym: '\\Gamma(\\cdot)', meaning: 'The gamma function, which extends the factorial: $\\Gamma(n) = (n-1)!$ for whole numbers and $\\Gamma(\\tfrac12) = \\sqrt\\pi$.' },
      { sym: '2^{k/2}\\,\\Gamma(k/2)', meaning: 'The normalizing constant, which makes the total area under the curve equal to 1.' },
      { sym: 'x^{k/2-1}', meaning: 'Sets the shape near 0: for $k = 1$ the density is infinite at 0, for $k = 2$ it starts at $\\tfrac12$, and for $k \\ge 3$ it starts at 0 and rises to a peak at $k - 2$.' },
      { sym: 'e^{-x/2}', meaning: 'Exponential decay of the right tail; $e \\approx 2.71828$ is the base of natural logarithms.' },
    ],

    cdfTex: 'F(x \\mid k) = P(k/2,\\, x/2) = \\frac{\\gamma(k/2,\\, x/2)}{\\Gamma(k/2)}',
    cdfGlossary: [
      { sym: 'F(x \\mid k)', meaning: 'The cumulative distribution function: the probability that the chi-squared variable is at most $x$. One minus it, $1 - F(x \\mid k)$, is the p-value of an upper-tail test with observed statistic $x$.' },
      { sym: 'P(a, z)', meaning: 'The regularized lower incomplete gamma function, the CDF of a $\\mathrm{Gamma}(a, 1)$ variable at $z$. It has no elementary formula for odd $k$ and is computed numerically (series and continued fractions).' },
      { sym: '\\gamma(a, z)', meaning: 'The lower incomplete gamma function $\\int_0^z t^{a-1} e^{-t}\\,dt$, the gamma-function integral stopped at $z$.' },
      { sym: '\\Gamma(a)', meaning: 'The complete gamma function, the same integral taken to infinity.' },
      { sym: 'k, x', meaning: 'The degrees of freedom and the point at which the CDF is evaluated.' },
    ],
    cdfIntro: 'For $k = 2$ the CDF is $1 - e^{-x/2}$, and for any even $k$ it is $1 - e^{-x/2}\\sum_{j=0}^{k/2-1} (x/2)^j / j!$, a Poisson tail probability. In general it is written with the incomplete gamma function.',

    extraFormulas: [
      {
        title: 'The sample variance of normal data',
        intro: 'For $n$ independent values from $\\mathcal N(\\mu, \\sigma^2)$, the scaled sample variance has a chi-squared distribution with $n - 1$ degrees of freedom (one is lost by estimating the mean). Inverting this gives a confidence interval for $\\sigma^2$.',
        tex: '\\frac{(n-1)s^2}{\\sigma^2} \\sim \\chi^2_{n-1}, \\qquad \\left[\\frac{(n-1)s^2}{\\chi^2_{n-1,\\,1-\\alpha/2}},\\ \\frac{(n-1)s^2}{\\chi^2_{n-1,\\,\\alpha/2}}\\right]',
        glossary: [
          { sym: 's^2', meaning: 'The sample variance, $\\frac{1}{n-1}\\sum_i (x_i - \\bar x)^2$.' },
          { sym: '\\sigma^2', meaning: 'The true variance of the normal population.' },
          { sym: 'n', meaning: 'The sample size.' },
          { sym: '\\chi^2_{n-1,\\,q}', meaning: 'The $q$ quantile of the chi-squared distribution with $n - 1$ degrees of freedom.' },
          { sym: '\\alpha', meaning: 'One minus the confidence level, for example 0.05 for a 95% interval.' },
        ],
      },
      {
        title: 'Pearson’s chi-squared statistic',
        intro: 'Compares observed counts with the counts expected under a hypothesis. In large samples it is approximately chi-squared (see the relationship with the multinomial distribution).',
        tex: 'X^2 = \\sum_{j=1}^{K} \\frac{(O_j - E_j)^2}{E_j} \\;\\approx\\; \\chi^2_{K-1-m}',
        glossary: [
          { sym: 'O_j, E_j', meaning: 'The observed and expected counts in category $j$.' },
          { sym: 'K', meaning: 'The number of categories. For an $r \\times c$ table tested for independence the degrees of freedom are $(r-1)(c-1)$.' },
          { sym: 'm', meaning: 'The number of parameters estimated from the data to compute the expected counts (0 if the hypothesis fixes them).' },
        ],
      },
      {
        title: 'Likelihood-ratio tests (Wilks’ theorem)',
        intro: 'When a simpler model is nested inside a larger one and the simpler model is true, twice the log of the likelihood ratio is approximately chi-squared in large samples.',
        tex: 'G^2 = -2 \\ln \\Lambda = 2\\left[\\ell(\\hat\\theta_1) - \\ell(\\hat\\theta_0)\\right] \\;\\approx\\; \\chi^2_{d}',
        glossary: [
          { sym: '\\Lambda', meaning: 'The ratio of the maximized likelihoods of the simpler and the larger model.' },
          { sym: '\\ell(\\hat\\theta_1), \\ell(\\hat\\theta_0)', meaning: 'The maximized log-likelihoods of the larger and the simpler model; $\\hat\\theta$ denotes the maximum-likelihood estimates.' },
          { sym: 'd', meaning: 'The number of parameters fixed by the simpler model (the difference in the number of free parameters).' },
        ],
      },
    ],

    properties: [
      { name: 'Support', tex: 'x \\in [0, \\infty)', explain: 'Sums of squares cannot be negative. For $k = 1$ the value 0 itself has infinite density but zero probability.' },
      { name: 'Mean', tex: '\\mathrm{E}[X] = k', value: p => p.k, explain: 'Each squared standard normal has mean 1, so the sum of $k$ of them has mean $k$.' },
      { name: 'Median', tex: '\\approx k\\left(1 - \\frac{2}{9k}\\right)^3', value: p => stats(p).median, explain: 'No closed form; the value column is computed numerically. The Wilson–Hilferty formula shown is accurate to a few decimals even for small $k$. The median is below the mean because of the right skew.' },
      { name: 'Mode', tex: '\\max(k - 2,\\ 0)', value: p => stats(p).mode, explain: 'The peak of the density. For $k \\le 2$ the density is highest at 0.' },
      { name: 'Variance', tex: '\\mathrm{Var}(X) = 2k', value: p => 2 * p.k, explain: 'Each squared standard normal has variance 2, and variances of independent terms add.' },
      { name: 'Standard deviation', tex: '\\sqrt{2k}', value: p => Math.sqrt(2 * p.k), explain: 'Grows like $\\sqrt k$, more slowly than the mean, so the distribution becomes relatively narrower as $k$ grows.' },
      { name: 'Skewness', tex: '\\sqrt{8/k}', value: p => Math.sqrt(8 / p.k), explain: 'Always positive (a long right tail), and shrinking toward 0 as $k$ grows.' },
      { name: 'Excess kurtosis', tex: '12/k', value: p => 12 / p.k, explain: 'Heavier tails than a normal for small $k$, approaching the normal value 0 as $k$ grows.' },
      { name: 'Entropy', tex: '\\frac{k}{2} + \\ln\\!\\left(2\\,\\Gamma\\!\\left(\\tfrac{k}{2}\\right)\\right) + \\left(1 - \\tfrac{k}{2}\\right)\\psi\\!\\left(\\tfrac{k}{2}\\right)', value: p => stats(p).entropy, explain: 'Differential entropy in nats; $\\psi$ is the digamma function, the derivative of $\\ln \\Gamma$.' },
      { name: 'Moment-generating function', tex: 'M(t) = (1 - 2t)^{-k/2}, \\quad t < \\tfrac12', explain: '$\\mathrm{E}[e^{tX}]$. The product of $k$ copies of the MGF of one squared normal, $(1-2t)^{-1/2}$; multiplying MGFs shows that independent chi-squared variables add up: $\\chi^2_a + \\chi^2_b \\sim \\chi^2_{a+b}$.' },
      { name: 'Characteristic function', tex: '\\varphi(t) = (1 - 2it)^{-k/2}', explain: '$\\mathrm{E}[e^{itX}]$, where $i = \\sqrt{-1}$.' },
      { name: 'Upper 5% critical value', tex: '\\chi^2_{k,\\,0.95} = F^{-1}(0.95)', value: p => quantile(0.95, p), explain: 'An upper-tail test at $\\alpha = 0.05$ rejects when the statistic exceeds this value: 3.841 for $k = 1$ (which is $1.960^2$), 5.991 for $k = 2$, 7.815 for $k = 3$, 9.488 for $k = 4$ and 18.31 for $k = 10$.' },
      { name: 'Wilson–Hilferty approximation', tex: '\\left(\\frac{X}{k}\\right)^{1/3} \\approx \\mathcal N\\!\\left(1 - \\frac{2}{9k},\\ \\frac{2}{9k}\\right)', value: p => { const z = 1.644854, c = 2 / (9 * p.k); return `${String(Number((p.k * Math.pow(1 - c + z * Math.sqrt(c), 3)).toPrecision(4)))} (95th percentile)`; }, explain: 'The cube root of a chi-squared variable is close to normal. The value column uses it to approximate the 95th percentile; compare it with the exact critical value in the row above.' },
    ],

    limits: [
      { text: '<b>Gamma distribution.</b> $\\chi^2_k$ is $\\mathrm{Gamma}(\\alpha = k/2,\\ \\beta = 1/2)$ (shape $k/2$, rate $1/2$, scale 2). Conversely, if $X \\sim \\mathrm{Gamma}(\\alpha, \\beta)$ then $2\\beta X \\sim \\chi^2_{2\\alpha}$, which also defines chi-squared distributions with non-integer degrees of freedom.', relation: 'chi-squared--gamma', to: 'gamma' },
      { text: '<b>Exponential distribution.</b> With $k = 2$ the chi-squared distribution is the exponential distribution with rate $1/2$ (mean 2): $f(x) = \\tfrac12 e^{-x/2}$. For example, the squared distance from the origin of a point drawn from a standard two-dimensional normal distribution is exponential with mean 2.', to: 'exponential' },
      { text: '<b>Normal limit.</b> As $k \\to \\infty$, $(\\chi^2_k - k)/\\sqrt{2k} \\xrightarrow{d} \\mathcal N(0, 1)$, by the central limit theorem applied to the $k$ squared terms. The approach is slow because of the skewness $\\sqrt{8/k}$; the Wilson–Hilferty cube-root approximation is much better for moderate $k$.', to: 'normal' },
      { text: '<b>Pearson’s statistic.</b> The statistic $\\sum (O - E)^2/E$ computed from multinomial counts approaches $\\chi^2_{K-1}$ as the sample size grows. This large-sample limit is the basis of the chi-squared tests for goodness of fit and independence.', relation: 'multinomial--chi-squared', to: 'multinomial' },
      { text: '<b>Chi distribution.</b> The square root $\\sqrt{\\chi^2_k}$ has the chi distribution: for $k = 2$ this is the Rayleigh distribution of a distance in the plane, and for $k = 3$ the Maxwell–Boltzmann distribution of molecular speeds.' },
      { text: '<b>Noncentral chi-squared.</b> If the normal variables have nonzero means $\\mu_i$, the sum of squares has a noncentral chi-squared distribution with noncentrality $\\sum \\mu_i^2$. It gives the power of chi-squared tests when the null hypothesis is false.' },
    ],

    uses: {
      frequentist: [
        '<b>Pearson’s chi-squared tests.</b> The goodness-of-fit test compares observed category counts with expected ones; the test of independence (or homogeneity) does the same for a contingency table with $(r-1)(c-1)$ degrees of freedom. Both reject for large values of $X^2$, so the p-value is the upper-tail area.',
        '<b>Likelihood-ratio tests.</b> By Wilks’ theorem, $-2\\ln\\Lambda$ for nested models is approximately $\\chi^2_d$. Deviance differences between nested generalized linear models (logistic, Poisson regression) are tested this way, as is the $G$-test for contingency tables.',
        '<b>Wald and score tests.</b> A squared z statistic is $\\chi^2_1$, and a joint Wald test of $d$ coefficients, $\\hat\\theta^\\top \\hat V^{-1} \\hat\\theta$, is approximately $\\chi^2_d$.',
        '<b>Variance of a normal population.</b> $(n-1)s^2/\\sigma^2 \\sim \\chi^2_{n-1}$ gives the chi-squared test for a variance and the confidence interval for $\\sigma^2$, which uses the two quantiles $\\chi^2_{n-1,\\,\\alpha/2}$ and $\\chi^2_{n-1,\\,1-\\alpha/2}$ (a two-sided test).',
        '<b>Other tests with chi-squared reference distributions.</b> McNemar’s test for paired proportions, the Cochran–Mantel–Haenszel test, the log-rank test in survival analysis, and the large-sample versions of the Kruskal–Wallis and Friedman tests.',
        '<b>Building other sampling distributions.</b> The $t$ and $F$ distributions are defined through chi-squared variables: $t_\\nu = Z/\\sqrt{\\chi^2_\\nu/\\nu}$ and $F = (\\chi^2_{d_1}/d_1)/(\\chi^2_{d_2}/d_2)$.',
      ],
      bayesian: [
        '<b>Posterior of a normal variance.</b> With the reference prior $p(\\mu, \\sigma^2) \\propto 1/\\sigma^2$, the posterior satisfies $(n-1)s^2/\\sigma^2 \\mid y \\sim \\chi^2_{n-1}$: the same form as the frequentist result, but now describing uncertainty about $\\sigma^2$ given the data, so $\\sigma^2$ has a scaled inverse-chi-squared posterior.',
        '<b>Scaled inverse-chi-squared prior.</b> The conjugate prior for a normal variance with known mean is $\\sigma^2 \\sim \\text{Inv-}\\chi^2(\\nu_0, s_0^2)$, meaning $\\nu_0 s_0^2/\\sigma^2 \\sim \\chi^2_{\\nu_0}$. With $n$ observations whose mean squared deviation from the known mean is $v$, the posterior is $\\text{Inv-}\\chi^2\\big(\\nu_0 + n,\\ (\\nu_0 s_0^2 + n v)/(\\nu_0 + n)\\big)$: the prior acts like $\\nu_0$ extra observations with variance $s_0^2$.',
        '<b>Gamma priors on precisions.</b> A $\\mathrm{Gamma}(\\nu_0/2,\\ \\nu_0 s_0^2/2)$ prior on the precision $1/\\sigma^2$ is the same prior, so scaled chi-squared and gamma priors are interchangeable.',
        '<b>Posterior predictive checks.</b> Pearson’s $X^2$ is a common discrepancy measure for checking the fit of Bayesian models to count data (Gelman, Meng & Stern, 1996).',
        '<b>Wishart distribution.</b> The multivariate generalization (a sum of outer products of normal vectors) is the Wishart distribution, used as a prior on precision matrices; its diagonal elements are scaled chi-squared variables.',
      ],
      modeling: [
        '<b>Model fit and nested model comparison.</b> In cognitive modeling, multinomial processing tree models and other models of choice frequencies are fitted by maximum likelihood and assessed with the $G^2$ statistic, which is compared with a chi-squared distribution; nested versions of a model are compared with the difference in $G^2$.',
        '<b>Least-squares fitting in the sciences.</b> In “chi-squared fitting” the weighted sum of squared residuals is approximately $\\chi^2$ with (data points minus parameters) degrees of freedom; a reduced chi-squared near 1 indicates a fit consistent with the measurement errors.',
        '<b>Confidence ellipses and outliers.</b> The squared Mahalanobis distance of a multivariate normal point is chi-squared, so the 95% ellipse of a bivariate normal uses $\\chi^2_{2,\\,0.95} = 5.991$, and multivariate outliers are flagged by large Mahalanobis distances.',
        '<b>Physics and signal processing.</b> The kinetic energy of a gas molecule is proportional to a $\\chi^2_3$ variable, and the power of Gaussian noise summed over $k$ independent components (an energy detector) is chi-squared.',
        '<b>Simulation.</b> A chi-squared draw is a sum of squared normal draws or, for any $k$, twice a $\\mathrm{Gamma}(k/2, 1)$ draw.',
      ],
    },

    references: [
      { text: 'Wikipedia: Chi-squared distribution.', url: 'https://en.wikipedia.org/wiki/Chi-squared_distribution' },
      { text: 'Pearson, K. (1900). On the criterion that a given system of deviations from the probable in the case of a correlated system of variables is such that it can be reasonably supposed to have arisen from random sampling. <i>Philosophical Magazine</i>, 50(302), 157–175.', url: 'https://doi.org/10.1080/14786440009463897' },
      { text: 'Wilks, S. S. (1938). The large-sample distribution of the likelihood ratio for testing composite hypotheses. <i>Annals of Mathematical Statistics</i>, 9(1), 60–62.', url: 'https://doi.org/10.1214/aoms/1177732360' },
      { text: 'Casella, G., & Berger, R. L. (2002). <i>Statistical Inference</i> (2nd ed.), Sections 5.3 and 10.3. Duxbury.' },
      { text: 'Gelman, A., Carlin, J. B., Stern, H. S., Dunson, D. B., Vehtari, A., & Rubin, D. B. (2013). <i>Bayesian Data Analysis</i> (3rd ed.), Sections 2.6 and 3.2 and Appendix A. CRC Press.', url: 'http://www.stat.columbia.edu/~gelman/book/' },
      { text: 'Johnson, N. L., Kotz, S., & Balakrishnan, N. (1994). <i>Continuous Univariate Distributions</i>, Vol. 1 (2nd ed.), Chapter 18. Wiley.' },
      { text: 'Leemis, L. M., & McQueston, J. T. (2008). Univariate distribution relationships. <i>The American Statistician</i>, 62(1), 45–53.', url: 'https://doi.org/10.1198/000313008X270448' },
      { text: 'Wilson, E. B., & Hilferty, M. M. (1931). The distribution of chi-square. <i>Proceedings of the National Academy of Sciences</i>, 17(12), 684–688.', url: 'https://doi.org/10.1073/pnas.17.12.684' },
    ],
  },
};
