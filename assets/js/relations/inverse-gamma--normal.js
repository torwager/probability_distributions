// Inverse-gamma -> Normal (conjugate prior): an InvGamma(alpha, beta) prior on the variance sigma^2 of normal
// data with a known mean mu gives the posterior InvGamma(alpha + n/2, beta + sum (x_i - mu)^2 / 2).
// Hand-written demo: prior, likelihood (scaled to area 1) and posterior for sigma^2, with the update formula
// filled in live; on the right, the simulated observations against the posterior predictive distribution
// (a Student t) and the true normal distribution. Data are simulated from fixed standard normal numbers,
// so changing the true standard deviation rescales the same data smoothly.
// Self-contained: all densities are computed with core/math.js.

import { getRelation } from '../catalog.js';
import { lgamma, gammaPinv, makeRng, clamp, PI } from '../core/math.js';

const REL = getRelation('inverse-gamma--normal');
const N_MAX = 200, MU = 0;

const igPdf = (y, a, b) => (y <= 0 ? 0 : Math.exp(a * Math.log(b) - (a + 1) * Math.log(y) - b / y - lgamma(a)));
const igQ = (u, a, b) => b / gammaPinv(a, 1 - u);
const tPdf = (x, nu, s) => { const z = x / s; return Math.exp(lgamma((nu + 1) / 2) - lgamma(nu / 2) - 0.5 * Math.log(nu * PI) - Math.log(s) - (nu + 1) / 2 * Math.log1p(z * z / nu)); };
const nPdf = (x, s) => Math.exp(-0.5 * (x / s) ** 2) / (s * Math.sqrt(2 * PI));
const n4 = v => String(Number(v.toPrecision(4)));

export default {
  id: 'inverse-gamma--normal',
  from: 'inverse-gamma',
  to: 'normal',
  title: 'The inverse-gamma distribution is the conjugate prior for the variance of normal data with a known mean',

  summary: 'For normal data with a known mean, an inverse-gamma prior on the variance gives an inverse-gamma posterior. The shape grows by half the number of observations and the scale by half the sum of squared deviations from the mean.',

  plain: [
    'Suppose observations $x_1, \\dots, x_n$ come from a normal distribution whose mean $\\mu$ is known but whose variance $\\sigma^2$ is not, for example repeated measurements with an instrument of unknown precision. If our prior uncertainty about $\\sigma^2$ is described by an inverse-gamma distribution $\\mathrm{InvGamma}(\\alpha, \\beta)$, then the posterior distribution of $\\sigma^2$ after seeing the data is again inverse-gamma. A prior with this property is called conjugate.',
    'The update has a direct reading. The shape $\\alpha$ grows by half the number of observations, and the scale $\\beta$ grows by half the sum of squared deviations $\\sum_i (x_i - \\mu)^2$. So the prior behaves as if we had already seen $2\\alpha$ observations whose squared deviations added up to $2\\beta$, a prior guess of the variance of about $\\beta/\\alpha$.',
    'When the mean is unknown as well, the normal–inverse-gamma prior is used: $\\sigma^2$ gets an inverse-gamma prior and, given $\\sigma^2$, the mean $\\mu$ gets a normal prior with variance proportional to $\\sigma^2$. For the mean alone with a known variance, a normal prior is conjugate.',
  ],

  statementTex: REL.statement,
  glossary: [
    { sym: '\\sigma^2', meaning: 'The unknown variance of the normal observations (the square of their standard deviation $\\sigma$). It is the quantity we want to learn.' },
    { sym: '\\mathrm{InvGamma}(\\alpha, \\beta)', meaning: 'The inverse-gamma distribution with shape $\\alpha$ and scale $\\beta$: density proportional to $(\\sigma^2)^{-\\alpha-1}e^{-\\beta/\\sigma^2}$. Its reciprocal $1/\\sigma^2$, the precision, has a $\\mathrm{Gamma}(\\alpha, \\text{rate } \\beta)$ distribution.' },
    { sym: '\\alpha', meaning: 'The prior shape, a positive number. $2\\alpha$ acts like a prior number of observations.' },
    { sym: '\\beta', meaning: 'The prior scale, a positive number in the units of a variance. $2\\beta$ acts like a prior sum of squared deviations.' },
    { sym: 'X_1, \\dots, X_n', meaning: 'The $n$ observations, as random variables; $x_1, \\dots, x_n$ are their observed values.' },
    { sym: '\\mid \\sigma^2', meaning: 'Given the value of $\\sigma^2$ (conditioning on it).' },
    { sym: '\\overset{iid}{\\sim}', meaning: 'Independent and identically distributed: given $\\sigma^2$, every observation has the same normal distribution and none affects the others.' },
    { sym: '\\mathcal N(\\mu, \\sigma^2)', meaning: 'The normal distribution with mean $\\mu$ and variance $\\sigma^2$.' },
    { sym: '\\mu', meaning: 'The mean of the observations, assumed known.' },
    { sym: '\\Rightarrow', meaning: 'Implies.' },
    { sym: '\\sigma^2 \\mid \\mathbf x', meaning: 'The posterior distribution: what we know about $\\sigma^2$ after seeing the data $\\mathbf x = (x_1, \\dots, x_n)$.' },
    { sym: 'n', meaning: 'The number of observations.' },
    { sym: '\\tfrac12\\textstyle\\sum_i (x_i - \\mu)^2', meaning: 'Half the sum of squared deviations of the observations from the known mean.' },
  ],

  why: [
    '<b>Bayes’ rule.</b> The posterior is proportional to the prior times the likelihood. The normal likelihood of $n$ observations, as a function of $\\sigma^2$, is',
    { tex: 'p(\\mathbf x \\mid \\sigma^2) = \\prod_{i=1}^n \\frac{1}{\\sqrt{2\\pi\\sigma^2}} \\exp\\!\\left(-\\frac{(x_i - \\mu)^2}{2\\sigma^2}\\right) \\;\\propto\\; (\\sigma^2)^{-n/2} \\exp\\!\\left(-\\frac{S}{2\\sigma^2}\\right), \\qquad S = \\sum_{i=1}^n (x_i - \\mu)^2.' },
    'Multiplying by the prior density, which is proportional to $(\\sigma^2)^{-\\alpha - 1} e^{-\\beta/\\sigma^2}$, adds the exponents:',
    { tex: 'p(\\sigma^2 \\mid \\mathbf x) \\;\\propto\\; (\\sigma^2)^{-(\\alpha + n/2) - 1} \\exp\\!\\left(-\\frac{\\beta + S/2}{\\sigma^2}\\right),' },
    'which has the form of an inverse-gamma density with shape $\\alpha + n/2$ and scale $\\beta + S/2$. The constant that makes it integrate to 1 is the inverse-gamma normalizing constant, so the posterior is exactly $\\mathrm{InvGamma}(\\alpha + n/2,\\ \\beta + S/2)$. Here $\\propto$ means “proportional to” and $\\pi \\approx 3.14159$.',
    '<b>A compromise between prior and data.</b> With known mean, the maximum-likelihood estimate of the variance is $S/n$. When $\\alpha > 1$ the posterior mean is a weighted average of the prior mean $\\beta/(\\alpha - 1)$ and $S/n$:',
    { tex: '\\mathrm{E}[\\sigma^2 \\mid \\mathbf x] = \\frac{\\beta + S/2}{\\alpha + n/2 - 1} = \\frac{\\alpha - 1}{\\alpha - 1 + n/2} \\cdot \\frac{\\beta}{\\alpha - 1} + \\frac{n/2}{\\alpha - 1 + n/2} \\cdot \\frac{S}{n}.' },
    '<b>The same prior on the precision scale.</b> Since $1/\\sigma^2$ has a gamma distribution exactly when $\\sigma^2$ has an inverse-gamma distribution, this is the same as a $\\mathrm{Gamma}(\\alpha, \\beta)$ prior on the precision $\\tau = 1/\\sigma^2$, updated to $\\mathrm{Gamma}(\\alpha + n/2,\\ \\beta + S/2)$. BUGS and JAGS parameterize the normal by its precision, so their gamma priors on precisions are inverse-gamma priors on variances.',
    '<b>Predicting a new observation.</b> Averaging the normal distribution $\\mathcal N(\\mu, \\sigma^2)$ over the inverse-gamma posterior gives a Student’s t distribution with $2\\alpha\'$ degrees of freedom, center $\\mu$ and scale $\\sqrt{\\beta\'/\\alpha\'}$, where $\\alpha\' = \\alpha + n/2$ and $\\beta\' = \\beta + S/2$ (see the inverse-gamma to Student’s t relation). It has heavier tails than a normal distribution, reflecting the remaining uncertainty about $\\sigma^2$, and approaches the normal as $n$ grows.',
    '<b>Vague priors.</b> As $\\alpha$ and $\\beta$ approach 0, the prior approaches $p(\\sigma^2) \\propto 1/\\sigma^2$ (improper, but giving a proper posterior once data are seen), and the posterior becomes $\\mathrm{InvGamma}(n/2, S/2)$. Its quantiles reproduce the classical chi-squared confidence interval for a variance.',
  ],

  references: [
    { text: 'Wikipedia: Conjugate prior (normal with known mean, unknown variance).', url: 'https://en.wikipedia.org/wiki/Conjugate_prior#When_likelihood_function_is_a_continuous_distribution' },
    { text: 'Wikipedia: Inverse-gamma distribution.', url: 'https://en.wikipedia.org/wiki/Inverse-gamma_distribution' },
    { text: 'Gelman, A., Carlin, J. B., Stern, H. S., Dunson, D. B., Vehtari, A., & Rubin, D. B. (2013). <i>Bayesian Data Analysis</i> (3rd ed.), Section 2.6 (normal distribution with known mean but unknown variance) and Section 3.3. CRC Press.', url: 'http://www.stat.columbia.edu/~gelman/book/' },
    { text: 'Murphy, K. P. (2007). Conjugate Bayesian analysis of the Gaussian distribution. Technical note, University of British Columbia.', url: 'https://www.cs.ubc.ca/~murphyk/Papers/bayesGauss.pdf' },
    { text: 'Leemis, L. M., & McQueston, J. T. (2008). Univariate distribution relationships. <i>The American Statistician</i>, 62(1), 45–53.', url: 'https://doi.org/10.1198/000313008X270448' },
  ],

  demo(container, { plot, ui }) {
    const { h } = ui;
    const params = [
      { key: 'alpha', sym: '\\alpha', name: 'prior shape', meaning: 'The prior acts like $2\\alpha$ earlier observations.', min: 0.1, max: 30, default: 3, log: true },
      { key: 'beta', sym: '\\beta', name: 'prior scale', meaning: 'The prior acts like a sum of squared deviations $2\\beta$; its mode is $\\beta/(\\alpha + 1)$.', min: 0.1, max: 30, default: 2, log: true },
      { key: 'sigma', sym: '\\sigma_{\\text{true}}', name: 'true standard deviation', meaning: 'The standard deviation used to simulate the observations; the true variance is its square. In a real analysis it is unknown.', min: 0.2, max: 4, default: 1.5, step: 0.05 },
      { key: 'n', sym: 'n', name: 'number of observations', meaning: 'How many normal observations have been made. Their mean $\\mu = 0$ is known.', min: 0, max: N_MAX, default: 10, integer: true },
    ];
    const defaults = { alpha: 3, beta: 2, sigma: 1.5, n: 10 };
    const store = ui.createStore({ ...defaults, seed: 1 });

    const postBox = h('div', { 'data-role': 'main-plot' }), dataBox = h('div', { 'data-role': 'main-plot' });
    const formula = h('div', { class: 'formula', 'aria-live': 'polite' });
    const readout = h('p', { class: 'demo-readout', 'aria-live': 'polite' });
    const controls = h('div', { class: 'demo-controls' });
    // the plots come first, so that they are visible on a laptop screen; the intro text follows the controls
    container.append(
      h('div', { class: 'demo-grid' },
        h('figure', { class: 'plot-fig' }, ui.rich('figcaption', 'Prior, likelihood and posterior for $\\sigma^2$'), postBox),
        h('figure', { class: 'plot-fig' }, h('figcaption', {}, 'Observations and the predictive distribution of a new one'), dataBox)),
      formula, readout, controls,
      ui.rich('p', 'Observations are simulated from a normal distribution with known mean $\\mu = 0$ and a true standard deviation that you choose. The left plot shows what is known about the variance $\\sigma^2$: the inverse-gamma prior (dashed), the likelihood of the data scaled to area 1 (thin line; drawn once there are at least 3 observations) and the inverse-gamma posterior (solid, shaded). Drag the amber line to move the prior mode $\\beta/(\\alpha + 1)$ (this changes $\\beta$ and keeps $\\alpha$), drag the amber marker under the axis to change the true variance, or add observations with the buttons. The right plot compares the data with the posterior predictive distribution for a new observation.', { class: 'small muted demo-intro' }));

    const panel = ui.paramPanel(controls, params, {
      get: () => store.get(),
      apply: (k, v) => store.set({ [k]: v }),
      onReset: () => store.set({ ...defaults }),
    });
    const btn = (label, fn) => { const b = h('button', { type: 'button', class: 'btn small-btn' }, label); b.addEventListener('click', fn); return b; };
    controls.append(h('div', { class: 'demo-sim-ctl' }, h('h3', { class: 'mini-title' }, 'Data'),
      h('div', { style: 'display:flex;flex-wrap:wrap;gap:.5rem' },
        btn('Add 1 observation', () => store.set({ n: Math.min(N_MAX, store.get().n + 1) })),
        btn('Add 10', () => store.set({ n: Math.min(N_MAX, store.get().n + 10) })),
        btn('Clear data', () => store.set({ n: 0 })),
        btn('Draw new data', () => store.set({ seed: store.get().seed + 1 })))));

    const postPlot = new plot.Plot(postBox, { xLabel: 'variance σ²', yLabel: 'density', height: (w, H) => plot.fitHeight(w, H, { ratio: 0.62, phoneRatio: 0.7, min: 220, max: 400 }) });
    const dataPlot = new plot.Plot(dataBox, { xLabel: 'x (observation)', yLabel: 'density', height: (w, H) => plot.fitHeight(w, H, { ratio: 0.62, phoneRatio: 0.7, min: 220, max: 400 }) });

    // fixed standard normal numbers for each seed: the data are sigma * z_i
    let zCache = { seed: null, zs: [] };
    const zs = seed => {
      if (zCache.seed !== seed) { const rng = makeRng(777 + 31 * seed); zCache = { seed, zs: Array.from({ length: N_MAX }, () => rng.normal()) }; }
      return zCache.zs;
    };

    let frozen = null, raf = 0;
    const request = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; draw(); }); };
    store.subscribe(() => { panel.update(store.get()); request(); });
    const drag = (fn) => (pt, phase) => {
      if (phase === 'start') frozen = lastX.slice();
      if (pt) fn(pt);
      if (phase === 'end') { frozen = null; request(); }
    };
    let lastX = [0, 1];

    function draw() {
      const { alpha, beta, sigma, n, seed } = store.get();
      const xs = zs(seed).slice(0, n).map(z => MU + sigma * z);
      const S = xs.reduce((s, x) => s + (x - MU) ** 2, 0);
      const a1 = alpha + n / 2, b1 = beta + S / 2;
      const s2 = sigma * sigma;
      const priorMode = beta / (alpha + 1);

      // ---- prior, likelihood and posterior for sigma^2
      const hiAuto = Math.max(igQ(0.995, a1, b1), 1.6 * s2, 1.4 * priorMode, Math.min(igQ(0.75, alpha, beta), 2.5 * priorMode), 0.5);
      const xd = frozen || [0, Math.min(hiAuto, 80)];
      lastX = xd;
      const lo = xd[1] / 2000;
      const prior = plot.sampleFn(y => igPdf(y, alpha, beta), lo, xd[1], 500);
      const post = plot.sampleFn(y => igPdf(y, a1, b1), lo, xd[1], 500);
      const lik = n >= 3 && S > 0 ? plot.sampleFn(y => igPdf(y, n / 2 - 1, S / 2), lo, xd[1], 500) : [];
      const fin = pts => pts.map(q => q[1]).filter(Number.isFinite);
      const peak = Math.max(...fin(post), ...(lik.length ? fin(lik).map(v => Math.min(v, 1.5 * Math.max(...fin(post)))) : []), ...fin(prior), 1e-9);
      const ymax = peak * 1.15;
      postPlot.render({
        x: xd, y: [0, ymax],
        layers: [
          { id: 'post-fill', type: 'area', points: post, cls: 'pdf-fill' },
          { id: 'prior', type: 'line', points: prior, cls: 'curve-ref' },
          { id: 'lik', type: 'line', points: lik, cls: 'curve-2 curve-thin' },
          { id: 'post', type: 'line', points: post, cls: 'curve-main' },
        ],
        handles: [
          {
            id: 'prior-mode', type: 'vline', x: priorMode, label: 'prior mode',
            ariaLabel: 'Prior mode β/(α+1). Drag left or right to change β with α fixed, or use the arrow keys.',
            valueText: ui.fmt(priorMode, 3), valueNow: priorMode, valueMin: 0, valueMax: 30,
            onDrag: drag(pt => store.set({ beta: clamp(Number((Math.max(pt.x, 1e-4) * (alpha + 1)).toPrecision(3)), 0.1, 30) })),
            onKey: steps => { const s = store.get(); store.set({ beta: clamp(Number((s.beta * Math.pow(1.05, steps)).toPrecision(3)), 0.1, 30) }); },
          },
          {
            id: 'true', type: 'xPoint', x: s2, label: 'true σ²', lineTo: ymax * 0.14,
            ariaLabel: 'True variance used to simulate the data. Drag left or right, or use the arrow keys.',
            valueText: ui.fmt(s2, 3), valueNow: s2, valueMin: 0.04, valueMax: 16,
            onDrag: drag(pt => store.set({ sigma: clamp(Math.round(Math.sqrt(Math.max(pt.x, 0)) * 100) / 100, 0.2, 4) })),
            onKey: steps => store.set({ sigma: clamp(Math.round((store.get().sigma + 0.05 * steps) * 100) / 100, 0.2, 4) }),
          },
        ],
        legend: [
          { label: `prior InvGamma(${n4(alpha)}, ${n4(beta)})`, cls: 'curve-ref' },
          ...(lik.length ? [{ label: 'likelihood, scaled to area 1', cls: 'curve-2' }] : []),
          { label: `posterior InvGamma(${n4(a1)}, ${n4(b1)})`, cls: 'curve-main' },
        ],
      });

      // ---- observations and the posterior predictive distribution (Student t)
      const nu = 2 * a1, sc = Math.sqrt(b1 / a1);
      const R = Math.max(3.6 * sigma, 3.6 * sc, ...xs.map(Math.abs)) * 1.05;
      const layers = [];
      let ym = Math.max(tPdf(0, nu, sc), nPdf(0, sigma));
      if (n) {
        const bins = clamp(Math.round(1.6 * Math.sqrt(n)), 8, 40);
        const w = 2 * R / bins, counts = new Array(bins).fill(0);
        for (const x of xs) counts[clamp(Math.floor((x + R) / w), 0, bins - 1)]++;
        const bars = counts.map((c, i) => [-R + (i + 0.5) * w, c / (n * w)]);
        ym = Math.max(ym, Math.min(Math.max(...bars.map(b => b[1])), 2.2 * ym));
        layers.push({ id: 'hist', type: 'bars', points: bars, width: w, cls: 'bars-strong' });
        // a rug of the individual observations along the axis
        xs.forEach((x, i) => layers.push({ id: 'rug' + i, type: 'segment', x1: x, y1: 0, x2: x, y2: 0.05 * ym, cls: 'rug' }));
      } else layers.push({ id: 'hist', type: 'bars', points: [], width: 1, cls: 'bars-strong' });
      layers.push({ id: 'true', type: 'line', points: plot.sampleFn(x => nPdf(x, sigma), -R, R, 300), cls: 'curve-ref' });
      layers.push({ id: 'pred', type: 'line', points: plot.sampleFn(x => tPdf(x, nu, sc), -R, R, 300), cls: 'curve-main' });
      dataPlot.render({
        x: [-R, R], y: [0, ym * 1.15], layers,
        legend: [
          { label: `observations (n = ${n})`, cls: 'bars-strong' },
          { label: `predictive Student t (${n4(nu)} df, scale ${n4(sc)})`, cls: 'curve-main' },
          { label: `true normal (sd ${n4(sigma)})`, cls: 'curve-ref' },
        ],
      });

      // ---- formula with the numbers filled in
      ui.renderTex(formula,
        `\\begin{aligned} \\sigma^2 \\mid \\mathbf x \\;\\sim\\;& \\mathrm{InvGamma}\\!\\left(\\alpha + \\tfrac n2,\\ \\beta + \\tfrac12\\textstyle\\sum_i (x_i - \\mu)^2\\right) \\\\ =\\;& \\mathrm{InvGamma}\\!\\left(${n4(alpha)} + \\tfrac{${n}}{2},\\ ${n4(beta)} + \\tfrac12 \\cdot ${n4(S)}\\right) \\\\ =\\;& \\mathrm{InvGamma}(${n4(a1)},\\ ${n4(b1)}) \\end{aligned}`, true);

      const lo95 = igQ(0.025, a1, b1), hi95 = igQ(0.975, a1, b1);
      let text = n ? `Observed: $n$ = ${n}, sum of squares $\\sum_i (x_i - \\mu)^2$ = ${ui.fmt(S, 4)}, so the maximum-likelihood estimate $S/n$ = <b>${ui.fmt(S / n, 4)}</b>. ` : 'No observations yet, so the posterior equals the prior. ';
      if (a1 > 1) {
        text += `Posterior mean of $\\sigma^2$: <b>${ui.fmt(b1 / (a1 - 1), 4)}</b>`;
        if (alpha > 1 && n) { const w = (alpha - 1) / (alpha - 1 + n / 2); text += ` = ${ui.fmt(w, 3)} × prior mean ${ui.fmt(beta / (alpha - 1), 3)} + ${ui.fmt(1 - w, 3)} × $S/n$`; }
        text += '. ';
      } else text += 'The posterior mean is infinite (shape at most 1). ';
      text += `Posterior mode <b>${ui.fmt(b1 / (a1 + 1), 4)}</b>, 95% credible interval <b>${ui.fmt(lo95, 3)}</b> to <b>${ui.fmt(hi95, 3)}</b>. The true variance is ${ui.fmt(s2, 4)}.`;
      ui.renderRich(readout, text);
    }
    draw();
  },
};
