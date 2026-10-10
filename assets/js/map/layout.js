// Hand-tuned layout of the map (world units are CSS pixels at zoom 1).
//
// NODES: tile centers. The 15 distributions of the original chart (docs/original-map.png) keep their
// relative arrangement: discrete Bernoulli-trial family at the top left, Normal below Poisson with
// Log-normal and Student's t to its left and Chi-squared to its right, the Geometric -> Exponential ->
// Gamma -> Beta column in the middle, Negative binomial and Weibull to the right. The added
// distributions sit next to what they relate to.
// ROUTES: per relation, how the arrow is drawn: { bend } (px, a gentle curve to the left of the direction
// of travel when positive), { via: [[x, y], ...] } (a smooth curve through these points) or { r, via }
// (straight runs through the points with corners rounded to radius r; used for the long arrows).
// fromDx/fromDy and toDx/toDy shift the end points from the tile centers. Label hints: lt (preferred
// fraction of the arrow's length, default 0.5), lo (0 = on the line, 1 / -1 = beside it), fixed (do not
// slide the label along the arrow). map.js slides each label along its arrow to avoid tiles, other labels
// and other arrows, and puts it beside a short arrow so that the arrow stays visible.
// Long relations are drawn along the edges of the map: Uniform <-> Discrete uniform, Von Mises -> Uniform
// and Logistic -> Bernoulli over the top, Beta <-> Uniform under the bottom right corner and up the right
// side, Student's t -> F around the bottom left corner. The conjugate-prior arrows from Beta, Gamma and
// Dirichlet run side by side up one channel between Chi-squared and Exponential, each labeled near its source.

export const TILE = { w: 136, h: 70 };

export const NODES = {
  // top row
  'beta-binomial': { x: 140, y: 126 },
  'discrete-uniform': { x: 368, y: 126 },
  bernoulli: { x: 606, y: 126 },
  categorical: { x: 853, y: 126 },
  gumbel: { x: 1110, y: 126 },
  logistic: { x: 1385, y: 126 },
  // Bernoulli trials, waiting times
  hypergeometric: { x: 140, y: 261 },
  binomial: { x: 416, y: 261 },
  multinomial: { x: 654, y: 318 },
  geometric: { x: 891, y: 261 },
  'negative-binomial': { x: 1138, y: 270 },
  uniform: { x: 1385, y: 342 },
  poisson: { x: 416, y: 423 },
  exponential: { x: 891, y: 423 },
  'ex-gaussian': { x: 554, y: 536 },
  laplace: { x: 1370, y: 504 },
  pareto: { x: 1148, y: 522 },
  // normal family
  'log-normal': { x: 140, y: 504 },
  normal: { x: 416, y: 668, w: 160, h: 82, big: true },
  'chi-squared': { x: 663, y: 676 },
  weibull: { x: 1072, y: 654 },
  'student-t': { x: 140, y: 708 },
  'multivariate-normal': { x: 630, y: 846 },
  'inverse-gamma': { x: 330, y: 969 },
  gamma: { x: 997, y: 798 },
  dirichlet: { x: 1206, y: 888 },
  cauchy: { x: 140, y: 843 },
  f: { x: 760, y: 978 },
  beta: { x: 997, y: 942 },
  'half-cauchy': { x: 140, y: 978 },
  wald: { x: 452, y: 840 },
  'von-mises': { x: 140, y: 382 },
};

export const WORLD = { w: 1547, h: 1075 };

export const ROUTES = {
  // arcs over the top of the map and around its right side
  'logistic--bernoulli': { r: 40, via: [[1385, 70], [606, 70]] },
  'uniform--discrete-uniform': { r: 40, via: [[1490, 330], [1490, 46], [368, 46]] },
  'von-mises--uniform': { r: 40, via: [[42, 382], [42, 18], [1516, 18], [1516, 356]] },
  // limits into the Normal from the upper left
  'von-mises--normal': { fromDx: 40, toDx: -52 },
  'hypergeometric--normal': { fromDx: 36, toDx: -36, via: [[292, 444]] },
  'binomial--normal': { fromDx: -36, toDx: -12, via: [[330, 462]] },
  'bernoulli--geometric': { lt: 0.3 },
  // conjugate priors: one bundle up the middle
  'beta--binomial': { r: 30, via: [[790, 932], [790, 372], [452, 372]], toDx: 36, lt: 0.2, lo: 0, fixed: true },
  'gamma--poisson': { r: 30, via: [[775, 790], [775, 484], [460, 484]], toDx: 44, lt: 0.1 },
  'dirichlet--multinomial': { r: 30, via: [[1206, 740], [805, 740], [805, 395], [700, 395]], lt: 0.08 },
  'poisson--negative-binomial': { bend: -20, fromDy: -22, toDy: 14 },
  // lower left
  'student-t--f': { r: 30, fromDy: 12, via: [[36, 720], [36, 1040], [730, 1040]], toDx: -30 },
  'inverse-gamma--student-t': { r: 24, via: [[300, 800], [260, 730]] },
  'gamma--inverse-gamma': { r: 30, via: [[880, 815], [880, 908], [460, 908]] },
  'chi-squared--f': { fromDx: 40, lt: 0.3 },
  'normal--multivariate-normal': { fromDx: 70, toDx: -20 },
  'f--beta': { toDy: 18 },
  'inverse-gamma--normal': { toDx: -34 },
  // Beta <-> Uniform runs under the bottom right corner and up the right edge
  'beta--uniform': { r: 36, fromDx: 40, toDx: 40, via: [[1037, 1040], [1478, 1040], [1478, 400]] },
  'poisson--multinomial': { fromDx: 40, fromDy: -30, toDx: -40, lt: 0.45, lo: -1, fixed: true },
  'binomial--multinomial': { lo: 0, fixed: true },
  'geometric--negative-binomial': { lt: 0.72, lo: 1, fixed: true },
  'categorical--multinomial': { lt: 0.72 },
  'multinomial--chi-squared': { fromDx: 40, toDx: 31 },
  'normal--wald': { fromDx: 44, toDx: 16 },
  'exponential--gumbel': { fromDx: 36, toDx: -56 },
  'poisson--exponential': { lt: 0.3, fixed: true },
  'chi-squared--gamma': { lt: 0.86, lo: -1 },
};

/** Optional text labels for the family regions ({group, x, y, text?, anchor?}); the family colors are explained in the legend under the map instead. */
export const REGION_LABELS = [];

/** Color token of each catalog group (used for the soft regions and their labels). */
export const GROUP_STYLE = {
  'uniform': 'var(--g-uniform)',
  'counting / Bernoulli trials': 'var(--g-count)',
  'categorical / multivariate counts': 'var(--g-cat)',
  'waiting times / positive continuous': 'var(--g-wait)',
  'normal family / sampling distributions': 'var(--g-normal)',
  'heavy-tailed / symmetric / extreme value': 'var(--g-heavy)',
  'Bayesian priors': 'var(--g-prior)',
  'response times and circular data': 'var(--g-rt)',
};

const SHORT = {
  'normal': 'Normal',
  'f': 'F',
  'laplace': 'Laplace',
  'wald': 'Wald',
  'uniform': 'Uniform',
  'student-t': 'Student’s t',
};
/** Name shown on a tile (the full name is in its accessible label and on the page). */
export const shortName = d => SHORT[d.id] || d.name;
