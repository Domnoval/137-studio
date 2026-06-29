/**
 * Walk-forward backtest + calibration — prove it before trusting it with money.
 *
 * Never test on data the model trained on. Roll forward through historical
 * matchups in time order: estimate from everything *before* event T, "bet"
 * event T at the price that was offered, settle, advance. Report the things a
 * sharp actually watches:
 *
 *  - Calibration: when the model says 60%, does it hit ~60%? Bucketed.
 *  - ROI / hit rate / max drawdown on the fractional-Kelly bankroll curve.
 *  - CLV: did we beat the *closing* line? The single best leading indicator of
 *    long-run profit, trustworthy long before settled-bet samples are.
 *
 * If calibration and CLV don't hold, the model isn't ready — and the tool
 * saying so honestly is a feature.
 */

import { devig } from '../value/devig';
import { toDecimal } from '../value/odds';
import { valueRead, clearsThreshold } from '../value/ev';
import { kellyStake, DEFAULT_KELLY_FRACTION } from '../value/kelly';
import type { MarketLine } from '../types';

/** One settled historical matchup with the price we could have taken. */
export interface BacktestSample {
  /** Model's two-way probability for side A at bet time (push-excluded). */
  modelProbA: number;
  /** The price that was offered when we'd have bet. */
  line: MarketLine;
  /** Optional closing line, for CLV. */
  closingLine?: MarketLine;
  /** Ground truth: did side A win? (ties excluded from the sample.) */
  aWon: boolean;
}

export interface BacktestConfig {
  bankroll: number;
  kellyFraction: number;
  minEdge: number;
}

export interface CalibrationBucket {
  lo: number;
  hi: number;
  predicted: number;
  actual: number;
  count: number;
}

export interface BacktestResult {
  bets: number;
  wins: number;
  hitRate: number;
  /** Return on total amount staked. */
  roi: number;
  finalBankroll: number;
  maxDrawdown: number;
  bankrollCurve: number[];
  /** Mean closing-line value across bets that had a closing line (points). */
  avgCLV: number | null;
  calibration: CalibrationBucket[];
}

export function walkForward(
  samples: BacktestSample[],
  config: BacktestConfig = {
    bankroll: 1000,
    kellyFraction: DEFAULT_KELLY_FRACTION,
    minEdge: 0.03,
  },
): BacktestResult {
  let bankroll = config.bankroll;
  let peak = bankroll;
  let maxDrawdown = 0;
  let staked = 0;
  let pnl = 0;
  let bets = 0;
  let wins = 0;
  const curve: number[] = [bankroll];

  const clvs: number[] = [];
  // Calibration accumulators over the side we actually bet.
  const calib = Array.from({ length: 10 }, (_, i) => ({
    lo: i / 10,
    hi: (i + 1) / 10,
    sumPred: 0,
    sumActual: 0,
    count: 0,
  }));

  for (const s of samples) {
    const dv = devig(s.line);
    const decA = toDecimal(s.line.a);
    const decB = toDecimal(s.line.b);

    // Evaluate both sides; bet the one that clears the gate (≤1 in a 2-way).
    const sides = [
      { side: 'A' as const, p: s.modelProbA, dec: decA, devig: dv.pA, won: s.aWon },
      { side: 'B' as const, p: 1 - s.modelProbA, dec: decB, devig: dv.pB, won: !s.aWon },
    ];

    let pick: (typeof sides)[number] | null = null;
    for (const side of sides) {
      const v = valueRead(side.p, side.devig, side.dec);
      if (clearsThreshold(v, config.minEdge)) {
        if (!pick || side.p - side.devig > pick.p - pick.devig) pick = side;
      }
    }
    if (!pick) {
      curve.push(bankroll);
      continue;
    }

    const stakeDecision = kellyStake(pick.p, pick.dec, bankroll, config.kellyFraction);
    const stake = stakeDecision.stake;
    if (stake <= 0) {
      curve.push(bankroll);
      continue;
    }

    bets++;
    staked += stake;
    if (pick.won) {
      bankroll += stake * (pick.dec - 1);
      pnl += stake * (pick.dec - 1);
      wins++;
    } else {
      bankroll -= stake;
      pnl -= stake;
    }

    // Calibration on the bet side.
    const bIdx = Math.min(9, Math.max(0, Math.floor(pick.p * 10)));
    calib[bIdx].sumPred += pick.p;
    calib[bIdx].sumActual += pick.won ? 1 : 0;
    calib[bIdx].count++;

    // CLV: our taken implied prob vs. the closing de-vigged prob for our side.
    if (s.closingLine) {
      const closeDv = devig(s.closingLine);
      const takenImplied = 1 / pick.dec;
      const closeProb = pick.side === 'A' ? closeDv.pA : closeDv.pB;
      // Positive when the line moved toward us (we beat the close).
      clvs.push(closeProb - takenImplied);
    }

    peak = Math.max(peak, bankroll);
    maxDrawdown = Math.max(maxDrawdown, peak === 0 ? 0 : (peak - bankroll) / peak);
    curve.push(bankroll);
  }

  return {
    bets,
    wins,
    hitRate: bets ? wins / bets : 0,
    roi: staked ? pnl / staked : 0,
    finalBankroll: bankroll,
    maxDrawdown,
    bankrollCurve: curve,
    avgCLV: clvs.length ? clvs.reduce((a, b) => a + b, 0) / clvs.length : null,
    calibration: calib
      .filter((c) => c.count > 0)
      .map((c) => ({
        lo: c.lo,
        hi: c.hi,
        predicted: c.sumPred / c.count,
        actual: c.sumActual / c.count,
        count: c.count,
      })),
  };
}
