# Probability distributions

An interactive website about the probability distributions most used in statistics and computational
modeling, and about how they are related to one another.

Live site: https://torwager.github.io/probability_distributions/

* **Map** (home page): the distributions as tiles and their relationships as labeled arrows. Clicking a tile
  opens the distribution's page; clicking an arrow or its label opens a short explanation of the relationship
  with a link to its interactive page. The map pans and zooms on phones.
* **Distribution pages** (`distribution.html?d=<id>`). Every page has the same sections in the same order, and
  the top of the page is kept short so that the plots are visible without scrolling on a laptop screen:
  1. the name and a summary of one to three sentences, with a "More about this distribution" button that expands
     it in place to the full description of what the distribution describes and what its parameters do;
  2. the formulas for the PDF/PMF and the CDF side by side, with a "What the symbols mean" button that shows a
     glossary of every symbol;
  3. an interactive explorer: the density (or, for counts, the probability mass function) and the cumulative
     distribution function, with parameters set by dragging handles on the plot or typing in number boxes, an
     optional "area under the curve" tool linked to the CDF, and a summary of the mean, standard deviation,
     median and mode, followed by a short explanation of the handles;
  4. a table of properties (support, mean, median, mode, variance, standard deviation, skewness, excess
     kurtosis, entropy, generating and characteristic functions, and distribution-specific rows), with a column
     of values that updates as the parameters change;
  5. limits and special cases, linked to the relationship pages;
  6. uses in frequentist statistics, in Bayesian statistics, and in computational modeling and other
     applications;
  7. the parameters and the conventions used on the site, and further formulas where useful;
  8. related distributions (generated from the catalog);
  9. references (Wikipedia and textbooks or original papers).
* **Relationship pages** (`relation.html?r=<from>--<to>`): a short summary (expandable to the full plain
  explanation), the formal statement with a symbol glossary, an interactive demonstration (a simulation, or two
  distributions drawn on top of each other as a parameter approaches its limit) and a short derivation.
* **Lists and About**: `distributions.html` (by family), `relationships.html` (by kind), and `about.html` (how
  to use the site, the conventions and notation, and sources).

The site is static: plain HTML, CSS and JavaScript modules with no build step and no runtime dependencies.
Formulas are typeset with a vendored copy of KaTeX; plots are SVG drawn by the site's own small plotting
library; all special functions, quantiles and random numbers are computed in the browser.

## Distributions

32 distributions (★ = on the original reference chart, `docs/original-map.png`) and 58 relationships
(10 special cases, 14 transformations, 9 sums, 4 ratios, 8 limits, 3 mixtures, 1 conditioning, 4 conjugate
priors and 5 others).

| Family | Distributions |
|---|---|
| Uniform | Discrete uniform ★, Uniform (continuous) |
| Counts and trials | Bernoulli ★, Binomial ★, Hypergeometric ★, Geometric ★, Negative binomial ★, Poisson ★, Beta-binomial |
| Categories | Categorical, Multinomial |
| Waiting times and positive values | Exponential ★, Gamma ★, Weibull ★, Pareto |
| Normal family and test statistics | Normal ★, Log-normal ★, Student's t ★, Chi-squared ★, F, Multivariate normal |
| Heavy tails and extremes | Cauchy, Laplace, Logistic, Gumbel |
| Priors | Beta ★, Half-Cauchy, Inverse-gamma, Dirichlet |
| Response times and angles | Von Mises, Ex-Gaussian, Wald (inverse Gaussian) |

Conventions used throughout (also listed on the About page): the geometric distribution counts the
**failures** before the first success (support 0, 1, 2, …); the negative binomial counts failures before the
r-th success, with r any positive real number; the exponential uses the **rate** λ; the gamma uses shape α and
**rate** β; the inverse-gamma uses shape α and **scale** β; the Weibull uses shape k and **scale** λ; the
log-normal's μ and σ are the mean and standard deviation of ln X; the ex-Gaussian's τ is the exponential
**mean**; the Wald uses mean μ and shape λ; the Gumbel is the maximum type; Student's t is the standard form.

## Run locally

Any static file server works; ES modules do not load from `file://` URLs.

```sh
node tests/server.mjs 8000         # no dependencies; then open http://127.0.0.1:8000/
# or
python3 -m http.server 8000
# or
npx http-server -p 8000
```

## Tests

```sh
npm test            # node --test: math reference values, catalog consistency, manifest up to date, and for
                    # every module: structure, content rules (required property rows, limits, glossary
                    # coverage, TeX for Greek letters), the pdf integrates to 1, cdf/quantile/sf agree, and
                    # the stats match numeric values
npm run smoke       # Playwright: every page at 1280 px and 390 px; console errors, failed requests, KaTeX
                    # errors, horizontal overflow; screenshots in screenshots/
npm run interact    # Playwright: drags, typing, validation, the area tool, keyboard and touch on the Normal
                    # page, and the two relation demo helpers
npm run map         # Playwright: map layout self-check, arrow directions, every label and arrow opens its dialog
npm run layout      # Playwright: the top of every distribution and relationship page at 1280x720 and 1440x900:
                    # summary at most 3 lines, plots (and parameter boxes at 1440x900) visible without
                    # scrolling, the expand buttons work, no horizontal scroll at 390 px
npm run subpath     # Playwright: the site works when served under /probability_distributions/
```

The Playwright scripts use a globally installed Playwright and Chromium (see `tests/pw.mjs`; override with
`PLAYWRIGHT_PATH` and `CHROMIUM_PATH`). `npm test` needs only Node 18 or later.

## Adding a distribution or a relationship

[ARCHITECTURE.md](ARCHITECTURE.md) is the full module API and style guide. In short:

1. Add the entry to the catalog: the data in `tools/catalog.source.json` (id, name, kind, group, parameters
   with ranges and defaults; for a relationship: from, to, kind, label, statement) and the prose in
   `tools/catalog_rich.py`, then run `python3 tools/build_catalog.py` to regenerate `assets/js/catalog.js`.
   Do not edit `catalog.js` by hand.
2. Write `assets/js/dists/<id>.js` (copy `dists/normal.js`) or `assets/js/relations/<from>--<to>.js` (copy
   `relations/binomial--normal.js` for a hand-written demo, `relations/exponential--gamma.js` for a simulation
   with `ctx.demos.simulationDemo`, or `relations/poisson--normal.js` for a limit with `ctx.demos.compareDemo`).
   Use the catalog's parameter keys and `core/math.js` for the numerics, and explain every symbol in every
   formula.
3. Run `node tools/update-manifest.mjs` (pages load only the modules listed in `assets/js/modules.js`).
4. Run `npm test`, then `node tests/smoke.mjs --only=<id>` and `npm run layout -- --only=<id>`, and look at the screenshots; drag every handle and
   try the smallest and largest value of each parameter in a browser.
5. Place the new tile or arrow on the map: a tile center in `NODES` and, if needed, an arrow route in `ROUTES`
   in `assets/js/map/layout.js`. Then run `npm run map`, which fails if labels, tiles or arrows overlap.

## Deployment

GitHub Pages serves the `main` branch from the repository root (Settings → Pages → Deploy from a branch →
`main` / `(root)`). `.nojekyll` is present so files are served as they are. All links and module imports are
relative, so the site works under the `/probability_distributions/` path.

## Credits

Designed by [Tor Wager](https://torwager.github.io) · [CANlab](http://canlab.science/). The visual design
follows [scienceofplacebo.org](https://scienceofplacebo.org). The map of relationships builds on Leemis &
McQueston (2008), "Univariate distribution relationships", *The American Statistician* 62(1):45–53. The pages
were drafted with the help of an AI assistant (Claude, by Anthropic) and checked against standard textbooks and
with the numerical tests.
