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
//          metadata, red tick terminal. The primary voice. In a MACRO shot it
//          is joined by THE DETAIL PLATE (see below) at the opposite margin of
//          the same column: process, support and state, read off @/lib/works —
//          the fields the caption has no room for. The two are one spread on
//          one 21px grid, and they replace the decorative "43% OF PLATE IN
//          FRAME" numeral that used to be the largest, faintest thing on screen.
//   APPS — the same device, subordinate: half-length red rule, smaller tracked
//          mono name with an external tick, description in the metadata
//          weight. No panel and no brackets around the TYPE — a debug readout
//          was never the intent — but the leader does now terminate on a
//          hairline square bracketing the waypoint it names, because a leader
//          is only an annotation if it lands on something (see THE CALLOUT MAY
//          NOT POINT AT NOTHING). One at a time, never within 120px vertically
//          of the caption, and only in the WIDE shot.
//
// All DOM is imperative — created once, mutated inside useFrame. Zero React
// re-renders, zero per-frame allocation.

import { useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Artwork } from '@/lib/works';
import { useJourney } from '../JourneyContext';
import { phaseProgress } from '../journey-utils';
import { cosmosShared, rectsOverlap, smoothstep, type ScreenRect } from './shared';
import { APP_NODES, SLABS, shotMix, type ShotMix } from './cosmos-data';
import { pushExclusion, resetExclusion } from './exclusion';
import { appAnchor, makeAppAnchor } from './app-anchor';

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

/* ========================================================= THE DETAIL PLATE ==
 *
 * WHAT THE DARK HALF OF THE SPLIT SCREEN SAYS.
 *
 * It said "43%" and then, fifteen percent of the journey later, "32%", each at
 * 7.4rem over the legend "OF PLATE IN FRAME". Two objections, both fatal:
 *
 *   1. IT WAS NOT INFORMATION. The share of a work's projected box that happens
 *      to fall inside the viewport is a fact about the CAMERA, not about the
 *      painting — it changes if you resize the window and it tells a reader
 *      nothing they could carry away. MEASURED at 1440×900, the numeral was the
 *      largest object in its frame at 2.76:1 on the ground and the legend under
 *      it at 2.11:1: the loudest thing on screen, illegible, and saying nothing.
 *   2. IT REPEATED. Stated twice in the same grammar with a different number,
 *      it reads as filler occupying a panel that had not been solved.
 *
 * So the panel now prints what a museum detail card prints and what the caption
 * cannot fit: HOW THE WORK WAS MADE. Up to three of its own techniques, the
 * full medium (the caption only has room for the first half of it), and its
 * state in the collection — every field read straight off @/lib/works, so it is
 * different for every plate because the WORK is different, not because a
 * measurement drifted.
 *
 * The ink is chosen, not inherited: the process lines are chalk at 0.66 alpha,
 * which measures ~7:1 on the void — the same tier the site's own labels sit at,
 * an order below the caption title (15.5:1) they are subordinate to, and a long
 * way clear of the 4.5:1 floor. Nothing here is set below that floor.
 *
 * The plate is exported because BOTH instances of the split screen use it —
 * Labels drives the second (46%), FormationPlate the first (31%) — and one
 * device stated twice must be one piece of code, or it drifts into a module and
 * a draft of it again.
 */

/** Ink of the process lines: chalk at this alpha measures ~7:1 on the void. */
const DETAIL_INK = 0.66;
/** The plate's baseline module. Every gap in it is a multiple of this. */
export const DETAIL_GRID = 21;

const STATE_WORD: Record<Artwork['status'], string> = {
  available: 'In the studio · available',
  sold: 'Sold',
  nfs: 'Not for sale',
};

export const DETAIL_CSS = `
.cxd { position:absolute; left:0; top:0; opacity:0; transition:opacity .26s linear;
       display:inline-block; text-align:left; }
.cxd--end { text-align:right; }
.cxd-legend { font-family:${MONO}; font-weight:400; font-size:.5rem;
              line-height:${DETAIL_GRID}px; letter-spacing:.24em;
              text-transform:uppercase; color:#a09890; white-space:nowrap; }
.cxd-lines { margin-top:${DETAIL_GRID}px; }
.cxd-line { font-family:${MONO}; font-weight:200; font-size:1.32rem;
            line-height:${DETAIL_GRID * 2}px; letter-spacing:.1em;
            text-transform:uppercase; color:rgba(232,228,220,${DETAIL_INK});
            white-space:nowrap; }
.cxd-rule { margin-top:${DETAIL_GRID}px; height:1px;
            background:rgba(232,228,220,.16); }
.cxd-meta { margin-top:${DETAIL_GRID - 4}px; font-family:${MONO}; font-weight:400;
            font-size:.55rem; line-height:17px; letter-spacing:.15em;
            text-transform:uppercase; color:#a09890; white-space:nowrap; }
.cxd-state { margin-top:4px; font-family:${MONO}; font-weight:400; font-size:.55rem;
             line-height:17px; letter-spacing:.15em; text-transform:uppercase;
             color:rgba(232,228,220,.62); white-space:nowrap; }
`;

export interface DetailPlate {
  root: HTMLDivElement;
  lines: HTMLDivElement[];
  meta: HTMLDivElement;
  state: HTMLDivElement;
  w: number;
  h: number;
  key: string;
  o: number;
}

/** Three process terms that fit the column — over-long ones dropped, order kept. */
function pickProcess(work: Artwork): string[] {
  const short = work.techniques.filter((t) => t.length <= 26);
  return (short.length >= 3 ? short : work.techniques).slice(0, 3);
}

/**
 * THE SUPPORT, NOT THE MEDIUM.
 *
 * The caption already prints `medium` up to the ' on ' — "UV-reactive acrylic
 * and fluorescent paint" — so printing the whole string here made the panel
 * restate the caption in a smaller size, which is the exact failure the panel
 * was rebuilt to stop making. It prints the half the caption drops instead:
 * what the work is ON. ("Acrylic on canvas with combed texture" → "On canvas
 * with combed texture".)
 */
function support(work: Artwork): string {
  const i = work.medium.indexOf(' on ');
  return i < 0 ? work.medium : `On ${work.medium.slice(i + 4)}`;
}

export function buildDetail(layer: HTMLElement, variant: string): DetailPlate {
  const root = document.createElement('div');
  root.className = `cxd ${variant}`;
  root.setAttribute('aria-hidden', 'true');
  const legend = document.createElement('div');
  legend.className = 'cxd-legend';
  legend.textContent = 'Process';
  const box = document.createElement('div');
  box.className = 'cxd-lines';
  const lines: HTMLDivElement[] = [];
  for (let i = 0; i < 3; i++) {
    const d = document.createElement('div');
    d.className = 'cxd-line';
    box.appendChild(d);
    lines.push(d);
  }
  const rule = document.createElement('div');
  rule.className = 'cxd-rule';
  const meta = document.createElement('div');
  meta.className = 'cxd-meta';
  const state = document.createElement('div');
  state.className = 'cxd-state';
  root.append(legend, box, rule, meta, state);
  layer.appendChild(root);
  return { root, lines, meta, state, w: 0, h: 0, key: '', o: 0 };
}

/** Fill the plate for a work. Re-measures only when the content changed. */
export function setDetail(plate: DetailPlate, work: Artwork): void {
  if (plate.key !== work.id) {
    plate.key = work.id;
    const proc = pickProcess(work);
    for (let i = 0; i < plate.lines.length; i++) {
      plate.lines[i].textContent = proc[i] ?? '';
      plate.lines[i].style.display = proc[i] ? '' : 'none';
    }
    plate.meta.textContent = support(work);
    plate.state.textContent = STATE_WORD[work.status] ?? work.status;
    plate.w = 0;
  }
  if (plate.w <= 0) {
    const r = plate.root.getBoundingClientRect();
    plate.w = r.width;
    plate.h = r.height;
  }
}

export function placeDetail(plate: DetailPlate, x: number, y: number, o: number): void {
  plate.root.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
  if (Math.abs(o - plate.o) > 0.003) {
    plate.o = o;
    plate.root.style.opacity = o.toFixed(3);
  }
}

export function hideDetail(plate: DetailPlate): void {
  if (plate.o !== 0) {
    plate.o = 0;
    plate.root.style.opacity = '0';
  }
}

/**
 * Snap a plate's top edge onto the 21px module counted FROM THE CAPTION'S OWN
 * top edge, so the two objects in the column are an exact whole number of
 * modules apart. The caption, the plate's leading and the column's baseline
 * then sit on one grid instead of on two ideas of vertical.
 */
export function snapToGrid(y: number, anchor: number, lo = -1e6, hi = 1e6): number {
  let out = anchor + DETAIL_GRID * Math.round((y - anchor) / DETAIL_GRID);
  // …and stay inside the safe frame while staying ON the module: step whole
  // modules, never a stray remainder, or the grid claim is only half true.
  while (out > hi) out -= DETAIL_GRID;
  while (out < lo) out += DETAIL_GRID;
  return out;
}

/**
 * THE PLATE EDGE.
 *
 * A macro shot crops the canvas off three edges and terminates it on the
 * fourth. Several of the source photographs carry the studio wall / paper
 * border past the painted edge, and at macro scale that border arrives as a
 * ~50px strip of rgb(202,202,202) standing directly against the seam — the
 * single brightest object in a near-black frame, and it reads as a cropping
 * miss rather than as a print edge.
 *
 * So the terminating edge is MATTED: an opaque strip of the ground, this wide,
 * laid over the last of the canvas. The crop lands a little inside the
 * photograph instead of on its physical border, which is what a plate edge is.
 * The matte is a two-stop vertical ramp rather than a flat fill because the
 * ground it has to disappear into is vignetted (measured at x=905: rgb(10,7,8)
 * at the frame edges, rgb(16,11,12) across the middle third) — it is a matte
 * sampled from the ground, not a decorative gradient.
 */
const EDGE_MATTE_FRAC = 0.115; // × viewport width — 166px at 1440
const EDGE_MATTE_MIN = 120;
/** Fraction of the matte spent ramping in from zero. The rest is opaque. */
const EDGE_RAMP_FRAC = 0.72;
/** Smootherstep — zero FIRST and SECOND derivative at both ends, so neither the
 *  value nor the slope of the matte ever steps. */
const smoother = (t: number): number => t * t * t * (t * (t * 6 - 15) + 10);
const EDGE_RAMP = `linear-gradient(to right, ${Array.from({ length: 17 }, (_, i) => {
  const u = i / 16;
  return `rgba(0,0,0,${smoother(u).toFixed(4)}) ${(u * EDGE_RAMP_FRAC * 100).toFixed(2)}%`;
}).join(', ')}, rgba(0,0,0,1) 100%)`;
/** A chip may never come within this many px, vertically, of the caption. */
const CHIP_KEEPOUT_Y = 120;
/**
 * THE CALLOUT MAY NOT POINT AT NOTHING.
 *
 * MEASURED, desktop 1440×900, scroll 21.3% and 24.0%: an app chip was up with a
 * 72px and a 99px leader running out of it, and a 60px disc centred on the
 * leader's terminus sampled peak luminance 9.8 and 8.9 against a local ground of
 * 9.2 and 8.2 — i.e. the leader ended in bare void. Two causes, both fixed here:
 *
 *   1. FRAME ORDER. AppsConstellation's useFrame is registered before this
 *      driver's (this one is armed late so it can read the slab rects written
 *      in the same frame), and the solid it draws is gated on `appActive` —
 *      which this module writes. So the wire always renders the decision from
 *      the PREVIOUS frame while the chip rendered the current one. At 60fps
 *      that is 16ms; on the frame rate a scrubbing capture actually gets, it is
 *      a chip and a leader with no terminal under them. The driver now RENDERS
 *      the state the wire is presenting and PUBLISHES the state it should
 *      present next, so annotation and referent are in lockstep by
 *      construction, at any frame rate.
 *   2. NO PRESENCE TEST. Nothing checked that the referent was actually
 *      legible. The wire's own opacity expression is mirrored below; under
 *      WIRE_MIN the callout does not render at all — not the chip, not the
 *      leader.
 *
 * And because the wireframe solid is deliberately faint scenery (its peak is
 * ~1.8:1 against the void), the leader now terminates on a mark this module
 * draws itself — a hairline square bracketing the solid at the same docked
 * anchor. The annotation carries its own terminal; it can never land on air.
 */
const WIRE_MIN = 0.09;
/** Clearance the terminal square keeps from any artwork silhouette, in px.
 *  The solid is depth-tested against the paintings: a terminal over a canvas is
 *  a terminal that has been culled behind it. */
const NODE_CLEAR = 10;
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
           background:rgba(160,168,190,.34); }
/* THE LEADER'S TERMINAL. A hairline open square bracketing the waypoint's
   wireframe solid — the leader runs from the chip to this square's edge, and
   the square is drawn by the same module, in the same frame, from the same
   docked anchor as the solid inside it. See THE CALLOUT MAY NOT POINT AT
   NOTHING. Chalk at 45% measures 3.8:1 on the void ground: unmistakably a
   mark, an order of magnitude below the caption it is subordinate to. */
.cx-node { position:absolute; left:0; top:0; box-sizing:border-box;
           border:1px solid rgba(232,228,220,.45); }

/* ---- the SECOND split screen: the same device, inverted ---- */
/* A hairline on the divide turns the dark half from leftover panel into a
   measured margin; the detail plate fills it with what the caption could not
   fit. Neither adds a colour. */
.cx-divide { position:absolute; width:1px; top:0; left:0;
             background:rgba(232,228,220,.16); }

/* THE PLATE EDGE DISSOLVES — IT DOES NOT CUT.
   The matte exists to keep the photograph's own paper border out of the frame
   (see EDGE_MATTE_FRAC), but an opaque strip has TWO edges and the inner one
   was a hard vertical laid straight across the painting: the crop stopped
   being a crop and became a rectangle sitting on the work. The strip now
   carries a horizontal alpha ramp — smootherstep, so it arrives at zero with
   zero slope and there is no edge to find at any scale — and only its last
   third is opaque, which is the part that has to cover the border. */
.cx-edge { position:absolute; top:0; left:0; height:100%; will-change:transform;
           background:linear-gradient(180deg,
             rgb(10,7,8) 0%, rgb(16,11,12) 18%,
             rgb(16,11,12) 74%, rgb(10,7,8) 100%);
           -webkit-mask-image:${EDGE_RAMP}; mask-image:${EDGE_RAMP}; }
${DETAIL_CSS}`;

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
  divide: HTMLDivElement;
  detail: DetailPlate;
  shownIndex: number;
}

interface AppLabel extends Label {
  lead: HTMLDivElement;
  /** the terminal square the leader lands on — brackets the wireframe solid */
  node: HTMLDivElement;
}

/**
 * Candidate plate offsets (top-left relative to anchor), in preference order.
 * `g` is the clearance the plate must keep from the anchor — it is the docked
 * wire's own projected radius plus air, so the name never sits on the solid.
 */
function appCandidates(w: number, h: number, out: number[][], g: number): number[][] {
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
const anchorOut = makeAppAnchor();
const candBuf: number[][] = [];
const artCands: number[][] = [];
/** Per-frame waypoint presence + the order to try placing them in. */
const vis: number[] = [];
const order: number[] = [];
const mix: ShotMix = { wide: 1, macro: 0, pullback: 0 };

export function Labels() {
  const built = useRef(false);
  const artRef = useRef<ArtLabel | null>(null);
  const edgeRef = useRef<HTMLDivElement | null>(null);
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

      // ---- the plate edge matte ----
      // Built FIRST so it paints under every caption in the layer; it carries
      // its own opacity because it belongs to the SHOT, not to the caption —
      // the crop must survive a frame in which no placement was found.
      {
        const edge = document.createElement('div');
        edge.className = 'cx-edge';
        edge.style.opacity = '0';
        edge.setAttribute('aria-hidden', 'true');
        layer.appendChild(edge);
        edgeRef.current = edge;
      }

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
        const divide = document.createElement('div');
        divide.className = 'cx-divide';
        divide.style.opacity = '0';
        root.append(divide, body, tick, dot);
        // MACRO II's caption runs flush to the safe right edge, so its detail
        // plate does too: one vertical grid per frame, never two.
        const detail = buildDetail(root, 'cxd--end cxd-a');
        artRef.current = {
          root,
          body,
          tick,
          dot,
          title,
          meta,
          divide,
          detail,
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
        const nodeBox = document.createElement('div');
        nodeBox.className = 'cx-node';
        root.append(lead, nodeBox, body);
        return { root, body, lead, node: nodeBox, w: 0, h: 0, opacity: 0, shown: true };
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

  return armed ? <LabelDriver artRef={artRef} appsRef={appsRef} edgeRef={edgeRef} /> : null;
}

interface DriverProps {
  artRef: React.RefObject<ArtLabel | null>;
  appsRef: React.RefObject<AppLabel[]>;
  edgeRef: React.RefObject<HTMLDivElement | null>;
}

/**
 * FOREIGN TYPE.
 *
 * The exclusion table is what stops the in-canvas equation glyphs printing
 * through a caption's word gaps, and this module is the only writer — so any
 * caption in the layer that this module did not create was invisible to it.
 * FormationPlate.tsx (the plate that names the composed archive, 54%–69%)
 * is exactly that: it lives in the same layer, it is set in the same grammar,
 * and it was the one caption a glyph was allowed to land on. Worse, it is at
 * its loudest AFTER 61.8%, where this driver used to clear the table and stop.
 *
 * So the driver harvests every caption-bearing element in the layer, not just
 * its own, and it keeps harvesting past the chapter boundary. Read off the
 * inline transform rather than getBoundingClientRect so the per-frame cost is
 * a string parse, not a forced layout.
 */
interface Foreign {
  el: HTMLElement;
  w: number;
  h: number;
}
const foreign: Foreign[] = [];
const XY = /translate(?:3d)?\(\s*(-?[\d.]+)px[,\s]+(-?[\d.]+)px/;

function harvestForeign(layer: HTMLDivElement | null): void {
  if (!layer) return;
  // Self-healing rather than scan-once: the plate mounts on its own clock and
  // can be torn down and rebuilt under it (Suspense, HMR), so the table is
  // re-scanned whenever it is empty or its first entry has left the document.
  if (foreign.length === 0 || !foreign[0].el.isConnected) {
    foreign.length = 0;
    layer
      .querySelectorAll<HTMLElement>('.fp-cap, .cxd-b')
      .forEach((el) => foreign.push({ el, w: 0, h: 0 }));
  }
  for (let i = 0; i < foreign.length; i++) {
    const f = foreign[i];
    if (!f.el.isConnected) continue;
    const o = parseFloat(f.el.style.opacity || '0');
    if (!(o > 0.02)) continue;
    if (f.w === 0) {
      const r = f.el.getBoundingClientRect();
      if (r.width < 1) continue;
      f.w = r.width;
      f.h = r.height;
    }
    const m = XY.exec(f.el.style.transform);
    if (!m) continue;
    const x = parseFloat(m[1]);
    const y = parseFloat(m[2]);
    pushExclusion(x, y, x + f.w, y + f.h);
  }
}

function LabelDriver({ artRef, appsRef, edgeRef }: DriverProps) {
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
    // ONE reset per frame, and it happens before ANY caption publishes — this
    // module's or another module's. The foreign harvest runs on both sides of
    // the chapter boundary because the formation plate outlives it.
    resetExclusion();
    harvestForeign(cosmosShared.labelLayer);
    const edge = edgeRef.current;
    if (dead) {
      appActive.index = -1;
      appActive.o = 0;
      setShown(art, false);
      for (const l of apps) setShown(l, false);
      if (edge && edge.style.opacity !== '0') edge.style.opacity = '0';
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
    const cosP = phaseProgress(p, 'cosmos');
    shotMix(cosP, mix);
    // THE SPLIT SCREEN MAY NOT BE STATED TWICE THE SAME WAY.
    // There are exactly two macro shots (cosmos 0.159–0.341 and 0.523–0.727)
    // and they had pixel-identical type architecture: caption pinned to the top
    // of the clear column, 550px of dead near-black under it. The second one now
    // INVERTS — the caption drops to the baseline and runs flush to the safe
    // right edge, a hairline states the divide, and the plate number fills the
    // panel at a whisper. Same components, different composition.
    const secondMacro = cosP > 0.45;
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

    /* ------------------------------------------------- 0b. the plate edge */
    // Only a MACRO frames a canvas this way: bled off the left and off both
    // horizontals, terminating on a single vertical inside the frame. That
    // vertical is the crop, and the crop is matted (see EDGE_MATTE_FRAC).
    if (edge) {
      const terminating =
        heroRect?.live &&
        heroRect.x0 < 8 &&
        heroRect.x1 > W * 0.2 &&
        heroRect.x1 < W - 8 &&
        heroRect.y0 < 8 &&
        heroRect.y1 > H - 8;
      const eo = terminating ? smoothstep(0.06, 0.3, mix.macro) : 0;
      if (eo > 0.002 && heroRect) {
        const mw = Math.max(EDGE_MATTE_MIN, W * EDGE_MATTE_FRAC);
        // +2px of overshoot past the seam so no sub-pixel sliver of the
        // photograph's border can survive on the far side of the crop
        edge.style.width = `${Math.round(mw + 2)}px`;
        edge.style.transform = `translate3d(${Math.round(heroRect.x1 - mw)}px, 0, 0)`;
      }
      const eos = eo.toFixed(3);
      if (edge.style.opacity !== eos) edge.style.opacity = eos;
    }

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
      if (isMacro && secondMacro) {
        // MACRO II: the axis is mirrored. The caption sits on the BASELINE of
        // the clear column and runs flush to the safe right edge, so the eye
        // enters low-right instead of high-left and the panel above it is
        // measured space rather than leftover.
        const col = heroRect.x1 + g + 12;
        artCands.push([Math.max(col, sx1 - art.w), sy1 - art.h]);
        artCands.push([col, sy1 - art.h]);
        artCands.push([Math.max(col, sx1 - art.w), sy1 - art.h - 110]);
        artCands.push([col, sy1 - art.h - 110]);
        artCands.push([col, sy0 + 30]);
        artCands.push([sx0, sy1 - art.h]);
      } else if (isMacro) {
        // MACRO I: the canvas bleeds off three edges and leaves a clear column
        // on the right. The label lives at the TOP of it — the eye lands high
        // and right, the opposite corner from the WIDE shot it just left.
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

          // ---- MACRO II furniture: the divide hairline + the detail plate ----
          if (isMacro && secondMacro) {
            const dx = Math.round(heroRect.x1 + heroRect.pad + 26);
            if (dx > sx0 && dx < sx1 - 60) {
              art.divide.style.transform = `translate(${dx}px, ${sy0}px)`;
              art.divide.style.height = `${Math.round(sy1 - sy0)}px`;
              art.divide.style.opacity = '1';
            } else {
              art.divide.style.opacity = '0';
            }
            // THE COLUMN IS A SPREAD, NOT A BLOCK WITH AIR OVER IT.
            // The caption takes the foot margin; the detail plate takes the
            // head. Both are flush to the same right edge and both sit on the
            // 21px module counted from the head of the safe frame — so the
            // 400px between them is a stated void with a mark at each end
            // rather than a band nobody solved.
            setDetail(art.detail, heroWork);
            const px = Math.round(x + art.w - art.detail.w);
            const py = snapToGrid(sy0 + 30, y, sy0, y - art.detail.h - DETAIL_GRID * 2);
            if (
              art.detail.w > 0 &&
              px > dx + 20 &&
              py + art.detail.h < y - DETAIL_GRID * 2
            ) {
              placeDetail(art.detail, px, py, 1);
              placed.push({
                x0: px,
                y0: py,
                x1: px + art.detail.w,
                y1: py + art.detail.h,
              });
              pushExclusion(px, py, px + art.detail.w, py + art.detail.h);
            } else {
              hideDetail(art.detail);
            }
          } else {
            art.divide.style.opacity = '0';
            hideDetail(art.detail);
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
    if (!artDone) {
      hide(art);
      // The plate's own inline opacity is what FormationPlate reads to decide
      // whether to stand in for this instance, so a plate hidden only by its
      // parent's opacity would read as "Labels is drawing" and blank the panel.
      hideDetail(art.detail);
    }

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

    // Every waypoint's presence this frame, and the order to try them in. The
    // callout goes to the strongest node that can actually be HONOURED, not to
    // the strongest node full stop: when the loudest one happens to sit over a
    // canvas (where its solid is depth-culled and its terminal would print on
    // the artwork) the shot still has a waypoint to name, and refusing outright
    // is what emptied a whole WIDE window of them.
    vis.length = 0;
    order.length = 0;
    for (let i = 0; i < apps.length; i++) {
      const rel = state.camera.position.z - APP_NODES[i].z;
      vis.push(appGate * smoothstep(4.2, 7.5, rel) * smoothstep(15.5, 11, rel));
      if (vis[i] > 0.04) order.push(i);
    }
    order.sort((a, b) => vis[b] - vis[a]);

    // the frame's optical centre belongs to the artwork, never to a chip
    const cxLo = W * 0.24;
    const cxHi = W * 0.76;
    const cyLo = H * 0.2;
    const cyHi = H * 0.8;

    /* ---- LOCKSTEP WITH THE REFERENT (see THE CALLOUT MAY NOT POINT AT
       NOTHING). `appActive` as it stands on entry IS what AppsConstellation
       drew this frame — its useFrame ran before this one. So that is the state
       the chip renders; `best` is only what gets published for the next. */
    const shownIdx = appActive.index;
    const shownO = appActive.o;
    const shotFade = (1 - mix.macro) * (1 - mix.pullback);

    /** The wire's rendered opacity, mirroring AppsConstellation's expression
     *  (hover only ever adds to it, so this is the floor). */
    const wireOpacity = (i: number, published: number): number => {
      const rel = state.camera.position.z - APP_NODES[i].z;
      const near = smoothstep(34, 12, rel) * smoothstep(-1, 3, rel);
      return (0.16 + near * 0.34) * shotFade * Math.min(1, published * 1.4);
    };

    /** Terminal square must not sit on a painting — the solid inside it is
     *  depth-tested, so a terminal over a canvas is a terminal behind it. */
    const clearOfArt = (x0: number, y0: number, x1: number, y1: number): boolean => {
      scratch.x0 = x0;
      scratch.y0 = y0;
      scratch.x1 = x1;
      scratch.y1 = y1;
      for (let i = 0; i < rects.length; i++) {
        const r = rects[i];
        if (r.live && rectsOverlap(scratch, r, NODE_CLEAR)) return false;
      }
      return true;
    };

    /**
     * Find a placement for one callout. Returns the chip's top-left plus the
     * docked anchor geometry, or null when the callout cannot be honoured —
     * off the safe frame, over a painting, or with its referent too faint to
     * be a terminal. Pure: it writes no DOM and pushes nothing.
     */
    const search = (
      i: number,
      published: number,
    ): { x: number; y: number; ax: number; ay: number; r: number } | null => {
      const label = apps[i];
      if (!label || label.w === 0) return null;
      if (wireOpacity(i, published) < WIRE_MIN) return null;
      const anc = appAnchor(APP_NODES[i], state.camera, W, H, anchorV, anchorOut);
      if (!anc.ok) return null;
      const ax = anc.x;
      const ay = anc.y;
      // anc.r is the docking radius — NODE_R (0.52) plus 10px of air, i.e. it
      // over-covers the drawn solid (largest geometry 0.34 + float + hover) by
      // about half. 0.7 of it tracks the silhouette the eye actually sees.
      const r = Math.max(12, Math.min(44, anc.r * 0.7));
      if (!clearOfArt(ax - r, ay - r, ax + r, ay + r)) return null;
      const cands = appCandidates(label.w, label.h, candBuf, Math.max(34, anc.r + 16));
      for (const [ox, oy] of cands) {
        const x = ax + ox;
        const y = ay + oy;
        const mx = x + label.w / 2;
        const my = y + label.h / 2;
        if (mx > cxLo && mx < cxHi && my > cyLo && my < cyHi) continue;
        if (!fits(x, y, label.w, label.h, CLEAR)) continue;
        return { x, y, ax, ay, r };
      }
      return null;
    };

    // What the wire is drawing now — that, and only that, may be annotated.
    const drawIdx = shownIdx >= 0 && shownO > 0.04 ? shownIdx : -1;
    const drawn = drawIdx >= 0 ? search(drawIdx, shownO) : null;
    // What the wire should draw next: the strongest waypoint whose callout can
    // actually be honoured. Published only when a placement exists, so a solid
    // never comes up for a callout that will have nowhere to sit.
    let best = -1;
    let bestVis = 0;
    for (const i of order) {
      if (i === drawIdx ? drawn : search(i, vis[i])) {
        best = i;
        bestVis = vis[i];
        break;
      }
    }
    appActive.index = best;
    appActive.o = best >= 0 ? bestVis : 0;

    for (let i = 0; i < apps.length; i++) {
      const label = apps[i];
      if (i !== drawIdx || !drawn) {
        hide(label);
        continue;
      }
      const { x, y, ax, ay, r } = drawn;
      label.body.style.transform = `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`;

      // ---- the terminal: a hairline square bracketing the wireframe solid at
      // the same docked anchor the solid itself reads. The leader stops on its
      // edge, so the line always lands on drawn geometry.
      label.node.style.width = `${Math.round(r * 2)}px`;
      label.node.style.height = `${Math.round(r * 2)}px`;
      label.node.style.transform = `translate(${Math.round(ax - r)}px, ${Math.round(ay - r)}px)`;

      // ---- the leader: from the terminal's edge to the plate's nearest side
      const px = Math.max(x, Math.min(ax, x + label.w));
      const py = Math.max(y, Math.min(ay, y + label.h));
      const dx = px - ax;
      const dy = py - ay;
      const span = Math.hypot(dx, dy) || 1;
      const ux = dx / span;
      const uy = dy / span;
      // exit point of a square of half-side r along (ux, uy)
      const start = r / Math.max(Math.abs(ux), Math.abs(uy)) + 3;
      const lead = Math.max(0, span - 6 - start);
      label.lead.style.width = `${lead.toFixed(1)}px`;
      label.lead.style.opacity = lead > 5 ? '1' : '0';
      label.lead.style.transform = `translate(${(ax + ux * start).toFixed(1)}px, ${(
        ay +
        uy * start
      ).toFixed(1)}px) rotate(${Math.atan2(dy, dx)}rad)`;

      label.root.style.opacity = shownO.toFixed(3);
      label.opacity = shownO;
      placed.push({ x0: x, y0: y, x1: x + label.w, y1: y + label.h });
      // the terminal is part of the callout: nothing else may land on it either
      placed.push({ x0: ax - r, y0: ay - r, x1: ax + r, y1: ay + r });
      pushExclusion(x, y, x + label.w, y + label.h);
      pushExclusion(ax - r, ay - r, ax + r, ay + r);
    }
  });

  return null;
}
