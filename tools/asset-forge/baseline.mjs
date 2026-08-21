// The number this room gets optimised against.
//
// Usage: node tools/asset-forge/baseline.mjs [--url=…] [--out=…]
//
// Two halves. What ships (bytes on disk, measurable without a browser) and what
// happens (frames, draw calls, resident textures, how long before the room
// exists), which needs the page open and `?perf=1`.
//
// Written before any optimisation work rather than after, because "it feels
// smoother" is not a claim anyone can check and this project has already lost
// months to exactly that failure — the room was graded by eye against a broken
// render for weeks and every judgement made in that window was worthless.
// A baseline is what makes the next change arguable.

import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const flags = Object.fromEntries(
  // Split on the FIRST '=' only. `split('=')` drops everything after the
  // second one, which silently truncated `--url=…/studio?console=proxy&fold=0`
  // to `…/studio?console` — a valid URL that loads the default room. The
  // harness then captured a perfectly good frame of the wrong build and
  // reported success. Every flag this tool takes has a value that can contain
  // an '='; this is the only parse that is safe.
  process.argv.slice(2).filter((a) => a.startsWith('--')).map((a) => {
    const body = a.slice(2);
    const i = body.indexOf('=');
    return i === -1 ? [body, '1'] : [body.slice(0, i), body.slice(i + 1)];
  }),
);
const url = flags.url || 'http://localhost:3000/studio';
const outPath = flags.out || 'baseline.json';

if (!/^https?:\/\/(localhost|127\.0\.0\.1)/.test(url)) {
  console.error('Refusing non-local URL: this harness measures http://localhost only.');
  process.exit(2);
}

// Same reason as room.mjs: the container is reclaimed between sessions and
// comes back with a different Playwright build, so a pinned path is correct
// until the next restart.
function findChromium() {
  if (process.env.CHROME_BIN) return process.env.CHROME_BIN;
  const root = '/opt/pw-browsers';
  if (!fs.existsSync(root)) return undefined;
  const builds = fs.readdirSync(root)
    .filter((d) => /^chromium-\d+$/.test(d))
    .sort((a, b) => Number(a.split('-')[1]) - Number(b.split('-')[1]));
  for (const d of builds.reverse()) {
    for (const sub of ['chrome-linux64', 'chrome-linux']) {
      const bin = path.join(root, d, sub, 'chrome');
      if (fs.existsSync(bin)) return bin;
    }
  }
  return undefined;
}

const KB = 1024;
const fmt = (b) => (b > KB * KB ? `${(b / KB / KB).toFixed(2)} MB` : `${(b / KB).toFixed(0)} KB`);

function walk(dir, test) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p, test));
    else if (test(e.name)) out.push({ path: p, bytes: fs.statSync(p).size });
  }
  return out;
}

// ── what ships ──────────────────────────────────────────────────────────────
const models = walk('public/models', (n) => n.endsWith('.glb'));
const art = walk('public/art', (n) => /\.(jpe?g|png|webp)$/i.test(n));
const draco = walk('public/draco', () => true);
// .next/static is the built client bundle; absent before a production build.
const js = walk('.next/static', (n) => n.endsWith('.js'));

const sum = (a) => a.reduce((t, f) => t + f.bytes, 0);

const assets = {
  models: { count: models.length, bytes: sum(models) },
  artwork: { count: art.length, bytes: sum(art) },
  dracoDecoder: { count: draco.length, bytes: sum(draco) },
  clientJs: { count: js.length, bytes: sum(js) },
};

// The room's critical path: the decoder and the meshes must arrive before
// anything can be drawn at all. Artwork can stream in behind it.
assets.blockingBytes = assets.models.bytes + assets.dracoDecoder.bytes;

// ── what happens ────────────────────────────────────────────────────────────
const browser = await chromium.launch({
  executablePath: findChromium(),
  headless: true,
  args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--disable-dev-shm-usage'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });

const transferred = [];
page.on('response', async (r) => {
  const len = Number(r.headers()['content-length'] ?? 0);
  if (len > 0) transferred.push({ url: r.url().split('/').pop(), bytes: len });
});

const errors = [];
page.on('pageerror', (e) => errors.push(e.message.slice(0, 200)));

const probeUrl = url + (url.includes('?') ? '&' : '?') + 'perf=1';
await page.goto(probeUrl, { waitUntil: 'networkidle', timeout: 120000 });

// Long enough for the probe to accumulate a frame-time distribution. Under
// software rendering this room runs around 0.5 fps, so a short window would
// report a sample of one.
await page.waitForTimeout(45000);

const runtime = await page.evaluate(() => {
  const el = document.getElementById('studio-perf');
  return {
    perf: el?.getAttribute('data-perf') ? JSON.parse(el.getAttribute('data-perf')) : null,
    firstFrameMs: Number(el?.getAttribute('data-first-frame-ms') ?? 0),
    renderer: (() => {
      const c = document.createElement('canvas').getContext('webgl2');
      const d = c?.getExtension('WEBGL_debug_renderer_info');
      return d ? c.getParameter(d.UNMASKED_RENDERER_WEBGL) : 'unknown';
    })(),
  };
});
await browser.close();

const report = {
  takenAt: new Date().toISOString(),
  url: probeUrl,
  renderer: runtime.renderer,
  assets,
  transferredTop: transferred.sort((a, b) => b.bytes - a.bytes).slice(0, 10),
  firstFrameMs: runtime.firstFrameMs,
  runtime: runtime.perf,
  errors,
};
fs.writeFileSync(outPath, JSON.stringify(report, null, 2));

// ── report ──────────────────────────────────────────────────────────────────
console.log('\nSTUDIO BASELINE');
console.log('  renderer         ', runtime.renderer);
console.log('\n  ON DISK');
console.log('  models           ', `${assets.models.count} files`.padEnd(12), fmt(assets.models.bytes));
console.log('  draco decoder    ', `${assets.dracoDecoder.count} files`.padEnd(12), fmt(assets.dracoDecoder.bytes));
console.log('  artwork          ', `${assets.artwork.count} files`.padEnd(12), fmt(assets.artwork.bytes));
console.log('  client js        ', `${assets.clientJs.count} files`.padEnd(12), fmt(assets.clientJs.bytes));
console.log('  BLOCKING         ', ''.padEnd(12), fmt(assets.blockingBytes));

console.log('\n  AT RUNTIME');
console.log('  first frame      ', `${runtime.firstFrameMs} ms`);
if (runtime.perf) {
  const p = runtime.perf;
  console.log('  frame median     ', `${p.medianMs} ms  (${p.fps} fps)`);
  console.log('  frame p95        ', `${p.p95Ms} ms`);
  console.log('  frame worst      ', `${p.worstMs} ms`);
  console.log('  draw calls       ', p.calls);
  console.log('  triangles        ', p.triangles.toLocaleString());
  console.log('  geometries       ', p.geometries);
  console.log('  textures         ', p.textures);
  console.log('  shader programs  ', p.programs);
} else {
  console.log('  (no perf data — is PerfProbe mounted and ?perf=1 set?)');
}
console.log('\n  errors           ', errors.length ? errors.join(' | ') : 'none');
console.log(`\n  written to ${outPath}`);

// NOTE ON THE FRAME NUMBERS. This harness runs SwiftShader — software
// rasterisation on a CPU — so its frame times say nothing about real hardware
// and should never be quoted as the room's performance. What IS meaningful
// here and portable everywhere: draw calls, triangles, geometry and texture
// counts, shader program count, and every byte figure above. Those are
// properties of the scene, not of the machine drawing it.
