// Chi-squared <-> Gamma: chi^2_k = Gamma(k/2, rate 1/2); conversely 2 beta X ~ chi^2_{2 alpha} for X ~ Gamma(alpha, beta).
// The demo is self-contained: both densities are computed here with core/math.js.

import { getRelation } from '../catalog.js';
import { lgamma, gammaP, gammaPinv } from '../core/math.js';

const REL = getRelation('chi-squared--gamma');

/** Gamma(shape a, rate b) density, with the value at 0 handled for a <= 1 */
const gammaPdf = (x, a, b) => (x < 0 ? 0 : x === 0 ? (a < 1 ? Infinity : a === 1 ? b : 0)
  : Math.exp(a * Math.log(b) + (a - 1) * Math.log(x) - b * x - lgamma(a)));
const gammaCdf = (x, a, b) => (x <= 0 ? 0 : gammaP(a, b * x));
const gammaQ = (u, a, b) => gammaPinv(a, u) / b;
const f3 = v => String(Number(v.toPrecision(4)));

export default {
  id: 'chi-squared--gamma',
  from: 'chi-squared',
  to: 'gamma',
  title: 'The chi-squared distribution is a gamma distribution with shape k/2 and rate 1/2',

  summary: 'The chi-squared distribution with $k$ degrees of freedom is the gamma distribution with shape $k/2$ and rate $1/2$. Conversely, a gamma variable with shape $\\alpha$ and rate $\\beta$, multiplied by $2\\beta$, is chi-squared with $2\\alpha$ degrees of freedom.',

  plain: [
    'The chi-squared distribution with $k$ degrees of freedom is the gamma distribution with shape $\\alpha = k/2$ and rate $\\beta = 1/2$ (scale 2). The two density formulas are the same once these values are put in, so every fact about gamma distributions applies to chi-squared distributions.',
    'The relationship also works the other way. Any gamma variable $X$ with shape $\\alpha$ and rate $\\beta$ can be rescaled into a chi-squared variable: $2\\beta X$ has a chi-squared distribution with $2\\alpha$ degrees of freedom. Before computers, gamma probabilities were looked up in chi-squared tables this way, and the same rescaling gives exact confidence intervals for a Poisson mean or an exponential rate.',
  ],

  statementTex: REL.statement,
  glossary: [
    { sym: '\\chi^2_k', meaning: 'The chi-squared distribution with $k$ degrees of freedom, the distribution of a sum of $k$ squared independent standard normal variables.' },
    { sym: 'k', meaning: 'The degrees of freedom. As a gamma shape, $k/2$ may be any positive half-integer; the converse statement allows any positive real number of degrees of freedom.' },
    { sym: '\\mathrm{Gamma}(\\alpha, \\beta)', meaning: 'The gamma distribution with shape $\\alpha$ and rate $\\beta$: density $\\beta^\\alpha x^{\\alpha-1} e^{-\\beta x}/\\Gamma(\\alpha)$, mean $\\alpha/\\beta$.' },
    { sym: '\\alpha', meaning: 'The gamma shape parameter.' },
    { sym: '\\beta', meaning: 'The gamma rate parameter (one over the scale).' },
    { sym: '(\\text{rate})', meaning: 'A reminder that $\\beta$ is a rate, not a scale; in the scale form the statement reads $\\chi^2_k = \\mathrm{Gamma}(\\text{shape } k/2, \\text{ scale } 2)$.' },
    { sym: 'X \\sim \\mathrm{Gamma}(\\alpha, \\beta)', meaning: '$X$ is a gamma-distributed variable.' },
    { sym: '2\\beta X', meaning: 'The gamma variable multiplied by $2\\beta$. Multiplying by $\\beta$ turns it into a $\\mathrm{Gamma}(\\alpha, 1)$ variable, and doubling turns that into rate $1/2$.' },
    { sym: '\\chi^2_{2\\alpha}', meaning: 'Chi-squared with $2\\alpha$ degrees of freedom.' },
  ],

  why: [
    'Put $\\alpha = k/2$ and $\\beta = 1/2$ into the gamma density:',
    { tex: '\\frac{\\beta^\\alpha}{\\Gamma(\\alpha)} x^{\\alpha - 1} e^{-\\beta x} = \\frac{(1/2)^{k/2}}{\\Gamma(k/2)}\\, x^{k/2 - 1} e^{-x/2} = \\frac{1}{2^{k/2}\\Gamma(k/2)}\\, x^{k/2 - 1} e^{-x/2},' },
    'which is the chi-squared density. Their moment-generating functions agree too: $(1 - t/\\beta)^{-\\alpha} = (1 - 2t)^{-k/2}$.',
    'For the converse, gamma distributions are closed under rescaling: if $X \\sim \\mathrm{Gamma}(\\alpha, \\beta)$ then $cX \\sim \\mathrm{Gamma}(\\alpha, \\beta/c)$ for any $c > 0$ (stretching the axis by $c$ divides the rate by $c$). With $c = 2\\beta$ the rate becomes $1/2$, so $2\\beta X \\sim \\mathrm{Gamma}(\\alpha, \\tfrac12) = \\chi^2_{2\\alpha}$.',
    'Two consequences: a sum of $n$ independent exponential waiting times with rate $\\lambda$ is $\\mathrm{Gamma}(n, \\lambda)$, so $2\\lambda \\sum X_i \\sim \\chi^2_{2n}$, which gives an exact confidence interval for $\\lambda$; and $\\chi^2_2 = \\mathrm{Gamma}(1, \\tfrac12)$ is the exponential distribution with mean 2.',
  ],

  references: [
    { text: 'Wikipedia: Gamma distribution, related distributions.', url: 'https://en.wikipedia.org/wiki/Gamma_distribution#Related_distributions' },
    { text: 'Wikipedia: Chi-squared distribution, relation to other distributions.', url: 'https://en.wikipedia.org/wiki/Chi-squared_distribution#Relation_to_other_distributions' },
    { text: 'Casella, G., & Berger, R. L. (2002). <i>Statistical Inference</i> (2nd ed.), Section 3.3 (gamma family). Duxbury.' },
    { text: 'Johnson, N. L., Kotz, S., & Balakrishnan, N. (1994). <i>Continuous Univariate Distributions</i>, Vol. 1 (2nd ed.), Chapters 17–18. Wiley.' },
    { text: 'Leemis, L. M., & McQueston, J. T. (2008). Univariate distribution relationships. <i>The American Statistician</i>, 62(1), 45–53.', url: 'https://doi.org/10.1198/000313008X270448' },
  ],

  demo(container, ctx) {
    const { ui } = ctx;
    const { h } = ui;
    const boxes = { special: h('div'), rescale: h('div', { hidden: true }) };
    const built = {};
    const show = v => {
      for (const k in boxes) boxes[k].hidden = k !== v;
      if (!built[v]) { built[v] = true; (v === 'special' ? specialDemo : rescaleDemo)(boxes[v], ctx); }
    };
    const seg = ui.segmented([
      { value: 'special', label: 'χ²ₖ = Gamma(k/2, 1/2)' },
      { value: 'rescale', label: 'Gamma → χ² by rescaling' },
    ], 'special', show, 'Which direction of the relationship to show');
    container.append(h('div', { style: 'margin-bottom:.6rem' }, seg.el), boxes.special, boxes.rescale);
    show('special');
  },
};

function specialDemo(box, { demos, ui }) {
  const { h } = ui;
  const cmp = demos.compareDemo(box, null, {
    intro: 'The solid curve is the chi-squared density with $k$ degrees of freedom and the dashed curve a gamma density with shape $\\alpha$ and rate $\\beta$. They start out with $\\alpha = k/2$ and $\\beta = 1/2$, where the curves lie on top of each other and the CDF gap is 0. Change $\\alpha$ or $\\beta$ to pull them apart, change $k$, or press the button to make them coincide again.',
    params: [
      { key: 'k', sym: 'k', name: 'chi-squared degrees of freedom', meaning: 'Degrees of freedom of the chi-squared distribution.', min: 1, max: 30, default: 4, integer: true },
      { key: 'alpha', sym: '\\alpha', name: 'gamma shape', meaning: 'Shape of the gamma distribution; it matches when $\\alpha = k/2$.', min: 0.25, max: 15, default: 2, step: 0.25 },
      { key: 'beta', sym: '\\beta', name: 'gamma rate', meaning: 'Rate of the gamma distribution; it matches when $\\beta = 1/2$.', min: 0.1, max: 3, default: 0.5, step: 0.05 },
    ],
    exact: { name: ({ k }) => `Chi-squared, k = ${k}`, pdf: (x, { k }) => gammaPdf(x, k / 2, 0.5), cdf: (x, { k }) => gammaCdf(x, k / 2, 0.5) },
    approx: {
      name: ({ alpha, beta }) => `Gamma(α = ${ui.fmt(alpha, 3)}, β = ${ui.fmt(beta, 3)})`,
      pdf: (x, { alpha, beta }) => gammaPdf(x, alpha, beta), cdf: (x, { alpha, beta }) => gammaCdf(x, alpha, beta),
    },
    range: ({ k, alpha, beta }) => [0, Math.min(80, Math.max(gammaQ(0.997, k / 2, 0.5), gammaQ(0.997, alpha, beta)))],
    xLabel: 'x',
    readout: ({ k, alpha, beta }) => {
      const same = Math.abs(alpha - k / 2) < 1e-9 && Math.abs(beta - 0.5) < 1e-9;
      return same ? `Here $\\alpha = k/2$ = ${f3(k / 2)} and $\\beta = 1/2$, so the two distributions are identical (the gap is only rounding error).`
        : `They coincide only when $\\alpha = k/2$ = <b>${f3(k / 2)}</b> and $\\beta = 1/2$; now $\\alpha$ = ${f3(alpha)} and $\\beta$ = ${f3(beta)}.`;
    },
  });
  const btn = h('button', { type: 'button', class: 'btn small-btn' }, 'Set α = k/2 and β = 1/2');
  btn.addEventListener('click', () => { const { k } = cmp.store.get().p; cmp.set({ alpha: k / 2, beta: 0.5 }); });
  box.querySelector('.demo-controls').append(h('div', {}, btn));
}

function rescaleDemo(box, { demos }) {
  demos.simulationDemo(box, null, {
    intro: 'Each simulated value is $2\\beta X$, where $X$ is drawn from $\\mathrm{Gamma}(\\alpha, \\beta)$. The histogram is compared with the chi-squared density with $2\\alpha$ degrees of freedom. Changing $\\beta$ changes $X$ but not $2\\beta X$; non-integer values of $2\\alpha$ give chi-squared distributions with fractional degrees of freedom.',
    params: [
      { key: 'alpha', sym: '\\alpha', name: 'gamma shape', meaning: 'Shape of the gamma distribution; the result has $2\\alpha$ degrees of freedom.', min: 0.25, max: 15, default: 1.5, step: 0.25 },
      { key: 'beta', sym: '\\beta', name: 'gamma rate', meaning: 'Rate of the gamma distribution. It cancels after multiplying by $2\\beta$.', min: 0.1, max: 10, default: 3 },
    ],
    sample: (rng, { alpha, beta }) => 2 * beta * rng.gamma(alpha, beta),
    sampleName: '2βX for simulated gamma draws X',
    target: {
      name: ({ alpha }) => `chi-squared density, k = 2α = ${f3(2 * alpha)}`,
      pdf: (x, { alpha }) => gammaPdf(x, alpha, 0.5), cdf: (x, { alpha }) => gammaCdf(x, alpha, 0.5),
    },
    range: ({ alpha }) => [0, gammaQ(0.997, alpha, 0.5)],
    xLabel: '2βX',
    readout: ({ alpha, beta }) => `Before rescaling, $X$ has mean $\\alpha/\\beta$ = ${f3(alpha / beta)}; after rescaling the mean is $2\\alpha$ = <b>${f3(2 * alpha)}</b>, the chi-squared degrees of freedom.`,
  });
}
