// Bernoulli -> Binomial: the sum of n independent Bernoulli(p) trials is Binomial(n, p).
// Uses ctx.demos.simulationDemo (see relations/exponential--gamma.js), plus a strip that shows one
// simulated run of n trials so that the sum is visible.

import { getRelation } from '../catalog.js';
import { logBinom, betaIc, makeRng } from '../core/math.js';

const REL = getRelation('bernoulli--binomial');

function binomPmf(k, n, p) {
  if (!Number.isInteger(k) || k < 0 || k > n) return 0;
  if (p <= 0) return k === 0 ? 1 : 0;
  if (p >= 1) return k === n ? 1 : 0;
  return Math.exp(logBinom(n, k) + k * Math.log(p) + (n - k) * Math.log1p(-p));
}
function binomCdf(x, n, p) {
  const k = Math.floor(x);
  if (k < 0) return 0;
  if (k >= n) return 1;
  if (p <= 0) return 1;
  if (p >= 1) return 0;
  return betaIc(p, k + 1, n - k);
}

/** A row of small circles, one per trial: filled for a success (1), open for a failure (0). */
function trialStrip(h, outcomes) {
  const row = h('div', { style: 'display:flex;flex-wrap:wrap;gap:4px;align-items:center;margin:.35rem 0', 'aria-hidden': 'true' });
  for (const o of outcomes) {
    row.append(h('span', {
      title: o ? 'success (1)' : 'failure (0)',
      style: `display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:50%;font:500 10px/1 var(--mono);`
        + (o ? 'background:var(--steel-deep);color:var(--surface);border:1.5px solid var(--steel-deep)' : 'background:transparent;color:var(--muted);border:1.5px solid var(--line-2)'),
    }, o ? '1' : '0'));
  }
  return row;
}

export default {
  id: 'bernoulli--binomial',
  from: 'bernoulli',
  to: 'binomial',
  title: 'Adding up independent Bernoulli trials gives a binomial count',

  summary: 'Adding up $n$ independent Bernoulli trials, each a success with the same probability $p$, gives the number of successes, which has a binomial distribution with parameters $n$ and $p$. A binomial with a single trial ($n = 1$) is a Bernoulli trial.',

  plain: [
    'A Bernoulli variable records one yes/no trial as 1 (success) or 0 (failure), with success probability $p$. If the same trial is repeated $n$ times independently, the total of the 0s and 1s is the number of successes, and that count has a binomial distribution with parameters $n$ and $p$.',
    'Read the other way, a binomial distribution with a single trial ($n = 1$) is a Bernoulli distribution. This is why Bernoulli and binomial data lead to the same likelihood for $p$, up to a constant: both depend on the data only through the number of successes and the number of trials.',
  ],

  statementTex: REL.statement,
  glossary: [
    { sym: 'X_1, \\dots, X_n', meaning: 'The outcomes of the $n$ separate trials, each equal to 1 (success) or 0 (failure).' },
    { sym: '\\overset{iid}{\\sim}', meaning: 'Independent and identically distributed: every trial has the same success probability, and the outcome of one trial does not affect the others.' },
    { sym: '\\mathrm{Bernoulli}(p)', meaning: 'The distribution of a single trial that equals 1 with probability $p$ and 0 with probability $1 - p$.' },
    { sym: 'p', meaning: 'The success probability of each trial, between 0 and 1.' },
    { sym: 'n', meaning: 'The number of trials.' },
    { sym: '\\Rightarrow', meaning: 'Implies: if the left-hand side holds, so does the right-hand side.' },
    { sym: '\\sum_{i=1}^n X_i', meaning: 'The sum $X_1 + X_2 + \\dots + X_n$. Because each term is 0 or 1, the sum is the number of successes.' },
    { sym: '\\mathrm{Binomial}(n, p)', meaning: 'The binomial distribution: the number of successes in $n$ independent trials with success probability $p$.' },
    { sym: '\\mathrm{Binomial}(1, p) = \\mathrm{Bernoulli}(p)', meaning: 'With one trial the binomial count is 0 or 1, with probabilities $1 - p$ and $p$, which is exactly the Bernoulli distribution.' },
  ],

  why: [
    'Consider one particular sequence of outcomes with $k$ successes and $n - k$ failures, for example $1, 0, 0, 1, 0$ with $n = 5$ and $k = 2$. Because the trials are independent, its probability is the product of the separate probabilities, $p \\cdot (1-p) \\cdot (1-p) \\cdot p \\cdot (1-p) = p^k (1-p)^{n-k}$. Every sequence with the same number of successes has this same probability; only the order differs.',
    'The number of different sequences with exactly $k$ successes is the number of ways to choose which $k$ of the $n$ trials succeed, the binomial coefficient $\\binom{n}{k} = \\frac{n!}{k!\\,(n-k)!}$. Adding up the equal probabilities of all these sequences gives',
    { tex: 'P\\Big(\\sum_{i=1}^n X_i = k\\Big) = \\binom{n}{k} p^k (1-p)^{n-k}, \\qquad k = 0, 1, \\dots, n,' },
    'which is the binomial probability mass function. The same result follows from generating functions: one trial has probability-generating function $\\mathrm{E}[z^{X_i}] = 1 - p + pz$, and for independent variables the generating function of a sum is the product, $(1 - p + pz)^n$, which is the binomial one.',
    'Means and variances add for independent variables. Each trial has mean $p$ and variance $p(1-p)$, so the count has mean $np$ and variance $np(1-p)$. The sum also explains two other facts: independent binomial counts with the same $p$ add up to a binomial count, $\\mathrm{Bin}(n_1, p) + \\mathrm{Bin}(n_2, p) = \\mathrm{Bin}(n_1 + n_2, p)$, and, by the central limit theorem, the count is approximately normal when $n$ is large.',
  ],

  references: [
    { text: 'Wikipedia: Binomial distribution.', url: 'https://en.wikipedia.org/wiki/Binomial_distribution' },
    { text: 'Wikipedia: Bernoulli distribution, related distributions.', url: 'https://en.wikipedia.org/wiki/Bernoulli_distribution#Related_distributions' },
    { text: 'Casella, G., & Berger, R. L. (2002). <i>Statistical Inference</i> (2nd ed.), Section 3.2 (binomial distribution). Duxbury.' },
    { text: 'Leemis, L. M., & McQueston, J. T. (2008). Univariate distribution relationships. <i>The American Statistician</i>, 62(1), 45–53.', url: 'https://doi.org/10.1198/000313008X270448' },
  ],

  demo(container, { demos, ui }) {
    const { h } = ui;
    const res = demos.simulationDemo(container, null, {
      intro: 'Each simulated value is the number of successes in $n$ independent $\\mathrm{Bernoulli}(p)$ trials. The bars show how often each count came up in many such runs, and the stems show the $\\mathrm{Binomial}(n, p)$ probabilities. The row of circles above the plots is an example of one run of $n$ trials (drawn separately; a new one appears with each new sample): filled circles are successes (1) and open circles are failures (0). Set $n = 1$ to see that a binomial with one trial is a Bernoulli trial.',
      params: [
        { key: 'n', sym: 'n', name: 'number of trials', meaning: 'How many independent Bernoulli trials are added up.', min: 1, max: 50, default: 10, integer: true },
        { key: 'p', sym: 'p', name: 'success probability', meaning: 'Probability that each trial is a success (1).', min: 0, max: 1, default: 0.3, step: 0.01 },
      ],
      sample: (rng, { n, p }) => { let s = 0; for (let i = 0; i < n; i++) s += rng.bernoulli(p); return s; },
      sampleName: 'simulated sums of n trials',
      target: {
        name: ({ n, p }) => `Binomial(n = ${n}, p = ${fmtP(p)}) probabilities`,
        pdf: (k, { n, p }) => binomPmf(k, n, p),
        cdf: (x, { n, p }) => binomCdf(x, n, p),
        discrete: true,
      },
      range: ({ n }) => [0, n],
      xLabel: 'k (number of successes)',
      readout: ({ n, p }) => `Binomial mean $np$ = <b>${ui.fmt(n * p)}</b>, standard deviation $\\sqrt{np(1-p)}$ = <b>${ui.fmt(Math.sqrt(n * p * (1 - p)))}</b>.`
        + (n === 1 ? ' With $n = 1$ the count is a single trial: $\\mathrm{Binomial}(1, p) = \\mathrm{Bernoulli}(p)$.' : ''),
    });

    // one run of n trials, drawn with the same seed as the current simulation
    const stripBox = h('div', { class: 'small', style: 'margin:1rem 0 0' });
    const intro = container.querySelector('.demo-intro');
    if (intro) intro.before(stripBox); else container.append(stripBox);   // under the controls, above the explanation
    function drawStrip() {
      const { p, seed } = res.store.get();
      const rng = makeRng(77 + 31 * seed);
      const outcomes = [];
      for (let i = 0; i < p.n; i++) outcomes.push(rng.bernoulli(p.p));
      const s = outcomes.reduce((a, b) => a + b, 0);
      stripBox.textContent = '';
      stripBox.append(
        h('span', { class: 'muted' }, `An example run of n = ${p.n} trials:`),
        trialStrip(h, outcomes),
        h('span', {}, 'Sum of the 0s and 1s = number of successes = ', h('b', { class: 'mono' }, String(s)), '.'));
    }
    res.store.subscribe(drawStrip);
    drawStrip();
  },
};

function fmtP(p) { return String(Number(p.toPrecision(3))); }
