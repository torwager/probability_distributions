// Home page: the interactive map of distributions with its two views (core and full), its legend and
// filters, and the list view below it. The view is kept in the address (index.html?view=full), so that
// it can be linked and comes back after the back button; the default is the core view.
import { buildMap, VIEWS } from '../map/map.js';
import { buildLegend } from '../map/legend.js';
import { buildList } from '../map/list.js';
import { segmented } from '../core/ui.js';

const viewFromUrl = () => {
  const p = new URLSearchParams(location.search).get('view') || location.hash.replace(/^#/, '');
  return p === 'full' ? 'full' : 'core';
};

const root = document.getElementById('map-root');
const map = buildMap(root, {
  view: viewFromUrl(),
  onReady: () => { document.documentElement.dataset.mapReady = '1'; },
});
buildLegend(map);
buildList(document.getElementById('map-list'));

// the view switch above the map
const sw = segmented(Object.values(VIEWS).map(v => ({ value: v.name, label: v.label })), map.view, v => map.setView(v), 'Distributions shown on the map');
sw.el.classList.add('view-switch');
document.getElementById('map-view-switch').append(sw.el);
map.onViewChange(v => {
  sw.set(v);
  const u = new URL(location.href);
  if (v === 'full') u.searchParams.set('view', 'full'); else u.searchParams.delete('view');
  if (u.hash === '#full' || u.hash === '#core') u.hash = '';
  if (u.href !== location.href) history.replaceState(history.state, '', u.href);
});
// a page restored from the back/forward cache keeps its view; a changed address (popstate) switches it
window.addEventListener('popstate', () => map.setView(viewFromUrl()));

// exposed for the browser checks in tests (read-only use)
window.__map = map;
