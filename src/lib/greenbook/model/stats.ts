/**
 * Statistics primitives. No dependency — golf math is small enough to own.
 *
 * The closed-form pairwise engine needs the standard-normal CDF Φ; the Monte
 * Carlo engine needs to sample from a (skew-able) per-player distribution.
 * Both live here so the modelling files stay about modelling.
 */

/**
 * Standard-normal CDF Φ(z), via the Abramowitz & Stegun 7.1.26 erf
 * approximation. Max abs error ~1.5e-7 — far tighter than any golf signal,
 * and deterministic (good for the dashboard's live headline number).
 */
export function normalCdf(z: number): number {
  return 0.5 * (1 + erf(z / Math.SQRT2));
}

/** Error function, A&S 7.1.26. */
export function erf(x: number): number {
  const sign = Math.sign(x);
  const ax = Math.abs(x);

  const t = 1 / (1 + 0.3275911 * ax);
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) *
      t +
      0.254829592) *
      t *
      Math.exp(-ax * ax);

  return sign * y;
}

/**
 * A small, fast PRNG (mulberry32) so simulations are *seedable* and therefore
 * reproducible — a sim you can't reproduce can't be debugged or shown its
 * work. Returns a function yielding uniforms in [0, 1).
 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** One standard-normal draw via Box–Muller, using the supplied uniform RNG. */
export function sampleNormal(rng: () => number): number {
  // Guard against log(0).
  const u1 = Math.max(rng(), Number.EPSILON);
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

/**
 * E[√(1+Z²)] for Z ~ N(0,1). The one transcendental constant the skew
 * standardization needs; computed offline by numerical integration to 1e-12
 * and pinned here so sampling stays a closed-form pure function.
 */
const E_SQRT_1_PLUS_Z2 = 1.3545307997910606;

/**
 * One draw from a right-skewed score distribution.
 *
 * Real golf scoring is right-skewed: the blow-up hole, the double, the round
 * that detonates. A symmetric normal understates how often a player posts a
 * score well *above* (worse than) their mean. We apply a sinh-arcsinh skew to
 * a standard normal, then standardize and rescale to (m, sigma). `skew > 0`
 * lengthens the upper (worse-score) tail — the correct direction for strokes.
 *
 * The transform `Y = sinh(skew + asinh(Z))` expands to the closed form
 *   Y = Z·cosh(skew) + √(1+Z²)·sinh(skew)
 * whose moments are exact:
 *   E[Y]   = sinh(skew) · E[√(1+Z²)]
 *   E[Y²]  = cosh²(skew) + 2·sinh²(skew)
 * Standardizing by these keeps `m` and `sigma` the realized mean and standard
 * deviation regardless of skew — the skew only reshapes the tails, it never
 * quietly moves the average or inflates the spread.
 */
export function sampleSkewScore(
  m: number,
  sigma: number,
  skew: number,
  rng: () => number,
): number {
  const z = sampleNormal(rng);
  if (skew === 0) return m + sigma * z;

  const sh = Math.sinh(skew);
  const ch = Math.cosh(skew);
  const y = z * ch + Math.sqrt(1 + z * z) * sh;

  const mean = sh * E_SQRT_1_PLUS_Z2;
  const variance = ch * ch + 2 * sh * sh - mean * mean;
  const sd = Math.sqrt(Math.max(variance, Number.EPSILON));

  return m + sigma * ((y - mean) / sd);
}
