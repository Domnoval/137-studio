'use client';

// cosmos/Glyphs.tsx — OWNED BY COSMOS agent.
// ~40 sparse, dim equation glyphs drifting between the slabs. One shared
// canvas atlas texture + one shared material; each plane's UVs pick a cell.
// Billboarded to the camera, slow sin drift, fades away during contraction.

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useJourney } from '../JourneyContext';
import { phaseProgress } from '../journey-utils';
import { smoothstep } from './shared';
import { CAM_START_Z, CAM_END_Z, GLYPHS } from './cosmos-data';
import { getGlyphAtlas, ATLAS_GRID } from './textures';

const COUNT = 40;
const BASE_OPACITY = 0.13;

interface GlyphSpec {
  geometry: THREE.PlaneGeometry;
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

export function Glyphs() {
  const { progressRef } = useJourney();
  const meshRefs = useRef<(THREE.Mesh | null)[]>([]);

  const { specs, material } = useMemo(() => {
    const rnd = mulberry(1370);
    const material = new THREE.MeshBasicMaterial({
      map: getGlyphAtlas(),
      transparent: true,
      opacity: BASE_OPACITY,
      color: new THREE.Color('#a09890'),
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const specs: GlyphSpec[] = [];
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
      specs.push({
        geometry,
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius * 0.75,
        z: zTop + rnd() * (zBot - zTop),
        scale: 0.45 + rnd() * 0.65,
        phase: rnd() * Math.PI * 2,
        speed: 0.15 + rnd() * 0.25,
      });
    }
    return { specs, material };
  }, []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const cp = phaseProgress(progressRef.current ?? 0, 'contraction');
    const first = meshRefs.current[0];
    if (first) {
      (first.material as THREE.MeshBasicMaterial).opacity =
        BASE_OPACITY * (1 - smoothstep(0, 0.3, cp));
    }
    const q = state.camera.quaternion;
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
          material={material}
          scale={s.scale}
          position={[s.x, s.y, s.z]}
        />
      ))}
    </group>
  );
}
