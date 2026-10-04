/**
 * Share links: the drawing state, round-tripped through the URL hash.
 *
 *   /geometry#p=flower&s=20&v=perspective&n=2&rot=35&tilt=48
 *
 * Only values that differ from the defaults are written, so the link stays short.
 * Decoding is defensive: unknown keys are ignored and every number is clamped to the
 * range its slider allows, so a hand-edited or stale link can never wedge the app.
 */

import { MAX_STEPS, SPATIAL, isPatternId } from './catalog';
import { createState, type PerspectivePoints, type Primitive, type State, type ViewMode } from './state';

export type Theme = 'void' | 'paper';

export interface Decoded {
  state: Partial<State>;
  theme?: Theme;
  /** `present=1`: open straight into the installation loop. */
  present?: boolean;
}

type NumKey = 'rotation' | 'tilt' | 'depth' | 'weight' | 'horizon' | 'vp1X' | 'vpLeft' | 'vpRight' | 'vp3X' | 'vp3Y';
type BoolKey =
  | 'guides'
  | 'points'
  | 'mirror'
  | 'darkline'
  | 'perspectiveLines'
  | 'phi'
  | 'dimensions'
  | 'multiView'
  | 'fruit';

const NUMS: readonly [NumKey, string, number, number][] = [
  ['rotation', 'rot', -180, 180],
  ['tilt', 'tilt', 0, 72],
  ['depth', 'depth', 0, 100],
  ['weight', 'w', 0.6, 3.4],
  ['horizon', 'h', 70, 630],
  ['vp1X', 'x1', 35, 865],
  ['vpLeft', 'xl', 35, 865],
  ['vpRight', 'xr', 35, 865],
  ['vp3X', 'x3', 35, 865],
  ['vp3Y', 'y3', 70, 630],
];

const BOOLS: readonly [BoolKey, string][] = [
  ['guides', 'g'],
  ['points', 'c'],
  ['mirror', 'mi'],
  ['darkline', 'dk'],
  ['perspectiveLines', 'pl'],
  ['phi', 'phi'],
  ['dimensions', 'dim'],
  ['multiView', 'mv'],
  ['fruit', 'fr'],
];

const VIEWS: readonly ViewMode[] = ['plan', 'axon', 'perspective'];
const PRIMS: readonly Primitive[] = ['flat', 'solid'];

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const round = (n: number) => String(Math.round(n * 100) / 100);

/** The primitive set a pattern selects when it is first chosen. */
export const defaultPrimitive = (pattern: State['pattern']): Primitive => (SPATIAL.includes(pattern) ? 'solid' : 'flat');

/** Serialise to the hash payload (no leading `#`). */
export function encodeState(state: State, theme: Theme = 'void', present = false): string {
  const base = createState(false);
  const q = new URLSearchParams();
  q.set('p', state.pattern);
  if (state.step !== base.step) q.set('s', String(state.step));
  if (state.mode !== base.mode) q.set('v', state.mode);
  if (state.perspectivePoints !== base.perspectivePoints) q.set('n', String(state.perspectivePoints));
  if (state.primitive !== defaultPrimitive(state.pattern)) q.set('u', state.primitive);
  for (const [key, short] of NUMS) if (state[key] !== base[key]) q.set(short, round(state[key]));
  for (const [key, short] of BOOLS) if (state[key] !== base[key]) q.set(short, state[key] ? '1' : '0');
  if (theme !== 'void') q.set('theme', theme);
  if (present) q.set('present', '1');
  return q.toString();
}

/** Parse a hash (with or without the leading `#`). Never throws. */
export function decodeState(hash: string): Decoded {
  const q = new URLSearchParams(hash.replace(/^#/, ''));
  const out: Partial<State> = {};
  const decoded: Decoded = { state: out };

  const p = q.get('p');
  if (isPatternId(p)) {
    out.pattern = p;
    out.primitive = defaultPrimitive(p);
  }

  const v = q.get('v');
  if (v && (VIEWS as readonly string[]).includes(v)) out.mode = v as ViewMode;

  const n = Number(q.get('n'));
  if (n === 1 || n === 2 || n === 3) out.perspectivePoints = n as PerspectivePoints;

  const u = q.get('u');
  if (u && (PRIMS as readonly string[]).includes(u)) out.primitive = u as Primitive;

  for (const [key, short, lo, hi] of NUMS) {
    const raw = q.get(short);
    if (raw === null || raw.trim() === '') continue;
    const num = Number(raw);
    if (Number.isFinite(num)) out[key] = clamp(num, lo, hi);
  }
  for (const [key, short] of BOOLS) {
    const raw = q.get(short);
    if (raw === '1') out[key] = true;
    else if (raw === '0') out[key] = false;
  }

  const s = Number(q.get('s'));
  if (Number.isFinite(s) && q.get('s') !== null) {
    const pattern = out.pattern ?? createState(false).pattern;
    out.step = clamp(Math.round(s), 1, MAX_STEPS[pattern]);
  }

  const theme = q.get('theme');
  if (theme === 'void' || theme === 'paper') decoded.theme = theme;
  if (q.get('present') === '1') decoded.present = true;
  return decoded;
}
