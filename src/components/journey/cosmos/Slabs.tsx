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
//   PULL-BACK every work in the body flies into one composed triangle 14 units
//             ahead of the camera — rows of 1/2/3/4/5, which closes exactly on
//             15 works — each small. The figure the CONTRACTION then draws.
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
import { addFormBounds, stage as stageState } from './stage-state';
import {
  SLABS,
  SIGIL_Z,
  HERO_PULL_X,
  HERO_PULL_Y,
  FORMATION,
  FORMATION_D,
  FORMATION_W,
  FORMATION_H,
  FORMATION_ITEM,
  VANTAGE_IN,
  VANTAGE_OUT,
  VANTAGE_D,
  VANTAGE_PITCH,
  VANTAGE_YAW,
  VANTAGE_RISE,
  shotMix,
  type ShotMix,
  type SlabPlacement,
} from './cosmos-data';
import { getGlowTexture } from './textures';
import { NearPass } from './NearPass';
import { FormationPlate } from './FormationPlate';

const FRAME_PAD = 0.14; // dark frame border in world units
const VANISH = new THREE.Vector3(0, 0, SIGIL_Z - 26);

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
  const baseQuat = useRef(new THREE.Quaternion());
  const anim = useRef({
    fade: 0,
    tilt: 0.02,
    glow: 0,
    dom: 0,
    scale: SATELLITE_SCALE,
  });

  const texture = useTexture(texPath(work.file), (t) => {
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
  });

  const aspect = texture.image
    ? (texture.image as { width: number; height: number }).width /
      (texture.image as { width: number; height: number }).height
    : 0.8;
  const h = placement.height;
  const w = h * aspect;
  const slot = FORMATION[index] ?? { fx: 0, fy: 0 };

  const artMaterial = useMemo(
    () => new THREE.MeshBasicMaterial({ map: texture, transparent: true, opacity: 0 }),
    [texture],
  );
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

    // texture fade-in (no pop)
    a.fade = THREE.MathUtils.damp(a.fade, 1, 2.2, dt);

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

    /* ---- PULL-BACK: fly into the composed triangle ahead of the camera ----
     * TWO MOVEMENTS, not one. First the figure is read square-on (the composed
     * triangle). Then `thru` takes over: the rig drops BELOW the formation and
     * closes on it, the plane rakes back and yaws off-axis, and every work in
     * it turns with the plane — so the second look at the formation is a
     * different vantage rather than the same frame with a motion pass. The
     * works nearest the base shear past the bottom of the frame as we come up
     * underneath them. */
    const posW = smoothstep(0.15, 0.5, pbW);
    const thru = smoothstep(VANTAGE_IN, VANTAGE_OUT, cosP);
    // plane pose, shared by the layout AND by every quad standing in it
    const planePitch = VANTAGE_PITCH * thru;
    const planeYaw = VANTAGE_YAW * thru;
    if (index === 0) {
      stageState.formW = pbW;
      stageState.formThru = thru;
    }
    if (posW > 0.001) {
      // footprint stays fixed in WORLD units while the distance closes, so the
      // formation genuinely grows in frame instead of being angularly pinned
      const baseH = 2 * FORMATION_D * Math.tan((cam.fov * Math.PI) / 360);
      const baseW = baseH * cam.aspect;
      const dist = THREE.MathUtils.lerp(FORMATION_D, VANTAGE_D, thru);
      // slot position in the formation plane, then rake it (X) and yaw it (Y)
      const lx = slot.fx * baseW * FORMATION_W;
      const ly = slot.fy * baseH * FORMATION_H;
      const cx = Math.cos(planePitch);
      const sx = Math.sin(planePitch);
      const ry = ly * cx;
      const rz = ly * sx; // pitch < 0 → the apex rakes AWAY from the lens
      const cy = Math.cos(planeYaw);
      const sy = Math.sin(planeYaw);
      const rx = lx * cy + rz * sy;
      const rz2 = -lx * sy + rz * cy;

      const fx = cam.position.x + rx;
      const fy = cam.position.y + ry + VANTAGE_RISE * baseH * thru;
      const fz = cam.position.z - dist + rz2;
      px = THREE.MathUtils.lerp(px, fx, posW);
      py = THREE.MathUtils.lerp(py, fy, posW);
      pz = THREE.MathUtils.lerp(pz, fz, posW);
      ps = THREE.MathUtils.lerp(ps, (baseH * FORMATION_ITEM) / h, posW);
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
    // PULL-BACK: every work stands IN the formation plane, so when the plane
    // rakes and yaws for the second vantage the whole triangle turns as one
    // body — plus a small per-work deviation so it is a constellation of
    // oriented objects, not a sheet of stickers.
    if (posW > 0.001) {
      tmpEuler.set(
        planePitch + placement.fPitch,
        planeYaw + placement.fYaw,
        placement.fRoll,
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

    // ---- depth hierarchy: far slabs are atmosphere, not thumbnails ----
    const depth = smoothstep(58, 13, d); // 1 near, 0 deep in the corridor
    let lum = THREE.MathUtils.lerp(0.3 + 0.34 * depth, 1, stage);
    let bodyAlpha =
      a.fade * contractFade * exit * satClear * THREE.MathUtils.lerp(0.22 + 0.72 * depth, 1, stage);

    // MACRO: the beat's own slab is solid; everything else leaves the frame
    // entirely — no thumbnails floating over brushwork. `stage` is a partition
    // of unity across the corridor, so two consecutive canvases hand the frame
    // over as a straight dissolve and nothing else is on screen at all.
    if (macroW > 0.001) {
      const macroAlpha =
        a.fade * contractFade * THREE.MathUtils.clamp(stage * 1.18, 0, 1);
      bodyAlpha = THREE.MathUtils.lerp(bodyAlpha, macroAlpha, macroW);
      lum = THREE.MathUtils.lerp(lum, 1, macroW);
    }

    // PULL-BACK: cross-cut. The corridor dissolves out, the formation resolves
    // in — the works are never seen sweeping through the camera between them.
    if (pbW > 0.001) {
      const outW = 1 - smoothstep(0.0, 0.32, pbW);
      const inW = smoothstep(0.42, 0.82, pbW);
      bodyAlpha = bodyAlpha * outW + a.fade * contractFade * 0.96 * inW;
      lum = THREE.MathUtils.lerp(lum, 0.94, inW);
    }

    // red edge glow rides the same dominance curve as the staging AND the same
    // dissolve as the body, so the glowing slab is always the subject of the
    // frame and a halo can never outlive the artwork it belongs to. It is a
    // WIDE-shot device: a halo round a full-bleed macro canvas is meaningless,
    // and 15 haloes in the pull-back would be a christmas tree.
    a.glow =
      a.dom * exit * 0.46 * (1 - smoothstep(0.05, 0.2, cp)) * (1 - macroW) * (1 - pbW);
    if (glowRef.current) {
      (glowRef.current.material as THREE.MeshBasicMaterial).opacity =
        a.glow * a.fade * contractFade;
    }
    if (artRef.current) {
      const m = artRef.current.material as THREE.MeshBasicMaterial;
      m.color.setScalar(lum);
      m.opacity = bodyAlpha;
    }
    if (frameRef.current) {
      const m = frameRef.current.material as THREE.MeshBasicMaterial;
      m.opacity = bodyAlpha;
      m.color.copy(FRAME_COLOR).multiplyScalar(0.4 + 0.6 * lum);
    }

    // cull anything behind us or lost in the fog — keeps draw calls honest.
    // In the formation every work is in front of the camera by construction,
    // so the corridor-distance test does not apply.
    const inFormation = posW > 0.02;
    const visible =
      bodyAlpha > 0.004 && (inFormation || (d > EXIT_DONE - 0.2 && d < 78));
    g.visible = visible;

    // ---- project the art quad to a screen rect for the label system ----
    rect.alpha = bodyAlpha;
    if (!visible || recEase > 0.02 || inFormation) {
      // no captions and no chips over the composed triangle: nothing to test
      rect.live = false;
      // …but the formation still has to be MEASURED, because the plate that
      // names it places itself against these bounds. Publish the union of the
      // projected quads so the caption can never land on paint.
      if (inFormation && visible && recEase < 0.02) {
        g.updateWorldMatrix(true, false);
        if (projectQuad(g.matrixWorld, w / 2, h / 2, cam, state.size.width, state.size.height)) {
          addFormBounds(t, ndc.px0, ndc.py0, ndc.px1, ndc.py1);
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

export function Slabs() {
  return (
    <group>
      {SLABS.map((placement) => (
        <Suspense key={placement.work.id} fallback={<SlabGhost placement={placement} />}>
          <SlabArt placement={placement} />
        </Suspense>
      ))}
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
