/**
 * GREENBOOK — shared types.
 *
 * The contract between layers, kept deliberately small:
 *
 *   data → skill → adjusted skill → probability → value → stake
 *
 * Every arrow is a pure function over these shapes. Swap the Gaussian for a
 * sim, swap the scraper, swap the staking rule — nothing downstream breaks.
 *
 * Convention for scores: strokes are expressed *relative to the field
 * baseline*, the way Strokes Gained is. LOWER IS BETTER. A player with
 * `m = -1.2` is expected to beat the field by 1.2 strokes per round.
 */

/** Which head-to-head market a matchup is priced in. */
export type Market = 'R1' | '72H';

/**
 * Strokes Gained profile — the substrate. Each component is strokes gained vs.
 * the field per round (positive = better than field). The exploitable
 * asymmetry: tee-to-green (OTT/APP/ARG) persists; PUTT is mostly noise that
 * regresses hard. The skill model leans on the former and discounts the
 * latter. `rounds` drives small-sample regression.
 */
export interface SGProfile {
  /** Off the tee. Sticky. */
  ott: number;
  /** Approach. The king — most predictive of sustained good play. */
  app: number;
  /** Around the green. Moderate, noisy. */
  arg: number;
  /** Putting. Most volatile, least sticky — regresses hard week to week. */
  putt: number;
  /** Rounds of evidence behind this profile. */
  rounds: number;
}

/**
 * A player's skill as a scoring distribution: expected score `m` (relative to
 * field, lower better) and round-to-round volatility `sigma`.
 *
 * This is the single object the whole probability engine consumes. How it was
 * derived (T2G-weighted, putting-discounted, small-sample-regressed) lives
 * upstream in the skill model and is carried for the dashboard in `trace`.
 */
export interface Skill {
  /** Expected score relative to field per round. Lower is better. */
  m: number;
  /** Round-to-round standard deviation, in strokes. Always > 0. */
  sigma: number;
}

/** A named player carrying their skill estimate. */
export interface Player extends Skill {
  id: string;
  name: string;
  /** Optional derivation trail for the dashboard's "unfold" view. */
  trace?: SkillTrace;
}

/**
 * The audit trail behind a skill number. The dashboard's law — no number
 * without a path to its derivation — is enforced by carrying this alongside
 * every estimate, not by reconstructing it later.
 */
export interface SkillTrace {
  /** Base skill before adjustments (T2G-weighted, putting-discounted). */
  base: number;
  /** Each adjustment applied to the mean, in strokes, named. */
  adjustments: { label: string; deltaM: number }[];
  /** Rounds of evidence behind the estimate (drives small-sample regression). */
  sampleSize: number;
  /** Notes worth surfacing (e.g. "regressed 40% toward field: thin sample"). */
  notes?: string[];
}

/** The probability the engine assigns to a two-way matchup. */
export interface MatchupProbability {
  market: Market;
  /** P(A finishes strictly lower than B). */
  pA: number;
  /** P(B finishes strictly lower than A). */
  pB: number;
  /** P(tie / push). Closed form treats this as ~0; the sim computes it. */
  pPush: number;
  /** How the number was produced — for the dashboard and for honesty. */
  method: 'closed-form' | 'monte-carlo';
}

/** American (e.g. -120, +105) or decimal (e.g. 1.83) odds, tagged. */
export type Odds =
  | { format: 'american'; value: number }
  | { format: 'decimal'; value: number };

/** A two-way price as pasted off the book. */
export interface MarketLine {
  a: Odds;
  b: Odds;
}

/** The de-vigged read of a two-way line: the book's honest probabilities. */
export interface Devig {
  /** Raw implied probs from the prices (sum > 1 — includes the vig). */
  rawA: number;
  rawB: number;
  /** The book's hold (overround), e.g. 0.045 = 4.5% vig. */
  hold: number;
  /** Normalized true two-way probabilities (sum to 1). */
  pA: number;
  pB: number;
}

/** Edge + expected value for betting one side. */
export interface ValueRead {
  /** Decimal odds for the side being evaluated. */
  decimalOdds: number;
  /** Our model probability for that side. */
  modelProb: number;
  /** Book's de-vigged probability for that side. */
  devigProb: number;
  /** modelProb − devigProb, in probability points. */
  edge: number;
  /** Expected value per $1 staked. */
  evPerDollar: number;
}

/** The staking decision — fractional Kelly, sized to survive being wrong. */
export interface StakeDecision {
  /** Full-Kelly fraction of bankroll (can be ≤ 0). */
  fullKelly: number;
  /** The fraction multiplier applied (0.25 = quarter Kelly). */
  fraction: number;
  /** Recommended stake in currency units. 0 means no bet. */
  stake: number;
  /** Recommended fraction of bankroll actually wagered. */
  stakeFraction: number;
}

/** The final verdict surfaced per side. Honest, binary, no hedging. */
export interface Verdict {
  side: 'A' | 'B';
  decision: 'VALUE' | 'NO PLAY';
  /** Edge in probability points (for the headline readout). */
  edgePoints: number;
  value: ValueRead;
  stake: StakeDecision;
}
