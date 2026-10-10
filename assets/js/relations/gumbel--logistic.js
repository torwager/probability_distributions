// Gumbel -> Logistic: the difference of two independent Gumbel variables with the same scale is logistic.
// The demo has two parts:
//  1. a simulation (ctx.demos.simulationDemo) of G1 - G2 against Logistic(mu1 - mu2, beta);
//  2. the choice interpretation: P(G1 > G2) as a function of the utility difference mu1 - mu2, which is the
//     logistic curve (logit choice rule), with simulated choice proportions and the probit curve that normal
//     noise of the same variance would give (Thurstone). The amber marker sets mu1 - mu2.
// Self-contained: densities and CDFs are computed here.

import { getRelation } from '../catalog.js';
import { makeRng, normalCdf, PI } from '../core/math.js';

const REL = getRelation('gumbel--logistic');

const sigmoid = z => (z >= 0 ? 1 / (1 + Math.exp(-z)) : Math.exp(z) / (1 + Math.exp(z)));
const logisticPdf = (x, m, s) => { const e = Math.exp(-Math.abs(x - m) / s); return e / (s * (1 + e) * (1 + e)); };
const f4 = v => String(Number(v.toPrecision(4))).replace(/^-/, '−');

const PARAMS = [
  { key: 'mu1', sym: '\\mu_1', name: 'location of G₁', meaning: 'Location (mode) of the first Gumbel variable; in a choice model, the value of option 1.', min: -10, max: 10, default: 1 },
  { key: 'mu2', sym: '\\mu_2', name: 'location of G₂', meaning: 'Location (mode) of the second Gumbel variable; in a choice model, the value of option 2.', min: -10, max: 10, default: 0 },
  { key: 'beta', sym: '\\beta', name: 'common scale', meaning: 'The scale shared by both Gumbel variables, which becomes the scale of the logistic difference. In a choice model it is the softmax temperature.', min: 0.1, max: 5, default: 1 },
];

export default {
  id: 'gumbel--logistic',
  from: 'gumbel',
  to: 'logistic',
  title: 'The difference of two independent Gumbel variables with the same scale is logistic',

  plain: [
    'Let $G_1$ and $G_2$ be independent Gumbel (maximum type) variables with locations $\\mu_1$ and $\\mu_2$ and the same scale $\\beta$. Their difference $G_1 - G_2$ has a logistic distribution centered at $\\mu_1 - \\mu_2$ with scale $\\beta$. Each Gumbel is skewed to the right, but the two skews cancel in the difference, which is symmetric.',
    'This fact is the basis of the logit model of choice. Suppose a person chooses between two options whose values $v_1$ and $v_2$ are each disturbed by independent Gumbel noise, and the option with the larger noisy value is chosen. Option 1 is chosen when $G_1 > G_2$, and the probability of that is the logistic function $1/(1 + e^{-(v_1 - v_2)/\\beta})$ of the value difference. With more than two options the same assumption gives the softmax rule.',
    'The scales must be equal; with different scales the difference is not logistic. The sum $G_1 + G_2$ is not logistic either.',
  ],

  statementTex: REL.statement,
  glossary: [
    { sym: 'G_1, G_2', meaning: 'Two independent random variables, for example the noisy values of two options.' },
    { sym: '\\mathrm{Gumbel}(\\mu, \\beta)', meaning: 'The Gumbel (maximum type) distribution with location (mode) $\\mu$ and scale $\\beta$, CDF $\\exp(-e^{-(x-\\mu)/\\beta})$.' },
    { sym: '\\mu_1, \\mu_2', meaning: 'The locations (modes) of $G_1$ and $G_2$. They can differ.' },
    { sym: '\\beta', meaning: 'The common scale of both Gumbel variables, and the scale of the resulting logistic distribution.' },
    { sym: '\\text{independent}', meaning: 'The value of one variable carries no information about the other.' },
    { sym: '\\Rightarrow', meaning: 'Implies.' },
    { sym: 'G_1 - G_2', meaning: 'The difference of the two variables.' },
    { sym: '\\mathrm{Logistic}(\\mu_1 - \\mu_2,\\ \\beta)', meaning: 'The logistic distribution centered at $\\mu_1 - \\mu_2$ with scale $\\beta$: CDF $1/(1 + e^{-(x - (\\mu_1 - \\mu_2))/\\beta})$, standard deviation $\\beta\\pi/\\sqrt3$.' },
  ],

  why: [
    'Write $G_i = \\mu_i + \\beta E_i$, where $E_1$ and $E_2$ are independent standard Gumbel variables with CDF $F(x) = \\exp(-e^{-x})$ and density $f(x) = e^{-x}\\exp(-e^{-x})$. Then $G_1 - G_2 = (\\mu_1 - \\mu_2) + \\beta(E_1 - E_2)$, so it is enough to show that $E_1 - E_2$ is standard logistic. Conditioning on $E_2 = g$,',
    { tex: 'P(E_1 - E_2 \\le x) = \\int_{-\\infty}^{\\infty} \\exp\\!\\left(-e^{-(x+g)}\\right) e^{-g}\\exp\\!\\left(-e^{-g}\\right) dg = \\int_0^\\infty e^{-u(1 + e^{-x})}\\,du = \\frac{1}{1 + e^{-x}},' },
    'using the substitution $u = e^{-g}$. The result is the standard logistic CDF.',
    'Moment generating functions give the same answer. A $\\mathrm{Gumbel}(\\mu, \\beta)$ variable has $M(t) = \\Gamma(1 - \\beta t)e^{\\mu t}$, so the difference has $M(t) = \\Gamma(1 - \\beta t)\\,\\Gamma(1 + \\beta t)\\,e^{(\\mu_1 - \\mu_2)t}$. By Euler’s reflection formula, $\\Gamma(1 - z)\\Gamma(1 + z) = \\pi z/\\sin(\\pi z)$, which is the moment generating function of the logistic distribution with scale $\\beta$. The variances also agree: $2 \\cdot \\pi^2\\beta^2/6 = \\pi^2\\beta^2/3$.',
    'In a random-utility model, the noisy values are $U_j = v_j + \\varepsilon_j$ with independent $\\varepsilon_j \\sim \\mathrm{Gumbel}(0, \\beta)$. Option 1 is chosen when $U_1 > U_2$, that is, when $\\varepsilon_2 - \\varepsilon_1 < v_1 - v_2$. Since $\\varepsilon_2 - \\varepsilon_1$ is $\\mathrm{Logistic}(0, \\beta)$,',
    { tex: 'P(\\text{choose 1}) = \\frac{1}{1 + e^{-(v_1 - v_2)/\\beta}} = \\frac{e^{v_1/\\beta}}{e^{v_1/\\beta} + e^{v_2/\\beta}}.' },
    'This is the two-option softmax (Luce) rule. Thurstone’s earlier model used normal noise instead, which gives the probit curve $\\Phi\\big((v_1 - v_2)/(\\sqrt{2}\\,\\sigma)\\big)$ for noise standard deviation $\\sigma$; the two curves are very close, as the choice plot in the demonstration above shows. Yellott (1977) showed that, when every option gets independent noise of the same shape, Gumbel noise is the only kind that reproduces Luce’s choice rule for choice sets of every size (three or more options).',
  ],

  references: [
    { text: 'Wikipedia: Gumbel distribution, related distributions.', url: 'https://en.wikipedia.org/wiki/Gumbel_distribution#Related_distributions' },
    { text: 'Wikipedia: Logistic distribution, related distributions.', url: 'https://en.wikipedia.org/wiki/Logistic_distribution#Related_distributions' },
    { text: 'Train, K. E. (2009). <i>Discrete Choice Methods with Simulation</i> (2nd ed.), Chapter 3. Cambridge University Press.', url: 'https://eml.berkeley.edu/books/choice2.html' },
    { text: 'McFadden, D. (1974). Conditional logit analysis of qualitative choice behavior. In P. Zarembka (Ed.), <i>Frontiers in Econometrics</i> (pp. 105–142). Academic Press.' },
    { text: 'Yellott, J. I. (1977). The relationship between Luce’s choice axiom, Thurstone’s theory of comparative judgment, and the double exponential distribution. <i>Journal of Mathematical Psychology</i>, 15(2), 109–144.', url: 'https://doi.org/10.1016/0022-2496(77)90026-8' },
    { text: 'Leemis, L. M., & McQueston, J. T. (2008). Univariate distribution relationships. <i>The American Statistician</i>, 62(1), 45–53.', url: 'https://doi.org/10.1198/000313008X270448' },
  ],

  demo(container, ctx) {
    const { demos, ui } = ctx;
    const sim = demos.simulationDemo(container, null, {
      intro: 'Each simulated value is the difference $G_1 - G_2$ of two independent Gumbel draws with locations $\\mu_1$, $\\mu_2$ and common scale $\\beta$. The histogram is compared with the $\\mathrm{Logistic}(\\mu_1 - \\mu_2, \\beta)$ density.',
      params: PARAMS,
      sample: (rng, { mu1, mu2, beta }) => rng.gumbel(mu1, beta) - rng.gumbel(mu2, beta),
      sampleName: 'differences G1 − G2',
      target: {
        name: ({ mu1, mu2, beta }) => `Logistic(μ = ${ui.fmt(mu1 - mu2, 3)}, s = ${ui.fmt(beta, 3)}) density`,
        pdf: (x, { mu1, mu2, beta }) => logisticPdf(x, mu1 - mu2, beta),
        cdf: (x, { mu1, mu2, beta }) => sigmoid((x - (mu1 - mu2)) / beta),
      },
      range: ({ mu1, mu2, beta }) => [mu1 - mu2 - 7.5 * beta, mu1 - mu2 + 7.5 * beta],
      xLabel: 'difference g₁ − g₂',
      readout: ({ mu1, mu2, beta }) => `The logistic mean is $\\mu_1 - \\mu_2$ = <b>${f4(mu1 - mu2)}</b> and its standard deviation is $\\beta\\pi/\\sqrt3$ = <b>${f4(beta * PI / Math.sqrt(3))}</b>.`,
    });
    choiceFigure(container, ctx, sim.store);
  },
};

/** P(choose option 1) = P(G1 > G2) against the value difference mu1 - mu2. */
function choiceFigure(container, ctx, simStore) {
  const { plot, ui } = ctx;
  const { h } = ui;
  const box = h('div');
  const cap = h('figcaption', {});
  const readout = h('p', { class: 'demo-readout', 'aria-live': 'polite' });
  container.append(h('figure', { class: 'plot-fig', style: 'margin-top:1.4rem' }, cap, box), readout);
  ui.renderRich(cap, 'The choice interpretation: the probability that option 1 has the larger noisy value, $P(G_1 > G_2)$, as a function of the value difference $\\mu_1 - \\mu_2$. Dots are proportions from 500 simulated choices at each difference. Drag the amber marker to change $\\mu_1$.');
  const P = new plot.Plot(box, { xLabel: 'value difference μ₁ − μ₂', yLabel: 'P(choose option 1)', height: w => Math.max(220, Math.min(300, w * 0.36)) });

  const NSIM = 500;
  let cache = { key: '', dots: [] };
  function simDots(beta, seed, lo, hi) {
    const key = [beta, seed, lo, hi].join('|');
    if (cache.key !== key) {
      const rng = makeRng(9000 + seed);
      const dots = [];
      for (let i = 0; i <= 16; i++) {
        const d = lo + (hi - lo) * i / 16;
        let k = 0;
        for (let j = 0; j < NSIM; j++) if (rng.gumbel(d, beta) > rng.gumbel(0, beta)) k++;
        dots.push([d, k / NSIM]);
      }
      cache = { key, dots };
    }
    return cache.dots;
  }

  let frozen = null;  // x window kept fixed while the marker is dragged
  let raf = 0;
  const request = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; draw(); }); };
  simStore.subscribe(request);

  function draw() {
    const { p, seed } = simStore.get();
    const d = p.mu1 - p.mu2, b = p.beta;
    let W = 7 * b;
    W = Math.max(W, Math.abs(d) * 1.15);
    const xd = frozen || [-W, W];
    const thurstoneSd = b * PI / Math.sqrt(3);   // normal noise with the same variance as the Gumbel difference
    const pChoose = sigmoid(d / b);
    const layers = [
      { id: 'half', type: 'hline', y: 0.5, cls: 'ref-line' },
      { id: 'zero', type: 'vline', x: 0, cls: 'ref-line' },
      { id: 'probit', type: 'line', points: plot.sampleFn(x => normalCdf(x / thurstoneSd), xd[0], xd[1], 300), cls: 'curve-ref' },
      { id: 'logit', type: 'line', points: plot.sampleFn(x => sigmoid(x / b), xd[0], xd[1], 300), cls: 'curve-main' },
      ...simDots(b, seed, -6 * b, 6 * b).map(([x, y], i) => ({ id: 'd' + i, type: 'dot', x, y, r: 3.2 })),
      { id: 'now-h', type: 'segment', x1: xd[0], y1: pChoose, x2: d, y2: pChoose, cls: 'guide' },
      { id: 'now', type: 'dot', x: d, y: pChoose, r: 5, cls: 'marker' },
    ];
    P.render({
      x: xd, y: [-0.02, 1.06], layers,
      handles: [{
        id: 'diff', type: 'xPoint', x: d, lineTo: pChoose, label: 'μ₁ − μ₂',
        ariaLabel: 'Value difference μ₁ − μ₂ (changes μ₁). Drag, or use the arrow keys.',
        valueText: f4(d), valueNow: d, valueMin: -20, valueMax: 20,
        onDrag: (pt, phase) => {
          if (phase === 'start') frozen = xd;
          if (pt) {
            const mu1 = Math.max(-10, Math.min(10, Math.round((p.mu2 + pt.x) * 100) / 100));
            simStore.set({ p: { ...simStore.get().p, mu1 } });
          }
          if (phase === 'end') { frozen = null; request(); }
        },
        onKey: steps => {
          const cur = simStore.get().p;
          simStore.set({ p: { ...cur, mu1: Math.max(-10, Math.min(10, Math.round((cur.mu1 + 0.1 * steps) * 100) / 100)) } });
        },
      }],
      legend: [
        { label: 'Gumbel noise: logistic curve 1/(1 + e^(−(μ₁−μ₂)/β))', cls: 'curve-main' },
        { label: 'normal noise with the same variance (probit, Thurstone)', cls: 'curve-ref' },
      ],
    });
    // proportion of option-1 choices among the draws of the simulation above, recomputed with the same seed and size
    const rng = makeRng(1000 + seed);
    const n = simStore.get().size;
    let k = 0;
    for (let i = 0; i < n; i++) if (rng.gumbel(p.mu1, b) - rng.gumbel(p.mu2, b) > 0) k++;
    ui.renderRich(readout, `With $\\mu_1 - \\mu_2$ = <b>${f4(d)}</b> and $\\beta$ = <b>${f4(b)}</b>, the logit rule gives $P(\\text{choose 1}) = 1/(1 + e^{-(\\mu_1 - \\mu_2)/\\beta})$ = <b>${pChoose.toFixed(3)}</b>. `
      + `In the ${n.toLocaleString('en-US')} simulated differences above, $G_1 > G_2$ in <b>${(k / n).toFixed(3)}</b> of the draws. `
      + `Normal noise with the same variance would give <b>${normalCdf(d / thurstoneSd).toFixed(3)}</b>. A larger $\\beta$ (more noise, a higher softmax temperature) flattens the curve.`);
  }
  draw();
}
