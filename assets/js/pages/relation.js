// relation.html?r=<id> — renders one relationship page from its module (assets/js/relations/<id>.js),
// or from the catalog entry when the module has not been written yet.

import { RELATIONS, KIND_LABELS, EDGE_KINDS, getDist, getRelation, notationFor } from '../catalog.js';
import { h, rich, renderTex, renderTexLines, tex, section, glossaryList, referenceList } from '../core/ui.js';
import { makeCtx, loadRelation } from '../core/ctx.js';

const main = document.getElementById('main');
const id = new URLSearchParams(location.search).get('r');

function distLink(did) {
  const d = getDist(did);
  return h('a', { href: `distribution.html?d=${did}` }, d ? d.name : did);
}

function unknownPage() {
  document.title = 'Relationship not found | Probability distributions';
  main.textContent = '';
  main.append(h('div', { class: 'page-head' },
    h('p', { class: 'eyebrow' }, 'Relationships'),
    h('h1', {}, 'Relationship not found'),
    h('p', {}, id ? `There is no relationship with the id “${id}”.` : 'No relationship was named in the address.', ' ',
      h('a', { href: 'relationships.html' }, 'See the list of all relationships.'))));
}

function distCard(did) {
  const d = getDist(did);
  if (!d) return h('div');
  const params = h('p', { class: 'small muted' }, 'Parameters: ');
  d.params.forEach((p, i) => { if (i) params.append(', '); params.append(tex(p.sym), ` (${p.name})`); });
  return h('div', { class: 'dist-card' },
    h('h3', {}, h('a', { href: `distribution.html?d=${did}` }, d.name)),
    h('p', {}, d.blurb), params);
}

async function run() {
  const rel = id && getRelation(id);
  if (!rel) { unknownPage(); return; }
  const from = getDist(rel.from), to = getDist(rel.to);
  let mod = null;
  try { mod = await loadRelation(id); } catch (err) { console.error(err); }
  const title = (mod && mod.title) || `${from.name} ${rel.bidirectional ? '↔' : '→'} ${to.name}`;
  document.title = `${title} | Probability distributions`;
  const meta = document.querySelector('meta[name="description"]');
  if (meta) meta.setAttribute('content', `How the ${from.name} and ${to.name} distributions are related.`);
  main.textContent = '';

  const flow = h('h1', { class: 'rel-head-flow' }, distLink(rel.from), h('span', { class: 'arrow', 'aria-label': rel.bidirectional ? 'and' : 'to' }, rel.bidirectional ? '↔' : '→'), distLink(rel.to));
  const labelChip = h('span', { class: 'chip amber' }); renderTex(labelChip, rel.label);
  const head = h('div', { class: 'page-head' },
    h('p', { class: 'eyebrow' }, `Relationship · ${KIND_LABELS[rel.kind] || rel.kind}`),
    flow,
    mod && mod.title ? h('p', { class: 'small muted' }, mod.title) : null,
    h('div', { class: 'chips' }, h('span', { class: 'chip steel' }, KIND_LABELS[rel.kind] || rel.kind), labelChip,
      rel.onOriginalMap ? h('span', { class: 'chip' }, 'On the original map') : null));
  main.append(head);

  // plain explanation
  const { section: s1, body: b1 } = section('explanation', 'In plain language');
  const plain = (mod && mod.plain) || rel.plain;
  for (const para of (Array.isArray(plain) ? plain : [plain])) b1.append(rich('p', para));
  if (EDGE_KINDS[rel.kind]) b1.append(h('p', { class: 'small muted' }, `On the map, this is drawn as a “${(KIND_LABELS[rel.kind] || rel.kind).toLowerCase()}” arrow: ${EDGE_KINDS[rel.kind]}.`));
  main.append(s1);

  // formal statement + glossary
  const { section: s2, body: b2 } = section('statement', 'Formal statement');
  const f = h('div', { class: 'formula' });
  renderTexLines(f, (mod && mod.statementTex) || rel.statement);
  b2.append(f);
  const gl = (mod && mod.glossary) || notationFor(rel.statement).map(e => ({ sym: e.sym, meaning: e.plain }));
  if (gl.length) b2.append(glossaryList(gl));
  main.append(s2);

  // demo
  const { section: s3, body: b3 } = section('demo', 'Interactive demonstration');
  if (mod && mod.demo) {
    const box = h('div', { class: 'demo' });
    b3.append(box);
    try { await mod.demo(box, makeCtx({ relation: rel, from, to })); }
    catch (err) { console.error(err); box.textContent = 'The demonstration could not be started: ' + err.message; }
  } else {
    b3.append(h('div', { class: 'callout' }, h('p', {}, 'An interactive demonstration for this relationship is still being written. Meanwhile you can explore each distribution on its own page.')));
  }
  main.append(s3);

  // why
  if (mod && mod.why) {
    const { section: s4, body: b4 } = section('why', 'Why this is true');
    for (const para of (Array.isArray(mod.why) ? mod.why : [mod.why])) {
      if (typeof para === 'object' && para.tex) { const fx = h('div', { class: 'formula' }); renderTex(fx, para.tex, true); b4.append(fx); }
      else b4.append(rich('p', para));
    }
    main.append(s4);
  }

  // the two distributions
  const { section: s5, body: b5 } = section('distributions', 'The distributions involved');
  b5.append(h('div', { class: 'dist-cards' }, distCard(rel.from), distCard(rel.to)));
  main.append(s5);

  // references
  const refs = (mod && mod.references) || [
    { text: 'Leemis, L. M., & McQueston, J. T. (2008). Univariate distribution relationships. <i>The American Statistician</i>, 62(1), 45–53.', url: 'https://doi.org/10.1198/000313008X270448' },
    { text: `Wikipedia: ${from.name}.`, url: `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(from.name + ' distribution')}` },
    { text: `Wikipedia: ${to.name}.`, url: `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(to.name + ' distribution')}` },
  ];
  const { section: s6, body: b6 } = section('references', 'References');
  b6.append(referenceList(refs));
  main.append(s6);

  // neighbours in the list
  const i = RELATIONS.findIndex(r => r.id === id);
  const prev = RELATIONS[(i - 1 + RELATIONS.length) % RELATIONS.length], next = RELATIONS[(i + 1) % RELATIONS.length];
  const nameOf = r => `${getDist(r.from).name} ${r.bidirectional ? '↔' : '→'} ${getDist(r.to).name}`;
  main.append(h('p', { class: 'small', style: 'margin-top:2.4rem' },
    h('a', { href: `relation.html?r=${prev.id}` }, '← ' + nameOf(prev)), ' · ',
    h('a', { href: 'relationships.html' }, 'All relationships'), ' · ',
    h('a', { href: `relation.html?r=${next.id}` }, nameOf(next) + ' →')));
}

run().catch(err => {
  console.error(err);
  main.append(h('div', { class: 'empty' }, 'Something went wrong while building this page: ' + err.message));
});
