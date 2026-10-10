// Student t -> Cauchy: t_1 is the standard Cauchy distribution; x0 + gamma T ~ Cauchy(x0, gamma) for T ~ t_1.
// The demo compares t_nu with Cauchy(0, 1) (they coincide at nu = 1) and shows that running means of
// t_1 draws never settle down. It is self-contained: densities and CDFs are computed here.

import { getRelation } from '../catalog.js';
import { lgamma, betaI, betaIc, makeRng, solveMonotone, PI } from '../core/math.js';

const REL = getRelation('student-t--cauchy');

const tPdf = (x, nu) => Math.exp(lgamma((nu + 1) / 2) - lgamma(nu / 2) - 0.5 * Math.log(nu * PI) - (nu + 1) / 2 * Math.log1p(x * x / nu));
function tUpper(x, nu) {
  const x2 = x * x;
  if (!Number.isFinite(x2)) return 0;
  return x2 < nu ? 0.5 * betaIc(x2 / (nu + x2), 0.5, nu / 2) : 0.5 * betaI(nu / (nu + x2), nu / 2, 0.5);
}
const tCdf = (x, nu) => (x === 0 ? 0.5 : x < 0 ? tUpper(x, nu) : 1 - tUpper(x, nu));
const cauchyPdf = x => 1 / (PI * (1 + x * x));
const cauchyCdf = x => 0.5 + Math.atan(x) / PI;
const f3 = v => String(Number(v.toPrecision(4)));

export default {
  id: 'student-t--cauchy',
  from: 'student-t',
  to: 'cauchy',
  title: 'Student’s t with one degree of freedom is the standard Cauchy distribution',

  plain: [
    'When the degrees of freedom are $\\nu = 1$, Student’s $t$ density becomes $1/[\\pi(1 + x^2)]$, the density of the standard Cauchy distribution. Shifting and stretching it gives the whole Cauchy family: $x_0 + \\gamma T$ has a Cauchy distribution with location $x_0$ and scale $\\gamma$.',
    'One degree of freedom means that the standard deviation in the denominator of $T = Z/\\sqrt{V/\\nu}$ is estimated from a single squared normal value, so it is fairly often close to 0, and the ratio is then huge. The tails are then so heavy that the Cauchy distribution has no mean and no variance, and averaging Cauchy draws does not make the average settle down. For $\\nu > 1$ the $t$ distribution has a mean, and for $\\nu > 2$ a variance.',
  ],

  statementTex: REL.statement,
  glossary: [
    { sym: 't_1', meaning: 'Student’s $t$ distribution with one degree of freedom ($\\nu = 1$).' },
    { sym: '\\mathrm{Cauchy}(x_0, \\gamma)', meaning: 'The Cauchy distribution with location $x_0$ and scale $\\gamma$, density $\\gamma/[\\pi(\\gamma^2 + (x - x_0)^2)]$.' },
    { sym: '\\mathrm{Cauchy}(0,1)', meaning: 'The standard Cauchy distribution, density $1/[\\pi(1 + x^2)]$, centered at 0 with scale 1.' },
    { sym: 'x_0', meaning: 'The location: the median and mode of the Cauchy distribution (it has no mean).' },
    { sym: '\\gamma', meaning: 'The scale: half the width of the density at half its maximum height, and also half the interquartile range.' },
    { sym: 'T', meaning: 'A random variable with the $t_1$ distribution.' },
    { sym: 'x_0 + \\gamma T', meaning: '$T$ shifted by $x_0$ and stretched by the factor $\\gamma$.' },
  ],

  why: [
    'Put $\\nu = 1$ in the $t$ density. With $\\Gamma(1) = 1$ and $\\Gamma(\\tfrac12) = \\sqrt\\pi$,',
    { tex: 'f(x \\mid 1) = \\frac{\\Gamma(1)}{\\sqrt{\\pi}\\,\\Gamma(\\frac12)} (1 + x^2)^{-1} = \\frac{1}{\\pi(1 + x^2)},' },
    'the standard Cauchy density. If $T$ has density $f$, then $Y = x_0 + \\gamma T$ has density $f((y - x_0)/\\gamma)/\\gamma = \\gamma/[\\pi(\\gamma^2 + (y - x_0)^2)]$, the $\\mathrm{Cauchy}(x_0, \\gamma)$ density.',
    'The same fact can be seen from the construction $T = Z/\\sqrt{V}$ with $V \\sim \\chi^2_1$: since $V$ is the square of a standard normal $Z\'$, $\\sqrt V = |Z\'|$, and $T$ has the same distribution as $Z/Z\'$, the ratio of two independent standard normals, which is a classical way to define the Cauchy distribution.',
    'No mean: $\\mathrm{E}|T| = \\int |x|/[\\pi(1 + x^2)]\\,dx$ grows like $\\log$ of the integration limit and is infinite. The characteristic function is $e^{-|s|}$, so the average of $n$ independent draws has characteristic function $(e^{-|s|/n})^n = e^{-|s|}$: the sample mean of Cauchy draws has the same Cauchy distribution as a single draw, no matter how large $n$ is. The law of large numbers does not apply.',
  ],

  references: [
    { text: 'Wikipedia: Cauchy distribution.', url: 'https://en.wikipedia.org/wiki/Cauchy_distribution' },
    { text: 'Wikipedia: Student’s t-distribution, special cases.', url: 'https://en.wikipedia.org/wiki/Student%27s_t-distribution#Special_cases' },
    { text: 'Casella, G., & Berger, R. L. (2002). <i>Statistical Inference</i> (2nd ed.), Sections 2.2 and 5.3. Duxbury.' },
    { text: 'Johnson, N. L., Kotz, S., & Balakrishnan, N. (1994). <i>Continuous Univariate Distributions</i>, Vol. 1 (2nd ed.), Chapter 16. Wiley.' },
    { text: 'Leemis, L. M., & McQueston, J. T. (2008). Univariate distribution relationships. <i>The American Statistician</i>, 62(1), 45–53.', url: 'https://doi.org/10.1198/000313008X270448' },
  ],

  demo(container, ctx) {
    const { ui } = ctx;
    const { h } = ui;
    const boxes = { compare: h('div'), mean: h('div', { hidden: true }) };
    const built = {};
    const show = v => {
      for (const k in boxes) boxes[k].hidden = k !== v;
      if (!built[v]) { built[v] = true; (v === 'compare' ? compareView : runningMeanView)(boxes[v], ctx); }
    };
    const seg = ui.segmented([
      { value: 'compare', label: 'Densities: t with ν = 1 is Cauchy' },
      { value: 'mean', label: 'Running means: no law of large numbers' },
    ], 'compare', show, 'Which view to show');
    container.append(h('div', { style: 'margin-bottom:.6rem' }, seg.el), boxes.compare, boxes.mean);
    show('compare');
  },
};

function compareView(box, { demos, ui }) {
  const { h } = ui;
  let dragging = false;
  const cmp = demos.compareDemo(box, null, {
    intro: 'The solid curve is the $t_\\nu$ density and the dashed curve the standard Cauchy density. Drag the amber arrow at the peak (or use the box) to change $\\nu$. The two curves coincide, and the CDF gap is 0, exactly when $\\nu = 1$. For $\\nu > 1$ the $t$ distribution has a higher peak and lighter tails.',
    params: [
      { key: 'nu', sym: '\\nu', name: 'degrees of freedom', meaning: 'Degrees of freedom of the $t$ distribution.', min: 0.3, max: 30, default: 4, log: true },
    ],
    exact: { name: ({ nu }) => `Student's t, ν = ${ui.fmt(nu, 3)}`, pdf: (x, { nu }) => tPdf(x, nu), cdf: (x, { nu }) => tCdf(x, nu) },
    approx: { name: () => 'Cauchy(0, 1)', pdf: x => cauchyPdf(x), cdf: x => cauchyCdf(x) },
    range: () => [-8, 8],
    xLabel: 'x',
    handles: ({ nu }, set) => [{
      id: 'nu', type: 'vArrow', from: { x: 0, y: 0 }, to: { x: 0, y: tPdf(0, nu) }, label: 'ν',
      ariaLabel: 'Degrees of freedom ν, set by the height of the peak. Drag up or down, or use the arrow keys.',
      valueText: ui.fmt(nu, 3), valueNow: nu, valueMin: 0.3, valueMax: 30,
      onDrag: (pt, phase) => {
        if (phase === 'start') dragging = true;
        if (pt && dragging) {
          const v = solveMonotone(n => tPdf(0, n), pt.y, 0.3, 30, { log: true });
          // snap to 1 near 1 so that the coincidence is easy to hit
          if (Number.isFinite(v)) set({ nu: Math.abs(v - 1) < 0.04 ? 1 : Number(v.toPrecision(3)) });
        }
        if (phase === 'end') dragging = false;
      },
      onKey: steps => set({ nu: Number(Math.min(30, Math.max(0.3, nu * Math.pow(1.1, steps))).toPrecision(3)) }),
    }],
    readout: ({ nu }) => (Math.abs(nu - 1) < 1e-12 ? 'With $\\nu = 1$ the two distributions are identical. ' : `They coincide when $\\nu = 1$; now $\\nu$ = ${f3(nu)}. `)
      + `Probability beyond ±10: $t_\\nu$ <b>${ui.fmt(2 * tUpper(10, nu), 4)}</b>, Cauchy <b>${ui.fmt(2 * (1 - cauchyCdf(10)), 4)}</b>. Peak height: $t_\\nu$ ${f3(tPdf(0, nu))}, Cauchy $1/\\pi$ = 0.3183.`,
  });
  const btn = h('button', { type: 'button', class: 'btn small-btn' }, 'Set ν = 1');
  btn.addEventListener('click', () => cmp.set({ nu: 1 }));
  box.querySelector('.demo-controls').append(h('div', {}, btn));
}

/** Running means of t_nu draws: they settle near 0 when nu > 1 and keep jumping when nu <= 1. */
function runningMeanView(box, { plot, ui }) {
  const { h } = ui;
  const N = 2000, PATHS = 4;
  const params = [
    { key: 'nu', sym: '\\nu', name: 'degrees of freedom', meaning: 'Degrees of freedom of the $t$ distribution the draws come from ($\\nu = 1$ is Cauchy).', min: 0.5, max: 30, default: 1, log: true },
  ];
  const store = ui.createStore({ nu: 1, seed: 1 });
  const pBox = h('div');
  const readout = h('p', { class: 'demo-readout', 'aria-live': 'polite' });
  const controls = h('div', { class: 'demo-controls' });
  box.append(
    ui.rich('p', `Each line follows the average of the first $n$ draws from $t_\\nu$, for $n$ = 1 to ${N}, in ${PATHS} independent runs. For $\\nu > 1$ the mean exists (it is 0) and the averages settle toward it, slowly when $\\nu$ is close to 1. For $\\nu = 1$ (Cauchy) single huge draws keep throwing the averages off, however many draws have been made.`, { class: 'small muted demo-intro' }),
    h('figure', { class: 'plot-fig' }, h('figcaption', {}, 'Running average of t draws'), pBox),
    readout, controls);
  const panel = ui.paramPanel(controls, params, {
    get: () => store.get(),
    apply: (k, v) => store.set({ [k]: v }),
    onReset: () => store.set({ nu: 1 }),
  });
  const again = h('button', { type: 'button', class: 'btn small-btn' }, 'Draw new samples');
  again.addEventListener('click', () => store.set({ seed: store.get().seed + 1 }));
  const one = h('button', { type: 'button', class: 'btn small-btn' }, 'Set ν = 1 (Cauchy)');
  one.addEventListener('click', () => store.set({ nu: 1 }));
  controls.append(h('div', { style: 'display:flex;gap:.6rem;flex-wrap:wrap' }, one, again));
  const P = new plot.Plot(pBox, { xLabel: 'number of draws n', yLabel: 'running average', height: w => Math.max(220, Math.min(320, w * 0.4)) });

  let raf = 0;
  const request = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; draw(); }); };
  store.subscribe(() => { panel.update(store.get()); request(); });

  function draw() {
    const { nu, seed } = store.get();
    const rng = makeRng(500 + seed);
    const layers = [{ id: 'zero', type: 'hline', y: 0, cls: 'ref-line' }];
    const finals = [];
    for (let r = 0; r < PATHS; r++) {
      let s = 0;
      const pts = [];
      for (let n = 1; n <= N; n++) {
        s += rng.studentT(nu);
        const m = s / n;
        // thin the points after the start (the line still shows every jump of the first draws)
        if (n <= 200 || n % 4 === 0) pts.push([n, Math.max(-50, Math.min(50, m))]);
      }
      finals.push(s / N);
      layers.push({ id: 'path' + r, type: 'line', points: pts, cls: r === 0 ? 'curve-main' : 'curve-2 curve-thin' });
    }
    P.render({ x: [0, N], y: [-4, 4], layers });
    const html = `Average after ${N} draws in the ${PATHS} runs: ${finals.map(v => `<b>${ui.fmt(v, 3)}</b>`).join(', ')}. `
      + (nu > 2 ? `With $\\nu$ = ${f3(nu)} the standard deviation of a single draw is ${f3(Math.sqrt(nu / (nu - 2)))}, so the average of ${N} draws has standard deviation about ${f3(Math.sqrt(nu / (nu - 2) / N))}.`
        : nu > 1 ? `With $\\nu$ = ${f3(nu)} the mean is 0 but the variance is infinite, so the averages converge only slowly.`
          : nu === 1 ? `With $\\nu = 1$ the mean does not exist, and the average of ${N} draws has the same Cauchy distribution as a single draw.`
            : `With $\\nu$ = ${f3(nu)} the mean does not exist, and the average of ${N} draws is even more spread out than a single draw.`);
    ui.renderRich(readout, html);
  }
  draw();
}
