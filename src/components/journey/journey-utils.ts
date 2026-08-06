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
