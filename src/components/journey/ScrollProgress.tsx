'use client';

// OWNED BY ATMOSPHERE agent.
// The journey's depth gauge: a 2px vertical rule fixed at the right viewport
// edge. Chalk track, red fill descending with progress, tick marks at each
// phase boundary (ticks ignite red once passed), a JetBrains Mono phase label
// and a 000-137 depth counter. Label crossfades on phase change (journey.css).
// Contract kept: `export function ScrollProgress()` — fixed, zIndex 82,
// pointer-events none, driven by useJourney().progress.

import { useJourney } from './JourneyContext';
import { PHASES, PHASE_ORDER, clamp01, type PhaseName } from './journey-utils';

const LABEL: Record<PhaseName, string> = {
  arrival: 'ARRIVAL',
  dive: 'THE DIVE',
  cosmos: 'THE COSMOS',
  contraction: 'CONTRACTION',
  return: 'RETURN',
};

const INDEX: Record<PhaseName, string> = {
  arrival: '01',
  dive: '02',
  cosmos: '03',
  contraction: '04',
  return: '05',
};

// Phase boundaries (skip 0): 0.08 / 0.18 / 0.62 / 0.78
const TICKS = PHASE_ORDER.slice(1).map((name) => PHASES[name].start);

const CHALK_DIM = 'rgba(232, 228, 220, 0.16)';
const FADED = '#a09890';
const RED = '#c41230';
const MONO = "'JetBrains Mono', monospace";

export function ScrollProgress() {
  const { progress, phase } = useJourney();
  const p = clamp01(progress);
  // Depth counter counts 000 -> 137. Of course it does.
  const depth = String(Math.round(p * 137)).padStart(3, '0');

  return (
    <div
      aria-hidden
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        width: 55,
        zIndex: 82,
        pointerEvents: 'none',
      }}
    >
      {/* depth counter above the rail */}
      <div
        className="jp-counter"
        style={{
          position: 'absolute',
          top: 34,
          right: 13,
          fontFamily: MONO,
          fontWeight: 300,
          fontSize: '0.6rem',
          letterSpacing: '0.15em',
          color: FADED,
          fontVariantNumeric: 'tabular-nums',
          textAlign: 'right',
        }}
      >
        {depth}
      </div>

      {/* rail */}
      <div
        style={{
          position: 'absolute',
          top: 76,
          bottom: 178,
          right: 21,
          width: 2,
          background: CHALK_DIM,
        }}
      >
        {/* red fill — the descent */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: RED,
            transform: `scaleY(${p})`,
            transformOrigin: 'top center',
            willChange: 'transform',
          }}
        />
        {/* phase boundary ticks */}
        {TICKS.map((t) => (
          <div
            key={t}
            style={{
              position: 'absolute',
              top: `${t * 100}%`,
              right: 4,
              width: 8,
              height: 1,
              background: p >= t ? RED : CHALK_DIM,
              transition: 'background 0.618s ease',
            }}
          />
        ))}
        {/* terminus tick */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            right: 4,
            width: 8,
            height: 1,
            background: p >= 0.995 ? RED : CHALK_DIM,
            transition: 'background 0.618s ease',
          }}
        />
      </div>

      {/* phase label below the rail — vertical, mono, crossfades per phase */}
      <div
        key={phase}
        className="jp-label"
        style={{
          position: 'absolute',
          bottom: 34,
          right: 15,
          fontFamily: MONO,
          fontWeight: 300,
          fontSize: '0.6rem',
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          color: FADED,
          writingMode: 'vertical-rl',
          whiteSpace: 'nowrap',
        }}
      >
        <span style={{ color: RED }}>{INDEX[phase]}</span>
        {' / '}
        {LABEL[phase]}
      </div>
    </div>
  );
}
