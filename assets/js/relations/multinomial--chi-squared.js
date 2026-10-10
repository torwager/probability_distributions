// Multinomial -> chi-squared: Pearson's X^2 statistic of multinomial counts is approximately chi-squared
// with K - 1 degrees of freedom as n grows (and (r - 1)(c - 1) for a test of independence in an r x c table).
// Demo: two views built with ctx.demos.simulationDemo (goodness of fit; independence in a table). Each simulated
// value is a whole Pearson statistic computed from a simulated table of counts. The readout adds the share of
// simulated statistics above the chi-squared 95% point, i.e. the actual type I error rate of the 5% test.

import { getRelation } from '../catalog.js';
import { gammaP, gammaPinv, lgamma } from '../core/math.js';

const REL = getRelation('multinomial--chi-squared');

const chi2Pdf = (x, k) => (x <= 0 ? (k < 2 ? Infinity : k === 2 ? 0.5 : 0) : Math.exp((k / 2 - 1) * Math.log(x) - x / 2 - (k / 2) * Math.LN2 - lgamma(k / 2)));
const chi2Cdf = (x, k) => (x <= 0 ? 0 : gammaP(k / 2, x / 2));
const chi2Q95 = k => 2 * gammaPinv(k / 2, 0.95);
const fmt = (v, d = 3) => String(Number(Number(v).toPrecision(d))).replace(/^-/, '−');

/** Probabilities for the goodness-of-fit view: category 1 has p1, the others share the rest equally. */
const gofProbs = ({ K, p1 }) => [p1, ...new Array(K - 1).fill((1 - p1) / (K - 1))];
/** Row and column probabilities for the independence view: rows proportional to 1, 2, ..., columns to c, ..., 1. */
const margins = n => { const w = Array.from({ length: n }, (_, i) => i + 1); const s = w.reduce((a, b) => a + b, 0); return w.map(v => v / s); };

/** Keep the most recent simulated statistics so that the readout can count how many exceed the critical value. */
function recorder() {
  let buf = [];
  return {
    push(v) { buf.push(v); if (buf.length > 60000) buf = buf.slice(-30000); },
    last: n => buf.slice(-n),
  };
}

export default {
  id: 'multinomial--chi-squared',
  from: 'multinomial',
  to: 'chi-squared',
  title: 'Pearson’s chi-squared statistic of multinomial counts approaches a chi-squared distribution as the sample grows',

  plain: [
    'Pearson’s chi-squared test asks whether observed category counts agree with the counts expected under a hypothesis. For each category it takes the difference between the observed count $X_j$ and the expected count $E_j = np_j$, squares it, divides by $E_j$, and adds these terms over the $K$ categories. Large values of the sum $X^2$ mean the counts are far from what the hypothesis predicts.',
    'When the counts are multinomial and the hypothesis is true, the distribution of $X^2$ approaches a chi-squared distribution with $K - 1$ degrees of freedom as the number of trials $n$ grows. One degree of freedom is lost because the counts must add up to $n$: once $K - 1$ of the differences $X_j - E_j$ are known, the last one is fixed. For a test of independence in a table with $r$ rows and $c$ columns, where the expected counts are computed from the row and column totals, the limit is chi-squared with $(r - 1)(c - 1)$ degrees of freedom. The approximation is usually considered adequate when every expected count is at least about 5.',
  ],

  statementTex: REL.statement,
  glossary: [
    { sym: '\\mathbf X \\sim \\mathrm{Multinomial}(n, \\mathbf p)', meaning: 'The vector of counts $(X_1, \\dots, X_K)$ in $K$ categories after $n$ independent trials with category probabilities $\\mathbf p = (p_1, \\dots, p_K)$.' },
    { sym: 'p_j > 0', meaning: 'Every category has a positive probability under the hypothesis being tested.' },
    { sym: 'E_j = np_j', meaning: 'The expected count of category $j$ under the hypothesis.' },
    { sym: 'X^2', meaning: 'Pearson’s chi-squared statistic, $\\sum_j (\\text{observed} - \\text{expected})^2/\\text{expected}$. Here $X^2$ is the name of the statistic, not the square of a variable $X$.' },
    { sym: 'K', meaning: 'The number of categories.' },
    { sym: '\\xrightarrow{d}', meaning: 'Converges in distribution: as $n$ grows, probabilities computed from $X^2$ get arbitrarily close to those of the limit.' },
    { sym: '\\chi^2_{K-1}', meaning: 'The chi-squared distribution with $K - 1$ degrees of freedom: the distribution of a sum of $K - 1$ independent squared standard normal variables.' },
    { sym: 'n \\to \\infty', meaning: 'The number of trials grows without bound, with the probabilities held fixed.' },
    { sym: 'r \\times c', meaning: 'A contingency table with $r$ rows and $c$ columns, cross-classifying $n$ observations by two categorical variables.' },
    { sym: '\\chi^2_{(r-1)(c-1)}', meaning: 'The chi-squared distribution with $(r - 1)(c - 1)$ degrees of freedom, the limit for the test of independence.' },
  ],

  why: [
    'Each count is approximately normal for large $n$: $X_j$ is $\\mathrm{Bin}(n, p_j)$ with mean $np_j$ and variance $np_j(1 - p_j)$. So each standardized difference $Z_j = (X_j - np_j)/\\sqrt{np_j}$ is approximately normal with mean 0. If the $Z_j$ were independent standard normals, $X^2 = \\sum_j Z_j^2$ would be $\\chi^2_K$. Two things change this.',
    'First, the counts add up to $n$, so $\\sum_j \\sqrt{p_j}\\, Z_j = \\sum_j (X_j - np_j)/\\sqrt n = 0$ exactly. The vector $\\mathbf Z = (Z_1, \\dots, Z_K)$ always lies in the $(K - 1)$-dimensional subspace perpendicular to the unit vector $\\mathbf u = (\\sqrt{p_1}, \\dots, \\sqrt{p_K})$. Second, the multivariate central limit theorem gives the limit of $\\mathbf Z$ as a multivariate normal with covariance',
    { tex: '\\mathrm{Cov}(\\mathbf Z) = I - \\mathbf u\\mathbf u^{\\top},' },
    'which is the projection onto that subspace. So $\\mathbf Z$ behaves like a standard normal vector in $K - 1$ dimensions, and its squared length $X^2 = \\lVert \\mathbf Z \\rVert^2$ is approximately $\\chi^2_{K-1}$. Here $I$ is the $K \\times K$ identity matrix and $\\lVert \\cdot \\rVert$ the length of a vector.',
    'For a contingency table, the expected counts are estimated from the margins: $\\hat E_{ij} = R_i C_j / n$ with row totals $R_i$ and column totals $C_j$. Estimating the $(r - 1) + (c - 1)$ free margin probabilities uses up that many more degrees of freedom out of the $rc - 1$, leaving $rc - 1 - (r - 1) - (c - 1) = (r - 1)(c - 1)$. In general, each parameter estimated efficiently from the same counts removes one degree of freedom.',
    'The approximation is poor when some expected counts are small, because the counts are then far from normal and $X^2$ takes only a few distinct values. In the demonstration, make category 1 rare (small $p_1$) and watch the share of simulated statistics above the 95% point drift away from 5%. Exact multinomial tests, Fisher’s exact test or simulated p-values are used in that case.',
  ],

  references: [
    { text: 'Wikipedia: Pearson’s chi-squared test.', url: 'https://en.wikipedia.org/wiki/Pearson%27s_chi-squared_test' },
    { text: 'Pearson, K. (1900). On the criterion that a given system of deviations from the probable in the case of a correlated system of variables is such that it can be reasonably supposed to have arisen from random sampling. <i>Philosophical Magazine</i>, Series 5, 50(302), 157–175.', url: 'https://doi.org/10.1080/14786440009463897' },
    { text: 'Agresti, A. (2013). <i>Categorical Data Analysis</i> (3rd ed.), Sections 1.5 and 3.2. Wiley.' },
    { text: 'Casella, G., & Berger, R. L. (2002). <i>Statistical Inference</i> (2nd ed.), Section 10.3 (chi-squared tests). Duxbury.' },
    { text: 'Fisher, R. A. (1922). On the interpretation of χ² from contingency tables, and the calculation of P. <i>Journal of the Royal Statistical Society</i>, 85(1), 87–94.', url: 'https://doi.org/10.2307/2340521' },
  ],

  demo(container, ctx) {
    const { ui, demos } = ctx;
    const { h } = ui;
    const viewA = h('div'), viewB = h('div', { hidden: true });
    let builtB = false;
    const seg = ui.segmented([
      { value: 'gof', label: 'Goodness of fit (K categories)' },
      { value: 'ind', label: 'Independence (r × c table)' },
    ], 'gof', v => {
      viewA.hidden = v !== 'gof'; viewB.hidden = v !== 'ind';
      if (v === 'ind' && !builtB) { builtB = true; buildIndependence(viewB, demos, ui); }
    }, 'Which test to simulate');
    container.append(h('div', { style: 'margin-bottom:1rem' }, seg.el), viewA, viewB);
    buildGoodnessOfFit(viewA, demos, ui);
  },
};

function rejectionText(rec, s, df, ui) {
  const q = chi2Q95(df);
  const xs = rec.last(s.n);
  const share = xs.filter(v => v > q).length / xs.length;
  return `The 5% test rejects when $X^2$ is above the $\\chi^2_{${df}}$ 95% point ${fmt(q, 4)}; that happens for <b>${ui.fmt(share * 100, 3)}%</b> of the simulated tables (it should be close to 5% when the approximation is good; with ${s.n.toLocaleString('en-US')} draws, chance alone moves this by about ±${fmt(196 * Math.sqrt(0.05 * 0.95 / s.n), 2)} percentage points).`;
}

function buildGoodnessOfFit(container, demos, ui) {
  const rec = recorder();
  demos.simulationDemo(container, null, {
    intro: 'Each simulated value is Pearson’s statistic $X^2 = \\sum_j (X_j - np_j)^2/(np_j)$ for one simulated multinomial vector of counts, with the true probabilities as the hypothesis (so the hypothesis is true). Category 1 has probability $p_1$ and the other $K - 1$ categories share the rest equally. Increase $n$ and the histogram settles onto the $\\chi^2_{K-1}$ density; make $p_1$ small and the approximation needs a much larger $n$.',
    params: [
      { key: 'n', sym: 'n', name: 'number of trials', meaning: 'The total count $n$ of the multinomial.', min: 5, max: 2000, default: 20, integer: true, log: true },
      { key: 'K', sym: 'K', name: 'number of categories', meaning: 'The number of categories; the limit has $K - 1$ degrees of freedom.', min: 2, max: 8, default: 4, integer: true },
      { key: 'p1', sym: 'p_1', name: 'probability of category 1', meaning: 'The probability of the first category; the others are equal, $(1 - p_1)/(K - 1)$ each.', min: 0.01, max: 0.9, default: 0.25, step: 0.01 },
    ],
    sample: (rng, p) => {
      const probs = gofProbs(p);
      const x = rng.multinomial(p.n, probs);
      let s = 0;
      for (let j = 0; j < x.length; j++) { const e = p.n * probs[j]; s += (x[j] - e) ** 2 / e; }
      rec.push(s);
      return s;
    },
    sampleName: 'simulated Pearson statistics X²',
    target: { name: p => `chi-squared density with ${p.K - 1} df`, pdf: (x, p) => chi2Pdf(x, p.K - 1), cdf: (x, p) => chi2Cdf(x, p.K - 1) },
    range: p => [0, Math.max(6, (p.K - 1) + 5.5 * Math.sqrt(2 * (p.K - 1)) + 3)],
    xLabel: 'X² (Pearson statistic)',
    readout: (p, s) => {
      const probs = gofProbs(p);
      const emin = p.n * Math.min(...probs);
      return `Smallest expected count $np_j$ = <b>${fmt(emin)}</b> (${emin >= 5 ? 'at least 5, so the rule of thumb is met' : 'below 5, so the rule of thumb is not met'}). ` + rejectionText(rec, s, p.K - 1, ui);
    },
  });
}

function buildIndependence(container, demos, ui) {
  const rec = recorder();
  demos.simulationDemo(container, null, {
    intro: 'Each simulated value is the chi-squared statistic for independence, $X^2 = \\sum_{i,j} (O_{ij} - \\hat E_{ij})^2/\\hat E_{ij}$, computed from one simulated $r \\times c$ table of $n$ observations. The rows and columns are independent (cell probabilities are products of row probabilities proportional to $1, 2, \\dots, r$ and column probabilities proportional to $c, \\dots, 1$), and the expected counts $\\hat E_{ij} = R_i C_j / n$ come from the observed row totals $R_i$ and column totals $C_j$. The histogram is compared with $\\chi^2_{(r-1)(c-1)}$.',
    params: [
      { key: 'n', sym: 'n', name: 'number of observations', meaning: 'The total count in the table.', min: 10, max: 2000, default: 40, integer: true, log: true },
      { key: 'r', sym: 'r', name: 'number of rows', meaning: 'The number of categories of the first variable.', min: 2, max: 5, default: 2, integer: true },
      { key: 'c', sym: 'c', name: 'number of columns', meaning: 'The number of categories of the second variable.', min: 2, max: 5, default: 3, integer: true },
    ],
    sample: (rng, p) => {
      const a = margins(p.r), b = margins(p.c).reverse();
      const probs = [];
      for (let i = 0; i < p.r; i++) for (let j = 0; j < p.c; j++) probs.push(a[i] * b[j]);
      const x = rng.multinomial(p.n, probs);
      const R = new Array(p.r).fill(0), C = new Array(p.c).fill(0);
      for (let i = 0; i < p.r; i++) for (let j = 0; j < p.c; j++) { R[i] += x[i * p.c + j]; C[j] += x[i * p.c + j]; }
      let s = 0;
      for (let i = 0; i < p.r; i++) for (let j = 0; j < p.c; j++) {
        const e = R[i] * C[j] / p.n;
        if (e > 0) s += (x[i * p.c + j] - e) ** 2 / e;
      }
      rec.push(s);
      return s;
    },
    sampleName: 'simulated statistics X² for independence',
    target: { name: p => `chi-squared density with ${(p.r - 1) * (p.c - 1)} df`, pdf: (x, p) => chi2Pdf(x, (p.r - 1) * (p.c - 1)), cdf: (x, p) => chi2Cdf(x, (p.r - 1) * (p.c - 1)) },
    range: p => { const k = (p.r - 1) * (p.c - 1); return [0, Math.max(6, k + 5.5 * Math.sqrt(2 * k) + 3)]; },
    xLabel: 'X² (Pearson statistic for independence)',
    readout: (p, s) => {
      const a = margins(p.r), b = margins(p.c);
      const emin = p.n * a[0] * b[0];
      const df = (p.r - 1) * (p.c - 1);
      return `Degrees of freedom $(r-1)(c-1)$ = <b>${df}</b>, not $rc - 1$ = ${p.r * p.c - 1}, because the margins were estimated. Smallest expected cell count about <b>${fmt(emin)}</b>. ` + rejectionText(rec, s, df, ui);
    },
  });
}
