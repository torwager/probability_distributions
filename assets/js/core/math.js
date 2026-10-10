// Numerics for the probability-distribution site.
// Pure functions, no DOM. Safe to import from Node (tests) and the browser.
// Accuracy target: about 1e-10 relative or better for the special functions in their usual ranges.

export const PI = Math.PI;
export const LN2 = Math.LN2;
export const LN_SQRT_2PI = 0.9189385332046727418; // ln(sqrt(2*pi))
export const SQRT2 = Math.SQRT2;
export const SQRT_2PI = 2.5066282746310005024;
export const EULER_GAMMA = 0.5772156649015328606;
const EPS = 1e-15;
const FPMIN = 1e-300;

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

export const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
export const isFiniteNumber = x => typeof x === 'number' && Number.isFinite(x);

/** n evenly spaced values from a to b inclusive. */
export function linspace(a, b, n) {
  if (n <= 1) return [a];
  const out = new Array(n), h = (b - a) / (n - 1);
  for (let i = 0; i < n; i++) out[i] = a + i * h;
  out[n - 1] = b;
  return out;
}

/** Integers lo..hi inclusive. */
export function range(lo, hi) {
  const out = [];
  for (let k = Math.ceil(lo); k <= hi; k++) out.push(k);
  return out;
}

/** log(1 + x) and exp(x) - 1 are built in; log(exp(a) + exp(b)) without overflow. */
export function logAddExp(a, b) {
  if (a === -Infinity) return b;
  if (b === -Infinity) return a;
  const m = Math.max(a, b);
  return m + Math.log1p(Math.exp(-Math.abs(a - b)));
}

/** log(sum(exp(xs))) */
export function logSumExp(xs) {
  let m = -Infinity;
  for (const x of xs) if (x > m) m = x;
  if (m === -Infinity) return -Infinity;
  let s = 0;
  for (const x of xs) s += Math.exp(x - m);
  return m + Math.log(s);
}

// ---------------------------------------------------------------------------
// Gamma, beta and related functions
// ---------------------------------------------------------------------------

// Lanczos approximation, g = 7, n = 9 (relative error about 1e-15).
const LANCZOS = [
  0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
  -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6,
  1.5056327351493116e-7,
];

/** Natural log of |Gamma(x)|. */
export function lgamma(x) {
  if (Number.isNaN(x)) return NaN;
  if (x === Infinity) return Infinity;
  if (x <= 0 && Number.isInteger(x)) return Infinity;
  if (x < 0.5) {
    // reflection: Gamma(x) Gamma(1-x) = pi / sin(pi x)
    return Math.log(PI / Math.abs(Math.sin(PI * x))) - lgamma(1 - x);
  }
  if (x === 1 || x === 2) return 0;
  x -= 1;
  let a = LANCZOS[0];
  const t = x + 7.5;
  for (let i = 1; i < 9; i++) a += LANCZOS[i] / (x + i);
  return LN_SQRT_2PI + (x + 0.5) * Math.log(t) - t + Math.log(a);
}

/** Gamma(x). */
export function gamma(x) {
  if (Number.isInteger(x)) {
    if (x <= 0) return NaN;
    if (x <= 171) { let f = 1; for (let i = 2; i < x; i++) f *= i; return f; }
    return Infinity;
  }
  if (x < 0.5) return PI / (Math.sin(PI * x) * gamma(1 - x));
  if (x > 171.6) return Infinity;
  return Math.exp(lgamma(x));
}

/** ln B(a, b) = ln Gamma(a) + ln Gamma(b) - ln Gamma(a + b). */
export function lbeta(a, b) { return lgamma(a) + lgamma(b) - lgamma(a + b); }
/** Beta function B(a, b). */
export function beta(a, b) { return Math.exp(lbeta(a, b)); }

const LFACT = (() => { const t = [0]; for (let i = 1; i <= 256; i++) t[i] = t[i - 1] + Math.log(i); return t; })();
/** ln(n!) for non-negative n (exact table up to 256, lgamma beyond). */
export function lfactorial(n) {
  if (n < 0) return NaN;
  if (Number.isInteger(n) && n <= 256) return LFACT[n];
  return lgamma(n + 1);
}
/** ln C(n, k), valid for real n >= k >= 0. */
export function logBinom(n, k) {
  if (k < 0 || k > n) return -Infinity;
  return lfactorial(n) - lfactorial(k) - lfactorial(n - k);
}
/** C(n, k) (rounded for integer arguments). */
export function binom(n, k) {
  if (k < 0 || k > n) return 0;
  const v = Math.exp(logBinom(n, k));
  return Number.isInteger(n) && Number.isInteger(k) ? Math.round(v) : v;
}

/** Digamma psi(x) = d/dx ln Gamma(x). */
export function digamma(x) {
  if (Number.isNaN(x)) return NaN;
  if (x <= 0 && Number.isInteger(x)) return NaN;
  let r = 0;
  if (x < 0) {
    // reflection: psi(1-x) - psi(x) = pi cot(pi x)
    return digamma(1 - x) - PI / Math.tan(PI * x);
  }
  while (x < 10) { r -= 1 / x; x += 1; }
  const f = 1 / (x * x);
  const t = f * (-1 / 12 + f * (1 / 120 + f * (-1 / 252 + f * (1 / 240 + f * (-1 / 132 + f * (691 / 32760 + f * (-1 / 12)))))));
  return r + Math.log(x) - 0.5 / x + t;
}

/** Trigamma psi'(x). */
export function trigamma(x) {
  if (x <= 0 && Number.isInteger(x)) return NaN;
  if (x < 0) {
    const s = PI / Math.sin(PI * x);
    return -trigamma(1 - x) + s * s;
  }
  let r = 0;
  while (x < 10) { r += 1 / (x * x); x += 1; }
  const f = 1 / (x * x);
  const t = 1 / x + f / 2 + f / x * (1 / 6 + f * (-1 / 30 + f * (1 / 42 + f * (-1 / 30 + f * (5 / 66)))));
  return r + t;
}

// ---------------------------------------------------------------------------
// Regularized incomplete gamma P(a, x), Q(a, x)
// ---------------------------------------------------------------------------

function gser(a, x) {
  // series: P(a,x) = e^{-x} x^a / Gamma(a+1) * sum x^n / ((a+1)...(a+n))
  let ap = a, sum = 1 / a, del = sum;
  for (let n = 0; n < 100000; n++) {
    ap += 1; del *= x / ap; sum += del;
    if (Math.abs(del) < Math.abs(sum) * EPS) break;
  }
  return sum * Math.exp(-x + a * Math.log(x) - lgamma(a));
}

function gcf(a, x) {
  // continued fraction for Q(a,x) (modified Lentz)
  let b = x + 1 - a, c = 1 / FPMIN, d = 1 / b, h = d;
  for (let i = 1; i < 100000; i++) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b; if (Math.abs(d) < FPMIN) d = FPMIN;
    c = b + an / c; if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const del = d * c; h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return Math.exp(-x + a * Math.log(x) - lgamma(a)) * h;
}

/** Regularized lower incomplete gamma P(a, x) = gamma(a, x) / Gamma(a). */
export function gammaP(a, x) {
  if (Number.isNaN(a) || Number.isNaN(x) || a <= 0) return NaN;
  if (x <= 0) return 0;
  if (x === Infinity) return 1;
  return x < a + 1 ? gser(a, x) : 1 - gcf(a, x);
}
/** Regularized upper incomplete gamma Q(a, x) = 1 - P(a, x) (accurate in the upper tail). */
export function gammaQ(a, x) {
  if (Number.isNaN(a) || Number.isNaN(x) || a <= 0) return NaN;
  if (x <= 0) return 1;
  if (x === Infinity) return 0;
  return x < a + 1 ? 1 - gser(a, x) : gcf(a, x);
}

/** Inverse of P(a, .): the x with P(a, x) = p. */
export function gammaPinv(a, p) {
  if (p <= 0) return 0;
  if (p >= 1) return Infinity;
  // initial guess (Wilson-Hilferty), then Newton with bisection safeguard
  let x;
  const z = normalQuantile(p);
  const t = 1 / (9 * a);
  x = a * Math.pow(1 - t + z * Math.sqrt(t), 3);
  if (!(x > 0) || !Number.isFinite(x)) x = Math.max(1e-3, a);
  if (a < 1) {
    const g = Math.exp(lgamma(a + 1));
    const xs = Math.pow(p * g, 1 / a);
    if (xs < x || !(x > 0)) x = xs;
  }
  let lo = 0, hi = Infinity;
  for (let i = 0; i < 200; i++) {
    const f = gammaP(a, x) - p;
    if (f < 0) lo = x; else hi = x;
    const dens = Math.exp((a - 1) * Math.log(x) - x - lgamma(a));
    let nx = dens > 0 ? x - f / dens : NaN;
    if (!(nx > lo && nx < hi) || !Number.isFinite(nx)) nx = hi === Infinity ? Math.max(2 * x, lo + 1) : (lo + hi) / 2;
    if (Math.abs(nx - x) <= 1e-14 * Math.max(1, x)) { x = nx; break; }
    x = nx;
  }
  return x;
}

// ---------------------------------------------------------------------------
// Regularized incomplete beta I_x(a, b)
// ---------------------------------------------------------------------------

function betacf(a, b, x) {
  const qab = a + b, qap = a + 1, qam = a - 1;
  let c = 1, d = 1 - qab * x / qap;
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1 / d;
  let h = d;
  for (let m = 1; m < 100000; m++) {
    const m2 = 2 * m;
    let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
    d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d; h *= d * c;
    aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
    d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const del = d * c; h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return h;
}

/** Regularized incomplete beta function I_x(a, b) = P(Beta(a, b) <= x). */
export function betaI(x, a, b) {
  if (Number.isNaN(x) || !(a > 0) || !(b > 0)) return NaN;
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const lbt = lgamma(a + b) - lgamma(a) - lgamma(b) + a * Math.log(x) + b * Math.log1p(-x);
  if (x < (a + 1) / (a + b + 2)) return Math.exp(lbt) * betacf(a, b, x) / a;
  return 1 - Math.exp(lbt) * betacf(b, a, 1 - x) / b;
}
/** Upper tail 1 - I_x(a, b), computed without cancellation. */
export function betaIc(x, a, b) {
  if (x <= 0) return 1;
  if (x >= 1) return 0;
  return betaI(1 - x, b, a);
}
/** Inverse regularized incomplete beta: the x with I_x(a, b) = p. */
export function betaIinv(p, a, b) {
  if (p <= 0) return 0;
  if (p >= 1) return 1;
  let lo = 0, hi = 1;
  // initial guess from the mean, then Newton with bisection safeguard
  let x = a / (a + b);
  const lb = lbeta(a, b);
  for (let i = 0; i < 300; i++) {
    const f = betaI(x, a, b) - p;
    if (f < 0) lo = x; else hi = x;
    const dens = Math.exp((a - 1) * Math.log(x) + (b - 1) * Math.log1p(-x) - lb);
    let nx = x - f / dens;
    if (!(nx > lo && nx < hi) || !Number.isFinite(nx)) nx = (lo + hi) / 2;
    if (Math.abs(nx - x) <= 1e-15 * Math.max(1e-300, x) || hi - lo < 1e-16) { x = nx; break; }
    x = nx;
  }
  return x;
}

// ---------------------------------------------------------------------------
// Error function and the normal distribution
// ---------------------------------------------------------------------------

/** Error function erf(x). */
export function erf(x) {
  if (Number.isNaN(x)) return NaN;
  if (x === 0) return 0;
  if (Math.abs(x) < 0.5) {
    // Maclaurin series, fast and exact near 0
    const x2 = x * x;
    let term = x, sum = x;
    for (let n = 1; n < 60; n++) {
      term *= -x2 / n;
      const add = term / (2 * n + 1);
      sum += add;
      if (Math.abs(add) < 1e-17 * Math.abs(sum)) break;
    }
    return 2 / Math.sqrt(PI) * sum;
  }
  const v = gammaP(0.5, x * x);
  return x < 0 ? -v : v;
}
/** Complementary error function erfc(x) = 1 - erf(x), accurate in the tails. */
export function erfc(x) {
  if (Number.isNaN(x)) return NaN;
  if (Math.abs(x) < 0.5) return 1 - erf(x);
  return x > 0 ? gammaQ(0.5, x * x) : 1 + gammaP(0.5, x * x);
}

/** Standard normal density phi(z). */
export function normalPdf(z) { return Math.exp(-0.5 * z * z - LN_SQRT_2PI); }
/** Standard normal CDF Phi(z). */
export function normalCdf(z) {
  if (z === Infinity) return 1;
  if (z === -Infinity) return 0;
  return 0.5 * erfc(-z / SQRT2);
}

/** Standard normal quantile Phi^{-1}(p) (Acklam's rational approximation plus one Halley step). */
export function normalQuantile(p) {
  if (Number.isNaN(p) || p < 0 || p > 1) return NaN;
  if (p === 0) return -Infinity;
  if (p === 1) return Infinity;
  const a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02, 1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00];
  const b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02, 6.680131188771972e+01, -1.328068155288572e+01];
  const c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00, -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00];
  const d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00, 3.754408661907416e+00];
  const plow = 0.02425, phigh = 1 - plow;
  let x;
  if (p < plow) {
    const q = Math.sqrt(-2 * Math.log(p));
    x = (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  } else if (p <= phigh) {
    const q = p - 0.5, r = q * q;
    x = (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  } else {
    const q = Math.sqrt(-2 * Math.log1p(-p));
    x = -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  // Halley refinement (two steps for full precision); use the upper tail when x > 0 to avoid cancellation
  for (let i = 0; i < 2; i++) {
    const e = x > 0 ? (1 - p) - normalCdf(-x) : normalCdf(x) - p;
    const u = e * SQRT_2PI * Math.exp(0.5 * x * x);
    x = x - u / (1 + 0.5 * x * u);
  }
  return x;
}

// ---------------------------------------------------------------------------
// Modified Bessel functions of the first kind (for the von Mises distribution)
// ---------------------------------------------------------------------------

function besselSeries(nu, x) {
  // I_nu(x) = sum_k (x/2)^{2k+nu} / (k! Gamma(k+nu+1)) for nu = 0 or 1
  const q = 0.25 * x * x;
  let term = nu === 0 ? 1 : 0.5 * x, sum = term;
  for (let k = 1; k < 500; k++) {
    term *= q / (k * (k + nu));
    sum += term;
    if (term < 1e-17 * sum) break;
  }
  return sum;
}
function besselAsymScaled(nu, x) {
  // e^{-x} I_nu(x) ~ 1/sqrt(2 pi x) * sum_k (-1)^k a_k(nu) / x^k, a_k = prod_{j=1..k} (4nu^2 - (2j-1)^2) / (k! 8^k)
  const mu = 4 * nu * nu;
  let term = 1, sum = 1;
  for (let k = 1; k < 40; k++) {
    const next = -term * (mu - (2 * k - 1) * (2 * k - 1)) / (k * 8 * x);
    if (Math.abs(next) > Math.abs(term)) break; // asymptotic series starts to diverge
    term = next; sum += term;
    if (Math.abs(term) < 1e-17 * Math.abs(sum)) break;
  }
  return sum / Math.sqrt(2 * PI * x);
}
/** I_0(x), modified Bessel function of order 0. */
export function besselI0(x) {
  x = Math.abs(x);
  return x <= 50 ? besselSeries(0, x) : Math.exp(x) * besselAsymScaled(0, x);
}
/** I_1(x), modified Bessel function of order 1. */
export function besselI1(x) {
  const s = Math.sign(x); x = Math.abs(x);
  return s * (x <= 50 ? besselSeries(1, x) : Math.exp(x) * besselAsymScaled(1, x));
}
/** e^{-|x|} I_0(x), finite for all x. */
export function besselI0e(x) {
  x = Math.abs(x);
  return x <= 50 ? besselSeries(0, x) * Math.exp(-x) : besselAsymScaled(0, x);
}
/** e^{-|x|} I_1(x). */
export function besselI1e(x) {
  const s = Math.sign(x); x = Math.abs(x);
  return s * (x <= 50 ? besselSeries(1, x) * Math.exp(-x) : besselAsymScaled(1, x));
}

// ---------------------------------------------------------------------------
// Numerical integration
// ---------------------------------------------------------------------------

// 15-point Gauss-Kronrod nodes/weights (QUADPACK qk15) and the embedded 7-point Gauss weights.
const XGK = [0.991455371120812639206854697526329, 0.949107912342758524526189684047851, 0.864864423359769072789712788640926,
  0.741531185599394439863864773280788, 0.586087235467691130294144845693013, 0.405845151377397166906606412076961,
  0.207784955007898467600689403773245, 0];
const WGK = [0.022935322010529224963732008058970, 0.063092092629978553290700663189204, 0.104790010322250183839876322541518,
  0.140653259715525918745189590510238, 0.169004726639267902826583426598550, 0.190350578064785409913256402421014,
  0.204432940075298892414161999234649, 0.209482141084727828012999174891714];
const WG = [0.129484966168869693270611432679082, 0.279705391489276667901467771423780, 0.381830050505118944950369775488975,
  0.417959183673469387755102040816327];

function gk15(f, a, b) {
  const c = 0.5 * (a + b), h = 0.5 * (b - a);
  const fc = f(c);
  let resK = fc * WGK[7], resG = fc * WG[3];
  for (let j = 0; j < 7; j++) {
    const dx = h * XGK[j];
    const f1 = f(c - dx), f2 = f(c + dx);
    resK += WGK[j] * (f1 + f2);
    if (j % 2 === 1) resG += WG[(j - 1) / 2] * (f1 + f2);
  }
  return { value: resK * h, error: Math.abs((resK - resG) * h) };
}

/**
 * Adaptive Gauss-Kronrod integral of f over [a, b]. Infinite limits are allowed
 * (handled by a change of variables). Non-finite integrand values are treated as 0.
 * @returns {number}
 */
export function integrate(f, a, b, { tol = 1e-11, maxIntervals = 2000 } = {}) {
  if (a === b) return 0;
  if (a > b) return -integrate(f, b, a, { tol, maxIntervals });
  const safe = g => t => { const v = g(t); return Number.isFinite(v) ? v : 0; };
  let g, lo, hi;
  if (a === -Infinity && b === Infinity) {
    g = t => { const u = 1 - t * t; return f(t / u) * (1 + t * t) / (u * u); }; lo = -1; hi = 1;
  } else if (b === Infinity) {
    g = t => { const u = 1 - t; return f(a + t / u) / (u * u); }; lo = 0; hi = 1;
  } else if (a === -Infinity) {
    g = t => { const u = 1 - t; return f(b - t / u) / (u * u); }; lo = 0; hi = 1;
  } else { g = f; lo = a; hi = b; }
  g = safe(g);
  // global adaptive bisection on the interval with the largest error estimate
  const first = gk15(g, lo, hi);
  const heap = [{ a: lo, b: hi, ...first }];
  let total = first.value, err = first.error;
  while (err > Math.max(tol, tol * Math.abs(total)) && heap.length < maxIntervals) {
    let iMax = 0;
    for (let i = 1; i < heap.length; i++) if (heap[i].error > heap[iMax].error) iMax = i;
    const iv = heap[iMax];
    const m = 0.5 * (iv.a + iv.b);
    if (m === iv.a || m === iv.b) break;
    const L = gk15(g, iv.a, m), R = gk15(g, m, iv.b);
    total += L.value + R.value - iv.value;
    err += L.error + R.error - iv.error;
    heap[iMax] = { a: iv.a, b: m, ...L };
    heap.push({ a: m, b: iv.b, ...R });
  }
  return total;
}

/** Adaptive Simpson integral of f over finite [a, b]. */
export function integrateSimpson(f, a, b, tol = 1e-10, maxDepth = 50) {
  const fa = f(a), fb = f(b), m = 0.5 * (a + b), fm = f(m);
  const whole = (b - a) / 6 * (fa + 4 * fm + fb);
  function rec(a, b, fa, fm, fb, whole, tol, depth) {
    const m = 0.5 * (a + b), lm = 0.5 * (a + m), rm = 0.5 * (m + b);
    const flm = f(lm), frm = f(rm);
    const left = (m - a) / 6 * (fa + 4 * flm + fm), right = (b - m) / 6 * (fm + 4 * frm + fb);
    const delta = left + right - whole;
    if (depth <= 0 || Math.abs(delta) <= 15 * tol) return left + right + delta / 15;
    return rec(a, m, fa, flm, fm, left, tol / 2, depth - 1) + rec(m, b, fm, frm, fb, right, tol / 2, depth - 1);
  }
  return rec(a, b, fa, fm, fb, whole, tol, maxDepth);
}

// ---------------------------------------------------------------------------
// Root finding and numeric quantiles
// ---------------------------------------------------------------------------

/** Bisection for f(x) = 0 on [a, b] with f(a), f(b) of opposite sign. */
export function bisect(f, a, b, tol = 1e-13, maxIter = 300) {
  let fa = f(a);
  for (let i = 0; i < maxIter; i++) {
    const m = 0.5 * (a + b), fm = f(m);
    if (fm === 0 || (b - a) / 2 < tol * Math.max(1, Math.abs(m))) return m;
    if ((fm < 0) === (fa < 0)) { a = m; fa = fm; } else b = m;
  }
  return 0.5 * (a + b);
}

/** Brent's method for f(x) = 0 on [a, b] (f(a), f(b) must bracket a root). */
export function brent(f, a, b, tol = 1e-14, maxIter = 200) {
  let fa = f(a), fb = f(b);
  if (fa === 0) return a;
  if (fb === 0) return b;
  if ((fa > 0) === (fb > 0)) return NaN;
  let c = a, fc = fa, d = b - a, e = d;
  for (let i = 0; i < maxIter; i++) {
    if ((fb > 0) === (fc > 0)) { c = a; fc = fa; d = e = b - a; }
    if (Math.abs(fc) < Math.abs(fb)) { a = b; b = c; c = a; fa = fb; fb = fc; fc = fa; }
    const tol1 = 2 * Number.EPSILON * Math.abs(b) + 0.5 * tol, xm = 0.5 * (c - b);
    if (Math.abs(xm) <= tol1 || fb === 0) return b;
    if (Math.abs(e) >= tol1 && Math.abs(fa) > Math.abs(fb)) {
      const s = fb / fa;
      let p, q;
      if (a === c) { p = 2 * xm * s; q = 1 - s; }
      else {
        const qq = fa / fc, r = fb / fc;
        p = s * (2 * xm * qq * (qq - r) - (b - a) * (r - 1));
        q = (qq - 1) * (r - 1) * (s - 1);
      }
      if (p > 0) q = -q; else p = -p;
      if (2 * p < Math.min(3 * xm * q - Math.abs(tol1 * q), Math.abs(e * q))) { e = d; d = p / q; }
      else { d = xm; e = d; }
    } else { d = xm; e = d; }
    a = b; fa = fb;
    b += Math.abs(d) > tol1 ? d : (xm > 0 ? tol1 : -tol1);
    fb = f(b);
  }
  return b;
}

/**
 * Numeric quantile of a continuous distribution: the x with cdf(x) = u.
 * `lo`, `hi` are the support bounds (may be infinite); `guess` is a starting point.
 */
export function quantileContinuous(cdf, u, lo = -Infinity, hi = Infinity, guess = 0, scale = 1) {
  if (u <= 0) return lo;
  if (u >= 1) return hi;
  let a = Number.isFinite(lo) ? lo : Math.min(guess, guess - scale);
  let b = Number.isFinite(hi) ? hi : Math.max(guess, guess + scale);
  let step = scale;
  for (let i = 0; i < 2000 && !Number.isFinite(lo) && cdf(a) > u; i++) { a -= step; step *= 2; }
  step = scale;
  for (let i = 0; i < 2000 && !Number.isFinite(hi) && cdf(b) < u; i++) { b += step; step *= 2; }
  return brent(x => cdf(x) - u, a, b, 1e-14);
}

/**
 * Quantile of a discrete distribution on the integers: smallest k with cdf(k) >= u.
 * `lo` is the smallest support point (finite), `hi` the largest (may be Infinity).
 */
export function quantileDiscrete(cdf, u, lo = 0, hi = Infinity, guess = lo) {
  if (u <= 0) return lo;
  if (u >= 1 && hi !== Infinity) return hi;
  if (u >= 1) return Infinity;
  const tol = 1e-12;
  let k = Math.max(lo, Math.round(guess));
  // expand upward until cdf(k) >= u
  let step = 1;
  while (k < hi && cdf(k) < u - tol) { k = Math.min(hi, k + step); step *= 2; }
  // now cdf(k) >= u; binary search downward on [lo, k]
  let a = lo, b = k;
  if (cdf(a) >= u - tol) return a;
  while (b - a > 1) {
    const m = Math.floor((a + b) / 2);
    if (cdf(m) >= u - tol) b = m; else a = m;
  }
  return b;
}

// ---------------------------------------------------------------------------
// Random numbers (seeded) and samplers for simulation demos
// ---------------------------------------------------------------------------

/** mulberry32: a small, fast seeded PRNG. Returns a function giving uniforms in [0, 1). */
export function mulberry32(seed = 1) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Create an RNG object with samplers bound to a seeded uniform source. */
export function makeRng(seed = 12345) {
  const u01 = mulberry32(seed);
  const unif = () => { let u; do { u = u01(); } while (u === 0); return u; }; // (0, 1)
  let spare = null;
  const rng = {
    random: unif,
    uniform: (a = 0, b = 1) => a + (b - a) * unif(),
    int: (a, b) => a + Math.floor((b - a + 1) * u01()),
    normal(mu = 0, sigma = 1) {
      if (spare !== null) { const z = spare; spare = null; return mu + sigma * z; }
      let u, v, s;
      do { u = 2 * u01() - 1; v = 2 * u01() - 1; s = u * u + v * v; } while (s >= 1 || s === 0);
      const m = Math.sqrt(-2 * Math.log(s) / s);
      spare = v * m;
      return mu + sigma * u * m;
    },
    exponential: (rate = 1) => -Math.log(unif()) / rate,
    gamma(shape, rate = 1) {
      // Marsaglia & Tsang (2000); boost for shape < 1
      if (shape < 1) return rng.gamma(shape + 1, rate) * Math.pow(unif(), 1 / shape);
      const d = shape - 1 / 3, c = 1 / Math.sqrt(9 * d);
      for (;;) {
        let x, v;
        do { x = rng.normal(); v = 1 + c * x; } while (v <= 0);
        v = v * v * v;
        const u = unif();
        if (u < 1 - 0.0331 * x * x * x * x) return d * v / rate;
        if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v / rate;
      }
    },
    beta(a, b) { const x = rng.gamma(a), y = rng.gamma(b); return x / (x + y); },
    chiSquared: k => 2 * rng.gamma(k / 2),
    studentT: nu => rng.normal() / Math.sqrt(rng.chiSquared(nu) / nu),
    f: (d1, d2) => (rng.chiSquared(d1) / d1) / (rng.chiSquared(d2) / d2),
    cauchy: (x0 = 0, g = 1) => x0 + g * Math.tan(PI * (unif() - 0.5)),
    laplace(mu = 0, b = 1) { const u = unif() - 0.5; return mu - b * Math.sign(u) * Math.log(1 - 2 * Math.abs(u)); },
    logistic(mu = 0, s = 1) { const u = unif(); return mu + s * Math.log(u / (1 - u)); },
    lognormal: (mu = 0, sigma = 1) => Math.exp(rng.normal(mu, sigma)),
    weibull: (k, lambda = 1) => lambda * Math.pow(-Math.log(unif()), 1 / k),
    pareto: (xm, alpha) => xm * Math.pow(unif(), -1 / alpha),
    gumbel: (mu = 0, b = 1) => mu - b * Math.log(-Math.log(unif())),
    exGaussian: (mu, sigma, tau) => rng.normal(mu, sigma) + rng.exponential(1 / tau),
    wald(mu, lambda) {
      // Michael, Schucany & Haas (1976)
      const nu = rng.normal(), y = nu * nu;
      const x = mu + mu * mu * y / (2 * lambda) - mu / (2 * lambda) * Math.sqrt(4 * mu * lambda * y + mu * mu * y * y);
      return unif() <= mu / (mu + x) ? x : mu * mu / x;
    },
    vonMises(mu, kappa) {
      // Best & Fisher (1979); returns an angle in [-pi, pi)
      if (kappa < 1e-8) return PI * (2 * unif() - 1);
      const tau = 1 + Math.sqrt(1 + 4 * kappa * kappa), rho = (tau - Math.sqrt(2 * tau)) / (2 * kappa), r = (1 + rho * rho) / (2 * rho);
      for (;;) {
        const z = Math.cos(PI * unif()), f = (1 + r * z) / (r + z), c = kappa * (r - f);
        const u2 = unif();
        if (c * (2 - c) - u2 > 0 || Math.log(c / u2) + 1 - c >= 0) {
          const th = (unif() > 0.5 ? 1 : -1) * Math.acos(f) + mu;
          return ((th + PI) % (2 * PI) + 2 * PI) % (2 * PI) - PI;
        }
      }
    },
    bernoulli: p => (u01() < p ? 1 : 0),
    binomial(n, p) {
      if (p <= 0 || n <= 0) return 0;
      if (p >= 1) return n;
      if (n <= 40) { let s = 0; for (let i = 0; i < n; i++) if (u01() < p) s++; return s; }
      // exact recursive method via beta-distributed order statistics (Knuth, TAOCP vol. 2)
      const a = 1 + Math.floor(n / 2), b = n + 1 - a;
      const x = rng.beta(a, b);
      return x >= p ? rng.binomial(a - 1, p / x) : a + rng.binomial(b - 1, (p - x) / (1 - x));
    },
    poisson(lambda) {
      if (lambda <= 0) return 0;
      if (lambda < 10) {
        const L = Math.exp(-lambda); let k = 0, p = u01();
        while (p > L) { k++; p *= u01(); }
        return k;
      }
      // PTRS transformed rejection (Hoermann 1993)
      const slam = Math.sqrt(lambda), loglam = Math.log(lambda), b = 0.931 + 2.53 * slam, a = -0.059 + 0.02483 * b;
      const invalpha = 1.1239 + 1.1328 / (b - 3.4), vr = 0.9277 - 3.6224 / (b - 2);
      for (;;) {
        const U = u01() - 0.5, V = unif(), us = 0.5 - Math.abs(U);
        const k = Math.floor((2 * a / us + b) * U + lambda + 0.43);
        if (us >= 0.07 && V <= vr) return k;
        if (k < 0 || (us < 0.013 && V > us)) continue;
        if (Math.log(V) + Math.log(invalpha) - Math.log(a / (us * us) + b) <= -lambda + k * loglam - lgamma(k + 1)) return k;
      }
    },
    geometric: p => (p >= 1 ? 0 : Math.floor(Math.log(unif()) / Math.log1p(-p))), // failures before 1st success
    negativeBinomial: (r, p) => (p >= 1 ? 0 : rng.poisson(rng.gamma(r, p / (1 - p)))),
    hypergeometric(N, K, n) {
      let succ = K, total = N, x = 0;
      for (let i = 0; i < n; i++) { if (u01() * total < succ) { x++; succ--; } total--; }
      return x;
    },
    categorical(probs) {
      let u = u01() * probs.reduce((s, v) => s + v, 0);
      for (let i = 0; i < probs.length; i++) { u -= probs[i]; if (u < 0) return i; }
      return probs.length - 1;
    },
    multinomial(n, probs) {
      const out = new Array(probs.length).fill(0);
      let left = n, rest = 1;
      for (let i = 0; i < probs.length - 1 && left > 0; i++) {
        const x = rest > 0 ? rng.binomial(left, Math.min(1, probs[i] / rest)) : 0;
        out[i] = x; left -= x; rest -= probs[i];
      }
      out[probs.length - 1] += left;
      return out;
    },
    dirichlet(alphas) { const g = alphas.map(a => rng.gamma(a)); const s = g.reduce((a, b) => a + b, 0); return g.map(v => v / s); },
    /** Draw n values from a sampler: rng.many(1000, () => rng.normal()) */
    many(n, draw) { const out = new Array(n); for (let i = 0; i < n; i++) out[i] = draw(); return out; },
  };
  return rng;
}

// ---------------------------------------------------------------------------
// Descriptive statistics for simulation demos
// ---------------------------------------------------------------------------

export function mean(xs) { let s = 0; for (const x of xs) s += x; return s / xs.length; }
export function variance(xs) {
  const m = mean(xs); let s = 0;
  for (const x of xs) s += (x - m) * (x - m);
  return s / (xs.length - 1);
}
/** Histogram with `bins` equal-width bins on [lo, hi]. Returns {edges, counts, density}. */
export function histogram(xs, lo, hi, bins) {
  const counts = new Array(bins).fill(0), w = (hi - lo) / bins;
  for (const x of xs) {
    if (x < lo || x > hi) continue;
    let i = Math.floor((x - lo) / w); if (i === bins) i--;
    counts[i]++;
  }
  const edges = linspace(lo, hi, bins + 1);
  const density = counts.map(c => c / (xs.length * w));
  return { edges, counts, density, width: w };
}
/** Empirical CDF value of sorted sample at x. */
export function ecdf(sorted, x) {
  let lo = 0, hi = sorted.length;
  while (lo < hi) { const m = (lo + hi) >> 1; if (sorted[m] <= x) lo = m + 1; else hi = m; }
  return lo / sorted.length;
}

// ---------------------------------------------------------------------------
// Number formatting helpers used for ticks and readouts (pure)
// ---------------------------------------------------------------------------

/** A "nice" step (1, 2 or 5 times a power of ten) close to x. */
export function niceStep(x) {
  if (!(x > 0) || !Number.isFinite(x)) return 1;
  const e = Math.floor(Math.log10(x)), f = x / Math.pow(10, e);
  const n = f < 1.5 ? 1 : f < 3.5 ? 2 : f < 7.5 ? 5 : 10;
  return n * Math.pow(10, e);
}
/** Round x to the nearest multiple of step, avoiding floating-point noise in the result. */
export function roundTo(x, step) {
  if (!(step > 0)) return x;
  const dec = Math.max(0, -Math.floor(Math.log10(step)) + 1);
  return Number((Math.round(x / step) * step).toFixed(Math.min(15, dec)));
}
