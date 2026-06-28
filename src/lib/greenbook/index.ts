/**
 * GREENBOOK — public surface.
 *
 * Import from here. Everything below is a pure function over the small shared
 * contract in `types.ts`: data → skill → adjusted skill → probability → value
 * → stake. The dashboard, the API route, and the backtest all stand on exactly
 * this surface and nothing private.
 */

export * from './types';
export { runEngine, type EngineInput, type EngineResult } from './engine';
export { pairwiseClosedForm } from './model/pairwise';
export { pairwiseSimulate, type SimOptions } from './model/simulate';
export { estimateSkill, DEFAULT_SKILL_CONFIG, type SkillConfig } from './model/skill';
export {
  applyAdjustments,
  COURSE_ARCHETYPES,
  type CourseArchetype,
  type MatchContext,
} from './model/adjust';
export { devig } from './value/devig';
export { valueRead, clearsThreshold } from './value/ev';
export { kellyStake, DEFAULT_KELLY_FRACTION } from './value/kelly';
export {
  parseOdds,
  toDecimal,
  americanToDecimal,
  decimalToAmerican,
} from './value/odds';
export {
  SEED_PLAYERS,
  getSeed,
  unknownPrior,
  playerId,
  type SeedPlayer,
} from './data/seed';

import type { Player } from './types';
import { SEED_PLAYERS } from './data/seed';
import { estimateSkill } from './model/skill';

/**
 * Turn the cold-start seed priors into ready-to-matchup players. Pure and
 * network-free, so the dashboard always has a real field to work with even
 * before any live ESPN refresh.
 */
export function buildSeedPlayers(): Player[] {
  return SEED_PLAYERS.map((s) => estimateSkill(s.id, s.name, s.sg)).sort((a, b) => a.m - b.m);
}
