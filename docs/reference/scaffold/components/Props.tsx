"use client";

import { type ReactNode } from "react";
import * as THREE from "three";
import { useGLTF } from "@react-three/drei";

// ─────────────────────────────────────────────────────────────────────────────
// <Prop> — loads a real GLB prop from /public/assets. If it fails to load
// (offline / asset missing) it can't suspends forever — so we keep callers'
// proxy meshes as children (fallback). Clone the scene so multiple uses share
// one cached loader. Spec: STATE_BIBLE §11.2 — "if you can grab it, it's a mesh."
// ─────────────────────────────────────────────────────────────────────────────

export function Prop({
  src,
  scale = 1,
  position = [0, 0, 0] as [number, number, number],
  rotation = [0, 0, 0] as [number, number, number],
  fallback,
}: {
  src: string;
  scale?: number | [number, number, number];
  position?: [number, number, number];
  rotation?: [number, number, number];
  fallback?: ReactNode;
}) {
  // useGLTF suspends; parent must wrap in <Suspense>.
  const { scene } = useGLTF(src);
  const s = typeof scale === "number" ? scale : 1;
  return (
    <group position={position} rotation={rotation} scale={scale ?? [s, s, s]}>
      <primitive object={cloneScene(scene)} />
      {fallback}
    </group>
  );
}

export function cloneScene(scene: THREE.Object3D): THREE.Object3D {
  return scene.clone(true);
}

export default Prop;