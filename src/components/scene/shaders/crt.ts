// CRT TV shader — scan lines, chromatic aberration, vignette, screen curvature, flicker
export const crtVertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const crtFragmentShader = /* glsl */ `
  uniform sampler2D tDiffuse;
  uniform float uTime;
  uniform float uIntensity;    // 0-1, how strong the CRT effect is
  uniform float uProximity;    // 0-1, player distance (1 = very close)
  uniform vec3 uGlowColor;    // portal glow color

  varying vec2 vUv;

  // Screen curvature distortion
  vec2 curveUV(vec2 uv) {
    uv = uv * 2.0 - 1.0;
    float curvature = 0.15;
    uv *= 1.0 + dot(uv, uv) * curvature;
    uv = (uv + 1.0) * 0.5;
    return uv;
  }

  // Chromatic aberration
  vec3 chromatic(sampler2D tex, vec2 uv, float amount) {
    float r = texture2D(tex, uv + vec2(amount, 0.0)).r;
    float g = texture2D(tex, uv).g;
    float b = texture2D(tex, uv - vec2(amount, 0.0)).b;
    return vec3(r, g, b);
  }

  // Scan lines
  float scanLine(vec2 uv, float time) {
    float scanSpeed = 8.0;
    float scanWidth = 800.0;
    float scan = sin(uv.y * scanWidth + time * scanSpeed) * 0.04;
    // Thicker scan lines
    float scanThick = sin(uv.y * 200.0) * 0.02;
    return scan + scanThick;
  }

  // Vignette
  float vignette(vec2 uv) {
    uv = uv * 2.0 - 1.0;
    return 1.0 - dot(uv * 0.7, uv * 0.7);
  }

  // Static noise
  float noise(vec2 co, float time) {
    return fract(sin(dot(co.xy + time, vec2(12.9898, 78.233))) * 43758.5453);
  }

  // Rolling bar (like a detuned TV)
  float rollingBar(vec2 uv, float time) {
    float bar = smoothstep(0.0, 0.05, abs(mod(uv.y + time * 0.1, 1.0) - 0.5) - 0.2);
    return mix(0.85, 1.0, bar);
  }

  void main() {
    vec2 uv = curveUV(vUv);

    // Out of bounds = black (CRT bezel effect)
    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
      gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
      return;
    }

    // Chromatic aberration — increases with proximity
    float chromaAmount = 0.002 + uProximity * 0.006;
    vec3 color = chromatic(tDiffuse, uv, chromaAmount);

    // Scan lines
    float scan = scanLine(uv, uTime);
    color += scan * uIntensity;

    // Rolling bar effect (subtle)
    color *= rollingBar(uv, uTime);

    // Static noise — decreases as you get closer (signal clearing up)
    float n = noise(uv * 400.0, uTime) * 0.08 * (1.0 - uProximity * 0.7);
    color += n;

    // Vignette
    float vig = vignette(uv);
    color *= mix(1.0, vig, 0.6);

    // Portal glow — intensifies with proximity
    float glowStrength = uProximity * 0.4;
    float glowMask = 1.0 - length(vUv - 0.5) * 1.5;
    glowMask = max(0.0, glowMask);
    color += uGlowColor * glowMask * glowStrength;

    // Flicker
    float flicker = 1.0 - sin(uTime * 60.0) * 0.01;
    color *= flicker;

    // Phosphor glow (slight bloom on bright areas)
    float brightness = dot(color, vec3(0.299, 0.587, 0.114));
    color += color * brightness * 0.15;

    // RGB sub-pixel pattern (visible up close)
    float subPixel = mod(gl_FragCoord.x, 3.0);
    vec3 mask = vec3(
      subPixel < 1.0 ? 1.0 : 0.7,
      subPixel >= 1.0 && subPixel < 2.0 ? 1.0 : 0.7,
      subPixel >= 2.0 ? 1.0 : 0.7
    );
    color *= mix(vec3(1.0), mask, uProximity * 0.3);

    gl_FragColor = vec4(color, 1.0);
  }
`;
