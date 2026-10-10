// Poisson <-> Exponential: the Poisson process. Counts in windows of length t are Poisson(lambda t) exactly when
// the waiting times between events are independent Exp(lambda).
// Hand-written demo: one long simulated process, built either from exponential gaps or from a Poisson total with
// uniform event times; a timeline of the first few windows, the counts per window against Poisson(lambda t),
// and the gaps between events against the Exp(lambda) density.

import { getRelation } from '../catalog.js';
import { lgamma, gammaQ, quantileDiscrete, histogram, makeRng, clamp, roundTo } from '../core/math.js';

const REL = getRelation('poisson--exponential');
const EXPECTED_EVENTS = 4000;   // the simulated process runs for 4000/lambda time units
const SHOW_WINDOWS = 8;         // windows drawn on the timeline

const poisPmf = (k, m) => (k < 0 ? 0 : Math.exp(k * Math.log(m) - m - lgamma(k + 1)));
const poisQuantile = (u, m) => quantileDiscrete(x => (x < 0 ? 0 : gammaQ(Math.floor(x) + 1, m)), u, 0, Infinity, Math.floor(m));

export default {
  id: 'poisson--exponential',
  from: 'poisson',
  to: 'exponential',
  title: 'In a Poisson process the counts are Poisson and the waiting times between events are exponential',

  plain: [
    'A Poisson process is the simplest model of events that happen at random moments in time: clicks of a Geiger counter, spikes of a neuron firing at a steady rate, customers arriving at a shop. Events happen independently of each other, at a constant average rate $\\lambda$ per unit time. Such a process can be described in two equivalent ways.',
    'Counting: the number of events in any window of length $t$ is Poisson distributed with mean $\\lambda t$, and counts in windows that do not overlap are independent. Waiting: the times between successive events are independent exponential waiting times with rate $\\lambda$ (mean $1/\\lambda$). Each description implies the other. The simplest link between them is that the first wait is longer than $t$ exactly when the window from 0 to $t$ contains no events, and both probabilities equal $e^{-\\lambda t}$.',
  ],

  statementTex: REL.statement,
  glossary: [
    { sym: '\\text{counting process } N(t)', meaning: '$N(t)$ is the number of events that have happened between time 0 and time $t$. It starts at 0 and steps up by one at each event.' },
    { sym: '\\text{independent increments}', meaning: 'The numbers of events in time windows that do not overlap are independent of each other.' },
    { sym: '\\text{stationary increments}', meaning: 'The distribution of the number of events in a window depends only on the window’s length, not on where it starts.' },
    { sym: 'N(t) \\sim \\mathrm{Poisson}(\\lambda t)', meaning: 'The count in a window of length $t$ is Poisson with mean $\\lambda t$.' },
    { sym: '\\lambda', meaning: 'The rate: the average number of events per unit of time. It is the Poisson mean per unit time and the exponential rate.' },
    { sym: 't', meaning: 'A length of time (the window length).' },
    { sym: '\\iff', meaning: 'If and only if: each statement implies the other.' },
    { sym: 'T_1, T_2, \\dots', meaning: 'The inter-arrival times: $T_1$ is the wait from time 0 to the first event, $T_2$ the wait from the first event to the second, and so on.' },
    { sym: '\\overset{iid}{\\sim}', meaning: 'Independent and identically distributed.' },
    { sym: '\\mathrm{Exp}(\\lambda)', meaning: 'The exponential distribution with rate $\\lambda$: density $\\lambda e^{-\\lambda x}$ for $x \\ge 0$, mean $1/\\lambda$.' },
    { sym: 'P(T_1 > t) = P(N(t) = 0)', meaning: 'The first wait is longer than $t$ exactly when no event happens in the window from 0 to $t$, so these two probabilities are equal.' },
    { sym: 'e^{-\\lambda t}', meaning: 'The common value of both probabilities: the exponential survival probability, and the Poisson probability of a zero count. Here $e \\approx 2.718$.' },
  ],

  why: [
    '<b>From exponential waits to Poisson counts.</b> Let $S_k = T_1 + \\dots + T_k$ be the time of the $k$-th event. A sum of $k$ independent $\\mathrm{Exp}(\\lambda)$ waits has a $\\mathrm{Gamma}(k, \\lambda)$ distribution. At most $k - 1$ events happen by time $t$ exactly when the $k$-th event comes after $t$, so',
    { tex: 'P(N(t) \\le k - 1) = P(S_k > t) = \\sum_{j=0}^{k-1} e^{-\\lambda t} \\frac{(\\lambda t)^j}{j!},' },
    'where the last step is a standard identity for the gamma tail (it follows by integrating by parts). Taking differences in $k$ gives $P(N(t) = j) = e^{-\\lambda t}(\\lambda t)^j/j!$, the $\\mathrm{Poisson}(\\lambda t)$ probabilities. Because the exponential is memoryless, the process starts afresh at every moment, which gives the independent and stationary increments.',
    '<b>From Poisson counts to exponential waits.</b> If counts are Poisson, then $P(T_1 > t) = P(N(t) = 0) = e^{-\\lambda t}$, which is the exponential survival function, so $T_1 \\sim \\mathrm{Exp}(\\lambda)$. Because increments are independent and stationary, the wait after any event has the same distribution and does not depend on the earlier waits.',
    '<b>A third description.</b> Given that $n$ events happened in an interval, their times are distributed like $n$ independent uniform points in that interval, sorted. The demonstration can build the process this way: draw a $\\mathrm{Poisson}$ total, scatter that many points uniformly, and the gaps between them come out exponential.',
    '<b>Why the assumptions matter.</b> If events cluster (bursts) or repel each other (a refractory period after each spike), the waits are not exponential and the counts are not Poisson: their variance is larger or smaller than the mean. The Poisson process is the reference model of complete randomness against which such patterns are measured.',
  ],

  references: [
    { text: 'Wikipedia: Poisson point process.', url: 'https://en.wikipedia.org/wiki/Poisson_point_process' },
    { text: 'Wikipedia: Exponential distribution (occurrence and applications).', url: 'https://en.wikipedia.org/wiki/Exponential_distribution#Occurrence_of_events' },
    { text: 'Ross, S. M. (2014). <i>Introduction to Probability Models</i> (11th ed.), Chapter 5 (the exponential distribution and the Poisson process). Academic Press.' },
    { text: 'Wasserman, L. (2004). <i>All of Statistics</i>, Chapter 2 (Poisson and exponential distributions). Springer.' },
    { text: 'Leemis, L. M., & McQueston, J. T. (2008). Univariate distribution relationships. <i>The American Statistician</i>, 62(1), 45–53.', url: 'https://doi.org/10.1198/000313008X270448' },
  ],

  demo(container, { plot, ui }) {
    const { h } = ui;
    const params = [
      { key: 'lambda', sym: '\\lambda', name: 'rate', meaning: 'Average number of events per unit of time.', min: 0.2, max: 5, default: 1.5, step: 0.05 },
      { key: 't', sym: 't', name: 'window length', meaning: 'The length of the time windows in which events are counted.', min: 0.2, max: 5, default: 1, step: 0.05 },
    ];
    const defaults = { lambda: 1.5, t: 1 };
    const store = ui.createStore({ ...defaults, mode: 'gaps', seed: 1 });

    const lineBox = h('div'), cntBox = h('div'), gapBox = h('div');
    const readout = h('p', { class: 'demo-readout', 'aria-live': 'polite' });
    const controls = h('div', { class: 'demo-controls' });
    const modeCtl = ui.segmented([
      { value: 'gaps', label: 'From exponential gaps' },
      { value: 'counts', label: 'From a Poisson total' },
    ], 'gaps', v => store.set({ mode: v }), 'How the process is built');
    const again = h('button', { type: 'button', class: 'btn small-btn' }, 'Simulate a new process');
    again.addEventListener('click', () => store.set({ seed: store.get().seed + 1 }));

    container.append(
      ui.rich('p', 'One long Poisson process is simulated, with about 4,000 events. Build it from independent exponential gaps and check that the counts per window are Poisson; or build it from a Poisson total with event times scattered uniformly and check that the gaps are exponential. Drag the amber marker on the timeline to change the window length $t$ (the events stay where they are and are counted again), drag the dashed line on the count plot to change the rate $\\lambda$, or type values below.', { class: 'small muted demo-intro' }),
      h('figure', { class: 'plot-fig' }, ui.rich('figcaption', `The first ${SHOW_WINDOWS} windows of length $t$, with the number of events in each`), lineBox),
      h('div', { class: 'demo-grid', style: 'margin-top:1rem' },
        h('figure', { class: 'plot-fig' }, ui.rich('figcaption', 'Counts per window (bars) and the $\\mathrm{Poisson}(\\lambda t)$ probabilities'), cntBox),
        h('figure', { class: 'plot-fig' }, ui.rich('figcaption', 'Gaps between events (histogram) and the $\\mathrm{Exp}(\\lambda)$ density'), gapBox)),
      readout, controls);

    const panel = ui.paramPanel(controls, params, {
      get: () => store.get(),
      apply: (k, v) => store.set({ [k]: v }),
      onReset: () => store.set({ ...defaults }),
    });
    controls.append(h('div', { class: 'demo-sim-ctl' }, h('h3', { class: 'mini-title' }, 'Simulation'), modeCtl.el, h('div', {}, again)));

    const linePlot = new plot.Plot(lineBox, { xLabel: 'time', yTicks: false, height: w => (w < 480 ? 130 : 150), margin: { l: 18 }, yTickCount: 1 });
    const cntPlot = new plot.Plot(cntBox, { xLabel: 'k (events in one window)', yLabel: 'proportion of windows' });
    const gapPlot = new plot.Plot(gapBox, { xLabel: 'gap between events', yLabel: 'density' });

    // ---------------------------------------------------------------- simulation (cached)
    let cache = { key: '', ev: null, T: 0 };
    function process(s) {
      const key = [s.lambda, s.mode, s.seed].join('|');
      if (cache.key !== key) {
        const rng = makeRng(777 + 31 * s.seed);
        const T = EXPECTED_EVENTS / s.lambda;
        let ev;
        if (s.mode === 'gaps') {
          const out = [];
          let x = rng.exponential(s.lambda);
          while (x < T) { out.push(x); x += rng.exponential(s.lambda); }
          ev = Float64Array.from(out);
        } else {
          const N = rng.poisson(s.lambda * T);
          ev = new Float64Array(N);
          for (let i = 0; i < N; i++) ev[i] = rng.uniform(0, T);
          ev.sort();
        }
        cache = { key, ev, T };
      }
      return cache;
    }

    let frozenLine = null, frozenCnt = null;
    let raf = 0;
    const request = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; draw(); }); };
    store.subscribe(() => { panel.update(store.get()); modeCtl.set(store.get().mode); request(); });

    function draw() {
      const s = store.get();
      const { lambda, t } = s;
      const { ev, T } = process(s);
      const m = lambda * t;

      // ---- timeline
      const xl = frozenLine || [0, SHOW_WINDOWS * t];
      const shown = [];
      for (const e of ev) { if (e > xl[1]) break; shown.push([e, 0.62]); }
      const lineLayers = [];
      for (let j = 1; j * t < xl[1] + 1e-9; j++) lineLayers.push({ id: 'b' + j, type: 'vline', x: j * t, cls: 'ref-line' });
      for (let j = 0; (j + 0.5) * t < xl[1]; j++) {
        let c = 0;
        for (const [e] of shown) if (e >= j * t && e < (j + 1) * t) c++;
        lineLayers.push({ id: 'c' + j, type: 'text', x: (j + 0.5) * t, y: 0.9, text: String(c), cls: 'count-label' });
      }
      lineLayers.push({ id: 'ev', type: 'stems', points: shown, cls: 'pmf' });
      linePlot.render({
        x: xl, y: [0, 1],
        layers: lineLayers,
        handles: [{
          id: 't', type: 'xPoint', x: t, label: 't',
          ariaLabel: 'Window length t. Drag left or right, or use the arrow keys.',
          valueText: ui.fmt(t, 3), valueNow: t, valueMin: 0.2, valueMax: 5,
          onDrag: (pt, phase) => {
            if (phase === 'start') frozenLine = xl.slice();
            if (pt) store.set({ t: clamp(roundTo(pt.x, 0.01), 0.2, 5) });
            if (phase === 'end') { frozenLine = null; request(); }
          },
          onKey: steps => store.set({ t: clamp(roundTo(store.get().t + 0.05 * steps, 0.05), 0.2, 5) }),
        }],
      });

      // ---- counts per window
      const W = Math.floor(T / t);
      const counts = new Int32Array(W);
      for (const e of ev) { const j = Math.floor(e / t); if (j < W) counts[j]++; }
      let sum = 0, sum2 = 0, zeros = 0;
      const freq = new Map();
      for (const c of counts) { sum += c; sum2 += c * c; if (c === 0) zeros++; freq.set(c, (freq.get(c) || 0) + 1); }
      const cMean = sum / W, cVar = (sum2 - W * cMean * cMean) / (W - 1);
      const kHi = Math.max(5, poisQuantile(0.9995, m));
      const xc = frozenCnt || [-0.7, kHi + 0.7];
      const bars = [], stems = [];
      let ymax = 0;
      for (let k = 0; k <= Math.floor(xc[1]); k++) {
        const f = (freq.get(k) || 0) / W, q = poisPmf(k, m);
        bars.push([k, f]); stems.push([k, q]); ymax = Math.max(ymax, f, q);
      }
      cntPlot.render({
        x: xc, y: [0, ymax * 1.15], discreteX: true,
        layers: [
          { id: 'freq', type: 'bars', points: bars, width: 0.7, cls: 'bars-strong' },
          { id: 'pmf', type: 'stems', points: stems, cls: 'pmf' },
        ],
        handles: [{
          id: 'mean', type: 'vline', x: m, label: 'λt',
          ariaLabel: 'Mean count per window λt. Drag left or right to change the rate λ, or use the arrow keys.',
          valueText: ui.fmt(lambda, 3), valueNow: lambda, valueMin: 0.2, valueMax: 5,
          onDrag: (pt, phase) => {
            if (phase === 'start') frozenCnt = xc.slice();
            if (pt) store.set({ lambda: clamp(roundTo(Math.max(pt.x, 0) / t, 0.01), 0.2, 5) });
            if (phase === 'end') { frozenCnt = null; request(); }
          },
          onKey: steps => store.set({ lambda: clamp(roundTo(store.get().lambda + 0.05 * steps, 0.05), 0.2, 5) }),
        }],
        legend: [{ label: `counts in ${W.toLocaleString('en-US')} windows`, cls: 'bars-strong' }, { label: `Poisson(λt = ${ui.fmt(m, 3)})`, cls: 'curve-main' }],
      });

      // ---- gaps between events
      const gaps = new Float64Array(ev.length);
      let prev = 0, gSum = 0, gSum2 = 0;
      for (let i = 0; i < ev.length; i++) { const g = ev[i] - prev; gaps[i] = g; prev = ev[i]; gSum += g; gSum2 += g * g; }
      const gMean = gSum / gaps.length, gSd = Math.sqrt((gSum2 - gaps.length * gMean * gMean) / (gaps.length - 1));
      const gHi = -Math.log(0.004) / lambda;
      const hst = histogram(gaps, 0, gHi, 45);
      const hb = hst.density.map((d, i) => [hst.edges[i] + hst.width / 2, d]);
      gapPlot.render({
        x: [0, gHi], y: [0, lambda * 1.2],
        layers: [
          { id: 'hist', type: 'bars', points: hb, width: hst.width, cls: 'bars-strong' },
          { id: 'exp', type: 'line', points: plot.sampleFn(x => lambda * Math.exp(-lambda * x), 0, gHi, 300), cls: 'curve-main' },
        ],
        legend: [{ label: `${gaps.length.toLocaleString('en-US')} gaps`, cls: 'bars-strong' }, { label: `Exp(λ = ${ui.fmt(lambda, 3)}) density`, cls: 'curve-main' }],
      });

      ui.renderRich(readout,
        `${ev.length.toLocaleString('en-US')} events in ${ui.fmt(T, 4)} time units. `
        + `Counts per window: mean <b>${ui.fmt(cMean, 3)}</b> and variance <b>${ui.fmt(cVar, 3)}</b>, against $\\lambda t$ = ${ui.fmt(m, 3)} for both. `
        + `Gaps: mean <b>${ui.fmt(gMean, 3)}</b> and standard deviation <b>${ui.fmt(gSd, 3)}</b>, against $1/\\lambda$ = ${ui.fmt(1 / lambda, 3)} for both. `
        + `Windows with no events: <b>${ui.fmt(zeros / W, 3)}</b> of them, against $P(N(t) = 0) = e^{-\\lambda t}$ = ${ui.fmt(Math.exp(-m), 3)}.`);
    }

    container.append(h('style', {}, '.layer.count-label .label { font-family: var(--mono); font-size: 12.5px; fill: var(--ink-2); }'));
    draw();
  },
};
