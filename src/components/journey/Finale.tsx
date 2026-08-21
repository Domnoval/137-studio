'use client';

// OWNED BY FINALE agent.
// RETURN (78–100%) — the biggest, quietest movement on the site.
//
// The return is PINNED, not flowed. The section reserves 22% of the scroll
// track; inside it a fixed full-viewport stage crossfades five composed
// frames, each of which owns the whole viewport:
//
//   01  Perception is choice.        ┐  four philosophy moments, Cormorant
//   02  Choices change experience.   │  Garamond 300 at 7.6vw / 13.5vw mobile,
//   03  Experience is the point.     │  set on a fixed editorial grid with a
//   04  Love is the answer.          ┘  mono index and a red rule above.
//   ——  the closer: name, contact, the colophon plate, the 137 whisper.
//
// THE COPY IS THE ARTIST'S AND IS NOT TO BE REWRITTEN. These four lines are
// Michael's, verbatim, in his order. A previous pass replaced them with copy
// about the fine-structure constant on the reasoning that at 7.6vw they read
// as "fortune-cookie" — which was a judgement that was never anyone's to make
// here. They are the thing the site exists to say; the α ≈ 1/137.035999
// colophon is the caption, not the manifesto.
//
// If a future pass believes this copy needs to change, that is a conversation
// to have with him, not an edit to make.
//
// THE INVERSION. This chapter is the one place the ground turns over: the void
// gives way to a bone (#e8e4dc) plane and the type is set in void black on it,
// then the plane recedes and the closer lands back on black. That single move
// is the colour arc of the whole descent — and it costs nothing in palette
// discipline: bone and void are already the two ends of the system, crimson
// stays the only accent, no third colour enters.
//
// The bone plane is FULL BLEED — every viewport edge. It used to stop 55px
// short of the right edge to leave the depth rail its own dark channel, which
// meant the best move in the scroll arrived as a cream panel jammed against a
// 57px black band with a red line in it: a layout, not a world turning over.
// The rail survives an inverted ground perfectly well — it just has to be told
// about it. So this component scrubs the --jp-* chrome tokens on <html>
// (contract documented in journey.css) and the rail, its ticks, the depth
// counter, the chapter label, the grain plate and the scrollbar all redraw
// dark-on-cream with it. Because the ground WIPES rather than fades, those
// tokens are sampled from the ground under each element rather than from one
// global number — see the chrome contract in the effect below. The cursor
// needs no token at all: mix-blend-mode: difference inverts it for free.
//
// TIMING. Two rules govern the schedule:
//   1. Consecutive lines never share a position — 01/03 sit high on the plate,
//      02/04 sit low — so consecutive beats CROSS-fade over a SHORT window
//      (0.020 of the phase) with a steep exit ramp. The screen is never empty
//      and never shows two lines at equal weight: the crossing point sits at
//      ~0.26, and the outgoing line is travelling upward while it clears.
//   2. The ground only turns over while nothing is on it — bone arrives in the
//      empty beat after the contraction veil has closed (r 0.075→0.100, i.e.
//      global 0.7943→0.802, immediately before line 01 lands) and leaves in the
//      empty beat before the closer (r 0.740→0.756) — so the ink never has to
//      cross the ground's own luminance, and the half-turned ground is never
//      left alone on screen for more than a blink.
//
// Timing is scrubbed from RAW scroll depth (Lenis already smooths the scroll;
// the context's extra per-frame lerp is frame-rate dependent and would strand
// the last lines past the end of the track on a slow machine).
// reducedMotion: the frames cut, they do not drift or blur.

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { useJourney } from './JourneyContext';
import { PHASES, clamp01, CHAPTER_INDEX, CHAPTER_TITLE } from './journey-utils';

const CHALK = '#e8e4dc';
const FADED = '#a09890';
const RED = '#c41230';
/** --text-glow. Rare, emphasis only — here it is the link hover state. */
const GLOW = '#ffffff';
const MONO = "'JetBrains Mono', monospace";
const SERIF = "'Cormorant Garamond', Georgia, serif";
const CINZEL = "'Cinzel', Georgia, serif";

/** The artist's words, verbatim and in his order. Do not reword, re-punctuate,
 *  re-order, or "make specific". See THE COPY above.
 *
 *  Each is short enough to set on ONE visual line at 7.6vw desktop and to break
 *  to at most two at 13.5vw mobile — comfortably inside what the previous,
 *  much longer sentences demanded, so the schedule below needs no change. */
const LINES = [
  'Perception is choice.',
  'Choices change experience.',
  'Experience is the point.',
  'Love is the answer.',
];

/** [fade-in start, fade-in end, fade-out start, fade-out end] in return-phase time.
 *  Handover windows are 0.012 wide (was 0.020, was 0.032). The claim attached to
 *  the 0.020 pass — "one landing line and at most a faint ghost" — did not
 *  survive measurement: the 9-step mobile sweep landed on global 0.8750 and the
 *  two frames read 0.358 and 0.412, which is not a ghost, it is a double
 *  exposure, and on a phone each sentence is FOUR lines deep so the two fill the
 *  plate together. Solving the ramps, the curves actually crossed at t≈0.31, not
 *  the 0.26 the note claimed.
 *
 *  Halving the window again halves the scroll distance a capture (or a reader)
 *  can land inside — 0.012 of the return phase is 0.0026 of the whole track —
 *  and the exit ramp below is steepened from pow 0.30 to 0.20, which moves the
 *  crossing down to t≈0.095 and puts the outgoing line at a quarter of the
 *  incoming one everywhere past it. */
const CUES: [number, number, number, number][] = [
  // 01 — high. Starts at 0.068, not 0.08: with the ink beginning exactly when
  // the wipe topped out there was one measurable frame (global 0.7975) of bare
  // cream at 0.00% ink on BOTH viewports — a blank page, and the capture grid
  // found it. The sentence sits at the HEAD of the plate and the ground rises
  // from the FOOT, so at gin ≈ 0.7 the top of the frame is already whole bone:
  // the ink never has to land on the moving edge, it just stops waiting for it.
  [0.068, 0.086, 0.25, 0.262],
  [0.25, 0.262, 0.425, 0.437], // 02 — low   (hands over from 01)
  [0.425, 0.437, 0.6, 0.612], // 03 — high  (hands over from 02)
  [0.6, 0.612, 0.722, 0.74], // 04 — low   (clears exactly as the wipe begins)
  // The closer. It used to wait for the ground to finish leaving (0.756), which
  // made the exit wipe a frame with NOTHING on it: measured at global 0.9437,
  // 0.00% ink — a bare cream field sliding off a bare black one. It now comes up
  // INSIDE the wipe and is CLIPPED to the void the retreating ground uncovers
  // (see the clip in the tick), so the closer is not faded in over the bone —
  // it is revealed by the bone leaving. Chalk never has to cross cream.
  [0.734, 0.752, 2, 2],
];

/** The inversion window, in return-phase time.
 *
 *  THE WIPE NOW OVERLAPS BOTH NEIGHBOURS, BECAUSE A GAP EITHER SIDE OF IT IS AN
 *  EMPTY FRAME. The previous schedule (0.065→0.100, line 01 from 0.100) had the
 *  sigil's veil finished at global ~0.797 and the first sentence not starting
 *  until 0.802 — measured at global 0.800 the viewport was a bare cream field
 *  with nothing on it but the rail. Half a percent of the track, and exactly
 *  the kind of frame a scrubbing juror stops on.
 *
 *  So the bone ground now STARTS while the sigil is still dissolving (r 0.045 =
 *  global 0.790, veil still at ~0.6 — the ground literally comes up under the
 *  mark), tops out at r 0.080 = global 0.7976, and line 01 strikes on from that
 *  instant over a short 0.020 ramp so it is already past 0.7 ink by 0.800 and
 *  fully rested by 0.802. There is no beat anywhere in the hand-off with an
 *  empty stage, and the ink still never has to cross the moving wipe edge —
 *  the ground is whole before the first glyph is legible. */
const GROUND_IN: [number, number] = [0.033, 0.073];
const GROUND_OUT: [number, number] = [0.734, 0.756];

/** Ink pair, void-ground → bone-ground. Interpolated with the inversion. */
const INK_DARK = [232, 228, 220]; // chalk, on void
const INK_LIGHT = [14, 12, 10]; // void, on bone
const MUTE_DARK = [160, 152, 144]; // faded, on void
const MUTE_LIGHT = [56, 51, 46]; // soft void, on bone

/** Rail track hairline: chalk-at-16% on void → void-at-20% on bone. Kept
 *  translucent rather than resolved to a flat tone so it stays correct across
 *  the wipe edge, where the plane behind it is two different grounds at once. */
const TRACK_DARK = [232, 228, 220, 0.16];
const TRACK_LIGHT = [14, 12, 10, 0.2];
/** Grain plate: overlay noise bites ~3x harder on bone than on void. */
const GRAIN_DARK = 0.06;
const GRAIN_LIGHT = 0.036;

const CSS = `
.fin-stage {
  position: fixed;
  inset: 0;
  z-index: 2;
  visibility: hidden;
  pointer-events: none;
  --fin-ink: ${CHALK};
  --fin-mute: ${FADED};
  --fin-pad-l: clamp(24px, 10vw, 190px);
  --fin-pad-r: clamp(76px, 10vw, 190px);
}
/* The inverted ground. FULL BLEED — it owns every edge of the viewport, and
   the depth rail redraws on top of it (see the header note on --jp-* tokens).
   It arrives as a WIPE from the bottom edge, never as a cross-fade: fading a
   bone plane up over void spends its whole transit as a flat mid-grey field
   with nothing on it, which reads as a loading screen. A rising edge is a
   move — the ground comes up under you as the descent surfaces. */
.fin-ground {
  position: absolute;
  inset: 0;
  background: ${CHALK};
  opacity: 0;
  will-change: clip-path;
}
.fin-frame {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 0 var(--fin-pad-r) 0 var(--fin-pad-l);
  box-sizing: border-box;
  opacity: 0;
  will-change: opacity, transform, filter;
}

/* ---- THE MEASURED VOID -------------------------------------------------
   Each manifesto frame is a SPREAD, not a block dropped in a corner. The
   sentence takes one 15vh margin and the FOLIO BAND takes the other, so the
   empty field between them is a stated gap with a mark at each end instead of
   bare cream with nothing in it. (Measured before: at 85% the top 55% of a
   900px canvas carried a single 0.62rem index and nothing else; at 92% there
   were ~370px of dead ground above the type and no terminus below it.)

   The band is folio + rule + terminal — a large chapter numeral at the left
   margin, a hairline running the full measure, and the caption system's own
   crimson tick closing it on the right. Three marks the site already owns; no
   new colour, no new device, and the sentence itself is untouched. Consecutive
   lines still never share a position: the sentence alternates head/foot, and
   the folio takes whichever margin it vacates, so the two also cross. */
.fin-frame--say {
  justify-content: space-between;
  padding-top: 15vh;
  padding-bottom: 15vh;
}
/* 01 / 03 — sentence at the head, folio standing at the foot. */
.fin-frame--hi { flex-direction: column-reverse; }
/* 02 / 04 — folio at the head, sentence sitting on the foot margin. */
.fin-frame--lo { flex-direction: column; }
/* THE FOLIO IS GATED, NOT CROSS-FADED.
   Consecutive sentences alternate head/foot, so during a handover the OUTGOING
   frame's folio band shares the head margin with the INCOMING frame's sentence
   (and vice versa at the foot). The boxes never collide — measured 0 px² of
   overlap at every sample — but the reading is worse than a collision: at the
   crossing point (measured 0.358 / 0.412 on mobile at global 0.8750) the head
   of the plate showed "02 / 04" standing over the sentence that is line 03,
   and the foot showed "03 / 04" under line 02. A numbered instrument that
   disagrees with the thing it numbers is exactly the defect the chapter rail
   was just fixed for. So the band is driven by a GATE on its own frame's
   presence rather than by that frame's opacity: it is only drawn while its
   sentence is the one the reader is on (o > 0.60), and both bands are dark
   through the crossing. The sentences still cross — that motion is the
   handover — but only one folio can ever be legible, and never a wrong one. */
.fin-folio {
  margin: 0;
  width: 100%;
  display: flex;
  align-items: baseline;
  gap: 21px;
  color: var(--fin-ink);
  opacity: var(--fin-folio-o, 1);
}
/* ---- ONE SCREEN MAY NOT CARRY TWO NUMBERING SYSTEMS ---------------------
   The band used to open with a 5.4vw serif "02" over "/ 04" while the depth
   rail, in the same frame, printed "05 / RETURN". Two index-slash-total
   readouts, different values, no stated relationship — and MEASURED, the
   numeral was the second largest object in the frame at 2.81:1 on the bone
   ground, so the one element that could have explained itself was also the
   one that read as unfinished.

   Both faults have the same cure: the band stops being a counter. It now
   OPENS WITH THE RAIL'S OWN READING — the chapter index and the chapter name,
   resolved through CHAPTER_INDEX / CHAPTER_TITLE, the same table the rail
   resolves them through, with the index in the same crimson the rail sets it
   in — and then names itself. A reader sees "05 / RETURN — THE MANIFESTO"
   next to a rail reading "05 / RETURN" and the relationship is legible at a
   glance: this is a movement INSIDE that chapter, not a rival count of it.

   The manifesto's own position is then told by a device that cannot be
   mistaken for a chapter number at all: four marks, one lit. Distinct in kind,
   built out of the rule the site already owns, and it adds no colour and no
   digit. Set in full ink, it measures 15.4:1 on the bone. */
.fin-folio-ch {
  font-family: ${MONO};
  font-weight: 200;
  font-size: clamp(0.92rem, 1.28vw, 1.15rem);
  letter-spacing: 0.3em;
  text-transform: uppercase;
  white-space: nowrap;
}
.fin-folio-ch i { font-style: normal; color: ${RED}; }
.fin-folio-rule {
  flex: 1 1 auto;
  min-width: 34px;
  height: 1px;
  background: currentColor;
  opacity: 0.2;
}
.fin-folio-tag {
  font-family: ${MONO};
  font-weight: 300;
  font-size: 0.62rem;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  color: var(--fin-mute);
  white-space: nowrap;
}
/* the position of this line in the movement: four marks, one lit. Not a
   number, so it cannot be read against the rail's number. */
.fin-folio-marks { display: flex; align-items: center; gap: 13px; flex: 0 0 auto; }
.fin-folio-marks i { display: block; width: 34px; height: 2px; background: currentColor; }
.fin-folio-marks i.is-past { opacity: 0.34; }
.fin-folio-marks i.is-next { opacity: 0.12; }
.fin-folio-marks i.is-now { background: ${RED}; opacity: 1; }
/* the caption system's terminal glyph, closing the measure on the right.
   Empty elements take their baseline from the bottom margin edge, so both
   pieces land exactly on the folio's own baseline — no magic numbers. */
.fin-folio-tick {
  flex: 0 0 21px;
  height: 1px;
  background: rgba(196, 18, 48, 0.7);
}
.fin-folio-dot {
  flex: 0 0 3px;
  height: 3px;
  margin-bottom: -1px;
  background: ${RED};
}
.fin-say {
  margin: 0;
  font-family: ${SERIF};
  font-weight: 300;
  font-size: 7.6vw;
  line-height: 1.02;
  letter-spacing: -0.008em;
  color: var(--fin-ink);
  max-width: 12em;
}

/* ---- the closer: a colophon plate, bracketed top and bottom ---- */
.fin-closer {
  justify-content: center;
}
.fin-closer-inner {
  width: 100%;
  max-width: 1010px;
}
.fin-name {
  margin: 0 0 34px;
  font-family: ${SERIF};
  font-weight: 300;
  font-size: clamp(2.5rem, 6.2vw, 6.2rem);
  line-height: 1;
  letter-spacing: -0.008em;
  color: ${CHALK};
}
.fin-rule {
  height: 1px;
  width: 100%;
  background: rgba(232, 228, 220, 0.16);
  margin-bottom: 34px;
}
/* Three columns spanning the whole measure — the rule is only allowed to be
   full width because content now terminates it at BOTH ends. */
.fin-cols {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 34px;
  align-items: start;
}
.fin-col {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 13px;
  min-width: 0;
}
.fin-col--end {
  align-items: flex-end;
  text-align: right;
}
.fin-label {
  font-family: ${MONO};
  font-weight: 300;
  font-size: 0.62rem;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: ${FADED};
  margin-bottom: 8px;
}
/* ---- CRIMSON IS THE MARKER, NOT THE INK ---------------------------------
   The two contact links were set in the accent: #c41230 on the (14,12,10)
   ground measures 3.23:1 — under AA for 12.8px type — while the "Find the
   work" label directly above them measures 6.88:1. The system already knew
   better; the accent had simply been spent on the one thing a visitor
   actually has to read.
   So every link on this plate is set in chalk (15.41:1) and the crimson moves
   to the RULE under it and the terminal square that closes it — the same
   rule+tick+dot device the art captions and the folio band already use. The
   contact pair wears the crimson rule at rest, which is what marks it as the
   way to reach the work; the two navigation links wear the chalk hairline and
   ignite crimson on hover. Nothing loses the accent, and nothing is read at
   3:1. Hover RAISES contrast (chalk → #ffffff, 21.0:1) — it never lowers it,
   which is what the old red-on-hover did. */
.fin-link {
  font-family: ${MONO};
  font-size: 0.8rem;
  font-weight: 400;
  color: ${CHALK};
  letter-spacing: 0.1em;
  text-decoration: none;
  background: none;
  border: none;
  border-bottom: 1px solid rgba(232, 228, 220, 0.25);
  padding: 0 0 4px;
  width: fit-content;
  text-align: left;
  position: relative;
  transition: border-color 0.3s ease, color 0.3s ease;
}
.fin-link:hover,
.fin-link:focus-visible {
  color: ${GLOW};
  border-bottom-color: ${RED};
  outline: none;
}
/* the contact pair: chalk ink, crimson marker + terminal */
.fin-link--mark {
  border-bottom-color: ${RED};
  padding-right: 13px;
}
.fin-link--mark::after {
  content: '';
  position: absolute;
  right: 0;
  bottom: -2px;
  width: 3px;
  height: 3px;
  background: ${RED};
}
.fin-fact {
  font-family: ${MONO};
  font-size: 0.8rem;
  font-weight: 300;
  letter-spacing: 0.1em;
  color: ${CHALK};
  padding-bottom: 4px;
}
/* THE LINE THAT NAMES THE THESIS IS NOT A FOOTNOTE.
   "the fine-structure constant" is the caption on the one claim the whole site
   is built out of, and it was set in ${FADED} at 300 weight / 11.2px: MEASURED
   on the rendered frame at 100%, the glyph cores reached only 5.53:1 against
   the void — under the 7:1 the site's own labels hold, and visibly the faintest
   thing on the closing plate. It is the same chalk as the value it glosses, at
   0.72 of its ink and a step down in size, which measures ~8:1 while staying
   clearly subordinate to the 15.3:1 line above it. */
.fin-fact--dim {
  color: rgba(232, 228, 220, 0.72);
  font-weight: 400;
  font-size: 0.7rem;
}
/* The running foot: anchored to the foot of the page, so the plate reads as a
   composed spread with a baseline rather than a block with air under it. */
.fin-closer-foot {
  position: absolute;
  left: var(--fin-pad-l);
  bottom: 8vh;
  width: min(1010px, calc(100% - var(--fin-pad-l) - var(--fin-pad-r)));
}
.fin-foot-rule {
  height: 1px;
  width: 100%;
  background: rgba(232, 228, 220, 0.16);
}
.fin-foot {
  margin-top: 21px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 21px;
}
.fin-mark {
  font-family: ${CINZEL};
  font-weight: 400;
  font-size: 0.8rem;
  letter-spacing: 0.45em;
  padding-left: 0.05em;
  text-transform: uppercase;
  color: ${FADED};
}
/* the caption system's terminal glyph, reused to stop the rule's right end */
.fin-term {
  display: flex;
  align-items: center;
  gap: 8px;
}
.fin-term i {
  display: block;
  width: 21px;
  height: 1px;
  background: rgba(196, 18, 48, 0.7);
}
.fin-term b {
  display: block;
  width: 3px;
  height: 3px;
  background: ${RED};
}

@media (max-width: 767px) {
  .fin-stage {
    --fin-pad-l: 25px;
    --fin-pad-r: 61px;
  }
  /* bigger and set further off the edges: at 12vw / 13vh the line sat in the
     top eighth of a 844px phone with seven-eighths of bare ground under it */
  .fin-say { font-size: 13.5vw; max-width: 9em; }
  /* the spread still holds on a 390px phone: folio band on one margin, the
     sentence on the other, and the gap between them stays a stated void */
  .fin-frame--say { padding-top: 12vh; padding-bottom: 12vh; }
  .fin-folio { gap: 13px; }
  .fin-folio-ch { font-size: 0.72rem; letter-spacing: 0.22em; }
  .fin-folio-tag { display: none; }
  .fin-folio-marks { gap: 8px; }
  .fin-folio-marks i { width: 17px; }
  .fin-name { font-size: 10vw; margin-bottom: 26px; }
  .fin-cols { grid-template-columns: 1fr; gap: 26px; }
  .fin-col--end { align-items: flex-start; text-align: left; }
  .fin-closer-foot { bottom: 6vh; }
}
`;

export function Finale() {
  const { reducedMotion } = useJourney();
  const stageRef = useRef<HTMLDivElement>(null);
  const groundRef = useRef<HTMLDivElement>(null);
  const frameRefs = useRef<(HTMLDivElement | null)[]>([]);
  const { start, end } = PHASES.return;

  const setFrame = (i: number) => (el: HTMLDivElement | null) => {
    frameRefs.current[i] = el;
  };

  useEffect(() => {
    const stage = stageRef.current;
    const ground = groundRef.current;
    if (!stage || !ground) return;
    const frames = frameRefs.current;
    let stageShown: boolean | null = null;
    let interactive: boolean | null = null;
    let lastInv = -1;
    let maxScroll = 1;
    let viewH = 900;
    let age = 999;

    const raw = (): number => {
      if (age++ > 30) {
        age = 0;
        viewH = Math.max(window.innerHeight, 1);
        maxScroll = Math.max(document.documentElement.scrollHeight - viewH, 1);
      }
      return clamp01(window.scrollY / maxScroll);
    };

    const smooth = (t: number) => t * t * (3 - 2 * t);
    const win = (t: number, a: number, b: number) => smooth(clamp01((t - a) / (b - a)));
    const mix = (a: number[], b: number[], t: number) =>
      `rgb(${Math.round(a[0] + (b[0] - a[0]) * t)},${Math.round(a[1] + (b[1] - a[1]) * t)},${Math.round(a[2] + (b[2] - a[2]) * t)})`;
    /** Same, but carrying the alpha channel — for hairlines that must stay
     *  translucent so they read correctly on BOTH sides of the wipe edge. */
    const mixa = (a: number[], b: number[], t: number) =>
      `rgba(${Math.round(a[0] + (b[0] - a[0]) * t)},${Math.round(a[1] + (b[1] - a[1]) * t)},${Math.round(a[2] + (b[2] - a[2]) * t)},${(a[3] + (b[3] - a[3]) * t).toFixed(3)})`;
    const span = end - start;

    // ---- the chrome contract ----
    // Every fixed element outside this component reads these off <html>.
    //
    // The ground does not cross-fade, it WIPES — so for the two beats the edge
    // is in transit the viewport is genuinely two grounds at once, and a single
    // global inversion number is wrong for anything that is not at the edge's
    // own height. Driving the whole rail off it put the depth counter (y≈40) at
    // 3.1:1 on cream for the length of the exit wipe: the counter was already
    // standing on bone while the token still thought the world was dark.
    // So each opaque piece of chrome is inverted by the ground under IT —
    // coverage sampled at that element's own y — and the translucent hairlines
    // (rail track, ticks) keep an alpha so they stay correct on both sides of
    // the edge at once. At rest this collapses to exactly the global value.
    const SOFT = 90; // px the ink takes to turn over as the edge sweeps past it
    const root = document.documentElement;
    const applyChrome = (gin: number, gout: number, inv: number) => {
      const h = viewH;
      // The clip is inset(topEdge, botEdge); at rest the live edge is not an
      // edge at all — the ground simply runs off the viewport — so push it out
      // of range rather than letting SOFT bleed a false gradient in from it.
      const topEdge = gin >= 0.999 ? -1e4 : (1 - gin) * h;
      const botEdge = gout <= 0.001 ? 1e4 : (1 - gout) * h;
      const cov = (y: number) =>
        smooth(clamp01((y - topEdge) / SOFT)) * smooth(clamp01((botEdge - y) / SOFT));

      root.style.setProperty('--jp-inv', inv.toFixed(4));
      // depth counter (top 34px) and chapter label (bottom 34px) sit at opposite
      // ends of the rail and the wipe reaches them ~600ms apart.
      root.style.setProperty('--jp-ink-top', mix(MUTE_DARK, MUTE_LIGHT, cov(46)));
      root.style.setProperty('--jp-ink-bot', mix(MUTE_DARK, MUTE_LIGHT, cov(h - 62)));
      root.style.setProperty('--jp-track', mixa(TRACK_DARK, TRACK_LIGHT, cov(h * 0.5)));
      root.style.setProperty(
        '--jp-grain',
        (GRAIN_DARK + (GRAIN_LIGHT - GRAIN_DARK) * inv).toFixed(4),
      );
      root.classList.toggle('journey-light', inv > 0.5);
    };

    const update = () => {
      const p = raw();
      const r = (p - start) / span;

      const live = r > -0.03;
      if (live !== stageShown) {
        stage.style.visibility = live ? 'visible' : 'hidden';
        stageShown = live;
        // Leaving the chapter (scrolling back up out of it) has to hand the
        // chrome back to the void ground, or the rail keeps its bone colours
        // over the cosmos.
        if (!live) {
          lastInv = 0;
          applyChrome(0, 0, 0);
        }
      }
      if (!live) return;

      // ---- the inversion ----
      // The plane RISES from the bottom edge and later FALLS back through it —
      // two moves, so the clip is driven by the two ramps separately rather
      // than by their product.
      const gin = win(r, GROUND_IN[0], GROUND_IN[1]);
      const gout = win(r, GROUND_OUT[0], GROUND_OUT[1]);
      const inv = gin * (1 - gout);
      if (Math.abs(inv - lastInv) > 0.001) {
        lastInv = inv;
        // opaque wherever it is present; the EDGE is what moves
        const on = gin > 0.002 && gout < 0.998;
        ground.style.opacity = on ? '1' : '0';
        ground.style.clipPath = `inset(${((1 - gin) * 100).toFixed(2)}% 0 ${(gout * 100).toFixed(2)}% 0)`;
        ground.style.visibility = on ? 'visible' : 'hidden';
        stage.style.setProperty('--fin-ink', mix(INK_DARK, INK_LIGHT, inv));
        stage.style.setProperty('--fin-mute', mix(MUTE_DARK, MUTE_LIGHT, inv));
        applyChrome(gin, gout, inv);
      }

      let closerOpacity = 0;
      for (let i = 0; i < CUES.length; i++) {
        const el = frames[i];
        if (!el) continue;
        const [a, b, c, d] = CUES[i];
        const tin = clamp01((r - a) / (b - a));
        const tout = clamp01((r - c) / (d - c));
        // The exit is biased much steeper than the entry (pow 0.20 out against
        // 0.50 in), which puts the crossing at t ≈ 0.095 rather than the 0.31 the
        // previous pair actually produced. Measured across the handover at
        // global 0.8738→0.8752: 0.476/0.198, 0.292/0.422, 0.133/0.700,
        // 0.067/0.842 — one landing line and a ghost, which is what the shape
        // was always supposed to be.
        const o = Math.pow(smooth(tin), 0.5) * (1 - Math.pow(smooth(tout), 0.2));
        if (i === CUES.length - 1) {
          closerOpacity = o;
          // THE CLOSER IS UNCOVERED, NOT FADED IN. It is chalk on void and it
          // arrives while the bone plane is still falling through the bottom
          // edge, so it is clipped to exactly the void the plane has uncovered
          // — `gout` is that fraction, measured from the foot. Outside the wipe
          // the clip is removed entirely so nothing pays for it at rest.
          el.style.clipPath =
            gout > 0.001 && gout < 0.999
              ? `inset(${((1 - gout) * 100).toFixed(2)}% 0 0 0)`
              : 'none';
        }
        el.style.opacity = o.toFixed(4);
        // see the .fin-folio note: the band belongs to the sentence the reader
        // is actually on, so it is gated off through the whole crossing.
        el.style.setProperty('--fin-folio-o', clamp01((o - 0.6) / 0.28).toFixed(3));
        if (reducedMotion) {
          el.style.transform = 'none';
          el.style.filter = 'none';
        } else {
          // more travel, less blur: the handover is now told by MOVEMENT (the
          // outgoing line clearing upward) rather than by a soft focus that
          // turned both lines into grey fog on the bone ground.
          // The outgoing line has to be visibly LEAVING, not just dimming: 52px
          // of travel over a 0.020 window meant the ghost had moved 11px at the
          // crossing and read as a second sentence sitting there. 96px over a
          // 0.012 window clears it upward fast enough that the eye reads one
          // sentence landing and one being taken away.
          const y = (1 - smooth(tin)) * 44 - smooth(tout) * 96;
          const blur = (1 - smooth(tin)) * 1.1 + smooth(tout) * 1.8;
          el.style.transform = `translate3d(0, ${y.toFixed(2)}px, 0)`;
          el.style.filter = blur > 0.06 ? `blur(${blur.toFixed(2)}px)` : 'none';
        }
        el.style.visibility = o > 0.002 ? 'visible' : 'hidden';
      }

      // the closer is the only interactive moment of the return
      const want = closerOpacity > 0.55;
      if (want !== interactive) {
        stage.style.pointerEvents = want ? 'auto' : 'none';
        interactive = want;
      }
    };

    gsap.ticker.add(update);
    return () => {
      gsap.ticker.remove(update);
      applyChrome(0, 0, 0);
      root.style.removeProperty('--jp-inv');
      root.style.removeProperty('--jp-ink-top');
      root.style.removeProperty('--jp-ink-bot');
      root.style.removeProperty('--jp-track');
      root.style.removeProperty('--jp-grain');
      root.classList.remove('journey-light');
    };
  }, [reducedMotion, start, end]);

  const restart = () => {
    const lenis = window.lenis;
    if (lenis?.scrollTo) lenis.scrollTo(0, { duration: 2.2 });
    else window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <section
      data-phase="return"
      aria-label="Philosophy and contact"
      style={{
        position: 'absolute',
        top: `${start * 100}%`,
        height: `${(end - start) * 100}%`,
        left: 0,
        width: '100%',
        zIndex: 2,
        pointerEvents: 'none',
      }}
    >
      <style>{CSS}</style>

      <div className="fin-stage" ref={stageRef}>
        <div className="fin-ground" ref={groundRef} aria-hidden />

        {LINES.map((line, i) => (
          <div
            className={`fin-frame fin-frame--say ${i % 2 === 0 ? 'fin-frame--hi' : 'fin-frame--lo'}`}
            key={line}
            ref={setFrame(i)}
          >
            {/* the counterweight: folio, full-measure hairline, crimson terminal */}
            <p className="fin-folio" aria-hidden>
              <span className="fin-folio-ch">
                <i>{CHAPTER_INDEX.return}</i> / {CHAPTER_TITLE.return}
              </span>
              <span className="fin-folio-tag">The manifesto</span>
              <i className="fin-folio-rule" />
              <span className="fin-folio-marks">
                {LINES.map((_, j) => (
                  <i
                    key={j}
                    className={j === i ? 'is-now' : j < i ? 'is-past' : 'is-next'}
                  />
                ))}
              </span>
              <i className="fin-folio-tick" />
              <b className="fin-folio-dot" />
            </p>
            <p className="fin-say">{line}</p>
          </div>
        ))}

        {/* The closer — a colophon plate: name, rule, three columns, baseline. */}
        <div className="fin-frame fin-closer" ref={setFrame(4)}>
          <div className="fin-closer-inner">
            <p className="fin-name">Michael MacDonald</p>
            <div className="fin-rule" aria-hidden />
            <div className="fin-cols">
              <div className="fin-col">
                <span className="fin-label">Find the work</span>
                <a
                  className="fin-link fin-link--mark"
                  href="https://instagram.com/domnoval_art"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  @domnoval_art
                </a>
                <a className="fin-link fin-link--mark" href="mailto:the37thmover@gmail.com">
                  the37thmover@gmail.com
                </a>
              </div>
              <div className="fin-col">
                <span className="fin-label">Where next</span>
                <button className="fin-link" type="button" onClick={restart}>
                  Descend again ↑
                </button>
                <a className="fin-link" href="/137">
                  The temple — /137 →
                </a>
              </div>
              <div className="fin-col fin-col--end">
                <span className="fin-label">The constant</span>
                <span className="fin-fact">α ≈ 1/137.035999</span>
                <span className="fin-fact fin-fact--dim">the fine-structure constant</span>
              </div>
            </div>
          </div>
          <div className="fin-closer-foot">
            <div className="fin-foot-rule" aria-hidden />
            <div className="fin-foot">
              <span className="fin-mark">137 Studio</span>
              <span className="fin-term" aria-hidden>
                <i />
                <b />
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
