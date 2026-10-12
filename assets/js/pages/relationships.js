// relationships.html: every relationship in the catalog, grouped by kind.
import { RELATIONS, KIND_LABELS, EDGE_KINDS, getDist } from '../catalog.js';
import { h, rich, renderTex, firstSentence } from '../core/ui.js';

const ORDER = ['special-case', 'transformation', 'sum', 'ratio', 'limit', 'mixture', 'conditioning', 'conjugate-prior', 'other'];
const INTRO = {
  'special-case': 'One distribution is a particular case of another, obtained by fixing a parameter.',
  'transformation': 'Applying a function to a random variable from one distribution gives a variable from the other.',
  'sum': 'Adding independent random variables from one distribution gives a variable from the other.',
  'ratio': 'A ratio of independent random variables from one distribution gives a variable from the other.',
  'limit': 'One distribution approaches the other as a parameter grows or shrinks, so it can serve as an approximation.',
  'mixture': 'A parameter of one distribution is itself random, and averaging over it gives the other distribution.',
  'conditioning': 'Conditioning on an observed total turns one distribution into the other.',
  'conjugate-prior': 'In Bayesian analysis, a prior from the first family combined with data from the second gives a posterior in the first family again.',
  'other': 'Other connections, explained on each page.',
};

const root = document.getElementById('rel-list');
const jump = document.getElementById('rel-jump');
for (const k of ORDER) {
  const rs = RELATIONS.filter(r => r.kind === k);
  if (!rs.length) continue;
  jump.append(h('li', {}, h('a', { href: '#k-' + k }, `${KIND_LABELS[k]} (${rs.length})`)));
  root.append(h('h2', { class: 'group-title', id: 'k-' + k }, KIND_LABELS[k], h('span', { class: 'muted' }, `${rs.length}`)));
  root.append(h('p', { class: 'section-intro' }, INTRO[k], ' ', h('span', { class: 'muted small' }, `Map style: ${EDGE_KINDS[k]}.`)));
  const ul = h('ul', { class: 'rel-list' });
  for (const r of rs) {
    const lab = h('span', { class: 'rel-label' }); renderTex(lab, r.label);
    ul.append(h('li', { class: 'rel-item' },
      h('div', { class: 'rel-top' },
        h('span', { class: 'rel-name' }, h('a', { href: `relation.html?r=${r.id}` }, `${getDist(r.from).name} ${r.bidirectional ? '↔' : '→'} ${getDist(r.to).name}`)),
        lab, (getDist(r.from).onOriginalMap && getDist(r.to).onOriginalMap) ? h('span', { class: 'chip', title: 'In the Core distributions view of the map' }, 'Core') : null),
      rich('p', firstSentence(r.plain))));
  }
  root.append(ul);
}
