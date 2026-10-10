// Numeric and structural checks for every distribution module in assets/js/dists/.
// Run: node --test tests/   (or npm test)
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as M from '../assets/js/core/math.js';
import { getDist, relationsOf } from '../assets/js/catalog.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = path.join(ROOT, 'assets/js/dists');
const files = fs.readdirSync(DIR).filter(f => f.endsWith('.js')).sort();

const close = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: got ${a}, expected ${b} (tol ${tol})`);

// Every page lists these properties (by these names, in any order). Others may be added.
export const REQUIRED_PROPERTIES = ['Support', 'Mean', 'Median', 'Mode', 'Variance', 'Standard deviation', 'Skewness', 'Excess kurtosis', 'Entropy'];
// Greek letters written as plain words in prose should be TeX ($\lambda$), not "lambda".
const ASCII_GREEK = /\b(alpha|lambda|sigma|kappa|theta|mu|nu|rho|tau|epsilon|varepsilon)\b/;
/** Remove $...$ (TeX), HTML tags and URLs so that only prose remains. */
const proseOnly = t => String(t).replace(/\\\$/g, '').replace(/\$\$[\s\S]*?\$\$|\$[^$]*\$/g, ' ').replace(/<[^>]+>/g, ' ').replace(/https?:\S+/g, ' ');
/** Greek-letter commands used in a TeX string, e.g. ['mu', 'sigma']. */
const greekIn = tex => [...new Set((String(tex).match(/\\(alpha|beta|gamma|delta|kappa|lambda|mu|nu|rho|sigma|tau|theta|xi|eta|phi|psi|omega|varepsilon|epsilon|zeta|chi|pi|Gamma|Phi|Sigma|Delta)(?![a-zA-Z])/g) || []).map(m => m.slice(1)))];

/** Numeric central moments and entropy of a continuous density on [lo, hi] (pts = break points). */
function contMoments(pdf, lo, hi, mean, pts) {
  const I = f => M.integrate(f, lo, hi, { tol: 1e-12, points: pts });
  const m2 = I(x => (x - mean) ** 2 * pdf(x)), m3 = I(x => (x - mean) ** 3 * pdf(x)), m4 = I(x => (x - mean) ** 4 * pdf(x));
  const H = I(x => { const f = pdf(x); return f > 0 ? -f * Math.log(f) : 0; });
  return { skewness: m3 / m2 ** 1.5, exKurtosis: m4 / (m2 * m2) - 3, entropy: H };
}

function defaults(mod) {
  let p = {};
  for (const prm of mod.params) p[prm.key] = prm.default;
  if (mod.normalize) p = mod.normalize(p, null) || p;
  return p;
}

/** Parameter sets to test: defaults plus any module-provided testParams. */
function paramSets(mod) {
  return [defaults(mod), ...(mod.testParams || []).map(tp => ({ ...defaults(mod), ...tp }))];
}

for (const file of files) {
  const id = file.slice(0, -3);
  const mod = (await import(pathToFileURL(path.join(DIR, file)).href)).default;
  const cat = getDist(id);

  test(`${id}: module structure`, () => {
    assert.ok(cat, `catalog has no distribution with id "${id}"`);
    assert.equal(mod.id, id, 'module id must match the file name');
    assert.equal(mod.kind, cat.kind, 'kind must match the catalog');
    assert.equal(typeof mod.name, 'string');
    assert.ok(Array.isArray(mod.params) && mod.params.length, 'params');
    for (const prm of mod.params) {
      for (const f of ['key', 'sym', 'name', 'meaning', 'min', 'max', 'default']) assert.ok(prm[f] !== undefined, `param field ${f} on ${prm.key}`);
      assert.ok(prm.min <= prm.default && prm.default <= prm.max, `default of ${prm.key} (${prm.default}) is outside [${prm.min}, ${prm.max}]`);
      if (prm.integer) assert.ok(Number.isInteger(prm.default), `integer param ${prm.key} needs an integer default`);
    }
    for (const fn of ['pdf', 'support', 'stats']) assert.equal(typeof mod[fn], 'function', `missing ${fn}()`);
    if (!mod.kind.startsWith('multivariate')) {
      assert.equal(typeof mod.cdf, 'function', 'missing cdf()');
      assert.equal(typeof mod.range, 'function', 'missing range()');
    }
    if (mod.kind.startsWith('multivariate')) {
      assert.equal(typeof mod.checks, 'function', 'multivariate modules must provide checks(p, math) for the numeric tests (see ARCHITECTURE.md)');
    }
    if (mod.customExplorer) assert.equal(typeof mod.customExplorer, 'function');
    if (mod.kind.startsWith('multivariate') || mod.customExplorer) {
      // multivariate distributions may draw their own explorer
    } else {
      const hs = typeof mod.handles === 'function' ? mod.handles(defaults(mod)) : mod.handles;
      assert.ok(Array.isArray(hs) && hs.length, 'at least one drag handle');
      const keys = new Set(mod.params.map(p => p.key));
      for (const h of hs) {
        assert.ok(['vline', 'hArrow', 'vArrow', 'point', 'xPoint'].includes(h.type), `handle type ${h.type}`);
        assert.ok(keys.has(h.param), `handle param ${h.param} is not a parameter`);
        if (h.type === 'hArrow' || h.type === 'vArrow') assert.ok(h.from && h.to, `${h.type} needs from() and to()`);
        if (h.type === 'point') assert.ok(h.at && h.set, 'point needs at() and set()');
      }
    }
  });

  test(`${id}: content fields`, () => {
    const c = mod.content;
    assert.ok(c, 'content');
    assert.ok(c.description && (Array.isArray(c.description) ? c.description.length : c.description.length > 40), 'description');
    for (const f of ['pdfTex', 'cdfTex']) assert.ok(typeof c[f] === 'string' && c[f].length > 3, f);
    for (const f of ['glossary', 'cdfGlossary']) {
      assert.ok(Array.isArray(c[f]) && c[f].length, f);
      for (const g of c[f]) assert.ok(g.sym && g.meaning, `${f} item needs sym and meaning`);
    }
    assert.ok(Array.isArray(c.properties) && c.properties.length >= 6, 'at least 6 properties');
    for (const pr of c.properties) {
      assert.ok(pr.name && pr.explain, `property needs name and explain: ${JSON.stringify(pr.name)}`);
      if (pr.value) { const v = pr.value(defaults(mod)); assert.ok(typeof v === 'number' || typeof v === 'string', `property value for ${pr.name}`); }
    }
    assert.ok(Array.isArray(c.limits), 'limits');
    for (const L of c.limits) {
      assert.ok(L.text, 'limit text');
      if (L.to) assert.ok(getDist(L.to), `limit links to unknown distribution ${L.to}`);
    }
    for (const k of ['frequentist', 'bayesian', 'modeling']) assert.ok(Array.isArray(c.uses?.[k]) && c.uses[k].length, `uses.${k}`);
    assert.ok(Array.isArray(c.references) && c.references.length, 'references');
    // the same core property rows on every page
    const names = c.properties.map(pr => String(pr.name).toLowerCase());
    for (const req of REQUIRED_PROPERTIES) assert.ok(names.includes(req.toLowerCase()), `properties must include a row named "${req}"`);
    // live values in the table agree with stats()
    const st0 = mod.stats(defaults(mod));
    const KEY = { mean: 'mean', median: 'median', mode: 'mode', variance: 'variance', 'standard deviation': 'sd', skewness: 'skewness', 'excess kurtosis': 'exKurtosis', entropy: 'entropy' };
    for (const pr of c.properties) {
      const k = KEY[String(pr.name).toLowerCase()];
      if (!k || !pr.value || typeof st0[k] !== 'number' || !Number.isFinite(st0[k])) continue;
      const v = pr.value(defaults(mod));
      if (typeof v === 'number') close(v, st0[k], 1e-9 * Math.max(1, Math.abs(st0[k])), `property row "${pr.name}" value vs stats().${k}`);
    }
    // limits and special cases cover every catalog relation of kind limit or special-case
    const limitRels = relationsOf(id).filter(r => r.kind === 'limit' || r.kind === 'special-case').map(r => r.id);
    const listed = new Set(c.limits.map(L => L.relation).filter(Boolean));
    for (const rid of limitRels) assert.ok(listed.has(rid), `content.limits should include an item with relation: '${rid}'`);
    for (const L of c.limits) if (L.relation) assert.ok(relationsOf(id).some(r => r.id === L.relation), `limit links to relation ${L.relation}, which does not involve ${id}`);
    // every Greek letter in the PDF/PMF and CDF formulas is explained in the matching glossary
    for (const [texKey, glKey] of [['pdfTex', 'glossary'], ['cdfTex', 'cdfGlossary']]) {
      const explained = c[glKey].map(g => g.sym).join(' ');
      for (const g of greekIn(c[texKey])) assert.ok(new RegExp('\\\\' + g + '(?![a-zA-Z])').test(explained), `${glKey} should explain \\${g}, which appears in ${texKey}`);
    }
    // prose uses TeX for Greek letters
    const prose = [c.description, c.explorerIntro, c.parameterization, ...c.glossary.map(g => g.meaning), ...c.cdfGlossary.map(g => g.meaning),
      ...c.properties.map(p => p.explain), ...c.limits.map(l => l.text), ...Object.values(c.uses).flat()].flat().filter(Boolean);
    for (const t of prose) {
      const m = proseOnly(t).match(ASCII_GREEK);
      assert.ok(!m, `write Greek letters in TeX ($\\${m && m[1]}$), not as the word "${m && m[1]}": ${String(t).slice(0, 90)}`);
    }
    // balanced $...$ in rich text
    const rich = [c.description, c.explorerIntro, ...c.glossary.map(g => g.meaning), ...c.cdfGlossary.map(g => g.meaning), ...c.properties.map(p => p.explain),
      ...c.limits.map(l => l.text), ...Object.values(c.uses).flat()].flat().filter(Boolean);
    for (const t of rich) {
      const n = (String(t).replace(/\\\$/g, '').match(/\$/g) || []).length;
      assert.equal(n % 2, 0, `unbalanced $ in: ${String(t).slice(0, 80)}`);
    }
  });

  if (mod.kind === 'continuous') {
    for (const p of paramSets(mod)) {
      const tag = JSON.stringify(p);
      test(`${id}: continuous numerics at ${tag}`, () => {
        const [lo, hi] = mod.range(p);
        const [a, b] = mod.support(p);
        const st = mod.stats(p);
        // break points (plotting window, mean, median, mode) so that narrow peaks are found on infinite ranges
        const pts = [a, b, st.mean, st.median, st.mode, (a + b) / 2];
        const total = M.integrate(x => mod.pdf(x, p), lo, hi, { tol: 1e-12, points: pts });
        close(total, 1, 1e-6, 'pdf integrates to 1');
        assert.ok(Number.isFinite(a) && Number.isFinite(b) && b > a, 'support() must be a finite window');
        // cdf matches the integral of the pdf, and is monotone in [0, 1]
        let prev = -Infinity;
        for (let i = 0; i <= 40; i++) {
          const x = a + (b - a) * i / 40;
          const F = mod.cdf(x, p);
          assert.ok(F >= -1e-12 && F <= 1 + 1e-12, `cdf(${x}) = ${F} outside [0,1]`);
          assert.ok(F >= prev - 1e-12, `cdf not monotone at ${x}`);
          prev = F;
          if (i % 5 === 0) {
            const I = M.integrate(t => mod.pdf(t, p), lo, x, { tol: 1e-12, points: pts });
            close(F, I, 1e-6, `cdf(${x}) vs integral of pdf`);
          }
        }
        if (Number.isFinite(lo)) close(mod.cdf(lo, p), 0, 1e-9, 'cdf at lower end of support');
        else close(mod.cdf(-1e12, p), 0, 1e-6, 'cdf(-inf)');
        if (Number.isFinite(hi)) close(mod.cdf(hi, p), 1, 1e-9, 'cdf at upper end of support');
        else close(mod.cdf(1e12, p), 1, 1e-6, 'cdf(+inf)');
        // moments
        if (Number.isFinite(st.mean)) {
          const m = M.integrate(x => x * mod.pdf(x, p), lo, hi, { tol: 1e-12, points: pts });
          close(m, st.mean, 1e-5 * Math.max(1, Math.abs(st.mean)), 'mean');
          if (Number.isFinite(st.variance)) {
            const v = M.integrate(x => (x - st.mean) ** 2 * mod.pdf(x, p), lo, hi, { tol: 1e-12, points: pts });
            close(v, st.variance, 1e-5 * Math.max(1, st.variance), 'variance');
          }
        }
        if (st.sd !== undefined && Number.isFinite(st.variance)) close(st.sd, Math.sqrt(st.variance), 1e-9, 'sd = sqrt(variance)');
        for (const k of ['mean', 'variance', 'sd', 'median', 'mode', 'skewness', 'exKurtosis', 'entropy']) {
          assert.ok(typeof st[k] === 'number', `stats().${k} must be a number (use NaN if undefined, Infinity if infinite)`);
        }
        if (Number.isFinite(st.mean) && Number.isFinite(st.variance) && st.variance > 0) {
          const mo = contMoments(x => mod.pdf(x, p), lo, hi, st.mean, pts);
          if (Number.isFinite(st.skewness)) close(mo.skewness, st.skewness, 1e-4 * Math.max(1, Math.abs(st.skewness)), 'skewness');
          if (Number.isFinite(st.exKurtosis)) close(mo.exKurtosis, st.exKurtosis, 1e-3 * Math.max(1, Math.abs(st.exKurtosis)), 'excess kurtosis');
        }
        if (Number.isFinite(st.entropy)) {
          const H = M.integrate(x => { const f = mod.pdf(x, p); return f > 0 ? -f * Math.log(f) : 0; }, lo, hi, { tol: 1e-12, points: pts });
          close(H, st.entropy, 1e-5 * Math.max(1, Math.abs(st.entropy)), 'entropy (nats)');
        }
        if (Number.isFinite(st.mode)) {
          // the mode is a highest point of the density (allow ties for flat densities)
          const d = 1e-3 * (b - a), f0 = mod.pdf(st.mode, p);
          for (const x of [st.mode - d, st.mode + d, a + 0.3 * (b - a), a + 0.7 * (b - a)]) {
            if (x <= lo || x >= hi) continue;
            assert.ok(mod.pdf(x, p) <= f0 * (1 + 1e-9) + 1e-12, `pdf(${x}) is larger than pdf(mode = ${st.mode})`);
          }
        }
        if (Number.isFinite(st.median)) close(mod.cdf(st.median, p), 0.5, 1e-7, 'cdf(median) = 0.5');
        // quantile inverts cdf
        if (mod.quantile) {
          for (const u of [0.001, 0.05, 0.25, 0.5, 0.75, 0.95, 0.999]) {
            const x = mod.quantile(u, p);
            close(mod.cdf(x, p), u, 1e-8, `cdf(quantile(${u}))`);
          }
        }
        if (mod.sf) for (const x of [a, (a + b) / 2, b]) close(mod.sf(x, p), 1 - mod.cdf(x, p), 1e-10, 'sf = 1 - cdf');
        if (mod.sample) {
          const rng = M.makeRng(7);
          const xs = rng.many(4000, () => mod.sample(rng, p));
          assert.ok(xs.every(Number.isFinite), 'samples finite');
          if (Number.isFinite(st.median)) {
            const frac = xs.filter(x => x <= st.median).length / xs.length;
            assert.ok(Math.abs(frac - 0.5) < 0.04, `half of the samples should fall below the median (got ${frac})`);
          }
        }
      });
    }
  }

  if (mod.kind === 'discrete') {
    for (const p of paramSets(mod)) {
      const tag = JSON.stringify(p);
      test(`${id}: discrete numerics at ${tag}`, () => {
        const [lo, hi] = mod.range(p);
        assert.ok(Number.isFinite(lo), 'discrete range must have a finite lower end');
        let sum = 0, m1 = 0, k = lo, prevF = -Infinity;
        const maxK = Number.isFinite(hi) ? hi : lo + 1e6;
        for (; k <= maxK; k++) {
          const pk = mod.pdf(k, p);
          assert.ok(pk >= 0 && pk <= 1 + 1e-12, `pmf(${k}) = ${pk}`);
          sum += pk; m1 += k * pk;
          const F = mod.cdf(k, p);
          close(F, sum, 1e-8, `cdf(${k}) vs cumulative pmf`);
          assert.ok(F >= prevF - 1e-12, `cdf not monotone at ${k}`);
          prevF = F;
          if (!Number.isFinite(hi) && sum > 1 - 1e-13 && k > lo + 5) break;
        }
        close(sum, 1, 1e-8, 'pmf sums to 1');
        close(mod.cdf(lo - 1, p), 0, 1e-12, 'cdf below support');
        const st = mod.stats(p);
        if (Number.isFinite(st.mean)) {
          close(m1, st.mean, 1e-6 * Math.max(1, Math.abs(st.mean)), 'mean');
          if (Number.isFinite(st.variance)) {
            let v = 0;
            for (let j = lo; j <= k; j++) v += (j - st.mean) ** 2 * mod.pdf(j, p);
            close(v, st.variance, 1e-6 * Math.max(1, st.variance), 'variance');
          }
        }
        for (const key of ['mean', 'variance', 'sd', 'median', 'mode', 'skewness', 'exKurtosis', 'entropy']) {
          assert.ok(typeof st[key] === 'number', `stats().${key} must be a number (use NaN if undefined, Infinity if infinite)`);
        }
        if (Number.isFinite(st.mean) && Number.isFinite(st.variance) && st.variance > 0) {
          let m3 = 0, m4 = 0, H = 0;
          for (let j = lo; j <= k; j++) { const q = mod.pdf(j, p); m3 += (j - st.mean) ** 3 * q; m4 += (j - st.mean) ** 4 * q; if (q > 0) H -= q * Math.log(q); }
          if (Number.isFinite(st.skewness)) close(m3 / st.variance ** 1.5, st.skewness, 1e-5 * Math.max(1, Math.abs(st.skewness)), 'skewness');
          if (Number.isFinite(st.exKurtosis)) close(m4 / st.variance ** 2 - 3, st.exKurtosis, 1e-4 * Math.max(1, Math.abs(st.exKurtosis)), 'excess kurtosis');
          if (Number.isFinite(st.entropy)) close(H, st.entropy, 1e-6 * Math.max(1, Math.abs(st.entropy)), 'entropy (nats)');
        }
        if (Number.isFinite(st.median)) {
          assert.ok(mod.cdf(st.median, p) >= 0.5 - 1e-10 && mod.cdf(st.median - 1, p) <= 0.5 + 1e-10, `median ${st.median}: need F(m) >= 1/2 and F(m - 1) <= 1/2`);
        }
        if (Number.isFinite(st.mode)) {
          const f0 = mod.pdf(st.mode, p);
          assert.ok(f0 >= mod.pdf(st.mode - 1, p) - 1e-12 && f0 >= mod.pdf(st.mode + 1, p) - 1e-12, `mode ${st.mode} is not a highest point of the pmf`);
        }
        // non-integer x: the pmf is 0 and the cdf is a step function
        close(mod.cdf(lo + 0.5, p), mod.cdf(lo, p), 1e-12, 'cdf is right-continuous step');
        if (mod.quantile) {
          for (const u of [0.01, 0.2, 0.5, 0.8, 0.99]) {
            const q = mod.quantile(u, p);
            assert.ok(mod.cdf(q, p) >= u - 1e-10 && (q === lo || mod.cdf(q - 1, p) < u + 1e-10), `quantile(${u}) = ${q}`);
          }
        }
        const [a, b] = mod.support(p);
        assert.ok(Number.isFinite(a) && Number.isFinite(b) && b >= a, 'support() must be a finite window');
      });
    }
  }

  if (mod.kind.startsWith('multivariate') && typeof mod.checks === 'function') {
    for (const p of paramSets(mod)) {
      test(`${id}: multivariate numerics at ${JSON.stringify(p)}`, () => {
        const res = mod.checks(p, M);
        assert.ok(Array.isArray(res) && res.length >= 2, 'checks() should return at least two checks (normalization and the mean)');
        for (const r of res) close(r.got, r.expected, r.tol ?? 1e-6, r.name);
      });
    }
  }
}
