/**
 * Resonance — the opt-in sound layer of the 137 construction studio.
 *
 * Every construction step sounds one tone; a finished construction sounds a
 * soft chord. The root is 137 Hz (the studio's name, the fine-structure
 * constant) and every pitch lives inside the two octaves above it,
 * [137, 548) Hz, so nothing is ever shrill.
 *
 * TUNING — the symmetry of a figure chooses its scale.
 *
 *   hexagonal  seed · flower · metatron · metatron3d · vesica · yantra
 *     3-limit Pythagorean. Step k is the k-th pure fifth, 3^(k-1), folded
 *     into the octave: 1, 3/2, 9/8, 27/16, 81/64, 243/128, 729/512, …
 *     Seven steps complete the diatonic collection; the spiral never closes
 *     (twelve fifths overshoot seven octaves by the Pythagorean comma).
 *     Timbre: round "bowl" — sine with a quiet 2nd and 3rd partial.
 *     vesica adds an inharmonic partial at √3, the height of the lens.
 *
 *   cubic      cube · octahedron · tetrahedron
 *     The harmonic series. Step k is partial n = k + 3 (4:5:6:7:8:9:10:11),
 *     so a full run is a rising overtone ladder, 4×34.25 Hz … 11×34.25 Hz.
 *     Timbre: "hollow" — odd partials only, a triangle wave (orthogonal,
 *     squared-off).
 *
 *   golden     dodecahedron · icosahedron
 *     Fibonacci ratios F(k+2)/F(k+1): 2/1, 3/2, 5/3, 8/5, 13/8, 21/13, …
 *     converging on φ. Consecutive notes sit 41, 27, 10, 4, 1.5 cents apart
 *     and are tuned exactly (no random detune) so their slow beating is
 *     audible. Timbre: "pure" sine, which exposes beating best.
 *
 *   The octave window slides with progress: step k of `max` is placed in
 *   [2^((k-1)/max), 2^((k-1)/max + 1)) × 137 Hz, so a hexagonal or cubic
 *   construction rises through its two octaves as it is built. The golden
 *   family keeps one fixed window, so its neighbours stay close enough to beat.
 *
 * COMPLETION — the chord of a Platonic solid is its V : E : F, each count
 * folded to a pitch class (a duplicate is lifted an octave):
 *   tetrahedron  4:6:4    → 1, 3/2, 2     (hollow fifth, self-dual)
 *   cube         8:12:6   → 1, 3/2, 3     ┐ same pitches — duals share a chord;
 *   octahedron   6:12:8   → 3/2, 3, 1     ┘ only the order of entry swaps
 *   dodecahedron 20:30:12 → 5/4, 15/8, 3/2 ┐ a pure minor triad (10:12:15);
 *   icosahedron  12:30:20 → 3/2, 15/8, 5/4 ┘ the duals reverse their entry
 * Everything else sounds a root + fifth + octave "bowl" (1, 3/2, 2): seed the
 * bare bowl; flower adds the 7th harmonic (7/4) as a dark colour; metatron the
 * same 7th an octave higher (7/2); metatron3d both; yantra opens to the
 * twelfth (3); vesica adds the √3 note of its lens. Chord tones enter 110 ms
 * apart, in the order listed, and ring for ~6 s.
 *
 * SAFETY — one voice = one oscillator (+1 for vesica) → envelope → steal
 * gate; polyphony is capped at 14 (oldest voice steals), steps closer than
 * 45 ms are dropped, every node is disconnected when its oscillator ends,
 * and the whole mix passes a reverb, a master gain and a limiter.
 *
 * SSR-safe: nothing here touches `window` or Web Audio until `enable()`.
 */

/* ------------------------------------------------------------------ types */

export type PatternId =
  | 'seed'
  | 'flower'
  | 'metatron'
  | 'metatron3d'
  | 'tetrahedron'
  | 'cube'
  | 'octahedron'
  | 'dodecahedron'
  | 'icosahedron'
  | 'vesica'
  | 'yantra';

export interface Resonance {
  /** False when there is no Web Audio (SSR, old browsers). */
  readonly supported: boolean;
  readonly enabled: boolean;
  /**
   * Create / resume the audio context. Call it synchronously from a click
   * handler (a user gesture) — the context is created before the first await.
   * Resolves once running; if the browser refuses, it resolves anyway after
   * ~1.5 s and `enabled` still reflects whether sound was switched on.
   */
  enable(): Promise<void>;
  /** Fade the master to 0 over ~0.4 s, silence every voice, then suspend. */
  disable(): void;
  /** `step` is 1-based; no-op when disabled. `when` is context time (s). */
  step(pattern: PatternId, step: number, max: number, when?: number): void;
  /** The closing chord for a finished construction. */
  complete(pattern: PatternId, when?: number): void;
  /** Close the context and release everything; safe to call twice. */
  dispose(): void;
}

export interface ResonanceOptions {
  /** Use this context as-is (e.g. an OfflineAudioContext); it is never closed. */
  context?: BaseAudioContext;
  /** Master level, 0..1 (default 0.5). */
  master?: number;
}

/* ------------------------------------------------------------ tuning model */

/** The root of every scale, in Hz. */
export const RESONANCE_ROOT_HZ = 137;

type Family = 'hex' | 'cubic' | 'golden';
type Timbre = 'bowl' | 'hollow' | 'pure';

interface PatternSpec {
  readonly family: Family;
  /** Chord ratios against the root, in order of entry. */
  readonly chord: readonly number[];
  /** Adds the √3 partial to every voice (the vesica lens). */
  readonly shimmer: boolean;
}

interface FamilyVoice {
  readonly timbre: Timbre;
  /** Seconds for a step note to fall 60 dB. */
  readonly t60: number;
  /** Largest random detune, in cents (golden is exact so its beats are true). */
  readonly detune: number;
}

const FAMILY_VOICE: Readonly<Record<Family, FamilyVoice>> = {
  hex: { timbre: 'bowl', t60: 2.1, detune: 3 },
  cubic: { timbre: 'hollow', t60: 1.7, detune: 3 },
  golden: { timbre: 'pure', t60: 2.4, detune: 0 },
};

/** Harmonic amplitudes, index 0 = fundamental. */
const TIMBRE_PARTIALS: Readonly<Record<Timbre, readonly number[]>> = {
  bowl: [1, 0.28, 0.1],
  hollow: [1, 0, 0.12, 0, 0.04],
  pure: [1, 0.08],
};

const SQRT3 = Math.sqrt(3);

/** Fold a positive ratio into the octave [1, 2). */
function fold(ratio: number): number {
  if (!(ratio > 0) || !Number.isFinite(ratio)) return 1;
  let x = ratio / Math.pow(2, Math.floor(Math.log2(ratio)));
  if (x >= 2) x /= 2;
  if (x < 1) x *= 2;
  return x;
}

/** Octave-transpose a pitch class in [1, 2) into the window [lo, 2·lo). */
function intoWindow(pitchClass: number, lo: number): number {
  let x = pitchClass;
  while (x < lo) x *= 2;
  while (x >= lo * 2) x /= 2;
  return x;
}

/** Fold harmonic numbers to pitch classes; a repeated one goes up an octave. */
function harmonicChord(...numbers: number[]): number[] {
  const out: number[] = [];
  for (const n of numbers) {
    let r = fold(n);
    while (out.some((x) => Math.abs(x - r) < 1e-9)) r *= 2;
    out.push(r);
  }
  return out;
}

const BOWL: readonly number[] = [1, 3 / 2, 2];

const PATTERNS: Readonly<Record<PatternId, PatternSpec>> = {
  seed: { family: 'hex', chord: BOWL, shimmer: false },
  flower: { family: 'hex', chord: [...BOWL, 7 / 4], shimmer: false },
  metatron: { family: 'hex', chord: [...BOWL, 7 / 2], shimmer: false },
  metatron3d: { family: 'hex', chord: [...BOWL, 7 / 4, 7 / 2], shimmer: false },
  vesica: { family: 'hex', chord: [...BOWL, SQRT3], shimmer: true },
  yantra: { family: 'hex', chord: [...BOWL, 3], shimmer: false },
  tetrahedron: { family: 'cubic', chord: harmonicChord(4, 6, 4), shimmer: false },
  cube: { family: 'cubic', chord: harmonicChord(8, 12, 6), shimmer: false },
  octahedron: { family: 'cubic', chord: harmonicChord(6, 12, 8), shimmer: false },
  dodecahedron: { family: 'golden', chord: harmonicChord(20, 30, 12), shimmer: false },
  icosahedron: { family: 'golden', chord: harmonicChord(12, 30, 20), shimmer: false },
};

function isPattern(id: string): id is PatternId {
  return Object.prototype.hasOwnProperty.call(PATTERNS, id);
}

function clampInt(value: number, lo: number, hi: number): number {
  const v = Number.isFinite(value) ? Math.round(value) : lo;
  return Math.min(hi, Math.max(lo, v));
}

/** F(k+2) / F(k+1): 2/1, 3/2, 5/3, 8/5, … → φ. */
function fibonacciRatio(k: number): number {
  let a = 1;
  let b = 1;
  for (let i = 0; i < k; i++) {
    const next = a + b;
    a = b;
    b = next;
  }
  return b / a;
}

/** Frequency (Hz) of construction step `step` (1-based) of `max`. */
export function stepFrequency(pattern: PatternId, step: number, max: number): number {
  const { family } = PATTERNS[pattern];
  const total = Math.max(1, clampInt(max, 1, 4096));
  const k = clampInt(step, 1, total);
  if (family === 'golden') return RESONANCE_ROOT_HZ * fold(fibonacciRatio(Math.min(k, 60)));
  const pitchClass = fold(family === 'hex' ? Math.pow(3, k - 1) : k + 3);
  const lo = Math.pow(2, (k - 1) / total);
  return RESONANCE_ROOT_HZ * intoWindow(pitchClass, lo);
}

/** Frequencies (Hz) of the completion chord, in order of entry. */
export function chordFrequencies(pattern: PatternId): number[] {
  return PATTERNS[pattern].chord.map((r) => RESONANCE_ROOT_HZ * r);
}

/* ------------------------------------------------------------- constants */

const MASTER_DEFAULT = 0.5;
const MAX_VOICES = 14;
const MIN_STEP_GAP = 0.045; // s between accepted steps
const MIN_CHORD_GAP = 0.25; // s between accepted chords
const STEP_ATTACK = 0.012;
const STEP_PEAK = 0.085; // per-note gain at the first step …
const STEP_PEAK_SPAN = 0.03; // … rising to ~0.115 at the last
const CHORD_ATTACK = 0.04;
const CHORD_T60 = 6;
const CHORD_STRUM = 0.11; // s between chord tones
const CHORD_LEVEL = 0.17; // divided by √(voices)
const CHORD_DETUNE = 3; // cents
const SHIMMER_LEVEL = 0.16; // √3 partial, relative to the fundamental
const REVERB_SECONDS = 2.2;
const STEAL_TAU = 0.007; // s, fade of a stolen voice
const STEAL_STOP = 0.04; // s after the steal when its oscillator stops
const FADE_OUT = 0.4; // s, disable() master fade
const SUSPEND_DELAY_MS = 520;
const RESUME_TIMEOUT_MS = 1500;

/* ----------------------------------------------------------------- helpers */

/** Small deterministic PRNG (mulberry32), so offline renders are reproducible. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Procedural reverb impulse: stereo noise, ~2.2 s (−60 dB), darkening as it
 * decays (a low-pass that closes with time), 12 ms pre-delay.
 */
function makeImpulse(ctx: BaseAudioContext): AudioBuffer {
  const rate = ctx.sampleRate;
  const length = Math.max(1, Math.floor(rate * REVERB_SECONDS));
  const pre = Math.floor(rate * 0.012);
  const fade = Math.floor(rate * 0.06);
  const buffer = ctx.createBuffer(2, length, rate);
  for (let ch = 0; ch < 2; ch++) {
    const rng = mulberry32(0x137 + ch * 7919);
    const data = buffer.getChannelData(ch);
    let lp = 0;
    for (let i = pre; i < length; i++) {
      const t = (i - pre) / rate;
      const envelope = Math.exp((-6.9078 * t) / REVERB_SECONDS);
      const coeff = 0.05 + 0.6 * Math.exp(-1.2 * t);
      lp += coeff * (rng() * 2 - 1 - lp);
      const tail = Math.min(1, (length - 1 - i) / fade);
      data[i] = lp * envelope * tail;
    }
  }
  return buffer;
}

function periodicWave(ctx: BaseAudioContext, partials: readonly number[]): PeriodicWave {
  const real = new Float32Array(partials.length + 1);
  const imag = new Float32Array(partials.length + 1);
  partials.forEach((amp, i) => {
    imag[i + 1] = amp;
  });
  return ctx.createPeriodicWave(real, imag);
}

type AudioContextCtor = new (options?: AudioContextOptions) => AudioContext;

function audioContextCtor(): AudioContextCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    AudioContext?: AudioContextCtor;
    webkitAudioContext?: AudioContextCtor;
  };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

/** The context as a real-time AudioContext, or null for an offline one. */
function realtime(ctx: BaseAudioContext): AudioContext | null {
  const maybe = ctx as Partial<OfflineAudioContext & AudioContext>;
  if (typeof maybe.startRendering === 'function') return null;
  if (typeof maybe.resume !== 'function' || typeof maybe.suspend !== 'function') return null;
  return ctx as AudioContext;
}

function noop(): void {}

function safe(fn: () => void): void {
  try {
    fn();
  } catch {
    /* already stopped / disconnected */
  }
}

/* -------------------------------------------------------------- the graph */

interface Voice {
  readonly start: number;
  /** Nominal end (−60 dB point). */
  readonly end: number;
  stopAt: number;
  stolen: boolean;
  readonly oscs: OscillatorNode[];
  /** Fades a stolen / disabled voice without touching its envelope. */
  readonly gate: GainNode;
  readonly nodes: AudioNode[];
}

interface Graph {
  readonly ctx: BaseAudioContext;
  readonly owned: boolean;
  readonly bus: GainNode;
  readonly master: GainNode;
  readonly waves: Readonly<Record<Timbre, PeriodicWave>>;
  readonly nodes: AudioNode[];
  readonly rng: () => number;
  voices: Voice[];
}

function buildGraph(ctx: BaseAudioContext, owned: boolean, level: number): Graph {
  const bus = ctx.createGain();
  const tone = ctx.createBiquadFilter();
  tone.type = 'lowpass';
  tone.frequency.value = 2200;
  tone.Q.value = 0.5;
  const dry = ctx.createGain();
  dry.gain.value = 1;
  const send = ctx.createGain();
  send.gain.value = 0.5;
  const verb = ctx.createConvolver();
  verb.buffer = makeImpulse(ctx);
  const master = ctx.createGain();
  master.gain.value = owned ? 0 : level;
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -10;
  limiter.knee.value = 6;
  limiter.ratio.value = 20;
  limiter.attack.value = 0.003;
  limiter.release.value = 0.25;

  bus.connect(tone);
  tone.connect(dry);
  dry.connect(master);
  tone.connect(send);
  send.connect(verb);
  verb.connect(master);
  master.connect(limiter);
  limiter.connect(ctx.destination);

  return {
    ctx,
    owned,
    bus,
    master,
    waves: {
      bowl: periodicWave(ctx, TIMBRE_PARTIALS.bowl),
      hollow: periodicWave(ctx, TIMBRE_PARTIALS.hollow),
      pure: periodicWave(ctx, TIMBRE_PARTIALS.pure),
    },
    nodes: [bus, tone, dry, send, verb, master, limiter],
    rng: mulberry32(0x137137),
    voices: [],
  };
}

interface Tone {
  readonly freq: number;
  readonly peak: number;
  readonly attack: number;
  readonly t60: number;
  readonly detune: number;
  readonly timbre: Timbre;
  readonly shimmer: boolean;
}

function stopVoiceAt(voice: Voice, at: number): void {
  if (at >= voice.stopAt) return;
  voice.stopAt = at;
  for (const osc of voice.oscs) safe(() => osc.stop(at));
}

/** Fade one voice from time `at` and stop its oscillators shortly after. */
function silenceVoice(voice: Voice, at: number, tau: number, stopAfter: number): void {
  voice.stolen = true;
  voice.gate.gain.setTargetAtTime(0, at, tau);
  stopVoiceAt(voice, at + stopAfter);
}

function releaseVoice(graph: Graph, voice: Voice): void {
  graph.voices = graph.voices.filter((v) => v !== voice);
  for (const node of voice.nodes) safe(() => node.disconnect());
}

/** Keep the polyphony cap at time `t`: steal the oldest sounding voice. */
function makeRoom(graph: Graph, t: number): void {
  const now = graph.ctx.currentTime;
  for (const v of graph.voices.slice()) {
    if (v.end + 0.5 < now && v.stopAt + 0.5 < now) releaseVoice(graph, v);
  }
  for (;;) {
    const active = graph.voices.filter((v) => !v.stolen && v.start <= t + 1e-6 && v.end > t);
    if (active.length < MAX_VOICES) return;
    const oldest = active.reduce((a, b) => (b.start < a.start ? b : a));
    silenceVoice(oldest, t, STEAL_TAU, STEAL_STOP);
  }
}

function spawn(graph: Graph, tone: Tone, t: number): void {
  const { ctx } = graph;
  makeRoom(graph, t);

  const env = ctx.createGain();
  const gate = ctx.createGain();
  const nodes: AudioNode[] = [env, gate];
  const oscs: OscillatorNode[] = [];
  const cents = (graph.rng() * 2 - 1) * tone.detune;

  const main = ctx.createOscillator();
  main.setPeriodicWave(graph.waves[tone.timbre]);
  main.frequency.value = tone.freq;
  main.detune.value = cents;
  main.connect(env);
  oscs.push(main);

  if (tone.shimmer) {
    const lens = ctx.createOscillator();
    lens.type = 'sine';
    lens.frequency.value = tone.freq * SQRT3;
    lens.detune.value = cents;
    const lensGain = ctx.createGain();
    lensGain.gain.value = SHIMMER_LEVEL;
    lens.connect(lensGain);
    lensGain.connect(env);
    oscs.push(lens);
    nodes.push(lensGain);
  }

  // Attack, then an exponential fall of 60 dB over t60, then a short ramp to
  // true zero so the oscillator can stop without a click.
  const decayEnd = t + tone.attack + tone.t60;
  const g = env.gain;
  g.setValueAtTime(0, t);
  g.linearRampToValueAtTime(tone.peak, t + tone.attack);
  g.exponentialRampToValueAtTime(tone.peak * 0.001, decayEnd);
  g.linearRampToValueAtTime(0, decayEnd + 0.05);

  env.connect(gate);
  gate.connect(graph.bus);

  const stopAt = decayEnd + 0.08;
  const voice: Voice = { start: t, end: decayEnd, stopAt, stolen: false, oscs, gate, nodes: [...oscs, ...nodes] };
  main.onended = () => releaseVoice(graph, voice);
  for (const osc of oscs) {
    osc.start(t);
    osc.stop(stopAt);
  }
  graph.voices.push(voice);
}

/* ---------------------------------------------------------------- factory */

export function createResonance(opts: ResonanceOptions = {}): Resonance {
  const supplied = opts.context ?? null;
  const requested = opts.master;
  const level = Math.min(
    1,
    Math.max(0, typeof requested === 'number' && Number.isFinite(requested) ? requested : MASTER_DEFAULT),
  );

  let graph: Graph | null = null;
  let enabled = false;
  let suspendTimer: ReturnType<typeof setTimeout> | null = null;
  let lastStepAt = Number.NEGATIVE_INFINITY;
  let lastChordAt = Number.NEGATIVE_INFINITY;

  function cancelSuspend(): void {
    if (suspendTimer !== null) {
      clearTimeout(suspendTimer);
      suspendTimer = null;
    }
  }

  /** Build the graph on first use (or after dispose / a closed context). */
  function ensureGraph(): Graph | null {
    if (graph && graph.ctx.state !== 'closed') return graph;
    graph = null;
    try {
      if (supplied) {
        graph = buildGraph(supplied, false, level);
      } else {
        const Ctor = audioContextCtor();
        if (!Ctor) return null;
        graph = buildGraph(new Ctor(), true, level);
      }
    } catch {
      graph = null;
    }
    return graph;
  }

  function rampMaster(g: Graph, target: number, seconds: number): void {
    const now = g.ctx.currentTime;
    const param = g.master.gain;
    const from = param.value;
    param.cancelScheduledValues(now);
    param.setValueAtTime(from, now);
    if (seconds > 0) param.linearRampToValueAtTime(target, now + seconds);
    else param.setValueAtTime(target, now);
  }

  /** The time a call takes effect: `when`, but never in the past. */
  function timeOf(g: Graph, when: number | undefined): number {
    const now = g.ctx.currentTime;
    return typeof when === 'number' && Number.isFinite(when) ? Math.max(when, now) : now;
  }

  /** Live, enabled graph — and nudge a suspended real-time context awake. */
  function live(): Graph | null {
    const g = graph;
    if (!enabled || !g || g.ctx.state === 'closed') return null;
    const rt = realtime(g.ctx);
    if (rt && rt.state === 'suspended') rt.resume().catch(noop);
    return g;
  }

  const api: Resonance = {
    get supported(): boolean {
      return supplied !== null || audioContextCtor() !== null;
    },

    get enabled(): boolean {
      return enabled;
    },

    enable(): Promise<void> {
      // Everything up to resume() runs synchronously, inside the user gesture.
      cancelSuspend();
      const g = ensureGraph();
      if (!g) return Promise.resolve();
      enabled = true;
      rampMaster(g, level, g.owned ? 0.06 : 0);
      const rt = realtime(g.ctx);
      if (!rt) return Promise.resolve();
      if (g.owned) {
        // iOS Safari: a started silent buffer inside the gesture unlocks audio.
        safe(() => {
          const src = rt.createBufferSource();
          src.buffer = rt.createBuffer(1, 1, 22050);
          src.connect(rt.destination);
          src.start(0);
        });
      }
      if (rt.state === 'running') return Promise.resolve();
      return new Promise<void>((resolve) => {
        const timer = setTimeout(resolve, RESUME_TIMEOUT_MS);
        const done = (): void => {
          clearTimeout(timer);
          resolve();
        };
        rt.resume().then(done, done);
      });
    },

    disable(): void {
      enabled = false;
      cancelSuspend();
      const g = graph;
      if (!g || g.ctx.state === 'closed') return;
      const now = g.ctx.currentTime;
      const param = g.master.gain;
      const from = param.value;
      param.cancelScheduledValues(now);
      param.setValueAtTime(from, now);
      param.linearRampToValueAtTime(0, now + FADE_OUT);
      // No stuck notes: every voice dies just after the master reaches zero,
      // so nothing resurfaces when the context is resumed later.
      for (const v of g.voices) silenceVoice(v, now + FADE_OUT, 0.01, 0.06);
      const rt = realtime(g.ctx);
      if (rt && g.owned) {
        suspendTimer = setTimeout(() => {
          suspendTimer = null;
          if (!enabled && rt.state === 'running') rt.suspend().catch(noop);
        }, SUSPEND_DELAY_MS);
      }
    },

    step(pattern: PatternId, step: number, max: number, when?: number): void {
      const g = live();
      if (!g || !isPattern(pattern) || !Number.isFinite(step)) return;
      const t = timeOf(g, when);
      if (Math.abs(t - lastStepAt) < MIN_STEP_GAP - 1e-9) return; // rapid-fire: drop
      lastStepAt = t;

      const spec = PATTERNS[pattern];
      const voice = FAMILY_VOICE[spec.family];
      const total = Math.max(1, clampInt(max, 1, 4096));
      const k = clampInt(step, 1, total);
      spawn(
        g,
        {
          freq: stepFrequency(pattern, k, total),
          peak: STEP_PEAK + STEP_PEAK_SPAN * ((k - 1) / total),
          attack: STEP_ATTACK,
          t60: voice.t60,
          detune: voice.detune,
          timbre: voice.timbre,
          shimmer: spec.shimmer,
        },
        t,
      );
    },

    complete(pattern: PatternId, when?: number): void {
      const g = live();
      if (!g || !isPattern(pattern)) return;
      const t = timeOf(g, when);
      if (Math.abs(t - lastChordAt) < MIN_CHORD_GAP) return;
      lastChordAt = t;

      const spec = PATTERNS[pattern];
      const voice = FAMILY_VOICE[spec.family];
      const peak = CHORD_LEVEL / Math.sqrt(spec.chord.length);
      chordFrequencies(pattern).forEach((freq, i) => {
        spawn(
          g,
          {
            freq,
            peak,
            attack: CHORD_ATTACK,
            t60: CHORD_T60,
            detune: CHORD_DETUNE,
            timbre: voice.timbre,
            shimmer: spec.shimmer,
          },
          t + i * CHORD_STRUM,
        );
      });
    },

    dispose(): void {
      enabled = false;
      cancelSuspend();
      const g = graph;
      graph = null;
      if (!g) return;
      for (const v of g.voices) {
        for (const osc of v.oscs) {
          osc.onended = null;
          safe(() => osc.stop());
        }
        for (const node of v.nodes) safe(() => node.disconnect());
      }
      g.voices = [];
      for (const node of g.nodes) safe(() => node.disconnect());
      const rt = realtime(g.ctx);
      if (g.owned && rt && rt.state !== 'closed') rt.close().catch(noop);
    },
  };

  return api;
}
