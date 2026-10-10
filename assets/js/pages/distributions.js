// distributions.html: every distribution on the site, grouped by family.
import { DISTRIBUTIONS, GROUP_ORDER } from '../catalog.js';
import { h } from '../core/ui.js';
import { groupLabel } from '../core/layout.js';
import { distTile } from './common.js';

const root = document.getElementById('dist-grid');
for (const g of GROUP_ORDER) {
  const ds = DISTRIBUTIONS.filter(d => d.group === g);
  if (!ds.length) continue;
  root.append(h('h2', { class: 'group-title', id: 'g-' + g.replace(/[^a-z]+/gi, '-').toLowerCase() }, groupLabel(g), h('span', { class: 'muted' }, `${ds.length} distribution${ds.length > 1 ? 's' : ''}`)));
  root.append(h('div', { class: 'tiles' }, ds.map(distTile)));
}
