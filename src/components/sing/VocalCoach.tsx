'use client';

import { useState } from 'react';
import type { PitchData, PitchHistory } from '@/lib/sing/pitch-detection';

interface VocalCoachProps {
  currentPitch: PitchData;
  history: PitchHistory[];
  isRecording: boolean;
}

interface CoachTip {
  type: 'info' | 'warning' | 'success';
  message: string;
}

export function VocalCoach({ currentPitch, history, isRecording }: VocalCoachProps) {
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Real-time tips based on current pitch data
  const getRealtimeTips = (): CoachTip[] => {
    const tips: CoachTip[] = [];

    if (!isRecording) return tips;

    if (currentPitch.frequency === 0 && currentPitch.amplitude > 0.02) {
      tips.push({ type: 'info', message: 'Try to focus on a clear, sustained pitch' });
    }

    if (currentPitch.cents > 20) {
      tips.push({ type: 'warning', message: `Running sharp (+${currentPitch.cents}¢) — relax and bring it down slightly` });
    } else if (currentPitch.cents < -20) {
      tips.push({ type: 'warning', message: `Running flat (${currentPitch.cents}¢) — add a bit more support` });
    } else if (currentPitch.frequency > 0 && Math.abs(currentPitch.cents) <= 10) {
      tips.push({ type: 'success', message: 'Right on pitch — great intonation!' });
    }

    if (currentPitch.amplitude < 0.05 && currentPitch.frequency > 0) {
      tips.push({ type: 'info', message: 'Try projecting more — breathe from your diaphragm' });
    }

    return tips;
  };

  // Request AI analysis of the full recording
  const requestAIAnalysis = async () => {
    if (history.length < 20) return;

    setIsAnalyzing(true);
    try {
      // Prepare a summary of the pitch data for the AI
      const pitched = history.filter((h) => h.pitch.frequency > 0);
      const avgFreq = pitched.length > 0
        ? pitched.reduce((sum, h) => sum + h.pitch.frequency, 0) / pitched.length
        : 0;
      const avgCents = pitched.length > 0
        ? pitched.reduce((sum, h) => sum + Math.abs(h.pitch.cents), 0) / pitched.length
        : 0;
      const minFreq = pitched.length > 0 ? Math.min(...pitched.map((h) => h.pitch.frequency)) : 0;
      const maxFreq = pitched.length > 0 ? Math.max(...pitched.map((h) => h.pitch.frequency)) : 0;
      const totalDuration = history.length > 0
        ? (history[history.length - 1].timestamp - history[0].timestamp) / 1000
        : 0;
      const silencePercentage = ((history.length - pitched.length) / history.length) * 100;

      const response = await fetch('/api/sing/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          avgFrequency: avgFreq,
          avgCentsDeviation: avgCents,
          frequencyRange: { min: minFreq, max: maxFreq },
          totalDuration,
          silencePercentage,
          pitchedFrames: pitched.length,
          totalFrames: history.length,
          notesCovered: [...new Set(pitched.map((h) => h.pitch.note))],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setAiAnalysis(data.analysis);
      }
    } catch {
      setAiAnalysis('Unable to get AI analysis at this time.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const tips = getRealtimeTips();

  return (
    <div className="bg-[#141210] border border-[#2a2825] rounded-lg overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#2a2825] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isRecording ? 'bg-[#5ce0d2] animate-pulse' : 'bg-[#2a2825]'}`} />
          <h3 className="font-mono text-xs uppercase tracking-[0.2em] text-[#a09890]">
            Vocal Coach
          </h3>
        </div>
        {!isRecording && history.length > 20 && (
          <button
            onClick={requestAIAnalysis}
            disabled={isAnalyzing}
            className="font-mono text-[10px] px-3 py-1 rounded border border-[#5ce0d2]/30 text-[#5ce0d2] hover:bg-[#5ce0d2]/10 transition-all disabled:opacity-50"
          >
            {isAnalyzing ? 'Analyzing...' : 'AI Analysis'}
          </button>
        )}
      </div>

      {/* Real-time stats */}
      <div className="px-4 py-3 grid grid-cols-4 gap-3 border-b border-[#2a2825]">
        <div className="text-center">
          <div className="font-mono text-[10px] text-[#a09890] uppercase">Note</div>
          <div className="font-mono text-lg text-[#5ce0d2]">{currentPitch.note}</div>
        </div>
        <div className="text-center">
          <div className="font-mono text-[10px] text-[#a09890] uppercase">Cents</div>
          <div className={`font-mono text-lg ${
            Math.abs(currentPitch.cents) <= 10 ? 'text-[#5ce0d2]' :
            Math.abs(currentPitch.cents) <= 25 ? 'text-[#FFD700]' : 'text-[#c41230]'
          }`}>
            {currentPitch.frequency > 0 ? `${currentPitch.cents > 0 ? '+' : ''}${currentPitch.cents}` : '-'}
          </div>
        </div>
        <div className="text-center">
          <div className="font-mono text-[10px] text-[#a09890] uppercase">Volume</div>
          <div className="font-mono text-lg text-[#e8e4dc]">
            {Math.round(currentPitch.amplitude * 100)}%
          </div>
        </div>
        <div className="text-center">
          <div className="font-mono text-[10px] text-[#a09890] uppercase">Conf.</div>
          <div className="font-mono text-lg text-[#a09890]">
            {currentPitch.frequency > 0 ? `${Math.round(currentPitch.confidence * 100)}%` : '-'}
          </div>
        </div>
      </div>

      {/* Tips */}
      <div className="px-4 py-3 min-h-[60px]">
        {tips.length > 0 ? (
          <div className="space-y-1.5">
            {tips.map((tip, i) => (
              <div key={i} className={`flex items-start gap-2 text-sm ${
                tip.type === 'success' ? 'text-[#5ce0d2]' :
                tip.type === 'warning' ? 'text-[#FFD700]' : 'text-[#a09890]'
              }`}>
                <span className="shrink-0 mt-0.5">
                  {tip.type === 'success' ? '✓' : tip.type === 'warning' ? '!' : '•'}
                </span>
                <span>{tip.message}</span>
              </div>
            ))}
          </div>
        ) : isRecording ? (
          <div className="text-sm text-[#a09890]/50 italic">Listening...</div>
        ) : (
          <div className="text-sm text-[#a09890]/50">Start recording to get real-time feedback</div>
        )}

        {/* AI Analysis result */}
        {aiAnalysis && (
          <div className="mt-4 p-3 bg-[#0e0c0a] rounded border border-[#5ce0d2]/20">
            <div className="font-mono text-[10px] text-[#5ce0d2] uppercase tracking-wider mb-2">AI Analysis</div>
            <div className="text-sm text-[#e8e4dc]/80 whitespace-pre-line leading-relaxed">{aiAnalysis}</div>
          </div>
        )}
      </div>
    </div>
  );
}
