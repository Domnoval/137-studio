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
//
// ALBEDO IS NOT MOOD. This base was #2b1a1c for most of the room's life, and
// multiplied by the material's #9a6f6a it gave the walls a linear reflectance
// of about 1.6% — darker than charcoal, darker than any painted plaster that
// has ever existed. The room was not underlit; it could not RETURN the light
// it was given. Measured median frame luminance was 11/255 with 41% of every
// frame crushed flat below 8/255, and the modelled value for a 1.6% wall two
// metres from the candelabra is 12/255, so the surfaces explained the whole
// gap on their own.
//
// The tempting fix is to crank the practicals, and it is the wrong one: the
// props carry normal albedo from their bakes, so more light blows them out
// while the walls stay black — which is exactly the look the renders had,
// everything dark except the things that glow. Darkness in this room comes
// from falloff and from what the lights do not reach, never from painting the
// surfaces black.
function stoneCanvas(size = 1024) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const x = c.getContext('2d')!;

  x.fillStyle = '#573437';
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
    g.addColorStop(0, dark ? 'rgba(34,20,22,0.42)' : 'rgba(168,126,120,0.15)');
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
  // was #171618, which times the material's colour came to roughly 0.1%
  // reflectance — a floor blacker than soot, in a room lit only by practicals.
  // See the note above stoneCanvas.
  x.fillStyle = '#35333a';
  x.fillRect(0, 0, size, size);
  noise(x, size, size, 6, 0.42);
  noise(x, size, size, 128, 0.2);
  for (let i = 0; i < 26; i++) {
    const px = Math.random() * size, py = Math.random() * size;
    const r = 70 + Math.random() * 240;
    const g = x.createRadialGradient(px, py, 0, px, py, r);
    g.addColorStop(0, 'rgba(84,94,108,0.30)');
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
 *  SCALE IS THE WHOLE GAME HERE, and it took two passes to land. The first
 *  attempt drew metre-wide equations that read as an HTML overlay rather than
 *  writing on stone. Shrinking everything to neat 4 cm working fixed that and
 *  introduced the opposite problem — a tidy blackboard, when the reference is
 *  GRAFFITI: head-sized circles and triangles struck over each other, with
 *  small working crammed into the gaps.
 *
 *  So the marks are sized in real centimetres against the wall (CM below) and
 *  drawn in three tiers: ~40 cm sigils, ~12 cm glyphs, ~4 cm working. Density
 *  and layering are what sell a wall someone has thought on for years.
 *
 *  `metres` is the real-world width of the wall this canvas will be stretched
 *  across, and it is the reason this function takes it rather than assuming.
 *  The back wall is 7.4 m and the side walls are 6.2 m; hard-coding the scale
 *  to the back wall would draw the side walls' marks 19% too large, which is
 *  the exact kind of error that reads as "something is off" without ever
 *  reading as "the chalk is the wrong size".
 *
 *  `density` scales the mark COUNT, not the mark size. The back wall is the
 *  board he actually works on and stays at 1; the side walls are overflow —
 *  what happens when the main wall runs out — so they get less, and being
 *  sparser is what makes them read as spill rather than as wallpaper. */
function chalkCanvas(w = 3072, h = 1536, metres = 7.4, density = 1) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const x = c.getContext('2d')!;
  x.clearRect(0, 0, w, h);

  const marks = [
    'a = 1/137.035999', 'E = mc2', 'f = 1/T', 'r = e^(b0)', 'F = phi',
    'dS >= 0', 'y = 137', 'n -> inf', 'i^2 = -1', 'c = 299792458',
    'h = 6.626e-34', 'sum 1/n^2', 'x = -b/2a', 'lim f(x)',
    'PERCEPTION IS CHOICE', 'LOVE IS THE ANSWER', '137',
  ];
  const glyphs = '△▽◇○◎☉⊕⊗✧✦⟁⟠⌬⎈⏣✕⧗⧖✴✳❂◈⬡⬢';

  // Scale reference: this canvas covers `metres` of wall, so CM is pixels per
  // real centimetre. Michael's reference is graffiti, not lecture notes —
  // head-sized circles and triangles layered over each other, with small
  // working filling the gaps between. Three tiers below: ~40 cm sigils,
  // ~12 cm symbols, ~4 cm writing.
  const CM = w / (metres * 100);
  const n = (base: number) => Math.round(base * density);

  const chalk = (a: number) => `rgba(236,233,226,${a})`;

  // TIER 1 — big drawn sigils. Struck by hand, so the circles are not round.
  x.lineCap = 'round';
  for (let i = 0; i < n(46); i++) {
    const cx = Math.random() * w, cy = Math.random() * h;
    const r = (14 + Math.random() * 26) * CM;
    x.save();
    x.translate(cx, cy);
    x.rotate(Math.random() * Math.PI);
    x.strokeStyle = chalk(0.10 + Math.random() * 0.16);
    x.lineWidth = (0.5 + Math.random() * 0.9) * CM;
    const kind = Math.floor(Math.random() * 4);
    x.beginPath();
    if (kind === 0) {
      // wobbling circle
      for (let a = 0; a <= Math.PI * 2 + 0.1; a += 0.18) {
        const rr = r * (0.94 + Math.random() * 0.12);
        const px = Math.cos(a) * rr, py = Math.sin(a) * rr;
        if (a === 0) x.moveTo(px, py); else x.lineTo(px, py);
      }
    } else if (kind === 1) {
      const n = 3 + Math.floor(Math.random() * 4); // triangle … hexagon
      for (let k = 0; k <= n; k++) {
        const a = (k / n) * Math.PI * 2;
        const px = Math.cos(a) * r, py = Math.sin(a) * r;
        if (k === 0) x.moveTo(px, py); else x.lineTo(px, py);
      }
    } else if (kind === 2) {
      // star polygon — the pentagram-ish scrawl
      const n = 5 + Math.floor(Math.random() * 3), step = 2;
      for (let k = 0; k <= n; k++) {
        const a = ((k * step) / n) * Math.PI * 2;
        const px = Math.cos(a) * r, py = Math.sin(a) * r;
        if (k === 0) x.moveTo(px, py); else x.lineTo(px, py);
      }
    } else {
      // crossed axes with a ring
      x.moveTo(-r, 0); x.lineTo(r, 0);
      x.moveTo(0, -r); x.lineTo(0, r);
      x.moveTo(r * 0.55, 0); x.arc(0, 0, r * 0.55, 0, Math.PI * 2);
    }
    x.stroke();
    x.restore();
  }

  // TIER 2 — hand-sized glyphs, scattered thickly
  for (let i = 0; i < n(340); i++) {
    x.save();
    x.translate(Math.random() * w, Math.random() * h);
    x.rotate((Math.random() - 0.5) * 0.8);
    x.fillStyle = chalk(0.09 + Math.random() * 0.2);
    x.font = `${(5 + Math.random() * 12) * CM}px serif`;
    x.fillText(glyphs[Math.floor(Math.random() * glyphs.length)], 0, 0);
    x.restore();
  }

  // TIER 3 — the working, filling every gap between the drawings
  for (let cl = 0; cl < n(420); cl++) {
    const px = (1.4 + Math.random() * 1.8) * CM;
    x.save();
    x.translate(Math.random() * w, Math.random() * h);
    x.rotate((Math.random() - 0.5) * 0.24);
    x.fillStyle = chalk(0.11 + Math.random() * 0.22);
    x.font = `${px}px ui-monospace, monospace`;
    const lines = 1 + Math.floor(Math.random() * 5);
    for (let i = 0; i < lines; i++) {
      x.fillText(marks[Math.floor(Math.random() * marks.length)], 0, i * px * 1.4);
    }
    x.restore();
  }

  // rubbed-out working — the wall has been worked over for years. Very faint:
  // any brighter and these read as blobs floating in front of the stone.
  for (let i = 0; i < n(40); i++) {
    const px = Math.random() * w, py = Math.random() * h;
    const r = (8 + Math.random() * 30) * CM;
    const g = x.createRadialGradient(px, py, 0, px, py, r);
    g.addColorStop(0, chalk(0.018));
    g.addColorStop(1, chalk(0));
    x.fillStyle = g;
    x.beginPath(); x.arc(px, py, r, 0, Math.PI * 2); x.fill();
  }
  return c;
}

/** Derive a tangent-space normal map from a colour canvas by Sobel-ing its
 *  luminance as if it were a height field.
 *
 *  This is the single biggest thing separating "a room" from "flat planes with
 *  pictures on them". A plane with only a colour map takes light uniformly
 *  across its whole surface, so stone reads as painted cardboard no matter how
 *  good the texture is — there is nothing for a grazing light to catch. The
 *  neon and the candelabra both rake across these walls at a shallow angle,
 *  which is exactly the condition under which a missing normal map is most
 *  obvious.
 *
 *  Luminance-as-height is an approximation — a dark stain reads as a dent when
 *  it is really just a stain — but at this scale, in this much shadow, it
 *  buys almost all of the benefit of a real sculpted map for none of the cost. */
function normalFromCanvas(src: HTMLCanvasElement, strength = 2.6, size = 512): HTMLCanvasElement {
  // Generated at 512 regardless of the colour map's size, and deliberately so.
  // A normal map does not need to match its colour map's resolution — it
  // carries low-frequency relief, and the GPU filters it the same either way.
  // The first version ran the Sobel at the colour map's full 1536², which is
  // 2.4M pixels x 9 luminance lookups in JavaScript before the first frame
  // could draw. The room rendered black because it was still busy. At 512 it
  // is ~9x less work, and the luminance is unpacked into a Float32Array once
  // instead of being recomputed per tap.
  const w = size, h = size;

  const down = document.createElement('canvas');
  down.width = w; down.height = h;
  const dctx = down.getContext('2d')!;
  dctx.imageSmoothingEnabled = true;
  dctx.drawImage(src, 0, 0, w, h);
  const s = dctx.getImageData(0, 0, w, h).data;

  const lum = new Float32Array(w * h);
  for (let i = 0, p = 0; i < lum.length; i++, p += 4) {
    lum[i] = (s[p] * 0.299 + s[p + 1] * 0.587 + s[p + 2] * 0.114) / 255;
  }

  const out = document.createElement('canvas');
  out.width = w; out.height = h;
  const octx = out.getContext('2d')!;
  const dst = octx.createImageData(w, h);
  const d = dst.data;

  // wrap at the edges so the map tiles exactly like the colour map does
  const at = (x: number, y: number) => lum[(y & (h - 1)) * w + (x & (w - 1))];

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const tl = at(x - 1, y - 1), t = at(x, y - 1), tr = at(x + 1, y - 1);
      const l = at(x - 1, y), r = at(x + 1, y);
      const bl = at(x - 1, y + 1), b = at(x, y + 1), br = at(x + 1, y + 1);
      const dx = (tr + 2 * r + br) - (tl + 2 * l + bl);
      const dy = (bl + 2 * b + br) - (tl + 2 * t + tr);

      let nx = -dx * strength, ny = -dy * strength;
      const len = Math.sqrt(nx * nx + ny * ny + 1) || 1;
      nx /= len; ny /= len;

      const i = (y * w + x) * 4;
      d[i] = (nx * 0.5 + 0.5) * 255;
      d[i + 1] = (ny * 0.5 + 0.5) * 255;
      d[i + 2] = (1 / len) * 0.5 * 255 + 127.5;
      d[i + 3] = 255;
    }
  }
  octx.putImageData(dst, 0, 0);
  return out;
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

  // The colour canvases are generated once and shared with their normal maps,
  // so the bumps line up with the blotches and cracks that produced them.
  const stoneSrc = useMemo(() => stoneCanvas(1024), []);
  const floorSrc = useMemo(() => floorCanvas(1024), []);

  // Tighter tiling than before: at 3 x 1.6 across a 7.4 m wall the texel
  // density was low enough that the grain smeared. Repeat more, and let the
  // normal map carry the detail the colour map can no longer resolve.
  const stone = useTex(() => stoneSrc, [5, 2.6], true);
  const stoneN = useTex(() => normalFromCanvas(stoneSrc, 2.8), [5, 2.6], false);
  const floorMap = useTex(() => floorSrc, [6, 6], true);
  const floorN = useTex(() => normalFromCanvas(floorSrc, 1.5), [6, 6], false);
  const floorRough = useTex(() => floorRoughCanvas(), [6, 6], false);
  const chalk = useTex(() => chalkCanvas(), [1, 1], true);
  // The side walls carry their own chalk, and each gets its OWN canvas rather
  // than a shared one: two walls facing each other across a small room with
  // identical marks on them is a mirror, and the eye catches a mirror
  // instantly even when it cannot say what it caught.
  //
  // Half the resolution of the back wall on purpose — these are seen at a
  // glancing angle when you turn your head, never straight on, so the texel
  // density that matters is the projected one. Sparser too: this is overflow
  // from the board he actually works on, not a second board.
  const chalkL = useTex(() => chalkCanvas(2048, 1152, ROOM.depth, 0.5), [1, 1], true);
  const chalkR = useTex(() => chalkCanvas(2048, 1152, ROOM.depth, 0.5), [1, 1], true);

  // normalScale is deliberately strong on the walls: the neon and candelabra
  // both rake across them at a shallow angle, which is where relief reads.
  const wall = (
    <meshStandardMaterial
      map={stone}
      normalMap={stoneN}
      normalScale={new THREE.Vector2(1.35, 1.35)}
      roughness={0.94}
      metalness={0}
      // Faint, because plaster is not a mirror — but not zero, because a wall
      // with no environment response is the flattest surface a renderer can
      // produce and this room has 26 square metres of it.
      envMapIntensity={0.35}
      color="#ad838b"
    />
  );

  // The chalk overlay, shared by all three walls that carry it. Basic, not
  // standard: chalk dust is not a lit surface with a normal — it is pigment
  // sitting in the stone's own relief, and shading it a second time made it
  // read as stickers. depthWrite off so it never fights the wall behind it.
  const chalkLayer = (map: THREE.Texture) => (
    <meshBasicMaterial map={map} transparent opacity={0.9} depthWrite={false} />
  );

  return (
    <group>
      {/* floor — wet, so it carries the neon down onto itself */}
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[W, D]} />
        <meshStandardMaterial
          map={floorMap}
          normalMap={floorN}
          normalScale={new THREE.Vector2(0.7, 0.7)}
          roughnessMap={floorRough}
          roughness={1}
          metalness={0.22}
          // The floor is the one surface that was always MEANT to be
          // reflective — it is wet concrete, and the damp patches are the
          // whole reason it reads as wet. Until now they had nothing to be
          // wet with: no environment, so the sheen had nothing to show.
          envMapIntensity={0.85}
          color="#8e8a86"
        />
      </mesh>

      {/* ceiling — unlit and far enough up to stay a suggestion */}
      <mesh position={[0, H, 0]} rotation-x={Math.PI / 2}>
        <planeGeometry args={[W, D]} />
        <meshStandardMaterial map={stone} normalMap={stoneN} roughness={1} envMapIntensity={0.25} color="#57514a" />
      </mesh>

      {/* back wall, the one you face */}
      <mesh position={[0, H / 2, -D / 2]} receiveShadow>
        <planeGeometry args={[W, H]} />
        {wall}
      </mesh>
      {/* the chalk sits just proud of the stone so it never z-fights */}
      <mesh position={[0, H / 2, -D / 2 + 0.004]}>
        <planeGeometry args={[W, H]} />
        {chalkLayer(chalk)}
      </mesh>

      {/* Side walls — and the chalk really does carry round the corners now.
          This comment claimed it did for a long time while the side walls
          rendered as bare stone, which is worse than saying nothing: it is
          the two walls you see every time you turn your head, and the comment
          stopped anyone looking. */}
      <mesh position={[-W / 2, H / 2, 0]} rotation-y={Math.PI / 2} receiveShadow>
        <planeGeometry args={[D, H]} />
        {wall}
      </mesh>
      <mesh position={[-W / 2 + 0.004, H / 2, 0]} rotation-y={Math.PI / 2}>
        <planeGeometry args={[D, H]} />
        {chalkLayer(chalkL)}
      </mesh>
      <mesh position={[W / 2, H / 2, 0]} rotation-y={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[D, H]} />
        {wall}
      </mesh>
      <mesh position={[W / 2 - 0.004, H / 2, 0]} rotation-y={-Math.PI / 2}>
        <planeGeometry args={[D, H]} />
        {chalkLayer(chalkR)}
      </mesh>

      {/* wall behind the seat — you can turn far enough to catch it */}
      <mesh position={[0, H / 2, D / 2]} rotation-y={Math.PI}>
        <planeGeometry args={[W, H]} />
        {wall}
      </mesh>
    </group>
  );
}
