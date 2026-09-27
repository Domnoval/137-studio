/**
 * Knobs for the four panel generators, plus the CAG repeat ranges they
 * all agree on. One flat bag of parameters per panel; each generator
 * reads only what it needs.
 */

export interface PanelParams {
  /** Any string. Same seed → same drawing, forever. */
  seed: string;
  /** I — band labels, locus callout and chromosome number. */
  labels: boolean;
  /** II — how hard the ticks stutter past the normal range (0..1). */
  instability: number;
  /** III — spheres in the poly-Q tail. */
  tail: number;
  /** III — how violently the collapsed solid's edges crumple (0..1). */
  crumple: number;
  /** III — AlphaFold-style uncertainty along the tail (0..1). */
  uncertainty: number;
  /** IV — how far up the tree the damage has risen (0..1 of height). */
  tide: number;
  /** IV — extra damage at the white-matter core, where the dentate sits (0..1). */
  core: number;
}

/**
 * CAG repeat ranges for ATXN3 — GeneReviews, "Spinocerebellar Ataxia
 * Type 3" (Paulson & Shakkottai, NBK1196). Normal 12–44; intermediate
 * 45–59; full penetrance ~60–87. Nobody carries fewer than 12.
 */
export const CAG = {
  minObserved: 12,
  normalMax: 44,
  intermediateMax: 59,
  fullMin: 60,
  max: 87,
} as const;

export type RepeatClass = 'below' | 'normal' | 'intermediate' | 'full' | 'beyond';

export function repeatClass(n: number): RepeatClass {
  if (n < CAG.minObserved) return 'below';
  if (n <= CAG.normalMax) return 'normal';
  if (n <= CAG.intermediateMax) return 'intermediate';
  if (n <= CAG.max) return 'full';
  return 'beyond';
}

export const REPEAT_CLASS_LABEL: Record<RepeatClass, string> = {
  below: 'fewer than any human carries',
  normal: 'normal range (12–44)',
  intermediate: 'intermediate (45–59)',
  full: 'full-penetrance range (60–87)',
  beyond: 'past the commonly cited maximum (87)',
};
