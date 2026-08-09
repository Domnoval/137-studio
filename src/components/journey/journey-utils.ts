// src/components/journey/journey-utils.ts
// OWNED BY SCAFFOLD — shared constants + helpers for every journey section.
// Section builders IMPORT from here; do not fork these values.
// Phase ranges are law (VISION.md percentages).

import type Lenis from 'lenis';

declare global {
  interface Window {
    /** Lenis instance, set by page.tsx. The screenshot harness depends on it. */
    lenis?: Lenis;
  }
}

export type PhaseName = 'arrival' | 'dive' | 'cosmos' | 'contraction' | 'return';

export interface PhaseRange {
  start: number;
  end: number;
}

export const PHASES: Record<PhaseName, PhaseRange> = {
  arrival: { start: 0.0, end: 0.08 },
  dive: { start: 0.08, end: 0.18 },
  cosmos: { start: 0.18, end: 0.62 },
  contraction: { start: 0.62, end: 0.78 },
  return: { start: 0.78, end: 1.0 },
};

export const PHASE_ORDER: PhaseName[] = ['arrival', 'dive', 'cosmos', 'contraction', 'return'];

/* ---------------------------------------------------------------- CHAPTERS */
/**
 * THE CHAPTER TABLE — the ONE place the journey's chapters are named, numbered
 * and given an onset. Anything that PRINTS a chapter (the HUD rail, a section's
 * own title plate) resolves it through `chapterFor()` below. Nothing derives a
 * chapter name from a threshold of its own.
 *
 * This exists because the site had two readers disagreeing in one frame: the
 * right-hand rail printed "02 / THE DIVE" off `PHASES` while the mobile cosmos
 * band's title plate printed "03 / THE COSMOS" off its own fade-in constant.
 * A HUD whose whole conceit is that it is an instrument cannot contradict the
 * page it is measuring, so the onset is now a property of the CHAPTER, not of
 * whichever component happens to be drawing it.
 */
export const CHAPTER_INDEX: Record<PhaseName, string> = {
  arrival: '01',
  dive: '02',
  cosmos: '03',
  contraction: '04',
  return: '05',
};

export const CHAPTER_TITLE: Record<PhaseName, string> = {
  arrival: 'ARRIVAL',
  dive: 'THE DIVE',
  cosmos: 'THE COSMOS',
  contraction: 'CONTRACTION',
  return: 'RETURN',
};

/**
 * THE PHONE HAS NO DIVE, SO ITS COSMOS STARTS EARLIER.
 *
 * On desktop the DIVE is a real 3D fall that owns 8%–18% of the track. On a
 * phone there is no WebGL dive at all: CosmosFallback's band — chapter plate
 * first — takes the frame from this depth, which is why the plate was on screen
 * while the rail still said DIVE. The chapter a reader is IN is the chapter
 * whose content owns the frame, so on mobile THE COSMOS begins here.
 *
 * CONTRACT: this is the onset the mobile cosmos band's own reveal must key to.
 * If that band's fade-in moves, this constant moves with it — they are one
 * decision, stated once.
 */
export const MOBILE_COSMOS_ONSET = 0.138;

/**
 * The chapter to PRINT at this depth. `mobile` shifts THE COSMOS's onset back
 * to the point its band actually takes the frame (see MOBILE_COSMOS_ONSET).
 * Returns a plain PhaseName so callers can index CHAPTER_INDEX / CHAPTER_TITLE
 * without allocating — this runs every animation frame.
 */
export function chapterFor(globalProgress: number, mobile = false): PhaseName {
  const p = clamp01(globalProgress);
  if (mobile && p >= MOBILE_COSMOS_ONSET && p < PHASES.cosmos.end) return 'cosmos';
  return phaseFor(p);
}

/** Total scroll length of the journey (desktop). page.tsx sizes .journey-root with this. */
export const JOURNEY_HEIGHT_VH = 700;

/** Golden angle (137.508 deg) in radians — helix + spiral geometry. */
export const GOLDEN_ANGLE = 137.508 * (Math.PI / 180);

export const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** Map global journey progress (0-1) to 0-1 within a phase (clamped). */
export function phaseProgress(globalProgress: number, phase: PhaseName): number {
  const { start, end } = PHASES[phase];
  return clamp01((globalProgress - start) / (end - start));
}

/** Which phase a global progress value falls in. */
export function phaseFor(globalProgress: number): PhaseName {
  const p = clamp01(globalProgress);
  for (const name of PHASE_ORDER) {
    if (p < PHASES[name].end) return name;
  }
  return 'return';
}

/** Artwork file ('/art/foo.jpg' | '/art/foo.png') -> 1200px texture ('/art/tex/foo.jpg'). */
export function texPath(file: string): string {
  return file.replace('/art/', '/art/tex/').replace(/\.(png|jpe?g|webp)$/i, '.jpg');
}

/** SSR-safe WebGL capability check. Always false on the server. */
export function detectWebGL(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

/** SSR-safe mobile check (<768px). Always false on the server. */
export function detectMobile(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(max-width: 767px)').matches;
}

/** SSR-safe prefers-reduced-motion check. Always false on the server. */
export function detectReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
