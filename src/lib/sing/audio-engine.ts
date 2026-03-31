/**
 * 137 Voice — Core Audio Engine
 * Handles recording, playback, and real-time audio processing via Web Audio API.
 */

export interface AudioEngineState {
  isRecording: boolean;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  backingTrackLoaded: boolean;
}

export interface RecordingResult {
  blob: Blob;
  duration: number;
  url: string;
  peaks: Float32Array;
}

export class AudioEngine {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private gainNode: GainNode | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];

  // Backing track
  private backingBuffer: AudioBuffer | null = null;
  private backingSource: AudioBufferSourceNode | null = null;
  private backingGain: GainNode | null = null;

  // Vocal playback
  private vocalBuffer: AudioBuffer | null = null;
  private vocalSource: AudioBufferSourceNode | null = null;

  // State
  private _isRecording = false;
  private _isPlaying = false;
  private startTime = 0;
  private listeners: Set<(state: AudioEngineState) => void> = new Set();

  get isRecording() { return this._isRecording; }
  get isPlaying() { return this._isPlaying; }

  async initialize(): Promise<void> {
    if (this.audioContext) return;
    this.audioContext = new AudioContext({ sampleRate: 44100 });

    // Create gain nodes
    this.gainNode = this.audioContext.createGain();
    this.gainNode.connect(this.audioContext.destination);

    this.backingGain = this.audioContext.createGain();
    this.backingGain.gain.value = 0.7;
    this.backingGain.connect(this.audioContext.destination);

    // Create analyser
    this.analyserNode = this.audioContext.createAnalyser();
    this.analyserNode.fftSize = 2048;
    this.analyserNode.smoothingTimeConstant = 0.8;
  }

  async requestMicrophone(): Promise<void> {
    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 44100,
      },
    });

    if (!this.audioContext) await this.initialize();

    this.sourceNode = this.audioContext!.createMediaStreamSource(this.mediaStream);
    this.sourceNode.connect(this.analyserNode!);
  }

  getAnalyserNode(): AnalyserNode | null {
    return this.analyserNode;
  }

  getAudioContext(): AudioContext | null {
    return this.audioContext;
  }

  async loadBackingTrack(url: string): Promise<void> {
    if (!this.audioContext) await this.initialize();
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    this.backingBuffer = await this.audioContext!.decodeAudioData(arrayBuffer);
    this.notifyListeners();
  }

  async loadBackingTrackFromFile(file: File): Promise<void> {
    if (!this.audioContext) await this.initialize();
    const arrayBuffer = await file.arrayBuffer();
    this.backingBuffer = await this.audioContext!.decodeAudioData(arrayBuffer);
    this.notifyListeners();
  }

  async startRecording(): Promise<void> {
    if (this._isRecording) return;
    if (!this.mediaStream) await this.requestMicrophone();

    this.recordedChunks = [];

    // Set up MediaRecorder
    this.mediaRecorder = new MediaRecorder(this.mediaStream!, {
      mimeType: this.getSupportedMimeType(),
    });

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.recordedChunks.push(event.data);
      }
    };

    this.mediaRecorder.start(100); // Collect data every 100ms
    this._isRecording = true;
    this.startTime = Date.now();

    // Play backing track if loaded
    if (this.backingBuffer && this.audioContext) {
      this.backingSource = this.audioContext.createBufferSource();
      this.backingSource.buffer = this.backingBuffer;
      this.backingSource.connect(this.backingGain!);
      this.backingSource.start();
    }

    this.notifyListeners();
  }

  async stopRecording(): Promise<RecordingResult> {
    return new Promise((resolve) => {
      if (!this.mediaRecorder || !this._isRecording) {
        resolve({ blob: new Blob(), duration: 0, url: '', peaks: new Float32Array() });
        return;
      }

      this.mediaRecorder.onstop = async () => {
        const blob = new Blob(this.recordedChunks, { type: this.getSupportedMimeType() });
        const duration = (Date.now() - this.startTime) / 1000;
        const url = URL.createObjectURL(blob);

        // Decode for waveform
        const arrayBuffer = await blob.arrayBuffer();
        try {
          const decoded = await this.audioContext!.decodeAudioData(arrayBuffer.slice(0));
          const channelData = decoded.getChannelData(0);
          const peaks = this.extractPeaks(channelData, 200);
          this.vocalBuffer = decoded;
          resolve({ blob, duration, url, peaks });
        } catch {
          resolve({ blob, duration, url, peaks: new Float32Array(200) });
        }
      };

      this.mediaRecorder.stop();
      this._isRecording = false;

      // Stop backing track
      if (this.backingSource) {
        this.backingSource.stop();
        this.backingSource = null;
      }

      this.notifyListeners();
    });
  }

  async playRecording(recordingUrl?: string): Promise<void> {
    if (!this.audioContext) await this.initialize();
    this._isPlaying = true;

    if (recordingUrl) {
      const response = await fetch(recordingUrl);
      const arrayBuffer = await response.arrayBuffer();
      this.vocalBuffer = await this.audioContext!.decodeAudioData(arrayBuffer);
    }

    if (this.vocalBuffer) {
      this.vocalSource = this.audioContext!.createBufferSource();
      this.vocalSource.buffer = this.vocalBuffer;
      this.vocalSource.connect(this.gainNode!);
      this.vocalSource.onended = () => {
        this._isPlaying = false;
        this.notifyListeners();
      };
      this.vocalSource.start();
    }

    // Play backing in sync
    if (this.backingBuffer) {
      this.backingSource = this.audioContext!.createBufferSource();
      this.backingSource.buffer = this.backingBuffer;
      this.backingSource.connect(this.backingGain!);
      this.backingSource.start();
    }

    this.notifyListeners();
  }

  stopPlayback(): void {
    if (this.vocalSource) {
      this.vocalSource.stop();
      this.vocalSource = null;
    }
    if (this.backingSource) {
      this.backingSource.stop();
      this.backingSource = null;
    }
    this._isPlaying = false;
    this.notifyListeners();
  }

  setVocalVolume(value: number): void {
    if (this.gainNode) this.gainNode.gain.value = Math.max(0, Math.min(1, value));
  }

  setBackingVolume(value: number): void {
    if (this.backingGain) this.backingGain.gain.value = Math.max(0, Math.min(1, value));
  }

  getFrequencyData(): Uint8Array {
    if (!this.analyserNode) return new Uint8Array(0);
    const data = new Uint8Array(this.analyserNode.frequencyBinCount);
    this.analyserNode.getByteFrequencyData(data);
    return data;
  }

  getTimeDomainData(): Uint8Array {
    if (!this.analyserNode) return new Uint8Array(0);
    const data = new Uint8Array(this.analyserNode.fftSize);
    this.analyserNode.getByteTimeDomainData(data);
    return data;
  }

  subscribe(listener: (state: AudioEngineState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  destroy(): void {
    this.stopPlayback();
    if (this.mediaRecorder?.state === 'recording') {
      this.mediaRecorder.stop();
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop());
    }
    if (this.audioContext) {
      this.audioContext.close();
    }
    this.audioContext = null;
    this.mediaStream = null;
    this.listeners.clear();
  }

  private extractPeaks(channelData: Float32Array, numPeaks: number): Float32Array {
    const peaks = new Float32Array(numPeaks);
    const blockSize = Math.floor(channelData.length / numPeaks);
    for (let i = 0; i < numPeaks; i++) {
      let max = 0;
      for (let j = 0; j < blockSize; j++) {
        const abs = Math.abs(channelData[i * blockSize + j]);
        if (abs > max) max = abs;
      }
      peaks[i] = max;
    }
    return peaks;
  }

  private getSupportedMimeType(): string {
    const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];
    for (const type of types) {
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)) return type;
    }
    return 'audio/webm';
  }

  private notifyListeners(): void {
    const state: AudioEngineState = {
      isRecording: this._isRecording,
      isPlaying: this._isPlaying,
      currentTime: this._isRecording ? (Date.now() - this.startTime) / 1000 : 0,
      duration: this.backingBuffer?.duration ?? 0,
      volume: this.gainNode?.gain.value ?? 1,
      backingTrackLoaded: !!this.backingBuffer,
    };
    this.listeners.forEach((fn) => fn(state));
  }
}
