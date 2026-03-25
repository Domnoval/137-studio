/**
 * 137 Lyrics Engine — Data-driven songwriting algorithm
 *
 * Every parameter is backed by research:
 * - Salimpoor et al. (2011) Nature Neuroscience: dopamine anticipation/release cycles
 * - Jakubowski et al. (2017) Psychology of Aesthetics: earworm melodic features
 * - Reagan et al. (2016) EPJ Data Science: 6 emotional arc shapes
 * - Vargas et al. (2024) Nature Scientific Reports: lyric simplicity trends
 * - Frontiers in AI (2023): 97.2% hit prediction from neurophysiology
 */

// ── Types ───────────────────────────────────────────────────────────────

export type LyricMode =
  | 'chart-dominator'
  | 'deep-resonance'
  | 'viral-hook'
  | 'storyteller'
  | 'conscious'
  | 'raw-bars';

export type EmotionalArc =
  | 'man-in-a-hole'    // fall then rise (sad verse → uplifting chorus)
  | 'cinderella'        // rise-fall-rise (hope → setback → triumph)
  | 'icarus'            // rise then fall (euphoria → crash)
  | 'rags-to-riches'    // steady rise (building anthem)
  | 'oedipus'           // fall-rise-fall (bittersweet)
  | 'tragedy';          // steady fall (heavy/dark)

export type RhymeScheme = 'AABB' | 'ABAB' | 'XAXA' | 'AABA' | 'ABCB' | 'FREE';

export type SongSection =
  | 'intro'
  | 'verse'
  | 'pre-chorus'
  | 'chorus'
  | 'post-chorus'
  | 'bridge'
  | 'outro'
  | 'hook'
  | 'drop'
  | 'breakdown'
  | 'instrumental';

export interface Genre {
  id: string;
  label: string;
  category: string;
  bpmRange: [number, number];
  bpmSweet: number;
  defaultKey: string;
  defaultMode: 'major' | 'minor';
  sunoTags: string[];
  defaultVocals: string[];
  defaultInstruments: string[];
}

export interface ModeConfig {
  id: LyricMode;
  label: string;
  description: string;
  icon: string;
  readingLevel: number;       // Flesch-Kincaid grade target
  wordCountRange: [number, number];
  repetitionRatio: number;    // 0-1, how repetitive (higher = more chorus repetition)
  vocabularyComplexity: number; // 0-1 (0 = simplest)
  preferredArcs: EmotionalArc[];
  preferredRhymes: RhymeScheme[];
  preferredStructures: SongSection[][];
  hookPlacement: 'first-15s' | 'within-30s' | 'verse-first';
  bpmModifier: number;        // added to genre sweet spot
  nearRhymeRatio: number;     // 0-1, preference for near vs perfect rhymes
  targetEmotions: string[];
}

export interface SongContext {
  mode: LyricMode;
  genre: string;
  theme: string;
  coreMessage: string;
  targetEmotion: string;
  emotionalArc: EmotionalArc;
  audienceState: string;
  desiredOutcome: string;
  vocalStyle: string;
  energy: string;
  additionalTags: string[];
}

export interface AlgorithmOutput {
  structure: SongSection[];
  bpm: number;
  key: string;
  keyMode: 'major' | 'minor';
  rhymeScheme: RhymeScheme;
  readingLevel: number;
  wordCountTarget: number;
  repetitionTarget: number;
  emotionalArc: EmotionalArc;
  sunoStylePrompt: string;
  sunoTags: string[];
  sectionGuidance: Record<string, SectionGuidance>;
}

export interface SectionGuidance {
  section: string;
  emotionalTarget: string;
  energyLevel: 'low' | 'building' | 'peak' | 'shift' | 'release';
  lineCount: number;
  syllableDensity: 'sparse' | 'moderate' | 'dense';
  purpose: string;
}

// ── Genre Database ──────────────────────────────────────────────────────

export const GENRES: Genre[] = [
  // Pop
  { id: 'pop', label: 'Pop', category: 'Pop', bpmRange: [100, 130], bpmSweet: 120, defaultKey: 'G', defaultMode: 'major', sunoTags: ['Pop'], defaultVocals: ['Smooth'], defaultInstruments: ['Synth', 'Piano'] },
  { id: 'synth-pop', label: 'Synth Pop', category: 'Pop', bpmRange: [110, 130], bpmSweet: 122, defaultKey: 'C', defaultMode: 'major', sunoTags: ['Synth Pop', '80s Synth'], defaultVocals: ['Falsetto'], defaultInstruments: ['Synth', 'Synth Pad', 'Drum Machine'] },
  { id: 'indie-pop', label: 'Indie Pop', category: 'Pop', bpmRange: [100, 130], bpmSweet: 115, defaultKey: 'G', defaultMode: 'major', sunoTags: ['Indie Pop'], defaultVocals: ['Soft'], defaultInstruments: ['Acoustic Guitar', 'Piano'] },
  { id: 'dream-pop', label: 'Dream Pop', category: 'Pop', bpmRange: [80, 120], bpmSweet: 100, defaultKey: 'D', defaultMode: 'major', sunoTags: ['Dream Pop', 'Ethereal'], defaultVocals: ['Soft', 'Reverb'], defaultInstruments: ['Synth Pad', 'Electric Guitar'] },
  { id: 'dance-pop', label: 'Dance Pop', category: 'Pop', bpmRange: [115, 135], bpmSweet: 128, defaultKey: 'C', defaultMode: 'major', sunoTags: ['Dance Pop', 'Upbeat'], defaultVocals: ['Powerful'], defaultInstruments: ['Synth', 'Drum Machine'] },

  // Hip-Hop & R&B
  { id: 'hip-hop', label: 'Hip-Hop', category: 'Hip-Hop & R&B', bpmRange: [80, 115], bpmSweet: 95, defaultKey: 'A', defaultMode: 'minor', sunoTags: ['Hip Hop'], defaultVocals: ['Rap'], defaultInstruments: ['808s', 'Synth Bass'] },
  { id: 'trap', label: 'Trap', category: 'Hip-Hop & R&B', bpmRange: [130, 170], bpmSweet: 144, defaultKey: 'A', defaultMode: 'minor', sunoTags: ['Trap'], defaultVocals: ['Rap', 'AutoTune'], defaultInstruments: ['808s', 'Synth', 'Drum Machine'] },
  { id: 'rnb', label: 'R&B', category: 'Hip-Hop & R&B', bpmRange: [60, 90], bpmSweet: 78, defaultKey: 'E', defaultMode: 'minor', sunoTags: ['R&B'], defaultVocals: ['Smooth', 'Falsetto'], defaultInstruments: ['Electric Piano', 'Synth Bass'] },
  { id: 'neo-soul', label: 'Neo Soul', category: 'Hip-Hop & R&B', bpmRange: [70, 100], bpmSweet: 85, defaultKey: 'D', defaultMode: 'minor', sunoTags: ['Neo Soul', 'Soulful'], defaultVocals: ['Smooth', 'Vulnerable'], defaultInstruments: ['Electric Piano', 'Acoustic Guitar'] },
  { id: 'lo-fi-hiphop', label: 'Lo-fi Hip-Hop', category: 'Hip-Hop & R&B', bpmRange: [70, 90], bpmSweet: 80, defaultKey: 'A', defaultMode: 'minor', sunoTags: ['Lo-fi Hip Hop', 'Chill'], defaultVocals: ['Soft', 'Whisper'], defaultInstruments: ['Electric Piano', 'Vinyl Crackle'] },
  { id: 'drill', label: 'Drill', category: 'Hip-Hop & R&B', bpmRange: [135, 150], bpmSweet: 140, defaultKey: 'G', defaultMode: 'minor', sunoTags: ['Drill'], defaultVocals: ['Rap', 'Aggressive'], defaultInstruments: ['808s', 'Synth'] },
  { id: 'boom-bap', label: 'Boom Bap', category: 'Hip-Hop & R&B', bpmRange: [85, 100], bpmSweet: 92, defaultKey: 'C', defaultMode: 'minor', sunoTags: ['Boom Bap', 'Classic Hip Hop'], defaultVocals: ['Rap'], defaultInstruments: ['Drums', 'Saxophone'] },

  // Electronic
  { id: 'edm', label: 'EDM', category: 'Electronic', bpmRange: [118, 135], bpmSweet: 128, defaultKey: 'C', defaultMode: 'minor', sunoTags: ['EDM'], defaultVocals: ['Powerful'], defaultInstruments: ['Synth', 'Lead Synth', 'Drum Machine'] },
  { id: 'house', label: 'House', category: 'Electronic', bpmRange: [118, 135], bpmSweet: 124, defaultKey: 'G', defaultMode: 'minor', sunoTags: ['House'], defaultVocals: ['Smooth'], defaultInstruments: ['Synth', 'Synth Bass'] },
  { id: 'synthwave', label: 'Synthwave', category: 'Electronic', bpmRange: [80, 120], bpmSweet: 105, defaultKey: 'A', defaultMode: 'minor', sunoTags: ['Synthwave', 'Retrowave', '80s'], defaultVocals: ['Smooth', 'Vocoder'], defaultInstruments: ['Synth', 'Synth Pad', 'Drum Machine'] },
  { id: 'dnb', label: 'Drum & Bass', category: 'Electronic', bpmRange: [160, 180], bpmSweet: 174, defaultKey: 'A', defaultMode: 'minor', sunoTags: ['Drum and Bass'], defaultVocals: ['Powerful'], defaultInstruments: ['Synth Bass', 'Breakbeat'] },

  // Rock
  { id: 'rock', label: 'Rock', category: 'Rock', bpmRange: [100, 140], bpmSweet: 120, defaultKey: 'E', defaultMode: 'major', sunoTags: ['Rock'], defaultVocals: ['Raspy', 'Powerful'], defaultInstruments: ['Electric Guitar', 'Drums'] },
  { id: 'indie-rock', label: 'Indie Rock', category: 'Rock', bpmRange: [100, 140], bpmSweet: 118, defaultKey: 'G', defaultMode: 'major', sunoTags: ['Indie Rock'], defaultVocals: ['Soft'], defaultInstruments: ['Electric Guitar', 'Acoustic Guitar'] },
  { id: 'alt-rock', label: 'Alternative Rock', category: 'Rock', bpmRange: [100, 140], bpmSweet: 122, defaultKey: 'E', defaultMode: 'minor', sunoTags: ['Alternative Rock'], defaultVocals: ['Raspy'], defaultInstruments: ['Electric Guitar', 'Drums'] },

  // Country & Folk
  { id: 'country', label: 'Country', category: 'Country & Folk', bpmRange: [90, 140], bpmSweet: 110, defaultKey: 'G', defaultMode: 'major', sunoTags: ['Country'], defaultVocals: ['Smooth'], defaultInstruments: ['Acoustic Guitar', 'Violin'] },
  { id: 'folk', label: 'Folk', category: 'Country & Folk', bpmRange: [80, 120], bpmSweet: 100, defaultKey: 'G', defaultMode: 'major', sunoTags: ['Indie Folk', 'Folk'], defaultVocals: ['Soft'], defaultInstruments: ['Acoustic Guitar', 'Piano'] },

  // Latin & World
  { id: 'reggaeton', label: 'Reggaeton', category: 'Latin & World', bpmRange: [80, 100], bpmSweet: 92, defaultKey: 'A', defaultMode: 'minor', sunoTags: ['Reggaeton'], defaultVocals: ['Smooth'], defaultInstruments: ['808s', 'Percussion'] },
  { id: 'afrobeats', label: 'Afrobeats', category: 'Latin & World', bpmRange: [100, 120], bpmSweet: 108, defaultKey: 'G', defaultMode: 'major', sunoTags: ['Afrobeats'], defaultVocals: ['Smooth'], defaultInstruments: ['Percussion', 'Synth'] },

  // Jazz & Soul
  { id: 'jazz', label: 'Jazz', category: 'Jazz & Soul', bpmRange: [80, 140], bpmSweet: 110, defaultKey: 'F', defaultMode: 'major', sunoTags: ['Jazz'], defaultVocals: ['Smooth', 'Sultry'], defaultInstruments: ['Saxophone', 'Piano', 'Drums'] },
  { id: 'bossa-nova', label: 'Bossa Nova', category: 'Jazz & Soul', bpmRange: [100, 130], bpmSweet: 115, defaultKey: 'D', defaultMode: 'major', sunoTags: ['Bossa Nova'], defaultVocals: ['Soft'], defaultInstruments: ['Acoustic Guitar', 'Piano'] },

  // Ambient & Experimental
  { id: 'ambient', label: 'Ambient', category: 'Ambient & Experimental', bpmRange: [60, 100], bpmSweet: 75, defaultKey: 'D', defaultMode: 'major', sunoTags: ['Ambient', 'Ethereal'], defaultVocals: ['Whisper', 'Choir'], defaultInstruments: ['Synth Pad', 'Piano'] },
  { id: 'hyperpop', label: 'Hyperpop', category: 'Ambient & Experimental', bpmRange: [140, 170], bpmSweet: 155, defaultKey: 'C', defaultMode: 'major', sunoTags: ['Hyperpop', 'Glitchcore'], defaultVocals: ['AutoTune', 'Distorted Vocals'], defaultInstruments: ['Lead Synth', '808s'] },
];

// ── Mode Configurations ─────────────────────────────────────────────────

export const MODE_CONFIGS: Record<LyricMode, ModeConfig> = {
  'chart-dominator': {
    id: 'chart-dominator',
    label: 'Chart Dominator',
    description: 'Engineered for maximum streams. Data-optimized hooks, proven structures, earworm science.',
    icon: 'crown',
    readingLevel: 3,
    wordCountRange: [150, 250],
    repetitionRatio: 0.85,
    vocabularyComplexity: 0.2,
    preferredArcs: ['man-in-a-hole', 'cinderella', 'rags-to-riches'],
    preferredRhymes: ['XAXA', 'AABB'],
    preferredStructures: [
      ['chorus', 'verse', 'chorus', 'verse', 'chorus', 'bridge', 'chorus'],
      ['verse', 'pre-chorus', 'chorus', 'verse', 'pre-chorus', 'chorus', 'bridge', 'chorus'],
      ['intro', 'verse', 'chorus', 'verse', 'chorus', 'bridge', 'chorus', 'outro'],
    ],
    hookPlacement: 'first-15s',
    bpmModifier: 5,
    nearRhymeRatio: 0.3,
    targetEmotions: ['euphoric', 'empowered', 'nostalgic', 'romantic'],
  },

  'deep-resonance': {
    id: 'deep-resonance',
    label: 'Deep Resonance',
    description: 'Emotionally devastating. Complex metaphors, meaningful arcs, the kind of song that changes people.',
    icon: 'heart',
    readingLevel: 5,
    wordCountRange: [200, 350],
    repetitionRatio: 0.5,
    vocabularyComplexity: 0.7,
    preferredArcs: ['oedipus', 'icarus', 'man-in-a-hole'],
    preferredRhymes: ['ABCB', 'ABAB', 'FREE'],
    preferredStructures: [
      ['verse', 'verse', 'chorus', 'verse', 'chorus', 'bridge', 'chorus'],
      ['verse', 'pre-chorus', 'chorus', 'verse', 'pre-chorus', 'chorus', 'bridge', 'chorus', 'outro'],
      ['intro', 'verse', 'chorus', 'verse', 'chorus', 'verse', 'chorus'],
    ],
    hookPlacement: 'verse-first',
    bpmModifier: -10,
    nearRhymeRatio: 0.7,
    targetEmotions: ['melancholic', 'vulnerable', 'bittersweet', 'cathartic'],
  },

  'viral-hook': {
    id: 'viral-hook',
    label: 'Viral Hook',
    description: 'Built for the algorithm. First 7 seconds IS the hook. TikTok-optimized, meme-ready, earworm science.',
    icon: 'bolt',
    readingLevel: 2,
    wordCountRange: [100, 180],
    repetitionRatio: 0.95,
    vocabularyComplexity: 0.1,
    preferredArcs: ['rags-to-riches', 'cinderella'],
    preferredRhymes: ['AABB', 'XAXA'],
    preferredStructures: [
      ['chorus', 'verse', 'chorus', 'post-chorus', 'verse', 'chorus', 'post-chorus'],
      ['hook', 'verse', 'chorus', 'hook', 'verse', 'chorus', 'hook'],
      ['chorus', 'verse', 'chorus', 'bridge', 'chorus', 'chorus'],
    ],
    hookPlacement: 'first-15s',
    bpmModifier: 9, // Earworm research: +9 BPM above average
    nearRhymeRatio: 0.2,
    targetEmotions: ['euphoric', 'playful', 'confident', 'energetic'],
  },

  'storyteller': {
    id: 'storyteller',
    label: 'Storyteller',
    description: 'Narrative-driven cinema for the ears. Characters, plot, imagery. Every verse moves the story forward.',
    icon: 'book',
    readingLevel: 4,
    wordCountRange: [250, 400],
    repetitionRatio: 0.4,
    vocabularyComplexity: 0.6,
    preferredArcs: ['cinderella', 'icarus', 'oedipus', 'tragedy'],
    preferredRhymes: ['ABAB', 'ABCB', 'XAXA'],
    preferredStructures: [
      ['intro', 'verse', 'chorus', 'verse', 'chorus', 'verse', 'bridge', 'chorus', 'outro'],
      ['verse', 'verse', 'chorus', 'verse', 'verse', 'chorus', 'bridge', 'chorus'],
      ['intro', 'verse', 'pre-chorus', 'chorus', 'verse', 'pre-chorus', 'chorus', 'bridge', 'outro'],
    ],
    hookPlacement: 'within-30s',
    bpmModifier: -5,
    nearRhymeRatio: 0.5,
    targetEmotions: ['nostalgic', 'cinematic', 'intimate', 'bittersweet'],
  },

  'conscious': {
    id: 'conscious',
    label: 'Conscious / Spiritual',
    description: 'Sacred geometry meets sound. Awakening themes, mystical but accessible. The 137 frequency.',
    icon: 'eye',
    readingLevel: 5,
    wordCountRange: [200, 350],
    repetitionRatio: 0.55,
    vocabularyComplexity: 0.65,
    preferredArcs: ['rags-to-riches', 'cinderella', 'man-in-a-hole'],
    preferredRhymes: ['ABCB', 'FREE', 'ABAB'],
    preferredStructures: [
      ['intro', 'verse', 'chorus', 'verse', 'chorus', 'bridge', 'chorus', 'outro'],
      ['verse', 'pre-chorus', 'chorus', 'verse', 'pre-chorus', 'chorus', 'bridge', 'chorus'],
      ['intro', 'verse', 'verse', 'chorus', 'verse', 'chorus', 'bridge', 'outro'],
    ],
    hookPlacement: 'within-30s',
    bpmModifier: -5,
    nearRhymeRatio: 0.6,
    targetEmotions: ['transcendent', 'peaceful', 'awakened', 'mystical'],
  },

  'raw-bars': {
    id: 'raw-bars',
    label: 'Raw Bars',
    description: 'Dense wordplay, multi-syllabic rhymes, complex flows. Every bar hits. Lyrical athletics.',
    icon: 'mic',
    readingLevel: 6,
    wordCountRange: [400, 800],
    repetitionRatio: 0.3,
    vocabularyComplexity: 0.85,
    preferredArcs: ['rags-to-riches', 'icarus', 'man-in-a-hole'],
    preferredRhymes: ['AABB', 'ABAB'],
    preferredStructures: [
      ['verse', 'chorus', 'verse', 'chorus', 'verse', 'chorus'],
      ['intro', 'verse', 'verse', 'chorus', 'verse', 'verse', 'chorus', 'outro'],
      ['verse', 'hook', 'verse', 'hook', 'verse', 'hook'],
    ],
    hookPlacement: 'within-30s',
    bpmModifier: 0,
    nearRhymeRatio: 0.4,
    targetEmotions: ['confident', 'aggressive', 'clever', 'powerful'],
  },
};

// ── Emotional Arc Definitions ───────────────────────────────────────────

export const EMOTIONAL_ARCS: Record<EmotionalArc, {
  label: string;
  description: string;
  shape: number[]; // normalized 0-1 energy values across song
  bestFor: string;
}> = {
  'man-in-a-hole': {
    label: 'Man in a Hole',
    description: 'Fall then rise. Start in the struggle, build to triumph.',
    shape: [0.5, 0.3, 0.2, 0.5, 0.8, 0.3, 0.6, 0.9, 1.0],
    bestFor: 'Overcoming adversity, heartbreak recovery, redemption',
  },
  'cinderella': {
    label: 'Cinderella',
    description: 'Rise, fall, rise. Hope meets setback meets triumph.',
    shape: [0.3, 0.6, 0.8, 0.4, 0.3, 0.5, 0.7, 0.9, 1.0],
    bestFor: 'Love stories, comeback anthems, dream-chasing',
  },
  'icarus': {
    label: 'Icarus',
    description: 'Rise then fall. Euphoria crashes down.',
    shape: [0.3, 0.5, 0.7, 0.9, 1.0, 0.8, 0.5, 0.3, 0.2],
    bestFor: 'Cautionary tales, lost love, hubris',
  },
  'rags-to-riches': {
    label: 'Rags to Riches',
    description: 'Steady rise. Each section builds on the last.',
    shape: [0.1, 0.2, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0],
    bestFor: 'Anthems, empowerment, celebration, motivation',
  },
  'oedipus': {
    label: 'Oedipus',
    description: 'Fall, rise, fall. Bittersweet revelation.',
    shape: [0.7, 0.5, 0.3, 0.5, 0.8, 0.9, 0.7, 0.4, 0.2],
    bestFor: 'Complex emotions, bittersweet love, philosophical themes',
  },
  'tragedy': {
    label: 'Tragedy',
    description: 'Steady descent. Heavy, dark, unresolved.',
    shape: [0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.15, 0.1],
    bestFor: 'Loss, grief, dark themes, artistic statements',
  },
};

// ── Suno Tag Database ───────────────────────────────────────────────────

export const SUNO_TAGS = {
  vocals: [
    'Male Vocal', 'Female Vocal', 'Duet', 'Choir',
    'Whisper', 'Spoken Word', 'Rap', 'Harmonies', 'Falsetto',
    'Belting', 'Operatic', 'Raspy', 'Smooth', 'Sultry',
  ],
  vocalEffects: [
    'Reverb', 'Delay', 'AutoTune', 'Distorted Vocals', 'Vocoder', 'Telephone Effect',
  ],
  emotions: [
    'Vulnerable', 'Powerful', 'Soft', 'Aggressive', 'Melancholic',
    'Joyful', 'Sultry', 'Haunting', 'Triumphant', 'Intimate',
  ],
  energy: [
    'High Energy', 'Medium Energy', 'Low Energy', 'Chill',
    'Driving', 'Explosive', 'Building', 'Relaxed', 'Steady',
  ],
  moods: [
    'Uplifting', 'Melancholic', 'Haunting', 'Dark', 'Joyful',
    'Nostalgic', 'Romantic', 'Intense', 'Dreamy', 'Peaceful',
    'Euphoric', 'Mysterious', 'Epic', 'Intimate', 'Bittersweet',
  ],
  soundEffects: [
    'Birds Chirping', 'Rain', 'Thunder', 'Ocean Waves',
    'Applause', 'Cheering', 'Whistling', 'Silence',
  ],
  structure: [
    'Intro', 'Verse', 'Pre-Chorus', 'Chorus', 'Post-Chorus',
    'Bridge', 'Outro', 'Hook', 'Break', 'Drop', 'Buildup',
    'Instrumental', 'Interlude', 'Solo', 'Fade Out', 'Fade to end', 'Ending',
  ],
};

// ── Section Guidance Generator ──────────────────────────────────────────

function getSectionGuidance(
  section: SongSection,
  index: number,
  total: number,
  arc: EmotionalArc,
  mode: ModeConfig,
): SectionGuidance {
  const arcShape = EMOTIONAL_ARCS[arc].shape;
  const position = Math.floor((index / total) * (arcShape.length - 1));
  const energy = arcShape[position];

  const energyLevel: SectionGuidance['energyLevel'] =
    energy < 0.3 ? 'low' :
    energy < 0.5 ? 'building' :
    energy < 0.7 ? 'shift' :
    energy < 0.85 ? 'peak' :
    'release';

  const guidance: Record<SongSection, { purpose: string; lineCount: number; density: SectionGuidance['syllableDensity'] }> = {
    intro: { purpose: 'Set the atmosphere. Minimal words, maximum mood.', lineCount: 2, density: 'sparse' },
    verse: { purpose: 'Scene-setting, storytelling, detail. Build the world.', lineCount: 8, density: 'moderate' },
    'pre-chorus': { purpose: 'Build tension. Anticipation before the payoff.', lineCount: 4, density: 'moderate' },
    chorus: { purpose: 'The emotional thesis. The hook. What they remember.', lineCount: 6, density: mode.id === 'raw-bars' ? 'dense' : 'moderate' },
    'post-chorus': { purpose: 'Reinvent the hook. Ad-libs, variations, infectious repetition.', lineCount: 4, density: 'sparse' },
    bridge: { purpose: 'The twist. New perspective. Emotional shift.', lineCount: 4, density: 'moderate' },
    outro: { purpose: 'Resolution or lingering question. Let it breathe.', lineCount: 4, density: 'sparse' },
    hook: { purpose: 'The catchiest 2-4 bars. Ultra-memorable.', lineCount: 2, density: 'moderate' },
    drop: { purpose: 'Instrumental impact. Minimal or no lyrics.', lineCount: 1, density: 'sparse' },
    breakdown: { purpose: 'Strip it back. Raw, exposed moment.', lineCount: 4, density: 'sparse' },
    instrumental: { purpose: 'Let the music speak. No lyrics.', lineCount: 0, density: 'sparse' },
  };

  const g = guidance[section];
  const emotionMap: Record<SectionGuidance['energyLevel'], string> = {
    low: 'reflective, intimate, grounded',
    building: 'anticipation, tension rising, leaning in',
    shift: 'contrast, new angle, surprise',
    peak: 'maximum emotional impact, catharsis',
    release: 'euphoria, triumph, resolution',
  };

  return {
    section,
    emotionalTarget: emotionMap[energyLevel],
    energyLevel,
    lineCount: g.lineCount,
    syllableDensity: g.density,
    purpose: g.purpose,
  };
}

// ── The Algorithm ───────────────────────────────────────────────────────

export function computeAlgorithm(context: SongContext): AlgorithmOutput {
  const mode = MODE_CONFIGS[context.mode];
  const genre = GENRES.find(g => g.id === context.genre) || GENRES[0];

  // Select structure (first preferred for now; generation can vary)
  const structure = mode.preferredStructures[0];

  // BPM: genre sweet spot + mode modifier
  const bpm = Math.round(genre.bpmSweet + mode.bpmModifier);

  // Key: use genre default, shift to minor for darker arcs
  const darkArcs: EmotionalArc[] = ['tragedy', 'oedipus', 'icarus'];
  const keyMode = darkArcs.includes(context.emotionalArc) ? 'minor' : genre.defaultMode;
  const key = genre.defaultKey;

  // Rhyme scheme: first preferred
  const rhymeScheme = mode.preferredRhymes[0];

  // Word count: midpoint of range
  const wordCountTarget = Math.round((mode.wordCountRange[0] + mode.wordCountRange[1]) / 2);

  // Build Suno style prompt
  const sunoTags = [
    ...genre.sunoTags,
    ...(context.additionalTags || []),
  ];

  const vocalTag = context.vocalStyle || genre.defaultVocals[0];
  const sunoStylePrompt = [
    ...genre.sunoTags,
    context.energy ? `${context.energy}` : '',
    vocalTag ? `${vocalTag} vocals` : '',
    ...genre.defaultInstruments.slice(0, 2),
  ].filter(Boolean).join(', ');

  // Section guidance
  const sectionGuidance: Record<string, SectionGuidance> = {};
  structure.forEach((section, i) => {
    const key = `${section}-${i}`;
    sectionGuidance[key] = getSectionGuidance(
      section, i, structure.length, context.emotionalArc, mode,
    );
  });

  return {
    structure,
    bpm,
    key,
    keyMode,
    rhymeScheme,
    readingLevel: mode.readingLevel,
    wordCountTarget,
    repetitionTarget: mode.repetitionRatio,
    emotionalArc: context.emotionalArc,
    sunoStylePrompt,
    sunoTags,
    sectionGuidance,
  };
}

// ── Suno Format Export ──────────────────────────────────────────────────

export function formatForSuno(
  lyrics: Record<string, string>,
  algorithm: AlgorithmOutput,
  context: SongContext,
): string {
  const genre = GENRES.find(g => g.id === context.genre) || GENRES[0];
  const vocalTag = context.vocalStyle || genre.defaultVocals[0];

  let output = '';

  // Style header
  output += `[Style: ${algorithm.sunoStylePrompt}]\n`;
  output += `[BPM: ${algorithm.bpm}]\n`;
  if (vocalTag) output += `[${vocalTag}]\n`;
  if (context.energy) output += `[${context.energy}]\n`;
  output += '\n';

  // Sections
  const sectionCounts: Record<string, number> = {};
  algorithm.structure.forEach((section) => {
    sectionCounts[section] = (sectionCounts[section] || 0) + 1;
    const count = sectionCounts[section];
    const sectionLabel = section.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('-');
    const displayLabel = count > 1 ? `${sectionLabel} ${count}` : sectionLabel;

    output += `[${displayLabel}]\n`;

    const lyricKey = `${section}-${count - 1}`;
    const altKey = `${section}`;
    const content = lyrics[lyricKey] || lyrics[altKey] || '';
    if (content) {
      output += content + '\n';
    }
    output += '\n';
  });

  return output.trim();
}
