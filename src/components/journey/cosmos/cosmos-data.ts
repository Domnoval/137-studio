// cosmos/cosmos-data.ts — OWNED BY COSMOS agent.
// Layout math for the golden-angle helix, the apps constellation, and the
// contraction sigil geometry. Pure data — no three imports, no React.

import { GOLDEN_ANGLE } from '../journey-utils';
import { artworks, type Artwork } from '@/lib/works';

/* ---------------------------------------------------------------- helix */

export const SLAB_SPACING = 5.2; // z distance between successive slabs
export const CAM_START_Z = 10; // camera rest position before the first slab
/**
 * Distance ahead of the camera at which a slab is "the subject" of the frame.
 * The staging in Slabs.tsx composes the hero to fill ~60-76% of the viewport
 * at this distance, so it must be far enough that a wide canvas still fits.
 */
export const SWEET_D = 7.3;
/** How much of its off-axis offset the hero surrenders while it owns the frame. */
export const HERO_PULL_X = 0.62;
export const HERO_PULL_Y = 0.72;
/**
 * End of the cosmos dolly. Stops the instant the LAST slab has finished its
 * dissolve (d ≈ 3.4, just inside Slabs' EXIT_DONE) instead of sailing 8 units
 * past it — otherwise the corridor is empty for the last ~6% of the phase and
 * the journey shows a dead frame right before the contraction.
 */
export const CAM_END_Z = -(artworks.length - 1) * SLAB_SPACING + 3.4;
export const CAM_CONTRACT_DRIFT = 6; // slow push during contraction
export const SIGIL_Z = CAM_END_Z - CAM_CONTRACT_DRIFT - 13; // sigil plane ahead of resting camera
export const CAM_RETURN_PUSH = 26; // return: camera flies THROUGH the sigil

/** THE DIVE is a real fall: the rig is 17 units further back and drops in. */
export const CAM_DIVE_PREROLL = 17;

export interface SlabPlacement {
  work: Artwork;
  index: number;
  x: number;
  y: number;
  z: number;
  /** point the slab faces (a spot on the camera axis, slightly ahead) */
  lookX: number;
  lookY: number;
  lookZ: number;
  /** slab height in world units (width = height * texture aspect) */
  height: number;
  /** unique float phase */
  phase: number;
  floatSpeed: number;
  /**
   * The slab's OWN pose as the subject of a WIDE beat — not "facing the
   * camera". A painting that turns square-on the instant it owns the frame is
   * a sticker on a plane; these are volumes standing in a space, so the camera
   * passes them at an angle and their perspective visibly shears. Radians,
   * applied in YXZ so yaw is around world up.
   */
  yaw: number;
  pitch: number;
  roll: number;
  /** Per-work deviation from the formation plane in the PULL-BACK. */
  fYaw: number;
  fPitch: number;
  fRoll: number;
}

const sorted = [...artworks].sort((a, b) => a.order - b.order);

export const SLABS: SlabPlacement[] = sorted.map((work, i) => {
  const angle = i * GOLDEN_ANGLE;
  // radius breathes between ~5.0 and ~7.2 — satellites sit well off the frame
  // axis so the staged hero owns the middle of the picture instead of sharing it
  const radius = 6.1 + Math.sin(i * 2.39996) * 1.05;
  const x = Math.cos(angle) * radius;
  const y = Math.sin(angle) * radius * 0.62; // flattened helix — keeps art nearer eye level
  const z = -i * SLAB_SPACING;
  return {
    work,
    index: i,
    x,
    y,
    z,
    lookX: x * 0.12,
    lookY: y * 0.18,
    lookZ: z + 8.5,
    height: 3.35 + (work.featured ? 0.55 : 0) + ((i * 7) % 3) * 0.14,
    phase: i * 1.7 + 0.61,
    floatSpeed: 0.5 + ((i * 13) % 5) * 0.07,
    // consecutive beats shear in OPPOSITE directions, so two WIDE shots taken
    // 15% of the journey apart can never read as the same card field
    yaw: (i % 2 === 0 ? 1 : -1) * (0.30 + ((i * 5) % 4) * 0.042),
    pitch: (i % 3 === 0 ? 1 : -1) * (0.098 + ((i * 3) % 3) * 0.03),
    roll: (i % 2 === 0 ? 1 : -1) * (0.016 + ((i * 7) % 3) * 0.013),
    fYaw: (i % 2 === 0 ? -1 : 1) * (0.068 + ((i * 11) % 3) * 0.029),
    fPitch: (i % 4 < 2 ? 1 : -1) * (0.03 + ((i * 5) % 3) * 0.021),
    fRoll: (i % 3 === 0 ? 1 : -1) * (0.012 + ((i * 3) % 4) * 0.008),
  };
});

/* -------------------------------------------------------------- shot types */
// A chapter that holds one shot type for a third of the site is a contact
// sheet, not a film. THE COSMOS cuts between three:
//
//   WIDE      — the establishing constellation. Hero staged mid-frame at
//               ~60% fill, satellites in depth, caption bottom-left.
//   MACRO     — the camera is inside the canvas: the work bleeds past three
//               viewport edges, no satellites, caption in the clear right
//               column, top-right. You read brushwork, not composition.
//   PULL-BACK — the camera retreats until every work in the body resolves
//               onto ONE φ spiral — the curve the CONTRACTION then draws —
//               scaled by radius. No caption, no chips.
//
// Sequenced WIDE / MACRO / WIDE / MACRO / PULL-BACK across 18%–62% so that
// consecutive beats never repeat a framing.

/** Cosmos-phase (0–1) boundaries between the five shots. */
const SHOT_EDGES = [0.159, 0.341, 0.523, 0.727];
/** Half-width of the crossfade at each cut, in cosmos-phase units. */
const SHOT_BLEND = 0.035;

export interface ShotMix {
  wide: number;
  macro: number;
  pullback: number;
}

const sstep = (a: number, b: number, t: number): number => {
  const x = Math.min(1, Math.max(0, (t - a) / (b - a)));
  return x * x * (3 - 2 * x);
};

/** Blend weights of the three shot types at cosmos-phase progress `cp`. */
export function shotMix(cp: number, out: ShotMix): ShotMix {
  const b = SHOT_BLEND;
  const m1 =
    sstep(SHOT_EDGES[0] - b, SHOT_EDGES[0] + b, cp) *
    (1 - sstep(SHOT_EDGES[1] - b, SHOT_EDGES[1] + b, cp));
  const m2 =
    sstep(SHOT_EDGES[2] - b, SHOT_EDGES[2] + b, cp) *
    (1 - sstep(SHOT_EDGES[3] - b, SHOT_EDGES[3] + b, cp));
  const pb = sstep(SHOT_EDGES[3] - b, SHOT_EDGES[3] + b, cp);
  out.macro = Math.min(1, m1 + m2);
  out.pullback = pb;
  out.wide = Math.max(0, 1 - out.macro - out.pullback);
  return out;
}

/* ------------------------------------------------------- the descent curve */
// A camera that covers the corridor at a constant rate is a value being
// scrubbed. This chapter is FLOWN, and the pacing is CUT TO THE SHOTS rather
// than to an arbitrary oscillator:
//
//   WIDE      you are travelling. The establishing constellation goes by at
//             ~1.45x the mean rate — fast enough that the near-field passes
//             have something to be fast against.
//   MACRO     you are inside a canvas. The rig all but stops: ~0.85x.
//   PULL-BACK you are arriving. ~0.65x, decelerating into the composed figure.
//
// Because the profile is expressed through shotMix() the accelerations land
// exactly on the cuts by construction, and the SHOT_BLEND ramps give each
// change of pace a real ease rather than a step.
//
// The position curve is the normalised cumulative integral of that profile,
// built once as a table. It is monotone and pinned to 0 and 1, so the corridor
// still starts and ends exactly where the staging expects; and speed is read
// from the same table rather than differenced across frames, so it is
// frame-rate independent and still correct when the scroll is parked.

const CURVE_N = 512;
const posTable = new Float32Array(CURVE_N + 1);
const speedTable = new Float32Array(CURVE_N + 1);

(() => {
  const m: ShotMix = { wide: 1, macro: 0, pullback: 0 };
  const raw = new Float32Array(CURVE_N + 1);
  for (let i = 0; i <= CURVE_N; i++) {
    shotMix(i / CURVE_N, m);
    raw[i] = 0.62 + 0.76 * m.wide + 0.2 * m.macro;
  }
  let acc = 0;
  posTable[0] = 0;
  for (let i = 1; i <= CURVE_N; i++) {
    acc += (raw[i] + raw[i - 1]) / 2 / CURVE_N;
    posTable[i] = acc;
  }
  for (let i = 0; i <= CURVE_N; i++) {
    posTable[i] /= acc;
    speedTable[i] = raw[i] / acc; // mean 1 by construction
  }
})();

function sampleTable(table: Float32Array, cp: number): number {
  const x = Math.min(1, Math.max(0, cp)) * CURVE_N;
  const i = Math.min(CURVE_N - 1, Math.floor(x));
  return table[i] + (table[i + 1] - table[i]) * (x - i);
}

/** 0-1 position along the corridor at cosmos-phase progress `cp`. */
export function descentCurve(cp: number): number {
  return sampleTable(posTable, cp);
}

/** Rate of travel at `cp`, normalised so 1 = the corridor's mean rate. */
export function descentSpeed(cp: number): number {
  return sampleTable(speedTable, cp);
}

/* -------------------------------------------- THE ARCHIVE ON THE PHI SPIRAL */
//
// The body of work does not land in rows. It lands ON THE CURVE.
//
// A contact sheet with jitter says the arrangement is a container. This chapter
// has an arrangement algorithm stamped all over its own frame — √5, φ, 137.508°
// — and fifteen scroll-percent later the CONTRACTION draws that curve flawlessly.
// So the fifteen works are placed on it, and the placement is DERIVED end to end:
//
//   ANGLE   consecutive works step a THIRD of the golden angle, so every third
//           work stands exactly 137.508° round the curve and the fifteen close
//           on five complete golden-angle triads (5 · 3 — the √5 and the φ the
//           glyph layer is already printing).
//   RADIUS  r = e^(bθ) with b = ln φ / π — radius × φ every half turn. This is
//           the SAME b, the SAME phase and the SAME winding sense as the sigil
//           stroke in sigil-form.ts, so the archive and the contraction are one
//           curve seen twice, not two curves that resemble each other.
//   SCALE   a work's area falls off as r^0.7. Because a logarithmic spiral is
//           self-similar, the gap to the next work is a FIXED fraction of the
//           local radius — so scaling with radius is the only scaling that
//           keeps every work in a chamber of its own size. The hierarchy is
//           read off the curve instead of being asserted.
//   DEPTH   the eye of the spiral sits ARCHIVE_DEPTH further from the lens than
//           its outer end: a shallow funnel whose throat is exactly the point
//           the CONTRACTION collapses into.
//
// Aspect is normalised by AREA, not by height — a 2:1 panel and a 1:2.6 column
// carry the same visual weight at the same radius — and then boxed at
// ARCHIVE_CAP so no single canvas can be five times its neighbour for no
// legible reason.
//
// The whole figure is published (ARCHIVE, ARCHIVE_* and formationPlane below)
// so the CONTRACTION can consume the identical geometry.

/** Distance ahead of the camera at which the archive is assembled. */
export const FORMATION_D = 14;

export const PHI = (1 + Math.sqrt(5)) / 2;
/** Growth: radius × φ every HALF turn. Shared verbatim with the sigil stroke. */
export const PHI_SPIRAL_B = Math.log(PHI) / Math.PI;
/** Angular phase of the curve. Shared verbatim with the sigil stroke. */
export const PHI_SPIRAL_PHASE = Math.PI * 0.72;
/** Angular step between consecutive slots — one THIRD of the golden angle, so
 *  every third work stands exactly 137.508° round the curve and the fifteen
 *  close on five complete golden-angle triads. */
export const ARCHIVE_STEP = GOLDEN_ANGLE / 3;
/** θ of the OUTERMOST work. Slot k sits at ARCHIVE_THETA_MAX − k·ARCHIVE_STEP,
 *  so slot 0 is the outer arm and slot 14 is the eye of the spiral. */
export const ARCHIVE_THETA_MAX = (SLABS.length - 1) * ARCHIVE_STEP;
/** Exponent of the radius→size law. 1 would be exact self-similarity; 0.72
 *  lifts the inner works just enough to stay legible while keeping every work
 *  inside its own chamber — solved, not guessed: no two quads overlap. */
export const ARCHIVE_FALLOFF = 0.9;
/** Geometric-mean size of the OUTERMOST work, in spiral units. */
export const ARCHIVE_SIZE = 0.52;
/** No work may exceed this multiple of its own geometric-mean size on an axis. */
export const ARCHIVE_CAP = 1.3;
/** Funnel depth: the eye sits this far behind the outer end, in spiral units. */
export const ARCHIVE_DEPTH = 0.2;
/** Fraction of the frustum half-height the figure is allowed to reach. */
const ARCHIVE_SAFE = 0.455;

/**
 * WHICH WORK GETS WHICH SLOT.
 *
 * Not the corridor order. Replaying the corridor at a distance would put the
 * works you have just been shown back in the sequence you were just shown them
 * in — and it stacks near-neighbours (two of these files are literally the same
 * scan) side by side at the two largest slots.
 *
 * They are DEALT by the golden-angle sequence itself: order the works by
 * frac(k · 137.508° / 360°) and read them out. The same constant that sets the
 * spacing sets the order, and because that sequence is the canonical
 * low-discrepancy one, no two corridor neighbours can land next to each other
 * on the curve. The archive is a composition, not a rerun.
 */
export const ARCHIVE_DEAL: number[] = (() => {
  const frac = GOLDEN_ANGLE / (Math.PI * 2); // 1 − 1/φ = 0.381966…
  return SLABS.map((_, k) => ({ k, f: (k * frac) % 1 }))
    .sort((a, b) => a.f - b.f)
    .map((e) => e.k);
})();
/** Inverse of ARCHIVE_DEAL: work index → slot index. */
const SLOT_OF: number[] = (() => {
  const out = new Array<number>(ARCHIVE_DEAL.length);
  ARCHIVE_DEAL.forEach((work, slot) => {
    out[work] = slot;
  });
  return out;
})();

export interface ArchiveSlot {
  /** the WORK this slot belongs to — ARCHIVE is indexed by work, not by slot */
  index: number;
  /** position along the curve: 0 = outer arm, 14 = the eye */
  slot: number;
  /** angle along the curve, radians */
  theta: number;
  /** normalised radius — 1 at the outer end, ARCHIVE_R_MIN at the eye */
  r: number;
  /** position in SPIRAL UNITS; the origin is the eye of the spiral, which the
   *  staging puts on the camera axis — exactly where the sigil then forms */
  x: number;
  y: number;
  z: number;
  /** geometric-mean size of this work, in spiral units */
  size: number;
}

/** A point on the archive spiral, in spiral units. */
export function archiveSpiralPoint(
  theta: number,
  out: { x: number; y: number; z: number },
): void {
  const r = Math.exp(PHI_SPIRAL_B * (theta - ARCHIVE_THETA_MAX));
  out.x = Math.cos(theta + PHI_SPIRAL_PHASE) * r;
  out.y = Math.sin(theta + PHI_SPIRAL_PHASE) * r;
  out.z = -ARCHIVE_DEPTH * (1 - Math.min(1, r));
}

export const ARCHIVE: ArchiveSlot[] = (() => {
  const p = { x: 0, y: 0, z: 0 };
  return SLABS.map((_, k) => {
    const slot = SLOT_OF[k];
    const theta = ARCHIVE_THETA_MAX - slot * ARCHIVE_STEP;
    archiveSpiralPoint(theta, p);
    const r = Math.exp(PHI_SPIRAL_B * (theta - ARCHIVE_THETA_MAX));
    return {
      index: k,
      slot,
      theta,
      r,
      x: p.x,
      y: p.y,
      z: p.z,
      size: ARCHIVE_SIZE * Math.pow(r, ARCHIVE_FALLOFF),
    };
  });
})();

/** Radius at the eye of the spiral (the innermost slot). */
export const ARCHIVE_R_MIN = Math.exp(-PHI_SPIRAL_B * ARCHIVE_THETA_MAX);

/**
 * Half-extent of the figure from the eye of the spiral, in spiral units.
 * Solved against the CAP box rather than against live texture aspects, so the
 * containment is deterministic and cannot move when a texture finishes loading.
 */
export const ARCHIVE_EX = ARCHIVE.reduce(
  (m, s) => Math.max(m, Math.abs(s.x) + (s.size * ARCHIVE_CAP) / 2),
  0,
);
export const ARCHIVE_EY = ARCHIVE.reduce(
  (m, s) => Math.max(m, Math.abs(s.y) + (s.size * ARCHIVE_CAP) / 2),
  0,
);
/** Spiral units → world, as a fraction of the frame HEIGHT at FORMATION_D.
 *  One isotropic scale: a spiral squashed on one axis is not a golden spiral. */
export const ARCHIVE_UNIT = ARCHIVE_SAFE / ARCHIVE_EY;

/**
 * The stroke itself, sampled OUTER-FIRST so a progressive draw sweeps the
 * widest arc first and winds in — the same reading order as the sigil's spiral.
 * `lead` extends the curve past the outermost work; `tail` keeps winding past
 * the innermost one, into the throat the contraction collapses through.
 */
export function archiveSpiralPath(n: number, lead = 0.34, tail = 7.2): Float32Array {
  const out = new Float32Array(n * 3);
  const p = { x: 0, y: 0, z: 0 };
  const hi = ARCHIVE_THETA_MAX + lead;
  const lo = -tail;
  for (let i = 0; i < n; i++) {
    const theta = hi + (lo - hi) * (i / (n - 1));
    archiveSpiralPoint(theta, p);
    out[i * 3] = p.x;
    out[i * 3 + 1] = p.y;
    out[i * 3 + 2] = p.z;
  }
  return out;
}

/* ------------------------------------------- the archive's SECOND vantage */
// The composed spiral is the best frame in the chapter, so it is not thrown
// away — it is walked around. Once the figure has been read square-on, the rig
// drops BELOW it and closes: the plane rakes back, yaws off-axis AND ROLLS BY
// EXACTLY ONE WORK-POSITION (ARCHIVE_STEP), so the whole archive visibly WINDS
// — the one move only a spiral can make, and one no re-zoom can fake. The works
// nearest the outer arm shear past the bottom of the frame as we come up under
// them.

/** Cosmos-phase window over which the second vantage takes over. */
export const VANTAGE_IN = 0.855;
export const VANTAGE_OUT = 1.0;
/** Distance to the figure at the end of the move (from FORMATION_D). */
export const VANTAGE_D = 11.6;
/** Plane tilt (about X, negative = top rakes AWAY: we are underneath). */
export const VANTAGE_PITCH = -0.5;
/** Plane yaw (about Y) — the figure is no longer square to the lens. */
export const VANTAGE_YAW = 0.26;
/** In-plane roll: the spiral turns by one work-position as we come round. */
export const VANTAGE_ROLL = ARCHIVE_STEP;
/** How far the figure's centre moves in frame, as a fraction of the frame.
 *  Slightly NEGATIVE: the spiral already leans up-right of its own eye, so a
 *  positive rise threw the largest work off the top of the picture. */
export const VANTAGE_RISE = -0.045;

/**
 * THE WORLD TRANSFORM OF THE ARCHIVE PLANE — the contract the CONTRACTION
 * consumes. Everything the sigil needs to start from where the archive ended
 * is here: where the eye of the spiral is in world space, how the plane is
 * oriented, and how many world units one spiral unit is worth.
 *
 * The footprint is solved against the frustum at FORMATION_D and then held
 * FIXED in world units while the distance closes, so the second vantage
 * genuinely grows in frame instead of being angularly pinned.
 */
export interface FormationPlane {
  /** world position of the eye of the spiral */
  cx: number;
  cy: number;
  cz: number;
  /** plane orientation, radians, applied in THREE's YXZ order (Ry·Rx·Rz) */
  pitch: number;
  yaw: number;
  roll: number;
  /** world units per spiral unit */
  unit: number;
  /** lens → plane origin, world units */
  dist: number;
  /** 0-1 weight of the second vantage */
  thru: number;
}

export function makeFormationPlane(): FormationPlane {
  return { cx: 0, cy: 0, cz: 0, pitch: 0, yaw: 0, roll: 0, unit: 1, dist: FORMATION_D, thru: 0 };
}

export function formationPlane(
  camX: number,
  camY: number,
  camZ: number,
  fovDeg: number,
  thru: number,
  out: FormationPlane,
): FormationPlane {
  const baseH = 2 * FORMATION_D * Math.tan((fovDeg * Math.PI) / 360);
  out.unit = baseH * ARCHIVE_UNIT;
  out.dist = FORMATION_D + (VANTAGE_D - FORMATION_D) * thru;
  out.pitch = VANTAGE_PITCH * thru;
  out.yaw = VANTAGE_YAW * thru;
  out.roll = VANTAGE_ROLL * thru;
  out.cx = camX;
  out.cy = camY + VANTAGE_RISE * baseH * thru;
  out.cz = camZ - out.dist;
  out.thru = thru;
  return out;
}

/** Spiral-unit point → world, through the plane's pose. YXZ: roll, pitch, yaw. */
export function planeToWorld(
  pl: FormationPlane,
  lx: number,
  ly: number,
  lz: number,
  out: { x: number; y: number; z: number },
): void {
  const u = pl.unit;
  const cr = Math.cos(pl.roll);
  const sr = Math.sin(pl.roll);
  const ax = (lx * cr - ly * sr) * u;
  const ay = (lx * sr + ly * cr) * u;
  const az = lz * u;
  const cp = Math.cos(pl.pitch);
  const sp = Math.sin(pl.pitch);
  const by = ay * cp - az * sp;
  const bz = ay * sp + az * cp;
  const cy = Math.cos(pl.yaw);
  const sy = Math.sin(pl.yaw);
  out.x = pl.cx + ax * cy + bz * sy;
  out.y = pl.cy + by;
  out.z = pl.cz - ax * sy + bz * cy;
}

/* ------------------------------------------------------ near-field passes */
// The difference between a flown camera and a zoomed one is what happens at
// the EDGE of the lens. These are full-size canvases hung off the corridor
// axis: they enter small near the frame edge, swell as the rig closes, shear
// hard across the periphery, and leave the frame sideways. They never fade in
// place and they never cross the middle of the picture — a per-frame edge gate
// (see NearPass.tsx) keeps them out of the staged subject's third entirely.

export interface NearPlate {
  file: string;
  x: number;
  y: number;
  z: number;
  /** plate height in world units — deliberately large; these are close */
  height: number;
  yaw: number;
  pitch: number;
  roll: number;
  /** extra roll per world unit of approach: the plate turns as it goes by */
  spin: number;
  /** peak opacity — these are periphery, never the subject */
  alpha: number;
}

/**
 * Cosmos-phase moments at which a pass should be HAPPENING. Chosen inside the
 * two WIDE windows (0–0.159 and 0.341–0.523) and spaced about one visible
 * window apart, so a pass is punctuation — one canvas at a time raking the
 * periphery — rather than a hail of them.
 */
const NEAR_VIEW_CP = [0.02, 0.07, 0.115, 0.33, 0.375, 0.42, 0.465];
/** How far ahead of the camera a plate sits at the moment it is seen. */
const NEAR_LEAD = 9.5;
/**
 * Three more in the DIVE pre-roll, as fractions of the pre-roll above the
 * mouth of the corridor. They are what makes the handover read as a FALL: the
 * hero image parts and there is already something blowing past the lens.
 */
const NEAR_DIVE_Z = [0.72, 0.45, 0.28];

function nearPrng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const NEAR_PLATES: NearPlate[] = (() => {
  const rnd = nearPrng(1370);
  const span = CAM_END_Z - CAM_START_Z;
  const out: NearPlate[] = [];
  const zAt = (cp: number) => CAM_START_Z + span * descentCurve(cp);
  const zs = [
    ...NEAR_DIVE_Z.map((f) => CAM_START_Z + CAM_DIVE_PREROLL * f),
    ...NEAR_VIEW_CP.map((cp) => zAt(cp) - NEAR_LEAD),
  ];
  for (let k = 0; k < zs.length; k++) {
    // strongly off-axis, alternating sides, flattened like the helix so most
    // of them rake the left and right edges rather than the top and bottom
    const ang = k * GOLDEN_ANGLE * 1.7 + 0.85;
    const radius = 6.2 + (k % 3) * 1.1 + rnd() * 0.7;
    // Through the DIVE the hero image still owns the left of the picture, so
    // the pre-roll plates are placed by side rather than by the helix angle:
    // a plate blowing past behind the artwork is a plate nobody sees.
    const dive = k < NEAR_DIVE_Z.length;
    const side = dive ? (k % 2 === 0 ? 1 : -1) : Math.cos(ang) >= 0 ? 1 : -1;
    // Tighter radius through the pre-roll: the rig is still far from the
    // corridor wall there, so a plate hung as wide as a corridor plate would
    // sail past entirely outside the frustum and be paid for but never seen.
    const x = dive ? side * (4.9 + (k % 2) * 0.8) : Math.cos(ang) * radius;
    const y = Math.sin(ang) * radius * (dive ? 0.26 : 0.5);
    out.push({
      file: sorted[(k * 5 + 2) % sorted.length].file,
      x,
      y,
      z: zs[k],
      height: 5.2 + (k % 4) * 1.3 + rnd() * 0.8,
      // inner edge turned toward the lens: a poster on a wall you drive past
      yaw: -side * (0.5 + rnd() * 0.26),
      pitch: (y >= 0 ? 1 : -1) * (0.1 + rnd() * 0.12),
      roll: (k % 2 === 0 ? 1 : -1) * (0.05 + rnd() * 0.08),
      spin: (k % 2 === 0 ? -1 : 1) * (0.009 + rnd() * 0.009),
      alpha: 0.3 + rnd() * 0.12,
    });
  }
  return out;
})();

/** Which slab is nearest a given camera z (the subject sits SWEET_D ahead). */
export function nearestSlabIndex(camZ: number): number {
  const i = Math.round((-camZ + SWEET_D) / SLAB_SPACING);
  return Math.min(SLABS.length - 1, Math.max(0, i));
}

/** 0-1 travel along the whole slab corridor — drives the void's color arc. */
export function descentAt(camZ: number): number {
  const span = CAM_START_Z - CAM_END_Z;
  return Math.min(1, Math.max(0, (CAM_START_Z - camZ) / span));
}

/* ------------------------------------------------------ apps constellation */

export interface AppNode {
  name: string;
  url: string;
  desc: string;
  x: number;
  y: number;
  z: number;
  /** polyhedron flavor 0..2 */
  kind: number;
  /** mono node mark shown on the label plate — matches the wire solid */
  glyph: string;
  phase: number;
}

/** Node marks, indexed by AppNode.kind. */
export const APP_GLYPHS = ['◇', '◆', '△'];

const APPS_RAW = [
  { name: '137 Cipher', url: 'https://137-cipher.vercel.app', desc: 'Ancient script translator' },
  { name: '137 Geometry', url: 'https://137-geometry.vercel.app', desc: 'Sacred geometry generator' },
  { name: 'Harmonic Arcana', url: 'https://harmonic-arcana.vercel.app', desc: 'Tarot meets music theory' },
  { name: '137 Cycles', url: 'https://137-cycles.vercel.app', desc: 'Life cycle calculator' },
  { name: '137 Pad', url: 'https://137-pad.vercel.app', desc: 'Infinite canvas notepad' },
  { name: 'Lyric Lab', url: 'https://lyric-lab.vercel.app', desc: 'AI lyric assistant' },
];

const helixSpan = (SLABS.length - 1) * SLAB_SPACING;

/**
 * Corridor fractions of the six waypoints. Chosen so every app comes on beat
 * during one of the two WIDE shots — a chip has no business sharing the frame
 * with a MACRO canvas or with the composed triangle of the PULL-BACK, so the
 * chip layer is suppressed there entirely and the nodes are placed to suit.
 *
 * THE SIX WINDOWS ARE DISJOINT, BECAUSE ONLY ONE CHIP IS EVER DRAWN.
 * Labels.tsx shows exactly one callout at a time (two bracketing a caption
 * collapses the hierarchy) and awards it to the strongest candidate. The
 * previous fractions clustered three nodes inside global 0.180–0.237 and three
 * more inside 0.318–0.383, so five of the six spent their entire presence
 * window losing to a neighbour: measured over an 80-sample sweep of the whole
 * cosmos band, FOUR of the six apps never rendered at any opacity, ever, and
 * the two that did were non-deterministic between runs.
 *
 * These are solved rather than picked: each fraction places its node so the
 * chip's presence peak (rel ≈ 9.25 world units, the centre of the 7.5→11 plateau
 * in Labels) lands on a stated beat inside a WIDE shot, and the beats are spaced
 * by more than the winner-take-all crossover, against the real descentCurve and
 * the real gate.
 *
 * The split is 1 + 5 rather than 3 + 3 because the FIRST wide shot only has one
 * usable beat: measured, a callout peaking before global ≈ 0.224 is refused for
 * its whole window — the chapter's opening is still handing over from the dive
 * and the placement search can find nowhere honourable for the plate. So the
 * opening carries one waypoint and the second wide shot carries the rest.
 *
 * MEASURED after: five of the six now render, peaking at 0.92–1.00 opacity, each
 * over a distinct 1.5–3% slice of the track (was two of six). 137 Cycles is
 * still refused — its own geometry docks off the safe frame at every beat tried
 * (0.5570 / 0.5765 / 0.5960), and moving it far enough to place it evicts its
 * neighbour. Refusing is the correct behaviour; the gap is honest.
 */
const APP_T = [0.2017, 0.4978, 0.5371, 0.5765, 0.6158, 0.6552];

export const APP_NODES: AppNode[] = APPS_RAW.map((app, k) => {
  // Between slab clusters, and deliberately OFF the frame axis: the middle of
  // the picture belongs to the staged painting, so waypoints live in the
  // periphery where their label plates have empty screen to land in.
  const t = APP_T[k];
  const angle = ((t * helixSpan) / SLAB_SPACING) * GOLDEN_ANGLE + Math.PI;
  const radius = 5.6 + (k % 2) * 1.4;
  const kind = k % 3;
  // Waypoints live HIGH and to one side, alternating left/right. The caption
  // owns the bottom of the frame and the painting owns the middle, so that is
  // the only band where a chip can be present without arguing with either.
  const side = k % 2 === 0 ? 1 : -1;
  return {
    ...app,
    x: side * (3 + Math.abs(Math.cos(angle)) * radius * 0.6),
    y: 1.2 + Math.abs(Math.sin(angle)) * radius * 0.32,
    z: -t * helixSpan + 1.8,
    kind,
    glyph: APP_GLYPHS[kind],
    phase: k * 2.1,
  };
});

/* ------------------------------------------------------------ sigil paths */
// The 137 sigil's geometry used to be sampled here as bare polylines
// (sampleSpiral / sampleTriangle / sampleEye / sampleCircle). All four are gone:
// the mark is drawn by sigil-form.ts as pressure-varying chalk ribbons, and
// nothing had imported these since. They are deleted rather than left dormant
// because sampleSpiral carried a SECOND, DIFFERENT growth constant —
// ln φ / (π/2), φ per quarter turn — while the archive and the drawn sigil are
// both ln φ / π, φ per half turn. The whole point of the archive is that it and
// the contraction are ONE curve seen twice; a spare copy of the curve with a
// different b sitting in the same file is how that stops being true.
// The single constant is PHI_SPIRAL_B above; sigil-form.ts imports it.

/* ------------------------------------------------------- equation strings */

export const GLYPHS: string[] = [
  'α', 'ψ', '∆', '∮', 'ℏ', 'λ', 'Ω', 'π',
  'φ', '√5', '∞', '∂', 'Σ', 'θ', 'μ', 'ε₀',
  '137', '1/137', 'α⁻¹', 'e²', 'ℏc', '∇²', 'ζ(s)', 'χ',
  'η', 'ρ', 'τ', 'γ', 'δ', 'κ', 'ξ', 'σ',
  'ω', '∫', '≈', '±', '∝', 'ℓ', 'ħω', 'Λ',
  'c²', 'iℏ∂ψ', 'E=ħν', '4πε₀', 'φ²=φ+1', '.036', 'θ=137.5°', 'eiπ',
];
