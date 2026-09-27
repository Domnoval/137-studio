/**
 * Plate → PDF, with no dependencies.
 *
 * The plates are nothing but straight segments, circles and rectangles,
 * so a PDF is a short, honest file: one content stream per page, vector
 * all the way down, Helvetica for the page notes. Two layouts:
 *
 *   fullSizePdf    one page per panel at true size, for a print shop
 *   letterTilesPdf each panel split across US Letter pages with 0.5 in
 *                  overlaps and crosshairs, for a home printer
 */

import type { Pt } from './geom';
import type { Op, Plate } from './plate';
import { GUIDE_INK, mmToIn, WEIGHT_MM } from './tokens';

const PT = 72;
const n = (v: number): string => String(Math.round(v * 1e4) / 1e4);

function rgb(hex: string): string {
  const v = parseInt(hex.slice(1), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255].map((c) => n(c / 255)).join(' ');
}

const ascii = (s: string): string =>
  s.replace(/[^\x20-\x7e]/g, '-').replace(/([\\()])/g, '\\$1');

function moves(pts: Pt[], closed: boolean): string {
  const [first, ...rest] = pts;
  return `${n(first[0])} ${n(first[1])} m ` + rest.map(([x, y]) => `${n(x)} ${n(y)} l`).join(' ') + (closed ? ' h' : '');
}

function circle([cx, cy]: Pt, r: number): string {
  const k = 0.5523 * r;
  const p = (x: number, y: number) => `${n(x)} ${n(y)}`;
  return [
    `${p(cx + r, cy)} m`,
    `${p(cx + r, cy + k)} ${p(cx + k, cy + r)} ${p(cx, cy + r)} c`,
    `${p(cx - k, cy + r)} ${p(cx - r, cy + k)} ${p(cx - r, cy)} c`,
    `${p(cx - r, cy - k)} ${p(cx - k, cy - r)} ${p(cx, cy - r)} c`,
    `${p(cx + k, cy - r)} ${p(cx + r, cy - k)} ${p(cx + r, cy)} c h`,
  ].join(' ');
}

function opContent(op: Op): string {
  switch (op.t) {
    case 'rect':
      return `${rgb(op.fill)} rg ${n(op.x)} ${n(op.y)} ${n(op.w)} ${n(op.h)} re f`;
    case 'clip':
      return `q ${n(op.x)} ${n(op.y)} ${n(op.w)} ${n(op.h)} re W n`;
    case 'unclip':
      return 'Q';
    case 'path':
    case 'circle': {
      const style =
        `${rgb(op.stroke)} RG ${n(op.width)} w [${(op.dash ?? []).map(n).join(' ')}] 0 d` +
        (op.fill ? ` ${rgb(op.fill)} rg` : '');
      const geom = op.t === 'circle' ? circle(op.c, op.r) : moves(op.pts, op.closed);
      return `${style} ${geom} ${op.fill ? 'B' : 'S'}`;
    }
  }
}

/**
 * Content stream placing plate point (ox, oy) at (left, top) on a page of
 * height pageH — all in points — optionally clipped to a plate-inch rect.
 */
function plateContent(
  ops: Op[],
  place: { pageH: number; left: number; top: number; ox: number; oy: number; clip?: [number, number, number, number] },
): string {
  const tx = place.left - place.ox * PT;
  const ty = place.pageH - place.top + place.oy * PT;
  const out = ['q', '1 J 1 j', `${PT} 0 0 ${-PT} ${n(tx)} ${n(ty)} cm`];
  if (place.clip) out.push(`${place.clip.map(n).join(' ')} re W n`);
  for (const op of ops) out.push(opContent(op));
  out.push('Q');
  return out.join('\n');
}

function text(x: number, y: number, size: number, str: string): string {
  return `BT /F1 ${size} Tf ${n(x)} ${n(y)} Td (${ascii(str)}) Tj ET`;
}

interface Page {
  w: number;
  h: number;
  content: string;
}

/** The whole file is 7-bit ASCII, so a string is the file, byte for byte. */
function pdfFile(pages: Page[]): string {
  const objects: string[] = [];
  const kids = pages.map((_, i) => `${4 + 2 * i} 0 R`).join(' ');
  objects.push('<< /Type /Catalog /Pages 2 0 R >>');
  objects.push(`<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>`);
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  pages.forEach((page, i) => {
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${n(page.w)} ${n(page.h)}] ` +
        `/Resources << /Font << /F1 3 0 R >> >> /Contents ${5 + 2 * i} 0 R >>`,
    );
    objects.push(`<< /Length ${page.content.length} >>\nstream\n${page.content}\nendstream`);
  });

  let out = '%PDF-1.4\n';
  const offsets: number[] = [];
  objects.forEach((body, i) => {
    offsets.push(out.length);
    out += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = out.length;
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  out += offsets.map((o) => String(o).padStart(10, '0') + ' 00000 n \n').join('');
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return out;
}

/** One true-size page per plate — hand this to a print shop. */
export function fullSizePdf(plates: Plate[]): string {
  return pdfFile(
    plates.map((plate) => {
      const side = plate.size * PT;
      return {
        w: side,
        h: side,
        content: plateContent(plate.ops, { pageH: side, left: 0, top: 0, ox: plate.x0, oy: plate.y0 }),
      };
    }),
  );
}

const LETTER = { w: 8.5, h: 11 };
const MARGIN = 0.4;
const HEAD = 0.75;
const FOOT = 0.95;
const OVERLAP = 0.5;

/** Crosshairs down the middle of every overlap strip, so tiles register. */
function crosshairs(plate: Plate, stepX: number, stepY: number, nx: number, ny: number): Op[] {
  const ops: Op[] = [];
  const w = mmToIn(WEIGHT_MM.fine);
  const mark = (x: number, y: number) => {
    ops.push({ t: 'path', pts: [[x - 0.14, y], [x + 0.14, y]], closed: false, stroke: GUIDE_INK, width: w });
    ops.push({ t: 'path', pts: [[x, y - 0.14], [x, y + 0.14]], closed: false, stroke: GUIDE_INK, width: w });
    ops.push({ t: 'circle', c: [x, y], r: 0.07, stroke: GUIDE_INK, width: w });
  };
  const end = plate.x0 + plate.size;
  for (let c = 1; c < nx; c++) {
    const x = plate.x0 + c * stepX + OVERLAP / 2;
    for (let y = plate.y0 + 1; y < end; y += 2) mark(x, y);
  }
  for (let r = 1; r < ny; r++) {
    const y = plate.y0 + r * stepY + OVERLAP / 2;
    for (let x = plate.x0 + 1; x < end; x += 2) mark(x, y);
  }
  return ops;
}

/** Each plate tiled across US Letter pages — for a home printer. */
export function letterTilesPdf(plates: { plate: Plate; label: string }[]): string {
  const pageW = LETTER.w * PT;
  const pageH = LETTER.h * PT;
  const bw = LETTER.w - 2 * MARGIN;
  const bh = LETTER.h - HEAD - FOOT;
  const pages: Page[] = [];

  for (const { plate, label } of plates) {
    // As few pages as fit, then split evenly so every tile carries a fair share.
    const nx = Math.ceil((plate.size - OVERLAP) / (bw - OVERLAP));
    const ny = Math.ceil((plate.size - OVERLAP) / (bh - OVERLAP));
    const stepX = (plate.size - OVERLAP) / nx;
    const stepY = (plate.size - OVERLAP) / ny;
    const tw = stepX + OVERLAP;
    const th = stepY + OVERLAP;
    const ops = [...plate.ops, ...crosshairs(plate, stepX, stepY, nx, ny)];
    for (let r = 0; r < ny; r++)
      for (let c = 0; c < nx; c++) {
        const ox = plate.x0 + c * stepX;
        const oy = plate.y0 + r * stepY;
        const k = r * nx + c + 1;
        const boxBottom = pageH - HEAD * PT - th * PT;
        const content = [
          plateContent(ops, { pageH, left: MARGIN * PT, top: HEAD * PT, ox, oy, clip: [ox, oy, tw, th] }),
          `0.6 0.6 0.6 RG 0.5 w [3 3] 0 d ${n(MARGIN * PT)} ${n(boxBottom)} ${n(tw * PT)} ${n(th * PT)} re S`,
          '0.15 0.15 0.15 rg',
          text(MARGIN * PT, pageH - 0.42 * PT, 9, `${label}  -  TILE ${k} OF ${nx * ny}  (ROW ${r + 1}, COLUMN ${c + 1})`),
          `0.1 0.1 0.1 RG 0.75 w [] 0 d ${n(MARGIN * PT)} ${n(0.55 * PT)} m ${n(MARGIN * PT + PT)} ${n(0.55 * PT)} l S`,
          `${n(MARGIN * PT)} ${n(0.5 * PT)} m ${n(MARGIN * PT)} ${n(0.6 * PT)} l S`,
          `${n(MARGIN * PT + PT)} ${n(0.5 * PT)} m ${n(MARGIN * PT + PT)} ${n(0.6 * PT)} l S`,
          text(MARGIN * PT + 1.15 * PT, 0.58 * PT, 7.5, 'Print at 100% / Actual Size. The bar at left must measure exactly 1 inch.'),
          text(MARGIN * PT + 1.15 * PT, 0.42 * PT, 7.5, 'Tiles overlap by 0.5 in. Lay each crosshair exactly over its twin, then tape.'),
        ].join('\n');
        pages.push({ w: pageW, h: pageH, content });
      }
  }
  return pdfFile(pages);
}
