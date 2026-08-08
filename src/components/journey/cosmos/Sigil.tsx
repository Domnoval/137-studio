'use client';

// cosmos/Sigil.tsx — the CONTRACTION climax (62–78%).
//
// The beat, in order:
//   1. THE WARP (60–71%). The corridor turns into velocity. Several hundred
//      streaks fall inward along golden-spiral trajectories — every one with
//      its own speed, so trail length spreads ~10x — rendered as tapered
//      screen-space ribbons: bright head, vanishing tail, 0.5–2.5px depending
//      on depth. Density falls away toward the middle, so a throat opens on
//      the axis. Meanwhile the golden spiral draws itself from the OUTSIDE IN,
//      sweeping the whole frame and winding down onto the eye.
//      The camera axis, the streak convergence point and the post-chain's
//      warp centre are all published from ONE point (this group's centre), so
//      the whole frame — receding artwork included — reads as one motion.
//   2. THE RESOLUTION (71–76.5%). The streaks land and the mark writes itself
//      on in struck chalk: the armature, then Michael's own eye (socket, brow,
//      filaments, off-centre iris, catchlight), then the drips. Nothing cuts.
//   3. APEX (76.3–77.2%) — the finished mark stands still at full luminance
//      and full scale with the constant measured off its own base — then from
//      77.2% it rushes the camera and DISSOLVES into the dust copy of itself,
//      which the veil then closes over into RETURN.
//
// Progress is read RAW from the scroll position (Lenis already smooths the
// scroll itself); the context's extra per-frame lerp is frame-rate dependent
// and would slide the climax off-beat on slow machines.

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { cosmosShared, smoothstep } from './shared';
import { contraction, srgbToLinear } from './contraction-state';
import { buildRibbon } from './chalk-ribbon';
import {
  armatureStrokes,
  socketStrokes,
  lashStrokes,
  irisStrokes,
  catchlightStrokes,
  dripStrokes,
  spiralStroke,
  markTargets,
  BASE_X0,
  BASE_X1,
  BASE_Y,
  EYE_CY,
} from './sigil-form';
import { getDustSprite } from './textures';

/* ------------------------------------------------------------ raw progress */

let maxScroll = 1;
let maxAge = 999;
function rawProgress(): number {
  if (typeof window === 'undefined') return 0;
  if (maxAge++ > 45) {
    maxAge = 0;
    maxScroll = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
  }
  const v = window.scrollY / maxScroll;
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/* ------------------------------------------------------------------ timing */

// Starts BEFORE the contraction phase boundary on purpose: the last painting is
// still dissolving at 0.60, so the warp takes the frame over from it instead of
// leaving a dead beat between them. cp = (p - 0.6) / 0.19.
const C_START = 0.6;
// ONE APEX, NOT TWO.
// The climax used to write itself on across 0.60–0.73 and hold to 0.752, which
// put a HALF-DRAWN, low-luminance triangle-and-eye on screen at ~69% and the
// finished one at ~77% — the same image, stated twice, the first time weakly.
// The span is now stretched so the two beats are different pictures:
//   0.60–0.71  THE WARP. Velocity only: hundreds of tapered streaks falling in
//              on golden-spiral trajectories with the spiral itself sweeping
//              the whole frame. No mark. Nothing to restate.
//   0.70–0.76  the mark strikes itself on.
//   0.76–0.78  THE APEX (a real ~2% beat, ~14vh of scroll) — full luminance, full scale, the constant set on it
//              as a measured dimension line (Contraction.tsx). This is the
//              loudest frame in the site and it happens exactly once.
//   0.78–0.80  rush + dissolve, veil closes, hand-off to RETURN.
const C_SPAN = 0.19;
const RUSH_START = 0.78;
const RUSH_SPAN = 0.022;

// world units → the mark reads ~74% of viewport height (was 7.2 ≈ 62%). The
// apex is allowed to be the biggest thing on the site; at this distance the
// triangle still clears the HUD rail by >290px on a 1440 frame.
const HOLD_DIST = 6.6;
const FAR_DIST = 34;

const PULSE_AT = 0.86;
const PULSE_SIGMA = 0.03;

const CHALK = new THREE.Color('#e8e4dc');
const RED = new THREE.Color('#c41230');

// the ground under the climax: cold blue-black through the warp, resolving to
// a slightly warmer, denser dark for the beat itself. Still near-black, still
// no second accent — a temperature swing inside the existing discipline.
const GROUND_COLD = srgbToLinear('#090b12');
const GROUND_WARM = srgbToLinear('#120c0b');

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/* ------------------------------------------------------------- the streaks */

const STREAKS = 340;
const SEG = 14;
// The launch window is wide so the warp is a CONTINUOUS gradient of streaks —
// some just landing, some mid-flight with long trails, some still leaving the
// rim — rather than one synchronised volley that is over in a blink. With the
// stretched span this is what carries the 69% frame on its own.
const STAG_MAX = 0.62;

function mulberry(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const STREAK_VERT = /* glsl */ `
  uniform float uBase;
  uniform vec2 uRes;
  uniform float uOpacity;
  uniform vec3 uChalk;
  uniform vec3 uRed;
  attribute vec3 aP0;   // r0, a0, z0
  attribute vec3 aP1;   // rTarget, aTarget, turn
  attribute vec4 aQ;    // stagger, velocity, halfWidthPx, red
  attribute vec2 aTS;   // t along the ribbon (0 tail, 1 head), side
  varying float vA;
  varying float vS;
  varying vec3 vC;

  float ease(float x) { x = clamp(x, 0.0, 1.0); return x * x * (3.0 - 2.0 * x); }

  vec3 traj(float e) {
    float rr = mix(aP0.x, aP1.x, e);
    float aa = aP1.y + (aP0.y - aP1.y + aP1.z) * (1.0 - e);
    // a tangential swirl that tightens as the radius drops: streaks bend
    // AROUND the throat instead of running straight through the subject
    aa += 0.62 * (1.0 - e) * (1.0 - e) / (1.0 + rr * 0.20);
    return vec3(cos(aa) * rr, sin(aa) * rr, aP0.z * (1.0 - e));
  }

  void main() {
    float t = aTS.x;
    float side = aTS.y;

    float eH = ease(clamp((uBase - aQ.x) / (1.0 - ${STAG_MAX.toFixed(2)}), 0.0, 1.0));
    // trail length is per-particle velocity: a ~10x spread across the field,
    // collapsing to zero exactly at arrival so nothing spikes on landing
    float trail = aQ.y * 0.32 * (1.0 - eH * 0.92);
    float e = max(eH - trail * (1.0 - t), 0.0);
    float e2 = max(eH - trail * (1.0 - min(t + 0.05, 1.0)), 0.0);

    mat4 mvp = projectionMatrix * modelViewMatrix;
    vec4 cur = mvp * vec4(traj(e), 1.0);
    vec4 nxt = mvp * vec4(traj(e2), 1.0);
    vec2 sc = cur.xy / max(abs(cur.w), 1e-4) * uRes * 0.5;
    vec2 sn = nxt.xy / max(abs(nxt.w), 1e-4) * uRes * 0.5;
    vec2 dir = sn - sc;
    if (dot(dir, dir) < 1e-8) dir = vec2(1.0, 0.0);
    dir = normalize(dir);
    vec2 nrm = vec2(-dir.y, dir.x);

    float hw = max(aQ.z * mix(0.15, 1.0, pow(t, 0.7)), 0.16);
    cur.xy += nrm * side * hw * 2.0 / uRes * max(abs(cur.w), 1e-4);
    gl_Position = cur;

    // bright head, vanishing tail
    float a = pow(t, 1.9);
    // radial density falloff — a clear throat opens on the axis
    float rNow = mix(aP0.x, aP1.x, e);
    a *= mix(smoothstep(0.8, 5.0, rNow), 1.0, eH * eH);
    // and out cleanly as it lands on the mark
    a *= 1.0 - smoothstep(0.88, 1.0, eH);

    vA = a * uOpacity;
    vS = side;
    vC = mix(uChalk, uRed * 1.5, aQ.w);
  }
`;

const STREAK_FRAG = /* glsl */ `
  precision mediump float;
  varying float vA;
  varying float vS;
  varying vec3 vC;
  void main() {
    float a = vA * smoothstep(0.0, 0.62, 1.0 - abs(vS));
    if (a < 0.004) discard;
    gl_FragColor = vec4(vC, a);
  }
`;

/* -------------------------------------------------------------------------- */

export function Sigil() {
  const groupRef = useRef<THREE.Group>(null);

  const kit = useMemo(() => {
    const rnd = mulberry(1370);

    /* ---- streaks: ribbons on golden-spiral trajectories ---- */
    const targets = markTargets(STREAKS, 909);
    const verts = STREAKS * SEG * 2;
    const p0 = new Float32Array(verts * 3);
    const p1 = new Float32Array(verts * 3);
    const q = new Float32Array(verts * 4);
    const ts = new Float32Array(verts * 2);
    const zero = new Float32Array(verts * 3);
    const idx = new Uint32Array(STREAKS * (SEG - 1) * 6);

    let vi = 0;
    let ii = 0;
    for (let i = 0; i < STREAKS; i++) {
      const tgt = targets[i];
      const rT = Math.hypot(tgt.x, tgt.y);
      const aT = Math.atan2(tgt.y, tgt.x);
      // radii skewed OUT so the middle of the frame stays open
      const r0 = 6.5 + Math.pow(rnd(), 0.42) * 23;
      const a0 = rnd() * Math.PI * 2;
      const z0 = (rnd() - 0.5) * 4 - 0.3;
      const turn = (0.7 + rnd() * 1.15) * (rnd() < 0.5 ? -1 : 1);
      const stag = rnd() * STAG_MAX;
      const vel = 0.1 + Math.pow(rnd(), 2) * 0.9; // 10x length spread
      const depth = 1 - Math.min(1, (r0 - 6.5) / 23);
      const hw = Math.min(2.3, Math.max(0.45, 0.5 + depth * 1.0 + vel * 0.8));
      const red = rnd() < 0.08 ? 1 : 0;

      const base = vi;
      for (let s = 0; s < SEG; s++) {
        const t = s / (SEG - 1);
        for (let k = 0; k < 2; k++) {
          const o3 = (vi + k) * 3;
          const o4 = (vi + k) * 4;
          const o2 = (vi + k) * 2;
          p0[o3] = r0;
          p0[o3 + 1] = a0;
          p0[o3 + 2] = z0;
          p1[o3] = rT;
          p1[o3 + 1] = aT;
          p1[o3 + 2] = turn;
          q[o4] = stag;
          q[o4 + 1] = vel;
          q[o4 + 2] = hw;
          q[o4 + 3] = red;
          ts[o2] = t;
          ts[o2 + 1] = k === 0 ? -1 : 1;
        }
        vi += 2;
      }
      for (let s = 0; s < SEG - 1; s++) {
        const a = base + s * 2;
        idx[ii++] = a;
        idx[ii++] = a + 1;
        idx[ii++] = a + 2;
        idx[ii++] = a + 1;
        idx[ii++] = a + 3;
        idx[ii++] = a + 2;
      }
    }

    const streakGeo = new THREE.BufferGeometry();
    streakGeo.setAttribute('position', new THREE.BufferAttribute(zero, 3));
    streakGeo.setAttribute('aP0', new THREE.BufferAttribute(p0, 3));
    streakGeo.setAttribute('aP1', new THREE.BufferAttribute(p1, 3));
    streakGeo.setAttribute('aQ', new THREE.BufferAttribute(q, 4));
    streakGeo.setAttribute('aTS', new THREE.BufferAttribute(ts, 2));
    streakGeo.setIndex(new THREE.BufferAttribute(idx, 1));
    streakGeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 60);

    const streakMat = new THREE.ShaderMaterial({
      vertexShader: STREAK_VERT,
      fragmentShader: STREAK_FRAG,
      uniforms: {
        uBase: { value: 0 },
        uRes: { value: new THREE.Vector2(1440, 900) },
        uOpacity: { value: 0 },
        uChalk: { value: CHALK.clone() },
        uRed: { value: RED.clone() },
      },
      transparent: true,
      depthWrite: false,
      depthTest: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      fog: false,
    });
    const streaks = new THREE.Mesh(streakGeo, streakMat);
    streaks.frustumCulled = false;

    /* ---- the mark, in struck chalk ---- */
    const spiral = buildRibbon([spiralStroke(360)], { overlap: 1, color: '#e8e4dc', grain: 0.55, seed: 11, arcLength: false });
    spiral.mesh.position.y = EYE_CY;
    const armature = buildRibbon(armatureStrokes(), { overlap: 0.42, color: '#e8e4dc', grain: 1, seed: 21 });
    const socket = buildRibbon(socketStrokes(), { overlap: 0.35, color: '#e8e4dc', grain: 1, seed: 31 });
    const lashes = buildRibbon(lashStrokes(), { overlap: 0.86, color: '#e8e4dc', grain: 1, seed: 41 });
    const iris = buildRibbon(irisStrokes(), { overlap: 0.5, color: '#c41230', grain: 0.9, seed: 51 });
    const glint = buildRibbon(catchlightStrokes(), { overlap: 1, color: '#e8e4dc', grain: 0.5, seed: 61 });
    const drips = buildRibbon(dripStrokes(), { overlap: 0.7, color: '#e8e4dc', grain: 1, seed: 71 });

    const ribbons = [spiral, armature, socket, lashes, iris, glint, drips];
    ribbons.forEach((r, i) => {
      r.mesh.renderOrder = 20 + i;
    });

    /* ---- residual dust sitting ON the mark ---- */
    const FORM = 900;
    const formTargets = markTargets(FORM, 4242);
    const formPos = new Float32Array(FORM * 3);
    for (let i = 0; i < FORM; i++) {
      formPos[i * 3] = formTargets[i].x;
      formPos[i * 3 + 1] = formTargets[i].y;
      formPos[i * 3 + 2] = (rnd() - 0.5) * 0.1;
    }
    const formGeo = new THREE.BufferGeometry();
    formGeo.setAttribute('position', new THREE.BufferAttribute(formPos, 3));
    const formMat = new THREE.PointsMaterial({
      map: getDustSprite(),
      color: CHALK.clone(),
      size: 0.042,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
    });
    const formation = new THREE.Points(formGeo, formMat);
    formation.frustumCulled = false;
    formation.renderOrder = 19;

    /* ---- red bloom disc behind the eye: the pulse only ---- */
    const haloMat = new THREE.MeshBasicMaterial({
      map: getDustSprite(),
      color: RED.clone(),
      transparent: true,
      opacity: 0,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
    });
    const halo = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), haloMat);
    halo.scale.setScalar(3.4);
    halo.frustumCulled = false;
    halo.renderOrder = 11;

    /* ---- the ground closing in behind the mark ---- */
    const maskMat = new THREE.ShaderMaterial({
      uniforms: {
        uOpacity: { value: 0 },
        uColor: { value: new THREE.Vector3(...GROUND_COLD) },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        precision mediump float;
        uniform float uOpacity;
        uniform vec3 uColor;
        varying vec2 vUv;
        void main() {
          float d = length(vUv - 0.5);
          float a = (1.0 - smoothstep(0.33, 0.5, d)) * uOpacity;
          if (a < 0.002) discard;
          gl_FragColor = vec4(uColor, a);
        }
      `,
      transparent: true,
      depthWrite: false,
      depthTest: false,
    });
    const mask = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), maskMat);
    mask.position.set(0, 0, -2.5);
    mask.frustumCulled = false;
    mask.renderOrder = 10;

    return { streaks, streakMat, ribbons, spiral, armature, socket, lashes, iris, glint, drips, formation, formMat, halo, haloMat, mask, maskMat };
  }, []);

  const fwd = useMemo(() => new THREE.Vector3(), []);
  const tmp = useMemo(() => new THREE.Vector3(), []);
  const groundCol = useMemo(() => new THREE.Vector3(), []);
  const lastRes = useRef(0);
  // react-compiler treats memo results as frozen; everything mutated per frame
  // is reached through this unfrozen shallow copy, never through `kit` itself.
  const liveRef = useRef<typeof kit | null>(null);

  useFrame((state) => {
    const g = groupRef.current;
    if (!g) return;
    if (!liveRef.current) liveRef.current = { ...kit };
    const live = liveRef.current;
    const p = rawProgress();
    const cp = clamp01((p - C_START) / C_SPAN);
    const rush = clamp01((p - RUSH_START) / RUSH_SPAN);

    // ---- distance from the camera: approach, hold, then rush through ----
    // The pass-through is told by DISSOLVE, not by scale. Driving dist to -7
    // meant the mark spent ~4% of the track as a 3-4x ring with its apex and
    // base off-frame — an unreadable donut that read as a broken zoom. It now
    // comes at the camera to ~1.7x while dissolving into the dust copy of the
    // same form (Dust.tsx holds it at matched apparent size), and the veil
    // closes over that.
    const dist =
      rush <= 0
        ? lerp(FAR_DIST, HOLD_DIST, smoothstep(0, 0.6, cp))
        : lerp(HOLD_DIST, 1.5, rush * rush);
    const fade = (1 - smoothstep(0.16, 0.78, rush)) * smoothstep(0.0, 0.05, cp);
    const visible = cp > 0.003 && fade > 0.002 && dist > 0.4;

    // ---- publish the beat: ground temperature + the post-chain warp ----
    // Warp peaks through the velocity phase and is fully off before the mark
    // resolves, so the climax itself is never smeared.
    // The warp POST effect desaturates by up to .76 and multiplies the frame
    // down by up to ~.5 while it smears — held at full strength across the
    // middle of the beat it made 69% the dimmest picture in the site (p99
    // luminance 57/255). It is now a short accent on the ENTRY to the velocity,
    // and the streak geometry — which is lit, not smeared — carries the speed
    // for the rest of it.
    //
    // ONSET IS GATED PAST THE COSMOS, NOT PAST THE PHASE NUMBER.
    // The warp used to open at cp≈0.02 (p≈0.604). THE COSMOS's last beat — the
    // formation's low, raking second vantage — is still fully composed and on
    // screen until p=0.62, so a 12-tap radial smear plus a .17 desaturation was
    // landing ON fifteen sharp canvases: at 61.5% every work in the formation
    // read soft and cold, like a render that had not finished. The velocity
    // beat now starts at cp=0.13 (p≈0.625), AFTER the corridor has handed over,
    // and the tail is pulled in to match so the mark still strikes onto a clean
    // frame. Nothing about the beat's shape changes — it is the same accent on
    // the entry to the velocity, moved off the picture it was smearing.
    const WARP_IN = 0.13;
    const warp = smoothstep(WARP_IN, 0.28, cp) * (1 - smoothstep(0.3, 0.48, cp));
    const beat = smoothstep(0.66, 0.86, cp);
    // capped: at full strength the warp smear ate every edge in the frame and
    // left 69% the dimmest picture in the site (p99 luminance 57/255). Velocity
    // has to be legible to read as velocity.
    contraction.warp = visible ? warp * 0.85 * (1 - rush) : 0;
    contraction.cool =
      visible ? 0.62 * smoothstep(WARP_IN, WARP_IN + 0.24, cp) * (1 - beat * 0.5) * (1 - rush) : 0;
    contraction.vig = visible ? beat * fade : 0;

    g.visible = visible;
    if (!visible) {
      contraction.live = false;
      return;
    }

    // lock to the view: the climax is always centred and always this big
    const cam = state.camera;
    cam.getWorldDirection(fwd);
    g.position.copy(cam.position).addScaledVector(fwd, dist);
    g.quaternion.copy(cam.quaternion);
    // the sigil sits ON the camera axis (a whisper of parallax, no more) so
    // the vanishing point, the streak convergence and the warp centre coincide
    g.translateX(-cosmosShared.swayX * 0.05);
    g.translateY(-cosmosShared.swayY * 0.035);

    const t = state.clock.elapsedTime;
    const d = (cp - PULSE_AT) / PULSE_SIGMA;
    const pulse = Math.exp(-d * d);
    g.rotateZ(Math.sin(t * 0.07) * 0.012);
    g.scale.setScalar(1 + pulse * 0.05);
    g.updateMatrixWorld();

    // ---- the vanishing point, published in UV for the post chain ----
    tmp.copy(g.position).project(cam);
    contraction.cx = tmp.x * 0.5 + 0.5;
    contraction.cy = tmp.y * 0.5 + 0.5;

    // ---- projected baseline, so the caption can lock to it ----
    if (rush <= 0) {
      tmp.set(BASE_X0, BASE_Y, 0);
      g.localToWorld(tmp).project(cam);
      const x0 = (tmp.x * 0.5 + 0.5) * state.size.width;
      const y0 = (1 - (tmp.y * 0.5 + 0.5)) * state.size.height;
      tmp.set(BASE_X1, BASE_Y, 0);
      g.localToWorld(tmp).project(cam);
      const x1 = (tmp.x * 0.5 + 0.5) * state.size.width;
      contraction.baseX = x0;
      contraction.baseY = y0;
      contraction.baseW = Math.max(1, x1 - x0);
      contraction.live = true;
    }

    // ---- screen resolution for every screen-space ribbon ----
    const res = state.size.width * 100000 + state.size.height;
    if (res !== lastRes.current) {
      lastRes.current = res;
      live.streakMat.uniforms.uRes.value.set(state.size.width, state.size.height);
      for (const r of live.ribbons) {
        (r.material.uniforms.uRes.value as THREE.Vector2).set(state.size.width, state.size.height);
      }
    }

    // ---- the warp streaks ----
    // Eased rather than smoothstepped so the field is still visibly IN FLIGHT
    // through the middle of the warp instead of having already landed.
    live.streakMat.uniforms.uBase.value = Math.pow(clamp01((cp - 0.06) / 0.72), 1.5);
    live.streakMat.uniforms.uOpacity.value =
      2.6 * smoothstep(0.01, 0.09, cp) * (1 - smoothstep(0.7, 0.86, cp)) * fade;

    // ---- the golden spiral: grows across the frame, winds onto the eye ----
    // apparent size is held roughly constant while the dolly closes, so it
    // reads as one continuous form tightening rather than a distant squiggle
    const resolve = smoothstep(0.25, 0.78, cp);
    const spiralScale = (dist / HOLD_DIST) * lerp(5.6, 2.15, resolve);
    live.spiral.mesh.scale.setScalar(spiralScale);
    // It only becomes visible once it is already more than half drawn. Fading
    // it up from cp 0.01 put a lone 20%-drawn grey arc across a still-sharp
    // corridor at 61.5% — it read as a stray line, not as a spiral.
    live.spiral.material.uniforms.uDraw.value = smoothstep(0.04, 0.34, cp);
    live.spiral.material.uniforms.uWidth.value = 1.4;
    live.spiral.material.uniforms.uOpacity.value =
      1.0 * smoothstep(0.08, 0.22, cp) * (1 - smoothstep(0.54, 0.74, cp)) * fade;

    // ---- the mark strikes itself on (71% → 76.5%) ----
    // `beat` also lifts the chalk: at the apex this is struck chalk at full
    // luminance, not a 12%-grey wireframe.
    const flash = (1 + pulse * 0.34) * (1 + 0.16 * beat);
    const setStroke = (
      r: { material: THREE.ShaderMaterial },
      draw: number,
      opacity: number,
      width: number,
      color: THREE.Color,
    ) => {
      r.material.uniforms.uDraw.value = draw;
      r.material.uniforms.uOpacity.value = opacity;
      r.material.uniforms.uWidth.value = width;
      (r.material.uniforms.uColor.value as THREE.Color).copy(color).multiplyScalar(flash);
    };

    const chalkOn = (0.7 + 0.3 * smoothstep(0.6, 0.84, cp)) * fade;
    setStroke(live.armature, smoothstep(0.54, 0.7, cp), chalkOn, 1.12 + pulse * 0.7, CHALK);
    setStroke(live.socket, smoothstep(0.58, 0.74, cp), chalkOn, 1.12 + pulse * 0.7, CHALK);
    setStroke(live.lashes, smoothstep(0.63, 0.78, cp), chalkOn * 0.9, 1.06 + pulse * 0.5, CHALK);
    setStroke(live.iris, smoothstep(0.66, 0.8, cp), 0.98 * smoothstep(0.64, 0.78, cp) * fade, 1.15 + pulse * 0.9, RED);
    setStroke(live.glint, smoothstep(0.72, 0.82, cp), 0.95 * smoothstep(0.7, 0.81, cp) * fade, 1 + pulse * 0.4, CHALK);
    setStroke(live.drips, smoothstep(0.74, 0.84, cp), chalkOn * 0.62, 1, CHALK);
    // the iris burns: push past 1.0 at the pulse so ONLY this blooms
    (live.iris.material.uniforms.uColor.value as THREE.Color).copy(RED).multiplyScalar(1.14 + pulse * 0.72);

    // ---- residual dust formation ON the mark ----
    live.formMat.opacity = 0.5 * smoothstep(0.66, 0.86, cp) * fade;
    live.formMat.color.copy(CHALK).multiplyScalar(1 + pulse * 0.5);

    // ---- red halo: only the pulse, and barely there ----
    live.haloMat.opacity = pulse * 0.055 * fade;

    // ---- the ground closing in behind the mark, and its temperature ----
    const warmT = smoothstep(0.62, 0.92, cp);
    groundCol.set(
      lerp(GROUND_COLD[0], GROUND_WARM[0], warmT),
      lerp(GROUND_COLD[1], GROUND_WARM[1], warmT),
      lerp(GROUND_COLD[2], GROUND_WARM[2], warmT),
    );
    (live.maskMat.uniforms.uColor.value as THREE.Vector3).copy(groundCol);
    live.maskMat.uniforms.uOpacity.value = smoothstep(0.42, 0.8, cp) * fade;
    live.mask.scale.setScalar(Math.max(dist + 2.5, 1) * 4.6);
  });

  return (
    <group ref={groupRef} visible={false}>
      <primitive object={kit.mask} />
      <primitive object={kit.halo} />
      <primitive object={kit.streaks} />
      <primitive object={kit.formation} />
      {kit.ribbons.map((r, i) => (
        <primitive key={i} object={r.mesh} />
      ))}
    </group>
  );
}
