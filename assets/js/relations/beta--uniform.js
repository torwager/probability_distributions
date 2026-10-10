// Beta <-> Uniform: Beta(1, 1) = U(0, 1); conversely the k-th smallest of n iid U(0, 1) numbers is Beta(k, n - k + 1).
// Demo: two views (a segmented switch): the special case (ctx.demos.compareDemo, with a button that sets
// alpha = beta = 1) and the order statistics (ctx.demos.simulationDemo).

import { getRelation } from '../catalog.js';
import { betaI, lbeta } from '../core/math.js';

const REL = getRelation('beta--uniform');

function betaPdf(x, a, b) {
  if (x < 0 || x > 1) return 0;
  if (x === 0) return a < 1 ? Infinity : a === 1 ? b : 0;
  if (x === 1) return b < 1 ? Infinity : b === 1 ? a : 0;
  return Math.exp((a - 1) * Math.log(x) + (b - 1) * Math.log1p(-x) - lbeta(a, b));
}
const betaCdf = (x, a, b) => (x <= 0 ? 0 : x >= 1 ? 1 : betaI(x, a, b));
const unifPdf = x => (x >= 0 && x <= 1 ? 1 : 0);
const unifCdf = x => Math.min(1, Math.max(0, x));

export default {
  id: 'beta--uniform',
  from: 'beta',
  to: 'uniform',
  title: 'The Beta distribution with both shapes equal to 1 is the standard uniform, and sorted uniform numbers are Beta distributed',

  plain: [
    'The Beta distribution describes a quantity between 0 and 1, such as a probability or a proportion. Its density is proportional to $x^{\\alpha - 1}(1 - x)^{\\beta - 1}$. With $\\alpha = \\beta = 1$ both powers are $x^0 = 1$, so the density is flat: every value in $[0, 1]$ is equally likely. That is the standard uniform distribution $\\mathrm U(0, 1)$, and it is the usual “no preference” prior for an unknown probability.',
    'The connection also runs the other way. Draw $n$ independent uniform numbers between 0 and 1 and sort them. The $k$-th smallest, written $U_{(k)}$, has a $\\mathrm{Beta}(k,\\ n - k + 1)$ distribution. For example, the smallest of 5 uniform numbers is $\\mathrm{Beta}(1, 5)$, piled up near 0, and the middle one (the sample median) is $\\mathrm{Beta}(3, 3)$, centered at 1/2. With $n = 1$ and $k = 1$ this gives back $\\mathrm{Beta}(1, 1) = \\mathrm U(0, 1)$.',
  ],

  statementTex: REL.statement,
  glossary: [
    { sym: '\\mathrm{Beta}(\\alpha, \\beta)', meaning: 'The Beta distribution on $[0, 1]$ with shape parameters $\\alpha$ and $\\beta$, density $x^{\\alpha-1}(1-x)^{\\beta-1}/B(\\alpha, \\beta)$.' },
    { sym: '\\mathrm{Beta}(1,1)', meaning: 'The Beta distribution with both shapes equal to 1.' },
    { sym: '\\mathrm U(0,1)', meaning: 'The standard uniform distribution: every value between 0 and 1 is equally likely.' },
    { sym: 'U_1, \\dots, U_n', meaning: '$n$ uniform random numbers between 0 and 1.' },
    { sym: '\\overset{iid}{\\sim}', meaning: 'Independent and identically distributed: each has the same distribution and none affects the others.' },
    { sym: 'n', meaning: 'How many uniform numbers are drawn.' },
    { sym: 'k', meaning: 'The rank of interest, from 1 (the smallest) to $n$ (the largest).' },
    { sym: 'U_{(k)}', meaning: 'The $k$-th smallest of the $n$ numbers (the $k$-th order statistic).' },
    { sym: '\\mathrm{Beta}(k,\\ n-k+1)', meaning: 'The Beta distribution with shapes $k$ and $n - k + 1$; its mean is $k/(n+1)$.' },
  ],

  why: [
    '<b>The special case.</b> The Beta density is $f(x) = x^{\\alpha - 1}(1 - x)^{\\beta - 1}/B(\\alpha, \\beta)$, where the Beta function $B(\\alpha, \\beta) = \\Gamma(\\alpha)\\Gamma(\\beta)/\\Gamma(\\alpha + \\beta)$ makes the area 1. With $\\alpha = \\beta = 1$, $B(1, 1) = \\Gamma(1)^2/\\Gamma(2) = 1$, so $f(x) = 1$ on $[0, 1]$, the uniform density.',
    '<b>Order statistics.</b> For $U_{(k)}$ to lie in a tiny interval $[x, x + dx]$, one of the $n$ numbers must fall in that interval, $k - 1$ of the others must fall below $x$, and the remaining $n - k$ above it. Counting the ways to choose which numbers do what gives',
    { tex: 'f_{U_{(k)}}(x) = \\frac{n!}{(k-1)!\\,(n-k)!}\\, x^{k-1} (1-x)^{n-k}, \\qquad 0 \\le x \\le 1,' },
    'which is the $\\mathrm{Beta}(k,\\ n - k + 1)$ density, because $B(k, n-k+1) = (k-1)!\\,(n-k)!/n!$. Its mean $k/(n+1)$ says that $n$ sorted uniform numbers split $[0, 1]$ into $n + 1$ gaps of equal expected length.',
    '<b>A link to the binomial.</b> $U_{(k)} \\le x$ exactly when at least $k$ of the $n$ numbers are at most $x$, and that count is $\\mathrm{Bin}(n, x)$. So the Beta CDF equals a binomial tail probability: $P(U_{(k)} \\le x) = P(\\mathrm{Bin}(n, x) \\ge k)$. This identity is behind exact (Clopper–Pearson) confidence intervals for a proportion.',
    '<b>Why it matters.</b> Because $F(X)$ is uniform for any continuous variable $X$ with CDF $F$, the same Beta distributions describe $F(X_{(k)})$ for samples from any continuous distribution. This gives distribution-free confidence intervals for quantiles and the expected positions $k/(n+1)$ used in probability and Q–Q plots.',
  ],

  references: [
    { text: 'Wikipedia: Beta distribution, special and limiting cases.', url: 'https://en.wikipedia.org/wiki/Beta_distribution#Special_and_limiting_cases' },
    { text: 'Wikipedia: Order statistic, the order statistics of the uniform distribution.', url: 'https://en.wikipedia.org/wiki/Order_statistic#Order_statistics_sampled_from_a_uniform_distribution' },
    { text: 'Casella, G., & Berger, R. L. (2002). <i>Statistical Inference</i> (2nd ed.), Section 5.4 and Example 5.4.5. Duxbury.' },
    { text: 'David, H. A., & Nagaraja, H. N. (2003). <i>Order Statistics</i> (3rd ed.), Chapter 2. Wiley.' },
    { text: 'Leemis, L. M., & McQueston, J. T. (2008). Univariate distribution relationships. <i>The American Statistician</i>, 62(1), 45–53.', url: 'https://doi.org/10.1198/000313008X270448' },
  ],

  demo(container, ctx) {
    const { ui } = ctx;
    const { h } = ui;
    const caseBox = h('div'), orderBox = h('div', { hidden: true });
    const built = { case: false, order: false };
    const show = v => {
      caseBox.hidden = v !== 'case'; orderBox.hidden = v !== 'order';
      if (!built[v]) { built[v] = true; (v === 'case' ? caseDemo : orderDemo)(v === 'case' ? caseBox : orderBox, ctx); }
    };
    const seg = ui.segmented([
      { value: 'case', label: 'Special case: α = β = 1' },
      { value: 'order', label: 'Sorted uniforms: U₍ₖ₎' },
    ], 'case', show, 'Which direction of the relationship to show');
    container.append(h('div', { style: 'margin-bottom:.6rem' }, seg.el), caseBox, orderBox);
    show('case');
  },
};

function caseDemo(box, { demos, ui }) {
  const { h } = ui;
  const cmp = demos.compareDemo(box, null, {
    intro: 'The solid curve is the $\\mathrm{Beta}(\\alpha, \\beta)$ density and the dashed line is the uniform density on $[0, 1]$. Drag the amber line to move the Beta mean (with $\\alpha + \\beta$ fixed), or change $\\alpha$ and $\\beta$ with the boxes and sliders; when both equal 1 the two coincide and the CDF gap is 0.',
    params: [
      { key: 'alpha', sym: '\\alpha', name: 'first shape', meaning: 'The first Beta shape; larger values push probability toward 1.', min: 0.5, max: 8, default: 2.5, step: 0.05 },
      { key: 'beta', sym: '\\beta', name: 'second shape', meaning: 'The second Beta shape; larger values push probability toward 0.', min: 0.5, max: 8, default: 1.5, step: 0.05 },
    ],
    exact: {
      name: ({ alpha, beta }) => `Beta(α = ${ui.fmt(alpha, 3)}, β = ${ui.fmt(beta, 3)})`,
      pdf: (x, { alpha, beta }) => betaPdf(x, alpha, beta),
      cdf: (x, { alpha, beta }) => betaCdf(x, alpha, beta),
    },
    approx: { name: () => 'Uniform(0, 1)', pdf: unifPdf, cdf: unifCdf },
    range: () => [-0.08, 1.08],
    xLabel: 'x',
    // a dashed line at the Beta mean: dragging it moves the mean with alpha + beta held fixed
    handles: ({ alpha, beta }, set) => [{
      id: 'mean', type: 'vline', x: alpha / (alpha + beta), label: 'mean',
      ariaLabel: 'Beta mean α/(α + β). Drag left or right to move it with α + β fixed, or use the arrow keys.',
      valueText: ui.fmt(alpha / (alpha + beta), 3), valueNow: alpha / (alpha + beta), valueMin: 0, valueMax: 1,
      onDrag: pt => {
        if (!pt) return;
        const s = alpha + beta, m = Math.min(1 - 0.5 / s, Math.max(0.5 / s, pt.x));
        set({ alpha: Number((m * s).toFixed(2)), beta: Number(((1 - m) * s).toFixed(2)) });
      },
      onKey: steps => {
        const s = alpha + beta, m = Math.min(1 - 0.5 / s, Math.max(0.5 / s, alpha / s + 0.01 * steps));
        set({ alpha: Number((m * s).toFixed(2)), beta: Number(((1 - m) * s).toFixed(2)) });
      },
    }],
    readout: ({ alpha, beta }) => (alpha === 1 && beta === 1
      ? 'With $\\alpha = \\beta = 1$ the Beta density is exactly flat: this is the uniform distribution.'
      : `The Beta mean is $\\alpha/(\\alpha + \\beta)$ = <b>${ui.fmt(alpha / (alpha + beta), 3)}</b>; the uniform mean is 0.5.`),
  });
  const btn = h('button', { type: 'button', class: 'btn small-btn' }, 'Set α = β = 1');
  btn.addEventListener('click', () => cmp.set({ alpha: 1, beta: 1 }));
  box.querySelector('.demo-controls').append(h('div', { class: 'demo-sim-ctl' }, h('h3', { class: 'mini-title' }, 'Special case'), btn));
}

function orderDemo(box, { demos, ui }) {
  demos.simulationDemo(box, null, {
    intro: 'Each simulated value is the $k$-th smallest of $n$ fresh uniform numbers. The histogram is compared with the $\\mathrm{Beta}(k,\\ n - k + 1)$ density. Try $k = 1$ (the minimum), $k = n$ (the maximum) and the middle rank (the median).',
    params: [
      { key: 'n', sym: 'n', name: 'number of uniforms', meaning: 'How many uniform numbers are drawn and sorted.', min: 1, max: 30, default: 5, integer: true },
      { key: 'k', sym: 'k', name: 'rank', meaning: 'Which of the sorted numbers is recorded: 1 is the smallest and $n$ the largest. It must be at most $n$.', min: 1, max: 30, default: 2, integer: true },
    ],
    check: ({ n, k }) => (k > n ? 'The rank k must be at most n.' : null),
    sample: (rng, { n, k }) => {
      const kk = Math.min(k, n), u = new Float64Array(n);
      for (let i = 0; i < n; i++) u[i] = rng.random();
      u.sort();
      return u[kk - 1];
    },
    sampleName: 'k-th smallest of n uniforms',
    target: {
      name: ({ n, k }) => `Beta(${Math.min(k, n)}, ${n - Math.min(k, n) + 1}) density`,
      pdf: (x, { n, k }) => betaPdf(x, Math.min(k, n), n - Math.min(k, n) + 1),
      cdf: (x, { n, k }) => betaCdf(x, Math.min(k, n), n - Math.min(k, n) + 1),
    },
    range: () => [0, 1],
    xLabel: 'value of the k-th smallest',
    readout: ({ n, k }) => `The Beta mean $k/(n+1)$ = <b>${ui.fmt(Math.min(k, n) / (n + 1), 4)}</b>.`,
  });
}
