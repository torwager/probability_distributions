// Von Mises with kappa = 0 is the uniform distribution on the circle, U(-pi, pi), for any mu.
// Demo: ctx.demos.compareDemo with the von Mises and the uniform density on [-pi, pi]; an amber arrow from
// the uniform level up to the peak sets kappa (drag it down onto the flat line to reach kappa = 0) and a
// marker under the axis sets mu. A polar plot below draws both densities around the circle.

import { getRelation } from '../catalog.js';
import { PI, besselI0e, solveMonotone, clamp } from '../core/math.js';
import { vonMisesPdf, vonMisesCdf, meanResultant, polarLayers, polarFrame, ensurePolarStyle } from '../dists/von-mises.js';

const REL = getRelation('von-mises--uniform');
const U = 1 / (2 * PI);
const peak = kappa => 1 / (2 * PI * besselI0e(kappa));

export default {
  id: 'von-mises--uniform',
  from: 'von-mises',
  to: 'uniform',
  title: 'With zero concentration the von Mises distribution is uniform on the circle',

  plain: [
    'The concentration $\\kappa$ of a von Mises distribution says how strongly the angles prefer the mean direction $\\mu$. With $\\kappa = 0$ there is no preference at all: every direction on the circle is equally likely, and the distribution is the uniform distribution on $[-\\pi, \\pi)$, with constant density $1/(2\\pi)$. The mean direction $\\mu$ then has no effect, because there is no peak for it to locate.',
    'This special case matters in practice. Tests for whether angles have any preferred direction (such as the Rayleigh test) test $\\kappa = 0$ against $\\kappa > 0$. In mixture models of visual working memory, the uniform component describes random guesses and the von Mises component describes responses based on memory.',
  ],

  statementTex: REL.statement,
  glossary: [
    { sym: '\\mathrm{VonMises}(\\mu, 0)', meaning: 'The von Mises distribution with mean direction $\\mu$ and concentration $\\kappa = 0$.' },
    { sym: '\\mu', meaning: 'The mean direction. With zero concentration its value does not matter.' },
    { sym: '\\mathrm U(-\\pi, \\pi)', meaning: 'The continuous uniform distribution on the interval from $-\\pi$ to $\\pi$: one full turn of the circle, every angle equally likely, density $1/(2\\pi)$.' },
    { sym: '\\pi', meaning: 'The constant 3.14159…; $2\\pi$ radians is one full turn.' },
  ],

  why: [
    'The von Mises density is',
    { tex: 'f(x \\mid \\mu, \\kappa) = \\frac{e^{\\kappa\\cos(x - \\mu)}}{2\\pi I_0(\\kappa)}.' },
    'With $\\kappa = 0$ the exponent is 0 for every $x$, so the numerator is $e^0 = 1$. The modified Bessel function satisfies $I_0(0) = 1$ (its series $\\sum_m (\\kappa/2)^{2m}/(m!)^2$ is just the $m = 0$ term), so the density is $1/(2\\pi)$ for every angle in $[-\\pi, \\pi)$: the uniform density. The angle $\\mu$ appears only inside $\\kappa\\cos(x - \\mu)$, which is 0 whatever $\\mu$ is.',
    'Near $\\kappa = 0$ the change is smooth. Since $e^{\\kappa\\cos u} \\approx 1 + \\kappa\\cos u$ and $I_0(\\kappa) \\approx 1 + \\kappa^2/4$, a small concentration adds a gentle cosine-shaped bump, $f(x) \\approx \\frac{1}{2\\pi}\\big(1 + \\kappa\\cos(x - \\mu)\\big)$: one direction becomes a little more likely and the opposite direction a little less. The mean resultant length $A(\\kappa) = I_1(\\kappa)/I_0(\\kappa) \\approx \\kappa/2$ grows from 0 at the same time, which is what the Rayleigh test detects.',
  ],

  references: [
    { text: 'Wikipedia: Von Mises distribution.', url: 'https://en.wikipedia.org/wiki/Von_Mises_distribution' },
    { text: 'Mardia, K. V., &amp; Jupp, P. E. (2000). <i>Directional Statistics</i>, Sections 3.5 and 6.3 (tests of uniformity). Wiley.' },
    { text: 'Zhang, W., &amp; Luck, S. J. (2008). Discrete fixed-resolution representations in visual working memory. <i>Nature</i>, 453, 233–235.', url: 'https://doi.org/10.1038/nature06860' },
    { text: 'Leemis, L. M., &amp; McQueston, J. T. (2008). Univariate distribution relationships. <i>The American Statistician</i>, 62(1), 45–53.', url: 'https://doi.org/10.1198/000313008X270448' },
  ],

  demo(container, { demos, ui, plot }) {
    const { h } = ui;
    ensurePolarStyle();
    let drag = null;
    const res = demos.compareDemo(container, null, {
      intro: 'The solid curve is the von Mises density and the dashed line is the uniform density $1/(2\\pi) \\approx 0.159$. Drag the tip of the amber arrow (the peak) down onto the flat line to set $\\kappa = 0$; the two then coincide exactly, and moving $\\mu$ with the marker under the axis no longer changes anything.',
      params: [
        { key: 'kappa', sym: '\\kappa', name: 'concentration', meaning: 'How strongly the angles prefer the mean direction; 0 means no preference.', min: 0, max: 5, default: 1.5, step: 0.05 },
        { key: 'mu', sym: '\\mu', name: 'mean direction', meaning: 'Where the peak is (radians). It has no effect when $\\kappa = 0$.', min: -3.14159, max: 3.14159, default: 1, step: 0.05 },
      ],
      exact: {
        name: ({ mu, kappa }) => `Von Mises(μ = ${ui.fmt(mu, 3)}, κ = ${ui.fmt(kappa, 3)})`,
        pdf: (x, { mu, kappa }) => vonMisesPdf(x, mu, kappa),
        cdf: (x, { mu, kappa }) => vonMisesCdf(x, mu, kappa),
      },
      approx: {
        name: 'Uniform(−π, π)',
        pdf: x => (x >= -PI && x <= PI ? U : 0),
        cdf: x => clamp((x + PI) / (2 * PI), 0, 1),
      },
      range: () => [-PI, PI],
      xLabel: 'angle x (radians)',
      handles: ({ mu, kappa }, set) => [
        {
          id: 'kappa', type: 'vArrow', from: { x: mu, y: U }, to: { x: mu, y: peak(kappa) }, label: 'κ',
          ariaLabel: 'Concentration κ: height of the peak above the uniform level. Drag up or down, or use the arrow keys.',
          valueText: ui.fmt(kappa, 3), valueNow: kappa, valueMin: 0, valueMax: 5,
          onDrag: (pt, phase) => {
            if (phase === 'start') drag = true;
            if (pt && drag) {
              const k = pt.y <= U * 1.004 ? 0 : solveMonotone(peak, pt.y, 1e-6, 5);
              set({ kappa: Math.round(k * 100) / 100 });
            }
            if (phase === 'end') drag = null;
          },
          onKey: steps => set({ kappa: Math.round((kappa + 0.05 * steps) * 100) / 100 }),
        },
        {
          id: 'mu', type: 'xPoint', x: mu, lineTo: 0, label: 'μ',
          ariaLabel: 'Mean direction μ. Drag along the axis, or use the arrow keys.', valueText: ui.fmt(mu, 3), valueNow: mu, valueMin: -PI, valueMax: PI,
          onDrag: pt => { if (pt) set({ mu: Math.round(clamp(pt.x, -3.14159, 3.14159) * 100) / 100 }); },
          onKey: steps => set({ mu: Math.round(clamp(mu + 0.05 * steps, -3.14159, 3.14159) * 100) / 100 }),
        },
      ],
      readout: ({ kappa }) => (kappa === 0
        ? 'With $\\kappa = 0$ the von Mises density is exactly $1/(2\\pi)$ everywhere and the mean resultant length is 0: the two distributions are the same, whatever $\\mu$ is.'
        : `Peak height $e^{\\kappa}/(2\\pi I_0(\\kappa))$ = <b>${ui.fmt(peak(kappa), 3)}</b> against the uniform level <b>0.1592</b>; mean resultant length $A(\\kappa)$ = <b>${ui.fmt(meanResultant(kappa), 3)}</b> (0 for the uniform).`),
    });

    // polar view of both densities
    const box = h('div', { class: 'plot-box' });
    const wrap = h('div', { class: 'vm-polar-wrap' },
      h('figure', { class: 'plot-fig vm-polar' }, h('figcaption', {}, 'The two densities drawn around the circle'), box),
      ui.rich('div', 'Each density is drawn outward from the unit circle by an amount proportional to its value. The uniform density is a ring of constant width (dashed); the von Mises density bulges toward $\\mu$ and thins out on the opposite side. As $\\kappa$ falls to 0 the bulge flattens into the ring. The arrow from the center is the mean resultant vector, whose length $A(\\kappa)$ shrinks to 0.', { class: 'vm-polar-text' }));
    container.append(wrap);
    const S = 0.75, R = 1.75;
    const P = new plot.Plot(box, { equalAspect: true, xTicks: false, yTicks: false, height: w => clamp(w * 0.8, 230, 320), margin: { t: 8, r: 8, b: 8, l: 8 }, ariaLabel: 'Von Mises and uniform densities drawn around the circle' });
    const draw = () => {
      const { mu, kappa } = res.store.get().p;
      const A = meanResultant(kappa);
      P.render({
        x: [-R, R], y: [-R, R],
        layers: [
          ...polarLayers(t => vonMisesPdf(t, mu, kappa), { id: 'vm', scale: S, fill: true }),
          ...polarLayers(() => U, { id: 'un', scale: S, cls: 'curve-ref' }),
          ...polarFrame(),
          { id: 'vec', type: 'segment', x1: 0, y1: 0, x2: A * Math.cos(mu), y2: A * Math.sin(mu), cls: 'vm-vector' },
          { id: 'tip', type: 'dot', x: A * Math.cos(mu), y: A * Math.sin(mu), r: 3.5, cls: '' },
        ],
        legend: [{ label: 'Von Mises', cls: 'curve-main' }, { label: 'Uniform', cls: 'curve-ref' }],
      });
    };
    res.store.subscribe(draw);
    draw();
  },
};
