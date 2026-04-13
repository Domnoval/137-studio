'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { AudioEngine, type RecordingResult } from '@/lib/sing/audio-engine';
import { PitchDetector, type PitchData, type PitchHistory } from '@/lib/sing/pitch-detection';
import { scorePerformance, type VocalScore } from '@/lib/sing/scoring';
import { PitchVisualizer } from '@/components/sing/PitchVisualizer';
import { WaveformDisplay } from '@/components/sing/WaveformDisplay';
import { RecordingControls } from '@/components/sing/RecordingControls';
import { VocalCoach } from '@/components/sing/VocalCoach';
import { ScoreCard } from '@/components/sing/ScoreCard';

const NULL_PITCH: PitchData = {
  frequency: 0, note: '-', noteName: '-', octave: 0,
  cents: 0, confidence: 0, midiNumber: 0, amplitude: 0,
};

export default function StudioPage() {
  const audioEngineRef = useRef<AudioEngine | null>(null);
  const pitchDetectorRef = useRef<PitchDetector | null>(null);

  const [isInitialized, setIsInitialized] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPitch, setCurrentPitch] = useState<PitchData>(NULL_PITCH);
  // Lifted to state so render never reads refs directly.
  const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null);
  const [pitchHistory, setPitchHistory] = useState<PitchHistory[]>([]);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recording, setRecording] = useState<RecordingResult | null>(null);
  const [recordingTimestamp, setRecordingTimestamp] = useState<number>(0);
  const [score, setScore] = useState<VocalScore | null>(null);
  const [vocalVolume, setVocalVolume] = useState(1);
  const [backingVolume, setBackingVolume] = useState(0.7);
  const [backingTrackLoaded, setBackingTrackLoaded] = useState(false);
  const [error, setError] = useState('');

  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Initialize audio engine
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
        detector.subscribe((pitch) => {
          setCurrentPitch(pitch);
          // Mirror the detector's rolling history in state.
          setPitchHistory(detector.getHistory());
        });
        detector.start();
      }

      audioEngineRef.current = engine;
      pitchDetectorRef.current = detector;
      setAnalyserNode(analyser ?? null);
      setIsInitialized(true);
    } catch (err) {
      setError(
        err instanceof DOMException && err.name === 'NotAllowedError'
          ? 'Microphone access denied. Please allow microphone access and try again.'
          : 'Failed to initialize audio. Please check your microphone connection.'
      );
    }
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      pitchDetectorRef.current?.stop();
      audioEngineRef.current?.destroy();
      if (durationIntervalRef.current) clearInterval(durationIntervalRef.current);
    };
  }, []);

  // Handle recording
  const handleRecord = useCallback(async () => {
    if (!audioEngineRef.current) return;

    setRecording(null);
    setScore(null);
    setRecordingDuration(0);

    await audioEngineRef.current.startRecording();
    setIsRecording(true);

    durationIntervalRef.current = setInterval(() => {
      setRecordingDuration((d) => d + 0.1);
    }, 100);
  }, []);

  const handleStop = useCallback(async () => {
    if (!audioEngineRef.current) return;

    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }

    const result = await audioEngineRef.current.stopRecording();
    setIsRecording(false);
    setRecording(result);
    setRecordingTimestamp(Date.now());

    // Score the performance
    const history = pitchDetectorRef.current?.getHistory() ?? [];
    const performanceScore = scorePerformance(history);
    setScore(performanceScore);
  }, []);

  const handlePlay = useCallback(async () => {
    if (!audioEngineRef.current || !recording) return;
    setIsPlaying(true);
    await audioEngineRef.current.playRecording(recording.url);
    // Engine will set isPlaying false when done via subscriber
    audioEngineRef.current.subscribe((state) => {
      if (!state.isPlaying) setIsPlaying(false);
    });
  }, [recording]);

  const handleStopPlayback = useCallback(() => {
    audioEngineRef.current?.stopPlayback();
    setIsPlaying(false);
  }, []);

  const handleDiscard = useCallback(() => {
    if (recording?.url) URL.revokeObjectURL(recording.url);
    setRecording(null);
    setScore(null);
    setRecordingDuration(0);
    pitchDetectorRef.current?.clearHistory();
    setPitchHistory([]);
  }, [recording]);

  const handleBackingTrackUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !audioEngineRef.current) return;
    try {
      await audioEngineRef.current.loadBackingTrackFromFile(file);
      setBackingTrackLoaded(true);
    } catch {
      setError('Failed to load backing track. Please try a different audio file.');
    }
  }, []);

  const handleVocalVolume = useCallback((v: number) => {
    setVocalVolume(v);
    audioEngineRef.current?.setVocalVolume(v);
  }, []);

  const handleBackingVolume = useCallback((v: number) => {
    setBackingVolume(v);
    audioEngineRef.current?.setBackingVolume(v);
  }, []);

  // Pre-initialization screen
  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-[#0e0c0a] text-[#e8e4dc] flex flex-col">
        <StudioHeader />
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="text-center max-w-md space-y-6">
            <div className="w-20 h-20 mx-auto rounded-full border-2 border-[#c41230] flex items-center justify-center">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#c41230" strokeWidth="2">
                <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
                <path d="M19 10v2a7 7 0 01-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-serif mb-2">Recording Studio</h2>
              <p className="text-sm text-[#a09890]">
                We need access to your microphone for real-time pitch detection and recording.
                Your audio is processed locally — nothing is sent to a server.
              </p>
            </div>
            {error && (
              <div className="bg-[#c41230]/10 border border-[#c41230]/30 rounded p-3 font-mono text-xs text-[#c41230]">
                {error}
              </div>
            )}
            <button
              onClick={initialize}
              className="font-mono text-sm uppercase tracking-wider px-8 py-3 rounded border-2 border-[#c41230] text-[#c41230] hover:bg-[#c41230]/10 hover:shadow-[0_0_30px_rgba(196,18,48,0.2)] transition-all"
            >
              Enable Microphone
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0e0c0a] text-[#e8e4dc] flex flex-col">
      <StudioHeader />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-6 space-y-6">
        {error && (
          <div className="bg-[#c41230]/10 border border-[#c41230]/30 rounded p-3 font-mono text-xs text-[#c41230]">
            {error}
          </div>
        )}

        {/* 3D Pitch Visualizer */}
        <PitchVisualizer pitch={currentPitch} className="h-[280px] sm:h-[320px] rounded-lg border border-[#2a2825] overflow-hidden" />

        {/* Waveform */}
        <WaveformDisplay
          analyserNode={analyserNode}
          isActive={isRecording || isPlaying}
          peaks={recording?.peaks}
          variant={isRecording ? 'live' : 'static'}
          className="h-20 rounded-lg border border-[#2a2825] bg-[#141210]"
        />

        {/* Backing Track Upload */}
        <div className="flex items-center gap-4 justify-center">
          <label className="font-mono text-[10px] text-[#a09890] uppercase tracking-wider cursor-pointer border border-[#2a2825] rounded px-4 py-2 hover:border-[#5ce0d2]/30 hover:text-[#5ce0d2] transition-all">
            {backingTrackLoaded ? '✓ Backing Track Loaded' : '+ Load Backing Track'}
            <input
              type="file"
              accept="audio/*"
              onChange={handleBackingTrackUpload}
              className="hidden"
            />
          </label>
          {recording && (
            <a
              href={recording.url}
              download={`137voice-recording-${recordingTimestamp}.webm`}
              className="font-mono text-[10px] text-[#a09890] uppercase tracking-wider border border-[#2a2825] rounded px-4 py-2 hover:border-[#5ce0d2]/30 hover:text-[#5ce0d2] transition-all"
            >
              Download Recording
            </a>
          )}
        </div>

        {/* Recording Controls */}
        <RecordingControls
          isRecording={isRecording}
          isPlaying={isPlaying}
          hasRecording={!!recording}
          recordingDuration={recordingDuration}
          onRecord={handleRecord}
          onStop={handleStop}
          onPlay={handlePlay}
          onStopPlayback={handleStopPlayback}
          onDiscard={handleDiscard}
          backingTrackLoaded={backingTrackLoaded}
          vocalVolume={vocalVolume}
          backingVolume={backingVolume}
          onVocalVolumeChange={handleVocalVolume}
          onBackingVolumeChange={handleBackingVolume}
        />

        {/* Vocal Coach */}
        <VocalCoach
          currentPitch={currentPitch}
          history={pitchHistory}
          isRecording={isRecording}
        />

        {/* Score Card */}
        {score && score.overall > 0 && (
          <ScoreCard score={score} onClose={() => setScore(null)} />
        )}
      </main>
    </div>
  );
}

function StudioHeader() {
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
            <span className="text-[#c41230]">RECORDING</span>
            <span className="text-[#5ce0d2]"> STUDIO</span>
          </h1>
        </div>
        <div className="font-mono text-[10px] text-[#a09890]/50">
          v0.1 // real-time pitch analysis
        </div>
      </div>
    </header>
  );
}
