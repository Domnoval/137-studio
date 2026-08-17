// Check a console GLB against docs/console-asset-contract.md.
//
// Usage: node tools/asset-forge/validate-console.mjs [path/to/consoleMV.glb]
//
// The contract's whole purpose is that engineering can build against named
// nodes before the real asset exists, and the real asset then drops in with no
// rework. That only holds if the names actually match, and a typo is invisible
// until something silently renders untextured — `CRT_glass` instead of
// `CRT_Glass` costs an afternoon to find and a second to fix.
//
// So this is the contract, executable. Run it on an export before sending it.
// Zero dependencies: a GLB is a 12-byte header followed by length-prefixed
// chunks, and the first chunk is the glTF JSON.

import fs from 'node:fs';
import path from 'node:path';

const file = process.argv[2] || 'public/models/consoleMV.glb';

if (!fs.existsSync(file)) {
  console.error(`No such file: ${file}`);
  process.exit(2);
}

function readGLB(p) {
  const buf = fs.readFileSync(p);
  if (buf.readUInt32LE(0) !== 0x46546c67) throw new Error('not a GLB (bad magic)');
  const jsonLength = buf.readUInt32LE(12);
  return {
    json: JSON.parse(buf.subarray(20, 20 + jsonLength).toString('utf8')),
    bytes: buf.length,
  };
}

// ── the contract ────────────────────────────────────────────────────────────
const REQUIRED = [
  'ConsoleRoot',
  'Body_Iron',
  'Trim_Brass',
  'CRT_Bezel',
  'CRT_Glass',
  'CRT_Display',
  'Panel_Controls',
  'Collision_Console',
  'FocusAnchor',
];
const REQUIRED_MATERIALS = ['M_Iron', 'M_Brass', 'M_Glass', 'M_Display'];
const HEIGHT_M = 1.05;
const HEIGHT_TOLERANCE = 0.06;
const MAX_TEXTURE_MB = 12;
const MAX_COLLISION_TRIS = 40;

const { json, bytes } = readGLB(file);
const names = new Set((json.nodes ?? []).map((n) => n.name).filter(Boolean));
const materials = (json.materials ?? []).map((m) => m.name).filter(Boolean);

const problems = [];
const warnings = [];
const notes = [];

// ── node names ──────────────────────────────────────────────────────────────
for (const want of REQUIRED) {
  if (names.has(want)) continue;
  // A near-miss is worth more than "missing": it is almost always a case slip
  // or a Blender .001 suffix, and saying so turns a hunt into a rename.
  const near = [...names].find(
    (n) => n.toLowerCase() === want.toLowerCase() || n.replace(/\.\d+$/, '') === want,
  );
  problems.push(near ? `Node "${want}" missing — found "${near}"` : `Node "${want}" missing`);
}

const knobs = [...names].filter((n) => /^Knob_\d+$/.test(n));
if (knobs.length === 0) warnings.push('No Knob_NN nodes. Expected each knob as its own node.');
else notes.push(`${knobs.length} knob nodes`);

// Levers are explicitly NOT in the contract — the 4-bit machine was declined.
// If they turn up, the modeller is working from the wrong document.
const levers = [...names].filter((n) => /^Lever_\d+$/.test(n));
if (levers.length) {
  warnings.push(
    `Found ${levers.length} Lever_N nodes. The 4-bit lever machine was NOT adopted ` +
    '— navigation is objects, not a code. Check you are on contract v1.',
  );
}

// ── materials ───────────────────────────────────────────────────────────────
for (const want of REQUIRED_MATERIALS) {
  if (!materials.includes(want)) problems.push(`Material "${want}" missing`);
}
if (materials.length > REQUIRED_MATERIALS.length) {
  warnings.push(
    `${materials.length} materials, contract allows ${REQUIRED_MATERIALS.length} ` +
    `(${materials.join(', ')}). Each extra one is a draw call.`,
  );
}

// ── the CRT must be three objects with a real gap ───────────────────────────
if (names.has('CRT_Glass') && names.has('CRT_Display')) {
  const byName = Object.fromEntries((json.nodes ?? []).map((n) => [n.name, n]));
  const gz = byName.CRT_Glass?.translation?.[2];
  const dz = byName.CRT_Display?.translation?.[2];
  if (typeof gz === 'number' && typeof dz === 'number') {
    const gap = Math.abs(gz - dz);
    if (gap < 0.002) {
      problems.push(
        `CRT_Glass and CRT_Display are ${(gap * 1000).toFixed(1)} mm apart. ` +
        'The contract asks for 2–4 mm: the parallax between them is what makes ' +
        'a CRT read as an object rather than a picture of one.',
      );
    } else {
      notes.push(`CRT glass/display gap ${(gap * 1000).toFixed(1)} mm`);
    }
  } else {
    notes.push('CRT gap not checkable (nodes have no explicit translation)');
  }
}

// ── metalness: the mistake this whole room already paid for ─────────────────
for (const m of json.materials ?? []) {
  const pbr = m.pbrMetallicRoughness ?? {};
  const hasFactor = typeof pbr.metallicFactor === 'number';
  if (pbr.metallicRoughnessTexture && !hasFactor) {
    warnings.push(
      `Material "${m.name}" has a metallicRoughness texture and no metallicFactor. ` +
      'glTF reads that as 1.0 — fully metal. That is exactly what made the old ' +
      'console render as liquid chrome.',
    );
  }
  if (hasFactor && pbr.metallicFactor > 0.2 && pbr.metallicFactor < 0.8) {
    notes.push(
      `Material "${m.name}" metallicFactor ${pbr.metallicFactor} — real surfaces ` +
      'are metal or not; values in the middle are usually a slip.',
    );
  }
}

// ── scale ───────────────────────────────────────────────────────────────────
const scene = json.scenes?.[json.scene ?? 0];
if (scene && json.nodes) {
  const root = (json.nodes ?? []).find((n) => n.name === 'ConsoleRoot');
  const s = root?.scale;
  if (s && s.some((v) => Math.abs(v - 1) > 0.001)) {
    warnings.push(`ConsoleRoot has a non-unit scale (${s.join(', ')}). Apply transforms before export.`);
  }
}
// Real height needs accessor bounds, which the JSON chunk does carry.
const meshBounds = [];
for (const a of json.accessors ?? []) {
  if (a.min?.length === 3 && a.max?.length === 3) meshBounds.push([a.min, a.max]);
}
if (meshBounds.length) {
  const minY = Math.min(...meshBounds.map(([mn]) => mn[1]));
  const maxY = Math.max(...meshBounds.map(([, mx]) => mx[1]));
  const h = maxY - minY;
  if (Math.abs(h - HEIGHT_M) > HEIGHT_TOLERANCE) {
    // Not fatal: the loader normalises to a physical height anyway. But a
    // wildly different figure usually means the units are wrong.
    warnings.push(
      `Bounding height ${h.toFixed(3)} m against a contract height of ${HEIGHT_M} m. ` +
      'The loader rescales, so this is only fatal if the units are wrong.',
    );
  } else {
    notes.push(`Height ${h.toFixed(3)} m`);
  }
}

// ── budget ──────────────────────────────────────────────────────────────────
const textureBytes = (json.images ?? []).reduce((t, im) => {
  const bv = json.bufferViews?.[im.bufferView];
  return t + (bv?.byteLength ?? 0);
}, 0);
if (textureBytes > MAX_TEXTURE_MB * 1024 * 1024) {
  warnings.push(
    `Textures total ${(textureBytes / 1048576).toFixed(1)} MB, contract allows ${MAX_TEXTURE_MB} MB.`,
  );
}
notes.push(`File ${(bytes / 1048576).toFixed(2)} MB, textures ${(textureBytes / 1048576).toFixed(2)} MB`);

const collision = (json.nodes ?? []).find((n) => n.name === 'Collision_Console');
if (collision && typeof collision.mesh === 'number') {
  const prims = json.meshes?.[collision.mesh]?.primitives ?? [];
  const tris = prims.reduce((t, p) => {
    const idx = json.accessors?.[p.indices];
    return t + (idx ? idx.count / 3 : 0);
  }, 0);
  if (tris > MAX_COLLISION_TRIS) {
    warnings.push(`Collision_Console is ${tris} triangles; contract asks for under ${MAX_COLLISION_TRIS}.`);
  } else {
    notes.push(`Collision hull ${tris} triangles`);
  }
}

// ── report ──────────────────────────────────────────────────────────────────
const rel = path.relative(process.cwd(), file);
console.log(`\nCONSOLE CONTRACT CHECK — ${rel}`);
console.log(`  nodes ${names.size} · materials ${materials.length}\n`);

for (const n of notes) console.log(`  ·  ${n}`);
if (notes.length) console.log('');
for (const w of warnings) console.log(`  !  ${w}`);
if (warnings.length) console.log('');
for (const p of problems) console.log(`  ✗  ${p}`);

if (problems.length === 0) {
  console.log(
    warnings.length
      ? `\n  PASSES the contract, with ${warnings.length} thing(s) worth a look.\n`
      : '\n  PASSES the contract cleanly. This will drop straight in.\n',
  );
} else {
  console.log(`\n  FAILS on ${problems.length} required item(s). See docs/console-asset-contract.md.\n`);
}
process.exit(problems.length ? 1 : 0);
