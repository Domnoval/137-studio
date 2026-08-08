'use client';

// cosmos/Dust.tsx — OWNED BY COSMOS agent.
// The void. Not a uniform field of dots — art-directed space:
//
//   * THREE PARALLAX LAYERS. A far veil (tiny, dim, radius 10-27), a mid drift
//     (radius 4-13), and near motes (large, bright, radius 1.4-7.5). Because
//     they sit at genuinely different depths and carry different sizes and
//     drift amplitudes, the camera dolly separates them — the near motes streak
//     past while the veil barely moves.
//   * DENSITY CLUMPING. ~62% of particles belong to one of 30 seeded clusters
//     with gaussian falloff; the rest are uniform. That gives real clusters and
//     real voids instead of white noise.
//   * A COLOR-TEMPERATURE ARC down the descent. Each particle's tint is fixed
//     by where it lives in the corridor: cold white-blue at the top, warming
//     through mauve, to red-tinged approaching CONTRACTION. Scrolling therefore
//     travels through changing space.
//
// It also carries the CONTRACTION: each particle owns two extra homes — a point
// on the golden spiral, then a point on the 137 sigil — and a per-particle
// staggered morph walks scatter → spiral → sigil in the shader.
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

const COUNT = 3000;
const CLUSTERS = 30;

// layer 0 = far veil, 1 = mid drift, 2 = near motes
const LAYER_SPLIT = [0.5, 0.82]; // cumulative
const LAYER_R = [
  [10, 27],
  [4, 13],
  [2.6, 8.2],
];
const LAYER_SIZE = [
  [0.14, 0.3],
  [0.3, 0.62],
  [0.62, 1.25],
];
const LAYER_BRIGHT = [0.5, 0.82, 1.15];
const LAYER_DRIFT = [0.35, 0.85, 1.6];

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
  attribute float aTemp;   // 0..1 position along the descent (color arc)
  attribute float aBright; // parallax layer brightness
  attribute float aDrift;  // parallax layer drift amplitude
  varying float vAlpha;
  varying float vRed;
  varying float vTemp;
  void main() {
    float s1 = clamp((uSpiral - aSeed * 0.35) / 0.65, 0.0, 1.0);
    s1 = s1 * s1 * (3.0 - 2.0 * s1);
    float s2 = clamp((uSigil - aSeed * 0.25) / 0.75, 0.0, 1.0);
    s2 = s2 * s2 * (3.0 - 2.0 * s2);
    vec3 pos = position;
    float free = (1.0 - s1) * aDrift;
    pos.x += sin(uTime * 0.11 + aSeed * 43.0) * 0.4 * free;
    pos.y += cos(uTime * 0.08 + aSeed * 67.0) * 0.34 * free;
    pos.z += sin(uTime * 0.05 + aSeed * 23.0) * 0.3 * free;
    pos = mix(pos, aSpiral, s1);
    pos = mix(pos, aSigil, s2);
    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    float dist = max(-mv.z, 0.5);
    gl_PointSize = min(aSize * uPx / dist, 9.0);
    gl_Position = projectionMatrix * mv;
    float depthFade = smoothstep(96.0, 12.0, dist);
    vAlpha = aBright * mix(0.04, 0.30, depthFade) + s2 * 0.3;
    vRed = aRed;
    vTemp = aTemp;
  }
`;

const FRAG = /* glsl */ `
  precision mediump float;
  varying float vAlpha;
  varying float vRed;
  varying float vTemp;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.08, d) * vAlpha;
    if (a < 0.003) discard;
    // temperature arc: cold white-blue -> mauve -> red-tinged
    vec3 cold  = vec3(0.60, 0.70, 0.88);
    vec3 mauve = vec3(0.52, 0.36, 0.47);
    vec3 warm  = vec3(0.76, 0.30, 0.28);
    vec3 base = vTemp < 0.5
      ? mix(cold, mauve, vTemp * 2.0)
      : mix(mauve, warm, (vTemp - 0.5) * 2.0);
    vec3 ember = vec3(1.05, 0.12, 0.25);
    vec3 col = mix(base, ember, clamp(vRed, 0.0, 1.0));
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
    const temp = new Float32Array(COUNT);
    const bright = new Float32Array(COUNT);
    const drift = new Float32Array(COUNT);

    const zTop = CAM_START_Z + 6;
    const zBot = SIGIL_Z - 10;

    // ---- seeded clusters (per layer) so density clumps instead of smearing ----
    const cAngle = new Float32Array(CLUSTERS);
    const cRad = new Float32Array(CLUSTERS);
    const cZ = new Float32Array(CLUSTERS);
    const cLayer = new Uint8Array(CLUSTERS);
    const cSpread = new Float32Array(CLUSTERS);
    for (let c = 0; c < CLUSTERS; c++) {
      const layer = c % 3;
      cLayer[c] = layer;
      cAngle[c] = rnd() * Math.PI * 2;
      cRad[c] = LAYER_R[layer][0] + rnd() * (LAYER_R[layer][1] - LAYER_R[layer][0]);
      cZ[c] = zTop + rnd() * (zBot - zTop);
      cSpread[c] = 0.1 + rnd() * 0.16;
    }
    // box-muller-ish: sum of 3 uniforms, centered — cheap gaussian
    const gauss = () => (rnd() + rnd() + rnd()) / 1.5 - 1;

    for (let i = 0; i < COUNT; i++) {
      const u = i / COUNT;
      const layer = u < LAYER_SPLIT[0] ? 0 : u < LAYER_SPLIT[1] ? 1 : 2;
      const clustered = rnd() < 0.62;

      let a: number;
      let r: number;
      let z: number;
      if (clustered) {
        // pick a cluster belonging to this layer
        let c = Math.floor(rnd() * CLUSTERS);
        for (let k = 0; k < CLUSTERS && cLayer[c] !== layer; k++) c = (c + 1) % CLUSTERS;
        const spread = cSpread[c];
        a = cAngle[c] + gauss() * spread * 3.2;
        r = Math.max(0.6, cRad[c] * (1 + gauss() * spread));
        z = cZ[c] + gauss() * (zBot - zTop) * spread * 0.42;
      } else {
        a = rnd() * Math.PI * 2;
        const [r0, r1] = LAYER_R[layer];
        r = r0 + Math.pow(rnd(), 0.7) * (r1 - r0);
        z = zTop + rnd() * (zBot - zTop);
      }
      z = Math.min(zTop, Math.max(zBot, z));

      pos[i * 3] = Math.cos(a) * r;
      pos[i * 3 + 1] = Math.sin(a) * r * 0.82;
      pos[i * 3 + 2] = z;

      seed[i] = rnd();
      const [s0, s1] = LAYER_SIZE[layer];
      size[i] = s0 + rnd() * (s1 - s0);
      bright[i] = LAYER_BRIGHT[layer] * (0.72 + rnd() * 0.5);
      drift[i] = LAYER_DRIFT[layer];
      temp[i] = Math.min(1, Math.max(0, (zTop - z) / (zTop - zBot)));
      // a handful of embers, weighted toward the deep end of the descent
      redF[i] = rnd() < 0.03 + temp[i] * 0.05 ? 0.8 + rnd() * 0.2 : 0;
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
    geometry.setAttribute('aTemp', new THREE.BufferAttribute(temp, 1));
    geometry.setAttribute('aBright', new THREE.BufferAttribute(bright, 1));
    geometry.setAttribute('aDrift', new THREE.BufferAttribute(drift, 1));

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
      fog: false,
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
    m.uniforms.uPx.value = state.size.height * state.viewport.dpr * 0.1;
  });

  return (
    <points
      geometry={geometry}
      material={material}
      frustumCulled={false}
      ref={(pts) => {
        if (pts) matRef.current = pts.material as THREE.ShaderMaterial;
      }}
    />
  );
}
