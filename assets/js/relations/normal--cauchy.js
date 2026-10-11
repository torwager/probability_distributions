// Normal -> Cauchy: the ratio of two independent standard normal variables is standard Cauchy.
// The demo has two parts:
//  1. a simulation (ctx.demos.simulationDemo) of sigma1 Z1 / (mu2 + sigma2 Z2) against Cauchy(0, sigma1/sigma2);
//     a non-zero mu2 shows that the result needs a denominator centered at 0;
//  2. a geometric view: the points (Z2, Z1) in the plane, a draggable line of slope t through the origin and
//     the double wedge where Z1/Z2 <= t. Its angle is (pi/2 + arctan t) on each side, which gives the Cauchy CDF.
// Self-contained: the Cauchy density and CDF are computed here.

import { getRelation } from '../catalog.js';
import { makeRng, PI } from '../core/math.js';

const REL = getRelation('normal--cauchy');

const cauchyPdf = (x, g) => 1 / (PI * g * (1 + (x / g) ** 2));
const cauchyCdf = (x, g) => { const z = x / g; return z < -1 ? Math.atan(-1 / z) / PI : 0.5 + Math.atan(z) / PI; };
const f4 = v => String(Number(v.toPrecision(4))).replace(/^-/, '−');

const PARAMS = [
  { key: 'sigma1', sym: '\\sigma_1', name: 'numerator standard deviation', meaning: 'Standard deviation of the normal variable in the numerator (its mean is 0).', min: 0.2, max: 5, default: 1 },
  { key: 'sigma2', sym: '\\sigma_2', name: 'denominator standard deviation', meaning: 'Standard deviation of the normal variable in the denominator.', min: 0.2, max: 5, default: 1 },
  { key: 'mu2', sym: '\\mu_2', name: 'denominator mean', meaning: 'Mean of the normal variable in the denominator. The ratio is Cauchy only when this is 0; try other values to see the match break down.', min: -3, max: 3, default: 0 },
];

export default {
  id: 'normal--cauchy',
  from: 'normal',
  to: 'cauchy',
  title: 'The ratio of two independent standard normal variables has a standard Cauchy distribution',

  summary: 'The ratio of two independent normal variables centered at 0 has a Cauchy distribution (standard when both are standard). The denominator is often close to 0, which makes the ratio occasionally huge and gives the Cauchy its heavy tails.',

  plain: [
    'Take two independent standard normal variables $Z_1$ and $Z_2$, each with mean 0 and standard deviation 1, and divide one by the other. The ratio $Z_1/Z_2$ has the standard Cauchy distribution, with location 0 and scale 1.',
    'The denominator $Z_2$ is often close to zero, and dividing by a number close to zero gives a huge result. That is where the heavy tails of the Cauchy distribution come from: even though both normal variables rarely exceed 3 in size, about 6% of the ratios exceed 10 in size, and about 0.6% exceed 100.',
    'Both normals must be centered at 0. If the numerator and denominator have standard deviations $\\sigma_1$ and $\\sigma_2$, the ratio is Cauchy with scale $\\sigma_1/\\sigma_2$. If the denominator has a non-zero mean, the ratio is no longer Cauchy, although its tails remain heavy.',
  ],

  statementTex: REL.statement,
  glossary: [
    { sym: 'Z_1, Z_2', meaning: 'Two random variables, the numerator and the denominator of the ratio.' },
    { sym: '\\overset{iid}{\\sim}', meaning: 'Independent and identically distributed: both have the same distribution and neither affects the other.' },
    { sym: '\\mathcal N(0,1)', meaning: 'The standard normal distribution, with mean 0 and standard deviation 1.' },
    { sym: '\\Rightarrow', meaning: 'Implies: if the left-hand side holds, so does the right-hand side.' },
    { sym: 'Z_1/Z_2', meaning: 'The ratio of the two variables. It is defined except when $Z_2 = 0$, which happens with probability 0.' },
    { sym: '\\mathrm{Cauchy}(0,1)', meaning: 'The standard Cauchy distribution, with location (median) 0 and scale 1; its density is $1/[\\pi(1 + x^2)]$.' },
  ],

  why: [
    'The quickest argument is geometric. The pair $(Z_2, Z_1)$ is a random point in the plane whose density $\\frac{1}{2\\pi}e^{-(z_1^2 + z_2^2)/2}$ depends only on the distance from the origin. So the direction of the point is uniformly distributed: its angle $\\Theta$ with the horizontal axis is uniform on $(-\\pi, \\pi]$. The ratio is the slope of the line from the origin to the point, $Z_1/Z_2 = \\tan\\Theta$.',
    'The event $Z_1/Z_2 \\le t$ is the double wedge between the downward vertical direction and the line of slope $t$, on both sides of the origin. Each half has angle $\\pi/2 + \\arctan t$, so',
    { tex: 'P\\!\\left(\\frac{Z_1}{Z_2} \\le t\\right) = \\frac{2\\,(\\pi/2 + \\arctan t)}{2\\pi} = \\frac12 + \\frac1\\pi\\arctan t,' },
    'which is the standard Cauchy CDF. The second figure of the demonstration above (the cloud of dots) shows this wedge.',
    'The same result follows from the formula for the density of a ratio, $f_{Z_1/Z_2}(t) = \\int |z|\\,\\varphi(tz)\\,\\varphi(z)\\,dz$, where $\\varphi$ is the standard normal density:',
    { tex: 'f(t) = \\frac{2}{2\\pi}\\int_0^\\infty z\\, e^{-z^2(1 + t^2)/2}\\,dz = \\frac{1}{\\pi(1 + t^2)}.' },
    'The heavy tails come from the denominator. $Z_2$ falls within $\\pm\\varepsilon$ of 0 with probability about $0.8\\,\\varepsilon$ for small $\\varepsilon$, and whenever it does, the ratio is of order $1/\\varepsilon$. Hence $P(|Z_1/Z_2| > k)$ shrinks only like $2/(\\pi k)$, too slowly for the ratio to have a mean.',
    'Scaling either variable just rescales the ratio, so $(\\sigma_1 Z_1)/(\\sigma_2 Z_2) \\sim \\mathrm{Cauchy}(0, \\sigma_1/\\sigma_2)$; for correlated centered normals with correlation $\\rho$ the ratio is Cauchy with location $\\rho\\sigma_1/\\sigma_2$ and scale $\\sigma_1\\sqrt{1 - \\rho^2}/\\sigma_2$. When the means are not zero the rotational symmetry is lost and the ratio has a more complicated distribution (Marsaglia, 1965; Hinkley, 1969). The same construction also gives Student’s $t$ with one degree of freedom, $Z_1/\\sqrt{Z_2^2} = Z_1/|Z_2|$, which has the same distribution as $Z_1/Z_2$.',
  ],

  references: [
    { text: 'Wikipedia: Cauchy distribution.', url: 'https://en.wikipedia.org/wiki/Cauchy_distribution' },
    { text: 'Wikipedia: Ratio distribution, normal ratio distributions.', url: 'https://en.wikipedia.org/wiki/Ratio_distribution#Normal_ratio_distributions' },
    { text: 'Casella, G., & Berger, R. L. (2002). <i>Statistical Inference</i> (2nd ed.), Section 4.3. Duxbury.' },
    { text: 'Marsaglia, G. (1965). Ratios of normal variables and ratios of sums of uniform variables. <i>Journal of the American Statistical Association</i>, 60(309), 193–204.', url: 'https://doi.org/10.1080/01621459.1965.10480783' },
    { text: 'Hinkley, D. V. (1969). On the ratio of two correlated normal random variables. <i>Biometrika</i>, 56(3), 635–639.', url: 'https://doi.org/10.1093/biomet/56.3.635' },
    { text: 'Leemis, L. M., & McQueston, J. T. (2008). Univariate distribution relationships. <i>The American Statistician</i>, 62(1), 45–53.', url: 'https://doi.org/10.1198/000313008X270448' },
  ],

  demo(container, ctx) {
    const { demos, ui } = ctx;
    const sim = demos.simulationDemo(container, null, {
      intro: 'Each simulated value is the ratio $\\sigma_1 Z_1 / (\\mu_2 + \\sigma_2 Z_2)$ of two independent normal draws. With $\\mu_2 = 0$ the histogram follows the $\\mathrm{Cauchy}(0, \\sigma_1/\\sigma_2)$ density. The plot shows the window of 10 scale units on either side of 0; about 6% of the ratios fall outside it. Set $\\mu_2$ to a non-zero value to see the match break down.',
      params: PARAMS,
      sample: (rng, { sigma1, sigma2, mu2 }) => {
        let d = mu2 + sigma2 * rng.normal();
        while (d === 0) d = mu2 + sigma2 * rng.normal();
        return sigma1 * rng.normal() / d;
      },
      sampleName: 'ratios σ1·Z1 / (μ2 + σ2·Z2)',
      target: {
        name: ({ sigma1, sigma2 }) => `Cauchy(0, γ = ${ui.fmt(sigma1 / sigma2, 3)}) density`,
        pdf: (x, { sigma1, sigma2 }) => cauchyPdf(x, sigma1 / sigma2),
        cdf: (x, { sigma1, sigma2 }) => cauchyCdf(x, sigma1 / sigma2),
      },
      range: ({ sigma1, sigma2 }) => [-10 * sigma1 / sigma2, 10 * sigma1 / sigma2],
      xLabel: 'ratio',
      readout: ({ sigma1, sigma2, mu2 }, s) => {
        const g = sigma1 / sigma2;
        let t = `The Cauchy scale is $\\gamma = \\sigma_1/\\sigma_2$ = <b>${f4(g)}</b>. The sample mean and standard deviation above do not settle down as the number of draws grows, because the Cauchy distribution has neither; compare the sample median and quartiles with $0$ and $\\pm\\gamma$ instead.`;
        if (mu2 !== 0) t += ` <b>The denominator mean is not 0</b>, so the ratio is not Cauchy: values near 0 are rarer and moderate values ${Math.abs(mu2) > sigma2 ? 'cluster near $\\sigma_1 Z_1/\\mu_2$, which is approximately normal' : 'are distributed differently'}, but the tails are still heavy.`;
        return t;
      },
    });
    geometryFigure(container, ctx, sim.store);
  },
};

/**
 * The points (Z2, Z1) in the plane with a draggable line of slope t through the origin.
 * The shaded double wedge holds the points whose ratio Z1/Z2 is at most t.
 */
function geometryFigure(container, ctx, simStore) {
  const { plot, ui } = ctx;
  const { h } = ui;
  const box = h('div');
  const cap = h('figcaption', {});
  const readout = h('p', { class: 'demo-readout', 'aria-live': 'polite' });
  container.append(h('figure', { class: 'plot-fig', style: 'margin-top:1.4rem' }, cap, h('div', { style: 'max-width:560px;margin:0 auto' }, box)), readout);
  ui.renderRich(cap, 'Why the ratio is Cauchy: each dot is a pair $(Z_2, Z_1)$ drawn with the parameters above, and the ratio $Z_1/Z_2$ is the slope of the line from the origin to the dot. Drag the amber knob to turn the line of slope $t$; the shaded double wedge holds the dots with $Z_1/Z_2 \\le t$.');
  const P = new plot.Plot(box, { xLabel: 'Z₂ (denominator)', yLabel: 'Z₁ (numerator)', equalAspect: true, height: w => Math.max(260, Math.min(520, w * 0.92)) });

  const NPTS = 600;
  let theta = Math.atan(1);   // angle of the line; t = tan(theta), default t = 1
  let cache = { key: '', pts: [] };
  function points(p, seed) {
    const key = JSON.stringify([p, seed]);
    if (cache.key !== key) {
      const rng = makeRng(5000 + seed);
      const pts = [];
      for (let i = 0; i < NPTS; i++) pts.push([p.mu2 + p.sigma2 * rng.normal(), p.sigma1 * rng.normal()]);
      cache = { key, pts };
    }
    return cache.pts;
  }
  const wedge = (a0, a1, R) => {
    const pts = [[0, 0]];
    for (let i = 0; i <= 48; i++) { const a = a0 + (a1 - a0) * i / 48; pts.push([R * Math.cos(a), R * Math.sin(a)]); }
    return pts;
  };

  let raf = 0;
  const request = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; draw(); }); };
  simStore.subscribe(request);

  function draw() {
    const { p, seed } = simStore.get();
    const pts = points(p, seed);
    const L = 3.3 * Math.max(p.sigma1, p.sigma2) + Math.abs(p.mu2);
    const R = 4 * L, t = Math.tan(theta);
    const layers = [
      { id: 'w1', type: 'polygon', points: wedge(-PI / 2, theta, R), cls: 'area-shade' },
      { id: 'w2', type: 'polygon', points: wedge(PI / 2, PI + theta, R), cls: 'area-shade' },
      { id: 'ax-x', type: 'hline', y: 0, cls: 'ref-line' },
      { id: 'ax-y', type: 'vline', x: 0, cls: 'ref-line' },
      { id: 'line', type: 'segment', x1: -R * Math.cos(theta), y1: -R * Math.sin(theta), x2: R * Math.cos(theta), y2: R * Math.sin(theta), cls: 'guide' },
    ];
    let below = 0;
    pts.forEach(([x, y], i) => {
      if (y / x <= t) below++;
      layers.push({ id: 'p' + i, type: 'dot', x, y, r: 2.1 });
    });
    const knobR = 0.78 * L;
    P.render({
      x: [-L, L], y: [-L, L],
      layers,
      handles: [{
        id: 'slope', type: 'point', at: { x: knobR * Math.cos(theta), y: knobR * Math.sin(theta) }, label: 't',
        ariaLabel: 'Slope t of the line through the origin. Drag the knob around, or use the arrow keys.',
        valueText: f4(t), valueNow: t, valueMin: -100, valueMax: 100,
        onDrag: pt => {
          if (!pt) return;
          // the line through the origin: a point on the left half means the same line as its mirror image
          let a = Math.atan2(pt.y, pt.x);
          if (a > PI / 2) a -= PI; else if (a < -PI / 2) a += PI;
          theta = Math.max(-PI / 2 + 0.01, Math.min(PI / 2 - 0.01, a));
          request();
        },
        onKey: steps => { theta = Math.max(-PI / 2 + 0.01, Math.min(PI / 2 - 0.01, theta + 0.02 * steps)); request(); },
      }],
      legend: [{ label: 'region where Z₁/Z₂ ≤ t (bounded by the line of slope t)', cls: 'area-shade' }],
    });
    const g = p.sigma1 / p.sigma2;
    const exact = cauchyCdf(t, g);
    const wedgeDeg = (90 + theta * 180 / PI);
    let html = `Slope $t$ = <b>${f4(t)}</b>. Each half of the wedge spans ${wedgeDeg.toFixed(1)}°, so if the direction of the dots is uniform the wedge holds a fraction $\\tfrac12 + \\tfrac1\\pi\\arctan t$ of them. `
      + `Dots in the wedge: <b>${below}</b> of ${NPTS} (${(below / NPTS).toFixed(3)}); Cauchy CDF $F(t)$ = <b>${exact.toFixed(3)}</b>.`;
    if (p.sigma1 !== p.sigma2) html += ` With unequal standard deviations the cloud is stretched, which only rescales the slopes: the ratio is Cauchy with scale $\\sigma_1/\\sigma_2$ = ${f4(g)}, and $F(t) = \\tfrac12 + \\tfrac1\\pi\\arctan(t/${f4(g)})$.`;
    if (p.mu2 !== 0) html += ' The cloud is no longer centered at the origin, so the directions are not uniform and the fraction in the wedge no longer follows the Cauchy CDF.';
    ui.renderRich(readout, html);
  }
  draw();
}
