// Hand-tuned layout of the "Core distributions" view of the map: the 15 distributions of the original
// chart (docs/original-map.png) and the 22 catalog relationships between them (the 18 arrows of the
// original chart and four more: Beta -> Binomial and Gamma -> Poisson as conjugate priors, Poisson ->
// Negative binomial as a mixture, Binomial -> Normal as a limit).
//
// The arrangement follows the original chart, stretched sideways to suit a wide screen: Discrete uniform
// and Bernoulli at the top; Hypergeometric, Binomial, Geometric and Negative binomial in a row below
// them; Poisson and Exponential in the middle with Weibull to the right; Normal at the lower left with
// Log-normal and Student's t to its left, and Chi-squared, Gamma and Beta in a row to its right.
// Poisson sits a little to the right of Binomial so that the Binomial -> Normal limit can run straight
// down beside it. Two arrows cross another arrow: Poisson -> Negative binomial crosses Geometric ->
// Exponential, and Beta -> Binomial, which runs up the right side and over the top, crosses
// Bernoulli -> Geometric.
//
// Fields are as in layout.js (world units are CSS pixels at zoom 1).

export const TILE = { w: 186, h: 84 };

export const NODES = {
  'discrete-uniform': { x: 360, y: 60 },
  bernoulli: { x: 745, y: 60 },
  hypergeometric: { x: 105, y: 240 },
  binomial: { x: 420, y: 240 },
  geometric: { x: 1070, y: 240 },
  'negative-binomial': { x: 1370, y: 240 },
  poisson: { x: 640, y: 425 },
  exponential: { x: 1070, y: 425 },
  weibull: { x: 1370, y: 425 },
  'log-normal': { x: 105, y: 515 },
  normal: { x: 420, y: 615, w: 196, h: 96, big: true },
  'student-t': { x: 105, y: 700 },
  'chi-squared': { x: 730, y: 615 },
  gamma: { x: 1070, y: 615 },
  beta: { x: 1370, y: 615 },
};

export const WORLD = { w: 1544, h: 756 };

export const ROUTES = {
  'bernoulli--binomial': { toDx: -20 },
  // the label sits above the arrow, clear of the Beta -> Binomial loop below it
  'bernoulli--geometric': { lo: -1, lt: 0.55 },
  'binomial--geometric': { fromDy: 12, toDy: 12 },
  'binomial--poisson': { fromDx: 40 },
  'hypergeometric--normal': { fromDx: 20, toDx: -60 },
  'poisson--normal': { fromDx: -30, toDx: 40 },
  'poisson--negative-binomial': { fromDx: 40, toDy: 14, lt: 0.3 },
  'gamma--poisson': { fromDx: -30, toDx: 40 },
  // up the right side and over the top, into the right side of Binomial
  'beta--binomial': { r: 30, via: [[1528, 615], [1528, 162], [628, 162], [628, 218]], toDy: -22, lt: 0.62 },
};

/** Larger tiles than the full map: sketch size, and the largest scale of the first view on a phone. */
export const GLYPH = { w: 150, h: 40 };
export const PHONE_SCALE = 0.6;
/** Center (world units) of the first view on a phone: Discrete uniform and Bernoulli at the top, Binomial, Poisson, Normal and Chi-squared below them. */
export const PHONE_CENTER = [588, 400];
