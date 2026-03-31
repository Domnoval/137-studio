/**
 * 137 Voice — Real-time Pitch Detection
 * Uses autocorrelation algorithm for accurate pitch detection from microphone input.
 */

export interface PitchData {
  frequency: number;    // Hz (0 if no pitch detected)
  note: string;         // e.g. "A4", "C#5"
  noteName: string;     // e.g. "A", "C#"
  octave: number;
  cents: number;        // -50 to +50 (deviation from perfect pitch)
  confidence: number;   // 0–1
  midiNumber: number;
  amplitude: number;    // 0–1 (volume level)
}

export interface PitchHistory {
  timestamp: number;
  pitch: PitchData;
}

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const A4_FREQUENCY = 440;
const A4_MIDI = 69;

export class PitchDetector {
  private analyserNode: AnalyserNode | null = null;
  private buffer: Float32Array<ArrayBuffer> = new Float32Array(0);
  private sampleRate = 44100;
  private history: PitchHistory[] = [];
  private maxHistory = 500; // ~10 seconds at 50fps
  private animationId: number | null = null;
  private listeners: Set<(pitch: PitchData) => void> = new Set();
  private running = false;

  attach(analyserNode: AnalyserNode, sampleRate: number): void {
    this.analyserNode = analyserNode;
    this.sampleRate = sampleRate;
    this.buffer = new Float32Array(analyserNode.fftSize);
  }

  start(): void {
    if (this.running || !this.analyserNode) return;
    this.running = true;
    this.detect();
  }

  stop(): void {
    this.running = false;
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  subscribe(listener: (pitch: PitchData) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getHistory(): PitchHistory[] {
    return [...this.history];
  }

  clearHistory(): void {
    this.history = [];
  }

  private detect = (): void => {
    if (!this.running || !this.analyserNode) return;

    this.analyserNode.getFloatTimeDomainData(this.buffer);
    const pitch = this.analyzePitch(this.buffer);

    this.history.push({ timestamp: Date.now(), pitch });
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }

    this.listeners.forEach((fn) => fn(pitch));
    this.animationId = requestAnimationFrame(this.detect);
  };

  private analyzePitch(buffer: Float32Array): PitchData {
    // Calculate amplitude (RMS)
    let sumSquares = 0;
    for (let i = 0; i < buffer.length; i++) {
      sumSquares += buffer[i] * buffer[i];
    }
    const amplitude = Math.sqrt(sumSquares / buffer.length);

    // Silence threshold
    if (amplitude < 0.01) {
      return { frequency: 0, note: '-', noteName: '-', octave: 0, cents: 0, confidence: 0, midiNumber: 0, amplitude };
    }

    // Autocorrelation pitch detection
    const { frequency, confidence } = this.autocorrelate(buffer);

    if (frequency === 0 || confidence < 0.8) {
      return { frequency: 0, note: '-', noteName: '-', octave: 0, cents: 0, confidence, midiNumber: 0, amplitude };
    }

    // Convert frequency to note
    const midiNumber = 12 * (Math.log2(frequency / A4_FREQUENCY)) + A4_MIDI;
    const roundedMidi = Math.round(midiNumber);
    const cents = Math.round((midiNumber - roundedMidi) * 100);
    const noteIndex = ((roundedMidi % 12) + 12) % 12;
    const octave = Math.floor(roundedMidi / 12) - 1;
    const noteName = NOTE_NAMES[noteIndex];
    const note = `${noteName}${octave}`;

    return { frequency, note, noteName, octave, cents, confidence, midiNumber: roundedMidi, amplitude };
  }

  private autocorrelate(buffer: Float32Array): { frequency: number; confidence: number } {
    const size = buffer.length;
    const maxSamples = Math.floor(size / 2);
    let bestOffset = -1;
    let bestCorrelation = 0;
    let foundGoodCorrelation = false;

    // Normalized autocorrelation
    const correlations = new Float32Array(maxSamples);

    for (let offset = 0; offset < maxSamples; offset++) {
      let correlation = 0;
      let norm1 = 0;
      let norm2 = 0;

      for (let i = 0; i < maxSamples; i++) {
        correlation += buffer[i] * buffer[i + offset];
        norm1 += buffer[i] * buffer[i];
        norm2 += buffer[i + offset] * buffer[i + offset];
      }

      const normFactor = Math.sqrt(norm1 * norm2);
      correlations[offset] = normFactor > 0 ? correlation / normFactor : 0;

      if (correlations[offset] > 0.9 && correlations[offset] > bestCorrelation) {
        bestCorrelation = correlations[offset];
        bestOffset = offset;
        foundGoodCorrelation = true;
      } else if (foundGoodCorrelation && correlations[offset] < bestCorrelation * 0.8) {
        break;
      }
    }

    if (bestOffset === -1 || bestCorrelation < 0.8) {
      return { frequency: 0, confidence: 0 };
    }

    // Parabolic interpolation for sub-sample accuracy
    const prev = correlations[bestOffset - 1] || 0;
    const curr = correlations[bestOffset];
    const next = correlations[bestOffset + 1] || 0;
    const shift = (prev - next) / (2 * (prev - 2 * curr + next));
    const refinedOffset = bestOffset + (isFinite(shift) ? shift : 0);

    const frequency = this.sampleRate / refinedOffset;

    // Sanity check: human vocal range ~60Hz to ~2000Hz
    if (frequency < 60 || frequency > 2000) {
      return { frequency: 0, confidence: 0 };
    }

    return { frequency, confidence: bestCorrelation };
  }
}

// Utility: get target frequency for a given note
export function noteToFrequency(note: string): number {
  const match = note.match(/^([A-G]#?)(\d+)$/);
  if (!match) return 0;
  const [, noteName, octaveStr] = match;
  const octave = parseInt(octaveStr);
  const noteIndex = NOTE_NAMES.indexOf(noteName);
  if (noteIndex === -1) return 0;
  const midi = (octave + 1) * 12 + noteIndex;
  return A4_FREQUENCY * Math.pow(2, (midi - A4_MIDI) / 12);
}

// Utility: frequency to note name
export function frequencyToNote(freq: number): string {
  if (freq === 0) return '-';
  const midi = 12 * Math.log2(freq / A4_FREQUENCY) + A4_MIDI;
  const rounded = Math.round(midi);
  const noteIndex = ((rounded % 12) + 12) % 12;
  const octave = Math.floor(rounded / 12) - 1;
  return `${NOTE_NAMES[noteIndex]}${octave}`;
}
