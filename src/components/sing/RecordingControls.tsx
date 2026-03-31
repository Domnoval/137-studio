'use client';

interface RecordingControlsProps {
  isRecording: boolean;
  isPlaying: boolean;
  hasRecording: boolean;
  recordingDuration: number;
  onRecord: () => void;
  onStop: () => void;
  onPlay: () => void;
  onStopPlayback: () => void;
  onDiscard: () => void;
  backingTrackLoaded: boolean;
  vocalVolume: number;
  backingVolume: number;
  onVocalVolumeChange: (v: number) => void;
  onBackingVolumeChange: (v: number) => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function RecordingControls({
  isRecording,
  isPlaying,
  hasRecording,
  recordingDuration,
  onRecord,
  onStop,
  onPlay,
  onStopPlayback,
  onDiscard,
  backingTrackLoaded,
  vocalVolume,
  backingVolume,
  onVocalVolumeChange,
  onBackingVolumeChange,
}: RecordingControlsProps) {
  return (
    <div className="space-y-6">
      {/* Main controls */}
      <div className="flex items-center justify-center gap-6">
        {/* Discard button */}
        {hasRecording && !isRecording && (
          <button
            onClick={onDiscard}
            className="w-12 h-12 rounded-full border border-[#2a2825] flex items-center justify-center text-[#a09890] hover:text-[#c41230] hover:border-[#c41230]/50 transition-all"
            title="Discard recording"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14" />
            </svg>
          </button>
        )}

        {/* Play/Stop Playback */}
        {hasRecording && !isRecording && (
          <button
            onClick={isPlaying ? onStopPlayback : onPlay}
            className="w-14 h-14 rounded-full border-2 border-[#5ce0d2] flex items-center justify-center text-[#5ce0d2] hover:bg-[#5ce0d2]/10 transition-all"
            title={isPlaying ? 'Stop' : 'Play recording'}
          >
            {isPlaying ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16" />
                <rect x="14" y="4" width="4" height="16" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5,3 19,12 5,21" />
              </svg>
            )}
          </button>
        )}

        {/* Record / Stop Recording */}
        <button
          onClick={isRecording ? onStop : onRecord}
          className={`
            w-20 h-20 rounded-full flex items-center justify-center transition-all
            ${isRecording
              ? 'bg-[#c41230] shadow-[0_0_40px_rgba(196,18,48,0.4)] animate-pulse'
              : 'border-2 border-[#c41230] hover:bg-[#c41230]/10 hover:shadow-[0_0_30px_rgba(196,18,48,0.2)]'
            }
          `}
          title={isRecording ? 'Stop recording' : 'Start recording'}
        >
          {isRecording ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
          ) : (
            <div className="w-8 h-8 rounded-full bg-[#c41230]" />
          )}
        </button>
      </div>

      {/* Timer */}
      {isRecording && (
        <div className="text-center">
          <span className="font-mono text-2xl text-[#c41230] tabular-nums">
            {formatTime(recordingDuration)}
          </span>
          <div className="flex items-center justify-center gap-2 mt-1">
            <span className="w-2 h-2 rounded-full bg-[#c41230] animate-pulse" />
            <span className="font-mono text-[10px] text-[#c41230] uppercase tracking-[0.2em]">Recording</span>
          </div>
        </div>
      )}

      {/* Volume controls */}
      <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto">
        <div className="space-y-1.5">
          <label className="font-mono text-[10px] text-[#a09890] uppercase tracking-wider block">
            Vocal
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={vocalVolume}
            onChange={(e) => onVocalVolumeChange(parseFloat(e.target.value))}
            className="w-full accent-[#5ce0d2] h-1"
          />
        </div>
        <div className="space-y-1.5">
          <label className="font-mono text-[10px] text-[#a09890] uppercase tracking-wider block">
            Backing {!backingTrackLoaded && <span className="text-[#a09890]/40">(none)</span>}
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={backingVolume}
            onChange={(e) => onBackingVolumeChange(parseFloat(e.target.value))}
            disabled={!backingTrackLoaded}
            className="w-full accent-[#5ce0d2] h-1 disabled:opacity-30"
          />
        </div>
      </div>
    </div>
  );
}
