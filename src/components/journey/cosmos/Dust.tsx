'use client';

// cosmos/Dust.tsx — OWNED BY COSMOS agent.
// ~2600 instanced dust points, additive, faint chalk/steel, natural depth
// parallax. Carries the CONTRACTION: each particle owns two extra homes —
// a point on the golden spiral, then a point on the 137 sigil — and a
// per-particle staggered morph walks scatter → spiral → sigil in the shader.
// Zero per-frame JS allocation; the whole system is one draw call.

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useJourney } from '../JourneyContext';
import { phaseProgress } from '../journey-utils';
import { smoothstep } from './shared';
import {
  CAM_START_Z,
  SIGIL_Z,
  sampleSpiral,
  sampleTriangle,
  sampleEye,
  sampleCircle,
} from './cosmos-data';

const COUNT = 2600;

// deterministic PRNG — stable layout every mount
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

const VERT = /* glsl */ `
  uniform float uTime;
  uniform float uSpiral;
  uniform float uSigil;
  uniform float uPx;
  attribute vec3 aSpiral;
  attribute vec3 aSigil;
  attribute float aSeed;
  attribute float aSize;
  attribute float aRed;
  varying float vAlpha;
  varying float vRed;
  void main() {
    float s1 = clamp((uSpiral - aSeed * 0.35) / 0.65, 0.0, 1.0);
    s1 = s1 * s1 * (3.0 - 2.0 * s1);
    float s2 = clamp((uSigil - aSeed * 0.25) / 0.75, 0.0, 1.0);
    s2 = s2 * s2 * (3.0 - 2.0 * s2);
    vec3 pos = position;
    float free = 1.0 - s1;
    pos.x += sin(uTime * 0.11 + aSeed * 43.0) * 0.4 * free;
    pos.y += cos(uTime * 0.08 + aSeed * 67.0) * 0.34 * free;
    pos.z += sin(uTime * 0.05 + aSeed * 23.0) * 0.3 * free;
    pos = mix(pos, aSpiral, s1);
    pos = mix(pos, aSigil, s2);
    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    float dist = max(-mv.z, 0.5);
    gl_PointSize = min(aSize * uPx / dist, 7.0);
    gl_Position = projectionMatrix * mv;
    float depthFade = smoothstep(85.0, 14.0, dist);
    vAlpha = mix(0.05, 0.34, depthFade) + s2 * 0.3;
    vRed = aRed;
  }
`;

const FRAG = /* glsl */ `
  precision mediump float;
  varying float vAlpha;
  varying float vRed;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.08, d) * vAlpha;
    if (a < 0.003) discard;
    vec3 chalk = vec3(0.62, 0.60, 0.57);
    vec3 steel = vec3(0.42, 0.46, 0.58);
    vec3 red = vec3(1.05, 0.12, 0.25);
    vec3 base = mix(chalk, steel, step(0.5, fract(vRed * 7.31)));
    vec3 col = mix(base, red, clamp(vRed, 0.0, 1.0));
    gl_FragColor = vec4(col, a);
  }
`;

export function Dust() {
  const { progressRef } = useJourney();
  const matRef = useRef<THREE.ShaderMaterial>(null);

  const { geometry, material } = useMemo(() => {
    const rnd = mulberry(137);
    const pos = new Float32Array(COUNT * 3);
    const spiral = new Float32Array(COUNT * 3);
    const sigil = new Float32Array(COUNT * 3);
    const seed = new Float32Array(COUNT);
    const size = new Float32Array(COUNT);
    const redF = new Float32Array(COUNT);

    // ---- scatter homes: loose annulus down the whole corridor ----
    const zTop = CAM_START_Z + 6;
    const zBot = SIGIL_Z - 10;
    for (let i = 0; i < COUNT; i++) {
      const a = rnd() * Math.PI * 2;
      const r = 1.2 + Math.pow(rnd(), 0.6) * 11;
      pos[i * 3] = Math.cos(a) * r;
      pos[i * 3 + 1] = Math.sin(a) * r * 0.8;
      pos[i * 3 + 2] = zTop + rnd() * (zBot - zTop);
      seed[i] = rnd();
      size[i] = 0.28 + rnd() * 0.5;
      redF[i] = rnd() < 0.055 ? 0.85 + rnd() * 0.15 : rnd() * 0.001;
    }

    // ---- spiral homes ----
    const spiralPath = sampleSpiral(520);
    for (let i = 0; i < COUNT; i++) {
      const k = Math.floor(rnd() * 519);
      spiral[i * 3] = spiralPath[k * 3] + (rnd() - 0.5) * 0.12;
      spiral[i * 3 + 1] = spiralPath[k * 3 + 1] + (rnd() - 0.5) * 0.12;
      spiral[i * 3 + 2] = SIGIL_Z + (rnd() - 0.5) * 0.4;
    }

    // ---- sigil homes: triangle 45%, eye 28%, iris 12%, halo 15% ----
    const tri = sampleTriangle(360);
    const eye = sampleEye(240);
    const iris = sampleCircle(120, 0.5);
    for (let i = 0; i < COUNT; i++) {
      const pick = rnd();
      let sx = 0;
      let sy = 0;
      if (pick < 0.45) {
        const k = Math.floor(rnd() * 359);
        sx = tri[k * 3];
        sy = tri[k * 3 + 1];
      } else if (pick < 0.73) {
        const k = Math.floor(rnd() * 239);
        sx = eye[k * 3];
        sy = eye[k * 3 + 1];
      } else if (pick < 0.85) {
        const k = Math.floor(rnd() * 119);
        sx = iris[k * 3];
        sy = iris[k * 3 + 1];
        redF[i] = Math.max(redF[i], 0.9); // the eye burns red
      } else {
        const a = rnd() * Math.PI * 2;
        const r = 3.4 + rnd() * 2.6;
        sx = Math.cos(a) * r;
        sy = Math.sin(a) * r;
      }
      sigil[i * 3] = sx + (rnd() - 0.5) * 0.07;
      sigil[i * 3 + 1] = sy + (rnd() - 0.5) * 0.07;
      sigil[i * 3 + 2] = SIGIL_Z + (rnd() - 0.5) * 0.25;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geometry.setAttribute('aSpiral', new THREE.BufferAttribute(spiral, 3));
    geometry.setAttribute('aSigil', new THREE.BufferAttribute(sigil, 3));
    geometry.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    geometry.setAttribute('aRed', new THREE.BufferAttribute(redF, 1));

    const material = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: {
        uTime: { value: 0 },
        uSpiral: { value: 0 },
        uSigil: { value: 0 },
        uPx: { value: 130 },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    return { geometry, material };
  }, []);

  useFrame((state) => {
    const m = matRef.current;
    if (!m) return;
    const p = progressRef.current ?? 0;
    const cp = phaseProgress(p, 'contraction');
    m.uniforms.uTime.value = state.clock.elapsedTime;
    m.uniforms.uSpiral.value = smoothstep(0.06, 0.52, cp);
    m.uniforms.uSigil.value = smoothstep(0.52, 0.82, cp);
    m.uniforms.uPx.value = state.size.height * state.viewport.dpr * 0.11;
  });

  return <points geometry={geometry} material={material} frustumCulled={false} ref={(pts) => {
    if (pts) matRef.current = pts.material as THREE.ShaderMaterial;
  }} />;
}
