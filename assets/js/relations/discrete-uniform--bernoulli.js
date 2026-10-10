// Discrete uniform <-> Bernoulli: the two families meet at a single point,
// DUnif{0, 1} = Bernoulli(1/2) (a fair coin).
// Hand-written demo: a Bernoulli(p) (stems, drag the bar at 1) and a discrete uniform on {a, ..., b}
// (bars, drag a and b under the axis) on the same axes, their two CDFs, and the distance between them,
// which is 0 only at p = 1/2, a = 0, b = 1.

import { getRelation } from '../catalog.js';

const REL = getRelation('discrete-uniform--bernoulli');
const A_MIN = -3, B_MAX = 5;

export default {
  id: 'discrete-uniform--bernoulli',
  from: 'discrete-uniform',
  to: 'bernoulli',
  title: 'A fair coin is both a Bernoulli trial with p = 1/2 and a discrete uniform variable on {0, 1}',

  plain: [
    'A Bernoulli variable takes the values 0 and 1, with probabilities $1 - p$ and $p$. A discrete uniform variable takes each whole number from $a$ to $b$ with the same probability. The two descriptions agree in exactly one case: two values, 0 and 1 ($a = 0$, $b = 1$), each with probability $1/2$ ($p = 1/2$). That is a fair coin flip.',
    'Away from this point the families separate. A Bernoulli variable with $p \\ne 1/2$ favors one outcome, so it is not uniform. A discrete uniform variable on three or more values has more than two outcomes, so it is not a Bernoulli trial. A uniform variable on two other neighboring values, $\\{a, a + 1\\}$, is a fair coin shifted by $a$: it equals $a + X$ with $X \\sim \\mathrm{Bernoulli}(1/2)$.',
  ],

  statementTex: REL.statement,
  glossary: [
    { sym: 'X \\sim \\mathrm{DUnif}\\{0, 1\\}', meaning: '$X$ is discrete uniform on the two values 0 and 1: each has the same probability.' },
    { sym: '\\iff', meaning: 'If and only if: each statement implies the other.' },
    { sym: '\\mathrm{Bernoulli}(\\tfrac12)', meaning: 'A Bernoulli trial with success probability $p = 1/2$: it equals 1 or 0 with probability $1/2$ each.' },
    { sym: 'P(X = 0) = P(X = 1) = \\tfrac12', meaning: 'Both descriptions give the same two probabilities, so they are the same distribution.' },
  ],

  why: [
    'A distribution on the integers is fully described by its probability mass function, so two distributions are the same exactly when they assign the same probability to every value. The discrete uniform on $\\{0, 1\\}$ has $n = b - a + 1 = 2$ values, each with probability $1/n = 1/2$. The Bernoulli distribution gives $P(X = 1) = p$ and $P(X = 0) = 1 - p$, which are both $1/2$ when $p = 1/2$. The two lists of probabilities agree, so the distributions are identical.',
    'The agreement can be checked on any summary. Both have mean $1/2$: the uniform mean is $(a + b)/2 = 1/2$ and the Bernoulli mean is $p = 1/2$. Both have variance $1/4$: the uniform variance $(n^2 - 1)/12 = 3/12$ and the Bernoulli variance $p(1 - p) = 1/4$. Both have entropy $\\ln 2$, the largest possible for a variable with two values.',
    'To see that this is the only overlap, note that a Bernoulli variable always has exactly the two values 0 and 1, so a matching uniform needs $a = 0$ and $b = 1$; and a uniform on two values gives each probability $1/2$, which forces $p = 1/2$. The demonstration measures how far apart the two distributions are with the total variation distance, half the sum of the absolute differences of their probabilities; it is 0 only at this point.',
  ],

  references: [
    { text: 'Wikipedia: Bernoulli distribution.', url: 'https://en.wikipedia.org/wiki/Bernoulli_distribution' },
    { text: 'Wikipedia: Discrete uniform distribution.', url: 'https://en.wikipedia.org/wiki/Discrete_uniform_distribution' },
    { text: 'Casella, G., & Berger, R. L. (2002). <i>Statistical Inference</i> (2nd ed.), Section 3.2. Duxbury.' },
    { text: 'Leemis, L. M., & McQueston, J. T. (2008). Univariate distribution relationships. <i>The American Statistician</i>, 62(1), 45–53.', url: 'https://doi.org/10.1198/000313008X270448' },
  ],

  demo(container, { math, plot, ui }) {
    const { h } = ui;
    const params = [
      { key: 'p', sym: 'p', name: 'Bernoulli success probability', meaning: 'Probability that the Bernoulli variable equals 1.', min: 0, max: 1, default: 0.3, step: 0.01 },
      { key: 'a', sym: 'a', name: 'uniform lower bound', meaning: 'Smallest value of the discrete uniform variable.', min: A_MIN, max: B_MAX, default: 0, integer: true },
      { key: 'b', sym: 'b', name: 'uniform upper bound', meaning: 'Largest value of the discrete uniform variable (at least $a$).', min: A_MIN, max: B_MAX, default: 2, integer: true },
    ];
    const defaults = { p: 0.3, a: 0, b: 2 };
    const store = ui.createStore({ ...defaults });
    // keep a <= b by pushing the other end along
    const apply = patch => {
      const s = { ...store.get(), ...patch };
      if (s.a > s.b) { if ('b' in patch) s.a = s.b; else s.b = s.a; }
      store.set(s);
    };

    const leftBox = h('div'), rightBox = h('div');
    const readout = h('p', { class: 'demo-readout', 'aria-live': 'polite' });
    const controls = h('div', { class: 'demo-controls' });
    const toCoin = h('button', { type: 'button', class: 'btn small-btn' }, 'Set p = 1/2');
    const toUnif = h('button', { type: 'button', class: 'btn small-btn' }, 'Set a = 0, b = 1');
    toCoin.addEventListener('click', () => apply({ p: 0.5 }));
    toUnif.addEventListener('click', () => apply({ a: 0, b: 1 }));
    container.append(
      ui.rich('p', 'The steel stems are a $\\mathrm{Bernoulli}(p)$ distribution; drag the tip of the amber arrow on the stem at 1 to change $p$. The shaded bars are a discrete uniform distribution on $\\{a, \\dots, b\\}$; drag the amber markers under the axis to change $a$ and $b$. Approach the fair coin from either side: set $p = 1/2$, or shrink the uniform to the two values 0 and 1. The stems sit exactly on top of the bars, and the distance is 0, only when both happen.', { class: 'small muted demo-intro' }),
      h('div', { class: 'demo-grid' },
        h('figure', { class: 'plot-fig' }, h('figcaption', {}, 'Probabilities: Bernoulli (stems) and discrete uniform (bars)'), leftBox),
        h('figure', { class: 'plot-fig' }, h('figcaption', {}, 'The two CDFs'), rightBox)),
      readout, controls);
    const panel = ui.paramPanel(controls, params, {
      get: () => store.get(),
      apply: (key, v) => apply({ [key]: v }),
      onReset: () => store.set({ ...defaults }),
    });
    controls.append(h('div', { class: 'demo-sim-ctl' }, h('h3', { class: 'mini-title' }, 'Go to the overlap'), h('div', { style: 'display:flex;gap:.5rem;flex-wrap:wrap' }, toCoin, toUnif)));

    const left = new plot.Plot(leftBox, { xLabel: 'k', yLabel: 'probability' });
    const right = new plot.Plot(rightBox, { xLabel: 'k', yLabel: 'cumulative probability' });

    const bern = (k, p) => (k === 1 ? p : k === 0 ? 1 - p : 0);
    const unif = (k, a, b) => (k >= a && k <= b ? 1 / (b - a + 1) : 0);
    const bernCdf = (k, p) => (k < 0 ? 0 : k < 1 ? 1 - p : 1);
    const unifCdf = (k, a, b) => (k < a ? 0 : k >= b ? 1 : (Math.floor(k) - a + 1) / (b - a + 1));

    let frozen = null;
    let raf = 0;
    const request = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; draw(); }); };
    store.subscribe(() => { panel.update(store.get()); request(); });

    const endHandle = (key, xd) => {
      const s = store.get();
      return {
        id: key, type: 'xPoint', x: s[key], label: key, lineTo: unif(s[key], s.a, s.b),
        ariaLabel: `Uniform ${key === 'a' ? 'lower' : 'upper'} bound ${key}. Drag left or right, or use the arrow keys.`,
        valueText: String(s[key]), valueNow: s[key], valueMin: A_MIN, valueMax: B_MAX,
        onDrag: (pt, phase) => {
          if (phase === 'start') frozen = xd;
          if (pt) apply({ [key]: math.clamp(Math.round(pt.x), A_MIN, B_MAX) });
          if (phase === 'end') { frozen = null; request(); }
        },
        onKey: steps => apply({ [key]: math.clamp(store.get()[key] + steps, A_MIN, B_MAX) }),
      };
    };

    function draw() {
      const { p, a, b } = store.get();
      const lo = Math.min(a, 0) - 1, hi = Math.max(b, 1) + 1;
      const xd = frozen || [lo - 0.7, hi + 0.7];
      const ks = [];
      for (let k = Math.ceil(xd[0]); k <= Math.floor(xd[1]); k++) ks.push(k);
      left.render({
        x: xd, y: [0, 1.08], discreteX: true,
        layers: [
          { id: 'unif', type: 'bars', points: ks.map(k => [k, unif(k, a, b)]), width: 0.62, cls: 'bars-strong' },
          { id: 'bern', type: 'stems', points: ks.map(k => [k, bern(k, p)]), cls: 'pmf' },
        ],
        handles: [
          endHandle('a', xd), endHandle('b', xd),
          {
            id: 'p', type: 'vArrow', from: { x: 1, y: 0 }, to: { x: 1, y: p }, label: 'p',
            ariaLabel: 'Bernoulli success probability p. Drag up or down, or use the arrow keys.', valueText: ui.fmt(p, 3), valueNow: p, valueMin: 0, valueMax: 1,
            onDrag: pt => { if (pt) apply({ p: math.roundTo(math.clamp(pt.y, 0, 1), 0.005) }); },
            onKey: steps => apply({ p: math.roundTo(math.clamp(store.get().p + 0.01 * steps, 0, 1), 0.01) }),
          },
        ],
        legend: [{ label: `Bernoulli(p = ${fmtP(p)})`, cls: 'curve-main' }, { label: `Discrete uniform on {${fmtI(a)}, …, ${fmtI(b)}}`, cls: 'bars-strong' }],
      });

      // CDFs and the largest gap
      let gap = 0, at = 0, Fa = 0, Fb = 0, tvSum = 0;
      for (let k = lo; k <= hi; k++) {
        tvSum += Math.abs(bern(k, p) - unif(k, a, b));
        const f1 = bernCdf(k, p), f2 = unifCdf(k, a, b);
        if (Math.abs(f1 - f2) > gap + 1e-12) { gap = Math.abs(f1 - f2); at = k; Fa = f1; Fb = f2; }
      }
      const step = (F, id, cls) => ({ id, type: 'step', points: ks.map(k => [k, F(k)]), x0: xd[0], y0: F(ks[0] - 1), cls });
      right.render({
        x: xd, y: [-0.02, 1.06], discreteX: true,
        layers: [
          { id: 'one', type: 'hline', y: 1, cls: 'ref-line' },
          step(k => unifCdf(k, a, b), 'u', 'curve-ref'),
          step(k => bernCdf(k, p), 'b', 'curve-main'),
          ...(gap > 0 ? [
            { id: 'gap', type: 'segment', x1: at, y1: Fa, x2: at, y2: Fb, cls: 'guide' },
            { id: 'gap-dot', type: 'dot', x: at, y: Fa, r: 4.5, cls: 'marker' },
          ] : []),
        ],
        legend: [{ label: 'Bernoulli CDF', cls: 'curve-main' }, { label: 'discrete uniform CDF', cls: 'curve-ref' }],
      });

      const tvd = tvSum / 2;
      const n = b - a + 1;
      let msg;
      if (tvd < 1e-12) msg = 'The two distributions are identical: this is the fair coin, $\\mathrm{DUnif}\\{0, 1\\} = \\mathrm{Bernoulli}(1/2)$.';
      else if (a === 0 && b === 1) msg = 'The uniform is on $\\{0, 1\\}$ already; it matches the Bernoulli only when $p = 1/2$.';
      else if (Math.abs(p - 0.5) < 1e-12 && n === 2) msg = `The uniform has two values with probability 1/2 each, like a fair coin, but on {${fmtI(a)}, ${fmtI(b)}} instead of {0, 1}: it is the fair coin shifted by ${fmtI(a)}.`;
      else if (Math.abs(p - 0.5) < 1e-12) msg = `The Bernoulli is a fair coin, but the uniform has ${n} value${n === 1 ? '' : 's'}; it matches only with $a = 0$ and $b = 1$.`;
      else msg = 'The two coincide only when $p = 1/2$, $a = 0$ and $b = 1$.';
      ui.renderRich(readout,
        `Total variation distance (half the sum of the absolute differences of the probabilities): <b>${ui.fmt(tvd, 3)}</b>. `
        + `Largest gap between the two CDFs: <b>${ui.fmt(gap, 3)}</b>. `
        + `Means: Bernoulli ${ui.fmt(p, 3)}, uniform ${ui.fmt((a + b) / 2, 3)}. Variances: Bernoulli ${ui.fmt(p * (1 - p), 3)}, uniform ${ui.fmt((n * n - 1) / 12, 3)}. ${msg}`);
    }
    draw();
  },
};

function fmtP(p) { return String(Number(p.toPrecision(3))); }
function fmtI(v) { return String(v).replace(/^-/, '−'); }
