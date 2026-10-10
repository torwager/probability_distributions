// Categorical with K = 2 is the Bernoulli distribution (category 1 -> 0, category 2 -> 1).
// Hand-written demo: draggable category probabilities on the left, the Bernoulli distribution of the 0/1 code on
// the right, and a row of simulated trials shown both as categories and as 0/1 codes. For K > 2 the demo shows
// the related fact that the indicator of one chosen category is Bernoulli(p_j).

import { getRelation } from '../catalog.js';

const REL = getRelation('categorical--bernoulli');
const SUB = d => String(d).split('').map(c => '₀₁₂₃₄₅₆₇₈₉'[+c]).join('');

export default {
  id: 'categorical--bernoulli',
  from: 'categorical',
  to: 'bernoulli',
  title: 'A categorical trial with two categories is a Bernoulli trial',

  plain: [
    'The categorical distribution describes one trial with $K$ possible outcomes, labeled $1, \\dots, K$, with probabilities $p_1, \\dots, p_K$ that add up to 1. The Bernoulli distribution describes one trial with two outcomes, coded 1 (success, with probability $p$) and 0 (failure, with probability $1 - p$). With $K = 2$ these are the same thing written with different labels: call category 2 a success and category 1 a failure, so $p = p_2$ and $1 - p = p_1$.',
    'Nothing is lost or added by the relabeling; only the names of the outcomes change. The 0/1 coding is convenient because the code itself is a number whose mean is the success probability, which is why binary data are almost always coded this way. For more than two categories the categorical carries more information than any single Bernoulli variable, but the indicator of any one category (1 if that category occurs, 0 otherwise) is still Bernoulli with probability $p_j$.',
  ],

  statementTex: REL.statement,
  glossary: [
    { sym: '\\mathrm{Categorical}(K = 2;\\ p_1, p_2)', meaning: 'A single trial with two categories, labeled 1 and 2, that occur with probabilities $p_1$ and $p_2 = 1 - p_1$.' },
    { sym: 'K', meaning: 'The number of categories, here 2.' },
    { sym: 'p_1 = 1 - p', meaning: 'The probability of category 1, which becomes the failure (code 0).' },
    { sym: 'p_2 = p', meaning: 'The probability of category 2, which becomes the success (code 1).' },
    { sym: '\\mathrm{Bernoulli}(p)', meaning: 'A single trial that gives 1 with probability $p$ and 0 with probability $1 - p$.' },
    { sym: '1 \\mapsto 0,\\ 2 \\mapsto 1', meaning: 'The relabeling: category 1 is written as 0 and category 2 as 1. Which category is called the success is a choice; swapping them gives $\\mathrm{Bernoulli}(1 - p)$.' },
  ],

  why: [
    'Two distributions on a finite set are the same when they give the same probability to every outcome. The categorical with $K = 2$ gives probability $p_1$ to category 1 and $p_2$ to category 2. Writing $Y$ for the categorical outcome and $X = Y - 1$ for the relabeled outcome,',
    { tex: 'P(X = 0) = P(Y = 1) = p_1 = 1 - p, \\qquad P(X = 1) = P(Y = 2) = p_2 = p,' },
    'which are exactly the Bernoulli probabilities. The general categorical probability, written with indicators as $P(Y = y) = p_1^{[y = 1]} p_2^{[y = 2]}$, becomes the familiar Bernoulli form $P(X = x) = p^{x}(1 - p)^{1 - x}$ for $x \\in \\{0, 1\\}$.',
    'For $K > 2$ categories, fix one category $j$ and let $B = [Y = j]$, which is 1 if the outcome is $j$ and 0 otherwise. Then $P(B = 1) = p_j$, so $B \\sim \\mathrm{Bernoulli}(p_j)$. Grouping categories works the same way: the indicator that $Y$ falls in a set $S$ of categories is $\\mathrm{Bernoulli}\\big(\\sum_{j \\in S} p_j\\big)$. These indicators are the entries of the one-hot vector of the categorical outcome. Repeating the trial $n$ times and adding up turns the Bernoulli into the binomial and the categorical into the multinomial.',
  ],

  references: [
    { text: 'Wikipedia: Categorical distribution.', url: 'https://en.wikipedia.org/wiki/Categorical_distribution' },
    { text: 'Wikipedia: Bernoulli distribution.', url: 'https://en.wikipedia.org/wiki/Bernoulli_distribution' },
    { text: 'Bishop, C. M. (2006). <i>Pattern Recognition and Machine Learning</i>, Sections 2.1 and 2.2. Springer.' },
    { text: 'Agresti, A. (2013). <i>Categorical Data Analysis</i> (3rd ed.), Section 1.2. Wiley.' },
  ],

  demo(container, { math, plot, ui }) {
    const { h } = ui;
    const params = [{ key: 'K', sym: 'K', name: 'number of categories', meaning: 'With $K = 2$ the categorical is a Bernoulli trial. With more categories, the indicator of one chosen category is Bernoulli.', min: 2, max: 6, default: 2, integer: true }];
    const startProbs = K => (K === 2 ? [0.7, 0.3] : new Array(K).fill(1 / K));
    const store = ui.createStore({ K: 2, probs: [0.7, 0.3], j: 2, seed: 1 });

    const catBox = h('div'), berBox = h('div');
    const readout = h('p', { class: 'demo-readout', 'aria-live': 'polite' });
    const trials = h('div', { class: 'cat-trials', style: 'font-family:var(--mono);font-size:.86rem;line-height:1.9;overflow-x:auto;padding:.6rem .8rem;border:1px solid var(--line);border-radius:10px;background:var(--surface);margin:.8rem 0' });
    const controls = h('div', { class: 'demo-controls' });
    const jBox = h('div');
    container.append(
      ui.rich('p', 'Left: the probability of each category; drag the top of an arrow to change it (the others are rescaled so that the total stays 1). Right: the distribution of the 0/1 code. With $K = 2$, category 2 is coded 1 and category 1 is coded 0, and the right plot is exactly the Bernoulli distribution with $p = p_2$. With more categories, choose which category counts as a success; its indicator is $\\mathrm{Bernoulli}(p_j)$. You can also drag the arrow on the right plot.', { class: 'small muted demo-intro' }),
      h('div', { class: 'demo-grid' },
        h('figure', { class: 'plot-fig' }, h('figcaption', {}, 'Categorical outcome Y: probability of each category'), catBox),
        h('figure', { class: 'plot-fig' }, h('figcaption', {}, 'Code X (1 = success, 0 = failure): Bernoulli'), berBox)),
      readout, trials, controls);

    const panel = ui.paramPanel(controls, params, {
      get: () => store.get(),
      apply: (k, v) => { const K = Math.round(v); store.set({ K, probs: startProbs(K), j: K === 2 ? 2 : Math.min(store.get().j, K) }); },
      onReset: () => store.set({ K: 2, probs: [0.7, 0.3], j: 2 }),
    });
    const again = h('button', { type: 'button', class: 'btn small-btn' }, 'Draw new trials');
    again.addEventListener('click', () => store.set({ seed: store.get().seed + 1 }));
    controls.append(h('div', { class: 'demo-sim-ctl' }, h('h3', { class: 'mini-title' }, 'Success category'), jBox, h('div', {}, again)));

    let seg = null, segK = 0;
    function updateSeg() {
      const { K, j } = store.get();
      if (segK !== K) {
        segK = K;
        jBox.textContent = '';
        seg = ui.segmented(Array.from({ length: K }, (_, i) => ({ value: i + 1, label: `category ${i + 1}` })), j, v => store.set({ j: v }), 'Which category counts as a success');
        jBox.append(seg.el);
      } else seg.set(j);
    }

    const catPlot = new plot.Plot(catBox, { xLabel: 'category y', yLabel: 'probability' });
    const berPlot = new plot.Plot(berBox, { xLabel: 'code x', yLabel: 'probability' });
    const setOne = (probs, i, v) => {
      v = math.clamp(v, 0, 1);
      const rest = probs.reduce((s, q, k) => s + (k === i ? 0 : q), 0);
      return probs.map((q, k) => (k === i ? v : rest > 0 ? q * (1 - v) / rest : (1 - v) / (probs.length - 1)));
    };
    const setProb = (i, v) => store.set({ probs: setOne(store.get().probs, i, math.roundTo(v, 0.005)) });

    let raf = 0;
    const request = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; draw(); }); };
    store.subscribe(() => { panel.update(store.get()); updateSeg(); request(); });

    function draw() {
      const { K, probs, j, seed } = store.get();
      const pj = probs[j - 1];
      // left: categories with the success category highlighted
      const bars = probs.map((q, i) => [i + 1, q]);
      catPlot.render({
        x: [0.3, K + 0.7], y: [0, 1.08], discreteX: true,
        layers: [
          { id: 'bars', type: 'bars', points: bars.filter(([k]) => k !== j), width: 0.56, cls: 'bars-strong' },
          { id: 'succ', type: 'polygon', points: [[j - 0.28, 0], [j + 0.28, 0], [j + 0.28, pj], [j - 0.28, pj]], cls: 'area-shade' },
          ...bars.map(([k, q]) => ({ id: 'code' + k, type: 'text', x: k, y: Math.min(0.99, q + 0.08), text: k === j ? 'code 1' : 'code 0' })),
        ],
        handles: bars.map(([k, q]) => ({
          id: 'p' + k, type: 'vArrow', from: { x: k, y: 0 }, to: { x: k, y: q }, label: 'p' + SUB(k),
          ariaLabel: `Probability of category ${k}. Drag up or down, or use the arrow keys.`,
          valueText: ui.fmt(q, 3), valueNow: q, valueMin: 0, valueMax: 1,
          onDrag: pt => { if (pt) setProb(k - 1, pt.y); },
          onKey: steps => setProb(k - 1, store.get().probs[k - 1] + 0.01 * steps),
        })),
        legend: [{ label: `Categorical(K = ${K})`, cls: 'bars-strong' }, { label: `category ${j}: the success`, cls: 'area-shade' }],
      });
      // right: Bernoulli(p_j)
      berPlot.render({
        x: [-0.7, 1.7], y: [0, 1.08], discreteX: true,
        layers: [
          { id: 'b0', type: 'bars', points: [[0, 1 - pj]], width: 0.5, cls: 'bars-strong' },
          { id: 'b1', type: 'polygon', points: [[0.75, 0], [1.25, 0], [1.25, pj], [0.75, pj]], cls: 'area-shade' },
          { id: 't0', type: 'text', x: 0, y: Math.min(0.99, 1 - pj + 0.08), text: K === 2 ? 'category 1' : `not ${j}` },
          { id: 't1', type: 'text', x: 1, y: Math.min(0.99, pj + 0.08), text: `category ${j}` },
        ],
        handles: [{
          id: 'p', type: 'vArrow', from: { x: 1, y: 0 }, to: { x: 1, y: pj }, label: 'p',
          ariaLabel: `Success probability p, which equals the probability of category ${j}. Drag up or down, or use the arrow keys.`,
          valueText: ui.fmt(pj, 3), valueNow: pj, valueMin: 0, valueMax: 1,
          onDrag: pt => { if (pt) setProb(j - 1, pt.y); },
          onKey: steps => setProb(j - 1, store.get().probs[j - 1] + 0.01 * steps),
        }],
        legend: [{ label: `Bernoulli(p = ${ui.fmt(pj, 3)})`, cls: 'bars-strong' }],
      });

      // readout
      const pStr = ui.fmt(pj, 3), qStr = ui.fmt(1 - pj, 3);
      ui.renderRich(readout, K === 2
        ? `$P(Y = 2) = p_2$ = <b>${ui.fmt(probs[1], 3)}</b> and $P(Y = 1) = p_1$ = <b>${ui.fmt(probs[0], 3)}</b>. ` + (j === 2
          ? `After relabeling $1 \\mapsto 0$ and $2 \\mapsto 1$ the code is $\\mathrm{Bernoulli}(p)$ with $p$ = <b>${pStr}</b>: mean $p$ = ${pStr}, variance $p(1-p)$ = ${ui.fmt(pj * (1 - pj), 3)}.`
          : `Calling category 1 the success instead gives $\\mathrm{Bernoulli}(p_1)$ = $\\mathrm{Bernoulli}(1 - p_2)$ with success probability <b>${pStr}</b>; the choice of label is arbitrary.`)
        : `With $K$ = ${K} categories the outcome is not a Bernoulli variable, but the indicator $[Y = ${j}]$ is $\\mathrm{Bernoulli}(p_{${j}})$ with $p_{${j}}$ = <b>${pStr}</b>; the other ${K - 1} categories together have probability ${qStr} and are all coded 0. Set $K = 2$ to get the special case in the statement.`);

      // simulated trials
      const rng = math.makeRng(500 + seed * 7);
      const ys = [];
      for (let i = 0; i < 30; i++) ys.push(rng.categorical(probs) + 1);
      const xs = ys.map(y => (y === j ? 1 : 0));
      const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
      trials.innerHTML = '';
      trials.append(
        h('div', { style: 'white-space:nowrap' }, h('span', { class: 'muted', style: 'display:inline-block;min-width:9.5em' }, 'category Y: '), ys.join(' ')),
        h('div', { style: 'white-space:nowrap' }, h('span', { class: 'muted', style: 'display:inline-block;min-width:9.5em' }, 'code X: '),
          ...xs.map((x, i) => h('span', { style: x ? 'color:var(--amber-deep);font-weight:600' : '' }, (i ? ' ' : '') + x))),
        h('div', { class: 'muted', style: 'white-space:nowrap' }, `30 simulated trials: proportion of 1s = ${ui.fmt(mean, 3)} (expected p = ${pStr})`));
    }
    updateSeg();
    draw();
  },
};
