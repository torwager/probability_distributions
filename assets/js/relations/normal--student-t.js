// Normal <-> Student t (two-way edge).
// Forward: Z / sqrt(V/nu) ~ t_nu, so the one-sample t statistic of normal data is t_{n-1}.
// Backward: t_nu -> N(0, 1) as nu -> infinity.
// The demo is self-contained: the t density and CDF are computed here with core/math.js.

import { getRelation } from '../catalog.js';
import { lgamma, betaI, betaIc, betaIinv, normalPdf, normalCdf, solveMonotone, PI } from '../core/math.js';

const REL = getRelation('normal--student-t');

const tPdf = (x, nu) => Math.exp(lgamma((nu + 1) / 2) - lgamma(nu / 2) - 0.5 * Math.log(nu * PI) - (nu + 1) / 2 * Math.log1p(x * x / nu));
/** P(T > |x|) */
function tUpper(x, nu) {
  const x2 = x * x;
  if (!Number.isFinite(x2)) return 0;
  return x2 < nu ? 0.5 * betaIc(x2 / (nu + x2), 0.5, nu / 2) : 0.5 * betaI(nu / (nu + x2), nu / 2, 0.5);
}
const tCdf = (x, nu) => (x === 0 ? 0.5 : x < 0 ? tUpper(x, nu) : 1 - tUpper(x, nu));
/** upper quantile: the x > 0 with P(T > x) = q (q < 1/2) */
function tUpperQ(q, nu) {
  if (q < 0.25) { const z = betaIinv(2 * q, nu / 2, 0.5); return Math.sqrt(nu * (1 - z) / z); }
  const w = betaIinv(1 - 2 * q, 0.5, nu / 2); return Math.sqrt(nu * w / (1 - w));
}
const halfWidth = nu => Math.min(8, Math.max(4.5, tUpperQ(0.01, nu)));
const f3 = v => String(Number(v.toPrecision(4)));

export default {
  id: 'normal--student-t',
  from: 'normal',
  to: 'student-t',
  title: 'Standardizing a normal mean with an estimated standard deviation gives a t distribution, which approaches the normal as the degrees of freedom grow',

  summary: 'A standard normal variable divided by $\\sqrt{V/\\nu}$, with $V$ an independent chi-squared variable with $\\nu$ degrees of freedom, has a t distribution; this is the t-test statistic. As $\\nu$ grows, the t approaches the normal.',

  plain: [
    'If the mean of a normal sample is standardized with the true standard deviation $\\sigma$, the result is exactly standard normal. In practice $\\sigma$ is unknown and is replaced by the sample standard deviation $S$, which is itself random. Dividing by a random quantity spreads the statistic out, and the result has Student’s $t$ distribution with $n - 1$ degrees of freedom. In general, a standard normal variable divided by the square root of an independent chi-squared variable over its degrees of freedom $\\nu$ has a $t_\\nu$ distribution.',
    'In the other direction, as $\\nu$ grows the estimate of the standard deviation becomes almost exact, the extra spread disappears, and $t_\\nu$ approaches the standard normal. This is why $t$ and normal critical values are close once $\\nu$ is above about 30, and why large-sample tests can use the normal distribution.',
  ],

  statementTex: REL.statement,
  glossary: [
    { sym: 'Z \\sim \\mathcal N(0,1)', meaning: '$Z$ is a standard normal variable (mean 0, standard deviation 1).' },
    { sym: 'V \\sim \\chi^2_\\nu', meaning: '$V$ is a chi-squared variable with $\\nu$ degrees of freedom: a sum of $\\nu$ squared independent standard normal variables, so $V/\\nu$ has mean 1.' },
    { sym: '\\text{independent}', meaning: '$Z$ and $V$ carry no information about each other. For a normal sample, the sample mean and the sample variance are independent, which is what the second statement needs.' },
    { sym: 'T = \\frac{Z}{\\sqrt{V/\\nu}}', meaning: 'The ratio: a standard normal variable divided by an estimate of its own standard deviation.' },
    { sym: 't_\\nu', meaning: 'Student’s $t$ distribution with $\\nu$ degrees of freedom.' },
    { sym: '\\nu', meaning: 'The degrees of freedom of the chi-squared variable in the denominator, which become the degrees of freedom of $T$.' },
    { sym: 'X_1, \\dots, X_n \\overset{iid}{\\sim} \\mathcal N(\\mu, \\sigma^2)', meaning: 'A sample of $n$ independent values from the same normal distribution, with mean $\\mu$ and variance $\\sigma^2$ ($\\sigma$ is the standard deviation).' },
    { sym: '\\overset{iid}{\\sim}', meaning: 'Independent and identically distributed.' },
    { sym: '\\bar X,\\ S', meaning: 'The sample mean and the sample standard deviation $S = \\sqrt{\\sum_i (X_i - \\bar X)^2/(n-1)}$.' },
    { sym: '\\frac{\\bar X - \\mu}{S/\\sqrt n}', meaning: 'The one-sample t statistic: the distance of the sample mean from $\\mu$ in estimated standard errors.' },
    { sym: 't_{n-1}', meaning: 'The $t$ distribution with $n - 1$ degrees of freedom; one degree of freedom is used up by estimating the mean.' },
    { sym: '\\xrightarrow{d}', meaning: 'Converges in distribution: probabilities computed from $t_\\nu$ approach those of $\\mathcal N(0,1)$.' },
    { sym: '\\nu \\to \\infty', meaning: 'The degrees of freedom grow without bound (a larger and larger sample).' },
    { sym: '\\text{in probability}', meaning: '$V/\\nu \\to 1$ in probability means that the chance that $V/\\nu$ differs from 1 by more than any fixed amount goes to 0.' },
  ],

  why: [
    '<b>The ratio.</b> Given $V = v$, the ratio $T = Z/\\sqrt{v/\\nu}$ is normal with mean 0 and variance $\\nu/v$. Averaging this normal density over the chi-squared density of $V$ gives',
    { tex: 'f_T(t) = \\int_0^\\infty \\sqrt{\\tfrac{v}{\\nu}}\\, \\varphi\\!\\left(t\\sqrt{\\tfrac{v}{\\nu}}\\right) f_{\\chi^2_\\nu}(v)\\, dv = \\frac{\\Gamma(\\frac{\\nu+1}{2})}{\\sqrt{\\nu\\pi}\\,\\Gamma(\\frac\\nu2)}\\left(1 + \\frac{t^2}{\\nu}\\right)^{-\\frac{\\nu+1}{2}},' },
    'where $\\varphi$ is the standard normal density; the integral is a gamma-function integral. So $T$ is a normal variable whose scale is random, and mixing normals of different widths produces the heavy tails.',
    '<b>The t statistic.</b> For a normal sample, $Z = (\\bar X - \\mu)/(\\sigma/\\sqrt n)$ is standard normal and $V = (n-1)S^2/\\sigma^2$ is $\\chi^2_{n-1}$. For normal data (and only for normal data) $\\bar X$ and $S^2$ are independent. The unknown $\\sigma$ cancels in the ratio:',
    { tex: '\\frac{Z}{\\sqrt{V/(n-1)}} = \\frac{(\\bar X - \\mu)/(\\sigma/\\sqrt n)}{S/\\sigma} = \\frac{\\bar X - \\mu}{S/\\sqrt n} \\sim t_{n-1}.' },
    '<b>The limit.</b> $V/\\nu$ is the average of $\\nu$ independent squared standard normals, each with mean 1, so by the law of large numbers $V/\\nu \\to 1$ (its variance is $2/\\nu$). The denominator of $T$ therefore tends to 1 and $T$ behaves like $Z$ (Slutsky’s theorem). The density shows the same thing: $(1 + t^2/\\nu)^{-(\\nu+1)/2} \\to e^{-t^2/2}$ and the constant tends to $1/\\sqrt{2\\pi}$.',
    '<b>In practice.</b> The two-sided 5% critical value of $t_\\nu$ is 12.71 for $\\nu = 1$, 2.571 for $\\nu = 5$, 2.228 for $\\nu = 10$, 2.042 for $\\nu = 30$ and 1.984 for $\\nu = 100$, against 1.960 for the normal. Using normal critical values with a small sample makes confidence intervals too narrow and tests reject too often.',
  ],

  references: [
    { text: 'Wikipedia: Student’s t-distribution (characterization and how the t distribution arises).', url: 'https://en.wikipedia.org/wiki/Student%27s_t-distribution' },
    { text: 'Student (1908). The probable error of a mean. <i>Biometrika</i>, 6(1), 1–25.', url: 'https://doi.org/10.1093/biomet/6.1.1' },
    { text: 'Casella, G., & Berger, R. L. (2002). <i>Statistical Inference</i> (2nd ed.), Theorem 5.3.1 and Definition 5.3.4. Duxbury.' },
    { text: 'Wasserman, L. (2004). <i>All of Statistics: A Concise Course in Statistical Inference</i>. Springer.' },
    { text: 'Leemis, L. M., & McQueston, J. T. (2008). Univariate distribution relationships. <i>The American Statistician</i>, 62(1), 45–53.', url: 'https://doi.org/10.1198/000313008X270448' },
  ],

  demo(container, ctx) {
    const { ui } = ctx;
    const { h } = ui;
    const boxes = { ratio: h('div'), limit: h('div', { hidden: true }) };
    const built = {};
    const show = v => {
      for (const k in boxes) boxes[k].hidden = k !== v;
      if (!built[v]) { built[v] = true; (v === 'ratio' ? ratioDemo : limitDemo)(boxes[v], ctx); }
    };
    const seg = ui.segmented([
      { value: 'ratio', label: 'Normal samples → t statistic' },
      { value: 'limit', label: 't → normal as ν → ∞' },
    ], 'ratio', show, 'Which direction of the relationship to show');
    container.append(h('div', { style: 'margin-bottom:.6rem' }, seg.el), boxes.ratio, boxes.limit);
    show('ratio');
  },
};

/** Simulate t statistics of normal samples and compare with t_{n-1} (and the standard normal). */
function ratioDemo(box, { demos, ui }) {
  demos.simulationDemo(box, null, {
    intro: 'Each simulated value is the t statistic $(\\bar x - \\mu)/(s/\\sqrt n)$ of a fresh sample of $n$ values from a normal distribution with mean $\\mu = 10$ and standard deviation $\\sigma$. The histogram is compared with the $t_{n-1}$ density (solid) and, for contrast, the standard normal (dashed). With small $n$ the histogram has visibly heavier tails than the normal. Changing $\\sigma$ makes no difference, because $\\sigma$ cancels.',
    params: [
      { key: 'n', sym: 'n', name: 'sample size', meaning: 'Number of normal values in each sample; the t statistic has $n - 1$ degrees of freedom.', min: 2, max: 40, default: 4, integer: true },
      { key: 'sigma', sym: '\\sigma', name: 'population standard deviation', meaning: 'The true standard deviation of the normal population. It cancels in the t statistic.', min: 0.2, max: 5, default: 1 },
    ],
    sample: (rng, { n, sigma }) => {
      let s = 0, ss = 0;
      const xs = new Array(n);
      for (let i = 0; i < n; i++) { xs[i] = rng.normal(10, sigma); s += xs[i]; }
      const m = s / n;
      for (let i = 0; i < n; i++) ss += (xs[i] - m) ** 2;
      return (m - 10) / Math.sqrt(ss / (n - 1) / n);
    },
    sampleName: 't statistics of simulated samples',
    target: {
      name: ({ n }) => `t density with ν = ${n - 1}`,
      pdf: (x, { n }) => tPdf(x, n - 1),
      cdf: (x, { n }) => tCdf(x, n - 1),
    },
    range: ({ n }) => { const w = halfWidth(n - 1); return [-w, w]; },
    xLabel: 't statistic',
    readout: ({ n }) => {
      const nu = n - 1, crit = tUpperQ(0.025, nu);
      return `Under $t_{${nu}}$, $P(|T| > 1.96)$ = <b>${f3(2 * tUpper(1.959964, nu))}</b> instead of the normal’s 0.05, and the two-sided 5% critical value is <b>${f3(crit)}</b> instead of 1.960.`;
    },
    // add the standard normal for comparison to both plots
    onUpdate: (p, st, { left, right }) => {
      const L = left.scene, R = right.scene;
      if (!L || !R) return;
      const [a, b] = L.x;
      const ptsP = [], ptsC = [];
      for (let i = 0; i <= 300; i++) { const x = a + (b - a) * i / 300; ptsP.push([x, normalPdf(x)]); ptsC.push([x, normalCdf(x)]); }
      left.render({ ...L, y: [0, Math.max(L.y[1], 0.4 * 1.12)], layers: [...L.layers.filter(l => l.id !== 'z'), { id: 'z', type: 'line', points: ptsP, cls: 'curve-ref' }],
        legend: [...L.legend.filter(l => l.cls !== 'curve-ref'), { label: 'standard normal', cls: 'curve-ref' }] });
      right.render({ ...R, layers: [...R.layers.filter(l => l.id !== 'z'), { id: 'z', type: 'line', points: ptsC, cls: 'curve-ref' }],
        legend: [...(R.legend || []).filter(l => l.cls !== 'curve-ref'), { label: 'standard normal', cls: 'curve-ref' }] });
    },
  });
}

/** t_nu against N(0, 1) as nu grows, with a handle on the peak. */
function limitDemo(box, { demos, ui }) {
  let dragging = false;
  demos.compareDemo(box, null, {
    intro: 'The solid curve is the $t_\\nu$ density and the dashed curve the standard normal. Increase $\\nu$ with the box, or drag the amber arrow at the peak upward: the peak of $t_\\nu$ rises toward the normal peak, its tails thin out, and the largest gap between the two CDFs shrinks.',
    params: [
      { key: 'nu', sym: '\\nu', name: 'degrees of freedom', meaning: 'The degrees of freedom of the $t$ distribution.', min: 0.5, max: 200, default: 2, log: true },
    ],
    exact: { name: ({ nu }) => `Student's t, ν = ${ui.fmt(nu, 3)}`, pdf: (x, { nu }) => tPdf(x, nu), cdf: (x, { nu }) => tCdf(x, nu) },
    approx: { name: () => 'Standard normal N(0, 1)', pdf: x => normalPdf(x), cdf: x => normalCdf(x) },
    range: () => [-5, 5],
    xLabel: 'x',
    handles: ({ nu }, set) => [{
      id: 'nu', type: 'vArrow', from: { x: 0, y: 0 }, to: { x: 0, y: tPdf(0, nu) }, label: 'ν',
      ariaLabel: 'Degrees of freedom ν, set by the height of the peak. Drag up or down, or use the arrow keys.',
      valueText: ui.fmt(nu, 3), valueNow: nu, valueMin: 0.5, valueMax: 200,
      onDrag: (pt, phase) => {
        if (phase === 'start') dragging = true;
        if (pt && dragging) {
          const v = solveMonotone(n => tPdf(0, n), pt.y, 0.5, 200, { log: true });
          if (Number.isFinite(v)) set({ nu: Number(v.toPrecision(3)) });
        }
        if (phase === 'end') dragging = false;
      },
      onKey: steps => set({ nu: Number(Math.min(200, Math.max(0.5, nu * Math.pow(1.1, steps))).toPrecision(3)) }),
    }],
    readout: ({ nu }) => `Two-sided 5% critical value: $t_\\nu$ <b>${f3(tUpperQ(0.025, nu))}</b>, normal 1.960. Tail area beyond ±3: $t_\\nu$ <b>${f3(2 * tUpper(3, nu))}</b>, normal 0.0027.`,
  });
}
