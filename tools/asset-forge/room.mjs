// The room loop: render → inspect → refine, at scene scale.
//
// This is the one idea worth taking from Tencent's WorldClaw paper. Their
// pipeline places objects, renders the frame, has an agent LOOK at the render,
// fixes what is wrong, and repeats. That last stage is what turns a pile of
// individually-correct props into a room that feels composed — and it is the
// only part of that system we did not already have.
//
// Ours needs no Blender and no H20s: the room is already in a browser, so the
// loop is a headless Chromium, a pointer, and a contact sheet.
//
// Usage: node room.mjs <outDir> [--url=…] [--settle=9000]
//
// The rig drives the seated look by dispatching pointer moves at fixed
// normalised positions, which is exactly how a visitor turns their head — so
// what lands in the sheet is what they would actually see, not a debug camera
// flying to coordinates they can never reach.

import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const flags = Object.fromEntries(
  process.argv.slice(2).filter((a) => a.startsWith('--')).map((a) => a.slice(2).split('=')),
);
const outDir = args[0] || './room';
const url = flags.url || 'http://localhost:3000/studio';
const settle = parseInt(flags.settle || '9000', 10);

// This harness captures the local dev server only. Capturing external sites
// would mean getting Chromium through the sandbox's outbound proxy, which is a
// network security control — not something to engineer around.
if (!/^https?:\/\/(localhost|127\.0\.0\.1)/.test(url)) {
  console.error('Refusing non-local URL: this harness captures http://localhost only.');
  process.exit(2);
}

// Normalised pointer positions (-1…1 mapped to 0…1 of the canvas) and what
// each one is for. Named so a failure in the sheet says which view broke.
const VIEWS = [
  [0.50, 0.50, 'ahead'],      // the resting view — the console and the wall
  [0.50, 0.22, 'up'],         // ceiling, the top of the monitor bank
  [0.50, 0.82, 'down'],       // the bench top, where the small doors live
  [0.02, 0.50, 'left'],       // the easel — the way into the paintings
  [0.98, 0.50, 'right'],      // the neon, the orrery, the apothecary
  [0.20, 0.70, 'leftdown'],   // telephone and candelabra
  [0.80, 0.70, 'rightdown'],  // radio and grimoire on the bench
];

// The look is a damped spring at ~4.2/s, so it needs ~1.5 s of WALL CLOCK to
// arrive. Under SwiftShader this page runs at 2–4 fps, and the rig clamps dt
// to 50 ms so a stalled tab cannot snap the head round — which means at 3 fps
// the head travels at a fraction of real-time speed. Waiting 1.5 s here caught
// the camera mid-turn and made every view look like the resting one. This is
// a harness problem, not a product one: on real hardware the same motion is
// correct in 1.5 s.
const LOOK_SETTLE = 4200;

fs.mkdirSync(outDir, { recursive: true });
const errors = [];

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1208/chrome-linux64/chrome',
  headless: true,
  args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--disable-dev-shm-usage'],
});

const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));

await page.goto(url, { waitUntil: 'networkidle', timeout: 90000 }).catch((e) => {
  errors.push('NAV: ' + e.message);
});

// Twelve GLBs on software rendering; the opening head-tilt alone is 1.6 s.
await page.waitForTimeout(settle);

const box = await page.evaluate(() => {
  const c = document.querySelector('canvas');
  if (!c) return null;
  const r = c.getBoundingClientRect();
  return { x: r.x, y: r.y, w: r.width, h: r.height };
});
if (!box) {
  errors.push('NO CANVAS — the scene never mounted');
} else {
  for (const [nx, ny, name] of VIEWS) {
    await page.mouse.move(box.x + box.w * nx, box.y + box.h * ny);
    await page.waitForTimeout(LOOK_SETTLE);
    await page.screenshot({ path: path.join(outDir, `${name}.png`) });
    console.log('shot', name);
  }
}

await browser.close();
fs.writeFileSync(
  path.join(outDir, 'errors.txt'),
  errors.length ? [...new Set(errors)].join('\n') : 'NO CONSOLE ERRORS',
);
console.log(`done: ${outDir} | console errors: ${errors.length}`);
if (errors.length) console.log([...new Set(errors)].slice(0, 6).join('\n'));
