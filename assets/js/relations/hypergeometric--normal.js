// Hypergeometric -> Normal: the central limit theorem for sampling without replacement.
// Hand-written demo: hypergeometric stems with the normal curve that uses the finite-population correction
// (and, optionally, the one that ignores it), the two CDFs with the largest gap, and the gap against the
// population size N on a logarithmic axis with a draggable marker.

import { getRelation } from '../catalog.js';

const REL = getRelation('hypergeometric--normal');
const N_MIN = 20, N_MAX = 20000;

/** Hypergeometric probabilities on the support [lo, hi], as an array indexed from lo. Counts more than 12 standard
 *  deviations from the mean (total probability below 1e-20) are left out, which keeps large N fast. */
function hypTable(N, K, n, logBinom) {
  const mu = n * K / N, sd = Math.sqrt(n * (K / N) * (1 - K / N) * (N - n) / Math.max(1, N - 1));
  const lo = Math.max(0, n + K - N, Math.floor(mu - 12 * sd - 2)), hi = Math.min(n, K, Math.ceil(mu + 12 * sd + 2)), c = logBinom(N, n);
  const pm = [];
  for (let k = lo; k <= hi; k++) pm.push(Math.exp(logBinom(K, k) + logBinom(N - K, n - k) - c));
  return { lo, hi, pm };
}
const sizes = ({ N, f, q }) => {
  const n = Math.max(1, Math.min(N - 1, Math.round(f * N)));
  const K = Math.max(1, Math.min(N - 1, Math.round(q * N)));
  return { N, n, K };
};
const moments = ({ N, n, K }) => {
  const p = K / N, mu = n * p, vb = n * p * (1 - p), fpc = (N - n) / (N - 1);
  return { mu, sd: Math.sqrt(vb * fpc), sdNoFpc: Math.sqrt(vb), fpc };
};

/** Largest gap between the hypergeometric step CDF and a normal CDF. */
function cdfGap(tab, mu, sd, shift, normalCdf) {
  let F = 0, best = { d: 0, x: tab.lo, Fh: 0, Fn: 0 };
  for (let i = 0; i < tab.pm.length; i++) {
    const k = tab.lo + i;
    const Fn = normalCdf((k + shift - mu) / sd);
    // just before the jump at k (without the continuity correction the curve is compared with both sides of
    // every step; with it, the corrected curve is compared with the CDF at the whole numbers only)
    const before = shift ? 0 : Math.abs(F - Fn);
    if (before > best.d) best = { d: before, x: k, Fh: F, Fn };
    F += tab.pm[i];
    const at = Math.abs(F - Fn);
    if (at > best.d) best = { d: at, x: k, Fh: F, Fn };
  }
  return best;
}

export default {
  id: 'hypergeometric--normal',
  from: 'hypergeometric',
  to: 'normal',
  title: 'The hypergeometric count is approximately normal when the population, its successes and the sample are all large',

  plain: [
    'Draw $n$ items without replacement from a population of $N$ items, $K$ of which are successes, and count the successes. When $N$, $K$ and $n$ are all large, the bar chart of this hypergeometric count looks like a bell curve. The matching normal distribution has the hypergeometric mean $nK/N$ and the hypergeometric variance, which is the binomial variance multiplied by the finite-population correction $(N - n)/(N - 1)$.',
    'The correction matters when the sample is a sizable fraction of the population. If you sample half of the population, the variance is about half the binomial variance, because what you did not draw is determined by what you did. The approximation needs the sample to stay below the whole population ($n/N$ below 1) and the proportion of successes to stay away from 0 and 1. This is the central limit theorem for sampling without replacement, which underlies large-sample confidence intervals in survey sampling and the normal approximations used in place of Fisher’s exact test.',
  ],

  statementTex: REL.statement,
  glossary: [
    { sym: 'X', meaning: 'The hypergeometric count: the number of successes among the $n$ items drawn.' },
    { sym: 'N,\\ n,\\ K \\to \\infty', meaning: 'The population size, the number of draws and the number of successes in the population all grow without bound.' },
    { sym: 'n/N \\to f \\in [0, 1)', meaning: 'The sampling fraction settles at a value $f$ that is less than 1, so a share of the population always remains undrawn. ($f = 0$ is allowed: the sample may be a vanishing fraction of a huge population.)' },
    { sym: 'K/N \\to q \\in (0, 1)', meaning: 'The proportion of successes in the population settles at a value $q$ strictly between 0 and 1.' },
    { sym: 'nK/N', meaning: 'The mean of the hypergeometric count.' },
    { sym: 'n\\frac{K}{N}\\left(1 - \\frac{K}{N}\\right)', meaning: 'The binomial variance $np(1-p)$ with $p = K/N$: the variance if the items were drawn with replacement.' },
    { sym: '\\frac{N - n}{N - 1}', meaning: 'The finite-population correction. It is below 1 and close to $1 - f$ for large $N$.' },
    { sym: '\\frac{X - nK/N}{\\sqrt{\\cdots}}', meaning: 'The standardized count: its distance from the mean in units of the hypergeometric standard deviation.' },
    { sym: '\\xrightarrow{d}', meaning: 'Converges in distribution: for every $z$, the probability that the standardized count is at most $z$ approaches $\\Phi(z)$, the standard normal CDF.' },
    { sym: '\\mathcal N(0, 1)', meaning: 'The standard normal distribution, with mean 0 and standard deviation 1.' },
  ],

  why: [
    'Label the population items $1, \\dots, N$ and let $c_i = 1$ if item $i$ is a success and 0 otherwise. A sample drawn without replacement picks $n$ distinct items at random, and $X$ is the sum of their $c_i$. The draws are not independent, so the ordinary central limit theorem does not apply directly, but the dependence is weak and spread evenly over all pairs of draws. Each draw is a success with probability $K/N$, and two different draws have covariance $-\\frac{K(N-K)}{N^2(N-1)}$. Adding the $n$ variances and the $n(n-1)$ covariances gives',
    { tex: '\\mathrm{Var}(X) = n\\frac{K}{N}\\Big(1 - \\frac{K}{N}\\Big) - n(n-1)\\frac{K(N-K)}{N^2(N-1)} = n\\frac{K}{N}\\Big(1 - \\frac{K}{N}\\Big)\\frac{N - n}{N - 1}.' },
    'The finite-population central limit theorem (Erdős and Rényi, 1959; Hájek, 1960) shows that a sum of a simple random sample is approximately normal provided the variance $\\mathrm{Var}(X)$ grows without bound, which here happens when $n$, $K$ and $N - K$ grow and $n/N$ stays below 1. If instead $n/N \\to 1$, the undrawn part is small and the count is determined by a few items, so the normal approximation fails; this is why the statement asks for $f < 1$.',
    'A second view uses the binomial. When $n/N \\to 0$, the hypergeometric is close to $\\mathrm{Bin}(n, K/N)$, which is approximately normal by the de Moivre–Laplace theorem, and the correction factor tends to 1. When $n/N$ stays near a value $f > 0$, the binomial is no longer a good approximation, but the normal with the corrected variance still is. As with the binomial, adding $\\tfrac12$ before standardizing (the continuity correction) usually improves the approximation, and the largest CDF gap shrinks roughly like one over the standard deviation.',
  ],

  references: [
    { text: 'Wikipedia: Hypergeometric distribution, normal approximation.', url: 'https://en.wikipedia.org/wiki/Hypergeometric_distribution' },
    { text: 'Wikipedia: Finite population correction (in Standard error).', url: 'https://en.wikipedia.org/wiki/Standard_error#Finite_population_correction_(FPC)' },
    { text: 'Hájek, J. (1960). Limiting distributions in simple random sampling from a finite population. <i>Publications of the Mathematical Institute of the Hungarian Academy of Sciences</i>, 5, 361–374.' },
    { text: 'Erdős, P., & Rényi, A. (1959). On the central limit theorem for samples from a finite population. <i>Publications of the Mathematical Institute of the Hungarian Academy of Sciences</i>, 4, 49–61.' },
    { text: 'Cochran, W. G. (1977). <i>Sampling Techniques</i> (3rd ed.), Chapters 2–3. Wiley.' },
    { text: 'Johnson, N. L., Kemp, A. W., & Kotz, S. (2005). <i>Univariate Discrete Distributions</i> (3rd ed.), Chapter 6. Wiley.' },
    { text: 'Leemis, L. M., & McQueston, J. T. (2008). Univariate distribution relationships. <i>The American Statistician</i>, 62(1), 45–53.', url: 'https://doi.org/10.1198/000313008X270448' },
  ],

  demo(container, { math, plot, ui }) {
    const { h } = ui;
    const params = [
      { key: 'N', sym: 'N', name: 'population size', meaning: 'Total number of items. The limit lets $N$ (and with it $n$ and $K$) grow without bound.', min: N_MIN, max: N_MAX, default: 60, integer: true, log: true },
      { key: 'f', sym: 'n/N', name: 'sampling fraction', meaning: 'The share of the population that is drawn; $n$ is $fN$ rounded to a whole number.', min: 0.01, max: 0.95, default: 0.3, step: 0.01 },
      { key: 'q', sym: 'K/N', name: 'success fraction', meaning: 'The share of the population that are successes; $K$ is $qN$ rounded to a whole number.', min: 0.02, max: 0.98, default: 0.4, step: 0.01 },
    ];
    const defaults = { N: 60, f: 0.3, q: 0.4 };
    const store = ui.createStore({ ...defaults, cc: true, nofpc: true });

    const pmfBox = h('div'), cdfBox = h('div'), gapBox = h('div');
    const readout = h('p', { class: 'demo-readout', 'aria-live': 'polite' });
    const controls = h('div', { class: 'demo-controls' });
    container.append(
      ui.rich('p', 'The stems are the hypergeometric probabilities and the dashed curve is the normal density with the same mean and the same variance, which includes the finite-population correction $(N - n)/(N - 1)$. The thin solid curve is the normal density that leaves this correction out and uses the binomial variance. Increase $N$ with the box, or drag the amber marker on the lower plot, while the fractions $n/N$ and $K/N$ stay fixed. Raise $n/N$ to see why the finite-population correction is needed. The continuity correction (on by default) is a different, separate adjustment: the normal CDF is evaluated at $k + \\tfrac12$, halfway between two possible counts, which removes most of the gap caused by comparing a staircase with a smooth curve.', { class: 'small muted demo-intro' }),
      h('div', { class: 'demo-grid' },
        h('figure', { class: 'plot-fig' }, h('figcaption', {}, 'Hypergeometric probabilities and the normal curves'), pmfBox),
        h('figure', { class: 'plot-fig' }, h('figcaption', {}, 'The two CDFs (hypergeometric, and normal with the finite-population correction)'), cdfBox)),
      readout, controls,
      h('figure', { class: 'plot-fig', style: 'margin-top:1.2rem' },
        ui.rich('figcaption', 'Largest CDF gap for every population size $N$ (logarithmic axis) at these fractions; drag the marker to change $N$'), gapBox));

    const panel = ui.paramPanel(controls, params, {
      get: () => store.get(),
      apply: (k, v) => store.set({ [k]: v }),
      onReset: () => store.set({ ...defaults }),
    });
    const cc = ui.toggleSwitch('Continuity correction (shift the normal CDF by ½)', true, on => store.set({ cc: on }));
    const nf = ui.toggleSwitch('Also show the normal curve without the finite-population correction', true, on => store.set({ nofpc: on }));
    controls.append(h('div', { style: 'display:grid;gap:.5rem' }, cc.el, nf.el));

    const pmfPlot = new plot.Plot(pmfBox, { xLabel: 'k (successes drawn)', yLabel: 'probability' });
    const cdfPlot = new plot.Plot(cdfBox, { xLabel: 'k', yLabel: 'F(k)' });
    const gapPlot = new plot.Plot(gapBox, { xLabel: 'population size N (logarithmic scale)', yLabel: 'max gap', xTicks: false, height: w => Math.max(180, Math.min(250, w * 0.3)) });
    const L0 = Math.log10(N_MIN), L1 = Math.log10(N_MAX);

    let gapCache = { key: '', pts: [] };
    function gapCurve(s) {
      const key = [s.f, s.q, s.cc].join('|');
      if (gapCache.key !== key) {
        const pts = [];
        for (let i = 0; i <= 70; i++) {
          const N = Math.round(Math.pow(10, L0 + (L1 - L0) * i / 70));
          const z = sizes({ N, f: s.f, q: s.q }), m = moments(z);
          pts.push([Math.log10(N), cdfGap(hypTable(z.N, z.K, z.n, math.logBinom), m.mu, m.sd, s.cc ? 0.5 : 0, math.normalCdf).d]);
        }
        gapCache = { key, pts };
      }
      return gapCache.pts;
    }

    let raf = 0;
    const request = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; draw(); }); };
    store.subscribe(() => { panel.update(store.get()); request(); });

    function draw() {
      const s = store.get();
      const z = sizes(s), m = moments(z);
      const tab = hypTable(z.N, z.K, z.n, math.logBinom);
      const wide = Math.max(m.sd, m.sdNoFpc);
      const lo = Math.max(tab.lo, Math.floor(m.mu - 4.5 * wide) - 1), hi = Math.min(tab.hi, Math.ceil(m.mu + 4.5 * wide) + 1);
      const xd = [lo - 0.7, hi + 0.7];
      const stems = [];
      for (let k = lo; k <= hi; k++) stems.push([k, tab.pm[k - tab.lo]]);
      const npdf = sd => x => math.normalPdf((x - m.mu) / sd) / sd;
      const top = Math.max(...stems.map(v => v[1]), npdf(m.sd)(m.mu)) * 1.15;
      const layers = [{ id: 'pmf', type: 'stems', points: stems, cls: 'pmf' }];
      if (s.nofpc) layers.push({ id: 'nofpc', type: 'line', points: plot.sampleFn(npdf(m.sdNoFpc), xd[0], xd[1], 300), cls: 'curve-2 curve-thin' });
      layers.push({ id: 'norm', type: 'line', points: plot.sampleFn(npdf(m.sd), xd[0], xd[1], 300), cls: 'curve-ref' });
      const legend = [
        { label: `Hypergeometric(N = ${z.N}, K = ${z.K}, n = ${z.n})`, cls: 'curve-main' },
        { label: `Normal(mean ${ui.fmt(m.mu, 4)}, sd ${ui.fmt(m.sd, 3)}): with the finite-population correction`, cls: 'curve-ref' },
      ];
      if (s.nofpc) legend.push({ label: `Normal(mean ${ui.fmt(m.mu, 4)}, sd ${ui.fmt(m.sdNoFpc, 3)}): binomial variance, no finite-population correction`, cls: 'curve-2' });
      pmfPlot.render({ x: xd, y: [0, Math.min(1.08, top)], discreteX: true, layers, legend });

      const shift = s.cc ? 0.5 : 0;
      const gap = cdfGap(tab, m.mu, m.sd, shift, math.normalCdf);
      const gapNo = cdfGap(tab, m.mu, m.sdNoFpc, shift, math.normalCdf);
      const steps = [];
      let F = 0;
      for (let k = tab.lo; k <= hi; k++) { F += tab.pm[k - tab.lo]; if (k >= lo) steps.push([k, F]); }
      let F0 = 0; for (let k = tab.lo; k < lo; k++) F0 += tab.pm[k - tab.lo];
      const cl = [
        { id: 'one', type: 'hline', y: 1, cls: 'ref-line' },
        { id: 'hyp', type: 'step', points: steps, x0: xd[0], y0: F0, cls: 'curve-main' },
        { id: 'norm', type: 'line', points: plot.sampleFn(x => math.normalCdf((x + shift - m.mu) / m.sd), xd[0], xd[1], 300), cls: 'curve-ref' },
      ];
      if (gap.x >= xd[0] && gap.x <= xd[1]) {
        cl.push({ id: 'gap', type: 'segment', x1: gap.x, y1: gap.Fh, x2: gap.x, y2: gap.Fn, cls: 'guide' });
        cl.push({ id: 'gap-dot', type: 'dot', x: gap.x, y: gap.Fh, r: 4.5, cls: 'marker' });
      }
      cdfPlot.render({ x: xd, y: [-0.02, 1.06], discreteX: true, layers: cl });

      ui.renderRich(readout,
        `$n$ = <b>${z.n}</b> draws from $N$ = ${z.N} items with $K$ = ${z.K} successes. `
        + `Finite-population correction $(N - n)/(N - 1)$ = <b>${ui.fmt(m.fpc, 3)}</b>. `
        + `Largest gap between the hypergeometric CDF and the normal CDF with this variance: <b>${ui.fmt(gap.d, 3)}</b> at $k$ = ${gap.x}; `
        + `with the binomial variance (no finite-population correction) it would be <b>${ui.fmt(gapNo.d, 3)}</b>.`);

      const gc = gapCurve(s);
      const gmax = Math.max(0.002, ...gc.map(v => v[1])) * 1.15;
      const lx = Math.log10(s.N);
      const gl = [];
      for (const v of [100, 1000, 10000]) {
        gl.push({ id: 'g' + v, type: 'vline', x: Math.log10(v), cls: 'ref-line' });
        gl.push({ id: 't' + v, type: 'text', x: Math.log10(v), y: gmax * 0.9, text: `N = ${v.toLocaleString('en-US')}`, anchor: 'start', dx: 4 });
      }
      gl.push({ id: 'gap', type: 'line', points: gc, cls: 'curve-main' });
      gl.push({ id: 'rt', type: 'line', points: gc.map(([x]) => [x, gc[0][1] * Math.sqrt(Math.pow(10, L0 - x))]), cls: 'curve-ref' });
      gl.push({ id: 'now', type: 'dot', x: lx, y: gap.d, r: 5, cls: 'marker' });
      gapPlot.render({
        x: [L0 - 0.05, L1 + 0.05], y: [0, gmax], layers: gl,
        handles: [{
          id: 'N', type: 'xPoint', x: lx, label: 'N', lineTo: gap.d,
          ariaLabel: 'Population size N. Drag left or right, or use the arrow keys.', valueText: String(s.N), valueNow: s.N, valueMin: N_MIN, valueMax: N_MAX,
          onDrag: pt => { if (pt) store.set({ N: Math.round(Math.pow(10, math.clamp(pt.x, L0, L1))) }); },
          onKey: steps2 => store.set({ N: Math.round(math.clamp(store.get().N * Math.pow(1.1, steps2), N_MIN, N_MAX)) }),
        }],
        legend: [{ label: 'largest CDF gap', cls: 'curve-main' }, { label: 'a curve proportional to 1/√N, for comparison', cls: 'curve-ref' }],
      });
    }
    draw();
  },
};
