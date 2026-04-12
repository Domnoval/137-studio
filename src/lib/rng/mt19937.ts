/**
 * MT19937 — the Mersenne Twister used by Python's `random` module,
 * NumPy's legacy RandomState, PHP's mt_rand, and many others.
 *
 * This is a readable, instrumented implementation meant for teaching.
 * It is NOT intended to be cryptographically secure.
 *
 * Internal state:
 *   - 624 uint32 words   (mt[0..623])
 *   - 1   index position (0..624)
 *
 * Once the index reaches 624, the "twist" operation regenerates all
 * 624 words at once from themselves. Each output is produced by reading
 * mt[index], running it through the "temper" function, and incrementing
 * the index.
 *
 * Small seeds feel random because the seeding routine *expands* the
 * seed into all 624 words using a deterministic mixing function.
 */

// MT19937 parameters (Matsumoto & Nishimura, 1998)
export const N = 624;          // state size
export const M = 397;          // middle word offset
export const MATRIX_A = 0x9908b0df;
export const UPPER_MASK = 0x80000000; // most significant bit
export const LOWER_MASK = 0x7fffffff; // least significant 31 bits

// We store state as a plain number[] of uint32 values. All arithmetic
// uses `| 0` or `>>> 0` to stay inside 32 bits (JS numbers are 64-bit floats).

export type MTState = {
  mt: number[]; // length N
  index: number; // 0..N
};

/** Create a fresh state seeded with a 32-bit integer. */
export function seedMT(seed: number): MTState {
  const mt = new Array<number>(N);
  mt[0] = seed >>> 0;
  for (let i = 1; i < N; i++) {
    // Knuth's LCG-style expansion from reference implementation:
    //   mt[i] = 1812433253 * (mt[i-1] ^ (mt[i-1] >> 30)) + i
    const prev = mt[i - 1] >>> 0;
    const x = (prev ^ (prev >>> 30)) >>> 0;
    // Multiply with 32-bit wraparound. We split the multiplier to avoid
    // float precision loss: 1812433253 = 0x6c078965.
    mt[i] = (imul32(1812433253, x) + i) >>> 0;
  }
  return { mt, index: N }; // index=N forces a twist on first extract
}

/** 32-bit integer multiplication (Math.imul, with an explicit shim). */
function imul32(a: number, b: number): number {
  // Math.imul is defined in all modern JS engines. Using it directly
  // is both faster and correct for 32-bit wraparound.
  return Math.imul(a, b) >>> 0;
}

/**
 * The "twist": regenerate all 624 words from themselves.
 * This is where the magic of MT19937 lives — each new word is a
 * recombination of the current word, the next word, and the word
 * M=397 positions ahead, with a special feedback matrix applied.
 */
export function twist(state: MTState): void {
  const { mt } = state;
  for (let i = 0; i < N; i++) {
    const y = ((mt[i] & UPPER_MASK) | (mt[(i + 1) % N] & LOWER_MASK)) >>> 0;
    let next = (mt[(i + M) % N] ^ (y >>> 1)) >>> 0;
    if (y & 1) next = (next ^ MATRIX_A) >>> 0;
    mt[i] = next;
  }
  state.index = 0;
}

/**
 * The "temper": scramble a raw state word into the output word.
 * Without tempering, raw Mersenne Twister output has poor distribution
 * in the high bits. This sequence of xor-shifts + masks fixes it.
 */
export function temper(y: number): number {
  y = (y ^ (y >>> 11)) >>> 0;
  y = (y ^ ((y << 7) & 0x9d2c5680)) >>> 0;
  y = (y ^ ((y << 15) & 0xefc60000)) >>> 0;
  y = (y ^ (y >>> 18)) >>> 0;
  return y;
}

/** Extract one 32-bit output from the generator, advancing the state. */
export function extractU32(state: MTState): number {
  if (state.index >= N) twist(state);
  const raw = state.mt[state.index];
  state.index += 1;
  return temper(raw);
}

/** Convenience: a float in [0, 1), same formula Python uses. */
export function randomFloat(state: MTState): number {
  // Python combines two outputs to fill 53 bits of mantissa.
  const a = extractU32(state) >>> 5; // 27 high bits
  const b = extractU32(state) >>> 6; // 26 high bits
  return (a * 67108864 + b) / 9007199254740992; // 2^53
}

/** Convenience: integer in [0, maxInclusive]. Simple (biased) form. */
export function randomInt(state: MTState, maxInclusive: number): number {
  // Note: this is the simple biased version. Python's randint uses
  // rejection sampling to avoid bias — shown here in its simplest form
  // for clarity since the point is to visualize state, not fairness.
  return Math.floor(randomFloat(state) * (maxInclusive + 1));
}

/** Deep-copy a state so callers can snapshot without mutation. */
export function cloneState(state: MTState): MTState {
  return { mt: state.mt.slice(), index: state.index };
}

/**
 * Step-by-step tempering, for educational visualization.
 * Returns each intermediate value so the UI can show how the
 * raw state word becomes the output word one xor at a time.
 */
export function temperSteps(y: number): {
  label: string;
  value: number;
}[] {
  const steps: { label: string; value: number }[] = [];
  steps.push({ label: 'raw state word', value: y >>> 0 });
  y = (y ^ (y >>> 11)) >>> 0;
  steps.push({ label: 'y ^= y >> 11', value: y });
  y = (y ^ ((y << 7) & 0x9d2c5680)) >>> 0;
  steps.push({ label: 'y ^= (y << 7) & 0x9d2c5680', value: y });
  y = (y ^ ((y << 15) & 0xefc60000)) >>> 0;
  steps.push({ label: 'y ^= (y << 15) & 0xefc60000', value: y });
  y = (y ^ (y >>> 18)) >>> 0;
  steps.push({ label: 'y ^= y >> 18  (final output)', value: y });
  return steps;
}
