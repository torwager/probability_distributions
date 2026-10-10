// A small SVG plotting engine with draggable handles.
//
//   const plot = new Plot(container, { xLabel: 'x', yLabel: 'f(x)' });
//   plot.render(scene);           // call again whenever anything changes (cheap; DOM nodes are reused by id)
//
// A scene is plain data:
//   {
//     x: [lo, hi], y: [lo, hi],                 // data domain
//     discreteX?: true,                         // integer-only x ticks
//     layers: [ { id, type, ...}, ... ],        // drawn in order, clipped to the plot area
//     handles: [ { id, type, ...}, ... ],       // interactive, drawn on top, not clipped
//     legend?: [ { label, cls } ],              // HTML legend under the plot
//   }
//
// Layer types (all coordinates in data units):
//   line    {points:[[x,y],...], cls}               polyline; non-finite y breaks the line
//   area    {points:[[x,y],...], base=0, cls}       filled region between the curve and y = base
//   stems   {points:[[k,p],...], cls, dots=true}    lollipop stems for a PMF
//   bars    {points:[[x,h],...], width, cls}        bars centered on x (histograms)
//   step    {points:[[k,F],...], cls, x0?}          right-continuous step function (discrete CDF)
//   vline   {x, cls}   hline {y, cls}   segment {x1,y1,x2,y2,cls}
//   dot     {x, y, r=4, cls}    text {x, y, text, cls, anchor='middle', dx=0, dy=0}
//   bracket {x, y1, y2, cls, side='right', label?}   vertical bracket at data x between y1 and y2 (px-sized caps)
//   polygon {points:[[x,y],...], cls, closed=true}  closed (filled) polygon, e.g. a simplex triangle or a
//                                                    probability ellipse; CSS classes: 'outline' (no fill),
//                                                    'fill-steel', 'area-shade'; default is a light steel fill
//   heatmap {x:[x0,x1], y:[y0,y1], nx, ny, values, max?, cls}
//           a density image: values[j * nx + i] is the value in cell (i, j), with i = 0 at x0 and j = 0 at y0.
//           Drawn in steel blue with opacity proportional to value / max (max defaults to the largest value);
//           NaN or non-finite cells are transparent (use NaN outside a triangle or circle).
//           Use about 60-120 cells per side; the image is re-rendered on every render() call.
//
// Plot options also include `equalAspect: true` (one data unit is the same length on both axes; the
// shorter domain is widened around its center) for 2-D views such as contour plots and simplexes, and
// `xTicks: false` / `yTicks: false` to hide tick labels.
//
// Handle types (see ARCHITECTURE.md). Each handle descriptor has:
//   id, type, label (short text such as 'μ'), ariaLabel, valueText,
//   onDrag({x, y}, phase)   phase is 'start' | 'move' | 'end'; {x, y} is the pointer position in data units
//   onKey(steps)            steps = +1/-1 (arrow keys) or +10/-10 (PageUp/PageDown, Shift+arrow)
// and geometry:
//   vline  {x}                vertical line across the plot with a knob at the top; drag horizontally
//   hArrow {from:{x,y}, to:{x,y}}   horizontal double arrow; drag the knob at `to` horizontally
//   vArrow {from:{x,y}, to:{x,y}}   vertical arrow; drag the knob at `to` vertically
//   point  {at:{x,y}}         free 2-D knob
//   xPoint {x, lineTo?}       knob sitting on the x-axis (optionally a dashed line up to y = lineTo); drag horizontally
// Optional on any handle: cls (extra class), color ('amber' default | 'steel').

import { niceStep } from './math.js';

const SVGNS = 'http://www.w3.org/2000/svg';
let plotCounter = 0;

function el(name, attrs = {}, parent) {
  const e = document.createElementNS(SVGNS, name);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
}
const f2 = v => (Math.round(v * 100) / 100).toString();
const clampPx = v => Math.max(-1e5, Math.min(1e5, v));

/** Nice tick values covering [lo, hi] with about `count` ticks. */
export function niceTicks(lo, hi, count = 6, integer = false) {
  if (!(hi > lo)) return [lo];
  let step = niceStep((hi - lo) / Math.max(1, count));
  if (integer) step = Math.max(1, Math.round(step));
  const start = Math.ceil(lo / step - 1e-9) * step;
  const out = [];
  for (let v = start; v <= hi + step * 1e-9; v += step) out.push(Math.abs(v) < step * 1e-9 ? 0 : v);
  out.step = step;
  return out;
}

/** Format a tick or readout number. Uses a true minus sign. */
export function formatTick(v, step) {
  if (!Number.isFinite(v)) return v > 0 ? '∞' : v < 0 ? '−∞' : '—';
  let s;
  const av = Math.abs(v);
  if (av !== 0 && (av >= 1e6 || (step !== undefined ? step < 1e-4 : av < 1e-4))) s = v.toExponential(step !== undefined ? 0 : 2);
  else {
    const dec = step !== undefined ? Math.max(0, Math.min(10, -Math.floor(Math.log10(step) + 1e-9))) : 3;
    s = v.toFixed(dec);
  }
  return s.replace(/^-/, '−');
}

export class Plot {
  /**
   * @param {HTMLElement} container
   * @param {object} opts  xLabel, yLabel, height(width)->px or number, margin {t,r,b,l}, ariaLabel,
   *                       onBackground(pt, phase, event) for pointer drags on empty plot area (mouse/pen only),
   *                       yTickCount, xTickCount, yTicks (false to hide y tick labels), className
   */
  constructor(container, opts = {}) {
    this.container = container;
    this.opts = opts;
    this.id = ++plotCounter;
    this.root = document.createElement('div');
    this.root.className = 'plot' + (opts.className ? ' ' + opts.className : '');
    container.appendChild(this.root);
    this.svg = el('svg', { class: 'plot-svg', role: 'group', 'aria-label': opts.ariaLabel || 'Plot' }, null);
    this.root.appendChild(this.svg);
    this.legendEl = document.createElement('div');
    this.legendEl.className = 'plot-legend';
    this.root.appendChild(this.legendEl);

    const defs = el('defs', {}, this.svg);
    this.clipId = `plot-clip-${this.id}`;
    const cp = el('clipPath', { id: this.clipId }, defs);
    this.clipRect = el('rect', {}, cp);
    const mk = el('marker', { id: `arrow-${this.id}`, viewBox: '0 0 10 10', refX: '8', refY: '5', markerWidth: '5', markerHeight: '5', orient: 'auto-start-reverse' }, defs);
    el('path', { d: 'M0,0 L10,5 L0,10 z', class: 'arrowhead' }, mk);
    this.markerId = `arrow-${this.id}`;

    this.bg = el('rect', { class: 'plot-bg' }, this.svg);
    this.gGrid = el('g', { class: 'grid' }, this.svg);
    this.gAxes = el('g', { class: 'axes' }, this.svg);
    this.gLayers = el('g', { class: 'layers', 'clip-path': `url(#${this.clipId})` }, this.svg);
    this.gOver = el('g', { class: 'overlays' }, this.svg);
    this.gHandles = el('g', { class: 'handles' }, this.svg);

    this.layerEls = new Map();   // id -> {type, g}
    this.handleEls = new Map();  // id -> {type, g, parts}
    this.handleDesc = new Map(); // id -> latest descriptor
    this.drag = null;
    this.scene = null;
    this.width = 0; this.height = 0;

    this._measure();
    this.ro = new ResizeObserver(() => { if (this._measure() && this.scene) this.render(this.scene); });
    this.ro.observe(this.root);

    if (opts.onBackground) this._wireBackground();
  }

  get margin() {
    const m = this.opts.margin || {};
    const narrow = this.width < 420;
    // left margin: room for the widest y tick label (11px monospace, about 6.7px per character),
    // an 8px gap and the rotated axis label
    const tickW = this.opts.yTicks === false ? 0 : 6.7 * (this._yTickChars || 4);
    const auto = Math.ceil(tickW + 8 + (this.opts.yLabel ? 20 : 4));
    return { t: m.t ?? 26, r: m.r ?? (narrow ? 12 : 18), b: m.b ?? 44, l: m.l ?? Math.max(narrow ? 40 : 52, auto) };
  }

  _measure() {
    const w = Math.max(200, Math.round(this.root.clientWidth || this.container.clientWidth || 600));
    const hOpt = this.opts.height;
    const h = Math.round(typeof hOpt === 'function' ? hOpt(w) : hOpt || Math.max(220, Math.min(360, w * 0.62)));
    if (w === this.width && h === this.height) return false;
    this.width = w; this.height = h;
    this.svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    this.svg.setAttribute('width', w);
    this.svg.setAttribute('height', h);
    return true;
  }

  // data -> px
  sx(x) { const { l, r } = this.margin; const [a, b] = this.xd; return l + (x - a) / (b - a) * (this.width - l - r); }
  sy(y) { const { t, b } = this.margin; const [c, d] = this.yd; return this.height - b - (y - c) / (d - c) * (this.height - t - b); }
  // px -> data
  ix(px) { const { l, r } = this.margin; const [a, b] = this.xd; return a + (px - l) / (this.width - l - r) * (b - a); }
  iy(py) { const { t, b } = this.margin; const [c, d] = this.yd; return c + (this.height - b - py) / (this.height - t - b) * (d - c); }

  get inner() {
    const m = this.margin;
    return { x0: m.l, x1: this.width - m.r, y0: m.t, y1: this.height - m.b };
  }

  /** Render (or re-render) a scene. */
  render(scene) {
    this.scene = scene;
    this.xd = scene.x; this.yd = scene.y;
    if (!(this.xd[1] > this.xd[0])) this.xd = [this.xd[0] - 1, this.xd[0] + 1];
    if (!(this.yd[1] > this.yd[0])) this.yd = [this.yd[0], this.yd[0] + 1];
    if (this.opts.equalAspect) this._equalize();
    {
      const yt = niceTicks(this.yd[0], this.yd[1], this.opts.yTickCount || 5);
      this._yTickChars = Math.max(4, ...yt.map(v => formatTick(v, yt.step).length));
    }
    const I = this.inner;
    this.bg.setAttribute('x', I.x0); this.bg.setAttribute('y', I.y0);
    this.bg.setAttribute('width', I.x1 - I.x0); this.bg.setAttribute('height', I.y1 - I.y0);
    this.clipRect.setAttribute('x', I.x0 - 1); this.clipRect.setAttribute('y', I.y0 - 6);
    this.clipRect.setAttribute('width', I.x1 - I.x0 + 2); this.clipRect.setAttribute('height', I.y1 - I.y0 + 7);
    this._axes(scene);
    this._layers(scene.layers || []);
    this._handles(scene.handles || []);
    this._legend(scene.legend || []);
  }

  /** Widen the x or y domain so that one data unit has the same length in px on both axes. */
  _equalize() {
    const I = this.inner;
    const pw = I.x1 - I.x0, ph = I.y1 - I.y0;
    const [x0, x1] = this.xd, [y0, y1] = this.yd;
    const ux = (x1 - x0) / pw, uy = (y1 - y0) / ph; // data units per px
    if (ux > uy) { const c = (y0 + y1) / 2, half = ux * ph / 2; this.yd = [c - half, c + half]; }
    else if (uy > ux) { const c = (x0 + x1) / 2, half = uy * pw / 2; this.xd = [c - half, c + half]; }
  }

  /** The domains actually drawn (they differ from the scene's when equalAspect is on). */
  get domain() { return { x: [...this.xd], y: [...this.yd] }; }

  _axes(scene) {
    const I = this.inner, g = this.gAxes, grid = this.gGrid;
    g.textContent = ''; grid.textContent = '';
    const xt = niceTicks(this.xd[0], this.xd[1], this.opts.xTickCount || (this.width < 420 ? 5 : 8), !!scene.discreteX);
    const yt = niceTicks(this.yd[0], this.yd[1], this.opts.yTickCount || 5);
    for (const v of yt) {
      const y = this.sy(v);
      el('line', { x1: I.x0, x2: I.x1, y1: f2(y), y2: f2(y), class: 'gridline' }, grid);
      if (this.opts.yTicks !== false) {
        const t = el('text', { x: I.x0 - 8, y: f2(y), class: 'tick-label', 'text-anchor': 'end', 'dominant-baseline': 'middle' }, g);
        t.textContent = formatTick(v, yt.step);
      }
    }
    el('line', { x1: I.x0, x2: I.x1, y1: I.y1, y2: I.y1, class: 'axis-line' }, g);
    el('line', { x1: I.x0, x2: I.x0, y1: I.y0, y2: I.y1, class: 'axis-line' }, g);
    for (const v of xt) {
      const x = this.sx(v);
      el('line', { x1: f2(x), x2: f2(x), y1: I.y1, y2: I.y1 + 5, class: 'tick' }, g);
      if (this.opts.xTicks === false) continue;
      const t = el('text', { x: f2(x), y: I.y1 + 18, class: 'tick-label', 'text-anchor': 'middle' }, g);
      t.textContent = formatTick(v, xt.step);
    }
    if (this.opts.xLabel) {
      const t = el('text', { x: (I.x0 + I.x1) / 2, y: this.height - 6, class: 'axis-label', 'text-anchor': 'middle' }, g);
      t.textContent = this.opts.xLabel;
    }
    if (this.opts.yLabel) {
      const t = el('text', { x: 0, y: 0, class: 'axis-label', 'text-anchor': 'middle', transform: `translate(12 ${(I.y0 + I.y1) / 2}) rotate(-90)` }, g);
      t.textContent = this.opts.yLabel;
    }
  }

  _pathFromPoints(pts) {
    let d = '', pen = false;
    for (const [x, y] of pts) {
      if (!Number.isFinite(y) || !Number.isFinite(x)) { pen = false; continue; }
      d += (pen ? 'L' : 'M') + f2(clampPx(this.sx(x))) + ',' + f2(clampPx(this.sy(y)));
      pen = true;
    }
    return d;
  }

  _layers(layers) {
    const seen = new Set();
    let idx = 0;
    for (const L of layers) {
      const id = L.id || `auto-${idx}`;
      seen.add(id);
      let rec = this.layerEls.get(id);
      if (!rec || rec.type !== L.type) {
        if (rec) rec.g.remove();
        rec = { type: L.type, g: el('g', { 'data-layer': id }) };
        this.layerEls.set(id, rec);
      }
      const target = this.gLayers.children[idx];
      if (target !== rec.g) this.gLayers.insertBefore(rec.g, target || null);
      this._drawLayer(rec, L);
      idx++;
    }
    for (const [id, rec] of this.layerEls) if (!seen.has(id)) { rec.g.remove(); this.layerEls.delete(id); }
  }

  _ensure(rec, key, tag, cls) {
    rec.parts = rec.parts || {};
    let p = rec.parts[key];
    if (!p) { p = el(tag, {}, rec.g); rec.parts[key] = p; }
    if (cls !== undefined) p.setAttribute('class', cls);
    return p;
  }

  _drawLayer(rec, L) {
    const cls = L.cls || '';
    rec.g.setAttribute('class', `layer layer-${L.type} ${cls}`);
    switch (L.type) {
      case 'line': {
        this._ensure(rec, 'p', 'path', 'curve').setAttribute('d', this._pathFromPoints(L.points));
        break;
      }
      case 'area': {
        const pts = L.points.filter(p => Number.isFinite(p[0]) && Number.isFinite(p[1]));
        const base = L.base ?? 0;
        let d = '';
        if (pts.length) {
          const by = f2(clampPx(this.sy(base)));
          d = `M${f2(this.sx(pts[0][0]))},${by}`;
          for (const [x, y] of pts) d += `L${f2(clampPx(this.sx(x)))},${f2(clampPx(this.sy(y)))}`;
          d += `L${f2(this.sx(pts[pts.length - 1][0]))},${by}Z`;
        }
        this._ensure(rec, 'p', 'path', 'fill').setAttribute('d', d);
        break;
      }
      case 'stems': {
        const pts = L.points.filter(p => Number.isFinite(p[1]));
        const span = pts.length > 1 ? Math.abs(this.sx(pts[1][0]) - this.sx(pts[0][0])) : 40;
        const r = L.dots === false || span < 7 ? 0 : Math.min(4.5, Math.max(2.2, span * 0.18));
        const by = this.sy(0);
        let ds = '', dd = '';
        for (const [x, y] of pts) {
          const px = f2(this.sx(x)), py = clampPx(this.sy(y));
          ds += `M${px},${f2(by)}V${f2(py)}`;
          if (r) dd += `M${f2(this.sx(x) - r)},${f2(py)}a${r},${r} 0 1,0 ${2 * r},0a${r},${r} 0 1,0 ${-2 * r},0`;
        }
        const stem = this._ensure(rec, 's', 'path', 'stem');
        stem.setAttribute('d', ds);
        stem.style.strokeWidth = span < 4 ? '1' : span < 10 ? '1.6' : '';
        this._ensure(rec, 'd', 'path', 'stem-dot').setAttribute('d', dd);
        break;
      }
      case 'bars': {
        let d = '';
        const w = L.width ?? 1;
        const by = this.sy(0);
        for (const [x, h] of L.points) {
          if (!Number.isFinite(h)) continue;
          const x0 = this.sx(x - w / 2), x1 = this.sx(x + w / 2), y = clampPx(this.sy(h));
          d += `M${f2(x0)},${f2(by)}V${f2(y)}H${f2(x1)}V${f2(by)}Z`;
        }
        this._ensure(rec, 'p', 'path', 'bar').setAttribute('d', d);
        break;
      }
      case 'step': {
        const pts = L.points;
        let d = '', dc = '', doo = '', risers = '';
        const r = pts.length > 1 && Math.abs(this.sx(pts[1][0]) - this.sx(pts[0][0])) < 9 ? 0 : 3;
        const xEnd = this.xd[1];
        if (L.x0 !== undefined && pts.length) {
          // flat segment before the first point at value y0 (usually 0)
          d += `M${f2(this.sx(this.xd[0]))},${f2(this.sy(L.y0 ?? 0))}H${f2(this.sx(pts[0][0]))}`;
        }
        for (let i = 0; i < pts.length; i++) {
          const [x, y] = pts[i];
          const xn = i + 1 < pts.length ? pts[i + 1][0] : xEnd;
          const px = this.sx(x), pxn = this.sx(xn), py = this.sy(y);
          d += `M${f2(px)},${f2(py)}H${f2(pxn)}`;
          const prevY = i > 0 ? pts[i - 1][1] : (L.y0 ?? 0);
          if (Math.abs(this.sy(prevY) - py) > 0.5) risers += `M${f2(px)},${f2(this.sy(prevY))}V${f2(py)}`;
          if (r) {
            dc += `M${f2(px - r)},${f2(py)}a${r},${r} 0 1,0 ${2 * r},0a${r},${r} 0 1,0 ${-2 * r},0`;
            if (i + 1 < pts.length && Math.abs(this.sy(pts[i + 1][1]) - py) > 0.5) doo += `M${f2(pxn - r)},${f2(py)}a${r},${r} 0 1,0 ${2 * r},0a${r},${r} 0 1,0 ${-2 * r},0`;
          }
        }
        if (r && L.x0 !== undefined && pts.length && Math.abs(this.sy(pts[0][1]) - this.sy(L.y0 ?? 0)) > 0.5) {
          const px = this.sx(pts[0][0]), py = this.sy(L.y0 ?? 0);
          doo += `M${f2(px - r)},${f2(py)}a${r},${r} 0 1,0 ${2 * r},0a${r},${r} 0 1,0 ${-2 * r},0`;
        }
        this._ensure(rec, 'r', 'path', 'riser').setAttribute('d', risers);
        this._ensure(rec, 'p', 'path', 'curve').setAttribute('d', d);
        this._ensure(rec, 'o', 'path', 'step-open').setAttribute('d', doo);
        this._ensure(rec, 'c', 'path', 'step-closed').setAttribute('d', dc);
        break;
      }
      case 'vline': {
        const I = this.inner, x = f2(this.sx(L.x));
        const p = this._ensure(rec, 'p', 'line', 'rule');
        p.setAttribute('x1', x); p.setAttribute('x2', x);
        p.setAttribute('y1', L.y1 !== undefined ? f2(this.sy(L.y1)) : I.y0); p.setAttribute('y2', L.y0 !== undefined ? f2(this.sy(L.y0)) : I.y1);
        break;
      }
      case 'hline': {
        const I = this.inner, y = f2(this.sy(L.y));
        const p = this._ensure(rec, 'p', 'line', 'rule');
        p.setAttribute('x1', L.x0 !== undefined ? f2(this.sx(L.x0)) : I.x0); p.setAttribute('x2', L.x1 !== undefined ? f2(this.sx(L.x1)) : I.x1);
        p.setAttribute('y1', y); p.setAttribute('y2', y);
        break;
      }
      case 'segment': {
        const p = this._ensure(rec, 'p', 'line', 'rule');
        p.setAttribute('x1', f2(this.sx(L.x1))); p.setAttribute('y1', f2(clampPx(this.sy(L.y1))));
        p.setAttribute('x2', f2(this.sx(L.x2))); p.setAttribute('y2', f2(clampPx(this.sy(L.y2))));
        break;
      }
      case 'dot': {
        const c = this._ensure(rec, 'p', 'circle', 'dot');
        c.setAttribute('cx', f2(this.sx(L.x))); c.setAttribute('cy', f2(clampPx(this.sy(L.y)))); c.setAttribute('r', L.r ?? 4);
        break;
      }
      case 'text': {
        const t = this._ensure(rec, 'p', 'text', 'label');
        const I = this.inner;
        let x = this.sx(L.x) + (L.dx || 0), y = this.sy(L.y) + (L.dy || 0);
        if (L.keepInside !== false) { x = Math.max(I.x0 + 2, Math.min(I.x1 - 2, x)); y = Math.max(I.y0 + 10, Math.min(I.y1 - 4, y)); }
        let anchor = L.anchor || 'middle';
        if (L.keepInside !== false && anchor === 'middle') {
          const w = (L.text || '').length * 3.6;
          if (x - w < I.x0) anchor = 'start'; else if (x + w > I.x1) anchor = 'end';
        }
        t.setAttribute('x', f2(x)); t.setAttribute('y', f2(y)); t.setAttribute('text-anchor', anchor);
        t.textContent = L.text;
        break;
      }
      case 'bracket': {
        const x = this.sx(L.x), y1 = this.sy(L.y1), y2 = this.sy(L.y2), cap = L.side === 'left' ? -6 : 6;
        const d = `M${f2(x + cap)},${f2(y1)}H${f2(x)}V${f2(y2)}H${f2(x + cap)}`;
        this._ensure(rec, 'p', 'path', 'bracket').setAttribute('d', d);
        const t = this._ensure(rec, 't', 'text', 'label bracket-label');
        if (L.label) {
          const I = this.inner;
          const tx = L.side === 'left' ? x + 10 : x - 8;
          let ty = (y1 + y2) / 2;
          // a very short bracket: put the label just above it so it does not sit on the axis
          if (Math.abs(y1 - y2) < 18) ty = Math.min(y1, y2) - 12;
          ty = Math.max(I.y0 + 10, Math.min(I.y1 - 6, ty));
          t.setAttribute('x', f2(tx)); t.setAttribute('y', f2(ty));
          t.setAttribute('text-anchor', L.side === 'left' ? 'start' : 'end');
          t.setAttribute('dominant-baseline', 'middle');
          t.textContent = L.label;
        } else t.textContent = '';
        break;
      }
      case 'polygon': {
        let d = '', pen = false;
        for (const [x, y] of L.points || []) {
          if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
          d += (pen ? 'L' : 'M') + f2(clampPx(this.sx(x))) + ',' + f2(clampPx(this.sy(y)));
          pen = true;
        }
        if (d && L.closed !== false) d += 'Z';
        this._ensure(rec, 'p', 'path', 'poly').setAttribute('d', d);
        break;
      }
      case 'heatmap': {
        const img = this._ensure(rec, 'p', 'image', 'heat');
        const { nx, ny, values } = L;
        if (!(nx > 0 && ny > 0) || !values) { img.removeAttribute('href'); break; }
        let max = L.max;
        if (!(max > 0)) { max = 0; for (let i = 0; i < values.length; i++) if (Number.isFinite(values[i]) && values[i] > max) max = values[i]; }
        const cv = this._heatCanvas || (this._heatCanvas = document.createElement('canvas'));
        cv.width = nx; cv.height = ny;
        const c2 = cv.getContext('2d');
        const im = c2.createImageData(nx, ny);
        const rgb = this._cssRgb('--steel-deep', [63, 99, 144]);
        for (let j = 0; j < ny; j++) {
          const row = ny - 1 - j; // image rows go top to bottom
          for (let i = 0; i < nx; i++) {
            const v = values[j * nx + i], o = 4 * (row * nx + i);
            im.data[o] = rgb[0]; im.data[o + 1] = rgb[1]; im.data[o + 2] = rgb[2];
            im.data[o + 3] = Number.isFinite(v) && max > 0 ? Math.round(255 * 0.85 * Math.max(0, Math.min(1, v / max))) : 0;
          }
        }
        c2.putImageData(im, 0, 0);
        const xa = this.sx(L.x[0]), xb = this.sx(L.x[1]), ya = this.sy(L.y[1]), yb = this.sy(L.y[0]);
        img.setAttribute('x', f2(Math.min(xa, xb))); img.setAttribute('y', f2(Math.min(ya, yb)));
        img.setAttribute('width', f2(Math.abs(xb - xa))); img.setAttribute('height', f2(Math.abs(yb - ya)));
        img.setAttribute('preserveAspectRatio', 'none');
        img.setAttribute('href', cv.toDataURL());
        break;
      }
      default:
        console.warn('Unknown layer type', L.type);
    }
  }

  /** Read a CSS color variable (hex) as [r, g, b]; falls back to `dflt`. */
  _cssRgb(name, dflt) {
    try {
      const v = getComputedStyle(this.root).getPropertyValue(name).trim();
      const m = v.match(/^#([0-9a-f]{6})$/i);
      if (m) return [0, 2, 4].map(i => parseInt(m[1].slice(i, i + 2), 16));
      const m3 = v.match(/^#([0-9a-f]{3})$/i);
      if (m3) return [0, 1, 2].map(i => parseInt(m3[1][i] + m3[1][i], 16));
    } catch (_) { /* ignore */ }
    return dflt;
  }

  // ---------------------------------------------------------------- handles

  _handles(handles) {
    const seen = new Set();
    for (const H of handles) {
      seen.add(H.id);
      this.handleDesc.set(H.id, H);
      let rec = this.handleEls.get(H.id);
      if (!rec || rec.type !== H.type) {
        if (rec) rec.g.remove();
        rec = this._createHandle(H);
        this.handleEls.set(H.id, rec);
      }
      this._placeHandle(rec, H);
    }
    for (const [id, rec] of this.handleEls) {
      if (!seen.has(id)) {
        if (this.drag && this.drag.id === id) this.drag = null;
        rec.g.remove(); this.handleEls.delete(id); this.handleDesc.delete(id);
      }
    }
  }

  _createHandle(H) {
    const g = el('g', { class: `handle handle-${H.type}`, tabindex: '0', role: 'slider', 'data-handle': H.id }, this.gHandles);
    const parts = {};
    if (H.type === 'vline') {
      parts.line = el('line', { class: 'handle-line' }, g);
    } else if (H.type === 'hArrow' || H.type === 'vArrow') {
      parts.line = el('line', { class: 'handle-arrow' }, g);
      parts.tick = el('line', { class: 'handle-tick' }, g);
    } else if (H.type === 'xPoint') {
      parts.line = el('line', { class: 'handle-guide' }, g);
    }
    parts.hit = el(H.type === 'vline' ? 'rect' : 'circle', { class: 'handle-hit' }, g);
    parts.knob = el(H.type === 'xPoint' ? 'path' : 'circle', { class: 'knob' }, g);
    parts.label = el('text', { class: 'handle-label', 'text-anchor': 'middle' }, g);

    g.addEventListener('pointerdown', e => this._onPointerDown(e, H.id));
    // Chrome and Safari ignore CSS touch-action on SVG child elements, so a diagonal or vertical
    // finger drag that starts on a handle would scroll the page and cancel the drag. Cancelling
    // touchstart on the handle itself keeps the page still; pointer events are still delivered.
    g.addEventListener('touchstart', e => { if (e.cancelable) e.preventDefault(); }, { passive: false });
    g.addEventListener('pointermove', e => this._onPointerMove(e));
    g.addEventListener('pointerup', e => this._onPointerUp(e));
    g.addEventListener('pointercancel', e => this._onPointerUp(e));
    g.addEventListener('lostpointercapture', e => this._onPointerUp(e));
    g.addEventListener('keydown', e => this._onKey(e, H.id));
    return { type: H.type, g, parts };
  }

  /** Pixel position of the draggable knob for a handle descriptor. */
  _anchorPx(H) {
    const I = this.inner;
    const cx = v => Math.max(I.x0, Math.min(I.x1, this.sx(v)));
    const cy = v => Math.max(I.y0, Math.min(I.y1, this.sy(v)));
    switch (H.type) {
      case 'vline': return { x: cx(H.x), y: I.y0 };
      case 'hArrow': case 'vArrow': return { x: cx(H.to.x), y: cy(H.to.y) };
      case 'point': return { x: cx(H.at.x), y: cy(H.at.y) };
      case 'xPoint': return { x: cx(H.x), y: I.y1 };
      default: return { x: 0, y: 0 };
    }
  }

  _placeHandle(rec, H) {
    const { g, parts } = rec;
    const I = this.inner;
    const A = this._anchorPx(H);
    g.setAttribute('class', `handle handle-${H.type} ${H.color === 'steel' ? 'is-steel' : ''} ${H.cls || ''} ${this.drag && this.drag.id === H.id ? 'dragging' : ''}`);
    g.setAttribute('aria-label', H.ariaLabel || H.label || 'handle');
    if (H.valueText !== undefined) { g.setAttribute('aria-valuetext', H.valueText); g.setAttribute('aria-valuenow', H.valueNow ?? ''); }
    if (H.valueMin !== undefined) g.setAttribute('aria-valuemin', H.valueMin);
    if (H.valueMax !== undefined) g.setAttribute('aria-valuemax', H.valueMax);
    const touch = this._coarse();
    const hitR = touch ? 22 : 14;
    const labelText = H.label || '';
    if (H.type === 'vline') {
      const x = f2(A.x);
      parts.line.setAttribute('x1', x); parts.line.setAttribute('x2', x);
      parts.line.setAttribute('y1', I.y0); parts.line.setAttribute('y2', I.y1);
      parts.hit.setAttribute('x', f2(A.x - hitR * 0.75)); parts.hit.setAttribute('y', I.y0 - 12);
      parts.hit.setAttribute('width', f2(hitR * 1.5)); parts.hit.setAttribute('height', I.y1 - I.y0 + 12);
      parts.knob.setAttribute('cx', x); parts.knob.setAttribute('cy', I.y0); parts.knob.setAttribute('r', 7);
      parts.label.setAttribute('x', x); parts.label.setAttribute('y', I.y0 - 12);
      g.style.cursor = 'ew-resize';
    } else if (H.type === 'hArrow' || H.type === 'vArrow') {
      const fx = this.sx(H.from.x), fy = this.sy(H.from.y);
      const fxc = Math.max(I.x0, Math.min(I.x1, fx)), fyc = Math.max(I.y0, Math.min(I.y1, fy));
      parts.line.setAttribute('x1', f2(fxc)); parts.line.setAttribute('y1', f2(fyc));
      parts.line.setAttribute('x2', f2(A.x)); parts.line.setAttribute('y2', f2(A.y));
      // hide arrowheads if the arrow is too short to show them
      const len = Math.hypot(A.x - fxc, A.y - fyc);
      parts.line.setAttribute('marker-start', len > 18 ? `url(#${this.markerId})` : '');
      parts.line.setAttribute('marker-end', '');
      if (H.type === 'hArrow') {
        parts.tick.setAttribute('x1', f2(fxc)); parts.tick.setAttribute('x2', f2(fxc));
        parts.tick.setAttribute('y1', f2(fyc - 7)); parts.tick.setAttribute('y2', f2(fyc + 7));
        parts.label.setAttribute('x', f2((fxc + A.x) / 2)); parts.label.setAttribute('y', f2(A.y - 10));
        g.style.cursor = 'ew-resize';
      } else {
        parts.tick.setAttribute('x1', f2(fxc - 7)); parts.tick.setAttribute('x2', f2(fxc + 7));
        parts.tick.setAttribute('y1', f2(fyc)); parts.tick.setAttribute('y2', f2(fyc));
        parts.label.setAttribute('x', f2(A.x + 14)); parts.label.setAttribute('y', f2((fyc + A.y) / 2 + 4));
        parts.label.setAttribute('text-anchor', 'start');
        g.style.cursor = 'ns-resize';
      }
      parts.hit.setAttribute('cx', f2(A.x)); parts.hit.setAttribute('cy', f2(A.y)); parts.hit.setAttribute('r', hitR);
      parts.knob.setAttribute('cx', f2(A.x)); parts.knob.setAttribute('cy', f2(A.y)); parts.knob.setAttribute('r', 6.5);
    } else if (H.type === 'point') {
      parts.hit.setAttribute('cx', f2(A.x)); parts.hit.setAttribute('cy', f2(A.y)); parts.hit.setAttribute('r', hitR);
      parts.knob.setAttribute('cx', f2(A.x)); parts.knob.setAttribute('cy', f2(A.y)); parts.knob.setAttribute('r', 7);
      parts.label.setAttribute('x', f2(A.x)); parts.label.setAttribute('y', f2(A.y - 13));
      g.style.cursor = 'move';
    } else if (H.type === 'xPoint') {
      const x = A.x;
      const yTop = H.lineTo !== undefined ? Math.max(I.y0, Math.min(I.y1, this.sy(H.lineTo))) : I.y0;
      parts.line.setAttribute('x1', f2(x)); parts.line.setAttribute('x2', f2(x));
      parts.line.setAttribute('y1', f2(yTop)); parts.line.setAttribute('y2', I.y1);
      // a downward-pointing marker under the axis line
      const y = I.y1;
      parts.knob.setAttribute('d', `M${f2(x)},${f2(y)} l-7,11 h14 z`);
      parts.hit.setAttribute('cx', f2(x)); parts.hit.setAttribute('cy', f2(y + 6)); parts.hit.setAttribute('r', hitR);
      parts.label.setAttribute('x', f2(x)); parts.label.setAttribute('y', f2(Math.max(I.y0 + 12, yTop - 8)));
      g.style.cursor = 'ew-resize';
    }
    parts.label.textContent = labelText;
  }

  _coarse() {
    if (this._isCoarse === undefined) this._isCoarse = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
    return this._isCoarse;
  }

  _eventPx(e) {
    const r = this.svg.getBoundingClientRect();
    const sx = this.width / (r.width || this.width), sy = this.height / (r.height || this.height);
    return { x: (e.clientX - r.left) * sx, y: (e.clientY - r.top) * sy };
  }

  _onPointerDown(e, id) {
    if (e.button !== undefined && e.button !== 0) return;
    const H = this.handleDesc.get(id);
    if (!H) return;
    e.preventDefault();
    e.stopPropagation();
    const rec = this.handleEls.get(id);
    try { rec.g.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ }
    rec.g.focus({ preventScroll: true });
    const p = this._eventPx(e), A = this._anchorPx(H);
    this.drag = { id, pointerId: e.pointerId, off: { x: A.x - p.x, y: A.y - p.y } };
    rec.g.classList.add('dragging');
    this.root.classList.add('is-dragging');
    H.onDrag && H.onDrag(this._dataAt(p), 'start', e);
  }

  _dataAt(p) {
    const off = this.drag ? this.drag.off : { x: 0, y: 0 };
    const I = this.inner;
    const px = Math.max(I.x0, Math.min(I.x1, p.x + off.x));
    const py = Math.max(I.y0, Math.min(I.y1, p.y + off.y));
    return { x: this.ix(px), y: this.iy(py) };
  }

  _onPointerMove(e) {
    if (!this.drag || e.pointerId !== this.drag.pointerId) return;
    e.preventDefault();
    const H = this.handleDesc.get(this.drag.id);
    if (H && H.onDrag) H.onDrag(this._dataAt(this._eventPx(e)), 'move', e);
  }

  _onPointerUp(e) {
    if (!this.drag || e.pointerId !== this.drag.pointerId) return;
    const id = this.drag.id;
    const H = this.handleDesc.get(id);
    const pt = e.type === 'lostpointercapture' ? null : this._dataAt(this._eventPx(e));
    this.drag = null;
    const rec = this.handleEls.get(id);
    if (rec) { rec.g.classList.remove('dragging'); try { rec.g.releasePointerCapture(e.pointerId); } catch (_) { /* ignore */ } }
    this.root.classList.remove('is-dragging');
    if (H && H.onDrag) H.onDrag(pt, 'end', e);
  }

  _onKey(e, id) {
    const H = this.handleDesc.get(id);
    if (!H || !H.onKey) return;
    let steps = 0;
    const big = e.shiftKey ? 10 : 1;
    const vertical = H.type === 'vArrow';
    switch (e.key) {
      case 'ArrowRight': steps = vertical ? 0 : big; break;
      case 'ArrowLeft': steps = vertical ? 0 : -big; break;
      case 'ArrowUp': steps = big; break;
      case 'ArrowDown': steps = -big; break;
      case 'PageUp': steps = 10; break;
      case 'PageDown': steps = -10; break;
      default: return;
    }
    if (H.type === 'point' && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      e.preventDefault();
      H.onKey(steps, 'y');
      return;
    }
    if (!steps) return;
    e.preventDefault();
    H.onKey(steps, H.type === 'vArrow' ? 'y' : 'x');
  }

  _wireBackground() {
    let active = null;
    const cb = this.opts.onBackground;
    this.bg.addEventListener('pointerdown', e => {
      if (e.pointerType === 'touch' || e.button !== 0) return;
      active = e.pointerId;
      try { this.bg.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ }
      const p = this._eventPx(e);
      cb({ x: this.ix(p.x), y: this.iy(p.y) }, 'start', e);
    });
    this.bg.addEventListener('pointermove', e => {
      if (active !== e.pointerId) return;
      const p = this._eventPx(e), I = this.inner;
      cb({ x: this.ix(Math.max(I.x0, Math.min(I.x1, p.x))), y: this.iy(p.y) }, 'move', e);
    });
    const up = e => { if (active !== e.pointerId) return; active = null; cb(null, 'end', e); };
    this.bg.addEventListener('pointerup', up);
    this.bg.addEventListener('pointercancel', up);
  }

  _legend(items) {
    const key = JSON.stringify(items);
    if (key === this._legendKey) return;
    this._legendKey = key;
    this.legendEl.textContent = '';
    this.legendEl.hidden = !items.length;
    for (const it of items) {
      const s = document.createElement('span');
      s.className = 'legend-item';
      const sw = document.createElement('i');
      sw.className = 'swatch ' + (it.cls || '');
      s.appendChild(sw);
      s.appendChild(document.createTextNode(it.label));
      this.legendEl.appendChild(s);
    }
  }

  /** True while a handle is being dragged. */
  get dragging() { return !!this.drag; }

  destroy() { this.ro.disconnect(); this.root.remove(); }
}

/**
 * Smoothly animates a plot domain toward a target. Call step() once per animation frame;
 * it returns true while still moving.
 */
export class DomainAnimator {
  constructor(initial, tau = 90) {
    this.cur = { x: [...initial.x], y: [...initial.y] };
    this.target = { x: [...initial.x], y: [...initial.y] };
    this.tau = tau;
    this.last = 0;
  }
  setTarget(t, immediate = false) {
    if (t.x) this.target.x = [...t.x];
    if (t.y) this.target.y = [...t.y];
    if (immediate) { this.cur = { x: [...this.target.x], y: [...this.target.y] }; }
  }
  step(now = performance.now()) {
    const dt = this.last ? Math.min(64, now - this.last) : 16;
    this.last = now;
    const a = 1 - Math.exp(-dt / this.tau);
    let moving = false;
    for (const k of ['x', 'y']) {
      const span = Math.abs(this.target[k][1] - this.target[k][0]) || 1;
      for (let i = 0; i < 2; i++) {
        const d = this.target[k][i] - this.cur[k][i];
        if (Math.abs(d) < span * 2e-4) this.cur[k][i] = this.target[k][i];
        else { this.cur[k][i] += d * a; moving = true; }
      }
    }
    if (!moving) this.last = 0;
    return moving;
  }
}

/** Sample a function on [a, b] at n points, returning [[x, f(x)], ...]. */
export function sampleFn(f, a, b, n = 400) {
  const out = new Array(n);
  for (let i = 0; i < n; i++) {
    const x = a + (b - a) * i / (n - 1);
    let y;
    try { y = f(x); } catch (_) { y = NaN; }
    out[i] = [x, y];
  }
  return out;
}
