// Reference values for the special functions in assets/js/core/math.js
// (values from standard tables / high-precision computation).
import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../assets/js/core/math.js';

const rel = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol * Math.max(1, Math.abs(b)), `${msg}: ${a} vs ${b}`);

test('gamma family', () => {
  rel(M.lgamma(0.1), 2.252712651734206, 1e-13, 'lgamma(0.1)');
  rel(M.lgamma(10), Math.log(362880), 1e-13, 'lgamma(10)');
  rel(M.lgamma(100.5), 361.4355404677775, 1e-13, 'lgamma(100.5)');
  rel(M.gamma(0.5), Math.sqrt(Math.PI), 1e-13, 'gamma(1/2)');
  rel(M.gamma(5), 24, 0, 'gamma(5)');
  rel(M.beta(2, 3), 1 / 12, 1e-13, 'beta(2,3)');
  rel(M.binom(10, 3), 120, 0, 'binom');
  rel(M.digamma(1), -M.EULER_GAMMA, 1e-12, 'digamma(1)');
  rel(M.trigamma(1), Math.PI ** 2 / 6, 1e-12, 'trigamma(1)');
});

test('incomplete gamma and beta', () => {
  rel(M.gammaP(10, 5), 0.03182805730620481, 1e-12, 'P(10,5)');
  rel(M.gammaQ(3, 30), 4.501016648012115e-11, 1e-9, 'Q(3,30)');
  rel(M.gammaP(1, 2), 1 - Math.exp(-2), 1e-14, 'P(1,x) = 1 - e^-x');
  rel(M.betaI(0.3, 2, 5), 0.579825, 1e-12, 'I_0.3(2,5)');
  rel(M.betaI(0.5, 7, 7), 0.5, 1e-13, 'symmetry');
  rel(M.betaI(M.betaIinv(0.37, 2.5, 0.7), 2.5, 0.7), 0.37, 1e-12, 'betaIinv');
  rel(M.gammaP(3.3, M.gammaPinv(3.3, 0.9)), 0.9, 1e-12, 'gammaPinv');
});

test('normal and error function', () => {
  rel(M.erf(1), 0.8427007929497149, 1e-14, 'erf(1)');
  rel(M.erfc(6), 2.1519736712498913e-17, 1e-10, 'erfc(6)');
  rel(M.normalCdf(1.96), 0.9750021048517795, 1e-14, 'Phi(1.96)');
  rel(M.normalCdf(-8), 6.22096057427178e-16, 1e-9, 'Phi(-8)');
  rel(M.normalQuantile(0.975), 1.959963984540054, 1e-13, 'Phi^-1(0.975)');
  rel(M.normalQuantile(1e-10), -6.361340902404056, 1e-11, 'Phi^-1(1e-10)');
});

test('Bessel I0, I1', () => {
  rel(M.besselI0(1), 1.2660658777520084, 1e-14, 'I0(1)');
  rel(M.besselI0(5), 27.239871823604442, 1e-13, 'I0(5)');
  rel(M.besselI1(5), 24.335642142450524, 1e-13, 'I1(5)');
  rel(M.besselI0e(60) * Math.exp(60), M.besselI0(60), 1e-12, 'scaled');
  rel(M.besselI0(49.999999), M.besselI0(50.000001), 1e-5, 'continuity at the series/asymptotic switch');
});

test('integration and root finding', () => {
  rel(M.integrate(x => Math.exp(-x * x / 2) / Math.sqrt(2 * Math.PI), -Infinity, Infinity), 1, 1e-12, 'normal pdf');
  rel(M.integrate(x => 1 / (Math.PI * (1 + x * x)), -Infinity, Infinity), 1, 1e-8, 'cauchy pdf');
  rel(M.integrate(x => Math.exp(-x), 0, Infinity), 1, 1e-12, 'exp');
  rel(M.integrate(x => 1 / Math.sqrt(x), 0, 1), 2, 1e-8, 'endpoint singularity');
  rel(M.integrateSimpson(Math.sin, 0, Math.PI), 2, 1e-10, 'simpson');
  rel(M.brent(x => x * x - 2, 0, 2), Math.SQRT2, 1e-13, 'brent');
  rel(M.quantileContinuous(M.normalCdf, 0.3), M.normalQuantile(0.3), 1e-10, 'numeric quantile');
});

test('samplers have the right mean', () => {
  const rng = M.makeRng(3);
  const n = 20000;
  const mean = f => M.mean(rng.many(n, f));
  rel(mean(() => rng.gamma(2.5, 2)), 1.25, 0.03, 'gamma');
  rel(mean(() => rng.gamma(0.4, 1)), 0.4, 0.04, 'gamma shape < 1');
  rel(mean(() => rng.poisson(3)), 3, 0.03, 'poisson small');
  rel(mean(() => rng.poisson(40)), 40, 0.01, 'poisson large');
  rel(mean(() => rng.binomial(200, 0.3)), 60, 0.01, 'binomial large n');
  rel(mean(() => rng.beta(2, 5)), 2 / 7, 0.02, 'beta');
  rel(mean(() => rng.geometric(0.25)), 3, 0.04, 'geometric (failures)');
  rel(mean(() => rng.negativeBinomial(3, 0.5)), 3, 0.04, 'negative binomial');
  rel(mean(() => rng.wald(1, 2)), 1, 0.03, 'wald');
  rel(mean(() => rng.hypergeometric(50, 20, 10)), 4, 0.03, 'hypergeometric');
  const vm = rng.many(n, () => rng.vonMises(1, 4));
  rel(Math.atan2(M.mean(vm.map(Math.sin)), M.mean(vm.map(Math.cos))), 1, 0.02, 'von Mises mean direction');
});
