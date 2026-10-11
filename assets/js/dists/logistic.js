// Logistic distribution with location mu and scale s.
// Follows the structure of the reference module dists/normal.js (see ARCHITECTURE.md).

import { catalogParams } from '../catalog.js';
import { normalCdf, LN_SQRT_2PI, PI } from '../core/math.js';

const SQRT3 = Math.sqrt(3);

function pdf(x, { mu, s }) {
  const e = Math.exp(-Math.abs(x - mu) / s);      // symmetric form, no overflow in either tail
  return e / (s * (1 + e) * (1 + e));
}
/** The logistic (sigmoid) function 1 / (1 + e^{-z}), accurate in both tails. */
function sigmoid(z) {
  if (z >= 0) return 1 / (1 + Math.exp(-z));
  const e = Math.exp(z);
  return e / (1 + e);
}
const cdf = (x, { mu, s }) => sigmoid((x - mu) / s);
const sf = (x, { mu, s }) => sigmoid(-(x - mu) / s);
function quantile(u, { mu, s }) {
  if (u <= 0) return -Infinity;
  if (u >= 1) return Infinity;
  return mu + s * (Math.log(u) - Math.log1p(-u));
}

export default {
  id: 'logistic',
  name: 'Logistic',
  kind: 'continuous',
  params: catalogParams('logistic'),

  pdf,
  cdf,
  sf,
  quantile,
  sample: (rng, { mu, s }) => rng.logistic(mu, s),

  testParams: [{ mu: -3, s: 0.1 }, { mu: 7, s: 5 }, { mu: 9.5, s: 0.4 }],

  range: () => [-Infinity, Infinity],
  /** μ ± 8s holds all but about 0.07% of the probability. */
  support: ({ mu, s }) => [mu - 8 * s, mu + 8 * s],

  stats({ mu, s }) {
    return {
      mean: mu, variance: s * s * PI * PI / 3, sd: s * PI / SQRT3, median: mu, mode: mu,
      skewness: 0, exKurtosis: 1.2, entropy: Math.log(s) + 2,
    };
  },

  //  - a vertical line at the center μ (where the CDF equals 1/2): drag it to move the curve;
  //  - a horizontal arrow from μ to μ + s at the height f(μ + s) (79% of the peak):
  //    drag its tip to change the scale s.
  handles: [
    { type: 'vline', param: 'mu' },
    {
      type: 'hArrow', param: 's',
      from: p => ({ x: p.mu, y: pdf(p.mu + p.s, p) }),
      to: p => ({ x: p.mu + p.s, y: pdf(p.mu + p.s, p) }),
      set: (pt, p) => ({ s: pt.x - p.mu }),
      ariaLabel: 'Scale s. Drag the arrow tip, or use the arrow keys.',
    },
  ],

  explorer: {
    readouts: [
      { key: 'mean', label: 'Mean, median and mode μ' },
      { key: 'sd', label: 'Standard deviation sπ/√3' },
      { label: 'Steepest slope of F, 1/(4s)', value: p => 1 / (4 * p.s) },
      { label: 'Middle 95% range', value: p => `${fmtN(quantile(0.025, p))} to ${fmtN(quantile(0.975, p))}` },
    ],
    overlays: p => {
      const sd = p.s * PI / SQRT3;
      return [{
        id: 'normal', label: 'Normal with the same mean and variance', cls: 'curve-ref',
        pdf: x => Math.exp(-0.5 * ((x - p.mu) / sd) ** 2 - LN_SQRT_2PI) / sd,
        cdf: x => normalCdf((x - p.mu) / sd),
      }];
    },
  },

  content: {
    summary: 'The logistic distribution is a symmetric bell curve similar to the normal but with slightly heavier tails, centered at $\\mu$ with scale $s$. Its cumulative distribution function is the S-shaped logistic (sigmoid) curve used in logistic regression.',
    description: [
      'The logistic distribution describes a continuous quantity that can take any real value and is symmetric about a center. Its density is a bell curve very similar to the normal, with slightly heavier tails. It is best known through its cumulative distribution function, the logistic or sigmoid curve, an S-shaped curve that rises from 0 to 1. The same curve describes the probability of a yes/no outcome in logistic regression, the probability of detecting a stimulus as it gets stronger, and the probability of answering a test item correctly as ability increases.',
      'It has two parameters. The location $\\mu$ is the center: the mean, the median and the mode, and the point where the CDF equals $\\tfrac12$. The scale $s$ sets the spread and how steeply the S-curve rises: the standard deviation is $s\\pi/\\sqrt3 \\approx 1.81\\,s$, and the steepest slope of the CDF is $1/(4s)$.',
      'The logistic distribution appears whenever log-odds are involved. If $X$ is logistic, the log-odds $\\ln[F(x)/(1 - F(x))]$ is the straight line $(x - \\mu)/s$. It is also the distribution of the difference between two independent Gumbel variables with the same scale, which is why random-utility models with Gumbel noise give logit choice probabilities.',
    ],
    explorerIntro: 'The left plot shows the density $f(x)$ and the right plot the cumulative distribution $F(x)$, the sigmoid curve. Drag the dashed amber line to move the center $\\mu$, and drag the tip of the amber arrow to change the scale $s$. The arrow runs from $\\mu$ to $\\mu + s$ at the height of the density there, about 79% of the peak. The dashed grey curve is a normal distribution with the same mean and variance; the two are hard to tell apart except in the tails, where the logistic is heavier.',

    pdfTex: 'f(x \\mid \\mu, s) = \\frac{e^{-(x-\\mu)/s}}{s\\left(1 + e^{-(x-\\mu)/s}\\right)^{2}} = \\frac{1}{4s}\\,\\operatorname{sech}^2\\!\\left(\\frac{x - \\mu}{2s}\\right)',
    glossary: [
      { sym: 'x', meaning: 'A possible value of the random variable $X$. It can be any real number.' },
      { sym: 'f(x \\mid \\mu, s)', meaning: 'The probability density at $x$ given the parameters. Probabilities are areas under this curve.' },
      { sym: '\\mu', meaning: 'The location: the center of the curve, which is the mean, the median and the mode.' },
      { sym: 's', meaning: 'The scale, a positive number. The standard deviation is $s\\pi/\\sqrt3$. A larger $s$ gives a wider density and a flatter S-shaped CDF.' },
      { sym: 'e', meaning: 'The base of natural logarithms, $e \\approx 2.71828$.' },
      { sym: '\\frac{x - \\mu}{s}', meaning: 'The distance of $x$ from the center in units of the scale $s$. It is also the log-odds $\\ln[F/(1-F)]$ at $x$.' },
      { sym: '\\operatorname{sech}(u)', meaning: 'The hyperbolic secant, $2/(e^{u} + e^{-u})$. The second form shows that the density is symmetric about $\\mu$.' },
      { sym: '\\frac{1}{4s}', meaning: 'The height of the peak at $x = \\mu$.' },
    ],

    cdfTex: 'F(x \\mid \\mu, s) = P(X \\le x) = \\frac{1}{1 + e^{-(x-\\mu)/s}} = \\sigma\\!\\left(\\frac{x - \\mu}{s}\\right)',
    cdfGlossary: [
      { sym: 'F(x \\mid \\mu, s)', meaning: 'The cumulative distribution function: the probability that $X$ is at most $x$, the area under the density to the left of $x$.' },
      { sym: 'P(X \\le x)', meaning: 'The probability that the random variable $X$ takes a value at most $x$.' },
      { sym: '\\sigma(z)', meaning: 'The logistic (sigmoid) function $1/(1 + e^{-z})$. It maps any real number to a probability between 0 and 1. Here $\\sigma$ is a function, not a standard deviation.' },
      { sym: '\\mu,\\ s', meaning: 'The location and the scale, as in the density. $F(\\mu) = \\tfrac12$.' },
      { sym: 'e', meaning: 'The base of natural logarithms, $e \\approx 2.71828$.' },
    ],

    extraFormulas: [
      {
        title: 'Quantile function (the logit)',
        intro: 'Inverting the CDF gives the logit, or log-odds, function. Applying it to a uniform random number is the usual way to simulate logistic values.',
        tex: 'Q(u) = \\mu + s \\ln\\frac{u}{1 - u} = \\mu + s\\,\\operatorname{logit}(u), \\qquad 0 < u < 1',
        glossary: [
          { sym: 'u', meaning: 'A probability between 0 and 1.' },
          { sym: '\\frac{u}{1-u}', meaning: 'The odds that correspond to the probability $u$.' },
          { sym: '\\operatorname{logit}(u)', meaning: 'The log-odds $\\ln[u/(1-u)]$, the inverse of the sigmoid function.' },
        ],
      },
      {
        title: 'Density in terms of the CDF',
        intro: 'The slope of the S-curve at any point is the product of the probabilities on either side, divided by $s$. This simple form is why the logistic is convenient in regression: the derivative of the log-likelihood has a closed form.',
        tex: 'f(x) = \\frac{1}{s}\\,F(x)\\,\\bigl(1 - F(x)\\bigr)',
        glossary: [
          { sym: 'F(x),\\ 1 - F(x)', meaning: 'The probabilities to the left and to the right of $x$.' },
        ],
      },
    ],

    properties: [
      { name: 'Support', tex: 'x \\in (-\\infty, \\infty)', explain: 'Every real number has positive density.' },
      { name: 'Mean', tex: '\\mathrm{E}[X] = \\mu', value: p => p.mu, explain: 'The long-run average value; the curve is symmetric about $\\mu$.' },
      { name: 'Median', tex: '\\mu', value: p => p.mu, explain: 'The point where the CDF crosses $\\tfrac12$: in logistic regression, the score at which both outcomes are equally likely.' },
      { name: 'Mode', tex: '\\mu', value: p => p.mu, explain: 'The peak of the density, where the CDF is steepest.' },
      { name: 'Variance', tex: '\\mathrm{Var}(X) = \\frac{s^2\\pi^2}{3}', value: p => p.s * p.s * PI * PI / 3, explain: 'The standard logistic ($s = 1$) has variance $\\pi^2/3 \\approx 3.29$. This number appears in multilevel logistic regression, where the latent residual variance on the logit scale is taken to be $\\pi^2/3$.' },
      { name: 'Standard deviation', tex: '\\frac{s\\pi}{\\sqrt3}', value: p => p.s * PI / SQRT3, explain: 'About $1.814\\,s$.' },
      { name: 'Skewness', tex: '0', value: () => 0, explain: 'The curve is symmetric.' },
      { name: 'Excess kurtosis', tex: '\\tfrac65 = 1.2', value: () => 1.2, explain: 'Positive: the tails are somewhat heavier than those of a normal distribution with the same variance. The density decays like $e^{-|x - \\mu|/s}$, exponentially rather than like $e^{-x^2}$.' },
      { name: 'Entropy', tex: '\\ln s + 2', value: p => Math.log(p.s) + 2, explain: 'Differential entropy in nats.' },
      { name: 'Moment-generating function', tex: 'M(t) = e^{\\mu t}\\,\\frac{\\pi s t}{\\sin(\\pi s t)}, \\quad |t| < 1/s', explain: '$\\mathrm{E}[e^{tX}]$, which equals $e^{\\mu t} B(1 - st, 1 + st)$ with $B$ the beta function. It is finite only for $|t| < 1/s$ because the tails are exponential.' },
      { name: 'Characteristic function', tex: '\\varphi(t) = e^{i\\mu t}\\,\\frac{\\pi s t}{\\sinh(\\pi s t)}', explain: '$\\mathrm{E}[e^{itX}]$, where $i = \\sqrt{-1}$ and $\\sinh$ is the hyperbolic sine.' },
      { name: 'Quantile function', tex: 'Q(u) = \\mu + s\\ln\\frac{u}{1 - u}', value: p => `${fmtN(quantile(0.975, p))} (u = 0.975)`, explain: 'For $u = 0.975$ the value is $\\mu + s\\ln 39 \\approx \\mu + 3.66\\,s$, which is $2.02$ standard deviations above the mean (1.96 for a normal).' },
      { name: 'Hazard function', tex: 'h(x) = \\frac{f(x)}{1 - F(x)} = \\frac{F(x)}{s}', value: p => `${fmtN(1 / (2 * p.s))} at x = μ`, explain: 'The hazard rises from 0 and levels off at $1/s$ for large $x$.' },
      { name: 'Peak height', tex: 'f(\\mu) = \\frac{1}{4s}', value: p => 1 / (4 * p.s), explain: 'Also the steepest slope of the S-shaped CDF, reached at $x = \\mu$.' },
      { name: 'Logit and probit', tex: '\\sigma(z) \\approx \\Phi(z / 1.702)', explain: 'The standard logistic CDF $\\sigma$ differs from the standard normal CDF $\\Phi$ stretched by a factor 1.702 by less than 0.01 everywhere. This is why logistic regression coefficients are about 1.6 to 1.8 times as large as probit coefficients fitted to the same data.' },
    ],

    limits: [
      { text: '<b>Standard logistic.</b> With $\\mu = 0$ and $s = 1$ the CDF is the sigmoid function $\\sigma(x) = 1/(1 + e^{-x})$ and the density is $\\sigma(x)(1 - \\sigma(x))$. Any logistic variable can be standardized as $(X - \\mu)/s$.' },
      { text: '<b>Close to the normal.</b> The logistic is not a limit of the normal or the other way round, but $\\mathrm{Logistic}(0, 1)$ is close to a normal with standard deviation 1.6 to 1.8. The logistic is a scale mixture of normal distributions (Stefanski, 1991).', to: 'normal' },
      { text: '<b>Logit of a uniform variable.</b> If $U$ is uniform on $(0, 1)$, then $\\mu + s\\ln[U/(1 - U)]$ is $\\mathrm{Logistic}(\\mu, s)$; conversely, $F(X)$ is uniform. This is how logistic values are simulated.', relation: 'uniform--logistic', to: 'uniform' },
      { text: '<b>Log-logistic.</b> If $X$ is logistic, then $e^X$ has the log-logistic (Fisk) distribution, used for survival times and incomes.' },
    ],

    uses: {
      frequentist: [
        '<b>Logistic regression.</b> The probability of a binary outcome is modeled as $\\sigma(\\eta)$, where $\\eta$ is a linear combination of predictors. Equivalently, a hidden score $\\eta + \\varepsilon$ with logistic noise $\\varepsilon$ is compared with 0. Coefficients are log odds ratios and are estimated by maximum likelihood.',
        '<b>Ordinal and multinomial models.</b> The proportional-odds (ordered logit) model cuts a latent logistic variable at several thresholds. Conditional and multinomial logit models for choices among several options come from Gumbel noise, whose pairwise differences are logistic.',
        '<b>Item response theory.</b> The Rasch model and the two- and three-parameter logistic models give the probability of a correct answer as a logistic function of the difference between a person’s ability and the item’s difficulty.',
        '<b>Paired comparisons.</b> The Bradley–Terry model gives the probability that item $i$ beats item $j$ as $\\sigma(\\theta_i - \\theta_j)$; the Elo rating system for chess uses the same curve.',
        '<b>Logit transformation of proportions.</b> Proportions are often analyzed on the log-odds scale, where the logistic distribution is the natural error distribution.',
      ],
      bayesian: [
        '<b>Likelihood in Bayesian logistic regression.</b> There is no conjugate prior for logistic regression coefficients. Posteriors are computed with Markov chain Monte Carlo, with the Laplace approximation, or with Pólya–Gamma data augmentation (Polson, Scott & Windle, 2013), which turns the logistic likelihood into a normal one conditional on auxiliary variables.',
        '<b>A uniform prior on a probability.</b> If $p$ is uniform on $(0, 1)$, then $\\operatorname{logit}(p)$ has the standard logistic distribution. A $\\mathrm{Logistic}(0, 1)$ prior on a log-odds parameter is therefore the same as a uniform prior on the probability, a useful default in cognitive models fitted on the logit scale.',
        '<b>Priors for coefficients on the log-odds scale.</b> Weakly informative priors such as $\\mathrm{Cauchy}(0, 2.5)$ or Student’s $t$ are usually put on logistic regression coefficients (Gelman et al., 2008); a logistic prior is a lighter-tailed alternative.',
      ],
      modeling: [
        '<b>Psychometric functions.</b> The probability of detecting or discriminating a stimulus is often modeled as a logistic function of stimulus intensity, with $\\mu$ the threshold and $1/s$ setting the slope. The equivalent normal-based version is the cumulative Gaussian.',
        '<b>Choice and reinforcement-learning models.</b> With two options, the softmax choice rule reduces to $P(\\text{choose 1}) = \\sigma((v_1 - v_2)/\\tau)$, a logistic function of the value difference $v_1 - v_2$, where $\\tau$ is the temperature. Many papers write it with the inverse temperature instead, $\\sigma(\\beta(v_1 - v_2))$ with $\\beta = 1/\\tau$.',
        '<b>Neural networks.</b> The sigmoid activation function of a unit is the standard logistic CDF.',
        '<b>Growth curves.</b> The logistic growth model for populations, epidemics and the spread of innovations follows the same S-shaped curve over time.',
      ],
    },

    references: [
      { text: 'Wikipedia: Logistic distribution.', url: 'https://en.wikipedia.org/wiki/Logistic_distribution' },
      { text: 'Johnson, N. L., Kotz, S., & Balakrishnan, N. (1995). <i>Continuous Univariate Distributions</i>, Vol. 2 (2nd ed.), Chapter 23. Wiley.' },
      { text: 'Balakrishnan, N. (Ed.) (1992). <i>Handbook of the Logistic Distribution</i>. Marcel Dekker.' },
      { text: 'Agresti, A. (2013). <i>Categorical Data Analysis</i> (3rd ed.), Chapters 4–5 and 8. Wiley.' },
      { text: 'Polson, N. G., Scott, J. G., & Windle, J. (2013). Bayesian inference for logistic models using Pólya–Gamma latent variables. <i>Journal of the American Statistical Association</i>, 108(504), 1339–1349.', url: 'https://doi.org/10.1080/01621459.2013.829001' },
      { text: 'Stefanski, L. A. (1991). A normal scale mixture representation of the logistic distribution. <i>Statistics & Probability Letters</i>, 11(1), 69–70.', url: 'https://doi.org/10.1016/0167-7152(91)90181-P' },
      { text: 'Leemis, L. M., & McQueston, J. T. (2008). Univariate distribution relationships. <i>The American Statistician</i>, 62(1), 45–53.', url: 'https://doi.org/10.1198/000313008X270448' },
    ],
  },
};

function fmtN(v) { return String(Number(v.toPrecision(4))).replace(/^-/, '−'); }
