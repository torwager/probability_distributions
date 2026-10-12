# Architecture and module API

This document is the contract for everyone adding distribution pages, relationship pages or the map.
Read it fully before writing a module. The reference implementations are:

* `assets/js/dists/normal.js` — a univariate distribution page (standard explorer, full content);
* `assets/js/relations/binomial--normal.js` — a relationship with a hand-written demo;
* `assets/js/relations/exponential--gamma.js` — a relationship using `ctx.demos.simulationDemo`;
* `assets/js/relations/poisson--normal.js` — a relationship using `ctx.demos.compareDemo`.

Copy their structure. When this document and a reference module disagree, this document wins; say so in your report.

## Overview

Static site, no build step: plain HTML, CSS and native ES modules, served from the repository root by
GitHub Pages at `https://torwager.github.io/probability_distributions/`. **Use relative URLs everywhere**
(`distribution.html?d=normal`, `assets/...`), never a leading `/`.

```
index.html                 home: the map (assets/js/map/*, assets/css/map.css)
distribution.html          template, ?d=<distribution id>  -> assets/js/pages/distribution.js
relation.html              template, ?r=<relation id>      -> assets/js/pages/relation.js
distributions.html         all distributions by family
relationships.html         all relationships by kind
about.html                 about, conventions, notation glossary, edge-kind legend
assets/css/site.css        design tokens (light + dark) and every component style
assets/js/catalog.js       GENERATED from tools/catalog.source.json + tools/catalog_rich.py by tools/build_catalog.py
assets/js/modules.js       GENERATED manifest of existing modules (node tools/update-manifest.mjs)
assets/js/core/math.js     special functions, integration, root finding, RNG + samplers (pure, no DOM)
assets/js/core/plot.js     SVG plot engine with drag handles (Plot, DomainAnimator, sampleFn, niceTicks)
assets/js/core/ui.js       KaTeX helpers, rich text, store, parameter panel, toggles, modal, section builders, fmt
assets/js/core/explorer.js the standard PDF/CDF explorer used on every univariate page
assets/js/core/demos.js    ready-made relation demos: simulationDemo, compareDemo (ctx.demos)
assets/js/core/ctx.js      ctx object for custom explorers and relation demos; loadDist / loadRelation
assets/js/core/layout.js   shared header/footer, theme toggle, mobile nav
assets/js/pages/*.js       page scripts
assets/js/dists/<id>.js    one module per distribution
assets/js/relations/<id>.js one module per relationship (id = "<from>--<to>" exactly as in the catalog)
assets/vendor/katex/       vendored KaTeX (window.katex is loaded with a classic deferred script)
tests/                     node tests (npm test), Playwright smoke + interaction tests
tools/                     catalog builder and manifest updater
```

## Checklist for module authors

Do these in order. A module is finished only when every step is done.

1. **Read** this document, the reference module of your kind, and your catalog entry
   (`node -e "import('./assets/js/catalog.js').then(C => console.log(JSON.stringify(C.getDist('gamma'), null, 1)))"`,
   or `getRelation('<from>--<to>')`). Use the catalog's parameter keys, names, ranges and parameterization.
2. **Write** `assets/js/dists/<id>.js` or `assets/js/relations/<from>--<to>.js`. The file name must be a catalog id.
3. **Numerics**: use `core/math.js` (do not write your own gamma or beta functions). Compute densities in log
   space when they involve large exponents or factorials (`lgamma`, `logBinom`, `logNormalCdf`, `erfcx`).
4. **Handles**: follow the plan for your distribution in [Recommended handles](#recommended-handles).
   Every parameter must be reachable by a handle or, if that would be awkward, by its number box (all
   parameters always have a box).
5. **Content**: follow [Content and style rules](#content-and-style-rules). Every symbol in every formula is
   explained; Greek letters in prose are TeX (`$\\lambda$`), never the word "lambda".
6. Run `node tools/update-manifest.mjs` (pages only load modules listed in `assets/js/modules.js`; the tests
   fail if the manifest is out of date).
7. Run `npm test`. For every parameter set (defaults plus `testParams`) it checks that the pdf integrates to 1
   (or sums to 1), the cdf matches the integral or cumulative sum, the stats (mean, variance, median, mode,
   skewness, excess kurtosis, entropy) match numeric values, quantile inverts cdf, sf = 1 − cdf and samples
   agree with the median; and it checks the content rules (required property rows, limits, glossary coverage,
   TeX for Greek letters). Fix the module, not the test.
8. Run `node tests/smoke.mjs --only=<id>` and **look at the screenshots** in `screenshots/` (desktop and
   phone). There must be no console errors, no KaTeX errors and no horizontal page scroll. Then drag every
   handle in a browser (`npm run serve`, open `http://127.0.0.1:8000/distribution.html?d=<id>`), try extreme
   parameter values from the number boxes (each min and max), and check that the curve stays in view and the
   handles stay on the curve.
9. Run `npm run layout -- --only=<id>` (see [Page layout](#page-layout)): the summary must fit in 3 lines and
   the main plots must be visible without scrolling on a laptop screen.
10. Do not edit `assets/js/core/*`, `site.css`, the catalog or the tests unless your task says so. If you need a
   feature, build it in your module (`explorer.extraLayers`, `customExplorer`, a custom `demo`) and mention the
   missing core feature in your report.

## Content and style rules

The site explains things plainly. It is for students and researchers who want to understand a distribution.

* **Plain, direct sentences.** Say what something is and what it is for. No punchy headers, no rhetorical
  questions, no dramatic statements ("the king of distributions"), no exclamation marks. Section titles are
  fixed by the page templates; inside lists, lead with a short bold label that names the thing
  (`<b>Poisson regression.</b> ...`), not a slogan.
* **Explain every symbol.** Every symbol that appears in `pdfTex` must be in `glossary`, every symbol in
  `cdfTex` in `cdfGlossary`, and every symbol in a relation's `statementTex` in its `glossary`, including
  constants ($\pi$, $e$) and special functions ($\Gamma$, $B$, $\Phi$, $\operatorname{erf}$, $I_0$), each with a
  plain-language meaning. When a property formula introduces a new symbol, explain it in that row's `explain`.
* **TeX for math.** Write symbols, including single letters used as variables (`$n$`, `$p$`, `$k$`), in TeX:
  `'$\\lambda$'` in a JS string. Never spell Greek letters as words ("lambda", "sigma"); the tests reject it.
  Use `\mathrm{Gamma}(\alpha, \beta)` for distribution names inside formulas.
* **American spelling** and sentence case. Use "we" sparingly. Write "standard deviation", not "SD", in prose.
* **Same structure on every page.** The page template orders the sections (see [Page layout](#page-layout));
  your content fills them:
  0. `summary`: 1–3 sentences shown under the title (see [Summaries](#summaries)).
  1. `description`: 1–3 paragraphs, shown when the reader clicks "More about this distribution". What the
     distribution describes (with an everyday example), what values it takes, what each parameter does.
  2. `explorerIntro`: what the two plots show and what each handle does, in that order. It is shown under the
     explorer ("How to use the explorer").
  3. Formulas: `pdfTex` + `glossary`, `cdfTex` + `cdfGlossary` (if the CDF has no closed form, write it as the
     integral or sum and say how it is computed), optional `extraFormulas` (hazard function, likelihood,
     conjugate update, quantile function).
  4. `properties`: **required rows, named exactly** Support, Mean, Median, Mode, Variance, Standard deviation,
     Skewness, Excess kurtosis, Entropy. Then, where useful and in this order: Moment-generating function (or
     Probability-generating function for counts), Characteristic function, and distribution-specific rows
     (hazard function, memorylessness, quantile function, peak height, rules of thumb). Give each row a
     `value(p)` when it can be computed (the tests compare the required rows with `stats(p)`). When something is
     undefined or infinite (Cauchy mean, Pareto variance for $\alpha \le 2$), say so in `explain` and give the
     condition, e.g. "Defined for $\nu > 2$; infinite for $1 < \nu \le 2$".
  5. `limits`: limits and special cases. **It must include one item for every catalog relation of kind `limit`
     or `special-case` that involves the distribution** (with `relation: '<id>'` and `to: '<other id>'`), plus the
     page-only facts listed in `CATALOG.notes` (PAGE-ONLY FACTS and CONSIDERED AND NOT GIVEN TILES), e.g.
     "Weibull with $k = 2$ is the Rayleigh distribution". Other relations (sums, transformations, ...) are
     listed automatically under "Related distributions" and need not be repeated.
  6. `uses`: three non-empty lists. `frequentist`: the tests, models and estimators that use it, by name
     ("chi-squared test of independence", "negative binomial regression", "Kaplan–Meier estimator").
     `bayesian`: conjugacy with the update formula written out, typical priors and posteriors, posterior
     predictive distributions, hierarchical models. `modeling`: computational modeling and other applications
     (response-time models, choice models, simulation, reliability, physics). If a distribution has few
     Bayesian uses, say what role it plays (e.g. as a likelihood) rather than inventing uses.
  7. `references`: Wikipedia plus at least one textbook or paper (Casella & Berger; Gelman et al., BDA3;
     Johnson, Kotz & Balakrishnan; Leemis & McQueston 2008; the original paper where relevant), with a URL
     when one exists.
* **Numbers**: give constants to 4 significant figures in prose ($0.5772$), and do not claim more precision
  than the formula gives.

## Page layout

The page scripts (`pages/distribution.js`, `pages/relation.js`) build every page in the same order. The top of
the page is kept short so that the interactive plots are visible **without scrolling on a laptop screen**
(1280x720 and 1440x900 CSS pixels); `npm run layout` checks this for every page.

**Distribution pages** (`distribution.html?d=<id>`):

1. **Page head** (`.page-head.page-head-compact`): eyebrow (kind), the name (`h1.dist-title`), the summary
   (`p.lede[data-role="summary"]`: `content.summary`, or, when a module has none, the first one or two
   sentences of the first `description` paragraph), and one row with the toggle button **More about this
   distribution** / **Show less** (`aria-expanded`, `aria-controls="about-more"`) and the "On this page" links.
   Directly under the summary is the common-uses line (its opening words "Used for" are shown in bold as the label; a sentence with another opening gets a bold "Common uses:" label) (`p.common-uses[data-role="common-uses"]`, the
   catalog's `commonUses`, in smaller text). The toggle expands the summary in place: while the region
   `#about-more` (the full `description` and the chips: group, and whether it is a core distribution or only in the full map) is shown, the summary is
   hidden, so nothing is read twice, and the common-uses line moves to the end of the description, before the
   chips; the toggle row follows the text.
2. **Formulas strip** (`#formulas`): the PDF/PMF and the CDF side by side (stacked on phones), each with a small
   heading (`pdfTitle`, `cdfTitle`). A formula that is slightly too wide is shrunk (down to 72%). On a narrow
   screen (formulas stacked, at most 760 px), a formula that would shrink below 80% is first split into lines
   at its top-level wide spaces (`,\qquad`, `,\quad`: write the support or side condition after one) and then
   before each `=` after the first (`ui.js` `fitDisplayFormula`); anything still wider scrolls sideways. Under them the toggle **What the symbols mean**
   (`aria-controls="formula-symbols"`) opens both glossaries side by side, each preceded by `pdfIntro` /
   `cdfIntro` when given. Every symbol is still explained there.
3. **Interactive explorer** (`#explorer`, `.explorer-section`): the plots first, then the parameter boxes in
   one row across the explorer, then the area tool and the summary of values side by side, then the hint.
   `content.explorerIntro` follows the explorer card as "How to use the explorer".
4. Then, as the reader scrolls: **Properties**, **Limits and special cases**, **Uses**, **Parameters and
   conventions** (`#parameters`: the parameter list, the parameterization callout and any `extraFormulas`),
   **Related distributions**, **References**.

**Relationship pages** (`relation.html?r=<id>`): the page head (eyebrow, From → To, the summary: the module's
`summary`, or the first one or two sentences of `plain`; a row with **More about this relationship**, which
expands the summary in place to the region `#about-more`: the `title` sentence, all of `plain`, the map arrow
kind and chips, with the summary hidden meanwhile; the relation's label and the "On this page" links); the
**formal statement** (`#statement`, one line per sentence; on a phone a line that is still too wide after
shrinking is set as inline math that wraps between words and after relations) with the toggle **What the
symbols mean** (`aria-controls="statement-symbols"`); the **interactive demonstration** (`#demo`), whose plots should start
inside a 1440x900 screen; then **Why this is true**, **The distributions involved**, **References**, and links
to the previous and next relationship.

### Summaries

`content.summary` (distribution modules) and `summary` (relation modules) is the text under the title. Format:

* a **string** of rich text (HTML allowed, inline TeX between `$...$`; no display math, no lists);
* **1–3 plain sentences, about 150–300 characters** (the tests accept 100–330 visible characters, counting each
  TeX command as one character, and at most 3 sentences);
* it **must render in at most 3 lines at 1280 px** in the page head (about 135 characters per line; inline
  fractions and tall TeX make a line taller, so prefer `$1/K$` to `$\frac{1}{K}$`);
* it says what the distribution describes (or what the relationship states) and its parameters in everyday
  words, the way the first sentences of `description` would. The full `description` (or `plain`) is still
  shown in its place when the reader clicks "More about this distribution", so the summary may repeat its
  opening (the reader never sees both at once);
* same style rules as all prose: TeX for symbols and Greek letters, no slogans, no exclamation marks.

Example (normal): `'The normal distribution describes a continuous quantity that clusters symmetrically around
a mean $\\mu$, with spread set by the standard deviation $\\sigma$. Sums and averages of many independent effects
tend toward it, which is why it underlies many statistical tests.'`

### Plot sizes and the layout test

The explorer and demo cards (`.explorer`, `.demo`) define the CSS variable **`--plot-h`**, the height a main
plot should have on a laptop screen. By default it grows with the viewport height
(`clamp(220px, 19.5vh + 110px, 440px)`); the page script then calls `plot.fitToViewport(section)`, which sets
`--plot-h-fit` on the section so that the first main plot fits between its top and the bottom of the viewport,
leaving room for the parameter boxes under it when the plot can still be at least 260 px tall (1440x900), and
re-fits on window resize. Opening "More" or the symbols does not change it.

Plots read it through their `height` option (`core/plot.js`):

* `height: 'css'`, or
* `height: (w, H) => ...`, where `H` is `--plot-h` in px (NaN when not set). The helper
  `fitHeight(w, H, { ratio, phoneRatio, min, max })` returns `H` capped at `ratio · w` on desktop and
  `phoneRatio · w` in a phone-width column (`w < 480`); the standard explorer uses
  `fitHeight(w, H, { ratio: 0.62, phoneRatio: 0.78, min: 200, max: 440 })`, and the demo helpers in
  `core/demos.js` use `fitHeight(w, H, { ratio: 0.62, phoneRatio: 0.7, min: 220, max: 400 })`, which is the
  recommended setting for a hand-written demo with two plots side by side.

A hand-written demo or custom explorer puts its plots first, then the readout and the controls, and its
introduction text after them, so that the plots start near the top of the card. Extra buttons appended to a
parameter panel's `.param-actions` (next to "Reset parameters") form one row across the explorer.
A link to a section (`distribution.html?d=normal#uses`) scrolls there after the page is built and keeps the
section in place while the plots settle (`ui.js` `scrollToHash`).

`npm run layout` (`tests/layout.mjs`) measures, for every distribution page at 1280x720 and 1440x900 with the
page scrolled to the top: the summary has at most 3 lines (at 1280), the **bottom of every main plot's SVG is
inside the viewport**, at 1440x900 the **parameter boxes** (`.explorer-params .param-input`) are inside the
viewport, the "Common uses:" line is shown inside the viewport above the plots (and stays visible while "More
about this distribution" is open), the two toggles work, and at 390 px there is no horizontal scroll. Main plots are found by
`data-role`: the standard explorer marks its two plot boxes `data-role="pdf-plot"` and `data-role="cdf-plot"`;
**a custom explorer must mark its main plot box(es) with `data-role="main-plot"`** (the element that contains
the `Plot`, e.g. the `.plot-box` div), and those are measured instead. For relationship pages it checks the
summary, that the formal statement is inside the viewport, the "More" toggle, the phone width, and warns when
the top of the demo's first plot is below a 1440x900 screen.

## Conventions (from the catalog; repeat them on pages)

Geometric = number of **failures** before the first success (support 0, 1, 2, ...), so Geometric(p) = NegBin(1, p).
NegBin = failures before the r-th success, r any positive real. Exponential uses **rate** λ. Gamma uses shape α,
**rate** β (mention the scale θ = 1/β form). Inverse-gamma uses shape α, **scale** β. Weibull uses shape k,
**scale** λ. Log-normal μ, σ are the mean and SD of ln X. Ex-Gaussian τ is the exponential **mean**. Wald uses
mean μ and shape λ; drift rate is v. Gumbel is the maximum type. Student t is the standard form (location 0, scale 1).
The full text is `CATALOG.conventions` (shown on the About page); explain the symbol clashes on your page.

## Catalog (`assets/js/catalog.js`)

```js
import { CATALOG, DISTRIBUTIONS, RELATIONS, NOTATION, EDGE_KINDS, KIND_LABELS, GROUP_ORDER,
         getDist, getRelation, relationsOf, catalogParams, notationFor } from '../catalog.js';
```

* Distribution entry: `{ id, name, kind, group, onOriginalMap, whyAdded, commonUses, commonUsesText,
  parameterization, parameterizationText, params, support, blurb, mapPos:{col,row} }`. `kind` is
  `'discrete' | 'continuous' | 'multivariate-discrete' | 'multivariate-continuous'`. `parameterization`,
  `whyAdded` and `commonUses` are rich text (see below); `parameterizationText` and `commonUsesText` are plain
  unicode versions for places that cannot show TeX (aria labels, tooltips). `support` is TeX.
* `commonUses` is one sentence of about 15-30 words on the distribution's most common uses in frequentist
  statistics, Bayesian statistics and computational modeling. Every entry starts with "Used for", ends with a
  single period, avoids symbols, and does not repeat the summary. It is written directly in
  `tools/catalog.source.json` (the build script fails if one is missing) and is shown under the summary on the
  distribution page ("Common uses: ...") and in the hover card of the map tiles. `npm test` checks the format.
* Param spec: `{ sym (TeX), key (JS identifier, e.g. 'mu', 'd1', 'alpha1', 'xm'), label (unicode, e.g. 'μ'),
  name, meaning (rich text), meaningText (plain unicode), domain (TeX), default, min, max, integer }`.
  `min`/`max` bound the sliders **and** the values accepted from the number boxes.
* Relation entry: `{ id: 'from--to', from, to, bidirectional, kind, label (TeX), statement (TeX),
  plain (rich text), plainText, onOriginalMap }`.
* `NOTATION`: `[{ sym (TeX), plain (rich), plainText, match }]`; `notationFor(tex)` returns the entries used
  in a TeX string. `CATALOG.conventions` is an array of rich-text sentences.
* `catalogParams(id, overrides)` returns a mutable copy of a distribution's params, with per-key overrides,
  e.g. `catalogParams('student-t', { nu: { log: true } })`.
* The catalog is frozen. To change it, edit `tools/catalog.source.json` (data) or `tools/catalog_rich.py`
  (the rich-text prose) and run `python3 tools/build_catalog.py`. Only the catalog owner does this.

**Rich text** (used by all prose fields in the catalog and in modules) is trusted HTML in which `$...$` is
inline TeX and `$$...$$` display TeX. Write a literal dollar sign as `\\$`. In JS strings double the
backslashes (`'$\\mu$'`). Render it with `ui.rich(tag, text)` or `ui.renderRich(el, text)`.

## Distribution module API

A distribution module default-exports one plain object. Everything must be importable in Node (no DOM
access at import time; only `customExplorer` may touch the DOM).

| field | required | description |
|---|---|---|
| `id` | yes | catalog id; must equal the file name |
| `name` | yes | display name (use the catalog name) |
| `kind` | yes | must equal the catalog `kind` |
| `params` | yes | param specs, normally `catalogParams(id)`; extra fields below |
| `pdf(x, p)` | yes | density (continuous) or PMF (discrete; `x` is an integer, return 0 off the support and for non-integers). Multivariate: `pdf(xVector, p)` |
| `cdf(x, p)` | yes* | P(X ≤ x). For discrete, must be a right-continuous step function for any real x (use `Math.floor(x)`) |
| `sf(x, p)` | no | 1 − F(x), computed accurately in the upper tail (used for "right of x" areas) |
| `quantile(u, p)` | no, recommended | inverse CDF; discrete: smallest k with F(k) ≥ u (`math.quantileDiscrete` helps) |
| `sample(rng, p)` | no, recommended | one random draw; `rng` is `math.makeRng(seed)` (has `normal`, `gamma`, `poisson`, ...) |
| `range(p)` | yes* | **true** support `[lo, hi]` (may be ±Infinity). Used by tests and for integration |
| `support(p)` | yes | **finite plotting window** `[lo, hi]` that contains nearly all the probability (e.g. μ ± 4.5σ, or the 0.0005 and 0.9995 quantiles; for heavy tails such as the Cauchy, a window that shows the shape, e.g. x0 ± 12γ). Discrete: integer endpoints |
| `stats(p)` | yes | `{ mean, variance, sd, median, mode, skewness, exKurtosis, entropy }`, **all numbers**. Use `NaN` for undefined values (Cauchy mean) and `Infinity` for infinite ones, and explain these in `content.properties`. Entropy in nats. If the median has no closed form, use `quantile(0.5, p)` |
| `handles` | yes* | array of handle specs, or `p => array` (see below) |
| `normalize(p, changedKey)` | no | return a corrected params object after any change (enforce `a <= b`, resize vectors, ...). Called with `changedKey = null` for the defaults |
| `check(p)` | no | return an error message string if `p` is invalid (cross-parameter rules), else `null`. It is applied after `normalize`, so a typed value can push another parameter along. Typed values that fail are shown as an inline message and not applied; drags that fail are ignored |
| `testParams` | no, recommended | extra parameter sets (partial objects) for the node tests; include edge-ish but valid values (small and large shapes, a shape below 1 if allowed) |
| `explorer` | no | explorer options (below) |
| `content` | yes | page text (below) |
| `customExplorer(container, ctx)` | no | replaces the standard explorer (multivariate distributions, categorical bars, ...) |
| `checks(p, math)` | multivariate: yes | numeric self-checks for the tests (see [Custom explorers](#custom-explorers-multivariate-categorical)) |

\* Multivariate modules may omit `cdf`, `range` and `handles` and provide `customExplorer` instead.

Extra param-spec fields a module may add (via `catalogParams(id, overrides)`):
`step` (keyboard/arrow-key step), `dragStep` (snap resolution while dragging), `log` (true/false: log-scaled
slider; default is automatic when `min > 0` and `max/min >= 50`), `hidden` (do not show in the panel).

### Handles

Handles are the amber things the user drags. Each spec says which parameter it controls and where it is
drawn, as functions of the current params `p`. All coordinates are **data units** (x in the variable's
units, y in density units). While a handle is dragged, the explorer converts the pointer position to data
units and calls `set(pt, p, p0)` (`pt = {x, y}`, `p` = current params, `p0` = params when the drag started).
`set` returns a patch object (`{ sigma: 1.3 }`, or several keys). The explorer then clamps each value to
`[min, max]`, rounds integer params, snaps to the drag resolution, applies `normalize` and `check`, and redraws.
The x axis stays fixed during a drag and refits smoothly when the drag ends, so one drag can reach only the
edge of the current view; a second drag can go further.

| type | geometry fields | default `set` | drawn as | typical use |
|---|---|---|---|---|
| `vline` | `x(p)` (default `p[param]`) | `{[param]: pt.x}` | dashed vertical line with a knob at the top | location (mean, mode, median, x0, μ) |
| `hArrow` | `from(p)`, `to(p)` → `{x, y}`; the knob is at `to` | `{[param]: pt.x - from(p).x}` | horizontal arrow with a tick at `from` | scale (σ, b, s, γ) measured from the center outward |
| `vArrow` | `from(p)`, `to(p)` | `{[param]: pt.y - from(p).y}` | vertical arrow | a height: Bernoulli p, Pareto α via the density at x_m, a peak height mapped to a shape |
| `point` | `at(p)` → `{x, y}` | **must supply `set`** | free knob | two parameters at once, e.g. drag the peak to set mode and spread |
| `xPoint` | `x(p)`, optional `lineTo(p)` (dashed line up to that y) | `{[param]: pt.x}` | triangle under the x axis | an endpoint or a count: n of a binomial, a or b of a uniform, x_m of a Pareto |

Optional on every handle: `id` (default `type-param`), `label` (short unicode text drawn next to the knob,
default the param's unicode label), `ariaLabel`, `color: 'steel'` (rarely; colors the knob, line and arrow),
`cls`, `keyX`/`keyY` (which param the arrow keys change for `point` handles; default `param`). A handle whose
position is not finite at the current parameters is hidden until the position is defined again.

Arrow keys. By default a focused handle's arrow keys step its `param` (or `keyX`/`keyY`) by the param's `step`.
When the handle sits at a function of several parameters (a mean line that keeps α + β, a standard-deviation
arrow that keeps the mean, a knob that slides a whole interval), that moves the knob the wrong way or changes
the wrong thing. Then use one of:

* `key: 'drag'`: each key press moves the knob by 1% of the view (10% with Shift) and applies the handle's
  `set`, exactly as if it had been dragged that far. This is the usual choice.
* `key: (steps, axis, p) => patch`: full control (`steps` is ±1 or ±10, `axis` is `'x'` or `'y'`).
* `keySign: -1`: keep the default behavior but reverse the direction (for a knob that moves opposite to its
  parameter).

Mapping rules:

* **Drag the thing whose position the parameter controls.** If the parameter is a location, the handle is at
  that location; if it is a scale, the arrow's length is the scale (or a quantity proportional to it, like the
  mean of an exponential).
* **When the handle sits at a function of the parameters, invert it in `set`.** Geometric mean
  $m = (1-p)/p$: `set: pt => ({ p: 1 / (1 + Math.max(pt.x, 0)) })`; exponential mean:
  `set: pt => ({ lambda: 1 / Math.max(pt.x, 1e-6) })`. When there is no closed-form inverse, use
  `math.solveMonotone(g, target, lo, hi, { log })`, e.g. for the Student t peak height:
  `set: pt => ({ nu: solveMonotone(nu => tPdf(0, nu), pt.y, 0.5, 100, { log: true }) })`.
* **Keep the other parameters fixed in the way the user expects.** Moving the mean of a gamma should keep its
  shape (change β only); moving the mean of a beta should keep α + β. Use `p0` when the patch should be
  computed relative to the start of the drag.
* **Integer parameters** (n, k, d1, ...) are rounded by the explorer; an `xPoint` at `x = n` is the natural
  handle for a count that is also the right end of the support.
* **Do not stack handles**: two knobs must not sit on top of each other at the default parameters. Put arrows
  at different heights (e.g. the normal's σ arrow sits at the inflection point).
* Constraints between parameters (a ≤ b, K ≤ N) go in `normalize(p, changedKey)`. Push the *other* parameter
  along (`if (changedKey === 'a' && p.a > p.b) p.b = p.a`), so that a drag never gets stuck.

#### Recommended handles

Use this plan unless you have a clearly better idea (then describe it in `explorerIntro`). "Box" means the
parameter is set only with its number box and slider.

| distribution | handles |
|---|---|
| discrete-uniform | `xPoint` a, `xPoint` b; `normalize` keeps a ≤ b by pushing the other end |
| bernoulli | `vArrow` from (1, 0) to (1, p) on the bar at 1: `set: pt => ({ p: pt.y })` |
| categorical | `customExplorer`: one bar per category with a `vArrow` handle on each bar; K by box (example below) |
| binomial | `xPoint` n at x = n; `vline` at the mean np with `set: (pt, p) => ({ p: pt.x / p.n })` |
| multinomial | `customExplorer` (see UI NOTES in `CATALOG.notes`: K = 2 bars, K = 3 ternary grid, K ≥ 4 marginal bars and a sample) |
| hypergeometric | `vline` at the mean nK/N setting K (`K = round(x N / n)`); `xPoint` n at x = n; N by box; `normalize` keeps K ≤ N and n ≤ N |
| geometric | `vline` at the mean (1 − p)/p: `p = 1/(1 + x)` |
| negative-binomial | `vline` at the mean r(1 − p)/p setting p with r fixed: `p = r/(r + x)`; r by box |
| poisson | `vline` at λ |
| beta-binomial | `xPoint` n; `vline` at the mean nα/(α + β) moving the mean with α + β fixed; α, β also by box |
| uniform | `vline` a and `vline` b (labels a, b); `normalize` keeps a < b by pushing the other end |
| exponential | `hArrow` from (0, f(1/λ)) to (1/λ, f(1/λ)), i.e. to the mean: `lambda = 1/x` |
| gamma | `vline` at the mean α/β (keeps α, sets β = α/x); `hArrow` from the mean to mean + sd at f(mean + sd), keeping the mean: α = (m/sd)², β = m/sd² |
| weibull | `vline` at λ (about the 63rd percentile); k by box, or a `vArrow` at the mode mapped with `solveMonotone` |
| normal | `vline` μ; `hArrow` μ → μ + σ at the inflection height (reference module) |
| log-normal | `vline` at the median e^μ (`mu = ln x`); `hArrow` from the median to e^(μ+σ) (`sigma = ln x − mu`) |
| student-t | `vArrow` at x = 0 from 0 to the peak f(0): ν from the peak height with `solveMonotone`; overlay the standard normal (`explorer.overlays`) |
| chi-squared | `vline` at the mean k (integer) |
| beta | `vline` at the mean α/(α + β) keeping α + β; `hArrow` from the mean to mean + sd keeping the mean (κ = m(1 − m)/sd² − 1, α = mκ, β = (1 − m)κ) |
| f | d1, d2 by box (log sliders); show the 95th percentile as an `extraLayers` marker; optional `vline` at the mean d2/(d2 − 2) setting d2 |
| cauchy | `vline` x0; `hArrow` from x0 to x0 + γ at half the peak height (half-width at half-maximum) |
| half-cauchy | `hArrow` from 0 to γ (the median) at f(γ) |
| laplace | `vline` μ; `hArrow` μ → μ + b at f(μ + b) |
| logistic | `vline` μ; `hArrow` μ → μ + s at f(μ + s) |
| inverse-gamma | `vline` at the mode β/(α + 1) (sets β, keeps α); α by box |
| dirichlet | `customExplorer`: density on the triangle (`heatmap` + `polygon`), a `point` handle at the mean that moves the mean with α₀ fixed, α₁..α₃ by box, optional sample dots |
| multivariate-normal | `customExplorer`: `heatmap` of the density plus 1- and 2-SD ellipses (`polygon`), `equalAspect`; a `point` at (μ₁, μ₂), knobs at (μ₁ + σ₁, μ₂) and (μ₁, μ₂ + σ₂), ρ by box (or a knob on the 1-SD ellipse) |
| von-mises | `vline` μ on [−π, π); `vArrow` at the peak with κ from the peak height via `solveMonotone` (κ ≥ 0) |
| ex-gaussian | `vline` μ; `hArrow` μ → μ + σ at about 0.6 × peak; `hArrow` μ → μ + τ at about 0.25 × peak (so they do not overlap) |
| wald | `vline` at the mean μ (keeping λ); λ by box or a `vArrow` at the mode via `solveMonotone` |
| pareto | `xPoint` x_m; `vArrow` from (x_m, 0) to (x_m, α/x_m), the density at x_m: `alpha = pt.y * p.xm` |
| gumbel | `vline` at the mode μ; `hArrow` μ → μ + β at f(μ + β) |

### Explorer options (`explorer`)

```js
explorer: {
  xLabel: 'k',                       // axis variable name (default 'x' / 'k' for discrete)
  varName: 'K',                      // name of the random variable in captions and the area readout (default 'X')
  areaLabels: ['c', 'd'],            // labels of the two "Between" boundaries of the area tool (default a, b)
  pdfCaption, cdfCaption,            // override the plot captions (plain text)
  readouts: [                        // the "Summary at these parameters" list
    { key: 'mean', label: 'Mean' },  // value read from stats(p)[key]
    { label: 'P(X = 0)', value: (p, stats) => ... },   // or computed (number or string)
  ],
  overlays: p => [                   // extra curves with a legend (e.g. normal approximation)
    { id: 'normal', label: 'Normal approximation', pdf: x => ..., cdf: x => ..., cls: 'curve-ref' },
    // on a discrete page, stems: true draws a reference PMF as grey stems (optional offset shifts them sideways)
    { id: 'binom', label: 'Binomial with the same mean', pdf: k => ..., stems: true, offset: 0.25 },
  ],
  // plot layers (see the plot.js header), e.g. a mean marker. `state` = { area: {on, mode, a, b}, dragging }
  // (dragging is the id of the handle being dragged, or null). A layer with `under: true` is drawn below the
  // curve and its fill instead of on top.
  extraLayers: (p, view, state) => [ ... ],
  areaDefault: p => x,               // initial threshold for the area tool (default: median)
  yMax: p => number,                 // cap the y axis (e.g. densities that are infinite at 0)
}
```

Layer classes available in CSS: `curve-main`, `curve-ref` (dashed warm grey), `curve-2`, `curve-thin`,
`pdf-fill`, `area-shade`, `fill-steel`, `bars-strong`, `pmf`, `pmf-on`, `pmf-ref`, `ref-line`, `guide`,
`mean-line`, `marker`, `outline` (polygons without fill), `muted` (smaller grey text labels and grey dots;
`mean-label` is an alias for text).

Discrete pages draw stems only on the true support `range(p)`, so the room left for dragging past `n` stays
empty. The x window shrinks back when a count such as `n` gets smaller, and the y axis shrinks when the peak
falls below 60% of its height.

### Content

```js
content: {
  summary: 'One to three sentences under the title (rich text, about 150-300 characters, at most 3 lines).',
  description: ['paragraph', 'paragraph'],   // or one string. What it describes, what values it takes, its parameters
  explorerIntro: 'What the two plots show and what each handle does.',   // shown under the explorer
  parameterization: '...',                  // optional rich text; default is the catalog text
  pdfTex: 'f(x \\mid \\mu,\\sigma) = ...',  // display TeX (discrete: P(X = k) = ...)
  glossary: [{ sym: 'TeX', meaning: 'rich text' }],     // every symbol in pdfTex
  cdfTex: 'F(x) = ...',
  cdfGlossary: [{ sym, meaning }],          // every symbol in cdfTex (special functions explained in words)
  pdfIntro, cdfIntro, pdfTitle, cdfTitle,   // optional
  extraFormulas: [{ title, intro, tex, glossary }],   // optional (hazard function, likelihood, posterior update)
  properties: [                             // table: name | formula | live value | explanation
    { name: 'Mean', tex: '\\mathrm{E}[X] = \\mu', value: p => p.mu, explain: 'rich text' },
  ],
  limits: [                                 // limits and special cases (see the rules above)
    { text: 'rich text', relation: '<catalog relation id>', to: '<catalog distribution id>' },
  ],
  uses: { frequentist: [...], bayesian: [...], modeling: [...] },   // rich-text list items, all three non-empty
  references: [{ text: 'rich text', url: 'https://...' }],
}
```

The glossary's symbol column is narrow; write `\\dfrac` there if `\\frac` would be too small to read.

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
finite `lo` (hi may be Infinity). `support(p)` returns integer plotting bounds (for an unbounded support, about
the 0.9995 quantile). The explorer draws lollipop stems and a step CDF, snaps the area threshold to integers and
reports P(X ≤ k), P(X > k) and P(a < X ≤ b). The y axis of a PMF is capped at 1.08.

* Compute PMFs in log space: `Math.exp(logBinom(n, k) + k * Math.log(p) + (n - k) * Math.log1p(-p))`, with
  the edge cases p = 0 and p = 1 handled separately.
* CDFs: use the incomplete beta and gamma identities where they exist (binomial: `betaIc(p, k + 1, n - k)`;
  Poisson: `gammaQ(k + 1, λ)`; negative binomial: `betaI(p, r, k + 1)`); otherwise sum the PMF.
* The median of a discrete distribution is the smallest k with F(k) ≥ 1/2 (`quantileDiscrete`), and the mode
  is a highest point of the PMF (when two values tie, give the larger and say so). The tests check both.
* Entropy is in nats; when there is no closed form (binomial, Poisson) compute it in `stats` by summing
  −p log p over the support (a few hundred terms is fine).

**State that is not a catalog parameter.** The categorical and multinomial distributions have a probability
vector that is not a scalar parameter. Keep it in the params object under a key that is not a param key
(`p.probs`), create and resize it in `normalize(p, changedKey)` (uniform when missing or when K changes), and
make `pdf`, `cdf` and `stats` work with `p.probs` (the tests call them with the defaults after `normalize`).
Put a non-uniform vector in `testParams`.

### Custom explorers (multivariate, categorical)

`customExplorer(container, ctx)` builds its own interactive graphic inside `container` (an empty div in the
"Interactive explorer" section). It may be `async`. `ctx` contains:

```js
ctx = {
  store,            // ui.createStore({ p, area }): ctx.store.get().p, ctx.store.set({ p: newP }), ctx.store.subscribe(fn)
                    // Keep params in the store so the properties table (value column) updates live.
  dist,             // the module itself
  catalogEntry,     // the catalog entry
  math, plot, ui, catalog, demos,      // the core libraries (same as importing them)
  loadDist(id), loadRelation(id),      // promise of another module (null if not written yet)
  hasDist(id), hasRelation(id),
  mountExplorer(container, mod, { store }), defaultParams(mod),   // reuse the standard explorer if helpful
}
```

**Layout and sizing of a custom explorer.** The container is the same as for the standard explorer (an empty
div in `#explorer`, right under the formulas strip), and the page fits the plots to the screen after
`customExplorer` returns (see [Plot sizes and the layout test](#plot-sizes-and-the-layout-test)). To pass
`npm run layout`:

* build the same structure: `div.explorer` > `div.explorer-plots` (one or two `figure.plot-fig`, each a short
  one-line `figcaption` and a `div.plot-box`) > `div.explorer-controls` (`.explorer-params`, then
  `.explorer-area` and `.explorer-readouts`) > `p.explorer-hint`. On desktop the parameter boxes form one row
  directly under the plots; on phones (≤ 760 px) the parts are stacked in the order plot, parameters, area
  tool, second plot, readouts (CSS `order`);
* mark the main plot box(es) — the plots that must be visible at the top, normally the one or two plots of
  `.explorer-plots` — with `data-role="main-plot"`;
* size those plots with `height: (w, H) => ctx.plot.fitHeight(w, H, { ratio, phoneRatio, min, max })` (or
  `height: 'css'`), not a fixed number or a height from the width alone. `H` is about 250 px at 1280x720 and
  290–330 px at 1440x900. For an equal-aspect view (triangle, ellipses) use a ratio near 0.86;
* put further plots (a polar view, a bar chart of concentrations, a joint triangle for K = 3, a second row of
  plots) **after** `.explorer-controls` or beside the main plots, not between the plots and the parameter
  boxes, and keep long explanations in `content.explorerIntro` (shown under the explorer), not in the card.

A custom explorer uses the **raw plot API**: `new ctx.plot.Plot(el, opts)` and `plot.render(scene)` with layer
and handle descriptors as documented at the top of `core/plot.js`. Raw handle descriptors carry their own
callbacks: `{ id, type, x | from/to | at, label, ariaLabel, valueText, valueNow, valueMin, valueMax,
onDrag(pt, phase), onKey(steps, axis) }` (`phase` is `'start' | 'move' | 'end'`; `pt` is `null` on a cancelled
drag). Use the same CSS structure as the standard explorer so that it looks the same. A working example for the
categorical distribution (bars whose tops are dragged):

```js
customExplorer(container, ctx) {
  const { plot, ui, store, dist: mod } = ctx;
  const { h } = ui;
  const box = h('div', { class: 'plot-box' });
  const panelBox = h('div', { class: 'explorer-params' }, h('h3', { class: 'mini-title' }, 'Parameters'));
  container.append(h('div', { class: 'explorer' },
    h('figure', { class: 'plot-fig' }, h('figcaption', {}, 'Probability of each category'), box),
    h('div', { class: 'explorer-controls' }, panelBox),
    h('p', { class: 'explorer-hint' }, 'Drag the top of a bar, or type values in the boxes.')));
  const P = new plot.Plot(box, { xLabel: 'category k', yLabel: 'probability' });
  const apply = patch => store.set({ p: mod.normalize({ ...store.get().p, ...patch }, Object.keys(patch)[0]) });
  const panel = ui.paramPanel(panelBox, mod.params, {
    get: () => store.get().p,
    apply: (key, v) => apply({ [key]: v }),
    onReset: () => store.set({ p: ctx.defaultParams(mod) }),
  });
  // set category i to v and rescale the others so that the total stays 1
  const setOne = (probs, i, v) => {
    v = Math.min(0.99, Math.max(0.01, v));
    const rest = probs.reduce((s, q, j) => s + (j === i ? 0 : q), 0);
    return probs.map((q, j) => (j === i ? v : rest > 0 ? q * (1 - v) / rest : (1 - v) / (probs.length - 1)));
  };
  function draw() {
    const { p } = store.get();
    const bars = p.probs.map((q, i) => [i + 1, q]);
    P.render({
      x: [0.3, p.K + 0.7], y: [0, 1.05], discreteX: true,
      layers: [{ id: 'bars', type: 'bars', points: bars, width: 0.6, cls: 'bars-strong' }],
      handles: bars.map(([k, q]) => ({
        id: 'p' + k, type: 'vArrow', from: { x: k, y: 0 }, to: { x: k, y: q }, label: ui.texLabel('p_' + k),
        ariaLabel: `Probability of category ${k}. Drag up or down, or use the arrow keys.`,
        valueText: ui.fmt(q, 3), valueNow: q, valueMin: 0, valueMax: 1,
        onDrag: pt => { if (pt) apply({ probs: setOne(store.get().p.probs, k - 1, pt.y) }); },
        onKey: steps => { const cur = store.get().p.probs; apply({ probs: setOne(cur, k - 1, cur[k - 1] + 0.01 * steps) }); },
      })),
    });
  }
  store.subscribe(() => { panel.update(store.get().p); draw(); });
  draw();
},
```

Building blocks for 2-D views (all in `core/plot.js`; see its header):

* `new Plot(el, { equalAspect: true, ... })` keeps one data unit the same length on both axes (contour plots,
  the simplex triangle).
* `{ type: 'heatmap', x: [x0, x1], y: [y0, y1], nx, ny, values }` draws a density image; NaN cells are
  transparent, so a Dirichlet density can be drawn on a triangle by filling the cells outside it with NaN.
  80–120 cells per side are enough; recompute the values only when the parameters change.
* `{ type: 'polygon', points, cls }` for the simplex outline (`cls: 'outline'`) and for probability ellipses.
  The k-SD ellipse of a bivariate normal is μ + k·L·(cos t, sin t), with L the Cholesky factor of Σ
  (L₁₁ = σ₁, L₂₁ = ρσ₂, L₂₂ = σ₂√(1 − ρ²)). In two dimensions the k-SD ellipse holds $1 - e^{-k^2/2}$ of the
  probability (39% for k = 1, 86% for k = 2); say so in the explorer text.
* Simplex coordinates for K = 3: a probability vector (p₁, p₂, p₃) is drawn at x = p₂ + p₃/2, y = (√3/2)·p₃;
  conversely p₃ = 2y/√3, p₂ = x − p₃/2, p₁ = 1 − p₂ − p₃. Label the corners with `text` layers.
* `point` handles for 2-D positions; `onKey(steps, axis)` receives `axis = 'y'` for the up and down keys.
* Under the plot, keep the parameter panel and a summary list (`.explorer-readouts` with a `dl.readouts`), as in
  the standard explorer.

**Tests for multivariate modules.** The generic numeric tests cannot integrate a multivariate density, so a
multivariate module must provide `checks(p, math)`, returning at least two checks
`[{ name, got, expected, tol }]`: one for normalization and one for the mean, plus others you can compute
(variance, a marginal, a covariance). Example for the bivariate normal (pdf takes `[x1, x2]`):

```js
checks(p, M) {
  // Integrate over finite windows where the density actually is: M.integrate over an infinite range, or over a
  // wide box, can miss a narrow peak. Here the inner window follows the conditional distribution of X2 given X1.
  const [a1, b1] = [p.mu1 - 10 * p.sigma1, p.mu1 + 10 * p.sigma1];
  const sc = p.sigma2 * Math.sqrt(1 - p.rho ** 2);                       // conditional SD of X2 given X1
  const mc = x1 => p.mu2 + p.rho * p.sigma2 / p.sigma1 * (x1 - p.mu1);   // conditional mean of X2 given X1
  const inner = x1 => M.integrate(x2 => pdf([x1, x2], p), mc(x1) - 10 * sc, mc(x1) + 10 * sc);
  const total = M.integrate(inner, a1, b1);
  const m1 = M.integrate(x1 => x1 * inner(x1), a1, b1);
  return [
    { name: 'density integrates to 1', got: total, expected: 1, tol: 1e-6 },
    { name: 'E[X1] = mu1', got: m1, expected: p.mu1, tol: 1e-6 },
  ];
},
```

For multivariate-discrete distributions, enumerate the support (all count vectors that add up to n) and sum.
Multivariate modules still provide `stats(p)` with the same keys; use the values for the first component (or
NaN) and describe the vector-valued properties in `content.properties`.

## Relation module API

`assets/js/relations/<from>--<to>.js` default-exports:

| field | required | description |
|---|---|---|
| `id`, `from`, `to` | yes | must match the catalog entry exactly |
| `title` | no | a longer descriptive title (a plain sentence), shown at the top of the "More about this relationship" region and in the browser tab |
| `summary` | recommended | rich text, 1–3 sentences shown under the heading (format in [Summaries](#summaries)); default: the first one or two sentences of `plain` |
| `plain` | yes | rich text or array of paragraphs: the plain-language explanation (may extend the catalog `plain`), shown under "More about this relationship" |
| `statementTex` | yes | TeX; normally the catalog `statement` (`getRelation(id).statement`). Long statements are split into lines at top-level `.\ `, `;\quad` and `;\ ` |
| `glossary` | yes | `[{sym, meaning}]` explaining **every** symbol in the statement (the tests check Greek letters) |
| `why` | yes | array of rich-text paragraphs and `{ tex: '...' }` display formulas: a derivation or the intuition, at the level of an undergraduate statistics course |
| `demo(container, ctx)` | yes | builds the interactive demonstration (may be async) |
| `references` | yes | `[{text, url}]` |

`ctx` for demos: `{ math, plot, ui, catalog, demos, loadDist, loadRelation, hasDist, hasRelation, mountExplorer,
defaultParams, relation (catalog entry), from, to (catalog entries) }`. A demo should be self-contained: compute
what it needs with `math` (as the reference modules do) rather than importing another distribution module,
which may not exist yet. For a bidirectional relation, show both directions (e.g. two views switched with
`ui.segmented`, or two demos one above the other).

### Demo helpers (`ctx.demos`)

Most relationships fit one of two patterns. Use these helpers so that the demos look and behave alike; write a
custom demo (like `binomial--normal`) only when neither fits (conjugate updating, the Poisson process, choice
models, ...).

**`demos.simulationDemo(container, ctx, opts)`**, for sums, ratios, transformations, mixtures and conditioning:
simulate the left-hand side of the statement and compare it with the target distribution. It draws a histogram
(continuous) or frequency bars (discrete) against the target density or PMF, the sample CDF against the target
CDF with the largest gap marked, a readout with the sample mean and standard deviation and the largest gap
compared with the chance level $1.36/\sqrt n$, a parameter panel, a sample-size switch and a "Draw new samples"
button. See `relations/exponential--gamma.js`.

```js
demo(container, { demos }) {
  demos.simulationDemo(container, null, {
    intro: 'rich text: what is simulated and what to look for',
    params: [{ key: 'n', sym: 'n', name: 'number of waiting times', meaning: '...', min: 1, max: 30, default: 3, integer: true }],
    sample: (rng, p) => { /* return one draw of the left-hand side */ },
    sampleName: 'sums of n exponentials',               // legend label (plain text)
    target: { name: p => 'Gamma(α = 3, β = 1) density', pdf: (x, p) => 0, cdf: (x, p) => 0, discrete: false },
    range: p => [0, 10],                                // plotting window (integers if discrete)
    xLabel: 'total waiting time',
    readout: (p, s) => 'extra rich text; s = { n, mean, sd, gap, gapAt, crit }',
  });
}
```

**`demos.compareDemo(container, ctx, opts)`**, for limits and special cases: two distributions overlaid (stems
for a discrete side, a dashed curve for the approximation), the two CDFs with the largest gap marked, and a
readout of the gap. Optional raw handles on the left plot (`handles: (p, set) => [...]`; the x axis stays fixed
while one is dragged). See `relations/poisson--normal.js`.

```js
demos.compareDemo(container, null, {
  intro, params,
  exact:  { name: p => 'Poisson(4)', pdf, cdf, discrete: true },
  approx: { name: p => 'Normal(mean 4, sd 2)', pdf, cdf },
  range: p => [lo, hi], xLabel: 'k (count)', xSym: 'k',
  handles: (p, set) => [ /* raw plot handles; call set({ lambda: 7 }) */ ],
  readout: (p, g) => 'extra rich text; g = { gap, at }',
});
```

Both also accept `check(p)` (an error message, or null) and `normalize(p, changedKey)` (a corrected params
object, applied before `check`; use it to push another parameter along, e.g. raise n when λ is typed above it).
In `simulationDemo`, the `s` passed to `readout` and `onUpdate` also has `xs` (the draws in order) and `sorted`.
Both return `{ store, redraw, plots }` for additions. Param specs use the catalog format and the same keys and
symbols as the distribution pages. Legend labels are plain text: write `Gamma(α = 3, β = 1)`, not TeX.

For a hand-written demo, put controls in a `.demo-controls` div, plots in `.demo-grid` (two columns on desktop,
one on phones) and numbers in a `p.demo-readout` (with `aria-live="polite"`), and use `ui.paramPanel` for
parameters, as in `binomial--normal`. Put the plots first: the helpers draw the plots, then the readout and
controls, then the `intro` text (`p.demo-intro`), so that the plots start inside a laptop screen. Size demo
plots with `height: (w, H) => ctx.plot.fitHeight(w, H)`; the page fits `H` to the screen as on distribution
pages.

## Core libraries (summary)

**math.js**: special functions `lgamma, gamma, lbeta, beta, lfactorial, logBinom, binom, digamma, trigamma,
gammaP, gammaQ, gammaPinv, betaI, betaIc, betaIinv, erf, erfc, erfcx (exp(x²)·erfc(x)), normalPdf, normalCdf,
logNormalCdf (log Φ, accurate in the far tail), normalQuantile, besselI0, besselI1, besselI0e, besselI1e`
(about 1e-12 relative accuracy or better in their usual ranges; tested against 250-digit references);
`integrate(f, a, b, { points })` (adaptive Gauss–Kronrod, infinite limits allowed; **pass break points such as
the plotting window and the mode when a limit is infinite**, otherwise a narrow peak far from 0 can be missed),
`integrateSimpson`, `bisect`, `brent`,
`solveMonotone(g, target, lo, hi, { log })`, `quantileContinuous(cdf, u, lo, hi, guess, scale)`,
`quantileDiscrete(cdf, u, lo, hi, guess)`, `makeRng(seed)` (samplers: `random, uniform, int, normal,
exponential(rate), gamma(shape, rate), beta, chiSquared, studentT, f, cauchy, laplace, logistic, lognormal,
weibull, pareto, gumbel, exGaussian, wald, vonMises, bernoulli, binomial, poisson, geometric (failures),
negativeBinomial, hypergeometric, categorical, multinomial, dirichlet, many`), `mean, variance, histogram, ecdf,
linspace, range, clamp, logSumExp, niceStep, roundTo`, constants `PI, LN_SQRT_2PI, SQRT_2PI, EULER_GAMMA`.

Numerically delicate cases and what to use: the ex-Gaussian density (`logNormalCdf` in log space, never
`exp(...) * normalCdf(...)`); the Wald CDF (`Math.exp(2λ/μ + logNormalCdf(...))`); the von Mises normalizing
constant for large κ (`besselI0e`); binomial, Poisson and negative binomial CDFs (incomplete beta and gamma
functions, not sums, for large n or λ).

**plot.js**: `new Plot(container, { xLabel, yLabel, height, margin, equalAspect, xTicks, yTicks, onBackground })`
(`height`: a number, `'css'` or `(w, H) => px`; see [Plot sizes](#plot-sizes-and-the-layout-test)),
`fitHeight(w, H, opts)`, `fitToViewport(section, opts)` (used by the page scripts), `refreshPlots(root)`,
`plot.render(scene)` (layer types `line, area, stems, bars, step, vline, hline, segment, dot, dots, text,
bracket, polygon, heatmap`; `dots` draws many points in one layer, for scatter plots; handle types `vline,
hArrow, vArrow, point, xPoint`; see the comment block at the top of plot.js). Plot option `bare: true` draws no
axes, grid or axis labels (polar plots, simplex triangles). Legend items take an optional `shape` (`'line'`,
`'box'`, `'dot'`, `'stem'`) for the swatch; the classes `pmf`, `pmf-ref` and `pmf-on` get stem swatches. `DomainAnimator`, `sampleFn(f, a, b, n)`, `niceTicks`, `formatTick`. `render` is cheap; call it on
every change. DOM nodes are reused by `id`. A finger on a handle drags the handle (page scrolling is blocked
only then); a swipe elsewhere on a plot scrolls the page.

**ui.js**: `h(tag, attrs, ...children)`, `renderTex(el, tex, display)`, `tex(src)`, `texToHtml`, `rich(tag, text)`,
`renderRich(el, text)`, `firstSentence(rich)`, `renderTexLines`, `fmt(v, digits)`, `fmtInput`, `parseNumber`,
`createStore`, `paramPanel`, `toggleSwitch(label, on, onChange)`, `segmented(options, value, onChange)`,
`openModal({ title, body, wide, footer, initialFocus })` (accessible dialog: Esc closes, focus is trapped and
starts on `initialFocus` or the close button, returns `close`),
`section(id, title, intro)`, `glossaryList(items, title)`, `referenceList(refs)`, `texLabel(sym)`,
`sentences(rich)`, `leadSentences(rich, maxChars)` (the summary fallback), `disclosure({ id, label, labelOpen })`
(a toggle button with `aria-expanded` and the region it shows), `fitFormula(box, minScale)`.

**explorer.js**: `mountExplorer(container, mod, { store })`, `defaultParams(mod)`.

**demos.js**: `simulationDemo`, `compareDemo` (above).

## Design rules

* Colors come from CSS variables only (`var(--steel-deep)`, ...), so dark mode works automatically.
  **Amber = interactive** (handles, toggles, selected states, the shaded area); **steel = curves**; ink for text.
* Fonts: Fraunces (headings), Inter (text), JetBrains Mono (numbers, `.mono`, `.tnum`).
* Every page must work at 390 px wide with no horizontal page scroll; long formulas scroll inside `.formula`.
* Accessibility: handles are focusable sliders (arrow keys), number boxes have labels, the modal traps focus.

## The map (index.html)

Files: `index.html`, `assets/js/pages/index.js` (builds the map, the view switch, the legend and the list, and
keeps the view in the address), `assets/js/map/*`, `assets/css/map.css`.

* **Two views**, each with its own hand-made layout (`VIEWS` in `map/map.js`):
  `core` ("Core distributions", the default) shows the 15 distributions with `onOriginalMap` and every catalog
  relation between two of them (layout in `map/layout-core.js`); `full` ("Full set of distributions") shows
  every distribution and relation (layout in `map/layout.js`, whose hand-tuned x positions are stretched
  sideways by `SX` = 1.25 at load so that the map fills a wide screen; tiles keep their size). A layout module exports `TILE`, `NODES` (tile
  centers, optional `w`, `h`, `big`, `label`), `WORLD` (size), `ROUTES` (per relation: `bend`, `via`, `r`,
  `fromDx/fromDy/toDx/toDy`, label hints `lt`, `lo`, `fixed`, `ldx/ldy`; see the comment in `layout.js`),
  `GLYPH` (sketch size) and `PHONE_SCALE` (largest scale of the first view on a phone). Each view is one
  `.map-world` element inside the stage that pan and zoom move; the hidden one is `inert`.
  `map.setView('core' | 'full')` cross-fades and fits the new view. The address is `index.html` for the core
  view and `index.html?view=full` for the full view (`history.replaceState`, so the back button returns to
  the same view).
* **Screen fit**: `.home-screen` (the intro row and the map) is exactly the viewport height below the fixed
  72 px header; the frame has 12 px gutters and the map is fitted with 6 px of padding. On a phone the frame
  spans the width, leaves a strip below it for scrolling, and the first view shows the middle of the map at
  a readable scale. The full-screen button still covers the whole window.
* **Over the map** (inside `.map-frame`): zoom buttons (a column at the top right when the map is limited by
  the height of the frame, a row at the bottom right when it is limited by the width; `ctlInsets` in
  `map.js` picks the one that leaves the map larger, and uses spare room at the sides to clear the legend
  button), the "Legend and filters" panel (top left;
  bottom left on phones; open or closed is remembered in `localStorage`) with the arrow-kind filter chips,
  the tile key and the family colors; a card that describes a tile; a line that describes an arrow.
* **Tile card**: on mouse hover and on keyboard focus (not on touch, where a tap opens the page), it shows the
  name, the kind, the first sentence of `blurb` and "Common uses:" from the catalog field `commonUses` (left
  out when the field is missing). It ignores the pointer and sits inside the frame, never over its own tile
  or the map's controls; among positions beside the tile (and, for a tile surrounded by neighbours, a coarse
  grid over the frame) it takes the one that hides least of the neighbours and the arrow labels, then of
  other tiles, with a cost for distance from the tile (`placeCard`). It is the tile's `aria-describedby` while shown, and Esc hides it.
* **Arrow line**: hovering an arrow or its label shows one line describing it, along the bottom (or top)
  edge of the frame where it hides least of the arrow's tiles and label, other tiles and the controls
  (`placeInfo`).
* Relation dialogs use `ui.openModal` (`map/dialog.js`: `plain` rendered with `rich`, `renderTexLines(statement)`,
  a glossary from `notationFor(statement)` and a link to `relation.html?r=<id>`). Tiles show density sketches
  (`map/glyphs.js`). Arrow labels are at least a 32 px target. Below the map: a short "About" section and the
  list view (`map/list.js`), which marks the core distributions and relations.
* `window.__map` (for tests): `view`, `setView`, `views`, `checkLayout(view?)`, `tiles`, `labels`, `edges`, `geo`,
  `labelPos` (of the view shown), `pz`, `setFull`, `card`.

## Tests

* `npm test`: node tests. Math reference values (including the tail accuracy of the inverse incomplete gamma
  and beta functions); catalog consistency and rich-text lint; manifest up to date. For every distribution
  module: structure; content completeness (required property rows, limits for every limit or special-case
  relation, glossary coverage of Greek letters, TeX for Greek letters in prose); pdf integrates to 1 (discrete:
  sums to 1); cdf matches the integral or cumulative sum and is monotone in [0, 1]; mean, variance, skewness,
  excess kurtosis and entropy match numeric values; the median and mode are correct; quantile inverts cdf;
  sf = 1 − cdf; samples agree with the median. Multivariate modules run their `checks()`. For every relation
  module: fields, from/to, glossary coverage and the TeX lint.
* `npm run smoke`: Playwright. Every page at 1280 px and 390 px: console errors, failed requests, KaTeX errors,
  horizontal overflow; screenshots in `screenshots/` (git-ignored). `--only=<substring>` limits the pages.
* `npm run interact`: Playwright interaction test of the Normal page (mouse drags, typing, validation, the area
  tool and its keyboard control, real touch events on a phone), the binomial→normal demo and the two demo
  helpers.
* `npm run layout`: Playwright layout test of the page tops (see [Plot sizes and the layout
  test](#plot-sizes-and-the-layout-test)); prints a table of measured values and fails on any distribution page
  whose summary is more than 3 lines at 1280 px, whose main plots are not fully visible at 1280x720 or
  1440x900, whose parameter boxes are below a 1440x900 screen, whose toggles do not work, or that scrolls
  sideways at 390 px. `--only=<substring>`, `--dists`, `--relations`, `--port=<n>`, `--shots` (screenshots in
  `screenshots/layout/test/`).
* `npm run map`: Playwright test of the map, in both views: `window.__map.checkLayout()` must report no overlaps
  (labels on tiles, labels on labels, tiles on tiles, labels on other arrows, arrows through tiles), every arrow
  starts and ends at its tiles, every label and arrow opens the right dialog with a link to its relation page,
  focus returns to the label when the dialog closes, and every tile is on top and links to its page. Also: the
  view switch and the `?view=full` address (and the back button), the tile card on hover and on keyboard focus
  (with the common uses; checked on every tile of both views at 1280x720: inside the frame, never over its
  tile or the controls), the arrow line (every core arrow at 1280x720 and 1440x900: inside the frame, clear of
  the arrow, its tiles and the controls), the frame filling the screen at 1280x720, 1440x900 and 1920x1080 (bottom and side
  gutters at most 24 px, the map spanning at least 85% of the frame), and the phone layout. `--port=<n>`,
  `--quick` (opens the dialogs of a sample of the arrows).

Playwright is used from the global install (`/opt/node22/lib/node_modules/playwright`) and Chromium from
`/opt/pw-browsers`; override with `PLAYWRIGHT_PATH` and `CHROMIUM_PATH`.
