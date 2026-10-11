// Binomial -> Poisson as n -> infinity with np = lambda fixed (law of rare events).
// Uses ctx.demos.compareDemo (see relations/poisson--normal.js), plus a plot of the total variation
// distance between Bin(n, lambda/n) and Poisson(lambda) against n, with the Barbour-Hall bound.

import { getRelation } from '../catalog.js';
import { logBinom, betaIc, gammaQ, lgamma } from '../core/math.js';

const REL = getRelation('binomial--poisson');
const N_MAX = 1000;

function binomPmf(k, n, p) {
  if (!Number.isInteger(k) || k < 0 || k > n) return 0;
  if (p >= 1) return k === n ? 1 : 0;
  return Math.exp(logBinom(n, k) + k * Math.log(p) + (n - k) * Math.log1p(-p));
}
function binomCdf(x, n, p) {
  const k = Math.floor(x);
  if (k < 0) return 0;
  if (k >= n) return 1;
  if (p >= 1) return 0;
  return betaIc(p, k + 1, n - k);
}
const poissonPmf = (k, lam) => (k < 0 || !Number.isInteger(k) ? 0 : Math.exp(k * Math.log(lam) - lam - lgamma(k + 1)));
const poissonCdf = (x, lam) => (x < 0 ? 0 : gammaQ(Math.floor(x) + 1, lam));

/** Total variation distance between Bin(n, lam/n) and Poisson(lam): half the sum of absolute differences. */
function tvDistance(n, lam) {
  const p = lam / n;
  const K = Math.ceil(lam + 12 * Math.sqrt(lam) + 25);
  let s = 0, massB = 0, massP = 0;
  for (let k = 0; k <= K; k++) {
    const b = binomPmf(k, n, p), q = poissonPmf(k, lam);
    s += Math.abs(b - q); massB += b; massP += q;
  }
  // whatever lies beyond K (tiny) counts fully
  s += Math.max(0, 1 - massB) + Math.max(0, 1 - massP);
  return s / 2;
}
/** Barbour and Hall (1984): d_TV <= (1 - e^{-lam}) * sum(p_i^2) / lam = (1 - e^{-lam}) * p. */
const bhBound = (n, lam) => -Math.expm1(-lam) * lam / n;

export default {
  id: 'binomial--poisson',
  from: 'binomial',
  to: 'poisson',
  title: 'With many trials and a small success probability, the binomial approaches the Poisson distribution (law of rare events)',

  summary: 'When the number of trials $n$ is large and the success probability $p$ is small, the binomial count is well approximated by a Poisson count with the same mean $\\lambda = np$. This law of rare events is why counts of rare, independent events are often modeled as Poisson.',

  plain: [
    'Suppose there are very many independent chances for an event, but each one is unlikely: many trials $n$, each with a small success probability $p$. The number of events is then binomial, but its distribution depends almost only on the expected number of events, $\\lambda = np$. As $n$ grows and $p$ shrinks with $np$ held at $\\lambda$, the binomial distribution approaches the Poisson distribution with mean $\\lambda$.',
    'This is the law of rare events (also called the Poisson limit theorem). It explains why counts of rare, independent events, such as typing errors on a page, mutations in a stretch of DNA, spikes of a neuron in a short time bin, or accidents at an intersection in a year, are well described by a Poisson distribution even though nobody knows the number of "trials" exactly.',
  ],

  statementTex: REL.statement,
  glossary: [
    { sym: 'X_n \\sim \\mathrm{Bin}(n, p_n)', meaning: '$X_n$ is the number of successes in $n$ independent trials with success probability $p_n$.' },
    { sym: 'n', meaning: 'The number of trials, which grows without bound.' },
    { sym: 'p_n', meaning: 'The success probability used when there are $n$ trials. It shrinks as $n$ grows, so that successes become rare.' },
    { sym: 'np_n \\to \\lambda', meaning: 'The expected number of successes $np_n$ settles at a fixed positive value $\\lambda$. In the demonstration $p_n = \\lambda/n$ exactly.' },
    { sym: '\\lambda \\in (0, \\infty)', meaning: 'The limiting mean number of successes, a positive number. It becomes the mean (and the variance) of the Poisson distribution.' },
    { sym: 'P(X_n = k)', meaning: 'The probability of exactly $k$ successes.' },
    { sym: '\\frac{e^{-\\lambda}\\lambda^k}{k!}', meaning: 'The Poisson probability of $k$ events. Here $e \\approx 2.718$ is the base of natural logarithms and $k! = 1 \\cdot 2 \\cdots k$ (with $0! = 1$).' },
    { sym: 'k', meaning: 'A count $0, 1, 2, \\dots$; the convergence holds for each fixed $k$.' },
    { sym: '\\xrightarrow{d}', meaning: 'Converges in distribution: the probabilities computed from $X_n$ get arbitrarily close to those of the limit.' },
    { sym: '\\mathrm{Poisson}(\\lambda)', meaning: 'The Poisson distribution with mean $\\lambda$.' },
  ],

  why: [
    'Write $p = \\lambda/n$ and rearrange the binomial probability:',
    { tex: '\\binom{n}{k} \\Big(\\frac{\\lambda}{n}\\Big)^k \\Big(1 - \\frac{\\lambda}{n}\\Big)^{n-k} = \\frac{\\lambda^k}{k!} \\cdot \\underbrace{\\frac{n(n-1)\\cdots(n-k+1)}{n^k}}_{\\to\\, 1} \\cdot \\underbrace{\\Big(1 - \\frac{\\lambda}{n}\\Big)^{n}}_{\\to\\, e^{-\\lambda}} \\cdot \\underbrace{\\Big(1 - \\frac{\\lambda}{n}\\Big)^{-k}}_{\\to\\, 1}.' },
    'For a fixed $k$, the middle fraction is a product of $k$ factors $(n - j)/n$, each close to 1 when $n$ is large. The factor $(1 - \\lambda/n)^n$ tends to $e^{-\\lambda}$, which is one of the definitions of the exponential function. The last factor tends to 1. What is left is $e^{-\\lambda}\\lambda^k/k!$, the Poisson probability.',
    'Generating functions give the same answer in one line: the binomial probability-generating function is $(1 - p + pz)^n = \\big(1 + \\lambda(z - 1)/n\\big)^n \\to e^{\\lambda(z - 1)}$, the Poisson one. The mean $np = \\lambda$ matches exactly, and the binomial variance $np(1-p) = \\lambda(1 - \\lambda/n)$ approaches the Poisson variance $\\lambda$.',
    'The quality of the approximation can be measured sharply with the total variation distance, the largest difference between the two distributions in the probability of any set of counts, which equals half the sum of the absolute differences of the probabilities. Le Cam’s inequality bounds it by $np^2 = \\lambda^2/n$, and Barbour and Hall (1984) improved this to $(1 - e^{-\\lambda})\\,p$. So the error is governed by $p$, the size of each individual chance: the approximation is good whenever successes are individually rare, whatever $n$ is. The same bounds hold when the trials have different small probabilities $p_i$, with $\\sum p_i^2$ in place of $np^2$.',
  ],

  references: [
    { text: 'Wikipedia: Poisson limit theorem.', url: 'https://en.wikipedia.org/wiki/Poisson_limit_theorem' },
    { text: 'Wikipedia: Le Cam’s theorem.', url: 'https://en.wikipedia.org/wiki/Le_Cam%27s_theorem' },
    { text: 'Barbour, A. D., & Hall, P. (1984). On the rate of Poisson convergence. <i>Mathematical Proceedings of the Cambridge Philosophical Society</i>, 95(3), 473–480.', url: 'https://doi.org/10.1017/S0305004100061806' },
    { text: 'Casella, G., & Berger, R. L. (2002). <i>Statistical Inference</i> (2nd ed.), Section 2.3 (Poisson approximation to the binomial through moment-generating functions). Duxbury.' },
    { text: 'Leemis, L. M., & McQueston, J. T. (2008). Univariate distribution relationships. <i>The American Statistician</i>, 62(1), 45–53.', url: 'https://doi.org/10.1198/000313008X270448' },
  ],

  demo(container, { demos, ui, plot }) {
    const { h } = ui;
    let drag = null;
    const res = demos.compareDemo(container, null, {
      intro: 'The stems show $\\mathrm{Bin}(n, p)$ with $p = \\lambda/n$, so the expected count is always $\\lambda$. The grey stems show $\\mathrm{Poisson}(\\lambda)$. Increase the number of trials $n$ (the success probability shrinks with it) and watch the two sets of stems merge. Drag the amber marker at $\\lambda$, or type values. The number of trials $n$ must be at least $\\lambda$ so that $p \\le 1$; typing a $\\lambda$ above $n$ raises $n$ to match, and typing an $n$ below $\\lambda$ lowers $\\lambda$.',
      params: [
        { key: 'lambda', sym: '\\lambda', name: 'expected count np', meaning: 'The expected number of successes, held fixed while $n$ changes. It is the mean of the limiting Poisson distribution.', min: 0.5, max: 20, default: 3, log: true },
        { key: 'n', sym: 'n', name: 'number of trials', meaning: 'How many independent trials there are; the success probability of each is $p = \\lambda/n$.', min: 1, max: N_MAX, default: 6, integer: true, log: true },
      ],
      // n must be at least lambda (so that p = lambda/n <= 1): a typed value that breaks this pushes the other one along
      normalize: (p, changed) => {
        if (p.lambda <= p.n) return p;
        return changed === 'n' ? { ...p, lambda: Math.max(0.5, p.n) } : { ...p, n: Math.min(N_MAX, Math.ceil(p.lambda)) };
      },
      check: ({ lambda, n }) => (lambda > n ? 'The number of trials n must be at least λ, so that p = λ/n is at most 1.' : null),
      exact: {
        name: ({ n, lambda }) => `Binomial(n = ${n}, p = ${ui.fmt(lambda / n, 3)})`, discrete: true,
        pdf: (k, { n, lambda }) => binomPmf(k, n, lambda / n),
        cdf: (x, { n, lambda }) => binomCdf(x, n, lambda / n),
      },
      approx: {
        name: ({ lambda }) => `Poisson(λ = ${ui.fmt(lambda, 3)})`, discrete: true,
        pdf: (k, { lambda }) => poissonPmf(k, lambda),
        cdf: (x, { lambda }) => poissonCdf(x, lambda),
      },
      range: ({ lambda }) => [0, Math.max(6, Math.ceil(lambda + 4.5 * Math.sqrt(lambda) + 2))],
      xLabel: 'k (number of successes)',
      leftCaption: 'Probabilities: binomial (steel stems) and Poisson (grey stems)',
      handles: ({ lambda, n }, set) => [{
        id: 'lambda', type: 'xPoint', x: lambda, label: 'λ',
        ariaLabel: 'Expected count λ = np. Drag, or use the arrow keys.', valueText: ui.fmt(lambda, 3), valueNow: lambda, valueMin: 0.5, valueMax: 20,
        onDrag: (pt, phase) => {
          if (phase === 'start') drag = true;
          if (pt && drag) set({ lambda: Math.min(n, Number(Math.max(0.5, pt.x).toPrecision(3))) });
          if (phase === 'end') drag = null;
        },
        onKey: steps => set({ lambda: Math.min(n, Number((lambda * Math.pow(1.05, steps)).toPrecision(3))) }),
      }],
      readout: ({ lambda, n }) => {
        const tv = tvDistance(n, lambda);
        return `Success probability $p = \\lambda/n$ = <b>${ui.fmt(lambda / n, 3)}</b>. Total variation distance between the two distributions: <b>${ui.fmt(tv, 3)}</b>; `
          + `the Barbour–Hall bound $(1 - e^{-\\lambda})\\,p$ = ${ui.fmt(bhBound(n, lambda), 3)}. `
          + `Binomial variance $np(1-p)$ = ${ui.fmt(lambda * (1 - lambda / n), 4)}, Poisson variance $\\lambda$ = ${ui.fmt(lambda, 4)}.`;
      },
    });

    // distance against n, on a logarithmic n axis (positions are log10 n; the axis is labeled by hand)
    const box = h('div');
    container.append(h('figure', { class: 'plot-fig', style: 'margin-top:1.2rem' },
      ui.rich('figcaption', 'Total variation distance between $\\mathrm{Bin}(n, \\lambda/n)$ and $\\mathrm{Poisson}(\\lambda)$ for every $n$ from $\\lambda$ to 1000 (at this $\\lambda$)'), box));
    const tvPlot = new plot.Plot(box, { xLabel: 'number of trials n (logarithmic scale)', yLabel: 'distance', xTicks: false, height: w => Math.max(180, Math.min(250, w * 0.3)) });
    let cache = { lam: null, pts: [], bound: [] };
    function curve(lam) {
      if (cache.lam !== lam) {
        const pts = [], bound = [];
        const n0 = Math.max(1, Math.ceil(lam));
        let last = -1;
        for (let i = 0; i <= 160; i++) {
          const n = Math.round(n0 * Math.pow(N_MAX / n0, i / 160));
          if (n === last) continue;
          last = n;
          pts.push([Math.log10(n), tvDistance(n, lam)]);
          bound.push([Math.log10(n), bhBound(n, lam)]);
        }
        cache = { lam, pts, bound };
      }
      return cache;
    }
    function drawTv() {
      const { lambda, n } = res.store.get().p;
      const c = curve(lambda);
      const ymax = Math.max(...c.pts.map(q => q[1]), ...c.bound.map(q => Math.min(q[1], 1))) * 1.12 || 0.1;
      const x0 = Math.log10(Math.max(1, Math.ceil(lambda))) - 0.05, x1 = 3.05;
      const layers = [];
      for (const v of [1, 10, 100, 1000]) {
        if (Math.log10(v) < x0) continue;
        layers.push({ id: 'g' + v, type: 'vline', x: Math.log10(v), cls: 'ref-line' });
        layers.push({ id: 't' + v, type: 'text', x: Math.log10(v), y: ymax * (v === 1000 ? 0.8 : 0.93), text: `n = ${v}`, anchor: v === 1000 ? 'end' : 'start', dx: v === 1000 ? -4 : 4, cls: 'small' });
      }
      layers.push({ id: 'bound', type: 'line', points: c.bound.map(([x, y]) => [x, Math.min(y, ymax * 2)]), cls: 'curve-ref' });
      layers.push({ id: 'tv', type: 'line', points: c.pts, cls: 'curve-main' });
      layers.push({ id: 'now', type: 'dot', x: Math.log10(n), y: tvDistance(n, lambda), r: 5, cls: 'marker' });
      tvPlot.render({
        x: [x0, x1], y: [0, ymax], layers,
        legend: [{ label: 'total variation distance', cls: 'curve-main' }, { label: 'Barbour–Hall bound (1 − e^(−λ)) λ/n', cls: 'curve-ref' }],
      });
    }
    let raf = 0;
    res.store.subscribe(() => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; drawTv(); }); });
    drawTv();
  },
};
