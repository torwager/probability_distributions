// Numeric and structural checks for every distribution module in assets/js/dists/.
// Run: node --test tests/   (or npm test)
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as M from '../assets/js/core/math.js';
import { getDist } from '../assets/js/catalog.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = path.join(ROOT, 'assets/js/dists');
const files = fs.readdirSync(DIR).filter(f => f.endsWith('.js')).sort();

const close = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: got ${a}, expected ${b} (tol ${tol})`);

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
        const total = M.integrate(x => mod.pdf(x, p), lo, hi, { tol: 1e-12 });
        close(total, 1, 1e-6, 'pdf integrates to 1');
        const [a, b] = mod.support(p);
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
            const I = M.integrate(t => mod.pdf(t, p), lo, x, { tol: 1e-12 });
            close(F, I, 1e-6, `cdf(${x}) vs integral of pdf`);
          }
        }
        if (Number.isFinite(lo)) close(mod.cdf(lo, p), 0, 1e-9, 'cdf at lower end of support');
        else close(mod.cdf(-1e12, p), 0, 1e-6, 'cdf(-inf)');
        if (Number.isFinite(hi)) close(mod.cdf(hi, p), 1, 1e-9, 'cdf at upper end of support');
        else close(mod.cdf(1e12, p), 1, 1e-6, 'cdf(+inf)');
        // moments
        const st = mod.stats(p);
        if (Number.isFinite(st.mean)) {
          const m = M.integrate(x => x * mod.pdf(x, p), lo, hi, { tol: 1e-12 });
          close(m, st.mean, 1e-5 * Math.max(1, Math.abs(st.mean)), 'mean');
          if (Number.isFinite(st.variance)) {
            const v = M.integrate(x => (x - st.mean) ** 2 * mod.pdf(x, p), lo, hi, { tol: 1e-12 });
            close(v, st.variance, 1e-5 * Math.max(1, st.variance), 'variance');
          }
        }
        if (st.sd !== undefined && Number.isFinite(st.variance)) close(st.sd, Math.sqrt(st.variance), 1e-9, 'sd = sqrt(variance)');
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
}
