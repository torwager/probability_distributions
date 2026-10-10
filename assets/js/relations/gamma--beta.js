// Gamma -> Beta: for independent X ~ Gamma(alpha, c) and Y ~ Gamma(beta, c) with the same rate c,
// X / (X + Y) ~ Beta(alpha, beta), independent of X + Y ~ Gamma(alpha + beta, c).
// Demo: ctx.demos.simulationDemo for the fraction, plus a scatter plot of (total, fraction) pairs that shows the
// independence part of the statement. The rate of Y can be set apart from the rate of X to show that the
// result needs equal rates. Self-contained: densities are computed with ctx.math.

import { getRelation } from '../catalog.js';
import { betaI, lbeta, makeRng } from '../core/math.js';

const REL = getRelation('gamma--beta');

const betaPdf = (x, a, b) => {
  if (x < 0 || x > 1) return 0;
  if (x === 0) return a < 1 ? Infinity : a === 1 ? Math.exp(-lbeta(a, b)) : 0;
  if (x === 1) return b < 1 ? Infinity : b === 1 ? Math.exp(-lbeta(a, b)) : 0;
  return Math.exp((a - 1) * Math.log(x) + (b - 1) * Math.log1p(-x) - lbeta(a, b));
};
const betaCdf = (x, a, b) => (x <= 0 ? 0 : x >= 1 ? 1 : betaI(x, a, b));

export default {
  id: 'gamma--beta',
  from: 'gamma',
  to: 'beta',
  title: 'The fraction X/(X + Y) of two independent gamma variables with the same rate is beta distributed',

  plain: [
    'Take two independent gamma variables $X$ and $Y$ with shapes $\\alpha$ and $\\beta$ and the <b>same</b> rate $c$, and ask what fraction of their total $X + Y$ comes from $X$. That fraction lies between 0 and 1, and it has a beta distribution with shapes $\\alpha$ and $\\beta$. The common rate does not matter: it only sets the units of $X$ and $Y$, and it cancels in the fraction.',
    'A waiting-time example, for whole numbers $\\alpha$ and $\\beta$: events arrive at random at rate $c$. The waiting time for the first $\\alpha$ events and the further waiting time for the next $\\beta$ events are independent gamma variables, so the fraction of the total waiting time spent on the first $\\alpha$ events is $\\mathrm{Beta}(\\alpha, \\beta)$. A second, less obvious part of the result is that this fraction is independent of the total $X + Y$, which is $\\mathrm{Gamma}(\\alpha + \\beta, c)$. Knowing how long the whole wait took tells you nothing about how it was split.',
    'Note the symbol clash: in this statement $\\beta$ is the gamma <b>shape</b> of $Y$ (and the second beta shape), not a gamma rate; the rate is written $c$. The same construction with $K$ gamma variables gives the Dirichlet distribution, and it is how beta and Dirichlet random numbers are usually generated.',
  ],

  statementTex: REL.statement,
  glossary: [
    { sym: 'X \\sim \\mathrm{Gamma}(\\alpha, c)', meaning: '$X$ has a gamma distribution with shape $\\alpha$ and rate $c$ (mean $\\alpha/c$).' },
    { sym: 'Y \\sim \\mathrm{Gamma}(\\beta, c)', meaning: '$Y$ has a gamma distribution with shape $\\beta$ and the same rate $c$.' },
    { sym: '\\alpha,\\ \\beta', meaning: 'The two gamma shapes, both positive. They become the two shapes of the beta distribution. Here $\\beta$ is a shape, not a rate.' },
    { sym: 'c', meaning: 'The common rate of $X$ and $Y$, a positive number. It must be the same for both; its value does not affect the fraction.' },
    { sym: '\\text{independent}', meaning: '$X$ and $Y$ do not influence each other: knowing one tells you nothing about the other.' },
    { sym: '\\frac{X}{X+Y}', meaning: 'The fraction of the total that comes from $X$, a number between 0 and 1.' },
    { sym: '\\mathrm{Beta}(\\alpha, \\beta)', meaning: 'The beta distribution on $(0, 1)$ with shapes $\\alpha$ and $\\beta$; its mean is $\\alpha/(\\alpha+\\beta)$.' },
    { sym: 'X + Y \\sim \\mathrm{Gamma}(\\alpha+\\beta, c)', meaning: 'The total is again gamma, with the shapes added and the same rate.' },
    { sym: '\\Rightarrow', meaning: 'Implies: if the conditions on the left hold, the conclusion on the right follows.' },
  ],

  why: [
    'Write the joint density of the independent pair as the product of the two gamma densities:',
    { tex: 'f(x, y) = \\frac{c^{\\alpha}}{\\Gamma(\\alpha)} x^{\\alpha-1} e^{-cx} \\cdot \\frac{c^{\\beta}}{\\Gamma(\\beta)} y^{\\beta-1} e^{-cy}, \\qquad x, y > 0.' },
    'Change variables to the total $S = X + Y$ and the fraction $B = X/(X+Y)$. Going back, $x = bs$ and $y = (1-b)s$, and the Jacobian of this change (the factor by which areas are stretched) is $s$. Substituting gives',
    { tex: 'f(b, s) = \\underbrace{\\frac{b^{\\alpha-1}(1-b)^{\\beta-1}}{B(\\alpha, \\beta)}}_{\\mathrm{Beta}(\\alpha,\\ \\beta) \\text{ density}} \\; \\cdot \\; \\underbrace{\\frac{c^{\\alpha+\\beta}}{\\Gamma(\\alpha+\\beta)} s^{\\alpha+\\beta-1} e^{-cs}}_{\\mathrm{Gamma}(\\alpha+\\beta,\\ c) \\text{ density}},' },
    'where $B(\\alpha, \\beta) = \\Gamma(\\alpha)\\Gamma(\\beta)/\\Gamma(\\alpha+\\beta)$ is the beta function. The joint density splits into a function of $b$ alone times a function of $s$ alone, which means that $B$ and $S$ are independent, with exactly the beta and gamma distributions in the statement. The key step is that the exponential factors combine into $e^{-c(x+y)} = e^{-cs}$, which depends only on the total; with two different rates this fails, and the fraction is then neither beta distributed nor independent of the total.',
    'The rate cancels because multiplying both $X$ and $Y$ by the same constant leaves $X/(X+Y)$ unchanged. Lukacs (1955) showed the converse: if $X$ and $Y$ are independent positive variables and $X/(X+Y)$ is independent of $X+Y$, then $X$ and $Y$ must be gamma with the same rate.',
    'Two consequences. The mean of the fraction is $\\alpha/(\\alpha+\\beta)$, the share of the total shape contributed by $X$. And applying the same argument to $K$ independent gammas $Y_1, \\dots, Y_K$ with a common rate shows that the vector of fractions $Y_j/\\sum_i Y_i$ is Dirichlet distributed, which is the standard way to simulate beta and Dirichlet random numbers.',
  ],

  references: [
    { text: 'Wikipedia: Beta distribution, derived from other distributions.', url: 'https://en.wikipedia.org/wiki/Beta_distribution#Derived_from_other_distributions' },
    { text: 'Wikipedia: Gamma distribution, related distributions.', url: 'https://en.wikipedia.org/wiki/Gamma_distribution#Related_distributions' },
    { text: 'Casella, G., & Berger, R. L. (2002). <i>Statistical Inference</i> (2nd ed.), Section 4.3 (bivariate transformations). Duxbury.' },
    { text: 'Lukacs, E. (1955). A characterization of the gamma distribution. <i>Annals of Mathematical Statistics</i>, 26(2), 319–324.', url: 'https://doi.org/10.1214/aoms/1177728549' },
    { text: 'Leemis, L. M., & McQueston, J. T. (2008). Univariate distribution relationships. <i>The American Statistician</i>, 62(1), 45–53.', url: 'https://doi.org/10.1198/000313008X270448' },
  ],

  demo(container, { demos, plot, ui, math }) {
    const { h } = ui;
    let sim = null;
    const scatterBox = h('div');
    const scatterRead = h('p', { class: 'demo-readout', 'aria-live': 'polite' });
    let S = null;

    sim = demos.simulationDemo(container, null, {
      intro: 'Each simulated value is the fraction $X/(X+Y)$ for a fresh pair of independent gamma numbers, $X$ with shape $\\alpha$ and rate $c$ and $Y$ with shape $\\beta$ and rate $d$. When $d = c$ the histogram follows the $\\mathrm{Beta}(\\alpha, \\beta)$ density whatever the common rate is. Set $d$ different from $c$ to see the result fail. The scatter plot below shows the independence of the fraction and the total.',
      params: [
        { key: 'alpha', sym: '\\alpha', name: 'shape of X', meaning: 'The gamma shape of $X$; it becomes the first beta shape.', min: 0.2, max: 12, default: 2, step: 0.1, log: false },
        { key: 'beta', sym: '\\beta', name: 'shape of Y', meaning: 'The gamma shape of $Y$; it becomes the second beta shape. Here $\\beta$ is a shape, not a rate.', min: 0.2, max: 12, default: 4, step: 0.1, log: false },
        { key: 'c', sym: 'c', name: 'rate of X', meaning: 'The gamma rate of $X$. Changing it changes the units of $X$, but not the fraction, as long as $Y$ has the same rate.', min: 0.2, max: 5, default: 1, step: 0.1 },
        { key: 'd', sym: 'd', name: 'rate of Y', meaning: 'The gamma rate of $Y$. The statement needs $d = c$.', min: 0.2, max: 5, default: 1, step: 0.1 },
      ],
      sample: (rng, { alpha, beta, c, d }) => { const x = rng.gamma(alpha, c), y = rng.gamma(beta, d); return x / (x + y); },
      sampleName: 'fractions X/(X + Y)',
      target: {
        name: ({ alpha, beta }) => `Beta(α = ${ui.fmt(alpha, 3)}, β = ${ui.fmt(beta, 3)}) density`,
        pdf: (x, { alpha, beta }) => betaPdf(x, alpha, beta),
        cdf: (x, { alpha, beta }) => betaCdf(x, alpha, beta),
      },
      range: () => [0, 1],
      xLabel: 'fraction X/(X + Y)',
      readout: ({ alpha, beta, c, d }) => `Beta mean $\\alpha/(\\alpha+\\beta)$ = <b>${ui.fmt(alpha / (alpha + beta), 4)}</b>, standard deviation <b>${ui.fmt(Math.sqrt(alpha * beta / ((alpha + beta) ** 2 * (alpha + beta + 1))), 4)}</b>. `
        + (Math.abs(c - d) < 1e-9 ? 'The two rates are equal, so the statement applies.' : `The rates differ ($c$ = ${ui.fmt(c, 3)}, $d$ = ${ui.fmt(d, 3)}), so the statement does not apply: the fractions are pushed toward ${c < d ? '1' : '0'}, the side of the variable with the smaller rate (larger values).`),
      onUpdate: p => drawScatter(p),
    });

    container.append(
      h('figure', { class: 'plot-fig', style: 'margin-top:1.4rem' },
        ui.rich('figcaption', 'Independence: each dot is one simulated pair, with the total $X + Y$ across and the fraction $X/(X+Y)$ up. The dotted line is the beta mean $\\alpha/(\\alpha+\\beta)$.'), scatterBox),
      scatterRead);
    S = new plot.Plot(scatterBox, { xLabel: 'total X + Y', yLabel: 'fraction X/(X + Y)', height: w => math.clamp(w * 0.42, 230, 340) });
    drawScatter(sim.store.get().p);

    function drawScatter(p) {
      if (!S) return;
      const seed = sim ? sim.store.get().seed : 1;
      const rng = makeRng(5000 + seed);
      const N = 500, M = 4000;
      const pts = [];
      let sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0;
      for (let i = 0; i < M; i++) {
        const x = rng.gamma(p.alpha, p.c), y = rng.gamma(p.beta, p.d), s = x + y, b = x / s;
        if (i < N) pts.push([s, b]);
        sx += s; sy += b; sxx += s * s; syy += b * b; sxy += s * b;
      }
      const cov = sxy / M - (sx / M) * (sy / M);
      const r = cov / Math.sqrt((sxx / M - (sx / M) ** 2) * (syy / M - (sy / M) ** 2));
      const sorted = pts.map(q => q[0]).sort((a, b) => a - b);
      const xmax = sorted[Math.floor(0.99 * (N - 1))] * 1.05;
      const m = p.alpha / (p.alpha + p.beta);
      S.render({
        x: [0, xmax], y: [0, 1],
        layers: [
          { id: 'mean', type: 'hline', y: m, cls: 'mean-line' },
          ...pts.map(([s, b], i) => ({ id: 'p' + i, type: 'dot', x: s, y: b, r: 2.3, cls: 'scatter-dot' })),
        ],
      });
      ui.renderRich(scatterRead, `Correlation between the total and the fraction in ${M.toLocaleString('en-US')} simulated pairs: <b>${ui.fmt(r, 2)}</b>. `
        + (Math.abs(p.c - p.d) < 1e-9
          ? `With equal rates the cloud has the same vertical spread at every total, and the correlation is close to 0 (values within about ±${ui.fmt(2 / Math.sqrt(M), 1)} arise by chance).`
          : 'With different rates the fraction depends on the total: large totals come mostly from the variable with the smaller rate.'));
    }
  },
};
