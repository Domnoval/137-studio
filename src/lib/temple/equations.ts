/**
 * The chalk on the wall.
 *
 * Equations and fragments that get placed at golden-angle nodes on /137.
 * Every entry is text-as-data; rendering decides size, opacity, and rotation.
 *
 * Curated, not generated — the choice of equations is part of the work.
 * Heavy lean on the fine structure constant (α ≈ 1/137.035999...) and on
 * identities that connect the named obsessions: light, geometry, recursion.
 */

export type Weight = 'whisper' | 'chalk' | 'glow';
export type Size = 'sm' | 'md' | 'lg' | 'xl';

export interface Equation {
  /** Plain text. Use unicode for symbols — no LaTeX, no SVG, no MathML. */
  text: string;
  /** Optional shorter glyph form for tight nodes. */
  glyph?: string;
  /** Visual weight class — controls opacity. */
  weight: Weight;
  /** Visual size class — controls font-size. */
  size: Size;
  /** Optional caption that appears on hover for the loud ones. */
  caption?: string;
}

// The hero anchors. These get the loudest weight and the largest size.
// They're the equations that would be tattooed if equations were tattooed.
const ANCHORS: Equation[] = [
  {
    text: 'α = 1/137.035999084',
    glyph: 'α',
    weight: 'glow',
    size: 'xl',
    caption: 'the fine structure constant',
  },
  {
    text: 'e^(iπ) + 1 = 0',
    glyph: 'e^(iπ)+1=0',
    weight: 'glow',
    size: 'xl',
    caption: "Euler's identity",
  },
  {
    text: 'φ = (1 + √5) / 2',
    glyph: 'φ',
    weight: 'glow',
    size: 'lg',
    caption: 'the golden ratio',
  },
  {
    text: '137.50776° = π · (3 − √5)',
    glyph: '137.508°',
    weight: 'glow',
    size: 'lg',
    caption: 'the golden angle',
  },
  {
    text: 'iℏ ∂Ψ/∂t = ĤΨ',
    weight: 'glow',
    size: 'lg',
    caption: "Schrödinger",
  },
];

// The chalk layer — real equations, written in the texture but not shouting.
const CHALK: Equation[] = [
  { text: 'α = e² / (4πε₀ℏc)', weight: 'chalk', size: 'md' },
  { text: '∇·E = ρ/ε₀', weight: 'chalk', size: 'md' },
  { text: '∇·B = 0', weight: 'chalk', size: 'sm' },
  { text: '∇×E = −∂B/∂t', weight: 'chalk', size: 'md' },
  { text: '∇×B − μ₀ε₀ ∂E/∂t = μ₀J', weight: 'chalk', size: 'md' },
  { text: 'Gμν = (8πG/c⁴) Tμν', weight: 'chalk', size: 'md' },
  { text: 'E² = (mc²)² + (pc)²', weight: 'chalk', size: 'md' },
  { text: 'E = mc²', weight: 'chalk', size: 'md' },
  { text: 'Δx · Δp ≥ ℏ/2', weight: 'chalk', size: 'md' },
  { text: 'λ = h/p', weight: 'chalk', size: 'sm' },
  { text: 'ψ(t) = ψ(0) e^(−iEt/ℏ)', weight: 'chalk', size: 'md' },
  { text: 'ds² = −c²dt² + dx² + dy² + dz²', weight: 'chalk', size: 'md' },
  { text: 'F(n) = F(n−1) + F(n−2)', weight: 'chalk', size: 'sm' },
  { text: 'lim F(n+1)/F(n) = φ', weight: 'chalk', size: 'sm' },
  { text: '1/φ = φ − 1', weight: 'chalk', size: 'sm' },
  { text: 'φ² = φ + 1', weight: 'chalk', size: 'sm' },
  { text: 'sin²θ + cos²θ = 1', weight: 'chalk', size: 'sm' },
  { text: 'ζ(2) = π²/6', weight: 'chalk', size: 'sm' },
  { text: '∫₋∞^∞ e^(−x²) dx = √π', weight: 'chalk', size: 'md' },
  { text: 'S = k_B log W', weight: 'chalk', size: 'sm' },
  { text: 'E_n = −13.6/n² eV', weight: 'chalk', size: 'sm' },
  { text: 'PV = nRT', weight: 'chalk', size: 'sm' },
  { text: '[x, p] = iℏ', weight: 'chalk', size: 'sm' },
  { text: '∮ B·dl = μ₀ I', weight: 'chalk', size: 'sm' },
  { text: '∇²φ = −ρ/ε₀', weight: 'chalk', size: 'sm' },
  { text: 'F = G m₁m₂ / r²', weight: 'chalk', size: 'sm' },
  { text: 'F = ma', weight: 'chalk', size: 'sm' },
  { text: 'p = mv', weight: 'chalk', size: 'sm' },
  { text: '∇·j + ∂ρ/∂t = 0', weight: 'chalk', size: 'sm' },
  { text: '□A^μ = μ₀ J^μ', weight: 'chalk', size: 'sm' },
];

// The whisper layer — constants, fragments, koans. Almost-invisible. The
// stuff you only see if you put your face right up to the chalkboard.
const WHISPERS: Equation[] = [
  { text: 'ℏ = 1.054571817 × 10⁻³⁴ J·s', weight: 'whisper', size: 'sm' },
  { text: 'k_B = 1.380649 × 10⁻²³ J/K', weight: 'whisper', size: 'sm' },
  { text: 'c = 299 792 458 m/s', weight: 'whisper', size: 'sm' },
  { text: 'G = 6.674 × 10⁻¹¹', weight: 'whisper', size: 'sm' },
  { text: 'e = 1.602 176 634 × 10⁻¹⁹ C', weight: 'whisper', size: 'sm' },
  { text: 'π ≈ 3.14159 26535 89793', weight: 'whisper', size: 'sm' },
  { text: 'e ≈ 2.71828 18284 59045', weight: 'whisper', size: 'sm' },
  { text: 'φ ≈ 1.61803 39887 49894', weight: 'whisper', size: 'sm' },
  { text: '1/137.035999084', weight: 'whisper', size: 'sm' },
  { text: '0.0072973525693', weight: 'whisper', size: 'sm' },
  { text: '∞', weight: 'whisper', size: 'lg' },
  { text: '∂', weight: 'whisper', size: 'lg' },
  { text: '∮', weight: 'whisper', size: 'lg' },
  { text: '∇', weight: 'whisper', size: 'lg' },
  { text: 'Σ', weight: 'whisper', size: 'lg' },
  { text: 'Π', weight: 'whisper', size: 'lg' },
  { text: '∫', weight: 'whisper', size: 'lg' },
  { text: 'ℏ', weight: 'whisper', size: 'lg' },
  { text: 'α', weight: 'whisper', size: 'lg' },
  { text: 'ψ', weight: 'whisper', size: 'lg' },
];

// Koans — not real math, real Michael. Hand-derived chalk. The point of
// putting these *on* the wall with the equations is to claim that
// philosophy and physics are written in the same chalk.
const KOANS: Equation[] = [
  { text: 'perception ÷ choice = experience', weight: 'chalk', size: 'sm' },
  { text: 'love mod ∞ = love', weight: 'chalk', size: 'sm' },
  { text: 'the chalk is the math', weight: 'whisper', size: 'sm' },
  { text: 'α = the ratio of the volt to the universe', weight: 'whisper', size: 'sm' },
  { text: 'experience is the point', weight: 'whisper', size: 'sm' },
  { text: 'the studio is a constant', weight: 'whisper', size: 'sm' },
];

/** All equations in placement order. Anchors first so they get center nodes. */
export const EQUATIONS: Equation[] = [
  ...ANCHORS,
  ...CHALK,
  ...KOANS,
  ...WHISPERS,
];

/** How loud each weight class renders (0..1). */
export const WEIGHT_OPACITY: Record<Weight, number> = {
  whisper: 0.18,
  chalk: 0.42,
  glow: 0.85,
};

/** Font size per size class, in vmin so the wall scales with viewport. */
export const SIZE_VMIN: Record<Size, number> = {
  sm: 1.1,
  md: 1.6,
  lg: 2.4,
  xl: 4.5,
};
