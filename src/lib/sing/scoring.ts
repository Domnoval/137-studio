/**
 * 137 Voice — Nuanced Vocal Scoring
 * Goes beyond simple pitch matching. Recognizes artistic techniques like vibrato,
 * slides, and runs as skills rather than errors.
 */

import type { PitchHistory } from './pitch-detection';

export interface VocalScore {
  overall: number;          // 0–100
  pitch: number;            // Pitch accuracy 0–100
  timing: number;           // Timing/rhythm accuracy 0–100
  expression: number;       // Detected artistic expression 0–100
  stability: number;        // Vocal steadiness 0–100
  techniques: DetectedTechnique[];
  grade: string;            // S, A, B, C, D
  feedback: string[];       // Human-readable tips
}

export interface DetectedTechnique {
  name: string;
  count: number;
  quality: 'excellent' | 'good' | 'developing';
}

interface PitchSegment {
  startIdx: number;
  endIdx: number;
  avgFrequency: number;
  frequencies: number[];
  timestamps: number[];
}

export function scorePerformance(history: PitchHistory[]): VocalScore {
  if (history.length < 20) {
    return {
      overall: 0, pitch: 0, timing: 0, expression: 0, stability: 0,
      techniques: [], grade: '-', feedback: ['Recording too short to analyze'],
    };
  }

  // Filter to only pitched frames
  const pitched = history.filter((h) => h.pitch.frequency > 0 && h.pitch.confidence > 0.8);
  if (pitched.length < 10) {
    return {
      overall: 0, pitch: 0, timing: 0, expression: 0, stability: 0,
      techniques: [], grade: '-', feedback: ['Could not detect enough vocal content'],
    };
  }

  const segments = segmentPitchData(pitched);
  const techniques = detectTechniques(pitched, segments);
  const stability = calculateStability(pitched);
  const expression = calculateExpression(techniques, pitched);
  const pitch = calculatePitchAccuracy(pitched);
  const timing = calculateTimingScore(history);

  // Weighted overall score
  const overall = Math.round(
    pitch * 0.35 +
    timing * 0.2 +
    expression * 0.25 +
    stability * 0.2
  );

  const grade = getGrade(overall);
  const feedback = generateFeedback(pitch, timing, expression, stability, techniques);

  return { overall, pitch, timing, expression, stability, techniques, grade, feedback };
}

function segmentPitchData(pitched: PitchHistory[]): PitchSegment[] {
  const segments: PitchSegment[] = [];
  let segStart = 0;

  for (let i = 1; i < pitched.length; i++) {
    const gap = pitched[i].timestamp - pitched[i - 1].timestamp;
    const freqDiff = Math.abs(pitched[i].pitch.frequency - pitched[i - 1].pitch.frequency);

    // New segment if time gap > 200ms or large pitch jump > 100Hz
    if (gap > 200 || freqDiff > 100) {
      segments.push({
        startIdx: segStart,
        endIdx: i - 1,
        avgFrequency: avg(pitched.slice(segStart, i).map((p) => p.pitch.frequency)),
        frequencies: pitched.slice(segStart, i).map((p) => p.pitch.frequency),
        timestamps: pitched.slice(segStart, i).map((p) => p.timestamp),
      });
      segStart = i;
    }
  }

  // Last segment
  if (segStart < pitched.length) {
    segments.push({
      startIdx: segStart,
      endIdx: pitched.length - 1,
      avgFrequency: avg(pitched.slice(segStart).map((p) => p.pitch.frequency)),
      frequencies: pitched.slice(segStart).map((p) => p.pitch.frequency),
      timestamps: pitched.slice(segStart).map((p) => p.timestamp),
    });
  }

  return segments;
}

function detectTechniques(pitched: PitchHistory[], segments: PitchSegment[]): DetectedTechnique[] {
  const techniques: DetectedTechnique[] = [];

  // Detect vibrato: periodic pitch oscillation within a segment (4-7Hz, 20-200 cents)
  let vibratoCount = 0;
  for (const seg of segments) {
    if (seg.frequencies.length < 10) continue;
    const deviations = seg.frequencies.map((f) => f - seg.avgFrequency);
    let zeroCrossings = 0;
    for (let i = 1; i < deviations.length; i++) {
      if ((deviations[i] >= 0 && deviations[i - 1] < 0) || (deviations[i] < 0 && deviations[i - 1] >= 0)) {
        zeroCrossings++;
      }
    }
    const duration = (seg.timestamps[seg.timestamps.length - 1] - seg.timestamps[0]) / 1000;
    const rate = duration > 0 ? zeroCrossings / (2 * duration) : 0;
    const maxDeviation = Math.max(...deviations.map(Math.abs));
    const centsDev = 1200 * Math.log2(1 + maxDeviation / seg.avgFrequency);

    if (rate >= 4 && rate <= 7 && centsDev >= 20 && centsDev <= 200) {
      vibratoCount++;
    }
  }
  if (vibratoCount > 0) {
    techniques.push({
      name: 'Vibrato',
      count: vibratoCount,
      quality: vibratoCount >= 5 ? 'excellent' : vibratoCount >= 2 ? 'good' : 'developing',
    });
  }

  // Detect pitch slides / portamento: smooth continuous pitch change between notes
  let slideCount = 0;
  for (let i = 1; i < pitched.length - 1; i++) {
    const diff1 = pitched[i].pitch.frequency - pitched[i - 1].pitch.frequency;
    const diff2 = pitched[i + 1].pitch.frequency - pitched[i].pitch.frequency;
    if (Math.sign(diff1) === Math.sign(diff2) && Math.abs(diff1) > 5 && Math.abs(diff1) < 50) {
      slideCount++;
    }
  }
  const slideInstances = Math.floor(slideCount / 3); // Group consecutive frames
  if (slideInstances > 0) {
    techniques.push({
      name: 'Pitch Slides',
      count: slideInstances,
      quality: slideInstances >= 8 ? 'excellent' : slideInstances >= 3 ? 'good' : 'developing',
    });
  }

  // Detect dynamic range (crescendo/decrescendo)
  const amplitudes = pitched.map((p) => p.pitch.amplitude);
  const ampRange = Math.max(...amplitudes) - Math.min(...amplitudes);
  if (ampRange > 0.3) {
    techniques.push({
      name: 'Dynamic Control',
      count: 1,
      quality: ampRange > 0.6 ? 'excellent' : ampRange > 0.4 ? 'good' : 'developing',
    });
  }

  return techniques;
}

function calculateStability(pitched: PitchHistory[]): number {
  if (pitched.length < 5) return 50;
  // Measure how steady held notes are (low jitter = high stability)
  let totalJitter = 0;
  let count = 0;

  for (let i = 1; i < pitched.length; i++) {
    const cents = Math.abs(pitched[i].pitch.cents);
    totalJitter += cents;
    count++;
  }

  const avgJitter = count > 0 ? totalJitter / count : 50;
  // Map jitter: 0 cents = 100, 50 cents = 0
  return Math.max(0, Math.min(100, Math.round(100 - avgJitter * 2)));
}

function calculateExpression(techniques: DetectedTechnique[], pitched: PitchHistory[]): number {
  let score = 40; // Base score

  for (const tech of techniques) {
    if (tech.quality === 'excellent') score += 20;
    else if (tech.quality === 'good') score += 12;
    else score += 5;
  }

  // Bonus for dynamic range
  const amps = pitched.map((p) => p.pitch.amplitude);
  const dynamicRange = Math.max(...amps) - Math.min(...amps);
  score += dynamicRange * 30;

  return Math.min(100, Math.round(score));
}

function calculatePitchAccuracy(pitched: PitchHistory[]): number {
  if (pitched.length === 0) return 0;
  // Average how close each note is to the nearest semitone
  let totalAccuracy = 0;
  for (const p of pitched) {
    const centsOff = Math.abs(p.pitch.cents);
    // 0 cents off = 100%, 50 cents off = 0%
    totalAccuracy += Math.max(0, 100 - centsOff * 2);
  }
  return Math.round(totalAccuracy / pitched.length);
}

function calculateTimingScore(history: PitchHistory[]): number {
  // Without a reference track, we measure consistency of phrasing
  // Look for regular patterns in silence/singing transitions
  let score = 70; // Base - generous without reference

  const singing = history.map((h) => h.pitch.frequency > 0);
  let transitions = 0;
  for (let i = 1; i < singing.length; i++) {
    if (singing[i] !== singing[i - 1]) transitions++;
  }

  // Moderate number of transitions suggests good phrasing
  const transitionsPerSecond = history.length > 0
    ? transitions / ((history[history.length - 1].timestamp - history[0].timestamp) / 1000)
    : 0;

  if (transitionsPerSecond > 0.5 && transitionsPerSecond < 3) score += 20;
  else if (transitionsPerSecond > 0.2 && transitionsPerSecond < 5) score += 10;

  return Math.min(100, score);
}

function getGrade(score: number): string {
  if (score >= 95) return 'S';
  if (score >= 85) return 'A';
  if (score >= 70) return 'B';
  if (score >= 55) return 'C';
  return 'D';
}

function generateFeedback(pitch: number, timing: number, expression: number, stability: number, techniques: DetectedTechnique[]): string[] {
  const feedback: string[] = [];

  if (pitch >= 85) feedback.push('Excellent pitch accuracy — your intonation is on point');
  else if (pitch >= 70) feedback.push('Good pitch control — try focusing on sustained notes to improve accuracy');
  else feedback.push('Work on pitch accuracy — try singing slower and listening carefully to each note');

  if (stability >= 80) feedback.push('Strong vocal stability — your held notes are steady');
  else if (stability < 60) feedback.push('Try to steady your held notes — practice long tones with a drone');

  if (expression >= 80) feedback.push('Great expressiveness — your dynamics and techniques add real character');
  else if (expression < 50) feedback.push('Try adding more dynamics — vary your volume and experiment with vibrato');

  const vibratoTech = techniques.find((t) => t.name === 'Vibrato');
  if (vibratoTech) {
    feedback.push(`Detected ${vibratoTech.count} vibrato instances (${vibratoTech.quality})`);
  }

  const slideTech = techniques.find((t) => t.name === 'Pitch Slides');
  if (slideTech) {
    feedback.push(`Detected ${slideTech.count} pitch slides — nice melodic movement`);
  }

  return feedback;
}

function avg(nums: number[]): number {
  return nums.length > 0 ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
}
