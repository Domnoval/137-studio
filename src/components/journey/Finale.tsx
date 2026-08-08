'use client';

// OWNED BY FINALE agent.
// RETURN (78–100%) — the biggest, quietest movement on the site.
//
// The return is PINNED, not flowed. The section reserves 22% of the scroll
// track; inside it a fixed full-viewport stage crossfades five composed
// frames, each of which owns the whole viewport:
//
//   01  Perception is choice.        ┐  four philosophy moments, Cormorant
//   02  Choices change experience.   │  Garamond 300 at 7vw / 12vw mobile,
//   03  Experience is the point.     │  set on a fixed editorial grid with a
//   04  Love is the answer.          ┘  mono index and a red rule above.
//   ——  the closer: name, contact, the next action, the 137 whisper.
//
// Timing is scrubbed from RAW scroll depth (Lenis already smooths the scroll;
// the context's extra per-frame lerp is frame-rate dependent and would strand
// the last lines past the end of the track on a slow machine). The fourth line
// has fully landed by ~91% and the closer owns the final 8% — so 100% is the
// closer, reachable and clickable, never an orphan.
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

const LINES = [
  'Perception is choice.',
  'Choices change experience.',
  'Experience is the point.',
  'Love is the answer.',
];

/** [fade-in start, fade-in end, fade-out start, fade-out end] in return-phase time. */
const CUES: [number, number, number, number][] = [
  // Butt-jointed, with SHORT ramps. The lines occupy the same optical position,
  // so any overlap ghosts one line through another; instead each hands straight
  // over to the next, and the in/out ramps are kept tight (and the blur light,
  // below) so the reader is never looking at a smear for long.
  [0.06, 0.11, 0.215, 0.245], // 01
  [0.245, 0.295, 0.38, 0.41], // 02
  [0.41, 0.46, 0.515, 0.545], // 03
  [0.545, 0.595, 0.7, 0.735], // 04 — fully landed at ~90.4% of the journey
  [0.735, 0.805, 2, 2], // the closer — owns 92→100% and stays
];

const CSS = `
.fin-stage {
  position: fixed;
  inset: 0;
  z-index: 2;
  visibility: hidden;
  pointer-events: none;
}
.fin-frame {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 0 clamp(24px, 10vw, 190px);
  box-sizing: border-box;
  opacity: 0;
  will-change: opacity, transform, filter;
}
.fin-index {
  font-family: ${MONO};
  font-weight: 300;
  font-size: 0.62rem;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  color: ${FADED};
  margin: 0 0 21px;
  display: flex;
  align-items: center;
  gap: 21px;
}
.fin-index::after {
  content: '';
  flex: 0 0 89px;
  height: 1px;
  background: rgba(196, 18, 48, 0.55);
}
.fin-say {
  margin: 0;
  font-family: ${SERIF};
  font-weight: 300;
  font-size: 7.6vw;
  line-height: 1.02;
  letter-spacing: -0.005em;
  color: ${CHALK};
  max-width: 13em;
}

/* ---- the closer ---- */
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
  font-size: clamp(2rem, 4.2vw, 4.2rem);
  line-height: 1;
  letter-spacing: 0.005em;
  color: ${CHALK};
}
.fin-rule {
  height: 1px;
  width: 100%;
  background: rgba(232, 228, 220, 0.16);
  margin-bottom: 34px;
}
.fin-cols {
  display: flex;
  gap: 55px;
  flex-wrap: wrap;
}
.fin-col {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 13px;
  min-width: 240px;
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
.fin-whisper {
  margin-top: 55px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 13px;
}
.fin-whisper i {
  display: block;
  width: 1px;
  height: 34px;
  background: rgba(196, 18, 48, 0.45);
}
.fin-whisper span {
  font-family: ${CINZEL};
  font-weight: 400;
  font-size: 0.78rem;
  letter-spacing: 0.45em;
  padding-left: 0.45em;
  text-transform: uppercase;
  color: ${FADED};
  opacity: 0.75;
}

@media (max-width: 767px) {
  .fin-frame { padding: 0 clamp(21px, 7vw, 55px); }
  .fin-say { font-size: 13.5vw; max-width: 9em; }
  .fin-name { font-size: 9vw; margin-bottom: 26px; }
  .fin-cols { gap: 34px; }
  .fin-col { min-width: 0; }
  .fin-whisper { margin-top: 42px; }
}
`;

export function Finale() {
  const { reducedMotion } = useJourney();
  const stageRef = useRef<HTMLDivElement>(null);
  const frameRefs = useRef<(HTMLDivElement | null)[]>([]);
  const { start, end } = PHASES.return;

  const setFrame = (i: number) => (el: HTMLDivElement | null) => {
    frameRefs.current[i] = el;
  };

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const frames = frameRefs.current;
    let stageShown: boolean | null = null;
    let interactive: boolean | null = null;
    let maxScroll = 1;
    let age = 999;

    const raw = (): number => {
      if (age++ > 30) {
        age = 0;
        maxScroll = Math.max(
          document.documentElement.scrollHeight - window.innerHeight,
          1,
        );
      }
      return clamp01(window.scrollY / maxScroll);
    };

    const smooth = (t: number) => t * t * (3 - 2 * t);
    const span = end - start;

    const update = () => {
      const p = raw();
      const r = (p - start) / span;

      const live = r > -0.03;
      if (live !== stageShown) {
        stage.style.visibility = live ? 'visible' : 'hidden';
        stageShown = live;
      }
      if (!live) return;

      let closerOpacity = 0;
      for (let i = 0; i < CUES.length; i++) {
        const el = frames[i];
        if (!el) continue;
        const [a, b, c, d] = CUES[i];
        const tin = clamp01((r - a) / (b - a));
        const tout = clamp01((r - c) / (d - c));
        const o = smooth(tin) * (1 - smooth(tout));
        if (i === CUES.length - 1) closerOpacity = o;
        el.style.opacity = o.toFixed(4);
        if (reducedMotion) {
          el.style.transform = 'none';
          el.style.filter = 'none';
        } else {
          const y = (1 - smooth(tin)) * 34 - smooth(tout) * 26;
          // light: a philosophy line caught mid-transition must still read as
          // type, not as a smear (9px/7px turned every handover into fog)
          const blur = (1 - smooth(tin)) * 3.8 + smooth(tout) * 3.2;
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
    return () => gsap.ticker.remove(update);
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
        {LINES.map((line, i) => (
          <div className="fin-frame" key={line} ref={setFrame(i)}>
            <p className="fin-index" aria-hidden>
              {String(i + 1).padStart(2, '0')} / 04
            </p>
            <p className="fin-say">{line}</p>
          </div>
        ))}

        {/* The closer — contact, the next action, the whisper. */}
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
            </div>
            <div className="fin-whisper">
              <i aria-hidden />
              <span>137 Studio</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
