'use client';

// cosmos/Glyphs.tsx — OWNED BY COSMOS agent.
// ~40 sparse, dim equation glyphs drifting between the slabs. One shared
// canvas atlas texture; each plane's UVs pick a cell. Billboarded to the
// camera, slow sin drift, fades away during contraction.
//
// TYPE EXCLUSION: a glyph that drifts behind a caption lands in a word gap and
// turns "TEAL SKULL" into "TEALηSKULL". These are two different rendering
// contexts, so no z-index can separate them. Instead every glyph projects its
// own position to screen space each frame and fades to ZERO if it falls inside
// any box the label layer has published (see exclusion.ts) — the glyph does
// not render there at all. Materials are therefore per-glyph (same texture,
// same draw-call count as before: these were already 40 separate meshes).

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useJourney } from '../JourneyContext';
import { phaseProgress } from '../journey-utils';
import { smoothstep } from './shared';
import { CAM_START_Z, CAM_END_Z, GLYPHS } from './cosmos-data';
import { inExclusion } from './exclusion';
import { getGlyphAtlas, ATLAS_GRID } from './textures';

const COUNT = 40;
const BASE_OPACITY = 0.13;
/** Screen-space radius a glyph is treated as occupying, in px. */
const GLYPH_R = 30;

interface GlyphSpec {
  geometry: THREE.PlaneGeometry;
  material: THREE.MeshBasicMaterial;
  x: number;
  y: number;
  z: number;
  scale: number;
  phase: number;
  speed: number;
}

function mulberry(seedInit: number) {
  let a = seedInit >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const proj = new THREE.Vector3();

export function Glyphs() {
  const { progressRef } = useJourney();
  const meshRefs = useRef<(THREE.Mesh | null)[]>([]);
  /** damped 0-1 "I am behind type" weight, per glyph */
  const cull = useRef<Float32Array>(new Float32Array(COUNT));

  const specs = useMemo(() => {
    const rnd = mulberry(1370);
    const atlas = getGlyphAtlas();
    const out: GlyphSpec[] = [];
    const zTop = CAM_START_Z + 2;
    const zBot = CAM_END_Z - 4;
    for (let i = 0; i < COUNT; i++) {
      const cell = Math.floor(rnd() * Math.min(GLYPHS.length, ATLAS_GRID * ATLAS_GRID));
      const cu = (cell % ATLAS_GRID) / ATLAS_GRID;
      const cv = 1 - (Math.floor(cell / ATLAS_GRID) + 1) / ATLAS_GRID;
      const geometry = new THREE.PlaneGeometry(1, 1);
      const uv = geometry.attributes.uv as THREE.BufferAttribute;
      for (let v = 0; v < uv.count; v++) {
        uv.setXY(v, cu + uv.getX(v) / ATLAS_GRID, cv + uv.getY(v) / ATLAS_GRID);
      }
      uv.needsUpdate = true;
      const angle = rnd() * Math.PI * 2;
      // kept off the corridor axis: the middle of the frame belongs to the art
      const radius = 3.6 + rnd() * 7.4;
      out.push({
        geometry,
        material: new THREE.MeshBasicMaterial({
          map: atlas,
          transparent: true,
          opacity: BASE_OPACITY,
          color: new THREE.Color('#a09890'),
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          side: THREE.DoubleSide,
        }),
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius * 0.75,
        z: zTop + rnd() * (zBot - zTop),
        scale: 0.45 + rnd() * 0.65,
        phase: rnd() * Math.PI * 2,
        speed: 0.15 + rnd() * 0.25,
      });
    }
    return out;
  }, []);

  useEffect(
    () => () => {
      for (const s of specs) {
        s.material.dispose();
        s.geometry.dispose();
      }
    },
    [specs],
  );

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 1 / 20);
    const t = state.clock.elapsedTime;
    const cp = phaseProgress(progressRef.current ?? 0, 'contraction');
    const base = BASE_OPACITY * (1 - smoothstep(0, 0.3, cp));
    const q = state.camera.quaternion;
    const W = state.size.width;
    const H = state.size.height;
    for (let i = 0; i < specs.length; i++) {
      const mesh = meshRefs.current[i];
      if (!mesh) continue;
      const s = specs[i];
      mesh.position.set(
        s.x + Math.sin(t * s.speed + s.phase) * 0.45,
        s.y + Math.cos(t * s.speed * 0.8 + s.phase * 2) * 0.4,
        s.z,
      );
      mesh.quaternion.copy(q); // billboard

      // ---- type exclusion ----
      proj.copy(mesh.position).project(state.camera);
      let hit = false;
      if (proj.z <= 1) {
        hit = inExclusion((proj.x * 0.5 + 0.5) * W, (-proj.y * 0.5 + 0.5) * H, GLYPH_R);
      }
      const c = THREE.MathUtils.damp(cull.current[i], hit ? 1 : 0, 9, dt);
      cull.current[i] = c;
      const o = base * (1 - c);
      (mesh.material as THREE.MeshBasicMaterial).opacity = o;
      mesh.visible = o > 0.002;
    }
  });

  return (
    <group>
      {specs.map((s, i) => (
        <mesh
          key={i}
          ref={(m) => {
            meshRefs.current[i] = m;
          }}
          geometry={s.geometry}
          material={s.material}
          scale={s.scale}
          position={[s.x, s.y, s.z]}
        />
      ))}
    </group>
  );
}
