/**
 * 137 Lyrics — Prompt Builder
 *
 * Constructs the AI generation prompt from algorithm output + user context.
 * Every instruction to the model is grounded in research data.
 */

import {
  type SongContext,
  type AlgorithmOutput,
  type SectionGuidance,
  MODE_CONFIGS,
  GENRES,
  EMOTIONAL_ARCS,
} from './engine';

export function buildGenerationPrompt(
  context: SongContext,
  algorithm: AlgorithmOutput,
): string {
  const mode = MODE_CONFIGS[context.mode];
  const genre = GENRES.find(g => g.id === context.genre) || GENRES[0];
  const arc = EMOTIONAL_ARCS[context.emotionalArc];

  const sectionInstructions = Object.entries(algorithm.sectionGuidance)
    .map(([key, g]) => formatSectionInstruction(key, g))
    .join('\n');

  return `You are a world-class songwriter and lyricist. You write lyrics that are backed by music science and data-driven songwriting principles.

## CONTEXT
- Core message: ${context.coreMessage}
- Theme: ${context.theme}
- Target emotion the listener should feel: ${context.targetEmotion}
- Who needs to hear this: ${context.audienceState}
- What the listener should feel/do after hearing it: ${context.desiredOutcome}
- Genre: ${genre.label}
- Mode: ${mode.label} — ${mode.description}

## ALGORITHM PARAMETERS (follow these precisely)
- BPM: ${algorithm.bpm}
- Key: ${algorithm.key} ${algorithm.keyMode}
- Target reading level: Grade ${algorithm.readingLevel} (Flesch-Kincaid)
- Word count target: ~${algorithm.wordCountTarget} words
- Rhyme scheme: ${algorithm.rhymeScheme}
- Repetition ratio: ${Math.round(algorithm.repetitionTarget * 100)}% (chorus should repeat ${algorithm.repetitionTarget > 0.7 ? '3-4' : '2-3'} times)
- Near-rhyme to perfect-rhyme ratio: ${Math.round(mode.nearRhymeRatio * 100)}% near-rhymes
- Vocabulary complexity: ${mode.vocabularyComplexity < 0.3 ? 'Simple, everyday language' : mode.vocabularyComplexity < 0.6 ? 'Moderate complexity, some metaphor' : 'Rich vocabulary, complex metaphors, internal rhyme'}

## EMOTIONAL ARC: ${arc.label}
${arc.description}
Best for: ${arc.bestFor}

The emotional energy should follow this shape across the song:
${arc.shape.map((v, i) => {
  const bar = '█'.repeat(Math.round(v * 20));
  const pos = Math.round((i / (arc.shape.length - 1)) * 100);
  return `  ${pos}% → ${bar} (${Math.round(v * 100)}%)`;
}).join('\n')}

## SONG STRUCTURE & SECTION GUIDANCE
${sectionInstructions}

## SCIENCE-BACKED RULES (non-negotiable)
1. HOOK PLACEMENT: ${mode.hookPlacement === 'first-15s' ? 'The hook/chorus MUST appear within the first 15 seconds. Start with it or get there immediately.' : mode.hookPlacement === 'within-30s' ? 'A recognizable hook must land within 30 seconds.' : 'Verse first, but the verse itself must be compelling enough to hold attention.'}
2. DOPAMINE CYCLING: Engineer tension→release cycles. Pre-chorus builds anticipation (caudate nucleus activation), chorus delivers the payoff (nucleus accumbens dopamine release). Each chorus should hit slightly harder than the last.
3. SYLLABLE CONTRAST: Verses should have LONGER lines with less pronounced stress. Choruses should have SHORTER, PUNCHIER, more forceful lines. This contrast is critical.
4. THE 80/20 RULE: 80% of the song's emotional impact comes from 20% of the content. Focus maximum creative energy on the hook, the chorus, and 1-2 devastating lyrical moments.
5. EARWORM FORMULA: The hook should use a familiar overall melodic pattern (think arch-shaped) but include one unexpected twist — an unusual word choice, rhythmic variation, or emotional surprise.
6. REPETITION WITH VARIATION: Repeat the core motif 3 times, then change on the 4th (Max Martin technique). Each chorus can have slight variations that add meaning.
7. ${algorithm.rhymeScheme === 'XAXA' ? 'XAXA RHYME: Only lines 2 and 4 rhyme. Lines 1 and 3 are free. This sounds natural and conversational — the current favorite of professional songwriters.' : algorithm.rhymeScheme === 'AABB' ? 'AABB RHYME: Couplet rhymes. Forward momentum, satisfying, catchy.' : algorithm.rhymeScheme === 'ABAB' ? 'ABAB RHYME: Alternating rhymes create a back-and-forth feel.' : algorithm.rhymeScheme === 'ABCB' ? 'ABCB RHYME: Only lines 2 and 4 rhyme. Open, storytelling feel.' : 'Use the rhyme scheme naturally — it should never feel forced.'}
8. NO FILLER: Every single line must serve the core message or advance the emotional arc. Cut anything that exists just to fill space or "sounds nice."

## FORMAT
Output the lyrics in Suno-compatible format with section tags in square brackets.
Include vocal/mood tags where they enhance the section.
Use parentheses for ad-libs: (oh), (yeah), (hey!)

Example format:
[Verse 1]
First line of verse...
Second line of verse...

[Chorus]
[Powerful]
Hook line here...

Write the complete song now. Make every word count.`;
}

function formatSectionInstruction(key: string, g: SectionGuidance): string {
  return `### ${g.section.toUpperCase()} (${key})
- Purpose: ${g.purpose}
- Energy: ${g.energyLevel} — ${g.emotionalTarget}
- Lines: ~${g.lineCount}
- Syllable density: ${g.syllableDensity}`;
}

export function buildRefinementPrompt(
  originalLyrics: string,
  section: string,
  instruction: string,
  context: SongContext,
  algorithm: AlgorithmOutput,
): string {
  const mode = MODE_CONFIGS[context.mode];

  return `You are refining a specific section of song lyrics. Keep the overall song coherent.

## CURRENT FULL LYRICS
${originalLyrics}

## SECTION TO REFINE: ${section}
## INSTRUCTION: ${instruction}

## RULES
- Maintain the same rhyme scheme: ${algorithm.rhymeScheme}
- Maintain the same reading level: Grade ${algorithm.readingLevel}
- Maintain the same emotional arc position for this section
- Vocabulary complexity: ${mode.vocabularyComplexity < 0.3 ? 'Simple' : mode.vocabularyComplexity < 0.6 ? 'Moderate' : 'Rich'}
- Keep it coherent with surrounding sections
- Output ONLY the refined section, not the whole song

Write the refined section now.`;
}
