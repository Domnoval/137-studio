/**
 * Devig — strip the book's tax.
 *
 * A two-way matchup priced -120 / +100 does NOT imply 54.5% / 50%. Those raw
 * implied probabilities sum to more than 1 on purpose — the excess is the
 * book's margin (the *vig* / *hold* / *overround*). De-vigging normalizes the
 * two raw probabilities so they sum to 1, recovering the book's honest
 * estimate of each side. That de-vigged number is the thing we have to beat.
 *
 * We use the simple proportional (a.k.a. "normalize") method. It's the
 * standard for clean two-way markets and is transparent enough to show its
 * work on the dashboard. (Shin / power methods are a Phase-2 refinement that
 * matter more for lopsided longshot/favorite pairs.)
 */

import type { MarketLine, Devig } from '../types';
import { toDecimal, impliedProbability } from './odds';

export function devig(line: MarketLine): Devig {
  const rawA = impliedProbability(toDecimal(line.a));
  const rawB = impliedProbability(toDecimal(line.b));
  const overround = rawA + rawB;

  if (!(overround > 0)) {
    throw new Error('Degenerate line: implied probabilities sum to zero');
  }

  return {
    rawA,
    rawB,
    // hold is the overround above a fair 100% book.
    hold: overround - 1,
    pA: rawA / overround,
    pB: rawB / overround,
  };
}
