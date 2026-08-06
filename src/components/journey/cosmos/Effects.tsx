'use client';

// cosmos/Effects.tsx — OWNED BY COSMOS agent.
// Post chain, tuned for restraint: bloom with a threshold above 1.0 so ONLY
// deliberately-overdriven red (slab glow, sigil pulse) blooms; whisper of
// chromatic aberration at frame edges; subtle vignette. Film grain is DOM
// (ATMOSPHERE agent) — none here.

import { useMemo } from 'react';
import { EffectComposer, Bloom, ChromaticAberration, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';

export function Effects() {
  const caOffset = useMemo(() => new THREE.Vector2(0.00045, 0.0003), []);
  return (
    <EffectComposer multisampling={0}>
      <Bloom mipmapBlur intensity={0.55} luminanceThreshold={1.05} luminanceSmoothing={0.25} radius={0.72} />
      <ChromaticAberration offset={caOffset} radialModulation modulationOffset={0.42} />
      <Vignette eskil={false} offset={0.26} darkness={0.62} />
    </EffectComposer>
  );
}
