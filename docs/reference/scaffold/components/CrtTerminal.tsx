"use client";

import { Suspense, useMemo } from "react";
import * as THREE from "three";
import { useMachine } from "@/lib/machineStore";
import { Prop } from "./Props";

// ─────────────────────────────────────────────────────────────────────────────
// THE TERMINAL — the CRT. Real sculpted body (GLB) + a live phosphor screen
// (canvas texture). Click the glass to dive into the OS (Phase 4).
// Spec: STATE_BIBLE §6 — warm-ghost phosphor-green default.
// ─────────────────────────────────────────────────────────────────────────────

export function CrtTerminal() {
  const state = useMachine((s) => s.state);
  const subjectId = useMachine((s) => s.subjectId);
  const visits = useMachine((s) => s.visits);
  const enterCrt = useMachine((s) => s.enterCrt);
  const setFocus = useMachine((s) => s.setFocus);

  const screenTex = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 640;
    c.height = 400;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#071007";
    ctx.fillRect(0, 0, 640, 400);

    const PHOS = "#54B947";
    ctx.strokeStyle = PHOS;
    ctx.fillStyle = PHOS;
    ctx.shadowColor = PHOS;
    ctx.shadowBlur = 12;

    ctx.font = "700 44px monospace";
    ctx.fillText(state.name, 24, 64);
    ctx.font = "18px monospace";
    ctx.shadowBlur = 6;
    ctx.fillText(`${state.bits.join("")} · ${state.signet}`, 24, 96);
    ctx.font = "14px monospace";
    ctx.shadowBlur = 4;
    const line = `${state.moodLine}`;
    for (let i = 0; i < line.length; i += 86) {
      ctx.fillText(line.slice(i, i + 86), 24, 132 + (i / 86) * 20);
    }
    ctx.fillText(`subject ${subjectId} · visits ${visits} · the room is not empty`, 24, 360);

    const t = Date.now() / 1000;
    ctx.strokeStyle = PHOS;
    ctx.globalAlpha = 0.35;
    for (let r = 1; r <= 4; r++) {
      ctx.beginPath();
      ctx.arc(560, 120, r * 22, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.moveTo(560, 120);
    ctx.lineTo(560 + 88 * Math.cos(t), 120 + 88 * Math.sin(t));
    ctx.stroke();
    ctx.globalAlpha = 1;

    ctx.fillStyle = "rgba(0,0,0,0.24)";
    for (let y = 0; y < 400; y += 4) ctx.fillRect(0, y, 640, 2);

    const tex = new THREE.CanvasTexture(c);
    tex.anisotropy = 4;
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, [state.index, subjectId, visits, state.bits, state.signet, state.moodLine]);

  return (
    <group
      position={[2.45, 0.72, 1.55]}
      rotation={[0, -0.35, 0]}
      onClick={(e) => {
        e.stopPropagation();
        setFocus("screen");
      }}
    >
      {/* real sculpted CRT body */}
      <Suspense fallback={null}>
        <Prop src="/assets/crt_terminal.glb" scale={2.1} position={[0, 0.5, 0.06]} rotation={[0, 0, 0]} />
      </Suspense>

      {/* the live glass — click to dive */}
      <mesh
        position={[0, 0.6, 0.46]}
        onClick={(e) => {
          e.stopPropagation();
          enterCrt();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => (document.body.style.cursor = "auto")}
      >
        <planeGeometry args={[0.72, 0.56]} />
        <meshBasicMaterial map={screenTex} toneMapped={false} />
      </mesh>
    </group>
  );
}