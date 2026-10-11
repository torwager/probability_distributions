// Cauchy distribution with location x0 and scale gamma (half-width at half-maximum).
// Follows the structure of the reference module dists/normal.js (see ARCHITECTURE.md).

import { catalogParams } from '../catalog.js';
import { normalCdf, PI } from '../core/math.js';

const Z75 = 0.6744897501960817; // standard normal 0.75 quantile, used for the "same quartiles" overlay

function pdf(x, { x0, gamma }) {
  const z = (x - x0) / gamma;
  return 1 / (PI * gamma * (1 + z * z));
}
/** P(X <= x), accurate in both tails (no cancellation when F is close to 0). */
function cdf(x, { x0, gamma }) {
  const z = (x - x0) / gamma;
  if (Number.isNaN(z)) return NaN;
  if (z === -Infinity) return 0;
  if (z === Infinity) return 1;
  // for z < 0: 1/2 + atan(z)/pi = atan(-1/z)/pi
  return z < -1 ? Math.atan(-1 / z) / PI : 0.5 + Math.atan(z) / PI;
}
function sf(x, { x0, gamma }) { return cdf(x0 - (x - x0), { x0, gamma }); }
function quantile(u, { x0, gamma }) {
  if (u <= 0) return -Infinity;
  if (u >= 1) return Infinity;
  if (u === 0.5) return x0;
  // tan(pi (u - 1/2)) = -1/tan(pi u) = 1/tan(pi (1 - u)); use the small one of u and 1 - u
  // so that pi * u is never rounded near pi (accurate far into both tails)
  return u < 0.5 ? x0 - gamma / Math.tan(PI * u) : x0 + gamma / Math.tan(PI * (1 - u));
}

export default {
  id: 'cauchy',
  name: 'Cauchy',
  kind: 'continuous',
  params: catalogParams('cauchy'),

  pdf,
  cdf,
  sf,
  quantile,
  sample: (rng, { x0, gamma }) => rng.cauchy(x0, gamma),

  testParams: [{ x0: -3, gamma: 0.1 }, { x0: 7, gamma: 5 }, { x0: 9.5, gamma: 0.3 }],

  range: () => [-Infinity, Infinity],
  /** Heavy tails: the window x0 ± 10γ shows the shape and holds about 94% of the probability. */
  support: ({ x0, gamma }) => [x0 - 10 * gamma, x0 + 10 * gamma],

  stats({ x0, gamma }) {
    return {
      mean: NaN, variance: NaN, sd: NaN, median: x0, mode: x0,
      skewness: NaN, exKurtosis: NaN, entropy: Math.log(4 * PI * gamma),
    };
  },

  //  - a vertical line at the center x0 (median and peak): drag it to move the curve;
  //  - a horizontal arrow from x0 to x0 + γ at half the peak height: the arrow is the
  //    half-width at half-maximum, so dragging its tip sets the scale γ.
  handles: [
    { type: 'vline', param: 'x0', ariaLabel: 'Location x₀ (median and peak). Drag left or right, or use the arrow keys.' },
    {
      type: 'hArrow', param: 'gamma',
      from: p => ({ x: p.x0, y: 1 / (2 * PI * p.gamma) }),
      to: p => ({ x: p.x0 + p.gamma, y: 1 / (2 * PI * p.gamma) }),
      set: (pt, p) => ({ gamma: pt.x - p.x0 }),
      ariaLabel: 'Scale γ (half-width at half the peak height). Drag the arrow tip, or use the arrow keys.',
    },
  ],

  explorer: {
    readouts: [
      { key: 'median', label: 'Median and mode x₀' },
      { label: 'Scale γ', value: p => p.gamma },
      { label: 'Quartiles x₀ ± γ', value: p => `${fmtN(p.x0 - p.gamma)} and ${fmtN(p.x0 + p.gamma)}` },
      { label: 'Mean and variance', value: () => 'undefined' },
      { label: 'P(|X − x₀| > 10γ)', value: () => 2 * Math.atan(0.1) / PI },
    ],
    overlays: p => {
      const s = p.gamma / Z75;
      return [{
        id: 'normal', label: 'Normal with the same median and quartiles', cls: 'curve-ref',
        pdf: x => Math.exp(-0.5 * ((x - p.x0) / s) ** 2) / (s * Math.sqrt(2 * PI)),
        cdf: x => normalCdf((x - p.x0) / s),
      }];
    },
  },

  content: {
    summary: 'The Cauchy distribution is a symmetric bell curve centered at $x_0$, with width set by the scale $\\gamma$ and tails so heavy that it has no mean or variance. Averages of Cauchy values do not settle down, so the central limit theorem does not apply.',
    description: [
      'The Cauchy distribution is a symmetric, bell-shaped distribution for a continuous quantity that can take any real value. It looks like a normal curve at first sight, but its tails are much heavier: values far from the center are rare, yet far less rare than under a normal distribution, and they are occasionally enormous. A standard example is the point where a beam from a rotating lighthouse hits a straight shoreline when the beam direction is random: most hits are near the lighthouse, but beams that are almost parallel to the shore land very far away.',
      'The tails are so heavy that the distribution has no mean and no variance. As a consequence, the average of many Cauchy values does not settle down as more values are added; it has the same Cauchy distribution as a single value. The law of large numbers and the central limit theorem do not apply.',
      'It has two parameters. The location $x_0$ is the center: the median and the peak. The scale $\\gamma$ sets the width: the curve falls to half its peak height at $x_0 \\pm \\gamma$, and half of the probability lies between these two points. The Cauchy distribution is Student’s $t$ distribution with one degree of freedom, and it is the distribution of the ratio of two independent standard normal variables.',
    ],
    explorerIntro: 'The left plot shows the density $f(x)$ and the right plot the cumulative distribution $F(x)$. Drag the dashed amber line to move the center $x_0$, and drag the tip of the amber arrow to change the scale $\\gamma$. The arrow runs from $x_0$ to $x_0 + \\gamma$ at half the height of the peak, so its length is the half-width of the curve at half its maximum. The dashed grey curve is a normal distribution with the same median and the same quartiles; compare how quickly its tails vanish. The plotting window $x_0 \\pm 10\\gamma$ still leaves about 6% of the Cauchy probability outside.',

    pdfTex: 'f(x \\mid x_0, \\gamma) = \\frac{1}{\\pi\\gamma\\left[1 + \\left((x - x_0)/\\gamma\\right)^{2}\\right]} = \\frac{\\gamma}{\\pi\\left[(x - x_0)^2 + \\gamma^2\\right]}',
    glossary: [
      { sym: 'x', meaning: 'A possible value of the random variable $X$. It can be any real number.' },
      { sym: 'f(x \\mid x_0, \\gamma)', meaning: 'The probability density at $x$ given the parameters. Probabilities are areas under this curve.' },
      { sym: 'x_0', meaning: 'The location: the center of the curve, which is both the median and the mode (peak). It is not a mean, because the Cauchy distribution has no mean.' },
      { sym: '\\gamma', meaning: 'The scale, a positive number. The density at $x_0 \\pm \\gamma$ is half the peak height, and the quartiles are $x_0 - \\gamma$ and $x_0 + \\gamma$. (Here $\\gamma$ is a parameter, not Euler’s constant.)' },
      { sym: '\\pi', meaning: 'The constant 3.14159…, the ratio of a circle’s circumference to its diameter.' },
      { sym: '(x - x_0)/\\gamma', meaning: 'The distance of $x$ from the center, measured in units of the scale $\\gamma$.' },
      { sym: '\\frac{1}{\\pi\\gamma}', meaning: 'The height of the peak at $x = x_0$; it also makes the total area equal to 1.' },
    ],

    cdfTex: 'F(x \\mid x_0, \\gamma) = P(X \\le x) = \\frac12 + \\frac{1}{\\pi}\\arctan\\!\\left(\\frac{x - x_0}{\\gamma}\\right)',
    cdfGlossary: [
      { sym: 'F(x \\mid x_0, \\gamma)', meaning: 'The cumulative distribution function: the probability that $X$ is at most $x$, the area under the density to the left of $x$.' },
      { sym: 'P(X \\le x)', meaning: 'The probability that the random variable $X$ takes a value at most $x$.' },
      { sym: '\\arctan(u)', meaning: 'The inverse tangent: the angle, between $-\\pi/2$ and $\\pi/2$, whose tangent is $u$. It explains the lighthouse picture: the angle of the beam is uniform, and the hitting point is the tangent of that angle.' },
      { sym: 'x_0,\\ \\gamma', meaning: 'The location (median) and the scale, as in the density.' },
      { sym: '\\pi', meaning: 'The constant 3.14159…; dividing the angle by $\\pi$ turns it into a probability between $-\\tfrac12$ and $\\tfrac12$.' },
    ],

    extraFormulas: [
      {
        title: 'Quantile function',
        intro: 'Inverting the CDF gives the value below which a fraction $u$ of the distribution lies. Putting a uniform random number $U$ in place of $u$ is the usual way to simulate Cauchy values.',
        tex: 'Q(u) = x_0 + \\gamma \\tan\\!\\left[\\pi\\left(u - \\tfrac12\\right)\\right], \\qquad 0 < u < 1',
        glossary: [
          { sym: 'u', meaning: 'A probability between 0 and 1.' },
          { sym: '\\tan', meaning: 'The tangent function. It grows without bound as its argument approaches $\\pm\\pi/2$, which is where the heavy tails come from.' },
        ],
      },
      {
        title: 'The average of Cauchy values',
        intro: 'If $X_1, \\dots, X_n$ are independent $\\mathrm{Cauchy}(x_0, \\gamma)$ variables, their average has exactly the same distribution as one of them. Averaging does not reduce the spread at all.',
        tex: '\\bar X_n = \\frac{1}{n}\\sum_{i=1}^n X_i \\sim \\mathrm{Cauchy}(x_0, \\gamma) \\quad \\text{for every } n',
        glossary: [
          { sym: '\\bar X_n', meaning: 'The sample mean of $n$ independent draws.' },
          { sym: 'n', meaning: 'The number of draws averaged.' },
          { sym: '\\mathrm{Cauchy}(x_0, \\gamma)', meaning: 'The Cauchy distribution with location $x_0$ and scale $\\gamma$.' },
        ],
      },
    ],

    properties: [
      { name: 'Support', tex: 'x \\in (-\\infty, \\infty)', explain: 'Every real number has positive density. The density falls off only like $1/x^2$, so very large values are far more common than under a normal distribution.' },
      { name: 'Mean', tex: '\\text{undefined}', explain: 'The integral $\\int x f(x)\\,dx$ does not converge: the contributions from the two tails are each infinite. So there is no mean, even though the curve is symmetric about $x_0$. This is why sample averages of Cauchy data never settle down.' },
      { name: 'Median', tex: 'x_0', value: p => p.x0, explain: 'Half of the probability lies on each side of $x_0$. The sample median is a good estimator of $x_0$; the sample mean is not.' },
      { name: 'Mode', tex: 'x_0', value: p => p.x0, explain: 'The peak of the curve.' },
      { name: 'Variance', tex: '\\text{undefined}', explain: 'The variance is defined around the mean, which does not exist. The second moment $\\mathrm{E}[X^2]$ is infinite.' },
      { name: 'Standard deviation', tex: '\\text{undefined}', explain: 'There is no variance, so there is no standard deviation. Use the scale $\\gamma$ or the interquartile range $2\\gamma$ to describe the spread.' },
      { name: 'Skewness', tex: '\\text{undefined}', explain: 'Skewness is defined from the third moment, which does not exist. The curve is nevertheless symmetric about $x_0$.' },
      { name: 'Excess kurtosis', tex: '\\text{undefined}', explain: 'Kurtosis needs a finite fourth moment, which the Cauchy distribution does not have. Its tails are heavier than those of Student’s $t$ with any number of degrees of freedom above 1.' },
      { name: 'Entropy', tex: '\\ln(4\\pi\\gamma)', value: p => Math.log(4 * PI * p.gamma), explain: 'Differential entropy in nats. It grows with the logarithm of the scale, like that of every location–scale family.' },
      { name: 'Moment-generating function', tex: '\\text{does not exist}', explain: '$\\mathrm{E}[e^{tX}]$ is infinite for every $t \\ne 0$, because the tails are too heavy.' },
      { name: 'Characteristic function', tex: '\\varphi(t) = \\exp\\!\\left(i x_0 t - \\gamma |t|\\right)', explain: '$\\mathrm{E}[e^{itX}]$, where $i = \\sqrt{-1}$. Raising it to the power $n$ and replacing $t$ by $t/n$ gives it back unchanged, which proves that the average of $n$ independent Cauchy values has the same distribution as one value. The kink at $t = 0$ reflects the missing mean.' },
      { name: 'Quartiles', tex: 'x_0 - \\gamma,\\ \\ x_0 + \\gamma', value: p => `${fmtN(p.x0 - p.gamma)}, ${fmtN(p.x0 + p.gamma)}`, explain: 'Half of the probability lies within one scale unit of the center, so the interquartile range is $2\\gamma$.' },
      { name: 'Peak height', tex: 'f(x_0) = \\frac{1}{\\pi\\gamma}', value: p => 1 / (PI * p.gamma), explain: 'The density at the center. At $x_0 \\pm \\gamma$ the density is exactly half of this, so the full width at half maximum is $2\\gamma$.' },
      { name: 'Tail probability', tex: 'P(X > x_0 + k\\gamma) = \\frac{1}{\\pi}\\arctan\\frac{1}{k} \\approx \\frac{1}{\\pi k}', value: () => Math.atan(1 / 10) / PI, explain: 'The chance of a value more than $k$ scale units above the center shrinks only like $1/k$. The value column shows $k = 10$: about 3.2%, compared with about $10^{-23}$ for $10$ standard deviations above a normal mean.' },
      { name: 'Quantile function', tex: 'Q(u) = x_0 + \\gamma\\tan\\!\\left[\\pi(u - \\tfrac12)\\right]', value: p => `${fmtN(quantile(0.975, p))} (u = 0.975)`, explain: 'For $u = 0.975$ the factor is $\\tan(0.475\\pi) \\approx 12.71$, compared with 1.96 for the normal. It equals the 97.5% point of Student’s $t$ with one degree of freedom.' },
      { name: 'Stability', tex: 'X_1 + X_2 \\sim \\mathrm{Cauchy}(x_{0,1} + x_{0,2},\\ \\gamma_1 + \\gamma_2)', explain: 'The sum of independent Cauchy variables is Cauchy, with the locations and the scales added. The Cauchy distribution is a stable distribution (with stability index 1), like the normal (index 2).' },
    ],

    limits: [
      { text: '<b>Student’s t with one degree of freedom.</b> The $t$ distribution with $\\nu = 1$ is the standard Cauchy distribution $\\mathrm{Cauchy}(0, 1)$, and $x_0 + \\gamma T$ with $T \\sim t_1$ is $\\mathrm{Cauchy}(x_0, \\gamma)$. As $\\nu$ grows the $t$ distribution moves away from the Cauchy toward the normal.', relation: 'student-t--cauchy', to: 'student-t' },
      { text: '<b>Standard Cauchy.</b> With $x_0 = 0$ and $\\gamma = 1$ the density is $1/[\\pi(1 + x^2)]$. Any Cauchy variable can be standardized as $(X - x_0)/\\gamma$.' },
      { text: '<b>Tangent of a uniform angle.</b> If $\\Theta$ is uniform on $(-\\pi/2, \\pi/2)$, then $\\tan\\Theta$ is standard Cauchy. This is the lighthouse picture and the inverse-CDF method for simulating Cauchy values.', to: 'uniform' },
      { text: '<b>Reciprocal.</b> If $X \\sim \\mathrm{Cauchy}(0, \\gamma)$, then $1/X \\sim \\mathrm{Cauchy}(0, 1/\\gamma)$. More generally, the Cauchy family is closed under linear fractional transformations $(aX + b)/(cX + d)$.' },
      { text: '<b>Stable distributions.</b> The Cauchy distribution is the stable distribution with index $\\alpha = 1$ and no skew. Stable laws are the only possible limits of normalized sums of independent, identically distributed variables; the normal is the case $\\alpha = 2$.' },
    ],

    uses: {
      frequentist: [
        '<b>A counterexample for the law of large numbers and the central limit theorem.</b> Because the sample mean of Cauchy data has the same distribution as a single observation, the Cauchy distribution is the standard example of why these theorems need a finite mean and a finite variance.',
        '<b>Estimating the center of heavy-tailed data.</b> For Cauchy data the sample median is a consistent estimator of $x_0$, with large-sample variance $\\pi^2\\gamma^2/(4n)$, while the sample mean is useless. The maximum-likelihood estimate has the smaller variance $2\\gamma^2/n$ but must be found numerically, and the likelihood can have several local maxima.',
        '<b>The t-test with two observations.</b> A one-sample t statistic computed from $n = 2$ observations has $n - 1 = 1$ degree of freedom, so under the null hypothesis it is Cauchy distributed.',
        '<b>Ratios of estimates.</b> The ratio of two estimates that are approximately normal with mean near zero, such as the $x$-intercept of a fitted line, has heavy, Cauchy-like tails. Fieller’s method gives confidence intervals for such ratios.',
        '<b>Robust regression.</b> Assuming Cauchy errors gives the Cauchy (Lorentzian) loss $\\ln(1 + r^2/c^2)$ for a residual $r$ and a tuning constant $c$, an M-estimator that almost ignores gross outliers.',
      ],
      bayesian: [
        '<b>Default prior for an effect size.</b> The Jeffreys–Zellner–Siow Bayes factor for the t-test puts a Cauchy prior on the standardized effect size $\\delta$ (Rouder et al., 2009). A common default scale is $\\gamma = \\sqrt2/2 \\approx 0.71$; it is the default in JASP and the BayesFactor R package.',
        '<b>Weakly informative priors for regression coefficients.</b> Gelman et al. (2008) recommend independent $\\mathrm{Cauchy}(0, 2.5)$ priors for logistic regression coefficients, after rescaling each continuous predictor to mean 0 and standard deviation 0.5. They keep estimates finite under separation while allowing an occasional large effect.',
        '<b>Scale priors and shrinkage.</b> The half-Cauchy prior on a standard deviation (Gelman, 2006) and the horseshoe prior, in which each coefficient is normal with a half-Cauchy local scale (Carvalho, Polson & Scott, 2010), are built from the Cauchy distribution.',
        '<b>Computation through a normal mixture.</b> A Cauchy variable is a normal variable with a random precision: $X \\mid \\tau \\sim \\mathcal N(x_0, \\gamma^2/\\tau)$ with $\\tau \\sim \\mathrm{Gamma}(\\tfrac12, \\tfrac12)$. Gibbs samplers for Cauchy priors and likelihoods use this representation. There is no conjugate prior for $x_0$.',
        '<b>Robust likelihoods.</b> A Cauchy (or low-degree-of-freedom $t$) likelihood lets a few outlying observations have little influence on the posterior.',
      ],
      modeling: [
        '<b>Physics.</b> The Cauchy density is the Lorentzian line shape of spectral lines broadened by collisions and the Breit–Wigner shape of resonances in particle physics.',
        '<b>Geometry and the lighthouse problem.</b> When a direction is uniformly random, the point where it meets a fixed line is Cauchy distributed. Inferring the lighthouse position from flashes on the shore is a classic exercise in Bayesian inference (Gull, 1988).',
        '<b>Embedding methods.</b> t-SNE measures similarity between points in the low-dimensional map with the kernel $(1 + d^2)^{-1}$, which is the Cauchy density shape; its heavy tails keep dissimilar points apart.',
        '<b>Heavy-tailed search.</b> Cauchy-distributed steps give occasional long jumps. They are used in fast simulated annealing (Szu & Hartley, 1987), in evolutionary algorithms and in Lévy-flight models of animal foraging.',
        '<b>Stress-testing methods.</b> Cauchy data are a standard way to check whether a statistical procedure or a simulation survives extreme values.',
      ],
    },

    references: [
      { text: 'Wikipedia: Cauchy distribution.', url: 'https://en.wikipedia.org/wiki/Cauchy_distribution' },
      { text: 'Johnson, N. L., Kotz, S., & Balakrishnan, N. (1994). <i>Continuous Univariate Distributions</i>, Vol. 1 (2nd ed.), Chapter 16. Wiley.' },
      { text: 'Casella, G., & Berger, R. L. (2002). <i>Statistical Inference</i> (2nd ed.), Section 3.3 and Example 4.3.6. Duxbury.' },
      { text: 'Rouder, J. N., Speckman, P. L., Sun, D., Morey, R. D., & Iverson, G. (2009). Bayesian t tests for accepting and rejecting the null hypothesis. <i>Psychonomic Bulletin & Review</i>, 16(2), 225–237.', url: 'https://doi.org/10.3758/PBR.16.2.225' },
      { text: 'Gelman, A., Jakulin, A., Pittau, M. G., & Su, Y.-S. (2008). A weakly informative default prior distribution for logistic and other regression models. <i>Annals of Applied Statistics</i>, 2(4), 1360–1383.', url: 'https://doi.org/10.1214/08-AOAS191' },
      { text: 'Gelman, A., Carlin, J. B., Stern, H. S., Dunson, D. B., Vehtari, A., & Rubin, D. B. (2013). <i>Bayesian Data Analysis</i> (3rd ed.), Section 17.2 and Appendix A. CRC Press.', url: 'http://www.stat.columbia.edu/~gelman/book/' },
      { text: 'Leemis, L. M., & McQueston, J. T. (2008). Univariate distribution relationships. <i>The American Statistician</i>, 62(1), 45–53.', url: 'https://doi.org/10.1198/000313008X270448' },
    ],
  },
};

function fmtN(v) { return String(Number(v.toPrecision(4))).replace(/^-/, '−'); }
