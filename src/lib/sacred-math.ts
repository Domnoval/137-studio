// Sacred Math Constants - The invisible architecture governing everything
// φ (phi) is the golden ratio: 1.6180339887...

export const PHI = 1.6180339887;          // Golden ratio
export const PHI_INV = 0.6180339887;      // 1/phi (phi - 1)
export const GOLDEN_ANGLE = 137.5077;     // degrees (360° / φ²)
export const SQRT_PHI = 1.2720196495;     // √φ
export const PI_PHI = Math.PI * PHI;      // ~5.083

// Timing Constants (seconds) — phi-scaled durations
export const T1 = 0.382;   // PHI_INV² 
export const T2 = 0.618;   // PHI_INV
export const T3 = 1.0;     // unity
export const T4 = 1.618;   // PHI
export const T5 = 2.618;   // PHI²

// Spacing Scale (px base 8, phi progression)
export const S1 = 8;       // base unit
export const S2 = 13;      // ~8 * PHI_INV
export const S3 = 21;      // ~13 * PHI_INV  
export const S4 = 34;      // ~21 * PHI_INV
export const S5 = 55;      // ~34 * PHI_INV
export const S6 = 89;      // ~55 * PHI_INV
export const S7 = 144;     // ~89 * PHI_INV

// Font Scale (rem, phi-based)
export const FONT_XS = '0.764rem';     // 1/φ²
export const FONT_SM = '0.854rem';     // 1/φ√φ
export const FONT_BASE = '1rem';       // unity
export const FONT_MD = '1.236rem';     // √φ
export const FONT_LG = '1.618rem';     // φ
export const FONT_XL = '2.618rem';     // φ²
export const FONT_2XL = '4.236rem';    // φ³
export const FONT_HERO = '6.854rem';   // φ⁴

// Sacred Geometry Position Calculations

/**
 * Calculate position along golden spiral
 * Each item appears at golden angle rotation from the last
 */
export function goldenSpiralPosition(
  index: number, 
  scrollProgress: number,
  centerX: number = 0,
  centerY: number = 0,
  baseRadius: number = 120
) {
  const angle = index * GOLDEN_ANGLE * (Math.PI / 180);
  const radius = Math.sqrt(index + 1) * baseRadius * scrollProgress;
  
  return {
    x: centerX + Math.cos(angle) * radius,
    y: centerY + Math.sin(angle) * radius,
    scale: PHI_INV + (Math.sin(angle * PHI) * (1 - PHI_INV)),
    opacity: Math.max(0, Math.min(1, scrollProgress * PHI)),
    rotation: angle * (180 / Math.PI)
  };
}

/**
 * Calculate fibonacci sequence spacing
 * For staggered reveals and proportions
 */
export function fibonacciSpacing(n: number): number {
  if (n <= 1) return n;
  let a = 0, b = 1;
  for (let i = 2; i <= n; i++) {
    [a, b] = [b, a + b];
  }
  return b;
}

/**
 * Calculate phi-based easing curve
 * More organic than cubic-bezier
 */
export function phiEasing(t: number): number {
  return t < 0.5 
    ? Math.pow(2 * t, PHI) / 2
    : 1 - Math.pow(2 * (1 - t), PHI) / 2;
}

/**
 * Convert scroll progress to sacred timing
 * Maps linear scroll to phi-based reveal timing
 */
export function sacredTiming(progress: number, section: number): number {
  const sectionStart = section * PHI_INV;
  const sectionProgress = Math.max(0, Math.min(1, (progress - sectionStart) / PHI_INV));
  return phiEasing(sectionProgress);
}

/**
 * Flower of Life grid positions
 * For background pattern alignment
 */
export function flowerOfLifePoints(radius: number, rings: number = 3) {
  const points: { x: number; y: number }[] = [{ x: 0, y: 0 }];
  
  for (let ring = 1; ring <= rings; ring++) {
    const pointsInRing = ring * 6;
    for (let i = 0; i < pointsInRing; i++) {
      const angle = (i / pointsInRing) * 2 * Math.PI;
      points.push({
        x: Math.cos(angle) * radius * ring,
        y: Math.sin(angle) * radius * ring
      });
    }
  }
  
  return points;
}