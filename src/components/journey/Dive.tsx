'use client';

// OWNED BY HERO agent.
// THE DIVE (~7.5–18%): scrubs a paused GSAP timeline against scroll.
// The pinning itself is Hero.tsx's sticky layer; this file owns the
// choreography: the red rule collapses into the artwork's seam, the letters
// scale up past the camera in Z with a per-letter blur ramp, the hero image
// parts like a veil along that seam, and the .hero-void DOM black (#0e0c0a)
// fades to transparent revealing the fixed Cosmos canvas behind — matched
// blacks make the seam invisible.
//
// SCRUB SOURCE — the fix that makes the dive actually visible: this reads raw
// window scroll and applies a FRAME-RATE-INDEPENDENT one-pole filter.
// JourneyContext's progressRef lerps a fixed 0.09 per FRAME, so when the
// cosmos drops the frame rate (software GL ≈ 3fps) the timeline lagged the
// scroll by whole seconds — at 18% scroll it was still playing ~9%, which is
// why the first three beats of the site looked like three identical stills.
//
// EASING — the separation/veil/scale tweens are front-loaded (power1.out) and
// only the Z-flight is back-loaded (power2.in): the dive must READ within its
// first fifth, not resolve entirely in its last.
//
// reducedMotion: no pin (Hero drops sticky), simple opacity crossfade only.

import { useEffect } from 'react';
import gsap from 'gsap';
import { useJourney } from './JourneyContext';
import { PHASES, clamp01 } from './journey-utils';

/**
 * The dive takes the wheel WELL before the nominal 8%.
 *
 * At 0.075 the whole 0–8% band was one picture: a sweep's 0% and 7.7% frames
 * differed by 2.2vh of drift and nothing else. Starting the fall at 5% means
 * the 7.7% frame is already 21% into the dive — the veil is opening, the
 * letters have begun to separate and the void has started to lift — so no 8%
 * stretch of the journey stands still. (Hero.tsx's ARRIVAL_END matches this;
 * the two are one decision.)
 */
const DIVE_START = 0.05;
const DIVE_END = PHASES.dive.end; // 0.18

/** Deterministic per-letter pseudo-random (stable across mounts). */
function prand(i: number, salt: number): number {
  const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/** Raw (unsmoothed) journey progress straight off the document scroll. */
function rawProgress(): number {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  return max > 0 ? clamp01(window.scrollY / max) : 0;
}

/**
 * Frame-rate-independent scrub driver. Calls `apply` with 0–1 band progress
 * every gsap tick, smoothing raw scroll with a one-pole filter whose
 * coefficient is derived from real elapsed time.
 */
function driveBand(start: number, end: number, apply: (p: number) => void): () => void {
  const span = end - start;
  let smooth = rawProgress();
  let prevT = performance.now();
  let last = -1;

  const update = () => {
    const now = performance.now();
    const dt = Math.min(Math.max((now - prevT) / 1000, 1 / 240), 0.25);
    prevT = now;
    const raw = rawProgress();
    smooth += (raw - smooth) * (1 - Math.exp(-dt * 14));
    if (Math.abs(raw - smooth) < 0.0002) smooth = raw;

    const p = clamp01((smooth - start) / span);
    if (Math.abs(p - last) < 0.0004 && p !== 0 && p !== 1) return;
    if (p === last) return;
    last = p;
    apply(p);
  };

  gsap.ticker.add(update);
  update();
  return () => gsap.ticker.remove(update);
}

export function Dive() {
  const { reducedMotion } = useJourney();

  useEffect(() => {
    // ---- reduced motion: simple opacity crossfade, nothing else ----
    if (reducedMotion) {
      const stage = document.querySelector<HTMLElement>('.hero-stage');
      const voidEl = document.querySelector<HTMLElement>('.hero-void');
      return driveBand(PHASES.dive.start, DIVE_END, (p) => {
        const o = (1 - p).toFixed(4);
        if (stage) stage.style.opacity = o;
        if (voidEl) voidEl.style.opacity = o;
      });
    }

    // ---- full dive timeline (normalized 0→1, scrubbed by scroll) ----
    const letters = gsap.utils.toArray<HTMLElement>('.hero-letter');
    const tl = gsap.timeline({ paused: true, defaults: { overwrite: false } });

    // 1. The red rule collapses back into its own left origin — the door opens.
    tl.to('.hero-rule', { scaleX: 0, opacity: 0, duration: 0.16, ease: 'power2.in' }, 0);

    // 2. …and is reborn as the seam the veil will part along. Red is handed
    //    from typography to image; it never sits in both places at once.
    tl.fromTo(
      '.hero-seam',
      { opacity: 0, scaleY: 0.12 },
      { opacity: 0.65, scaleY: 1, duration: 0.2, ease: 'power2.out' },
      0.03,
    );
    tl.to('.hero-seam', { opacity: 0, duration: 0.26, ease: 'power1.in' }, 0.32);

    // 3. The image parts like a veil — front-loaded so the split is legible
    //    within the first fifth of the dive.
    tl.to('.hero-art-left', { xPercent: -88, duration: 0.82, ease: 'power1.out' }, 0);
    tl.to('.hero-art-right', { xPercent: 88, duration: 0.82, ease: 'power1.out' }, 0);
    //    …while the whole frame rushes past the camera. It is IN FOCUS the
    //    whole way — the halves rake the left and right edges as real
    //    painted surface, never as blur.
    tl.to('.hero-art-frame', { scale: 2.62, duration: 0.9, ease: 'power2.in' }, 0);
    //    The veil gains presence as it opens: you are falling through a
    //    painting, and a painting you cannot read is a smudge.
    tl.to('.hero-art-fade', { opacity: 0.68, duration: 0.34, ease: 'power1.out' }, 0);
    //    …and the veil is GONE before either half can become a strip standing
    //    on the frame edge. Started at 0.62 rather than 0.70 so the last third
    //    of the fall is a dissolve, not two rectangles sliding out of shot.
    tl.to('.hero-art-frame', { opacity: 0, duration: 0.36, ease: 'power1.in' }, 0.62);

    // 4. Letters: separate + swell + blur FIRST (power1.out — visible at once),
    //    then fly through the camera in Z (power2.in — the fall accelerates).
    tl.to(
      letters,
      {
        x: (i, el) => {
          const t = el as HTMLElement;
          const dx = parseFloat(t.dataset.dx ?? '0');
          const sf = parseFloat(t.dataset.sf ?? '1');
          return dx * sf * (34 + prand(i, 2) * 40);
        },
        y: (i) => (prand(i, 3) - 0.5) * 190,
        scale: (i) => 1.32 + prand(i, 6) * 0.42,
        rotationX: (i) => (prand(i, 4) - 0.5) * 44,
        rotationY: (i) => (prand(i, 5) - 0.5) * 32,
        // Defocus is the near plane's job — but a near plane that LINGERS
        // defocused is grey mush, and that is what made the middle of the dive
        // subjectless. 2.4–5.6px, and (below) the letters are gone by 60% of
        // the band, leaving exactly one crisp plane in the frame.
        filter: (i) => `blur(${(2.4 + prand(i, 7) * 3.2).toFixed(1)}px)`,
        duration: 0.62,
        ease: 'power1.out',
        stagger: { each: 0.008, from: 'random' },
      },
      0,
    );
    tl.to(
      letters,
      {
        z: (i) => 620 + prand(i, 1) * 1020,
        duration: 0.9,
        ease: 'power2.in',
        stagger: { each: 0.008, from: 'random' },
      },
      0,
    );
    tl.to(
      letters,
      { opacity: 0, duration: 0.32, ease: 'power1.in', stagger: { each: 0.008, from: 'random' } },
      0.2,
    );

    // 5. DOM void → transparent: the fixed Cosmos canvas is revealed behind.
    //    Linear so the crossfade tracks scroll exactly (Cosmos fades itself in
    //    over the same band; both blacks are #0e0c0a). Resolves at 0.80 so the
    //    last fifth of the band is pure 3D — the handoff is complete by 18%.
    tl.to('.hero-void', { opacity: 0, duration: 0.68, ease: 'none' }, 0.12);
    tl.to({}, { duration: 0.02 }, 0.98); // pad timeline to a full 1.0

    const stop = driveBand(DIVE_START, DIVE_END, (p) => tl.progress(p));

    return () => {
      stop();
      tl.kill();
    };
  }, [reducedMotion]);

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
