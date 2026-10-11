// Inverse-gamma -> Student t (scale mixture of normals): if sigma^2 ~ InvGamma(nu/2, nu/2) and
// X | sigma^2 ~ N(0, sigma^2), then X ~ t_nu.
// Demo: ctx.demos.simulationDemo (draw sigma^2, then X; compare the histogram with the t density), plus a second
// row of plots that shows the mixing itself: the inverse-gamma distribution of sigma^2 with a few draws marked,
// the normal densities for those draws, and their average over all sigma^2, which is the t density.
// Self-contained: densities are computed with core/math.js.

import { getRelation } from '../catalog.js';
import { lgamma, gammaPinv, betaI, betaIinv, normalCdf, makeRng, PI } from '../core/math.js';

const REL = getRelation('inverse-gamma--student-t');

const tPdf = (x, nu) => Math.exp(lgamma((nu + 1) / 2) - lgamma(nu / 2) - 0.5 * Math.log(nu * PI) - (nu + 1) / 2 * Math.log1p(x * x / nu));
const tCdf = (x, nu) => { const tail = 0.5 * betaI(nu / (nu + x * x), nu / 2, 0.5); return x >= 0 ? 1 - tail : tail; };
const tQuant = (u, nu) => { const v = betaIinv(2 * Math.min(u, 1 - u), nu / 2, 0.5); const x = Math.sqrt(nu * (1 - v) / v); return u >= 0.5 ? x : -x; };
const igPdf = (y, a, b) => (y <= 0 ? 0 : Math.exp(a * Math.log(b) - (a + 1) * Math.log(y) - b / y - lgamma(a)));
const igQ = (u, a, b) => b / gammaPinv(a, 1 - u);
const nPdf = (x, v) => Math.exp(-0.5 * x * x / v) / Math.sqrt(2 * PI * v);
const n3 = v => String(Number(v.toPrecision(3)));

export default {
  id: 'inverse-gamma--student-t',
  from: 'inverse-gamma',
  to: 'student-t',
  title: 'A normal variable whose variance is drawn from an inverse-gamma distribution has a Student’s t distribution',

  summary: 'A normal variable with mean 0 whose variance is drawn from an inverse-gamma distribution with shape and scale both equal to $\\nu/2$ has a Student’s t distribution with $\\nu$ degrees of freedom. Mixing normals of different widths produces the heavier tails.',

  plain: [
    'Take a normal variable with mean 0, but instead of fixing its variance, first draw the variance $\\sigma^2$ at random from an inverse-gamma distribution with shape and scale both equal to $\\nu/2$. The resulting variable has a Student’s t distribution with $\\nu$ degrees of freedom. In other words, the t distribution is an average (a mixture) of normal distributions with different variances, weighted by the inverse-gamma density.',
    'Mixing normals with different spreads produces heavier tails than any single normal: most draws come from normals of moderate width, but now and then a draw comes from a very wide one and lands far out. The smaller $\\nu$, the more spread out the inverse-gamma distribution of variances, and the heavier the tails of the t. As $\\nu$ grows, the variances concentrate at 1 and the t approaches the standard normal.',
    'This explains why the t distribution appears whenever a variance is uncertain: it is the posterior predictive distribution of a new observation under a normal model with an inverse-gamma posterior for the variance, and it is how Bayesian software fits robust regression models with t-distributed errors. (On the map, this arrow starts at the mixing distribution, the inverse-gamma.)',
  ],

  statementTex: REL.statement,
  glossary: [
    { sym: '\\sigma^2', meaning: 'The variance of the normal distribution, here itself a random variable.' },
    { sym: '\\mathrm{InvGamma}(\\tfrac\\nu2, \\tfrac\\nu2)', meaning: 'The inverse-gamma distribution with shape $\\nu/2$ and scale $\\nu/2$. Its mode is $\\nu/(\\nu + 2)$, just below 1, and it concentrates at 1 as $\\nu$ grows.' },
    { sym: '\\nu', meaning: 'The degrees of freedom of the t distribution, a positive number. Smaller values give heavier tails.' },
    { sym: 'X \\mid \\sigma^2 \\sim \\mathcal N(0, \\sigma^2)', meaning: 'Given the drawn variance, $X$ is normal with mean 0 and that variance.' },
    { sym: '\\Rightarrow', meaning: 'Implies.' },
    { sym: 't_\\nu', meaning: 'The standard Student’s t distribution with $\\nu$ degrees of freedom (centered at 0, scale 1).' },
    { sym: '\\tau = 1/\\sigma^2', meaning: 'The precision, the reciprocal of the variance.' },
    { sym: '\\mathrm{Gamma}(\\tfrac\\nu2, \\tfrac\\nu2)', meaning: 'The gamma distribution with shape $\\nu/2$ and rate $\\nu/2$ (mean 1). Saying the precision has this distribution is the same as saying the variance has the inverse-gamma distribution above.' },
  ],

  why: [
    '<b>Integrating out the variance.</b> The density of $X$ is the normal density averaged over the distribution of $\\sigma^2$. Writing $v = \\sigma^2$ and $a = \\nu/2$,',
    { tex: 'f(x) = \\int_0^\\infty \\frac{1}{\\sqrt{2\\pi v}}\\, e^{-x^2/(2v)} \\cdot \\frac{a^{a}}{\\Gamma(a)}\\, v^{-a-1} e^{-a/v}\\, dv = \\frac{a^{a}}{\\Gamma(a)\\sqrt{2\\pi}} \\int_0^\\infty v^{-(a + 1/2) - 1} \\exp\\!\\left(-\\frac{a + x^2/2}{v}\\right) dv.' },
    'The remaining integral is an unnormalized inverse-gamma density with shape $a + \\tfrac12$ and scale $a + x^2/2$, so it equals $\\Gamma(a + \\tfrac12)/(a + x^2/2)^{a + 1/2}$. Substituting $a = \\nu/2$ and simplifying,',
    { tex: 'f(x) = \\frac{\\Gamma\\!\\left(\\frac{\\nu + 1}{2}\\right)}{\\Gamma\\!\\left(\\frac\\nu2\\right)\\sqrt{\\nu\\pi}} \\left(1 + \\frac{x^2}{\\nu}\\right)^{-\\frac{\\nu + 1}{2}},' },
    'which is the density of Student’s t with $\\nu$ degrees of freedom. Here $\\Gamma$ is the gamma function and $\\pi \\approx 3.14159$.',
    '<b>Connection with the usual definition.</b> Student’s t is usually defined as $Z/\\sqrt{W/\\nu}$ with $Z$ standard normal and $W \\sim \\chi^2_\\nu$ independent. Given $W$, this is normal with variance $\\nu/W$, and $\\nu/W$ has exactly the $\\mathrm{InvGamma}(\\nu/2, \\nu/2)$ distribution, because $W/\\nu$ is $\\mathrm{Gamma}(\\nu/2, \\text{rate } \\nu/2)$. So the two definitions describe the same construction.',
    '<b>Location and scale.</b> More generally, if $\\sigma^2 \\sim \\mathrm{InvGamma}(\\nu/2,\\ \\nu s^2/2)$ and $X \\mid \\sigma^2 \\sim \\mathcal N(\\mu, \\sigma^2)$, then $X$ has a t distribution with $\\nu$ degrees of freedom, center $\\mu$ and scale $s$. With an inverse-gamma posterior $\\mathrm{InvGamma}(\\alpha\', \\beta\')$ for a normal variance, the predictive distribution of a new observation is therefore t with $2\\alpha\'$ degrees of freedom and scale $\\sqrt{\\beta\'/\\alpha\'}$.',
    '<b>Why it is useful for computation.</b> Writing a t likelihood as a normal likelihood with a latent variance per observation makes models with t errors easy to fit by Gibbs sampling or the EM algorithm: given the latent variances the model is normal, and given the data each latent variance has an inverse-gamma conditional distribution. Observations that fit badly get large latent variances and therefore little weight, which is the source of the t model’s robustness to outliers.',
  ],

  references: [
    { text: 'Wikipedia: Student’s t-distribution (characterization as a compound distribution).', url: 'https://en.wikipedia.org/wiki/Student%27s_t-distribution#Characterization' },
    { text: 'Wikipedia: Normal variance-mean mixture and scale mixtures of normals.', url: 'https://en.wikipedia.org/wiki/Normal_variance-mean_mixture' },
    { text: 'Gelman, A., Carlin, J. B., Stern, H. S., Dunson, D. B., Vehtari, A., & Rubin, D. B. (2013). <i>Bayesian Data Analysis</i> (3rd ed.), Sections 3.2 and 17.2 (t models as mixtures of normals). CRC Press.', url: 'http://www.stat.columbia.edu/~gelman/book/' },
    { text: 'Lange, K. L., Little, R. J. A., & Taylor, J. M. G. (1989). Robust statistical modeling using the t distribution. <i>Journal of the American Statistical Association</i>, 84(408), 881–896.', url: 'https://doi.org/10.2307/2290063' },
    { text: 'Leemis, L. M., & McQueston, J. T. (2008). Univariate distribution relationships. <i>The American Statistician</i>, 62(1), 45–53.', url: 'https://doi.org/10.1198/000313008X270448' },
  ],

  demo(container, { demos, plot, ui }) {
    const { h } = ui;
    const range = ({ nu }) => { const q = Math.min(tQuant(0.99, nu), 12); return [-Math.max(q, 4), Math.max(q, 4)]; };
    const sim = demos.simulationDemo(container, null, {
      intro: 'Each simulated value is made in two steps: draw a variance $\\sigma^2$ from $\\mathrm{InvGamma}(\\nu/2, \\nu/2)$, then draw $X$ from a normal distribution with mean 0 and that variance. The histogram of many such values is compared with the Student’s t density with $\\nu$ degrees of freedom. The lower plots show the mixing itself. Try small $\\nu$ (very heavy tails) and large $\\nu$ (close to normal).',
      params: [
        { key: 'nu', sym: '\\nu', name: 'degrees of freedom', meaning: 'The shape and scale of the inverse-gamma distribution of the variance are both $\\nu/2$.', min: 0.5, max: 100, default: 3, log: true },
      ],
      sample: (rng, { nu }) => rng.normal(0, Math.sqrt((nu / 2) / rng.gamma(nu / 2, 1))),
      sampleName: 'normal draws with inverse-gamma variances',
      target: {
        name: ({ nu }) => `Student t density, ν = ${n3(nu)}`,
        pdf: (x, { nu }) => tPdf(x, nu),
        cdf: (x, { nu }) => tCdf(x, nu),
      },
      range,
      xLabel: 'x',
      readout: ({ nu }) => `The share of values beyond ±3 is <b>${ui.fmt(2 * tCdf(-3, nu), 3)}</b> for this t distribution, compared with <b>${ui.fmt(2 * normalCdf(-3), 3)}</b> for the standard normal.`,
    });

    // ---- the mixing, step by step
    const mixL = h('div'), mixR = h('div');
    const capR = ui.rich('figcaption', 'Normal densities for those variances and their average');
    container.append(
      h('div', { class: 'demo-grid', style: 'margin-top:1.4rem' },
        h('figure', { class: 'plot-fig' }, ui.rich('figcaption', 'Mixing distribution of $\\sigma^2$, with 8 draws marked'), mixL),
        h('figure', { class: 'plot-fig' }, capR, mixR)),
      ui.rich('p', 'Each thin curve on the right is the normal density for one of the variances marked on the left. The solid curve is the average of the normal densities over the whole inverse-gamma distribution, which is the t density; the dashed curve is the standard normal for comparison. Click “Draw new samples” above for different variances.', { class: 'small muted' }));
    const PL = new plot.Plot(mixL, { xLabel: 'variance σ²', yLabel: 'density' });
    const PR = new plot.Plot(mixR, { xLabel: 'x', yLabel: 'density' });

    function drawMix() {
      const { p, seed } = sim.store.get();
      const nu = p.nu, a = nu / 2;
      const rng = makeRng(99 + seed);
      const vs = Array.from({ length: 8 }, () => a / rng.gamma(a, 1));
      const hiV = Math.max(Math.min(igQ(0.95, a, a), 12), 2.2);
      const curve = plot.sampleFn(v => igPdf(v, a, a), hiV / 2000, hiV, 400);
      const yTop = Math.max(...curve.map(q => q[1]).filter(Number.isFinite)) * 1.15;
      PL.render({
        x: [0, hiV], y: [0, yTop],
        layers: [
          { id: 'fill', type: 'area', points: curve, cls: 'pdf-fill' },
          { id: 'ig', type: 'line', points: curve, cls: 'curve-main' },
          { id: 'one', type: 'vline', x: 1, cls: 'mean-line' },
          ...vs.map((v, i) => ({ id: 'd' + i, type: 'dot', x: Math.min(v, hiV * 0.995), y: 0, r: 4.5, cls: 'draw' })),
        ],
        legend: [{ label: `InvGamma(${n3(a)}, ${n3(a)}) density; dotted line at σ² = 1`, cls: 'curve-main' }, { label: 'drawn variances (a dot at the right edge is off the scale)', cls: 'draw', shape: 'dot' }],
      });
      const [lo, hi] = range(p);
      const yR = Math.max(tPdf(0, nu), ...vs.map(v => nPdf(0, v))) * 1.1;
      PR.render({
        x: [lo, hi], y: [0, Math.min(yR, 3 * tPdf(0, nu))],
        layers: [
          ...vs.map((v, i) => ({ id: 'n' + i, type: 'line', points: plot.sampleFn(x => nPdf(x, v), lo, hi, 200), cls: 'curve-2 curve-thin' })),
          { id: 'z', type: 'line', points: plot.sampleFn(x => nPdf(x, 1), lo, hi, 300), cls: 'curve-ref' },
          { id: 't', type: 'line', points: plot.sampleFn(x => tPdf(x, nu), lo, hi, 300), cls: 'curve-main' },
        ],
        legend: [{ label: 'normal densities for the drawn variances', cls: 'curve-2' }, { label: `average over all variances = t, ν = ${n3(nu)}`, cls: 'curve-main' }, { label: 'standard normal', cls: 'curve-ref' }],
      });
    }
    let raf = 0;
    sim.store.subscribe(() => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; drawMix(); }); });
    drawMix();
  },
};
