// Poisson -> Multinomial: independent Poisson counts, conditioned on their total n, are multinomial with
// probabilities proportional to the rates; for one component, X_1 | total = n ~ Bin(n, lambda_1 / sum lambda).
// Demo: ctx.demos.simulationDemo. Each draw simulates three independent Poisson counts again and again until their
// total equals n (rejection sampling, which is exactly what conditioning means), then reports X_1. An extra plot
// compares the average accepted counts of all three categories with n * lambda_j / sum lambda.

import { getRelation } from '../catalog.js';
import { lgamma, logBinom, betaIc } from '../core/math.js';

const REL = getRelation('poisson--multinomial');
const MIN_PROB = 0.003;   // the total n must have at least this probability, or rejection sampling is too slow

const poisPmf = (k, m) => (k < 0 ? 0 : Math.exp(k * Math.log(m) - m - lgamma(k + 1)));
function binPmf(k, n, p) {
  if (!Number.isInteger(k) || k < 0 || k > n) return 0;
  if (p >= 1) return k === n ? 1 : 0;
  return Math.exp(logBinom(n, k) + k * Math.log(p) + (n - k) * Math.log1p(-p));
}
function binCdf(x, n, p) {
  const k = Math.floor(x);
  if (k < 0) return 0;
  if (k >= n) return 1;
  return betaIc(p, k + 1, n - k);
}
const total = p => p.lambda1 + p.lambda2 + p.lambda3;

export default {
  id: 'poisson--multinomial',
  from: 'poisson',
  to: 'multinomial',
  title: 'Independent Poisson counts, given their total, are split according to a multinomial distribution',

  plain: [
    'Suppose several kinds of events are counted over the same period, and the counts are independent Poisson counts with means $\\lambda_1, \\dots, \\lambda_K$: for example, the numbers of visitors arriving at a museum through each of three entrances in an hour. If we are told only that the total was $n$, the remaining uncertainty is how those $n$ events were shared among the kinds. That split is multinomial: each of the $n$ events independently belongs to kind $j$ with probability $\\lambda_j / (\\lambda_1 + \\dots + \\lambda_K)$.',
    'With two kinds the multinomial is a binomial, so $X_1$ given $X_1 + X_2 = n$ is $\\mathrm{Bin}(n,\\ \\lambda_1/(\\lambda_1 + \\lambda_2))$. This is the basis of the exact conditional test for comparing two Poisson rates, and it is why Poisson log-linear models and multinomial models of a contingency table give the same estimates and tests for the quantities they share.',
  ],

  statementTex: REL.statement,
  glossary: [
    { sym: 'X_j', meaning: 'The count of events of kind $j$.' },
    { sym: '\\mathrm{Poisson}(\\lambda_j)', meaning: 'The Poisson distribution with mean $\\lambda_j$.' },
    { sym: '\\lambda_j', meaning: 'The expected count of kind $j$ (its rate times the length of the period).' },
    { sym: 'j = 1, \\dots, K', meaning: 'The kinds (categories) of events; $K$ is the number of kinds.' },
    { sym: '\\text{independent}', meaning: 'The counts of different kinds do not influence each other.' },
    { sym: '\\Rightarrow', meaning: 'Implies.' },
    { sym: '(X_1, \\dots, X_K) \\mid \\sum_j X_j = n', meaning: 'The vector of counts, once we know that the total count is $n$ (conditioning).' },
    { sym: 'n', meaning: 'The observed total count.' },
    { sym: '\\mathrm{Multinomial}\\big(n,\\ \\boldsymbol\\pi\\big)', meaning: 'The multinomial distribution: the counts in $K$ categories when $n$ items are placed independently, each into category $j$ with probability $\\pi_j$.' },
    { sym: '(\\lambda_1, \\dots, \\lambda_K) / \\sum_j \\lambda_j', meaning: 'The category probabilities $\\pi_j = \\lambda_j / (\\lambda_1 + \\dots + \\lambda_K)$: each rate as a share of the total rate. Only the ratios of the rates matter.' },
    { sym: '\\mathrm{Bin}\\big(n,\\ \\lambda_1/(\\lambda_1+\\lambda_2)\\big)', meaning: 'The binomial distribution with $n$ trials and success probability $\\lambda_1/(\\lambda_1 + \\lambda_2)$, the case $K = 2$.' },
  ],

  why: [
    'Write $\\Lambda = \\lambda_1 + \\dots + \\lambda_K$ for the total rate. The sum of independent Poisson counts is Poisson, so the total $S = X_1 + \\dots + X_K$ is $\\mathrm{Poisson}(\\Lambda)$. For counts $x_1, \\dots, x_K$ that add up to $n$, the definition of conditional probability gives',
    { tex: 'P(X_1 = x_1, \\dots, X_K = x_K \\mid S = n) = \\frac{\\prod_{j} e^{-\\lambda_j} \\lambda_j^{x_j} / x_j!}{e^{-\\Lambda} \\Lambda^{n} / n!} = \\frac{n!}{x_1! \\cdots x_K!} \\prod_{j=1}^{K} \\Big(\\frac{\\lambda_j}{\\Lambda}\\Big)^{x_j},' },
    'because the exponential factors $e^{-\\lambda_j}$ multiply to $e^{-\\Lambda}$ and cancel, and $\\Lambda^n = \\prod_j \\Lambda^{x_j}$. The right-hand side is the multinomial probability with $n$ trials and probabilities $\\lambda_j/\\Lambda$.',
    'The result also runs the other way. If the total is $\\mathrm{Poisson}(\\Lambda)$ and each event is assigned to category $j$ independently with probability $\\pi_j$, the category counts are independent $\\mathrm{Poisson}(\\Lambda \\pi_j)$ counts (Poisson splitting, or thinning). This is why a contingency table can be analyzed either as independent Poisson cells (a log-linear model) or as a multinomial sample of fixed size: the likelihoods for the cell probabilities are the same.',
    'In the demonstration the conditioning is done literally: triples of independent Poisson counts are simulated, and only those whose total equals $n$ are kept. The kept values of $X_1$ follow the binomial distribution, whatever the overall scale of the rates.',
  ],

  references: [
    { text: 'Wikipedia: Poisson distribution (sums and conditioning).', url: 'https://en.wikipedia.org/wiki/Poisson_distribution#Sums_of_Poisson-distributed_random_variables' },
    { text: 'Wikipedia: Multinomial distribution (related distributions).', url: 'https://en.wikipedia.org/wiki/Multinomial_distribution#Related_distributions' },
    { text: 'Agresti, A. (2013). <i>Categorical Data Analysis</i> (3rd ed.), Sections 1.2 and 9.1 (Poisson, multinomial and log-linear models). Wiley.' },
    { text: 'Casella, G., & Berger, R. L. (2002). <i>Statistical Inference</i> (2nd ed.), Section 4.6 (multinomial distribution). Duxbury.' },
    { text: 'Bishop, Y. M. M., Fienberg, S. E., & Holland, P. W. (1975). <i>Discrete Multivariate Analysis</i>, Chapter 13 (sampling models for contingency tables). MIT Press.' },
  ],

  demo(container, { demos, ui, plot }) {
    const { h } = ui;
    // running record of the current batch of draws (a new rng object starts a new batch)
    let acc = { rng: null, tries: 0, kept: 0, sums: [0, 0, 0] };
    let extra = null;   // the extra plot, created below once its container is in the page

    const extraBox = h('div');
    const res = demos.simulationDemo(container, null, {
      intro: 'Each simulated value comes from drawing three independent Poisson counts $X_1, X_2, X_3$ with means $\\lambda_1, \\lambda_2, \\lambda_3$, repeating until their total is exactly $n$, and then recording $X_1$. The bars show how often each value of $X_1$ was recorded; the stems show the $\\mathrm{Bin}(n, \\lambda_1/(\\lambda_1+\\lambda_2+\\lambda_3))$ probabilities. Try multiplying all three rates by the same factor, for example changing 2, 3, 5 to 3, 4.5, 7.5: the fraction of triples that are kept changes, but the conditional distribution does not, because only the ratios of the rates matter. A total $n$ far from $\\lambda_1 + \\lambda_2 + \\lambda_3$ is too rare to simulate this way, and such values are refused with a message.',
      params: [
        { key: 'lambda1', sym: '\\lambda_1', name: 'mean of the first count', meaning: 'The expected count of kind 1.', min: 0.5, max: 10, default: 2, step: 0.1 },
        { key: 'lambda2', sym: '\\lambda_2', name: 'mean of the second count', meaning: 'The expected count of kind 2.', min: 0.5, max: 10, default: 3, step: 0.1 },
        { key: 'lambda3', sym: '\\lambda_3', name: 'mean of the third count', meaning: 'The expected count of kind 3.', min: 0.5, max: 10, default: 5, step: 0.1 },
        { key: 'n', sym: 'n', name: 'total count', meaning: 'The total $X_1 + X_2 + X_3$ that the draws are conditioned on.', min: 0, max: 40, default: 8, integer: true },
      ],
      check: p => {
        const L = total(p), pr = poisPmf(p.n, L);
        return pr < MIN_PROB
          ? `A total of ${p.n} has probability ${ui.fmt(pr, 2)} when λ₁ + λ₂ + λ₃ = ${ui.fmt(L, 3)}, too rare to simulate by keeping only matching draws. Choose a total closer to ${ui.fmt(L, 3)}.`
          : null;
      },
      sizes: [200, 1000, 5000],
      size: 1000,
      sample: (rng, p) => {
        if (acc.rng !== rng) acc = { rng, tries: 0, kept: 0, sums: [0, 0, 0] };
        for (let i = 0; i < 2e5; i++) {
          const x1 = rng.poisson(p.lambda1), x2 = rng.poisson(p.lambda2), x3 = rng.poisson(p.lambda3);
          acc.tries++;
          if (x1 + x2 + x3 === p.n) {
            acc.kept++; acc.sums[0] += x1; acc.sums[1] += x2; acc.sums[2] += x3;
            return x1;
          }
        }
        // not reached for totals allowed by check(); fall back to the exact conditional distribution
        const L = total(p), x = rng.multinomial(p.n, [p.lambda1 / L, p.lambda2 / L, p.lambda3 / L]);
        acc.kept++; acc.sums[0] += x[0]; acc.sums[1] += x[1]; acc.sums[2] += x[2];
        return x[0];
      },
      sampleName: 'X₁ among draws with total n',
      target: {
        name: p => `Bin(n = ${p.n}, π₁ = ${ui.fmt(p.lambda1 / total(p), 3)}) probabilities`,
        pdf: (k, p) => binPmf(k, p.n, p.lambda1 / total(p)),
        cdf: (x, p) => binCdf(x, p.n, p.lambda1 / total(p)),
        discrete: true,
      },
      range: p => [0, Math.max(1, p.n)],
      xLabel: 'X₁ (count of the first kind)',
      readout: p => {
        const L = total(p);
        return `To keep ${acc.kept.toLocaleString('en-US')} draws, ${acc.tries.toLocaleString('en-US')} triples were simulated: a fraction <b>${ui.fmt(acc.kept / Math.max(1, acc.tries), 3)}</b> had total $n$, against $P(X_1 + X_2 + X_3 = n)$ = ${ui.fmt(poisPmf(p.n, L), 3)} for a $\\mathrm{Poisson}(${ui.fmt(L, 3)})$ total. `
          + `Binomial mean $n\\pi_1$ = ${ui.fmt(p.n * p.lambda1 / L, 4)}, standard deviation $\\sqrt{n\\pi_1(1-\\pi_1)}$ = ${ui.fmt(Math.sqrt(p.n * p.lambda1 / L * (1 - p.lambda1 / L)), 4)}.`;
      },
      onUpdate: p => drawExtra(p),
    });

    container.append(h('figure', { class: 'plot-fig', style: 'margin-top:1.2rem' },
      ui.rich('figcaption', 'All three categories: average count among the kept draws (bars) and the multinomial means $n\\lambda_j/(\\lambda_1+\\lambda_2+\\lambda_3)$ (stems)'), extraBox));

    function drawExtra(p) {
      if (!extra) return;
      const L = total(p), lam = [p.lambda1, p.lambda2, p.lambda3];
      const k = Math.max(1, acc.kept);
      const bars = acc.sums.map((s, j) => [j + 1, s / k]);
      const stems = lam.map((l, j) => [j + 1, p.n * l / L]);
      const ymax = Math.max(1, ...bars.map(b => b[1]), ...stems.map(s => s[1])) * 1.18;
      extra.render({
        x: [0.4, 3.6], y: [0, ymax], discreteX: true,
        layers: [
          { id: 'avg', type: 'bars', points: bars, width: 0.5, cls: 'bars-strong' },
          { id: 'exp', type: 'stems', points: stems, cls: 'pmf' },
          ...stems.map(([j, v]) => ({ id: 't' + j, type: 'text', x: j, y: v, dy: -12, text: `π${'₁₂₃'[j - 1]} = ${ui.fmt(lam[j - 1] / L, 3)}` })),
        ],
        legend: [{ label: 'average simulated count given the total', cls: 'bars-strong' }, { label: 'n·πⱼ, the multinomial mean', cls: 'curve-main' }],
      });
    }
    extra = new plot.Plot(extraBox, { xLabel: 'category j', yLabel: 'average count', height: w => Math.max(190, Math.min(260, w * 0.3)) });
    drawExtra(res.store.get().p);
  },
};
