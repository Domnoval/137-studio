/**
 * Edge and expected value — our number vs. the book's.
 *
 *   edge      = model_prob − devig_prob          (probability points)
 *   EV_per_$1 = model_prob × (decimal − 1) − (1 − model_prob)
 *
 * EV is the expectation of a $1 stake: win profit `(decimal − 1)` with
 * probability `p`, lose the $1 with probability `(1 − p)`. Positive EV is
 * necessary but NOT sufficient to bet — see `clearsThreshold`: a 1-point edge
 * inside a model that's ±5 points uncertain is noise wearing a bet's clothes.
 */

import type { ValueRead } from '../types';

export function valueRead(
  modelProb: number,
  devigProb: number,
  decimalOdds: number,
): ValueRead {
  assertProb(modelProb, 'modelProb');
  assertProb(devigProb, 'devigProb');
  if (!(decimalOdds > 1)) {
    throw new Error(`Invalid decimal odds: ${decimalOdds}`);
  }

  const edge = modelProb - devigProb;
  const evPerDollar = modelProb * (decimalOdds - 1) - (1 - modelProb);

  return { decimalOdds, modelProb, devigProb, edge, evPerDollar };
}

/**
 * The bet gate. Bet only when EV is positive AND the edge clears the model's
 * own error bar. `minEdge` starts conservative (~3–4 points) and tightens as
 * calibration proves out.
 */
export function clearsThreshold(v: ValueRead, minEdge = 0.03): boolean {
  return v.evPerDollar > 0 && v.edge >= minEdge;
}

function assertProb(p: number, name: string): void {
  if (!(p >= 0 && p <= 1)) {
    throw new Error(`${name} must be in [0, 1], got ${p}`);
  }
}
