// Continuous uniform distribution on [a, b]. Follows the structure of the reference module dists/normal.js.

import { catalogParams } from '../catalog.js';

const GAP = 0.1;          // smallest allowed width b - a (keeps the density finite while dragging)
const A_MIN = -5, B_MAX = 10;

function pdf(x, { a, b }) {
  return x >= a && x <= b ? 1 / (b - a) : 0;
}
function cdf(x, { a, b }) {
  if (x <= a) return 0;
  if (x >= b) return 1;
  return (x - a) / (b - a);
}

/** Keep a < b: push the end that was not changed, and stay inside the parameter ranges. */
function normalize(p, changedKey) {
  const q = { ...p };
  if (q.b - q.a < GAP) {
    if (changedKey === 'b') {
      q.a = q.b - GAP;
      if (q.a < A_MIN) { q.a = A_MIN; q.b = A_MIN + GAP; }
    } else {
      q.b = q.a + GAP;
      if (q.b > B_MAX) { q.b = B_MAX; q.a = B_MAX - GAP; }
    }
  }
  return q;
}

export default {
  id: 'uniform',
  name: 'Uniform (continuous)',
  kind: 'continuous',

  params: catalogParams('uniform', { a: { step: 0.1 }, b: { step: 0.1 } }),

  pdf,
  cdf,
  sf: (x, p) => 1 - cdf(x, p),
  quantile: (u, { a, b }) => a + u * (b - a),
  sample: (rng, { a, b }) => rng.uniform(a, b),
  normalize,

  testParams: [{ a: -5, b: 10 }, { a: 2, b: 2.3 }, { a: -3, b: -1 }],

  range: ({ a, b }) => [a, b],
  // show a margin of a quarter of the width on each side, so that the jumps at a and b are visible
  support: ({ a, b }) => [a - 0.25 * (b - a), b + 0.25 * (b - a)],

  stats({ a, b }) {
    const w = b - a;
    return {
      mean: (a + b) / 2, variance: w * w / 12, sd: w / Math.sqrt(12), median: (a + b) / 2, mode: (a + b) / 2,
      skewness: 0, exKurtosis: -6 / 5, entropy: Math.log(w),
    };
  },

  // Handles:
  //  - a dashed line at each end of the interval (drag to move a or b; the other end is pushed along if needed);
  //  - a knob in the middle of the top edge of the rectangle that slides the whole interval, keeping its width.
  handles: [
    { type: 'vline', param: 'a', label: 'a', ariaLabel: 'Lower bound a. Drag left or right, or use the arrow keys.' },
    { type: 'vline', param: 'b', label: 'b', ariaLabel: 'Upper bound b. Drag left or right, or use the arrow keys.' },
    {
      type: 'point', id: 'shift', param: 'a', keyX: 'a', keyY: 'b', label: '↔',
      key: 'drag',
      ariaLabel: 'Slide the whole interval. Drag left or right, or use the arrow keys.',
      at: p => ({ x: (p.a + p.b) / 2, y: pdf((p.a + p.b) / 2, p) }),
      set: (pt, p, p0) => {
        const w = p0.b - p0.a;
        let a = pt.x - w / 2;
        a = Math.max(A_MIN, Math.min(B_MAX - w, Math.min(5, a)));
        return { a, b: a + w };
      },
    },
  ],

  explorer: {
    areaLabels: ['c', 'd'],
    // start the area tool away from the midpoint, where the sliding knob sits
    areaDefault: p => p.a + 0.3 * (p.b - p.a),
    readouts: [
      { key: 'mean', label: 'Mean (a + b)/2' },
      { key: 'sd', label: 'Standard deviation' },
      { label: 'Width b − a', value: p => fmtN(p.b - p.a) },
      { label: 'Height 1/(b − a)', value: p => fmtN(1 / (p.b - p.a)) },
    ],
  },

  content: {
    summary: 'The continuous uniform distribution describes a quantity that is equally likely to fall anywhere between a lower bound $a$ and an upper bound $b$. The standard uniform on $(0, 1)$ is the starting point for generating random draws from other distributions.',
    description: [
      'The continuous uniform distribution describes a quantity that is equally likely to fall anywhere in an interval from $a$ to $b$, and never outside it. Its density is flat: a rectangle over $[a, b]$ whose height $1/(b - a)$ makes the total area equal to 1. A familiar example is the position at which a spinning pointer stops, measured along the rim, or the rounding error when a measurement is rounded to the nearest whole unit (uniform between $-0.5$ and $0.5$).',
      'The two parameters are the ends of the interval: the lower bound $a$ and the upper bound $b$, with $a < b$. The probability of landing in any sub-interval is its length divided by $b - a$. The standard uniform $\\mathrm U(0, 1)$ is the starting point of almost all random-number generation: computers produce uniform numbers on $(0, 1)$ and transform them into draws from other distributions.',
    ],
    explorerIntro: 'The left plot shows the density $f(x)$, a flat rectangle, and the right plot the cumulative distribution $F(x)$, a straight ramp from 0 at $a$ to 1 at $b$. Drag the dashed amber line marked $a$ to move the lower bound and the one marked $b$ to move the upper bound; if one end is pushed past the other, the other end moves along. Drag the knob in the middle of the top edge to slide the whole interval without changing its width. A wider interval gives a lower rectangle, because the area must stay 1. In the “Between” mode of the area tool, the two boundaries of the shaded region are labeled $c$ and $d$, so that they are not confused with the parameters $a$ and $b$.',

    pdfTex: 'f(x \\mid a, b) = \\begin{cases} 1/(b-a) & \\text{for } a \\le x \\le b, \\\\ 0 & \\text{otherwise} \\end{cases}',
    glossary: [
      { sym: 'x', meaning: 'A possible value of the random variable $X$.' },
      { sym: 'f(x \\mid a, b)', meaning: 'The probability density at $x$ given the two bounds. Probabilities are areas under this flat curve.' },
      { sym: 'a', meaning: 'The lower bound: the smallest possible value.' },
      { sym: 'b', meaning: 'The upper bound: the largest possible value. It must be larger than $a$.' },
      { sym: '1/(b-a)', meaning: 'The constant height of the density. It is chosen so that the rectangle of width $b - a$ has area 1.' },
    ],

    cdfTex: 'F(x \\mid a, b) = P(X \\le x) = \\begin{cases} 0 & \\text{for } x < a, \\\\ (x-a)/(b-a) & \\text{for } a \\le x \\le b, \\\\ 1 & \\text{for } x > b \\end{cases}',
    cdfGlossary: [
      { sym: 'F(x \\mid a, b)', meaning: 'The cumulative distribution function: the probability that $X$ is at most $x$, which is the area of the rectangle to the left of $x$.' },
      { sym: 'P(X \\le x)', meaning: 'The probability that the random variable $X$ takes a value at most $x$.' },
      { sym: '(x-a)/(b-a)', meaning: 'The fraction of the interval that lies to the left of $x$. The CDF rises in a straight line from 0 to 1 across the interval.' },
      { sym: 'a,\\ b', meaning: 'The lower and upper bounds of the interval.' },
    ],
    extraFormulas: [
      {
        title: 'Probability of a sub-interval',
        intro: 'For any $c$ and $d$ with $a \\le c \\le d \\le b$, the probability depends only on the length of the sub-interval, not on where it is:',
        tex: 'P(c \\le X \\le d) = \\frac{d - c}{b - a}',
        glossary: [{ sym: 'c,\\ d', meaning: 'The ends of a sub-interval inside $[a, b]$.' }],
      },
      {
        title: 'Quantile function',
        intro: 'The value below which a fraction $u$ of the distribution lies is found by walking a fraction $u$ of the way from $a$ to $b$:',
        tex: 'Q(u) = F^{-1}(u) = a + u\\,(b - a), \\qquad 0 \\le u \\le 1',
        glossary: [{ sym: 'u', meaning: 'A probability between 0 and 1.' }, { sym: 'F^{-1}', meaning: 'The inverse of the CDF.' }],
      },
    ],

    properties: [
      { name: 'Support', tex: 'x \\in [a, b]', explain: 'Only values between the two bounds are possible.' },
      { name: 'Mean', tex: '\\mathrm{E}[X] = \\frac{a+b}{2}', value: p => (p.a + p.b) / 2, explain: 'The midpoint of the interval.' },
      { name: 'Median', tex: '\\frac{a+b}{2}', value: p => (p.a + p.b) / 2, explain: 'Equal to the mean, because the density is symmetric about the midpoint.' },
      { name: 'Mode', tex: '\\text{any } x \\in [a, b]', value: p => (p.a + p.b) / 2, explain: 'Every value in the interval has the same density, so there is no single most likely value. The value column shows the midpoint.' },
      { name: 'Variance', tex: '\\mathrm{Var}(X) = \\frac{(b-a)^2}{12}', value: p => (p.b - p.a) ** 2 / 12, explain: 'Grows with the square of the width. The factor $1/12$ is also the variance of a rounding error when values are rounded to whole units.' },
      { name: 'Standard deviation', tex: '\\frac{b-a}{\\sqrt{12}} \\approx 0.2887\\,(b-a)', value: p => (p.b - p.a) / Math.sqrt(12), explain: 'About 29% of the width of the interval.' },
      { name: 'Skewness', tex: '0', value: () => 0, explain: 'The density is symmetric, so it leans neither left nor right.' },
      { name: 'Excess kurtosis', tex: '-\\tfrac{6}{5}', value: () => -6 / 5, explain: 'Negative: the uniform has no tails at all, so it has much less probability far from the mean than a normal distribution with the same variance.' },
      { name: 'Entropy', tex: '\\ln(b - a)', value: p => Math.log(p.b - p.a), explain: 'Differential entropy in nats. Among all distributions confined to $[a, b]$, the uniform has the largest entropy, which is why it is used when nothing except the range is known. It is negative when the interval is shorter than 1.' },
      { name: 'Moment-generating function', tex: 'M(t) = \\frac{e^{tb} - e^{ta}}{t\\,(b-a)} \\ (t \\ne 0), \\quad M(0) = 1', explain: '$\\mathrm{E}[e^{tX}]$. Its derivatives at $t = 0$ give the moments.' },
      { name: 'Characteristic function', tex: '\\varphi(t) = \\frac{e^{itb} - e^{ita}}{it\\,(b-a)} \\ (t \\ne 0), \\quad \\varphi(0) = 1', explain: '$\\mathrm{E}[e^{itX}]$, where $i = \\sqrt{-1}$.' },
      { name: 'Quantile function', tex: 'Q(u) = a + u\\,(b-a)', value: p => `${fmtN(p.a + 0.025 * (p.b - p.a))} to ${fmtN(p.a + 0.975 * (p.b - p.a))}`, explain: 'Linear in $u$. The value column shows the middle 95% range, from $Q(0.025)$ to $Q(0.975)$.' },
      { name: 'Height of the density', tex: 'f(x) = \\frac{1}{b-a}', value: p => 1 / (p.b - p.a), explain: 'Halving the width doubles the height. The density can be larger than 1 when the interval is shorter than 1; it is a probability per unit length, not a probability.' },
      { name: 'Standardization', tex: 'U = \\frac{X - a}{b - a} \\sim \\mathrm U(0, 1)', explain: 'Any uniform variable can be shifted and rescaled to the standard uniform on $[0, 1]$, and back with $X = a + (b - a)U$.' },
      { name: 'Probability integral transform', tex: 'F_Y(Y) \\sim \\mathrm U(0,1), \\quad F_Y^{-1}(U) \\sim F_Y', explain: 'If $Y$ has any continuous CDF $F_Y$, then $F_Y(Y)$ is standard uniform; conversely, feeding a standard uniform $U$ into the inverse CDF gives a draw from $F_Y$. For example, $-\\ln(U)/\\lambda$ is exponential with rate $\\lambda$ (see the Uniform → Exponential relationship).' },
    ],

    limits: [
      { text: '<b>Beta with both shapes equal to 1.</b> $\\mathrm{Beta}(1, 1)$ is the standard uniform $\\mathrm U(0, 1)$. Conversely, the $k$-th smallest of $n$ independent standard uniform numbers has a $\\mathrm{Beta}(k,\\ n - k + 1)$ distribution.', relation: 'beta--uniform', to: 'beta' },
      { text: '<b>Von Mises with zero concentration.</b> A von Mises distribution of angles with $\\kappa = 0$ is uniform on the circle, $\\mathrm U(-\\pi, \\pi)$.', relation: 'von-mises--uniform', to: 'von-mises' },
      { text: '<b>Fine discrete uniform.</b> The discrete uniform on $\\{1, \\dots, n\\}$, divided by $n$, approaches $\\mathrm U(0, 1)$ as $n \\to \\infty$; in the other direction, rounding a stretched uniform number down gives a discrete uniform integer.', relation: 'uniform--discrete-uniform', to: 'discrete-uniform' },
      { text: '<b>Sums of uniforms.</b> The sum of two independent $\\mathrm U(0, 1)$ variables has a triangular density on $[0, 2]$. The sum of $n$ of them has the Irwin–Hall distribution, which approaches a normal distribution with mean $n/2$ and variance $n/12$ as $n$ grows (central limit theorem). Adding 12 uniforms and subtracting 6 was once a common way to generate approximately standard normal numbers.', to: 'normal' },
    ],

    uses: {
      frequentist: [
        '<b>p-values under the null hypothesis.</b> For a test with a continuous test statistic, the p-value is uniform on $(0, 1)$ when the null hypothesis is true. Histograms of many p-values, false-discovery-rate methods such as Benjamini–Hochberg, and checks of test calibration all rely on this.',
        '<b>Goodness-of-fit tests.</b> The Kolmogorov–Smirnov and Anderson–Darling tests, and probability (P–P) plots, use the probability integral transform: if the data come from $F$, the values $F(x_i)$ are uniform.',
        '<b>Estimating the end of a range.</b> For data from $\\mathrm U(0, \\theta)$, the maximum-likelihood estimate of $\\theta$ is the sample maximum, and $\\frac{n+1}{n}\\max_i x_i$ is the unbiased estimate (a continuous version of the “German tank problem”). This is a standard textbook example of an estimator whose behavior differs from the usual large-sample theory, because the support depends on the parameter.',
        '<b>Rounding and quantization error.</b> Rounding to a grid of width $\\Delta$ is often modeled as adding a uniform error on $[-\\Delta/2, \\Delta/2]$, with variance $\\Delta^2/12$ (Sheppard’s correction).',
        '<b>Randomization and permutation tests.</b> Random assignment of units to conditions, random sampling and permutation tests all start from uniform random numbers.',
      ],
      bayesian: [
        '<b>Flat prior for a probability.</b> $\\mathrm U(0, 1) = \\mathrm{Beta}(1, 1)$ is the usual “no preference” prior for a probability $\\theta$. With $k$ successes in $n$ binomial trials the posterior is $\\mathrm{Beta}(k + 1,\\ n - k + 1)$, whose mean $(k+1)/(n+2)$ is Laplace’s rule of succession.',
        '<b>Bounded uniform priors.</b> Uniform priors on a plausible range are common for bounded parameters (a correlation on $(-1, 1)$, a lapse rate, a mixing weight). They are not invariant under transformation: a uniform prior on a standard deviation is not uniform on the variance or the precision, so “flat” depends on the scale chosen.',
        '<b>Conjugate update for an upper bound.</b> For data from $\\mathrm U(0, \\theta)$ the Pareto distribution is the conjugate prior: a $\\mathrm{Pareto}(x_m, \\alpha)$ prior gives a $\\mathrm{Pareto}(\\max(x_m, \\max_i x_i),\\ \\alpha + n)$ posterior.',
        '<b>Checking Bayesian software.</b> Simulation-based calibration draws parameters from the prior, simulates data and fits the model; if the software is correct, the rank of each true parameter among its posterior draws is uniformly distributed. Posterior predictive p-values are also compared with a uniform distribution.',
      ],
      modeling: [
        '<b>Random-number generation.</b> Computers generate uniform numbers on $(0, 1)$ and transform them: inverse-CDF sampling ($F^{-1}(U)$), the Box–Muller method for normal numbers, and accept–reject algorithms that compare a uniform number with a density ratio.',
        '<b>Monte Carlo integration.</b> An integral over a region is estimated by averaging the function at uniformly scattered points. Stratified and Latin hypercube designs spread the uniform points more evenly.',
        '<b>Guessing and contaminant components.</b> In mixture models of working memory, a uniform distribution of response angles on the circle represents trials on which the person guesses (Zhang & Luck, 2008). Response-time models often include a uniform component for lapses or fast guesses.',
        '<b>Model fitting and design.</b> Uniform random starting values in optimization, uniform jitter of stimulus timing, and uniformly distributed stimulus levels in experiments.',
        '<b>Physics and geometry.</b> A random phase of a wave or a random angle of a needle (Buffon’s needle) is uniform on $[0, 2\\pi)$.',
      ],
    },

    references: [
      { text: 'Wikipedia: Continuous uniform distribution.', url: 'https://en.wikipedia.org/wiki/Continuous_uniform_distribution' },
      { text: 'Wikipedia: Probability integral transform.', url: 'https://en.wikipedia.org/wiki/Probability_integral_transform' },
      { text: 'Casella, G., & Berger, R. L. (2002). <i>Statistical Inference</i> (2nd ed.), Sections 2.1 and 3.3. Duxbury.' },
      { text: 'Gelman, A., Carlin, J. B., Stern, H. S., Dunson, D. B., Vehtari, A., & Rubin, D. B. (2013). <i>Bayesian Data Analysis</i> (3rd ed.), Chapter 2 and Appendix A. CRC Press.', url: 'http://www.stat.columbia.edu/~gelman/book/' },
      { text: 'Johnson, N. L., Kotz, S., & Balakrishnan, N. (1995). <i>Continuous Univariate Distributions</i>, Vol. 2 (2nd ed.), Chapter 26. Wiley.' },
      { text: 'Leemis, L. M., & McQueston, J. T. (2008). Univariate distribution relationships. <i>The American Statistician</i>, 62(1), 45–53.', url: 'https://doi.org/10.1198/000313008X270448' },
      { text: 'Zhang, W., & Luck, S. J. (2008). Discrete fixed-resolution representations in visual working memory. <i>Nature</i>, 453, 233–235.', url: 'https://doi.org/10.1038/nature06860' },
    ],
  },
};

function fmtN(v) { return String(Number(v.toPrecision(4))).replace(/^-/, '−'); }
