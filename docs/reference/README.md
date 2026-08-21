# Reference — THE 137 MACHINE

Source material for the direction proposed in `STATE_BIBLE.txt`. **Nothing here is
wired into the build.** It is kept in the repo so the analysis survives outside a
chat window, and so that whoever models these assets can check them against what
the spec actually requires.

## What is here

| | |
|---|---|
| `STATE_BIBLE.txt` | The design bible, v0.1, 14 sections. Extracted text — the PDF carries no images. |
| `phrase-to-plate-spec.md` | A **separate product**: a deterministic phrase→glyph-plate compiler. Its own estimate is 8–12 weeks for V1. It is not a website feature. |
| `scaffold/` | The `studio137scaffoldv2` reference implementation. **Next 14 / React 18 / three 0.169 / fiber 8 / drei 9** — every axis a major behind this repo, so it is a reference, not a merge. |
| `frames/` | Stills pulled from the Higgsfield turntables and room clips. |

## Findings from the asset review

These came out of looking at the renders against the Bible. Each one is a thing
that is cheap to fix now and expensive to fix after the mesh is final.

### The portal ring is not a 16-segment readout

Bible §1 specifies *"the carved stone ring with 16 lit segments = the 16 states"*,
and §2.1 rests the whole design on it: *"that finiteness is what lets the visitor
mentally count the machine."*

The asset does not do this. The turntable's side view shows a thick stone drum,
and the blue lights run **inside the bore** — tunnel lighting at several depths.
They read as far more than sixteen and cannot be individually addressed.

**The stone face is a better ring than the spec describes.** It carries four large
carved medallions at N/E/S/W with bands of repeating panels between them:

- **4 medallions = the 4 levers.** §2.2 already places the signet's four marks at
  exactly N/E/S/W, so the mapping is already drawn.
- **the panels between = the 16 states**, lighting as a subject collects them.

Carved masonry as the state wheel fits "reclaimed temple" far better than an LED
strip. Count the panels per quadrant before modelling — four per quadrant and the
asset is already the machine.

### The levers must be separate nodes with a real throw

Every lever in the render is upright. That is position 0 and only position 0. A
4-bit register needs two visibly distinct positions per lever, so each needs its
own node, a defined pivot, and an authored throw angle. Image-to-3D routinely
fuses controls into the body — if that happens the console is a sculpture, not a
control, and nothing downstream works.

The blank nameplates under each lever are correct and should stay blank in the
mesh: the labels go on as decals, which keeps them legible and avoids baking
generated text into geometry.

### The signet sheet is verified

All 16 signets check out against `lib/stateTable.ts`, read row-major as index 0–15:

- N wave solid on rows 3–4 → SIGNAL
- E disc solid on rows 2 and 4 → LUMEN
- S sprout solid on columns 3–4 → FLORA
- W crack solid on columns 2 and 4 → DECAY

Each mark carries a tie-bar crossing the ring at its compass point, so the inner
field stays connected to the outer field when cut. The stencil geometry is sound.

**One caution:** at favicon and taskbar sizes (§13 Phase 6, §6.3) the hollow-vs-solid
distinction on the **crack** mark is a doubled thin line against a single thick
one, and it will disappear below roughly 24 px. Either thicken the solid crack or
accept that small signets read as 4 states rather than 16.

### Generated text is in the room assets

`x.37444`, the wall placards, and the code scrolling in the portal are model
output, not language. In a still that is texture. In a room a visitor can walk up
to, it is something they will *try to read* and fail — and they will be closest to
the machine at exactly that moment. Make it legible and meaningful, or make it
unmistakably not-text.

### The stairs contradict the movement model

The portal has real steps leading into the throat. The Bible has no fold and no
walk-through — §6 crosses over via the CRT, not the ring. Steps say *walk through
me*. Either give them the walk or lose the steps.

### The room is daylit

The wall plate is a flat backdrop with an arched window onto a daylit mountain,
and the room clips are lit by it. Everything in `src/components/studio/` assumes a
night room lit by seven coloured practicals, and its whole exposure model is built
on that. Not a problem — a different room. Worth stating before anyone tunes
lighting twice.

## What this direction collides with

`docs/PLAN.md` records three decisions this reverses, and they are listed here so
the reversal is deliberate rather than accidental:

1. **The 4-bit lever machine was declined.** `tools/asset-forge/validate-console.mjs`
   still warns on `Lever_N` nodes for that reason. If the machine is adopted, that
   warning has to be inverted.
2. **Objects are the doors** (easel, machine, radio, journal). The Bible replaces
   them with six programs inside a CRT OS.
3. **The fold is the transition, always.** The Bible never mentions it; it has the
   CRT dive instead.

`docs/console-asset-contract.md` describes blackened iron and brass — an organ
console. That object does not exist in this world. The contract's machinery
(world-space measurement, the bezel occlusion test, suffix-tolerant names) all
carries over unchanged; the part names and materials need retargeting to the pink
CRT, the ring and the lever console.

## The cheap half

The subject engine (§3) and the voice (§7) need no splat, no lever, and no new
asset. `scaffold/lib/subject.ts` is 59 lines and `scaffold/lib/copy.ts` is 31, and
between them they carry the entire creep: the room remembering, the trust gate at
visit ≥ 3, and

> `SUBJECT 88 — PREVIOUS SUBJECT LOST. THE ROOM KEEPS NO ASHES.`

That is the thesis in six words, and it would work in the room that renders today.
