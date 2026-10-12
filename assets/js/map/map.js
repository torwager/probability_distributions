// The interactive map of distributions (home page).
//
// The map has two views, each with its own hand-made layout:
//   core  "Core distributions": the 15 distributions of the original chart and the relationships between
//         them (layout-core.js); the default
//   full  "Full set of distributions": every distribution and relationship in the catalog (layout.js)
// Each view is one "world" element; both sit in a stage that pan and zoom move (panzoom.js), and
// setView() cross-fades from one to the other and fits the new one to the frame.
//
// Structure of a world (one per view):
//   svg.map-bg      soft regions behind the tiles of each family (colors explained in the legend)
//   svg.map-edges   one <g class="edge k-<kind>"> per relation: a wide invisible hit path, the visible
//                   line and one or two arrowheads
//   div.map-tiles   one <a class="map-tile"> per distribution (name + density sketch)
//   div.map-labels  one <button class="edge-label"> per relation (KaTeX), placed next to its arrow
// Over the map, inside the frame: the zoom buttons, a card that describes the tile under the pointer
// (or the focused tile), and a line that describes the arrow under the pointer.

import { DISTRIBUTIONS, RELATIONS, KIND_LABELS, getDist } from '../catalog.js';
import { h, renderTex, firstSentence, richToHtml, splitTexLines } from '../core/ui.js';
import { loadDist, hasDist } from '../core/ctx.js';
import { groupLabel } from '../core/layout.js';
import * as FULL from './layout.js';
import * as CORE from './layout-core.js';
import { GROUP_STYLE, shortName } from './layout.js';
import { rawSegments, clipSegments, sample, pointAt, trim, pathD, arrowHead, overlap } from './geometry.js';
import { glyphMarkup } from './glyphs.js';
import { createPanZoom } from './panzoom.js';
import { openRelationDialog, relTitle } from './dialog.js';

export const KIND_ORDER = ['special-case', 'transformation', 'sum', 'ratio', 'limit', 'mixture', 'conditioning', 'conjugate-prior', 'other'];
const KIND_SHORT = { discrete: 'discrete', continuous: 'continuous', 'multivariate-discrete': 'multivariate, discrete', 'multivariate-continuous': 'multivariate, continuous' };
const SVGNS = 'http://www.w3.org/2000/svg';
const svgEl = (tag, attrs = {}) => {
  const e = document.createElementNS(SVGNS, tag);
  for (const [k, v] of Object.entries(attrs)) if (v !== undefined && v !== null) e.setAttribute(k, v);
  return e;
};

/** The ids of the core distributions and the relations between them. */
export const CORE_IDS = new Set(DISTRIBUTIONS.filter(d => d.onOriginalMap).map(d => d.id));
export const isCoreRel = r => CORE_IDS.has(r.from) && CORE_IDS.has(r.to);

/** The two views: name, button label, layout, distributions and relations. */
export const VIEWS = {
  core: { name: 'core', label: 'Core distributions', layout: CORE, dists: DISTRIBUTIONS.filter(d => CORE_IDS.has(d.id)), rels: RELATIONS.filter(isCoreRel) },
  full: { name: 'full', label: 'Full set of distributions', layout: FULL, dists: DISTRIBUTIONS, rels: RELATIONS },
};

/** Tile rectangle {x, y, w, h} (top-left corner) in world units. */
function tileRectIn(L, id) {
  const n = L.NODES[id];
  const w = n.w || L.TILE.w, hh = n.h || L.TILE.h;
  return { x: n.x - w / 2, y: n.y - hh / 2, w, h: hh };
}

/** Geometry of every edge: clipped segments, arrowheads, sampled polyline. */
function edgeGeometryIn(L, rel) {
  const A = L.NODES[rel.from], B = L.NODES[rel.to];
  const route = L.ROUTES[rel.id] || {};
  const raw = rawSegments([A.x + (route.fromDx || 0), A.y + (route.fromDy || 0)], [B.x + (route.toDx || 0), B.y + (route.toDy || 0)], route);
  let segs = clipSegments(raw, tileRectIn(L, rel.from), tileRectIn(L, rel.to), 5);
  const smpFull = sample(segs);
  const HEAD = 9;
  const heads = [];
  // arrowhead at the target; and at the source for two-way relations
  const end = pointAt(smpFull, 1), start = pointAt(smpFull, 0);
  const endTan = pointAt(smpFull, Math.max(0, 1 - 6 / smpFull.length));
  const startTan = pointAt(smpFull, Math.min(1, 6 / smpFull.length));
  heads.push(arrowHead(end.p, norm([end.p[0] - endTan.p[0], end.p[1] - endTan.p[1]]), HEAD));
  segs = trim(segs, HEAD * 0.7, true);
  if (rel.bidirectional) {
    heads.push(arrowHead(start.p, norm([start.p[0] - startTan.p[0], start.p[1] - startTan.p[1]]), HEAD));
    segs = trim(segs, HEAD * 0.7, false);
  }
  return { segs, heads, smp: smpFull, d: pathD(segs) };
}
const norm = v => { const L = Math.hypot(v[0], v[1]) || 1; return [v[0] / L, v[1] / L]; };

/** Length of the segment p-q inside the box {x, y, w, h} (Liang–Barsky clipping). */
function clipLen(p, q, b) {
  const dx = q[0] - p[0], dy = q[1] - p[1];
  let t0 = 0, t1 = 1;
  for (const [pp, qq] of [[-dx, p[0] - b.x], [dx, b.x + b.w - p[0]], [-dy, p[1] - b.y], [dy, b.y + b.h - p[1]]]) {
    if (pp === 0) { if (qq < 0) return 0; continue; }
    const r = qq / pp;
    if (pp < 0) { if (r > t1) return 0; if (r > t0) t0 = r; } else { if (r < t0) return 0; if (r < t1) t1 = r; }
  }
  return (t1 - t0) * Math.hypot(dx, dy);
}

function bboxOf(pts) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of pts) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  return [x0, y0, x1, y1];
}

/**
 * Choose a label position along the edge that does not overlap tiles, other labels or (if possible)
 * other edges. Candidates slide along the curve from the preferred fraction and sit on the line or
 * beside it.
 */
function placeLabels(items, tileRects, edgeSamples, ROUTES) {
  const placed = [];
  const order = items.slice().sort((a, b) => (a.priority || 0) - (b.priority || 0));
  for (const it of order) {
    const { w, h: hh } = it.size;
    const route = ROUTES[it.rel.id] || {};
    const base = route.lt ?? 0.5;
    const cands = [];
    const fr = route.fixed ? [0] : [0, 0.05, -0.05, 0.1, -0.1, 0.15, -0.15, 0.2, -0.2, 0.26, -0.26, 0.32, -0.32];
    const offs = route.lo !== undefined ? [route.lo] : [0, 1, -1];
    const L = it.smp.length;
    for (const df of fr) for (const o of offs) {
      const f = base + df;
      if (f < 0.03 || f > 0.97) continue;
      const { p, d } = pointAt(it.smp, Math.min(0.97, Math.max(0.03, f)));
      const nx = -d[1], ny = d[0];
      // perpendicular offset: enough to clear the line, measured in the label's own extent
      const dist = o === 0 ? 0 : (Math.abs(nx) * w / 2 + Math.abs(ny) * hh / 2 + 7) * Math.sign(o) * (route.lo !== undefined ? Math.abs(o) : 1);
      const cx = p[0] + nx * dist + (route.ldx || 0), cy = p[1] + ny * dist + (route.ldy || 0);
      let cost = Math.abs(df) * 40 + (o === 0 ? 0 : 6);
      // a label sitting on a short arrow would hide it: keep at least 16 px of line visible on each side
      // of the label (plus the arrowheads), otherwise put the label beside the line
      if (o === 0) {
        const ext = Math.abs(d[0]) * w / 2 + Math.abs(d[1]) * hh / 2;
        const before = f * L - ext - (it.rel.bidirectional ? 9 : 0), after = (1 - f) * L - ext - 9;
        if (Math.min(before, after) < 16) cost += 400;
      }
      cands.push({ cx, cy, cost });
    }
    let best = null;
    for (const c of cands) {
      const box = { x: c.cx - w / 2, y: c.cy - hh / 2, w, h: hh };
      let cost = c.cost;
      for (const r of tileRects) cost += overlap(box, r, 6) * 50;
      for (const q of placed) cost += overlap(box, q.box, 4) * 50;
      // other edges running under the label
      // (length of the other edge inside the label box, grown by a few px, plus a fixed cost per edge, so
      // that a label is never read as belonging to a line that merely passes under it)
      const gb = { x: box.x - 4, y: box.y - 4, w: w + 8, h: hh + 8 };
      for (const [eid, smp] of edgeSamples) {
        if (eid === it.rel.id) continue;
        const bb = smp.bbox || (smp.bbox = bboxOf(smp.pts));
        if (bb[0] > gb.x + gb.w || bb[2] < gb.x || bb[1] > gb.y + gb.h || bb[3] < gb.y) continue;
        let inside = 0;
        for (let k = 1; k < smp.pts.length; k++) inside += clipLen(smp.pts[k - 1], smp.pts[k], gb);
        if (inside > 0) cost += 30 + inside * 1.5;
      }
      if (!best || cost < best.cost) best = { ...c, cost, box };
    }
    placed.push({ it, box: best.box, cost: best.cost });
    it.pos = [best.cx, best.cy];
  }
  return placed;
}

/** Build the map inside `root`. Returns an API used by the page script and the tests. */
export function buildMap(root, { onReady, view: startView = 'core' } = {}) {
  // ---------------------------------------------------------------- frame and controls
  const stage = h('div', { class: 'map-stage' });
  const viewport = h('div', {
    class: 'map-viewport', tabindex: '0', role: 'region',
    'aria-label': 'Map of distributions. Tab moves through the distributions and then the arrows; Enter opens one. With the map itself focused, arrow keys pan, plus and minus zoom, and 0 shows the whole map.',
  }, stage);
  const info = h('div', { class: 'map-info', 'aria-hidden': 'true' });
  const card = h('div', { class: 'map-card', id: 'map-card', role: 'tooltip' });
  const hint = h('div', { class: 'map-hint', 'aria-hidden': 'true' }, 'Hold Ctrl (or ⌘) and scroll to zoom, or use the + and − buttons. Drag to move the map.');
  const btn = (cls, label, text, onclick) => h('button', { type: 'button', class: 'map-btn ' + cls, 'aria-label': label, title: label, onclick }, text);
  const zoomCtl = h('div', { class: 'map-ctl map-zoom' });
  const touchHint = h('div', { class: 'map-touch-hint', 'aria-hidden': 'true' }, 'Pinch to zoom, drag to move, tap to open.');
  const frame = h('div', { class: 'map-frame' }, viewport, zoomCtl, info, card, hint, touchHint);
  root.append(frame);

  let hintT = 0;
  const showHint = () => {
    hint.classList.add('show');
    clearTimeout(hintT);
    hintT = setTimeout(() => hint.classList.remove('show'), 1600);
  };
  const narrow = () => window.matchMedia('(max-width: 700px)').matches;
  let active = null;   // the view shown
  // the zoom buttons take a strip of the frame: a column on the right, or a row at the bottom when the map
  // is limited by the width of the frame (then the strip at the bottom costs nothing and the map is larger)
  const CTL = 50, LEGEND_W = 200;
  function ctlInsets() {
    const L = (active || VIEWS[startView] || VIEWS.core).layout.WORLD;
    const fw = viewport.clientWidth - 12, fh = viewport.clientHeight - 12;
    const right = Math.min((fw - CTL) / L.w, fh / L.h), bottom = Math.min(fw / L.w, (fh - CTL) / L.h);
    const row = bottom > right * 1.005;
    frame.classList.toggle('ctl-row', row);
    if (row) return { bottom: CTL };
    // a map limited by the height leaves room at the sides: use it to clear the "Legend and filters" button
    // at the top left (this moves the map to the right without making it smaller)
    const slack = fw - CTL - L.w * right;
    return { right: CTL, left: Math.max(0, Math.min(LEGEND_W, slack)) };
  }
  const W0 = VIEWS[startView] ? VIEWS[startView].layout.WORLD : CORE.WORLD;
  const pz = createPanZoom(viewport, stage, {
    width: W0.w, height: W0.h, pad: 6,
    insets: () => (narrow() ? { bottom: 48, top: touchHint.classList.contains('gone') ? 0 : 36 } : ctlInsets()),
    // on a phone the whole map would be too small to read: the first view shows the middle of the map at
    // a scale that fills the height of the frame, up to PHONE_SCALE
    startScale: () => (narrow() && active ? Math.min(active.layout.PHONE_SCALE, (viewport.clientHeight - 96) / active.layout.WORLD.h) : 0),
    startCenter: () => (active && active.layout.PHONE_CENTER) || null,
    onHint: showHint, onFirstTouch: () => touchHint.classList.add('gone'),
  });
  const expandBtn = btn('map-expand', 'Show the map full screen', '', () => setFull(!frame.classList.contains('is-full')));
  expandBtn.innerHTML = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 8V3h5M17 8V3h-5M3 12v5h5M17 12v5h-5"/></svg>';
  const fitBtn = btn('map-fit', 'Show the whole map', '', () => pz.fit(true));
  fitBtn.innerHTML = '<svg viewBox="0 0 20 20" aria-hidden="true"><rect x="4" y="5" width="12" height="10" rx="2"/><path d="M1.5 7.5v-5h5M18.5 7.5v-5h-5M1.5 12.5v5h5M18.5 12.5v5h-5" opacity=".55"/></svg>';
  zoomCtl.append(btn('map-in', 'Zoom in', '+', () => pz.zoomIn()), btn('map-out', 'Zoom out', '−', () => pz.zoomOut()), fitBtn, expandBtn);

  function setFull(on) {
    frame.classList.toggle('is-full', on);
    document.body.classList.toggle('map-full-open', on);
    expandBtn.setAttribute('aria-label', on ? 'Leave full screen' : 'Show the map full screen');
    expandBtn.title = expandBtn.getAttribute('aria-label');
    expandBtn.setAttribute('aria-pressed', String(on));
    requestAnimationFrame(() => pz.fit());
  }
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape' || document.querySelector('.modal-backdrop')) return;
    // Esc first closes the card that describes a tile, then leaves full screen
    if (card.classList.contains('show')) { hideCard(); return; }
    if (frame.classList.contains('is-full')) setFull(false);
  });
  viewport.addEventListener('dragstart', e => e.preventDefault());
  // a touch or click on the empty background clears any highlight left by a tap
  viewport.addEventListener('pointerdown', e => { if (!e.target.closest('.map-tile, .edge-label, .edge')) { hoverState = null; clearHl(); } });

  // ---------------------------------------------------------------- hover card for tiles
  let cardFor = null;   // {view, id} the card describes
  function cardHtml(d, n) {
    const um = d.commonUses && /^(Used (?:for|to))\s+/.exec(d.commonUses);
    const uses = !d.commonUses ? '' : um
      ? `<span class="mc-uses"><b>${um[1]}</b> ${richToHtml(d.commonUses.slice(um[0].length))}</span>`
      : `<span class="mc-uses"><b>Common uses:</b> ${richToHtml(d.commonUses)}</span>`;
    return `<span class="mc-name">${d.name}</span><span class="mc-k">${KIND_SHORT[d.kind]} · ${n} relationship${n === 1 ? '' : 's'} on this map</span>`
      + `<span class="mc-t">${richToHtml(firstSentence(d.blurb))}</span>${uses}`;
  }
  function showCard(view, id) {
    const d = getDist(id);
    cardFor = { view, id };
    card.innerHTML = cardHtml(d, view.relsOf.get(id).length);
    card.classList.add('show');
    for (const t of view.tiles.values()) t.el.removeAttribute('aria-describedby');
    view.tiles.get(id).el.setAttribute('aria-describedby', 'map-card');
    placeCard();
  }
  function hideCard() {
    if (!cardFor) return;
    const t = cardFor.view.tiles.get(cardFor.id);
    if (t) t.el.removeAttribute('aria-describedby');
    cardFor = null;
    card.classList.remove('show');
  }
  // near the tile, always inside the frame, where it hides the least of what matters while it is shown:
  // never the tile itself or the map's controls, as little as possible of the tile's neighbours and of the
  // labels of its arrows (they are highlighted), then of other tiles. Candidates sit on each side of the
  // tile, slid along that side and moved a little further out; a candidate further from the tile costs more.
  // the map's controls (zoom buttons, legend), grown by a few pixels, in frame coordinates
  const ctlRects = rel => [...frame.querySelectorAll(':scope > .map-ctl')].filter(e => e.offsetParent)
    .map(e => rel(e.getBoundingClientRect())).map(q => ({ l: q.l - 6, t: q.t - 6, r: q.r + 6, b: q.b + 6 }));
  function placeCard() {
    if (!cardFor) return;
    const { view, id } = cardFor;
    const f = frame.getBoundingClientRect();
    const rel = r => ({ l: r.left - f.left, t: r.top - f.top, r: r.right - f.left, b: r.bottom - f.top });
    const T = rel(view.tiles.get(id).el.getBoundingClientRect());
    const adj = view.adjacency.get(id);
    const nbs = [], others = [];
    for (const [tid, t] of view.tiles) if (tid !== id) (adj.has(tid) ? nbs : others).push(rel(t.el.getBoundingClientRect()));
    const labs = view.relsOf.get(id).filter(r => !view.labels.get(r.id).hidden).map(r => rel(view.labels.get(r.id).getBoundingClientRect()));
    const ctls = ctlRects(rel);
    const M = 8, G = 10;
    // the tile, grown a little: it lifts on hover, and the card must not touch it
    const Tg = { l: T.l - 5, t: T.t - 5, r: T.r + 5, b: T.b + 5 };
    card.style.maxWidth = Math.min(310, f.width - 2 * M) + 'px';
    const cw = card.offsetWidth, ch = card.offsetHeight;
    const clampX = x => Math.max(M, Math.min(f.width - M - cw, x)), clampY = y => Math.max(M, Math.min(f.height - M - ch, y));
    const cands = [];
    const slideY = [T.t, T.b - ch, (T.t + T.b - ch) / 2, T.t - ch / 3, T.b - ch * 2 / 3];
    const slideX = [T.l, T.r - cw, (T.l + T.r - cw) / 2, T.l - cw / 3, T.r - cw * 2 / 3];
    for (const g of [G, G + 30, G + 60, G + 100]) {
      for (const y of slideY) cands.push([T.r + g, y], [T.l - g - cw, y]);
      for (const x of slideX) cands.push([x, T.b + g], [x, T.t - g - ch]);
    }
    // and, for a tile surrounded by its neighbours, a coarse grid over the whole frame (further away costs more)
    for (let y = M; y <= f.height - M - ch; y += 32) for (let x = M; x <= f.width - M - cw; x += 32) cands.push([x, y]);
    let best = null;
    cands.forEach(([x0, y0], i) => {
      const x = clampX(x0), y = clampY(y0);
      const box = { l: x, t: y, r: x + cw, b: y + ch };
      const ov = q => Math.max(0, Math.min(box.r, q.r) - Math.max(box.l, q.l)) * Math.max(0, Math.min(box.b, q.b) - Math.max(box.t, q.t));
      const sum = (qs, wgt) => qs.reduce((a, q) => a + ov(q), 0) * wgt;
      // distance between the card and the tile (0 when they touch)
      const dx = Math.max(0, box.l - T.r, T.l - box.r), dy = Math.max(0, box.t - T.b, T.t - box.b);
      const cost = ov(Tg) * 1000 + sum(ctls, 1000) + sum(nbs, 3) + sum(labs, 1.5) + sum(others, 0.25) + Math.hypot(dx, dy) * 40 + i * 0.01;
      if (!best || cost < best.cost) best = { x, y, cost };
    });
    card.style.left = Math.round(best.x) + 'px';
    card.style.top = Math.round(best.y) + 'px';
  }
  pz.onChange(() => { if (cardFor) requestAnimationFrame(placeCard); });
  // the line that describes an arrow sits along the bottom (or the top) of the frame, where it hides the
  // least of the arrow's two tiles and its label, of the map's controls and of other tiles
  function placeInfo(view, r) {
    const f = frame.getBoundingClientRect();
    const rel = q => ({ l: q.left - f.left, t: q.top - f.top, r: q.right - f.left, b: q.bottom - f.top });
    const mine = [view.tiles.get(r.from).el, view.tiles.get(r.to).el, view.labels.get(r.id)].map(e => rel(e.getBoundingClientRect()));
    const others = [...view.tiles].filter(([tid]) => tid !== r.from && tid !== r.to).map(([, t]) => rel(t.el.getBoundingClientRect()));
    const ctls = ctlRects(rel);
    const M = 12, iw = info.offsetWidth, ih = info.offsetHeight;
    let best = null;
    // x positions: a grid, and the positions just clear of each tile and control
    const xs = [];
    for (let x = M; x < f.width - M - iw; x += 24) xs.push(x);
    for (const q of [...mine, ...others, ...ctls]) xs.push(q.r + 6, q.l - 6 - iw);
    xs.push(f.width - M - iw);
    for (const y of [f.height - M - ih, M]) for (const x of xs) {
      if (x < M || x > f.width - M - iw) continue;
      const box = { l: x, t: y, r: x + iw, b: y + ih };
      const ov = q => Math.max(0, Math.min(box.r, q.r) - Math.max(box.l, q.l)) * Math.max(0, Math.min(box.b, q.b) - Math.max(box.t, q.t));
      const sum = qs => qs.reduce((a, q) => a + ov(q), 0);
      const cost = sum(mine) * 4 + sum(ctls) * 1000 + sum(others) + (y === M ? 50 : 0) + x * 0.01;
      if (!best || cost < best.cost) best = { x, y, cost };
    }
    if (!best) return;
    info.style.left = Math.round(best.x) + 'px';
    info.style.top = Math.round(best.y) + 'px';
    info.style.bottom = 'auto';
  }
  // one card for both pointer and keyboard; touch taps open the page and never need it
  const canHover = () => window.matchMedia('(hover: hover)').matches;

  // ---------------------------------------------------------------- highlighting
  let hoverState = null;
  function clearHl() {
    for (const v of Object.values(views)) {
      v.world.classList.remove('hl-mode');
      v.world.querySelectorAll('.hl, .hl-main').forEach(e => e.classList.remove('hl', 'hl-main'));
    }
    info.classList.remove('show');
    hideCard();
  }

  // ---------------------------------------------------------------- one view
  function buildView(V) {
    const L = V.layout;
    const ids = new Set(V.dists.map(d => d.id));
    const adjacency = new Map(V.dists.map(d => [d.id, new Set()]));
    const relsOf = new Map(V.dists.map(d => [d.id, []]));
    for (const r of V.rels) {
      adjacency.get(r.from).add(r.to); adjacency.get(r.to).add(r.from);
      relsOf.get(r.from).push(r); relsOf.get(r.to).push(r);
    }
    const view = { name: V.name, label: V.label, layout: L, dists: V.dists, rels: V.rels, ids, adjacency, relsOf };
    const { WORLD } = L;
    const world = h('div', { class: `map-world v-${V.name}`, 'data-view': V.name, style: `width:${WORLD.w}px;height:${WORLD.h}px` });
    view.world = world;
    stage.append(world);
    const rectOf = id => tileRectIn(L, id);

    // regions (family backgrounds)
    const bg = svgEl('svg', { class: 'map-bg', width: WORLD.w, height: WORLD.h, viewBox: `0 0 ${WORLD.w} ${WORLD.h}`, 'aria-hidden': 'true' });
    const byGroup = new Map();
    for (const d of V.dists) { if (!byGroup.has(d.group)) byGroup.set(d.group, []); byGroup.get(d.group).push(d.id); }
    for (const [g, gids] of byGroup) {
      const gEl = svgEl('g', { class: 'region', 'data-group': g, style: `--rg:${GROUP_STYLE[g] || 'var(--steel)'}` });
      const P = 14;
      const rects = gids.map(rectOf);
      for (const r of rects) gEl.append(svgEl('rect', { x: r.x - P, y: r.y - P, width: r.w + 2 * P, height: r.h + 2 * P, rx: 22 }));
      // bridge neighbouring tiles of the same family so that a cluster reads as one region
      for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) {
        const a = rects[i], b = rects[j];
        const ax = a.x + a.w / 2, ay = a.y + a.h / 2, bx = b.x + b.w / 2, by = b.y + b.h / 2;
        const gapX = Math.max(0, Math.abs(ax - bx) - (a.w + b.w) / 2), gapY = Math.max(0, Math.abs(ay - by) - (a.h + b.h) / 2);
        if (gapX > 50 || gapY > 50) continue;
        if (Math.abs(ay - by) < 30) gEl.append(svgEl('rect', { x: Math.min(a.x, b.x), y: Math.max(a.y, b.y) - P + 6, width: Math.max(a.x + a.w, b.x + b.w) - Math.min(a.x, b.x), height: Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y) + 2 * P - 12 }));
        else if (Math.abs(ax - bx) < 40) gEl.append(svgEl('rect', { x: Math.max(a.x, b.x) - P + 6, y: Math.min(a.y, b.y), width: Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) + 2 * P - 12, height: Math.max(a.y + a.h, b.y + b.h) - Math.min(a.y, b.y) }));
      }
      bg.append(gEl);
    }
    for (const RL of L.REGION_LABELS || []) {
      const t = svgEl('text', { x: RL.x, y: RL.y, class: 'region-label', 'text-anchor': RL.anchor || 'start', style: `--rg:${GROUP_STYLE[RL.group] || 'var(--steel)'}` });
      t.textContent = RL.text || groupLabel(RL.group);
      bg.append(t);
    }
    world.append(bg);
    view.bg = bg;

    // edges
    const edgesSvg = svgEl('svg', { class: 'map-edges', width: WORLD.w, height: WORLD.h, viewBox: `0 0 ${WORLD.w} ${WORLD.h}` });
    world.append(edgesSvg);
    const geo = new Map(), edgeEls = new Map();
    for (const rel of V.rels) {
      const G = edgeGeometryIn(L, rel);
      geo.set(rel.id, G);
      const g = svgEl('g', { class: `edge k-${rel.kind}${rel.onOriginalMap ? ' orig' : ''}${rel.bidirectional ? ' two-way' : ''}`, 'data-id': rel.id });
      const hit = svgEl('path', { class: 'e-hit', d: G.d });
      const line = svgEl('path', { class: 'e-line', d: G.d });
      g.append(hit, line);
      for (const hd of G.heads) g.append(svgEl('path', { class: 'e-head', d: hd }));
      // pointer access: the arrow itself opens the dialog (keyboard users reach the same dialog via its label)
      hit.addEventListener('click', () => openRel(rel));
      g.addEventListener('mouseenter', () => hoverEdge(rel, true));
      g.addEventListener('mouseleave', () => hoverEdge(rel, false));
      edgesSvg.append(g);
      edgeEls.set(rel.id, g);
    }
    Object.assign(view, { geo, edges: edgeEls });

    // tiles
    const tilesLayer = h('div', { class: 'map-tiles' });
    world.append(tilesLayer);
    const tileEls = new Map();
    // reading order (and tab order): rows of tiles from top to bottom, left to right within a row (tolerance 40 px)
    const ordered = V.dists.slice().sort((a, b) => {
      const A = L.NODES[a.id], B = L.NODES[b.id];
      return Math.abs(A.y - B.y) > 40 ? A.y - B.y : A.x - B.x;
    });
    for (const d of ordered) {
      const r = rectOf(d.id);
      const n = relsOf.get(d.id).length;
      const glyph = h('span', { class: 'mt-glyph', 'aria-hidden': 'true' });
      const kindCls = d.kind.startsWith('multivariate') ? 'mv' : d.kind;
      const a = h('a', {
        class: `map-tile t-${kindCls}${d.onOriginalMap ? ' orig' : ''}${L.NODES[d.id].big ? ' big' : ''}`,
        href: `distribution.html?d=${encodeURIComponent(d.id)}`,
        draggable: 'false',
        'data-id': d.id,
        style: `left:${r.x}px;top:${r.y}px;width:${r.w}px;height:${r.h}px;--rg:${GROUP_STYLE[d.group] || 'var(--steel)'}`,
        'aria-label': `${d.name}: ${KIND_SHORT[d.kind]} distribution, ${n} relationship${n === 1 ? '' : 's'} on the map. Opens its page.`,
      }, h('span', { class: 'mt-name' }, L.NODES[d.id].label || shortName(d)), glyph);
      a.addEventListener('pointerenter', e => { if (e.pointerType !== 'touch') hoverTile(view, d.id, true, canHover()); });
      a.addEventListener('pointerleave', e => { if (e.pointerType !== 'touch') hoverTile(view, d.id, false); });
      a.addEventListener('focus', () => {
        // the card on keyboard focus only (a tap also focuses the link, and then opens the page)
        hoverTile(view, d.id, true, a.matches(':focus-visible'));
        pz.ensureVisible(r);
      });
      a.addEventListener('blur', () => hoverTile(view, d.id, false));
      tilesLayer.append(a);
      tileEls.set(d.id, { el: a, glyph, rect: r });
    }
    view.tiles = tileEls;

    // labels
    const labelsLayer = h('div', { class: 'map-labels' });
    world.append(labelsLayer);
    const labelEls = new Map(), labelPos = new Map();
    const relOrder = V.rels.slice().sort((a, b) => {
      const pa = pointAt(geo.get(a.id).smp, 0.5).p, pb = pointAt(geo.get(b.id).smp, 0.5).p;
      return Math.abs(pa[1] - pb[1]) > 40 ? pa[1] - pb[1] : pa[0] - pb[0];
    });
    for (const rel of relOrder) {
      const b = h('button', {
        type: 'button', class: `edge-label k-${rel.kind}${rel.onOriginalMap ? ' orig' : ''}`, 'data-id': rel.id,
        'aria-label': `${relTitle(rel).replace('↔', 'and').replace('→', 'to')}. ${KIND_LABELS[rel.kind]}. Opens an explanation.`,
      });
      // a label with two parts ("N \\to \\infty;\\ ...") is set on two lines to keep it narrow
      const parts = splitTexLines(rel.label);
      for (const part of parts) {
        const inner = h('span', { class: 'el-tex' });
        renderTex(inner, part);
        b.append(inner);
      }
      if (parts.length > 1) b.classList.add('two-line');
      b.addEventListener('click', () => openRel(rel));
      b.addEventListener('mouseenter', () => hoverEdge(rel, true));
      b.addEventListener('mouseleave', () => hoverEdge(rel, false));
      b.addEventListener('focus', () => { hoverEdge(rel, true); const lp = labelPos.get(rel.id); if (lp) pz.ensureVisible({ x: lp[0] - 60, y: lp[1] - 30, w: 120, h: 60 }); });
      b.addEventListener('blur', () => hoverEdge(rel, false));
      labelsLayer.append(b);
      labelEls.set(rel.id, b);
    }
    Object.assign(view, { labels: labelEls, labelPos });

    view.layoutLabels = () => {
      const items = V.rels.map(rel => {
        const el = labelEls.get(rel.id);
        return { rel, el, smp: geo.get(rel.id).smp, size: { w: el.offsetWidth, h: el.offsetHeight }, priority: (L.ROUTES[rel.id] || {}).priority || geo.get(rel.id).smp.length / 1000 };
      });
      const visible = items.filter(it => !it.el.hidden);
      const tileRects = V.dists.map(d => rectOf(d.id));
      const edgeSamples = new Map(V.rels.filter(r => !labelEls.get(r.id).hidden).map(r => [r.id, geo.get(r.id).smp]));
      placeLabels(visible, tileRects, edgeSamples, L.ROUTES);
      for (const it of visible) {
        it.el.style.left = it.pos[0].toFixed(1) + 'px';
        it.el.style.top = it.pos[1].toFixed(1) + 'px';
        labelPos.set(it.rel.id, it.pos);
      }
    };

    view.applyFilter = () => {
      for (const rel of V.rels) {
        const on = filter.kinds.has(rel.kind);
        edgeEls.get(rel.id).classList.toggle('off', !on);
        labelEls.get(rel.id).hidden = !on;
      }
      view.layoutLabels();
    };

    // tile names: shrink the font of a long name until it fits on one line
    view.fitNames = () => {
      for (const { el } of tileEls.values()) {
        const nm = el.querySelector('.mt-name');
        nm.style.fontSize = '';
        let fs = parseFloat(getComputedStyle(nm).fontSize);
        while (nm.scrollWidth > nm.clientWidth + 0.5 && fs > 11.5) { fs -= 0.5; nm.style.fontSize = fs + 'px'; }
      }
    };

    // glyphs (computed once per tile)
    const drawGlyph = (id, mod) => {
      const t = tileEls.get(id);
      const isBig = L.NODES[id].big;
      const W = Math.round(L.GLYPH.w * (isBig ? 1.18 : 1)), H = Math.round(L.GLYPH.h * (isBig ? 1.12 : 1));
      let inner = '';
      try { inner = glyphMarkup(id, mod, W, H); } catch (err) { console.warn('glyph', id, err); }
      t.glyph.innerHTML = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" focusable="false">${inner}</svg>`;
      t.glyph.classList.add('ready');
    };
    view.glyphJobs = V.dists.map(d => {
      if (!hasDist(d.id)) { drawGlyph(d.id, null); return Promise.resolve(); }
      return loadDist(d.id).then(mod => drawGlyph(d.id, mod)).catch(err => { console.warn('Could not load module for the map sketch', d.id, err); drawGlyph(d.id, null); });
    });

    /**
     * Layout self-check (used by the browser checks): overlaps between labels, tiles and other labels,
     * in world units, for the arrows currently shown.
     */
    view.checkLayout = () => {
      const boxes = [];
      for (const [id, el] of labelEls) {
        if (el.hidden) continue;
        const p = labelPos.get(id);
        boxes.push({ id, x: p[0] - el.offsetWidth / 2, y: p[1] - el.offsetHeight / 2, w: el.offsetWidth, h: el.offsetHeight });
      }
      const tiles = V.dists.map(d => ({ id: d.id, ...rectOf(d.id) }));
      const res = { labelTile: [], labelLabel: [], tileTile: [], labelEdge: [], edgeTile: [] };
      for (const b of boxes) for (const t of tiles) if (overlap(b, t, 1)) res.labelTile.push([b.id, t.id]);
      // other arrows that pass under a label (shown arrows only)
      for (const b of boxes) for (const [eid, G] of geo) {
        if (eid === b.id || labelEls.get(eid).hidden) continue;
        let inside = 0;
        for (let k = 1; k < G.smp.pts.length; k++) inside += clipLen(G.smp.pts[k - 1], G.smp.pts[k], b);
        if (inside > 1) res.labelEdge.push([b.id, eid]);
      }
      // arrows that pass through a tile other than their own two
      for (const [eid, G] of geo) {
        if (labelEls.get(eid).hidden) continue;
        const rel = V.rels.find(r => r.id === eid);
        for (const t of tiles) {
          if (t.id === rel.from || t.id === rel.to) continue;
          let inside = 0;
          for (let k = 1; k < G.smp.pts.length; k++) inside += clipLen(G.smp.pts[k - 1], G.smp.pts[k], t);
          if (inside > 1) res.edgeTile.push([eid, t.id]);
        }
      }
      for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) if (overlap(boxes[i], boxes[j], 1)) res.labelLabel.push([boxes[i].id, boxes[j].id]);
      for (let i = 0; i < tiles.length; i++) for (let j = i + 1; j < tiles.length; j++) if (overlap(tiles[i], tiles[j], 12)) res.tileTile.push([tiles[i].id, tiles[j].id]);
      return res;
    };

    // highlighting
    function hoverTile(v, id, on, withCard = false) {
      if (!on) { if (hoverState === v.name + ':' + id) { hoverState = null; clearHl(); } return; }
      clearHl();
      hoverState = v.name + ':' + id;
      world.classList.add('hl-mode');
      tileEls.get(id).el.classList.add('hl', 'hl-main');
      for (const nb of adjacency.get(id)) tileEls.get(nb).el.classList.add('hl');
      for (const r of relsOf.get(id)) { edgeEls.get(r.id).classList.add('hl'); labelEls.get(r.id).classList.add('hl'); }
      if (withCard) showCard(v, id);
    }
    function hoverEdge(rel, on) {
      if (!on) { if (hoverState === V.name + ':' + rel.id) { hoverState = null; clearHl(); } return; }
      clearHl();
      hoverState = V.name + ':' + rel.id;
      world.classList.add('hl-mode');
      edgeEls.get(rel.id).classList.add('hl', 'hl-main');
      labelEls.get(rel.id).classList.add('hl', 'hl-main');
      tileEls.get(rel.from).el.classList.add('hl');
      tileEls.get(rel.to).el.classList.add('hl');
      info.innerHTML = `<b>${relTitle(rel)}</b> <span class="mi-k">${KIND_LABELS[rel.kind]}</span><span class="mi-t">${richToHtml(firstSentence(rel.plain))}</span>`;
      placeInfo(view, rel);
      info.classList.add('show');
    }
    view.hoverGroup = (g, on) => {
      if (!on) { if (hoverState === 'group:' + g) { hoverState = null; clearHl(); } return; }
      clearHl();
      hoverState = 'group:' + g;
      world.classList.add('hl-mode');
      const gids = new Set(V.dists.filter(d => d.group === g).map(d => d.id));
      for (const id of gids) tileEls.get(id).el.classList.add('hl');
      for (const r of V.rels) if (gids.has(r.from) && gids.has(r.to)) { edgeEls.get(r.id).classList.add('hl'); labelEls.get(r.id).classList.add('hl'); }
      bg.querySelectorAll('.region').forEach(e => e.classList.toggle('hl', e.dataset.group === g));
    };
    view.hoverTile = (id, on, withCard = true) => hoverTile(view, id, on, withCard);
    return view;
  }

  function openRel(rel) {
    hoverState = null; clearHl();
    openRelationDialog(rel).catch(err => console.error(err));
  }

  // ---------------------------------------------------------------- filters (shared by both views)
  const filter = { kinds: new Set(KIND_ORDER) };
  function applyFilter() {
    for (const v of Object.values(views)) v.applyFilter();
    frame.classList.toggle('filtered', filter.kinds.size < KIND_ORDER.length);
  }

  // ---------------------------------------------------------------- build both views
  const views = {};
  for (const V of Object.values(VIEWS)) views[V.name] = buildView(V);

  // ---------------------------------------------------------------- switching views
  const viewListeners = new Set();
  let fadeT = 0;
  function show(v, on) {
    v.world.classList.toggle('is-active', on);
    v.world.toggleAttribute('inert', !on);
    v.world.setAttribute('aria-hidden', String(!on));
  }
  /** Show a view ('core' or 'full'): cross-fade, then fit the new view to the frame. */
  function setView(name, { animate = true } = {}) {
    const next = views[name] || views.core;
    if (next === active) return;
    const prev = active;
    hoverState = null; clearHl();
    // keyboard focus inside the old view would be lost: keep it on the map
    if (prev && prev.world.contains(document.activeElement)) viewport.focus({ preventScroll: true });
    active = next;
    frame.dataset.view = next.name;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    clearTimeout(fadeT);
    for (const v of Object.values(views)) v.world.classList.remove('fading-out', 'fading-in');
    const swap = () => {
      for (const v of Object.values(views)) show(v, v === next);
      pz.setSize(next.layout.WORLD.w, next.layout.WORLD.h);
      if (animate && !reduce) {
        next.world.classList.add('fading-in');
        requestAnimationFrame(() => requestAnimationFrame(() => next.world.classList.remove('fading-in')));
      }
    };
    if (prev && animate && !reduce) {
      prev.world.classList.add('fading-out');
      fadeT = setTimeout(() => { prev.world.classList.remove('fading-out'); swap(); }, 150);
    } else swap();
    for (const fn of viewListeners) fn(next.name);
  }
  setView(startView, { animate: false });

  // labels need their rendered size (KaTeX fonts change it): lay out now and again once fonts are in
  const relayout = () => { for (const v of Object.values(views)) { v.fitNames(); v.layoutLabels(); } };
  relayout();
  const fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready.then(relayout) : Promise.resolve();
  if (document.fonts && document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', relayout);
  const allGlyphs = Object.values(views).flatMap(v => v.glyphJobs);
  Promise.all([...allGlyphs, fontsReady]).then(() => { frame.classList.add('ready'); onReady && onReady(); });

  const api = {
    frame, viewport, stage, pz, filter, applyFilter, openRel, setFull, views, setView, card,
    /** The view shown ('core' or 'full'). */
    get view() { return active.name; },
    onViewChange(fn) { viewListeners.add(fn); return () => viewListeners.delete(fn); },
    // the parts of the view shown (used by the legend and the tests)
    get world() { return active.world; },
    get tiles() { return active.tiles; },
    get labels() { return active.labels; },
    get edges() { return active.edges; },
    get geo() { return active.geo; },
    get labelPos() { return active.labelPos; },
    checkLayout: (name) => (name ? views[name] : active).checkLayout(),
    layoutLabels: () => active.layoutLabels(),
    hoverGroup: (g, on) => active.hoverGroup(g, on),
    hoverTile: (id, on) => active.hoverTile(id, on),
  };
  return api;
}
