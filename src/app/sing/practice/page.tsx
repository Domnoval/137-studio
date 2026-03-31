'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { AudioEngine } from '@/lib/sing/audio-engine';
import { PitchDetector, type PitchData, noteToFrequency } from '@/lib/sing/pitch-detection';
import { WARM_UP_EXERCISES, type WarmUpExercise } from '@/lib/sing/song-library';
import { PitchVisualizer } from '@/components/sing/PitchVisualizer';
import { WaveformDisplay } from '@/components/sing/WaveformDisplay';
import { VocalCoach } from '@/components/sing/VocalCoach';

const NULL_PITCH: PitchData = {
  frequency: 0, note: '-', noteName: '-', octave: 0,
  cents: 0, confidence: 0, midiNumber: 0, amplitude: 0,
};

export default function PracticePage() {
  const audioEngineRef = useRef<AudioEngine | null>(null);
  const pitchDetectorRef = useRef<PitchDetector | null>(null);

  const [isInitialized, setIsInitialized] = useState(false);
  const [currentPitch, setCurrentPitch] = useState<PitchData>(NULL_PITCH);
  const [selectedExercise, setSelectedExercise] = useState<WarmUpExercise | null>(null);
  const [exerciseActive, setExerciseActive] = useState(false);
  const [currentTargetIdx, setCurrentTargetIdx] = useState(0);
  const [hitNotes, setHitNotes] = useState<Set<number>>(new Set());
  const [error, setError] = useState('');

  // Initialize
  const initialize = useCallback(async () => {
    try {
      const engine = new AudioEngine();
      await engine.initialize();
      await engine.requestMicrophone();

      const detector = new PitchDetector();
      const analyser = engine.getAnalyserNode();
      const ctx = engine.getAudioContext();

      if (analyser && ctx) {
        detector.attach(analyser, ctx.sampleRate);
        detector.subscribe(setCurrentPitch);
        detector.start();
      }

      audioEngineRef.current = engine;
      pitchDetectorRef.current = detector;
      setIsInitialized(true);
    } catch {
      setError('Failed to initialize audio. Please check microphone permissions.');
    }
  }, []);

  // Check if current pitch matches target note
  useEffect(() => {
    if (!exerciseActive || !selectedExercise?.targetNotes) return;
    const targetNote = selectedExercise.targetNotes[currentTargetIdx];
    if (!targetNote) return;

    const targetFreq = noteToFrequency(targetNote);
    if (targetFreq === 0 || currentPitch.frequency === 0) return;

    // Check if within 30 cents of target
    const centsDiff = 1200 * Math.log2(currentPitch.frequency / targetFreq);
    if (Math.abs(centsDiff) < 30 && currentPitch.confidence > 0.8) {
      setHitNotes((prev) => new Set(prev).add(currentTargetIdx));
      // Advance to next note after a brief hold
      setTimeout(() => {
        setCurrentTargetIdx((prev) => {
          const next = prev + 1;
          if (next >= (selectedExercise.targetNotes?.length ?? 0)) {
            setExerciseActive(false);
            return 0;
          }
          return next;
        });
      }, 400);
    }
  }, [currentPitch, exerciseActive, selectedExercise, currentTargetIdx]);

  // Cleanup
  useEffect(() => {
    return () => {
      pitchDetectorRef.current?.stop();
      audioEngineRef.current?.destroy();
    };
  }, []);

  const startExercise = (exercise: WarmUpExercise) => {
    setSelectedExercise(exercise);
    setExerciseActive(true);
    setCurrentTargetIdx(0);
    setHitNotes(new Set());
    pitchDetectorRef.current?.clearHistory();
  };

  const stopExercise = () => {
    setExerciseActive(false);
    setCurrentTargetIdx(0);
  };

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-[#0e0c0a] text-[#e8e4dc] flex flex-col">
        <PracticeHeader />
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="text-center max-w-md space-y-6">
            <div className="w-20 h-20 mx-auto rounded-full border-2 border-[#5ce0d2] flex items-center justify-center">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#5ce0d2" strokeWidth="2">
                <path d="M9 18V5l12-2v13" />
                <circle cx="6" cy="18" r="3" />
                <circle cx="18" cy="16" r="3" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-serif mb-2">Practice Room</h2>
              <p className="text-sm text-[#a09890]">
                A private space to warm up, train your ear, and improve your technique.
                No recordings are saved or shared — this is just for you.
              </p>
            </div>
            {error && (
              <div className="bg-[#c41230]/10 border border-[#c41230]/30 rounded p-3 font-mono text-xs text-[#c41230]">
                {error}
              </div>
            )}
            <button
              onClick={initialize}
              className="font-mono text-sm uppercase tracking-wider px-8 py-3 rounded border-2 border-[#5ce0d2] text-[#5ce0d2] hover:bg-[#5ce0d2]/10 hover:shadow-[0_0_30px_rgba(92,224,210,0.2)] transition-all"
            >
              Enter Practice Room
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0e0c0a] text-[#e8e4dc] flex flex-col">
      <PracticeHeader />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-6 space-y-6">
        {/* Pitch Visualizer */}
        <PitchVisualizer pitch={currentPitch} className="h-[250px] sm:h-[300px] rounded-lg border border-[#2a2825] overflow-hidden" />

        {/* Waveform */}
        <WaveformDisplay
          analyserNode={audioEngineRef.current?.getAnalyserNode() ?? null}
          isActive={true}
          variant="live"
          className="h-16 rounded-lg border border-[#2a2825] bg-[#141210]"
        />

        {/* Active Exercise */}
        {exerciseActive && selectedExercise && (
          <div className="bg-[#141210] border border-[#5ce0d2]/20 rounded-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-mono text-sm text-[#5ce0d2]">{selectedExercise.name}</h3>
                <p className="text-xs text-[#a09890] mt-1">{selectedExercise.description}</p>
              </div>
              <button
                onClick={stopExercise}
                className="font-mono text-[10px] px-3 py-1 rounded border border-[#c41230]/30 text-[#c41230] hover:bg-[#c41230]/10 transition-all"
              >
                Stop
              </button>
            </div>

            {/* Target notes display */}
            {selectedExercise.targetNotes && (
              <div className="flex items-center gap-2 flex-wrap">
                {selectedExercise.targetNotes.map((note, i) => {
                  const isActive = i === currentTargetIdx;
                  const isHit = hitNotes.has(i);
                  return (
                    <div
                      key={`${note}-${i}`}
                      className={`
                        font-mono text-sm px-3 py-2 rounded border transition-all
                        ${isActive
                          ? 'border-[#c41230] text-[#c41230] bg-[#c41230]/10 scale-110 shadow-[0_0_15px_rgba(196,18,48,0.3)]'
                          : isHit
                          ? 'border-[#5ce0d2]/30 text-[#5ce0d2] bg-[#5ce0d2]/5'
                          : 'border-[#2a2825] text-[#a09890]/40'
                        }
                      `}
                    >
                      {note}
                      {isHit && <span className="ml-1 text-[#5ce0d2]">&#10003;</span>}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Instructions */}
            <div className="space-y-1">
              {selectedExercise.instructions.map((inst, i) => (
                <div key={i} className="flex gap-2 text-xs text-[#a09890]">
                  <span className="text-[#5ce0d2] shrink-0">{i + 1}.</span>
                  <span>{inst}</span>
                </div>
              ))}
            </div>

            {/* Progress */}
            {selectedExercise.targetNotes && (
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1 bg-[#2a2825] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#5ce0d2] transition-all duration-300"
                    style={{ width: `${(hitNotes.size / selectedExercise.targetNotes.length) * 100}%` }}
                  />
                </div>
                <span className="font-mono text-[10px] text-[#a09890]">
                  {hitNotes.size}/{selectedExercise.targetNotes.length}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Vocal Coach */}
        <VocalCoach
          currentPitch={currentPitch}
          history={pitchDetectorRef.current?.getHistory() ?? []}
          isRecording={true}
        />

        {/* Warm-up Exercises */}
        {!exerciseActive && (
          <div className="space-y-4">
            <h2 className="font-mono text-xs text-[#a09890] uppercase tracking-[0.2em]">Warm-up Exercises</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {WARM_UP_EXERCISES.map((exercise) => {
                const categoryColors: Record<string, string> = {
                  breath: '#5ce0d2',
                  pitch: '#FFD700',
                  range: '#c41230',
                  agility: '#FF6B35',
                  tone: '#a09890',
                };
                const color = categoryColors[exercise.category] || '#a09890';

                return (
                  <button
                    key={exercise.id}
                    onClick={() => startExercise(exercise)}
                    className="text-left bg-[#141210] border border-[#2a2825] rounded-lg p-4 hover:border-[#5ce0d2]/30 transition-all group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-mono text-sm text-[#e8e4dc] group-hover:text-[#5ce0d2] transition-colors">
                          {exercise.name}
                        </h3>
                        <p className="text-xs text-[#a09890] mt-1 line-clamp-2">{exercise.description}</p>
                      </div>
                      <span
                        className="font-mono text-[9px] px-2 py-0.5 rounded-full border shrink-0"
                        style={{ borderColor: `${color}40`, color }}
                      >
                        {exercise.category}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-3">
                      <span className="font-mono text-[9px] text-[#a09890]">
                        {exercise.difficulty}
                      </span>
                      <span className="font-mono text-[9px] text-[#a09890]">
                        {Math.floor(exercise.duration / 60)}:{(exercise.duration % 60).toString().padStart(2, '0')}
                      </span>
                      {exercise.targetNotes && (
                        <span className="font-mono text-[9px] text-[#a09890]">
                          {exercise.targetNotes.length} notes
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function PracticeHeader() {
  return (
    <header className="border-b border-[#2a2825]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/sing"
            className="font-mono text-xs text-[#a09890] hover:text-[#5ce0d2] transition-colors"
          >
            &larr; 137 Voice
          </Link>
          <div className="h-4 w-px bg-[#2a2825]" />
          <h1 className="font-mono text-sm">
            <span className="text-[#5ce0d2]">PRACTICE</span>
            <span className="text-[#a09890]"> ROOM</span>
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#5ce0d2]/30" />
          <span className="font-mono text-[10px] text-[#a09890]/50">private // no recordings saved</span>
        </div>
      </div>
    </header>
  );
}
