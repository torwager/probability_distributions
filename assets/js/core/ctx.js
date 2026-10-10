// The context object passed to customExplorer(container, ctx) and relation demo(container, ctx).
// It bundles the core libraries so that modules do not need to know relative paths, and it
// loads other distribution or relation modules on demand.

import * as math from './math.js';
import * as plot from './plot.js';
import * as ui from './ui.js';
import * as catalog from '../catalog.js';
import { mountExplorer, defaultParams } from './explorer.js';
import * as demos from './demos.js';
import { DIST_MODULES, RELATION_MODULES } from '../modules.js';

const distCache = new Map();
const relCache = new Map();

/** Load a distribution module by catalog id. Resolves to the module's default export, or null if it is not in the manifest (assets/js/modules.js). */
export function loadDist(id) {
  if (!catalog.getDist(id)) return Promise.reject(new Error(`Unknown distribution id "${id}"`));
  if (!DIST_MODULES.includes(id)) return Promise.resolve(null);
  if (!distCache.has(id)) {
    distCache.set(id, import(`../dists/${id}.js`).then(m => m.default));
  }
  return distCache.get(id);
}

/** Load a relation module by catalog id. Resolves to the default export, or null if it does not exist yet. */
export function loadRelation(id) {
  if (!catalog.getRelation(id)) return Promise.reject(new Error(`Unknown relation id "${id}"`));
  if (!RELATION_MODULES.includes(id)) return Promise.resolve(null);
  if (!relCache.has(id)) {
    relCache.set(id, import(`../relations/${id}.js`).then(m => m.default));
  }
  return relCache.get(id);
}

/** True if a distribution module exists (is listed in the manifest). */
export const hasDist = id => DIST_MODULES.includes(id);
/** True if a relation module exists (is listed in the manifest). */
export const hasRelation = id => RELATION_MODULES.includes(id);

/** Build a ctx object. `extra` is merged in (e.g. {store, dist, relation}). */
export function makeCtx(extra = {}) {
  return { math, plot, ui, catalog, demos, loadDist, loadRelation, hasDist, hasRelation, mountExplorer, defaultParams, ...extra };
}
