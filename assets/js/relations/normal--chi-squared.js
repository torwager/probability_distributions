// Normal -> Chi-squared: the sum of k squared independent standard normals is chi-squared with k
// degrees of freedom; for a normal sample, (n - 1) S^2 / sigma^2 is chi-squared with n - 1.
// The demo is self-contained: the chi-squared density and CDF are computed here with core/math.js.

import { getRelation } from '../catalog.js';
import { lgamma, gammaP, gammaPinv, LN2 } from '../core/math.js';

const REL = getRelation('normal--chi-squared');

const chiPdf = (x, k) => (x <= 0 ? (x === 0 && k === 2 ? 0.5 : x === 0 && k < 2 ? Infinity : 0)
  : Math.exp((k / 2 - 1) * Math.log(x) - x / 2 - (k / 2) * LN2 - lgamma(k / 2)));
const chiCdf = (x, k) => (x <= 0 ? 0 : gammaP(k / 2, x / 2));
const chiQ = (u, k) => 2 * gammaPinv(k / 2, u);
const f3 = v => String(Number(v.toPrecision(4)));

export default {
  id: 'normal--chi-squared',
  from: 'normal',
  to: 'chi-squared',
  title: 'Adding up squared standard normal variables gives a chi-squared distribution',

  plain: [
    'Take $k$ independent standard normal variables, square each one, and add them up. The total has a chi-squared distribution with $k$ degrees of freedom. Its mean is $k$, because each squared standard normal has mean 1, and its variance is $2k$.',
    'Many statistics are sums of squared, approximately normal deviations, and this is why they have chi-squared distributions. The most important case is the sample variance of normal data: $(n-1)S^2/\\sigma^2$ is chi-squared with $n - 1$ degrees of freedom. One degree of freedom is lost because the deviations are measured from the sample mean, which is estimated from the same data. Pearson’s goodness-of-fit statistic and likelihood-ratio statistics are chi-squared for related reasons.',
  ],

  statementTex: REL.statement,
  glossary: [
    { sym: 'Z_1, \\dots, Z_k', meaning: 'Independent standard normal variables.' },
    { sym: '\\overset{iid}{\\sim}', meaning: 'Independent and identically distributed: every $Z_i$ has the same distribution and none affects the others.' },
    { sym: '\\mathcal N(0,1)', meaning: 'The standard normal distribution (mean 0, standard deviation 1).' },
    { sym: '\\sum_{i=1}^k Z_i^2', meaning: 'The sum of the squares $Z_1^2 + \\dots + Z_k^2$: the squared distance from the origin of the point $(Z_1, \\dots, Z_k)$.' },
    { sym: '\\chi^2_k', meaning: 'The chi-squared distribution with $k$ degrees of freedom (mean $k$, variance $2k$).' },
    { sym: 'k', meaning: 'The number of squared terms, called the degrees of freedom.' },
    { sym: '\\mathcal N(\\mu, \\sigma^2)', meaning: 'A normal distribution with mean $\\mu$ and variance $\\sigma^2$ (standard deviation $\\sigma$).' },
    { sym: 'n', meaning: 'The sample size.' },
    { sym: 'S^2', meaning: 'The sample variance $\\frac{1}{n-1}\\sum_{i=1}^n (X_i - \\bar X)^2$, where $\\bar X$ is the sample mean.' },
    { sym: '(n-1)S^2/\\sigma^2', meaning: 'The sum of squared deviations from the sample mean, measured in units of the true variance.' },
    { sym: '\\chi^2_{n-1}', meaning: 'Chi-squared with $n - 1$ degrees of freedom: one fewer than the sample size, because the sample mean is estimated.' },
  ],

  why: [
    '<b>One squared normal.</b> For $Z \\sim \\mathcal N(0,1)$ the moment-generating function of $Z^2$ is',
    { tex: '\\mathrm{E}\\big[e^{tZ^2}\\big] = \\int_{-\\infty}^{\\infty} \\frac{1}{\\sqrt{2\\pi}} e^{-(1-2t)z^2/2}\\,dz = (1 - 2t)^{-1/2}, \\qquad t < \\tfrac12,' },
    'which is the moment-generating function of $\\mathrm{Gamma}(\\tfrac12, \\tfrac12) = \\chi^2_1$. Moment-generating functions of independent variables multiply, so the sum of $k$ squares has $(1-2t)^{-k/2}$, the moment-generating function of $\\mathrm{Gamma}(\\tfrac k2, \\tfrac12) = \\chi^2_k$.',
    '<b>A geometric view.</b> The point $(Z_1, \\dots, Z_k)$ has a density that depends only on its distance $r$ from the origin, $\\propto e^{-r^2/2}$. The sphere of radius $r$ has surface area proportional to $r^{k-1}$, so the squared distance $x = r^2$ has density proportional to $x^{(k-1)/2} e^{-x/2} \\cdot x^{-1/2} = x^{k/2 - 1} e^{-x/2}$, the chi-squared density.',
    '<b>The sample variance.</b> Write the sample as $X_i = \\mu + \\sigma Z_i$. A rotation of the $n$-dimensional coordinates (the Helmert transformation) turns $Z_1, \\dots, Z_n$ into $n$ new independent standard normals, one of which is $\\sqrt n\\,\\bar Z$. The squared distance from the origin is unchanged by the rotation, so',
    { tex: '\\sum_{i=1}^n Z_i^2 = n\\bar Z^2 + \\sum_{i=1}^n (Z_i - \\bar Z)^2 \\quad\\Rightarrow\\quad \\frac{(n-1)S^2}{\\sigma^2} = \\sum_{i=1}^n (Z_i - \\bar Z)^2 \\sim \\chi^2_{n-1},' },
    'a sum of the remaining $n - 1$ squared normals. The same argument shows that $\\bar X$ and $S^2$ are independent, which is needed for the t statistic (Cochran’s theorem generalizes it to sums of squares in ANOVA and regression).',
  ],

  references: [
    { text: 'Wikipedia: Chi-squared distribution (definition and proofs).', url: 'https://en.wikipedia.org/wiki/Chi-squared_distribution' },
    { text: 'Wikipedia: Cochran’s theorem.', url: 'https://en.wikipedia.org/wiki/Cochran%27s_theorem' },
    { text: 'Casella, G., & Berger, R. L. (2002). <i>Statistical Inference</i> (2nd ed.), Lemma 5.3.2 and Theorem 5.3.1. Duxbury.' },
    { text: 'Leemis, L. M., & McQueston, J. T. (2008). Univariate distribution relationships. <i>The American Statistician</i>, 62(1), 45–53.', url: 'https://doi.org/10.1198/000313008X270448' },
  ],

  demo(container, ctx) {
    const { ui } = ctx;
    const { h } = ui;
    const boxes = { sum: h('div'), variance: h('div', { hidden: true }) };
    const built = {};
    const show = v => {
      for (const k in boxes) boxes[k].hidden = k !== v;
      if (!built[v]) { built[v] = true; (v === 'sum' ? sumDemo : varianceDemo)(boxes[v], ctx); }
    };
    const seg = ui.segmented([
      { value: 'sum', label: 'Sum of k squared normals' },
      { value: 'variance', label: 'Sample variance (n − 1)S²/σ²' },
    ], 'sum', show, 'Which statistic to simulate');
    container.append(h('div', { style: 'margin-bottom:.6rem' }, seg.el), boxes.sum, boxes.variance);
    show('sum');
  },
};

function sumDemo(box, { demos }) {
  demos.simulationDemo(box, null, {
    intro: 'Each simulated value is $Z_1^2 + \\dots + Z_k^2$ for $k$ fresh standard normal draws. The histogram is compared with the $\\chi^2_k$ density. With $k = 1$ most values are near 0 (a squared normal is usually small); as $k$ grows the histogram moves right, centered near $k$, and becomes more symmetric.',
    params: [
      { key: 'k', sym: 'k', name: 'number of squared normals', meaning: 'How many independent squared standard normal variables are added.', min: 1, max: 40, default: 3, integer: true },
    ],
    sample: (rng, { k }) => { let s = 0; for (let i = 0; i < k; i++) { const z = rng.normal(); s += z * z; } return s; },
    sampleName: 'sums of k squared standard normals',
    target: { name: ({ k }) => `chi-squared density, k = ${k}`, pdf: (x, { k }) => chiPdf(x, k), cdf: (x, { k }) => chiCdf(x, k) },
    range: ({ k }) => [0, chiQ(0.997, k)],
    xLabel: 'sum of squares',
    readout: ({ k }) => `Theory: mean $k$ = <b>${k}</b>, standard deviation $\\sqrt{2k}$ = <b>${f3(Math.sqrt(2 * k))}</b>. The upper 5% critical value of $\\chi^2_{${k}}$ is <b>${f3(chiQ(0.95, k))}</b>.`,
  });
}

function varianceDemo(box, { demos }) {
  demos.simulationDemo(box, null, {
    intro: 'Each simulated value comes from a fresh sample of $n$ values from $\\mathcal N(\\mu = 5, \\sigma^2)$: compute the sample variance $S^2$ and form $(n-1)S^2/\\sigma^2$. The histogram matches $\\chi^2_{n-1}$, not $\\chi^2_n$: its mean is $n - 1$, because measuring deviations from the sample mean rather than the true mean makes them slightly smaller. The value of $\\sigma$ does not matter.',
    params: [
      { key: 'n', sym: 'n', name: 'sample size', meaning: 'Number of normal values in each sample.', min: 2, max: 30, default: 5, integer: true },
      { key: 'sigma', sym: '\\sigma', name: 'population standard deviation', meaning: 'The true standard deviation; it cancels after dividing by $\\sigma^2$.', min: 0.2, max: 5, default: 2 },
    ],
    sample: (rng, { n, sigma }) => {
      const xs = new Array(n); let s = 0;
      for (let i = 0; i < n; i++) { xs[i] = rng.normal(5, sigma); s += xs[i]; }
      const m = s / n; let ss = 0;
      for (let i = 0; i < n; i++) ss += (xs[i] - m) ** 2;
      return ss / (sigma * sigma);
    },
    sampleName: '(n − 1)S²/σ² from simulated samples',
    target: { name: ({ n }) => `chi-squared density, k = n − 1 = ${n - 1}`, pdf: (x, { n }) => chiPdf(x, n - 1), cdf: (x, { n }) => chiCdf(x, n - 1) },
    range: ({ n }) => [0, chiQ(0.997, n - 1)],
    xLabel: '(n − 1)S²/σ²',
    readout: ({ n }) => `Theory: mean $n - 1$ = <b>${n - 1}</b>. A 95% confidence interval for $\\sigma^2$ divides $(n-1)s^2$ by the quantiles <b>${f3(chiQ(0.975, n - 1))}</b> and <b>${f3(chiQ(0.025, n - 1))}</b> of $\\chi^2_{${n - 1}}$.`,
  });
}
