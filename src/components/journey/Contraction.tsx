'use client';

// OWNED BY FINALE agent.
// CONTRACTION (62–78%) — the DOM choreography wrapped around the 3D climax.
// Three responsibilities, nothing more:
//   1. "α ≈ 1/137.035999" — one mono line, BASELINE-LOCKED to the mark. The
//      sigil publishes its projected base line every frame; the caption sits a
//      golden-ratio gap under it and left-aligns to the base's left corner, so
//      it belongs to the mark instead of floating below it.
//   2. A 2D contraction for mobile / no-WebGL / reduced-motion, where there is
//      no Three scene at all: the SAME mark, generated from the same stroke
//      data (cosmos/sigil-form.ts) as pressure-varied filled outlines, arriving
//      group by group, with the same cold→warm ground swing behind it.
//   3. The darkness veil that closes the 3D out and hands the journey to
//      RETURN on a matched void — the seam-killer. zIndex 1: above the fixed
//      Cosmos canvas (0), below DOM sections (2).
//
// Everything is scrubbed off RAW scroll depth via the gsap ticker (Lenis
// already smooths the scroll itself; the context adds a second, frame-rate
// dependent lerp that slides these beats off-cue on slow machines). Zero
// re-renders, fully deterministic against scroll position.
// reducedMotion: things appear and disappear — no blur, no drift.

import { useEffect, useMemo, useRef } from 'react';
import gsap from 'gsap';
import { useJourney } from './JourneyContext';
import { clamp01 } from './journey-utils';
import { contraction } from './cosmos/contraction-state';
import { strokeOutline, strokeBounds, type Stroke } from './cosmos/chalk-ribbon';
import {
  armatureStrokes,
  socketStrokes,
  lashStrokes,
  irisStrokes,
  catchlightStrokes,
  dripStrokes,
  BASE_X0,
  BASE_X1,
  BASE_Y,
} from './cosmos/sigil-form';
import { DRIP_FLOOR, RULE_GAP, floorStrokes } from './cosmos/Sigil';

const VOID = '#0e0c0a';
const CHALK = '#e8e4dc';
const RED = '#c41230';
const MONO = "'JetBrains Mono', monospace";

// Global-progress windows, retimed with Sigil.tsx so the site has exactly ONE
// apex. 0.60–0.71 is pure velocity (no mark at all), the mark strikes on
// 0.70–0.76, and 0.76–0.78 is the apex: full luminance, full scale, and the
// constant set on it as a MEASURED DIMENSION LINE locked to the mark's own base
// — a scale anchor, not a floating caption. Then the rush, and the veil hands a
// matched void to the RETURN's ground turnover (which starts at 0.799).
const LINE_IN_START = 0.742;
const LINE_IN_END = 0.762;
const LINE_OUT_START = 0.782;
const LINE_OUT_END = 0.798;
const VEIL_START = 0.782;
const VEIL_END = 0.8;

// Mobile / no-WebGL beat. There is no warp and no 3D climax on the phone, so
// the flat mark owns the whole contraction band on its own clock: it strikes on
// fast, and then the APEX SITS at ~0.66–0.75 — which is where the phone's own
// capture cadence lands. Previously the write-on ran to 0.70 and the caption to
// 0.706, so a phone at 0.667 caught a two-thirds-drawn grey wireframe with no
// type on it: the emptiest frame in the set. It is now the loudest.
// …and it starts EARLIER than the phase number suggests, because MEASURED at
// 390×844 the phone had a hole: at 62.5% scroll the archive plate had already
// gone and the mark had not arrived, and the frame carried 18 lit pixels — a
// blank screen in the middle of the climax. The write-on now takes the frame
// straight off the archive plate's exit.
const M_IN_START = 0.606;
const M_IN_END = 0.628;
const M_PULSE = 0.67;
const M_PULSE_SIGMA = 0.014;
// THE PHONE'S HAND-OFF TO THE RETURN. Measured on 390×844: with the exit at
// 0.754→0.780 the mark's strokes were already under the visibility floor by
// 0.7775, while Finale's bone ground does not begin rising until 0.7899. That
// left SIX consecutive samples — global 0.7775 to 0.7900, 1.25% of the whole
// track — at 0.00% ink: a pure black screen with nothing on it but the rail,
// between the climax of the contraction and the first line of the manifesto.
// (The desktop path does not have the hole; its 3D sigil and its measure run to
// LINE_OUT_END = 0.798, which is why this is fixed here and not by moving the
// shared GROUND_IN earlier and dropping cream under a sigil still drawing.)
// The exit now finishes ON the ground's first frame: the mark is still legible
// at 0.7899 and gone by 0.790, and the cream comes up into the space it leaves.
const M_OUT_START = 0.77;
const M_OUT_END = 0.792;
const M_CAP: [number, number] = [0.628, 0.646];

const smooth = (t: number) => t * t * (3 - 2 * t);
const win = (p: number, a: number, b: number) => smooth(clamp01((p - a) / (b - a)));

/* ---- THE MEASURE'S TYPE SCALE ------------------------------------------
   The flat mark is an SVG, so its caption is set in viewBox units and its
   rendered size is whatever the box happens to scale to. MEASURED on a 390px
   phone: the box resolves to 302px for 5.45 units, so 0.135 units rendered at
   7.5px — the smallest type anywhere on the site, and the one tier that had to
   be readable, because it carries the constant the whole site is named after.
   The units are therefore set in CSS, not baked into the geometry, and the
   phone gets its own value: 0.19u ≈ 10.5px there, while the desktop
   reduced-motion path keeps the size it was drawn for. */
const CAP_CSS = `
.ct-cap { font-size: 0.135px; }
.ct-cap-sub { font-size: 0.111px; }
@media (max-width: 767px) {
  .ct-cap { font-size: 0.19px; }
  .ct-cap-sub { font-size: 0.167px; }
}
`;

/* ---------------------------------------------------- the flat mark, as SVG */
// Same authored strokes as the 3D mark, emitted as filled outlines so the
// pressure variation survives into the fallback. y is flipped for SVG.

const FLAT_UPP = 0.0125; // px half-width → viewBox units

interface FlatGroup {
  key: string;
  d: string;
  color: string;
  /** reveal window in global progress */
  a: number;
  b: number;
  opacity: number;
}

function join(strokes: Stroke[]): string {
  return strokes.map((s) => strokeOutline(s, FLAT_UPP)).join(' ');
}

/**
 * THE PHONE'S KEYSTONE, COMPOSED.
 *
 * MEASURED at 390×844, 67% scroll: the flat mark resolved to 302×306px and sat
 * dead centre with 269px of nothing above it and 269px below — 64% of the
 * viewport empty, and the caption crammed 19px under the base with a paint drip
 * running through it. The mark is width-bound on a phone (the box is 302px once
 * the HUD rail's reserve and the left gutter are taken out), so it cannot be
 * grown into that space: the space has to be COMPOSED instead.
 *
 * It is composed as a drafting sheet, which is the grammar the frame already
 * speaks. The measure is DATUMED OFF the base rather than tucked under it: two
 * extension lines drop from the base's own corners, and the dimension rule with
 * the constant on it sits at the foot of them. The figure then spans 200→645
 * of the 844 (53%, from 36%) with the empty bands equal and clearly margins,
 * the caption is a full 1.06 mark-units clear of the base — desktop's clearance
 * to scale, not a fraction of it — and nothing crosses either.
 */
const MEASURE_DROP = 2.15;
/** How far the extension lines run off the base, and back up off the rule.
 *  Segmented rather than continuous: a full-length pair on a drop this long
 *  encloses the gap and the frame reads as an empty box instead of as measured
 *  space. Drafting does the same thing — the extension line is a construction
 *  mark at each terminal, not a border. */
const EXT_HEAD = 0.54;
const EXT_TAIL = 0.5;

const FLAT = (() => {
  const armature = armatureStrokes();
  const socket = socketStrokes();
  const lashes = lashStrokes();
  const iris = irisStrokes();
  const glint = catchlightStrokes();
  // same floor the 3D mark's drips obey — nothing reaches the rule
  const drips = floorStrokes(dripStrokes(), DRIP_FLOOR);
  const all = [...armature, ...socket, ...lashes, ...iris, ...glint, ...drips];
  const b = strokeBounds(all);
  const padX = 0.06;
  const padTop = 0.10;
  // room under the base line for the MEASURE: a dimension rule spanning the
  // mark's own base, ticked at both ends, with the constant set on its left
  // terminal and the chapter name on its right. This is the scale anchor.
  const ruleY = -BASE_Y + MEASURE_DROP;
  const tick = 0.055;
  const capGap = 0.26;
  const capSize = 0.135;
  const capY = ruleY + capGap + capSize;
  const minY = -b.y1 - padTop;
  const maxY = Math.max(-b.y0, capY + capSize * 0.4) + 0.16;
  const groups: FlatGroup[] = [
    { key: 'armature', d: join(armature), color: CHALK, a: 0.608, b: 0.624, opacity: 0.96 },
    { key: 'socket', d: join(socket), color: CHALK, a: 0.614, b: 0.630, opacity: 0.98 },
    { key: 'lashes', d: join(lashes), color: CHALK, a: 0.620, b: 0.634, opacity: 0.84 },
    { key: 'iris', d: join(iris), color: RED, a: 0.624, b: 0.638, opacity: 1 },
    { key: 'glint', d: join(glint), color: CHALK, a: 0.630, b: 0.642, opacity: 0.92 },
    { key: 'drips', d: join(drips), color: CHALK, a: 0.632, b: 0.644, opacity: 0.44 },
  ];
  return {
    groups,
    viewBox: `${(b.x0 - padX).toFixed(3)} ${minY.toFixed(3)} ${(b.x1 - b.x0 + padX * 2).toFixed(3)} ${(maxY - minY).toFixed(3)}`,
    capX: BASE_X0,
    capX1: BASE_X1,
    capY,
    capSize,
    ruleY,
    tick,
    /** where the extension lines start — the mark's own base */
    baseY: -BASE_Y,
    aspect: (b.x1 - b.x0 + padX * 2) / (maxY - minY),
  };
})();

export function Contraction() {
  const { reducedMotion, isMobile, webglOk } = useJourney();
  const wrapRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<HTMLDivElement>(null);
  const veilRef = useRef<HTMLDivElement>(null);
  const mobileRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const groupRefs = useRef<Record<string, SVGPathElement | null>>({});
  const capRef = useRef<SVGGElement>(null);
  const ruleRef = useRef<HTMLDivElement>(null);
  const mRuleRef = useRef<SVGLineElement>(null);
  const extRef = useRef<HTMLDivElement>(null);

  // The 3D path is live only when Cosmos itself mounts the canvas.
  const flat = isMobile || !webglOk || reducedMotion;
  const flatRef = useRef(flat);
  flatRef.current = flat;

  const flatGroups = useMemo(() => FLAT.groups, []);

  useEffect(() => {
    let wrapShown: boolean | null = null;
    let veilShown: boolean | null = null;
    let mobShown: boolean | null = null;
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

    const update = () => {
      const p = raw();
      const wrap = wrapRef.current;
      const line = lineRef.current;
      const veil = veilRef.current;
      const mob = mobileRef.current;
      const svg = svgRef.current;
      if (!wrap || !line || !veil || !mob || !svg) return;

      // ---- the measure: a dimension rule spanning the mark's own base, with
      // the constant on its left terminal and the chapter name on its right.
      // Locked to the projected base every frame, so it IS the scale anchor.
      const tin = win(p, LINE_IN_START, LINE_IN_END);
      const tout = win(p, LINE_OUT_START, LINE_OUT_END);
      let o: number;
      if (reducedMotion) {
        o = p >= LINE_IN_START && p <= LINE_OUT_END ? 0.92 : 0;
        line.style.opacity = o.toFixed(3);
        line.style.filter = 'none';
        line.style.transform = 'none';
      } else {
        o = tin * (1 - tout);
        line.style.opacity = o.toFixed(4);
        const blur = (1 - tin) * 4 + tout * 7;
        line.style.filter = blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : 'none';
        line.style.transform = `translateY(${((1 - tin) * 12 - tout * 16).toFixed(2)}px)`;
      }
      // the rule draws itself out from the left terminal as the measure arrives
      if (ruleRef.current) ruleRef.current.style.transform = `scaleX(${tin.toFixed(4)})`;
      if (!flatRef.current && contraction.live) {
        // clamped clear of the HUD rail on the right and the phase mark on the
        // left — the measure can never touch either, at any viewport
        const sx0 = 56;
        const sx1 = window.innerWidth - 116;
        const x0 = Math.max(sx0, contraction.baseX);
        const x1 = Math.min(sx1, contraction.baseX + contraction.baseW);
        line.style.left = `${x0.toFixed(1)}px`;
        line.style.width = `${Math.max(160, x1 - x0).toFixed(1)}px`;
        // THE GAP IS IN THE MARK'S OWN UNITS, NOT IN PIXELS.
        // At a flat +40px the rule sat 0.30 mark-units under the base on a
        // 900px frame and less than that on a taller one, while the paint drips
        // ran to 0.38 and 0.67 — so the tails crossed the rule. The drips are
        // now floored at 0.30 (Sigil.tsx) and the rule is set at RULE_GAP =
        // 0.56 units, measured off the projected base width, so the 0.26-unit
        // clearance holds at every viewport instead of only at one.
        const upp = contraction.baseW / (BASE_X1 - BASE_X0);
        const gap = Math.max(34, RULE_GAP * upp);
        line.style.top = `${(contraction.baseY + gap).toFixed(1)}px`;
        if (extRef.current) extRef.current.style.height = `${Math.round(gap - 6)}px`;
      }
      const wantWrap = o > 0.001 && !flatRef.current;
      if (wantWrap !== wrapShown) {
        wrap.style.visibility = wantWrap ? 'visible' : 'hidden';
        wrapShown = wantWrap;
      }

      // ---- flat (2D) mark ----
      if (flatRef.current) {
        const min = win(p, M_IN_START, M_IN_END);
        const mout = win(p, M_OUT_START, M_OUT_END);
        const mo = min * (1 - mout);
        const d = (p - M_PULSE) / M_PULSE_SIGMA;
        const pulse = reducedMotion ? 0 : Math.exp(-d * d);
        mob.style.opacity = mo.toFixed(4);
        // the same cold → warm ground swing the 3D climax gets
        const cool = win(p, M_IN_START, M_IN_START + 0.03);
        const warm = win(p, 0.632, 0.686);
        mob.style.background = mixGround(cool, warm);
        // max 1.015 — the pulse must not push the mark's box into the rail reserve
        svg.style.transform = `scale(${(0.94 + min * 0.045 + pulse * 0.03).toFixed(4)})`;
        for (const g of flatGroups) {
          const el = groupRefs.current[g.key];
          if (!el) continue;
          const t = reducedMotion ? (p >= g.b ? 1 : 0) : win(p, g.a, g.b);
          const boost = g.color === RED ? pulse * 1.6 : pulse * 0.5;
          el.style.opacity = (g.opacity * t * (1 + boost)).toFixed(3);
        }
        const cap = capRef.current;
        if (cap) {
          const t = reducedMotion ? (p >= M_CAP[1] ? 1 : 0) : win(p, M_CAP[0], M_CAP[1]);
          cap.style.opacity = (t * 0.92 * (1 - win(p, M_OUT_START, M_OUT_START + 0.02))).toFixed(3);
          const mr = mRuleRef.current;
          if (mr) mr.style.transform = `scaleX(${t.toFixed(4)})`;
        }
        const wantMob = mo > 0.002;
        if (wantMob !== mobShown) {
          mob.style.visibility = wantMob ? 'visible' : 'hidden';
          mobShown = wantMob;
        }
      } else if (mobShown !== false) {
        mob.style.visibility = 'hidden';
        mob.style.opacity = '0';
        mobShown = false;
      }

      // ---- darkness veil: the hand-off to RETURN ----
      // on the flat path the veil must be solid BEFORE the mark fades, or the
      // artwork stack flashes back through the seam
      const start = flatRef.current ? M_OUT_START - 0.004 : VEIL_START;
      const end = flatRef.current ? M_OUT_START + 0.026 : VEIL_END;
      const vo = win(p, start, end);
      veil.style.opacity = vo.toFixed(4);
      const wantVeil = vo > 0.001;
      if (wantVeil !== veilShown) {
        veil.style.visibility = wantVeil ? 'visible' : 'hidden';
        veilShown = wantVeil;
      }
    };

    gsap.ticker.add(update);
    return () => gsap.ticker.remove(update);
  }, [reducedMotion, flatGroups]);

  return (
    <>
      <style>{CAP_CSS}</style>

      {/* Void veil — above the canvas, below DOM. The RETURN backdrop. */}
      <div
        ref={veilRef}
        data-phase="contraction-veil"
        aria-hidden
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1,
          background: VOID,
          opacity: 0,
          visibility: 'hidden',
          pointerEvents: 'none',
        }}
      />

      {/* Flat mark — mobile / no WebGL / reduced motion. */}
      <div
        ref={mobileRef}
        data-phase="contraction-flat"
        aria-hidden
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1,
          display: 'grid',
          placeItems: 'center',
          background: VOID,
          opacity: 0,
          visibility: 'hidden',
          pointerEvents: 'none',
          // THE RAIL IS INVIOLABLE. The flat mark used to be centred in the full
          // viewport at 95vw, which put its right vertex at x=373.8 on a 390px
          // phone — straight through the HUD rail's 55px reserve (x≥335). It is
          // now centred inside a box that clears the rail on the right and the
          // phase mark on the left, so no vertex can ever reach either.
          paddingRight: 'clamp(62px, 16vw, 128px)',
          paddingLeft: 'clamp(14px, 4vw, 64px)',
          boxSizing: 'border-box',
        }}
      >
        <svg
          ref={svgRef}
          viewBox={FLAT.viewBox}
          preserveAspectRatio="xMidYMid meet"
          fill="none"
          style={{
            // the mark is wider than it is tall, so inside the padded box it is
            // the WIDTH that binds — fill it, and let the height follow
            width: `min(100%, ${(84 * FLAT.aspect).toFixed(2)}vh)`,
            height: 'auto',
            maxHeight: '84vh',
            overflow: 'visible',
            willChange: 'transform',
          }}
        >
          {FLAT.groups.map((g) => (
            <path
              key={g.key}
              ref={(el) => {
                groupRefs.current[g.key] = el;
              }}
              d={g.d}
              fill={g.color}
              fillRule="nonzero"
              style={{ opacity: 0 }}
            />
          ))}
          {/* THE MEASURE — a dimension rule spanning the mark's own base,
              ticked at both terminals, carrying the constant. It is the scale
              anchor the apex frame was missing: without it the mark floats at
              no size at all. */}
          <g ref={capRef} style={{ opacity: 0 }}>
            {/* EXTENSION LINES — the measure is datumed off the mark's own base
                corners rather than floated under it, which is what turns the
                band between mark and caption from dead space into measured
                space. Faint: they carry the geometry, not the eye. */}
            {[FLAT.capX, FLAT.capX1].map((x) => (
              <g key={x}>
                <line
                  x1={x}
                  y1={FLAT.baseY + 0.08}
                  x2={x}
                  y2={FLAT.baseY + 0.08 + EXT_HEAD}
                  stroke={RED}
                  strokeWidth={0.007}
                  opacity={0.42}
                />
                <line
                  x1={x}
                  y1={FLAT.ruleY - FLAT.tick - EXT_TAIL}
                  x2={x}
                  y2={FLAT.ruleY - FLAT.tick}
                  stroke={RED}
                  strokeWidth={0.007}
                  opacity={0.42}
                />
              </g>
            ))}
            <line
              ref={mRuleRef}
              x1={FLAT.capX}
              y1={FLAT.ruleY}
              x2={FLAT.capX1}
              y2={FLAT.ruleY}
              stroke={RED}
              strokeWidth={0.012}
              style={{ transformOrigin: `${FLAT.capX}px ${FLAT.ruleY}px`, transform: 'scaleX(0)' }}
            />
            <line
              x1={FLAT.capX}
              y1={FLAT.ruleY - FLAT.tick}
              x2={FLAT.capX}
              y2={FLAT.ruleY + FLAT.tick}
              stroke={RED}
              strokeWidth={0.012}
            />
            <line
              x1={FLAT.capX1}
              y1={FLAT.ruleY - FLAT.tick}
              x2={FLAT.capX1}
              y2={FLAT.ruleY + FLAT.tick}
              stroke={RED}
              strokeWidth={0.012}
            />
            <text
              className="ct-cap"
              x={FLAT.capX}
              y={FLAT.capY}
              fill={CHALK}
              fontFamily={MONO}
              fontWeight={300}
              letterSpacing="0.2em"
            >
              α ≈ 1/137.035999
            </text>
            <text
              className="ct-cap-sub"
              x={FLAT.capX1}
              y={FLAT.capY}
              textAnchor="end"
              fill="#a09890"
              fontFamily={MONO}
              fontWeight={300}
              letterSpacing="0.24em"
            >
              THE CONSTANT
            </text>
          </g>
        </svg>
      </div>

      {/* THE MEASURE — the constant set on a dimension rule that spans the 3D
          mark's projected base, ticked at both terminals. Same device as the
          flat path, same device family as the works' curator captions. */}
      <div
        ref={wrapRef}
        data-phase="contraction"
        aria-hidden
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 2,
          visibility: 'hidden',
          pointerEvents: 'none',
        }}
      >
        <div
          ref={lineRef}
          data-role="apex-measure"
          style={{
            position: 'absolute',
            left: 0,
            top: '80%',
            width: '40%',
            opacity: 0,
            willChange: 'opacity, transform, filter',
          }}
        >
          <div style={{ position: 'relative', height: '1px' }}>
            {/* EXTENSION LINES up to the mark's own base corners — the measure
                is datumed off the artwork, not floated beneath it. */}
            <div
              ref={extRef}
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: 0,
                height: 24,
                pointerEvents: 'none',
              }}
            >
              <i
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: '1px',
                  background: 'rgba(196, 18, 48, 0.42)',
                }}
              />
              <i
                style={{
                  position: 'absolute',
                  right: 0,
                  top: 0,
                  bottom: 0,
                  width: '1px',
                  background: 'rgba(196, 18, 48, 0.42)',
                }}
              />
            </div>
            <div
              ref={ruleRef}
              style={{
                position: 'absolute',
                inset: 0,
                background: RED,
                transformOrigin: '0 50%',
                transform: 'scaleX(0)',
              }}
            />
            <i
              style={{
                position: 'absolute',
                left: 0,
                top: '-4px',
                width: '1px',
                height: '9px',
                background: RED,
              }}
            />
            <i
              style={{
                position: 'absolute',
                right: 0,
                top: '-4px',
                width: '1px',
                height: '9px',
                background: RED,
              }}
            />
          </div>
          <div
            style={{
              marginTop: '13px',
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              gap: '21px',
              fontFamily: MONO,
              fontWeight: 300,
            }}
          >
            <span style={{ fontSize: '0.8rem', letterSpacing: '0.22em', color: CHALK }}>
              α ≈ 1/137.035999
            </span>
            <span style={{ fontSize: '0.62rem', letterSpacing: '0.26em', color: '#a09890' }}>
              THE CONSTANT
            </span>
          </div>
        </div>
      </div>
    </>
  );
}

/* ---- the flat ground's temperature: a shade cooler, then a shade warmer ----
   G_COLD was [9,11,18] — blue double red, i.e. a literal blue-black, which is
   the one thing the palette rules out ("NO pure black. Always warm dark", and
   never a second colour). [12,11,13] is the same temperature MOVE off #0e0c0a
   at a twelfth the chroma, and matches the 3D ground in Sigil.tsx. */
const G_BASE = [14, 12, 10];
const G_COLD = [12, 11, 13];
const G_WARM = [18, 12, 11];
function mixGround(cool: number, warm: number): string {
  const c = G_BASE.map((v, i) => v + (G_COLD[i] - v) * cool);
  const w = c.map((v, i) => v + (G_WARM[i] - v) * warm * 0.85);
  return `rgb(${w.map((v) => Math.round(v)).join(',')})`;
}
