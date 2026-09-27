/**
 * Panel I — 14q32.12, the address.
 *
 * A clinical karyotype plate: chromosome 14 drawn from real hg38 band
 * coordinates. Acrocentric — a satellite on a thin stalk above a tiny
 * p arm, a pinched centromere, the long q arm below. G-band stain depth
 * becomes hatch density in the underlay and grey tone in the study.
 * One band, q32.12, carries the only warm colour on the panel.
 *
 * Data, not chance: the seed doesn't move this one.
 */

import { ATXN3, CHR14_BANDS, CHR14_LENGTH, type Stain } from '../data/chr14';
import { ellipse, type Pt } from '../geom';
import type { PanelParams } from '../params';
import { Sketch, type Scene, type Style } from '../scene';

const XC = 4.7;
const HALF_W = 0.5;
const TOP = 1.35;
const BOTTOM = 10.45;
const SCALE = (BOTTOM - TOP) / CHR14_LENGTH;
const CAP_R = 0.3;

const yAt = (bp: number): number => TOP + bp * SCALE;

const BODY_TOP = yAt(8_000_000); // p11.2 begins — the body proper
const CENTROMERE = yAt(17_200_000);

const TONE: Partial<Record<Stain, number>> = {
  gpos25: 0.25,
  gpos50: 0.5,
  gpos75: 0.75,
  gpos100: 1,
  gvar: 0.4,
  acen: 0.55,
};

const HATCH: Partial<Record<Stain, number>> = {
  gpos25: 0.2,
  gpos50: 0.12,
  gpos75: 0.08,
  gpos100: 0.055,
};

/** Half-width of the chromosome body at height y: capped ends, pinched waist. */
function halfWidth(y: number): number {
  let hw = HALF_W;
  const dTop = y - BODY_TOP;
  const dBot = BOTTOM - y;
  if (dTop < CAP_R) hw *= Math.sqrt(Math.max(0, 1 - ((CAP_R - dTop) / CAP_R) ** 2));
  if (dBot < CAP_R) hw *= Math.sqrt(Math.max(0, 1 - ((CAP_R - dBot) / CAP_R) ** 2));
  hw *= 1 - 0.5 * Math.exp(-(((y - CENTROMERE) / 0.1) ** 2));
  return hw;
}

/** Closed outline of the body between y0 and y1, following the contour. */
function bodySlice(y0: number, y1: number): Pt[] {
  const steps = Math.max(2, Math.ceil((y1 - y0) / 0.01));
  const left: Pt[] = [];
  const right: Pt[] = [];
  for (let i = 0; i <= steps; i++) {
    const y = y0 + ((y1 - y0) * i) / steps;
    const hw = halfWidth(y);
    left.push([XC - hw, y]);
    right.push([XC + hw, y]);
  }
  return [...left, ...right.reverse()];
}

/** Hatch lines at `angle`, clipped to the body between y0 and y1. */
function hatch(y0: number, y1: number, spacing: number, angle: number): Pt[][] {
  const out: Pt[][] = [];
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  const nx = -dy;
  const ny = dx;
  const cx = XC;
  const cy = (y0 + y1) / 2;
  const reach = HALF_W + (y1 - y0);
  for (let k = -reach; k <= reach; k += spacing) {
    let run: Pt[] = [];
    for (let t = -reach; t <= reach; t += 0.01) {
      const x = cx + nx * k + dx * t;
      const y = cy + ny * k + dy * t;
      const inside = y >= y0 && y <= y1 && Math.abs(x - XC) <= halfWidth(y) - 0.02;
      if (inside) run.push([x, y]);
      else if (run.length) {
        if (run.length > 1) out.push([run[0], run[run.length - 1]]);
        run = [];
      }
    }
    if (run.length > 1) out.push([run[0], run[run.length - 1]]);
  }
  return out;
}

/** The 400-band groups (p11, q21, …) used for the side labels. */
function bandGroups(): { name: string; y0: number; y1: number }[] {
  const groups: { name: string; y0: number; y1: number }[] = [];
  for (const b of CHR14_BANDS) {
    const name = b.name.split('.')[0];
    const last = groups[groups.length - 1];
    if (last && last.name === name) last.y1 = yAt(b.end);
    else groups.push({ name, y0: yAt(b.start), y1: yAt(b.end) });
  }
  return groups;
}

export function address(p: PanelParams): Scene {
  const s = new Sketch();
  const ink: Style = { paint: 'payne', weight: 'medium' };
  const fine: Style = { paint: 'payne', weight: 'fine' };
  const hair: Style = { paint: 'payne', weight: 'hair', only: 'underlay' };

  s.ground([-1, -1, 14, 14], 'bone');

  // Satellite (p13) on its stalk (p12).
  const satTop = yAt(0);
  const satBot = yAt(3_600_000);
  const satMid = (satTop + satBot) / 2;
  const satA = HALF_W * 0.62;
  const satB = (satBot - satTop) / 2;
  s.path(ellipse([XC, satMid], satB, satA, Math.PI / 2, 40), { ...ink, fill: 'payne', fillTone: TONE.gvar }, true);
  for (let dx = -satA + 0.09; dx < satA - 0.04; dx += 0.09) {
    const h = satB * Math.sqrt(1 - (dx / satA) ** 2) - 0.02;
    if (h > 0.02) s.path([[XC + dx, satMid - h], [XC + dx, satMid + h]], hair);
  }
  const stalkBot = yAt(8_000_000) + 0.02;
  s.path([[XC - 0.1, satBot], [XC - 0.1, stalkBot]], fine);
  s.path([[XC + 0.1, satBot], [XC + 0.1, stalkBot]], fine);

  // Body bands: tone in the study, hatch in the underlay.
  for (const band of CHR14_BANDS) {
    if (band.start < 8_000_000) continue;
    const y0 = yAt(band.start);
    const y1 = yAt(band.end);
    const isLocus = band.name === ATXN3.band;
    const tone = TONE[band.stain];
    if (isLocus) {
      s.path(bodySlice(y0, y1), { paint: 'oxide', weight: 'bold', fill: 'oxide', fillTone: 1 }, true);
    } else if (tone) {
      s.path(bodySlice(y0, y1), { paint: 'payne', weight: 'hair', fill: 'payne', fillTone: tone, only: 'study' }, true);
    }
    const spacing = HATCH[band.stain];
    if (spacing) s.strokes(hatch(y0, y1, spacing, Math.PI / 4), hair);
    if (band.stain === 'gvar') s.strokes(hatch(y0, y1, 0.09, Math.PI / 2), hair);
    if (band.stain === 'acen') {
      s.strokes(hatch(y0, y1, 0.07, Math.PI / 4), hair);
      s.strokes(hatch(y0, y1, 0.07, -Math.PI / 4), hair);
    }
    // Boundary line at the top of each band (the centromere draws its own).
    if (band.start > 8_000_000 && band.name !== 'q11.1') {
      const hw = halfWidth(y0);
      s.path([[XC - hw, y0], [XC + hw, y0]], fine);
    }
  }

  // Outline on top of everything.
  s.path(bodySlice(BODY_TOP, BOTTOM), ink, true);

  if (p.labels) {
    const label: Style = { paint: 'payne', weight: 'fine' };
    for (const g of bandGroups()) {
      const ym = (g.y0 + g.y1) / 2;
      s.path([[XC - HALF_W - 0.28, ym], [XC - HALF_W - 0.12, ym]], label);
      s.text(g.name, [XC - HALF_W - 0.36, ym + 0.05], 0.1, label, { anchor: 'end' });
    }

    // Locus callout: a leader from the exact gene position.
    const yg = yAt((ATXN3.start + ATXN3.end) / 2);
    const x0 = XC + halfWidth(yg) + 0.1;
    s.path([[x0, yg], [6.45, yg]], label);
    s.circle([x0, yg], 0.025, { paint: 'oxide', weight: 'fine', fill: 'oxide', fillTone: 1 });
    s.text('ATXN3', [6.6, yg + 0.12], 0.24, { paint: 'payne', weight: 'medium' });
    s.text('14q32.12', [6.6, yg + 0.46], 0.14, label);
    s.text('CHR14:92,058,552-92,106,582', [6.6, yg + 0.7], 0.075, label);

    s.text('14', [XC, 11.15], 0.28, { paint: 'payne', weight: 'medium' }, { anchor: 'middle' });
  }

  return s.scene('I');
}
