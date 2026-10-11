// F (Fisher–Snedecor) distribution with d1 numerator and d2 denominator degrees of freedom.
// Follows the structure of the reference module dists/normal.js (see ARCHITECTURE.md).
// The explorer adds a "Hypothesis test" box (testExplorer, shared with the t and chi-squared pages).

import { catalogParams } from '../catalog.js';
import { lbeta, digamma, betaI, betaIc, betaIinv } from '../core/math.js';
import { testExplorer } from './student-t.js';

function pdf(x, { d1, d2 }) {
  if (x < 0) return 0;
  if (x === 0) return d1 < 2 ? Infinity : d1 === 2 ? 1 : 0;
  return Math.exp((d1 / 2) * Math.log(d1 / d2) + (d1 / 2 - 1) * Math.log(x)
    - ((d1 + d2) / 2) * Math.log1p(d1 * x / d2) - lbeta(d1 / 2, d2 / 2));
}
// F(x) = I_z(d1/2, d2/2) with z = d1 x / (d1 x + d2); the upper tail uses 1 - z = d2 / (d1 x + d2) directly
function cdf(x, { d1, d2 }) {
  if (x <= 0) return 0;
  if (x === Infinity) return 1;
  return betaI(d1 * x / (d1 * x + d2), d1 / 2, d2 / 2);
}
function sf(x, { d1, d2 }) {
  if (x <= 0) return 1;
  if (x === Infinity) return 0;
  return betaI(d2 / (d1 * x + d2), d2 / 2, d1 / 2);
}
function quantile(u, { d1, d2 }) {
  if (u <= 0) return 0;
  if (u >= 1) return Infinity;
  if (u <= 0.5) {
    const z = betaIinv(u, d1 / 2, d2 / 2);
    return d2 * z / (d1 * (1 - z));
  }
  const w = betaIinv(1 - u, d2 / 2, d1 / 2); // w = 1 - z
  return d2 * (1 - w) / (d1 * w);
}

const meanOf = d2 => (d2 > 2 ? d2 / (d2 - 2) : Infinity);
const modeOf = (d1, d2) => (d1 > 2 ? (d1 - 2) / d1 * d2 / (d2 + 2) : 0);

function stats(p) {
  const { d1, d2 } = p;
  const variance = d2 > 4 ? 2 * d2 * d2 * (d1 + d2 - 2) / (d1 * (d2 - 2) ** 2 * (d2 - 4)) : d2 > 2 ? Infinity : NaN;
  return {
    mean: meanOf(d2),
    variance,
    sd: Math.sqrt(variance),
    median: quantile(0.5, p),
    mode: modeOf(d1, d2),
    skewness: d2 > 6 ? (2 * d1 + d2 - 2) * Math.sqrt(8 * (d2 - 4)) / ((d2 - 6) * Math.sqrt(d1 * (d1 + d2 - 2))) : d2 > 4 ? Infinity : NaN,
    exKurtosis: d2 > 8
      ? 12 * (d1 * (5 * d2 - 22) * (d1 + d2 - 2) + (d2 - 4) * (d2 - 2) ** 2) / (d1 * (d2 - 6) * (d2 - 8) * (d1 + d2 - 2))
      : d2 > 4 ? Infinity : NaN,
    entropy: lbeta(d1 / 2, d2 / 2) + (1 - d1 / 2) * digamma(d1 / 2) - (1 + d2 / 2) * digamma(d2 / 2)
      + ((d1 + d2) / 2) * digamma((d1 + d2) / 2) + Math.log(d2 / d1),
  };
}

export default {
  id: 'f',
  name: 'F (Fisher-Snedecor)',
  kind: 'continuous',

  params: catalogParams('f', { d1: { log: true }, d2: { log: true } }),

  pdf,
  cdf,
  sf,
  quantile,
  sample: (rng, { d1, d2 }) => rng.f(d1, d2),

  testParams: [{ d1: 1, d2: 1 }, { d1: 1, d2: 20 }, { d1: 2, d2: 7 }, { d1: 3, d2: 5 }, { d1: 20, d2: 100 }, { d1: 100, d2: 9 }],

  range: () => [0, Infinity],
  // the right tail can be extremely long (d2 = 1); show 0 to about the 99.5th percentile, between 3 and 15
  support: p => [0, Math.min(15, Math.max(3, quantile(0.995, p)))],

  stats,

  handles: [
    // a dashed line at the mean d2/(d2 - 2): drag it to set d2 (the mean does not depend on d1)
    {
      type: 'vline', param: 'd2', x: p => meanOf(p.d2), label: 'd₂',
      set: pt => ({ d2: pt.x > 1.0001 ? Math.max(3, 2 * pt.x / (pt.x - 1)) : 100 }),
      ariaLabel: 'Denominator degrees of freedom d₂, set by the mean d₂/(d₂ − 2). Drag left or right, or use the arrow keys.',
    },
    // a knob at the peak (the mode): drag it left or right to set d1 with d2 fixed
    {
      type: 'point', param: 'd1', label: 'd₁',
      at: p => (p.d1 >= 2 ? { x: modeOf(p.d1, p.d2), y: pdf(modeOf(p.d1, p.d2), p) } : { x: NaN, y: NaN }),
      set: (pt, p) => {
        const r = Math.max(0, pt.x) * (p.d2 + 2) / p.d2; // mode = (1 - 2/d1) * d2/(d2 + 2)
        return { d1: r >= 0.98 ? 100 : 2 / (1 - r) };
      },
      ariaLabel: 'Numerator degrees of freedom d₁, set by the position of the peak. Drag left or right, or use the arrow keys.',
    },
  ],

  explorer: {
    areaDefault: p => quantile(0.9, p),
    readouts: [
      { key: 'mean', label: 'Mean d₂/(d₂ − 2)' },
      { key: 'mode', label: 'Mode' },
      { key: 'median', label: 'Median' },
      { label: 'Upper 5% critical value', value: p => quantile(0.95, p) },
    ],
  },

  customExplorer(container, ctx) {
    return testExplorer(container, ctx, {
      stat: 'F',
      sides: [{ value: 'upper', label: 'Upper tail' }, { value: 'two', label: 'Two-sided' }],
      defaultSide: 'upper',
      sideText: { upper: 'Upper-tail F-test (ANOVA, regression)', two: 'Two-sided test of equal variances' },
    });
  },

  content: {
    summary: 'The F distribution describes the ratio of two independent estimates of the same variance, with $d_1$ degrees of freedom in the numerator and $d_2$ in the denominator. It is the reference distribution for F-tests in analysis of variance (ANOVA) and regression.',
    description: [
      'The F distribution describes the ratio of two independent variance estimates. If $U$ and $V$ are independent chi-squared variables with $d_1$ and $d_2$ degrees of freedom, then $(U/d_1)/(V/d_2)$ has the $F(d_1, d_2)$ distribution. It takes non-negative values. When the two variances being compared are equal, the ratio is usually near 1; a large value means the numerator variance is larger than chance would explain.',
      'It has two parameters, both called degrees of freedom: $d_1$ belongs to the numerator (in an analysis of variance, the number of groups minus 1) and $d_2$ to the denominator (the residual or error degrees of freedom). Small $d_2$ gives a long right tail; when both are large the distribution concentrates around 1.',
      'The ratio was studied by R. A. Fisher, and George Snedecor tabulated it in 1934 and named it F in Fisher’s honor. It is the reference distribution for F-tests in analysis of variance (ANOVA), for the overall and nested-model tests in linear regression, and for tests that compare two variances. Squaring a $t$ statistic gives an $F(1, \\nu)$ statistic.',
    ],
    explorerIntro: 'The left plot shows the density $f(x)$ and the right plot the CDF $F(x)$. The dashed amber line marks the mean $d_2/(d_2 - 2)$, which depends only on the denominator degrees of freedom: drag it to change $d_2$ (it is hidden when $d_2 \\le 2$, where the mean is infinite). The amber knob sits on the peak: drag it left or right to change $d_1$. For $d_1 \\le 2$ the density is highest at 0 and the knob is not shown (at $d_1 = 2$ it sits at 0); use the boxes there. Under <b>Hypothesis test</b>, the upper-tail critical value used by ANOVA and regression F-tests is marked with its rejection region; turn on the area tool and drag its marker to an observed F to read off its p-value.',

    pdfTex: 'f(x \\mid d_1, d_2) = \\frac{(d_1/d_2)^{d_1/2}}{B(d_1/2,\\, d_2/2)}\\, x^{d_1/2 - 1} \\left(1 + \\frac{d_1 x}{d_2}\\right)^{-(d_1 + d_2)/2}, \\quad x \\ge 0',
    glossary: [
      { sym: 'x', meaning: 'A possible value of the F ratio, a non-negative number (positive when $d_1 = 1$).' },
      { sym: 'f(x \\mid d_1, d_2)', meaning: 'The probability density at $x$.' },
      { sym: 'd_1', meaning: 'The numerator degrees of freedom: the degrees of freedom of the variance estimate on top of the ratio (for example the number of groups minus 1 in a one-way ANOVA).' },
      { sym: 'd_2', meaning: 'The denominator degrees of freedom: the degrees of freedom of the variance estimate below (for example the total sample size minus the number of groups).' },
      { sym: 'B(a, b)', meaning: 'The beta function, $B(a, b) = \\Gamma(a)\\Gamma(b)/\\Gamma(a + b)$, where $\\Gamma$ is the gamma function (which extends the factorial). Here it makes the total area equal to 1.' },
      { sym: '(d_1/d_2)^{d_1/2}', meaning: 'A constant that accounts for dividing each chi-squared variable by its degrees of freedom.' },
      { sym: 'x^{d_1/2 - 1}', meaning: 'Sets the shape near 0: for $d_1 = 1$ the density is infinite at 0, for $d_1 = 2$ it starts at 1, and for $d_1 \\ge 3$ it starts at 0 and rises to a peak.' },
      { sym: '\\left(1 + \\frac{d_1 x}{d_2}\\right)^{-(d_1+d_2)/2}', meaning: 'Makes the right tail fall off like the power $x^{-(d_2/2 + 1)}$, so a small $d_2$ gives a heavy right tail.' },
    ],

    cdfTex: 'F(x \\mid d_1, d_2) = I_z\\!\\left(\\frac{d_1}{2}, \\frac{d_2}{2}\\right), \\qquad z = \\frac{d_1 x}{d_1 x + d_2}',
    cdfGlossary: [
      { sym: 'F(x \\mid d_1, d_2)', meaning: 'The cumulative distribution function: the probability that the F ratio is at most $x$. (The letter $F$ is used both for the distribution and for CDFs in general.) The p-value of an upper-tail F-test with observed value $x$ is $1 - F(x \\mid d_1, d_2)$.' },
      { sym: 'I_z(a, b)', meaning: 'The regularized incomplete beta function: the probability that a $\\mathrm{Beta}(a, b)$ variable is at most $z$. It has no elementary formula and is computed numerically (a continued fraction).' },
      { sym: 'z = \\frac{d_1 x}{d_1 x + d_2}', meaning: 'The F value converted to a number between 0 and 1. This converted value has a $\\mathrm{Beta}(d_1/2, d_2/2)$ distribution, which is why the incomplete beta function appears.' },
      { sym: 'd_1, d_2', meaning: 'The numerator and denominator degrees of freedom.' },
    ],

    extraFormulas: [
      {
        title: 'The F statistic in a one-way ANOVA',
        intro: 'With $g$ groups and $N$ observations in total, independent normal errors with equal variance, and no differences between the group means (the null hypothesis), the ratio of the between-group and within-group mean squares has an $F(g - 1, N - g)$ distribution.',
        tex: 'F = \\frac{\\mathrm{SS}_{\\text{between}}/(g - 1)}{\\mathrm{SS}_{\\text{within}}/(N - g)} = \\frac{\\sum_j n_j (\\bar y_j - \\bar y)^2/(g-1)}{\\sum_j \\sum_i (y_{ij} - \\bar y_j)^2/(N - g)}',
        glossary: [
          { sym: 'g', meaning: 'The number of groups.' },
          { sym: 'N', meaning: 'The total number of observations; $n_j$ is the number in group $j$.' },
          { sym: 'y_{ij}', meaning: 'Observation $i$ in group $j$.' },
          { sym: '\\bar y_j, \\bar y', meaning: 'The mean of group $j$ and the overall mean.' },
          { sym: '\\mathrm{SS}_{\\text{between}}, \\mathrm{SS}_{\\text{within}}', meaning: 'The between-group and within-group sums of squares. Each, divided by $\\sigma^2$, is chi-squared under the null hypothesis, and they are independent.' },
        ],
      },
      {
        title: 'Comparing nested regression models',
        intro: 'When a smaller linear model (fewer predictors) is nested in a larger one with $p$ predictors and an intercept, fitted to $n$ observations, this statistic is $F(q, n - p - 1)$ under the smaller model. With $q = p$ (all slopes zero) it is the overall regression F-test, and it can be written with $R^2$.',
        tex: 'F = \\frac{(\\mathrm{RSS}_0 - \\mathrm{RSS}_1)/q}{\\mathrm{RSS}_1/(n - p - 1)}, \\qquad \\text{overall: } F = \\frac{R^2/p}{(1 - R^2)/(n - p - 1)}',
        glossary: [
          { sym: '\\mathrm{RSS}_0, \\mathrm{RSS}_1', meaning: 'The residual sums of squares of the smaller and the larger model.' },
          { sym: 'q', meaning: 'The number of coefficients set to zero in the smaller model.' },
          { sym: 'n, p', meaning: 'The number of observations and the number of predictors in the larger model.' },
          { sym: 'R^2', meaning: 'The proportion of variance explained by the larger model.' },
        ],
      },
    ],

    properties: [
      { name: 'Support', tex: 'x \\in [0, \\infty)', explain: 'A ratio of two non-negative quantities.' },
      { name: 'Mean', tex: '\\frac{d_2}{d_2 - 2} \\quad (d_2 > 2)', value: p => meanOf(p.d2), explain: 'Slightly above 1 and independent of $d_1$. Infinite for $d_2 \\le 2$. It is not exactly 1 because $\\mathrm{E}[1/V] > 1/\\mathrm{E}[V]$ for the chi-squared variable $V$ in the denominator.' },
      { name: 'Median', tex: 'F^{-1}(0.5)', value: p => quantile(0.5, p), explain: 'No closed form; computed numerically from the incomplete beta function. When $d_1 = d_2$ the median is exactly 1, because $X$ and $1/X$ then have the same distribution.' },
      { name: 'Mode', tex: '\\frac{d_1 - 2}{d_1}\\cdot\\frac{d_2}{d_2 + 2} \\quad (d_1 > 2)', value: p => modeOf(p.d1, p.d2), explain: 'Always below 1. For $d_1 \\le 2$ the density is highest at 0 (infinite there when $d_1 = 1$).' },
      { name: 'Variance', tex: '\\frac{2 d_2^2 (d_1 + d_2 - 2)}{d_1 (d_2 - 2)^2 (d_2 - 4)} \\quad (d_2 > 4)', value: p => stats(p).variance, explain: 'Infinite for $2 < d_2 \\le 4$ and undefined for $d_2 \\le 2$.' },
      { name: 'Standard deviation', tex: '\\sqrt{\\mathrm{Var}(X)} \\quad (d_2 > 4)', value: p => stats(p).sd, explain: 'Shrinks toward 0 as both degrees of freedom grow, when the ratio concentrates at 1.' },
      { name: 'Skewness', tex: '\\frac{(2d_1 + d_2 - 2)\\sqrt{8(d_2 - 4)}}{(d_2 - 6)\\sqrt{d_1(d_1 + d_2 - 2)}} \\quad (d_2 > 6)', value: p => stats(p).skewness, explain: 'Always positive: a long right tail. Infinite for $4 < d_2 \\le 6$ (the variance is finite but the third moment is not) and undefined for $d_2 \\le 4$, where the variance is already infinite.' },
      { name: 'Excess kurtosis', tex: '\\frac{12\\left[d_1(5d_2 - 22)(d_1 + d_2 - 2) + (d_2 - 4)(d_2 - 2)^2\\right]}{d_1 (d_2 - 6)(d_2 - 8)(d_1 + d_2 - 2)} \\quad (d_2 > 8)', value: p => stats(p).exKurtosis, explain: 'Infinite for $4 < d_2 \\le 8$ and undefined below.' },
      { name: 'Entropy', tex: '\\ln B\\!\\left(\\tfrac{d_1}{2}, \\tfrac{d_2}{2}\\right) + \\left(1 - \\tfrac{d_1}{2}\\right)\\psi\\!\\left(\\tfrac{d_1}{2}\\right) - \\left(1 + \\tfrac{d_2}{2}\\right)\\psi\\!\\left(\\tfrac{d_2}{2}\\right) + \\tfrac{d_1 + d_2}{2}\\,\\psi\\!\\left(\\tfrac{d_1 + d_2}{2}\\right) + \\ln\\frac{d_2}{d_1}', value: p => stats(p).entropy, explain: 'Differential entropy in nats; $\\psi$ is the digamma function, the derivative of $\\ln\\Gamma$.' },
      { name: 'Moment-generating function', tex: '\\text{does not exist}', explain: 'The right tail decays like a power, so $\\mathrm{E}[e^{tX}]$ is infinite for every $t > 0$. The moment $\\mathrm{E}[X^r]$ exists only for $r < d_2/2$.' },
      { name: 'Characteristic function', tex: '\\varphi(t) = \\frac{\\Gamma\\big(\\frac{d_1 + d_2}{2}\\big)}{\\Gamma\\big(\\frac{d_2}{2}\\big)}\\, U\\Big(\\frac{d_1}{2},\\ 1 - \\frac{d_2}{2},\\ -\\frac{d_2}{d_1}\\, i t\\Big)', explain: '$\\mathrm{E}[e^{itX}]$, with $i = \\sqrt{-1}$. It exists for every $t$ even though the moment-generating function does not. $U$ is the confluent hypergeometric function of the second kind (Tricomi\u2019s function) and $\\Gamma$ is the gamma function. It is rarely used in practice.' },
      { name: 'Upper 5% critical value', tex: 'F_{0.95}(d_1, d_2)', value: p => quantile(0.95, p), explain: 'An F-test at $\\alpha = 0.05$ rejects when the statistic exceeds this value. For example $F_{0.95}(2, 27) = 3.354$ for a one-way ANOVA with 3 groups of 10, and $F_{0.95}(1, \\nu) = t_{\\nu,\\,0.975}^2$.' },
      { name: 'Reciprocal', tex: '1/X \\sim F(d_2, d_1)', value: p => quantile(0.05, p), explain: 'Swapping numerator and denominator swaps the degrees of freedom, so lower critical values come from upper ones: $F_{\\alpha}(d_1, d_2) = 1/F_{1-\\alpha}(d_2, d_1)$. The value column shows the lower 5% point $F_{0.05}(d_1, d_2)$.' },
    ],

    limits: [
      { text: '<b>Square of a t variable.</b> If $T \\sim t_\\nu$ then $T^2 \\sim F(1, \\nu)$. A two-sided t-test and the F-test with $d_1 = 1$ therefore give identical p-values.', relation: 'student-t--f', to: 'student-t' },
      { text: '<b>Large denominator degrees of freedom.</b> As $d_2 \\to \\infty$ the denominator $V/d_2$ tends to 1, so $d_1 X \\xrightarrow{d} \\chi^2_{d_1}$. This is why large-sample Wald and likelihood-ratio tests use chi-squared rather than F reference distributions.', to: 'chi-squared' },
      { text: '<b>Both degrees of freedom large.</b> As $d_1$ and $d_2$ grow the ratio concentrates at 1. Fisher’s $z = \\tfrac12 \\ln X$ is approximately normal with mean close to 0 and variance $\\tfrac12(1/d_1 + 1/d_2)$.', to: 'normal' },
      { text: '<b>Beta distribution.</b> $d_1 X/(d_1 X + d_2) \\sim \\mathrm{Beta}(d_1/2, d_2/2)$. Under the null hypothesis of a regression F-test this quantity is $R^2$.', relation: 'f--beta', to: 'beta' },
      { text: '<b>Two numerator degrees of freedom.</b> With $d_1 = 2$ the density is $f(x) = (1 + 2x/d_2)^{-(d_2/2 + 1)}$, a Lomax (Pareto type II) density that starts at height 1 at $x = 0$.' },
      { text: '<b>Noncentral F.</b> When the null hypothesis is false, the F statistic has a noncentral F distribution with noncentrality parameter equal to the true effect’s sum of squares divided by $\\sigma^2$. It is used to compute the power of ANOVA and regression F-tests (for example in G*Power).' },
    ],

    uses: {
      frequentist: [
        '<b>Analysis of variance.</b> One-way and factorial ANOVA test each effect with $F = \\mathrm{MS}_{\\text{effect}}/\\mathrm{MS}_{\\text{error}}$ against $F(d_1, d_2)$, with $d_1$ the effect degrees of freedom and $d_2$ the error degrees of freedom. The test rejects for large F, so the p-value is the upper-tail area.',
        '<b>Repeated-measures ANOVA.</b> When sphericity fails, the Greenhouse–Geisser or Huynh–Feldt corrections multiply both degrees of freedom by an estimated factor $\\varepsilon \\le 1$ and use the same F distribution.',
        '<b>Regression F-tests.</b> The overall F-test of a linear regression and the partial (extra-sum-of-squares) F-test comparing nested models, including ANCOVA and tests of interactions.',
        '<b>Comparing two variances.</b> For independent normal samples with equal variances, $s_1^2/s_2^2 \\sim F(n_1 - 1, n_2 - 1)$; this two-sided test is sensitive to non-normality. Levene’s and the Brown–Forsythe tests are ANOVAs on absolute deviations and also use F.',
        '<b>Welch’s ANOVA and multivariate tests.</b> Welch’s ANOVA for unequal variances uses an F distribution with adjusted denominator degrees of freedom, and Hotelling’s $T^2$ and approximations to Wilks’ $\\Lambda$ are converted to F statistics.',
        '<b>Power analysis.</b> Sample sizes for ANOVA and regression are chosen from the noncentral F distribution, often with Cohen’s effect size $f^2$.',
      ],
      bayesian: [
        '<b>Ratio of two variances.</b> With the reference priors $p(\\sigma_j^2) \\propto 1/\\sigma_j^2$ for two independent normal samples, the posterior of the variance ratio is a scaled F distribution: $(\\sigma_1^2/\\sigma_2^2)\\,(s_2^2/s_1^2) \\mid y \\sim F(n_2 - 1, n_1 - 1)$ (Box & Tiao, 1973).',
        '<b>Bayes factors from F and $R^2$.</b> Under Zellner’s g-prior, and its mixtures such as the Zellner–Siow prior, the Bayes factor for a regression model depends on the data only through $R^2$ (equivalently, the F statistic), $n$ and $p$ (Liang et al., 2008); default Bayes factors for ANOVA (Rouder et al., 2012) build on this.',
        '<b>Priors on scales.</b> A half-Cauchy prior on a standard deviation $\\tau$ (Gelman, 2006) implies that $\\tau^2$ is a scaled $F(1, 1)$ variable, because the square of a Cauchy ($t_1$) variable is $F(1, 1)$.',
        '<b>As a likelihood.</b> Otherwise the F distribution appears in Bayesian work mostly as the sampling distribution of an observed F statistic, for example when a reported F value is converted to an approximate Bayes factor (Wagenmakers, 2007).',
      ],
      modeling: [
        '<b>Neuroimaging.</b> In the general linear model for fMRI, F-contrasts test several regressors at once (for example any response across a set of conditions or any shape of a hemodynamic response); each voxel’s statistic is compared with an F distribution.',
        '<b>Model comparison in curve fitting.</b> Nested nonlinear models fitted by least squares (for example a one- versus two-component exponential, or psychophysical models with and without a lapse rate) are compared with the extra-sum-of-squares F-test, an alternative to AIC and BIC.',
        '<b>Signal processing.</b> Ratios of independent spectral power estimates follow F distributions; Thomson’s multitaper harmonic F-test detects periodic components in noisy time series.',
        '<b>Engineering and quality control.</b> Comparing the variability of two processes or instruments.',
        '<b>Simulation.</b> An F draw is $(U/d_1)/(V/d_2)$ with independent chi-squared draws $U$ and $V$.',
      ],
    },

    references: [
      { text: 'Wikipedia: F-distribution.', url: 'https://en.wikipedia.org/wiki/F-distribution' },
      { text: 'Wikipedia: F-test.', url: 'https://en.wikipedia.org/wiki/F-test' },
      { text: 'Snedecor, G. W. (1934). <i>Calculation and Interpretation of Analysis of Variance and Covariance</i>. Collegiate Press, Ames, Iowa.' },
      { text: 'Fisher, R. A. (1924). On a distribution yielding the error functions of several well known statistics. <i>Proceedings of the International Congress of Mathematics, Toronto</i>, 2, 805–813.' },
      { text: 'Casella, G., & Berger, R. L. (2002). <i>Statistical Inference</i> (2nd ed.), Section 5.3.2 and Chapter 11. Duxbury.' },
      { text: 'Johnson, N. L., Kotz, S., & Balakrishnan, N. (1995). <i>Continuous Univariate Distributions</i>, Vol. 2 (2nd ed.), Chapter 27. Wiley.' },
      { text: 'Leemis, L. M., & McQueston, J. T. (2008). Univariate distribution relationships. <i>The American Statistician</i>, 62(1), 45–53.', url: 'https://doi.org/10.1198/000313008X270448' },
      { text: 'Box, G. E. P., & Tiao, G. C. (1973). <i>Bayesian Inference in Statistical Analysis</i>, Chapter 2. Addison-Wesley.' },
      { text: 'Liang, F., Paulo, R., Molina, G., Clyde, M. A., & Berger, J. O. (2008). Mixtures of g priors for Bayesian variable selection. <i>Journal of the American Statistical Association</i>, 103(481), 410–423.', url: 'https://doi.org/10.1198/016214507000001337' },
      { text: 'Rouder, J. N., Morey, R. D., Speckman, P. L., & Province, J. M. (2012). Default Bayes factors for ANOVA designs. <i>Journal of Mathematical Psychology</i>, 56(5), 356–374.', url: 'https://doi.org/10.1016/j.jmp.2012.08.001' },
      { text: 'Gelman, A. (2006). Prior distributions for variance parameters in hierarchical models. <i>Bayesian Analysis</i>, 1(3), 515–534.', url: 'https://doi.org/10.1214/06-BA117A' },
      { text: 'Wagenmakers, E.-J. (2007). A practical solution to the pervasive problems of p values. <i>Psychonomic Bulletin & Review</i>, 14(5), 779–804.', url: 'https://doi.org/10.3758/BF03194105' },
    ],
  },
};
