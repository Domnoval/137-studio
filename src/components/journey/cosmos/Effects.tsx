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
import { stage } from './stage-state';

/**
 * Edge aberration borrowed by the DESCENT itself on the fast stretches of the
 * corridor and through THE DIVE: the standing whisper of channel separation,
 * opened up about fourfold and pushed further out toward the corners.
 *
 * Deliberately NOT the 12-tap radial smear the CONTRACTION uses. That is a
 * full-screen convolution, and spending it on ~40% of the chapter to buy an
 * effect nobody should be able to name is the wrong trade — the near-field
 * passes carry the speed, this only tells the edges of the lens about it.
 */
const RUSH_ABERRATION = 2.6;

const GRADE_FRAG = /* glsl */ `
  uniform vec2 uCenter;
  uniform float uWarp;
  uniform float uCool;
  uniform float uVig;
  uniform float uRush;

  void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    vec2 d = uv - uCenter;
    vec2 da = vec2(d.x * aspect, d.y);
    float r = length(da);
    float rn = clamp(r / 0.80, 0.0, 1.0);
    vec3 col;

    if (uWarp < 0.003) {
      // resting frame — the standing edge aberration, opened up on the fast
      // stretches of the descent (uRush) and nothing else. The radial gate
      // stays put: this brightens the CORNERS of the lens, it does not creep
      // inward across the artwork.
      vec2 shift = vec2(0.00045, 0.0003 * aspect) * uRush;
      float dm = max(distance(uv, vec2(0.5)) * 2.0 - 0.42, 0.0);
      col = vec3(
        texture2D(inputBuffer, uv + shift * dm).r,
        inputColor.g,
        texture2D(inputBuffer, uv - shift * dm).b
      );
    } else {
      // NOTE: uWarp is driven to 0 by Sigil.tsx — see the measurement written
      // up there. A multi-tap convolution cannot smear the hairline content of
      // the contraction without combing it, so the beat is carried by lit
      // geometry instead. The branch below is kept, tuned to values that do not
      // wreck the palette, in case a future pass finds content it suits.
      //
      // Radial velocity smear. Every tap steps FURTHER OUT along the radial
      // vector, which drags content toward the vanishing point: the frame
      // stretches along the vector of travel and squeezes across it.
      // REACH IS DELIBERATELY SHORT. At the old 0.22 the tangential+radial
      // travel was ~0.13 uv, so every hairline streak and every turn of the
      // spiral smeared into a ~110px desaturated band: 13.4% of the frame at
      // cp≈0.16 read as flat grey with the per-pixel tap jitter showing as
      // dither. Velocity you can name as "a filter" is too strong.
      float reach = uWarp * (0.016 + rn * 0.095);
      float squeeze = uWarp * 0.042 * rn;
      vec2 tang = vec2(-d.y, d.x);
      // Per-pixel tap offset: without it the discrete taps read as N ghosts
      // combed along the vector instead of as one smear. Hashing uv directly
      // gives a LOW-frequency, banded jitter (neighbouring pixels get nearly
      // the same value), so the comb survived and the spiral's hairlines came
      // out as ticked cables. Hash pixel coordinates, and take more taps, so
      // the ghost spacing falls under a pixel.
      float jit = fract(dot(gl_FragCoord.xy, vec2(0.7548776662, 0.5698402909)));
      vec3 acc = vec3(0.0);
      float wsum = 0.0;
      const int TAPS = 20;
      for (int i = 0; i < TAPS; i++) {
        float t = (float(i) + jit) / float(TAPS);
        vec2 suv = uCenter + d * (1.0 + reach * t) - tang * squeeze * t;
        // taps that fall outside the frame used to be clamped, which smeared
        // the border pixel into a comb of blocks down the left edge. Weight
        // them almost to nothing instead — the smear simply runs out at the
        // frame edge, the way a real one does.
        float inside =
          step(0.0, suv.x) * step(suv.x, 1.0) * step(0.0, suv.y) * step(suv.y, 1.0);
        float w = (1.0 - t * 0.80) * inside;
        vec2 sd = d * (uWarp * rn * 0.0034 * (0.3 + t));
        acc += vec3(
          texture2D(inputBuffer, clamp(suv + sd, 0.0, 1.0)).r,
          texture2D(inputBuffer, clamp(suv, 0.0, 1.0)).g,
          texture2D(inputBuffer, clamp(suv - sd, 0.0, 1.0)).b
        ) * w;
        wsum += w;
      }
      col = acc / max(wsum, 1e-4);

      // it bleeds out as it accelerates
      float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));
      // …and it bleeds, but it stays the site's palette while it does. A 0.76
      // desaturation cap turned the one crimson accent grey for a fifth of the
      // chapter; 0.34 keeps the red red and still reads as speed.
      col = mix(col, vec3(lum), clamp(uWarp * (0.16 + rn * 0.26), 0.0, 0.34));
      col *= 1.0 - uWarp * (0.05 + rn * 0.15);
      // the periphery falls away: the throat is the only thing in focus
      col *= 1.0 - uWarp * smoothstep(0.34, 1.0, r) * 0.26;
    }

    // Cooler ground as the warp accelerates — but the FLOOR stays void.
    // The old lift was +0.0021 linear on blue against +0.0003 on red, which
    // pushed the near-black to (9,10,18) sRGB: a blue-black, i.e. a second
    // colour in a site whose whole claim is one. The multiply now only cools
    // by a few percent and the floor that keeps us off pure black is #0e0c0a
    // itself, scaled down — warm dark, as the design system requires.
    if (uCool > 0.001) {
      vec3 cold = col * vec3(0.94, 0.99, 1.06) + vec3(0.00122, 0.00085, 0.00060);
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
        ['uRush', new THREE.Uniform(1)],
      ]),
    });
  }

  update(): void {
    const c = this.uniforms.get('uCenter');
    if (c) (c.value as THREE.Vector2).set(contraction.cx, contraction.cy);
    const w = this.uniforms.get('uWarp');
    if (w) w.value = contraction.warp;
    const rush = this.uniforms.get('uRush');
    if (rush) rush.value = 1 + stage.rush * (RUSH_ABERRATION - 1);
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
