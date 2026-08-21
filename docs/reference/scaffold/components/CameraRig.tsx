"use client";

import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useMachine } from "@/lib/machineStore";

// Focus presets — the camera glides to a named place when the HUD asks.
const TARGETS: Record<string, [number, number, number]> = {
  console: [2.6, 1.5, 2.4],
  screen: [3.4, 1.5, 2.0],
  ring: [0, 1.5, 3.6],
};

export function CameraRig() {
  const focus = useMachine((s) => s.focus);

  useFrame(({ camera }, dt) => {
    if (!focus || !TARGETS[focus]) return;
    const t = TARGETS[focus];
    const k = Math.min(1, dt * 2.4);
    camera.position.lerp(new THREE.Vector3(...t), k);
  });

  return null;
}