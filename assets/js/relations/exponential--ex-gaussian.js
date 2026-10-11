// Exponential + independent normal = ex-Gaussian; as sigma -> 0 it reduces to the shifted exponential mu + Y.
// Demo: ctx.demos.simulationDemo (exponential draw blurred by normal noise vs the exact ex-Gaussian density),
// with the shifted exponential mu + Y drawn dashed on the histogram, and a readout of the gap between the
// two CDFs (the sigma -> 0 limit).

import { getRelation } from '../catalog.js';
import { exGaussianPdf, exGaussianCdf } from '../dists/ex-gaussian.js';
import { addReference } from './normal--ex-gaussian.js';

const REL = getRelation('exponential--ex-gaussian');

const shiftedExpPdf = (x, mu, tau) => (x < mu ? 0 : Math.exp(-(x - mu) / tau) / tau);
const shiftedExpCdf = (x, mu, tau) => (x < mu ? 0 : -Math.expm1(-(x - mu) / tau));

/** Largest gap between the ex-Gaussian CDF and the shifted-exponential CDF (checked on both sides of the jump in slope at mu). */
function gapToShiftedExp({ mu, sigma, tau }) {
  const lo = mu - 5 * sigma, hi = mu + 5 * sigma + 8 * tau;
  let g = 0;
  for (let i = 0; i <= 800; i++) {
    const x = lo + (hi - lo) * i / 800;
    g = Math.max(g, Math.abs(exGaussianCdf(x, mu, sigma, tau) - shiftedExpCdf(x, mu, tau)));
  }
  return g;
}

export default {
  id: 'exponential--ex-gaussian',
  from: 'exponential',
  to: 'ex-gaussian',
  title: 'An exponential waiting time blurred by independent normal noise is ex-Gaussian',

  summary: 'An exponential waiting time with mean $\\tau$, shifted by $\\mu$ and blurred by independent normal noise with standard deviation $\\sigma$, has an ex-Gaussian distribution. As $\\sigma$ shrinks to 0 the blur disappears and only the shifted exponential remains.',

  plain: [
    'Start from an exponential waiting time $Y$ with mean $\\tau$, shift it by a constant $\\mu$, and add independent normal noise with standard deviation $\\sigma$. The result is ex-Gaussian. The sharp start of the shifted exponential at $\\mu$ is smoothed into a rising edge whose width is about $\\sigma$, while the long exponential tail on the right stays.',
    'Its density is the convolution of the exponential and normal densities: each possible waiting time is spread out by the normal noise and the results are added up. As $\\sigma$ shrinks to 0 the blur disappears and the ex-Gaussian becomes the shifted exponential $\\mu + Y$.',
  ],

  statementTex: REL.statement,
  glossary: [
    { sym: 'Y \\sim \\mathrm{Exp}(\\text{rate } 1/\\tau)', meaning: '$Y$ is an exponential waiting time with rate $1/\\tau$, that is, with mean $\\tau$.' },
    { sym: '\\tau', meaning: 'The mean of the exponential waiting time.' },
    { sym: 'X \\sim \\mathcal N(\\mu, \\sigma^2)', meaning: '$X$ is normally distributed with mean $\\mu$ and standard deviation $\\sigma$: the shift $\\mu$ plus normal noise.' },
    { sym: '\\mu', meaning: 'The shift: where the exponential part starts when there is no noise.' },
    { sym: '\\sigma', meaning: 'The standard deviation of the normal noise.' },
    { sym: '\\text{independent}', meaning: 'The noise does not depend on the waiting time.' },
    { sym: 'X + Y \\sim \\mathrm{ExGaussian}(\\mu, \\sigma, \\tau)', meaning: 'The sum has the ex-Gaussian distribution with these parameters.' },
    { sym: '\\sigma \\to 0', meaning: 'The noise vanishes.' },
    { sym: '\\mu + Y', meaning: 'The shifted exponential: an exponential waiting time that starts at $\\mu$ instead of 0, with density $\\frac1\\tau e^{-(x - \\mu)/\\tau}$ for $x \\ge \\mu$.' },
    { sym: '\\Rightarrow', meaning: 'Implies.' },
  ],

  why: [
    'The density of the sum is the convolution of the two densities. Seen from the exponential side, the normal noise spreads each waiting time $y$ into a small bell curve centered at $\\mu + y$, and the ex-Gaussian density is the exponential-weighted sum of these bells:',
    { tex: 'f_{X+Y}(x) = \\int_0^\\infty \\frac{1}{\\tau} e^{-y/\\tau}\\; \\frac{1}{\\sigma}\\,\\varphi\\!\\left(\\frac{x - \\mu - y}{\\sigma}\\right) dy = \\frac{1}{\\tau} e^{(\\mu - x)/\\tau + \\sigma^2/(2\\tau^2)}\\, \\Phi\\!\\left(\\frac{x - \\mu}{\\sigma} - \\frac{\\sigma}{\\tau}\\right),' },
    'where $\\varphi$ is the standard normal density and $\\Phi$ the standard normal CDF. Compare this with the shifted exponential density $\\frac1\\tau e^{(\\mu - x)/\\tau}$ for $x \\ge \\mu$. Far to the right of $\\mu$ (many $\\sigma$ above it) the $\\Phi$ factor is close to 1 and the extra factor $e^{\\sigma^2/(2\\tau^2)}$ is close to 1 when $\\sigma$ is small compared with $\\tau$, so the tail is the same exponential tail. Near $\\mu$ the $\\Phi$ factor replaces the sudden jump of the exponential density by a smooth rise of width about $\\sigma$.',
    'As $\\sigma \\to 0$ the factor $\\Phi\\big((x - \\mu)/\\sigma - \\sigma/\\tau\\big)$ becomes a step from 0 to 1 at $x = \\mu$ and the exponential factor tends to $\\frac1\\tau e^{(\\mu - x)/\\tau}$, so the density tends to the shifted exponential density. For small $\\sigma/\\tau$ the largest gap between the two CDFs is about $\\sigma/(\\tau\\sqrt{2\\pi}) \\approx 0.4\\,\\sigma/\\tau$, at $x = \\mu$: there the shifted exponential has had no time to accumulate probability, while the blurred version has already collected the values pushed below $\\mu$ by the noise.',
  ],

  references: [
    { text: 'Wikipedia: Exponentially modified Gaussian distribution.', url: 'https://en.wikipedia.org/wiki/Exponentially_modified_Gaussian_distribution' },
    { text: 'Grushka, E. (1972). Characterization of exponentially modified Gaussian peaks in chromatography. <i>Analytical Chemistry</i>, 44(11), 1733–1738.', url: 'https://doi.org/10.1021/ac60319a011' },
    { text: 'Heathcote, A., Popiel, S. J., &amp; Mewhort, D. J. K. (1991). Analysis of response time distributions: An example using the Stroop task. <i>Psychological Bulletin</i>, 109(2), 340–347.', url: 'https://doi.org/10.1037/0033-2909.109.2.340' },
    { text: 'Casella, G., &amp; Berger, R. L. (2002). <i>Statistical Inference</i> (2nd ed.), Section 5.2 (convolution formula). Duxbury.' },
  ],

  demo(container, { demos, ui, plot }) {
    const range = ({ mu, sigma, tau }) => [mu - 4 * sigma, mu + 4 * sigma + 6 * tau];
    demos.simulationDemo(container, null, {
      intro: 'Each simulated value is an exponential waiting time (mean $\\tau$), shifted by $\\mu$ and blurred by independent normal noise (standard deviation $\\sigma$). The histogram is compared with the ex-Gaussian density (solid); the dashed curves are the density and the CDF of the shifted exponential without noise. Make $\\sigma$ small and the histogram takes on the sharp start of the dashed curve; make it large and the start is smeared out.',
      params: [
        { key: 'tau', sym: '\\tau', name: 'exponential mean', meaning: 'Mean waiting time; the rate is $1/\\tau$.', min: 0.02, max: 1.5, default: 0.25, log: true },
        { key: 'mu', sym: '\\mu', name: 'shift', meaning: 'Where the waiting time starts (the mean of the normal part).', min: 0, max: 2, default: 0.3, step: 0.01 },
        { key: 'sigma', sym: '\\sigma', name: 'noise standard deviation', meaning: 'Standard deviation of the normal noise added to each waiting time.', min: 0.002, max: 0.5, default: 0.04, log: true },
      ],
      sample: (rng, { mu, sigma, tau }) => mu + rng.exponential(1 / tau) + rng.normal(0, sigma),
      sampleName: 'exponential + normal draws',
      target: {
        name: ({ mu, sigma, tau }) => `Ex-Gaussian(μ = ${ui.fmt(mu, 3)}, σ = ${ui.fmt(sigma, 3)}, τ = ${ui.fmt(tau, 3)}) density`,
        pdf: (x, { mu, sigma, tau }) => exGaussianPdf(x, mu, sigma, tau),
        cdf: (x, { mu, sigma, tau }) => exGaussianCdf(x, mu, sigma, tau),
      },
      range,
      xLabel: 'time (s)',
      readout: p => `Largest gap between the ex-Gaussian CDF and the shifted-exponential CDF: <b>${ui.fmt(gapToShiftedExp(p), 3)}</b>; it shrinks to 0 as $\\sigma \\to 0$ (here $\\sigma/\\tau$ = ${ui.fmt(p.sigma / p.tau, 3)}).`,
      onUpdate: (p, s, plots) => {
        const [lo, hi] = range(p);
        addReference(plots, 'Shifted exponential μ + Y (no noise)', x => shiftedExpPdf(x, p.mu, p.tau), x => shiftedExpCdf(x, p.mu, p.tau), lo, hi, plot);
      },
    });
  },
};
