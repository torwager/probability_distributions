// Small density sketches ("glyphs") for the map tiles.
//
// A glyph is computed once per tile. When a distribution module exists (listed in the manifest), the
// glyph uses the module's pdf and plotting window at its default parameters, so the tile matches the
// distribution page. Otherwise it falls back to the densities below, which are written out here at the
// catalog's default parameters (they are exact densities, only simplified to what a sketch needs).
// Multivariate distributions always get a picture of their own: a triangle of dots (multinomial),
// a shaded triangle (Dirichlet) and probability ellipses (multivariate normal).

import { lgamma, logBinom, besselI0e, logNormalCdf, PI, LN_SQRT_2PI } from '../core/math.js';
import { DISTRIBUTIONS } from '../catalog.js';

const defaults = id => {
  const d = DISTRIBUTIONS.find(x => x.id === id);
  const p = {};
  for (const prm of d ? d.params : []) p[prm.key] = prm.default;
  return p;
};

const lnorm = (x, m, s) => Math.exp(-0.5 * ((x - m) / s) ** 2 - LN_SQRT_2PI) / s;

// Fallback densities: [kind, window, pdf(x, p)]. Discrete windows are integer ranges.
const FALLBACK = {
  'discrete-uniform': ['d', p => [p.a - 1, p.b + 1], (k, p) => (k >= p.a && k <= p.b ? 1 / (p.b - p.a + 1) : 0)],
  bernoulli: ['d', () => [0, 1], (k, p) => (k === 0 ? 1 - p.p : k === 1 ? p.p : 0)],
  categorical: ['bars', p => [1, p.K], (k, p) => 1 / p.K],
  binomial: ['d', p => [0, p.n], (k, p) => Math.exp(logBinom(p.n, k) + k * Math.log(p.p) + (p.n - k) * Math.log1p(-p.p))],
  hypergeometric: ['d', p => [0, p.n], (k, p) => (k > p.K || p.n - k > p.N - p.K ? 0 : Math.exp(logBinom(p.K, k) + logBinom(p.N - p.K, p.n - k) - logBinom(p.N, p.n)))],
  geometric: ['d', () => [0, 14], (k, p) => p.p * Math.pow(1 - p.p, k)],
  'negative-binomial': ['d', () => [0, 15], (k, p) => Math.exp(lgamma(k + p.r) - lgamma(k + 1) - lgamma(p.r) + p.r * Math.log(p.p) + k * Math.log1p(-p.p))],
  poisson: ['d', () => [0, 12], (k, p) => Math.exp(k * Math.log(p.lambda) - p.lambda - lgamma(k + 1))],
  'beta-binomial': ['d', p => [0, p.n], (k, p) => Math.exp(logBinom(p.n, k) + lbeta(k + p.alpha, p.n - k + p.beta) - lbeta(p.alpha, p.beta))],
  uniform: ['c', p => [p.a - 0.3 * (p.b - p.a), p.b + 0.3 * (p.b - p.a)], (x, p) => (x >= p.a && x <= p.b ? 1 / (p.b - p.a) : 0)],
  exponential: ['c', p => [0, 5 / p.lambda], (x, p) => (x < 0 ? 0 : p.lambda * Math.exp(-p.lambda * x))],
  gamma: ['c', p => [0, (p.alpha + 5 * Math.sqrt(p.alpha)) / p.beta], (x, p) => (x <= 0 ? 0 : Math.exp(p.alpha * Math.log(p.beta) + (p.alpha - 1) * Math.log(x) - p.beta * x - lgamma(p.alpha)))],
  weibull: ['c', p => [0, 2.6 * p.lambda], (x, p) => (x < 0 ? 0 : (p.k / p.lambda) * Math.pow(x / p.lambda, p.k - 1) * Math.exp(-Math.pow(x / p.lambda, p.k)))],
  normal: ['c', p => [p.mu - 4 * p.sigma, p.mu + 4 * p.sigma], (x, p) => lnorm(x, p.mu, p.sigma)],
  'log-normal': ['c', p => [0, Math.exp(p.mu + 3.2 * p.sigma)], (x, p) => (x <= 0 ? 0 : lnorm(Math.log(x), p.mu, p.sigma) / x)],
  'student-t': ['c', () => [-5, 5], (x, p) => Math.exp(lgamma((p.nu + 1) / 2) - lgamma(p.nu / 2) - 0.5 * Math.log(p.nu * PI) - (p.nu + 1) / 2 * Math.log1p(x * x / p.nu))],
  'chi-squared': ['c', p => [0, p.k + 5 * Math.sqrt(2 * p.k)], (x, p) => (x <= 0 ? 0 : Math.exp((p.k / 2 - 1) * Math.log(x) - x / 2 - (p.k / 2) * Math.LN2 - lgamma(p.k / 2)))],
  beta: ['c', () => [0, 1], (x, p) => (x <= 0 || x >= 1 ? 0 : Math.exp((p.alpha - 1) * Math.log(x) + (p.beta - 1) * Math.log1p(-x) - lbeta(p.alpha, p.beta)))],
  f: ['c', () => [0, 4.5], (x, p) => {
    if (x <= 0) return 0;
    const { d1, d2 } = p;
    return Math.exp(0.5 * (d1 * Math.log(d1 * x) + d2 * Math.log(d2) - (d1 + d2) * Math.log(d1 * x + d2)) - Math.log(x) - lbeta(d1 / 2, d2 / 2));
  }],
  cauchy: ['c', p => [p.x0 - 8 * p.gamma, p.x0 + 8 * p.gamma], (x, p) => 1 / (PI * p.gamma * (1 + ((x - p.x0) / p.gamma) ** 2))],
  'half-cauchy': ['c', p => [0, 8 * p.gamma], (x, p) => (x < 0 ? 0 : 2 / (PI * p.gamma * (1 + (x / p.gamma) ** 2)))],
  laplace: ['c', p => [p.mu - 5 * p.b, p.mu + 5 * p.b], (x, p) => Math.exp(-Math.abs(x - p.mu) / p.b) / (2 * p.b)],
  logistic: ['c', p => [p.mu - 7 * p.s, p.mu + 7 * p.s], (x, p) => { const z = Math.exp(-Math.abs(x - p.mu) / p.s); return z / (p.s * (1 + z) ** 2); }],
  'inverse-gamma': ['c', p => [0, 4 * p.beta / (p.alpha - 1)], (x, p) => (x <= 0 ? 0 : Math.exp(p.alpha * Math.log(p.beta) - lgamma(p.alpha) - (p.alpha + 1) * Math.log(x) - p.beta / x))],
  'von-mises': ['c', () => [-PI, PI], (x, p) => Math.exp(p.kappa * (Math.cos(x - p.mu) - 1)) / (2 * PI * besselI0e(p.kappa))],
  'ex-gaussian': ['c', p => [p.mu - 4 * p.sigma, p.mu + 5 * p.tau + 2 * p.sigma], (x, p) => {
    const { mu, sigma, tau } = p;
    const z = (x - mu) / sigma - sigma / tau;
    return Math.exp(-Math.log(tau) + sigma * sigma / (2 * tau * tau) - (x - mu) / tau + logNormalCdf(z));
  }],
  wald: ['c', p => [0, p.mu * 3.5], (x, p) => (x <= 0 ? 0 : Math.sqrt(p.lambda / (2 * PI * x ** 3)) * Math.exp(-p.lambda * (x - p.mu) ** 2 / (2 * p.mu * p.mu * x)))],
  pareto: ['c', p => [0, p.xm * 5], (x, p) => (x < p.xm ? 0 : p.alpha * Math.pow(p.xm, p.alpha) / Math.pow(x, p.alpha + 1))],
  gumbel: ['c', p => [p.mu - 3 * p.beta, p.mu + 7 * p.beta], (x, p) => { const z = (x - p.mu) / p.beta; return Math.exp(-z - Math.exp(-z)) / p.beta; }],
};
function lbeta(a, b) { return lgamma(a) + lgamma(b) - lgamma(a + b); }

const f1 = v => (Math.round(v * 10) / 10).toString();

/**
 * Glyph geometry for a tile of size W x H (SVG user units).
 * Returns an SVG inner-markup string (paths only; colors come from CSS classes).
 */
function curveSvg(pts, W, H, pad) {
  const ys = pts.map(q => q[1]).filter(Number.isFinite);
  // ignore isolated spikes at the window edges (densities that are infinite at a boundary)
  const inner = ys.slice(2, -2);
  const ymax = Math.max(...(inner.length ? inner : ys)) || 1;
  const lo = pts[0][0], hi = pts[pts.length - 1][0];
  const sx = x => pad + (x - lo) / (hi - lo || 1) * (W - 2 * pad);
  const sy = y => H - 1 - Math.min(1, (Number.isFinite(y) ? Math.max(0, y) : ymax) / ymax) * (H - 6);
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${f1(sx(x))},${f1(sy(y))}`).join('');
  return `<path class="g-fill" d="${line}L${f1(sx(hi))},${H - 1}L${f1(sx(lo))},${H - 1}Z"/><path class="g-line" d="${line}"/>`;
}

function stemsSvg(pts, W, H, pad, bars = false) {
  const ymax = Math.max(...pts.map(q => q[1]).filter(Number.isFinite)) || 1;
  const n = pts.length;
  const lo = pts[0][0], hi = pts[n - 1][0];
  const span = hi - lo || 1;
  const step = (W - 2 * pad) / (span + 1);
  const sx = x => pad + (x - lo + 0.5) * step;
  const bw = bars ? Math.max(3, step * 0.46) : Math.max(1.6, Math.min(4.2, step * 0.42));
  let d = '';
  for (const [x, y] of pts) {
    const hgt = Math.max(0, Math.min(1, y / ymax)) * (H - 5);
    if (hgt < 0.4) { d += `<rect class="g-zero" x="${f1(sx(x) - bw / 2)}" y="${H - 1.6}" width="${f1(bw)}" height="1.6"/>`; continue; }
    d += `<rect class="g-bar" x="${f1(sx(x) - bw / 2)}" y="${f1(H - 1 - hgt)}" width="${f1(bw)}" height="${f1(hgt)}" rx="${bars ? 1.5 : f1(bw / 2.2)}"/>`;
  }
  return `<line class="g-base" x1="${pad}" x2="${W - pad}" y1="${H - 0.5}" y2="${H - 0.5}"/>` + d;
}

function multinomialSvg(W, H, p) {
  // joint pmf of (x1, x2, x3) with x1 + x2 + x3 = n on a triangular grid, dots sized by probability
  const n = Math.min(p.n || 10, 12);
  const pr = [1 / 3, 1 / 3, 1 / 3];
  const cx = W / 2, top = 2.5, th = H - 5, side = Math.min(W * 0.62, th * 1.75);
  const pts = [];
  let pmax = 0;
  for (let a = 0; a <= n; a++) for (let b = 0; a + b <= n; b++) {
    const c = n - a - b;
    const lp = lgamma(n + 1) - lgamma(a + 1) - lgamma(b + 1) - lgamma(c + 1) + a * Math.log(pr[0]) + b * Math.log(pr[1]) + c * Math.log(pr[2]);
    const q = Math.exp(lp);
    pmax = Math.max(pmax, q);
    // barycentric -> plane: corner 1 bottom-left, corner 2 bottom-right, corner 3 top
    const u = b / n, v = c / n;
    const x = cx - side / 2 + side * (u + v / 2);
    const y = top + th * (1 - v);
    pts.push([x, y, q]);
  }
  const step = Math.min(side / n, th / n * 1.15);
  return `<path class="g-tri g-tri-soft" d="M${f1(cx - side / 2 - 3)},${f1(top + th + 2)}L${f1(cx + side / 2 + 3)},${f1(top + th + 2)}L${f1(cx)},${f1(top - 2.5)}Z"/>` +
    pts.map(([x, y, q]) => `<circle class="g-dot" cx="${f1(x)}" cy="${f1(y)}" r="${f1(Math.max(0.45, step * 0.62 * Math.sqrt(q / pmax)))}"/>`).join('');
}

function dirichletSvg(W, H, p) {
  const al = [p.alpha1 || 2, p.alpha2 || 3, p.alpha3 || 4];
  const top = 1.5, th = H - 3, side = Math.min(W * 0.62, th * 1.75), cx = W / 2;
  const A = [cx - side / 2, top + th], B = [cx + side / 2, top + th], C = [cx, top];
  const lnorm = lgamma(al[0] + al[1] + al[2]) - lgamma(al[0]) - lgamma(al[1]) - lgamma(al[2]);
  // small triangular cells shaded by density
  const n = 14;
  let out = '';
  let dmax = 0;
  const cells = [];
  const P = (i, j) => { const u = i / n, v = j / n; return [A[0] + (B[0] - A[0]) * u + (C[0] - A[0]) * v, A[1] + (B[1] - A[1]) * u + (C[1] - A[1]) * v]; };
  for (let i = 0; i < n; i++) for (let j = 0; i + j < n; j++) {
    for (const up of [true, false]) {
      if (!up && i + j + 1 >= n) continue;
      const tri = up ? [P(i, j), P(i + 1, j), P(i, j + 1)] : [P(i + 1, j), P(i + 1, j + 1), P(i, j + 1)];
      const u = up ? (i + 1 / 3) / n : (i + 2 / 3) / n, v = up ? (j + 1 / 3) / n : (j + 2 / 3) / n;
      const x = [1 - u - v, u, v];
      const d = Math.exp(lnorm + (al[0] - 1) * Math.log(x[0]) + (al[1] - 1) * Math.log(x[1]) + (al[2] - 1) * Math.log(x[2]));
      dmax = Math.max(dmax, d);
      cells.push([tri, d]);
    }
  }
  for (const [tri, d] of cells) {
    const o = Math.pow(d / dmax, 0.8);
    if (o < 0.04) continue;
    out += `<path class="g-heat" style="opacity:${o.toFixed(2)}" d="M${tri.map(q => f1(q[0]) + ',' + f1(q[1])).join('L')}Z"/>`;
  }
  return out + `<path class="g-tri" d="M${f1(A[0])},${f1(A[1])}L${f1(B[0])},${f1(B[1])}L${f1(C[0])},${f1(C[1])}Z"/>`;
}

function mvnSvg(W, H, p) {
  const rho = p.rho ?? 0.5, s1 = p.sigma1 || 1, s2 = p.sigma2 || 1;
  const L11 = s1, L21 = rho * s2, L22 = s2 * Math.sqrt(1 - rho * rho);
  const cx = W / 2, cy = H / 2 + 0.5, sc = (H - 4) / (2 * 2.2 * Math.max(s1, s2)) * 1.0;
  let out = '';
  const ks = [2.2, 1.5, 0.8];
  ks.forEach((k, idx) => {
    let d = '';
    for (let i = 0; i <= 48; i++) {
      const t = (i / 48) * 2 * PI, c = Math.cos(t), s = Math.sin(t);
      const x = cx + sc * k * L11 * c * 1.9, y = cy - sc * k * (L21 * c + L22 * s);
      d += (i ? 'L' : 'M') + f1(x) + ',' + f1(y);
    }
    out += `<path class="g-ell g-ell${idx}" d="${d}Z"/>`;
  });
  return out + `<circle class="g-dot" cx="${f1(cx)}" cy="${f1(cy)}" r="1.6"/>`;
}

/** Sample a module or fallback density into points. */
function samplePoints(kind, pdf, lo, hi, P) {
  const pts = [];
  if (kind === 'd' || kind === 'bars') {
    const a = Math.ceil(lo), b = Math.floor(hi);
    const stride = Math.max(1, Math.ceil((b - a + 1) / 40));
    for (let k = a; k <= b; k += stride) { let y = 0; try { y = pdf(k, P); } catch (_) { y = 0; } pts.push([k, Number.isFinite(y) ? y : 0]); }
  } else {
    const N = 90;
    for (let i = 0; i <= N; i++) {
      const x = lo + (hi - lo) * (i + (i === 0 ? 0.002 : i === N ? -0.002 : 0)) / N;
      let y = 0; try { y = pdf(x, P); } catch (_) { y = NaN; }
      pts.push([x, y]);
    }
  }
  return pts;
}

/**
 * Build the glyph markup for distribution `id`, using module `mod` when given.
 * @returns {string} SVG inner markup for a viewBox of 0 0 W H
 */
export function glyphMarkup(id, mod, W, H) {
  const pad = 3;
  const d = DISTRIBUTIONS.find(x => x.id === id);
  let P = defaults(id);
  if (mod && typeof mod.normalize === 'function') { try { P = mod.normalize({ ...P }, null) || P; } catch (_) { /* keep defaults */ } }
  if (id === 'multinomial') return multinomialSvg(W, H, P);
  if (id === 'dirichlet') return dirichletSvg(W, H, P);
  if (id === 'multivariate-normal') return mvnSvg(W, H, P);
  const fb = FALLBACK[id];
  let kind = fb ? fb[0] : (d && d.kind === 'discrete' ? 'd' : 'c');
  let pdf = fb ? fb[2] : () => 0, lo, hi;
  if (fb) [lo, hi] = fb[1](P);
  if (mod && typeof mod.pdf === 'function' && typeof mod.support === 'function' && (mod.kind === 'discrete' || mod.kind === 'continuous')) {
    try {
      const [a, b] = mod.support(P);
      if (Number.isFinite(a) && Number.isFinite(b) && b > a) {
        const pts = samplePoints(kind, mod.pdf, a, b, P);
        if (pts.some(q => Number.isFinite(q[1]) && q[1] > 0)) { pdf = mod.pdf; lo = a; hi = b; }
      }
    } catch (_) { /* fall back */ }
  }
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return '';
  const pts = samplePoints(kind, pdf, lo, hi, P);
  if (kind === 'c') return curveSvg(pts, W, H, pad);
  return stemsSvg(pts, W, H, pad + (kind === 'bars' ? 10 : 0), kind === 'bars');
}

export const HAS_FALLBACK = id => !!FALLBACK[id] || ['multinomial', 'dirichlet', 'multivariate-normal'].includes(id);
