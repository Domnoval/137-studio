'use client';

// cosmos/Slabs.tsx — OWNED BY COSMOS agent.
// 15 paintings as textured slabs on the golden-angle helix.
//
// STAGING (the point of this file): exactly one slab per beat is THE subject.
// The slab nearest the camera is "hero": it surrenders most of its off-axis
// offset so it composes INSIDE the frame, and it is fitted — from its real
// texture aspect against the live frustum — to fill ~60-76% of the viewport at
// the sweet-spot distance. It also carries the red edge glow. Everything else
// is staged DOWN: 0.55x world scale plus a distance luminance falloff, so far
// slabs read as atmosphere rather than competing thumbnails.
//
// Each slab projects its art quad to a screen rect every frame into
// cosmosShared.slabRects — that table is what the occlusion-aware label system
// in Labels.tsx tests against, so captions can never touch a painting.

import { Suspense, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { useJourney } from '../JourneyContext';
import { phaseProgress, texPath } from '../journey-utils';
import { cosmosShared, easeInOut, ensureSlabRects, smoothstep } from './shared';
import {
  SLABS,
  SIGIL_Z,
  HERO_PULL_X,
  HERO_PULL_Y,
  type SlabPlacement,
} from './cosmos-data';
import { getGlowTexture } from './textures';

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

const tmpEuler = new THREE.Euler();
const tmpQuat = new THREE.Quaternion();
const tiltQuat = new THREE.Quaternion();
const tmpVec = new THREE.Vector3();
/** Slabs are XY quads and the camera looks down -Z, so "facing the viewer" is
 *  simply the identity rotation. */
const FLAT_QUAT = new THREE.Quaternion();
const CORNERS: [number, number][] = [
  [-1, -1],
  [1, -1],
  [1, 1],
  [-1, 1],
];

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
  const anim = useRef({ fade: 0, tilt: 0.02, glow: 0, dom: 0, scale: SATELLITE_SCALE });

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

    // the caption belongs to the artwork: it lives and dies on the same curve
    if (isNearest) cosmosShared.heroDom = stage;

    // The frustum at the slab's ACTUAL distance (the fit distance floors at 2.2
    // and diverges from it once the camera is close), which is what containment
    // has to be solved against.
    const nowD = Math.max(d, 1.2);
    const frameHNow = 2 * nowD * Math.tan((cam.fov * Math.PI) / 360);
    const frameWNow = frameHNow * cam.aspect;

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
    const clampW = smoothstep(0.015, 0.12, stage);
    stagedX = THREE.MathUtils.lerp(stagedX, THREE.MathUtils.clamp(stagedX, -maxX, maxX), clampW);
    stagedY = THREE.MathUtils.lerp(stagedY, THREE.MathUtils.clamp(stagedY, -maxY, maxY), clampW);
    g.position.set(
      THREE.MathUtils.lerp(stagedX, VANISH.x, recEase),
      THREE.MathUtils.lerp(stagedY, VANISH.y, recEase),
      THREE.MathUtils.lerp(placement.z, VANISH.z, recEase),
    );
    const s = Math.max(0.001, a.scale * (1 - recEase * 0.999));
    g.scale.setScalar(s);

    // ---- orientation: the subject turns to face the viewer as it takes the
    // frame (also removes the yaw foreshortening the containment solves against)
    tmpQuat.copy(baseQuat.current).slerp(FLAT_QUAT, stage * 0.6);
    // inertial tilt toward cursor (max ~4° on the hero)
    a.tilt = THREE.MathUtils.damp(a.tilt, isNearest ? 0.07 : 0.022, 3, dt);
    tmpEuler.set(-cosmosShared.swayY * a.tilt, cosmosShared.swayX * a.tilt, 0);
    tiltQuat.setFromEuler(tmpEuler);
    g.quaternion.copy(tmpQuat).multiply(tiltQuat);

    // ---- exact containment: project the halo quad and push it back inside the
    // safe frame. Analytic clamping above gets close; this closes the gap left
    // by rotation and perspective, so the subject is never clipped. ----
    // Three Newton steps, not one: perspective makes a single linearised push
    // an under-correction on a rotated quad, and an under-correction is a
    // painting hanging off the edge of the frame.
    if (clampW > 0.01 && recEase < 0.02) {
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
        g.position.x += nx * clampW;
        g.position.y += ny * clampW;
      }
    }

    // ---- depth hierarchy: far slabs are atmosphere, not thumbnails ----
    const depth = smoothstep(58, 13, d); // 1 near, 0 deep in the corridor
    const lum = THREE.MathUtils.lerp(0.3 + 0.34 * depth, 1, stage);
    const bodyAlpha =
      a.fade * contractFade * exit * THREE.MathUtils.lerp(0.22 + 0.72 * depth, 1, stage);

    // red edge glow rides the same dominance curve as the staging AND the same
    // dissolve as the body, so the glowing slab is always the subject of the
    // frame and a halo can never outlive the artwork it belongs to
    a.glow = a.dom * exit * 0.46 * (1 - smoothstep(0.05, 0.2, cp));
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

    // cull anything behind us or lost in the fog — keeps draw calls honest
    const visible = d > EXIT_DONE - 0.2 && d < 78 && bodyAlpha > 0.004;
    g.visible = visible;

    // ---- project the art quad to a screen rect for the label system ----
    rect.alpha = bodyAlpha;
    if (!visible || recEase > 0.02) {
      rect.live = false;
      return;
    }
    g.updateWorldMatrix(true, false);
    const ok = projectQuad(g.matrixWorld, w / 2, h / 2, cam, state.size.width, state.size.height);
    rect.live = ok;
    rect.pad =
      ((GLOW_PAD * 0.6 * a.scale) / frameHNow) * state.size.height * (0.3 + 0.7 * stage);
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
    </group>
  );
}
