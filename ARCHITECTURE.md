# Architecture and module API

This document is the contract for everyone adding distribution pages, relationship pages or the map.
Read it fully before writing a module. The reference implementations are
`assets/js/dists/normal.js` and `assets/js/relations/binomial--normal.js`; copy their structure.

## Overview

Static site, no build step: plain HTML, CSS and native ES modules, served from the repository root by
GitHub Pages at `https://torwager.github.io/probability_distributions/`. **Use relative URLs everywhere**
(`distribution.html?d=normal`, `assets/...`), never a leading `/`.

```
index.html                 home (map; currently a placeholder grid, replaced by the map builder)
distribution.html          template, ?d=<distribution id>  -> assets/js/pages/distribution.js
relation.html              template, ?r=<relation id>      -> assets/js/pages/relation.js
distributions.html         all distributions by family
relationships.html         all relationships by kind
about.html                 about, conventions, notation glossary, edge-kind legend
assets/css/site.css        design tokens (light + dark) and every component style
assets/js/catalog.js       GENERATED from tools/catalog.source.json by tools/build_catalog.py (frozen data)
assets/js/modules.js       GENERATED manifest of existing modules (node tools/update-manifest.mjs)
assets/js/core/math.js     special functions, integration, root finding, RNG + samplers (pure, no DOM)
assets/js/core/plot.js     SVG plot engine with drag handles (Plot, DomainAnimator, sampleFn, niceTicks)
assets/js/core/ui.js       KaTeX helpers, store, parameter panel, toggles, modal, section builders, fmt
assets/js/core/explorer.js the standard PDF/CDF explorer used on every univariate page
assets/js/core/ctx.js      ctx object for custom explorers and relation demos; loadDist / loadRelation
assets/js/core/layout.js   shared header/footer, theme toggle, mobile nav
assets/js/pages/*.js       page scripts
assets/js/dists/<id>.js    one module per distribution
assets/js/relations/<id>.js one module per relationship (id = "<from>--<to>" as in the catalog)
assets/vendor/katex/       vendored KaTeX (window.katex is loaded with a classic deferred script)
tests/                     node tests (npm test), Playwright smoke + interaction tests
tools/                     catalog builder and manifest updater
```

### Adding a module: checklist

1. Write `assets/js/dists/<id>.js` (or `assets/js/relations/<from>--<to>.js`). The id **must** be a catalog id.
2. Run `node tools/update-manifest.mjs` (pages only load modules listed in `assets/js/modules.js`;
   the test suite fails if the manifest is out of date).
3. Run `npm test` (numeric checks of your pdf/cdf/stats/quantile, content completeness).
4. Run `node tests/smoke.mjs --only=<id>` and **look at the screenshots** in `screenshots/` (desktop
   and phone). There must be no console errors, no KaTeX errors and no horizontal page scroll.
5. Do not edit `assets/js/core/*`, `site.css` or the catalog unless your task says so; if you need
   a feature, add it in your module (e.g. `explorer.extraLayers`, `customExplorer`).

## Conventions (from the catalog; repeat them on pages)

Geometric = number of **failures** before the first success (support 0, 1, 2, ...), so Geometric(p) = NegBin(1, p).
NegBin = failures before the r-th success, r any positive real. Exponential uses **rate** λ. Gamma uses shape α,
**rate** β (mention the scale θ = 1/β form). Inverse-gamma uses shape α, **scale** β. Weibull uses shape k,
**scale** λ. Log-normal μ, σ are the mean and SD of ln X. Ex-Gaussian τ is the exponential **mean**. Wald uses
mean μ and shape λ; drift rate is v. Gumbel is the maximum type. Student t is the standard form (location 0, scale 1).
The full text is `CATALOG.conventions`.

Writing style: plain, direct explanations. No punchy headers, no dramatic statements. Explain every
symbol in words. Use "we" sparingly. British/American spelling: American.

## Catalog (`assets/js/catalog.js`)

```js
import { CATALOG, DISTRIBUTIONS, RELATIONS, NOTATION, EDGE_KINDS, KIND_LABELS, GROUP_ORDER,
         getDist, getRelation, relationsOf, catalogParams, notationFor } from '../catalog.js';
```

* Distribution entry: `{ id, name, kind, group, onOriginalMap, whyAdded, parameterization, params, support, blurb, mapPos:{col,row} }`.
  `kind` is `'discrete' | 'continuous' | 'multivariate-discrete' | 'multivariate-continuous'`.
* Param spec: `{ sym (TeX), key (JS identifier, e.g. 'mu', 'd1', 'alpha1', 'xm'), label (unicode, e.g. 'μ'),
  name, meaning, domain (TeX), default, min, max, integer }`. `min`/`max` bound the sliders **and** the values
  accepted from the number boxes.
* Relation entry: `{ id: 'from--to', from, to, bidirectional, kind, label (TeX), statement (TeX), plain, onOriginalMap }`.
* `catalogParams(id, overrides)` returns a mutable copy of a distribution's params, with per-key overrides,
  e.g. `catalogParams('student-t', { nu: { log: true } })`.
* The catalog is frozen. To change it, edit `tools/catalog.source.json` and run `python3 tools/build_catalog.py`.

## Distribution module API

A distribution module default-exports one plain object. Everything must be importable in Node (no DOM
access at import time; only `customExplorer` may touch the DOM).

| field | required | description |
|---|---|---|
| `id` | yes | catalog id; must equal the file name |
| `name` | yes | display name (use the catalog name) |
| `kind` | yes | must equal the catalog `kind` |
| `params` | yes | param specs, normally `catalogParams(id)`; extra fields below |
| `pdf(x, p)` | yes | density (continuous) or PMF (discrete; `x` is an integer, return 0 off the support) |
| `cdf(x, p)` | yes* | P(X ≤ x). For discrete, must be a right-continuous step function for any real x (use `Math.floor(x)`) |
| `sf(x, p)` | no | 1 − F(x), computed accurately in the upper tail (used for "right of x" areas) |
| `quantile(u, p)` | no, recommended | inverse CDF; discrete: smallest k with F(k) ≥ u |
| `sample(rng, p)` | no | one random draw; `rng` is `math.makeRng(seed)` (has `normal`, `gamma`, `poisson`, ...) |
| `range(p)` | yes* | **true** support `[lo, hi]` (may be ±Infinity). Used by tests and for integration |
| `support(p)` | yes | **finite plotting window** `[lo, hi]` that contains nearly all the probability (e.g. μ ± 4.5σ, or the 0.0005 and 0.9995 quantiles). Discrete: integer endpoints |
| `stats(p)` | yes | `{ mean, variance, sd, median, mode, skewness, exKurtosis, entropy }`. Use `NaN` for undefined and `Infinity` for infinite values; explain these in `content.properties` |
| `handles` | yes* | array of handle specs, or `p => array` (see below) |
| `normalize(p, changedKey)` | no | return a corrected params object after any change (enforce `a <= b`, resize vectors, ...). Called with `changedKey = null` for the defaults |
| `check(p)` | no | return an error message string if `p` is invalid (cross-parameter rules), else `null`. Typed values that fail are shown as an inline message and not applied; drags that fail are ignored |
| `testParams` | no | extra parameter sets (partial objects) for the node tests; include edge-ish but valid values |
| `explorer` | no | explorer options (below) |
| `content` | yes | page text (below) |
| `customExplorer(container, ctx)` | no | replaces the standard explorer (multivariate distributions, categorical bars, ...) |

\* Multivariate modules may omit `cdf`, `range` and `handles` and provide `customExplorer` instead.

Extra param-spec fields a module may add (via `catalogParams(id, overrides)`):
`step` (keyboard/arrow-key step), `dragStep` (snap resolution while dragging), `log` (true/false: log-scaled
slider; default is automatic when `min > 0` and `max/min >= 50`), `hidden` (do not show in the panel).

### Handles

Handles are the amber things the user drags. Each spec says which parameter it controls and where it is
drawn, as functions of the current params `p`. All coordinates are **data units** (x in the variable's
units, y in density units). The explorer converts the pointer position back to data units and calls
`set(pt, p, p0)` (`p0` = params at drag start), then clamps to `[min, max]`, rounds integers, snaps
to the drag resolution, applies `normalize` and `check`.

| type | geometry fields | default `set` | typical use |
|---|---|---|---|
| `vline` | `x(p)` (default `p[param]`) | `{[param]: pt.x}` | location (mean, mode, x0, μ) |
| `hArrow` | `from(p)`, `to(p)` → `{x, y}`; the knob is at `to` | `{[param]: pt.x - from(p).x}` | scale (σ, b, s, γ) from the center outward |
| `vArrow` | `from(p)`, `to(p)` | `{[param]: pt.y - from(p).y}` | something height-like |
| `point` | `at(p)` → `{x, y}` | **must supply `set`** | 2-D, e.g. drag the peak to set the mode and the spread together |
| `xPoint` | `x(p)`, optional `lineTo(p)` (draw a dashed line up to that y) | `{[param]: pt.x}` | a marker on the x-axis: n of a binomial, a bound a or b, x_m of a Pareto |

Optional on every handle: `id` (default `type-param`), `label` (short unicode text drawn next to the
knob, default the param's unicode label), `ariaLabel`, `color: 'steel'` (rarely), `cls`,
`keyX`/`keyY` (which param the arrow keys change for `point` handles; default `param`).

Choose handles that feel physical: drag the thing whose position the parameter controls. Examples:
Exponential – `hArrow` from 0 to the mean 1/λ with `set: pt => ({ lambda: 1 / Math.max(pt.x, 1e-6) })`;
Gamma – `point` at the mode or an `hArrow` for the mean; Beta – `point` at the mode, or two `vline`s at
quantiles; Poisson – `vline` at λ (λ is continuous even though k is discrete); Binomial – `xPoint` for n
and a `vline` at the mean np with `set: (pt, p) => ({ p: pt.x / p.n })`; Uniform – two `xPoint`s or `vline`s
for a and b with `normalize` keeping `a < b`. Every parameter should be reachable by at least one handle
or, if that would be awkward, by its number box (all parameters always have a box).

### Explorer options (`explorer`)

```js
explorer: {
  xLabel: 'k',                       // axis variable name (default 'x' / 'k' for discrete)
  pdfCaption, cdfCaption,            // override the plot captions
  readouts: [                        // the "Summary at these parameters" list
    { key: 'mean', label: 'Mean' },  // value read from stats(p)[key]
    { label: 'P(X = 0)', value: (p, stats) => ... },   // or computed (number or string)
  ],
  overlays: p => [                   // extra curves with a legend (e.g. normal approximation)
    { id: 'normal', label: 'Normal approximation', pdf: x => ..., cdf: x => ..., cls: 'curve-ref' },
  ],
  extraLayers: (p, view) => [ /* plot layers, see plot.js header; e.g. a mean marker */ ],
  areaDefault: p => x,               // initial threshold for the area tool (default: median)
  yMax: p => number,                 // cap the y axis (e.g. densities that are infinite at 0)
}
```

Layer classes available in CSS: `curve-main`, `curve-ref` (dashed warm grey), `curve-2`, `curve-thin`,
`pdf-fill`, `area-shade`, `fill-steel`, `bars-strong`, `pmf`, `pmf-on`, `pmf-ref`, `ref-line`, `guide`,
`mean-line`, `marker`.

### Content

All strings are **rich text**: trusted HTML in which `$...$` is inline TeX and `$$...$$` display TeX. Write a
literal dollar sign as `\\$`. In JS strings remember to double the backslashes (`'$\\mu$'`).

```js
content: {
  description: ['paragraph', 'paragraph'],   // or one string. What it describes, what values it takes, its parameters
  explorerIntro: 'What the two plots show and what each handle does.',
  parameterization: '...',                  // optional; default is the catalog text
  pdfTex: 'f(x \\mid \\mu,\\sigma) = ...',  // display TeX (discrete: P(X = k) = ...)
  glossary: [{ sym: 'TeX', meaning: 'rich text' }],     // every symbol in pdfTex
  cdfTex: 'F(x) = ...',
  cdfGlossary: [{ sym, meaning }],          // every symbol in cdfTex (special functions explained in words)
  pdfIntro, cdfIntro, pdfTitle, cdfTitle,   // optional
  extraFormulas: [{ title, intro, tex, glossary }],   // optional (e.g. hazard function, likelihood, posterior update)
  properties: [                             // table: name | formula | live value | explanation
    { name: 'Mean', tex: '\\mathrm{E}[X] = \\mu', value: p => p.mu, explain: 'rich text' },
  ],
  limits: [                                 // limits and special cases
    { text: 'rich text', relation: '<catalog relation id>', to: '<catalog distribution id>' },
  ],
  uses: { frequentist: [...], bayesian: [...], modeling: [...] },   // rich-text list items, all three non-empty
  references: [{ text: 'rich text', url: 'https://...' }],
}
```

Systematic coverage expected on every page (same order as the Normal page where it applies):
support; mean; median; mode; variance; standard deviation; skewness; excess kurtosis; entropy;
MGF or characteristic function (or PGF for counts) where useful; plus distribution-specific rows (hazard
function, memorylessness, conjugacy, quantile formula, 68–95–99.7-type facts). Limits must include every
catalog relation involving the distribution that is a limit or special case, plus the PAGE-ONLY FACTS from
`CATALOG.notes`. Uses: name the actual tests and models (e.g. "chi-squared test of independence",
"negative binomial regression", "Beta–binomial model"), and give the conjugate update formula when
there is one. References: Wikipedia, plus Casella & Berger / BDA3 / Johnson–Kotz–Balakrishnan / Leemis &
McQueston as relevant.

### Annotated example (abridged from `dists/normal.js`)

```js
import { catalogParams } from '../catalog.js';
import { normalCdf, normalQuantile, LN_SQRT_2PI, PI } from '../core/math.js';

function pdf(x, { mu, sigma }) {                       // params arrive as an object keyed by param.key
  const z = (x - mu) / sigma;
  return Math.exp(-0.5 * z * z - LN_SQRT_2PI) / sigma;
}

export default {
  id: 'normal', name: 'Normal (Gaussian)', kind: 'continuous',
  params: catalogParams('normal'),                     // [{key:'mu',...}, {key:'sigma',...}]
  pdf,
  cdf: (x, { mu, sigma }) => normalCdf((x - mu) / sigma),
  sf: (x, { mu, sigma }) => normalCdf(-(x - mu) / sigma),
  quantile: (u, { mu, sigma }) => mu + sigma * normalQuantile(u),
  sample: (rng, { mu, sigma }) => rng.normal(mu, sigma),
  testParams: [{ mu: -3, sigma: 0.25 }, { mu: 7, sigma: 4 }],
  range: () => [-Infinity, Infinity],                  // true support
  support: ({ mu, sigma }) => [mu - 4.5 * sigma, mu + 4.5 * sigma],   // plotting window
  stats: ({ mu, sigma }) => ({ mean: mu, variance: sigma * sigma, sd: sigma, median: mu, mode: mu,
                               skewness: 0, exKurtosis: 0, entropy: 0.5 * Math.log(2 * PI * Math.E * sigma * sigma) }),
  handles: [
    { type: 'vline', param: 'mu' },                    // drag the mean line
    { type: 'hArrow', param: 'sigma',                  // drag the arrow tip at mu + sigma
      from: p => ({ x: p.mu, y: pdf(p.mu + p.sigma, p) }),
      to:   p => ({ x: p.mu + p.sigma, y: pdf(p.mu + p.sigma, p) }),
      set:  (pt, p) => ({ sigma: pt.x - p.mu }) },
  ],
  explorer: { readouts: [{ key: 'mean', label: 'Mean μ' }, { key: 'sd', label: 'Standard deviation σ' }] },
  content: { description: [...], explorerIntro: '...', pdfTex: '...', glossary: [...], cdfTex: '...',
             cdfGlossary: [...], properties: [...], limits: [...], uses: {...}, references: [...] },
};
```

### Discrete modules

`kind: 'discrete'`. `pdf(k, p)` is the PMF at integer k (return 0 for non-integers or off the support).
`cdf(x, p)` must accept any real x and return F(⌊x⌋) (0 below the support). `range(p)` is `[lo, hi]` with a
finite `lo` (hi may be Infinity). `support(p)` returns integer plotting bounds. The explorer draws
lollipop stems and a step CDF, snaps the area threshold to integers and reports P(X ≤ k), P(X > k) and
P(a < X ≤ b).

### Custom explorers (multivariate, categorical, ...)

`customExplorer(container, ctx)` builds its own interactive graphic inside `container` (an empty div in
the "Interactive explorer" section). It may be `async`. `ctx` contains:

```js
ctx = {
  store,            // ui.createStore({ p, area }): ctx.store.get().p, ctx.store.set({ p: newP }), ctx.store.subscribe(fn)
                    // Keep params in the store so the properties table (value column) updates live.
  dist,             // the module itself
  catalogEntry,     // the catalog entry
  math, plot, ui, catalog,             // the core libraries (same as importing them)
  loadDist(id), loadRelation(id),      // promise of another module (null if not written yet)
  hasDist(id), hasRelation(id),
  mountExplorer(container, mod, { store }), defaultParams(mod),   // reuse the standard explorer if helpful
}
```

Use `new ctx.plot.Plot(el, opts)` for plots, `ctx.ui.paramPanel(el, params, {get, apply, check, onReset})`
for number boxes (it validates against min/max/integer and shows inline messages), and amber handles for
anything draggable. Plots must resize (the Plot class does this) and work at 390 px width.

## Relation module API

`assets/js/relations/<from>--<to>.js` default-exports:

| field | required | description |
|---|---|---|
| `id`, `from`, `to` | yes | must match the catalog entry exactly |
| `title` | no | longer descriptive title shown under the heading |
| `plain` | yes | rich text or array of paragraphs: the plain-language explanation (can extend the catalog `plain`) |
| `statementTex` | yes | TeX; normally the catalog `statement` (import with `getRelation(id).statement`). Long statements are split into lines at top-level `.\ `, `;\quad` and `;\ ` |
| `glossary` | yes | `[{sym, meaning}]` explaining every symbol in the statement |
| `why` | yes | array of rich-text paragraphs and `{ tex: '...' }` display formulas: derivation or intuition |
| `demo(container, ctx)` | yes | builds the interactive demonstration (may be async) |
| `references` | yes | `[{text, url}]` |

`ctx` for demos: `{ math, plot, ui, catalog, loadDist, loadRelation, hasDist, hasRelation, mountExplorer,
defaultParams, relation (catalog entry), from, to (catalog entries) }`. A demo should be self-contained
(compute what it needs with `math`), or use `await ctx.loadDist(id)` and handle `null` if that module
does not exist yet. Typical demos: a slider/box for the limiting parameter with both curves overlaid and
a readout of the largest CDF gap (see binomial--normal); a simulation that draws samples with
`math.makeRng(seed)`, builds a histogram with `math.histogram` and overlays the target density, with a
"Draw new samples" button (`.btn`); a before/after view for transformations. Put controls in a
`.demo-controls` div and plots in `.demo-grid` (two columns on desktop, one on phones).

## Core libraries (summary)

**math.js** — `lgamma, gamma, lbeta, beta, lfactorial, logBinom, binom, digamma, trigamma, gammaP, gammaQ,
gammaPinv, betaI, betaIc, betaIinv, erf, erfc, normalPdf, normalCdf, normalQuantile, besselI0, besselI1,
besselI0e, besselI1e, integrate(f, a, b) (adaptive Gauss–Kronrod, infinite limits OK), integrateSimpson,
bisect, brent, quantileContinuous(cdf, u, lo, hi, guess, scale), quantileDiscrete(cdf, u, lo, hi, guess),
makeRng(seed)` (samplers: `random, uniform, int, normal, exponential(rate), gamma(shape, rate), beta, chiSquared,
studentT, f, cauchy, laplace, logistic, lognormal, weibull, pareto, gumbel, exGaussian, wald, vonMises, bernoulli,
binomial, poisson, geometric (failures), negativeBinomial, hypergeometric, categorical, multinomial, dirichlet, many`),
`mean, variance, histogram, ecdf, linspace, range, clamp, logSumExp, niceStep, roundTo`, constants
`PI, LN_SQRT_2PI, SQRT_2PI, EULER_GAMMA`.

**plot.js** — `new Plot(container, { xLabel, yLabel, height, margin, onBackground })`, `plot.render(scene)`
(see the comment block at the top of plot.js for layer and handle types), `DomainAnimator`, `sampleFn(f, a, b, n)`,
`niceTicks`, `formatTick`. Plot `render` is cheap; call it on every change. DOM nodes are reused by `id`.

**ui.js** — `h(tag, attrs, ...children)`, `renderTex(el, tex, display)`, `tex(src)`, `texToHtml`, `rich(tag, text)`,
`renderRich(el, text)`, `renderTexLines`, `fmt(v, digits)`, `fmtInput`, `parseNumber`, `createStore`,
`paramPanel`, `toggleSwitch(label, on, onChange)`, `segmented(options, value, onChange)`,
`openModal({ title, body, wide, footer })` (accessible dialog: Esc closes, focus is trapped, returns `close`),
`section(id, title, intro)`, `glossaryList(items)`, `referenceList(refs)`, `texLabel(sym)`.

**explorer.js** — `mountExplorer(container, mod, { store })`, `defaultParams(mod)`.

## Design rules

* Colors come from CSS variables only (`var(--steel-deep)`, ...), so dark mode works automatically.
  **Amber = interactive** (handles, toggles, selected states, the shaded area); **steel = curves**; ink for text.
* Fonts: Fraunces (headings), Inter (text), JetBrains Mono (numbers, `.mono`, `.tnum`).
* Every page must work at 390 px wide with no horizontal page scroll; long formulas scroll inside `.formula`.
* Accessibility: handles are focusable sliders (arrow keys), number boxes have labels, the modal traps focus.

## The map (index.html)

The map builder replaces `index.html` and `assets/js/pages/index.js`. Use `DISTRIBUTIONS[i].mapPos`
(placeholder grid positions, refine freely), `RELATIONS` (with `kind` → line style from `EDGE_KINDS`,
`label` TeX next to the arrow, `bidirectional` → two heads, `onOriginalMap` → can be styled distinctly),
`ui.openModal` for the relation pop-up (plain text + `renderTexLines` statement + glossary from
`notationFor(statement)` + a link to `relation.html?r=<id>`), and `pages/common.js` `drawSpark(holder, mod)`
for small density sketches on tiles (only for ids in the manifest; use `hasDist`). Keep a link to
`distributions.html` for a plain list.

## Tests

* `npm test` — node tests: math reference values; catalog consistency; manifest up to date; for every
  distribution module: structure, content completeness, pdf integrates to 1 (discrete: sums to 1), cdf matches
  the integral/cumulative sum and is monotone in [0, 1], mean and variance match numeric moments, quantile
  inverts cdf, sf = 1 − cdf, samples agree with the median; for every relation module: fields and from/to.
* `npm run smoke` — Playwright: every page at 1280 px and 390 px, console errors, failed requests, KaTeX
  errors, horizontal overflow; screenshots in `screenshots/` (git-ignored). `--only=<substring>` limits pages.
* `npm run interact` — Playwright interaction test of the Normal page (drag μ and σ, typing, validation,
  area tool) and the binomial→normal demo.

Playwright is used from the global install (`/opt/node22/lib/node_modules/playwright`) and Chromium from
`/opt/pw-browsers`; override with `PLAYWRIGHT_PATH` and `CHROMIUM_PATH`.
