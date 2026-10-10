// Beta -> Binomial (conjugate prior): a Beta(alpha, beta) prior on a success probability p, combined with
// x successes in n binomial trials, gives the posterior Beta(alpha + x, beta + n - x).
// Hand-written demo: prior, likelihood (scaled to area 1) and posterior for p, with the update formula
// filled in live; on the right, the posterior predictive (beta-binomial) distribution of the number of
// successes in m future trials against the binomial that plugs in the posterior mean.
// Self-contained: all densities are computed with core/math.js.

import { getRelation } from '../catalog.js';
import { lbeta, logBinom, betaIinv, clamp } from '../core/math.js';

const REL = getRelation('beta--binomial');
const N_MAX = 500, A_MIN = 0.1, A_MAX = 50;

const betaPdf = (x, a, b) => {
  if (x < 0 || x > 1) return 0;
  if (x === 0) return a < 1 ? Infinity : a === 1 ? Math.exp(-lbeta(1, b)) : 0;
  if (x === 1) return b < 1 ? Infinity : b === 1 ? Math.exp(-lbeta(a, 1)) : 0;
  return Math.exp((a - 1) * Math.log(x) + (b - 1) * Math.log1p(-x) - lbeta(a, b));
};
const betaBinPmf = (k, m, a, b) => Math.exp(logBinom(m, k) + lbeta(k + a, m - k + b) - lbeta(a, b));
const binPmf = (k, m, p) => (p <= 0 ? (k === 0 ? 1 : 0) : p >= 1 ? (k === m ? 1 : 0) : Math.exp(logBinom(m, k) + k * Math.log(p) + (m - k) * Math.log1p(-p)));
const n4 = v => String(Number(v.toPrecision(4)));

export default {
  id: 'beta--binomial',
  from: 'beta',
  to: 'binomial',
  title: 'The beta distribution is the conjugate prior for the success probability of binomial data',

  plain: [
    'Suppose we want to learn an unknown success probability $p$, such as the probability that a participant answers a question correctly or that a treatment works, from $n$ independent trials with $x$ successes. In Bayesian inference our uncertainty about $p$ before seeing the data is described by a prior distribution. If the prior is a beta distribution, $\\mathrm{Beta}(\\alpha, \\beta)$, then the posterior distribution after seeing the data is again a beta distribution, $\\mathrm{Beta}(\\alpha + x,\\ \\beta + n - x)$. A prior with this property is called conjugate.',
    'The update is simple counting: add the observed successes to $\\alpha$ and the observed failures to $\\beta$. So $\\alpha$ and $\\beta$ behave like counts of successes and failures seen before the experiment, and the prior is worth about $\\alpha + \\beta$ trials. The same update holds for Bernoulli data (one trial at a time, in any order), and for geometric or negative binomial data, where the number of successes $r$ is fixed in advance and the number of failures $k$ is observed.',
  ],

  statementTex: REL.statement,
  glossary: [
    { sym: 'p', meaning: 'The unknown success probability of each trial, a number between 0 and 1. It is the quantity we want to learn.' },
    { sym: '\\mathrm{Beta}(\\alpha, \\beta)', meaning: 'The beta distribution on the interval from 0 to 1, with density proportional to $p^{\\alpha-1}(1-p)^{\\beta-1}$ and mean $\\alpha/(\\alpha+\\beta)$.' },
    { sym: '\\alpha', meaning: 'The first prior shape, a positive number. It acts like a prior count of successes.' },
    { sym: '\\beta', meaning: 'The second prior shape, a positive number. It acts like a prior count of failures.' },
    { sym: 'X \\mid p \\sim \\mathrm{Bin}(n, p)', meaning: 'Given the value of $p$, the number of successes $X$ in $n$ independent trials has a binomial distribution.' },
    { sym: 'n', meaning: 'The number of trials.' },
    { sym: 'x', meaning: 'The observed number of successes, so $n - x$ is the number of failures.' },
    { sym: '\\Rightarrow', meaning: 'Implies.' },
    { sym: 'p \\mid X = x', meaning: 'The posterior distribution: what we know about $p$ after observing $x$ successes.' },
    { sym: '\\mathrm{Beta}(\\alpha + x,\\ \\beta + n - x)', meaning: 'The posterior: the prior with the successes added to $\\alpha$ and the failures added to $\\beta$.' },
    { sym: 'k,\\ r', meaning: 'For geometric or negative binomial data: $k$ failures observed before the $r$-th success. The posterior is then $\\mathrm{Beta}(\\alpha + r,\\ \\beta + k)$.' },
  ],

  why: [
    '<b>Bayes’ rule.</b> The posterior density is proportional to the prior density times the likelihood. Keeping only the factors that involve $p$,',
    { tex: 'p(p \\mid x) \\;\\propto\\; \\underbrace{p^{\\alpha - 1}(1 - p)^{\\beta - 1}}_{\\text{prior}} \\cdot \\underbrace{\\binom{n}{x} p^{x}(1 - p)^{n - x}}_{\\text{likelihood}} \\;\\propto\\; p^{\\alpha + x - 1}(1 - p)^{\\beta + n - x - 1}.' },
    'This is the form of a beta density with shapes $\\alpha + x$ and $\\beta + n - x$. The constant that makes it integrate to 1 must be $1/B(\\alpha + x,\\ \\beta + n - x)$, so the posterior is exactly that beta distribution. Here $\\propto$ means “proportional to”, and $\\binom nx$ is the number of ways to choose which $x$ of the $n$ trials were successes; it does not involve $p$ and drops out.',
    'The prior and the likelihood have the same algebraic form in $p$ (a power of $p$ times a power of $1 - p$), which is what makes the family closed under updating. For a geometric or negative binomial observation the likelihood is $p^{r}(1-p)^{k}$, which has the same form, so the same argument gives $\\mathrm{Beta}(\\alpha + r,\\ \\beta + k)$.',
    '<b>A compromise between prior and data.</b> The posterior mean is a weighted average of the prior mean and the observed proportion $x/n$:',
    { tex: '\\mathrm{E}[p \\mid x] = \\frac{\\alpha + x}{\\alpha + \\beta + n} = \\frac{\\alpha + \\beta}{\\alpha + \\beta + n} \\cdot \\frac{\\alpha}{\\alpha + \\beta} + \\frac{n}{\\alpha + \\beta + n} \\cdot \\frac{x}{n}.' },
    'The weight on the data, $n/(\\alpha + \\beta + n)$, approaches 1 as the number of trials grows, so with enough data the prior hardly matters. The posterior standard deviation shrinks roughly like $1/\\sqrt{n}$.',
    '<b>Updating one trial at a time.</b> Because the update only adds counts, updating after each trial gives the same posterior as updating once with all the data, whatever the order of the trials. Today’s posterior is tomorrow’s prior.',
    '<b>Predicting new trials.</b> The probability of $k$ successes in $m$ new trials, averaged over the posterior, is a beta-binomial distribution with parameters $m$, $\\alpha + x$ and $\\beta + n - x$. It is wider than the binomial with $p$ set to its posterior mean, because it also accounts for the remaining uncertainty about $p$. For $m = 1$ the predictive probability of a success is the posterior mean; with the uniform prior $\\mathrm{Beta}(1, 1)$ this is Laplace’s rule of succession $(x + 1)/(n + 2)$.',
  ],

  references: [
    { text: 'Wikipedia: Conjugate prior (table of conjugate distributions).', url: 'https://en.wikipedia.org/wiki/Conjugate_prior' },
    { text: 'Wikipedia: Beta distribution, Bayesian inference.', url: 'https://en.wikipedia.org/wiki/Beta_distribution#Bayesian_inference' },
    { text: 'Gelman, A., Carlin, J. B., Stern, H. S., Dunson, D. B., Vehtari, A., & Rubin, D. B. (2013). <i>Bayesian Data Analysis</i> (3rd ed.), Sections 2.1–2.4. CRC Press.', url: 'http://www.stat.columbia.edu/~gelman/book/' },
    { text: 'Lee, M. D., & Wagenmakers, E.-J. (2013). <i>Bayesian Cognitive Modeling: A Practical Course</i>, Chapter 3 (inferences with binomials). Cambridge University Press.' },
    { text: 'Casella, G., & Berger, R. L. (2002). <i>Statistical Inference</i> (2nd ed.), Example 7.2.14. Duxbury.' },
  ],

  demo(container, { plot, ui }) {
    const { h } = ui;
    const params = [
      { key: 'alpha', sym: '\\alpha', name: 'prior successes', meaning: 'The first shape of the beta prior. The prior acts as if $\\alpha$ successes had already been seen.', min: A_MIN, max: A_MAX, default: 2, log: true },
      { key: 'beta', sym: '\\beta', name: 'prior failures', meaning: 'The second shape of the beta prior. The prior acts as if $\\beta$ failures had already been seen.', min: A_MIN, max: A_MAX, default: 2, log: true },
      { key: 'n', sym: 'n', name: 'number of trials', meaning: 'How many trials were observed.', min: 0, max: N_MAX, default: 10, integer: true },
      { key: 'x', sym: 'x', name: 'number of successes', meaning: 'How many of the $n$ trials were successes (at most $n$).', min: 0, max: N_MAX, default: 7, integer: true },
      { key: 'm', sym: 'm', name: 'future trials to predict', meaning: 'The number of new trials for the posterior predictive distribution on the right.', min: 1, max: 60, default: 20, integer: true },
    ];
    const defaults = { alpha: 2, beta: 2, n: 10, x: 7, m: 20 };
    const store = ui.createStore({ ...defaults });

    const postBox = h('div'), predBox = h('div');
    const formula = h('div', { class: 'formula', 'aria-live': 'polite' });
    const readout = h('p', { class: 'demo-readout', 'aria-live': 'polite' });
    const controls = h('div', { class: 'demo-controls' });
    container.append(
      ui.rich('p', 'Set the prior with $\\alpha$ and $\\beta$ and the data with $n$ trials and $x$ successes. The left plot shows the prior (dashed), the likelihood of the data scaled to area 1 (thin line) and the posterior (solid, shaded) for the success probability $p$. Drag the amber line to move the prior mean (this keeps $\\alpha + \\beta$, the prior’s weight), drag the amber marker under the axis to change the observed proportion $x/n$, or add trials one at a time with the buttons. The update formula below the plots is filled in with the current numbers.', { class: 'small muted demo-intro' }),
      h('div', { class: 'demo-grid' },
        h('figure', { class: 'plot-fig' }, ui.rich('figcaption', 'Prior, likelihood and posterior for $p$'), postBox),
        h('figure', { class: 'plot-fig' }, ui.rich('figcaption', 'Predicted successes in $m$ new trials'), predBox)),
      formula, readout, controls);

    const fix = (s, key) => {
      // keep 0 <= x <= n by moving the other count
      if (key === 'x' && s.x > s.n) s.n = s.x;
      if (key === 'n' && s.x > s.n) s.x = s.n;
      return s;
    };
    const set = patch => store.set(fix({ ...store.get(), ...patch }, Object.keys(patch)[0]));
    const panel = ui.paramPanel(controls, params, {
      get: () => store.get(),
      apply: (k, v) => set({ [k]: v }),
      onReset: () => store.set({ ...defaults }),
    });
    const btn = (label, fn) => { const b = h('button', { type: 'button', class: 'btn small-btn' }, label); b.addEventListener('click', fn); return b; };
    controls.append(h('div', { class: 'demo-sim-ctl' }, h('h3', { class: 'mini-title' }, 'Data'),
      h('div', { style: 'display:flex;flex-wrap:wrap;gap:.5rem' },
        btn('Add a success', () => { const s = store.get(); if (s.n < N_MAX) store.set({ n: s.n + 1, x: s.x + 1 }); }),
        btn('Add a failure', () => { const s = store.get(); if (s.n < N_MAX) store.set({ n: s.n + 1 }); }),
        btn('Clear data', () => store.set({ n: 0, x: 0 })))));

    const postPlot = new plot.Plot(postBox, { xLabel: 'success probability p', yLabel: 'density' });
    const predPlot = new plot.Plot(predBox, { xLabel: 'k (successes in m new trials)', yLabel: 'probability' });

    let raf = 0, kappa0 = null;
    const request = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; draw(); }); };
    store.subscribe(() => { panel.update(store.get()); request(); });

    function draw() {
      const { alpha, beta, n, x, m } = store.get();
      const a1 = alpha + x, b1 = beta + n - x;
      const xd = [-0.02, 1.02];
      const N = 500;
      const prior = plot.sampleFn(t => betaPdf(t, alpha, beta), 0, 1, N);
      const post = plot.sampleFn(t => betaPdf(t, a1, b1), 0, 1, N);
      const lik = n ? plot.sampleFn(t => betaPdf(t, x + 1, n - x + 1), 0, 1, N) : [];
      // y range: the tallest curve away from the ends (a prior with a shape below 1 is infinite at an end)
      const inner = pts => pts.filter(q => q[0] > 0.015 && q[0] < 0.985).map(q => q[1]).filter(Number.isFinite);
      const top = Math.max(...inner(post), ...(n ? inner(lik) : []), Math.min(Math.max(...inner(prior)), 2.5 * Math.max(...inner(post))), 1e-6) * 1.15;
      const pm = alpha / (alpha + beta), ph = n ? x / n : NaN;
      postPlot.render({
        x: xd, y: [0, top],
        layers: [
          { id: 'post-fill', type: 'area', points: post, cls: 'pdf-fill' },
          { id: 'prior', type: 'line', points: prior, cls: 'curve-ref' },
          { id: 'lik', type: 'line', points: lik, cls: 'curve-2 curve-thin' },
          { id: 'post', type: 'line', points: post, cls: 'curve-main' },
          { id: 'post-mean', type: 'vline', x: a1 / (a1 + b1), cls: 'mean-line' },
        ],
        handles: [
          {
            id: 'prior-mean', type: 'vline', x: pm, label: 'prior mean',
            ariaLabel: 'Prior mean α/(α+β). Drag left or right to move it with α+β fixed, or use the arrow keys.',
            valueText: ui.fmt(pm, 3), valueNow: pm, valueMin: 0, valueMax: 1,
            onDrag: (pt, phase) => {
              if (phase === 'start') kappa0 = alpha + beta;
              if (pt && kappa0) {
                const k = kappa0, mm = clamp(pt.x, A_MIN / k, 1 - A_MIN / k);
                store.set({ alpha: Number((mm * k).toPrecision(3)), beta: Number(((1 - mm) * k).toPrecision(3)) });
              }
              if (phase === 'end') kappa0 = null;
            },
            onKey: steps => {
              const s = store.get(), k = s.alpha + s.beta;
              const mm = clamp(s.alpha / k + 0.01 * steps, A_MIN / k, 1 - A_MIN / k);
              store.set({ alpha: Number((mm * k).toPrecision(3)), beta: Number(((1 - mm) * k).toPrecision(3)) });
            },
          },
          ...(n ? [{
            id: 'prop', type: 'xPoint', x: ph, label: 'x/n', lineTo: top * 0.12,
            ariaLabel: 'Observed proportion of successes x/n. Drag left or right to change the number of successes, or use the arrow keys.',
            valueText: `${x} of ${n}`, valueNow: x, valueMin: 0, valueMax: n,
            onDrag: pt => { if (pt) set({ x: clamp(Math.round(pt.x * n), 0, n) }); },
            onKey: steps => set({ x: clamp(store.get().x + Math.sign(steps), 0, store.get().n) }),
          }] : []),
        ],
        legend: [
          { label: `prior Beta(${n4(alpha)}, ${n4(beta)})`, cls: 'curve-ref' },
          ...(n ? [{ label: `likelihood of ${x} ${x === 1 ? 'success' : 'successes'} in ${n} ${n === 1 ? 'trial' : 'trials'}, scaled to area 1`, cls: 'curve-2' }] : []),
          { label: `posterior Beta(${n4(a1)}, ${n4(b1)}); dotted line at its mean`, cls: 'curve-main' },
        ],
      });

      // ---- posterior predictive for m new trials
      const ks = [];
      for (let k = 0; k <= m; k++) ks.push(k);
      const pred = ks.map(k => [k, betaBinPmf(k, m, a1, b1)]);
      const plug = ks.map(k => [k, binPmf(k, m, a1 / (a1 + b1))]);
      const ym = Math.min(1.08, Math.max(...pred.map(q => q[1]), ...plug.map(q => q[1])) * 1.18);
      predPlot.render({
        x: [-0.7, m + 0.7], y: [0, ym], discreteX: true,
        layers: [
          { id: 'plug', type: 'stems', points: plug.map(([k, q]) => [k + 0.18, q]), cls: 'pmf-ref' },
          { id: 'pred', type: 'stems', points: pred, cls: 'pmf' },
        ],
        legend: [
          { label: `posterior predictive: beta-binomial(${m}, ${n4(a1)}, ${n4(b1)})`, cls: 'curve-main' },
          { label: `binomial(${m}, ${n4(a1 / (a1 + b1))}) with p fixed at its posterior mean`, cls: 'curve-ref' },
        ],
      });

      // ---- the update formula with the numbers filled in
      ui.renderTex(formula,
        `\\begin{aligned} p \\mid x \\;\\sim\\;& \\mathrm{Beta}(\\alpha + x,\\ \\beta + n - x) \\\\ =\\;& \\mathrm{Beta}(${n4(alpha)} + ${x},\\ ${n4(beta)} + ${n} - ${x}) \\\\ =\\;& \\mathrm{Beta}(${n4(a1)},\\ ${n4(b1)}) \\end{aligned}`, true);

      const w = (alpha + beta) / (alpha + beta + n);
      const lo = betaIinv(0.025, a1, b1), hi = betaIinv(0.975, a1, b1);
      const sd = Math.sqrt(a1 * b1 / ((a1 + b1) ** 2 * (a1 + b1 + 1)));
      ui.renderRich(readout,
        `Posterior mean $(\\alpha + x)/(\\alpha + \\beta + n)$ = <b>${ui.fmt(a1 / (a1 + b1), 4)}</b>`
        + (n ? ` = ${ui.fmt(w, 3)} × prior mean ${ui.fmt(pm, 3)} + ${ui.fmt(1 - w, 3)} × observed proportion ${ui.fmt(ph, 3)}` : ' (no data yet, so the posterior equals the prior)')
        + `. Posterior standard deviation <b>${ui.fmt(sd, 3)}</b>; 95% credible interval <b>${ui.fmt(lo, 3)}</b> to <b>${ui.fmt(hi, 3)}</b>. `
        + `The prior counts as $\\alpha + \\beta$ = ${ui.fmt(alpha + beta, 3)} trials. The predictive distribution has standard deviation ${ui.fmt(Math.sqrt(m * a1 * b1 * (a1 + b1 + m) / ((a1 + b1) ** 2 * (a1 + b1 + 1))), 3)}, `
        + `compared with ${ui.fmt(Math.sqrt(m * (a1 / (a1 + b1)) * (b1 / (a1 + b1))), 3)} for the binomial with $p$ fixed.`);
    }
    draw();
  },
};
