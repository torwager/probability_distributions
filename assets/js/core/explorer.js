// The standard interactive explorer used on every univariate distribution page:
// a PDF/PMF plot with drag handles, a linked CDF plot, a parameter panel,
// the optional "area under the curve" tool and live readouts.
//
//   const ex = mountExplorer(container, mod, { store });
//
// `store` holds { p: {...params}, area: {on, mode, a, b} } and is shared with the page so that
// the properties table can update live. See ARCHITECTURE.md for the module fields used here.

import { Plot, DomainAnimator, sampleFn } from './plot.js';
import { h, paramPanel, toggleSwitch, segmented, fmt, fmtInput, dragResolution, keyStep, isLogParam, texLabel } from './ui.js';
import { clamp, roundTo, niceStep } from './math.js';

const N_PDF = 400, N_CDF = 260, N_AREA = 160;

/** Default parameter object for a module (catalog defaults, then module.normalize). */
export function defaultParams(mod) {
  let p = {};
  for (const prm of mod.params) p[prm.key] = prm.default;
  if (mod.normalize) p = mod.normalize(p, null) || p;
  return p;
}

export function mountExplorer(container, mod, { store }) {
  const discrete = mod.kind === 'discrete';
  const paramByKey = Object.fromEntries(mod.params.map(p => [p.key, p]));
  const X = mod.explorer || {};
  const xName = X.xLabel || (discrete ? 'k' : 'x');

  // ------------------------------------------------------------ DOM
  const pdfCap = discrete ? `Probability mass  P(X = ${xName})` : `Probability density  f(${xName})`;
  const cdfCap = `Cumulative probability  F(${xName}) = P(X ≤ ${xName})`;
  const pdfBox = h('div', { class: 'plot-box' });
  const cdfBox = h('div', { class: 'plot-box' });
  const areaReadout = h('p', { class: 'area-readout', 'aria-live': 'polite', hidden: true });
  const figPdf = h('figure', { class: 'plot-fig fig-pdf' }, h('figcaption', {}, X.pdfCaption || pdfCap), pdfBox, areaReadout);
  const figCdf = h('figure', { class: 'plot-fig fig-cdf' }, h('figcaption', {}, X.cdfCaption || cdfCap), cdfBox);
  const panelBox = h('div', { class: 'explorer-params' }, h('h3', { class: 'mini-title' }, 'Parameters'));
  const areaBox = h('div', { class: 'explorer-area' }, h('h3', { class: 'mini-title' }, 'Area under the curve'));
  const readBox = h('div', { class: 'explorer-readouts' }, h('h3', { class: 'mini-title' }, 'Summary at these parameters'));
  const hint = h('p', { class: 'explorer-hint' },
    'Drag the amber handles on the density plot, or type values in the boxes. A focused handle also moves with the arrow keys (hold Shift for larger steps).');
  const root = h('div', { class: 'explorer' + (discrete ? ' is-discrete' : '') },
    h('div', { class: 'explorer-plots' }, figPdf, figCdf),
    h('div', { class: 'explorer-controls' }, panelBox, areaBox, readBox),
    hint);
  container.appendChild(root);

  const pdfPlot = new Plot(pdfBox, {
    xLabel: xName, yLabel: discrete ? 'probability' : 'density', ariaLabel: `${mod.name} ${discrete ? 'PMF' : 'PDF'} plot`,
    height: w => clamp(w < 480 ? w * 0.78 : w * 0.62, 240, 380),
    onBackground: (pt, phase) => onBackgroundDrag(pt, phase),
  });
  const cdfPlot = new Plot(cdfBox, {
    xLabel: xName, yLabel: 'F(' + xName + ')', ariaLabel: `${mod.name} CDF plot`,
    height: w => clamp(w < 480 ? w * 0.62 : w * 0.62, 200, 380),
    onBackground: (pt, phase) => onBackgroundDrag(pt, phase),
  });

  // ------------------------------------------------------------ parameter panel
  const panel = paramPanel(panelBox, mod.params, {
    get: () => store.get().p,
    apply: (key, v) => { applyParams({ [key]: v }, 'input'); },
    check: (key, v) => (mod.check ? mod.check({ ...store.get().p, [key]: v }) : null),
    onReset: () => {
      forceFit = true;
      if (!applyParams(defaultParams(mod), 'reset')) { forceFit = false; refitX(true); refitY(true); request(); }
    },
  });

  // ------------------------------------------------------------ area tool
  const areaToggle = toggleSwitch('Show area under the curve', store.get().area.on, on => setArea({ on }));
  const modeCtl = segmented([
    { value: 'left', label: 'Left of x' }, { value: 'right', label: 'Right of x' }, { value: 'between', label: 'Between' },
  ], store.get().area.mode, mode => setArea({ mode }), 'Which area to shade');
  const areaHelp = h('p', { class: 'small muted area-help' },
    discrete
      ? 'Highlights the bars to the left or right of a point (or between two points) and adds up their probabilities. The total equals the height of the CDF at that point, which is marked on the CDF plot.'
      : 'Shades the area under the density to the left or right of a point (or between two points). That area is a probability, and it equals the height of the CDF at that point, which is marked on the CDF plot.');
  areaBox.append(areaToggle.el, modeCtl.el, areaHelp);
  modeCtl.el.hidden = !store.get().area.on;

  // ------------------------------------------------------------ readouts
  const readKeys = X.readouts || [
    { key: 'mean', label: 'Mean' }, { key: 'sd', label: 'Standard deviation' },
    { key: 'median', label: 'Median' }, { key: 'mode', label: 'Mode' },
  ];
  const readDl = h('dl', { class: 'readouts' });
  const readEls = readKeys.map(r => {
    const dd = h('dd', { class: 'mono tnum' });
    readDl.append(h('dt', {}, r.label), dd);
    return dd;
  });
  readBox.appendChild(readDl);

  // ------------------------------------------------------------ state helpers
  function setArea(patch) {
    const s = store.get();
    let area = { ...s.area, ...patch };
    if (patch.on && !s.area.on) area = { ...area, ...initialThresholds(s.p) };
    if (patch.mode === 'between' && s.area.mode !== 'between') area = { ...area, ...initialThresholds(s.p, true) };
    store.set({ area });
    areaToggle.set(area.on);
    modeCtl.set(area.mode);
    modeCtl.el.hidden = !area.on;
    request();
  }

  function initialThresholds(p, keepA = false) {
    const [lo, hi] = anim.cur.x;
    const st = safeStats(p);
    let a = keepA ? store.get().area.a : (X.areaDefault ? X.areaDefault(p) : (Number.isFinite(st.median) ? st.median : Number.isFinite(st.mean) ? st.mean : (lo + hi) / 2));
    const sd = Number.isFinite(st.sd) && st.sd > 0 ? st.sd : (hi - lo) / 6;
    a = clamp(a, lo + 0.05 * (hi - lo), hi - 0.05 * (hi - lo));
    let b = a + sd;
    if (b > hi) { b = a; a = Math.max(lo, a - sd); }
    if (discrete) { a = Math.round(a); b = Math.max(a + 1, Math.round(b)); }
    else { const st2 = niceStep((hi - lo) / 400); a = roundTo(a, st2); b = roundTo(b, st2); }
    if (!(b > a)) b = Math.min(hi, a + (hi - lo) / 4);
    return { a, b };
  }

  function safeStats(p) {
    let st = {};
    try { st = mod.stats ? mod.stats(p) || {} : {}; } catch (e) { console.warn(e); }
    if (st.median === undefined && mod.quantile) { try { st = { ...st, median: mod.quantile(0.5, p) }; } catch (_) { /* ignore */ } }
    if (st.sd === undefined && Number.isFinite(st.variance)) st = { ...st, sd: Math.sqrt(st.variance) };
    return st;
  }

  function applyParams(patch, source) {
    const cur = store.get().p;
    let next = { ...cur };
    const changed = [];
    for (const [k, v0] of Object.entries(patch)) {
      const prm = paramByKey[k];
      let v = v0;
      if (prm && typeof v === 'number') {
        if (!Number.isFinite(v)) continue;
        v = clamp(v, prm.min, prm.max);
        if (prm.integer) v = Math.round(v);
        else if (source === 'drag') v = roundTo(v, isLogParam(prm) ? niceStep(Math.abs(v) / 300) : dragResolution(prm));
        v = clamp(v, prm.min, prm.max);
      }
      if (next[k] !== v) { next[k] = v; changed.push(k); }
    }
    if (!changed.length) return false;
    if (mod.normalize) next = mod.normalize(next, changed[0]) || next;
    if (source !== 'input' && mod.check && mod.check(next)) return false;
    store.set({ p: next });
    return true;
  }

  // ------------------------------------------------------------ view management
  const support0 = mod.support(store.get().p);
  const anim = new DomainAnimator({ x: xWindow(support0), y: [0, 1] });
  let dragging = null; // {spec, axis}
  let forceFit = false;

  function xWindow([lo, hi]) {
    if (discrete) return [Math.floor(lo) - 0.7, Math.ceil(hi) + 0.7];
    return [lo, hi];
  }

  function peakOf(p, [lo, hi]) {
    let vals;
    if (discrete) {
      vals = [];
      for (let k = Math.ceil(lo); k <= hi; k++) vals.push(safePdf(k, p));
    } else vals = sampleFn(x => safePdf(x, p), lo, hi, 300).map(v => v[1]);
    const fin = vals.filter(Number.isFinite);
    if (!fin.length) return 1;
    let max = Math.max(...fin);
    if (!discrete && fin.length > 20) {
      // ignore integrable spikes at the ends of the window (e.g. Beta with a shape < 1)
      const n = vals.length, m = Math.floor(n * 0.03);
      const interior = vals.slice(m, n - m).filter(Number.isFinite);
      const im = interior.length ? Math.max(...interior) : max;
      if (max > 3 * im && im > 0) max = 1.6 * im;
    }
    if (X.yMax) max = X.yMax(p) ?? max;
    return max > 0 ? max : 1;
  }

  function safePdf(x, p) {
    try { const v = mod.pdf(x, p); return Number.isFinite(v) ? v : (v === Infinity ? Infinity : NaN); } catch (_) { return NaN; }
  }

  function refitX(force = false) {
    const W = xWindow(mod.support(store.get().p));
    const D = anim.target.x;
    const wd = D[1] - D[0], ww = W[1] - W[0];
    const tol = 0.02 * wd;
    if (force || ww < 0.4 * wd) { anim.setTarget({ x: W }); return; }
    if (W[0] < D[0] - tol || W[1] > D[1] + tol) {
      // the curve left the view: widen the view to include both, so the move stays visible,
      // unless that would make the curve too small; then jump to the new window
      const U = [Math.min(D[0], W[0]), Math.max(D[1], W[1])];
      anim.setTarget({ x: U[1] - U[0] <= 3.2 * ww ? U : W });
    }
  }
  function refitY(force = false) {
    if (dragging && dragging.axis === 'y') return;
    const p = store.get().p;
    const peak = peakOf(p, anim.target.x);
    const cur = anim.target.y[1];
    let top = cur;
    if (force || peak > cur * 0.97) top = peak * (dragging ? 1.3 : 1.15);
    else if (peak < cur * 0.45) top = peak * 1.15;
    if (discrete) top = Math.min(top, 1.08);
    if (top !== cur) anim.setTarget({ y: [0, top] });
  }

  // first fit, no animation
  refitX(true); refitY(true);
  anim.setTarget({}, true);

  // ------------------------------------------------------------ handles
  function handleSpecs(p) {
    const hs = typeof mod.handles === 'function' ? mod.handles(p) : (mod.handles || []);
    return hs.filter(Boolean);
  }

  function describe(spec, i, p) {
    const prm = paramByKey[spec.param] || {};
    const label = spec.label ?? (prm.label || texLabel(prm.sym || spec.param || ''));
    const id = spec.id || `${spec.type}-${spec.param || i}`;
    const val = p[spec.param];
    const d = {
      id, type: spec.type, label, color: spec.color, cls: spec.cls,
      ariaLabel: spec.ariaLabel || `${prm.name || spec.param} (${label}). Drag, or use the arrow keys.`,
      valueText: typeof val === 'number' ? fmtInput(val, prm) : '', valueNow: typeof val === 'number' ? val : '',
      valueMin: prm.min, valueMax: prm.max,
      onDrag: (pt, phase) => onHandleDrag(spec, pt, phase),
      onKey: (steps, axis) => onHandleKey(spec, steps, axis),
    };
    try {
      if (spec.type === 'vline' || spec.type === 'xPoint') {
        d.x = spec.x ? spec.x(p) : p[spec.param];
        if (spec.lineTo) d.lineTo = spec.lineTo(p);
      } else if (spec.type === 'hArrow' || spec.type === 'vArrow') {
        d.from = spec.from(p); d.to = spec.to(p);
      } else if (spec.type === 'point') {
        d.at = spec.at(p);
      }
    } catch (e) { console.warn('handle geometry failed', spec, e); return null; }
    return d;
  }

  function defaultSet(spec, pt, p) {
    switch (spec.type) {
      case 'vline': case 'xPoint': return { [spec.param]: pt.x };
      case 'hArrow': return { [spec.param]: pt.x - spec.from(p).x };
      case 'vArrow': return { [spec.param]: pt.y - spec.from(p).y };
      default: return {};
    }
  }

  function onHandleDrag(spec, pt, phase) {
    if (phase === 'start') {
      dragging = { spec, axis: spec.type === 'vArrow' || spec.type === 'point' ? 'y' : 'x', p0: { ...store.get().p } };
    }
    if (pt) {
      const p = store.get().p;
      let patch;
      try { patch = spec.set ? spec.set(pt, p, dragging ? dragging.p0 : p) : defaultSet(spec, pt, p); } catch (e) { console.warn(e); patch = null; }
      if (patch) applyParams(patch, 'drag');
    }
    if (phase === 'end') { dragging = null; refitX(); refitY(); request(); }
  }

  function onHandleKey(spec, steps, axis) {
    const key = axis === 'y' ? (spec.keyY || spec.param) : (spec.keyX || spec.param);
    const prm = paramByKey[key];
    if (!prm) return;
    const p = store.get().p;
    const st = keyStep(prm);
    const v = prm.integer ? Math.round(p[key] + steps) : roundTo(p[key] + steps * st, st);
    applyParams({ [key]: v }, 'key');
    refitX(); refitY(); request();
  }

  // ------------------------------------------------------------ area threshold handles
  let bgDrag = false;
  function moveThreshold(which, x) {
    const s = store.get();
    const [lo, hi] = anim.cur.x;
    let v = clamp(x, lo, hi);
    v = discrete ? Math.round(v) : roundTo(v, niceStep((hi - lo) / 400));
    let { a, b } = s.area;
    if (which === 'a') { a = v; if (s.area.mode === 'between' && a > b) a = b; }
    else { b = v; if (b < a) b = a; }
    if (a !== s.area.a || b !== s.area.b) { store.set({ area: { ...s.area, a, b } }); }
  }
  function onBackgroundDrag(pt, phase) {
    const s = store.get();
    if (!s.area.on) return;
    if (phase === 'start') {
      bgDrag = s.area.mode === 'between' && Math.abs(pt.x - s.area.b) < Math.abs(pt.x - s.area.a) ? 'b' : 'a';
    }
    if (pt && bgDrag) moveThreshold(bgDrag, pt.x);
    if (phase === 'end') bgDrag = false;
  }

  function thresholdHandles(s, forCdf) {
    if (!s.area.on) return [];
    const p = s.p;
    const out = [];
    const mk = (which, x) => ({
      id: `area-${which}`, type: 'xPoint', x, cls: 'threshold',
      label: s.area.mode === 'between' ? which : xName,
      lineTo: forCdf ? safeCdf(x, p) : (discrete ? safePdf(Math.round(x), p) : safePdf(x, p)),
      ariaLabel: `Area boundary ${s.area.mode === 'between' ? which : xName}. Drag, or use the arrow keys.`,
      valueText: fmt(x), valueNow: x,
      onDrag: (pt, phase) => { if (pt) moveThreshold(which, pt.x); if (phase === 'end') request(); },
      onKey: steps => {
        const [lo, hi] = anim.cur.x;
        const st = discrete ? 1 : niceStep((hi - lo) / 100);
        moveThreshold(which, discrete ? x + steps : roundTo(x + steps * st, st));
      },
    });
    out.push(mk('a', s.area.a));
    if (s.area.mode === 'between') out.push(mk('b', s.area.b));
    return out;
  }

  function safeCdf(x, p) { try { return mod.cdf(x, p); } catch (_) { return NaN; } }
  function safeSf(x, p) {
    try { return mod.sf ? mod.sf(x, p) : 1 - mod.cdf(x, p); } catch (_) { return NaN; }
  }

  // ------------------------------------------------------------ drawing
  let rafId = 0;
  function request() { if (!rafId) rafId = requestAnimationFrame(frame); }
  function frame(now) {
    rafId = 0;
    const moving = anim.step(now);
    draw();
    if (moving) request();
  }

  function areaValue(s) {
    const { p, area } = s;
    const Fa = safeCdf(area.a, p);
    if (area.mode === 'left') return Fa;
    if (area.mode === 'right') return safeSf(area.a, p);
    return safeCdf(area.b, p) - Fa;
  }

  function draw() {
    const s = store.get();
    const p = s.p;
    const [lo, hi] = anim.cur.x;
    const yd = anim.cur.y;
    const layers = [], cdfLayers = [];
    const legend = [];
    const area = s.area;

    if (!discrete) {
      const pts = sampleFn(x => safePdf(x, p), lo, hi, N_PDF);
      layers.push({ id: 'pdf-fill', type: 'area', points: pts, cls: 'pdf-fill' });
      if (area.on) {
        let a0, a1;
        if (area.mode === 'left') { a0 = lo; a1 = clamp(area.a, lo, hi); }
        else if (area.mode === 'right') { a0 = clamp(area.a, lo, hi); a1 = hi; }
        else { a0 = clamp(area.a, lo, hi); a1 = clamp(area.b, lo, hi); }
        if (a1 > a0) layers.push({ id: 'area-shade', type: 'area', points: sampleFn(x => safePdf(x, p), a0, a1, N_AREA), cls: 'area-shade' });
        else layers.push({ id: 'area-shade', type: 'area', points: [], cls: 'area-shade' });
      }
      for (const ov of (X.overlays ? X.overlays(p) : [])) {
        layers.push({ id: 'ov-' + ov.id, type: 'line', points: sampleFn(ov.pdf, lo, hi, N_PDF), cls: ov.cls || 'curve-ref' });
        legend.push({ label: ov.label, cls: ov.cls || 'curve-ref' });
      }
      layers.push({ id: 'pdf', type: 'line', points: pts, cls: 'curve-main' });
    } else {
      const ks = [];
      for (let k = Math.ceil(lo); k <= Math.floor(hi); k++) ks.push(k);
      const pts = ks.map(k => [k, safePdf(k, p)]);
      const inArea = k => area.mode === 'left' ? k <= area.a : area.mode === 'right' ? k > area.a : (k > area.a && k <= area.b);
      for (const ov of (X.overlays ? X.overlays(p) : [])) {
        layers.push({ id: 'ov-' + ov.id, type: 'line', points: sampleFn(ov.pdf, lo, hi, N_PDF), cls: ov.cls || 'curve-ref' });
        legend.push({ label: ov.label, cls: ov.cls || 'curve-ref' });
      }
      layers.push({ id: 'pmf', type: 'stems', points: area.on ? pts.filter(([k]) => !inArea(k)) : pts, cls: 'pmf' });
      layers.push({ id: 'pmf-on', type: 'stems', points: area.on ? pts.filter(([k]) => inArea(k)) : [], cls: 'pmf-on' });
    }
    if (X.extraLayers) { try { layers.push(...X.extraLayers(p, { x: [lo, hi], y: yd })); } catch (e) { console.warn(e); } }
    if (legend.length) legend.unshift({ label: mod.name, cls: 'curve-main' });

    const handles = [];
    const hs = handleSpecs(p);
    hs.forEach((spec, i) => { const d = describe(spec, i, p); if (d) handles.push(d); });
    handles.push(...thresholdHandles(s, false));

    pdfPlot.render({ x: [lo, hi], y: yd, discreteX: discrete, layers, handles, legend });

    // ---- CDF
    cdfLayers.push({ id: 'one', type: 'hline', y: 1, cls: 'ref-line' });
    if (!discrete) {
      cdfLayers.push({ id: 'cdf', type: 'line', points: sampleFn(x => safeCdf(x, p), lo, hi, N_CDF), cls: 'curve-main' });
      for (const ov of (X.overlays ? X.overlays(p) : [])) if (ov.cdf) cdfLayers.push({ id: 'ov-' + ov.id, type: 'line', points: sampleFn(ov.cdf, lo, hi, N_CDF), cls: ov.cls || 'curve-ref' });
    } else {
      const ks = [];
      for (let k = Math.ceil(lo); k <= Math.floor(hi); k++) ks.push(k);
      const pts = ks.map(k => [k, safeCdf(k, p)]);
      cdfLayers.push({ id: 'cdf', type: 'step', points: pts, x0: lo, y0: ks.length ? safeCdf(ks[0] - 1, p) : 0, cls: 'curve-main' });
    }
    if (area.on) {
      const Fa = safeCdf(area.a, p);
      const xEdge = lo + (hi - lo) * 0.015;
      const guide = (id, x, F) => {
        cdfLayers.push({ id: id + '-v', type: 'segment', x1: x, y1: 0, x2: x, y2: F, cls: 'guide' });
        cdfLayers.push({ id: id + '-h', type: 'segment', x1: lo, y1: F, x2: x, y2: F, cls: 'guide' });
        cdfLayers.push({ id: id + '-dot', type: 'dot', x, y: F, r: 5, cls: 'marker' });
      };
      guide('ga', area.a, Fa);
      const v = areaValue(s);
      if (area.mode === 'left') {
        cdfLayers.push({ id: 'br', type: 'bracket', x: xEdge, y1: 0, y2: Fa, side: 'left', cls: 'area-bracket', label: `F(${xName}) = ${fmt(Fa, 3)}` });
      } else if (area.mode === 'right') {
        cdfLayers.push({ id: 'br', type: 'bracket', x: xEdge, y1: Fa, y2: 1, side: 'left', cls: 'area-bracket', label: `1 − F(${xName}) = ${fmt(v, 3)}` });
      } else {
        const Fb = safeCdf(area.b, p);
        guide('gb', area.b, Fb);
        cdfLayers.push({ id: 'br', type: 'bracket', x: xEdge, y1: Fa, y2: Fb, side: 'left', cls: 'area-bracket', label: `F(b) − F(a) = ${fmt(v, 3)}` });
      }
    }
    cdfPlot.render({ x: [lo, hi], y: [-0.02, 1.06], discreteX: discrete, layers: cdfLayers, handles: thresholdHandles(s, true) });

    // ---- readouts
    updateAreaReadout(s);
  }

  function updateAreaReadout(s) {
    const { area } = s;
    areaReadout.hidden = !area.on;
    if (!area.on) return;
    const v = areaValue(s);
    const a = fmt(area.a), b = fmt(area.b);
    const X_ = '<i>X</i>';
    let html;
    if (area.mode === 'left') html = `Shaded ${discrete ? 'bars' : 'area'}: P(${X_} ≤ ${a}) = <i>F</i>(${a}) = <b>${fmt(v)}</b>`;
    else if (area.mode === 'right') html = `Shaded ${discrete ? 'bars' : 'area'}: P(${X_} &gt; ${a}) = 1 − <i>F</i>(${a}) = <b>${fmt(v)}</b>`;
    else html = `Shaded ${discrete ? 'bars' : 'area'}: P(${a} &lt; ${X_} ≤ ${b}) = <i>F</i>(${b}) − <i>F</i>(${a}) = <b>${fmt(v)}</b>`;
    areaReadout.innerHTML = html;
  }

  function updateReadouts(p) {
    const st = safeStats(p);
    readKeys.forEach((r, i) => {
      const v = r.value ? r.value(p, st) : st[r.key];
      readEls[i].textContent = v === undefined ? '—' : fmt(v);
    });
  }

  // ------------------------------------------------------------ wiring
  let lastP = store.get().p;
  store.subscribe((s, prev) => {
    if (s.p !== prev.p) {
      panel.update(s.p);
      updateReadouts(s.p);
      if (!dragging) refitX(forceFit);
      refitY(forceFit);
      forceFit = false;
      // keep thresholds inside the (target) view
      if (s.area.on) {
        const [lo, hi] = anim.target.x;
        if (s.area.a < lo || s.area.a > hi || (s.area.mode === 'between' && (s.area.b < lo || s.area.b > hi))) {
          const t = initialThresholds(s.p);
          store.set({ area: { ...s.area, a: clamp(s.area.a, lo, hi) === s.area.a ? s.area.a : t.a, b: clamp(s.area.b, lo, hi) === s.area.b ? s.area.b : t.b } });
        }
      }
      lastP = s.p;
    }
    request();
  });
  updateReadouts(lastP);
  draw();

  return {
    store, plots: { pdf: pdfPlot, cdf: cdfPlot }, request,
    applyParams, setArea,
    destroy() { pdfPlot.destroy(); cdfPlot.destroy(); root.remove(); },
  };
}
