// Normal + independent exponential = ex-Gaussian; as tau -> 0 it reduces to the normal.
// Demo: ctx.demos.simulationDemo (normal draw + exponential draw vs the exact ex-Gaussian density), with the
// normal component N(mu, sigma^2) drawn dashed on the histogram so the effect of the exponential delay is
// visible, and a readout of how far the ex-Gaussian is from that normal (the tau -> 0 limit).

import { getRelation } from '../catalog.js';
import { normalCdf, normalPdf } from '../core/math.js';
import { exGaussianPdf, exGaussianCdf } from '../dists/ex-gaussian.js';

const REL = getRelation('normal--ex-gaussian');

/** Largest gap between the ex-Gaussian CDF and the CDF of its normal component. */
function gapToNormal({ mu, sigma, tau }) {
  const lo = mu - 5 * sigma, hi = mu + 5 * sigma + 8 * tau;
  let g = 0;
  for (let i = 0; i <= 600; i++) {
    const x = lo + (hi - lo) * i / 600;
    g = Math.max(g, normalCdf((x - mu) / sigma) - exGaussianCdf(x, mu, sigma, tau));
  }
  return g;
}

/**
 * Add a dashed reference curve to both plots of the simulation demo: the density on the histogram plot
 * and the CDF on the CDF plot (shared with exponential--ex-gaussian).
 */
export function addReference({ left, right }, label, f, F, lo, hi, plot) {
  const sc = left.scene;
  if (sc) {
    const pts = plot.sampleFn(f, lo, hi, 400);
    const peak = Math.max(...pts.map(q => q[1]).filter(Number.isFinite));
    const top = Math.max(sc.y[1], Math.min(peak * 1.08, sc.y[1] * 2.2));
    left.render({
      ...sc, y: [sc.y[0], top],
      layers: [...sc.layers.filter(l => l.id !== 'ref'), { id: 'ref', type: 'line', points: pts, cls: 'curve-ref' }],
      legend: [...(sc.legend || []).filter(l => l.label !== label), { label, cls: 'curve-ref' }],
    });
  }
  const rc = right && right.scene;
  if (rc && F) {
    const cdfLabel = 'CDF of the ' + label.charAt(0).toLowerCase() + label.slice(1);
    right.render({
      ...rc,
      layers: [...rc.layers.filter(l => l.id !== 'ref'), { id: 'ref', type: 'line', points: plot.sampleFn(F, lo, hi, 400), cls: 'curve-ref' }],
      legend: [...(rc.legend || []).filter(l => l.label !== cdfLabel), { label: cdfLabel, cls: 'curve-ref' }],
    });
  }
}

export default {
  id: 'normal--ex-gaussian',
  from: 'normal',
  to: 'ex-gaussian',
  title: 'Adding an independent exponential delay to a normal variable gives an ex-Gaussian variable',

  plain: [
    'Take a normally distributed value with mean $\\mu$ and standard deviation $\\sigma$, and add to it an independent exponential delay with mean $\\tau$. The sum has an ex-Gaussian distribution. The delay is never negative and is usually short but occasionally long, so the sum is the normal bell pushed to the right by $\\tau$ on average and given a long right tail.',
    'In response-time research the normal part is often read as a typical processing time and the exponential part as occasional slow responses, although the components do not map cleanly onto specific mental processes. As $\\tau$ shrinks to 0 the delay disappears and the ex-Gaussian becomes the original normal distribution.',
  ],

  statementTex: REL.statement,
  glossary: [
    { sym: 'X \\sim \\mathcal N(\\mu, \\sigma^2)', meaning: '$X$ is normally distributed with mean $\\mu$ and variance $\\sigma^2$ (standard deviation $\\sigma$).' },
    { sym: '\\mu', meaning: 'The mean of the normal part. It is not the mean of the sum, which is $\\mu + \\tau$.' },
    { sym: '\\sigma', meaning: 'The standard deviation of the normal part.' },
    { sym: 'Y \\sim \\mathrm{Exp}(\\text{rate } 1/\\tau)', meaning: '$Y$ is exponentially distributed with rate $1/\\tau$, that is, with mean $\\tau$.' },
    { sym: '\\tau', meaning: 'The mean of the exponential delay, which sets the length of the right tail.' },
    { sym: '\\text{independent}', meaning: 'The value of $X$ tells nothing about the value of $Y$, and the reverse.' },
    { sym: 'X + Y \\sim \\mathrm{ExGaussian}(\\mu, \\sigma, \\tau)', meaning: 'The sum has the ex-Gaussian distribution with these three parameters.' },
    { sym: '\\tau \\to 0', meaning: 'The exponential mean shrinks toward 0, so the delay becomes negligible.' },
    { sym: '\\Rightarrow', meaning: 'Implies.' },
  ],

  why: [
    'The density of a sum of independent variables is the convolution of their densities. A sum equal to $x$ arises from an exponential delay $y \\ge 0$ together with a normal value $x - y$, so',
    { tex: 'f_{X+Y}(x) = \\int_0^\\infty \\frac{1}{\\tau} e^{-y/\\tau}\\; \\frac{1}{\\sigma\\sqrt{2\\pi}} e^{-(x - y - \\mu)^2/(2\\sigma^2)}\\, dy.' },
    'Completing the square in $y$ turns the integrand into a normal density in $y$ times factors that do not depend on $y$, and integrating over $y \\ge 0$ leaves a normal CDF:',
    { tex: 'f_{X+Y}(x) = \\frac{1}{\\tau} \\exp\\!\\left(\\frac{\\mu - x}{\\tau} + \\frac{\\sigma^2}{2\\tau^2}\\right) \\Phi\\!\\left(\\frac{x - \\mu}{\\sigma} - \\frac{\\sigma}{\\tau}\\right),' },
    'which is the ex-Gaussian density. The moments follow without any integration: means and variances of independent variables add, so the mean is $\\mu + \\tau$ and the variance $\\sigma^2 + \\tau^2$; and the moment-generating function is the product $e^{\\mu t + \\sigma^2 t^2/2} \\cdot 1/(1 - \\tau t)$.',
    'As $\\tau \\to 0$ the exponential delay has mean $\\tau$ and standard deviation $\\tau$, both shrinking to 0, so $Y \\to 0$ and $X + Y \\to X$: the ex-Gaussian approaches $\\mathcal N(\\mu, \\sigma^2)$. Equivalently, the skewness $2\\tau^3/(\\sigma^2 + \\tau^2)^{3/2}$ goes to 0. How close the two are depends on the ratio $\\tau/\\sigma$: a delay that is short compared with the spread of the normal part is hard to see.',
  ],

  references: [
    { text: 'Wikipedia: Exponentially modified Gaussian distribution.', url: 'https://en.wikipedia.org/wiki/Exponentially_modified_Gaussian_distribution' },
    { text: 'Wikipedia: Convolution of probability distributions.', url: 'https://en.wikipedia.org/wiki/Convolution_of_probability_distributions' },
    { text: 'Luce, R. D. (1986). <i>Response Times: Their Role in Inferring Elementary Mental Organization</i>, Section 3.2. Oxford University Press.' },
    { text: 'Matzke, D., &amp; Wagenmakers, E.-J. (2009). Psychological interpretation of the ex-Gaussian and shifted Wald parameters: A diffusion model analysis. <i>Psychonomic Bulletin &amp; Review</i>, 16(5), 798–817.', url: 'https://doi.org/10.3758/PBR.16.5.798' },
  ],

  demo(container, { demos, ui, plot }) {
    const range = ({ mu, sigma, tau }) => [mu - 4 * sigma, mu + 4 * sigma + 6 * tau];
    demos.simulationDemo(container, null, {
      intro: 'Each simulated response time is a normal draw (mean $\\mu$, standard deviation $\\sigma$) plus an independent exponential delay (mean $\\tau$). The histogram of the sums is compared with the ex-Gaussian density (solid); the dashed curves are the density and the CDF of the normal part alone. Make $\\tau$ small and the histogram returns to the dashed normal curve; make it large and the bell is pushed right and stretched into a long tail.',
      params: [
        { key: 'mu', sym: '\\mu', name: 'normal mean', meaning: 'Mean of the normal part (seconds).', min: 0, max: 2, default: 0.4, step: 0.01 },
        { key: 'sigma', sym: '\\sigma', name: 'normal standard deviation', meaning: 'Standard deviation of the normal part.', min: 0.01, max: 0.5, default: 0.06, log: true },
        { key: 'tau', sym: '\\tau', name: 'exponential mean', meaning: 'Mean of the exponential delay; the rate is $1/\\tau$.', min: 0.002, max: 1.5, default: 0.15, log: true },
      ],
      sample: (rng, { mu, sigma, tau }) => rng.normal(mu, sigma) + rng.exponential(1 / tau),
      sampleName: 'normal + exponential draws',
      target: {
        name: ({ mu, sigma, tau }) => `Ex-Gaussian(μ = ${ui.fmt(mu, 3)}, σ = ${ui.fmt(sigma, 3)}, τ = ${ui.fmt(tau, 3)}) density`,
        pdf: (x, { mu, sigma, tau }) => exGaussianPdf(x, mu, sigma, tau),
        cdf: (x, { mu, sigma, tau }) => exGaussianCdf(x, mu, sigma, tau),
      },
      range,
      xLabel: 'response time (s)',
      readout: (p) => `Ex-Gaussian mean $\\mu + \\tau$ = <b>${ui.fmt(p.mu + p.tau, 4)}</b>, standard deviation $\\sqrt{\\sigma^2 + \\tau^2}$ = <b>${ui.fmt(Math.sqrt(p.sigma ** 2 + p.tau ** 2), 4)}</b>. `
        + `Largest gap between the ex-Gaussian CDF and the CDF of the normal part: <b>${ui.fmt(gapToNormal(p), 3)}</b>; it shrinks to 0 as $\\tau \\to 0$ (here $\\tau/\\sigma$ = ${ui.fmt(p.tau / p.sigma, 3)}).`,
      onUpdate: (p, s, plots) => {
        const [lo, hi] = range(p);
        addReference(plots, 'Normal part N(μ, σ²)', x => normalPdf((x - p.mu) / p.sigma) / p.sigma, x => normalCdf((x - p.mu) / p.sigma), lo, hi, plot);
      },
    });
  },
};
