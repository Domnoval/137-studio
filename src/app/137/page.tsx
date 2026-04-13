'use client';

/**
 * /137 — the temple sandbox.
 *
 * This is the experiment. Not promoted to / yet. A wall of equations
 * placed at golden-angle nodes around a glowing center. The seed for
 * the layout defaults to today's UTC date so all visitors share the
 * same wall on the same day (the "Constant" oracle behavior). On the
 * client we shuffle in a per-visitor twist using viewport size +
 * navigator language so the daily wall still has a personal accent.
 *
 * Built with deliberate restraint: no nav, no footer, no copy you
 * can read at a glance. The site is the work. You earn it by lingering.
 */

import { useEffect, useMemo, useState } from 'react';
import {
  EQUATIONS,
  WEIGHT_OPACITY,
  SIZE_VMIN,
} from '@/lib/temple/equations';
import { spiralLayout, todaySeed } from '@/lib/temple/seed';

// Paintings live AT golden-angle nodes too — they're the loud ones,
// placed at specific spiral indices so they spread instead of clumping.
// Indices chosen so every painting has at least 4 spiral steps between
// it and the next one (golden-angle ≈ 137.5° → the spread is natural).
const PAINTINGS: { src: string; alt: string; spiralIndex: number }[] = [
  { src: '/art/eye-triangle.png', alt: 'Eye Triangle', spiralIndex: 5 },
  { src: '/art/hero-red-pyramid.png', alt: 'Red Pyramid', spiralIndex: 9 },
  { src: '/art/totem.jpg', alt: 'Totem', spiralIndex: 14 },
  { src: '/art/composite-head.jpg', alt: 'Composite Head', spiralIndex: 19 },
  { src: '/art/cruciform.jpg', alt: 'Cruciform', spiralIndex: 25 },
  { src: '/art/menagerie.jpg', alt: 'Menagerie', spiralIndex: 32 },
  { src: '/art/teal-skull.jpg', alt: 'Teal Skull', spiralIndex: 40 },
  { src: '/art/chaos-garden.jpg', alt: 'Chaos Garden', spiralIndex: 49 },
];

const NODE_COUNT = 80;
const SCALE_VMIN = 5.2; // tunes how wide the spiral spreads

export default function TemplePage() {
  // Server-render uses the daily seed so SSR + first paint match.
  // After hydration we mix in a small per-visitor twist so the wall
  // shifts subtly on each device. No FOUC because we keep the seed
  // string-stable across renders unless the visitor seed changes.
  const [seed, setSeed] = useState<string>(() => todaySeed());
  // The door is up by default. Click to enter. No other navigation.
  const [doorOpen, setDoorOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const personal = [
      todaySeed(),
      window.innerWidth,
      window.innerHeight,
      navigator.language,
    ].join('|');
    // Hydration-safe per-visitor twist: server renders with todaySeed()
    // so SSR and first paint match, then on the client we mix in viewport
    // and language. Lazy `useState` init would cause a hydration mismatch.
    setSeed(personal);
  }, []);

  const nodes = useMemo(
    () => spiralLayout(NODE_COUNT, seed, SCALE_VMIN, 14),
    [seed],
  );

  // Pair each spiral node with either a painting or an equation.
  // Painting indices are reserved; everything else gets an equation
  // cycled from the curated list. Anchors come first in EQUATIONS so
  // the loudest equations land on the inner spiral nodes.
  let eqCursor = 0;
  const placed = nodes.map((node) => {
    const painting = PAINTINGS.find((p) => p.spiralIndex === node.i);
    if (painting) {
      return { node, kind: 'painting' as const, painting };
    }
    const eq = EQUATIONS[eqCursor % EQUATIONS.length];
    eqCursor++;
    return { node, kind: 'equation' as const, eq };
  });

  return (
    <main
      style={{
        position: 'relative',
        minHeight: '100vh',
        // Pull the page out from under the global Nav/Footer so the
        // wall is full-bleed. Negative margin against the layout chrome
        // keeps this experiment self-contained without touching layout.tsx.
        marginTop: '-72px',
        marginBottom: '-200px',
        paddingTop: '72px',
        paddingBottom: '200px',
        overflow: 'hidden',
        background:
          'radial-gradient(ellipse at center, #11100d 0%, #0a0908 60%, #050403 100%)',
        color: '#e8e4dc',
        fontFamily: "'JetBrains Mono', ui-monospace, monospace",
      }}
    >
      {/* Faint vignette and grain */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.6) 100%)',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />

      {/* The wall */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2,
        }}
      >
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: '100%',
          }}
        >
          {placed.map((item) => {
            const { node } = item;
            if (item.kind === 'painting') {
              const { painting } = item;
              return (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  key={`p-${node.i}`}
                  src={painting.src}
                  alt={painting.alt}
                  loading="lazy"
                  style={{
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    transform: `translate(${node.x}vmin, ${node.y}vmin) translate(-50%, -50%) rotate(${node.rotateDeg * 0.3}deg)`,
                    width: 'clamp(80px, 11vmin, 180px)',
                    height: 'auto',
                    boxShadow:
                      '0 0 0 1px rgba(232, 228, 220, 0.06), 0 8px 32px rgba(0,0,0,0.6), 0 0 60px rgba(196, 18, 48, 0.08)',
                    pointerEvents: 'none',
                    userSelect: 'none',
                    willChange: 'transform',
                  }}
                />
              );
            }
            const { eq } = item;
            const opacity = WEIGHT_OPACITY[eq.weight];
            const fontSize = SIZE_VMIN[eq.size] + 'vmin';
            return (
              <span
                key={`e-${node.i}`}
                title={eq.caption ?? eq.text}
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: '50%',
                  transform: `translate(${node.x}vmin, ${node.y}vmin) translate(-50%, -50%) rotate(${node.rotateDeg}deg)`,
                  fontSize,
                  opacity,
                  whiteSpace: 'nowrap',
                  color: eq.weight === 'glow' ? '#e8e4dc' : '#c8c4bc',
                  textShadow:
                    eq.weight === 'glow'
                      ? '0 0 18px rgba(196, 18, 48, 0.35), 0 0 40px rgba(232, 228, 220, 0.12)'
                      : 'none',
                  letterSpacing: '0.02em',
                  pointerEvents: 'none',
                  userSelect: 'none',
                  willChange: 'transform',
                }}
              >
                {eq.text}
              </span>
            );
          })}
        </div>
      </div>

      {/* The center: 137, glowing, the only thing the page actually says. */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 3,
          textAlign: 'center',
          pointerEvents: 'none',
        }}
      >
        <p
          style={{
            margin: 0,
            fontFamily: "'Cinzel', Georgia, serif",
            fontSize: 'clamp(5rem, 14vmin, 12rem)',
            fontWeight: 500,
            letterSpacing: '0.04em',
            color: '#f4eedc',
            textShadow:
              '0 0 30px rgba(232, 197, 71, 0.4), 0 0 80px rgba(196, 18, 48, 0.25), 0 0 140px rgba(232, 197, 71, 0.15)',
          }}
        >
          137
        </p>
        <p
          style={{
            margin: '8px 0 0',
            fontSize: '0.65rem',
            letterSpacing: '0.4em',
            textTransform: 'uppercase',
            color: '#a09890',
            opacity: 0.7,
          }}
        >
          α = 1 / 137.036
        </p>
      </div>

      {/* Quiet caption at the bottom — the only navigation. */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: '8vmin',
          textAlign: 'center',
          zIndex: 3,
          pointerEvents: 'none',
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: '0.6rem',
            letterSpacing: '0.3em',
            textTransform: 'uppercase',
            color: '#a09890',
            opacity: 0.5,
            fontFamily:
              "'JetBrains Mono', ui-monospace, monospace",
          }}
        >
          experiment · the wall changes daily
        </p>
      </div>

      {/* The door. Up by default; click to enter. The act of clicking is
          the entry rite. The door zooms past you and the wall is revealed. */}
      <button
        type="button"
        onClick={() => setDoorOpen(true)}
        aria-label="Enter"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 50,
          background:
            'radial-gradient(ellipse at center, #0a0908 0%, #050403 70%, #000 100%)',
          border: 'none',
          color: '#f4eedc',
          cursor: doorOpen ? 'default' : 'pointer',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 0,
          transformOrigin: 'center',
          transform: doorOpen ? 'scale(8)' : 'scale(1)',
          opacity: doorOpen ? 0 : 1,
          transition:
            'transform 1.6s cubic-bezier(0.55, 0, 0.55, 1), opacity 1.6s ease-out',
          pointerEvents: doorOpen ? 'none' : 'auto',
        }}
      >
        <span
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(ellipse at center, transparent 0%, transparent 35%, rgba(0,0,0,0.6) 100%)',
            pointerEvents: 'none',
          }}
        />
        <span
          style={{
            position: 'relative',
            fontFamily: "'Cinzel', Georgia, serif",
            fontSize: 'clamp(6rem, 22vmin, 16rem)',
            fontWeight: 500,
            letterSpacing: '0.06em',
            color: '#f4eedc',
            textShadow:
              '0 0 40px rgba(232, 197, 71, 0.5), 0 0 100px rgba(196, 18, 48, 0.3), 0 0 200px rgba(232, 197, 71, 0.18)',
            lineHeight: 1,
          }}
        >
          137
        </span>
        <span
          style={{
            position: 'relative',
            marginTop: '2.5vmin',
            fontFamily: "'JetBrains Mono', ui-monospace, monospace",
            fontSize: '0.65rem',
            letterSpacing: '0.5em',
            textTransform: 'uppercase',
            color: '#a09890',
            opacity: 0.6,
          }}
        >
          enter
        </span>
      </button>
    </main>
  );
}
