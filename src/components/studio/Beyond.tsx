'use client';

// What is on the other side of a door — for now, a held breath.
//
// THIS IS SCAFFOLDING AND IS MEANT TO LOOK LIKE IT. The four rooms behind the
// four doors (the builds, the paintings, the journal, the sound) are the next
// real body of work, and none of them exist yet. The fold needs somewhere to
// LAND to be testable at all, and the honest placeholder is a space that
// clearly says "not built" rather than a half-room that invites judgement it
// has not earned.
//
// It is not nothing, though, because the fold has to arrive somewhere with
// depth. Landing on a flat colour would make the whole move read as a wipe:
// the pieces of a room fly apart and reveal... a background. So this is a slow
// drift of motes at real distances, which gives the arrival parallax and tells
// the eye it has genuinely gone somewhere.
//
// Each door keeps its own colour, taken from the practical that stands for it
// in the studio, so even the placeholder answers "where am I" — you arrive
// somewhere green from the monitor banks, somewhere amber from the radio.

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const DOOR_COLOUR: Record<string, string> = {
  'THE BUILDS': '#4a8f6f',    // the monitor banks
  'THE PAINTINGS': '#c8555f', // the oxblood walls the easel stands against
  'THE JOURNAL': '#d4a030',   // lamplight on a page
  'THE SOUND': '#2e9fd4',     // the cool rim, the only cold thing in the room
};

const MOTES = 420;

/** Deterministic scatter. Math.random() during render is impure — React 19
 *  rejects it, and it is the wrong tool anyway: a field that reshuffles itself
 *  every time you walk through a door is not a place, it is a screensaver.
 *  Same door, same stars. */
function rand(i: number, salt: number) {
  const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export function Beyond({ door }: { door: string }) {
  const points = useRef<THREE.Points>(null);
  const tint = DOOR_COLOUR[door] ?? '#d4a030';

  const geometry = useMemo(() => {
    const pos = new Float32Array(MOTES * 3);
    const scale = new Float32Array(MOTES);
    for (let i = 0; i < MOTES; i++) {
      // Distributed through a deep shell rather than a box: a box has corners,
      // and corners are visible as the field turns.
      const r = 4 + rand(i, 1) ** 0.6 * 26;
      const theta = rand(i, 2) * Math.PI * 2;
      const phi = Math.acos(2 * rand(i, 3) - 1);
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.cos(phi) * 0.55;
      pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
      scale[i] = 0.4 + rand(i, 4) * 1.6;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aScale', new THREE.BufferAttribute(scale, 1));
    return g;
  }, []);

  useFrame((_, dt) => {
    if (!points.current) return;
    // Barely moving. The point is that it is alive, not that it is animated.
    points.current.rotation.y += dt * 0.028;
  });

  return (
    <group>
      <points ref={points} geometry={geometry} frustumCulled={false}>
        <pointsMaterial
          color={tint}
          size={0.09}
          sizeAttenuation
          transparent
          opacity={0.62}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
      {/* Just enough light that the fold's last shards have something to fade
          against rather than fading to a hole. */}
      <ambientLight intensity={0.22} color={tint} />
    </group>
  );
}
