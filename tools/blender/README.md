# Blender ↔ 137 Studio

Two separate things live here, and confusing them wastes a day.

## `studio137.py` — the contract, inside your Blender

This is the one you want. It puts the console asset contract in a sidebar panel
so you can check your scene **before** you export, on your own machine, in the
version of Blender you actually use (4.2 through 5.x).

**Install once:**

> Edit ▸ Preferences ▸ Add-ons ▸ ▾ (top right) ▸ **Install from Disk…** ▸ pick
> `tools/blender/studio137.py` ▸ tick **137 Studio — Console Contract**

Or skip installing entirely: **Scripting** workspace ▸ Open ▸ this file ▸ **Run
Script**. Same panel, gone when you close Blender.

Press **N** in the 3D viewport, open the **137** tab. Two buttons:

- **Check contract** — reads your scene the way the room's loader will, and
  writes a full report into a `137-contract-check` text block (the header bar
  only has room for a summary).
- **Export consoleMV.glb** — exports the `ConsoleRoot` hierarchy with the right
  settings. It refuses if Check reports a problem, on purpose: an export that
  fails the contract renders wrong *without erroring anywhere*, and finding
  that out at the far end costs an afternoon that this costs a second.

### What it catches that a file check cannot

The `.mjs` validator reads a finished `.glb`. This reads the live scene, so it
sees things that are true of your model but invisible in the file:

- **A screen sunk into a solid bezel.** Contract-clean, validator-clean, and no
  screen anywhere in the render. It tests *occlusion* — is there bezel geometry
  in the volume directly in front of the display — rather than depth, because a
  bezel is supposed to be a lip in front of a recessed screen.
- **Base colours under the 8% reflectance floor.** Two of the proxy's own
  materials measured 7.7% and 7.6%. Luminance is `0.2126R + 0.7152G + 0.0722B`
  and green carries three quarters of it, so a colour that *looks* dark grey
  sits either side of that line unpredictably.
- **A collision hull smaller than the machine.** Whatever it misses is
  un-clickable — the pointer goes straight through, and it will be the parts
  standing proudest that get missed.
- **A FocusAnchor off the screen centre**, which is where the camera aims when a
  keyboard user tabs to this door.

### Names

Duplicate an object and Blender gives you `Trim_Brass.001`. **That is fine.**
Both the panel and the room strip the `.NNN` and accept anything extending a
contract name past a `_` or a `.`, so `Trim_Brass`, `Trim_Brass.001` and
`Trim_Brass_plinth` are all brass. Do not hand-rename duplicates.

What you cannot do is invent a name. `Cylinder` matches nothing and falls
through to a generic grade with no error anywhere — so the check lists every
object that would happen to.

## `console_proxy.py` — the blockout, generated headless

Builds a contract-satisfying blockout with no Blender GUI, via the `bpy` Python
module. It exists so engineering never waits on the hero asset:

```bash
python3 tools/blender/console_proxy.py [out.glb]     # default: public/models/consoleMV-proxy.glb
node tools/asset-forge/validate-console.mjs public/models/consoleMV-proxy.glb
```

Load it in the room with `/studio?console=proxy`. It is deliberately crude and
deliberately ugly. It is not a design proposal.

---

## How the round trip actually works

There is **no live link** between Blender on your desk and the agent working on
this repo — that session runs in a container somewhere else, and nothing bridges
the two. So the loop is:

1. You model. **Check contract** until it is clean.
2. **Export consoleMV.glb** to `public/models/consoleMV.glb`.
3. Commit and push it.
4. `node tools/asset-forge/validate-console.mjs public/models/consoleMV.glb`
   runs on the file, independently, and the room picks it up with no code
   change — the per-part grading is already written and already tested against
   the proxy.

Step 1 is the one that matters. Every problem the panel catches is one that
would otherwise be found by looking at a render and wondering why it is wrong.
