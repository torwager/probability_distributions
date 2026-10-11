// Categorical distribution: one trial with K possible outcomes 1, ..., K and probabilities p_1, ..., p_K.
// Follows the structure of the reference module dists/normal.js (see ARCHITECTURE.md).
//
// The probability vector is not a catalog parameter. It is kept in the params object as `p.probs`
// (created and resized by normalize). The page uses the standard explorer through customExplorer: an
// explorer-only copy of this module adds hidden helper parameters q1..q10 (one per bar) so that each bar
// gets a vertical-arrow handle that works with the mouse, touch and the arrow keys.

import { catalogParams } from '../catalog.js';
import { quantileDiscrete, clamp } from '../core/math.js';

const K_MAX = 10;
const uniform = K => new Array(K).fill(1 / K);

/** The probability vector, falling back to equal probabilities if it is missing or the wrong length. */
function probsOf(p) {
  return Array.isArray(p.probs) && p.probs.length === p.K ? p.probs : uniform(p.K);
}

function pdf(k, p) {
  if (!Number.isInteger(k) || k < 1 || k > p.K) return 0;
  return probsOf(p)[k - 1];
}

function cdf(x, p) {
  const k = Math.floor(x);
  if (k < 1) return 0;
  if (k >= p.K) return 1;
  const pr = probsOf(p);
  let s = 0;
  for (let j = 0; j < k; j++) s += pr[j];
  return Math.min(1, s);
}

function sf(x, p) {
  const k = Math.floor(x);
  if (k < 1) return 1;
  if (k >= p.K) return 0;
  const pr = probsOf(p);
  let s = 0;
  for (let j = p.K - 1; j >= k; j--) s += pr[j];
  return Math.min(1, s);
}

const quantile = (u, p) => quantileDiscrete(x => cdf(x, p), u, 1, p.K, 1);

function stats(p) {
  const pr = probsOf(p);
  let mean = 0;
  pr.forEach((q, j) => { mean += (j + 1) * q; });
  let v = 0, m3 = 0, m4 = 0, H = 0, mode = 1, best = -1;
  pr.forEach((q, j) => {
    const d = j + 1 - mean;
    v += d * d * q; m3 += d * d * d * q; m4 += d * d * d * d * q;
    if (q > 0) H -= q * Math.log(q);
    if (q >= best - 1e-12) { best = Math.max(best, q); mode = j + 1; }   // ties: the larger category
  });
  const ok = v > 1e-14;
  return {
    mean, variance: v, sd: Math.sqrt(v), median: quantile(0.5, p), mode,
    skewness: ok ? m3 / v ** 1.5 : NaN, exKurtosis: ok ? m4 / (v * v) - 3 : NaN, entropy: H,
  };
}

/** Resize or create the probability vector; equal probabilities when K changes. Rescales to a total of 1. */
function normalize(p, changed) {
  const K = Math.round(clamp(p.K, 2, K_MAX));
  let probs = Array.isArray(p.probs) && p.probs.length === K && changed !== 'K' ? p.probs.map(v => Math.max(0, +v || 0)) : uniform(K);
  const s = probs.reduce((a, b) => a + b, 0);
  probs = s > 0 ? probs.map(v => v / s) : uniform(K);
  return { ...p, K, probs };
}

/** Set category i to v and rescale the others so that the total stays 1. */
function setOne(probs, i, v) {
  v = clamp(v, 0, 1);
  const rest = probs.reduce((s, q, j) => s + (j === i ? 0 : q), 0);
  return probs.map((q, j) => (j === i ? v : rest > 0 ? q * (1 - v) / rest : (1 - v) / (probs.length - 1)));
}

const SUB = d => String(d).split('').map(c => '₀₁₂₃₄₅₆₇₈₉'[+c]).join('');
const fmt3 = v => String(Number(Number(v).toPrecision(3)));

const mod = {
  id: 'categorical',
  name: 'Categorical',
  kind: 'discrete',

  params: catalogParams('categorical'),

  pdf,
  cdf,
  sf,
  quantile,
  sample: (rng, p) => rng.categorical(probsOf(p)) + 1,

  testParams: [
    { K: 4, probs: [0.1, 0.2, 0.3, 0.4] },
    { K: 3, probs: [0.7, 0.2, 0.1] },
    { K: 2, probs: [0.35, 0.65] },                       // a relabeled Bernoulli(0.65)
    { K: 6, probs: [0.05, 0.4, 0.05, 0.05, 0.4, 0.05] },  // two tied modes (the larger is reported)
    { K: 10, probs: [0.02, 0.03, 0.05, 0.1, 0.3, 0.2, 0.1, 0.1, 0.05, 0.05] },
    { K: 5, probs: [0, 0, 1, 0, 0] },                    // all probability on one category
  ],

  range: p => [1, p.K],
  support: p => [1, p.K],
  normalize,
  stats,

  explorer: {
    xLabel: 'j',
    // probabilities are shown on a fixed 0 to 1 scale, so that any bar can be dragged to any height
    yMax: () => 1,
    readouts: [
      {
        label: 'Most likely category (mode)',
        value: p => {
          const pr = probsOf(p), top = Math.max(...pr);
          const tied = pr.map((q, j) => (q >= top - 1e-12 ? j + 1 : 0)).filter(Boolean);
          return tied.length === 1 ? tied[0] : tied.length === pr.length ? `all ${pr.length} tied` : `${tied.join(', ')} (tied)`;
        },
      },
      { label: 'Its probability', value: p => Math.max(...probsOf(p)) },
      { label: 'Entropy H (nats)', value: (p, st) => st.entropy },
      { label: 'Effective number of categories e^H', value: (p, st) => Math.exp(st.entropy) },
    ],
  },

  // The standard explorer, with one vertical arrow per bar (see the comment at the top of the file).
  customExplorer(container, ctx) {
    const { store, ui } = ctx;
    const { h } = ui;
    const qParams = [];
    for (let j = 1; j <= K_MAX; j++) {
      qParams.push({
        key: 'q' + j, sym: `p_{${j}}`, label: 'p' + SUB(j), name: `probability of category ${j}`,
        meaning: `The probability of category ${j}.`, meaningText: `The probability of category ${j}.`,
        domain: '[0, 1]', min: 0, max: 1, default: 0.25, step: 0.01, dragStep: 0.005, integer: false, hidden: true, log: false,
      });
    }
    const exNormalize = (p, changed) => {
      let q = { ...p };
      const m = /^q(\d+)$/.exec(changed || '');
      if (m && Array.isArray(q.probs)) {
        const j = +m[1];
        if (j <= q.probs.length) q.probs = setOne(q.probs, j - 1, q[changed]);
      }
      q = normalize(q, m ? null : changed);
      for (let j = 1; j <= K_MAX; j++) q['q' + j] = j <= q.K ? q.probs[j - 1] : 0;
      return q;
    };
    // bars behind the arrows; with the area tool on, the bars inside the shaded range are drawn in amber
    const inArea = (a, k) => (a.mode === 'left' ? k <= a.a : a.mode === 'right' ? k > a.a : k > a.a && k <= a.b);
    const barLayers = p => {
      const a = store.get().area, pr = probsOf(p);
      const on = a && a.on ? pr.map((q, i) => inArea(a, i + 1)) : pr.map(() => false);
      return [
        { id: 'cat-bars', type: 'bars', points: pr.map((q, i) => [i + 1, q]).filter((_, i) => !on[i]), width: 0.56, cls: 'bars-strong' },
        ...pr.map((q, i) => ({ id: 'cat-on-' + i, type: 'polygon', points: on[i] ? [[i + 0.72, 0], [i + 1.28, 0], [i + 1.28, q], [i + 0.72, q]] : [], cls: 'area-shade' })),
      ];
    };
    const exMod = {
      ...mod,
      explorer: { ...mod.explorer, extraLayers: barLayers },
      params: [...mod.params, ...qParams],
      normalize: exNormalize,
      handles: p => p.probs.map((v, i) => ({
        type: 'vArrow', param: 'q' + (i + 1), label: 'p' + SUB(i + 1),
        from: () => ({ x: i + 1, y: 0 }),
        to: pp => ({ x: i + 1, y: pp.probs[i] }),
        set: pt => ({ ['q' + (i + 1)]: pt.y }),
        ariaLabel: `Probability of category ${i + 1}. Drag the top of the bar up or down, or use the arrow keys; the other probabilities are rescaled so that the total stays 1.`,
      })),
    };
    store.set({ p: exNormalize(store.get().p, null) });
    ctx.mountExplorer(container, exMod, { store });

    // two shortcuts under the parameter box
    const panelBox = container.querySelector('.explorer-params');
    const setProbs = probs => store.set({ p: exNormalize({ ...store.get().p, probs }, null) });
    let seed = 7;
    const eq = h('button', { type: 'button', class: 'btn small-btn' }, 'Equal probabilities');
    eq.addEventListener('click', () => setProbs(uniform(store.get().p.K)));
    const rnd = h('button', { type: 'button', class: 'btn small-btn' }, 'Random probabilities');
    rnd.addEventListener('click', () => {
      const rng = ctx.math.makeRng(seed++);
      setProbs(rng.dirichlet(new Array(store.get().p.K).fill(1)).map(v => Math.round(v * 1000) / 1000));
    });
    if (panelBox) {
      panelBox.append(h('div', { class: 'cat-shortcuts', style: 'display:flex;flex-wrap:wrap;gap:.5rem;margin-top:.7rem' }, eq, rnd),
        ui.rich('p', 'The second button draws the probabilities from a flat Dirichlet distribution, $\\mathrm{Dir}(1, \\dots, 1)$.', { class: 'small muted', style: 'margin:.5rem 0 0' }));
    }
  },

  content: {
    summary: 'The categorical distribution describes a single trial with $K$ possible outcomes, such as one roll of a die or one choice among several options, where outcome $j$ has probability $p_j$. It extends the Bernoulli distribution to more than two outcomes.',
    description: [
      'The categorical distribution describes a single trial that has $K$ possible outcomes, such as one roll of a die, the answer chosen on a multiple-choice question, the option a participant picks in a choice task, or the label a classifier assigns to an image. Each outcome, or category, $j$ has its own probability $p_j$, and the probabilities add up to 1.',
      'The outcome takes one of the values $1, 2, \\dots, K$. These numbers are labels: in most applications the categories have no natural order, so the CDF, mean and variance of the label are meaningful only when the categories are ordered or numeric (as for a die). The parameters are the number of categories $K$ and the probability vector $\\mathbf p = (p_1, \\dots, p_K)$. With $K = 2$ the categorical is the Bernoulli distribution, and with all $p_j = 1/K$ it is the discrete uniform distribution on $1, \\dots, K$.',
    ],
    explorerIntro: 'The left plot shows the probability $p_j$ of each category as a bar, and the right plot the cumulative probability $F(j) = p_1 + \\dots + p_j$, which makes sense when the categories are ordered. Drag the top of any amber arrow up or down to change that category’s probability; the other probabilities are scaled up or down in proportion so that the total stays 1. A focused arrow also moves with the arrow keys. Change the number of categories $K$ with its box, which resets the probabilities to $1/K$ each. The buttons set equal probabilities or draw random ones. When the area tool is on, the bars it adds up are drawn in amber.',
    parameterization: 'The probability vector $\\mathbf p = (p_1, \\dots, p_K)$, with every $p_j \\ge 0$ and $p_1 + \\dots + p_K = 1$, is set by dragging the bars. It starts with equal probabilities $p_j = 1/K$. Some texts code the outcome as a one-hot vector of length $K$ (a 1 in the position of the observed category and 0 elsewhere), which is the same as $\\mathrm{Multinomial}(1, \\mathbf p)$. Categories are numbered from 1 here; some software numbers them from 0. On this page $K$ is the number of categories (on the hypergeometric page the same letter is a number of successes).',

    pdfTex: 'P(X = j) = p_j, \\qquad j = 1, 2, \\dots, K; \\qquad\\text{equivalently}\\quad P(X = x) = \\prod_{j=1}^{K} p_j^{\\,[x = j]}',
    glossary: [
      { sym: 'X', meaning: 'The outcome of the trial: the number (label) of the category that occurs.' },
      { sym: 'j', meaning: 'A category label, a whole number from 1 to $K$.' },
      { sym: 'K', meaning: 'The number of categories.' },
      { sym: 'p_j', meaning: 'The probability of category $j$. All $p_j$ are between 0 and 1 and they add up to 1.' },
      { sym: 'x', meaning: 'A possible outcome, one of $1, \\dots, K$.' },
      { sym: '\\prod_{j=1}^{K}', meaning: 'The product of the factors for $j = 1, \\dots, K$.' },
      { sym: '[x = j]', meaning: 'The indicator (Iverson bracket): 1 if $x$ equals $j$ and 0 otherwise. Only the factor for the observed category is not 1, so the product equals $p_x$. This form is convenient for writing likelihoods.' },
    ],

    cdfTex: 'F(x) = P(X \\le x) = \\sum_{j=1}^{\\lfloor x \\rfloor} p_j',
    cdfIntro: 'The CDF treats the labels $1, \\dots, K$ as ordered. It is useful when the categories are ordered (ratings, die faces) and for drawing samples, but it depends on how unordered categories are numbered.',
    cdfGlossary: [
      { sym: 'F(x)', meaning: 'The cumulative distribution function: the probability that the outcome is one of the categories $1, \\dots, \\lfloor x \\rfloor$.' },
      { sym: 'P(X \\le x)', meaning: 'The probability that the label of the outcome is at most $x$.' },
      { sym: '\\lfloor x \\rfloor', meaning: 'The floor of $x$: $x$ rounded down to a whole number.' },
      { sym: '\\sum_{j=1}^{\\lfloor x \\rfloor} p_j', meaning: 'The sum of the probabilities of the categories up to $\\lfloor x \\rfloor$.' },
    ],
    extraFormulas: [
      {
        title: 'Likelihood and the Dirichlet posterior',
        intro: 'For $n$ independent trials in which category $j$ occurs $n_j$ times, the likelihood is a product of powers of the probabilities. A Dirichlet prior has the same form, so the posterior is again Dirichlet.',
        tex: 'L(\\mathbf p) = \\prod_{j=1}^{K} p_j^{\\,n_j}, \\qquad \\mathbf p \\sim \\mathrm{Dir}(\\alpha_1, \\dots, \\alpha_K) \\;\\Rightarrow\\; \\mathbf p \\mid \\text{data} \\sim \\mathrm{Dir}(\\alpha_1 + n_1, \\dots, \\alpha_K + n_K)',
        glossary: [
          { sym: 'L(\\mathbf p)', meaning: 'The likelihood: the probability of the observed sequence of outcomes, as a function of the probability vector.' },
          { sym: 'n_j', meaning: 'The number of trials in which category $j$ occurred.' },
          { sym: '\\mathrm{Dir}(\\alpha_1, \\dots, \\alpha_K)', meaning: 'The Dirichlet distribution, a distribution over probability vectors; $\\alpha_j > 0$ acts like a prior count for category $j$.' },
          { sym: '\\mathbf p \\mid \\text{data}', meaning: 'The posterior distribution of the probabilities after seeing the data.' },
        ],
      },
      {
        title: 'Softmax parameterization',
        intro: 'Models usually compute the probabilities from unrestricted real numbers (scores, utilities or logits) with the softmax function, which makes them positive and makes them add up to 1.',
        tex: 'p_j = \\frac{e^{u_j/\\tau}}{\\sum_{i=1}^{K} e^{u_i/\\tau}}',
        glossary: [
          { sym: 'u_j', meaning: 'The score (utility, value or logit) of category $j$; any real number.' },
          { sym: '\\tau', meaning: 'The temperature, a positive number. A small $\\tau$ puts almost all probability on the highest score; a large $\\tau$ makes the probabilities nearly equal. Some texts use the inverse temperature $1/\\tau$.' },
          { sym: 'e', meaning: 'The base of natural logarithms, $e \\approx 2.718$.' },
        ],
      },
    ],

    properties: [
      { name: 'Support', tex: 'x \\in \\{1, 2, \\dots, K\\}', value: p => `1, …, ${p.K}`, explain: 'One of the $K$ category labels.' },
      { name: 'Mean', tex: '\\mathrm{E}[X] = \\sum_{j=1}^{K} j\\,p_j', value: p => stats(p).mean, explain: 'The average label. It is meaningful only when the labels are numbers, as for a die (a fair six-sided die has mean 3.5). For unordered categories the mean of the one-hot vector, given below, is the useful summary.' },
      { name: 'Median', tex: '\\text{smallest } j \\text{ with } p_1 + \\dots + p_j \\ge \\tfrac12', value: p => stats(p).median, explain: 'Defined for ordered categories: the first category at which the cumulative probability reaches one half.' },
      { name: 'Mode', tex: '\\arg\\max_j p_j', value: p => stats(p).mode, explain: 'The most probable category, the best single guess of the outcome. When several categories tie, the value shown is the largest label. This is meaningful for any categories, ordered or not.' },
      { name: 'Variance', tex: '\\sum_{j=1}^{K} j^2 p_j - \\Big(\\sum_{j=1}^{K} j\\,p_j\\Big)^2', value: p => stats(p).variance, explain: 'The variance of the label, meaningful only for numeric labels. For the fair die it is $35/12 \\approx 2.917$.' },
      { name: 'Standard deviation', tex: '\\sqrt{\\mathrm{Var}(X)}', value: p => stats(p).sd, explain: 'The square root of the variance of the label.' },
      { name: 'Skewness', tex: '\\frac{\\mathrm{E}[(X - \\mathrm{E}X)^3]}{\\mathrm{Var}(X)^{3/2}}', value: p => stats(p).skewness, explain: 'Computed from the probabilities; for numeric labels only. Positive when the probability is concentrated on the low labels with a tail toward high ones. Undefined when all the probability is on one category.' },
      { name: 'Excess kurtosis', tex: '\\frac{\\mathrm{E}[(X - \\mathrm{E}X)^4]}{\\mathrm{Var}(X)^{2}} - 3', value: p => stats(p).exKurtosis, explain: 'For numeric labels only. With equal probabilities it is $-\\frac{6(K^2 + 1)}{5(K^2 - 1)}$, the value for the discrete uniform distribution.' },
      { name: 'Entropy', tex: 'H = -\\sum_{j=1}^{K} p_j \\ln p_j', value: p => stats(p).entropy, explain: 'In nats (terms with $p_j = 0$ count as 0). It does not depend on the labels or their order. It is 0 when one category is certain and largest, $\\ln K$, when all categories are equally likely. Divide by $\\ln 2$ to get bits.' },
      { name: 'Probability-generating function', tex: 'G(z) = \\mathrm{E}[z^X] = \\sum_{j=1}^{K} p_j z^{j}', explain: 'A polynomial in $z$ whose coefficients are the probabilities. As with the mean, it treats the labels as numbers.' },
      { name: 'Characteristic function', tex: '\\varphi(t) = \\sum_{j=1}^{K} p_j e^{itj}', explain: '$\\mathrm{E}[e^{itX}]$, where $i = \\sqrt{-1}$.' },
      { name: 'One-hot mean and covariance', tex: '\\mathrm{E}[\\mathbf e_X] = \\mathbf p, \\qquad \\mathrm{Cov}(\\mathbf e_X) = \\mathrm{diag}(\\mathbf p) - \\mathbf p\\mathbf p^{\\top}', explain: 'Here $\\mathbf e_X$ is the one-hot vector with a 1 in position $X$. Its $j$-th entry is $\\mathrm{Bernoulli}(p_j)$, so it has variance $p_j(1 - p_j)$, and two different entries have covariance $-p_i p_j$ (exactly one of them can be 1). These are the moments that do not depend on the labels; summing $n$ one-hot vectors gives the multinomial mean $n\\mathbf p$ and covariance $n[\\mathrm{diag}(\\mathbf p) - \\mathbf p\\mathbf p^{\\top}]$.' },
      { name: 'Probability that two draws agree', tex: '\\sum_{j=1}^{K} p_j^2', value: p => probsOf(p).reduce((s, q) => s + q * q, 0), explain: 'The chance that two independent trials give the same category (the Simpson index). One minus it, the Gini–Simpson index, is a measure of diversity; its reciprocal is another “effective number of categories”.' },
      { name: 'Effective number of categories', tex: 'e^{H}', value: p => Math.exp(stats(p).entropy), explain: 'The exponential of the entropy, also called the perplexity: the number of equally likely categories that would have the same entropy. It is $K$ when all categories are equally likely and 1 when one category is certain.' },
    ],

    limits: [
      { text: '<b>Two categories: the Bernoulli distribution.</b> With $K = 2$, $p_1 = 1 - p$ and $p_2 = p$, the categorical is $\\mathrm{Bernoulli}(p)$ with category 2 coded as 1 (success) and category 1 as 0. More generally, the indicator that a categorical outcome equals $j$ is $\\mathrm{Bernoulli}(p_j)$.', relation: 'categorical--bernoulli', to: 'bernoulli' },
      { text: '<b>Equal probabilities: the discrete uniform distribution.</b> With $p_j = 1/K$ for every $j$, the outcome is discrete uniform on $\\{1, \\dots, K\\}$, as for a fair die.', to: 'discrete-uniform' },
      { text: '<b>Counting repeated trials: the multinomial distribution.</b> The counts of each category in $n$ independent categorical trials are $\\mathrm{Multinomial}(n, \\mathbf p)$, and $\\mathrm{Multinomial}(1, \\mathbf p)$ is the categorical outcome written as a one-hot vector.', relation: 'categorical--multinomial', to: 'multinomial' },
      { text: '<b>Gumbel-max: the softmax rule from random utilities.</b> If each category’s score $\\ln p_j$ (or utility $u_j$) is perturbed by independent Gumbel noise and the category with the largest perturbed score is chosen, the choice is categorical with probabilities $p_j$ (or the softmax of the utilities).', relation: 'gumbel--categorical', to: 'gumbel' },
      { text: '<b>A certain outcome.</b> If $p_j = 1$ for one category, the outcome is always $j$ (a degenerate distribution). This is the limit of a softmax as the temperature goes to 0, when one score is strictly the largest.' },
    ],

    uses: {
      frequentist: [
        '<b>Estimating the probabilities.</b> From $n$ trials with counts $n_j$, the maximum-likelihood estimate is the sample proportion $\\hat p_j = n_j/n$, with standard error $\\sqrt{\\hat p_j(1 - \\hat p_j)/n}$.',
        '<b>Goodness-of-fit tests.</b> Pearson’s chi-squared test and the likelihood-ratio G-test compare observed category counts with the counts expected under hypothesized probabilities; the chi-squared test of independence does the same for the cells of a contingency table.',
        '<b>Multinomial logistic regression.</b> The outcome of each observation is categorical with probabilities given by the softmax of linear predictors. Ordinal outcomes use cumulative-logit (proportional-odds) models, which work with the CDF over ordered categories.',
        '<b>Classification and cross-entropy.</b> The cross-entropy loss used to train classifiers is the negative log-likelihood of the categorical distribution, $-\\ln p_{y}$ for the true class $y$, so minimizing its average over the training data is maximum-likelihood estimation.',
      ],
      bayesian: [
        '<b>Dirichlet–categorical conjugacy.</b> With a prior $\\mathbf p \\sim \\mathrm{Dir}(\\alpha_1, \\dots, \\alpha_K)$ and counts $n_1, \\dots, n_K$, the posterior is $\\mathrm{Dir}(\\alpha_1 + n_1, \\dots, \\alpha_K + n_K)$. The posterior predictive probability that the next trial falls in category $j$ is $(\\alpha_j + n_j)/(\\alpha_0 + n)$, with $\\alpha_0 = \\sum_j \\alpha_j$; with all $\\alpha_j = 1$ this is Laplace’s rule of succession for $K$ categories.',
        '<b>Mixture models.</b> In a finite mixture model each observation has a latent categorical label $z_i \\sim \\mathrm{Categorical}(\\boldsymbol\\pi)$ saying which component generated it. Gibbs samplers draw these labels from their categorical conditional distributions, and the EM algorithm computes their posterior probabilities.',
        '<b>Topic models and hierarchical categorical data.</b> Latent Dirichlet allocation gives each word a categorical topic label and each topic a categorical distribution over words, with Dirichlet priors on both.',
        '<b>Model indicators.</b> In Bayesian model averaging and product-space model comparison, the index of the true model is a categorical variable whose posterior probabilities are the posterior model probabilities.',
      ],
      modeling: [
        '<b>Choice models.</b> In reinforcement-learning models of choice, the probability of choosing option $j$ is the softmax of learned values, $p_j \\propto e^{Q_j/\\tau}$. Luce’s choice axiom and the multinomial logit model of economics give the same rule, which follows from random utilities with Gumbel noise.',
        '<b>Multiple-choice and identification tasks.</b> Responses in $K$-alternative tasks (which item was presented, which category a stimulus belongs to) are modeled as categorical, with probabilities given by models such as the generalized context model or mixture models of memory with a guessing component.',
        '<b>Language models and generative models.</b> The next word or token is drawn from a categorical distribution over the vocabulary, usually a softmax with a temperature that controls how random the text is.',
        '<b>Simulation.</b> Categorical draws are generated by comparing one uniform number with the cumulative probabilities (inverse CDF), with Walker’s alias method for many draws, or with the Gumbel-max trick, which also underlies the differentiable Gumbel-softmax relaxation used in machine learning.',
      ],
    },

    references: [
      { text: 'Wikipedia: Categorical distribution.', url: 'https://en.wikipedia.org/wiki/Categorical_distribution' },
      { text: 'Gelman, A., Carlin, J. B., Stern, H. S., Dunson, D. B., Vehtari, A., & Rubin, D. B. (2013). <i>Bayesian Data Analysis</i> (3rd ed.), Section 3.4 (multinomial model with a Dirichlet prior) and Chapter 22 (finite mixture models). CRC Press.', url: 'http://www.stat.columbia.edu/~gelman/book/' },
      { text: 'Agresti, A. (2013). <i>Categorical Data Analysis</i> (3rd ed.), Chapters 1 and 8. Wiley.' },
      { text: 'Bishop, C. M. (2006). <i>Pattern Recognition and Machine Learning</i>, Section 2.2 (multinomial variables and the Dirichlet distribution). Springer.' },
      { text: 'Luce, R. D. (1959). <i>Individual Choice Behavior: A Theoretical Analysis</i>. Wiley.' },
      { text: 'Sutton, R. S., & Barto, A. G. (2018). <i>Reinforcement Learning: An Introduction</i> (2nd ed.), Section 2.8 (softmax action preferences). MIT Press.', url: 'http://incompleteideas.net/book/the-book-2nd.html' },
    ],
  },
};

export default mod;
