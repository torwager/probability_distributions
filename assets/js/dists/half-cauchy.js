// Half-Cauchy distribution with scale gamma: the distribution of |X| for X ~ Cauchy(0, gamma).
// Follows the structure of the reference module dists/normal.js.

import { catalogParams } from '../catalog.js';
import { erf, normalQuantile, PI } from '../core/math.js';

const Q75 = normalQuantile(0.75); // 0.6745: the median of a half-normal with sigma = 1

function pdf(x, { gamma }) {
  if (x < 0) return 0;
  const z = x / gamma;
  return 2 / (PI * gamma * (1 + z * z));
}
const cdf = (x, { gamma }) => (x <= 0 ? 0 : (2 / PI) * Math.atan(x / gamma));
// upper tail computed as (2/pi) atan(gamma/x), accurate far out in the tail
const sf = (x, { gamma }) => (x <= 0 ? 1 : (2 / PI) * Math.atan(gamma / x));
const quantile = (u, { gamma }) => (u <= 0 ? 0 : u >= 1 ? Infinity : gamma * Math.tan(PI * u / 2));

// the half-normal with the same median gamma, drawn for comparison
const hnSigma = g => g / Q75;
const hnPdf = (x, g) => { if (x < 0) return 0; const s = hnSigma(g), z = x / s; return 2 * Math.exp(-0.5 * z * z) / (s * Math.sqrt(2 * PI)); };
const hnCdf = (x, g) => (x <= 0 ? 0 : erf(x / (hnSigma(g) * Math.SQRT2)));

function stats({ gamma }) {
  return {
    mean: Infinity, variance: Infinity, sd: Infinity,
    median: gamma, mode: 0,
    skewness: NaN, exKurtosis: NaN,
    entropy: Math.log(2 * PI * gamma),
  };
}

export default {
  id: 'half-cauchy',
  name: 'Half-Cauchy',
  kind: 'continuous',

  params: catalogParams('half-cauchy', { gamma: { step: 0.05 } }),

  pdf,
  cdf,
  sf,
  quantile,
  sample: (rng, { gamma }) => Math.abs(rng.cauchy(0, gamma)),

  testParams: [{ gamma: 0.1 }, { gamma: 2.5 }, { gamma: 5 }],

  range: () => [0, Infinity],
  // heavy tail: show 0 to 10 scale units (about 94% of the probability), with a little room left of 0
  support: ({ gamma }) => [-0.3 * gamma, 10 * gamma],

  stats,

  // Handle: an arrow from 0 to the median gamma, drawn at the height f(gamma) = 1/(pi gamma), which is half
  // the peak height f(0). Its length is gamma (the half-width at half-maximum); drag the tip to change it.
  handles: [
    {
      type: 'hArrow', param: 'gamma',
      ariaLabel: 'Scale γ, which is also the median. Drag the arrow tip left or right, or use the arrow keys.',
      from: p => ({ x: 0, y: pdf(p.gamma, p) }),
      to: p => ({ x: p.gamma, y: pdf(p.gamma, p) }),
      set: pt => ({ gamma: pt.x }),
    },
  ],

  explorer: {
    areaDefault: p => 3 * p.gamma,
    overlays: p => [
      { id: 'half-normal', label: `Half-normal with the same median (σ = ${fmtN(hnSigma(p.gamma))})`, pdf: x => hnPdf(x, p.gamma), cdf: x => hnCdf(x, p.gamma), cls: 'curve-ref' },
    ],
    readouts: [
      { key: 'median', label: 'Median γ' },
      { label: 'Quartiles', value: p => `${fmtN(quantile(0.25, p))} and ${fmtN(quantile(0.75, p))}` },
      { label: '90th and 99th percentiles', value: p => `${fmtN(quantile(0.9, p))} and ${fmtN(quantile(0.99, p))}` },
      { label: 'P(X > 10γ)', value: p => fmtN(sf(10 * p.gamma, p)) },
      { label: 'Mean and variance', value: () => 'infinite' },
    ],
  },

  content: {
    description: [
      'The half-Cauchy distribution is the distribution of the size $|X|$ of a Cauchy variable $X$ centered at zero: the negative half of the Cauchy curve is folded over onto the positive half. It takes every value from 0 upward. The density is highest at 0 and falls off slowly, like $1/x^2$, so very large values are rare but far from impossible.',
      'It has one parameter, the scale $\\gamma$, which is also the median: half of the probability lies below $\\gamma$ and half above. At $x = \\gamma$ the density is exactly half its value at 0. The tail is so heavy that the mean and the variance are infinite.',
      'Its main use is as a prior distribution for a standard deviation or another scale parameter in Bayesian models, especially the between-group standard deviation in a hierarchical (multilevel) model. Most of its mass is near zero, which allows small group differences, while its heavy tail lets the data support a large standard deviation if they call for it. Gelman (2006) recommended it as a weakly informative default. More recent advice from the Stan developers often prefers the half-normal, half-t or exponential distribution, whose tails are lighter; the plot shows the half-normal with the same median for comparison.',
    ],
    explorerIntro: 'The left plot shows the density $f(x)$ and the right plot the cumulative distribution $F(x)$, both in steel blue. The amber arrow runs from 0 to the median $\\gamma$ at the height where the density is half its peak; drag its tip to change the scale $\\gamma$. For comparison, the dashed curve is a half-normal distribution with the same median. Both put half their probability below $\\gamma$, but the half-Cauchy has a higher, narrower peak and keeps much more probability far out in the tail: its CDF approaches 1 slowly. (An exponential distribution with the same median, another common choice, has a tail between these two.) Turn on the area tool to read off tail probabilities such as $P(X > 3\\gamma)$.',

    pdfTex: 'f(x \\mid \\gamma) = \\frac{2}{\\pi\\gamma\\left[1 + (x/\\gamma)^2\\right]}, \\qquad x \\ge 0',
    glossary: [
      { sym: 'x', meaning: 'A possible value of the random variable $X$, a number of at least 0 (for example a standard deviation).' },
      { sym: 'f(x \\mid \\gamma)', meaning: 'The probability density at $x$ given the scale. Probabilities are areas under this curve.' },
      { sym: '\\gamma', meaning: 'The scale parameter, a positive number in the same units as $x$. It is the median and the half-width at half-maximum. Gelman (2006) writes it $A$, as in $\\mathrm{HalfCauchy}(0, A)$.' },
      { sym: '\\pi', meaning: 'The constant 3.14159…, the ratio of a circle’s circumference to its diameter. It appears because the area under $1/(1+z^2)$ from 0 to infinity is $\\pi/2$.' },
      { sym: '\\frac{2}{\\pi\\gamma}', meaning: 'The height of the density at $x = 0$, its highest point. The factor 2 (compared with the Cauchy) puts the probability of the folded negative half onto the positive half.' },
      { sym: '(x/\\gamma)^2', meaning: 'The squared distance from 0 in units of $\\gamma$. For large $x$ the density falls off like $1/x^2$, a heavy power-law tail.' },
    ],

    cdfTex: 'F(x \\mid \\gamma) = P(X \\le x) = \\frac{2}{\\pi} \\arctan\\!\\left(\\frac{x}{\\gamma}\\right), \\qquad x \\ge 0',
    cdfGlossary: [
      { sym: 'F(x \\mid \\gamma)', meaning: 'The cumulative distribution function: the probability that $X$ is at most $x$.' },
      { sym: 'P(X \\le x)', meaning: 'The probability that the random variable $X$ takes a value of at most $x$.' },
      { sym: '\\arctan(\\cdot)', meaning: 'The inverse tangent: the angle (in radians, between 0 and $\\pi/2$ here) whose tangent is the given number. It approaches $\\pi/2$ slowly, which is why the CDF approaches 1 slowly.' },
      { sym: '\\frac{2}{\\pi}', meaning: 'Rescales the angle so that the CDF runs from 0 at $x = 0$ to 1 as $x \\to \\infty$.' },
      { sym: '\\pi', meaning: 'The constant 3.14159….' },
      { sym: '\\gamma', meaning: 'The scale (the median): $F(\\gamma) = \\tfrac{2}{\\pi}\\arctan 1 = \\tfrac12$.' },
    ],

    extraFormulas: [
      {
        title: 'Quantile function',
        intro: 'The CDF can be inverted in closed form, which gives the quantiles and a simple way to draw random numbers (insert a uniform random number for $u$).',
        tex: 'Q(u) = \\gamma \\tan\\!\\left(\\frac{\\pi u}{2}\\right), \\qquad 0 \\le u < 1',
        glossary: [
          { sym: 'u', meaning: 'A probability between 0 and 1.' },
          { sym: 'Q(u)', meaning: 'The value below which a fraction $u$ of the distribution lies. For example $Q(0.9) = \\gamma\\tan(0.45\\pi) \\approx 6.31\\gamma$ and $Q(0.99) \\approx 63.66\\gamma$.' },
          { sym: '\\tan(\\cdot)', meaning: 'The tangent function, the inverse of $\\arctan$.' },
        ],
      },
      {
        title: 'Folding a Cauchy density',
        intro: 'The density is the Cauchy density at $x$ plus the Cauchy density at $-x$, which are equal because the Cauchy curve is symmetric around 0.',
        tex: 'f_{|X|}(x) = f_X(x) + f_X(-x) = 2 \\cdot \\frac{1}{\\pi\\gamma\\left[1 + (x/\\gamma)^2\\right]}, \\qquad X \\sim \\mathrm{Cauchy}(0, \\gamma)',
        glossary: [
          { sym: 'f_X', meaning: 'The density of the Cauchy variable $X$, centered at 0 with scale $\\gamma$.' },
          { sym: 'f_{|X|}', meaning: 'The density of the folded variable $|X|$, the half-Cauchy density.' },
        ],
      },
    ],

    properties: [
      { name: 'Support', tex: 'x \\in [0, \\infty)', explain: 'All values from 0 upward. The density is largest at 0.' },
      { name: 'Mean', tex: '\\mathrm{E}[X] = \\infty', value: () => 'infinite', explain: 'Infinite for every $\\gamma$: the tail falls off like $1/x^2$, so $\\int x f(x)\\,dx$ grows like $\\ln x$ without bound. Sample means of half-Cauchy draws do not settle down as the sample grows.' },
      { name: 'Median', tex: '\\gamma', value: p => p.gamma, explain: 'Half of the probability lies below $\\gamma$. This is the most useful summary of a half-Cauchy prior: it is the prior’s “typical size” of the scale parameter.' },
      { name: 'Mode', tex: '0', value: () => 0, explain: 'The density is highest at 0, so as a prior it favors small values of the scale parameter without excluding large ones.' },
      { name: 'Variance', tex: '\\infty', value: () => 'infinite', explain: 'Infinite, because the mean is already infinite.' },
      { name: 'Standard deviation', tex: '\\infty', value: () => 'infinite', explain: 'Infinite. Use the median and the quartiles to describe the spread instead.' },
      { name: 'Skewness', tex: '\\text{undefined}', value: () => 'undefined', explain: 'Undefined, because the third moment does not exist. The distribution is clearly skewed to the right.' },
      { name: 'Excess kurtosis', tex: '\\text{undefined}', value: () => 'undefined', explain: 'Undefined, because the fourth moment does not exist.' },
      { name: 'Entropy', tex: '\\ln(2\\pi\\gamma)', value: p => Math.log(2 * PI * p.gamma), explain: 'Differential entropy in nats. It is the entropy of the Cauchy, $\\ln(4\\pi\\gamma)$, minus $\\ln 2$, the information lost by forgetting the sign.' },
      { name: 'Moment-generating function', tex: 'M(t) = \\infty \\quad (t > 0)', explain: 'Does not exist: $\\mathrm{E}[e^{tX}]$ is infinite for every $t > 0$ because of the power-law tail.' },
      { name: 'Characteristic function', tex: '\\varphi(t) = e^{-\\gamma|t|} + \\frac{i\\,\\mathrm{sgn}(t)}{\\pi}\\left[e^{-\\gamma|t|}\\,\\mathrm{Ei}(\\gamma|t|) - e^{\\gamma|t|}\\,\\mathrm{Ei}(-\\gamma|t|)\\right]', explain: '$\\mathrm{E}[e^{itX}]$, where $i = \\sqrt{-1}$, $\\mathrm{sgn}(t)$ is the sign of $t$ and $\\mathrm{Ei}$ is the exponential integral. The real part equals the characteristic function of the Cauchy, $e^{-\\gamma|t|}$.' },
      { name: 'Peak height', tex: 'f(0) = \\frac{2}{\\pi\\gamma}', value: p => 2 / (PI * p.gamma), explain: 'Twice the peak height of the matching Cauchy. At $x = \\gamma$ the density is half of this, so $\\gamma$ is also the half-width at half-maximum.' },
      { name: 'Quartiles', tex: 'Q(\\tfrac14) = (\\sqrt2 - 1)\\gamma, \\quad Q(\\tfrac34) = (\\sqrt2 + 1)\\gamma', value: p => `${fmtN((Math.SQRT2 - 1) * p.gamma)}, ${fmtN((Math.SQRT2 + 1) * p.gamma)}`, explain: 'Since $\\tan(\\pi/8) = \\sqrt2 - 1 \\approx 0.4142$ and $\\tan(3\\pi/8) = \\sqrt2 + 1 \\approx 2.414$. The interquartile range is exactly $2\\gamma$.' },
      { name: 'Tail probability', tex: 'P(X > x) = \\frac{2}{\\pi}\\arctan\\!\\left(\\frac{\\gamma}{x}\\right) \\approx \\frac{2\\gamma}{\\pi x}', value: p => `${fmtN(sf(10 * p.gamma, p))} (x = 10γ)`, explain: 'For large $x$ the tail decreases only like $1/x$. About 6.3% of the probability lies beyond $10\\gamma$ and 0.64% beyond $100\\gamma$; for the half-normal with the same median, the probability beyond $10\\gamma$ is about $10^{-11}$.' },
      { name: 'Fractional moments', tex: '\\mathrm{E}[X^r] = \\frac{\\gamma^r}{\\cos(\\pi r/2)} \\quad (-1 < r < 1)', value: p => `${fmtN(Math.sqrt(p.gamma) / Math.cos(PI / 4))} (r = ½)`, explain: 'Powers below 1 have finite averages. For example $\\mathrm{E}[\\sqrt X] = \\sqrt{2\\gamma}$, shown in the value column.' },
    ],

    limits: [
      { text: '<b>Half-t with one degree of freedom.</b> The half-Cauchy is the half-t distribution (the absolute value of a scaled Student’s t variable) with $\\nu = 1$. As $\\nu \\to \\infty$ the half-t approaches the half-normal, so the half-t family runs from the heavy-tailed half-Cauchy to the light-tailed half-normal.', to: 'student-t' },
      { text: '<b>Half-normal (no separate page).</b> The half-normal is $|Z|\\sigma$ for a standard normal $Z$, with density $\\tfrac{2}{\\sigma\\sqrt{2\\pi}}e^{-x^2/(2\\sigma^2)}$, mean $\\sigma\\sqrt{2/\\pi}$ and median $0.6745\\sigma$. It is the light-tailed alternative prior for a standard deviation; it is drawn as the dashed curve in the plot.', to: 'normal' },
      { text: '<b>Ratio of normals.</b> If $Z_1$ and $Z_2$ are independent standard normal variables, then $\\gamma |Z_1/Z_2|$ is half-Cauchy with scale $\\gamma$, and its square divided by $\\gamma^2$ has an $F(1, 1)$ distribution.', to: 'cauchy' },
      { text: '<b>Inverse-gamma mixture.</b> If $a \\sim \\mathrm{InvGamma}(\\tfrac12, 1/\\gamma^2)$ and $\\sigma^2 \\mid a \\sim \\mathrm{InvGamma}(\\tfrac12, 1/a)$, then $\\sigma \\sim \\mathrm{HalfCauchy}(\\gamma)$ (Wand et al., 2011). This representation lets Gibbs samplers and variational methods use half-Cauchy priors.', to: 'inverse-gamma' },
      { text: '<b>Reciprocal.</b> If $X$ is half-Cauchy with scale $\\gamma$, then $1/X$ is half-Cauchy with scale $1/\\gamma$, because $|Z_1/Z_2|$ and $|Z_2/Z_1|$ have the same distribution.' },
    ],

    uses: {
      frequentist: [
        '<b>Absolute t statistic with one degree of freedom.</b> The t statistic from a one-sample t-test with $n = 2$ observations has a Student’s t distribution with 1 degree of freedom, which is the standard Cauchy. Its absolute value, used for a two-sided test, is therefore half-Cauchy with $\\gamma = 1$.',
        '<b>Ratios of normal measurements.</b> The absolute value of the ratio of two independent zero-mean normal variables is half-Cauchy; this arises for example in the absolute slope of a line through the origin and a random normal point.',
        '<b>Robustness studies.</b> Because it has infinite mean and variance, the half-Cauchy is used in simulation studies to check how estimators of a scale behave when data have extremely heavy tails. Medians and quartiles remain well behaved; means and standard deviations do not.',
      ],
      bayesian: [
        '<b>Prior for a group-level standard deviation.</b> Gelman (2006) proposed $\\tau \\sim \\mathrm{HalfCauchy}(0, A)$ for the between-group standard deviation $\\tau$ in hierarchical models, with the scale $A$ set to a value that is large but not off the scale for the problem (he used $A = 25$ for the eight-schools example). Unlike $\\mathrm{InvGamma}(\\epsilon, \\epsilon)$ priors on the variance, it behaves well when $\\tau$ is close to 0.',
        '<b>Horseshoe prior.</b> In the horseshoe prior for sparse regression, each coefficient $\\beta_j \\sim \\mathcal N(0, \\lambda_j^2 \\tau^2)$ with local scales $\\lambda_j \\sim \\mathrm{HalfCauchy}(0, 1)$ and a global scale $\\tau$, often also half-Cauchy (Carvalho, Polson and Scott, 2010). Most coefficients are shrunk strongly toward 0 while large ones escape shrinkage because of the heavy tail.',
        '<b>Global scale parameters.</b> Polson and Scott (2012) recommended the half-Cauchy as a default prior for the global scale in normal hierarchical models because of its good frequentist risk properties.',
        '<b>Current recommendations.</b> The Stan prior-choice recommendations note that the half-Cauchy tail can be too heavy, which can slow MCMC sampling and allow implausibly large values; they often suggest half-normal, half-t (for example with 3 degrees of freedom) or exponential priors instead. The half-Cauchy is not conjugate, so posteriors are computed by MCMC.',
      ],
      modeling: [
        '<b>Hierarchical cognitive models.</b> Models fitted to many participants (for example drift-diffusion or reinforcement-learning models in Stan) often put half-Cauchy or half-normal priors on the standard deviations of the participant-level parameters.',
        '<b>Sparse signals.</b> Horseshoe priors with half-Cauchy local scales are used to find a few relevant predictors among many, for example in genomics and neuroimaging.',
        '<b>Geometric models.</b> A light source at distance $\\gamma$ from a straight wall that emits in a uniformly random direction hits the wall at a Cauchy-distributed position (the lighthouse problem); the distance from the point nearest the source is half-Cauchy.',
        '<b>Simulation.</b> To draw from the half-Cauchy, take a uniform random number $U$ and return $\\gamma\\tan(\\pi U/2)$, or take the absolute value of a Cauchy draw.',
      ],
    },

    references: [
      { text: 'Wikipedia: Cauchy distribution (related distributions).', url: 'https://en.wikipedia.org/wiki/Cauchy_distribution#Related_distributions' },
      { text: 'Wikipedia: Half-normal distribution.', url: 'https://en.wikipedia.org/wiki/Half-normal_distribution' },
      { text: 'Gelman, A. (2006). Prior distributions for variance parameters in hierarchical models. <i>Bayesian Analysis</i>, 1(3), 515–534.', url: 'https://doi.org/10.1214/06-BA117A' },
      { text: 'Polson, N. G., & Scott, J. G. (2012). On the half-Cauchy prior for a global scale parameter. <i>Bayesian Analysis</i>, 7(4), 887–902.', url: 'https://doi.org/10.1214/12-BA730' },
      { text: 'Carvalho, C. M., Polson, N. G., & Scott, J. G. (2010). The horseshoe estimator for sparse signals. <i>Biometrika</i>, 97(2), 465–480.', url: 'https://doi.org/10.1093/biomet/asq017' },
      { text: 'Wand, M. P., Ormerod, J. T., Padoan, S. A., & Frühwirth, R. (2011). Mean field variational Bayes for elaborate distributions. <i>Bayesian Analysis</i>, 6(4), 847–900.', url: 'https://doi.org/10.1214/11-BA631' },
      { text: 'Stan Development Team. Prior choice recommendations (wiki).', url: 'https://github.com/stan-dev/stan/wiki/Prior-Choice-Recommendations' },
      { text: 'Gelman, A., Carlin, J. B., Stern, H. S., Dunson, D. B., Vehtari, A., & Rubin, D. B. (2013). <i>Bayesian Data Analysis</i> (3rd ed.), Section 5.7. CRC Press.', url: 'http://www.stat.columbia.edu/~gelman/book/' },
      { text: 'Johnson, N. L., Kotz, S., & Balakrishnan, N. (1994). <i>Continuous Univariate Distributions</i>, Vol. 1 (2nd ed.), Chapter 16 (Cauchy distribution). Wiley.' },
    ],
  },
};

function fmtN(v) { return String(Number(v.toPrecision(4))).replace(/^-/, '−'); }
