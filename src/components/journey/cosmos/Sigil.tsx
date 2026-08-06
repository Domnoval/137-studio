'use client';

// cosmos/Sigil.tsx — OWNED BY COSMOS agent.
// The crisp line-drawn layer of the contraction: golden spiral sketches
// itself in chalk, then the 137 sigil (triangle + eye) resolves over it,
// iris in red. Holds one beat, pulses once. Progressive drawing is done
// with setDrawRange — zero allocation per frame.

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useJourney } from '../JourneyContext';
import { phaseProgress } from '../journey-utils';
import { smoothstep } from './shared';
import { SIGIL_Z, sampleSpiral, sampleTriangle, sampleEye, sampleCircle } from './cosmos-data';

function lineGeometry(points: Float32Array): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(points, 3));
  g.setDrawRange(0, 0);
  return g;
}

const CHALK = new THREE.Color('#e8e4dc');
const RED_BASE = new THREE.Color('#c41230');

export function Sigil() {
  const { progressRef } = useJourney();
  const groupRef = useRef<THREE.Group>(null);

  const parts = useMemo(() => {
    const spiralPts = sampleSpiral(400);
    const triPts = sampleTriangle(240);
    const eyePts = sampleEye(200);
    const irisPts = sampleCircle(120, 0.5);
    const pupilPts = sampleCircle(80, 0.16);
    const mk = (pts: Float32Array, color: THREE.Color, opacity: number, loop: boolean) => {
      const geometry = lineGeometry(pts);
      const material = new THREE.LineBasicMaterial({
        color: color.clone(),
        transparent: true,
        opacity,
        depthWrite: false,
      });
      const object = loop ? new THREE.LineLoop(geometry, material) : new THREE.Line(geometry, material);
      object.frustumCulled = false;
      return { geometry, material, object, count: pts.length / 3 };
    };
    return {
      spiral: mk(spiralPts, CHALK, 0.4, false),
      tri: mk(triPts, CHALK, 0.85, true),
      eye: mk(eyePts, CHALK, 0.85, true),
      iris: mk(irisPts, RED_BASE, 0.95, true),
      pupil: mk(pupilPts, RED_BASE, 0.95, true),
    };
  }, []);

  useFrame(() => {
    const g = groupRef.current;
    if (!g) return;
    const p = progressRef.current ?? 0;
    const cp = phaseProgress(p, 'contraction');
    const visible = cp > 0.12;
    g.visible = visible;
    if (!visible || g.children.length < 5) return;

    // mutate through the scene graph (children order matches render order)
    const [spiralL, triL, eyeL, irisL, pupilL] = g.children as (THREE.Line & {
      material: THREE.LineBasicMaterial;
    })[];

    // spiral sketches in with the converging dust, then yields to the sigil
    const spiralDraw = smoothstep(0.18, 0.55, cp);
    const spiralFade = 1 - smoothstep(0.6, 0.78, cp);
    spiralL.geometry.setDrawRange(0, Math.floor(parts.spiral.count * spiralDraw));
    spiralL.material.opacity = 0.4 * spiralFade;

    // triangle + eye resolve
    const triDraw = smoothstep(0.55, 0.8, cp);
    const eyeDraw = smoothstep(0.62, 0.86, cp);
    const irisDraw = smoothstep(0.7, 0.9, cp);
    triL.geometry.setDrawRange(0, Math.floor(parts.tri.count * triDraw));
    eyeL.geometry.setDrawRange(0, Math.floor(parts.eye.count * eyeDraw));
    irisL.geometry.setDrawRange(0, Math.floor(parts.iris.count * irisDraw));
    pupilL.geometry.setDrawRange(0, Math.floor(parts.pupil.count * irisDraw));

    // hold, then pulse ONCE (gaussian bell at cp ≈ 0.93)
    const d = (cp - 0.93) / 0.045;
    const pulse = Math.exp(-d * d);
    g.scale.setScalar(1 + pulse * 0.05);
    // the red exceeds 1.0 during the pulse — bloom catches only this
    irisL.material.color.copy(RED_BASE).multiplyScalar(1 + pulse * 2.4);
    pupilL.material.color.copy(RED_BASE).multiplyScalar(1 + pulse * 2.4);
    triL.material.opacity = 0.85 * (0.8 + pulse * 0.2);
    eyeL.material.opacity = 0.85 * (0.8 + pulse * 0.2);
  });

  return (
    <group ref={groupRef} position={[0, 0, SIGIL_Z]} visible={false}>
      <primitive object={parts.spiral.object} />
      <primitive object={parts.tri.object} />
      <primitive object={parts.eye.object} />
      <primitive object={parts.iris.object} />
      <primitive object={parts.pupil.object} />
    </group>
  );
}
