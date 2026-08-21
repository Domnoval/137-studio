# Flags

Every switch that changes what `/studio` does, and what each one is for.

Read once at mount from the URL. None of them are persisted, none are in
`localStorage`, and none require a deploy to use — which is the point: the
things most likely to make this site unusable are the things that never throw
an error, and a kill switch you have to ship to reach is not a kill switch.

| Flag | Default | Does |
|---|---|---|
| `?fold=0` | on | Doors open **instantly**, with no transition. |
| `?tm=aces` \| `agx` \| `neutral` \| `none` | `agx` | Swap the tone curve. |
| `?perf=1` | off | Expose renderer stats **and material grades** for the harnesses. |
| `?console=proxy` | off | Load the contract blockout instead of the hero console. |

---

## `?fold=0` — the transition, not the navigation

This one exists because it was once wrong in a way worth remembering. The guard
read:

```ts
if (!foldEnabled || pending.current !== null) return;
```

which meant `?fold=0` did not turn the transition off — it turned **the doors**
off, silently, with no error anywhere. A kill switch for an effect has to
degrade the effect and leave the function standing, or it is not a kill switch,
it is a second way to break the site.

The same code path serves `prefers-reduced-motion`, which is the whole reason it
has to exist: someone who cannot watch a room shatter still has to be able to go
through the door.

## `?tm=` — the tone curve

The room ships **AgX**. Every light in it is a saturated practical — `#c41230`
neon, `#4a8f6f` monitors, `#2e9fd4` rim — and ACES is well known for skewing
exactly those hues as they climb, marching reds toward orange. AgX desaturates
into the highlights instead of rotating them, so the neon stays red when it
blooms.

`none` is `LINEAR` rather than removing the pass, so the chain keeps the same
shape whichever curve is selected: a comparison where the two sides differ by a
shader stage as well as by the curve is not a comparison.

## `?perf=1` — instrumentation

Off by default because a profiler that changes what it profiles is worse than
no profiler. It writes to a DOM attribute rather than React state, since state
in `Studio` rebuilds the entire post-processing pass chain.

See `tools/asset-forge/baseline.mjs`.

---

## Also a test seam

`data-studio-state` on the root element carries `{ beyond, folding, reduced,
foldEnabled }`. Not a flag — a way to ask the room what it thinks is happening.

The room's state lives in React and its output lives in a canvas, so an
automated check can otherwise only look at pixels. Pixels are exactly what lied
during the fold debug, when a dead shader rendered the room behind the shards
and looked like a working transition for two rounds of testing.

## `?console=proxy` — the asset that does not exist yet

The console's per-part grading is code written against a GLB nobody has
modelled. Code like that is wrong until something proves otherwise, and in this
case it was wrong three times: the loader matched node names exactly, so a
`Trim_Brass.001` duplicate silently rendered as iron; the height normalisation
measured the collision hull along with the machine; and the knobs were never
in the grade table at all, so eight brass knobs rendered at metalness 0.30.

None of those throw. All three were found by loading a blockout that satisfies
the contract and reading the materials back off the running scene with
`?perf=1`, which writes a `data-grades` attribute alongside `data-perf`.

Generate the blockout with `python3 tools/blender/console_proxy.py`, check it
with `npm run validate:console`, and look at it with `?console=proxy`.
