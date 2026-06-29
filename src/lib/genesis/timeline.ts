/**
 * Genesis timeline — the 54-second score the draw loop reads from.
 *
 * Two things live here: the stage sequence (SEQ) and the separation curve
 * (sepAt). The separation curve is the spine of the §0 contract — it is the
 * single scalar that makes the two voices fuse, differentiate, reunite and
 * collapse. Drawing code never decides colour fusion on its own; it asks here.
 */

export const T_END = 54.0; // full pass length, seconds (source constant)
export const FOCAL = 5.6; // perspective focal length (source constant)

export type Stage = {
  key: string;
  name: string; // display name (Cormorant)
  glyph: string; // technical sub-label (mono)
  start: number;
  end: number;
};

/**
 * The 8 stages of the embryology, each building on the last:
 * point → vesica → seed → flower → fruit → cube → solids → return.
 */
export const SEQ: Stage[] = [
  { key: 'point', name: 'The Point', glyph: '·', start: 0, end: 4 },
  { key: 'vesica', name: 'Vesica Piscis', glyph: '◯◯', start: 4, end: 11 },
  { key: 'seed', name: 'Seed of Life', glyph: '✶', start: 11, end: 19 },
  { key: 'flower', name: 'Flower of Life', glyph: '❋', start: 19, end: 27 },
  { key: 'fruit', name: 'Fruit of Life', glyph: '⬡', start: 27, end: 34 },
  { key: 'cube', name: "Metatron's Cube", glyph: '✶', start: 34, end: 42 },
  { key: 'solids', name: 'Platonic Solids', glyph: '△□◇', start: 42, end: 50 },
  { key: 'collapse', name: 'Return', glyph: '·', start: 50, end: T_END },
];

export const clamp01 = (t: number): number => (t < 0 ? 0 : t > 1 ? 1 : t);
export const easeInOut = (t: number): number =>
  t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
export const easeOut = (t: number): number => 1 - (1 - t) ** 3;

/** The stage active at clock `t`, plus eased local progress 0→1 within it. */
export function stageAt(t: number): { stage: Stage; index: number; p: number } {
  for (let i = 0; i < SEQ.length; i++) {
    const s = SEQ[i];
    if (t < s.end || i === SEQ.length - 1) {
      const p = clamp01((t - s.start) / (s.end - s.start));
      return { stage: s, index: i, p };
    }
  }
  const last = SEQ[SEQ.length - 1];
  return { stage: last, index: SEQ.length - 1, p: 1 };
}

/**
 * Separation: 0 = the two voices are FUSED (a single white-hot point),
 * 1 = fully DIFFERENTIATED (gold and cyan maximally distinct).
 *
 * This is the contract as a curve. Read it top to bottom:
 *   t=0    fused — the origin point
 *   →27s   climbing as the form unfolds (vesica → seed → flower → fruit)
 *   34s    fully differentiated through the Cube
 *   →47s   FALLING as the solids resolve toward the icosahedron — the
 *          radiolarian, where form and life REUNITE
 *   54s    fused again — collapse back to the one point
 */
const SEP_KEYS: [number, number][] = [
  [0, 0],
  [4, 0.02],
  [11, 0.55],
  [19, 0.9],
  [27, 1],
  [34, 1],
  [42, 0.82],
  [47, 0.22],
  [50, 0.1],
  [54, 0],
];

export function sepAt(t: number): number {
  if (t <= SEP_KEYS[0][0]) return SEP_KEYS[0][1];
  if (t >= SEP_KEYS[SEP_KEYS.length - 1][0])
    return SEP_KEYS[SEP_KEYS.length - 1][1];
  for (let i = 0; i < SEP_KEYS.length - 1; i++) {
    const [t0, v0] = SEP_KEYS[i];
    const [t1, v1] = SEP_KEYS[i + 1];
    if (t >= t0 && t <= t1) {
      const local = (t - t0) / (t1 - t0);
      return v0 + (v1 - v0) * easeInOut(local);
    }
  }
  return 0;
}

/**
 * Origin-point intensity: bright at the very start and at the collapse (the
 * two poles where everything is the one white-hot point), dim in between so
 * the unfolding form reads. Used to keep the "one" present throughout.
 */
export function originGlow(t: number): number {
  const open = 1 - clamp01(t / 3.5); // fades out over first 3.5s
  const close = clamp01((t - 50) / 4); // returns over the final 4s
  return Math.max(open, close);
}
