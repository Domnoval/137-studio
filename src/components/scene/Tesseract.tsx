"use client";

import React, { useRef, useMemo, useState, useCallback } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const GOLD = "#C9A84C";
const WARM_GOLD = "#E8C547";

function buildHypercubeVertices(): number[][] {
  const verts: number[][] = [];
  for (let i = 0; i < 16; i++) {
    verts.push([(i & 1) ? 1 : -1, (i & 2) ? 1 : -1, (i & 4) ? 1 : -1, (i & 8) ? 1 : -1]);
  }
  return verts;
}

function buildHypercubeEdges(verts: number[][]): [number, number][] {
  const edges: [number, number][] = [];
  for (let i = 0; i < verts.length; i++) {
    for (let j = i + 1; j < verts.length; j++) {
      let diff = 0;
      for (let k = 0; k < 4; k++) if (verts[i][k] !== verts[j][k]) diff++;
      if (diff === 1) edges.push([i, j]);
    }
  }
  return edges;
}

function rotate4D(v: number[], a: number, b: number, angle: number): number[] {
  const out = [...v];
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  out[a] = v[a] * c - v[b] * s;
  out[b] = v[a] * s + v[b] * c;
  return out;
}

function project4Dto3D(v: number[], dist: number): THREE.Vector3 {
  const f = 1 / (dist - v[3]);
  return new THREE.Vector3(v[0] * f, v[1] * f, v[2] * f);
}

const HYPER_VERTS = buildHypercubeVertices();
const HYPER_EDGES = buildHypercubeEdges(HYPER_VERTS);

function TesseractWireframe({ opacityRef }: { opacityRef: React.RefObject<number> }) {
  const geomRef = useRef<THREE.BufferGeometry>(null);
  const matRef = useRef<THREE.LineBasicMaterial>(null);
  const angleRef = useRef({ xw: 0, yz: 0 });
  // Use a ref for the position buffer so it can be mutated per-frame
  // without violating the react-hooks/immutability rule.
  const positionsRef = useRef<Float32Array>(new Float32Array(HYPER_EDGES.length * 6));

  useFrame((_s, delta) => {
    angleRef.current.xw += delta * 0.5;
    angleRef.current.yz += delta * 0.3;
    const { xw, yz } = angleRef.current;

    const projected = HYPER_VERTS.map((v) => {
      let r = rotate4D(v, 0, 3, xw);
      r = rotate4D(r, 1, 2, yz);
      return project4Dto3D(r, 3);
    });

    const positions = positionsRef.current;
    for (let i = 0; i < HYPER_EDGES.length; i++) {
      const [a, b] = HYPER_EDGES[i];
      const pa = projected[a];
      const pb = projected[b];
      const off = i * 6;
      positions[off] = pa.x; positions[off + 1] = pa.y; positions[off + 2] = pa.z;
      positions[off + 3] = pb.x; positions[off + 4] = pb.y; positions[off + 5] = pb.z;
    }

    if (geomRef.current) {
      geomRef.current.setAttribute("position", new THREE.BufferAttribute(positions.slice(), 3));
      geomRef.current.computeBoundingSphere();
    }
    if (matRef.current) matRef.current.opacity = opacityRef.current;
  });

  return (
    <lineSegments>
      <bufferGeometry ref={geomRef} />
      <lineBasicMaterial ref={matRef} color={WARM_GOLD} transparent opacity={0} depthWrite={false} />
    </lineSegments>
  );
}

function createTypeFaceTexture(faceIndex: number): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const cx = size / 2;
  const cy = size / 2;
  ctx.clearRect(0, 0, size, size);

  const seed = faceIndex * 47;

  // Background text
  ctx.font = "600 14px monospace";
  ctx.fillStyle = "rgba(123,47,190,0.1)";
  const bg = "137 STUDIO ".repeat(6);
  for (let y = 0; y < size; y += 18) {
    ctx.fillText(bg, -100 + ((y + seed) % 60), y);
  }

  // Hero text
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = GOLD;
  ctx.shadowBlur = 30;
  ctx.fillStyle = GOLD;
  ctx.font = "900 160px monospace";
  ctx.fillText("137", cx, cy);
  ctx.shadowBlur = 10;
  ctx.fillStyle = "rgba(255,245,210,0.85)";
  ctx.fillText("137", cx, cy);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

export function GoldenTesseract() {
  const meshRef = useRef<THREE.Mesh>(null);
  const wireRef = useRef<THREE.Mesh>(null);
  const morphRef = useRef(0);
  const [active, setActive] = useState(false);

  const faceTextures = useMemo(() => {
    if (typeof document === "undefined") return [];
    return Array.from({ length: 6 }, (_, i) => createTypeFaceTexture(i));
  }, []);

  const cubeMaterials = useMemo(() => {
    if (faceTextures.length === 0) return undefined;
    return faceTextures.map((tex) =>
      new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(WARM_GOLD),
        transmission: 0.7,
        roughness: 0.1,
        metalness: 0.15,
        transparent: true,
        opacity: 0.6,
        map: tex,
        emissive: new THREE.Color(WARM_GOLD),
        emissiveMap: tex,
        emissiveIntensity: 0.35,
        side: THREE.DoubleSide,
      })
    );
  }, [faceTextures]);

  const handleOver = useCallback(() => setActive(true), []);
  const handleOut = useCallback(() => setActive(false), []);
  const handleClick = useCallback(() => setActive((a) => !a), []);

  useFrame((state, delta) => {
    morphRef.current = THREE.MathUtils.lerp(morphRef.current, active ? 1 : 0, 0.05);
    const m = morphRef.current;
    const rotY = delta * 0.06;
    const rotX = Math.sin(state.clock.elapsedTime * 0.15) * 0.06;

    if (meshRef.current) {
      meshRef.current.rotation.y += rotY;
      meshRef.current.rotation.x = rotX;
    }
    if (wireRef.current) {
      wireRef.current.rotation.y += rotY;
      wireRef.current.rotation.x = rotX;
    }

    if (cubeMaterials) {
      for (const mat of cubeMaterials) {
        // THREE.js materials are intended to be mutated per-frame to
        // animate properties like opacity. Safe despite the rule.
        // eslint-disable-next-line react-hooks/immutability
        mat.opacity = 0.75 * (1 - m);
      }
    }
  });

  if (!cubeMaterials) return null;

  return (
    <group onPointerOver={handleOver} onPointerOut={handleOut} onClick={handleClick}>
      <mesh ref={meshRef} material={cubeMaterials}>
        <boxGeometry args={[2, 2, 2]} />
      </mesh>
      <mesh ref={wireRef} scale={[1.02, 1.02, 1.02]}>
        <boxGeometry args={[2, 2, 2]} />
        <meshBasicMaterial color={WARM_GOLD} wireframe transparent opacity={0.35} />
      </mesh>
      <TesseractWireframe opacityRef={morphRef} />
    </group>
  );
}
