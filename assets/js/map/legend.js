// Legend and filters shown above the map: one chip per kind of arrow (each chip shows the line style
// and turns that kind on or off), a switch for "original map only", and a key to the tile sketches.

import { RELATIONS, KIND_LABELS, DISTRIBUTIONS, GROUP_ORDER } from '../catalog.js';
import { groupLabel } from '../core/layout.js';
import { GROUP_STYLE } from './layout.js';
import { h, toggleSwitch } from '../core/ui.js';
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

function tileKey(cls, label, svg) {
  return h('span', { class: 'tile-key' }, h('span', { class: 'tk-tile ' + cls, html: svg, 'aria-hidden': 'true' }), label);
}

export function buildLegend(container, map) {
  const counts = Object.fromEntries(KIND_ORDER.map(k => [k, RELATIONS.filter(r => r.kind === k).length]));
  const chips = h('div', { class: 'kind-chips', role: 'group', 'aria-label': 'Show or hide arrows by kind' });
  const chipEls = new Map();
  const sync = () => {
    for (const [k, b] of chipEls) b.setAttribute('aria-pressed', String(map.filter.kinds.has(k)));
    allBtn.disabled = map.filter.kinds.size === KIND_ORDER.length;
  };
  for (const k of KIND_ORDER) {
    const b = h('button', {
      type: 'button', class: `kind-chip k-${k}`, 'aria-pressed': 'true', 'data-kind': k,
      title: `${KIND_LABELS[k]}: ${KIND_HELP[k]}. Click to show or hide these arrows.`,
    }, swatch(k), h('span', { class: 'kc-name' }, KIND_LABELS[k]), h('span', { class: 'kc-n' }, String(counts[k])));
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
  const allBtn = h('button', { type: 'button', class: 'kind-chip kc-all', onclick: () => { KIND_ORDER.forEach(x => map.filter.kinds.add(x)); sync(); map.applyFilter(); } }, 'Show all');
  chips.append(allBtn);
  const orig = toggleSwitch('Original map only', false, on => { map.filter.originalOnly = on; map.applyFilter(); });
  orig.el.classList.add('orig-switch');
  orig.el.title = 'Show only the 15 distributions and 18 arrows of the original chart this map is based on';

  const DISC = '<svg viewBox="0 0 30 14"><path d="M4 13V9M9 13V4M14 13V2M19 13V5M24 13V10" /></svg>';
  const CONT = '<svg viewBox="0 0 30 14"><path class="f" d="M1 13C8 13 10 2 15 2S22 13 29 13Z"/><path d="M1 13C8 13 10 2 15 2S22 13 29 13"/></svg>';
  const MV = '<svg viewBox="0 0 30 14"><ellipse cx="15" cy="7" rx="11" ry="4.6" transform="rotate(-18 15 7)"/><ellipse cx="15" cy="7" rx="5.5" ry="2.2" transform="rotate(-18 15 7)"/></svg>';
  const keys = h('div', { class: 'tile-keys' },
    h('span', { class: 'lg-title' }, 'Tiles'),
    tileKey('tk-d', 'discrete (bars at whole numbers)', DISC),
    tileKey('tk-c', 'continuous (density curve)', CONT),
    tileKey('tk-mv', 'multivariate (stacked tile)', MV),
    h('span', { class: 'tile-key' }, swatch('special-case', true), 'two heads: the relationship works both ways'));

  const fams = h('div', { class: 'fam-keys' }, h('span', { class: 'lg-title' }, 'Families'));
  for (const g of GROUP_ORDER) {
    const n = DISTRIBUTIONS.filter(d => d.group === g).length;
    if (!n) continue;
    const b = h('button', { type: 'button', class: 'fam-key', style: `--rg:${GROUP_STYLE[g]}`, title: `Highlight the ${n} distributions in this family` },
      h('span', { class: 'fam-dot', 'aria-hidden': 'true' }), groupLabel(g));
    b.addEventListener('mouseenter', () => map.hoverGroup(g, true));
    b.addEventListener('mouseleave', () => map.hoverGroup(g, false));
    b.addEventListener('focus', () => map.hoverGroup(g, true));
    b.addEventListener('blur', () => map.hoverGroup(g, false));
    b.addEventListener('click', () => map.hoverGroup(g, true));
    fams.append(b);
  }

  // above the map: which arrows to show
  const toolbar = h('div', { class: 'map-legend map-toolbar' },
    h('div', { class: 'lg-row' }, h('span', { class: 'lg-title', id: 'lg-arrows' }, 'Arrows'), chips, orig.el));
  // below the map: what the tiles and colors mean
  const key = h('div', { class: 'map-legend map-key' },
    h('div', { class: 'lg-row' }, keys),
    h('div', { class: 'lg-row' }, fams),
    h('p', { class: 'lg-note' }, 'Click a kind of arrow to show only those arrows; click more kinds to add them. Point at a family to highlight its distributions.'));
  container.insertBefore(toolbar, map.frame);
  container.append(key);
  sync();
}
