'use client';

// OWNED BY ATMOSPHERE agent.
// The journey's depth gauge: a 2px vertical rule fixed at the right viewport
// edge. Chalk track, red fill descending with progress, tick marks at each
// phase boundary (ticks ignite red once passed), a JetBrains Mono phase label
// and a 000-137 depth counter. Label crossfades on phase change (journey.css).
// Contract kept: `export function ScrollProgress()` — fixed, zIndex 82,
// pointer-events none, driven by useJourney().progress.
//
// THE LIGHT ACT. The rail does not own its own colour any more. Track, unlit
// ticks, counter and chapter label read the --jp-track / --jp-ink-* tokens
// declared in journey.css, which Finale scrubs on <html> across the inversion.
// The counter and the label take SEPARATE ink tokens on purpose: the ground
// wipes in from the bottom edge, so it reaches the two ends of the rail about
// half a second apart and one flat value would strand one of them mid-grey.
// When the ground turns bone the whole gauge redraws dark-on-cream — the rail
// belongs to the world, not to a reserved black channel cut out of it.
// Crimson (fill, lit ticks, phase index) is constant: it is legible on both
// grounds and it is the one colour the system lets stay put.

import { useJourney } from './JourneyContext';
import { PHASES, PHASE_ORDER, CHAPTER_INDEX, CHAPTER_TITLE, clamp01 } from './journey-utils';

// Phase boundaries (skip 0): 0.08 / 0.18 / 0.62 / 0.78
const TICKS = PHASE_ORDER.slice(1).map((name) => PHASES[name].start);

// Ground-aware tokens (journey.css defines the void-ground defaults; Finale
// interpolates them to their bone-ground values across the inversion).
const TRACK = 'var(--jp-track, rgba(232, 228, 220, 0.16))';
const INK_TOP = 'var(--jp-ink-top, #a09890)'; // depth counter
const INK_BOT = 'var(--jp-ink-bot, #a09890)'; // chapter label
const RED = '#c41230';
const MONO = "'JetBrains Mono', monospace";

export function ScrollProgress() {
  // `chapter`, not `phase`: the rail PRINTS a chapter, and every element on the
  // site that prints one resolves it through the same table (JourneyContext →
  // journey-utils). The rail used to name the chapter off its own copy of the
  // phase ranges, which is how it came to print "02 / THE DIVE" in the same
  // frame as the phone's cosmos band printed "03 / THE COSMOS".
  const { progress, chapter } = useJourney();
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
          color: INK_TOP,
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
          background: TRACK,
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
              background: p >= t ? RED : TRACK,
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
            background: p >= 0.995 ? RED : TRACK,
            transition: 'background 0.618s ease',
          }}
        />
      </div>

      {/* THE INSTRUMENT NEVER READS BLANK.
          journey.css animates .jp-label in from opacity 0, so for 0.618s at
          every chapter change the rail carried a depth, a fill and NO chapter —
          measured: at global 0.103 the label sampled at opacity ≤ 0.02. An
          instrument that stops answering the question it exists to answer is
          the same fault as two instruments disagreeing. The swap keeps its
          rise but floors at 0.42, so the change still reads as an edit and the
          chapter is legible through it. Inline `animation` wins over the class
          rule, so the atmosphere layer's stylesheet is untouched. */}
      <style>{
        '@keyframes jp-chapter-cut{from{opacity:.42;transform:translateY(7px)}' +
        'to{opacity:1;transform:translateY(0)}}'
      }</style>
      <div
        key={chapter}
        className="jp-label"
        style={{
          animation: 'jp-chapter-cut 0.618s cubic-bezier(0.25, 1, 0.5, 1) both',
          position: 'absolute',
          bottom: 34,
          right: 15,
          fontFamily: MONO,
          fontWeight: 300,
          fontSize: '0.6rem',
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          color: INK_BOT,
          writingMode: 'vertical-rl',
          whiteSpace: 'nowrap',
        }}
      >
        <span style={{ color: RED }}>{CHAPTER_INDEX[chapter]}</span>
        {' / '}
        {CHAPTER_TITLE[chapter]}
      </div>
    </div>
  );
}
