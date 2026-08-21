'use client';

// cosmos/Slabs.tsx — OWNED BY COSMOS agent.
// 15 paintings as textured slabs on the golden-angle helix.
//
// STAGING (the point of this file): exactly one slab per beat is THE subject,
// and the CHAPTER CUTS BETWEEN THREE SHOT TYPES (see shotMix in cosmos-data):
//
//   WIDE      the establishing constellation. The nearest slab surrenders most
//             of its off-axis offset, is fitted from its real texture aspect
//             against the live frustum to fill ~60-76% of the viewport, and
//             carries the red edge glow. Everything else is staged DOWN.
//   MACRO     the subject is scaled until it bleeds past three viewport edges
//             (top, bottom, left) — you read brushwork and canvas weave, not
//             composition. Satellites are gone; a clear right column is left
//             for the caption.
//   PULL-BACK every work in the body flies onto one φ SPIRAL 14 units ahead of
//             the camera: angle from the golden angle, radius from r = e^(bθ)
//             with b = ln φ / π, scale falling off with radius. It is the same
//             curve — same b, same phase — that the CONTRACTION draws fifteen
//             scroll-percent later, so the two beats are one system.
//
// Each slab projects its art quad to a screen rect every frame into
// cosmosShared.slabRects — that table is what the occlusion-aware label system
// in Labels.tsx tests against, so captions can never touch a painting, and it
// is also what keeps satellites off tangent with the staged hero.

import { Suspense, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { useJourney } from '../JourneyContext';
import { phaseProgress, texPath } from '../journey-utils';
import { cosmosShared, easeInOut, ensureSlabRects, smoothstep } from './shared';
import { addFormBounds, publishFormRect, stage as stageState } from './stage-state';
import {
  SLABS,
  SIGIL_Z,
  HERO_PULL_X,
  HERO_PULL_Y,
  ARCHIVE,
  ARCHIVE_UNIT,
  ARCHIVE_STEP,
  ARCHIVE_THETA_MAX,
  archiveSpiralPoint,
  PHI_SPIRAL_B,
  PHI_SPIRAL_PHASE,
  VANTAGE_IN,
  VANTAGE_OUT,
  formationPlane,
  planeToWorld,
  shotMix,
  type ShotMix,
  type SlabPlacement,
} from './cosmos-data';
import { claimPlate, getDustSprite, getGlowTexture, matCropFor } from './textures';
import { NearPass } from './NearPass';
import { FormationPlate } from './FormationPlate';

/* ============================================================ THE ARCHIVE,
 * COMPOSED.
 *
 * The φ layout is the strength here and none of it moves: same b = ln φ / π,
 * same phase, same one-third-golden-angle step, same slots, same works. What
 * changes is that the FIGURE is composed in the frame instead of being left
 * wherever the algorithm's origin happened to put it, and that its scale law is
 * solved IN SCREEN SPACE:
 *
 *   CENTRED   The eye of the spiral is not the centre of its own mass, so
 *             hanging the eye on the camera axis put the whole cluster right of
 *             the optical centre and left a dead left third. The figure is
 *             offset by its own bounding centre; the eye sits where the
 *             composition wants it rather than where the maths starts.
 *   FILLED    Centring frees the frame it was wasting, so the figure is scaled
 *             back up into the space that recovers (FIGURE.k, solved, not chosen).
 *   MONOTONE  THE ONE THAT WAS WRONG. Size used to be normalised by AREA and
 *             then boxed at 1.16× on each axis, so a work's HEIGHT — the thing
 *             the eye actually reads — carried a 1/√aspect factor and a clamp.
 *             MEASURED at 54%, projected heights by slot were
 *               260 113 198 175 153 137 123 104 92 84 74 69 61 52 49
 *             i.e. slot 1 (a 2:1 panel) came out less than half of slot 0 and
 *             smaller than slots 2–5 that stand FURTHER IN. A logarithmic
 *             spiral only reads as receding if the ratio is exact, so the law
 *             is now stated on the quantity that is read:
 *
 *                 world height  =  ARCH_SIZE · r^ARCH_FALLOFF
 *
 *             — no aspect term, no cap. Projected height is that over the
 *             distance, and the funnel puts the small radii FURTHER away, so
 *             projected height is strictly decreasing in slot by construction.
 *             Each work keeps its true aspect; only its height is governed.
 *   CLEARED   Height normalisation makes a 2:1 panel twice as wide as a
 *             portrait of the same height, so the chamber budget is re-solved
 *             against the real texture aspects (registered as textures land,
 *             see solveFigure) rather than against a box. ARCH_SIZE = 0.47 is
 *             inside the zero-overlap bound of 0.507 for f = 0.86.
 *
 * And the throat is honest about what it is: the last works are not shrunk
 * chips pretending to be legible, they are ATMOSPHERE — dimmed and desaturated
 * on the same curve that shrinks them, winding into the dark the sigil then
 * strikes out of.
 */

/** Radius→size exponent. */
const ARCH_FALLOFF = 0.86;
/**
 * GEOMETRIC-MEAN size √(w·h) of the OUTERMOST work, in spiral units, before
 * FIGURE.k.
 *
 * This governs √(w·h), NOT the height. Governing the height let the WIDTH ride
 * free on the texture aspect, and the mounted aspects across the fifteen run
 * 0.375 to 1.997 — so the law the figure is named for did not survive contact
 * with the catalogue. MEASURED off the running frame at 53% scroll, square-on,
 * heights were perfectly monotone (220…41px) while the plates a juror actually
 * sees were not: slot 1 read √(w·h)=268px against the outer arm's 178px (a 2:1
 * canvas, 379px wide — the largest object in a figure whose whole argument is
 * that size falls with radius), and slot 9 collapsed to 43px, smaller than the
 * four works inside it. Three strict-monotonicity violations at every frame of
 * the square-on archive.
 *
 * Under √(w·h) governance the projected size is aspect-free by construction and
 * strict monotonicity is guaranteed, while each plate keeps its TRUE aspect —
 * nothing is cropped, stretched or re-framed; only the scale each plate is
 * hung at changes.
 *
 * 0.42 (from 0.47) because tall works grow under the new law: re-solved, it
 * reproduces the old figure's tightest chamber clearance — 4.0px between slots
 * 13 and 14, against 4.1px before — and FIGURE.k takes the outer arm to 183px,
 * slightly LARGER than the 172px it had.
 */
const ARCH_SIZE = 0.42;
/** Aspect assumed for a work whose texture has not landed yet. */
const ARCH_ASPECT_FALLBACK = 0.75;
/**
 * NO NODE MAY BREAK THE RAMP.
 *
 * √(w·h) governance makes the AREA of every node fall off with radius, but the
 * eye does not read area — it reads the longest dimension, and under √(w·h)
 * alone that dimension rides free on the texture aspect. The catalogue's
 * aspects run 0.380 (THE DELEGATE, a 1:2.6 column) to 1.993 (BLUE TEETH, a 2:1
 * panel), so BLUE TEETH came out √a = 1.41 times wider than its own governed
 * size — MEASURED at 54%, 235px wide against the outer arm's 160px, from a
 * SMALLER slot. The largest object in the figure was a node that the scale law
 * said was already receding, and it was wide enough to sever the connector
 * thread across a whole arc.
 *
 * So the longest dimension of every node is capped to the spiral's own ramp:
 *
 *     max(w, h)  ≤  ARCH_EXT_CAP · ARCH_SIZE · r^ARCH_FALLOFF
 *
 * The cap binds only on |log aspect| > log(1.16²) — 13 of the 15 works are
 * untouched and keep their exact governed size and their true proportions.
 * The two that are not (BLUE TEETH ×0.821, THE DELEGATE ×0.715) are scaled
 * ISOTROPICALLY: nothing is stretched, cropped or re-framed; the plate is
 * simply hung smaller, which is what the curve was saying about it all along.
 */
const ARCH_EXT_CAP = 1.16;
/**
 * Extra leftward shift of the composed figure, in spiral units.
 *
 * Optical centre is not the centre of the CAP bounding box: the boxes are an
 * upper bound, and perspective pulls the deep works toward the axis. MEASURED
 * off the running frame at 54%: bbox-centring alone left the figure's projected
 * box centred at x=750 against a usable centre of 692 (frame centre 720 less
 * half the HUD rail's 55px reserve). 0.16 spiral units ≈ 58px closes it.
 */
const ARCH_SHIFT_X = 0.16;
/** Funnel depth in spiral units — the eye sits this far behind the outer arm.
 *  0.2 was a flat plate: at the raking second vantage every work sat at the
 *  same distance and the figure read as a carousel. */
const ARCH_DEPTH = 0.5;
/**
 * Lift applied to the figure as the SECOND VANTAGE takes over, in spiral units.
 * The rig drops below the plane and closes on it, which walks the whole figure
 * down the frame: MEASURED at 62%, the projected box centred at y=691 against a
 * frame centre of 450 and the outer arm was 366px below the viewport. 0.42
 * spiral units ≈ 154px of lift keeps the raking pass composed while leaving the
 * shear — the outer arm still sweeps past the bottom edge, which is the point.
 */
const ARCH_VANTAGE_LIFT = 0.42;
/** Fraction of the frame HEIGHT (half) the composed figure may reach. */
const ARCH_SAFE_Y = 0.472;
/** …and of the frame height, horizontally. 1.30 is the narrowest desktop
 *  aspect we compose for, so half the frame width is ≥ 0.65 frame heights. */
const ARCH_SAFE_X = 0.6;

interface FigSlot {
  /** centred, scaled spiral-unit position */
  x: number;
  y: number;
  z: number;
  /** WORLD HEIGHT in the same units. The GOVERNED quantity is √(w·h); this is
   *  that size already split by the plate's own aspect (see ARCH_SIZE). */
  h: number;
  /** 0-1 normalised radius: 1 = outer arm, ~0.26 = the throat */
  r: number;
  /** true when this work's picture is already hung by an earlier work */
  drop: boolean;
  /** position along the RE-DEALT curve: 0 = outer arm */
  k: number;
}

/**
 * THE FIGURE, RE-SOLVED WHENEVER A TEXTURE LANDS.
 *
 * √(w·h) comes off the curve alone; the SPLIT into width and height comes off
 * the real texture aspects, so neither the plates nor the bounding box the
 * composition is fitted to can be known until the textures are decoded. The
 * solve is therefore re-run (in place — every slot
 * object identity is stable, so the per-slab closures that hold one keep
 * working) as each aspect is registered, and converges once by the time the
 * archive is on screen at ~50% scroll.
 */
const figAspects = new Array<number>(ARCHIVE.length).fill(ARCH_ASPECT_FALLBACK);
/**
 * TWO NAMES, ONE PICTURE — see claimPlate() in textures.ts.
 *
 * A work whose decoded texture fingerprints identical to one an earlier work
 * already claimed is DROPPED FROM THE FIGURE: it takes no slot, contributes
 * nothing to the bounding box, and never resolves as a plate. The remaining
 * works then close up — slots are re-dealt CONTIGUOUSLY along the same curve
 * (same b, same phase, same one-third-golden-angle step), so the spiral has no
 * hole in it and the armature still runs through every member.
 */
const figDropped = new Array<boolean>(ARCHIVE.length).fill(false);

const FIGURE: { slots: FigSlot[]; cx: number; cy: number; k: number } = {
  cx: 0,
  cy: 0,
  k: 1,
  slots: ARCHIVE.map((s) => ({ x: s.x, y: s.y, z: 0, h: ARCH_SIZE, r: s.r, drop: false, k: s.slot })),
};

/** Scratch for archHalf(); mutated, never allocated. */
const halfOut = { hw: 0, hh: 0 };

/**
 * Half-extents of the slot at normalised radius `r` for a plate of aspect `a`.
 *
 * √(w·h) = ARCH_SIZE·r^ARCH_FALLOFF exactly — the one split that is strictly
 * monotone in r no matter what the catalogue's aspects are — and then the
 * longest dimension is capped to the same ramp (see ARCH_EXT_CAP), isotropically.
 */
function archHalf(r: number, a: number, out: { hw: number; hh: number }): void {
  const size = ARCH_SIZE * Math.pow(r, ARCH_FALLOFF);
  let hh = size / (2 * Math.sqrt(a));
  let hw = hh * a;
  const cap = (size * ARCH_EXT_CAP) / 2;
  const m = Math.max(hw, hh);
  if (m > cap) {
    const f = cap / m;
    hh *= f;
    hw *= f;
  }
  out.hw = hw;
  out.hh = hh;
}

/** Radii of the contiguous slots, outer arm first. Rebuilt on every solve. */
const dealPt = { x: 0, y: 0, z: 0 };

function solveFigure(): void {
  // survivors in curve order, then re-dealt onto CONTIGUOUS slots so a dropped
  // duplicate leaves no gap in the spiral
  const order: number[] = [];
  for (let i = 0; i < ARCHIVE.length; i++) if (!figDropped[i]) order.push(i);
  order.sort((a, b) => ARCHIVE[a].slot - ARCHIVE[b].slot);

  let x0 = Infinity;
  let x1 = -Infinity;
  let y0 = Infinity;
  let y1 = -Infinity;
  for (let k = 0; k < order.length; k++) {
    const i = order[k];
    const theta = ARCHIVE_THETA_MAX - k * ARCHIVE_STEP;
    const r = Math.exp(PHI_SPIRAL_B * (theta - ARCHIVE_THETA_MAX));
    archiveSpiralPoint(theta, dealPt);
    archHalf(r, figAspects[i], halfOut);
    const slot = FIGURE.slots[i];
    // stash the raw curve solution; the composition transform lands below
    slot.x = dealPt.x;
    slot.y = dealPt.y;
    slot.z = dealPt.z;
    slot.r = r;
    slot.h = 2 * halfOut.hh;
    slot.drop = false;
    slot.k = k;
    x0 = Math.min(x0, dealPt.x - halfOut.hw);
    x1 = Math.max(x1, dealPt.x + halfOut.hw);
    y0 = Math.min(y0, dealPt.y - halfOut.hh);
    y1 = Math.max(y1, dealPt.y + halfOut.hh);
  }
  if (!order.length) return;

  const cx = (x0 + x1) / 2 + ARCH_SHIFT_X;
  const cy = (y0 + y1) / 2;
  // half extents ABOUT THE COMPOSED CENTRE — this is what the frame has to hold
  const ex = (x1 - x0) / 2;
  const ey = (y1 - y0) / 2;
  const k = Math.min(
    ARCH_SAFE_Y / (ey * ARCHIVE_UNIT),
    ARCH_SAFE_X / (ex * ARCHIVE_UNIT),
    // Ceiling only; with the height law the SAFE_Y term is what binds (MEASURED:
    // 0.424 of the half-frame reached against 0.472 allowed at the old 1.14 cap,
    // i.e. the figure was being held 11% under the frame it had earned).
    1.27,
  );
  FIGURE.cx = cx;
  FIGURE.cy = cy;
  FIGURE.k = k;
  for (let i = 0; i < ARCHIVE.length; i++) {
    const slot = FIGURE.slots[i];
    if (figDropped[i]) {
      slot.drop = true;
      continue;
    }
    slot.x = (slot.x - cx) * k;
    slot.y = (slot.y - cy) * k;
    slot.z = -ARCH_DEPTH * (1 - Math.min(1, slot.r)) * k;
    slot.h *= k;
  }
}

/** A slab reports its MOUNTED aspect (after the mat crop) exactly once. */
function registerAspect(i: number, aspect: number): void {
  if (!(aspect > 0) || Math.abs(figAspects[i] - aspect) < 1e-4) return;
  figAspects[i] = aspect;
  solveFigure();
}

/** …and reports that its picture is already hung, exactly once. */
function registerDrop(i: number): void {
  if (figDropped[i]) return;
  figDropped[i] = true;
  solveFigure();
}

solveFigure();

const FRAME_PAD = 0.14; // dark frame border in world units
const VANISH = new THREE.Vector3(0, 0, SIGIL_Z - 26);

/* ------------------------------------------------------------- THE MOUNT
 *
 * ONE FRAMING TREATMENT, IDENTICAL ON ALL FIFTEEN WORKS.
 *
 * Two halves, and neither of them touches a file in public/art:
 *
 *   1. THE WINDOW. textures.ts measures each photograph's incidental studio
 *      mount and excludes it from the UV window (six of fifteen carry one,
 *      3%–15% of the short side, all different). The artist's file is
 *      untouched; what is PRESENTED is the plate.
 *   2. THE EDGE. Every work is then mounted the same way: an inner shadow of
 *      MOUNT_BAND (a fraction of the work's own SHORT side, so it is the same
 *      band on both axes), falling to MOUNT_FLOOR at the very edge, and a dark
 *      keyline whose width is set from screen-space derivatives — so it is the
 *      SAME ~1.3px on a 700px macro canvas and on a 50px chip at the throat.
 *
 * The result: whatever the photograph happened to include, every work reads as
 * the same kind of object, with the same edge, at every scale in the chapter.
 */
/** Inner-shadow band, as a fraction of the work's short side. */
const MOUNT_BAND = 0.018;
/** Luminance the band falls to at the very edge. */
const MOUNT_FLOOR = 0.26;
/** …and the multiplier of the keyline itself, over the outermost ~1.3px. */
const MOUNT_KEY = 0.12;

interface MountUniforms {
  uMountWH: { value: THREE.Vector2 };
}

/**
 * Attach THE EDGE to a MeshBasicMaterial. Returns the uniform the caller keeps
 * up to date with the quad's (width, height) normalised by its short side.
 */
function applyMount(m: THREE.MeshBasicMaterial): MountUniforms {
  const u: MountUniforms = { uMountWH: { value: new THREE.Vector2(1, 1) } };
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uMountWH = u.uMountWH;
    shader.vertexShader =
      'varying vec2 vMount;\n' +
      shader.vertexShader.replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\n  vMount = uv;',
      );
    shader.fragmentShader =
      'varying vec2 vMount;\nuniform vec2 uMountWH;\n' +
      shader.fragmentShader.replace(
        '#include <map_fragment>',
        `#include <map_fragment>
        {
          vec2 e = min(vMount, 1.0 - vMount) * uMountWH;
          float dEdge = min(e.x, e.y);
          diffuseColor.rgb *= mix(${MOUNT_FLOOR.toFixed(3)}, 1.0,
            smoothstep(0.0, ${MOUNT_BAND.toFixed(4)}, dEdge));
          vec2 fw = fwidth(vMount) * uMountWH;
          float px = min(e.x / max(fw.x, 1e-6), e.y / max(fw.y, 1e-6));
          diffuseColor.rgb *= mix(1.0, ${MOUNT_KEY.toFixed(3)},
            1.0 - smoothstep(0.35, 1.65, px));
        }`,
      );
  };
  return u;
}

/** World scale of a slab that is NOT the subject of the frame. */
const SATELLITE_SCALE = 0.55;
/**
 * Fraction of the viewport the hero fills as it enters / reaches its beat.
 * Capped well under 1 so the subject always composes INSIDE the frame, with
 * room left below it for the museum caption.
 */
const HERO_FILL_FAR = 0.36;
const HERO_FILL_NEAR = 0.64;
/** Keep the staged hero (halo included) inside this fraction of the frustum. */
const HERO_SAFE = 0.94;
/** Halo padding around the art quad, in world units at scale 1. */
const GLOW_PAD = 0.46;

/* ------------------------------------------------- THE WORK IS AN OBJECT
 *
 * TWO LAWS, AND EVERY OTHER PRESENCE TERM IN THIS FILE OBEYS THEM.
 *
 * 1. OPAQUE. A painting is a physical plate. It is never see-through: nothing
 *    behind a work may be visible through its surface, and two works never
 *    blend into each other. MEASURED before: the staged MATH CHAOS canvas at
 *    scroll 23% rendered at alpha 0.408 with the starfield reading straight
 *    through it and a near-pass canvas showing through its lower third; the
 *    full-bleed MACRO canvases at 31% and 46% rendered at 0.694 and 0.873.
 *    Distance, depth and atmosphere are now carried ENTIRELY by LUMINANCE — a
 *    fog toward the void, exactly the term that used to live in alpha, so the
 *    composite against the near-black ground is unchanged where it was already
 *    right — and alpha is reserved for the four things that are genuinely
 *    TRANSITIONS between frames rather than states of a painting: the texture's
 *    first moments, the cut between two MACRO canvases, the cross-cut into the
 *    archive, and the contraction.
 *
 * 2. LEGIBLE OR NOT AT ALL. Below LEG_MIN of projected size a work stops being
 *    a work. MEASURED before: at 15% the corridor held twelve paintings between
 *    17 and 62px wide, and at 38% the left 45% of the frame carried nothing but
 *    three chips of 22-56px. An unreadable chip of someone's painting is worse
 *    than nothing, so under the threshold the plate is gone and a MOTE stands
 *    in its place — a dim chalk point, the same object the dust field is made
 *    of. The work resolves into atmosphere instead of into confetti.
 */

/** Projected √(w·h), in CSS px, under which a work does not render as artwork. */
const LEG_MIN = 80;
/** …and over which it is a plate at full opacity. The band between is crossed
 *  in a fraction of a second of scroll; it is the only place a legible work is
 *  ever partly transparent. */
const LEG_FULL = 88;
/** Diameter of the mote that stands in for a sub-legible work, in CSS px. */
const MOTE_PX = 7;
/** …and its peak opacity. Dust, not a marker. */
const MOTE_A = 0.9;
/**
 * Dominance at which a MACRO canvas is fully opaque. The staging guarantees at
 * most one slab exceeds 0.4 at any camera position, so this is also the
 * guarantee that two canvases are never both solid: the cut between them is a
 * dissolve inside 0.14–0.40 and a straight cut everywhere else.
 */
const MACRO_SOLID = 0.4;
const MACRO_DISSOLVE = 0.3;

/* ------------------------------------------------------------------ macro */
/** Minimum overshoot past the top and bottom frame edges in a MACRO shot. */
const MACRO_BLEED = 1.18;
/** Minimum share of the frame width the macro canvas must span. */
const MACRO_SPAN = 0.82;
/**
 * NDC x of the macro canvas's right edge. Everything right of it is the clear
 * column the caption lives in; everything left of it is paint to the bleed.
 */
const MACRO_RIGHT = 0.2;

/* ------------------------------------------------------- satellite spacing */
/**
 * No satellite may have a projected edge within NEED px of the staged hero's
 * projected edge — a 2px miss is a tangent, and a tangent flattens exactly the
 * depth the parallax exists to create.
 */
const SAT_NEED = 56;
/** Hard ceiling on the lateral correction, in world units. */
const SAT_MAX_PUSH = 4.2;

/**
 * The beat, expressed purely as a function of distance ahead of the camera —
 * no per-frame state, so it is bit-identical at 3fps and 144fps and cannot
 * desync from the camera.
 *
 *   ENTER_FAR → ENTER_NEAR : the slab rises into being the subject
 *   EXIT_HOLD → EXIT_DONE  : it dissolves back out of it
 *
 * Slabs are SLAB_SPACING (5.2) apart, and these windows are chosen so that at
 * any camera position AT MOST ONE slab has dominance > 0.4 — the "one subject
 * per beat" law is geometric, not a hope. The dissolve also completes 0.8 units
 * before the slab would reach the camera, so a slab can never swell past the
 * frame edge or leave its red halo hanging in the void.
 */
const ENTER_FAR = 11.4;
const ENTER_NEAR = 8.4;
const EXIT_HOLD = 5.5;
const EXIT_DONE = 3.9;

// shared geometry (materials are per-slab: each fades on its own depth curve)
const unitPlane = new THREE.PlaneGeometry(1, 1);
// red pushed past 1.0 so ONLY this survives the bloom threshold
const GLOW_COLOR = new THREE.Color('#c41230').multiplyScalar(1.85);
const FRAME_COLOR = new THREE.Color('#161311');

const tmpEuler = new THREE.Euler(0, 0, 0, 'YXZ');
const tmpQuat = new THREE.Quaternion();
const poseQuat = new THREE.Quaternion();
const macroQuat = new THREE.Quaternion();
const formQuat = new THREE.Quaternion();
const tiltQuat = new THREE.Quaternion();
const tmpVec = new THREE.Vector3();
const CORNERS: [number, number][] = [
  [-1, -1],
  [1, -1],
  [1, 1],
  [-1, 1],
];

/** Shot blend weights this frame — recomputed per slab, never allocated. */
const mix: ShotMix = { wide: 1, macro: 0, pullback: 0 };
/** Scratch for the archive-plane solve. Mutated per slab, never allocated. */
const worldPt = { x: 0, y: 0, z: 0 };

/** Dev-only shot readout for the QA harness (see __cosmosShared in shared.ts). */
const shotDebug = { p: 0, cp: 0, wide: 1, macro: 0, pull: 0 };
if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
  (window as unknown as { __shot?: typeof shotDebug }).__shot = shotDebug;
}

/** Projected bounds of the last projectQuad() call: NDC and canvas pixels. */
const ndc = { x0: 0, y0: 0, x1: 0, y1: 0, px0: 0, py0: 0, px1: 0, py1: 0 };

/**
 * Project a group-local quad of half-extents (hx, hy) through `cam`.
 * Writes NDC and pixel bounds into `ndc`; returns false if any corner is behind
 * the camera (in which case the bounds are meaningless).
 */
function projectQuad(
  matrixWorld: THREE.Matrix4,
  hx: number,
  hy: number,
  cam: THREE.Camera,
  pxW: number,
  pxH: number,
): boolean {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (let c = 0; c < 4; c++) {
    tmpVec.set(CORNERS[c][0] * hx, CORNERS[c][1] * hy, 0).applyMatrix4(matrixWorld).project(cam);
    if (tmpVec.z > 1) return false;
    if (tmpVec.x < x0) x0 = tmpVec.x;
    if (tmpVec.x > x1) x1 = tmpVec.x;
    if (tmpVec.y < y0) y0 = tmpVec.y;
    if (tmpVec.y > y1) y1 = tmpVec.y;
  }
  ndc.x0 = x0;
  ndc.y0 = y0;
  ndc.x1 = x1;
  ndc.y1 = y1;
  ndc.px0 = (x0 * 0.5 + 0.5) * pxW;
  ndc.px1 = (x1 * 0.5 + 0.5) * pxW;
  ndc.py0 = (-y1 * 0.5 + 0.5) * pxH;
  ndc.py1 = (-y0 * 0.5 + 0.5) * pxH;
  return true;
}

ensureSlabRects(SLABS.length);

interface SlabProps {
  placement: SlabPlacement;
}

function SlabArt({ placement }: SlabProps) {
  const { work, index } = placement;
  const { progressRef, setSelectedWork } = useJourney();
  const groupRef = useRef<THREE.Group>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const artRef = useRef<THREE.Mesh>(null);
  const frameRef = useRef<THREE.Mesh>(null);
  const moteRef = useRef<THREE.Mesh>(null);
  const baseQuat = useRef(new THREE.Quaternion());
  const anim = useRef({
    fade: 0,
    /** clock stamp of this slab's first frame; -1 until it has had one */
    born: -1,
    tilt: 0.02,
    glow: 0,
    dom: 0,
    scale: SATELLITE_SCALE,
  });

  const shared = useTexture(texPath(work.file), (t) => {
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
  });

  /**
   * THE WINDOW. The photograph's incidental studio mount is measured once and
   * excluded from the UV window. A CLONE carries the crop because drei's loader
   * hands the same THREE.Texture to every consumer (NearPass reads these too)
   * and clones share `source`, so this costs one extra JS object and no VRAM.
   */
  const texture = useMemo(() => {
    const img = shared.image as { width?: number; height?: number } | undefined;
    const mat = matCropFor(work.file, img);
    const t = shared.clone();
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    t.offset.set(mat.left, mat.bottom);
    t.repeat.set(1 - mat.left - mat.right, 1 - mat.top - mat.bottom);
    t.needsUpdate = true;
    return t;
  }, [shared, work.file]);
  useEffect(() => () => texture.dispose(), [texture]);

  const aspect = (() => {
    const img = shared.image as { width?: number; height?: number } | undefined;
    if (!img?.width || !img?.height) return 0.8;
    return (img.width * texture.repeat.x) / (img.height * texture.repeat.y);
  })();
  const h = placement.height;
  const w = h * aspect;
  const slot = FIGURE.slots[index];

  const art = useMemo(() => {
    // depthWrite stays ON (three's default): at alpha 1 this plate is a solid
    // occluder, and the depth buffer is what makes it one — the starfield and
    // any work behind it are discarded rather than blended through.
    const m = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthWrite: true,
      opacity: 0,
    });
    return { material: m, mount: applyMount(m) };
  }, [texture]);
  const artMaterial = art.material;
  // THE EDGE is stated in units of the work's SHORT side, so the band and the
  // keyline are the same on a 2:1 panel and on a 1:2.6 column.
  useLayoutEffect(() => {
    const s = Math.min(w, h);
    art.mount.uMountWH.value.set(w / s, h / s);
  }, [art, w, h]);
  // …and the composition of the archive is re-solved against the real aspect
  // the moment this work's texture has landed (see solveFigure).
  useLayoutEffect(() => registerAspect(index, aspect), [index, aspect]);
  // TWO NAMES, ONE PICTURE. The decoded texture is fingerprinted; if an earlier
  // work already hung this exact picture, this one takes no slot in the archive.
  useLayoutEffect(() => {
    if (claimPlate(work.file, index, shared.image) !== index) registerDrop(index);
  }, [index, work.file, shared]);
  const frameMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: FRAME_COLOR.clone(),
        transparent: true,
        opacity: 1,
      }),
    [],
  );
  const glowMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map: getGlowTexture(),
        color: GLOW_COLOR,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    [],
  );
  /** The mote a sub-legible work resolves into. Chalk, round, unlit. */
  const moteMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map: getDustSprite(),
        color: new THREE.Color('#e8e4dc'),
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
    [],
  );

  // announce that this slab's frame callback exists (Labels waits for all of
  // them so its own callback lands last in the subscription order)
  useEffect(() => {
    cosmosShared.slabsLive += 1;
    return () => {
      cosmosShared.slabsLive -= 1;
    };
  }, []);

  // face a point on the camera axis slightly ahead; remember the base pose
  useLayoutEffect(() => {
    const g = groupRef.current;
    if (!g) return;
    g.position.set(placement.x, placement.y, placement.z);
    g.lookAt(placement.lookX, placement.lookY, placement.lookZ);
    baseQuat.current.copy(g.quaternion);
  }, [placement]);

  useFrame((state, rawDt) => {
    const g = groupRef.current;
    if (!g) return;
    const dt = Math.min(rawDt, 1 / 20);
    const t = state.clock.elapsedTime;
    const a = anim.current;
    const p = progressRef.current ?? 0;
    const isNearest = cosmosShared.nearest === index;
    const rect = cosmosShared.slabRects[index];

    // ---- which shot are we in? ----
    const cosP = phaseProgress(p, 'cosmos');
    shotMix(cosP, mix);
    const macroW = mix.macro;
    const pbW = mix.pullback;
    if (process.env.NODE_ENV !== 'production' && index === 0) {
      // dev-only inspection hook, same pattern as __cosmosShared: the QA
      // harness asserts the shot sequence from here. Mutated, never allocated.
      shotDebug.p = p;
      shotDebug.cp = cosP;
      shotDebug.wide = mix.wide;
      shotDebug.macro = macroW;
      shotDebug.pull = pbW;
    }

    // Texture fade-in (no pop) — on the SHARED CLOCK, not on an accumulated
    // damp. A damp is asymptotic: it never reaches 1, and because `dt` is
    // capped at 1/20 it advances with the FRAME COUNT, so on a slow device the
    // work you are looking at is still at 0.55 opacity seconds after it landed
    // (MEASURED at 23%: three slabs pinned at alpha 0.548). Reaching exactly
    // 1.0, in bounded real time, is what makes the opacity law a law.
    if (a.born < 0) a.born = t;
    a.fade = smoothstep(0, 0.5, t - a.born);

    // distance ahead of the camera (positive = further down the corridor)
    const d = state.camera.position.z - placement.z;

    // ---- dominance: how much this slab owns the frame right now ----
    // Purely geometric (see ENTER_*/EXIT_* above): identical at any frame rate,
    // and windowed so no two slabs can both be above 0.4 at the same camera z.
    const rise = smoothstep(ENTER_FAR, ENTER_NEAR, d);
    const exit = smoothstep(EXIT_DONE, EXIT_HOLD, d);
    const stage = rise * exit;
    a.dom = stage;

    // ---- hero fit: solved against the LIVE frustum at this slab's distance,
    // so the subject grows through its beat (0.36 -> 0.64 of the viewport) and
    // is mathematically incapable of being cropped by the viewport edge ----
    const cam = state.camera as THREE.PerspectiveCamera;
    const fitD = Math.max(d, 2.2);
    const frameH = 2 * fitD * Math.tan((cam.fov * Math.PI) / 360);
    const frameW = frameH * cam.aspect;
    const fill = THREE.MathUtils.lerp(HERO_FILL_FAR, HERO_FILL_NEAR, smoothstep(9.6, 4, fitD));
    // fit against BOTH axes so wide canvases shrink instead of bleeding off-frame
    const heroH = Math.min(frameH * fill, (frameW * fill * 0.92) / aspect);
    const heroScale = heroH / h;

    // The frustum at the slab's ACTUAL distance (the fit distance floors at 2.2
    // and diverges from it once the camera is close), which is what containment
    // has to be solved against.
    const nowD = Math.max(d, 1.2);
    const frameHNow = 2 * nowD * Math.tan((cam.fov * Math.PI) / 360);
    const frameWNow = frameHNow * cam.aspect;

    // the caption belongs to the artwork: it lives and dies on the same curve
    if (isNearest) cosmosShared.heroDom = Math.max(stage, macroW);

    // NOT damped: dominance is already smooth, and an exact scale is what makes
    // the containment clamp below a hard guarantee rather than an approximation.
    // Then hard-capped so the halo quad physically CANNOT exceed the safe frame
    // at this distance — translation alone cannot contain something too big.
    a.scale = THREE.MathUtils.lerp(SATELLITE_SCALE, heroScale, stage);
    if (stage > 0.01) {
      const capX = (frameWNow * HERO_SAFE) / (w + GLOW_PAD);
      const capY = (frameHNow * HERO_SAFE) / (h + GLOW_PAD);
      a.scale = Math.min(a.scale, capX, capY);
    }

    // contraction: recede to vanishing point
    const cp = phaseProgress(p, 'contraction');
    const rec = easeInOut(smoothstep(0, 0.6, cp));
    const recEase = rec * rec * (3 - 2 * rec);
    const contractFade = 1 - smoothstep(0.34, 0.58, cp);

    // ---- position: hero pulls toward the frame axis; satellites stay wide ----
    const float = Math.sin(t * placement.floatSpeed + placement.phase) * 0.05;
    let stagedX = placement.x * (1 - HERO_PULL_X * stage);
    let stagedY = (placement.y + float) * (1 - HERO_PULL_Y * stage);

    // hard containment: the staged subject — halo and all — can never reach the
    // viewport edge.
    const halfW = ((w + GLOW_PAD) * a.scale) / 2;
    const halfH = ((h + GLOW_PAD) * a.scale) / 2;
    const maxX = Math.max(0, (frameWNow / 2) * HERO_SAFE - halfW);
    const maxY = Math.max(0, (frameHNow / 2) * HERO_SAFE - halfH);
    // Containment is FULL for anything with meaningful presence. (Scaling it
    // linearly with `stage` left a dissolving slab only ~70% corrected, which
    // is exactly how a half-faded painting ends up hanging off the frame edge.)
    const clampW = smoothstep(0.015, 0.12, stage) * (1 - Math.max(macroW, pbW));
    stagedX = THREE.MathUtils.lerp(stagedX, THREE.MathUtils.clamp(stagedX, -maxX, maxX), clampW);
    stagedY = THREE.MathUtils.lerp(stagedY, THREE.MathUtils.clamp(stagedY, -maxY, maxY), clampW);

    let px = stagedX;
    let py = stagedY;
    let pz = placement.z;
    let ps = a.scale;

    /* ---- MACRO: bleed past top, bottom and left; keep a clear right column ----
     * Framing is NOT tied to which slab owns the beat: every canvas composes to
     * the same macro rectangle and only ALPHA cross-dissolves between them, so
     * consecutive macro beats cut like film instead of scaling in and out. */
    if (macroW > 0.001) {
      let macroH = frameHNow * MACRO_BLEED;
      if (macroH * aspect < frameWNow * MACRO_SPAN) macroH = (frameWNow * MACRO_SPAN) / aspect;
      const macroWide = macroH * aspect;
      const macroScale = macroH / h;
      const macroCX = MACRO_RIGHT * (frameWNow / 2) - macroWide / 2;
      px = THREE.MathUtils.lerp(px, macroCX, macroW);
      py = THREE.MathUtils.lerp(py, 0, macroW);
      ps = THREE.MathUtils.lerp(ps, macroScale, macroW);
    }

    /* ---- PULL-BACK: fly onto the φ SPIRAL ahead of the camera ----
     * The body of work resolves into fifteen points on the golden spiral — the
     * same curve, same growth, same phase the CONTRACTION draws fifteen
     * scroll-percent later. Position AND scale come from the slot's radius, so
     * the hierarchy is derived from the curve rather than asserted.
     *
     * TWO MOVEMENTS, not one. First the figure is read square-on. Then `thru`
     * takes over: the rig drops BELOW the spiral and closes on it, and the
     * plane rakes, yaws AND ROLLS BY ONE WORK-POSITION — the archive visibly
     * WINDS. Every work stands in that plane, so the whole figure turns as one
     * body and the outer arm shears past the bottom of the frame. */
    const posW = smoothstep(0.15, 0.5, pbW);
    const thru = smoothstep(VANTAGE_IN, VANTAGE_OUT, cosP);
    // The plane is a closed form of (camera, thru), so every slab solves the
    // identical transform and publishes it — no slab is privileged and nothing
    // depends on the Suspense-determined useFrame order.
    const plane = formationPlane(
      cam.position.x,
      cam.position.y,
      cam.position.z,
      cam.fov,
      thru,
      stageState.plane,
    );
    if (index === 0) {
      stageState.formW = pbW;
      stageState.formThru = thru;
    }
    const planePitch = plane.pitch;
    const planeYaw = plane.yaw;
    const planeRoll = plane.roll;
    if (posW > 0.001) {
      planeToWorld(plane, slot.x, slot.y, slot.z, worldPt);
      // WORLD-space lift, not plane-space: the plane rolls by a whole
      // work-position at the second vantage, so a lift applied inside it would
      // carry 72% of itself sideways and walk the figure off the left edge
      // (MEASURED: box centre x 682 → 536). This raises the frame, nothing else.
      worldPt.y += ARCH_VANTAGE_LIFT * plane.unit * thru;
      px = THREE.MathUtils.lerp(px, worldPt.x, posW);
      py = THREE.MathUtils.lerp(py, worldPt.y, posW);
      pz = THREE.MathUtils.lerp(pz, worldPt.z, posW);
      // The slab is scaled so its world height is exactly the slot's — which
      // makes its √(w·h) exactly ARCH_SIZE·r^f, the governed quantity. Read
      // from the live slot (solveFigure re-runs as textures land) rather than
      // captured at mount.
      ps = THREE.MathUtils.lerp(ps, (slot.h / h) * plane.unit, posW);
    }

    g.position.set(
      THREE.MathUtils.lerp(px, VANISH.x, recEase),
      THREE.MathUtils.lerp(py, VANISH.y, recEase),
      THREE.MathUtils.lerp(pz, VANISH.z, recEase),
    );
    const s = Math.max(0.001, ps * (1 - recEase * 0.999));
    g.scale.setScalar(s);

    // ---- orientation: the subject does NOT turn square-on. It takes its own
    // pose — ~17-25° of yaw, ~6-9° of pitch, alternating sign per index — so a
    // painting owning the frame is a volume standing in a space and its
    // perspective shears as the rig passes it. Consecutive WIDE beats shear in
    // opposite directions, which is what stops two establishing shots taken
    // 15% of the journey apart from reading as the same card field.
    tmpEuler.set(placement.pitch, placement.yaw, placement.roll);
    poseQuat.setFromEuler(tmpEuler);
    tmpQuat.copy(baseQuat.current).slerp(poseQuat, Math.min(1, stage * 0.94));
    // MACRO is a detail crop — the canvas plane comes close to square, but not
    // dead flat: a residual ~5° keeps the surface reading as a surface.
    if (macroW > 0.001) {
      tmpEuler.set(placement.pitch * 0.3, placement.yaw * 0.26, placement.roll * 0.4);
      macroQuat.setFromEuler(tmpEuler);
      tmpQuat.slerp(macroQuat, macroW);
    }
    // PULL-BACK: every work stands IN the archive plane, so when the plane
    // rakes, yaws and rolls for the second vantage the whole spiral turns as
    // one body — plus a small per-work deviation so it is a constellation of
    // oriented objects, not a sheet of stickers.
    if (posW > 0.001) {
      tmpEuler.set(
        planePitch + placement.fPitch,
        planeYaw + placement.fYaw,
        planeRoll + placement.fRoll,
      );
      formQuat.setFromEuler(tmpEuler);
      tmpQuat.slerp(formQuat, posW);
    }
    // inertial tilt toward cursor (max ~4° on the hero)
    a.tilt = THREE.MathUtils.damp(a.tilt, isNearest ? 0.07 : 0.022, 3, dt);
    tmpEuler.set(-cosmosShared.swayY * a.tilt, cosmosShared.swayX * a.tilt, 0);
    tiltQuat.setFromEuler(tmpEuler);
    g.quaternion.copy(tmpQuat).multiply(tiltQuat);

    /* ---- satellite spacing: never tangent to the staged hero ----
     * Solved HERE, from this frame's own projection, in one Newton step —
     * not integrated across frames. A damped correction only converges if
     * enough frames elapse, which is exactly the guarantee a 2px tangent
     * needs and cannot have. The push is always LATERAL, away from the hero's
     * screen centre: sliding a thumbnail sideways preserves the depth read,
     * dropping it further down the frame does not. If even the maximum push
     * cannot buy the clearance, the satellite simply stops rendering — a work
     * that cannot be separated from the subject has no business in the shot.
     */
    let satClear = 1;
    let satClamp = 0;
    const heroRect = cosmosShared.slabRects[cosmosShared.nearest];
    if (
      macroW < 0.05 &&
      pbW < 0.05 &&
      recEase < 0.02 &&
      !isNearest &&
      stage < 0.2 &&
      heroRect &&
      heroRect !== rect &&
      heroRect.live
    ) {
      const hx0 = heroRect.x0 - heroRect.pad;
      const hy0 = heroRect.y0 - heroRect.pad;
      const hx1 = heroRect.x1 + heroRect.pad;
      const hy1 = heroRect.y1 + heroRect.pad;
      const pxW = frameWNow / state.size.width;
      // full correction only once the hero really owns the frame, so the
      // handover between two beats does not snap the background sideways
      const authority = smoothstep(0.2, 0.62, cosmosShared.heroDom);
      const dir = (heroRect.x0 + heroRect.x1) / 2 > 0 ? -1 : 1;
      let moved = 0;
      let gap = SAT_NEED;
      for (let it = 0; it < 3; it++) {
        g.updateWorldMatrix(true, false);
        if (!projectQuad(g.matrixWorld, w / 2, h / 2, cam, state.size.width, state.size.height)) {
          break;
        }
        gap = Math.max(hx0 - ndc.px1, ndc.px0 - hx1, hy0 - ndc.py1, ndc.py0 - hy1);
        if (gap >= SAT_NEED) break;
        const want = dir < 0 ? SAT_NEED - (hx0 - ndc.px1) : SAT_NEED - (ndc.px0 - hx1);
        const stepPx = Math.min(want, (SAT_MAX_PUSH - Math.abs(moved)) / pxW);
        if (stepPx <= 0.5) break;
        const step = dir * stepPx * pxW * authority;
        g.position.x += step;
        moved += step;
      }
      satClear = smoothstep(SAT_NEED * 0.4, SAT_NEED * 0.95, gap);
      satClamp = Math.min(1, Math.abs(moved) / 0.25);
    }

    // ---- exact containment: project the halo quad and push it back inside the
    // safe frame. Analytic clamping above gets close; this closes the gap left
    // by rotation and perspective, so the subject is never clipped. ----
    // Three Newton steps, not one: perspective makes a single linearised push
    // an under-correction on a rotated quad, and an under-correction is a
    // painting hanging off the edge of the frame.
    // (MACRO deliberately bleeds off-frame, so containment is off there.)
    const contain = Math.max(clampW, satClamp * (1 - Math.max(macroW, pbW)));
    if (contain > 0.01 && recEase < 0.02) {
      for (let it = 0; it < 3; it++) {
        g.updateWorldMatrix(true, false);
        if (!projectQuad(g.matrixWorld, (w + GLOW_PAD) / 2, (h + GLOW_PAD) / 2, cam, 1, 1)) break;
        let nx = 0;
        let ny = 0;
        if (ndc.x1 > HERO_SAFE) nx -= ((ndc.x1 - HERO_SAFE) * frameWNow) / 2;
        if (ndc.x0 < -HERO_SAFE) nx += ((-HERO_SAFE - ndc.x0) * frameWNow) / 2;
        if (ndc.y1 > HERO_SAFE) ny -= ((ndc.y1 - HERO_SAFE) * frameHNow) / 2;
        if (ndc.y0 < -HERO_SAFE) ny += ((-HERO_SAFE - ndc.y0) * frameHNow) / 2;
        if (nx === 0 && ny === 0) break;
        g.position.x += nx * contain;
        g.position.y += ny * contain;
      }
    }

    /* ---- DEPTH IS LIGHT, NOT TRANSPARENCY ----
     * `fog` is exactly the term that used to sit in alpha, moved into the
     * material colour: a far slab composites against the void as it did before,
     * but it is DARK rather than SEE-THROUGH. Same for `satClear` — a satellite
     * that cannot be separated from the staged subject goes out like a light
     * instead of turning into a window. */
    const depth = smoothstep(58, 13, d); // 1 near, 0 deep in the corridor
    const fog = THREE.MathUtils.lerp(0.22 + 0.72 * depth, 1, stage) * satClear;
    let lum = THREE.MathUtils.lerp(0.3 + 0.34 * depth, 1, stage) * fog;
    /**
     * ATMOSPHERE, NOT CHIPS. A work at the throat of the spiral is a fraction
     * of the area of one on the outer arm; no exponent fixes that without
     * breaking the chambers, so the small ones stop pretending to be readable
     * and become depth instead. 1 at the arm, 0 from r ≈ 0.20 in. Read LIVE
     * from the slot, because solveFigure re-deals the curve when a duplicate
     * picture is dropped.
     */
    const archiveAir = smoothstep(0.2, 0.58, slot.r);
    // PASSING THE LENS IS A LIGHTING EVENT, NOT A DISSOLVE. A work sweeping out
    // of the corridor used to fade over 1.6 world units, which is how a 423px
    // painting came to be rendered at alpha 0.835 (MEASURED at 23%). It now
    // goes DARK on the same window instead — opaque the whole way — and is
    // culled outright once there is nothing left of it to light.
    lum *= smoothstep(EXIT_DONE - 0.1, EXIT_DONE + 0.9, d);
    let bodyAlpha = a.fade * contractFade;

    // MACRO: the beat's own slab is solid; everything else leaves the frame
    // entirely — no thumbnails floating over brushwork. `stage` is a partition
    // of unity across the corridor and never exceeds 0.4 on two slabs at once,
    // so at MACRO_SOLID the canvas that owns the beat is the ONLY thing on
    // screen and it is fully opaque; the handover between two of them is the
    // only moment either is not.
    if (macroW > 0.001) {
      const macroAlpha =
        a.fade * contractFade * smoothstep(MACRO_DISSOLVE, MACRO_SOLID, stage);
      // The SHOT changes faster than the GEOMETRY does. Blending presence on
      // macroW itself mixed "corridor slab, fully present" with "not the
      // subject of this macro, absent" and landed on the average — MEASURED at
      // scroll 32.7%, a canvas covering 66% of the frame at alpha 0.327. The
      // semantics switch over the first quarter of the cut instead, so a plane
      // is either a corridor work or a macro canvas, never half of each.
      const macroSem = smoothstep(0.03, 0.28, macroW);
      bodyAlpha = THREE.MathUtils.lerp(bodyAlpha, macroAlpha, macroSem);
      lum = THREE.MathUtils.lerp(lum, 1, macroW);
    }

    // PULL-BACK: cross-cut. The corridor dissolves out, the formation resolves
    // in — the works are never seen sweeping through the camera between them.
    if (pbW > 0.001) {
      // sharper than the fade-in: the corridor is CUT away, not dissolved, so
      // the chapter never lingers on a half-transparent full-bleed canvas
      const outW = 1 - smoothstep(0.0, 0.2, pbW);
      const inW = smoothstep(0.42, 0.82, pbW);
      // …and the figure is GRADED: the outer arm is the body of work at full
      // presence, the throat is atmosphere. That grade used to be spent on
      // ALPHA, which made two thirds of the archive see-through; it is spent on
      // LIGHT now, so the composite is the same and the plates are solid.
      const air = 0.30 + 0.70 * archiveAir;
      bodyAlpha = bodyAlpha * outW + a.fade * contractFade * (slot.drop ? 0 : 1) * inW;
      lum = THREE.MathUtils.lerp(lum, (0.52 + 0.44 * archiveAir) * air, inW);
    }

    /* ---- LEGIBLE OR NOT AT ALL ----
     * Projected geometric-mean size of the art quad, solved against the frustum
     * at the plate's ACTUAL distance (which is the formation's distance in the
     * pull-back, not the corridor's). Exact for a front-facing quad and an
     * upper bound under the pose shear, so nothing sneaks under the floor. */
    const viewD = Math.max(1.2, cam.position.z - pz);
    const frameHView = 2 * viewD * Math.tan((cam.fov * Math.PI) / 360);
    const projG = (Math.sqrt(w * h) * ps * state.size.height) / frameHView;
    const legible = smoothstep(LEG_MIN, LEG_FULL, projG);
    // what the work resolves into below the floor: one dim chalk point, on the
    // curve, in the dust — never an unreadable chip of someone's painting
    const moteAlpha = MOTE_A * (1 - legible) * bodyAlpha * (0.3 + 0.7 * lum);
    bodyAlpha *= legible;

    // red edge glow rides the same dominance curve as the staging AND the same
    // dissolve as the body, so the glowing slab is always the subject of the
    // frame and a halo can never outlive the artwork it belongs to. It is a
    // WIDE-shot device: a halo round a full-bleed macro canvas is meaningless,
    // and 15 haloes in the pull-back would be a christmas tree.
    a.glow =
      a.dom * exit * 0.46 * (1 - smoothstep(0.05, 0.2, cp)) * (1 - macroW) * (1 - pbW) * legible;
    if (glowRef.current) {
      (glowRef.current.material as THREE.MeshBasicMaterial).opacity =
        a.glow * a.fade * contractFade;
    }
    // A PLATE AT ZERO ALPHA IS NOT A PLATE — IT MUST NOT WRITE DEPTH.
    //
    // The group stays visible while EITHER the body or the mote has presence
    // (below), which is right: a sub-legible work still draws its mote. But the
    // art and frame quads carry depthWrite:true, and three writes depth for a
    // transparent material at opacity 0 just as it does at opacity 1 — so a
    // work that had resolved into a mote was still stamping a full-size,
    // completely invisible occluder into the depth buffer at its archive pose.
    //
    // The armature is depth-tested against exactly that buffer (see
    // STROKE_BEHIND), so the five inner works that drop below the legibility
    // floor were each punching a hole in the thread. MEASURED by rendering the
    // stroke twice at one scroll, once with depthTest off, and diffing: at 54%
    // 6,879px of armature vanished against VOID ground in 121 separate gaps up
    // to 42px long; at 62%, 10,144px in 174 gaps up to 67px. On screen that is
    // a dashed line, and the one thing the thread exists to say — that all
    // fifteen positions came off ONE curve — is the thing a dashed line cannot
    // say. The same invisible occluders were also cutting holes in the
    // starfield behind them.
    const solid = bodyAlpha > 0.004;
    if (artRef.current) {
      const m = artRef.current.material as THREE.MeshBasicMaterial;
      m.color.setScalar(lum);
      m.opacity = bodyAlpha;
      artRef.current.visible = solid;
    }
    if (frameRef.current) {
      const m = frameRef.current.material as THREE.MeshBasicMaterial;
      m.opacity = bodyAlpha;
      m.color.copy(FRAME_COLOR).multiplyScalar(0.4 + 0.6 * lum);
      frameRef.current.visible = solid;
    }
    if (moteRef.current) {
      const mm = moteRef.current.material as THREE.MeshBasicMaterial;
      mm.opacity = moteAlpha;
      moteRef.current.visible = moteAlpha > 0.004;
      if (moteRef.current.visible) {
        // constant on SCREEN: the mote is a point of dust, and dust does not
        // have a size in the world
        const k = ((MOTE_PX / state.size.height) * frameHView) / Math.max(1e-4, s);
        moteRef.current.scale.set(k, k, 1);
      }
    }

    // cull anything behind us or lost in the fog — keeps draw calls honest.
    // In the formation every work is in front of the camera by construction,
    // so the corridor-distance test does not apply.
    const inFormation = posW > 0.02;
    const visible =
      Math.max(bodyAlpha, moteAlpha) > 0.004 &&
      lum > 0.004 &&
      !(inFormation && slot.drop) &&
      (inFormation || (d > EXIT_DONE - 0.2 && d < 78));
    g.visible = visible;

    // ---- project the art quad to a screen rect for the label system ----
    rect.alpha = bodyAlpha;
    if (!visible || recEase > 0.02 || inFormation || bodyAlpha < 0.02) {
      // no captions and no chips over the composed triangle: nothing to test.
      // A mote is not an obstacle to type either — it is dust.
      rect.live = false;
      // …but the formation still has to be MEASURED, because the plate that
      // names it places itself against these bounds. Publish the union of the
      // projected quads so the caption can never land on paint.
      if (inFormation && visible && recEase < 0.02 && bodyAlpha > 0.02) {
        g.updateWorldMatrix(true, false);
        if (projectQuad(g.matrixWorld, w / 2, h / 2, cam, state.size.width, state.size.height)) {
          addFormBounds(t, ndc.px0, ndc.py0, ndc.px1, ndc.py1);
          if (process.env.NODE_ENV !== 'production') {
            publishFormRect(index, slot.k, ndc.px0, ndc.py0, ndc.px1, ndc.py1);
          }
        }
      }
      return;
    }
    g.updateWorldMatrix(true, false);
    const ok = projectQuad(g.matrixWorld, w / 2, h / 2, cam, state.size.width, state.size.height);
    rect.live = ok;
    // The halo is part of the artwork's presence — but only where it renders.
    // In MACRO there is no halo, so padding the silhouette for one would eat
    // the clear column the caption is composed into.
    rect.pad =
      ((GLOW_PAD * 0.6 * a.scale) / frameHNow) *
      state.size.height *
      (0.3 + 0.7 * stage) *
      (1 - macroW) *
      (1 - pbW);
    if (ok) {
      rect.x0 = ndc.px0;
      rect.y0 = ndc.py0;
      rect.x1 = ndc.px1;
      rect.y1 = ndc.py1;
    }
  });

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    const p = progressRef.current ?? 0;
    if (phaseProgress(p, 'contraction') > 0.15) return;
    setSelectedWork(work.id);
  };
  const onOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    document.documentElement.style.cursor = 'pointer';
  };
  const onOut = () => {
    document.documentElement.style.cursor = '';
  };

  return (
    <group ref={groupRef}>
      {/* red halo, furthest back */}
      <mesh
        ref={glowRef}
        position={[0, 0, -0.05]}
        scale={[w + GLOW_PAD, h + GLOW_PAD, 1]}
        geometry={unitPlane}
        material={glowMaterial}
      />
      {/* thin dark extruded-frame feel, 2cm behind the art */}
      <mesh
        ref={frameRef}
        position={[0, 0, -0.02]}
        scale={[w + FRAME_PAD, h + FRAME_PAD, 1]}
        geometry={unitPlane}
        material={frameMaterial}
        onClick={onClick}
        onPointerOver={onOver}
        onPointerOut={onOut}
      />
      <mesh
        ref={artRef}
        scale={[w, h, 1]}
        geometry={unitPlane}
        material={artMaterial}
        onClick={onClick}
        onPointerOver={onOver}
        onPointerOut={onOut}
      />
      {/* what this work resolves into below the legibility floor: a dim mote,
          the same object the dust field is made of. Never a chip of a painting. */}
      <mesh
        ref={moteRef}
        position={[0, 0, 0.01]}
        geometry={unitPlane}
        material={moteMaterial}
        visible={false}
        raycast={() => null}
      />
    </group>
  );
}

/** Placeholder while a texture streams in: bare dark frame at guessed aspect. */
function SlabGhost({ placement }: SlabProps) {
  const h = placement.height * SATELLITE_SCALE;
  const w = h * 0.8;
  return (
    <group position={[placement.x, placement.y, placement.z]}>
      <mesh scale={[w + FRAME_PAD, h + FRAME_PAD, 1]} geometry={unitPlane}>
        <meshBasicMaterial color="#161311" transparent opacity={0.85} />
      </mesh>
    </group>
  );
}

/* =============================================================== THE STROKE
 *
 * THE CURVE THE ARCHIVE IS HUNG ON, MADE LEGIBLE.
 *
 * It existed before as a 1px THREE.Line at 0.16 alpha. MEASURED against the
 * void ground: rgb(46) on rgb(14) — 1.4:1. That is not restraint, it is a line
 * you cannot see, and it left fifteen works that had obviously been ARRANGED
 * with nothing on screen saying by what.
 *
 * It is now a drawn stroke: a tapered ribbon threaded through the same φ path
 * the works stand on — same b, same phase, same centring, same funnel z, so it
 * passes THROUGH them in depth rather than behind them — with a wide, faint
 * halo under a narrow core. Core measures ≈3.2:1 on the ground: unmistakably
 * the organising line, still an order of magnitude under the caption at 15:1
 * and under every painting it runs between. It draws itself outer-arm first
 * and dies into the throat, so the eye of the spiral stays the darkest thing
 * in the frame — which is where the sigil then strikes.
 */

/** Samples along the stroke. */
const STROKE_N = 720;
/** Core half-width in spiral units (≈1.1px at 1440×900). */
const STROKE_HW = 0.0029;
/**
 * HOW FAR BEHIND THE WORKS THE THREAD RUNS, in world units.
 *
 * The curve is sampled at exactly the works' own funnel depth, so at the raking
 * second vantage each work's plane CROSSES it: MEASURED at 62%, the stroke
 * printed straight across the collage card at upper right and the teal card at
 * left. renderOrder alone could not fix it — a painter-order fix is a lie about
 * geometry and it failed here anyway — so the thread is now depth-tested and
 * pushed behind the body of work by scaling the whole stroke ABOUT THE CAMERA.
 * Perspective projection is invariant under scaling about the eye, so this is
 * pixel-identical on screen while sitting a clear 0.9 world units further away
 * than any work's tilted corner (worst-case corner excursion, measured off the
 * per-work fPitch/fYaw at archive scale: ~0.31).
 */
const STROKE_BEHIND = 0.9;
/** How much wider the halo pass is. */
const STROKE_HALO = 3.4;
/** θ past the outermost work, and past the innermost. */
const STROKE_LEAD = 0.42;
const STROKE_TAIL = 6.4;
/** Peak opacity of the core / halo passes. */
const STROKE_CORE_A = 0.38;
const STROKE_HALO_A = 0.1;
const STROKE_VANISH_Z = SIGIL_Z - 26;

function buildStrokeGeometry(hwScale: number): THREE.BufferGeometry {
  const pos = new Float32Array(STROKE_N * 2 * 3);
  const col = new Float32Array(STROKE_N * 2 * 3);
  const idx = new Uint16Array((STROKE_N - 1) * 6);
  const hi = ARCHIVE_THETA_MAX + STROKE_LEAD;
  const lo = -STROKE_TAIL;
  // RAW spiral space. The composition (FIGURE.cx/cy/k) is re-solved as textures
  // land, so it is applied by a live inner transform rather than baked in here
  // — otherwise the thread would be hung on the figure's first guess.
  const pt = (theta: number, out: { x: number; y: number; z: number }) => {
    const r = Math.exp(PHI_SPIRAL_B * (theta - ARCHIVE_THETA_MAX));
    out.x = Math.cos(theta + PHI_SPIRAL_PHASE) * r;
    out.y = Math.sin(theta + PHI_SPIRAL_PHASE) * r;
    out.z = -ARCH_DEPTH * (1 - Math.min(1, r));
  };
  const a = { x: 0, y: 0, z: 0 };
  const b = { x: 0, y: 0, z: 0 };
  for (let i = 0; i < STROKE_N; i++) {
    const t = i / (STROKE_N - 1); // 0 = outer arm, 1 = throat
    const theta = hi + (lo - hi) * t;
    pt(theta, a);
    pt(theta + (lo - hi) * 0.0008, b);
    let dx = b.x - a.x;
    let dy = b.y - a.y;
    const dl = Math.hypot(dx, dy) || 1;
    dx /= dl;
    dy /= dl;
    // width tapers with the local radius: a drawn line, thinning into the eye
    const r = Math.exp(PHI_SPIRAL_B * (theta - ARCHIVE_THETA_MAX));
    const hw = STROKE_HW * hwScale * (0.42 + 0.58 * Math.pow(Math.min(1, r), 0.45));
    // The arm carries the line and the throat softens — but it does NOT go out.
    // The thread is the armature: it is the only thing on screen saying that
    // the fifteen positions, radii and scales all came off one curve, so it has
    // to be readable across the WHOLE figure, including the stretch where the
    // works have resolved into motes and the thread is all that is left of them.
    // MEASURED on the void ground: the old 0.9 throat fade took the core to
    // rgb(21) on rgb(14) — 1.13:1, i.e. gone — over the inner third. At 0.55 the
    // inner turns hold ≈2.1:1 while the eye of the spiral is still the darkest
    // point in the frame, which is where the sigil then strikes.
    // The outer tip fades in from nothing over the first 5%: a stroke that
    // starts at full weight in mid-air is a line with an end, and this curve is
    // not supposed to have one.
    const v = 0.96 * smoothstep(0, 0.055, t) * (1 - smoothstep(0.5, 1, t) * 0.55);
    for (let s = 0; s < 2; s++) {
      const o = (i * 2 + s) * 3;
      const sgn = s === 0 ? -1 : 1;
      pos[o] = a.x + -dy * hw * sgn;
      pos[o + 1] = a.y + dx * hw * sgn;
      pos[o + 2] = a.z;
      col[o] = v;
      col[o + 1] = v;
      col[o + 2] = v;
    }
    if (i < STROKE_N - 1) {
      const q = i * 6;
      const v0 = i * 2;
      idx[q] = v0;
      idx[q + 1] = v0 + 1;
      idx[q + 2] = v0 + 2;
      idx[q + 3] = v0 + 1;
      idx[q + 4] = v0 + 3;
      idx[q + 5] = v0 + 2;
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setIndex(new THREE.BufferAttribute(idx, 1));
  geo.setDrawRange(0, 0);
  return geo;
}

function ArchiveStroke() {
  const { progressRef } = useJourney();
  const groupRef = useRef<THREE.Group>(null);
  const figRef = useRef<THREE.Group>(null);
  const euler = useRef(new THREE.Euler(0, 0, 0, 'YXZ'));

  const kit = useMemo(() => {
    const make = (hwScale: number, order: number) => {
      const geometry = buildStrokeGeometry(hwScale);
      const material = new THREE.MeshBasicMaterial({
        color: new THREE.Color('#e8e4dc'),
        vertexColors: true,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        // DEPTH-TESTED. See STROKE_BEHIND: painter order alone was measured
        // drawing the thread across the card faces at the second vantage, and
        // ordering is the wrong instrument for a question about geometry. The
        // works write depth; the stroke is pushed behind them and tested.
        depthTest: true,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.frustumCulled = false;
      // …and it draws AFTER the works, so their depth is already in the buffer
      // by the time the thread is tested against it.
      mesh.renderOrder = order;
      return { geometry, material, mesh };
    };
    return { halo: make(STROKE_HALO, 6), core: make(1, 7) };
  }, []);

  const liveRef = useRef<typeof kit | null>(null);

  useEffect(
    () => () => {
      kit.halo.geometry.dispose();
      kit.halo.material.dispose();
      kit.core.geometry.dispose();
      kit.core.material.dispose();
    },
    [kit],
  );

  useFrame((state) => {
    const g = groupRef.current;
    if (!g) return;
    if (!liveRef.current) {
      liveRef.current = { ...kit };
      if (process.env.NODE_ENV !== 'production') {
        // Dev-only QA hook, same pattern as __shot / __stage / __formRects. The
        // z-order claim is checked by keying this stroke to a colour nothing
        // else in the frame carries and counting how much of it lands on paint.
        (window as unknown as { __stroke?: unknown }).__stroke = liveRef.current;
      }
    }
    const live = liveRef.current;
    const w = stageState.formW;
    const cp = phaseProgress(progressRef.current ?? 0, 'contraction');
    const rec = easeInOut(smoothstep(0, 0.6, cp));
    const recEase = rec * rec * (3 - 2 * rec);
    const contractFade = 1 - smoothstep(0.34, 0.58, cp);
    const gate = smoothstep(0.16, 0.62, w) * contractFade;
    if (gate < 0.01) {
      if (g.visible) {
        g.visible = false;
        live.core.material.opacity = 0;
        live.halo.material.opacity = 0;
      }
      return;
    }
    g.visible = true;
    live.core.material.opacity = STROKE_CORE_A * gate;
    live.halo.material.opacity = STROKE_HALO_A * gate;
    // outer-first progressive draw, arriving just ahead of the works
    const draw = smoothstep(0.18, 0.86, w);
    const quads = Math.max(1, Math.round(draw * (STROKE_N - 1)));
    live.core.geometry.setDrawRange(0, quads * 6);
    live.halo.geometry.setDrawRange(0, quads * 6);

    const cam = state.camera as THREE.PerspectiveCamera;
    const pl = formationPlane(
      cam.position.x,
      cam.position.y,
      cam.position.z,
      cam.fov,
      stageState.formThru,
      stageState.plane,
    );
    const px = pl.cx * (1 - recEase);
    const py = (pl.cy + ARCH_VANTAGE_LIFT * pl.unit * stageState.formThru) * (1 - recEase);
    const pz = pl.cz + (STROKE_VANISH_Z - pl.cz) * recEase;
    // BEHIND THE BODY OF WORK, at no cost to the picture. Scaling the whole
    // stroke about the CAMERA leaves its projection exactly unchanged (a
    // perspective projection is invariant under scaling about the eye) while
    // moving it STROKE_BEHIND further down the view ray, so the depth test
    // resolves in the works' favour at every vantage instead of slicing them.
    const back = Math.max(0.0001, cam.position.z - pz);
    const push = 1 + STROKE_BEHIND / back;
    g.position.set(
      cam.position.x + (px - cam.position.x) * push,
      cam.position.y + (py - cam.position.y) * push,
      cam.position.z + (pz - cam.position.z) * push,
    );
    const e = euler.current;
    e.set(pl.pitch, pl.yaw, pl.roll);
    g.quaternion.setFromEuler(e);
    g.scale.setScalar(Math.max(0.0001, pl.unit * push * (1 - recEase * 0.999)));
    // the composition the works are standing in, applied live (see buildStrokeGeometry)
    const f = figRef.current;
    if (f) {
      f.position.set(-FIGURE.cx * FIGURE.k, -FIGURE.cy * FIGURE.k, 0);
      f.scale.setScalar(FIGURE.k);
    }
  });

  return (
    <group ref={groupRef} visible={false}>
      <group ref={figRef}>
        <primitive object={kit.halo.mesh} />
        <primitive object={kit.core.mesh} />
      </group>
    </group>
  );
}

export function Slabs() {
  return (
    <group>
      {SLABS.map((placement) => (
        <Suspense key={placement.work.id} fallback={<SlabGhost placement={placement} />}>
          <SlabArt placement={placement} />
        </Suspense>
      ))}
      {/* the φ curve the archive is hung on, drawn as a real stroke */}
      <ArchiveStroke />
      {/* near-field passes: canvases that blow through the periphery */}
      <Suspense fallback={null}>
        <NearPass />
      </Suspense>
      {/* the plate that names the composed formation — the caption track has
          to survive the beat it was previously dropped for */}
      <FormationPlate />
    </group>
  );
}
