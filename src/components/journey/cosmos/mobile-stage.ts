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
//              b = ln φ / π), same golden-angle deal. Nothing is re-invented
//              and nothing is dropped: the phone shows 15 of 15.
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

/** Archive assembly window, in cosmos-phase. */
export const ARCH_IN = 0.68;
export const ARCH_FULL = 0.9;

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

export function buildLayout(vw: number, vh: number): MobileLayout {
  const rail = vw < 768 ? 46 : 96;
  const gut = vw < 768 ? 20 : 48;
  const cx = (vw - rail) / 2;

  // ---- THE CAPTION BAND IS RESERVED, LIKE THE RAIL ------------------------
  // The corridor used to be composed about the optical centre (vh*0.5) and
  // sized to vh*0.58, which the near-pass projection then blows up by as much
  // as P/(P−ZCAP) = 1.16×. Measured on a 390×844 frame: the subject filled
  // y 178→728 while the caption block sat at y 667→741 — 61 px × 319 px of
  // curator-grade metadata printed straight onto a fluorescent painting, at
  // 24 of 56 corridor samples. The rail is treated as inviolable; the caption
  // has exactly the same claim, so it gets the same treatment.
  //
  // `foot` is the caption's own footprint solved from the CSS that pins it
  // (bottom: clamp(56px, 11vh, 120px)) plus the tallest block it can be (rule,
  // title row, two metadata lines) plus the travel captionShift gives it. The
  // corridor is then composed about the centre of what is LEFT, and sized so
  // that even the largest work at the projection cap, thrown to its extreme
  // off-axis residual, still lands inside it. The result is the layout the
  // caption was always describing: plate above, label beneath it, neither
  // touching. It also fixes the far field — an off-axis work at the back used
  // to sit as low as y=680.
  const capOffset = Math.min(Math.max(56, vh * 0.11), 120);
  const capBlock = vw < 768 ? 118 : 132;
  const capTravel = 26;
  const foot = capOffset + capBlock + capTravel;
  const head = vw < 768 ? 26 : 44;
  const stageH = Math.max(vh - foot - head, vh * 0.34);
  const cy = head + stageH / 2;
  /** worst-case vertical residual of the off-axis term at the pass (0.08·ay) */
  const yResid = 0.08 * vh * 0.3 * 1.02;
  /** the projection cap — a work can never draw taller than maxH × this */
  const ZOOM = PERSP / (PERSP - ZCAP);

  // ---- corridor boxes. Normalised by AREA, so a 2:1 panel and a 1:2.6 column
  // carry the same weight — the same law the archive uses.
  const g = Math.min(vw * 0.92, stageH * 0.72);
  const maxW = vw - rail - gut * 1.7;
  const maxH = Math.max(stageH - 2 * yResid, stageH * 0.6) / ZOOM;
  const work: WorkBox[] = SLABS.map((_, i) => {
    const a = ASPECT[i];
    const rt = Math.sqrt(a);
    let w = g * rt;
    let h = g / rt;
    const k = Math.min(1, maxW / w, maxH / h);
    w *= k;
    h *= k;
    const angle = i * GOLDEN_ANGLE;
    const radius = 0.8 + Math.sin(i * 2.39996) * 0.22;
    return {
      w,
      h,
      // Wide off-axis. A shallow helix collapses at the vanishing point — every
      // distant work stacks in the middle of the picture and two consecutive
      // canvases read as one doubled image. Set wide, the corridor has walls:
      // satellites rake the periphery and only the subject owns the axis.
      ax: Math.cos(angle) * radius * (vw * 0.68),
      ay: Math.sin(angle) * radius * (vh * 0.3),
      // consecutive works shear in OPPOSITE directions, so two passes never
      // read as the same card going by twice
      rotY: (i % 2 === 0 ? 1 : -1) * (9 + ((i * 5) % 4) * 2.1),
      rotX: (i % 3 === 0 ? 1 : -1) * (3.2 + ((i * 3) % 3) * 1.5),
      rotZ: (i % 2 === 0 ? 1 : -1) * (0.9 + ((i * 7) % 3) * 0.7),
      z: i * SPACING,
    };
  });

  // ---- archive boxes: the φ spiral, wound one work-position, fitted to the frame
  const [bx0, bx1, by0, by1] = archBounds(ARCH_ROLL);
  // Fitted to the SAME reserved stage as the corridor, so the archive's own
  // plate (pinned at bottom: clamp(44px, 8vh, 96px)) is protected by the same
  // rule the caption is. Previously the fit read vh*0.8 about vh*0.43, which
  // on a short viewport puts the outer arm through the metadata.
  const archH = stageH + capBlock * 0.34;
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
    return {
      x: cx + (slot.x * cr - slot.y * sr - ox) * unit,
      // screen y runs down; the spiral's y runs up
      y: acy - (slot.x * sr + slot.y * cr - oy) * unit,
      z: slot.z * unit,
      s: (w * k) / work[i].w,
      slot: slot.slot,
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
  /** chapter plate 0-1 */
  plate: number;
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

    // ---- corridor pose
    const corrX = L.cx + b.ax * (1 - 0.9 * proxE);
    const corrY = L.cy + b.ay * (1 - 0.92 * proxE);
    const shear = 1 - 0.42 * proxE;

    // ---- presence: in from depth, out past the lens
    const inFar = smoothstep(FAR_ON, FAR_FULL, dz);
    const outNear = smoothstep(-PASS_OUT, 0, dz);
    const corrOp = inFar * outNear;

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
    const archOp = clamp01((A * 1.3 - slotF * 0.78) / 0.26);

    const corrZi = 500 - Math.round(dz / 24);
    const archZi = 200 + a.slot;

    f.x = corrX + (a.x - corrX) * A;
    f.y = corrY + (a.y - corrY) * A;
    f.z = -dz + (a.z + dz) * A;
    f.rotX = b.rotX * shear * (1 - A);
    f.rotY = b.rotY * shear * (1 - A);
    f.rotZ = b.rotZ * shear * (1 - A);
    f.s = 1 + (a.s - 1) * As;
    f.opacity = corrOp + (archOp - corrOp) * A;
    f.blur = corrBlur * (1 - A);
    f.bright = corrBright + (0.98 - corrBright) * A;
    f.sat = corrSat + (0.94 - corrSat) * A;
    f.zi = Math.round(corrZi + (archZi - corrZi) * A);
    if (f.z > ZCAP) f.z = ZCAP;
    if (col > 0) {
      f.x = L.cx + (f.x - L.cx) * shrink;
      f.y = L.acy + (f.y - L.acy) * shrink;
      f.s *= shrink;
      f.z -= 760 * col;
    }
    f.live = f.opacity > 0.004;
  }

  return {
    camZ,
    subject,
    arch: A,
    plate: 1 - smoothstep(HOLD * 0.62, HOLD + 0.03, cp),
    collapse: col,
    // The two plates share the bottom-left corner, so they are strictly
    // sequential: the caption is fully down (ARCH_IN + 0.12) before the
    // archive's plate begins. Two blocks of metadata cross-fading through each
    // other in the same place is a double exposure, not a transition.
    archPlate: smoothstep(ARCH_IN + 0.16, ARCH_FULL - 0.02, cp),
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

/** The caption's own rate against the scroll: it and its plate separate on
 *  approach and re-converge as the work reaches the lens plane. */
export function captionShift(dz: number): number {
  return (dz / SPACING - 0.5) * 30;
}

/* ------------------------------------------------------------------ dust */
// Depth you cannot read off any single element: the corridor is threaded with
// a starfield that travels with the rig. Transform + opacity only.

export const DUST_N = 26;
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
