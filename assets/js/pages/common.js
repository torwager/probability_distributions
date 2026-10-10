// Shared helpers for the list pages (index placeholder, distributions, relationships).

import { h } from '../core/ui.js';
import { loadDist } from '../core/ctx.js';

const KIND_SHORT = { discrete: 'Discrete', continuous: 'Continuous', 'multivariate-discrete': 'Multivariate, discrete', 'multivariate-continuous': 'Multivariate, continuous' };

/** A tile linking to a distribution page, with a small sketch of the density when its module exists. */
export function distTile(d) {
  const spark = h('div', { class: 'spark-holder', 'aria-hidden': 'true' });
  const tile = h('a', { class: 'tile', href: `distribution.html?d=${d.id}` },
    h('div', { class: 'tile-top' }, h('h3', {}, d.name), h('span', { class: 'badge' }, KIND_SHORT[d.kind] || d.kind)),
    spark,
    h('p', {}, d.blurb));
  loadDist(d.id).then(mod => { if (mod) drawSpark(spark, mod); }).catch(() => {});
  return tile;
}

/** Draw a small sketch of a module's PDF/PMF at its default parameters into `holder`. */
export function drawSpark(holder, mod) {
  if (mod.kind !== 'continuous' && mod.kind !== 'discrete') return;
  const p = {};
  for (const prm of mod.params) p[prm.key] = prm.default;
  const P = mod.normalize ? mod.normalize(p, null) || p : p;
  const [lo, hi] = mod.support(P);
  const W = 240, H = 56, pad = 3;
  const pts = [];
  if (mod.kind === 'discrete') { for (let k = Math.ceil(lo); k <= hi; k++) pts.push([k, mod.pdf(k, P)]); }
  else for (let i = 0; i <= 120; i++) { const x = lo + (hi - lo) * i / 120; pts.push([x, mod.pdf(x, P)]); }
  const ys = pts.map(q => q[1]).filter(Number.isFinite);
  const ymax = Math.max(...ys) || 1;
  const sx = x => pad + (x - lo) / (hi - lo || 1) * (W - 2 * pad);
  const sy = y => H - pad - Math.min(1, (Number.isFinite(y) ? y : ymax) / ymax) * (H - 2 * pad);
  let svg;
  if (mod.kind === 'discrete') {
    const d = pts.map(([x, y]) => `M${sx(x).toFixed(1)},${H - pad}V${sy(y).toFixed(1)}`).join('');
    svg = `<svg class="spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><path class="c" d="${d}" style="stroke-width:3"/></svg>`;
  } else {
    const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${sx(x).toFixed(1)},${sy(y).toFixed(1)}`).join('');
    svg = `<svg class="spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><path class="f" d="${line}L${sx(hi).toFixed(1)},${H - pad}L${sx(lo).toFixed(1)},${H - pad}Z"/><path class="c" d="${line}" vector-effect="non-scaling-stroke"/></svg>`;
  }
  holder.innerHTML = svg;
}
