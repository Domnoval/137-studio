/**
 * Mean adjustments — the texture where edge hides.
 *
 * `m` is not just raw season SG; it's a stack of adjustments, several of which
 * sloppy books underweight. Each adjustment here is a pure function returning a
 * labeled stroke delta on `m` (negative = improves the player), and they're
 * composed by `applyAdjustments`, which records every step on the trace so the
 * dashboard can unfold the number to its derivation.
 *
 * MVP ships recency + course-fit + field-strength. Wave/tee-time and weather
 * are high-ROI Phase-2 adds that slot in as more entries in the same list.
 */

import type { Player, SGProfile } from '../types';

/** A course's reward profile: which T2G skills it pays out, relative. */
export interface CourseArchetype {
  name: string;
  /** Relative emphasis per T2G component. Sign matters; scale is normalized. */
  emphasis: { ott: number; app: number; arg: number };
}

/** A few canonical archetypes to fit against. */
export const COURSE_ARCHETYPES: Record<string, CourseArchetype> = {
  bombersParadise: { name: "Bomber's paradise", emphasis: { ott: 1, app: 0, arg: -0.5 } },
  secondShot: { name: 'Second-shot test', emphasis: { ott: -0.3, app: 1, arg: 0.2 } },
  positional: { name: 'Positional / tight', emphasis: { ott: -0.6, app: 0.6, arg: 0.4 } },
  neutral: { name: 'Neutral', emphasis: { ott: 0, app: 0, arg: 0 } },
};

export interface MatchContext {
  /** Player's recent-form SG total minus their baseline projection (strokes). */
  recentFormSG?: number;
  /** The course archetype this event is played on. */
  course?: CourseArchetype;
  /** How much stronger/weaker this week's field is vs. baseline, in strokes. */
  fieldStrengthStrokes?: number;
}

export interface AdjustConfig {
  /** Fraction of recent-form delta carried into the estimate. */
  recencyFraction: number;
  /** Strokes of swing a perfect/awful course fit is worth. */
  courseFitScale: number;
  /** Fraction of field-strength differential applied to m. */
  fieldStrengthFraction: number;
}

export const DEFAULT_ADJUST_CONFIG: AdjustConfig = {
  recencyFraction: 0.3,
  courseFitScale: 0.4,
  fieldStrengthFraction: 0.5,
};

/**
 * Course-fit delta. We compare the player's *relative* T2G shape (each
 * component minus their own T2G mean) to the course's emphasis. A bomber on a
 * bomber's course scores a strong positive dot → a negative `m` delta (they
 * play better here). Emphasis is normalized so scale lives entirely in config.
 */
export function courseFitDelta(
  sg: SGProfile,
  course: CourseArchetype,
  scale: number,
): number {
  const t2gMean = (sg.ott + sg.app + sg.arg) / 3;
  const shape = { ott: sg.ott - t2gMean, app: sg.app - t2gMean, arg: sg.arg - t2gMean };

  const e = course.emphasis;
  const norm = Math.hypot(e.ott, e.app, e.arg);
  if (norm === 0) return 0;

  const dot = (shape.ott * e.ott + shape.app * e.app + shape.arg * e.arg) / norm;
  // Strong fit (positive dot) lowers expected score → negative delta on m.
  return -scale * dot;
}

/**
 * Compose all contextual adjustments onto a base skill estimate. Returns a new
 * Player with adjusted `m` and a fully populated trace. `trace.base` is left as
 * the pre-adjustment m so the unfold view can show base → each step → final.
 */
export function applyAdjustments(
  player: Player,
  ctx: MatchContext,
  config: AdjustConfig = DEFAULT_ADJUST_CONFIG,
  sg?: SGProfile,
): Player {
  const adjustments: { label: string; deltaM: number }[] = [];

  // Recency: good recent form (negative SG delta? no — higher SG is better)
  // lowers m. recentFormSG is "extra SG vs baseline", so delta = −fraction·it.
  if (ctx.recentFormSG !== undefined && ctx.recentFormSG !== 0) {
    const deltaM = -config.recencyFraction * ctx.recentFormSG;
    adjustments.push({
      label: `Recent form (${signed(ctx.recentFormSG)} SG vs baseline)`,
      deltaM,
    });
  }

  // Course fit needs the SG shape; only applied when we have it.
  if (ctx.course && ctx.course.name !== 'Neutral' && sg) {
    const deltaM = courseFitDelta(sg, ctx.course, config.courseFitScale);
    if (deltaM !== 0) {
      adjustments.push({ label: `Course fit: ${ctx.course.name}`, deltaM });
    }
  }

  // Stronger field → smaller margin over it → higher (worse) m.
  if (ctx.fieldStrengthStrokes !== undefined && ctx.fieldStrengthStrokes !== 0) {
    const deltaM = config.fieldStrengthFraction * ctx.fieldStrengthStrokes;
    adjustments.push({
      label: `Field strength (${signed(ctx.fieldStrengthStrokes)} str vs avg)`,
      deltaM,
    });
  }

  const totalDelta = adjustments.reduce((s, a) => s + a.deltaM, 0);
  const base = player.trace?.base ?? player.m;

  return {
    ...player,
    m: player.m + totalDelta,
    trace: {
      base,
      adjustments: [...(player.trace?.adjustments ?? []), ...adjustments],
      sampleSize: player.trace?.sampleSize ?? 0,
      notes: player.trace?.notes,
    },
  };
}

function signed(n: number): string {
  return (n >= 0 ? '+' : '') + n.toFixed(2);
}
