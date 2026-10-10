// Binomial <-> Multinomial: a binomial count is a multinomial with K = 2 categories, and each
// component of a multinomial vector is binomial.
// Two views (switched with ui.segmented):
//   1. "Two categories": the multinomial (X1, X2) with K = 2 drawn on the lattice of count pairs, where all
//      its probability lies on the line X1 + X2 = n, next to the Bin(n, p) PMF of X1 (hand-written).
//   2. "One category out of three": simulate Multinomial(n, (p1, p2, p3)) and compare the counts in one
//      category with Bin(n, p_j) (ctx.demos.simulationDemo).

import { getRelation } from '../catalog.js';
import { logBinom, betaIc, lfactorial } from '../core/math.js';

const REL = getRelation('binomial--multinomial');

function binomPmf(k, n, p) {
  if (!Number.isInteger(k) || k < 0 || k > n) return 0;
  if (p <= 0) return k === 0 ? 1 : 0;
  if (p >= 1) return k === n ? 1 : 0;
  return Math.exp(logBinom(n, k) + k * Math.log(p) + (n - k) * Math.log1p(-p));
}
function binomCdf(x, n, p) {
  const k = Math.floor(x);
  if (k < 0) return 0;
  if (k >= n) return 1;
  if (p <= 0) return 1;
  if (p >= 1) return 0;
  return betaIc(p, k + 1, n - k);
}
/** Multinomial probability of the count vector xs with probabilities ps (sum(xs) must be n). */
function multinomialPmf(xs, ps) {
  const n = xs.reduce((a, b) => a + b, 0);
  let lp = lfactorial(n);
  for (let j = 0; j < xs.length; j++) {
    lp -= lfactorial(xs[j]);
    if (xs[j] > 0) { if (ps[j] <= 0) return 0; lp += xs[j] * Math.log(ps[j]); }
  }
  return Math.exp(lp);
}

export default {
  id: 'binomial--multinomial',
  from: 'binomial',
  to: 'multinomial',
  title: 'The binomial is the multinomial with two categories, and each category of a multinomial has a binomial count',

  plain: [
    'The multinomial distribution generalizes the binomial from two possible outcomes per trial to $K$ outcomes (categories). After $n$ independent trials it records how many trials fell into each category, as a vector of counts $(X_1, \\dots, X_K)$ that adds up to $n$.',
    'With $K = 2$ categories, "success" and "failure", the vector is $(X, n - X)$. The second count is determined by the first, so the multinomial is just the binomial count $X$ written as a pair. Going the other way, pick any one category $j$ of a multinomial and lump all the other categories together as "not $j$". Each trial then either lands in category $j$, with probability $p_j$, or not, so the count $X_j$ is binomial with $n$ trials and success probability $p_j$.',
  ],

  statementTex: REL.statement,
  glossary: [
    { sym: 'X \\sim \\mathrm{Bin}(n, p)', meaning: '$X$ is the number of successes in $n$ independent trials with success probability $p$.' },
    { sym: 'n', meaning: 'The number of trials.' },
    { sym: 'p', meaning: 'The probability of a success (the first category) on each trial.' },
    { sym: '\\iff', meaning: 'If and only if: each statement implies the other.' },
    { sym: '(X, n - X)', meaning: 'The pair of counts: successes and failures. They always add up to $n$.' },
    { sym: '\\mathrm{Multinomial}(n, (p, 1-p))', meaning: 'The multinomial distribution with $n$ trials and $K = 2$ categories with probabilities $p$ and $1 - p$.' },
    { sym: '\\mathbf X \\sim \\mathrm{Multinomial}(n, \\mathbf p)', meaning: 'A vector of counts $\\mathbf X = (X_1, \\dots, X_K)$ from $n$ independent trials, each landing in category $j$ with probability $p_j$.' },
    { sym: '\\mathbf p', meaning: 'The vector of category probabilities $(p_1, \\dots, p_K)$, which are non-negative and add up to 1.' },
    { sym: 'X_j', meaning: 'The count in one category $j$: the number of trials that landed in category $j$.' },
    { sym: 'p_j', meaning: 'The probability that a single trial lands in category $j$.' },
    { sym: '\\mathrm{Bin}(n, p_j)', meaning: 'The binomial distribution of the count in category $j$: each trial is a "success" if it lands in $j$.' },
  ],

  why: [
    'The multinomial probability of a count vector $(x_1, \\dots, x_K)$ with $x_1 + \\dots + x_K = n$ is',
    { tex: 'P(X_1 = x_1, \\dots, X_K = x_K) = \\frac{n!}{x_1!\\,x_2!\\cdots x_K!}\\; p_1^{x_1} p_2^{x_2} \\cdots p_K^{x_K}.' },
    'The fraction counts the different orders in which the trials can produce these counts, and the product of powers is the probability of any one such order. With $K = 2$, $x_1 = k$, $x_2 = n - k$, $p_1 = p$ and $p_2 = 1 - p$, the fraction is $\\frac{n!}{k!\\,(n-k)!} = \\binom{n}{k}$ and the formula becomes $\\binom{n}{k} p^k (1-p)^{n-k}$, the binomial probability.',
    'For the margin, think about the trials rather than the formula. Each trial lands in category $j$ with probability $p_j$, independently of the other trials. Counting how many trials land in $j$ is therefore counting successes in $n$ independent trials with success probability $p_j$, which gives $X_j \\sim \\mathrm{Bin}(n, p_j)$, so $\\mathrm{E}[X_j] = np_j$ and $\\mathrm{Var}(X_j) = np_j(1 - p_j)$. The counts are not independent of one another: because they add up to $n$, a large count in one category leaves less room for the others, and $\\mathrm{Cov}(X_i, X_j) = -np_ip_j$ for $i \\ne j$. Lumping categories together also keeps the multinomial form: $(X_1 + X_2, X_3, \\dots, X_K)$ is multinomial with probabilities $(p_1 + p_2, p_3, \\dots, p_K)$.',
  ],

  references: [
    { text: 'Wikipedia: Multinomial distribution.', url: 'https://en.wikipedia.org/wiki/Multinomial_distribution' },
    { text: 'Casella, G., & Berger, R. L. (2002). <i>Statistical Inference</i> (2nd ed.), Section 4.6 (the multinomial distribution and its marginal distributions). Duxbury.' },
    { text: 'Johnson, N. L., Kotz, S., & Balakrishnan, N. (1997). <i>Discrete Multivariate Distributions</i>, Chapter 35. Wiley.' },
    { text: 'Gelman, A., Carlin, J. B., Stern, H. S., Dunson, D. B., Vehtari, A., & Rubin, D. B. (2013). <i>Bayesian Data Analysis</i> (3rd ed.), Section 3.4 and Appendix A. CRC Press.', url: 'http://www.stat.columbia.edu/~gelman/book/' },
  ],

  demo(container, ctx) {
    const { ui } = ctx;
    const { h } = ui;
    const viewA = h('div'), viewB = h('div', { hidden: true });
    let builtB = false;
    const seg = ui.segmented([
      { value: 'two', label: 'Two categories (K = 2)' },
      { value: 'margin', label: 'One category out of three' },
    ], 'two', v => {
      viewA.hidden = v !== 'two';
      viewB.hidden = v !== 'margin';
      if (v === 'margin' && !builtB) { builtB = true; buildMargin(viewB, ctx); }
    }, 'Which direction of the relationship to show');
    container.append(h('div', { style: 'margin-bottom:1rem' }, seg.el), viewA, viewB);
    buildTwo(viewA, ctx);
  },
};

/** View 1: Multinomial(n, (p, 1 - p)) on the lattice of pairs (x1, x2), next to Bin(n, p). */
function buildTwo(container, { math, plot, ui }) {
  const { h } = ui;
  const params = [
    { key: 'n', sym: 'n', name: 'number of trials', meaning: 'How many independent trials there are.', min: 1, max: 20, default: 8, integer: true },
    { key: 'p', sym: 'p', name: 'success probability', meaning: 'Probability that a trial lands in the first category (a success); the second category has probability $1 - p$.', min: 0, max: 1, default: 0.35, step: 0.01 },
    { key: 'k', sym: 'k', name: 'count to inspect', meaning: 'A value of $X_1$ whose probability is worked out below the plots.', min: 0, max: 20, default: 3, integer: true },
  ];
  const defaults = { n: 8, p: 0.35, k: 3 };
  const store = ui.createStore({ ...defaults });
  const leftBox = h('div'), rightBox = h('div');
  const readout = h('p', { class: 'demo-readout', 'aria-live': 'polite' });
  const controls = h('div', { class: 'demo-controls' });
  container.append(
    ui.rich('p', 'Left: every pair of counts $(x_1, x_2)$ with $0 \\le x_1, x_2 \\le n$, with a dot whose area is proportional to its multinomial probability. All the probability lies on the line $x_1 + x_2 = n$; every other pair is impossible. Right: the binomial probabilities of $x_1$. Reading the dots along the line from left to right gives exactly the binomial stems. Drag the amber marker to pick a value $k$ to compare.', { class: 'small muted demo-intro' }),
    h('div', { class: 'demo-grid' },
      h('figure', { class: 'plot-fig' }, ui.rich('figcaption', '$\\mathrm{Multinomial}(n, (p, 1-p))$ on the pairs $(x_1, x_2)$'), leftBox),
      h('figure', { class: 'plot-fig' }, ui.rich('figcaption', '$\\mathrm{Bin}(n, p)$: probabilities of $x_1$'), rightBox)),
    readout, controls);
  const panel = ui.paramPanel(controls, params, {
    get: () => store.get(),
    apply: (key, v) => store.set({ [key]: v }),
    onReset: () => store.set({ ...defaults }),
  });
  const left = new plot.Plot(leftBox, { xLabel: 'x₁ (count in category 1)', yLabel: 'x₂ (count in category 2)' });
  const right = new plot.Plot(rightBox, { xLabel: 'x₁ (count in category 1)', yLabel: 'probability' });

  let frozen = null;
  let raf = 0;
  const request = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; draw(); }); };
  store.subscribe(() => { panel.update(store.get()); request(); });

  function draw() {
    const { n, p } = store.get();
    const k = Math.min(store.get().k, n);
    const pm = [];
    for (let j = 0; j <= n; j++) pm.push(binomPmf(j, n, p));
    const peak = Math.max(...pm);
    // lattice: small open dots everywhere, filled dots on the line x1 + x2 = n with area ~ probability
    const layers = [{ id: 'diag', type: 'segment', x1: 0, y1: n, x2: n, y2: 0, cls: 'guide' }];
    for (let x1 = 0; x1 <= n; x1++) {
      for (let x2 = 0; x2 <= n; x2++) {
        if (x1 + x2 === n) continue;
        layers.push({ id: `o${x1}-${x2}`, type: 'dot', x: x1, y: x2, r: 1.6, cls: 'lattice-dot' });
      }
    }
    for (let x1 = 0; x1 <= n; x1++) {
      const prob = multinomialPmf([x1, n - x1], [p, 1 - p]);
      const r = prob > 0 ? Math.max(1.5, 11 * Math.sqrt(prob / peak)) : 0;
      if (r > 0) layers.push({ id: `m${x1}`, type: 'dot', x: x1, y: n - x1, r, cls: x1 === k ? 'marker' : 'mass-dot' });
    }
    left.render({ x: [-0.8, n + 0.8], y: [-0.8, n + 0.8], discreteX: true, layers });
    restyleDots(leftBox);

    const xd = frozen || [-0.7, n + 0.7];
    const stems = pm.map((v, j) => [j, v]);
    right.render({
      x: xd, y: [0, Math.min(1.08, peak * 1.18)], discreteX: true,
      layers: [
        { id: 'pmf', type: 'stems', points: stems.filter(s => s[0] !== k), cls: 'pmf' },
        { id: 'on', type: 'stems', points: stems.filter(s => s[0] === k), cls: 'pmf-on' },
      ],
      handles: [{
        id: 'k', type: 'xPoint', x: k, label: 'k',
        ariaLabel: 'Count to inspect, k. Drag left or right, or use the arrow keys.', valueText: String(k), valueNow: k, valueMin: 0, valueMax: n,
        onDrag: (pt, phase) => {
          if (phase === 'start') frozen = xd;
          if (pt) store.set({ k: math.clamp(Math.round(pt.x), 0, n) });
          if (phase === 'end') { frozen = null; request(); }
        },
        onKey: steps => store.set({ k: math.clamp(Math.min(store.get().k, n) + steps, 0, n) }),
      }],
      legend: [{ label: `Bin(n = ${n}, p = ${fmtP(p)})`, cls: 'curve-main' }],
    });

    const coef = Math.round(Math.exp(logBinom(n, k)));
    ui.renderRich(readout,
      `At $x_1 = k$ = ${k}, $x_2 = n - k$ = ${n - k}: the multinomial coefficient $\\frac{n!}{x_1!\\,x_2!} = \\frac{${n}!}{${k}!\\,${n - k}!}$ = <b>${coef}</b> equals $\\binom{n}{k}$, `
      + `and both formulas give probability <b>${ui.fmt(pm[k], 4)}</b>. `
      + `The count in category 2 is $n - x_1$, so it adds no information: the pair $(X_1, X_2)$ and the single count $X_1$ carry the same randomness.`
      + (store.get().k > n ? ` (The inspected value was reduced to $n$ = ${n}.)` : ''));
  }
  draw();
}

/** Style the lattice dots without new CSS: hollow grey points and steel probability dots. */
function restyleDots(root) {
  root.querySelectorAll('.layer.lattice-dot .dot').forEach(d => { d.style.fill = 'none'; d.style.stroke = 'var(--axis)'; d.style.strokeWidth = '1'; });
  root.querySelectorAll('.layer.mass-dot .dot').forEach(d => { d.style.fill = 'var(--steel)'; d.style.fillOpacity = '0.75'; d.style.stroke = 'var(--steel-deep)'; d.style.strokeWidth = '1.2'; });
  root.querySelectorAll('.layer.marker .dot').forEach(d => { d.style.cssText = ''; });
}

/** View 2: simulate Multinomial(n, (p1, p2, p3)) and compare the count in category j with Bin(n, p_j). */
function buildMargin(container, { demos, ui }) {
  const pOf = ({ p1, p2 }, j) => (j === 1 ? p1 : j === 2 ? p2 : Math.max(0, 1 - p1 - p2));
  demos.simulationDemo(container, null, {
    intro: 'Each simulated draw is a full multinomial vector of counts $(X_1, X_2, X_3)$ from $n$ trials with category probabilities $p_1$, $p_2$ and $p_3 = 1 - p_1 - p_2$. Only the count in the chosen category $j$ is kept, and its frequencies (bars) are compared with $\\mathrm{Bin}(n, p_j)$ (stems). Change $j$ to look at another category.',
    params: [
      { key: 'n', sym: 'n', name: 'number of trials', meaning: 'How many independent trials are sorted into the three categories.', min: 1, max: 40, default: 12, integer: true },
      { key: 'p1', sym: 'p_1', name: 'probability of category 1', meaning: 'Probability that a trial lands in category 1.', min: 0, max: 1, default: 0.5, step: 0.01 },
      { key: 'p2', sym: 'p_2', name: 'probability of category 2', meaning: 'Probability that a trial lands in category 2. Category 3 gets the rest, $p_3 = 1 - p_1 - p_2$.', min: 0, max: 1, default: 0.3, step: 0.01 },
      { key: 'j', sym: 'j', name: 'category to count', meaning: 'Which category’s count is compared with the binomial distribution.', min: 1, max: 3, default: 1, integer: true },
    ],
    check: ({ p1, p2 }) => (p1 + p2 > 1 + 1e-12 ? 'p₁ + p₂ must be at most 1 (category 3 gets 1 − p₁ − p₂).' : null),
    sample: (rng, prm) => rng.multinomial(prm.n, [prm.p1, prm.p2, pOf(prm, 3)])[prm.j - 1],
    sampleName: 'simulated counts in category j',
    target: {
      name: prm => `Binomial(n = ${prm.n}, p_j = ${fmtP(pOf(prm, prm.j))}) probabilities`,
      pdf: (k, prm) => binomPmf(k, prm.n, pOf(prm, prm.j)),
      cdf: (x, prm) => binomCdf(x, prm.n, pOf(prm, prm.j)),
      discrete: true,
    },
    range: ({ n }) => [0, n],
    xLabel: 'count in category j',
    readout: prm => `Category probabilities $(p_1, p_2, p_3)$ = (${fmtP(prm.p1)}, ${fmtP(prm.p2)}, ${fmtP(pOf(prm, 3))}). `
      + `Binomial mean $np_j$ = <b>${ui.fmt(prm.n * pOf(prm, prm.j))}</b>, standard deviation $\\sqrt{np_j(1-p_j)}$ = <b>${ui.fmt(Math.sqrt(prm.n * pOf(prm, prm.j) * (1 - pOf(prm, prm.j))))}</b>.`,
  });
}

function fmtP(p) { return String(Number(Number(p).toPrecision(3))); }
