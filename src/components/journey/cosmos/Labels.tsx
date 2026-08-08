'use client';

// cosmos/Labels.tsx — OWNED BY COSMOS agent.
//
// THE OCCLUSION-AWARE LABEL SYSTEM.
//
// Nothing in the cosmos is allowed to print on top of a painting. Every frame
// this module:
//   1. reads the projected screen rect of every live slab (Slabs.tsx writes
//      them into cosmosShared.slabRects),
//   2. projects each label's 3D anchor to screen space,
//   3. walks an ordered list of candidate placements around that anchor and
//      takes the first one that is fully inside the safe frame AND clears every
//      slab rect and every already-placed label rect,
//   4. draws a 1px leader from the anchor to the chosen plate,
//   5. and if no clear region exists, fades the label out entirely rather than
//      overlapping anything.
//
// It also enforces the taxonomy split:
//   ART  — a bare museum caption (red hairline + title + medium/year), shown
//          only for the staged hero slab, on approach. Never free-floating.
//   APPS — a bracketed wireframe plate with a node mark and an external-link
//          tick: dimmer, smaller, boxed, obviously clickable. Never confusable
//          with a painting title.
//
// All DOM is imperative — created once, mutated inside useFrame. Zero React
// re-renders, zero per-frame allocation.

import { useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useJourney } from '../JourneyContext';
import { phaseProgress } from '../journey-utils';
import { cosmosShared, rectsOverlap, smoothstep, type ScreenRect } from './shared';
import { APP_NODES, SLABS } from './cosmos-data';

/** Which app node the pointer is over (-1 = none). AppsConstellation reads it. */
export const appHover = { index: -1 };

const MONO = "'JetBrains Mono', monospace";

const CSS = `
.cx-layer, .cx-layer * { box-sizing: border-box; }
.cx-l { position:absolute; left:0; top:0; width:0; height:0; opacity:0;
        transition: opacity .26s linear; }
.cx-dot { position:absolute; }
.cx-dot-art { width:5px; height:5px; margin:-3px 0 0 -3px; background:#c41230; }
.cx-dot-app { width:7px; height:7px; margin:-4px 0 0 -4px;
              border:1px solid rgba(160,168,190,.6); }
.cx-lead { position:absolute; height:1px; transform-origin:0 50%; }
.cx-lead-art { background:rgba(196,18,48,.5); }
.cx-lead-app { background:rgba(160,168,190,.32); }

/* ---- ART: bare museum caption, left-aligned, no box ---- */
.cx-cap { position:absolute; white-space:nowrap; text-align:left; }
.cx-rule { width:28px; height:1px; background:#c41230; margin-bottom:10px; }
.cx-title { font-family:${MONO}; font-weight:400; font-size:.74rem; line-height:1;
            letter-spacing:.19em; text-transform:uppercase; color:#e8e4dc; }
.cx-meta { margin-top:8px; font-family:${MONO}; font-size:.55rem; line-height:1.1;
           letter-spacing:.15em; text-transform:uppercase; color:#a09890; }

/* ---- APPS: bracketed wireframe plate, dimmer + smaller than art ---- */
.cx-plate { position:absolute; white-space:nowrap; padding:9px 15px 10px;
            border:1px solid rgba(160,168,190,.14);
            background:rgba(14,12,10,.72); pointer-events:auto; cursor:pointer;
            transition:border-color .28s ease, background .28s ease; }
.cx-plate:hover { border-color:rgba(232,228,220,.34); background:rgba(20,18,17,.86); }
.cx-brk { position:absolute; width:7px; height:7px; border:0 solid rgba(160,168,190,.62);
          transition:border-color .28s ease; }
.cx-plate:hover .cx-brk { border-color:rgba(232,228,220,.9); }
.cx-brk-tl { left:-1px; top:-1px; border-left-width:1px; border-top-width:1px; }
.cx-brk-tr { right:-1px; top:-1px; border-right-width:1px; border-top-width:1px; }
.cx-brk-bl { left:-1px; bottom:-1px; border-left-width:1px; border-bottom-width:1px; }
.cx-brk-br { right:-1px; bottom:-1px; border-right-width:1px; border-bottom-width:1px; }
.cx-row { display:flex; align-items:baseline; gap:9px; }
.cx-glyph { font-family:${MONO}; font-size:.58rem; color:#8f96a8; }
.cx-name { font-family:${MONO}; font-size:.58rem; line-height:1;
           letter-spacing:.2em; text-transform:uppercase; color:#b3b9c8; }
.cx-ext { font-family:${MONO}; font-size:.52rem; color:#6f7486; }
.cx-desc { margin-top:6px; font-family:${MONO}; font-size:.5rem; line-height:1.1;
           letter-spacing:.11em; color:#6f7486; }
.cx-plate:hover .cx-name { color:#e8e4dc; }
`;

interface Label {
  root: HTMLDivElement;
  body: HTMLDivElement;
  lead: HTMLDivElement;
  dot: HTMLDivElement;
  w: number;
  h: number;
  opacity: number;
}

interface ArtLabel extends Label {
  title: HTMLDivElement;
  meta: HTMLDivElement;
  shownIndex: number;
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

export function Labels() {
  const built = useRef(false);
  const artRef = useRef<ArtLabel | null>(null);
  const appsRef = useRef<Label[]>([]);
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

    const mkRoot = (leadClass: string, dotClass: string) => {
      const root = document.createElement('div');
      root.className = 'cx-l';
      const dot = document.createElement('div');
      dot.className = `cx-dot ${dotClass}`;
      const lead = document.createElement('div');
      lead.className = `cx-lead ${leadClass}`;
      root.appendChild(lead);
      root.appendChild(dot);
      layer.appendChild(root);
      return { root, lead, dot };
    };

    // ---- art caption ----
    {
      const { root, lead, dot } = mkRoot('cx-lead-art', 'cx-dot-art');
      const body = document.createElement('div');
      body.className = 'cx-cap';
      const rule = document.createElement('div');
      rule.className = 'cx-rule';
      const title = document.createElement('div');
      title.className = 'cx-title';
      const meta = document.createElement('div');
      meta.className = 'cx-meta';
      body.append(rule, title, meta);
      root.appendChild(body);
      artRef.current = {
        root,
        body,
        lead,
        dot,
        title,
        meta,
        w: 0,
        h: 0,
        opacity: 0,
        shownIndex: -1,
      };
    }

    // ---- app plates ----
    appsRef.current = APP_NODES.map((node, i) => {
      const { root, lead, dot } = mkRoot('cx-lead-app', 'cx-dot-app');
      const body = document.createElement('div');
      body.className = 'cx-plate';
      body.setAttribute('role', 'link');
      body.setAttribute('tabindex', '-1');
      body.setAttribute('aria-label', `${node.name} — ${node.desc} (opens in a new tab)`);
      for (const c of ['tl', 'tr', 'bl', 'br']) {
        const b = document.createElement('div');
        b.className = `cx-brk cx-brk-${c}`;
        body.appendChild(b);
      }
      const row = document.createElement('div');
      row.className = 'cx-row';
      const glyph = document.createElement('span');
      glyph.className = 'cx-glyph';
      glyph.textContent = node.glyph;
      const name = document.createElement('span');
      name.className = 'cx-name';
      name.textContent = node.name;
      const ext = document.createElement('span');
      ext.className = 'cx-ext';
      ext.textContent = '↗';
      row.append(glyph, name, ext);
      const desc = document.createElement('div');
      desc.className = 'cx-desc';
      desc.textContent = node.desc;
      body.append(row, desc);
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
      root.appendChild(body);
      return { root, body, lead, dot, w: 0, h: 0, opacity: 0 };
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
  appsRef: React.RefObject<Label[]>;
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
    const cp = phaseProgress(p, 'contraction');
    // labels belong to the cosmos only: absent during the dive, gone by contraction
    // Raw scroll is also consulted for the exit: CONTRACTION is choreographed off
    // raw scroll, so labels must clear the stage on the same clock or a caption
    // can still be up when the sigil starts drawing.
    const rawCp = phaseProgress(rawScroll(), 'contraction');
    const gate =
      smoothstep(0.163, 0.198, p) *
      (1 - smoothstep(0, 0.14, cp)) *
      (1 - smoothstep(0.05, 0.28, rawCp));

    // safe frame — clear of the scroll rail (right) and the phase mark (bottom-left)
    const sx0 = 46;
    const sy0 = 54;
    const sx1 = W - 104;
    const sy1 = H - 52;

    const rects = cosmosShared.slabRects;
    placed.length = 0;

    const fits = (x: number, y: number, w: number, h: number, skip: number): boolean => {
      if (x < sx0 || y < sy0 || x + w > sx1 || y + h > sy1) return false;
      scratch.x0 = x;
      scratch.y0 = y;
      scratch.x1 = x + w;
      scratch.y1 = y + h;
      for (let i = 0; i < rects.length; i++) {
        if (i === skip) continue;
        const r = rects[i];
        if (r.live && rectsOverlap(scratch, r, 8 + r.pad)) return false;
      }
      for (let i = 0; i < placed.length; i++) {
        if (rectsOverlap(scratch, placed[i], 12)) return false;
      }
      return true;
    };

    const commit = (
      label: Label,
      ax: number,
      ay: number,
      x: number,
      y: number,
      target: number,
    ) => {
      label.body.style.transform = `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`;
      // leader: anchor -> nearest point on the plate rect
      const cx = Math.max(x, Math.min(ax, x + label.w));
      const cy = Math.max(y, Math.min(ay, y + label.h));
      const dx = cx - ax;
      const dy = cy - ay;
      const len = Math.hypot(dx, dy);
      label.lead.style.width = `${Math.max(0, len - 4).toFixed(1)}px`;
      label.lead.style.transform = `translate(${ax}px, ${ay}px) rotate(${Math.atan2(dy, dx)}rad)`;
      label.dot.style.transform = `translate(${ax}px, ${ay}px)`;
      label.root.style.opacity = target.toFixed(3);
      label.opacity = target;
      placed.push({ x0: x, y0: y, x1: x + label.w, y1: y + label.h });
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

    if (gate > 0.02 && heroRect?.live && heroWork && cosmosShared.heroDom > 0.32 && art.w > 0) {
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
      const ax = heroRect.x0;
      const ay = heroRect.y1;
      const hw = heroRect.x1 - heroRect.x0;
      const hh = heroRect.y1 - heroRect.y0;
      const g = 26 + heroRect.pad;
      // museum convention first (below, left edges aligned), then out into the void
      const cands: number[][] = [
        [0, g],
        [-art.w - g, -art.h * 0.5],
        [-art.w - g, -hh * 0.5 - art.h * 0.5],
        [-art.w - g, -hh + art.h],
        [hw + g, -art.h],
        [hw + g, -hh * 0.5],
        [hw + g, -hh + art.h],
        [hw - art.w, g],
        [0, -hh - art.h - g],
        [hw - art.w, -hh - art.h - g],
        [-art.w - g, -hh - art.h],
        [0, g * 2.2],
        [hw - art.w, g * 2.2],
        // last resort: the four corners of the safe frame, absolute — a hero
        // must never go uncaptioned just because its beat is a crowded one
        [sx0 - ax, sy1 - art.h - ay],
        [sx1 - art.w - ax, sy1 - art.h - ay],
        [sx0 - ax, sy0 - ay],
        [sx1 - art.w - ax, sy0 - ay],
      ];
      for (const [ox, oy] of cands) {
        const x = ax + ox;
        const y = ay + oy;
        if (fits(x, y, art.w, art.h, -1)) {
          commit(art, ax, ay, x, y, gate * Math.min(1, 0.25 + 0.9 * cosmosShared.heroDom));
          artDone = true;
          break;
        }
      }
    }
    if (!artDone) hide(art);

    /* ---------------------------------------------- 2. the app waypoints */
    for (let i = 0; i < apps.length; i++) {
      const label = apps[i];
      const node = APP_NODES[i];
      const rel = state.camera.position.z - node.z; // >0 once the node is ahead
      const vis = gate * smoothstep(3.2, 6.5, rel) * smoothstep(30, 21, rel);
      if (vis < 0.03 || label.w === 0) {
        hide(label);
        continue;
      }
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
        if (fits(x, y, label.w, label.h, -1)) {
          commit(label, ax, ay, x, y, vis);
          done = true;
          break;
        }
      }
      // no guaranteed-empty region → fade out. Never overlap.
      if (!done) hide(label);
    }
  });

  return null;
}
