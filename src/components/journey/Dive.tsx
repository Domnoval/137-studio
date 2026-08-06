'use client';

// OWNED BY HERO agent.
// THE DIVE (8–18%): scrubs a paused GSAP timeline against the smoothed
// journey progress (progressRef — Lenis-lerped, so this IS scroll-scrubbed).
// The pinning itself is Hero.tsx's sticky layer; this file owns the
// choreography: letters translate/scale in Z with a blur ramp, the hero
// image scales past camera and parts (dual clip-path halves), and the
// .hero-void DOM black (#0e0c0a) fades to transparent revealing the fixed
// Cosmos canvas behind — matched blacks make the seam invisible.
// reducedMotion: no pin (Hero drops sticky), simple opacity crossfade only.

import { useEffect } from 'react';
import gsap from 'gsap';
import { useJourney } from './JourneyContext';
import { PHASES, clamp01 } from './journey-utils';

/** Deterministic per-letter pseudo-random (stable across mounts). */
function prand(i: number, salt: number): number {
  const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export function Dive() {
  const { reducedMotion, progressRef } = useJourney();

  useEffect(() => {
    const { start, end } = PHASES.dive;
    const span = end - start;

    // ---- reduced motion: simple opacity crossfade, nothing else ----
    if (reducedMotion) {
      const stage = document.querySelector<HTMLElement>('.hero-stage');
      const voidEl = document.querySelector<HTMLElement>('.hero-void');
      let last = -1;
      const update = () => {
        const p = clamp01(((progressRef.current ?? 0) - start) / span);
        if (p === last) return;
        last = p;
        const o = (1 - p).toFixed(4);
        if (stage) stage.style.opacity = o;
        if (voidEl) voidEl.style.opacity = o;
      };
      gsap.ticker.add(update);
      return () => gsap.ticker.remove(update);
    }

    // ---- full dive timeline (normalized 0→1, scrubbed by progress) ----
    const letters = gsap.utils.toArray<HTMLElement>('.hero-letter');
    const tl = gsap.timeline({ paused: true, defaults: { overwrite: 'auto' } });

    // Red rule collapses first — the door opens.
    tl.to('.hero-rule', { scaleX: 0, opacity: 0, duration: 0.2, ease: 'power2.in' }, 0);

    // Letters drift apart and fly past the camera in Z (perspective on the
    // h1, preserve-3d on the lines), with a blur ramp. data-dx = offset from
    // the letter's own line center so each line parts symmetrically.
    tl.to(
      letters,
      {
        z: (i) => 520 + prand(i, 1) * 980,
        x: (i, el) => {
          const dx = parseFloat((el as HTMLElement).dataset.dx ?? '0');
          return dx * (30 + prand(i, 2) * 44);
        },
        y: (i) => (prand(i, 3) - 0.5) * 200,
        rotationX: (i) => (prand(i, 4) - 0.5) * 46,
        rotationY: (i) => (prand(i, 5) - 0.5) * 34,
        opacity: 0,
        filter: 'blur(13px)',
        duration: 0.55,
        ease: 'power2.in',
        stagger: { each: 0.012, from: 'random' },
      },
      0.02,
    );

    // Hero image scales past the camera and parts like a veil.
    tl.to('.hero-art-frame', { scale: 1.8, opacity: 0, duration: 0.65, ease: 'power2.in' }, 0.08);
    tl.to('.hero-art-left', { xPercent: -72, duration: 0.55, ease: 'power2.in' }, 0.14);
    tl.to('.hero-art-right', { xPercent: 72, duration: 0.55, ease: 'power2.in' }, 0.14);

    // DOM void → transparent: the fixed Cosmos canvas is revealed behind.
    // Linear so the crossfade tracks scroll exactly (Cosmos fades itself in
    // over the same band; both blacks are #0e0c0a). Ends at 0.92 — the last
    // stretch is slack so smoothing lag can never un-pin a half-faded void.
    tl.to('.hero-void', { opacity: 0, duration: 0.5, ease: 'none' }, 0.42);
    tl.to({}, { duration: 0.08 }, 0.92); // pad timeline to a full 1.0

    let last = -1;
    const update = () => {
      const p = clamp01(((progressRef.current ?? 0) - start) / span);
      if (p === last) return;
      last = p;
      tl.progress(p);
    };
    gsap.ticker.add(update);

    return () => {
      gsap.ticker.remove(update);
      tl.kill();
    };
  }, [reducedMotion, progressRef]);

  // The band itself is invisible — the pinned Hero layer is the canvas the
  // dive plays on. Kept for phase semantics / debugging.
  const { start, end } = PHASES.dive;
  return (
    <section
      data-phase="dive"
      aria-hidden
      style={{
        position: 'absolute',
        top: `${start * 100}%`,
        height: `${(end - start) * 100}%`,
        left: 0,
        width: '100%',
        zIndex: 2,
        pointerEvents: 'none',
      }}
    />
  );
}
