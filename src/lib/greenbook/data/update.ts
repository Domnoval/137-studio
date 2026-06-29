/**
 * Live skill update — keep priors current as an event unfolds.
 *
 * Two regimes:
 *
 *  1. Component data available (a richer SG source): `ewmaUpdate` blends each
 *     SG component prior → posterior with an exponential decay. Form is real;
 *     decay stops us overfitting to last week's putter.
 *
 *  2. Only gross scores available (ESPN, the common case): we can't see the
 *     SG breakdown, only the *total*. We turn each round into an SG:TOT proxy
 *     (field mean − player's gross; positive = gained) and fold it in with
 *     `applyTotalSGUpdate`, distributing the change across components in
 *     proportion to their *stickiness* so a hot week lifts the durable skills
 *     and barely touches putting — preserving the player's archetype instead
 *     of laundering a hot putter into "improved ball-striking".
 */

import type { SGProfile } from '../types';
import type { Leaderboard } from './espn';

/** Default EWMA weight on a fresh observation. Lower = more inertia. */
export const DEFAULT_ALPHA = 0.25;

/**
 * Per-component stickiness — how much of a *total* surprise we attribute to
 * each skill. Mirrors the predictive-weight table: ball-striking persists,
 * putting is noise. Used to distribute a gross-score update without component
 * data. Normalized at use, so only the ratios matter.
 */
const STICKINESS = { ott: 1.0, app: 1.1, arg: 0.7, putt: 0.35 } as const;

/** Clean per-component EWMA update. Increments the evidence count. */
export function ewmaUpdate(
  prior: SGProfile,
  obs: SGProfile,
  alpha: number = DEFAULT_ALPHA,
): SGProfile {
  assertAlpha(alpha);
  const mix = (p: number, o: number) => (1 - alpha) * p + alpha * o;
  return {
    ott: mix(prior.ott, obs.ott),
    app: mix(prior.app, obs.app),
    arg: mix(prior.arg, obs.arg),
    putt: mix(prior.putt, obs.putt),
    rounds: prior.rounds + obs.rounds,
  };
}

/** Mean gross score across players who completed `roundIndex` (0-based). */
export function fieldMeanForRound(
  board: Leaderboard,
  roundIndex: number,
): number | null {
  const scores = board.players
    .map((p) => p.rounds[roundIndex])
    .filter((v): v is number => typeof v === 'number' && v > 0);
  if (scores.length === 0) return null;
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

/**
 * SG:TOT proxy per round for one player: field mean minus their gross. A
 * positive number means they beat the field that round. This is the signal we
 * fold into the prior when component SG is unavailable.
 */
export function totalSGObservations(
  board: Leaderboard,
  playerId: string,
): number[] {
  const player = board.players.find((p) => p.id === playerId);
  if (!player) return [];
  const obs: number[] = [];
  for (let r = 0; r < player.rounds.length; r++) {
    const fieldMean = fieldMeanForRound(board, r);
    const gross = player.rounds[r];
    if (fieldMean === null || typeof gross !== 'number') continue;
    obs.push(fieldMean - gross);
  }
  return obs;
}

/**
 * Fold gross-score-derived total-SG observations into a prior. EWMA the total
 * skill toward each observed round, then push the per-round residual onto the
 * components by stickiness. Each observation counts as one round of evidence.
 */
export function applyTotalSGUpdate(
  prior: SGProfile,
  totalSGObs: number[],
  alpha: number = DEFAULT_ALPHA,
): SGProfile {
  assertAlpha(alpha);
  const stickSum = STICKINESS.ott + STICKINESS.app + STICKINESS.arg + STICKINESS.putt;
  const w = {
    ott: STICKINESS.ott / stickSum,
    app: STICKINESS.app / stickSum,
    arg: STICKINESS.arg / stickSum,
    putt: STICKINESS.putt / stickSum,
  };

  let next = { ...prior };
  for (const obsTotal of totalSGObs) {
    const priorTotal = next.ott + next.app + next.arg + next.putt;
    const delta = alpha * (obsTotal - priorTotal);
    next = {
      ott: next.ott + delta * w.ott,
      app: next.app + delta * w.app,
      arg: next.arg + delta * w.arg,
      putt: next.putt + delta * w.putt,
      rounds: next.rounds + 1,
    };
  }
  return next;
}

function assertAlpha(alpha: number): void {
  if (!(alpha > 0 && alpha <= 1)) {
    throw new Error(`alpha must be in (0, 1], got ${alpha}`);
  }
}
