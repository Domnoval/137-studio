'use client';

// cosmos/Sigil.tsx — the CONTRACTION climax (62–78%).
//
// Three things happen here, all keyed to raw scroll depth so the beat is
// deterministic at any frame rate:
//   1. CONVERGENCE (62–68%) — ~280 particle streaks fall inward out of the
//      dark along golden-spiral trajectories while a chalk golden-spiral
//      tracer draws itself. There is never a frame where nothing is moving.
//   2. RESOLUTION (66–72%) — the streaks land ON the sigil, the triangle and
//      eye draw in fat chalk line, the iris ignites red.
//   3. HOLD + PULSE (72–75%) — full chalk opacity, one single pulse at ~73%
//      in chalk-white and red (pushed past 1.0 so ONLY this survives bloom),
//      then from 75% the sigil rushes the camera and we pass THROUGH it into
//      RETURN, where Contraction's veil closes the void behind us.
//
// The whole group is locked to the camera at a scroll-driven distance, so the
// formation always reads at ~54% of viewport height at the hold no matter
// where the dolly happens to be — the climax can never be framed small.
//
// Progress is read RAW from the scroll position (Lenis already smooths the
// scroll itself); the context's extra per-frame lerp is frame-rate dependent
// and would slide the climax off-beat on slow machines.

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import type { Line2, LineSegments2 } from 'three-stdlib';
import * as THREE from 'three';
import { cosmosShared, smoothstep } from './shared';
import { sampleSpiral, sampleTriangle, sampleEye, sampleCircle } from './cosmos-data';
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
// still dissolving at 0.60, so the convergence takes the frame over from it
// instead of leaving a dead beat between them.
const C_START = 0.6;
const C_SPAN = 0.165;
// the rush: sigil leaves the hold and passes through the camera
const RUSH_START = 0.748;
const RUSH_SPAN = 0.038;

const HOLD_DIST = 7.2; // world units → triangle ≈ 54% of viewport height
const FAR_DIST = 34;

const PULSE_AT = 0.68;
const PULSE_SIGMA = 0.055;

const CHALK = new THREE.Color('#e8e4dc');
const RED = new THREE.Color('#c41230');

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/* --------------------------------------------------------------- geometry */

function toPoints(src: Float32Array): [number, number, number][] {
  const out: [number, number, number][] = [];
  for (let i = 0; i < src.length; i += 3) out.push([src[i], src[i + 1], src[i + 2]]);
  return out;
}

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

const STREAKS = 280;
const STAG_MAX = 0.34;
const FORM_POINTS = 900;

type FatLine = Line2 | LineSegments2;

export function Sigil() {
  const groupRef = useRef<THREE.Group>(null);
  const spiralRef = useRef<FatLine | null>(null);
  const triRef = useRef<FatLine | null>(null);
  const eyeRef = useRef<FatLine | null>(null);
  const irisRef = useRef<FatLine | null>(null);
  const pupilRef = useRef<FatLine | null>(null);

  const paths = useMemo(
    () => ({
      spiral: toPoints(sampleSpiral(420)),
      tri: toPoints(sampleTriangle(240)),
      eye: toPoints(sampleEye(220)),
      iris: toPoints(sampleCircle(140, 0.5)),
      pupil: toPoints(sampleCircle(90, 0.17)),
    }),
    [],
  );

  // ---- convergence streaks + the residual particle formation ----
  const swarm = useMemo(() => {
    const rnd = mulberry(1370);
    const tri = sampleTriangle(360);
    const eye = sampleEye(240);
    const iris = sampleCircle(120, 0.5);

    /** a jittered point on the sigil, weighted triangle / eye / iris / halo */
    const target = (): [number, number] => {
      const pick = rnd();
      let x: number;
      let y: number;
      if (pick < 0.5) {
        const k = Math.floor(rnd() * 359);
        x = tri[k * 3];
        y = tri[k * 3 + 1];
      } else if (pick < 0.76) {
        const k = Math.floor(rnd() * 239);
        x = eye[k * 3];
        y = eye[k * 3 + 1];
      } else if (pick < 0.9) {
        const k = Math.floor(rnd() * 119);
        x = iris[k * 3];
        y = iris[k * 3 + 1];
      } else {
        const a = rnd() * Math.PI * 2;
        const r = 3.6 + rnd() * 2.2;
        x = Math.cos(a) * r;
        y = Math.sin(a) * r;
      }
      return [x + (rnd() - 0.5) * 0.06, y + (rnd() - 0.5) * 0.06];
    };

    // streaks
    const r0 = new Float32Array(STREAKS);
    const a0 = new Float32Array(STREAKS);
    const z0 = new Float32Array(STREAKS);
    const rT = new Float32Array(STREAKS);
    const aT = new Float32Array(STREAKS);
    const turn = new Float32Array(STREAKS);
    const stag = new Float32Array(STREAKS);
    const streakPos = new Float32Array(STREAKS * 6);
    const streakCol = new Float32Array(STREAKS * 6);

    for (let i = 0; i < STREAKS; i++) {
      const [tx, ty] = target();
      rT[i] = Math.hypot(tx, ty);
      aT[i] = Math.atan2(ty, tx);
      r0[i] = 9 + Math.pow(rnd(), 0.7) * 16;
      a0[i] = rnd() * Math.PI * 2;
      z0[i] = (rnd() - 0.5) * 3.5 - 0.25; // stays in front of the void mask
      turn[i] = (0.9 + rnd() * 1.5) * (rnd() < 0.5 ? -1 : 1);
      stag[i] = rnd() * STAG_MAX;
      const isRed = rnd() < 0.09;
      const head = isRed ? RED : CHALK;
      const hb = isRed ? 1.25 : 1.0;
      streakCol[i * 6] = head.r * hb;
      streakCol[i * 6 + 1] = head.g * hb;
      streakCol[i * 6 + 2] = head.b * hb;
      streakCol[i * 6 + 3] = head.r * 0.06;
      streakCol[i * 6 + 4] = head.g * 0.06;
      streakCol[i * 6 + 5] = head.b * 0.06;
    }

    const streakGeo = new THREE.BufferGeometry();
    const posAttr = new THREE.BufferAttribute(streakPos, 3);
    posAttr.setUsage(THREE.DynamicDrawUsage);
    streakGeo.setAttribute('position', posAttr);
    streakGeo.setAttribute('color', new THREE.BufferAttribute(streakCol, 3));
    const streakMat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const streaks = new THREE.LineSegments(streakGeo, streakMat);
    streaks.frustumCulled = false;

    // residual formation: the sigil rendered in chalk dust once it has landed
    const formPos = new Float32Array(FORM_POINTS * 3);
    for (let i = 0; i < FORM_POINTS; i++) {
      const [x, y] = target();
      formPos[i * 3] = x;
      formPos[i * 3 + 1] = y;
      formPos[i * 3 + 2] = (rnd() - 0.5) * 0.1;
    }
    const formGeo = new THREE.BufferGeometry();
    formGeo.setAttribute('position', new THREE.BufferAttribute(formPos, 3));
    const formMat = new THREE.PointsMaterial({
      map: getDustSprite(),
      color: CHALK.clone(),
      size: 0.055,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const formation = new THREE.Points(formGeo, formMat);
    formation.frustumCulled = false;

    // red bloom disc behind the eye — only alive during the pulse, and kept
    // deliberately faint: the pulse is a line flash, not a colour wash
    const haloMat = new THREE.MeshBasicMaterial({
      map: getDustSprite(),
      color: RED.clone(),
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const halo = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), haloMat);
    halo.scale.setScalar(3.1);
    halo.frustumCulled = false;

    // The void closes in behind the sigil: a soft-edged disc of #0e0c0a that
    // swallows the receding corridor so the climax reads against nothing.
    const maskMat = new THREE.ShaderMaterial({
      uniforms: { uOpacity: { value: 0 } },
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
        varying vec2 vUv;
        void main() {
          float d = length(vUv - 0.5);
          float a = (1.0 - smoothstep(0.33, 0.5, d)) * uOpacity;
          if (a < 0.002) discard;
          // #0e0c0a expressed in linear-light: the composer writes sRGB
          gl_FragColor = vec4(0.00438, 0.00367, 0.00303, a);
        }
      `,
      transparent: true,
      depthWrite: false,
      depthTest: false,
    });
    const mask = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), maskMat);
    mask.position.set(0, 0, -2.5);
    mask.frustumCulled = false;
    // Draw order, not depth, decides what the climax sits on top of: the mask
    // is painted over the whole corridor, then the sigil over the mask.
    mask.renderOrder = 10;
    halo.renderOrder = 11;
    haloMat.depthTest = false;
    streaks.renderOrder = 12;
    streakMat.depthTest = false;
    formation.renderOrder = 13;
    formMat.depthTest = false;

    return {
      mask,
      streaks,
      formation,
      halo,
      r0,
      a0,
      z0,
      rT,
      aT,
      turn,
      stag,
    };
  }, []);

  const fwd = useMemo(() => new THREE.Vector3(), []);
  const wired = useRef(false);
  // Everything mutated per frame is reached through a ref, never through the
  // memoised value itself (react-compiler treats memo results as frozen).
  const maskRef = useRef<THREE.Mesh>(null);
  const haloRef = useRef<THREE.Mesh>(null);
  const streaksRef = useRef<THREE.LineSegments>(null);
  const formRef = useRef<THREE.Points>(null);

  useFrame((state) => {
    const g = groupRef.current;
    const maskO = maskRef.current;
    const haloO = haloRef.current;
    const streakO = streaksRef.current;
    const formO = formRef.current;
    if (!g || !maskO || !haloO || !streakO || !formO) return;
    const p = rawProgress();
    const cp = clamp01((p - C_START) / C_SPAN);
    const rush = clamp01((p - RUSH_START) / RUSH_SPAN);

    // ---- distance from the camera: approach, hold, then rush through ----
    const dist =
      rush <= 0
        ? lerp(FAR_DIST, HOLD_DIST, smoothstep(0, 0.6, cp))
        : lerp(HOLD_DIST, -7, rush * rush);
    const fade = (1 - smoothstep(0.58, 0.94, rush)) * smoothstep(0.0, 0.05, cp);
    const visible = cp > 0.005 && fade > 0.002 && dist > 0.4;
    g.visible = visible;
    if (!visible) return;

    // lock to the view: the climax is always centred and always this big
    const cam = state.camera;
    cam.getWorldDirection(fwd);
    g.position.copy(cam.position).addScaledVector(fwd, dist);
    g.quaternion.copy(cam.quaternion);
    g.translateX(-cosmosShared.swayX * 0.16);
    g.translateY(-cosmosShared.swayY * 0.1);

    const t = state.clock.elapsedTime;
    const d = (cp - PULSE_AT) / PULSE_SIGMA;
    const pulse = Math.exp(-d * d);
    g.rotateZ(Math.sin(t * 0.07) * 0.012);
    g.scale.setScalar(1 + pulse * 0.045);

    // ---- convergence streaks ----
    const base = smoothstep(0.02, 0.6, cp);
    const posAttr = streakO.geometry.attributes.position as THREE.BufferAttribute;
    const pos = posAttr.array as Float32Array;
    for (let i = 0; i < STREAKS; i++) {
      let e = clamp01((base - swarm.stag[i]) / (1 - STAG_MAX));
      e = e * e * (3 - 2 * e);
      // trail length collapses to zero exactly at arrival — no residual spikes
      const trail = Math.max(0, e - 0.085 * (1 - e));
      const at = swarm.aT[i];
      const spanA = swarm.a0[i] - at + swarm.turn[i];
      const rt = swarm.rT[i];
      const r0 = swarm.r0[i];

      const rh = lerp(r0, rt, e);
      const ah = at + spanA * (1 - e);
      const rt2 = lerp(r0, rt, trail);
      const at2 = at + spanA * (1 - trail);
      pos[i * 6] = Math.cos(ah) * rh;
      pos[i * 6 + 1] = Math.sin(ah) * rh;
      pos[i * 6 + 2] = swarm.z0[i] * (1 - e);
      pos[i * 6 + 3] = Math.cos(at2) * rt2;
      pos[i * 6 + 4] = Math.sin(at2) * rt2;
      pos[i * 6 + 5] = swarm.z0[i] * (1 - trail);
    }
    posAttr.needsUpdate = true;
    (streakO.material as THREE.LineBasicMaterial).opacity =
      0.9 * smoothstep(0.015, 0.13, cp) * fade;

    // ---- residual dust formation ON the sigil ----
    const formMat = formO.material as THREE.PointsMaterial;
    formMat.opacity = 0.7 * smoothstep(0.38, 0.62, cp) * fade;
    formMat.color.copy(CHALK).multiplyScalar(1 + pulse * 0.5);

    // ---- red halo: only the pulse, and barely there ----
    (haloO.material as THREE.MeshBasicMaterial).opacity = pulse * 0.11 * fade;

    // ---- the void closing in behind the sigil ----
    const maskMat = maskO.material as THREE.ShaderMaterial;
    // full 1.0: any residue lets a slab's red halo bleed through the climax
    maskMat.uniforms.uOpacity.value = smoothstep(0.08, 0.4, cp) * fade;
    const maskDist = dist + 2.5;
    maskO.scale.setScalar(Math.max(maskDist, 1) * 4.6);

    // ---- the drawn lines ----
    const spiralL = spiralRef.current;
    const triL = triRef.current;
    const eyeL = eyeRef.current;
    const irisL = irisRef.current;
    const pupilL = pupilRef.current;
    if (!spiralL || !triL || !eyeL || !irisL || !pupilL) return;
    if (!wired.current) {
      wired.current = true;
      [spiralL, triL, eyeL, irisL, pupilL].forEach((l, i) => {
        l.renderOrder = 14 + i;
        l.material.depthTest = false;
        l.material.depthWrite = false;
      });
    }

    const setDraw = (line: FatLine, total: number, draw: number) => {
      line.geometry.instanceCount = Math.floor(total * draw);
      line.visible = draw > 0.001;
    };

    const spiralDraw = smoothstep(0.015, 0.3, cp);
    const spiralFade = 1 - smoothstep(0.44, 0.64, cp);
    setDraw(spiralL, paths.spiral.length - 1, spiralDraw);
    spiralL.material.opacity = 0.5 * spiralFade * fade;

    const triDraw = smoothstep(0.26, 0.52, cp);
    const eyeDraw = smoothstep(0.34, 0.58, cp);
    const irisDraw = smoothstep(0.44, 0.62, cp);
    setDraw(triL, paths.tri.length - 1, triDraw);
    setDraw(eyeL, paths.eye.length - 1, eyeDraw);
    setDraw(irisL, paths.iris.length - 1, irisDraw);
    setDraw(pupilL, paths.pupil.length - 1, irisDraw);

    // chalk reaches FULL opacity at the hold, and is driven past 1.0 (so it
    // blooms white) for the single pulse
    const chalkOn = 0.55 + 0.45 * smoothstep(0.3, 0.6, cp);
    const flash = 1 + pulse * 0.42;
    triL.material.opacity = chalkOn * fade;
    eyeL.material.opacity = chalkOn * fade;
    triL.material.color.copy(CHALK).multiplyScalar(flash);
    eyeL.material.color.copy(CHALK).multiplyScalar(flash);
    triL.material.linewidth = 2.1 + pulse * 1.7;
    eyeL.material.linewidth = 2.1 + pulse * 1.7;

    const redOn = 0.9 * smoothstep(0.44, 0.6, cp);
    irisL.material.opacity = redOn * fade;
    pupilL.material.opacity = redOn * fade;
    irisL.material.color.copy(RED).multiplyScalar(1 + pulse * 2.8);
    pupilL.material.color.copy(RED).multiplyScalar(1 + pulse * 2.8);
    irisL.material.linewidth = 2.4 + pulse * 2.2;
    pupilL.material.linewidth = 2.2 + pulse * 1.6;
  });

  return (
    <group ref={groupRef} visible={false}>
      <primitive object={swarm.mask} ref={maskRef} />
      <primitive object={swarm.halo} ref={haloRef} />
      <primitive object={swarm.streaks} ref={streaksRef} />
      <primitive object={swarm.formation} ref={formRef} />
      <Line
        ref={spiralRef}
        points={paths.spiral}
        color="#e8e4dc"
        lineWidth={1.3}
        transparent
        opacity={0}
        depthWrite={false}
      />
      <Line
        ref={triRef}
        points={paths.tri}
        color="#e8e4dc"
        lineWidth={2.1}
        transparent
        opacity={0}
        depthWrite={false}
      />
      <Line
        ref={eyeRef}
        points={paths.eye}
        color="#e8e4dc"
        lineWidth={2.1}
        transparent
        opacity={0}
        depthWrite={false}
      />
      <Line
        ref={irisRef}
        points={paths.iris}
        color="#c41230"
        lineWidth={2.4}
        transparent
        opacity={0}
        depthWrite={false}
      />
      <Line
        ref={pupilRef}
        points={paths.pupil}
        color="#c41230"
        lineWidth={2.2}
        transparent
        opacity={0}
        depthWrite={false}
      />
    </group>
  );
}
