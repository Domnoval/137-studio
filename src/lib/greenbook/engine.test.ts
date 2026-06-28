import { describe, it, expect } from 'vitest';
import { runEngine } from './engine';
import { estimateSkill } from './model/skill';
import type { SGProfile } from './types';

const strong: SGProfile = { ott: 0.8, app: 1.1, arg: 0.3, putt: 0.1, rounds: 60 };
const weak: SGProfile = { ott: 0.1, app: 0.2, arg: 0.1, putt: 0.2, rounds: 60 };

describe('runEngine', () => {
  it('returns a probability with no line (pure read)', () => {
    const a = estimateSkill('a', 'A', strong);
    const b = estimateSkill('b', 'B', weak);
    const r = runEngine({ a, b, market: 'R1' });
    expect(r.probability.pA).toBeGreaterThan(0.5);
    expect(r.devig).toBeUndefined();
    expect(r.verdicts).toBeUndefined();
    expect(r.modelTwoWay.pA + r.modelTwoWay.pB).toBeCloseTo(1, 9);
  });

  it('flags VALUE when the book underprices our favorite', () => {
    const a = estimateSkill('a', 'A', strong);
    const b = estimateSkill('b', 'B', weak);
    // Price the strong player as a coin flip (+100/-110-ish) — a gift.
    const r = runEngine({
      a,
      b,
      market: 'R1',
      line: {
        a: { format: 'american', value: 100 },
        b: { format: 'american', value: -120 },
      },
      bankroll: 1000,
    });
    expect(r.verdicts).toBeDefined();
    expect(r.bestPlay?.side).toBe('A');
    expect(r.bestPlay?.decision).toBe('VALUE');
    expect(r.bestPlay?.stake.stake).toBeGreaterThan(0);
  });

  it('calls NO PLAY when the book has it right', () => {
    const a = estimateSkill('a', 'A', strong);
    const b = estimateSkill('b', 'B', weak);
    const cf = runEngine({ a, b, market: 'R1' });
    // Build a fair line that matches our model exactly → no edge.
    const fairA = 1 / cf.modelTwoWay.pA;
    const fairB = 1 / cf.modelTwoWay.pB;
    const r = runEngine({
      a,
      b,
      market: 'R1',
      line: {
        a: { format: 'decimal', value: fairA },
        b: { format: 'decimal', value: fairB },
      },
      bankroll: 1000,
    });
    expect(r.bestPlay).toBeNull();
    expect(r.verdicts?.a.decision).toBe('NO PLAY');
    expect(r.verdicts?.b.decision).toBe('NO PLAY');
  });

  it('value math is push-neutral (sim with ties still normalizes two-way)', () => {
    const a = estimateSkill('a', 'A', strong);
    const b = estimateSkill('b', 'B', weak);
    const r = runEngine({
      a,
      b,
      market: 'R1',
      useSimulation: true,
      simOptions: { trials: 20000, pushEpsilon: 0.5, seed: 3 },
      line: {
        a: { format: 'american', value: -110 },
        b: { format: 'american', value: -110 },
      },
      bankroll: 1000,
    });
    expect(r.probability.pPush).toBeGreaterThan(0);
    expect(r.modelTwoWay.pA + r.modelTwoWay.pB).toBeCloseTo(1, 9);
  });
});
