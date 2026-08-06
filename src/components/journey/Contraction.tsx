'use client';

// OWNED BY FINALE agent.
// CONTRACTION (62–78%) — DOM overlay choreography around the 3D sigil moment.
// The 3D geometry itself (particles → golden spiral → triangle + eye) is the
// COSMOS agent's job (lives in ./cosmos/). This file owns exactly two things:
//   1. A single mono line — "α ≈ 1/137.035999" — that fades in just below the
//      sigil while it holds, then dissolves (blur + tracking expansion).
//      Sparse by design: the 3D is the star.
//   2. The DOM darkness veil that fades in at 76–78% to hand the journey off
//      to RETURN on a matched void (#0e0c0a) — the seam-killer. It sits at
//      zIndex 1: above the fixed Cosmos canvas (0), below DOM sections (2).
// Everything is scrubbed off progressRef via the gsap ticker — zero
// re-renders, fully deterministic against scroll.
// reducedMotion: the line simply appears/disappears — no blur, no drift.

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { useJourney } from './JourneyContext';
import { clamp01 } from './journey-utils';

const VOID = '#0e0c0a';
const CHALK = '#e8e4dc';
const MONO = "'JetBrains Mono', monospace";

// Global-progress windows (contraction band = 0.62–0.78).
const LINE_IN_START = 0.652; // sigil is forming — the constant surfaces
const LINE_IN_END = 0.684;
const LINE_OUT_START = 0.724; // sigil pulses — the constant dissolves
const LINE_OUT_END = 0.756;
const VEIL_START = 0.76; // hand-off to RETURN begins
const VEIL_END = 0.783;

export function Contraction() {
  const { reducedMotion, progressRef } = useJourney();
  const wrapRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<HTMLSpanElement>(null);
  const veilRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let wrapShown: boolean | null = null;
    let veilShown: boolean | null = null;

    const update = () => {
      const p = progressRef.current ?? 0;
      const wrap = wrapRef.current;
      const line = lineRef.current;
      const veil = veilRef.current;
      if (!wrap || !line || !veil) return;

      // ---- the constant: α ≈ 1/137.035999 ----
      const tin = clamp01((p - LINE_IN_START) / (LINE_IN_END - LINE_IN_START));
      const tout = clamp01((p - LINE_OUT_START) / (LINE_OUT_END - LINE_OUT_START));
      let o: number;
      if (reducedMotion) {
        o = p >= LINE_IN_START && p <= LINE_OUT_END ? 0.85 : 0;
        line.style.opacity = o.toFixed(3);
        line.style.filter = 'none';
        line.style.transform = 'none';
      } else {
        o = tin * (1 - tout) * 0.85;
        line.style.opacity = o.toFixed(4);
        const blur = (1 - tin) * 5 + tout * 7;
        line.style.filter = blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : 'none';
        line.style.transform = `translateY(${((1 - tin) * 12 - tout * 16).toFixed(2)}px)`;
        const ls = 0.25 + tout * 0.22; // tracking expands as it dissolves
        line.style.letterSpacing = `${ls.toFixed(3)}em`;
        line.style.paddingLeft = `${ls.toFixed(3)}em`; // keep optically centered
      }
      const wantWrap = o > 0.001;
      if (wantWrap !== wrapShown) {
        wrap.style.visibility = wantWrap ? 'visible' : 'hidden';
        wrapShown = wantWrap;
      }

      // ---- darkness veil: 76–78% hand-off to RETURN ----
      const vo = clamp01((p - VEIL_START) / (VEIL_END - VEIL_START));
      veil.style.opacity = vo.toFixed(4);
      const wantVeil = vo > 0.001;
      if (wantVeil !== veilShown) {
        veil.style.visibility = wantVeil ? 'visible' : 'hidden';
        veilShown = wantVeil;
      }
    };

    gsap.ticker.add(update);
    return () => gsap.ticker.remove(update);
  }, [reducedMotion, progressRef]);

  return (
    <>
      {/* Void veil — above the canvas, below DOM. The RETURN backdrop. */}
      <div
        ref={veilRef}
        data-phase="contraction-veil"
        aria-hidden
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1,
          background: VOID,
          opacity: 0,
          visibility: 'hidden',
          pointerEvents: 'none',
        }}
      />
      {/* The constant — a single mono line near the sigil. */}
      <div
        ref={wrapRef}
        data-phase="contraction"
        aria-hidden
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 2,
          visibility: 'hidden',
          pointerEvents: 'none',
        }}
      >
        <span
          ref={lineRef}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: '63.8%',
            textAlign: 'center',
            fontFamily: MONO,
            fontWeight: 300,
            fontSize: '0.75rem',
            letterSpacing: '0.25em',
            paddingLeft: '0.25em',
            color: CHALK,
            opacity: 0,
            willChange: 'opacity, transform, filter',
          }}
        >
          α ≈ 1/137.035999
        </span>
      </div>
    </>
  );
}
