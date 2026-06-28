/**
 * GREENBOOK engine — the end-to-end wire.
 *
 * One pure function that runs the whole contract:
 *
 *   players → probability → (paste line) → devig → edge → EV → Kelly → verdict
 *
 * The probability headline uses the closed form by default (fast, deterministic
 * — right for a live readout) and can be swapped for Monte Carlo. The value
 * math always compares like with like: the model's *two-way* (push-excluded)
 * probability against the book's de-vigged two-way probability, because a tied
 * matchup pushes (stake returned), which is EV-neutral and must not be counted
 * as either a win or a loss.
 */

import type {
  Player,
  Market,
  MarketLine,
  MatchupProbability,
  Devig,
  Verdict,
} from './types';
import { pairwiseClosedForm } from './model/pairwise';
import { pairwiseSimulate, type SimOptions } from './model/simulate';
import { devig } from './value/devig';
import { toDecimal } from './value/odds';
import { valueRead, clearsThreshold } from './value/ev';
import { kellyStake, DEFAULT_KELLY_FRACTION } from './value/kelly';

export interface EngineInput {
  a: Player;
  b: Player;
  market?: Market;
  /** The book's two-way price, pasted by the user. Optional — omit for a pure read. */
  line?: MarketLine;
  bankroll?: number;
  kellyFraction?: number;
  /** Minimum edge (points) to call VALUE. Starts conservative. */
  minEdge?: number;
  /** Use Monte Carlo for the headline number instead of the closed form. */
  useSimulation?: boolean;
  simOptions?: SimOptions;
}

export interface EngineResult {
  a: Player;
  b: Player;
  market: Market;
  /** The headline probability (closed form or sim, per input). */
  probability: MatchupProbability;
  /** Always-present closed form, for the fast intuition number + comparison. */
  closedForm: MatchupProbability;
  /** Two-way (push-excluded) model probabilities used for value math. */
  modelTwoWay: { pA: number; pB: number };
  /** Present only when a line was supplied. */
  devig?: Devig;
  verdicts?: { a: Verdict; b: Verdict };
  /** The single VALUE side, if either clears the gate; else null. */
  bestPlay?: Verdict | null;
}

export function runEngine(input: EngineInput): EngineResult {
  const {
    a,
    b,
    market = 'R1',
    line,
    bankroll = 0,
    kellyFraction = DEFAULT_KELLY_FRACTION,
    minEdge = 0.03,
    useSimulation = false,
    simOptions,
  } = input;

  const closedForm = pairwiseClosedForm(a, b, market);
  const probability = useSimulation
    ? pairwiseSimulate(a, b, market, simOptions)
    : closedForm;

  // Push-excluded two-way normalization for value comparison.
  const denom = probability.pA + probability.pB || 1;
  const modelTwoWay = {
    pA: probability.pA / denom,
    pB: probability.pB / denom,
  };

  const result: EngineResult = { a, b, market, probability, closedForm, modelTwoWay };

  if (!line) return result;

  const dv = devig(line);
  const decA = toDecimal(line.a);
  const decB = toDecimal(line.b);

  const verdictA = buildVerdict('A', modelTwoWay.pA, dv.pA, decA, bankroll, kellyFraction, minEdge);
  const verdictB = buildVerdict('B', modelTwoWay.pB, dv.pB, decB, bankroll, kellyFraction, minEdge);

  result.devig = dv;
  result.verdicts = { a: verdictA, b: verdictB };

  // At most one side can be +value in a two-way market; pick the VALUE one.
  const plays = [verdictA, verdictB].filter((v) => v.decision === 'VALUE');
  result.bestPlay = plays.sort((x, y) => y.edgePoints - x.edgePoints)[0] ?? null;

  return result;
}

function buildVerdict(
  side: 'A' | 'B',
  modelProb: number,
  devigProb: number,
  decimalOdds: number,
  bankroll: number,
  fraction: number,
  minEdge: number,
): Verdict {
  const value = valueRead(modelProb, devigProb, decimalOdds);
  const stake = kellyStake(modelProb, decimalOdds, bankroll, fraction);
  const isValue = clearsThreshold(value, minEdge);
  return {
    side,
    decision: isValue ? 'VALUE' : 'NO PLAY',
    edgePoints: value.edge,
    value,
    stake,
  };
}
