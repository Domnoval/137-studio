/**
 * Skill estimation — SG profile → {m, σ} with a derivation trail.
 *
 * This is where the brief's central asymmetry becomes code: ball-striking
 * (T2G) persists, putting is mostly noise that regresses hard. So our forward
 * skill estimate weights each SG component by its *stickiness*, discounting
 * putting heavily — a player riding a hot putter posted a great result on a
 * skill that won't repeat, and the book and public both overvalue him next
 * week. Leaning on T2G is not a detail; it is one of the actual edges.
 *
 * Output convention: `m` is expected score relative to field (lower is
 * better), so it is the NEGATIVE of projected total SG. `σ` folds round-to-
 * round volatility together with estimation uncertainty — thin samples widen
 * σ, which correctly makes the engine less sure and stakes smaller.
 */

import type { SGProfile, Player, SkillTrace } from '../types';

export interface SkillConfig {
  /** Forward-looking weight on each SG component (its stickiness). */
  weights: { ott: number; app: number; arg: number; putt: number };
  /** Rounds at which a sample is "half-trusted" (regression strength). */
  regressionK: number;
  /** Baseline round-to-round scoring volatility, in strokes. */
  baseSigma: number;
  /** Extra σ added for a maximally thin (zero-evidence) sample. */
  sigmaThinBump: number;
}

export const DEFAULT_SKILL_CONFIG: SkillConfig = {
  // APP is the king; OTT sticky; ARG noisier; PUTT heavily discounted.
  weights: { ott: 1.0, app: 1.1, arg: 0.7, putt: 0.35 },
  regressionK: 30,
  baseSigma: 2.8,
  sigmaThinBump: 1.6,
};

/**
 * Project total SG by stickiness, regress toward the field by sample size,
 * and emit {m, σ} plus the full trace. `m = −projectedSG`.
 */
export function estimateSkill(
  id: string,
  name: string,
  sg: SGProfile,
  config: SkillConfig = DEFAULT_SKILL_CONFIG,
): Player {
  const { weights, regressionK, baseSigma, sigmaThinBump } = config;

  // 1. Stickiness-weighted projection of future SG (putting discounted).
  const weightedSG =
    weights.ott * sg.ott +
    weights.app * sg.app +
    weights.arg * sg.arg +
    weights.putt * sg.putt;

  // 2. Small-sample regression toward the field mean (0 SG). shrink → 1 with
  //    evidence; thin samples get pulled hard toward average.
  const shrink = sg.rounds / (sg.rounds + regressionK);
  const projectedSG = weightedSG * shrink;

  // 3. σ widens as evidence thins: estimation uncertainty stacked on the
  //    baseline round volatility.
  const sigma = baseSigma + sigmaThinBump * (1 - shrink);

  const notes: string[] = [];
  if (sg.rounds === 0) {
    notes.push('No record — held at field average with maximum uncertainty.');
  } else if (shrink < 0.6) {
    notes.push(
      `Thin sample (${sg.rounds} rounds): regressed ${Math.round(
        (1 - shrink) * 100,
      )}% toward field, σ widened.`,
    );
  }
  if (sg.putt > 0.3) {
    notes.push('Hot putter discounted — putting is the least sticky skill.');
  }

  const trace: SkillTrace = {
    base: -projectedSG, // base m before contextual adjustments
    adjustments: [],
    sampleSize: sg.rounds,
    notes,
  };

  return { id, name, m: -projectedSG, sigma, trace };
}
