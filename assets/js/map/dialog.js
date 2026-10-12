// The pop-up that explains one relationship (opened from an arrow or its label on the map, and from the
// list view). It uses the relation module when it exists, otherwise the catalog text.

import { getDist, KIND_LABELS, EDGE_KINDS, notationFor } from '../catalog.js';
import { h, rich, renderTex, renderTexLines, glossaryList, openModal } from '../core/ui.js';
import { loadRelation, hasRelation } from '../core/ctx.js';

/** Tokens of a TeX string: control words and single letters outside \text{...}. */
function texTokens(src) {
  const s = String(src).replace(/\\(?:text|mathrm|operatorname)\{[^}]*\}/g, ' ');
  const out = new Set();
  const re = /\\([a-zA-Z]+)|([a-zA-Z])/g;
  let m;
  while ((m = re.exec(s))) out.add(m[1] ? '\\' + m[1] : m[2]);
  return out;
}

/**
 * Glossary when no relation module exists: the parameters of the two distributions whose symbols
 * occur in the statement, then the site-wide notation entries used in it.
 */
export function fallbackGlossary(rel) {
  const toks = texTokens(rel.statement);
  const items = [];
  const seen = new Set();
  for (const did of [rel.from, rel.to]) {
    const d = getDist(did);
    for (const p of d ? d.params : []) {
      const head = p.sym.replace(/_.*$/, '').replace(/[{}]/g, '').trim();
      if (!toks.has(head) || seen.has(p.sym)) continue;
      seen.add(p.sym);
      items.push({ sym: p.sym, meaning: `<i>${d.name}, ${p.name}.</i> ${p.meaning}` });
    }
  }
  for (const e of notationFor(rel.statement)) items.push({ sym: e.sym, meaning: e.plain });
  return items;
}

/** The line style of a kind of arrow in words ("dashed "), from the first part of the catalog description. */
function lineStyle(kind) {
  if (kind === 'conjugate-prior') return 'purple dash-dot ';
  const m = /^([a-z -]+);/.exec(EDGE_KINDS[kind] || '');
  return m ? m[1] + ' ' : '';
}

const arrowOf = rel => (rel.bidirectional ? '↔' : '→');
export const relTitle = rel => `${getDist(rel.from).name} ${arrowOf(rel)} ${getDist(rel.to).name}`;

/** Open the relationship dialog. Returns a promise of the close function. */
export async function openRelationDialog(rel) {
  let mod = null;
  if (hasRelation(rel.id)) {
    try { mod = await loadRelation(rel.id); } catch (err) { console.warn('Relation module failed to load', rel.id, err); }
  }
  const from = getDist(rel.from), to = getDist(rel.to);
  const body = h('div', { class: 'rel-dialog' });

  const label = h('span', { class: 'chip amber rd-label' });
  renderTex(label, rel.label);
  body.append(h('div', { class: 'chips rd-chips' },
    h('span', { class: `chip steel rd-kind k-${rel.kind}` }, KIND_LABELS[rel.kind] || rel.kind),
    label,
    rel.bidirectional ? h('span', { class: 'chip' }, 'Two-way') : null,
    (getDist(rel.from).onOriginalMap && getDist(rel.to).onOriginalMap) ? h('span', { class: 'chip' }, 'In the core map') : null));

  if (mod && mod.title) body.append(h('p', { class: 'rd-sub' }, mod.title));
  const plain = (mod && mod.plain) || rel.plain;
  for (const para of (Array.isArray(plain) ? plain : [plain])) body.append(rich('p', para));

  body.append(h('h3', { class: 'rd-h' }, 'Formal statement'));
  const f = h('div', { class: 'formula' });
  renderTexLines(f, (mod && mod.statementTex) || rel.statement);
  body.append(f);

  const gl = (mod && Array.isArray(mod.glossary) && mod.glossary.length) ? mod.glossary : fallbackGlossary(rel);
  if (gl.length) body.append(glossaryList(gl));

  if (EDGE_KINDS[rel.kind]) {
    body.append(h('p', { class: 'small muted rd-style' },
      `On the map this is a ${lineStyle(rel.kind)}“${(KIND_LABELS[rel.kind] || rel.kind).toLowerCase()}” arrow. `,
      rel.bidirectional ? 'It has a head at each end because the relationship can be read in both directions.' : `It points from ${from.name} to ${to.name}.`));
  }

  const explore = h('a', { class: 'btn primary', href: `relation.html?r=${encodeURIComponent(rel.id)}` }, 'Explore this relationship', h('span', { 'aria-hidden': 'true' }, ' →'));
  const footer = h('div', { class: 'rd-foot' },
    explore,
    h('span', { class: 'rd-links' },
      h('a', { class: 'btn small-btn', href: `distribution.html?d=${encodeURIComponent(rel.from)}` }, from.name),
      h('a', { class: 'btn small-btn', href: `distribution.html?d=${encodeURIComponent(rel.to)}` }, to.name)));

  // focus starts on the main link, so Enter goes straight to the interactive page
  return openModal({ title: relTitle(rel), body, footer, wide: true, initialFocus: explore });
}
