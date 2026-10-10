// Binomial -> Normal as n -> infinity (de Moivre-Laplace) — the REFERENCE relation module.
// See ARCHITECTURE.md for the fields. The demo is self-contained: it computes the binomial PMF
// directly with math.logBinom, so it does not depend on the binomial distribution module.

import { getRelation } from '../catalog.js';

const REL = getRelation('binomial--normal');

function binomPmfs(n, p, logBinom) {
  // all P(X = k), k = 0..n
  const out = new Array(n + 1);
  const lp = Math.log(p), lq = Math.log1p(-p);
  for (let k = 0; k <= n; k++) {
    out[k] = p <= 0 ? (k === 0 ? 1 : 0) : p >= 1 ? (k === n ? 1 : 0) : Math.exp(logBinom(n, k) + k * lp + (n - k) * lq);
  }
  return out;
}

/** Largest vertical gap between the binomial step CDF and the normal CDF (Kolmogorov distance). */
function maxCdfGap(n, p, cc, math) {
  const pm = binomPmfs(n, p, math.logBinom);
  const mu = n * p, sd = Math.sqrt(n * p * (1 - p));
  const shift = cc ? 0.5 : 0;
  let F = 0, best = { d: 0, x: 0, Fb: 0, Fn: 0 };
  // compare just before and at every jump; with the continuity correction the normal curve is shifted by 1/2
  for (let k = 0; k <= n; k++) {
    const Fn = math.normalCdf((k + shift - mu) / sd);
    const before = Math.abs(F - Fn);
    F += pm[k];
    const at = Math.abs(F - Fn);
    if (before > best.d) best = { d: before, x: k, Fb: F - pm[k], Fn };
    if (at > best.d) best = { d: at, x: k, Fb: F, Fn };
  }
  return best;
}

export default {
  id: 'binomial--normal',
  from: 'binomial',
  to: 'normal',
  title: 'Binomial to normal as the number of trials grows (de Moivre–Laplace theorem)',

  plain: [
    'A binomial count is the number of successes in $n$ independent trials that each succeed with probability $p$. When $n$ is large and $p$ is not too close to 0 or 1, the bar chart of binomial probabilities takes the shape of a bell curve. The matching normal curve has the same mean $np$ and the same variance $np(1-p)$ as the binomial.',
    'This is the oldest form of the central limit theorem, found by de Moivre in 1733 and extended by Laplace. It is the reason the z-test for a proportion works, and the reason binomial probabilities could be computed from normal tables before computers.',
  ],

  statementTex: REL.statement,
  glossary: [
    { sym: 'X_n \\sim \\mathrm{Bin}(n, p)', meaning: '$X_n$ is the number of successes in $n$ independent trials, each with success probability $p$.' },
    { sym: 'n', meaning: 'The number of trials. The theorem describes what happens as $n$ grows without bound.' },
    { sym: 'p \\in (0,1)', meaning: 'The success probability, held fixed (strictly between 0 and 1) while $n$ grows.' },
    { sym: 'np', meaning: 'The mean of the binomial: the expected number of successes.' },
    { sym: '\\sqrt{np(1-p)}', meaning: 'The standard deviation of the binomial.' },
    { sym: '\\frac{X_n - np}{\\sqrt{np(1-p)}}', meaning: 'The standardized count: how many standard deviations the count lies above its mean.' },
    { sym: '\\xrightarrow{d}', meaning: 'Converges in distribution: for every $z$, the probability that the standardized count is at most $z$ approaches $\\Phi(z)$.' },
    { sym: '\\mathcal N(0,1)', meaning: 'The standard normal distribution, with mean 0 and standard deviation 1.' },
  ],

  why: [
    'A binomial count is a sum of $n$ independent Bernoulli variables $X = B_1 + \\dots + B_n$, each equal to 1 with probability $p$ and 0 otherwise. Each $B_i$ has mean $p$ and variance $p(1-p)$, so the sum has mean $np$ and variance $np(1-p)$. The central limit theorem says that a standardized sum of many independent, identically distributed terms with finite variance is approximately standard normal.',
    'De Moivre and Laplace proved it directly. Applying Stirling’s approximation $k! \\approx \\sqrt{2\\pi k}\\,(k/e)^k$ to the three factorials in $\\binom{n}{k}$ shows that, for $k$ within a few standard deviations of $np$,',
    { tex: '\\binom{n}{k} p^k (1-p)^{n-k} \\approx \\frac{1}{\\sqrt{2\\pi np(1-p)}} \\exp\\!\\left(-\\frac{(k-np)^2}{2np(1-p)}\\right),' },
    'which is the normal density with mean $np$ and variance $np(1-p)$ evaluated at $k$. Each bar has width 1, so the bar heights approximate the areas under the normal curve.',
    'The quality of the approximation depends on $n$ and $p$. The largest gap between the two CDFs shrinks roughly like $1/\\sqrt{n}$, and more slowly when $p$ is near 0 or 1, because the binomial is then skewed. A common rule of thumb asks for $np \\ge 10$ and $n(1-p) \\ge 10$. Adding $\\tfrac12$ to $k$ before standardizing (the continuity correction) accounts for the bar width and usually improves the approximation. When $n$ is large but $np$ stays moderate, the Poisson distribution is a better approximation than the normal.',
  ],

  references: [
    { text: 'Wikipedia: De Moivre–Laplace theorem.', url: 'https://en.wikipedia.org/wiki/De_Moivre%E2%80%93Laplace_theorem' },
    { text: 'Wikipedia: Binomial distribution, normal approximation.', url: 'https://en.wikipedia.org/wiki/Binomial_distribution#Normal_approximation' },
    { text: 'Casella, G., & Berger, R. L. (2002). <i>Statistical Inference</i> (2nd ed.), Example 5.5.16 and Section 5.5.3. Duxbury.' },
    { text: 'Leemis, L. M., & McQueston, J. T. (2008). Univariate distribution relationships. <i>The American Statistician</i>, 62(1), 45–53.', url: 'https://doi.org/10.1198/000313008X270448' },
  ],

  /**
   * Interactive demo: binomial PMF bars with the matching normal curve, the two CDFs,
   * and the largest CDF gap as a function of n.
   */
  demo(container, { math, plot, ui }) {
    const { h } = ui;
    const params = [
      { key: 'n', sym: 'n', name: 'number of trials', meaning: 'How many independent trials are counted.', min: 1, max: 500, default: 10, integer: true, log: true },
      { key: 'p', sym: 'p', name: 'success probability', meaning: 'Probability of success on each trial.', min: 0.01, max: 0.99, default: 0.3 },
    ];
    const store = ui.createStore({ n: 10, p: 0.3, cc: false });

    const pmfBox = h('div'), cdfBox = h('div'), gapBox = h('div');
    const readout = h('p', { class: 'demo-readout', 'aria-live': 'polite' });
    const controls = h('div', { class: 'demo-controls' });
    container.append(
      h('p', { class: 'small muted', style: 'margin-top:0' }, 'Increase n and watch the bars settle onto the normal curve. Drag the amber handle on the left plot to change n, or use the boxes below.'),
      h('div', { class: 'demo-grid' },
        h('figure', { class: 'plot-fig' }, h('figcaption', {}, 'Binomial probabilities and the normal curve'), pmfBox),
        h('figure', { class: 'plot-fig' }, h('figcaption', {}, 'The two CDFs'), cdfBox)),
      readout,
      controls,
      h('figure', { class: 'plot-fig', style: 'margin-top:1.2rem' }, h('figcaption', {}, 'Largest CDF gap for every n from 1 to 500 (at this p)'), gapBox));

    const panel = ui.paramPanel(controls, params, {
      get: () => store.get(),
      apply: (k, v) => store.set({ [k]: v }),
      onReset: () => store.set({ n: 10, p: 0.3 }),
    });
    const cc = ui.toggleSwitch('Continuity correction (shift the normal CDF by ½)', false, on => store.set({ cc: on }));
    controls.append(h('div', {}, cc.el));

    const pmfPlot = new plot.Plot(pmfBox, { xLabel: 'k (number of successes)', yLabel: 'probability' });
    const cdfPlot = new plot.Plot(cdfBox, { xLabel: 'k', yLabel: 'F(k)' });
    const gapPlot = new plot.Plot(gapBox, { xLabel: 'n', yLabel: 'max gap', height: w => Math.max(170, Math.min(240, w * 0.28)) });

    let gapCache = { key: '', pts: [] };
    function gapCurve(p, ccOn) {
      const key = p + '|' + ccOn;
      if (gapCache.key !== key) {
        const pts = [];
        for (let n = 1; n <= 500; n += (n < 40 ? 1 : 5)) pts.push([n, maxCdfGap(n, p, ccOn, math).d]);
        gapCache = { key, pts };
      }
      return gapCache.pts;
    }

    let nDrag = null;
    let raf = 0;
    const request = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; draw(); }); };
    store.subscribe(() => { panel.update(store.get()); request(); });

    function draw() {
      const { n, p, cc: ccOn } = store.get();
      const mu = n * p, sd = Math.sqrt(n * p * (1 - p));
      const lo = Math.max(0, Math.floor(mu - 4.5 * sd) - 1), hi = Math.min(n, Math.ceil(mu + 4.5 * sd) + 1);
      const xd = [lo - 0.7, hi + 0.7];
      const pm = binomPmfs(n, p, math.logBinom);
      const stems = [];
      for (let k = lo; k <= hi; k++) stems.push([k, pm[k]]);
      const normPdf = x => math.normalPdf((x - mu) / sd) / sd;
      const ymax = Math.max(...stems.map(s => s[1]), normPdf(mu)) * 1.15;
      pmfPlot.render({
        x: xd, y: [0, ymax], discreteX: true,
        layers: [
          { id: 'pmf', type: 'stems', points: stems, cls: 'pmf' },
          { id: 'norm', type: 'line', points: plot.sampleFn(normPdf, xd[0], xd[1], 300), cls: 'curve-ref' },
        ],
        handles: [{
          id: 'n', type: 'xPoint', x: Math.min(hi, Math.max(lo, mu)), label: 'n',
          ariaLabel: 'Number of trials n. Drag right to increase, or use the arrow keys.',
          valueText: String(n), valueNow: n, valueMin: 1, valueMax: 500,
          onDrag: (pt, phase) => {
            if (phase === 'start') nDrag = { x0: pt.x, n0: n, span: xd[1] - xd[0] };
            if (pt && nDrag) {
              // dragging right by the width of the plot multiplies n by about 4
              const f = Math.pow(4, (pt.x - nDrag.x0) / nDrag.span);
              store.set({ n: Math.max(1, Math.min(500, Math.round(nDrag.n0 * f))) });
            }
            if (phase === 'end') nDrag = null;
          },
          onKey: steps => store.set({ n: Math.max(1, Math.min(500, store.get().n + steps)) }),
        }],
        legend: [{ label: `Binomial(${n}, ${fmtP(p)})`, cls: 'curve-main' }, { label: `Normal(mean ${ui.fmt(mu, 3)}, sd ${ui.fmt(sd, 3)})`, cls: 'curve-ref' }],
      });

      const ks = [];
      let F = 0;
      for (let k = 0; k <= hi; k++) { F += pm[k]; if (k >= lo) ks.push([k, F]); }
      const F0 = lo > 0 ? pm.slice(0, lo).reduce((a, b) => a + b, 0) : 0;
      const shift = ccOn ? 0.5 : 0;
      const gap = maxCdfGap(n, p, ccOn, math);
      cdfPlot.render({
        x: xd, y: [-0.02, 1.06], discreteX: true,
        layers: [
          { id: 'one', type: 'hline', y: 1, cls: 'ref-line' },
          { id: 'bin', type: 'step', points: ks, x0: xd[0], y0: F0, cls: 'curve-main' },
          { id: 'norm', type: 'line', points: plot.sampleFn(x => math.normalCdf((x + shift - mu) / sd), xd[0], xd[1], 300), cls: 'curve-ref' },
          { id: 'gap', type: 'segment', x1: gap.x, y1: gap.Fb, x2: gap.x, y2: gap.Fn, cls: 'guide' },
          { id: 'gap-dot', type: 'dot', x: gap.x, y: gap.Fb, r: 4.5, cls: 'marker' },
        ],
      });
      readout.innerHTML = `Largest gap between the two CDFs: <b>${ui.fmt(gap.d, 3)}</b> at k = ${gap.x}. `
        + `Mean np = ${ui.fmt(mu, 4)}, standard deviation √(np(1−p)) = ${ui.fmt(sd, 4)}. `
        + (n * p >= 10 && n * (1 - p) >= 10 ? 'The rule of thumb np ≥ 10 and n(1−p) ≥ 10 is met.' : 'The rule of thumb np ≥ 10 and n(1−p) ≥ 10 is not met yet.');

      const gc = gapCurve(p, ccOn);
      const gmax = Math.max(...gc.map(q => q[1])) * 1.1 || 0.1;
      gapPlot.render({
        x: [0, 505], y: [0, gmax],
        layers: [
          { id: 'g', type: 'line', points: gc, cls: 'curve-main' },
          { id: 'rt', type: 'line', points: gc.map(([m]) => [m, gc[0][1] / Math.sqrt(m)]), cls: 'curve-ref' },
          { id: 'now', type: 'dot', x: n, y: gap.d, r: 5, cls: 'marker' },
        ],
        legend: [{ label: 'largest CDF gap', cls: 'curve-main' }, { label: 'a curve proportional to 1/√n, for comparison', cls: 'curve-ref' }],
      });
    }
    draw();
  },
};

function fmtP(p) { return String(Number(p.toPrecision(3))); }
