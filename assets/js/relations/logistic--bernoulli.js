// Logistic -> Bernoulli: the latent-variable form of logistic regression.
// A hidden score eta plus Logistic(0, 1) noise is compared with 0; the binary response Y = 1[eta + eps > 0]
// is Bernoulli with success probability sigmoid(eta). With N(0, 1) noise it is Bernoulli(Phi(eta)) (probit).
// Hand-written demo: the latent density with the area above 0 shaded and a draggable eta line; the Bernoulli
// probabilities with simulated frequencies; and the link function (sigmoid and Phi) with a marker at eta.
// Self-contained: computes everything with ctx.math.

import { getRelation } from '../catalog.js';

const REL = getRelation('logistic--bernoulli');

const sigmoid = z => (z >= 0 ? 1 / (1 + Math.exp(-z)) : Math.exp(z) / (1 + Math.exp(z)));
const logisticPdf = x => { const e = Math.exp(-Math.abs(x)); return e / ((1 + e) * (1 + e)); };
const f4 = v => String(Number(v.toPrecision(4))).replace(/^-/, '−');

export default {
  id: 'logistic--bernoulli',
  from: 'logistic',
  to: 'bernoulli',
  title: 'A hidden score with logistic noise, cut at zero, gives a Bernoulli response with the logistic probability',

  summary: 'If a hidden score $\\eta$ plus standard logistic noise is compared with zero, the resulting yes/no response is Bernoulli with success probability $1/(1 + e^{-\\eta})$, the logistic (sigmoid) function of $\\eta$. This is the latent-variable form of logistic regression.',

  plain: [
    'Logistic regression can be written as a latent-variable (threshold) model. Each observation has a hidden continuous score $\\eta$, for example a linear combination of predictors. Random noise $\\varepsilon$ from the standard logistic distribution is added, and the binary response $Y$ is 1 when the noisy score $\\eta + \\varepsilon$ is above zero and 0 otherwise. The response is then a Bernoulli variable whose success probability is the logistic (sigmoid) function of the score, $1/(1 + e^{-\\eta})$.',
    'The log-odds of a 1 are then exactly $\\eta$, which is why logistic regression models the log-odds as a linear function of the predictors (the logit link). If the noise is standard normal instead, the success probability is $\\Phi(\\eta)$ and the model is probit regression. Standard logistic noise has standard deviation $\\pi/\\sqrt3 \\approx 1.81$, so with the same $\\eta$ the logit curve is flatter than the probit curve. Once the scores are rescaled the two curves are almost the same, $1/(1 + e^{-\\eta}) \\approx \\Phi(\\eta/1.702)$; the logistic one has slightly heavier tails.',
  ],

  statementTex: REL.statement,
  glossary: [
    { sym: '\\varepsilon', meaning: 'Random noise added to the hidden score. In the logit model it has the standard logistic distribution; in the probit model the standard normal distribution.' },
    { sym: '\\mathrm{Logistic}(0,1)', meaning: 'The standard logistic distribution, with location 0 and scale 1 (mean 0, standard deviation $\\pi/\\sqrt3 \\approx 1.81$).' },
    { sym: '\\eta', meaning: 'The hidden (latent) score, a fixed real number. In regression it is the linear predictor $\\eta = \\beta_0 + \\beta_1 x_1 + \\dots$.' },
    { sym: '\\mathbb 1[\\eta + \\varepsilon > 0]', meaning: 'The indicator: 1 if the noisy score $\\eta + \\varepsilon$ is positive, 0 otherwise.' },
    { sym: 'Y', meaning: 'The observed binary response (0 or 1).' },
    { sym: '\\Rightarrow', meaning: 'Implies.' },
    { sym: '\\mathrm{Bernoulli}(p)', meaning: 'The distribution of a single yes/no outcome that equals 1 with probability $p$ and 0 with probability $1 - p$.' },
    { sym: '\\tfrac{1}{1 + e^{-\\eta}}', meaning: 'The logistic (sigmoid) function of $\\eta$, a probability between 0 and 1. It is the CDF of the standard logistic distribution evaluated at $\\eta$.' },
    { sym: 'e', meaning: 'The base of natural logarithms, $e \\approx 2.71828$.' },
    { sym: '\\mathcal N(0,1)', meaning: 'The standard normal distribution, the noise distribution of the probit model.' },
    { sym: '\\Phi(\\eta)', meaning: 'The standard normal CDF at $\\eta$: the success probability in the probit model.' },
  ],

  why: [
    'The response is 1 exactly when $\\varepsilon > -\\eta$. If $F$ is the CDF of the noise, then',
    { tex: 'P(Y = 1) = P(\\varepsilon > -\\eta) = 1 - F(-\\eta) = F(\\eta),' },
    'where the last step uses the symmetry of the noise distribution about 0. For standard logistic noise $F(\\eta) = 1/(1 + e^{-\\eta})$; for standard normal noise $F = \\Phi$. A variable that takes only the values 0 and 1 is always Bernoulli, so $Y \\sim \\mathrm{Bernoulli}(F(\\eta))$.',
    'Solving $p = 1/(1 + e^{-\\eta})$ for $\\eta$ gives $\\eta = \\ln[p/(1 - p)]$: the hidden score is the log-odds of a 1. With $\\eta_i = \\mathbf x_i^\\top \\boldsymbol\\beta$ for observation $i$, this is the logistic regression model $\\operatorname{logit} P(Y_i = 1) = \\mathbf x_i^\\top \\boldsymbol\\beta$. Each coefficient is the change in log-odds per unit change of its predictor.',
    'The scale of the noise cannot be learned from binary data: multiplying $\\eta$ and $\\varepsilon$ by the same positive number does not change $Y$. Fixing the noise to the standard logistic (standard deviation $\\pi/\\sqrt3 \\approx 1.81$) or to the standard normal (standard deviation 1) sets the units of the coefficients. This is why logit coefficients are about 1.6 to 1.8 times as large as probit coefficients fitted to the same data, and why the logistic CDF is close to $\\Phi(\\eta/1.702)$.',
    'The same threshold idea gives the ordered logit model (several cut points on the hidden scale), the psychometric function in signal detection and psychophysics (the hidden score is the internal evidence), and the logit choice rule: if the noise is the difference of two independent standard Gumbel variables, it is standard logistic, and $Y$ records which of two options has the larger noisy value.',
  ],

  references: [
    { text: 'Wikipedia: Logistic regression, as a latent-variable model.', url: 'https://en.wikipedia.org/wiki/Logistic_regression#As_a_latent-variable_model' },
    { text: 'Wikipedia: Probit model.', url: 'https://en.wikipedia.org/wiki/Probit_model' },
    { text: 'Agresti, A. (2013). <i>Categorical Data Analysis</i> (3rd ed.), Sections 4.2 and 5.1. Wiley.' },
    { text: 'Gelman, A., Hill, J., & Vehtari, A. (2020). <i>Regression and Other Stories</i>, Chapters 13–15. Cambridge University Press.', url: 'https://avehtari.github.io/ROS-Examples/' },
    { text: 'Train, K. E. (2009). <i>Discrete Choice Methods with Simulation</i> (2nd ed.), Chapters 3 and 5. Cambridge University Press.', url: 'https://eml.berkeley.edu/books/choice2.html' },
  ],

  demo(container, ctx) {
    const { math, plot, ui } = ctx;
    const { h } = ui;
    const params = [
      { key: 'eta', sym: '\\eta', name: 'hidden score', meaning: 'The latent score $\\eta$ (in regression, the linear predictor). It is also the log-odds of $Y = 1$ under logistic noise.', min: -6, max: 6, default: 0.8 },
    ];
    const SIZES = [100, 1000, 10000];
    const store = ui.createStore({ eta: 0.8, noise: 'logistic', size: 1000, seed: 1 });

    const latentBox = h('div', { 'data-role': 'main-plot' }), bernBox = h('div', { 'data-role': 'main-plot' }), linkBox = h('div');
    const readout = h('p', { class: 'demo-readout', 'aria-live': 'polite' });
    const controls = h('div', { class: 'demo-controls' });
    const noiseCtl = ui.segmented([
      { value: 'logistic', label: 'Logistic noise (logit)' },
      { value: 'normal', label: 'Normal noise (probit)' },
    ], 'logistic', v => store.set({ noise: v }), 'Distribution of the noise ε');
    const capLatent = h('figcaption', {}), capBern = h('figcaption', {}), capLink = h('figcaption', {});
    // the plots come first, so that they are visible on a laptop screen; the intro text follows the controls
    container.append(
      h('div', { class: 'demo-grid' },
        h('figure', { class: 'plot-fig' }, capLatent, latentBox),
        h('figure', { class: 'plot-fig' }, capBern, bernBox)),
      readout,
      controls,
      ui.rich('p', 'The hidden score $\\eta$ plus noise $\\varepsilon$ is compared with 0. Drag the amber line to move $\\eta$; the shaded area above 0 is the probability that $Y = 1$. Switch the noise between logistic and normal to compare the logit and probit models.', { class: 'small muted demo-intro' }),
      h('figure', { class: 'plot-fig', style: 'margin-top:1.2rem' }, capLink, linkBox));
    ui.renderRich(capLatent, 'Density of the noisy score $\\eta + \\varepsilon$');
    ui.renderRich(capBern, 'The response $Y$: exact probabilities (stems) and simulated (bars)');
    ui.renderRich(capLink, 'The link between score and probability: $P(Y = 1)$ as a function of $\\eta$. The small dots show the normal CDF with $\\eta$ divided by 1.702, $\\Phi(\\eta/1.702)$, which almost coincides with the logistic curve.');

    const panel = ui.paramPanel(controls, params, {
      get: () => store.get(),
      apply: (k, v) => store.set({ [k]: v }),
      onReset: () => store.set({ eta: 0.8 }),
    });
    const sizeCtl = ui.segmented(SIZES.map(n => ({ value: n, label: `${n.toLocaleString('en-US')} trials` })), 1000,
      v => store.set({ size: v }), 'Number of simulated trials');
    const again = h('button', { type: 'button', class: 'btn small-btn' }, 'Draw new samples');
    again.addEventListener('click', () => store.set({ seed: store.get().seed + 1 }));
    controls.append(h('div', { class: 'demo-sim-ctl' }, h('h3', { class: 'mini-title' }, 'Noise'), noiseCtl.el));
    controls.append(h('div', { class: 'demo-sim-ctl' }, h('h3', { class: 'mini-title' }, 'Simulation'), sizeCtl.el, h('div', {}, again)));

    const latentPlot = new plot.Plot(latentBox, { xLabel: 'noisy score η + ε', yLabel: 'density', height: (w, H) => plot.fitHeight(w, H, { ratio: 0.62, phoneRatio: 0.7, min: 220, max: 400 }) });
    const bernPlot = new plot.Plot(bernBox, { xLabel: 'response y', yLabel: 'probability', height: (w, H) => plot.fitHeight(w, H, { ratio: 0.62, phoneRatio: 0.7, min: 220, max: 400 }) });
    const linkPlot = new plot.Plot(linkBox, { xLabel: 'hidden score η', yLabel: 'P(Y = 1)', height: w => Math.max(220, Math.min(300, w * 0.36)) });

    const noisePdf = (x, noise) => (noise === 'logistic' ? logisticPdf(x) : math.normalPdf(x));
    const noiseCdf = (x, noise) => (noise === 'logistic' ? sigmoid(x) : math.normalCdf(x));
    const clampEta = v => Math.max(-6, Math.min(6, Math.round(v * 100) / 100));

    let cache = { key: '', k: 0 };
    function simulate(s) {
      const key = [s.eta, s.noise, s.size, s.seed].join('|');
      if (cache.key !== key) {
        const rng = math.makeRng(300 + s.seed);
        let k = 0;
        for (let i = 0; i < s.size; i++) {
          const e = s.noise === 'logistic' ? rng.logistic(0, 1) : rng.normal(0, 1);
          if (s.eta + e > 0) k++;
        }
        cache = { key, k };
      }
      return cache.k;
    }

    let raf = 0;
    const request = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; draw(); }); };
    store.subscribe(() => { panel.update(store.get()); noiseCtl.set(store.get().noise); request(); });

    const etaHandle = (x, label, extra = {}) => ({
      id: 'eta', type: 'vline', x, label,
      ariaLabel: 'Hidden score η. Drag left or right, or use the arrow keys.',
      valueText: f4(store.get().eta), valueNow: store.get().eta, valueMin: -6, valueMax: 6,
      onDrag: pt => { if (pt) store.set({ eta: clampEta(pt.x) }); },
      onKey: steps => store.set({ eta: clampEta(store.get().eta + 0.05 * steps) }),
      ...extra,
    });

    function draw() {
      const s = store.get();
      const { eta, noise } = s;
      const other = noise === 'logistic' ? 'normal' : 'logistic';
      const p1 = noiseCdf(eta, noise);
      const k = simulate(s), freq = k / s.size;

      // 1. latent density with the area above the threshold 0
      const X = [-9, 9];
      const f = x => noisePdf(x - eta, noise);
      const labelX = eta > 2.4 ? eta - 1.6 : Math.max(1.2, eta + 1.6);
      latentPlot.render({
        x: X, y: [0, 0.46],
        layers: [
          { id: 'fill', type: 'area', points: plot.sampleFn(f, X[0], X[1], 300), cls: 'pdf-fill' },
          { id: 'shade', type: 'area', points: plot.sampleFn(f, 0, X[1], 220), cls: 'area-shade' },
          { id: 'other', type: 'line', points: plot.sampleFn(x => noisePdf(x - eta, other), X[0], X[1], 300), cls: 'curve-ref' },
          { id: 'curve', type: 'line', points: plot.sampleFn(f, X[0], X[1], 300), cls: 'curve-main' },
          { id: 'thr', type: 'segment', x1: 0, y1: 0, x2: 0, y2: 0.44, cls: 'mean-line' },
          { id: 'thr-l', type: 'text', x: 0, y: 0.44, dx: -5, dy: 2, anchor: 'end', text: 'threshold 0', cls: 'label' },
          // the label sits to the right of the peak, or to its left when the peak is near the right edge
          { id: 'p-l', type: 'text', x: labelX, y: Math.min(0.3, f(labelX) + 0.04), anchor: eta > 2.4 ? 'end' : 'start', text: `P(Y = 1) = ${p1.toFixed(3)}`, cls: 'label' },
        ],
        handles: [etaHandle(eta, 'η')],
        legend: [
          { label: noise === 'logistic' ? 'η + logistic noise' : 'η + normal noise', cls: 'curve-main' },
          { label: other === 'logistic' ? 'η + logistic noise (for comparison)' : 'η + normal noise (for comparison)', cls: 'curve-ref' },
          { label: 'area above 0 = P(Y = 1)', cls: 'area-shade' },
        ],
      });

      // 2. the Bernoulli response
      bernPlot.render({
        x: [-0.7, 1.7], y: [0, 1.08], discreteX: true,
        layers: [
          { id: 'freq', type: 'bars', points: [[0, 1 - freq], [1, freq]], width: 0.5, cls: 'bars-strong' },
          { id: 'pmf', type: 'stems', points: [[0, 1 - p1], [1, p1]], cls: 'pmf' },
          { id: 'l1', type: 'text', x: 1, y: Math.max(p1, freq), dy: -10, text: p1.toFixed(3), cls: 'label' },
          { id: 'l0', type: 'text', x: 0, y: Math.max(1 - p1, 1 - freq), dy: -10, text: (1 - p1).toFixed(3), cls: 'label' },
        ],
        legend: [
          { label: `Bernoulli(${p1.toFixed(3)})`, cls: 'pmf' },
          { label: `${s.size.toLocaleString('en-US')} simulated trials`, cls: 'bars-strong' },
        ],
      });

      // 3. the link function
      const E = [-6.5, 6.5];
      linkPlot.render({
        x: E, y: [-0.02, 1.06],
        layers: [
          { id: 'half', type: 'hline', y: 0.5, cls: 'ref-line' },
          { id: 'other', type: 'line', points: plot.sampleFn(x => noiseCdf(x, other), E[0], E[1], 300), cls: 'curve-ref' },
          { id: 'main', type: 'line', points: plot.sampleFn(x => noiseCdf(x, noise), E[0], E[1], 300), cls: 'curve-main' },
          ...math.linspace(-6, 6, 25).map((x, i) => ({ id: 'sc' + i, type: 'dot', x, y: math.normalCdf(x / 1.702), r: 2.4 })),
          { id: 'g', type: 'segment', x1: E[0], y1: p1, x2: eta, y2: p1, cls: 'guide' },
          { id: 'sim', type: 'dot', x: eta, y: freq, r: 3.5 },
          { id: 'now', type: 'dot', x: eta, y: p1, r: 5, cls: 'marker' },
        ],
        handles: [{ ...etaHandle(eta, 'η'), id: 'eta-link', type: 'xPoint', lineTo: p1 }],
        legend: [
          { label: noise === 'logistic' ? 'logistic: 1/(1 + e^(−η))' : 'probit: Φ(η)', cls: 'curve-main' },
          { label: other === 'logistic' ? 'logistic: 1/(1 + e^(−η))' : 'probit: Φ(η)', cls: 'curve-ref' },
        ],
      });

      const logOdds = Math.log(p1) - Math.log1p(-p1);
      let html = `$P(Y = 1) = P(\\eta + \\varepsilon > 0)$ = <b>${ui.fmt(p1, 4)}</b>`
        + (noise === 'logistic' ? ` $= 1/(1 + e^{-\\eta})$.` : ` $= \\Phi(\\eta)$.`)
        + ` In ${s.size.toLocaleString('en-US')} simulated trials, $Y = 1$ occurred <b>${k.toLocaleString('en-US')}</b> times (proportion ${freq.toFixed(3)}). `
        + `The log-odds $\\ln[p/(1-p)]$ is <b>${f4(logOdds)}</b>`
        + (noise === 'logistic' ? ', exactly $\\eta$: the logit link.' : `, not equal to $\\eta$ = ${f4(eta)}; under normal noise it is the probit $\\Phi^{-1}(p)$ that equals $\\eta$.`);
      ui.renderRich(readout, html);
    }
    draw();
  },
};
