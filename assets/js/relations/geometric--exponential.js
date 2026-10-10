// Geometric -> Exponential: with steps of length 1/n and success probability p_n = lambda/n per step,
// the waiting time K_n/n approaches Exp(lambda); exactly, floor(T) ~ Geom(1 - e^-lambda) for T ~ Exp(lambda).
// Hand-written demo (the geometric side lives on a lattice of spacing 1/n, which the demo helpers do not cover):
// the step density of K_n/n against the exponential density, the two CDFs with the largest gap, and the gap against n.

import { getRelation } from '../catalog.js';

const REL = getRelation('geometric--exponential');
const N_MAX = 200;

/** Success probability per step: lambda/n (the limit statement) or 1 - e^{-lambda/n} (exact discretization). */
const stepProb = (lambda, n, exact) => (exact ? -Math.expm1(-lambda / n) : lambda / n);

/** Largest gap between the CDF of K_n/n (a step function on the lattice k/n) and the exponential CDF. */
function maxGap(lambda, n, exact, xMax) {
  const p = stepProb(lambda, n, exact), lq = Math.log1p(-p);
  let best = { d: 0, x: 0, Fg: 0, Fe: 0 };
  const K = Math.ceil(n * xMax) + 1;
  for (let k = 0; k <= K; k++) {
    const x = k / n;
    const Fe = -Math.expm1(-lambda * x);
    const before = -Math.expm1(k * lq);          // P(K <= k - 1) = 1 - (1 - p)^k, just before the jump at k/n
    const at = -Math.expm1((k + 1) * lq);        // P(K <= k)
    if (Math.abs(before - Fe) > best.d) best = { d: Math.abs(before - Fe), x, Fg: before, Fe };
    if (Math.abs(at - Fe) > best.d) best = { d: Math.abs(at - Fe), x, Fg: at, Fe };
  }
  return best;
}

export default {
  id: 'geometric--exponential',
  from: 'geometric',
  to: 'exponential',
  title: 'The geometric waiting time becomes an exponential waiting time when time is divided into ever finer steps',

  plain: [
    'Suppose time is divided into short steps of length $1/n$, and in each step an event happens with a small probability $\\lambda/n$, independently of the other steps. The number of empty steps before the first event is geometric. Dividing it by $n$ converts it from steps to time units. As the steps get finer ($n \\to \\infty$), this waiting time approaches an exponential distribution with rate $\\lambda$: the chance per unit time stays $\\lambda$, but events can now happen at any moment.',
    'The two distributions are the discrete-time and continuous-time versions of the same idea, a wait with a constant chance of ending at every moment. Both are memoryless. The link also works exactly in the other direction: rounding an exponential waiting time down to whole time units gives a geometric count of the units that passed without an event.',
  ],

  statementTex: REL.statement,
  glossary: [
    { sym: 'K_n \\sim \\mathrm{Geom}(p_n)', meaning: '$K_n$ is the number of steps without an event before the first event, when each step has event probability $p_n$ (the number of failures before the first success).' },
    { sym: 'n', meaning: 'The number of steps per unit of time; each step lasts $1/n$ time units. The statement describes what happens as $n$ grows without bound.' },
    { sym: 'p_n', meaning: 'The probability of an event in one step when there are $n$ steps per unit of time. It shrinks as the steps get shorter.' },
    { sym: 'np_n \\to \\lambda', meaning: 'The expected number of events per unit of time, $n$ steps times $p_n$, settles at the rate $\\lambda$. The simplest choice is $p_n = \\lambda/n$.' },
    { sym: '\\lambda', meaning: 'The rate: the average number of events per unit of time. The exponential waiting time has mean $1/\\lambda$.' },
    { sym: 'K_n/n', meaning: 'The waiting time measured in time units instead of steps.' },
    { sym: '\\xrightarrow{d}', meaning: 'Converges in distribution: for every $x$, the probability that $K_n/n \\le x$ approaches the exponential probability $1 - e^{-\\lambda x}$.' },
    { sym: '\\mathrm{Exp}(\\lambda)', meaning: 'The exponential distribution with rate $\\lambda$: density $\\lambda e^{-\\lambda x}$ for $x \\ge 0$.' },
    { sym: 'P(K_n > nx)', meaning: 'The probability that the wait lasts longer than $x$ time units, that is, more than $nx$ steps.' },
    { sym: '\\lfloor nx \\rfloor', meaning: 'The floor of $nx$: the number of whole steps in $x$ time units ($nx$ rounded down).' },
    { sym: '(1 - p_n)^{\\lfloor nx \\rfloor + 1}', meaning: 'The probability that the first $\\lfloor nx \\rfloor + 1$ steps are all empty, which is the event $K_n > nx$.' },
    { sym: 'e^{-\\lambda x}', meaning: 'The exponential survival probability, the chance that an exponential wait lasts longer than $x$. Here $e \\approx 2.718$.' },
    { sym: 'T \\sim \\mathrm{Exp}(\\lambda)', meaning: 'A continuous waiting time with rate $\\lambda$.' },
    { sym: '\\lfloor T \\rfloor', meaning: 'The waiting time rounded down to a whole number of time units: the number of complete units that passed without an event.' },
    { sym: '\\mathrm{Geom}(1 - e^{-\\lambda})', meaning: 'The geometric distribution whose success probability $1 - e^{-\\lambda}$ is the chance that an event happens within one time unit.' },
  ],

  why: [
    '<b>The survival function converges.</b> The wait is longer than $x$ time units exactly when the first $\\lfloor nx \\rfloor + 1$ steps are all empty. With $p_n = \\lambda/n$,',
    { tex: 'P\\Big(\\frac{K_n}{n} > x\\Big) = \\Big(1 - \\frac{\\lambda}{n}\\Big)^{\\lfloor nx \\rfloor + 1} \\;\\longrightarrow\\; e^{-\\lambda x} \\quad (n \\to \\infty),' },
    'because $(1 - \\lambda/n)^{n} \\to e^{-\\lambda}$ (a standard limit that defines the exponential function) and $\\lfloor nx \\rfloor + 1$ differs from $nx$ by at most one step. The right-hand side is the probability that an $\\mathrm{Exp}(\\lambda)$ waiting time exceeds $x$, so the two CDFs agree in the limit. Any $p_n$ with $np_n \\to \\lambda$ gives the same limit.',
    '<b>Exact in the other direction.</b> If $T \\sim \\mathrm{Exp}(\\lambda)$, then $P(\\lfloor T \\rfloor \\ge k) = P(T \\ge k) = e^{-\\lambda k} = (e^{-\\lambda})^k$. This is the geometric survival function $(1 - p)^k$ with $p = 1 - e^{-\\lambda}$, so $\\lfloor T \\rfloor \\sim \\mathrm{Geom}(1 - e^{-\\lambda})$ exactly. More generally $\\lfloor nT \\rfloor \\sim \\mathrm{Geom}(1 - e^{-\\lambda/n})$, and $\\lfloor nT \\rfloor/n$ differs from $T$ by less than $1/n$. The demonstration can use this choice of $p_n$ as well.',
    '<b>Why memorylessness carries over.</b> The geometric is the only memoryless distribution on $\\{0, 1, 2, \\dots\\}$ and the exponential the only memoryless continuous distribution on $[0, \\infty)$. Rounding preserves the property and so does the limit, which is why these two are paired.',
    '<b>How close?</b> The geometric CDF of $K_n/n$ is a staircase with steps of width $1/n$, and the exponential CDF is a smooth curve through it. The largest vertical gap between them is about the size of the first step, $p_n \\approx \\lambda/n$, so it shrinks like $1/n$.',
  ],

  references: [
    { text: 'Wikipedia: Geometric distribution (related distributions).', url: 'https://en.wikipedia.org/wiki/Geometric_distribution#Related_distributions' },
    { text: 'Wikipedia: Exponential distribution (related distributions).', url: 'https://en.wikipedia.org/wiki/Exponential_distribution#Related_distributions' },
    { text: 'Casella, G., & Berger, R. L. (2002). <i>Statistical Inference</i> (2nd ed.), Sections 3.2 and 3.3 (memorylessness of the geometric and exponential distributions). Duxbury.' },
    { text: 'Leemis, L. M., & McQueston, J. T. (2008). Univariate distribution relationships. <i>The American Statistician</i>, 62(1), 45–53.', url: 'https://doi.org/10.1198/000313008X270448' },
  ],

  demo(container, { math, plot, ui }) {
    const { h } = ui;
    const params = [
      { key: 'lambda', sym: '\\lambda', name: 'rate', meaning: 'Average number of events per unit of time; the mean waiting time is $1/\\lambda$.', min: 0.5, max: 3, default: 1, step: 0.05 },
      { key: 'n', sym: 'n', name: 'steps per time unit', meaning: 'How finely each unit of time is divided; each step lasts $1/n$ and has event probability $p_n$.', min: 3, max: N_MAX, default: 4, integer: true, log: true },
    ];
    const defaults = { lambda: 1, n: 4 };
    const store = ui.createStore({ ...defaults, exact: false });

    const pdfBox = h('div'), cdfBox = h('div'), gapBox = h('div');
    const readout = h('p', { class: 'demo-readout', 'aria-live': 'polite' });
    const controls = h('div', { class: 'demo-controls' });
    container.append(
      ui.rich('p', 'The bars show the waiting time $K_n/n$ of the geometric model as a density: each bar covers one step of length $1/n$, and its area is the probability that the first event happens in that step. The dashed curve is the $\\mathrm{Exp}(\\lambda)$ density. Increase $n$ and the staircase settles onto the curve. Drag the tip of the amber arrow (it ends at the mean waiting time $1/\\lambda$) to change the rate, or type values below.', { class: 'small muted demo-intro' }),
      h('div', { class: 'demo-grid' },
        h('figure', { class: 'plot-fig' }, ui.rich('figcaption', 'Waiting time $K_n/n$ (bars) and the exponential density'), pdfBox),
        h('figure', { class: 'plot-fig' }, h('figcaption', {}, 'The two CDFs'), cdfBox)),
      readout, controls,
      h('figure', { class: 'plot-fig', style: 'margin-top:1.2rem' }, ui.rich('figcaption', 'Probability that the wait is longer than the mean $1/\\lambda$, for every $n$ from 3 to 200: it approaches $e^{-1}$'), gapBox));

    const panel = ui.paramPanel(controls, params, {
      get: () => store.get(),
      apply: (k, v) => store.set({ [k]: v }),
      onReset: () => store.set({ ...defaults }),
    });
    const tog = ui.toggleSwitch('Use the exact discretization p = 1 − e^(−λ/n)', false, on => store.set({ exact: on }));
    controls.append(h('div', {}, tog.el));

    const pdfPlot = new plot.Plot(pdfBox, { xLabel: 'waiting time x (time units)', yLabel: 'density' });
    const cdfPlot = new plot.Plot(cdfBox, { xLabel: 'waiting time x', yLabel: 'cumulative probability' });
    const gapPlot = new plot.Plot(gapBox, { xLabel: 'n (steps per time unit)', yLabel: 'P(K/n > 1/λ)', height: w => Math.max(170, Math.min(240, w * 0.28)) });

    let frozen = null;      // x domain held fixed while the arrow is dragged
    let raf = 0;
    const request = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; draw(); }); };
    store.subscribe(() => { panel.update(store.get()); request(); });

    // P(K_n/n > 1/lambda) = (1 - p_n)^(floor(n/lambda) + 1) for every n: the survival limit of the statement at x = 1/lambda
    const survAtMean = (lambda, n, exact) => Math.exp((Math.floor(n / lambda + 1e-9) + 1) * Math.log1p(-stepProb(lambda, n, exact)));
    let survCache = { key: '', pts: [] };
    function survCurve(lambda, exact) {
      const key = lambda + '|' + exact;
      if (survCache.key !== key) {
        const pts = [];
        for (let n = 3; n <= N_MAX; n++) pts.push([n, survAtMean(lambda, n, exact)]);
        survCache = { key, pts };
      }
      return survCache.pts;
    }

    function draw() {
      const { lambda, n, exact } = store.get();
      const p = stepProb(lambda, n, exact);
      const lq = Math.log1p(-p);
      const xd = frozen || [0, -Math.log(0.004) / lambda];
      const K = Math.ceil(n * xd[1]);
      // bars: step k covers [k/n, (k+1)/n) with height n * P(K = k)
      const bars = [];
      for (let k = 0; k < K; k++) bars.push([(k + 0.5) / n, n * p * Math.exp(k * lq)]);
      const expPdf = x => (x < 0 ? 0 : lambda * Math.exp(-lambda * x));
      const ymax = Math.max(lambda, n * p) * 1.18;
      const mean = 1 / lambda, fm = expPdf(mean);
      pdfPlot.render({
        x: xd, y: [0, ymax],
        layers: [
          { id: 'bars', type: 'bars', points: bars, width: 1 / n, cls: 'bars-strong' },
          { id: 'exp', type: 'line', points: plot.sampleFn(expPdf, xd[0], xd[1], 300), cls: 'curve-ref' },
        ],
        handles: [{
          id: 'mean', type: 'hArrow', from: { x: 0, y: fm }, to: { x: mean, y: fm }, label: '1/λ',
          ariaLabel: 'Mean waiting time 1/λ. Drag the tip left or right to change the rate λ, or use the arrow keys.',
          valueText: ui.fmt(lambda, 3), valueNow: lambda, valueMin: 0.5, valueMax: 3,
          onDrag: (pt, phase) => {
            if (phase === 'start') frozen = xd.slice();
            if (pt) store.set({ lambda: math.clamp(Number((1 / Math.max(pt.x, 1e-3)).toPrecision(3)), 0.5, 3) });
            if (phase === 'end') { frozen = null; request(); }
          },
          onKey: steps => store.set({ lambda: math.clamp(math.roundTo(store.get().lambda - 0.05 * steps, 0.05), 0.5, 3) }),
        }],
        legend: [
          { label: `Geometric wait K/n, p = ${exact ? '1 − e^(−λ/n)' : 'λ/n'} = ${ui.fmt(p, 3)}`, cls: 'bars-strong' },
          { label: `Exp(λ = ${ui.fmt(lambda, 3)}) density`, cls: 'curve-ref' },
        ],
      });

      // CDFs: the staircase of K/n and the exponential curve, with the largest gap marked
      const steps = [];
      for (let k = 0; k <= K; k++) steps.push([k / n, -Math.expm1((k + 1) * lq)]);
      const g = maxGap(lambda, n, exact, xd[1]);
      cdfPlot.render({
        x: xd, y: [-0.02, 1.06],
        layers: [
          { id: 'one', type: 'hline', y: 1, cls: 'ref-line' },
          { id: 'geo', type: 'step', points: steps, x0: xd[0], y0: 0, cls: 'curve-main' },
          { id: 'exp', type: 'line', points: plot.sampleFn(x => -Math.expm1(-lambda * x), xd[0], xd[1], 300), cls: 'curve-ref' },
          { id: 'gap', type: 'segment', x1: g.x, y1: g.Fg, x2: g.x, y2: g.Fe, cls: 'guide' },
          { id: 'gap-dot', type: 'dot', x: g.x, y: g.Fg, r: 4.5, cls: 'marker' },
        ],
        legend: [{ label: 'CDF of K/n (staircase)', cls: 'curve-main' }, { label: 'exponential CDF', cls: 'curve-ref' }],
      });

      // survival beyond the mean, the quantity in the statement at x = 1/lambda
      const S = survAtMean(lambda, n, exact);
      ui.renderRich(readout,
        `Largest gap between the two CDFs: <b>${ui.fmt(g.d, 3)}</b> at $x$ = ${ui.fmt(g.x, 3)} (compare $p_n$ = ${ui.fmt(p, 3)}, the height of the first step). `
        + `Chance that the wait is longer than the mean $1/\\lambda$: geometric $(1 - p_n)^{\\lfloor n/\\lambda \\rfloor + 1}$ = <b>${ui.fmt(S, 4)}</b>, exponential $e^{-1}$ = <b>0.3679</b>. `
        + `Mean of $K_n/n$: <b>${ui.fmt((1 - p) / p / n, 4)}</b>, against $1/\\lambda$ = ${ui.fmt(mean, 4)}.`);

      const sc = survCurve(lambda, exact);
      const ys = sc.map(q => q[1]);
      const y0 = Math.min(Math.exp(-1), ...ys), y1 = Math.max(Math.exp(-1), ...ys);
      const padY = Math.max(0.01, (y1 - y0) * 0.12);
      gapPlot.render({
        x: [0, N_MAX + 5], y: [Math.max(0, y0 - padY), Math.min(1, y1 + padY)],
        layers: [
          { id: 'lim-c', type: 'line', points: [[0, Math.exp(-1)], [N_MAX + 5, Math.exp(-1)]], cls: 'curve-ref' },
          { id: 'g', type: 'line', points: sc, cls: 'curve-main' },
          { id: 'now', type: 'dot', x: n, y: survAtMean(lambda, n, exact), r: 5, cls: 'marker' },
        ],
        legend: [{ label: 'geometric model, (1 − p)^(⌊n/λ⌋ + 1)', cls: 'curve-main' }, { label: 'exponential limit e^(−1) ≈ 0.3679', cls: 'curve-ref' }],
      });
    }
    draw();
  },
};
