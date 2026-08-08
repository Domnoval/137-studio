'use client';

// cosmos/CosmosFallback.tsx — OWNED BY COSMOS agent.
// The designed 2D cosmos for mobile / no-WebGL / reduced-motion.
//
// This is not a fallback list — it is the same journey, art-directed for one
// column. Four decisions carry it:
//
// 1. FOUR VERTICALS, AND EVERY EDGE LANDS ON ONE OF THEM.
//    The old layout ran bleed images 0 → 335 while captions started at 28: the
//    plate bled off the left edge but stopped 27px short of the right, and
//    neither terminus aligned to anything. The grid is now explicit:
//      V0 = 0                       the true viewport edge (bleed plates)
//      V1 = 24px                    type, and the inset plates' left
//      V2 = V1 + φ⁻¹·(V3−V1)        the inset plates' right terminus
//      V3 = 100% − 55px             THE TERMINUS. The HUD rail reserves the
//                                   right 55px on a phone (measured: its fixed
//                                   container spans x=335→390), and nothing may
//                                   ever collide with the rail — so the site's
//                                   right-hand grid line IS the rail's gutter.
//    Bleed plates run V0→V3 and their captions V1→V3; inset plates run V1→V2
//    and their captions V1→V2. Image right edge and caption right edge are the
//    same vertical in both treatments, and the caption's index sits flush on
//    it, so the alignment is stated rather than implied.
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
// 3. THE PHONE GETS ITS OWN DEPTH DEVICE, not a flattened copy of the dive.
//    There is no camera here, so the parallax IS the camera: plate and caption
//    move at different rates against the scroll (they separate and re-converge),
//    the plate's crop TIGHTENS as it reaches the middle of the frame (a scale
//    inside a clipped frame — you pass through it, you do not scroll past it),
//    and its luminance comes up out of the dark on approach and falls back as
//    it leaves. Distance is expressed as light and rate, exactly as it is in
//    the 3D corridor. Disabled wholesale under prefers-reduced-motion.
//
// 4. THE CAPTION NEVER ORPHANS A WORD. The metadata is broken deliberately at
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
  /* the grid — see the header note. V1 = --fb-gut, V3 = 100% - --fb-rail. */
  --fb-gut: 24px;
  --fb-rail: 55px;
  --fb-measure: calc(100% - var(--fb-rail));
  --fb-type: calc(100% - var(--fb-rail) - var(--fb-gut));
  --fb-inset: calc(0.618 * (100% - var(--fb-rail) - var(--fb-gut)));
}
.fb-plate {
  width: 100%;
  padding-left: var(--fb-gut);
  padding-right: var(--fb-rail);
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
  width: 100%;
  cursor: pointer;
}
/* the frame CLIPS: the plate scales inside it as it reaches the middle of the
   viewport, so the crop tightens on approach instead of the layout reflowing */
.fb-frame {
  overflow: hidden;
  display: block;
}
.fb-img {
  display: block;
  width: 100%;
  height: auto;
  filter: saturate(0.94);
  will-change: transform, filter;
}
/* inset plate — V1 → V2 */
.fb-fig--inset .fb-frame,
.fb-fig--inset .fb-cap {
  margin-left: var(--fb-gut);
  width: var(--fb-inset);
}
/* every third work runs from the true viewport edge to the terminus */
.fb-fig--bleed .fb-frame {
  margin-left: 0;
  width: var(--fb-measure);
}
.fb-fig--bleed .fb-cap {
  margin-left: var(--fb-gut);
  width: var(--fb-type);
}
.fb-cap {
  margin-top: 13px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 5px;
  will-change: transform, opacity;
}
.fb-cap-rule {
  display: block;
  width: 21px;
  height: 1px;
  background: ${RED};
  margin-bottom: 3px;
}
/* title flush left on V1, index flush right on the plate's own terminus:
   the grid is stated by the type, not merely obeyed by it */
.fb-cap-head {
  width: 100%;
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 13px;
}
.fb-title {
  font-family: ${MONO};
  font-size: 0.7rem;
  font-weight: 400;
  color: ${CHALK};
  letter-spacing: 0.16em;
  text-transform: uppercase;
}
.fb-idx {
  font-family: ${MONO};
  font-size: 0.55rem;
  font-weight: 300;
  color: ${FADED};
  letter-spacing: 0.16em;
  white-space: nowrap;
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
  .fb-root { --fb-gut: 56px; --fb-rail: 104px; }
  .fb-plate h2 { font-size: 6vw; }
  .fb-frame { max-height: 34vh; }
  .fb-fig--bleed .fb-frame { max-height: 48vh; }
}

@media (prefers-reduced-motion: reduce) {
  .fb-img, .fb-cap { transform: none !important; filter: saturate(0.94) !important; }
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

interface Plate {
  img: HTMLImageElement;
  cap: HTMLElement;
}

export function CosmosFallback() {
  const { setSelectedWork, reducedMotion } = useJourney();
  const rootRef = useRef<HTMLElement>(null);
  const platesRef = useRef<(Plate | null)[]>([]);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    let shown: boolean | null = null;
    let last = -1;
    let maxScroll = 1;
    let age = 999;
    const ease = (t: number) => t * t * (3 - 2 * t);
    const win = (p: number, a: number, b: number) => ease(clamp01((p - a) / (b - a)));

    /**
     * THE PHONE'S CAMERA.
     * Each plate reports where it sits relative to the middle of the viewport;
     * that single number drives three separated channels — rate (plate and
     * caption travel at different speeds, so they part and re-converge), crop
     * (the plate scales inside a clipping frame, tightening as it passes), and
     * light (it comes up out of the dark on approach and falls back after).
     * Together they read as depth rather than as a list scrolling by.
     */
    const depth = () => {
      const vh = window.innerHeight;
      const plates = platesRef.current;
      for (let i = 0; i < plates.length; i++) {
        const pl = plates[i];
        if (!pl || !pl.img || !pl.cap) continue;
        const r = pl.img.getBoundingClientRect();
        if (r.bottom < -vh * 0.5 || r.top > vh * 1.5) continue;
        // −0.5 (leaving, above) → 0 (dead centre) → +0.5 (arriving, below)
        const c = Math.max(-1, Math.min(1, (r.top + r.height / 2 - vh / 2) / vh));
        const near = 1 - Math.min(1, Math.abs(c) / 0.62);
        const approach = near * near * (3 - 2 * near);
        pl.img.style.transform = `translate3d(0, ${(c * -34).toFixed(2)}px, 0) scale(${(
          1 + approach * 0.085
        ).toFixed(4)})`;
        pl.img.style.filter = `saturate(0.94) brightness(${(0.6 + approach * 0.4).toFixed(3)})`;
        pl.cap.style.transform = `translate3d(0, ${(c * 30).toFixed(2)}px, 0)`;
        pl.cap.style.opacity = (0.22 + approach * 0.78).toFixed(3);
      }
    };

    const update = () => {
      if (age++ > 30) {
        age = 0;
        maxScroll = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
      }
      const p = clamp01(window.scrollY / maxScroll);
      const o = win(p, FADE_IN[0], FADE_IN[1]) * (1 - win(p, FADE_OUT[0], FADE_OUT[1]));
      const live = o > 0.003;
      if (live && !reducedMotion) depth();
      if (Math.abs(o - last) < 0.002) return;
      last = o;
      el.style.opacity = o.toFixed(4);
      if (live !== shown) {
        el.style.visibility = live ? 'visible' : 'hidden';
        shown = live;
      }
    };

    gsap.ticker.add(update);
    return () => gsap.ticker.remove(update);
  }, [reducedMotion]);

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
            <span className="fb-frame">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className="fb-img"
                src={work.file}
                alt={work.altText}
                loading="lazy"
                decoding="async"
                ref={(node) => {
                  const slot = (platesRef.current[i] ??= { img: null!, cap: null! });
                  slot.img = node!;
                }}
              />
            </span>
            <figcaption
              className="fb-cap"
              ref={(node) => {
                const slot = (platesRef.current[i] ??= { img: null!, cap: null! });
                slot.cap = node!;
              }}
            >
              <i className="fb-cap-rule" aria-hidden />
              <span className="fb-cap-head">
                <span className="fb-title">{work.title}</span>
                <span className="fb-idx">
                  {String(i + 1).padStart(2, '0')}/{String(SHOWN.length).padStart(2, '0')}
                </span>
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
