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

import { Suspense, useCallback, useRef, useState } from 'react';
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
  // Read once at mount rather than in an effect. This component is imported
  // with ssr:false, so `window` is there on the first render and setting state
  // from an effect would only cost a second pass.
  const [reduced] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

  // THE HOVER LABEL IS WRITTEN TO THE DOM DIRECTLY, AND MUST STAY THAT WAY.
  //
  // It used to be React state on this component, which looked harmless and was
  // not. @react-three/postprocessing builds its pass chain in a layout effect
  // keyed on [composer, children, camera, normalPass, downSamplingPass], and
  // `children` is fresh JSX on every render of this component. So every single
  // door hover ran removePass() over the whole chain, then addPass() over a
  // freshly constructed set of EffectPass objects — which means compiling new
  // shader programs, mid-interaction, every time the pointer crossed a prop.
  //
  // Writing the label imperatively keeps this component from re-rendering at
  // all, so the chain is built once and left alone. Any future overlay that
  // needs to change on hover belongs in its own sibling component with its own
  // state, NOT here.
  const labelRef = useRef<HTMLDivElement>(null);
  const onHover = useCallback((next: string | null) => {
    const el = labelRef.current;
    if (!el) return;
    el.textContent = next ?? '';
    el.style.opacity = next ? '0.92' : '0';
    el.style.transform = `translateY(${next ? 0 : 6}px)`;
  }, []);

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#0a0908' }}>
      <Canvas
        shadows
        dpr={[1, 2]}
        // antialias off deliberately: the composer resolves in its own
        // multisampled buffers, so MSAA on the default framebuffer buys
        // nothing and costs an implicit resolve every frame.
        gl={{ antialias: false, powerPreference: 'high-performance' }}
        onCreated={({ scene }) => {
          // NOTE: do NOT set gl.toneMapping here. @react-three/postprocessing
          // forces NoToneMapping onto the renderer for as long as it is
          // mounted, so anything assigned here is dead code — this room went
          // un-graded for its whole life because of exactly that. The fix is a
          // ToneMapping pass in the chain; see the note at the end of it for
          // why that is not in yet.
          scene.fog = new THREE.FogExp2(0x0a0908, 0.055);
        }}
      >
        <CameraRig reduced={reduced} />
        <Practicals reduced={reduced} />
        <Suspense fallback={null}>
          <Room />
          <Props onHover={onHover} />
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
          {/* NO TONE MAPPING PASS — deliberately, and this is not an oversight.
              This composer pins the renderer to NoToneMapping (see onCreated),
              so the room has always rendered with no tone curve at all, and
              <ToneMapping mode={ACES_FILMIC}/> here is the textbook fix.

              It is not in because it renders the room COMPLETELY BLACK, with
              zero console errors: mean frame luminance 1.6 against a 19.7
              baseline, measured at a 26 s settle so it is not a load-timing
              artefact, and unchanged with adaptive={false} — which rules out
              the AdaptiveLuminancePass that was the obvious suspect. Cause
              still unidentified.

              It may behave on real hardware, but a change whose failure mode
              is a black site and which cannot be verified here is not worth a
              highlight rolloff. Revisit deliberately, alongside a re-tune of
              the practicals, because grading the room moves every value in it. */}
        </EffectComposer>
      </Canvas>

      {/* the door label — mono, tracked, bottom left, no box around it */}
      <div
        ref={labelRef}
        aria-live="polite"
        style={{
          position: 'absolute', left: 32, bottom: 30, pointerEvents: 'none',
          fontFamily: "'JetBrains Mono', ui-monospace, monospace",
          fontSize: '0.7rem', letterSpacing: '0.24em', color: '#e8e4dc',
          opacity: 0,
          transform: 'translateY(6px)',
          transition: 'opacity .28s ease, transform .28s ease',
        }}
      />
    </div>
  );
}
