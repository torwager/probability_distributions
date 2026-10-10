// Geometric <-> Negative binomial: the sum of r independent Geom(p) counts is NegBin(r, p), and NegBin(1, p) = Geom(p).
// Demo: (1) one simulated sequence of trials cut into r geometric waits; (2) simulationDemo: sums of r geometric
// counts against the NegBin(r, p) PMF; (3) compareDemo: NegBin(r, p) against Geom(p), which coincide at r = 1.
// Self-contained: the PMFs are computed here with math.lgamma and math.betaI.

import { getRelation } from '../catalog.js';
import { lgamma, betaI, quantileDiscrete } from '../core/math.js';

const REL = getRelation('geometric--negative-binomial');

const nbPmf = (k, r, p) => (k < 0 || !Number.isInteger(k) ? 0 : p >= 1 ? (k === 0 ? 1 : 0)
  : Math.exp(lgamma(k + r) - lgamma(r) - lgamma(k + 1) + r * Math.log(p) + k * Math.log1p(-p)));
const nbCdf = (x, r, p) => (x < 0 ? 0 : p >= 1 ? 1 : betaI(p, r, Math.floor(x) + 1));
const nbQuantile = (u, r, p) => quantileDiscrete(x => nbCdf(x, r, p), u, 0, Infinity, Math.floor(r * (1 - p) / p));
// the geometric is NegBin(1, p); computing it through the same functions makes the two agree exactly at r = 1
const geomPmf = (k, p) => nbPmf(k, 1, p);
const geomCdf = (x, p) => nbCdf(x, 1, p);

const fmtP = v => String(Number(v.toPrecision(3)));

export default {
  id: 'geometric--negative-binomial',
  from: 'geometric',
  to: 'negative-binomial',
  title: 'Adding independent geometric waits gives a negative binomial count, and the negative binomial with r = 1 is the geometric',

  plain: [
    'Think of a long sequence of independent trials, each a success with probability $p$. The number of failures before the first success is geometric. After that success the process starts afresh, so the number of failures between the first and second success is another, independent geometric count with the same $p$, and so on.',
    'The total number of failures before the $r$-th success is therefore the sum of $r$ independent geometric counts, and this total has the negative binomial distribution $\\mathrm{NegBin}(r, p)$. Read in the other direction, a negative binomial count with a whole-number $r$ can be cut into $r$ geometric pieces, and with $r = 1$ the negative binomial is simply the geometric distribution.',
    'Both distributions count failures (not trials) on this site, so the supports are $0, 1, 2, \\dots$ and no shifts are needed.',
  ],

  statementTex: REL.statement,
  glossary: [
    { sym: 'K_1, \\dots, K_r', meaning: 'The numbers of failures in $r$ successive waits: $K_1$ failures before the first success, $K_2$ failures between the first and second success, and so on.' },
    { sym: '\\overset{iid}{\\sim}', meaning: 'Independent and identically distributed: every $K_i$ has the same distribution and none affects the others.' },
    { sym: '\\mathrm{Geom}(p)', meaning: 'The geometric distribution: the number of failures before the first success, $P(K = k) = (1 - p)^k p$ for $k = 0, 1, 2, \\dots$' },
    { sym: 'p', meaning: 'The success probability of each trial, the same for all trials.' },
    { sym: 'r', meaning: 'The number of successes waited for. In the sum it is a whole number $1, 2, 3, \\dots$' },
    { sym: '\\Rightarrow', meaning: 'Implies.' },
    { sym: '\\sum_{i=1}^r K_i', meaning: 'The total number of failures, $K_1 + K_2 + \\dots + K_r$, which is the number of failures before the $r$-th success.' },
    { sym: '\\mathrm{NegBin}(r, p)', meaning: 'The negative binomial distribution: the number of failures before the $r$-th success, $P(K = k) = \\binom{k + r - 1}{k} p^r (1 - p)^k$.' },
    { sym: '\\mathrm{NegBin}(1,p)=\\mathrm{Geom}(p)', meaning: 'With $r = 1$ the two distributions are the same: waiting for one success.' },
  ],

  why: [
    '<b>Counting sequences.</b> The total is $k$ exactly when the $r$-th success happens on trial $k + r$. That trial must be a success, and the $k + r - 1$ trials before it must contain $r - 1$ successes and $k$ failures in some order. There are $\\binom{k + r - 1}{k}$ such orders, each with probability $p^r(1-p)^k$, so',
    { tex: 'P\\Big(\\sum_{i=1}^{r} K_i = k\\Big) = \\binom{k + r - 1}{k}\\, p^{r} (1 - p)^{k},' },
    'which is the negative binomial probability. With $r = 1$ the coefficient is $\\binom{k}{k} = 1$ and the formula reduces to the geometric $(1-p)^k p$.',
    '<b>Generating functions.</b> The geometric probability-generating function is $G(z) = p/(1 - (1 - p) z)$. The generating function of a sum of independent counts is the product of their generating functions, so the sum of $r$ geometric counts has',
    { tex: 'G_{K_1 + \\dots + K_r}(z) = \\left(\\frac{p}{1 - (1 - p) z}\\right)^{r},' },
    'the generating function of $\\mathrm{NegBin}(r, p)$. The means and variances add as well: each $K_i$ has mean $(1-p)/p$ and variance $(1-p)/p^2$, giving the negative binomial mean $r(1-p)/p$ and variance $r(1-p)/p^2$.',
    '<b>Non-integer r.</b> The negative binomial also allows non-integer $r$, which no sum of geometric counts can produce. The generating-function argument still shows that $\\mathrm{NegBin}(r_1, p) + \\mathrm{NegBin}(r_2, p) = \\mathrm{NegBin}(r_1 + r_2, p)$ for any positive $r_1, r_2$, so a negative binomial count can be split into as many independent pieces as one likes (it is infinitely divisible).',
  ],

  references: [
    { text: 'Wikipedia: Negative binomial distribution (related distributions).', url: 'https://en.wikipedia.org/wiki/Negative_binomial_distribution#Related_distributions' },
    { text: 'Wikipedia: Geometric distribution.', url: 'https://en.wikipedia.org/wiki/Geometric_distribution' },
    { text: 'Casella, G., & Berger, R. L. (2002). <i>Statistical Inference</i> (2nd ed.), Section 3.2 (negative binomial and geometric distributions). Duxbury.' },
    { text: 'Johnson, N. L., Kemp, A. W., & Kotz, S. (2005). <i>Univariate Discrete Distributions</i> (3rd ed.), Chapter 5. Wiley.', url: 'https://doi.org/10.1002/0471715816' },
    { text: 'Leemis, L. M., & McQueston, J. T. (2008). Univariate distribution relationships. <i>The American Statistician</i>, 62(1), 45–53.', url: 'https://doi.org/10.1198/000313008X270448' },
  ],

  demo(container, { demos, ui, math }) {
    const { h } = ui;

    // ---------------------------------------------------------------- 1. sums of geometric waits
    container.append(h('h3', {}, 'Adding r geometric waits'));
    const seqBox = h('div', { class: 'gnb-seq', 'aria-live': 'polite' });
    const seqNote = h('p', { class: 'small muted', style: 'margin:.4rem 0 0' });
    const again = h('button', { type: 'button', class: 'btn small-btn' }, 'Simulate another sequence');
    const seqFig = h('figure', { class: 'plot-fig', style: 'margin:0 0 1.2rem' },
      ui.rich('figcaption', 'One simulated sequence of trials until the $r$-th success. Each bracket is one geometric wait $K_i$: its failures (light squares) and the success that ends it (dark square).'),
      seqBox, seqNote, h('div', { style: 'margin-top:.5rem' }, again));
    container.append(seqFig);

    const sim = h('div');
    container.append(sim);
    const res = demos.simulationDemo(sim, null, {
      intro: 'Each simulated value is the total number of failures in $r$ independent geometric waits with success probability $p$. The bars show how often each total occurred; the stems show the $\\mathrm{NegBin}(r, p)$ probabilities. Change $r$ and $p$ in the boxes, or draw new samples.',
      params: [
        { key: 'r', sym: 'r', name: 'number of successes', meaning: 'How many geometric waits are added (a whole number).', min: 1, max: 15, default: 3, integer: true },
        { key: 'p', sym: 'p', name: 'success probability', meaning: 'Probability of success on each trial.', min: 0.1, max: 0.95, default: 0.4, step: 0.01 },
      ],
      sample: (rng, { r, p }) => { let s = 0; for (let i = 0; i < r; i++) s += rng.geometric(p); return s; },
      sampleName: 'sums of r geometric counts',
      target: {
        name: ({ r, p }) => `NegBin(r = ${r}, p = ${fmtP(p)}) probabilities`,
        pdf: (k, { r, p }) => nbPmf(k, r, p),
        cdf: (x, { r, p }) => nbCdf(x, r, p),
        discrete: true,
      },
      range: ({ r, p }) => [0, Math.max(6, nbQuantile(0.998, r, p))],
      xLabel: 'k (total number of failures)',
      readout: ({ r, p }) => `Negative binomial mean $r(1-p)/p$ = <b>${ui.fmt(r * (1 - p) / p, 4)}</b>, standard deviation $\\sqrt{r(1-p)}/p$ = <b>${ui.fmt(Math.sqrt(r * (1 - p)) / p, 4)}</b>.`,
    });

    // the sequence strip: plain HTML squares, which wrap onto several lines on narrow screens
    let seqSeed = 1;
    function drawSequence() {
      const { r, p } = res.store.get().p;
      const rng = math.makeRng(5000 + seqSeed);
      seqBox.textContent = '';
      const counts = [];
      for (let i = 0; i < r; i++) {
        let k = 0;
        while (rng.random() >= p) k++;
        counts.push(k);
        const cells = [];
        for (let j = 0; j < k; j++) cells.push(h('span', { class: 'gnb-cell fail', title: 'failure' }));
        cells.push(h('span', { class: 'gnb-cell success', title: 'success' }));
        seqBox.append(h('span', { class: 'gnb-group' },
          h('span', { class: 'gnb-cells' }, ...cells),
          h('span', { class: 'gnb-brace', 'aria-hidden': 'true' }),
          ui.rich('span', `$K_{${i + 1}} = ${k}$`, { class: 'gnb-label' })));
      }
      const total = counts.reduce((a, b) => a + b, 0);
      ui.renderRich(seqNote, `Total failures before success number ${r}: $${counts.join(' + ')} = ${total}$, after ${total + r} trials in all. This total is one draw from $\\mathrm{NegBin}(${r}, ${fmtP(p)})$.`);
    }
    again.addEventListener('click', () => { seqSeed++; drawSequence(); });
    let last = '';
    res.store.subscribe(s => { const key = s.p.r + '|' + s.p.p; if (key !== last) { last = key; drawSequence(); } });
    drawSequence();

    // ---------------------------------------------------------------- 2. the special case r = 1
    container.append(h('h3', { style: 'margin-top:2rem' }, 'The special case r = 1'));
    const cmp = h('div');
    container.append(cmp);
    demos.compareDemo(cmp, null, {
      intro: 'The steel stems show $\\mathrm{NegBin}(r, p)$ and the grey stems $\\mathrm{Geom}(p)$ with the same $p$. Here $r$ may be any positive number. Move $r$ toward 1, by typing it or by dragging the amber line at the negative binomial mean $r(1-p)/p$: the two sets of stems, and the two CDFs, become identical at $r = 1$, when the line sits at the geometric mean $(1-p)/p$. For $r < 1$ the negative binomial puts even more probability on 0; for $r > 1$ it moves to the right.',
      params: [
        { key: 'r', sym: 'r', name: 'size', meaning: 'The negative binomial size parameter; the geometric is the case $r = 1$.', min: 0.2, max: 5, default: 2, step: 0.05 },
        { key: 'p', sym: 'p', name: 'success probability', meaning: 'Probability of success on each trial, shared by both distributions.', min: 0.1, max: 0.95, default: 0.4, step: 0.01 },
      ],
      exact: {
        name: ({ r, p }) => `NegBin(r = ${fmtP(r)}, p = ${fmtP(p)})`, discrete: true,
        pdf: (k, { r, p }) => nbPmf(k, r, p),
        cdf: (x, { r, p }) => nbCdf(x, r, p),
      },
      approx: {
        name: ({ p }) => `Geom(p = ${fmtP(p)})`, discrete: true,
        pdf: (k, { p }) => geomPmf(k, p),
        cdf: (x, { p }) => geomCdf(x, p),
      },
      range: ({ r, p }) => [0, Math.max(8, nbQuantile(0.995, Math.max(r, 1), p))],
      xLabel: 'k (number of failures)',
      // the dashed line marks the negative binomial mean r(1 - p)/p; dragging it sets r with p fixed
      handles: ({ r, p }, set) => [{
        id: 'nb-mean', type: 'vline', x: r * (1 - p) / p, label: 'mean',
        ariaLabel: 'Mean of the negative binomial, r(1 − p)/p. Drag left or right to change r with p fixed, or use the arrow keys.',
        valueText: ui.fmt(r, 3), valueNow: r, valueMin: 0.2, valueMax: 5,
        onDrag: pt => {
          if (!pt) return;
          let v = Math.round(Math.max(pt.x, 0) * p / (1 - p) * 20) / 20;
          if (Math.abs(v - 1) <= 0.1) v = 1;            // snap to the special case r = 1
          set({ r: v });
        },
        onKey: steps => set({ r: Math.round((r + 0.05 * steps) * 20) / 20 }),
      }],
      leftCaption: 'Probabilities: negative binomial (steel stems) and geometric (grey stems)',
      readout: ({ r, p }) => (Math.abs(r - 1) < 1e-9
        ? 'At $r = 1$ the two distributions are the same, so the gap is 0.'
        : `$P(K = 0)$ is $p^r$ = <b>${ui.fmt(Math.pow(p, r), 3)}</b> for the negative binomial and $p$ = <b>${ui.fmt(p, 3)}</b> for the geometric; they agree only at $r = 1$.`),
    });

    // styles for the sequence strip (scoped to this demo; uses the site color tokens)
    container.append(h('style', {}, `
      .gnb-seq { display: flex; flex-wrap: wrap; gap: 1rem .9rem; align-items: flex-start; padding: .7rem .2rem .3rem; }
      .gnb-group { display: inline-flex; flex-direction: column; align-items: stretch; max-width: 100%; }
      .gnb-cells { display: inline-flex; flex-wrap: wrap; gap: 4px; padding: 0 3px; }
      .gnb-cell { width: 16px; height: 16px; border-radius: 4px; display: inline-block; }
      .gnb-cell.fail { background: var(--surface); border: 1.5px solid var(--line-2); }
      .gnb-cell.success { background: var(--steel-deep); border: 1.5px solid var(--steel-deep); }
      .gnb-brace { height: 7px; margin-top: 5px; border: 2px solid var(--steel); border-top: none; border-radius: 0 0 6px 6px; }
      .gnb-label { font-size: .85rem; color: var(--ink-2); text-align: center; margin-top: .25rem; white-space: nowrap; }
    `));
  },
};
