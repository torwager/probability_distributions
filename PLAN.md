# Probability Distributions — build plan

An interactive website about common probability distributions and how they relate to one another.
It is deployed with GitHub Pages at https://torwager.github.io/probability_distributions/.

## What the site contains

1. **Home page: the distribution map.** This is an interactive map drawn in SVG. It is based on the
   reference chart in `docs/original-map.png` and extended with the distributions added below.
   - Each distribution is a tile showing a small plot of its shape. Clicking a tile opens that distribution's page.
   - Arrows show relationships between distributions. Each arrow has a short label, such as
     `n → ∞`, `p = 1`, `Σ`, or `X²`.
   - Clicking an arrow or its label opens a pop-up. The pop-up explains the relationship in plain
     language, gives the formula, and defines every symbol. It links to a page where you can
     explore the relationship interactively.
2. **Distribution pages** (`distribution.html?d=<id>`). Every page has the same sections, in this order:
   - A short plain-language description: what the distribution describes and what kind of values it takes.
   - An interactive plot of the PDF or PMF, with a linked CDF plot. The parameters can be changed by
     dragging handles on the plot that fit the parameter, for example a vertical line for a location
     parameter, a horizontal arrow for a scale parameter, or a draggable peak or tail for a shape
     parameter. Each parameter also has a number box. Dragging updates the box, and typing in the box
     updates the plot.
   - An optional "Area under the curve" toggle. It shades the area to the left or right of a point you
     can drag. It shows the value of that area and marks the matching point on the CDF.
   - The formulas for the PDF/PMF and the CDF, followed by a glossary that explains every symbol in plain language.
   - A properties table: support, parameters, mean, median, mode, variance, skewness, excess kurtosis,
     entropy, and MGF or characteristic function where these are useful. Each row has a short explanation.
   - Limits and special cases, such as Binomial → Normal as n → ∞, and Geometric → Exponential in the
     continuous limit. These link to the relationship pages.
   - Uses: in frequentist statistics (which tests and models use it), in Bayesian statistics
     (conjugacy, priors, posteriors), and in computational modeling and other applications.
   - References: Wikipedia and standard textbooks (Casella & Berger; Gelman et al., *Bayesian Data
     Analysis*; Leemis & McQueston 2008, "Univariate Distribution Relationships"; Johnson, Kotz & Balakrishnan).
3. **Relationship pages** (`relation.html?r=<id>`). Each one has a plain-language explanation, the
   formula, a symbol glossary, and an interactive demonstration. For example, a slider for n shows a
   Binomial approaching a Normal, and a simulation shows that a sum of exponentials is Gamma distributed.
4. **About page.** Explains in plain terms what the site is for and how to use it.

## Distributions

From the reference map (15): discrete uniform, Bernoulli, hypergeometric, binomial, geometric,
negative binomial, Poisson, exponential, Weibull, log-normal, normal, Student's t, chi-squared, gamma, beta.

Added because they are widely used in frequentist statistics, Bayesian statistics, and computational modeling:
- continuous uniform
- categorical and multinomial
- beta-binomial
- F (ANOVA and regression tests)
- Cauchy and half-Cauchy (heavy tails; priors on scale parameters)
- Laplace (robust regression and lasso priors)
- logistic (logistic regression and choice models)
- inverse-gamma (conjugate prior for a variance)
- Dirichlet (conjugate prior for categorical and multinomial)
- multivariate normal
- von Mises (circular data)
- ex-Gaussian and Wald, also called inverse Gaussian (response-time and drift-diffusion modeling)
- Pareto (power laws)

The final list and its relationships are set in the catalog phase.

## Design

- Styling follows scienceofplacebo.org (`docs/scienceofplacebo-reference.css`):
  - fonts: Fraunces for headings, Inter for body text, JetBrains Mono for numbers
  - colors: warm paper background `#faf8f4` and ink `#1a2332`
  - amber `#e9b949` is used for interactive elements; steel blue `#6f8fb0` / `#3f6390` for curves
  - rounded cards, pill-shaped buttons, and a light/dark theme
- Text is plain and direct. It explains what things are, with no catchy headlines.
- Static site with no build step: plain HTML, CSS, and ES modules. KaTeX is stored in the repo for
  formulas. Plots are SVG drawn with our own small plotting and numerics code.

## Architecture

```
index.html            map (home)
distribution.html     one template, ?d=<id>
relation.html         one template, ?r=<id>
about.html
assets/css/site.css   design tokens and components
assets/js/core/       math.js (special functions), plot.js (SVG plots + drag handles), ui.js, layout.js
assets/js/catalog.js  list of distributions and relationships (ids, names, map positions, labels)
assets/js/dists/<id>.js       one module per distribution: params, pdf, cdf, handles, content
assets/js/relations/<id>.js   one module per relationship: explanation + demo
assets/vendor/katex/
tests/                node tests: pdf integrates to 1, cdf matches numeric integral, means and variances match
```

## Build phases (multi-agent workflow)

1. **Catalog.** Settle the final list of distributions and relationships, with correct math. A
   separate adversarial check verifies every relationship.
2. **Foundation.** Build the core libraries, styles, page templates, and the Normal page as the
   reference implementation. Document the module API in `ARCHITECTURE.md`.
3. **Build.** Write the distribution modules in parallel batches, plus the relationship modules and the map.
4. **Review.** Numeric tests, a content and math accuracy review, and browser checks
   (Playwright screenshots, console errors, mobile layout), with fixes.
5. **Deploy.** Push to `main` and serve with GitHub Pages from the repository root.
