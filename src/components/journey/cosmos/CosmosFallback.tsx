'use client';

// cosmos/CosmosFallback.tsx — OWNED BY COSMOS agent.
// The designed 2D cosmos for mobile / no-WebGL / reduced-motion.
//
// This is not a fallback list — it is the same journey, art-directed for one
// column. Three decisions carry it:
//
// 1. ONE COLUMN, TWO TREATMENTS. Every caption starts on the same vertical —
//    the gutter — and never moves. Every third work breaks LEFT past that
//    gutter to the screen edge (full bleed); the rest are inset plates at 66%
//    of the measure. Two treatments, each internally exact: no image ever
//    lands on an arbitrary margin. Scrolling registers a rhythm (plate, plate,
//    BLEED) instead of a stack of identical rectangles.
//
// 2. THE BAND IS MEASURED IN SCROLL, NOT IN PAGE HEIGHT. `top`/`height` were
//    percentages of the 700vh track, but journey progress is measured against
//    (scrollHeight − innerHeight). The two differ by a whole viewport, so the
//    section sat ~1.5 screens lower than its phase and ran ~1.5 screens past
//    it: that is what left dead air above the chapter plate at 17%, and what
//    printed the gallery underneath the contraction sigil at 67%. Both edges
//    are now derived from the real scroll range (600vh), so the plate lands
//    exactly at cosmos.start and the last work clears the frame exactly at
//    contraction.start — before the sigil draws.
//
// 3. THE CAPTION NEVER ORPHANS A WORD. The metadata is broken deliberately at
//    the support ("acrylic, spray paint, and marker" / "on canvas · 2024 ·
//    sold") rather than left to wrap, which was stranding '2024' and 'SOLD'
//    alone on a right-aligned second line.

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { useJourney } from '../JourneyContext';
import { PHASES, JOURNEY_HEIGHT_VH, clamp01 } from '../journey-utils';
import { artworks, featuredWorks } from '@/lib/works';

const START = PHASES.cosmos.start; // 0.18
const END = PHASES.contraction.start; // 0.62 — the sigil owns everything after

/** Scrollable range of the journey, in vh. Progress is measured against this. */
const TRACK_VH = JOURNEY_HEIGHT_VH - 100; // 600vh

/** Works the phone gets. Six large is a gallery; ten small is a contact sheet. */
const SHOWN = featuredWorks.slice(0, 6);

const CHALK = '#e8e4dc';
const FADED = '#a09890';
const RED = '#c41230';
const MONO = "'JetBrains Mono', monospace";
const SERIF = "'Cormorant Garamond', Georgia, serif";

/**
 * "Acrylic, spray paint, and marker on canvas"
 *   → ["Acrylic, spray paint, and marker", "on canvas"]
 * A deliberate two-line label instead of a wrap that orphans one token.
 */
function splitMedium(medium: string): [string, string] {
  const i = medium.lastIndexOf(' on ');
  if (i < 0) return [medium, ''];
  return [medium.slice(0, i), medium.slice(i + 1)];
}

const CSS = `
.fb-root {
  --fb-g: 25px;
  --fb-rail: 55px;
  --fb-col: min(calc(100% - var(--fb-rail)), 620px);
}
.fb-plate {
  width: var(--fb-col);
  padding-left: var(--fb-g);
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 13px;
}
.fb-chapter {
  font-family: ${MONO};
  font-size: 0.62rem;
  font-weight: 300;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  color: ${FADED};
  display: flex;
  align-items: center;
  gap: 13px;
}
.fb-chapter i {
  display: block;
  width: 55px;
  height: 1px;
  background: rgba(196, 18, 48, 0.62);
}
.fb-plate h2 {
  margin: 0;
  font-family: ${SERIF};
  font-weight: 300;
  font-size: 15vw;
  line-height: 0.92;
  letter-spacing: -0.012em;
  color: ${CHALK};
}
.fb-plate-meta {
  font-family: ${MONO};
  font-size: 0.58rem;
  font-weight: 300;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: ${FADED};
}

.fb-fig {
  margin: 0;
  width: var(--fb-col);
  cursor: pointer;
}
.fb-img {
  display: block;
  height: auto;
  filter: saturate(0.94);
}
/* inset plate — starts on the caption's vertical, 66% of the measure */
.fb-fig--inset .fb-img {
  width: 66%;
  margin-left: var(--fb-g);
}
/* every third work breaks the gutter and runs to the screen edge */
.fb-fig--bleed .fb-img {
  width: 100%;
  margin-left: 0;
}
.fb-cap {
  margin-left: var(--fb-g);
  margin-top: 13px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 5px;
}
.fb-cap-rule {
  display: block;
  width: 21px;
  height: 1px;
  background: ${RED};
  margin-bottom: 3px;
}
.fb-title {
  font-family: ${MONO};
  font-size: 0.7rem;
  font-weight: 400;
  color: ${CHALK};
  letter-spacing: 0.16em;
  text-transform: uppercase;
}
.fb-meta {
  font-family: ${MONO};
  font-size: 0.55rem;
  font-weight: 300;
  color: ${FADED};
  letter-spacing: 0.13em;
  text-transform: uppercase;
  white-space: nowrap;
}

/* Wide viewports only reach this component through reduced-motion / no-WebGL;
   cap the plates by height there so the column does not become a tower. */
@media (min-width: 768px) {
  .fb-plate h2 { font-size: 6vw; }
  .fb-img { width: auto; max-width: 100%; max-height: 34vh; }
  .fb-fig--bleed .fb-img { max-height: 48vh; }
}
`;

/**
 * The band is taller than its phase by one viewport (it has to be — an element
 * is only fully on screen once its top has travelled a screen's height), so its
 * head and tail poke into the DIVE above and the CONTRACTION below. Gate it on
 * scroll: the gallery surfaces as the veil finishes parting and is gone before
 * the sigil draws, so neither boundary shows two chapters at once.
 */
const FADE_IN: [number, number] = [0.138, 0.176];
const FADE_OUT: [number, number] = [0.604, 0.628];

export function CosmosFallback() {
  const { setSelectedWork } = useJourney();
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    let shown: boolean | null = null;
    let last = -1;
    let maxScroll = 1;
    let age = 999;
    const ease = (t: number) => t * t * (3 - 2 * t);
    const win = (p: number, a: number, b: number) => ease(clamp01((p - a) / (b - a)));

    const update = () => {
      if (age++ > 30) {
        age = 0;
        maxScroll = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
      }
      const p = clamp01(window.scrollY / maxScroll);
      const o = win(p, FADE_IN[0], FADE_IN[1]) * (1 - win(p, FADE_OUT[0], FADE_OUT[1]));
      if (Math.abs(o - last) < 0.002) return;
      last = o;
      el.style.opacity = o.toFixed(4);
      const live = o > 0.003;
      if (live !== shown) {
        el.style.visibility = live ? 'visible' : 'hidden';
        shown = live;
      }
    };

    gsap.ticker.add(update);
    return () => gsap.ticker.remove(update);
  }, []);

  return (
    <section
      ref={rootRef}
      className="fb-root"
      data-phase="cosmos-fallback"
      style={{
        opacity: 0,
        visibility: 'hidden',
        position: 'absolute',
        // derived from the SCROLL range, so the band matches its phase exactly
        top: `${(START * TRACK_VH).toFixed(2)}vh`,
        height: `${((END - START) * TRACK_VH + 100).toFixed(2)}vh`,
        left: 0,
        width: '100%',
        zIndex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        paddingTop: 'clamp(34px, 9vh, 89px)',
        paddingBottom: 'clamp(34px, 9vh, 89px)',
        boxSizing: 'border-box',
      }}
    >
      <style>{CSS}</style>

      {/* Chapter plate — the band opens on a title page, not on a stray label. */}
      <header className="fb-plate">
        <span className="fb-chapter">
          <i aria-hidden />
          03 / The Cosmos
        </span>
        <h2>The work</h2>
        <span className="fb-plate-meta">
          {String(SHOWN.length).padStart(2, '0')} selected · {artworks.length} in the archive
        </span>
      </header>

      {SHOWN.map((work, i) => {
        const bleed = i % 3 === 0;
        const [materials, support] = splitMedium(work.medium);
        return (
          <figure
            key={work.id}
            className={`fb-fig ${bleed ? 'fb-fig--bleed' : 'fb-fig--inset'}`}
            onClick={() => setSelectedWork(work.id)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="fb-img"
              src={work.file}
              alt={work.altText}
              loading="lazy"
              decoding="async"
            />
            <figcaption className="fb-cap">
              <i className="fb-cap-rule" aria-hidden />
              <span className="fb-title">
                {String(i + 1).padStart(2, '0')} — {work.title}
              </span>
              <span className="fb-meta">{materials}</span>
              <span className="fb-meta">
                {support ? `${support} · ` : ''}
                {work.year}
                {work.status === 'sold' ? ' · sold' : ''}
              </span>
            </figcaption>
          </figure>
        );
      })}
    </section>
  );
}
