// Categorical -> Multinomial: counting the outcomes of n independent categorical trials gives a multinomial vector.
// Hand-written demo: draggable category probabilities with the proportions from one simulated set of n trials,
// the trials themselves and their counts, and the distribution of one count over many repetitions compared with
// its exact multinomial marginal, Bin(n, p_j).

import { getRelation } from '../catalog.js';

const REL = getRelation('categorical--multinomial');
const SUB = d => String(d).split('').map(c => '₀₁₂₃₄₅₆₇₈₉'[+c]).join('');
const REPS = 4000;

export default {
  id: 'categorical--multinomial',
  from: 'categorical',
  to: 'multinomial',
  title: 'Counting the outcomes of repeated categorical trials gives a multinomial vector of counts',

  plain: [
    'A categorical trial has $K$ possible outcomes with probabilities $p_1, \\dots, p_K$. Repeat the trial $n$ times independently, for example roll a die $n$ times or record the choices of $n$ participants, and count how often each outcome occurs. The vector of counts $(X_1, \\dots, X_K)$ has the multinomial distribution with $n$ trials and probabilities $\\mathbf p$. The counts always add up to $n$.',
    'This is the step from the Bernoulli to the binomial distribution, extended to more than two categories. Conversely, a single categorical trial is a multinomial with $n = 1$: its count vector has a single 1 in the position of the outcome and 0 elsewhere (the one-hot coding). Each count on its own is binomial, $X_j \\sim \\mathrm{Bin}(n, p_j)$, because category $j$ either occurs or not on each trial; the counts are negatively correlated, because a trial that lands in one category cannot land in another.',
  ],

  statementTex: REL.statement,
  glossary: [
    { sym: 'Y_1, \\dots, Y_n', meaning: 'The outcomes of the $n$ trials, each a category label from 1 to $K$.' },
    { sym: '\\overset{iid}{\\sim}', meaning: 'Independent and identically distributed: every trial has the same probabilities and the trials do not affect each other.' },
    { sym: '\\mathrm{Categorical}(\\mathbf p)', meaning: 'A single trial with outcome $j$ having probability $p_j$.' },
    { sym: '\\mathbf p = (p_1, \\dots, p_K)', meaning: 'The vector of category probabilities; the entries are non-negative and add up to 1.' },
    { sym: 'K', meaning: 'The number of categories.' },
    { sym: 'X_j = \\#\\{i : Y_i = j\\}', meaning: 'The count of category $j$: the number of trials $i$ whose outcome is $j$. The symbol $\\#\\{\\dots\\}$ means the number of items satisfying the condition.' },
    { sym: '\\Rightarrow', meaning: 'Implies.' },
    { sym: '(X_1, \\dots, X_K) \\sim \\mathrm{Multinomial}(n, \\mathbf p)', meaning: 'The vector of counts has the multinomial distribution with $n$ trials and probabilities $\\mathbf p$.' },
    { sym: 'n', meaning: 'The number of trials.' },
    { sym: '\\mathrm{Multinomial}(1, \\mathbf p)', meaning: 'The multinomial with a single trial: a vector with one entry equal to 1 and the rest 0.' },
    { sym: '\\text{one-hot form}', meaning: 'Writing a categorical outcome $j$ as the vector with a 1 in position $j$ and 0 elsewhere.' },
  ],

  why: [
    'Any particular sequence of outcomes $y_1, \\dots, y_n$ in which category $j$ occurs $x_j$ times has probability $p_1^{x_1} p_2^{x_2} \\cdots p_K^{x_K}$, because the trials are independent and each factor $p_j$ appears once for every trial that lands in category $j$. The probability of the counts adds this up over all sequences with the same counts. The number of such sequences is the multinomial coefficient, the number of ways to assign $x_1$ of the $n$ trial positions to category 1, $x_2$ to category 2, and so on:',
    { tex: 'P(X_1 = x_1, \\dots, X_K = x_K) = \\frac{n!}{x_1!\\, x_2! \\cdots x_K!}\\; p_1^{x_1} p_2^{x_2} \\cdots p_K^{x_K}, \\qquad x_1 + \\dots + x_K = n.' },
    'This is the multinomial probability. In vector form, write each trial as its one-hot vector $\\mathbf e_{Y_i}$; then the count vector is the sum $\\mathbf X = \\sum_{i=1}^n \\mathbf e_{Y_i}$. Each one-hot vector has mean $\\mathbf p$ and covariance matrix $\\mathrm{diag}(\\mathbf p) - \\mathbf p\\mathbf p^{\\top}$, so the sum of $n$ independent ones has',
    { tex: '\\mathrm{E}[X_j] = n p_j, \\qquad \\mathrm{Var}(X_j) = n p_j (1 - p_j), \\qquad \\mathrm{Cov}(X_i, X_j) = -n p_i p_j \\ (i \\ne j).' },
    'The covariances are negative because the counts must add up to $n$. With $K = 2$ the vector is $(X_1, n - X_1)$ and the multinomial reduces to the binomial. As $n$ grows, the multivariate central limit theorem makes the count vector approximately multivariate normal, which leads to Pearson’s chi-squared test.',
  ],

  references: [
    { text: 'Wikipedia: Multinomial distribution.', url: 'https://en.wikipedia.org/wiki/Multinomial_distribution' },
    { text: 'Wikipedia: Categorical distribution.', url: 'https://en.wikipedia.org/wiki/Categorical_distribution' },
    { text: 'Casella, G., & Berger, R. L. (2002). <i>Statistical Inference</i> (2nd ed.), Section 4.6 (the multinomial distribution). Duxbury.' },
    { text: 'Gelman, A., Carlin, J. B., Stern, H. S., Dunson, D. B., Vehtari, A., & Rubin, D. B. (2013). <i>Bayesian Data Analysis</i> (3rd ed.), Section 3.4. CRC Press.', url: 'http://www.stat.columbia.edu/~gelman/book/' },
    { text: 'Agresti, A. (2013). <i>Categorical Data Analysis</i> (3rd ed.), Section 1.2. Wiley.' },
  ],

  demo(container, { math, plot, ui }) {
    const { h } = ui;
    const params = [
      { key: 'K', sym: 'K', name: 'number of categories', meaning: 'How many outcomes each trial has. Changing it resets the probabilities to be equal.', min: 2, max: 6, default: 3, integer: true },
      { key: 'n', sym: 'n', name: 'number of trials', meaning: 'How many independent categorical trials are counted. With $n = 1$ the count vector is the one-hot form of a single outcome.', min: 1, max: 60, default: 12, integer: true },
    ];
    const P0 = [0.5, 0.3, 0.2];
    const store = ui.createStore({ K: 3, n: 12, probs: P0.slice(), j: 1, seed: 1 });

    const catBox = h('div'), margBox = h('div');
    const seqBox = h('div', { style: 'font-family:var(--mono);font-size:.86rem;line-height:1.9;overflow-x:auto;padding:.6rem .8rem;border:1px solid var(--line);border-radius:10px;background:var(--surface);margin:.8rem 0' });
    const readout = h('p', { class: 'demo-readout', 'aria-live': 'polite' });
    const controls = h('div', { class: 'demo-controls' });
    const jBox = h('div');
    container.append(
      ui.rich('p', 'Left: the category probabilities (bars; drag the arrow tips) and the proportions $X_j/n$ from one simulated set of $n$ trials (amber dots). The box below lists those trials and their counts. Right: over many repetitions of the $n$ trials, the frequencies of one count $X_j$ (choose $j$ below) compared with its exact multinomial marginal distribution, $\\mathrm{Bin}(n, p_j)$.', { class: 'small muted demo-intro' }),
      h('div', { class: 'demo-grid' },
        h('figure', { class: 'plot-fig' }, h('figcaption', {}, 'Category probabilities and one simulated set of proportions'), catBox),
        h('figure', { class: 'plot-fig' }, ui.rich('figcaption', `Count of one category over ${REPS.toLocaleString('en-US')} repetitions`), margBox)),
      seqBox, readout, controls);

    const resetProbs = K => (K === 3 ? P0.slice() : new Array(K).fill(1 / K));
    const panel = ui.paramPanel(controls, params, {
      get: () => store.get(),
      apply: (k, v) => {
        const s = store.get();
        if (k === 'K') store.set({ K: v, probs: resetProbs(v), j: Math.min(s.j, v) });
        else store.set({ [k]: v });
      },
      onReset: () => store.set({ K: 3, n: 12, probs: P0.slice(), j: 1 }),
    });
    const again = h('button', { type: 'button', class: 'btn small-btn' }, 'Draw new samples');
    again.addEventListener('click', () => store.set({ seed: store.get().seed + 1 }));
    controls.append(h('div', { class: 'demo-sim-ctl' }, h('h3', { class: 'mini-title' }, 'Count shown on the right'), jBox, h('div', {}, again)));

    let seg = null, segK = 0;
    function updateSeg() {
      const { K, j } = store.get();
      if (segK !== K) {
        segK = K; jBox.textContent = '';
        seg = ui.segmented(Array.from({ length: K }, (_, i) => ({ value: i + 1, label: 'X' + SUB(i + 1) })), j, v => store.set({ j: v }), 'Which count to show');
        jBox.append(seg.el);
      } else seg.set(j);
    }

    const catPlot = new plot.Plot(catBox, { xLabel: 'category j', yLabel: 'probability or proportion' });
    const margPlot = new plot.Plot(margBox, { xLabel: 'count x', yLabel: 'probability' });
    const setOne = (probs, i, v) => {
      v = math.clamp(v, 0, 1);
      const rest = probs.reduce((s, q, k) => s + (k === i ? 0 : q), 0);
      return probs.map((q, k) => (k === i ? v : rest > 0 ? q * (1 - v) / rest : (1 - v) / (probs.length - 1)));
    };
    const setProb = (i, v) => store.set({ probs: setOne(store.get().probs, i, math.roundTo(v, 0.005)) });

    let sim = { key: '' };
    function simulate(s) {
      const key = JSON.stringify([s.K, s.n, s.probs, s.seed]);
      if (sim.key !== key) {
        const rng = math.makeRng(3001 + 17 * s.seed);
        const one = Array.from({ length: s.n }, () => rng.categorical(s.probs) + 1);
        const counts = new Array(s.K).fill(0);
        one.forEach(y => counts[y - 1]++);
        // many repetitions: count vectors built by tallying n categorical draws each
        const reps = [];
        for (let r = 0; r < REPS; r++) {
          const c = new Array(s.K).fill(0);
          for (let i = 0; i < s.n; i++) c[rng.categorical(s.probs)]++;
          reps.push(c);
        }
        sim = { key, one, counts, reps };
      }
      return sim;
    }

    let raf = 0;
    const request = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; draw(); }); };
    store.subscribe(() => { panel.update(store.get()); updateSeg(); request(); });

    function draw() {
      const s = store.get();
      const { K, n, probs, j } = s;
      const sm = simulate(s);
      const bars = probs.map((q, i) => [i + 1, q]);
      catPlot.render({
        x: [0.3, K + 0.7], y: [0, 1.08], discreteX: true,
        layers: [
          { id: 'bars', type: 'bars', points: bars, width: 0.56, cls: 'bars-strong' },
          ...sm.counts.map((c, i) => ({ id: 'd' + i, type: 'dot', x: i + 1 + 0.17, y: c / n, r: 5, cls: 'marker' })),
        ],
        handles: bars.map(([k, q]) => ({
          id: 'p' + k, type: 'vArrow', from: { x: k - 0.1, y: 0 }, to: { x: k - 0.1, y: q }, label: 'p' + SUB(k),
          ariaLabel: `Probability of category ${k}. Drag up or down, or use the arrow keys.`,
          valueText: ui.fmt(q, 3), valueNow: q, valueMin: 0, valueMax: 1,
          onDrag: pt => { if (pt) setProb(k - 1, pt.y); },
          onKey: steps => setProb(k - 1, store.get().probs[k - 1] + 0.01 * steps),
        })),
        legend: [{ label: 'probability pⱼ', cls: 'bars-strong' }, { label: `proportion Xⱼ/n in one set of ${n} trials`, cls: 'marker', shape: 'dot' }],
      });

      // right: X_j over repetitions vs Bin(n, p_j)
      const pj = probs[j - 1];
      const freq = new Array(n + 1).fill(0);
      sm.reps.forEach(c => freq[c[j - 1]]++);
      const binom = Array.from({ length: n + 1 }, (_, x) => (pj <= 0 ? (x === 0 ? 1 : 0) : pj >= 1 ? (x === n ? 1 : 0) : Math.exp(math.logBinom(n, x) + x * Math.log(pj) + (n - x) * Math.log1p(-pj))));
      const mu = n * pj, sd = Math.sqrt(n * pj * (1 - pj));
      const lo = Math.max(0, Math.floor(mu - 4.5 * sd) - 1), hi = Math.min(n, Math.ceil(mu + 4.5 * sd) + 1);
      const top = Math.max(...binom, ...freq.map(f => f / REPS)) * 1.15;
      margPlot.render({
        x: [lo - 0.7, hi + 0.7], y: [0, Math.min(1.08, top)], discreteX: true,
        layers: [
          { id: 'freq', type: 'bars', points: freq.map((f, x) => [x, f / REPS]).filter(([x]) => x >= lo && x <= hi), width: 0.7, cls: 'bars-strong' },
          { id: 'bin', type: 'stems', points: binom.map((v, x) => [x, v]).filter(([x]) => x >= lo && x <= hi), cls: 'pmf' },
          { id: 'obs', type: 'vline', x: sm.counts[j - 1], cls: 'guide' },
        ],
        legend: [{ label: `simulated X${SUB(j)}`, cls: 'bars-strong' }, { label: `Binomial(n = ${n}, p${SUB(j)} = ${ui.fmt(pj, 3)})`, cls: 'pmf' }],
      });

      // trials and counts
      const multProb = Math.exp(math.lfactorial(n) + sm.counts.reduce((a, c, i) => a - math.lfactorial(c) + (c > 0 ? c * Math.log(probs[i]) : 0), 0));
      seqBox.innerHTML = '';
      seqBox.append(
        h('div', { style: 'white-space:nowrap' }, h('span', { class: 'muted', style: 'display:inline-block;min-width:8.5em' }, 'trials Yᵢ: '), sm.one.join(' ')),
        h('div', { style: 'white-space:nowrap' }, h('span', { class: 'muted', style: 'display:inline-block;min-width:8.5em' }, 'counts Xⱼ: '),
          '(' + sm.counts.join(', ') + ')', h('span', { class: 'muted' }, `   total ${n}`)),
        n === 1 ? h('div', { class: 'muted' }, 'With n = 1 the count vector is the one-hot form of the single outcome.') : '',
        h('div', { class: 'muted', style: 'white-space:nowrap' }, `multinomial probability of these counts: ${ui.fmt(multProb, 3)}`));

      // readout: moments over the repetitions
      const mean = new Array(K).fill(0);
      sm.reps.forEach(c => c.forEach((v, i) => { mean[i] += v / REPS; }));
      const a = j - 1, b = j % K;
      let cov = 0;
      sm.reps.forEach(c => { cov += (c[a] - mean[a]) * (c[b] - mean[b]); });
      cov /= REPS - 1;
      ui.renderRich(readout,
        `Over ${REPS.toLocaleString('en-US')} repetitions the average counts are (${mean.map(v => ui.fmt(v, 3)).join(', ')}); the multinomial means $np_j$ are (${probs.map(q => ui.fmt(n * q, 3)).join(', ')}). `
        + `The sample covariance of $X_{${a + 1}}$ and $X_{${b + 1}}$ is <b>${ui.fmt(cov, 3)}</b>; the multinomial value $-np_{${a + 1}}p_{${b + 1}}$ is <b>${ui.fmt(-n * probs[a] * probs[b], 3)}</b>. The dashed amber line on the right marks the count in the one set of trials listed above.`);
    }
    updateSeg();
    draw();
  },
};
