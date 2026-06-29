/**
 * Genesis palette — the single source of truth for the canvas.
 *
 * Sourced from the Transmission Codex (docs/DESIGN-SYSTEM.md), NOT bespoke
 * hex literals. Phase 2 of the GENESIS brief: zero stray hex in the canvas
 * component — every colour the animation draws comes from here.
 *
 * The §0 contract, encoded as colour rather than caption:
 *   GOLD   = form / geometry   → Codex `--accent-amber`  (#d4a030)
 *   SIGNAL = life / process    → Codex `--accent-signal` (#46e0c8)  ← new
 *            sanctioned token (the Codex had no "life" counter-token to gold;
 *            this names the bespoke cyan instead of inventing a hue).
 *   VOID   = ground            → Codex `--bg-void`       (#0e0c0a)
 *   FUSED  = the white-hot origin point where both voices are one.
 *
 * The two voices begin FUSED, DIFFERENTIATE as complexity unfolds, REUNITE on
 * the Platonic solids, then collapse back to the origin. `voice()` below is
 * the literal mechanism: a voice's rendered colour is the fused white-hot
 * lerped toward its own hue by the separation scalar. separation 0 → both
 * read as one white-hot point; separation 1 → gold and cyan fully distinct.
 */

export type RGB = [number, number, number];

export const PALETTE = {
  void: [14, 12, 10] as RGB, //      --bg-void       #0e0c0a  (warm dark, never pure black)
  gold: [212, 160, 48] as RGB, //    --accent-amber  #d4a030  — the FORM voice
  signal: [70, 224, 200] as RGB, //  --accent-signal #46e0c8  — the LIFE voice (new token)
  goldHi: [255, 235, 200] as RGB, // gold highlight  (amber → glow)
  signalHi: [206, 255, 247] as RGB, // signal highlight
  fused: [255, 250, 235] as RGB, //  white-hot origin (warm-biased --text-glow)
  chalk: [232, 228, 220] as RGB, //  --text-chalk    #e8e4dc  — faint corner type
} as const;

/** CSS rgba() string from an RGB tuple. */
export const rgba = (c: RGB, a = 1): string =>
  `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${a})`;

/** Linear interpolation between two colours. */
export const lerpRGB = (a: RGB, b: RGB, t: number): RGB => [
  Math.round(a[0] + (b[0] - a[0]) * t),
  Math.round(a[1] + (b[1] - a[1]) * t),
  Math.round(a[2] + (b[2] - a[2]) * t),
];

/**
 * A voice's rendered colour. `separation` 0 = fused white-hot (the poles of
 * the piece), 1 = the voice's own hue (mid-piece, maximally differentiated).
 * This is the guard on the §0 contract: at separation 0 gold and cyan are the
 * SAME colour; they only diverge as the form unfolds.
 */
export const voice = (own: RGB, separation: number): RGB =>
  lerpRGB(PALETTE.fused, own, separation);
