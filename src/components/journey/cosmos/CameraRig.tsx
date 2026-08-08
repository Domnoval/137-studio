'use client';

// cosmos/CameraRig.tsx — OWNED BY COSMOS agent.
// The one camera. Dollies down the helix axis with journey progress,
// critically damped; gentle cursor sway (parallax); looks slightly ahead.
// Also integrates the shared smoothed cursor and nearest-slab index that
// every other cosmos system reads.

import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useJourney } from '../JourneyContext';
import { phaseProgress } from '../journey-utils';
import { cosmosShared, easeInOut } from './shared';
import { contraction } from './contraction-state';
import {
  CAM_START_Z,
  CAM_END_Z,
  CAM_CONTRACT_DRIFT,
  CAM_RETURN_PUSH,
  descentAt,
  nearestSlabIndex,
} from './cosmos-data';

const look = new THREE.Vector3();
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

export function CameraRig() {
  const { progressRef } = useJourney();

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 1 / 20);
    const p = progressRef.current ?? 0;
    const cosP = phaseProgress(p, 'cosmos');
    const conP = phaseProgress(p, 'contraction');
    const retP = phaseProgress(p, 'return');

    // ---- dolly target along the helix axis ----
    let z = CAM_START_Z + (CAM_END_Z - CAM_START_Z) * cosP;
    z -= CAM_CONTRACT_DRIFT * easeInOut(conP);
    z -= CAM_RETURN_PUSH * retP * retP; // accelerate THROUGH the sigil

    // ---- damped cursor sway (weighted, never jittery) ----
    cosmosShared.swayX = THREE.MathUtils.damp(cosmosShared.swayX, cosmosShared.cursorX, 2.6, dt);
    cosmosShared.swayY = THREE.MathUtils.damp(cosmosShared.swayY, cosmosShared.cursorY, 2.6, dt);

    const cam = state.camera;
    cam.position.z = THREE.MathUtils.damp(cam.position.z, z, 5.5, dt);
    cam.position.x = THREE.MathUtils.damp(cam.position.x, cosmosShared.swayX * 0.85, 3.2, dt);
    cam.position.y = THREE.MathUtils.damp(cam.position.y, cosmosShared.swayY * 0.55, 3.2, dt);

    // look slightly ahead down the corridor, cursor pulls the gaze a touch
    look.set(cosmosShared.swayX * 1.4, cosmosShared.swayY * 0.9, cam.position.z - 11);
    cam.lookAt(look);

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
