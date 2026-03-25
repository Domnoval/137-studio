'use client';

import { type AlgorithmOutput, EMOTIONAL_ARCS } from '@/lib/lyrics/engine';

interface AlgorithmDisplayProps {
  algorithm: AlgorithmOutput;
}

export function AlgorithmDisplay({ algorithm }: AlgorithmDisplayProps) {
  const arc = EMOTIONAL_ARCS[algorithm.emotionalArc];

  return (
    <div className="space-y-4">
      <h2 className="font-mono text-xs uppercase tracking-[0.3em] text-[#5ce0d2]">
        // ALGORITHM OUTPUT
      </h2>

      {/* Parameters grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <DataCard label="BPM" value={`${algorithm.bpm}`} />
        <DataCard label="Key" value={`${algorithm.key} ${algorithm.keyMode}`} />
        <DataCard label="Reading Level" value={`Grade ${algorithm.readingLevel}`} />
        <DataCard label="Word Target" value={`~${algorithm.wordCountTarget}`} />
        <DataCard label="Rhyme Scheme" value={algorithm.rhymeScheme} />
        <DataCard label="Repetition" value={`${Math.round(algorithm.repetitionTarget * 100)}%`} />
        <DataCard label="Arc" value={arc.label} />
        <DataCard label="Sections" value={`${algorithm.structure.length}`} />
      </div>

      {/* Structure visualization */}
      <div className="space-y-2">
        <h3 className="font-mono text-[10px] uppercase tracking-wider text-[#a09890]">
          Song Structure
        </h3>
        <div className="flex flex-wrap gap-1.5">
          {algorithm.structure.map((section, i) => {
            const guidance = Object.values(algorithm.sectionGuidance)[i];
            const energyColors: Record<string, string> = {
              low: 'bg-[#5ce0d2]/10 border-[#5ce0d2]/20 text-[#5ce0d2]/70',
              building: 'bg-[#5ce0d2]/20 border-[#5ce0d2]/30 text-[#5ce0d2]',
              shift: 'bg-[#E8C547]/15 border-[#E8C547]/30 text-[#E8C547]',
              peak: 'bg-[#c41230]/15 border-[#c41230]/30 text-[#c41230]',
              release: 'bg-[#c41230]/25 border-[#c41230]/40 text-[#c41230]',
            };
            const color = guidance ? energyColors[guidance.energyLevel] : 'bg-[#2a2825] border-[#2a2825] text-[#a09890]';

            return (
              <div
                key={`${section}-${i}`}
                className={`font-mono text-[10px] px-2 py-1 rounded border ${color}`}
              >
                {section}
              </div>
            );
          })}
        </div>
      </div>

      {/* Suno style prompt */}
      <div className="space-y-2">
        <h3 className="font-mono text-[10px] uppercase tracking-wider text-[#a09890]">
          Suno Style Prompt
        </h3>
        <div className="bg-[#0e0c0a] border border-[#2a2825] rounded p-3 font-mono text-xs text-[#5ce0d2]">
          {algorithm.sunoStylePrompt}
        </div>
      </div>

      {/* Emotional arc mini-graph */}
      <div className="space-y-2">
        <h3 className="font-mono text-[10px] uppercase tracking-wider text-[#a09890]">
          Emotional Energy Curve
        </h3>
        <div className="h-12 flex items-end gap-[2px]">
          {arc.shape.map((v, i) => (
            <div
              key={i}
              className="flex-1 rounded-t transition-all"
              style={{
                height: `${v * 100}%`,
                background: v > 0.7
                  ? 'rgba(196, 18, 48, 0.6)'
                  : v > 0.4
                  ? 'rgba(232, 197, 71, 0.4)'
                  : 'rgba(92, 224, 210, 0.3)',
              }}
            />
          ))}
        </div>
        <div className="flex justify-between font-mono text-[8px] text-[#a09890]/60">
          <span>INTRO</span>
          <span>MID</span>
          <span>END</span>
        </div>
      </div>
    </div>
  );
}

function DataCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#0e0c0a] border border-[#2a2825] rounded p-2">
      <div className="font-mono text-[8px] uppercase tracking-wider text-[#a09890]">
        {label}
      </div>
      <div className="font-mono text-sm text-[#e8e4dc] font-bold mt-0.5">
        {value}
      </div>
    </div>
  );
}
