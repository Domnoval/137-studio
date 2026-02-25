"use client";

import React, { useRef, useMemo, useCallback } from "react";
import { useFrame, useThree, extend } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";
import { crtVertexShader, crtFragmentShader } from "./shaders/crt";

// CRT Shader Material
class CRTMaterial extends THREE.ShaderMaterial {
  constructor() {
    super({
      uniforms: {
        tDiffuse: { value: null },
        uTime: { value: 0 },
        uIntensity: { value: 1.0 },
        uProximity: { value: 0.0 },
        uGlowColor: { value: new THREE.Color("#00FFD1") },
      },
      vertexShader: crtVertexShader,
      fragmentShader: crtFragmentShader,
      transparent: false,
    });
  }
}

extend({ CRTMaterial });

// Generate animated portal content texture
function usePortalTexture() {
  const canvas = useMemo(() => {
    if (typeof document === "undefined") return null;
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 384;
    return c;
  }, []);

  const texture = useMemo(() => {
    if (!canvas) return null;
    const tex = new THREE.CanvasTexture(canvas);
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    return tex;
  }, [canvas]);

  const draw = useCallback(
    (time: number, proximity: number) => {
      if (!canvas || !texture) return;
      const ctx = canvas.getContext("2d")!;
      const w = canvas.width;
      const h = canvas.height;

      // Dark base
      ctx.fillStyle = "#050510";
      ctx.fillRect(0, 0, w, h);

      // Animated static/noise layer
      const imageData = ctx.createImageData(w, h);
      const d = imageData.data;
      const noiseAmount = 0.06 * (1 - proximity * 0.5);
      for (let i = 0; i < d.length; i += 16) {
        // sparse noise for performance
        const v = Math.random() < noiseAmount ? Math.random() * 80 : 0;
        d[i] = v * 0.5;
        d[i + 1] = v * 0.8;
        d[i + 2] = v;
        d[i + 3] = 255;
      }
      ctx.putImageData(imageData, 0, 0);

      // Central portal glow — pulses
      const pulse = 0.6 + Math.sin(time * 2) * 0.2 + proximity * 0.3;
      const grad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.45);
      grad.addColorStop(0, `rgba(0, 255, 209, ${pulse * 0.6})`);
      grad.addColorStop(0.3, `rgba(0, 180, 160, ${pulse * 0.3})`);
      grad.addColorStop(0.6, `rgba(123, 47, 190, ${pulse * 0.15})`);
      grad.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.globalCompositeOperation = "screen";
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Swirling geometry hints
      ctx.globalCompositeOperation = "screen";
      ctx.strokeStyle = `rgba(201, 168, 76, ${0.15 + proximity * 0.2})`;
      ctx.lineWidth = 1;
      const segments = 6;
      const radius = 60 + Math.sin(time) * 20;
      ctx.beginPath();
      for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * Math.PI * 2 + time * 0.5;
        const x = w / 2 + Math.cos(angle) * radius;
        const y = h / 2 + Math.sin(angle) * radius;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();

      // Inner hexagon
      ctx.strokeStyle = `rgba(0, 255, 209, ${0.1 + proximity * 0.15})`;
      const r2 = 30 + Math.cos(time * 0.7) * 10;
      ctx.beginPath();
      for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * Math.PI * 2 - time * 0.3;
        const x = w / 2 + Math.cos(angle) * r2;
        const y = h / 2 + Math.sin(angle) * r2;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();

      // "137" ghosted in the static
      ctx.globalCompositeOperation = "source-over";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = "bold 80px monospace";
      ctx.fillStyle = `rgba(201, 168, 76, ${0.08 + proximity * 0.12})`;
      ctx.fillText("137", w / 2, h / 2);

      // Prompt text — fades in as player approaches
      if (proximity > 0.2) {
        ctx.font = "bold 18px monospace";
        ctx.fillStyle = `rgba(0, 255, 209, ${(proximity - 0.2) * 1.2})`;
        ctx.shadowColor = "#00FFD1";
        ctx.shadowBlur = 15;
        ctx.fillText("ENTER", w / 2, h / 2 + 80);
        ctx.shadowBlur = 0;
      }

      texture.needsUpdate = true;
    },
    [canvas, texture]
  );

  return { texture, draw };
}

// Vintage TV cabinet geometry
function TVCabinet() {
  return (
    <group>
      {/* Main wooden cabinet body */}
      <mesh position={[0, 0, -0.2]}>
        <boxGeometry args={[5.8, 5, 1.2]} />
        <meshStandardMaterial color="#1a1208" roughness={0.9} metalness={0.05} />
      </mesh>

      {/* Top of cabinet — slightly wider */}
      <mesh position={[0, 2.6, -0.2]}>
        <boxGeometry args={[6.0, 0.2, 1.4]} />
        <meshStandardMaterial color="#1a1208" roughness={0.85} metalness={0.05} />
      </mesh>

      {/* Screen bezel — dark plastic inset */}
      <mesh position={[0, 0.3, 0.21]}>
        <boxGeometry args={[4.6, 3.5, 0.1]} />
        <meshStandardMaterial color="#0a0a0a" roughness={0.5} metalness={0.1} />
      </mesh>

      {/* Control panel area below screen */}
      <mesh position={[0, -1.8, 0.2]}>
        <boxGeometry args={[4.6, 0.8, 0.1]} />
        <meshStandardMaterial color="#1a1208" roughness={0.85} />
      </mesh>

      {/* Channel knob */}
      <mesh position={[1.8, -1.8, 0.35]}>
        <cylinderGeometry args={[0.15, 0.15, 0.15, 16]} />
        <meshStandardMaterial color="#C9A84C" roughness={0.3} metalness={0.8} />
      </mesh>

      {/* Volume knob */}
      <mesh position={[1.2, -1.8, 0.35]}>
        <cylinderGeometry args={[0.12, 0.12, 0.15, 16]} />
        <meshStandardMaterial color="#C9A84C" roughness={0.3} metalness={0.8} />
      </mesh>

      {/* Speaker grille (right side) */}
      <mesh position={[-1.8, -1.8, 0.25]}>
        <planeGeometry args={[1.0, 0.6]} />
        <meshStandardMaterial color="#2a2015" roughness={0.95} />
      </mesh>

      {/* Legs */}
      {[[-2.4, -2.8, 0.3], [2.4, -2.8, 0.3], [-2.4, -2.8, -0.7], [2.4, -2.8, -0.7]].map(
        (pos, i) => (
          <mesh key={i} position={pos as [number, number, number]}>
            <cylinderGeometry args={[0.08, 0.06, 0.6, 8]} />
            <meshStandardMaterial color="#1a1208" roughness={0.85} metalness={0.1} />
          </mesh>
        )
      )}

      {/* Antenna */}
      <group position={[0, 2.7, -0.2]}>
        <mesh position={[-0.8, 1.0, 0]} rotation={[0, 0, 0.3]}>
          <cylinderGeometry args={[0.02, 0.015, 2.0, 6]} />
          <meshStandardMaterial color="#888" metalness={0.9} roughness={0.2} />
        </mesh>
        <mesh position={[0.8, 1.0, 0]} rotation={[0, 0, -0.3]}>
          <cylinderGeometry args={[0.02, 0.015, 2.0, 6]} />
          <meshStandardMaterial color="#888" metalness={0.9} roughness={0.2} />
        </mesh>
      </group>
    </group>
  );
}

export function TVPortal({
  label = "GALLERY",
  destination = "/gallery",
}: {
  label?: string;
  destination?: string;
}) {
  const screenRef = useRef<THREE.Mesh>(null);
  const crtMatRef = useRef<THREE.ShaderMaterial>(null);
  const { camera } = useThree();
  const portalWorldPos = useRef(new THREE.Vector3());
  const { texture, draw } = usePortalTexture();

  // Proximity state for smooth transitions
  const proximityRef = useRef(0);
  const ACTIVATION_DISTANCE = 8; // start reacting
  const ENTER_DISTANCE = 1.8; // trigger portal

  useFrame((_, delta) => {
    if (!screenRef.current || !texture) return;

    // Get world position of portal
    screenRef.current.getWorldPosition(portalWorldPos.current);
    const dist = camera.position.distanceTo(portalWorldPos.current);

    // Calculate proximity (0 = far, 1 = right at the portal)
    const rawProximity = 1 - Math.min(dist / ACTIVATION_DISTANCE, 1);
    // Smooth lerp
    proximityRef.current += (rawProximity - proximityRef.current) * 3 * delta;
    const proximity = proximityRef.current;

    const time = Date.now() * 0.001;

    // Draw animated portal content
    draw(time, proximity);

    // Update CRT shader uniforms
    if (crtMatRef.current) {
      crtMatRef.current.uniforms.tDiffuse.value = texture;
      crtMatRef.current.uniforms.uTime.value = time;
      crtMatRef.current.uniforms.uProximity.value = proximity;
    }

    // Portal activation
    if (dist < ENTER_DISTANCE) {
      console.log(`Portal activated: ${destination}`);
      // TODO: route to destination
    }
  });

  if (!texture) return null;

  return (
    <group>
      <TVCabinet />

      {/* CRT Screen with shader */}
      <mesh ref={screenRef} position={[0, 0.3, 0.27]}>
        <planeGeometry args={[4.2, 3.15]} />
        <shaderMaterial
          ref={crtMatRef}
          uniforms={{
            tDiffuse: { value: texture },
            uTime: { value: 0 },
            uIntensity: { value: 1.0 },
            uProximity: { value: 0 },
            uGlowColor: { value: new THREE.Color("#00FFD1") },
          }}
          vertexShader={crtVertexShader}
          fragmentShader={crtFragmentShader}
        />
      </mesh>

      {/* Label below the TV */}
      <Text
        position={[0, -3.3, 0.3]}
        fontSize={0.3}
        color="#C9A84C"
        anchorX="center"
        anchorY="middle"
        font="/fonts/CinzelDecorative-Bold.woff"
      >
        {label}
      </Text>

      {/* Portal light — intensity tied to proximity */}
      <pointLight
        position={[0, 0.3, 1.5]}
        color="#00FFD1"
        intensity={1.5}
        distance={8}
      />
    </group>
  );
}
