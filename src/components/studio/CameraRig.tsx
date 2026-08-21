'use client';

// "You open your eyes and you're there."
//
// You are SEATED. You can turn your head; you cannot walk away. That is a
// deliberate constraint, not a missing feature — a room you can walk around
// has to be right from every angle, and this one is composed for one chair.
//
// The look is pointer-driven with a damped spring, so the room keeps drifting
// for a beat after the mouse stops. That trailing motion is most of what makes
// a first-person view feel like a head rather than a camera. Damping is
// frame-rate independent (1 - e^(-k·dt)); a raw per-frame lerp would make the
// room turn at different speeds on a 60 Hz and a 144 Hz screen.
//
// The opening move: the view starts pitched down at the bench and rises to
// level over the first beat. Eyes opening, not a camera fading up.
//
// The camera is declared here rather than taken from useThree, because the rig
// writes to it every frame and a hook's return value is not ours to mutate.

import { useEffect, useRef } from 'react';
import { PerspectiveCamera } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import type { PerspectiveCamera as TPerspectiveCamera } from 'three';
import { SEAT } from './studio-data';
import { getAim } from './look';

const DEG = Math.PI / 180;

export function CameraRig({ reduced }: { reduced: boolean }) {
  const cam = useRef<TPerspectiveCamera>(null);
  const domElement = useThree((s) => s.gl.domElement);
  const target = useRef({ yaw: 0, pitch: 0 });
  const current = useRef({ yaw: 0, pitch: 0 });
  // Wall-clock, not accumulated dt. dt is clamped to 50 ms so a stalled tab
  // cannot snap the head round — but accumulating a clamped dt means the eyes
  // take TEN seconds to open at 3 fps instead of 1.6, which is exactly what
  // happened under the software renderer the capture harness uses.
  const openedAt = useRef(0);

  useEffect(() => {
    const el = domElement;
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const nx = ((e.clientX - r.left) / r.width) * 2 - 1;   // -1 … 1
      const ny = ((e.clientY - r.top) / r.height) * 2 - 1;
      target.current.yaw = -nx * SEAT.yaw * DEG * 0.5;
      target.current.pitch = -ny * (ny < 0 ? SEAT.pitchUp : SEAT.pitchDown) * DEG * 0.75;
    };
    const onLeave = () => { target.current.yaw = 0; target.current.pitch = 0; };
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerleave', onLeave);
    return () => {
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
    };
  }, [domElement]);

  useFrame((_, dt) => {
    const c = cam.current;
    if (!c) return;
    const d = Math.min(dt, 0.05); // a stalled tab must not snap the head round
    const now = performance.now();
    if (openedAt.current === 0) openedAt.current = now;

    const raw = reduced ? 1 : Math.min(1, (now - openedAt.current) / 1600);
    // ease-out quart — fast off the mark, settles gently at level
    const o = 1 - Math.pow(1 - raw, 4);

    // Keyboard focus outranks the pointer. When a door is focused the head is
    // turned to face it, and it stays there until focus moves — otherwise a
    // stray pointer event over the canvas would drag the view off whatever the
    // keyboard user had just selected, which is the sort of thing that makes a
    // site technically navigable and actually unusable.
    const aim = getAim();
    const wantYaw = aim ? aim.yaw : target.current.yaw;
    const wantPitch = aim ? aim.pitch : target.current.pitch;

    // Faster toward a focused door than the ambient pointer drift. The lazy
    // spring is right for a head following a mouse; for "show me the thing I
    // just selected" it reads as sluggish.
    const k = 1 - Math.exp(-(aim ? 7.5 : 4.2) * d);
    current.current.yaw += (wantYaw - current.current.yaw) * k;
    current.current.pitch += (wantPitch - current.current.pitch) * k;

    // the opening tilt down at the bench, blending out as `o` rises
    const openPitch = -SEAT.pitchDown * DEG * 0.8 * (1 - o);

    c.rotation.order = 'YXZ';
    c.rotation.y = current.current.yaw * o;
    c.rotation.x = current.current.pitch * o + openPitch;

    // a breath: sub-centimetre drift, the chest of someone sitting
    c.position.y = reduced
      ? SEAT.position[1]
      : SEAT.position[1] + Math.sin(performance.now() / 1000 * 0.55) * 0.006;
  });

  return (
    <PerspectiveCamera
      ref={cam}
      makeDefault
      fov={58}
      near={0.05}
      far={60}
      position={SEAT.position}
    />
  );
}
