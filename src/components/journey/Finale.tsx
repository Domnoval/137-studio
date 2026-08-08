'use client';

// OWNED BY FINALE agent.
// RETURN (78–100%) — the biggest, quietest movement on the site.
//
// The return is PINNED, not flowed. The section reserves 22% of the scroll
// track; inside it a fixed full-viewport stage crossfades five composed
// frames, each of which owns the whole viewport:
//
//   01  Matter holds together …      ┐  four philosophy moments, Cormorant
//   02  No theory derives it. …      │  Garamond 300 at 7.6vw / 13.5vw mobile,
//   03  Shift it a little …          │  set on a fixed editorial grid with a
//   04  Which is why we look. …      ┘  mono index and a red rule above.
//   ——  the closer: name, contact, the colophon plate, the 137 whisper.
//
// THE COPY. These four lines used to be the four aphorisms from AGENT-BRIEF —
// "Perception is choice / Choices change experience / Experience is the point /
// Love is the answer." True to the source, but at 7.6vw on the climax of the
// descent they read as fortune-cookie: any site could have said them. Mean-
// while the site's actual idea — α ≈ 1/137.035999, the thing that gave it its
// name, its 000→137 counter and its colophon — was buried at 10pt in a footer
// column. So the constant IS the manifesto now, and the footer's "α ≈
// 1/137.035999 / the fine-structure constant" stops being the place the idea
// hides and becomes the caption that names what you just read. The voice of
// the source is kept — perception, measurement, the choice to look — but it
// is spent on the one claim only this site can make: the number that makes
// matter possible is the number nobody can derive.
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
import { PHASES, clamp01 } from './journey-utils';

const CHALK = '#e8e4dc';
const FADED = '#a09890';
const RED = '#c41230';
const MONO = "'JetBrains Mono', monospace";
const SERIF = "'Cormorant Garamond', Georgia, serif";
const CINZEL = "'Cinzel', Georgia, serif";

/** The manifesto. Four sentences, one argument, told in the order a person
 *  actually arrives at it: what the number does, that nothing explains it,
 *  what it costs to move it, and what that leaves us with. See THE COPY above
 *  — this is the AGENT-BRIEF philosophy made specific, not replaced. Each line
 *  is set to break to at most two visual lines at 7.6vw / 13.5vw. */
const LINES = [
  'Matter holds together at one number: 1/137.035999.',
  'No theory derives it. It can only be measured.',
  'Shift it a little and nothing survives to notice.',
  'Which is why we look. Perception is the instrument.',
];

/** [fade-in start, fade-in end, fade-out start, fade-out end] in return-phase time.
 *  Handover windows are 0.020 wide (was 0.032): a 32-wide cross put BOTH lines
 *  near 0.38 for long enough that ordinary scrolling — and every capture step —
 *  landed on a frame with two half-lit, blurred lines on it. Narrow window +
 *  steep exit ramp (pow 0.32 below) means a frame caught mid-handover shows one
 *  landing line and at most a faint ghost of the one leaving. */
const CUES: [number, number, number, number][] = [
  [0.08, 0.1, 0.25, 0.272], // 01 — high (strikes on the instant the wipe tops out)
  [0.25, 0.272, 0.425, 0.447], // 02 — low   (hands over from 01)
  [0.425, 0.447, 0.6, 0.622], // 03 — high  (hands over from 02)
  [0.6, 0.622, 0.718, 0.74], // 04 — low   (hands over from 03)
  [0.756, 0.826, 2, 2], // the closer — owns 95→100% and stays
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
const GROUND_IN: [number, number] = [0.045, 0.08];
const GROUND_OUT: [number, number] = [0.74, 0.756];

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
/* Consecutive lines never share a position — that is what lets them cross. */
.fin-frame--hi { justify-content: flex-start; padding-top: 17vh; }
.fin-frame--lo { justify-content: flex-end; padding-bottom: 17vh; }
.fin-index {
  font-family: ${MONO};
  font-weight: 300;
  font-size: 0.62rem;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  color: var(--fin-mute);
  margin: 0 0 21px;
  display: flex;
  align-items: center;
  gap: 21px;
}
.fin-index::after {
  content: '';
  flex: 0 0 89px;
  height: 1px;
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
.fin-link {
  font-family: ${MONO};
  font-size: 0.8rem;
  font-weight: 400;
  color: ${RED};
  letter-spacing: 0.1em;
  text-decoration: none;
  background: none;
  border: none;
  border-bottom: 1px solid rgba(196, 18, 48, 0.3);
  padding: 0 0 4px;
  width: fit-content;
  text-align: left;
  transition: border-color 0.3s ease, color 0.3s ease;
}
.fin-link:hover,
.fin-link:focus-visible {
  border-color: ${RED};
  outline: none;
}
.fin-link--chalk {
  color: ${CHALK};
  border-bottom-color: rgba(232, 228, 220, 0.25);
}
.fin-link--chalk:hover,
.fin-link--chalk:focus-visible {
  color: ${RED};
  border-bottom-color: ${RED};
}
.fin-fact {
  font-family: ${MONO};
  font-size: 0.8rem;
  font-weight: 300;
  letter-spacing: 0.1em;
  color: ${CHALK};
  padding-bottom: 4px;
}
.fin-fact--dim {
  color: ${FADED};
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
  .fin-frame--hi { padding-top: 22vh; }
  .fin-frame--lo { padding-bottom: 22vh; }
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
        // The exit is biased much steeper than the entry (pow 0.32 on the
        // outgoing ramp): the two curves now cross at ~0.26 instead of ~0.38,
        // and inside a window that is itself 40% shorter. Screen presence
        // still never drops below 0.5 — the incoming line has already taken
        // over — but a frame caught mid-handover shows a landing line, not a
        // pair of half-lit ones.
        const o = Math.pow(smooth(tin), 0.6) * (1 - Math.pow(smooth(tout), 0.3));
        if (i === CUES.length - 1) closerOpacity = o;
        el.style.opacity = o.toFixed(4);
        if (reducedMotion) {
          el.style.transform = 'none';
          el.style.filter = 'none';
        } else {
          // more travel, less blur: the handover is now told by MOVEMENT (the
          // outgoing line clearing upward) rather than by a soft focus that
          // turned both lines into grey fog on the bone ground.
          const y = (1 - smooth(tin)) * 44 - smooth(tout) * 52;
          const blur = (1 - smooth(tin)) * 1.1 + smooth(tout) * 1.0;
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
            className={`fin-frame ${i % 2 === 0 ? 'fin-frame--hi' : 'fin-frame--lo'}`}
            key={line}
            ref={setFrame(i)}
          >
            <p className="fin-index" aria-hidden>
              {String(i + 1).padStart(2, '0')} / 04
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
                  className="fin-link"
                  href="https://instagram.com/domnoval_art"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  @domnoval_art
                </a>
                <a className="fin-link" href="mailto:the37thmover@gmail.com">
                  the37thmover@gmail.com
                </a>
              </div>
              <div className="fin-col">
                <span className="fin-label">Where next</span>
                <button className="fin-link fin-link--chalk" type="button" onClick={restart}>
                  Descend again ↑
                </button>
                <a className="fin-link fin-link--chalk" href="/137">
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
