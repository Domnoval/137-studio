'use client';

// THE ENVIRONMENT. The single largest photoreal win left in this room, and it
// was missing entirely.
//
// A MeshStandardMaterial computes its specular from two things: the punctual
// lights, and the environment. With no environment, every reflective surface
// in the scene has nothing to reflect EXCEPT seven point lights — so instead of
// a room reflected in blackened iron you get seven hard little highlights
// sliding around on an otherwise dead surface. That is the exact signature of
// "AI-generated 3D asset", and it is not the reconstruction's fault: the same
// mesh under a real environment reads as metal immediately. It is why the
// console looked like wet plastic even after the metalness was clamped.
//
// The usual fix is an HDRI, which we cannot have: drei's <Environment preset>
// pulls from a CDN, this sandbox has no route to it, and putting a third party
// on the critical path of the room drawing at all is the same mistake the
// Draco decoder already taught us once.
//
// So the environment is PAINTED, from the room's own light plan. This is not a
// compromise — it is arguably more correct. A studio's reflections should show
// THAT studio, and every blob below is a light that actually exists a few
// metres away in the scene: the candelabra off to the left, the neon high on
// the back wall, the two monitor banks flanking it, the cool rim behind the
// machine, a warm floor and a cold ceiling. Look at the brass on the console
// and you are looking at the room it stands in.
//
// One 512x256 canvas, PMREM'd once at mount. Costs nothing per frame.

import { useEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { ROOM } from './studio-data';

/** Where a world-space point sits on an equirectangular map.
 *
 *  three samples equirect maps as
 *      u = atan2(dir.z, dir.x) / 2pi + 0.5
 *      v = asin(dir.y) / pi + 0.5
 *  and canvas textures arrive flipped, so row 0 of the image is v = 1, the
 *  ceiling. Deriving u from the light's real position rather than eyeballing
 *  it is what keeps the reflection pointing at the thing that is actually
 *  casting it — get this wrong and the brass shows a warm highlight on the
 *  side away from the candles, which reads as broken without reading as
 *  anything nameable.
 */
function place(x: number, z: number, y: number, w: number, h: number) {
  const u = Math.atan2(z, x) / (Math.PI * 2) + 0.5;
  // Elevation is approximated against the room's half-height: these sources
  // are metres away, not on the unit sphere, and the map only carries
  // low-frequency light. Close is correct enough; exact is meaningless.
  const v = 0.5 + (y - ROOM.height / 2) / ROOM.height;
  return { x: u * w, y: (1 - v) * h };
}

function envCanvas(w = 512, h = 256) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const x = c.getContext('2d')!;

  // Ground state: a warm dark room. Not black — a black environment is the
  // same as no environment, which is the bug this file exists to fix.
  const base = x.createLinearGradient(0, 0, 0, h);
  base.addColorStop(0.0, '#1b1c24');   // ceiling, cool and dead
  base.addColorStop(0.42, '#2a1e1d');  // the oxblood walls
  base.addColorStop(0.72, '#33251d');
  base.addColorStop(1.0, '#3b2d21');   // floor, warmest — it catches the most
  x.fillStyle = base;
  x.fillRect(0, 0, w, h);

  // Each source is drawn three times, at u-1, u and u+1, because the map wraps
  // and the candelabra sits within a few degrees of the seam. A blob clipped
  // at the seam puts a hard vertical edge into every reflection in the room.
  const blob = (px: number, py: number, r: number, color: string, a: number) => {
    for (const off of [-w, 0, w]) {
      const g = x.createRadialGradient(px + off, py, 0, px + off, py, r);
      g.addColorStop(0, color);
      g.addColorStop(0.45, color.replace(/[\d.]+\)$/, a * 0.34 + ')'));
      g.addColorStop(1, color.replace(/[\d.]+\)$/, '0)'));
      x.fillStyle = g;
      x.beginPath();
      x.arc(px + off, py, r, 0, Math.PI * 2);
      x.fill();
    }
  };

  const D = ROOM.depth / 2;

  // the candelabra — the key, and by far the biggest thing in any reflection
  const cand = place(-2.15, -0.5, 1.5, w, h);
  blob(cand.x, cand.y, w * 0.20, 'rgba(255,180,107,0.92)', 0.92);

  // the neon, high on the back wall
  const neon = place(0, -D + 0.35, 2.62, w, h);
  blob(neon.x, neon.y, w * 0.13, 'rgba(196,18,48,0.80)', 0.80);

  // the two monitor banks flanking it
  const ml = place(-2.42, -D + 0.5, 1.5, w, h);
  const mr = place(2.42, -D + 0.5, 1.5, w, h);
  blob(ml.x, ml.y, w * 0.10, 'rgba(74,143,111,0.62)', 0.62);
  blob(mr.x, mr.y, w * 0.10, 'rgba(74,143,111,0.62)', 0.62);

  // the cool rim behind the machine — the thing that stops the brass reading
  // as a solid gold lamp, now that it has a surface to actually appear on
  const rim = place(0.35, -1.5, 1.95, w, h);
  blob(rim.x, rim.y, w * 0.09, 'rgba(46,159,212,0.55)', 0.55);

  // the worktop itself: a broad, weak, warm band low down. It is the largest
  // pale surface in the room and sits directly under the key, so in life it is
  // the second brightest thing any metal on the bench can see.
  const top = x.createLinearGradient(0, h * 0.72, 0, h);
  top.addColorStop(0, 'rgba(201,146,95,0)');
  top.addColorStop(1, 'rgba(201,146,95,0.34)');
  x.fillStyle = top;
  x.fillRect(0, h * 0.72, w, h * 0.28);

  return c;
}

/** Builds the environment once and hands it to the scene.
 *
 *  PMREM rather than the raw equirect: the pre-filtered mip chain is what lets
 *  a rough surface sample a blurred version of the same environment, which is
 *  the whole mechanism by which roughness reads as roughness. Handed the raw
 *  texture, every material — polished brass and worn timber alike — reflects
 *  the same sharp image and the roughness column stops meaning anything.
 */
export function RoomEnvironment() {
  const gl = useThree((s) => s.gl);

  // Attached rather than assigned. `scene.environment = tex` is the obvious
  // way to write this and React 19's immutability rule rejects it, correctly:
  // useThree's scene is not ours to mutate, and a hand-assigned environment
  // also survives a remount that R3F thinks it cleaned up. `attach` makes the
  // texture's lifetime the component's lifetime, which is what we actually
  // mean — and it is how drei's own <Environment> does it.
  //
  // NOT background. The room's walls are real geometry a couple of metres
  // away, so the environment would only ever be visible through a gap in
  // them — and a gap is a bug worth seeing rather than papering over.
  const rt = useMemo(() => {
    const src = new THREE.CanvasTexture(envCanvas());
    src.mapping = THREE.EquirectangularReflectionMapping;
    src.colorSpace = THREE.SRGBColorSpace;

    const pmrem = new THREE.PMREMGenerator(gl);
    pmrem.compileEquirectangularShader();
    const target = pmrem.fromEquirectangular(src);

    // The source canvas and the generator have both done their job by now —
    // everything downstream reads the pre-filtered mip chain in `target`.
    src.dispose();
    pmrem.dispose();
    return target;
  }, [gl]);

  // Dispose the render target, not just its texture: the texture is the part
  // that gets used, but the target is what holds the GPU memory.
  useEffect(() => () => rt.dispose(), [rt]);

  return <primitive object={rt.texture} attach="environment" />;
}
