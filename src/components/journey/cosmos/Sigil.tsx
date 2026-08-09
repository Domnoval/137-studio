'use client';

// cosmos/Sigil.tsx — the CONTRACTION climax (62–78%).
//
// The beat, in order:
//   1. THE WARP (60–71%). The corridor turns into velocity. Several hundred
//      streaks fall inward along golden-spiral trajectories — every one with
//      its own speed, so trail length spreads ~10x — rendered as tapered
//      screen-space ribbons: bright head, vanishing tail, 0.5–2.5px depending
//      on depth. Density falls away toward the middle, so a throat opens on
//      the axis. Meanwhile the golden spiral draws itself from the OUTSIDE IN,
//      sweeping the whole frame and winding down onto the eye.
//      The camera axis, the streak convergence point and the post-chain's
//      warp centre are all published from ONE point (this group's centre), so
//      the whole frame — receding artwork included — reads as one motion.
//   2. THE RESOLUTION (71–76.5%). The streaks land and the mark writes itself
//      on in struck chalk: the armature, then Michael's own eye (socket, brow,
//      filaments, off-centre iris, catchlight), then the drips. Nothing cuts.
//   3. APEX (76.3–77.2%) — the finished mark stands still at full luminance
//      and full scale with the constant measured off its own base — then from
//      77.2% it rushes the camera and DISSOLVES into the dust copy of itself,
//      which the veil then closes over into RETURN.
//
// Progress is read RAW from the scroll position (Lenis already smooths the
// scroll itself); the context's extra per-frame lerp is frame-rate dependent
// and would slide the climax off-beat on slow machines.

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { cosmosShared, smoothstep } from './shared';
import { contraction, srgbToLinear } from './contraction-state';
import { buildRibbon } from './chalk-ribbon';
import {
  ARCHIVE,
  ARCHIVE_THETA_MAX,
  ARCHIVE_UNIT,
  PHI_SPIRAL_B,
  PHI_SPIRAL_PHASE,
} from './cosmos-data';
import {
  armatureStrokes,
  socketStrokes,
  lashStrokes,
  irisStrokes,
  catchlightStrokes,
  dripStrokes,
  spiralStroke,
  markTargets,
  BASE_X0,
  BASE_X1,
  BASE_Y,
  EYE_CY,
} from './sigil-form';
import type { Stroke } from './chalk-ribbon';
import { getDustSprite } from './textures';

/* ------------------------------------------------------------ raw progress */

let maxScroll = 1;
let maxAge = 999;
function rawProgress(): number {
  if (typeof window === 'undefined') return 0;
  if (maxAge++ > 45) {
    maxAge = 0;
    maxScroll = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
  }
  const v = window.scrollY / maxScroll;
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/* ------------------------------------------------------------------ timing */

// Starts BEFORE the contraction phase boundary on purpose: the last painting is
// still dissolving at 0.60, so the warp takes the frame over from it instead of
// leaving a dead beat between them. cp = (p - 0.6) / 0.19.
const C_START = 0.6;
// ONE APEX, NOT TWO.
// The climax used to write itself on across 0.60–0.73 and hold to 0.752, which
// put a HALF-DRAWN, low-luminance triangle-and-eye on screen at ~69% and the
// finished one at ~77% — the same image, stated twice, the first time weakly.
// The span is now stretched so the two beats are different pictures:
//   0.60–0.71  THE WARP. Velocity only: hundreds of tapered streaks falling in
//              on golden-spiral trajectories with the spiral itself sweeping
//              the whole frame. No mark. Nothing to restate.
//   0.70–0.76  the mark strikes itself on.
//   0.76–0.78  THE APEX (a real ~2% beat, ~14vh of scroll) — full luminance, full scale, the constant set on it
//              as a measured dimension line (Contraction.tsx). This is the
//              loudest frame in the site and it happens exactly once.
//   0.78–0.80  rush + dissolve, veil closes, hand-off to RETURN.
const C_SPAN = 0.19;
const RUSH_START = 0.78;
const RUSH_SPAN = 0.022;

// world units → the mark reads ~74% of viewport height (was 7.2 ≈ 62%). The
// apex is allowed to be the biggest thing on the site; at this distance the
// triangle still clears the HUD rail by >290px on a 1440 frame.
const HOLD_DIST = 6.6;
const FAR_DIST = 34;

const PULSE_AT = 0.86;
const PULSE_SIGMA = 0.03;

/* ------------------------------------------------- NOTHING CROSSES THE RULE */
//
// The apex frame sets the constant on a MEASURED DIMENSION RULE spanning the
// mark's own base. MEASURED, desktop 1440×900 at 77%: the base projected to
// y=655 and the rule to y=688, while two of the three wet-paint drips ran to
// 0.38 and 0.67 world units below the base — 50px and 89px — so both went
// straight THROUGH the rule and one continued past the caption. On the phone,
// where the whole beat is 40% the size, the same drip ran through the caption
// row itself.
//
// The drips stay, because paint running off the socket is the mark's best
// detail. They are RUN SHORT instead: each is rescaled along its own axis so
// its tip lands on a floor 0.30 units under the base — never truncated, so the
// pressure profile and its beaded tip survive intact — and Contraction.tsx sets
// the rule 0.56 units under the base, in the mark's own units. MEASURED after:
// nearest ink above the rule went from 1px to 37px of clear frame, at every
// viewport by construction rather than at one.
export const DRIP_FLOOR = BASE_Y - 0.3;
/** Gap from the base to the dimension rule, in the MARK's units. */
export const RULE_GAP = 0.56;

/** Rescale each stroke's descent so its lowest point lands on `floorY`. */
export function floorStrokes(strokes: Stroke[], floorY: number): Stroke[] {
  return strokes.map((s) => {
    const n = s.pts.length / 3;
    let lo = Infinity;
    for (let i = 0; i < n; i++) lo = Math.min(lo, s.pts[i * 3 + 1]);
    const y0 = s.pts[1];
    if (lo >= floorY || y0 <= floorY) return s;
    const k = (floorY - y0) / (lo - y0);
    const pts = new Float32Array(s.pts);
    for (let i = 0; i < n; i++) {
      pts[i * 3 + 1] = y0 + (pts[i * 3 + 1] - y0) * k;
    }
    return { pts, w: s.w };
  });
}

const CHALK = new THREE.Color('#e8e4dc');
const RED = new THREE.Color('#c41230');

// The ground under the climax: a shade cooler through the velocity, resolving
// to a warmer, denser dark for the beat itself. #090b12 was a BLUE-black —
// blue 18 against red 9, measurably a second colour in a site whose whole claim
// is one — and it dragged the frame's darkest pixels to (11,10,15) through the
// middle of the contraction. #0c0b0d is the same temperature MOVE, one twelfth
// the chroma: still cooler than #120c0b, still never pure black, still no
// second accent.
const GROUND_COLD = srgbToLinear('#0c0b0d');
const GROUND_WARM = srgbToLinear('#120c0b');

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/* --------------------------------------- THE ARCHIVE → CONTRACTION CONTRACT */
//
// The fifteen works are laid out ON the φ spiral (ARCHIVE in cosmos-data.ts:
// r = e^(bθ), b = ln φ / π, phase 0.72π, one third of the golden angle between
// consecutive works). The contraction is not an interlude that happens to
// contain a spiral — it is THAT spiral collapsing. So the velocity beat is
// derived from the archive's own exports rather than from a fresh set of
// random radii:
//
//   · every streak launches from a point ON the archive curve, and 60 of them
//     launch from the fifteen work positions themselves — the works are what
//     you see falling in,
//   · every streak's flight is a segment of the same logarithmic spiral,
//     r = R0·e^(−b·Δθ), wound inward toward the eye (the shader's traj()),
//   · and the drawn spiral stroke is scaled so that at the hand-off it is
//     geometrically the archive's own arm, continued.
//
// SCALE. The archive's outer arm subtends 2·ARCHIVE_UNIT of the frame's half
// height (unit = baseH·ARCHIVE_UNIT at FORMATION_D, half-height = baseH/2 —
// the lens cancels). One spiral unit is therefore worth
// 2·ARCHIVE_UNIT·tan(fov/2)·d local units at distance d, and the streak field
// is frozen at the distance the velocity beat opens on. The one number that
// cannot be derived from an export is the lens itself.
const COSMOS_FOV = 55; // must match the <Canvas camera> in Cosmos.tsx
const TAN_HALF_FOV = Math.tan((COSMOS_FOV * Math.PI) / 360);
/** Fraction of the frame half-height the archive's outer arm reaches. */
const ARCH_ARM_FRAC = 2 * ARCHIVE_UNIT; // 0.8136
/** Local units per archive spiral unit, frozen at the warp's own distance. */
const WARP_REF_CP = 0.18; // the middle of the velocity beat
const WARP_REF_DIST =
  FAR_DIST + (HOLD_DIST - FAR_DIST) * (3 - 2 * (WARP_REF_CP / 0.6)) * (WARP_REF_CP / 0.6) ** 2; // ≈ 28.08
const SPIRAL_UNIT = ARCH_ARM_FRAC * TAN_HALF_FOV * WARP_REF_DIST; // ≈ 11.89
/** θ the curve is extended past the outermost work, so it sweeps off-frame. */
const ARM_LEAD = 3.2;
/** …and past the innermost, so the field does not stop dead at the eye. */
const ARM_TAIL = 1.6;
/** θ_max of the sigil's own spiral stroke — mirrors spiralOuterFirst(). */
const SIGIL_THETA_MAX = Math.PI * 4.6;
/**
 * Scale at which the drawn spiral IS the archive arm continued: the sigil
 * stroke normalises its outer radius to 1 at its own θ_max, so matching the
 * archive at equal θ costs exactly e^(b·Δθ_max). Multiplied by HOLD_DIST
 * because the stroke's scale is applied as (dist/HOLD_DIST)·this — the two
 * distances cancel and the match holds at every point of the dolly.
 */
const SPIRAL_MATCH =
  ARCH_ARM_FRAC *
  TAN_HALF_FOV *
  Math.exp(PHI_SPIRAL_B * (SIGIL_THETA_MAX - ARCHIVE_THETA_MAX)) *
  HOLD_DIST; // ≈ 4.60

/* ------------------------------------------------------------- the streaks */

const STREAKS = 340;
/** Streaks that launch from a work's own slot on the curve. 4 per work. */
const WORK_STREAKS = ARCHIVE.length * 4;
const SEG = 14;
// The launch window is wide so the warp is a CONTINUOUS gradient of streaks —
// some just landing, some mid-flight with long trails, some still leaving the
// rim — rather than one synchronised volley that is over in a blink. With the
// stretched span this is what carries the 69% frame on its own.
const STAG_MAX = 0.62;

function mulberry(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const STREAK_VERT = /* glsl */ `
  uniform float uBase;
  uniform vec2 uRes;
  uniform float uOpacity;
  uniform vec3 uChalk;
  uniform vec3 uRed;
  uniform float uB;     // ln(phi)/pi — the archive's own growth constant
  attribute vec3 aP0;   // R0 (on the archive arm), theta0, z0
  attribute vec3 aP1;   // rTarget, angular correction, sweep (radians of wind)
  attribute vec4 aQ;    // stagger, velocity, halfWidthPx, red
  attribute float aBright;
  attribute vec2 aTS;   // t along the ribbon (0 tail, 1 head), side
  varying float vA;
  varying float vS;
  varying vec3 vC;

  float ease(float x) { x = clamp(x, 0.0, 1.0); return x * x * (3.0 - 2.0 * x); }

  // THE ARCHIVE'S OWN CURVE, WINDING IN.
  // r = R0·e^(−b·Δθ) with Δθ swept linearly is the logarithmic spiral the
  // fifteen works are laid out on. A streak's whole flight is a segment of
  // that curve: it does not resemble the spiral, it IS it. The sweep is solved
  // on the CPU as ln(R0/rTarget)/b, so r lands exactly on the mark, and the
  // residual angular error is eased in over the last half of the flight.
  vec3 traj(float e) {
    float dth = aP1.z * e;
    float th = aP0.y - dth + aP1.y * smoothstep(0.45, 1.0, e);
    float r = aP0.x * exp(-uB * dth);
    return vec3(cos(th) * r, sin(th) * r, aP0.z * (1.0 - e));
  }

  void main() {
    float t = aTS.x;
    float side = aTS.y;

    float eH = ease(clamp((uBase - aQ.x) / (1.0 - ${STAG_MAX.toFixed(2)}), 0.0, 1.0));
    // trail length is per-particle velocity: a ~10x spread across the field,
    // collapsing to zero exactly at arrival so nothing spikes on landing
    float trail = aQ.y * 0.32 * (1.0 - eH * 0.92);
    // RAW can go negative behind the launch point. Clamping it (as this did)
    // parks every tail vertex on the same coordinate, so dir degenerates and
    // the strip folds into a hard sawtooth comb — visible as a ~15px ribbon
    // ending in teeth. Keep the clamp for position, but dissolve the alpha
    // before the clamp is ever reached.
    float raw = eH - trail * (1.0 - t);
    float e = max(raw, 0.0);
    float e2 = max(eH - trail * (1.0 - min(t + 0.05, 1.0)), 0.0);

    mat4 mvp = projectionMatrix * modelViewMatrix;
    vec4 cur = mvp * vec4(traj(e), 1.0);
    vec4 nxt = mvp * vec4(traj(e2), 1.0);
    vec2 sc = cur.xy / max(abs(cur.w), 1e-4) * uRes * 0.5;
    vec2 sn = nxt.xy / max(abs(nxt.w), 1e-4) * uRes * 0.5;
    vec2 dir = sn - sc;
    if (dot(dir, dir) < 1e-8) dir = vec2(1.0, 0.0);
    dir = normalize(dir);
    vec2 nrm = vec2(-dir.y, dir.x);

    float hw = max(aQ.z * mix(0.15, 1.0, pow(t, 0.7)), 0.16);
    cur.xy += nrm * side * hw * 2.0 / uRes * max(abs(cur.w), 1e-4);
    gl_Position = cur;

    // bright head, vanishing tail
    float a = pow(t, 1.9) * smoothstep(0.0, 0.045, raw);
    // radial density falloff — a clear throat opens on the axis
    float rNow = aP0.x * exp(-uB * aP1.z * eH);
    a *= mix(smoothstep(0.8, 5.0, rNow), 1.0, eH * eH);
    // and out cleanly as it lands on the mark
    a *= 1.0 - smoothstep(0.88, 1.0, eH);

    vA = a * uOpacity * aBright;
    vS = side;
    vC = mix(uChalk, uRed * 1.5, aQ.w);
  }
`;

const STREAK_FRAG = /* glsl */ `
  precision mediump float;
  varying float vA;
  varying float vS;
  varying vec3 vC;
  void main() {
    float a = vA * smoothstep(0.0, 0.62, 1.0 - abs(vS));
    if (a < 0.004) discard;
    gl_FragColor = vec4(vC, a);
  }
`;

/* -------------------------------------------------------------------------- */

export function Sigil() {
  const groupRef = useRef<THREE.Group>(null);

  const kit = useMemo(() => {
    const rnd = mulberry(1370);

    /* ---- streaks: the archive's fifteen works, and the arm they sit on,
           falling in ALONG the φ spiral they were laid out on ---- */
    const targets = markTargets(STREAKS, 909);
    const verts = STREAKS * SEG * 2;
    const p0 = new Float32Array(verts * 3);
    const p1 = new Float32Array(verts * 3);
    const q = new Float32Array(verts * 4);
    const br = new Float32Array(verts);
    const ts = new Float32Array(verts * 2);
    const zero = new Float32Array(verts * 3);
    const idx = new Uint32Array(STREAKS * (SEG - 1) * 6);
    /** wrap to (−π, π] — the residual angle a streak still has to correct */
    const wrap = (a: number) => {
      let v = (a + Math.PI) % (Math.PI * 2);
      if (v < 0) v += Math.PI * 2;
      return v - Math.PI;
    };

    let vi = 0;
    let ii = 0;
    for (let i = 0; i < STREAKS; i++) {
      const tgt = targets[i];
      const rT = Math.max(0.35, Math.hypot(tgt.x, tgt.y));
      const aT = Math.atan2(tgt.y, tgt.x);

      // WHERE IT LAUNCHES. The first WORK_STREAKS come off the fifteen work
      // positions themselves — four apiece, jittered by well under the
      // one-third-golden-angle gap — so the things collapsing are legibly the
      // works. The rest fill the arm, skewed outward (pow 0.55) so the rim is
      // dense and the throat on the axis stays open.
      const isWork = i < WORK_STREAKS;
      const theta0 = isWork
        ? ARCHIVE[i % ARCHIVE.length].theta + (rnd() - 0.5) * 0.3
        : -ARM_TAIL + Math.pow(rnd(), 0.55) * (ARCHIVE_THETA_MAX + ARM_LEAD + ARM_TAIL);
      // ON the curve, in the sigil's local units
      const R0 = SPIRAL_UNIT * Math.exp(PHI_SPIRAL_B * (theta0 - ARCHIVE_THETA_MAX));
      const a0 = theta0 + PHI_SPIRAL_PHASE;
      // HOW FAR IT WINDS. Solved, not chosen: the angle over which the same
      // logarithmic law takes R0 down to the target radius.
      const sweep = Math.min(11, Math.max(0.5, Math.log(R0 / rT) / PHI_SPIRAL_B));
      const corr = wrap(aT - (a0 - sweep));
      const z0 = (rnd() - 0.5) * 3 - 0.3;
      const stag = rnd() * STAG_MAX;
      const vel = 0.1 + Math.pow(rnd(), 2) * 0.9; // 10x length spread
      const depth = 1 - Math.min(1, R0 / (SPIRAL_UNIT * Math.exp(PHI_SPIRAL_B * ARM_LEAD)));
      // half-width in CSS px. At 2.6 (×1.5 for the works) a streak was an 8px
      // grey ribbon; a field of them read as smeared bands rather than as the
      // chalk-fine velocity the rest of the site is drawn in.
      const hw = Math.min(1.55, Math.max(0.34, 0.34 + depth * 0.62 + vel * 0.5) * (isWork ? 1.5 : 1));
      const red = rnd() < 0.08 ? 1 : 0;
      // the fifteen read brighter than the field they travel in
      const bright = isWork ? 1.55 : 0.82;

      const base = vi;
      for (let s = 0; s < SEG; s++) {
        const t = s / (SEG - 1);
        for (let k = 0; k < 2; k++) {
          const o3 = (vi + k) * 3;
          const o4 = (vi + k) * 4;
          const o2 = (vi + k) * 2;
          p0[o3] = R0;
          p0[o3 + 1] = a0;
          p0[o3 + 2] = z0;
          p1[o3] = rT;
          p1[o3 + 1] = corr;
          p1[o3 + 2] = sweep;
          q[o4] = stag;
          q[o4 + 1] = vel;
          q[o4 + 2] = hw;
          q[o4 + 3] = red;
          br[vi + k] = bright;
          ts[o2] = t;
          ts[o2 + 1] = k === 0 ? -1 : 1;
        }
        vi += 2;
      }
      for (let s = 0; s < SEG - 1; s++) {
        const a = base + s * 2;
        idx[ii++] = a;
        idx[ii++] = a + 1;
        idx[ii++] = a + 2;
        idx[ii++] = a + 1;
        idx[ii++] = a + 3;
        idx[ii++] = a + 2;
      }
    }

    const streakGeo = new THREE.BufferGeometry();
    streakGeo.setAttribute('position', new THREE.BufferAttribute(zero, 3));
    streakGeo.setAttribute('aP0', new THREE.BufferAttribute(p0, 3));
    streakGeo.setAttribute('aP1', new THREE.BufferAttribute(p1, 3));
    streakGeo.setAttribute('aQ', new THREE.BufferAttribute(q, 4));
    streakGeo.setAttribute('aBright', new THREE.BufferAttribute(br, 1));
    streakGeo.setAttribute('aTS', new THREE.BufferAttribute(ts, 2));
    streakGeo.setIndex(new THREE.BufferAttribute(idx, 1));
    streakGeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 60);

    const streakMat = new THREE.ShaderMaterial({
      vertexShader: STREAK_VERT,
      fragmentShader: STREAK_FRAG,
      uniforms: {
        uBase: { value: 0 },
        uRes: { value: new THREE.Vector2(1440, 900) },
        uOpacity: { value: 0 },
        uChalk: { value: CHALK.clone() },
        uRed: { value: RED.clone() },
        uB: { value: PHI_SPIRAL_B },
      },
      transparent: true,
      depthWrite: false,
      depthTest: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      fog: false,
    });
    const streaks = new THREE.Mesh(streakGeo, streakMat);
    streaks.frustumCulled = false;

    /* ---- the mark, in struck chalk ---- */
    // THE SPIRAL IS THE ONE STROKE THAT IS DRAWN AT 4x ITS OWN SIZE (it opens
    // as the archive's arm continued, SPIRAL_MATCH ≈ 4.6). The chalk grain is
    // authored in stroke-parameter space — 133 skip bands and 540 tooth bands
    // along the polyline — which at mark scale is dust and at match scale is a
    // ladder of 30px blocks: the outer turns rendered as a segmented grey
    // cable, not a line. So this stroke alone runs nearly grain-free, and at
    // 900 samples instead of 360 so the curvature has no visible facets.
    // …and densely sampled. spiralOuterFirst steps uniformly in θ, which for a
    // log spiral means the OUTER turn — the one that is 774px in radius out
    // here — gets the same number of samples as the throat. At 360 that is a
    // 31px quad per segment and every shared edge rasterises twice, so the arm
    // came out as a ticked cable. 3400 puts the outer segment at ~3px, under
    // the seam's visibility, and costs one static buffer.
    const spiral = buildRibbon([spiralStroke(3400)], { overlap: 1, color: '#e8e4dc', grain: 0.06, seed: 11, arcLength: false });
    spiral.mesh.position.y = EYE_CY;
    const armature = buildRibbon(armatureStrokes(), { overlap: 0.42, color: '#e8e4dc', grain: 1, seed: 21 });
    const socket = buildRibbon(socketStrokes(), { overlap: 0.35, color: '#e8e4dc', grain: 1, seed: 31 });
    const lashes = buildRibbon(lashStrokes(), { overlap: 0.86, color: '#e8e4dc', grain: 1, seed: 41 });
    const iris = buildRibbon(irisStrokes(), { overlap: 0.5, color: '#c41230', grain: 0.9, seed: 51 });
    const glint = buildRibbon(catchlightStrokes(), { overlap: 1, color: '#e8e4dc', grain: 0.5, seed: 61 });
    const drips = buildRibbon(floorStrokes(dripStrokes(), DRIP_FLOOR), { overlap: 0.7, color: '#e8e4dc', grain: 1, seed: 71 });

    const ribbons = [spiral, armature, socket, lashes, iris, glint, drips];
    ribbons.forEach((r, i) => {
      r.mesh.renderOrder = 20 + i;
    });

    /* ---- residual dust sitting ON the mark ---- */
    const FORM = 900;
    const formTargets = markTargets(FORM, 4242);
    // markTargets samples the UNCLIPPED drips, so a residual mote could still
    // land 0.67 units under the base — through the dimension rule. The dust
    // obeys the same floor as the ink it settles on.
    const kept = formTargets.filter((t) => t.y >= DRIP_FLOOR);
    const formPos = new Float32Array(kept.length * 3);
    for (let i = 0; i < kept.length; i++) {
      formPos[i * 3] = kept[i].x;
      formPos[i * 3 + 1] = kept[i].y;
      formPos[i * 3 + 2] = (rnd() - 0.5) * 0.1;
    }
    const formGeo = new THREE.BufferGeometry();
    formGeo.setAttribute('position', new THREE.BufferAttribute(formPos, 3));
    const formMat = new THREE.PointsMaterial({
      map: getDustSprite(),
      color: CHALK.clone(),
      size: 0.042,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
    });
    const formation = new THREE.Points(formGeo, formMat);
    formation.frustumCulled = false;
    formation.renderOrder = 19;

    /* ---- red bloom disc behind the eye: the pulse only ---- */
    const haloMat = new THREE.MeshBasicMaterial({
      map: getDustSprite(),
      color: RED.clone(),
      transparent: true,
      opacity: 0,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
    });
    const halo = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), haloMat);
    halo.scale.setScalar(3.4);
    halo.frustumCulled = false;
    halo.renderOrder = 11;

    /* ---- the ground closing in behind the mark ---- */
    const maskMat = new THREE.ShaderMaterial({
      uniforms: {
        uOpacity: { value: 0 },
        uColor: { value: new THREE.Vector3(...GROUND_COLD) },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        precision mediump float;
        uniform float uOpacity;
        uniform vec3 uColor;
        varying vec2 vUv;
        void main() {
          float d = length(vUv - 0.5);
          float a = (1.0 - smoothstep(0.33, 0.5, d)) * uOpacity;
          if (a < 0.002) discard;
          gl_FragColor = vec4(uColor, a);
        }
      `,
      transparent: true,
      depthWrite: false,
      depthTest: false,
    });
    const mask = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), maskMat);
    mask.position.set(0, 0, -2.5);
    mask.frustumCulled = false;
    mask.renderOrder = 10;

    return { streaks, streakMat, ribbons, spiral, armature, socket, lashes, iris, glint, drips, formation, formMat, halo, haloMat, mask, maskMat };
  }, []);

  const fwd = useMemo(() => new THREE.Vector3(), []);
  const tmp = useMemo(() => new THREE.Vector3(), []);
  const groundCol = useMemo(() => new THREE.Vector3(), []);
  const lastRes = useRef(0);
  // react-compiler treats memo results as frozen; everything mutated per frame
  // is reached through this unfrozen shallow copy, never through `kit` itself.
  const liveRef = useRef<typeof kit | null>(null);

  useFrame((state) => {
    const g = groupRef.current;
    if (!g) return;
    if (!liveRef.current) liveRef.current = { ...kit };
    const live = liveRef.current;
    const p = rawProgress();
    const cp = clamp01((p - C_START) / C_SPAN);
    const rush = clamp01((p - RUSH_START) / RUSH_SPAN);

    // ---- distance from the camera: approach, hold, then rush through ----
    // The pass-through is told by DISSOLVE, not by scale. Driving dist to -7
    // meant the mark spent ~4% of the track as a 3-4x ring with its apex and
    // base off-frame — an unreadable donut that read as a broken zoom. It now
    // comes at the camera to ~1.7x while dissolving into the dust copy of the
    // same form (Dust.tsx holds it at matched apparent size), and the veil
    // closes over that.
    const dist =
      rush <= 0
        ? lerp(FAR_DIST, HOLD_DIST, smoothstep(0, 0.6, cp))
        : lerp(HOLD_DIST, 1.5, rush * rush);
    const fade = (1 - smoothstep(0.16, 0.78, rush)) * smoothstep(0.0, 0.05, cp);
    const visible = cp > 0.003 && fade > 0.002 && dist > 0.4;

    // ---- publish the beat: ground temperature + the post-chain warp ----
    // Warp peaks through the velocity phase and is fully off before the mark
    // resolves, so the climax itself is never smeared.
    // The warp POST effect desaturates by up to .76 and multiplies the frame
    // down by up to ~.5 while it smears — held at full strength across the
    // middle of the beat it made 69% the dimmest picture in the site (p99
    // luminance 57/255). It is now a short accent on the ENTRY to the velocity,
    // and the streak geometry — which is lit, not smeared — carries the speed
    // for the rest of it.
    //
    // ONSET IS GATED PAST THE COSMOS, NOT PAST THE PHASE NUMBER.
    // The warp used to open at cp≈0.02 (p≈0.604). THE COSMOS's last beat — the
    // formation's low, raking second vantage — is still fully composed and on
    // screen until p=0.62, so a 12-tap radial smear plus a .17 desaturation was
    // landing ON fifteen sharp canvases: at 61.5% every work in the formation
    // read soft and cold, like a render that had not finished. The velocity
    // beat now starts at cp=0.13 (p≈0.625), AFTER the corridor has handed over,
    // and the tail is pulled in to match so the mark still strikes onto a clean
    // frame. Nothing about the beat's shape changes — it is the same accent on
    // the entry to the velocity, moved off the picture it was smearing.
    const WARP_IN = 0.13;
    const beat = smoothstep(0.66, 0.86, cp);
    //
    // THE SMEAR IS OFF. This is a measurement, not a taste call.
    //
    // The velocity beat's content is hairlines: the φ spiral's arms, the streak
    // ribbons, the dust. A multi-tap radial convolution cannot smear a 1px line
    // without turning it into a ladder — every tap lands a whole copy of the
    // line, and the per-pixel jitter that is supposed to hide that only works
    // when the tap spacing is sub-pixel, which at any strength you can SEE it
    // is not. Measured across cp 0.12–0.40 at 1440×900:
    //
    //   warp 0.85  13.4% of the frame flat desaturated grey (2.9% at the ends),
    //              ground drifted to a blue-black (9,10,18), every arc combed
    //   warp 0.45   9.8% grey, comb still plainly visible at 1:1
    //   warp 0.14   6.4% grey, comb faint but still there, and the effect no
    //               longer reads as anything
    //   warp 0      2.8% grey, ground (13,9,12), and the frame is the best
    //               picture in the chapter: crisp chalk arms of the same φ
    //               spiral the archive hangs on, winding down onto the works
    //
    // The geometry is LIT, not smeared, and it already carries the speed. The
    // post chain keeps what it can do without artefacts — the temperature
    // swing, the vignette, and the standing edge aberration.
    contraction.warp = 0;
    contraction.cool =
      visible ? 0.42 * smoothstep(WARP_IN, WARP_IN + 0.24, cp) * (1 - beat * 0.5) * (1 - rush) : 0;
    contraction.vig = visible ? beat * fade : 0;

    g.visible = visible;
    if (!visible) {
      contraction.live = false;
      return;
    }

    // lock to the view: the climax is always centred and always this big
    const cam = state.camera;
    cam.getWorldDirection(fwd);
    g.position.copy(cam.position).addScaledVector(fwd, dist);
    g.quaternion.copy(cam.quaternion);
    // the sigil sits ON the camera axis (a whisper of parallax, no more) so
    // the vanishing point, the streak convergence and the warp centre coincide
    g.translateX(-cosmosShared.swayX * 0.05);
    g.translateY(-cosmosShared.swayY * 0.035);

    const t = state.clock.elapsedTime;
    const d = (cp - PULSE_AT) / PULSE_SIGMA;
    const pulse = Math.exp(-d * d);
    g.rotateZ(Math.sin(t * 0.07) * 0.012);
    g.scale.setScalar(1 + pulse * 0.05);
    g.updateMatrixWorld();

    // ---- the vanishing point, published in UV for the post chain ----
    tmp.copy(g.position).project(cam);
    contraction.cx = tmp.x * 0.5 + 0.5;
    contraction.cy = tmp.y * 0.5 + 0.5;

    // ---- projected baseline, so the caption can lock to it ----
    if (rush <= 0) {
      tmp.set(BASE_X0, BASE_Y, 0);
      g.localToWorld(tmp).project(cam);
      const x0 = (tmp.x * 0.5 + 0.5) * state.size.width;
      const y0 = (1 - (tmp.y * 0.5 + 0.5)) * state.size.height;
      tmp.set(BASE_X1, BASE_Y, 0);
      g.localToWorld(tmp).project(cam);
      const x1 = (tmp.x * 0.5 + 0.5) * state.size.width;
      contraction.baseX = x0;
      contraction.baseY = y0;
      contraction.baseW = Math.max(1, x1 - x0);
      contraction.live = true;
    }

    // ---- screen resolution for every screen-space ribbon ----
    const res = state.size.width * 100000 + state.size.height;
    if (res !== lastRes.current) {
      lastRes.current = res;
      live.streakMat.uniforms.uRes.value.set(state.size.width, state.size.height);
      for (const r of live.ribbons) {
        (r.material.uniforms.uRes.value as THREE.Vector2).set(state.size.width, state.size.height);
      }
    }

    // ---- the warp streaks ----
    // Eased rather than smoothstepped so the field is still visibly IN FLIGHT
    // through the middle of the warp instead of having already landed.
    live.streakMat.uniforms.uBase.value = Math.pow(clamp01((cp - 0.06) / 0.72), 1.5);
    live.streakMat.uniforms.uOpacity.value =
      2.6 * smoothstep(0.01, 0.09, cp) * (1 - smoothstep(0.7, 0.86, cp)) * fade;

    // ---- the golden spiral: grows across the frame, winds onto the eye ----
    // apparent size is held roughly constant while the dolly closes, so it
    // reads as one continuous form tightening rather than a distant squiggle
    const resolve = smoothstep(0.25, 0.78, cp);
    // It OPENS as the archive's own arm continued (SPIRAL_MATCH is derived from
    // ARCHIVE_UNIT / PHI_SPIRAL_B, so the two curves coincide at equal θ), and
    // tightens onto the mark from there. Same curve, seen twice.
    const spiralScale = (dist / HOLD_DIST) * lerp(SPIRAL_MATCH, 2.15, resolve);
    live.spiral.mesh.scale.setScalar(spiralScale);
    // It only becomes visible once it is already more than half drawn. Fading
    // it up from cp 0.01 put a lone 20%-drawn grey arc across a still-sharp
    // corridor at 61.5% — it read as a stray line, not as a spiral.
    live.spiral.material.uniforms.uDraw.value = smoothstep(0.04, 0.34, cp);
    // thinner as it opens (it is four times its own size out there), settling
    // to the mark's own weight as it tightens onto the eye
    live.spiral.material.uniforms.uWidth.value = lerp(0.62, 1.4, resolve);
    live.spiral.material.uniforms.uOpacity.value =
      1.0 * smoothstep(0.08, 0.22, cp) * (1 - smoothstep(0.54, 0.74, cp)) * fade;

    // ---- the mark strikes itself on (71% → 76.5%) ----
    // `beat` also lifts the chalk: at the apex this is struck chalk at full
    // luminance, not a 12%-grey wireframe.
    const flash = (1 + pulse * 0.34) * (1 + 0.16 * beat);
    const setStroke = (
      r: { material: THREE.ShaderMaterial },
      draw: number,
      opacity: number,
      width: number,
      color: THREE.Color,
    ) => {
      r.material.uniforms.uDraw.value = draw;
      r.material.uniforms.uOpacity.value = opacity;
      r.material.uniforms.uWidth.value = width;
      (r.material.uniforms.uColor.value as THREE.Color).copy(color).multiplyScalar(flash);
    };

    const chalkOn = (0.7 + 0.3 * smoothstep(0.6, 0.84, cp)) * fade;
    setStroke(live.armature, smoothstep(0.54, 0.7, cp), chalkOn, 1.12 + pulse * 0.7, CHALK);
    setStroke(live.socket, smoothstep(0.58, 0.74, cp), chalkOn, 1.12 + pulse * 0.7, CHALK);
    setStroke(live.lashes, smoothstep(0.63, 0.78, cp), chalkOn * 0.9, 1.06 + pulse * 0.5, CHALK);
    setStroke(live.iris, smoothstep(0.66, 0.8, cp), 0.98 * smoothstep(0.64, 0.78, cp) * fade, 1.15 + pulse * 0.9, RED);
    setStroke(live.glint, smoothstep(0.72, 0.82, cp), 0.95 * smoothstep(0.7, 0.81, cp) * fade, 1 + pulse * 0.4, CHALK);
    setStroke(live.drips, smoothstep(0.74, 0.84, cp), chalkOn * 0.62, 1, CHALK);
    // the iris burns: push past 1.0 at the pulse so ONLY this blooms
    (live.iris.material.uniforms.uColor.value as THREE.Color).copy(RED).multiplyScalar(1.14 + pulse * 0.72);

    // ---- residual dust formation ON the mark ----
    live.formMat.opacity = 0.5 * smoothstep(0.66, 0.86, cp) * fade;
    live.formMat.color.copy(CHALK).multiplyScalar(1 + pulse * 0.5);

    // ---- red halo: only the pulse, and barely there ----
    live.haloMat.opacity = pulse * 0.055 * fade;

    // ---- the ground closing in behind the mark, and its temperature ----
    const warmT = smoothstep(0.62, 0.92, cp);
    groundCol.set(
      lerp(GROUND_COLD[0], GROUND_WARM[0], warmT),
      lerp(GROUND_COLD[1], GROUND_WARM[1], warmT),
      lerp(GROUND_COLD[2], GROUND_WARM[2], warmT),
    );
    (live.maskMat.uniforms.uColor.value as THREE.Vector3).copy(groundCol);
    live.maskMat.uniforms.uOpacity.value = smoothstep(0.42, 0.8, cp) * fade;
    live.mask.scale.setScalar(Math.max(dist + 2.5, 1) * 4.6);
  });

  return (
    <group ref={groupRef} visible={false}>
      <primitive object={kit.mask} />
      <primitive object={kit.halo} />
      <primitive object={kit.streaks} />
      <primitive object={kit.formation} />
      {kit.ribbons.map((r, i) => (
        <primitive key={i} object={r.mesh} />
      ))}
    </group>
  );
}
