// Poisson -> Normal as λ -> infinity.
// REFERENCE module for limit demos: it uses ctx.demos.compareDemo (see ARCHITECTURE.md).

import { getRelation } from '../catalog.js';
import { gammaQ, lgamma, normalCdf, normalPdf } from '../core/math.js';

const REL = getRelation('poisson--normal');

const poissonPmf = (k, lam) => (k < 0 || !Number.isInteger(k) ? 0 : Math.exp(k * Math.log(lam) - lam - lgamma(k + 1)));
const poissonCdf = (x, lam) => (x < 0 ? 0 : gammaQ(Math.floor(x) + 1, lam));

export default {
  id: 'poisson--normal',
  from: 'poisson',
  to: 'normal',
  title: 'The Poisson distribution approaches a normal distribution as its mean grows',

  plain: [
    'A Poisson count with a large mean $\\lambda$ has a bar chart shaped like a bell curve. The matching normal distribution has the same mean $\\lambda$ and the same variance $\\lambda$, so its standard deviation is $\\sqrt\\lambda$.',
    'The reason is the central limit theorem. A $\\mathrm{Poisson}(\\lambda)$ count can be split into the sum of many independent Poisson counts with small means (for example, the counts in many short time windows), and a sum of many independent pieces is approximately normal.',
  ],

  statementTex: REL.statement,
  glossary: [
    { sym: 'X_\\lambda \\sim \\mathrm{Poisson}(\\lambda)', meaning: '$X_\\lambda$ is a Poisson count with mean $\\lambda$.' },
    { sym: '\\lambda', meaning: 'The mean count, which is also the variance. The statement describes what happens as $\\lambda$ grows without bound.' },
    { sym: '\\frac{X_\\lambda - \\lambda}{\\sqrt\\lambda}', meaning: 'The standardized count: how many standard deviations the count lies above its mean.' },
    { sym: '\\xrightarrow{d}', meaning: 'Converges in distribution: for every $z$, the probability that the standardized count is at most $z$ approaches $\\Phi(z)$.' },
    { sym: '\\mathcal N(0,1)', meaning: 'The standard normal distribution, with mean 0 and standard deviation 1.' },
  ],

  why: [
    'Poisson counts add up: if $Y_1, \\dots, Y_m$ are independent with $Y_i \\sim \\mathrm{Poisson}(\\lambda/m)$, then $Y_1 + \\dots + Y_m \\sim \\mathrm{Poisson}(\\lambda)$. So a Poisson count with a large mean is a sum of many independent pieces, each with mean and variance $\\lambda/m$, and the central limit theorem applies to the sum.',
    'The same result follows from the moment generating function. The standardized count $Z = (X_\\lambda - \\lambda)/\\sqrt\\lambda$ has',
    { tex: '\\log M_Z(t) = \\lambda\\left(e^{t/\\sqrt\\lambda} - 1\\right) - t\\sqrt\\lambda = \\frac{t^2}{2} + \\frac{t^3}{6\\sqrt\\lambda} + \\dots \\;\\to\\; \\frac{t^2}{2},' },
    'which is the log moment generating function of the standard normal. The leftover term $t^3/(6\\sqrt\\lambda)$ reflects the skewness $1/\\sqrt\\lambda$ of the Poisson, which is why the largest gap between the two CDFs shrinks roughly like $1/\\sqrt\\lambda$. A common rule of thumb treats the approximation as adequate when $\\lambda$ is above about 10 to 20, and adding $\\tfrac12$ before standardizing (the continuity correction) improves it.',
  ],

  references: [
    { text: 'Wikipedia: Poisson distribution, related distributions.', url: 'https://en.wikipedia.org/wiki/Poisson_distribution#Related_distributions' },
    { text: 'Casella, G., & Berger, R. L. (2002). <i>Statistical Inference</i> (2nd ed.), Section 5.5. Duxbury.' },
    { text: 'Leemis, L. M., & McQueston, J. T. (2008). Univariate distribution relationships. <i>The American Statistician</i>, 62(1), 45–53.', url: 'https://doi.org/10.1198/000313008X270448' },
  ],

  demo(container, { demos, ui }) {
    let drag = null;
    demos.compareDemo(container, null, {
      intro: 'Increase $\\lambda$ and watch the Poisson bars settle onto the normal curve with the same mean and variance. Drag the amber marker under the axis, or type a value.',
      params: [
        { key: 'lambda', sym: '\\lambda', name: 'mean count', meaning: 'The Poisson mean, which is also its variance.', min: 0.5, max: 200, default: 3, log: true },
      ],
      exact: {
        name: ({ lambda }) => `Poisson(${ui.fmt(lambda, 3)})`, discrete: true,
        pdf: (k, { lambda }) => poissonPmf(k, lambda),
        cdf: (x, { lambda }) => poissonCdf(x, lambda),
      },
      approx: {
        name: ({ lambda }) => `Normal(mean ${ui.fmt(lambda, 3)}, sd ${ui.fmt(Math.sqrt(lambda), 3)})`,
        pdf: (x, { lambda }) => normalPdf((x - lambda) / Math.sqrt(lambda)) / Math.sqrt(lambda),
        cdf: (x, { lambda }) => normalCdf((x - lambda) / Math.sqrt(lambda)),
      },
      range: ({ lambda }) => [Math.max(0, Math.floor(lambda - 4.5 * Math.sqrt(lambda)) - 1), Math.ceil(lambda + 4.5 * Math.sqrt(lambda)) + 1],
      xLabel: 'k (count)',
      // a marker at the mean λ; drag it along the axis (the view refits when you let go)
      handles: ({ lambda }, set) => [{
        id: 'lambda', type: 'xPoint', x: lambda, label: 'λ',
        ariaLabel: 'Mean count λ. Drag, or use the arrow keys.', valueText: ui.fmt(lambda, 3), valueNow: lambda, valueMin: 0.5, valueMax: 200,
        onDrag: (pt, phase) => {
          // the axis stays fixed during a drag (compareDemo freezes it), so the marker can follow the pointer
          if (phase === 'start') drag = true;
          if (pt && drag) set({ lambda: Number(Math.max(0.5, pt.x).toPrecision(3)) });
          if (phase === 'end') drag = null;
        },
        onKey: steps => set({ lambda: Number((lambda * Math.pow(1.05, steps)).toPrecision(3)) }),
      }],
      readout: ({ lambda }) => `The Poisson skewness is $1/\\sqrt\\lambda$ = <b>${ui.fmt(1 / Math.sqrt(lambda), 3)}</b>; the normal has none.`,
    });
  },
};
