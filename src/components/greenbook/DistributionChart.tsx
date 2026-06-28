'use client';

/**
 * The money visual: two players' skill distributions drawn as overlapping
 * normal curves. You literally see the overlap that is the probability — the
 * antithesis of a black-box pick. Lower score is better, so the sharper player
 * sits to the LEFT; the shaded intersection is the contested ground where the
 * upset lives.
 *
 * Pure presentation — takes (m, σ) for each side and the model P(A beats B),
 * draws the rest. SVG so it stays crisp at any size with zero dependencies.
 */

import React, { useId } from 'react';

interface Props {
  a: { name: string; m: number; sigma: number };
  b: { name: string; m: number; sigma: number };
  pA: number;
  width?: number;
  height?: number;
}

const RED = '#c41230';
const AMBER = '#d4a030';
const CHALK = '#e8e4dc';
const FADED = '#a09890';

function pdf(x: number, m: number, sigma: number): number {
  const z = (x - m) / sigma;
  return Math.exp(-0.5 * z * z) / (sigma * Math.sqrt(2 * Math.PI));
}

export default function DistributionChart({ a, b, pA, width = 560, height = 240 }: Props) {
  const clipA = useId();
  const clipB = useId();

  const pad = { top: 18, right: 16, bottom: 34, left: 16 };
  const w = width - pad.left - pad.right;
  const h = height - pad.top - pad.bottom;

  // Domain: cover both curves out to ~3.6σ.
  const lo = Math.min(a.m - 3.6 * a.sigma, b.m - 3.6 * b.sigma);
  const hi = Math.max(a.m + 3.6 * a.sigma, b.m + 3.6 * b.sigma);
  const N = 160;

  const xs = Array.from({ length: N + 1 }, (_, i) => lo + ((hi - lo) * i) / N);
  const ya = xs.map((x) => pdf(x, a.m, a.sigma));
  const yb = xs.map((x) => pdf(x, b.m, b.sigma));
  const yMax = Math.max(...ya, ...yb) * 1.08;

  // Score axis runs low→high left→right; lower strokes are better, so the
  // sharper player's curve sits on the LEFT — matching the "← BETTER" cue.
  const sx = (x: number) => pad.left + ((x - lo) / (hi - lo)) * w;
  const sy = (y: number) => pad.top + h - (y / yMax) * h;

  const area = (ys: number[]) => {
    let d = `M ${sx(xs[0]).toFixed(1)} ${sy(0).toFixed(1)}`;
    xs.forEach((x, i) => (d += ` L ${sx(x).toFixed(1)} ${sy(ys[i]).toFixed(1)}`));
    d += ` L ${sx(xs[N]).toFixed(1)} ${sy(0).toFixed(1)} Z`;
    return d;
  };
  const overlap = xs.map((_, i) => Math.min(ya[i], yb[i]));

  const label = (
    t: string,
    x: number,
    y: number,
    fill: string,
    anchor: 'start' | 'middle' | 'end' = 'middle',
  ) => (
    <text
      x={x}
      y={y}
      fill={fill}
      fontSize={10}
      fontFamily="'JetBrains Mono', monospace"
      letterSpacing="0.08em"
      textAnchor={anchor}
    >
      {t}
    </text>
  );

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      style={{ maxWidth: width, height: 'auto', display: 'block' }}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={`Skill distributions: ${a.name} vs ${b.name}`}
    >
      <defs>
        <clipPath id={clipA}>
          <path d={area(ya)} />
        </clipPath>
        <clipPath id={clipB}>
          <path d={area(yb)} />
        </clipPath>
      </defs>

      {/* baseline */}
      <line x1={pad.left} y1={sy(0)} x2={pad.left + w} y2={sy(0)} stroke="#2a2d3a" strokeWidth={1} />

      {/* contested overlap — drawn first, sits behind the curves */}
      <path d={area(overlap)} fill={AMBER} opacity={0.18} />

      {/* A — red (the power color) */}
      <path d={area(ya)} fill={RED} opacity={0.1} />
      <path
        d={`M ${xs.map((x, i) => `${sx(x).toFixed(1)} ${sy(ya[i]).toFixed(1)}`).join(' L ')}`}
        fill="none"
        stroke={RED}
        strokeWidth={1.6}
        clipPath={`url(#${clipA})`}
      />
      {/* B — chalk */}
      <path d={area(yb)} fill={CHALK} opacity={0.06} />
      <path
        d={`M ${xs.map((x, i) => `${sx(x).toFixed(1)} ${sy(yb[i]).toFixed(1)}`).join(' L ')}`}
        fill="none"
        stroke={CHALK}
        strokeWidth={1.6}
        clipPath={`url(#${clipB})`}
      />

      {/* mean ticks */}
      <line x1={sx(a.m)} y1={sy(pdf(a.m, a.m, a.sigma))} x2={sx(a.m)} y2={sy(0)} stroke={RED} strokeWidth={1} strokeDasharray="2 3" opacity={0.7} />
      <line x1={sx(b.m)} y1={sy(pdf(b.m, b.m, b.sigma))} x2={sx(b.m)} y2={sy(0)} stroke={CHALK} strokeWidth={1} strokeDasharray="2 3" opacity={0.5} />

      {/* axis cue */}
      {label('← BETTER', pad.left + 2, height - 8, FADED, 'start')}
      {label('WORSE →', pad.left + w - 2, height - 8, FADED, 'end')}
      {label('strokes vs field', pad.left + w / 2, height - 8, FADED)}

      {/* legend — pinned to fixed corners so labels never collide when the two
          players are close in skill and their curve peaks overlap */}
      {label(`${a.name}  ${(pA * 100).toFixed(1)}%`, pad.left + 2, pad.top + 4, RED, 'start')}
      {label(`${b.name}  ${((1 - pA) * 100).toFixed(1)}%`, pad.left + w - 2, pad.top + 4, CHALK, 'end')}
    </svg>
  );
}
