/**
 * A single-stroke type for the underlays.
 *
 * Every letter is a few pen strokes on a 4 × 6 grid (cap height 6, y down,
 * baseline at 6, descenders to 8). No font files, no outlines: the same
 * polylines render in SVG and PDF, trace cleanly with a technical pen, and
 * speak the same line-weight language as the geometry around them.
 */

import type { Pt } from './geom';

const CAP = 6;
const ADVANCE = 5.4;

// Each glyph is a list of strokes; each stroke is flat [x0, y0, x1, y1, ...].
const O = [1, 0, 3, 0, 4, 1, 4, 5, 3, 6, 1, 6, 0, 5, 0, 1, 1, 0];
const P = [0, 6, 0, 0, 3, 0, 4, 1, 4, 2, 3, 3, 0, 3];

const GLYPHS: Record<string, number[][]> = {
  A: [[0, 6, 2, 0, 4, 6], [0.7, 4, 3.3, 4]],
  B: [[0, 6, 0, 0, 3, 0, 4, 0.8, 4, 2.2, 3, 3, 0, 3], [3, 3, 4, 3.8, 4, 5.2, 3, 6, 0, 6]],
  C: [[4, 1, 3, 0, 1, 0, 0, 1, 0, 5, 1, 6, 3, 6, 4, 5]],
  D: [[0, 0, 0, 6, 2.5, 6, 4, 4.5, 4, 1.5, 2.5, 0, 0, 0]],
  E: [[4, 0, 0, 0, 0, 6, 4, 6], [0, 3, 3, 3]],
  F: [[4, 0, 0, 0, 0, 6], [0, 3, 3, 3]],
  G: [[4, 1, 3, 0, 1, 0, 0, 1, 0, 5, 1, 6, 3, 6, 4, 5, 4, 3.5, 2.2, 3.5]],
  H: [[0, 0, 0, 6], [4, 0, 4, 6], [0, 3, 4, 3]],
  I: [[1, 0, 3, 0], [2, 0, 2, 6], [1, 6, 3, 6]],
  J: [[4, 0, 4, 5, 3, 6, 1, 6, 0, 5]],
  K: [[0, 0, 0, 6], [4, 0, 0, 3.5], [1.3, 2.6, 4, 6]],
  L: [[0, 0, 0, 6, 4, 6]],
  M: [[0, 6, 0, 0, 2, 3.5, 4, 0, 4, 6]],
  N: [[0, 6, 0, 0, 4, 6, 4, 0]],
  O: [O],
  P: [P],
  Q: [O, [2.5, 4.5, 4, 6.2]],
  R: [P, [2, 3, 4, 6]],
  S: [[4, 1, 3, 0, 1, 0, 0, 1, 0, 2, 1, 3, 3, 3, 4, 4, 4, 5, 3, 6, 1, 6, 0, 5]],
  T: [[0, 0, 4, 0], [2, 0, 2, 6]],
  U: [[0, 0, 0, 5, 1, 6, 3, 6, 4, 5, 4, 0]],
  V: [[0, 0, 2, 6, 4, 0]],
  W: [[0, 0, 1, 6, 2, 2.5, 3, 6, 4, 0]],
  X: [[0, 0, 4, 6], [4, 0, 0, 6]],
  Y: [[0, 0, 2, 3, 4, 0], [2, 3, 2, 6]],
  Z: [[0, 0, 4, 0, 0, 6, 4, 6]],
  '0': [O, [3.6, 0.8, 0.4, 5.2]],
  '1': [[1, 1, 2, 0, 2, 6], [1, 6, 3, 6]],
  '2': [[0, 1, 1, 0, 3, 0, 4, 1, 4, 2.2, 0, 6, 4, 6]],
  '3': [[0, 1, 1, 0, 3, 0, 4, 1, 4, 2, 3, 3, 1.5, 3], [3, 3, 4, 4, 4, 5, 3, 6, 1, 6, 0, 5]],
  '4': [[3, 6, 3, 0, 0, 4.2, 4, 4.2]],
  '5': [[4, 0, 0.3, 0, 0, 2.8, 3, 2.8, 4, 3.8, 4, 5, 3, 6, 1, 6, 0, 5]],
  '6': [[3.5, 0, 1.5, 0, 0, 1.5, 0, 5, 1, 6, 3, 6, 4, 5, 4, 3.8, 3, 2.8, 1, 2.8, 0, 3.8]],
  '7': [[0, 0, 4, 0, 1.5, 6]],
  '8': [
    [1, 0, 3, 0, 4, 1, 4, 2, 3, 3, 1, 3, 0, 4, 0, 5, 1, 6, 3, 6, 4, 5, 4, 4, 3, 3],
    [1, 3, 0, 2, 0, 1, 1, 0],
  ],
  '9': [[4, 2.2, 3, 3.2, 1, 3.2, 0, 2.2, 0, 1, 1, 0, 3, 0, 4, 1, 4, 4.5, 2.5, 6, 0.5, 6]],
  p: [[0, 2, 0, 8], [0, 2.8, 1, 2, 3, 2, 4, 3, 4, 5, 3, 6, 1, 6, 0, 5.2]],
  q: [[4, 2, 4, 8], [4, 2.8, 3, 2, 1, 2, 0, 3, 0, 5, 1, 6, 3, 6, 4, 5.2]],
  '.': [[0.3, 5.7, 0.7, 5.7, 0.7, 6, 0.3, 6, 0.3, 5.7]],
  ',': [[0.7, 5.6, 0.7, 6.2, 0.1, 7]],
  ':': [[0.3, 1.7, 0.7, 1.7, 0.7, 2, 0.3, 2, 0.3, 1.7], [0.3, 5.7, 0.7, 5.7, 0.7, 6, 0.3, 6, 0.3, 5.7]],
  '-': [[0.8, 3.5, 3.2, 3.5]],
  '/': [[0, 6, 4, 0]],
  "'": [[0.7, 0, 0.3, 1.6]],
  '·': [[0.2, 3.1, 0.6, 3.1, 0.6, 3.4, 0.2, 3.4, 0.2, 3.1]],
  '×': [[0.8, 1.8, 3.2, 5.2], [3.2, 1.8, 0.8, 5.2]],
  ' ': [],
};

/** Punctuation sits on a narrow advance so "14q32.12" doesn't gap. */
const NARROW: Record<string, number> = { '.': 2.1, ',': 2.1, ':': 2.1, "'": 2.1, '·': 3.2, ' ': 3.2 };

function advance(ch: string): number {
  return NARROW[ch] ?? ADVANCE;
}

function glyph(ch: string): number[][] {
  return GLYPHS[ch] ?? GLYPHS[ch.toUpperCase()] ?? [];
}

/** Width of a string in inches at a given cap height. */
export function textWidth(str: string, size: number): number {
  const s = size / CAP;
  let w = 0;
  for (const ch of str) w += advance(ch) * s;
  return Math.max(0, w - 1.4 * s);
}

/**
 * Lay a string along a baseline. `size` is cap height in inches; `rot`
 * turns the whole line (radians) around its anchor point.
 */
export function textStrokes(
  str: string,
  at: Pt,
  size: number,
  opts: { anchor?: 'start' | 'middle' | 'end'; rot?: number } = {},
): Pt[][] {
  const s = size / CAP;
  const w = textWidth(str, size);
  const shift = opts.anchor === 'middle' ? -w / 2 : opts.anchor === 'end' ? -w : 0;
  const cos = Math.cos(opts.rot ?? 0);
  const sin = Math.sin(opts.rot ?? 0);
  const out: Pt[][] = [];
  let pen = shift;
  for (const ch of str) {
    for (const stroke of glyph(ch)) {
      const pts: Pt[] = [];
      for (let i = 0; i < stroke.length; i += 2) {
        const lx = pen + stroke[i] * s;
        const ly = (stroke[i + 1] - CAP) * s;
        pts.push([at[0] + lx * cos - ly * sin, at[1] + lx * sin + ly * cos]);
      }
      out.push(pts);
    }
    pen += advance(ch) * s;
  }
  return out;
}

/**
 * Glyphs set evenly around a full circle, reading clockwise with their
 * tops pointing outward — a mantra ring. The baseline sits on radius r.
 */
export function ringStrokes(str: string, c: Pt, r: number, size: number, start = -Math.PI / 2): Pt[][] {
  const chars = [...str];
  const step = (Math.PI * 2) / chars.length;
  const out: Pt[][] = [];
  chars.forEach((ch, i) => {
    const a = start + i * step;
    const base: Pt = [c[0] + r * Math.cos(a), c[1] + r * Math.sin(a)];
    out.push(...textStrokes(ch, base, size, { anchor: 'middle', rot: a + Math.PI / 2 }));
  });
  return out;
}
