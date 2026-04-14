/**
 * Deterministic, seeded layout for the temple wall.
 *
 * Two pieces:
 *   1. A small string-hash + mulberry32 RNG so layouts are reproducible
 *      from a string seed (a date, a fingerprint, whatever we hand it).
 *   2. A Vogel-style golden-angle spiral packing function — the same
 *      math the home page hero already uses for letter scatter, lifted
 *      into lib/ so /137 and / can share it.
 *
 * Zero dependencies, zero side effects. Pure functions only.
 */

/** The fine structure constant's neighbor: 137.50776° in radians. */
export const GOLDEN_ANGLE_RAD = 137.50776 * (Math.PI / 180);

/** FNV-1a-ish 32-bit string hash. Fast, non-cryptographic, stable. */
export function strHash(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * mulberry32 — tiny seedable PRNG, MIT-licensed canonical implementation.
 * Returns a function() that yields uniform [0,1) doubles.
 */
export function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface SpiralNode {
  /** Index in the spiral (0..n-1). */
  i: number;
  /** Cartesian x in arbitrary units, centered on origin. */
  x: number;
  /** Cartesian y in arbitrary units, centered on origin. */
  y: number;
  /** Distance from origin, in the same arbitrary units. */
  r: number;
  /** Angle from positive x axis, radians. */
  theta: number;
  /** Per-node jitter rotation in degrees, deterministic from the seed. */
  rotateDeg: number;
}

/**
 * Vogel spiral: r = scale·√i, θ = i · GOLDEN_ANGLE.
 * Adds a small per-node rotation jitter from the seeded RNG so the chalk
 * doesn't look mechanical.
 *
 * @param count     how many nodes to generate
 * @param seed      string seed for the RNG (e.g. today's date)
 * @param scale     vmin units per √i unit (controls how spread out the wall is)
 * @param maxRotate max ±degrees of jitter per node
 */
export function spiralLayout(
  count: number,
  seed: string,
  scale = 4,
  maxRotate = 12,
): SpiralNode[] {
  const rng = mulberry32(strHash(seed));
  const out: SpiralNode[] = [];
  for (let i = 0; i < count; i++) {
    const theta = i * GOLDEN_ANGLE_RAD;
    const r = scale * Math.sqrt(i);
    const x = r * Math.cos(theta);
    const y = r * Math.sin(theta);
    const rotateDeg = (rng() - 0.5) * 2 * maxRotate;
    out.push({ i, x, y, r, theta, rotateDeg });
  }
  return out;
}

/**
 * Today's date string, in UTC, formatted yyyy-mm-dd.
 * Used as the default seed so the wall changes daily but is identical
 * for everyone visiting on the same day. The "Constant" oracle behavior.
 */
export function todaySeed(): string {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
