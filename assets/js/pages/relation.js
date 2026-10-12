// relation.html?r=<id> — renders one relationship page from its module (assets/js/relations/<id>.js),
// or from the catalog entry when the module has not been written yet.
// Order (see ARCHITECTURE.md, "Page layout"): page head (From → To, a 1-3 line summary with a
// "More about this relationship" toggle that shows the full plain explanation), the formal statement with
// a "What the symbols mean" toggle, the interactive demonstration, why this is true, the two
// distributions, references.

import { RELATIONS, KIND_LABELS, EDGE_KINDS, getDist, getRelation, notationFor } from '../catalog.js';
import { h, rich, renderTex, renderTexLines, tex, section, glossaryList, referenceList, leadSentences, disclosure, fitTexLines, scrollToHash } from '../core/ui.js';
import { fitToViewport } from '../core/plot.js';
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
  const plain = (mod && mod.plain) || rel.plain;
  const paras = (Array.isArray(plain) ? plain : [plain]).map(String);
  const summary = (mod && mod.summary) || leadSentences(paras[0]);
  // "More about this relationship" expands the summary in place to the full explanation (the summary is
  // hidden while the full text is shown, so nothing is read twice)
  const summaryEl = rich('p', summary, { class: 'lede', 'data-role': 'summary' });
  const more = disclosure({ id: 'about-more', label: 'More about this relationship', labelOpen: 'Show less', regionClass: 'head-more',
    onToggle: on => { summaryEl.hidden = on; } });
  if (mod && mod.title) more.region.append(h('p', { class: 'rel-title' }, mod.title));
  for (const para of paras.filter(t => t.trim())) more.region.append(rich('p', para));
  if (EDGE_KINDS[rel.kind]) more.region.append(h('p', { class: 'small muted' }, `On the map, this is drawn as a “${(KIND_LABELS[rel.kind] || rel.kind).toLowerCase()}” arrow: ${EDGE_KINDS[rel.kind]}.`));
  more.region.append(h('div', { class: 'chips' }, h('span', { class: 'chip steel' }, KIND_LABELS[rel.kind] || rel.kind),
    (getDist(rel.from).onOriginalMap && getDist(rel.to).onOriginalMap) ? h('span', { class: 'chip' }, 'In the core map') : null));
  const labelChip = h('span', { class: 'chip rel-label-chip' }); renderTex(labelChip, rel.label);
  const jump = h('nav', { class: 'jump-inline', 'aria-label': 'On this page' }, h('span', { class: 'jump-label' }, 'On this page:'),
    h('ul', {}, [['demo', 'Demonstration'], ['why', 'Why this is true'], ['distributions', 'The distributions'], ['references', 'References']]
      .filter(([k]) => k !== 'why' || (mod && mod.why)).map(([k, t]) => h('li', {}, h('a', { href: '#' + k }, t)))));
  const head = h('div', { class: 'page-head page-head-compact' },
    h('p', { class: 'eyebrow' }, `Relationship · ${KIND_LABELS[rel.kind] || rel.kind}`),
    flow,
    summaryEl,
    more.region,
    h('div', { class: 'head-meta' }, more.button, labelChip, jump));
  main.append(head);

  // formal statement, symbols behind a toggle
  const s2 = h('section', { class: 'doc-section statement-strip', id: 'statement', 'aria-labelledby': 'statement-h' },
    h('h2', { id: 'statement-h', class: 'mini-title' }, 'Formal statement'));
  const f = h('div', { class: 'formula', 'data-role': 'statement' });
  renderTexLines(f, (mod && mod.statementTex) || rel.statement);
  s2.append(f);
  const gl = (mod && mod.glossary) || notationFor(rel.statement).map(e => ({ sym: e.sym, meaning: e.plain }));
  if (gl.length) {
    const sym = disclosure({ id: 'statement-symbols', label: 'What the symbols mean', labelOpen: 'Hide the symbols', regionClass: 'symbols-region' });
    sym.region.append(glossaryList(gl, 'Symbols in the statement'));
    s2.append(h('div', { class: 'formula-tools' }, sym.button), sym.region);
  }
  main.append(s2);
  const fit = () => fitTexLines(f, 0.72);
  requestAnimationFrame(fit);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
  let rt = 0;
  window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(fit, 120); });

  // demo
  const s3 = h('section', { class: 'doc-section demo-section', id: 'demo', 'aria-labelledby': 'demo-h' },
    h('h2', { id: 'demo-h', class: 'sr-only' }, 'Interactive demonstration'));
  const b3 = h('div', { class: 'section-body' });
  s3.append(b3);
  main.append(s3);
  if (mod && mod.demo) {
    const box = h('div', { class: 'demo' });
    b3.append(box);
    try { await mod.demo(box, makeCtx({ relation: rel, from, to })); }
    catch (err) { console.error(err); box.textContent = 'The demonstration could not be started: ' + err.message; }
    fitToViewport(s3, { ignore: ['#about-more', '#statement-symbols'] });
  } else {
    b3.append(h('div', { class: 'callout' }, h('p', {}, 'An interactive demonstration for this relationship is still being written. Meanwhile you can explore each distribution on its own page.')));
  }

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
  scrollToHash();
}

run().catch(err => {
  console.error(err);
  main.append(h('div', { class: 'empty' }, 'Something went wrong while building this page: ' + err.message));
});
