// Gumbel -> Categorical: the Gumbel-max trick and random-utility choice. Adding independent Gumbel noise to
// each option's value and choosing the largest gives softmax (categorical) choice probabilities.
// Hand-written demo: the Gumbel densities of the noisy values (drag the utilities and the noise scale), one
// simulated trial drawn as dots, and the choice frequencies of many trials against the softmax probabilities.

import { getRelation } from '../catalog.js';

const REL = getRelation('gumbel--categorical');
const SUB = d => String(d).split('').map(c => '₀₁₂₃₄₅₆₇₈₉'[+c]).join('');
const U_LIM = 5, B_MIN = 0.1, B_MAX = 5, TRIALS = 5000;

const gumbelPdf = (x, mu, b) => { const z = (x - mu) / b; return Math.exp(-(z + Math.exp(-z))) / b; };
const softmax = (u, b) => { const m = Math.max(...u); const e = u.map(v => Math.exp((v - m) / b)); const s = e.reduce((a, c) => a + c, 0); return e.map(v => v / s); };
const defaultU = K => Array.from({ length: K }, (_, i) => Math.round((i * 2 / Math.max(1, K - 1)) * 10) / 10);

export default {
  id: 'gumbel--categorical',
  from: 'gumbel',
  to: 'categorical',
  title: 'Choosing the option with the largest Gumbel-perturbed value gives softmax (categorical) choice probabilities',

  plain: [
    'Suppose each of $K$ options has a value $u_j$ (a utility, an expected reward or a score), and on every occasion each value is perturbed by independent random noise $G_j$ before the largest perturbed value $u_j + G_j$ is chosen. Which option wins is random, so the choice has a categorical distribution. When the noise has a Gumbel distribution with scale $\\beta$, the choice probabilities have an exact and simple form: they are the softmax of the values, $p_j = e^{u_j/\\beta} / \\sum_i e^{u_i/\\beta}$.',
    'The Gumbel scale $\\beta$ plays the role of the softmax temperature. Little noise (small $\\beta$) means the best option is almost always chosen; a lot of noise (large $\\beta$) makes the choice nearly random. This is the random-utility derivation of the multinomial logit model of choice (McFadden), the link between Luce’s choice rule and noisy maximization, and the basis of the softmax choice rule in reinforcement-learning models. Read the other way, it gives the Gumbel-max trick: to draw from any categorical distribution $\\mathbf p$, add standard Gumbel noise to $\\ln p_j$ and take the largest.',
  ],

  statementTex: REL.statement,
  glossary: [
    { sym: 'G_1, \\dots, G_K', meaning: 'Independent noise terms, one for each of the $K$ options.' },
    { sym: '\\overset{iid}{\\sim}', meaning: 'Independent and identically distributed.' },
    { sym: '\\mathrm{Gumbel}(0, 1)', meaning: 'The standard Gumbel (maximum) distribution, with location 0 and scale 1. A standard Gumbel value can be made from a uniform $U$ as $-\\ln(-\\ln U)$.' },
    { sym: '\\mathrm{Gumbel}(0, \\beta)', meaning: 'The Gumbel distribution with location 0 and scale $\\beta$; its values are $\\beta$ times standard Gumbel values.' },
    { sym: '\\beta', meaning: 'The scale of the Gumbel noise, a positive number. It acts as the softmax temperature.' },
    { sym: '\\arg\\max_j', meaning: 'The index $j$ at which the expression is largest: the option that is chosen.' },
    { sym: '\\ln p_j', meaning: 'The natural logarithm of the probability of category $j$, used as that option’s value in the Gumbel-max trick.' },
    { sym: '\\mathrm{Categorical}(\\mathbf p)', meaning: 'A single choice among $K$ options, with option $j$ chosen with probability $p_j$.' },
    { sym: 'u_j', meaning: 'The value (utility) of option $j$, any real number.' },
    { sym: 'e', meaning: 'The base of natural logarithms, $e \\approx 2.718$.' },
    { sym: '\\frac{e^{u_j/\\beta}}{\\sum_i e^{u_i/\\beta}}', meaning: 'The softmax of the values: positive numbers that add up to 1, larger for larger $u_j$.' },
  ],

  why: [
    'The standard Gumbel distribution has CDF $F(g) = \\exp(-e^{-g})$ and density $f(g) = e^{-g}\\exp(-e^{-g})$. Option $j$ wins when its perturbed value $v_j + G_j$ is larger than every other one, where $v_i = u_i/\\beta$ (dividing everything by $\\beta$ does not change which is largest, and turns $\\mathrm{Gumbel}(0, \\beta)$ noise into standard Gumbel noise). Conditioning on $G_j = g$ and using independence,',
    { tex: 'P(j \\text{ wins}) = \\int_{-\\infty}^{\\infty} f(g) \\prod_{i \\ne j} F(v_j + g - v_i)\\, dg = \\int_{-\\infty}^{\\infty} e^{-g} \\exp\\!\\Big(-e^{-g} \\sum_{i} e^{v_i - v_j}\\Big)\\, dg.' },
    'The product of the $F$ terms and the factor $\\exp(-e^{-g})$ from the density combine because $F$ is an exponential of an exponential. Writing $S = \\sum_i e^{v_i - v_j}$ and substituting $t = e^{-g}$ turns the integral into $\\int_0^\\infty e^{-St}\\,dt = 1/S$, so',
    { tex: 'P(j \\text{ wins}) = \\frac{1}{\\sum_i e^{v_i - v_j}} = \\frac{e^{v_j}}{\\sum_i e^{v_i}} = \\frac{e^{u_j/\\beta}}{\\sum_i e^{u_i/\\beta}}.' },
    'With $v_j = \\ln p_j$ the softmax returns $p_j$ itself, which is the Gumbel-max trick. A related fact explains why the result is so tidy: the maximum of independent Gumbel variables with the same scale is again Gumbel, with location $\\beta \\ln \\sum_i e^{u_i/\\beta}$ (the “log-sum-exp”, which economists call the inclusive value). Only the differences between the values matter, and the difference of two independent Gumbel variables is logistic, which is why the two-option version of this model is logistic regression.',
  ],

  references: [
    { text: 'Wikipedia: Gumbel distribution, applications (Gumbel-max trick).', url: 'https://en.wikipedia.org/wiki/Gumbel_distribution' },
    { text: 'Wikipedia: Softmax function.', url: 'https://en.wikipedia.org/wiki/Softmax_function' },
    { text: 'McFadden, D. (1974). Conditional logit analysis of qualitative choice behavior. In P. Zarembka (Ed.), <i>Frontiers in Econometrics</i> (pp. 105–142). Academic Press.' },
    { text: 'Luce, R. D. (1959). <i>Individual Choice Behavior: A Theoretical Analysis</i>. Wiley.' },
    { text: 'Train, K. E. (2009). <i>Discrete Choice Methods with Simulation</i> (2nd ed.), Chapter 3 (logit). Cambridge University Press.', url: 'https://eml.berkeley.edu/books/choice2.html' },
    { text: 'Maddison, C. J., Tarlow, D., & Minka, T. (2014). A* sampling. <i>Advances in Neural Information Processing Systems</i>, 27.' },
    { text: 'Jang, E., Gu, S., & Poole, B. (2017). Categorical reparameterization with Gumbel-softmax. <i>International Conference on Learning Representations</i>.', url: 'https://arxiv.org/abs/1611.01144' },
  ],

  demo(container, { math, plot, ui }) {
    const { h } = ui;
    const params = [
      { key: 'K', sym: 'K', name: 'number of options', meaning: 'How many options compete. Changing it resets the values.', min: 2, max: 5, default: 3, integer: true },
      { key: 'beta', sym: '\\beta', name: 'noise scale (temperature)', meaning: 'The scale of the Gumbel noise added to every value; it is the softmax temperature.', min: B_MIN, max: B_MAX, default: 1, log: true },
    ];
    const store = ui.createStore({ K: 3, beta: 1, u: defaultU(3), seed: 1, trial: 1 });

    const noiseBox = h('div'), choiceBox = h('div');
    const trialLine = h('p', { class: 'small', style: 'margin:.4rem 0 0' });
    const readout = h('p', { class: 'demo-readout', 'aria-live': 'polite' });
    const controls = h('div', { class: 'demo-controls' });
    container.append(
      ui.rich('p', 'Left: the density of each option’s noisy value $u_j + G_j$, a Gumbel distribution with mode $u_j$ and scale $\\beta$. Drag the amber markers under the axis to change the values $u_j$, and the tip of the amber arrow (length $\\beta$, drawn on the option with the largest value) to change the amount of noise. The dots on the axis are one simulated trial: the option with the largest noisy value (amber) is chosen. Right: how often each option is chosen in many trials (bars), compared with the softmax probabilities (stems).', { class: 'small muted demo-intro' }),
      h('div', { class: 'demo-grid' },
        h('figure', { class: 'plot-fig' }, h('figcaption', {}, 'Noisy values: Gumbel densities and one trial'), noiseBox, trialLine),
        h('figure', { class: 'plot-fig' }, h('figcaption', {}, `Choices in ${TRIALS.toLocaleString('en-US')} trials and the softmax probabilities`), choiceBox)),
      readout, controls);

    const panel = ui.paramPanel(controls, params, {
      get: () => store.get(),
      apply: (k, v) => (k === 'K' ? store.set({ K: v, u: defaultU(v) }) : store.set({ [k]: v })),
      onReset: () => store.set({ K: 3, beta: 1, u: defaultU(3) }),
    });
    const one = h('button', { type: 'button', class: 'btn small-btn btn-amber' }, 'Run one trial');
    one.addEventListener('click', () => store.set({ trial: store.get().trial + 1 }));
    const again = h('button', { type: 'button', class: 'btn small-btn' }, 'Draw new samples');
    again.addEventListener('click', () => store.set({ seed: store.get().seed + 1 }));
    controls.append(h('div', { class: 'demo-sim-ctl' }, h('h3', { class: 'mini-title' }, 'Simulation'), h('div', { style: 'display:flex;flex-wrap:wrap;gap:.5rem' }, one, again)));

    const noisePlot = new plot.Plot(noiseBox, { xLabel: 'noisy value u + G', yLabel: 'density' });
    const choicePlot = new plot.Plot(choiceBox, { xLabel: 'option j', yLabel: 'probability' });

    let sim = { key: '' };
    function simulate(s) {
      const key = JSON.stringify([s.u, s.beta, s.seed]);
      if (sim.key !== key) {
        const rng = math.makeRng(77 + 13 * s.seed);
        const counts = new Array(s.K).fill(0);
        for (let t = 0; t < TRIALS; t++) {
          let best = -Infinity, arg = 0;
          for (let j = 0; j < s.K; j++) { const v = s.u[j] + rng.gumbel(0, s.beta); if (v > best) { best = v; arg = j; } }
          counts[arg]++;
        }
        sim = { key, freq: counts.map(c => c / TRIALS) };
      }
      return sim;
    }
    const oneTrial = s => {
      const rng = math.makeRng(9001 + 31 * s.trial);
      const g = s.u.map(() => rng.gumbel(0, 1));      // standard noise, scaled below so that dragging is smooth
      const v = s.u.map((u, j) => u + s.beta * g[j]);
      let arg = 0; v.forEach((x, j) => { if (x > v[arg]) arg = j; });
      return { v, arg };
    };

    let frozen = null, drag = null;
    let raf = 0;
    const request = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; draw(); }); };
    store.subscribe(() => { panel.update(store.get()); request(); });
    const freeze = (phase, xd) => { if (phase === 'start') frozen = xd; if (phase === 'end') { frozen = null; drag = null; request(); } };

    function draw() {
      const s = store.get();
      const { K, beta, u } = s;
      const lo0 = Math.min(...u) - 2.5 * beta, hi0 = Math.max(...u) + 5 * beta;
      const xd = frozen || [lo0, hi0];
      const peak = 1 / (beta * Math.E);
      const ymax = peak * 1.3;
      const cls = ['curve-main', 'curve-2', 'curve-ref', 'curve-main curve-thin', 'curve-2 curve-thin'];
      const layers = [];
      u.forEach((m, j) => {
        layers.push({ id: 'c' + j, type: 'line', points: plot.sampleFn(x => gumbelPdf(x, m, beta), xd[0], xd[1], 300), cls: cls[j] });
      });
      const tr = oneTrial(s);
      tr.v.forEach((x, j) => {
        layers.push({ id: 'v' + j, type: 'dot', x, y: ymax * 0.035, r: j === tr.arg ? 6 : 4, cls: j === tr.arg ? 'marker' : '' });
      });
      // the noise-scale arrow is drawn on the option with the largest value, from its mode u_j to u_j + beta,
      // on the right flank of its density, where no other curve's handle sits
      const jb = u.indexOf(Math.max(...u));
      const yb = gumbelPdf(u[jb] + beta, u[jb], beta);
      noisePlot.render({
        x: xd, y: [0, ymax], layers,
        legend: u.map((m, j) => ({ label: `option ${j + 1}: Gumbel(u${SUB(j + 1)} = ${ui.fmt(m, 3)}, β)`, cls: cls[j] })),
        handles: [
          ...u.map((m, j) => ({
            id: 'u' + j, type: 'xPoint', x: m, label: 'u' + SUB(j + 1),
            ariaLabel: `Value u${j + 1} of option ${j + 1}. Drag left or right, or use the arrow keys.`, valueText: ui.fmt(m, 3), valueNow: m, valueMin: -U_LIM, valueMax: U_LIM,
            onDrag: (pt, phase) => {
              freeze(phase, xd);
              if (pt) { const nu = store.get().u.slice(); nu[j] = math.roundTo(math.clamp(pt.x, -U_LIM, U_LIM), 0.05); store.set({ u: nu }); }
            },
            onKey: steps => { const nu = store.get().u.slice(); nu[j] = math.roundTo(math.clamp(nu[j] + 0.1 * steps, -U_LIM, U_LIM), 0.05); store.set({ u: nu }); },
          })),
          {
            id: 'beta', type: 'hArrow', from: { x: u[jb], y: yb }, to: { x: u[jb] + beta, y: yb }, label: 'β',
            ariaLabel: `Noise scale β (the softmax temperature), measured from the mode of option ${jb + 1}. Drag, or use the arrow keys.`, valueText: ui.fmt(beta, 3), valueNow: beta, valueMin: B_MIN, valueMax: B_MAX,
            onDrag: (pt, phase) => {
              if (phase === 'start') drag = { u0: u[jb] };
              freeze(phase, xd);
              if (pt && drag) store.set({ beta: Number(math.clamp(pt.x - drag.u0, B_MIN, B_MAX).toPrecision(3)) });
            },
            onKey: steps => store.set({ beta: Number(math.clamp(store.get().beta * Math.pow(1.05, steps), B_MIN, B_MAX).toPrecision(3)) }),
          },
        ],
      });
      ui.renderRich(trialLine, `One trial: noisy values ${tr.v.map((x, j) => (j === tr.arg ? `<b>${ui.fmt(x, 3)}</b>` : ui.fmt(x, 3))).join(', ')}; option <b>${tr.arg + 1}</b> has the largest and is chosen.`);

      const p = softmax(u, beta);
      const sm = simulate(s);
      choicePlot.render({
        x: [0.3, K + 0.7], y: [0, Math.min(1.08, Math.max(...p, ...sm.freq) * 1.18)], discreteX: true,
        layers: [
          { id: 'freq', type: 'bars', points: sm.freq.map((f, j) => [j + 1, f]), width: 0.56, cls: 'bars-strong' },
          { id: 'p', type: 'stems', points: p.map((q, j) => [j + 1, q]), cls: 'pmf' },
        ],
        legend: [{ label: 'chosen in simulated trials (largest u + G)', cls: 'bars-strong' }, { label: 'softmax probabilities', cls: 'curve-main' }],
      });
      const d = 0.5 * p.reduce((a, q, j) => a + Math.abs(q - sm.freq[j]), 0);
      ui.renderRich(readout,
        `Softmax probabilities $e^{u_j/\\beta}/\\sum_i e^{u_i/\\beta}$: (${p.map(q => ui.fmt(q, 3)).join(', ')}). `
        + `Simulated choice frequencies: (${sm.freq.map(q => ui.fmt(q, 3)).join(', ')}); total variation distance <b>${ui.fmt(d, 3)}</b>. Differences of the order of $1/\\sqrt{${TRIALS}} \\approx$ ${ui.fmt(1 / Math.sqrt(TRIALS), 2)} are expected from sampling noise alone. `
        + `With $\\beta$ = <b>${ui.fmt(beta, 3)}</b>, ` + (beta < 0.3 ? 'the noise is small and the option with the largest value is chosen almost always.' : beta > 2 ? 'the noise is large compared with the differences in value, so the choices are close to random.' : 'better options are chosen more often, but not always.'));
    }
    draw();
  },
};
