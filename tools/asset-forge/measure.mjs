// Exposure audit for a directory of renders.
//
// This exists because "it looks a bit dark" and "40.9% of the frame is crushed
// below 8/255" are the same observation, and only one of them can be argued
// with. The room spent months being tuned by eye against a bug, so every
// grading change from here gets a number attached before it gets an opinion.
//
// Usage: node measure.mjs <dir> [<dir> …]
//
// Reads PNGs with zero dependencies — Node can already inflate, and a PNG is
// a length-prefixed chunk stream with a zlib payload and a one-byte filter on
// each scanline. Pulling in a decoder for that would be sillier than the 60
// lines below.

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

/** Decode a non-interlaced 8-bit RGB/RGBA PNG to {w, h, ch, data}. */
function decodePNG(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('not a PNG');
  let p = 8, w = 0, h = 0, bitDepth = 0, colorType = 0, interlace = 0;
  const idat = [];
  while (p < buf.length) {
    const len = buf.readUInt32BE(p);
    const type = buf.toString('ascii', p + 4, p + 8);
    const body = buf.subarray(p + 8, p + 8 + len);
    if (type === 'IHDR') {
      w = body.readUInt32BE(0); h = body.readUInt32BE(4);
      bitDepth = body[8]; colorType = body[9]; interlace = body[12];
    } else if (type === 'IDAT') idat.push(body);
    else if (type === 'IEND') break;
    p += 12 + len; // length + type + data + crc
  }
  if (bitDepth !== 8) throw new Error(`bit depth ${bitDepth} unsupported`);
  if (interlace !== 0) throw new Error('interlaced PNG unsupported');
  const ch = { 0: 1, 2: 3, 4: 2, 6: 4 }[colorType];
  if (!ch) throw new Error(`colour type ${colorType} unsupported`);

  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = w * ch;
  const out = Buffer.alloc(h * stride);

  // Undo the per-scanline filters. Each row is prefixed with its filter byte;
  // `a` is the pixel to the left, `b` above, `c` above-left.
  for (let y = 0; y < h; y++) {
    const filter = raw[y * (stride + 1)];
    const src = y * (stride + 1) + 1;
    const dst = y * stride;
    const prev = dst - stride;
    for (let i = 0; i < stride; i++) {
      const x = raw[src + i];
      const a = i >= ch ? out[dst + i - ch] : 0;
      const b = y > 0 ? out[prev + i] : 0;
      const c = y > 0 && i >= ch ? out[prev + i - ch] : 0;
      let v;
      switch (filter) {
        case 0: v = x; break;
        case 1: v = x + a; break;
        case 2: v = x + b; break;
        case 3: v = x + ((a + b) >> 1); break;
        case 4: {
          const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c);
          v = x + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c);
          break;
        }
        default: throw new Error(`bad filter ${filter} on row ${y}`);
      }
      out[dst + i] = v & 0xff;
    }
  }
  return { w, h, ch, data: out };
}

/** Rec. 709 luminance histogram over every pixel. */
function stats(img) {
  const { w, h, ch, data } = img;
  const hist = new Uint32Array(256);
  for (let i = 0; i < w * h; i++) {
    const p = i * ch;
    const y = ch < 3
      ? data[p]
      : data[p] * 0.2126 + data[p + 1] * 0.7152 + data[p + 2] * 0.0722;
    hist[Math.min(255, Math.round(y))]++;
  }
  const total = w * h;
  const at = (frac) => {
    let acc = 0;
    for (let v = 0; v < 256; v++) { acc += hist[v]; if (acc >= total * frac) return v; }
    return 255;
  };
  let sum = 0, crushed = 0, blown = 0;
  for (let v = 0; v < 256; v++) {
    sum += v * hist[v];
    // 8/255 is where an 8-bit sRGB frame stops carrying recoverable detail;
    // 250 is where it stops carrying any.
    if (v < 8) crushed += hist[v];
    if (v > 250) blown += hist[v];
  }
  return {
    mean: sum / total,
    p05: at(0.05), median: at(0.5), p95: at(0.95),
    crushed: (crushed / total) * 100,
    blown: (blown / total) * 100,
    // Fraction of the frame in the midtones — the band where texture, relief
    // and material actually read. A room can have a fine mean and still be
    // all floor and ceiling with nothing in between.
    mids: (() => {
      let m = 0;
      for (let v = 40; v <= 200; v++) m += hist[v];
      return (m / total) * 100;
    })(),
  };
}

const dirs = process.argv.slice(2);
if (!dirs.length) {
  console.error('usage: node measure.mjs <dir> [<dir> …]');
  process.exit(2);
}

for (const dir of dirs) {
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.png')).sort();
  if (!files.length) { console.log(`${dir}: no PNGs`); continue; }
  console.log(`\n${dir}`);
  console.log('  view          mean   p05  med  p95   crushed   mids   blown');
  const agg = [];
  for (const f of files) {
    let s;
    try {
      s = stats(decodePNG(fs.readFileSync(path.join(dir, f))));
    } catch (e) {
      console.log(`  ${f.padEnd(13)} FAILED: ${e.message}`);
      continue;
    }
    agg.push(s);
    console.log(
      `  ${path.basename(f, '.png').padEnd(13)}` +
      `${s.mean.toFixed(1).padStart(5)}` +
      `${String(s.p05).padStart(6)}${String(s.median).padStart(5)}${String(s.p95).padStart(5)}` +
      `${(s.crushed.toFixed(1) + '%').padStart(10)}` +
      `${(s.mids.toFixed(1) + '%').padStart(8)}` +
      `${(s.blown.toFixed(2) + '%').padStart(8)}`,
    );
  }
  if (agg.length) {
    const avg = (k) => agg.reduce((t, s) => t + s[k], 0) / agg.length;
    console.log(
      `  ${'AVERAGE'.padEnd(13)}${avg('mean').toFixed(1).padStart(5)}` +
      `${Math.round(avg('p05')).toString().padStart(6)}` +
      `${Math.round(avg('median')).toString().padStart(5)}` +
      `${Math.round(avg('p95')).toString().padStart(5)}` +
      `${(avg('crushed').toFixed(1) + '%').padStart(10)}` +
      `${(avg('mids').toFixed(1) + '%').padStart(8)}` +
      `${(avg('blown').toFixed(2) + '%').padStart(8)}`,
    );
  }
}

// What good looks like, for a deliberately dark practical-lit interior:
//   median  ~45–75    crushed  under ~15%    mids  over ~45%    blown under ~1%
// The pre-fix room measured median 8–18, crushed 40–47%, blown 0.1%: not dark,
// but missing — nearly half of every frame carried no information at all.
