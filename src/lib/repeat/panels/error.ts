/**
 * Panel II — the expanded repeat, the error.
 *
 * Centre: C, A and G as three circles, each passing through the others'
 * centres, so every pair makes a vesica and all three share one Reuleaux
 * core — the codon, glutamine, the Q. Around it two mantra rings chant
 * CAG 12 and 44 times: the edges of normal. Outside, 87 radial ticks,
 * one per repeat:
 *
 *    1–11  bare ink   nobody is born with fewer than 12
 *   12–44  gold       normal
 *   45–59  amber      intermediate
 *   60–87  oxide red  full penetrance
 *
 * Past 44 the ticks start to stutter — seeded jitter and doubled strikes
 * that grow with the count. The chant loses its rhythm.
 */

import { mulberry32, strHash } from '@/lib/temple/seed';
import { arc, DEG, polar, TAU, type Pt } from '../geom';
import { ringStrokes } from '../font';
import { CAG, type PanelParams } from '../params';
import { Sketch, type Scene, type Style } from '../scene';
import type { Paint, Weight } from '../tokens';

const C: Pt = [6, 6];
const VESICA_R = 1.05;
const TICK_IN = 4.05;
const TICK_LEN = 0.5;
const THRESHOLDS = new Set([1, CAG.minObserved, CAG.normalMax + 1, CAG.fullMin, CAG.max]);

function tickPaint(n: number): { paint: Paint; weight: Weight } {
  if (n < CAG.minObserved) return { paint: 'bone', weight: 'hair' };
  if (n <= CAG.normalMax) return { paint: 'gold', weight: 'medium' };
  if (n <= CAG.intermediateMax) return { paint: 'amber', weight: 'medium' };
  return { paint: 'oxide', weight: 'bold' };
}

export function error(p: PanelParams): Scene {
  const s = new Sketch();
  const rng = mulberry32(strHash('II:' + p.seed));
  const gold = (weight: Weight): Style => ({ paint: 'gold', weight });

  s.ground([-1, -1, 14, 14], 'indigo');

  // ── The threefold vesica ────────────────────────────────────────────
  const centres = [-90, 30, 150].map((d) => polar(C, VESICA_R / Math.sqrt(3), d * DEG));
  const core: Pt[] = [];
  for (let k = 0; k < 3; k++) {
    const [i, j] = [(k + 1) % 3, (k + 2) % 3];
    const a0 = Math.atan2(centres[i][1] - centres[k][1], centres[i][0] - centres[k][0]);
    let a1 = Math.atan2(centres[j][1] - centres[k][1], centres[j][0] - centres[k][0]);
    if (a1 < a0) a1 += TAU;
    if (a1 - a0 > Math.PI) a1 -= TAU;
    core.push(...arc(centres[k], VESICA_R, a0, a1, 16));
  }
  s.path(core, { paint: 'gold', weight: 'fine', fill: 'gold', fillTone: 1 }, true);
  for (const c of centres) s.circle(c, VESICA_R, gold('medium'));
  ['C', 'A', 'G'].forEach((letter, k) => {
    const at = polar(C, 1.2, [-90, 30, 150][k] * DEG);
    s.text(letter, [at[0], at[1] + 0.14], 0.28, gold('medium'), { anchor: 'middle' });
  });

  // ── Mantra rings: CAG × 12 and × 44, the edges of normal ─────────────
  s.circle(C, 1.9, gold('hair'));
  s.strokes(ringStrokes('CAG'.repeat(CAG.minObserved), C, 2.05, 0.2), gold('fine'));
  s.circle(C, 2.38, gold('fine'));
  s.circle(C, 2.8, gold('medium'));
  s.strokes(ringStrokes('CAG'.repeat(CAG.normalMax), C, 2.95, 0.15), gold('fine'));
  s.circle(C, 3.25, gold('fine'));
  s.circle(C, 3.55, gold('bold'));
  s.circle(C, 3.72, gold('hair'));

  // ── 87 ticks, one per repeat ─────────────────────────────────────────
  const step = TAU / CAG.max;
  for (let n = 1; n <= CAG.max; n++) {
    const unstable = Math.max(0, (n - CAG.normalMax) / (CAG.max - CAG.normalMax));
    const shake = p.instability * unstable;
    const a = -Math.PI / 2 + (n - 1) * step + (rng() - 0.5) * shake * step * 0.9;
    const len = (THRESHOLDS.has(n) ? TICK_LEN + 0.3 : TICK_LEN) + (rng() - 0.5) * shake * 0.35;
    const { paint, weight } = tickPaint(n);
    s.path([polar(C, TICK_IN, a), polar(C, TICK_IN + len, a)], { paint, weight });
    // The stutter: a second, thinner strike just off the beat.
    if (rng() < shake * 0.55) {
      const b = a + (rng() < 0.5 ? -1 : 1) * step * (0.22 + rng() * 0.2);
      s.path([polar(C, TICK_IN + 0.06, b), polar(C, TICK_IN + len * (0.55 + rng() * 0.4), b)], {
        paint,
        weight: 'fine',
      });
    }
    if (THRESHOLDS.has(n)) {
      const at = polar(C, TICK_IN + TICK_LEN + 0.62, -Math.PI / 2 + (n - 1) * step);
      s.text(String(n), [at[0], at[1] + 0.055], 0.11, { paint: 'gold', weight: 'hair', guide: true }, {
        anchor: 'middle',
      });
    }
  }
  s.circle(C, TICK_IN - 0.1, gold('hair'));
  s.circle(C, 5.6, gold('hair'));

  return s.scene('II');
}
