// Von Mises -> Normal as kappa -> infinity.
// Demo: ctx.demos.compareDemo overlays VonMises(0, kappa) and N(0, 1/kappa) on a window that zooms in as the
// distribution concentrates, with an arrow handle for the normal standard deviation 1/sqrt(kappa), plus a
// plot of the largest CDF gap against kappa. The von Mises density and CDF come from dists/von-mises.js
// (same batch), which computes them directly with core/math.js.

import { getRelation } from '../catalog.js';
import { normalCdf, normalPdf, PI } from '../core/math.js';
import { vonMisesPdf, vonMisesCdf, meanResultant } from '../dists/von-mises.js';

const REL = getRelation('von-mises--normal');

const halfWindow = kappa => Math.min(PI, 5 / Math.sqrt(kappa));

/** Largest gap between the von Mises CDF (mu = 0) and the N(0, 1/kappa) CDF, on a grid over [-pi, pi]. */
function cdfGap(kappa, n = 500) {
  const s = 1 / Math.sqrt(kappa), h = halfWindow(kappa);
  let g = 0;
  for (let i = 0; i <= n; i++) {
    const x = -h + 2 * h * i / n;
    g = Math.max(g, Math.abs(vonMisesCdf(x, 0, kappa) - normalCdf(x / s)));
  }
  return g;
}

export default {
  id: 'von-mises--normal',
  from: 'von-mises',
  to: 'normal',
  title: 'A highly concentrated von Mises distribution is approximately normal',

  summary: 'When the concentration $\\kappa$ of a von Mises distribution of angles is large, the angles stay close to the mean direction, where the circle is nearly a straight line. The distribution is then approximately normal with variance $1/\\kappa$.',

  plain: [
    'The von Mises distribution describes angles on a circle, with mean direction $\\mu$ and concentration $\\kappa$. When $\\kappa$ is large, nearly all of the angles lie close to $\\mu$. On such a short stretch the circle is almost a straight line, and the distribution of the angle is almost a normal distribution with mean $\\mu$ and variance $1/\\kappa$, that is, standard deviation $1/\\sqrt\\kappa$.',
    'This is why $\\kappa$ is often read as a precision (one over a variance), and why a standard deviation $\\sigma$ in radians is often converted to $\\kappa \\approx 1/\\sigma^2$. The approximation is good once $\\kappa$ is above about 10; for small $\\kappa$ the angles spread around the whole circle and a normal curve, which has no edges, describes them poorly.',
  ],

  statementTex: REL.statement,
  glossary: [
    { sym: 'X_\\kappa \\sim \\mathrm{VonMises}(\\mu, \\kappa)', meaning: '$X_\\kappa$ is an angle (in radians) with a von Mises distribution with mean direction $\\mu$ and concentration $\\kappa$.' },
    { sym: '\\mu', meaning: 'The mean direction: the angle where the density peaks. It is also the mean of the approximating normal distribution.' },
    { sym: '\\kappa', meaning: 'The concentration. The statement describes what happens as $\\kappa$ grows without bound.' },
    { sym: '\\kappa \\to \\infty', meaning: 'The concentration grows without bound, so the angles cluster ever more tightly around $\\mu$.' },
    { sym: '\\sqrt\\kappa\\,(X_\\kappa - \\mu)', meaning: 'The deviation from the mean direction, measured in units of $1/\\sqrt\\kappa$ (the approximate standard deviation).' },
    { sym: '\\Rightarrow', meaning: 'Implies.' },
    { sym: '\\xrightarrow{d}', meaning: 'Converges in distribution: for every $z$, the probability that the scaled deviation is at most $z$ approaches $\\Phi(z)$, the standard normal CDF.' },
    { sym: '\\mathcal N(0,1)', meaning: 'The standard normal distribution, with mean 0 and standard deviation 1.' },
    { sym: '\\mathcal N(\\mu, 1/\\kappa)', meaning: 'The normal distribution with mean $\\mu$ and variance $1/\\kappa$.' },
  ],

  why: [
    'Write the deviation from the mean direction as $x - \\mu = z/\\sqrt\\kappa$. The von Mises density is proportional to $e^{\\kappa\\cos(x - \\mu)}$, and the Taylor series of the cosine, $\\cos u = 1 - u^2/2 + u^4/24 - \\dots$, gives',
    { tex: '\\kappa\\cos\\!\\left(\\frac{z}{\\sqrt\\kappa}\\right) = \\kappa - \\frac{z^2}{2} + \\frac{z^4}{24\\,\\kappa} - \\dots' },
    'The constant $\\kappa$ is absorbed by the normalizing constant, the term $-z^2/2$ is the exponent of the standard normal density, and the remaining terms shrink like $1/\\kappa$. So the density of $z = \\sqrt\\kappa\\,(X - \\mu)$ approaches $e^{-z^2/2}/\\sqrt{2\\pi}$.',
    'The normalizing constants agree too. For large $\\kappa$ the Bessel function behaves like $I_0(\\kappa) \\approx e^{\\kappa}/\\sqrt{2\\pi\\kappa}$, so the peak height $e^{\\kappa}/(2\\pi I_0(\\kappa))$ approaches $\\sqrt{\\kappa/(2\\pi)}$, the peak of a normal density with standard deviation $1/\\sqrt\\kappa$.',
    'Two things are lost in the approximation. The normal curve puts a small amount of probability, $2\\Phi(-\\pi\\sqrt\\kappa)$, outside $[-\\pi, \\pi]$, where the angle cannot be; and the $z^4/(24\\kappa)$ term makes the von Mises peak slightly lower and its sides slightly heavier than the normal’s (at $\\kappa = 10$ the peak is about 1.3% lower). Both shrink as $\\kappa$ grows, and the largest gap between the two CDFs falls like $1/\\kappa$ (about $0.044/\\kappa$ for large $\\kappa$), as the lower plot shows on logarithmic axes, where $0.044/\\kappa$ is a straight line of slope $-1$. A closely related circular distribution, the wrapped normal, wraps the normal curve around the circle instead of cutting it off; it matches the von Mises well at every $\\kappa$ when its variance is chosen as $-2\\ln(I_1(\\kappa)/I_0(\\kappa))$.',
  ],

  references: [
    { text: 'Wikipedia: Von Mises distribution, limiting behavior.', url: 'https://en.wikipedia.org/wiki/Von_Mises_distribution#Limiting_behavior' },
    { text: 'Mardia, K. V., &amp; Jupp, P. E. (2000). <i>Directional Statistics</i>, Section 3.5. Wiley.' },
    { text: 'NIST Digital Library of Mathematical Functions, §10.40 (asymptotic expansion of $I_\\nu$ for large argument).', url: 'https://dlmf.nist.gov/10.40' },
    { text: 'Leemis, L. M., &amp; McQueston, J. T. (2008). Univariate distribution relationships. <i>The American Statistician</i>, 62(1), 45–53.', url: 'https://doi.org/10.1198/000313008X270448' },
  ],

  demo(container, { demos, ui, plot }) {
    const { h } = ui;
    let drag = null;
    const res = demos.compareDemo(container, null, {
      intro: 'The solid curve is the von Mises density with mean direction $\\mu = 0$; the dashed curve is the normal density with mean 0 and standard deviation $1/\\sqrt\\kappa$. The window zooms in as the distribution concentrates (it never extends past $\\pm\\pi$, the edges of the circle). Increase $\\kappa$ and watch the two curves merge. Drag the tip of the amber arrow, which is the normal standard deviation $1/\\sqrt\\kappa$, or type a value.',
      params: [
        { key: 'kappa', sym: '\\kappa', name: 'concentration', meaning: 'How tightly the angles cluster around the mean direction; the normal approximation has variance $1/\\kappa$.', min: 0.3, max: 200, default: 2, log: true },
      ],
      exact: {
        name: ({ kappa }) => `Von Mises(μ = 0, κ = ${ui.fmt(kappa, 3)})`,
        pdf: (x, { kappa }) => vonMisesPdf(x, 0, kappa),
        cdf: (x, { kappa }) => vonMisesCdf(x, 0, kappa),
      },
      approx: {
        name: ({ kappa }) => `Normal(mean 0, sd 1/√κ = ${ui.fmt(1 / Math.sqrt(kappa), 3)})`,
        pdf: (x, { kappa }) => normalPdf(x * Math.sqrt(kappa)) * Math.sqrt(kappa),
        cdf: (x, { kappa }) => normalCdf(x * Math.sqrt(kappa)),
      },
      range: ({ kappa }) => [-halfWindow(kappa), halfWindow(kappa)],
      xLabel: 'angle x (radians)',
      handles: ({ kappa }, set) => {
        const s = 1 / Math.sqrt(kappa), y = normalPdf(1) * Math.sqrt(kappa);
        return [{
          id: 'sd', type: 'hArrow', from: { x: 0, y }, to: { x: s, y }, label: '1/√κ',
          ariaLabel: 'Normal standard deviation 1/√κ. Drag the tip, or use the arrow keys.', valueText: ui.fmt(kappa, 3), valueNow: kappa, valueMin: 0.3, valueMax: 200,
          onDrag: (pt, phase) => {
            if (phase === 'start') drag = true;
            if (pt && drag) set({ kappa: Number((1 / Math.max(pt.x, 0.05) ** 2).toPrecision(3)) });
            if (phase === 'end') drag = null;
          },
          onKey: steps => set({ kappa: Number((kappa * Math.pow(1.1, -steps)).toPrecision(3)) }),
        }];
      },
      readout: ({ kappa }) => {
        const A = meanResultant(kappa), csd = Math.sqrt(-2 * Math.log(A));
        return `Circular standard deviation $\\sqrt{-2\\ln A(\\kappa)}$ = <b>${ui.fmt(csd, 3)}</b> against the normal standard deviation $1/\\sqrt\\kappa$ = <b>${ui.fmt(1 / Math.sqrt(kappa), 3)}</b>. `
          + `The normal curve puts probability <b>${ui.fmt(2 * normalCdf(-PI * Math.sqrt(kappa)), 3)}</b> outside $[-\\pi, \\pi]$, where an angle cannot be.`;
      },
    });

    // the largest gap as a function of kappa, on log-log axes (a curve proportional to 1/kappa is then a
    // straight line with slope -1)
    const gapBox = h('div');
    container.append(h('figure', { class: 'plot-fig', style: 'margin-top:1.2rem' },
      h('figcaption', {}, 'Largest CDF gap against κ, both on logarithmic scales (dashed: 0.044/κ)'), gapBox));
    const gp = new plot.Plot(gapBox, { xLabel: 'log₁₀ κ', yLabel: 'log₁₀ (largest gap)', height: w => Math.max(190, Math.min(260, w * 0.3)) });
    const L = Math.log10;
    const ks = [];
    for (let i = 0; i <= 80; i++) ks.push(0.3 * Math.pow(200 / 0.3, i / 80));
    const curve = ks.map(k => [L(k), L(cdfGap(k, 400))]);
    const ref = ks.map(k => [L(k), L(0.044 / k)]);
    const ys = [...curve, ...ref].map(c => c[1]);
    const yr = [Math.floor(Math.min(...ys) * 2) / 2, Math.ceil(Math.max(...ys) * 2) / 2];
    const draw = () => {
      const { kappa } = res.store.get().p;
      gp.render({
        x: [L(0.3), L(200)], y: yr,
        layers: [
          { id: 'r', type: 'line', points: ref, cls: 'curve-ref' },
          { id: 'g', type: 'line', points: curve, cls: 'curve-main' },
          { id: 'now', type: 'dot', x: L(kappa), y: L(cdfGap(kappa)), r: 5, cls: 'marker' },
        ],
        legend: [{ label: 'largest gap between the two CDFs', cls: 'curve-main' }, { label: '0.044/κ, for comparison', cls: 'curve-ref' }],
      });
    };
    res.store.subscribe(draw);
    draw();
  },
};
