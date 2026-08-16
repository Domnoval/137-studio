# Console Asset Contract v1

**For:** the machine on the bench — the hero prop, `consoleMV`.
**Status:** authoritative. If Blender and this document disagree, this wins.

---

## Why this document exists

The console is the first thing anyone sees and the weakest thing in the frame.
Not because it is badly lit — it is lit correctly now — but because the
reconstruction fused the whole machine into **one mesh with one material**. A
single material cannot be blackened iron *and* polished brass *and* glass at
the same time, so it is none of them, and no amount of shading fixes that. That
is the ceiling, and rebuilding is the only way through it.

This contract exists so the rebuild does not block anything. Engineering builds
against a **proxy** that satisfies the node names below; you model the real
machine; the real machine drops in and nothing gets rewritten. Neither of us
waits for the other.

**The one rule: node names are an API.** Everything else here is guidance you
should overrule where your eye says otherwise. Rename a node and code breaks
silently.

---

## 1. Scale and orientation

| Property | Value |
|---|---|
| Units | Metres. Set Blender's Unit Scale to 1.0, Unit System Metric. |
| Up axis (Blender) | +Z |
| Forward (Blender) | −Y |
| Export | glTF converts to three's +Y up / −Z forward. Use the exporter default; do not pre-rotate. |
| Overall height | **1.05 m**, base to highest point |
| Footprint | Keep within **0.95 m wide × 0.55 m deep**. Wider crowds the radio and the journal off the bench. |
| Origin | World origin, at the **centre of the footprint, on the base plane** — the point the machine stands on. |

The machine stands on a bench whose surface is at **0.80 m**, and the seated
eye is at **1.26 m**. So the top of the console lands at 1.85 m — roughly
60 cm above eye level. **You are looking up at it from the chair.** That is the
whole feeling of the organ-console reference and it is worth protecting: if a
proportion decision is marginal, favour the one that reads better from below.

---

## 2. Node hierarchy

Names are exact, case-sensitive, and stable. Extra nodes are fine — anything not
listed is treated as body and inherits the chassis material.

```text
ConsoleRoot
├── Body_Iron          blackened cast iron, the chassis
├── Trim_Brass         fittings, hinges, bezel edging, fasteners
├── CRT_Bezel          the surround the glass sits in
├── CRT_Glass          curved front glass — SEPARATE, see §3
├── CRT_Display        the flat emissive plane behind the glass
├── Panel_Controls     the sloped control deck
├── Knob_00 … Knob_NN  each knob its own node
├── Keyboard           the key bed
├── Cable_Loom         the conduit loops
├── Collision_Console  invisible convex hull, see §5
└── FocusAnchor        empty, see §5
```

### Not in this contract, deliberately

There are **no levers, no bit lamps, no commit switch**. The 4-bit lever machine
was considered and not adopted — the doors in this room are objects (easel,
machine, radio, journal), not a code you enter. Model the machine as a machine;
it does not need to be operable to be the centre of the room.

If that decision reverses later, levers get added as `Lever_0..3` and the
contract goes to v2. It is not your problem today.

---

## 3. The CRT is three objects, not one

This matters more than anything else in the document.

| Node | What it is | Why separate |
|---|---|---|
| `CRT_Display` | Flat plane, slightly inset | Carries the emissive image. Code swaps what is on it. |
| `CRT_Glass` | Curved shell in front of the display | Gets its own low-roughness, low-metalness material so it can catch a reflection the display does not. **This is the single biggest visual win in the rebuild.** |
| `CRT_Bezel` | The surround | Reads as a separate manufactured part rather than a painted-on rectangle. |

Leave **2–4 mm** between glass and display. Real distance is what produces the
parallax that makes a CRT read as a physical object rather than a picture of
one.

Do not bake a picture into the glass. The room supplies the reflection.

---

## 4. Materials

Four, and no more — every additional material is a draw call in a room that
already has twelve props.

| Material name | Surface | Rough | Metal | Notes |
|---|---|---:|---:|---|
| `M_Iron` | Blackened cast iron | 0.55 | 0.30 | The body. Dark, not black — see the albedo note below. |
| `M_Brass` | Aged brass | 0.38 | 0.85 | Fittings only. Restraint here: the current machine reads as a solid gold lamp because everything is brass. |
| `M_Glass` | CRT front glass | 0.08 | 0.00 | Transmissive not required; low roughness is enough. |
| `M_Display` | Phosphor surface | 0.60 | 0.00 | Emissive. Base colour dark; code drives emissive intensity. |

**Albedo floor.** Do not paint anything below about **8% reflectance** (sRGB
~#3a3a3a). This room was accidentally *black* for months because its surfaces
were authored at 1.6% — darker than charcoal — and could not return the light
they were given. Darkness comes from falloff and from where the lights do not
reach. Never from the texture.

**Metalness is binary in reality.** A surface is metal or it is not; values
between 0.2 and 0.8 are almost always a mistake. The brass is metal. The iron
is painted, so it is mostly not.

---

## 5. Collision and focus

`Collision_Console` — a convex hull, roughly 20–40 triangles, wrapping the
silhouette. Never rendered; it is what the cursor tests against. Raycasting the
full-detail mesh is wasteful and makes the clickable area feel unreliable at the
edges where the geometry is thin.

`FocusAnchor` — an **empty**, placed where the machine wants to be looked at:
centred on the CRT, about 8 cm proud of the glass. This is the point the fold
composes around when the machine is used as a door. Get it wrong and the
transition is subtly off-centre for reasons nobody can name.

---

## 6. UVs and texture budget

- One UV set, non-overlapping, no shared shells between material groups.
- **Texel density ≈ 512 px/m.** At the seated viewing distance of ~1.6 m this
  resolves to roughly the limit of human acuity, and going higher costs memory
  for detail nobody can see.
- Maps: base colour, normal, ORM (occlusion / roughness / metalness packed).
- **2048² per material max.** Total texture budget for the console: **≤ 12 MB**
  after compression.
- Bake AO into the ORM red channel. The room's screen-space AO cannot see inside
  the machine's own crevices; that occlusion has to be baked or it does not
  exist.

---

## 7. Wear

Wear where a hand goes and water sits — knob edges, the front lip of the control
deck, the bottom of the chassis where it meets the bench. Not uniform grunge.
Uniform wear is the tell of a generated asset, because real wear is a record of
use and use is not uniform.

This machine is in a working studio that someone sits at daily. It is
maintained, not abandoned.

---

## 8. Export

| Setting | Value |
|---|---|
| Format | `.glb`, glTF 2.0 binary |
| Include | Selected objects, custom properties off |
| Transform | +Y up (exporter default) |
| Geometry | Apply modifiers; **do not** export tangents (three generates them) |
| Compression | None on export — the repo pipeline applies Draco + WebP |
| Filename | `consoleMV.glb` |

Drop it at `public/models/consoleMV.glb`. The pipeline in `tools/asset-forge/`
handles Draco and texture conversion (22× reduction, measured).

---

## 9. Done when

- [ ] Every node in §2 exists with the exact name.
- [ ] `CRT_Glass` and `CRT_Display` are separate objects with a real gap.
- [ ] Exactly four materials, named as in §4.
- [ ] Nothing painted below 8% reflectance.
- [ ] `Collision_Console` present, convex, under 40 triangles.
- [ ] `FocusAnchor` present and centred on the CRT.
- [ ] Total height 1.05 m; footprint within 0.95 × 0.55 m.
- [ ] It survives a close-up still. **The bar is a paused frame, not motion** —
      motion hides everything and this machine is looked at while stationary.

---

## Working notes

Send a **blockout first** — correct proportions, correct node names, no
detail. That unblocks every piece of engineering work behind this asset and
takes an hour. Detail can land any time after; nothing downstream depends on it.

The proxy in the repo satisfies this contract, so `/studio` keeps rendering
while you work. When yours arrives it replaces the file and nothing else changes.
