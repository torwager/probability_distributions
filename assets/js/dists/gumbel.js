// Gumbel distribution (maximum type, extreme value type I) with location mu (the mode) and scale beta.
// Follows the structure of the reference module dists/normal.js (see ARCHITECTURE.md).

import { catalogParams } from '../catalog.js';
import { EULER_GAMMA, PI } from '../core/math.js';

const ZETA3 = 1.2020569031595942;                         // Apéry's constant ζ(3)
const SKEW = 12 * Math.sqrt(6) * ZETA3 / (PI * PI * PI);   // 1.1395...
const LNLN2 = Math.log(Math.LN2);                          // ln(ln 2) = -0.3665...

function pdf(x, { mu, beta }) {
  const z = (x - mu) / beta;
  const v = -z - Math.exp(-z);
  return v < -745 ? 0 : Math.exp(v) / beta;
}
function cdf(x, { mu, beta }) {
  const z = (x - mu) / beta;
  if (Number.isNaN(z)) return NaN;
  return Math.exp(-Math.exp(-z));
}
/** 1 - F(x), accurate in the upper tail. */
function sf(x, { mu, beta }) {
  const z = (x - mu) / beta;
  return -Math.expm1(-Math.exp(-z));
}
function quantile(u, { mu, beta }) {
  if (u <= 0) return -Infinity;
  if (u >= 1) return Infinity;
  return mu - beta * Math.log(-Math.log(u));
}
const mode = p => p.mu;
const mean = p => p.mu + EULER_GAMMA * p.beta;
const median = p => p.mu - p.beta * LNLN2;

export default {
  id: 'gumbel',
  name: 'Gumbel',
  kind: 'continuous',
  params: catalogParams('gumbel'),

  pdf,
  cdf,
  sf,
  quantile,
  sample: (rng, { mu, beta }) => rng.gumbel(mu, beta),

  testParams: [{ mu: -3, beta: 0.1 }, { mu: 7, beta: 5 }, { mu: 9.5, beta: 0.3 }],

  range: () => [-Infinity, Infinity],
  /** From about the 0.00002 quantile to about the 0.9996 quantile. */
  support: ({ mu, beta }) => [mu - 2.4 * beta, mu + 7.8 * beta],

  stats(p) {
    const { beta } = p;
    return {
      mean: mean(p), variance: PI * PI * beta * beta / 6, sd: PI * beta / Math.sqrt(6),
      median: median(p), mode: mode(p),
      skewness: SKEW, exKurtosis: 2.4, entropy: Math.log(beta) + EULER_GAMMA + 1,
    };
  },

  //  - a vertical line at the mode μ (the peak): drag it to move the curve;
  //  - a horizontal arrow from μ to μ + β at the height f(μ + β) (69% of the peak):
  //    drag its tip to change the scale β.
  handles: [
    { type: 'vline', param: 'mu', ariaLabel: 'Location μ (the mode, where the peak is). Drag left or right, or use the arrow keys.' },
    {
      type: 'hArrow', param: 'beta',
      from: p => ({ x: p.mu, y: pdf(p.mu + p.beta, p) }),
      to: p => ({ x: p.mu + p.beta, y: pdf(p.mu + p.beta, p) }),
      set: (pt, p) => ({ beta: pt.x - p.mu }),
      ariaLabel: 'Scale β. Drag the arrow tip, or use the arrow keys.',
    },
  ],

  explorer: {
    readouts: [
      { key: 'mode', label: 'Mode μ' },
      { key: 'median', label: 'Median μ − β ln ln 2' },
      { key: 'mean', label: 'Mean μ + 0.5772β' },
      { key: 'sd', label: 'Standard deviation πβ/√6' },
      { label: '100-year return level (99th percentile)', value: p => quantile(0.99, p) },
    ],
    // the mean sits to the right of the mode (the distribution is skewed to the right)
    extraLayers: p => {
      const m = mean(p), top = 0.45 * pdf(p.mu, p);   // kept below the β arrow (at 69% of the peak)
      return [
        { id: 'mean-seg', type: 'segment', x1: m, y1: 0, x2: m, y2: top, cls: 'mean-line' },
        { id: 'mean-lab', type: 'text', x: m, y: 0.3 * pdf(p.mu, p), dx: 6, anchor: 'start', text: 'mean', cls: 'label' },
      ];
    },
  },

  content: {
    summary: 'The Gumbel distribution is a common model for the largest of many random values, such as the highest river level of each year, with location $\\mu$ (the mode) and scale $\\beta$. It is used for flood and wind risk, and in choice models, where Gumbel noise gives the softmax rule.',
    description: [
      'The Gumbel distribution describes the largest of many random values. If you record the highest river level of each year, the strongest wind gust of each month or the best score among many candidates, the maxima tend to follow a Gumbel distribution, provided the individual values have tails that are lighter than any power law (as normal, exponential and gamma values do). It is also called the extreme value type I distribution. It takes any real value and is skewed to the right: very high maxima are possible, but values far below the typical maximum are almost impossible.',
      'It has two parameters. The location $\\mu$ is the mode, the most likely value. The scale $\\beta$ sets the spread: the standard deviation is $\\pi\\beta/\\sqrt6 \\approx 1.28\\,\\beta$, and the mean $\\mu + 0.5772\\,\\beta$ lies to the right of the mode. This page uses the maximum type; the minimum type, used for the weakest link in a chain or the first failure, is its mirror image $-X$.',
      'The Gumbel distribution is also central to models of choice. If each option’s value is perturbed by independent Gumbel noise with scale $\\beta$ and the option with the largest noisy value is chosen, the choice probabilities follow the softmax rule with temperature $\\beta$.',
    ],
    explorerIntro: 'The left plot shows the density $f(x)$ and the right plot the cumulative distribution $F(x)$. Drag the dashed amber line to move the mode $\\mu$, and drag the tip of the amber arrow to change the scale $\\beta$. The arrow runs from $\\mu$ to $\\mu + \\beta$ at the height of the density there, about 69% of the peak. The short dotted steel line near the axis marks the mean, which lies $0.5772\\,\\beta$ to the right of the mode because of the long right tail.',

    pdfTex: 'f(x \\mid \\mu, \\beta) = \\frac{1}{\\beta}\\, \\exp\\!\\left(-z - e^{-z}\\right), \\qquad z = \\frac{x - \\mu}{\\beta}',
    glossary: [
      { sym: 'x', meaning: 'A possible value of the random variable $X$ (for example, this year’s maximum). It can be any real number.' },
      { sym: 'f(x \\mid \\mu, \\beta)', meaning: 'The probability density at $x$ given the parameters. Probabilities are areas under this curve.' },
      { sym: '\\mu', meaning: 'The location: the mode (peak) of the density. It is not the mean.' },
      { sym: '\\beta', meaning: 'The scale, a positive number that sets the spread. The standard deviation is $\\pi\\beta/\\sqrt6$. In choice models it is the softmax temperature.' },
      { sym: 'z', meaning: 'The standardized value: the distance of $x$ from the mode in units of $\\beta$.' },
      { sym: '\\exp(\\cdot),\\ e', meaning: 'The exponential function; $e \\approx 2.71828$ is the base of natural logarithms.' },
      { sym: '-z - e^{-z}', meaning: 'The log of the density (up to $-\\ln\\beta$). The term $-z$ makes the right tail decay exponentially; the term $-e^{-z}$ makes the left tail vanish extremely fast (a double exponential), which gives the skewed shape.' },
    ],

    cdfTex: 'F(x \\mid \\mu, \\beta) = P(X \\le x) = \\exp\\!\\left(-e^{-(x - \\mu)/\\beta}\\right)',
    cdfGlossary: [
      { sym: 'F(x \\mid \\mu, \\beta)', meaning: 'The cumulative distribution function: the probability that $X$ is at most $x$. For annual maxima, the probability that the largest value of the year does not exceed $x$.' },
      { sym: 'P(X \\le x)', meaning: 'The probability that the random variable $X$ takes a value at most $x$.' },
      { sym: '\\mu,\\ \\beta', meaning: 'The location (mode) and the scale, as in the density. $F(\\mu) = e^{-1} \\approx 0.368$.' },
      { sym: '\\exp(\\cdot),\\ e', meaning: 'The exponential function and its base. The CDF is an exponential of an exponential, which is why the Gumbel is sometimes called the double exponential distribution (a name also used for the Laplace).' },
    ],

    extraFormulas: [
      {
        title: 'Quantile function and return levels',
        intro: 'Inverting the CDF gives the value exceeded with probability $1 - u$. In hydrology the $T$-year return level is the quantile with $u = 1 - 1/T$: the level exceeded on average once every $T$ years.',
        tex: 'Q(u) = \\mu - \\beta \\ln(-\\ln u), \\qquad x_T = \\mu - \\beta\\ln\\!\\left[-\\ln\\left(1 - \\tfrac1T\\right)\\right] \\approx \\mu + \\beta \\ln T',
        glossary: [
          { sym: 'u', meaning: 'A probability between 0 and 1.' },
          { sym: 'T', meaning: 'The return period, for example 100 years.' },
          { sym: 'x_T', meaning: 'The return level: the annual maximum exceeded with probability $1/T$ in any given year.' },
        ],
      },
      {
        title: 'Gumbel noise gives the softmax rule',
        intro: 'If option $j$ has value $v_j$ and independent noise $\\varepsilon_j \\sim \\mathrm{Gumbel}(0, \\beta)$, the probability that option $i$ has the largest noisy value is the softmax of the values.',
        tex: 'P\\Big(i = \\arg\\max_j\\, (v_j + \\varepsilon_j)\\Big) = \\frac{e^{v_i/\\beta}}{\\sum_{j} e^{v_j/\\beta}}',
        glossary: [
          { sym: 'v_j', meaning: 'The deterministic value (utility) of option $j$.' },
          { sym: '\\varepsilon_j', meaning: 'Independent Gumbel noise added to each option.' },
          { sym: '\\arg\\max_j', meaning: 'The option $j$ at which the noisy value is largest.' },
          { sym: '\\beta', meaning: 'The noise scale, which plays the role of the softmax temperature: large $\\beta$ makes choices nearly random, small $\\beta$ makes them nearly deterministic.' },
        ],
      },
    ],

    properties: [
      { name: 'Support', tex: 'x \\in (-\\infty, \\infty)', explain: 'Every real number has positive density, but the left tail is extremely thin: values more than about $2.5\\beta$ below the mode are very rare.' },
      { name: 'Mean', tex: '\\mathrm{E}[X] = \\mu + \\gamma_{\\mathrm E}\\,\\beta', value: mean, explain: 'Here $\\gamma_{\\mathrm E} \\approx 0.5772$ is the Euler–Mascheroni constant. The mean lies to the right of the mode because of the long right tail.' },
      { name: 'Median', tex: '\\mu - \\beta\\ln(\\ln 2)', value: median, explain: 'About $\\mu + 0.3665\\,\\beta$, between the mode and the mean.' },
      { name: 'Mode', tex: '\\mu', value: mode, explain: 'The peak of the density. At the mode the CDF equals $e^{-1} \\approx 0.368$.' },
      { name: 'Variance', tex: '\\mathrm{Var}(X) = \\frac{\\pi^2}{6}\\beta^2', value: p => PI * PI * p.beta * p.beta / 6, explain: 'About $1.645\\,\\beta^2$. It does not depend on $\\mu$.' },
      { name: 'Standard deviation', tex: '\\frac{\\pi\\beta}{\\sqrt6}', value: p => PI * p.beta / Math.sqrt(6), explain: 'About $1.283\\,\\beta$. The method-of-moments estimates are therefore $\\hat\\beta = s\\sqrt6/\\pi$ and $\\hat\\mu = \\bar x - 0.5772\\,\\hat\\beta$, with $\\bar x$ and $s$ the sample mean and standard deviation.' },
      { name: 'Skewness', tex: '\\frac{12\\sqrt6\\,\\zeta(3)}{\\pi^3} \\approx 1.140', value: () => SKEW, explain: 'Positive and the same for every $\\mu$ and $\\beta$: the right tail is longer. Here $\\zeta(3) \\approx 1.202$ is Apéry’s constant, the sum $1 + 1/2^3 + 1/3^3 + \\cdots$.' },
      { name: 'Excess kurtosis', tex: '\\tfrac{12}{5} = 2.4', value: () => 2.4, explain: 'The same for every $\\mu$ and $\\beta$; positive because of the long right tail.' },
      { name: 'Entropy', tex: '\\ln\\beta + \\gamma_{\\mathrm E} + 1', value: p => Math.log(p.beta) + EULER_GAMMA + 1, explain: 'Differential entropy in nats, with $\\gamma_{\\mathrm E} \\approx 0.5772$ the Euler–Mascheroni constant.' },
      { name: 'Moment-generating function', tex: 'M(t) = \\Gamma(1 - \\beta t)\\,e^{\\mu t}, \\quad t < 1/\\beta', explain: '$\\mathrm{E}[e^{tX}]$, where $\\Gamma$ is the gamma function. It is finite only for $t < 1/\\beta$ because the right tail is exponential.' },
      { name: 'Characteristic function', tex: '\\varphi(t) = \\Gamma(1 - i\\beta t)\\,e^{i\\mu t}', explain: '$\\mathrm{E}[e^{itX}]$, where $i = \\sqrt{-1}$.' },
      { name: 'Quantile function', tex: 'Q(u) = \\mu - \\beta\\ln(-\\ln u)', value: p => `${fmtN(quantile(0.99, p))} (u = 0.99)`, explain: 'The value column shows the 99th percentile, the 100-year return level for annual maxima: about $\\mu + 4.60\\,\\beta$.' },
      { name: 'Max-stability', tex: '\\max(X_1, \\dots, X_n) \\sim \\mathrm{Gumbel}(\\mu + \\beta\\ln n,\\ \\beta)', explain: 'The maximum of $n$ independent $\\mathrm{Gumbel}(\\mu, \\beta)$ variables is again Gumbel, shifted to the right by $\\beta\\ln n$ with the same scale. This property is why the Gumbel is a possible limit for maxima.' },
    ],

    limits: [
      { text: '<b>Maximum of exponential variables.</b> If $X_1, \\dots, X_n$ are independent $\\mathrm{Exp}(1)$, then $\\max_i X_i - \\ln n \\xrightarrow{d} \\mathrm{Gumbel}(0, 1)$ as $n \\to \\infty$. Maxima of normal, gamma, log-normal and other variables with tails lighter than any power law also approach a Gumbel distribution after centering and scaling (for normal variables the approach is slow).', relation: 'exponential--gumbel', to: 'exponential' },
      { text: '<b>Logarithm of a Weibull variable.</b> If $W$ is Weibull with shape $k$ and scale $\\lambda$, then $-\\ln W \\sim \\mathrm{Gumbel}(-\\ln\\lambda, 1/k)$. The exponential is the case $k = 1$: for $X \\sim \\mathrm{Exp}(\\lambda)$ (rate $\\lambda$), $-\\ln X \\sim \\mathrm{Gumbel}(\\ln\\lambda, 1)$.', to: 'weibull' },
      { text: '<b>Generalized extreme value family.</b> The Gumbel is the generalized extreme value (GEV) distribution with shape $\\xi = 0$. The GEV with $\\xi > 0$ (Fréchet type, power-law tails as in the Pareto) and $\\xi < 0$ (reversed Weibull type, bounded above) covers the other possible limits of maxima (Fisher–Tippett–Gnedenko theorem).' },
      { text: '<b>Standard Gumbel.</b> With $\\mu = 0$ and $\\beta = 1$ the CDF is $\\exp(-e^{-x})$, with mean $0.5772$ and variance $\\pi^2/6$. If $U$ is uniform on $(0, 1)$, $-\\ln(-\\ln U)$ is standard Gumbel.' },
      { text: '<b>Minimum type.</b> If $X$ is Gumbel (maximum type), $-X$ has the minimum-type Gumbel distribution, the limit for minima, used for the strength of materials.' },
    ],

    uses: {
      frequentist: [
        '<b>Extreme value analysis.</b> In the block-maxima method, the annual (or monthly) maxima of floods, rainfall, wind speeds, temperatures or insurance losses are fitted with a Gumbel or GEV distribution by maximum likelihood or by probability-weighted moments, and return levels such as the 100-year flood are read off the fitted quantile function. Gumbel probability paper plots $-\\ln(-\\ln \\hat F)$ against the ordered maxima, which gives a straight line for Gumbel data.',
        '<b>Multinomial and conditional logit models.</b> McFadden’s conditional logit model, the standard model for discrete choice in econometrics and transport research, assumes independent Gumbel errors on the utilities, which gives logit choice probabilities.',
        '<b>Significance of maximal scores.</b> The best local alignment score between two random sequences approximately follows a Gumbel distribution; BLAST E-values and p-values for database searches are computed from it (Karlin & Altschul, 1990). Similar Gumbel approximations are used for the maximum of many test statistics.',
      ],
      bayesian: [
        '<b>Likelihood for extremes.</b> Bayesian extreme value analysis puts priors on $\\mu$ and $\\beta$ (and on the GEV shape) and reports posterior distributions of return levels. There is no conjugate prior.',
        '<b>Gumbel-softmax (Concrete) relaxation.</b> Replacing the arg max in the Gumbel-max trick by a softmax with a temperature gives a smooth approximation to sampling a category, which lets variational autoencoders and other models with discrete latent variables be trained by gradient descent (Jang, Gu & Poole, 2017; Maddison, Mnih & Teh, 2017).',
        '<b>Sampling from categorical posteriors.</b> The Gumbel-max trick draws from a categorical distribution given only unnormalized log-probabilities, without computing the normalizing constant.',
      ],
      modeling: [
        '<b>Softmax choice in reinforcement learning and decision making.</b> The softmax rule $P(i) \\propto e^{v_i/\\beta}$ used in reinforcement-learning and decision models is equivalent to choosing the option with the largest value plus independent Gumbel noise of scale $\\beta$ (Luce, 1959; McFadden, 1974; Yellott, 1977).',
        '<b>Gumbel-max trick.</b> Adding independent standard Gumbel noise to the log-probabilities $\\ln p_j$ and taking the arg max gives a draw from the categorical distribution with probabilities $p_j$. Taking the top $k$ instead gives a sample of $k$ categories without replacement.',
        '<b>Hydrology, meteorology and engineering.</b> Design floods, wind loads and wave heights are set from Gumbel or GEV return levels (Gumbel, 1958).',
        '<b>Reliability.</b> The minimum-type Gumbel describes the strength of a chain or a material that fails at its weakest point, and the time to first failure among many components.',
      ],
    },

    references: [
      { text: 'Wikipedia: Gumbel distribution.', url: 'https://en.wikipedia.org/wiki/Gumbel_distribution' },
      { text: 'Wikipedia: Generalized extreme value distribution.', url: 'https://en.wikipedia.org/wiki/Generalized_extreme_value_distribution' },
      { text: 'Gumbel, E. J. (1958). <i>Statistics of Extremes</i>. Columbia University Press.' },
      { text: 'Coles, S. (2001). <i>An Introduction to Statistical Modeling of Extreme Values</i>. Springer.', url: 'https://doi.org/10.1007/978-1-4471-3675-0' },
      { text: 'Johnson, N. L., Kotz, S., & Balakrishnan, N. (1995). <i>Continuous Univariate Distributions</i>, Vol. 2 (2nd ed.), Chapter 22. Wiley.' },
      { text: 'McFadden, D. (1974). Conditional logit analysis of qualitative choice behavior. In P. Zarembka (Ed.), <i>Frontiers in Econometrics</i> (pp. 105–142). Academic Press.' },
      { text: 'Yellott, J. I. (1977). The relationship between Luce’s choice axiom, Thurstone’s theory of comparative judgment, and the double exponential distribution. <i>Journal of Mathematical Psychology</i>, 15(2), 109–144.', url: 'https://doi.org/10.1016/0022-2496(77)90026-8' },
      { text: 'Luce, R. D. (1959). <i>Individual Choice Behavior: A Theoretical Analysis</i>. Wiley.' },
      { text: 'Karlin, S., & Altschul, S. F. (1990). Methods for assessing the statistical significance of molecular sequence features by using general scoring schemes. <i>Proceedings of the National Academy of Sciences</i>, 87(6), 2264–2268.', url: 'https://doi.org/10.1073/pnas.87.6.2264' },
      { text: 'Maddison, C. J., Mnih, A., & Teh, Y. W. (2017). The Concrete distribution: A continuous relaxation of discrete random variables. <i>International Conference on Learning Representations</i>.', url: 'https://arxiv.org/abs/1611.00712' },
      { text: 'Jang, E., Gu, S., & Poole, B. (2017). Categorical reparameterization with Gumbel-softmax. <i>International Conference on Learning Representations</i>.', url: 'https://arxiv.org/abs/1611.01144' },
      { text: 'Leemis, L. M., & McQueston, J. T. (2008). Univariate distribution relationships. <i>The American Statistician</i>, 62(1), 45–53.', url: 'https://doi.org/10.1198/000313008X270448' },
    ],
  },
};

function fmtN(v) { return String(Number(v.toPrecision(4))).replace(/^-/, '−'); }
