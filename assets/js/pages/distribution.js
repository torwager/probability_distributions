// distribution.html?d=<id> — renders one distribution page from its module (assets/js/dists/<id>.js).
// Sections, in this fixed order (see ARCHITECTURE.md, "Page layout"):
//   page head (eyebrow, name, 1-3 line summary with a "More about this distribution" toggle that shows the
//   full description), formulas strip (PDF/PMF and CDF side by side, symbols behind a toggle), interactive
//   explorer (plots sized to fit a laptop screen, help text below), properties, limits and special cases,
//   uses, parameters and conventions, related distributions, references.

import { DISTRIBUTIONS, GROUP_ORDER, KIND_LABELS, getDist, relationsOf } from '../catalog.js';
import { h, rich, renderTex, tex, section, glossaryList, referenceList, createStore, fmt, firstSentence, leadSentences, disclosure, fitDisplayFormula, scrollToHash } from '../core/ui.js';
import { mountExplorer, defaultParams } from '../core/explorer.js';
import { fitToViewport } from '../core/plot.js';
import { makeCtx, loadDist } from '../core/ctx.js';
import { groupLabel } from '../core/layout.js';

const main = document.getElementById('main');
const id = new URLSearchParams(location.search).get('d');

const KIND_EYEBROW = {
  discrete: 'Discrete distribution', continuous: 'Continuous distribution',
  'multivariate-discrete': 'Multivariate discrete distribution', 'multivariate-continuous': 'Multivariate continuous distribution',
};


function unknownPage() {
  document.title = 'Distribution not found | Probability distributions';
  main.textContent = '';
  main.append(
    h('div', { class: 'page-head' },
      h('p', { class: 'eyebrow' }, 'Distributions'),
      h('h1', {}, 'Distribution not found'),
      h('p', {}, id ? `There is no distribution with the id “${id}”. These are the distributions on this site:` : 'No distribution was named in the address. These are the distributions on this site:')),
    distributionList());
}

function distributionList() {
  const wrap = h('div');
  for (const g of GROUP_ORDER) {
    const ds = DISTRIBUTIONS.filter(d => d.group === g);
    if (!ds.length) continue;
    wrap.append(h('h2', { class: 'group-title' }, groupLabel(g)));
    const ul = h('ul', { class: 'limits' });
    for (const d of ds) ul.append(h('li', {}, h('a', { href: `distribution.html?d=${d.id}` }, d.name), ' — ', d.blurb));
    wrap.append(ul);
  }
  return wrap;
}

const normText = t => String(t ?? '').replace(/\s+/g, ' ').trim();

/** The 1-3 line summary: content.summary, or the first sentence or two of the description. */
function summaryOf(mod, cat) {
  const c = mod && mod.content;
  if (c && c.summary) return c.summary;
  const desc = c && c.description;
  const first = Array.isArray(desc) ? desc[0] : desc;
  if (first) return leadSentences(first);
  return cat.blurb;
}

/**
 * The page head. The summary (1-3 lines) is shown first; "More about this distribution" expands it in place
 * to the full description: the summary is hidden while the full text is shown, so nothing is read twice.
 */
function pageHead(cat, mod, jumpItems) {
  const desc = mod && mod.content && mod.content.description;
  const summary = summaryOf(mod, cat);
  const summaryEl = rich('p', summary, { class: 'lede', 'data-role': 'summary' });
  const more = disclosure({ id: 'about-more', label: 'More about this distribution', labelOpen: 'Show less', regionClass: 'head-more',
    onToggle: on => { summaryEl.hidden = on; } });
  const paras = desc ? (Array.isArray(desc) ? desc : [desc]).map(String).filter(t => normText(t)) : [];
  if (!paras.length) paras.push(summary);
  if (!desc && cat.whyAdded) paras.push(cat.whyAdded);
  for (const p of paras) more.region.append(rich('p', p));
  more.region.append(h('div', { class: 'chips' },
    h('span', { class: 'chip steel' }, groupLabel(cat.group)),
    h('span', { class: 'chip' }, cat.onOriginalMap ? 'On the original map' : 'Added to the original map')));
  const meta = h('div', { class: 'head-meta' }, more.button);
  if (jumpItems) meta.append(jumpLinks(jumpItems));
  return h('div', { class: 'page-head page-head-compact' },
    h('p', { class: 'eyebrow' }, KIND_EYEBROW[cat.kind] || 'Distribution'),
    h('h1', { class: 'dist-title' }, displayName(cat.name)),
    summaryEl, more.region, meta);
}

/** "Normal (Gaussian)" -> "Normal distribution (Gaussian)"; "Student's t" -> "Student's t distribution". */
function displayName(name) {
  if (/distribution/i.test(name)) return name;
  const m = /^(.*?)\s*(\([^()]*\))$/.exec(name);
  return m ? `${m[1]} distribution ${m[2]}` : `${name} distribution`;
}

function jumpLinks(items) {
  return h('nav', { class: 'jump-inline', 'aria-label': 'On this page' },
    h('span', { class: 'jump-label' }, 'On this page:'),
    h('ul', {}, items.map(([href, label]) => h('li', {}, h('a', { href: '#' + href }, label)))));
}

function parameterList(params) {
  const ul = h('ul', { class: 'param-list' });
  for (const p of params) {
    if (p.hidden) continue;
    const left = h('div', {}, tex(p.sym), ' ', h('span', { class: 'pname' }, p.name));
    const right = h('div', { class: 'pmeaning' });
    right.append(rich('span', p.meaning), ' ');
    const dom = h('span', { class: 'muted small' }, ' Allowed values: ');
    dom.append(tex(p.domain));
    right.append(dom);
    ul.append(h('li', {}, left, right));
  }
  return ul;
}

function relatedSection(cat) {
  const rels = relationsOf(cat.id);
  const { section: sec, body } = section('related', 'Related distributions',
    rels.length ? 'Each item links to the related distribution and to a page that explains and demonstrates the relationship.' : '');
  if (!rels.length) { body.append(h('p', { class: 'muted' }, 'No relationships are listed for this distribution yet.')); return sec; }
  const ul = h('ul', { class: 'rel-list' });
  for (const r of rels) {
    const otherId = r.from === cat.id ? r.to : r.from;
    const other = getDist(otherId);
    // always written in the direction of the arrow on the map (from -> to); the other distribution is a link
    const arrow = r.bidirectional ? ' ↔ ' : ' → ';
    const otherLink = h('a', { href: `distribution.html?d=${otherId}` }, other ? other.name : otherId);
    const self = h('span', {}, cat.name);
    const label = h('span', { class: 'rel-label' }); renderTex(label, r.label);
    ul.append(h('li', { class: 'rel-item' },
      h('div', { class: 'rel-top' },
        h('span', { class: 'rel-name' }, ...(r.from === cat.id ? [self, arrow, otherLink] : [otherLink, arrow, self])),
        h('span', { class: 'chip' }, KIND_LABELS[r.kind] || r.kind), label),
      rich('p', firstSentence(r.plain)),
      h('a', { class: 'rel-go', href: `relation.html?r=${r.id}` }, 'Explore this relationship →')));
  }
  body.append(ul);
  return sec;
}

function propertiesSection(mod, store) {
  const { section: sec, body } = section('properties', 'Properties',
    'The value column is computed for the parameter values currently set in the explorer above and updates as you change them.');
  const tbody = h('tbody');
  const live = [];
  for (const pr of mod.content.properties || []) {
    const tdTex = h('td', { class: 'ptex' });
    if (pr.tex) renderTex(tdTex, pr.tex);
    const tdVal = h('td', { class: 'pval tnum' });
    if (pr.value) live.push([tdVal, pr.value]); else tdVal.textContent = '';
    tbody.append(h('tr', {}, rich('td', pr.name, { class: 'pname' }), tdTex, tdVal, rich('td', pr.explain || '', { class: 'pexp' })));
  }
  const table = h('table', { class: 'props' },
    h('thead', {}, h('tr', {}, h('th', { scope: 'col' }, 'Property'), h('th', { scope: 'col' }, 'Formula'), h('th', { scope: 'col' }, 'Value now'), h('th', { scope: 'col' }, 'What it means'))),
    tbody);
  body.append(h('div', { class: 'table-wrap' }, table));
  const update = p => {
    for (const [td, fn] of live) {
      let v;
      try { v = fn(p); } catch (e) { v = NaN; }
      td.textContent = typeof v === 'string' ? v : fmt(v);
    }
  };
  update(store.get().p);
  let last = store.get().p;
  store.subscribe(s => { if (s.p !== last) { last = s.p; update(s.p); } });
  return sec;
}

/** The formulas strip under the page head: PDF/PMF and CDF side by side, the symbols behind a toggle. */
function formulasStrip(cat, mod) {
  const c = mod.content;
  const discrete = cat.kind === 'discrete' || cat.kind === 'multivariate-discrete';
  const sec = h('section', { class: 'doc-section formulas-strip', id: 'formulas', 'aria-labelledby': 'formulas-h' },
    h('h2', { id: 'formulas-h', class: 'sr-only' }, 'Formulas'));
  const pdfTitle = c.pdfTitle || (discrete ? 'Probability mass function (PMF)' : 'Probability density function (PDF)');
  const cdfTitle = c.cdfTitle || 'Cumulative distribution function (CDF)';
  const cell = (title, src, role) => {
    const f = h('div', { class: 'formula', 'data-role': role, 'data-tex': src }); renderTex(f, src, true);
    return h('div', { class: 'formula-cell' }, h('h3', { class: 'mini-title' }, title), f);
  };
  const pair = h('div', { class: 'formula-pair' }, cell(pdfTitle, c.pdfTex, 'pdf-formula'), cell(cdfTitle, c.cdfTex, 'cdf-formula'));
  const sym = disclosure({ id: 'formula-symbols', label: 'What the symbols mean', labelOpen: 'Hide the symbols', regionClass: 'symbols-region' });
  const col = (title, intro, items) => {
    const d = h('div', { class: 'symbols-col' });
    if (intro) d.append(rich('p', intro, { class: 'formula-note' }));
    d.append(glossaryList(items || [], title));
    return d;
  };
  sym.region.append(h('div', { class: 'symbols-pair' },
    col(discrete ? 'Symbols in the PMF' : 'Symbols in the density', c.pdfIntro, c.glossary),
    col('Symbols in the CDF', c.cdfIntro, c.cdfGlossary)));
  sec.append(pair, h('div', { class: 'formula-tools' }, sym.button), sym.region);
  const fit = () => sec.querySelectorAll('.formula-pair .formula').forEach(f => fitDisplayFormula(f));
  requestAnimationFrame(fit);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
  let t = 0;
  window.addEventListener('resize', () => { clearTimeout(t); t = setTimeout(fit, 120); });
  return sec;
}

/** Parameters, the parameterization used on this site, and any further formulas. */
function parametersSection(cat, mod) {
  const c = mod.content;
  const { section: sec, body } = section('parameters', 'Parameters and conventions');
  body.append(parameterList(mod.params));
  const conv = c.parameterization || cat.parameterization;
  if (conv) body.append(h('div', { class: 'callout steel', style: 'margin-top:1rem' }, h('p', {}, h('b', {}, 'Parameterization used on this site. '), rich('span', conv))));
  if (c.extraFormulas) for (const ef of c.extraFormulas) {
    const blk = h('div', { class: 'formula-block' }, h('h3', {}, ef.title));
    if (ef.intro) blk.append(rich('p', ef.intro));
    const f = h('div', { class: 'formula' }); renderTex(f, ef.tex, true);
    blk.append(f);
    if (ef.glossary) blk.append(glossaryList(ef.glossary));
    body.append(blk);
  }
  return sec;
}

function limitsSection(mod) {
  const { section: sec, body } = section('limits', 'Limits and special cases');
  const ul = h('ul', { class: 'limits' });
  for (const L of mod.content.limits || []) {
    const li = rich('li', L.text);
    const links = [];
    if (L.relation) links.push(h('a', { href: `relation.html?r=${L.relation}` }, 'Explore the relationship'));
    if (L.to && getDist(L.to)) links.push(h('a', { href: `distribution.html?d=${L.to}` }, `Go to ${getDist(L.to).name}`));
    if (links.length) { li.append(' '); links.forEach((a, i) => { if (i) li.append(' · '); li.append(a); }); }
    ul.append(li);
  }
  body.append(ul);
  return sec;
}

function usesSection(mod) {
  const u = mod.content.uses || {};
  const { section: sec, body } = section('uses', 'Uses');
  const groups = [
    ['frequentist', 'Frequentist statistics'], ['bayesian', 'Bayesian statistics'], ['modeling', 'Computational modeling and other applications'],
  ];
  for (const [k, title] of groups) {
    if (!u[k] || !u[k].length) continue;
    body.append(h('h3', {}, title));
    body.append(h('ul', { class: 'uses-list' }, u[k].map(t => rich('li', t))));
  }
  return sec;
}

function referencesSection(mod) {
  const { section: sec, body } = section('references', 'References');
  body.append(referenceList(mod.content.references));
  return sec;
}

function fallbackPage(cat) {
  // The catalog knows this distribution but its module has not been written yet.
  main.append(pageHead(cat, null, null));
  main.append(h('div', { class: 'callout' }, h('p', {}, 'The interactive page for this distribution is still being written. The parameters and relationships below come from the site catalog.')));
  const { section: sec, body } = section('parameters', 'Parameters');
  body.append(parameterList(cat.params));
  body.append(h('div', { class: 'callout steel', style: 'margin-top:1rem' }, h('p', {}, h('b', {}, 'Parameterization. '), rich('span', cat.parameterization))));
  const sup = h('p', {}, 'Support (the values the variable can take): '); sup.append(tex(cat.support));
  body.append(sup);
  main.append(sec, relatedSection(cat));
}

async function run() {
  const cat = id && getDist(id);
  if (!cat) { unknownPage(); return; }
  document.title = `${cat.name} | Probability distributions`;
  const meta = document.querySelector('meta[name="description"]');
  if (meta) meta.setAttribute('content', `${cat.name}: ${cat.blurb}`);

  let mod = null;
  try { mod = await loadDist(id); }
  catch (err) {
    console.error(err);
    main.textContent = '';
    main.append(h('div', { class: 'empty' }, `The page for ${cat.name} could not be loaded. ${err.message}`));
    return;
  }
  main.textContent = '';
  if (!mod) { fallbackPage(cat); return; }

  const store = createStore({ p: defaultParams(mod), area: { on: false, mode: 'left', a: 0, b: 1 } });
  main.append(pageHead(cat, mod, [['properties', 'Properties'], ['limits', 'Limits'], ['uses', 'Uses'], ['parameters', 'Parameters'], ['related', 'Related'], ['references', 'References']]));
  main.append(formulasStrip(cat, mod));

  // the explorer comes right after the formulas; its help text goes below it, so the plots stay near the top
  const exSec = h('section', { class: 'doc-section explorer-section', id: 'explorer', 'aria-labelledby': 'explorer-h' },
    h('h2', { id: 'explorer-h', class: 'sr-only' }, 'Interactive explorer'));
  const exBody = h('div', { class: 'section-body' });
  exSec.append(exBody);
  main.append(exSec);
  const ctx = makeCtx({ store, dist: mod, catalogEntry: cat });
  if (mod.customExplorer) await mod.customExplorer(exBody, ctx);
  else mountExplorer(exBody, mod, { store });
  // size the plots so that they fit on the screen under the head and the formulas
  fitToViewport(exSec, { ignore: ['#about-more', '#formula-symbols'] });
  if (mod.content.explorerIntro) {
    exSec.append(h('div', { class: 'explorer-help' },
      h('h3', { class: 'mini-title' }, 'How to use the explorer'),
      rich('p', mod.content.explorerIntro)));
  }

  main.append(propertiesSection(mod, store), limitsSection(mod), usesSection(mod), parametersSection(cat, mod), relatedSection(cat), referencesSection(mod));
  scrollToHash();
}

run().catch(err => {
  console.error(err);
  main.append(h('div', { class: 'empty' }, 'Something went wrong while building this page: ' + err.message));
});
