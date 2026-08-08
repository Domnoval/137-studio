'use client';

// OWNED BY HERO agent.
// ARRIVAL (0–8%) + the pinned canvas the DIVE animates through (8–18%).
// Contract kept: `export function Hero()` — no props, zIndex 2.
// The section spans scroll 0 → end-of-dive so its inner 100vh layer stays
// position:sticky (pinned) for the whole dive; Dive.tsx scrubs a GSAP
// timeline against .hero-letter / .hero-art-* / .hero-void / .hero-rule.
// The hero name is DOM text (LCP target) — server-renderable markup.
//
// COMPOSITION: the masthead is flush-LEFT and optically justified — the two
// lines are sized + tracked so "Michael" and "MacDonald" occupy the SAME
// measure, so the block reads as one designed unit instead of a centred wedge.
// The ghosted artwork is pushed right of centre; type left / art right is the
// composition, not a stack of centred things.
//
// SCROLL SOURCE: this file reads raw window scroll and smooths it with a
// FRAME-RATE-INDEPENDENT filter. JourneyContext's progressRef uses a fixed
// per-frame lerp (0.09), which lags by many hundreds of ms whenever the frame
// rate drops (the WebGL cosmos under software GL runs ~3fps) — the arrival and
// the dive must track scroll exactly, so they own their own smoothing.

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { useJourney } from './JourneyContext';
import { PHASES, JOURNEY_HEIGHT_VH, clamp01 } from './journey-utils';

/**
 * The 7 hero artworks (1200px tex versions — full-res only in the modal),
 * each with its measured mean luminance (0–255). The pieces span 38→110 mean,
 * so a single opacity/brightness pair renders half of them as an unreadable
 * smudge and the other half as haze. Every ghost is normalised to the same
 * perceived presence instead — the artwork must sit at the edge of legibility
 * whichever one the shuffle lands on.
 */
const HERO_ART: { src: string; lum: number }[] = [
  { src: '/art/tex/eye-triangle.jpg', lum: 48.3 },
  { src: '/art/tex/hero-cipher.jpg', lum: 39.4 },
  { src: '/art/tex/hero-red-pyramid.jpg', lum: 83.5 },
  { src: '/art/tex/hero-sun-cross.jpg', lum: 109.5 },
  { src: '/art/tex/hero-math-pyramid.jpg', lum: 65.4 },
  { src: '/art/tex/hero-equations.jpg', lum: 45.6 },
  { src: '/art/tex/hero-red-eye.jpg', lum: 38.6 },
];

/** Mean luminance every ghosted hero settles at after the brightness gain. */
const ART_TARGET_LUM = 62;

/**
 * Optically justified masthead. Cormorant Garamond 300 natural advance widths
 * (measured): "Michael" = 3.2764em, "MacDonald" = 4.7207em. Solving both lines
 * to the same measure W ≈ 53.6vw gives the size/tracking pairs below — that is
 * why the first name is set larger than the surname. Both stay inside the
 * 12–15vw contract; both edges align, so the block is a rectangle.
 */
const NAME_LINES: { text: string; size: string; tracking: string; lh: number; sf: number }[] = [
  { text: 'Michael', size: 'calc(15 * var(--hero-u))', tracking: '0.0496em', lh: 0.84, sf: 1 },
  { text: 'MacDonald', size: 'calc(12 * var(--hero-u))', tracking: '-0.0316em', lh: 0.98, sf: 0.8 },
];

/** Measure of the justified masthead, in vw. Rule geometry derives from it. */
const BLOCK_W_VW = 53.6;
/** Rule length = block / φ² (0.382). Its tick sits at 13.7% — the constant. */
const RULE_W_VW = BLOCK_W_VW * 0.382; // 20.5vw
const RULE_TICK_VW = RULE_W_VW * 0.137; // 2.81vw

const GUTTER = 'clamp(28px, 6vw, 132px)';

/**
 * Height (vh) the section must span so the sticky inner layer stays pinned
 * until journey progress = PHASES.dive.end (+ a buffer for the tail of the
 * crossfade — un-pinning exactly at dive.end would expose a seam while the
 * void is still fading). Progress is measured against scrollHeight -
 * innerHeight, hence (JOURNEY_HEIGHT_VH - 100).
 */
const PIN_BUFFER = 0.05;
const PIN_END_VH = (PHASES.dive.end + PIN_BUFFER) * (JOURNEY_HEIGHT_VH - 100) + 100; // 238vh

const VOID = '#0e0c0a';
const CHALK = '#e8e4dc';
const FADED = '#a09890';
const RED = '#c41230';
const MONO = "'JetBrains Mono', monospace";

/** Arrival band this file owns. The dive takes over a hair before 8%. */
const ARRIVAL_END = 0.075;

/** Dissolves the artwork's rectangle into the void — it has to read as a ghost
 *  in the dark, never as a framed picture with four hard edges. Sized so the
 *  alpha reaches zero at (or just inside) the contained image's own bounds. */
const ART_MASK =
  'radial-gradient(ellipse 62% 55% at 50% 50%, black 24%, transparent 76%)';

/** Fades the parting seam's ends so it reads as a tear, not a drawn line. */
const SEAM_MASK = 'linear-gradient(to bottom, transparent, black 22%, black 78%, transparent)';

/**
 * Feathers the torn edge of each veil half — a tear, not a guillotine cut.
 * The two halves OVERLAP across 44–56% and their alpha ramps are cubic
 * complements (1-t³ / 1-(1-t)³), so source-over compositing of the identical
 * pixels sums back to ≥0.984 everywhere: seamless while closed, soft-edged
 * while parting. A plain linear pair would trough to 0.75 and print a dark
 * stripe down the middle of the artwork at rest.
 */
const TEAR_CLIP_L = 'inset(0 44% 0 0)';
const TEAR_CLIP_R = 'inset(0 0 0 44%)';
const TEAR_L =
  'linear-gradient(to right, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 44%, rgba(0,0,0,0.984) 47%, rgba(0,0,0,0.875) 50%, rgba(0,0,0,0.578) 53%, rgba(0,0,0,0) 56%)';
const TEAR_R =
  'linear-gradient(to right, rgba(0,0,0,0) 44%, rgba(0,0,0,0.578) 47%, rgba(0,0,0,0.875) 50%, rgba(0,0,0,0.984) 53%, rgba(0,0,0,1) 56%, rgba(0,0,0,1) 100%)';

/**
 * --hero-u is the masthead's unit: every type size, tracking-derived measure
 * and the rule geometry is a multiple of it, so the optical justification
 * survives every breakpoint — only the unit changes. The artwork frame is
 * aspect-ratio driven (0.6 ≈ the paintings' own portrait ratio) so ART_MASK's
 * percentage stops land on the image's real edges rather than on letterboxing.
 */
const HERO_CSS = `
@keyframes hero-tick {
  0%   { transform: translateY(0); opacity: 1; }
  72%  { transform: translateY(60px); opacity: 1; }
  100% { transform: translateY(60px); opacity: 0; }
}
.hero-title { --hero-u: 1vw; }
.hero-art-frame { height: min(88vh, 103vw); aspect-ratio: 0.6; }
.hero-art-pos { left: 67%; }
@media (max-width: 1023px) { .hero-title { --hero-u: 1.28vw; } }
@media (max-width: 767px) {
  .hero-title { --hero-u: 1.62vw; }
  .hero-art-pos { left: 50%; }
}`;

/** Raw (unsmoothed) journey progress straight off the document scroll. */
function rawProgress(): number {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  return max > 0 ? clamp01(window.scrollY / max) : 0;
}

export function Hero() {
  const { reducedMotion } = useJourney();
  const [art, setArt] = useState<(typeof HERO_ART)[number] | null>(null);
  const [loaded, setLoaded] = useState(false);

  const sectionRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const orbitRef = useRef<HTMLDivElement>(null);
  const fadeRef = useRef<HTMLDivElement>(null);
  const ruleLineRef = useRef<HTMLDivElement>(null);
  const ruleGlowRef = useRef<HTMLDivElement>(null);
  const cueRef = useRef<HTMLDivElement>(null);

  /** Per-piece brightness gain that lands every ghost at the same presence. */
  const artGain = art ? Math.min(1.7, Math.max(0.6, ART_TARGET_LUM / art.lum)) : 1;

  // Pick the hero artwork client-side, post-hydration (avoids SSR mismatch).
  useEffect(() => {
    // Random pick must happen post-hydration; setState here is intended
    // (same pattern as JourneyContext's environment detection).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setArt(HERO_ART[Math.floor(Math.random() * HERO_ART.length)]);
  }, []);

  // Per-frame arrival choreography — zero re-renders, dt-based smoothing so it
  // tracks scroll identically at 3fps and at 120fps.
  useEffect(() => {
    let raf = 0;
    let hidden = false;
    let smooth = rawProgress();
    let vel = 0;
    let prevRaw = smooth;
    let prevT = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(Math.max((now - prevT) / 1000, 1 / 240), 0.25);
      prevT = now;

      const raw = rawProgress();
      // Frame-rate-independent one-pole filter (~14 rad/s).
      smooth += (raw - smooth) * (1 - Math.exp(-dt * 14));
      if (Math.abs(raw - smooth) < 0.0002) smooth = raw;

      // Velocity in progress-units/sec, likewise dt-normalised.
      const inst = (raw - prevRaw) / dt;
      prevRaw = raw;
      vel += (inst - vel) * (1 - Math.exp(-dt * 9));
      if (Math.abs(vel) < 0.0008) vel = 0;
      const v = Math.abs(vel);

      // Perf: hide entirely once the dive is over and we've scrolled past.
      const shouldHide = smooth > PHASES.dive.end + PIN_BUFFER + 0.01;
      if (shouldHide !== hidden && sectionRef.current) {
        sectionRef.current.style.visibility = shouldHide ? 'hidden' : 'visible';
        hidden = shouldHide;
      }

      // Scroll cue fades on first scroll (returns if user scrolls back to top).
      if (cueRef.current) cueRef.current.style.opacity = smooth < 0.004 ? '1' : '0';

      if (smooth < ARRIVAL_END + 0.001 && !reducedMotion) {
        const a = clamp01(smooth / ARRIVAL_END); // 0→1 across the arrival

        // Artwork rises INTO legibility as you approach the dive — it is the
        // thing you are about to fall into, so it gains presence, not less.
        if (fadeRef.current) {
          fadeRef.current.style.opacity = loaded ? (0.38 + a * 0.15).toFixed(3) : '0';
        }
        if (orbitRef.current) {
          orbitRef.current.style.transform = `translate3d(${(a * -1.6).toFixed(3)}vw, 0, 0) scale(${(1 + a * 0.055).toFixed(4)})`;
        }

        // Red rule: length answers BOTH scroll position (it extends as you
        // descend) and scroll velocity (it snaps longer + hotter when you
        // move). Origin is the left terminus — it grows out of the masthead.
        const grow = 1 + a * 0.31 + Math.min(v * 1.5, 0.42);
        if (ruleLineRef.current) {
          ruleLineRef.current.style.transform = `scaleX(${grow.toFixed(4)})`;
        }
        if (ruleGlowRef.current) {
          ruleGlowRef.current.style.transform = `scaleX(${grow.toFixed(4)})`;
          ruleGlowRef.current.style.opacity = (0.16 + a * 0.1 + Math.min(v * 2.6, 0.62)).toFixed(3);
        }

        // Whisper of parallax on the name during arrival.
        if (titleRef.current) {
          titleRef.current.style.transform = `translate3d(0, ${(a * -2.2).toFixed(3)}vh, 0)`;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reducedMotion, loaded]);

  // Letter-level spans — the Dive animates them in Z (class contract:
  // .hero-letter). data-dx = signed offset from the line's own centre;
  // data-sf scales the spread so the smaller line parts proportionally.
  const nameLines = NAME_LINES.map((line) => {
    const lineCenter = (line.text.length - 1) / 2;
    return (
      <span
        key={line.text}
        aria-hidden
        style={{
          display: 'block',
          whiteSpace: 'nowrap',
          transformStyle: 'preserve-3d',
          fontSize: line.size,
          letterSpacing: line.tracking,
          lineHeight: line.lh,
        }}
      >
        {line.text.split('').map((ch, j) => (
          <span
            key={`${line.text}-${j}`}
            className="hero-letter"
            data-dx={(j - lineCenter).toFixed(2)}
            data-sf={line.sf}
            style={{
              display: 'inline-block',
              transformStyle: 'preserve-3d',
              willChange: 'transform, opacity, filter',
              filter: 'blur(0px)',
            }}
          >
            {ch}
          </span>
        ))}
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
      <style>{HERO_CSS}</style>
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
          {/* Ghosted hero artwork — right of centre, and parts like a veil
              during the dive. Lifted to the edge of legibility: the forms have
              to seduce, a dark smudge cannot. */}
          <div
            className="hero-art-pos"
            aria-hidden
            style={{ position: 'absolute', top: '50%', transform: 'translate(-50%, -50%)' }}
          >
            <div className="hero-art-orbit" style={{ willChange: 'transform' }}>
              <div
                className="hero-art-frame"
                style={{ position: 'relative', willChange: 'transform, opacity' }}
              >
                <div
                  className="hero-art-fade"
                  ref={fadeRef}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    opacity: loaded ? 0.38 : 0,
                    filter: `brightness(${artGain.toFixed(3)}) contrast(1.12) saturate(0.62)`,
                    transition: 'opacity 1.4s ease',
                  }}
                >
                  {/* Both halves are ALWAYS in the DOM (only the <Image> inside
                      is conditional) — Dive.tsx resolves its GSAP targets once,
                      on mount, and a late-mounting node would never be animated:
                      that is what kept the veil from parting. */}
                  <div
                    className="hero-art-left"
                    style={{
                      position: 'absolute',
                      inset: 0,
                      clipPath: TEAR_CLIP_L,
                      // Mask rides WITH each half — a veil that keeps its soft
                      // edges as it parts, rather than sliding out from under a
                      // stationary vignette and turning into a hard rectangle.
                      maskImage: ART_MASK,
                      WebkitMaskImage: ART_MASK,
                      willChange: 'transform',
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        maskImage: TEAR_L,
                        WebkitMaskImage: TEAR_L,
                      }}
                    >
                      {art && (
                        <Image
                          src={art.src}
                          alt=""
                          fill
                          sizes="(max-width: 767px) 62vw, 34vw"
                          priority
                          style={{ objectFit: 'contain' }}
                          onLoad={() => setLoaded(true)}
                        />
                      )}
                    </div>
                  </div>
                  <div
                    className="hero-art-right"
                    style={{
                      position: 'absolute',
                      inset: 0,
                      clipPath: TEAR_CLIP_R,
                      maskImage: ART_MASK,
                      WebkitMaskImage: ART_MASK,
                      willChange: 'transform',
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        maskImage: TEAR_R,
                        WebkitMaskImage: TEAR_R,
                      }}
                    >
                      {art && (
                        <Image src={art.src} alt="" fill sizes="(max-width: 767px) 62vw, 34vw" style={{ objectFit: 'contain' }} />
                      )}
                    </div>
                  </div>
                </div>

                {/* The seam the veil parts along. Born as the red rule dies —
                    the only other red in the frame, and only during the dive. */}
                <div
                  className="hero-seam"
                  style={{
                    position: 'absolute',
                    left: '50%',
                    top: '22%',
                    width: 1,
                    height: '56%',
                    marginLeft: -0.5,
                    background: RED,
                    maskImage: SEAM_MASK,
                    WebkitMaskImage: SEAM_MASK,
                    opacity: 0,
                    transformOrigin: '50% 50%',
                    willChange: 'transform, opacity',
                  }}
                />
              </div>
            </div>
          </div>

          {/* The masthead — MASSIVE, chalk on void, flush-left, optically justified. */}
          <div
            ref={titleRef}
            className="hero-title"
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              justifyContent: 'center',
              paddingLeft: GUTTER,
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
                color: CHALK,
                textAlign: 'left',
                perspective: '1100px',
              }}
            >
              {nameLines}
            </h1>

            {/* Red rule — flush with the masthead's left edge, length = block/φ²,
                measurement tick at 13.7%. Extends with descent AND with scroll
                velocity (rAF above). Origin left: it grows out of the name. */}
            <div
              className="hero-rule"
              aria-hidden
              style={{
                position: 'relative',
                width: `calc(${RULE_W_VW.toFixed(3)} * var(--hero-u))`,
                height: 1,
                transformOrigin: 'left center',
                willChange: 'transform, opacity',
              }}
            >
              <div
                ref={ruleGlowRef}
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: RED,
                  boxShadow: '0 0 16px 2px rgba(196, 18, 48, 0.5)',
                  opacity: 0.16,
                  transformOrigin: 'left center',
                  transform: 'scaleX(1)',
                }}
              />
              <div
                ref={ruleLineRef}
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: RED,
                  transformOrigin: 'left center',
                  transform: 'scaleX(1)',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  left: `calc(${RULE_TICK_VW.toFixed(3)} * var(--hero-u))`,
                  top: -4,
                  width: 1,
                  height: 9,
                  background: RED,
                  opacity: 0.8,
                }}
              />
            </div>
          </div>

          {/* Scroll cue — flush-left with the masthead. Fades on first scroll. */}
          <div
            ref={cueRef}
            className="hero-cue"
            aria-hidden
            style={{
              position: 'absolute',
              left: GUTTER,
              bottom: 55,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
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
