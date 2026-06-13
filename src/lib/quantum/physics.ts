/**
 * Quantum Physics & Other Smart People Shit — the math.
 *
 * Pure, dependency-free functions for the interactive explorers on /quantum.
 * Everything here is deterministic and side-effect free so the React layer
 * can call it freely inside render / animation loops.
 *
 * Units: we work in "natural-ish" reduced units (ℏ = m = 1, box length = 1)
 * for the bound-state visuals, and in real SI only where a number wants to
 * feel real (constants.ts). The point is intuition, not lab precision.
 */

// ─── fundamental constants (SI) ──────────────────────────────────────────────

/** Reduced Planck constant, J·s. */
export const H_BAR = 1.054571817e-34;
/** Planck constant, J·s. */
export const PLANCK = 6.62607015e-34;
/** Speed of light in vacuum, m/s. */
export const C = 299792458;
/** Electron mass, kg. */
export const ELECTRON_MASS = 9.1093837015e-31;

// ─── double-slit interference ────────────────────────────────────────────────

export interface SlitParams {
  /** Slit separation (center-to-center), in microns. */
  separation: number;
  /** Width of each slit, in microns. */
  width: number;
  /** Wavelength of the "particle", in nanometers. */
  wavelength: number;
  /** Distance to the detection screen, in meters. */
  screenDistance: number;
}

/**
 * Relative intensity on the screen at transverse position `x` (meters) for a
 * two-slit pattern: the cos² interference fringes modulated by the single-slit
 * sinc² diffraction envelope.
 *
 *   I(θ) = I₀ · cos²(π d sinθ / λ) · sinc²(π a sinθ / λ)
 *
 * Small-angle: sinθ ≈ x / L. Returns a value in [0, 1].
 */
export function slitIntensity(x: number, p: SlitParams): number {
  const lambda = p.wavelength * 1e-9; // nm → m
  const d = p.separation * 1e-6; // µm → m
  const a = p.width * 1e-6; // µm → m
  const sinTheta = x / p.screenDistance;

  const interference = Math.cos((Math.PI * d * sinTheta) / lambda);
  const beta = (Math.PI * a * sinTheta) / lambda;
  const envelope = sinc(beta);

  return interference * interference * envelope * envelope;
}

/** Normalized sinc, sinc(0) = 1. (Note: argument is already in radians.) */
export function sinc(x: number): number {
  if (Math.abs(x) < 1e-9) return 1;
  return Math.sin(x) / x;
}

// ─── particle in an infinite square well ─────────────────────────────────────

/**
 * Normalized stationary state of a particle in a 1-D box of length L = 1:
 *
 *   ψₙ(x) = √2 · sin(n π x),   x ∈ [0, 1]
 *
 * `x` is the fractional position along the box (0..1), `n` the quantum number
 * (1, 2, 3, …). Returns the (real) amplitude ψ.
 */
export function boxWavefunction(x: number, n: number): number {
  return Math.SQRT2 * Math.sin(n * Math.PI * x);
}

/** Probability density |ψₙ(x)|² for the box state. */
export function boxProbability(x: number, n: number): number {
  const psi = boxWavefunction(x, n);
  return psi * psi;
}

/**
 * Energy of the n-th box level in units of the ground-state energy E₁.
 * Eₙ = n² E₁, since Eₙ = n²π²ℏ² / (2mL²).
 */
export function boxEnergyLevel(n: number): number {
  return n * n;
}

// ─── Heisenberg uncertainty (Gaussian wave packet) ───────────────────────────

/**
 * A minimum-uncertainty Gaussian packet saturates σx·σp = ℏ/2. Given a chosen
 * position spread `sigmaX` (in nm), return the conjugate momentum spread
 * (in kg·m/s) it forces. Squeeze position → momentum blows up, and vice versa.
 */
export function momentumSpread(sigmaXnm: number): number {
  const sigmaX = sigmaXnm * 1e-9; // nm → m
  return H_BAR / (2 * sigmaX);
}

/** Unnormalized Gaussian, peak 1 at x = mu. Used for drawing the packet. */
export function gaussian(x: number, mu: number, sigma: number): number {
  const z = (x - mu) / sigma;
  return Math.exp(-0.5 * z * z);
}

// ─── blackbody / Planck radiation ────────────────────────────────────────────

/**
 * Planck spectral radiance as a function of wavelength (m) and temperature (K).
 * The curve that broke classical physics and forced energy to come in lumps.
 * Returned in arbitrary (relative) units — we only ever plot its shape.
 */
export function planckRadiance(wavelengthM: number, temperatureK: number): number {
  const a = (2 * PLANCK * C * C) / Math.pow(wavelengthM, 5);
  const exponent = (PLANCK * C) / (wavelengthM * 1.380649e-23 * temperatureK);
  return a / (Math.exp(exponent) - 1);
}

/** Wien's law: wavelength (nm) of peak emission for a blackbody at T (K). */
export function wienPeakNm(temperatureK: number): number {
  return (2.897771955e-3 / temperatureK) * 1e9;
}
