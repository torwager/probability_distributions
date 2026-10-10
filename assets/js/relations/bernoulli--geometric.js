// Bernoulli -> Geometric: the number of failures before the first success in a sequence of
// independent Bernoulli(p) trials is Geometric(p) (failures convention, support 0, 1, 2, ...).
// Uses ctx.demos.simulationDemo, plus a strip that shows one simulated run of trials.

import { getRelation } from '../catalog.js';
import { makeRng } from '../core/math.js';

const REL = getRelation('bernoulli--geometric');

const geomPmf = (k, p) => (k < 0 || !Number.isInteger(k) ? 0 : p >= 1 ? (k === 0 ? 1 : 0) : Math.exp(k * Math.log1p(-p)) * p);
const geomCdf = (x, p) => (x < 0 ? 0 : p >= 1 ? 1 : -Math.expm1((Math.floor(x) + 1) * Math.log1p(-p)));
/** Smallest k with P(K <= k) >= u. */
const geomQuantile = (u, p) => (p >= 1 ? 0 : Math.max(0, Math.ceil(Math.log1p(-u) / Math.log1p(-p) - 1 - 1e-9)));

/** Run Bernoulli(p) trials until the first success; return the outcomes (capped). */
function runUntilSuccess(rng, p, cap = 2000) {
  const out = [];
  for (let i = 0; i < cap; i++) { const x = rng.bernoulli(p); out.push(x); if (x) break; }
  return out;
}

function trialStrip(h, outcomes, maxShow = 36) {
  const row = h('div', { style: 'display:flex;flex-wrap:wrap;gap:4px;align-items:center;margin:.35rem 0', 'aria-hidden': 'true' });
  const shown = outcomes.length > maxShow ? [...outcomes.slice(0, maxShow - 6), null, ...outcomes.slice(-5)] : outcomes;
  for (const o of shown) {
    if (o === null) { row.append(h('span', { style: 'color:var(--muted);padding:0 2px' }, '…')); continue; }
    row.append(h('span', {
      style: 'display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:50%;font:500 10px/1 var(--mono);'
        + (o ? 'background:var(--steel-deep);color:var(--surface);border:1.5px solid var(--steel-deep)' : 'background:transparent;color:var(--muted);border:1.5px solid var(--line-2)'),
    }, o ? '1' : '0'));
  }
  return row;
}

export default {
  id: 'bernoulli--geometric',
  from: 'bernoulli',
  to: 'geometric',
  title: 'Waiting for the first success in a sequence of Bernoulli trials gives a geometric count',

  plain: [
    'Run independent yes/no trials, each a success with probability $p$, and stop at the first success. The number of failures that came before it is a geometric random variable. For it to equal $k$, the first $k$ trials must all fail, which has probability $(1-p)^k$, and the next trial must succeed, which has probability $p$.',
    'This site counts failures, so the geometric variable starts at 0 (a success on the very first trial). Some books count the trials instead, including the successful one; that count is one larger and starts at 1. Both describe the same waiting process.',
  ],

  statementTex: REL.statement,
  glossary: [
    { sym: 'X_1, X_2, \\dots', meaning: 'An unending sequence of trial outcomes, each 1 (success) or 0 (failure).' },
    { sym: '\\overset{iid}{\\sim}', meaning: 'Independent and identically distributed: all trials have the same success probability and do not affect one another.' },
    { sym: '\\mathrm{Bernoulli}(p)', meaning: 'A single trial that equals 1 with probability $p$ and 0 with probability $1 - p$.' },
    { sym: 'p', meaning: 'The success probability of each trial, between 0 and 1 (and larger than 0, so that a success eventually happens).' },
    { sym: '\\min\\{i : X_i = 1\\}', meaning: 'The index of the first trial that is a success, that is, the number of trials up to and including the first success.' },
    { sym: 'K', meaning: 'The number of failures before the first success: the index of the first success minus 1.' },
    { sym: '\\Rightarrow', meaning: 'Implies.' },
    { sym: '\\mathrm{Geometric}(p)', meaning: 'The geometric distribution in the failures convention, with support $0, 1, 2, \\dots$ and mean $(1-p)/p$.' },
    { sym: 'P(K = k) = (1-p)^k p', meaning: 'The probability that exactly $k$ failures come before the first success: $k$ failures in a row, then a success.' },
    { sym: 'k = 0, 1, 2, \\dots', meaning: 'The possible numbers of failures. There is no upper limit, although long waits are unlikely when $p$ is not small.' },
  ],

  why: [
    'The event $K = k$ happens exactly when trials $1, \\dots, k$ are failures and trial $k + 1$ is a success. The trials are independent, so the probability of this pattern is the product of the separate probabilities:',
    { tex: 'P(K = k) = \\underbrace{(1-p)\\cdots(1-p)}_{k \\text{ failures}} \\cdot p = (1-p)^k\\, p, \\qquad k = 0, 1, 2, \\dots' },
    'These probabilities form a geometric series, which is where the name comes from. They add up to 1 because $\\sum_{k \\ge 0} (1-p)^k = 1/p$. Waiting at least $k$ failures means that the first $k$ trials all fail, so $P(K \\ge k) = (1-p)^k$ and the CDF is $P(K \\le k) = 1 - (1-p)^{k+1}$.',
    'The mean number of failures is $(1-p)/p$ and the variance is $(1-p)/p^2$, so rare successes mean long and very variable waits. The geometric distribution is memoryless: if the first $m$ trials have failed, the number of further failures still has the same $\\mathrm{Geometric}(p)$ distribution, because the trials have no memory of the past. Waiting for the $r$-th success instead of the first gives the negative binomial distribution, the sum of $r$ independent geometric waits.',
  ],

  references: [
    { text: 'Wikipedia: Geometric distribution.', url: 'https://en.wikipedia.org/wiki/Geometric_distribution' },
    { text: 'Casella, G., & Berger, R. L. (2002). <i>Statistical Inference</i> (2nd ed.), Section 3.2 (negative binomial and geometric distributions). Duxbury.' },
    { text: 'Johnson, N. L., Kemp, A. W., & Kotz, S. (2005). <i>Univariate Discrete Distributions</i> (3rd ed.), Section 5.2. Wiley.' },
    { text: 'Leemis, L. M., & McQueston, J. T. (2008). Univariate distribution relationships. <i>The American Statistician</i>, 62(1), 45–53.', url: 'https://doi.org/10.1198/000313008X270448' },
  ],

  demo(container, { demos, ui }) {
    const { h } = ui;
    const res = demos.simulationDemo(container, null, {
      intro: 'Each simulated value comes from running independent $\\mathrm{Bernoulli}(p)$ trials until the first success and counting the failures before it. The bars show how often each count came up, and the stems show the $\\mathrm{Geometric}(p)$ probabilities $(1-p)^k p$. The row of circles is an example of one such run (drawn separately; a new one appears with each new sample). Make $p$ small to see long waits become common.',
      params: [
        { key: 'p', sym: 'p', name: 'success probability', meaning: 'Probability that each trial is a success (1).', min: 0.05, max: 0.95, default: 0.3, step: 0.01 },
      ],
      sample: (rng, { p }) => runUntilSuccess(rng, p).length - 1,
      sampleName: 'simulated numbers of failures',
      target: {
        name: ({ p }) => `Geometric(p = ${fmtP(p)}) probabilities`,
        pdf: (k, { p }) => geomPmf(k, p),
        cdf: (x, { p }) => geomCdf(x, p),
        discrete: true,
      },
      range: ({ p }) => [0, Math.max(5, geomQuantile(0.995, p))],
      xLabel: 'k (failures before the first success)',
      readout: ({ p }) => `Geometric mean $(1-p)/p$ = <b>${ui.fmt((1 - p) / p)}</b>, standard deviation $\\sqrt{1-p}/p$ = <b>${ui.fmt(Math.sqrt(1 - p) / p)}</b>.`,
    });

    const stripBox = h('div', { class: 'small', style: 'margin:.2rem 0 1rem' });
    const intro = container.querySelector('.demo-intro');
    if (intro) intro.after(stripBox); else container.prepend(stripBox);
    function drawStrip() {
      const { p, seed } = res.store.get();
      const outcomes = runUntilSuccess(makeRng(91 + 37 * seed), p.p);
      stripBox.textContent = '';
      stripBox.append(
        h('span', { class: 'muted' }, 'An example run of trials, stopped at the first success:'),
        trialStrip(h, outcomes),
        h('span', {}, 'Failures before the first success: ', h('b', { class: 'mono' }, `K = ${outcomes.length - 1}`), ` (the success came on trial ${outcomes.length}).`));
    }
    res.store.subscribe(drawStrip);
    drawStrip();
  },
};

function fmtP(p) { return String(Number(p.toPrecision(3))); }
