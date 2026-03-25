'use client';

import { type EmotionalArc, EMOTIONAL_ARCS, SUNO_TAGS } from '@/lib/lyrics/engine';

interface ContextBuilderProps {
  coreMessage: string;
  setCoreMessage: (v: string) => void;
  theme: string;
  setTheme: (v: string) => void;
  targetEmotion: string;
  setTargetEmotion: (v: string) => void;
  audienceState: string;
  setAudienceState: (v: string) => void;
  desiredOutcome: string;
  setDesiredOutcome: (v: string) => void;
  emotionalArc: EmotionalArc;
  setEmotionalArc: (v: EmotionalArc) => void;
  vocalStyle: string;
  setVocalStyle: (v: string) => void;
  energy: string;
  setEnergy: (v: string) => void;
}

function ArcVisualizer({ arc }: { arc: EmotionalArc }) {
  const shape = EMOTIONAL_ARCS[arc].shape;
  const height = 40;
  const width = 200;
  const points = shape.map((v, i) => {
    const x = (i / (shape.length - 1)) * width;
    const y = height - (v * height);
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg viewBox={`0 0 ${width} ${height + 4}`} className="w-full h-10" preserveAspectRatio="none">
      <polyline
        points={points}
        fill="none"
        stroke="#c41230"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {shape.map((v, i) => {
        const x = (i / (shape.length - 1)) * width;
        const y = height - (v * height);
        return (
          <circle key={i} cx={x} cy={y} r="2" fill="#c41230" opacity="0.6" />
        );
      })}
    </svg>
  );
}

export function ContextBuilder(props: ContextBuilderProps) {
  const arcs = Object.entries(EMOTIONAL_ARCS) as [EmotionalArc, typeof EMOTIONAL_ARCS[EmotionalArc]][];

  return (
    <div className="space-y-6">
      <h2 className="font-mono text-xs uppercase tracking-[0.3em] text-[#5ce0d2]">
        // DEEP CONTEXT
      </h2>

      {/* Core Message */}
      <div className="space-y-1.5">
        <label className="block font-mono text-[10px] uppercase tracking-wider text-[#a09890]">
          What is this song really about? Not the topic — the truth.
        </label>
        <textarea
          value={props.coreMessage}
          onChange={(e) => props.setCoreMessage(e.target.value)}
          placeholder="e.g., The moment you realize the person you've been chasing was running from the same thing you were..."
          className="w-full bg-[#0e0c0a] border border-[#2a2825] rounded p-3 text-sm text-[#e8e4dc] placeholder-[#a09890]/40 focus:border-[#5ce0d2]/50 focus:outline-none resize-none font-serif transition-colors"
          rows={3}
        />
      </div>

      {/* Theme */}
      <div className="space-y-1.5">
        <label className="block font-mono text-[10px] uppercase tracking-wider text-[#a09890]">
          Theme / Subject
        </label>
        <input
          type="text"
          value={props.theme}
          onChange={(e) => props.setTheme(e.target.value)}
          placeholder="e.g., lost love, self-discovery, late night drives, overcoming fear..."
          className="w-full bg-[#0e0c0a] border border-[#2a2825] rounded p-3 text-sm text-[#e8e4dc] placeholder-[#a09890]/40 focus:border-[#5ce0d2]/50 focus:outline-none font-serif transition-colors"
        />
      </div>

      {/* Two-column: Target Emotion + Audience */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="block font-mono text-[10px] uppercase tracking-wider text-[#a09890]">
            What should the listener FEEL?
          </label>
          <input
            type="text"
            value={props.targetEmotion}
            onChange={(e) => props.setTargetEmotion(e.target.value)}
            placeholder="e.g., chills, empowered, heartbroken, alive..."
            className="w-full bg-[#0e0c0a] border border-[#2a2825] rounded p-3 text-sm text-[#e8e4dc] placeholder-[#a09890]/40 focus:border-[#5ce0d2]/50 focus:outline-none font-serif transition-colors"
          />
        </div>
        <div className="space-y-1.5">
          <label className="block font-mono text-[10px] uppercase tracking-wider text-[#a09890]">
            Who needs to hear this?
          </label>
          <input
            type="text"
            value={props.audienceState}
            onChange={(e) => props.setAudienceState(e.target.value)}
            placeholder="e.g., someone going through a breakup, anyone who's ever felt invisible..."
            className="w-full bg-[#0e0c0a] border border-[#2a2825] rounded p-3 text-sm text-[#e8e4dc] placeholder-[#a09890]/40 focus:border-[#5ce0d2]/50 focus:outline-none font-serif transition-colors"
          />
        </div>
      </div>

      {/* Desired Outcome */}
      <div className="space-y-1.5">
        <label className="block font-mono text-[10px] uppercase tracking-wider text-[#a09890]">
          After hearing this song, the listener should...
        </label>
        <input
          type="text"
          value={props.desiredOutcome}
          onChange={(e) => props.setDesiredOutcome(e.target.value)}
          placeholder="e.g., feel seen, dance, cry, text their ex, quit their job..."
          className="w-full bg-[#0e0c0a] border border-[#2a2825] rounded p-3 text-sm text-[#e8e4dc] placeholder-[#a09890]/40 focus:border-[#5ce0d2]/50 focus:outline-none font-serif transition-colors"
        />
      </div>

      {/* Emotional Arc */}
      <div className="space-y-3">
        <label className="block font-mono text-[10px] uppercase tracking-wider text-[#a09890]">
          Emotional Arc — the shape of the journey
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {arcs.map(([id, arc]) => {
            const isSelected = props.emotionalArc === id;
            return (
              <button
                key={id}
                onClick={() => props.setEmotionalArc(id)}
                className={`text-left p-3 rounded border transition-all ${
                  isSelected
                    ? 'border-[#c41230] bg-[#c41230]/10'
                    : 'border-[#2a2825] hover:border-[#5ce0d2]/30'
                }`}
              >
                <div className="font-mono text-xs font-bold text-[#e8e4dc] mb-1">
                  {arc.label}
                </div>
                <ArcVisualizer arc={id} />
                <div className="text-[10px] text-[#a09890] mt-1">
                  {arc.description}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Vocal Style + Energy */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="block font-mono text-[10px] uppercase tracking-wider text-[#a09890]">
            Vocal Style
          </label>
          <div className="flex flex-wrap gap-1.5">
            {SUNO_TAGS.vocals.map((v) => (
              <button
                key={v}
                onClick={() => props.setVocalStyle(v)}
                className={`text-[10px] font-mono px-2 py-1 rounded border transition-all ${
                  props.vocalStyle === v
                    ? 'border-[#c41230] bg-[#c41230]/10 text-[#c41230]'
                    : 'border-[#2a2825] text-[#a09890] hover:border-[#5ce0d2]/30 hover:text-[#5ce0d2]'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="block font-mono text-[10px] uppercase tracking-wider text-[#a09890]">
            Energy Level
          </label>
          <div className="flex flex-wrap gap-1.5">
            {SUNO_TAGS.energy.map((e) => (
              <button
                key={e}
                onClick={() => props.setEnergy(e)}
                className={`text-[10px] font-mono px-2 py-1 rounded border transition-all ${
                  props.energy === e
                    ? 'border-[#c41230] bg-[#c41230]/10 text-[#c41230]'
                    : 'border-[#2a2825] text-[#a09890] hover:border-[#5ce0d2]/30 hover:text-[#5ce0d2]'
                }`}
              >
                {e}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
