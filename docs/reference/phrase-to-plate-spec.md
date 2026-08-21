# Studio 137 Phrase-to-Plate Generator

## Technical Specification and Implementation Roadmap

**Document status:** Proposed V1 architecture  
**System class:** Deterministic semantic glyph compiler and production-art renderer  
**Primary objective:** Convert an arbitrary phrase into a reproducible Studio 137 plate whose visible symbolic structure is meaningful, whose exact source can be recovered when required, and whose production artifacts preserve canonical authored glyph geometry.

---

## 1. Product definition

The Phrase-to-Plate Generator is not an AI image generator and must not behave like one. It is a deterministic compiler:

```text
Phrase + seed + parameters
        ↓
Versioned semantic/logographic grammar
        ↓
Immutable canonical glyph AST
        ↓
Deterministic layout and presentation plan
        ↓
Locked vector scene
        ↓
Public and private artifact pipelines
```

The system translates source language into the established Studio 137 grammar: nine root families, four modifiers, clause structures, separators, mirrored sequences, corrupted passages, and literal escape mechanisms. It then arranges the resulting authored glyph geometry using controlled mathematical substrates and deterministic visual treatments.

### 1.1 Central invariant

> Canonical payload glyphs are authored vector geometry. Layout, mathematical substrate, corruption, decoys, and atmosphere may position, transform, mask, surround, or partially obscure those vectors, but may never redraw or mutate their path data.

Generative image models may later produce optional wordless background textures, but they must never generate, reinterpret, or repair payload glyphs.

### 1.2 Required properties

The completed system must be:

- **Meaningful:** primary glyph structures derive from a real semantic grammar.
- **Deterministic:** identical input, seed, settings, and version contract produce identical output.
- **Reproducible:** old plates remain renderable after the system evolves.
- **Reversible:** exact mode can recover the original UTF-8 phrase.
- **Print-capable:** canonical vectors survive high-resolution production workflows.
- **Layer-separable:** payload, modifiers, substrate, corruption, decoys, and atmosphere can be independently inspected.
- **Private by design:** public art files never expose phrases, seeds, manifests, machine paths, or production secrets.
- **Canon-controlled:** grammar, glyph geometry, layouts, substrates, and corruption rules are finite versioned registries.

---

## 2. Encoding modes

### 2.1 Exact mode

Exact mode guarantees source recovery.

Allowed:

- Authored reversible substitutions
- Recorded sequence permutations
- Recorded mirroring
- Deterministic occlusion masks
- Non-semantic decoys
- Atmospheric interference on separate layers

Forbidden:

- Unrecorded glyph deletion
- Ambiguous substitution
- Merging multiple payload glyphs into an undecodable form
- Destructive path mutation
- Replacing canonical vectors with generated images
- Retaining only a flattened raster master

A glyph that appears erased remains present in the canonical vector layer beneath a recorded mask.

### 2.2 Stylized mode

Stylized mode allows destructive visual corruption while retaining the original source in the private manifest.

The interface must state:

```text
Visual decoding is not guaranteed.
The source remains recoverable from the private encoding manifest.
```

Stylized mode never deletes the internal canonical AST. It only permits the public presentation to become visually lossy.

---

## 3. Input contract

```ts
export type PlateMode = "exact" | "stylized";

export type PlateRequest = Readonly<{
  phrase: string;
  seed: string;
  density: number;
  corruptionLevel: number;
  layoutFamily: LayoutFamilyId;
  mathematicalSubstrate: SubstrateId;
  outputSize: OutputSize;
  mode: PlateMode;
}>;
```

Validate all external input with Zod. Reject non-finite values, unsupported identifiers, excessive pixel dimensions, invalid DPI, malformed units, and unknown version contracts.

---

## 4. Input field: phrase

The phrase field accepts multiline Unicode text.

```ts
export type SourcePayload = Readonly<{
  originalText: string;
  utf8Base64: string;
  codePoints: readonly number[];
  normalizedSemanticView: string;
  normalizationPolicy: "none+semantic-nfc-v1";
}>;
```

### 4.1 Preservation rules

- Preserve the exact original UTF-8 bytes.
- Create a separate normalized semantic view for parsing.
- Do not silently collapse intentional punctuation or spacing.
- Do not discard unsupported words or characters.
- Represent unsupported content as explicit literal escape nodes.
- Exact decoding returns the original UTF-8 source, not merely normalized text.

### 4.2 Suggested limits

- V1 maximum: 512 Unicode code points.
- Empty phrases are invalid.
- Extremely long clauses generate warnings before compilation.
- Right-to-left and non-Latin source text may be preserved exactly even if semantic parsing falls back to literal escape nodes.

### 4.3 Interface behavior

Display:

- Character count
- Clause segmentation
- Parsed semantic roots
- Modifier assignments
- Unsupported-token warnings
- Literal escape warnings
- Normalized interpretation
- Reversibility status

---

## 5. Input field: seed

The seed controls every non-authorial deterministic choice.

```ts
seed: string; // 1–128 UTF-8 characters
```

### 5.1 Seed requirements

- Same phrase, seed, parameters, and versions must reproduce the same plate.
- A **New Seed** action generates a cryptographically random seed.
- A **Lock Seed** control prevents accidental regeneration.
- The public UI may display a short fingerprint rather than the full internal digest.
- The seed is not an encryption key.

### 5.2 Named random streams

Derive independent streams for:

```text
layout
substrate
corruption
decoys
atmosphere
```

Stream isolation prevents one control from rerolling unrelated systems. Changing density may change decoy placement without changing corruption-site selection.

### 5.3 Derivation

```text
masterDigest = SHA-256(
  "studio137:plate-seed:v1"
  + NUL
  + seed UTF-8 bytes
)
```

Each stream derives from:

```text
SHA-256(
  masterDigest
  + NUL
  + streamName
  + NUL
  + rngVersion
)
```

Use a checked-in deterministic PRNG implementation such as `xoshiro128**`, with fixed test vectors and explicit unsigned integer behavior.

Prohibit:

- `Math.random()`
- Time-based seeds
- UUID v4 inside deterministic artifacts
- Browser entropy after compilation begins
- Locale-dependent ordering
- System-dependent object iteration

---

## 6. Input field: density

The UI exposes density as `0–100`; the compiler receives a normalized `0–1` value.

```ts
density: number; // inclusive 0–1
```

Density must not mean “add arbitrary noise.” It maps to independently controlled visual systems:

```ts
export type DensityProfile = Readonly<{
  payloadSpacing: number;
  clauseSpacing: number;
  substrateFrequency: number;
  decoyOccupancy: number;
  atmosphericCoverage: number;
}>;
```

Payload glyph count is determined by the phrase. Density cannot delete semantic nodes.

### 6.1 Suggested bands

| UI range | Name | Behavior |
|---:|---|---|
| 0–20 | Inscription | Large glyphs, generous negative space, minimal decoys |
| 21–45 | Diagram | Clear clause structure with visible substrate |
| 46–70 | Manuscript | Dense supporting marks and stronger field behavior |
| 71–90 | Wall | High occupancy, compressed spacing, layered decoys |
| 91–100 | Black Field | Near-saturated surface with payload protected by hierarchy rules |

### 6.2 Print safety

The layout solver must enforce:

- Minimum effective glyph size
- Minimum stroke width in points
- Modifier clearance
- Separator readability
- Safe-zone constraints
- Collision limits

If a requested density cannot fit the phrase at the selected output size, the compiler must return a diagnostic rather than shrinking glyphs below production safety.

---

## 7. Input field: corruption level

The UI exposes corruption as `0–100`; the compiler receives a normalized `0–1` value.

```ts
corruptionLevel: number; // inclusive 0–1
```

Corruption is a grammatical and transmission-state system, not a generic distress filter.

### 7.1 Corruption operation classes

```ts
export type CorruptionOperation =
  | ReversibleSubstitution
  | ReversibleMirror
  | ReversiblePermutation
  | PayloadOcclusion
  | DecorativeInterference
  | LossyPayloadOperation;
```

Corruption may govern:

- Reversible glyph substitution
- Sequence inversion
- Mirrored passages
- Interrupted clauses
- False starts
- Overwritten separators
- Recorded occlusions
- Duplicate echoes
- Decoy interference
- Signal dropout
- Surface abrasion
- Misregistration

### 7.2 Corruption bands

| UI range | Name | Behavior |
|---:|---|---|
| 0–15 | Canonical | Clean archive state with negligible interference |
| 16–35 | Noise | Minor substitutions, registration drift, and surface interruption |
| 36–60 | Interrupted | Clause occlusion, false passages, and mirrored fragments |
| 61–80 | Degraded | Heavy masks, decoy dominance, repeated echoes, broken reading order |
| 81–100 | Event Field | Near-unreadable public surface with canonical payload retained privately |

### 7.3 Exact-mode policy

Exact mode permits only invertible operations or non-destructive masking.

A visually missing glyph remains in the SVG:

```xml
<g id="canonical-payload">
  <g id="g000018" mask="url(#occlusion-0004)">
    <!-- unchanged authored glyph paths -->
  </g>
</g>
```

The private manifest records:

- Mask identifier
- Covered node
- Mask geometry seed
- Original reading order
- Required inverse operation

### 7.4 Stylized-mode policy

Stylized mode may use destructive presentation operations, but:

- The canonical AST remains intact.
- The private manifest retains the source.
- The public output is marked as visually non-reversible.
- Destructive corruption never overwrites the canonical vector master.

### 7.5 Corruption eligibility

Each glyph node declares whether it may be:

- Mirrored
- Reordered
- Substituted
- Occluded
- Duplicated
- Surrounded by decoys

Core semantic anchors may be protected from high corruption to preserve compositional hierarchy.

---

## 8. Input field: layout family

Layouts are finite canon-approved solvers, not arbitrary presets.

```ts
export interface LayoutSolver {
  readonly id: LayoutFamilyId;
  readonly version: string;

  solve(input: Readonly<{
    nodes: readonly GlyphEnvelope[];
    bounds: Rect;
    density: number;
    substrate: SubstrateSampler;
    rng: DeterministicStream;
  }>): LayoutPlan;
}
```

### 8.1 Initial layout registry

#### Orthogonal Wall

Clauses occupy architectural rows, blocks, and channels. Suitable for dense fields, textile repeats, and manuscript walls.

#### Clause Columns

Vertical processional clauses. Suitable for garment backs, scrolls, narrow posters, and banners.

#### Concentric Rings

Primary semantic clause occupies central rings; exact-text inscription, witness marks, and checksums occupy secondary rings.

#### Alpha Radial

Uses 137 angular divisions or selected modular positions to distribute symbols around a controlled center.

#### Processional Spiral

The phrase unfolds inward or outward along a mathematical spiral, preserving reading direction through tangent frames.

#### Mirrored Passage

Two clauses oppose or reflect each other across a separator, void, axis, or central event.

#### Reliquary Grid

Discrete chambers hold semantic roots, modifiers, literal escapes, annotations, and corrupted fragments.

### 8.2 Layout responsibilities

Each solver controls:

- Reading order
- Clause position
- Glyph transforms
- Modifier attachment
- Separator placement
- Collision avoidance
- Orientation
- Substrate alignment
- Minimum print size
- Mirrored-sequence geometry
- Protected negative space

It receives only glyph envelopes, anchors, and immutable geometry references. It cannot edit path commands.

---

## 9. Input field: mathematical substrate

Mathematical substrates organize space. They must use real, documented constructions rather than fake equations.

Do not accept arbitrary formulas in V1. Use a finite versioned registry.

```ts
export interface SubstrateSampler {
  readonly id: SubstrateId;
  readonly version: string;

  pointAt(tFixed: number): Point;
  frameAt(tFixed: number): Readonly<{
    tangent: Vector;
    normal: Vector;
  }>;
  maskRegion?(
    bounds: Rect,
    rng: DeterministicStream
  ): DeterministicMask;
}
```

### 9.1 Initial substrate registry

#### Alpha Radial Lattice

```text
θₙ = 2πn / 137
```

Creates 137 angular divisions for clause anchors, witness marks, or orbital inscriptions.

#### Modular Residue Field

```text
rₙ = n² mod 137
```

Maps selected residues to circular, linear, or Cartesian locations. The result is deterministic and structurally tied to 137.

#### Fine-Structure Construction

```text
α = e² / (4πε₀ℏc)
```

Used as legitimate annotated substrate and proportion logic. It must not be presented as a magical proof or filled with fabricated derivations.

For geometric approximation:

```ts
export const ALPHA_APPROX_V1 = Object.freeze({
  numerator: 1,
  denominator: 137,
});
```

#### Golden Processional Spiral

```text
r = ae^(bθ)
```

Useful for directional phrases and progressive revelation.

#### Lissajous Archive Field

```text
x = A sin(at + δ)
y = B sin(bt)
```

Ratios such as `1:3:7` may connect the field to Studio 137 without pretending that the relationship is physically fundamental.

#### Voronoi Reliquary

Seeded sites create cells that contain clauses, roots, annotations, and corrupted remnants.

### 9.2 Substrate restrictions

Substrates may generate:

- Coordinates
- Tangents and normals
- Guide curves
- Regions
- Masks
- Registration marks
- Annotation geometry

Substrates may not generate or alter canonical glyph paths.

---

## 10. Input field: output size

```ts
export type OutputSize = Readonly<{
  width: number;
  height: number;
  unit: "px" | "in" | "mm";
  dpi: number;
  bleed?: number;
  safeMargin?: number;
}>;
```

### 10.1 Initial presets

- 4096 × 4096 digital master
- 12 × 16 inch apparel print area
- 16 × 20 inch poster
- 18 × 24 inch poster
- 24 × 36 inch poster
- 16 × 32 inch desk mat
- 5.75 × 8 inch journal cover template
- Custom dimensions

### 10.2 Defaults

- Production DPI: 300
- Preview DPI: 96 or 144
- Vector master retained regardless of raster dimensions
- Transparent or solid-background variants
- Explicit bleed and safe area for print templates

### 10.3 Physical conversion

```text
pixels = round(sizeInInches × DPI)
```

```ts
function toInches(
  value: number,
  unit: "px" | "in" | "mm",
  dpi: number
): number {
  if (unit === "in") return value;
  if (unit === "mm") return value / 25.4;
  return value / dpi;
}
```

### 10.4 Output guards

Reject or warn on:

- Excessive total pixel area
- Glyphs below minimum stroke width
- Unsafe bleed
- Unsupported aspect ratio for selected layout
- Transparent output where a full-bleed print template requires background extension
- Density that cannot fit at the requested physical size

---

## 11. Canonical compiler architecture

### 11.1 Semantic model

```ts
export type SemanticUnit =
  | ClauseUnit
  | RootConceptUnit
  | ModifierUnit
  | RelationUnit
  | SeparatorUnit
  | MirroredSequenceUnit
  | LiteralEscapeUnit;
```

The compiler must not reduce the grammar to one glyph per character. Exact source preservation and semantic interpretation are parallel systems.

### 11.2 Canonical AST

```ts
export type CanonicalPlateAST = Readonly<{
  schema: "studio137.canonical-plate";
  schemaVersion: 1;
  plateId: string;
  versions: VersionContract;
  sourceDigest: string;
  clauses: readonly CanonicalClauseNode[];
}>;

export type CanonicalGlyphNode = Readonly<{
  nodeId: string;
  clauseIndex: number;
  tokenIndex: number;
  semanticUnitId: string;
  rootFamilyId: RootFamilyId;
  modifierIds: readonly ModifierId[];
  geometryId: GlyphGeometryId;
  geometryVersion: string;
  mirrorEligibility: MirrorEligibility;
  corruptionEligibility: CorruptionEligibility;
  payloadRef: string;
}>;
```

`payloadRef` is an opaque private-manifest reference. Public exports strip it.

### 11.3 Presentation plan

```ts
export type PresentationPlan = Readonly<{
  layout: LayoutPlan;
  substrate: SubstratePlan;
  transforms: readonly ReversibleTransform[];
  corruption: readonly CorruptionOperation[];
  decoys: readonly DecoyNode[];
  atmosphere: AtmospherePlan;
}>;
```

The canonical AST is never destructively modified.

---

## 12. Authored glyph geometry registry

Each canonical glyph is stored as approved SVG path data.

```ts
export type GlyphGeometryRecord = Readonly<{
  id: GlyphGeometryId;
  version: string;
  viewBox: readonly [number, number, number, number];
  paths: readonly LockedPath[];
  anchors: Readonly<{
    center: Point;
    entry?: Point;
    exit?: Point;
    modifierSlots: readonly Point[];
  }>;
  collisionEnvelope: readonly Point[];
  minimumPrintStrokePt: number;
  integritySha256: string;
}>;
```

### 12.1 Registry rules

- Canonical glyphs use authored paths, never live fonts.
- Every geometry record has an integrity hash.
- Existing geometry versions are immutable.
- New drawing revisions create new geometry versions.
- Layout modules receive bounds and anchors, not path-editing APIs.
- Atmosphere modules receive silhouettes, not mutable paths.

### 12.2 SVG scene groups

```text
substrate
decoys-behind
canonical-payload
reversible-transforms
payload-masks
decoys-front
atmosphere
registration
```

A debug render can disable every noncanonical layer and confirm that the canonical payload hash remains unchanged.

---

## 13. Output artifacts

A successful compilation produces five independently controlled artifact classes.

```text
plate-{plateId}.canonical.svg
plate-{plateId}.production.png
plate-{plateId}.clause-sheet.pdf
plate-{plateId}.print.svg
plate-{plateId}.private.s137
```

Public and private artifacts must never be placed into the same automatic download bundle.

---

## 14. Output: canonical SVG

The SVG is the authoritative vector master.

### 14.1 Requirements

- Deterministic element order
- Deterministic attribute order
- Fixed numeric precision
- Canonical matrix representation
- Normalized colors
- Normalized path whitespace
- Stable line endings
- Ordinal public node IDs
- No system-font dependency for payload glyphs
- No generative reconstruction

### 14.2 Public metadata exclusions

The public SVG must not contain:

- Source phrase
- Normalized phrase
- Seed
- Semantic mapping
- Private payload references
- Local paths
- Filenames from the development machine
- Usernames
- Hostnames
- Repository locations
- Timestamps
- Software version strings
- Editor namespaces
- Source maps
- Comments containing development evidence

Public IDs should be ordinal:

```text
g000001
g000002
mask000001
decoy000001
```

Do not derive IDs from source text hashes.

### 14.3 Internal verification SVG

An internal-only SVG may contain semantic annotations for testing, but it must be emitted through a separate development path and must never be returned by the public export endpoint.

---

## 15. Output: production PNG

The PNG is rasterized from the serialized canonical SVG.

### 15.1 Requirements

- Default 300 DPI for production
- Deterministic pixel dimensions
- Pinned SVG rasterizer
- Explicit background behavior
- No browser screenshots
- No independently reconstructed geometry
- Strip metadata chunks and timestamps
- Preserve alpha when requested
- Validate minimum visible stroke

Recommended pipeline:

```text
Canonical SVG
    ↓
@resvg/resvg-js
    ↓
Raw PNG
    ↓
sharp metadata scrub and validation
    ↓
Production PNG
```

Strip:

- `tEXt`
- `zTXt`
- `iTXt`
- EXIF
- XMP
- software strings
- timestamps

---

## 16. Output: decoded clause sheet

The decoded clause sheet is private by default and generated from the AST plus manifest, never by interpreting the rendered image.

### 16.1 Suggested sections

1. Plate identifier
2. Grammar and geometry versions
3. Exact source phrase
4. Normalized semantic view
5. Clause segmentation
6. Root families used
7. Modifier stack per root
8. Relations and separators
9. Mirrored structures
10. Literal escape payloads
11. Corruption and occlusion records
12. Reading order
13. Reversibility status
14. Public artifact hashes

### 16.2 Formats

Primary:

```text
PDF
```

Optional internal formats:

```text
JSON
Markdown
```

A collector-facing translation card must be a distinct redacted artifact. It should not be created by hiding fields in the private clause sheet.

---

## 17. Output: print composition

The print composition wraps the canonical plate inside a versioned product template.

```ts
export type PrintTemplate = Readonly<{
  id: string;
  version: string;
  trimWidthMm: number;
  trimHeightMm: number;
  bleedMm: number;
  safeMarginMm: number;
  colorPolicy: "srgb-v1";
  backgroundPolicy: "extend-to-bleed" | "solid-to-bleed";
}>;
```

### 17.1 Rules

- Print concerns wrap the canonical plate; they do not alter glyph paths.
- Bleed, trim, safe area, and registration remain separate layers.
- The vector master remains available independently.
- V1 begins with one physically validated poster template.
- Apparel, journal, desk-mat, and Printful templates follow physical proofing.

### 17.2 V1 output

```text
plate-{plateId}.print.svg
```

Future adapters may add:

- PDF/X-4
- Product-specific transparent PNG
- Printful placement package
- Photoshop smart object
- Blender curve import package

---

## 18. Output: private encoding manifest

The private manifest carries the information required for exact reconstruction and verification.

```ts
export type PrivateEncodingManifest = Readonly<{
  schema: "studio137.private-manifest";
  manifestVersion: string;
  plateId: string;
  versions: VersionContract;
  request: PlateRequest;
  source: SourcePayload;
  tokenMappings: readonly TokenMapping[];
  inverseOperations: readonly InverseOperation[];
  corruptionSites: readonly CorruptionRecord[];
  occlusionSites: readonly OcclusionRecord[];
  rng: Readonly<{
    seedDigest: string;
    streamDerivationVersion: string;
    streamDigests: Readonly<Record<RngStreamName, string>>;
  }>;
  artifacts: Readonly<{
    canonicalSvgSha256: string;
    productionPngSha256: string;
    printCompositionSha256: string;
    clauseSheetSha256: string;
  }>;
}>;
```

### 18.1 Container

Recommended filename:

```text
plate-{plateId}.private.s137
```

Encrypted container:

```text
magic bytes
container version
salt
nonce
ciphertext
authentication tag
```

### 18.2 Encryption policy

- AES-256-GCM
- Per-manifest salt and nonce
- HKDF-SHA-256 key derivation
- Artist-held master key
- Key never enters the browser bundle
- Key never enters logs or public artifacts
- Phrase seed is not used as an encryption key
- Tampered containers fail closed

Do not store full PRNG draw logs unless a debugging build explicitly requires them. Versioned algorithms and named stream digests are sufficient for replay.

---

## 19. Version contract

Every plate pins all behavior required for future reproduction.

```ts
export type VersionContract = Readonly<{
  grammarVersion: string;
  geometryVersion: string;
  unicodePolicyVersion: string;
  rngVersion: string;
  layoutVersion: string;
  substrateVersion: string;
  corruptionVersion: string;
  rendererVersion: string;
  manifestVersion: string;
  printTemplateVersion: string;
}>;
```

Never overwrite a released registry in place.

```text
grammar/v1
grammar/v2
geometry/v1
geometry/v2
```

If a required version is unavailable, decoding must fail with a clear unsupported-version error. Do not perform best-effort reinterpretation.

---

## 20. Technical stack

### 20.1 Workspace and language

- TypeScript
- Next.js App Router
- React
- Node for trusted local/server operations
- pnpm workspaces or Turborepo
- Strict TypeScript settings
- Reproducible dependency lockfile

### 20.2 Validation and state

- Zod for request, AST, manifest, and registry schemas
- Zustand for temporary editor state
- Web Worker for responsive client-side preview compilation
- Canonical request hashes for caching

### 20.3 Vector preview and rendering

- Native SVG for plate preview
- Custom deterministic SVG serializer
- No Canvas-based canonical glyph renderer
- Optional R3F/WebGL environment around the editor, never as the vector source of truth

### 20.4 Raster pipeline

- `@resvg/resvg-js` for deterministic SVG rasterization
- `sharp` for final PNG handling, validation, and metadata stripping

### 20.5 Documents

- `pdf-lib` or a deterministic SVG/PDF pipeline for clause sheets
- Future PDF/X adapter for professional print workflows

### 20.6 Storage

Local-first V1:

- Encrypted `.s137` manifests
- SQLite with Drizzle for plate index and non-secret metadata
- Filesystem artifact store
- Restrictive local permissions

Hosted future:

- PostgreSQL
- S3-compatible object storage
- Signed private URLs
- KMS or managed secret storage

### 20.7 Testing

- Vitest for unit and integration tests
- fast-check for property-based exact-decoding tests
- Playwright for interface and export-flow tests
- SHA-256 golden artifact hashes
- Pixel hashes for pinned PNG fixtures
- Clean-environment reproduction tests

### 20.8 Optional future integrations

- Printful adapter
- Blender SVG-curve export
- Photoshop smart-object package
- Studio 137 archive registration
- R3F spatial plate viewer
- Physical edition registry
- Pattern Engine interoperability

---

## 21. Repository structure

```text
studio137/
├─ apps/
│  └─ plate-generator/
│     ├─ app/
│     │  ├─ generator/
│     │  └─ api/plates/
│     │     ├─ compile/
│     │     ├─ export-public/
│     │     ├─ export-private/
│     │     └─ verify/
│     └─ components/
│        ├─ PhraseEditor.tsx
│        ├─ ParameterPanel.tsx
│        ├─ PlatePreview.tsx
│        ├─ LayerInspector.tsx
│        └─ ExportPanel.tsx
│
├─ packages/
│  ├─ glyph-engine/
│  ├─ glyph-registry/
│  ├─ layout-engine/
│  ├─ substrate-engine/
│  ├─ corruption-engine/
│  ├─ render-svg/
│  ├─ render-atmosphere/
│  ├─ render-raster/
│  ├─ render-print/
│  ├─ clause-sheet/
│  ├─ private-manifest/
│  └─ artifact-security/
│
└─ bible/
   └─ encoding/
      ├─ grammar-v1.md
      ├─ geometry-registry.md
      ├─ substrate-registry.md
      └─ corruption-classification.md
```

---

## 22. Interface design

### 22.1 Source panel

- Phrase
- Exact or stylized mode
- Seed
- Seed lock
- Grammar version
- Parsed clause preview
- Semantic warnings
- Literal escape warnings

### 22.2 Plate viewport

- Native SVG preview
- Zoom and pan
- Paper or transparency simulation
- Physical-size preview
- Print boundaries
- Before/after corruption comparison
- Layer isolation

### 22.3 Parameter panel

- Density
- Corruption level
- Layout family
- Mathematical substrate
- Output dimensions
- Units
- DPI
- Bleed
- Safe area
- Background policy

### 22.4 Layer inspector

```text
Canonical payload
Modifiers
Separators
Exact-text inscription
Substrate
Reversible corruption
Occlusion
Decoys
Atmosphere
Registration
Print boundaries
```

### 22.5 Export panel

Public:

- Canonical SVG
- Production PNG
- Print composition

Private:

- Decoded clause sheet
- Encrypted encoding manifest

Never provide an automatic mixed public/private archive.

---

## 23. Execution boundaries

Client-safe:

- Input editing
- Validation
- Request hashing
- Low-resolution previews
- Layer inspection
- Non-secret preset sharing

Trusted local/server process:

- Manifest encryption
- Private export
- Production rasterization
- Clause-sheet generation
- Metadata scrubbing
- Filesystem writes
- Future Printful credentials

Suggested endpoint separation:

```text
POST /api/plates/compile
POST /api/plates/export/public
POST /api/plates/export/private
POST /api/plates/verify
```

The public export endpoint must never return a manifest or decoded clause sheet.

---

## 24. Artifact security

Public artifact scanning must reject:

- Original phrase
- Normalized phrase
- Seed
- Semantic mappings
- Manifest fields
- Environment variables
- Absolute paths
- Windows usernames
- Hostnames
- Repository names
- Filenames from local source systems
- Timestamps
- Software strings
- Source maps
- Encryption material

Public metadata scrubbing is mandatory for SVG, PNG, and future PDF exports.

---

## 25. Core compiler flow

```ts
export async function compilePlate(
  input: unknown,
  registries: CompilerRegistries
): Promise<CompiledPlate> {
  const request = PlateRequestSchema.parse(input);
  const source = preserveSourcePayload(request.phrase);
  const semanticView = normalizeForSemantics(source, registries.unicodePolicy);

  const masterSeed = await deriveMasterSeed(request.seed);
  const streams = await createNamedStreams(masterSeed, RNG_VERSION);

  const lexicalUnits = lexPhrase(semanticView, registries.grammar);
  const semanticUnits = compileSemanticUnits(
    lexicalUnits,
    registries.grammar
  );

  const canonicalAst = buildCanonicalAst({
    source,
    semanticUnits,
    grammar: registries.grammar,
    geometry: registries.geometry,
  });

  const substrate = planSubstrate({
    request,
    rng: streams.substrate,
    registry: registries.substrates,
  });

  const layout = solveLayout({
    ast: canonicalAst,
    request,
    substrate,
    rng: streams.layout,
    registry: registries.layouts,
  });

  const corruption = planCorruption({
    ast: canonicalAst,
    request,
    rng: streams.corruption,
    grammar: registries.grammar,
  });

  const decoys = planDecoys({
    ast: canonicalAst,
    request,
    layout,
    rng: streams.decoys,
  });

  const atmosphere = planAtmosphere({
    request,
    layout,
    rng: streams.atmosphere,
  });

  return deepFreeze({
    request,
    source,
    canonicalAst,
    presentation: {
      substrate,
      layout,
      corruption,
      decoys,
      atmosphere,
    },
  });
}
```

---

## 26. Verification gates

### Gate 1: Grammar conformance

A fixture must exercise:

- All nine root families
- All four modifiers
- Every separator
- Clause boundaries
- Mirrored passages
- Every corruption rule
- Unsupported literal payloads

Artist approval is required before publishing grammar V1.

### Gate 2: Exact round trip

```ts
decodeExact(
  decryptManifest(
    exportPrivate(
      compilePlate(exactRequest)
    )
  )
) === originalUtf8Phrase;
```

Property tests cover:

- Composed and decomposed Unicode
- Punctuation
- Whitespace
- Repeated clauses
- Unsupported words
- Non-Latin characters
- Unusual code points
- Right-to-left content where accepted

### Gate 3: Cross-runtime determinism

Compare fixed-fixture hashes for:

- Canonical AST
- Presentation plan
- SVG
- PNG pixels
- Print composition

### Gate 4: Locked path integrity

Hash path data:

```text
registry load
after semantic compilation
after layout
after corruption planning
after atmosphere planning
after public export
```

Every canonical path hash must remain unchanged.

### Gate 5: Privacy scan

Inspect decoded metadata and raw bytes for prohibited private or machine information.

### Gate 6: Print validation

Verify:

- Dimensions
- Bleed
- Safe area
- DPI-equivalent pixels
- Minimum stroke
- Alpha policy
- Background extension
- File limits

### Gate 7: Authorship review

Confirm:

- Semantic structure is visible.
- Roots and modifiers remain distinguishable.
- Corruption feels authored rather than generic.
- Mathematical substrate organizes meaning.
- Removing atmosphere does not alter payload geometry.
- The plate belongs unmistakably to Studio 137.

---

## 27. Step-by-step build roadmap

### Phase 0 — Canon audit

**Estimated effort:** 3–5 days

1. Gather all nine root families.
2. Gather all four modifiers.
3. Enumerate separators and clause rules.
4. Document mirrored sequences.
5. Classify every corruption operation.
6. Identify canonical glyph drawings.
7. Define literal escape behavior.
8. Approve the initial substrate list.

**Exit condition:** Artist-approved `grammar-v1.md` and `corruption-classification.md`.

### Phase 1 — Canonical glyph registry

**Estimated effort:** 1–2 weeks

1. Redraw every canonical glyph as clean SVG.
2. Create modifier attachments and separators.
3. Add anchors and collision envelopes.
4. Define minimum print strokes.
5. Hash all path data.
6. Produce a contact sheet for visual approval.
7. Freeze geometry V1.

**Exit condition:** Every semantic unit resolves to approved immutable vector geometry.

### Phase 2 — Semantic compiler core

**Estimated effort:** 1 week

1. Preserve exact UTF-8 input.
2. Implement semantic normalization.
3. Build clause lexer and parser.
4. Compile root concepts and modifiers.
5. Handle separators and mirroring.
6. Implement literal escapes.
7. Produce immutable AST.
8. Add exact round-trip tests.

**Exit condition:** Phrase → AST → exact phrase succeeds without rendering.

### Phase 3 — Deterministic random system

**Estimated effort:** 3–5 days

1. Implement seed hashing.
2. Implement named streams.
3. Add PRNG test vectors.
4. Canonicalize request serialization.
5. Quantize geometry math.
6. Add repeated-run tests.

**Exit condition:** Repeated runs produce byte-identical compiler structures.

### Phase 4 — First layout and substrate

**Estimated effort:** 1–2 weeks

Implement only:

- Concentric Rings layout
- Alpha Radial Lattice substrate
- Exact mode
- No destructive corruption

Tasks:

1. Implement layout interface.
2. Place canonical glyph envelopes.
3. Attach modifiers.
4. Place separators and exact-text inscription.
5. Enforce collisions and print safety.
6. Produce debug geometry visualizations.

**Exit condition:** A real phrase generates a visually credible deterministic plate.

### Phase 5 — Canonical SVG renderer

**Estimated effort:** 1 week

1. Implement deterministic SVG scene generation.
2. Normalize attributes and transforms.
3. Strip public metadata.
4. Add layer groups.
5. Add canonical path integrity checks.
6. Add golden SVG fixtures.

**Exit condition:** Identical inputs produce byte-identical public SVG.

### Phase 6 — Corruption and decoys

**Estimated effort:** 1 week

1. Implement reversible substitution.
2. Implement sequence mirroring and permutation.
3. Implement recorded occlusion masks.
4. Build a non-semantic decoy registry.
5. Enforce exact/stylized policies.
6. Add corruption diagnostics.
7. Verify that canonical hashes do not change.

**Exit condition:** Corruption changes presentation without changing canonical paths.

### Phase 7 — Artifact pipeline

**Estimated effort:** 1–2 weeks

1. Build production PNG rasterization.
2. Strip PNG metadata.
3. Implement encrypted manifest.
4. Implement exact decoder.
5. Generate clause-sheet PDF.
6. Build one poster print template.
7. Hash all artifacts.
8. Add separate public/private export services.

**Exit condition:** One request produces all five valid artifacts.

### Phase 8 — Interactive editor

**Estimated effort:** 1 week

1. Build phrase and seed controls.
2. Add density and corruption controls.
3. Add layout and substrate selection.
4. Add output-size controls.
5. Build native SVG preview.
6. Add layer inspector.
7. Add print-boundary preview.
8. Add reversibility indicator.
9. Add separate export controls.
10. Move preview compilation into a Web Worker if needed.

**Exit condition:** A nontechnical user can create and export a plate without editing code.

### Phase 9 — Security and reproducibility

**Estimated effort:** 1 week

1. Add property-based exact decoding tests.
2. Add cross-runtime fixtures.
3. Add public-artifact leakage scanner.
4. Add manifest tamper tests.
5. Add maximum-output guards.
6. Test a clean installation.
7. Compare all artifact hashes.

**Exit condition:** A clean environment reproduces the golden plate exactly and public exports contain no private reconnaissance data.

### Phase 10 — Physical proof

**Estimated effort:** 1–2 weeks including production time

Produce:

- 24 × 36 poster
- 12 × 16 apparel print
- Journal cover
- Optional desk mat

Inspect:

- Stroke survival
- Black density
- Red registration
- Mask behavior
- Modifier visibility
- Clause hierarchy
- Fine-detail retention
- Surface and material interaction

**Exit condition:** At least one print template passes physical inspection.

### Phase 11 — Expansion

After V1 passes:

1. Add additional layout families.
2. Add additional mathematical substrates.
3. Create collector translation sheets.
4. Add product templates.
5. Add Printful adapters.
6. Add edition registration.
7. Add Blender and Photoshop packages.
8. Add R3F spatial plate viewing.
9. Connect the Pattern Engine.
10. Add batch and series generation.

---

## 28. Effort estimate

A focused prototype with one layout, one substrate, exact mode, SVG, and basic PNG output is approximately **4–6 weeks**.

A robust V1 with:

- Canonical vector registry
- Semantic compiler
- Reversible corruption
- Five output artifacts
- Interactive editor
- Encryption
- Privacy scanning
- Determinism tests
- Physical print validation

is approximately **8–12 weeks** for one experienced developer working with timely artist review.

The primary creative bottleneck is not React or file export. It is freezing the grammar and producing canonical authored glyph geometry. If those are rushed, the result becomes another decorative sigil generator regardless of technical sophistication.

---

## 29. Golden V1 fixture

Use one permanent fixture across compiler, renderer, exports, and physical proofing.

```text
Phrase: THE SIGNAL SURVIVES THE BODY
Mode: Exact
Layout: Concentric Rings
Substrate: Alpha Radial Lattice
Density: 55
Corruption: 25
Output: 24 × 36 inches
DPI: 300
```

This fixture should generate:

```text
golden-signal.canonical.svg
golden-signal.production.png
golden-signal.clause-sheet.pdf
golden-signal.print.svg
golden-signal.private.s137
```

Its AST hash, SVG hash, PNG pixel hash, print hash, and decoded phrase become permanent release gates.

---

## 30. Definition of done

Studio 137 Phrase-to-Plate V1 is complete when:

1. The State Bible grammar is encoded and artist-approved.
2. All canonical glyphs exist as locked vector masters.
3. Exact-mode phrases decode byte-for-byte.
4. Same inputs reproduce identical outputs.
5. Corruption cannot mutate canonical glyph paths.
6. Public SVG and PNG contain no private payload or machine metadata.
7. All five artifact classes export successfully.
8. The interface communicates reversibility and print constraints clearly.
9. A clean environment reproduces the golden fixture.
10. A physical 24 × 36 proof passes visual and production inspection.

Only after these conditions pass should Printful automation, cloud hosting, or additional generative layers be connected to the system.
