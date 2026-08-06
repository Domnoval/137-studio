'use client';

// OWNED BY HERO agent.
// ARRIVAL (0–8%) + the pinned canvas the DIVE animates through (8–18%).
// Contract kept: `export function Hero()` — no props, zIndex 2.
// The section spans scroll 0 → end-of-dive so its inner 100vh layer stays
// position:sticky (pinned) for the whole dive; Dive.tsx scrubs a GSAP
// timeline against .hero-letter / .hero-art-* / .hero-void / .hero-rule.
// The hero name is DOM text (LCP target) — server-renderable markup.

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { useJourney } from './JourneyContext';
import { PHASES, JOURNEY_HEIGHT_VH } from './journey-utils';

/** The 7 hero artworks (1200px tex versions — full-res only in the modal). */
const HERO_ART = [
  '/art/tex/eye-triangle.jpg',
  '/art/tex/hero-cipher.jpg',
  '/art/tex/hero-red-pyramid.jpg',
  '/art/tex/hero-sun-cross.jpg',
  '/art/tex/hero-math-pyramid.jpg',
  '/art/tex/hero-equations.jpg',
  '/art/tex/hero-red-eye.jpg',
];

const NAME_LINES = ['Michael', 'MacDonald'];

/**
 * Height (vh) the section must span so the sticky inner layer stays pinned
 * until journey progress = PHASES.dive.end (+ a buffer, because the smoothed
 * progress the dive scrubs against lags raw scroll — un-pinning exactly at
 * dive.end would expose a seam while the void is still fading). Progress is
 * measured against scrollHeight - innerHeight, hence (JOURNEY_HEIGHT_VH - 100).
 */
const PIN_BUFFER = 0.05;
const PIN_END_VH = (PHASES.dive.end + PIN_BUFFER) * (JOURNEY_HEIGHT_VH - 100) + 100; // 238vh

const VOID = '#0e0c0a';
const CHALK = '#e8e4dc';
const FADED = '#a09890';
const RED = '#c41230';
const MONO = "'JetBrains Mono', monospace";

const ART_MASK =
  'radial-gradient(ellipse 60% 56% at 50% 50%, black 40%, transparent 76%)';

const TICK_KEYFRAMES = `
@keyframes hero-tick {
  0%   { transform: translateY(0); opacity: 1; }
  72%  { transform: translateY(60px); opacity: 1; }
  100% { transform: translateY(60px); opacity: 0; }
}`;

export function Hero() {
  const { reducedMotion, progressRef, velocityRef } = useJourney();
  const [src, setSrc] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const sectionRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const ruleLineRef = useRef<HTMLDivElement>(null);
  const ruleGlowRef = useRef<HTMLDivElement>(null);
  const cueRef = useRef<HTMLDivElement>(null);

  // Pick the hero artwork client-side, post-hydration (avoids SSR mismatch).
  useEffect(() => {
    // Random pick must happen post-hydration; setState here is intended
    // (same pattern as JourneyContext's environment detection).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSrc(HERO_ART[Math.floor(Math.random() * HERO_ART.length)]);
  }, []);

  // Per-frame reads of progress/velocity — zero re-renders.
  useEffect(() => {
    let raf = 0;
    let hidden = false;
    const tick = () => {
      const p = progressRef.current ?? 0;
      const v = Math.abs(velocityRef.current ?? 0);

      // Perf: hide entirely once the dive is over and we've scrolled past.
      const shouldHide = p > PHASES.dive.end + PIN_BUFFER + 0.01;
      if (shouldHide !== hidden && sectionRef.current) {
        sectionRef.current.style.visibility = shouldHide ? 'hidden' : 'visible';
        hidden = shouldHide;
      }

      // Scroll cue fades on first scroll (returns if user scrolls back to top).
      if (cueRef.current) cueRef.current.style.opacity = p < 0.004 ? '1' : '0';

      if (p < PHASES.dive.start + 0.001 && !reducedMotion) {
        // Red rule breathes with scroll VELOCITY: scale-x + glow.
        if (ruleLineRef.current) {
          ruleLineRef.current.style.transform = `scaleX(${(1 + Math.min(v * 1.8, 0.55)).toFixed(4)})`;
        }
        if (ruleGlowRef.current) {
          ruleGlowRef.current.style.opacity = (0.25 + Math.min(v * 3, 0.75)).toFixed(3);
        }
        // Whisper of parallax on the name during arrival (constant once dive owns it).
        if (titleRef.current) {
          const pa = Math.min(p / PHASES.dive.start, 1);
          titleRef.current.style.transform = `translateY(${(pa * -1.8).toFixed(3)}vh)`;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [progressRef, velocityRef, reducedMotion]);

  // Letter-level spans — the Dive animates them in Z (class contract: .hero-letter).
  const nameLines = NAME_LINES.map((line) => {
    const lineCenter = (line.length - 1) / 2;
    return (
      <span
        key={line}
        aria-hidden
        style={{ display: 'block', whiteSpace: 'nowrap', transformStyle: 'preserve-3d' }}
      >
        {line.split('').map((ch, j) => {
          return (
            <span
              key={`${line}-${j}`}
              className="hero-letter"
              data-dx={(j - lineCenter).toFixed(2)}
              style={{
                display: 'inline-block',
                transformStyle: 'preserve-3d',
                willChange: 'transform, opacity, filter',
                filter: 'blur(0px)',
              }}
            >
              {ch}
            </span>
          );
        })}
      </span>
    );
  });

  return (
    <section
      ref={sectionRef}
      data-phase="arrival"
      aria-label="Michael MacDonald — arrival"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: reducedMotion ? '100vh' : `${PIN_END_VH}vh`,
        zIndex: 2,
        pointerEvents: 'none',
      }}
    >
      <style>{TICK_KEYFRAMES}</style>
      <div
        className="hero-pin"
        style={{
          position: reducedMotion ? 'relative' : 'sticky',
          top: 0,
          height: '100vh',
          overflow: 'hidden',
        }}
      >
        {/* Void base — the DOM side of the DOM→3D crossfade (Dive fades it to 0). */}
        <div
          className="hero-void"
          aria-hidden
          style={{ position: 'absolute', inset: 0, background: VOID }}
        />

        <div className="hero-stage" style={{ position: 'absolute', inset: 0 }}>
          {/* Ghosted hero artwork — parts like a veil during the dive. */}
          <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
            <div
              className="hero-art-frame"
              aria-hidden
              style={{
                position: 'relative',
                width: 'min(66vw, 920px)',
                height: '76vh',
                maskImage: ART_MASK,
                WebkitMaskImage: ART_MASK,
                willChange: 'transform, opacity',
              }}
            >
              <div
                className="hero-art-fade"
                style={{
                  position: 'absolute',
                  inset: 0,
                  opacity: loaded ? 0.25 : 0,
                  filter: 'saturate(0.6)',
                  transition: 'opacity 1.4s ease',
                }}
              >
                {src && (
                  <>
                    <div
                      className="hero-art-left"
                      style={{
                        position: 'absolute',
                        inset: 0,
                        clipPath: 'inset(0 50% 0 0)',
                        willChange: 'transform',
                      }}
                    >
                      <Image
                        src={src}
                        alt=""
                        fill
                        sizes="66vw"
                        style={{ objectFit: 'contain' }}
                        onLoad={() => setLoaded(true)}
                      />
                    </div>
                    <div
                      className="hero-art-right"
                      style={{
                        position: 'absolute',
                        inset: 0,
                        clipPath: 'inset(0 0 0 50%)',
                        willChange: 'transform',
                      }}
                    >
                      <Image src={src} alt="" fill sizes="66vw" style={{ objectFit: 'contain' }} />
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* The name — MASSIVE, chalk on void. */}
          <div
            ref={titleRef}
            className="hero-title"
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 34,
              willChange: 'transform',
            }}
          >
            <h1
              aria-label="Michael MacDonald"
              style={{
                margin: 0,
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontWeight: 300,
                fontSize: '14vw',
                lineHeight: 0.88,
                letterSpacing: '-0.015em',
                color: CHALK,
                textAlign: 'center',
                perspective: '1100px',
              }}
            >
              {nameLines}
            </h1>

            {/* Red 1px rule — breathes with scroll velocity (rAF above). */}
            <div
              className="hero-rule"
              aria-hidden
              style={{ position: 'relative', width: '21vw', height: 1, willChange: 'transform, opacity' }}
            >
              <div
                ref={ruleGlowRef}
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: RED,
                  boxShadow: '0 0 18px 2px rgba(196, 18, 48, 0.55)',
                  opacity: 0.25,
                  transition: 'opacity 0.25s linear',
                }}
              />
              <div
                ref={ruleLineRef}
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: RED,
                  transform: 'scaleX(1)',
                  transition: 'transform 0.2s ease-out',
                }}
              />
            </div>
          </div>

          {/* Scroll cue — fades on first scroll. */}
          <div
            ref={cueRef}
            className="hero-cue"
            aria-hidden
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 34,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 13,
              opacity: 1,
              transition: 'opacity 0.618s ease',
            }}
          >
            <span
              style={{
                fontFamily: MONO,
                fontSize: '0.65rem',
                fontWeight: 300,
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                color: FADED,
              }}
            >
              Scroll to Descend
            </span>
            <div
              style={{
                position: 'relative',
                width: 1,
                height: 34,
                background: 'rgba(232, 228, 220, 0.12)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  top: -13,
                  width: 1,
                  height: 13,
                  background: FADED,
                  animation: reducedMotion
                    ? 'none'
                    : 'hero-tick 2.2s cubic-bezier(0.45, 0, 0.55, 1) infinite',
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
