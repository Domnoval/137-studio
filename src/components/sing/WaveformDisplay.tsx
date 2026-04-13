'use client';

import { useRef, useEffect } from 'react';

interface WaveformDisplayProps {
  analyserNode: AnalyserNode | null;
  isActive: boolean;
  peaks?: Float32Array;       // For static waveform of a recording
  className?: string;
  variant?: 'live' | 'static';
}

export function WaveformDisplay({
  analyserNode,
  isActive,
  peaks,
  className = '',
  variant = 'live',
}: WaveformDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set canvas resolution
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    const ctx2d = canvas.getContext('2d');
    if (ctx2d) ctx2d.scale(2, 2);

    let animFrame: number | null = null;

    const drawLive = () => {
      if (!analyserNode || !isActive) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = canvas.width;
      const height = canvas.height;

      const bufferLength = analyserNode.fftSize;
      const dataArray = new Uint8Array(bufferLength);
      analyserNode.getByteTimeDomainData(dataArray);

      ctx.clearRect(0, 0, width, height);

      // Draw center line
      ctx.strokeStyle = 'rgba(160, 152, 144, 0.15)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();

      // Draw waveform
      const gradient = ctx.createLinearGradient(0, 0, width, 0);
      gradient.addColorStop(0, '#c41230');
      gradient.addColorStop(0.5, '#5ce0d2');
      gradient.addColorStop(1, '#c41230');

      ctx.lineWidth = 2;
      ctx.strokeStyle = gradient;
      ctx.beginPath();

      const sliceWidth = width / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * height) / 2;

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);

        x += sliceWidth;
      }

      ctx.lineTo(width, height / 2);
      ctx.stroke();

      // Glow effect
      ctx.shadowColor = '#5ce0d2';
      ctx.shadowBlur = 10;
      ctx.stroke();
      ctx.shadowBlur = 0;

      animFrame = requestAnimationFrame(drawLive);
    };

    const drawStatic = () => {
      if (!peaks) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      const barWidth = width / peaks.length;
      const gradient = ctx.createLinearGradient(0, 0, width, 0);
      gradient.addColorStop(0, '#c41230');
      gradient.addColorStop(0.5, '#5ce0d2');
      gradient.addColorStop(1, '#c41230');

      ctx.fillStyle = gradient;

      for (let i = 0; i < peaks.length; i++) {
        const barHeight = peaks[i] * height * 0.8;
        const x = i * barWidth;
        const y = (height - barHeight) / 2;
        ctx.fillRect(x, y, Math.max(1, barWidth - 1), barHeight);
      }
    };

    if (variant === 'live' && isActive) {
      drawLive();
    } else if (variant === 'static' && peaks) {
      drawStatic();
    }

    return () => {
      if (animFrame !== null) {
        cancelAnimationFrame(animFrame);
      }
    };
  }, [variant, isActive, analyserNode, peaks]);

  return (
    <div className={`relative ${className}`}>
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ imageRendering: 'auto' }}
      />
    </div>
  );
}
