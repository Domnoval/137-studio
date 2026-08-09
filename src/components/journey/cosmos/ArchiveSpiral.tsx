'use client';

// cosmos/ArchiveSpiral.tsx — OWNED BY COSMOS agent.
//
// THE CURVE THE ARCHIVE IS HUNG ON, MADE VISIBLE.
//
// Fifteen works placed by φ are still, to a first glance, fifteen works placed
// somewhere. The stroke is what turns an arrangement into an argument: a single
// hairline running through every one of them, outer arm to throat, so the
// viewer can SEE that the radius, the angle and the scale all came off one
// curve. It is the same curve the contraction draws — same growth (φ per half
// turn), same phase, same winding sense — sampled straight out of cosmos-data,
// so there is no second definition that could drift.
//
// Restraint is the whole point. One pixel, chalk, ~0.16 alpha at its brightest,
// no colour of its own. It draws itself OUTER-FIRST as the archive resolves, so
// the line arrives with the works rather than being switched on under them, and
// it fades toward the throat so the eye of the spiral stays the darkest thing
// in the frame — which is exactly where the sigil then strikes.

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useJourney } from '../JourneyContext';
import { phaseProgress } from '../journey-utils';
import { easeInOut, smoothstep } from './shared';
import { stage } from './stage-state';
import { archiveSpiralPath, formationPlane, SIGIL_Z } from './cosmos-data';

/** Samples along the stroke. Dense enough that the inner turns stay smooth. */
const N = 620;
/** Peak opacity of the line. A hairline, not a diagram. */
const PEAK = 0.16;
/** The point the CONTRACTION collapses everything into — Slabs' own VANISH. */
const VANISH_Z = SIGIL_Z - 26;

export function ArchiveSpiral() {
  const { progressRef } = useJourney();
  const groupRef = useRef<THREE.Group>(null);
  const euler = useRef(new THREE.Euler(0, 0, 0, 'YXZ'));

  const kit = useMemo(() => {
    const pts = archiveSpiralPath(N);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pts, 3));
    // per-vertex fade: the outer arm carries the line, the throat goes dark so
    // the point the contraction collapses into is not pre-lit
    const col = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const t = i / (N - 1); // 0 = outer, 1 = throat
      const v = 0.92 * (1 - smoothstep(0.55, 1, t) * 0.86);
      col[i * 3] = v;
      col[i * 3 + 1] = v;
      col[i * 3 + 2] = v;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.setDrawRange(0, 0);
    const mat = new THREE.LineBasicMaterial({
      color: new THREE.Color('#e8e4dc'),
      vertexColors: true,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      depthTest: false,
    });
    const ln = new THREE.Line(geo, mat);
    ln.frustumCulled = false;
    // BEHIND the paintings: a hairline drawn over a canvas is a scratch on it.
    ln.renderOrder = -1;
    return { geometry: geo, material: mat, line: ln };
  }, []);

  // react-compiler treats memo results as frozen; everything mutated per frame
  // is reached through this unfrozen shallow copy, never through `kit` itself.
  const liveRef = useRef<typeof kit | null>(null);

  useEffect(
    () => () => {
      kit.geometry.dispose();
      kit.material.dispose();
    },
    [kit],
  );

  useFrame((state) => {
    const g = groupRef.current;
    if (!g) return;
    if (!liveRef.current) liveRef.current = { ...kit };
    const live = liveRef.current;
    const w = stage.formW;
    // THE CONTRACTION IS THIS CURVE CONTRACTING. The stroke recedes into the
    // vanishing point on exactly the curves Slabs uses for the works — same
    // ease, same fade — so the archive and the line it hangs on wind down
    // together, and the sigil's spiral then grows out of the point they left.
    const cp = phaseProgress(progressRef.current ?? 0, 'contraction');
    const rec = easeInOut(smoothstep(0, 0.6, cp));
    const recEase = rec * rec * (3 - 2 * rec);
    const contractFade = 1 - smoothstep(0.34, 0.58, cp);
    // the stroke belongs to the archive and to nothing else
    const alpha = PEAK * smoothstep(0.16, 0.62, w) * contractFade;
    if (alpha < 0.004) {
      if (g.visible) {
        g.visible = false;
        live.material.opacity = 0;
      }
      return;
    }
    g.visible = true;
    live.material.opacity = alpha;
    // outer-first progressive draw, arriving just ahead of the works
    const draw = smoothstep(0.18, 0.86, w);
    live.geometry.setDrawRange(0, Math.max(2, Math.round(draw * N)));

    const cam = state.camera as THREE.PerspectiveCamera;
    const pl = formationPlane(
      cam.position.x,
      cam.position.y,
      cam.position.z,
      cam.fov,
      stage.formThru,
      stage.plane,
    );
    g.position.set(
      pl.cx * (1 - recEase),
      pl.cy * (1 - recEase),
      pl.cz + (VANISH_Z - pl.cz) * recEase,
    );
    const e = euler.current;
    e.set(pl.pitch, pl.yaw, pl.roll);
    g.quaternion.setFromEuler(e);
    g.scale.setScalar(Math.max(0.0001, pl.unit * (1 - recEase * 0.999)));
  });

  return (
    <group ref={groupRef} visible={false}>
      <primitive object={kit.line} />
    </group>
  );
}
