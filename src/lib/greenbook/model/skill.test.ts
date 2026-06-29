import { describe, it, expect } from 'vitest';
import { estimateSkill, DEFAULT_SKILL_CONFIG } from './skill';
import {
  applyAdjustments,
  courseFitDelta,
  COURSE_ARCHETYPES,
} from './adjust';
import type { SGProfile } from '../types';

const elite: SGProfile = { ott: 0.85, app: 1.25, arg: 0.35, putt: 0.05, rounds: 60 };

describe('estimateSkill', () => {
  it('a strong ball-striker gets a negative m (beats the field)', () => {
    const p = estimateSkill('x', 'X', elite);
    expect(p.m).toBeLessThan(0);
    expect(p.sigma).toBeGreaterThan(0);
  });

  it('discounts putting relative to ball-striking', () => {
    // Two players, same total SG, but one earns it via APP, the other via PUTT.
    const striker: SGProfile = { ott: 0, app: 1.0, arg: 0, putt: 0, rounds: 60 };
    const putter: SGProfile = { ott: 0, app: 0, arg: 0, putt: 1.0, rounds: 60 };
    const ps = estimateSkill('s', 'S', striker);
    const pp = estimateSkill('p', 'P', putter);
    // Striker projects to a better (lower) m because putting is discounted.
    expect(ps.m).toBeLessThan(pp.m);
  });

  it('regresses thin samples toward the field and widens sigma', () => {
    const thin: SGProfile = { ...elite, rounds: 3 };
    const deep = estimateSkill('d', 'D', elite);
    const shallow = estimateSkill('t', 'T', thin);
    // Thin sample pulled toward field → m closer to 0.
    expect(Math.abs(shallow.m)).toBeLessThan(Math.abs(deep.m));
    // ...and less certain → wider sigma.
    expect(shallow.sigma).toBeGreaterThan(deep.sigma);
  });

  it('an unknown player sits at field average with max uncertainty', () => {
    const p = estimateSkill('u', 'U', { ott: 0, app: 0, arg: 0, putt: 0, rounds: 0 });
    expect(p.m).toBeCloseTo(0, 9);
    expect(p.sigma).toBeCloseTo(
      DEFAULT_SKILL_CONFIG.baseSigma + DEFAULT_SKILL_CONFIG.sigmaThinBump,
      9,
    );
    expect(p.trace?.notes?.[0]).toMatch(/no record/i);
  });
});

describe('course fit', () => {
  it('a bomber fits a bomber course (improves m)', () => {
    const bomber: SGProfile = { ott: 1.2, app: 0.1, arg: 0.0, putt: 0, rounds: 50 };
    const delta = courseFitDelta(bomber, COURSE_ARCHETYPES.bombersParadise, 0.4);
    expect(delta).toBeLessThan(0); // negative m delta = plays better here
  });

  it('a bomber is penalized on a positional course', () => {
    const bomber: SGProfile = { ott: 1.2, app: 0.1, arg: 0.0, putt: 0, rounds: 50 };
    const delta = courseFitDelta(bomber, COURSE_ARCHETYPES.positional, 0.4);
    expect(delta).toBeGreaterThan(0);
  });

  it('neutral emphasis is a no-op', () => {
    expect(courseFitDelta(elite, COURSE_ARCHETYPES.neutral, 0.4)).toBe(0);
  });
});

describe('applyAdjustments', () => {
  it('records every adjustment on the trace and sums them into m', () => {
    const base = estimateSkill('x', 'X', elite);
    const adjusted = applyAdjustments(
      base,
      {
        recentFormSG: 0.6, // hot recent form
        course: COURSE_ARCHETYPES.secondShot,
        fieldStrengthStrokes: 0.4, // strong field
      },
      undefined,
      elite,
    );
    expect(adjusted.trace?.adjustments.length).toBe(3);
    expect(adjusted.trace?.base).toBeCloseTo(base.m, 9);

    const sumDeltas = adjusted.trace!.adjustments.reduce((s, a) => s + a.deltaM, 0);
    expect(adjusted.m).toBeCloseTo(base.m + sumDeltas, 9);
  });

  it('good recent form lowers m, strong field raises it', () => {
    const base = estimateSkill('x', 'X', elite);
    const form = applyAdjustments(base, { recentFormSG: 0.8 });
    const field = applyAdjustments(base, { fieldStrengthStrokes: 0.8 });
    expect(form.m).toBeLessThan(base.m);
    expect(field.m).toBeGreaterThan(base.m);
  });
});
