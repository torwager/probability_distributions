// Pareto (type I) distribution with scale (minimum value) x_m and tail index alpha.
// Follows the structure of the reference module dists/normal.js.

import { catalogParams } from '../catalog.js';

function pdf(x, { xm, alpha }) {
  if (x < xm) return 0;
  return Math.exp(Math.log(alpha) + alpha * Math.log(xm) - (alpha + 1) * Math.log(x));
}
const cdf = (x, { xm, alpha }) => (x <= xm ? 0 : -Math.expm1(alpha * Math.log(xm / x)));
const sf = (x, { xm, alpha }) => (x <= xm ? 1 : Math.exp(alpha * Math.log(xm / x)));
const quantile = (u, { xm, alpha }) => xm * Math.exp(-Math.log1p(-u) / alpha);

const meanOf = ({ xm, alpha }) => (alpha > 1 ? alpha * xm / (alpha - 1) : Infinity);
/** Share of the total held by the largest fraction q of the values (for alpha > 1): q^(1 - 1/alpha). */
const topShare = (q, alpha) => (alpha > 1 ? Math.pow(q, 1 - 1 / alpha) : 1);

function stats(p) {
  const { xm, alpha: a } = p;
  const variance = a > 2 ? xm * xm * a / ((a - 1) ** 2 * (a - 2)) : Infinity;
  return {
    mean: meanOf(p),
    variance,
    sd: Math.sqrt(variance),
    median: xm * Math.pow(2, 1 / a),
    mode: xm,
    // the third (fourth) moment is infinite for alpha <= 3 (alpha <= 4); with an infinite variance the ratio is undefined
    skewness: a > 3 ? 2 * (1 + a) / (a - 3) * Math.sqrt((a - 2) / a) : a > 2 ? Infinity : NaN,
    exKurtosis: a > 4 ? 6 * (a ** 3 + a * a - 6 * a - 2) / (a * (a - 3) * (a - 4)) : a > 2 ? Infinity : NaN,
    entropy: Math.log(xm / a) + 1 / a + 1,
  };
}

export default {
  id: 'pareto',
  name: 'Pareto',
  kind: 'continuous',

  params: catalogParams('pareto', { xm: { step: 0.05 }, alpha: { step: 0.05, dragStep: 0.01 } }),

  pdf,
  cdf,
  sf,
  quantile,
  sample: (rng, { xm, alpha }) => rng.pareto(xm, alpha),

  testParams: [{ xm: 0.5, alpha: 5 }, { xm: 3, alpha: 1.5 }, { xm: 1, alpha: 0.7 }, { xm: 2, alpha: 10 }, { xm: 0.2, alpha: 3.5 }, { xm: 4, alpha: 2.5 }],

  range: p => [p.xm, Infinity],
  support(p) {
    // the tail is a power law, so a window holding 99.95% of the probability would squash the curve
    // against x_m; show up to the 97th percentile, and at most x_m (1 + 12/alpha) for very heavy tails
    const { xm, alpha } = p;
    const hi = Math.min(quantile(0.97, p), xm * (1 + 12 / alpha));
    const lo = Math.max(-0.02 * hi, xm - 0.25 * (hi - xm));
    return [lo, hi];
  },

  stats,

  // Handles:
  //  - a triangle under the axis at x_m, the smallest possible value: drag it to move the start of the support;
  //  - an arrow from the axis up to the top of the density at x_m, whose height is alpha / x_m: drag its tip up
  //    or down to change the tail index (alpha = height * x_m). A taller start means a faster-falling tail.
  handles: [
    {
      type: 'xPoint', param: 'xm', id: 'xm', label: 'xₘ',
      ariaLabel: 'Minimum value x_m. Drag left or right, or use the arrow keys.',
    },
    {
      type: 'vArrow', param: 'alpha', id: 'alpha', label: 'α',
      ariaLabel: 'Tail index α, shown as the height α/x_m of the density at x_m. Drag up or down, or use the arrow keys.',
      from: p => ({ x: p.xm, y: 0 }),
      to: p => ({ x: p.xm, y: p.alpha / p.xm }),
      set: (pt, p) => ({ alpha: Math.max(pt.y, 0) * p.xm }),
    },
  ],

  explorer: {
    readouts: [
      { key: 'mean', label: 'Mean αxₘ/(α − 1)' },
      { key: 'median', label: 'Median xₘ·2^(1/α)' },
      { key: 'sd', label: 'Standard deviation' },
      { label: 'P(X > 10 xₘ) = 10^(−α)', value: p => Math.pow(10, -p.alpha) },
      { label: 'Share of the total held by the largest 20%', value: p => (p.alpha > 1 ? `${fmtN(100 * topShare(0.2, p.alpha))}%` : '100%') },
    ],
    // leave room above the arrow tip (the top of the jump at x_m) for the x_m label
    yMax: p => 1.15 * p.alpha / p.xm,
    // mark the mean when it is finite; it runs off to infinity as alpha falls to 1
    extraLayers: (p, view) => {
      const m = meanOf(p);
      const top = view.y[1];
      // the density jumps at x_m and then falls steeply; the evenly spaced curve samples can miss the top of
      // the jump, so draw the start of the curve finely, beginning with the vertical edge at x_m
      const w = view.x[1] - view.x[0];
      const edge = [[p.xm, 0]];
      for (let i = 0; i <= 60; i++) { const x = p.xm + 0.04 * w * (i / 60) ** 2; edge.push([x, pdf(x, p)]); }
      const out = [{ id: 'edge', type: 'line', points: edge, cls: 'curve-main' }];
      if (!Number.isFinite(m)) return [...out, { id: 'mean-lbl', type: 'text', x: view.x[1], y: 0.55 * top, text: 'mean is infinite (α ≤ 1)', anchor: 'end', dx: -6, cls: 'mean-label' }];
      if (m > view.x[1]) return [...out, { id: 'mean-lbl', type: 'text', x: view.x[1], y: 0.55 * top, text: `mean ${fmtN(m)} →`, anchor: 'end', dx: -6, cls: 'mean-label' }];
      return [...out,
        { id: 'mean-seg', type: 'segment', x1: m, y1: 0, x2: m, y2: Math.max(pdf(m, p), 0.35 * top), cls: 'mean-line' },
        { id: 'mean-lbl', type: 'text', x: m, y: Math.max(pdf(m, p), 0.35 * top), text: 'mean', dy: -6, dx: 4, anchor: 'start', cls: 'mean-label' },
      ];
    },
  },

  content: {
    description: [
      'The Pareto distribution is the basic power-law distribution. It describes positive quantities that have a smallest possible value and a very long right tail, so that a few values are enormous compared with the typical one: incomes and wealth above some level, the populations of cities, the sizes of files on a server, insurance claims, and the energies of earthquakes. Vilfredo Pareto introduced it in the 1890s to describe the distribution of income.',
      'It takes values $x \\ge x_m$ and has two parameters. The scale $x_m$ is the smallest possible value; the density is highest there and falls off for larger values. The tail index $\\alpha$ sets how fast it falls: the probability of exceeding $x$ is $(x_m/x)^{\\alpha}$, a power of $x$, so doubling $x$ always divides that probability by $2^{\\alpha}$. A smaller $\\alpha$ means a heavier tail. For $\\alpha \\le 1$ the mean is infinite, and for $\\alpha \\le 2$ the variance is infinite, so averages of Pareto data behave very differently from averages of normal data.',
      'The symbol $\\alpha$ here is a tail index; it is unrelated to the shape $\\alpha$ of the gamma and beta distributions. This page uses the Pareto type I form. The Lomax (Pareto type II) distribution is the same curve shifted to start at 0, and the generalized Pareto distribution used in extreme-value analysis contains both.',
    ],
    explorerIntro: 'The left plot shows the density $f(x)$ and the right plot the cumulative distribution $F(x)$. Drag the amber triangle under the axis to move the minimum value $x_m$, where the density starts. Drag the tip of the amber arrow up or down to change the tail index $\\alpha$: the arrow reaches the top of the density at $x_m$, which is $\\alpha/x_m$, so a taller start goes with a faster-falling tail. The thin line marks the mean when it is finite; watch it run off to the right as $\\alpha$ approaches 1.',

    pdfTex: 'f(x \\mid x_m, \\alpha) = \\frac{\\alpha\\, x_m^{\\alpha}}{x^{\\alpha + 1}} \\quad \\text{for } x \\ge x_m',
    glossary: [
      { sym: 'x', meaning: 'A possible value of the random variable $X$. It is at least $x_m$.' },
      { sym: 'f(x \\mid x_m, \\alpha)', meaning: 'The probability density at $x$ given the parameters. It is 0 below $x_m$.' },
      { sym: 'x_m', meaning: 'The scale: the smallest possible value, a positive number. The density is highest there, at $\\alpha/x_m$.' },
      { sym: '\\alpha', meaning: 'The tail index (also called the Pareto index or shape), a positive number. Larger values mean a thinner tail and values closer to $x_m$.' },
      { sym: 'x^{\\alpha + 1}', meaning: 'The power of $x$ in the denominator: the density falls like $1/x^{\\alpha+1}$, a power law, rather than exponentially.' },
      { sym: '\\alpha\\, x_m^{\\alpha}', meaning: 'The normalizing constant, which makes the total area above $x_m$ equal to 1.' },
    ],

    cdfTex: 'F(x \\mid x_m, \\alpha) = P(X \\le x) = 1 - \\left(\\frac{x_m}{x}\\right)^{\\alpha} \\quad \\text{for } x \\ge x_m',
    cdfGlossary: [
      { sym: 'F(x \\mid x_m, \\alpha)', meaning: 'The cumulative distribution function: the probability that $X$ is at most $x$. It is 0 for $x < x_m$.' },
      { sym: 'P(X \\le x)', meaning: 'The probability that the random variable $X$ takes a value at most $x$.' },
      { sym: '\\left(\\dfrac{x_m}{x}\\right)^{\\alpha}', meaning: 'The survival function $P(X > x)$: the probability of exceeding $x$. On a log–log plot it is a straight line with slope $-\\alpha$.' },
      { sym: 'x_m,\\ \\alpha', meaning: 'The minimum value and the tail index.' },
    ],
    extraFormulas: [
      {
        title: 'Quantile function',
        intro: 'Solving $F(x) = u$ gives a closed-form quantile function, which is also how Pareto random numbers are generated from a uniform $U$:',
        tex: 'Q(u) = x_m\\,(1 - u)^{-1/\\alpha}, \\qquad X = x_m\\,U^{-1/\\alpha} \\ \\text{with } U \\sim \\mathrm U(0, 1)',
        glossary: [
          { sym: 'u', meaning: 'A probability between 0 and 1.' },
          { sym: 'U \\sim \\mathrm U(0,1)', meaning: 'A random number spread evenly between 0 and 1.' },
        ],
      },
      {
        title: 'Maximum-likelihood estimates',
        intro: 'From a sample $x_1, \\dots, x_n$, the maximum-likelihood estimates are',
        tex: '\\hat x_m = \\min_i x_i, \\qquad \\hat\\alpha = \\frac{n}{\\sum_{i=1}^n \\ln(x_i/\\hat x_m)}',
        glossary: [
          { sym: '\\hat x_m,\\ \\hat\\alpha', meaning: 'The estimates of $x_m$ and $\\alpha$ (the hat marks an estimate).' },
          { sym: 'n', meaning: 'The sample size.' },
          { sym: '\\ln(x_i/\\hat x_m)', meaning: 'The log of each value relative to the minimum. These are exponential with rate $\\alpha$, so $\\hat\\alpha$ is one over their mean.' },
        ],
      },
    ],

    properties: [
      { name: 'Support', tex: 'x \\in [x_m, \\infty)', explain: 'Values below $x_m$ are impossible. The density jumps from 0 to its maximum $\\alpha/x_m$ at $x_m$.' },
      { name: 'Mean', tex: '\\mathrm{E}[X] = \\frac{\\alpha\\, x_m}{\\alpha - 1} \\ \\text{for } \\alpha > 1', value: p => meanOf(p), explain: 'Infinite for $\\alpha \\le 1$: the tail is so heavy that the average of a sample keeps growing as more data arrive. Even for $\\alpha$ slightly above 1, sample means are dominated by the few largest values and converge very slowly.' },
      { name: 'Median', tex: 'x_m\\, 2^{1/\\alpha}', value: p => p.xm * Math.pow(2, 1 / p.alpha), explain: 'Always finite. For heavy tails the mean is far above the median.' },
      { name: 'Mode', tex: 'x_m', value: p => p.xm, explain: 'The density is highest at the smallest possible value and decreases from there.' },
      { name: 'Variance', tex: '\\frac{x_m^2\\, \\alpha}{(\\alpha - 1)^2 (\\alpha - 2)} \\ \\text{for } \\alpha > 2', value: p => stats(p).variance, explain: 'Infinite for $\\alpha \\le 2$ (the second moment $\\mathrm{E}[X^2]$ diverges). Then the central limit theorem does not apply to sums of Pareto variables in its usual form; sums are instead attracted to a stable distribution.' },
      { name: 'Standard deviation', tex: '\\frac{x_m}{\\alpha - 1}\\sqrt{\\frac{\\alpha}{\\alpha - 2}} \\ \\text{for } \\alpha > 2', value: p => stats(p).sd, explain: 'Infinite for $\\alpha \\le 2$.' },
      { name: 'Skewness', tex: '\\frac{2(1 + \\alpha)}{\\alpha - 3}\\sqrt{\\frac{\\alpha - 2}{\\alpha}} \\ \\text{for } \\alpha > 3', value: p => stats(p).skewness, explain: 'Always positive, and at least 2. Defined for $\\alpha > 3$; for $2 < \\alpha \\le 3$ the third moment is infinite (the value is shown as ∞), and for $\\alpha \\le 2$ it is undefined because the variance is infinite. As $\\alpha \\to \\infty$ it approaches 2.' },
      { name: 'Excess kurtosis', tex: '\\frac{6(\\alpha^3 + \\alpha^2 - 6\\alpha - 2)}{\\alpha(\\alpha - 3)(\\alpha - 4)} \\ \\text{for } \\alpha > 4', value: p => stats(p).exKurtosis, explain: 'Defined for $\\alpha > 4$; infinite for $2 < \\alpha \\le 4$ and undefined for $\\alpha \\le 2$. As $\\alpha \\to \\infty$ it approaches 6, the exponential value.' },
      { name: 'Entropy', tex: '\\ln\\frac{x_m}{\\alpha} + \\frac{1}{\\alpha} + 1', value: p => stats(p).entropy, explain: 'Differential entropy in nats. It is finite for every $\\alpha > 0$, even when the mean is infinite.' },
      { name: 'Moment-generating function', tex: 'M(t) = \\infty \\ \\ (t > 0)', explain: '$M(t) = \\mathrm{E}[e^{tX}]$ is infinite for every $t > 0$, because the tail decays more slowly than any exponential, so the moment-generating function does not exist.' },
      { name: 'Characteristic function', tex: '\\varphi(t) = \\alpha\\,(-i x_m t)^{\\alpha}\\,\\Gamma(-\\alpha, -i x_m t)', explain: '$\\mathrm{E}[e^{itX}]$, where $i = \\sqrt{-1}$. It exists for every $\\alpha$. Here $\\Gamma(s, z) = \\int_z^{\\infty} u^{s-1}e^{-u}\\,du$ is the upper incomplete gamma function, taken at a complex argument, so in practice it is computed numerically.' },
      { name: 'Moments', tex: '\\mathrm{E}[X^n] = \\frac{\\alpha\\, x_m^n}{\\alpha - n}', explain: 'For $n < \\alpha$. Only the moments of order below $\\alpha$ exist; all higher ones are infinite. This is the defining feature of a power-law tail.' },
      { name: 'Survival function (power law)', tex: 'P(X > x) = \\left(\\frac{x_m}{x}\\right)^{\\alpha}', value: p => `${fmtN(Math.pow(10, -p.alpha))} at x = 10xₘ`, explain: 'A straight line with slope $-\\alpha$ on a log–log plot. Multiplying $x$ by 10 always divides the probability of exceeding it by $10^{\\alpha}$, whatever $x$ is: the tail looks the same at every scale.' },
      { name: 'Self-similarity', tex: 'X \\mid X > c \\ \\sim \\ \\mathrm{Pareto}(c, \\alpha)', explain: 'Values above any threshold $c \\ge x_m$ again follow a Pareto distribution with the same $\\alpha$. For example, the expected excess $\\mathrm{E}[X - c \\mid X > c] = c/(\\alpha - 1)$ grows in proportion to $c$ (for $\\alpha > 1$): the longer something has lasted, the longer it is expected to last.' },
      { name: 'Hazard function', tex: 'h(x) = \\frac{f(x)}{1 - F(x)} = \\frac{\\alpha}{x}', explain: 'Decreasing: the rate at which values “stop” falls the larger they get, unlike the constant hazard of the exponential.' },
      { name: 'Inequality (80–20 rule and Gini coefficient)', tex: '\\text{share of top } q = q^{1 - 1/\\alpha}, \\quad G = \\frac{1}{2\\alpha - 1}', value: p => (p.alpha > 1 ? `${fmtN(100 * topShare(0.2, p.alpha))}% held by top 20%` : 'infinite mean'), explain: 'For incomes, the largest fraction $q$ of earners hold a share $q^{1 - 1/\\alpha}$ of the total ($\\alpha > 1$); for $\\alpha \\le 1$ the mean is infinite, and in large samples the top 20% hold nearly all of the total. With $\\alpha = \\log_4 5 \\approx 1.161$ the top 20% hold 80% (the Pareto principle). The Gini coefficient $G$, a standard measure of inequality between 0 and 1, is $1/(2\\alpha - 1)$ for $\\alpha \\ge 1$.' },
    ],

    limits: [
      { text: '<b>Logarithm is exponential.</b> $X \\sim \\mathrm{Pareto}(x_m, \\alpha)$ if and only if $\\ln(X/x_m) \\sim \\mathrm{Exp}(\\alpha)$; equivalently $x_m e^{E} \\sim \\mathrm{Pareto}(x_m, \\alpha)$ for $E \\sim \\mathrm{Exp}(\\alpha)$. A power law on the original scale is an exponential tail on the log scale.', relation: 'exponential--pareto', to: 'exponential' },
      { text: '<b>From a uniform variable.</b> If $U \\sim \\mathrm U(0, 1)$ then $x_m U^{-1/\\alpha} \\sim \\mathrm{Pareto}(x_m, \\alpha)$ (inverse-CDF sampling).', to: 'uniform' },
      { text: '<b>Large tail index.</b> As $\\alpha \\to \\infty$ the distribution concentrates at $x_m$. Rescaled, $\\alpha(X - x_m)/x_m$ approaches the standard exponential distribution.', to: 'exponential' },
      { text: '<b>Smallest of several.</b> The minimum of $n$ independent $\\mathrm{Pareto}(x_m, \\alpha)$ variables is $\\mathrm{Pareto}(x_m, n\\alpha)$, since the survival functions multiply.' },
      { text: '<b>Lomax and generalized Pareto.</b> $X - x_m$ has the Lomax (Pareto type II) distribution, which starts at 0. The generalized Pareto distribution with location $x_m$, scale $x_m/\\alpha$ and shape $\\xi = 1/\\alpha$ is exactly $\\mathrm{Pareto}(x_m, \\alpha)$. By the Pickands–Balkema–de Haan theorem, the excesses over a high threshold of many distributions are approximately generalized Pareto, which is the basis of the peaks-over-threshold method in extreme-value analysis.' },
      { text: '<b>Exponential with a gamma-distributed rate.</b> If $\\lambda \\sim \\mathrm{Gamma}(\\alpha, \\beta)$ and $X \\mid \\lambda \\sim \\mathrm{Exp}(\\lambda)$, then $X + \\beta \\sim \\mathrm{Pareto}(\\beta, \\alpha)$: mixing exponential waiting times over a spread of rates produces a power-law tail.', to: 'gamma' },
      { text: '<b>Largest values.</b> The suitably rescaled maximum of many independent Pareto variables approaches the Fréchet distribution, the extreme-value distribution for heavy tails. The discrete counterpart of the Pareto is Zipf’s law.' },
    ],

    uses: {
      frequentist: [
        '<b>Estimating a tail index.</b> With $x_m$ known, the maximum-likelihood estimate is $\\hat\\alpha = n/\\sum_i \\ln(x_i/x_m)$, and $2n\\alpha/\\hat\\alpha$ has a $\\chi^2_{2n}$ distribution, which gives exact confidence intervals. The Hill estimator applies the same formula to the largest $k$ values of a sample to estimate the tail index of any heavy-tailed distribution.',
        '<b>Testing for power laws.</b> Clauset, Shalizi and Newman (2009) fit $x_m$ and $\\alpha$ by maximum likelihood, choose $x_m$ by minimizing the Kolmogorov–Smirnov distance, test the fit by a parametric bootstrap, and compare the power law with alternatives such as the log-normal by likelihood-ratio tests. Straight lines on log–log histograms alone are not reliable evidence.',
        '<b>Peaks over threshold.</b> In extreme-value statistics, exceedances of a high threshold are modeled with the generalized Pareto distribution to estimate return levels (for example, the 100-year flood), value at risk and expected shortfall in finance, and large insurance losses.',
      ],
      bayesian: [
        '<b>Conjugate prior for the upper end of a uniform.</b> If $\\theta \\sim \\mathrm{Pareto}(x_m, \\alpha)$ and $x_1, \\dots, x_n \\mid \\theta$ are independent $\\mathrm U(0, \\theta)$, the posterior is $\\theta \\mid x \\sim \\mathrm{Pareto}\\big(\\max(x_m, x_{(n)}),\\ \\alpha + n\\big)$, where $x_{(n)}$ is the largest observation. This is the Bayesian version of the “German tank problem” of estimating a maximum from serial numbers.',
        '<b>Conjugate prior for the tail index.</b> With $x_m$ known, a gamma prior $\\alpha \\sim \\mathrm{Gamma}(a, b)$ updates to $\\mathrm{Gamma}\\big(a + n,\\ b + \\sum_i \\ln(x_i/x_m)\\big)$, because $\\ln(x_i/x_m)$ are exponential with rate $\\alpha$.',
        '<b>Pareto-smoothed importance sampling.</b> In approximate leave-one-out cross-validation (PSIS-LOO), the largest importance weights are replaced by values from a fitted generalized Pareto distribution. Its estimated shape $\\hat k$ (the reciprocal of a tail index) is a diagnostic: values above about 0.7 flag observations for which the approximation is unreliable (Vehtari, Gelman & Gabry, 2017).',
        '<b>Scale priors.</b> As $\\alpha \\to 0$ the Pareto density approaches the improper prior $p(\\theta) \\propto 1/\\theta$ on $\\theta > x_m$, the usual noninformative (Jeffreys) prior for a scale parameter. Heavy-tailed Pareto-type priors are also used when very large values cannot be ruled out.',
      ],
      modeling: [
        '<b>Income and wealth.</b> The upper tail of income and wealth distributions is close to Pareto, with $\\alpha$ often estimated between about 1.5 and 3; the tail index is a standard summary of top-end inequality.',
        '<b>Sizes in nature and society.</b> City populations (Zipf’s law, $\\alpha$ near 1), firm sizes, earthquake energies (the Gutenberg–Richter law), forest-fire areas, and file sizes and transfer times on computer networks have approximately Pareto tails.',
        '<b>Networks and growth.</b> Preferential attachment, in which new links go preferentially to nodes that already have many, produces networks whose node degrees have a power-law tail (Barabási & Albert, 1999).',
        '<b>Neuroscience and behavior.</b> The sizes of neuronal avalanches in cortical tissue follow power laws (Beggs & Plenz, 2003), a signature studied in models of critical brain dynamics. Animal search paths with Pareto-distributed step lengths (Lévy flights) are studied as models of foraging.',
        '<b>Insurance, reliability and simulation.</b> Large insurance claims and reinsurance layers are priced with Pareto models; heavy-tailed service times in queueing simulations are often drawn from Pareto or Lomax distributions.',
      ],
    },

    references: [
      { text: 'Wikipedia: Pareto distribution.', url: 'https://en.wikipedia.org/wiki/Pareto_distribution' },
      { text: 'Arnold, B. C. (2015). <i>Pareto Distributions</i> (2nd ed.). CRC Press.' },
      { text: 'Johnson, N. L., Kotz, S., & Balakrishnan, N. (1994). <i>Continuous Univariate Distributions</i>, Vol. 1 (2nd ed.), Chapter 20. Wiley.' },
      { text: 'Leemis, L. M., & McQueston, J. T. (2008). Univariate distribution relationships. <i>The American Statistician</i>, 62(1), 45–53.', url: 'https://doi.org/10.1198/000313008X270448' },
      { text: 'Clauset, A., Shalizi, C. R., & Newman, M. E. J. (2009). Power-law distributions in empirical data. <i>SIAM Review</i>, 51(4), 661–703.', url: 'https://doi.org/10.1137/070710111' },
      { text: 'Newman, M. E. J. (2005). Power laws, Pareto distributions and Zipf’s law. <i>Contemporary Physics</i>, 46(5), 323–351.', url: 'https://doi.org/10.1080/00107510500052444' },
      { text: 'Gelman, A., Carlin, J. B., Stern, H. S., Dunson, D. B., Vehtari, A., & Rubin, D. B. (2013). <i>Bayesian Data Analysis</i> (3rd ed.), Appendix A. CRC Press.', url: 'http://www.stat.columbia.edu/~gelman/book/' },
      { text: 'Vehtari, A., Gelman, A., & Gabry, J. (2017). Practical Bayesian model evaluation using leave-one-out cross-validation and WAIC. <i>Statistics and Computing</i>, 27(5), 1413–1432.', url: 'https://doi.org/10.1007/s11222-016-9696-4' },
      { text: 'Beggs, J. M., & Plenz, D. (2003). Neuronal avalanches in neocortical circuits. <i>Journal of Neuroscience</i>, 23(35), 11167–11177.', url: 'https://doi.org/10.1523/JNEUROSCI.23-35-11167.2003' },
    ],
  },
};

function fmtN(v) { return String(Number(v.toPrecision(4))).replace(/^-/, '−'); }
