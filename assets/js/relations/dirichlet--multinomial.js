// Dirichlet -> Multinomial (conjugate prior): a Dirichlet prior on the category probabilities and multinomial
// counts give a Dirichlet posterior with the counts added to the concentrations.
// Hand-written demo: the prior and the posterior drawn as densities on the triangle of probability vectors (K = 3).
// Data are simulated from a "true" probability vector, which is an amber point that can be dragged; buttons add
// trials one at a time or in batches, and the readout compares the posterior mean with the observed proportions.

import { getRelation } from '../catalog.js';

const REL = getRelation('dirichlet--multinomial');
const SQ3 = Math.sqrt(3) / 2;
const NX = 110, NY = Math.round(NX * SQ3);
const f3 = v => String(Number(Number(v).toPrecision(3)));
const vec = a => '(' + a.map(f3).join(', ') + ')';
const toXY = v => [v[1] + v[2] / 2, SQ3 * v[2]];

const STYLE = `
.plot.pd-simplex .gridline, .plot.pd-simplex .axis-line, .plot.pd-simplex .tick, .plot.pd-simplex .tick-label { display: none; }
.pd-dm .layer.dm-tri .poly { fill: none; stroke: var(--ink-2); stroke-width: 1.3; }
.pd-dm .layer.dm-grid .rule { stroke: var(--surface); stroke-opacity: .55; stroke-width: 1; }
.pd-dm .layer.dm-corner .label { font-family: var(--serif); font-style: italic; font-size: 12.5px; fill: var(--ink-2); }
.pd-dm .layer.dm-mean .dot { fill: var(--surface); stroke: var(--steel-deep); stroke-width: 2.2; }
.pd-dm .layer.dm-mle .dot { fill: var(--ink); }
.pd-dm .layer.dm-truth .dot { fill: none; stroke: var(--amber-deep); stroke-width: 2.2; }
.pd-dm .layer.dm-tag .label { font-size: 11.5px; fill: var(--ink-2); paint-order: stroke; stroke: var(--surface); stroke-width: 4px; }
.pd-dm .dm-buttons { display: flex; flex-wrap: wrap; gap: .5rem; align-items: center; }
.pd-dm .dm-counts { font-family: var(--mono); font-size: .95rem; }
@media (max-width: 760px) { .pd-dm .plot-fig + .plot-fig { margin-top: 1.2rem; } }
`;

function logDir(x, a, lg0) {
  let s = lg0;
  for (let j = 0; j < 3; j++) s += (a[j] - 1) * Math.log(x[j]);
  return s;
}

/** Dirichlet density on the triangle as heatmap values (log-space; colors scaled to a high percentile when unbounded). */
function heatValues(a, lgamma) {
  const lg0 = lgamma(a[0] + a[1] + a[2]) - lgamma(a[0]) - lgamma(a[1]) - lgamma(a[2]);
  const values = new Float64Array(NX * NY);
  const fin = [];
  for (let j = 0; j < NY; j++) {
    const x3 = (j + 0.5) / NY;
    for (let i = 0; i < NX; i++) {
      const x2 = (i + 0.5) / NX - x3 / 2, x1 = 1 - x2 - x3;
      if (x1 <= 0 || x2 <= 0) { values[j * NX + i] = NaN; continue; }
      const v = Math.exp(logDir([x1, x2, x3], a, lg0));
      values[j * NX + i] = v; fin.push(v);
    }
  }
  fin.sort((u, v) => u - v);
  const max = a.some(v => v < 1) ? fin[Math.floor(fin.length * 0.97)] : fin[fin.length - 1];
  return { values, max };
}

export default {
  id: 'dirichlet--multinomial',
  from: 'dirichlet',
  to: 'multinomial',
  title: 'The Dirichlet distribution is the conjugate prior for multinomial (and categorical) probabilities',

  summary: 'The Dirichlet distribution is the conjugate prior for the category probabilities of multinomial (or categorical) data. A Dirichlet prior combined with observed category counts gives a Dirichlet posterior whose parameters are the prior parameters plus the counts.',

  plain: [
    'Suppose the probabilities $\\mathbf p = (p_1, \\dots, p_K)$ of $K$ categories are unknown, for example the chances that a participant chooses each of three options. A Dirichlet prior $\\mathrm{Dir}(\\alpha_1, \\dots, \\alpha_K)$ describes what is believed about $\\mathbf p$ before seeing data. After observing $n$ trials with counts $x_1, \\dots, x_K$ in the categories, the posterior is again Dirichlet, with each count added to the matching concentration: $\\mathrm{Dir}(\\alpha_1 + x_1, \\dots, \\alpha_K + x_K)$.',
    'This is the Beta–binomial update with more than two categories. The concentrations behave like counts from earlier, imaginary trials (pseudo-counts): the posterior mean of $p_j$ is $(\\alpha_j + x_j)/(\\alpha_0 + n)$, which moves from the prior mean $\\alpha_j/\\alpha_0$ toward the observed proportion $x_j/n$ as data accumulate. The same update holds when the data are $n$ separate categorical outcomes, because the likelihood depends on the outcomes only through the counts.',
  ],

  statementTex: REL.statement,
  glossary: [
    { sym: '\\mathbf p \\sim \\mathrm{Dir}(\\boldsymbol\\alpha)', meaning: 'The prior: the vector of category probabilities has a Dirichlet distribution with concentrations $\\boldsymbol\\alpha$.' },
    { sym: '\\boldsymbol\\alpha = (\\alpha_1, \\dots, \\alpha_K)', meaning: 'The prior concentrations (pseudo-counts), all positive. Their total $\\alpha_0$ says how much the prior weighs, in units of observations.' },
    { sym: '\\mathbf X \\mid \\mathbf p \\sim \\mathrm{Multinomial}(n, \\mathbf p)', meaning: 'The data model: given $\\mathbf p$, the counts in the $K$ categories after $n$ independent trials are multinomial.' },
    { sym: '\\mathbf p \\mid \\mathbf x', meaning: 'The posterior: the distribution of $\\mathbf p$ after the counts $\\mathbf x = (x_1, \\dots, x_K)$ have been observed.' },
    { sym: '\\mathrm{Dir}(\\boldsymbol\\alpha + \\mathbf x)', meaning: 'The Dirichlet distribution with concentrations $\\alpha_j + x_j$.' },
    { sym: '\\Rightarrow', meaning: 'Implies.' },
    { sym: '\\text{iid Categorical}(\\mathbf p)', meaning: 'Independent single trials, each falling in category $j$ with probability $p_j$; their category counts are $\\mathbf x$.' },
  ],

  why: [
    'By Bayes’ rule the posterior density is proportional to the prior density times the likelihood. As functions of $\\mathbf p$,',
    { tex: '\\underbrace{\\prod_{j=1}^{K} p_j^{\\alpha_j - 1}}_{\\text{prior}} \\;\\times\\; \\underbrace{\\prod_{j=1}^{K} p_j^{x_j}}_{\\text{likelihood}} \\;=\\; \\prod_{j=1}^{K} p_j^{\\alpha_j + x_j - 1}.' },
    'The multinomial coefficient $n!/(x_1! \\cdots x_K!)$ and the Dirichlet normalizing constant do not depend on $\\mathbf p$, so they are absorbed into the proportionality. The product on the right is the shape of a $\\mathrm{Dir}(\\alpha_1 + x_1, \\dots, \\alpha_K + x_K)$ density, and since a density must integrate to 1, the posterior is exactly that distribution. The likelihood of $n$ separate categorical outcomes is the same product $\\prod_j p_j^{x_j}$ (without the coefficient), which is why the update is the same.',
    'The posterior mean can be written as a weighted average of the prior mean and the observed proportions,',
    { tex: '\\mathrm{E}[p_j \\mid \\mathbf x] = \\frac{\\alpha_j + x_j}{\\alpha_0 + n} = \\frac{\\alpha_0}{\\alpha_0 + n}\\cdot\\frac{\\alpha_j}{\\alpha_0} + \\frac{n}{\\alpha_0 + n}\\cdot\\frac{x_j}{n},' },
    'with weights proportional to the prior total $\\alpha_0$ and the sample size $n$. The posterior variance $m_j(1 - m_j)/(\\alpha_0 + n + 1)$, with $m_j$ the posterior mean, shrinks as $n$ grows, so the posterior concentrates around the true probabilities. The probability that the next trial falls in category $j$ (the posterior predictive probability) is also $(\\alpha_j + x_j)/(\\alpha_0 + n)$.',
  ],

  references: [
    { text: 'Wikipedia: Dirichlet distribution, conjugate to categorical or multinomial.', url: 'https://en.wikipedia.org/wiki/Dirichlet_distribution#Conjugate_to_categorical_or_multinomial' },
    { text: 'Gelman, A., Carlin, J. B., Stern, H. S., Dunson, D. B., Vehtari, A., & Rubin, D. B. (2013). <i>Bayesian Data Analysis</i> (3rd ed.), Section 3.4 (the multinomial model). CRC Press.', url: 'http://www.stat.columbia.edu/~gelman/book/' },
    { text: 'Lee, M. D., & Wagenmakers, E.-J. (2013). <i>Bayesian Cognitive Modeling: A Practical Course</i>. Cambridge University Press.' },
    { text: 'Frigyik, B. A., Kapila, A., & Gupta, M. R. (2010). Introduction to the Dirichlet distribution and related processes. Technical report UWEETR-2010-0006, University of Washington.' },
  ],

  demo(container, { math, plot, ui }) {
    const { h } = ui;
    if (!document.getElementById('pd-style-dm')) document.head.append(h('style', { id: 'pd-style-dm' }, STYLE));
    const params = [
      { key: 'alpha1', sym: '\\alpha_1', name: 'prior concentration 1', meaning: 'Prior pseudo-count for category 1.', min: 0.2, max: 20, default: 2, log: true },
      { key: 'alpha2', sym: '\\alpha_2', name: 'prior concentration 2', meaning: 'Prior pseudo-count for category 2.', min: 0.2, max: 20, default: 2, log: true },
      { key: 'alpha3', sym: '\\alpha_3', name: 'prior concentration 3', meaning: 'Prior pseudo-count for category 3.', min: 0.2, max: 20, default: 2, log: true },
    ];
    const defaults = { alpha1: 2, alpha2: 2, alpha3: 2 };
    const store = ui.createStore({ p: { ...defaults }, truth: [0.6, 0.3, 0.1], x: [0, 0, 0], seed: 1 });
    let rng = math.makeRng(77);

    const priorBox = h('div', { 'data-role': 'main-plot' }), postBox = h('div', { 'data-role': 'main-plot' });
    const readout = h('p', { class: 'demo-readout', 'aria-live': 'polite' });
    const counts = h('p', { class: 'dm-counts' });
    const controls = h('div', { class: 'demo-controls' });
    container.append(
      h('div', { class: 'demo-grid pd-dm' },
        h('figure', { class: 'plot-fig' }, ui.rich('figcaption', 'Prior $\\mathrm{Dir}(\\boldsymbol\\alpha)$ and the true $\\mathbf p$'), priorBox),
        h('figure', { class: 'plot-fig' }, ui.rich('figcaption', 'Posterior $\\mathrm{Dir}(\\boldsymbol\\alpha + \\mathbf x)$'), postBox)),
      readout, controls,
      // the plots come first so that they start inside a laptop screen; the explanation follows the controls
      ui.rich('p', 'Left: the prior $\\mathrm{Dir}(\\alpha_1, \\alpha_2, \\alpha_3)$ on the triangle of probability vectors (stronger shading means more probable; each corner is a vector with all the probability on one category). The amber point is the true probability vector used to simulate data; drag it anywhere in the triangle (this clears the data, so that all observed trials come from the same $\\mathbf p$). Right: the posterior $\\mathrm{Dir}(\\alpha_1 + x_1, \\alpha_2 + x_2, \\alpha_3 + x_3)$ after the trials observed so far. Add trials with the buttons and watch the posterior narrow around the true point.', { class: 'small muted demo-intro' }));
    controls.classList.add('pd-dm');

    const panel = ui.paramPanel(controls, params, {
      get: () => store.get().p,
      apply: (k, v) => store.set({ p: { ...store.get().p, [k]: v } }),
      onReset: () => store.set({ p: { ...defaults } }),
    });
    const observe = m => () => {
      const s = store.get();
      const add = rng.multinomial(m, s.truth);
      store.set({ x: s.x.map((v, j) => v + add[j]) });
    };
    const btn = (label, fn) => { const b = h('button', { type: 'button', class: 'btn small-btn' }, label); b.addEventListener('click', fn); return b; };
    controls.append(h('div', { class: 'demo-sim-ctl' }, h('h3', { class: 'mini-title' }, 'Data'), counts,
      h('div', { class: 'dm-buttons' }, btn('Observe 1 trial', observe(1)), btn('Observe 10', observe(10)), btn('Observe 100', observe(100)), btn('Clear data', () => store.set({ x: [0, 0, 0] })))));

    const opts = { equalAspect: true, className: 'pd-simplex', margin: { t: 24, b: 28, l: 12, r: 12 }, height: (w, H) => plot.fitHeight(w, H, { ratio: 0.86, phoneRatio: 0.86, min: 220, max: 380 }) };
    const prior = new plot.Plot(priorBox, { ...opts, ariaLabel: 'Prior density on the triangle' });
    const post = new plot.Plot(postBox, { ...opts, ariaLabel: 'Posterior density on the triangle' });

    let raf = 0;
    const request = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; draw(); }); };
    store.subscribe(() => { panel.update(store.get().p); request(); });

    const frameLayers = () => {
      const L = [];
      for (const c of [0.2, 0.4, 0.6, 0.8]) {
        L.push({ id: 'g3' + c, type: 'segment', x1: c / 2, y1: SQ3 * c, x2: 1 - c / 2, y2: SQ3 * c, cls: 'dm-grid' });
        L.push({ id: 'g2' + c, type: 'segment', x1: c, y1: 0, x2: c / 2, y2: SQ3 * c, cls: 'dm-grid' });
        L.push({ id: 'g1' + c, type: 'segment', x1: 1 - c, y1: 0, x2: 1 - c / 2, y2: SQ3 * c, cls: 'dm-grid' });
      }
      L.push({ id: 'tri', type: 'polygon', points: [[0, 0], [1, 0], [0.5, SQ3]], cls: 'dm-tri' },
        { id: 'c1', type: 'text', x: 0, y: 0, dy: 17, text: 'category 1', cls: 'dm-corner', keepInside: false },
        { id: 'c2', type: 'text', x: 1, y: 0, dy: 17, text: 'category 2', cls: 'dm-corner', keepInside: false },
        { id: 'c3', type: 'text', x: 0.5, y: SQ3, dy: -9, text: 'category 3', cls: 'dm-corner', keepInside: false });
      return L;
    };
    let dragTruth = false;
    // moving the true p starts a new data set, so that all counts come from the same p
    const setTruth = (x, y) => {
      const x3 = y / SQ3, x2 = x - x3 / 2;
      let v = [1 - x2 - x3, x2, x3].map(t => Math.max(0.01, t));
      const s = v[0] + v[1] + v[2];
      v = v.map(t => math.roundTo(t / s, 0.001));
      store.set({ truth: v, x: [0, 0, 0] });
    };

    function draw() {
      const { p, truth, x } = store.get();
      const a = [p.alpha1, p.alpha2, p.alpha3];
      const ap = a.map((v, j) => v + x[j]);
      const n = x[0] + x[1] + x[2];
      const a0 = a[0] + a[1] + a[2], ap0 = a0 + n;
      const [tx, ty] = toXY(truth);
      const H1 = heatValues(a, math.lgamma), H2 = heatValues(ap, math.lgamma);
      const meanPrior = a.map(v => v / a0), meanPost = ap.map(v => v / ap0);
      const pl = [{ id: 'heat', type: 'heatmap', x: [0, 1], y: [0, SQ3], nx: NX, ny: NY, values: H1.values, max: H1.max }, ...frameLayers()];
      pl.push({ id: 'pm', type: 'dot', x: toXY(meanPrior)[0], y: toXY(meanPrior)[1], r: 5, cls: 'dm-mean' });
      prior.render({
        x: [-0.08, 1.08], y: [-0.1, SQ3 + 0.08], layers: pl,
        handles: [{
          id: 'truth', type: 'point', at: { x: tx, y: ty }, label: 'true p',
          ariaLabel: 'True probability vector used to simulate the data. Drag inside the triangle, or use the arrow keys.', valueText: vec(truth), valueNow: truth[0],
          onDrag: (pt, phase) => { if (phase === 'start') { dragTruth = true; store.set({ x: [0, 0, 0] }); } if (pt && dragTruth) setTruth(pt.x, pt.y); if (phase === 'end') dragTruth = false; },
          onKey: (steps, axis) => setTruth(tx + (axis === 'y' ? 0 : 0.01 * steps), ty + (axis === 'y' ? 0.01 * steps : 0)),
        }],
      });
      const ql = [{ id: 'heat', type: 'heatmap', x: [0, 1], y: [0, SQ3], nx: NX, ny: NY, values: H2.values, max: H2.max }, ...frameLayers()];
      ql.push({ id: 'truth', type: 'dot', x: tx, y: ty, r: 7, cls: 'dm-truth' });
      if (n > 0) {
        const [mx, my] = toXY(x.map(v => v / n));
        ql.push({ id: 'mle', type: 'dot', x: mx, y: my, r: 3.2, cls: 'dm-mle' });
      }
      const [qx, qy] = toXY(meanPost);
      ql.push({ id: 'qm', type: 'dot', x: qx, y: qy, r: 5, cls: 'dm-mean' });
      ql.push({ id: 'qt', type: 'text', x: qx, y: qy, dx: 10, dy: 16, anchor: 'start', text: 'posterior mean', cls: 'dm-tag' });
      post.render({ x: [-0.08, 1.08], y: [-0.1, SQ3 + 0.08], layers: ql, legend: [] });

      counts.textContent = `n = ${n}, counts x = (${x.join(', ')})`;
      ui.renderRich(readout,
        `Posterior: $\\mathrm{Dir}(${ap.map(f3).join(', ')})$. Posterior mean $(\\alpha_j + x_j)/(\\alpha_0 + n)$ = <b>${vec(meanPost)}</b>; `
        + (n > 0 ? `observed proportions $x_j/n$ = ${vec(x.map(v => v / n))} (black dot); ` : 'no data yet, so the posterior equals the prior; ')
        + `prior mean ${vec(meanPrior)}; true $\\mathbf p$ = ${vec(truth)} (amber ring). The data carry weight $n/(\\alpha_0 + n)$ = <b>${f3(n / ap0)}</b> in the posterior mean. `
        + `Posterior standard deviation of $p_1$: <b>${f3(Math.sqrt(meanPost[0] * (1 - meanPost[0]) / (ap0 + 1)))}</b>.`);
    }
    draw();
  },
};
