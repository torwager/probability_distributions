// Cauchy -> Half-Cauchy: the absolute value of a Cauchy(0, gamma) variable is HalfCauchy(gamma).
// Demo: a "folding" picture (the Cauchy density with its negative half reflected onto the positive half; the
// scale gamma can be dragged), followed by ctx.demos.simulationDemo comparing |X| for simulated Cauchy draws
// with the half-Cauchy density. Both share the same gamma.
// Self-contained: densities are computed directly.

import { getRelation } from '../catalog.js';
import { PI, clamp, makeRng } from '../core/math.js';

const REL = getRelation('cauchy--half-cauchy');

const cPdf = (x, g) => 1 / (PI * g * (1 + (x / g) ** 2));
const hcPdf = (x, g) => (x < 0 ? 0 : 2 * cPdf(x, g));
const hcCdf = (x, g) => (x <= 0 ? 0 : (2 / PI) * Math.atan(x / g));
const n3 = v => String(Number(v.toPrecision(3)));

export default {
  id: 'cauchy--half-cauchy',
  from: 'cauchy',
  to: 'half-cauchy',
  title: 'Folding a Cauchy distribution centered at zero gives the half-Cauchy distribution',

  plain: [
    'If $X$ has a Cauchy distribution centered at 0 with scale $\\gamma$, then its absolute value $|X|$, the distance of $X$ from 0 regardless of sign, has a half-Cauchy distribution with the same scale $\\gamma$. Graphically, the left half of the Cauchy curve is folded over onto the right half, so the density for $x \\ge 0$ is twice the Cauchy density there.',
    'Folding keeps the heavy tails of the Cauchy: the half-Cauchy density falls off like $1/x^2$, and its mean is infinite. The scale $\\gamma$ becomes the median of the half-Cauchy, because half of the Cauchy probability lies between $-\\gamma$ and $\\gamma$. The half-Cauchy is used as a prior for standard deviations, which must be positive; it puts most of its mass near zero but allows occasional large values.',
  ],

  statementTex: REL.statement,
  glossary: [
    { sym: 'X \\sim \\mathrm{Cauchy}(0, \\gamma)', meaning: '$X$ has a Cauchy distribution centered at 0 with scale $\\gamma$: density $1/(\\pi\\gamma[1 + (x/\\gamma)^2])$ on the whole real line.' },
    { sym: '\\gamma', meaning: 'The scale, a positive number: the half-width of the Cauchy curve at half its peak height, and the median of $|X|$.' },
    { sym: '\\Rightarrow', meaning: 'Implies.' },
    { sym: '|X|', meaning: 'The absolute value of $X$: $X$ with its sign removed.' },
    { sym: '\\mathrm{HalfCauchy}(\\gamma)', meaning: 'The half-Cauchy distribution with scale $\\gamma$, on the values $x \\ge 0$.' },
    { sym: 'f(x)', meaning: 'The density of the half-Cauchy distribution at $x$.' },
    { sym: '\\pi', meaning: 'The constant 3.14159….' },
    { sym: 'x \\ge 0', meaning: 'The density applies to non-negative values; it is 0 for negative $x$.' },
  ],

  why: [
    '<b>Folding a symmetric density.</b> For $x \\ge 0$, the event $|X| \\le x$ is the event $-x \\le X \\le x$. Differentiating its probability with respect to $x$ gives the density of $|X|$ as the sum of the densities of $X$ at $x$ and at $-x$:',
    { tex: 'f_{|X|}(x) = f_X(x) + f_X(-x) = \\frac{2}{\\pi\\gamma\\left[1 + (x/\\gamma)^2\\right]}, \\qquad x \\ge 0,' },
    'because the Cauchy density is symmetric around 0, so $f_X(-x) = f_X(x)$. The same reasoning folds a normal distribution centered at 0 into a half-normal, and a Student’s t into a half-t.',
    '<b>The CDF and the median.</b> The Cauchy CDF is $\\tfrac12 + \\tfrac1\\pi\\arctan(x/\\gamma)$, so $P(|X| \\le x) = P(-x \\le X \\le x) = \\tfrac2\\pi\\arctan(x/\\gamma)$. Setting this equal to $\\tfrac12$ gives $\\arctan(x/\\gamma) = \\pi/4$, so the median of $|X|$ is $\\gamma$.',
    '<b>The center must be 0.</b> If the Cauchy were centered at some $x_0 \\neq 0$, folding would add two unequal halves and the result would not be half-Cauchy (it is called a folded Cauchy distribution). The relation needs $x_0 = 0$.',
    '<b>Tails.</b> Folding does not change how fast the tail falls: for large $x$, $P(|X| > x) = 2P(X > x) \\approx 2\\gamma/(\\pi x)$. So $|X|$ has an infinite mean, just as $X$ has no mean. In the simulation below, the sample mean of the folded values does not settle down as the number of draws grows, while the sample median stays close to $\\gamma$.',
  ],

  references: [
    { text: 'Wikipedia: Cauchy distribution.', url: 'https://en.wikipedia.org/wiki/Cauchy_distribution' },
    { text: 'Wikipedia: Folded normal distribution (the general folding construction).', url: 'https://en.wikipedia.org/wiki/Folded_normal_distribution' },
    { text: 'Gelman, A. (2006). Prior distributions for variance parameters in hierarchical models. <i>Bayesian Analysis</i>, 1(3), 515–534.', url: 'https://doi.org/10.1214/06-BA117A' },
    { text: 'Johnson, N. L., Kotz, S., & Balakrishnan, N. (1994). <i>Continuous Univariate Distributions</i>, Vol. 1 (2nd ed.), Chapter 16. Wiley.' },
  ],

  demo(container, { demos, plot, ui }) {
    const { h } = ui;
    // ---- the folding picture (top)
    const foldBox = h('div');
    const foldNote = h('p', { class: 'demo-readout', 'aria-live': 'polite' });
    container.append(
      ui.rich('p', 'The upper plot shows the folding. The dashed curve is the $\\mathrm{Cauchy}(0, \\gamma)$ density on the whole line. Its negative half (shaded amber on the left) is folded over at 0 and stacked on top of the positive half (shaded amber on the right); the two halves together make the half-Cauchy density (solid curve), which is twice the Cauchy density. Drag the amber arrow, which runs from 0 to $\\gamma$ at half the Cauchy peak height, to change the scale. The simulation below draws Cauchy values, takes their absolute values and compares them with the half-Cauchy density.', { class: 'small muted demo-intro' }),
      h('figure', { class: 'plot-fig' }, ui.rich('figcaption', 'Folding the Cauchy density at 0'), foldBox),
      foldNote);
    const P = new plot.Plot(foldBox, { xLabel: 'x', yLabel: 'density', height: w => Math.max(220, Math.min(300, w * 0.32)) });

    const sim = demos.simulationDemo(container, null, {
      params: [
        { key: 'gamma', sym: '\\gamma', name: 'scale', meaning: 'The Cauchy scale, which becomes the median of the half-Cauchy.', min: 0.1, max: 5, default: 1, step: 0.05 },
      ],
      sample: (rng, { gamma }) => Math.abs(rng.cauchy(0, gamma)),
      sampleName: 'absolute values of Cauchy draws',
      target: {
        name: ({ gamma }) => `Half-Cauchy(γ = ${n3(gamma)}) density`,
        pdf: (x, { gamma }) => hcPdf(x, gamma),
        cdf: (x, { gamma }) => hcCdf(x, gamma),
      },
      range: ({ gamma }) => [0, 10 * gamma],
      xLabel: '|x|',
      readout: ({ gamma }, s) => `The half-Cauchy median is $\\gamma$ = <b>${n3(gamma)}</b>. The sample mean (${ui.fmt(s.mean, 3)}) is pulled up by a few huge values and changes a lot between runs, because the true mean is infinite.`,
    });
    // sample median, which is the stable summary here
    const medNote = h('p', { class: 'small muted', 'aria-live': 'polite' });
    container.append(medNote);

    let frozen = null;
    function drawFold() {
      const g = sim.store.get().p.gamma;
      const R = frozen || 6 * g;
      const xd = [-R, R];
      const left = plot.sampleFn(x => cPdf(x, g), -R, 0, 250);
      const right = plot.sampleFn(x => cPdf(x, g), 0, R, 250);
      const yTop = 2.3 / (PI * g);         // a little above the half-Cauchy peak 2/(pi gamma)
      const half = 1 / (2 * PI * g);       // half the Cauchy peak: the Cauchy density at x = gamma
      P.render({
        x: xd, y: [0, yTop],
        layers: [
          // the negative half (amber), and the same piece stacked on top of the positive half after folding
          { id: 'left-fill', type: 'area', points: left, cls: 'area-shade' },
          { id: 'right-fill', type: 'area', points: right, cls: 'pdf-fill' },
          { id: 'folded', type: 'polygon', points: [...right.map(([x, y]) => [x, 2 * y]), ...right.slice().reverse()], cls: 'area-shade' },
          { id: 'cauchy', type: 'line', points: plot.sampleFn(x => cPdf(x, g), -R, R, 500), cls: 'curve-ref' },
          { id: 'hc', type: 'line', points: [[0, 0], ...plot.sampleFn(x => hcPdf(x, g), 0, R, 300)], cls: 'curve-main' },
          { id: 'axis0', type: 'vline', x: 0, cls: 'ref-line' },
        ],
        handles: [{
          id: 'gamma', type: 'hArrow', from: { x: 0, y: half }, to: { x: g, y: half }, label: 'γ',
          ariaLabel: 'Scale γ. Drag the arrow tip left or right, or use the arrow keys.',
          valueText: n3(g), valueNow: g, valueMin: 0.1, valueMax: 5,
          onDrag: (pt, phase) => {
            if (phase === 'start') frozen = R;
            if (pt) setGamma(pt.x);
            if (phase === 'end') { frozen = null; drawFold(); }
          },
          onKey: steps => setGamma(g + 0.05 * steps),
        }],
        legend: [
          { label: `Cauchy(0, ${n3(g)}) density`, cls: 'curve-ref' },
          { label: 'negative half (amber), and the same area after folding', cls: 'area-shade' },
          { label: `positive half + folded half = Half-Cauchy(${n3(g)})`, cls: 'curve-main' },
        ],
      });
      ui.renderRich(foldNote, `Half of the Cauchy probability lies between $-\\gamma$ and $\\gamma$, so after folding, $P(|X| \\le \\gamma) = \\tfrac12$: the median of the half-Cauchy is $\\gamma$ = <b>${n3(g)}</b>. The peak height doubles, from $1/(\\pi\\gamma)$ = ${ui.fmt(1 / (PI * g), 3)} to $2/(\\pi\\gamma)$ = <b>${ui.fmt(2 / (PI * g), 3)}</b>.`);
    }
    function setGamma(v) {
      const g = clamp(Math.round(v * 100) / 100, 0.1, 5);
      sim.store.set({ p: { ...sim.store.get().p, gamma: g } });
    }
    // the sample median of the simulated |X| values (same draws as the simulation: same seed and size)
    function drawMedian() {
      const { p, size, seed } = sim.store.get();
      const rng = makeRng(1000 + seed);
      const xs = new Float64Array(size);
      for (let i = 0; i < size; i++) xs[i] = Math.abs(rng.cauchy(0, p.gamma));
      xs.sort();
      const med = size % 2 ? xs[(size - 1) / 2] : 0.5 * (xs[size / 2 - 1] + xs[size / 2]);
      let big = 0; for (const v of xs) if (v > 10 * p.gamma) big++;
      ui.renderRich(medNote, `Sample median of the simulated values: <b>${ui.fmt(med, 3)}</b> (the half-Cauchy median is ${n3(p.gamma)}). ${big.toLocaleString('en-US')} of the ${size.toLocaleString('en-US')} values (${ui.fmt(100 * big / size, 2)}%) lie beyond $10\\gamma$, outside the plotted range; the half-Cauchy predicts ${ui.fmt(100 * (1 - hcCdf(10 * p.gamma, p.gamma)), 3)}%.`);
    }
    let raf = 0;
    sim.store.subscribe(() => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; drawFold(); drawMedian(); }); });
    drawFold();
    drawMedian();
  },
};
