// Student t -> F: if T ~ t_nu then T^2 ~ F(1, nu). A two-sided t-test and the F-test with one numerator
// degree of freedom give the same p-value. The demo shows the two p-values side by side (custom demo)
// and simulates T^2 (simulationDemo). It is self-contained: densities and CDFs are computed here.

import { getRelation } from '../catalog.js';
import { lgamma, lbeta, betaI, betaIc, betaIinv, PI } from '../core/math.js';

const REL = getRelation('student-t--f');

const tPdf = (x, nu) => Math.exp(lgamma((nu + 1) / 2) - lgamma(nu / 2) - 0.5 * Math.log(nu * PI) - (nu + 1) / 2 * Math.log1p(x * x / nu));
/** P(T > |x|) */
function tUpper(x, nu) {
  const x2 = x * x;
  if (!Number.isFinite(x2)) return 0;
  return x2 < nu ? 0.5 * betaIc(x2 / (nu + x2), 0.5, nu / 2) : 0.5 * betaI(nu / (nu + x2), nu / 2, 0.5);
}
function tUpperQ(q, nu) {
  if (q < 0.25) { const z = betaIinv(2 * q, nu / 2, 0.5); return Math.sqrt(nu * (1 - z) / z); }
  const w = betaIinv(1 - 2 * q, 0.5, nu / 2); return Math.sqrt(nu * w / (1 - w));
}
function fPdf(x, d1, d2) {
  if (x < 0) return 0;
  if (x === 0) return d1 < 2 ? Infinity : d1 === 2 ? 1 : 0;
  return Math.exp((d1 / 2) * Math.log(d1 / d2) + (d1 / 2 - 1) * Math.log(x) - ((d1 + d2) / 2) * Math.log1p(d1 * x / d2) - lbeta(d1 / 2, d2 / 2));
}
const fCdf = (x, d1, d2) => (x <= 0 ? 0 : betaI(d1 * x / (d1 * x + d2), d1 / 2, d2 / 2));
const fSf = (x, d1, d2) => (x <= 0 ? 1 : betaI(d2 / (d1 * x + d2), d2 / 2, d1 / 2));
function fUpperQ(q, d1, d2) { const w = betaIinv(q, d2 / 2, d1 / 2); return d2 * (1 - w) / (d1 * w); }
const f3 = v => String(Number(v.toPrecision(4)));

export default {
  id: 'student-t--f',
  from: 'student-t',
  to: 'f',
  title: 'The square of a t variable has an F distribution with one numerator degree of freedom',

  summary: 'Squaring a t variable with $\\nu$ degrees of freedom gives an F variable with 1 and $\\nu$ degrees of freedom. This is why a two-group ANOVA gives exactly the same p-value as a two-sided two-sample t-test with pooled variance.',

  plain: [
    'Squaring a $t$ statistic with $\\nu$ degrees of freedom gives an F statistic with $d_1 = 1$ and $d_2 = \\nu$. Squaring folds the two tails of the $t$ distribution onto one tail: a value of $t$ far below 0 and a value far above 0 both become a large value of $t^2$.',
    'This is why a two-group ANOVA gives exactly the same p-value as the two-sided two-sample t-test (its F statistic is the square of the pooled t statistic), and why the F-test of a single regression coefficient agrees with the two-sided t-test of that coefficient. Critical values match too: $F_{0.95}(1, \\nu) = t_{\\nu,\\,0.975}^2$, for example $(2.228)^2 = 4.965$ for $\\nu = 10$.',
  ],

  statementTex: REL.statement,
  glossary: [
    { sym: 'T \\sim t_\\nu', meaning: '$T$ has Student’s $t$ distribution with $\\nu$ degrees of freedom.' },
    { sym: '\\nu', meaning: 'The degrees of freedom of the $t$ variable; they become the denominator degrees of freedom of the F distribution.' },
    { sym: 'T^2', meaning: 'The square of $T$. It is never negative.' },
    { sym: 'F(1, \\nu)', meaning: 'The F distribution with 1 numerator degree of freedom and $\\nu$ denominator degrees of freedom.' },
    { sym: '\\Rightarrow', meaning: 'Implies.' },
  ],

  why: [
    'By construction $T = Z/\\sqrt{V/\\nu}$ with $Z$ standard normal and $V \\sim \\chi^2_\\nu$ independent. Squaring gives',
    { tex: 'T^2 = \\frac{Z^2}{V/\\nu} = \\frac{Z^2/1}{V/\\nu},' },
    'and $Z^2 \\sim \\chi^2_1$ is independent of $V$. That is a ratio of two independent chi-squared variables, each divided by its degrees of freedom, which is the definition of $F(1, \\nu)$.',
    'For p-values, the event $T^2 \\ge t^2$ is the same as $|T| \\ge |t|$, so',
    { tex: 'P\\big(F_{1,\\nu} \\ge t^2\\big) = P\\big(|T| \\ge |t|\\big) = 2\\,P(T \\ge |t|),' },
    'the upper-tail F p-value equals the two-sided t p-value. The F-test cannot express a direction, so the one-sided t-test (half of this p-value) has no F counterpart. The density of $T^2$ also follows from the change of variables $y = t^2$: each $y > 0$ comes from the two points $\\pm\\sqrt y$, giving $f_{T^2}(y) = f_T(\\sqrt y)/\\sqrt y$, which is the $F(1, \\nu)$ density (infinite at 0, because many $t$ values are close to 0).',
  ],

  references: [
    { text: 'Wikipedia: F-distribution, related distributions.', url: 'https://en.wikipedia.org/wiki/F-distribution#Related_distributions' },
    { text: 'Wikipedia: Student’s t-distribution, related distributions.', url: 'https://en.wikipedia.org/wiki/Student%27s_t-distribution#Related_distributions' },
    { text: 'Casella, G., & Berger, R. L. (2002). <i>Statistical Inference</i> (2nd ed.), Theorem 5.3.8(b). Duxbury.' },
    { text: 'Leemis, L. M., & McQueston, J. T. (2008). Univariate distribution relationships. <i>The American Statistician</i>, 62(1), 45–53.', url: 'https://doi.org/10.1198/000313008X270448' },
  ],

  demo(container, ctx) {
    const { ui } = ctx;
    const { h } = ui;
    const boxes = { pvalue: h('div'), sim: h('div', { hidden: true }) };
    const built = {};
    const show = v => {
      for (const k in boxes) boxes[k].hidden = k !== v;
      if (!built[v]) { built[v] = true; (v === 'pvalue' ? pvalueDemo : simDemo)(boxes[v], ctx); }
    };
    const seg = ui.segmented([
      { value: 'pvalue', label: 'Same p-value: t-test and F-test' },
      { value: 'sim', label: 'Simulate T²' },
    ], 'pvalue', show, 'Which view to show');
    container.append(h('div', { style: 'margin-bottom:.6rem' }, seg.el), boxes.pvalue, boxes.sim);
    show('pvalue');
  },
};

/** Two plots: the two-sided t tail area beyond ±t and the F(1, nu) tail area beyond t^2. */
function pvalueDemo(box, { plot, ui }) {
  const { h } = ui;
  const params = [
    { key: 'nu', sym: '\\nu', name: 'degrees of freedom', meaning: 'Degrees of freedom of the t statistic (and the denominator of the F statistic).', min: 1, max: 100, default: 10, integer: true, log: true },
    { key: 't', sym: 't', name: 'observed t statistic', meaning: 'The observed value of the t statistic; its square is the F statistic.', min: -6, max: 6, default: 2.3, step: 0.01 },
  ];
  const defaults = { nu: 10, t: 2.3 };
  const store = ui.createStore({ ...defaults });
  const tBox = h('div'), fBox = h('div');
  const readout = h('p', { class: 'demo-readout', 'aria-live': 'polite' });
  const controls = h('div', { class: 'demo-controls' });
  box.append(
    h('div', { class: 'demo-grid' },
      h('figure', { class: 'plot-fig' }, h('figcaption', {}, 'Two-sided t-test: area beyond ±t'), tBox),
      h('figure', { class: 'plot-fig' }, h('figcaption', {}, 'F-test: area beyond t²'), fBox)),
    readout, controls,
    ui.rich('p', 'Drag the amber marker under either plot, or type an observed $t$. The left plot shades the two-sided t-test p-value, the area beyond $\\pm t$ under the $t_\\nu$ density. The right plot shades the F-test p-value, the area beyond $t^2$ under the $F(1, \\nu)$ density. The two areas are always equal.', { class: 'small muted demo-intro' }));
  const panel = ui.paramPanel(controls, params, {
    get: () => store.get(),
    apply: (k, v) => store.set({ [k]: v }),
    onReset: () => store.set({ ...defaults }),
  });
  const tPlot = new plot.Plot(tBox, { xLabel: 't', yLabel: 'density', height: (w, H) => plot.fitHeight(w, H) });
  const fPlot = new plot.Plot(fBox, { xLabel: 'F = t²', yLabel: 'density', height: (w, H) => plot.fitHeight(w, H) });

  let raf = 0;
  const request = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; draw(); }); };
  store.subscribe(() => { panel.update(store.get()); request(); });
  const clampT = v => Math.max(-6, Math.min(6, Math.round(v * 100) / 100));
  let fFrozen = null; // keep the F axis still while its marker is dragged

  function draw() {
    const { nu, t } = store.get();
    const a = Math.abs(t), t2 = t * t;
    const crit = fUpperQ(0.05, 1, nu), tc = tUpperQ(0.025, nu);
    // t plot (dotted lines: the two-sided 5% critical values ±t_crit)
    const tx = [-6.5, 6.5];
    const tTop = tPdf(0, nu) * 1.18;
    const tf = x => tPdf(x, nu);
    tPlot.render({
      x: tx, y: [0, tTop],
      layers: [
        { id: 'fill', type: 'area', points: plot.sampleFn(tf, tx[0], tx[1], 300), cls: 'pdf-fill' },
        { id: 'lo', type: 'area', points: plot.sampleFn(tf, tx[0], -a, 120), cls: 'area-shade' },
        { id: 'hi', type: 'area', points: plot.sampleFn(tf, a, tx[1], 120), cls: 'area-shade' },
        { id: 'mirror', type: 'segment', x1: -t, y1: 0, x2: -t, y2: tf(t), cls: 'guide' },
        // the critical lines are drawn only when they fall inside the plot (for nu = 1 they are at ±12.71)
        ...(tc < tx[1] ? [
          { id: 'c-lo', type: 'segment', x1: -tc, y1: 0, x2: -tc, y2: tTop * 0.89, cls: 'mean-line' },
          { id: 'c-hi', type: 'segment', x1: tc, y1: 0, x2: tc, y2: tTop * 0.89, cls: 'mean-line' },
          { id: 'c-lab', type: 'text', x: tc, y: tTop * 0.95, text: `5% critical ±${f3(tc)}` },
        ] : [{ id: 'c-lab', type: 'text', x: tx[1], y: tTop * 0.95, anchor: 'end', dx: -4, text: `5% critical ±${f3(tc)}, beyond the plot` }]),
        { id: 'curve', type: 'line', points: plot.sampleFn(tf, tx[0], tx[1], 300), cls: 'curve-main' },
      ],
      handles: [{
        id: 't', type: 'xPoint', x: t, lineTo: tf(t), label: 't', cls: 'threshold',
        ariaLabel: 'Observed t statistic. Drag, or use the arrow keys.', valueText: ui.fmt(t, 3), valueNow: t, valueMin: -6, valueMax: 6,
        onDrag: pt => { if (pt) store.set({ t: clampT(pt.x) }); },
        onKey: steps => store.set({ t: clampT(store.get().t + 0.05 * steps) }),
      }],
    });
    // F plot: from 0 to a bit beyond t^2 (and at least to the 5% critical value)
    const fx = fFrozen || [0, Math.min(40, Math.max(6, 1.25 * crit, 1.2 * t2))];
    const ff = x => fPdf(x, 1, nu);
    const fTop = Math.max(ff(0.06 * fx[1]), 0.5);
    fPlot.render({
      x: fx, y: [0, fTop],
      layers: [
        { id: 'fill', type: 'area', points: plot.sampleFn(ff, 1e-6, fx[1], 300), cls: 'pdf-fill' },
        { id: 'hi', type: 'area', points: plot.sampleFn(ff, Math.max(t2, 1e-6), fx[1], 160), cls: 'area-shade' },
        ...(crit < fx[1] ? [
          { id: 'c', type: 'segment', x1: crit, y1: 0, x2: crit, y2: fTop * 0.78, cls: 'mean-line' },
          { id: 'c-lab', type: 'text', x: crit, y: fTop * 0.84, text: `5% critical ${f3(crit)}` },
        ] : [{ id: 'c-lab', type: 'text', x: fx[1], y: fTop * 0.84, anchor: 'end', dx: -4, text: `5% critical ${f3(crit)}, beyond the plot` }]),
        { id: 'curve', type: 'line', points: plot.sampleFn(ff, 1e-6, fx[1], 300), cls: 'curve-main' },
      ],
      handles: [{
        id: 'f', type: 'xPoint', x: t2, lineTo: ff(Math.max(t2, 1e-6)), label: 't²', cls: 'threshold',
        ariaLabel: 'Observed F statistic t squared. Drag, or use the arrow keys.', valueText: ui.fmt(t2, 3), valueNow: t2, valueMin: 0, valueMax: 36,
        onDrag: (pt, phase) => {
          if (phase === 'start') fFrozen = fx;
          if (pt) store.set({ t: clampT((t < 0 ? -1 : 1) * Math.sqrt(Math.max(0, pt.x))) });
          if (phase === 'end') { fFrozen = null; request(); }
        },
        onKey: steps => { const cur = store.get().t; store.set({ t: clampT((cur < 0 ? -1 : 1) * Math.sqrt(Math.max(0, cur * cur + 0.1 * steps))) }); },
      }],
    });
    const pT = 2 * tUpper(a, nu), pF = fSf(t2, 1, nu);
    readout.innerHTML = `Two-sided t-test p-value P(|<i>T</i>| ≥ ${ui.fmt(a, 3)}) = <b>${ui.fmt(pT, 4)}</b>. `
      + `F-test p-value P(<i>F</i> ≥ ${ui.fmt(t2, 4)}) = <b>${ui.fmt(pF, 4)}</b>. `
      + `Critical values at the 5% level: t = ±${f3(tc)}, and ${f3(tc)}² = ${f3(tc * tc)} = F<sub>0.95</sub>(1, ${nu}) = ${f3(crit)}.`;
  }
  draw();
}

function simDemo(box, { demos }) {
  demos.simulationDemo(box, null, {
    intro: 'Each simulated value is $T^2$, where $T = Z/\\sqrt{V/\\nu}$ is built from a standard normal $Z$ and an independent chi-squared $V$ with $\\nu$ degrees of freedom. The histogram is compared with the $F(1, \\nu)$ density, which is infinite at 0 because many values of $T$ are near 0.',
    params: [
      { key: 'nu', sym: '\\nu', name: 'degrees of freedom', meaning: 'Degrees of freedom of $T$.', min: 1, max: 60, default: 6, integer: true },
    ],
    sample: (rng, { nu }) => { const t = rng.studentT(nu); return t * t; },
    sampleName: 'squared t draws T²',
    target: { name: ({ nu }) => `F(1, ${nu}) density`, pdf: (x, { nu }) => fPdf(x, 1, nu), cdf: (x, { nu }) => fCdf(x, 1, nu) },
    range: ({ nu }) => [0, Math.min(15, Math.max(4, fUpperQ(0.02, 1, nu)))],
    xLabel: 'T²',
    readout: ({ nu }) => `$F_{0.95}(1, ${nu})$ = <b>${f3(fUpperQ(0.05, 1, nu))}</b> $= t_{${nu},\\,0.975}^2$ = ${f3(tUpperQ(0.025, nu))}².`,
  });
}
