// F -> Beta: if X ~ F(d1, d2) then d1 X / (d1 X + d2) ~ Beta(d1/2, d2/2). Under the null hypothesis of a
// regression F-test this is the null distribution of R^2. The demo is self-contained.

import { getRelation } from '../catalog.js';
import { lbeta, betaI, betaIinv } from '../core/math.js';

const REL = getRelation('f--beta');

function betaPdf(x, a, b) {
  if (x < 0 || x > 1) return 0;
  if (x === 0) return a < 1 ? Infinity : a === 1 ? Math.exp(-lbeta(a, b)) : 0;
  if (x === 1) return b < 1 ? Infinity : b === 1 ? Math.exp(-lbeta(a, b)) : 0;
  return Math.exp((a - 1) * Math.log(x) + (b - 1) * Math.log1p(-x) - lbeta(a, b));
}
const betaCdf = (x, a, b) => (x <= 0 ? 0 : x >= 1 ? 1 : betaI(x, a, b));
const f3 = v => String(Number(v.toPrecision(4)));

export default {
  id: 'f--beta',
  from: 'f',
  to: 'beta',
  title: 'An F variable converted to the scale from 0 to 1 has a beta distribution',

  summary: 'An F variable $X$ with $d_1$ and $d_2$ degrees of freedom, converted to $d_1X/(d_1X + d_2)$, has a $\\mathrm{Beta}(d_1/2,\\ d_2/2)$ distribution. In regression this quantity is the proportion of variance explained, $R^2$, so the null distribution of $R^2$ is beta.',

  plain: [
    'An F statistic $X$ with $d_1$ and $d_2$ degrees of freedom can be turned into a number between 0 and 1 by computing $d_1X/(d_1X + d_2)$. This number has a beta distribution with shapes $d_1/2$ and $d_2/2$. Large F values map to values near 1 and small ones to values near 0.',
    'In regression and ANOVA this transformed value is the proportion of variance explained: $R^2$ for the overall regression F-test, or partial $\\eta^2$ for a single effect. So when the null hypothesis is true (the predictors explain nothing in the population), the sample $R^2$ has a $\\mathrm{Beta}(p/2,\\ (n - p - 1)/2)$ distribution for $p$ predictors and $n$ observations. Its mean $p/(n-1)$ is not 0: with many predictors and few observations, a sizable $R^2$ arises by chance alone.',
  ],

  statementTex: REL.statement,
  glossary: [
    { sym: 'X \\sim F(d_1, d_2)', meaning: '$X$ has the F distribution with $d_1$ numerator and $d_2$ denominator degrees of freedom.' },
    { sym: 'd_1, d_2', meaning: 'The degrees of freedom. In a regression with $p$ predictors and an intercept fitted to $n$ observations, $d_1 = p$ and $d_2 = n - p - 1$.' },
    { sym: '\\frac{d_1 X}{d_1 X + d_2}', meaning: 'The transformed value, between 0 and 1. In regression it equals $R^2$, because $F = (R^2/d_1)/((1 - R^2)/d_2)$.' },
    { sym: '\\mathrm{Beta}\\big(\\tfrac{d_1}{2}, \\tfrac{d_2}{2}\\big)', meaning: 'The beta distribution on $[0, 1]$ with shapes $d_1/2$ and $d_2/2$; its mean is $d_1/(d_1 + d_2)$.' },
    { sym: '\\Rightarrow', meaning: 'Implies.' },
  ],

  why: [
    'Write $X = (U/d_1)/(V/d_2)$ with independent $U \\sim \\chi^2_{d_1}$ and $V \\sim \\chi^2_{d_2}$. Then $d_1X = U\\,d_2/V$, and',
    { tex: '\\frac{d_1 X}{d_1 X + d_2} = \\frac{U d_2/V}{U d_2/V + d_2} = \\frac{U}{U + V}.' },
    'Chi-squared variables are gamma variables with the same rate: $U \\sim \\mathrm{Gamma}(d_1/2, \\tfrac12)$ and $V \\sim \\mathrm{Gamma}(d_2/2, \\tfrac12)$. For independent gamma variables with a common rate, the share $U/(U + V)$ has a $\\mathrm{Beta}(d_1/2, d_2/2)$ distribution (and is independent of the total $U + V$). That proves the statement.',
    'The map can be inverted: if $B \\sim \\mathrm{Beta}(d_1/2, d_2/2)$ then $X = d_2B/(d_1(1 - B)) \\sim F(d_1, d_2)$. This is why the F cumulative distribution function is an incomplete beta function, $P(X \\le x) = I_{d_1x/(d_1x + d_2)}(d_1/2, d_2/2)$, and why software computes F p-values with beta-function routines.',
    'In regression, $\\mathrm{SS}_{\\text{model}}/\\sigma^2 = U$ and $\\mathrm{SS}_{\\text{residual}}/\\sigma^2 = V$ under the null hypothesis, so $R^2 = \\mathrm{SS}_{\\text{model}}/\\mathrm{SS}_{\\text{total}} = U/(U + V)$, exactly the quantity above.',
  ],

  references: [
    { text: 'Wikipedia: F-distribution, related distributions.', url: 'https://en.wikipedia.org/wiki/F-distribution#Related_distributions' },
    { text: 'Wikipedia: Beta distribution, derived from other distributions.', url: 'https://en.wikipedia.org/wiki/Beta_distribution#Derived_from_other_distributions' },
    { text: 'Casella, G., & Berger, R. L. (2002). <i>Statistical Inference</i> (2nd ed.), Theorem 5.3.8. Duxbury.' },
    { text: 'Johnson, N. L., Kotz, S., & Balakrishnan, N. (1995). <i>Continuous Univariate Distributions</i>, Vol. 2 (2nd ed.), Chapters 25 and 27. Wiley.' },
    { text: 'Leemis, L. M., & McQueston, J. T. (2008). Univariate distribution relationships. <i>The American Statistician</i>, 62(1), 45–53.', url: 'https://doi.org/10.1198/000313008X270448' },
  ],

  demo(container, { demos }) {
    demos.simulationDemo(container, null, {
      intro: 'Each simulated value starts as an F draw $X = (U/d_1)/(V/d_2)$ built from two independent chi-squared draws and is then transformed to $d_1X/(d_1X + d_2)$. The histogram is compared with the $\\mathrm{Beta}(d_1/2, d_2/2)$ density. Read $d_1$ as the number of predictors and $d_2$ as the residual degrees of freedom: the histogram is then the distribution of $R^2$ when the predictors are useless.',
      params: [
        { key: 'd1', sym: 'd_1', name: 'numerator degrees of freedom', meaning: 'Numerator degrees of freedom (the number of predictors $p$).', min: 1, max: 40, default: 3, integer: true },
        { key: 'd2', sym: 'd_2', name: 'denominator degrees of freedom', meaning: 'Denominator degrees of freedom (the residual degrees of freedom $n - p - 1$).', min: 1, max: 100, default: 16, integer: true },
      ],
      sample: (rng, { d1, d2 }) => {
        const x = rng.f(d1, d2);
        return d1 * x / (d1 * x + d2);
      },
      sampleName: 'transformed F draws d₁X/(d₁X + d₂)',
      target: {
        name: ({ d1, d2 }) => `Beta(${f3(d1 / 2)}, ${f3(d2 / 2)}) density`,
        pdf: (x, { d1, d2 }) => betaPdf(x, d1 / 2, d2 / 2), cdf: (x, { d1, d2 }) => betaCdf(x, d1 / 2, d2 / 2),
      },
      range: () => [0, 1],
      xLabel: 'd₁X/(d₁X + d₂)   (R² under the null hypothesis)',
      readout: ({ d1, d2 }) => `With $p = ${d1}$ predictors and $n = ${d1 + d2 + 1}$ observations, the null mean of $R^2$ is $d_1/(d_1 + d_2)$ = <b>${f3(d1 / (d1 + d2))}</b>, and $R^2$ must exceed <b>${f3(betaIinv(0.95, d1 / 2, d2 / 2))}</b> (the 95th percentile) to be significant at the 5% level.`,
    });
  },
};
