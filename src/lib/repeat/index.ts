/**
 * The Repeat Suite — registry of the four panels.
 *
 * Hanging order follows the causal chain: gene → error → protein → brain.
 * Each entry carries its generator, default parameters, the controls the
 * forge should expose, and the facts it stands on.
 */

import { address } from './panels/address';
import { arbor } from './panels/arbor';
import { error } from './panels/error';
import { misfold } from './panels/misfold';
import { REPEAT_CLASS_LABEL, repeatClass, type PanelParams } from './params';
import { compose, type Plate } from './plate';
import type { Mode, PanelId, Scene } from './scene';

export type { PanelId, Mode } from './scene';
export type { PanelParams } from './params';
export { plateToSvg } from './svg';
export { fullSizePdf, letterTilesPdf } from './pdf';

export interface Control {
  key: keyof PanelParams;
  label: string;
  kind: 'range' | 'toggle';
  min?: number;
  max?: number;
  step?: number;
}

export interface PanelDef {
  id: PanelId;
  title: string;
  role: string;
  build: (p: PanelParams) => Scene;
  defaults: PanelParams;
  controls: Control[];
  facts: (p: PanelParams) => string[];
  /** Whether the seed changes anything on this panel. */
  seeded: boolean;
}

const BASE: PanelParams = {
  seed: '',
  labels: true,
  instability: 0.6,
  tail: 24,
  crumple: 0.6,
  uncertainty: 0.6,
  tide: 0.42,
  core: 0.6,
};

export const PANELS: Record<PanelId, PanelDef> = {
  I: {
    id: 'I',
    title: '14q32.12',
    role: 'the address',
    build: address,
    defaults: { ...BASE, seed: 'address' },
    controls: [{ key: 'labels', label: 'Band labels + locus callout', kind: 'toggle' }],
    facts: () => [
      'ATXN3 sits at chr14:92,058,552–92,106,582 (hg38), band q32.12 — near the tip of the long arm.',
      'Bands are real hg38 coordinates (UCSC). At 550-band resolution q32.12 reads as 14q32.1, the older name.',
      'Chromosome 14 is acrocentric: a satellite on a stalk above a tiny p arm.',
    ],
    seeded: false,
  },
  II: {
    id: 'II',
    title: 'The Expanded Repeat',
    role: 'the error',
    build: error,
    defaults: { ...BASE, seed: 'CAG' },
    controls: [{ key: 'instability', label: 'Stutter past 44', kind: 'range', min: 0, max: 1, step: 0.01 }],
    facts: () => [
      'Ticks 1–11 are bare ink: nobody carries fewer than 12 repeats.',
      '12–44 gold (normal) · 45–59 amber (intermediate) · 60–87 oxide red (full penetrance, GeneReviews). Tick 60 is red.',
      'The mantra rings chant CAG 12 and 44 times — the two edges of normal.',
    ],
    seeded: true,
  },
  III: {
    id: 'III',
    title: 'Misfold',
    role: 'the consequence',
    build: misfold,
    defaults: { ...BASE, seed: 'misfold' },
    controls: [
      { key: 'tail', label: 'Poly-Q tail spheres', kind: 'range', min: 6, max: 87, step: 1 },
      { key: 'crumple', label: 'Crumple', kind: 'range', min: 0, max: 1, step: 0.01 },
      { key: 'uncertainty', label: 'Tail uncertainty', kind: 'range', min: 0, max: 1, step: 0.01 },
    ],
    facts: (p) => [
      `Tail: ${Math.round(p.tail)} spheres — ${REPEAT_CLASS_LABEL[repeatClass(Math.round(p.tail))]}.`,
      'Ataxin-3 is a deubiquitinase — a protein quality-control enzyme. The expanded one misfolds and clumps: the inspector fails inspection.',
      'No expanded structure has ever been solved. AlphaFold confidence drops from ~90 on the enzyme to ~71 on the poly-Q tract — hence the drift.',
    ],
    seeded: true,
  },
  IV: {
    id: 'IV',
    title: 'Arbor Vitae',
    role: "what's at stake",
    build: arbor,
    defaults: { ...BASE, seed: 'arbor vitae' },
    controls: [
      { key: 'tide', label: 'Tide (rising from the root)', kind: 'range', min: 0, max: 1, step: 0.01 },
      { key: 'core', label: 'Core damage (dentate)', kind: 'range', min: 0, max: 1, step: 0.01 },
    ],
    facts: () => [
      'MJD rises from the root: pons, cerebellar peduncles and white matter, the dentate at the core. The folia hold longest.',
      'Ten lobules, like the vermis (Larsell I–X). Gait and balance loss is the first sign in ~9 of 10 people.',
      'The crown is guarded: damage fades to nothing at Keter — the crown still holding.',
    ],
    seeded: true,
  },
};

export const PANEL_ORDER: PanelId[] = ['I', 'II', 'III', 'IV'];

const safe = (s: string): string => s.trim().replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'seed';

export function fileBase(id: PanelId, p: PanelParams, mode: Mode): string {
  return `repeat-suite-${id}-${safe(p.seed)}-${mode}`;
}

export function slugLine(id: PanelId, p: PanelParams, mode: Mode): string {
  return `THE REPEAT SUITE · ${id} · ${PANELS[id].role.toUpperCase()} · SEED ${p.seed.toUpperCase() || '-'} · ${mode.toUpperCase()} · 12 × 12 IN`;
}

export function renderPlate(id: PanelId, p: PanelParams, opts: { mode: Mode; marks: boolean; mirror: boolean }): Plate {
  return compose(PANELS[id].build(p), { ...opts, slug: slugLine(id, p, opts.mode) });
}
