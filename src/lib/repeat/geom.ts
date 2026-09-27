/**
 * Small 2D helpers shared by the four panel generators.
 * Pure functions, inches, y down.
 */

export type Pt = readonly [number, number];

export const TAU = Math.PI * 2;
export const DEG = Math.PI / 180;

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

export const clamp = (v: number, lo = 0, hi = 1): number =>
  Math.min(hi, Math.max(lo, v));

/** Hermite smoothstep between edges e0 and e1. */
export function smoothstep(e0: number, e1: number, x: number): number {
  const t = clamp((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
}

export const polar = (c: Pt, r: number, a: number): Pt => [
  c[0] + r * Math.cos(a),
  c[1] + r * Math.sin(a),
];

export const dist = (a: Pt, b: Pt): number => Math.hypot(b[0] - a[0], b[1] - a[1]);

export const mix = (a: Pt, b: Pt, t: number): Pt => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];

/** Points along a circular arc from a0 to a1 (radians), inclusive. */
export function arc(c: Pt, r: number, a0: number, a1: number, steps = 32): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i <= steps; i++) pts.push(polar(c, r, lerp(a0, a1, i / steps)));
  return pts;
}

/** Closed ellipse around c, major axis along angle `rot`. */
export function ellipse(c: Pt, rx: number, ry: number, rot: number, steps = 20): Pt[] {
  const cos = Math.cos(rot);
  const sin = Math.sin(rot);
  const pts: Pt[] = [];
  for (let i = 0; i < steps; i++) {
    const t = (i / steps) * TAU;
    const x = rx * Math.cos(t);
    const y = ry * Math.sin(t);
    pts.push([c[0] + x * cos - y * sin, c[1] + x * sin + y * cos]);
  }
  return pts;
}

/**
 * An aggregate knot: a seeded Lissajous tangle that loops back on itself.
 * Used wherever protein clumps — the misfold's debris, the tide's damage.
 */
export function knot(rng: () => number, c: Pt, r: number): Pt[] {
  const turns = 3 + Math.floor(rng() * 3);
  const a = 2 + rng() * 2.2;
  const b = 1.3 + rng() * 1.8;
  const p1 = rng() * TAU;
  const p2 = rng() * TAU;
  const steps = 26 * turns;
  const pts: Pt[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * TAU * turns;
    const wob = 0.85 + 0.15 * Math.sin(t * 0.37 + p1);
    pts.push([
      c[0] + r * wob * (0.62 * Math.cos(t) + 0.38 * Math.cos(a * t + p1)),
      c[1] + r * wob * (0.62 * Math.sin(t * 1.07) + 0.38 * Math.sin(b * t + p2)),
    ]);
  }
  return pts;
}
