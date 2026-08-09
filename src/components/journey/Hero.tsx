'use client';

// OWNED BY HERO agent.
// ARRIVAL (0–8%) + the pinned canvas the DIVE animates through (8–18%).
// Contract kept: `export function Hero()` — no props, zIndex 2.
// The section spans scroll 0 → end-of-dive so its inner 100vh layer stays
// position:sticky (pinned) for the whole dive; Dive.tsx scrubs a GSAP
// timeline against .hero-letter / .hero-art-* / .hero-void / .hero-rule.
// The hero name is DOM text (LCP target) — server-renderable markup.
//
// COMPOSITION: the masthead is flush-LEFT and optically justified — the two
// lines are sized + tracked so "Michael" and "MacDonald" occupy the SAME
// measure, so the block reads as one designed unit instead of a centred wedge.
// The ghosted artwork is pushed right of centre; type left / art right is the
// composition, not a stack of centred things.
//
// SCROLL SOURCE: this file reads raw window scroll and smooths it with a
// FRAME-RATE-INDEPENDENT filter. JourneyContext's progressRef uses a fixed
// per-frame lerp (0.09), which lags by many hundreds of ms whenever the frame
// rate drops (the WebGL cosmos under software GL runs ~3fps) — the arrival and
// the dive must track scroll exactly, so they own their own smoothing.

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { useJourney } from './JourneyContext';
import { PHASES, JOURNEY_HEIGHT_VH, clamp01 } from './journey-utils';

/**
 * The 7 hero artworks (1200px tex versions — full-res only in the modal),
 * each with its measured mean luminance (0–255). The pieces span 38→110 mean,
 * so a single opacity/brightness pair renders half of them as an unreadable
 * smudge and the other half as haze. Every ghost is normalised to the same
 * perceived presence instead — the artwork must sit at the edge of legibility
 * whichever one the shuffle lands on.
 */
const HERO_ART: { src: string; lum: number }[] = [
  { src: '/art/tex/eye-triangle.jpg', lum: 48.3 },
  { src: '/art/tex/hero-cipher.jpg', lum: 39.4 },
  { src: '/art/tex/hero-red-pyramid.jpg', lum: 83.5 },
  { src: '/art/tex/hero-sun-cross.jpg', lum: 109.5 },
  { src: '/art/tex/hero-math-pyramid.jpg', lum: 65.4 },
  { src: '/art/tex/hero-equations.jpg', lum: 45.6 },
  { src: '/art/tex/hero-red-eye.jpg', lum: 38.6 },
];

/** Mean luminance every ghosted hero settles at after the brightness gain. */
const ART_TARGET_LUM = 62;

/**
 * Optically justified masthead — ONE tracking value, size does all the work.
 *
 * Two stacked lines of the same display serif must be tracked identically or
 * the eye reads the difference as a stretch: the previous lockup ran +0.0496em
 * against −0.0316em and "M i c h a e l" visibly loosened above a tight
 * "MacDonald". Both lines are now set at TRACK (−0.012em, the optical value
 * Cormorant Garamond 300 wants at display size) and the flush right edge is
 * solved entirely with per-line font-size.
 *
 * Rendered advance widths at zero tracking (measured in-browser, Cormorant
 * Garamond 300): "Michael" = 3.3259em, "MacDonald" = 4.6886em. CSS
 * letter-spacing adds a gap after every glyph, so the INK measure of an n-glyph
 * line is size·(advance + (n−1)·track). Solving both to the same measure:
 *
 *   S₁·(3.3259 + 6·TRACK) = S₂·(4.6886 + 8·TRACK)
 *   S₁ = 15u  ⇒  S₂ = 10.383u  (solved, then trued against the rendered ink)
 *
 * The size delta is the decision: the given name is the headline, the surname
 * the counterweight, and the block is a true rectangle at equal tracking.
 */
const TRACK = '-0.012em';
const NAME_LINES: { text: string; size: string; tracking: string; lh: number; sf: number }[] = [
  { text: 'Michael', size: 'calc(15 * var(--hero-u))', tracking: TRACK, lh: 0.9, sf: 1 },
  { text: 'MacDonald', size: 'calc(10.383 * var(--hero-u))', tracking: TRACK, lh: 1.16, sf: 0.71 },
];

/** Measure of the justified masthead, in --hero-u. Rule geometry derives from it. */
const BLOCK_W_VW = 47.89;
/** Rule length = block / φ² (0.382). Its tick sits at 13.7% — the constant. */
const RULE_W_VW = BLOCK_W_VW * 0.382; // 20.5vw
const RULE_TICK_VW = RULE_W_VW * 0.137; // 2.81vw

const GUTTER = 'clamp(28px, 6vw, 132px)';

/**
 * Height (vh) the section must span so the sticky inner layer stays pinned
 * until journey progress = PHASES.dive.end (+ a buffer for the tail of the
 * crossfade — un-pinning exactly at dive.end would expose a seam while the
 * void is still fading). Progress is measured against scrollHeight -
 * innerHeight, hence (JOURNEY_HEIGHT_VH - 100).
 */
const PIN_BUFFER = 0.05;
const PIN_END_VH = (PHASES.dive.end + PIN_BUFFER) * (JOURNEY_HEIGHT_VH - 100) + 100; // 238vh

const VOID = '#0e0c0a';
const CHALK = '#e8e4dc';
const FADED = '#a09890';
const RED = '#c41230';
const MONO = "'JetBrains Mono', monospace";

/** Arrival band this file owns. The dive takes over a hair before 8%. */
const ARRIVAL_END = 0.075;

/** Dissolves the artwork's rectangle into the void — it has to read as a ghost
 *  in the dark, never as a framed picture with four hard edges. Sized so the
 *  alpha reaches zero at (or just inside) the contained image's own bounds. */
const ART_MASK =
  'radial-gradient(ellipse 62% 55% at 50% 50%, black 24%, transparent 76%)';

/** Fades the parting seam's ends so it reads as a tear, not a drawn line. */
const SEAM_MASK = 'linear-gradient(to bottom, transparent, black 22%, black 78%, transparent)';

/**
 * Feathers the torn edge of each veil half — a tear, not a guillotine cut.
 * The two halves OVERLAP across 44–56% and their alpha ramps are cubic
 * complements (1-t³ / 1-(1-t)³), so source-over compositing of the identical
 * pixels sums back to ≥0.984 everywhere: seamless while closed, soft-edged
 * while parting. A plain linear pair would trough to 0.75 and print a dark
 * stripe down the middle of the artwork at rest.
 */
const TEAR_CLIP_L = 'inset(0 44% 0 0)';
const TEAR_CLIP_R = 'inset(0 0 0 44%)';
const TEAR_L =
  'linear-gradient(to right, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 44%, rgba(0,0,0,0.984) 47%, rgba(0,0,0,0.875) 50%, rgba(0,0,0,0.578) 53%, rgba(0,0,0,0) 56%)';
const TEAR_R =
  'linear-gradient(to right, rgba(0,0,0,0) 44%, rgba(0,0,0,0.578) 47%, rgba(0,0,0,0.875) 50%, rgba(0,0,0,0.984) 53%, rgba(0,0,0,1) 56%, rgba(0,0,0,1) 100%)';

/**
 * --hero-u is the masthead's unit: every type size, tracking-derived measure
 * and the rule geometry is a multiple of it, so the optical justification
 * survives every breakpoint — only the unit changes.
 *
 * The unit is also CAPPED so the measure can never reach the depth rail.
 * ScrollProgress reserves the right 55px of every viewport for the gauge; on a
 * 390px phone an uncapped 1.62vw unit put the masthead's ink at x=371 with the
 * rail's hairline at x=368, so the rail grazed the 'l' and the 'd'. The rail is
 * the best craft on the site and does not move — the type gives way instead:
 * --hero-u never exceeds (100vw − gutter − rail) / BLOCK_W, which guarantees a
 * full 55px channel at every width, on every breakpoint, by construction.
 *
 * The artwork frame is aspect-ratio driven (0.6 ≈ the paintings' own portrait
 * ratio) so ART_MASK's percentage stops land on the image's real edges rather
 * than on letterboxing.
 */
const HERO_CSS = `
@keyframes hero-tick {
  0%   { transform: translateY(0); opacity: 1; }
  72%  { transform: translateY(60px); opacity: 1; }
  100% { transform: translateY(60px); opacity: 0; }
}
.hero-title {
  --hero-g: ${GUTTER};
  --hero-rail: 55px;
  --hero-fit: calc((100vw - var(--hero-g) - var(--hero-rail)) / ${BLOCK_W_VW});
  --hero-u: min(1vw, var(--hero-fit));
}
.hero-art-frame { height: min(88vh, 103vw); aspect-ratio: 0.6; }
.hero-art-pos { left: 67%; }
@media (max-width: 1023px) { .hero-title { --hero-u: min(1.28vw, var(--hero-fit)); } }
@media (max-width: 767px) {
  .hero-title { --hero-u: min(1.62vw, var(--hero-fit)); }
  .hero-art-pos { left: 50%; }
}`;

/** Raw (unsmoothed) journey progress straight off the document scroll. */
function rawProgress(): number {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  return max > 0 ? clamp01(window.scrollY / max) : 0;
}

/* ======================================================== THE HERO MARK ====
 * The site proves at 77% that it can render its own iconography as crisp white
 * line on void. It has to do that in the ONE frame everyone sees. So the hero
 * mark is DRAWN, not photographed: a 2D-canvas line figure — triangle, eye,
 * lashes, one red iris — stroked as chalk at full chalk luminance over the
 * void, at the fidelity of the contraction sigil.
 *
 * And it is an OBJECT, not a poster. Every point of every polyline is pushed
 * through a REFRACTIVE LENS centred on the pointer: inside the lens radius the
 * figure magnifies radially, the strokes bow and thicken, and the equation
 * field around it parts and re-forms. That happens before a single pixel of
 * scroll — moving the mouse is the first thing that changes the frame.
 *
 * Through the dive the figure scales past the camera while its stroke width
 * barely grows: it stays a LINE DRAWING, the one crisp plane in the frame,
 * while the equation field defocuses into shaped bokeh behind it. That is the
 * subject the middle of the dive was missing.
 *
 * Degradation: no fine pointer (touch) → lens strength 0, the mark still draws
 * crisp and still scales through the dive. prefers-reduced-motion → painted
 * once, statically, with no rAF at all.
 */

const CHALK_RGB = '232, 228, 220';
const RED_RGB = '196, 18, 48';
const TAU = Math.PI * 2;

interface MarkStroke {
  /** flat unit-space xy pairs (1 unit = the triangle's circumradius) */
  pts: Float32Array;
  /** stroke width in CSS px at scale 1 */
  w: number;
  alpha: number;
  red: boolean;
}

/** Deterministic per-index noise — the hand-drawn wobble is stable across
 *  frames and across mounts, so the mark never shimmers. */
const rnd1 = (i: number, s: number): number => {
  const x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453;
  return x - Math.floor(x);
};

const smooth01 = (a: number, b: number, t: number): number => {
  const x = clamp01((t - a) / (b - a));
  return x * x * (3 - 2 * x);
};

/** A drawn line is never true: displace each sample a little. */
function chalkify(pts: number[], amp: number, salt: number): Float32Array {
  const out = new Float32Array(pts.length);
  for (let i = 0; i < pts.length; i += 2) {
    const k = i >> 1;
    out[i] = pts[i] + (rnd1(k, salt) - 0.5) * amp;
    out[i + 1] = pts[i + 1] + (rnd1(k, salt + 9) - 0.5) * amp;
  }
  return out;
}

/** Arc sampled in TURNS (0–1), canvas orientation (y down). */
function arcPts(cx: number, cy: number, r: number, t0: number, t1: number, n: number): number[] {
  const pts: number[] = [];
  for (let i = 0; i < n; i++) {
    const a = (t0 + (t1 - t0) * (i / (n - 1))) * TAU;
    pts.push(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  }
  return pts;
}

/** Eye centre, in circumradius units below the triangle's circumcentre. */
const EYE_Y = 0.09;
const EYE_R = 0.52;

const MARK: MarkStroke[] = (() => {
  const out: MarkStroke[] = [];

  // Triangle, apex up. Drawn as three separate edges that OVERSHOOT their
  // corners and bow a hair — the way a hand draws one, the way the 77% sigil
  // is drawn. A perfect closed path would read as a CSS shape.
  const corners: [number, number][] = [];
  for (let c = 0; c < 3; c++) {
    const a = Math.PI / 2 + (c * TAU) / 3;
    corners.push([Math.cos(a), -Math.sin(a)]);
  }
  for (let e = 0; e < 3; e++) {
    const [ax, ay] = corners[e];
    const [bx, by] = corners[(e + 1) % 3];
    const nx = -(by - ay);
    const ny = bx - ax;
    const nl = Math.hypot(nx, ny) || 1;
    const ov = 0.05;
    const pts: number[] = [];
    const N = 44;
    for (let i = 0; i < N; i++) {
      const u = i / (N - 1);
      const t = -ov + u * (1 + 2 * ov);
      const bow = Math.sin(u * Math.PI) * 0.014 * (e === 1 ? -1 : 1);
      pts.push(ax + (bx - ax) * t + (nx / nl) * bow, ay + (by - ay) * t + (ny / nl) * bow);
    }
    out.push({ pts: chalkify(pts, 0.007, e + 1), w: 2.2, alpha: 0.96, red: false });
  }

  // The eye: one circle wide enough to cross the triangle's base, opened by
  // two gaps where the hand lifted.
  out.push({ pts: chalkify(arcPts(0, EYE_Y, EYE_R, 0.055, 0.515, 76), 0.006, 7), w: 2.0, alpha: 0.92, red: false });
  out.push({ pts: chalkify(arcPts(0, EYE_Y, EYE_R, 0.565, 1.03, 76), 0.006, 8), w: 2.0, alpha: 0.92, red: false });

  // Lashes — radial, between iris and rim, uneven.
  for (let i = 0; i < 17; i++) {
    const a = (i / 17) * TAU + 0.11;
    const r0 = 0.315 + rnd1(i, 21) * 0.03;
    const r1 = 0.462 + rnd1(i, 22) * 0.05;
    out.push({
      pts: chalkify(
        [Math.cos(a) * r0, EYE_Y + Math.sin(a) * r0, Math.cos(a) * r1, EYE_Y + Math.sin(a) * r1],
        0.008,
        30 + i,
      ),
      w: 1.5,
      alpha: 0.6 + rnd1(i, 23) * 0.22,
      red: false,
    });
  }

  // Iris + pupil — the only red in the mark, ~0.1% of the frame.
  out.push({ pts: chalkify(arcPts(0, EYE_Y, 0.245, 0.02, 1.0, 84), 0.005, 11), w: 2.8, alpha: 0.95, red: true });
  out.push({ pts: chalkify(arcPts(0, EYE_Y, 0.09, 0.0, 1.0, 44), 0.004, 12), w: 2.2, alpha: 0.9, red: true });

  return out;
})();

/** The equation vocabulary that surrounds the mark. Same register as the art. */
const MARK_GLYPHS = [
  'α', 'ψ', '∆', 'ℏ', 'λ', 'Ω', 'φ', '√5', '∂', 'Σ',
  'θ', 'ε₀', '137', '1/137', 'α⁻¹', '∞', 'π', '≈', '∮', 'ζ(s)',
  'χ', 'μ', 'iℏ∂ψ', '∇²', 'e²', 'φ²=φ+1', '137.035999', 'τ', 'Λ', 'ħω',
];

interface FieldGlyph {
  /** offset from the mark centre at rest, CSS px */
  dx: number;
  dy: number;
  ch: string;
  size: number;
  alpha: number;
}

export interface MarkPainter {
  layout(): void;
  paint(p: number, lx: number, ly: number, presence: number, speed: number): void;
}

function createMarkPainter(canvas: HTMLCanvasElement): MarkPainter | null {
  const maybeCtx = canvas.getContext('2d');
  if (!maybeCtx) return null;
  const ctx: CanvasRenderingContext2D = maybeCtx;

  let W = 1;
  let H = 1;
  let baseX = 0;
  let baseY = 0;
  let baseR = 0;
  let glyphs: FieldGlyph[] = [];
  let scratch = new Float32Array(256);

  // lens state, written per paint so warp() can stay allocation-free
  let lx = -9999;
  let ly = -9999;
  let lr = 1;
  let lk = 0;
  let wx = 0;
  let wy = 0;
  let wm = 1;

  /** Radial magnification around the pointer: a lens sitting ON the drawing. */
  function warp(x: number, y: number): void {
    const dx = x - lx;
    const dy = y - ly;
    const r2 = dx * dx + dy * dy;
    if (lk <= 0 || r2 >= lr * lr) {
      wx = x;
      wy = y;
      wm = 1;
      return;
    }
    const t2 = r2 / (lr * lr);
    const f = 1 - t2;
    const s = 1 + lk * f * f;
    wx = lx + dx * s;
    wy = ly + dy * s;
    wm = s;
  }

  function layout(): void {
    const rect = canvas.getBoundingClientRect();
    W = Math.max(1, Math.round(rect.width));
    H = Math.max(1, Math.round(rect.height));
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // The masthead is the fixed element on this page; the mark gives way to it
    // by MEASUREMENT, not by a guessed breakpoint. Right of the h1's real ink
    // on wide screens, above it when the type spans the viewport.
    const h1 = document.querySelector('.hero-title h1');
    const box = h1?.getBoundingClientRect();
    const railX = W - 60; // ScrollProgress reserves the right 55px, always
    const phone = W < 768;

    if (phone) {
      const top = box ? box.top : H * 0.38;
      baseR = Math.min(W * 0.3, Math.max(48, (top - 30) * 0.34));
      baseX = W * 0.5;
      baseY = Math.max(baseR + 16, top * 0.46);
    } else {
      const limit = (box ? box.right : W * 0.55) + 44;
      baseR = Math.min(W * 0.175, H * 0.27);
      baseX = W * 0.705;
      for (let k = 0; k < 10; k++) {
        const half = 0.866 * baseR;
        const lo = limit + half;
        const hi = railX - half;
        if (lo <= hi) {
          baseX = Math.min(Math.max(W * 0.705, lo), hi);
          break;
        }
        baseR *= 0.9;
      }
      baseY = H * 0.472;
    }

    // Equation field: a flattened annulus around the mark, culled by MEASURED
    // ink off the masthead and off the depth rail — a glyph is centred on its
    // point, so half its advance has to clear both or the rail (the best craft
    // on the site) ends up with type sitting on it.
    const lim = phone ? 10 : (box ? box.right : W * 0.55) + 20;
    const out: FieldGlyph[] = [];
    for (let i = 0; i < 140 && out.length < 30; i++) {
      const ang = i * 2.399963 + 0.7;
      const rr = (0.66 + rnd1(i, 11) * 1.32) * baseR;
      const x = baseX + Math.cos(ang) * rr * 1.12;
      const y = baseY + Math.sin(ang) * rr * 0.94;
      const ch = MARK_GLYPHS[i % MARK_GLYPHS.length];
      const size = baseR * (0.048 + rnd1(i, 3) * 0.055);
      ctx.font = `300 ${size.toFixed(1)}px 'JetBrains Mono', monospace`;
      const half = ctx.measureText(ch).width / 2 + 4;
      if (x - half < lim || x + half > railX - 6 || y < 34 || y > H - 34) continue;
      out.push({
        dx: x - baseX,
        dy: y - baseY,
        ch,
        size,
        alpha: 0.11 + rnd1(i, 5) * 0.17,
      });
    }
    glyphs = out;
  }

  /** One polyline, warped and stroked with a chalk halo. */
  function strokeChalk(pts: Float32Array, mx: number, my: number, R: number, w: number, alpha: number, red: boolean): void {
    const n = pts.length;
    if (scratch.length < n) scratch = new Float32Array(n);
    let mag = 0;
    for (let i = 0; i < n; i += 2) {
      warp(mx + pts[i] * R, my + pts[i + 1] * R);
      scratch[i] = wx;
      scratch[i + 1] = wy;
      mag += wm;
    }
    mag /= n / 2;

    const path = new Path2D();
    path.moveTo(scratch[0], scratch[1]);
    for (let i = 2; i < n; i += 2) path.lineTo(scratch[i], scratch[i + 1]);

    const rgb = red ? RED_RGB : CHALK_RGB;
    // Stroke width grows only a little with the figure's scale — the mark stays
    // a LINE DRAWING all the way through the dive rather than a swelling blob.
    const lw = w * (1 + 0.1 * (R / Math.max(baseR, 1) - 1)) * (0.9 + 0.24 * mag);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = `rgba(${rgb}, ${(alpha * 0.07).toFixed(3)})`;
    ctx.lineWidth = lw * 5.2;
    ctx.stroke(path);
    ctx.strokeStyle = `rgba(${rgb}, ${(alpha * 0.16).toFixed(3)})`;
    ctx.lineWidth = lw * 2.3;
    ctx.stroke(path);
    ctx.strokeStyle = `rgba(${rgb}, ${alpha.toFixed(3)})`;
    ctx.lineWidth = lw;
    ctx.stroke(path);
  }

  function paint(p: number, px: number, py: number, presence: number, speed: number): void {
    ctx.clearRect(0, 0, W, H);
    const dive = clamp01((p - ARRIVAL_END) / (PHASES.dive.end - ARRIVAL_END));
    if (dive >= 1) return;

    const a = clamp01(p / ARRIVAL_END);
    const ez = dive * dive; // the fall accelerates
    const eo = 1 - (1 - dive) * (1 - dive); // …and the figure settles to centre
    const scale = 1 + 3.4 * ez;
    // THE RAIL IS INVIOLABLE — including here.
    // The mark's widest feature is the triangle's base, which runs to 0.93
    // circumradii either side of centre once the overshoot is counted. On a
    // 390px phone the dive drove the figure to centre 0.6W = 234 at R ≈ 168,
    // so the right vertex landed at x ≈ 378: through the HUD's 55px reserve,
    // through the rail hairline at 367 and out over the rotated chapter label.
    // On mobile the figure therefore settles into the SAFE box (16 → W−55) and
    // its radius is capped to fit it. Desktop is untouched: at 1440 the safe
    // box is 1369 wide and nothing ever reaches it.
    const mobile = W < 768;
    const RAIL_SAFE = W - 55;
    const HALF = 0.93;
    const target = mobile ? (16 + RAIL_SAFE) / 2 : W * 0.6;
    const mx = baseX + (target - baseX) * eo;
    const my = baseY + (H * 0.5 - baseY) * eo;
    const room = Math.max(24, Math.min(mx - 16, RAIL_SAFE - mx));
    const R = mobile ? Math.min(baseR * scale, room / HALF) : baseR * scale;
    // ON A PHONE THE MARK HAS TO BE GONE EARLIER.
    // On desktop the mark dissolves onto the WebGL cosmos, so a half-opacity
    // line drawing lying over it at dive≈0.87 is depth. On mobile there is no
    // canvas underneath — the 2D archive's own chapter rule, "The work" display
    // line and first canvas are DOM, and at 17% scroll the mark's strokes were
    // running straight through that heading at ~0.47 alpha. Below the WebGL
    // breakpoint it clears out over dive 0.44–0.68, before the archive's first
    // beat is on screen, so the two never share the frame.
    const fade = W < 768 ? 1 - smooth01(0.44, 0.68, dive) : 1 - smooth01(0.72, 0.97, dive);

    lx = px;
    ly = py;
    lr = Math.max(150, Math.min(W, H) * 0.24);
    // The lens deforms harder the faster the pointer moves — it has mass.
    lk = (0.3 + Math.min(speed * 0.00085, 0.24)) * presence;

    // ---- the equation field: parts around the pointer, then defocuses -----
    const bok = smooth01(0.0, 0.14, dive);
    const gFade = 1 - smooth01(0.6, 1.0, dive);
    const gr = lr * 0.86;
    const gp = 44 * presence;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < glyphs.length; i++) {
      const g = glyphs[i];
      const spread = 1 + dive * 2.1 + ez * 0.7;
      let gx = mx + g.dx * spread;
      let gy = my + g.dy * spread;
      const ddx = gx - lx;
      const ddy = gy - ly;
      const rr = Math.hypot(ddx, ddy) || 1;
      const f = Math.exp(-(rr * rr) / (gr * gr));
      gx += (ddx / rr) * gp * f;
      gy += (ddy / rr) * gp * f;
      const al = g.alpha * (1 - f * 0.6 * presence) * gFade * (0.55 + a * 0.45);
      if (al <= 0.004) continue;
      if (bok < 0.999) {
        ctx.fillStyle = `rgba(${CHALK_RGB}, ${(al * (1 - bok)).toFixed(3)})`;
        ctx.font = `300 ${g.size.toFixed(1)}px 'JetBrains Mono', monospace`;
        ctx.fillText(g.ch, gx, gy);
      }
      if (bok > 0.001) {
        // Out-of-focus highlights become SHAPED bokeh: a disc with a hot rim,
        // not a gaussian smear of the glyph.
        const rad = g.size * (0.6 + dive * 7.2);
        ctx.beginPath();
        ctx.arc(gx, gy, rad, 0, TAU);
        ctx.fillStyle = `rgba(${CHALK_RGB}, ${(al * bok * 0.17).toFixed(3)})`;
        ctx.fill();
        ctx.lineWidth = Math.max(1, rad * 0.1);
        ctx.strokeStyle = `rgba(${CHALK_RGB}, ${(al * bok * 0.44).toFixed(3)})`;
        ctx.stroke();
      }
    }

    // ---- the mark itself: the one crisp plane -----------------------------
    const markA = (0.9 + a * 0.1) * fade;
    if (markA <= 0.004) return;
    for (let i = 0; i < MARK.length; i++) {
      const s = MARK[i];
      strokeChalk(s.pts, mx, my, R, s.w, s.alpha * markA, s.red);
    }
  }

  return { layout, paint };
}

export function Hero() {
  const { reducedMotion } = useJourney();
  const [art, setArt] = useState<(typeof HERO_ART)[number] | null>(null);
  const [loaded, setLoaded] = useState(false);

  const sectionRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const orbitRef = useRef<HTMLDivElement>(null);
  const fadeRef = useRef<HTMLDivElement>(null);
  const ruleLineRef = useRef<HTMLDivElement>(null);
  const ruleGlowRef = useRef<HTMLDivElement>(null);
  const cueRef = useRef<HTMLDivElement>(null);
  const markRef = useRef<HTMLCanvasElement>(null);

  /** Per-piece brightness gain that lands every ghost at the same presence. */
  const artGain = art ? Math.min(1.7, Math.max(0.6, ART_TARGET_LUM / art.lum)) : 1;

  // Pick the hero artwork client-side, post-hydration (avoids SSR mismatch).
  useEffect(() => {
    // Random pick must happen post-hydration; setState here is intended
    // (same pattern as JourneyContext's environment detection).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setArt(HERO_ART[Math.floor(Math.random() * HERO_ART.length)]);
  }, []);

  // Per-frame arrival choreography — zero re-renders, dt-based smoothing so it
  // tracks scroll identically at 3fps and at 120fps. This is also the loop that
  // paints the hero mark: one rAF owns the whole entrance, so the lens, the
  // equation field, the parallax and the rule all read the same clock.
  useEffect(() => {
    const canvas = markRef.current;
    if (!canvas) return;
    const painter = createMarkPainter(canvas);
    if (!painter) return;
    painter.layout();

    const fine =
      typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches;

    // ---- reduced motion: the mark is drawn ONCE, crisp, and never moves ----
    // layout() re-sizes the backing store, which CLEARS it, so every relayout
    // has to be followed by a repaint here — there is no frame loop to do it.
    if (reducedMotion) {
      const draw = () => {
        painter.layout();
        painter.paint(0, -9999, -9999, 0, 0);
      };
      draw();
      void document.fonts?.ready.then(draw);
      window.addEventListener('resize', draw);
      return () => window.removeEventListener('resize', draw);
    }

    // The mark is laid out off the masthead's REAL ink, so it has to be
    // re-measured once Cormorant has actually swapped in.
    void document.fonts?.ready.then(() => painter.layout());

    // Pointer: raw target, spring-damped lens position, and a presence ramp so
    // the object arrives rather than snapping into being.
    let ptrX = -9999;
    let ptrY = -9999;
    let lensX = -9999;
    let lensY = -9999;
    let ptrSpeed = 0;
    let presTarget = 0;
    let pres = 0;
    let seen = false;
    let nx = 0; // normalized cursor for the parallax layers
    let ny = 0;
    let pnx = 0;
    let pny = 0;

    const onMove = (e: PointerEvent) => {
      if (!fine) return;
      const px = e.clientX;
      const py = e.clientY;
      if (seen) {
        const d = Math.hypot(px - ptrX, py - ptrY);
        ptrSpeed = Math.max(ptrSpeed, d * 60);
      } else {
        lensX = px;
        lensY = py;
        seen = true;
      }
      ptrX = px;
      ptrY = py;
      nx = (px / window.innerWidth) * 2 - 1;
      ny = (py / window.innerHeight) * 2 - 1;
      presTarget = 1;
    };
    const onLeave = () => {
      presTarget = 0;
    };
    const onResize = () => painter.layout();
    if (fine) window.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerleave', onLeave);
    window.addEventListener('resize', onResize);

    let raf = 0;
    let hidden = false;
    let smooth = rawProgress();
    let vel = 0;
    let prevRaw = smooth;
    let prevT = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(Math.max((now - prevT) / 1000, 1 / 240), 0.25);
      prevT = now;

      const raw = rawProgress();
      // Frame-rate-independent one-pole filter (~14 rad/s).
      smooth += (raw - smooth) * (1 - Math.exp(-dt * 14));
      if (Math.abs(raw - smooth) < 0.0002) smooth = raw;

      // Velocity in progress-units/sec, likewise dt-normalised.
      const inst = (raw - prevRaw) / dt;
      prevRaw = raw;
      vel += (inst - vel) * (1 - Math.exp(-dt * 9));
      if (Math.abs(vel) < 0.0008) vel = 0;
      const v = Math.abs(vel);

      // Perf: hide entirely once the dive is over and we've scrolled past.
      const shouldHide = smooth > PHASES.dive.end + PIN_BUFFER + 0.01;
      if (shouldHide !== hidden && sectionRef.current) {
        sectionRef.current.style.visibility = shouldHide ? 'hidden' : 'visible';
        hidden = shouldHide;
      }

      // Scroll cue fades on first scroll (returns if user scrolls back to top).
      if (cueRef.current) cueRef.current.style.opacity = smooth < 0.004 ? '1' : '0';

      // ---- the pointer: lens, presence, parallax -------------------------
      // Spring-damped so the lens has mass: the drawing does not snap to the
      // cursor, it follows it. Speed decays per second, not per frame.
      pres += (presTarget - pres) * (1 - Math.exp(-dt * 6));
      const lensK = 1 - Math.exp(-dt * 11);
      if (seen) {
        lensX += (ptrX - lensX) * lensK;
        lensY += (ptrY - lensY) * lensK;
      }
      ptrSpeed *= Math.exp(-dt * 5);
      pnx += (nx - pnx) * (1 - Math.exp(-dt * 5));
      pny += (ny - pny) * (1 - Math.exp(-dt * 5));

      if (!hidden && painter) painter.paint(smooth, lensX, lensY, pres, ptrSpeed);

      if (smooth < ARRIVAL_END + 0.001 && !reducedMotion) {
        const a = clamp01(smooth / ARRIVAL_END); // 0→1 across the arrival

        // Artwork rises INTO legibility as you approach the dive — it is the
        // thing you are about to fall into, so it gains presence, not less.
        if (fadeRef.current) {
          fadeRef.current.style.opacity = loaded ? (0.34 + a * 0.15).toFixed(3) : '0';
        }
        if (orbitRef.current) {
          // The ghost is the FURTHEST plane, so it answers the pointer least.
          orbitRef.current.style.transform = `translate3d(${(a * -1.6 - pnx * 0.42 * pres).toFixed(3)}vw, ${(-pny * 0.28 * pres).toFixed(3)}vh, 0) scale(${(1 + a * 0.055).toFixed(4)})`;
        }

        // Red rule: length answers BOTH scroll position (it extends as you
        // descend) and scroll velocity (it snaps longer + hotter when you
        // move). Origin is the left terminus — it grows out of the masthead.
        const grow = 1 + a * 0.31 + Math.min(v * 1.5, 0.42);
        if (ruleLineRef.current) {
          ruleLineRef.current.style.transform = `scaleX(${grow.toFixed(4)})`;
        }
        if (ruleGlowRef.current) {
          ruleGlowRef.current.style.transform = `scaleX(${grow.toFixed(4)})`;
          ruleGlowRef.current.style.opacity = (0.16 + a * 0.1 + Math.min(v * 2.6, 0.62)).toFixed(3);
        }

        // Whisper of parallax on the name during arrival — and a COUNTER-shift
        // against the pointer, so the masthead and the mark sit on visibly
        // different planes the moment the mouse moves.
        if (titleRef.current) {
          titleRef.current.style.transform = `translate3d(${(pnx * 0.32 * pres).toFixed(3)}vh, ${(a * -2.2 + pny * 0.34 * pres).toFixed(3)}vh, 0)`;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      if (fine) window.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('resize', onResize);
    };
  }, [reducedMotion, loaded]);

  // Letter-level spans — the Dive animates them in Z (class contract:
  // .hero-letter). data-dx = signed offset from the line's own centre;
  // data-sf scales the spread so the smaller line parts proportionally.
  const nameLines = NAME_LINES.map((line) => {
    const lineCenter = (line.text.length - 1) / 2;
    return (
      <span
        key={line.text}
        aria-hidden
        style={{
          display: 'block',
          whiteSpace: 'nowrap',
          transformStyle: 'preserve-3d',
          fontSize: line.size,
          letterSpacing: line.tracking,
          lineHeight: line.lh,
        }}
      >
        {line.text.split('').map((ch, j) => (
          <span
            key={`${line.text}-${j}`}
            className="hero-letter"
            data-dx={(j - lineCenter).toFixed(2)}
            data-sf={line.sf}
            style={{
              display: 'inline-block',
              transformStyle: 'preserve-3d',
              willChange: 'transform, opacity, filter',
              filter: 'blur(0px)',
            }}
          >
            {ch}
          </span>
        ))}
      </span>
    );
  });

  return (
    <section
      ref={sectionRef}
      data-phase="arrival"
      aria-label="Michael MacDonald — arrival"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: reducedMotion ? '100vh' : `${PIN_END_VH}vh`,
        zIndex: 2,
        pointerEvents: 'none',
      }}
    >
      <style>{HERO_CSS}</style>
      <div
        className="hero-pin"
        style={{
          position: reducedMotion ? 'relative' : 'sticky',
          top: 0,
          height: '100vh',
          overflow: 'hidden',
        }}
      >
        {/* Void base — the DOM side of the DOM→3D crossfade (Dive fades it to 0). */}
        <div
          className="hero-void"
          aria-hidden
          style={{ position: 'absolute', inset: 0, background: VOID }}
        />

        <div className="hero-stage" style={{ position: 'absolute', inset: 0 }}>
          {/* Ghosted hero artwork — right of centre, and parts like a veil
              during the dive. Lifted to the edge of legibility: the forms have
              to seduce, a dark smudge cannot. */}
          <div
            className="hero-art-pos"
            aria-hidden
            style={{ position: 'absolute', top: '50%', transform: 'translate(-50%, -50%)' }}
          >
            <div className="hero-art-orbit" style={{ willChange: 'transform' }}>
              <div
                className="hero-art-frame"
                style={{ position: 'relative', willChange: 'transform, opacity' }}
              >
                <div
                  className="hero-art-fade"
                  ref={fadeRef}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    opacity: loaded ? 0.34 : 0,
                    // The mark is now the drawing in this frame, so the
                    // artwork is GROUND: pushed toward neutral chalk-grey and
                    // separated (contrast) so its own handwriting reads as
                    // texture instead of as brown-grey mud competing for the
                    // eye. Nothing here is allowed to tint the void.
                    filter: `brightness(${artGain.toFixed(3)}) contrast(1.34) saturate(0.34)`,
                    transition: 'opacity 1.4s ease',
                  }}
                >
                  {/* Both halves are ALWAYS in the DOM (only the <Image> inside
                      is conditional) — Dive.tsx resolves its GSAP targets once,
                      on mount, and a late-mounting node would never be animated:
                      that is what kept the veil from parting. */}
                  <div
                    className="hero-art-left"
                    style={{
                      position: 'absolute',
                      inset: 0,
                      clipPath: TEAR_CLIP_L,
                      // Mask rides WITH each half — a veil that keeps its soft
                      // edges as it parts, rather than sliding out from under a
                      // stationary vignette and turning into a hard rectangle.
                      maskImage: ART_MASK,
                      WebkitMaskImage: ART_MASK,
                      willChange: 'transform',
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        maskImage: TEAR_L,
                        WebkitMaskImage: TEAR_L,
                      }}
                    >
                      {art && (
                        <Image
                          src={art.src}
                          alt=""
                          fill
                          sizes="(max-width: 767px) 62vw, 34vw"
                          priority
                          style={{ objectFit: 'contain' }}
                          onLoad={() => setLoaded(true)}
                        />
                      )}
                    </div>
                  </div>
                  <div
                    className="hero-art-right"
                    style={{
                      position: 'absolute',
                      inset: 0,
                      clipPath: TEAR_CLIP_R,
                      maskImage: ART_MASK,
                      WebkitMaskImage: ART_MASK,
                      willChange: 'transform',
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        maskImage: TEAR_R,
                        WebkitMaskImage: TEAR_R,
                      }}
                    >
                      {art && (
                        <Image src={art.src} alt="" fill sizes="(max-width: 767px) 62vw, 34vw" style={{ objectFit: 'contain' }} />
                      )}
                    </div>
                  </div>
                </div>

                {/* The seam the veil parts along. Born as the red rule dies —
                    the only other red in the frame, and only during the dive. */}
                <div
                  className="hero-seam"
                  style={{
                    position: 'absolute',
                    left: '50%',
                    top: '22%',
                    width: 1,
                    height: '56%',
                    marginLeft: -0.5,
                    background: RED,
                    maskImage: SEAM_MASK,
                    WebkitMaskImage: SEAM_MASK,
                    opacity: 0,
                    transformOrigin: '50% 50%',
                    willChange: 'transform, opacity',
                  }}
                />
              </div>
            </div>
          </div>

          {/* The masthead — MASSIVE, chalk on void, flush-left, optically justified. */}
          <div
            ref={titleRef}
            className="hero-title"
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              justifyContent: 'center',
              paddingLeft: GUTTER,
              gap: 34,
              willChange: 'transform',
            }}
          >
            <h1
              aria-label="Michael MacDonald"
              style={{
                margin: 0,
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontWeight: 300,
                color: CHALK,
                textAlign: 'left',
                perspective: '1100px',
              }}
            >
              {nameLines}
            </h1>

            {/* Red rule — flush with the masthead's left edge, length = block/φ²,
                measurement tick at 13.7%. Extends with descent AND with scroll
                velocity (rAF above). Origin left: it grows out of the name. */}
            <div
              className="hero-rule"
              aria-hidden
              style={{
                position: 'relative',
                width: `calc(${RULE_W_VW.toFixed(3)} * var(--hero-u))`,
                height: 1,
                transformOrigin: 'left center',
                willChange: 'transform, opacity',
              }}
            >
              <div
                ref={ruleGlowRef}
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: RED,
                  boxShadow: '0 0 16px 2px rgba(196, 18, 48, 0.5)',
                  opacity: 0.16,
                  transformOrigin: 'left center',
                  transform: 'scaleX(1)',
                }}
              />
              <div
                ref={ruleLineRef}
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: RED,
                  transformOrigin: 'left center',
                  transform: 'scaleX(1)',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  left: `calc(${RULE_TICK_VW.toFixed(3)} * var(--hero-u))`,
                  top: -4,
                  width: 1,
                  height: 9,
                  background: RED,
                  opacity: 0.8,
                }}
              />
            </div>
          </div>

          {/* THE MARK. Full-viewport canvas so the figure can scale past the
              frame during the dive without a clip. Above the masthead in the
              stack: during the arrival the two do not overlap (the mark is
              laid out off the h1's measured ink), and during the dive the
              crisp line drawing must read THROUGH the defocused letters. */}
          <canvas
            ref={markRef}
            className="hero-mark"
            aria-hidden
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none',
            }}
          />

          {/* Scroll cue — flush-left with the masthead. Fades on first scroll. */}
          <div
            ref={cueRef}
            className="hero-cue"
            aria-hidden
            style={{
              position: 'absolute',
              left: GUTTER,
              bottom: 55,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: 13,
              opacity: 1,
              transition: 'opacity 0.618s ease',
            }}
          >
            <span
              style={{
                fontFamily: MONO,
                fontSize: '0.65rem',
                fontWeight: 300,
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                color: FADED,
              }}
            >
              Scroll to Descend
            </span>
            <div
              style={{
                position: 'relative',
                width: 1,
                height: 34,
                background: 'rgba(232, 228, 220, 0.12)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  top: -13,
                  width: 1,
                  height: 13,
                  background: FADED,
                  animation: reducedMotion
                    ? 'none'
                    : 'hero-tick 2.2s cubic-bezier(0.45, 0, 0.55, 1) infinite',
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
