// Normal increments -> Wald first-passage time (and the Wald -> normal approximation for large lambda/mu).
// Custom demo: simulate drifting random walks W(t) = v t + sigma B(t) built from normal increments, record the
// first time each reaches the threshold a, and compare the histogram of those times with the Wald density
// IG(a/v, a^2/sigma^2). The paths and the histogram share the time axis; a Play button animates the paths so
// that the histogram fills in as paths reach the threshold. Crossings between time steps are caught with the
// Brownian-bridge correction, so the step can adapt to the distance from the threshold (short steps near it,
// long steps far below it) without biasing the simulated times; see simulatePassages.

import { getRelation } from '../catalog.js';
import { waldPdf, waldCdf } from '../dists/wald.js';

const REL = getRelation('normal--wald');
const N_SHOWN = 30;

/**
 * Simulate `size` paths W(t) = v t + sigma B(t) from W(0) = 0 until they first reach the threshold a.
 * The normal increments over a step of length dt are exact, and a crossing between two grid points is
 * detected with the Brownian-bridge probability exp(-2 (a - w0)(a - w1) / (sigma^2 dt)), so the step can
 * be adapted to the distance from the threshold without biasing which step the crossing falls in: the
 * step is short (a small fraction of the spread and of the mode of the first-passage time) near the
 * threshold and grows when a path has wandered far below it. The only approximation left is the time of
 * the crossing inside the step, which is at most the short step length near the threshold.
 * Returns { times (Infinity for paths that had not arrived by tMax), sorted, paths (the first N_SHOWN, for
 * drawing), mu, lam, sd, dt (the shortest step), unfinished, tMax, tView }.
 */
export function simulatePassages({ v, a, sigma }, size, seed, math) {
  const mu = a / v, lam = a * a / (sigma * sigma);
  const sd = Math.sqrt(mu ** 3 / lam);
  const k = 1.5 * mu / lam, mode = mu * (Math.sqrt(1 + k * k) - k);
  const q = u => math.quantileContinuous(t => waldCdf(t, mu, lam), u, 0, Infinity, mu, sd);
  const tMax = q(0.99999), tView = q(0.985);
  const dtMin = Math.min(sd, mode, mu) / 150;          // resolution near the threshold
  const dtMax = Math.max(dtMin, tView / 500);           // largest step, far below the threshold
  const drawEvery = tView / 260;                        // spacing of the points kept for drawing
  const s2 = sigma * sigma;
  const rng = math.makeRng(seed);
  const times = new Float64Array(size);
  const paths = [];
  let unfinished = 0;
  for (let i = 0; i < size; i++) {
    let w = 0, t = 0, T = Infinity, nextDraw = drawEvery;
    const keep = i < N_SHOWN;
    const pts = keep ? [[0, 0]] : null;
    while (t < tMax) {
      // a step so short that the threshold is at least 5 noise standard deviations (plus the drift) away
      const d = a - w;
      const r = (-5 * sigma + Math.sqrt(25 * s2 + 4 * v * d)) / (2 * v);
      const dt = Math.min(dtMax, Math.max(dtMin, r * r));
      const w1 = w + v * dt + sigma * Math.sqrt(dt) * rng.normal();
      if (w1 >= a) { T = t + dt * (a - w) / (w1 - w); break; }
      if (Math.exp(-2 * (a - w) * (a - w1) / (s2 * dt)) > rng.random()) { T = t + 0.5 * dt; break; }
      w = w1; t += dt;
      if (keep && t >= nextDraw) { pts.push([t, w]); nextDraw = t + drawEvery; }
    }
    if (!Number.isFinite(T)) unfinished++;
    times[i] = T;
    if (keep) { if (Number.isFinite(T)) pts.push([T, a]); paths.push({ pts, T }); }
  }
  const sorted = Float64Array.from(times).sort();
  return { times, sorted, paths, mu, lam, sd, dt: dtMin, unfinished, tMax, tView };
}

export default {
  id: 'normal--wald',
  from: 'normal',
  to: 'wald',
  title: 'The first time a drifting random walk with normal steps reaches a threshold has a Wald (inverse Gaussian) distribution',

  summary: 'When a running total drifts toward a threshold in many small, normally distributed steps (a Brownian motion with drift), the time at which it first reaches the threshold has a Wald distribution. This is the single-boundary drift-diffusion model of response times.',

  plain: [
    'Accumulate evidence in many small, normally distributed steps that drift on average at rate $v$ toward a threshold $a$, with noise of standard deviation $\\sigma$ per unit time. In the limit of very small steps this running total is a Brownian motion with drift, $W(t) = vt + \\sigma B(t)$, where $B(t)$ is standard Brownian motion, a continuous random walk. At any fixed time $t$ the total is normal, with mean $vt$ and variance $\\sigma^2 t$.',
    'The time $T$ at which the running total first reaches the threshold has a Wald (inverse Gaussian) distribution with mean $a/v$ and shape $a^2/\\sigma^2$. This is the single-boundary version of the drift-diffusion model of response times. The two distributions answer opposite questions about the same process: the normal says where the walk is at a given time, the Wald says when it first gets to a given place. In the other direction, when the shape $\\lambda$ is large relative to the mean, the Wald distribution is itself approximately normal.',
  ],

  statementTex: REL.statement,
  glossary: [
    { sym: 'W(t)', meaning: 'The accumulated total (for example, evidence) at time $t$, starting from $W(0) = 0$.' },
    { sym: 'v', meaning: 'The drift rate: the average increase of the total per unit time. It must be positive for the threshold to be reached with certainty in finite mean time.' },
    { sym: '\\sigma', meaning: 'The noise standard deviation per unit time (the diffusion coefficient). Over a time step $h$ the noise has standard deviation $\\sigma\\sqrt h$.' },
    { sym: 'B(t)', meaning: 'Standard Brownian motion: a continuous random walk whose change over any time step $h$ is $\\mathcal N(0, h)$, independent of what happened before.' },
    { sym: 'h', meaning: 'A length of time (a time step).' },
    { sym: 'W(t+h) - W(t) \\sim \\mathcal N(vh, \\sigma^2 h)', meaning: 'Each increment of the total over a step of length $h$ is normal, with mean $vh$ and variance $\\sigma^2 h$.' },
    { sym: 'a', meaning: 'The threshold, $a > 0$. Accumulation stops when the total first reaches it.' },
    { sym: 'T = \\inf\\{t : W(t) = a\\}', meaning: 'The first-passage time: the first (smallest) time at which the total equals $a$.' },
    { sym: '\\mathrm{IG}(\\mu, \\lambda)', meaning: 'The inverse Gaussian (Wald) distribution with mean $\\mu$ and shape $\\lambda$.' },
    { sym: '\\mu = a/v', meaning: 'The mean first-passage time: threshold divided by drift.' },
    { sym: '\\lambda = a^2/\\sigma^2', meaning: 'The shape: threshold squared divided by the noise variance. Larger values give less variable, less skewed times.' },
    { sym: '\\frac{X - \\mu}{\\sqrt{\\mu^3/\\lambda}}', meaning: 'A Wald variable $X$ standardized by its mean $\\mu$ and its standard deviation $\\sqrt{\\mu^3/\\lambda}$.' },
    { sym: '\\lambda/\\mu \\to \\infty', meaning: 'The shape grows large relative to the mean; in accumulation terms $av/\\sigma^2 \\to \\infty$ (a high threshold or strong drift compared with the noise).' },
    { sym: '\\xrightarrow{d}', meaning: 'Converges in distribution.' },
    { sym: '\\mathcal N(0,1)', meaning: 'The standard normal distribution.' },
    { sym: '\\Rightarrow', meaning: 'Implies.' },
  ],

  why: [
    'A neat way to see the result uses an exponential martingale. For any number $s$, the quantity $\\exp\\big(sW(t) - (sv + \\tfrac12 s^2\\sigma^2)t\\big)$ has expected value 1 at every time, because $W(t)$ is normal with mean $vt$ and variance $\\sigma^2 t$. Stopping it at the first-passage time $T$, when $W(T) = a$, keeps the expected value at 1 (the optional stopping theorem):',
    { tex: '\\mathrm{E}\\Big[e^{sa - (sv + \\frac12 s^2\\sigma^2)T}\\Big] = 1.' },
    'Choosing $s$ so that $sv + \\tfrac12 s^2\\sigma^2 = \\theta$ gives the Laplace transform of $T$,',
    { tex: '\\mathrm{E}\\big[e^{-\\theta T}\\big] = \\exp\\!\\left[\\frac{av}{\\sigma^2}\\left(1 - \\sqrt{1 + \\frac{2\\sigma^2\\theta}{v^2}}\\right)\\right],' },
    'which is the Laplace transform of the inverse Gaussian distribution, $\\exp\\big[\\frac{\\lambda}{\\mu}\\big(1 - \\sqrt{1 + 2\\mu^2\\theta/\\lambda}\\big)\\big]$, with $\\mu = a/v$ and $\\lambda = a^2/\\sigma^2$. The density can also be found with the reflection principle, and it has a simple link to the normal: it is $a/t$ times the normal density of the position $W(t)$ evaluated at the threshold,',
    { tex: 'f_T(t) = \\frac{a}{t}\\cdot \\frac{1}{\\sigma\\sqrt{2\\pi t}} \\exp\\!\\left(-\\frac{(a - vt)^2}{2\\sigma^2 t}\\right).' },
    'The second statement, the normal approximation, follows from the additivity of first-passage times. Keep the drift and the noise fixed and raise the threshold to $na$ for a whole number $n$. Reaching $na$ means first reaching $a$, then climbing another $a$ from there, and so on, and because the walk has no memory the $n$ climbing times are independent and each has the distribution of $T$. So the time to reach $na$ is a sum of $n$ independent copies of $T$, which is $\\mathrm{IG}(n\\mu, n^2\\lambda)$, and by the central limit theorem it is approximately normal for large $n$. Along the way $\\lambda/\\mu$ grows in proportion to $n$, and the skewness $3\\sqrt{\\mu/\\lambda}$ shrinks to 0. The same holds for any route to $\\lambda/\\mu \\to \\infty$, because the standardized distribution depends on $\\lambda/\\mu$ only. When $\\lambda/\\mu$ is small (a low threshold or weak drift relative to the noise) the first-passage times are strongly right-skewed: most walks arrive early, but a walk that wanders downward first can take a very long time.',
  ],

  references: [
    { text: 'Wikipedia: Inverse Gaussian distribution, relationship with Brownian motion.', url: 'https://en.wikipedia.org/wiki/Inverse_Gaussian_distribution#Relationship_with_Brownian_motion' },
    { text: 'Wikipedia: First-hitting-time model.', url: 'https://en.wikipedia.org/wiki/First-hitting-time_model' },
    { text: 'Chhikara, R. S., &amp; Folks, J. L. (1989). <i>The Inverse Gaussian Distribution: Theory, Methodology, and Applications</i>, Chapter 2. Marcel Dekker.' },
    { text: 'Matzke, D., &amp; Wagenmakers, E.-J. (2009). Psychological interpretation of the ex-Gaussian and shifted Wald parameters: A diffusion model analysis. <i>Psychonomic Bulletin &amp; Review</i>, 16(5), 798–817.', url: 'https://doi.org/10.3758/PBR.16.5.798' },
    { text: 'Ratcliff, R., &amp; McKoon, G. (2008). The diffusion decision model: Theory and data for two-choice decision tasks. <i>Neural Computation</i>, 20(4), 873–922.', url: 'https://doi.org/10.1162/neco.2008.12-06-420' },
    { text: 'Leemis, L. M., &amp; McQueston, J. T. (2008). Univariate distribution relationships. <i>The American Statistician</i>, 62(1), 45–53.', url: 'https://doi.org/10.1198/000313008X270448' },
  ],

  demo(container, { math, plot, ui }) {
    const { h, fmt } = ui;
    const params = [
      { key: 'v', sym: 'v', name: 'drift rate', meaning: 'Average gain of the total per unit time.', min: 0.3, max: 4, default: 1.2, step: 0.05 },
      { key: 'a', sym: 'a', name: 'threshold', meaning: 'The level at which accumulation stops.', min: 0.3, max: 3, default: 1, step: 0.05 },
      { key: 'sigma', sym: '\\sigma', name: 'noise standard deviation', meaning: 'Standard deviation of the noise per unit time.', min: 0.2, max: 2, default: 1, step: 0.05 },
    ];
    const defaults = () => Object.fromEntries(params.map(q => [q.key, q.default]));
    const store = ui.createStore({ p: defaults(), size: 2000, seed: 1, normal: false, clock: Infinity });

    const pathBox = h('div'), histBox = h('div');
    const readout = h('p', { class: 'demo-readout', 'aria-live': 'polite' });
    const controls = h('div', { class: 'demo-controls' });
    container.append(
      h('div', { class: 'demo-grid' },
        h('figure', { class: 'plot-fig' }, h('figcaption', {}, 'Accumulation paths W(t) = vt + σB(t) and the threshold a'), pathBox),
        h('figure', { class: 'plot-fig' }, h('figcaption', {}, 'First-passage times of all simulated paths and the Wald density'), histBox)),
      readout, controls,
      ui.rich('p', 'Each thin line is one simulated accumulation path, built from many small normal steps with mean $v\\,dt$ and standard deviation $\\sigma\\sqrt{dt}$. A path stops when it first reaches the threshold $a$ (dashed amber line); the dots mark those first-passage times. The second plot collects the first-passage times of all simulated paths, on the same time axis, and compares them with the Wald density with $\\mu = a/v$ and $\\lambda = a^2/\\sigma^2$. Press <b>Play</b> to watch the histogram fill in as the paths arrive. Drag the amber arrow to change the threshold, and the amber knob where the average path $vt$ meets the threshold (at the mean time $a/v$) to change the drift.', { class: 'small muted demo-intro' }));

    const panel = ui.paramPanel(controls, params, {
      get: () => store.get().p,
      apply: (k, v) => setP({ [k]: v }),
      onReset: () => store.set({ p: defaults() }),
    });
    const sizeCtl = ui.segmented([500, 2000, 10000].map(n => ({ value: n, label: `${n.toLocaleString('en-US')} paths` })), 2000, v => store.set({ size: v, clock: Infinity }), 'Number of simulated paths');
    const again = h('button', { type: 'button', class: 'btn small-btn' }, 'Simulate new paths');
    again.addEventListener('click', () => { stopAnim(); store.set({ seed: store.get().seed + 1, clock: Infinity }); });
    const play = h('button', { type: 'button', class: 'btn small-btn', style: 'margin-left:.4rem' }, 'Play');
    play.addEventListener('click', () => (anim ? stopAnim() : startAnim()));
    const normalSw = ui.toggleSwitch('Show the normal approximation N(μ, μ³/λ)', false, on => store.set({ normal: on }));
    controls.append(h('div', { class: 'demo-sim-ctl' }, h('h3', { class: 'mini-title' }, 'Simulation'), sizeCtl.el, h('div', {}, again, play), h('div', { style: 'margin-top:.6rem' }, normalSw.el)));

    const height = (w, H) => plot.fitHeight(w, H, { ratio: 0.72, phoneRatio: 0.7, min: 200, max: 400 });
    const pathPlot = new plot.Plot(pathBox, { xLabel: 'time t', yLabel: 'W(t)', height });
    const histPlot = new plot.Plot(histBox, { xLabel: 'first-passage time t', yLabel: 'density', height });

    const clampP = (k, v) => { const q = params.find(x => x.key === k); return Math.min(q.max, Math.max(q.min, v)); };
    function setP(patch) {
      const p = { ...store.get().p };
      for (const [k, v] of Object.entries(patch)) if (Number.isFinite(v)) p[k] = Math.round(clampP(k, v) * 1000) / 1000;
      stopAnim();
      store.set({ p, clock: Infinity });
    }

    // ---- simulation (cached)
    let cache = { key: '' };
    function simulate(s) {
      const key = JSON.stringify([s.p, s.size, s.seed]);
      if (cache.key === key) return cache;
      cache = { key, ...simulatePassages(s.p, s.size, 4005 + s.seed, math) };
      return cache;
    }

    // ---- animation: a clock that sweeps the time axis
    let anim = null;
    function startAnim() {
      const c = simulate(store.get());
      const T0 = performance.now(), dur = 4500;
      play.textContent = 'Stop';
      anim = { raf: 0 };
      const tick = now => {
        const f = Math.min(1, (now - T0) / dur);
        store.set({ clock: f >= 1 ? Infinity : f * c.tView });
        if (f < 1 && anim) anim.raf = requestAnimationFrame(tick); else stopAnim();
      };
      anim.raf = requestAnimationFrame(tick);
    }
    function stopAnim() {
      if (anim) cancelAnimationFrame(anim.raf);
      anim = null;
      play.textContent = 'Play';
    }

    // ---- handles (the time axis stays fixed while one is dragged)
    let frozen = null;
    function handles(s, view) {
      const { v, a } = s.p;
      const mu = a / v;
      const wrapDrag = fn => (pt, phase) => {
        if (phase === 'start') frozen = view;
        if (pt) fn(pt);
        if (phase === 'end') { frozen = null; request(); }
      };
      return [
        {
          id: 'a', type: 'vArrow', from: { x: view.x[0] + 0.97 * (view.x[1] - view.x[0]), y: 0 }, to: { x: view.x[0] + 0.97 * (view.x[1] - view.x[0]), y: a }, label: 'a',
          ariaLabel: 'Threshold a. Drag up or down, or use the arrow keys.', valueText: fmt(a, 3), valueNow: a, valueMin: 0.3, valueMax: 3,
          onDrag: wrapDrag(pt => setP({ a: pt.y })),
          onKey: steps => setP({ a: a + 0.05 * steps }),
        },
        {
          id: 'v', type: 'point', at: { x: mu, y: a }, label: 'a/v',
          ariaLabel: 'Mean time a/v, where the average path meets the threshold. Drag left (faster drift) or right (slower drift), or use the arrow keys.',
          valueText: `v = ${fmt(v, 3)}`, valueNow: v, valueMin: 0.3, valueMax: 4,
          onDrag: wrapDrag(pt => setP({ v: a / Math.max(pt.x, 0.02) })),
          onKey: steps => setP({ v: v + 0.05 * steps }),
        },
      ];
    }

    let raf = 0;
    const request = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; draw(); }); };
    store.subscribe((s, prev) => { if (s.p !== prev.p) panel.update(s.p); request(); });

    function draw() {
      const s = store.get();
      const c = simulate(s);
      const { a, v } = s.p;
      const clock = s.clock;
      let x = [0, c.tView];
      if (frozen) x = frozen.x;
      // y range of the path plot: from a little below the lowest shown point up to above the threshold
      let ymin = 0;
      for (const P of c.paths) for (const [t, w] of P.pts) if (t <= x[1] && w < ymin) ymin = w;
      const yv = frozen ? frozen.y : [Math.max(ymin * 1.05, -2.5 * a) - 0.05 * a, a * 1.25];
      const view = { x, y: yv };

      const layers = [
        { id: 'zero', type: 'hline', y: 0, cls: 'ref-line' },
        { id: 'drift', type: 'segment', x1: 0, y1: 0, x2: x[1], y2: v * x[1], cls: 'mean-line' },
        { id: 'thr', type: 'hline', y: a, cls: 'guide' },
      ];
      c.paths.forEach((P, i) => {
        const pts = Number.isFinite(clock) ? P.pts.filter(q => q[0] <= clock) : P.pts;
        layers.push({ id: 'p' + i, type: 'line', points: pts, cls: 'curve-2 curve-thin' });
      });
      c.paths.forEach((P, i) => {
        if (Number.isFinite(P.T) && P.T <= clock) layers.push({ id: 'hit' + i, type: 'dot', x: P.T, y: a, r: 3, cls: '' });
      });
      if (Number.isFinite(clock)) layers.push({ id: 'clock', type: 'vline', x: clock, cls: 'guide' });
      const tl = 0.93 * Math.min(x[1], yv[1] / v);
      layers.push({ id: 'lab', type: 'text', x: tl, y: v * tl, dx: 8, dy: 4, anchor: 'start', text: 'average path vt', cls: '' });
      pathPlot.render({ x, y: yv, layers, handles: handles(s, view) });

      // histogram of first-passage times (only those that have arrived by the clock during the animation)
      const n = c.times.length;
      const bins = Math.max(15, Math.min(70, Math.round(Math.sqrt(n) * 0.9)));
      const arrived = Number.isFinite(clock) ? c.times.filter(t => t <= clock) : c.times;
      const hst = math.histogram(arrived, x[0], x[1], bins);
      const bars = hst.counts.map((k, i) => [hst.edges[i] + hst.width / 2, k / (n * hst.width)]);
      const dens = plot.sampleFn(t => waldPdf(t, c.mu, c.lam), x[0], x[1], 400);
      const fullH = math.histogram(c.times, x[0], x[1], bins).counts.map(k => k / (n * hst.width));
      const ymax = Math.max(...dens.map(d => d[1]).filter(Number.isFinite), Math.min(Math.max(...fullH), 3 * Math.max(...dens.map(d => d[1])))) * 1.12;
      const hl = [
        { id: 'hist', type: 'bars', points: bars, width: hst.width, cls: 'bars-strong' },
        { id: 'pdf', type: 'line', points: dens, cls: 'curve-main' },
      ];
      const legend = [{ label: 'simulated first-passage times', cls: 'bars-strong' }, { label: `Wald(μ = ${fmt(c.mu, 3)}, λ = ${fmt(c.lam, 3)}) density`, cls: 'curve-main' }];
      if (s.normal) {
        hl.push({ id: 'norm', type: 'line', points: plot.sampleFn(t => math.normalPdf((t - c.mu) / c.sd) / c.sd, x[0], x[1], 300), cls: 'curve-ref' });
        legend.push({ label: `Normal(mean ${fmt(c.mu, 3)}, sd ${fmt(c.sd, 3)})`, cls: 'curve-ref' });
      }
      if (Number.isFinite(clock)) hl.push({ id: 'clock', type: 'vline', x: clock, cls: 'guide' });
      histPlot.render({ x, y: [0, ymax], layers: hl, legend });

      // readout
      let m = 0, cnt = 0;
      for (const t of c.times) if (Number.isFinite(t)) { m += t; cnt++; }
      m /= cnt;
      let ss = 0; for (const t of c.times) if (Number.isFinite(t)) ss += (t - m) ** 2;
      const sdS = Math.sqrt(ss / (cnt - 1));
      let gap = 0;
      for (let i = 0; i < n; i++) {
        const F = waldCdf(c.sorted[i], c.mu, c.lam);
        gap = Math.max(gap, Math.abs((i + 1) / n - F), Math.abs(i / n - F));
      }
      const crit = 1.358 / Math.sqrt(n);
      let ngap = 0;
      for (let i = 0; i <= 400; i++) { const t = x[0] + (x[1] - x[0]) * i / 400; ngap = Math.max(ngap, Math.abs(waldCdf(t, c.mu, c.lam) - math.normalCdf((t - c.mu) / c.sd))); }
      let html = `Wald parameters: $\\mu = a/v$ = <b>${fmt(c.mu, 4)}</b>, $\\lambda = a^2/\\sigma^2$ = <b>${fmt(c.lam, 4)}</b>. `
        + `With ${n.toLocaleString('en-US')} simulated paths: mean first-passage time <b>${fmt(m, 4)}</b> (Wald mean ${fmt(c.mu, 4)}), standard deviation <b>${fmt(sdS, 4)}</b> (Wald $\\sqrt{\\mu^3/\\lambda}$ = ${fmt(c.sd, 4)}). `
        + `Largest gap between the sample CDF and the Wald CDF: <b>${fmt(gap, 3)}</b>; gaps up to about ${fmt(crit, 2)} are expected from chance alone${gap <= crit ? ', so the simulation agrees with the Wald distribution' : ''}. `
        + `Normal approximation: $\\lambda/\\mu = av/\\sigma^2$ = <b>${fmt(c.lam / c.mu, 3)}</b>, skewness $3\\sqrt{\\mu/\\lambda}$ = ${fmt(3 * Math.sqrt(c.mu / c.lam), 3)}, largest gap between the Wald and normal CDFs <b>${fmt(ngap, 3)}</b>. `
        + `(Time step $dt$ = ${fmt(c.dt, 2)} near the threshold, longer far below it, with a correction for crossings between steps${c.unfinished ? `; ${c.unfinished} paths had not arrived by t = ${fmt(c.tMax, 3)}` : ''}.)`;
      if (Number.isFinite(clock)) html = `Time ${fmt(clock, 3)}: <b>${arrived.length.toLocaleString('en-US')}</b> of ${n.toLocaleString('en-US')} paths have reached the threshold. ` + html;
      ui.renderRich(readout, html);
    }
    draw();
  },
};
