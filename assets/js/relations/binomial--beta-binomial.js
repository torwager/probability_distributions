// Binomial -> Beta-binomial: if the success probability p is drawn from Beta(alpha, beta) and then
// X | p ~ Bin(n, p), X is beta-binomial. As alpha + beta -> infinity with alpha/(alpha + beta) -> p,
// the beta-binomial approaches Bin(n, p).
// Hand-written demo: the Beta mixing density (drag its mean and spread), the beta-binomial PMF with
// simulated two-stage draws and the binomial with the same mean, and the distance as alpha + beta grows.

import { getRelation } from '../catalog.js';

const REL = getRelation('binomial--beta-binomial');
const CONC_MIN = 0.2, CONC_MAX = 2000;

export default {
  id: 'binomial--beta-binomial',
  from: 'binomial',
  to: 'beta-binomial',
  title: 'A binomial count whose success probability varies according to a Beta distribution is beta-binomial',

  summary: 'If the success probability of a binomial count varies from unit to unit according to a $\\mathrm{Beta}(\\alpha, \\beta)$ distribution, the counts are beta-binomial. They have the same mean as a binomial with $p = \\alpha/(\\alpha + \\beta)$ but, for more than one trial, a larger variance (overdispersion).',

  plain: [
    'A binomial count assumes that every trial has the same success probability $p$. Often that is not true across units: some patients are more likely to respond than others, some participants are better at a task, some batches have more defects. If each unit first gets its own success probability, drawn from a $\\mathrm{Beta}(\\alpha, \\beta)$ distribution, and then produces a binomial count with that probability, the counts follow a beta-binomial distribution.',
    'The beta-binomial has the same mean as the binomial with $p = \\alpha/(\\alpha + \\beta)$, but a larger variance, because the variation in $p$ between units adds to the binomial variation within a unit. This extra spread is called overdispersion. The sum $\\alpha + \\beta$ controls how much $p$ varies: when it is large the Beta distribution is concentrated near its mean, every unit has nearly the same $p$, and the beta-binomial turns back into the binomial. In Bayesian terms, the beta-binomial is the prior predictive distribution of a binomial count when $p$ has a Beta prior (and the posterior predictive distribution after updating the prior).',
  ],

  statementTex: REL.statement,
  glossary: [
    { sym: 'p \\sim \\mathrm{Beta}(\\alpha, \\beta)', meaning: 'The success probability is itself random, drawn from a Beta distribution on the interval from 0 to 1.' },
    { sym: '\\alpha,\\ \\beta', meaning: 'The two positive shape parameters of the Beta distribution. They act like prior counts of successes and failures: the Beta mean is $\\alpha/(\\alpha + \\beta)$.' },
    { sym: 'X \\mid p \\sim \\mathrm{Bin}(n, p)', meaning: 'Given the drawn value of $p$, the count $X$ is binomial with $n$ trials and success probability $p$.' },
    { sym: 'n', meaning: 'The number of trials for each unit.' },
    { sym: '\\Rightarrow', meaning: 'Implies.' },
    { sym: 'X \\sim \\mathrm{BetaBin}(n, \\alpha, \\beta)', meaning: 'Averaged over the random $p$, the count has the beta-binomial distribution, $P(X = k) = \\binom{n}{k} \\frac{B(k + \\alpha,\\ n - k + \\beta)}{B(\\alpha, \\beta)}$, where $B$ is the beta function.' },
    { sym: '\\alpha + \\beta \\to \\infty', meaning: 'The concentration of the Beta distribution grows without bound, so its spread shrinks to zero.' },
    { sym: '\\alpha/(\\alpha + \\beta) \\to p', meaning: 'The Beta mean settles at a fixed value $p$, which becomes the success probability of the limiting binomial.' },
    { sym: '\\mathrm{BetaBin}(n, \\alpha, \\beta) \\to \\mathrm{Bin}(n, p)', meaning: 'In that limit, the beta-binomial probabilities approach the binomial probabilities.' },
  ],

  why: [
    'Averaging the binomial probabilities over the Beta density of $p$ gives the beta-binomial probabilities. The powers of $p$ and $1 - p$ combine into another Beta integral:',
    { tex: 'P(X = k) = \\int_0^1 \\binom{n}{k} p^{k} (1-p)^{n-k} \\cdot \\frac{p^{\\alpha-1}(1-p)^{\\beta-1}}{B(\\alpha, \\beta)}\\, dp = \\binom{n}{k}\\frac{B(k + \\alpha,\\ n - k + \\beta)}{B(\\alpha, \\beta)},' },
    'where $B(a, b) = \\int_0^1 t^{a-1}(1-t)^{b-1}\\,dt = \\Gamma(a)\\Gamma(b)/\\Gamma(a+b)$ is the beta function.',
    'The mean and variance follow from the laws of total expectation and total variance. Write $\\pi = \\alpha/(\\alpha + \\beta)$ for the Beta mean. Then $\\mathrm{E}[X] = \\mathrm{E}[np] = n\\pi$, the binomial mean, and',
    { tex: '\\mathrm{Var}(X) = \\underbrace{\\mathrm{E}[np(1-p)]}_{\\text{within units}} + \\underbrace{\\mathrm{Var}(np)}_{\\text{between units}} = n\\pi(1-\\pi)\\Big[1 + \\frac{n - 1}{\\alpha + \\beta + 1}\\Big].' },
    'The factor in brackets is the overdispersion: how many times larger the variance is than the binomial variance $n\\pi(1-\\pi)$. It equals $1 + (n-1)\\rho$, where $\\rho = 1/(\\alpha + \\beta + 1)$ is the correlation between two trials of the same unit. As $\\alpha + \\beta \\to \\infty$ with $\\pi$ fixed, the Beta variance $\\pi(1-\\pi)/(\\alpha + \\beta + 1)$ goes to 0, so $p$ is effectively fixed at $\\pi$, the overdispersion factor goes to 1, and the beta-binomial probabilities converge to the binomial ones. At the other extreme, $\\alpha = \\beta = 1$ makes $p$ uniform and every count from 0 to $n$ equally likely (the discrete uniform distribution).',
  ],

  references: [
    { text: 'Wikipedia: Beta-binomial distribution.', url: 'https://en.wikipedia.org/wiki/Beta-binomial_distribution' },
    { text: 'Gelman, A., Carlin, J. B., Stern, H. S., Dunson, D. B., Vehtari, A., & Rubin, D. B. (2013). <i>Bayesian Data Analysis</i> (3rd ed.), Sections 2.4 and 5.3 and Appendix A. CRC Press.', url: 'http://www.stat.columbia.edu/~gelman/book/' },
    { text: 'Casella, G., & Berger, R. L. (2002). <i>Statistical Inference</i> (2nd ed.), Section 4.4 (hierarchical models and mixture distributions, including the beta-binomial hierarchy). Duxbury.' },
    { text: 'Johnson, N. L., Kemp, A. W., & Kotz, S. (2005). <i>Univariate Discrete Distributions</i> (3rd ed.), Section 6.2.2. Wiley.' },
    { text: 'Leemis, L. M., & McQueston, J. T. (2008). Univariate distribution relationships. <i>The American Statistician</i>, 62(1), 45–53.', url: 'https://doi.org/10.1198/000313008X270448' },
  ],

  demo(container, { math, plot, ui }) {
    const { h } = ui;
    const params = [
      { key: 'n', sym: 'n', name: 'number of trials', meaning: 'Number of trials for each unit.', min: 1, max: 50, default: 12, integer: true },
      { key: 'mean', sym: '\\pi', name: 'mean of p', meaning: 'The mean of the Beta distribution of $p$, $\\pi = \\alpha/(\\alpha + \\beta)$. The limiting binomial has $p = \\pi$.', min: 0.02, max: 0.98, default: 0.3, step: 0.01 },
      { key: 'conc', sym: '\\alpha + \\beta', name: 'concentration', meaning: 'How tightly the Beta distribution is concentrated around its mean. The limit in the statement is $\\alpha + \\beta \\to \\infty$.', min: CONC_MIN, max: CONC_MAX, default: 4, log: true },
    ];
    const defaults = { n: 12, mean: 0.3, conc: 4 };
    const store = ui.createStore({ ...defaults, seed: 1 });

    const betaBox = h('div'), countBox = h('div'), tvBox = h('div');
    const readout = h('p', { class: 'demo-readout', 'aria-live': 'polite' });
    const controls = h('div', { class: 'demo-controls' });
    const again = h('button', { type: 'button', class: 'btn small-btn' }, 'Draw new samples');
    again.addEventListener('click', () => store.set({ seed: store.get().seed + 1 }));
    // the plots come first (visible on a laptop screen); the explanation follows the controls
    container.append(
      h('div', { class: 'demo-grid' },
        h('figure', { class: 'plot-fig' }, ui.rich('figcaption', 'Mixing distribution $\\mathrm{Beta}(\\alpha, \\beta)$ of the success probability'), betaBox),
        h('figure', { class: 'plot-fig' }, ui.rich('figcaption', 'Counts: $\\mathrm{BetaBin}(n, \\alpha, \\beta)$ and $\\mathrm{Bin}(n, \\pi)$'), countBox)),
      readout, controls,
      h('figure', { class: 'plot-fig', style: 'margin-top:1.2rem' },
        ui.rich('figcaption', 'Total variation distance between $\\mathrm{BetaBin}(n, \\alpha, \\beta)$ and $\\mathrm{Bin}(n, \\pi)$ as $\\alpha + \\beta$ grows (at this $n$ and $\\pi$)'), tvBox),
      ui.rich('p', 'Left: the Beta distribution from which each unit draws its success probability $p$. Drag the amber line to move its mean $\\pi$, and the tip of the amber arrow to change its spread (one standard deviation), which sets $\\alpha + \\beta$. Right: the beta-binomial probabilities (stems), the frequencies of 2,000 simulated two-stage draws (bars: first $p$ from the Beta, then a binomial count), and the binomial with the same mean (grey stems). Make the Beta narrow, or raise $\\alpha + \\beta$, and the beta-binomial closes in on the binomial.', { class: 'small muted demo-intro' }));

    const panel = ui.paramPanel(controls, params, {
      get: () => store.get(),
      apply: (key, v) => store.set({ [key]: v }),
      onReset: () => store.set({ ...defaults }),
    });
    controls.append(h('div', { class: 'demo-sim-ctl' }, h('h3', { class: 'mini-title' }, 'Simulation'), again));

    const betaPlot = new plot.Plot(betaBox, { xLabel: 'success probability p', yLabel: 'density', height: (w, H) => plot.fitHeight(w, H, { ratio: 0.62, phoneRatio: 0.7, min: 220, max: 400 }) });
    const countPlot = new plot.Plot(countBox, { xLabel: 'k (number of successes)', yLabel: 'probability', height: (w, H) => plot.fitHeight(w, H, { ratio: 0.62, phoneRatio: 0.7, min: 220, max: 400 }) });
    const tvPlot = new plot.Plot(tvBox, { xLabel: 'α + β (logarithmic scale)', yLabel: 'distance', xTicks: false, height: w => Math.max(180, Math.min(250, w * 0.3)) });

    const ab = ({ mean, conc }) => [mean * conc, (1 - mean) * conc];
    const betaPdf = (x, a, b) => (x <= 0 || x >= 1 ? NaN : Math.exp((a - 1) * Math.log(x) + (b - 1) * Math.log1p(-x) - math.lbeta(a, b)));
    const bbPmfs = (n, a, b) => { const out = []; for (let k = 0; k <= n; k++) out.push(Math.exp(math.logBinom(n, k) + math.lbeta(k + a, n - k + b) - math.lbeta(a, b))); return out; };
    const binPmfs = (n, p) => { const out = []; for (let k = 0; k <= n; k++) out.push(Math.exp(math.logBinom(n, k) + k * Math.log(p) + (n - k) * Math.log1p(-p))); return out; };
    const tv = (u, v) => 0.5 * u.reduce((s, x, i) => s + Math.abs(x - v[i]), 0);
    const sdOf = ({ mean, conc }) => Math.sqrt(mean * (1 - mean) / (conc + 1));

    let sim = { key: '', freq: [], m: 0, v: 0 };
    function simulate(s) {
      const key = JSON.stringify([s.n, s.mean, s.conc, s.seed]);
      if (sim.key !== key) {
        const [a, b] = ab(s);
        const rng = math.makeRng(4242 + 13 * s.seed);
        const counts = new Array(s.n + 1).fill(0), N = 2000;
        let m = 0, m2 = 0;
        for (let i = 0; i < N; i++) {
          const p = rng.beta(a, b);
          const x = rng.binomial(s.n, Math.min(1, Math.max(0, p)));
          counts[x]++; m += x; m2 += x * x;
        }
        m /= N;
        sim = { key, freq: counts.map(c => c / N), m, v: (m2 - N * m * m) / (N - 1) };
      }
      return sim;
    }

    let raf = 0;
    const request = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; draw(); }); };
    store.subscribe(() => { panel.update(store.get()); request(); });

    let dragSd = null;
    function draw() {
      const s = store.get();
      const { n, mean } = s;
      const [a, b] = ab(s);
      const sd = sdOf(s);

      // ---- Beta density
      const pts = plot.sampleFn(x => betaPdf(x, a, b), 0.0005, 0.9995, 400);
      const inner = pts.filter(q => q[0] > 0.03 && q[0] < 0.97).map(q => q[1]).filter(Number.isFinite);
      let ymax = Math.max(...pts.map(q => q[1]).filter(Number.isFinite));
      const im = Math.max(...inner);
      if (ymax > 3 * im) ymax = 1.6 * im;              // densities that blow up at 0 or 1 (a shape below 1)
      ymax *= 1.15;
      const dir = mean <= 0.5 ? 1 : -1;                 // the arrow points toward the middle of the interval
      const xs = mean + dir * sd;
      const ys = Math.min(betaPdf(xs, a, b), 0.85 * ymax);
      betaPlot.render({
        x: [0, 1], y: [0, ymax],
        layers: [
          { id: 'fill', type: 'area', points: pts.map(([x, y]) => [x, Math.min(y, ymax * 2)]), cls: 'pdf-fill' },
          { id: 'pdf', type: 'line', points: pts, cls: 'curve-main' },
        ],
        handles: [
          {
            id: 'mean', type: 'vline', x: mean, label: 'π',
            ariaLabel: 'Mean success probability π. Drag left or right, or use the arrow keys.', valueText: ui.fmt(mean, 3), valueNow: mean, valueMin: 0.02, valueMax: 0.98,
            onDrag: pt => { if (pt) store.set({ mean: math.roundTo(math.clamp(pt.x, 0.02, 0.98), 0.005) }); },
            onKey: steps => store.set({ mean: math.roundTo(math.clamp(store.get().mean + 0.01 * steps, 0.02, 0.98), 0.01) }),
          },
          {
            id: 'sd', type: 'hArrow', from: { x: mean, y: ys }, to: { x: xs, y: ys }, label: 'sd',
            ariaLabel: 'Spread of the Beta distribution (one standard deviation). Drag to change α + β; the arrow keys change α + β.',
            valueText: ui.fmt(s.conc, 3), valueNow: s.conc, valueMin: CONC_MIN, valueMax: CONC_MAX,
            onDrag: (pt, phase) => {
              if (phase === 'start') dragSd = { mean: store.get().mean, dir };
              if (pt && dragSd) {
                const m = dragSd.mean;
                const d = Math.max(1e-4, dragSd.dir * (pt.x - m));
                const conc = math.clamp(m * (1 - m) / (d * d) - 1, CONC_MIN, CONC_MAX);
                store.set({ conc: Number(conc.toPrecision(3)) });
              }
              if (phase === 'end') dragSd = null;
            },
            onKey: steps => store.set({ conc: Number(math.clamp(store.get().conc * Math.pow(1.1, steps), CONC_MIN, CONC_MAX).toPrecision(3)) }),
          },
        ],
        legend: [{ label: `Beta(α = ${ui.fmt(a, 3)}, β = ${ui.fmt(b, 3)})`, cls: 'curve-main' }],
      });

      // ---- counts
      const bb = bbPmfs(n, a, b), bin = binPmfs(n, mean);
      const sm = simulate(s);
      const top = Math.max(...bb, ...bin, ...sm.freq) * 1.15;
      countPlot.render({
        x: [-0.7, n + 0.7], y: [0, Math.min(1.08, top)], discreteX: true,
        layers: [
          { id: 'freq', type: 'bars', points: sm.freq.map((f, k) => [k, f]), width: 0.7, cls: 'bars-strong' },
          { id: 'bin', type: 'stems', points: bin.map((v, k) => [k, v]), cls: 'pmf-ref' },
          { id: 'bb', type: 'stems', points: bb.map((v, k) => [k, v]), cls: 'pmf' },
        ],
        legend: [
          { label: `BetaBin(n = ${n}, α = ${ui.fmt(a, 3)}, β = ${ui.fmt(b, 3)})`, cls: 'curve-main' },
          { label: 'simulated two-stage draws', cls: 'bars-strong' },
          { label: `Binomial(n = ${n}, p = ${ui.fmt(mean, 3)}), same mean`, cls: 'curve-ref' },
        ],
      });

      // ---- readout
      const vBin = n * mean * (1 - mean), factor = 1 + (n - 1) / (s.conc + 1);
      const d = tv(bb, bin);
      ui.renderRich(readout,
        `$\\alpha$ = <b>${ui.fmt(a, 3)}</b>, $\\beta$ = <b>${ui.fmt(b, 3)}</b>. Both distributions have mean $n\\pi$ = ${ui.fmt(n * mean, 4)}. `
        + `Variance: beta-binomial <b>${ui.fmt(vBin * factor, 4)}</b>, binomial ${ui.fmt(vBin, 4)}, so the overdispersion factor $1 + (n-1)/(\\alpha + \\beta + 1)$ is <b>${ui.fmt(factor, 3)}</b>. `
        + `The simulated counts have mean ${ui.fmt(sm.m, 4)} and variance ${ui.fmt(sm.v, 4)}. `
        + `Total variation distance between the beta-binomial and the binomial: <b>${ui.fmt(d, 3)}</b>.`
        + (Math.abs(a - 1) < 0.02 && Math.abs(b - 1) < 0.02 ? ' With $\\alpha = \\beta = 1$ the Beta is flat and every count from 0 to $n$ has probability $1/(n+1)$.' : ''));

      // ---- distance against alpha + beta
      const c = tvCurve(n, mean);
      const tmax = Math.max(...c.map(q => q[1])) * 1.12 || 0.1;
      const lx = Math.log10(s.conc);
      const layers = [];
      for (const v of [1, 10, 100, 1000]) {
        layers.push({ id: 'g' + v, type: 'vline', x: Math.log10(v), cls: 'ref-line' });
        layers.push({ id: 't' + v, type: 'text', x: Math.log10(v), y: tmax * 0.93, text: `α + β = ${v}`, anchor: v === 1000 ? 'end' : 'start', dx: v === 1000 ? -4 : 4, cls: 'small' });
      }
      layers.push({ id: 'tv', type: 'line', points: c, cls: 'curve-main' });
      layers.push({ id: 'now', type: 'dot', x: lx, y: d, r: 5, cls: 'marker' });
      tvPlot.render({ x: [Math.log10(CONC_MIN) - 0.05, Math.log10(CONC_MAX) + 0.05], y: [0, tmax], layers });
    }

    let tvCache = { key: '', pts: [] };
    function tvCurve(n, mean) {
      const key = n + '|' + mean;
      if (tvCache.key !== key) {
        const bin = binPmfs(n, mean), pts = [];
        for (let i = 0; i <= 120; i++) {
          const lc = Math.log10(CONC_MIN) + (Math.log10(CONC_MAX) - Math.log10(CONC_MIN)) * i / 120;
          const conc = Math.pow(10, lc);
          pts.push([lc, tv(bbPmfs(n, mean * conc, (1 - mean) * conc), bin)]);
        }
        tvCache = { key, pts };
      }
      return tvCache.pts;
    }

    draw();
  },
};
