// Temporary home page: a grid of all distributions. The interactive map replaces this.
import { DISTRIBUTIONS, GROUP_ORDER } from '../catalog.js';
import { h } from '../core/ui.js';
import { groupLabel } from '../core/layout.js';
import { distTile } from './common.js';

const root = document.getElementById('dist-grid');
for (const g of GROUP_ORDER) {
  const ds = DISTRIBUTIONS.filter(d => d.group === g);
  if (!ds.length) continue;
  root.append(h('h2', { class: 'group-title' }, groupLabel(g), h('span', { class: 'muted' }, `${ds.length} distribution${ds.length > 1 ? 's' : ''}`)));
  root.append(h('div', { class: 'tiles' }, ds.map(distTile)));
}
