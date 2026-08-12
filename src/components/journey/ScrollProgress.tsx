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

import { useCallback, useEffect, useState } from 'react';
import { useJourney } from './JourneyContext';
import { PHASES, PHASE_ORDER, CHAPTER_INDEX, CHAPTER_TITLE, clamp01 } from './journey-utils';
import {
  SLABS,
  SWEET_D,
  CAM_START_Z,
  CAM_END_Z,
  descentCurve,
} from './cosmos/cosmos-data';

// Phase boundaries (skip 0): 0.08 / 0.18 / 0.62 / 0.78
const TICKS = PHASE_ORDER.slice(1).map((name) => PHASES[name].start);

// Ground-aware tokens (journey.css defines the void-ground defaults; Finale
// interpolates them to their bone-ground values across the inversion).
const TRACK = 'var(--jp-track, rgba(232, 228, 220, 0.16))';
const INK_TOP = 'var(--jp-ink-top, #a09890)'; // depth counter
const INK_BOT = 'var(--jp-ink-bot, #a09890)'; // chapter label
const RED = '#c41230';
const MONO = "'JetBrains Mono', monospace";
const SERIF = "'Cormorant Garamond', Georgia, serif";
const CHALK = '#e8e4dc';
const FADED = '#a09890';
const VOID = '#0e0c0a';

/* ============================================================== THE INDEX ===
 *
 * FOURTEEN VIEWPORTS WITH NO ROUTE TO A NAMED PIECE.
 *
 * The rail is an instrument: it tells you how deep you are and what chapter you
 * are in, and it answers no question you can ask it. There was no menu, no
 * contents, no way to reach a work you had already passed — so the only
 * navigation the site offered was "scroll further", and a reader who came here
 * for one painting had to fall past the other fourteen to find it.
 *
 * The index is the rail's second face rather than a nav bar bolted over the
 * art: it opens off the gauge, in the gauge's own voice (mono small-caps, the
 * caption system's crimson tick, one serif for the titles), on the void ground,
 * and it closes back into it. Nothing about the descent changes while it is
 * shut, and it is shut by default.
 *
 * A row does TWO things, because the two are the same intent: it takes the
 * scroll to the depth at which that work is the subject of the frame — solved
 * from the camera's own dolly curve, not from a guessed percentage — and it
 * opens that work's detail. Close the detail and you are standing in front of
 * the piece in the cosmos, exactly where the index said it was.
 */

/** Global scroll progress at which work `i` is the subject of the frame.
 *  Inverts the camera rig's own descentCurve: the rig puts the camera at
 *  CAM_START_Z + (CAM_END_Z − CAM_START_Z)·descentCurve(cp), and a slab is the
 *  subject when the camera stands SWEET_D ahead of it. */
function depthOf(i: number): number {
  const slab = SLABS[i];
  if (!slab) return PHASES.cosmos.start;
  const want = clamp01((slab.z + SWEET_D - CAM_START_Z) / (CAM_END_Z - CAM_START_Z));
  let lo = 0;
  let hi = 1;
  for (let k = 0; k < 36; k++) {
    const mid = (lo + hi) / 2;
    if (descentCurve(mid) < want) lo = mid;
    else hi = mid;
  }
  const cp = (lo + hi) / 2;
  return PHASES.cosmos.start + cp * (PHASES.cosmos.end - PHASES.cosmos.start);
}

/** Solved once — this component re-renders on every scroll frame. */
const DEPTHS: number[] = SLABS.map((_, i) => depthOf(i));

const INDEX_CSS = `
.jx-open { position:absolute; top:52px; right:13px; z-index:2; pointer-events:auto;
  font-family:${MONO}; font-weight:300; font-size:0.6rem; letter-spacing:0.2em;
  text-transform:uppercase; color:var(--jp-ink-top, ${FADED}); white-space:nowrap;
  background:none; border:0; padding:0; cursor:pointer;
  transition:color .3s ease; }
.jx-open:hover, .jx-open:focus-visible { color:${RED}; outline:none; }
.jx-sheet { position:fixed; inset:0; z-index:90; background:${VOID};
  display:flex; flex-direction:column; padding:55px clamp(24px,7vw,144px) 34px;
  box-sizing:border-box; opacity:0; visibility:hidden;
  transition:opacity .22s ease, visibility .22s; }
.jx-sheet[data-open='1'] { opacity:1; visibility:visible; }
.jx-head { display:flex; align-items:baseline; justify-content:space-between;
  gap:21px; margin-bottom:21px; }
.jx-title { font-family:${MONO}; font-weight:300; font-size:0.65rem;
  letter-spacing:0.24em; text-transform:uppercase; color:${CHALK}; margin:0; }
.jx-close { font-family:${MONO}; font-weight:300; font-size:0.65rem;
  letter-spacing:0.2em; text-transform:uppercase; color:${FADED};
  background:none; border:0; border-bottom:1px solid rgba(232,228,220,.25);
  padding:0 0 4px; cursor:pointer; transition:color .3s ease, border-color .3s ease; }
.jx-close:hover, .jx-close:focus-visible { color:${CHALK}; border-bottom-color:${RED};
  outline:none; }
.jx-rule { height:1px; background:rgba(232,228,220,.16); }
.jx-list { list-style:none; margin:auto 0; padding:0; flex:0 1 auto; overflow-y:auto;
  display:flex; flex-direction:column; }
.jx-row { display:flex; align-items:baseline; gap:21px; width:100%;
  background:none; border:0; border-bottom:1px solid rgba(232,228,220,.07);
  padding:8px 0; text-align:left; cursor:pointer; color:inherit;
  transition:background .3s ease; }
.jx-row:hover, .jx-row:focus-visible { outline:none; }
.jx-idx { flex:0 0 34px; font-family:${MONO}; font-weight:300; font-size:0.6rem;
  letter-spacing:0.15em; color:${FADED}; transition:color .3s ease; }
.jx-name { flex:1 1 auto; font-family:${SERIF}; font-weight:300;
  font-size:clamp(1.35rem,2.4vw,2.05rem); line-height:1.06; letter-spacing:-0.006em;
  color:${CHALK}; min-width:0; }
.jx-meta { flex:0 0 auto; font-family:${MONO}; font-weight:300; font-size:0.55rem;
  letter-spacing:0.15em; text-transform:uppercase; color:${FADED}; text-align:right; }
.jx-tick { flex:0 0 21px; height:1px; background:${RED}; opacity:0.18;
  transition:opacity .3s ease, flex-basis .3s ease; }
.jx-row:hover .jx-tick, .jx-row:focus-visible .jx-tick { opacity:1; flex-basis:34px; }
.jx-row:hover .jx-idx, .jx-row:focus-visible .jx-idx { color:${RED}; }
.jx-row[data-here='1'] .jx-idx { color:${RED}; }
.jx-row[data-here='1'] .jx-tick { opacity:1; }
@media (max-width: 767px) {
  .jx-sheet { padding:44px 25px 26px; }
  .jx-row { gap:13px; padding:6px 0; }
  .jx-name { font-size:1.18rem; }
  .jx-meta { display:none; }
}
`;

export function ScrollProgress() {
  // `chapter`, not `phase`: the rail PRINTS a chapter, and every element on the
  // site that prints one resolves it through the same table (JourneyContext →
  // journey-utils). The rail used to name the chapter off its own copy of the
  // phase ranges, which is how it came to print "02 / THE DIVE" in the same
  // frame as the phone's cosmos band printed "03 / THE COSMOS".
  const { progress, chapter, setSelectedWork } = useJourney();
  const p = clamp01(progress);
  // Depth counter counts 000 -> 137. Of course it does.
  const depth = String(Math.round(p * 137)).padStart(3, '0');
  const [indexOpen, setIndexOpen] = useState(false);

  // Which work the descent is standing in front of right now — the index
  // marks it, so the reader can see where they are in the fifteen.
  let here = -1;
  if (indexOpen && p >= PHASES.cosmos.start && p < PHASES.contraction.start) {
    let best = Infinity;
    for (let i = 0; i < DEPTHS.length; i++) {
      const d = Math.abs(DEPTHS[i] - p);
      if (d < best) {
        best = d;
        here = i;
      }
    }
  }

  useEffect(() => {
    if (!indexOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIndexOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [indexOpen]);

  const goTo = useCallback(
    (i: number) => {
      setIndexOpen(false);
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const y = Math.round(DEPTHS[i] * max);
      // Instant, because the detail is about to own the screen: close it and
      // you are standing at the work rather than back where you started.
      if (window.lenis?.scrollTo) window.lenis.scrollTo(y, { immediate: true });
      else window.scrollTo({ top: y, behavior: 'instant' as ScrollBehavior });
      setSelectedWork(SLABS[i].work.id);
    },
    [setSelectedWork],
  );

  return (
    <>
      <style>{INDEX_CSS}</style>
      <div
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
        <button
          type="button"
          className="jx-open"
          aria-haspopup="dialog"
          aria-expanded={indexOpen}
          onClick={() => setIndexOpen(true)}
        >
          Index
        </button>
      </div>

      <div className="jx-sheet" data-open={indexOpen ? '1' : '0'} role="dialog" aria-modal="true" aria-label="Index of works">
        <div className="jx-head">
          <p className="jx-title">
            The work — {String(SLABS.length).padStart(2, '0')} plates
          </p>
          <button type="button" className="jx-close" onClick={() => setIndexOpen(false)}>
            Close ✕
          </button>
        </div>
        <div className="jx-rule" aria-hidden />
        <ul className="jx-list">
          {SLABS.map((slab, i) => (
            <li key={slab.work.id}>
              <button
                type="button"
                className="jx-row"
                data-here={here === i ? '1' : '0'}
                onClick={() => goTo(i)}
              >
                <span className="jx-idx">{String(i + 1).padStart(2, '0')}</span>
                <i className="jx-tick" aria-hidden />
                <span className="jx-name">{slab.work.title}</span>
                <span className="jx-meta">
                  {slab.work.medium.split(' on ')[0]} · {slab.work.year}
                  {slab.work.status === 'sold' ? ' · Sold' : ''}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>

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
    </>
  );
}
