// Von Mises distribution (circular normal): angles on the circle, mean direction mu, concentration kappa.
//
// Conventions: the angle x is written in [-pi, pi) (radians). The density is periodic, so the plotting
// window and the true support are both [-pi, pi]; the CDF is P(-pi <= X <= x).
//
// Statistics: on a circle the ordinary mean, variance, median, skewness and kurtosis of the number x
// depend on where the circle is cut (the average of 179 and -179 degrees is 0, not 180). stats()
// therefore returns NaN for the linear moments and the median (the node tests then skip those checks),
// and the properties table shows the circular versions instead (mean direction, circular variance,
// circular standard deviation). The mode and the entropy do not depend on the cut and are returned.
//
// The explorer is the standard one plus a polar plot of the same density drawn around the circle, with
// a draggable mean resultant vector (direction = mu, length = A(kappa) = I1/I0).
//
// Named exports (vonMisesPdf, vonMisesCdf, besselRatios, meanResultant, polarLayers, ensurePolarStyle)
// are reused by the relation pages von-mises--normal and von-mises--uniform.

import { catalogParams } from '../catalog.js';
import { besselI0e, besselI1e, PI, quantileContinuous, solveMonotone, clamp } from '../core/math.js';

const TWO_PI = 2 * PI;

/** Wrap an angle into [-pi, pi). */
export const wrapAngle = x => ((((x + PI) % TWO_PI) + TWO_PI) % TWO_PI) - PI;

/** Mean resultant length A(kappa) = I1(kappa) / I0(kappa) (0 for kappa = 0, approaching 1 as kappa grows). */
export function meanResultant(kappa) {
  if (!(kappa > 0)) return 0;
  return besselI1e(kappa) / besselI0e(kappa);
}

/**
 * Ratios A_n = I_n(kappa) / I_0(kappa) for n = 0..N (cached), computed by backward recurrence of
 * r_n = I_n / I_{n-1} = 1 / (2n/kappa + r_{n+1}). They are the Fourier (trigonometric-moment)
 * coefficients of the density and give the CDF as a fast-converging sine series.
 */
const ratioCache = new Map();
export function besselRatios(kappa) {
  if (ratioCache.has(kappa)) return ratioCache.get(kappa);
  let out;
  if (!(kappa > 1e-12)) out = [1];
  else {
    const N = Math.ceil(14 + 9.5 * Math.sqrt(kappa));
    const M = N + 40 + Math.ceil(kappa);
    const r = new Float64Array(M + 2);
    for (let n = M; n >= 1; n--) r[n] = 1 / (2 * n / kappa + r[n + 1]);
    out = [1];
    let prod = 1;
    for (let n = 1; n <= N; n++) { prod *= r[n]; out.push(prod); if (prod < 1e-18) break; }
  }
  if (ratioCache.size > 64) ratioCache.clear();
  ratioCache.set(kappa, out);
  return out;
}

/** Density on [-pi, pi] (0 outside). Uses the scaled Bessel function so that large kappa does not overflow. */
export function vonMisesPdf(x, mu, kappa) {
  if (!(x >= -PI && x <= PI)) return 0;
  return Math.exp(kappa * (Math.cos(x - mu) - 1)) / (TWO_PI * besselI0e(kappa));
}

/** P(-pi <= X <= x), from the Fourier series of the density. */
export function vonMisesCdf(x, mu, kappa) {
  if (x <= -PI) return 0;
  if (x >= PI) return 1;
  const A = besselRatios(kappa);
  let s = x + PI;
  for (let n = 1; n < A.length; n++) s += 2 * A[n] * (Math.sin(n * (x - mu)) + Math.sin(n * (PI + mu))) / n;
  return clamp(s / TWO_PI, 0, 1);
}

const pdf = (x, { mu, kappa }) => vonMisesPdf(x, mu, kappa);
const cdf = (x, { mu, kappa }) => vonMisesCdf(x, mu, kappa);

/** log cosh(k), stable for large k. */
const logCosh = k => k + Math.log1p(Math.exp(-2 * k)) - Math.LN2;
/**
 * Half-width w of the peak at half height, where "half height" is halfway between the peak f(mu)
 * and the lowest point f(mu + pi): cos w = ln cosh(kappa) / kappa. It falls from pi/2 (kappa = 0)
 * toward sqrt(2 ln 2 / kappa) for large kappa (the normal half-width at half maximum with variance 1/kappa).
 */
function halfWidth(kappa) {
  if (!(kappa > 1e-9)) return PI / 2;
  return Math.acos(clamp(logCosh(kappa) / kappa, -1, 1));
}
function kappaFromHalfWidth(w) {
  if (!(w < PI / 2 - 1e-9)) return 0;
  const c = Math.cos(Math.max(w, 1e-3));
  return solveMonotone(k => logCosh(k) / k, c, 1e-6, 40, { log: true });
}
/** Height halfway between the peak and the lowest point of the density. */
const halfLevel = ({ kappa }) => (1 + Math.exp(-2 * kappa)) / (2 * TWO_PI * besselI0e(kappa));
const peak = kappa => 1 / (TWO_PI * besselI0e(kappa));

const params = catalogParams('von-mises', {
  mu: { step: 0.05 },
  kappa: { step: 0.1 },
});

const deg = r => `${fmtN(r * 180 / PI)}°`;

// ------------------------------------------------------------------ polar plot helpers (also used by relation demos)

/** Inject the few styles the polar plot needs (no axes or grid, a muted unit circle, a ring fill without an outline). */
export function ensurePolarStyle() {
  if (typeof document === 'undefined' || document.getElementById('vm-polar-style')) return;
  const st = document.createElement('style');
  st.id = 'vm-polar-style';
  st.textContent = `
.vm-polar .axes, .vm-polar .grid { display: none; }
.vm-polar .plot-bg { fill: transparent; }
.vm-polar .layer.vm-circle .curve { stroke: var(--axis, #9aa3ad); stroke-width: 1.2; }
.vm-polar .layer.vm-spoke .rule { stroke: var(--line-2); stroke-width: 1; }
.vm-polar .layer.vm-ring .poly { stroke: none; }
.vm-polar .layer.vm-vector .rule { stroke: var(--steel-deep); stroke-width: 2.2; }
.vm-polar .layer.vm-tick .label { fill: var(--muted); font-family: var(--mono); font-size: 11px; }
.vm-polar-wrap { display: flex; flex-wrap: wrap; gap: clamp(12px, 2vw, 24px); align-items: center; margin-top: 1.1rem; order: 4; }
.vm-polar-wrap > figure { flex: 1 1 300px; max-width: 460px; }
.vm-polar-wrap > .vm-polar-text { flex: 1 1 260px; font-size: .92rem; color: var(--ink-2); }
.vm-polar-wrap > .vm-polar-text p { margin: 0 0 .6rem; }
.vm-polar-wrap > .vm-polar-text b { font-family: var(--mono); font-weight: 500; background: var(--amber-soft); padding: .05rem .35rem; border-radius: 5px; }
`;
  document.head.appendChild(st);
}

/**
 * Layers for a polar drawing of a circular density: the density is drawn outward from the unit circle,
 * r(theta) = 1 + scale * f(theta).
 * @param {function} f  density on [-pi, pi]
 * @param {object} o  { id, scale, cls ('curve-main' | 'curve-ref'), fill (bool), shade: [[a, b], ...] (angle ranges to shade) }
 */
export function polarLayers(f, o = {}) {
  const id = o.id || 'pd', S = o.scale ?? 0.55, n = 360;
  const outer = [];
  for (let i = 0; i <= n; i++) {
    const t = -PI + TWO_PI * i / n, r = 1 + S * f(t);
    outer.push([r * Math.cos(t), r * Math.sin(t)]);
  }
  const ring = (a, b) => {
    const pts = [], m = Math.max(8, Math.ceil(120 * (b - a) / TWO_PI));
    for (let i = 0; i <= m; i++) { const t = a + (b - a) * i / m, r = 1 + S * f(t); pts.push([r * Math.cos(t), r * Math.sin(t)]); }
    for (let i = m; i >= 0; i--) { const t = a + (b - a) * i / m; pts.push([Math.cos(t), Math.sin(t)]); }
    return pts;
  };
  const out = [];
  if (o.fill) out.push({ id: id + '-fill', type: 'polygon', points: ring(-PI, PI), cls: 'vm-ring' });
  (o.shade || []).forEach(([a, b], i) => {
    if (b > a) out.push({ id: `${id}-shade-${i}`, type: 'polygon', points: ring(a, b), cls: 'area-shade' });
  });
  out.push({ id: id + '-curve', type: 'line', points: outer, cls: o.cls || 'curve-main' });
  return out;
}

/** Unit circle, spokes at multiples of pi/2 and their labels. */
export function polarFrame() {
  const circ = [];
  for (let i = 0; i <= 240; i++) { const t = TWO_PI * i / 240; circ.push([Math.cos(t), Math.sin(t)]); }
  const out = [{ id: 'circle', type: 'line', points: circ, cls: 'vm-circle' }];
  const spokes = [[0, '0'], [PI / 2, 'π/2'], [PI, '±π'], [-PI / 2, '−π/2']];
  spokes.forEach(([t, lab], i) => {
    out.push({ id: 'spoke-' + i, type: 'segment', x1: 0.9 * Math.cos(t), y1: 0.9 * Math.sin(t), x2: Math.cos(t), y2: Math.sin(t), cls: 'vm-spoke' });
    out.push({ id: 'tick-' + i, type: 'text', x: 0.74 * Math.cos(t), y: 0.74 * Math.sin(t), dy: 4, text: lab, cls: 'vm-tick', keepInside: false });
  });
  out.push({ id: 'origin', type: 'dot', x: 0, y: 0, r: 2.5, cls: '' });
  return out;
}

// ------------------------------------------------------------------ module

const mod = {
  id: 'von-mises',
  name: 'Von Mises',
  kind: 'continuous',
  params,

  pdf,
  cdf,
  sf: (x, p) => 1 - cdf(x, p),
  quantile: (u, p) => quantileContinuous(x => cdf(x, p), u, -PI, PI),
  sample: (rng, { mu, kappa }) => rng.vonMises(mu, kappa),

  testParams: [{ mu: 2.5, kappa: 5 }, { mu: -1, kappa: 0 }, { mu: 3, kappa: 20 }, { mu: 0.5, kappa: 0.3 }, { mu: -3.1, kappa: 1.2 }],

  range: () => [-PI, PI],
  support: () => [-PI, PI],

  stats({ mu, kappa }) {
    const A = meanResultant(kappa);
    return {
      // linear moments and the median depend on where the circle is cut; see the header comment
      mean: NaN, variance: NaN, sd: NaN, median: NaN,
      mode: wrapAngle(mu),
      skewness: 0,          // the density is symmetric about mu (circular skewness 0)
      exKurtosis: NaN,
      entropy: Math.log(TWO_PI * besselI0e(kappa)) + kappa * (1 - A),
    };
  },

  // Handles:
  //  - a vertical line at the mean direction mu;
  //  - a horizontal arrow from mu to the point where the density is halfway between its peak and its lowest
  //    value (the half-width at half height); drag its tip to change kappa. The arrow points toward the
  //    middle of the window so that it never leaves the plot.
  handles: [
    { type: 'vline', param: 'mu' },
    {
      type: 'hArrow', param: 'kappa', label: 'κ',
      ariaLabel: 'Concentration κ: the arrow is the half-width of the peak. Drag the tip, or use the arrow keys.',
      from: p => ({ x: p.mu, y: halfLevel(p) }),
      to: p => ({ x: p.mu + (p.mu > 0 ? -1 : 1) * halfWidth(p.kappa), y: halfLevel(p) }),
      set: (pt, p) => ({ kappa: kappaFromHalfWidth(Math.abs(pt.x - p.mu)) }),
    },
  ],

  explorer: {
    xLabel: 'x',
    pdfCaption: 'Probability density  f(x)  of the angle x (radians)',
    cdfCaption: 'Cumulative probability  F(x) = P(−π ≤ X ≤ x)',
    areaDefault: p => clamp(wrapAngle(p.mu), -2.8, 2.8),
    readouts: [
      { label: 'Mean direction μ', value: p => `${fmtN(wrapAngle(p.mu))} rad (${deg(wrapAngle(p.mu))})` },
      { label: 'Mean resultant length A(κ)', value: p => meanResultant(p.kappa) },
      { label: 'Circular variance 1 − A(κ)', value: p => 1 - meanResultant(p.kappa) },
      { label: 'Circular standard deviation', value: p => circSdText(p.kappa) },
      { label: 'Peak height f(μ)', value: p => peak(p.kappa) },
    ],
  },

  customExplorer(container, ctx) {
    const { ui, plot, store } = ctx;
    const { h } = ui;
    ensurePolarStyle();
    const ex = ctx.mountExplorer(container, mod, { store });

    const box = h('div', { class: 'plot-box' });
    const fig = h('figure', { class: 'plot-fig vm-polar' },
      h('figcaption', {}, 'The same density drawn around the circle'), box);
    const text = h('div', { class: 'vm-polar-text', 'aria-live': 'polite' });
    const wrap = h('div', { class: 'vm-polar-wrap' }, fig, text);
    const plots = container.querySelector('.explorer-plots');
    if (plots) plots.after(wrap); else container.append(wrap);

    const R = 1.8, S = 0.42;
    const P = new plot.Plot(box, {
      equalAspect: true, xTicks: false, yTicks: false, ariaLabel: 'Von Mises density drawn around the circle',
      height: w => clamp(w * 0.8, 240, 330), margin: { t: 8, r: 8, b: 8, l: 8 },
    });
    const kMax = params.find(q => q.key === 'kappa').max;
    const aMax = meanResultant(kMax);

    function draw() {
      const { p, area } = store.get();
      const f = t => vonMisesPdf(t, p.mu, p.kappa);
      let shade = [];
      if (area.on) {
        const a = clamp(area.a, -PI, PI), b = clamp(area.b, -PI, PI);
        shade = area.mode === 'left' ? [[-PI, a]] : area.mode === 'right' ? [[a, PI]] : [[a, b]];
      }
      const A = meanResultant(p.kappa), mu = p.mu;
      const layers = [
        ...polarLayers(f, { scale: S, fill: true, shade }),
        ...polarFrame(),
        { id: 'vec', type: 'segment', x1: 0, y1: 0, x2: A * Math.cos(mu), y2: A * Math.sin(mu), cls: 'vm-vector' },
      ];
      if (area.on) {
        const edges = area.mode === 'between' ? [area.a, area.b] : [area.a];
        edges.forEach((t, i) => {
          const r = 1 + S * f(t);
          layers.push({ id: 'edge-' + i, type: 'segment', x1: 0, y1: 0, x2: r * Math.cos(t), y2: r * Math.sin(t), cls: 'guide' });
        });
      }
      P.render({
        x: [-R, R], y: [-R, R], layers,
        handles: [{
          id: 'resultant', type: 'point', at: { x: A * Math.cos(mu), y: A * Math.sin(mu) }, label: 'μ, κ',
          ariaLabel: 'Mean resultant vector: its direction is μ and its length grows with κ. Drag it, or use the arrow keys (left and right turn it, up and down change κ).',
          valueText: `μ = ${fmtN(mu)}, κ = ${fmtN(p.kappa)}`, valueNow: mu, valueMin: -PI, valueMax: PI,
          onDrag: (pt, phase) => {
            if (pt) {
              const r = Math.hypot(pt.x, pt.y);
              const patch = { kappa: r < 1e-3 ? 0 : solveMonotone(meanResultant, Math.min(r, aMax), 1e-6, kMax) };
              if (r > 0.02) patch.mu = wrapAngle(Math.atan2(pt.y, pt.x));
              ex.applyParams(patch, 'drag');
            }
            if (phase === 'end') ex.request();
          },
          onKey: (steps, axis) => {
            const cur = store.get().p;
            if (axis === 'y') ex.applyParams({ kappa: Math.round((cur.kappa + 0.1 * steps) * 100) / 100 }, 'key');
            else ex.applyParams({ mu: Math.round(wrapAngle(cur.mu + 0.05 * steps) * 1000) / 1000 }, 'key');
          },
        }],
      });

      const sdc = circSd(p.kappa);
      text.innerHTML = '<p>The circle is the set of directions; the steel curve is drawn outward from it by an amount proportional to the density, so the bulge points toward the mean direction. The linear plot above unrolls this circle, cut at <i>±π</i> (the left side here).</p>'
        + `<p>The arrow from the center is the <i>mean resultant vector</i>, the average of the points (cos <i>X</i>, sin <i>X</i>). Its direction is μ = <b>${fmtN(wrapAngle(mu))}</b> rad (${deg(wrapAngle(mu))}) and its length is A(κ) = <b>${fmtN(A)}</b>. Drag its tip around to turn the distribution, and outward to concentrate it.</p>`
        + `<p>Circular standard deviation: <b>${Number.isFinite(sdc) ? fmtN(sdc) + ' rad (' + deg(sdc) + ')' : '∞'}</b>${p.kappa >= 2 ? `; the normal approximation gives 1/√κ = <b>${fmtN(1 / Math.sqrt(p.kappa))}</b> rad` : ''}.</p>`;
    }
    let raf = 0;
    const request = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; draw(); }); };
    let last = store.get();
    store.subscribe(s => { if (s.p !== last.p || s.area !== last.area) { last = s; request(); } });
    draw();
    return ex;
  },

  content: {
    description: [
      'The von Mises distribution describes an angle: a direction on a circle, such as a compass heading, the time of day on a 24-hour clock, the phase of an oscillation, or the error in recalling the orientation of a line. Its values are angles in radians, written here between $-\\pi$ and $\\pi$; an angle and the same angle plus $2\\pi$ are the same direction, so the two ends of this interval are the same point on the circle.',
      'It is the circular counterpart of the normal distribution. The density is a single smooth bump around the mean direction $\\mu$, and the concentration $\\kappa$ sets how tightly the angles cluster around it. With $\\kappa = 0$ every direction is equally likely (the uniform distribution on the circle); as $\\kappa$ grows the bump narrows, and for large $\\kappa$ it is close to a normal distribution with mean $\\mu$ and variance $1/\\kappa$.',
      'It is named after Richard von Mises, who introduced it in 1918. Because the circle has no beginning or end, ordinary summaries such as the average of the angle numbers do not work (the average of $179^\\circ$ and $-179^\\circ$ is $0^\\circ$, the opposite direction). Circular statistics use the mean direction and the mean resultant length instead; these appear in the properties table below.',
    ],
    explorerIntro: 'The left plot shows the density $f(x)$ of the angle over one turn of the circle, from $-\\pi$ to $\\pi$, and the right plot the cumulative probability from $-\\pi$ up to $x$. Drag the dashed amber line to move the mean direction $\\mu$. Drag the tip of the amber arrow to change the concentration $\\kappa$: the arrow runs from $\\mu$ to the point where the density is halfway between its peak and its lowest value, so a shorter arrow means a narrower peak and a larger $\\kappa$ (the arrow is $\\pi/2$ long when $\\kappa = 0$). The polar plot below draws the same density around the circle. Its amber knob is the tip of the mean resultant vector: drag it around the circle to set $\\mu$ and toward the rim to increase $\\kappa$. When the mean direction is near $\\pm\\pi$ the bump wraps around: part of it appears at the left end of the linear plot and part at the right end.',

    pdfTex: 'f(x \\mid \\mu, \\kappa) = \\frac{e^{\\kappa \\cos(x - \\mu)}}{2\\pi\\, I_0(\\kappa)}, \\qquad x \\in [-\\pi, \\pi)',
    glossary: [
      { sym: 'x', meaning: 'An angle in radians, between $-\\pi$ and $\\pi$. One full turn is $2\\pi$ radians ($360^\\circ$), so $x = \\pi/2$ is a quarter turn ($90^\\circ$).' },
      { sym: 'f(x \\mid \\mu, \\kappa)', meaning: 'The probability density at the angle $x$. The probability that the angle falls in an arc is the area under the density over that arc.' },
      { sym: '\\mu', meaning: 'The mean direction: the angle where the density peaks.' },
      { sym: '\\kappa', meaning: 'The concentration, $\\kappa \\ge 0$. Larger values give a narrower, taller peak; $\\kappa = 0$ gives the uniform distribution on the circle. For large $\\kappa$ it acts like $1/\\sigma^2$, one over a variance.' },
      { sym: '\\cos(x - \\mu)', meaning: 'The cosine of the angle between $x$ and the mean direction. It is 1 at $x = \\mu$ and $-1$ in the opposite direction, and it repeats every $2\\pi$, which makes the density wrap around the circle smoothly.' },
      { sym: 'e^{(\\cdot)}', meaning: 'The exponential function, with $e \\approx 2.71828$.' },
      { sym: 'I_0(\\kappa)', meaning: 'The modified Bessel function of the first kind of order 0, $I_0(\\kappa) = \\frac{1}{2\\pi}\\int_{-\\pi}^{\\pi} e^{\\kappa\\cos t}\\,dt = \\sum_{m \\ge 0} \\frac{(\\kappa/2)^{2m}}{(m!)^2}$. It is the area under $e^{\\kappa\\cos(x - \\mu)}$ divided by $2\\pi$, so dividing by $2\\pi I_0(\\kappa)$ makes the total area 1. $I_0(0) = 1$.' },
      { sym: '\\pi', meaning: 'The constant 3.14159…; $2\\pi$ is the length of one full turn of the unit circle.' },
    ],

    cdfTex: 'F(x) = P(-\\pi \\le X \\le x) = \\int_{-\\pi}^{x} f(t)\\,dt = \\frac{1}{2\\pi}\\Big[\\,x + \\pi + 2\\sum_{n=1}^{\\infty} \\frac{I_n(\\kappa)}{I_0(\\kappa)}\\,\\frac{\\sin n(x - \\mu) + \\sin n(\\pi + \\mu)}{n}\\Big]',
    cdfIntro: 'The CDF has no closed form. It depends on where the circle is cut; here the angle is measured from $-\\pi$. Writing the density as a Fourier series, $f(t) = \\frac{1}{2\\pi}\\big[1 + 2\\sum_{n \\ge 1} \\frac{I_n(\\kappa)}{I_0(\\kappa)} \\cos n(t - \\mu)\\big]$, and integrating term by term gives the series below. The ratios $I_n/I_0$ shrink quickly with $n$, so a few dozen terms give full accuracy; they are computed by a backward recurrence.',
    cdfGlossary: [
      { sym: 'F(x)', meaning: 'The probability that the angle lies between $-\\pi$ and $x$: the area under the density from the left end of the interval up to $x$.' },
      { sym: 'P(-\\pi \\le X \\le x)', meaning: 'The probability that the random angle $X$ is at least $-\\pi$ and at most $x$.' },
      { sym: 't', meaning: 'The variable of integration, running over angles from $-\\pi$ to $x$.' },
      { sym: 'I_n(\\kappa)', meaning: 'The modified Bessel function of order $n$. The ratio $I_n(\\kappa)/I_0(\\kappa)$ equals $\\mathrm{E}[\\cos n(X - \\mu)]$, the $n$-th trigonometric moment; it is between 0 and 1 and falls off quickly as $n$ grows.' },
      { sym: 'n', meaning: 'The index of the sum, $n = 1, 2, 3, \\dots$; term $n$ describes features of the density that repeat $n$ times around the circle.' },
      { sym: '\\sin n(x - \\mu)', meaning: 'The sine of $n$ times the angle between $x$ and $\\mu$.' },
      { sym: '\\mu,\\ \\kappa,\\ \\pi', meaning: 'The mean direction, the concentration and the constant 3.14159…, as in the density.' },
    ],

    extraFormulas: [
      {
        title: 'Mean resultant vector and circular summaries',
        intro: 'Each angle $X$ corresponds to the point $(\\cos X, \\sin X)$ on the unit circle. The average of these points is the mean resultant vector. Its direction is the mean direction and its length measures concentration; for the von Mises distribution:',
        tex: '\\mathrm{E}[(\\cos X, \\sin X)] = A(\\kappa)\\,(\\cos\\mu, \\sin\\mu), \\qquad A(\\kappa) = \\frac{I_1(\\kappa)}{I_0(\\kappa)}',
        glossary: [
          { sym: '(\\cos X, \\sin X)', meaning: 'The point on the unit circle in the direction $X$.' },
          { sym: 'A(\\kappa)', meaning: 'The mean resultant length, between 0 and 1: 0 for $\\kappa = 0$ (no preferred direction) and close to 1 for a tight cluster. For large $\\kappa$, $A(\\kappa) \\approx 1 - 1/(2\\kappa)$.' },
          { sym: 'I_1(\\kappa)', meaning: 'The modified Bessel function of order 1; $I_1(\\kappa) = I_0\'(\\kappa)$.' },
        ],
      },
      {
        title: 'Maximum-likelihood estimates',
        intro: 'For angles $x_1, \\dots, x_n$, let $\\bar C = \\frac1n\\sum \\cos x_i$, $\\bar S = \\frac1n\\sum \\sin x_i$ and $\\bar R = \\sqrt{\\bar C^2 + \\bar S^2}$. The estimate of $\\mu$ is the direction of $(\\bar C, \\bar S)$, and the estimate of $\\kappa$ solves $A(\\hat\\kappa) = \\bar R$ (numerically; with small samples $\\hat\\kappa$ is biased upward):',
        tex: '\\hat\\mu = \\operatorname{atan2}(\\bar S, \\bar C), \\qquad A(\\hat\\kappa) = \\bar R',
        glossary: [
          { sym: '\\bar C,\\ \\bar S', meaning: 'The averages of the cosines and of the sines of the observed angles: the two coordinates of the sample mean resultant vector.' },
          { sym: '\\bar R', meaning: 'The sample mean resultant length, between 0 and 1.' },
          { sym: '\\operatorname{atan2}(\\bar S, \\bar C)', meaning: 'The angle of the point $(\\bar C, \\bar S)$, between $-\\pi$ and $\\pi$.' },
          { sym: '\\hat\\mu,\\ \\hat\\kappa', meaning: 'The maximum-likelihood estimates of $\\mu$ and $\\kappa$.' },
        ],
      },
    ],

    properties: [
      { name: 'Support', tex: 'x \\in [-\\pi, \\pi)', explain: 'One full turn of the circle. Any interval of length $2\\pi$ would do, since $x$ and $x + 2\\pi$ are the same direction.' },
      { name: 'Mean', tex: '\\text{mean direction } \\mu', value: p => wrapAngle(p.mu), explain: 'For angles the ordinary average is not used, because it depends on where the circle is cut. The mean direction is the direction of the mean resultant vector $\\mathrm{E}[(\\cos X, \\sin X)]$, which is $\\mu$.' },
      { name: 'Median', tex: '\\mu', value: p => wrapAngle(p.mu), explain: 'The circular median: the diameter through $\\mu$ splits the circle into two halves of equal probability, and $\\mu$ is on the side with more density.' },
      { name: 'Mode', tex: '\\mu', value: p => wrapAngle(p.mu), explain: 'The density is highest at $\\mu$ (for $\\kappa > 0$) and lowest in the opposite direction $\\mu + \\pi$. With $\\kappa = 0$ every angle is a mode.' },
      { name: 'Variance', tex: '\\text{circular variance } V = 1 - A(\\kappa)', value: p => 1 - meanResultant(p.kappa), explain: 'The circular variance is between 0 (all angles equal) and 1 (no concentration at all). For large $\\kappa$ it is about $1/(2\\kappa)$, and $2V \\approx 1/\\kappa$ is close to the ordinary variance of $X - \\mu$.' },
      { name: 'Standard deviation', tex: '\\text{circular sd} = \\sqrt{-2\\ln A(\\kappa)}', value: p => circSd(p.kappa), explain: 'In radians. It is infinite for $\\kappa = 0$, and about $1/\\sqrt{\\kappa}$ for large $\\kappa$, the standard deviation of the normal approximation.' },
      { name: 'Skewness', tex: '0', value: () => 0, explain: 'The density is symmetric about $\\mu$.' },
      { name: 'Excess kurtosis', tex: '\\text{not used for angles}', explain: 'The ordinary kurtosis of the number $x$ depends on where the circle is cut. The shape is instead described by the second trigonometric moment $\\mathrm{E}[\\cos 2(X - \\mu)] = I_2(\\kappa)/I_0(\\kappa)$ (see the characteristic function row). For large $\\kappa$ the shape approaches the normal curve, whose excess kurtosis is 0.' },
      { name: 'Entropy', tex: '\\ln\\!\\big(2\\pi I_0(\\kappa)\\big) - \\kappa A(\\kappa)', value: p => Math.log(TWO_PI * besselI0e(p.kappa)) + p.kappa * (1 - meanResultant(p.kappa)), explain: 'Differential entropy in nats. It is largest, $\\ln 2\\pi \\approx 1.838$, for $\\kappa = 0$. Among all distributions on the circle with a given mean resultant vector, the von Mises has the largest entropy, just as the normal does on the line for a given mean and variance.' },
      { name: 'Moment-generating function', tex: '\\text{not used for angles}', explain: 'An angle is defined only up to whole turns of $2\\pi$, so $\\mathrm{E}[e^{tX}]$ would depend on how the angle happens to be written. The trigonometric moments in the next row take its place.' },
      { name: 'Characteristic function', tex: '\\mathrm{E}[e^{inX}] = \\frac{I_n(\\kappa)}{I_0(\\kappa)}\\, e^{in\\mu}, \\quad n = 0, \\pm1, \\pm2, \\dots', value: p => `n = 2: ${fmtN(besselRatios(p.kappa)[2] ?? 0)}`, explain: 'On the circle the characteristic function is needed only at whole numbers $n$ (the trigonometric moments), where $i = \\sqrt{-1}$. The value column shows the length $I_2(\\kappa)/I_0(\\kappa)$ for $n = 2$.' },
      { name: 'Mean resultant length', tex: 'A(\\kappa) = I_1(\\kappa)/I_0(\\kappa)', value: p => meanResultant(p.kappa), explain: 'The length of the average point $(\\cos X, \\sin X)$: 0 for no concentration, near 1 for a tight cluster. It increases with $\\kappa$, so $\\kappa$ can be read off from it.' },
      { name: 'Peak height', tex: 'f(\\mu) = \\frac{e^{\\kappa}}{2\\pi I_0(\\kappa)}', value: p => peak(p.kappa), explain: 'Equal to $1/(2\\pi) \\approx 0.1592$ when $\\kappa = 0$, and about $\\sqrt{\\kappa/(2\\pi)}$ for large $\\kappa$, the peak of a normal density with variance $1/\\kappa$.' },
      { name: 'Normal approximation', tex: 'X \\approx \\mathcal N(\\mu, 1/\\kappa) \\ \\text{ for large } \\kappa', value: p => (p.kappa > 0 ? `σ = 1/√κ = ${fmtN(1 / Math.sqrt(p.kappa))}` : 'none'), explain: 'Good once $\\kappa$ is above about 10, when nearly all the probability lies within $\\pm\\pi/2$ of $\\mu$. A rough rule converts a standard deviation $\\sigma$ in radians to $\\kappa \\approx 1/\\sigma^2$.' },
    ],

    limits: [
      { text: '<b>Large concentration: approximately normal.</b> As $\\kappa \\to \\infty$, $\\sqrt\\kappa\\,(X - \\mu)$ approaches the standard normal, so a concentrated von Mises distribution is close to $\\mathcal N(\\mu, 1/\\kappa)$. Near the mean direction the circle looks like a straight line, and $\\cos(x - \\mu) \\approx 1 - (x - \\mu)^2/2$ turns the density into a normal curve.', relation: 'von-mises--normal', to: 'normal' },
      { text: '<b>Zero concentration: uniform on the circle.</b> With $\\kappa = 0$ the density is $1/(2\\pi)$ for every angle, the uniform distribution $\\mathrm U(-\\pi, \\pi)$, whatever $\\mu$ is.', relation: 'von-mises--uniform', to: 'uniform' },
      { text: '<b>Wrapped normal.</b> Wrapping a normal variable around the circle (taking $X \\bmod 2\\pi$) gives the wrapped normal distribution, the other common “circular normal”. It is very close to the von Mises distribution with the same mean resultant length, that is, with $\\sigma^2 = -2\\ln A(\\kappa)$. The von Mises is usually preferred because its density has a simple closed form.' },
      { text: '<b>A normal point conditioned on the circle.</b> If a point in the plane has independent normal coordinates with means $(m\\cos\\mu, m\\sin\\mu)$ and common variance $\\sigma^2$, then its direction, given that the point lies on the unit circle, is von Mises with mean direction $\\mu$ and $\\kappa = m/\\sigma^2$.' },
      { text: '<b>Higher dimensions.</b> The von Mises–Fisher distribution extends it to directions on a sphere (for example in three dimensions, or unit-length vectors in machine learning); on the circle it is the von Mises distribution.' },
    ],

    uses: {
      frequentist: [
        '<b>Rayleigh test of uniformity.</b> Tests whether angles have any preferred direction, with the von Mises as the alternative to the uniform ($\\kappa = 0$). The statistic is $2n\\bar R^2$, approximately $\\chi^2_2$ under uniformity; it is the standard test for phase locking of spikes to an oscillation and for orientation in animal navigation.',
        '<b>V-test.</b> A version of the Rayleigh test for when a specific mean direction is expected in advance.',
        '<b>Watson–Williams test.</b> Compares the mean directions of two or more von Mises samples with a common concentration; it plays the role of the t-test and one-way ANOVA for angles.',
        '<b>Estimation.</b> Maximum likelihood gives the sample mean direction for $\\mu$ and solves $A(\\hat\\kappa) = \\bar R$ for $\\kappa$; confidence intervals for the mean direction use the approximate normality of $\\hat\\mu$ with standard error about $1/\\sqrt{n\\hat\\kappa A(\\hat\\kappa)}$.',
        '<b>Goodness of fit and circular regression.</b> Watson’s $U^2$ and Kuiper’s tests check the fit of a von Mises model; circular regression models a mean direction that depends on covariates through a link such as $\\mu_i = \\mu_0 + 2\\arctan(\\beta^\\top z_i)$.',
      ],
      bayesian: [
        '<b>Conjugate prior for the mean direction.</b> With $\\kappa$ known and prior $\\mu \\sim \\mathrm{VonMises}(\\mu_0, \\kappa_0)$, the posterior is von Mises again. Writing directions as complex numbers, $\\kappa_n e^{i\\mu_n} = \\kappa_0 e^{i\\mu_0} + \\kappa \\sum_{j} e^{ix_j}$: the posterior mean direction $\\mu_n$ and concentration $\\kappa_n$ are the direction and length of the sum of the prior vector and the data vectors weighted by $\\kappa$.',
        '<b>Priors on concentration.</b> The conjugate prior for $\\kappa$ is not a standard distribution, so in practice $\\kappa$ gets a gamma, half-normal or log-normal prior and the posterior is sampled with MCMC (Stan has a built-in <code>von_mises</code> distribution).',
        '<b>Hierarchical models for circular data.</b> Participant-level mean directions and concentrations are given group-level distributions, for example in working-memory and perception experiments.',
        '<b>Posterior predictive checks.</b> Simulated angles from the fitted von Mises are compared with the observed ones, for example on a circular histogram.',
      ],
      modeling: [
        '<b>Visual working memory.</b> In continuous-report tasks, the error in reproducing a remembered color or orientation is modeled as a mixture of a von Mises (remembered items) and a uniform (random guesses) distribution (Zhang &amp; Luck, 2008). Extensions add swap errors toward other items (Bays, Catalao &amp; Husain, 2009) or let the precision $\\kappa$ vary from trial to trial (van den Berg et al., 2012).',
        '<b>Neural tuning curves.</b> The firing rate of orientation-tuned and head-direction cells is often described by a von Mises-shaped curve, $r(\\theta) = r_0 + r_{\\max} e^{\\kappa(\\cos(\\theta - \\theta_{\\text{pref}}) - 1)}$. For orientations, which repeat every $\\pi$, the angle is doubled first.',
        '<b>Phase of neural activity.</b> The phase at which spikes occur relative to an ongoing oscillation, such as the hippocampal $\\theta$ rhythm, is summarized by a mean direction and a concentration or resultant length.',
        '<b>Directions in the world.</b> Wind and current directions, animal headings and dispersal, and times of day or year (circadian and seasonal data) are modeled with von Mises distributions and mixtures of them.',
        '<b>Machine learning and robotics.</b> Angles of joints and protein backbones, and orientation estimates in tracking, use von Mises likelihoods; the von Mises–Fisher distribution is used for unit-length embedding vectors.',
      ],
    },

    references: [
      { text: 'Wikipedia: Von Mises distribution.', url: 'https://en.wikipedia.org/wiki/Von_Mises_distribution' },
      { text: 'Wikipedia: Directional statistics.', url: 'https://en.wikipedia.org/wiki/Directional_statistics' },
      { text: 'Mardia, K. V., &amp; Jupp, P. E. (2000). <i>Directional Statistics</i>, Chapters 3, 5 and 7. Wiley.' },
      { text: 'Fisher, N. I. (1993). <i>Statistical Analysis of Circular Data</i>. Cambridge University Press.' },
      { text: 'Best, D. J., &amp; Fisher, N. I. (1979). Efficient simulation of the von Mises distribution. <i>Applied Statistics</i>, 28(2), 152–157.', url: 'https://doi.org/10.2307/2346732' },
      { text: 'Zhang, W., &amp; Luck, S. J. (2008). Discrete fixed-resolution representations in visual working memory. <i>Nature</i>, 453, 233–235.', url: 'https://doi.org/10.1038/nature06860' },
      { text: 'Bays, P. M., Catalao, R. F. G., &amp; Husain, M. (2009). The precision of visual working memory is set by allocation of a shared resource. <i>Journal of Vision</i>, 9(10):7.', url: 'https://doi.org/10.1167/9.10.7' },
      { text: 'van den Berg, R., Shin, H., Chou, W.-C., George, R., &amp; Ma, W. J. (2012). Variability in encoding precision accounts for visual short-term memory limitations. <i>Proceedings of the National Academy of Sciences</i>, 109(22), 8780–8785.', url: 'https://doi.org/10.1073/pnas.1117465109' },
      { text: 'Gelman, A., Carlin, J. B., Stern, H. S., Dunson, D. B., Vehtari, A., &amp; Rubin, D. B. (2013). <i>Bayesian Data Analysis</i> (3rd ed.). CRC Press.', url: 'http://www.stat.columbia.edu/~gelman/book/' },
      { text: 'NIST Digital Library of Mathematical Functions, §10.25 (modified Bessel functions).', url: 'https://dlmf.nist.gov/10.25' },
    ],
  },
};

export default mod;

function circSd(kappa) {
  const A = meanResultant(kappa);
  return A > 0 ? Math.sqrt(-2 * Math.log(A)) : Infinity;
}
function circSdText(kappa) {
  const s = circSd(kappa);
  return Number.isFinite(s) ? `${fmtN(s)} rad (${deg(s)})` : '∞';
}
function fmtN(v) { return String(Number(Number(v).toPrecision(4))).replace(/^-/, '−'); }
