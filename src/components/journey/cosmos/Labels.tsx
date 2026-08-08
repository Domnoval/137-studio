'use client';

// cosmos/Labels.tsx — OWNED BY COSMOS agent.
//
// THE OCCLUSION-AWARE LABEL SYSTEM.
//
// Nothing in the cosmos is allowed to print on top of a painting, and nothing
// in the cosmos is allowed to print underneath one either. Every frame this
// module:
//   1. reads the projected screen rect of every live slab (Slabs.tsx writes
//      them into cosmosShared.slabRects),
//   2. picks a candidate list FOR THE CURRENT SHOT TYPE — the caption anchor
//      moves with the framing (WIDE → bottom-left, MACRO → the clear right
//      column, PULL-BACK → suppressed) so the eye is re-directed at every cut
//      instead of parked in one corner for a third of the site,
//   3. takes the first placement that is fully inside the safe frame AND
//      clears every slab rect by at least CLEAR px AND clears every
//      already-placed label,
//   4. draws the caption's red terminal rule as a SHORT TICK out of the
//      caption itself, clipped to stop CLEAR px short of any artwork
//      silhouette in its path — the rule terminates at the painting, it never
//      runs beneath it,
//   5. publishes its own type boxes to the exclusion table so the equation
//      glyph field inside the canvas culls anything that would land in a word
//      gap,
//   6. and hard-unmounts the entire layer at the chapter boundary: past 61.8%
//      nothing here renders at all — not at 12% opacity, not a leader, not a
//      node square.
//
// The taxonomy split, restated as a hierarchy rather than as two unrelated
// widgets:
//   ART  — the museum caption: red rule, tracked mono title, medium/year/index
//          metadata, red tick terminal. The primary voice.
//   APPS — the same device, subordinate: half-length red rule, smaller tracked
//          mono name with an external tick, description in the metadata
//          weight. No box, no brackets — a debug panel was never the intent.
//          One at a time, never within 120px vertically of the caption, and
//          only in the WIDE shot.
//
// All DOM is imperative — created once, mutated inside useFrame. Zero React
// re-renders, zero per-frame allocation.

import { useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useJourney } from '../JourneyContext';
import { phaseProgress } from '../journey-utils';
import { cosmosShared, rectsOverlap, smoothstep, type ScreenRect } from './shared';
import { APP_NODES, SLABS, shotMix, type ShotMix } from './cosmos-data';
import { pushExclusion, resetExclusion } from './exclusion';

/** Which app node the pointer is over (-1 = none). AppsConstellation reads it. */
export const appHover = { index: -1 };

/**
 * The ONE app node that currently carries a placed chip, and how present that
 * chip is. AppsConstellation renders only this node: a wireframe solid with no
 * name attached is decoration, and a node that outlives its label is litter.
 */
export const appActive = { index: -1, o: 0 };

const MONO = "'JetBrains Mono', monospace";

/** Minimum clearance between any type and any artwork silhouette, in px. */
const CLEAR = 32;
/** A chip may never come within this many px, vertically, of the caption. */
const CHIP_KEEPOUT_Y = 120;
// (horizontal inflation is unnecessary: the keep-out is a full-width band)
/** Scroll progress at which THE COSMOS's type layer stops existing. */
const CHAPTER_END = 0.618;

const CSS = `
.cx-layer, .cx-layer * { box-sizing: border-box; }
.cx-l { position:absolute; left:0; top:0; width:0; height:0; opacity:0;
        transition: opacity .26s linear; }

/* ---- ART: bare museum caption, left-aligned, no box ---- */
.cx-cap { position:absolute; white-space:nowrap; text-align:left; }
.cx-rule { width:28px; height:1px; background:#c41230; margin-bottom:10px; }
.cx-title { font-family:${MONO}; font-weight:400; font-size:.74rem; line-height:1;
            letter-spacing:.19em; text-transform:uppercase; color:#e8e4dc; }
.cx-meta { margin-top:8px; font-family:${MONO}; font-size:.55rem; line-height:1.1;
           letter-spacing:.15em; text-transform:uppercase; color:#a09890; }
/* the terminal: a short red rule out of the caption, clipped at the artwork */
.cx-tick { position:absolute; height:1px; background:rgba(196,18,48,.85);
           transform-origin:0 50%; }
.cx-dot { position:absolute; width:4px; height:4px; margin:-2px 0 0 0;
          background:#c41230; }

/* ---- APPS: the same device, subordinate. No box. ---- */
.cx-app { position:absolute; white-space:nowrap; text-align:left;
          pointer-events:auto; cursor:pointer; }
.cx-app-rule { width:14px; height:1px; background:#c41230; margin-bottom:9px;
               opacity:.75; transition:width .3s ease, opacity .3s ease; }
.cx-app-name { font-family:${MONO}; font-size:.6rem; line-height:1;
               letter-spacing:.2em; text-transform:uppercase; color:#a8a49c;
               transition:color .3s ease; }
.cx-app-ext { margin-left:9px; font-family:${MONO}; font-size:.52rem; color:#6f6a63;
              transition:color .3s ease; }
.cx-app-desc { margin-top:7px; font-family:${MONO}; font-size:.5rem; line-height:1.1;
               letter-spacing:.14em; text-transform:uppercase; color:#6f6a63; }
.cx-app:hover .cx-app-name, .cx-app:hover .cx-app-ext { color:#e8e4dc; }
.cx-app:hover .cx-app-rule { width:26px; opacity:1; }
.cx-lead { position:absolute; height:1px; transform-origin:0 50%;
           background:rgba(160,168,190,.26); }
`;

interface Label {
  root: HTMLDivElement;
  body: HTMLDivElement;
  w: number;
  h: number;
  opacity: number;
  shown: boolean;
}

interface ArtLabel extends Label {
  tick: HTMLDivElement;
  dot: HTMLDivElement;
  title: HTMLDivElement;
  meta: HTMLDivElement;
  shownIndex: number;
}

interface AppLabel extends Label {
  lead: HTMLDivElement;
}

/** Candidate plate offsets (top-left relative to anchor), in preference order. */
function appCandidates(w: number, h: number, out: number[][]): number[][] {
  const g = 34;
  out.length = 0;
  out.push([g, -h / 2]);
  out.push([-g - w, -h / 2]);
  out.push([g, -h - g * 0.5]);
  out.push([-g - w, -h - g * 0.5]);
  out.push([g, g * 0.5]);
  out.push([-g - w, g * 0.5]);
  out.push([-w / 2, g]);
  out.push([-w / 2, -h - g]);
  out.push([g * 2.6, -h / 2]);
  out.push([-g * 2.6 - w, -h / 2]);
  out.push([-w / 2, g * 2.6]);
  out.push([-w / 2, -h - g * 2.6]);
  return out;
}

/** Un-smoothed scroll progress — CONTRACTION's choreography runs off this. */
function rawScroll(): number {
  if (typeof window === 'undefined') return 0;
  const max = document.documentElement.scrollHeight - window.innerHeight;
  return max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
}

const scratch = { x0: 0, y0: 0, x1: 0, y1: 0 };
const placed: { x0: number; y0: number; x1: number; y1: number }[] = [];
const anchorV = new THREE.Vector3();
const candBuf: number[][] = [];
const artCands: number[][] = [];
const mix: ShotMix = { wide: 1, macro: 0, pullback: 0 };

export function Labels() {
  const built = useRef(false);
  const artRef = useRef<ArtLabel | null>(null);
  const appsRef = useRef<AppLabel[]>([]);
  // The driver's useFrame must be the LAST subscriber so it reads slab screen
  // rects written this same frame. R3F keeps insertion order, so we simply do
  // not mount it until every slab has mounted (and subscribed).
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    let raf = 0;
    const t0 = performance.now();
    const poll = () => {
      if (cosmosShared.slabsLive >= SLABS.length || performance.now() - t0 > 8000) {
        setArmed(true);
      } else {
        raf = requestAnimationFrame(poll);
      }
    };
    poll();
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    let raf = 0;
    let disposed = false;
    let cleanup: (() => void) | undefined;

    const build = (layer: HTMLDivElement) => {
      built.current = true;
      layer.classList.add('cx-layer');

      const style = document.createElement('style');
      style.textContent = CSS;
      layer.appendChild(style);

      const mkRoot = () => {
        const root = document.createElement('div');
        root.className = 'cx-l';
        layer.appendChild(root);
        return root;
      };

      // ---- art caption ----
      {
        const root = mkRoot();
        const body = document.createElement('div');
        body.className = 'cx-cap';
        const rule = document.createElement('div');
        rule.className = 'cx-rule';
        const title = document.createElement('div');
        title.className = 'cx-title';
        const meta = document.createElement('div');
        meta.className = 'cx-meta';
        body.append(rule, title, meta);
        const tick = document.createElement('div');
        tick.className = 'cx-tick';
        const dot = document.createElement('div');
        dot.className = 'cx-dot';
        root.append(body, tick, dot);
        artRef.current = {
          root,
          body,
          tick,
          dot,
          title,
          meta,
          w: 0,
          h: 0,
          opacity: 0,
          shown: true,
          shownIndex: -1,
        };
      }

      // ---- app captions ----
      appsRef.current = APP_NODES.map((node, i) => {
        const root = mkRoot();
        const lead = document.createElement('div');
        lead.className = 'cx-lead';
        const body = document.createElement('div');
        body.className = 'cx-app';
        body.setAttribute('role', 'link');
        body.setAttribute('tabindex', '-1');
        body.setAttribute('aria-label', `${node.name} — ${node.desc} (opens in a new tab)`);
        const rule = document.createElement('div');
        rule.className = 'cx-app-rule';
        const nameRow = document.createElement('div');
        const name = document.createElement('span');
        name.className = 'cx-app-name';
        name.textContent = node.name;
        const ext = document.createElement('span');
        ext.className = 'cx-app-ext';
        ext.textContent = '↗';
        nameRow.append(name, ext);
        const desc = document.createElement('div');
        desc.className = 'cx-app-desc';
        desc.textContent = node.desc;
        body.append(rule, nameRow, desc);
        body.addEventListener('click', (e) => {
          e.stopPropagation();
          window.open(node.url, '_blank', 'noopener,noreferrer');
        });
        body.addEventListener('pointerenter', () => {
          appHover.index = i;
        });
        body.addEventListener('pointerleave', () => {
          if (appHover.index === i) appHover.index = -1;
        });
        root.append(lead, body);
        return { root, body, lead, w: 0, h: 0, opacity: 0, shown: true };
      });

      const measure = () => {
        const art = artRef.current;
        if (art) {
          const r = art.body.getBoundingClientRect();
          art.w = r.width;
          art.h = r.height;
        }
        for (const l of appsRef.current) {
          const r = l.body.getBoundingClientRect();
          l.w = r.width;
          l.h = r.height;
        }
      };
      // measure now, then again once webfont metrics land
      measure();
      document.fonts?.ready?.then(measure).catch(() => undefined);
      window.addEventListener('resize', measure);
      cleanup = () => window.removeEventListener('resize', measure);
    };

    // the layer div is a sibling of the <Canvas>; its ref may attach a tick
    // after this 3D component mounts, so wait for it rather than racing.
    const wait = () => {
      if (disposed) return;
      const layer = cosmosShared.labelLayer;
      if (layer && !built.current) build(layer);
      else if (!layer) raf = requestAnimationFrame(wait);
    };
    wait();

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      cleanup?.();
    };
  }, []);

  return armed ? <LabelDriver artRef={artRef} appsRef={appsRef} /> : null;
}

interface DriverProps {
  artRef: React.RefObject<ArtLabel | null>;
  appsRef: React.RefObject<AppLabel[]>;
}

function LabelDriver({ artRef, appsRef }: DriverProps) {
  const { progressRef } = useJourney();

  useFrame((state) => {
    const art = artRef.current;
    const apps = appsRef.current;
    if (!art || apps.length === 0) return;

    const W = state.size.width;
    const H = state.size.height;
    const p = progressRef.current ?? 0;
    const rawP = rawScroll();

    /* ---------------------------------------- 0. the chapter boundary ---- */
    // Past 61.8% this layer does not exist. Not faded, not 12% — display:none,
    // caption and chips and leaders together, so nothing half-dead can survive
    // into the CONTRACTION.
    const dead = p >= CHAPTER_END || rawP >= CHAPTER_END;
    const setShown = (l: Label, on: boolean) => {
      if (l.shown === on) return;
      l.shown = on;
      l.root.style.display = on ? '' : 'none';
    };
    if (dead) {
      resetExclusion();
      appActive.index = -1;
      appActive.o = 0;
      setShown(art, false);
      for (const l of apps) setShown(l, false);
      return;
    }
    setShown(art, true);
    for (const l of apps) setShown(l, true);

    const cp = phaseProgress(p, 'contraction');
    // labels belong to the cosmos only: absent during the dive, gone by contraction
    // Raw scroll is also consulted for the exit: CONTRACTION is choreographed off
    // raw scroll, so labels must clear the stage on the same clock or a caption
    // can still be up when the sigil starts drawing.
    const rawCp = phaseProgress(rawP, 'contraction');
    shotMix(phaseProgress(p, 'cosmos'), mix);
    // At a cut the caption does not slide across the frame — it goes out and
    // comes back at the new anchor. An edit, not a drift.
    const settle = Math.max(mix.wide, mix.macro, mix.pullback);
    const gate =
      smoothstep(0.163, 0.198, p) *
      (1 - smoothstep(0, 0.14, cp)) *
      (1 - smoothstep(0.05, 0.28, rawCp)) *
      smoothstep(0.56, 0.92, settle);
    const isMacro = mix.macro > 0.5;
    const isPullback = mix.pullback > 0.5;

    // safe frame — clear of the scroll rail (right) and the phase mark (bottom-left)
    const sx0 = 56;
    const sy0 = 56;
    const sx1 = W - 104;
    const sy1 = H - 70;

    const rects = cosmosShared.slabRects;
    placed.length = 0;
    resetExclusion();

    const fits = (
      x: number,
      y: number,
      w: number,
      h: number,
      clear: number,
    ): boolean => {
      if (x < sx0 || y < sy0 || x + w > sx1 || y + h > sy1) return false;
      scratch.x0 = x;
      scratch.y0 = y;
      scratch.x1 = x + w;
      scratch.y1 = y + h;
      for (let i = 0; i < rects.length; i++) {
        const r = rects[i];
        if (r.live && rectsOverlap(scratch, r, clear + r.pad)) return false;
      }
      for (let i = 0; i < placed.length; i++) {
        if (rectsOverlap(scratch, placed[i], 12)) return false;
      }
      return true;
    };

    const hide = (label: Label) => {
      if (label.opacity !== 0) {
        label.opacity = 0;
        label.root.style.opacity = '0';
      }
    };

    /* ------------------------------------------------ 1. the art caption */
    const heroIndex = cosmosShared.nearest;
    const heroRect: ScreenRect | undefined = rects[heroIndex];
    const heroWork = SLABS[heroIndex]?.work;
    let artDone = false;

    if (
      !isPullback &&
      gate > 0.02 &&
      heroRect?.live &&
      heroWork &&
      cosmosShared.heroDom > 0.32 &&
      art.w > 0
    ) {
      if (art.shownIndex !== heroIndex) {
        art.shownIndex = heroIndex;
        art.title.textContent = heroWork.title;
        art.meta.textContent = `${heroWork.medium.split(' on ')[0]} · ${heroWork.year} · ${String(
          heroIndex + 1,
        ).padStart(2, '0')}/${String(SLABS.length).padStart(2, '0')}`;
        const r = art.body.getBoundingClientRect();
        if (r.width > 0) {
          art.w = r.width;
          art.h = r.height;
        }
      }
      const g = CLEAR + heroRect.pad;
      artCands.length = 0;
      if (isMacro) {
        // MACRO: the canvas bleeds off three edges and leaves a clear column on
        // the right. The label lives at the TOP of it — the eye lands high and
        // right, the opposite corner from the WIDE shot it just left.
        const col = heroRect.x1 + g + 12;
        artCands.push([col, sy0 + 30]);
        artCands.push([sx1 - art.w, sy0 + 30]);
        artCands.push([col, sy0 + 118]);
        artCands.push([sx1 - art.w, sy0 + 118]);
        artCands.push([col, sy1 - art.h - 24]);
        artCands.push([sx0, sy1 - art.h]);
      } else {
        // WIDE: the museum position — low-left, on a fixed bottom baseline, so
        // the establishing shots read as one continuous plate sequence. When
        // the subject itself occupies that corner the plate goes to the work's
        // own edge instead: a caption stranded in the far corner of a busy
        // frame gets read as belonging to whatever is nearest it.
        const base = sy1 - art.h;
        artCands.push([sx0, base]);
        artCands.push([Math.min(Math.max(heroRect.x0, sx0), sx1 - art.w), base]);
        artCands.push([heroRect.x1 + g, heroRect.y1 - art.h]);
        artCands.push([heroRect.x0 - art.w - g, heroRect.y1 - art.h]);
        artCands.push([heroRect.x0, heroRect.y1 + g + 2]);
        artCands.push([sx1 - art.w, base]);
        artCands.push([sx0, sy0 + 40]);
        artCands.push([sx1 - art.w, sy0 + 40]);
      }
      for (const [x, y] of artCands) {
        if (fits(x, y, art.w, art.h, CLEAR)) {
          const target = gate * Math.min(1, 0.25 + 0.9 * cosmosShared.heroDom);
          art.body.style.transform = `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`;

          // ---- the terminal rule: a short tick out of the caption, running
          // TOWARD the work it names and stopped dead at that work's
          // silhouette. It never runs under a painting, and it never points
          // away from the one it belongs to.
          const tickY = Math.round(y + art.h - 6);
          const toLeft = (heroRect.x0 + heroRect.x1) / 2 < x + art.w / 2;
          let len: number;
          let tickX: number;
          if (toLeft) {
            const from = Math.round(x - 14);
            let limit = sx0;
            for (let i = 0; i < rects.length; i++) {
              const r = rects[i];
              if (!r.live) continue;
              if (r.y0 - CLEAR < tickY && r.y1 + CLEAR > tickY && r.x1 < from) {
                limit = Math.max(limit, r.x1 + CLEAR + r.pad);
              }
            }
            len = Math.min(72, from - limit);
            tickX = from - Math.max(0, len);
          } else {
            const from = Math.round(x + art.w + 14);
            let limit = sx1;
            for (let i = 0; i < rects.length; i++) {
              const r = rects[i];
              if (!r.live) continue;
              if (r.y0 - CLEAR < tickY && r.y1 + CLEAR > tickY && r.x0 > from) {
                limit = Math.min(limit, r.x0 - CLEAR - r.pad);
              }
            }
            len = Math.min(72, limit - from);
            tickX = from;
          }
          if (len >= 16) {
            art.tick.style.width = `${Math.round(len)}px`;
            art.tick.style.transform = `translate(${Math.round(tickX)}px, ${tickY}px)`;
            art.tick.style.opacity = '1';
            art.dot.style.transform = `translate(${Math.round(
              toLeft ? tickX : tickX + len,
            )}px, ${tickY}px)`;
            art.dot.style.opacity = '1';
          } else {
            len = 0;
            art.tick.style.opacity = '0';
            art.dot.style.opacity = '0';
          }

          art.root.style.opacity = target.toFixed(3);
          art.opacity = target;
          placed.push({ x0: x, y0: y, x1: x + art.w, y1: y + art.h });
          // the glyph field must not draw inside the caption's word gaps
          pushExclusion(
            len > 0 && toLeft ? tickX : x,
            y,
            len > 0 && !toLeft ? tickX + len : x + art.w,
            y + art.h,
          );
          artDone = true;
          break;
        }
      }
    }
    if (!artDone) hide(art);

    /* ---------------------------------------------- 2. the app waypoints */
    // A chip is a WIDE-shot element. It has no business over a macro canvas or
    // inside the composed triangle, and two of them bracketing a caption
    // collapses the hierarchy — so exactly one shows at a time.
    const appGate = gate * (1 - mix.macro) * (1 - mix.pullback);

    // The caption's keep-out is a full-width BAND, not a box: two chips
    // bracketing a caption at the same height collapse the hierarchy even when
    // they are half the frame away horizontally.
    if (artDone) {
      const c = placed[placed.length - 1];
      placed.push({
        x0: -1e5,
        y0: c.y0 - CHIP_KEEPOUT_Y,
        x1: 1e5,
        y1: c.y1 + CHIP_KEEPOUT_Y,
      });
    }

    let best = -1;
    let bestVis = 0.04;
    const visOf = (i: number): number => {
      const rel = state.camera.position.z - APP_NODES[i].z;
      return appGate * smoothstep(4.2, 7.5, rel) * smoothstep(15.5, 11, rel);
    };
    for (let i = 0; i < apps.length; i++) {
      const v = visOf(i);
      if (v > bestVis) {
        bestVis = v;
        best = i;
      }
    }

    // the frame's optical centre belongs to the artwork, never to a chip
    const cxLo = W * 0.24;
    const cxHi = W * 0.76;
    const cyLo = H * 0.2;
    const cyHi = H * 0.8;

    appActive.index = -1;
    appActive.o = 0;

    for (let i = 0; i < apps.length; i++) {
      const label = apps[i];
      if (i !== best || label.w === 0) {
        hide(label);
        continue;
      }
      const node = APP_NODES[i];
      anchorV.set(node.x, node.y, node.z).project(state.camera);
      if (anchorV.z > 1) {
        hide(label);
        continue;
      }
      const ax = (anchorV.x * 0.5 + 0.5) * W;
      const ay = (-anchorV.y * 0.5 + 0.5) * H;
      if (ax < -160 || ax > W + 160 || ay < -160 || ay > H + 160) {
        hide(label);
        continue;
      }
      const cands = appCandidates(label.w, label.h, candBuf);
      let done = false;
      for (const [ox, oy] of cands) {
        const x = ax + ox;
        const y = ay + oy;
        const mx = x + label.w / 2;
        const my = y + label.h / 2;
        if (mx > cxLo && mx < cxHi && my > cyLo && my < cyHi) continue;
        if (!fits(x, y, label.w, label.h, CLEAR)) continue;
        label.body.style.transform = `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`;
        // leader: anchor -> nearest point on the plate rect. No node square:
        // the wireframe solid in the scene is the terminal.
        const px = Math.max(x, Math.min(ax, x + label.w));
        const py = Math.max(y, Math.min(ay, y + label.h));
        const dx = px - ax;
        const dy = py - ay;
        const len = Math.hypot(dx, dy);
        label.lead.style.width = `${Math.max(0, len - 6).toFixed(1)}px`;
        label.lead.style.transform = `translate(${ax}px, ${ay}px) rotate(${Math.atan2(
          dy,
          dx,
        )}rad)`;
        label.root.style.opacity = bestVis.toFixed(3);
        label.opacity = bestVis;
        placed.push({ x0: x, y0: y, x1: x + label.w, y1: y + label.h });
        pushExclusion(x, y, x + label.w, y + label.h);
        appActive.index = i;
        appActive.o = bestVis;
        done = true;
        break;
      }
      // no guaranteed-empty region → fade out. Never overlap.
      if (!done) hide(label);
    }
  });

  return null;
}
