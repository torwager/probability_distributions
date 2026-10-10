// Geometry for the map: edge paths as chains of cubic Bézier segments, clipped at the tile borders,
// with arrowheads and label positions. Pure functions, no DOM (usable from Node for layout checks).

/** Point on a cubic segment [p0, c1, c2, p3] at t. */
export function bez(s, t) {
  const u = 1 - t;
  const a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
  return [a * s[0][0] + b * s[1][0] + c * s[2][0] + d * s[3][0], a * s[0][1] + b * s[1][1] + c * s[2][1] + d * s[3][1]];
}

/** Derivative of a cubic segment at t. */
export function bezD(s, t) {
  const u = 1 - t;
  const a = 3 * u * u, b = 6 * u * t, c = 3 * t * t;
  return [a * (s[1][0] - s[0][0]) + b * (s[2][0] - s[1][0]) + c * (s[3][0] - s[2][0]),
    a * (s[1][1] - s[0][1]) + b * (s[2][1] - s[1][1]) + c * (s[3][1] - s[2][1])];
}

const lerp = (p, q, t) => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];

/** Split a cubic segment at t (de Casteljau). Returns [left, right]. */
export function split(s, t) {
  const [p0, p1, p2, p3] = s;
  const a = lerp(p0, p1, t), b = lerp(p1, p2, t), c = lerp(p2, p3, t);
  const d = lerp(a, b, t), e = lerp(b, c, t), f = lerp(d, e, t);
  return [[p0, a, d, f], [f, e, c, p3]];
}

/** Is the point inside the rectangle {x, y, w, h} (x, y = top-left) grown by `pad`? */
export function inRect(p, r, pad = 0) {
  return p[0] > r.x - pad && p[0] < r.x + r.w + pad && p[1] > r.y - pad && p[1] < r.y + r.h + pad;
}

/**
 * Build the segments of an edge from the center of tile A to the center of tile B.
 * route: { bend } (px, perpendicular offset of a single control point; positive bends to the left of
 * the direction of travel) or { via: [[x, y], ...] } (the path passes through these points as a smooth
 * Catmull-Rom curve).
 */
export function rawSegments(a, b, route = {}) {
  const pts = [a, ...(route.via || []), b];
  if (route.r && pts.length > 2) return roundedPolyline(pts, route.r);
  if (pts.length === 2) {
    const bend = route.bend || 0;
    const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
    // quadratic control point, raised to cubic
    const m = [(a[0] + b[0]) / 2 + (dy / L) * bend * 2, (a[1] + b[1]) / 2 - (dx / L) * bend * 2];
    // a quadratic bulges half as far as its control point, hence the factor 2 above
    return [[a, lerp(a, m, 2 / 3), lerp(b, m, 2 / 3), b]];
  }
  const segs = [];
  const tension = route.tension ?? 1;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6 * tension, p1[1] + (p2[1] - p0[1]) / 6 * tension];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6 * tension, p2[1] - (p3[1] - p1[1]) / 6 * tension];
    segs.push([p1, c1, c2, p2]);
  }
  return segs;
}

/**
 * Straight segments through the points, with each corner rounded with radius about r (used for the
 * long arrows that run in a channel or along the edge of the map).
 */
function roundedPolyline(pts, r) {
  const segs = [];
  const line = (p, q) => segs.push([p, lerp(p, q, 1 / 3), lerp(p, q, 2 / 3), q]);
  const unit = (p, q) => { const L = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1; return [(q[0] - p[0]) / L, (q[1] - p[1]) / L, L]; };
  let cur = pts[0];
  for (let i = 1; i < pts.length - 1; i++) {
    const [ix, iy, Li] = unit(pts[i - 1], pts[i]);
    const [ox, oy, Lo] = unit(pts[i], pts[i + 1]);
    const ri = Math.min(r, Li / 2, Lo / 2);
    const A = [pts[i][0] - ix * ri, pts[i][1] - iy * ri], B = [pts[i][0] + ox * ri, pts[i][1] + oy * ri];
    if (Math.hypot(A[0] - cur[0], A[1] - cur[1]) > 0.5) line(cur, A);
    // a cubic close to a circular arc (handles of 0.55 r along the two directions)
    segs.push([A, [A[0] + ix * ri * 0.55, A[1] + iy * ri * 0.55], [B[0] - ox * ri * 0.55, B[1] - oy * ri * 0.55], B]);
    cur = B;
  }
  line(cur, pts[pts.length - 1]);
  return segs;
}

/** Find the parameter where a segment leaves (fromInside = true) or enters a rectangle. */
function crossT(s, r, pad, leaving) {
  const inside = t => inRect(bez(s, t), r, pad);
  if (leaving && !inside(1e-9)) return 0;
  if (!leaving && !inside(1 - 1e-9)) return 1;
  let lo = 0, hi = 1;
  // leaving: inside at lo, outside at hi; entering: outside at lo, inside at hi
  if (leaving ? inside(1) : inside(0)) return null;
  for (let k = 0; k < 40; k++) {
    const m = (lo + hi) / 2;
    if (inside(m) === leaving) lo = m; else hi = m;
  }
  return leaving ? hi : lo;
}

/** Clip a segment chain so it starts at the border of rect A and ends at the border of rect B. */
export function clipSegments(segs, rA, rB, gap = 5) {
  let out = segs.slice();
  // start
  while (out.length) {
    const t = crossT(out[0], rA, gap, true);
    if (t === null) { out.shift(); continue; }
    if (t > 0) out[0] = split(out[0], t)[1];
    break;
  }
  while (out.length) {
    const last = out.length - 1;
    const t = crossT(out[last], rB, gap, false);
    if (t === null) { out.pop(); continue; }
    if (t < 1) out[last] = split(out[last], t)[0];
    break;
  }
  return out;
}

/** Polyline approximation of a segment chain with cumulative lengths. */
export function sample(segs, perSeg = 24) {
  const pts = [], cum = [];
  let L = 0;
  segs.forEach((s, i) => {
    for (let k = i ? 1 : 0; k <= perSeg; k++) {
      const p = bez(s, k / perSeg);
      if (pts.length) L += Math.hypot(p[0] - pts[pts.length - 1][0], p[1] - pts[pts.length - 1][1]);
      pts.push(p); cum.push(L);
    }
  });
  return { pts, cum, length: L };
}

/** Point and unit tangent at fraction f (0..1) of the arc length of a sampled path. */
export function pointAt(smp, f) {
  const target = Math.max(0, Math.min(1, f)) * smp.length;
  const { pts, cum } = smp;
  let i = 1;
  while (i < cum.length - 1 && cum[i] < target) i++;
  const seg = cum[i] - cum[i - 1] || 1;
  const t = (target - cum[i - 1]) / seg;
  const p = lerp(pts[i - 1], pts[i], Math.max(0, Math.min(1, t)));
  const dx = pts[i][0] - pts[i - 1][0], dy = pts[i][1] - pts[i - 1][1], L = Math.hypot(dx, dy) || 1;
  return { p, d: [dx / L, dy / L] };
}

/** Shorten the end (atEnd = true) or the start of a chain by about `len` px; returns the new chain. */
export function trim(segs, len, atEnd) {
  if (!segs.length || len <= 0) return segs;
  const out = segs.slice();
  const idx = atEnd ? out.length - 1 : 0;
  const s = out[idx];
  const tip = atEnd ? s[3] : s[0];
  // find t on this segment at distance len from the tip
  let lo = 0, hi = 1;
  for (let k = 0; k < 40; k++) {
    const m = (lo + hi) / 2;
    const p = bez(s, m);
    const dist = Math.hypot(p[0] - tip[0], p[1] - tip[1]);
    if (atEnd) { if (dist > len) lo = m; else hi = m; } else { if (dist > len) hi = m; else lo = m; }
  }
  const t = (lo + hi) / 2;
  out[idx] = atEnd ? split(s, t)[0] : split(s, t)[1];
  return out;
}

const f1 = v => Math.round(v * 10) / 10;

/** SVG path data for a chain. */
export function pathD(segs) {
  if (!segs.length) return '';
  let d = `M${f1(segs[0][0][0])},${f1(segs[0][0][1])}`;
  for (const s of segs) d += `C${f1(s[1][0])},${f1(s[1][1])} ${f1(s[2][0])},${f1(s[2][1])} ${f1(s[3][0])},${f1(s[3][1])}`;
  return d;
}

/** Arrowhead polygon with its tip at `tip`, pointing along unit vector `dir`. */
export function arrowHead(tip, dir, len = 9, half = 4.6) {
  const [x, y] = tip, [dx, dy] = dir;
  const bx = x - dx * len, by = y - dy * len;
  const nx = -dy, ny = dx;
  // slightly concave back for a lighter look
  const cx = x - dx * len * 0.72, cy = y - dy * len * 0.72;
  return `M${f1(x)},${f1(y)}L${f1(bx + nx * half)},${f1(by + ny * half)}L${f1(cx)},${f1(cy)}L${f1(bx - nx * half)},${f1(by - ny * half)}Z`;
}

/** Axis-aligned overlap area of two boxes {x, y, w, h}. */
export function overlap(a, b, pad = 0) {
  const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) + pad;
  const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y) + pad;
  return w > 0 && h > 0 ? w * h : 0;
}
