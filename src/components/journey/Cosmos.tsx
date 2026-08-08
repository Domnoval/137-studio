'use client';

// OWNED BY COSMOS agent.
// THE COSMOS (visible 8%–78%): fixed full-viewport R3F canvas behind the DOM.
// Golden-angle helix of painting slabs, dust starfield, equation glyphs, the
// apps constellation, and the contraction (dust → spiral → 137 sigil) — all
// driven by progressRef inside useFrame, never React state. Fade/pointer
// gating happens on the wrapper via a rAF that reads progressRef directly, so
// this component re-renders only when environment flags or the modal change.
// Mobile / no WebGL / reduced motion → <CosmosFallback/> (2D, no three).

import { useEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import { useJourney } from './JourneyContext';
import { PHASES, clamp01 } from './journey-utils';
import { cosmosShared } from './cosmos/shared';
import { CAM_START_Z } from './cosmos/cosmos-data';
import { CameraRig } from './cosmos/CameraRig';
import { Labels } from './cosmos/Labels';
import { Slabs } from './cosmos/Slabs';
import { Dust } from './cosmos/Dust';
import { Sigil } from './cosmos/Sigil';
import { Glyphs } from './cosmos/Glyphs';
import { AppsConstellation } from './cosmos/AppsConstellation';
import { Effects } from './cosmos/Effects';
import { CosmosFallback } from './cosmos/CosmosFallback';

export { CosmosFallback };

export function Cosmos() {
  const { webglOk, isMobile, reducedMotion, selectedWork, progressRef } = useJourney();
  const [mounted, setMounted] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const modalOpen = selectedWork !== null;
  const modalOpenRef = useRef(modalOpen);

  useEffect(() => {
    modalOpenRef.current = modalOpen;
  }, [modalOpen]);

  // Hydration-safe mount flag (same pattern the scaffold uses): the 3D/2D
  // decision must not run during SSR/first paint.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const use3D = mounted && webglOk && !isMobile && !reducedMotion;

  // cursor tracking (normalized, +y up) → shared store, consumed in useFrame
  useEffect(() => {
    if (!use3D) return;
    const onMove = (e: PointerEvent) => {
      cosmosShared.cursorX = (e.clientX / window.innerWidth) * 2 - 1;
      cosmosShared.cursorY = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, [use3D]);

  // opacity + pointer gating without re-render: rAF reads progressRef
  useEffect(() => {
    if (!use3D) return;
    const el = wrapperRef.current;
    if (!el) return;
    let raf = 0;
    let lastOpacity = -1;
    let lastPE = '';
    const tick = () => {
      const p = progressRef.current ?? 0;
      const fadeIn = clamp01((p - PHASES.dive.start) / 0.09);
      const fadeOut = 1 - clamp01((p - PHASES.contraction.end) / 0.08);
      const opacity = Math.min(fadeIn, fadeOut);
      if (Math.abs(opacity - lastOpacity) > 0.003) {
        lastOpacity = opacity;
        el.style.opacity = opacity.toFixed(3);
        el.style.visibility = opacity <= 0.001 ? 'hidden' : 'visible';
      }
      const inCosmos = p > PHASES.dive.end - 0.02 && p < PHASES.contraction.start + 0.02;
      const pe = inCosmos && !modalOpenRef.current ? 'auto' : 'none';
      if (pe !== lastPE) {
        lastPE = pe;
        el.style.pointerEvents = pe;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [use3D, progressRef]);

  if (!mounted) return null;

  if (!use3D) return <CosmosFallback />;

  return (
    <div
      ref={wrapperRef}
      data-phase="cosmos"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        opacity: 0,
        visibility: 'hidden',
        pointerEvents: 'none',
        background: '#0e0c0a',
      }}
    >
      <Canvas
        dpr={[1, 2]}
        gl={{ antialias: true, powerPreference: 'high-performance', alpha: false }}
        camera={{ fov: 55, near: 0.1, far: 160, position: [0, 0, CAM_START_Z] }}
        onCreated={({ gl, scene }) => {
          gl.setClearColor('#0d0c0d', 1);
          // dense enough that slabs deep in the corridor read as atmosphere
          // rather than as a competing wall of thumbnails
          scene.fog = new THREE.FogExp2('#0d0c0d', 0.024);
        }}
        style={{ width: '100%', height: '100%' }}
      >
        <CameraRig />
        <Slabs />
        <Dust />
        <Glyphs />
        <AppsConstellation />
        <Sigil />
        <Labels />
        <Effects />
      </Canvas>
      {/* Occlusion-aware label layer. Lives OUTSIDE the canvas so captions are
          crisp DOM type; Labels.tsx (inside the canvas) drives it imperatively
          via cosmosShared.labelLayer. */}
      <div
        ref={(el) => {
          cosmosShared.labelLayer = el;
        }}
        aria-hidden={false}
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 2,
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      />
    </div>
  );
}
