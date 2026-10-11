// Gamma -> Dirichlet: independent Gamma(alpha_j, c) variables divided by their total are Dir(alpha_1, ..., alpha_K).
// Demo: ctx.demos.simulationDemo for one coordinate of the normalized vector against its Beta marginal, plus a
// triangle (added above the histogram through onUpdate) with the first 400 normalized vectors drawn over the
// Dir(alpha) density, and a readout of the correlation between the total and the proportions (zero, by Lukacs).

import { getRelation } from '../catalog.js';
import { betaI, lbeta, lgamma } from '../core/math.js';

const REL = getRelation('gamma--dirichlet');
const SQ3 = Math.sqrt(3) / 2;
const NX = 110, NY = Math.round(NX * SQ3);
const f3 = v => String(Number(Number(v).toPrecision(3))).replace(/^-/, '−');
const betaPdf = (x, a, b) => (x <= 0 || x >= 1 ? 0 : Math.exp((a - 1) * Math.log(x) + (b - 1) * Math.log1p(-x) - lbeta(a, b)));
const toXY = v => [v[1] + v[2] / 2, SQ3 * v[2]];

const STYLE = `
.plot.pd-simplex .gridline, .plot.pd-simplex .axis-line, .plot.pd-simplex .tick, .plot.pd-simplex .tick-label { display: none; }
.pd-gd .layer.gd-tri .poly { fill: none; stroke: var(--ink-2); stroke-width: 1.3; }
.pd-gd .layer.gd-corner .label { font-family: var(--serif); font-style: italic; font-size: 12.5px; fill: var(--ink-2); }
.pd-gd .layer.gd-draw .dot { fill: var(--ink); fill-opacity: .55; }
.pd-gd .gd-row { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: clamp(12px, 2vw, 24px); align-items: center; margin-bottom: 1rem; }
.pd-gd .gd-side { font-size: .92rem; color: var(--ink-2); }
@media (max-width: 760px) { .pd-gd .gd-row { grid-template-columns: 1fr; } }
`;

function heatValues(a) {
  const lg0 = lgamma(a[0] + a[1] + a[2]) - lgamma(a[0]) - lgamma(a[1]) - lgamma(a[2]);
  const values = new Float64Array(NX * NY);
  const fin = [];
  for (let j = 0; j < NY; j++) {
    const x3 = (j + 0.5) / NY;
    for (let i = 0; i < NX; i++) {
      const x2 = (i + 0.5) / NX - x3 / 2, x1 = 1 - x2 - x3;
      if (x1 <= 0 || x2 <= 0) { values[j * NX + i] = NaN; continue; }
      const v = Math.exp(lg0 + (a[0] - 1) * Math.log(x1) + (a[1] - 1) * Math.log(x2) + (a[2] - 1) * Math.log(x3));
      values[j * NX + i] = v; fin.push(v);
    }
  }
  fin.sort((u, v) => u - v);
  return { values, max: a.some(v => v < 1) ? fin[Math.floor(fin.length * 0.97)] : fin[fin.length - 1] };
}

export default {
  id: 'gamma--dirichlet',
  from: 'gamma',
  to: 'dirichlet',
  title: 'Independent gamma variables divided by their total have a Dirichlet distribution',

  summary: 'Draw $K$ independent gamma variables with shapes $\\alpha_1, \\dots, \\alpha_K$ and the same rate, and divide each by their total. The resulting proportions have a $\\mathrm{Dir}(\\alpha_1, \\dots, \\alpha_K)$ distribution, which is the standard way to simulate Dirichlet draws.',

  plain: [
    'Draw $K$ independent gamma variables $Y_1, \\dots, Y_K$ with shapes $\\alpha_1, \\dots, \\alpha_K$ and the same rate $c$, and divide each by their total. The resulting proportions $(Y_1/S, \\dots, Y_K/S)$, with $S = Y_1 + \\dots + Y_K$, are positive and add up to 1, and they follow the Dirichlet distribution $\\mathrm{Dir}(\\alpha_1, \\dots, \\alpha_K)$. The common rate does not matter, because it cancels in the ratios.',
    'One way to picture it: $K$ independent processes produce amounts $Y_j$ (for example waiting times, or quantities of $K$ substances), and we look only at the share each one contributes to the total. This construction is how Dirichlet random vectors are simulated in practice. With $K = 2$ it is the familiar fact that $Y_1/(Y_1 + Y_2)$ is beta distributed. In addition, the total $S$ is $\\mathrm{Gamma}(\\alpha_0, c)$ and is independent of the proportions.',
  ],

  statementTex: REL.statement,
  glossary: [
    { sym: 'Y_j \\sim \\mathrm{Gamma}(\\alpha_j, c)', meaning: 'The $j$-th gamma variable, with shape $\\alpha_j$ and rate $c$ (mean $\\alpha_j / c$).' },
    { sym: '\\alpha_j', meaning: 'The shape of the $j$-th gamma variable; it becomes the $j$-th Dirichlet concentration.' },
    { sym: 'c', meaning: 'The common rate of all the gamma variables, any positive number. It must be the same for all $j$.' },
    { sym: 'j = 1, \\dots, K', meaning: 'The index of the variable; $K$ is the number of variables (categories).' },
    { sym: '\\sum_i Y_i', meaning: 'The total of all $K$ gamma variables.' },
    { sym: '\\frac{Y_j}{\\sum_i Y_i}', meaning: 'The share of the total contributed by variable $j$.' },
    { sym: '\\mathrm{Dir}(\\alpha_1, \\dots, \\alpha_K)', meaning: 'The Dirichlet distribution with concentrations $\\alpha_1, \\dots, \\alpha_K$.' },
    { sym: '\\Rightarrow', meaning: 'Implies.' },
  ],

  why: [
    'Start from the joint density of the independent gammas,',
    { tex: 'f(y_1, \\dots, y_K) = \\prod_{j=1}^{K} \\frac{c^{\\alpha_j}}{\\Gamma(\\alpha_j)} y_j^{\\alpha_j - 1} e^{-c y_j},' },
    'and change variables to the total $s = \\sum_j y_j$ and the proportions $x_j = y_j / s$ (of which $K - 1$ are free, since they add up to 1). Then $y_j = s x_j$ and the Jacobian of the change of variables is $s^{K-1}$. Substituting,',
    { tex: 'f(s, x_1, \\dots, x_{K-1}) = \\underbrace{\\frac{c^{\\alpha_0}}{\\Gamma(\\alpha_0)} s^{\\alpha_0 - 1} e^{-c s}}_{\\mathrm{Gamma}(\\alpha_0,\\, c) \\text{ density of } s} \\times \\underbrace{\\frac{\\Gamma(\\alpha_0)}{\\prod_j \\Gamma(\\alpha_j)} \\prod_{j=1}^{K} x_j^{\\alpha_j - 1}}_{\\mathrm{Dir}(\\boldsymbol\\alpha) \\text{ density of } \\mathbf x},' },
    'where $\\alpha_0 = \\sum_j \\alpha_j$ and $\\Gamma$ is the gamma function. The joint density factors into a function of $s$ times a function of the proportions, so the total and the proportions are independent, the total is $\\mathrm{Gamma}(\\alpha_0, c)$, and the proportions are $\\mathrm{Dir}(\\boldsymbol\\alpha)$. The rate $c$ appears only in the density of the total.',
    'Lukacs (1955) proved a converse: if the total of independent positive variables is independent of their proportions, the variables must be gamma with a common rate. The demonstration checks the independence by the correlation between the total and the first proportion, which should be close to 0.',
  ],

  references: [
    { text: 'Wikipedia: Dirichlet distribution, gamma distribution (random variate generation).', url: 'https://en.wikipedia.org/wiki/Dirichlet_distribution#Random_variate_generation' },
    { text: 'Devroye, L. (1986). <i>Non-Uniform Random Variate Generation</i>, Chapter XI. Springer.', url: 'http://luc.devroye.org/rnbookindex.html' },
    { text: 'Kotz, S., Balakrishnan, N., & Johnson, N. L. (2000). <i>Continuous Multivariate Distributions</i>, Vol. 1 (2nd ed.), Chapter 49. Wiley.' },
    { text: 'Lukacs, E. (1955). A characterization of the gamma distribution. <i>The Annals of Mathematical Statistics</i>, 26(2), 319–324.', url: 'https://doi.org/10.1214/aoms/1177728549' },
  ],

  demo(container, ctx) {
    const { ui, plot, demos } = ctx;
    const { h } = ui;
    if (!document.getElementById('pd-style-gd')) document.head.append(h('style', { id: 'pd-style-gd' }, STYLE));
    container.classList.add('pd-gd');
    let buf = [];
    let tri = null, side = null, heat = { key: '', H: null };
    const out = demos.simulationDemo(container, null, {
      intro: 'Each simulated draw is a vector of three independent gamma variables $Y_j \\sim \\mathrm{Gamma}(\\alpha_j, c)$, divided by their total. The triangle shows the first 400 normalized vectors over the $\\mathrm{Dir}(\\alpha_1, \\alpha_2, \\alpha_3)$ density. Below, the histogram of coordinate $j$ of all the simulated vectors is compared with its Dirichlet marginal, $\\mathrm{Beta}(\\alpha_j, \\alpha_0 - \\alpha_j)$. Changing the rate $c$ changes the gamma variables but not the proportions.',
      params: [
        { key: 'alpha1', sym: '\\alpha_1', name: 'shape 1', meaning: 'Shape of $Y_1$ (and Dirichlet concentration 1).', min: 0.2, max: 20, default: 2, log: true },
        { key: 'alpha2', sym: '\\alpha_2', name: 'shape 2', meaning: 'Shape of $Y_2$.', min: 0.2, max: 20, default: 3, log: true },
        { key: 'alpha3', sym: '\\alpha_3', name: 'shape 3', meaning: 'Shape of $Y_3$.', min: 0.2, max: 20, default: 4, log: true },
        { key: 'c', sym: 'c', name: 'common rate', meaning: 'The rate shared by all three gamma variables.', min: 0.1, max: 10, default: 1, log: true },
        { key: 'j', sym: 'j', name: 'coordinate shown', meaning: 'Which proportion $Y_j / \\sum_i Y_i$ is shown in the histogram.', min: 1, max: 3, default: 1, integer: true },
      ],
      sample: (rng, p) => {
        const y = [rng.gamma(p.alpha1, p.c), rng.gamma(p.alpha2, p.c), rng.gamma(p.alpha3, p.c)];
        const s = y[0] + y[1] + y[2];
        const x = y.map(v => v / s);
        buf.push([x, s]);
        if (buf.length > 60000) buf = buf.slice(-30000);
        return x[p.j - 1];
      },
      sampleName: 'simulated proportions Y_j / ΣY',
      target: {
        name: p => { const a = [p.alpha1, p.alpha2, p.alpha3], s = a[0] + a[1] + a[2], aj = a[p.j - 1]; return `Beta(${f3(aj)}, ${f3(s - aj)}): marginal of Dir(${a.map(f3).join(', ')})`; },
        pdf: (x, p) => { const a = [p.alpha1, p.alpha2, p.alpha3], s = a[0] + a[1] + a[2], aj = a[p.j - 1]; return betaPdf(x, aj, s - aj); },
        cdf: (x, p) => { const a = [p.alpha1, p.alpha2, p.alpha3], s = a[0] + a[1] + a[2], aj = a[p.j - 1]; return x <= 0 ? 0 : x >= 1 ? 1 : betaI(x, aj, s - aj); },
      },
      range: () => [0, 1],
      xLabel: 'proportion of coordinate j',
      readout: (p, s) => {
        const xs = buf.slice(-s.n);
        const a0 = p.alpha1 + p.alpha2 + p.alpha3;
        let mS = 0, mX = 0;
        for (const [x, t] of xs) { mS += t; mX += x[0]; }
        mS /= xs.length; mX /= xs.length;
        let sxy = 0, sxx = 0, syy = 0;
        for (const [x, t] of xs) { sxy += (t - mS) * (x[0] - mX); sxx += (t - mS) ** 2; syy += (x[0] - mX) ** 2; }
        const r = sxy / Math.sqrt(sxx * syy);
        return `Mean of the totals $S = \\sum_i Y_i$: <b>${f3(mS)}</b> (the $\\mathrm{Gamma}(\\alpha_0, c)$ mean $\\alpha_0/c$ is ${f3(a0 / p.c)}). Correlation between $S$ and the first proportion: <b>${f3(r)}</b>, close to 0 because the total is independent of the proportions.`;
      },
      onUpdate: (p, s) => drawTri(p, s),
    });

    // the triangle with the normalized draws, inserted above the histogram and CDF
    const triBox = h('div');
    side = h('div', { class: 'gd-side' });
    const grid = container.querySelector('.demo-grid');
    const row = h('div', { class: 'gd-row' }, h('figure', { class: 'plot-fig' }, ui.rich('figcaption', 'Normalized gamma draws on the triangle, over the $\\mathrm{Dir}(\\boldsymbol\\alpha)$ density'), triBox), side);
    container.insertBefore(row, grid);
    tri = new plot.Plot(triBox, { equalAspect: true, className: 'pd-simplex', margin: { t: 24, b: 28, l: 12, r: 12 }, height: w => Math.max(240, Math.min(360, w * 0.85)), ariaLabel: 'Normalized gamma draws on the triangle' });

    function drawTri(p, s) {
      if (!tri) return;
      const a = [p.alpha1, p.alpha2, p.alpha3];
      const key = a.join(',');
      if (heat.key !== key) heat = { key, H: heatValues(a) };
      const xs = buf.slice(-s.n).slice(0, 400);
      const layers = [{ id: 'heat', type: 'heatmap', x: [0, 1], y: [0, SQ3], nx: NX, ny: NY, values: heat.H.values, max: heat.H.max },
        { id: 'tri', type: 'polygon', points: [[0, 0], [1, 0], [0.5, SQ3]], cls: 'gd-tri' },
        { id: 'c1', type: 'text', x: 0, y: 0, dy: 17, text: '(1, 0, 0)', cls: 'gd-corner', keepInside: false },
        { id: 'c2', type: 'text', x: 1, y: 0, dy: 17, text: '(0, 1, 0)', cls: 'gd-corner', keepInside: false },
        { id: 'c3', type: 'text', x: 0.5, y: SQ3, dy: -9, text: '(0, 0, 1)', cls: 'gd-corner', keepInside: false }];
      xs.forEach(([x], i) => { const [u, v] = toXY(x); layers.push({ id: 'd' + i, type: 'dot', x: u, y: v, r: 1.9, cls: 'gd-draw' }); });
      tri.render({ x: [-0.08, 1.08], y: [-0.1, SQ3 + 0.08], layers });
      const ex = xs[0];
      ui.renderRich(side, `<p>Each dot is one simulated vector of proportions $(Y_1, Y_2, Y_3)/S$, placed in the triangle of probability vectors: the corners are $(1, 0, 0)$, $(0, 1, 0)$ and $(0, 0, 1)$, and a point is closer to corner $j$ the larger its $j$-th share. The dots follow the shading, which is the $\\mathrm{Dir}(${a.map(f3).join(', ')})$ density.</p>`
        + (ex ? `<p>For example, the first draw had total $S$ = ${f3(ex[1])} and proportions (${ex[0].map(f3).join(', ')}).</p>` : ''));
    }
    // first draw happened before the triangle existed
    out.redraw();
  },
};
