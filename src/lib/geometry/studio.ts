/**
 * Studio: physical outputs.
 *
 * Everything here takes the drawing that is on screen (already harvested and fitted to the page
 * by the engine, see `Geometry`) and packages it for print, pen plotter or hand-cut stencil.
 * Units inside this module are millimetres.
 *
 * This is the pure half of the original "Studio" block: no DOM, no `window`, no mutable app
 * state. The closure globals of the original (`ST`, `state`, `titles`) are explicit parameters
 * (`ST: StudioSettings`, `labels: Labels`). The algorithms are a line-for-line port of the
 * original, golden-tested for byte-identical output, so rounding, iteration order, tolerances and
 * string formats are deliberate: do not "improve" them without regenerating the goldens.
 */

// ---------------------------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------------------------

export type Pt = [number, number];
export type LayerId = 'construction' | 'figure' | 'accent' | 'marks' | 'drafting';

/** One harvested stroke: a polyline (or closed polygon) tagged with the layer it belongs to. */
export interface Stroke {
  layer: LayerId;
  kind: string;
  pts: Pt[];
  closed: boolean;
  fill?: boolean;
}

/** The drawing fitted to the page, in page millimetres. */
export interface Geometry {
  W: number;
  H: number;
  /** drawing units to millimetres */
  s: number;
  /** sample density the strokes were harvested at */
  res: number;
  strokes: Stroke[];
  /** size of the figure itself (width, height) in mm */
  span: [number, number];
}

export interface LayerSetting {
  on: boolean;
  pen: number;
  color: string;
}

export interface StudioSettings {
  mode: 'print' | 'plotter' | 'stencil';
  page: string;
  orient: 'portrait' | 'landscape';
  cw: number;
  ch: number;
  margin: number;
  layers: Record<LayerId, LayerSetting>;
  slot: number;
  bridge: number;
  span: number;
  sheet: string;
  overlap: number;
  dpi: number;
  /** Persisted by the original but never read by any output code (the human silhouette is shown purely by page size). */
  human: boolean;
}

/** The two app-level strings the original pulled from `titles[state.pattern]` / `state`. */
export interface Labels {
  /** `titles[pattern]` */
  patternTitle: string;
  /** `${titles[pattern]} · step ${n} · ${state.mode}` (the view mode, not the studio mode) */
  fileTitle: string;
}

export interface Layer {
  id: LayerId;
  label: string;
  hint: string;
}

/** A selectable page (`PAGES`) or tiling sheet (`SHEETS`). Entries without a size ('custom', 'off') are not physical sizes. */
export interface PageDef {
  id: string;
  label: string;
  w?: number;
  h?: number;
}
export type SheetDef = PageDef;

// ---------------------------------------------------------------------------------------------
// Catalogues and defaults
// ---------------------------------------------------------------------------------------------

export const PAGES: PageDef[] = [
  { id: 'a3', label: 'A3 · 297 × 420 mm', w: 297, h: 420 },
  { id: 'a2', label: 'A2 · 420 × 594 mm', w: 420, h: 594 },
  { id: 'a1', label: 'A1 · 594 × 841 mm', w: 594, h: 841 },
  { id: 'a0', label: 'A0 · 841 × 1189 mm', w: 841, h: 1189 },
  { id: '2a0', label: '2A0 · 1189 × 1682 mm', w: 1189, h: 1682 },
  { id: '18x24', label: '18 × 24 in', w: 457.2, h: 609.6 },
  { id: '24x36', label: '24 × 36 in', w: 609.6, h: 914.4 },
  { id: '36x48', label: '36 × 48 in', w: 914.4, h: 1219.2 },
  { id: '48x48', label: '48 × 48 in panel', w: 1219.2, h: 1219.2 },
  { id: '4x8', label: '4 × 8 ft sheet', w: 1219.2, h: 2438.4 },
  { id: 'mural3', label: 'Wall · 3 × 3 m', w: 3000, h: 3000 },
  { id: 'mural6', label: 'Wall · 6 × 4 m', w: 4000, h: 6000 },
  { id: 'custom', label: 'Custom…' },
];

export const SHEETS: SheetDef[] = [
  { id: 'off', label: 'Off · one sheet' },
  { id: 'letter', label: 'Letter', w: 215.9, h: 279.4 },
  { id: 'a4', label: 'A4', w: 210, h: 297 },
  { id: 'tabloid', label: 'Tabloid 11 × 17', w: 279.4, h: 431.8 },
  { id: 'a3', label: 'A3', w: 297, h: 420 },
  { id: 'mylar', label: 'Mylar 24 × 36', w: 609.6, h: 914.4 },
];

export const LAYERS: Layer[] = [
  { id: 'construction', label: 'Construction', hint: 'circles & axes · UV underlayer' },
  { id: 'figure', label: 'Figure', hint: 'the geometry' },
  { id: 'accent', label: 'Accent', hint: 'lens, boundary, spiral' },
  { id: 'marks', label: 'Centre marks', hint: 'nodes & bindu' },
  { id: 'drafting', label: 'Drafting', hint: 'grid, φ squares, dimensions' },
];

export const studioDefaults: StudioSettings = {
  mode: 'print',
  page: '48x48',
  orient: 'portrait',
  cw: 1000,
  ch: 1000,
  margin: 50,
  layers: {
    construction: { on: true, pen: 0.5, color: '#8f8a7c' },
    figure: { on: true, pen: 1.2, color: '#171815' },
    accent: { on: true, pen: 1.2, color: '#ca432c' },
    marks: { on: false, pen: 0.5, color: '#ca432c' },
    drafting: { on: false, pen: 0.3, color: '#9b6c10' },
  },
  slot: 4,
  bridge: 5,
  span: 160,
  sheet: 'off',
  overlap: 20,
  dpi: 300,
  human: true,
};

export function cloneDefaults(): StudioSettings {
  return structuredClone(studioDefaults);
}

/** What `JSON.parse` of a stored settings string may hold: anything, in practice. */
type StoredSettings = Partial<Omit<StudioSettings, 'layers'>> & {
  layers?: Partial<Record<LayerId, Partial<LayerSetting> | null>> | null;
};

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

/** A finite number clamped to [lo, hi], or `fallback` for anything else (strings that parse are accepted). */
function num(v: unknown, lo: number, hi: number, fallback: number): number {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN;
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : fallback;
}

function oneOf<T extends string>(v: unknown, allowed: readonly T[], fallback: T): T {
  return (allowed as readonly unknown[]).includes(v) ? (v as T) : fallback;
}

/**
 * Settings come back from localStorage, which can hold anything: an older schema, a hand edit,
 * another script on the origin. Every field is checked (numbers clamped to the ranges the UI
 * allows, enums and colours matched exactly) and falls back to its default, so a bad value can
 * neither throw, hang the tiler, nor reach the SVG markup. Layers are rebuilt as fresh objects,
 * never aliased to `studioDefaults`.
 */
function sanitizeSettings(stored: StoredSettings): StudioSettings {
  const d = cloneDefaults();
  const layers: Record<string, unknown> = stored.layers && typeof stored.layers === 'object' ? stored.layers : {};
  for (const L of LAYERS) {
    const o = layers[L.id];
    if (!o || typeof o !== 'object') continue;
    const l = o as Partial<LayerSetting>;
    const base = d.layers[L.id];
    d.layers[L.id] = {
      on: typeof l.on === 'boolean' ? l.on : base.on,
      pen: num(l.pen, 0.05, 50, base.pen),
      color: typeof l.color === 'string' && HEX_COLOR.test(l.color) ? l.color : base.color,
    };
  }
  return {
    ...d,
    mode: oneOf(stored.mode, ['print', 'plotter', 'stencil'] as const, d.mode),
    page: oneOf(stored.page, PAGES.map(p => p.id), d.page),
    orient: oneOf(stored.orient, ['portrait', 'landscape'] as const, d.orient),
    cw: num(stored.cw, 50, 20000, d.cw),
    ch: num(stored.ch, 50, 20000, d.ch),
    margin: num(stored.margin, 0, 2000, d.margin),
    slot: num(stored.slot, 0.5, 100, d.slot),
    bridge: num(stored.bridge, 0.5, 100, d.bridge),
    span: num(stored.span, 10, 5000, d.span),
    sheet: oneOf(stored.sheet, SHEETS.map(p => p.id), d.sheet),
    overlap: num(stored.overlap, 0, 500, d.overlap),
    dpi: num(stored.dpi, 72, 1200, d.dpi),
    human: typeof stored.human === 'boolean' ? stored.human : d.human,
  };
}

/**
 * The original `const ST = (() => { ... })()` minus the `localStorage` access: the caller passes
 * the stored string (`localStorage.getItem('sg-studio')`). Never throws; missing, corrupt or
 * wrongly-shaped input falls back to the defaults, field by field.
 */
export function loadSettings(raw: string | null): StudioSettings {
  try {
    const v: unknown = JSON.parse(raw || 'null');
    if (v && typeof v === 'object' && !Array.isArray(v)) return sanitizeSettings(v as StoredSettings);
  } catch {
    // corrupt stored value: fall through to the defaults
  }
  return cloneDefaults();
}

// ---------------------------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------------------------

export const f2 = (n: number): number => +n.toFixed(2);

export function fmtLen(mm: number): string {
  return mm >= 1000 ? `${(mm / 1000).toFixed(2)} m` : `${Math.round(mm)} mm`;
}

/** The margin actually applied: never more than a third of the short side, so a big margin on a small sheet can't eat the drawing. */
export function fitMargin(W: number, H: number, ST: StudioSettings): number {
  return Math.min(ST.margin, Math.min(W, H) / 3);
}

export function pageSize(ST: StudioSettings): { W: number; H: number } {
  let w: number, h: number;
  if (ST.page === 'custom') {
    w = +ST.cw || 1000;
    h = +ST.ch || 1000;
  } else {
    const p = PAGES.find(p => p.id === ST.page) || PAGES[8];
    // Only 'custom' has no size and it is handled above, so `?? NaN` is unreachable (it mirrors
    // what the original's `undefined` would have produced in arithmetic).
    w = p.w ?? NaN;
    h = p.h ?? NaN;
  }
  if ((ST.orient === 'landscape') !== w > h) [w, h] = [h, w];
  return { W: w, H: h };
}

/** Basename shared by every file of a download: `<pattern>-step<n>-<W>x<H>mm` (the engine's `baseName()`). */
export function studioBaseName(pattern: string, step: number, ST: StudioSettings): string {
  return `${pattern}-step${step}-${Math.round(pageSize(ST).W)}x${Math.round(pageSize(ST).H)}mm`;
}

/** Which studio layer a harvested element belongs to (`src` is the SVG group it was read from). */
export function layerOf(kind: string, src: string): LayerId {
  if (src === 'grid') return 'drafting';
  if (kind === 'main' || kind === 'web' || kind === 'bindu') return 'figure';
  if (kind === 'lens' || kind === 'boundary' || kind === 'phi-spiral') return 'accent';
  if (kind === 'construction' || kind === 'sphere-ring' || kind.startsWith('axis-')) return 'construction';
  if (kind === 'node' || kind === 'cube' || kind === 'dot') return 'marks';
  return 'drafting';
}

export function dOf(pts: Pt[], closed: boolean): string {
  return 'M' + pts.map(p => f2(p[0]) + ' ' + f2(p[1])).join('L') + (closed ? 'Z' : '');
}

export function svgOpen(W: number, H: number, title: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" width="${f2(W)}mm" height="${f2(H)}mm" viewBox="0 0 ${f2(W)} ${f2(H)}"><title>${title}</title>`;
}

const ESC: Record<string, string> = { '<': '&lt;', '&': '&amp;', '>': '&gt;' };
export function esc(t: string): string {
  return t.replace(/[<&>]/g, c => ESC[c]);
}

// ---------------------------------------------------------------------------------------------
// Print: one group per layer, real pen widths in mm
// ---------------------------------------------------------------------------------------------

export function printInner(g: Geometry, ST: StudioSettings): string {
  let out = '';
  LAYERS.forEach(L => {
    const cfg = ST.layers[L.id];
    if (!cfg.on) return;
    const list = g.strokes.filter(s => s.layer === L.id);
    if (!list.length) return;
    const lines = list
        .filter(s => !s.fill)
        .map(s => dOf(s.pts, s.closed))
        .join(''),
      fills = list
        .filter(s => s.fill)
        .map(s => dOf(s.pts, true))
        .join('');
    out +=
      `<g id="${L.id}" inkscape:groupmode="layer" inkscape:label="${L.label}">` +
      (lines
        ? `<path d="${lines}" fill="none" stroke="${cfg.color}" stroke-width="${cfg.pen}" stroke-linecap="round" stroke-linejoin="round"/>`
        : '') +
      (fills ? `<path d="${fills}" fill="${cfg.color}"/>` : '') +
      '</g>';
  });
  return out;
}

// ---------------------------------------------------------------------------------------------
// Plotter: merge collinear overdraw, one path per stroke, a numbered layer per pen, short pen-up travel
// ---------------------------------------------------------------------------------------------

/**
 * A stroke as the plotter / stencil stages see it. `Stroke` is assignable to this; the plotter
 * feeds it `closed: s.closed || s.fill`, which may be `undefined` for an open, unfilled stroke.
 */
export interface StrokeLike {
  pts: Pt[];
  closed?: boolean;
  fill?: boolean;
  layer?: LayerId;
  kind?: string;
}

/** A straight line rebuilt from merged collinear segments (carries no layer/kind). */
export interface MergedLine {
  pts: Pt[];
  closed: false;
}

interface LineGroup {
  dx: number;
  dy: number;
  off: number;
  iv: [number, number][];
}

/**
 * Collapse overdraw. Every 2-point, unfilled stroke is a straight line: normalise its direction
 * (so A->B and B->A agree), then bucket it by (angle, perpendicular offset) rounded to
 * 1/2000 rad and 0.1 mm. Within a bucket all lines are collinear, so they are reduced to
 * intervals along the shared direction; overlapping or touching (<= 0.05 mm gap) intervals are
 * fused into one line. Everything else (polylines, polygons, fills) passes through untouched,
 * ahead of the merged lines. Zero-length 2-point strokes are dropped.
 */
export function mergeLines<T extends StrokeLike>(list: T[]): (T | MergedLine)[] {
  const keep: (T | MergedLine)[] = [],
    groups = new Map<string, LineGroup>();
  list.forEach(s => {
    if (s.pts.length !== 2 || s.fill) {
      keep.push(s);
      return;
    }
    const [a, b] = s.pts;
    let dx = b[0] - a[0],
      dy = b[1] - a[1];
    const L = Math.hypot(dx, dy);
    if (L < 1e-6) return;
    dx /= L;
    dy /= L;
    // canonical direction: pointing right, or straight up when vertical
    if (dx < -1e-9 || (Math.abs(dx) < 1e-9 && dy < 0)) {
      dx = -dx;
      dy = -dy;
    }
    const off = a[0] * -dy + a[1] * dx,
      key = `${Math.round(Math.atan2(dy, dx) * 2000)}|${Math.round(off * 10)}`;
    const t0 = a[0] * dx + a[1] * dy,
      t1 = b[0] * dx + b[1] * dy;
    let grp = groups.get(key);
    if (!grp) {
      grp = { dx, dy, off, iv: [] };
      groups.set(key, grp);
    }
    grp.iv.push([Math.min(t0, t1), Math.max(t0, t1)]);
  });
  groups.forEach(g => {
    g.iv.sort((p, q) => p[0] - q[0]);
    let cur: [number, number] | null = null;
    const flush = () => {
      if (cur)
        keep.push({
          pts: [
            [cur[0] * g.dx - g.off * g.dy, cur[0] * g.dy + g.off * g.dx],
            [cur[1] * g.dx - g.off * g.dy, cur[1] * g.dy + g.off * g.dx],
          ],
          closed: false,
        });
    };
    g.iv.forEach(iv => {
      if (cur && iv[0] <= cur[1] + 0.05) cur[1] = Math.max(cur[1], iv[1]);
      else {
        flush();
        cur = [...iv];
      }
    });
    flush();
  });
  return keep;
}

export interface OrderedStrokes<T> {
  list: T[];
  travel: number;
  draw: number;
  end: Pt;
}

/**
 * Greedy nearest-neighbour ordering to keep pen-up travel short. A closed stroke may be entered
 * at any of its points (it is rotated so that point comes first and the loop is closed by
 * repeating it); an open stroke may be entered at either end (reversed when needed).
 */
export function orderStrokes<T extends StrokeLike>(list: T[], start: Pt = [0, 0]): OrderedStrokes<T> {
  const todo = list.map(s => ({ ...s, pts: [...s.pts] })),
    out: T[] = [];
  let at = start,
    travel = 0,
    draw = 0;
  while (todo.length) {
    let best = 0,
      bd = Infinity,
      bi = 0,
      rev = false;
    todo.forEach((s, i) => {
      if (s.closed) {
        s.pts.forEach((p, k) => {
          const d = Math.hypot(p[0] - at[0], p[1] - at[1]);
          if (d < bd) {
            bd = d;
            best = i;
            bi = k;
            rev = false;
          }
        });
      } else {
        const a = s.pts[0],
          b = s.pts[s.pts.length - 1],
          da = Math.hypot(a[0] - at[0], a[1] - at[1]),
          db = Math.hypot(b[0] - at[0], b[1] - at[1]);
        if (da < bd) {
          bd = da;
          best = i;
          rev = false;
          bi = 0;
        }
        if (db < bd) {
          bd = db;
          best = i;
          rev = true;
          bi = 0;
        }
      }
    });
    const s = todo.splice(best, 1)[0];
    if (s.closed) s.pts = [...s.pts.slice(bi), ...s.pts.slice(0, bi), s.pts[bi]];
    else if (rev) s.pts.reverse();
    travel += bd;
    for (let i = 1; i < s.pts.length; i++)
      draw += Math.hypot(s.pts[i][0] - s.pts[i - 1][0], s.pts[i][1] - s.pts[i - 1][1]);
    at = s.pts[s.pts.length - 1];
    out.push(s);
  }
  return { list: out, travel, draw, end: at };
}

export type PlanStroke = StrokeLike;

export interface PlotterLayer {
  L: Layer;
  cfg: LayerSetting;
  list: PlanStroke[];
  travel: number;
}

export interface PlotterPlan {
  layers: PlotterLayer[];
  travel: number;
  draw: number;
  n: number;
  /** Set by the preview only: scales the dashed travel line. */
  scale?: number;
}

export function plotterPlan(g: Geometry, ST: StudioSettings): PlotterPlan {
  const layers: PlotterLayer[] = [];
  let at: Pt = [0, 0],
    travel = 0,
    draw = 0,
    n = 0;
  LAYERS.forEach(L => {
    const cfg = ST.layers[L.id];
    if (!cfg.on) return;
    const list = mergeLines(
      g.strokes.filter(s => s.layer === L.id).map(s => ({ ...s, closed: s.closed || s.fill })),
    );
    if (!list.length) return;
    const o = orderStrokes(list, at);
    at = o.end;
    travel += o.travel;
    draw += o.draw;
    n += o.list.length;
    layers.push({ L, cfg, list: o.list, travel: o.travel });
  });
  return { layers, travel, draw, n };
}

export function plotterInner(plan: PlotterPlan, preview: boolean): string {
  let out = '';
  plan.layers.forEach((p, i) => {
    out +=
      `<g id="pen-${i + 1}" inkscape:groupmode="layer" inkscape:label="${i + 1} ${p.L.label} · ${p.cfg.pen} mm" fill="none" stroke="${p.cfg.color}" stroke-width="${p.cfg.pen}" stroke-linecap="round" stroke-linejoin="round">` +
      p.list.map(s => `<path d="${dOf(s.pts, false)}"/>`).join('') +
      '</g>';
  });
  if (preview) {
    let at: Pt = [0, 0],
      d = '';
    plan.layers.forEach(p =>
      p.list.forEach(s => {
        d += `M${f2(at[0])} ${f2(at[1])}L${f2(s.pts[0][0])} ${f2(s.pts[0][1])}`;
        at = s.pts[s.pts.length - 1];
      }),
    );
    out += `<path d="${d}" fill="none" stroke="#3aa0a0" stroke-width="${Math.max(0.4, plan.scale || 0.6)}" stroke-dasharray="4 4" opacity=".7"/>`;
  }
  return out;
}

// ---------------------------------------------------------------------------------------------
// Stencil: slots of real width, a bridge on every edge between crossings, so no island can fall out
// ---------------------------------------------------------------------------------------------

/** A stroke as `crossings` receives it; `len` / `cum` / `cuts` are attached in place. */
export interface CutStroke {
  pts: Pt[];
  closed: boolean;
  len?: number;
  cum?: number[];
  cuts?: number[];
}

/** A `CutStroke` after `crossings`: total length, cumulative length at each vertex, and arc-length positions of crossings. */
export interface MeasuredStroke extends CutStroke {
  len: number;
  cum: number[];
  cuts: number[];
}

interface Seg {
  si: number;
  a: Pt;
  b: Pt;
  l0: number;
  l: number;
}

/**
 * Measure every stroke and find where strokes cross each other. Mutates each stroke exactly as
 * the original does: `len` (total arc length), `cum` (cumulative length at each vertex, closing
 * segment included for closed strokes) and `cuts` (arc-length positions, along that stroke, of
 * every crossing with a different stroke). A spatial hash of segments keeps this near-linear.
 */
export function crossings(strokes: CutStroke[]): asserts strokes is MeasuredStroke[] {
  const segs: Seg[] = [];
  const measured: MeasuredStroke[] = strokes.map((s, si) => {
    let acc = 0;
    const P = s.closed ? [...s.pts, s.pts[0]] : s.pts;
    const cum = [0];
    for (let i = 1; i < P.length; i++) {
      const a = P[i - 1],
        b = P[i],
        l = Math.hypot(b[0] - a[0], b[1] - a[1]);
      segs.push({ si, a, b, l0: acc, l });
      acc += l;
      cum.push(acc);
    }
    return Object.assign(s, { len: acc, cum, cuts: [] as number[] });
  });
  if (!segs.length) return;
  const avg = segs.reduce((t, g) => t + g.l, 0) / segs.length,
    cell = Math.max(2, avg * 3),
    grid = new Map<string, number[]>();
  segs.forEach((g, k) => {
    const x0 = Math.floor(Math.min(g.a[0], g.b[0]) / cell),
      x1 = Math.floor(Math.max(g.a[0], g.b[0]) / cell),
      y0 = Math.floor(Math.min(g.a[1], g.b[1]) / cell),
      y1 = Math.floor(Math.max(g.a[1], g.b[1]) / cell);
    for (let x = x0; x <= x1; x++)
      for (let y = y0; y <= y1; y++) {
        const key = x + ',' + y;
        let ids = grid.get(key);
        if (!ids) {
          ids = [];
          grid.set(key, ids);
        }
        ids.push(k);
      }
  });
  const seen = new Set<number>();
  grid.forEach(ids => {
    for (let i = 0; i < ids.length; i++)
      for (let j = i + 1; j < ids.length; j++) {
        const A = segs[ids[i]],
          B = segs[ids[j]];
        if (A.si === B.si) continue;
        const key = ids[i] < ids[j] ? ids[i] * 1e7 + ids[j] : ids[j] * 1e7 + ids[i];
        if (seen.has(key)) continue;
        seen.add(key);
        // segment-segment intersection: A.a + t*r = B.a + u*s
        const rx = A.b[0] - A.a[0],
          ry = A.b[1] - A.a[1],
          sx = B.b[0] - B.a[0],
          sy = B.b[1] - B.a[1],
          den = rx * sy - ry * sx;
        if (Math.abs(den) < 1e-12) continue;
        const qx = B.a[0] - A.a[0],
          qy = B.a[1] - A.a[1],
          t = (qx * sy - qy * sx) / den,
          u = (qx * ry - qy * rx) / den;
        if (t >= -1e-9 && t <= 1 + 1e-9 && u >= -1e-9 && u <= 1 + 1e-9) {
          measured[A.si].cuts.push(A.l0 + t * A.l);
          measured[B.si].cuts.push(B.l0 + u * B.l);
        }
      }
  });
}

/** The part of a measured stroke between arc lengths `a` and `b` as a polyline (a closed stroke wraps around). */
export function slicePts(s: MeasuredStroke, a: number, b: number): Pt[] {
  const P = s.closed ? [...s.pts, s.pts[0]] : s.pts,
    L = s.len,
    out: Pt[] = [];
  const at = (t: number): Pt => {
    t = s.closed ? ((t % L) + L) % L : Math.max(0, Math.min(L, t));
    let i = 1;
    while (i < s.cum.length - 1 && s.cum[i] < t) i++;
    const l0 = s.cum[i - 1],
      l1 = s.cum[i],
      k = l1 > l0 ? (t - l0) / (l1 - l0) : 0;
    return [P[i - 1][0] + (P[i][0] - P[i - 1][0]) * k, P[i - 1][1] + (P[i][1] - P[i - 1][1]) * k];
  };
  out.push(at(a));
  for (let lap = s.closed ? -1 : 0; lap < (s.closed ? 2 : 1); lap++)
    for (let i = 0; i < s.cum.length; i++) {
      const c = s.cum[i] + lap * L;
      if (c > a + 1e-6 && c < b - 1e-6) out.push(P[i]);
    }
  out.push(at(b));
  return out.filter((p, i) => !i || Math.hypot(p[0] - out[i - 1][0], p[1] - out[i - 1][1]) > 1e-6);
}

/** Offset a polyline by half the width `w` on each side (mitred, miter capped) into one closed outline. */
export function outline(pts: Pt[], w: number): Pt[] {
  const h = w / 2,
    n = pts.length,
    Lf: Pt[] = [],
    Rt: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)],
      b = pts[Math.min(n - 1, i + 1)],
      p = pts[i];
    let tx = b[0] - a[0],
      ty = b[1] - a[1];
    const tl = Math.hypot(tx, ty) || 1;
    tx /= tl;
    ty /= tl;
    let k = 1;
    if (i > 0 && i < n - 1) {
      const d1x = p[0] - a[0],
        d1y = p[1] - a[1],
        d2x = b[0] - p[0],
        d2y = b[1] - p[1],
        l1 = Math.hypot(d1x, d1y) || 1,
        l2 = Math.hypot(d2x, d2y) || 1,
        c = (d1x * d2x + d1y * d2y) / (l1 * l2);
      k = 1 / Math.max(0.5, Math.sqrt((1 + c) / 2));
    }
    Lf.push([p[0] - ty * h * k, p[1] + tx * h * k]);
    Rt.push([p[0] + ty * h * k, p[1] - tx * h * k]);
  }
  return [...Lf, ...Rt.reverse()];
}

export interface StencilSheet {
  L: Layer;
  /** closed outlines of the cut slots */
  slots: Pt[][];
  /** filled dots, cut out whole */
  holes: Pt[][];
  bridges: number;
  edgesCut: number;
}

/**
 * One stencil sheet per enabled layer that has strokes.
 *
 * Bridge algorithm: a slot cut along a whole line would drop out the material it encloses, so
 * every stroke is split into "edges" at its crossings with other strokes (closed strokes with no
 * crossing are one loop edge). Each edge longer than the bridge width `bw` gets
 * `n = ceil(edgeLength / span)` bridges (at least 2 for a lone loop, at least 1 otherwise),
 * spaced evenly, each `bw` wide and centred at (k + 0.5) / n along the edge; the cut intervals
 * are what lies between bridges. Edges no longer than `bw` are left uncut (the crossing itself
 * acts as the tie). Cuts that abut at a crossing are then joined so a slot runs straight
 * through it in one piece (for loops, also across the seam), and each interval is turned
 * into a slot outline of width `slot`.
 */
export function stencilSheets(g: Geometry, ST: StudioSettings): StencilSheet[] {
  const sheets: StencilSheet[] = [];
  const w = +ST.slot,
    bw = +ST.bridge,
    span = Math.max(bw * 3, +ST.span);
  LAYERS.forEach(L => {
    if (!ST.layers[L.id].on) return;
    const src = g.strokes.filter(s => s.layer === L.id);
    if (!src.length) return;
    const holes = src.filter(s => s.fill).map(s => s.pts),
      strokes: CutStroke[] = mergeLines(src.filter(s => !s.fill)).map(s => ({ pts: s.pts, closed: s.closed }));
    crossings(strokes);
    let bridges = 0;
    const slots: Pt[][] = [];
    strokes.forEach(s => {
      if (s.len < 1e-6) return;
      const c = [...new Set(s.cuts.map(t => Math.round(t * 100) / 100))].sort((p, q) => p - q);
      const nodes = s.closed
        ? c.length
          ? c
          : [0]
        : [0, ...c.filter(t => t > 0.01 && t < s.len - 0.01), s.len];
      const edges: [number, number][] = [];
      if (s.closed) {
        for (let i = 0; i < nodes.length; i++) {
          const a = nodes[i],
            b = i + 1 < nodes.length ? nodes[i + 1] : nodes[0] + s.len;
          edges.push([a, b]);
        }
      } else for (let i = 1; i < nodes.length; i++) edges.push([nodes[i - 1], nodes[i]]);
      const lone = s.closed && !c.length;
      const iv: [number, number][] = [];
      edges.forEach(([a, b]) => {
        const l = b - a;
        if (l <= bw) {
          return;
        }
        const n = Math.max(lone ? 2 : 1, Math.ceil(l / span));
        bridges += n;
        let from = a;
        for (let k = 0; k < n; k++) {
          const mid = a + (l * (k + 0.5)) / n;
          iv.push([from, mid - bw / 2]);
          from = mid + bw / 2;
        }
        iv.push([from, b]);
      });
      // join cuts that meet at a crossing so each slot runs through it in one piece
      const merged: [number, number][] = [];
      iv.filter(v => v[1] - v[0] > 0.2).forEach(v => {
        const last = merged[merged.length - 1];
        if (last && Math.abs(last[1] - v[0]) < 1e-6) last[1] = v[1];
        else merged.push([...v]);
      });
      if (s.closed && merged.length > 1) {
        const f = merged[0],
          l = merged[merged.length - 1];
        if (Math.abs(l[1] - (f[0] + s.len)) < 1e-6) {
          f[0] = l[0] - s.len;
          merged.pop();
        }
      }
      merged.forEach(([a, b]) => slots.push(outline(slicePts(s, a, b), w)));
    });
    sheets.push({ L, slots, holes, bridges, edgesCut: slots.length });
  });
  return sheets;
}

/** Four registration crosses (as filled bars) in the page corners, shared by every layer sheet. */
export function regMarks(W: number, H: number, w: number, ST: StudioSettings): string {
  const mg = fitMargin(W, H, ST),
    m = Math.max(8, Math.min(mg / 2, 40)),
    arm = Math.min(12, m * 0.8),
    h = Math.max(0.8, w / 2),
    P: Pt[] = [
      [m, m],
      [W - m, m],
      [m, H - m],
      [W - m, H - m],
    ];
  return P.map(
    ([x, y]) =>
      dOf(
        [
          [x - arm, y - h],
          [x + arm, y - h],
          [x + arm, y + h],
          [x - arm, y + h],
        ],
        true,
      ) +
      dOf(
        [
          [x - h, y - arm],
          [x + h, y - arm],
          [x + h, y + arm],
          [x - h, y + arm],
        ],
        true,
      ),
  ).join('');
}

export function stencilInner(
  sheet: StencilSheet,
  W: number,
  H: number,
  ST: StudioSettings,
  labels: Labels,
  label = true,
): string {
  const d = sheet.slots.map(p => dOf(p, true)).join('') + sheet.holes.map(p => dOf(p, true)).join('');
  return (
    `<g id="stencil-${sheet.L.id}" inkscape:groupmode="layer" inkscape:label="Stencil · ${sheet.L.label}"><path d="${d}" fill="#000" fill-rule="nonzero"/><path d="${regMarks(W, H, +ST.slot, ST)}" fill="#000"/>` +
    (label
      ? `<text x="${f2(W / 2)}" y="${f2(Math.max(6, fitMargin(W, H, ST) / 2))}" text-anchor="middle" font-family="ui-monospace,Menlo,monospace" font-size="${f2(Math.max(3, Math.min(10, fitMargin(W, H, ST) / 5)))}" fill="#888">${esc(sheet.L.label.toUpperCase())} · ${esc(labels.patternTitle)} · ${f2(W)}×${f2(H)} mm · slot ${ST.slot} · bridge ${ST.bridge}</text>`
      : '') +
    '</g>'
  );
}

// ---------------------------------------------------------------------------------------------
// Tiling: split the page onto printable sheets with overlap and shared registration crosses
// ---------------------------------------------------------------------------------------------

export interface TilePlan {
  /** sheet width / height (the orientation that needs fewer sheets) */
  sw: number;
  sh: number;
  /** printable tile width / height (sheet minus the edge on both sides) */
  tw: number;
  th: number;
  cols: number;
  rows: number;
  n: number;
  /** overlap between neighbouring tiles, mm */
  ov: number;
  /** unprinted edge, mm */
  edge: number;
  /** label of the chosen sheet size */
  label: string;
}

/** Above this many sheets tiling is refused: every tile embeds the whole figure, so memory grows with tiles x figure. */
export const MAX_TILES = 1000;

export function tilePlan(W: number, H: number, ST: StudioSettings): TilePlan | null {
  const sh = SHEETS.find(s => s.id === ST.sheet);
  if (!sh || !sh.w) return null;
  // Every sheet with a width also has a height; `?? NaN` is unreachable (see pageSize).
  const dims: [number, number][] = [
    [sh.w, sh.h ?? NaN],
    [sh.h ?? NaN, sh.w],
  ];
  const requested = Math.max(0, +ST.overlap || 0),
    edge = 6,
    best = dims
      .map(([sw, shh]) => {
        const tw = sw - 2 * edge,
          th = shh - 2 * edge,
          // the grid advances by (tile - overlap): keep that positive, or cols/rows run to Infinity
          ov = Math.min(requested, Math.min(tw, th) / 2),
          cols = Math.max(1, Math.ceil((W - ov) / (tw - ov))),
          rows = Math.max(1, Math.ceil((H - ov) / (th - ov)));
        return { sw, sh: shh, tw, th, cols, rows, n: cols * rows, ov };
      })
      .sort((a, b) => a.n - b.n)[0];
  if (!Number.isFinite(best.n) || best.n > MAX_TILES) return null;
  return { ...best, edge, label: sh.label };
}

/** Teal alignment crosses at the centre of every tile overlap (the original also took, but never used, the page size). */
export function tileMarks(tp: TilePlan): string {
  let d = '';
  const a = 6,
    h = 0.35;
  const xs: number[] = [],
    ys: number[] = [];
  for (let c = 1; c < tp.cols; c++) xs.push(c * (tp.tw - tp.ov) + tp.ov / 2);
  for (let r = 1; r < tp.rows; r++) ys.push(r * (tp.th - tp.ov) + tp.ov / 2);
  const cross = (x: number, y: number) => {
    d += `M${f2(x - a)} ${f2(y)}H${f2(x + a)}M${f2(x)} ${f2(y - a)}V${f2(y + a)}`;
  };
  xs.forEach(x => {
    for (let r = 0; r < tp.rows; r++) cross(x, r * (tp.th - tp.ov) + tp.th / 2);
  });
  ys.forEach(y => {
    for (let c = 0; c < tp.cols; c++) cross(c * (tp.tw - tp.ov) + tp.tw / 2, y);
  });
  xs.forEach(x => ys.forEach(y => cross(x, y)));
  return d ? `<path d="${d}" fill="none" stroke="#1f8b8b" stroke-width="${h}"/>` : '';
}

export function tiles(
  inner: string,
  W: number,
  H: number,
  name: string,
  ST: StudioSettings,
  labels: Labels,
): { name: string; data: string }[] {
  const tp = tilePlan(W, H, ST);
  if (!tp) return [];
  const files: { name: string; data: string }[] = [],
    marks = tileMarks(tp);
  for (let r = 0; r < tp.rows; r++)
    for (let c = 0; c < tp.cols; c++) {
      const x = c * (tp.tw - tp.ov),
        y = r * (tp.th - tp.ov),
        id = `r${r + 1}c${c + 1}`;
      // note: the title is not run through esc() here (as in the original)
      const svg =
        svgOpen(tp.sw, tp.sh, esc(`${labels.fileTitle} · tile ${id}`)) +
        `<defs><clipPath id="t"><rect x="0" y="0" width="${f2(tp.tw)}" height="${f2(tp.th)}"/></clipPath></defs>` +
        `<g transform="translate(${tp.edge} ${tp.edge})"><g clip-path="url(#t)"><g transform="translate(${f2(-x)} ${f2(-y)})">${inner}${marks}</g></g>` +
        `<rect x="0" y="0" width="${f2(tp.tw)}" height="${f2(tp.th)}" fill="none" stroke="#bbb" stroke-width=".2" stroke-dasharray="2 2"/></g>` +
        `<text x="${tp.edge}" y="${tp.edge - 1.5}" font-family="ui-monospace,Menlo,monospace" font-size="3.2" fill="#666">${esc(name)} · ROW ${r + 1} / ${tp.rows} · COL ${c + 1} / ${tp.cols} · overlap ${tp.ov} mm · align the teal crosses</text></svg>`;
      files.push({ name: `${id}.svg`, data: svg });
    }
  return files;
}

// ---------------------------------------------------------------------------------------------
// Zip (stored, no compression): enough to hand over many sheets at once
// ---------------------------------------------------------------------------------------------

export const CRC: Uint32Array = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

export interface ZipFile {
  name: string;
  data: string | Uint8Array<ArrayBuffer>;
}

export function zip(files: ZipFile[]): Blob {
  const enc = new TextEncoder(),
    parts: (DataView<ArrayBuffer> | Uint8Array<ArrayBuffer>)[] = [],
    central: (DataView<ArrayBuffer> | Uint8Array<ArrayBuffer>)[] = [];
  let off = 0;
  files.forEach(f => {
    const name = enc.encode(f.name),
      data = typeof f.data === 'string' ? enc.encode(f.data) : f.data;
    let c = 0xffffffff;
    for (let i = 0; i < data.length; i++) c = CRC[(c ^ data[i]) & 255] ^ (c >>> 8);
    c = (c ^ 0xffffffff) >>> 0;
    // local file header
    const h = new DataView(new ArrayBuffer(30));
    h.setUint32(0, 0x04034b50, true);
    h.setUint16(4, 20, true);
    h.setUint32(14, c, true);
    h.setUint32(18, data.length, true);
    h.setUint32(22, data.length, true);
    h.setUint16(26, name.length, true);
    // central directory entry
    const ce = new DataView(new ArrayBuffer(46));
    ce.setUint32(0, 0x02014b50, true);
    ce.setUint16(4, 20, true);
    ce.setUint16(6, 20, true);
    ce.setUint32(16, c, true);
    ce.setUint32(20, data.length, true);
    ce.setUint32(24, data.length, true);
    ce.setUint16(28, name.length, true);
    ce.setUint32(42, off, true);
    parts.push(h, name, data);
    central.push(ce, name);
    off += 30 + name.length + data.length;
  });
  const size = central.reduce((t, p) => t + p.byteLength, 0),
    end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, files.length, true);
  end.setUint16(10, files.length, true);
  end.setUint32(12, size, true);
  end.setUint32(16, off, true);
  return new Blob([...parts, ...central, end], { type: 'application/zip' });
}

// ---------------------------------------------------------------------------------------------
// Preview furniture
// ---------------------------------------------------------------------------------------------

/** A 1.75 m human silhouette at page scale (`hmm` = its height in mm), standing on `base` at horizontal position `x`. */
export function human(x: number, base: number, hmm: number): string {
  const s = hmm / 1750,
    hd = `<circle cx="${f2(x + 225 * s)}" cy="${f2(base - 1620 * s)}" r="${f2(115 * s)}"/>`,
    body = `<path d="M${f2(x + 95 * s)} ${f2(base - 1460 * s)}h${f2(260 * s)}l${f2(95 * s)} ${f2(560 * s)}h${f2(-70 * s)}l${f2(-70 * s)} ${f2(-360 * s)}v${f2(1260 * s)}h${f2(-90 * s)}v${f2(-720 * s)}h${f2(-40 * s)}v${f2(720 * s)}h${f2(-90 * s)}v${f2(-1260 * s)}l${f2(-70 * s)} ${f2(360 * s)}h${f2(-70 * s)}z"/>`;
  return `<g fill="currentColor" opacity=".38">${hd}${body}</g><text x="${f2(x + 225 * s)}" y="${f2(base + Math.max(14, hmm * 0.05))}" text-anchor="middle" font-size="${f2(Math.max(10, hmm * 0.04))}" fill="currentColor" opacity=".6">1.75 m</text>`;
}

// ---------------------------------------------------------------------------------------------
// The pure cores of updatePreview() / doDownload() and the PNG handler
// ---------------------------------------------------------------------------------------------

export interface PreviewResult {
  /** value for the preview <svg>'s viewBox attribute; null = leave it as it is */
  viewBox: string | null;
  /** innerHTML for the preview <svg> */
  svg: string;
  /** text for the stats line */
  stats: string;
}

/**
 * What the engine assigns to the preview <svg> and the stats line. `g` is the fitted geometry for
 * the current settings (the engine fits it at tolerance 0.35 mm in stencil mode, else 0.1 mm), or
 * null when no enabled layer has any lines.
 */
export function buildPreview(g: Geometry | null, ST: StudioSettings, labels: Labels): PreviewResult {
  if (!g) {
    return { viewBox: null, svg: '', stats: 'Nothing to output: turn on a layer that has lines at this step.' };
  }
  const { W, H } = g,
    showHuman = Math.max(W, H) >= 800,
    gap = Math.max(W, H) * 0.06,
    vbH = Math.max(H, showHuman ? 1800 : 0),
    pad = Math.max(W, H) * 0.03;
  let inner = '',
    stats = '',
    sheetsW = W;
  const unit = `1 unit = ${g.s.toFixed(2)} mm · figure ${fmtLen(g.span[0])} × ${fmtLen(g.span[1])}`;
  if (ST.mode === 'print') {
    inner = printInner(g, ST);
    stats = `${fmtLen(W)} × ${fmtLen(H)} · ${unit} · ${g.strokes.length} strokes`;
  }
  if (ST.mode === 'plotter') {
    const plan = plotterPlan(g, ST);
    plan.scale = Math.max(W, H) / 600;
    inner = plotterInner(plan, true);
    const mins = (plan.draw / 25 + plan.travel / 60) / 60;
    stats = `${plan.layers.length} pen${plan.layers.length === 1 ? '' : 's'} · ${plan.n} strokes · pen down ${fmtLen(plan.draw)} · travel ${fmtLen(plan.travel)} (dashed) · about ${mins < 90 ? Math.round(mins) + ' min' : (mins / 60).toFixed(1) + ' h'} at 25 mm/s`;
  }
  if (ST.mode === 'stencil') {
    const sheets = stencilSheets(g, ST);
    const sgap = Math.max(W, H) * 0.05;
    sheetsW = sheets.length * W + (sheets.length - 1) * sgap;
    inner = sheets
      .map(
        (sh, i) =>
          `<g transform="translate(${f2(i * (W + sgap))} 0)"><rect width="${f2(W)}" height="${f2(H)}" fill="#fff" stroke="#999" stroke-width="${f2(Math.max(W, H) / 900)}"/>${stencilInner(sh, W, H, ST, labels, false)}<text x="${f2(W / 2)}" y="${f2(H + Math.max(W, H) * 0.06)}" text-anchor="middle" font-size="${f2(Math.max(W, H) * 0.045)}" fill="currentColor" opacity=".7">${i + 1} · ${sh.L.label}</text></g>`,
      )
      .join('');
    stats = `${sheets.length} sheet${sheets.length === 1 ? '' : 's'} (${sheets.map(s => s.L.label).join(', ')}) · ${sheets.reduce((t, s) => t + s.slots.length, 0)} slots · ${sheets.reduce((t, s) => t + s.bridges, 0)} bridges · bridges tie long slots; where crossings sit closer than the slot width a small piece can still float free, so check the preview at your slot width before cutting`;
  }
  const tp = tilePlan(W, H, ST);
  let tileOverlay = '';
  if (tp) {
    for (let c = 1; c < tp.cols; c++) {
      const x = c * (tp.tw - tp.ov);
      tileOverlay += `<rect x="${f2(x)}" y="0" width="${f2(tp.ov)}" height="${f2(H)}"/>`;
    }
    for (let r = 1; r < tp.rows; r++) {
      const y = r * (tp.th - tp.ov);
      tileOverlay += `<rect x="0" y="${f2(y)}" width="${f2(W)}" height="${f2(tp.ov)}"/>`;
    }
    tileOverlay = `<g fill="#1f8b8b" opacity=".16">${tileOverlay}</g>`;
    stats += ` · tiled onto ${tp.n} × ${tp.label} (${tp.cols} × ${tp.rows})`;
  }
  const page =
    ST.mode === 'stencil'
      ? ''
      : `<rect width="${f2(W)}" height="${f2(H)}" fill="#fff" stroke="#999" stroke-width="${f2(Math.max(W, H) / 900)}"/>`;
  const hx = sheetsW + gap,
    fullW = sheetsW + (showHuman ? gap + 460 : 0),
    below = Math.max(showHuman ? Math.max(20, H * 0.08) : 0, ST.mode === 'stencil' ? Math.max(W, H) * 0.09 : 0);
  return {
    viewBox: `${f2(-pad)} ${f2(Math.min(0, H - vbH) - pad)} ${f2(fullW + 2 * pad)} ${f2(vbH + 2 * pad + below)}`,
    svg: page + inner + tileOverlay + (showHuman ? human(hx, H, 1750) : ''),
    stats,
  };
}

export interface DownloadResult {
  name: string;
  data: Blob;
}

/**
 * The file the "Download" button saves for the current mode: a `.svg` blob (print without tiling,
 * plotter) or a `.zip` blob (tiled print, stencil set). `baseName` is `studioBaseName(...)`.
 * Throws for an unrecognised `ST.mode` (impossible from typed settings; the original silently
 * did nothing in that case, and `loadSettings` does not validate the stored mode).
 */
export function buildDownload(
  g: Geometry,
  ST: StudioSettings,
  labels: Labels,
  baseName: string,
): DownloadResult {
  const { W, H } = g,
    name = baseName;
  if (ST.mode === 'print') {
    const inner = printInner(g, ST),
      svg = svgOpen(W, H, esc(labels.fileTitle)) + inner + '</svg>',
      t = tiles(inner, W, H, 'PRINT', ST, labels);
    if (t.length)
      return {
        name: `${name}-print.zip`,
        data: zip([
          { name: `${name}-print.svg`, data: svg },
          ...t.map(f => ({ name: `tiles/${f.name}`, data: f.data })),
        ]),
      };
    return { name: `${name}-print.svg`, data: new Blob([svg], { type: 'image/svg+xml' }) };
  }
  if (ST.mode === 'plotter') {
    const plan = plotterPlan(g, ST),
      svg =
        svgOpen(W, H, esc(labels.fileTitle) + ' · plotter') +
        `<desc>One path per stroke. Layers are numbered in pen order. Pen-down ${Math.round(plan.draw)} mm, travel ${Math.round(plan.travel)} mm.</desc>` +
        plotterInner(plan, false) +
        '</svg>';
    return { name: `${name}-plotter.svg`, data: new Blob([svg], { type: 'image/svg+xml' }) };
  }
  if (ST.mode === 'stencil') {
    const sheets = stencilSheets(g, ST),
      files: ZipFile[] = [];
    files.push({
      name: `${name}-all-layers.svg`,
      data:
        svgOpen(W, H, esc(labels.fileTitle) + ' · stencil set') +
        sheets.map(s => stencilInner(s, W, H, ST, labels)).join('') +
        '</svg>',
    });
    sheets.forEach((s, i) => {
      const inner = stencilInner(s, W, H, ST, labels);
      files.push({
        name: `${i + 1}-${s.L.id}.svg`,
        data: svgOpen(W, H, esc(labels.fileTitle) + ' · ' + s.L.label) + inner + '</svg>',
      });
      tiles(inner, W, H, s.L.label.toUpperCase(), ST, labels).forEach(f =>
        files.push({ name: `tiles/${i + 1}-${s.L.id}/${f.name}`, data: f.data }),
      );
    });
    return { name: `${name}-stencil.zip`, data: zip(files) };
  }
  throw new Error(`buildDownload: unknown studio mode "${String(ST.mode)}"`);
}

/** The SVG the "PNG at print size" button rasterises: the print SVG with its mm size replaced by the pixel size `w` x `h`. */
export function buildPrintSvgForPng(g: Geometry, ST: StudioSettings, labels: Labels, w: number, h: number): string {
  const { W, H } = g;
  return (
    svgOpen(W, H, esc(labels.fileTitle)).replace(/width="[^"]+mm" height="[^"]+mm"/, `width="${w}" height="${h}"`) +
    printInner(g, ST) +
    '</svg>'
  );
}

/**
 * Pixel size for the print-size PNG at `dpi`, capped so neither side exceeds 16384 px and the
 * area stays within 8e7 px (~320 MB of RGBA). The original allowed 2.4e8, which at the default
 * 48 in page asked a browser for an ~830 MB canvas and failed on many machines; past this budget
 * the toast steers to the vector SVG. The returned `dpi` is the (possibly reduced, unrounded) value used.
 */
export function printPngSize(g: Geometry, dpi: number): { w: number; h: number; dpi: number } {
  const { W, H } = g;
  let d = +dpi;
  const MAX = 16384,
    AREA = 8e7;
  d = Math.min(d, MAX / (Math.max(W, H) / 25.4), Math.sqrt(AREA / ((W / 25.4) * (H / 25.4))));
  const w = Math.round((W / 25.4) * d),
    h = Math.round((H / 25.4) * d);
  return { w, h, dpi: d };
}
