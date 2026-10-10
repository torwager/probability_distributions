// distribution.html?d=<id> — renders one distribution page from its module (assets/js/dists/<id>.js).
// Sections, in this fixed order: page head, interactive explorer, formulas, properties,
// limits and special cases, uses, related distributions, references.

import { DISTRIBUTIONS, GROUP_ORDER, KIND_LABELS, getDist, relationsOf } from '../catalog.js';
import { h, rich, renderRich, renderTex, tex, section, glossaryList, referenceList, createStore, fmt, firstSentence } from '../core/ui.js';
import { mountExplorer, defaultParams } from '../core/explorer.js';
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

function pageHead(cat, mod) {
  const desc = mod && mod.content && mod.content.description;
  const head = h('div', { class: 'page-head' },
    h('p', { class: 'eyebrow' }, KIND_EYEBROW[cat.kind] || 'Distribution'),
    h('h1', {}, cat.name + (/(distribution|\))$/i.test(cat.name) ? '' : ' distribution')));
  if (desc) {
    const paras = Array.isArray(desc) ? desc : [desc];
    for (const p of paras) head.append(rich('p', p));
  } else {
    head.append(h('p', {}, cat.blurb));
    if (cat.whyAdded) head.append(rich('p', cat.whyAdded));
  }
  head.append(h('div', { class: 'chips' },
    h('span', { class: 'chip steel' }, groupLabel(cat.group)),
    h('span', { class: 'chip' }, cat.onOriginalMap ? 'On the original map' : 'Added to the original map')));
  return head;
}

function jumpLinks(items) {
  return h('ul', { class: 'jump', 'aria-label': 'On this page' }, items.map(([href, label]) => h('li', {}, h('a', { href: '#' + href }, label))));
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

function formulasSection(cat, mod) {
  const c = mod.content;
  const discrete = cat.kind === 'discrete' || cat.kind === 'multivariate-discrete';
  const { section: sec, body } = section('formulas', 'Formulas');
  body.append(h('h3', {}, 'Parameters'));
  body.append(parameterList(mod.params));
  const conv = c.parameterization || cat.parameterization;
  if (conv) body.append(h('div', { class: 'callout steel', style: 'margin-top:1rem' }, h('p', {}, h('b', {}, 'Parameterization used on this site. '), rich('span', conv))));

  const pdfBlock = h('div', { class: 'formula-block' },
    h('h3', {}, c.pdfTitle || (discrete ? 'Probability mass function (PMF)' : 'Probability density function (PDF)')));
  if (c.pdfIntro) pdfBlock.append(rich('p', c.pdfIntro));
  const pdfF = h('div', { class: 'formula' }); renderTex(pdfF, c.pdfTex, true);
  pdfBlock.append(pdfF, glossaryList(c.glossary));
  const cdfBlock = h('div', { class: 'formula-block' }, h('h3', {}, c.cdfTitle || 'Cumulative distribution function (CDF)'));
  if (c.cdfIntro) cdfBlock.append(rich('p', c.cdfIntro));
  const cdfF = h('div', { class: 'formula' }); renderTex(cdfF, c.cdfTex, true);
  cdfBlock.append(cdfF, glossaryList(c.cdfGlossary || []));
  body.append(pdfBlock, cdfBlock);
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
  main.append(pageHead(cat, null));
  main.append(h('div', { class: 'callout' }, h('p', {}, 'The interactive page for this distribution is still being written. The parameters and relationships below come from the site catalog.')));
  const { section: sec, body } = section('formulas', 'Parameters');
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
  const head = pageHead(cat, mod);
  head.append(jumpLinks([['explorer', 'Explorer'], ['formulas', 'Formulas'], ['properties', 'Properties'], ['limits', 'Limits'], ['uses', 'Uses'], ['related', 'Related'], ['references', 'References']]));
  main.append(head);

  const { section: exSec, body: exBody } = section('explorer', 'Interactive explorer', mod.content.explorerIntro || null);
  main.append(exSec);
  const ctx = makeCtx({ store, dist: mod, catalogEntry: cat });
  if (mod.customExplorer) await mod.customExplorer(exBody, ctx);
  else mountExplorer(exBody, mod, { store });

  main.append(formulasSection(cat, mod), propertiesSection(mod, store), limitsSection(mod), usesSection(mod), relatedSection(cat), referencesSection(mod));
  if (location.hash) { const t = document.getElementById(location.hash.slice(1)); if (t) t.scrollIntoView(); }
}

run().catch(err => {
  console.error(err);
  main.append(h('div', { class: 'empty' }, 'Something went wrong while building this page: ' + err.message));
});
