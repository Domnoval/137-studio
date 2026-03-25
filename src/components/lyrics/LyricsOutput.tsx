'use client';

import { useState } from 'react';
import { type AlgorithmOutput, type SongContext, formatForSuno } from '@/lib/lyrics/engine';

interface LyricsOutputProps {
  lyrics: string;
  algorithm: AlgorithmOutput;
  context: SongContext;
  isGenerating: boolean;
  onRegenerate: () => void;
  onRefineSection: (section: string, instruction: string) => void;
}

export function LyricsOutput({
  lyrics,
  algorithm,
  context,
  isGenerating,
  onRegenerate,
  onRefineSection,
}: LyricsOutputProps) {
  const [copied, setCopied] = useState(false);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [refineInstruction, setRefineInstruction] = useState('');

  const handleCopy = async () => {
    await navigator.clipboard.writeText(lyrics);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopySuno = async () => {
    // Parse lyrics into sections for Suno format
    const sunoOutput = lyrics; // Already in Suno format from generation
    await navigator.clipboard.writeText(sunoOutput);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Parse sections from lyrics
  const sections = lyrics.split(/(\[.*?\])/g).filter(Boolean);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-mono text-xs uppercase tracking-[0.3em] text-[#5ce0d2]">
          // OUTPUT
        </h2>
        <div className="flex gap-2">
          <button
            onClick={onRegenerate}
            disabled={isGenerating}
            className="font-mono text-[10px] uppercase tracking-wider px-3 py-1.5 rounded border border-[#5ce0d2]/30 text-[#5ce0d2] hover:bg-[#5ce0d2]/10 transition-all disabled:opacity-30"
          >
            {isGenerating ? 'Generating...' : 'Regenerate'}
          </button>
          <button
            onClick={handleCopy}
            className="font-mono text-[10px] uppercase tracking-wider px-3 py-1.5 rounded border border-[#5ce0d2]/30 text-[#5ce0d2] hover:bg-[#5ce0d2]/10 transition-all"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
          <button
            onClick={handleCopySuno}
            className="font-mono text-[10px] uppercase tracking-wider px-3 py-1.5 rounded border border-[#c41230]/50 text-[#c41230] hover:bg-[#c41230]/10 transition-all"
          >
            {copied ? 'Copied!' : 'Copy for Suno'}
          </button>
        </div>
      </div>

      {/* CRT-styled lyrics display */}
      <div className="relative">
        {/* Scan line overlay */}
        <div
          className="pointer-events-none absolute inset-0 z-10 rounded"
          style={{
            background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.08) 2px, rgba(0,0,0,0.08) 4px)',
          }}
        />

        {/* Screen glow */}
        <div className="bg-[#0a0908] border border-[#2a2825] rounded p-6 shadow-[inset_0_0_60px_rgba(92,224,210,0.03)]">
          {isGenerating ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-6 h-6 border-2 border-[#c41230] border-t-transparent rounded-full animate-spin" />
              <p className="font-mono text-xs text-[#a09890] animate-pulse">
                Engineering lyrics...
              </p>
            </div>
          ) : lyrics ? (
            <div className="space-y-1">
              {sections.map((part, i) => {
                const isTag = part.match(/^\[.*\]$/);
                if (isTag) {
                  const sectionName = part.replace(/[\[\]]/g, '');
                  return (
                    <div key={i} className="group flex items-center gap-2 mt-4 first:mt-0">
                      <span className="font-mono text-xs text-[#c41230] font-bold">
                        {part}
                      </span>
                      <button
                        onClick={() => setEditingSection(editingSection === sectionName ? null : sectionName)}
                        className="opacity-0 group-hover:opacity-100 font-mono text-[8px] text-[#5ce0d2]/50 hover:text-[#5ce0d2] transition-all"
                      >
                        [refine]
                      </button>
                    </div>
                  );
                }

                return (
                  <div key={i}>
                    <pre className="font-serif text-sm text-[#e8e4dc] whitespace-pre-wrap leading-relaxed">
                      {part}
                    </pre>
                    {editingSection && (
                      <div className="mt-2 mb-4 flex gap-2">
                        <input
                          type="text"
                          value={refineInstruction}
                          onChange={(e) => setRefineInstruction(e.target.value)}
                          placeholder={`Refine ${editingSection}...`}
                          className="flex-1 bg-[#0e0c0a] border border-[#5ce0d2]/20 rounded px-2 py-1 text-xs text-[#e8e4dc] font-mono placeholder-[#a09890]/30 focus:outline-none focus:border-[#5ce0d2]/50"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && refineInstruction) {
                              onRefineSection(editingSection, refineInstruction);
                              setRefineInstruction('');
                              setEditingSection(null);
                            }
                          }}
                        />
                        <button
                          onClick={() => {
                            if (refineInstruction) {
                              onRefineSection(editingSection, refineInstruction);
                              setRefineInstruction('');
                              setEditingSection(null);
                            }
                          }}
                          className="font-mono text-[10px] px-2 py-1 rounded bg-[#5ce0d2]/10 border border-[#5ce0d2]/30 text-[#5ce0d2]"
                        >
                          Go
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center justify-center py-16">
              <p className="font-mono text-xs text-[#a09890]/50">
                Configure your parameters above, then generate.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Suno export info */}
      {lyrics && (
        <div className="bg-[#0e0c0a] border border-[#2a2825] rounded p-3">
          <div className="font-mono text-[10px] uppercase tracking-wider text-[#a09890] mb-2">
            Suno Quick-Paste Info
          </div>
          <div className="grid grid-cols-3 gap-2 text-[10px] font-mono">
            <div>
              <span className="text-[#a09890]">Style: </span>
              <span className="text-[#5ce0d2]">{algorithm.sunoStylePrompt}</span>
            </div>
            <div>
              <span className="text-[#a09890]">BPM: </span>
              <span className="text-[#5ce0d2]">{algorithm.bpm}</span>
            </div>
            <div>
              <span className="text-[#a09890]">Key: </span>
              <span className="text-[#5ce0d2]">{algorithm.key} {algorithm.keyMode}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
