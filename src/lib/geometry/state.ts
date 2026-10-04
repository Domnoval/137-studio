/**
 * The drawing state. Everything the user can change that belongs in undo history
 * (and in a share link) lives here; transient things (playing) ride along but are
 * never snapshotted.
 */

import type { PatternId } from './catalog';

export type ViewMode = 'plan' | 'axon' | 'perspective';
export type Primitive = 'flat' | 'solid';
export type PerspectivePoints = 1 | 2 | 3;

export interface State {
  pattern: PatternId;
  mode: ViewMode;
  primitive: Primitive;
  perspectivePoints: PerspectivePoints;
  step: number;
  rotation: number;
  tilt: number;
  depth: number;
  weight: number;
  guides: boolean;
  points: boolean;
  mirror: boolean;
  darkline: boolean;
  perspectiveLines: boolean;
  phi: boolean;
  dimensions: boolean;
  multiView: boolean;
  fruit: boolean;
  horizon: number;
  vp1X: number;
  vpLeft: number;
  vpRight: number;
  vp3X: number;
  vp3Y: number;
  playing: boolean;
  autoRotate: boolean;
}

/** The boolean state keys the sidebar chips toggle (`data-toggle="…"`). */
export type ToggleKey =
  | 'guides'
  | 'points'
  | 'mirror'
  | 'darkline'
  | 'fruit'
  | 'phi'
  | 'dimensions'
  | 'multiView';

export const TOGGLE_KEYS: readonly ToggleKey[] = [
  'guides',
  'points',
  'mirror',
  'darkline',
  'fruit',
  'phi',
  'dimensions',
  'multiView',
];

export const isToggleKey = (v: string | undefined): v is ToggleKey =>
  v !== undefined && (TOGGLE_KEYS as readonly string[]).includes(v);

export const HISTORY_KEYS = [
  'pattern',
  'mode',
  'primitive',
  'perspectivePoints',
  'step',
  'rotation',
  'tilt',
  'depth',
  'weight',
  'guides',
  'points',
  'mirror',
  'darkline',
  'perspectiveLines',
  'phi',
  'dimensions',
  'multiView',
  'fruit',
  'horizon',
  'vp1X',
  'vpLeft',
  'vpRight',
  'vp3X',
  'vp3Y',
  'autoRotate',
] as const satisfies readonly (keyof State)[];

export type Snapshot = Pick<State, (typeof HISTORY_KEYS)[number]>;

export function createState(reducedMotion: boolean): State {
  return {
    pattern: 'seed',
    mode: 'perspective',
    primitive: 'flat',
    perspectivePoints: 1,
    step: 1,
    rotation: 0,
    tilt: 34,
    depth: 45,
    weight: 1.4,
    guides: true,
    points: true,
    mirror: false,
    darkline: false,
    perspectiveLines: true,
    phi: false,
    dimensions: false,
    multiView: false,
    fruit: false,
    horizon: 350,
    vp1X: 450,
    vpLeft: 145,
    vpRight: 755,
    vp3X: 450,
    vp3Y: 615,
    playing: false,
    autoRotate: !reducedMotion,
  };
}

export function snapshot(state: State): Snapshot {
  const out = {} as Record<string, unknown>;
  for (const k of HISTORY_KEYS) out[k] = state[k];
  return out as unknown as Snapshot;
}

export function sameSnapshot(a: Snapshot, b: Snapshot): boolean {
  return HISTORY_KEYS.every(k => a[k] === b[k]);
}
