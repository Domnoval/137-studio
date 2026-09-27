/**
 * Plate: a scene flattened into drawing operations for one mode, with the
 * print furniture around it — bleed clip, crop marks, registration
 * targets, a slug line and a one-inch check bar. Both the SVG and PDF
 * writers read the same plate, so what you preview is what prints.
 */

import { textStrokes } from './font';
import type { Pt } from './geom';
import type { Mode, Scene, Shape } from './scene';
import {
  BLEED_IN,
  GUIDE_INK,
  MARK_MARGIN_IN,
  mixHex,
  mmToIn,
  PAGE_WHITE,
  PAINT,
  PANEL_IN,
  UNDERLAY_INK,
  WEIGHT_MM,
} from './tokens';

export type Op =
  | { t: 'rect'; x: number; y: number; w: number; h: number; fill: string }
  | { t: 'path'; pts: Pt[]; closed: boolean; stroke: string; width: number; fill?: string; dash?: number[] }
  | { t: 'circle'; c: Pt; r: number; stroke: string; width: number; fill?: string; dash?: number[] }
  | { t: 'clip'; x: number; y: number; w: number; h: number }
  | { t: 'unclip' };

export interface Plate {
  /** Top-left corner and edge length, in trim inches. */
  x0: number;
  y0: number;
  size: number;
  ops: Op[];
}

export interface PlateOpts {
  mode: Mode;
  /** Crop marks, registration targets, slug and scale bar. */
  marks: boolean;
  /** Flip left-right — only for toner or gel transfers. */
  mirror: boolean;
  slug: string;
}

export function compose(scene: Scene, opts: PlateOpts): Plate {
  const e = BLEED_IN + (opts.marks ? MARK_MARGIN_IN : 0);
  const ops: Op[] = [];
  const flip = (pt: Pt): Pt => (opts.mirror ? [PANEL_IN - pt[0], pt[1]] : pt);

  ops.push({ t: 'rect', x: -e, y: -e, w: PANEL_IN + 2 * e, h: PANEL_IN + 2 * e, fill: PAGE_WHITE });
  ops.push({ t: 'clip', x: -BLEED_IN, y: -BLEED_IN, w: PANEL_IN + 2 * BLEED_IN, h: PANEL_IN + 2 * BLEED_IN });

  if (opts.mode === 'study') {
    for (const g of scene.grounds) {
      const [x, y, w, h] = g.rect;
      ops.push({ t: 'rect', x: opts.mirror ? PANEL_IN - x - w : x, y, w, h, fill: PAINT[g.paint].hex });
    }
  }

  for (const shape of scene.shapes) {
    const op = shapeOp(shape, opts.mode, flip);
    if (op) ops.push(op);
  }
  ops.push({ t: 'unclip' });

  if (opts.marks) ops.push(...furniture(opts.slug));

  return { x0: -e, y0: -e, size: PANEL_IN + 2 * e, ops };
}

function shapeOp(shape: Shape, mode: Mode, flip: (p: Pt) => Pt): Op | null {
  const st = shape.style;
  if (st.only && st.only !== mode) return null;
  if (st.guide && mode === 'study') return null;
  const stroke = mode === 'study' ? PAINT[st.paint].hex : st.guide ? GUIDE_INK : UNDERLAY_INK;
  const fill =
    mode === 'study' && st.fill ? mixHex(PAINT.bone.hex, PAINT[st.fill].hex, st.fillTone ?? 1) : undefined;
  const width = mmToIn(WEIGHT_MM[st.weight]);
  if (shape.kind === 'circle') return { t: 'circle', c: flip(shape.c), r: shape.r, stroke, width, fill, dash: st.dash };
  return { t: 'path', pts: shape.pts.map(flip), closed: shape.closed, stroke, width, fill, dash: st.dash };
}

/** Crop marks, registration targets, the slug line and a one-inch bar. */
function furniture(slug: string): Op[] {
  const ops: Op[] = [];
  const w = mmToIn(WEIGHT_MM.hair);
  const line = (a: Pt, b: Pt): Op => ({ t: 'path', pts: [a, b], closed: false, stroke: UNDERLAY_INK, width: w });
  const near = BLEED_IN + 0.0625;
  const far = BLEED_IN + 0.4;

  for (const x of [0, PANEL_IN])
    for (const y of [0, PANEL_IN]) {
      const sx = x === 0 ? -1 : 1;
      const sy = y === 0 ? -1 : 1;
      ops.push(line([x + sx * near, y], [x + sx * far, y]));
      ops.push(line([x, y + sy * near], [x, y + sy * far]));
    }

  const mid = PANEL_IN / 2;
  const off = BLEED_IN + MARK_MARGIN_IN / 2;
  const targets: Pt[] = [[mid, -off], [mid, PANEL_IN + off], [-off, mid], [PANEL_IN + off, mid]];
  for (const [x, y] of targets) {
    ops.push({ t: 'circle', c: [x, y], r: 0.09, stroke: UNDERLAY_INK, width: w });
    ops.push(line([x - 0.16, y], [x + 0.16, y]));
    ops.push(line([x, y - 0.16], [x, y + 0.16]));
  }

  const base = PANEL_IN + BLEED_IN + 0.3;
  for (const pts of textStrokes(slug, [0.4, base], 0.075)) {
    ops.push({ t: 'path', pts, closed: false, stroke: UNDERLAY_INK, width: w });
  }
  const bar = PANEL_IN - 1;
  ops.push(line([bar, base - 0.04], [bar + 1, base - 0.04]));
  ops.push(line([bar, base - 0.12], [bar, base + 0.04]));
  ops.push(line([bar + 1, base - 0.12], [bar + 1, base + 0.04]));
  for (const pts of textStrokes('1 IN', [bar - 0.08, base], 0.075, { anchor: 'end' })) {
    ops.push({ t: 'path', pts, closed: false, stroke: UNDERLAY_INK, width: w });
  }
  return ops;
}
