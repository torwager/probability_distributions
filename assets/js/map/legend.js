// Legend and filters: a small panel that floats in a corner of the map. Closed, it is one button
// ("Legend and filters"); open, it shows one chip per kind of arrow (each chip shows the line style and
// turns that kind on or off), a key to the tile sketches, and the family colors (pointing at a family
// highlights its distributions). Counts and families follow the view shown (core or full).

import { KIND_LABELS, GROUP_ORDER } from '../catalog.js';
import { groupLabel } from '../core/layout.js';
import { GROUP_STYLE } from './layout.js';
import { h } from '../core/ui.js';
import { KIND_ORDER } from './map.js';

const KIND_HELP = {
  'special-case': 'one distribution is a particular case of the other',
  'transformation': 'a function of a variable from the source has the target distribution',
  'sum': 'adding independent variables gives the target',
  'ratio': 'a ratio of independent variables gives the target',
  'limit': 'the source approaches the target (an approximation)',
  'mixture': 'a parameter of the source is itself random',
  'conditioning': 'the source, conditioned on an event, gives the target',
  'conjugate-prior': 'a Bayesian prior for a parameter of the target',
  'other': 'another connection; the pop-up explains it',
};

/** A short sample of the line style of a kind, as inline SVG. */
export function swatch(kind, twoWay = false) {
  const s = `<svg class="kind-swatch k-${kind}" viewBox="0 0 34 10" aria-hidden="true" focusable="false">
    <path class="e-line" d="M${twoWay ? 7 : 2},5H26"/>
    <path class="e-head" d="M33,5L25,1.2L26.8,5L25,8.8Z"/>${twoWay ? '<path class="e-head" d="M1,5L9,1.2L7.2,5L9,8.8Z"/>' : ''}</svg>`;
  const span = h('span', { class: 'swatch-wrap', html: s });
  return span;
}

function tileKey(cls, label, svg, kind) {
  return h('span', { class: 'tile-key', 'data-kind': kind }, h('span', { class: 'tk-tile ' + cls, html: svg, 'aria-hidden': 'true' }), label);
}

const STORE_KEY = 'pd-map-legend-open';
const remembered = () => { try { return localStorage.getItem(STORE_KEY) === '1'; } catch (_) { return false; } };
const remember = on => { try { localStorage.setItem(STORE_KEY, on ? '1' : '0'); } catch (_) { /* ignore */ } };

export function buildLegend(map) {
  // ---- arrows: one chip per kind
  const chips = h('div', { class: 'kind-chips', role: 'group', 'aria-labelledby': 'lg-arrows' });
  const chipEls = new Map();
  const sync = () => {
    const rels = map.views[map.view].rels;
    for (const [k, b] of chipEls) {
      const n = rels.filter(r => r.kind === k).length;
      b.setAttribute('aria-pressed', String(map.filter.kinds.has(k)));
      b.querySelector('.kc-n').textContent = String(n);
      b.hidden = !n;
    }
    allBtn.hidden = map.filter.kinds.size === KIND_ORDER.length;
    // families present in this view
    const groups = new Set(map.views[map.view].dists.map(d => d.group));
    for (const b of fams.querySelectorAll('.fam-key')) b.hidden = !groups.has(b.dataset.group);
    keys.querySelector('[data-kind="mv"]').hidden = !map.views[map.view].dists.some(d => d.kind.startsWith('multivariate'));
  };
  for (const k of KIND_ORDER) {
    const b = h('button', {
      type: 'button', class: `kind-chip k-${k}`, 'aria-pressed': 'true', 'data-kind': k,
      title: `${KIND_LABELS[k]}: ${KIND_HELP[k]}. Click to show or hide these arrows.`,
    }, swatch(k), h('span', { class: 'kc-name' }, KIND_LABELS[k]), h('span', { class: 'kc-n' }, ''));
    b.addEventListener('click', () => {
      const f = map.filter.kinds;
      // the first click on a chip while all are shown isolates that kind; later clicks toggle
      if (f.size === KIND_ORDER.length) { f.clear(); f.add(k); }
      else if (f.has(k)) { f.delete(k); if (!f.size) KIND_ORDER.forEach(x => f.add(x)); }
      else f.add(k);
      sync(); map.applyFilter();
    });
    chipEls.set(k, b);
    chips.append(b);
  }
  const allBtn = h('button', { type: 'button', class: 'kind-chip kc-all', onclick: () => { KIND_ORDER.forEach(x => map.filter.kinds.add(x)); sync(); map.applyFilter(); } }, 'Show all arrows');
  chips.append(allBtn);

  // ---- tiles
  const DISC = '<svg viewBox="0 0 30 14"><path d="M4 13V9M9 13V4M14 13V2M19 13V5M24 13V10" /></svg>';
  const CONT = '<svg viewBox="0 0 30 14"><path class="f" d="M1 13C8 13 10 2 15 2S22 13 29 13Z"/><path d="M1 13C8 13 10 2 15 2S22 13 29 13"/></svg>';
  const MV = '<svg viewBox="0 0 30 14"><ellipse cx="15" cy="7" rx="11" ry="4.6" transform="rotate(-18 15 7)"/><ellipse cx="15" cy="7" rx="5.5" ry="2.2" transform="rotate(-18 15 7)"/></svg>';
  const keys = h('div', { class: 'tile-keys' },
    tileKey('tk-d', 'discrete: bars at whole numbers', DISC),
    tileKey('tk-c', 'continuous: density curve', CONT),
    tileKey('tk-mv', 'multivariate: stacked tile', MV, 'mv'),
    h('span', { class: 'tile-key' }, swatch('special-case', true), 'two heads: works both ways'));

  // ---- families
  const fams = h('div', { class: 'fam-keys' });
  for (const g of GROUP_ORDER) {
    const b = h('button', { type: 'button', class: 'fam-key', 'data-group': g, style: `--rg:${GROUP_STYLE[g]}`, title: 'Highlight the distributions in this family' },
      h('span', { class: 'fam-dot', 'aria-hidden': 'true' }), groupLabel(g));
    b.addEventListener('mouseenter', () => map.hoverGroup(g, true));
    b.addEventListener('mouseleave', () => map.hoverGroup(g, false));
    b.addEventListener('focus', () => map.hoverGroup(g, true));
    b.addEventListener('blur', () => map.hoverGroup(g, false));
    b.addEventListener('click', () => map.hoverGroup(g, true));
    fams.append(b);
  }

  // ---- the panel
  const body = h('div', { class: 'lg-body', id: 'map-legend-body' },
    h('p', { class: 'lg-title', id: 'lg-arrows' }, 'Arrows'),
    h('p', { class: 'lg-note' }, 'Click a kind to show only those arrows; click more kinds to add them.'),
    chips,
    h('p', { class: 'lg-title' }, 'Tiles'), keys,
    h('p', { class: 'lg-title' }, 'Families'), fams);
  const toggle = h('button', { type: 'button', class: 'lg-toggle', 'aria-expanded': 'false', 'aria-controls': 'map-legend-body' },
    h('span', { class: 'lg-toggle-icon', 'aria-hidden': 'true', html: '<svg viewBox="0 0 20 20"><path d="M3 5h14M3 10h9M3 15h5"/></svg>' }),
    h('span', { class: 'lg-toggle-text' }, 'Legend and filters'),
    h('span', { class: 'lg-dot', 'aria-hidden': 'true' }));
  const panel = h('div', { class: 'map-ctl map-legend' }, toggle, body);
  const setOpen = on => {
    toggle.setAttribute('aria-expanded', String(on));
    body.hidden = !on;
    panel.classList.toggle('open', on);
  };
  toggle.addEventListener('click', () => { const on = toggle.getAttribute('aria-expanded') !== 'true'; setOpen(on); remember(on); });
  panel.addEventListener('keydown', e => { if (e.key === 'Escape' && !body.hidden) { e.stopPropagation(); setOpen(false); remember(false); toggle.focus(); } });
  setOpen(remembered());
  // the panel lives inside the map frame (so it is also there in full screen)
  map.frame.append(panel);
  map.onViewChange(sync);
  sync();
  return { panel, setOpen, sync };
}
