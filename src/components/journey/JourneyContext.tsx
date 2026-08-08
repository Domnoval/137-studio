'use client';

// src/components/journey/JourneyContext.tsx
// OWNED BY SCAFFOLD. Single source of truth for journey progress.
// Sections READ progress here — they never own the scroll.
//
// Two ways to consume:
//   1. useJourney() — React state; updates every animation frame while the
//      user scrolls. Fine for DOM sections and phase gating.
//   2. progressRef / velocityRef — mutable refs updated every frame with zero
//      re-renders. REQUIRED inside R3F useFrame loops (Cosmos): read
//      progressRef.current there instead of subscribing to state.

import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  type PhaseName,
  phaseFor,
  detectWebGL,
  detectMobile,
  detectReducedMotion,
  clamp01,
} from './journey-utils';

export interface JourneyState {
  /** 0-1 lerp-smoothed global scroll progress of the whole journey. */
  progress: number;
  /** Phase derived from progress (VISION.md percentages). */
  phase: PhaseName;
  /** Smoothed scroll velocity in progress-units/second (signed). */
  velocity: number;
  reducedMotion: boolean;
  isMobile: boolean;
  webglOk: boolean;
  /** Artwork id currently open in WorkModal (Cosmos sets it, WorkModal reads it). */
  selectedWork: string | null;
  setSelectedWork: (id: string | null) => void;
  /** Per-frame smoothed progress, no re-render. Use inside useFrame/rAF loops. */
  progressRef: React.RefObject<number>;
  /** Per-frame smoothed velocity, no re-render. */
  velocityRef: React.RefObject<number>;
}

const JourneyContext = createContext<JourneyState | null>(null);

// Exponential-damp rates, expressed per SECOND so the smoothing is identical at
// 144fps, 60fps and the 3fps a headless SwiftShader run manages. (A per-frame
// lerp of 0.09 is the same as damp rate -60·ln(1-0.09) ≈ 5.66 at 60fps; the old
// per-frame form lagged progress by ~0.2 on slow machines, which desynced every
// phase from every other one.)
const SMOOTH_RATE = 5.66;
const VEL_RATE = 7.67;

export function JourneyProvider({ children }: { children: React.ReactNode }) {
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<PhaseName>('arrival');
  const [velocity, setVelocity] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [webglOk, setWebglOk] = useState(false);
  const [selectedWork, setSelectedWork] = useState<string | null>(null);
  const progressRef = useRef(0);
  const velocityRef = useRef(0);

  // Environment flags — client-only, resolved after hydration (SSR-safe).
  useEffect(() => {
    // Client-only detection must run post-hydration; setState here is intended.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReducedMotion(detectReducedMotion());
    setIsMobile(detectMobile());
    setWebglOk(detectWebGL());
    const mqMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const mqMobile = window.matchMedia('(max-width: 767px)');
    const onMotion = () => setReducedMotion(mqMotion.matches);
    const onMobile = () => setIsMobile(mqMobile.matches);
    mqMotion.addEventListener('change', onMotion);
    mqMobile.addEventListener('change', onMobile);
    return () => {
      mqMotion.removeEventListener('change', onMotion);
      mqMobile.removeEventListener('change', onMobile);
    };
  }, []);

  // Progress loop — reads window scroll (Lenis drives native scroll), smooths it.
  useEffect(() => {
    let rafId = 0;
    let smoothed = 0;
    let vel = 0;
    let prevRaw = 0;
    let prevTime = performance.now();
    const tick = (now: number) => {
      // clamped so a tab-restore or a long GC pause cannot snap the journey
      const dt = Math.min(Math.max((now - prevTime) / 1000, 1e-4), 0.5);
      prevTime = now;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const raw = max > 0 ? clamp01(window.scrollY / max) : 0;
      vel += ((raw - prevRaw) / dt - vel) * (1 - Math.exp(-VEL_RATE * dt));
      if (Math.abs(vel) < 0.0005) vel = 0;
      prevRaw = raw;
      smoothed += (raw - smoothed) * (1 - Math.exp(-SMOOTH_RATE * dt));
      if (Math.abs(raw - smoothed) < 0.0002) smoothed = raw;
      progressRef.current = smoothed;
      velocityRef.current = vel;
      // Functional updates + epsilon: zero re-renders while idle.
      setProgress((p) => (Math.abs(p - smoothed) > 0.0002 ? smoothed : p));
      setVelocity((v) => (Math.abs(v - vel) > 0.002 ? vel : v));
      setPhase((ph) => {
        const next = phaseFor(smoothed);
        return next === ph ? ph : next;
      });
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const value = useMemo<JourneyState>(
    () => ({
      progress,
      phase,
      velocity,
      reducedMotion,
      isMobile,
      webglOk,
      selectedWork,
      setSelectedWork,
      progressRef,
      velocityRef,
    }),
    [progress, phase, velocity, reducedMotion, isMobile, webglOk, selectedWork],
  );

  return <JourneyContext.Provider value={value}>{children}</JourneyContext.Provider>;
}

export function useJourney(): JourneyState {
  const ctx = useContext(JourneyContext);
  if (!ctx) throw new Error('useJourney must be used inside <JourneyProvider>');
  return ctx;
}
