'use client';

// cosmos/Effects.tsx — OWNED BY COSMOS agent.
//
// Post chain, tuned for restraint:
//   * CONTRACTION GRADE (custom). Outside the contraction this is nothing but
//     the whisper of chromatic aberration at the frame edges that the built-in
//     ChromaticAberration used to provide — same offsets, same radial
//     modulation, so the other 84% of the journey is untouched.
//     Inside the contraction it becomes the warp: an 11-tap radial velocity
//     smear around the published vanishing point, which stretches EVERYTHING
//     in frame along the radial vector (including the receding artwork —
//     effect and subject in one document, not two), compresses it across that
//     vector, desaturates and darkens it as it accelerates, and separates the
//     channels by an amount that grows with distance from the vanishing point.
//     It also carries the temperature swing: colder blue-black as the warp
//     accelerates, a denser and slightly warmer vignette on the sigil beat.
//     Still near-black, still one accent — a shift inside the discipline.
//   * Bloom with a threshold above 1.0 so ONLY deliberately-overdriven red
//     (slab glow, the iris at the pulse) blooms.
//   * The standing vignette.
// Film grain is DOM (ATMOSPHERE agent) — none here.

import { forwardRef, useMemo } from 'react';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { Effect, EffectAttribute, BlendFunction } from 'postprocessing';
import * as THREE from 'three';
import { contraction } from './contraction-state';

const GRADE_FRAG = /* glsl */ `
  uniform vec2 uCenter;
  uniform float uWarp;
  uniform float uCool;
  uniform float uVig;

  void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    vec2 d = uv - uCenter;
    vec2 da = vec2(d.x * aspect, d.y);
    float r = length(da);
    float rn = clamp(r / 0.80, 0.0, 1.0);
    vec3 col;

    if (uWarp < 0.003) {
      // resting frame — the standing edge aberration, nothing else
      vec2 shift = vec2(0.00045, 0.0003 * aspect);
      float dm = max(distance(uv, vec2(0.5)) * 2.0 - 0.42, 0.0);
      col = vec3(
        texture2D(inputBuffer, uv + shift * dm).r,
        inputColor.g,
        texture2D(inputBuffer, uv - shift * dm).b
      );
    } else {
      // Radial velocity smear. Every tap steps FURTHER OUT along the radial
      // vector, which drags content toward the vanishing point: the frame
      // stretches along the vector of travel and squeezes across it.
      float reach = uWarp * (0.030 + rn * 0.22);
      float squeeze = uWarp * 0.12 * rn;
      vec2 tang = vec2(-d.y, d.x);
      // per-pixel tap offset: without it eleven discrete taps read as eleven
      // ghosts combed along the vector instead of as one smear
      float jit = fract(sin(dot(uv, vec2(12.9898, 78.233))) * 43758.5453);
      vec3 acc = vec3(0.0);
      float wsum = 0.0;
      const int TAPS = 12;
      for (int i = 0; i < TAPS; i++) {
        float t = (float(i) + jit) / float(TAPS);
        vec2 suv = uCenter + d * (1.0 + reach * t) - tang * squeeze * t;
        float w = 1.0 - t * 0.80;              // bright head, vanishing tail
        vec2 sd = d * (uWarp * rn * 0.0062 * (0.3 + t));
        acc += vec3(
          texture2D(inputBuffer, clamp(suv + sd, 0.0, 1.0)).r,
          texture2D(inputBuffer, clamp(suv, 0.0, 1.0)).g,
          texture2D(inputBuffer, clamp(suv - sd, 0.0, 1.0)).b
        ) * w;
        wsum += w;
      }
      col = acc / wsum;

      // it bleeds out as it accelerates
      float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));
      col = mix(col, vec3(lum), clamp(uWarp * (0.34 + rn * 0.52), 0.0, 0.76));
      col *= 1.0 - uWarp * (0.08 + rn * 0.26);
      // the periphery falls away: the throat is the only thing in focus
      col *= 1.0 - uWarp * smoothstep(0.34, 1.0, r) * 0.42;
    }

    // colder ground as the warp accelerates
    if (uCool > 0.001) {
      vec3 cold = col * vec3(0.84, 0.97, 1.22) + vec3(0.0003, 0.0007, 0.0021);
      col = mix(col, cold, uCool);
    }

    // the sigil beat: denser, a shade warmer
    if (uVig > 0.001) {
      float v = smoothstep(0.24, 0.94, r);
      col *= 1.0 - v * 0.52 * uVig;
      col += vec3(0.0024, 0.0009, 0.0007) * uVig * (1.0 - smoothstep(0.0, 0.55, r));
    }

    outputColor = vec4(col, inputColor.a);
  }
`;

class ContractionGradeEffect extends Effect {
  constructor() {
    super('ContractionGradeEffect', GRADE_FRAG, {
      attributes: EffectAttribute.CONVOLUTION,
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([
        ['uCenter', new THREE.Uniform(new THREE.Vector2(0.5, 0.5))],
        ['uWarp', new THREE.Uniform(0)],
        ['uCool', new THREE.Uniform(0)],
        ['uVig', new THREE.Uniform(0)],
      ]),
    });
  }

  update(): void {
    const c = this.uniforms.get('uCenter');
    if (c) (c.value as THREE.Vector2).set(contraction.cx, contraction.cy);
    const w = this.uniforms.get('uWarp');
    if (w) w.value = contraction.warp;
    const cool = this.uniforms.get('uCool');
    if (cool) cool.value = contraction.cool;
    const vig = this.uniforms.get('uVig');
    if (vig) vig.value = contraction.vig;
  }
}

const ContractionGrade = forwardRef<ContractionGradeEffect, Record<string, never>>(
  function ContractionGrade(_props, ref) {
    const effect = useMemo(() => new ContractionGradeEffect(), []);
    return <primitive ref={ref} object={effect} dispose={null} />;
  },
);

export function Effects() {
  return (
    <EffectComposer multisampling={0}>
      <ContractionGrade />
      <Bloom mipmapBlur intensity={0.55} luminanceThreshold={1.05} luminanceSmoothing={0.25} radius={0.72} />
      <Vignette eskil={false} offset={0.26} darkness={0.62} />
    </EffectComposer>
  );
}
