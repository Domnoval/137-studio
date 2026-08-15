'use client';

// The shell: floor, four walls, ceiling. Deliberately NOT a generated asset.
//
// A first-person room lives or dies on whether the surfaces have grain at the
// scale your eye lands on. Flat-coloured planes read as a box no matter how
// good the props are, and an image texture at this size would cost more than
// the entire prop set. So the surfaces are painted procedurally into canvases
// at load: mottled stone for the walls, wet-looking concrete for the floor,
// and a chalk layer of equations and glyphs on the back wall — the thing
// Michael actually has on his walls.
//
// Everything is generated once and cached; the canvases never re-render.

import { useMemo } from 'react';
import * as THREE from 'three';
import { ROOM } from './studio-data';

/** Value noise, smoothed — cheap and good enough under this much shadow. */
function noise(ctx: CanvasRenderingContext2D, w: number, h: number, cells: number, alpha: number) {
  const g = document.createElement('canvas');
  g.width = cells; g.height = cells;
  const gc = g.getContext('2d')!;
  const img = gc.createImageData(cells, cells);
  for (let i = 0; i < cells * cells; i++) {
    const v = 140 + Math.random() * 115;
    img.data[i * 4] = v;
    img.data[i * 4 + 1] = v * 0.97;
    img.data[i * 4 + 2] = v * 0.92;
    img.data[i * 4 + 3] = 255;
  }
  gc.putImageData(img, 0, 0);
  ctx.globalAlpha = alpha;
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(g, 0, 0, w, h);
  ctx.globalAlpha = 1;
}

/** Stone: layered noise at three frequencies, plus dark blotching and a few
 *  hairline cracks. The blotches are what stop it reading as sandpaper. */
function stoneCanvas(size = 1024) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const x = c.getContext('2d')!;

  x.fillStyle = '#211e1c';
  x.fillRect(0, 0, size, size);

  noise(x, size, size, 8, 0.55);   // broad tonal drift
  noise(x, size, size, 64, 0.28);  // mid grain
  noise(x, size, size, 256, 0.16); // fine tooth

  // damp patches and soot
  for (let i = 0; i < 42; i++) {
    const px = Math.random() * size, py = Math.random() * size;
    const r = 40 + Math.random() * 190;
    const g = x.createRadialGradient(px, py, 0, px, py, r);
    const dark = Math.random() > 0.35;
    g.addColorStop(0, dark ? 'rgba(10,9,8,0.42)' : 'rgba(120,110,98,0.13)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g;
    x.beginPath(); x.arc(px, py, r, 0, Math.PI * 2); x.fill();
  }

  // cracks
  x.strokeStyle = 'rgba(8,7,6,0.55)';
  for (let i = 0; i < 14; i++) {
    x.lineWidth = 0.6 + Math.random() * 1.4;
    x.beginPath();
    let px = Math.random() * size, py = Math.random() * size;
    x.moveTo(px, py);
    const steps = 6 + Math.floor(Math.random() * 10);
    for (let s = 0; s < steps; s++) {
      px += (Math.random() - 0.5) * 90;
      py += (Math.random() - 0.5) * 90;
      x.lineTo(px, py);
    }
    x.stroke();
  }
  return c;
}

/** Wet concrete — same idea, cooler and with pooled sheen. */
function floorCanvas(size = 1024) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const x = c.getContext('2d')!;
  x.fillStyle = '#171618';
  x.fillRect(0, 0, size, size);
  noise(x, size, size, 6, 0.42);
  noise(x, size, size, 128, 0.2);
  for (let i = 0; i < 26; i++) {
    const px = Math.random() * size, py = Math.random() * size;
    const r = 70 + Math.random() * 240;
    const g = x.createRadialGradient(px, py, 0, px, py, r);
    g.addColorStop(0, 'rgba(46,52,60,0.30)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g;
    x.beginPath(); x.arc(px, py, r, 0, Math.PI * 2); x.fill();
  }
  return c;
}

/** Roughness map for the floor: the damp patches are SMOOTHER than the dry
 *  concrete around them, which is the whole reason a wet floor reads as wet. */
function floorRoughCanvas(size = 512) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const x = c.getContext('2d')!;
  x.fillStyle = '#e0e0e0'; // rough by default
  x.fillRect(0, 0, size, size);
  for (let i = 0; i < 26; i++) {
    const px = Math.random() * size, py = Math.random() * size;
    const r = 35 + Math.random() * 120;
    const g = x.createRadialGradient(px, py, 0, px, py, r);
    g.addColorStop(0, 'rgba(40,40,40,0.85)'); // polished
    g.addColorStop(1, 'rgba(224,224,224,0)');
    x.fillStyle = g;
    x.beginPath(); x.arc(px, py, r, 0, Math.PI * 2); x.fill();
  }
  return c;
}

/** The chalk wall. Hand-drawn equations and invented glyphs, scrawled at a
 *  slight angle in clusters, the way someone actually works a wall over.
 *
 *  SCALE IS THE WHOLE GAME HERE. The canvas maps to the full 7.4 × 3.5 m wall,
 *  so a 26 px glyph on a 2048 px canvas is a 9 cm letter and a short equation
 *  ends up a metre wide — which is what the first render showed, and it read
 *  as an HTML overlay rather than writing on stone. Real chalk working is
 *  ~4 cm tall. Everything below is sized against that, and there is a lot more
 *  of it: density is what sells a wall someone has been thinking on for years,
 *  not size. */
function chalkCanvas(w = 2048, h = 1024) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const x = c.getContext('2d')!;
  x.clearRect(0, 0, w, h);

  const marks = [
    'a = 1/137.035999', 'E = mc2', 'f = 1/T', 'r = e^(b0)', 'F = phi',
    'dS >= 0', 'y = 137', 'n -> inf', 'i^2 = -1', 'c = 299792458',
    'h = 6.626e-34', 'sum 1/n^2', 'x = -b/2a', 'lim f(x)',
  ];
  const glyphs = '△▽◇○◎☉⊕⊗✧✦⟁⟠⌬⎈⏣✕⧗⧖';

  x.fillStyle = 'rgba(232,228,220,0.30)';

  // clusters of working — many, small, tilted, sometimes overlapping
  for (let cl = 0; cl < 150; cl++) {
    const cx = Math.random() * w, cy = Math.random() * h;
    const tilt = (Math.random() - 0.5) * 0.20;
    const px = 7 + Math.random() * 6; // ≈ 2.4–4.4 cm letters on the wall
    x.save();
    x.translate(cx, cy);
    x.rotate(tilt);
    x.font = `${px}px ui-monospace, monospace`;
    const lines = 1 + Math.floor(Math.random() * 5);
    for (let i = 0; i < lines; i++) {
      x.globalAlpha = 0.13 + Math.random() * 0.24;
      x.fillText(marks[Math.floor(Math.random() * marks.length)], 0, i * px * 1.35);
    }
    x.restore();
  }

  // loose sigils, drawn bigger than the writing but still hand-sized
  for (let i = 0; i < 130; i++) {
    x.save();
    x.translate(Math.random() * w, Math.random() * h);
    x.rotate((Math.random() - 0.5) * 0.7);
    x.globalAlpha = 0.08 + Math.random() * 0.2;
    x.font = `${9 + Math.random() * 17}px serif`;
    x.fillText(glyphs[Math.floor(Math.random() * glyphs.length)], 0, 0);
    x.restore();
  }

  // rubbed-out working. Kept very faint — at 0.05 these read as bright blobs
  // floating in front of the wall rather than as smeared chalk.
  for (let i = 0; i < 30; i++) {
    const px = Math.random() * w, py = Math.random() * h;
    const r = 25 + Math.random() * 85;
    const g = x.createRadialGradient(px, py, 0, px, py, r);
    g.addColorStop(0, 'rgba(232,228,220,0.016)');
    g.addColorStop(1, 'rgba(232,228,220,0)');
    x.globalAlpha = 1;
    x.fillStyle = g;
    x.beginPath(); x.arc(px, py, r, 0, Math.PI * 2); x.fill();
  }
  return c;
}

function useTex(make: () => HTMLCanvasElement, repeat: [number, number], srgb: boolean) {
  return useMemo(() => {
    const t = new THREE.CanvasTexture(make());
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat[0], repeat[1]);
    t.anisotropy = 8;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    return t;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

export function Room() {
  const { width: W, depth: D, height: H } = ROOM;

  const stone = useTex(() => stoneCanvas(), [3, 1.6], true);
  const floorMap = useTex(() => floorCanvas(), [4, 4], true);
  const floorRough = useTex(() => floorRoughCanvas(), [4, 4], false);
  const chalk = useTex(() => chalkCanvas(), [1, 1], true);

  const wall = (
    <meshStandardMaterial map={stone} roughness={0.94} metalness={0} color="#8a8078" />
  );

  return (
    <group>
      {/* floor — wet, so it carries the neon down onto itself */}
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[W, D]} />
        <meshStandardMaterial
          map={floorMap}
          roughnessMap={floorRough}
          roughness={1}
          metalness={0.22}
          color="#6f6a68"
        />
      </mesh>

      {/* ceiling — unlit and far enough up to stay a suggestion */}
      <mesh position={[0, H, 0]} rotation-x={Math.PI / 2}>
        <planeGeometry args={[W, D]} />
        <meshStandardMaterial map={stone} roughness={1} color="#3a3632" />
      </mesh>

      {/* back wall, the one you face */}
      <mesh position={[0, H / 2, -D / 2]} receiveShadow>
        <planeGeometry args={[W, H]} />
        {wall}
      </mesh>
      {/* the chalk sits just proud of the stone so it never z-fights */}
      <mesh position={[0, H / 2, -D / 2 + 0.004]}>
        <planeGeometry args={[W, H]} />
        <meshBasicMaterial map={chalk} transparent opacity={0.55} depthWrite={false} />
      </mesh>

      {/* side walls */}
      <mesh position={[-W / 2, H / 2, 0]} rotation-y={Math.PI / 2} receiveShadow>
        <planeGeometry args={[D, H]} />
        {wall}
      </mesh>
      <mesh position={[W / 2, H / 2, 0]} rotation-y={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[D, H]} />
        {wall}
      </mesh>

      {/* wall behind the seat — you can turn far enough to catch it */}
      <mesh position={[0, H / 2, D / 2]} rotation-y={Math.PI}>
        <planeGeometry args={[W, H]} />
        {wall}
      </mesh>
    </group>
  );
}
