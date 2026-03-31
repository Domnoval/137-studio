'use client';

import type { VocalScore } from '@/lib/sing/scoring';

interface ScoreCardProps {
  score: VocalScore;
  onClose: () => void;
}

function ScoreRing({ value, label, color }: { value: number; label: string; color: string }) {
  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-20 h-20">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r={radius} fill="none" stroke="#2a2825" strokeWidth="4" />
          <circle
            cx="40" cy="40" r={radius} fill="none"
            stroke={color}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 1s ease-out' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-mono text-lg font-bold" style={{ color }}>{value}</span>
        </div>
      </div>
      <span className="font-mono text-[10px] text-[#a09890] uppercase tracking-wider">{label}</span>
    </div>
  );
}

export function ScoreCard({ score, onClose }: ScoreCardProps) {
  const gradeColors: Record<string, string> = {
    S: '#FFD700',
    A: '#5ce0d2',
    B: '#5ce0d2',
    C: '#a09890',
    D: '#c41230',
    '-': '#2a2825',
  };

  const gradeColor = gradeColors[score.grade] || '#a09890';

  return (
    <div className="bg-[#141210] border border-[#2a2825] rounded-lg p-6 space-y-6">
      {/* Header with grade */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-mono text-xs text-[#a09890] uppercase tracking-[0.2em]">Performance Score</h3>
          <div className="flex items-baseline gap-3 mt-1">
            <span className="font-mono text-5xl font-bold" style={{ color: gradeColor }}>
              {score.grade}
            </span>
            <span className="font-mono text-2xl text-[#e8e4dc]">{score.overall}</span>
            <span className="font-mono text-xs text-[#a09890]">/ 100</span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-[#a09890] hover:text-[#e8e4dc] transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Score rings */}
      <div className="flex justify-center gap-6">
        <ScoreRing value={score.pitch} label="Pitch" color="#5ce0d2" />
        <ScoreRing value={score.timing} label="Timing" color="#c41230" />
        <ScoreRing value={score.expression} label="Expression" color="#FFD700" />
        <ScoreRing value={score.stability} label="Stability" color="#a09890" />
      </div>

      {/* Techniques detected */}
      {score.techniques.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-mono text-[10px] text-[#a09890] uppercase tracking-[0.2em]">Techniques Detected</h4>
          <div className="flex flex-wrap gap-2">
            {score.techniques.map((tech) => (
              <span
                key={tech.name}
                className={`
                  font-mono text-[10px] px-3 py-1.5 rounded-full border
                  ${tech.quality === 'excellent'
                    ? 'border-[#FFD700]/30 text-[#FFD700] bg-[#FFD700]/5'
                    : tech.quality === 'good'
                    ? 'border-[#5ce0d2]/30 text-[#5ce0d2] bg-[#5ce0d2]/5'
                    : 'border-[#a09890]/30 text-[#a09890] bg-[#a09890]/5'
                  }
                `}
              >
                {tech.name} &times;{tech.count}
                <span className="ml-1 opacity-60">({tech.quality})</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* AI Feedback */}
      <div className="space-y-2">
        <h4 className="font-mono text-[10px] text-[#a09890] uppercase tracking-[0.2em]">Coach Notes</h4>
        <div className="space-y-1.5">
          {score.feedback.map((tip, i) => (
            <div key={i} className="flex gap-2 text-sm text-[#e8e4dc]/80">
              <span className="text-[#5ce0d2] shrink-0 mt-0.5">&#9656;</span>
              <span>{tip}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
