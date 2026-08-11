'use client';

// cosmos/FormationPlate.tsx — OWNED BY COSMOS agent.
//
// TWO PLATES THAT FILL THE BEATS THE TYPE LAYER LEFT EMPTY.
//
// 1. THE FORMATION PLATE — the caption track does not stop when the corridor
//    does (below).
// 2. THE FIRST MACRO'S COUNTERWEIGHT — the split module, composed to one level
//    of intent.
//
// ONE MODULE, TWO LEVELS OF INTENT. The site cuts to the same split screen
// twice: canvas bled off three edges, a matted crop terminating on one
// vertical, a dark panel to its right. MEASURED at 1440×900 — the second
// instance (46%) carries a divide hairline, a 7.4rem plate number at 0.34 ink
// and a caption on the baseline; the first (31%) carried two lines of 10px mono
// pinned at the top of the panel and then 780px of nothing. Same module, one
// instance finished and one not.
//
// So the first instance gets the same furniture on the MIRRORED axis: its
// caption lives at the top of the column, so its divide runs the same seam and
// its plate number sits LOW. Same grammar, same ink, same grid — the pair now
// reads as one device stated twice rather than as a module and a draft of it.
//
// AND IT COVERS EVERY INSTANCE, NOT THE TWO A 14-STEP SWEEP LANDS ON. Stepped
// at 1% through both macro windows, the second instance turns out to drop its
// own number for three consecutive frames (42%, 43%, 44%: divide up, caption
// up, panel empty) because Labels' fit test refuses rather than clamps while
// the crop is still settling. So this plate also stands in for the second
// instance whenever that one is not drawing — read off the live element, so it
// can never double up, and it retires itself the moment Labels takes over.
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
import { SLABS, shotMix, type ShotMix } from './cosmos-data';

const MONO = "'JetBrains Mono', monospace";
/** Same clearance law the museum caption obeys. */
const CLEAR = 32;
/** Scroll past which THE COSMOS's type layer stops existing (matches Labels). */
const CHAPTER_END = 0.618;
/** Cosmos-phase boundary between the two macro windows (matches Labels.tsx). */
const SECOND_MACRO = 0.45;
/** Ink of the plate number. Identical to Labels' GHOST_INK — same mark. */
const GHOST_INK = 0.34;

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
/* ---- the FIRST split screen: the same furniture, mirrored axis ---- */
.fp-divide { position:absolute; width:1px; top:0; left:0; opacity:0;
             background:rgba(232,228,220,.16); }
.fp-ghost { position:absolute; top:0; left:0; white-space:nowrap; opacity:0;
            color:#e8e4dc; }
.fp-ghost-n { font-family:${MONO}; font-weight:200; font-size:7.4rem; line-height:.86;
              letter-spacing:.005em; }
.fp-ghost-t { margin-top:14px; font-family:${MONO}; font-weight:400; font-size:.5rem;
              line-height:1; letter-spacing:.24em; text-transform:uppercase; }
`;

/**
 * The panel number states the CROP, not the index. See Labels.tsx (GHOST_LEGEND):
 * the caption two tiers below already prints the index, so a 7.4rem restatement
 * of it was the loudest thing in the dark half saying nothing new. Both
 * instances of the split screen now measure the same thing the same way.
 */
const GHOST_LEGEND = 'of plate in frame';

function plateShare(x0: number, y0: number, x1: number, y1: number, W: number, H: number): number {
  const fw = x1 - x0;
  const fh = y1 - y0;
  if (!(fw > 0) || !(fh > 0)) return 0;
  const vw = Math.max(0, Math.min(x1, W) - Math.max(x0, 0));
  const vh = Math.max(0, Math.min(y1, H) - Math.max(y0, 0));
  return Math.min(1, (vw * vh) / (fw * fh));
}

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
  divide: HTMLDivElement;
  ghost: HTMLDivElement;
  ghostN: HTMLDivElement;
  w: number;
  h: number;
  opacity: number;
  tickOn: number;
  /** what the plate number currently prints, and its measured box */
  ghostText: string;
  ghostW: number;
  ghostH: number;
  ghostOn: number;
  divideOn: number;
  /** Labels' own furniture, so this plate can never double up with it */
  cxGhost: HTMLElement | null;
  cxDivide: HTMLElement | null;
}

const cands: number[][] = [];
const mix: ShotMix = { wide: 1, macro: 0, pullback: 0 };

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
      const divide = document.createElement('div');
      divide.className = 'fp-divide';
      const ghost = document.createElement('div');
      ghost.className = 'fp-ghost';
      const ghostN = document.createElement('div');
      ghostN.className = 'fp-ghost-n';
      const ghostT = document.createElement('div');
      ghostT.className = 'fp-ghost-t';
      ghostT.textContent = GHOST_LEGEND;
      ghost.append(ghostN, ghostT);
      layer.append(root, tick, dot, divide, ghost);

      const r = root.getBoundingClientRect();
      plateRef.current = {
        root,
        tick,
        dot,
        divide,
        ghost,
        ghostN,
        w: r.width || 220,
        h: r.height || 46,
        opacity: 0,
        tickOn: 0,
        ghostText: '',
        ghostW: 0,
        ghostH: 0,
        ghostOn: -1,
        divideOn: -1,
        cxGhost: null,
        cxDivide: null,
      };

      cleanup = () => {
        style.remove();
        root.remove();
        tick.remove();
        dot.remove();
        divide.remove();
        ghost.remove();
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

    /* ---------------- the FIRST macro's counterweight (see header) -------- */
    const cosP = phaseProgress(p, 'cosmos');
    shotMix(cosP, mix);
    const W = state.size.width;
    const H = state.size.height;
    const heroIndex = cosmosShared.nearest;
    const heroRect = cosmosShared.slabRects[heroIndex];
    // Exactly the crop Labels.tsx calls "terminating": bled off the left and
    // both horizontals, ending on one vertical inside the frame. Anything else
    // is not this module and gets no furniture.
    const terminating =
      !!heroRect?.live &&
      heroRect.x0 < 8 &&
      heroRect.x1 > W * 0.2 &&
      heroRect.x1 < W - 8 &&
      heroRect.y0 < 8 &&
      heroRect.y1 > H - 8;
    const second = cosP >= SECOND_MACRO;
    // Labels owns the second instance's furniture. Read its inline opacity (no
    // layout, no reflow) and stand down the instant it is drawing.
    if (!plate.cxGhost) plate.cxGhost = document.querySelector('.cx-ghost');
    if (!plate.cxDivide) plate.cxDivide = document.querySelector('.cx-divide');
    const labelsOn = second && parseFloat(plate.cxGhost?.style.opacity || '0') > 0.02;
    // the seam hairline is one line, whoever draws it: two coincident 0.16
    // strokes composite to 0.29 and the divide stops matching its own spec
    const labelsRule = second && parseFloat(plate.cxDivide?.style.opacity || '0') > 0.02;
    const macroGate =
      !labelsOn && terminating && heroRect
        ? smoothstep(0.5, 0.86, mix.macro) *
          (1 - smoothstep(0, 0.12, conP)) *
          (p < CHAPTER_END + 0.005 ? 1 : 0)
        : 0;
    if (macroGate < 0.01) {
      if (plate.ghostOn !== 0) {
        plate.ghostOn = 0;
        plate.divideOn = 0;
        plate.ghost.style.opacity = '0';
        plate.divide.style.opacity = '0';
      }
    } else if (heroRect) {
      const sx1 = W - 104;
      const sy0 = 56;
      const sy1 = H - 70;
      const dx = Math.round(heroRect.x1 + heroRect.pad + 26);
      let divideOn = 0;
      if (!labelsRule && dx > 56 && dx < sx1 - 60) {
        plate.divide.style.transform = `translate(${dx}px, ${sy0}px)`;
        plate.divide.style.height = `${Math.round(sy1 - sy0)}px`;
        divideOn = macroGate;
      }
      if (divideOn !== plate.divideOn) {
        plate.divideOn = divideOn;
        plate.divide.style.opacity = divideOn.toFixed(3);
      }
      const num = `${Math.max(
        1,
        Math.round(plateShare(heroRect.x0, heroRect.y0, heroRect.x1, heroRect.y1, W, H) * 100),
      )}%`;
      // …and re-measure whenever the box is missing, not only when the text
      // changes: the first macro frame measured 0 (the layer had not had a
      // layout pass yet) and the guard then never asked again, so the FIRST
      // instance of the module in the sweep printed a divide and no number.
      if (plate.ghostText !== num || plate.ghostW <= 0) {
        plate.ghostText = num;
        plate.ghostN.textContent = num;
        const gr = plate.ghost.getBoundingClientRect();
        plate.ghostW = gr.width;
        plate.ghostH = gr.height;
      }
      // MIRRORED AXIS. Labels puts MACRO II's caption on the baseline and its
      // number high (0.30 H); this instance's caption is at the top of the
      // column, so its number sits low — the pair reads as one device seen from
      // both ends instead of the same layout twice. Standing in for the second
      // instance, it takes THAT instance's axis rather than its own.
      // left edge flush with the caption's own column: one grid, two tiers
      const col = heroRect.x1 + heroRect.pad + CLEAR + 12;
      const gx = Math.round(Math.min(Math.max(col, dx + 12), W - 104 - plate.ghostW));
      const gy = Math.round(H * (second ? 0.3 : 0.54));
      const fits =
        plate.ghostW > 0 && gx + plate.ghostW < sx1 + 12 && gy + plate.ghostH < sy1;
      const ghostOn = fits ? macroGate * GHOST_INK : 0;
      if (fits) plate.ghost.style.transform = `translate(${gx}px, ${gy}px)`;
      if (Math.abs(ghostOn - plate.ghostOn) > 0.003) {
        plate.ghostOn = ghostOn;
        plate.ghost.style.opacity = ghostOn.toFixed(3);
      }
    }

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
