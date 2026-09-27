/**
 * Plate → SVG at true physical size (width/height in inches, viewBox in
 * trim inches). Open it in a browser or Illustrator and 1 in is 1 in.
 */

import type { Pt } from './geom';
import type { Plate } from './plate';

const f = (n: number): string => String(Math.round(n * 1e4) / 1e4);

const pathD = (pts: Pt[], closed: boolean): string =>
  'M' + pts.map(([x, y]) => f(x) + ' ' + f(y)).join('L') + (closed ? 'Z' : '');

function paint(stroke: string, width: number, fill?: string, dash?: number[]): string {
  return (
    ` fill="${fill ?? 'none'}" stroke="${stroke}" stroke-width="${f(width)}"` +
    ' stroke-linecap="round" stroke-linejoin="round"' +
    (dash ? ` stroke-dasharray="${dash.map(f).join(' ')}"` : '')
  );
}

export function plateToSvg(plate: Plate, idPrefix = 'repeat'): string {
  const { x0, y0, size } = plate;
  const parts: string[] = [];
  let clips = 0;
  const defs: string[] = [];
  for (const op of plate.ops) {
    switch (op.t) {
      case 'rect':
        parts.push(`<rect x="${f(op.x)}" y="${f(op.y)}" width="${f(op.w)}" height="${f(op.h)}" fill="${op.fill}"/>`);
        break;
      case 'path':
        parts.push(`<path d="${pathD(op.pts, op.closed)}"${paint(op.stroke, op.width, op.fill, op.dash)}/>`);
        break;
      case 'circle':
        parts.push(`<circle cx="${f(op.c[0])}" cy="${f(op.c[1])}" r="${f(op.r)}"${paint(op.stroke, op.width, op.fill, op.dash)}/>`);
        break;
      case 'clip': {
        const id = `${idPrefix}-clip-${clips++}`;
        defs.push(`<clipPath id="${id}"><rect x="${f(op.x)}" y="${f(op.y)}" width="${f(op.w)}" height="${f(op.h)}"/></clipPath>`);
        parts.push(`<g clip-path="url(#${id})">`);
        break;
      }
      case 'unclip':
        parts.push('</g>');
        break;
    }
  }
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${f(size)}in" height="${f(size)}in" viewBox="${f(x0)} ${f(y0)} ${f(size)} ${f(size)}">` +
    `<defs>${defs.join('')}</defs>` +
    parts.join('') +
    '</svg>'
  );
}
