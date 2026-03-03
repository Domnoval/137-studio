// Works Data - Michael's polymath portfolio in perfect balance
// Art, Code, Philosophy, Music - each facet equally weighted

export interface Work {
  id: string;
  title: string;
  type: 'painting' | 'digital' | 'app' | '3d' | 'mixed';
  aspect: 'portrait' | 'landscape' | 'square' | 'panoramic';
  url?: string;
  description?: string;
  facet: 'art' | 'code' | 'philosophy' | 'sound';
}

export const works: Work[] = [
  // ART FACET - Physical and digital artworks
  { 
    id: 'floral-3', 
    title: 'Floral Study III', 
    type: 'painting', 
    aspect: 'portrait',
    facet: 'art',
    description: 'Botanical exploration in sacred proportions'
  },
  { 
    id: 'manyfaceddog', 
    title: 'The Many-Faced Dog', 
    type: 'painting', 
    aspect: 'square',
    facet: 'art',
    description: 'Multiplicity of perspective in one being'
  },
  { 
    id: 'madness-arcitexy', 
    title: 'The Madness & Arcitexy', 
    type: 'painting', 
    aspect: 'landscape',
    facet: 'art',
    description: 'Order emerging from chaos'
  },
  { 
    id: 'neon-rabbit', 
    title: 'Neon Rabbit', 
    type: 'digital', 
    aspect: 'portrait',
    facet: 'art',
    description: 'Digital luminescence meets organic form'
  },
  { 
    id: 'repent-300', 
    title: 'Repent 300', 
    type: 'painting', 
    aspect: 'landscape',
    facet: 'art',
    description: 'Numerology meets spiritual introspection'
  },
  { 
    id: 'triptych', 
    title: 'UV Triptych', 
    type: 'mixed', 
    aspect: 'panoramic',
    facet: 'art',
    description: 'Three perspectives of hidden light'
  },
  { 
    id: 'spectrum', 
    title: 'SPECTRUM', 
    type: '3d', 
    aspect: 'landscape',
    facet: 'art',
    description: 'Dimensional exploration of frequency'
  },
  
  // CODE FACET - Sacred geometry applications
  { 
    id: '137-cipher', 
    title: '137 Cipher', 
    type: 'app', 
    aspect: 'landscape', 
    url: 'https://137-cipher.vercel.app',
    facet: 'code',
    description: 'Encode messages using the fine structure constant'
  },
  { 
    id: '137-geometry', 
    title: '137 Geometry', 
    type: 'app', 
    aspect: 'landscape', 
    url: 'https://137-geometry.vercel.app',
    facet: 'code',
    description: 'Interactive sacred geometry visualizations'
  },
  { 
    id: '137-resonance', 
    title: '137 Resonance', 
    type: 'app', 
    aspect: 'landscape', 
    url: 'https://137-resonance.vercel.app',
    facet: 'code',
    description: 'Frequency and resonance patterns calculator'
  },
  { 
    id: '137-cycles', 
    title: '137 Cycles', 
    type: 'app', 
    aspect: 'landscape', 
    url: 'https://137-cycles.vercel.app',
    facet: 'code',
    description: 'Natural cycles and rhythm analysis'
  },
  { 
    id: '137-pad', 
    title: '137 Pad', 
    type: 'app', 
    aspect: 'landscape',
    facet: 'code',
    description: 'Sacred geometry note-taking interface'
  },
  
  // SOUND FACET - Music and frequency work
  { 
    id: 'harmonic-arcana', 
    title: 'Harmonic Arcana', 
    type: 'app', 
    aspect: 'landscape', 
    url: 'https://harmonic-arcana.vercel.app',
    facet: 'sound',
    description: 'Musical harmony meets occult symbolism'
  },
  { 
    id: 'lyric-lab', 
    title: 'Lyric Lab', 
    type: 'app', 
    aspect: 'landscape',
    facet: 'sound',
    description: 'AI-assisted songwriting and structure'
  },
  
  // PHILOSOPHY FACET - Conceptual works
  { 
    id: 'the-book', 
    title: 'The Book', 
    type: 'app', 
    aspect: 'landscape',
    facet: 'philosophy',
    description: 'Digital grimoire of accumulated wisdom'
  },
  { 
    id: 'speak23d', 
    title: 'Speak23D', 
    type: 'app', 
    aspect: 'landscape',
    facet: 'philosophy',
    description: 'Dimensional language exploration tool'
  }
];

// Get works by facet for balanced presentation
export const worksByFacet = {
  art: works.filter(w => w.facet === 'art'),
  code: works.filter(w => w.facet === 'code'),
  philosophy: works.filter(w => w.facet === 'philosophy'),
  sound: works.filter(w => w.facet === 'sound')
};

// Featured constellation works - balanced mix from all facets
export const constellationWorks = [
  works.find(w => w.id === 'floral-3')!,
  works.find(w => w.id === '137-cipher')!,
  works.find(w => w.id === 'manyfaceddog')!,
  works.find(w => w.id === 'harmonic-arcana')!,
  works.find(w => w.id === 'neon-rabbit')!,
  works.find(w => w.id === '137-geometry')!,
  works.find(w => w.id === 'spectrum')!,
  works.find(w => w.id === 'the-book')!,
  works.find(w => w.id === 'triptych')!,
  works.find(w => w.id === '137-resonance')!,
  works.find(w => w.id === 'madness-arcitexy')!,
  works.find(w => w.id === '137-cycles')!
];