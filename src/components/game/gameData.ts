// Game constants and data
export const TAROT_CARDS = [
  { 
    name: 'The Fool', 
    effect: 'invincible', 
    duration: 3000,
    description: 'Invincible for 3 seconds'
  },
  { 
    name: 'The Tower', 
    effect: 'instant_death',
    description: 'Instant death (lol)'
  },
  { 
    name: 'The Lovers', 
    effect: 'double_points',
    duration: 10000,
    description: 'Double points'
  },
  { 
    name: 'Death', 
    effect: 'free_revival',
    description: 'One free revival'
  },
  { 
    name: 'The Devil', 
    effect: 'reversed_controls',
    duration: 5000,
    description: 'Controls reversed for 5 seconds'
  },
  { 
    name: 'The Star', 
    effect: 'magnet',
    duration: 8000,
    description: 'Magnet pulls collectibles'
  },
  { 
    name: 'The Hermit', 
    effect: 'slow_motion',
    duration: 5000,
    description: 'Slow motion for 5 seconds'
  },
  { 
    name: 'Wheel of Fortune', 
    effect: 'random',
    description: 'Random effect'
  }
];

export const DEATH_MESSAGES = [
  "Jupiter penetrated your orbit",
  "Saturn came too early", 
  "Mercury is in retrograde. So are you.",
  "The Tower fell. On your face.",
  "You got Uranus'd",
  "Death says: see you in 3... 2... 1...",
  "Your chakras are now fully misaligned",
  "The safe word was 'Metatron'",
  "Even The Fool saw that coming",
  "That's what you get for trusting Venus"
];

export const SCORING = {
  REGULAR_BUMPER: 13,
  TRIANGLE_BUMPER: 37,
  HEXAGON_BUMPER: 137,
  GLYPH_COLLECT: 69,
  ZODIAC_LANE: 111,
  LEVEL_COMPLETE: 777,
  CIPHER_BONUS: 1337
};

export const SCORE_MILESTONES = [137, 369, 777, 1111, 1337];

export const COLORS = {
  VOID: '#141218',
  AMBER: '#d4a040', 
  MAGENTA: '#c43070',
  MIST: '#706870',
  CHALK: '#d0c8be',
  BLOOD: '#8a2030'
};

export const ZODIAC_PLANETS = [
  '☿', '♀', '♂', '♃', '♄', '⚢', '♆', '♇'
];

export const SACRED_GLYPHS = [
  '⊙', '△', '▽', '◯', '☉', '⚹', '✦', '◊'
];
