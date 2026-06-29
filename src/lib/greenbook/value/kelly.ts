/**
 * Kelly — sized for a model that might be wrong.
 *
 * Full Kelly maximizes long-run growth IF you know the true probability `p`
 * exactly. You don't — `p` is itself a noisy estimate, and full Kelly on a
 * wrong `p` is a ruin machine. So we always cut it: fractional Kelly (¼ to ½)
 * gives up a little growth for a massive reduction in variance and a large
 * margin against our own estimation error. Quarter-Kelly is the default.
 *
 *   b  = decimal − 1                       (profit per $1 on a win)
 *   f* = (p·(b+1) − 1) / b   =   edge / b  (full-Kelly fraction)
 *   stake = max(0, fraction · f*) · bankroll
 *
 * Negative f* → no bet. Ever. The engine refuses, it does not negotiate.
 */

import type { StakeDecision } from '../types';

export const DEFAULT_KELLY_FRACTION = 0.25;

export function kellyStake(
  modelProb: number,
  decimalOdds: number,
  bankroll: number,
  fraction: number = DEFAULT_KELLY_FRACTION,
): StakeDecision {
  if (!(modelProb >= 0 && modelProb <= 1)) {
    throw new Error(`modelProb must be in [0, 1], got ${modelProb}`);
  }
  if (!(decimalOdds > 1)) {
    throw new Error(`Invalid decimal odds: ${decimalOdds}`);
  }
  if (!(bankroll >= 0)) {
    throw new Error(`bankroll must be ≥ 0, got ${bankroll}`);
  }
  if (!(fraction > 0 && fraction <= 1)) {
    throw new Error(`fraction must be in (0, 1], got ${fraction}`);
  }

  const b = decimalOdds - 1;
  const fullKelly = (modelProb * (b + 1) - 1) / b;

  // No edge, no bet. Clamp the negative case to a clean zero stake.
  const stakeFraction = Math.max(0, fraction * fullKelly);

  return {
    fullKelly,
    fraction,
    stake: stakeFraction * bankroll,
    stakeFraction,
  };
}
