'use client';

// OWNED BY ATMOSPHERE agent.
// Void screen. A thin red line draws the 137 sigil (triangle + eye) while a
// JetBrains Mono equation flicker-counts toward the fine-structure constant.
// Max ~2.2s, then dissolves into the hero. Never blocks the page: the overlay
// is pointer-events none and dissolves on a hard timer regardless of assets.
// Contract kept: `export function Loader()` — fixed overlay, zIndex 90.

import { useEffect, useState } from 'react';
import { detectReducedMotion } from './journey-utils';

const ALPHA = '137.035999084';
const PREFIX = 'α⁻¹ = '; // α⁻¹ =
const FLICKER_MS = 1500;
const DISSOLVE_AT = 1650;
const GONE_AT = 2200;
const RM_DISSOLVE_AT = 420;
const RM_GONE_AT = 680;

function scrambled(lockedCount: number): string {
  let out = '';
  for (let i = 0; i < ALPHA.length; i++) {
    const ch = ALPHA[i];
    if (ch === '.' || i < lockedCount) out += ch;
    else out += String((Math.random() * 10) | 0);
  }
  return out;
}

export function Loader() {
  const [reduced, setReduced] = useState(false);
  const [digits, setDigits] = useState(ALPHA);
  const [locked, setLocked] = useState(false);
  const [dissolve, setDissolve] = useState(false);
  const [gone, setGone] = useState(false);

  // Equation flicker — converges digit by digit on 137.035999084.
  useEffect(() => {
    const rm = detectReducedMotion();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- client-only capability detection
    setReduced(rm);
    if (rm) {
      setLocked(true);
      const t1 = setTimeout(() => setDissolve(true), RM_DISSOLVE_AT);
      const t2 = setTimeout(() => setGone(true), RM_GONE_AT);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / FLICKER_MS, 1);
      const lockedCount = Math.floor(t * ALPHA.length);
      if (t >= 1) {
        setDigits(ALPHA);
        setLocked(true);
        return;
      }
      setDigits(scrambled(lockedCount));
      raf = requestAnimationFrame(tick);
    };
    setDigits(scrambled(0));
    raf = requestAnimationFrame(tick);
    const t1 = setTimeout(() => setDissolve(true), DISSOLVE_AT);
    const t2 = setTimeout(() => setGone(true), GONE_AT);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  if (gone) return null;

  return (
    <div
      aria-hidden
      className={[
        'jl-root',
        dissolve ? 'jl-dissolve' : '',
        reduced ? 'jl-instant' : '',
      ].join(' ')}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 90,
        background: '#0e0c0a',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 34,
        pointerEvents: 'none',
      }}
    >
      <svg
        className={reduced ? 'jl-sigil jl-static' : 'jl-sigil'}
        width="150"
        height="143"
        viewBox="0 0 200 190"
        fill="none"
        style={{ display: 'block', overflow: 'visible' }}
      >
        {/* triangle */}
        <path
          className="jl-triangle"
          d="M100 12 L188 172 L12 172 Z"
          pathLength={1}
          stroke="#c41230"
          strokeWidth={1.25}
          strokeLinejoin="miter"
        />
        {/* eye lens */}
        <path
          className="jl-eye"
          d="M58 124 Q100 94 142 124 Q100 154 58 124 Z"
          pathLength={1}
          stroke="#c41230"
          strokeWidth={1.1}
        />
        {/* pupil */}
        <circle
          className="jl-pupil"
          cx="100"
          cy="124"
          r="12.5"
          pathLength={1}
          stroke="#c41230"
          strokeWidth={1.1}
        />
      </svg>

      <div
        className={locked ? 'jl-eq jl-eq-locked' : 'jl-eq'}
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontWeight: 300,
          fontSize: '0.72rem',
          letterSpacing: '0.15em',
          color: '#a09890',
          whiteSpace: 'pre',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {PREFIX}
        {digits}
        {locked ? '…' : ' '}
      </div>
    </div>
  );
}
