// Batch turntable renderer for the studio prop set.
// Usage: node render.mjs <outDir> <model.glb> [<model.glb> ...]
// Captures each prop in three passes — studio (form/materials), room (does it
// belong in the 137 palette), wireframe (topology) — at fixed angles.
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

const [outRoot, ...models] = process.argv.slice(2);
if (!outRoot || !models.length) {
  console.error('usage: node render.mjs <outDir> <model.glb> [...]');
  process.exit(2);
}

// Per-prop material correction for the image-to-3D bake's tendency to lift
// dark surfaces toward pale and smooth. Anything not listed renders ungraded.
// emis > 1 only for props whose glow is the point — screens, tubes, flames.
const GRADES = {
  // The two-view bake gave the radio a much hotter emissive map than the
  // single-view one; 2.2 blew the whole dial face to white.
  radio:      { tint: 0.90, rough: 0.30, emis: 1.2 },
  console:    { tint: 0.55, rough: 0.55, emis: 2.2 },
  monitors:   { tint: 0.70, rough: 0.50, emis: 1.8 },
  neon:       { tint: 1.00, rough: 0.30, emis: 3.0 },
  candelabra: { tint: 0.75, rough: 0.60, emis: 2.4 },
  desk:       { tint: 0.75, rough: 0.55 },
  easel:      { tint: 0.70, rough: 0.60 },
  grimoire:   { tint: 0.75, rough: 0.65 },
  orrery:     { tint: 0.80, rough: 0.40 },
  apothecary: { tint: 0.85, rough: 0.35 },
  canvases:   { tint: 0.75, rough: 0.65 },
  telephone:  { tint: 0.70, rough: 0.55 },
  plant:      { tint: 0.80, rough: 0.60 },
};

const VIEWS = [
  [ 25,  10, 'studio', 'hero'   ],
  [  0,   6, 'studio', 'front'  ],
  [ 90,   6, 'studio', 'side'   ],
  [180,   6, 'studio', 'back'   ],
  [ 35,  48, 'studio', 'top'    ],
  [ 25,  10, 'room',   'room'   ],
  [325,  12, 'room',   'roomAlt'],
  [ 25,  10, 'wire',   'wire'   ],
];

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1208/chrome-linux64/chrome',
  headless: true,
  args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--disable-dev-shm-usage'],
});

const report = [];

for (const model of models) {
  const name = path.basename(model, '.glb');
  const dir  = path.join(outRoot, name);
  fs.mkdirSync(dir, { recursive: true });
  const errs = [];

  const page = await browser.newPage({ viewport: { width: 1520, height: 1520 }, deviceScaleFactor: 1 });
  page.on('console',   m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));

  try {
    const g = GRADES[name] || {};
    const qs = new URLSearchParams({
      model, tint: g.tint ?? 1, rough: g.rough ?? 0, emis: g.emis ?? 1,
    });
    await page.goto(`http://127.0.0.1:8137/?${qs}`, { waitUntil: 'load' });
    await page.waitForFunction(() => window.__ready === true, { timeout: 120000 });

    for (const [deg, elev, mode, label] of VIEWS) {
      await page.evaluate(([d, e, m]) => window.__setView(d, e, m), [deg, elev, mode]);
      await page.waitForTimeout(650);
      await page.screenshot({ path: path.join(dir, `${label}.png`) });
    }
    console.log(`ok   ${name}  (${errs.length} errors)`);
    report.push({ name, ok: true, errors: errs.length });
  } catch (e) {
    console.log(`FAIL ${name}: ${e.message}`);
    report.push({ name, ok: false, error: e.message });
  }

  fs.writeFileSync(path.join(dir, 'errors.txt'), errs.length ? [...new Set(errs)].join('\n') : 'NO ERRORS');
  await page.close();
}

await browser.close();
fs.writeFileSync(path.join(outRoot, 'report.json'), JSON.stringify(report, null, 2));
console.log('\n' + report.filter(r => r.ok).length + '/' + report.length + ' rendered');
