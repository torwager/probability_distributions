// about.html: renders the conventions, the notation glossary and the edge-kind legend from the catalog.
import { CATALOG, NOTATION, EDGE_KINDS, KIND_LABELS } from '../catalog.js';
import { h, rich, glossaryList } from '../core/ui.js';

// Conventions: an array of rich-text sentences in the catalog.
const conv = document.getElementById('conventions');
if (conv) conv.append(h('ul', {}, CATALOG.conventions.map(s => rich('li', s))));
const nota = document.getElementById('notation');
if (nota) nota.append(glossaryList(NOTATION.map(e => ({ sym: e.sym, meaning: e.plain })), 'Symbols'));
const ek = document.getElementById('edge-kinds');
if (ek) {
  const dl = h('dl', { class: 'glossary' });
  for (const [k, v] of Object.entries(EDGE_KINDS)) dl.append(h('dt', {}, h('b', {}, KIND_LABELS[k] || k)), h('dd', {}, v.charAt(0).toUpperCase() + v.slice(1) + '.'));
  ek.append(dl);
}
