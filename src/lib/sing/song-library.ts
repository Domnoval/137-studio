/**
 * 137 Voice — Song Library
 * Curated collection of royalty-free/Creative Commons backing tracks.
 * Organized by genre, difficulty, and vocal range.
 */

export type VocalRange = 'low' | 'mid' | 'high' | 'any';
export type Difficulty = 'beginner' | 'intermediate' | 'advanced';
export type Genre = 'pop' | 'rock' | 'r&b' | 'jazz' | 'blues' | 'folk' | 'electronic' | 'classical' | 'hip-hop' | 'musical-theater';

export interface Song {
  id: string;
  title: string;
  artist: string;           // Original artist or "Original"
  genre: Genre;
  bpm: number;
  key: string;              // e.g. "C Major", "A Minor"
  difficulty: Difficulty;
  vocalRange: VocalRange;
  duration: number;         // seconds
  backingTrackUrl?: string; // URL to backing track audio
  lyricsText?: string;      // Synced lyrics
  tags: string[];
  isFree: boolean;
}

export interface WarmUpExercise {
  id: string;
  name: string;
  description: string;
  category: 'breath' | 'pitch' | 'range' | 'agility' | 'tone';
  difficulty: Difficulty;
  duration: number;         // seconds
  instructions: string[];
  targetNotes?: string[];   // Notes to hit during exercise
}

// Built-in warm-up exercises
export const WARM_UP_EXERCISES: WarmUpExercise[] = [
  {
    id: 'lip-trill',
    name: 'Lip Trill Scale',
    description: 'Relax your vocal cords with lip trills ascending and descending a major scale.',
    category: 'breath',
    difficulty: 'beginner',
    duration: 60,
    instructions: [
      'Take a deep breath from your diaphragm',
      'Let your lips buzz loosely as you exhale',
      'Follow the ascending pitch guide',
      'Descend back down smoothly',
    ],
    targetNotes: ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5', 'B4', 'A4', 'G4', 'F4', 'E4', 'D4', 'C4'],
  },
  {
    id: 'siren',
    name: 'Vocal Siren',
    description: 'Smoothly glide from your lowest comfortable note to your highest and back.',
    category: 'range',
    difficulty: 'beginner',
    duration: 45,
    instructions: [
      'Start at your lowest comfortable note',
      'Slowly slide up to your highest note on "oo"',
      'Glide back down without breaks',
      'Keep your jaw relaxed throughout',
    ],
  },
  {
    id: 'staccato-ha',
    name: 'Staccato "Ha"',
    description: 'Build diaphragm support with sharp, detached "ha" sounds on each note.',
    category: 'breath',
    difficulty: 'intermediate',
    duration: 60,
    instructions: [
      'Place your hand on your belly to feel diaphragm engagement',
      'Sing short, punchy "ha" on each note',
      'Keep each note clean and separate',
      'Maintain consistent volume',
    ],
    targetNotes: ['C4', 'E4', 'G4', 'C5', 'G4', 'E4', 'C4'],
  },
  {
    id: 'five-note-descend',
    name: '5-Note Descending Scale',
    description: 'Descending 5-note pattern moving up by half steps each round. Great for smoothing out your break.',
    category: 'pitch',
    difficulty: 'intermediate',
    duration: 90,
    instructions: [
      'Sing "mee-may-mah-moh-moo" descending 5 notes',
      'Start each round a half-step higher',
      'Focus on smooth transitions between registers',
      'Keep tone consistent from top to bottom',
    ],
    targetNotes: ['G4', 'F#4', 'F4', 'E4', 'D#4'],
  },
  {
    id: 'agility-run',
    name: 'Agility Runs',
    description: 'Fast ascending and descending patterns to build vocal agility for melismatic singing.',
    category: 'agility',
    difficulty: 'advanced',
    duration: 90,
    instructions: [
      'Sing rapid 8-note ascending runs on "ah"',
      'Keep each note precise even at speed',
      'Start slow, gradually increase tempo',
      'Descend with equal precision',
    ],
    targetNotes: ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'],
  },
  {
    id: 'sustained-tone',
    name: 'Sustained Tone Hold',
    description: 'Build breath support and tone quality by holding single notes as long as possible.',
    category: 'tone',
    difficulty: 'beginner',
    duration: 60,
    instructions: [
      'Take a deep, low breath',
      'Sing and hold each note on "ah"',
      'Focus on keeping the tone steady',
      'Try to extend your hold time each round',
    ],
    targetNotes: ['C4', 'E4', 'G4', 'C5'],
  },
];

// Demo/placeholder song library (royalty-free)
export const DEMO_SONGS: Song[] = [
  {
    id: 'original-blues-1',
    title: 'Midnight Blues Jam',
    artist: '137 Studio Original',
    genre: 'blues',
    bpm: 80,
    key: 'A Minor',
    difficulty: 'beginner',
    vocalRange: 'mid',
    duration: 180,
    tags: ['slow', 'soulful', 'beginner-friendly'],
    isFree: true,
  },
  {
    id: 'original-pop-1',
    title: 'City Lights',
    artist: '137 Studio Original',
    genre: 'pop',
    bpm: 120,
    key: 'C Major',
    difficulty: 'beginner',
    vocalRange: 'mid',
    duration: 210,
    tags: ['upbeat', 'catchy', 'modern'],
    isFree: true,
  },
  {
    id: 'original-rock-1',
    title: 'Edge of Tomorrow',
    artist: '137 Studio Original',
    genre: 'rock',
    bpm: 140,
    key: 'E Minor',
    difficulty: 'intermediate',
    vocalRange: 'high',
    duration: 240,
    tags: ['energetic', 'driving', 'anthem'],
    isFree: true,
  },
  {
    id: 'original-rnb-1',
    title: 'Velvet Hours',
    artist: '137 Studio Original',
    genre: 'r&b',
    bpm: 95,
    key: 'D Minor',
    difficulty: 'intermediate',
    vocalRange: 'mid',
    duration: 210,
    tags: ['smooth', 'sultry', 'neo-soul'],
    isFree: true,
  },
  {
    id: 'original-jazz-1',
    title: 'Autumn Standards',
    artist: '137 Studio Original',
    genre: 'jazz',
    bpm: 110,
    key: 'Bb Major',
    difficulty: 'advanced',
    vocalRange: 'any',
    duration: 270,
    tags: ['swing', 'classic', 'improvisation'],
    isFree: true,
  },
  {
    id: 'original-folk-1',
    title: 'River Song',
    artist: '137 Studio Original',
    genre: 'folk',
    bpm: 100,
    key: 'G Major',
    difficulty: 'beginner',
    vocalRange: 'low',
    duration: 200,
    tags: ['acoustic', 'gentle', 'storytelling'],
    isFree: true,
  },
  {
    id: 'original-electronic-1',
    title: 'Neon Dreams',
    artist: '137 Studio Original',
    genre: 'electronic',
    bpm: 128,
    key: 'F Minor',
    difficulty: 'intermediate',
    vocalRange: 'high',
    duration: 240,
    tags: ['synth', 'atmospheric', 'futuristic'],
    isFree: true,
  },
  {
    id: 'original-hiphop-1',
    title: 'Concrete Poetry',
    artist: '137 Studio Original',
    genre: 'hip-hop',
    bpm: 90,
    key: 'C Minor',
    difficulty: 'intermediate',
    vocalRange: 'low',
    duration: 200,
    tags: ['boom-bap', 'lyrical', 'rhythmic'],
    isFree: true,
  },
];

// Filter/search utilities
export function filterSongs(songs: Song[], filters: {
  genre?: Genre;
  difficulty?: Difficulty;
  vocalRange?: VocalRange;
  search?: string;
}): Song[] {
  return songs.filter((song) => {
    if (filters.genre && song.genre !== filters.genre) return false;
    if (filters.difficulty && song.difficulty !== filters.difficulty) return false;
    if (filters.vocalRange && song.vocalRange !== filters.vocalRange && song.vocalRange !== 'any') return false;
    if (filters.search) {
      const q = filters.search.toLowerCase();
      return (
        song.title.toLowerCase().includes(q) ||
        song.artist.toLowerCase().includes(q) ||
        song.tags.some((t) => t.includes(q))
      );
    }
    return true;
  });
}
