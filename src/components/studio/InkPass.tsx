'use client';

// THE INK PASS — the stylised half of the direction test.
//
// The argument this exists to settle: the room has been chasing photoreal by
// inheritance rather than by choice. The tools output PBR because image-to-3D
// bakes output PBR, the renderer is a physical camera stack because that is
// the default, and neither decision was ever made. Meanwhile the reference —
// Daniel Martin Diaz — is an ink illustrator: hard black line, flat symbolic
// colour, ornament everywhere, no photograph anywhere.
//
// That difference is not a matter of taste, it is a matter of CEILING.
// Photoreal is graded against a photograph, so every shortfall in a
// reconstructed mesh reads as failure: the missing chamfers, the single fused
// material per prop, the texel density. Ink has no photograph to fall short
// of. And the four places the reconstruction ceiling actually binds — hard
// edges, sub-part materials, texel density, sub-part animation — are precisely
// the four things an ink render throws away. It keeps silhouette, and
// silhouette is the one thing these meshes get RIGHT.
//
// So this is deliberately not an AI restyle of a screenshot. It runs on the
// real geometry, at real frame rates, in the real engine. If it looks good
// here it is buildable; a doctored still would prove nothing.
//
// Five things make a drawing rather than a filter:
//
//   1. LINE FROM DEPTH, not from luminance. Sobelling the colour buffer traces
//      texture — every speck in the stone becomes a squiggle and the result is
//      sandpaper. Sobelling linearised depth traces FORM: silhouettes, the
//      edge where the console meets the wall behind it, the lip of the bench.
//      That is what a person drawing this room would put down first.
//   2. A SECOND, FINER LINE from luminance, weighted much lower, to catch the
//      creases and panel breaks that sit at the same depth.
//   3. POSTERISATION. Continuous shading is the thing that reads as render.
//      Four bands is a decision about where light stops, which is what an
//      illustrator makes and a camera does not.
//   4. HATCHING in the darkest band only — screen-space diagonals, so shadow
//      is DRAWN rather than absent. Absence of light is a photograph's answer;
//      a drawing has to put something on the paper.
//   5. HUE HELD, saturation crushed. The room's identity is its practicals —
//      red neon, green monitors, amber candle. Flattening to a duotone would
//      throw that away, so the pass keeps each pixel's hue and collapses its
//      saturation and value onto the bands.

import { forwardRef, useMemo, useLayoutEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { Effect, EffectAttribute, BlendFunction } from 'postprocessing';
import { Uniform, Vector3 } from 'three';

const fragment = /* glsl */ `
uniform float uStrength;
uniform float uEdgeDepth;
uniform float uEdgeLum;
uniform float uBands;
uniform float uHatch;
uniform float uSat;
uniform float uLift;
uniform float uInvert;
uniform float uChroma;
uniform float uGlow;
uniform float uDense;
uniform vec3  uInk;
uniform vec3  uGround;
uniform vec3  uShadow;
uniform vec2  uCam;      // x = near, y = far

// Non-linear depth crowds all its precision against the near plane, so a flat
// threshold on raw depth draws a heavy outline around anything close and
// nothing at all across the room. Linearise before differencing.
float lin(float d) {
  return (2.0 * uCam.x) / (uCam.y + uCam.x - d * (uCam.y - uCam.x));
}

float luma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }

vec3 rgb2hsv(vec3 c) {
  vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
  vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
  vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
  float d = q.x - min(q.w, q.y);
  return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + 1e-10)), d / (q.x + 1e-10), q.x);
}
vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void mainImage(const in vec4 inputColor, const in vec2 uv, const in float depth, out vec4 outputColor) {
  // Gated by a uniform rather than by adding and removing the effect, so that
  // both looks render through an IDENTICAL pass chain. Swapping a composer
  // child rebuilds every EffectPass and recompiles shaders, and a comparison
  // where the two sides differ by a pipeline as well as by a look is not a
  // comparison. Uniform branching is coherent across the whole draw, so the
  // disabled cost is a compare and a return.
  if (uStrength < 0.001) { outputColor = inputColor; return; }

  vec2 t = texelSize;

  // — LINE 1: form. Sobel over linearised depth.
  float d00 = lin(readDepth(uv + t * vec2(-1.0, -1.0)));
  float d10 = lin(readDepth(uv + t * vec2( 0.0, -1.0)));
  float d20 = lin(readDepth(uv + t * vec2( 1.0, -1.0)));
  float d01 = lin(readDepth(uv + t * vec2(-1.0,  0.0)));
  float d21 = lin(readDepth(uv + t * vec2( 1.0,  0.0)));
  float d02 = lin(readDepth(uv + t * vec2(-1.0,  1.0)));
  float d12 = lin(readDepth(uv + t * vec2( 0.0,  1.0)));
  float d22 = lin(readDepth(uv + t * vec2( 1.0,  1.0)));
  float gx = (d20 + 2.0 * d21 + d22) - (d00 + 2.0 * d01 + d02);
  float gy = (d02 + 2.0 * d12 + d22) - (d00 + 2.0 * d10 + d20);
  // Scaled by the pixel's own depth: without this the line thins to nothing
  // across the room, because the same physical step is a smaller depth
  // difference the further away it is. An illustrator's line does not get
  // fainter with distance.
  float dEdge = sqrt(gx * gx + gy * gy) / max(lin(depth), 0.004);

  // — LINE 2: detail. Sobel over luminance, for creases at equal depth.
  float l00 = luma(texture2D(inputBuffer, uv + t * vec2(-1.0, -1.0)).rgb);
  float l10 = luma(texture2D(inputBuffer, uv + t * vec2( 0.0, -1.0)).rgb);
  float l20 = luma(texture2D(inputBuffer, uv + t * vec2( 1.0, -1.0)).rgb);
  float l01 = luma(texture2D(inputBuffer, uv + t * vec2(-1.0,  0.0)).rgb);
  float l21 = luma(texture2D(inputBuffer, uv + t * vec2( 1.0,  0.0)).rgb);
  float l02 = luma(texture2D(inputBuffer, uv + t * vec2(-1.0,  1.0)).rgb);
  float l12 = luma(texture2D(inputBuffer, uv + t * vec2( 0.0,  1.0)).rgb);
  float l22 = luma(texture2D(inputBuffer, uv + t * vec2( 1.0,  1.0)).rgb);
  float lx = (l20 + 2.0 * l21 + l22) - (l00 + 2.0 * l01 + l02);
  float ly = (l02 + 2.0 * l12 + l22) - (l00 + 2.0 * l10 + l20);
  float lEdge = sqrt(lx * lx + ly * ly);

  float edge = clamp(dEdge * uEdgeDepth + lEdge * uEdgeLum, 0.0, 1.0);
  // Tight, because a drawn line is a decision, not a gradient. A wide
  // smoothstep here gives soft grey haloes and the whole frame reads as a
  // photocopy rather than as pen.
  edge = smoothstep(0.12, 0.30, edge);

  // — FLAT COLOUR. Hue survives, saturation and value get quantised.
  vec3 hsv = rgb2hsv(inputColor.rgb);

  // LIFT BEFORE BANDING. Posterising a dark room straight gives a DARKER room
  // with fewer steps in it, which is what the first attempt was; a gamma pull
  // first decides how much of the frame is ground and how much is mark.
  //
  // uLift is the whole difference between the two candidate looks. Near 0.45
  // almost everything climbs to the top bands and you get ink on paper — most
  // of the frame light, a few dark marks. At 1.0 nothing moves and the room
  // keeps its own darkness, so the marks have to be BRIGHT instead: chalk on
  // slate, which is what is already on his walls.
  float v = pow(clamp(hsv.z, 0.0, 1.0), uLift);
  float band = floor(v * uBands + 0.5) / uBands;
  band = clamp(band, 0.06, 1.0);
  // MARK DENSITY, not a wash. The first two attempts mixed a ground colour
  // OVER the shaded render, which is a filter and looked like one: everything
  // got the same veil and the whole frame drained to one grey. Ink does not
  // work that way. A drawing starts as bare ground and marks are ADDED to it,
  // so what the shading actually decides is how much mark each pixel gets.
  //
  // uInvert is which end of the value scale carries the marks. On paper the
  // dark parts are where the pen went, so density is 1 - band. On slate it is
  // the lit parts that carry chalk, so density is band. Same drawing, opposite
  // hands.
  float density = clamp(mix(1.0 - band, band, uInvert), 0.0, 1.0);
  // CURVED, and this is what separates a drawing from a wash. Linear density
  // gives every mid-tone in the room roughly half a mark, so the whole frame
  // comes back the average of ground and ink — which is exactly the mud the
  // untuned version produced. Real drawings are mostly bare ground with marks
  // concentrated where they mean something, so the curve pushes the middle
  // down and leaves the extremes alone.
  density = pow(density, uDense);

  // The scene's own hue at full value — the room's identity lives here, and
  // it is the thing every previous attempt threw away. Held separately from
  // value so it can be put back as flat colour rather than as shading.
  vec3 tint = hsv2rgb(vec3(hsv.x, min(hsv.y * uSat, 0.9), 1.0));

  vec3 mark = mix(uInk, tint * 0.85 + uInk * 0.3, uChroma);
  vec3 flat_ = mix(uGround, mark, density);

  // The practicals come back as flat colour, not as light: a pixel that is
  // both saturated AND bright is a lamp, and an illustrator draws a lamp as a
  // shape of pure colour. This is what keeps the red neon red and the monitor
  // banks green instead of collapsing them into the ground.
  flat_ = mix(flat_, tint, clamp(hsv.y * band * uGlow, 0.0, 1.0));

  // — HATCHING. Screen-space diagonals at two angles, the second only in the
  // very darkest band, so shadow deepens by crosshatch the way it does with a
  // pen rather than by sliding toward black.
  float sx = uv.x / texelSize.x;
  float sy = uv.y / texelSize.y;
  float h1 = step(0.62, fract((sx + sy) * 0.085));
  float h2 = step(0.62, fract((sx - sy) * 0.085));
  // Confined to the bottom bands. The first pass ran these thresholds up at
  // 0.34, and most of this room sits below that, so the crosshatch covered the
  // entire frame and everything went to mud. Hatching is what you do to the
  // shadows, not to the picture.
  float dark1 = 1.0 - smoothstep(0.05, 0.17, band);
  float dark2 = 1.0 - smoothstep(0.01, 0.08, band);
  float hatch = max(dark1 * h1, dark2 * h2) * uHatch;

  // Tooth: paper is not flat, and a little per-pixel break stops the flat
  // bands from banding visibly where they meet.
  float grain = (hash(floor(vec2(sx, sy) * 0.7)) - 0.5) * 0.06;

  // Hatch darkens toward uShadow, NOT toward the mark colour. On paper those
  // are the same thing and the distinction is invisible; on slate the mark is
  // bone, and hatching with it drew a bright mesh across every shadow in the
  // room — the exact opposite of shading.
  vec3 col = mix(flat_ + grain, uShadow, hatch);
  col = mix(col, uInk, edge);

  outputColor = vec4(mix(inputColor.rgb, col, uStrength), inputColor.a);
}
`;

/** The two candidate stylised looks, as complete parameter sets.
 *
 *  `paper` is the obvious reading of the reference: dark line on bone ground,
 *  the way the drawings themselves are made.
 *
 *  `chalk` is the one that suits THIS room, and it took a bad render to see
 *  it. Lifting a practical-lit room onto white paper throws away every
 *  saturated light in it — the red neon, the green banks, the candle — and
 *  those lights ARE the room's identity; the paper version came back a
 *  uniform faded grey with no 137 in it anywhere. Leaving the darkness alone
 *  and drawing in bone keeps all of that and lands on the thing already on
 *  his walls: chalk on slate. Same pass, four different numbers.
 */
export const LOOKS = {
  paper: {
    lift: 0.55, invert: 0, hatch: 0.5, sat: 1.35, edgeLum: 0.32,
    chroma: 0.6, glow: 0.5, dense: 1.9,
    ink: [0.08, 0.055, 0.06], ground: [0.91, 0.865, 0.77], shadow: [0.08, 0.055, 0.06],
  },
  chalk: {
    lift: 1.0, invert: 1, hatch: 0.5, sat: 1.55, edgeLum: 0.28,
    chroma: 0.5, glow: 0.85, dense: 2.6,
    ink: [0.94, 0.91, 0.83], ground: [0.075, 0.05, 0.058], shadow: [0.04, 0.028, 0.032],
  },
} as const;
export type LookName = keyof typeof LOOKS;

class InkEffect extends Effect {
  constructor() {
    super('InkEffect', fragment, {
      // DEPTH gets us readDepth() and the depth argument. This pass is the
      // reason the composer's normal/depth work is worth keeping around.
      attributes: EffectAttribute.DEPTH,
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, Uniform<number | Vector3 | [number, number]>>([
        ['uStrength', new Uniform(0)],
        ['uEdgeDepth', new Uniform(1.1)],
        ['uEdgeLum', new Uniform(0.35)],
        ['uBands', new Uniform(4.0)],
        ['uHatch', new Uniform(0.55)],
        ['uSat', new Uniform(1.25)],
        ['uLift', new Uniform(0.6)],
        ['uInvert', new Uniform(0)],
        ['uChroma', new Uniform(0.55)],
        ['uGlow', new Uniform(0.6)],
        ['uDense', new Uniform(1.8)],
        ['uInk', new Uniform(new Vector3(0.05, 0.035, 0.045))],
        ['uGround', new Uniform(new Vector3(0.90, 0.855, 0.76))],
        ['uShadow', new Uniform(new Vector3(0.05, 0.035, 0.045))],
        ['uCam', new Uniform([0.1, 100] as unknown as number)],
      ]),
    });
  }
}

/** The ink look, as a composer effect. Camera planes are pushed in from the
 *  live camera rather than hard-coded, because the depth linearisation is only
 *  correct against the planes the depth buffer was actually written with —
 *  guess them and the line weight drifts as the rig moves. */
export const Ink = forwardRef<InkEffect, { strength: number; look: LookName }>(
  function Ink({ strength, look }, ref) {
  const camera = useThree((s) => s.camera);
  const effect = useMemo(() => new InkEffect(), []);
  useLayoutEffect(() => {
    const p = LOOKS[look];
    const set = (n: string, v: number) => {
      const u = effect.uniforms.get(n);
      if (u) u.value = v;
    };
    const setV = (n: string, v: readonly [number, number, number]) => {
      const u = effect.uniforms.get(n);
      if (u) (u.value as Vector3).set(v[0], v[1], v[2]);
    };
    set('uStrength', strength);
    set('uLift', p.lift);
    set('uInvert', p.invert);
    set('uChroma', p.chroma);
    set('uGlow', p.glow);
    set('uDense', p.dense);
    set('uHatch', p.hatch);
    set('uSat', p.sat);
    set('uEdgeLum', p.edgeLum);
    setV('uInk', p.ink);
    setV('uGround', p.ground);
    setV('uShadow', p.shadow);
  }, [effect, strength, look]);
  useLayoutEffect(() => {
    const u = effect.uniforms.get('uCam');
    // Orthographic cameras have no near/far in this sense; the rig is
    // perspective and always has been, so read it off directly.
    if (u && 'near' in camera && 'far' in camera) {
      u.value = [camera.near, camera.far];
    }
  }, [effect, camera]);
  return <primitive ref={ref} object={effect} dispose={null} />;
});
