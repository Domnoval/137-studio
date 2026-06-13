# Quantum Physics & Other Smart People Shit

An interactive field-notes section of 137 Studio that makes the strangeness of
modern physics tactile. Drag sliders, watch reality misbehave.

## Where it lives

| Concern | Path |
| --- | --- |
| Route / UI | `src/app/quantum/page.tsx` |
| Physics math (pure) | `src/lib/quantum/physics.ts` |
| Concept gallery data | `src/lib/quantum/concepts.ts` |
| Nav entry | `src/components/ui/Nav.tsx` → `/quantum` |

## What's inside

Four canvas-based interactive demonstrations plus a tap-to-expand gallery:

1. **The Double Slit** — two-slit interference fringes inside the single-slit
   diffraction envelope. Sliders: wavelength, slit separation, slit width.
2. **Particle in a Box** — the discrete energy ladder of an infinite square
   well; toggle the `|ψ|²` probability density. Slider: quantum number `n`.
3. **Heisenberg's Trade-off** — a minimum-uncertainty Gaussian packet showing
   the `Δx·Δp ≥ ℏ/2` tug-of-war. Slider: position spread `Δx`.
4. **Planck's Catastrophe** — the blackbody spectral-radiance curve with a
   live Wien's-law peak marker. Slider: temperature.
5. **The Canon** — eight reality-rewiring equations (`E=mc²`, Schrödinger,
   uncertainty, Dirac, Bell, …) with plain-language explanations.

## Design

Follows `docs/DESIGN-SYSTEM.md`: warm void `#0e0c0a`, chalk `#e8e4dc`, blood
red `#c41230` as the power accent, amber `#d4a030` for secondary data. Type is
Cinzel (display) / Cormorant Garamond (serif) / Crimson Text (body) / JetBrains
Mono (labels). No gold on black, no gradients on art, BIG headlines.

## Math notes

All physics is in `src/lib/quantum/physics.ts` and is pure / side-effect free
so it can be called inside render loops. Bound-state visuals use reduced units
(`ℏ = m = 1`, box length `1`); constants and the blackbody curve use SI. The
goal is intuition, not lab precision.

## Extending

Add a new demonstration by writing the math in `physics.ts`, a `<Section>` +
canvas component in `page.tsx`, and (if it deserves nav real estate) nothing
else — it already lives under `/quantum`. Add a canon entry by appending to the
`concepts` array in `concepts.ts`.
