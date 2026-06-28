import { describe, it, expect } from 'vitest';
import {
  americanToDecimal,
  decimalToAmerican,
  impliedProbability,
  parseOdds,
} from './odds';
import { devig } from './devig';
import { valueRead, clearsThreshold } from './ev';
import { kellyStake } from './kelly';

describe('odds conversion', () => {
  it('converts american favorites to decimal', () => {
    expect(americanToDecimal(-120)).toBeCloseTo(1.8333, 4);
    expect(americanToDecimal(-110)).toBeCloseTo(1.9091, 4);
  });

  it('converts american underdogs to decimal', () => {
    expect(americanToDecimal(100)).toBeCloseTo(2.0, 6);
    expect(americanToDecimal(150)).toBeCloseTo(2.5, 6);
  });

  it('round-trips american ↔ decimal', () => {
    for (const a of [-250, -120, -110, 100, 105, 175, 400]) {
      expect(decimalToAmerican(americanToDecimal(a))).toBe(a);
    }
  });

  it('rejects degenerate odds', () => {
    expect(() => americanToDecimal(0)).toThrow();
    expect(() => decimalToAmerican(1)).toThrow();
    expect(() => impliedProbability(0.5)).toThrow();
  });

  it('parses loose user input', () => {
    expect(parseOdds(' -120 ')).toEqual({ format: 'american', value: -120 });
    expect(parseOdds('+105')).toEqual({ format: 'american', value: 105 });
    expect(parseOdds('1.91')).toEqual({ format: 'decimal', value: 1.91 });
    expect(parseOdds('150')).toEqual({ format: 'american', value: 150 });
    expect(parseOdds('abc')).toBeNull();
    expect(parseOdds('')).toBeNull();
  });
});

describe('devig', () => {
  it('strips the vig from a standard -110/-110 line to 50/50', () => {
    const d = devig({
      a: { format: 'american', value: -110 },
      b: { format: 'american', value: -110 },
    });
    expect(d.pA).toBeCloseTo(0.5, 6);
    expect(d.pB).toBeCloseTo(0.5, 6);
    expect(d.pA + d.pB).toBeCloseTo(1, 9);
    // -110/-110 carries ~4.5% hold.
    expect(d.hold).toBeCloseTo(0.0476, 3);
  });

  it('preserves the favorite/underdog ordering after devig', () => {
    const d = devig({
      a: { format: 'american', value: -150 }, // favorite
      b: { format: 'american', value: 130 }, // underdog
    });
    expect(d.pA).toBeGreaterThan(d.pB);
    expect(d.pA + d.pB).toBeCloseTo(1, 9);
  });

  it('a fair (vig-free) 2.0/2.0 line has zero hold', () => {
    const d = devig({
      a: { format: 'decimal', value: 2.0 },
      b: { format: 'decimal', value: 2.0 },
    });
    expect(d.hold).toBeCloseTo(0, 9);
    expect(d.pA).toBeCloseTo(0.5, 9);
  });
});

describe('edge + EV', () => {
  it('computes positive edge when model beats the book', () => {
    // Book pays +100 (decimal 2.0, devig 50%); we think it's 58%.
    const v = valueRead(0.58, 0.5, 2.0);
    expect(v.edge).toBeCloseTo(0.08, 9);
    // EV = 0.58*1 - 0.42 = 0.16 per $1.
    expect(v.evPerDollar).toBeCloseTo(0.16, 9);
    expect(clearsThreshold(v)).toBe(true);
  });

  it('a fair-priced bet has ~zero EV', () => {
    const v = valueRead(0.5, 0.5, 2.0);
    expect(v.evPerDollar).toBeCloseTo(0, 9);
    expect(clearsThreshold(v)).toBe(false);
  });

  it('rejects a thin edge below the error-bar threshold', () => {
    // 1.5-point edge with positive EV is still NO PLAY at the 3-point gate.
    const v = valueRead(0.515, 0.5, 2.0);
    expect(v.evPerDollar).toBeGreaterThan(0);
    expect(clearsThreshold(v, 0.03)).toBe(false);
  });

  it('negative edge is never a play', () => {
    const v = valueRead(0.45, 0.5, 2.0);
    expect(v.evPerDollar).toBeLessThan(0);
    expect(clearsThreshold(v)).toBe(false);
  });
});

describe('fractional Kelly', () => {
  it('quarter-Kelly is a quarter of full Kelly', () => {
    const s = kellyStake(0.58, 2.0, 1000, 0.25);
    // f* = (0.58*2 - 1) / 1 = 0.16; quarter = 0.04 → $40 on $1000.
    expect(s.fullKelly).toBeCloseTo(0.16, 9);
    expect(s.stakeFraction).toBeCloseTo(0.04, 9);
    expect(s.stake).toBeCloseTo(40, 6);
  });

  it('refuses to bet when there is no edge (f* ≤ 0)', () => {
    const s = kellyStake(0.45, 2.0, 1000);
    expect(s.fullKelly).toBeLessThan(0);
    expect(s.stake).toBe(0);
    expect(s.stakeFraction).toBe(0);
  });

  it('stake scales linearly with bankroll', () => {
    const a = kellyStake(0.6, 2.0, 1000);
    const b = kellyStake(0.6, 2.0, 2000);
    expect(b.stake).toBeCloseTo(2 * a.stake, 6);
  });

  it('fraction must be a sane multiplier', () => {
    expect(() => kellyStake(0.6, 2.0, 1000, 0)).toThrow();
    expect(() => kellyStake(0.6, 2.0, 1000, 1.5)).toThrow();
  });
});
