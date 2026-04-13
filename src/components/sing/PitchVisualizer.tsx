'use client';

import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { PitchData } from '@/lib/sing/pitch-detection';

// Static particle positions — generated once at module load.
// Hoisted outside the component so render stays pure (no Math.random in render).
const PARTICLE_COUNT = 120;
const PARTICLE_POSITIONS: Float32Array = (() => {
  const positions = new Float32Array(PARTICLE_COUNT * 3);
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI;
    const r = 1.5 + Math.random() * 1.5;
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);
  }
  return positions;
})();

interface PitchOrbProps {
  pitch: PitchData;
}

function PitchOrb({ pitch }: PitchOrbProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const particlesRef = useRef<THREE.Points>(null);

  // Map pitch to color: low=red, mid=cyan, high=white
  const color = useMemo(() => {
    if (pitch.frequency === 0) return new THREE.Color('#2a2825');
    const t = Math.max(0, Math.min(1, (pitch.frequency - 80) / 800));
    if (t < 0.5) {
      return new THREE.Color('#c41230').lerp(new THREE.Color('#5ce0d2'), t * 2);
    }
    return new THREE.Color('#5ce0d2').lerp(new THREE.Color('#e8e4dc'), (t - 0.5) * 2);
  }, [pitch.frequency]);

  // Map cents to position offset (flat = left, sharp = right)
  const xOffset = (pitch.cents / 50) * 1.5;

  // Map amplitude to scale
  const scale = 0.5 + pitch.amplitude * 2;

  // Particle positions — static, generated once at module load
  const particlePositions = PARTICLE_POSITIONS;

  useFrame((state) => {
    const t = state.clock.elapsedTime;

    if (meshRef.current) {
      meshRef.current.position.x = THREE.MathUtils.lerp(meshRef.current.position.x, xOffset, 0.1);
      meshRef.current.scale.setScalar(THREE.MathUtils.lerp(meshRef.current.scale.x, scale, 0.15));
      meshRef.current.rotation.y = t * 0.5;
      meshRef.current.rotation.z = Math.sin(t * 0.3) * 0.2;
    }

    if (glowRef.current) {
      glowRef.current.position.x = THREE.MathUtils.lerp(glowRef.current.position.x, xOffset, 0.1);
      glowRef.current.scale.setScalar(THREE.MathUtils.lerp(glowRef.current.scale.x, scale * 1.8, 0.1));
      const mat = glowRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.1 + pitch.amplitude * 0.2;
    }

    if (particlesRef.current) {
      particlesRef.current.rotation.y = t * 0.2;
      particlesRef.current.rotation.x = t * 0.1;
      const pScale = pitch.frequency > 0 ? 1 + pitch.amplitude : 0.3;
      particlesRef.current.scale.setScalar(THREE.MathUtils.lerp(particlesRef.current.scale.x, pScale, 0.05));
    }
  });

  return (
    <group>
      {/* Core orb */}
      <mesh ref={meshRef}>
        <icosahedronGeometry args={[0.6, 3]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.5 + pitch.amplitude}
          wireframe
          transparent
          opacity={0.9}
        />
      </mesh>

      {/* Glow sphere */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[0.8, 16, 16]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.15}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Floating particles */}
      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[particlePositions, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          color={color}
          size={0.03}
          transparent
          opacity={0.6}
          sizeAttenuation
        />
      </points>
    </group>
  );
}

// Pitch accuracy indicator bars
function PitchBars({ pitch }: { pitch: PitchData }) {
  const barsRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (!barsRef.current) return;
    barsRef.current.children.forEach((child, i) => {
      const mesh = child as THREE.Mesh;
      const barCenter = (i - 5) * 10; // -50 to +50 cents
      const distance = Math.abs(pitch.cents - barCenter);
      const intensity = Math.max(0, 1 - distance / 15);
      const mat = mesh.material as THREE.MeshStandardMaterial;
      const isCenter = i === 5;

      if (pitch.frequency > 0) {
        mat.emissiveIntensity = intensity * 2;
        mesh.scale.y = 0.3 + intensity * 0.7;
      } else {
        mat.emissiveIntensity = 0.05;
        mesh.scale.y = 0.3;
      }

      if (isCenter) {
        mat.color.set('#5ce0d2');
        mat.emissive.set('#5ce0d2');
      }
    });
  });

  return (
    <group ref={barsRef} position={[0, -2, 0]}>
      {Array.from({ length: 11 }, (_, i) => {
        const x = (i - 5) * 0.35;
        const isCenter = i === 5;
        return (
          <mesh key={i} position={[x, 0, 0]}>
            <boxGeometry args={[0.12, 0.5, 0.05]} />
            <meshStandardMaterial
              color={isCenter ? '#5ce0d2' : '#a09890'}
              emissive={isCenter ? '#5ce0d2' : '#a09890'}
              emissiveIntensity={0.1}
              transparent
              opacity={0.8}
            />
          </mesh>
        );
      })}
    </group>
  );
}

interface PitchVisualizerProps {
  pitch: PitchData;
  className?: string;
}

export function PitchVisualizer({ pitch, className = '' }: PitchVisualizerProps) {
  return (
    <div className={`relative ${className}`}>
      <Canvas
        camera={{ position: [0, 0, 5], fov: 50 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.3} />
        <pointLight position={[5, 5, 5]} intensity={0.8} color="#5ce0d2" />
        <pointLight position={[-5, -3, 3]} intensity={0.4} color="#c41230" />

        <PitchOrb pitch={pitch} />
        <PitchBars pitch={pitch} />
      </Canvas>

      {/* Overlay note display */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-center pointer-events-none">
        <div className="font-mono text-3xl font-bold tracking-wider" style={{
          color: pitch.frequency > 0 ? '#5ce0d2' : '#2a2825',
          textShadow: pitch.frequency > 0 ? '0 0 20px rgba(92,224,210,0.5)' : 'none',
        }}>
          {pitch.note}
        </div>
        {pitch.frequency > 0 && (
          <div className="font-mono text-[10px] text-[#a09890] mt-1">
            {pitch.frequency.toFixed(1)} Hz &middot; {pitch.cents > 0 ? '+' : ''}{pitch.cents}¢
          </div>
        )}
      </div>

      {/* Flat/Sharp indicators */}
      <div className="absolute top-1/2 left-4 -translate-y-1/2 font-mono text-xs text-[#c41230]/50 pointer-events-none">
        FLAT
      </div>
      <div className="absolute top-1/2 right-4 -translate-y-1/2 font-mono text-xs text-[#c41230]/50 pointer-events-none">
        SHARP
      </div>
    </div>
  );
}
