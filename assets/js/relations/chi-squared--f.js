// Chi-squared -> F: the ratio of two independent chi-squared variables, each divided by its degrees of
// freedom, is F distributed. The demo simulates the ratio and a one-way ANOVA under the null hypothesis.
// It is self-contained: the F density, CDF and quantiles are computed here with core/math.js.

import { getRelation } from '../catalog.js';
import { lbeta, betaI, betaIinv } from '../core/math.js';

const REL = getRelation('chi-squared--f');

function fPdf(x, d1, d2) {
  if (x < 0) return 0;
  if (x === 0) return d1 < 2 ? Infinity : d1 === 2 ? 1 : 0;
  return Math.exp((d1 / 2) * Math.log(d1 / d2) + (d1 / 2 - 1) * Math.log(x) - ((d1 + d2) / 2) * Math.log1p(d1 * x / d2) - lbeta(d1 / 2, d2 / 2));
}
const fCdf = (x, d1, d2) => (x <= 0 ? 0 : betaI(d1 * x / (d1 * x + d2), d1 / 2, d2 / 2));
/** upper quantile: the x with P(F > x) = q */
function fUpperQ(q, d1, d2) { const w = betaIinv(q, d2 / 2, d1 / 2); return d2 * (1 - w) / (d1 * w); }
const fRange = (d1, d2) => [0, Math.min(15, Math.max(3, fUpperQ(0.01, d1, d2)))];
const f3 = v => String(Number(v.toPrecision(4)));

export default {
  id: 'chi-squared--f',
  from: 'chi-squared',
  to: 'f',
  title: 'The ratio of two independent chi-squared variables, each divided by its degrees of freedom, has an F distribution',

  plain: [
    'Divide a chi-squared variable by its degrees of freedom and you get an estimate of a variance in units of the true variance: a number that averages 1. The ratio of two such independent estimates has the F distribution, with the numerator degrees of freedom $d_1$ and the denominator degrees of freedom $d_2$ as its two parameters.',
    'This is exactly the form of the F statistic in an analysis of variance (ANOVA) or a regression F-test. The numerator is the variance explained by an effect and the denominator the residual variance. When the effect is absent, both estimate the same error variance $\\sigma^2$, which cancels in the ratio, so the statistic follows $F(d_1, d_2)$ whatever $\\sigma^2$ is. The same holds for the ratio of two sample variances from normal populations with equal variances.',
  ],

  statementTex: REL.statement,
  glossary: [
    { sym: 'U \\sim \\chi^2_{d_1}', meaning: '$U$ is a chi-squared variable with $d_1$ degrees of freedom (in ANOVA, the effect sum of squares divided by $\\sigma^2$).' },
    { sym: 'V \\sim \\chi^2_{d_2}', meaning: '$V$ is a chi-squared variable with $d_2$ degrees of freedom (in ANOVA, the error sum of squares divided by $\\sigma^2$).' },
    { sym: '\\chi^2_d', meaning: 'The chi-squared distribution with $d$ degrees of freedom: a sum of $d$ squared independent standard normal variables.' },
    { sym: '\\text{independent}', meaning: '$U$ and $V$ carry no information about each other. In ANOVA this independence comes from Cochran’s theorem.' },
    { sym: 'd_1, d_2', meaning: 'The numerator and denominator degrees of freedom.' },
    { sym: '\\frac{U/d_1}{V/d_2}', meaning: 'The ratio of the two mean squares. Each part has mean 1, so the ratio is usually near 1.' },
    { sym: 'F(d_1, d_2)', meaning: 'The F distribution with $d_1$ and $d_2$ degrees of freedom.' },
    { sym: 'S_1^2, S_2^2', meaning: 'The sample variances of two independent samples from normal populations.' },
    { sym: 'n_1, n_2', meaning: 'The two sample sizes; each sample variance has $n_j - 1$ degrees of freedom.' },
  ],

  why: [
    '<b>Why the ratio is near 1.</b> $U/d_1$ is an average of $d_1$ squared standard normals, so it has mean 1 and variance $2/d_1$; likewise for $V/d_2$. When both degrees of freedom are large, both parts are close to 1 and so is the ratio. Small degrees of freedom make the parts noisy, and a small denominator in particular produces the long right tail.',
    '<b>The density.</b> Start from the joint density of the independent chi-squared variables $U$ and $V$, change variables to $X = (U/d_1)/(V/d_2)$ and $V$, and integrate $V$ out. The integral is a gamma-function integral, and the result is',
    { tex: 'f(x) = \\frac{1}{B\\!\\left(\\frac{d_1}{2}, \\frac{d_2}{2}\\right)} \\left(\\frac{d_1}{d_2}\\right)^{d_1/2} x^{d_1/2 - 1} \\left(1 + \\frac{d_1 x}{d_2}\\right)^{-(d_1 + d_2)/2},' },
    'where $B$ is the beta function. Equivalently, $U/(U + V) \\sim \\mathrm{Beta}(d_1/2, d_2/2)$ because $U$ and $V$ are gamma variables with the same rate, and $X$ is a monotone function of that beta variable.',
    '<b>ANOVA.</b> In a one-way ANOVA with $g$ groups and $N$ observations, Cochran’s theorem splits the total sum of squares of normal errors into independent pieces: under the null hypothesis $\\mathrm{SS}_{\\text{between}}/\\sigma^2 \\sim \\chi^2_{g-1}$ and $\\mathrm{SS}_{\\text{within}}/\\sigma^2 \\sim \\chi^2_{N-g}$. Their mean squares give',
    { tex: 'F = \\frac{\\mathrm{SS}_{\\text{between}}/(g-1)}{\\mathrm{SS}_{\\text{within}}/(N-g)} = \\frac{U/(g-1)}{V/(N-g)} \\sim F(g - 1, N - g),' },
    'and the unknown $\\sigma^2$ has cancelled. When the group means differ, the numerator grows and large values of $F$ become likely, so the test rejects in the upper tail. For two variances, $(n_j - 1)S_j^2/\\sigma_j^2 \\sim \\chi^2_{n_j - 1}$, and if $\\sigma_1 = \\sigma_2$ the ratio $S_1^2/S_2^2$ has the $F(n_1 - 1, n_2 - 1)$ distribution.',
  ],

  references: [
    { text: 'Wikipedia: F-distribution (characterization).', url: 'https://en.wikipedia.org/wiki/F-distribution' },
    { text: 'Wikipedia: One-way analysis of variance.', url: 'https://en.wikipedia.org/wiki/One-way_analysis_of_variance' },
    { text: 'Casella, G., & Berger, R. L. (2002). <i>Statistical Inference</i> (2nd ed.), Definition 5.3.6, Theorem 5.3.8 and Section 11.2. Duxbury.' },
    { text: 'Leemis, L. M., & McQueston, J. T. (2008). Univariate distribution relationships. <i>The American Statistician</i>, 62(1), 45–53.', url: 'https://doi.org/10.1198/000313008X270448' },
  ],

  demo(container, ctx) {
    const { ui } = ctx;
    const { h } = ui;
    const boxes = { ratio: h('div'), anova: h('div', { hidden: true }) };
    const built = {};
    const show = v => {
      for (const k in boxes) boxes[k].hidden = k !== v;
      if (!built[v]) { built[v] = true; (v === 'ratio' ? ratioDemo : anovaDemo)(boxes[v], ctx); }
    };
    const seg = ui.segmented([
      { value: 'ratio', label: 'Ratio of chi-squared variables' },
      { value: 'anova', label: 'ANOVA F statistic under the null' },
    ], 'ratio', show, 'Which construction to simulate');
    container.append(h('div', { style: 'margin-bottom:.6rem' }, seg.el), boxes.ratio, boxes.anova);
    show('ratio');
  },
};

function ratioDemo(box, { demos }) {
  demos.simulationDemo(box, null, {
    intro: 'Each simulated value is $(U/d_1)/(V/d_2)$ with independent draws $U \\sim \\chi^2_{d_1}$ and $V \\sim \\chi^2_{d_2}$ (each made by adding squared standard normals). The histogram is compared with the $F(d_1, d_2)$ density. Try a small $d_2$ to see the long right tail, and large values of both to see the ratio concentrate at 1.',
    params: [
      { key: 'd1', sym: 'd_1', name: 'numerator degrees of freedom', meaning: 'Degrees of freedom of $U$.', min: 1, max: 40, default: 4, integer: true },
      { key: 'd2', sym: 'd_2', name: 'denominator degrees of freedom', meaning: 'Degrees of freedom of $V$.', min: 1, max: 60, default: 12, integer: true },
    ],
    sample: (rng, { d1, d2 }) => {
      let u = 0, v = 0;
      for (let i = 0; i < d1; i++) { const z = rng.normal(); u += z * z; }
      for (let i = 0; i < d2; i++) { const z = rng.normal(); v += z * z; }
      return (u / d1) / (v / d2);
    },
    sampleName: '(U/d₁)/(V/d₂) for simulated chi-squared pairs',
    target: { name: ({ d1, d2 }) => `F(${d1}, ${d2}) density`, pdf: (x, { d1, d2 }) => fPdf(x, d1, d2), cdf: (x, { d1, d2 }) => fCdf(x, d1, d2) },
    range: ({ d1, d2 }) => fRange(d1, d2),
    xLabel: 'ratio',
    readout: ({ d1, d2 }) => `The upper 5% point of $F(${d1}, ${d2})$ is <b>${f3(fUpperQ(0.05, d1, d2))}</b>.` + (d2 > 2 ? ` The mean $d_2/(d_2 - 2)$ is <b>${f3(d2 / (d2 - 2))}</b>.` : ' With $d_2 \\le 2$ the mean is infinite, so the sample mean is unstable.'),
  });
}

function anovaDemo(box, { demos }) {
  // keep the latest batch of simulated statistics so that the readout can count the rejections
  let rec = [], lastFrac = NaN;
  demos.simulationDemo(box, null, {
    intro: 'Each simulated value is the F statistic of a one-way ANOVA on $g$ groups of $m$ observations, all drawn from the same normal distribution, so the null hypothesis of equal means is true. The histogram follows $F(g - 1, N - g)$ with $N = gm$. About 5% of the simulated statistics fall above the 5% critical value, which is the false-positive rate the test promises.',
    params: [
      { key: 'g', sym: 'g', name: 'number of groups', meaning: 'Number of groups compared; the numerator has $g - 1$ degrees of freedom.', min: 2, max: 8, default: 3, integer: true },
      { key: 'm', sym: 'm', name: 'observations per group', meaning: 'Number of observations in each group; the denominator has $N - g = g(m - 1)$ degrees of freedom.', min: 2, max: 20, default: 6, integer: true },
    ],
    sample: (rng, { g, m }) => {
      let grand = 0, ssw = 0;
      const means = new Array(g);
      for (let j = 0; j < g; j++) {
        let s = 0; const ys = new Array(m);
        for (let i = 0; i < m; i++) { ys[i] = rng.normal(50, 10); s += ys[i]; }
        const mj = s / m; means[j] = mj; grand += s;
        for (let i = 0; i < m; i++) ssw += (ys[i] - mj) ** 2;
      }
      grand /= g * m;
      let ssb = 0;
      for (let j = 0; j < g; j++) ssb += m * (means[j] - grand) ** 2;
      const F = (ssb / (g - 1)) / (ssw / (g * m - g));
      rec.push(F);
      return F;
    },
    sampleName: 'simulated ANOVA F statistics',
    target: {
      name: ({ g, m }) => `F(${g - 1}, ${g * m - g}) density`,
      pdf: (x, { g, m }) => fPdf(x, g - 1, g * m - g), cdf: (x, { g, m }) => fCdf(x, g - 1, g * m - g),
    },
    range: ({ g, m }) => fRange(g - 1, g * m - g),
    xLabel: 'F statistic',
    readout: ({ g, m }, s) => {
      const crit = fUpperQ(0.05, g - 1, g * m - g);
      if (rec.length >= s.n) { const last = rec.slice(-s.n); lastFrac = last.filter(v => v > crit).length / s.n; }
      rec = [];
      return `Degrees of freedom: $d_1 = g - 1$ = ${g - 1}, $d_2 = N - g$ = ${g * m - g}. The test rejects equal means at the 5% level when $F >$ <b>${f3(crit)}</b>; `
        + `in this simulation <b>${(100 * lastFrac).toFixed(1)}%</b> of the statistics are above it.`;
    },
  });
}
