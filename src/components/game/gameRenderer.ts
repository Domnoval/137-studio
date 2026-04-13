// Canvas rendering utilities
import { COLORS } from './gameData';

export interface RenderContext {
  ctx: CanvasRenderingContext2D;
  canvas: HTMLCanvasElement;
  scale: number;
}

export class GameRenderer {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private scale: number;

  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas context not available');
    
    this.ctx = ctx;
    this.canvas = canvas;
    this.scale = 1;
  }

  updateScale(scale: number) {
    this.scale = scale;
  }

  clear() {
    this.ctx.fillStyle = COLORS.VOID;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  drawGridLines() {
    this.ctx.strokeStyle = COLORS.MIST + '20';
    this.ctx.lineWidth = 1;
    
    const spacing = 30 * this.scale;
    for (let x = 0; x < this.canvas.width; x += spacing) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.canvas.height);
      this.ctx.stroke();
    }
    for (let y = 0; y < this.canvas.height; y += spacing) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.canvas.width, y);
      this.ctx.stroke();
    }
  }

  drawCircleBumper(x: number, y: number, radius: number, hit = false) {
    this.ctx.save();
    
    if (hit) {
      this.ctx.shadowColor = COLORS.AMBER;
      this.ctx.shadowBlur = 20 * this.scale;
    }
    
    this.ctx.strokeStyle = COLORS.AMBER;
    this.ctx.lineWidth = 2 * this.scale;
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, Math.PI * 2);
    this.ctx.stroke();
    
    // Inner pattern
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius * 0.3, 0, Math.PI * 2);
    this.ctx.stroke();
    
    this.ctx.restore();
  }

  drawTriangleBumper(x: number, y: number, size: number, pointUp = true, hit = false) {
    this.ctx.save();
    
    if (hit) {
      this.ctx.shadowColor = COLORS.AMBER;
      this.ctx.shadowBlur = 20 * this.scale;
    }
    
    this.ctx.strokeStyle = COLORS.AMBER;
    this.ctx.lineWidth = 2 * this.scale;
    
    const height = size * Math.sin(Math.PI / 3);
    const sign = pointUp ? -1 : 1;
    
    this.ctx.beginPath();
    this.ctx.moveTo(x, y + sign * height / 2);
    this.ctx.lineTo(x - size / 2, y - sign * height / 2);
    this.ctx.lineTo(x + size / 2, y - sign * height / 2);
    this.ctx.closePath();
    this.ctx.stroke();
    
    this.ctx.restore();
  }

  drawHexagonBumper(x: number, y: number, size: number, hit = false) {
    this.ctx.save();
    
    if (hit) {
      this.ctx.shadowColor = COLORS.AMBER;
      this.ctx.shadowBlur = 25 * this.scale;
    }
    
    this.ctx.strokeStyle = COLORS.AMBER;
    this.ctx.lineWidth = 3 * this.scale;
    
    this.ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3;
      const px = x + size * Math.cos(angle);
      const py = y + size * Math.sin(angle);
      if (i === 0) this.ctx.moveTo(px, py);
      else this.ctx.lineTo(px, py);
    }
    this.ctx.closePath();
    this.ctx.stroke();
    
    this.ctx.restore();
  }

  drawPlayer(x: number, y: number, radius: number) {
    this.ctx.save();
    
    this.ctx.shadowColor = COLORS.MAGENTA;
    this.ctx.shadowBlur = 15 * this.scale;
    this.ctx.fillStyle = COLORS.MAGENTA;
    
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, Math.PI * 2);
    this.ctx.fill();
    
    this.ctx.restore();
  }

  drawObstacle(x: number, y: number, symbol: string) {
    this.ctx.save();
    
    this.ctx.strokeStyle = COLORS.AMBER;
    this.ctx.fillStyle = COLORS.MIST;
    this.ctx.font = `${24 * this.scale}px serif`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    
    this.ctx.fillText(symbol, x, y);
    this.ctx.strokeText(symbol, x, y);
    
    this.ctx.restore();
  }

  drawGlyph(x: number, y: number, symbol: string) {
    this.ctx.save();
    
    this.ctx.fillStyle = COLORS.AMBER;
    this.ctx.font = `${16 * this.scale}px serif`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    
    this.ctx.fillText(symbol, x, y);
    
    this.ctx.restore();
  }

  drawUI(score: number, lives: number, tarotCard?: string) {
    this.ctx.save();
    
    // Score
    this.ctx.fillStyle = COLORS.AMBER;
    this.ctx.font = `${16 * this.scale}px 'Courier New', monospace`;
    this.ctx.textAlign = 'left';
    this.ctx.fillText(`SCORE: ${score}`, 20 * this.scale, 30 * this.scale);
    
    // Lives
    this.ctx.textAlign = 'right';
    const livesText = '\u25C7'.repeat(Math.max(0, lives));
    this.ctx.fillText(livesText, this.canvas.width - 20 * this.scale, 30 * this.scale);
    
    // Tarot card
    if (tarotCard) {
      this.ctx.fillStyle = COLORS.CHALK;
      this.ctx.font = `${20 * this.scale}px serif`;
      this.ctx.textAlign = 'center';
      this.ctx.fillText(tarotCard, this.canvas.width / 2, 50 * this.scale);
    }
    
    this.ctx.restore();
  }

  drawDeathMessage(message: string) {
    this.ctx.save();
    
    this.ctx.fillStyle = COLORS.BLOOD;
    this.ctx.font = `${24 * this.scale}px serif`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(message, this.canvas.width / 2, this.canvas.height / 2);
    
    this.ctx.restore();
  }

  drawGameOver(finalScore: number, highScore: number) {
    this.ctx.save();
    
    // Background
    this.ctx.fillStyle = COLORS.VOID + 'CC';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Game Over text
    this.ctx.fillStyle = COLORS.CHALK;
    this.ctx.font = `${32 * this.scale}px serif`;
    this.ctx.textAlign = 'center';
    this.ctx.fillText('THE GREAT WORK', this.canvas.width / 2, this.canvas.height / 2 - 60 * this.scale);
    this.ctx.fillText('COMPLETE', this.canvas.width / 2, this.canvas.height / 2 - 20 * this.scale);
    
    // Scores
    this.ctx.font = `${18 * this.scale}px 'Courier New', monospace`;
    this.ctx.fillStyle = COLORS.AMBER;
    this.ctx.fillText(`Final Score: ${finalScore}`, this.canvas.width / 2, this.canvas.height / 2 + 40 * this.scale);
    this.ctx.fillText(`High Score: ${highScore}`, this.canvas.width / 2, this.canvas.height / 2 + 70 * this.scale);
    
    this.ctx.restore();
  }

  drawStartPrompt() {
    this.ctx.save();
    
    this.ctx.fillStyle = COLORS.CHALK;
    this.ctx.font = `${20 * this.scale}px serif`;
    this.ctx.textAlign = 'center';
    this.ctx.fillText('TAP TO LAUNCH', this.canvas.width / 2, this.canvas.height - 40 * this.scale);
    
    this.ctx.restore();
  }

  flashScreen(color: string, alpha = 0.3) {
    this.ctx.save();
    this.ctx.fillStyle = color + Math.floor(alpha * 255).toString(16).padStart(2, '0');
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.restore();
  }
}
