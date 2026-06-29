/**
 * Pairwise probability — closed form.
 *
 * Head-to-head collapses a 150-player field into a clean two-body question:
 * P(A beats B) = P(A scores strictly lower than B). Model each player's round
 * as Normal(m, σ²). The difference of two independent normals is normal:
 *
 *   D = S_A − S_B ~ Normal(m_A − m_B,  σ_A² + σ_B²)
 *   P(A beats B) = P(D < 0) = Φ( (m_B − m_A) / √(σ_A² + σ_B²) )
 *
 * That single line is the entire heart of the MVP — fast, transparent, and
 * perfect for the dashboard's live headline number. It is the *intuition*
 * layer; the Monte Carlo engine in `simulate.ts` is the truth layer that
 * handles skew, ties, and 72-hole compounding.
 *
 * 72-hole market: over a full event, means scale ~×4 (skill compounds) while
 * variance scales ~×4 too for independent rounds (σ over 4 rounds = √4·σ per
 * round → variance ×4). The *ratio* (m_B−m_A)·4 / √(4(σ_A²+σ_B²)) = √4 ×
 * the per-round z — so the better player is meaningfully more likely to win a
 * 72-hole matchup than a one-round one. That widening gap is an edge to hunt.
 */

import type { Skill, Market, MatchupProbability } from '../types';
import { normalCdf } from './stats';

const ROUNDS: Record<Market, number> = { R1: 1, '72H': 4 };

export function pairwiseClosedForm(
  a: Skill,
  b: Skill,
  market: Market = 'R1',
): MatchupProbability {
  if (!(a.sigma > 0) || !(b.sigma > 0)) {
    throw new Error('Both players need a positive sigma');
  }

  const rounds = ROUNDS[market];
  // Sum over independent rounds: mean ×rounds, variance ×rounds.
  const meanDiff = (b.m - a.m) * rounds;
  const sd = Math.sqrt((a.sigma * a.sigma + b.sigma * b.sigma) * rounds);

  // P(A beats B) = P(S_A < S_B) = Φ((m_B − m_A)·n / √(n(σ_A²+σ_B²))).
  const pA = normalCdf(meanDiff / sd);

  // The closed form has zero ties (continuous distribution). Push is the
  // sim's job; we report 0 here and split the rest, honestly labelled.
  return {
    market,
    pA,
    pB: 1 - pA,
    pPush: 0,
    method: 'closed-form',
  };
}
