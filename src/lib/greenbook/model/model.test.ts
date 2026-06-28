import { describe, it, expect } from 'vitest';
import { normalCdf, erf, mulberry32, sampleSkewScore } from './stats';
import { pairwiseClosedForm } from './pairwise';
import { pairwiseSimulate } from './simulate';

describe('stats primitives', () => {
  it('normalCdf hits known landmarks', () => {
    expect(normalCdf(0)).toBeCloseTo(0.5, 6);
    expect(normalCdf(1.6448536)).toBeCloseTo(0.95, 4); // 95th pctile
    expect(normalCdf(-1.6448536)).toBeCloseTo(0.05, 4);
    expect(normalCdf(1.959964)).toBeCloseTo(0.975, 4);
  });

  it('normalCdf is a proper CDF (monotone, bounded)', () => {
    expect(normalCdf(-6)).toBeGreaterThanOrEqual(0);
    expect(normalCdf(6)).toBeLessThanOrEqual(1);
    expect(normalCdf(0.5)).toBeGreaterThan(normalCdf(0.4));
  });

  it('erf is odd', () => {
    expect(erf(0.7)).toBeCloseTo(-erf(-0.7), 9);
    expect(erf(0)).toBeCloseTo(0, 9);
  });

  it('skew sampling preserves mean and sigma', () => {
    const rng = mulberry32(42);
    const m = -1.0;
    const sigma = 2.8;
    const skew = 0.5;
    const n = 200000;
    let sum = 0;
    let sumSq = 0;
    for (let i = 0; i < n; i++) {
      const x = sampleSkewScore(m, sigma, skew, rng);
      sum += x;
      sumSq += x * x;
    }
    const mean = sum / n;
    const variance = sumSq / n - mean * mean;
    expect(mean).toBeCloseTo(m, 1);
    expect(Math.sqrt(variance)).toBeCloseTo(sigma, 1);
  });

  it('positive skew lengthens the upper (worse-score) tail', () => {
    const rng = mulberry32(7);
    const n = 200000;
    let sum = 0;
    let m3 = 0;
    const xs: number[] = [];
    for (let i = 0; i < n; i++) xs.push(sampleSkewScore(0, 1, 0.6, rng));
    for (const x of xs) sum += x;
    const mean = sum / n;
    for (const x of xs) m3 += (x - mean) ** 3;
    const skewness = m3 / n; // sigma ≈ 1, so this ≈ standardized skewness
    expect(skewness).toBeGreaterThan(0.1);
  });
});

describe('pairwise closed form', () => {
  it('equal players are a coin flip', () => {
    const p = pairwiseClosedForm({ m: 0, sigma: 2.8 }, { m: 0, sigma: 2.8 });
    expect(p.pA).toBeCloseTo(0.5, 6);
    expect(p.pB).toBeCloseTo(0.5, 6);
    expect(p.pA + p.pB).toBeCloseTo(1, 9);
  });

  it('the better (lower-m) player is favored', () => {
    const p = pairwiseClosedForm({ m: -1.5, sigma: 2.8 }, { m: 0, sigma: 2.8 });
    expect(p.pA).toBeGreaterThan(0.5);
  });

  it('the favorite is MORE favored over 72 holes than over one round', () => {
    const a = { m: -1.2, sigma: 2.8 };
    const b = { m: 0, sigma: 2.8 };
    const r1 = pairwiseClosedForm(a, b, 'R1');
    const h72 = pairwiseClosedForm(a, b, '72H');
    expect(h72.pA).toBeGreaterThan(r1.pA);
  });

  it('rejects a non-positive sigma', () => {
    expect(() => pairwiseClosedForm({ m: 0, sigma: 0 }, { m: 0, sigma: 2 })).toThrow();
  });
});

describe('monte carlo vs closed form', () => {
  it('agree to within sim noise when skew = 0 (no ties)', () => {
    const a = { m: -1.0, sigma: 2.8 };
    const b = { m: 0.3, sigma: 3.1 };
    const cf = pairwiseClosedForm(a, b, 'R1');
    const mc = pairwiseSimulate(a, b, 'R1', {
      trials: 50000,
      skew: 0,
      pushEpsilon: 0,
      seed: 99,
    });
    expect(mc.pA).toBeCloseTo(cf.pA, 1);
    expect(mc.pPush).toBe(0);
  });

  it('produces a non-trivial push probability with a tie band', () => {
    const a = { m: 0, sigma: 2.8 };
    const b = { m: 0, sigma: 2.8 };
    const mc = pairwiseSimulate(a, b, 'R1', { trials: 40000, pushEpsilon: 0.5, seed: 5 });
    expect(mc.pPush).toBeGreaterThan(0);
    expect(mc.pA + mc.pB + mc.pPush).toBeCloseTo(1, 9);
  });

  it('is reproducible under a fixed seed', () => {
    const a = { m: -0.5, sigma: 2.9 };
    const b = { m: 0.5, sigma: 2.7 };
    const one = pairwiseSimulate(a, b, '72H', { seed: 1234 });
    const two = pairwiseSimulate(a, b, '72H', { seed: 1234 });
    expect(one.pA).toBe(two.pA);
    expect(one.pPush).toBe(two.pPush);
  });
});
