'use client';

// cosmos/CameraRig.tsx — OWNED BY COSMOS agent.
// The one camera, and the only thing in the build that moves it.
//
// It is a BODY WITH MASS, not a value being scrubbed:
//
//   * SPRING, NOT LERP. Position is integrated as a damped harmonic oscillator
//     at a FIXED 1/120s substep off an accumulator, so it is bit-identical at
//     3fps and 144fps (the frame-rate independence the old damp() bought, kept)
//     — but under-damped (ζ ≈ 0.64), so the rig overshoots its mark by ~6% and
//     settles back. You decelerate INTO the pyramid formation; you do not
//     arrive at it because a number stopped changing.
//   * A SHAPED DESCENT. Speed is not constant down the corridor: descentCurve()
//     accelerates out of each beat and decelerates into the next, five times
//     across the chapter, with a deceleration landing exactly on the approach
//     to the composed triangle. The exact derivative is published to
//     stage.speed so the near-field passes can open only on the fast stretches.
//   * A REAL DIVE. The rig starts CAM_DIVE_PREROLL units further back and
//     falls in across THE DIVE, accelerating — so the DOM→3D handoff is the
//     start of a fall rather than a fade into a parked camera.
//   * CURSOR PARALLAX IN YAW AND PITCH. Spring-damped, a few degrees at most,
//     with a matching lateral shift. Move the mouse and the world moves.
//
// It also owns the void's colour temperature and publishes the shared cursor
// spring and nearest-slab index every other cosmos system reads.

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useJourney } from '../JourneyContext';
import { phaseProgress, PHASES } from '../journey-utils';
import { cosmosShared, easeInOut } from './shared';
import { stage } from './stage-state';
import { contraction } from './contraction-state';
import {
  CAM_START_Z,
  CAM_END_Z,
  CAM_CONTRACT_DRIFT,
  CAM_RETURN_PUSH,
  CAM_DIVE_PREROLL,
  descentCurve,
  descentSpeed,
  descentAt,
  nearestSlabIndex,
  shotMix,
  type ShotMix,
} from './cosmos-data';

const look = new THREE.Vector3();
const mix: ShotMix = { wide: 1, macro: 0, pullback: 0 };
// the void warms as we fall: cold neutral at the top of the corridor,
// faintly red-tinged approaching CONTRACTION. Fog and clear colour move
// together so there is never a visible haze disc against the background.
const VOID_COLD = new THREE.Color('#0d0c0d');
const VOID_WARM = new THREE.Color('#150a0b');
const voidColor = new THREE.Color();
// The CONTRACTION owns a temperature of its own: the ground drops to a cold
// blue-black as the warp accelerates, then settles a shade warmer and denser
// for the sigil beat. Still near-black, still no second accent.
const CONTRACT_COLD = new THREE.Color('#090b12');
const CONTRACT_WARM = new THREE.Color('#120c0b');

/* ------------------------------------------------------------- the spring */

/**
 * Fixed integration step. Frame-rate independence lives here, not in damp().
 *
 * The budget is deliberately generous (0.25s of simulation per frame, 30
 * substeps): the old damp() clamped its dt to 1/20s, which silently ran the
 * whole rig at a fraction of real time on a slow frame — the camera "lagged"
 * on any machine that dropped below 20fps, which is exactly the machine that
 * least wants a camera arriving late. A fixed substep is unconditionally
 * stable, so the only reason to cap it at all is the spiral of death.
 */
const STEP = 1 / 120;
const MAX_DT = 0.75;
const MAX_STEPS = 90;

/** Dolly: under-damped, so the rig overshoots and settles. */
const Z_OMEGA = 6.6;
const Z_ZETA = 0.64;
/** Cursor parallax: slightly softer, still with a little overshoot. */
const C_OMEGA = 5.4;
const C_ZETA = 0.72;

interface Spring {
  x: number;
  v: number;
}

/** One fixed-step pass of a damped harmonic oscillator toward `target`. */
function integrate(s: Spring, target: number, omega: number, zeta: number, h: number): void {
  const a = -omega * omega * (s.x - target) - 2 * zeta * omega * s.v;
  s.v += a * h;
  s.x += s.v * h;
}

/** Mean corridor rate in world units per unit of global scroll — the unit
 *  stage.speed is expressed in. */
const COSMOS_SPAN = PHASES.cosmos.end - PHASES.cosmos.start;
const DIVE_SPAN = PHASES.dive.end - PHASES.dive.start;
const MEAN_RATE = (CAM_START_Z - CAM_END_Z) / COSMOS_SPAN;

/** Cursor parallax authority, radians. ~3.1° of yaw, ~2.1° of pitch. */
const PARALLAX_YAW = 0.054;
const PARALLAX_PITCH = 0.037;

export function CameraRig() {
  const { progressRef } = useJourney();

  const rig = useRef({
    z: { x: CAM_START_Z + CAM_DIVE_PREROLL, v: 0 } as Spring,
    px: { x: 0, v: 0 } as Spring,
    py: { x: 0, v: 0 } as Spring,
    sx: { x: 0, v: 0 } as Spring,
    sy: { x: 0, v: 0 } as Spring,
    acc: 0,
  });

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, MAX_DT);
    const p = progressRef.current ?? 0;
    const diveP = phaseProgress(p, 'dive');
    const cosP = phaseProgress(p, 'cosmos');
    const conP = phaseProgress(p, 'contraction');
    const retP = phaseProgress(p, 'return');
    const r = rig.current;

    /* ---- where the rig WANTS to be, as a closed form of scroll ---- */
    // THE DIVE: an accelerating fall (quadratic ease-in) from the pre-roll
    // position down onto the mouth of the corridor. At diveP = 1 the pre-roll
    // term is exactly 0, so the handover into the corridor is seamless.
    const diveFall = diveP * diveP;
    let z =
      CAM_START_Z +
      CAM_DIVE_PREROLL * (1 - diveFall) +
      (CAM_END_Z - CAM_START_Z) * descentCurve(cosP);
    z -= CAM_CONTRACT_DRIFT * easeInOut(conP);
    z -= CAM_RETURN_PUSH * retP * retP; // accelerate THROUGH the sigil

    /* ---- publish the analytic speed (never a per-frame delta) ---- */
    const diveRate = (CAM_DIVE_PREROLL * 2 * diveP) / DIVE_SPAN;
    const cosRate = MEAN_RATE * descentSpeed(cosP);
    const handover = Math.min(1, Math.max(0, (diveP - 0.88) / 0.12));
    const rate = diveRate + (cosRate - diveRate) * handover;
    stage.speed = rate / MEAN_RATE;
    // near-field passes belong to the fast stretches only
    const rushRaw = Math.min(1, Math.max(0, (stage.speed - 1.02) / 0.34));
    stage.rush =
      rushRaw * rushRaw * (3 - 2 * rushRaw) * (1 - Math.min(1, conP * 5)) * Math.min(1, diveP * 3.2);

    /* ---- integrate: fixed substeps, so 3fps and 144fps agree ---- */
    r.acc += dt;
    let steps = 0;
    while (r.acc >= STEP && steps < MAX_STEPS) {
      integrate(r.z, z, Z_OMEGA, Z_ZETA, STEP);
      integrate(r.sx, cosmosShared.cursorX, C_OMEGA, C_ZETA, STEP);
      integrate(r.sy, cosmosShared.cursorY, C_OMEGA, C_ZETA, STEP);
      r.acc -= STEP;
      steps += 1;
    }
    if (steps === MAX_STEPS) r.acc = 0;

    cosmosShared.swayX = r.sx.x;
    cosmosShared.swayY = r.sy.x;

    // The lens is calmer inside a canvas. A MACRO crop magnifies the surface
    // three-fold, so the same few degrees that read as presence in a WIDE shot
    // read as a wobble here — the authority is pulled back rather than the
    // parallax being switched off, so the space never goes dead.
    shotMix(cosP, mix);
    const auth = 1 - 0.55 * mix.macro;

    const cam = state.camera;
    cam.position.z = r.z.x;
    cam.position.x = r.sx.x * 0.62 * auth;
    cam.position.y = r.sy.x * 0.4 * auth;

    // look ahead down the corridor, then add the parallax as REAL yaw/pitch on
    // top — a lateral shift alone reads as a slide, a rotation reads as the
    // space turning with you.
    look.set(cam.position.x, cam.position.y, cam.position.z - 12);
    cam.lookAt(look);
    cam.rotateY(-r.sx.x * PARALLAX_YAW * auth);
    cam.rotateX(r.sy.x * PARALLAX_PITCH * auth);

    cosmosShared.camDZ = Math.abs(cam.position.z - cosmosShared.camZ);
    cosmosShared.camZ = cam.position.z;
    cosmosShared.nearest = nearestSlabIndex(cam.position.z);

    // ---- colour-temperature arc of the void itself ----
    const descent = descentAt(cam.position.z);
    cosmosShared.descent = descent;
    const warmth = Math.min(1, descent * 0.85 + conP * 0.35);
    voidColor.copy(VOID_COLD).lerp(VOID_WARM, warmth);
    // the contraction's own temperature arc, published by the sigil beat
    if (contraction.cool > 0.001) voidColor.lerp(CONTRACT_COLD, contraction.cool);
    if (contraction.vig > 0.001) voidColor.lerp(CONTRACT_WARM, contraction.vig * 0.85);
    const fog = state.scene.fog as THREE.FogExp2 | null;
    if (fog) fog.color.copy(voidColor);
    state.gl.setClearColor(voidColor, 1);
  });

  return null;
}
