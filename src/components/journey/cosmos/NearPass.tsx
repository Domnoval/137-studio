'use client';

// cosmos/NearPass.tsx — OWNED BY COSMOS agent.
//
// THE NEAR-PLANE PASS. The single thing that separates a flown camera from a
// zoomed one is what happens at the EDGE of the lens: in a dive, whole canvases
// blow through the periphery, huge and sheared, and are gone.
//
// These are not particles and they are not decoration — they are the same
// paintings, hung off the corridor axis at large radius and full size. As the
// rig closes on one it swells, rakes across the frame edge, and leaves the
// picture SIDEWAYS. It never fades in place.
//
// Three rules keep it from becoming noise:
//
//   1. EDGE GATE + COVERAGE GATE. Every frame the plate's projected centre and
//      its projected quad are both measured. It gets presence only once the
//      centre has passed 75% of the way to the frame edge (full at 105% — i.e.
//      already off-frame) AND the quad still covers a real slice of the
//      viewport. It is therefore geometrically incapable of parking over the
//      staged subject, and it cannot be paid for while invisible either.
//   2. RUSH GATE. It opens only on the fast stretches of the descent curve and
//      through THE DIVE — the beats where you should FEEL speed. On the slow
//      approach to a painting, or into the composed formation, the periphery
//      is empty and the frame is still.
//   3. NEVER IN MACRO OR PULL-BACK. A plate ripping past the edge of a full
//      bleed detail crop, or across the composed triangle, is vandalism.
//
// Everything is a closed-form function of camera Z. No per-frame integration,
// no lerps: identical at 3fps and 144fps, and correct when the scroll is parked.

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { useJourney } from '../JourneyContext';
import { phaseProgress, texPath } from '../journey-utils';
import { cosmosShared, ensureSlabRects, smoothstep } from './shared';
import { stage } from './stage-state';
import { NEAR_PLATES, SLABS, shotMix, type NearPlate, type ShotMix } from './cosmos-data';

/** Distance at which a plate starts to exist, and where it is gone. */
const FAR = 21;
const NEAR_CUT = 1.6;
/** Frame border, world units at scale 1 — the plates are framed works too. */
const PLATE_FRAME = 0.16;
/**
 * How far out the plate's projected centre must be before it is allowed any
 * presence. Above 1.0 means the centre is already OFF the frame: what you see
 * is the trailing half of a canvas raking the edge, never a canvas parked over
 * the middle of the picture.
 */
const EDGE_IN = 0.75;
const EDGE_FULL = 1.05;
/**
 * …and it must still be ON the frame. The edge gate alone is satisfied by a
 * plate that has already sailed entirely past the viewport, which is how you
 * end up paying for geometry nobody can see. Coverage is the projected quad's
 * overlap with the viewport as a fraction of frame width: below 3% it is a
 * sliver and does not count; by 14% it is a canvas going by.
 */
const COVER_IN = 0.03;
const COVER_FULL = 0.14;
/** Clearance the caption system keeps from a pass, in px. Modest: a pass is
 *  transient, and starving the caption of every corner is worse. */
const PLATE_PAD = 14;

const unitPlane = new THREE.PlaneGeometry(1, 1);
const FRAME_COLOR = new THREE.Color('#161311');

const centre = new THREE.Vector3();
const corner = new THREE.Vector3();
const euler = new THREE.Euler(0, 0, 0, 'YXZ');
const mix: ShotMix = { wide: 1, macro: 0, pullback: 0 };
const CORNERS: [number, number][] = [
  [-1, -1],
  [1, -1],
  [1, 1],
  [-1, 1],
];

// The passes share the label system's rect table, appended after the slabs.
// That is the whole mechanism by which a caption can never be printed over one:
// Labels.tsx tests every live rect in this table, so a pass is an obstacle to
// type by construction rather than by a rule someone has to remember.
const RECT_BASE = SLABS.length;
ensureSlabRects(RECT_BASE + NEAR_PLATES.length);

interface PlateProps {
  plate: NearPlate;
  index: number;
}

function Plate({ plate, index }: PlateProps) {
  const { progressRef } = useJourney();
  const groupRef = useRef<THREE.Group>(null);
  const artRef = useRef<THREE.Mesh>(null);
  const frameRef = useRef<THREE.Mesh>(null);

  const texture = useTexture(texPath(plate.file), (t) => {
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
  });

  const aspect = texture.image
    ? (texture.image as { width: number; height: number }).width /
      (texture.image as { width: number; height: number }).height
    : 0.8;
  const h = plate.height;
  const w = h * aspect;

  const artMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
    [texture],
  );
  const frameMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: FRAME_COLOR.clone(),
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
    [],
  );

  // release the shared rect slot when this plate unmounts
  useEffect(() => {
    const rect = cosmosShared.slabRects[RECT_BASE + index];
    return () => {
      if (rect) {
        rect.live = false;
        rect.alpha = 0;
      }
    };
  }, [index]);

  useFrame((state) => {
    const g = groupRef.current;
    if (!g) return;
    const p = progressRef.current ?? 0;
    const cam = state.camera as THREE.PerspectiveCamera;
    const d = cam.position.z - plate.z;
    const rect = cosmosShared.slabRects[RECT_BASE + index];

    const retire = () => {
      if (g.visible) g.visible = false;
      if (rect) {
        rect.live = false;
        rect.alpha = 0;
      }
    };

    if (d <= NEAR_CUT || d >= FAR) {
      retire();
      return;
    }

    shotMix(phaseProgress(p, 'cosmos'), mix);

    // ---- the approach envelope: swells in, gone the instant it is past ----
    const approach = smoothstep(FAR, FAR * 0.62, d) * smoothstep(NEAR_CUT, NEAR_CUT + 1.6, d);

    // ---- edge gate: measured, not assumed ----
    centre.set(plate.x, plate.y, plate.z).project(cam);
    const edge = Math.max(Math.abs(centre.x), Math.abs(centre.y) * 0.86);
    const edgeGate = smoothstep(EDGE_IN, EDGE_FULL, edge);

    const shotGate =
      stage.rush *
      (1 - mix.macro) *
      (1 - mix.pullback) *
      (1 - smoothstep(0, 0.1, phaseProgress(p, 'contraction')));

    if (plate.alpha * approach * edgeGate * shotGate < 0.006) {
      retire();
      return;
    }

    g.position.set(plate.x, plate.y, plate.z);
    // the plate TURNS as it goes by — roll driven by the approach distance, so
    // the shear is scroll-linked and reads as the rig moving, not as a loop
    euler.set(plate.pitch, plate.yaw, plate.roll + (FAR - d) * plate.spin);
    g.quaternion.setFromEuler(euler);

    // ---- project the quad: the coverage gate needs it, and so does the
    // label system, which must know the silhouette to keep type off it ----
    g.updateWorldMatrix(true, false);
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    let ok = true;
    for (let c = 0; c < 4; c++) {
      corner
        .set((CORNERS[c][0] * w) / 2, (CORNERS[c][1] * h) / 2, 0)
        .applyMatrix4(g.matrixWorld)
        .project(cam);
      if (corner.z > 1) {
        ok = false;
        break;
      }
      if (corner.x < x0) x0 = corner.x;
      if (corner.x > x1) x1 = corner.x;
      if (corner.y < y0) y0 = corner.y;
      if (corner.y > y1) y1 = corner.y;
    }
    // ---- coverage gate: it has to be ON the frame, not merely off-axis ----
    const cover = ok ? Math.max(0, Math.min(x1, 1) - Math.max(x0, -1)) / 2 : 0;
    const onFrame = ok && y1 > -1 && y0 < 1 ? smoothstep(COVER_IN, COVER_FULL, cover) : 0;
    const alpha = plate.alpha * approach * edgeGate * shotGate * onFrame;

    if (alpha < 0.006) {
      retire();
      return;
    }
    g.visible = true;

    if (artRef.current) {
      const m = artRef.current.material as THREE.MeshBasicMaterial;
      m.opacity = alpha;
      // periphery is never as bright as the subject
      m.color.setScalar(0.4 + 0.2 * edgeGate);
    }
    if (frameRef.current) {
      (frameRef.current.material as THREE.MeshBasicMaterial).opacity = alpha;
    }

    // ---- publish the silhouette so type keeps clear of it ----
    if (!rect) return;
    rect.alpha = alpha;
    rect.live = alpha > 0.05;
    rect.pad = PLATE_PAD;
    rect.x0 = (x0 * 0.5 + 0.5) * state.size.width;
    rect.x1 = (x1 * 0.5 + 0.5) * state.size.width;
    rect.y0 = (-y1 * 0.5 + 0.5) * state.size.height;
    rect.y1 = (-y0 * 0.5 + 0.5) * state.size.height;
  });

  return (
    <group ref={groupRef} visible={false}>
      <mesh
        ref={frameRef}
        position={[0, 0, -0.02]}
        scale={[w + PLATE_FRAME, h + PLATE_FRAME, 1]}
        geometry={unitPlane}
        material={frameMaterial}
      />
      <mesh ref={artRef} scale={[w, h, 1]} geometry={unitPlane} material={artMaterial} />
    </group>
  );
}

export function NearPass() {
  return (
    <group>
      {NEAR_PLATES.map((plate, i) => (
        <Plate key={`np-${i}`} plate={plate} index={i} />
      ))}
    </group>
  );
}
