// ─────────────────────────────────────────────────────────────────────────────
// STATE TABLE — the 16 world-states as DATA, not scenes.
// Spec: STATE_BIBLE.md §2. Bits order: [SIGNAL, LUMEN, FLORA, DECAY] (L1..L4).
// ─────────────────────────────────────────────────────────────────────────────

export type Bits = [number, number, number, number];

export const LEVER_NAMES = ["SIGNAL", "LUMEN", "FLORA", "DECAY"] as const;

export const LEVER_LABELS: [string, string][] = [
  ["DRIFT", "STORM"],      // L1 SIGNAL
  ["DAWN", "DUSK"],        // L2 LUMEN
  ["BARREN", "OVERGROWN"], // L3 FLORA
  ["PRISTINE", "ANCIENT"], // L4 DECAY
];

export interface StateDef {
  index: number;
  bits: Bits;
  name: string;
  signet: string; // file label, e.g. signet_1010_signal_bloom
  palette: { wall: string; accent: string; glow: string; light: string };
  moodLine: string;
  feel: string;
}

const RAW: Omit<StateDef, "index">[] = [
  { bits: [0,0,0,0], name: "PRIMROSE",     signet: "signet_0000_primrose",     palette: { wall: "#D2A6A3", accent: "#7C8B5A", glow: "#4FC3E0", light: "#E8C25A" }, moodLine: "the room woke clean at first light", feel: "quiet museum at 6am. innocent." },
  { bits: [0,0,0,1], name: "SCRATCH",      signet: "signet_0001_scratch",      palette: { wall: "#C99A8F", accent: "#9C5B45", glow: "#DCC9A3", light: "#D89E5A" }, moodLine: "someone was here before, and left marks", feel: "chipped, dusty, personal." },
  { bits: [0,0,1,0], name: "SPROUT",       signet: "signet_0010_sprout",       palette: { wall: "#C9A6A0", accent: "#6E8B4E", glow: "#5E7F4B", light: "#E8C25A" }, moodLine: "the first thing that grew back", feel: "hopeful. one fern on the console." },
  { bits: [0,0,1,1], name: "THATCH",       signet: "signet_0011_thatch",       palette: { wall: "#B98F8B", accent: "#5C7A44", glow: "#B08A54", light: "#D89E5A" }, moodLine: "the house gave itself to the field", feel: "old greenhouse morning. mellow." },
  { bits: [0,1,0,0], name: "GLASS",        signet: "signet_0100_glass",        palette: { wall: "#8FA8B5", accent: "#A7C4CE", glow: "#3A7BD5", light: "#6C5B8A" }, moodLine: "you are the specimen in the jar", feel: "cold clean observatory. blue. watched." },
  { bits: [0,1,0,1], name: "NIT",          signet: "signet_0101_nit",          palette: { wall: "#8A96A6", accent: "#7A8CA0", glow: "#44506A", light: "#5D598F" }, moodLine: "cold storage. do not wake the rest.", feel: "silent vault. moon through the window." },
  { bits: [0,1,1,0], name: "COLDHOUSE",    signet: "signet_0110_coldhouse",    palette: { wall: "#7F9B8E", accent: "#4F7B6E", glow: "#9FC0B0", light: "#6C5B8A" }, moodLine: "the garden at the hour the lights die", feel: "plants in a dark glasshouse, dew." },
  { bits: [0,1,1,1], name: "REED",         signet: "signet_0111_reed",         palette: { wall: "#7C8E7E", accent: "#B9A357", glow: "#3E5F50", light: "#5D598F" }, moodLine: "the marsh takes the wiring back", feel: "cold wild ruin, swaying." },
  { bits: [1,0,0,0], name: "SIREN",        signet: "signet_1000_siren",        palette: { wall: "#C89A8F", accent: "#C8452C", glow: "#5FBC47", light: "#E8C25A" }, moodLine: "signal acquired. it sees you.", feel: "the moment it starts watching." },
  { bits: [1,0,0,1], name: "TAPE",         signet: "signet_1001_tape",         palette: { wall: "#B8988C", accent: "#69B45A", glow: "#4A5A4E", light: "#D8C9A0" }, moodLine: "the archive is speaking in its sleep", feel: "hv hiss, magnetic memory, dawn burn-in." },
  { bits: [1,0,1,0], name: "SIGNAL-BLOOM", signet: "signet_1010_signal_bloom", palette: { wall: "#C49D94", accent: "#C07A7A", glow: "#5FBC47", light: "#E8C25A" }, moodLine: "code and rose, grown together", feel: "the machine and the field in love." },
  { bits: [1,0,1,1], name: "FERNSTORM",    signet: "signet_1011_fernstorm",    palette: { wall: "#8F807C", accent: "#3E5F50", glow: "#69B45A", light: "#C8804A" }, moodLine: "the garden computes. it is compiling", feel: "data rain through leaves. wind in the terminal." },
  { bits: [1,1,0,0], name: "DUSKBELL",     signet: "signet_1100_duskbell",     palette: { wall: "#6C7B97", accent: "#4F78C0", glow: "#3A5A86", light: "#6C5B8A" }, moodLine: "the bell at the bottom of the light", feel: "clean dark with a secret signal." },
  { bits: [1,1,0,1], name: "RADIOGRAVE",   signet: "signet_1101_radiograve",   palette: { wall: "#6A6F84", accent: "#5F8790", glow: "#69B45A", light: "#5D598F" }, moodLine: "you tuned into something you should not have", feel: "music drifting in the static. ah." },
  { bits: [1,1,1,0], name: "VINES",        signet: "signet_1110_vines",        palette: { wall: "#6E7A6E", accent: "#3E6A50", glow: "#4F8A8A", light: "#6C5B8A" }, moodLine: "the wires learned to flower", feel: "dim jungle where the lights breathe." },
  { bits: [1,1,1,1], name: "IT",           signet: "signet_1111_it",           palette: { wall: "#5E636F", accent: "#3E5F50", glow: "#5FBC47", light: "#4A4470" }, moodLine: "you are in it now. fully.", feel: "the machine's own dusk. the final facsimile." },
];

export const STATE_TABLE: StateDef[] = RAW.map((d, i) => ({ ...d, index: i }));

export function bitsToIndex(bits: Bits): number {
  return bits[0] * 8 + bits[1] * 4 + bits[2] * 2 + bits[3];
}

export function indexToBits(i: number): Bits {
  return [(i >> 3) & 1, (i >> 2) & 1, (i >> 1) & 1, i & 1];
}

export function stateFor(bits: Bits): StateDef {
  return STATE_TABLE[bitsToIndex(bits)];
}

// ── Derived render params: one LUT row → what the scene actually does. ──────
export interface DerivedParams {
  lightColor: string;
  lightIntensity: number;
  fogColor: string;
  codeDensity: number;   // 0..1  (L1)
  floraAmount: number;   // 0..1  (L3)
  decayAmount: number;   // 0..1  (L4)
  bloomStrength: number;
  dusk: boolean;         // L2
}

export function deriveParams(s: StateDef): DerivedParams {
  const [sig, lum, flo, dec] = s.bits;
  const dusk = lum === 1;
  return {
    lightColor: dusk ? s.palette.light : "#FFE3C2",
    lightIntensity: dusk ? 0.55 : 1.15,
    fogColor: dusk ? s.palette.accent : "#D9BFA9",
    codeDensity: sig ? 0.9 : 0.2,
    floraAmount: flo ? 1 : 0.15,
    decayAmount: dec ? 1 : 0.2,
    bloomStrength: 0.55 + sig * 0.35 + (dec ? 0.15 : 0),
    dusk,
  };
}