'use client';

// cosmos/FormationPlate.tsx — OWNED BY COSMOS agent.
//
// The caption track does not stop when the corridor does.
//
// The PULL-BACK is the one beat where no single work is the subject — fifteen
// of them compose one figure — so the per-work museum caption in Labels.tsx
// correctly stands down. What it must not do is leave the frame with no
// metadata anchor at all: the composed triangle then reads as a screensaver
// rather than as a body of work, and the site's most disciplined device goes
// missing for the two frames that matter most.
//
// So the formation gets its own plate, in exactly the same grammar as the
// museum caption — 1px crimson rule, tracked mono title, medium · years ·
// index, a short terminal tick running toward the work it names. It names the
// FORMATION rather than a member of it, and it stays up through both movements
// of the beat: the square-on read and the low, raking second vantage.
//
// It places itself against the measured bounds of the formation (published by
// Slabs.tsx into stage-state), so it can never sit on paint — including once
// the triangle tilts, grows and bleeds off the bottom of the frame.

import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useJourney } from '../JourneyContext';
import { phaseProgress } from '../journey-utils';
import { cosmosShared, smoothstep } from './shared';
import { stage } from './stage-state';
import { SLABS } from './cosmos-data';

const MONO = "'JetBrains Mono', monospace";
/** Same clearance law the museum caption obeys. */
const CLEAR = 32;
/** Scroll past which THE COSMOS's type layer stops existing (matches Labels). */
const CHAPTER_END = 0.618;

const CSS = `
.fp-cap { position:absolute; left:0; top:0; white-space:nowrap; text-align:left;
          opacity:0; transition:opacity .26s linear; }
.fp-rule { width:28px; height:1px; background:#c41230; margin-bottom:10px; }
.fp-title { font-family:${MONO}; font-weight:400; font-size:.74rem; line-height:1;
            letter-spacing:.19em; text-transform:uppercase; color:#e8e4dc; }
.fp-meta { margin-top:8px; font-family:${MONO}; font-size:.55rem; line-height:1.1;
           letter-spacing:.15em; text-transform:uppercase; color:#a09890; }
.fp-tick { position:absolute; left:0; top:0; height:1px;
           background:rgba(196,18,48,.85); opacity:0; }
.fp-dot { position:absolute; left:0; top:0; width:4px; height:4px; margin-top:-2px;
          background:#c41230; opacity:0; }
`;

const YEARS = SLABS.map((s) => s.work.year);
const Y0 = Math.min(...YEARS);
const Y1 = Math.max(...YEARS);
const N = SLABS.length;
const TITLE = 'The Body of Work';
// Same grammar as the museum caption: MEDIUM · YEAR · index. A degenerate
// "2024–2024" range would be a machine talking, so a single year prints alone.
const SPAN = Y0 === Y1 ? `${Y0}` : `${Y0}–${Y1}`;
const META = `MIXED MEDIA · ${SPAN} · ${String(N).padStart(2, '0')}/${String(N).padStart(2, '0')}`;

/** Un-smoothed scroll progress — the CONTRACTION is choreographed off this. */
function rawScroll(): number {
  if (typeof window === 'undefined') return 0;
  const max = document.documentElement.scrollHeight - window.innerHeight;
  return max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
}

interface Plate {
  root: HTMLDivElement;
  tick: HTMLDivElement;
  dot: HTMLDivElement;
  w: number;
  h: number;
  opacity: number;
  tickOn: number;
}

const cands: number[][] = [];

export function FormationPlate() {
  const { progressRef } = useJourney();
  const plateRef = useRef<Plate | null>(null);

  useEffect(() => {
    let raf = 0;
    let disposed = false;
    let cleanup: (() => void) | undefined;

    const build = (layer: HTMLDivElement) => {
      const style = document.createElement('style');
      style.textContent = CSS;
      layer.appendChild(style);

      const root = document.createElement('div');
      root.className = 'fp-cap';
      const rule = document.createElement('div');
      rule.className = 'fp-rule';
      const title = document.createElement('div');
      title.className = 'fp-title';
      title.textContent = TITLE;
      const meta = document.createElement('div');
      meta.className = 'fp-meta';
      meta.textContent = META;
      root.append(rule, title, meta);

      const tick = document.createElement('div');
      tick.className = 'fp-tick';
      const dot = document.createElement('div');
      dot.className = 'fp-dot';
      layer.append(root, tick, dot);

      const r = root.getBoundingClientRect();
      plateRef.current = {
        root,
        tick,
        dot,
        w: r.width || 220,
        h: r.height || 46,
        opacity: 0,
        tickOn: 0,
      };

      cleanup = () => {
        style.remove();
        root.remove();
        tick.remove();
        dot.remove();
        plateRef.current = null;
      };
    };

    const poll = () => {
      if (disposed) return;
      const layer = cosmosShared.labelLayer;
      if (layer) build(layer);
      else raf = requestAnimationFrame(poll);
    };
    poll();

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      cleanup?.();
    };
  }, []);

  useFrame((state) => {
    const plate = plateRef.current;
    if (!plate) return;
    const p = progressRef.current ?? 0;
    const rawP = rawScroll();
    const conP = phaseProgress(p, 'contraction');
    const rawCon = phaseProgress(rawP, 'contraction');

    const setOpacity = (v: number, tickOn: number) => {
      if (Math.abs(v - plate.opacity) < 0.004 && tickOn === plate.tickOn) return;
      plate.opacity = v;
      plate.tickOn = tickOn;
      plate.root.style.opacity = v.toFixed(3);
      const t = (v * tickOn).toFixed(3);
      plate.tick.style.opacity = t;
      plate.dot.style.opacity = t;
    };

    // the plate belongs to the formation and to nothing else
    const gate =
      smoothstep(0.34, 0.62, stage.formW) *
      (1 - smoothstep(0, 0.12, conP)) *
      (1 - smoothstep(0.04, 0.26, rawCon)) *
      (p < CHAPTER_END + 0.005 && rawP < CHAPTER_END + 0.005 ? 1 : 0);

    if (gate < 0.01) {
      setOpacity(0, 0);
      return;
    }

    if (plate.w < 40) {
      const r = plate.root.getBoundingClientRect();
      if (r.width > 0) {
        plate.w = r.width;
        plate.h = r.height;
      }
    }

    const W = state.size.width;
    const H = state.size.height;
    // safe frame: clear of the scroll rail (right) and the phase mark (bottom-left)
    const sx0 = 56;
    const sy0 = 56;
    const sx1 = W - 104;
    const sy1 = H - 70;

    // the museum position first, then the three other corners
    cands.length = 0;
    cands.push([sx0, sy1 - plate.h]);
    cands.push([sx1 - plate.w, sy1 - plate.h]);
    cands.push([sx0, sy0 + 26]);
    cands.push([sx1 - plate.w, sy0 + 26]);

    const fx0 = stage.formLive ? stage.formX0 - CLEAR : Infinity;
    const fy0 = stage.formLive ? stage.formY0 - CLEAR : Infinity;
    const fx1 = stage.formLive ? stage.formX1 + CLEAR : -Infinity;
    const fy1 = stage.formLive ? stage.formY1 + CLEAR : -Infinity;

    let bestX = cands[0][0];
    let bestY = cands[0][1];
    let bestGap = -Infinity;
    for (const [cx, cy] of cands) {
      if (cx < sx0 - 1 || cy < sy0 - 1 || cx + plate.w > sx1 + 1 || cy + plate.h > sy1 + 1) continue;
      // signed clearance to the formation's bounding box: > 0 means clear
      const gap = Math.max(fx0 - (cx + plate.w), cx - fx1, fy0 - (cy + plate.h), cy - fy1);
      if (gap > bestGap) {
        bestGap = gap;
        bestX = cx;
        bestY = cy;
      }
      if (gap > 0) break; // first clear candidate wins — the museum position
    }

    plate.root.style.transform = `translate3d(${Math.round(bestX)}px, ${Math.round(bestY)}px, 0)`;

    // terminal tick: a short crimson rule out of the plate, running TOWARD the
    // formation and stopped dead at its silhouette.
    const tickY = Math.round(bestY + plate.h - 6);
    const toLeft = stage.formLive && (stage.formX0 + stage.formX1) / 2 < bestX + plate.w / 2;
    let len = 0;
    let tickX = 0;
    if (stage.formLive) {
      if (toLeft) {
        const from = Math.round(bestX - 14);
        const limit = fy0 < tickY && fy1 > tickY ? Math.max(sx0, fx1) : sx0;
        len = Math.min(72, from - limit);
        tickX = from - Math.max(0, len);
      } else {
        const from = Math.round(bestX + plate.w + 14);
        const limit = fy0 < tickY && fy1 > tickY ? Math.min(sx1, fx0) : sx1;
        len = Math.min(72, limit - from);
        tickX = from;
      }
    }
    let tickOn = 0;
    if (len >= 16) {
      plate.tick.style.width = `${Math.round(len)}px`;
      plate.tick.style.transform = `translate(${Math.round(tickX)}px, ${tickY}px)`;
      plate.dot.style.transform = `translate(${Math.round(toLeft ? tickX : tickX + len)}px, ${tickY}px)`;
      tickOn = 1;
    }
    setOpacity(gate, tickOn);
  });

  return null;
}
