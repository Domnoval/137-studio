# /genesis audio

The Genesis route currently scores itself with a **synthesised drone** (Web
Audio) built into `src/components/GenesisCanvas.tsx` — a root tone with a
perfect fifth (3:2, the "vesica fifth") that swells in as the two voices
differentiate and settles as they reunite. It is gesture-bound (starts only on
"Touch the void"), muted by default, and ships with **no audio asset**, so
there is nothing to 404 and no console noise.

## Swapping in the Suno track (Phase 3)

When the Suno-generated ambient/cinematic track is ready:

1. Drop it here as `genesis.mp3` (and optionally `genesis.ogg`).
2. In `GenesisCanvas.tsx`, replace the `DroneEngine` usage with an
   `<audio>` element:
   - create it muted (`muted` / `volume = 0`),
   - call `.play()` inside `start()` (the void gesture) — this satisfies the
     autoplay policy and the no-clock law in one move,
   - toggle `muted` inside `toggleMute()`,
   - keep the loose-sync idea: `audio.currentTime = clockRef.current` is the
     only "sync" needed — do **not** hard frame-lock.

The seam is small and isolated to one component on purpose.
