// The list view under the map: every distribution (grouped by family, with its relationships) and every
// relationship (grouped by kind). It serves screen-reader users and anyone who prefers a list.

import { DISTRIBUTIONS, RELATIONS, GROUP_ORDER, KIND_LABELS, getDist } from '../catalog.js';
import { h, rich, renderTex, firstSentence } from '../core/ui.js';
import { groupLabel } from '../core/layout.js';
import { KIND_ORDER, CORE_IDS, isCoreRel } from './map.js';
import { openRelationDialog } from './dialog.js';
import { swatch } from './legend.js';

const coreTag = () => h('span', { class: 'ml-core', title: 'In the Core distributions view of the map' }, 'core');

const KIND_SHORT = { discrete: 'Discrete', continuous: 'Continuous', 'multivariate-discrete': 'Multivariate, discrete', 'multivariate-continuous': 'Multivariate, continuous' };

export function buildList(section) {
  section.append(
    h('h2', { id: 'map-list-h' }, 'The map as a list'),
    h('p', { class: 'section-intro' }, 'The same content as the map: the distributions by family, and the relationships by kind. The ones marked “core” are in the Core distributions view of the map; the Full set of distributions view has them all. Each relationship can be opened as the same pop-up as on the map, or on its own page. The ',
      h('a', { href: 'distributions.html' }, 'list of distributions'), ' and the ', h('a', { href: 'relationships.html' }, 'list of relationships'), ' have more detail.'));

  const cols = h('div', { class: 'ml-cols' });
  // distributions
  const dBox = h('div', { class: 'ml-col' }, h('h3', { class: 'ml-h' }, `Distributions (${DISTRIBUTIONS.length})`));
  for (const g of GROUP_ORDER) {
    const ds = DISTRIBUTIONS.filter(d => d.group === g);
    if (!ds.length) continue;
    const ul = h('ul', { class: 'ml-dists' });
    for (const d of ds) {
      const n = RELATIONS.filter(r => r.from === d.id || r.to === d.id).length;
      ul.append(h('li', {},
        h('a', { href: `distribution.html?d=${encodeURIComponent(d.id)}` }, d.name),
        CORE_IDS.has(d.id) ? coreTag() : null,
        h('span', { class: 'ml-meta' }, ` ${KIND_SHORT[d.kind]} · ${n} relationship${n === 1 ? '' : 's'}`),
        rich('span', firstSentence(d.blurb), { class: 'ml-blurb' })));
    }
    dBox.append(h('h4', { class: 'ml-group' }, groupLabel(g)), ul);
  }
  // relationships
  const rBox = h('div', { class: 'ml-col' }, h('h3', { class: 'ml-h' }, `Relationships (${RELATIONS.length})`));
  for (const k of KIND_ORDER) {
    const rs = RELATIONS.filter(r => r.kind === k);
    if (!rs.length) continue;
    const ul = h('ul', { class: 'ml-rels' });
    for (const r of rs) {
      const lab = h('span', { class: 'ml-label' });
      renderTex(lab, r.label);
      const name = `${getDist(r.from).name} ${r.bidirectional ? '↔' : '→'} ${getDist(r.to).name}`;
      ul.append(h('li', {},
        h('a', { href: `relation.html?r=${encodeURIComponent(r.id)}` }, name), isCoreRel(r) ? coreTag() : null, ' ', lab, ' ',
        h('button', {
          type: 'button', class: 'btn link ml-open', 'aria-label': `Explain: ${name}`,
          onclick: () => openRelationDialog(r),
        }, 'Explain')));
    }
    rBox.append(h('h4', { class: 'ml-group' }, swatch(k), KIND_LABELS[k]), ul);
  }
  cols.append(dBox, rBox);
  section.append(cols);
}
