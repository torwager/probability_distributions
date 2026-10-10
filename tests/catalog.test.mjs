// Checks on the catalog, the module manifest and the relation modules.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { CATALOG, DISTRIBUTIONS, RELATIONS, getDist, getRelation, EDGE_KINDS } from '../assets/js/catalog.js';
import { DIST_MODULES, RELATION_MODULES } from '../assets/js/modules.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const list = dir => fs.readdirSync(path.join(ROOT, dir)).filter(f => f.endsWith('.js')).map(f => f.slice(0, -3)).sort();

test('catalog is frozen and consistent', () => {
  assert.ok(Object.isFrozen(CATALOG) && Object.isFrozen(DISTRIBUTIONS[0].params[0]));
  const ids = new Set();
  for (const d of DISTRIBUTIONS) {
    assert.ok(!ids.has(d.id), 'duplicate id ' + d.id); ids.add(d.id);
    assert.ok(d.blurb && d.mapPos && Number.isInteger(d.mapPos.col) && Number.isInteger(d.mapPos.row), d.id);
    for (const p of d.params) assert.ok(p.key && p.label && p.min <= p.default && p.default <= p.max, `${d.id}.${p.key}`);
  }
  for (const r of RELATIONS) {
    assert.ok(getDist(r.from) && getDist(r.to), r.id);
    assert.equal(r.id, `${r.from}--${r.to}`);
    assert.ok(EDGE_KINDS[r.kind], 'edge kind ' + r.kind);
  }
});

test('module manifest (assets/js/modules.js) lists exactly the module files; run `node tools/update-manifest.mjs` if not', () => {
  assert.deepEqual([...DIST_MODULES].sort(), list('assets/js/dists'));
  assert.deepEqual([...RELATION_MODULES].sort(), list('assets/js/relations'));
});

for (const id of list('assets/js/relations')) {
  test(`relation module ${id}`, async () => {
    const mod = (await import(pathToFileURL(path.join(ROOT, 'assets/js/relations', id + '.js')).href)).default;
    const rel = getRelation(id);
    assert.ok(rel, `catalog has no relation "${id}"`);
    assert.equal(mod.id, id);
    assert.equal(mod.from, rel.from);
    assert.equal(mod.to, rel.to);
    assert.ok(getDist(mod.from) && getDist(mod.to), 'from/to exist in the catalog');
    assert.ok(mod.plain && mod.statementTex, 'plain and statementTex');
    assert.ok(Array.isArray(mod.glossary) && mod.glossary.every(g => g.sym && g.meaning), 'glossary');
    assert.ok(mod.why, 'why');
    assert.equal(typeof mod.demo, 'function', 'demo(container, ctx)');
    assert.ok(Array.isArray(mod.references) && mod.references.length, 'references');
  });
}
