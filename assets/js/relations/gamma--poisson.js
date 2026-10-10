// Gamma -> Poisson (conjugate prior): a Gamma(alpha, beta) prior on a Poisson rate gives the posterior
// Gamma(alpha + sum x, beta + n). Hand-written demo: prior, normalized likelihood and posterior for lambda;
// the observed counts against the posterior predictive (negative binomial) distribution; data are simulated
// from a "true" rate that can be dragged, using fixed uniform numbers so that the data change smoothly.

import { getRelation } from '../catalog.js';
import { lgamma, gammaQ, gammaPinv, betaI, makeRng, clamp } from '../core/math.js';

const REL = getRelation('gamma--poisson');
const N_MAX = 200;

const gammaPdf = (x, a, b) => (x <= 0 ? (a < 1 ? Infinity : a === 1 ? b : 0) : Math.exp(a * Math.log(b) + (a - 1) * Math.log(x) - b * x - lgamma(a)));
const gammaQuant = (u, a, b) => gammaPinv(a, u) / b;
const nbPmf = (k, r, p) => (k < 0 ? 0 : Math.exp(lgamma(k + r) - lgamma(r) - lgamma(k + 1) + r * Math.log(p) + k * Math.log1p(-p)));
const nbQuantile = (u, r, p) => { let k = 0; while (betaI(p, r, k + 1) < u && k < 1e5) k++; return k; };

/** Poisson draws from fixed uniforms: x_i = smallest k with F(k) >= u_i, for the given mean. */
function poissonFromUniforms(us, lam) {
  const F = [];
  let k = 0;
  for (;;) { const v = gammaQ(k + 1, lam); F.push(v); if (v > 1 - 1e-13 || k > lam + 60 * Math.sqrt(lam) + 60) break; k++; }
  return us.map(u => { let lo = 0, hi = F.length - 1; while (lo < hi) { const m = (lo + hi) >> 1; if (F[m] >= u) hi = m; else lo = m + 1; } return lo; });
}

export default {
  id: 'gamma--poisson',
  from: 'gamma',
  to: 'poisson',
  title: 'The gamma distribution is the conjugate prior for the rate of Poisson counts',

  plain: [
    'Suppose we want to learn the rate $\\lambda$ of a Poisson process, such as a neuron’s firing rate or the number of calls per hour, from observed counts. In Bayesian inference our uncertainty about $\\lambda$ before seeing data is described by a prior distribution. If that prior is a gamma distribution, the posterior distribution after observing Poisson counts is again a gamma distribution, with simple updated parameters. A prior with this property is called conjugate.',
    'The update has an easy reading. The shape goes up by the total count, and the rate parameter goes up by the number of observation periods. So the prior $\\mathrm{Gamma}(\\alpha, \\beta)$ behaves as if we had already watched $\\beta$ periods and seen $\\alpha$ events in total. The gamma is also the conjugate prior for the rate of exponential waiting times, which describe the same Poisson process from the waiting-time side.',
  ],

  statementTex: REL.statement,
  glossary: [
    { sym: '\\lambda', meaning: 'The unknown Poisson rate (the expected count per observation period), the quantity we want to learn.' },
    { sym: '\\mathrm{Gamma}(\\alpha, \\beta)', meaning: 'The gamma distribution with shape $\\alpha$ and rate $\\beta$: density proportional to $\\lambda^{\\alpha - 1} e^{-\\beta \\lambda}$, mean $\\alpha/\\beta$, variance $\\alpha/\\beta^2$. (In the scale form, the scale is $\\theta = 1/\\beta$.)' },
    { sym: '\\alpha', meaning: 'The prior shape. It acts like a prior total count of events.' },
    { sym: '\\beta', meaning: 'The prior rate parameter. It acts like a prior number of observation periods.' },
    { sym: 'X_1, \\dots, X_n', meaning: 'The observed counts, one per observation period.' },
    { sym: 'n', meaning: 'The number of observation periods (counts).' },
    { sym: '\\mid \\lambda', meaning: 'Given the value of $\\lambda$ (conditioning on it).' },
    { sym: '\\overset{iid}{\\sim}', meaning: 'Independent and identically distributed: given $\\lambda$, every count has the same Poisson distribution and none affects the others.' },
    { sym: '\\mathrm{Poisson}(\\lambda)', meaning: 'The Poisson distribution with mean $\\lambda$.' },
    { sym: '\\Rightarrow', meaning: 'Implies.' },
    { sym: '\\lambda \\mid \\mathbf x', meaning: 'The posterior distribution: what we know about $\\lambda$ after seeing the data $\\mathbf x = (x_1, \\dots, x_n)$.' },
    { sym: '\\sum_i x_i', meaning: 'The total number of events observed in all $n$ periods.' },
    { sym: '\\mathrm{Gamma}(\\alpha + n,\\ \\beta + \\sum_i x_i)', meaning: 'The posterior for the rate of an exponential distribution, when $x_1, \\dots, x_n$ are observed waiting times instead of counts: the shape goes up by the number of waits and the rate parameter by their total length.' },
  ],

  why: [
    '<b>Bayes’ rule.</b> The posterior is proportional to the prior times the likelihood. Dropping every factor that does not involve $\\lambda$,',
    { tex: 'p(\\lambda \\mid \\mathbf x) \\;\\propto\\; \\underbrace{\\lambda^{\\alpha - 1} e^{-\\beta\\lambda}}_{\\text{prior}} \\;\\cdot\\; \\underbrace{\\prod_{i=1}^{n} \\lambda^{x_i} e^{-\\lambda}}_{\\text{likelihood}} \\;=\\; \\lambda^{\\alpha + \\sum_i x_i - 1}\\, e^{-(\\beta + n)\\lambda},' },
    'which has the form of a gamma density with shape $\\alpha + \\sum x_i$ and rate $\\beta + n$. The constant that makes it integrate to 1 is the gamma normalizing constant, so the posterior is exactly $\\mathrm{Gamma}(\\alpha + \\sum x_i,\\ \\beta + n)$. Here $\\propto$ means “proportional to”.',
    '<b>A compromise between prior and data.</b> The posterior mean is a weighted average of the prior mean and the sample mean $\\bar x$:',
    { tex: '\\mathrm{E}[\\lambda \\mid \\mathbf x] = \\frac{\\alpha + \\sum x_i}{\\beta + n} = \\frac{\\beta}{\\beta + n}\\cdot\\frac{\\alpha}{\\beta} + \\frac{n}{\\beta + n}\\cdot \\bar x.' },
    'The weight on the data, $n/(\\beta + n)$, grows toward 1 as more periods are observed, and the posterior standard deviation $\\sqrt{\\alpha + \\sum x_i}/(\\beta + n)$ shrinks roughly like $1/\\sqrt n$.',
    '<b>Predicting the next count.</b> Averaging the Poisson distribution over the gamma posterior gives a negative binomial posterior predictive distribution, $\\mathrm{NegBin}\\big(\\alpha + \\sum x_i,\\ (\\beta + n)/(\\beta + n + 1)\\big)$. It is wider than a Poisson because it includes the remaining uncertainty about $\\lambda$.',
    '<b>Exponential data.</b> For waiting times $x_i \\sim \\mathrm{Exp}(\\lambda)$ the likelihood is $\\lambda^{n} e^{-\\lambda \\sum x_i}$, so the roles swap: the shape grows by the number of waits and the rate parameter by their total length.',
    '<b>Weak priors.</b> As $\\alpha$ and $\\beta$ approach 0 the prior carries almost no information and the posterior mean approaches $\\bar x$, the maximum-likelihood estimate. The Jeffreys prior, proportional to $\\lambda^{-1/2}$, corresponds to $\\alpha = \\tfrac12$, $\\beta = 0$; both are improper (they do not integrate to 1) but give proper posteriors once a count has been observed.',
  ],

  references: [
    { text: 'Wikipedia: Conjugate prior (Poisson likelihood with gamma prior).', url: 'https://en.wikipedia.org/wiki/Conjugate_prior#When_likelihood_function_is_a_discrete_distribution' },
    { text: 'Wikipedia: Gamma distribution (Bayesian inference).', url: 'https://en.wikipedia.org/wiki/Gamma_distribution#Bayesian_inference' },
    { text: 'Gelman, A., Carlin, J. B., Stern, H. S., Dunson, D. B., Vehtari, A., & Rubin, D. B. (2013). <i>Bayesian Data Analysis</i> (3rd ed.), Section 2.6 (Poisson model) and Appendix A. CRC Press.', url: 'http://www.stat.columbia.edu/~gelman/book/' },
    { text: 'Casella, G., & Berger, R. L. (2002). <i>Statistical Inference</i> (2nd ed.), Section 7.2.3 (Bayes estimators and conjugate families). Duxbury.' },
  ],

  demo(container, { plot, ui }) {
    const { h } = ui;
    const params = [
      { key: 'alpha', sym: '\\alpha', name: 'prior shape', meaning: 'Acts like a prior total count of events.', min: 0.1, max: 40, default: 2, log: true },
      { key: 'beta', sym: '\\beta', name: 'prior rate', meaning: 'Acts like a prior number of observation periods; the prior mean is $\\alpha/\\beta$.', min: 0.05, max: 20, default: 0.5, log: true },
      { key: 'lam', sym: '\\lambda_{\\text{true}}', name: 'true rate (for simulating data)', meaning: 'The Poisson rate used to simulate the observed counts. In a real analysis it is unknown.', min: 0.2, max: 20, default: 6, step: 0.1 },
      { key: 'n', sym: 'n', name: 'number of observed counts', meaning: 'How many observation periods have been counted.', min: 0, max: N_MAX, default: 5, integer: true },
    ];
    const defaults = { alpha: 2, beta: 0.5, lam: 6, n: 5 };
    const store = ui.createStore({ ...defaults, seed: 1 });

    const postBox = h('div'), dataBox = h('div');
    const readout = h('p', { class: 'demo-readout', 'aria-live': 'polite' });
    const controls = h('div', { class: 'demo-controls' });
    container.append(
      ui.rich('p', 'The left plot shows what is known about the rate $\\lambda$: the gamma prior (dashed), the likelihood of the observed counts scaled to area 1 (thin line) and the gamma posterior (solid, shaded). The counts are simulated from the true rate marked under the axis. Add observations and watch the posterior move from the prior toward the data and narrow. Drag the amber line to move the prior mean (this changes $\\beta$ and keeps $\\alpha$), drag the amber marker to change the true rate, or type values below.', { class: 'small muted demo-intro' }),
      h('div', { class: 'demo-grid' },
        h('figure', { class: 'plot-fig' }, ui.rich('figcaption', 'Prior, likelihood and posterior for $\\lambda$'), postBox),
        h('figure', { class: 'plot-fig' }, h('figcaption', {}, 'Observed counts and the posterior predictive distribution'), dataBox)),
      readout, controls);

    const panel = ui.paramPanel(controls, params, {
      get: () => store.get(),
      apply: (k, v) => store.set({ [k]: v }),
      onReset: () => store.set({ ...defaults }),
    });
    const btn = (label, fn) => { const b = h('button', { type: 'button', class: 'btn small-btn' }, label); b.addEventListener('click', fn); return b; };
    controls.append(h('div', { class: 'demo-sim-ctl' }, h('h3', { class: 'mini-title' }, 'Data'),
      h('div', { style: 'display:flex;flex-wrap:wrap;gap:.5rem' },
        btn('Add 1 count', () => store.set({ n: Math.min(N_MAX, store.get().n + 1) })),
        btn('Add 10 counts', () => store.set({ n: Math.min(N_MAX, store.get().n + 10) })),
        btn('Clear data', () => store.set({ n: 0 })),
        btn('Draw new data', () => store.set({ seed: store.get().seed + 1 })))));

    const postPlot = new plot.Plot(postBox, { xLabel: 'rate λ', yLabel: 'density' });
    const dataPlot = new plot.Plot(dataBox, { xLabel: 'k (count in one period)', yLabel: 'proportion' });

    let uCache = { seed: null, us: [] };
    const uniforms = seed => {
      if (uCache.seed !== seed) { const rng = makeRng(4242 + 17 * seed); uCache = { seed, us: Array.from({ length: N_MAX }, () => rng.random()) }; }
      return uCache.us;
    };

    let frozen = null;
    let raf = 0;
    const request = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; draw(); }); };
    store.subscribe(() => { panel.update(store.get()); request(); });

    function draw() {
      const { alpha, beta, lam, n, seed } = store.get();
      const xs = n ? poissonFromUniforms(uniforms(seed).slice(0, n), lam) : [];
      const S = xs.reduce((a, b) => a + b, 0);
      const a1 = alpha + S, b1 = beta + n;
      const xbar = n ? S / n : NaN;

      // ---- prior, likelihood, posterior
      const hiAuto = Math.max(gammaQuant(0.995, alpha, beta), gammaQuant(0.999, a1, b1), lam * 1.25, n ? xbar * 1.25 : 0, 1);
      // a vague prior can reach far to the right; cap the view at 60 unless the posterior itself lies further out
      const hiCap = Math.max(60, 1.05 * gammaQuant(0.999, a1, b1), 1.25 * lam);
      const xd = frozen || [0, Math.min(hiAuto, hiCap)];
      const lo = xd[1] / 1500;
      const prior = plot.sampleFn(x => gammaPdf(x, alpha, beta), lo, xd[1], 400);
      const post = plot.sampleFn(x => gammaPdf(x, a1, b1), lo, xd[1], 400);
      const lik = n ? plot.sampleFn(x => gammaPdf(x, S + 1, n), lo, xd[1], 400) : [];
      const fin = pts => pts.map(q => q[1]).filter(Number.isFinite);
      const away = pts => fin(pts.filter(q => q[0] > 0.05 * xd[1]));   // heights away from a possible spike at 0
      const peak = Math.max(...fin(post), ...(n ? fin(lik) : []), Math.min(Math.max(...fin(prior)), 2.5 * Math.max(...away(prior), 1e-9)));
      const ymax = peak * 1.15;
      const pm = alpha / beta;
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
            id: 'prior-mean', type: 'vline', x: pm, label: 'α/β',
            ariaLabel: 'Prior mean α/β. Drag left or right to change β (α stays fixed), or use the arrow keys.',
            valueText: ui.fmt(pm, 3), valueNow: pm, valueMin: 0, valueMax: 800,
            onDrag: (pt, phase) => {
              if (phase === 'start') frozen = xd.slice();
              if (pt) store.set({ beta: clamp(Number((alpha / Math.max(pt.x, 1e-3)).toPrecision(3)), 0.05, 20) });
              if (phase === 'end') { frozen = null; request(); }
            },
            onKey: steps => { const s = store.get(); store.set({ beta: clamp(Number((s.alpha / (s.alpha / s.beta + 0.1 * steps)).toPrecision(3)), 0.05, 20) }); },
          },
          {
            id: 'true', type: 'xPoint', x: lam, label: 'true λ', lineTo: ymax * 0.14,
            ariaLabel: 'True rate used to simulate the counts. Drag left or right, or use the arrow keys.',
            valueText: ui.fmt(lam, 3), valueNow: lam, valueMin: 0.2, valueMax: 20,
            onDrag: (pt, phase) => {
              if (phase === 'start') frozen = xd.slice();
              if (pt) store.set({ lam: clamp(Math.round(pt.x * 10) / 10, 0.2, 20) });
              if (phase === 'end') { frozen = null; request(); }
            },
            onKey: steps => store.set({ lam: clamp(Math.round((store.get().lam + 0.1 * steps) * 10) / 10, 0.2, 20) }),
          },
        ],
        legend: [
          { label: `prior Gamma(${ui.fmt(alpha, 3)}, ${ui.fmt(beta, 3)})`, cls: 'curve-ref' },
          ...(n ? [{ label: 'likelihood, scaled to area 1', cls: 'curve-2' }] : []),
          { label: `posterior Gamma(${ui.fmt(a1, 4)}, ${ui.fmt(b1, 4)})`, cls: 'curve-main' },
        ],
      });

      // ---- observed counts and the posterior predictive distribution
      const pp = b1 / (b1 + 1);
      const kHi = Math.max(6, nbQuantile(0.995, a1, pp), ...xs);
      const freq = new Array(kHi + 1).fill(0);
      for (const x of xs) freq[x]++;
      const bars = freq.map((c, k) => [k, n ? c / n : 0]);
      const stems = freq.map((_, k) => [k, nbPmf(k, a1, pp)]);
      const ym = Math.max(...bars.map(b => b[1]), ...stems.map(s => s[1])) * 1.15;
      dataPlot.render({
        x: [-0.7, kHi + 0.7], y: [0, Math.min(1.08, ym)], discreteX: true,
        layers: [
          { id: 'bars', type: 'bars', points: bars, width: 0.7, cls: 'bars-strong' },
          { id: 'pred', type: 'stems', points: stems, cls: 'pmf' },
        ],
        legend: [{ label: `observed counts (n = ${n})`, cls: 'bars-strong' }, { label: `posterior predictive NegBin(${ui.fmt(a1, 4)}, ${ui.fmt(pp, 3)})`, cls: 'curve-main' }],
      });

      const lo95 = gammaQuant(0.025, a1, b1), hi95 = gammaQuant(0.975, a1, b1);
      const w = beta / b1;
      ui.renderRich(readout,
        (n ? `Observed: $n$ = ${n} counts with total $\\sum x_i$ = ${S}, so the sample mean is $\\bar x$ = <b>${ui.fmt(xbar, 4)}</b>. ` : 'No counts observed yet, so the posterior equals the prior. ')
        + `Posterior $\\mathrm{Gamma}(\\alpha + \\sum x_i,\\ \\beta + n)$ = $\\mathrm{Gamma}(${ui.fmt(a1, 4)},\\ ${ui.fmt(b1, 4)})$, `
        + `with mean <b>${ui.fmt(a1 / b1, 4)}</b> = ${ui.fmt(w, 3)} × prior mean ${ui.fmt(pm, 4)}${n ? ` + ${ui.fmt(1 - w, 3)} × $\\bar x$` : ''}, `
        + `and 95% credible interval <b>${ui.fmt(lo95, 3)}</b> to <b>${ui.fmt(hi95, 3)}</b>. The true rate is ${ui.fmt(lam, 3)}.`);
    }
    draw();
  },
};
