// Normal <-> Multivariate normal. The multivariate normal with d = 1 is the normal; it is built from independent
// standard normals by a linear map X = mu + L Z; and every margin and weighted sum a'X is normal.
// Two views: (1) a hand-written demo of the linear map, with a draggable point in the Z plane and its image in
// the X plane (either can be dragged); (2) ctx.demos.simulationDemo for a weighted sum a'X with a = (cos t, sin t),
// with a scatter plot added above it on which the direction a can be dragged.

import { getRelation } from '../catalog.js';
import { normalCdf } from '../core/math.js';

const REL = getRelation('normal--multivariate-normal');
const f3 = v => String(Number(Number(v).toPrecision(3))).replace(/^-/, '−');
const DEG = Math.PI / 180;

const STYLE = `
.pd-nm .layer.nm-pt .dot { fill: var(--ink); fill-opacity: .4; }
.pd-nm .layer.nm-img .dot { fill: var(--amber); stroke: var(--amber-deep); stroke-width: 1.5; }
.pd-nm .layer.nm-circ .poly { fill: none; stroke: var(--steel-deep); stroke-width: 1.4; }
.pd-nm .layer.nm-circ2 .poly { fill: none; stroke: var(--steel-deep); stroke-width: 1.1; stroke-dasharray: 5 4; }
.pd-nm .layer.nm-vec .rule { stroke: var(--steel-deep); stroke-width: 2.4; }
.pd-nm .layer.nm-dir .rule { stroke: var(--amber-deep); stroke-width: 1.6; stroke-dasharray: 6 4; }
.pd-nm .layer.nm-tag .label { font-family: var(--serif); font-style: italic; font-size: 13px; fill: var(--ink); paint-order: stroke; stroke: var(--surface); stroke-width: 4px; }
.pd-nm .nm-row { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: clamp(12px, 2vw, 24px); align-items: center; margin-bottom: 1rem; }
.pd-nm .nm-side { font-size: .92rem; color: var(--ink-2); }
@media (max-width: 760px) { .pd-nm .nm-row { grid-template-columns: 1fr; } .pd-nm .plot-fig + .plot-fig { margin-top: 1.2rem; } }
`;

/** Cholesky factor of the 2 x 2 covariance matrix: rows [[L11, 0], [L21, L22]]. */
const chol = p => [[p.sigma1, 0], [p.rho * p.sigma2, p.sigma2 * Math.sqrt(1 - p.rho * p.rho)]];
const mapZ = (p, z) => { const L = chol(p); return [p.mu1 + L[0][0] * z[0], p.mu2 + L[1][0] * z[0] + L[1][1] * z[1]]; };
const unmapX = (p, x) => { const L = chol(p); const z1 = (x[0] - p.mu1) / L[0][0]; return [z1, (x[1] - p.mu2 - L[1][0] * z1) / L[1][1]]; };
const ellipse = (p, k, n = 100) => Array.from({ length: n + 1 }, (_, i) => mapZ(p, [k * Math.cos(2 * Math.PI * i / n), k * Math.sin(2 * Math.PI * i / n)]));

const mvnParams = [
  { key: 'mu1', sym: '\\mu_1', name: 'mean of X₁', meaning: 'The center of the first variable.', min: -5, max: 5, default: 1 },
  { key: 'mu2', sym: '\\mu_2', name: 'mean of X₂', meaning: 'The center of the second variable.', min: -5, max: 5, default: 0.5 },
  { key: 'sigma1', sym: '\\sigma_1', name: 'standard deviation of X₁', meaning: 'The standard deviation of the first variable.', min: 0.2, max: 3, default: 1.5 },
  { key: 'sigma2', sym: '\\sigma_2', name: 'standard deviation of X₂', meaning: 'The standard deviation of the second variable.', min: 0.2, max: 3, default: 1 },
  { key: 'rho', sym: '\\rho', name: 'correlation', meaning: 'The correlation between $X_1$ and $X_2$.', min: -0.95, max: 0.95, default: 0.6, step: 0.01 },
];

export default {
  id: 'normal--multivariate-normal',
  from: 'normal',
  to: 'multivariate-normal',
  title: 'The multivariate normal extends the normal distribution to several correlated variables',

  plain: [
    'The multivariate normal distribution describes a vector of $d$ variables that are jointly normal. With $d = 1$ it is the ordinary normal distribution $\\mathcal N(\\mu, \\sigma^2)$. The two distributions are linked in both directions.',
    '<b>From normals to the multivariate normal.</b> Take $d$ independent standard normal variables $Z_1, \\dots, Z_d$ and form weighted combinations of them, $\\mathbf X = \\boldsymbol\\mu + L\\mathbf Z$. The result is multivariate normal with mean $\\boldsymbol\\mu$ and covariance matrix $\\Sigma = LL^{\\top}$. Correlation between the $X$s arises because they share some of the same $Z$s. This is how correlated normal variables are simulated.',
    '<b>From the multivariate normal back to normals.</b> Any single variable $X_j$ of a multivariate normal vector is normal, with mean $\\mu_j$ and variance $\\Sigma_{jj}$, and so is any weighted sum $\\mathbf a^{\\top}\\mathbf X = a_1 X_1 + \\dots + a_d X_d$, with mean $\\mathbf a^{\\top}\\boldsymbol\\mu$ and variance $\\mathbf a^{\\top}\\Sigma\\mathbf a$. In fact this property defines the multivariate normal: a vector is multivariate normal exactly when every weighted sum of its entries is normal.',
  ],

  statementTex: REL.statement,
  glossary: [
    { sym: '\\mathrm{MVN}_1(\\mu, \\sigma^2)', meaning: 'The multivariate normal in one dimension, with mean $\\mu$ and variance $\\sigma^2$.' },
    { sym: '\\mathcal N(\\mu, \\sigma^2)', meaning: 'The normal distribution with mean $\\mu$ and variance $\\sigma^2$ (standard deviation $\\sigma$).' },
    { sym: 'Z_1, \\dots, Z_d \\overset{iid}{\\sim} \\mathcal N(0, 1)', meaning: 'Independent standard normal variables (mean 0, standard deviation 1), collected in the vector $\\mathbf Z$.' },
    { sym: 'd', meaning: 'The number of variables (the dimension).' },
    { sym: '\\boldsymbol\\mu', meaning: 'The mean vector $(\\mu_1, \\dots, \\mu_d)$.' },
    { sym: 'L', meaning: 'A $d \\times d$ matrix of weights. Row $j$ says how much of each $Z_k$ goes into $X_j$. Often $L$ is the lower-triangular Cholesky factor of $\\Sigma$.' },
    { sym: 'LL^{\\top}', meaning: 'The covariance matrix produced by the weights; $\\top$ means transpose.' },
    { sym: '\\mathbf X', meaning: 'The random vector $(X_1, \\dots, X_d)$ built from $\\mathbf Z$; $X_j$ is its $j$-th variable.' },
    { sym: '\\mathrm{MVN}_d(\\boldsymbol\\mu, \\Sigma)', meaning: 'The $d$-dimensional multivariate normal with mean vector $\\boldsymbol\\mu$ and covariance matrix $\\Sigma$.' },
    { sym: '\\Sigma', meaning: 'The covariance matrix: variances on the diagonal, covariances off the diagonal. $\\Sigma_{jj}$ is the variance of $X_j$.' },
    { sym: '\\mathbf a', meaning: 'A vector of weights $(a_1, \\dots, a_d)$; $\\mathbf a^{\\top}\\mathbf X = a_1X_1 + \\dots + a_dX_d$ is a weighted sum of the variables.' },
    { sym: '\\mathbf a^{\\top}\\Sigma\\mathbf a', meaning: 'The variance of the weighted sum, $\\sum_i\\sum_k a_i a_k \\Sigma_{ik}$.' },
    { sym: 'X_j \\sim \\mathcal N(\\mu_j, \\Sigma_{jj})', meaning: 'Each single variable is normal (take $\\mathbf a$ with a 1 in position $j$ and zeros elsewhere).' },
    { sym: '\\Rightarrow', meaning: 'Implies.' },
  ],

  why: [
    '<b>Linear maps of independent normals.</b> The moment-generating function of a standard normal vector $\\mathbf Z$ is $\\mathrm{E}[e^{\\mathbf t^{\\top}\\mathbf Z}] = e^{\\mathbf t^{\\top}\\mathbf t/2}$, the product of the $d$ one-dimensional ones. For $\\mathbf X = \\boldsymbol\\mu + L\\mathbf Z$,',
    { tex: '\\mathrm{E}\\big[e^{\\mathbf t^{\\top}\\mathbf X}\\big] = e^{\\mathbf t^{\\top}\\boldsymbol\\mu}\\, \\mathrm{E}\\big[e^{(L^{\\top}\\mathbf t)^{\\top}\\mathbf Z}\\big] = \\exp\\!\\Big(\\mathbf t^{\\top}\\boldsymbol\\mu + \\tfrac12 \\mathbf t^{\\top} LL^{\\top} \\mathbf t\\Big),' },
    'which is the moment-generating function of $\\mathrm{MVN}_d(\\boldsymbol\\mu, LL^{\\top})$. In two dimensions, with the Cholesky factor, this reads $X_1 = \\mu_1 + \\sigma_1 Z_1$ and $X_2 = \\mu_2 + \\sigma_2(\\rho Z_1 + \\sqrt{1 - \\rho^2}\\, Z_2)$: $X_2$ shares the part $\\rho Z_1$ with $X_1$, which produces the correlation $\\rho$. The map turns the circles of constant density of $\\mathbf Z$ into the ellipses of $\\mathbf X$.',
    '<b>Weighted sums.</b> Setting $\\mathbf t = s\\mathbf a$ in the same moment-generating function gives $\\mathrm{E}[e^{s\\,\\mathbf a^{\\top}\\mathbf X}] = \\exp(s\\,\\mathbf a^{\\top}\\boldsymbol\\mu + \\tfrac12 s^2\\, \\mathbf a^{\\top}\\Sigma\\mathbf a)$, the moment-generating function of a normal variable with mean $\\mathbf a^{\\top}\\boldsymbol\\mu$ and variance $\\mathbf a^{\\top}\\Sigma\\mathbf a$. Geometrically, projecting the elliptical cloud of points onto any line through the origin gives a normal histogram; its spread depends on the direction of the line.',
    '<b>One dimension.</b> With $d = 1$, $\\Sigma$ is the single number $\\sigma^2$, $|\\Sigma|^{1/2} = \\sigma$ and $(x - \\mu)^{\\top}\\Sigma^{-1}(x - \\mu) = (x - \\mu)^2/\\sigma^2$, so the multivariate normal density $(2\\pi)^{-d/2}|\\Sigma|^{-1/2}\\exp(-\\tfrac12(\\mathbf x - \\boldsymbol\\mu)^{\\top}\\Sigma^{-1}(\\mathbf x - \\boldsymbol\\mu))$ becomes the normal density. A caution about the converse: two variables that are each normal need not be jointly normal. Joint normality requires every weighted sum to be normal, not just the separate variables.',
  ],

  references: [
    { text: 'Wikipedia: Multivariate normal distribution, definitions and affine transformation.', url: 'https://en.wikipedia.org/wiki/Multivariate_normal_distribution' },
    { text: 'Casella, G., & Berger, R. L. (2002). <i>Statistical Inference</i> (2nd ed.), Section 4.5 and Exercise 4.45 (bivariate normal). Duxbury.' },
    { text: 'Anderson, T. W. (2003). <i>An Introduction to Multivariate Statistical Analysis</i> (3rd ed.), Chapter 2. Wiley.' },
    { text: 'Wasserman, L. (2004). <i>All of Statistics</i>, Section 2.10 (multivariate normal). Springer.' },
  ],

  demo(container, ctx) {
    const { ui } = ctx;
    const { h } = ui;
    if (!document.getElementById('pd-style-nm')) document.head.append(h('style', { id: 'pd-style-nm' }, STYLE));
    container.classList.add('pd-nm');
    const viewA = h('div'), viewB = h('div', { hidden: true });
    let builtB = false;
    const seg = ui.segmented([
      { value: 'build', label: 'Build from independent normals' },
      { value: 'sum', label: 'Margins and weighted sums' },
    ], 'build', v => {
      viewA.hidden = v !== 'build'; viewB.hidden = v !== 'sum';
      if (v === 'sum' && !builtB) { builtB = true; buildSums(viewB, ctx); }
    }, 'Which direction of the relationship to show');
    container.append(h('div', { style: 'margin-bottom:1rem' }, seg.el), viewA, viewB);
    buildMap(viewA, ctx);
  },
};

function buildMap(container, { math, plot, ui }) {
  const { h } = ui;
  const defaults = Object.fromEntries(mvnParams.map(q => [q.key, q.default]));
  const store = ui.createStore({ p: { ...defaults }, z: [1.2, 0.8] });
  const rng = math.makeRng(31);
  const Z = Array.from({ length: 300 }, () => [rng.normal(), rng.normal()]);
  const zBox = h('div'), xBox = h('div');
  const readout = h('p', { class: 'demo-readout', 'aria-live': 'polite' });
  const controls = h('div', { class: 'demo-controls' });
  container.append(
    ui.rich('p', 'Left: 300 points $\\mathbf z = (z_1, z_2)$ drawn from two independent standard normals, with the circles of radius 1 and 2. Right: the same points after the linear map $\\mathbf x = \\boldsymbol\\mu + L\\mathbf z$, with $L$ the Cholesky factor of $\\Sigma$; the circles become the 1- and 2-standard-deviation ellipses. The steel arrows show where the unit steps $\\mathbf e_1 = (1, 0)$ and $\\mathbf e_2 = (0, 1)$ go: they become the columns of $L$. Drag the amber point in either plot to see a single point and its image.', { class: 'small muted demo-intro' }),
    h('div', { class: 'demo-grid' },
      h('figure', { class: 'plot-fig' }, ui.rich('figcaption', 'Independent standard normals $\\mathbf Z$'), zBox),
      h('figure', { class: 'plot-fig' }, ui.rich('figcaption', '$\\mathbf X = \\boldsymbol\\mu + L\\mathbf Z \\sim \\mathrm{MVN}_2(\\boldsymbol\\mu, \\Sigma)$'), xBox)),
    readout, controls);
  const panel = ui.paramPanel(controls, mvnParams, {
    get: () => store.get().p,
    apply: (k, v) => store.set({ p: { ...store.get().p, [k]: v } }),
    onReset: () => store.set({ p: { ...defaults } }),
  });
  const zPlot = new plot.Plot(zBox, { xLabel: 'z₁', yLabel: 'z₂', equalAspect: true, height: w => Math.max(240, Math.min(400, w * 0.85)), ariaLabel: 'Standard normal points' });
  const xPlot = new plot.Plot(xBox, { xLabel: 'x₁', yLabel: 'x₂', equalAspect: true, height: w => Math.max(240, Math.min(400, w * 0.85)), ariaLabel: 'Transformed points' });
  let frozenX = null;
  let raf = 0;
  const request = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; draw(); }); };
  store.subscribe(() => { panel.update(store.get().p); request(); });
  const clampZ = z => z.map(v => math.clamp(v, -3.4, 3.4));

  function draw() {
    const { p, z } = store.get();
    const circ = k => Array.from({ length: 101 }, (_, i) => [k * Math.cos(2 * Math.PI * i / 100), k * Math.sin(2 * Math.PI * i / 100)]);
    const zl = [
      { id: 'c1', type: 'polygon', points: circ(1), cls: 'nm-circ' }, { id: 'c2', type: 'polygon', points: circ(2), cls: 'nm-circ2' },
      ...Z.map((q, i) => ({ id: 'p' + i, type: 'dot', x: q[0], y: q[1], r: 1.8, cls: 'nm-pt' })),
      { id: 'e1', type: 'segment', x1: 0, y1: 0, x2: 1, y2: 0, cls: 'nm-vec' }, { id: 'e2', type: 'segment', x1: 0, y1: 0, x2: 0, y2: 1, cls: 'nm-vec' },
      { id: 't1', type: 'text', x: 1, y: 0, dx: 4, dy: 14, text: 'e₁', cls: 'nm-tag' }, { id: 't2', type: 'text', x: 0, y: 1, dx: -12, dy: 0, text: 'e₂', cls: 'nm-tag' },
    ];
    zPlot.render({
      x: [-3.6, 3.6], y: [-3.6, 3.6], layers: zl,
      handles: [{
        id: 'z', type: 'point', at: { x: z[0], y: z[1] }, label: 'z',
        ariaLabel: 'A point z in the plane of independent standard normals. Drag it, or use the arrow keys.', valueText: `${f3(z[0])}, ${f3(z[1])}`, valueNow: z[0],
        onDrag: pt => { if (pt) store.set({ z: clampZ([math.roundTo(pt.x, 0.01), math.roundTo(pt.y, 0.01)]) }); },
        onKey: (steps, axis) => store.set({ z: clampZ(axis === 'y' ? [z[0], z[1] + 0.05 * steps] : [z[0] + 0.05 * steps, z[1]]) }),
      }],
    });
    const L = chol(p);
    const x = mapZ(p, z);
    const view = frozenX || { x: [p.mu1 - 3.6 * Math.max(p.sigma1, p.sigma2), p.mu1 + 3.6 * Math.max(p.sigma1, p.sigma2)], y: [p.mu2 - 3.6 * Math.max(p.sigma1, p.sigma2), p.mu2 + 3.6 * Math.max(p.sigma1, p.sigma2)] };
    const c1 = [p.mu1 + L[0][0], p.mu2 + L[1][0]], c2 = [p.mu1, p.mu2 + L[1][1]];
    const xl = [
      { id: 'c1', type: 'polygon', points: ellipse(p, 1), cls: 'nm-circ' }, { id: 'c2', type: 'polygon', points: ellipse(p, 2), cls: 'nm-circ2' },
      ...Z.map((q, i) => { const v = mapZ(p, q); return { id: 'p' + i, type: 'dot', x: v[0], y: v[1], r: 1.8, cls: 'nm-pt' }; }),
      { id: 'e1', type: 'segment', x1: p.mu1, y1: p.mu2, x2: c1[0], y2: c1[1], cls: 'nm-vec' }, { id: 'e2', type: 'segment', x1: p.mu1, y1: p.mu2, x2: c2[0], y2: c2[1], cls: 'nm-vec' },
      { id: 't1', type: 'text', x: c1[0], y: c1[1], dx: 6, dy: 14, text: 'L e₁', cls: 'nm-tag', anchor: 'start' }, { id: 't2', type: 'text', x: c2[0], y: c2[1], dx: -8, dy: -4, text: 'L e₂', cls: 'nm-tag', anchor: 'end' },
      { id: 'mu', type: 'dot', x: p.mu1, y: p.mu2, r: 3.5 },
    ];
    xPlot.render({
      x: view.x, y: view.y, layers: xl,
      handles: [{
        id: 'x', type: 'point', at: { x: x[0], y: x[1] }, label: 'x',
        ariaLabel: 'The image x = μ + L z. Drag it to move z accordingly, or use the arrow keys.', valueText: `${f3(x[0])}, ${f3(x[1])}`, valueNow: x[0],
        onDrag: (pt, phase) => {
          if (phase === 'start') frozenX = xPlot.domain;
          if (pt) store.set({ z: clampZ(unmapX(store.get().p, [pt.x, pt.y]).map(v => math.roundTo(v, 0.01))) });
          if (phase === 'end') { frozenX = null; request(); }
        },
        onKey: (steps, axis) => { const xx = mapZ(p, z); xx[axis === 'y' ? 1 : 0] += 0.05 * steps; store.set({ z: clampZ(unmapX(p, xx)) }); },
      }],
    });
    ui.renderRich(readout,
      `$L = \\begin{pmatrix} ${f3(L[0][0])} & 0 \\\\ ${f3(L[1][0])} & ${f3(L[1][1])} \\end{pmatrix}$, so $x_1 = \\mu_1 + \\sigma_1 z_1$ and $x_2 = \\mu_2 + \\sigma_2(\\rho z_1 + \\sqrt{1-\\rho^2}\\,z_2)$. `
      + `Here $\\mathbf z$ = (${f3(z[0])}, ${f3(z[1])}) maps to $\\mathbf x$ = <b>(${f3(x[0])}, ${f3(x[1])})</b>. `
      + `The point stays on the same ellipse as its circle: its distance from the center is ${f3(Math.hypot(z[0], z[1]))} standard deviations in both plots (the Mahalanobis distance of $\\mathbf x$). `
      + `$LL^{\\top} = \\Sigma$ has variances ${f3(p.sigma1 ** 2)}, ${f3(p.sigma2 ** 2)} and covariance ${f3(p.rho * p.sigma1 * p.sigma2)}.`);
  }
  draw();
}

function buildSums(container, { plot, ui, demos }) {
  const { h } = ui;
  let buf = [];
  const params = [{ key: 'theta', sym: '\\theta', name: 'direction of a (degrees)', meaning: 'The weights are $\\mathbf a = (\\cos\\theta, \\sin\\theta)$. $\\theta = 0$ gives $X_1$, $\\theta = 90$ gives $X_2$, and $\\theta = 45$ gives $(X_1 + X_2)/\\sqrt2$.', min: 0, max: 180, default: 30, step: 1 }, ...mvnParams];
  const a = p => [Math.cos(p.theta * DEG), Math.sin(p.theta * DEG)];
  const mom = p => {
    const [a1, a2] = a(p);
    return { m: a1 * p.mu1 + a2 * p.mu2, v: a1 * a1 * p.sigma1 ** 2 + 2 * a1 * a2 * p.rho * p.sigma1 * p.sigma2 + a2 * a2 * p.sigma2 ** 2 };
  };
  let out = null, scat = null, side = null, dragTh = false;
  out = demos.simulationDemo(container, null, {
    intro: 'Each simulated value is the weighted sum $\\mathbf a^{\\top}\\mathbf X = a_1X_1 + a_2X_2$ of one bivariate normal draw, with weights $\\mathbf a = (\\cos\\theta, \\sin\\theta)$, a unit vector in direction $\\theta$. Geometrically, it is the position of the point’s projection onto the amber line. The histogram is compared with the normal density with mean $\\mathbf a^{\\top}\\boldsymbol\\mu$ and variance $\\mathbf a^{\\top}\\Sigma\\mathbf a$. Drag the amber knob in the scatter plot to turn the line; $\\theta = 0$ and $\\theta = 90$ give the margins $X_1$ and $X_2$.',
    params,
    sample: (rng, p) => {
      const z1 = rng.normal(), z2 = rng.normal();
      const x = [p.mu1 + p.sigma1 * z1, p.mu2 + p.sigma2 * (p.rho * z1 + Math.sqrt(1 - p.rho * p.rho) * z2)];
      buf.push(x);
      if (buf.length > 60000) buf = buf.slice(-30000);
      const [a1, a2] = a(p);
      return a1 * x[0] + a2 * x[1];
    },
    sampleName: 'simulated weighted sums aᵀX',
    target: {
      name: p => { const { m, v } = mom(p); return `Normal(mean ${f3(m)}, sd ${f3(Math.sqrt(v))})`; },
      pdf: (x, p) => { const { m, v } = mom(p); return Math.exp(-0.5 * (x - m) ** 2 / v) / Math.sqrt(2 * Math.PI * v); },
      cdf: (x, p) => { const { m, v } = mom(p); return normalCdf((x - m) / Math.sqrt(v)); },
    },
    range: p => { const { m, v } = mom(p); return [m - 4.2 * Math.sqrt(v), m + 4.2 * Math.sqrt(v)]; },
    xLabel: 'aᵀX',
    readout: p => { const { m, v } = mom(p); const [a1, a2] = a(p); return `Weights $\\mathbf a$ = (${f3(a1)}, ${f3(a2)}). Exact mean $\\mathbf a^{\\top}\\boldsymbol\\mu$ = <b>${f3(m)}</b> and standard deviation $\\sqrt{\\mathbf a^{\\top}\\Sigma\\mathbf a}$ = <b>${f3(Math.sqrt(v))}</b>.`; },
    onUpdate: (p, s) => drawScatter(p, s),
  });
  const box = h('div');
  side = h('div', { class: 'nm-side' });
  container.insertBefore(h('div', { class: 'nm-row' }, h('figure', { class: 'plot-fig' }, ui.rich('figcaption', 'Draws of $\\mathbf X$ and the direction $\\mathbf a$'), box), side), container.querySelector('.demo-grid'));
  scat = new plot.Plot(box, { xLabel: 'x₁', yLabel: 'x₂', equalAspect: true, height: w => Math.max(240, Math.min(400, w * 0.85)), ariaLabel: 'Scatter of bivariate normal draws with a projection direction' });

  function drawScatter(p, s) {
    if (!scat) return;
    const pts = buf.slice(-s.n).slice(0, 400);
    const R = 3.4 * Math.max(p.sigma1, p.sigma2);
    const [a1, a2] = a(p);
    const layers = [
      { id: 'e1', type: 'polygon', points: ellipse(p, 1), cls: 'nm-circ' }, { id: 'e2', type: 'polygon', points: ellipse(p, 2), cls: 'nm-circ2' },
      ...pts.map((q, i) => ({ id: 'p' + i, type: 'dot', x: q[0], y: q[1], r: 1.8, cls: 'nm-pt' })),
      { id: 'dir', type: 'segment', x1: p.mu1 - 1.2 * R * a1, y1: p.mu2 - 1.2 * R * a2, x2: p.mu1 + 1.2 * R * a1, y2: p.mu2 + 1.2 * R * a2, cls: 'nm-dir' },
    ];
    const k = [p.mu1 + 0.75 * R * a1, p.mu2 + 0.75 * R * a2];
    scat.render({
      x: [p.mu1 - R, p.mu1 + R], y: [p.mu2 - R, p.mu2 + R], layers,
      handles: [{
        id: 'theta', type: 'point', at: { x: k[0], y: k[1] }, label: 'a',
        ariaLabel: 'Direction of the weights a. Drag around the center, or use the arrow keys.', valueText: `${f3(p.theta)} degrees`, valueNow: p.theta, valueMin: 0, valueMax: 180,
        onDrag: (pt, phase) => {
          if (phase === 'start') dragTh = true;
          if (pt && dragTh) {
            const cur = out.store.get().p;
            let th = Math.atan2(pt.y - cur.mu2, pt.x - cur.mu1) / DEG;
            if (th < 0) th += 180;
            out.store.set({ p: { ...cur, theta: Math.round(Math.min(180, th)) } });
          }
          if (phase === 'end') dragTh = false;
        },
        onKey: steps => { const cur = out.store.get().p; out.store.set({ p: { ...cur, theta: Math.max(0, Math.min(180, cur.theta + steps)) } }); },
      }],
    });
    ui.renderRich(side, `<p>The amber line through the mean points in direction $\\theta$ = ${f3(p.theta)}°. Projecting every point onto it and reading off its position gives the weighted sum $\\mathbf a^{\\top}\\mathbf X$ (plus a constant), whose histogram is below.</p><p>The spread of the projections is largest along the long axis of the ellipses and smallest across it, but in every direction their histogram is normal. This is the defining property of the multivariate normal.</p>`);
  }
  out.redraw();
}
