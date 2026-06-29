import { describe, it, expect } from 'vitest';
import { walkForward, type BacktestSample } from './walkforward';
import { mulberry32 } from '../model/stats';

/**
 * Build a synthetic settled-bet history where the model is genuinely sharp:
 * the book prices every matchup as a coin flip (2.0/2.0, no vig) but side A's
 * true win rate matches the model's stated probability. A calibrated +edge
 * model must turn a profit and stay calibrated over a big sample.
 */
function sharpHistory(n: number, seed: number): BacktestSample[] {
  const rng = mulberry32(seed);
  const out: BacktestSample[] = [];
  for (let i = 0; i < n; i++) {
    // Model thinks A is 55–70% on these spots.
    const modelProbA = 0.55 + 0.15 * rng();
    const aWon = rng() < modelProbA; // reality agrees with the model
    out.push({
      modelProbA,
      line: { a: { format: 'decimal', value: 2.0 }, b: { format: 'decimal', value: 2.0 } },
      aWon,
    });
  }
  return out;
}

describe('walk-forward backtest', () => {
  it('a sharp, calibrated model profits over a large sample', () => {
    const r = walkForward(sharpHistory(4000, 11), {
      bankroll: 1000,
      kellyFraction: 0.25,
      minEdge: 0.03,
    });
    expect(r.bets).toBeGreaterThan(100);
    expect(r.roi).toBeGreaterThan(0);
    expect(r.finalBankroll).toBeGreaterThan(1000);
    expect(r.maxDrawdown).toBeGreaterThanOrEqual(0);
    expect(r.maxDrawdown).toBeLessThanOrEqual(1);
  });

  it('is well-calibrated: predicted ≈ actual per bucket', () => {
    const r = walkForward(sharpHistory(8000, 23));
    for (const b of r.calibration) {
      if (b.count < 50) continue;
      expect(Math.abs(b.predicted - b.actual)).toBeLessThan(0.08);
    }
  });

  it('a model with no real edge does not manufacture profit', () => {
    // Model claims 60% on A but reality is a true coin flip → should bleed.
    const rng = mulberry32(5);
    const samples: BacktestSample[] = Array.from({ length: 3000 }, () => ({
      modelProbA: 0.6,
      line: { a: { format: 'decimal', value: 2.0 }, b: { format: 'decimal', value: 2.0 } },
      aWon: rng() < 0.5,
    }));
    const r = walkForward(samples);
    expect(r.roi).toBeLessThan(0);
  });

  it('computes CLV when closing lines are supplied', () => {
    const samples: BacktestSample[] = [
      {
        modelProbA: 0.62,
        // We take A at +100 (decimal 2.0)...
        line: { a: { format: 'decimal', value: 2.0 }, b: { format: 'decimal', value: 2.0 } },
        // ...and A closes shorter (-130-ish): the market moved to us.
        closingLine: {
          a: { format: 'american', value: -130 },
          b: { format: 'american', value: 110 },
        },
        aWon: true,
      },
    ];
    const r = walkForward(samples);
    expect(r.avgCLV).not.toBeNull();
    expect(r.avgCLV!).toBeGreaterThan(0); // beat the close
  });
});
