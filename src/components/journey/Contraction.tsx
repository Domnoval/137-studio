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
  BASE_Y,
} from './cosmos/sigil-form';

const VOID = '#0e0c0a';
const CHALK = '#e8e4dc';
const RED = '#c41230';
const MONO = "'JetBrains Mono', monospace";

// Global-progress windows. The mark resolves by ~0.728, pulses at ~0.723,
// holds to 0.752, then rushes/dissolves; the veil closes behind it and hands
// a matched void to the RETURN's ground turnover (which starts at 0.799).
const LINE_IN_START = 0.698;
const LINE_IN_END = 0.724;
const LINE_OUT_START = 0.750;
const LINE_OUT_END = 0.772;
const VEIL_START = 0.768;
const VEIL_END = 0.79;

// Mobile / no-WebGL beat (there is no 3D climax to hang off).
// The container ramp used to run 0.638→0.716, which held the WHOLE flat mark
// under 50% opacity for half the beat — on a phone the only frame anyone sees
// of the climax was a near-invisible grey wireframe. The ground now arrives
// fast (it is a cover, not a reveal) and the STROKES carry the reveal, so the
// mark is legible chalk-on-void from the moment it starts writing.
const M_IN_START = 0.628;
const M_IN_END = 0.66;
const M_PULSE = 0.712;
const M_OUT_START = 0.756;
const M_OUT_END = 0.782;

const smooth = (t: number) => t * t * (3 - 2 * t);
const win = (p: number, a: number, b: number) => smooth(clamp01((p - a) / (b - a)));

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

const FLAT = (() => {
  const armature = armatureStrokes();
  const socket = socketStrokes();
  const lashes = lashStrokes();
  const iris = irisStrokes();
  const glint = catchlightStrokes();
  const drips = dripStrokes();
  const all = [...armature, ...socket, ...lashes, ...iris, ...glint, ...drips];
  const b = strokeBounds(all);
  const padX = 0.06;
  const padTop = 0.10;
  // room under the base line for the caption
  const capGap = 0.30;
  const capSize = 0.155;
  const capY = -BASE_Y + capGap + capSize;
  const minY = -b.y1 - padTop;
  const maxY = Math.max(-b.y0, capY + capSize * 0.4) + 0.16;
  const groups: FlatGroup[] = [
    { key: 'armature', d: join(armature), color: CHALK, a: 0.628, b: 0.66, opacity: 0.94 },
    { key: 'socket', d: join(socket), color: CHALK, a: 0.64, b: 0.672, opacity: 0.96 },
    { key: 'lashes', d: join(lashes), color: CHALK, a: 0.652, b: 0.68, opacity: 0.8 },
    { key: 'iris', d: join(iris), color: RED, a: 0.658, b: 0.686, opacity: 1 },
    { key: 'glint', d: join(glint), color: CHALK, a: 0.668, b: 0.692, opacity: 0.9 },
    { key: 'drips', d: join(drips), color: CHALK, a: 0.674, b: 0.7, opacity: 0.4 },
  ];
  return {
    groups,
    viewBox: `${(b.x0 - padX).toFixed(3)} ${minY.toFixed(3)} ${(b.x1 - b.x0 + padX * 2).toFixed(3)} ${(maxY - minY).toFixed(3)}`,
    capX: BASE_X0,
    capY,
    capSize,
    aspect: (b.x1 - b.x0 + padX * 2) / (maxY - minY),
  };
})();

export function Contraction() {
  const { reducedMotion, isMobile, webglOk } = useJourney();
  const wrapRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<HTMLSpanElement>(null);
  const veilRef = useRef<HTMLDivElement>(null);
  const mobileRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const groupRefs = useRef<Record<string, SVGPathElement | null>>({});
  const capRef = useRef<SVGTextElement>(null);

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

      // ---- the constant: α ≈ 1/137.035999, locked to the mark's base ----
      const tin = win(p, LINE_IN_START, LINE_IN_END);
      const tout = win(p, LINE_OUT_START, LINE_OUT_END);
      let o: number;
      if (reducedMotion) {
        o = p >= LINE_IN_START && p <= LINE_OUT_END ? 0.85 : 0;
        line.style.opacity = o.toFixed(3);
        line.style.filter = 'none';
        line.style.transform = 'none';
      } else {
        o = tin * (1 - tout) * 0.9;
        line.style.opacity = o.toFixed(4);
        const blur = (1 - tin) * 5 + tout * 7;
        line.style.filter = blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : 'none';
        line.style.transform = `translateY(${((1 - tin) * 10 - tout * 14).toFixed(2)}px)`;
        line.style.letterSpacing = `${(0.25 + tout * 0.22).toFixed(3)}em`;
      }
      if (!flatRef.current && contraction.live) {
        // baseline-locked: a golden-ratio gap under the mark's base line,
        // left-aligned to the base's left corner
        line.style.left = `${contraction.baseX.toFixed(1)}px`;
        line.style.width = `${contraction.baseW.toFixed(1)}px`;
        line.style.top = `${(contraction.baseY + 34).toFixed(1)}px`;
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
        const d = (p - M_PULSE) / 0.012;
        const pulse = reducedMotion ? 0 : Math.exp(-d * d);
        mob.style.opacity = mo.toFixed(4);
        // the same cold → warm ground swing the 3D climax gets
        const cool = win(p, M_IN_START, M_IN_START + 0.04);
        const warm = win(p, 0.674, 0.714);
        mob.style.background = mixGround(cool, warm);
        svg.style.transform = `scale(${(0.965 + min * 0.035 + pulse * 0.03).toFixed(4)})`;
        for (const g of flatGroups) {
          const el = groupRefs.current[g.key];
          if (!el) continue;
          const t = reducedMotion ? (p >= g.b ? 1 : 0) : win(p, g.a, g.b);
          const boost = g.color === RED ? pulse * 1.6 : pulse * 0.5;
          el.style.opacity = (g.opacity * t * (1 + boost)).toFixed(3);
        }
        const cap = capRef.current;
        if (cap) {
          const t = reducedMotion ? (p >= 0.706 ? 1 : 0) : win(p, 0.68, 0.706);
          cap.style.opacity = (t * 0.82 * (1 - win(p, M_OUT_START, M_OUT_START + 0.02))).toFixed(3);
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
        }}
      >
        <svg
          ref={svgRef}
          viewBox={FLAT.viewBox}
          preserveAspectRatio="xMidYMid meet"
          fill="none"
          style={{
            // the mark is wider than it is tall, so on a phone it is the
            // VIEWPORT WIDTH that binds — fill it, and let the height follow
            width: `min(${(72 * FLAT.aspect).toFixed(2)}vh, 95vw)`,
            height: `min(72vh, ${(95 / FLAT.aspect).toFixed(2)}vw)`,
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
          <text
            ref={capRef}
            x={FLAT.capX}
            y={FLAT.capY}
            fill={CHALK}
            fontFamily={MONO}
            fontSize={FLAT.capSize}
            fontWeight={300}
            letterSpacing="0.25em"
            style={{ opacity: 0 }}
          >
            α ≈ 1/137.035999
          </text>
        </svg>
      </div>

      {/* The constant — one mono line, locked to the 3D mark's base. */}
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
        <span
          ref={lineRef}
          style={{
            position: 'absolute',
            left: 0,
            top: '80%',
            textAlign: 'left',
            fontFamily: MONO,
            fontWeight: 300,
            fontSize: '0.72rem',
            letterSpacing: '0.25em',
            color: CHALK,
            opacity: 0,
            willChange: 'opacity, transform, filter',
          }}
        >
          α ≈ 1/137.035999
        </span>
      </div>
    </>
  );
}

/* ---- the flat ground's temperature: cold blue-black, then a shade warmer ---- */
const G_BASE = [14, 12, 10];
const G_COLD = [9, 11, 18];
const G_WARM = [18, 12, 11];
function mixGround(cool: number, warm: number): string {
  const c = G_BASE.map((v, i) => v + (G_COLD[i] - v) * cool);
  const w = c.map((v, i) => v + (G_WARM[i] - v) * warm * 0.85);
  return `rgb(${w.map((v) => Math.round(v)).join(',')})`;
}
