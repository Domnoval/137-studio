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
// Two of the seven cast shadows — the candelabra and the console screen, both
// flagged in PRACTICALS. Seven shadow-casting point lights would cost seven
// cube-map renders a frame for a room this small, and away from those two the
// eye cannot tell the rest are faking it.
//
// EXPOSURE. This room is dark on purpose and was accidentally BLACK: the
// surfaces were painted at roughly 1.6% reflectance, so nearly half of every
// frame sat below 8/255 carrying no information at all. Darkness here has to
// come from falloff and from where the practicals do not reach, never from
// low albedo — see the note above stoneCanvas in Room.tsx, and measure any
// change with tools/asset-forge/measure.mjs before trusting your eye. The
// room was tuned by eye against a bug for months.

import { Suspense, useCallback, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { AdaptiveDpr, Preload } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, ChromaticAberration, SSAO, ToneMapping } from '@react-three/postprocessing';
import { BlendFunction, ToneMappingMode } from 'postprocessing';
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
          // The candelabra (5) and the console screen (1) both cast. Two is
          // the affordable number — each shadow-casting point light is a cube
          // render per frame. The candelabra throws the room's long shadows;
          // the console grounds everything standing on the bench, which is
          // where the eye actually rests.
          //
          // INDEX BY NAME, NOT BY NUMBER. This read `i === 3` for weeks, and
          // 3 is the LEFT MONITOR WASH — a 1.5-intensity invisible green fill
          // tucked behind the screens. So the room's key light cast nothing at
          // all, while a dim fill burned a shadow cube every frame and threw
          // hard shadows from behind a wall. The cool rim was inserted at
          // index 2 long after this line was written and pushed every index
          // below it down by one; nothing complained, because a wrong index is
          // still a valid light. PRACTICALS carries a `casts` flag now so the
          // fact lives next to the light it describes and travels with it.
          castShadow={!reduced && p.casts === true}
          shadow-mapSize={[1024, 1024]}
          shadow-bias={-0.0015}
          shadow-normalBias={0.02}
        />
      ))}
      {/* THE FILL, and it is doing a real job now rather than a token one.
          At 0.055 / 0.09 this was decorative: everywhere the seven practicals
          did not reach fell to zero, which is most of the ceiling, both far
          corners and the floor behind the seat — about a quarter of the frame
          sitting flat below 8/255 with nothing in it.

          There is no bounce in this renderer. Every real room this dark still
          has light in its corners because the walls throw it back at each
          other, and with no GI something has to stand in for that. This is
          that stand-in, tinted to the two things doing the bouncing: a cool
          violet ambient off the stone, a warmer floor bounce below.

          It stays well under the practicals on purpose — fill that competes
          with the key is what makes a scene read as evenly lit, which is the
          one thing this room must never be. */}
      <ambientLight intensity={0.20} color="#4a3444" />
      <hemisphereLight args={['#3a4054', '#2a1c16', 0.34]} />
      {/* THE BOUNCE off the worktop, and the one fill light with a real
          physical alibi. Mapping the pure-black pixels put 43–80% of the
          BOTTOM EIGHTH of every single view at exactly zero: the front face of
          the bench, which the candelabra cannot reach because the bench itself
          is in the way. That is correct physics and terrible framing — an inky
          bar across the bottom of every frame the visitor ever sees.

          In a real room that face is not black, because the candelabra is
          pouring onto a pale timber worktop a foot above it and timber throws
          a lot of it back. No GI here, so this stands in for that: warm,
          weak, short-throw, sitting just above the slab in front of the
          sitter. Never a shadow caster — bounce has no hard edges. */}
      <pointLight
        color="#c9925f"
        intensity={2.2}
        distance={2.6}
        decay={2}
        position={[-0.3, 1.02, 0.75]}
      />
    </>
  );
}

// The tone curve, overridable from the URL as ?tm=aces|agx|neutral|none.
//
// This exists for the render rig in tools/asset-forge, and it earns its keep:
// grading is the one decision you cannot make by reasoning, only by looking,
// and swapping a curve used to mean an edit and a three-minute headless render
// per candidate. With this the rig shoots every curve in one pass off the same
// scene, so the comparison is honest — same frame, same settle, same noise.
// Anything unrecognised falls through to the shipping default.
// `none` is LINEAR rather than omitting the pass, so the chain has the same
// shape whichever curve is selected. Dropping a pass conditionally would make
// the rig's comparison shots differ by one shader stage as well as by the
// curve, and the point of the comparison is that nothing else moves.
const TONE_CURVES: Record<string, number> = {
  aces: ToneMappingMode.ACES_FILMIC,
  agx: ToneMappingMode.AGX,
  neutral: ToneMappingMode.NEUTRAL,
  none: ToneMappingMode.LINEAR,
};
const DEFAULT_CURVE = ToneMappingMode.AGX;

export function Studio() {
  // Read once at mount rather than in an effect. This component is imported
  // with ssr:false, so `window` is there on the first render and setting state
  // from an effect would only cost a second pass.
  const [reduced] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  const [curve] = useState(() => {
    const q = new URLSearchParams(window.location.search).get('tm');
    return q !== null && q in TONE_CURVES ? TONE_CURVES[q] : DEFAULT_CURVE;
  });

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
          // un-graded for its whole life because of exactly that. The curve
          // lives as a pass at the end of the chain; see the note there.
          //
          // Fog lifted off pure black along with the surfaces. Fog colour is
          // what distance converges TO, so at 0x0a0908 every far surface was
          // being pulled back toward the same near-black the albedo fix just
          // pulled it out of.
          scene.fog = new THREE.FogExp2(0x241a1c, 0.05);
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
          {/* Intensity was 26 against this effect's default of 1, and it was
              compensating for the wrong thing: with the walls at 1.6% albedo
              there was no tonal separation anywhere, so occlusion was the only
              contrast in the frame and it got cranked until the room looked
              three-dimensional. It multiplies, so at 26 every crease and wall
              corner went to pure zero — which is most of what was holding p05
              at 0 across every view after the exposure was fixed.
              The room has real light in it now. Occlusion can go back to
              seating objects rather than drawing the picture. */}
          <SSAO
            blendFunction={BlendFunction.MULTIPLY}
            samples={20}
            rings={4}
            radius={0.22}
            intensity={4.5}
            luminanceInfluence={0.55}
            worldDistanceThreshold={2.4}
            worldDistanceFalloff={0.6}
            worldProximityThreshold={0.4}
            worldProximityFalloff={0.1}
          />
          {/* Bloom runs on the HDR buffer, BEFORE the tone curve, which is why
              its threshold is above 1.0. Everything below 1.0 is a surface
              returning light it was given; only a source emitting more than it
              receives should smear, and after the albedo fix a threshold of
              0.78 caught most of the back wall. */}
          <Bloom intensity={0.55} luminanceThreshold={1.05} luminanceSmoothing={0.3} mipmapBlur />
          <ChromaticAberration
            blendFunction={BlendFunction.NORMAL}
            offset={new THREE.Vector2(0.0004, 0.0004)}
          />
          {/* Softened hard: at darkness 0.92 / offset 0.22 this was crushing
              the frame edges to black on its own, and heavy vignette is the
              single most recognisable tell of a scene trying to hide that it
              has nothing in the corners. The room has chalk in the corners
              now. Let it be seen. */}
          <Vignette eskil={false} offset={0.50} darkness={0.40} />
          {/* THE TONE CURVE, and the last thing in the chain by necessity —
              everything above it works in linear HDR.

              This was absent for the room's whole life, on a note saying it
              rendered the scene COMPLETELY BLACK (mean luminance 1.6 against a
              19.7 baseline). That measurement was real and the conclusion was
              wrong: a curve maps scene-referred light to display-referred, and
              this scene sat about four stops under where any curve expects its
              input. Median linear radiance was 0.0034, which ACES correctly
              maps to under 1/255. The curve was not broken. It was the only
              thing in the room telling the truth about the exposure.

              So the order matters and it is the reverse of the obvious one:
              fix the albedo, raise the practicals, THEN grade. Putting the
              curve in first makes the room black and makes the curve look
              guilty.

              AgX rather than ACES by default, which is the newer answer and
              the right one HERE specifically: every light in this room is a
              saturated practical — #c41230 neon, #4a8f6f monitors, #2e9fd4 rim
              — and ACES is well known for skewing exactly those hues as they
              climb (its reds march toward orange). AgX desaturates into the
              highlights instead of rotating them, so the neon stays red when
              it blooms. Compare for yourself with ?tm=aces. */}
          <ToneMapping mode={curve} />
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
