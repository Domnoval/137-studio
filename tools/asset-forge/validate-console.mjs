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

// ── world space ─────────────────────────────────────────────────────────────
// Everything geometric below needs WORLD coordinates, and a glTF gives you
// local ones. The first version of this file read accessor `min`/`max`
// directly and reported the proxy's height as 1.000 m when it is 1.050 m — the
// accessors describe unit cubes, and every real dimension lives in the node
// scales above them. A height check that ignores transforms only ever measures
// the modeller's primitives.
function localMatrix(n) {
  if (n.matrix) return n.matrix.slice();
  const [tx, ty, tz] = n.translation ?? [0, 0, 0];
  const [sx, sy, sz] = n.scale ?? [1, 1, 1];
  const [x, y, z, w] = n.rotation ?? [0, 0, 0, 1];
  const r = [
    1 - 2 * (y * y + z * z), 2 * (x * y + z * w), 2 * (x * z - y * w),
    2 * (x * y - z * w), 1 - 2 * (x * x + z * z), 2 * (y * z + x * w),
    2 * (x * z + y * w), 2 * (y * z - x * w), 1 - 2 * (x * x + y * y),
  ];
  // column-major, matching glTF
  return [
    r[0] * sx, r[1] * sx, r[2] * sx, 0,
    r[3] * sy, r[4] * sy, r[5] * sy, 0,
    r[6] * sz, r[7] * sz, r[8] * sz, 0,
    tx, ty, tz, 1,
  ];
}

function multiply(a, b) {
  const o = new Array(16);
  for (let c = 0; c < 4; c++) {
    for (let r = 0; r < 4; r++) {
      let v = 0;
      for (let k = 0; k < 4; k++) v += a[k * 4 + r] * b[c * 4 + k];
      o[c * 4 + r] = v;
    }
  }
  return o;
}

const IDENTITY = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

/** Every node, with its world matrix and — if it carries geometry — the world
 *  axis-aligned box of that geometry. */
const placed = [];
(function walk(indices, parent) {
  for (const i of indices ?? []) {
    const n = json.nodes?.[i];
    if (!n) continue;
    const w = multiply(parent, localMatrix(n));
    const entry = { node: n, name: n.name ?? `node_${i}`, world: w, box: null };
    if (typeof n.mesh === 'number') {
      const box = { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] };
      for (const prim of json.meshes?.[n.mesh]?.primitives ?? []) {
        const a = json.accessors?.[prim.attributes?.POSITION];
        if (!a?.min || !a?.max) continue;
        // All eight corners, because a rotated node's box is not its corners.
        for (const cx of [a.min[0], a.max[0]]) {
          for (const cy of [a.min[1], a.max[1]]) {
            for (const cz of [a.min[2], a.max[2]]) {
              for (let axis = 0; axis < 3; axis++) {
                const v =
                  w[axis] * cx + w[4 + axis] * cy + w[8 + axis] * cz + w[12 + axis];
                if (v < box.min[axis]) box.min[axis] = v;
                if (v > box.max[axis]) box.max[axis] = v;
              }
            }
          }
        }
      }
      if (Number.isFinite(box.min[1])) entry.box = box;
    }
    placed.push(entry);
    walk(n.children, w);
  }
})(json.scenes?.[json.scene ?? 0]?.nodes, IDENTITY);

const placedByName = Object.fromEntries(placed.map((p) => [p.name, p]));

// ── the loader's name rule, executable ──────────────────────────────────────
// Kept in step with normalisePart() in src/components/studio/Props.tsx. If the
// two ever disagree, this file is wrong and the room is right — the loader is
// what actually decides how the asset renders.
const PART_NAMES = [...REQUIRED.filter((n) => n !== 'ConsoleRoot'), 'Knob'].sort(
  (a, b) => b.length - a.length,
);
function normalisePart(raw) {
  const name = String(raw ?? '').replace(/\.\d+$/, '');
  for (const p of PART_NAMES) {
    if (!name.startsWith(p)) continue;
    const next = name[p.length];
    if (next === undefined || next === '_' || next === '.') return p;
  }
  return null;
}

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

// Any mesh the loader cannot resolve falls through to the single-material
// fallback grade — the exact behaviour the rebuild exists to escape. It does
// not error, it just renders as generic painted iron, so it has to be named.
const orphans = placed.filter(
  (p) => p.box && normalisePart(p.name) === null,
);
if (orphans.length) {
  warnings.push(
    `${orphans.length} mesh node(s) match no contract part and will fall through ` +
    `to the fallback grade: ${orphans.map((o) => o.name).join(', ')}. ` +
    'Rename, or parent them under the part they belong to.',
  );
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
const glass = placedByName.CRT_Glass;
const display = placedByName.CRT_Display;
if (glass?.box && display?.box) {
  // Front faces, in world Z — the gap is between the surfaces you can see, not
  // between two origins that may sit anywhere inside their own geometry.
  const gap = Math.abs(glass.box.max[2] - display.box.max[2]);
  if (gap < 0.002) {
    problems.push(
      `CRT_Glass and CRT_Display are ${(gap * 1000).toFixed(1)} mm apart. ` +
      'The contract asks for 2–4 mm: the parallax between them is what makes ' +
      'a CRT read as an object rather than a picture of one.',
    );
  } else if (gap > 0.006) {
    warnings.push(
      `CRT glass/display gap ${(gap * 1000).toFixed(1)} mm — the contract asks ` +
      'for 2–4 mm. Much more than that and the screen reads as recessed.',
    );
  } else {
    notes.push(`CRT glass/display gap ${(gap * 1000).toFixed(1)} mm`);
  }
} else if (names.has('CRT_Glass') && names.has('CRT_Display')) {
  notes.push('CRT gap not checkable (one of the nodes carries no geometry)');
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
// Height, in world space, of the parts a visitor can actually see. The
// collision hull is excluded deliberately: it is allowed to be a slab that
// swallows the whole machine, and including it would let a sloppy hull pass a
// console that is the wrong size.
const visible = placed.filter((p) => p.box && normalisePart(p.name) !== 'Collision_Console');
if (visible.length) {
  const minY = Math.min(...visible.map((p) => p.box.min[1]));
  const maxY = Math.max(...visible.map((p) => p.box.max[1]));
  const h = maxY - minY;
  if (Math.abs(h - HEIGHT_M) > HEIGHT_TOLERANCE) {
    // Not fatal: the loader normalises to a physical height anyway. But a
    // wildly different figure usually means the units are wrong.
    warnings.push(
      `Bounding height ${h.toFixed(3)} m against a contract height of ${HEIGHT_M} m. ` +
      'The loader rescales, so this is only fatal if the units are wrong.',
    );
  } else {
    notes.push(`Height ${h.toFixed(3)} m (world space, visible parts)`);
  }
  if (Math.abs(minY) > 0.01) {
    warnings.push(
      `The console's base sits at y=${minY.toFixed(3)} rather than 0. It will still ` +
      'be placed on the floor, but every offset in studio-data.ts is measured ' +
      'from a base at the origin.',
    );
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

const collision = placedByName.Collision_Console;
if (collision && typeof collision.node.mesh === 'number') {
  const prims = json.meshes?.[collision.node.mesh]?.primitives ?? [];
  const tris = prims.reduce((t, p) => {
    const idx = json.accessors?.[p.indices];
    return t + (idx ? idx.count / 3 : 0);
  }, 0);
  if (tris > MAX_COLLISION_TRIS) {
    warnings.push(`Collision_Console is ${tris} triangles; contract asks for under ${MAX_COLLISION_TRIS}.`);
  } else {
    notes.push(`Collision hull ${tris} triangles`);
  }
  // A hull smaller than the thing it stands in for is worse than no hull: the
  // pointer passes straight through the parts it misses, so the door stops
  // responding exactly where the visitor is most likely to click.
  if (collision.box && visible.length) {
    const vis = {
      min: [0, 1, 2].map((a) => Math.min(...visible.map((p) => p.box.min[a]))),
      max: [0, 1, 2].map((a) => Math.max(...visible.map((p) => p.box.max[a]))),
    };
    const slack = [0, 1, 2].map((a) =>
      Math.min(collision.box.min[a] - vis.min[a], vis.max[a] - collision.box.max[a]) * -1,
    );
    const short = slack.filter((v) => v < -0.02);
    if (short.length) {
      warnings.push(
        `Collision_Console is smaller than the console on ${short.length} axis/axes ` +
        `(by up to ${Math.abs(Math.min(...slack)) * 100 | 0} cm). Anything it misses is ` +
        'un-clickable.',
      );
    }
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
