// Multivariate normal -> chi-squared: the squared Mahalanobis distance of an MVN_d point from its mean is chi^2_d.
// Demo: ctx.demos.simulationDemo with draws from a d-dimensional normal with unequal standard deviations and equal
// correlations rho; each simulated value is D^2 = (x - mu)' Sigma^{-1} (x - mu). A scatter of the first two
// coordinates is added above (points beyond the chi-squared 95% point in amber; for d = 2 the 95% ellipse), and the
// readout compares the 5% exceedance rate of D^2 with that of the plain squared Euclidean distance.

import { getRelation } from '../catalog.js';
import { gammaP, gammaPinv, lgamma } from '../core/math.js';

const REL = getRelation('multivariate-normal--chi-squared');
const f3 = v => String(Number(Number(v).toPrecision(3))).replace(/^-/, '−');
const chi2Pdf = (x, k) => (x <= 0 ? (k < 2 ? Infinity : k === 2 ? 0.5 : 0) : Math.exp((k / 2 - 1) * Math.log(x) - x / 2 - (k / 2) * Math.LN2 - lgamma(k / 2)));
const chi2Cdf = (x, k) => (x <= 0 ? 0 : gammaP(k / 2, x / 2));
const chi2Q = (k, u) => 2 * gammaPinv(k / 2, u);
const SCALES = [1, 2, 0.6, 1.5, 0.8, 1.2, 2.5, 0.5, 1.8, 0.7];

const STYLE = `
.pd-mc .layer.mc-pt .dot { fill: var(--ink); fill-opacity: .4; }
.pd-mc .layer.mc-out .dot { fill: var(--amber-deep); fill-opacity: .95; }
.pd-mc .layer.mc-ell .poly { fill: rgba(233,185,73,.10); stroke: var(--amber-deep); stroke-width: 1.6; }
.pd-mc .layer.mc-circ .poly { fill: none; stroke: var(--curve-ref); stroke-width: 1.4; stroke-dasharray: 6 4; }
.pd-mc .mc-row { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: clamp(12px, 2vw, 24px); align-items: center; margin-bottom: 1rem; }
.pd-mc .mc-side { font-size: .92rem; color: var(--ink-2); }
@media (max-width: 760px) { .pd-mc .mc-row { grid-template-columns: 1fr; } }
`;

/** One draw: coordinates x_i = s_i z_i with equicorrelated standard normals z; returns x, D^2 and |x|^2. */
function draw(rng, d, rho) {
  const w = rng.normal();
  const z = Array.from({ length: d }, () => Math.sqrt(1 - rho) * rng.normal() + Math.sqrt(rho) * w);
  const x = z.map((v, i) => SCALES[i] * v);
  // R^{-1} = (I - c J)/(1 - rho), c = rho / (1 + (d - 1) rho), for the equicorrelation matrix R
  let ss = 0, s = 0;
  for (const v of z) { ss += v * v; s += v; }
  const D2 = (ss - rho / (1 + (d - 1) * rho) * s * s) / (1 - rho);
  let e2 = 0;
  for (const v of x) e2 += v * v;
  return { x, D2, e2 };
}

export default {
  id: 'multivariate-normal--chi-squared',
  from: 'multivariate-normal',
  to: 'chi-squared',
  title: 'The squared Mahalanobis distance of a multivariate normal point from its mean has a chi-squared distribution',

  plain: [
    'For a multivariate normal vector $\\mathbf X$ with mean $\\boldsymbol\\mu$ and covariance matrix $\\Sigma$, the natural way to measure how far a point is from the center is the Mahalanobis distance $D_M$. It counts distance in standard deviations, taking into account that some directions vary more than others and that the variables are correlated. Its contours are the ellipses of constant density.',
    'The squared Mahalanobis distance of a random point from its mean, $D_M^2 = (\\mathbf X - \\boldsymbol\\mu)^{\\top}\\Sigma^{-1}(\\mathbf X - \\boldsymbol\\mu)$, has a chi-squared distribution with $d$ degrees of freedom, one for each variable, whatever the means, variances and correlations. This tells us how much probability each ellipse holds (for example, the ellipse containing 95% of the probability is $D_M^2 \\le \\chi^2_{d, 0.95}$), gives a test for multivariate outliers, and is the reason Wald tests of several parameters at once use the chi-squared distribution.',
  ],

  statementTex: REL.statement,
  glossary: [
    { sym: '\\mathbf X \\sim \\mathrm{MVN}_d(\\boldsymbol\\mu, \\Sigma)', meaning: 'A random vector of $d$ jointly normal variables with mean vector $\\boldsymbol\\mu$ and covariance matrix $\\Sigma$.' },
    { sym: 'd', meaning: 'The number of variables (the dimension); it becomes the degrees of freedom.' },
    { sym: '\\boldsymbol\\mu', meaning: 'The mean vector.' },
    { sym: '\\Sigma', meaning: 'The covariance matrix (variances on the diagonal, covariances off it).' },
    { sym: '\\Sigma \\text{ positive definite}', meaning: 'Every weighted sum of the variables has positive variance. This guarantees that $\\Sigma$ has an inverse.' },
    { sym: '\\Sigma^{-1}', meaning: 'The inverse of the covariance matrix (the precision matrix).' },
    { sym: 'D_M^2', meaning: 'The squared Mahalanobis distance of $\\mathbf X$ from $\\boldsymbol\\mu$.' },
    { sym: '(\\mathbf X - \\boldsymbol\\mu)^{\\top}', meaning: 'The deviation from the mean written as a row vector ($\\top$ means transpose).' },
    { sym: '\\chi^2_d', meaning: 'The chi-squared distribution with $d$ degrees of freedom: the distribution of a sum of $d$ independent squared standard normals. Its mean is $d$.' },
    { sym: '\\Rightarrow', meaning: 'Implies.' },
  ],

  why: [
    'Write $\\Sigma = LL^{\\top}$ (for example with the Cholesky factor $L$) and define $\\mathbf Z = L^{-1}(\\mathbf X - \\boldsymbol\\mu)$. A linear map of a multivariate normal vector is multivariate normal, here with mean $\\mathbf 0$ and covariance',
    { tex: '\\mathrm{Cov}(\\mathbf Z) = L^{-1}\\Sigma (L^{-1})^{\\top} = L^{-1}LL^{\\top}(L^{\\top})^{-1} = I,' },
    'the identity matrix. So $Z_1, \\dots, Z_d$ are uncorrelated standard normals, and for normal variables uncorrelated means independent. This step is often called whitening: it rescales and rotates the data so that the elliptical cloud becomes a round one. The squared Mahalanobis distance is the squared ordinary length of the whitened vector,',
    { tex: 'D_M^2 = (\\mathbf X - \\boldsymbol\\mu)^{\\top}(LL^{\\top})^{-1}(\\mathbf X - \\boldsymbol\\mu) = (L^{-1}(\\mathbf X - \\boldsymbol\\mu))^{\\top}(L^{-1}(\\mathbf X - \\boldsymbol\\mu)) = \\mathbf Z^{\\top}\\mathbf Z = Z_1^2 + \\dots + Z_d^2,' },
    'a sum of $d$ independent squared standard normals, which is $\\chi^2_d$ by definition. With $d = 2$, $\\chi^2_2$ is the exponential distribution with mean 2, so $P(D_M \\le k) = 1 - e^{-k^2/2}$: the 1-standard-deviation ellipse holds 39.3% and the 2-standard-deviation ellipse 86.5%.',
    'The plain squared Euclidean distance $\\lVert \\mathbf X - \\boldsymbol\\mu \\rVert^2$ is not chi-squared unless $\\Sigma$ is the identity matrix; it gives too much weight to variables with large variance and double-counts correlated variables. If $\\boldsymbol\\mu$ and $\\Sigma$ are replaced by the mean and covariance matrix of a sample of size $n$, the distance is no longer exactly chi-squared: for a new observation it is a rescaled F (Hotelling’s $T^2$) variable, and for an observation in the sample a rescaled beta variable. Both approach $\\chi^2_d$ as $n$ grows.',
  ],

  references: [
    { text: 'Wikipedia: Mahalanobis distance.', url: 'https://en.wikipedia.org/wiki/Mahalanobis_distance' },
    { text: 'Wikipedia: Multivariate normal distribution, interval (geometric interpretation).', url: 'https://en.wikipedia.org/wiki/Multivariate_normal_distribution#Interval' },
    { text: 'Johnson, R. A., & Wichern, D. W. (2007). <i>Applied Multivariate Statistical Analysis</i> (6th ed.), Result 4.7. Pearson.' },
    { text: 'Mahalanobis, P. C. (1936). On the generalized distance in statistics. <i>Proceedings of the National Institute of Sciences of India</i>, 2(1), 49–55.' },
    { text: 'Anderson, T. W. (2003). <i>An Introduction to Multivariate Statistical Analysis</i> (3rd ed.), Section 3.3. Wiley.' },
  ],

  demo(container, ctx) {
    const { ui, plot, demos } = ctx;
    const { h } = ui;
    if (!document.getElementById('pd-style-mc')) document.head.append(h('style', { id: 'pd-style-mc' }, STYLE));
    container.classList.add('pd-mc');
    let buf = [];
    let scat = null, side = null, row = null;
    const out = demos.simulationDemo(container, null, {
      intro: 'Each simulated value is the squared Mahalanobis distance $D_M^2$ of one draw from a $d$-dimensional normal distribution with mean $\\mathbf 0$, standard deviations $1, 2, 0.6, 1.5, \\dots$ (one per variable) and the same correlation $\\rho$ between every pair of variables. The histogram is compared with the $\\chi^2_d$ density. Change $d$ and $\\rho$: the distribution of $D_M^2$ depends only on $d$.',
      params: [
        { key: 'd', sym: 'd', name: 'dimension', meaning: 'The number of variables.', min: 1, max: 10, default: 2, integer: true },
        { key: 'rho', sym: '\\rho', name: 'pairwise correlation', meaning: 'The correlation of every pair of variables (equal correlations).', min: 0, max: 0.95, default: 0.7, step: 0.01 },
      ],
      sample: (rng, p) => {
        const r = draw(rng, p.d, p.d === 1 ? 0 : p.rho);
        buf.push(r);
        if (buf.length > 60000) buf = buf.slice(-30000);
        return r.D2;
      },
      sampleName: 'simulated squared Mahalanobis distances',
      target: { name: p => `chi-squared density with ${p.d} df`, pdf: (x, p) => chi2Pdf(x, p.d), cdf: (x, p) => chi2Cdf(x, p.d) },
      range: p => [0, Math.max(8, p.d + 5.5 * Math.sqrt(2 * p.d) + 2)],
      xLabel: 'D²  (squared Mahalanobis distance)',
      readout: (p, s) => {
        const q = chi2Q(p.d, 0.95);
        const xs = buf.slice(-s.n);
        const outM = xs.filter(r => r.D2 > q).length / xs.length;
        const outE = xs.filter(r => r.e2 > q).length / xs.length;
        const head = `Above the $\\chi^2_{${p.d}}$ 95% point ${f3(q)}: <b>${f3(outM * 100)}%</b> of the squared Mahalanobis distances (about 5% expected). `;
        if (p.d === 1) return head + 'With $d = 1$ and standard deviation 1, the squared Mahalanobis distance is just the squared distance $x_1^2$, a squared standard normal.';
        return head + `Using the plain squared distance $\\lVert \\mathbf x \\rVert^2$ with the same cutoff would flag <b>${f3(outE * 100)}%</b> of the points, because it ignores the variances and correlations.`;
      },
      onUpdate: (p, s) => drawScatter(p, s),
    });
    const box = h('div');
    side = h('div', { class: 'mc-side' });
    row = h('div', { class: 'mc-row' }, h('figure', { class: 'plot-fig' }, ui.rich('figcaption', 'First two coordinates of the draws'), box), side);
    container.insertBefore(row, container.querySelector('.demo-grid'));
    scat = new plot.Plot(box, { xLabel: 'x₁', yLabel: 'x₂', equalAspect: true, height: w => Math.max(240, Math.min(400, w * 0.85)), ariaLabel: 'Scatter of the first two coordinates' });

    function drawScatter(p, s) {
      if (!scat) return;
      row.style.display = p.d >= 2 ? '' : 'none';
      if (p.d < 2) return;
      const q = chi2Q(p.d, 0.95);
      const xs = buf.slice(-s.n).slice(0, 500);
      const layers = [];
      if (p.d === 2) {
        // 95% ellipse: x = sqrt(q) L (cos t, sin t), with L the Cholesky factor of [[s1^2, rho s1 s2], [rho s1 s2, s2^2]]
        const [s1, s2] = SCALES, k = Math.sqrt(q);
        layers.push({ id: 'ell', type: 'polygon', cls: 'mc-ell', points: Array.from({ length: 121 }, (_, i) => { const t = 2 * Math.PI * i / 120; return [k * s1 * Math.cos(t), k * s2 * (p.rho * Math.cos(t) + Math.sqrt(1 - p.rho * p.rho) * Math.sin(t))]; }) });
      }
      if (p.d === 2) layers.push({ id: 'circ', type: 'polygon', cls: 'mc-circ', points: Array.from({ length: 121 }, (_, i) => { const t = 2 * Math.PI * i / 120, r = Math.sqrt(q); return [r * Math.cos(t), r * Math.sin(t)]; }) });
      xs.forEach((r, i) => layers.push({ id: 'p' + i, type: 'dot', x: r.x[0], y: r.x[1], r: r.D2 > q ? 2.6 : 1.8, cls: r.D2 > q ? 'mc-out' : 'mc-pt' }));
      scat.render({ x: [-7, 7], y: [-7, 7], layers });
      ui.renderRich(side, `<p>The first 500 draws, showing only $x_1$ and $x_2$. Amber points have $D_M^2$ above the $\\chi^2_{${p.d}}$ 95% point, so about 5% of them are amber.</p>`
        + (p.d === 2
          ? '<p>With $d = 2$ the amber points are exactly those outside the amber ellipse $D_M^2 = \\chi^2_{2, 0.95}$, which follows the shape of the cloud. The dashed circle uses the same cutoff for the plain distance $\\lVert \\mathbf x \\rVert$; it cuts through the cloud and misjudges which points are unusual.</p>'
          : `<p>With $d = ${p.d}$ the distance also uses the other ${p.d - 2} coordinate${p.d > 3 ? 's' : ''}, so some amber points lie inside the cloud of this two-dimensional view.</p>`));
    }
    out.redraw();
  },
};
