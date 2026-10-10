// Dirichlet <-> Beta: each coordinate of a Dirichlet vector is beta distributed, and with K = 2 categories the
// Dirichlet is the beta distribution. Two views: a simulation of one coordinate of Dir(alpha1, alpha2, alpha3)
// against Beta(alpha_j, alpha0 - alpha_j) (ctx.demos.simulationDemo), and the K = 2 special case, where the
// Dirichlet density of X1 (normalized with gamma functions and integrated numerically) coincides with the
// Beta density and CDF (ctx.demos.compareDemo).

import { getRelation } from '../catalog.js';
import { betaI, lbeta, lgamma, integrate } from '../core/math.js';

const REL = getRelation('dirichlet--beta');
const f3 = v => String(Number(Number(v).toPrecision(3)));

const betaPdf = (x, a, b) => (x <= 0 || x >= 1 ? 0 : Math.exp((a - 1) * Math.log(x) + (b - 1) * Math.log1p(-x) - lbeta(a, b)));
/** Density of X1 for (X1, 1 - X1) ~ Dir(a1, a2), written with the Dirichlet normalizing constant. */
const dir2Pdf = (x, a1, a2) => (x <= 0 || x >= 1 ? 0 : Math.exp(lgamma(a1 + a2) - lgamma(a1) - lgamma(a2) + (a1 - 1) * Math.log(x) + (a2 - 1) * Math.log(1 - x)));

export default {
  id: 'dirichlet--beta',
  from: 'dirichlet',
  to: 'beta',
  title: 'Each coordinate of a Dirichlet vector is beta distributed, and the Dirichlet with two categories is the beta distribution',

  plain: [
    'A Dirichlet vector $(X_1, \\dots, X_K)$ is a random list of probabilities that add up to 1. Pick one category $j$ and lump all the other categories together. The probability of category $j$ then follows a beta distribution, $X_j \\sim \\mathrm{Beta}(\\alpha_j, \\alpha_0 - \\alpha_j)$: its first parameter is the concentration of category $j$, and its second is the total concentration of all the other categories.',
    'With only two categories nothing needs to be lumped. The vector is $(X_1, 1 - X_1)$, it is determined by $X_1$ alone, and $X_1 \\sim \\mathrm{Beta}(\\alpha_1, \\alpha_2)$. So the beta distribution, the usual prior for a single probability, is the $K = 2$ case of the Dirichlet, and conversely the Dirichlet is the generalization of the beta distribution to more than two categories.',
  ],

  statementTex: REL.statement,
  glossary: [
    { sym: '\\mathbf X \\sim \\mathrm{Dir}(\\alpha_1, \\dots, \\alpha_K)', meaning: 'A random probability vector $(X_1, \\dots, X_K)$ with a Dirichlet distribution.' },
    { sym: '\\alpha_j', meaning: 'The concentration of category $j$, a positive number that acts like a prior count.' },
    { sym: '\\alpha_0 = \\textstyle\\sum_j \\alpha_j', meaning: 'The total concentration.' },
    { sym: 'X_j', meaning: 'The $j$-th coordinate: the probability of category $j$.' },
    { sym: '\\mathrm{Beta}(a, b)', meaning: 'The beta distribution on $(0, 1)$ with shape parameters $a$ and $b$ and mean $a/(a + b)$.' },
    { sym: 'K', meaning: 'The number of categories.' },
    { sym: '\\iff', meaning: 'If and only if: each statement implies the other.' },
    { sym: '\\Rightarrow', meaning: 'Implies.' },
  ],

  why: [
    '<b>Two categories.</b> For $K = 2$ the Dirichlet density, written in the free coordinate $x_1$ (with $x_2 = 1 - x_1$), is',
    { tex: 'f(x_1) = \\frac{\\Gamma(\\alpha_1 + \\alpha_2)}{\\Gamma(\\alpha_1)\\Gamma(\\alpha_2)}\\, x_1^{\\alpha_1 - 1} (1 - x_1)^{\\alpha_2 - 1} = \\frac{x_1^{\\alpha_1 - 1}(1 - x_1)^{\\alpha_2 - 1}}{B(\\alpha_1, \\alpha_2)},' },
    'which is the $\\mathrm{Beta}(\\alpha_1, \\alpha_2)$ density, because the beta function is $B(a, b) = \\Gamma(a)\\Gamma(b)/\\Gamma(a + b)$. Here $\\Gamma$ is the gamma function.',
    '<b>Any number of categories.</b> The cleanest argument uses the gamma construction. Take independent $Y_i \\sim \\mathrm{Gamma}(\\alpha_i, 1)$ and set $X_i = Y_i/\\sum_k Y_k$; then $\\mathbf X \\sim \\mathrm{Dir}(\\boldsymbol\\alpha)$. The sum of the other gammas, $W = \\sum_{i \\ne j} Y_i$, is $\\mathrm{Gamma}(\\alpha_0 - \\alpha_j, 1)$ because gamma variables with the same rate add up, and it is independent of $Y_j$. So',
    { tex: 'X_j = \\frac{Y_j}{Y_j + W}, \\qquad Y_j \\sim \\mathrm{Gamma}(\\alpha_j, 1),\\ W \\sim \\mathrm{Gamma}(\\alpha_0 - \\alpha_j, 1) \\text{ independent},' },
    'and the ratio $Y/(Y + W)$ of two independent gammas with a common rate is $\\mathrm{Beta}(\\alpha_j, \\alpha_0 - \\alpha_j)$. The same argument shows the aggregation property: merging any group of categories adds their concentrations, and the result is again Dirichlet. The beta marginal gives the mean $\\alpha_j/\\alpha_0$ and variance $\\alpha_j(\\alpha_0 - \\alpha_j)/(\\alpha_0^2(\\alpha_0 + 1))$ of each coordinate.',
  ],

  references: [
    { text: 'Wikipedia: Dirichlet distribution, marginal distributions and aggregation.', url: 'https://en.wikipedia.org/wiki/Dirichlet_distribution#Marginal_distributions' },
    { text: 'Kotz, S., Balakrishnan, N., & Johnson, N. L. (2000). <i>Continuous Multivariate Distributions</i>, Vol. 1 (2nd ed.), Chapter 49. Wiley.' },
    { text: 'Gelman, A., Carlin, J. B., Stern, H. S., Dunson, D. B., Vehtari, A., & Rubin, D. B. (2013). <i>Bayesian Data Analysis</i> (3rd ed.), Appendix A. CRC Press.', url: 'http://www.stat.columbia.edu/~gelman/book/' },
    { text: 'Frigyik, B. A., Kapila, A., & Gupta, M. R. (2010). Introduction to the Dirichlet distribution and related processes. Technical report UWEETR-2010-0006, University of Washington.' },
  ],

  demo(container, ctx) {
    const { ui, demos } = ctx;
    const { h } = ui;
    const viewA = h('div'), viewB = h('div', { hidden: true });
    let builtB = false;
    const seg = ui.segmented([
      { value: 'margin', label: 'One coordinate of a Dirichlet (K = 3)' },
      { value: 'two', label: 'Two categories (K = 2)' },
    ], 'margin', v => {
      viewA.hidden = v !== 'margin'; viewB.hidden = v !== 'two';
      if (v === 'two' && !builtB) { builtB = true; buildTwo(viewB, demos, ui); }
    }, 'Which direction of the relationship to show');
    container.append(h('div', { style: 'margin-bottom:1rem' }, seg.el), viewA, viewB);
    buildMargin(viewA, demos);
  },
};

const conc = (key, sym, j, def) => ({ key, sym, name: `concentration ${j}`, meaning: `The Dirichlet concentration of category ${j}.`, min: 0.2, max: 20, default: def, log: true });

function buildMargin(container, demos) {
  demos.simulationDemo(container, null, {
    intro: 'Each simulated value is one coordinate $X_j$ of a draw $(X_1, X_2, X_3) \\sim \\mathrm{Dir}(\\alpha_1, \\alpha_2, \\alpha_3)$; the other two coordinates are ignored. The histogram is compared with $\\mathrm{Beta}(\\alpha_j, \\alpha_0 - \\alpha_j)$. Change $j$ to look at another coordinate, or change the concentrations.',
    params: [
      conc('alpha1', '\\alpha_1', 1, 2), conc('alpha2', '\\alpha_2', 2, 3), conc('alpha3', '\\alpha_3', 3, 4),
      { key: 'j', sym: 'j', name: 'coordinate shown', meaning: 'Which coordinate of the Dirichlet vector is kept.', min: 1, max: 3, default: 1, integer: true },
    ],
    sample: (rng, p) => rng.dirichlet([p.alpha1, p.alpha2, p.alpha3])[p.j - 1],
    sampleName: 'simulated coordinate X_j of Dir(α₁, α₂, α₃)',
    target: {
      name: p => { const a = [p.alpha1, p.alpha2, p.alpha3], s = a[0] + a[1] + a[2], aj = a[p.j - 1]; return `Beta(${f3(aj)}, ${f3(s - aj)}) density`; },
      pdf: (x, p) => { const a = [p.alpha1, p.alpha2, p.alpha3], s = a[0] + a[1] + a[2], aj = a[p.j - 1]; return betaPdf(x, aj, s - aj); },
      cdf: (x, p) => { const a = [p.alpha1, p.alpha2, p.alpha3], s = a[0] + a[1] + a[2], aj = a[p.j - 1]; return x <= 0 ? 0 : x >= 1 ? 1 : betaI(x, aj, s - aj); },
    },
    range: () => [0, 1],
    xLabel: 'x_j (probability of category j)',
    readout: p => {
      const a = [p.alpha1, p.alpha2, p.alpha3], s = a[0] + a[1] + a[2], aj = a[p.j - 1];
      return `Beta mean $\\alpha_j/\\alpha_0$ = <b>${f3(aj / s)}</b>, standard deviation <b>${f3(Math.sqrt(aj * (s - aj) / (s * s * (s + 1))))}</b>.`;
    },
  });
}

function buildTwo(container, demos, ui) {
  let drag = null;
  demos.compareDemo(container, null, {
    intro: 'With two categories the Dirichlet vector is $(X_1, 1 - X_1)$. The solid curve is the density of $X_1$ computed from the Dirichlet formula $\\frac{\\Gamma(\\alpha_1 + \\alpha_2)}{\\Gamma(\\alpha_1)\\Gamma(\\alpha_2)} x^{\\alpha_1 - 1}(1 - x)^{\\alpha_2 - 1}$, and its CDF by numerical integration; the dashed curve is the $\\mathrm{Beta}(\\alpha_1, \\alpha_2)$ density with its own CDF. They coincide for every choice of the parameters, so the gap between the CDFs is only rounding error. Drag the amber marker at the mean, which keeps $\\alpha_1 + \\alpha_2$ fixed.',
    params: [conc('alpha1', '\\alpha_1', 1, 2), conc('alpha2', '\\alpha_2', 2, 5)],
    exact: {
      name: p => `Dirichlet(${f3(p.alpha1)}, ${f3(p.alpha2)}): density of X₁`,
      pdf: (x, p) => dir2Pdf(x, p.alpha1, p.alpha2),
      cdf: (x, p) => (x <= 0 ? 0 : x >= 1 ? 1 : integrate(t => dir2Pdf(t, p.alpha1, p.alpha2), 0, x, { tol: 1e-12 })),
    },
    approx: {
      name: p => `Beta(${f3(p.alpha1)}, ${f3(p.alpha2)})`,
      pdf: (x, p) => betaPdf(x, p.alpha1, p.alpha2),
      cdf: (x, p) => (x <= 0 ? 0 : x >= 1 ? 1 : betaI(x, p.alpha1, p.alpha2)),
    },
    range: () => [0, 1],
    xLabel: 'x₁ (probability of category 1)',
    handles: (p, set) => {
      const m = p.alpha1 / (p.alpha1 + p.alpha2);
      return [{
        id: 'mean', type: 'xPoint', x: m, label: 'mean',
        ariaLabel: 'Mean α₁/(α₁ + α₂). Drag to move it with α₁ + α₂ fixed, or use the arrow keys.', valueText: f3(m), valueNow: m, valueMin: 0, valueMax: 1,
        onDrag: (pt, phase) => {
          if (phase === 'start') drag = p.alpha1 + p.alpha2;
          if (pt && drag) { const mm = Math.min(0.98, Math.max(0.02, pt.x)); set({ alpha1: Number((mm * drag).toPrecision(3)), alpha2: Number(((1 - mm) * drag).toPrecision(3)) }); }
          if (phase === 'end') drag = null;
        },
        onKey: steps => { const s = p.alpha1 + p.alpha2, mm = Math.min(0.98, Math.max(0.02, m + 0.01 * steps)); set({ alpha1: Number((mm * s).toPrecision(3)), alpha2: Number(((1 - mm) * s).toPrecision(3)) }); },
      }];
    },
    readout: p => `Both have mean $\\alpha_1/(\\alpha_1 + \\alpha_2)$ = <b>${f3(p.alpha1 / (p.alpha1 + p.alpha2))}</b>. The second coordinate $X_2 = 1 - X_1$ is $\\mathrm{Beta}(\\alpha_2, \\alpha_1)$, the mirror image.`,
  });
}
