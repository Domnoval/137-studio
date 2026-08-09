'use client';

// cosmos/CosmosFallback.tsx — OWNED BY COSMOS agent.
//
// THE COSMOS, ON A PHONE. Not a reduced site — the same site.
//
// What this replaced was a vertical card list: image, caption, gap, image,
// caption. It announced its own retreat in its subhead ("06 SELECTED · 15 IN
// THE ARCHIVE") and the entire spatial thesis of the chapter — the dive, the
// constellation, the contraction — was gone. A juror opens a site on a phone
// first, and on a phone that was a competent gallery template.
//
// This is a real dive, rebuilt for the thumb:
//
//   THE STAGE IS PINNED. The chapter is one fixed full-viewport lens (CSS
//   `perspective`), exactly as the desktop chapter is one fixed WebGL canvas.
//   Scroll does not move a column of cards past the eye; it moves the EYE
//   down a corridor. Nothing about the chapter is in document flow.
//
//   THE CAMERA IS THE SAME CAMERA. Its rate along the corridor is
//   descentCurve() — the identical WIDE / MACRO / PULL-BACK pacing profile the
//   desktop rig flies, so the phone accelerates and decelerates on the same
//   beats. Works stand on the golden-angle helix (137.508°), recede in Z, are
//   pulled onto the frame axis as they become the subject, swell, shear, blur
//   and pass the lens. Plate and caption run at different rates against the
//   scroll; the framing tightens on approach; luminance and saturation fall
//   off with depth; a starfield threads the corridor and travels with the rig.
//
//   THE ARCHIVE IS THE φ SPIRAL. The last movement resolves ALL FIFTEEN works
//   onto the curve published by cosmos-data — same slots, same radii
//   (r = e^{bθ}, b = ln φ / π), same golden-angle deal, and the curve itself is
//   drawn as a stroke underneath them, winding in from the outer arm. It is
//   the same figure the CONTRACTION then collapses, two beats later. The phone
//   shows 15 of 15: there is no "selected" subset and no sentence anywhere in
//   this component that describes the phone as having less.
//
//   THE PHONE HAS ITS OWN TYPE SCALE. Nothing is inherited from the desktop
//   caption system. Measured at 390px: chapter label 11.5px, chapter display
//   60px, caption title 15.2px, metadata 12px, index 12.8px. Nothing in this
//   chapter is under 11.5px on a phone.
//
//   THE RAIL IS INVIOLABLE. The HUD reserves the right 46px; the usable frame
//   is (vw − 46) and every centre, every extent and the archive's own fit are
//   solved against it.
//
//   REDUCED MOTION gets the stage frozen on the archive: the whole body of
//   work, composed on the spiral, held still. Elegant and static, not a list.

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { useJourney } from '../JourneyContext';
import { PHASES, clamp01, texPath } from '../journey-utils';
import { GLYPHS, SLABS } from './cosmos-data';
import {
  N,
  DUST_N,
  GLYPH_N,
  SPACING,
  buildDust,
  buildGlyphs,
  buildLayout,
  captionPresence,
  captionShift,
  dustAt,
  glyphAt,
  makeFrames,
  stageFrame,
  type DustSeed,
  type GlyphSeed,
  type MobileLayout,
  type WorkFrame,
} from './mobile-stage';

const START = PHASES.cosmos.start; // 0.18
const END = PHASES.contraction.start; // 0.62 — the sigil owns everything after

const CHALK = '#e8e4dc';
const FADED = '#a09890';
const RED = '#c41230';
const MONO = "'JetBrains Mono', monospace";
const SERIF = "'Cormorant Garamond', Georgia, serif";

/** The band surfaces as the veil finishes parting and is gone before the sigil draws. */
const FADE_IN: [number, number] = [0.138, 0.176];
// …and it leaves through the COLLAPSE. What used to happen here was the gallery
// dissolving in place at 10% opacity underneath the opening of the contraction —
// two chapters on screen at once, neither of them resolved. The band now holds
// until the figure has wound down into the throat, and what is still on screen
// as the sigil begins to draw is a knot of works disappearing into the point the
// sigil forms at. The overlap is the hand-off, not a residue.
const FADE_OUT: [number, number] = [0.601, 0.636];

const YEARS = SLABS.map((s) => s.work.year);
const Y0 = Math.min(...YEARS);
const Y1 = Math.max(...YEARS);
const SPAN = Y0 === Y1 ? `${Y0}` : `${Y0}–${Y1}`;
const NN = String(N).padStart(2, '0');

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
.ms-root {
  --ms-rail: 46px;
  --ms-gut: 24px;
  --ms-measure: calc(100% - var(--ms-rail) - var(--ms-gut));
}
.ms-space {
  position: absolute;
  inset: 0;
  perspective: 820px;
  perspective-origin: calc(50% - 23px) 50%;
  transform-style: flat;
}
.ms-work {
  position: absolute;
  left: 0;
  top: 0;
  margin: 0;
  overflow: hidden;
  transform-origin: 50% 50%;
  backface-visibility: hidden;
  will-change: transform, opacity;
  pointer-events: auto;
  cursor: pointer;
}
.ms-work img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.ms-dust {
  position: absolute;
  left: 0;
  top: 0;
  background: ${CHALK};
  border-radius: 50%;
}
.ms-glyph {
  position: absolute;
  left: 0;
  top: 0;
  font-family: ${MONO};
  font-size: 1.5rem;
  font-weight: 300;
  color: ${FADED};
  white-space: nowrap;
  transform-origin: 50% 50%;
  pointer-events: none;
}
/* the same restraint the 3D post-chain keeps: a vignette you notice only when
   it is gone */
.ms-vig {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: radial-gradient(120% 78% at 50% 50%, rgba(14,12,10,0) 42%, rgba(14,12,10,0.72) 100%);
}
.ms-curve {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
  pointer-events: none;
}

/* ---- the phone's own type scale. Nothing here is inherited. ---- */
.ms-chapter {
  font-family: ${MONO};
  font-size: 0.72rem;          /* 11.52px @390 */
  font-weight: 300;
  letter-spacing: 0.26em;
  text-transform: uppercase;
  color: ${FADED};
  display: flex;
  align-items: center;
  gap: 12px;
}
.ms-chapter i { display: block; width: 44px; height: 1px; background: rgba(196,18,48,0.62); }
.ms-plate h2 {
  margin: 0.32em 0 0;
  font-family: ${SERIF};
  font-weight: 300;
  font-size: 15.5vw;           /* 60.4px @390 */
  line-height: 0.9;
  letter-spacing: -0.014em;
  color: ${CHALK};
}
.ms-plate-meta {
  margin-top: 0.85em;
  display: block;
  font-family: ${MONO};
  font-size: 0.72rem;          /* 11.52px */
  font-weight: 300;
  letter-spacing: 0.17em;
  line-height: 1.55;
  text-transform: uppercase;
  color: ${FADED};
}
.ms-rule { display: block; width: 28px; height: 1px; background: ${RED}; }
.ms-cap-head {
  margin-top: 11px;
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 14px;
  width: 100%;
}
.ms-title {
  font-family: ${MONO};
  font-size: 0.95rem;          /* 15.2px */
  font-weight: 400;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: ${CHALK};
  line-height: 1.05;
}
.ms-idx {
  font-family: ${MONO};
  font-size: 0.8rem;           /* 12.8px */
  font-weight: 300;
  letter-spacing: 0.14em;
  color: ${FADED};
  white-space: nowrap;
}
.ms-meta {
  margin-top: 9px;
  display: block;
  font-family: ${MONO};
  font-size: 0.75rem;          /* 12px */
  font-weight: 300;
  letter-spacing: 0.12em;
  line-height: 1.45;
  text-transform: uppercase;
  color: ${FADED};
}
.ms-meta2 { margin-top: 2px; }
.ms-law { margin-top: 3px; text-transform: none; letter-spacing: 0.14em; }
.ms-arch h3 {
  margin: 0.28em 0 0;
  font-family: ${SERIF};
  font-weight: 300;
  font-size: 12.5vw;           /* 48.8px */
  line-height: 0.92;
  letter-spacing: -0.012em;
  color: ${CHALK};
}

/* Wide viewports reach this component only through no-WebGL / reduced-motion.
   The stage is identical; the type steps up to the room it has. */
@media (min-width: 768px) {
  .ms-root { --ms-rail: 96px; --ms-gut: 56px; }
  .ms-space { perspective-origin: calc(50% - 48px) 50%; }
  .ms-chapter { font-size: 0.78rem; letter-spacing: 0.3em; gap: 18px; }
  .ms-chapter i { width: 72px; }
  .ms-plate h2 { font-size: 6.4vw; }
  .ms-plate-meta { font-size: 0.78rem; }
  .ms-title { font-size: 1.05rem; letter-spacing: 0.18em; }
  .ms-idx { font-size: 0.82rem; }
  .ms-meta { font-size: 0.78rem; }
  .ms-arch h3 { font-size: 5.4vw; }
}
`;

export function CosmosFallback() {
  const { setSelectedWork, reducedMotion } = useJourney();
  const rootRef = useRef<HTMLElement>(null);
  const worksRef = useRef<(HTMLElement | null)[]>([]);
  const imgsRef = useRef<(HTMLImageElement | null)[]>([]);
  const dustRef = useRef<(HTMLElement | null)[]>([]);
  const glyphRef = useRef<(HTMLElement | null)[]>([]);
  const curveRef = useRef<SVGPathElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const plateRef = useRef<HTMLElement>(null);
  const capRef = useRef<HTMLDivElement>(null);
  const archRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLSpanElement>(null);
  const idxRef = useRef<HTMLSpanElement>(null);
  const metaARef = useRef<HTMLSpanElement>(null);
  const metaBRef = useRef<HTMLSpanElement>(null);
  const reducedRef = useRef(reducedMotion);
  reducedRef.current = reducedMotion;

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    let L: MobileLayout = buildLayout(window.innerWidth, window.innerHeight);
    let dust: DustSeed[] = buildDust(window.innerWidth, window.innerHeight);
    let glyphs: GlyphSeed[] = buildGlyphs(window.innerWidth, window.innerHeight, GLYPHS);
    const frames: WorkFrame[] = makeFrames();
    const loaded = new Array<boolean>(N).fill(false);
    const prev: string[] = new Array(N).fill('');
    const prevF: string[] = new Array(N).fill('');
    let namedSubject = -1;
    let capNow = 0;
    let pending = -1;
    let shown: boolean | null = null;
    let lastO = -1;
    let maxScroll = 1;
    let age = 999;

    const ease = (t: number) => t * t * (3 - 2 * t);
    const win = (p: number, a: number, b: number) => ease(clamp01((p - a) / (b - a)));

    /** Re-solve the layout against the live viewport, and re-lay the boxes. */
    const relayout = () => {
      L = buildLayout(window.innerWidth, window.innerHeight);
      dust = buildDust(window.innerWidth, window.innerHeight);
      glyphs = buildGlyphs(window.innerWidth, window.innerHeight, GLYPHS);
      for (let g = 0; g < GLYPH_N; g++) {
        const node = glyphRef.current[g];
        if (node) node.textContent = glyphs[g].ch;
      }
      for (let i = 0; i < N; i++) {
        const w = worksRef.current[i];
        if (!w) continue;
        w.style.width = `${L.work[i].w.toFixed(1)}px`;
        w.style.height = `${L.work[i].h.toFixed(1)}px`;
      }
      const c = curveRef.current;
      if (c) {
        c.setAttribute('d', L.path);
        c.style.strokeDasharray = `${L.pathLen.toFixed(0)}`;
      }
    };
    relayout();

    /** Write one work's pose. Transform + opacity + filter only — no layout. */
    const paint = (i: number, f: WorkFrame) => {
      const w = worksRef.current[i];
      if (!w) return;
      if (!f.live) {
        if (w.style.visibility !== 'hidden') w.style.visibility = 'hidden';
        return;
      }
      if (w.style.visibility === 'hidden') w.style.visibility = 'visible';
      const b = L.work[i];
      const tf =
        `translate3d(${(f.x - b.w / 2).toFixed(1)}px,${(f.y - b.h / 2).toFixed(1)}px,${f.z.toFixed(
          1,
        )}px) ` +
        `rotateX(${f.rotX.toFixed(2)}deg) rotateY(${f.rotY.toFixed(2)}deg) ` +
        `rotateZ(${f.rotZ.toFixed(2)}deg) scale(${f.s.toFixed(4)})`;
      if (tf !== prev[i]) {
        prev[i] = tf;
        w.style.transform = tf;
      }
      w.style.opacity = f.opacity.toFixed(3);
      const fl =
        `brightness(${f.bright.toFixed(2)}) saturate(${f.sat.toFixed(2)})` +
        (f.blur > 0.12 ? ` blur(${f.blur.toFixed(2)}px)` : '');
      if (fl !== prevF[i]) {
        prevF[i] = fl;
        w.style.filter = fl;
      }
      // nearer paints over further — explicit, because a `perspective` (not
      // preserve-3d) context paints in z-index order, not in depth order
      const zi = String(f.zi);
      if (w.style.zIndex !== zi) w.style.zIndex = zi;
      // progressive load: the nearest work in the corridor claims its plate first
      if (!loaded[i] && f.dz < 5200) {
        const img = imgsRef.current[i];
        const src = img?.dataset.src;
        if (img && src) {
          loaded[i] = true;
          img.src = src;
        }
      }
    };

    const nameSubject = (i: number) => {
      if (i === namedSubject) return;
      namedSubject = i;
      const work = SLABS[i].work;
      const [materials, support] = splitMedium(work.medium);
      if (titleRef.current) titleRef.current.textContent = work.title;
      if (idxRef.current) idxRef.current.textContent = `${String(i + 1).padStart(2, '0')}/${NN}`;
      // broken deliberately at the support rather than left to wrap, which
      // strands the year alone on a right-hand second line
      if (metaARef.current) metaARef.current.textContent = materials;
      if (metaBRef.current) {
        metaBRef.current.textContent =
          (support ? `${support} · ` : '') +
          work.year +
          (work.status === 'sold' ? ' · Sold' : '');
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

      if (live) {
        const cp = reducedRef.current ? 1 : clamp01((p - START) / (END - START));
        const info = stageFrame(cp, L, frames);
        for (let i = 0; i < N; i++) paint(i, frames[i]);

        if (!reducedRef.current) {
          for (let d = 0; d < DUST_N; d++) {
            const node = dustRef.current[d];
            if (!node) continue;
            const seed = dust[d];
            const [z, a] = dustAt(seed, info.camZ);
            node.style.transform = `translate3d(${(L.cx + seed.x).toFixed(0)}px,${(
              L.cy + seed.y
            ).toFixed(0)}px,${(-z).toFixed(0)}px)`;
            node.style.opacity = a.toFixed(3);
            node.style.zIndex = String(500 - Math.round(z / 24));
          }
          for (let g = 0; g < GLYPH_N; g++) {
            const node = glyphRef.current[g];
            if (!node) continue;
            const seed = glyphs[g];
            const [gz, ga] = glyphAt(seed, info.camZ);
            const a = ga * (1 - info.arch);
            if (a < 0.004) {
              if (node.style.visibility !== 'hidden') node.style.visibility = 'hidden';
              continue;
            }
            if (node.style.visibility === 'hidden') node.style.visibility = 'visible';
            node.style.transform = `translate3d(${(L.cx + seed.x).toFixed(0)}px,${(
              L.cy + seed.y
            ).toFixed(0)}px,${(-gz).toFixed(0)}px) rotateZ(${seed.rot}deg)`;
            node.style.opacity = a.toFixed(3);
            node.style.zIndex = String(500 - Math.round(gz / 24));
          }
        }

        if (plateRef.current) {
          plateRef.current.style.opacity = info.plate.toFixed(3);
          plateRef.current.style.transform = `translateY(${(-14 * (1 - info.plate)).toFixed(1)}px)`;
        }
        if (capRef.current) {
          if (namedSubject < 0) nameSubject(info.subject);
          const named = frames[namedSubject];
          // A JUMP (deep link, restored scroll, a thrown flick) leaves the named
          // work nowhere near the corridor: correct it at once rather than
          // blinking through fifteen labels.
          if (named.dz < -0.3 * SPACING || named.dz > 2.6 * SPACING) {
            pending = -1;
            nameSubject(info.subject);
          } else if (info.subject !== namedSubject && pending !== info.subject) {
            // THE BLINK. The subject has changed; take the metadata down first.
            pending = info.subject;
          }
          const target = pending >= 0 ? 0 : captionPresence(frames[namedSubject].dz, cp);
          // asymmetric: down fast, up eased — the exchange is quick, the arrival
          // is not, and neither is a pop
          capNow += (target - capNow) * (target > capNow ? 0.22 : 0.45);
          if (capNow < 0.002) capNow = 0;
          if (pending >= 0 && capNow < 0.05) {
            nameSubject(pending);
            pending = -1;
          }
          capRef.current.style.opacity = capNow.toFixed(3);
          capRef.current.style.transform =
            `translateY(${captionShift(frames[namedSubject].dz).toFixed(1)}px)`;
        }
        if (archRef.current) {
          // the type leaves BEFORE the figure does: a plate still legible over a
          // rail that already reads 04 / CONTRACTION is two chapters disagreeing
          archRef.current.style.opacity = (info.archPlate * (1 - info.collapse)).toFixed(3);
          archRef.current.style.transform = `translateY(${(
            16 *
            (1 - info.archPlate)
          ).toFixed(1)}px)`;
        }
        if (curveRef.current) {
          const draw = clamp01(info.arch * 1.18);
          curveRef.current.style.strokeDashoffset = (L.pathLen * (1 - draw)).toFixed(0);
          curveRef.current.style.opacity = (info.arch * 0.9 * (1 - info.collapse)).toFixed(3);
        }
        if (svgRef.current) {
          // the stroke winds down with the works it carries
          const k = 1 - 0.94 * info.collapse;
          svgRef.current.style.transformOrigin = `${L.cx.toFixed(0)}px ${L.acy.toFixed(0)}px`;
          svgRef.current.style.transform = info.collapse > 0 ? `scale(${k.toFixed(4)})` : '';
        }
      }

      if (Math.abs(o - lastO) >= 0.002) {
        lastO = o;
        el.style.opacity = o.toFixed(4);
      }
      if (live !== shown) {
        el.style.visibility = live ? 'visible' : 'hidden';
        shown = live;
      }
    };

    gsap.ticker.add(update);
    let rt = 0;
    const onResize = () => {
      window.clearTimeout(rt);
      rt = window.setTimeout(relayout, 140);
    };
    window.addEventListener('resize', onResize, { passive: true });
    return () => {
      gsap.ticker.remove(update);
      window.clearTimeout(rt);
      window.removeEventListener('resize', onResize);
    };
  }, [reducedMotion]);

  return (
    <section
      ref={rootRef}
      className="ms-root"
      data-phase="cosmos-fallback"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        opacity: 0,
        visibility: 'hidden',
        pointerEvents: 'none',
        background: '#0e0c0a',
        overflow: 'hidden',
      }}
    >
      <style>{CSS}</style>

      {/* the lens */}
      <div className="ms-space">
        {Array.from({ length: DUST_N }, (_, d) => (
          <span
            key={`d${d}`}
            className="ms-dust"
            aria-hidden
            style={{ width: d % 5 === 0 ? 2 : 1, height: d % 5 === 0 ? 2 : 1, opacity: 0 }}
            ref={(node) => {
              dustRef.current[d] = node;
            }}
          />
        ))}

        {Array.from({ length: GLYPH_N }, (_, g) => (
          <span
            key={`g${g}`}
            className="ms-glyph"
            aria-hidden
            style={{ opacity: 0, visibility: 'hidden' }}
            ref={(node) => {
              glyphRef.current[g] = node;
            }}
          />
        ))}

        {SLABS.map((slab, i) => (
          <figure
            key={slab.work.id}
            className="ms-work"
            style={{ opacity: 0, visibility: 'hidden' }}
            onClick={() => setSelectedWork(slab.work.id)}
            ref={(node) => {
              worksRef.current[i] = node;
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt={slab.work.altText}
              data-src={texPath(slab.work.file)}
              decoding="async"
              ref={(node) => {
                imgsRef.current[i] = node;
              }}
            />
          </figure>
        ))}
      </div>

      <div className="ms-vig" aria-hidden />

      {/* the φ spiral itself — the curve the CONTRACTION then collapses */}
      <svg className="ms-curve" aria-hidden ref={svgRef}>
        <path
          ref={curveRef}
          d=""
          fill="none"
          stroke="rgba(232,228,220,0.34)"
          strokeWidth="1"
          style={{ opacity: 0 }}
        />
      </svg>

      {/* chapter plate */}
      <header
        className="ms-plate"
        ref={plateRef}
        style={{
          position: 'absolute',
          left: 'var(--ms-gut)',
          top: 'clamp(72px, 13vh, 150px)',
          width: 'var(--ms-measure)',
          opacity: 0,
        }}
      >
        <span className="ms-chapter">
          <i aria-hidden />
          03 / The Cosmos
        </span>
        <h2>The work</h2>
        <span className="ms-plate-meta">
          {NN} works · one descent
          <br />
          Golden-angle helix · 137.508°
        </span>
      </header>

      {/* the museum caption — same grammar as the desktop label layer */}
      <div
        className="ms-cap"
        ref={capRef}
        style={{
          position: 'absolute',
          left: 'var(--ms-gut)',
          bottom: 'clamp(56px, 11vh, 120px)',
          width: 'var(--ms-measure)',
          opacity: 0,
        }}
      >
        <i className="ms-rule" aria-hidden />
        <span className="ms-cap-head">
          <span className="ms-title" ref={titleRef} />
          <span className="ms-idx" ref={idxRef} />
        </span>
        <span className="ms-meta" ref={metaARef} />
        <span className="ms-meta ms-meta2" ref={metaBRef} />
      </div>

      {/* the archive plate — 15 of 15, never a subset */}
      <div
        className="ms-arch"
        ref={archRef}
        style={{
          position: 'absolute',
          left: 'var(--ms-gut)',
          bottom: 'clamp(44px, 8vh, 96px)',
          width: 'var(--ms-measure)',
          opacity: 0,
        }}
      >
        <span className="ms-chapter">
          <i aria-hidden />
          The archive
        </span>
        <h3>Fifteen works</h3>
        <span className="ms-plate-meta">
          {NN} / {NN} · mixed media · {SPAN}
        </span>
        {/* the spiral's own law, set as written — uppercasing it turns θ into
            Θ and φ into Φ, which is a different statement */}
        <span className="ms-plate-meta ms-law">r = e^(bθ) · b = ln φ / π</span>
      </div>
    </section>
  );
}
