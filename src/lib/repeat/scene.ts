/**
 * The scene a panel generator returns: grounds, strokes and circles in
 * trim-box inches. Nothing here knows about SVG or PDF — renderers read
 * the scene in one of two modes:
 *
 *   underlay — single-ink line art for print-and-transfer. Fills are
 *              dropped; guides print pale so you know not to trace them.
 *   study    — the colour study: grounds, fills and paint colours.
 */

import type { Pt } from './geom';
import { textStrokes } from './font';
import type { Paint, Weight } from './tokens';

export type PanelId = 'I' | 'II' | 'III' | 'IV';
export type Mode = 'underlay' | 'study';

export interface Style {
  paint: Paint;
  weight: Weight;
  /** Study-mode fill, optionally mixed toward bone white (tone 0..1). */
  fill?: Paint;
  fillTone?: number;
  /** Dash pattern in inches. */
  dash?: number[];
  /** Non-trace annotation: pale in the underlay, hidden in the study. */
  guide?: boolean;
  /** Draw in one mode only. */
  only?: Mode;
}

export type Shape =
  | { kind: 'path'; pts: Pt[]; closed: boolean; style: Style }
  | { kind: 'circle'; c: Pt; r: number; style: Style };

export interface Ground {
  /** x, y, w, h in trim inches — extend past the trim to cover the bleed. */
  rect: [number, number, number, number];
  paint: Paint;
}

export interface Scene {
  id: PanelId;
  grounds: Ground[];
  shapes: Shape[];
}

/** Tiny accumulator the panel generators draw into. */
export class Sketch {
  readonly shapes: Shape[] = [];
  readonly grounds: Ground[] = [];

  ground(rect: Ground['rect'], paint: Paint): void {
    this.grounds.push({ rect, paint });
  }

  path(pts: Pt[], style: Style, closed = false): void {
    if (pts.length > 1) this.shapes.push({ kind: 'path', pts, closed, style });
  }

  circle(c: Pt, r: number, style: Style): void {
    this.shapes.push({ kind: 'circle', c, r, style });
  }

  text(
    str: string,
    at: Pt,
    size: number,
    style: Style,
    opts?: { anchor?: 'start' | 'middle' | 'end'; rot?: number },
  ): void {
    for (const pts of textStrokes(str, at, size, opts)) this.path(pts, style);
  }

  strokes(list: Pt[][], style: Style): void {
    for (const pts of list) this.path(pts, style);
  }

  scene(id: PanelId): Scene {
    return { id, grounds: this.grounds, shapes: this.shapes };
  }
}
