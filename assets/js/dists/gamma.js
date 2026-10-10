// Gamma distribution with shape alpha and RATE beta (BDA / Stan convention).
// Follows the structure of the reference module dists/normal.js.

import { catalogParams } from '../catalog.js';
import { lgamma, gammaP, gammaQ, gammaPinv, digamma, clamp } from '../core/math.js';

const A_MIN = 0.1, A_MAX = 20, B_MIN = 0.1, B_MAX = 5;

function pdf(x, { alpha, beta }) {
  if (x < 0) return 0;
  if (x === 0) return alpha < 1 ? Infinity : alpha === 1 ? beta : 0;
  return Math.exp(alpha * Math.log(beta) + (alpha - 1) * Math.log(x) - beta * x - lgamma(alpha));
}
const cdf = (x, { alpha, beta }) => (x <= 0 ? 0 : gammaP(alpha, beta * x));
const sf = (x, { alpha, beta }) => (x <= 0 ? 1 : gammaQ(alpha, beta * x));
const quantile = (u, { alpha, beta }) => gammaPinv(alpha, u) / beta;

export default {
  id: 'gamma',
  name: 'Gamma',
  kind: 'continuous',

  params: catalogParams('gamma', { alpha: { step: 0.1 }, beta: { step: 0.05 } }),

  pdf,
  cdf,
  sf,
  quantile,
  sample: (rng, { alpha, beta }) => rng.gamma(alpha, beta),

  testParams: [{ alpha: 0.5, beta: 2 }, { alpha: 1, beta: 0.5 }, { alpha: 20, beta: 0.4 }, { alpha: 0.3, beta: 1 }, { alpha: 7.5, beta: 5 }],

  range: () => [0, Infinity],
  support(p) {
    const hi = quantile(0.9995, p);
    const lo = quantile(0.0001, p);
    // for large shapes the curve sits far from 0: start the window just below the bulk;
    // otherwise start slightly left of 0 so that the behavior at 0 is visible
    return lo > 0.3 * hi ? [lo - 0.08 * (hi - lo), hi] : [-0.03 * hi, hi];
  },

  stats({ alpha, beta }) {
    return {
      mean: alpha / beta, variance: alpha / (beta * beta), sd: Math.sqrt(alpha) / beta,
      median: quantile(0.5, { alpha, beta }), mode: alpha >= 1 ? (alpha - 1) / beta : 0,
      skewness: 2 / Math.sqrt(alpha), exKurtosis: 6 / alpha,
      entropy: alpha - Math.log(beta) + lgamma(alpha) + (1 - alpha) * digamma(alpha),
    };
  },

  // Handles:
  //  - a dashed line at the mean alpha/beta: drag it to move the mean, keeping the shape (sets beta = alpha/x);
  //  - an arrow from the mean to mean + sd at the height of the density there: drag its tip to change the
  //    spread while keeping the mean (alpha = (m/sd)^2, beta = m/sd^2).
  handles: [
    {
      type: 'vline', param: 'beta', id: 'mean', label: 'mean',
      key: 'drag',
      ariaLabel: 'Mean α/β. Drag left or right, or use the arrow keys, to move the mean with the shape α fixed.',
      x: p => p.alpha / p.beta,
      set: (pt, p) => ({ beta: p.alpha / Math.max(pt.x, 1e-6) }),
    },
    {
      type: 'hArrow', param: 'alpha', id: 'sd', label: 'sd',
      key: 'drag',
      ariaLabel: 'Standard deviation √α/β. Drag the tip left or right, or use the arrow keys, to change the spread with the mean fixed.',
      from: p => { const m = p.alpha / p.beta, s = Math.sqrt(p.alpha) / p.beta; return { x: m, y: pdf(m + s, p) }; },
      to: p => { const m = p.alpha / p.beta, s = Math.sqrt(p.alpha) / p.beta; return { x: m + s, y: pdf(m + s, p) }; },
      set: (pt, p) => {
        const m = p.alpha / p.beta;
        // allowed sd range so that both alpha = (m/sd)^2 and beta = m/sd^2 stay inside their limits
        const lo = Math.max(m / Math.sqrt(A_MAX), Math.sqrt(m / B_MAX));
        const hi = Math.min(m / Math.sqrt(A_MIN), Math.sqrt(m / B_MIN));
        const sd = clamp(pt.x - m, lo, Math.max(lo, hi));
        return { alpha: (m / sd) ** 2, beta: m / (sd * sd) };
      },
    },
  ],

  explorer: {
    readouts: [
      { key: 'mean', label: 'Mean α/β' },
      { key: 'sd', label: 'Standard deviation √α/β' },
      { key: 'mode', label: 'Mode' },
      { label: 'Scale θ = 1/β', value: p => fmtN(1 / p.beta) },
    ],
    // with a shape below 1 the density is infinite at 0; cap the y axis so the rest of the curve stays visible
    yMax: p => (p.alpha < 1 ? 1.6 * pdf(0.02 * quantile(0.9995, p), p) : undefined),
  },

  content: {
    description: [
      'The gamma distribution describes positive quantities that are skewed to the right, such as waiting times, rainfall amounts, insurance claims or reaction times. Its best-known interpretation: if events happen at random at a constant rate $\\beta$, the total waiting time until the $\\alpha$-th event has a gamma distribution. With a whole-number shape it is also called the Erlang distribution.',
      'It has two parameters. The shape $\\alpha$ controls the form of the curve: for $\\alpha < 1$ the density shoots up at zero, for $\\alpha = 1$ it is the exponential distribution, and for larger $\\alpha$ it becomes a hump that grows more symmetric and close to normal. The rate $\\beta$ controls the time scale: doubling $\\beta$ squeezes the whole distribution toward 0 by a factor of 2. The mean is $\\alpha/\\beta$.',
      'This site uses the shape–rate form, as in <i>Bayesian Data Analysis</i> and Stan. Wikipedia, SciPy and NumPy often use shape $k = \\alpha$ and scale $\\theta = 1/\\beta$ instead, with mean $k\\theta$; the distributions are the same, only the second parameter is inverted.',
    ],
    explorerIntro: 'The left plot shows the density $f(x)$ and the right plot the cumulative distribution $F(x)$. Drag the dashed amber line, which sits at the mean $\\alpha/\\beta$, to move the mean; the shape $\\alpha$ stays fixed and the rate $\\beta$ changes. Drag the tip of the amber arrow, which runs from the mean to one standard deviation above it, to make the distribution wider or narrower with the mean held fixed; this changes both $\\alpha$ and $\\beta$. A narrower distribution relative to its mean has a larger shape and looks more like a normal curve. A focused handle moves the same way with the arrow keys.',

    pdfTex: 'f(x \\mid \\alpha, \\beta) = \\frac{\\beta^{\\alpha}}{\\Gamma(\\alpha)}\\, x^{\\alpha - 1} e^{-\\beta x} \\quad \\text{for } x > 0',
    glossary: [
      { sym: 'x', meaning: 'A possible value of the random variable $X$. It must be positive.' },
      { sym: 'f(x \\mid \\alpha, \\beta)', meaning: 'The probability density at $x$ given the shape and rate.' },
      { sym: '\\alpha', meaning: 'The shape (also written $k$). For a whole number, it is the number of exponential waiting times added together.' },
      { sym: '\\beta', meaning: 'The rate: an inverse scale. With $\\alpha$ fixed, a larger $\\beta$ compresses the distribution toward 0. The scale is $\\theta = 1/\\beta$.' },
      { sym: '\\Gamma(\\alpha)', meaning: 'The gamma function, which extends the factorial to non-integers: $\\Gamma(n) = (n-1)!$ for whole numbers $n$. Here it makes the density integrate to 1.' },
      { sym: 'x^{\\alpha - 1}', meaning: 'The power term that controls the shape near 0: it rises from 0 when $\\alpha > 1$ and blows up at 0 when $\\alpha < 1$.' },
      { sym: 'e^{-\\beta x}', meaning: 'The exponential decay that makes the right tail thin. Here $e \\approx 2.718$.' },
      { sym: '\\beta^{\\alpha}', meaning: 'Part of the normalizing constant; it adjusts for the time scale set by $\\beta$.' },
    ],

    cdfTex: 'F(x \\mid \\alpha, \\beta) = P(X \\le x) = \\frac{\\gamma(\\alpha, \\beta x)}{\\Gamma(\\alpha)} = P(\\alpha, \\beta x)',
    cdfGlossary: [
      { sym: 'F(x \\mid \\alpha, \\beta)', meaning: 'The cumulative distribution function: the probability that $X$ is at most $x$.' },
      { sym: 'P(X \\le x)', meaning: 'The probability that the random variable $X$ takes a value at most $x$.' },
      { sym: '\\gamma(\\alpha, y)', meaning: 'The lower incomplete gamma function, $\\gamma(\\alpha, y) = \\int_0^y t^{\\alpha-1} e^{-t}\\,dt$: the part of the integral that defines $\\Gamma(\\alpha)$ that lies below $y$.' },
      { sym: '\\Gamma(\\alpha)', meaning: 'The (complete) gamma function, the same integral taken up to infinity.' },
      { sym: 'P(\\alpha, y)', meaning: 'The regularized lower incomplete gamma function $\\gamma(\\alpha, y)/\\Gamma(\\alpha)$. It has no elementary formula for general $\\alpha$ and is computed numerically by a series or continued fraction.' },
      { sym: '\\alpha,\\ \\beta', meaning: 'The shape and the rate.' },
    ],
    extraFormulas: [
      {
        title: 'Shape–scale form',
        intro: 'With shape $k = \\alpha$ and scale $\\theta = 1/\\beta$ (Wikipedia, SciPy, NumPy) the same density reads:',
        tex: 'f(x \\mid k, \\theta) = \\frac{1}{\\Gamma(k)\\,\\theta^{k}}\\, x^{k-1} e^{-x/\\theta}, \\qquad \\mathrm{E}[X] = k\\theta, \\quad \\mathrm{Var}(X) = k\\theta^2',
        glossary: [{ sym: 'k', meaning: 'The shape, the same as $\\alpha$.' }, { sym: '\\theta', meaning: 'The scale, equal to $1/\\beta$. It is measured in the same units as $x$.' }],
      },
      {
        title: 'Whole-number shape (Erlang distribution)',
        intro: 'When $\\alpha = n$ is a whole number, the CDF has a closed form, because waiting longer than $x$ for the $n$-th event means fewer than $n$ events by time $x$, a Poisson count:',
        tex: 'F(x) = 1 - \\sum_{j=0}^{n-1} e^{-\\beta x} \\frac{(\\beta x)^j}{j!}',
        glossary: [{ sym: 'n', meaning: 'A whole-number shape: the number of events waited for.' }, { sym: 'j!', meaning: 'The factorial $1 \\times 2 \\times \\dots \\times j$, with $0! = 1$.' }],
      },
      {
        title: 'Conjugate update for a Poisson rate',
        intro: 'With prior $\\lambda \\sim \\mathrm{Gamma}(\\alpha, \\beta)$ and counts $y_1, \\dots, y_n$ from $\\mathrm{Poisson}(\\lambda)$, the posterior is again gamma:',
        tex: '\\lambda \\mid y \\sim \\mathrm{Gamma}\\!\\Big(\\alpha + \\sum_{i=1}^n y_i,\\ \\beta + n\\Big)',
        glossary: [
          { sym: '\\lambda', meaning: 'The unknown Poisson rate (the mean count per observation).' },
          { sym: 'y_i', meaning: 'The observed counts.' },
          { sym: '\\lambda \\mid y', meaning: 'The rate given the observed data (the posterior).' },
        ],
      },
    ],

    properties: [
      { name: 'Support', tex: 'x \\in (0, \\infty)', explain: 'Only positive values are possible.' },
      { name: 'Mean', tex: '\\mathrm{E}[X] = \\frac{\\alpha}{\\beta}', value: p => p.alpha / p.beta, explain: 'The shape divided by the rate. For a waiting time, it is $\\alpha$ events times the mean wait $1/\\beta$ for each.' },
      { name: 'Median', tex: '\\text{no closed form;} \\ \\approx \\frac{\\alpha - 1/3}{\\beta} \\text{ for large } \\alpha', value: p => quantile(0.5, p), explain: 'Computed numerically by inverting the CDF. For $\\alpha \\ge 1$ it lies between the mode and the mean, and $(\\alpha - 1/3)/\\beta$ is within 4% of it (within 1% for $\\alpha \\ge 2$).' },
      { name: 'Mode', tex: '\\frac{\\alpha - 1}{\\beta} \\ \\text{for } \\alpha \\ge 1; \\quad 0 \\ \\text{for } \\alpha < 1', value: p => (p.alpha >= 1 ? (p.alpha - 1) / p.beta : 0), explain: 'The peak of the density. For $\\alpha < 1$ the density is infinite at 0, and for $\\alpha = 1$ (the exponential) it is highest at 0.' },
      { name: 'Variance', tex: '\\mathrm{Var}(X) = \\frac{\\alpha}{\\beta^2}', value: p => p.alpha / (p.beta * p.beta), explain: 'Equal to the mean divided by $\\beta$. With the shape fixed, the variance grows with the square of the mean.' },
      { name: 'Standard deviation', tex: '\\frac{\\sqrt{\\alpha}}{\\beta}', value: p => Math.sqrt(p.alpha) / p.beta, explain: 'The coefficient of variation (standard deviation divided by mean) is $1/\\sqrt\\alpha$, so the shape alone sets how spread out the values are relative to their mean.' },
      { name: 'Skewness', tex: '\\frac{2}{\\sqrt{\\alpha}}', value: p => 2 / Math.sqrt(p.alpha), explain: 'Always skewed to the right, less so as the shape grows. It does not depend on $\\beta$.' },
      { name: 'Excess kurtosis', tex: '\\frac{6}{\\alpha}', value: p => 6 / p.alpha, explain: 'Heavier tails than the normal for small shapes; it approaches 0, the normal value, as $\\alpha$ grows.' },
      { name: 'Entropy', tex: '\\alpha - \\ln\\beta + \\ln\\Gamma(\\alpha) + (1 - \\alpha)\\,\\psi(\\alpha)', value: p => p.alpha - Math.log(p.beta) + lgamma(p.alpha) + (1 - p.alpha) * digamma(p.alpha), explain: 'Differential entropy in nats. Here $\\psi(\\alpha) = \\Gamma\'(\\alpha)/\\Gamma(\\alpha)$ is the digamma function. Among positive distributions with fixed $\\mathrm{E}[X]$ and fixed $\\mathrm{E}[\\ln X]$, the gamma has the largest entropy.' },
      { name: 'Moment-generating function', tex: 'M(t) = \\Big(1 - \\frac{t}{\\beta}\\Big)^{-\\alpha}, \\quad t < \\beta', explain: '$\\mathrm{E}[e^{tX}]$. Multiplying moment-generating functions shows that independent gamma variables with the same rate add up: $\\mathrm{Gamma}(\\alpha_1, \\beta) + \\mathrm{Gamma}(\\alpha_2, \\beta) = \\mathrm{Gamma}(\\alpha_1 + \\alpha_2, \\beta)$.' },
      { name: 'Characteristic function', tex: '\\varphi(t) = \\Big(1 - \\frac{it}{\\beta}\\Big)^{-\\alpha}', explain: '$\\mathrm{E}[e^{itX}]$, where $i = \\sqrt{-1}$.' },
      { name: 'Scaling', tex: 'cX \\sim \\mathrm{Gamma}(\\alpha,\\ \\beta / c), \\quad c > 0', explain: 'Multiplying by a positive constant keeps the shape and divides the rate, which is why $\\beta$ (or $\\theta$) only sets the units.' },
      { name: 'Hazard function', tex: 'h(x) = \\frac{f(x)}{1 - F(x)}', explain: 'The rate of the event among those still waiting. It decreases over time when $\\alpha < 1$, is constant ($= \\beta$) when $\\alpha = 1$, and increases toward $\\beta$ when $\\alpha > 1$.' },
      { name: 'Mean of the logarithm', tex: '\\mathrm{E}[\\ln X] = \\psi(\\alpha) - \\ln\\beta', value: p => digamma(p.alpha) - Math.log(p.beta), explain: 'Together with $\\mathrm{E}[X]$, this is the sufficient information for estimating $\\alpha$ and $\\beta$: the maximum-likelihood estimates depend on the data only through the sample mean and the mean of the logs.' },
    ],

    limits: [
      { text: '<b>Exponential as a special case.</b> With shape $\\alpha = 1$, $\\mathrm{Gamma}(1, \\beta) = \\mathrm{Exp}(\\beta)$. A sum of $n$ independent $\\mathrm{Exp}(\\beta)$ waiting times is $\\mathrm{Gamma}(n, \\beta)$.', relation: 'exponential--gamma', to: 'exponential' },
      { text: '<b>Chi-squared as a special case.</b> $\\chi^2_k = \\mathrm{Gamma}(k/2,\\ 1/2)$. Conversely, if $X \\sim \\mathrm{Gamma}(\\alpha, \\beta)$ then $2\\beta X \\sim \\chi^2_{2\\alpha}$, which is how gamma probabilities were once read from chi-squared tables.', relation: 'chi-squared--gamma', to: 'chi-squared' },
      { text: '<b>Normal limit for a large shape.</b> As $\\alpha \\to \\infty$, $\\dfrac{X - \\alpha/\\beta}{\\sqrt\\alpha/\\beta} \\xrightarrow{d} \\mathcal N(0, 1)$. A gamma variable with a large shape is a sum of many independent pieces, so the central limit theorem applies. The Wilson–Hilferty cube-root transformation $(X\\beta/\\alpha)^{1/3}$ is close to normal already for moderate $\\alpha$.', to: 'normal' },
      { text: '<b>Erlang distribution.</b> With a whole-number shape $\\alpha = n$ the gamma is called the Erlang distribution: the waiting time until the $n$-th event of a Poisson process with rate $\\beta$.' },
      { text: '<b>Concentration in the other direction.</b> As $\\alpha \\to \\infty$ with the mean $\\alpha/\\beta = m$ fixed, the coefficient of variation $1/\\sqrt\\alpha$ goes to 0 and the distribution collapses onto the single value $m$. As $\\alpha \\to 0$ with $\\beta$ fixed, nearly all the probability piles up just above 0.' },
    ],

    uses: {
      frequentist: [
        '<b>Gamma regression.</b> Generalized linear models with the gamma family (usually with a log link) model positive, right-skewed outcomes whose standard deviation grows in proportion to the mean, such as costs, durations, concentrations and response times.',
        '<b>Chi-squared tests.</b> The chi-squared distribution with $k$ degrees of freedom is $\\mathrm{Gamma}(k/2,\\ 1/2)$, so the p-values of chi-squared tests of goodness of fit and independence, and of likelihood-ratio tests, are gamma tail probabilities.',
        '<b>Approximating sums of squares.</b> The Welch–Satterthwaite approximation treats a weighted sum of chi-squared variables, such as a pooled variance estimate, as a scaled chi-squared (that is, a gamma) variable with matched mean and variance.',
        '<b>Estimation.</b> The method-of-moments estimates are $\\hat\\alpha = \\bar x^2/s^2$ and $\\hat\\beta = \\bar x/s^2$, where $s^2$ is the sample variance. The maximum-likelihood estimates have no closed form and are found numerically from the sample mean and the mean of $\\ln x$.',
        '<b>Survival models.</b> The gamma is a flexible parametric survival distribution, and gamma frailty models give a random multiplicative effect on the hazard to each individual or cluster.',
      ],
      bayesian: [
        '<b>Conjugate prior for a Poisson rate.</b> With prior $\\lambda \\sim \\mathrm{Gamma}(\\alpha, \\beta)$ and counts $y_1, \\dots, y_n$, the posterior is $\\mathrm{Gamma}(\\alpha + \\sum_i y_i,\\ \\beta + n)$. The prior acts like $\\alpha$ events seen in $\\beta$ earlier observations. The posterior predictive distribution of a new count is negative binomial.',
        '<b>Conjugate prior for an exponential rate.</b> With $n$ exponential waiting times, $\\mathrm{Gamma}(\\alpha, \\beta)$ updates to $\\mathrm{Gamma}(\\alpha + n,\\ \\beta + \\sum_i x_i)$.',
        '<b>Conjugate prior for a normal precision.</b> For normal data with known mean $\\mu$ and unknown precision $\\tau = 1/\\sigma^2$, a $\\mathrm{Gamma}(\\alpha, \\beta)$ prior on $\\tau$ updates to $\\mathrm{Gamma}(\\alpha + n/2,\\ \\beta + \\tfrac12\\sum_i (x_i - \\mu)^2)$. Equivalently, $\\sigma^2$ has an inverse-gamma prior and posterior.',
        '<b>Priors on positive parameters.</b> Gamma priors are used for rates, precisions and degrees of freedom; for example, $\\mathrm{Gamma}(2, 0.1)$ for the degrees of freedom of a Student $t$ likelihood was proposed by Juárez & Steel (2010) and is suggested as a default in the Stan prior-choice recommendations. Very flat choices such as $\\mathrm{Gamma}(0.001, 0.001)$ for a precision are not truly uninformative and can distort hierarchical models (Gelman, 2006).',
        '<b>Hierarchical count models.</b> Letting each unit’s Poisson rate follow a gamma distribution produces overdispersed counts (the gamma–Poisson or negative binomial model).',
      ],
      modeling: [
        '<b>Response times and serial stages.</b> If a response requires several independent exponential processing stages, the total time is gamma (Erlang); gamma and ex-Gaussian distributions are both used to describe response-time distributions.',
        '<b>Neural spike trains.</b> Gamma renewal processes model interspike intervals that are more regular than Poisson firing ($\\alpha > 1$), for example because of a refractory period.',
        '<b>fMRI hemodynamic response.</b> The canonical hemodynamic response function used in SPM is a difference of two gamma densities: one for the peak about 5 to 6 seconds after a brief event and a smaller one for the later undershoot.',
        '<b>Hydrology, insurance and reliability.</b> Rainfall amounts, flood volumes, claim sizes and the time to the $n$-th failure of a system with spare parts are often modeled with gamma distributions.',
        '<b>Simulation.</b> Gamma random numbers are the building blocks for chi-squared, beta ($X/(X + Y)$), Dirichlet (normalized gammas), Student $t$ and F random numbers.',
      ],
    },

    references: [
      { text: 'Wikipedia: Gamma distribution.', url: 'https://en.wikipedia.org/wiki/Gamma_distribution' },
      { text: 'Casella, G., & Berger, R. L. (2002). <i>Statistical Inference</i> (2nd ed.), Section 3.3. Duxbury.' },
      { text: 'Gelman, A., Carlin, J. B., Stern, H. S., Dunson, D. B., Vehtari, A., & Rubin, D. B. (2013). <i>Bayesian Data Analysis</i> (3rd ed.), Sections 2.6–2.7 and Appendix A. CRC Press.', url: 'http://www.stat.columbia.edu/~gelman/book/' },
      { text: 'Johnson, N. L., Kotz, S., & Balakrishnan, N. (1994). <i>Continuous Univariate Distributions</i>, Vol. 1 (2nd ed.), Chapter 17. Wiley.' },
      { text: 'Leemis, L. M., & McQueston, J. T. (2008). Univariate distribution relationships. <i>The American Statistician</i>, 62(1), 45–53.', url: 'https://doi.org/10.1198/000313008X270448' },
      { text: 'Gelman, A. (2006). Prior distributions for variance parameters in hierarchical models. <i>Bayesian Analysis</i>, 1(3), 515–534.', url: 'https://doi.org/10.1214/06-BA117A' },
      { text: 'Juárez, M. A., & Steel, M. F. J. (2010). Model-based clustering of non-Gaussian panel data based on skew-t distributions. <i>Journal of Business & Economic Statistics</i>, 28(1), 52–66.', url: 'https://doi.org/10.1198/jbes.2009.07145' },
      { text: 'Stan Development Team. Prior choice recommendations (wiki).', url: 'https://github.com/stan-dev/stan/wiki/Prior-Choice-Recommendations' },
    ],
  },
};

function fmtN(v) { return String(Number(v.toPrecision(4))).replace(/^-/, '−'); }
