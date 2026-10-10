// Poisson -> Negative binomial: a Poisson count whose rate is Gamma(r, beta) distributed is NegBin(r, beta/(1 + beta));
// conversely NegBin(r, p) -> Poisson(mu) as r -> infinity with the mean mu fixed.
// Demo: (1) ctx.demos.simulationDemo for the mixture, with an extra plot of the simulated rates against the gamma
// density; (2) ctx.demos.compareDemo for the limit r -> infinity. Self-contained (PMFs computed with math).

import { getRelation } from '../catalog.js';
import { lgamma, betaI, gammaQ, gammaP, quantileDiscrete, histogram } from '../core/math.js';

const REL = getRelation('poisson--negative-binomial');

const nbPmf = (k, r, p) => (k < 0 || !Number.isInteger(k) ? 0
  : Math.exp(lgamma(k + r) - lgamma(r) - lgamma(k + 1) + r * Math.log(p) + k * Math.log1p(-p)));
const nbCdf = (x, r, p) => (x < 0 ? 0 : betaI(p, r, Math.floor(x) + 1));
const nbQuantile = (u, r, p) => quantileDiscrete(x => nbCdf(x, r, p), u, 0, Infinity, Math.floor(r * (1 - p) / p));
const poisPmf = (k, m) => (k < 0 || !Number.isInteger(k) ? 0 : Math.exp(k * Math.log(m) - m - lgamma(k + 1)));
const poisCdf = (x, m) => (x < 0 ? 0 : gammaQ(Math.floor(x) + 1, m));
const gammaPdf = (x, a, b) => (x <= 0 ? 0 : Math.exp(a * Math.log(b) + (a - 1) * Math.log(x) - b * x - lgamma(a)));

/** Total variation distance between NegBin(r, p) and Poisson(mu): half the sum of absolute differences. */
function tv(r, p, mu) {
  const K = Math.max(nbQuantile(1 - 1e-10, r, p), Math.ceil(mu + 12 * Math.sqrt(mu) + 20));
  let s = 0, mb = 0, mp = 0;
  for (let k = 0; k <= K; k++) { const a = nbPmf(k, r, p), b = poisPmf(k, mu); s += Math.abs(a - b); mb += a; mp += b; }
  return (s + Math.max(0, 1 - mb) + Math.max(0, 1 - mp)) / 2;
}

const f3 = v => String(Number(v.toPrecision(3)));

export default {
  id: 'poisson--negative-binomial',
  from: 'poisson',
  to: 'negative-binomial',
  title: 'A Poisson count with a gamma-distributed rate is negative binomial, and the negative binomial approaches the Poisson when the rates stop varying',

  plain: [
    'A Poisson count assumes that every unit has the same rate. Often that is not true: some people have more accidents than others, some neurons fire more on some trials, some genes are expressed more in some samples. If each unit has its own rate $\\lambda$, and the rates across units follow a gamma distribution, then the counts pooled over units are negative binomial. Their variance is larger than their mean (overdispersion), because it adds the variation of the rates to the Poisson variation of the counts.',
    'This gamma–Poisson mixture is the main reason the negative binomial is used for count data, and it is why its size parameter $r$ can be any positive number, not only a whole number. When the rates hardly vary (very large $r$, with the mean held fixed), the negative binomial becomes a Poisson distribution again.',
  ],

  statementTex: REL.statement,
  glossary: [
    { sym: '\\lambda \\sim \\mathrm{Gamma}(r, \\beta)', meaning: 'The Poisson rate $\\lambda$ is itself random and follows a gamma distribution with shape $r$ and rate $\\beta$ (mean $r/\\beta$, variance $r/\\beta^2$).' },
    { sym: '\\lambda', meaning: 'The rate (mean count) of one unit. It differs from unit to unit.' },
    { sym: 'r', meaning: 'The gamma shape, which becomes the negative binomial size. A small $r$ means the rates vary a lot from unit to unit.' },
    { sym: '\\beta', meaning: 'The gamma rate parameter (one over the scale). A larger $\\beta$ means smaller rates.' },
    { sym: 'X \\mid \\lambda \\sim \\mathrm{Poisson}(\\lambda)', meaning: 'Given its rate, a unit’s count is Poisson with that mean.' },
    { sym: '\\Rightarrow', meaning: 'Implies.' },
    { sym: 'X \\sim \\mathrm{NegBin}\\big(r,\\ p\\big)', meaning: 'Averaged over the rates, the count is negative binomial: the distribution of the number of failures before the $r$-th success with success probability $p$.' },
    { sym: 'p = \\tfrac{\\beta}{1 + \\beta}', meaning: 'The negative binomial success probability that matches the gamma rate $\\beta$. Then the mean $r(1-p)/p$ equals $r/\\beta$, the mean rate.' },
    { sym: '\\xrightarrow{d}', meaning: 'Converges in distribution: the probabilities of the negative binomial get arbitrarily close to those of the limit.' },
    { sym: 'r \\to \\infty', meaning: 'The size grows without bound, so the gamma distribution of rates becomes concentrated at a single value.' },
    { sym: '\\mu = r(1-p)/p', meaning: 'The mean count, held fixed in the limit; it becomes the mean of the limiting Poisson distribution.' },
    { sym: '\\mathrm{Poisson}(\\mu)', meaning: 'The Poisson distribution with mean $\\mu$.' },
  ],

  why: [
    '<b>The mixture.</b> Average the Poisson probability over the gamma density of the rate:',
    { tex: 'P(X = k) = \\int_0^\\infty \\frac{e^{-\\lambda}\\lambda^{k}}{k!} \\cdot \\frac{\\beta^{r}}{\\Gamma(r)} \\lambda^{r-1} e^{-\\beta\\lambda}\\, d\\lambda = \\frac{\\beta^{r}}{k!\\,\\Gamma(r)} \\int_0^\\infty \\lambda^{k + r - 1} e^{-(1 + \\beta)\\lambda}\\, d\\lambda = \\frac{\\Gamma(k + r)}{k!\\,\\Gamma(r)} \\Big(\\frac{\\beta}{1 + \\beta}\\Big)^{r} \\Big(\\frac{1}{1 + \\beta}\\Big)^{k}.' },
    'The middle integral is a gamma integral, equal to $\\Gamma(k + r)/(1 + \\beta)^{k + r}$. The result is the negative binomial probability with $p = \\beta/(1 + \\beta)$ and $1 - p = 1/(1 + \\beta)$. Here $\\Gamma$ is the gamma function, with $\\Gamma(m) = (m-1)!$ for whole numbers.',
    '<b>Where the extra variance comes from.</b> By the law of total variance, $\\mathrm{Var}(X) = \\mathrm{E}[\\mathrm{Var}(X \\mid \\lambda)] + \\mathrm{Var}(\\mathrm{E}[X \\mid \\lambda]) = \\mathrm{E}[\\lambda] + \\mathrm{Var}(\\lambda) = \\mu + \\mu^2/r$, with $\\mu = r/\\beta$. The first term is the Poisson variance; the second is the variance of the rates.',
    '<b>The limit.</b> Hold the mean $\\mu$ fixed and let $r$ grow, so $\\beta = r/\\mu$ grows too. The gamma distribution of rates then has mean $\\mu$ and variance $\\mu^2/r \\to 0$: every unit has essentially the rate $\\mu$, and the mixture becomes $\\mathrm{Poisson}(\\mu)$. In generating functions, with $p = r/(r + \\mu)$,',
    { tex: '\\left(\\frac{p}{1 - (1 - p)z}\\right)^{r} = \\left(1 - \\frac{\\mu(z - 1)}{r}\\right)^{-r} \\;\\longrightarrow\\; e^{\\mu(z - 1)},' },
    'which is the Poisson probability-generating function.',
  ],

  references: [
    { text: 'Wikipedia: Negative binomial distribution (gamma–Poisson mixture).', url: 'https://en.wikipedia.org/wiki/Negative_binomial_distribution#Gamma%E2%80%93Poisson_mixture' },
    { text: 'Greenwood, M., & Yule, G. U. (1920). An inquiry into the nature of frequency distributions representative of multiple happenings. <i>Journal of the Royal Statistical Society</i>, 83(2), 255–279.' },
    { text: 'Casella, G., & Berger, R. L. (2002). <i>Statistical Inference</i> (2nd ed.), Section 4.4 (hierarchical models and mixture distributions). Duxbury.' },
    { text: 'Gelman, A., Carlin, J. B., Stern, H. S., Dunson, D. B., Vehtari, A., & Rubin, D. B. (2013). <i>Bayesian Data Analysis</i> (3rd ed.), Section 2.6 and Chapter 17. CRC Press.', url: 'http://www.stat.columbia.edu/~gelman/book/' },
    { text: 'Hilbe, J. M. (2011). <i>Negative Binomial Regression</i> (2nd ed.). Cambridge University Press.' },
    { text: 'Leemis, L. M., & McQueston, J. T. (2008). Univariate distribution relationships. <i>The American Statistician</i>, 62(1), 45–53.', url: 'https://doi.org/10.1198/000313008X270448' },
  ],

  demo(container, { demos, ui, plot }) {
    const { h } = ui;

    // ---------------------------------------------------------------- 1. the mixture
    container.append(h('h3', {}, 'Mixing Poisson counts over gamma-distributed rates'));
    let acc = { rng: null, rates: [] };   // the rates drawn in the current batch
    let ratePlot = null;
    const mix = h('div');
    container.append(mix);
    const res = demos.simulationDemo(mix, null, {
      intro: 'Each simulated count is made in two steps: draw a rate $\\lambda$ from $\\mathrm{Gamma}(r, \\beta)$, then draw a count from $\\mathrm{Poisson}(\\lambda)$. The bars show how often each count occurred; the stems show the $\\mathrm{NegBin}(r, \\beta/(1 + \\beta))$ probabilities. The plot below shows the rates that were drawn. Make $r$ small to see strong overdispersion: many zeros and a long tail.',
      params: [
        { key: 'r', sym: 'r', name: 'gamma shape (size)', meaning: 'Shape of the gamma distribution of rates; a small $r$ means the rates vary a lot.', min: 0.3, max: 20, default: 2, log: true },
        { key: 'beta', sym: '\\beta', name: 'gamma rate', meaning: 'Rate parameter of the gamma distribution of rates; the mean rate is $r/\\beta$.', min: 0.1, max: 5, default: 0.5, log: true },
      ],
      check: ({ r, beta }) => (r / beta > 60 ? 'The mean count r/β would be above 60; choose a larger β or a smaller r.' : null),
      sample: (rng, { r, beta }) => {
        if (acc.rng !== rng) acc = { rng, rates: [] };
        const lam = rng.gamma(r, beta);
        acc.rates.push(lam);
        return rng.poisson(lam);
      },
      sampleName: 'Poisson counts with gamma-distributed rates',
      target: {
        name: ({ r, beta }) => `NegBin(r = ${f3(r)}, p = ${f3(beta / (1 + beta))}) probabilities`,
        pdf: (k, { r, beta }) => nbPmf(k, r, beta / (1 + beta)),
        cdf: (x, { r, beta }) => nbCdf(x, r, beta / (1 + beta)),
        discrete: true,
      },
      range: ({ r, beta }) => [0, Math.max(8, nbQuantile(0.995, r, beta / (1 + beta)))],
      xLabel: 'k (count)',
      readout: ({ r, beta }) => {
        const mu = r / beta;
        return `Mean $r/\\beta$ = <b>${ui.fmt(mu, 4)}</b>. Negative binomial variance $\\mu + \\mu^2/r$ = <b>${ui.fmt(mu + mu * mu / r, 4)}</b>, compared with ${ui.fmt(mu, 4)} for a Poisson count with the same mean.`;
      },
      onUpdate: p => drawRates(p),
    });
    const rateBox = h('div');
    mix.append(h('figure', { class: 'plot-fig', style: 'margin-top:1.2rem' },
      ui.rich('figcaption', 'The simulated rates $\\lambda$ (histogram) and the $\\mathrm{Gamma}(r, \\beta)$ density they were drawn from'), rateBox));
    ratePlot = new plot.Plot(rateBox, { xLabel: 'rate λ', yLabel: 'density', height: w => Math.max(190, Math.min(260, w * 0.3)) });

    function drawRates({ r, beta }) {
      if (!ratePlot || !acc.rates.length) return;
      const hi = Math.max(1, gammaQuantileApprox(r, beta));
      const hst = histogram(acc.rates, 0, hi, 40);
      const bars = hst.density.map((d, i) => [hst.edges[i] + hst.width / 2, d]);
      const curve = plot.sampleFn(x => gammaPdf(x, r, beta), hi / 2000, hi, 300);
      const peak = Math.max(...curve.map(c => c[1]).filter(Number.isFinite));
      // for r < 1 the density is infinite at 0; cap the axis at a few times the height away from 0
      const ip = Math.max(...curve.filter(c => c[0] > 0.04 * hi).map(c => c[1]));
      const top = Math.max(peak, ...bars.map(b => b[1]));
      const ymax = (r < 1 ? Math.min(top, 3 * ip) : top) * 1.15;
      ratePlot.render({
        x: [0, hi], y: [0, ymax || 1],
        layers: [
          { id: 'hist', type: 'bars', points: bars, width: hst.width, cls: 'bars-strong' },
          { id: 'pdf', type: 'line', points: curve, cls: 'curve-main' },
          { id: 'mean', type: 'vline', x: r / beta, cls: 'mean-line' },
        ],
        legend: [{ label: 'simulated rates', cls: 'bars-strong' }, { label: `Gamma(r = ${f3(r)}, β = ${f3(beta)}) density; dotted line at the mean r/β`, cls: 'curve-main' }],
      });
    }
    // about the 0.995 quantile of the gamma distribution, found by bisection on the regularized gamma function
    function gammaQuantileApprox(a, b) {
      let lo = 0, hi = (a + 10 * Math.sqrt(a) + 10) / b;
      for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; if (gammaP(a, b * m) < 0.995) lo = m; else hi = m; }
      return hi;
    }
    drawRates(res.store.get().p);

    // ---------------------------------------------------------------- 2. the limit r -> infinity
    container.append(h('h3', { style: 'margin-top:2rem' }, 'The Poisson limit as r grows'));
    const cmp = h('div');
    container.append(cmp);
    let drag = null;
    demos.compareDemo(cmp, null, {
      intro: 'The steel stems show the negative binomial with mean $\\mu$ and size $r$ (so $p = r/(r + \\mu)$); the grey stems show $\\mathrm{Poisson}(\\mu)$. Increase $r$ with the mean held fixed and the two sets of stems merge, as the extra variance $\\mu^2/r$ disappears. Drag the amber marker to move the common mean, or type values.',
      params: [
        { key: 'mu', sym: '\\mu', name: 'mean count', meaning: 'The mean shared by both distributions.', min: 0.5, max: 20, default: 4, step: 0.1 },
        { key: 'r', sym: 'r', name: 'size', meaning: 'The negative binomial size; larger values mean less extra variation.', min: 0.2, max: 1000, default: 2, log: true },
      ],
      exact: {
        name: ({ mu, r }) => `NegBin(r = ${f3(r)}, p = ${f3(r / (r + mu))}), mean ${f3(mu)}`, discrete: true,
        pdf: (k, { mu, r }) => nbPmf(k, r, r / (r + mu)),
        cdf: (x, { mu, r }) => nbCdf(x, r, r / (r + mu)),
      },
      approx: {
        name: ({ mu }) => `Poisson(μ = ${f3(mu)})`, discrete: true,
        pdf: (k, { mu }) => poisPmf(k, mu),
        cdf: (x, { mu }) => poisCdf(x, mu),
      },
      range: ({ mu, r }) => [0, Math.max(8, Math.min(nbQuantile(0.995, r, r / (r + mu)), Math.ceil(mu + 6 * Math.sqrt(mu + mu * mu / r) + 4)))],
      xLabel: 'k (count)',
      leftCaption: 'Probabilities: negative binomial (steel stems) and Poisson (grey stems)',
      handles: ({ mu }, set) => [{
        id: 'mu', type: 'xPoint', x: mu, label: 'μ',
        ariaLabel: 'Mean count μ. Drag, or use the arrow keys.', valueText: ui.fmt(mu, 3), valueNow: mu, valueMin: 0.5, valueMax: 20,
        onDrag: (pt, phase) => {
          if (phase === 'start') drag = true;
          if (pt && drag) set({ mu: Math.round(Math.max(0.5, pt.x) * 10) / 10 });
          if (phase === 'end') drag = null;
        },
        onKey: steps => set({ mu: Math.round((mu + 0.1 * steps) * 10) / 10 }),
      }],
      readout: ({ mu, r }) => `Variances: negative binomial $\\mu + \\mu^2/r$ = <b>${ui.fmt(mu + mu * mu / r, 4)}</b>, Poisson $\\mu$ = <b>${ui.fmt(mu, 4)}</b>. `
        + `Probability of a zero: <b>${ui.fmt(Math.pow(r / (r + mu), r), 3)}</b> against $e^{-\\mu}$ = ${ui.fmt(Math.exp(-mu), 3)}. `
        + `Total variation distance (the largest difference in the probability of any set of counts): <b>${ui.fmt(tv(r, r / (r + mu), mu), 3)}</b>.`,
    });
  },
};
