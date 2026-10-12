// Pan and zoom for the map. The world element is moved with a CSS transform inside a clipping viewport.
//
// Mouse: drag the background or a tile to pan (a click without movement still opens the tile);
//        Ctrl/⌘ + wheel (or a trackpad pinch) zooms; a plain wheel zooms once the map has been clicked,
//        otherwise it scrolls the page and a hint explains how to zoom.
// Touch: one finger pans, two fingers pinch-zoom, a tap opens what is under the finger.
// Keyboard (viewport focused): arrow keys pan, + and − zoom, 0 fits the whole map.
//
// `world` is the element that is moved (the map's stage); setSize() changes the size of what it shows
// (the two views of the map have different sizes). The first view (and the view after a resize, while
// the map has not been moved) fits the whole map, except that it is never smaller than startScale()
// (used on phones, where the whole map would be too small to read): then it shows the middle of the map,
// or the point startCenter().

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

export function createPanZoom(viewport, world, { width, height, pad = 16, insets = () => ({}), onHint, onFirstTouch, maxScale = 2.6, startScale = () => 0, startCenter = () => null } = {}) {
  let s = 1, x = 0, y = 0;
  let fitted = 'start';        // still showing the start view or the whole map ('start' / 'whole'; refit on resize)
  let active = false;          // the map has been clicked: plain wheel zooms
  let minScale = 0.2;
  const listeners = new Set();

  const vw = () => viewport.clientWidth, vh = () => viewport.clientHeight;

  function apply(animate = false) {
    if (animate) {
      world.classList.add('pz-anim');
      clearTimeout(apply.t);
      apply.t = setTimeout(() => world.classList.remove('pz-anim'), 260);
    }
    world.style.transform = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) scale(${s.toFixed(4)})`;
    for (const fn of listeners) fn({ s, x, y });
  }

  // room kept free for the controls that float over the map ({right, bottom} in px)
  const ins = () => ({ left: 0, right: 0, bottom: 0, top: 0, ...insets() });
  function fitScale() {
    const i = ins();
    return Math.min((vw() - 2 * pad - i.left - i.right) / width, (vh() - 2 * pad - i.bottom - i.top) / height);
  }

  function constrain() {
    // keep at least a third of the viewport covered by the map
    const W = width * s, H = height * s;
    const mx = Math.min(vw() * 0.66, W * 0.66), my = Math.min(vh() * 0.66, H * 0.66);
    x = clamp(x, mx - W, vw() - mx);
    y = clamp(y, my - H, vh() - my);
  }

  /** Show the whole map (whole = true) or the start view (the whole map, or the middle at startScale()). */
  function fit(animate = false, whole = true) {
    const f = fitScale();
    minScale = Math.min(f * 0.85, 0.5);
    s = whole ? f : Math.max(f, Math.min(maxScale, startScale() || 0));
    const i = ins();
    x = i.left + (vw() - i.left - i.right - width * s) / 2;
    y = i.top + (vh() - i.top - i.bottom - height * s) / 2;
    fitted = whole ? 'whole' : 'start';
    if (s > f) {
      // zoomed in beyond the whole map: center on startCenter() (world units) when given
      const c = startCenter();
      if (c) { x = i.left + (vw() - i.left - i.right) / 2 - c[0] * s; y = i.top + (vh() - i.top - i.bottom) / 2 - c[1] * s; }
      constrain();
    }
    apply(animate);
  }

  function zoomAt(factor, cx, cy, animate = false) {
    const ns = clamp(s * factor, minScale, maxScale);
    if (ns === s) return;
    x = cx - (cx - x) * (ns / s);
    y = cy - (cy - y) * (ns / s);
    s = ns;
    fitted = false;
    constrain();
    apply(animate);
  }

  function panBy(dx, dy, animate = false) {
    x += dx; y += dy;
    fitted = false;
    constrain();
    apply(animate);
  }

  /** Pan so that the world-space box {x, y, w, h} is inside the viewport (with a margin). */
  function ensureVisible(b, margin = 24) {
    const L = x + b.x * s, T = y + b.y * s, R = L + b.w * s, B = T + b.h * s;
    let dx = 0, dy = 0;
    if (L < margin) dx = margin - L; else if (R > vw() - margin) dx = vw() - margin - R;
    if (T < margin) dy = margin - T; else if (B > vh() - margin) dy = vh() - margin - B;
    if (dx || dy) panBy(dx, dy, true);
  }

  /** Viewport point (client coordinates) to viewport-local coordinates. */
  const local = e => { const r = viewport.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };

  // ------------------------------------------------------------- pointers
  const pts = new Map();
  let dragging = false, moved = 0, start = null, pinch = null, suppressClick = false;

  viewport.addEventListener('pointerdown', e => {
    if (e.button !== undefined && e.button !== 0) return;
    if (e.target.closest('.map-ctl')) return;
    pts.set(e.pointerId, local(e));
    if (pts.size === 1) {
      start = { p: local(e), x, y };
      moved = 0;
      dragging = false;
      suppressClick = false;
      if (!e.target.closest('a, button')) active = true;
      onFirstTouch && onFirstTouch();
    } else if (pts.size === 2) {
      const [a, b] = [...pts.values()];
      pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]) || 1, s, cx: (a[0] + b[0]) / 2, cy: (a[1] + b[1]) / 2, x, y };
      dragging = true;
    }
  });

  viewport.addEventListener('pointermove', e => {
    if (!pts.has(e.pointerId)) return;
    pts.set(e.pointerId, local(e));
    if (pts.size >= 2 && pinch) {
      const [a, b] = [...pts.values()];
      const d = Math.hypot(a[0] - b[0], a[1] - b[1]) || 1;
      const cx = (a[0] + b[0]) / 2, cy = (a[1] + b[1]) / 2;
      const ns = clamp(pinch.s * d / pinch.d, minScale, maxScale);
      // keep the world point under the initial midpoint under the current midpoint
      const wx = (pinch.cx - pinch.x) / pinch.s, wy = (pinch.cy - pinch.y) / pinch.s;
      s = ns; x = cx - wx * s; y = cy - wy * s;
      fitted = false;
      constrain(); apply();
      suppressClick = true;
      return;
    }
    if (!start) return;
    const p = local(e);
    const dx = p[0] - start.p[0], dy = p[1] - start.p[1];
    moved = Math.max(moved, Math.hypot(dx, dy));
    if (!dragging && moved > 6) {
      dragging = true;
      suppressClick = true;
      viewport.classList.add('is-panning');
      try { viewport.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ }
    }
    if (dragging) {
      x = start.x + dx; y = start.y + dy;
      fitted = false;
      constrain(); apply();
    }
  });

  let lastTap = null;
  const end = e => {
    if (!pts.has(e.pointerId)) return;
    // double tap / double click on the background zooms in around that point
    if (e.type === 'pointerup' && pts.size === 1 && !dragging && moved < 6 && !e.target.closest('a, button')) {
      const p = local(e), now = performance.now();
      if (lastTap && now - lastTap.t < 320 && Math.hypot(p[0] - lastTap.p[0], p[1] - lastTap.p[1]) < 30) { zoomAt(1.8, p[0], p[1], true); lastTap = null; }
      else lastTap = { t: now, p };
    }
    pts.delete(e.pointerId);
    if (pts.size < 2) pinch = null;
    if (pts.size === 1) {
      // continue panning with the remaining finger
      const p = [...pts.values()][0];
      start = { p, x, y };
    }
    if (pts.size === 0) {
      start = null;
      dragging = false;
      viewport.classList.remove('is-panning');
    }
  };
  viewport.addEventListener('pointerup', end);
  viewport.addEventListener('pointercancel', end);
  // only the viewport's own capture matters (a touch is implicitly captured by the element under the finger)
  viewport.addEventListener('lostpointercapture', e => { if (e.target === viewport) end(e); });

  // a drag that started on a tile must not open it
  viewport.addEventListener('click', e => {
    if (suppressClick) { e.preventDefault(); e.stopPropagation(); suppressClick = false; }
  }, true);

  // ------------------------------------------------------------- wheel
  viewport.addEventListener('wheel', e => {
    const zoomKey = e.ctrlKey || e.metaKey;
    if (!zoomKey && !active && !viewport.closest('.is-full')) { onHint && onHint(); return; }
    e.preventDefault();
    const [cx, cy] = local(e);
    const dy = Math.max(-80, Math.min(80, e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY));
    zoomAt(Math.exp(-dy * (zoomKey ? 0.006 : 0.0025)), cx, cy);
  }, { passive: false });
  viewport.addEventListener('pointerleave', () => { if (!pts.size) active = false; });

  // ------------------------------------------------------------- keyboard (on the viewport itself)
  viewport.addEventListener('keydown', e => {
    if (e.target !== viewport) return;
    const step = 60;
    const k = e.key;
    if (k === 'ArrowLeft') panBy(step, 0, true);
    else if (k === 'ArrowRight') panBy(-step, 0, true);
    else if (k === 'ArrowUp') panBy(0, step, true);
    else if (k === 'ArrowDown') panBy(0, -step, true);
    else if (k === '+' || k === '=') zoomAt(1.25, vw() / 2, vh() / 2, true);
    else if (k === '-' || k === '_') zoomAt(0.8, vw() / 2, vh() / 2, true);
    else if (k === '0') fit(true);
    else return;
    e.preventDefault();
  });

  // focusing an element inside an overflow:hidden box scrolls the box; undo that and pan instead
  viewport.addEventListener('scroll', () => {
    if (viewport.scrollLeft || viewport.scrollTop) {
      const dx = viewport.scrollLeft, dy = viewport.scrollTop;
      viewport.scrollLeft = 0; viewport.scrollTop = 0;
      panBy(-dx, -dy);
    }
  });

  let lastW = 0, lastH = 0;
  const ro = new ResizeObserver(() => {
    if (vw() === lastW && vh() === lastH) return;
    const first = !lastW;
    lastW = vw(); lastH = vh();
    if (first || fitted) fit(false, fitted === 'whole');
    else { minScale = Math.min(fitScale() * 0.85, 0.5); constrain(); apply(); }
  });
  ro.observe(viewport);

  /** Change the size of the content (world units) and show its start view. */
  function setSize(w, h, animate = false) {
    width = w; height = h;
    fit(animate, false);
  }

  return {
    fit, zoomAt, panBy, ensureVisible, setSize,
    /** The start view: the whole map, or its middle at a readable scale on a phone. */
    reset: (animate = false) => fit(animate, false),
    get fitted() { return fitted; },
    zoomIn: () => zoomAt(1.3, vw() / 2, vh() / 2, true),
    zoomOut: () => zoomAt(1 / 1.3, vw() / 2, vh() / 2, true),
    get scale() { return s; },
    get state() { return { s, x, y }; },
    onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    /** world coordinates -> viewport-local coordinates */
    toScreen: (wx, wy) => [x + wx * s, y + wy * s],
  };
}
