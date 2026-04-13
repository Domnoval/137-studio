'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import {
  type LyricMode,
  type EmotionalArc,
  type SongContext,
  type AlgorithmOutput,
  computeAlgorithm,
} from '@/lib/lyrics/engine';
import { buildGenerationPrompt, buildRefinementPrompt } from '@/lib/lyrics/prompts';
import { ModeSelector } from '@/components/lyrics/ModeSelector';
import { GenreSelector } from '@/components/lyrics/GenreSelector';
import { ContextBuilder } from '@/components/lyrics/ContextBuilder';
import { AlgorithmDisplay } from '@/components/lyrics/AlgorithmDisplay';
import { LyricsOutput } from '@/components/lyrics/LyricsOutput';

type Step = 'mode' | 'genre' | 'context' | 'generate';

export default function LyricsPage() {
  // Step state
  const [step, setStep] = useState<Step>('mode');

  // Selections
  const [mode, setMode] = useState<LyricMode | null>(null);
  const [genre, setGenre] = useState<string | null>(null);

  // Context fields
  const [coreMessage, setCoreMessage] = useState('');
  const [theme, setTheme] = useState('');
  const [targetEmotion, setTargetEmotion] = useState('');
  const [audienceState, setAudienceState] = useState('');
  const [desiredOutcome, setDesiredOutcome] = useState('');
  const [emotionalArc, setEmotionalArc] = useState<EmotionalArc>('man-in-a-hole');
  const [vocalStyle, setVocalStyle] = useState('');
  const [energy, setEnergy] = useState('');

  // Generation state
  const [algorithm, setAlgorithm] = useState<AlgorithmOutput | null>(null);
  const [lyrics, setLyrics] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');

  const buildContext = useCallback((): SongContext => ({
    mode: mode!,
    genre: genre!,
    theme,
    coreMessage,
    targetEmotion,
    emotionalArc,
    audienceState,
    desiredOutcome,
    vocalStyle,
    energy,
    additionalTags: [],
  }), [mode, genre, theme, coreMessage, targetEmotion, emotionalArc, audienceState, desiredOutcome, vocalStyle, energy]);

  const handleGenerate = useCallback(async () => {
    if (!mode || !genre) return;

    const context = buildContext();
    const algo = computeAlgorithm(context);
    setAlgorithm(algo);
    setIsGenerating(true);
    setError('');

    try {
      const prompt = buildGenerationPrompt(context, algo);
      const response = await fetch('/api/lyrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to generate');
      }

      const data = await response.json();
      setLyrics(data.lyrics);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsGenerating(false);
    }
  }, [mode, genre, buildContext]);

  const handleRefineSection = useCallback(async (section: string, instruction: string) => {
    if (!algorithm) return;

    setIsGenerating(true);
    setError('');

    try {
      const context = buildContext();
      const prompt = buildRefinementPrompt(lyrics, section, instruction, context, algorithm);
      const response = await fetch('/api/lyrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, maxTokens: 1024 }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to refine');
      }

      const data = await response.json();
      // Replace the section in the full lyrics
      const sectionRegex = new RegExp(
        `(\\[${section}[^\\]]*\\])([\\s\\S]*?)(?=\\[|$)`,
        'i'
      );
      const newLyrics = lyrics.replace(sectionRegex, `$1\n${data.lyrics}\n\n`);
      setLyrics(newLyrics);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Refinement failed');
    } finally {
      setIsGenerating(false);
    }
  }, [algorithm, lyrics, buildContext]);

  const canAdvance = () => {
    switch (step) {
      case 'mode': return !!mode;
      case 'genre': return !!genre;
      case 'context': return !!coreMessage && !!theme;
      case 'generate': return true;
      default: return false;
    }
  };

  const steps: Step[] = ['mode', 'genre', 'context', 'generate'];
  const stepIndex = steps.indexOf(step);

  const nextStep = () => {
    if (stepIndex < steps.length - 1 && canAdvance()) {
      const next = steps[stepIndex + 1];
      setStep(next);
      if (next === 'generate' && !lyrics) {
        const context = buildContext();
        const algo = computeAlgorithm(context);
        setAlgorithm(algo);
      }
    }
  };

  const prevStep = () => {
    if (stepIndex > 0) {
      setStep(steps[stepIndex - 1]);
    }
  };

  return (
    <div className="min-h-screen bg-[#0e0c0a] text-[#e8e4dc]">
      {/* Header */}
      <header className="border-b border-[#2a2825]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="font-mono text-xs text-[#a09890] hover:text-[#5ce0d2] transition-colors"
            >
              &larr; 137
            </Link>
            <div className="h-4 w-px bg-[#2a2825]" />
            <h1 className="font-mono text-sm">
              <span className="text-[#c41230]">LYRIC</span>
              <span className="text-[#5ce0d2]">ENGINE</span>
            </h1>
          </div>
          <div className="font-mono text-[10px] text-[#a09890]/50">
            v0.1 // data-driven songwriting
          </div>
        </div>
      </header>

      {/* Progress bar */}
      <div className="border-b border-[#2a2825]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex">
            {steps.map((s, i) => {
              const isActive = i === stepIndex;
              const isComplete = i < stepIndex;
              const labels = { mode: 'MODE', genre: 'GENRE', context: 'CONTEXT', generate: 'GENERATE' };
              return (
                <button
                  key={s}
                  onClick={() => i <= stepIndex && setStep(s)}
                  className={`
                    flex-1 py-3 text-center font-mono text-[10px] uppercase tracking-[0.2em] border-b-2 transition-all
                    ${isActive
                      ? 'border-[#c41230] text-[#c41230]'
                      : isComplete
                      ? 'border-[#5ce0d2]/30 text-[#5ce0d2] cursor-pointer'
                      : 'border-transparent text-[#a09890]/30'
                    }
                  `}
                >
                  <span className="hidden sm:inline">{String(i + 1).padStart(2, '0')}. </span>
                  {labels[s]}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Step content */}
        <div className="min-h-[400px]">
          {step === 'mode' && (
            <ModeSelector selected={mode} onSelect={setMode} />
          )}

          {step === 'genre' && (
            <GenreSelector selected={genre} onSelect={setGenre} />
          )}

          {step === 'context' && (
            <ContextBuilder
              coreMessage={coreMessage}
              setCoreMessage={setCoreMessage}
              theme={theme}
              setTheme={setTheme}
              targetEmotion={targetEmotion}
              setTargetEmotion={setTargetEmotion}
              audienceState={audienceState}
              setAudienceState={setAudienceState}
              desiredOutcome={desiredOutcome}
              setDesiredOutcome={setDesiredOutcome}
              emotionalArc={emotionalArc}
              setEmotionalArc={setEmotionalArc}
              vocalStyle={vocalStyle}
              setVocalStyle={setVocalStyle}
              energy={energy}
              setEnergy={setEnergy}
            />
          )}

          {step === 'generate' && (
            <div className="space-y-8">
              {algorithm && <AlgorithmDisplay algorithm={algorithm} />}

              {error && (
                <div className="bg-[#c41230]/10 border border-[#c41230]/30 rounded p-3 font-mono text-xs text-[#c41230]">
                  {error}
                </div>
              )}

              <LyricsOutput
                lyrics={lyrics}
                algorithm={algorithm!}
                isGenerating={isGenerating}
                onRegenerate={handleGenerate}
                onRefineSection={handleRefineSection}
              />
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-[#2a2825]">
          <button
            onClick={prevStep}
            disabled={stepIndex === 0}
            className="font-mono text-xs uppercase tracking-wider px-4 py-2 rounded border border-[#2a2825] text-[#a09890] hover:text-[#e8e4dc] hover:border-[#5ce0d2]/30 transition-all disabled:opacity-20 disabled:cursor-not-allowed"
          >
            &larr; Back
          </button>

          {step === 'generate' ? (
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className={`
                font-mono text-sm uppercase tracking-wider px-6 py-2.5 rounded border transition-all
                ${isGenerating
                  ? 'border-[#2a2825] text-[#a09890] cursor-wait'
                  : 'border-[#c41230] text-[#c41230] hover:bg-[#c41230]/10 shadow-[0_0_20px_rgba(196,18,48,0.1)] hover:shadow-[0_0_30px_rgba(196,18,48,0.2)]'
                }
              `}
            >
              {isGenerating ? (
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 border border-[#a09890] border-t-transparent rounded-full animate-spin" />
                  Engineering...
                </span>
              ) : lyrics ? (
                'Regenerate'
              ) : (
                'Generate Lyrics'
              )}
            </button>
          ) : (
            <button
              onClick={nextStep}
              disabled={!canAdvance()}
              className="font-mono text-xs uppercase tracking-wider px-4 py-2 rounded border border-[#5ce0d2]/50 text-[#5ce0d2] hover:bg-[#5ce0d2]/10 transition-all disabled:opacity-20 disabled:cursor-not-allowed"
            >
              Next &rarr;
            </button>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#2a2825] mt-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="font-mono text-[10px] text-[#a09890]/30">
            137 LYRIC ENGINE // Powered by neuroscience + data
          </div>
          <div className="font-mono text-[10px] text-[#a09890]/30">
            Salimpoor et al. // Jakubowski et al. // Reagan et al.
          </div>
        </div>
      </footer>
    </div>
  );
}
