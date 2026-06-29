#!/usr/bin/env node
/**
 * Phase 4 — silent capture of /genesis for sharing.
 *
 * Loads the route, triggers the "touch the void" gesture, records one full
 * 54s pass at 1080p, and writes genesis.webm. Convert to mp4 / gif with the
 * ffmpeg lines printed at the end (ffmpeg ships in this repo's browser image
 * at /opt/pw-browsers/ffmpeg-*, or use a system ffmpeg).
 *
 * Run the HEAVY render on Gary, not Daywalker (per the brief).
 *
 *   1. npm run build && PORT=3137 npm run start &     # serve a prod build
 *   2. npm i -D playwright-core                        # capture-only dep
 *   3. node scripts/capture-genesis.mjs                # → genesis.webm
 *   4. ffmpeg ... (see printed commands)               # → genesis.mp4 / .gif
 *
 * Env overrides: BASE_URL, OUT_DIR, CHROME (executablePath), DURATION_MS.
 */
import { chromium } from 'playwright-core';
import { existsSync } from 'node:fs';

const BASE = process.env.BASE_URL || 'http://localhost:3137';
const OUT = process.env.OUT_DIR || '.';
const DURATION = Number(process.env.DURATION_MS || 56000); // 54s pass + a beat
const W = 1920;
const H = 1080;

// Find a Chromium: explicit CHROME env, the repo browser image, or PATH.
const CHROME =
  process.env.CHROME ||
  ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome'].find((p) =>
    existsSync(p),
  );

const browser = await chromium.launch(
  CHROME ? { executablePath: CHROME } : {},
);
const context = await browser.newContext({
  viewport: { width: W, height: H },
  recordVideo: { dir: OUT, size: { width: W, height: H } },
  reducedMotion: 'no-preference', // capture the full animation, not the still
});
const page = await context.newPage();
await page.goto(`${BASE}/genesis`, { waitUntil: 'networkidle' });

// The gesture: start the clock (audio stays muted — this is a silent capture).
await page.getByRole('button', { name: /touch the void/i }).click();

// One full pass. The piece holds on the final point, so a touch of overrun is
// harmless and gives the collapse room to breathe.
await page.waitForTimeout(DURATION);

await context.close(); // flushes the video file
await browser.close();

console.log('\nRecorded genesis.webm in', OUT);
console.log('\nConvert to a clean 1080p mp4:');
console.log(
  `  ffmpeg -i ${OUT}/genesis.webm -vf "scale=${W}:${H},format=yuv420p" -c:v libx264 -crf 18 -preset slow -movflags +faststart ${OUT}/genesis.mp4`,
);
console.log('\nOptional looping social gif:');
console.log(
  `  ffmpeg -i ${OUT}/genesis.webm -vf "fps=24,scale=720:-1:flags=lanczos" -loop 0 ${OUT}/genesis.gif`,
);
