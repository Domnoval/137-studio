'use client';

// OWNED BY FINALE agent.
// CONTRACTION (62–78%) — the DOM choreography wrapped around the 3D sigil.
// Three responsibilities, nothing more:
//   1. "α ≈ 1/137.035999" — one mono line that surfaces beneath the sigil
//      while it holds and dissolves as it pulses (blur + tracking expansion).
//   2. A 2D contraction for mobile / no-WebGL / reduced-motion, where there is
//      no Three scene at all: the same 137 sigil drawn in chalk SVG, holding
//      and pulsing once against the void so the descent still bottoms out.
//   3. The darkness veil that closes the 3D out and hands the journey to
//      RETURN on a matched void (#0e0c0a) — the seam-killer. zIndex 1: above
//      the fixed Cosmos canvas (0), below DOM sections (2).
//
// Everything is scrubbed off RAW scroll depth via the gsap ticker (Lenis
// already smooths the scroll itself; the context adds a second, frame-rate
// dependent lerp that slides these beats off-cue on slow machines). Zero
// re-renders, fully deterministic against scroll position.
// reducedMotion: things appear and disappear — no blur, no drift.

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { useJourney } from './JourneyContext';
import { clamp01 } from './journey-utils';

const VOID = '#0e0c0a';
const CHALK = '#e8e4dc';
const RED = '#c41230';
const MONO = "'JetBrains Mono', monospace";

// Global-progress windows. The 3D sigil resolves by ~0.71, holds and pulses
// at ~0.729, then rushes the camera from 0.752; the veil closes behind it.
const LINE_IN_START = 0.688;
const LINE_IN_END = 0.716;
const LINE_OUT_START = 0.744;
const LINE_OUT_END = 0.768;
const VEIL_START = 0.776;
const VEIL_END = 0.8;

// Mobile / no-WebGL sigil beat (there is no 3D climax to hang off).
const M_IN_START = 0.658;
const M_IN_END = 0.712;
const M_PULSE = 0.734;
const M_OUT_START = 0.762;
const M_OUT_END = 0.792;

const smooth = (t: number) => t * t * (3 - 2 * t);

export function Contraction() {
  const { reducedMotion, isMobile, webglOk } = useJourney();
  const wrapRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<HTMLSpanElement>(null);
  const veilRef = useRef<HTMLDivElement>(null);
  const mobileRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const irisRef = useRef<SVGCircleElement>(null);

  // The 3D path is live only when Cosmos itself mounts the canvas.
  const flat = isMobile || !webglOk || reducedMotion;
  const flatRef = useRef(flat);
  flatRef.current = flat;

  useEffect(() => {
    let wrapShown: boolean | null = null;
    let veilShown: boolean | null = null;
    let mobShown: boolean | null = null;
    let maxScroll = 1;
    let age = 999;

    const raw = (): number => {
      if (age++ > 30) {
        age = 0;
        maxScroll = Math.max(
          document.documentElement.scrollHeight - window.innerHeight,
          1,
        );
      }
      return clamp01(window.scrollY / maxScroll);
    };

    const update = () => {
      const p = raw();
      const wrap = wrapRef.current;
      const line = lineRef.current;
      const veil = veilRef.current;
      const mob = mobileRef.current;
      const svg = svgRef.current;
      const iris = irisRef.current;
      if (!wrap || !line || !veil || !mob || !svg || !iris) return;

      // ---- the constant: α ≈ 1/137.035999 ----
      const tin = smooth(
        clamp01((p - LINE_IN_START) / (LINE_IN_END - LINE_IN_START)),
      );
      const tout = smooth(
        clamp01((p - LINE_OUT_START) / (LINE_OUT_END - LINE_OUT_START)),
      );
      let o: number;
      if (reducedMotion) {
        o = p >= LINE_IN_START && p <= LINE_OUT_END ? 0.85 : 0;
        line.style.opacity = o.toFixed(3);
        line.style.filter = 'none';
        line.style.transform = 'none';
      } else {
        o = tin * (1 - tout) * 0.9;
        line.style.opacity = o.toFixed(4);
        const blur = (1 - tin) * 5 + tout * 7;
        line.style.filter = blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : 'none';
        line.style.transform = `translateY(${((1 - tin) * 12 - tout * 16).toFixed(2)}px)`;
        const ls = 0.25 + tout * 0.22; // tracking expands as it dissolves
        line.style.letterSpacing = `${ls.toFixed(3)}em`;
        line.style.paddingLeft = `${ls.toFixed(3)}em`; // keep optically centred
      }
      const wantWrap = o > 0.001 && !flatRef.current;
      if (wantWrap !== wrapShown) {
        wrap.style.visibility = wantWrap ? 'visible' : 'hidden';
        wrapShown = wantWrap;
      }

      // ---- flat (2D) sigil beat ----
      if (flatRef.current) {
        const min = smooth(clamp01((p - M_IN_START) / (M_IN_END - M_IN_START)));
        const mout = smooth(
          clamp01((p - M_OUT_START) / (M_OUT_END - M_OUT_START)),
        );
        const mo = min * (1 - mout);
        const d = (p - M_PULSE) / 0.012;
        const pulse = reducedMotion ? 0 : Math.exp(-d * d);
        mob.style.opacity = mo.toFixed(4);
        svg.style.transform = `scale(${(0.96 + min * 0.04 + pulse * 0.035).toFixed(4)})`;
        svg.style.filter = pulse > 0.02 ? `brightness(${(1 + pulse * 0.9).toFixed(3)})` : 'none';
        iris.setAttribute('stroke-width', (2 + pulse * 3).toFixed(2));
        const wantMob = mo > 0.002;
        if (wantMob !== mobShown) {
          mob.style.visibility = wantMob ? 'visible' : 'hidden';
          mobShown = wantMob;
        }
      } else if (mobShown !== false) {
        mob.style.visibility = 'hidden';
        mob.style.opacity = '0';
        mobShown = false;
      }

      // ---- darkness veil: the hand-off to RETURN ----
      // on the flat path the veil must be solid BEFORE the sigil card fades,
      // or the artwork stack flashes back through the seam
      const start = flatRef.current ? M_OUT_START - 0.012 : VEIL_START;
      const end = flatRef.current ? M_OUT_START + 0.02 : VEIL_END;
      const vo = smooth(clamp01((p - start) / (end - start)));
      veil.style.opacity = vo.toFixed(4);
      const wantVeil = vo > 0.001;
      if (wantVeil !== veilShown) {
        veil.style.visibility = wantVeil ? 'visible' : 'hidden';
        veilShown = wantVeil;
      }
    };

    gsap.ticker.add(update);
    return () => gsap.ticker.remove(update);
  }, [reducedMotion]);

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

      {/* Flat sigil — mobile / no WebGL / reduced motion. */}
      <div
        ref={mobileRef}
        data-phase="contraction-flat"
        aria-hidden
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1,
          display: 'grid',
          placeItems: 'center',
          background: VOID,
          opacity: 0,
          visibility: 'hidden',
          pointerEvents: 'none',
        }}
      >
        <svg
          ref={svgRef}
          viewBox="0 0 200 190"
          fill="none"
          style={{
            width: 'min(88vw, 52vh)',
            height: 'auto',
            overflow: 'visible',
            willChange: 'transform, filter',
          }}
        >
          <path
            d="M100 14 L188 168 L12 168 Z"
            stroke={CHALK}
            strokeWidth="1.6"
            strokeLinejoin="round"
            opacity="0.92"
          />
          <path
            d="M46 108 Q100 58 154 108 Q100 158 46 108 Z"
            stroke={CHALK}
            strokeWidth="1.6"
            opacity="0.92"
          />
          <circle cx="100" cy="108" r="20" stroke={RED} strokeWidth="2" ref={irisRef} />
          <circle cx="100" cy="108" r="6.5" stroke={RED} strokeWidth="2" />
        </svg>
      </div>

      {/* The constant — a single mono line beneath the 3D sigil. */}
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
            top: '80%',
            textAlign: 'center',
            fontFamily: MONO,
            fontWeight: 300,
            fontSize: '0.72rem',
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
