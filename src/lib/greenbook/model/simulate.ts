/**
 * Monte Carlo pairwise engine — the truth layer.
 *
 * The closed form is fast and intuitive but Gaussian-lies about golf: real
 * scoring is right-skewed, and a continuous model can't represent ties (a
 * *push* in a matchup), dead-heat rules, or 3-balls. The simulator handles all
 * of that for free, and it's where the model graduates later (correlated
 * rounds, course-specific variance).
 *
 * Per trial: draw a skewed score for each player for each round, sum the
 * rounds (golf matchups are decided on aggregate strokes), and compare. Ties
 * within a `pushEpsilon` strokes count as a push — matchups are quoted to the
 * stroke, and an exact-tie probability is measure-zero in a continuous model,
 * so we need a band to make "push" meaningful.
 *
 * Seeded by default so a quoted number is reproducible — a sim you can't
 * reproduce can't show its work.
 */

import type { Skill, Market, MatchupProbability } from '../types';
import { mulberry32, sampleSkewScore } from './stats';

const ROUNDS: Record<Market, number> = { R1: 1, '72H': 4 };

export interface SimOptions {
  /** Trials to run. 10k–50k is the sweet spot for golf. */
  trials?: number;
  /** Right-skew of the per-round score distribution (0 = symmetric). */
  skew?: number;
  /** Half-width (strokes) of the tie band that counts as a push. */
  pushEpsilon?: number;
  /** PRNG seed — fixed for reproducibility. */
  seed?: number;
}

export function pairwiseSimulate(
  a: Skill,
  b: Skill,
  market: Market = 'R1',
  opts: SimOptions = {},
): MatchupProbability {
  if (!(a.sigma > 0) || !(b.sigma > 0)) {
    throw new Error('Both players need a positive sigma');
  }

  const trials = opts.trials ?? 20000;
  const skew = opts.skew ?? 0.35;
  const pushEpsilon = opts.pushEpsilon ?? 0.5;
  const rng = mulberry32(opts.seed ?? 137);
  const rounds = ROUNDS[market];

  let winA = 0;
  let winB = 0;
  let push = 0;

  for (let t = 0; t < trials; t++) {
    let totalA = 0;
    let totalB = 0;
    for (let r = 0; r < rounds; r++) {
      totalA += sampleSkewScore(a.m, a.sigma, skew, rng);
      totalB += sampleSkewScore(b.m, b.sigma, skew, rng);
    }
    const d = totalA - totalB;
    if (Math.abs(d) <= pushEpsilon) push++;
    else if (d < 0) winA++; // lower strokes wins
    else winB++;
  }

  return {
    market,
    pA: winA / trials,
    pB: winB / trials,
    pPush: push / trials,
    method: 'monte-carlo',
  };
}
