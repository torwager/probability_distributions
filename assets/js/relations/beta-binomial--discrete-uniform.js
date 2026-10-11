// Beta-binomial with alpha = beta = 1 is the discrete uniform distribution on {0, 1, ..., n}.
// Demo: ctx.demos.compareDemo (beta-binomial stems against the flat 1/(n + 1) line) with drag handles, a small
// plot of the Beta mixing density that becomes flat at alpha = beta = 1, and a simulation of Bayes' billiard table
// with ctx.demos.simulationDemo.

import { getRelation } from '../catalog.js';

const REL = getRelation('beta-binomial--discrete-uniform');

const bbPmf = (k, { n, alpha, beta }, M) => (k < 0 || k > n || !Number.isInteger(k) ? 0
  : Math.exp(M.logBinom(n, k) + M.lbeta(k + alpha, n - k + beta) - M.lbeta(alpha, beta)));
const bbCdf = (x, p, M) => { const k = Math.floor(x); if (k < 0) return 0; if (k >= p.n) return 1; let s = 0; for (let j = 0; j <= k; j++) s += bbPmf(j, p, M); return Math.min(1, s); };
const duCdf = (x, n) => { const k = Math.floor(x); return k < 0 ? 0 : k >= n ? 1 : (k + 1) / (n + 1); };

export default {
  id: 'beta-binomial--discrete-uniform',
  from: 'beta-binomial',
  to: 'discrete-uniform',
  title: 'With a flat Beta(1, 1) distribution for the success probability, every number of successes is equally likely',

  summary: 'When the success probability of a binomial count is drawn from the flat $\\mathrm{Beta}(1, 1)$ distribution, every number of successes from 0 to $n$ (the number of trials) is equally likely, with probability $1/(n + 1)$ each. Bayes used this result to justify a uniform prior.',

  plain: [
    'A beta-binomial count is produced in two stages: a success probability $p$ is drawn from a $\\mathrm{Beta}(\\alpha, \\beta)$ distribution, and then $n$ trials with that probability are counted. When $\\alpha = \\beta = 1$, the Beta distribution is the uniform distribution on the interval from 0 to 1, so every value of $p$ is equally likely. Averaged over this flat distribution, every count $0, 1, \\dots, n$ turns out to have the same probability, $1/(n + 1)$. The beta-binomial then is the discrete uniform distribution on $\\{0, 1, \\dots, n\\}$.',
    'In Bayesian terms: if you have no idea what $p$ is and give it a uniform prior, then before seeing any data you expect every possible number of successes to be equally likely. This is the result Thomas Bayes used in his 1763 essay, phrased as balls rolled on a billiard table, to justify the uniform prior.',
  ],

  statementTex: REL.statement,
  glossary: [
    { sym: '\\mathrm{BetaBin}(n, 1, 1)', meaning: 'The beta-binomial distribution with $n$ trials and Beta shape parameters $\\alpha = 1$ and $\\beta = 1$, so that the success probability is uniform on $(0, 1)$.' },
    { sym: '\\mathrm{DUnif}\\{0, 1, \\dots, n\\}', meaning: 'The discrete uniform distribution: each of the $n + 1$ whole numbers from 0 to $n$ has the same probability.' },
    { sym: 'X', meaning: 'The number of successes in the $n$ trials.' },
    { sym: 'k', meaning: 'A possible count, a whole number from 0 to $n$.' },
    { sym: 'n', meaning: 'The number of trials.' },
    { sym: 'P(X = k) = \\frac{1}{n + 1}', meaning: 'Every count has the same probability, one over the number of possible counts.' },
  ],

  why: [
    'The beta-binomial probability of $k$ successes is the binomial probability averaged over the Beta density of $p$. With $\\alpha = \\beta = 1$ the Beta density equals 1 on $(0, 1)$, so',
    { tex: 'P(X = k) = \\int_0^1 \\binom{n}{k} p^{k} (1 - p)^{n - k}\\, dp = \\binom{n}{k} B(k + 1,\\ n - k + 1) = \\frac{n!}{k!\\,(n-k)!}\\cdot\\frac{k!\\,(n - k)!}{(n + 1)!} = \\frac{1}{n + 1}.' },
    'Here $B(a, b) = \\int_0^1 t^{a-1}(1-t)^{b-1}\\,dt = \\frac{(a-1)!\\,(b-1)!}{(a + b - 1)!}$ for whole numbers $a, b$ is the beta function. The factorials cancel and the result does not depend on $k$.',
    'Bayes gave a picture that makes this obvious without any integral. Roll one ball on a table so that it stops at a uniformly random position $p$ along its length, then roll $n$ more balls, and count how many stop to the left of the first one. Given $p$, the count is $\\mathrm{Bin}(n, p)$, so the count is $\\mathrm{BetaBin}(n, 1, 1)$. But the $n + 1$ positions are independent and uniform, so the first ball is equally likely to be in any of the $n + 1$ places in their order, from leftmost to rightmost. Its rank, which is the count, is therefore uniform on $\\{0, 1, \\dots, n\\}$.',
    'For other values of $\\alpha$ and $\\beta$ the counts are not equally likely: with $\\alpha = \\beta > 1$ they bunch in the middle, with $\\alpha = \\beta < 1$ they pile up at 0 and $n$, and with $\\alpha \\ne \\beta$ they lean to one side. The beta-binomial variance $\\frac{n(n + 2)}{12}$ at $\\alpha = \\beta = 1$ equals the variance of the discrete uniform distribution on $n + 1$ points, $\\frac{(n+1)^2 - 1}{12}$.',
  ],

  references: [
    { text: 'Wikipedia: Beta-binomial distribution.', url: 'https://en.wikipedia.org/wiki/Beta-binomial_distribution' },
    { text: 'Bayes, T. (1763). An essay towards solving a problem in the doctrine of chances. <i>Philosophical Transactions of the Royal Society of London</i>, 53, 370–418.', url: 'https://doi.org/10.1098/rstl.1763.0053' },
    { text: 'Stigler, S. M. (1982). Thomas Bayes’s Bayesian inference. <i>Journal of the Royal Statistical Society, Series A</i>, 145(2), 250–258.' },
    { text: 'Gelman, A., Carlin, J. B., Stern, H. S., Dunson, D. B., Vehtari, A., & Rubin, D. B. (2013). <i>Bayesian Data Analysis</i> (3rd ed.), Section 2.1 (Bayes’ billiard-ball example and the uniform prior). CRC Press.', url: 'http://www.stat.columbia.edu/~gelman/book/' },
    { text: 'Johnson, N. L., Kemp, A. W., & Kotz, S. (2005). <i>Univariate Discrete Distributions</i> (3rd ed.), Section 6.2.2. Wiley.' },
  ],

  demo(container, { demos, math, plot, ui }) {
    const { h } = ui;
    const lim = { min: 0.1, max: 10 };
    let dragMean = null;
    const top = h('div'), betaWrap = h('div'), billiard = h('div');
    container.append(top);

    const cmp = demos.compareDemo(top, null, {
      intro: 'The stems are the beta-binomial probabilities and the dashed line is the discrete uniform probability $1/(n + 1)$. Set $\\alpha = \\beta = 1$ (or press the button) and the stems line up exactly on the dashed line, and the largest CDF gap drops to 0. Drag the dashed amber line to move the mean with $\\alpha + \\beta$ fixed, and the marker labeled $n$ to change the number of trials.',
      params: [
        { key: 'n', sym: 'n', name: 'number of trials', meaning: 'How many trials are counted.', min: 1, max: 30, default: 10, integer: true },
        { key: 'alpha', sym: '\\alpha', name: 'shape 1 (prior successes)', meaning: 'First Beta shape parameter. The special case is $\\alpha = 1$.', min: lim.min, max: lim.max, default: 2.5, step: 0.1, log: false },
        { key: 'beta', sym: '\\beta', name: 'shape 2 (prior failures)', meaning: 'Second Beta shape parameter. The special case is $\\beta = 1$.', min: lim.min, max: lim.max, default: 2.5, step: 0.1, log: false },
      ],
      exact: {
        name: p => `BetaBin(n = ${p.n}, α = ${ui.fmt(p.alpha, 3)}, β = ${ui.fmt(p.beta, 3)})`, discrete: true,
        pdf: (k, p) => bbPmf(k, p, math),
        cdf: (x, p) => bbCdf(x, p, math),
      },
      approx: {
        name: p => `Discrete uniform on 0, …, ${p.n}: 1/(n + 1) = ${ui.fmt(1 / (p.n + 1), 3)}`,
        pdf: (x, p) => (x >= -0.45 && x <= p.n + 0.45 ? 1 / (p.n + 1) : NaN),
        cdf: (x, p) => duCdf(x, p.n),
      },
      range: p => [0, p.n],
      xLabel: 'k (number of successes)',
      handles: (p, set) => [
        {
          id: 'n', type: 'xPoint', x: p.n, label: 'n',
          ariaLabel: 'Number of trials n. Drag, or use the arrow keys.', valueText: String(p.n), valueNow: p.n, valueMin: 1, valueMax: 30,
          onDrag: pt => { if (pt) set({ n: Math.round(math.clamp(pt.x, 1, 30)) }); },
          onKey: steps => set({ n: math.clamp(p.n + steps, 1, 30) }),
        },
        {
          id: 'mean', type: 'vline', x: p.n * p.alpha / (p.alpha + p.beta), label: 'mean',
          ariaLabel: 'Mean nα/(α + β). Drag to move it with α + β fixed; the arrow keys change α.', valueText: ui.fmt(p.alpha, 3), valueNow: p.alpha, valueMin: lim.min, valueMax: lim.max,
          onDrag: (pt, phase) => {
            if (phase === 'start') dragMean = { s: p.alpha + p.beta, n: p.n };
            if (pt && dragMean) {
              const s = dragMean.s;
              const m = math.clamp(pt.x / dragMean.n, Math.max(lim.min / s, 1 - lim.max / s, 0.001), Math.min(1 - lim.min / s, lim.max / s, 0.999));
              set({ alpha: math.roundTo(m * s, 0.01), beta: math.roundTo((1 - m) * s, 0.01) });
            }
            if (phase === 'end') dragMean = null;
          },
          onKey: steps => set({ alpha: math.roundTo(math.clamp(p.alpha + 0.1 * steps, lim.min, lim.max), 0.1) }),
        },
      ],
      readout: (p, g) => {
        const s = p.alpha + p.beta, vbb = p.n * p.alpha * p.beta * (s + p.n) / (s * s * (s + 1)), vdu = p.n * (p.n + 2) / 12;
        const on = Math.abs(p.alpha - 1) < 1e-9 && Math.abs(p.beta - 1) < 1e-9;
        return `Variance: beta-binomial <b>${ui.fmt(vbb, 4)}</b>, discrete uniform $n(n+2)/12$ = <b>${ui.fmt(vdu, 4)}</b>. `
          + (on ? 'With $\\alpha = \\beta = 1$ the two distributions are identical.' : `They coincide only at $\\alpha = \\beta = 1$; here $\\alpha$ = ${ui.fmt(p.alpha, 3)} and $\\beta$ = ${ui.fmt(p.beta, 3)}.`);
      },
    });
    const btn = h('button', { type: 'button', class: 'btn small-btn btn-amber' }, 'Set α = β = 1');
    btn.addEventListener('click', () => cmp.set({ alpha: 1, beta: 1 }));
    const ctl = top.querySelector('.demo-controls');
    if (ctl) ctl.append(h('div', { class: 'demo-sim-ctl' }, h('h3', { class: 'mini-title' }, 'Special case'), btn));

    // ---- the Beta mixing density
    const betaBox = h('div');
    betaWrap.append(h('figure', { class: 'plot-fig', style: 'margin-top:1.2rem' },
      ui.rich('figcaption', 'The distribution of the success probability, $\\mathrm{Beta}(\\alpha, \\beta)$; it is flat at $\\alpha = \\beta = 1$'), betaBox));
    top.append(betaWrap);
    const bp = new plot.Plot(betaBox, { xLabel: 'success probability p', yLabel: 'density', height: w => Math.max(170, Math.min(230, w * 0.28)) });
    let raf = 0;
    const drawBeta = () => {
      const { alpha, beta } = cmp.store.get().p;
      const f = x => (x <= 0 || x >= 1 ? NaN : Math.exp((alpha - 1) * Math.log(x) + (beta - 1) * Math.log1p(-x) - math.lbeta(alpha, beta)));
      const pts = plot.sampleFn(f, 0.001, 0.999, 300);
      const inner = pts.filter(q => q[0] > 0.04 && q[0] < 0.96).map(q => q[1]);
      const ymax = Math.max(1.4, Math.min(Math.max(...pts.map(q => q[1]).filter(Number.isFinite)), 1.6 * Math.max(...inner))) * 1.12;
      bp.render({
        x: [0, 1], y: [0, ymax],
        layers: [
          { id: 'fill', type: 'area', points: pts.map(([x, y]) => [x, Math.min(y, ymax * 2)]), cls: 'pdf-fill' },
          { id: 'one', type: 'line', points: [[0, 1], [1, 1]], cls: 'curve-ref' },
          { id: 'pdf', type: 'line', points: pts, cls: 'curve-main' },
        ],
        legend: [{ label: `Beta(α = ${ui.fmt(alpha, 3)}, β = ${ui.fmt(beta, 3)})`, cls: 'curve-main' }, { label: 'uniform density 1', cls: 'curve-ref' }],
      });
    };
    cmp.store.subscribe(() => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; drawBeta(); }); });
    drawBeta();

    // ---- Bayes' billiard table
    container.append(h('h3', { style: 'margin-top:2rem' }, 'Bayes’ billiard table'), billiard);
    demos.simulationDemo(billiard, null, {
      intro: 'Each simulated value is one round of Bayes’ experiment: a first ball stops at a uniformly random position $p$ between 0 and 1, then $n$ more balls are rolled, and we count how many stop to the left of the first ball. Given $p$ that count is $\\mathrm{Bin}(n, p)$, so overall it is $\\mathrm{BetaBin}(n, 1, 1)$. The frequencies match the flat discrete uniform probabilities, because the first ball is equally likely to be at any rank among the $n + 1$ balls.',
      params: [{ key: 'n', sym: 'n', name: 'number of further balls', meaning: 'How many balls are rolled after the first one.', min: 1, max: 30, default: 8, integer: true }],
      sample: (rng, { n }) => { const p = rng.random(); let c = 0; for (let i = 0; i < n; i++) if (rng.random() < p) c++; return c; },
      sampleName: 'balls left of the first ball (simulated)',
      target: { name: ({ n }) => `Discrete uniform on 0, …, ${n}`, discrete: true, pdf: (k, { n }) => (k >= 0 && k <= n ? 1 / (n + 1) : 0), cdf: (x, { n }) => duCdf(x, n) },
      range: ({ n }) => [0, n],
      xLabel: 'number of balls to the left',
    });
  },
};
