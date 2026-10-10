// Student's t distribution (standard form: location 0, scale 1) with nu degrees of freedom.
// Follows the structure of the reference module dists/normal.js (see ARCHITECTURE.md).
//
// This file also exports `testExplorer`, a small wrapper around the standard explorer that adds a
// "Hypothesis test" box (critical values for a chosen level, a shaded rejection region, and the
// p-value of an observed statistic read from the area tool, including the mirror-image tail of a
// two-sided test). The chi-squared and F modules use it too. (A core version of this is listed as a
// CORE REQUEST in the batch report.)

import { catalogParams } from '../catalog.js';
import { lgamma, lbeta, digamma, betaI, betaIc, betaIinv, normalPdf, normalCdf, solveMonotone, PI } from '../core/math.js';

const LN_PI = Math.log(PI);

/** log density of t_nu at x */
function logPdf(x, nu) {
  return lgamma((nu + 1) / 2) - lgamma(nu / 2) - 0.5 * (Math.log(nu) + LN_PI) - (nu + 1) / 2 * Math.log1p(x * x / nu);
}
function pdf(x, { nu }) { return Math.exp(logPdf(x, nu)); }
/** peak height f(0) */
const peak = nu => Math.exp(logPdf(0, nu));

/** P(T > |x|), computed without cancellation in either tail. */
function upperTail(x, nu) {
  const x2 = x * x;
  if (!Number.isFinite(x2)) return 0;
  if (x2 < nu) return 0.5 * betaIc(x2 / (nu + x2), 0.5, nu / 2);
  return 0.5 * betaI(nu / (nu + x2), nu / 2, 0.5);
}
function cdf(x, { nu }) {
  if (Number.isNaN(x)) return NaN;
  if (x === 0) return 0.5;
  const t = upperTail(x, nu);
  return x < 0 ? t : 1 - t;
}
function sf(x, p) { return cdf(-x, p); }
function quantile(u, { nu }) {
  if (u <= 0) return -Infinity;
  if (u >= 1) return Infinity;
  if (u === 0.5) return 0;
  const tail = Math.min(u, 1 - u), sign = u < 0.5 ? -1 : 1;
  let x;
  if (tail < 0.25) {
    // tail = (1/2) I_z(nu/2, 1/2) with z = nu / (nu + x^2)
    const z = betaIinv(2 * tail, nu / 2, 0.5);
    x = Math.sqrt(nu * (1 - z) / z);
  } else {
    // 1 - 2 tail = P(|T| < x) = I_w(1/2, nu/2) with w = x^2 / (nu + x^2)
    const w = betaIinv(1 - 2 * tail, 0.5, nu / 2);
    x = Math.sqrt(nu * w / (1 - w));
  }
  return sign * x;
}

function stats({ nu }) {
  const variance = nu > 2 ? nu / (nu - 2) : nu > 1 ? Infinity : NaN;
  return {
    mean: nu > 1 ? 0 : NaN,
    variance,
    sd: Math.sqrt(variance),
    median: 0,
    mode: 0,
    skewness: nu > 3 ? 0 : NaN,
    exKurtosis: nu > 4 ? 6 / (nu - 4) : nu > 2 ? Infinity : NaN,
    entropy: (nu + 1) / 2 * (digamma((nu + 1) / 2) - digamma(nu / 2)) + 0.5 * Math.log(nu) + lbeta(nu / 2, 0.5),
  };
}

// --------------------------------------------------------------------------------------------
// Hypothesis-test box shared by the t, chi-squared and F pages
// --------------------------------------------------------------------------------------------

/**
 * Mount the standard explorer plus a "Hypothesis test" box.
 * cfg: {
 *   stat: 't'                 plain-text name of the test statistic (t, χ², F)
 *   rv: 'T'                   name of the random variable in the readout (default X)
 *   symmetric: true           the distribution is symmetric about 0 (two-sided test uses |stat|)
 *   sides: [{value, label}]   'two' | 'upper' | 'lower'
 *   defaultSide
 *   sideText: {two, upper, lower}   short plain description of each kind of test
 *   critParam: 'nu'           optional: add a handle on the critical value that sets this parameter
 *                             (only for a symmetric distribution whose critical value decreases in it)
 * }
 */
export function testExplorer(container, ctx, cfg) {
  const { ui, store, dist: mod, plot } = ctx;
  const { h, fmt } = ui;
  const T = { alpha: 0.05, side: cfg.defaultSide || cfg.sides[0].value, show: true };
  const st = cfg.stat;
  const fmtA = a => a.toFixed(2);
  let ex = null;

  // p-values are tail areas, so the area tool starts on the tail that matches the default test
  const modeFor = side => (side === 'lower' ? 'left' : 'right');
  store.set({ area: { ...store.get().area, mode: modeFor(T.side) } });

  /** critical values for the current test: [{x, tail: 'left'|'right', prob}] */
  function criticals(p) {
    const a = T.alpha;
    if (T.side === 'upper') return [{ x: mod.quantile(1 - a, p), tail: 'right', prob: a }];
    if (T.side === 'lower') return [{ x: mod.quantile(a, p), tail: 'left', prob: a }];
    return [{ x: mod.quantile(a / 2, p), tail: 'left', prob: a / 2 }, { x: mod.quantile(1 - a / 2, p), tail: 'right', prob: a / 2 }];
  }
  /** p-value of an observed statistic x for the current kind of test */
  function pValue(x, p) {
    const F = mod.cdf(x, p), S = mod.sf ? mod.sf(x, p) : 1 - F;
    if (T.side === 'upper') return S;
    if (T.side === 'lower') return F;
    return Math.min(1, 2 * Math.min(F, S));
  }

  /** knob and handle-line obstacles (in data units) that the critical-value labels must avoid */
  function obstacles(p, view) {
    const out = [];
    const hs = typeof wrapped.handles === 'function' ? wrapped.handles(p) : (wrapped.handles || []);
    for (const s of hs) {
      try {
        if (s.type === 'vline') out.push({ kind: 'vline', x: s.x ? s.x(p) : p[s.param] });
        else if (s.type === 'point') { const a = s.at(p); out.push({ kind: 'knob', x: a.x, y: a.y }); }
        else if (s.type === 'vArrow') { const a = s.from(p), b = s.to(p); out.push({ kind: 'vseg', x: a.x, y1: a.y, y2: b.y }); }
        else if (s.type === 'hArrow') { const b = s.to(p); out.push({ kind: 'knob', x: b.x, y: b.y }); }
      } catch (_) { /* ignore */ }
    }
    return out.filter(o => Number.isFinite(o.x) && o.x >= view.x[0] && o.x <= view.x[1]);
  }

  /**
   * Place a text label next to each critical line without covering the curve, a handle or another label.
   * Tries several heights on the outer side, then the inner side, then a shorter text, then a corner of the plot.
   */
  function placeLabels(items, p, view, f) {
    const P = ex && ex.plots ? ex.plots.pdf : null;
    const W = P && P.width ? P.width : 480, H = P && P.height ? P.height : 300;
    const m = P ? P.margin : { l: 52, r: 18, t: 26, b: 44 };
    const [lo, hi] = view.x, [y0, y1] = view.y;
    const sx = x => m.l + (x - lo) / (hi - lo) * (W - m.l - m.r);
    const sy = y => H - m.b - (y - y0) / (y1 - y0) * (H - m.t - m.b);
    const ix = px => lo + (px - m.l) / (W - m.l - m.r) * (hi - lo);
    const iy = py => y0 + (H - m.b - py) / (H - m.t - m.b) * (y1 - y0);
    const boxes = obstacles(p, view).map(o => {
      if (o.kind === 'vline') return [{ x0: sx(o.x) - 5, x1: sx(o.x) + 5, y0: m.t - 14, y1: H - m.b }, { x0: sx(o.x) - 11, x1: sx(o.x) + 11, y0: m.t - 30, y1: m.t + 11 }];
      if (o.kind === 'vseg') return { x0: sx(o.x) - 14, x1: sx(o.x) + 14, y0: sy(Math.max(o.y1, o.y2)) - 12, y1: sy(Math.min(o.y1, o.y2)) };
      return { x0: sx(o.x) - 13, x1: sx(o.x) + 13, y0: sy(o.y) - 13, y1: sy(o.y) + 13 };
    }).flat();
    const hit = b => boxes.some(c => c.x0 < b.x1 && b.x0 < c.x1 && c.y0 < b.y1 && b.y0 < c.y1);
    const clearOfCurve = b => {
      for (let k = 0; k <= 16; k++) {
        const v = f(ix(b.x0 + (b.x1 - b.x0) * k / 16));
        if (!(sy(Math.min(v, 10 * y1)) > b.y1 + 2)) return false;
      }
      return true;
    };
    const fracs = [0.93, 0.82, 0.71, 0.6, 0.49, 0.38];
    const out = [];
    items.forEach((it, i) => {
      const px = sx(it.x);
      let best = null;
      search: for (const text of [it.text, it.short]) {
        const w = text.length * 6.9 + 4;
        for (const s of it.tail === 'right' ? [1, -1] : [-1, 1]) {
          for (const fr of fracs) {
            const x0 = s > 0 ? px + 5 : px - 5 - w;
            const base = m.t + (1 - fr) * (H - m.t - m.b);
            const b = { x0, x1: x0 + w, y0: base - 12, y1: base + 3 };
            if (b.x0 < m.l + 2 || b.x1 > W - m.r - 2 || !clearOfCurve(b) || hit(b)) continue;
            best = { b, text, x: it.x, dx: s > 0 ? 5 : -5, anchor: s > 0 ? 'start' : 'end', base, line: true };
            break search;
          }
        }
      }
      if (!best) {
        // a free corner of the plot, with the side named
        const text = `${it.text} (${it.tail === 'left' ? 'lower' : 'upper'})`;
        const w = text.length * 6.9 + 4;
        for (const right of [true, false]) {
          for (const fr of fracs) {
            const base = m.t + (1 - fr) * (H - m.t - m.b);
            const x0 = right ? W - m.r - 4 - w : m.l + 4;
            const b = { x0, x1: x0 + w, y0: base - 12, y1: base + 3 };
            if (!clearOfCurve(b) || hit(b)) continue;
            best = { b, text, x: ix(right ? W - m.r - 4 : m.l + 4), dx: 0, anchor: right ? 'end' : 'start', base, line: false };
            break;
          }
          if (best) break;
        }
      }
      if (!best) best = { b: null, text: it.short, x: it.x, dx: 5, anchor: 'start', base: m.t + 0.07 * (H - m.t - m.b), line: true };
      if (best.b) boxes.push(best.b);
      const y = iy(best.base);
      out.push({ id: `crit-t-${i}`, type: 'text', x: best.x, y, dx: best.dx, anchor: best.anchor, text: best.text, cls: 'crit-label' });
      // the dotted critical line runs up to its label (or most of the way up when the label is in a corner)
      out.push({ id: `crit-${i}`, type: 'segment', x1: it.x, y1: 0, x2: it.x, y2: best.line ? iy(best.base - 4) : y0 + 0.8 * (y1 - y0), cls: 'mean-line' });
    });
    return out;
  }

  function testLayers(p, view) {
    const [lo, hi] = view.x, top = view.y[1];
    const out = [];
    const f = x => { const v = mod.pdf(x, p); return Number.isFinite(v) ? v : top * 4; };
    let shaded = false;
    if (T.show) {
      const items = [];
      criticals(p).forEach((c, i) => {
        if (!(c.x > lo && c.x < hi)) return;
        const [a, b] = c.tail === 'right' ? [c.x, hi] : [lo, c.x];
        // the rejection region: a steel-tinted area outlined in steel
        const pts = plot.sampleFn(f, a, b, 140);
        out.push({ id: `rej-${i}`, type: 'polygon', points: [[a, 0], ...pts, [b, 0]], cls: 'fill-steel' });
        // the critical value that carries a handle is already labeled by the handle, so it gets the number only
        const onHandle = critHandle && (T.side === 'lower' ? c.tail === 'left' : c.tail === 'right');
        items.push({ x: c.x, tail: c.tail, text: onHandle ? fmt(c.x, 4) : `${st}* = ${fmt(c.x, 4)}`, short: fmt(c.x, 4) });
        shaded = true;
      });
      out.push(...placeLabels(items, p, view, f));
    }
    // two-sided test with the area tool on: shade the matching tail on the other side as well
    const ar = store.get().area;
    if (T.side === 'two' && ar.on && ar.mode !== 'between') {
      const F = mod.cdf(ar.a, p);
      const q = ar.mode === 'right' ? (mod.sf ? mod.sf(ar.a, p) : 1 - F) : F;
      if (q <= 0.5 && q > 0) {
        const m = ar.mode === 'right' ? mod.quantile(q, p) : mod.quantile(1 - q, p);
        if (Number.isFinite(m)) {
          const [a, b] = ar.mode === 'right' ? [lo, Math.min(hi, m)] : [Math.max(lo, m), hi];
          if (b > a) {
            out.push({ id: 'mirror', type: 'area', points: plot.sampleFn(f, a, b, 140), cls: 'area-shade' });
            if (m > lo && m < hi) out.push({ id: 'mirror-line', type: 'segment', x1: m, y1: 0, x2: m, y2: f(m), cls: 'guide' });
            shaded = true;
          }
        }
      }
    }
    // redraw the density on top so the shading does not tint it
    if (shaded) out.push({ id: 'pdf-top', type: 'line', points: plot.sampleFn(f, lo, hi, 400), cls: 'curve-main' });
    return out;
  }

  // optional handle on the (upper, or for a lower-tail test the lower) critical value: dragging it sets cfg.critParam
  const critPrm = cfg.critParam ? mod.params.find(q => q.key === cfg.critParam) : null;
  const critQ = () => (T.side === 'two' ? 1 - T.alpha / 2 : 1 - T.alpha);
  const critHandle = critPrm && {
    type: 'vline', param: critPrm.key, id: 'vline-crit', label: `${st}*`,
    x: p => {
      const v = mod.quantile(critQ(), p) * (T.side === 'lower' ? -1 : 1);
      const [a, b] = mod.support(p);
      return v > a && v < b ? v : NaN;
    },
    set: (pt, p) => {
      const target = Math.abs(pt.x);
      if (!(target > 0)) return null;
      const v = solveMonotone(val => mod.quantile(critQ(), { ...p, [critPrm.key]: val }), target, critPrm.min, critPrm.max, { log: true });
      return Number.isFinite(v) ? { [critPrm.key]: v } : null;
    },
    key: 'drag',
    ariaLabel: `Critical value ${st}*, which sets the ${critPrm.name} ${critPrm.label}. Drag it, or use the arrow keys; moving it outward means fewer degrees of freedom.`,
  };

  const base = mod.explorer || {};
  const wrapped = {
    ...mod,
    handles: p => {
      const hs = typeof mod.handles === 'function' ? mod.handles(p) : (mod.handles || []);
      return critHandle && T.show ? [...hs, critHandle] : hs;
    },
    explorer: {
      ...base,
      extraLayers: (p, view) => [...(base.extraLayers ? base.extraLayers(p, view) : []), ...testLayers(p, view)],
    },
  };
  ex = ctx.mountExplorer(container, wrapped, { store });

  const sideCtl = cfg.sides.length > 1 ? ui.segmented(cfg.sides, T.side, v => {
    T.side = v;
    // shade the tail that the p-value of this kind of test is about
    const ar = store.get().area;
    if (v !== 'two' && ar.mode !== 'between' && ar.mode !== modeFor(v) && ex.setArea) ex.setArea({ mode: modeFor(v) });
    refresh();
  }, 'Kind of test') : null;
  const alphaCtl = ui.segmented([0.1, 0.05, 0.01].map(v => ({ value: v, label: `α = ${fmtA(v)}` })), T.alpha,
    v => { T.alpha = v; refresh(); }, 'Significance level α');
  const showCtl = ui.toggleSwitch('Show critical values and rejection region', T.show, on => { T.show = on; refresh(); });
  const out = h('p', { class: 'small test-readout', 'aria-live': 'polite', style: 'margin:.5rem 0 0' });
  const box = h('div', { class: 'test-box', style: 'margin-top:1.3rem' },
    h('h3', { class: 'mini-title' }, 'Hypothesis test'), showCtl.el, sideCtl ? sideCtl.el : null, alphaCtl.el, out);
  const areaBox = container.querySelector('.explorer-area');
  (areaBox || container).append(box);

  function update() {
    const { p, area } = store.get();
    const cs = criticals(p);
    const a = fmtA(T.alpha);
    let html;
    const c = cs.map(v => `<b>${fmt(v.x, 4)}</b>`);
    if (T.side === 'upper') html = `${cfg.sideText.upper} at level α = ${a}: reject the null hypothesis when <i>${st}</i> ≥ ${c[0]}, the point with ${a} of the probability above it.`;
    else if (T.side === 'lower') html = `${cfg.sideText.lower} at level α = ${a}: reject the null hypothesis when <i>${st}</i> ≤ ${c[0]}, the point with ${a} of the probability below it.`;
    else if (cfg.symmetric) html = `${cfg.sideText.two} at level α = ${a}: reject the null hypothesis when |<i>${st}</i>| ≥ ${c[1]}. Each tail beyond ±${fmt(cs[1].x, 4)} holds ${T.alpha / 2}.`;
    else html = `${cfg.sideText.two} at level α = ${a}: reject the null hypothesis when <i>${st}</i> ≤ ${c[0]} or <i>${st}</i> ≥ ${c[1]}. Each tail holds ${T.alpha / 2}.`;
    const [vlo, vhi] = mod.support(p);
    if (cs.some(v => !(v.x >= vlo && v.x <= vhi))) html += cs.length > 1 && cs.some(v => v.x >= vlo && v.x <= vhi) ? ' (One critical value lies beyond the plotted range, so its part of the rejection region is not shown.)' : (cs.length > 1 ? ' (Both critical values lie beyond the plotted range, so the rejection region is not shown.)' : ' (The critical value lies beyond the plotted range, so the rejection region is not shown.)');
    if (area.on) {
      const x = area.a, pv = pValue(x, p);
      const rv = cfg.rv || 'X';
      const what = T.side === 'upper' ? `P(<i>${rv}</i> ≥ ${fmt(x)})` : T.side === 'lower' ? `P(<i>${rv}</i> ≤ ${fmt(x)})`
        : cfg.symmetric ? `P(|<i>${rv}</i>| ≥ ${fmt(Math.abs(x))})` : `twice the smaller tail area, 2 min{P(<i>${rv}</i> ≤ ${fmt(x)}), P(<i>${rv}</i> ≥ ${fmt(x)})}`;
      html += ` If ${fmt(x)} (the area marker) is the observed value, its ${T.side === 'two' ? 'two-sided' : 'one-sided'} p-value is ${what} = <b>${fmt(pv, 3)}</b>, so the test ${pv <= T.alpha ? '<b>rejects</b>' : 'does not reject'} the null hypothesis at α = ${a}.`;
    } else html += ' Turn on the area tool above and drag its marker to an observed value to see its p-value.';
    out.innerHTML = html;
  }
  function refresh() { ex.request(); update(); }
  let last = null;
  store.subscribe(s => { if (s.p !== last?.p || s.area !== last?.area) { last = s; update(); } });
  update();
  // draw once more now that the plot size is known (used to place the labels)
  ex.request();
  return ex;
}

// --------------------------------------------------------------------------------------------

export default {
  id: 'student-t',
  name: "Student's t",
  kind: 'continuous',

  // nu has a log-scaled slider (0.5 to 100); the arrow keys change it in steps of 0.5
  params: catalogParams('student-t', { nu: { step: 0.5, log: true } }),

  pdf,
  cdf,
  sf,
  quantile,
  sample: (rng, { nu }) => rng.studentT(nu),

  testParams: [{ nu: 0.8 }, { nu: 1 }, { nu: 2.5 }, { nu: 4.5 }, { nu: 12 }, { nu: 100 }],

  range: () => [-Infinity, Infinity],
  // heavy tails: a window that shows the shape and the main tail area, about the 1st to 99th percentile
  // when nu is small, and at least -5 to 5 so that the curve can be compared with the normal
  support: p => {
    const q = Math.min(10, Math.max(5, quantile(0.99, p)));
    return [-q, q];
  },

  stats,

  // the amber arrow at x = 0 runs from 0 up to the peak f(0); dragging its tip sets nu from the peak height
  handles: [
    {
      type: 'vArrow', param: 'nu',
      from: () => ({ x: 0, y: 0 }),
      to: p => ({ x: 0, y: peak(p.nu) }),
      set: pt => {
        const nu = solveMonotone(peak, pt.y, 0.5, 100, { log: true });
        return Number.isFinite(nu) ? { nu } : null;
      },
      label: 'ν',
      ariaLabel: 'Degrees of freedom ν, set by the height of the peak. Drag up or down, or use the arrow keys.',
    },
  ],

  explorer: {
    overlays: () => [{ id: 'normal', label: 'Standard normal N(0, 1)', pdf: normalPdf, cdf: normalCdf, cls: 'curve-ref' }],
    areaDefault: () => 2,
    readouts: [
      { label: 'Peak height f(0)', value: p => peak(p.nu) },
      { key: 'variance', label: 'Variance' },
      { label: 'Two-sided 5% critical value', value: p => quantile(0.975, p) },
      { label: 'P(|T| > 1.96)  (normal: 0.05)', value: p => 2 * upperTail(1.959964, p.nu) },
    ],
  },

  customExplorer(container, ctx) {
    return testExplorer(container, ctx, {
      stat: 't',
      rv: 'T',
      symmetric: true,
      critParam: 'nu',
      sides: [{ value: 'two', label: 'Two-sided' }, { value: 'upper', label: 'Upper tail' }, { value: 'lower', label: 'Lower tail' }],
      defaultSide: 'two',
      sideText: { two: 'Two-sided t-test', upper: 'One-sided t-test (upper tail)', lower: 'One-sided t-test (lower tail)' },
    });
  },

  content: {
    description: [
      'Student’s $t$ distribution is a symmetric, bell-shaped distribution centered at 0 that has heavier tails than the normal distribution. It describes a sample mean that has been standardized with the standard deviation estimated from the same data, $t = (\\bar x - \\mu)/(s/\\sqrt n)$, rather than with the true standard deviation. A $t$ variable can take any real value.',
      'Its one parameter is the degrees of freedom $\\nu$ (in a one-sample t-test, $\\nu = n - 1$ for a sample of $n$ values). With few degrees of freedom the estimated standard deviation is itself uncertain, so extreme values of $t$ are much more common than under a normal distribution. As $\\nu$ grows, the $t$ distribution approaches the standard normal; with $\\nu = 1$ it is the Cauchy distribution.',
      'The distribution was derived by William Sealy Gosset, who published it in 1908 under the pen name “Student” while working on small samples at the Guinness brewery in Dublin. It is the reference distribution for t-tests and confidence intervals for means and regression coefficients. Its shifted and rescaled version $\\mu + \\sigma T$ is widely used as a heavy-tailed alternative to the normal, for robust models and as a prior.',
    ],
    explorerIntro: 'The left plot shows the density $f(x)$ of $t_\\nu$ (solid) with the standard normal density for comparison (dashed); the right plot shows the two CDFs. There are two ways to change the degrees of freedom $\\nu$. Drag the tip of the amber arrow at $x = 0$ up or down: its height is the peak height $f(0)$, so a lower peak means fewer degrees of freedom and heavier tails, and the peak approaches the normal peak $1/\\sqrt{2\\pi} \\approx 0.3989$ as $\\nu$ grows. Or drag the dashed amber line marked $t^*$ sideways: it sits on the critical value of the test chosen under <b>Hypothesis test</b>, and moving it outward lowers $\\nu$, because with fewer degrees of freedom a larger $t$ is needed to reject. Both handles move only a few pixels between $\\nu = 30$ and $\\nu = 100$, where the curves are almost the same; use the box there. The critical values at level $\\alpha$ are labeled on the plot (the second one of a two-sided test is a dotted line), and the outlined tails are the rejection region. Turn on the area tool and drag its marker (the triangle marked $x$) to an observed value of $t$ to read off its p-value; for a two-sided test the matching tail on the other side is shaded too.',

    pdfTex: 'f(x \\mid \\nu) = \\frac{\\Gamma\\!\\left(\\frac{\\nu+1}{2}\\right)}{\\sqrt{\\nu\\pi}\\;\\Gamma\\!\\left(\\frac{\\nu}{2}\\right)} \\left(1 + \\frac{x^2}{\\nu}\\right)^{-\\frac{\\nu+1}{2}}',
    glossary: [
      { sym: 'x', meaning: 'A possible value of the random variable $T$. It can be any real number.' },
      { sym: 'f(x \\mid \\nu)', meaning: 'The probability density at $x$ for $\\nu$ degrees of freedom. Probabilities are areas under this curve.' },
      { sym: '\\nu', meaning: 'The degrees of freedom, a positive number (a whole number in most tests). It controls how heavy the tails are.' },
      { sym: '\\Gamma(\\cdot)', meaning: 'The gamma function, which extends the factorial to non-integers: $\\Gamma(n) = (n-1)!$ for whole numbers and $\\Gamma(\\tfrac12) = \\sqrt\\pi$.' },
      { sym: '\\pi', meaning: 'The constant 3.14159…, the ratio of a circle’s circumference to its diameter.' },
      { sym: '\\dfrac{\\Gamma(\\frac{\\nu+1}{2})}{\\sqrt{\\nu\\pi}\\,\\Gamma(\\frac{\\nu}{2})}', meaning: 'The normalizing constant, which makes the total area equal to 1. It is also the height of the peak at $x = 0$.' },
      { sym: '\\left(1 + \\frac{x^2}{\\nu}\\right)^{-\\frac{\\nu+1}{2}}', meaning: 'The shape of the curve. Far from 0 it falls off like the power $|x|^{-(\\nu+1)}$, much more slowly than the normal’s $e^{-x^2/2}$; this is what makes the tails heavy. For large $\\nu$ it is close to $e^{-x^2/2}$.' },
    ],

    cdfTex: 'F(x \\mid \\nu) = \\begin{cases} \\tfrac12\\, I_{\\nu/(\\nu + x^2)}\\!\\left(\\tfrac{\\nu}{2}, \\tfrac12\\right), & x \\le 0, \\\\[4pt] 1 - \\tfrac12\\, I_{\\nu/(\\nu + x^2)}\\!\\left(\\tfrac{\\nu}{2}, \\tfrac12\\right), & x > 0. \\end{cases}',
    cdfGlossary: [
      { sym: 'F(x \\mid \\nu)', meaning: 'The cumulative distribution function: the probability that $T \\le x$, the area under the density to the left of $x$.' },
      { sym: 'I_z(a, b)', meaning: 'The regularized incomplete beta function: the probability that a $\\mathrm{Beta}(a, b)$ variable is at most $z$. It has no elementary formula and is computed numerically (here with a continued fraction).' },
      { sym: '\\frac{\\nu}{\\nu + x^2}', meaning: 'A number between 0 and 1 that is close to 0 far out in the tails. The quantity $I_{\\nu/(\\nu+x^2)}(\\tfrac\\nu2, \\tfrac12)$ is exactly $P(|T| \\ge |x|)$, the two-sided tail area.' },
      { sym: '\\nu', meaning: 'The degrees of freedom.' },
    ],
    cdfIntro: 'The CDF is written with the incomplete beta function. For $\\nu = 1$ it is $\\tfrac12 + \\arctan(x)/\\pi$, and for $\\nu = 2$ it is $\\tfrac12 + x/(2\\sqrt{2 + x^2})$.',

    extraFormulas: [
      {
        title: 'The one-sample t statistic',
        intro: 'For a sample of $n$ independent values from a normal distribution with mean $\\mu_0$, this statistic has the $t_\\nu$ distribution with $\\nu = n - 1$ (see the relationship with the normal distribution).',
        tex: 't = \\frac{\\bar x - \\mu_0}{s / \\sqrt n}, \\qquad s^2 = \\frac{1}{n-1}\\sum_{i=1}^n (x_i - \\bar x)^2, \\qquad \\nu = n - 1',
        glossary: [
          { sym: '\\bar x', meaning: 'The sample mean of the $n$ values $x_1, \\dots, x_n$.' },
          { sym: '\\mu_0', meaning: 'The mean under the null hypothesis being tested.' },
          { sym: 's', meaning: 'The sample standard deviation, which estimates the unknown $\\sigma$. Using $s$ instead of $\\sigma$ is what turns a normal $z$ statistic into a $t$ statistic.' },
          { sym: 's/\\sqrt n', meaning: 'The standard error of the mean.' },
          { sym: 'n', meaning: 'The sample size.' },
        ],
      },
      {
        title: 'Critical values, p-values and confidence intervals',
        intro: 'A two-sided test at level $\\alpha$ rejects when $|t|$ exceeds the critical value $t_{\\nu,\\,1-\\alpha/2}$; the p-value is the probability of a value at least as extreme as the observed one; the confidence interval collects the values $\\mu_0$ that are not rejected.',
        tex: 'p = P(|T| \\ge |t|) = 2\\,[1 - F(|t| \\mid \\nu)], \\qquad \\bar x \\pm t_{\\nu,\\,1-\\alpha/2}\\,\\frac{s}{\\sqrt n}',
        glossary: [
          { sym: 'p', meaning: 'The two-sided p-value of the observed statistic $t$.' },
          { sym: 'T', meaning: 'A random variable with the $t_\\nu$ distribution (the statistic when the null hypothesis is true).' },
          { sym: 't_{\\nu,\\,1-\\alpha/2}', meaning: 'The critical value: the $1 - \\alpha/2$ quantile of $t_\\nu$. For $\\alpha = 0.05$ it is 12.71 for $\\nu = 1$, 2.571 for $\\nu = 5$, 2.228 for $\\nu = 10$, 2.042 for $\\nu = 30$ and approaches 1.960 as $\\nu \\to \\infty$.' },
          { sym: '\\alpha', meaning: 'The significance level, the accepted probability of rejecting a true null hypothesis (often 0.05). The interval has confidence level $1 - \\alpha$.' },
        ],
      },
      {
        title: 'Location–scale t',
        intro: 'Shifting and rescaling gives the three-parameter $t$ used in robust models and as a prior: $Y = \\mu + \\sigma T$.',
        tex: 'f(y \\mid \\mu, \\sigma, \\nu) = \\frac{1}{\\sigma}\\, f\\!\\left(\\frac{y - \\mu}{\\sigma} \\,\\middle|\\, \\nu\\right)',
        glossary: [
          { sym: 'y', meaning: 'A value of the shifted and rescaled variable $Y$.' },
          { sym: '\\mu', meaning: 'The location: the center of the distribution (its median and mode, and its mean when $\\nu > 1$).' },
          { sym: '\\sigma', meaning: 'The scale. It is not the standard deviation: the variance of $Y$ is $\\sigma^2 \\nu/(\\nu - 2)$ when $\\nu > 2$.' },
        ],
      },
    ],

    properties: [
      { name: 'Support', tex: 'x \\in (-\\infty, \\infty)', explain: 'Every real number has positive density.' },
      { name: 'Mean', tex: '\\mathrm{E}[T] = 0 \\quad (\\nu > 1)', value: p => stats(p).mean, explain: 'Defined for $\\nu > 1$. For $\\nu \\le 1$ the tails are so heavy that the mean does not exist (the integral diverges), as for the Cauchy distribution.' },
      { name: 'Median', tex: '0', value: () => 0, explain: 'The curve is symmetric about 0.' },
      { name: 'Mode', tex: '0', value: () => 0, explain: 'The peak of the curve.' },
      { name: 'Variance', tex: '\\mathrm{Var}(T) = \\frac{\\nu}{\\nu - 2} \\quad (\\nu > 2)', value: p => stats(p).variance, explain: 'Larger than 1, the variance of the standard normal, because of the heavy tails. Infinite for $1 < \\nu \\le 2$ and undefined for $\\nu \\le 1$.' },
      { name: 'Standard deviation', tex: '\\sqrt{\\nu/(\\nu - 2)} \\quad (\\nu > 2)', value: p => stats(p).sd, explain: 'Defined for $\\nu > 2$. For $\\nu = 5$ it is 1.291; it approaches 1 as $\\nu$ grows.' },
      { name: 'Skewness', tex: '0 \\quad (\\nu > 3)', value: p => stats(p).skewness, explain: 'Symmetric, so the skewness is 0 whenever the third moment exists ($\\nu > 3$); undefined otherwise.' },
      { name: 'Excess kurtosis', tex: '\\frac{6}{\\nu - 4} \\quad (\\nu > 4)', value: p => stats(p).exKurtosis, explain: 'Positive: the tails are heavier than the normal’s. Infinite for $2 < \\nu \\le 4$ and undefined for $\\nu \\le 2$.' },
      { name: 'Entropy', tex: '\\tfrac{\\nu+1}{2}\\left[\\psi\\!\\left(\\tfrac{\\nu+1}{2}\\right) - \\psi\\!\\left(\\tfrac{\\nu}{2}\\right)\\right] + \\ln\\!\\left[\\sqrt\\nu\\, B\\!\\left(\\tfrac{\\nu}{2}, \\tfrac12\\right)\\right]', value: p => stats(p).entropy, explain: 'Differential entropy in nats. $\\psi$ is the digamma function (the derivative of $\\ln\\Gamma$) and $B$ the beta function. It decreases toward the normal value $\\tfrac12\\ln(2\\pi e) \\approx 1.419$ as $\\nu$ grows.' },
      { name: 'Moment-generating function', tex: '\\text{does not exist}', explain: '$\\mathrm{E}[e^{sT}]$ is infinite for every $s \\ne 0$ because the tails decay only like a power. Only the moments of order less than $\\nu$ are finite: $\\mathrm{E}|T|^r < \\infty$ exactly when $r < \\nu$.' },
      { name: 'Characteristic function', tex: '\\varphi(s) = \\frac{K_{\\nu/2}\\!\\left(\\sqrt\\nu |s|\\right) \\left(\\sqrt\\nu |s|\\right)^{\\nu/2}}{\\Gamma(\\nu/2)\\, 2^{\\nu/2 - 1}}', explain: '$\\mathrm{E}[e^{isT}]$, where $i = \\sqrt{-1}$ and $K_{\\nu/2}$ is the modified Bessel function of the second kind. For $\\nu = 1$ it reduces to $e^{-|s|}$, the Cauchy characteristic function.' },
      { name: 'Peak height', tex: 'f(0) = \\frac{\\Gamma(\\frac{\\nu+1}{2})}{\\sqrt{\\nu\\pi}\\,\\Gamma(\\frac{\\nu}{2})}', value: p => peak(p.nu), explain: 'Increases with $\\nu$ toward the normal peak $1/\\sqrt{2\\pi} \\approx 0.3989$; it is $1/\\pi \\approx 0.3183$ for $\\nu = 1$. The arrow in the explorer uses this height.' },
      { name: 'Two-sided 5% critical value', tex: 't_{\\nu,\\,0.975} = F^{-1}(0.975)', value: p => quantile(0.975, p), explain: 'Reject the null hypothesis of a two-sided test at $\\alpha = 0.05$ when $|t|$ is larger than this. It is 2.571 for $\\nu = 5$, 2.228 for $\\nu = 10$, 2.042 for $\\nu = 30$ and 1.960 in the normal limit.' },
      { name: 'Tail decay', tex: 'f(x) \\sim C_\\nu\\, |x|^{-(\\nu+1)} \\text{ as } |x| \\to \\infty', explain: 'The tails fall off like a power of $x$ rather than exponentially ($C_\\nu$ is a constant that depends only on $\\nu$). This is why an outlier has much less influence on a model with a $t$ likelihood than on a normal one.' },
    ],

    limits: [
      { text: '<b>Normal limit.</b> As $\\nu \\to \\infty$, $t_\\nu \\xrightarrow{d} \\mathcal N(0, 1)$, because the estimated variance in the denominator becomes exact. The two-sided 5% critical value falls from 12.71 ($\\nu = 1$) to 2.042 ($\\nu = 30$) and 1.960 (normal); above about 30 degrees of freedom the difference rarely matters.', relation: 'normal--student-t', to: 'normal' },
      { text: '<b>Cauchy distribution.</b> With $\\nu = 1$ the $t$ distribution is the standard Cauchy distribution, $f(x) = 1/[\\pi(1 + x^2)]$, which has no mean or variance.', relation: 'student-t--cauchy', to: 'cauchy' },
      { text: '<b>Two degrees of freedom.</b> With $\\nu = 2$ the CDF has the simple form $F(x) = \\tfrac12 + x/(2\\sqrt{2 + x^2})$; the mean is 0 but the variance is infinite.' },
      { text: '<b>Location–scale t.</b> $Y = \\mu + \\sigma T$ has the three-parameter $t$ distribution. As $\\nu \\to \\infty$ it approaches $\\mathcal N(\\mu, \\sigma^2)$, and with $\\nu = 1$ it is $\\mathrm{Cauchy}(\\mu, \\sigma)$.' },
      { text: '<b>Noncentral t.</b> When the null hypothesis is false, the t statistic has a noncentral $t$ distribution whose noncentrality parameter is the standardized true effect times $\\sqrt n$. Power calculations for t-tests use it.' },
    ],

    uses: {
      frequentist: [
        '<b>One-sample and paired t-tests.</b> The statistic $t = (\\bar x - \\mu_0)/(s/\\sqrt n)$ is compared with $t_{n-1}$. A paired t-test applies the same test to the differences within pairs.',
        '<b>Two-sample t-tests.</b> Student’s pooled-variance test uses $t_{n_1 + n_2 - 2}$. Welch’s test does not assume equal variances and uses a $t$ distribution with approximate degrees of freedom from the Welch–Satterthwaite formula.',
        '<b>Confidence intervals for a mean.</b> $\\bar x \\pm t_{n-1,\\,1-\\alpha/2}\\, s/\\sqrt n$. Because $t$ quantiles are larger than normal quantiles, small-sample intervals are wider, which accounts for the uncertainty in $s$. Prediction intervals for a new observation use $\\bar x \\pm t_{n-1,\\,1-\\alpha/2}\\, s\\sqrt{1 + 1/n}$.',
        '<b>Regression coefficients.</b> In linear regression with normal errors, each estimated coefficient divided by its standard error has a $t$ distribution with $n - p - 1$ degrees of freedom ($n$ observations, $p$ predictors and an intercept). The same holds for planned contrasts in ANOVA.',
        '<b>Correlation.</b> The test of zero Pearson correlation uses $t = r\\sqrt{n - 2}/\\sqrt{1 - r^2}$ with $n - 2$ degrees of freedom.',
        '<b>Critical values and p-values.</b> A two-sided p-value is $P(|T| \\ge |t|)$, the area in both tails beyond the observed value (shown by the explorer above). Squaring a $t$ statistic gives an $F(1, \\nu)$ statistic, so a two-group ANOVA gives the same p-value as the two-sided t-test.',
      ],
      bayesian: [
        '<b>Posterior of a normal mean.</b> With normal data, unknown mean and variance, and the reference prior $p(\\mu, \\sigma^2) \\propto 1/\\sigma^2$, the marginal posterior of the mean is a location–scale $t$: $\\mu \\mid y \\sim t_{n-1}(\\bar y,\\ s^2/n)$. The 95% central posterior interval is then numerically the same as the classical t interval.',
        '<b>Normal–inverse-gamma prior.</b> With the conjugate normal–inverse-gamma prior, the marginal posterior of the mean is a $t$ distribution with $2\\alpha_n$ degrees of freedom, where $\\alpha_n$ is the updated inverse-gamma shape.',
        '<b>Posterior predictive distribution.</b> Under the same model a new observation has the posterior predictive distribution $t_{n-1}(\\bar y,\\ s^2(1 + 1/n))$.',
        '<b>Robust likelihoods.</b> Replacing a normal likelihood with a location–scale $t$ makes a model robust to outliers, because the heavy tails let extreme points be explained without moving the mean much. The degrees of freedom can be estimated too (Stan’s prior recommendations suggest, for example, $\\nu \\sim \\mathrm{Gamma}(2, 0.1)$).',
        '<b>Weakly informative priors.</b> Cauchy ($t_1$) and other Student $t$ priors, such as $t_7$, are used as weakly informative default priors for regression coefficients (Gelman et al., 2008), and half-$t$ and half-Cauchy priors are used for standard deviations in hierarchical models (Gelman, 2006).',
        '<b>Scale mixture of normals.</b> $T$ is a normal variable whose variance is drawn from an inverse-gamma distribution. Gibbs samplers for $t$ models use this by adding the variance of each observation as a latent variable.',
      ],
      modeling: [
        '<b>Bayesian alternatives to the t-test.</b> Kruschke’s BEST model replaces the two-sample t-test with a Bayesian model whose likelihood is a $t$ distribution with estimated degrees of freedom, and Bayes factor t-tests (Rouder et al., 2009) put a Cauchy ($t_1$) prior on the effect size.',
        '<b>Heavy-tailed data.</b> Measurement data with occasional outliers, financial returns and some reaction-time residuals are better described by a $t$ than by a normal distribution.',
        '<b>t-SNE.</b> The t-SNE method for visualizing high-dimensional data uses a $t$ kernel with one degree of freedom in the low-dimensional map, so that moderately distant points can be placed far apart.',
        '<b>Multiple imputation.</b> Rubin’s rules for combining estimates from multiply imputed data sets use a $t$ reference distribution with adjusted degrees of freedom.',
        '<b>Simulation.</b> A $t_\\nu$ draw is $Z/\\sqrt{V/\\nu}$ with $Z$ standard normal and $V$ chi-squared with $\\nu$ degrees of freedom, independent.',
      ],
    },

    references: [
      { text: 'Wikipedia: Student’s t-distribution.', url: 'https://en.wikipedia.org/wiki/Student%27s_t-distribution' },
      { text: 'Student (1908). The probable error of a mean. <i>Biometrika</i>, 6(1), 1–25.', url: 'https://doi.org/10.1093/biomet/6.1.1' },
      { text: 'Casella, G., & Berger, R. L. (2002). <i>Statistical Inference</i> (2nd ed.), Section 5.3.2 and Chapter 8. Duxbury.' },
      { text: 'Gelman, A., Carlin, J. B., Stern, H. S., Dunson, D. B., Vehtari, A., & Rubin, D. B. (2013). <i>Bayesian Data Analysis</i> (3rd ed.), Sections 3.2–3.3, Chapter 17 and Appendix A. CRC Press.', url: 'http://www.stat.columbia.edu/~gelman/book/' },
      { text: 'Johnson, N. L., Kotz, S., & Balakrishnan, N. (1995). <i>Continuous Univariate Distributions</i>, Vol. 2 (2nd ed.), Chapter 28. Wiley.' },
      { text: 'Leemis, L. M., & McQueston, J. T. (2008). Univariate distribution relationships. <i>The American Statistician</i>, 62(1), 45–53.', url: 'https://doi.org/10.1198/000313008X270448' },
      { text: 'Kruschke, J. K. (2013). Bayesian estimation supersedes the t test. <i>Journal of Experimental Psychology: General</i>, 142(2), 573–603.', url: 'https://doi.org/10.1037/a0029146' },
      { text: 'Rouder, J. N., Speckman, P. L., Sun, D., Morey, R. D., & Iverson, G. (2009). Bayesian t tests for accepting and rejecting the null hypothesis. <i>Psychonomic Bulletin & Review</i>, 16(2), 225–237.', url: 'https://doi.org/10.3758/PBR.16.2.225' },
      { text: 'Gelman, A. (2006). Prior distributions for variance parameters in hierarchical models. <i>Bayesian Analysis</i>, 1(3), 515–534.', url: 'https://doi.org/10.1214/06-BA117A' },
      { text: 'Gelman, A., Jakulin, A., Pittau, M. G., & Su, Y.-S. (2008). A weakly informative default prior distribution for logistic and other regression models. <i>Annals of Applied Statistics</i>, 2(4), 1360–1383.', url: 'https://doi.org/10.1214/08-AOAS191' },
    ],
  },
};

