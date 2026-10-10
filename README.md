# Probability distributions

An interactive website about the probability distributions most used in statistics and computational
modeling, and about how they are related to one another.

Live site: https://torwager.github.io/probability_distributions/

* **Map** (home page): distributions as tiles, relationships as labelled arrows. Clicking a tile opens the
  distribution's page; clicking an arrow explains the relationship.
* **Distribution pages** (`distribution.html?d=<id>`): an interactive plot of the density or probability mass
  function and the cumulative distribution function, with parameters set by dragging handles on the plot or
  typing in number boxes; an optional "area under the curve" tool linked to the CDF; formulas with every symbol
  explained; a table of properties; limits and special cases; uses in frequentist and Bayesian statistics and in
  modeling; related distributions; references.
* **Relationship pages** (`relation.html?r=<from>--<to>`): plain explanation, formal statement, symbol glossary,
  an interactive demonstration and a short derivation.

The site is static: plain HTML, CSS and JavaScript modules with no build step. Formulas are typeset with a
vendored copy of KaTeX; plots are SVG drawn by the site's own small plotting library.

## Run locally

Any static file server works; ES modules do not load from `file://` URLs.

```sh
python3 -m http.server 8000        # then open http://localhost:8000/
# or
npx http-server -p 8000
# or (no dependencies)
node tests/server.mjs 8000
```

## Tests

```sh
npm test            # numeric and structural checks of every module (node --test, no dependencies)
npm run smoke       # Playwright: load every page at desktop and phone width, save screenshots to screenshots/
npm run interact    # Playwright: drag handles and type values on the Normal page
```

The Playwright scripts use a globally installed Playwright and Chromium (see `tests/pw.mjs`;
override with `PLAYWRIGHT_PATH` and `CHROMIUM_PATH`).

## Adding a distribution or a relationship

See [ARCHITECTURE.md](ARCHITECTURE.md) for the module API. In short: write
`assets/js/dists/<id>.js` or `assets/js/relations/<from>--<to>.js` following the reference modules
(`dists/normal.js`; `relations/binomial--normal.js`, `relations/exponential--gamma.js` and
`relations/poisson--normal.js`), run `node tools/update-manifest.mjs`, then `npm test` and `npm run smoke`.
Distribution and relationship ids come from the catalog (`tools/catalog.source.json` for the data and
`tools/catalog_rich.py` for its prose, compiled to `assets/js/catalog.js` by `python3 tools/build_catalog.py`).

## Deployment

GitHub Pages serves the `main` branch from the repository root (Settings → Pages → Deploy from a branch →
`main` / `(root)`). `.nojekyll` is present so files are served as they are. All links are relative, so the
site works under the `/probability_distributions/` path.

## Credits

Designed by [Tor Wager](https://torwager.github.io) · [CANlab](http://canlab.science/). The visual design follows
[scienceofplacebo.org](https://scienceofplacebo.org). The map of relationships builds on Leemis & McQueston (2008),
"Univariate distribution relationships", *The American Statistician* 62(1):45–53.
