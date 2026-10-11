// Binomial <-> Geometric: counting successes in a fixed number of trials and waiting for the first
// success are two views of the same Bernoulli sequence: {K >= k} = {B_k = 0}, so P(K >= k) = (1 - p)^k.
// Hand-written demo: one sequence of trials with the first k highlighted, the Bin(k, p) PMF with the
// bar at 0 highlighted, the Geometric(p) PMF with the tail K >= k highlighted, and a simulation tally.

import { getRelation } from '../catalog.js';

const REL = getRelation('binomial--geometric');
const K_MAX = 30, SEQ_LEN = 30;

export default {
  id: 'binomial--geometric',
  from: 'binomial',
  to: 'geometric',
  title: 'Counting successes in fixed trials and waiting for the first success are two views of one sequence',

  summary: 'In one sequence of independent trials, the binomial counts successes in a fixed number of trials and the geometric counts failures before the first success. At least $k$ failures before the first success means no success in the first $k$ trials.',

  plain: [
    'Picture one long sequence of independent yes/no trials, each a success with probability $p$. The binomial and the geometric distribution ask two different questions about it. The binomial fixes the number of trials, say the first $k$, and counts the successes among them. The geometric fixes the number of successes (one) and counts how many failures come before it.',
    'The two questions are tied together. Waiting at least $k$ failures for the first success is the same event as seeing no success at all in the first $k$ trials. So the geometric tail probability $P(K \\ge k)$ equals the binomial probability of zero successes, $P(B_k = 0) = (1-p)^k$. The same duality links the negative binomial and the binomial: if $r$ is the number of successes waited for, then $P(\\mathrm{NegBin}(r, p) \\le k) = P(\\mathrm{Bin}(k + r, p) \\ge r)$.',
  ],

  statementTex: REL.statement,
  glossary: [
    { sym: '\\text{iid Bernoulli}(p)\\text{ sequence}', meaning: 'A sequence of independent trials, each a success (1) with the same probability $p$ and a failure (0) otherwise.' },
    { sym: 'p', meaning: 'The success probability of each trial.' },
    { sym: 'B_m', meaning: 'The number of successes among the first $m$ trials of the sequence.' },
    { sym: 'm', meaning: 'A fixed number of trials.' },
    { sym: '\\#\\text{successes}', meaning: 'The number of successes (the symbol $\\#$ means "number of").' },
    { sym: '\\mathrm{Bin}(m, p)', meaning: 'The binomial distribution: successes in $m$ independent trials with success probability $p$.' },
    { sym: 'K', meaning: 'The number of failures before the first success in the same sequence.' },
    { sym: '\\mathrm{Geom}(p)', meaning: 'The geometric distribution (failures convention, values $0, 1, 2, \\dots$).' },
    { sym: '\\{K \\ge k\\} = \\{B_k = 0\\}', meaning: 'An equality of events: in every possible sequence, "at least $k$ failures before the first success" happens exactly when "no success in the first $k$ trials" happens.' },
    { sym: 'k', meaning: 'A whole number $0, 1, 2, \\dots$: the number of leading trials looked at.' },
    { sym: 'P(K \\ge k) = (1-p)^k', meaning: 'The probability of waiting at least $k$ failures, which is the probability that the first $k$ trials all fail.' },
  ],

  why: [
    'The key step is an equality of events, not just of probabilities. Take any sequence of outcomes. If the first success comes after at least $k$ failures, then trials $1, \\dots, k$ are all failures, so the count $B_k$ of successes among them is 0. Conversely, if $B_k = 0$, the first $k$ trials are failures and the first success can only come later, so $K \\ge k$. The two descriptions pick out exactly the same sequences, so they have the same probability:',
    { tex: 'P(K \\ge k) = P(B_k = 0) = \\binom{k}{0} p^0 (1-p)^k = (1-p)^k.' },
    'This gives the geometric distribution directly from the binomial: $P(K = k) = P(K \\ge k) - P(K \\ge k + 1) = (1-p)^k - (1-p)^{k+1} = (1-p)^k p$.',
    'The same reasoning works for the $r$-th success. Let $Y$ be the number of failures before the $r$-th success (negative binomial). Having at most $k$ failures before the $r$-th success means that the $r$-th success arrives by trial $k + r$, which is the same as seeing at least $r$ successes in the first $k + r$ trials. So $P(Y \\le k) = P(B_{k+r} \\ge r)$. The continuous version of this duality is the Poisson process: the waiting time until the $r$-th event exceeds $t$ exactly when fewer than $r$ events have happened by time $t$, which links the gamma and Poisson distributions.',
  ],

  references: [
    { text: 'Wikipedia: Geometric distribution.', url: 'https://en.wikipedia.org/wiki/Geometric_distribution' },
    { text: 'Wikipedia: Negative binomial distribution, relation to the binomial theorem and the binomial distribution.', url: 'https://en.wikipedia.org/wiki/Negative_binomial_distribution' },
    { text: 'Casella, G., & Berger, R. L. (2002). <i>Statistical Inference</i> (2nd ed.), Section 3.2. Duxbury.' },
    { text: 'Leemis, L. M., & McQueston, J. T. (2008). Univariate distribution relationships. <i>The American Statistician</i>, 62(1), 45–53.', url: 'https://doi.org/10.1198/000313008X270448' },
  ],

  demo(container, { math, plot, ui }) {
    const { h } = ui;
    const params = [
      { key: 'p', sym: 'p', name: 'success probability', meaning: 'Probability that each trial is a success (1).', min: 0.02, max: 0.98, default: 0.3, step: 0.01 },
      { key: 'k', sym: 'k', name: 'number of leading trials', meaning: 'How many trials at the start of the sequence are looked at; also the threshold in $K \\ge k$.', min: 0, max: K_MAX, default: 3, integer: true },
    ];
    const defaults = { p: 0.3, k: 3 };
    const store = ui.createStore({ ...defaults, seed: 1 });

    const stripBox = h('div', { class: 'small', style: 'margin:1rem 0 0' });
    const leftBox = h('div'), rightBox = h('div');
    const readout = h('p', { class: 'demo-readout', 'aria-live': 'polite' });
    const controls = h('div', { class: 'demo-controls' });
    const again = h('button', { type: 'button', class: 'btn small-btn' }, 'New sequence');
    again.addEventListener('click', () => store.set({ seed: store.get().seed + 1 }));
    // the plots come first (visible on a laptop screen); the sequence strip and the explanation follow the controls
    container.append(
      h('div', { class: 'demo-grid' },
        h('figure', { class: 'plot-fig' }, ui.rich('figcaption', 'Successes in the first $k$ trials: $\\mathrm{Bin}(k, p)$'), leftBox),
        h('figure', { class: 'plot-fig' }, ui.rich('figcaption', 'Failures before the first success: $\\mathrm{Geom}(p)$'), rightBox)),
      readout, controls, stripBox,
      ui.rich('p', 'The circles are one simulated sequence of trials; the first $k$ are outlined in amber. The left plot shows the number of successes in the first $k$ trials, $B_k \\sim \\mathrm{Bin}(k, p)$, with the bar at 0 highlighted. The right plot shows the number of failures before the first success, $K \\sim \\mathrm{Geom}(p)$, with the values $K \\ge k$ highlighted. The two highlighted probabilities are always equal. Drag the amber marker on either plot to change $k$.', { class: 'small muted demo-intro' }));

    const panel = ui.paramPanel(controls, params, {
      get: () => store.get(),
      apply: (key, v) => store.set({ [key]: v }),
      onReset: () => store.set({ ...defaults }),
    });
    controls.append(h('div', { class: 'demo-sim-ctl' }, h('h3', { class: 'mini-title' }, 'Sequence'), again));

    const height = (w, H) => plot.fitHeight(w, H, { ratio: 0.62, phoneRatio: 0.7, min: 220, max: 400 });
    const left = new plot.Plot(leftBox, { xLabel: 'number of successes in the first k trials', yLabel: 'probability', height });
    const right = new plot.Plot(rightBox, { xLabel: 'K (failures before the first success)', yLabel: 'probability', height });

    // the x axes stay fixed while a marker is dragged, and refit when it is released
    let frozen = null;
    const kHandle = (id, xd) => {
      const { k } = store.get();
      return {
        id, type: 'xPoint', x: k, label: 'k',
        ariaLabel: 'Number of leading trials k. Drag left or right, or use the arrow keys.',
        valueText: String(k), valueNow: k, valueMin: 0, valueMax: K_MAX,
        onDrag: (pt, phase) => {
          if (phase === 'start') frozen = xd;
          if (pt) store.set({ k: math.clamp(Math.round(pt.x), 0, K_MAX) });
          if (phase === 'end') { frozen = null; request(); }
        },
        onKey: steps => store.set({ k: math.clamp(store.get().k + steps, 0, K_MAX) }),
      };
    };

    let raf = 0;
    const request = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; draw(); }); };
    store.subscribe(() => { panel.update(store.get()); request(); });

    function sequence(p, seed) {
      const rng = math.makeRng(500 + 17 * seed);
      const out = [];
      for (let i = 0; i < SEQ_LEN; i++) out.push(rng.bernoulli(p));
      return out;
    }

    function drawStrip(seq, k) {
      const first = seq.indexOf(1);
      const Kval = first < 0 ? null : first;
      const Bk = seq.slice(0, k).reduce((a, b) => a + b, 0);
      const row = h('div', { style: 'display:flex;flex-wrap:wrap;gap:4px;align-items:center;margin:.35rem 0', 'aria-hidden': 'true' });
      seq.forEach((o, i) => {
        const inWin = i < k;
        row.append(h('span', {
          style: 'display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:50%;font:500 10px/1 var(--mono);'
            + (o ? 'background:var(--steel-deep);color:var(--surface);border:1.5px solid var(--steel-deep);' : 'background:transparent;color:var(--muted);border:1.5px solid var(--line-2);')
            + (inWin ? 'box-shadow:0 0 0 3px var(--amber-soft), 0 0 0 4.5px var(--amber);' : ''),
        }, o ? '1' : '0'));
      });
      const holds = Kval === null || Kval >= k;
      const Kpart = Kval === null
        ? [`there is no success among the ${SEQ_LEN} trials shown, so `, h('b', { class: 'mono' }, `K ≥ ${SEQ_LEN}`), '. ']
        : [h('b', { class: 'mono' }, `K = ${Kval}`), ' failures come before the first success. '];
      stripBox.textContent = '';
      stripBox.append(
        h('span', { class: 'muted' }, `One sequence of ${SEQ_LEN} trials (filled = success). The first k = ${k} are outlined in amber.`),
        row,
        h('span', {}, 'In this sequence the first k trials contain ', h('b', { class: 'mono' }, `Bₖ = ${Bk}`), ` success${Bk === 1 ? '' : 'es'}, and `,
          ...Kpart, `So “K ≥ k” is ${holds ? 'true' : 'false'}, and “Bₖ = 0” is ${Bk === 0 ? 'true' : 'false'}.`));
    }

    function draw() {
      const { p, k, seed } = store.get();
      const q = 1 - p;
      const tail = Math.pow(q, k);
      // geometric window: up to its 0.995 quantile, and always past k
      const g995 = Math.ceil(Math.log(0.005) / Math.log(q) - 1);
      const hiAuto = Math.min(60, Math.max(8, g995, k + 2));
      const xd = frozen || [-0.7, hiAuto + 0.7];
      const hi = Math.floor(xd[1]);

      // left: Bin(k, p)
      const bin = [];
      for (let j = 0; j <= Math.min(k, hi); j++) bin.push([j, Math.exp(math.logBinom(k, j) + j * Math.log(p) + (k - j) * Math.log(q))]);
      const ymaxL = Math.max(...bin.map(b => b[1])) * 1.15;
      left.render({
        x: xd, y: [0, Math.min(1.08, Math.max(ymaxL, 0.05))], discreteX: true,
        layers: [
          { id: 'rest', type: 'stems', points: bin.slice(1), cls: 'pmf' },
          { id: 'zero', type: 'stems', points: bin.slice(0, 1), cls: 'pmf-on' },
        ],
        handles: [kHandle('k-left', xd)],
        legend: [{ label: `Bin(k = ${k}, p = ${fmtP(p)})`, cls: 'curve-main' }, { label: `P(Bₖ = 0) = ${ui.fmt(tail, 4)}`, cls: 'area-shade' }],
      });

      // right: Geom(p), with K >= k highlighted
      const geo = [];
      for (let j = 0; j <= hi; j++) geo.push([j, Math.pow(q, j) * p]);
      right.render({
        x: xd, y: [0, Math.min(1.08, p * 1.15)], discreteX: true,
        layers: [
          { id: 'below', type: 'stems', points: geo.filter(g => g[0] < k), cls: 'pmf' },
          { id: 'tail', type: 'stems', points: geo.filter(g => g[0] >= k), cls: 'pmf-on' },
        ],
        handles: [kHandle('k-right', xd)],
        legend: [{ label: `Geom(p = ${fmtP(p)})`, cls: 'curve-main' }, { label: `P(K ≥ k) = ${ui.fmt(tail, 4)}`, cls: 'area-shade' }],
      });

      drawStrip(sequence(p, seed), k);

      // simulation tally: the two events are the same, sequence by sequence
      const rng = math.makeRng(9000 + seed);
      let nA = 0, nB = 0, same = 0;
      const N = 2000;
      for (let i = 0; i < N; i++) {
        // run the sequence until both quantities are known: the first k trials, and the first success
        let K = -1, Bk = 0;
        for (let t = 0; (t < k || K < 0) && t < 100000; t++) {
          const x = rng.bernoulli(p);
          if (t < k) Bk += x;
          if (x && K < 0) K = t;          // failures before the first success = index of the first success
        }
        const A = K >= k, B = Bk === 0;
        nA += A; nB += B; same += (A === B);
      }
      ui.renderRich(readout,
        `$P(K \\ge k) = (1-p)^k$ = <b>${ui.fmt(tail, 4)}</b> and $P(B_k = 0) = (1-p)^k$ = <b>${ui.fmt(tail, 4)}</b>. `
        + `In ${N.toLocaleString('en-US')} simulated sequences, “$K \\ge k$” happened ${nA} times and “$B_k = 0$” ${nB} times, `
        + `and the two events agreed in ${same === N ? 'every one' : same} of the sequences.`);
    }
    draw();
  },
};

function fmtP(p) { return String(Number(p.toPrecision(3))); }
