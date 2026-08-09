'use client';

// cosmos/CosmosFallback.tsx — OWNED BY COSMOS agent.
// The designed 2D cosmos for mobile / no-WebGL / reduced-motion.
//
// This is not a fallback list — it is the same journey, art-directed for one
// column. Five decisions carry it:
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
//    Bleed plates run V0→V3, inset plates V1→V2, and ON THE PHONE every
//    caption runs V1→V3 regardless: the images alternate between the two
//    treatments, the type column does not move, and the caption's index sits
//    flush on the page's own terminus every time. (Above 768px, where this
//    component is only reached through reduced-motion / no-WebGL, the caption
//    still follows its plate — there is room for it to.)
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
// 3. THE PHONE GETS A REAL CAMERA, not a flattened copy of the dive.
//    The corridor is not simulated with opacity here — each plate lives in its
//    own CSS perspective and is genuinely translated in Z. Five channels, all
//    driven by ONE number (where the plate sits relative to the middle of the
//    viewport):
//      Z      −620px when it is a screen away, 0 at the centre. With
//             perspective: 760px that is 0.55× → 1.00×: the work comes up the
//             corridor, reaches full size exactly as it passes, and recedes.
//      RAKE   rotateX tracks the same number THROUGH ZERO: a plate below the
//             middle is seen from above, a plate above it from below, and the
//             sign flips as it goes by. That flip is what makes it a pass
//             rather than a zoom.
//      RATE   plate and caption travel at different speeds against the scroll,
//             so they separate on approach and re-converge at the centre.
//      CROP   the image scales inside its clipping frame, so the framing
//             tightens as the work goes by — you pass through it.
//      LIGHT  atmospheric perspective: luminance and saturation both fall off
//             with distance, exactly as they do down the 3D corridor.
//    THE RAIL IS INVIOLABLE, BY CONSTRUCTION: Z never goes positive, so the
//    projected scale never exceeds 1.00 and no plate can grow past its own
//    layout box into the HUD's 55px reserve. Disabled wholesale under
//    prefers-reduced-motion.
//
// 4. THE PHONE HAS ITS OWN TYPE SCALE. Every tier was inherited from the
//    desktop caption system, which put the metadata at 0.55rem — 8.8px on a
//    390px screen, a size that exists on a 27" monitor and does not exist in a
//    hand. The mobile block below re-sets every tier against the phone
//    (metadata 10.9px, title 13.8px, chapter 10.9px) and opens the line
//    spacing to match. Nothing else about the caption grammar changes.
//
// 5. THE CAPTION NEVER ORPHANS A WORD. The metadata is broken deliberately at
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

/* each work owns its own lens — perspective-origin at the figure's own centre,
   so the Z travel is a pure approach and never a lateral drift */
.fb-fig {
  margin: 0;
  width: 100%;
  cursor: pointer;
  perspective: 760px;
  perspective-origin: 50% 50%;
}
/* the frame CLIPS, and it is the thing that travels in Z. Z is never positive,
   so the projected width never exceeds the layout box and the HUD rail's
   reserve can never be reached. */
.fb-frame {
  overflow: hidden;
  display: block;
  transform-origin: 50% 50%;
  will-change: transform;
  backface-visibility: hidden;
}
/* …and the image scales INSIDE it, so the crop tightens as the work goes by */
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

/* ---- THE PHONE'S OWN TYPE SCALE ----------------------------------------
   Not the desktop caption system shrunk: re-set against a 390px screen. The
   metadata tier was 0.55rem = 8.8px, which is a size that only exists on a
   large monitor. Every tier moves up one step and the leading opens with it.
   The grammar — crimson rule, tracked mono title, medium · year · index — is
   untouched; only the scale is the phone's. */
@media (max-width: 767px) {
  .fb-chapter { font-size: 0.68rem; letter-spacing: 0.26em; gap: 10px; }
  .fb-chapter i { width: 44px; }
  .fb-plate-meta { font-size: 0.66rem; letter-spacing: 0.16em; line-height: 1.5; }
  /* ONE TYPE MEASURE. On a 390px column the caption cannot also be as narrow
     as the φ inset — "Ultraviolet Beast" at a legible size does not fit in
     192px and breaks across the index. So on the phone every caption runs the
     full type measure V1→V3 and terminates on the page's own right-hand grid
     line: the images alternate between the two treatments, the type column
     does not move. It is a stronger statement of the grid, not a weaker one. */
  .fb-fig--inset .fb-cap { width: var(--fb-type); }
  .fb-cap { gap: 6px; }
  .fb-title { font-size: 0.86rem; letter-spacing: 0.14em; }
  .fb-idx { font-size: 0.68rem; }
  .fb-meta { font-size: 0.68rem; letter-spacing: 0.11em; line-height: 1.35; }
  .fb-cap-rule { width: 26px; }
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
  .fb-fig { perspective: none; }
  .fb-img, .fb-cap, .fb-frame { transform: none !important; filter: saturate(0.94) !important; }
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
  frame: HTMLElement;
}

/* ------------------------------------------------------- the phone's camera */
/** Depth a plate has receded to when it is one viewport from the middle.
 *  Against the CSS lens (perspective: 760px) that is 760/(760+620) = 0.551×.
 *  The same order of size falloff a slab has at the far end of the corridor. */
const FAR_Z = -620;
/** Rake at full distance, degrees. Signed by side, so it flips at the pass. */
const RAKE = 11;

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
        if (!pl || !pl.img || !pl.cap || !pl.frame) continue;
        const r = pl.frame.getBoundingClientRect();
        if (r.bottom < -vh * 0.5 || r.top > vh * 1.5) continue;
        // −1 (gone, above) → 0 (dead centre, passing) → +1 (a screen away, below)
        const c = Math.max(-1, Math.min(1, (r.top + r.height / 2 - vh / 2) / vh));
        const d = Math.abs(c);
        const near = 1 - Math.min(1, d / 0.62);
        const approach = near * near * (3 - 2 * near);

        // ---- Z: the corridor. Never positive, so the projected width can
        // never exceed the layout box and the HUD rail stays inviolable.
        const z = FAR_Z * Math.pow(d, 1.05);
        // ---- RAKE: signed by side and flipping THROUGH zero at the pass.
        // Eased out at the extremes so a far plate is not edge-on.
        const rake = -c * RAKE * (1 - d * 0.45);
        // ---- RATE: the plate runs ahead of the scroll, the caption behind it.
        pl.frame.style.transform =
          `translate3d(0, ${(c * -46).toFixed(2)}px, ${z.toFixed(1)}px) rotateX(${rake.toFixed(2)}deg)`;

        // ---- CROP: the framing tightens as the work goes by
        pl.img.style.transform = `scale(${(1 + approach * 0.14).toFixed(4)})`;
        // ---- LIGHT: atmospheric perspective — luminance AND colour fall off
        pl.img.style.filter = `saturate(${(0.6 + approach * 0.36).toFixed(3)}) brightness(${(
          0.44 + approach * 0.58
        ).toFixed(3)})`;

        // the caption stays flat (2D) so the metadata never rasterises soft —
        // its parallax is rate and opacity, not depth
        pl.cap.style.transform = `translate3d(0, ${(c * 26).toFixed(2)}px, 0)`;
        pl.cap.style.opacity = (0.18 + approach * 0.82).toFixed(3);
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
        // alternating, not every third: three plates run the full measure and
        // three sit on the φ inset, so the column has a stated rhythm rather
        // than one bleed every so often
        const bleed = i % 2 === 0;
        const [materials, support] = splitMedium(work.medium);
        return (
          <figure
            key={work.id}
            className={`fb-fig ${bleed ? 'fb-fig--bleed' : 'fb-fig--inset'}`}
            onClick={() => setSelectedWork(work.id)}
          >
            <span
              className="fb-frame"
              ref={(node) => {
                const slot = (platesRef.current[i] ??= { img: null!, cap: null!, frame: null! });
                slot.frame = node!;
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className="fb-img"
                src={work.file}
                alt={work.altText}
                loading="lazy"
                decoding="async"
                ref={(node) => {
                  const slot = (platesRef.current[i] ??= { img: null!, cap: null!, frame: null! });
                  slot.img = node!;
                }}
              />
            </span>
            <figcaption
              className="fb-cap"
              ref={(node) => {
                const slot = (platesRef.current[i] ??= { img: null!, cap: null!, frame: null! });
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
