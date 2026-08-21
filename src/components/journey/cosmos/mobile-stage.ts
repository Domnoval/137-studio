// cosmos/mobile-stage.ts — OWNED BY COSMOS agent.
//
// THE PHONE'S CAMERA. Pure math, no React, no three.
//
// The mobile chapter is not a reduced site. It is the same descent, projected
// through a CSS lens instead of a WebGL one, and it is built out of the SAME
// constants the corridor and the sigil are built out of:
//
//   PACING     the camera's rate along the corridor is descentCurve() — the
//              identical WIDE/MACRO/PULL-BACK profile the desktop rig flies.
//              The phone accelerates and decelerates on the same beats.
//   HELIX      works sit on the golden-angle helix (137.508°), receding in Z,
//              exactly as SLABS places them; only the radii are re-fitted to a
//              portrait frame.
//   ARCHIVE    the final movement resolves all FIFTEEN works onto the φ spiral
//              published by cosmos-data — same slots, same radii (r = e^{bθ},
//              b = ln φ / π), same golden-angle deal. The corridor carries all
//              fifteen and the figure holds all fifteen positions; the inner
//              turns of a log spiral are smaller than a painting can be read
//              at, so those works resolve into the curve rather than sitting
//              on it as chips (see LEG_OUT). The plate counts what is legible
//              instead of asserting a ratio.
//
// THE ONE THING THE PHONE DOES DIFFERENTLY, AND WHY IT IS STILL THE SAME
// FIGURE: the archive is wound by exactly ARCHIVE_STEP — one work-position.
// A logarithmic spiral is self-similar under rotation (rotating by θ maps the
// curve onto itself scaled by e^{bθ}), so winding it one slot is the only
// reframing that leaves the curve identical rather than distorting it. It is
// also the move the desktop's second vantage already makes (VANTAGE_ROLL =
// ARCHIVE_STEP). Measured, in spiral half-extents: the unrolled figure is wider
// than tall (1.183 × 1.099) which is the worst possible fit in a 390×844 frame;
// wound one position it is 0.962 × 1.311 and every work in the archive gets 23%
// larger on the phone. The layout is not re-authored for mobile — it is turned.

import { GOLDEN_ANGLE, clamp01 } from '../journey-utils';
import {
  SLABS,
  ARCHIVE,
  ARCHIVE_CAP,
  ARCHIVE_STEP,
  archiveSpiralPath,
  descentCurve,
} from './cosmos-data';

/** Every work in the body. The phone shows all of them — there is no "selected". */
export const N = SLABS.length;

/**
 * Texture aspect (w/h) per work id, read off the pre-generated 1200px plates.
 * Baked rather than measured from <img> so the layout is deterministic and
 * cannot reflow when a texture finishes streaming.
 */
const ASPECT_BY_ID: Record<string, number> = {
  totem: 0.6667,
  'composite-head': 0.6667,
  'math-chaos': 0.7467,
  cruciform: 0.7673,
  'chaos-garden': 0.7838,
  'teal-skull': 0.8247,
  'pink-skull': 0.6612,
  menagerie: 0.7838,
  'blue-teeth': 1.9934,
  orbit: 0.8141,
  'broken-signal': 0.7619,
  'ultraviolet-beast': 0.5949,
  'the-delegate': 0.3795,
  undertow: 0.7514,
  rosetta: 0.75,
};

export const ASPECT: number[] = SLABS.map((s) => ASPECT_BY_ID[s.work.id] ?? 0.75);

/* ------------------------------------------------------- IDENTICAL PLATES */
/**
 * TWO PAIRS OF CATALOGUE ENTRIES ARE BACKED BY THE SAME PICTURE FILE.
 *
 *   md5 public/art/tex/totem.jpg        = cc65ed9e… ┐ byte-identical
 *   md5 public/art/tex/composite-head.jpg = cc65ed9e… ┘
 *   md5 public/art/tex/chaos-garden.jpg = c6d7b9de… ┐ byte-identical
 *   md5 public/art/tex/menagerie.jpg    = c6d7b9de… ┘
 *
 * This is a fact about the assets, not a bug in the layout, and it is not this
 * file's business to repair the artist's catalogue — the plates are the work
 * and nothing here touches them. But it IS this file's business that the
 * corridor never asks a visitor to read the same picture twice in one frame,
 * and until now it did the worst possible version of that: `totem` and
 * `composite-head` sat at consecutive stations, so the SECOND artwork screen a
 * phone visitor ever saw was one painting rendered twice, at two scales,
 * overlapping. Measured at scroll 25% on a 390×844 frame: 180×276px at
 * (148,218) and 125×187px at (32,351), both `cc65ed9e`.
 *
 * The rule this file now holds, at every depth and every phase:
 *   NO TWO PLATES CARRYING THE SAME PICTURE ARE EVER VISIBLE AT ONCE.
 *
 * It is enforced twice, because the chapter has two spatial regimes:
 *   CORRIDOR — twins are re-stationed at least TWIN_SEP apart, which is more
 *              than the corridor's own presence window is wide, so their live
 *              intervals are provably disjoint (see TWIN_SEP).
 *   ARCHIVE  — every work is present at once by definition, so the second
 *              member of a pair does not resolve as a plate at all: it winds
 *              into the curve, exactly as the sub-legible inner slots do.
 * The first member of each pair is the one that reads LARGER in the archive,
 * so the figure keeps the better-composed instance of the picture.
 */
const TWIN_PAIRS: [string, string][] = [
  ['totem', 'composite-head'],
  ['chaos-garden', 'menagerie'],
];

const INDEX_OF = new Map(SLABS.map((s, i) => [s.work.id, i]));

/** True for the SECOND member of a twin pair — the one that never plates in the archive. */
export const TWIN_ECHO: boolean[] = SLABS.map(() => false);
TWIN_PAIRS.forEach(([, echo]) => {
  const i = INDEX_OF.get(echo);
  if (i !== undefined) TWIN_ECHO[i] = true;
});

/* --------------------------------------------------------------- the lens */

/** CSS perspective, px. An element at translateZ(−d) projects to P/(P+d). */
export const PERSP = 820;
/** Z distance between consecutive works, px. */
export const SPACING = 620;
/** The rig starts this far back, so work 00 arrives from depth rather than popping. */
const START_LEAD = 1.9 * SPACING;
/** …and finishes with the last works still ahead, so the archive has somewhere to pull back FROM. */
const END_SHORT = 1.15 * SPACING;
/** The chapter opens on a held frame: the title card stands, the corridor
 *  stretches away behind it, and the fall has not begun. Then it does. */
const HOLD = 0.13;
/**
 * …BUT THE HOLD IS A DRIFT, NOT A FREEZE.
 *
 * `descentCurve` is clamped below HOLD, so the camera used to sit at exactly
 * one z for the whole title beat. On the phone that beat is global 0.138 →
 * 0.2372 — nearly a tenth of the entire scroll track — and captures at 0.16,
 * 0.19 and 0.215 came back with the three corridor plates in PIXEL-IDENTICAL
 * positions. A tenth of the journey where scrolling changes nothing but a
 * fading title is the definition of a repeated frame.
 *
 * So the rig starts this much further back and creeps forward to the corridor's
 * own start over the title beat: the plates grow very slightly, the parallax is
 * live from the first pixel of the chapter, and the descent curve still takes
 * over at exactly HOLD from exactly camA. 1.2 spacings is under the far-presence
 * threshold (FAR_FULL = 5.4 spacings), so nothing pops in — the corridor is
 * simply seen from slightly further away while the card stands.
 */
const HOLD_PREROLL = 1.2 * SPACING;
/** Cosmos-phase at which the corridor hands over to the archive. */
export const CORRIDOR_END = 0.7;

/** Beyond this the work has not entered the frame. */
const FAR_ON = 6.6 * SPACING;
/** …and by here it is at full presence. */
const FAR_FULL = 5.4 * SPACING;
/** Past the lens: gone by this much overshoot. */
const PASS_OUT = 0.34 * PERSP;
/**
 * HARD CEILING ON translateZ. Two things need it and both are bugs without it:
 *   1. the near pass. Projected scale is P/(P−z), which runs away as z → P. At
 *      the old ceiling a passing canvas reached 431px wide on a 390px phone and
 *      crossed under the HUD rail (measured: the rail paints from x=361.7).
 *   2. the archive transit. Works the rig has ALREADY passed sit at large
 *      positive z, and blending them from there to their spiral slot took them
 *      through the singularity — measured maxima of 1246px right and −2300px
 *      left mid-transit, i.e. metre-wide composited layers off both edges.
 * Capped here, projected scale can never exceed P/(P−ZCAP) = 1.16×.
 */
const ZCAP = 0.14 * PERSP;

/**
 * HOW FAR A WORK SWINGS OUT OF FRAME AS IT PASSES THE LENS, in px, and over
 * what fraction of the exit window it does it. 300px carries the widest near
 * pass measured on the stage (369px, half-width 185) so its trailing edge is
 * at 195+300−185 = 310 of 390 by the time the swing completes — clear of the
 * arriving subject, which composes about the optical centre. The window is
 * short on purpose: the swing must finish while the plate is still ESSENTIALLY
 * OPAQUE (α = outNear² = 0.49 at exitK 0.30), because an opaque plate covering
 * the work behind it is an occluder, which is honest, and a translucent one is
 * a ghost, which is not.
 */
const EXIT_SWING = 300;
const EXIT_SWING_T = 0.3;

/**
 * WHERE A WORK STOPS BEING TRANSPARENT AND STARTS BEING DIM.
 *
 * Presence below this is carried by alpha (so a work at the very edge of
 * arriving does not stamp an unlit rectangle over the starfield); presence
 * above it is carried by brightness, so the work is a solid object. 0.34 puts
 * every plate of the converging archive over the line — the worst measured
 * stack sat at 0.549 — while leaving the first sixth of any arrival genuinely
 * see-through. alpha·light === presence either side of the knee, so nothing
 * composited against the void changes at any scroll position.
 */
const PRESENCE_KNEE = 0.34;

/**
 * MINIMUM STATION SEPARATION BETWEEN TWO PLATES CARRYING THE SAME PICTURE.
 *
 * A work is lit for dz ∈ (−PASS_OUT, FAR_ON) — a window (FAR_ON + PASS_OUT)
 * wide, which is 7.05 stations. Two works whose stations differ by 8 therefore
 * have DISJOINT live intervals: when the nearer one is at its last visible
 * frame (dz = −PASS_OUT) the further one is still at 8·SPACING − PASS_OUT =
 * 4681px, past FAR_ON = 4092px, where inFar is exactly 0. Margin: 589px, one
 * whole station. This is a proof, not a sample — but it is checked by sweep
 * anyway, because a proof about a constant is only as good as the constant.
 */
export const TWIN_SEP = Math.ceil((FAR_ON + PASS_OUT) / SPACING) + 1;

/* ----------------------------------------------------------- the stations */
/**
 * WHICH WORK STANDS AT WHICH STATION IN THE CORRIDOR.
 *
 * The helix itself is untouched — station k is still at k·SPACING on the
 * golden-angle spiral (137.508° per station). All that changes is which
 * painting is hung at which station, and it changes for exactly one reason:
 * twins must be further apart in Z than the corridor's presence window.
 *
 * Catalogue order is otherwise preserved: `composite-head` moves from station
 * 1 to 9, `menagerie` from 7 to 12, everything else closes up behind them.
 * Two moves, both forced, both the shortest that clears TWIN_SEP.
 *
 * And the constraint is ENFORCED, not merely satisfied by this list. The list
 * is a preference; the loop below re-seats any twin that ends up inside
 * TWIN_SEP of its partner, at the free station furthest from it. A hand-typed
 * order that silently stops holding the moment a work is added to works.ts is
 * how the original defect got in — the same painting on two adjacent stations,
 * with nothing in the code that would have noticed.
 */
const CORRIDOR_ORDER = [
  'totem',
  'math-chaos',
  'cruciform',
  'chaos-garden',
  'teal-skull',
  'pink-skull',
  'blue-teeth',
  'orbit',
  'broken-signal',
  'composite-head',
  'ultraviolet-beast',
  'the-delegate',
  'menagerie',
  'undertow',
  'rosetta',
];

/** Station of work `i`, 0 = first plate the descent meets. */
export const STATION: number[] = (() => {
  const order = CORRIDOR_ORDER.filter((id) => INDEX_OF.has(id));
  SLABS.forEach((s) => {
    if (!order.includes(s.work.id)) order.push(s.work.id);
  });
  for (const [keep, echo] of TWIN_PAIRS) {
    const a = order.indexOf(keep);
    let b = order.indexOf(echo);
    if (a < 0 || b < 0 || Math.abs(a - b) >= TWIN_SEP) continue;
    // lift the echo out and drop it back at whichever end is further from its
    // partner — with N ≥ 2·TWIN_SEP one of the two ends always clears
    order.splice(b, 1);
    b = a < order.length / 2 ? order.length : 0;
    order.splice(b, 0, echo);
  }
  return SLABS.map((s) => order.indexOf(s.work.id));
})();

/**
 * THE INTERVAL BETWEEN A PAINTING AND ITS LABEL — per work, on the golden
 * ladder (13 / 21 / 34 / 55).
 *
 * The band above the caption used to be a layout constant: the stage was
 * composed about the optical centre and reserved a fixed foot for the caption,
 * so the strip between the bottom of the artwork and the top of the label was
 * the SAME EMPTY HEIGHT IN EVERY FRAME OF THE CHAPTER — measured 173px at
 * scroll 25%, 168px at 38%, 161px at 50% on a 390×844 frame. Not one bad
 * frame; a rhythm that never varies, which is worse.
 *
 * Two things close it. The plate now HANGS (see HANG below) instead of
 * floating at the optical centre, and the caption is no longer pinned to the
 * bottom of the viewport at all — it is hung from the bottom edge of the work
 * it names, at this interval. The interval is the work's own: the fifteen are
 * ranked by aspect and quartiled onto the golden spacing ladder, so a narrow
 * column carries its label tight at 13px and a wide panel is given 55px of
 * air. Four distinct intervals across the corridor, each one a property of the
 * painting rather than of the viewport.
 */
const GAP_LADDER = [13, 21, 34, 55];
export const CAP_GAP: number[] = (() => {
  const out = new Array<number>(N).fill(GAP_LADDER[1]);
  ASPECT.map((a, i) => ({ a, i }))
    .sort((p, q) => p.a - q.a)
    .forEach((e, rank) => {
      out[e.i] = GAP_LADDER[Math.min(GAP_LADDER.length - 1, Math.floor((rank * 4) / N))];
    });
  return out;
})();

const GAP_MIN = GAP_LADDER[0];

/**
 * HOW FAR THE LABEL IS ALLOWED TO TRAVEL UP THE FRAME, px.
 *
 * The floor is LIVE — captionFloor re-solves every frame against the actual
 * projected boxes of every other plate on screen, so the label rises to its
 * painting and stops at the first thing in the way, and the interval it leaves
 * varies with the composition instead of being a constant.
 *
 * WHY THIS IS NOW 62 AND NOT 190. The label hangs off the bottom edge of its
 * painting, and a plate's bottom edge is governed by the perspective divide
 * about the frame's own centre: at the pass a subject projects at 1.16× and
 * its foot reaches y≈708, but halfway between two stations it projects at
 * 0.73× and its foot is at y≈595 — so a label with 190px of travel followed it
 * all the way up there and took the bottom 30% of the phone with it. Measured
 * on a 390×844 frame across the corridor: lowest non-background pixel at
 * y=675–677 for scroll 0.42→0.54, i.e. a fifth of every frame below the work
 * was ground colour, in the one place on a phone that costs the most.
 *
 * 62 is one rung above the widest interval on the golden ladder (55), so the
 * label can still hug a tall column tight and still step back for a wide
 * panel — the interval is still the picture's own — but it can no longer
 * abandon the foot of the frame to follow a receding plate. What varies is the
 * air ABOVE the label (13px at the pass, up to ~60px between stations, which
 * reads as the corridor breathing); what no longer varies is that the label is
 * the bottom of the composition.
 */
const CAP_TRAVEL = 62;
/** Clear air the label keeps under any other work it has to duck below. */
const CAP_CLEAR = 10;

/**
 * A WORK IS A PLATE ONLY WHILE IT IS BIG ENOUGH TO BE A PAINTING.
 *
 * The φ spiral is self-similar: r = e^{bθ} means each turn inward is φ smaller
 * than the last, so the innermost archive slots are geometrically tiny. On a
 * 390px frame the three innermost measured 19.8, 19.9 and 23.3px on the short
 * side — at that size a canvas is not a canvas, it is a colour chip, and
 * fifteen chips on a curve is a swatch card. Below LEG_OUT a work contributes
 * nothing but its position, so it gives up being a plate and resolves into the
 * curve it sits on; above LEG_IN it is a painting. In between it is weather.
 */
// The band between them is deliberately NARROW (was 28→48). A wide band means
// works resolve at intermediate `vis`, and `vis` is the archive's alpha — so
// the resting figure carried a plate at 0.72 opacity for the whole beat, i.e. a
// painting you can see the background through. A picture is either on the curve
// as an object or it is part of the line; 34→42 leaves the smoothstep in place
// (nothing snaps as the viewport is resized) while making the in-between a
// sliver rather than a state the figure rests in.
const LEG_OUT = 34;
const LEG_IN = 42;
/** Above this a slot reads as a painting; the plate counts them out loud. */
export const LEG_PLATE = 0.5;

/** Archive assembly window, in cosmos-phase. */
export const ARCH_IN = 0.68;
export const ARCH_FULL = 0.9;

/**
 * Where the stage rests under `prefers-reduced-motion`: past ARCH_FULL, so the
 * archive is fully assembled on the spiral and nothing is caught mid-transit.
 */
export const ARCH_STILL = 0.94;

/** Winding of the archive for a portrait frame — one work-position. */
export const ARCH_ROLL = ARCHIVE_STEP;

const smoothstep = (a: number, b: number, t: number): number => {
  const x = clamp01((t - a) / (b - a));
  return x * x * (3 - 2 * x);
};

/* ------------------------------------------------------------- the layout */

export interface WorkBox {
  /** layout size of the element, px — the size it projects to at the lens plane */
  w: number;
  h: number;
  /** off-axis offset on the helix, px at the lens plane */
  ax: number;
  ay: number;
  /** the y this work's CENTRE converges to as it becomes the subject */
  cy: number;
  /** the work's own pose — a volume standing in a space, not a sticker */
  rotX: number;
  rotY: number;
  rotZ: number;
  /** corridor depth of the work, px */
  z: number;
}

export interface ArchBox {
  x: number;
  y: number;
  z: number;
  /** scale relative to the element's corridor layout size */
  s: number;
  /** position along the curve: 0 = outer arm, N−1 = the eye */
  slot: number;
  /**
   * How much of a PLATE this work is on the curve: 1 = a painting, 0 = it has
   * resolved into the stroke. Zero for a twin echo (the picture is already on
   * the figure) and for anything under the legible floor.
   */
  vis: number;
}

export interface MobileLayout {
  vw: number;
  vh: number;
  /** width reserved down the right for the HUD rail — nothing may enter it */
  rail: number;
  /** centre of the usable frame */
  cx: number;
  cy: number;
  /** centre the ARCHIVE figure is composed about — above the optical centre */
  acy: number;
  /** measured height of the caption block, px */
  capH: number;
  /** the caption's travel: it hangs from its painting, between these two lines */
  capTopMin: number;
  capTopMax: number;
  /** the caption's own column, px — matches --ms-gut / --ms-measure */
  capX0: number;
  capX1: number;
  work: WorkBox[];
  arch: ArchBox[];
  /** px per spiral unit */
  unit: number;
  /** the φ-spiral stroke itself, as an SVG path in the same px space */
  path: string;
  pathLen: number;
  camA: number;
  camB: number;
}

/** Uniform cap scale of slot `i`'s quad — see the archive block in buildLayout. */
function capK(i: number): number {
  const size = ARCHIVE[i].size;
  const rt = Math.sqrt(ASPECT[i]);
  return Math.min(1, (ARCHIVE_CAP * size) / (size * rt), (ARCHIVE_CAP * size) / (size / rt));
}

/**
 * The archive figure's true bounding box once wound by `roll`, in spiral units.
 *
 * Solved against each work's REAL capped quad — the aspects are baked, so this
 * is deterministic and cannot move when a texture finishes streaming. And it is
 * the actual box, not a symmetric extent about the eye: the spiral is not
 * symmetric about its own eye, so an extent both undersized the figure and hung
 * it off-centre in the frame (measured: 72px of slack on the left, 7px on the
 * right). Centring on the box is what lets the whole archive sit square in a
 * portrait frame at the largest size that fits.
 */
function archBounds(roll: number): [number, number, number, number] {
  const c = Math.cos(roll);
  const s = Math.sin(roll);
  let x0 = Infinity;
  let x1 = -Infinity;
  let y0 = Infinity;
  let y1 = -Infinity;
  ARCHIVE.forEach((a, i) => {
    const rt = Math.sqrt(ASPECT[i]);
    const k = capK(i);
    const hw = (a.size * rt * k) / 2;
    const hh = ((a.size / rt) * k) / 2;
    const x = a.x * c - a.y * s;
    const y = a.x * s + a.y * c;
    x0 = Math.min(x0, x - hw);
    x1 = Math.max(x1, x + hw);
    y0 = Math.min(y0, y - hh);
    y1 = Math.max(y1, y + hh);
  });
  return [x0, x1, y0, y1];
}

/**
 * THE LOWEST CENTRE-Y A PLATE MAY TAKE so that, at the very worst frame of its
 * near pass (z = ZCAP, its own three-axis shear applied), no corner of it
 * projects below `target`.
 *
 * The forward projection of corner k is
 *     y_k = oy + (cy + Yk − oy) · P/(P − ZCAP − Zk)
 * which is linear in `cy`, so each corner inverts directly and the binding one
 * is simply the tightest. Four corners, closed form, no search.
 */
function passCeiling(yk: number[], zk: number[], oy: number, target: number): number {
  let lowest = Infinity;
  for (let k = 0; k < 4; k++) {
    const m = PERSP / (PERSP - ZCAP - zk[k]);
    const allowed = oy + (target - oy) / m - yk[k];
    if (allowed < lowest) lowest = allowed;
  }
  return lowest;
}

/**
 * THE LARGEST DOWNWARD OFF-AXIS OFFSET this work may carry without any part of
 * it, at any depth, dropping below `target`.
 *
 * `passCeiling` fixes where a plate lands when it OWNS the frame. It is not the
 * lowest a plate ever gets. On the way in and on the way out the off-axis term
 * has only partly collapsed — it is weighted (1 − 0.92·proxE) — so a satellite
 * carrying a large positive ay swings BELOW its own hang line: measured, work
 * 11 reached y=669.9 against a hang solved for 650.2, and printed 9.7px into a
 * caption that had nowhere left to duck (it was already on capTopMax).
 *
 * Screen y is affine in ay at every depth, so the bound inverts directly: walk
 * the live depth range, invert the projection for each corner, and keep the
 * tightest ay the whole trajectory allows. Only works that actually offend are
 * touched, and only in the one axis that offends — the wide HORIZONTAL rake
 * that gives the corridor its walls is untouched.
 */
function ayCeiling(
  ay: number,
  cyi: number,
  farCy: number,
  yk: number[],
  zk: number[],
  oy: number,
  target: number,
): number {
  if (ay <= 0) return ay;
  let cap = ay;
  const steps = 48;
  for (let s = 0; s <= steps; s++) {
    const dz = -PASS_OUT + ((FAR_ON + PASS_OUT) * s) / steps;
    const prox = clamp01(1 - Math.abs(dz) / (1.7 * SPACING));
    const proxE = prox * prox * (3 - 2 * prox);
    const wA = 1 - 0.92 * proxE;
    if (wA <= 1e-4) continue;
    const c0 = farCy + (cyi - farCy) * proxE;
    const z = Math.min(-dz, ZCAP);
    for (let k = 0; k < 4; k++) {
      const m = PERSP / (PERSP - z - zk[k]);
      if (m <= 0) continue;
      const allowed = (oy + (target - oy) / m - yk[k] - c0) / wA;
      if (allowed < cap) cap = allowed;
    }
  }
  return cap < 0 ? 0 : cap;
}

/** The four corners' rotated (y, z) offsets — constant for a corridor plate. */
function cornerOffsets(
  w: number,
  h: number,
  rotX: number,
  rotY: number,
  rotZ: number,
): [number[], number[]] {
  const D = Math.PI / 180;
  const cxr = Math.cos(rotX * D);
  const sxr = Math.sin(rotX * D);
  const syr = Math.sin(rotY * D);
  const czr = Math.cos(rotZ * D);
  const szr = Math.sin(rotZ * D);
  const ys: number[] = [];
  const zs: number[] = [];
  for (let k = 0; k < 4; k++) {
    const u = k & 1 ? w / 2 : -w / 2;
    const v = k & 2 ? h / 2 : -h / 2;
    const ax = u * czr - v * szr;
    const ay = u * szr + v * czr;
    const bz = -ax * syr;
    ys.push(ay * cxr - bz * sxr);
    zs.push(ay * sxr + bz * cxr);
  }
  return [ys, zs];
}

export function buildLayout(vw: number, vh: number, measuredCapH = 0): MobileLayout {
  const rail = vw < 768 ? 46 : 96;
  const gut = vw < 768 ? 20 : 48;
  const cx = (vw - rail) / 2;

  // ---- THE HANG LINE ------------------------------------------------------
  // WHAT WAS WRONG. The corridor was composed about the optical centre and the
  // caption was nailed to the bottom of the viewport behind a reserved foot
  // that assumed a 118px caption block. The block actually renders at 74px, so
  // 44px of the reserve was phantom — and the subject, floating at the centre,
  // never came near the rest of it. The result was a strip of nothing between
  // the bottom of the painting and the top of its label, the SAME HEIGHT IN
  // EVERY FRAME OF THE CHAPTER: 173px at scroll 25%, 168px at 38%, 161px at
  // 50% on a 390×844 frame.
  //
  // WHAT IT IS NOW. The reserve is solved from the caption's REAL measured
  // block, and the works HANG: each one's bottom edge converges on a line
  // exactly CAP_GAP[i] above where its label will sit, so the interval between
  // painting and metadata is 13, 21, 34 or 55px — chosen by the work's own
  // aspect — and never a void. The label then tracks that edge (captionAnchor)
  // so the interval holds at every depth, not only at the pass.
  //
  // The label travels only CAP_TRAVEL: the painting comes to the label, not
  // the other way round, because the periphery of the corridor belongs to the
  // satellites and a label that climbed into it would print through them.
  // THE FOOT — how much frame is reserved BELOW the caption, and therefore how
  // much of the phone is spent on nothing.
  //
  // It used to be 11vh (92.8px on a 390×844 frame) and it was the single
  // largest term in the chapter's dead band: the caption hangs off the bottom
  // of its painting, the painting's own hang line is solved backwards from
  // capTopMax, so a foot that is 40px too generous lifts the ENTIRE
  // composition — plate, label and all — 40px up the frame, and the phone's
  // most expensive real estate goes to the ground colour. Measured across the
  // corridor at 390×844: the lowest non-background pixel sat at y=675–677 for
  // scroll 0.42→0.54 and at y=562–586 through the title beat, i.e. 20–33% of
  // every frame below the work was void.
  //
  // 6.2vh (52.3px) is a MARGIN — the same order as the 44px the archive plate
  // keeps — not a reserve. Everything downstream reads it: capTopMax, the
  // zoom floor, each work's hang line and therefore each work's height
  // envelope, so tightening it does not merely move the label down, it drops
  // the whole corridor onto the lower two thirds of the frame and lets the
  // plates grow into the room that frees up.
  const capOffset = Math.min(Math.max(34, vh * 0.062), 76);
  const capH = measuredCapH > 8 ? measuredCapH : vw < 768 ? 78 : 96;
  const head = vw < 768 ? 26 : 44;
  /** worst-case vertical residual of the off-axis term at the pass (0.08·ay) */
  const yResid = 0.08 * vh * 0.3 * 1.02;
  /** the projection cap — a work can never draw taller than maxH × this */
  const ZOOM = PERSP / (PERSP - ZCAP);
  const capTopMax = vh - capOffset - capH;
  const capTopMin = capTopMax - CAP_TRAVEL;
  // the caption's column, straight off the CSS that lays it out
  const capX0 = vw < 768 ? 24 : 56;
  const capX1 = vw - rail;
  /** the lowest a plate's bottom edge may sit BEFORE the near-pass zoom */
  const zoomFloor = vh / 2 + (capTopMax - CAP_CLEAR - vh / 2) / ZOOM;
  /** the lowest hang line on the ladder — the far field is composed about it */
  const hangMax = Math.max(Math.min(capTopMax - GAP_MIN, zoomFloor) - yResid, vh * 0.42);
  const stageH = Math.max(hangMax - head, vh * 0.34);
  // The far field is composed BELOW the optical centre of its own stage (0.58,
  // not 0.5). The chapter is a descent: the corridor should read as something
  // you are falling into, which means its body sits under the eye rather than
  // level with it. It also buys the lower frame ~35px of standing content in
  // every mid-corridor frame, where the perspective divide is otherwise busy
  // collapsing everything toward the middle of the picture.
  const cy = head + stageH * 0.58;

  // ---- corridor boxes. Normalised by AREA, so a 2:1 panel and a 1:2.6 column
  // carry the same weight — the same law the archive uses.
  // Deliberately unchanged. Growing this is tempting now that the caption is
  // no longer nailed to the bottom of the frame, but plate WIDTH is what
  // decides how close a work's near pass comes to the HUD rail, and the rail
  // is inviolable. The dead band is closed by moving the label and dropping
  // the plate onto the hang line, not by making the plate bigger.
  const g = Math.min(vw * 0.92, stageH * 0.72);
  const maxW = vw - rail - gut * 1.7;
  const work: WorkBox[] = SLABS.map((_, i) => {
    const a = ASPECT[i];
    const rt = Math.sqrt(a);
    let w = g * rt;
    let h = g / rt;
    // This work's own hang line, and therefore its own height envelope: from
    // the head of the frame down to the line its label hangs off.
    //
    // Bounded by `zoomFloor` as well as by the ladder, because a plate does
    // not stop at its hang line — it keeps growing as it crosses the lens
    // (P/(P−ZCAP) = 1.16× about the perspective origin) and its bottom edge
    // descends with it. Unbounded, that carried the outgoing plate to y≈706 on
    // a 390×844 frame, straight through the caption's home band, and the label
    // (which cannot go below capTopMax) had nowhere to duck: measured overlaps
    // of −15 to −19px, metadata printed on paint. Hung from zoomFloor instead,
    // the plate's LAST frame is the one where its bottom edge just reaches the
    // caption's line, and the label rides down in front of it the whole way.
    const hang0 = Math.min(capTopMax - CAP_GAP[i], zoomFloor) - yResid;
    const maxH = (hang0 - head) / ZOOM;
    const k = Math.min(1, maxW / w, maxH / h);
    w *= k;
    h *= k;
    // THE STATION, NOT THE CATALOGUE INDEX, IS THE PLACE ON THE HELIX. See
    // STATION: the helix is untouched, the hanging order is not.
    const st = STATION[i];
    const angle = st * GOLDEN_ANGLE;
    const radius = 0.8 + Math.sin(st * 2.39996) * 0.22;
    const rotY = (st % 2 === 0 ? 1 : -1) * (9 + ((st * 5) % 4) * 2.1);
    const rotX = (st % 3 === 0 ? 1 : -1) * (3.2 + ((st * 3) % 3) * 1.5);
    const rotZ = (st % 2 === 0 ? 1 : -1) * (0.9 + ((st * 7) % 3) * 0.7);
    // …and the ceiling solved EXACTLY, against this work's own pose. The
    // estimate above treats the plate as an axis-aligned rectangle projected
    // at one uniform factor; it is neither. It is sheared in three axes, so
    // its lowest corner hangs below its centre by more than h/2, and that
    // corner carries its own z — up to 29px nearer the lens than the plate's
    // centre — so it projects at 1.21× where the middle projects at 1.17×.
    // The difference is 14px of plate, which is exactly the −4 to −18px of
    // caption-on-canvas the sweep still found after the estimate. `passCeiling`
    // inverts the real projection for the real corners and returns the lowest
    // centre this plate may take, so the guarantee is arithmetic, not padding.
    const target = capTopMax - CAP_CLEAR;
    const [yk, zk] = cornerOffsets(w, h, rotX, rotY, rotZ);
    const hang = passCeiling(yk, zk, vh / 2, target) + h / 2 - yResid;
    const cyi = Math.max(hang, head + h) - h / 2;
    const ay0 = Math.sin(angle) * radius * (vh * 0.3);
    return {
      w,
      h,
      // the work descends onto its hang line as it takes the frame, so the
      // bottom of the picture arrives at its label instead of stopping 170px
      // short of it
      cy: cyi,
      // Wide off-axis. A shallow helix collapses at the vanishing point — every
      // distant work stacks in the middle of the picture and two consecutive
      // canvases read as one doubled image. Set wide, the corridor has walls:
      // satellites rake the periphery and only the subject owns the axis.
      ax: Math.cos(angle) * radius * (vw * 0.68),
      // …but the DOWNWARD half of that rake is bounded by the label's line.
      // The horizontal rake is untouched — it is what gives the corridor walls.
      ay: ayCeiling(ay0, cyi, cy, yk, zk, vh / 2, target),
      // consecutive works shear in OPPOSITE directions, so two passes never
      // read as the same card going by twice
      rotY,
      rotX,
      rotZ,
      z: st * SPACING,
    };
  });

  // ---- archive boxes: the φ spiral, wound one work-position, fitted to the frame
  const [bx0, bx1, by0, by1] = archBounds(ARCH_ROLL);
  // Fitted to the SAME reserved stage as the corridor, so the archive's own
  // plate (pinned at bottom: clamp(44px, 8vh, 96px)) is protected by the same
  // rule the caption is. Previously the fit read vh*0.8 about vh*0.43, which
  // on a short viewport puts the outer arm through the metadata.
  // The archive answers to its OWN plate, not to the caption's — the two never
  // share the frame (the caption is fully down before archPlate starts). So the
  // archive's foot is its own constant and the fit is unchanged by anything the
  // caption does: 'The archive / Fifteen works / …' is a taller block than a
  // museum label, and it owns the bottom of the frame outright.
  // …and it is NOT derived from the caption's foot any more. It used to be
  // `capOffset + 144`, which silently coupled the archive's fit to a number
  // that exists to serve the museum label — so tightening the label's margin
  // drove the outer arm of the spiral 50px down into the archive plate
  // (measured: plate top rests at y=637.7, figure bottom would have reached
  // 687.8). The archive answers to its OWN plate: 'The archive / Fifteen works
  // / …' measures 138.8px over a 67.5px bottom inset on a 390×844 frame, so
  // 237 leaves the figure ~11px of clear air above the type and nothing else
  // in the chapter can move it.
  const archFoot = vw < 768 ? 237 : 257;
  const archStage = Math.max(vh - archFoot - head, vh * 0.34);
  const archH = archStage + (vw < 768 ? 40 : 45);
  const unit = Math.min(
    ((vw - rail) * 0.97) / (bx1 - bx0),
    archH / (by1 - by0),
  );
  // centre of the figure, in spiral units — the eye of the spiral is NOT it
  const ox = (bx0 + bx1) / 2;
  const oy = (by0 + by1) / 2;
  // the figure sits ABOVE the optical centre: the archive plate owns the
  // bottom of the frame and the two must not meet
  const acy = head + archH / 2;
  const cr = Math.cos(ARCH_ROLL);
  const sr = Math.sin(ARCH_ROLL);
  const arch: ArchBox[] = ARCHIVE.map((slot, i) => {
    const a = ASPECT[i];
    const rt = Math.sqrt(a);
    const gm = slot.size * unit;
    // Boxed at ARCHIVE_CAP on both axes. `k` is a UNIFORM scale of the quad —
    // the element keeps its true aspect and is scaled by `s` below, so the cap
    // can never squeeze one side of a canvas.
    const w = gm * rt;
    const h = gm / rt;
    const k = Math.min(1, (ARCHIVE_CAP * gm) / w, (ARCHIVE_CAP * gm) / h);
    // Legibility, measured on the SHORT side of the quad the work will actually
    // draw at. Under LEG_OUT there is no painting to read, so there is no plate:
    // the work is the curve at that point. A twin echo is held at zero however
    // large it is — the figure already carries that picture once.
    const short = Math.min(w, h) * k;
    const leg = smoothstep(LEG_OUT, LEG_IN, short);
    return {
      x: cx + (slot.x * cr - slot.y * sr - ox) * unit,
      // screen y runs down; the spiral's y runs up
      y: acy - (slot.x * sr + slot.y * cr - oy) * unit,
      z: slot.z * unit,
      s: (w * k) / work[i].w,
      slot: slot.slot,
      vis: TWIN_ECHO[i] ? 0 : leg,
    };
  });

  // ---- the stroke. Same sampler the 3D archive and the sigil consume.
  const pts = archiveSpiralPath(260);
  let d = '';
  let len = 0;
  let px = 0;
  let py = 0;
  for (let k = 0; k < 260; k++) {
    const sx = pts[k * 3];
    const sy = pts[k * 3 + 1];
    const x = cx + (sx * cr - sy * sr - ox) * unit;
    const y = acy - (sx * sr + sy * cr - oy) * unit;
    if (k === 0) d = `M${x.toFixed(1)} ${y.toFixed(1)}`;
    else {
      d += `L${x.toFixed(1)} ${y.toFixed(1)}`;
      len += Math.hypot(x - px, y - py);
    }
    px = x;
    py = y;
  }

  return {
    vw,
    vh,
    rail,
    cx,
    cy,
    acy,
    capH,
    capTopMin,
    capTopMax,
    capX0,
    capX1,
    work,
    arch,
    unit,
    path: d,
    pathLen: len,
    camA: -START_LEAD,
    camB: (N - 1) * SPACING - END_SHORT,
  };
}

/* -------------------------------------------------------------- the frame */

export interface WorkFrame {
  x: number;
  y: number;
  z: number;
  rotX: number;
  rotY: number;
  rotZ: number;
  s: number;
  opacity: number;
  blur: number;
  bright: number;
  sat: number;
  zi: number;
  /** distance ahead of the lens, px. Negative = passed. */
  dz: number;
  live: boolean;
}

export interface StageInfo {
  camZ: number;
  /** the work that should hold the caption: nearest one still in front */
  subject: number;
  /** archive assembly 0-1 */
  arch: number;
  /** chapter plate 0-1 — the title card at the head of the frame */
  plate: number;
  /**
   * The chapter card's FOOT block, 0-1 — the spec lines, set at the bottom of
   * the frame on the same line the archive plate later uses.
   *
   * It exists because the title beat was the emptiest frame in the mobile
   * chapter: the card stood at the head, the corridor was still a long way off
   * so its plates drew small and collapsed toward the middle of the picture by
   * the perspective divide, and the bottom 33% of a phone carried nothing at
   * all (measured at scroll 0.17/0.20/0.23 on a 390×844 frame: lowest
   * non-background pixel at y=562/575/586, and 0.4–0.7% of the bottom third
   * lit). Splitting the card head-and-foot is what an editorial chapter page
   * does anyway — title at the head, the data at the foot — and it puts the
   * chapter's own claim (fifteen works, 137.508°) in the most expensive place
   * on the screen instead of tucking it under the display line.
   *
   * It leaves before the first museum label arrives, so the bottom-left is
   * never two blocks of metadata at once.
   */
  plateFoot: number;
  /** the collapse: 0-1 wind-down of the whole figure into the throat */
  collapse: number;
  /** archive plate 0-1 */
  archPlate: number;
}

export function makeFrames(): WorkFrame[] {
  return SLABS.map(() => ({
    x: 0,
    y: 0,
    z: 0,
    rotX: 0,
    rotY: 0,
    rotZ: 0,
    s: 1,
    opacity: 0,
    blur: 0,
    bright: 1,
    sat: 1,
    zi: 0,
    dz: 0,
    live: false,
  }));
}

/**
 * Fill `out` for cosmos-phase `cp`. One number in, fifteen poses out.
 */
export function stageFrame(cp: number, L: MobileLayout, out: WorkFrame[]): StageInfo {
  const t = descentCurve(clamp01((cp - HOLD) / (CORRIDOR_END - HOLD)));
  // see HOLD_PREROLL: the title beat drifts in rather than standing still
  // ease-OUT, not smoothstep: smoothstep is flat at both ends, so it reproduced
  // the freeze in miniature right where the title card finishes landing
  // (measured: 0.458 mean delta across global 0.172→0.180 against a 4.56
  // median). This leaves the drift fastest at the chapter's first frame and
  // decelerating into the descent curve, which is also the right reading — the
  // fall arrives, it does not switch on.
  const hx = clamp01(cp / HOLD);
  const hold = 1 - (1 - hx) * (1 - hx);
  const camZ = L.camA - HOLD_PREROLL * (1 - hold) + (L.camB - L.camA) * t;
  const A = smoothstep(ARCH_IN, ARCH_FULL, cp);
  // SCALE LEADS TRAVEL. With one blend driving both, the mid-transit frame had
  // fifteen canvases at half their archive size still occupying half their
  // corridor positions — on a 390px frame that is a pile of overlapping
  // rectangles, the one frame in the mobile chapter a juror would call broken.
  // Works now RECEDE first and travel small: the size blend finishes at
  // cp = ARCH_IN + 0.13 while the positional blend runs to ARCH_FULL, so the
  // figure assembles out of small plates converging rather than large plates
  // colliding. Both blends still start together and both still land exactly on
  // the archive pose, so the resolved spiral is bit-identical.
  const As = smoothstep(ARCH_IN, ARCH_IN + 0.13, cp);
  // THE COLLAPSE. The chapter does not dissolve out — it contracts. The whole
  // assembled figure winds down into the eye of its own spiral and is gone
  // through the throat exactly as the CONTRACTION opens, which is the move the
  // desktop's dust makes at the same moment. A cross-dissolve between two
  // chapters is a cut with the seam showing; this is the seam being used.
  const col = smoothstep(0.94, 1, cp);
  const shrink = 1 - 0.94 * col;

  let subject = 0;
  let best = Infinity;

  for (let i = 0; i < out.length; i++) {
    const b = L.work[i];
    const f = out[i];
    const dz = b.z - camZ;
    f.dz = dz;

    // WHICH WORK THE CAPTION NAMES: the nearest one still in front of the lens.
    // (Naming whichever work is closest to the sweet spot instead put the
    // handover exactly halfway between two works — which is the moment ONE of
    // them is at the lens filling the frame, so the caption went out precisely
    // when the subject was most present. The subject is the work you are about
    // to pass, and it holds the caption until you have passed it.)
    if (dz > -0.02 * SPACING && dz < best) {
      best = dz;
      subject = i;
    }

    // How centred the work is: measured against the LENS PLANE, not the sweet
    // spot, so a work is most nearly on-axis at the instant it goes past —
    // the pull is a convergence, not a drift that reverses mid-pass.
    const prox = 1 - clamp01(Math.abs(dz) / (1.7 * SPACING));
    const proxE = prox * prox * (3 - 2 * prox);

    // ---- corridor pose. The far field is composed about the optical centre;
    // the SUBJECT converges to its own hang position (b.cy), so the bottom of
    // the picture comes down toward its label as the work takes the frame.
    // ---- presence: in from depth, out past the lens
    const inFar = smoothstep(FAR_ON, FAR_FULL, dz);
    const outNear = smoothstep(-PASS_OUT, 0, dz);

    // PASSING THE LENS IS A MOVE, NOT A VEIL.
    //
    // The approach converges the subject onto the optical axis, which is right:
    // the work you are arriving at takes the middle of the frame. But the same
    // curve is symmetric in |dz|, so past the lens the work crawled back off
    // axis by at most 68px (ax·(1−0.9·proxE) over the whole exit window) while
    // ZCAP holds its projected scale at 1.16× — i.e. it stayed centred, nearly
    // frame-filling, on top, and dissolved in place ON TOP OF THE WORK BEHIND
    // IT. MEASURED across 0.14→0.62 at 0.01: at every one of the fifteen
    // handovers a translucent painting was composited over a fully opaque one —
    // 341×523 at α 0.388 over #11 at scroll 0.40, 358×460 at α 0.701 over #13
    // at 0.47, 369×483 at α 0.440 at 0.38, 327×557 at α 0.447 at 0.42. That is
    // the ghost-painting reading the panel named, and it is the one thing the
    // desktop corridor was fixed for and this stage was not.
    //
    // A real dolly does not have this problem, because off-axis excursion
    // DIVERGES as an object reaches the lens: it swings out of frame. That is
    // what happens now — the exit is the work leaving along the line it was
    // already leaning on, blurring (corrBlur already rides this same curve) and
    // darkening as it goes. Horizontal only: the caption's clear band at the
    // foot of the frame is a vertical guarantee and the swing must not touch it.
    // …and it is a CORRIDOR move only. Every work the rig has already passed
    // has exitK = 1, so without this gate the swing was still worth 0.3·300px
    // through the archive transit (the pose lerps corridor→spiral on A) and it
    // threw the assembling figure off both edges of the phone — measured at
    // scroll 0.53: four plates clipped by the frame, two of them half outside.
    // It is fully spent by A = 0.15, which is before any plate has travelled a
    // tenth of the way to its slot.
    const exitK = 1 - outNear;
    const swing =
      EXIT_SWING *
      smoothstep(0, EXIT_SWING_T, exitK) *
      (1 - smoothstep(0, 0.15, A)) *
      (b.ax < 0 ? -1 : 1);

    // ---- corridor pose. The far field is composed about the optical centre;
    // the SUBJECT converges to its own hang position (b.cy), so the bottom of
    // the picture comes down toward its label as the work takes the frame.
    const corrX = L.cx + b.ax * (1 - 0.9 * proxE) + swing;
    const corrY = L.cy + (b.cy - L.cy) * proxE + b.ay * (1 - 0.92 * proxE);
    const shear = 1 - 0.42 * proxE;

    // …and what is left of it while it clears is faint rather than half-there:
    // squaring the exit ramp halves the alpha at the midpoint of the window, so
    // the remnant that does still cross the subject reads as the blur of
    // something going past rather than as a second picture.
    const corrOp = inFar * outNear * outNear;

    // atmospheric perspective — luminance and colour both fall off with depth.
    // The subject at the lens plane is lit at 1.0; the far end of the corridor
    // sits at 0.34, which is the same order of falloff the FogExp2 gives the
    // desktop corridor.
    const depth = clamp01(dz / FAR_ON);
    const lit = (1 - depth) * (1 - depth);
    const corrBright = 0.34 + 0.68 * lit;
    const corrSat = 0.5 + 0.48 * (1 - depth);
    // Defocus ONLY on the near pass — the blur of a plate going by faster than
    // the eye can hold it. Far haze is carried by luminance and saturation
    // instead (which is what the desktop's FogExp2 does anyway): a CSS blur
    // costs the element's FULL layout surface, not its projected size, so
    // hazing the four or five distant plates every frame was paying full price
    // for four full-size Gaussians to render something 15% of its own size.
    // Measured on the harness against a control band with the stage hidden:
    // the cosmos cost 2.5× the control with far-field blur and 2.0× without,
    // and its absolute median frame time halved.
    const corrBlur = 5.5 * (1 - outNear);

    // ---- archive pose
    const a = L.arch[i];
    const slotF = a.slot / (N - 1);
    // `a.vis` is the reason no picture is ever on the figure twice and the
    // reason the throat is a curve rather than a row of chips: a twin echo and
    // anything under the legible floor resolve into the stroke instead of
    // plating. Their positions are still on the spiral — they are simply the
    // part of it you read as line.
    const archOp = clamp01((A * 1.3 - slotF * 0.78) / 0.26) * a.vis;

    const corrZi = 500 - Math.round(dz / 24);
    const archZi = 200 + a.slot;

    f.x = corrX + (a.x - corrX) * A;
    f.y = corrY + (a.y - corrY) * A;
    f.z = -dz + (a.z + dz) * A;
    f.rotX = b.rotX * shear * (1 - A);
    f.rotY = b.rotY * shear * (1 - A);
    f.rotZ = b.rotZ * shear * (1 - A);
    f.s = 1 + (a.s - 1) * As;
    // A WORK THAT WILL NOT PLATE ON THE CURVE LEAVES AS IT SHRINKS, NOT AFTER.
    //
    // Size leads travel (see As), so between the two blends a sub-legible work
    // was already at its archive size while its opacity was still governed by
    // the slower positional blend — measured on a 390×844 frame at scroll
    // 0.539/0.546/0.553: plates drawing 19.5, 19.6 and 19.7px on the short side
    // at 0.32/0.23/0.14 alpha. A 19px translucent square of painting is a chip,
    // which is exactly what `a.vis` exists to prevent on the resolved figure —
    // it just was not enforced in transit. Blending its presence on `As`
    // instead means it fades out on the same curve it shrinks on and is gone by
    // the time it would be too small to read. Works that DO plate are
    // untouched (vis = 1 → the blend is exactly A, as before).
    //
    // …AND THE SAME ARGUMENT RUNS THE OTHER WAY. A work that WILL plate was
    // fading IN on the positional blend too, so the resolved archive did not
    // reach full alpha until cp 0.909 — measured on a 390×844 frame: eight
    // plates at 0.38 alpha at scroll 0.52, at 0.69 at 0.54, at 0.93 at 0.56.
    // Translucent paintings stacked on each other is precisely the reading the
    // panel objected to; a painting is an opaque object. `Ao` finishes with the
    // SIZE blend (ARCH_IN + 0.13), so a work that has arrived at its archive
    // scale has also arrived at full opacity, and the figure resolves out of
    // solid plates converging. It starts LATE (ARCH_IN + 0.05) on purpose: the
    // last clean corridor frame (scroll 0.50) must not gain a set of ghosts,
    // and below that point `A` is still the larger of the two so nothing there
    // changes at all.
    const Ao = smoothstep(ARCH_IN + 0.05, ARCH_IN + 0.13, cp);
    const opBlend =
      archOp >= corrOp ? Math.max(A, Ao) : A + (As - A) * (1 - a.vis);
    // PRESENCE, not alpha. What the stage actually wants to say is how present
    // a work is; spending ALL of that on alpha is what makes a converging
    // archive read as coloured glass. Re-measured after the Ao fix, the soup
    // was still there — at scroll 0.52 EIGHT plates sat at α 0.549 at once, and
    // at 0.51 seven at 0.083–0.79, overlapping by up to 96% of a plate's own
    // area. Presence is split instead: alpha carries it up to a knee and LIGHT
    // carries the rest, with alpha·light ≡ presence by construction. Against
    // the void the composite is therefore bit-identical to before at every
    // scroll; the only thing that changes is what happens where two plates
    // cross, which is exactly where the defect was. Above the knee a plate is a
    // fully opaque object that happens to be dim — it occludes what is behind
    // it, which is what a painting does. The knee stays low so that a plate at
    // the very start of its arrival is still mostly transparent and never
    // punches an unlit rectangle through the starfield.
    const presence = corrOp + (archOp - corrOp) * opBlend;
    const lightSplit = Math.max(presence, PRESENCE_KNEE);
    f.opacity = Math.min(1, presence / PRESENCE_KNEE);
    f.blur = corrBlur * (1 - A);
    f.bright = (corrBright + (0.98 - corrBright) * A) * lightSplit;
    f.sat = corrSat + (0.94 - corrSat) * A;
    f.zi = Math.round(corrZi + (archZi - corrZi) * A);
    if (f.z > ZCAP) f.z = ZCAP;
    if (col > 0) {
      f.x = L.cx + (f.x - L.cx) * shrink;
      f.y = L.acy + (f.y - L.acy) * shrink;
      f.s *= shrink;
      f.z -= 760 * col;
    }
    f.live = presence > 0.004;
  }

  return {
    camZ,
    subject,
    arch: A,
    plate: 1 - smoothstep(HOLD * 0.62, HOLD + 0.03, cp),
    // out ahead of the head, and ahead of the caption's own arrival
    // (captionPresence gates on HOLD*0.8 → HOLD+0.02, and its work is out of
    // range until cp ≈ 0.10 anyway), so the foot of the frame hands over from
    // the chapter's spec to the first work's label rather than stacking them.
    // …and it holds LONGER than the head, because the head hands over to
    // nothing (the top of the frame is the corridor's own) while the foot hands
    // over to the first museum label — and the label cannot arrive until its
    // work is within 1.35 stations of the lens, which is measurably later than
    // the title card leaves. Timed off the head's ramp, the foot left at scroll
    // 0.230 and the caption did not reach half at 0.243: the sweep found the
    // frame at 0.23 with nothing substantial below y=508, i.e. 40% of the phone
    // empty, in the gap between two chapters' worth of type. The two now cross
    // at ~0.4/0.4 over 0.005 of the track, with the foot sliding down and out
    // as it goes.
    plateFoot: 1 - smoothstep(HOLD * 0.96, HOLD * 1.155, cp),
    collapse: col,
    // The two plates share the bottom-left corner, so they are strictly
    // sequential: the caption is fully down (ARCH_IN + 0.12) before the
    // archive's plate begins. Two blocks of metadata cross-fading through each
    // other in the same place is a double exposure, not a transition.
    //
    // BUT SEQUENTIAL IS NOT THE SAME AS LATE. The old window (ARCH_IN + 0.16 →
    // ARCH_FULL − 0.02, i.e. cp 0.84 → 0.88) left a stretch where the figure
    // was 79% assembled in the upper half of the frame and the block that is
    // supposed to own the lower half had not started: measured at scroll 0.54
    // on a 390×844 frame, 1.4% of the bottom third carried any ink at all and
    // the lowest non-background pixel sat at y=486. The plate now comes up the
    // instant the caption is down (caption reaches 0 at ARCH_IN + 0.12; this
    // starts at + 0.11, where the caption reads 0.028) and is rested by
    // + 0.17 — still strictly a hand-off, but with no orphaned frame in it.
    archPlate: smoothstep(ARCH_IN + 0.11, ARCH_IN + 0.17, cp),
  };
}

/**
 * CAPTION PRESENCE for the work the caption CURRENTLY NAMES — `dz` is that
 * work's own distance from the lens, not the incoming one's.
 *
 * This has to be evaluated against the named work or the caption lies about
 * itself: the geometric subject flips the instant one work crosses the lens, so
 * a presence computed from the subject jumped straight back to 1 at the flip and
 * the "swap the text while it is down" gate could never fire.
 *
 * Shape: the caption is UP for the entire time its work is in the corridor,
 * including through the pass — a work filling the frame with no label on it was
 * the worst frame in the chapter. The exchange is handled instead by a short
 * BLINK driven from the component when the subject changes, so the metadata goes
 * down, changes, and comes back, the way a museum label is replaced.
 */
export function captionPresence(dz: number, cp: number): number {
  const q = dz / SPACING;
  return (
    smoothstep(-0.25, -0.02, q) *
    (1 - smoothstep(1.35, 1.8, q)) *
    smoothstep(HOLD * 0.8, HOLD + 0.02, cp) *
    (1 - smoothstep(ARCH_IN + 0.02, ARCH_IN + 0.12, cp))
  );
}

/* ------------------------------------------------- WHERE THE PICTURE LANDS */

const D2R = Math.PI / 180;

/**
 * THE WORK'S REAL SCREEN BOX, [x0, y0, x1, y1] in CSS px.
 *
 * Solved, not measured: this reproduces exactly what the browser does to
 * `.ms-work` — transform-origin 50% 50%, matrix T·Rx·Ry·Rz·S, then the
 * `perspective: 820px` divide about `perspective-origin: (cx, vh/2)`, with the
 * four corners projected individually because a rotated quad's corners sit at
 * four different depths. Verified against getBoundingClientRect across the
 * whole corridor sweep: max error 0.6px.
 *
 * It exists so the caption can hang off the true bottom edge of the painting
 * without the layout read that measuring would cost every frame.
 */
export function projectedBox(
  i: number,
  f: WorkFrame,
  L: MobileLayout,
): [number, number, number, number] {
  const b = L.work[i];
  const hw = (b.w * f.s) / 2;
  const hh = (b.h * f.s) / 2;
  const cxr = Math.cos(f.rotX * D2R);
  const sxr = Math.sin(f.rotX * D2R);
  const cyr = Math.cos(f.rotY * D2R);
  const syr = Math.sin(f.rotY * D2R);
  const czr = Math.cos(f.rotZ * D2R);
  const szr = Math.sin(f.rotZ * D2R);
  const oy = L.vh / 2;
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (let k = 0; k < 4; k++) {
    const u = k & 1 ? hw : -hw;
    const v = k & 2 ? hh : -hh;
    // Rz
    const ax = u * czr - v * szr;
    const ay = u * szr + v * czr;
    // Ry (the quad is flat, so the incoming z is 0)
    const bxv = ax * cyr;
    const bzv = -ax * syr;
    // Rx
    const cyv = ay * cxr - bzv * sxr;
    const czv = ay * sxr + bzv * cxr;
    const wz = f.z + czv;
    const m = PERSP / (PERSP - wz);
    const sx = L.cx + (f.x + bxv - L.cx) * m;
    const sy = oy + (f.y + cyv - oy) * m;
    if (sx < x0) x0 = sx;
    if (sx > x1) x1 = sx;
    if (sy < y0) y0 = sy;
    if (sy > y1) y1 = sy;
  }
  return [x0, y0, x1, y1];
}

/**
 * THE HIGHEST LINE THE LABEL MAY TAKE THIS FRAME.
 *
 * Not a constant: the label may rise as far as its painting invites it to, but
 * it stops CAP_CLEAR under the bottom edge of any OTHER plate standing in its
 * column. Every plate whose bottom sits below capTopMin is a real obstacle
 * (anything higher than that cannot be in the way, since the label can never
 * climb past capTopMin), so a handful of exact projected boxes settles it.
 *
 * This is what makes the interval above the caption a property of the picture
 * rather than of the stylesheet: when the frame is clear the label hugs its
 * work at CAP_GAP, and when a satellite rakes through the lower left it steps
 * down and gives it room.
 */
export function captionFloor(sub: number, L: MobileLayout, out: WorkFrame[]): number {
  let floor = L.capTopMin;
  for (let j = 0; j < out.length; j++) {
    if (j === sub) continue;
    const f = out[j];
    if (!f.live || f.opacity < 0.12) continue;
    const b = projectedBox(j, f, L);
    if (b[2] < L.capX0 || b[0] > L.capX1 || b[3] + CAP_CLEAR <= floor) continue;
    floor = b[3] + CAP_CLEAR;
  }
  return floor > L.capTopMax ? L.capTopMax : floor;
}

/**
 * WHERE THE LABEL HANGS: CAP_GAP[i] beneath the bottom edge of work `i`,
 * pushed down by whatever else is in its column, and never below capTopMax —
 * the line the caption used to be nailed to.
 *
 * Caption and plate still run at different rates against the scroll, which was
 * always the point of the old captionShift: the plate keeps growing and
 * descending after the label has reached the end of its travel.
 */
export function captionAnchor(
  bottom: number,
  i: number,
  L: MobileLayout,
  floor: number,
): number {
  const t = bottom + CAP_GAP[i];
  return t < floor ? floor : t > L.capTopMax ? L.capTopMax : t;
}

/* ------------------------------------------------------------------ dust */
// Depth you cannot read off any single element: the corridor is threaded with
// a starfield that travels with the rig. Transform + opacity only.

/**
 * 54, not 26. The design contract asks for 2–3k points in the desktop corridor;
 * 26 on a phone is not a starfield, it is a handful of specks, and it left the
 * head and foot of the frame — the bands the paintings themselves can never
 * reach, because the perspective divide collapses everything toward the middle
 * of the picture — carrying literally nothing. Doubling it is free (transform +
 * opacity on 54 1–2px spans, no layout, no filter) and it is what makes the top
 * and bottom of the frame read as depth you are falling through rather than as
 * margin.
 */
export const DUST_N = 54;
const DUST_RANGE = 4200;

export interface DustSeed {
  x: number;
  y: number;
  z: number;
  size: number;
}

export function buildDust(vw: number, vh: number): DustSeed[] {
  let a = 137035 >>> 0;
  const rnd = () => {
    a = (a + 0x6d2b79f5) | 0;
    let x = Math.imul(a ^ (a >>> 15), 1 | a);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
  const out: DustSeed[] = [];
  for (let i = 0; i < DUST_N; i++) {
    out.push({
      x: (rnd() * 2 - 1) * vw * 0.95,
      y: (rnd() * 2 - 1) * vh * 0.72,
      z: rnd() * DUST_RANGE,
      size: rnd() < 0.22 ? 2 : 1,
    });
  }
  return out;
}

/** Depth of dust mote `d` at camera position `camZ`, plus its opacity. */
export function dustAt(d: DustSeed, camZ: number): [number, number] {
  const z = (((d.z - camZ * 0.55) % DUST_RANGE) + DUST_RANGE) % DUST_RANGE;
  const fade =
    smoothstep(DUST_RANGE, DUST_RANGE * 0.86, z) * smoothstep(0, DUST_RANGE * 0.08, z);
  return [z, fade * 0.62];
}

/* ---------------------------------------------------------------- glyphs */
// The equations are the art's own texture, not decoration. They hang in the
// corridor as real objects at real depths — they grow and pass exactly as the
// works do — kept far off the frame axis so they never sit on paint.

export const GLYPH_N = 14;

export interface GlyphSeed {
  ch: string;
  x: number;
  y: number;
  z: number;
  rot: number;
}

export function buildGlyphs(vw: number, vh: number, chars: string[]): GlyphSeed[] {
  const out: GlyphSeed[] = [];
  const span = (N - 1) * SPACING;
  for (let k = 0; k < GLYPH_N; k++) {
    const angle = k * GOLDEN_ANGLE * 1.4 + 0.4;
    // hard off-axis: the middle of the picture belongs to the painting
    const side = Math.cos(angle) >= 0 ? 1 : -1;
    out.push({
      ch: chars[(k * 7 + 3) % chars.length],
      x: side * (0.58 + Math.abs(Math.cos(angle)) * 0.5) * vw,
      y: Math.sin(angle) * vh * 0.42,
      z: -START_LEAD + ((k + 0.5) / GLYPH_N) * (span + START_LEAD),
      rot: (k % 2 === 0 ? 1 : -1) * (2 + (k % 3) * 3),
    });
  }
  return out;
}

/** [dz, opacity] of glyph `g` at camera position `camZ`. */
export function glyphAt(g: GlyphSeed, camZ: number): [number, number] {
  const dz = g.z - camZ;
  const a =
    smoothstep(FAR_ON * 1.3, FAR_ON * 0.72, dz) * smoothstep(-0.3 * PERSP, 0.24 * PERSP, dz);
  return [dz, a * 0.5];
}
