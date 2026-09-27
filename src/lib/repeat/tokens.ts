/**
 * The Repeat Suite — shared tokens.
 *
 * One source of truth for all four panels: the paint spine, the ink
 * weight language, and the physical page. Panels describe geometry in
 * inches on the trim box (0..12 on both axes, y down). Renderers turn
 * that into SVG or PDF at true size, so the screen and the print can
 * never drift apart.
 */

/** Finished panel edge, inches. */
export const PANEL_IN = 12;
/** Bleed past the trim on every side, inches. */
export const BLEED_IN = 0.125;
/** Room outside the bleed for crop marks and the slug line, inches. */
export const MARK_MARGIN_IN = 0.5;

/**
 * The paint spine. Hex values are colour-study approximations of the
 * real tubes — close enough to judge balance on screen, not a match.
 * Indigo, gold, umber and oxide red are the series spine; crimson only
 * appears after the error (panels III and IV); Payne's grey is mixed
 * from indigo + burnt umber so the spine lives inside the grey too.
 */
export const PAINT = {
  ink: { hex: '#1b1a1f', name: 'Ink' },
  indigo: { hex: '#1e2447', name: 'Indigo' },
  gold: { hex: '#c8a14b', name: 'Gold' },
  amber: { hex: '#d58b2c', name: 'Amber' },
  umber: { hex: '#5b3a24', name: 'Burnt umber' },
  oxide: { hex: '#9a3b26', name: 'Oxide red' },
  crimson: { hex: '#8d1b2e', name: 'Crimson' },
  payne: { hex: '#3a404f', name: "Payne's grey (indigo + umber)" },
  bone: { hex: '#ebe4d4', name: 'Bone white' },
  warmWhite: { hex: '#f2eadb', name: 'Warm white' },
} as const;

export type Paint = keyof typeof PAINT;

/**
 * The ink weight language, in millimetres — technical-pen sizes so the
 * underlays can be traced with real pens and still match each other.
 */
export const WEIGHT_MM = {
  hair: 0.18,
  fine: 0.3,
  medium: 0.5,
  bold: 0.8,
  heavy: 1.4,
} as const;

export type Weight = keyof typeof WEIGHT_MM;

export const mmToIn = (mm: number): number => mm / 25.4;

/** Underlay ink and the colour of non-trace guides (numbers, tide line). */
export const UNDERLAY_INK = '#141414';
export const GUIDE_INK = '#8f98a3';
export const PAGE_WHITE = '#ffffff';

/** Mix two hex colours; t = 0 → a, t = 1 → b. */
export function mixHex(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (p: number, s: number) => (p >> s) & 255;
  const out = [16, 8, 0].map((s) =>
    Math.round(ch(pa, s) + (ch(pb, s) - ch(pa, s)) * t),
  );
  return '#' + out.map((v) => v.toString(16).padStart(2, '0')).join('');
}
