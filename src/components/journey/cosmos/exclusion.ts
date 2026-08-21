// cosmos/exclusion.ts — OWNED BY COSMOS agent.
//
// TYPE EXCLUSION ZONES.
//
// The caption block and the app chip are DOM type sitting in front of the
// WebGL canvas. Anything drawn INSIDE the canvas that lands behind them —
// a drifting equation glyph, for instance — collides with the letterforms and
// turns "TEAL SKULL" into "TEALηSKULL". A z-index cannot fix that: the glyph is
// in another rendering context entirely.
//
// So every frame the label system publishes the screen-space boxes its type
// occupies (already inflated by a margin), and the glyph field culls anything
// whose projected position lands inside one. Boxes are plain numbers in canvas
// CSS pixels, written and read inside useFrame — no allocation, no React.

export interface ExclusionBox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

const MAX_BOXES = 10;

const boxes: ExclusionBox[] = Array.from({ length: MAX_BOXES }, () => ({
  x0: 0,
  y0: 0,
  x1: 0,
  y1: 0,
}));

let count = 0;

/** Margin baked into every published box (px). */
export const EXCLUSION_MARGIN = 24;

/** Clear the table. Called once per frame by the label driver. */
export function resetExclusion(): void {
  count = 0;
}

/** Publish a type box. `m` is added on every side (defaults to the standard margin). */
export function pushExclusion(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  m: number = EXCLUSION_MARGIN,
): void {
  if (count >= MAX_BOXES) return;
  const b = boxes[count++];
  b.x0 = x0 - m;
  b.y0 = y0 - m;
  b.x1 = x1 + m;
  b.y1 = y1 + m;
}

/** True when a point of radius `r` intersects any published type box. */
export function inExclusion(x: number, y: number, r: number): boolean {
  for (let i = 0; i < count; i++) {
    const b = boxes[i];
    if (x + r > b.x0 && x - r < b.x1 && y + r > b.y0 && y - r < b.y1) return true;
  }
  return false;
}
