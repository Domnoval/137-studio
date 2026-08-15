'use client';

// The studio: the hub. Everything else in the site is a door out of this room.
//
// LIGHTING. There is no sun here. Every source is a practical that belongs to
// something you can see — the neon on the back wall, the console screen, the
// monitor bank, the candelabra, the radio dial. That is the whole reason the
// room reads as a place rather than a product shot: the light has a cause.
// A prop with an emissive map LOOKS lit but does not LIGHT anything, so each
// glowing prop gets a matching point light (PRACTICALS in studio-data.ts).
//
// Only the candelabra casts shadows. Five shadow-casting point lights would
// cost five cube-map renders a frame for a room this small, and in a space
// this dark you cannot tell the other four are faking it.

import { Suspense, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { AdaptiveDpr, Preload } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, ChromaticAberration, SSAO } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import * as THREE from 'three';
import { Room } from './Room';
import { Props } from './Props';
import { CameraRig } from './CameraRig';
import { PRACTICALS } from './studio-data';

function Practicals({ reduced }: { reduced: boolean }) {
  return (
    <>
      {PRACTICALS.map((p, i) => (
        <pointLight
          key={i}
          color={p.color}
          intensity={p.intensity}
          distance={p.distance}
          decay={2}
          position={p.position as unknown as [number, number, number]}
          // The candelabra (3) and the console screen (1) both cast. Two is
          // the affordable number — each shadow-casting point light is a cube
          // render per frame. The candelabra throws the room's long shadows;
          // the console grounds everything standing on the bench, which is
          // where the eye actually rests.
          castShadow={!reduced && (i === 3 || i === 1)}
          shadow-mapSize={[1024, 1024]}
          shadow-bias={-0.0015}
          shadow-normalBias={0.02}
        />
      ))}
      {/* the room is not pitch black in the corners, but very nearly */}
      <ambientLight intensity={0.055} color="#3d2a3a" />
      <hemisphereLight args={['#2a2d3a', '#0e0c0a', 0.09]} />
    </>
  );
}

export function Studio() {
  const [label, setLabel] = useState<string | null>(null);
  // Read once at mount rather than in an effect. This component is imported
  // with ssr:false, so `window` is there on the first render and setting state
  // from an effect would only cost a second pass.
  const [reduced] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#0a0908' }}>
      <Canvas
        shadows
        dpr={[1, 2]}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        onCreated={({ gl, scene }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.0;
          gl.outputColorSpace = THREE.SRGBColorSpace;
          scene.fog = new THREE.FogExp2(0x0a0908, 0.055);
        }}
      >
        <CameraRig reduced={reduced} />
        <Practicals reduced={reduced} />
        <Suspense fallback={null}>
          <Room />
          <Props onHover={setLabel} />
          <Preload all />
        </Suspense>
        <AdaptiveDpr pixelated />
        <EffectComposer enableNormalPass>
          {/* AMBIENT OCCLUSION. The thing that stops every object looking
              pasted onto the frame. Without it nothing darkens where it meets
              the bench, the wall corners stay as bright as their middles, and
              the whole room reads as flat planes with pictures on them — which
              is exactly how it read before this pass existed.
              Costs a normal pass; worth every millisecond. */}
          <SSAO
            blendFunction={BlendFunction.MULTIPLY}
            samples={20}
            rings={4}
            radius={0.22}
            intensity={26}
            luminanceInfluence={0.55}
            worldDistanceThreshold={2.4}
            worldDistanceFalloff={0.6}
            worldProximityThreshold={0.4}
            worldProximityFalloff={0.1}
          />
          {/* only genuinely emissive pixels bloom — a low threshold turns
              every lit brass edge into a glass smear */}
          <Bloom intensity={0.62} luminanceThreshold={0.78} luminanceSmoothing={0.28} mipmapBlur />
          <ChromaticAberration
            blendFunction={BlendFunction.NORMAL}
            offset={new THREE.Vector2(0.0006, 0.0006)}
          />
          <Vignette eskil={false} offset={0.22} darkness={0.92} />
        </EffectComposer>
      </Canvas>

      {/* the door label — mono, tracked, bottom left, no box around it */}
      <div
        aria-live="polite"
        style={{
          position: 'absolute', left: 32, bottom: 30, pointerEvents: 'none',
          fontFamily: "'JetBrains Mono', ui-monospace, monospace",
          fontSize: '0.7rem', letterSpacing: '0.24em', color: '#e8e4dc',
          opacity: label ? 0.92 : 0,
          transform: `translateY(${label ? 0 : 6}px)`,
          transition: 'opacity .28s ease, transform .28s ease',
        }}
      >
        {label ?? ''}
      </div>
    </div>
  );
}
