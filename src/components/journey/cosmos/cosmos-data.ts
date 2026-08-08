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
//               into ONE composed triangle (the 137 sigil, prefigured), each
//               work small. No caption, no chips.
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

/* ---------------------------------------------------- pull-back formation */

/** Distance ahead of the camera at which the composed triangle is assembled. */
export const FORMATION_D = 14;
/** Triangle footprint as a fraction of the frustum at FORMATION_D. */
export const FORMATION_W = 0.72;
export const FORMATION_H = 0.62;
/** Height of a single work in the formation, as a fraction of the frame. */
export const FORMATION_ITEM = 0.088;

export interface FormationSlot {
  /** -0.5 .. 0.5 across the triangle footprint */
  fx: number;
  /** +0.5 (apex) .. -0.5 (base) */
  fy: number;
}

/**
 * Rows of 1, 2, 3, … — with 15 works this closes exactly on a five-row
 * equilateral triangle, apex up: the same figure the CONTRACTION then draws.
 */
function buildFormation(n: number): FormationSlot[] {
  const rows: number[] = [];
  let done = 0;
  let r = 1;
  while (done < n) {
    const take = Math.min(r, n - done);
    rows.push(take);
    done += take;
    r++;
  }
  const R = rows.length;
  const out: FormationSlot[] = [];
  for (let ri = 0; ri < R; ri++) {
    const t = R > 1 ? ri / (R - 1) : 0;
    const halfW = 0.5 * t;
    const count = rows[ri];
    for (let j = 0; j < count; j++) {
      const u = count > 1 ? j / (count - 1) : 0.5;
      out.push({ fx: count > 1 ? -halfW + 2 * halfW * u : 0, fy: 0.5 - t });
    }
  }
  return out;
}

export const FORMATION: FormationSlot[] = buildFormation(SLABS.length);

/* ------------------------------------------- the formation's SECOND vantage */
// The composed triangle is the best frame in the chapter, so it is not thrown
// away — it is walked around. Once the figure has been read square-on, the rig
// drops BELOW it and closes: the plane tilts back, yaws off-axis, and every
// work in it turns with the plane. Same formation, genuinely different vantage
// — and the works nearest the base shear past the bottom of the frame as we
// come up under them.

/** Cosmos-phase window over which the second vantage takes over. */
export const VANTAGE_IN = 0.855;
export const VANTAGE_OUT = 1.0;
/** Distance to the formation at the end of the move (from FORMATION_D). */
export const VANTAGE_D = 11.2;
/** Plane tilt (about X, negative = top rakes AWAY: we are underneath). */
export const VANTAGE_PITCH = -0.46;
/** Plane yaw (about Y) — the triangle is no longer square to the lens. */
export const VANTAGE_YAW = 0.19;
/** How far the formation's centre rises in frame, as a fraction of its own height. */
export const VANTAGE_RISE = 0.11;

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
 */
const APP_T = [0.047, 0.102, 0.156, 0.429, 0.494, 0.56];

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
// The 137 sigil: golden spiral resolving into triangle + eye. Everything is
// sampled as dense polylines so lines can draw progressively (setDrawRange)
// and dust particles can target points along the same curves.

const PHI = (1 + Math.sqrt(5)) / 2;
const SPIRAL_B = Math.log(PHI) / (Math.PI / 2); // true golden spiral growth

export function sampleSpiral(n: number): Float32Array {
  // r = a·e^(bθ), θ ∈ [0, 3.6π], scaled so max radius ≈ 3.15
  const out = new Float32Array(n * 3);
  const thetaMax = Math.PI * 3.6;
  const a = 3.15 / Math.exp(SPIRAL_B * thetaMax);
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const theta = t * thetaMax;
    const r = a * Math.exp(SPIRAL_B * theta);
    out[i * 3] = Math.cos(theta + Math.PI * 0.72) * r;
    out[i * 3 + 1] = Math.sin(theta + Math.PI * 0.72) * r;
    out[i * 3 + 2] = 0;
  }
  return out;
}

export function sampleTriangle(n: number): Float32Array {
  // equilateral, apex up, circumradius 2.7, centered slightly low so the
  // eye sits at the centroid of the visual mass
  const out = new Float32Array(n * 3);
  const R = 2.7;
  const cy = -0.42;
  const corners: [number, number][] = [];
  for (let c = 0; c < 3; c++) {
    const a = Math.PI / 2 + (c * 2 * Math.PI) / 3;
    corners.push([Math.cos(a) * R, Math.sin(a) * R + cy]);
  }
  for (let i = 0; i < n; i++) {
    const t = (i / (n - 1)) * 3; // 0..3 around perimeter
    const seg = Math.min(2, Math.floor(t));
    const f = t - seg;
    const [ax, ay] = corners[seg];
    const [bx, by] = corners[(seg + 1) % 3];
    out[i * 3] = ax + (bx - ax) * f;
    out[i * 3 + 1] = ay + (by - ay) * f;
    out[i * 3 + 2] = 0;
  }
  return out;
}

export function sampleEye(n: number): Float32Array {
  // almond lens: two mirrored circular arcs, width 2.5, centered at origin
  const out = new Float32Array(n * 3);
  const w = 1.25; // half width
  const bulge = 0.62;
  const half = Math.floor(n / 2);
  for (let i = 0; i < n; i++) {
    const top = i < half;
    const k = top ? i / (half - 1) : (i - half) / (n - half - 1);
    const t = top ? k : 1 - k; // continuous loop
    const x = -w + t * 2 * w;
    const y = Math.sin(t * Math.PI) * bulge * (top ? 1 : -1);
    out[i * 3] = x;
    out[i * 3 + 1] = y;
    out[i * 3 + 2] = 0;
  }
  return out;
}

export function sampleCircle(n: number, r: number): Float32Array {
  const out = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const a = (i / (n - 1)) * Math.PI * 2;
    out[i * 3] = Math.cos(a) * r;
    out[i * 3 + 1] = Math.sin(a) * r;
    out[i * 3 + 2] = 0;
  }
  return out;
}

/* ------------------------------------------------------- equation strings */

export const GLYPHS: string[] = [
  'α', 'ψ', '∆', '∮', 'ℏ', 'λ', 'Ω', 'π',
  'φ', '√5', '∞', '∂', 'Σ', 'θ', 'μ', 'ε₀',
  '137', '1/137', 'α⁻¹', 'e²', 'ℏc', '∇²', 'ζ(s)', 'χ',
  'η', 'ρ', 'τ', 'γ', 'δ', 'κ', 'ξ', 'σ',
  'ω', '∫', '≈', '±', '∝', 'ℓ', 'ħω', 'Λ',
  'c²', 'iℏ∂ψ', 'E=ħν', '4πε₀', 'φ²=φ+1', '.036', 'θ=137.5°', 'eiπ',
];
