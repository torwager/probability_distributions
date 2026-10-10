// Home page: the interactive map of distributions, its legend and filters, and the list view below it.
import { buildMap } from '../map/map.js';
import { buildLegend } from '../map/legend.js';
import { buildList } from '../map/list.js';

const root = document.getElementById('map-root');
const map = buildMap(root, {
  onReady: () => { document.documentElement.dataset.mapReady = '1'; },
});
buildLegend(root, map);
buildList(document.getElementById('map-list'));

// exposed for the browser checks in tests (read-only use)
window.__map = map;
