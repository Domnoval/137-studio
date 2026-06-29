/**
 * Cold-start skill priors.
 *
 * The chicken-and-egg — you need history to estimate skill, but want live
 * numbers now — dissolves by seeding each player's SG profile from prior
 * performance, then updating live off ESPN round scores (see `update.ts`).
 *
 * These are hand-curated *priors*, not live truth: approximate season-level
 * strokes-gained component profiles for a slice of the current PGA field,
 * expressed as strokes gained vs. field per round. They exist so the engine is
 * never blind on a fresh install. Replace/extend by loading a real historical
 * SG dataset (e.g. the public 2007–2017 cleaned CSVs referenced in the brief)
 * into this same shape. The numbers are illustrative — calibrate before you
 * trust a stake to them.
 */

import type { SGProfile } from '../types';

export interface SeedPlayer {
  id: string;
  name: string;
  sg: SGProfile;
}

/** Slugify a name into a stable id. */
export function playerId(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

const ROW = (
  name: string,
  ott: number,
  app: number,
  arg: number,
  putt: number,
  rounds: number,
): SeedPlayer => ({ id: playerId(name), name, sg: { ott, app, arg, putt, rounds } });

/**
 * Curated priors. Ordered roughly by total SG. Component splits reflect each
 * player's well-known archetype (e.g. bombers carry OTT, second-shot wizards
 * carry APP) so course-fit has real texture to work with.
 */
export const SEED_PLAYERS: SeedPlayer[] = [
  ROW('Scottie Scheffler', 0.85, 1.25, 0.35, 0.05, 60),
  ROW('Rory McIlroy', 1.05, 0.7, 0.2, 0.15, 58),
  ROW('Jon Rahm', 0.7, 0.85, 0.4, 0.25, 50),
  ROW('Xander Schauffele', 0.55, 0.8, 0.3, 0.35, 56),
  ROW('Viktor Hovland', 0.6, 0.95, -0.1, 0.1, 54),
  ROW('Ludvig Aberg', 0.8, 0.75, 0.15, 0.05, 40),
  ROW('Collin Morikawa', 0.35, 1.05, 0.25, -0.15, 55),
  ROW('Patrick Cantlay', 0.45, 0.7, 0.3, 0.4, 57),
  ROW('Wyndham Clark', 0.75, 0.5, 0.1, 0.3, 48),
  ROW('Brian Harman', 0.05, 0.55, 0.35, 0.55, 52),
  ROW('Tommy Fleetwood', 0.5, 0.7, 0.3, 0.05, 53),
  ROW('Hideki Matsuyama', 0.4, 0.9, 0.2, -0.1, 51),
  ROW('Tony Finau', 0.65, 0.45, 0.25, 0.05, 49),
  ROW('Max Homa', 0.4, 0.6, 0.35, 0.2, 47),
  ROW('Sahith Theegala', 0.45, 0.5, 0.45, 0.15, 44),
  ROW('Sungjae Im', 0.3, 0.65, 0.35, 0.25, 56),
];

const SEED_INDEX = new Map(SEED_PLAYERS.map((p) => [p.id, p]));

/** Look up a seed prior by id or name. Returns null if unknown. */
export function getSeed(idOrName: string): SeedPlayer | null {
  return SEED_INDEX.get(idOrName) ?? SEED_INDEX.get(playerId(idOrName)) ?? null;
}

/**
 * Prior for a player we have no record of: field-average skill (all SG ~0)
 * with a deliberately thin `rounds` count so the skill model regresses it hard
 * toward the field and widens its sigma. The model is never blind, never
 * overconfident on nothing.
 */
export function unknownPrior(name: string): SeedPlayer {
  return {
    id: playerId(name),
    name,
    sg: { ott: 0, app: 0, arg: 0, putt: 0, rounds: 0 },
  };
}
